import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Button } from "@appica/ui-react/button";
import { Checkbox } from "@appica/ui-react/checkbox";
import { Spinner } from "@appica/ui-react/spinner";
import { authApi, getOAuthCallbackUrl } from "../api/auth";
import {
  clearPendingAuthSession,
  getPendingAuthSession,
  persistAuthResponse,
  savePendingAuthSession,
  setStoredUser,
} from "../api/session";
import {
  AppicaAuthCard,
  AppicaAuthField,
  AppicaAuthLayout,
  AppicaAuthNotice,
  AppicaPasswordInput,
  AppicaSubmitButton,
  AppicaTextInput,
  AppicaTotpForm,
} from "./AppicaAuth";
import { booleanParam, clearAffiliateCode, getErrorMessage, readOAuthFragment, safeAuthRedirect } from "./authUtils";
import { useLocale } from "../console/i18n";
import { TurnstileWidget } from "./TurnstileWidget";
import { usePublicSettings } from "./usePublicSettings";

const choiceSteps = new Set(["choose_account_action_required", "choose_account_action"]);
const createSteps = new Set(["email_completion", "email_required", "create_account_required", "create_account"]);
const bindSteps = new Set(["bind_login_required", "bind_login", "adopt_existing_user_by_email", "existing_account_required", "existing_account_binding_required"]);

function normalizeCompletion(values = {}) {
  return {
    ...values,
    requires_2fa: booleanParam(values.requires_2fa),
    invitation_required: booleanParam(values.invitation_required),
    adoption_required: booleanParam(values.adoption_required),
    requires_email_completion: booleanParam(values.requires_email_completion),
  };
}

function resolvePhase(completion) {
  const marker = String(completion.step || completion.error || completion.intent || "").toLowerCase();
  if (completion.requires_2fa && completion.temp_token) return "totp";
  if (completion.error === "invitation_required") return "invitation";
  if (choiceSteps.has(marker)) return "choice";
  if (createSteps.has(marker) || completion.requires_email_completion) return "create";
  if (bindSteps.has(marker)) return "bind";
  return completion.error ? "error" : "choice";
}

function getCompletionEmail(completion) {
  return completion.pending_email || completion.existing_account_email || completion.resolved_email || completion.email || completion.suggested_email || "";
}

function getAffiliatePayload() {
  const code = localStorage.getItem("affiliate_referral_code") || "";
  return code ? { aff_code: code } : {};
}

export function OAuthCallbackPage({ provider: routeProvider, initialPhase = "" }) {
  const { t } = useLocale();
  const location = useLocation();
  const navigate = useNavigate();
  const callbackParams = new URLSearchParams(location.search);
  const requestedPhase = initialPhase || (callbackParams.get("bind") === "1" ? "bind" : "");
  const savedPendingSession = getPendingAuthSession() || {};
  const pendingEmailProvider = sessionStorage.getItem("email_oauth_pending_provider") || "";
  const { settings, loading: settingsLoading, error: settingsError, retry: retrySettings } = usePublicSettings();
  const [provider, setProvider] = useState(routeProvider || pendingEmailProvider || savedPendingSession.provider || "");
  const [phase, setPhase] = useState("processing");
  const [completion, setCompletion] = useState({});
  const [form, setForm] = useState({ email: callbackParams.get("email") || "", password: "", invitation: "", verifyCode: "" });
  const [adoption, setAdoption] = useState({ displayName: true, avatar: true });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReset, setTurnstileReset] = useState(0);
  const [pending, setPending] = useState(savedPendingSession);
  const initialized = useRef(false);
  const initialPhaseRef = useRef(requestedPhase);
  const providerName = provider === "oidc" ? settings?.oidc_oauth_provider_name || "OIDC" : ({ linuxdo: "Linux.do", wechat: t("auth.oauth.provider.wechat"), dingtalk: t("auth.oauth.provider.dingtalk"), github: "GitHub", google: "Google" }[provider] || t("auth.oauth.provider.fallback"));
  const handleTurnstileToken = useCallback((token) => setTurnstileToken(token), []);

  const adoptionPayload = () => ({
    adopt_display_name: adoption.displayName,
    adopt_avatar: adoption.avatar,
  });

  const finish = async (response) => {
    persistAuthResponse(response);
    try {
      setStoredUser(await authApi.getCurrentUser());
    } catch {
      // A token-only OAuth response is still a valid authenticated session.
    }
    clearPendingAuthSession();
    clearAffiliateCode();
    sessionStorage.removeItem("email_oauth_pending_provider");
    navigate(safeAuthRedirect(response.redirect || callbackParams.get("redirect")), { replace: true });
  };

  const finishBinding = async (response = {}) => {
    try {
      setStoredUser(await authApi.getCurrentUser());
    } catch {
      // The binding is already complete even if refreshing the profile fails.
    }
    clearPendingAuthSession();
    sessionStorage.removeItem("oauth_bind_intent");
    const redirect = String(response.redirect || "/profile");
    navigate(redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/profile", { replace: true });
  };

  const applyCompletion = async (nextValue) => {
    const next = normalizeCompletion(nextValue);
    if (next.provider) {
      const normalizedProvider = String(next.provider).toLowerCase();
      setProvider(normalizedProvider);
      setPending((current) => {
        const updated = { ...current, provider: normalizedProvider };
        savePendingAuthSession(updated);
        return updated;
      });
    }
    if (next.access_token) return finish(next);
    const bindingIntent = sessionStorage.getItem("oauth_bind_intent");
    const pendingBindingStep = next.error || next.step || next.intent || next.pending_auth_token || next.pending_oauth_token;
    if (bindingIntent && !pendingBindingStep) return finishBinding(next);
    setCompletion(next);
    setForm((current) => ({ ...current, email: getCompletionEmail(next) || current.email }));
    const activeProvider = String(next.provider || provider).toLowerCase();
    const emailRegistration = ["github", "google"].includes(activeProvider) && ["invitation_required", "registration_completion_required"].includes(next.error);
    const resolvedPhase = emailRegistration ? "create" : resolvePhase(next);
    const preferredPhase = initialPhaseRef.current;
    initialPhaseRef.current = "";
    setPhase(["error", "invitation", "totp"].includes(resolvedPhase) ? resolvedPhase : preferredPhase || resolvedPhase);
  };

  const exchangePending = async (withDecision = false) => {
    setPhase("processing");
    try {
      await applyCompletion(await authApi.exchangePendingOAuth(withDecision ? adoptionPayload() : {}));
    } catch (requestError) {
      setError(getErrorMessage(requestError, t("auth.oauth.sessionInvalid"), t));
      setPhase("error");
    }
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const fragment = normalizeCompletion(readOAuthFragment());
    const resolvedProvider = routeProvider || fragment.provider || pendingEmailProvider || savedPendingSession.provider || "";
    if (resolvedProvider) setProvider(String(resolvedProvider).toLowerCase());
    if (!Object.keys(fragment).length && location.search.includes("code=") && ["github", "google"].includes(resolvedProvider)) {
      window.location.replace(getOAuthCallbackUrl(resolvedProvider, location.search));
      return;
    }
    if (fragment.access_token) {
      finish(fragment);
      return;
    }
    const token = fragment.pending_auth_token || fragment.pending_oauth_token || pending.token || "";
    const pendingSession = { provider: resolvedProvider, token, token_field: fragment.pending_oauth_token ? "pending_oauth_token" : "pending_auth_token" };
    if (resolvedProvider) savePendingAuthSession(pendingSession);
    setPending(pendingSession);
    if (fragment.error === "invitation_required" && token) {
      applyCompletion({ ...fragment, provider: resolvedProvider });
      return;
    }
    if (fragment.error && !["invitation_required", "registration_completion_required"].includes(fragment.error) && fragment.auth_result !== "pending_session") {
      setError(fragment.error_description || fragment.error_message || fragment.error);
      setPhase("error");
      return;
    }
    exchangePending();
    // The callback is initialized exactly once; pending state is held by the backend cookie.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  };

  const submitInvitation = async (event) => {
    event.preventDefault();
    if (!form.invitation.trim()) return setError(t("auth.oauth.invitationRequired"));
    setLoading(true);
    try {
      await applyCompletion(await authApi.completeOAuthRegistration(provider, {
        invitation_code: form.invitation.trim(),
        ...getAffiliatePayload(),
        ...adoptionPayload(),
        ...(pending.token ? { [pending.token_field]: pending.token } : {}),
      }));
    } catch (requestError) {
      setError(getErrorMessage(requestError, t("auth.oauth.invitationFailed"), t));
    } finally {
      setLoading(false);
    }
  };

  const sendCode = async () => {
    if (!settings) return;
    if (!form.email.trim()) return setError(t("auth.oauth.emailFirst"));
    setLoading(true);
    try {
      const response = await authApi.sendPendingVerifyCode({
        email: form.email.trim(),
        turnstile_token: turnstileToken || undefined,
        ...(pending.token ? { [pending.token_field]: pending.token } : {}),
      });
      if (response.auth_result === "pending_session") {
        await applyCompletion(response);
        return;
      }
      setCodeSent(true);
      setTurnstileToken("");
      setTurnstileReset((value) => value + 1);
    } catch (requestError) {
      setError(getErrorMessage(requestError, t("auth.oauth.codeSendFailed"), t));
      setTurnstileToken("");
      setTurnstileReset((value) => value + 1);
    } finally {
      setLoading(false);
    }
  };

  const submitEmailProviderAccount = () => authApi.completeOAuthRegistration(provider, {
    password: form.password,
    invitation_code: form.invitation.trim() || undefined,
    ...getAffiliatePayload(),
  });

  const submitPendingAccount = () => authApi.createPendingAccount({
    email: form.email.trim(),
    password: form.password,
    verify_code: form.verifyCode.trim() || undefined,
    invitation_code: form.invitation.trim() || undefined,
    ...getAffiliatePayload(),
    ...adoptionPayload(),
  });

  const submitCreate = async (event) => {
    event.preventDefault();
    if (!settings) return;
    if (!form.email.trim() || form.password.length < 6) return setError(t("auth.oauth.createRequired"));
    if ((settings.invitation_code_enabled || completion.invitation_required) && !form.invitation.trim()) return setError(t("auth.oauth.invitationRequired"));
    if (settings?.email_verify_enabled && !["github", "google"].includes(provider) && !/^\d{6}$/.test(form.verifyCode)) return setError(t("auth.oauth.codeRequired"));
    setLoading(true);
    try {
      const response = ["github", "google"].includes(provider) ? await submitEmailProviderAccount() : await submitPendingAccount();
      await applyCompletion(response);
    } catch (requestError) {
      const message = getErrorMessage(requestError, t("auth.oauth.createFailed"), t);
      setError(message);
      if (requestError?.reason === "EMAIL_EXISTS") setPhase("bind");
    } finally {
      setLoading(false);
    }
  };

  const submitBind = async (event) => {
    event.preventDefault();
    if (!form.email.trim() || !form.password) return setError(t("auth.oauth.bindRequired"));
    setLoading(true);
    try {
      await applyCompletion(await authApi.bindPendingLogin({
        email: form.email.trim(),
        password: form.password,
        ...adoptionPayload(),
      }));
    } catch (requestError) {
      setError(getErrorMessage(requestError, t("auth.oauth.bindFailed"), t));
    } finally {
      setLoading(false);
    }
  };

  const submitTotp = async (code) => {
    setLoading(true);
    try {
      await finish(await authApi.login2FA({ temp_token: completion.temp_token, totp_code: code }));
    } catch (requestError) {
      setError(getErrorMessage(requestError, t("auth.oauth.verifyFailed"), t));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppicaAuthLayout>
      <AppicaAuthCard kicker={t("auth.oauth.kicker")} title={t("auth.oauth.title", { provider: providerName })} description={t("auth.oauth.description")} footer={<Link to="/login">{t("auth.oauth.backToLogin")}</Link>}>
        {phase === "processing" && <ProcessingState />}
        {phase === "error" && <ErrorState error={error} onRetry={() => exchangePending()} />}
        {phase === "invitation" && <InvitationForm form={form} error={error} loading={loading} onChange={updateForm} onSubmit={submitInvitation} adoption={<AdoptionChoices completion={completion} adoption={adoption} setAdoption={setAdoption} />} />}
        {phase === "choice" && <ChoiceState completion={completion} onContinue={() => exchangePending(true)} onCreate={() => setPhase("create")} onBind={() => setPhase("bind")} adoption={<AdoptionChoices completion={completion} adoption={adoption} setAdoption={setAdoption} />} />}
        {phase === "create" && <CreateAccountForm provider={provider} settings={settings} invitationRequired={completion.invitation_required || completion.error === "invitation_required"} settingsLoading={settingsLoading} settingsError={settingsError} onRetrySettings={retrySettings} form={form} error={error} loading={loading} codeSent={codeSent} turnstileToken={turnstileToken} turnstileReset={turnstileReset} onTurnstileToken={handleTurnstileToken} onChange={updateForm} onSendCode={sendCode} onSubmit={submitCreate} onBind={() => setPhase("bind")} adoption={<AdoptionChoices completion={completion} adoption={adoption} setAdoption={setAdoption} />} />}
        {phase === "bind" && <BindAccountForm form={form} error={error} loading={loading} onChange={updateForm} onSubmit={submitBind} onCreate={() => setPhase("create")} adoption={<AdoptionChoices completion={completion} adoption={adoption} setAdoption={setAdoption} />} />}
        {phase === "totp" && <AppicaTotpForm loading={loading} error={error} email={completion.user_email_masked} onSubmit={submitTotp} onCancel={() => setPhase("bind")} />}
      </AppicaAuthCard>
    </AppicaAuthLayout>
  );
}

function ProcessingState() {
  const { t } = useLocale();
  return <div className="text-foreground-muted flex items-center justify-center gap-3 py-8" role="status"><Spinner /><p>{t("auth.oauth.processing")}</p></div>;
}

function ErrorState({ error, onRetry }) {
  const { t } = useLocale();
  return <div className="flex flex-col gap-5"><AppicaAuthNotice tone="error">{error}</AppicaAuthNotice><Button type="button" variant="secondary" onClick={onRetry}>{t("auth.oauth.resume")}</Button></div>;
}

function AdoptionChoices({ completion, adoption, setAdoption }) {
  const { t } = useLocale();
  if (!completion.adoption_required && !completion.suggested_display_name && !completion.suggested_avatar_url) return null;
  return (
    <div className="flex flex-col gap-3">
      <b className="text-foreground-intense text-sm">{t("auth.oauth.adoptTitle")}</b>
      {completion.suggested_display_name && <label className="text-foreground flex items-center gap-2 text-sm"><Checkbox checked={adoption.displayName} onCheckedChange={(checked) => setAdoption((current) => ({ ...current, displayName: checked }))} /><span>{t("auth.oauth.adoptName", { name: completion.suggested_display_name })}</span></label>}
      {completion.suggested_avatar_url && <label className="text-foreground flex items-center gap-2 text-sm"><Checkbox checked={adoption.avatar} onCheckedChange={(checked) => setAdoption((current) => ({ ...current, avatar: checked }))} /><span>{t("auth.oauth.adoptAvatar")}</span></label>}
    </div>
  );
}

function InvitationForm({ form, error, loading, onChange, onSubmit, adoption }) {
  const { t } = useLocale();
  return <form className="flex flex-col gap-5" onSubmit={onSubmit}><AppicaAuthNotice tone="error">{error}</AppicaAuthNotice>{adoption}<AppicaAuthField label={t("auth.oauth.invitationLabel")}><AppicaTextInput value={form.invitation} onChange={(event) => onChange("invitation", event.target.value)} placeholder={t("auth.oauth.invitationPlaceholder")} autoFocus /></AppicaAuthField><AppicaSubmitButton loading={loading} loadingLabel={t("auth.oauth.checking")}>{t("auth.oauth.completeRegistration")}</AppicaSubmitButton></form>;
}

function ChoiceState({ completion, onContinue, onCreate, onBind, adoption }) {
  const email = getCompletionEmail(completion);
  const marker = String(completion.step || completion.error || "").toLowerCase();
  const adoptionOnly = completion.adoption_required && !choiceSteps.has(marker);
  const { t } = useLocale();
  return <div className="flex flex-col gap-5"><AppicaAuthNotice>{email ? t("auth.oauth.choiceWithEmail", { email }) : t("auth.oauth.choice")}</AppicaAuthNotice>{adoption}{adoptionOnly ? <Button type="button" size="lg" variant="primary" onClick={onContinue}>{t("auth.oauth.confirmContinue")}</Button> : <div className="grid gap-3 sm:grid-cols-2"><Button type="button" size="lg" variant="secondary" onClick={onBind}>{t("auth.oauth.bindExisting")}</Button><Button type="button" size="lg" variant="primary" onClick={onCreate}>{t("auth.oauth.createNew")}</Button></div>}</div>;
}

function CreateAccountForm({ provider, settings, invitationRequired, settingsLoading, settingsError, onRetrySettings, form, error, loading, codeSent, turnstileToken, turnstileReset, onTurnstileToken, onChange, onSendCode, onSubmit, onBind, adoption }) {
  const { t } = useLocale();
  const emailProvider = ["github", "google"].includes(provider);
  return (
    <form className="flex flex-col gap-5" onSubmit={onSubmit}>
      <AppicaAuthNotice tone={settingsError || error ? "error" : "info"}>{settingsError || error || (codeSent ? t("auth.oauth.codeSent") : t("auth.oauth.createIntro"))}</AppicaAuthNotice>
      {settingsError && <Button type="button" variant="ghost" onClick={onRetrySettings}>{t("auth.oauth.retrySettings")}</Button>}
      {adoption}
      <AppicaAuthField label={t("auth.oauth.email")}><AppicaTextInput type="email" value={form.email} onChange={(event) => onChange("email", event.target.value)} placeholder={t("auth.common.emailPlaceholder")} readOnly={emailProvider} /></AppicaAuthField>
      <AppicaAuthField label={t("auth.oauth.password")}><AppicaPasswordInput value={form.password} onChange={(event) => onChange("password", event.target.value)} placeholder={t("auth.oauth.passwordPlaceholder")} autoComplete="new-password" /></AppicaAuthField>
      {(invitationRequired || completionNeedsInvitation(settings)) && <AppicaAuthField label={t("auth.oauth.invitationLabel")}><AppicaTextInput value={form.invitation} onChange={(event) => onChange("invitation", event.target.value)} placeholder={t("auth.oauth.invitationLabel")} /></AppicaAuthField>}
      {settings?.email_verify_enabled && settings?.turnstile_enabled && !emailProvider && <TurnstileWidget enabled siteKey={settings?.turnstile_site_key} onToken={onTurnstileToken} resetKey={turnstileReset} />}
      {settings?.email_verify_enabled && !emailProvider && <AppicaAuthField label={t("auth.oauth.verifyCode")}><AppicaTextInput value={form.verifyCode} onChange={(event) => onChange("verifyCode", event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" action={<Button type="button" variant="ghost" size="sm" onClick={onSendCode} disabled={settings?.turnstile_enabled && !turnstileToken}>{codeSent ? t("auth.oauth.resend") : t("auth.oauth.sendCode")}</Button>} /></AppicaAuthField>}
      <AppicaSubmitButton loading={loading} loadingLabel={t("auth.oauth.creating")} disabled={settingsLoading || Boolean(settingsError)}>{t("auth.oauth.createContinue")}</AppicaSubmitButton>
      <Button type="button" variant="ghost" onClick={onBind}>{t("auth.oauth.haveAccount")}</Button>
    </form>
  );
}

function completionNeedsInvitation(settings) {
  return settings?.invitation_code_enabled === true;
}

function BindAccountForm({ form, error, loading, onChange, onSubmit, onCreate, adoption }) {
  const { t } = useLocale();
  return (
    <form className="flex flex-col gap-5" onSubmit={onSubmit}>
      <AppicaAuthNotice tone={error ? "error" : "info"}>{error || t("auth.oauth.bindIntro")}</AppicaAuthNotice>
      {adoption}
      <AppicaAuthField label={t("auth.oauth.existingEmail")}><AppicaTextInput type="email" value={form.email} onChange={(event) => onChange("email", event.target.value)} placeholder={t("auth.common.emailPlaceholder")} autoComplete="email" /></AppicaAuthField>
      <AppicaAuthField label={t("auth.oauth.existingPassword")}><AppicaPasswordInput value={form.password} onChange={(event) => onChange("password", event.target.value)} placeholder={t("auth.oauth.passwordEnter")} /></AppicaAuthField>
      <AppicaSubmitButton loading={loading} loadingLabel={t("auth.oauth.linking")}>{t("auth.oauth.signInLink")}</AppicaSubmitButton>
      <Button type="button" variant="ghost" onClick={onCreate}>{t("auth.oauth.createInstead")}</Button>
    </form>
  );
}

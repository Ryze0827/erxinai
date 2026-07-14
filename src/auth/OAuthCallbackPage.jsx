import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { authApi, getOAuthCallbackUrl } from "../api/auth";
import {
  clearPendingAuthSession,
  getPendingAuthSession,
  persistAuthResponse,
  savePendingAuthSession,
  setStoredUser,
} from "../api/session";
import { AuthCard, AuthLayout } from "./AuthLayout";
import { AuthField, AuthNotice, PasswordInput, SubmitButton, TextInput, TotpForm } from "./AuthControls";
import { booleanParam, clearAffiliateCode, getErrorMessage, readOAuthFragment } from "./authUtils";
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
  const providerName = provider === "oidc" ? settings?.oidc_oauth_provider_name || "OIDC" : ({ linuxdo: "Linux.do", wechat: "WeChat", dingtalk: "DingTalk", github: "GitHub", google: "Google" }[provider] || "your provider");
  const handleTurnstileToken = useCallback((token) => setTurnstileToken(token), []);

  const adoptionPayload = () => ({
    adopt_display_name: adoption.displayName,
    adopt_avatar: adoption.avatar,
  });

  const finish = async (response) => {
    persistAuthResponse(response, true);
    try {
      setStoredUser(await authApi.getCurrentUser());
    } catch {
      // A token-only OAuth response is still a valid authenticated session.
    }
    clearPendingAuthSession();
    clearAffiliateCode();
    sessionStorage.removeItem("email_oauth_pending_provider");
    navigate("/", { replace: true });
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
      setError(getErrorMessage(requestError, "This sign-in session is invalid or expired."));
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
    if (!form.invitation.trim()) return setError("Enter an invitation code.");
    setLoading(true);
    try {
      await applyCompletion(await authApi.completeOAuthRegistration(provider, {
        invitation_code: form.invitation.trim(),
        ...getAffiliatePayload(),
        ...adoptionPayload(),
        ...(pending.token ? { [pending.token_field]: pending.token } : {}),
      }));
    } catch (requestError) {
      setError(getErrorMessage(requestError, "The invitation code could not be accepted."));
    } finally {
      setLoading(false);
    }
  };

  const sendCode = async () => {
    if (!settings) return;
    if (!form.email.trim()) return setError("Enter an email address first.");
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
      setError(getErrorMessage(requestError, "The verification code could not be sent."));
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
    if (!form.email.trim() || form.password.length < 6) return setError("Enter an email and a password of at least 6 characters.");
    if ((settings.invitation_code_enabled || completion.invitation_required) && !form.invitation.trim()) return setError("Enter an invitation code.");
    if (settings?.email_verify_enabled && !["github", "google"].includes(provider) && !/^\d{6}$/.test(form.verifyCode)) return setError("Enter the six-digit email verification code.");
    setLoading(true);
    try {
      const response = ["github", "google"].includes(provider) ? await submitEmailProviderAccount() : await submitPendingAccount();
      await applyCompletion(response);
    } catch (requestError) {
      const message = getErrorMessage(requestError, "The account could not be created.");
      setError(message);
      if (requestError?.reason === "EMAIL_EXISTS") setPhase("bind");
    } finally {
      setLoading(false);
    }
  };

  const submitBind = async (event) => {
    event.preventDefault();
    if (!form.email.trim() || !form.password) return setError("Enter the email and password for your existing account.");
    setLoading(true);
    try {
      await applyCompletion(await authApi.bindPendingLogin({
        email: form.email.trim(),
        password: form.password,
        ...adoptionPayload(),
      }));
    } catch (requestError) {
      setError(getErrorMessage(requestError, "The existing account could not be linked."));
    } finally {
      setLoading(false);
    }
  };

  const submitTotp = async (code) => {
    setLoading(true);
    try {
      await finish(await authApi.login2FA({ temp_token: completion.temp_token, totp_code: code }));
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Verification failed."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthCard kicker="Secure sign-in" title={`Continue with ${providerName}`} description="Complete the remaining account step to finish authentication." footer={<Link to="/login">Back to login</Link>}>
        {phase === "processing" && <ProcessingState />}
        {phase === "error" && <ErrorState error={error} onRetry={() => exchangePending()} />}
        {phase === "invitation" && <InvitationForm form={form} error={error} loading={loading} onChange={updateForm} onSubmit={submitInvitation} adoption={<AdoptionChoices completion={completion} adoption={adoption} setAdoption={setAdoption} />} />}
        {phase === "choice" && <ChoiceState completion={completion} onContinue={() => exchangePending(true)} onCreate={() => setPhase("create")} onBind={() => setPhase("bind")} adoption={<AdoptionChoices completion={completion} adoption={adoption} setAdoption={setAdoption} />} />}
        {phase === "create" && <CreateAccountForm provider={provider} settings={settings} invitationRequired={completion.invitation_required || completion.error === "invitation_required"} settingsLoading={settingsLoading} settingsError={settingsError} onRetrySettings={retrySettings} form={form} error={error} loading={loading} codeSent={codeSent} turnstileToken={turnstileToken} turnstileReset={turnstileReset} onTurnstileToken={handleTurnstileToken} onChange={updateForm} onSendCode={sendCode} onSubmit={submitCreate} onBind={() => setPhase("bind")} adoption={<AdoptionChoices completion={completion} adoption={adoption} setAdoption={setAdoption} />} />}
        {phase === "bind" && <BindAccountForm form={form} error={error} loading={loading} onChange={updateForm} onSubmit={submitBind} onCreate={() => setPhase("create")} adoption={<AdoptionChoices completion={completion} adoption={adoption} setAdoption={setAdoption} />} />}
        {phase === "totp" && <TotpForm loading={loading} error={error} email={completion.user_email_masked} onSubmit={submitTotp} onCancel={() => setPhase("bind")} />}
      </AuthCard>
    </AuthLayout>
  );
}

function ProcessingState() {
  return <div className="auth-processing" role="status"><i /><p>Completing secure sign-in…</p></div>;
}

function ErrorState({ error, onRetry }) {
  return <div className="auth-form"><AuthNotice tone="error">{error}</AuthNotice><button className="auth-secondary-button" type="button" onClick={onRetry}>Try to resume</button></div>;
}

function AdoptionChoices({ completion, adoption, setAdoption }) {
  if (!completion.adoption_required && !completion.suggested_display_name && !completion.suggested_avatar_url) return null;
  return (
    <div className="auth-adoption">
      <b>Use profile details from this provider?</b>
      {completion.suggested_display_name && <label className="auth-checkbox"><input type="checkbox" checked={adoption.displayName} onChange={(event) => setAdoption((current) => ({ ...current, displayName: event.target.checked }))} /><span>Use “{completion.suggested_display_name}” as my display name</span></label>}
      {completion.suggested_avatar_url && <label className="auth-checkbox"><input type="checkbox" checked={adoption.avatar} onChange={(event) => setAdoption((current) => ({ ...current, avatar: event.target.checked }))} /><span>Use the provider profile image</span></label>}
    </div>
  );
}

function InvitationForm({ form, error, loading, onChange, onSubmit, adoption }) {
  return <form className="auth-form" onSubmit={onSubmit}><AuthNotice tone="error">{error}</AuthNotice>{adoption}<AuthField label="Invitation code"><TextInput value={form.invitation} onChange={(event) => onChange("invitation", event.target.value)} placeholder="Enter your invitation code" autoFocus /></AuthField><SubmitButton loading={loading} loadingLabel="Checking…">Complete registration</SubmitButton></form>;
}

function ChoiceState({ completion, onContinue, onCreate, onBind, adoption }) {
  const email = getCompletionEmail(completion);
  const marker = String(completion.step || completion.error || "").toLowerCase();
  const adoptionOnly = completion.adoption_required && !choiceSteps.has(marker);
  return <div className="auth-form"><AuthNotice>{email ? `We found account context for ${email}. Choose how to continue.` : "Choose how you want to connect this provider."}</AuthNotice>{adoption}{adoptionOnly ? <button className="auth-submit" type="button" onClick={onContinue}><span>Confirm and continue</span><i aria-hidden="true" /></button> : <div className="auth-choice-grid"><button className="auth-secondary-button" type="button" onClick={onBind}>Bind an existing account</button><button className="auth-submit" type="button" onClick={onCreate}><span>Create a new account</span><i aria-hidden="true" /></button></div>}</div>;
}

function CreateAccountForm({ provider, settings, invitationRequired, settingsLoading, settingsError, onRetrySettings, form, error, loading, codeSent, turnstileToken, turnstileReset, onTurnstileToken, onChange, onSendCode, onSubmit, onBind, adoption }) {
  const emailProvider = ["github", "google"].includes(provider);
  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <AuthNotice tone={settingsError || error ? "error" : "info"}>{settingsError || error || (codeSent ? "Verification code sent." : "Create a local account to finish connecting this provider.")}</AuthNotice>
      {settingsError && <button className="auth-link-button" type="button" onClick={onRetrySettings}>Retry loading settings</button>}
      {adoption}
      <AuthField label="Email address"><TextInput type="email" value={form.email} onChange={(event) => onChange("email", event.target.value)} placeholder="you@company.com" readOnly={emailProvider} /></AuthField>
      <AuthField label="Password"><PasswordInput value={form.password} onChange={(event) => onChange("password", event.target.value)} placeholder="At least 6 characters" autoComplete="new-password" /></AuthField>
      {(invitationRequired || completionNeedsInvitation(settings)) && <AuthField label="Invitation code"><TextInput value={form.invitation} onChange={(event) => onChange("invitation", event.target.value)} placeholder="Invitation code" /></AuthField>}
      {settings?.email_verify_enabled && settings?.turnstile_enabled && !emailProvider && <TurnstileWidget enabled siteKey={settings?.turnstile_site_key} onToken={onTurnstileToken} resetKey={turnstileReset} />}
      {settings?.email_verify_enabled && !emailProvider && <AuthField label="Email verification code"><TextInput value={form.verifyCode} onChange={(event) => onChange("verifyCode", event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" action={<button type="button" onClick={onSendCode} disabled={settings?.turnstile_enabled && !turnstileToken}>{codeSent ? "Resend" : "Send code"}</button>} /></AuthField>}
      <SubmitButton loading={loading} loadingLabel="Creating…" disabled={settingsLoading || Boolean(settingsError)}>Create and continue</SubmitButton>
      <button className="auth-link-button" type="button" onClick={onBind}>I already have an account</button>
    </form>
  );
}

function completionNeedsInvitation(settings) {
  return settings?.invitation_code_enabled === true;
}

function BindAccountForm({ form, error, loading, onChange, onSubmit, onCreate, adoption }) {
  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <AuthNotice tone={error ? "error" : "info"}>{error || "Sign in to the existing account you want to link."}</AuthNotice>
      {adoption}
      <AuthField label="Existing account email"><TextInput type="email" value={form.email} onChange={(event) => onChange("email", event.target.value)} placeholder="you@company.com" autoComplete="email" /></AuthField>
      <AuthField label="Existing account password"><PasswordInput value={form.password} onChange={(event) => onChange("password", event.target.value)} placeholder="Enter your password" /></AuthField>
      <SubmitButton loading={loading} loadingLabel="Linking…">Sign in and link</SubmitButton>
      <button className="auth-link-button" type="button" onClick={onCreate}>Create a new account instead</button>
    </form>
  );
}

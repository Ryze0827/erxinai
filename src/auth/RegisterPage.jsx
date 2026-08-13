import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Badge } from "@appica/ui-react/badge";
import { Button } from "@appica/ui-react/button";
import { Collapsible } from "@appica/ui-react/collapsible";
import { CollapsibleContent } from "@appica/ui-react/collapsible";
import { CollapsibleTrigger } from "@appica/ui-react/collapsible";
import { Progress } from "@appica/ui-react/progress";
import { authApi } from "../api/auth";
import { persistAuthResponse } from "../api/session";
import { useLocale } from "../console/i18n";
import { AgreementPrompt, useAgreement } from "./AgreementPrompt";
import {
  AppicaAuthCard,
  AppicaAuthField,
  AppicaAuthLayout,
  AppicaAuthNotice,
  AppicaEmailInput,
  AppicaPasswordInput,
  AppicaSubmitButton,
  AppicaTextInput,
} from "./AppicaAuth";
import { getAffiliateCode, getErrorMessage, isEmail } from "./authUtils";
import { OAuthButtons } from "./OAuthButtons";
import { TurnstileWidget } from "./TurnstileWidget";
import { usePublicSettings } from "./usePublicSettings";

function isAllowedEmail(email, suffixes = []) {
  if (!suffixes.length) return true;
  const domain = email.trim().toLowerCase().split("@")[1] || "";
  return suffixes.some((suffix) => {
    const normalized = suffix.trim().toLowerCase().replace(/^@+/, "");
    if (!normalized.startsWith("*.")) return domain === normalized;
    const wildcardDomain = normalized.slice(2);
    return domain === wildcardDomain || domain.endsWith(`.${wildcardDomain}`);
  });
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { locale, t } = useLocale();
  const { settings, loading: settingsLoading, error: settingsError, retry } = usePublicSettings();
  const agreement = useAgreement(settings);
  const affiliateCode = useMemo(() => getAffiliateCode(searchParams), [searchParams]);
  const [form, setForm] = useState({ email: "", password: "", invitation: "", promo: searchParams.get("promo") || "" });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ invitation: "", promo: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showExtras, setShowExtras] = useState(Boolean(form.promo));
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReset, setTurnstileReset] = useState(0);
  const handleTurnstileToken = useCallback((token) => setTurnstileToken(token), []);

  useEffect(() => {
    setErrors({});
    setError("");
  }, [locale]);

  const strength = [form.password.length >= 6, /[a-z]/i.test(form.password), /\d/.test(form.password), /[^a-z0-9]/i.test(form.password)].filter(Boolean).length;
  const strengthColor = strength < 2 ? "var(--error-emphasis)" : strength < 4 ? "var(--warning-emphasis)" : "var(--success-emphasis)";

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
    setStatus((current) => ({ ...current, [field]: "" }));
    setError("");
  };

  const validate = () => {
    const nextErrors = {};
    if (!isEmail(form.email)) nextErrors.email = t("auth.error.emailInvalid");
    if (form.password.length < 6) nextErrors.password = t("auth.error.passwordMin");
    if (!isAllowedEmail(form.email, settings?.registration_email_suffix_whitelist)) nextErrors.email = t("auth.error.emailDomainNotAllowed");
    if (settings?.invitation_code_enabled && !form.invitation.trim()) nextErrors.invitation = t("auth.error.invitationRequired");
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateCode = async (field) => {
    const code = form[field].trim();
    if (!code) return true;
    setStatus((current) => ({ ...current, [field]: "checking" }));
    try {
      const response = field === "promo" ? await authApi.validatePromoCode(code) : await authApi.validateInvitationCode(code);
      setStatus((current) => ({ ...current, [field]: response.valid ? "valid" : "invalid" }));
      return response.valid;
    } catch {
      setStatus((current) => ({ ...current, [field]: "invalid" }));
      return false;
    }
  };

  const buildPayload = () => ({
    email: form.email.trim(),
    password: form.password,
    promo_code: form.promo.trim() || undefined,
    invitation_code: form.invitation.trim() || undefined,
    aff_code: affiliateCode || undefined,
  });

  const beginEmailVerification = async () => {
    const response = await authApi.sendVerifyCode({ email: form.email.trim(), turnstile_token: turnstileToken || undefined });
    sessionStorage.setItem("register_data", JSON.stringify({
      ...buildPayload(),
      countdown_until: Date.now() + (response.countdown || 60) * 1000,
    }));
    navigate("/email-verify");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!settings) return;
    if (!validate() || !agreement.accepted) return;
    const invitationValid = !settings?.invitation_code_enabled || await validateCode("invitation");
    const promoValid = !form.promo.trim() || await validateCode("promo");
    if (!invitationValid || !promoValid) return setError(t("auth.register.codeCheckFailed"));
    setLoading(true);
    setError("");
    try {
      if (settings.email_verify_enabled) {
        await beginEmailVerification();
      } else {
        const response = await authApi.register({ ...buildPayload(), turnstile_token: settings.turnstile_enabled ? turnstileToken : undefined });
        persistAuthResponse(response);
        navigate("/keys", { replace: true });
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError, t("auth.register.failed"), t));
      setTurnstileToken("");
      setTurnstileReset((value) => value + 1);
    } finally {
      setLoading(false);
    }
  };

  const registrationClosed = settings && (settings.registration_enabled === false || settings.backend_mode_enabled);

  return (
    <AppicaAuthLayout>
      <AppicaAuthCard kicker={t("auth.register.kicker")} title={t("auth.register.title")} description={t("auth.register.description")} footer={<><span>{t("auth.register.existingUser")}</span> <Link to="/login">{t("auth.register.login")}</Link></>}>
        <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
          <AppicaAuthNotice>{settingsLoading ? t("auth.register.loadingOptions") : ""}</AppicaAuthNotice>
          <AppicaAuthNotice tone={settingsError || error || registrationClosed ? "error" : "info"}>{settingsError || error || (registrationClosed ? t("auth.register.closed") : "")}</AppicaAuthNotice>
          {settingsError && <Button className="w-fit" variant="ghost" size="sm" type="button" onClick={retry}>{t("auth.common.retrySettings")}</Button>}
          <AppicaAuthField label={t("auth.common.email")} error={errors.email}>
            <AppicaEmailInput type="email" value={form.email} onValueChange={(value) => updateForm("email", value)} error={errors.email} placeholder={t("auth.common.emailPlaceholder")} autoComplete="email" autoFocus />
          </AppicaAuthField>
          <AppicaAuthField label={t("auth.common.password")} error={errors.password}>
            <AppicaPasswordInput value={form.password} onChange={(event) => updateForm("password", event.target.value)} error={errors.password} placeholder={t("auth.register.passwordPlaceholder")} autoComplete="new-password" />
            <div className="flex items-center gap-3" aria-label={t("auth.register.passwordStrength", { strength })}>
              <Progress className="flex-1" value={strength * 25} max={100} indicatorColor={strengthColor} />
              <span className="text-foreground-muted text-xs">{t(strength < 2 ? "auth.register.strengthLow" : strength < 4 ? "auth.register.strengthGood" : "auth.register.strengthStrong")}</span>
            </div>
          </AppicaAuthField>
          {(settings?.invitation_code_enabled || settings?.promo_code_enabled) && (
            <Collapsible className="flex flex-col gap-4" open={showExtras} onOpenChange={setShowExtras}>
              <CollapsibleTrigger className="w-full justify-between" render={<Button type="button" variant="outline" />}><span>{t("auth.register.extrasPrompt")}</span><strong>{t(showExtras ? "auth.register.hideExtras" : "auth.register.addExtras")}</strong></CollapsibleTrigger>
              <CollapsibleContent className="flex flex-col gap-5">
                {settings?.invitation_code_enabled && <AppicaAuthField label={t("auth.register.invitationCode")} error={errors.invitation || (status.invitation === "invalid" ? t("auth.error.invitationInvalid") : "")}><AppicaTextInput value={form.invitation} onChange={(event) => updateForm("invitation", event.target.value)} onBlur={() => validateCode("invitation")} placeholder={t("auth.register.invitationPlaceholder")} action={status.invitation === "valid" ? <Badge variant="success" size="sm">{t("auth.common.valid")}</Badge> : null} /></AppicaAuthField>}
                {settings?.promo_code_enabled && <AppicaAuthField label={t("auth.register.promoCode")} error={status.promo === "invalid" ? t("auth.error.promoInvalid") : ""}><AppicaTextInput value={form.promo} onChange={(event) => updateForm("promo", event.target.value)} onBlur={() => validateCode("promo")} placeholder={t("auth.register.promoPlaceholder")} action={status.promo === "valid" ? <Badge variant="success" size="sm">{t("auth.common.valid")}</Badge> : null} /></AppicaAuthField>}
              </CollapsibleContent>
            </Collapsible>
          )}
          <TurnstileWidget enabled={settings?.turnstile_enabled} siteKey={settings?.turnstile_site_key} onToken={handleTurnstileToken} resetKey={turnstileReset} />
          <AgreementPrompt agreement={agreement} />
          <AppicaSubmitButton loading={loading} loadingLabel={t(settings?.email_verify_enabled ? "auth.register.sendingCode" : "auth.register.creating")} disabled={settingsLoading || Boolean(settingsError) || registrationClosed || !agreement.accepted || (settings?.turnstile_enabled && !turnstileToken)}>{t(settings?.email_verify_enabled ? "auth.register.continue" : "auth.register.create")}</AppicaSubmitButton>
          {!settings?.backend_mode_enabled && <OAuthButtons settings={settings} searchParams={searchParams} onError={setError} />}
        </form>
      </AppicaAuthCard>
    </AppicaAuthLayout>
  );
}

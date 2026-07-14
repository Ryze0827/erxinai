import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { authApi } from "../api/auth";
import { persistAuthResponse } from "../api/session";
import { AgreementPrompt, useAgreement } from "./AgreementPrompt";
import { AuthCard, AuthLayout } from "./AuthLayout";
import { AuthField, AuthNotice, PasswordInput, SubmitButton, TextInput } from "./AuthControls";
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

  const strength = [form.password.length >= 6, /[a-z]/i.test(form.password), /\d/.test(form.password), /[^a-z0-9]/i.test(form.password)].filter(Boolean).length;

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
    setStatus((current) => ({ ...current, [field]: "" }));
    setError("");
  };

  const validate = () => {
    const nextErrors = {};
    if (!isEmail(form.email)) nextErrors.email = "Enter a valid email address.";
    if (form.password.length < 6) nextErrors.password = "Password must be at least 6 characters.";
    if (!isAllowedEmail(form.email, settings?.registration_email_suffix_whitelist)) nextErrors.email = "This email domain is not allowed.";
    if (settings?.invitation_code_enabled && !form.invitation.trim()) nextErrors.invitation = "Invitation code is required.";
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
    if (!invitationValid || !promoValid) return setError("Check the invitation or promo code and try again.");
    setLoading(true);
    setError("");
    try {
      if (settings.email_verify_enabled) {
        await beginEmailVerification();
      } else {
        const response = await authApi.register({ ...buildPayload(), turnstile_token: settings.turnstile_enabled ? turnstileToken : undefined });
        persistAuthResponse(response, true);
        navigate("/", { replace: true });
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Registration failed."));
      setTurnstileToken("");
      setTurnstileReset((value) => value + 1);
    } finally {
      setLoading(false);
    }
  };

  const registrationClosed = settings && (settings.registration_enabled === false || settings.backend_mode_enabled);

  return (
    <AuthLayout>
      <AuthCard kicker="Start building" title="Create your Sentence AI account" description="One account for every key, model, and project." footer={<><span>Already have an account?</span> <Link to="/login">Log in</Link></>}>
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <AuthNotice tone={settingsError || error || registrationClosed ? "error" : "info"}>{settingsError || error || (registrationClosed ? "Registration is currently closed." : "")}</AuthNotice>
          {settingsError && <button className="auth-link-button" type="button" onClick={retry}>Retry loading settings</button>}
          <AuthField label="Email address" error={errors.email}>
            <TextInput type="email" value={form.email} onChange={(event) => updateForm("email", event.target.value)} error={errors.email} placeholder="you@company.com" autoComplete="email" autoFocus />
          </AuthField>
          <AuthField label="Password" error={errors.password}>
            <PasswordInput value={form.password} onChange={(event) => updateForm("password", event.target.value)} error={errors.password} placeholder="Create a secure password" autoComplete="new-password" />
            <div className="auth-strength" aria-label={`Password strength ${strength} of 4`}>
              {[1, 2, 3, 4].map((step) => <i key={step} data-active={strength >= step} />)}
              <span>{strength < 2 ? "Keep going" : strength < 4 ? "Good password" : "Strong password"}</span>
            </div>
          </AuthField>
          {(settings?.invitation_code_enabled || settings?.promo_code_enabled) && (
            <>
              <button type="button" className="auth-extras-toggle" aria-expanded={showExtras} onClick={() => setShowExtras((value) => !value)}><span>Have an invite or promo code?</span><b>{showExtras ? "Hide" : "Add"}</b></button>
              <div className="auth-extras" data-open={showExtras} aria-hidden={!showExtras}>
                {settings?.invitation_code_enabled && <AuthField label="Invitation code" error={errors.invitation || (status.invitation === "invalid" ? "Invalid invitation code." : "")}><TextInput value={form.invitation} onChange={(event) => updateForm("invitation", event.target.value)} onBlur={() => validateCode("invitation")} disabled={!showExtras} placeholder="Required invitation code" action={status.invitation === "valid" ? <small>Valid</small> : null} /></AuthField>}
                {settings?.promo_code_enabled && <AuthField label="Promo code" error={status.promo === "invalid" ? "Invalid promo code." : ""}><TextInput value={form.promo} onChange={(event) => updateForm("promo", event.target.value)} onBlur={() => validateCode("promo")} disabled={!showExtras} placeholder="Optional promo code" action={status.promo === "valid" ? <small>Valid</small> : null} /></AuthField>}
              </div>
            </>
          )}
          <TurnstileWidget enabled={settings?.turnstile_enabled} siteKey={settings?.turnstile_site_key} onToken={handleTurnstileToken} resetKey={turnstileReset} />
          <AgreementPrompt agreement={agreement} />
          <SubmitButton loading={loading} loadingLabel={settings?.email_verify_enabled ? "Sending code…" : "Creating account…"} disabled={settingsLoading || Boolean(settingsError) || registrationClosed || !agreement.accepted || (settings?.turnstile_enabled && !turnstileToken)}>{settings?.email_verify_enabled ? "Continue" : "Create account"}</SubmitButton>
          {!settings?.backend_mode_enabled && <OAuthButtons settings={settings} searchParams={searchParams} onError={setError} />}
        </form>
      </AuthCard>
    </AuthLayout>
  );
}

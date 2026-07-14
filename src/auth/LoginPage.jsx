import { useCallback, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { authApi } from "../api/auth";
import { persistAuthResponse } from "../api/session";
import { AgreementPrompt, useAgreement } from "./AgreementPrompt";
import { AuthCard, AuthLayout } from "./AuthLayout";
import { AuthField, AuthNotice, PasswordInput, SubmitButton, TextInput, TotpForm } from "./AuthControls";
import { getErrorMessage, isEmail } from "./authUtils";
import { OAuthButtons } from "./OAuthButtons";
import { TurnstileWidget } from "./TurnstileWidget";
import { usePublicSettings } from "./usePublicSettings";

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { settings, loading: settingsLoading, error: settingsError, retry } = usePublicSettings();
  const agreement = useAgreement(settings);
  const [form, setForm] = useState({ email: "", password: "", remember: false });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(sessionStorage.getItem("auth_expired") ? "Your session expired. Please sign in again." : "");
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReset, setTurnstileReset] = useState(0);
  const [totp, setTotp] = useState(null);
  const handleTurnstileToken = useCallback((token) => setTurnstileToken(token), []);

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
    setError("");
  };

  const validate = () => {
    const nextErrors = {};
    if (!isEmail(form.email)) nextErrors.email = "Enter a valid email address.";
    if (form.password.length < 6) nextErrors.password = "Password must be at least 6 characters.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const completeLogin = (response) => {
    persistAuthResponse(response, form.remember);
    sessionStorage.removeItem("auth_expired");
    navigate("/", { replace: true });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!settings) return;
    if (!validate() || !agreement.accepted) return;
    setLoading(true);
    setError("");
    try {
      const response = await authApi.login({
        email: form.email.trim(),
        password: form.password,
        turnstile_token: settings?.turnstile_enabled ? turnstileToken : undefined,
      });
      if (response.requires_2fa) {
        setTotp(response);
      } else {
        completeLogin(response);
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Login failed."));
      setTurnstileToken("");
      setTurnstileReset((value) => value + 1);
    } finally {
      setLoading(false);
    }
  };

  const handleTotp = async (code) => {
    setLoading(true);
    setError("");
    try {
      completeLogin(await authApi.login2FA({ temp_token: totp.temp_token, totp_code: code }));
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Verification failed."));
    } finally {
      setLoading(false);
    }
  };

  const footer = settings?.backend_mode_enabled ? null : <><span>New to Sentence AI?</span> <Link to="/register">Create an account</Link></>;

  return (
    <AuthLayout>
      <AuthCard kicker="Welcome back" title="Log in to Sentence AI" description="Pick up exactly where your last request left off." footer={footer}>
        {totp ? (
          <TotpForm loading={loading} error={error} email={totp.user_email_masked} onSubmit={handleTotp} onCancel={() => { setTotp(null); setError(""); }} />
        ) : (
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <AuthNotice tone={settingsError || error ? "error" : "info"}>{settingsError || error}</AuthNotice>
            {settingsError && <button className="auth-link-button" type="button" onClick={retry}>Retry loading settings</button>}
            <AuthField label="Email address" error={errors.email}>
              <TextInput type="email" value={form.email} onChange={(event) => updateForm("email", event.target.value)} error={errors.email} placeholder="you@company.com" autoComplete="email" autoFocus />
            </AuthField>
            <AuthField label="Password" error={errors.password}>
              <PasswordInput value={form.password} onChange={(event) => updateForm("password", event.target.value)} error={errors.password} placeholder="Enter your password" />
            </AuthField>
            <div className="auth-form-row">
              <label className="auth-checkbox"><input type="checkbox" checked={form.remember} onChange={(event) => updateForm("remember", event.target.checked)} /><span>Keep me signed in</span></label>
              {settings?.password_reset_enabled && <Link className="auth-text-link" to="/forgot-password">Forgot password?</Link>}
            </div>
            <TurnstileWidget enabled={settings?.turnstile_enabled} siteKey={settings?.turnstile_site_key} onToken={handleTurnstileToken} resetKey={turnstileReset} />
            <AgreementPrompt agreement={agreement} />
            <SubmitButton loading={loading} loadingLabel="Signing in…" disabled={settingsLoading || Boolean(settingsError) || !agreement.accepted || (settings?.turnstile_enabled && !turnstileToken)}>Log in</SubmitButton>
            {!settings?.backend_mode_enabled && <OAuthButtons settings={settings} searchParams={searchParams} onError={setError} />}
          </form>
        )}
      </AuthCard>
    </AuthLayout>
  );
}

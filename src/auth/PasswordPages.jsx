import { useCallback, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { authApi } from "../api/auth";
import { AuthCard, AuthLayout } from "./AuthLayout";
import { AuthField, AuthNotice, PasswordInput, SubmitButton, TextInput } from "./AuthControls";
import { getErrorMessage, isEmail } from "./authUtils";
import { TurnstileWidget } from "./TurnstileWidget";
import { usePublicSettings } from "./usePublicSettings";

export function ForgotPasswordPage() {
  const { settings, loading: settingsLoading, error: settingsError, retry } = usePublicSettings();
  const [email, setEmail] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [turnstileReset, setTurnstileReset] = useState(0);
  const handleToken = useCallback((token) => setTurnstileToken(token), []);

  const submit = async (event) => {
    event.preventDefault();
    if (!settings) return;
    if (!isEmail(email)) return setError("Enter a valid email address.");
    setLoading(true);
    setError("");
    try {
      const response = await authApi.forgotPassword({ email: email.trim(), turnstile_token: turnstileToken || undefined });
      setMessage(response.message || "If the email is registered, a reset link will arrive shortly.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "We couldn't request a reset link."));
      setTurnstileToken("");
      setTurnstileReset((value) => value + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout><AuthCard kicker="Account recovery" title="Reset your password" description="We'll email a secure reset link if the account exists." footer={<Link to="/login">Back to login</Link>}>
      <form className="auth-form" onSubmit={submit}>
        <AuthNotice tone={settingsError || error ? "error" : "info"}>{settingsError || error || message}</AuthNotice>
        {settingsError && <button className="auth-link-button" type="button" onClick={retry}>Retry loading settings</button>}
        <AuthField label="Email address"><TextInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" autoComplete="email" autoFocus /></AuthField>
        <TurnstileWidget enabled={settings?.turnstile_enabled} siteKey={settings?.turnstile_site_key} onToken={handleToken} resetKey={turnstileReset} />
        <SubmitButton loading={loading} loadingLabel="Sending…" disabled={Boolean(message) || settingsLoading || Boolean(settingsError) || settings?.password_reset_enabled === false || (settings?.turnstile_enabled && !turnstileToken)}>Send reset link</SubmitButton>
      </form>
    </AuthCard></AuthLayout>
  );
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!email || !token) return setError("This reset link is incomplete.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirmation) return setError("The passwords do not match.");
    setLoading(true);
    setError("");
    try {
      const response = await authApi.resetPassword({ email, token, new_password: password });
      setMessage(response.message || "Your password has been reset.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Password reset failed."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout><AuthCard kicker="Choose a new password" title="Secure your account" description={email ? `Resetting the password for ${email}.` : "Open the complete link from your reset email."} footer={<Link to="/login">Return to login</Link>}>
      <form className="auth-form" onSubmit={submit}>
        <AuthNotice tone={error ? "error" : "info"}>{error || message}</AuthNotice>
        <AuthField label="New password"><PasswordInput value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" autoComplete="new-password" /></AuthField>
        <AuthField label="Confirm password"><PasswordInput value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Repeat your new password" autoComplete="new-password" /></AuthField>
        <SubmitButton loading={loading} loadingLabel="Resetting…" disabled={Boolean(message)}>Reset password</SubmitButton>
      </form>
    </AuthCard></AuthLayout>
  );
}

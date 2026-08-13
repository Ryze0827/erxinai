import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { Button } from "@appica/ui-react/button";
import { authApi } from "../api/auth";
import {
  AppicaAuthCard,
  AppicaAuthField,
  AppicaAuthLayout,
  AppicaAuthNotice,
  AppicaEmailInput,
  AppicaPasswordInput,
  AppicaSubmitButton,
} from "./AppicaAuth";
import { getErrorMessage, isEmail } from "./authUtils";
import { TurnstileWidget } from "./TurnstileWidget";
import { usePublicSettings } from "./usePublicSettings";

function takeResetContext() {
  const url = new URL(window.location.href);
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
  const context = { email: url.searchParams.get("email") || hashParams.get("email") || "", token: hashParams.get("token") || url.searchParams.get("token") || "" };
  if (!context.token) return context;
  url.searchParams.delete("token");
  hashParams.delete("token");
  url.hash = hashParams.toString();
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  return context;
}

export function ForgotPasswordPage() {
  const { settings, loading: settingsLoading, error: settingsError, retry } = usePublicSettings();
  const [email, setEmail] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [emailError, setEmailError] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [turnstileReset, setTurnstileReset] = useState(0);
  const handleToken = useCallback((token) => setTurnstileToken(token), []);

  const submit = async (event) => {
    event.preventDefault();
    if (!settings) return;
    if (!isEmail(email)) return setEmailError("Enter a valid email address.");
    setLoading(true);
    setEmailError("");
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

  const updateEmail = (value) => {
    setEmail(value);
    setEmailError("");
    setError("");
  };

  return (
    <AppicaAuthLayout><AppicaAuthCard kicker="Account recovery" title="Reset your password" description="We'll email a secure reset link if the account exists." footer={<Link to="/login">Back to login</Link>}>
      <form className="flex flex-col gap-5" onSubmit={submit} noValidate>
        <AppicaAuthNotice tone={settingsError || error ? "error" : "info"}>{settingsError || error || message}</AppicaAuthNotice>
        {settingsError && <Button className="w-fit" variant="ghost" size="sm" type="button" onClick={retry}>Retry loading settings</Button>}
        <AppicaAuthField label="Email address" error={emailError}><AppicaEmailInput type="email" value={email} onValueChange={updateEmail} error={emailError} placeholder="you@company.com" autoComplete="email" autoFocus /></AppicaAuthField>
        <TurnstileWidget enabled={settings?.turnstile_enabled} siteKey={settings?.turnstile_site_key} onToken={handleToken} resetKey={turnstileReset} />
        <AppicaSubmitButton loading={loading} loadingLabel="Sending…" disabled={Boolean(message) || settingsLoading || Boolean(settingsError) || settings?.password_reset_enabled === false || (settings?.turnstile_enabled && !turnstileToken)}>Send reset link</AppicaSubmitButton>
      </form>
    </AppicaAuthCard></AppicaAuthLayout>
  );
}

export function ResetPasswordPage() {
  const [{ email, token }, setResetContext] = useState(takeResetContext);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const captureResetContext = () => {
      const context = takeResetContext();
      if (context.token) setResetContext(context);
    };
    window.addEventListener("hashchange", captureResetContext);
    window.addEventListener("popstate", captureResetContext);
    return () => {
      window.removeEventListener("hashchange", captureResetContext);
      window.removeEventListener("popstate", captureResetContext);
    };
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    if (!email || !token) return setError("This reset link is incomplete.");
    const nextErrors = {};
    if (password.length < 6) nextErrors.password = "Password must be at least 6 characters.";
    if (password !== confirmation) nextErrors.confirmation = "The passwords do not match.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
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

  const updatePassword = (field, value) => {
    if (field === "password") setPassword(value);
    else setConfirmation(value);
    setErrors((current) => ({ ...current, [field]: "" }));
    setError("");
  };

  return (
    <AppicaAuthLayout><AppicaAuthCard kicker="Choose a new password" title="Secure your account" description={email ? `Resetting the password for ${email}.` : "Open the complete link from your reset email."} footer={<Link to="/login">Return to login</Link>}>
      <form className="flex flex-col gap-5" onSubmit={submit} noValidate>
        <AppicaAuthNotice tone={error ? "error" : "info"}>{error || message}</AppicaAuthNotice>
        <AppicaAuthField label="New password" error={errors.password}><AppicaPasswordInput value={password} onChange={(event) => updatePassword("password", event.target.value)} error={errors.password} placeholder="At least 6 characters" autoComplete="new-password" /></AppicaAuthField>
        <AppicaAuthField label="Confirm password" error={errors.confirmation}><AppicaPasswordInput value={confirmation} onChange={(event) => updatePassword("confirmation", event.target.value)} error={errors.confirmation} placeholder="Repeat your new password" autoComplete="new-password" /></AppicaAuthField>
        <AppicaSubmitButton loading={loading} loadingLabel="Resetting…" disabled={Boolean(message)}>Reset password</AppicaSubmitButton>
      </form>
    </AppicaAuthCard></AppicaAuthLayout>
  );
}

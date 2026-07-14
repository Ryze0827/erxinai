import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../api/auth";
import { persistAuthResponse } from "../api/session";
import { AuthCard, AuthLayout } from "./AuthLayout";
import { AuthField, AuthNotice, SubmitButton, TextInput } from "./AuthControls";
import { getErrorMessage } from "./authUtils";
import { TurnstileWidget } from "./TurnstileWidget";
import { usePublicSettings } from "./usePublicSettings";

function getRegisterData() {
  try {
    return JSON.parse(sessionStorage.getItem("register_data") || "null");
  } catch {
    return null;
  }
}

export function EmailVerifyPage() {
  const navigate = useNavigate();
  const data = useMemo(getRegisterData, []);
  const { settings, loading: settingsLoading, error: settingsError, retry } = usePublicSettings();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReset, setTurnstileReset] = useState(0);
  const [countdown, setCountdown] = useState(() => Math.max(0, Math.ceil(((data?.countdown_until || 0) - Date.now()) / 1000)));
  const handleTurnstileToken = useCallback((token) => setTurnstileToken(token), []);

  useEffect(() => {
    if (countdown <= 0) return undefined;
    const timer = window.setInterval(() => setCountdown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [countdown]);

  const handleVerify = async (event) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code) || !data) return setError("Enter the six-digit verification code.");
    setLoading(true);
    setError("");
    try {
      const response = await authApi.register({ ...data, countdown_until: undefined, verify_code: code });
      persistAuthResponse(response, true);
      sessionStorage.removeItem("register_data");
      navigate("/", { replace: true });
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Email verification failed."));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (!data || !settings || (settings.turnstile_enabled && !turnstileToken)) return;
    setSending(true);
    setError("");
    try {
      const response = await authApi.sendVerifyCode({ email: data.email, turnstile_token: turnstileToken || undefined });
      const nextCountdown = response.countdown || 60;
      setCountdown(nextCountdown);
      sessionStorage.setItem("register_data", JSON.stringify({ ...data, countdown_until: Date.now() + nextCountdown * 1000 }));
      setTurnstileToken("");
      setTurnstileReset((value) => value + 1);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "We couldn't resend the code."));
      setTurnstileToken("");
      setTurnstileReset((value) => value + 1);
    } finally {
      setSending(false);
    }
  };

  return (
    <AuthLayout>
      <AuthCard kicker="Verify your email" title="Check your inbox" description={data ? `We sent a six-digit code to ${data.email}.` : "Your registration session is missing or expired."} footer={<Link to="/register">Back to registration</Link>}>
        {!data ? <AuthNotice tone="error">Start registration again to request a new code.</AuthNotice> : (
          <form className="auth-form" onSubmit={handleVerify}>
            <AuthNotice tone={settingsError || error ? "error" : "info"}>{settingsError || error}</AuthNotice>
            {settingsError && <button className="auth-link-button" type="button" onClick={retry}>Retry loading settings</button>}
            <AuthField label="Verification code">
              <TextInput className="auth-code-input" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" autoFocus />
            </AuthField>
            <SubmitButton loading={loading} loadingLabel="Verifying…" disabled={code.length !== 6}>Verify and create account</SubmitButton>
            <TurnstileWidget enabled={settings?.turnstile_enabled && countdown === 0} siteKey={settings?.turnstile_site_key} onToken={handleTurnstileToken} resetKey={turnstileReset} />
            <button className="auth-link-button" type="button" onClick={resend} disabled={settingsLoading || Boolean(settingsError) || countdown > 0 || sending || (settings?.turnstile_enabled && !turnstileToken)}>{countdown > 0 ? `Resend in ${countdown}s` : sending ? "Sending…" : "Resend code"}</button>
          </form>
        )}
      </AuthCard>
    </AuthLayout>
  );
}

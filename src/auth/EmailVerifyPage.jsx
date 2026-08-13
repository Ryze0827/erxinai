import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { authApi } from "../api/auth";
import { persistAuthResponse } from "../api/session";
import { useLocale } from "../console/i18n";
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
  const { locale, t } = useLocale();
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
    setError("");
  }, [locale]);

  useEffect(() => {
    if (countdown <= 0) return undefined;
    const timer = window.setInterval(() => setCountdown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [countdown]);

  const handleVerify = async (event) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code) || !data) return setError(t("auth.verify.invalidCode"));
    setLoading(true);
    setError("");
    try {
      const response = await authApi.register({ ...data, countdown_until: undefined, verify_code: code });
      persistAuthResponse(response);
      sessionStorage.removeItem("register_data");
      navigate("/keys", { replace: true });
    } catch (requestError) {
      setError(getErrorMessage(requestError, t("auth.verify.failed"), t));
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
      setError(getErrorMessage(requestError, t("auth.verify.resendFailed"), t));
      setTurnstileToken("");
      setTurnstileReset((value) => value + 1);
    } finally {
      setSending(false);
    }
  };

  return (
    <AuthLayout>
      <AuthCard kicker={t("auth.verify.kicker")} title={t("auth.verify.title")} description={data ? t("auth.verify.description", { email: data.email }) : t("auth.verify.missingDescription")} footer={<Link to="/register">{t("auth.verify.backToRegistration")}</Link>}>
        {!data ? <AuthNotice tone="error">{t("auth.verify.restart")}</AuthNotice> : (
          <form className="auth-form" onSubmit={handleVerify}>
            <AuthNotice tone={settingsError || error ? "error" : "info"}>{settingsError || error}</AuthNotice>
            {settingsError && <button className="auth-link-button" type="button" onClick={retry}>{t("auth.common.retrySettings")}</button>}
            <AuthField label={t("auth.verify.code")}>
              <TextInput className="auth-code-input" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" autoFocus />
            </AuthField>
            <SubmitButton loading={loading} loadingLabel={t("auth.totp.verifying")} disabled={code.length !== 6}>{t("auth.verify.submit")}</SubmitButton>
            <TurnstileWidget enabled={settings?.turnstile_enabled && countdown === 0} siteKey={settings?.turnstile_site_key} onToken={handleTurnstileToken} resetKey={turnstileReset} />
            <button className="auth-link-button" type="button" onClick={resend} disabled={settingsLoading || Boolean(settingsError) || countdown > 0 || sending || (settings?.turnstile_enabled && !turnstileToken)}>{countdown > 0 ? t("auth.verify.resendIn", { seconds: countdown }) : sending ? t("auth.verify.sending") : t("auth.verify.resend")}</button>
          </form>
        )}
      </AuthCard>
    </AuthLayout>
  );
}

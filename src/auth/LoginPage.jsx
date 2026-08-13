import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useToastManager } from "@appica/ui-react/toast";
import { AlertTriangle } from "@appica/icons-react";
import { authApi } from "../api/auth";
import { persistAuthResponse } from "../api/session";
import { useConsole } from "../console/ConsoleContext";
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
  AppicaTotpForm,
} from "./AppicaAuth";
import { getErrorMessage, isEmail, safeAuthRedirect } from "./authUtils";
import { OAuthButtons } from "./OAuthButtons";
import { TurnstileWidget } from "./TurnstileWidget";
import { usePublicSettings } from "./usePublicSettings";

const AUTH_SETTINGS_TOAST_ID = "auth-settings-error";

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { notify } = useConsole();
  const { locale, t } = useLocale();
  const { add: addToast, close: closeToast } = useToastManager();
  const { settings, loading: settingsLoading, error: settingsError, retry } = usePublicSettings();
  const agreement = useAgreement(settings);
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [sessionExpired, setSessionExpired] = useState(() => Boolean(sessionStorage.getItem("auth_expired")));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReset, setTurnstileReset] = useState(0);
  const [totp, setTotp] = useState(null);
  const handleTurnstileToken = useCallback((token) => setTurnstileToken(token), []);

  useEffect(() => {
    setErrors({});
    setError("");
  }, [locale]);

  useEffect(() => {
    if (!settingsError) {
      closeToast(AUTH_SETTINGS_TOAST_ID);
      return undefined;
    }
    addToast({
      id: AUTH_SETTINGS_TOAST_ID,
      type: "warning",
      title: settingsError,
      timeout: 0,
      priority: "high",
      data: { icon: <AlertTriangle /> },
      actionProps: { children: t("auth.common.retrySettings"), onClick: retry },
    });
    return () => closeToast(AUTH_SETTINGS_TOAST_ID);
  }, [addToast, closeToast, retry, settingsError, t]);

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
    setSessionExpired(false);
    setError("");
  };

  const validate = () => {
    const nextErrors = {};
    if (!isEmail(form.email)) nextErrors.email = t("auth.error.emailInvalid");
    if (form.password.length < 6) nextErrors.password = t("auth.error.passwordMin");
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const completeLogin = (response) => {
    persistAuthResponse(response);
    sessionStorage.removeItem("auth_expired");
    navigate(safeAuthRedirect(searchParams.get("redirect")), { replace: true });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!settings) return;
    if (!validate() || !agreement.accepted) return;
    setSessionExpired(false);
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
      const message = getErrorMessage(requestError, t("auth.login.failed"), t);
      if (requestError?.reason === "INVALID_CREDENTIALS") {
        setError("");
        notify("error", message);
      } else {
        setError(message);
      }
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
      setError(getErrorMessage(requestError, t("auth.totp.failed"), t));
    } finally {
      setLoading(false);
    }
  };

  const displayedError = error || (sessionExpired ? t("auth.login.sessionExpired") : "");
  const footer = settings?.backend_mode_enabled ? null : <><span>{t("auth.login.newUser")}</span> <Link to="/register">{t("auth.login.createAccount")}</Link></>;

  return (
    <AppicaAuthLayout animatedLogo>
      <AppicaAuthCard kicker={t("auth.login.kicker")} title={t("auth.login.title")} description={t("auth.login.description")} footer={footer}>
        {totp ? (
          <AppicaTotpForm loading={loading} error={error} email={totp.user_email_masked} onSubmit={handleTotp} onCancel={() => { setTotp(null); setError(""); }} />
        ) : (
          <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
            <AppicaAuthNotice tone={displayedError ? "error" : "info"}>{displayedError}</AppicaAuthNotice>
            <AppicaAuthField label={t("auth.common.email")} error={errors.email}>
              <AppicaEmailInput type="email" value={form.email} onValueChange={(value) => updateForm("email", value)} error={errors.email} placeholder={t("auth.common.emailPlaceholder")} autoComplete="email" autoFocus />
            </AppicaAuthField>
            <AppicaAuthField label={t("auth.common.password")} error={errors.password}>
              <AppicaPasswordInput value={form.password} onChange={(event) => updateForm("password", event.target.value)} error={errors.password} placeholder={t("auth.login.passwordPlaceholder")} />
            </AppicaAuthField>
            <div className="flex justify-end">
              {settings?.password_reset_enabled && <Link className="outline-ring text-foreground-intense rounded-xs text-sm underline-offset-4 hover:underline" to="/forgot-password">{t("auth.login.forgotPassword")}</Link>}
            </div>
            <TurnstileWidget enabled={settings?.turnstile_enabled} siteKey={settings?.turnstile_site_key} onToken={handleTurnstileToken} resetKey={turnstileReset} />
            <AgreementPrompt agreement={agreement} />
            <AppicaSubmitButton loading={loading} loadingLabel={t("auth.login.submitting")} disabled={settingsLoading || Boolean(settingsError) || !agreement.accepted || (settings?.turnstile_enabled && !turnstileToken)}>{t("auth.login.submit")}</AppicaSubmitButton>
            {!settings?.backend_mode_enabled && <OAuthButtons settings={settings} searchParams={searchParams} onError={setError} />}
          </form>
        )}
      </AppicaAuthCard>
    </AppicaAuthLayout>
  );
}

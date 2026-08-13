import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { Button } from "@appica/ui-react/button";
import { authApi } from "../api/auth";
import { useLocale } from "../console/i18n";
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
  const { locale, t } = useLocale();
  const { settings, loading: settingsLoading, error: settingsError, retry } = usePublicSettings();
  const [email, setEmail] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [emailError, setEmailError] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [turnstileReset, setTurnstileReset] = useState(0);
  const handleToken = useCallback((token) => setTurnstileToken(token), []);

  useEffect(() => {
    setEmailError("");
    setError("");
    setMessage("");
  }, [locale]);

  const submit = async (event) => {
    event.preventDefault();
    if (!settings) return;
    if (!isEmail(email)) return setEmailError(t("auth.error.emailInvalid"));
    setLoading(true);
    setEmailError("");
    setError("");
    try {
      const response = await authApi.forgotPassword({ email: email.trim(), turnstile_token: turnstileToken || undefined });
      setMessage(response.message || t("auth.forgot.success"));
    } catch (requestError) {
      setError(getErrorMessage(requestError, t("auth.forgot.failed"), t));
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
    <AppicaAuthLayout><AppicaAuthCard kicker={t("auth.forgot.kicker")} title={t("auth.forgot.title")} description={t("auth.forgot.description")} footer={<Link to="/login">{t("auth.forgot.backToLogin")}</Link>}>
      <form className="flex flex-col gap-5" onSubmit={submit} noValidate>
        <AppicaAuthNotice tone={settingsError || error ? "error" : "info"}>{settingsError || error || message}</AppicaAuthNotice>
        {settingsError && <Button className="w-fit" variant="ghost" size="sm" type="button" onClick={retry}>{t("auth.common.retrySettings")}</Button>}
        <AppicaAuthField label={t("auth.common.email")} error={emailError}><AppicaEmailInput type="email" value={email} onValueChange={updateEmail} error={emailError} placeholder={t("auth.common.emailPlaceholder")} autoComplete="email" autoFocus /></AppicaAuthField>
        <TurnstileWidget enabled={settings?.turnstile_enabled} siteKey={settings?.turnstile_site_key} onToken={handleToken} resetKey={turnstileReset} />
        <AppicaSubmitButton loading={loading} loadingLabel={t("auth.forgot.submitting")} disabled={Boolean(message) || settingsLoading || Boolean(settingsError) || settings?.password_reset_enabled === false || (settings?.turnstile_enabled && !turnstileToken)}>{t("auth.forgot.submit")}</AppicaSubmitButton>
      </form>
    </AppicaAuthCard></AppicaAuthLayout>
  );
}

export function ResetPasswordPage() {
  const { locale, t } = useLocale();
  const [{ email, token }, setResetContext] = useState(takeResetContext);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setErrors({});
    setError("");
    setMessage("");
  }, [locale]);

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
    if (!email || !token) return setError(t("auth.reset.incompleteLink"));
    const nextErrors = {};
    if (password.length < 6) nextErrors.password = t("auth.error.passwordMin");
    if (password !== confirmation) nextErrors.confirmation = t("auth.reset.passwordMismatch");
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setLoading(true);
    setError("");
    try {
      const response = await authApi.resetPassword({ email, token, new_password: password });
      setMessage(response.message || t("auth.reset.success"));
    } catch (requestError) {
      setError(getErrorMessage(requestError, t("auth.reset.failed"), t));
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
    <AppicaAuthLayout><AppicaAuthCard kicker={t("auth.reset.kicker")} title={t("auth.reset.title")} description={email ? t("auth.reset.descriptionForEmail", { email }) : t("auth.reset.description")} footer={<Link to="/login">{t("auth.reset.returnToLogin")}</Link>}>
      <form className="flex flex-col gap-5" onSubmit={submit} noValidate>
        <AppicaAuthNotice tone={error ? "error" : "info"}>{error || message}</AppicaAuthNotice>
        <AppicaAuthField label={t("auth.reset.newPassword")} error={errors.password}><AppicaPasswordInput value={password} onChange={(event) => updatePassword("password", event.target.value)} error={errors.password} placeholder={t("auth.reset.passwordPlaceholder")} autoComplete="new-password" /></AppicaAuthField>
        <AppicaAuthField label={t("auth.reset.confirmPassword")} error={errors.confirmation}><AppicaPasswordInput value={confirmation} onChange={(event) => updatePassword("confirmation", event.target.value)} error={errors.confirmation} placeholder={t("auth.reset.confirmationPlaceholder")} autoComplete="new-password" /></AppicaAuthField>
        <AppicaSubmitButton loading={loading} loadingLabel={t("auth.reset.submitting")} disabled={Boolean(message)}>{t("auth.reset.submit")}</AppicaSubmitButton>
      </form>
    </AppicaAuthCard></AppicaAuthLayout>
  );
}

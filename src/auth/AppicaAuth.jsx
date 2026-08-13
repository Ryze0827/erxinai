import { useState } from "react";
import { Link } from "react-router";
import { Alert } from "@appica/ui-react/alert";
import { AlertDescription } from "@appica/ui-react/alert";
import { AlertIcon } from "@appica/ui-react/alert";
import { Autocomplete } from "@appica/ui-react/autocomplete";
import { AutocompleteContent } from "@appica/ui-react/autocomplete";
import { AutocompleteInput } from "@appica/ui-react/autocomplete";
import { AutocompleteItem } from "@appica/ui-react/autocomplete";
import { AutocompleteList } from "@appica/ui-react/autocomplete";
import { BackgroundPattern } from "@appica/ui-react/background-pattern";
import { Badge } from "@appica/ui-react/badge";
import { Button } from "@appica/ui-react/button";
import { buttonVariants } from "@appica/ui-react/button";
import { Card } from "@appica/ui-react/card";
import { CardDescription } from "@appica/ui-react/card";
import { CardFooter } from "@appica/ui-react/card";
import { CardHeader } from "@appica/ui-react/card";
import { CardTitle } from "@appica/ui-react/card";
import { Field } from "@appica/ui-react/field";
import { FieldDescription } from "@appica/ui-react/field";
import { FieldError } from "@appica/ui-react/field";
import { FieldLabel } from "@appica/ui-react/field";
import { Input } from "@appica/ui-react/input";
import { Spinner } from "@appica/ui-react/spinner";
import { Toaster } from "@appica/ui-react/toast";
import {
  AlertTriangle,
  ArrowLeft,
  Eye,
  EyeOff,
  InfoCircle,
  Key,
  Language,
  Lock,
  Mail,
} from "@appica/icons-react";
import { BrandLogo } from "../BrandLogo";
import { useConsole } from "../console/ConsoleContext";
import { useLocale } from "../console/i18n";

const COMMON_EMAIL_DOMAINS = [
  "gmail.com",
  "outlook.com",
  "icloud.com",
  "qq.com",
  "163.com",
  "126.com",
  "hotmail.com",
  "yahoo.com",
  "foxmail.com",
];

function getEmailSuggestions(value) {
  if (!value || value !== value.trim() || /\s/.test(value)) return [];

  const parts = value.split("@");
  if (parts.length > 2 || !parts[0]) return [];

  const [localPart, domainQuery = ""] = parts;
  const normalizedQuery = domainQuery.toLowerCase();

  return COMMON_EMAIL_DOMAINS
    .filter((domain) => domain.startsWith(normalizedQuery))
    .map((domain) => `${localPart}@${domain}`)
    .filter((suggestion) => suggestion.toLowerCase() !== value.toLowerCase());
}

export function AppicaAuthLayout({ children }) {
  const { branding } = useConsole();
  const { locale, setLocale, t } = useLocale();
  const siteName = branding?.siteName || "WayX";

  return (
    <main className="appica-auth bg-background text-foreground relative min-h-svh overflow-hidden">
      <BackgroundPattern className="pointer-events-none absolute inset-0 opacity-60" variant="dots" spotlight={{ persistent: true }} />
      <header className="relative z-1 mx-auto flex h-18 max-w-7xl items-center justify-between px-4 md:px-6">
        <Link className="outline-ring flex items-center gap-2 rounded-sm" to="/" aria-label={t("auth.common.siteHome", { siteName })}>
          <BrandLogo className="size-8" alt="" width="32" height="32" />
          <span className="text-foreground-intense text-lg font-semibold">{siteName}</span>
        </Link>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" type="button" aria-label={t("nav.switchLanguage")} title={t("nav.switchLanguage")} onClick={() => setLocale(locale === "en" ? "zh" : "en")}><Language /><span>{t("nav.language")}</span></Button>
          <Link className={buttonVariants({ variant: "ghost", size: "sm" })} to="/"><ArrowLeft data-icon="start" />{t("auth.common.backHome")}</Link>
        </div>
      </header>

      <div className="relative z-1 mx-auto flex min-h-[calc(100svh-4.5rem)] max-w-7xl items-center justify-center px-4 py-10 md:px-6 lg:py-16">
        <section className="w-full max-w-lg" aria-label={t("auth.common.accountAccess")}>
          {children}
        </section>
      </div>
      <Toaster position="bottom-right" progress timeout={4200} />
    </main>
  );
}

export function AppicaAuthCard({ kicker, title, description, children, footer }) {
  return (
    <Card className="shadow-lg" frame="solid" inset={false} contentProps={{ className: "p-6 sm:p-8" }}>
      <CardHeader className="p-0">
        <Badge className="w-fit" variant="soft">{kicker}</Badge>
        <CardTitle className="mt-4 text-3xl">{title}</CardTitle>
        {description && <CardDescription className="mt-2 leading-6">{description}</CardDescription>}
      </CardHeader>
      <div className="mt-7">{children}</div>
      {footer && <CardFooter className="text-foreground-muted mt-6 flex-row! items-center! justify-center gap-1 px-0 pb-0 text-sm **:a:text-foreground-intense **:a:underline **:a:underline-offset-4">{footer}</CardFooter>}
    </Card>
  );
}

export function AppicaAuthField({ label, error, hint, children }) {
  return (
    <Field className="flex flex-col gap-2" invalid={Boolean(error)}>
      <FieldLabel>{label}</FieldLabel>
      {children}
      {hint && <FieldDescription>{hint}</FieldDescription>}
      {error && <FieldError match>{error}</FieldError>}
    </Field>
  );
}

export function AppicaTextInput({ error, action, startSlot, ...props }) {
  return <Input {...props} aria-invalid={Boolean(error)} inputSize="lg" startSlot={startSlot} endSlot={action} />;
}

export function AppicaEmailInput({ value, onValueChange, error, ...props }) {
  const [open, setOpen] = useState(false);
  const suggestions = getEmailSuggestions(value);
  const handleValueChange = (nextValue, details) => {
    onValueChange?.(nextValue, details);
    setOpen(getEmailSuggestions(nextValue).length > 0);
  };

  return (
    <Autocomplete items={suggestions} value={value} onValueChange={handleValueChange} open={open && suggestions.length > 0} onOpenChange={(nextOpen) => setOpen(nextOpen && suggestions.length > 0)} size="lg" limit={6} openOnInputClick>
      <AutocompleteInput {...props} aria-invalid={Boolean(error)} startSlot={<Mail />} />
      {suggestions.length > 0 && (
        <AutocompleteContent>
          <AutocompleteList>
            {(suggestion) => <AutocompleteItem key={suggestion} value={suggestion}>{suggestion}</AutocompleteItem>}
          </AutocompleteList>
        </AutocompleteContent>
      )}
    </Autocomplete>
  );
}

export function AppicaPasswordInput({ value, onChange, error, autoComplete = "current-password", placeholder }) {
  const [visible, setVisible] = useState(false);
  const { t } = useLocale();
  const label = t(visible ? "auth.common.hidePassword" : "auth.common.showPassword");
  return (
    <AppicaTextInput
      type={visible ? "text" : "password"}
      value={value}
      onChange={onChange}
      error={error}
      placeholder={placeholder}
      autoComplete={autoComplete}
      startSlot={<Lock />}
      action={<Button type="button" variant="ghost" size="icon-sm" aria-label={label} aria-pressed={visible} onClick={() => setVisible((current) => !current)}>{visible ? <EyeOff /> : <Eye />}</Button>}
    />
  );
}

export function AppicaSubmitButton({ loading, children, loadingLabel, disabled }) {
  const { t } = useLocale();
  return (
    <Button className="w-full" type="submit" size="lg" variant="primary" disabled={loading || disabled}>
      {loading && <Spinner currentColor aria-label={t("auth.common.loading")} />}
      {loading ? loadingLabel || t("auth.common.working") : children}
    </Button>
  );
}

export function AppicaAuthNotice({ children, tone = "info" }) {
  if (!children) return null;
  const error = tone === "error";
  return (
    <Alert className="items-center [grid-template-columns:auto_1fr] [grid-template-areas:'icon_description']" variant={error ? "error" : "info"} role={error ? "alert" : "status"}>
      <AlertIcon className="self-center">{error ? <AlertTriangle /> : <InfoCircle />}</AlertIcon>
      <AlertDescription className="mt-0">{children}</AlertDescription>
    </Alert>
  );
}

export function AppicaTotpForm({ loading, error, email, onSubmit, onCancel }) {
  const { t } = useLocale();
  const [code, setCode] = useState("");
  const handleSubmit = (event) => {
    event.preventDefault();
    if (/^\d{6}$/.test(code)) onSubmit(code);
  };
  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
      <AppicaAuthNotice>{email ? t("auth.totp.descriptionForEmail", { email }) : t("auth.totp.description")}</AppicaAuthNotice>
      <AppicaAuthField label={t("auth.totp.code")} error={error}>
        <AppicaTextInput value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" startSlot={<Key />} />
      </AppicaAuthField>
      <AppicaSubmitButton loading={loading} loadingLabel={t("auth.totp.verifying")} disabled={code.length !== 6}>{t("auth.totp.verify")}</AppicaSubmitButton>
      {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>{t("auth.totp.cancel")}</Button>}
    </form>
  );
}

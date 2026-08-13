import { useState } from "react";
import { Link } from "react-router";
import { Alert } from "@appica/ui-react/alert";
import { AlertDescription } from "@appica/ui-react/alert";
import { AlertIcon } from "@appica/ui-react/alert";
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
import {
  AlertTriangle,
  ArrowLeft,
  Eye,
  EyeOff,
  InfoCircle,
  Key,
  Lock,
  Mail,
} from "@appica/icons-react";
import { DEFAULT_SITE_LOGO } from "../branding";
import { useConsole } from "../console/ConsoleContext";

export function AppicaAuthLayout({ children }) {
  const { branding } = useConsole();
  const siteName = branding?.siteName || "WayX";

  return (
    <main className="bg-background text-foreground relative min-h-svh overflow-hidden">
      <BackgroundPattern className="pointer-events-none absolute inset-0 opacity-60" variant="dots" spotlight={{ persistent: true }} />
      <header className="relative z-1 mx-auto flex h-18 max-w-7xl items-center justify-between px-4 md:px-6">
        <Link className="outline-ring flex items-center gap-2 rounded-sm" to="/" aria-label={`${siteName} home`}>
          <img className="size-8" src={DEFAULT_SITE_LOGO} alt="" width="32" height="32" />
          <span className="text-foreground-intense text-lg font-semibold">{siteName}</span>
        </Link>
        <Link className={buttonVariants({ variant: "ghost", size: "sm" })} to="/"><ArrowLeft data-icon="start" />Back to home</Link>
      </header>

      <div className="relative z-1 mx-auto flex min-h-[calc(100svh-4.5rem)] max-w-7xl items-center justify-center px-4 py-10 md:px-6 lg:py-16">
        <section className="w-full max-w-lg" aria-label="Account access">
          {children}
        </section>
      </div>
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

export function AppicaEmailInput(props) {
  return <AppicaTextInput {...props} startSlot={<Mail />} />;
}

export function AppicaPasswordInput({ value, onChange, error, autoComplete = "current-password", placeholder }) {
  const [visible, setVisible] = useState(false);
  const label = visible ? "Hide password" : "Show password";
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

export function AppicaSubmitButton({ loading, children, loadingLabel = "Working…", disabled }) {
  return (
    <Button className="w-full" type="submit" size="lg" variant="primary" disabled={loading || disabled}>
      {loading && <Spinner currentColor aria-label="Loading" />}
      {loading ? loadingLabel : children}
    </Button>
  );
}

export function AppicaAuthNotice({ children, tone = "info" }) {
  if (!children) return null;
  const error = tone === "error";
  return (
    <Alert variant={error ? "error" : "info"} role={error ? "alert" : "status"}>
      <AlertIcon>{error ? <AlertTriangle /> : <InfoCircle />}</AlertIcon>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}

export function AppicaTotpForm({ loading, error, email, onSubmit, onCancel }) {
  const [code, setCode] = useState("");
  const handleSubmit = (event) => {
    event.preventDefault();
    if (/^\d{6}$/.test(code)) onSubmit(code);
  };
  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
      <AppicaAuthNotice>Enter the six-digit code from your authenticator{email ? ` for ${email}` : ""}.</AppicaAuthNotice>
      <AppicaAuthField label="Authentication code" error={error}>
        <AppicaTextInput value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" startSlot={<Key />} />
      </AppicaAuthField>
      <AppicaSubmitButton loading={loading} loadingLabel="Verifying…" disabled={code.length !== 6}>Verify code</AppicaSubmitButton>
      {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancel and return</Button>}
    </form>
  );
}

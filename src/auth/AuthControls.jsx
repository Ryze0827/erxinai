import { useState } from "react";

export function AuthField({ label, error, hint, children }) {
  return (
    <label className="auth-field">
      <span>{label}</span>
      {children}
      {hint && <small className="auth-field-hint">{hint}</small>}
      {error && <em className="auth-field-error">{error}</em>}
    </label>
  );
}
export function TextInput({ error, action, ...props }) {
  return (
    <div className={`auth-input-shell ${error ? "has-error" : ""}`}>
      <input {...props} />
      {action}
    </div>
  );
}

export function PasswordInput({ value, onChange, error, autoComplete = "current-password", placeholder }) {
  const [visible, setVisible] = useState(false);
  const action = <button type="button" onClick={() => setVisible((current) => !current)}>{visible ? "Hide" : "Show"}</button>;
  return (
    <TextInput
      type={visible ? "text" : "password"}
      value={value}
      onChange={onChange}
      error={error}
      placeholder={placeholder}
      autoComplete={autoComplete}
      action={action}
    />
  );
}

export function SubmitButton({ loading, children, loadingLabel = "Working…", disabled }) {
  return (
    <button className="auth-submit" type="submit" disabled={loading || disabled}>
      <span>{loading ? loadingLabel : children}</span>
      <i aria-hidden="true" />
    </button>
  );
}

export function AuthNotice({ children, tone = "info" }) {
  if (!children) return null;
  return <div className="auth-notice" data-tone={tone} role={tone === "error" ? "alert" : "status"}>{children}</div>;
}

export function TotpForm({ loading, error, email, onSubmit, onCancel }) {
  const [code, setCode] = useState("");
  const handleSubmit = (event) => {
    event.preventDefault();
    if (/^\d{6}$/.test(code)) onSubmit(code);
  };
  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <AuthNotice>Enter the six-digit code from your authenticator{email ? ` for ${email}` : ""}.</AuthNotice>
      <AuthField label="Authentication code" error={error}>
        <TextInput value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" />
      </AuthField>
      <SubmitButton loading={loading} loadingLabel="Verifying…" disabled={code.length !== 6}>Verify code</SubmitButton>
      {onCancel && <button className="auth-link-button" type="button" onClick={onCancel}>Cancel and return</button>}
    </form>
  );
}

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

function PasswordVisibilityIcon({ visible }) {
  const path = visible
    ? "M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
    : "M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z";
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={path} /></svg>;
}

export function PasswordInput({ value, onChange, error, autoComplete = "current-password", placeholder }) {
  const [visible, setVisible] = useState(false);
  const label = visible ? "Hide password" : "Show password";
  const action = (
    <button className="auth-password-toggle" type="button" aria-label={label} aria-pressed={visible} title={label} onClick={() => setVisible((current) => !current)}>
      <PasswordVisibilityIcon visible={visible} />
    </button>
  );
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

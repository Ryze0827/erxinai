import { useEffect, useMemo, useRef, useState } from "react";
import "./auth.css";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthPage({ initialMode = "login" }) {
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({ email: "", password: "", invite: "", promo: "" });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showExtras, setShowExtras] = useState(false);
  const [agreement, setAgreement] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [notice, setNotice] = useState("");
  const cardRef = useRef(null);
  const timerRef = useRef(null);

  const passwordStrength = useMemo(() => {
    const value = form.password;
    if (!value) return 0;
    return [value.length >= 8, /[a-z]/i.test(value), /\d/.test(value), /[^a-z0-9]/i.test(value)].filter(Boolean).length;
  }, [form.password]);

  useEffect(() => {
    const handlePopState = () => setMode(window.location.pathname === "/register" ? "register" : "login");
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.clearTimeout(timerRef.current);
    };
  }, []);

  const changeMode = (nextMode) => {
    if (nextMode === mode) return;
    setMode(nextMode);
    setErrors({});
    setResult("");
    setNotice("");
    setShowExtras(false);
    window.history.pushState({}, "", nextMode === "register" ? "/register" : "/login");
  };

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
    setResult("");
  };

  const validate = () => {
    const nextErrors = {};
    if (!emailPattern.test(form.email.trim())) nextErrors.email = "Enter a valid email address.";
    if (mode === "login" && form.password.length < 6) nextErrors.password = "Password must be at least 6 characters.";
    if (mode === "register" && (form.password.length < 8 || !/[a-z]/i.test(form.password) || !/\d/.test(form.password))) {
      nextErrors.password = "Use 8+ characters with at least one letter and one number.";
    }
    if (mode === "register" && !agreement) nextErrors.agreement = "Please accept the terms to continue.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setNotice("");
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setLoading(false);
      setResult(mode === "login" ? "signed-in" : "registered");
    }, 950);
  };

  const handlePointerMove = (event) => {
    const card = cardRef.current;
    if (!card || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    card.style.setProperty("--auth-rx", `${(0.5 - y) * 2.2}deg`);
    card.style.setProperty("--auth-ry", `${(x - 0.5) * 2.2}deg`);
    card.style.setProperty("--auth-mx", `${x * 100}%`);
    card.style.setProperty("--auth-my", `${y * 100}%`);
  };

  const resetTilt = () => {
    const card = cardRef.current;
    if (!card) return;
    card.style.setProperty("--auth-rx", "0deg");
    card.style.setProperty("--auth-ry", "0deg");
  };

  return (
    <main className="auth-page">
      <div className="auth-scene" aria-hidden="true" />
      <header className="auth-topbar">
        <a className="auth-brand" href="/" aria-label="Sentence AI home">
          <img src="/assets/img/ap_icon-20260711.png" alt="" width="32" height="32" />
          <span>Sentence AI</span>
        </a>
        <a className="auth-home-link" href="/">Back to home</a>
      </header>

      <div className="auth-stage">
        <section className="auth-intro" aria-labelledby="auth-intro-title">
          <span className="auth-eyebrow">One account · Every model</span>
          <h1 id="auth-intro-title">Your gateway,<br /><em>ready when you are.</em></h1>
          <p>Manage keys, usage, billing, and every provider route from one calm workspace.</p>
          <div className="auth-trust-card">
            <span><b>38</b> models online</span>
            <span><b>99.99%</b> gateway uptime</span>
            <span><b>&lt; 1s</b> median latency</span>
          </div>
        </section>

        <section className="auth-card-wrap" aria-label="Account access">
          <div
            className="auth-card"
            ref={cardRef}
            onPointerMove={handlePointerMove}
            onPointerLeave={resetTilt}
          >
            <div className="auth-card-shine" aria-hidden="true" />
            <div className="auth-heading" key={mode}>
              <span className="auth-heading-kicker">{mode === "login" ? "Welcome back" : "Start building"}</span>
              <h2>{mode === "login" ? "Log in to Sentence AI" : "Create your Sentence AI account"}</h2>
              <p>{mode === "login" ? "Pick up exactly where your last request left off." : "One account for every key, model, and project."}</p>
            </div>

            {result ? (
              <div className="auth-result" role="status">
                <div className="auth-result-mark" aria-hidden="true">Done</div>
                <h3>{result === "signed-in" ? "You're signed in." : "Your account is ready."}</h3>
                <p>{result === "signed-in" ? "Taking you to your developer workspace…" : "Check your inbox to verify your email and finish setup."}</p>
                <button type="button" className="auth-secondary-button" onClick={() => setResult("")}>Return to form</button>
              </div>
            ) : (
              <form className="auth-form" onSubmit={handleSubmit} noValidate>
                <label className="auth-field">
                  <span>Email address</span>
                  <div className={`auth-input-shell ${errors.email ? "has-error" : ""}`}>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(event) => updateField("email", event.target.value)}
                      placeholder="you@company.com"
                      autoComplete="email"
                      autoFocus
                    />
                    {emailPattern.test(form.email.trim()) && <small>Ready</small>}
                  </div>
                  {errors.email && <em className="auth-field-error">{errors.email}</em>}
                </label>

                <label className="auth-field">
                  <span>Password</span>
                  <div className={`auth-input-shell ${errors.password ? "has-error" : ""}`}>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(event) => updateField("password", event.target.value)}
                      placeholder={mode === "login" ? "Enter your password" : "Create a secure password"}
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                    />
                    <button type="button" onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? "Hide" : "Show"}</button>
                  </div>
                  {mode === "register" && (
                    <div className="auth-strength" aria-label={`Password strength ${passwordStrength} of 4`}>
                      {[1, 2, 3, 4].map((step) => <i key={step} data-active={passwordStrength >= step} />)}
                      <span>{passwordStrength < 2 ? "Keep going" : passwordStrength < 4 ? "Good password" : "Strong password"}</span>
                    </div>
                  )}
                  {errors.password && <em className="auth-field-error">{errors.password}</em>}
                </label>

                {mode === "login" ? (
                  <div className="auth-form-row">
                    <label className="auth-checkbox"><input type="checkbox" /><span>Keep me signed in</span></label>
                    <button type="button" className="auth-text-button" onClick={() => setNotice("We'll send a secure reset link to the email above.")}>Forgot password?</button>
                  </div>
                ) : (
                  <>
                    <button type="button" className="auth-extras-toggle" aria-expanded={showExtras} onClick={() => setShowExtras((visible) => !visible)}>
                      <span>Have an invite or promo code?</span><b>{showExtras ? "Hide" : "Add"}</b>
                    </button>
                    <div className="auth-extras" data-open={showExtras} aria-hidden={!showExtras}>
                      <label className="auth-field"><span>Invitation code</span><div className="auth-input-shell"><input type="text" value={form.invite} onChange={(event) => updateField("invite", event.target.value)} placeholder="Optional invitation code" disabled={!showExtras} tabIndex={showExtras ? 0 : -1} /></div></label>
                      <label className="auth-field"><span>Promo code</span><div className="auth-input-shell"><input type="text" value={form.promo} onChange={(event) => updateField("promo", event.target.value)} placeholder="Optional promo code" disabled={!showExtras} tabIndex={showExtras ? 0 : -1} /></div></label>
                    </div>
                    <label className="auth-checkbox auth-agreement">
                      <input type="checkbox" checked={agreement} onChange={(event) => { setAgreement(event.target.checked); setErrors((current) => ({ ...current, agreement: "" })); }} />
                      <span>I agree to the Terms of Service and Privacy Policy.</span>
                    </label>
                    {errors.agreement && <em className="auth-field-error auth-agreement-error">{errors.agreement}</em>}
                  </>
                )}

                {notice && <div className="auth-notice" role="status">{notice}</div>}

                <button className="auth-submit" type="submit" disabled={loading}>
                  <span>{loading ? (mode === "login" ? "Signing in…" : "Creating account…") : (mode === "login" ? "Log in" : "Create account")}</span>
                  <i aria-hidden="true" />
                </button>
              </form>
            )}

            {!result && (
              <p className="auth-card-footer">
                {mode === "login" ? "New to Sentence AI?" : "Already have an account?"}
                <button type="button" onClick={() => changeMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "Create an account" : "Log in"}</button>
              </p>
            )}
          </div>
          <p className="auth-security-note">Encrypted in transit · Keys never shown in full · Session protected</p>
        </section>
      </div>
    </main>
  );
}

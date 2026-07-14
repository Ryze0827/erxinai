import { useRef } from "react";
import { Link } from "react-router-dom";
import "../auth.css";

export function AuthLayout({ children }) {
  return (
    <main className="auth-page">
      <div className="auth-scene" aria-hidden="true" />
      <header className="auth-topbar">
        <Link className="auth-brand" to="/" aria-label="Sentence AI home">
          <img src="/assets/img/sentence-ai-icon.png" alt="" width="32" height="32" />
          <span>Sentence AI</span>
        </Link>
        <Link className="auth-home-link" to="/">Back to home</Link>
      </header>
      <div className="auth-stage">
        <AuthIntro />
        <section className="auth-card-wrap" aria-label="Account access">
          {children}
          <p className="auth-security-note">Encrypted in transit · Keys never shown in full · Session protected</p>
        </section>
      </div>
    </main>
  );
}
function AuthIntro() {
  return (
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
  );
}

export function AuthCard({ kicker, title, description, children, footer }) {
  const cardRef = useRef(null);

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
    cardRef.current?.style.setProperty("--auth-rx", "0deg");
    cardRef.current?.style.setProperty("--auth-ry", "0deg");
  };

  return (
    <div className="auth-card" ref={cardRef} onPointerMove={handlePointerMove} onPointerLeave={resetTilt}>
      <div className="auth-card-shine" aria-hidden="true" />
      <div className="auth-heading">
        <span className="auth-heading-kicker">{kicker}</span>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {children}
      {footer && <div className="auth-card-footer">{footer}</div>}
    </div>
  );
}

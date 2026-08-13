import { useRef } from "react";
import { Link } from "react-router";
import { BrandLogo } from "../BrandLogo";
import { useConsole } from "../console/ConsoleContext";
import { useLocale } from "../console/i18n";
import "../auth.css";

export function AuthLayout({ children, surface }) {
  const { branding, brandingReady } = useConsole();
  const { t } = useLocale();
  const siteName = branding?.siteName || "WayX";
  return (
    <main className={`auth-page${surface ? ` auth-page--${surface}` : ""}`}>
      <div className="auth-scene" aria-hidden="true" />
      <header className="auth-topbar">
        <Link className="auth-brand" to="/" aria-label={t("auth.common.siteHome", { siteName })}>
          {brandingReady && <BrandLogo key={branding.siteLogo} src={branding.siteLogo} alt="" width="32" height="32" />}
          <span>{siteName}</span>
        </Link>
        <Link className="auth-home-link" to="/">{t("auth.common.backHome")}</Link>
      </header>
      <div className="auth-stage">
        <AuthIntro />
        <section className="auth-card-wrap" aria-label={t("auth.common.accountAccess")}>
          {children}
          <p className="auth-security-note">{t("auth.legacy.securityNote")}</p>
        </section>
      </div>
    </main>
  );
}
function AuthIntro() {
  const { t } = useLocale();
  return (
    <section className="auth-intro" aria-labelledby="auth-intro-title">
      <span className="auth-eyebrow">{t("auth.legacy.eyebrow")}</span>
      <h1 id="auth-intro-title">{t("auth.legacy.titleStart")}<br /><em>{t("auth.legacy.titleEmphasis")}</em></h1>
      <p>{t("auth.legacy.description")}</p>
      <div className="auth-trust-card">
        <span><b>38</b> {t("auth.legacy.modelsOnline")}</span>
        <span><b>99.99%</b> {t("auth.legacy.gatewayUptime")}</span>
        <span><b>&lt; 1s</b> {t("auth.legacy.medianLatency")}</span>
      </div>
    </section>
  );
}

export function AuthCard({ kicker, title, description, children, footer, interactive = true }) {
  const cardRef = useRef(null);

  const handlePointerMove = (event) => {
    const card = cardRef.current;
    if (!interactive || !card || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
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
    <div className={`auth-card${interactive ? "" : " auth-card--static"}`} ref={cardRef} onPointerMove={interactive ? handlePointerMove : undefined} onPointerLeave={interactive ? resetTilt : undefined}>
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

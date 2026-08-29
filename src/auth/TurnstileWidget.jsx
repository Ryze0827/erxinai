import { useEffect, useRef, useState } from "react";
import { useLocale } from "../console/i18n";

let scriptPromise = null;

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.turnstile) resolve(window.turnstile);
      else {
        scriptPromise = null;
        reject(new Error("auth.error.securityUnavailable"));
      }
    };
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("auth.error.securityLoadFailed"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export function TurnstileWidget({ enabled, siteKey, onToken, resetKey = 0 }) {
  const { t } = useLocale();
  const containerRef = useRef(null);
  const widgetRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!enabled || !siteKey) return undefined;
    let active = true;
    setError("");
    loadTurnstile().then((turnstile) => {
      if (!active || !containerRef.current) return;
      widgetRef.current = turnstile.render(containerRef.current, {
        sitekey: siteKey,
        size: "flexible",
        callback: (token) => onToken(token),
        "expired-callback": () => onToken(""),
        "error-callback": () => {
          onToken("");
          setError("auth.error.securityFailed");
        },
      });
    }).catch((loadError) => setError(loadError.message));
    return () => {
      active = false;
      if (widgetRef.current !== null && window.turnstile) window.turnstile.remove(widgetRef.current);
    };
  }, [enabled, onToken, resetKey, siteKey]);

  if (!enabled) return null;
  if (!siteKey) return <div className="flex flex-col gap-2"><p className="text-error-emphasis text-sm" role="alert">{t("auth.error.securityNotConfigured")}</p></div>;
  return <div className="flex flex-col gap-2"><div ref={containerRef} />{error && <p className="text-error-emphasis text-sm" role="alert">{t(error)}</p>}</div>;
}

import { useEffect, useRef, useState } from "react";

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
        reject(new Error("Security verification is unavailable."));
      }
    };
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Security verification failed to load."));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export function TurnstileWidget({ enabled, siteKey, onToken, resetKey = 0 }) {
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
          setError("Security verification failed. Please try again.");
        },
      });
    }).catch((loadError) => setError(loadError.message));
    return () => {
      active = false;
      if (widgetRef.current !== null && window.turnstile) window.turnstile.remove(widgetRef.current);
    };
  }, [enabled, onToken, resetKey, siteKey]);

  if (!enabled) return null;
  if (!siteKey) return <div className="auth-turnstile"><em className="auth-field-error">Security verification is not configured.</em></div>;
  return <div className="auth-turnstile"><div ref={containerRef} />{error && <em className="auth-field-error">{error}</em>}</div>;
}

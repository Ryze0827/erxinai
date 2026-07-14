import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";

const AGREEMENT_KEY = "sub2api_login_agreement_consent";

function getRevision(settings, documents) {
  if (settings?.login_agreement_revision) return settings.login_agreement_revision;
  return `${settings?.login_agreement_updated_at || ""}:${documents.map((doc) => `${doc.id}:${doc.title}`).join("|")}`;
}

function hasStoredConsent(revision) {
  try {
    return JSON.parse(localStorage.getItem(AGREEMENT_KEY) || "null")?.revision === revision;
  } catch {
    return false;
  }
}

export function useAgreement(settings) {
  const documents = useMemo(() => settings?.login_agreement_documents?.filter((doc) => doc.title) || [], [settings]);
  const enabled = settings?.login_agreement_enabled === true && documents.length > 0;
  const revision = getRevision(settings, documents);
  const [accepted, setAccepted] = useState(!enabled);

  useEffect(() => {
    setAccepted(!enabled || hasStoredConsent(revision));
  }, [enabled, revision]);

  const accept = () => {
    localStorage.setItem(AGREEMENT_KEY, JSON.stringify({ revision, accepted_at: new Date().toISOString() }));
    setAccepted(true);
  };

  return { accepted, accept, documents, enabled };
}

export function AgreementPrompt({ agreement }) {
  const [open, setOpen] = useState(false);
  if (!agreement.enabled) return null;
  return (
    <>
      <label className="auth-checkbox auth-agreement">
        <input type="checkbox" checked={agreement.accepted} onChange={(event) => event.target.checked && agreement.accept()} />
        <span>I have read and accept the <button className="auth-inline-button" type="button" onClick={(event) => { event.preventDefault(); setOpen(true); }}>login agreement</button>.</span>
      </label>
      {open && (
        <div className="auth-modal-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
          <section className="auth-modal" role="dialog" aria-modal="true" aria-label="Login agreement" onMouseDown={(event) => event.stopPropagation()}>
            <div className="auth-modal-header"><h3>Login agreement</h3><button type="button" onClick={() => setOpen(false)}>Close</button></div>
            <div className="auth-legal-content">
              {agreement.documents.map((document) => <article key={document.id || document.title}><h4>{document.title}</h4><ReactMarkdown>{document.content_md || ""}</ReactMarkdown></article>)}
            </div>
            <button className="auth-submit" type="button" onClick={() => { agreement.accept(); setOpen(false); }}><span>Accept and continue</span><i aria-hidden="true" /></button>
          </section>
        </div>
      )}
    </>
  );
}

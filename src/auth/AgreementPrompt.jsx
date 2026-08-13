import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@appica/ui-react/button";
import { Checkbox } from "@appica/ui-react/checkbox";
import { Dialog } from "@appica/ui-react/dialog";
import { DialogBody } from "@appica/ui-react/dialog";
import { DialogContent } from "@appica/ui-react/dialog";
import { DialogDescription } from "@appica/ui-react/dialog";
import { DialogFooter } from "@appica/ui-react/dialog";
import { DialogHeader } from "@appica/ui-react/dialog";
import { DialogTitle } from "@appica/ui-react/dialog";
import { useLocale } from "../console/i18n";

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
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  if (!agreement.enabled) return null;
  return (
    <>
      <div className="text-foreground-muted flex items-start gap-3 text-sm leading-6">
        <Checkbox className="mt-1 shrink-0" checked={agreement.accepted} onCheckedChange={(checked) => checked && agreement.accept()} aria-label={t("auth.agreement.acceptLabel")} />
        <span>{t("auth.agreement.prefix")}<Button className="h-auto p-0 align-baseline underline underline-offset-4" variant="ghost" size="sm" type="button" onClick={() => setOpen(true)}>{t("auth.agreement.link")}</Button>{t("auth.agreement.suffix")}</span>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl" viewportProps={{ className: "dark" }}>
          <DialogHeader>
            <DialogTitle>{t("auth.agreement.title")}</DialogTitle>
            <DialogDescription>{t("auth.agreement.description")}</DialogDescription>
          </DialogHeader>
          <DialogBody className="max-h-[60svh] overflow-y-auto">
            <div className="flex flex-col gap-7 **:h4:text-foreground-intense **:h4:text-lg **:h4:font-semibold **:p:text-foreground-muted **:p:leading-7">
              {agreement.documents.map((document) => <article className="flex flex-col gap-3" key={document.id || document.title}><h4>{document.title}</h4><ReactMarkdown>{document.content_md || ""}</ReactMarkdown></article>)}
            </div>
          </DialogBody>
          <DialogFooter><Button className="w-full" type="button" variant="light" onClick={() => { agreement.accept(); setOpen(false); }}>{t("auth.agreement.confirm")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

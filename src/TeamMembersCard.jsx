import { Avatar } from "@appica/ui-react/avatar";
import { AvatarBadge } from "@appica/ui-react/avatar";
import { AvatarFallback } from "@appica/ui-react/avatar";
import { AvatarImage } from "@appica/ui-react/avatar";
import { Badge } from "@appica/ui-react/badge";
import { Button } from "@appica/ui-react/button";
import { Input } from "@appica/ui-react/input";
import { Separator } from "@appica/ui-react/separator";
import { Plus } from "@appica/icons-react";
import { useLocale } from "./console/i18n";

const teamMembers = [
  ["01", "Sarah Jenkins", "sarah@wayx.dev", "owner"],
  ["03", "Mateo Rossi", "mateo@wayx.dev", "editor"],
  ["06", "Lucas Müller", "lucas@wayx.dev", "viewer"],
  ["07", "Emily Carter", "emily@wayx.dev", "editor"],
];

export function TeamMembersCard({ className = "", footer, ownerName = teamMembers[0][1], ownerEmail = teamMembers[0][2], ownerLabel, ref }) {
  const { t } = useLocale();
  const members = [[teamMembers[0][0], ownerName, ownerEmail, teamMembers[0][3]], ...teamMembers.slice(1)];
  return (
    <div ref={ref} tabIndex={ref ? -1 : undefined} className={`relative w-80 max-w-full shrink-0 p-2 outline-none min-[85rem]:min-h-0 min-[85rem]:w-auto min-[85rem]:shrink ${className}`}>
      <span className="bg-background/50 border-background absolute inset-0 h-full w-full rounded-2xl border backdrop-blur-xs" />
      <div className="bg-background border-border-muted relative z-1 h-full rounded-xl border p-6 shadow-lg dark:shadow-[0_8px_16px_-4px_rgba(0,0,0,0.8)]">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-2"><div><h3 className="text-foreground-intense text-sm font-semibold">{t("landing.workspace.title")}</h3><p className="text-foreground-muted text-xs">{t("landing.workspace.seats")}</p></div><Button variant="outline" size="sm"><Plus data-icon="start" />{t("landing.workspace.invite")}</Button></div>
          <div className="mt-4 flex flex-1 flex-col gap-4">
            {members.map(([avatar, name, email, role]) => (
              <div className="flex items-center gap-3" key={email}><Avatar size="sm"><AvatarImage src={`/assets/wayx/avatars/${avatar}.jpg`} alt={name} /><AvatarFallback>{name.split(" ").map((part) => part[0]).join("")}</AvatarFallback><AvatarBadge /></Avatar><div className="min-w-0 flex-1"><div className="flex min-w-0 items-center gap-1.5"><span className="text-foreground-intense truncate text-sm font-medium">{name}</span>{role === "owner" && ownerLabel && <Badge className="shrink-0" variant="soft" size="xs">{ownerLabel}</Badge>}</div><div className="text-foreground-muted truncate text-xs">{email}</div></div><Badge variant={role === "owner" ? "primary-outline" : "soft"} size="sm">{t(`landing.workspace.role.${role}`)}</Badge></div>
            ))}
          </div>
          <Separator className="my-4" />
          <Input variant="soft" placeholder={t("landing.workspace.placeholder")} aria-label={t("landing.workspace.inviteAria")} endSlot={<Button className="-me-1.5" variant="outline" size="icon-sm" aria-label={t("landing.workspace.sendAria")}><Plus /></Button>} />
          {footer && <div className="mt-4">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

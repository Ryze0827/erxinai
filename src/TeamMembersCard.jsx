import { Avatar } from "@appica/ui-react/avatar";
import { AvatarBadge } from "@appica/ui-react/avatar";
import { AvatarFallback } from "@appica/ui-react/avatar";
import { AvatarImage } from "@appica/ui-react/avatar";
import { Badge } from "@appica/ui-react/badge";
import { Button } from "@appica/ui-react/button";
import { Input } from "@appica/ui-react/input";
import { Separator } from "@appica/ui-react/separator";
import { Plus } from "@appica/icons-react";

const teamMembers = [
  ["01", "Sarah Jenkins", "sarah@wayx.dev", "Owner"],
  ["03", "Mateo Rossi", "mateo@wayx.dev", "Editor"],
  ["06", "Lucas Müller", "lucas@wayx.dev", "Viewer"],
  ["07", "Emily Carter", "emily@wayx.dev", "Editor"],
];

export function TeamMembersCard({ className = "", footer, ownerName = teamMembers[0][1], ownerEmail = teamMembers[0][2], ownerLabel, ref }) {
  const members = [[teamMembers[0][0], ownerName, ownerEmail, teamMembers[0][3]], ...teamMembers.slice(1)];
  return (
    <div ref={ref} tabIndex={ref ? -1 : undefined} className={`relative w-80 max-w-full shrink-0 p-2 outline-none min-[85rem]:min-h-0 min-[85rem]:w-auto min-[85rem]:shrink ${className}`}>
      <span className="bg-background/50 border-background absolute inset-0 h-full w-full rounded-2xl border backdrop-blur-xs" />
      <div className="bg-background border-border-muted relative z-1 h-full rounded-xl border p-6 shadow-lg dark:shadow-[0_8px_16px_-4px_rgba(0,0,0,0.8)]">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-2"><div><h3 className="text-foreground-intense text-sm font-semibold">Team members</h3><p className="text-foreground-muted text-xs">4 of 5 seats used</p></div><Button variant="outline" size="sm"><Plus data-icon="start" />Invite</Button></div>
          <div className="mt-4 flex flex-1 flex-col gap-4">
            {members.map(([avatar, name, email, role]) => (
              <div className="flex items-center gap-3" key={email}><Avatar size="sm"><AvatarImage src={`/assets/appica/avatars/${avatar}.jpg`} alt={name} /><AvatarFallback>{name.split(" ").map((part) => part[0]).join("")}</AvatarFallback><AvatarBadge /></Avatar><div className="min-w-0 flex-1"><div className="flex min-w-0 items-center gap-1.5"><span className="text-foreground-intense truncate text-sm font-medium">{name}</span>{role === "Owner" && ownerLabel && <Badge className="shrink-0" variant="soft" size="xs">{ownerLabel}</Badge>}</div><div className="text-foreground-muted truncate text-xs">{email}</div></div><Badge variant={role === "Owner" ? "primary-outline" : "soft"} size="sm">{role}</Badge></div>
            ))}
          </div>
          <Separator className="my-4" />
          <Input variant="soft" placeholder="teammate@wayx.dev" aria-label="Invite teammate by email" endSlot={<Button className="-me-1.5" variant="outline" size="icon-sm" aria-label="Send invitation"><Plus /></Button>} />
          {footer && <div className="mt-4">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

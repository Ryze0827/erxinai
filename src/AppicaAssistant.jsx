import { Avatar } from "@appica/ui-react/avatar";
import { AvatarBadge } from "@appica/ui-react/avatar";
import { AvatarFallback } from "@appica/ui-react/avatar";
import { buttonVariants } from "@appica/ui-react/button";
import { Chip } from "@appica/ui-react/chip";
import { Spinner } from "@appica/ui-react/spinner";
import { Toolbar } from "@appica/ui-react/toolbar";
import { ToolbarButton } from "@appica/ui-react/toolbar";
import { ToolbarGroup } from "@appica/ui-react/toolbar";
import { ToolbarInput } from "@appica/ui-react/toolbar";
import { Microphone, Paperclip, Send, Sparkles } from "@appica/icons-react";

export function AppicaAssistant({ className = "" }) {
  return (
    <div className={`flex h-full flex-col ${className}`.trim()}>
      <div className="flex items-center gap-2.5">
        <Avatar size="sm">
          <AvatarFallback className="bg-background-inverse text-foreground-inverse">
            <Sparkles className="size-4.5" />
            <AvatarBadge animate />
          </AvatarFallback>
        </Avatar>
        <span className="text-foreground-intense text-sm font-semibold">Appica Assistant</span>
      </div>
      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3">
        <p className="bg-secondary-soft text-foreground-emphasis max-w-[85%] self-end rounded-lg rounded-br-3xs px-3.5 py-2 text-sm">Build me a pricing page with a monthly / annual toggle.</p>
        <p className="bg-background-muted text-foreground max-w-[85%] self-start rounded-lg rounded-bl-3xs px-3.5 py-2 text-sm">On it - composing Tabs, Switch and Table into a three-tier layout.</p>
        <p className="bg-secondary-soft text-foreground-emphasis max-w-[85%] self-end rounded-md rounded-br-3xs px-3.5 py-2 text-sm">Make the Pro tier featured.</p>
        <span className="text-foreground-muted inline-flex items-center gap-2 px-1 text-xs"><Spinner className="text-[1.4em]" variant="sparkle" currentColor />Generating preview</span>
      </div>
      <div className="mt-3 hidden flex-wrap gap-1.5 min-[85rem]:flex">
        <Chip variant="outline" size="sm">Add a FAQ section</Chip>
        <Chip variant="outline" size="sm">Use dark theme</Chip>
      </div>
      <Toolbar className="mt-3 w-full" aria-label="Message composer">
        <ToolbarInput className="placeholder:text-foreground-subtle h-10 min-w-0 flex-1 ps-3.5 text-sm outline-none" type="text" placeholder="Ask anything…" aria-label="Message the assistant" />
        <ToolbarGroup aria-label="Composer actions">
          <ToolbarButton className={buttonVariants({ variant: "ghost", size: "icon-sm" })} aria-label="Attach files"><Paperclip /></ToolbarButton>
          <ToolbarButton className={buttonVariants({ variant: "ghost", size: "icon-sm" })} aria-label="Dictate a message"><Microphone /></ToolbarButton>
          <ToolbarButton className={`${buttonVariants({ variant: "primary", size: "icon-sm" })} me-1`} aria-label="Send message"><Send /></ToolbarButton>
        </ToolbarGroup>
      </Toolbar>
    </div>
  );
}

export function AppicaAssistantCard({ className = "" }) {
  return (
    <div className={`relative p-2 ${className}`.trim()}>
      <span className="bg-background/50 border-background absolute inset-0 h-full w-full rounded-2xl border backdrop-blur-xs" />
      <div className="bg-background border-border-muted relative z-1 h-full rounded-xl border p-6 shadow-lg dark:shadow-[0_8px_16px_-4px_rgba(0,0,0,0.8)]">
        <AppicaAssistant />
      </div>
    </div>
  );
}

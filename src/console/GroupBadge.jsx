import {
  BrandClaude,
  BrandGoogleGemini,
  BrandOpenai,
  BrandX,
  Cloud,
  World,
} from "@appica/icons-react";
import { Badge } from "@appica/ui-react/badge";

const platformAliases = {
  claude: "anthropic",
  codex: "openai",
  google: "gemini",
  xai: "grok",
};

function platformTone(platform) {
  const value = String(platform || "").trim().toLowerCase();
  return platformAliases[value] || value || "default";
}

export function PlatformMark({ platform }) {
  const tone = platformTone(platform);
  const marks = {
    anthropic: BrandClaude,
    openai: BrandOpenai,
    gemini: BrandGoogleGemini,
    antigravity: Cloud,
    grok: BrandX,
  };
  const Mark = marks[tone] || World;
  return <Mark aria-hidden="true" />;
}

function BadgeDetail({ detail, originalDetail }) {
  if (!detail) return null;
  if (!originalDetail) return <small>{detail}</small>;
  return <small className="is-discount"><del>{originalDetail}</del><strong>{detail}</strong></small>;
}

export function GroupBadge({ name, platform, detail, originalDetail }) {
  if (!name) return <span className="console-muted">—</span>;
  const tone = platformTone(platform);
  return <Badge variant="soft" size="sm" className={`console-group-badge console-group-badge--${tone}`} title={platform || name}><PlatformMark platform={tone} /><span>{name}</span><BadgeDetail detail={detail} originalDetail={originalDetail} /></Badge>;
}

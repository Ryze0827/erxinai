import {
  BrandGoogleGemini,
  World,
} from "@appica/icons-react";
import { Badge } from "@appica/ui-react/badge";

const platformAliases = {
  claude: "anthropic",
  codex: "openai",
  google: "gemini",
  xai: "grok",
};

// Reuse the provider artwork displayed on the landing page.
const platformArtwork = {
  anthropic: "/assets/img/hero-claude-53b6104287.webp",
  openai: "/assets/img/hero-codex-52fd8a0726.webp",
  grok: "/assets/img/hero-grok-8f7563399d.webp",
  antigravity: "/assets/img/hero-antigravity-c8c6175360.webp",
};

function platformTone(platform) {
  const value = String(platform || "").trim().toLowerCase();
  return platformAliases[value] || value || "default";
}

export function PlatformMark({ platform }) {
  const tone = platformTone(platform);
  const artwork = platformArtwork[tone];
  if (artwork) return <img src={artwork} alt="" aria-hidden="true" data-platform={tone} className="console-platform-artwork" />;
  const Mark = tone === "gemini" ? BrandGoogleGemini : World;
  return <Mark aria-hidden="true" data-platform={tone} />;
}

function BadgeDetail({ detail, originalDetail }) {
  if (!detail) return null;
  if (!originalDetail) return <small>{detail}</small>;
  return <small className="is-discount"><del>{originalDetail}</del><strong>{detail}</strong></small>;
}

export function GroupBadge({ name, platform, detail, originalDetail }) {
  if (!name) return <span className="console-muted">—</span>;
  const tone = platformTone(platform);
  return <Badge variant="soft" size="sm" className={`console-group-badge console-platform-surface console-group-badge--${tone}`} title={platform || name}><PlatformMark platform={tone} /><span>{name}</span><BadgeDetail detail={detail} originalDetail={originalDetail} /></Badge>;
}

import { useEffect, useState } from "react";
import { Button } from "../UI";
import { useLocale } from "../i18n";

const cache = new Map();

async function lookup(ip, signal) {
  if (cache.has(ip)) return cache.get(ip);
  const response = await fetch(`https://get.geojs.io/v1/ip/geo/${encodeURIComponent(ip)}.json`, { signal });
  if (!response.ok) throw new Error("lookup failed");
  const data = await response.json();
  const location = [data.city, data.region, data.country_code].filter(Boolean).join(", ");
  cache.set(ip, location);
  return location;
}

export function IpGeoCell({ ip, enabled = false }) {
  const [state, setState] = useState({ loading: false, location: cache.get(ip) || "", error: false });
  useEffect(() => {
    if (!enabled || !ip || state.location) return undefined;
    const controller = new AbortController();
    setState((current) => ({ ...current, loading: true, error: false }));
    lookup(ip, controller.signal).then((location) => setState({ loading: false, location, error: false })).catch((error) => error.name !== "AbortError" && setState({ loading: false, location: "", error: true }));
    return () => controller.abort();
  }, [enabled, ip, state.location]);
  if (!ip) return <span className="console-muted">—</span>;
  return <div className="console-ip"><code>{ip}</code>{enabled && <small>{state.loading ? "…" : state.location || (state.error ? "Lookup failed" : "")}</small>}</div>;
}

export function IpGeoBatchToolbar({ enabled, onToggle, count }) {
  const { locale } = useLocale();
  return <div className="console-ip-toolbar"><span>{locale === "zh" ? `本页 ${count} 个 IP` : `${count} IPs on this page`}</span><Button icon="globe" onClick={onToggle}>{enabled ? (locale === "zh" ? "隐藏归属地" : "Hide locations") : (locale === "zh" ? "批量查询归属地" : "Look up locations")}</Button></div>;
}

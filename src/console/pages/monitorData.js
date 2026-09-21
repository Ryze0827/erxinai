export const MONITOR_RANGES = { v1: ["7d", "15d", "30d"], v2: ["90m", "24h", "7d", "30d"] };

export function metricNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

// TPM is aggregate throughput over the backend's covered minutes.
export function tokensPerSecond(tpm) {
  const value = metricNumber(tpm);
  return value == null ? null : value / 60;
}

export function monitorTone(status) {
  if (["operational", "healthy"].includes(status)) return "operational";
  if (["degraded", "warning"].includes(status)) return "degraded";
  if (["failed", "error", "critical"].includes(status)) return "failed";
  return "unknown";
}

const platformAlias = (value) => ({ claude: "anthropic", codex: "openai", google: "gemini", xai: "grok" }[value] || value);

// V1 only exposes a free-text group_name, not a group ID. Never guess by monitor name
// or join an ambiguous match. V2 uses the server-provided group ID directly.
export function matchingGroup(item, groups, mode) {
  if (mode === "v2") return groups.find((group) => String(group.id) === String(item.group_id));
  if (!item.group_name) return undefined;
  const matches = groups.filter((group) => group.name === item.group_name && (group.platform === "composite" || platformAlias(group.platform) === platformAlias(item.provider)));
  return matches.length === 1 ? matches[0] : undefined;
}

export function metricRate(metrics, health, field) {
  // User responses redact request/sample counts to zero. Use the health signal,
  // never the redacted counters, to distinguish insufficient samples from 0%.
  const signal = field === "cache_rate" ? health?.cache : health?.error_rate;
  const rate = metricNumber(metrics?.[field]);
  return !signal || signal === "unknown" || rate === null ? null : Math.min(100, rate * 100);
}

// Match sub2api's displayed success rate: ignored error categories do not count
// against health. This differs from the raw successful-request fraction.
export function scoredSuccessRate(metrics, health) {
  const errorRate = metricRate(metrics, health, "error_rate");
  return errorRate == null ? null : 100 - errorRate;
}

export function buildMonitorRows(items, groups, rates, mode, range, details = {}) {
  return items.map((item) => {
    const group = matchingGroup(item, groups, mode);
    const userRate = group ? metricNumber(rates?.[group.id]) : null;
    const base = {
      key: mode === "v2" ? `${item.platform}:${item.group_id}` : String(item.id),
      source: item,
      group,
      name: item.group_name || item.name || group?.name || "—",
      platform: item.platform || item.provider,
      description: group?.description || (item.name !== item.group_name ? item.name : ""),
      rate: rates === null ? null : userRate ?? metricNumber(group?.rate_multiplier),
      originalRate: metricNumber(group?.rate_multiplier),
    };
    if (mode === "v2") return {
      ...base,
      tone: monitorTone(item.health?.overall),
      latency: metricNumber(item.metrics?.ttft?.p50_ms),
      p95: metricNumber(item.metrics?.ttft?.p95_ms),
      cacheRate: metricRate(item.metrics, item.health, "cache_rate"),
      successRate: scoredSuccessRate(item.metrics, item.health),
      models: [],
      timeline: (item.buckets || []).map((point) => ({ time: point.bucket_start, latency: metricNumber(point.metrics?.ttft?.p50_ms), secondary: metricNumber(point.metrics?.ttft?.p95_ms), tone: monitorTone(point.health?.overall) })),
    };
    const model = details[item.id]?.models?.find((entry) => entry.model === item.primary_model);
    const availability = range === "7d" ? item.availability_7d : model?.[`availability_${range}`];
    return {
      ...base,
      tone: monitorTone(item.primary_status),
      latency: metricNumber(item.primary_latency_ms),
      ping: metricNumber(item.primary_ping_latency_ms),
      availability: metricNumber(availability),
      models: [{ model: item.primary_model, status: item.primary_status }, ...(item.extra_models || [])].filter((entry) => entry.model),
      timeline: (item.timeline || []).map((point) => ({ time: point.checked_at, latency: metricNumber(point.latency_ms), secondary: metricNumber(point.ping_latency_ms), tone: monitorTone(point.status) })),
    };
  });
}

export function sortMonitorRows(rows, sort) {
  const statusOrder = { operational: 0, degraded: 1, failed: 2, unknown: 3 };
  const descending = ["successRate", "cacheRate", "availability"].includes(sort);
  return rows.slice().sort((left, right) => {
    if (sort === "status") return statusOrder[left.tone] - statusOrder[right.tone] || left.name.localeCompare(right.name);
    if (left[sort] == null) return right[sort] == null ? 0 : 1;
    if (right[sort] == null) return -1;
    return descending ? right[sort] - left[sort] : left[sort] - right[sort];
  });
}

export function trendGeometry(timeline, coverage) {
  let points = timeline.filter((point) => Number.isFinite(Date.parse(point.time))).slice().sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
  const requestedStart = Date.parse(coverage?.requested_start);
  const requestedEnd = Date.parse(coverage?.requested_end || coverage?.data_through);
  const bucketSeconds = metricNumber(coverage?.bucket_seconds);
  const hasWindow = Number.isFinite(requestedStart) && Number.isFinite(requestedEnd) && requestedEnd > requestedStart && bucketSeconds > 0;
  const start = hasWindow ? requestedStart : Date.parse(points[0]?.time);
  const end = hasWindow ? requestedEnd : Date.parse(points.at(-1)?.time);
  if (hasWindow) {
    const byTime = new Map(points.map((point) => [Date.parse(point.time), point]));
    points = [];
    // Preserve every requested bucket, including omitted and unfilled history.
    // Null slots break each series instead of connecting across absent data.
    for (let time = start; time < end; time += bucketSeconds * 1000) {
      points.push(byTime.get(time) || { time: new Date(time).toISOString(), latency: null, secondary: null, tone: "unknown" });
    }
  }
  const max = Math.max(1, ...points.flatMap((point) => [point.latency ?? 0, point.secondary ?? 0]));
  const positioned = points.map((point) => ({
    ...point,
    x: !hasWindow && points.length === 1 ? 140 : 4 + (Date.parse(point.time) - start) / Math.max(1, end - start) * 272,
    width: hasWindow ? Math.min(bucketSeconds * 1000, end - Date.parse(point.time)) / (end - start) * 272 : 0,
  }));
  const pathFor = (field) => {
    let connected = false;
    return positioned.map((point) => {
      if (point[field] == null) { connected = false; return ""; }
      const command = connected ? "L" : "M";
      connected = true;
      return `${command}${point.x.toFixed(2)},${(49 - point[field] / max * 42).toFixed(2)}`;
    }).join(" ");
  };
  const areas = [];
  let segment = [];
  const closeArea = () => {
    if (segment.length > 1) {
      const line = segment.map((point) => `L${point.x.toFixed(2)},${(49 - point.latency / max * 42).toFixed(2)}`).join(" ");
      areas.push(`M${segment[0].x.toFixed(2)},49 ${line} L${segment.at(-1).x.toFixed(2)},49 Z`);
    }
    segment = [];
  };
  for (const point of positioned) {
    if (point.latency == null) closeArea();
    else segment.push(point);
  }
  closeArea();
  return { points: positioned, primary: pathFor("latency"), primaryArea: areas.join(" "), secondary: pathFor("secondary"), max, startTime: Number.isFinite(start) ? new Date(start).toISOString() : null, endTime: Number.isFinite(end) ? new Date(end).toISOString() : null, bucketSeconds: hasWindow ? bucketSeconds : null };
}

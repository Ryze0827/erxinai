export const RATE_TIERS = [
  { minimum: 500, pro: 0.18, intermediate: 0.26, advanced: 0.22 },
  { minimum: 200, pro: 0.22, intermediate: 0.26, advanced: null },
  { minimum: 100, pro: 0.26, intermediate: null, advanced: null },
  { minimum: 50, pro: 0.28, intermediate: null, advanced: null },
];

export function inspectionNumber(value) {
  if (typeof value !== "number" && (typeof value !== "string" || !value.trim())) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

export function normalizeInspectionEmails(value) {
  return [...new Set(String(value || "").split(/[\s,;，；]+/).map((item) => item.trim().toLowerCase()).filter(Boolean))];
}

export function expectedRate(total, kind) {
  const amount = inspectionNumber(total);
  if (amount === null) return null;
  return RATE_TIERS.find((tier) => amount >= tier.minimum)?.[kind] ?? null;
}

export function mergeGroupRateEntries(existing, updates) {
  if (!Array.isArray(existing) || !Array.isArray(updates)) throw new Error("INVALID_GROUP_RATES");
  const entries = new Map();
  existing.forEach((entry) => {
    if (!entry.user_id) throw new Error("INVALID_GROUP_RATES");
    if (entry.rate_multiplier !== null && entry.rate_multiplier !== undefined) {
      if (inspectionNumber(entry.rate_multiplier) === null) throw new Error("INVALID_GROUP_RATES");
      entries.set(String(entry.user_id), { user_id: entry.user_id, rate_multiplier: entry.rate_multiplier });
    }
  });
  updates.forEach((entry) => {
    if (!entry?.user_id || inspectionNumber(entry.rate_multiplier) === null) throw new Error("INVALID_GROUP_RATES");
    entries.set(String(entry.user_id), { user_id: entry.user_id, rate_multiplier: entry.rate_multiplier });
  });
  return [...entries.values()];
}

export function suggestedRule(group) {
  const name = String(group.name || "").normalize("NFKC");
  if (name.includes("中级专线")) return "intermediate";
  if (name.includes("高级专线")) return "advanced";
  if (/(^|[^a-z])pro([^a-z]|$)/i.test(name)) return "pro";
  return "ignore";
}

export function inspectUser(user, totalRecharged, groups, rates) {
  const total = inspectionNumber(totalRecharged);
  if (total === null) throw new Error("INVALID_RECHARGE_TOTAL");
  const rows = [];
  let checked = 0;
  for (const group of groups) {
    const expected = expectedRate(total, group.rule);
    if (expected === null) continue;
    const allowed = (user.allowed_groups || []).some((id) => String(id) === String(group.id));
    if ((group.is_exclusive || user.restrict_public_groups) && !allowed) continue;
    const overrides = rates.get(String(group.id));
    if (!overrides) throw new Error("INVALID_GROUP_RATES");
    const override = overrides.get(String(user.id));
    const custom = override !== null && override !== undefined;
    const current = inspectionNumber(custom ? override : group.rate_multiplier);
    checked += 1;
    if (current !== null && Math.abs(current - expected) < 1e-8) continue;
    rows.push({
      id: `${user.id}:${group.id}`, userId: user.id, username: user.username, email: user.email, groupId: group.id,
      group: group.name, total, expected, current, custom,
      status: current === null ? "invalid" : "mismatch",
    });
  }
  return { rows, checked };
}

// Read-only inspection. Use balance-history's aggregate, which sums positive
// balance/admin_balance records across all pages, not the user balance counter.
export async function runRateInspection({ api, groups, signal, userEmails, onProgress = () => {} }) {
  if (!groups.length) throw new Error("NO_INSPECTION_GROUPS");
  const rates = new Map();
  for (const group of groups) {
    signal.throwIfAborted();
    const entries = await api.groupRates(group.id, signal);
    if (!Array.isArray(entries)) throw new Error("INVALID_GROUP_RATES");
    const overrides = new Map();
    for (const entry of entries) {
      if (!entry.user_id) throw new Error("INVALID_GROUP_RATES");
      if (entry.rate_multiplier !== null && entry.rate_multiplier !== undefined) {
        if (inspectionNumber(entry.rate_multiplier) === null) throw new Error("INVALID_GROUP_RATES");
        overrides.set(String(entry.user_id), entry.rate_multiplier);
      }
    }
    rates.set(String(group.id), overrides);
  }

  const result = { rows: [], processed: 0, total: 0, checked: 0, skipped: 0, failed: 0, abnormalUsers: 0, missingEmails: [] };
  const seen = new Set();
  const abnormal = new Set();
  const processUsers = async (users) => {
    onProgress({ ...result, rows: undefined });
    // Bound concurrency so a large user list does not flood the admin API.
    for (let offset = 0; offset < users.length; offset += 4) {
      signal.throwIfAborted();
      const batch = users.slice(offset, offset + 4);
      const settled = await Promise.allSettled(batch.map(async (user) => {
        const history = await api.recharge(user.id, signal);
        return inspectUser(user, history?.total_recharged, groups, rates);
      }));
      signal.throwIfAborted();
      settled.forEach((entry, index) => {
        const user = batch[index];
        if (entry.status === "rejected") {
          if ([401, 403].includes(entry.reason?.status)) throw entry.reason;
          result.failed += 1;
          result.rows.push({ id: `${user.id}:failed`, userId: user.id, username: user.username, email: user.email, status: "failed", total: null, current: null, expected: null });
        } else {
          result.checked += entry.value.checked;
          if (!entry.value.checked) result.skipped += 1;
          if (entry.value.rows.length) abnormal.add(String(user.id));
          result.rows.push(...entry.value.rows);
        }
        result.processed += 1;
      });
      result.abnormalUsers = abnormal.size;
      onProgress({ ...result, rows: undefined });
    }
  };

  if (userEmails !== undefined) {
    const requestedEmails = normalizeInspectionEmails(userEmails);
    if (!requestedEmails.length) throw new Error("NO_INSPECTION_EMAILS");
    const lookups = [];
    for (let offset = 0; offset < requestedEmails.length; offset += 4) {
      signal.throwIfAborted();
      const batch = requestedEmails.slice(offset, offset + 4);
      const batchResults = await Promise.all(batch.map(async (email) => {
        const response = await api.users(1, signal, email);
        if (!Array.isArray(response?.items) || !Number.isSafeInteger(response.total) || response.total < 0) throw new Error("INVALID_USER_PAGE");
        const user = response.items.find((item) => String(item.email || "").trim().toLowerCase() === email);
        return { email, user };
      }));
      lookups.push(...batchResults);
    }
    const users = [];
    const seenUsers = new Set();
    lookups.forEach(({ email, user }) => {
      if (!user) {
        result.missingEmails.push(email);
        return;
      }
      if (!user.id || seenUsers.has(String(user.id))) return;
      seenUsers.add(String(user.id));
      users.push(user);
    });
    result.total = users.length;
    await processUsers(users);
    return { ...result, completedAt: new Date().toISOString() };
  }

  let page = 1;
  do {
    signal.throwIfAborted();
    const response = await api.users(page, signal);
    if (!Array.isArray(response?.items) || !Number.isSafeInteger(response.total) || response.total < 0) throw new Error("INVALID_USER_PAGE");
    if (page > 1 && response.total !== result.total) throw new Error("USER_LIST_CHANGED");
    result.total = response.total;
    if (!response.items.length && seen.size < result.total) throw new Error("INVALID_USER_PAGE");
    for (const user of response.items) {
      if (!user.id || seen.has(String(user.id))) throw new Error("USER_LIST_CHANGED");
      seen.add(String(user.id));
    }
    await processUsers(response.items);
    page += 1;
  } while (seen.size < result.total);
  if (seen.size !== result.total) throw new Error("USER_LIST_CHANGED");
  return { ...result, completedAt: new Date().toISOString() };
}

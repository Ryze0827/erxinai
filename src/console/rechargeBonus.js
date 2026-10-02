export function roundRechargeAmount(value, digits = 2) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function rechargeMultiplier(checkout) {
  const value = Number(checkout?.balance_recharge_multiplier);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

export function normalizeRechargeBonusTiers(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  return raw.flatMap((item) => {
    if (item?.min_amount == null || item?.min_amount === "" || item?.bonus_percent == null || item?.bonus_percent === "") return [];
    const min = Number(item.min_amount);
    const percent = Number(item.bonus_percent);
    if (![min, percent].every((value) => Number.isFinite(value) && value >= 0 && Math.abs(roundRechargeAmount(value) - value) < 1e-9) || percent > 1000 || seen.has(min.toFixed(2))) return [];
    seen.add(min.toFixed(2));
    return [{ min_amount: min, bonus_percent: percent }];
  }).sort((a, b) => a.min_amount - b.min_amount);
}

// 区间含起始金额、不含结束金额；首档之前补充无优惠区间。
export function describeRechargeBonusIntervals(tiers) {
  const sorted = [...tiers].sort((a, b) => a.min_amount - b.min_amount);
  if (!sorted.length) return [];
  const intervals = sorted[0].min_amount > 0 ? [{ from: 0, to: sorted[0].min_amount, percent: 0 }] : [];
  return intervals.concat(sorted.map((tier, index) => ({ from: tier.min_amount, to: sorted[index + 1]?.min_amount ?? null, percent: tier.bonus_percent })));
}

// 阶梯按提交的支付金额匹配；amount/bonus_amount 均为 USD 到账额度。
export function quoteRechargeBonus(paymentAmount, checkout, tiers, currencyDigits = 2) {
  const amount = Number.isFinite(paymentAmount) && paymentAmount > 0 ? paymentAmount : 0;
  const multiplier = rechargeMultiplier(checkout);
  const mode = String(checkout?.recharge_bonus_mode || "").trim().toLowerCase() === "discount" ? "discount" : "bonus";
  const base = roundRechargeAmount(amount * multiplier);
  const quote = { mode, percent: 0, payBase: amount, base, bonus: 0, credited: base, discount: 0 };
  const tier = amount > 0 ? tiers.filter((item) => item.min_amount <= amount + 1e-9).at(-1) : null;
  if (!tier || tier.bonus_percent <= 0) return quote;
  if (mode === "discount") {
    if (tier.bonus_percent >= 100) return quote;
    const payBase = roundRechargeAmount(amount * (100 - tier.bonus_percent) / 100, currencyDigits);
    if (payBase <= 0 || payBase >= amount) return quote;
    return { ...quote, percent: tier.bonus_percent, payBase, discount: roundRechargeAmount(amount - payBase, currencyDigits), bonus: Math.max(0, roundRechargeAmount(base - roundRechargeAmount(payBase * multiplier))) };
  }
  const bonus = roundRechargeAmount(base * tier.bonus_percent / 100);
  if (bonus <= 0) return quote;
  return { ...quote, percent: tier.bonus_percent, bonus, credited: roundRechargeAmount(base + bonus) };
}

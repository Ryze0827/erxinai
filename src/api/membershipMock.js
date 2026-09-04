const MOCK_TOTAL_RECHARGED = 680;
const MOCK_NOW = "2026-09-04T10:30:00+08:00";

let nextLevelId = 5;
let levels = [
  { id: 1, name: "普通会员", threshold: "0.00", bonus_percent: "0.0000", description: "完成首次充值即可开启会员成长", enabled: true, created_at: MOCK_NOW, updated_at: MOCK_NOW },
  { id: 2, name: "青铜会员", threshold: "100.00", bonus_percent: "2.0000", description: "每笔余额充值赠送 2%", enabled: true, created_at: MOCK_NOW, updated_at: MOCK_NOW },
  { id: 3, name: "白银会员", threshold: "500.00", bonus_percent: "5.0000", description: "累计充值达到 500 美元后享受 5% 赠送", enabled: true, created_at: MOCK_NOW, updated_at: MOCK_NOW },
  { id: 4, name: "黄金会员", threshold: "1000.00", bonus_percent: "8.0000", description: "高价值会员每笔充值赠送 8%", enabled: true, created_at: MOCK_NOW, updated_at: MOCK_NOW },
];

let grants = [
  { payment_order_id: 10248, user_id: 10086, level_name: "白银会员", recharge_amount: "200.00", bonus_percent: "5.0000", bonus_amount: "10.00", status: "completed", attempts: 1, credited_at: "2026-09-04T09:42:16+08:00", error_message: null, reversed_amount: "0.00", reversal_status: "none", reversal_attempts: 0, pending_reversal_amount: null, pending_reversal_key: null, reversal_error_message: null, created_at: "2026-09-04T09:42:15+08:00", updated_at: "2026-09-04T09:42:16+08:00" },
  { payment_order_id: 10247, user_id: 10021, level_name: "青铜会员", recharge_amount: "100.00", bonus_percent: "2.0000", bonus_amount: "2.00", status: "review_required", attempts: 1, credited_at: null, error_message: "余额接口响应超时，需要按幂等键核验流水", reversed_amount: "0.00", reversal_status: "none", reversal_attempts: 0, pending_reversal_amount: null, pending_reversal_key: null, reversal_error_message: null, created_at: "2026-09-04T09:18:04+08:00", updated_at: "2026-09-04T09:20:04+08:00" },
  { payment_order_id: 10241, user_id: 10009, level_name: "黄金会员", recharge_amount: "500.00", bonus_percent: "8.0000", bonus_amount: "40.00", status: "completed", attempts: 1, credited_at: "2026-09-03T18:06:34+08:00", error_message: null, reversed_amount: "0.00", reversal_status: "review_required", reversal_attempts: 1, pending_reversal_amount: "16.00", pending_reversal_key: "wayx-membership-refund-3-0-1600", reversal_error_message: "赠送追回结果不确定，需要人工核验", created_at: "2026-09-03T18:06:33+08:00", updated_at: "2026-09-04T08:12:10+08:00" },
  { payment_order_id: 10236, user_id: 10003, level_name: "普通会员", recharge_amount: "50.00", bonus_percent: "0.0000", bonus_amount: "0.00", status: "completed", attempts: 1, credited_at: "2026-09-03T11:28:41+08:00", error_message: null, reversed_amount: "0.00", reversal_status: "none", reversal_attempts: 0, pending_reversal_amount: null, pending_reversal_key: null, reversal_error_message: null, created_at: "2026-09-03T11:28:41+08:00", updated_at: "2026-09-03T11:28:41+08:00" },
];

function clone(value) {
  return structuredClone(value);
}

function pause(signal) {
  return new Promise((resolve, reject) => {
    let timer;
    const finish = () => {
      signal?.removeEventListener("abort", abort);
      resolve();
    };
    const abort = () => {
      window.clearTimeout(timer);
      const error = new Error("Request aborted");
      error.name = "AbortError";
      reject(error);
    };
    timer = window.setTimeout(finish, 280);
    if (signal?.aborted) abort();
    else signal?.addEventListener("abort", abort, { once: true });
  });
}

function activeLevels() {
  return levels.filter((level) => level.enabled).sort((left, right) => Number(left.threshold) - Number(right.threshold));
}

function membershipSummary() {
  const enabled = activeLevels();
  const currentIndex = enabled.findLastIndex((level) => Number(level.threshold) <= MOCK_TOTAL_RECHARGED);
  const current = enabled[Math.max(0, currentIndex)];
  const next = enabled[currentIndex + 1] || null;
  const span = next ? Number(next.threshold) - Number(current.threshold) : 0;
  const progress = next && span > 0 ? ((MOCK_TOTAL_RECHARGED - Number(current.threshold)) / span) * 100 : 100;
  return {
    current_level: current,
    next_level: next,
    total_recharged: MOCK_TOTAL_RECHARGED.toFixed(2),
    current_threshold: current.threshold,
    next_threshold: next?.threshold || null,
    amount_to_next_level: next ? Math.max(0, Number(next.threshold) - MOCK_TOTAL_RECHARGED).toFixed(2) : "0.00",
    progress_percent: progress.toFixed(2),
    levels: enabled,
  };
}

export const membershipMockApi = {
  isMock: true,
  async me(signal) {
    await pause(signal);
    return clone(membershipSummary());
  },
  async quote(amount, signal) {
    await pause(signal);
    const summary = membershipSummary();
    const value = Number(amount) || 0;
    const rate = Number(summary.current_level.bonus_percent);
    const bonus = Math.round(value * rate) / 100;
    return clone({ level: summary.current_level, amount: value.toFixed(2), bonus_percent: rate.toFixed(4), bonus_amount: bonus.toFixed(2), total_credit: (value + bonus).toFixed(2) });
  },
  async claim(orderId, signal) {
    await pause(signal);
    return { payment_order_id: orderId, user_id: 10086, level_name: "Mock", recharge_amount: "0.00", bonus_percent: "0.0000", bonus_amount: "0.00", status: "review_required", attempts: 0, credited_at: null, error_message: "Mock 模式不会执行真实余额入账", reversed_amount: "0.00", reversal_status: "none", reversal_attempts: 0, pending_reversal_amount: null, pending_reversal_key: null, reversal_error_message: null, created_at: MOCK_NOW, updated_at: MOCK_NOW };
  },
  async levels(signal) {
    await pause(signal);
    return clone([...levels].sort((left, right) => Number(left.threshold) - Number(right.threshold)));
  },
  async createLevel(body) {
    await pause();
    if (levels.some((level) => level.name === body.name || Number(level.threshold) === Number(body.threshold))) throw new Error("等级名称或累计充值门槛已存在");
    const level = { ...body, id: nextLevelId, threshold: Number(body.threshold).toFixed(2), bonus_percent: Number(body.bonus_percent).toFixed(4), created_at: MOCK_NOW, updated_at: new Date().toISOString() };
    nextLevelId += 1;
    levels = [...levels, level];
    return clone(level);
  },
  async updateLevel(levelId, body) {
    await pause();
    const index = levels.findIndex((level) => level.id === levelId);
    if (index < 0) throw new Error("会员等级不存在");
    const current = levels[index];
    if (Number(current.threshold) === 0 && (Number(body.threshold) !== 0 || Number(body.bonus_percent) !== 0 || !body.enabled)) throw new Error("基础会员等级的门槛、赠送比例和启用状态不能修改");
    if (levels.some((level) => level.id !== levelId && (level.name === body.name || Number(level.threshold) === Number(body.threshold)))) throw new Error("等级名称或累计充值门槛已存在");
    const updated = { ...levels[index], ...body, threshold: Number(body.threshold).toFixed(2), bonus_percent: Number(body.bonus_percent).toFixed(4), updated_at: new Date().toISOString() };
    levels = levels.map((level) => level.id === levelId ? updated : level);
    return clone(updated);
  },
  async disableLevel(levelId) {
    await pause();
    const level = levels.find((item) => item.id === levelId);
    if (!level || Number(level.threshold) === 0) throw new Error("基础会员等级不能停用");
    level.enabled = false;
    level.updated_at = new Date().toISOString();
    return clone(level);
  },
  async grants(query = {}, signal) {
    await pause(signal);
    const page = Number(query.page) || 1;
    const pageSize = Number(query.page_size) || 20;
    const start = (page - 1) * pageSize;
    return clone({ items: grants.slice(start, start + pageSize), total: grants.length, page, page_size: pageSize });
  },
  async resolveGrant(orderId, body) {
    await pause();
    grants = grants.map((grant) => {
      if (grant.payment_order_id !== orderId) return grant;
      if (body.operation === "credit") return { ...grant, status: body.outcome === "applied" ? "completed" : "failed", credited_at: body.outcome === "applied" ? new Date().toISOString() : null, error_message: `Mock 核验：${body.note}` };
      return { ...grant, reversal_status: body.outcome === "applied" ? "completed" : "failed", reversed_amount: body.outcome === "applied" ? grant.pending_reversal_amount : grant.reversed_amount, pending_reversal_amount: null, pending_reversal_key: null, reversal_error_message: `Mock 核验：${body.note}` };
    });
    return clone(grants.find((grant) => grant.payment_order_id === orderId));
  },
};

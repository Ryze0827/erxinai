export const navSections = [
  {
    label: "工作台",
    items: [
      { icon: "dashboard", label: "概览", badge: null },
      { icon: "key", label: "API 密钥", badge: "12" },
      { icon: "image", label: "批量生图", badge: null },
      { icon: "chart", label: "用量记录", badge: null },
      { icon: "channel", label: "可用渠道", badge: null },
      { icon: "pulse", label: "渠道状态", badge: "正常" },
    ],
  },
  {
    label: "账户",
    items: [
      { icon: "wallet", label: "充值额度", badge: null },
      { icon: "order", label: "订单", badge: null },
      { icon: "gift", label: "兑换", badge: null },
      { icon: "users", label: "推广", badge: null },
      { icon: "image", label: "GPT 生图", badge: null },
      { icon: "book", label: "图片 API 文档", badge: null },
    ],
  },
];

export const summaryMetrics = [
  {
    eyebrow: "当前吞吐",
    value: "128",
    unit: "RPM",
    metaLabel: "平均耗时",
    metaValue: "842 ms",
    detailLabel: "TPM",
    detailValue: "2.84M",
  },
  {
    eyebrow: "今日请求",
    value: "1,248",
    unit: "次",
    metaLabel: "历史累计",
    metaValue: "892,461",
    change: "+12.8%",
  },
  {
    eyebrow: "今日 Token",
    value: "38.72",
    unit: "M",
    metaLabel: "历史累计",
    metaValue: "14.80B",
    change: "+8.4%",
  },
  {
    eyebrow: "今日实际支出",
    value: "$12.3847",
    unit: "",
    metaLabel: "标准成本",
    metaValue: "$15.42",
    change: "节省 19.7%",
  },
];

export const trendData = [
  { date: "2026-07-29", total_tokens: 18_400_000 },
  { date: "2026-07-30", total_tokens: 21_900_000 },
  { date: "2026-07-31", total_tokens: 19_600_000 },
  { date: "2026-08-01", total_tokens: 25_800_000 },
  { date: "2026-08-02", total_tokens: 23_300_000 },
  { date: "2026-08-03", total_tokens: 29_100_000 },
  { date: "2026-08-04", total_tokens: 31_800_000 },
  { date: "2026-08-05", total_tokens: 28_400_000 },
  { date: "2026-08-06", total_tokens: 34_200_000 },
  { date: "2026-08-07", total_tokens: 32_600_000 },
  { date: "2026-08-08", total_tokens: 36_900_000 },
  { date: "2026-08-09", total_tokens: 34_700_000 },
  { date: "2026-08-10", total_tokens: 38_720_000 },
];

export const modelRows = [
  { name: "gpt-5.2", requests: "526", tokens: "16.82M", cost: "$5.71", share: 43 },
  { name: "claude-sonnet-4.5", requests: "318", tokens: "10.45M", cost: "$3.42", share: 27 },
  { name: "gemini-3-pro", requests: "247", tokens: "7.18M", cost: "$2.09", share: 19 },
  { name: "其他模型", requests: "157", tokens: "4.27M", cost: "$1.16", share: 11 },
];

export const quickActions = [
  { icon: "plus", label: "创建 API 密钥" },
  { icon: "chart", label: "查看用量" },
  { icon: "wallet", label: "充值额度" },
  { icon: "image", label: "生成图片" },
  { icon: "gift", label: "兑换" },
];

export const heatmapValues = Array.from({ length: 154 }, (_, index) => {
  const wave = Math.sin(index * 0.41) * 0.42 + Math.cos(index * 0.17) * 0.24;
  if (index % 17 === 0 || index % 29 === 0) return 0;
  return Math.max(1, Math.min(4, Math.round(2.35 + wave * 2)));
});

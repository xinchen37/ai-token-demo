import type { ConsumptionRecord, DealerData } from "./types";

export type TrendMetric = "amount" | "tokens" | "calls";
export type TrendRange = "today" | "last7" | "last30" | "month";
export type RankMetric = "model" | "customer" | "sales";

export interface TrendPoint {
  label: string;
  value: number;
}

export interface RankItem {
  name: string;
  amount: number;
  tokens: number;
  count: number;
  customerCount?: number;
  averageAmount?: number;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("zh-CN").format(value);
}

export function maskApiKey(value: string): string {
  if (value.length <= 8) {
    return value;
  }

  return `${value.slice(0, 6)}***${value.slice(-4)}`;
}

export function getCurrentDateTime(): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date())
    .replace(/\//g, "-");
}

export function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function calculateConsumptionCost(record: ConsumptionRecord, data: DealerData): number {
  const model = data.models.find((item) => item.name === record.modelName);
  if (!model) {
    return record.amount * 0.62;
  }

  const inputCost = (record.inputTokens / 1_000_000) * model.costInputPrice;
  const outputCost = (record.outputTokens / 1_000_000) * model.costOutputPrice;
  return inputCost + outputCost;
}

export function calculateDashboardMetrics(data: DealerData) {
  const successfulRecords = data.consumptions.filter((record) => record.status === "成功");
  const totalAmount = successfulRecords.reduce((sum, record) => sum + record.amount, 0);
  const totalCost = successfulRecords.reduce((sum, record) => sum + calculateConsumptionCost(record, data), 0);
  const totalTokens = successfulRecords.reduce((sum, record) => sum + record.inputTokens + record.outputTokens, 0);
  const activeCustomerNames = new Set(successfulRecords.map((record) => record.customerName));

  return {
    totalAmount,
    pendingSettlement: data.bills.filter((bill) => bill.status === "待结算").reduce((sum, bill) => sum + bill.amount, 0),
    totalCost,
    profit: totalAmount - totalCost,
    customerCount: data.customers.length,
    activeCustomerCount: activeCustomerNames.size,
    requestCount: data.usageLogs.length,
    totalTokens,
  };
}

export function rankByAmount(records: ConsumptionRecord[], key: "modelName" | "customerName", limit = 10) {
  const grouped = new Map<string, RankItem>();

  for (const record of records.filter((item) => item.status === "成功")) {
    const name = record[key];
    const current = grouped.get(name) ?? { name, amount: 0, tokens: 0, count: 0 };
    current.amount += record.amount;
    current.tokens += record.inputTokens + record.outputTokens;
    current.count += 1;
    grouped.set(name, current);
  }

  return [...grouped.values()].sort((left, right) => right.amount - left.amount).slice(0, limit);
}

export function buildRanking(data: DealerData, metric: RankMetric, limit = 10): RankItem[] {
  if (metric === "model") {
    return rankByAmount(data.consumptions, "modelName", limit);
  }

  if (metric === "customer") {
    return rankByAmount(data.consumptions, "customerName", limit);
  }

  const salesByCustomer = new Map(data.customers.map((customer) => [customer.company, customer.sales]));
  const grouped = new Map<string, RankItem & { customerNames: Set<string> }>();

  for (const record of data.consumptions.filter((item) => item.status === "成功")) {
    const salesName = salesByCustomer.get(record.customerName) ?? "未分配";
    const current = grouped.get(salesName) ?? {
      name: salesName,
      amount: 0,
      tokens: 0,
      count: 0,
      customerNames: new Set<string>(),
    };
    current.amount += record.amount;
    current.tokens += record.inputTokens + record.outputTokens;
    current.count += 1;
    current.customerNames.add(record.customerName);
    grouped.set(salesName, current);
  }

  return [...grouped.values()]
    .map(({ customerNames, ...item }) => ({
      ...item,
      customerCount: customerNames.size,
      averageAmount: customerNames.size === 0 ? 0 : item.amount / customerNames.size,
    }))
    .sort((left, right) => right.amount - left.amount)
    .slice(0, limit);
}

export function buildTrendSeries(
  records: ConsumptionRecord[],
  metric: TrendMetric,
  range: TrendRange,
  now = new Date(),
): TrendPoint[] {
  const buckets = createTrendBuckets(range, now);

  for (const record of records.filter((item) => item.status === "成功")) {
    const calledAt = parseLocalDateTime(record.calledAt);
    const bucket = buckets.find((item) => calledAt >= item.start && calledAt < item.end);

    if (!bucket) {
      continue;
    }

    bucket.value += getTrendRecordValue(record, metric);
  }

  return buckets.map((bucket, index) => ({
    label: bucket.label,
    value: bucket.value > 0 ? bucket.value : getFallbackTrendValue(metric, range, index, buckets.length),
  }));
}

function createTrendBuckets(range: TrendRange, now: Date) {
  if (range === "today") {
    const hourCount = now.getHours() + 1;
    return Array.from({ length: hourCount }, (_, hour) => {
      const start = startOfDay(now);
      start.setHours(hour, 0, 0, 0);
      const end = new Date(start);
      end.setHours(hour + 1, 0, 0, 0);
      return { label: `${String(hour).padStart(2, "0")}:00`, start, end, value: 0 };
    });
  }

  const dayCount = range === "last7" ? 7 : range === "last30" ? 30 : now.getDate();
  const firstStart = startOfDay(now);
  firstStart.setDate(firstStart.getDate() - dayCount + 1);

  return Array.from({ length: dayCount }, (_, index) => {
    const start = new Date(firstStart);
    start.setDate(firstStart.getDate() + index);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    return { label: `${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`, start, end, value: 0 };
  });
}

function getTrendRecordValue(record: ConsumptionRecord, metric: TrendMetric): number {
  if (metric === "tokens") {
    return record.inputTokens + record.outputTokens;
  }

  if (metric === "calls") {
    return 1;
  }

  return record.amount;
}

function getFallbackTrendValue(metric: TrendMetric, range: TrendRange, index: number, total: number): number {
  const wave = Math.sin((index / Math.max(total - 1, 1)) * Math.PI * 2) * 0.18 + 1;
  const ramp = 0.82 + index * 0.025;
  const rangeFactor = range === "today" ? 0.42 : range === "last7" ? 1 : range === "last30" ? 0.8 : 1.15;

  if (metric === "tokens") {
    return Math.round((420_000 + index * 52_000) * wave * ramp * rangeFactor);
  }

  if (metric === "calls") {
    return Math.max(1, Math.round((18 + index * 2.4) * wave * rangeFactor));
  }

  return Math.round((5200 + index * 460) * wave * ramp * rangeFactor * 100) / 100;
}

function startOfDay(date: Date): Date {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function parseLocalDateTime(value: string): Date {
  return new Date(value.replace(" ", "T"));
}

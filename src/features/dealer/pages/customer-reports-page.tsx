import * as React from "react";
import { Check, ChevronDown, Coins, Download, LineChart, RotateCcw, Search, Trophy, Users, Wallet, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { ConsumptionRecord, DealerData } from "../types";
import { calculateConsumptionCost, formatCurrency, formatNumber, type RankMetric, type TrendMetric } from "../dealer-utils";

type ReportTab = "stats" | "details";
type TimeRange = "today" | "last7" | "last30" | "month" | "lastMonth" | "custom";

interface ReportFilters {
  range: TimeRange;
  customStart: string;
  customEnd: string;
  customerName: string;
  salesName: string;
  modelNames: string[];
}

interface DetailRow {
  customerName: string;
  salesName: string;
  customerStatus: string;
  tokens: number;
  amount: number;
  count: number;
  averageDuration: number;
  lastCalledAt: string;
}

const now = new Date("2026-07-03T14:00:00+08:00");

export function CustomerReportsPage({ data }: { data: DealerData }) {
  const [activeTab, setActiveTab] = React.useState<ReportTab>("stats");
  const [draftFilters, setDraftFilters] = React.useState<ReportFilters>(() => createDefaultFilters(data));
  const [filters, setFilters] = React.useState<ReportFilters>(() => createDefaultFilters(data));
  const reportRecords = React.useMemo(() => buildReportConsumptionRecords(data), [data]);
  const filteredRecords = React.useMemo(() => filterConsumptionRecords(data, reportRecords, filters), [data, reportRecords, filters]);
  const metrics = React.useMemo(() => buildReportMetrics(data, filteredRecords, filters), [data, filteredRecords, filters]);
  const detailRows = React.useMemo(() => buildDetailRows(data, filteredRecords), [data, filteredRecords]);
  const salesOptions = React.useMemo(() => unique(data.customers.map((customer) => customer.sales)), [data.customers]);
  const modelOptions = React.useMemo(() => data.models.map((model) => model.name), [data.models]);

  function resetFilters() {
    const nextFilters = createDefaultFilters(data);
    setDraftFilters(nextFilters);
    setFilters(nextFilters);
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-8">
        {[
          { label: "统计报表", value: "stats" as const },
          { label: "明细报表", value: "details" as const },
        ].map((tab) => (
          <button
            key={tab.value}
            className={`cursor-pointer border-b-2 pb-3 text-sm font-semibold transition-colors ${activeTab === tab.value ? "border-[#1155ff] text-[#1155ff]" : "border-transparent text-slate-400 hover:text-slate-600"}`}
            onClick={() => setActiveTab(tab.value)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      <ReportFilterPanel
        activeTab={activeTab}
        filters={draftFilters}
        customerOptions={data.customers.map((customer) => customer.company)}
        salesOptions={salesOptions}
        modelOptions={modelOptions}
        onChange={setDraftFilters}
        onQuery={() => setFilters(draftFilters)}
        onReset={resetFilters}
      />

      {activeTab === "stats" ? (
        <StatsReport data={data} filters={filters} records={filteredRecords} metrics={metrics} />
      ) : (
        <DetailReport rows={detailRows} />
      )}
    </div>
  );
}

function ReportFilterPanel({
  activeTab,
  filters,
  customerOptions,
  salesOptions,
  modelOptions,
  onChange,
  onQuery,
  onReset,
}: {
  activeTab: ReportTab;
  filters: ReportFilters;
  customerOptions: string[];
  salesOptions: string[];
  modelOptions: string[];
  onChange: (filters: ReportFilters) => void;
  onQuery: () => void;
  onReset: () => void;
}) {
  return (
    <section className="relative z-20 rounded-md border border-slate-200 bg-white px-5 py-4 shadow-sm shadow-slate-100">
      <div className="flex items-center gap-3">
        <div className="w-[140px] shrink-0">
          <Select className="h-10 rounded-md pl-3 focus:border-[#1155ff] focus:ring-blue-100" value={filters.range} onChange={(event) => onChange({ ...filters, range: event.target.value as TimeRange })} aria-label="时间范围">
            <option value="today">今天</option>
            <option value="last7">近7天</option>
            <option value="last30">近30天</option>
            <option value="month">本月</option>
            <option value="lastMonth">上月</option>
            <option value="custom">自定义</option>
          </Select>
        </div>

        {filters.range === "custom" ? (
          <div className="grid w-[260px] shrink-0 grid-cols-2 gap-2">
            <input className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[#1155ff] focus:ring-2 focus:ring-blue-100" type="date" value={filters.customStart} onChange={(event) => onChange({ ...filters, customStart: event.target.value })} />
            <input className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[#1155ff] focus:ring-2 focus:ring-blue-100" type="date" value={filters.customEnd} onChange={(event) => onChange({ ...filters, customEnd: event.target.value })} />
          </div>
        ) : null}

        <FilterSelect ariaLabel="客户名称" className="w-[200px] shrink-0" value={filters.customerName} onChange={(value) => onChange({ ...filters, customerName: value })} options={["全部客户", ...customerOptions]} />
        <FilterSelect ariaLabel="所属销售" className="w-[180px] shrink-0" value={filters.salesName} onChange={(value) => onChange({ ...filters, salesName: value })} options={["全部销售", ...salesOptions]} />
        <ModelMultiSelect value={filters.modelNames} options={modelOptions} onChange={(modelNames) => onChange({ ...filters, modelNames })} />

        <div className="flex shrink-0 gap-2">
          {activeTab === "details" ? (
            <Button className="h-10" variant="secondary">
              <Download className="size-4" />
              导出
            </Button>
          ) : null}
          <Button className="h-10" variant="primary" onClick={onQuery}>
            <Search className="size-4" />
            查询
          </Button>
          <Button className="h-10" variant="secondary" onClick={onReset}>
            <RotateCcw className="size-4" />
            重置
          </Button>
        </div>
      </div>
    </section>
  );
}

function FilterSelect({ ariaLabel, className, value, options, onChange }: { ariaLabel: string; className?: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <div className={className}>
      <Select className="h-10 rounded-md pl-3 focus:border-[#1155ff] focus:ring-blue-100" value={value} onChange={(event) => onChange(event.target.value)} aria-label={ariaLabel}>
        {options.map((option) => <option key={option}>{option}</option>)}
      </Select>
    </div>
  );
}

function ModelMultiSelect({ value, options, onChange }: { value: string[]; options: string[]; onChange: (value: string[]) => void }) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const normalizedValue = value.length === 0 ? ["全部模型"] : value;
  const isAll = normalizedValue.includes("全部模型");
  const display = isAll ? "全部模型" : normalizedValue.length === 1 ? normalizedValue[0] : `已选 ${normalizedValue.length} 个模型`;

  React.useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  function toggleModel(model: string) {
    if (model === "全部模型") {
      onChange(["全部模型"]);
      return;
    }
    const withoutAll = normalizedValue.filter((item) => item !== "全部模型");
    const nextValue = withoutAll.includes(model) ? withoutAll.filter((item) => item !== model) : [...withoutAll, model];
    onChange(nextValue.length === 0 ? ["全部模型"] : nextValue);
  }

  return (
    <div ref={rootRef} className="relative w-[220px] shrink-0">
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex h-10 w-full cursor-pointer items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 text-left text-sm font-medium text-slate-700 outline-none transition-colors hover:border-slate-300 focus:border-[#1155ff] focus:ring-2 focus:ring-blue-100"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="truncate">{display}</span>
        <ChevronDown className={`size-4 shrink-0 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="absolute left-0 top-11 z-30 max-h-64 w-full overflow-auto rounded-md border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/70" role="listbox" aria-label="模型">
          {["全部模型", ...options].map((model) => {
            const checked = model === "全部模型" ? isAll : !isAll && normalizedValue.includes(model);
            return (
              <button
                key={model}
                className={`flex h-9 w-full cursor-pointer items-center gap-2 rounded px-2.5 text-left text-sm transition-colors ${checked ? "bg-blue-50 text-[#1155ff]" : "text-slate-700 hover:bg-slate-50"}`}
                onClick={() => toggleModel(model)}
                type="button"
                role="option"
                aria-selected={checked}
              >
                <span className={`flex size-4 items-center justify-center rounded border ${checked ? "border-[#1155ff] bg-[#1155ff] text-white" : "border-slate-300"}`}>
                  {checked ? <Check className="size-3" /> : null}
                </span>
                <span className="truncate">{model}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function StatsReport({ data, filters, records, metrics }: { data: DealerData; filters: ReportFilters; records: ConsumptionRecord[]; metrics: ReturnType<typeof buildReportMetrics> }) {
  const [trendMetric, setTrendMetric] = React.useState<TrendMetric>("amount");
  const [rankMetric, setRankMetric] = React.useState<RankMetric>("model");
  const trendPoints = React.useMemo(() => buildReportTrend(records, trendMetric, filters), [records, trendMetric, filters]);
  const ranks = React.useMemo(() => buildReportRanking(data, records, rankMetric), [data, records, rankMetric]);
  const maxRankAmount = Math.max(...ranks.map((item) => item.amount), 1);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        <ReportMetric icon={Wallet} tone="cyan" label="消费总额" value={formatCurrency(metrics.amount)} helperLabel="户均消费" helperValue={formatCurrency(metrics.averageCustomerSpend)} />
        <ReportMetric icon={Coins} tone="pink" label="总成本" value={formatCurrency(metrics.cost)} helperLabel="净利润" helperValue={formatCurrency(metrics.profit)} />
        <ReportMetric icon={Users} tone="blue" label="客户总数" value={formatNumber(metrics.customerCount)} helperLabel="活跃客户数" helperValue={formatNumber(metrics.activeCustomerCount)} />
        <ReportMetric icon={Zap} tone="indigo" label="请求总次数" value={formatNumber(metrics.requestCount)} helperLabel="消耗 Tokens" helperValue={formatNumber(metrics.tokens)} />
      </div>

      <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm shadow-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LineChart className="size-5 text-slate-400" />
            <h2 className="text-lg font-bold text-slate-950">模型数据分析</h2>
          </div>
          <MetricTabs value={trendMetric} onChange={setTrendMetric} />
        </div>
        <MiniTrendChart metric={trendMetric} points={trendPoints} />
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm shadow-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="size-5 text-slate-400" />
            <h2 className="text-lg font-bold text-slate-950">排行榜</h2>
          </div>
          <RankingTabs value={rankMetric} onChange={setRankMetric} />
        </div>
        <RankBars items={ranks} maxAmount={maxRankAmount} />
      </section>
    </div>
  );
}

function DetailReport({ rows }: { rows: DetailRow[] }) {
  return (
    <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm shadow-slate-100">
      <table className="min-w-full border-separate border-spacing-0 text-sm">
        <thead className="bg-slate-50 text-left text-slate-500">
          <tr>
            {["客户名称", "所属销售", "客户状态", "消耗Token", "消费金额（¥）", "调用次数", "平均响应时间（ms）", "最后调用时间"].map((label) => (
              <th key={label} className="h-12 whitespace-nowrap border-b border-slate-200 px-4 font-medium">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td className="h-24 px-4 text-center text-slate-500" colSpan={8}>暂无匹配数据</td></tr>
          ) : null}
          {rows.map((row) => (
            <tr key={row.customerName} className="hover:bg-slate-50/70">
              <td className="border-b border-slate-100 px-4 py-3 text-slate-700">{row.customerName}</td>
              <td className="border-b border-slate-100 px-4 py-3 text-slate-700">{row.salesName}</td>
              <td className="border-b border-slate-100 px-4 py-3 text-slate-700">{row.customerStatus}</td>
              <td className="border-b border-slate-100 px-4 py-3 text-slate-700">{formatNumber(row.tokens)}</td>
              <td className="border-b border-slate-100 px-4 py-3 text-slate-700">{formatCurrency(row.amount)}</td>
              <td className="border-b border-slate-100 px-4 py-3 text-slate-700">{formatNumber(row.count)}</td>
              <td className="border-b border-slate-100 px-4 py-3 text-slate-700">{formatNumber(row.averageDuration)}</td>
              <td className="border-b border-slate-100 px-4 py-3 text-slate-700">{row.lastCalledAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function ReportMetric({ icon: Icon, tone, label, value, helperLabel, helperValue }: { icon: React.ComponentType<{ className?: string }>; tone: "cyan" | "pink" | "blue" | "indigo"; label: string; value: string; helperLabel: string; helperValue: string }) {
  const toneClasses = {
    cyan: { card: "from-white to-cyan-50", icon: "border-cyan-200 bg-cyan-100/70 text-cyan-500" },
    pink: { card: "from-white to-pink-50", icon: "border-pink-200 bg-pink-100/70 text-pink-400" },
    blue: { card: "from-white to-blue-50", icon: "border-blue-200 bg-blue-100/70 text-blue-500" },
    indigo: { card: "from-white to-blue-50", icon: "border-blue-200 bg-blue-100/70 text-[#1155ff]" },
  }[tone];

  return (
    <div className={`min-h-[118px] rounded-md border border-slate-200 bg-gradient-to-br ${toneClasses.card} p-5 shadow-sm shadow-slate-100`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs text-slate-400">{label}</div>
          <div className="mt-1 truncate text-2xl font-semibold tracking-tight text-slate-950">{value}</div>
          <div className="mt-4 text-xs text-slate-400">{helperLabel}</div>
          <div className="mt-1 truncate text-xl font-semibold tracking-tight text-slate-950">{helperValue}</div>
        </div>
        <div className={`flex size-12 shrink-0 items-center justify-center rounded-full border ${toneClasses.icon}`}>
          <Icon className="size-6" />
        </div>
      </div>
    </div>
  );
}

function MetricTabs({ value, onChange }: { value: TrendMetric; onChange: (value: TrendMetric) => void }) {
  const items: Array<{ label: string; value: TrendMetric }> = [
    { label: "消耗金额", value: "amount" },
    { label: "消耗Tokens", value: "tokens" },
    { label: "调用次数", value: "calls" },
  ];
  return <TabButtons items={items} value={value} onChange={onChange} />;
}

function RankingTabs({ value, onChange }: { value: RankMetric; onChange: (value: RankMetric) => void }) {
  const items: Array<{ label: string; value: RankMetric }> = [
    { label: "模型消耗", value: "model" },
    { label: "销售人员消耗", value: "sales" },
    { label: "客户消耗", value: "customer" },
  ];
  return <TabButtons items={items} value={value} onChange={onChange} />;
}

function TabButtons<T extends string>({ items, value, onChange }: { items: Array<{ label: string; value: T }>; value: T; onChange: (value: T) => void }) {
  return (
    <div className="flex gap-6">
      {items.map((item) => (
        <button key={item.value} className={`border-b-2 pb-2 text-sm font-medium ${value === item.value ? "border-[#1155ff] text-[#1155ff]" : "border-transparent text-slate-400 hover:text-slate-600"}`} onClick={() => onChange(item.value)} type="button">
          {item.label}
        </button>
      ))}
    </div>
  );
}

function MiniTrendChart({ metric, points }: { metric: TrendMetric; points: Array<{ label: string; value: number }> }) {
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  const width = 1200;
  const height = 300;
  const plot = { top: 32, right: 1180, bottom: 250, left: 44 };
  const maxValue = Math.max(...points.map((point) => point.value), 1);
  const polyline = points.map((point, index) => `${pointX(index, points.length, plot)},${plot.bottom - (point.value / maxValue) * (plot.bottom - plot.top)}`).join(" ");
  const hovered = hoveredIndex === null ? null : points[hoveredIndex];

  return (
    <div className="mt-6 h-[300px] overflow-hidden">
      <svg className="h-full w-full" viewBox={`0 0 ${width} ${height}`}>
        {[0, 1, 2, 3, 4].map((tick) => <line key={tick} x1={plot.left} x2={plot.right} y1={plot.top + tick * 54} y2={plot.top + tick * 54} stroke="#eef1f5" />)}
        {points.map((point, index) => {
          const x = pointX(index, points.length, plot);
          return <line key={`${point.label}-${index}`} x1={x} x2={x} y1={plot.top} y2={plot.bottom} stroke="#f3f5f8" />;
        })}
        <polyline points={polyline} fill="none" stroke="#3a6fff" strokeWidth="2.5" />
        {points.map((point, index) => {
          const x = pointX(index, points.length, plot);
          const y = plot.bottom - (point.value / maxValue) * (plot.bottom - plot.top);
          return (
            <g key={`${point.label}-${index}`} onMouseEnter={() => setHoveredIndex(index)} onMouseLeave={() => setHoveredIndex(null)}>
              <circle cx={x} cy={y} r={hoveredIndex === index ? 5 : 3} fill="#3a6fff" />
              <circle cx={x} cy={y} r="14" className="cursor-pointer" fill="transparent" />
            </g>
          );
        })}
        {points.filter((_, index) => index === 0 || index === points.length - 1 || index % Math.ceil(points.length / 6) === 0).map((point, index, labels) => {
          const originalIndex = points.indexOf(point);
          const x = pointX(originalIndex, points.length, plot);
          return <text key={`${point.label}-${index}`} x={x} y="285" fill="#9ca3af" fontSize="13" textAnchor={index === 0 ? "start" : index === labels.length - 1 ? "end" : "middle"}>{point.label}</text>;
        })}
        {hovered ? (
          <foreignObject x={Math.min(pointX(hoveredIndex ?? 0, points.length, plot) + 12, plot.right - 180)} y="42" width="170" height="70">
            <div className="rounded-md border border-slate-100 bg-white/95 p-3 text-xs shadow-xl shadow-slate-200">
              <div className="font-semibold text-slate-950">{hovered.label}</div>
              <div className="mt-2 font-semibold text-slate-900">{formatTrendValue(hovered.value, metric)}</div>
            </div>
          </foreignObject>
        ) : null}
      </svg>
    </div>
  );
}

function RankBars({ items, maxAmount }: { items: Array<{ name: string; amount: number; tokens: number; count: number }>; maxAmount: number }) {
  const colors = ["bg-[#1155ff]", "bg-[#14c8e5]", "bg-[#f25be9]"];
  return (
    <div className="mt-5 space-y-3">
      {items.map((item, index) => (
        <div key={item.name} className="flex items-center gap-3 text-sm">
          <span className="w-[180px] truncate text-slate-500">{item.name}</span>
          <div className="h-3 flex-1 bg-slate-50">
            <div className={`h-full ${colors[index] ?? "bg-slate-300"}`} style={{ width: `${(item.amount / maxAmount) * 100}%` }} />
          </div>
          <span className="w-28 text-right font-medium text-slate-700">{formatCurrency(item.amount)}</span>
        </div>
      ))}
    </div>
  );
}

function createDefaultFilters(data: DealerData): ReportFilters {
  return {
    range: "last30",
    customStart: "2026-07-01",
    customEnd: "2026-07-03",
    customerName: "全部客户",
    salesName: "全部销售",
    modelNames: ["全部模型"],
  };
}

function buildReportConsumptionRecords(data: DealerData): ConsumptionRecord[] {
  const existingIds = new Set(data.consumptions.map((record) => record.id));
  const generatedRecords: ConsumptionRecord[] = [];
  const availableModels = data.models.filter((model) => model.status === "可用");
  const reportStart = startOfDay(now);
  reportStart.setDate(reportStart.getDate() - 44);

  for (const [customerIndex, customer] of data.customers.entries()) {
    const customerCreatedAt = parseLocalDateTime(customer.createdAt);
    const customerApiKeys = data.apiKeys.filter((key) => key.customerName === customer.company && key.status === "已启用");
    const customerModels = unique([
      ...customerApiKeys.map((key) => key.modelName),
      ...availableModels
        .filter((_, modelIndex) => (modelIndex + customerIndex) % 2 === 0)
        .slice(0, 2)
        .map((model) => model.name),
    ]).filter((modelName) => data.models.some((model) => model.name === modelName));

    for (let dayIndex = 0; dayIndex < 45; dayIndex += 1) {
      const day = new Date(reportStart);
      day.setDate(reportStart.getDate() + dayIndex);
      if (day < startOfDay(customerCreatedAt) || day > now) {
        continue;
      }

      for (const [modelIndex, modelName] of customerModels.entries()) {
        const activityScore = stableNumber(`${customer.id}-${modelName}-${dayIndex}`, 100);
        const frequency = customer.status === "正常" ? 64 : customer.status === "未激活" ? 24 : 42;
        if (activityScore > frequency) {
          continue;
        }

        const model = data.models.find((item) => item.name === modelName);
        const baseTokens = model?.type === "视频" ? 45_000 : 90_000;
        const inputTokens = baseTokens + stableNumber(`${customer.id}-${modelName}-input-${dayIndex}`, model?.type === "视频" ? 70_000 : 420_000);
        const outputTokens = Math.round(inputTokens * (0.42 + stableNumber(`${customer.id}-${modelName}-ratio-${dayIndex}`, 28) / 100));
        const inputPrice = model?.inputPrice ?? 6;
        const outputPrice = model?.outputPrice ?? 18;
        const amount = roundCurrency(((inputTokens / 1_000_000) * inputPrice + (outputTokens / 1_000_000) * outputPrice) * 1000);
        const hour = 9 + stableNumber(`${customer.id}-${modelName}-hour-${dayIndex}`, 10);
        const minute = stableNumber(`${customer.id}-${modelName}-minute-${dayIndex}`, 60);
        const calledAt = `${formatDate(day)} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
        const apiKey = customerApiKeys.find((key) => key.modelName === modelName);
        const id = `report-${customer.id}-${modelName}-${formatDate(day)}`.replace(/\s+/g, "-");

        if (existingIds.has(id)) {
          continue;
        }

        generatedRecords.push({
          id,
          recordNo: `RPT${formatDate(day).replace(/-/g, "")}${String(generatedRecords.length + 1).padStart(4, "0")}`,
          customerName: customer.company,
          registerPhone: customer.loginAccount,
          keyName: apiKey?.keyName ?? "默认统计 Key",
          modelName,
          inputTokens,
          outputTokens,
          amount,
          calledAt,
          status: "成功",
          createdAt: calledAt,
          updatedAt: calledAt,
        });
      }
    }
  }

  return [...data.consumptions, ...generatedRecords];
}

function filterConsumptionRecords(data: DealerData, records: ConsumptionRecord[], filters: ReportFilters) {
  const { start, end } = getDateRange(filters);
  const salesByCustomer = new Map(data.customers.map((customer) => [customer.company, customer.sales]));

  return records.filter((record) => {
    const calledAt = parseLocalDateTime(record.calledAt);
    return calledAt >= start
      && calledAt < end
      && record.status === "成功"
      && (filters.customerName === "全部客户" || record.customerName === filters.customerName)
      && (filters.salesName === "全部销售" || salesByCustomer.get(record.customerName) === filters.salesName)
      && (filters.modelNames.includes("全部模型") || filters.modelNames.includes(record.modelName));
  });
}

function buildReportMetrics(data: DealerData, records: ConsumptionRecord[], filters: ReportFilters) {
  const customerNames = new Set(records.map((record) => record.customerName));
  const tokens = records.reduce((sum, record) => sum + record.inputTokens + record.outputTokens, 0);
  const amount = records.reduce((sum, record) => sum + record.amount, 0);
  const cost = records.reduce((sum, record) => sum + calculateConsumptionCost(record, data), 0);
  const { end } = getDateRange(filters);
  const scopedCustomers = data.customers.filter((customer) =>
    (filters.customerName === "全部客户" || customer.company === filters.customerName)
    && (filters.salesName === "全部销售" || customer.sales === filters.salesName)
    && parseLocalDateTime(customer.createdAt) < end
    && (filters.modelNames.includes("全部模型") || customerNames.has(customer.company)),
  );

  return {
    customerCount: scopedCustomers.length,
    activeCustomerCount: customerNames.size,
    tokens,
    amount,
    cost,
    profit: amount - cost,
    keyCount: data.apiKeys.filter((key) => scopedCustomers.some((customer) => customer.company === key.customerName)).length,
    requestCount: records.length,
    averageCustomerSpend: scopedCustomers.length === 0 ? 0 : amount / scopedCustomers.length,
  };
}

function buildDetailRows(data: DealerData, records: ConsumptionRecord[]): DetailRow[] {
  const customers = new Map(data.customers.map((customer) => [customer.company, customer]));
  const logsByCustomer = new Map(data.usageLogs.map((log) => [`${log.customerName}-${log.modelName}`, log.durationMs]));
  const grouped = new Map<string, DetailRow>();

  for (const record of records) {
    const customer = customers.get(record.customerName);
    const current = grouped.get(record.customerName) ?? {
      customerName: record.customerName,
      salesName: customer?.sales ?? "-",
      customerStatus: customer?.status ?? "-",
      tokens: 0,
      amount: 0,
      count: 0,
      averageDuration: 0,
      lastCalledAt: record.calledAt,
    };
    current.tokens += record.inputTokens + record.outputTokens;
    current.amount += record.amount;
    current.count += 1;
    current.averageDuration += logsByCustomer.get(`${record.customerName}-${record.modelName}`) ?? estimateDuration(record);
    current.lastCalledAt = parseLocalDateTime(record.calledAt) > parseLocalDateTime(current.lastCalledAt) ? record.calledAt : current.lastCalledAt;
    grouped.set(record.customerName, current);
  }

  return [...grouped.values()].map((row) => ({ ...row, averageDuration: row.count === 0 ? 0 : Math.round(row.averageDuration / row.count) }));
}

function buildReportTrend(records: ConsumptionRecord[], metric: TrendMetric, filters: ReportFilters) {
  const { start, end } = getDateRange(filters);
  const dayCount = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000));
  const buckets = Array.from({ length: dayCount }, (_, index) => {
    const bucketStart = new Date(start);
    bucketStart.setDate(start.getDate() + index);
    const bucketEnd = new Date(bucketStart);
    bucketEnd.setDate(bucketStart.getDate() + 1);
    return { label: `${String(bucketStart.getMonth() + 1).padStart(2, "0")}-${String(bucketStart.getDate()).padStart(2, "0")}`, start: bucketStart, end: bucketEnd, value: 0 };
  });

  for (const record of records) {
    const calledAt = parseLocalDateTime(record.calledAt);
    const bucket = buckets.find((item) => calledAt >= item.start && calledAt < item.end);
    if (!bucket) continue;
    bucket.value += metric === "amount" ? record.amount : metric === "tokens" ? record.inputTokens + record.outputTokens : 1;
  }

  return buckets.map(({ label, value }) => ({ label, value }));
}

function buildReportRanking(data: DealerData, records: ConsumptionRecord[], metric: RankMetric) {
  const salesByCustomer = new Map(data.customers.map((customer) => [customer.company, customer.sales]));
  const grouped = new Map<string, { name: string; amount: number; tokens: number; count: number }>();

  for (const record of records) {
    const name = metric === "model" ? record.modelName : metric === "sales" ? salesByCustomer.get(record.customerName) ?? "未分配" : record.customerName;
    const current = grouped.get(name) ?? { name, amount: 0, tokens: 0, count: 0 };
    current.amount += record.amount;
    current.tokens += record.inputTokens + record.outputTokens;
    current.count += 1;
    grouped.set(name, current);
  }

  return [...grouped.values()].sort((left, right) => right.amount - left.amount).slice(0, 10);
}

function getDateRange(filters: ReportFilters) {
  const start = startOfDay(now);
  const end = startOfDay(now);
  end.setDate(end.getDate() + 1);

  if (filters.range === "today") return { start, end };
  if (filters.range === "last7") {
    start.setDate(start.getDate() - 6);
    return { start, end };
  }
  if (filters.range === "last30") {
    start.setDate(start.getDate() - 29);
    return { start, end };
  }
  if (filters.range === "month") {
    start.setDate(1);
    return { start, end };
  }
  if (filters.range === "lastMonth") {
    start.setMonth(start.getMonth() - 1, 1);
    end.setDate(1);
    return { start, end };
  }

  return {
    start: parseLocalDateTime(`${filters.customStart} 00:00`),
    end: addDays(parseLocalDateTime(`${filters.customEnd} 00:00`), 1),
  };
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function pointX(index: number, total: number, plot: { left: number; right: number }) {
  return total <= 1 ? plot.left : plot.left + (index / (total - 1)) * (plot.right - plot.left);
}

function startOfDay(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function parseLocalDateTime(value: string) {
  return new Date(value.replace(" ", "T"));
}

function formatDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatTrendValue(value: number, metric: TrendMetric) {
  if (metric === "amount") return formatCurrency(value);
  if (metric === "tokens") return `${formatNumber(value)} Tokens`;
  return `${formatNumber(value)} 次`;
}

function stableNumber(seed: string, max: number) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash % max;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function estimateDuration(record: ConsumptionRecord) {
  const tokens = record.inputTokens + record.outputTokens;
  const baseDuration = record.modelName.includes("Video") ? 8_000 : 1_200;
  return Math.round(baseDuration + tokens / 420 + stableNumber(`${record.customerName}-${record.modelName}-${record.calledAt}`, 1_600));
}

function unique(values: string[]) {
  return [...new Set(values)];
}

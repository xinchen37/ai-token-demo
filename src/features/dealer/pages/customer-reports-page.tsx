import * as React from "react";
import {
  BarChart3,
  Check,
  ChevronDown,
  Coins,
  Download,
  LineChart,
  RotateCcw,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { ConsumptionRecord, DealerData } from "../types";
import { formatCurrency, formatNumber } from "../dealer-utils";

type ReportTab = "stats" | "details";
type TimeRange = "last30" | "last7" | "custom";
type ReportTrendMetric = "amount" | "tokens" | "calls";
type ReportTrendRange = "today" | "last7" | "last30" | "month";

interface ReportFilters {
  range: TimeRange;
  customStart: string;
  customEnd: string;
  customerName: string;
  modelNames: string[];
}

interface DetailRow {
  customerName: string;
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
  const [filters, setFilters] = React.useState<ReportFilters>(() =>
    createDefaultFilters(data),
  );
  const reportRecords = React.useMemo(
    () => buildReportConsumptionRecords(data),
    [data],
  );
  const filteredRecords = React.useMemo(
    () => filterConsumptionRecords(data, reportRecords, filters),
    [data, reportRecords, filters],
  );
  const metrics = React.useMemo(
    () => buildReportMetrics(filteredRecords),
    [filteredRecords],
  );
  const detailRows = React.useMemo(
    () => buildDetailRows(data, filteredRecords),
    [data, filteredRecords],
  );
  const modelOptions = React.useMemo(
    () => data.models.map((model) => model.name),
    [data.models],
  );

  function resetFilters() {
    const nextFilters = createDefaultFilters(data);
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
        filters={filters}
        customerOptions={data.customers.map((customer) => customer.company)}
        modelOptions={modelOptions}
        onChange={setFilters}
        onReset={resetFilters}
      />

      {activeTab === "stats" ? (
        <StatsReport
          data={data}
          filters={filters}
          records={filteredRecords}
          metrics={metrics}
        />
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
  modelOptions,
  onChange,
  onReset,
}: {
  activeTab: ReportTab;
  filters: ReportFilters;
  customerOptions: string[];
  modelOptions: string[];
  onChange: (filters: ReportFilters) => void;
  onReset: () => void;
}) {
  return (
    <section className="relative z-20 rounded-md border border-slate-200 bg-white px-5 py-4 shadow-sm shadow-slate-100">
      <div className="flex flex-wrap items-center gap-3">
        <FilterSelect
          ariaLabel="客户名称"
          className="w-[200px] shrink-0"
          value={filters.customerName}
          onChange={(value) => onChange({ ...filters, customerName: value })}
          options={["全部客户", ...customerOptions]}
        />
        <ModelMultiSelect
          value={filters.modelNames}
          options={modelOptions}
          onChange={(modelNames) => onChange({ ...filters, modelNames })}
        />

        <div className="ml-auto flex shrink-0 gap-2">
          {activeTab === "details" ? (
            <Button className="h-10" variant="secondary">
              <Download className="size-4" />
              导出
            </Button>
          ) : null}
          <Button className="h-10" variant="secondary" onClick={onReset}>
            <RotateCcw className="size-4" />
            重置
          </Button>
        </div>
      </div>
    </section>
  );
}

function FilterSelect({
  ariaLabel,
  className,
  value,
  options,
  onChange,
}: {
  ariaLabel: string;
  className?: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className={className}>
      <Select
        className="h-10 rounded-md pl-3 focus:border-[#1155ff] focus:ring-blue-100"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={ariaLabel}
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </Select>
    </div>
  );
}

function ModelMultiSelect({
  value,
  options,
  onChange,
}: {
  value: string[];
  options: string[];
  onChange: (value: string[]) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const normalizedValue = value.length === 0 ? ["全部模型"] : value;
  const isAll = normalizedValue.includes("全部模型");
  const display = isAll
    ? "全部模型"
    : normalizedValue.length === 1
      ? normalizedValue[0]
      : `已选 ${normalizedValue.length} 个模型`;

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
    const nextValue = withoutAll.includes(model)
      ? withoutAll.filter((item) => item !== model)
      : [...withoutAll, model];
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
        <ChevronDown
          className={`size-4 shrink-0 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <div
          className="absolute left-0 top-11 z-30 max-h-64 w-full overflow-auto rounded-md border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/70"
          role="listbox"
          aria-label="模型"
        >
          {["全部模型", ...options].map((model) => {
            const checked =
              model === "全部模型"
                ? isAll
                : !isAll && normalizedValue.includes(model);
            return (
              <button
                key={model}
                className={`flex h-9 w-full cursor-pointer items-center gap-2 rounded px-2.5 text-left text-sm transition-colors ${checked ? "bg-blue-50 text-[#1155ff]" : "text-slate-700 hover:bg-slate-50"}`}
                onClick={() => toggleModel(model)}
                type="button"
                role="option"
                aria-selected={checked}
              >
                <span
                  className={`flex size-4 items-center justify-center rounded border ${checked ? "border-[#1155ff] bg-[#1155ff] text-white" : "border-slate-300"}`}
                >
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

function StatsReport({
  filters,
  records,
  metrics,
}: {
  data: DealerData;
  filters: ReportFilters;
  records: ConsumptionRecord[];
  metrics: ReturnType<typeof buildReportMetrics>;
}) {
  const [trendMetric, setTrendMetric] =
    React.useState<ReportTrendMetric>("amount");
  const [trendRange, setTrendRange] =
    React.useState<ReportTrendRange>("today");
  const timeSeries = React.useMemo(
    () => buildTimeSeries(records, filters),
    [filters, records],
  );
  const trendTimeSeries = React.useMemo(
    () => buildReportTrendTimeSeries(records, filters, trendRange),
    [filters, records, trendRange],
  );
  const modelNames = React.useMemo(
    () => unique(records.map((record) => record.modelName)),
    [records],
  );
  const trendItems = React.useMemo(
    () => [
      {
        label: "消耗金额",
        title: "消耗金额趋势图表",
        metric: "amount" as const,
        points: trendTimeSeries.map((item) => ({
          label: item.label,
          value: item.amount,
        })),
      },
      {
        label: "消耗Tokens",
        title: "消耗Tokens趋势图表",
        metric: "tokens" as const,
        points: trendTimeSeries.map((item) => ({
          label: item.label,
          value: item.tokens,
        })),
      },
      {
        label: "调用次数",
        title: "调用次数趋势图表",
        metric: "calls" as const,
        points: trendTimeSeries.map((item) => ({
          label: item.label,
          value: item.count,
        })),
      },
    ],
    [trendTimeSeries],
  );
  const activeTrend =
    trendItems.find((item) => item.metric === trendMetric) ?? trendItems[0];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        <ReportMetric
          icon={Wallet}
          tone="cyan"
          label="消费总额（¥）"
          value={formatCurrency(metrics.amount)}
        />
        <ReportMetric
          icon={Coins}
          tone="pink"
          label="消耗Token总数"
          value={formatTokenOverview(metrics.tokens)}
        />
        <ReportMetric
          icon={Zap}
          tone="indigo"
          label="请求总次数"
          value={formatNumber(metrics.requestCount)}
        />
        <ReportMetric
          icon={Users}
          tone="blue"
          label="客户总数"
          value={formatNumber(metrics.customerCount)}
        />
      </div>

      <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm shadow-slate-100">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex shrink-0 items-center gap-3">
            <LineChart className="size-5 text-slate-400" />
            <h2 className="text-lg font-bold text-slate-950">模型趋势分析</h2>
          </div>
          <ReportTrendRangeTabs value={trendRange} onChange={setTrendRange} />
        </div>
        <div className="mt-6 space-y-4">
          <ReportTrendMetricTabs
            items={trendItems}
            value={trendMetric}
            onChange={setTrendMetric}
          />
          <ReportTrendChart
            title={activeTrend.title}
            metric={activeTrend.metric}
            points={activeTrend.points}
          />
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm shadow-slate-100">
        <div className="flex items-center gap-3">
          <BarChart3 className="size-5 text-slate-400" />
          <h2 className="text-lg font-bold text-slate-950">模型数据分析</h2>
        </div>
        <div className="mt-5 space-y-4">
          <TimeBarChart
            title="模型消耗金额"
            items={timeSeries.map((item) => ({
              label: item.label,
              total: item.amount,
              byModel: item.amountByModel,
            }))}
            modelNames={modelNames}
            formatValue={formatCurrency}
            tone="blue"
          />
          <TimeBarChart
            title="模型消耗Tokens"
            items={timeSeries.map((item) => ({
              label: item.label,
              total: item.tokens,
              byModel: item.tokensByModel,
            }))}
            modelNames={modelNames}
            formatValue={formatNumber}
            tone="cyan"
          />
          <TimeBarChart
            title="模型调用次数"
            items={timeSeries.map((item) => ({
              label: item.label,
              total: item.count,
              byModel: item.countByModel,
            }))}
            modelNames={modelNames}
            formatValue={(value) => `${formatNumber(value)} 次`}
            tone="pink"
          />
        </div>
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
            {[
              "客户名称",
              "客户状态",
              "消耗Token",
              "消费金额（¥）",
              "调用次数",
              "平均响应时间（ms）",
              "最后调用时间",
            ].map((label) => (
              <th
                key={label}
                className="h-12 whitespace-nowrap border-b border-slate-200 px-4 font-medium"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="h-24 px-4 text-center text-slate-500" colSpan={7}>
                暂无匹配数据
              </td>
            </tr>
          ) : null}
          {rows.map((row) => (
            <tr key={row.customerName} className="hover:bg-slate-50/70">
              <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                {row.customerName}
              </td>
              <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                {row.customerStatus}
              </td>
              <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                {formatNumber(row.tokens)}
              </td>
              <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                {formatCurrency(row.amount)}
              </td>
              <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                {formatNumber(row.count)}
              </td>
              <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                {formatNumber(row.averageDuration)}
              </td>
              <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                {row.lastCalledAt}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function ReportMetric({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: "cyan" | "pink" | "blue" | "indigo";
  label: string;
  value: string;
}) {
  const toneClasses = {
    cyan: {
      card: "from-white to-cyan-50",
      icon: "border-cyan-200 bg-cyan-100/70 text-cyan-500",
    },
    pink: {
      card: "from-white to-pink-50",
      icon: "border-pink-200 bg-pink-100/70 text-pink-400",
    },
    blue: {
      card: "from-white to-blue-50",
      icon: "border-blue-200 bg-blue-100/70 text-blue-500",
    },
    indigo: {
      card: "from-white to-blue-50",
      icon: "border-blue-200 bg-blue-100/70 text-[#1155ff]",
    },
  }[tone];

  return (
    <div
      className={`min-h-[112px] rounded-md border border-slate-200 bg-gradient-to-br ${toneClasses.card} p-5 shadow-sm shadow-slate-100`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs text-slate-400">{label}</div>
          <div
            className="mt-4 whitespace-nowrap text-[clamp(1.35rem,1.55vw,1.9rem)] font-semibold tracking-tight text-slate-950"
            title={value}
          >
            {value}
          </div>
        </div>
        <div
          className={`flex size-12 shrink-0 items-center justify-center rounded-full border ${toneClasses.icon}`}
        >
          <Icon className="size-6" />
        </div>
      </div>
    </div>
  );
}

function ReportTrendRangeTabs({
  value,
  onChange,
}: {
  value: ReportTrendRange;
  onChange: (value: ReportTrendRange) => void;
}) {
  const items: Array<{ label: string; value: ReportTrendRange }> = [
    { label: "今天", value: "today" },
    { label: "近7天", value: "last7" },
    { label: "近30天", value: "last30" },
    { label: "本月", value: "month" },
  ];

  return (
    <div className="flex h-10 items-center rounded-md bg-slate-50 p-1">
      {items.map((item) => (
        <button
          key={item.value}
          className={`h-8 rounded px-5 text-sm font-medium transition-colors ${
            value === item.value
              ? "bg-white text-slate-950 shadow-sm"
              : "text-slate-400 hover:text-slate-600"
          }`}
          onClick={() => onChange(item.value)}
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function ReportTrendMetricTabs({
  items,
  value,
  onChange,
}: {
  items: Array<{ label: string; metric: ReportTrendMetric }>;
  value: ReportTrendMetric;
  onChange: (value: ReportTrendMetric) => void;
}) {
  return (
    <div className="flex gap-8">
      {items.map((item) => (
        <button
          key={item.metric}
          className={`border-b-2 pb-2 text-sm font-semibold transition-colors ${
            value === item.metric
              ? "border-[#1155ff] text-[#1155ff]"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
          onClick={() => onChange(item.metric)}
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function ReportTrendChart({
  metric,
  points,
  title,
}: {
  metric: ReportTrendMetric;
  points: Array<{ label: string; value: number }>;
  title: string;
}) {
  const chartRef = React.useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  const [chartWidth, setChartWidth] = React.useState(1200);
  const chartHeight = 380;
  const plot = getReportTrendPlot(chartWidth);
  const maxValue = Math.max(...points.map((point) => point.value), 1);
  const chartMax = maxValue * 1.08;
  const polylinePoints = points
    .map((point, index) => {
      const { x, y } = getReportTrendPoint(
        point,
        index,
        points.length,
        chartMax,
        plot,
      );
      return `${x},${y}`;
    })
    .join(" ");
  const labelStep = points.length > 12 ? Math.ceil(points.length / 7) : 1;
  const labelCandidates = points
    .map((point, index) => ({ point, index }))
    .filter(
      ({ index }) =>
        index === 0 || index === points.length - 1 || index % labelStep === 0,
    );
  const minLabelGap = 96;
  const visibleLabels = labelCandidates.reduce<Array<(typeof labelCandidates)[number]>>(
    (labels, candidate) => {
      const candidateX = getReportTrendPoint(
        candidate.point,
        candidate.index,
        points.length,
        chartMax,
        plot,
      ).x;
      const previous = labels.at(-1);

      if (!previous) return [candidate];

      const previousX = getReportTrendPoint(
        previous.point,
        previous.index,
        points.length,
        chartMax,
        plot,
      ).x;

      if (candidateX - previousX >= minLabelGap) {
        return [...labels, candidate];
      }

      if (candidate.index === points.length - 1) {
        return [...labels.slice(0, -1), candidate];
      }

      return labels;
    },
    [],
  );
  const hoveredPoint =
    hoveredIndex === null
      ? null
      : getReportTrendPoint(
          points[hoveredIndex],
          hoveredIndex,
          points.length,
          chartMax,
          plot,
        );

  React.useLayoutEffect(() => {
    const element = chartRef.current;
    if (!element) return;

    const updateWidth = () =>
      setChartWidth(Math.max(760, Math.round(element.clientWidth)));
    updateWidth();

    if (typeof ResizeObserver === "undefined") return;
    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div ref={chartRef} className="mt-8 h-[380px] overflow-hidden">
      {points.length === 0 ? (
        <div className="py-8 text-center text-sm text-slate-400">暂无数据</div>
      ) : (
        <svg
          className="h-full w-full"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          role="img"
          aria-label={title}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
            const y = plot.bottom - tick * (plot.bottom - plot.top);
            return (
              <g key={tick}>
                <line
                  x1={plot.left}
                  x2={plot.right}
                  y1={y}
                  y2={y}
                  stroke="#eef1f5"
                />
                <text
                  x={plot.left - 14}
                  y={y + 6}
                  fill="#9aa4b2"
                  fontSize="14"
                  fontWeight="600"
                  textAnchor="end"
                >
                  {formatReportTrendAxisValue(chartMax * tick, metric)}
                </text>
              </g>
            );
          })}
          {points.map((point, index) => {
            const { x } = getReportTrendPoint(
              point,
              index,
              points.length,
              chartMax,
              plot,
            );
            return (
              <line
                key={`${point.label}-${index}`}
                x1={x}
                x2={x}
                y1={plot.top}
                y2={plot.bottom}
                stroke="#f3f5f8"
              />
            );
          })}
          <polyline
            points={polylinePoints}
            fill="none"
            stroke="#3a6fff"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {points.map((point, index) => {
            const { x, y } = getReportTrendPoint(
              point,
              index,
              points.length,
              chartMax,
              plot,
            );
            const isHovered = hoveredIndex === index;
            return (
              <g
                key={`${point.label}-${index}`}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? "5.5" : "4"}
                  fill="#3a6fff"
                />
                <circle
                  cx={x}
                  cy={y}
                  r="18"
                  fill="transparent"
                  className="cursor-pointer"
                />
              </g>
            );
          })}
          {hoveredPoint ? (
            <g pointerEvents="none">
              <line
                x1={hoveredPoint.x}
                x2={hoveredPoint.x}
                y1={plot.top}
                y2={plot.bottom}
                stroke="#94a3b8"
                strokeDasharray="4 4"
              />
              <foreignObject
                x={Math.min(
                  Math.max(hoveredPoint.x + 12, plot.left),
                  plot.right - 210,
                )}
                y={Math.max(hoveredPoint.y - 78, plot.top)}
                width="200"
                height="76"
              >
                <div className="rounded-md border border-slate-100 bg-white/95 p-3 text-xs shadow-xl shadow-slate-200">
                  <div className="font-semibold text-slate-950">
                    {hoveredPoint.label}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 text-slate-500">
                    <span>{getTrendMetricLabel(metric)}</span>
                    <span className="font-semibold text-slate-900">
                      {formatReportTrendTooltipValue(
                        hoveredPoint.value,
                        metric,
                      )}
                    </span>
                  </div>
                </div>
              </foreignObject>
            </g>
          ) : null}
          {visibleLabels.map(({ point, index }) => {
            const { x } = getReportTrendPoint(
              point,
              index,
              points.length,
              chartMax,
              plot,
            );
            const isFirst = index === 0;
            const isLast = index === points.length - 1;
            return (
              <text
                key={`${point.label}-${index}`}
                x={
                  isFirst
                    ? Math.max(x, plot.left)
                    : isLast
                      ? Math.min(x, plot.right)
                      : x
                }
                y={chartHeight - 18}
                fill="#9aa4b2"
                fontSize="14"
                fontWeight="600"
                textAnchor={isFirst ? "start" : isLast ? "end" : "middle"}
              >
                {point.label}
              </text>
            );
          })}
        </svg>
      )}
    </div>
  );
}

function getReportTrendPoint(
  point: { label: string; value: number },
  index: number,
  total: number,
  maxValue: number,
  plot: ReturnType<typeof getReportTrendPlot>,
) {
  const x =
    total === 1
      ? plot.left
      : plot.left + (index / (total - 1)) * (plot.right - plot.left);
  const y = plot.bottom - (point.value / maxValue) * (plot.bottom - plot.top);
  return { ...point, x, y };
}

function getReportTrendPlot(chartWidth: number) {
  return {
    top: 28,
    bottom: 322,
    left: 82,
    right: chartWidth - 26,
  };
}

function getTrendMetricLabel(metric: ReportTrendMetric) {
  if (metric === "amount") return "消耗金额";
  if (metric === "tokens") return "消耗Tokens";
  return "调用次数";
}

function formatReportTrendAxisValue(value: number, metric: ReportTrendMetric) {
  if (metric === "amount") return formatCurrencyCompact(value);
  if (metric === "tokens") return formatTokenAxis(value);
  return `${Math.round(value)}`;
}

function formatReportTrendTooltipValue(
  value: number,
  metric: ReportTrendMetric,
) {
  if (metric === "amount") return formatCurrency(value);
  if (metric === "tokens") return `${formatNumber(value)} Tokens`;
  return `${formatNumber(value)} 次`;
}

function formatCurrencyCompact(value: number) {
  if (value >= 10_000) return `${trimMetricNumber(value / 10_000, 1)}万`;
  if (value >= 1_000) return `${trimMetricNumber(value / 1_000, 1)}k`;
  return `${Math.round(value)}`;
}

function formatTokenAxis(value: number) {
  if (value >= 100_000_000)
    return `${trimMetricNumber(value / 100_000_000, 1)}亿`;
  if (value >= 1_000_000) return `${trimMetricNumber(value / 1_000_000, 0)}M`;
  if (value >= 10_000) return `${trimMetricNumber(value / 10_000, 0)}万`;
  return `${Math.round(value)}`;
}

function TimeBarChart({
  title,
  items,
  modelNames,
  formatValue,
  tone,
}: {
  title: string;
  items: Array<{
    label: string;
    total: number;
    byModel: Record<string, number>;
  }>;
  modelNames: string[];
  formatValue: (value: number) => string;
  tone: "blue" | "cyan" | "pink";
}) {
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  const width = 1100;
  const height = 330;
  const plot = { top: 32, right: 1074, bottom: 262, left: 72 };
  const maxValue = Math.max(...items.map((item) => item.total), 1);
  const chartMax = maxValue * 1.15;
  const barAreaWidth = plot.right - plot.left;
  const slotWidth =
    items.length === 0 ? barAreaWidth : barAreaWidth / items.length;
  const barWidth = Math.min(42, slotWidth * 0.52);
  const barRadius = 8;
  const minSegmentHeight = 8;
  const hovered = hoveredIndex === null ? null : items[hoveredIndex];
  const palette = getStackPalette(tone);

  return (
    <section className="rounded-md border border-slate-100 bg-slate-50/60 p-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(280px,auto)]">
        <div className="flex min-w-0 items-center gap-3">
          <h3 className="shrink-0 text-base font-semibold text-slate-900">
            {title}
          </h3>
        </div>
        <div className="flex min-w-0 flex-wrap items-center justify-start gap-x-4 gap-y-2 lg:justify-end">
          {modelNames.map((modelName, index) => (
            <span
              key={modelName}
              className="inline-flex max-w-[180px] items-center gap-2 text-sm font-medium text-slate-500"
            >
              <span
                className="size-3 shrink-0 rounded-sm"
                style={{ backgroundColor: palette[index % palette.length] }}
              />
              <span className="truncate">{modelName}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="mt-4 h-[330px] overflow-hidden">
        {items.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">
            暂无数据
          </div>
        ) : null}
        {items.length > 0 ? (
          <svg className="h-full w-full" viewBox={`0 0 ${width} ${height}`}>
            {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
              const y = plot.bottom - tick * (plot.bottom - plot.top);
              return (
                <g key={tick}>
                  <line
                    x1={plot.left}
                    x2={plot.right}
                    y1={y}
                    y2={y}
                    stroke="#e8edf3"
                  />
                  <text
                    x={plot.left - 12}
                    y={y + 5}
                    fill="#94a3b8"
                    fontSize="14"
                    fontWeight="600"
                    textAnchor="end"
                  >
                    {formatCompactValue(chartMax * tick, tone)}
                  </text>
                </g>
              );
            })}
            <line
              x1={plot.left}
              x2={plot.left}
              y1={plot.top}
              y2={plot.bottom}
              stroke="#cbd5e1"
            />
            <line
              x1={plot.left}
              x2={plot.right}
              y1={plot.bottom}
              y2={plot.bottom}
              stroke="#cbd5e1"
            />
            {items.map((item, index) => {
              const x =
                plot.left + index * slotWidth + (slotWidth - barWidth) / 2;
              let stackedOffset = 0;
              const visibleSegments = modelNames
                .map((modelName, modelIndex) => {
                  const segmentValue = item.byModel[modelName] ?? 0;
                  const segmentHeight =
                    segmentValue <= 0
                      ? 0
                      : Math.max(
                          minSegmentHeight,
                          (segmentValue / chartMax) * (plot.bottom - plot.top),
                        );
                  return {
                    modelName,
                    modelIndex,
                    height: segmentHeight,
                  };
                })
                .filter((segment) => segment.height > 0);
              const labelStep = Math.ceil(items.length / 8);
              const showLabel =
                items.length <= 12 ||
                index === 0 ||
                index === items.length - 1 ||
                (index % labelStep === 0 && index < items.length - 2);
              return (
                <g
                  key={`${item.label}-${index}`}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {visibleSegments.map((segment, segmentIndex) => {
                    const y = plot.bottom - stackedOffset - segment.height;
                    stackedOffset += segment.height;
                    const isBottomSegment = segmentIndex === 0;
                    const isTopSegment =
                      segmentIndex === visibleSegments.length - 1;

                    return (
                      <path
                        key={segment.modelName}
                        className="cursor-pointer transition-opacity"
                        d={roundedBarSegmentPath(
                          x,
                          y,
                          barWidth,
                          segment.height,
                          barRadius,
                          { top: isTopSegment, bottom: isBottomSegment },
                        )}
                        fill={palette[segment.modelIndex % palette.length]}
                        opacity={
                          hoveredIndex === null || hoveredIndex === index
                            ? 1
                            : 0.45
                        }
                      />
                    );
                  })}
                  <rect
                    className="cursor-pointer"
                    x={x - 8}
                    y={plot.top}
                    width={barWidth + 16}
                    height={plot.bottom - plot.top}
                    fill="transparent"
                  />
                  {showLabel ? (
                    <text
                      x={x + barWidth / 2}
                      y={plot.bottom + 28}
                      fill="#64748b"
                      fontSize="14"
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      {item.label}
                    </text>
                  ) : null}
                </g>
              );
            })}
            {hovered ? (
              <foreignObject
                x={Math.min(
                  plot.left + (hoveredIndex ?? 0) * slotWidth + 18,
                  plot.right - 250,
                )}
                y="36"
                width="250"
                height="190"
              >
                <div className="rounded-md border border-slate-200 bg-white/95 p-3 text-sm shadow-lg shadow-slate-200">
                  <div className="truncate text-base font-semibold text-slate-950">
                    {hovered.label}
                  </div>
                  <div className="mt-1 font-semibold text-slate-700">
                    总计 {formatValue(hovered.total)}
                  </div>
                  <div className="mt-2 space-y-1.5">
                    {modelNames
                      .filter(
                        (modelName) => (hovered.byModel[modelName] ?? 0) > 0,
                      )
                      .map((modelName) => (
                        <div
                          key={modelName}
                          className="flex items-center justify-between gap-2 text-slate-600"
                        >
                          <span className="truncate">{modelName}</span>
                          <span className="shrink-0 font-medium">
                            {formatValue(hovered.byModel[modelName] ?? 0)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </foreignObject>
            ) : null}
          </svg>
        ) : null}
      </div>
    </section>
  );
}

function roundedBarSegmentPath(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  corners: { top: boolean; bottom: boolean },
) {
  const right = x + width;
  const bottom = y + height;
  const topRadius = corners.top ? Math.min(radius, width / 2, height / 2) : 0;
  const bottomRadius = corners.bottom
    ? Math.min(radius, width / 2, height / 2)
    : 0;

  return [
    `M ${x + topRadius} ${y}`,
    `H ${right - topRadius}`,
    corners.top
      ? `Q ${right} ${y} ${right} ${y + topRadius}`
      : `L ${right} ${y}`,
    `V ${bottom - bottomRadius}`,
    corners.bottom
      ? `Q ${right} ${bottom} ${right - bottomRadius} ${bottom}`
      : `L ${right} ${bottom}`,
    `H ${x + bottomRadius}`,
    corners.bottom
      ? `Q ${x} ${bottom} ${x} ${bottom - bottomRadius}`
      : `L ${x} ${bottom}`,
    `V ${y + topRadius}`,
    corners.top ? `Q ${x} ${y} ${x + topRadius} ${y}` : `L ${x} ${y}`,
    "Z",
  ].join(" ");
}

function createDefaultFilters(data: DealerData): ReportFilters {
  return {
    range: "last30",
    customStart: "2026-07-01",
    customEnd: "2026-07-03",
    customerName: "全部客户",
    modelNames: ["全部模型"],
  };
}

function buildReportConsumptionRecords(data: DealerData): ConsumptionRecord[] {
  const existingIds = new Set(data.consumptions.map((record) => record.id));
  const generatedRecords: ConsumptionRecord[] = [];
  const availableModels = data.models.filter(
    (model) => model.status === "可用",
  );
  const normalizedRecords = data.consumptions.map((record) =>
    normalizeReportRecord(data, record),
  );
  const reportStart = startOfDay(now);
  reportStart.setDate(reportStart.getDate() - 44);

  for (const [customerIndex, customer] of data.customers.entries()) {
    const customerCreatedAt = parseLocalDateTime(customer.createdAt);
    const customerApiKeys = data.apiKeys.filter(
      (key) => key.customerName === customer.company && key.status === "已启用",
    );
    const primaryModels = customerApiKeys.map((key) => key.modelName);
    const fallbackModels = availableModels
      .filter((model) => !primaryModels.includes(model.name))
      .filter((_, modelIndex) => (modelIndex + customerIndex) % 3 !== 1)
      .slice(0, 2)
      .map((model) => model.name);
    const customerModels = unique([...primaryModels, ...fallbackModels])
      .filter((modelName) =>
        data.models.some((model) => model.name === modelName),
      )
      .slice(0, 3);

    for (let dayIndex = 0; dayIndex < 45; dayIndex += 1) {
      const day = new Date(reportStart);
      day.setDate(reportStart.getDate() + dayIndex);
      if (day < startOfDay(customerCreatedAt) || day > now) {
        continue;
      }

      for (const [modelIndex, modelName] of customerModels.entries()) {
        const isRestDay =
          customer.status !== "正常" &&
          stableNumber(`${customer.id}-${dayIndex}-rest`, 5) === 0;
        if (isRestDay) {
          continue;
        }

        const model = data.models.find((item) => item.name === modelName);
        const modelType = model?.type ?? "对话补全";
        const baseInputTokens = modelType === "视频" ? 1_600_000 : 24_000_000;
        const customerFactor =
          customer.status === "正常"
            ? 1
            : customer.status === "未激活"
              ? 0.24
              : 0.58;
        const modelFactor = modelName.includes("Seedance")
          ? 0.42
          : modelName.includes("Qwen")
            ? 0.82
            : 1;
        const dayWave = 0.88 + (dayIndex % 7) * 0.035;
        const noise =
          stableNumber(`${customer.id}-${modelName}-noise-${dayIndex}`, 16) /
          100;
        const inputTokens = Math.max(
          180_000,
          Math.round(
            baseInputTokens * customerFactor * modelFactor * (dayWave + noise),
          ),
        );
        const outputRatio =
          modelType === "视频"
            ? 0.52
            : 0.36 +
              stableNumber(
                `${customer.id}-${modelName}-ratio-${dayIndex}`,
                12,
              ) /
                100;
        const outputTokens = Math.round(inputTokens * outputRatio);
        const totalTokens = inputTokens + outputTokens;
        const inputPrice = model?.inputPrice ?? 6;
        const outputPrice = model?.outputPrice ?? 18;
        const amount = roundCurrency(
          (inputTokens / 1_000_000) * inputPrice +
            (outputTokens / 1_000_000) * outputPrice,
        );
        const hour =
          9 + stableNumber(`${customer.id}-${modelName}-hour-${dayIndex}`, 10);
        const minute = stableNumber(
          `${customer.id}-${modelName}-minute-${dayIndex}`,
          60,
        );
        const calledAt = `${formatDate(day)} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
        const apiKey = customerApiKeys.find(
          (key) => key.modelName === modelName,
        );
        const id =
          `report-${customer.id}-${modelName}-${formatDate(day)}`.replace(
            /\s+/g,
            "-",
          );

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
          totalTokens,
          amount,
          calledAt,
          status: "成功",
          createdAt: calledAt,
          updatedAt: calledAt,
        });
      }
    }
  }

  return [...normalizedRecords, ...generatedRecords];
}

function normalizeReportRecord(
  data: DealerData,
  record: ConsumptionRecord,
): ConsumptionRecord {
  const model = data.models.find((item) => item.name === record.modelName);
  const inputScale = record.inputTokens > 500_000_000 ? 1000 : 1;
  const outputScale = record.outputTokens > 500_000_000 ? 1000 : 1;
  const inputTokens = Math.round(record.inputTokens / inputScale);
  const outputTokens = Math.round(record.outputTokens / outputScale);
  const totalTokens = inputTokens + outputTokens;
  const amount = roundCurrency(
    (inputTokens / 1_000_000) * (model?.inputPrice ?? 6) +
      (outputTokens / 1_000_000) * (model?.outputPrice ?? 18),
  );

  return {
    ...record,
    inputTokens,
    outputTokens,
    totalTokens,
    amount,
  };
}

function filterConsumptionRecords(
  data: DealerData,
  records: ConsumptionRecord[],
  filters: ReportFilters,
) {
  const { start, end } = getDateRange(filters);

  return records.filter((record) => {
    const calledAt = parseLocalDateTime(record.calledAt);
    return (
      calledAt >= start &&
      calledAt < end &&
      record.status === "成功" &&
      (filters.customerName === "全部客户" ||
        record.customerName === filters.customerName) &&
      (filters.modelNames.includes("全部模型") ||
        filters.modelNames.includes(record.modelName))
    );
  });
}

function buildReportMetrics(records: ConsumptionRecord[]) {
  const customerNames = new Set(records.map((record) => record.customerName));
  const tokens = records.reduce(
    (sum, record) => sum + record.inputTokens + record.outputTokens,
    0,
  );
  const amount = records.reduce((sum, record) => sum + record.amount, 0);
  const requestCount = records.reduce(
    (sum, record) => sum + estimateRequestCount(record),
    0,
  );

  return {
    customerCount: customerNames.size,
    tokens,
    amount,
    requestCount,
  };
}

function buildDetailRows(
  data: DealerData,
  records: ConsumptionRecord[],
): DetailRow[] {
  const customers = new Map(
    data.customers.map((customer) => [customer.company, customer]),
  );
  const logsByCustomer = new Map(
    data.usageLogs.map((log) => [
      `${log.customerName}-${log.modelName}`,
      log.durationMs,
    ]),
  );
  const grouped = new Map<string, DetailRow>();

  for (const record of records) {
    const customer = customers.get(record.customerName);
    const current = grouped.get(record.customerName) ?? {
      customerName: record.customerName,
      customerStatus: customer?.status ?? "-",
      tokens: 0,
      amount: 0,
      count: 0,
      averageDuration: 0,
      lastCalledAt: record.calledAt,
    };
    const requestCount = estimateRequestCount(record);
    const duration =
      logsByCustomer.get(`${record.customerName}-${record.modelName}`) ??
      estimateDuration(record);
    current.tokens += record.inputTokens + record.outputTokens;
    current.amount += record.amount;
    current.count += requestCount;
    current.averageDuration += duration * requestCount;
    current.lastCalledAt =
      parseLocalDateTime(record.calledAt) >
      parseLocalDateTime(current.lastCalledAt)
        ? record.calledAt
        : current.lastCalledAt;
    grouped.set(record.customerName, current);
  }

  return [...grouped.values()].map((row) => ({
    ...row,
    averageDuration:
      row.count === 0 ? 0 : Math.round(row.averageDuration / row.count),
  }));
}

function getReportTrendFilters(
  filters: ReportFilters,
  range: ReportTrendRange,
): ReportFilters {
  if (range === "last7" || range === "last30") {
    return { ...filters, range };
  }

  if (range === "today") {
    const today = formatDate(now);
    return {
      ...filters,
      range: "custom",
      customStart: today,
      customEnd: today,
    };
  }

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    ...filters,
    range: "custom",
    customStart: formatDate(monthStart),
    customEnd: formatDate(now),
  };
}

function buildReportTrendTimeSeries(
  records: ConsumptionRecord[],
  filters: ReportFilters,
  range: ReportTrendRange,
) {
  if (range !== "today") {
    return buildTimeSeries(records, getReportTrendFilters(filters, range));
  }

  const start = startOfDay(now);
  const hourCount = now.getHours() + 1;
  const buckets = Array.from({ length: hourCount }, (_, index) => {
    const hourStart = addHours(start, index);
    return {
      label: `${String(hourStart.getHours()).padStart(2, "0")}:00`,
      amount: 0,
      tokens: 0,
      count: 0,
      amountByModel: {} as Record<string, number>,
      tokensByModel: {} as Record<string, number>,
      countByModel: {} as Record<string, number>,
      start: hourStart,
      end: addHours(hourStart, 1),
    };
  });

  addRecordsToTimeBuckets(records, buckets);

  return mapTimeBuckets(buckets);
}

function buildTimeSeries(records: ConsumptionRecord[], filters: ReportFilters) {
  const { start, end } = getDateRange(filters);
  const dayCount = Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / 86_400_000),
  );
  const buckets = Array.from({ length: dayCount }, (_, index) => {
    const date = addDays(start, index);
    return {
      label: `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
      amount: 0,
      tokens: 0,
      count: 0,
      amountByModel: {} as Record<string, number>,
      tokensByModel: {} as Record<string, number>,
      countByModel: {} as Record<string, number>,
      start: date,
      end: addDays(date, 1),
    };
  });

  addRecordsToTimeBuckets(records, buckets);

  return mapTimeBuckets(buckets);
}

function addRecordsToTimeBuckets(
  records: ConsumptionRecord[],
  buckets: Array<{
    amount: number;
    tokens: number;
    count: number;
    amountByModel: Record<string, number>;
    tokensByModel: Record<string, number>;
    countByModel: Record<string, number>;
    start: Date;
    end: Date;
  }>,
) {
  for (const record of records) {
    const calledAt = parseLocalDateTime(record.calledAt);
    const bucket = buckets.find(
      (item) => calledAt >= item.start && calledAt < item.end,
    );
    if (!bucket) continue;
    const tokens = record.inputTokens + record.outputTokens;
    const requestCount = estimateRequestCount(record);
    bucket.amount += record.amount;
    bucket.tokens += tokens;
    bucket.count += requestCount;
    bucket.amountByModel[record.modelName] =
      (bucket.amountByModel[record.modelName] ?? 0) + record.amount;
    bucket.tokensByModel[record.modelName] =
      (bucket.tokensByModel[record.modelName] ?? 0) + tokens;
    bucket.countByModel[record.modelName] =
      (bucket.countByModel[record.modelName] ?? 0) + requestCount;
  }
}

function mapTimeBuckets(
  buckets: Array<{
    label: string;
    amount: number;
    tokens: number;
    count: number;
    amountByModel: Record<string, number>;
    tokensByModel: Record<string, number>;
    countByModel: Record<string, number>;
  }>,
) {
  return buckets.map(
    ({
      label,
      amount,
      tokens,
      count,
      amountByModel,
      tokensByModel,
      countByModel,
    }) => ({
      label,
      amount,
      tokens,
      count,
      amountByModel,
      tokensByModel,
      countByModel,
    }),
  );
}

function getDateRange(filters: ReportFilters) {
  const start = startOfDay(now);
  const end = startOfDay(now);
  end.setDate(end.getDate() + 1);

  if (filters.range === "last7") {
    start.setDate(start.getDate() - 6);
    return { start, end };
  }
  if (filters.range === "last30") {
    start.setDate(start.getDate() - 29);
    return { start, end };
  }

  return {
    start: parseLocalDateTime(`${filters.customStart} 00:00`),
    end: addDays(parseLocalDateTime(`${filters.customEnd} 00:00`), 1),
  };
}

function formatCompactValue(value: number, tone: "blue" | "cyan" | "pink") {
  if (tone === "pink") {
    return `${Math.round(value)}`;
  }

  if (value >= 1_000_000) {
    return `${Number((value / 1_000_000).toFixed(1))}M`;
  }

  if (value >= 10_000) {
    return `${Number((value / 10_000).toFixed(1))}万`;
  }

  if (value >= 1_000) {
    return `${Number((value / 1_000).toFixed(1))}k`;
  }

  return `${Math.round(value)}`;
}

function formatTokenOverview(value: number) {
  if (value >= 100_000_000) {
    return `${trimMetricNumber(value / 100_000_000, 2)}亿`;
  }

  if (value >= 10_000) {
    return `${trimMetricNumber(value / 10_000, 1)}万`;
  }

  return formatNumber(value);
}

function trimMetricNumber(value: number, digits: number) {
  return value.toLocaleString("zh-CN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  });
}

function estimateRequestCount(record: ConsumptionRecord) {
  const totalTokens = record.inputTokens + record.outputTokens;
  const averageTokensPerRequest = record.modelName.includes("Seedance")
    ? 900_000
    : 180_000;
  return Math.max(1, Math.round(totalTokens / averageTokensPerRequest));
}

function getStackPalette(tone: "blue" | "cyan" | "pink") {
  if (tone === "cyan") {
    return ["#14c8e5", "#39d98a", "#7c8cff", "#f6c85f", "#ff8a65"];
  }

  if (tone === "pink") {
    return ["#f25be9", "#ff8a65", "#7c8cff", "#14c8e5", "#39d98a"];
  }

  return ["#1155ff", "#7c8cff", "#14c8e5", "#39d98a", "#f6c85f"];
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function addHours(date: Date, hours: number) {
  const nextDate = new Date(date);
  nextDate.setHours(nextDate.getHours() + hours);
  return nextDate;
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
  return Math.round(
    baseDuration +
      tokens / 420 +
      stableNumber(
        `${record.customerName}-${record.modelName}-${record.calledAt}`,
        1_600,
      ),
  );
}

function unique(values: string[]) {
  return [...new Set(values)];
}

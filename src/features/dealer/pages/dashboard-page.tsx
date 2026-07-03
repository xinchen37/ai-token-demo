import * as React from "react";
import { AlertTriangle, BarChart3, BellRing, ClipboardList, Coins, LineChart, Trophy, Users, Wallet, Zap } from "lucide-react";
import type { DealerData, DealerPageKey } from "../types";
import {
  buildTrendSeries,
  buildRanking,
  calculateDashboardMetrics,
  formatCurrency,
  formatNumber,
  type RankItem,
  type RankMetric,
  type TrendMetric,
  type TrendRange,
} from "../dealer-utils";

interface DashboardPageProps {
  data: DealerData;
  onPageChange: (page: DealerPageKey) => void;
}

export function DashboardPage({ data, onPageChange }: DashboardPageProps) {
  const [trendMetric, setTrendMetric] = React.useState<TrendMetric>("amount");
  const [trendRange, setTrendRange] = React.useState<TrendRange>("today");
  const [rankMetric, setRankMetric] = React.useState<RankMetric>("model");
  const metrics = calculateDashboardMetrics(data);
  const ranking = React.useMemo(() => buildRanking(data, rankMetric), [data, rankMetric]);
  const maxRankAmount = Math.max(...ranking.map((item) => item.amount), 1);
  const trendSeries = React.useMemo(
    () => buildTrendSeries(data.consumptions, trendMetric, trendRange, new Date("2026-07-03T14:00:00+08:00")),
    [data.consumptions, trendMetric, trendRange],
  );

  return (
    <div className="space-y-8">
      <section>
        <SectionTitle icon={BarChart3} title="总数据概览" />
        <div className="mt-4 grid grid-cols-4 gap-4">
          <MetricCard icon={Wallet} tone="cyan" label="消费总额" value={formatCurrency(metrics.totalAmount)} helperLabel="待结算金额" helperValue={formatCurrency(metrics.pendingSettlement)} />
          <MetricCard icon={Coins} tone="pink" label="总成本" value={formatCurrency(metrics.totalCost)} helperLabel="净利润" helperValue={formatCurrency(metrics.profit)} />
          <MetricCard icon={Users} tone="blue" label="客户总数" value={formatNumber(metrics.customerCount)} helperLabel="活跃客户数" helperValue={formatNumber(metrics.activeCustomerCount)} />
          <MetricCard icon={Zap} tone="indigo" label="请求次数" value={formatNumber(metrics.requestCount)} helperLabel="消耗 Tokens" helperValue={formatNumber(metrics.totalTokens)} />
        </div>
      </section>

      <section className="grid gap-8 2xl:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <div>
            <SectionTitle icon={LineChart} title="模型数据分析" />
            <div className="mt-4 rounded-md border border-slate-200 bg-white p-6 shadow-sm shadow-slate-100">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <MetricTabs value={trendMetric} onChange={setTrendMetric} />
                <RangeTabs value={trendRange} onChange={setTrendRange} />
              </div>
              <TrendChart metric={trendMetric} range={trendRange} points={trendSeries} />
            </div>
          </div>

          <div>
            <SectionTitle icon={Trophy} title="排行榜" />
            <div className="mt-4 rounded-md border border-slate-200 bg-white px-6 py-5 shadow-sm shadow-slate-100">
              <RankingTabs value={rankMetric} onChange={setRankMetric} />
              <RankingBars items={ranking} maxAmount={maxRankAmount} metric={rankMetric} />
            </div>
          </div>
        </div>

        <aside className="space-y-8">
          <div>
            <SectionTitle icon={ClipboardList} title="待办事项" />
            <div className="mt-4 rounded-md border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100">
              {data.todos.slice(0, 3).map((todo) => (
                <button key={todo.id} className="mb-4 w-full rounded-md border border-slate-200 bg-white p-5 text-left last:mb-0 hover:bg-slate-50" onClick={() => onPageChange(todo.target)}>
                  <div className="flex items-center gap-2 text-base font-bold text-slate-950">
                    <AlertTriangle className={todo.level === "红色" ? "size-5 text-red-400" : todo.level === "黄色" ? "size-5 text-amber-400" : "size-5 text-blue-400"} />
                    {todo.status}
                  </div>
                  <div className="mt-3 border-l-2 border-l-blue-400 bg-gradient-to-r from-slate-50 to-white px-3 py-2 text-sm font-medium leading-6 text-slate-950">{todo.title}</div>
                  <div className="mt-4 text-sm font-medium text-slate-400">去处理 →</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <SectionTitle icon={BellRing} title="系统公告" />
            <div className="mt-4 rounded-md border border-slate-200 bg-white p-8 shadow-sm shadow-slate-100">
              <div className="relative space-y-8 border-l border-slate-200 pl-6">
                {data.notices.slice(0, 5).map((notice) => (
                  <div key={notice.id} className="relative">
                    <span className="absolute -left-[31px] top-1 size-3 rounded-full bg-slate-400 ring-4 ring-white" />
                    <div className="text-base font-bold leading-6 text-slate-950">{notice.title}</div>
                    <div className="mt-1 text-sm text-slate-500">{notice.content}</div>
                    <div className="mt-2 text-sm text-slate-400">{notice.publishedAt}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="size-6 text-slate-400" />
      <h2 className="text-xl font-bold text-slate-950">{title}</h2>
    </div>
  );
}

function MetricCard({ icon: Icon, tone, label, value, helperLabel, helperValue }: { icon: React.ComponentType<{ className?: string }>; tone: "cyan" | "pink" | "blue" | "indigo"; label: string; value: string; helperLabel: string; helperValue: string }) {
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

function Tabs({ items, compact = false }: { items: string[]; compact?: boolean }) {
  return (
    <div className={compact ? "flex rounded-md bg-slate-50 p-1" : "flex gap-8"}>
      {items.map((item, index) => (
        <button key={item} className={compact ? `h-8 rounded px-5 text-sm font-medium ${index === 0 ? "bg-white text-slate-950 shadow-sm" : "text-slate-400"}` : `border-b-2 pb-2 text-sm font-medium ${index === 0 ? "border-[#1155ff] text-[#1155ff]" : "border-transparent text-slate-400"}`}>
          {item}
        </button>
      ))}
    </div>
  );
}

function RankingTabs({ value, onChange }: { value: RankMetric; onChange: (value: RankMetric) => void }) {
  const items: Array<{ label: string; value: RankMetric }> = [
    { label: "模型消耗", value: "model" },
    { label: "客户消耗", value: "customer" },
    { label: "销售人员消耗", value: "sales" },
  ];

  return (
    <div className="flex gap-6">
      {items.map((item) => (
        <button
          key={item.value}
          className={`border-b-2 pb-2 text-sm font-medium transition-colors ${value === item.value ? "border-[#1155ff] text-[#1155ff]" : "border-transparent text-slate-400 hover:text-slate-600"}`}
          onClick={() => onChange(item.value)}
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function RankingBars({ items, maxAmount, metric }: { items: RankItem[]; maxAmount: number; metric: RankMetric }) {
  const [hoveredItem, setHoveredItem] = React.useState<RankItem | null>(null);
  const colors = ["bg-[#1155ff]", "bg-[#14c8e5]", "bg-[#f25be9]"];
  const labelWidth = React.useMemo(() => {
    const maxTextWidth = Math.max(...items.map((item) => estimateLabelWidth(item.name)), 48);
    return Math.min(maxTextWidth, 220);
  }, [items]);

  return (
    <div className="relative mt-5 space-y-3">
      {items.map((item, index) => (
        <div key={item.name} className="flex items-center gap-2.5 py-1 text-sm">
          <span className="shrink-0 truncate text-left text-slate-500" style={{ width: labelWidth }}>{item.name}</span>
          <div className="relative h-3 min-w-0 flex-1 border-l border-slate-200 bg-slate-50">
            <div
              className={`h-full cursor-pointer transition-opacity hover:opacity-85 ${index < 3 ? colors[index] : "bg-slate-300"}`}
              style={{ width: `${(item.amount / maxAmount) * 100}%` }}
              onMouseEnter={() => setHoveredItem(item)}
              onMouseLeave={() => setHoveredItem(null)}
            />
            {hoveredItem?.name === item.name ? (
              <div className="pointer-events-none absolute left-1/2 top-[-88px] z-20 w-[230px] -translate-x-1/2 rounded-md border border-slate-100 bg-white/95 p-3 text-xs shadow-xl shadow-slate-200">
                <div className="font-semibold text-slate-950">{item.name}</div>
                <div className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-slate-500">
                  <span>消耗金额</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(item.amount)}</span>
                  <span>消耗 Token</span>
                  <span className="font-semibold text-slate-900">{formatNumber(item.tokens)}</span>
                  <span>调用次数</span>
                  <span className="font-semibold text-slate-900">{formatNumber(item.count)}</span>
                  {metric === "sales" ? (
                    <>
                      <span>名下客户数</span>
                      <span className="font-semibold text-slate-900">{formatNumber(item.customerCount ?? 0)}</span>
                      <span>人均消耗</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(item.averageAmount ?? 0)}</span>
                    </>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
          <span className="w-28 shrink-0 text-right font-medium text-slate-700">{formatCurrency(item.amount)}</span>
        </div>
      ))}
    </div>
  );
}

function estimateLabelWidth(label: string) {
  return Array.from(label).reduce((total, char) => total + (/[\u4e00-\u9fff]/.test(char) ? 16 : 8), 12);
}

function MetricTabs({ value, onChange }: { value: TrendMetric; onChange: (value: TrendMetric) => void }) {
  const items: Array<{ label: string; value: TrendMetric }> = [
    { label: "消耗金额", value: "amount" },
    { label: "消耗Tokens", value: "tokens" },
    { label: "调用次数", value: "calls" },
  ];

  return (
    <div className="flex gap-8">
      {items.map((item) => (
        <button
          key={item.value}
          className={`border-b-2 pb-2 text-sm font-medium transition-colors ${value === item.value ? "border-[#1155ff] text-[#1155ff]" : "border-transparent text-slate-400 hover:text-slate-600"}`}
          onClick={() => onChange(item.value)}
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function RangeTabs({ value, onChange }: { value: TrendRange; onChange: (value: TrendRange) => void }) {
  const items: Array<{ label: string; value: TrendRange }> = [
    { label: "今天", value: "today" },
    { label: "近7天", value: "last7" },
    { label: "近30天", value: "last30" },
    { label: "本月", value: "month" },
  ];

  return (
    <div className="flex rounded-md bg-slate-50 p-1">
      {items.map((item) => (
        <button
          key={item.value}
          className={`h-8 rounded px-5 text-sm font-medium transition-colors ${value === item.value ? "bg-white text-slate-950 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
          onClick={() => onChange(item.value)}
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function TrendChart({ metric, range, points }: { metric: TrendMetric; range: TrendRange; points: Array<{ label: string; value: number }> }) {
  const chartRef = React.useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  const [chartWidth, setChartWidth] = React.useState(1200);
  const chartHeight = 320;
  const plot = getChartPlot(chartWidth);
  const maxValue = Math.max(...points.map((point) => point.value), 1);
  const yLabels = Array.from({ length: 5 }, (_, index) => Math.round((maxValue / 4) * (4 - index)));
  const polylinePoints = points
    .map((point, index) => {
      const { x, y } = getChartPoint(point, index, points.length, maxValue, plot);
      return `${x},${y}`;
    })
    .join(" ");
  const labelCandidates = points.flatMap((point, index) => {
    const step = range === "today" ? 2 : points.length > 12 ? Math.ceil(points.length / 8) : 1;
    return index % step === 0 || index === points.length - 1 ? [{ point, index }] : [];
  });
  const visibleLabels = labelCandidates.reduce<Array<{ point: { label: string; value: number }; index: number }>>((labels, candidate) => {
    const minLabelGap = range === "today" ? 56 : 74;
    const candidateX = getChartPoint(candidate.point, candidate.index, points.length, maxValue, plot).x;
    const previous = labels.at(-1);

    if (!previous) {
      return [candidate];
    }

    const previousX = getChartPoint(previous.point, previous.index, points.length, maxValue, plot).x;
    if (candidateX - previousX >= minLabelGap) {
      return [...labels, candidate];
    }

    if (candidate.index === points.length - 1) {
      return [...labels.slice(0, -1), candidate];
    }

    return labels;
  }, []);
  const titleMap: Record<TrendMetric, string> = {
    amount: "消耗金额趋势图",
    tokens: "消耗Tokens趋势图",
    calls: "调用次数趋势图",
  };

  React.useLayoutEffect(() => {
    const element = chartRef.current;
    if (!element) {
      return;
    }

    const updateWidth = () => setChartWidth(Math.max(720, Math.round(element.clientWidth)));
    updateWidth();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(element);

    return () => resizeObserver.disconnect();
  }, []);

  const hoveredPoint = hoveredIndex === null ? null : getChartPoint(points[hoveredIndex], hoveredIndex, points.length, maxValue, plot);

  return (
    <div ref={chartRef} className="mt-8 h-[320px] overflow-hidden">
      <svg className="h-full w-full" viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label={titleMap[metric]}>
        {[55, 105, 155, 205, 255].map((y) => <line key={y} x1={plot.left} x2={plot.right} y1={y} y2={y} stroke="#eef1f5" />)}
        {points.map((_, index) => {
          const { x } = getChartPoint(points[index], index, points.length, maxValue, plot);
          return <line key={index} x1={x} x2={x} y1={plot.top} y2={plot.bottom} stroke="#f3f5f8" />;
        })}
        <polyline points={polylinePoints} fill="none" stroke="#3a6fff" strokeWidth="2.5" />
        {points.map((point, index) => {
          const { x, y } = getChartPoint(point, index, points.length, maxValue, plot);
          const isHovered = hoveredIndex === index;
          return (
            <g key={`${point.label}-${index}`} onMouseEnter={() => setHoveredIndex(index)} onMouseLeave={() => setHoveredIndex(null)}>
              <circle cx={x} cy={y} r={isHovered ? "5" : "3"} fill="#3a6fff" />
              <circle cx={x} cy={y} r="14" fill="transparent" className="cursor-pointer" />
            </g>
          );
        })}
        {hoveredPoint ? (
          <g pointerEvents="none">
            <line x1={hoveredPoint.x} x2={hoveredPoint.x} y1={plot.top} y2={plot.bottom} stroke="#94a3b8" strokeDasharray="4 4" />
            <foreignObject
              x={Math.min(Math.max(hoveredPoint.x + 12, plot.left), plot.right - 190)}
              y={Math.max(hoveredPoint.y - 76, plot.top)}
              width="180"
              height="72"
            >
              <div className="rounded-md border border-slate-100 bg-white/95 p-3 text-xs shadow-xl shadow-slate-200">
                <div className="font-semibold text-slate-950">{hoveredPoint.label}</div>
                <div className="mt-2 flex items-center justify-between gap-3 text-slate-500">
                  <span>{titleMap[metric].replace("趋势图", "")}</span>
                  <span className="font-semibold text-slate-900">{formatTrendTooltipValue(hoveredPoint.value, metric)}</span>
                </div>
              </div>
            </foreignObject>
          </g>
        ) : null}
        {yLabels.map((label, index) => (
          <text key={label} x="0" y={62 + index * 50} fill="#9ca3af" fontSize="12">
            {formatTrendValue(label, metric)}
          </text>
        ))}
        {visibleLabels.map(({ point, index }) => {
          const { x } = getChartPoint(point, index, points.length, maxValue, plot);
          const isFirst = index === 0;
          const isLast = index === points.length - 1;
          return (
            <text
              key={`${point.label}-${index}`}
              x={isFirst ? Math.max(x, plot.left) : isLast ? Math.min(x, plot.right) : x}
              y="300"
              fill="#9ca3af"
              fontSize="13"
              textAnchor={isFirst ? "start" : isLast ? "end" : "middle"}
            >
              {point.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function getChartPoint(
  point: { label: string; value: number },
  index: number,
  total: number,
  maxValue: number,
  plot: ReturnType<typeof getChartPlot>,
) {
  const x = total === 1 ? plot.left : plot.left + (index / (total - 1)) * (plot.right - plot.left);
  const y = plot.bottom - (point.value / maxValue) * (plot.bottom - plot.top);

  return { ...point, x, y };
}

function getChartPlot(chartWidth: number) {
  return {
    top: 36,
    bottom: 270,
    left: 32,
    right: chartWidth - 8,
  };
}

function formatTrendValue(value: number, metric: TrendMetric): string {
  if (metric === "amount") {
    return `¥${Math.round(value / 1000)}k`;
  }

  if (metric === "tokens") {
    return `${Math.round(value / 10000)}w`;
  }

  return String(value);
}

function formatTrendTooltipValue(value: number, metric: TrendMetric): string {
  if (metric === "amount") {
    return formatCurrency(value);
  }

  if (metric === "tokens") {
    return `${formatNumber(value)} Tokens`;
  }

  return `${formatNumber(value)} 次`;
}

import * as React from "react";
import {
  AlertTriangle,
  BarChart3,
  BellRing,
  ClipboardList,
  Coins,
  LineChart,
  Trophy,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import type { ConsumptionRecord, DealerData, DealerPageKey } from "../types";
import {
  buildTrendSeries,
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
  const [rankingRange, setRankingRange] = React.useState<TrendRange>("last30");
  const metrics = calculateDashboardMetrics(data);
  const rankingRecords = React.useMemo(
    () => filterDashboardRecordsByRange(data.consumptions, rankingRange, new Date("2026-07-03T14:00:00+08:00")),
    [data.consumptions, rankingRange],
  );
  const rankingGroups = React.useMemo(
    () => [
      {
        title: "模型消耗排行榜",
        metric: "model" as const,
        items: buildDashboardRanking(data, rankingRecords, "model", 3),
      },
      {
        title: "客户消耗排行",
        metric: "customer" as const,
        items: buildDashboardRanking(data, rankingRecords, "customer", 3),
      },
      {
        title: "销售业绩排行",
        metric: "sales" as const,
        items: buildDashboardRanking(data, rankingRecords, "sales", 3),
      },
    ],
    [data, rankingRecords],
  );
  const trendSeries = React.useMemo(
    () =>
      buildTrendSeries(
        data.consumptions,
        trendMetric,
        trendRange,
        new Date("2026-07-03T14:00:00+08:00"),
      ),
    [data.consumptions, trendMetric, trendRange],
  );

  return (
    <div className="space-y-8">
      <section>
        <SectionTitle icon={BarChart3} title="总数据概览" />
        <div className="mt-4 grid grid-cols-4 gap-4">
          <MetricCard
            icon={Wallet}
            tone="cyan"
            label="消费总额"
            value={formatCurrency(metrics.totalAmount)}
            helperLabel="待结算金额"
            helperValue={formatCurrency(metrics.pendingSettlement)}
          />
          <MetricCard
            icon={Coins}
            tone="pink"
            label="总成本"
            value={formatCurrency(metrics.totalCost)}
            helperLabel="净利润"
            helperValue={formatCurrency(metrics.profit)}
          />
          <MetricCard
            icon={Users}
            tone="blue"
            label="客户总数"
            value={formatNumber(metrics.customerCount)}
            helperLabel="活跃客户数 (7D)"
            helperValue={formatNumber(metrics.activeCustomerCount)}
          />
          <MetricCard
            icon={Zap}
            tone="indigo"
            label="请求次数"
            value={formatNumber(metrics.requestCount)}
            helperLabel="消耗 Tokens"
            helperValue={formatNumber(metrics.totalTokens)}
          />
        </div>
      </section>

      <section className="grid gap-8 2xl:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <div>
            <div className="flex items-center justify-between gap-4">
              <SectionTitle icon={LineChart} title="模型数据分析" />
              <RangeTabs value={trendRange} onChange={setTrendRange} />
            </div>
            <div className="mt-4 rounded-md border border-slate-200 bg-white p-6 shadow-sm shadow-slate-100">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <MetricTabs value={trendMetric} onChange={setTrendMetric} />
              </div>
              <TrendChart
                metric={trendMetric}
                range={trendRange}
                points={trendSeries}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-4">
              <SectionTitle icon={Trophy} title="排行榜" />
              <RankingRangeTabs value={rankingRange} onChange={setRankingRange} />
            </div>
            <div className="mt-4 grid gap-4 xl:grid-cols-3">
              {rankingGroups.map((group) => (
                <RankingCard
                  key={group.metric}
                  title={group.title}
                  items={group.items}
                  metric={group.metric}
                />
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-8">
          <div>
            <SectionTitle icon={ClipboardList} title="待办事项" />
            <div className="mt-4 rounded-md border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100">
              {data.todos.slice(0, 3).map((todo) => (
                <button
                  key={todo.id}
                  className="mb-4 w-full rounded-md border border-slate-200 bg-white p-5 text-left last:mb-0 hover:bg-slate-50"
                  onClick={() => onPageChange(todo.target)}
                >
                  <div className="flex items-center gap-2 text-base font-bold text-slate-950">
                    <AlertTriangle
                      className={
                        todo.level === "红色"
                          ? "size-5 text-red-400"
                          : todo.level === "黄色"
                            ? "size-5 text-amber-400"
                            : "size-5 text-blue-400"
                      }
                    />
                    {todo.status}
                  </div>
                  <div className="mt-3 border-l-2 border-l-blue-400 bg-gradient-to-r from-slate-50 to-white px-3 py-2 text-sm font-medium leading-6 text-slate-950">
                    {todo.title}
                  </div>
                  <div className="mt-4 text-sm font-medium text-slate-400">
                    去处理 →
                  </div>
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
                    <div className="text-base font-bold leading-6 text-slate-950">
                      {notice.title}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {notice.content}
                    </div>
                    <div className="mt-2 text-sm text-slate-400">
                      {notice.publishedAt}
                    </div>
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

function SectionTitle({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="size-6 text-slate-400" />
      <h2 className="text-xl font-bold text-slate-950">{title}</h2>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  tone,
  label,
  value,
  helperLabel,
  helperValue,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: "cyan" | "pink" | "blue" | "indigo";
  label: string;
  value: string;
  helperLabel: string;
  helperValue: string;
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
      className={`min-h-[118px] rounded-md border border-slate-200 bg-gradient-to-br ${toneClasses.card} p-5 shadow-sm shadow-slate-100`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs text-slate-400">{label}</div>
          <div className="mt-1 truncate text-2xl font-semibold tracking-tight text-slate-950">
            {value}
          </div>
          <div className="mt-4 text-xs text-slate-400">{helperLabel}</div>
          <div className="mt-1 truncate text-xl font-semibold tracking-tight text-slate-950">
            {helperValue}
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

function Tabs({
  items,
  compact = false,
}: {
  items: string[];
  compact?: boolean;
}) {
  return (
    <div className={compact ? "flex rounded-md bg-slate-50 p-1" : "flex gap-8"}>
      {items.map((item, index) => (
        <button
          key={item}
          className={
            compact
              ? `h-8 rounded px-5 text-sm font-medium ${index === 0 ? "bg-white text-slate-950 shadow-sm" : "text-slate-400"}`
              : `border-b-2 pb-2 text-sm font-medium ${index === 0 ? "border-[#1155ff] text-[#1155ff]" : "border-transparent text-slate-400"}`
          }
        >
          {item}
        </button>
      ))}
    </div>
  );
}

function RankingCard({
  title,
  items,
  metric,
}: {
  title: string;
  items: RankItem[];
  metric: RankMetric;
}) {
  const [hoveredItem, setHoveredItem] = React.useState<RankItem | null>(null);
  const maxAmount = Math.max(...items.map((item) => item.amount), 1);
  const colors = ["bg-teal-600", "bg-[#2f6df6]", "bg-orange-500"];

  return (
    <div className="min-h-[300px] rounded-md border border-slate-200 bg-white shadow-sm shadow-slate-100">
      <div className="border-b border-slate-100 px-6 py-5">
        <h3 className="text-lg font-bold text-slate-950">{title}</h3>
      </div>
      <div className="space-y-7 px-6 py-6">
        {items.map((item, index) => (
          <div
            key={item.name}
            className="relative"
            onMouseEnter={() => setHoveredItem(item)}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <div className="flex items-baseline justify-between gap-4">
              <div className="min-w-0 text-base font-bold text-slate-800">
                <span className="mr-1 tabular-nums">{index + 1}.</span>
                <span className="truncate align-bottom">{item.name}</span>
              </div>
              <div className="shrink-0 text-base font-bold tabular-nums text-slate-950">
                {formatCurrency(item.amount)}
              </div>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all ${colors[index] ?? "bg-slate-300"}`}
                style={{
                  width: `${Math.max((item.amount / maxAmount) * 100, 8)}%`,
                }}
              />
            </div>
            <div className="mt-2 truncate text-sm font-medium text-slate-400">
              {getRankingMeta(item, metric)}
            </div>
            {hoveredItem?.name === item.name ? (
              <RankingTooltip item={item} metric={metric} />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function RankingTooltip({
  item,
  metric,
}: {
  item: RankItem;
  metric: RankMetric;
}) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-[-118px] z-20 w-[230px] -translate-x-1/2 rounded-md border border-slate-100 bg-white p-3 text-sm text-slate-500 shadow-[0_8px_22px_rgba(15,23,42,0.12)]">
      <div className="space-y-1 font-semibold">
        <div>
          <span className="text-slate-400">
            {metric === "sales" ? "销售姓名" : "名称"}：
          </span>
          <span className="text-slate-950">{item.name}</span>
        </div>
        <div>
          <span className="text-slate-400">消耗金额：</span>
          <span className="text-slate-950">{formatCurrency(item.amount)}</span>
        </div>
        {metric === "sales" ? (
          <div>
            <span className="text-slate-400">名下客户数：</span>
            <span className="text-slate-950">
              {formatNumber(item.customerCount ?? 0)}
            </span>
          </div>
        ) : null}
        {metric === "sales" ? (
          <div>
            <span className="text-slate-400">人均消耗：</span>
            <span className="text-slate-950">
              {formatCurrency(item.averageAmount ?? 0)}
            </span>
          </div>
        ) : null}
        {metric !== "sales" ? (
          <div>
            <span className="text-slate-400">消耗 Tokens：</span>
            <span className="text-slate-950">{formatNumber(item.tokens)}</span>
          </div>
        ) : null}
        <div>
          <span className="text-slate-400">调用次数：</span>
          <span className="text-slate-950">{formatNumber(item.count)}</span>
        </div>
      </div>
      <span className="absolute -bottom-2 left-1/2 size-4 -translate-x-1/2 rotate-45 border-b border-r border-slate-100 bg-white" />
    </div>
  );
}

function getRankingMeta(item: RankItem, metric: RankMetric) {
  if (metric === "sales") {
    return `${formatNumber(item.customerCount ?? 0)} 个客户 · 人均 ${formatCurrency(item.averageAmount ?? 0)}`;
  }

  return `${formatNumber(item.tokens)} Tokens`;
}

function MetricTabs({
  value,
  onChange,
}: {
  value: TrendMetric;
  onChange: (value: TrendMetric) => void;
}) {
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

function RangeTabs({
  value,
  onChange,
}: {
  value: TrendRange;
  onChange: (value: TrendRange) => void;
}) {
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

function RankingRangeTabs({
  value,
  onChange,
}: {
  value: TrendRange;
  onChange: (value: TrendRange) => void;
}) {
  const items: Array<{ label: string; value: TrendRange }> = [
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

function TrendChart({
  metric,
  range,
  points,
}: {
  metric: TrendMetric;
  range: TrendRange;
  points: Array<{ label: string; value: number }>;
}) {
  const chartRef = React.useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  const [chartWidth, setChartWidth] = React.useState(1200);
  const chartHeight = 320;
  const plot = getChartPlot(chartWidth);
  const maxValue = Math.max(...points.map((point) => point.value), 1);
  const yLabels = Array.from({ length: 5 }, (_, index) =>
    Math.round((maxValue / 4) * (4 - index)),
  );
  const polylinePoints = points
    .map((point, index) => {
      const { x, y } = getChartPoint(
        point,
        index,
        points.length,
        maxValue,
        plot,
      );
      return `${x},${y}`;
    })
    .join(" ");
  const labelCandidates = points.flatMap((point, index) => {
    const step =
      range === "today"
        ? 2
        : points.length > 12
          ? Math.ceil(points.length / 8)
          : 1;
    return index % step === 0 || index === points.length - 1
      ? [{ point, index }]
      : [];
  });
  const visibleLabels = labelCandidates.reduce<
    Array<{ point: { label: string; value: number }; index: number }>
  >((labels, candidate) => {
    const minLabelGap = range === "today" ? 56 : 74;
    const candidateX = getChartPoint(
      candidate.point,
      candidate.index,
      points.length,
      maxValue,
      plot,
    ).x;
    const previous = labels.at(-1);

    if (!previous) {
      return [candidate];
    }

    const previousX = getChartPoint(
      previous.point,
      previous.index,
      points.length,
      maxValue,
      plot,
    ).x;
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

    const updateWidth = () =>
      setChartWidth(Math.max(720, Math.round(element.clientWidth)));
    updateWidth();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(element);

    return () => resizeObserver.disconnect();
  }, []);

  const hoveredPoint =
    hoveredIndex === null
      ? null
      : getChartPoint(
          points[hoveredIndex],
          hoveredIndex,
          points.length,
          maxValue,
          plot,
        );

  return (
    <div ref={chartRef} className="mt-8 h-[320px] overflow-hidden">
      <svg
        className="h-full w-full"
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        role="img"
        aria-label={titleMap[metric]}
      >
        {[55, 105, 155, 205, 255].map((y) => (
          <line
            key={y}
            x1={plot.left}
            x2={plot.right}
            y1={y}
            y2={y}
            stroke="#eef1f5"
          />
        ))}
        {points.map((_, index) => {
          const { x } = getChartPoint(
            points[index],
            index,
            points.length,
            maxValue,
            plot,
          );
          return (
            <line
              key={index}
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
          strokeWidth="2.5"
        />
        {points.map((point, index) => {
          const { x, y } = getChartPoint(
            point,
            index,
            points.length,
            maxValue,
            plot,
          );
          const isHovered = hoveredIndex === index;
          return (
            <g
              key={`${point.label}-${index}`}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <circle cx={x} cy={y} r={isHovered ? "5" : "3"} fill="#3a6fff" />
              <circle
                cx={x}
                cy={y}
                r="14"
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
                plot.right - 190,
              )}
              y={Math.max(hoveredPoint.y - 76, plot.top)}
              width="180"
              height="72"
            >
              <div className="rounded-md border border-slate-100 bg-white/95 p-3 text-xs shadow-xl shadow-slate-200">
                <div className="font-semibold text-slate-950">
                  {hoveredPoint.label}
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 text-slate-500">
                  <span>{titleMap[metric].replace("趋势图", "")}</span>
                  <span className="font-semibold text-slate-900">
                    {formatTrendTooltipValue(hoveredPoint.value, metric)}
                  </span>
                </div>
              </div>
            </foreignObject>
          </g>
        ) : null}
        {yLabels.map((label, index) => (
          <text
            key={label}
            x="0"
            y={62 + index * 50}
            fill="#9ca3af"
            fontSize="12"
          >
            {formatTrendValue(label, metric)}
          </text>
        ))}
        {visibleLabels.map(({ point, index }) => {
          const { x } = getChartPoint(
            point,
            index,
            points.length,
            maxValue,
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
  const x =
    total === 1
      ? plot.left
      : plot.left + (index / (total - 1)) * (plot.right - plot.left);
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

function buildDashboardRanking(
  data: DealerData,
  records: ConsumptionRecord[],
  metric: RankMetric,
  limit = 10,
): RankItem[] {
  if (metric === "model") {
    return rankDashboardRecords(records, "modelName", limit);
  }

  if (metric === "customer") {
    return rankDashboardRecords(records, "customerName", limit);
  }

  const salesByCustomer = new Map(data.customers.map((customer) => [customer.company, customer.sales]));
  const grouped = new Map<string, RankItem & { customerNames: Set<string> }>();

  for (const record of records.filter((item) => item.status === "成功")) {
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

function rankDashboardRecords(
  records: ConsumptionRecord[],
  key: "modelName" | "customerName",
  limit: number,
) {
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

function filterDashboardRecordsByRange(
  records: ConsumptionRecord[],
  range: TrendRange,
  now: Date,
) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (range === "last7") {
    start.setDate(start.getDate() - 6);
  } else if (range === "last30") {
    start.setDate(start.getDate() - 29);
  } else if (range === "month") {
    start.setDate(1);
  }

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return records.filter((record) => {
    const calledAt = new Date(record.calledAt.replace(" ", "T"));
    return calledAt >= start && calledAt <= end;
  });
}

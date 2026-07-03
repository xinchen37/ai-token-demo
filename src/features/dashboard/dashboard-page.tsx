import {
  AlertTriangle,
  BarChart3,
  BellRing,
  ClipboardList,
  Coins,
  Lightbulb,
  LineChart,
  Trophy,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import type { Task } from "@/features/tasks/types";
import { calculateTaskStats } from "@/features/tasks/task-utils";

interface DashboardPageProps {
  tasks: Task[];
}

const chartPoints = "45,70 95,70 145,92 195,92 245,130 295,130 345,92 395,92 445,130 495,120";
const chartFuture = "545,102 595,82 645,100 695,100 745,80 795,80 845,80";
const ranking = [
  { name: "DeepSeek V4 Flash", value: 8200, color: "bg-[#1155ff]" },
  { name: "Seedance Video 2.0", value: 9600, color: "bg-[#14c8e5]" },
  { name: "Seedance Video 2.0", value: 10750, color: "bg-[#f25be9]" },
  { name: "Seedance Video 2.0", value: 6750, color: "bg-slate-300" },
  { name: "Seedance Video 2.0", value: 9300, color: "bg-slate-300" },
  { name: "Seedance Video 2.0", value: 8200, color: "bg-slate-300" },
  { name: "Seedance Video 2.0", value: 7650, color: "bg-slate-300" },
  { name: "Seedance Video 2.0", value: 5050, color: "bg-slate-300" },
];

export function DashboardPage({ tasks }: DashboardPageProps) {
  const stats = calculateTaskStats(tasks, new Date("2026-07-02T12:00:00+08:00"));
  const activeTasks = tasks.filter((task) => task.status !== "done").slice(0, 2);
  const activeCustomers = Math.max(800, stats.inProgress * 260 + stats.todo * 140);

  return (
    <div className="space-y-8">
      <section>
        <SectionTitle icon={BarChart3} title="总数据概览" />
        <div className="mt-4 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
          <MetricCard
            icon={Wallet}
            tone="cyan"
            label="消费总额"
            value="¥12000.00"
            helperLabel="待结算金额"
            helperValue={`¥${Math.max(1000, stats.todo * 500)}.00`}
          />
          <MetricCard
            icon={Coins}
            tone="pink"
            label="总成本"
            value="¥20000.00"
            helperLabel="净利润"
            helperValue="¥18000.00"
          />
          <MetricCard
            icon={Users}
            tone="blue"
            label="客户总数"
            value={Math.max(1000, tasks.length * 200)}
            helperLabel="活跃客户数"
            helperValue={activeCustomers}
          />
          <MetricCard
            icon={Zap}
            tone="indigo"
            label="请求次数"
            value={Math.max(12000, stats.total * 2400)}
            helperLabel="消耗Tokens"
            helperValue="200000M"
          />
        </div>
      </section>

      <section className="grid gap-8 2xl:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <div>
            <SectionTitle icon={LineChart} title="模型数据分析" />
            <div className="mt-4 rounded-md border border-slate-200 bg-white p-6 shadow-sm shadow-slate-100">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <Tabs items={["消耗金额", "消耗Tokens", "调用次数"]} />
                <Tabs items={["今天", "近7天", "近30天", "本月"]} compact />
              </div>
              <RevenueChart />
            </div>
          </div>

          <div>
            <SectionTitle icon={Trophy} title="排行榜" />
            <div className="mt-4 rounded-md border border-slate-200 bg-white p-6 shadow-sm shadow-slate-100">
              <Tabs items={["模型消耗", "客户消耗", "销售人员消耗"]} />
              <div className="mt-8 space-y-4">
                {ranking.map((item) => (
                  <div key={`${item.name}-${item.value}`} className="grid grid-cols-[160px_1fr] items-center gap-4 text-sm">
                    <span className="truncate text-slate-500">{item.name}</span>
                    <div className="h-3 border-l border-slate-200">
                      <div className={item.color} style={{ width: `${(item.value / 11000) * 100}%`, height: "100%" }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 ml-[176px] grid grid-cols-6 text-sm text-slate-400">
                {["¥0", "¥2K", "¥4K", "¥6K", "¥8K", "¥10K"].map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-8">
          <div>
            <SectionTitle icon={ClipboardList} title="待办事项" />
            <div className="mt-4 rounded-md border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100">
              <TodoCard
                icon={AlertTriangle}
                title="待处理工单"
                body={`客户【${activeTasks[0]?.project ?? "XX科技"}】账户余额不足，请提醒充值`}
                accent="border-l-red-400"
              />
              <TodoCard
                icon={Lightbulb}
                title="即将到期"
                body={`客户【${activeTasks[1]?.owner ?? "YY公司"}】试用套餐将于3天后到期`}
                accent="border-l-violet-400"
              />
            </div>
          </div>

          <div>
            <SectionTitle icon={BellRing} title="系统公告" />
            <div className="mt-4 rounded-md border border-slate-200 bg-white p-8 shadow-sm shadow-slate-100">
              <div className="relative space-y-8 border-l border-slate-200 pl-6">
                {[
                  ["Claude官方分组已上架", "claude-sonnet-5", "1天前 2026-07-01 10:33"],
                  ["已上架glm-5.2", "", "2周前 2026-06-17 10:48"],
                  ["已上线kimi-k2.7-code", "", "2周前 2026-06-14 23:09"],
                ].map(([title, model, time]) => (
                  <div key={`${title}-${time}`} className="relative">
                    <span className="absolute -left-[31px] top-1 size-3 rounded-full bg-slate-400 ring-4 ring-white" />
                    <div className="text-base font-bold leading-6 text-slate-950">
                      {title}
                      {model ? <br /> : null}
                      {model}
                    </div>
                    <div className="mt-2 text-sm text-slate-400">{time}</div>
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
  value: string | number;
  helperLabel: string;
  helperValue: string | number;
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
    <div className={`min-h-[150px] rounded-md border border-slate-200 bg-gradient-to-br ${toneClasses.card} p-7 shadow-sm shadow-slate-100`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-slate-400">{label}</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</div>
          <div className="mt-6 text-sm text-slate-400">{helperLabel}</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{helperValue}</div>
        </div>
        <div className={`flex size-16 shrink-0 items-center justify-center rounded-full border ${toneClasses.icon}`}>
          <Icon className="size-8" />
        </div>
      </div>
    </div>
  );
}

function Tabs({ items, compact = false }: { items: string[]; compact?: boolean }) {
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

function RevenueChart() {
  return (
    <div className="mt-8 h-[340px] overflow-hidden">
      <svg className="h-full w-full" viewBox="0 0 900 340" role="img" aria-label="消耗金额趋势图">
        {[70, 120, 170, 220, 270].map((y) => (
          <line key={`h-${y}`} x1="40" x2="870" y1={y} y2={y} stroke="#eef1f5" />
        ))}
        {[95, 170, 245, 320, 395, 470, 545, 620, 695, 770, 845].map((x) => (
          <line key={`v-${x}`} x1={x} x2={x} y1="45" y2="292" stroke="#eef1f5" />
        ))}
        <polyline points={chartPoints} fill="none" stroke="#3a6fff" strokeWidth="2.5" />
        <polyline points={chartFuture} fill="none" stroke="#3a6fff" strokeWidth="2.5" strokeDasharray="6 6" />
        <line x1="485" x2="485" y1="32" y2="278" stroke="#111827" strokeDasharray="3 3" />
        {["￥30k", "￥25k", "￥20k", "￥15k", "￥10k", "￥0"].map((label, index) => (
          <text key={label} x="0" y={index === 5 ? 300 : 76 + index * 50} fill="#9ca3af" fontSize="13">
            {label}
          </text>
        ))}
        {["07-01", "07-02", "07-03", "07-04", "07-05", "07-06", "07-07", "07-08", "07-09", "07-10", "07-12", "07-13"].map(
          (label, index) => (
            <text key={label} x={88 + index * 73} y="320" fill="#9ca3af" fontSize="13" textAnchor="middle">
              {label}
            </text>
          ),
        )}
        <foreignObject x="500" y="150" width="210" height="110">
          <div className="rounded-md bg-white/95 p-4 text-xs shadow-xl shadow-slate-200">
            <div className="font-bold text-slate-950">07-07 06:00</div>
            {[
              ["Revenue", "#3a6fff"],
              ["New MRR", "#14c8e5"],
              ["Churned MRR", "#f25be9"],
            ].map(([label, color]) => (
              <div key={label} className="mt-2 grid grid-cols-[14px_1fr_auto] items-center gap-2 text-slate-700">
                <span style={{ backgroundColor: color }} className="h-1.5" />
                <span>{label}</span>
                <span className="font-semibold text-slate-400">¥17,832.98</span>
              </div>
            ))}
          </div>
        </foreignObject>
      </svg>
    </div>
  );
}

function TodoCard({
  icon: Icon,
  title,
  body,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  accent: string;
}) {
  return (
    <div className="mb-4 rounded-md border border-slate-200 bg-white p-5 last:mb-0">
      <div className="flex items-center gap-2 text-lg font-bold text-slate-950">
        <Icon className="size-5 text-amber-400" />
        {title}
      </div>
      <div className={`mt-4 border-l-2 ${accent} bg-gradient-to-r from-slate-50 to-white px-3 py-2 text-base font-medium leading-6 text-slate-950`}>
        {body}
      </div>
      <button className="mt-5 flex w-full items-center justify-between text-sm font-medium text-slate-400">
        去处理
        <span className="text-2xl leading-none text-slate-950">›</span>
      </button>
    </div>
  );
}

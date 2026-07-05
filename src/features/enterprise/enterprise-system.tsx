import * as React from "react";
import {
  BarChart3,
  Bell,
  BookOpenText,
  Bot,
  Building2,
  Camera,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  Coins,
  Download,
  Eye,
  EyeOff,
  FileKey2,
  FileText,
  Headphones,
  Home,
  Layers,
  LineChart,
  LogOut,
  Menu,
  Plus,
  ReceiptText,
  RotateCcw,
  Save,
  Search,
  SendHorizontal,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { buildTrendSeries, formatCurrency, formatNumber, maskApiKey, type RankItem, type TrendMetric, type TrendRange } from "@/features/dealer/dealer-utils";
import { useDealerStore } from "@/features/dealer/local-store";
import type { Bill, ConsumptionRecord, Customer, CustomerApiKey, DealerData, EnterpriseMember, EnterpriseRole } from "@/features/dealer/types";

type EnterprisePageKey = "dashboard" | "models" | "trial" | "apiKeys" | "consumptions" | "usageLogs" | "bills" | "members" | "roles" | "teamReports" | "profile";
type ApiKeyDraft = Omit<CustomerApiKey, "id" | "createdAt" | "updatedAt" | "customerName" | "apiKey" | "lastUsedAt">;
type EnterpriseRankMetric = "model" | "employee";
type BillTab = "current" | "history" | "pending" | "settled";
type TeamReportRange = "last7" | "last30" | "custom";
type NavItem = { key: EnterprisePageKey; label: string; icon: React.ComponentType<{ className?: string }> };
type NavBranch = { label: string; icon: React.ComponentType<{ className?: string }>; children: NavItem[] };
type NavEntry = NavItem | NavBranch;
type EnterprisePermissionModule = { key: string; label: string; actions: string[] };

const routes: Record<EnterprisePageKey, string> = {
  dashboard: "/enterprise/dashboard",
  models: "/enterprise/models",
  trial: "/enterprise/trial",
  apiKeys: "/enterprise/api-keys",
  consumptions: "/enterprise/consumptions",
  usageLogs: "/enterprise/usage-logs",
  bills: "/enterprise/bills",
  members: "/enterprise/members",
  roles: "/enterprise/roles",
  teamReports: "/enterprise/team-reports",
  profile: "/enterprise/profile",
};

const pageByRoute = Object.fromEntries(Object.entries(routes).map(([key, path]) => [path, key])) as Record<string, EnterprisePageKey>;

const enterprisePermissionModules: EnterprisePermissionModule[] = [
  { key: "dashboard", label: "看板", actions: ["查看"] },
  { key: "models", label: "模型管理", actions: ["查看"] },
  { key: "apiKeys", label: "API Key", actions: ["查看", "新增", "编辑", "删除"] },
  { key: "consumptions", label: "消费记录", actions: ["查看", "导出"] },
  { key: "usageLogs", label: "使用日志", actions: ["查看", "导出"] },
  { key: "bills", label: "账单", actions: ["查看", "导出"] },
  { key: "members", label: "团队成员", actions: ["查看", "新增", "编辑", "删除"] },
  { key: "roles", label: "角色管理", actions: ["查看", "新增", "编辑", "删除"] },
  { key: "teamReports", label: "团队报表", actions: ["查看", "导出"] },
  { key: "profile", label: "个人中心", actions: ["查看", "编辑"] },
];

const navGroups: Array<{ label: string; items: NavEntry[] }> = [
  { label: "", items: [{ key: "dashboard", label: "看板", icon: Home }] },
  { label: "模型", items: [{ key: "models", label: "大模型", icon: Layers }, { key: "trial", label: "模拟试用", icon: Sparkles }] },
  { label: "API", items: [{ key: "apiKeys", label: "API Key", icon: FileKey2 }, { key: "consumptions", label: "消费记录", icon: ReceiptText }, { key: "usageLogs", label: "使用日志", icon: BookOpenText }] },
  { label: "财务", items: [{ key: "bills", label: "账单", icon: FileText }] },
  {
    label: "管理",
    items: [
      {
        label: "团队管理",
        icon: Users,
        children: [
          { key: "members", label: "团队成员", icon: Users },
          { key: "roles", label: "角色管理", icon: ShieldCheck },
          { key: "teamReports", label: "团队报表", icon: LineChart },
        ],
      },
      { key: "profile", label: "个人中心", icon: UserRound },
    ],
  },
];

export function EnterpriseSystem({ loginAccount, onLogout }: { loginAccount: string; onLogout: () => void }) {
  const { data, updateData, resetData } = useDealerStore();
  const [activePage, setActivePage] = React.useState<EnterprisePageKey>(() => getPageFromLocation());
  const context = React.useMemo(() => resolveEnterpriseContext(data, loginAccount), [data, loginAccount]);
  const allowedPages = React.useMemo(() => resolveEnterpriseAllowedPages(context.roles, context.member, context.customer), [context.roles, context.member, context.customer]);
  const effectivePage = allowedPages.has(activePage) ? activePage : [...allowedPages][0] ?? "profile";

  React.useEffect(() => {
    syncRoute(activePage, true);
    function handlePopState() {
      setActivePage(getPageFromLocation());
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  React.useEffect(() => {
    if (!allowedPages.has(activePage)) {
      changePage(effectivePage);
    }
  }, [activePage, allowedPages, effectivePage]);

  function changePage(page: EnterprisePageKey) {
    if (!allowedPages.has(page)) {
      return;
    }
    setActivePage(page);
    syncRoute(page);
  }

  function updateApiKey(id: string, patch: Partial<CustomerApiKey>) {
    updateData((current) => ({
      ...current,
      apiKeys: current.apiKeys.map((record) => record.id === id ? { ...record, ...patch, updatedAt: getLocalNow() } : record),
    }));
  }

  function createApiKey(draft: Omit<CustomerApiKey, "id" | "createdAt" | "updatedAt" | "customerName" | "apiKey" | "lastUsedAt">) {
    updateData((current) => {
      const time = getLocalNow();
      return {
        ...current,
        apiKeys: [
          {
            ...draft,
            id: `ent-key-${Date.now()}`,
            customerName: context.customer.company,
            apiKey: `sk-ent-${context.customer.id.slice(-3)}-${Math.random().toString(36).slice(2, 8)}`,
            lastUsedAt: "未使用",
            createdAt: time,
            updatedAt: time,
          },
          ...current.apiKeys,
        ],
      };
    });
  }

  function deleteApiKey(id: string) {
    updateData((current) => ({ ...current, apiKeys: current.apiKeys.filter((record) => record.id !== id) }));
  }

  function upsertMember(member: EnterpriseMember) {
    updateData((current) => {
      const exists = current.enterpriseMembers.some((item) => item.id === member.id);
      return {
        ...current,
        enterpriseMembers: exists
          ? current.enterpriseMembers.map((item) => item.id === member.id ? { ...member, updatedAt: getLocalNow() } : item)
          : [{ ...member, id: `ent-member-${Date.now()}`, customerName: context.customer.company, createdAt: getLocalNow(), updatedAt: getLocalNow() }, ...current.enterpriseMembers],
      };
    });
  }

  function upsertRole(role: EnterpriseRole) {
    updateData((current) => {
      const exists = current.enterpriseRoles.some((item) => item.id === role.id);
      return {
        ...current,
        enterpriseRoles: exists
          ? current.enterpriseRoles.map((item) => item.id === role.id ? { ...role, updatedAt: getLocalNow() } : item)
          : [{ ...role, id: `ent-role-${Date.now()}`, customerName: context.customer.company, createdAt: getLocalNow(), updatedAt: getLocalNow() }, ...current.enterpriseRoles],
      };
    });
  }

  function deleteRole(id: string) {
    updateData((current) => ({ ...current, enterpriseRoles: current.enterpriseRoles.filter((role) => role.id !== id) }));
  }

  return (
    <EnterpriseLayout activePage={effectivePage} allowedPages={allowedPages} customer={context.customer} member={context.member} onLogout={onLogout} onPageChange={changePage} onResetData={resetData}>
      {effectivePage === "dashboard" ? <Dashboard data={data} customer={context.customer} onPageChange={changePage} /> : null}
      {effectivePage === "models" ? <Models data={data} customer={context.customer} /> : null}
      {effectivePage === "trial" ? <Trial data={data} customer={context.customer} /> : null}
      {effectivePage === "apiKeys" ? <ApiKeys data={data} customer={context.customer} onCreate={createApiKey} onUpdate={updateApiKey} onDelete={deleteApiKey} /> : null}
      {effectivePage === "consumptions" ? <ConsumptionTable data={data} customer={context.customer} /> : null}
      {effectivePage === "usageLogs" ? <UsageLogTable data={data} customer={context.customer} /> : null}
      {effectivePage === "bills" ? <Bills data={data} customer={context.customer} /> : null}
      {effectivePage === "members" ? <Members members={context.members} roles={context.roles} customer={context.customer} onSave={upsertMember} /> : null}
      {effectivePage === "roles" ? <Roles customer={context.customer} roles={context.roles} onDelete={deleteRole} onSave={upsertRole} /> : null}
      {effectivePage === "teamReports" ? <TeamReports data={data} customer={context.customer} members={context.members} /> : null}
      {effectivePage === "profile" ? <Profile member={context.member} customer={context.customer} onSave={upsertMember} /> : null}
    </EnterpriseLayout>
  );
}

function EnterpriseLayout({ activePage, allowedPages, customer, member, onLogout, onPageChange, onResetData, children }: { activePage: EnterprisePageKey; allowedPages: ReadonlySet<EnterprisePageKey>; customer: Customer; member: EnterpriseMember; onLogout: () => void; onPageChange: (page: EnterprisePageKey) => void; onResetData: () => void; children: React.ReactNode }) {
  const activeLabel = getAllEnterpriseNavItems().find((item) => item.key === activePage)?.label ?? "看板";
  const visibleNavGroups = React.useMemo(() => filterEnterpriseNavGroups(allowedPages), [allowedPages]);
  const [openBranches, setOpenBranches] = React.useState<Record<string, boolean>>({});
  const avatar = getAvatarText(member.name);

  React.useEffect(() => {
    const activeBranch = getActiveBranch(activePage);
    if (!activeBranch) return;
    setOpenBranches((current) => ({ ...current, [activeBranch]: true }));
  }, [activePage]);

  function toggleBranch(label: string) {
    setOpenBranches((current) => ({ ...current, [label]: !current[label] }));
  }

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-[300px] border-r border-slate-100 bg-white lg:block">
        <div className="flex h-[104px] items-center px-4 text-[28px] font-black tracking-tight"><span className="text-[#1155ff]">Omni</span><span>AI</span></div>
        <button className="absolute right-4 top-10 flex size-7 items-center justify-center rounded border border-slate-200 text-slate-300" type="button"><ChevronLeft className="size-4" /></button>
        <div className="group relative mx-4">
          <div className="flex h-16 cursor-pointer items-center gap-3 rounded-md border border-slate-200 bg-white px-3 shadow-sm shadow-slate-100">
            <div className="flex size-11 items-center justify-center rounded bg-[#101a3d] font-bold text-white">{avatar}</div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-slate-800">{member.name || "User"}</div>
              <div className="truncate text-sm text-slate-400">{member.loginAccount}</div>
            </div>
            <ChevronDown className="size-5 text-slate-700" />
          </div>
          <div className="invisible absolute left-0 right-0 top-[72px] z-40 rounded-md border border-slate-200 bg-white p-2 opacity-0 shadow-xl shadow-slate-200/70 group-hover:visible group-hover:opacity-100">
            <button className="flex h-10 w-full items-center gap-3 rounded px-3 text-sm font-medium text-slate-600 hover:bg-blue-50 hover:text-[#1155ff]" onClick={() => onPageChange("profile")} type="button"><UserRound className="size-4" />个人中心</button>
            <button className="flex h-10 w-full items-center gap-3 rounded px-3 text-sm font-medium text-rose-500 hover:bg-rose-50" onClick={onLogout} type="button"><LogOut className="size-4" />退出登录</button>
          </div>
        </div>
        <nav className="mt-5 h-[calc(100vh-190px)] overflow-y-auto px-4 pb-8">
          {visibleNavGroups.map((group, index) => (
            <div key={`${group.label}-${index}`} className="border-t border-dashed border-slate-100 first:border-t-0">
              {group.label ? <div className="pb-2 pt-4 text-sm text-slate-400">{group.label}</div> : null}
              <div className="space-y-1">
                {group.items.map((item) => {
                  if (isNavBranch(item)) {
                    const open = openBranches[item.label] ?? item.children.some((child) => child.key === activePage);
                    const selected = item.children.some((child) => child.key === activePage);
                    return (
                      <div key={item.label}>
                        <button className={cn("flex h-12 w-full items-center gap-3 rounded-md px-4 text-left text-base font-medium transition-colors", selected ? "text-slate-900" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900")} onClick={() => toggleBranch(item.label)} type="button">
                          <item.icon className={cn("size-5", selected ? "text-[#1155ff]" : "text-slate-400")} />
                          <span className="flex-1">{item.label}</span>
                          <ChevronDown className={cn("size-4 text-slate-400 transition-transform", open ? "rotate-180" : "")} />
                        </button>
                        {open ? (
                          <div className="mt-1 space-y-1 pl-8">
                            {item.children.map((child) => {
                              const childSelected = child.key === activePage;
                              return (
                                <button key={child.key} className={cn("flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium transition-colors", childSelected ? "bg-[#1155ff] text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900")} onClick={() => onPageChange(child.key)} type="button">
                                  <child.icon className={cn("size-4", childSelected ? "text-white/85" : "text-slate-400")} />
                                  <span className="flex-1">{child.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  }

                  const selected = item.key === activePage;
                  return (
                    <button key={item.key} className={cn("flex h-12 w-full items-center gap-3 rounded-md px-4 text-left text-base font-medium transition-colors", selected ? "bg-[#1155ff] text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900")} onClick={() => onPageChange(item.key)} type="button">
                      <item.icon className={cn("size-5", selected ? "text-white/85" : "text-slate-400")} />
                      <span className="flex-1">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
      <div className="min-h-screen bg-[#f6f7f9] p-4 lg:ml-[300px]">
        <div className="min-h-[calc(100vh-32px)] rounded-[32px] border border-slate-200 bg-[#f8f9fb] p-4 shadow-sm shadow-slate-100">
          <header className="sticky top-4 z-20 flex h-16 items-center justify-between rounded-md border border-slate-200 bg-white px-4 shadow-sm shadow-slate-100">
            <div className="flex min-w-0 items-center gap-3">
              <Button className="lg:hidden" variant="ghost" aria-label="打开导航"><Menu className="size-4" /></Button>
              <h1 className="truncate text-2xl font-bold text-slate-950">{activeLabel}</h1>
              <span className="hidden rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-[#1155ff] md:inline">{customer.company}</span>
            </div>
            <div className="flex items-center gap-2">
              <HeaderIcon label="通知"><Bell className="size-5" /></HeaderIcon>
              <button className="hidden h-11 rounded-md border border-slate-200 px-4 text-sm font-medium text-slate-500 hover:bg-slate-50 md:block" onClick={onResetData} type="button">重置本地数据</button>
              <button className="flex size-11 items-center justify-center rounded-full bg-[#1155ff] text-white shadow-sm shadow-blue-200" aria-label="客服" type="button"><Headphones className="size-5" /></button>
            </div>
          </header>
          <main className="pt-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ data, customer, onPageChange }: { data: DealerData; customer: Customer; onPageChange: (page: EnterprisePageKey) => void }) {
  const [trendMetric, setTrendMetric] = React.useState<TrendMetric>("amount");
  const [trendRange, setTrendRange] = React.useState<TrendRange>("today");
  const [rankMetric, setRankMetric] = React.useState<EnterpriseRankMetric>("model");
  const [rankRange, setRankRange] = React.useState<TrendRange>("last7");
  const records = getCustomerConsumptions(data, customer);
  const keys = getCustomerApiKeys(data, customer);
  const bills = getCustomerBills(data, customer);
  const rankRecords = React.useMemo(() => filterRecordsByRange(records, rankRange, getDashboardNow()), [records, rankRange]);
  const ranking = React.useMemo(() => buildEnterpriseRanking(data, customer, rankRecords, rankMetric), [data, customer, rankRecords, rankMetric]);
  const maxRankAmount = Math.max(...ranking.map((item) => item.amount), 1);
  const trendSeries = React.useMemo(() => buildTrendSeries(records, trendMetric, trendRange, getDashboardNow()), [records, trendMetric, trendRange]);
  const totalAmount = sum(records, (record) => record.amount);
  const totalTokens = sum(records, (record) => record.inputTokens + record.outputTokens);
  const todayRecords = records.filter((record) => record.calledAt.startsWith("2026-07-03"));
  const estimatedTodayAmount = sum(todayRecords, (record) => record.amount);
  const remainingQuota = sum(keys, (key) => key.quotaRemain);
  return (
    <div className="space-y-8">
      <section>
        <SectionTitle icon={BarChart3} title="数据概览" />
        <div className="mt-4 grid grid-cols-4 gap-4">
          <MetricCard icon={Wallet} tone="cyan" label="消费总额" value={formatCurrency(totalAmount)} helperLabel="待结算金额" helperValue={formatCurrency(sum(bills.filter((bill) => bill.status === "待结算"), (bill) => bill.amount))} />
          <MetricCard icon={Coins} tone="pink" label="今日消耗 Tokens" value={formatNumber(sum(todayRecords, (record) => record.inputTokens + record.outputTokens))} helperLabel="预估费用" helperValue={formatCurrency(estimatedTodayAmount)} />
          <MetricCard icon={Zap} tone="indigo" label="请求次数" value={formatNumber(records.length)} helperLabel="总消耗 Tokens" helperValue={formatNumber(totalTokens)} />
          <MetricCard icon={FileKey2} tone="blue" label="API Key 数" value={formatNumber(keys.length)} helperLabel="剩余额度" helperValue={formatNumber(remainingQuota)} />
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
            <div className="flex items-center justify-between">
              <SectionTitle icon={BarChart3} title={rankMetric === "model" ? "模型消耗排行榜" : "员工消耗排行"} />
              <button className="text-sm font-medium text-[#1155ff]" onClick={() => onPageChange("consumptions")} type="button">查看明细</button>
            </div>
            <div className="mt-4 rounded-md border border-slate-200 bg-white px-6 py-5 shadow-sm shadow-slate-100">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <EnterpriseRankingTabs value={rankMetric} onChange={setRankMetric} />
                <RankingRangeTabs value={rankRange} onChange={setRankRange} />
              </div>
              <RankingBars items={ranking} maxAmount={maxRankAmount} metric={rankMetric} />
            </div>
          </div>
        </div>
        <aside className="space-y-8">
          <div className="rounded-md border border-slate-200 bg-white p-6 shadow-sm shadow-slate-100">
            <SectionTitle icon={Headphones} title="专属客服" />
            <div className="mt-5 space-y-3 text-sm text-slate-600">
              <div className="text-lg font-bold text-slate-950">{customer.sales || "经销商客服"}</div>
              <div>电话：186-8879-7837</div>
              <div>微信：omni-support</div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

function Models({ data, customer }: { data: DealerData; customer: Customer }) {
  const availableModelNames = new Set(getCustomerApiKeys(data, customer).map((key) => key.modelName));
  const models = data.models.filter((model) => model.status === "可用" || availableModelNames.has(model.name));
  return <SimpleTable columns={["厂商", "模型名称", "模型类型", "输入价格", "输出价格", "计费类型", "模型能力"]} rows={models.map((model) => [model.provider, model.name, model.type, `${formatCurrency(model.inputPrice)}/1M`, `${formatCurrency(model.outputPrice)}/1M`, model.billingType, model.abilities])} />;
}

function Trial({ data, customer }: { data: DealerData; customer: Customer }) {
  const keys = getCustomerApiKeys(data, customer);
  const availableModelNames = new Set(keys.map((key) => key.modelName));
  const models = data.models.filter((model) => model.status === "可用" || availableModelNames.has(model.name));
  const [sessionType, setSessionType] = React.useState("对话补全");
  const [modelName, setModelName] = React.useState(keys[0]?.modelName ?? models[0]?.name ?? "");
  const [keyName, setKeyName] = React.useState(keys[0]?.keyName ?? "");
  const [prompt, setPrompt] = React.useState("请帮我生成一段适合企业客户的 API 接入说明。");
  const [output, setOutput] = React.useState("选择会话类型、模型和 API Key 后发送提示词，这里会展示模拟响应。");
  const [tokens, setTokens] = React.useState(0);
  const enabledKeys = keys.filter((key) => key.status === "已启用" && (!modelName || key.modelName === modelName));

  React.useEffect(() => {
    if (enabledKeys.length > 0 && !enabledKeys.some((key) => key.keyName === keyName)) {
      setKeyName(enabledKeys[0].keyName);
    }
  }, [enabledKeys, keyName]);

  function handleSend() {
    const selectedKey = keys.find((key) => key.keyName === keyName);
    const nextTokens = Math.max(680, prompt.length * 38 + modelName.length * 86 + sessionType.length * 45);
    setTokens(nextTokens);
    setOutput(buildTrialOutput(sessionType, modelName, selectedKey?.keyName ?? keyName, prompt));
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
      <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm shadow-slate-100">
        <div className="flex items-center gap-2">
          <Settings2 className="size-5 text-slate-400" />
          <h2 className="text-xl font-semibold text-slate-950">设置 API 参数</h2>
        </div>
        <div className="mt-7 space-y-5">
          <label className="block space-y-2.5">
            <span className="block text-sm font-semibold text-slate-600">会话类型</span>
            <Select className="h-11 rounded-lg bg-slate-50/70 pl-4 focus:border-[#1155ff] focus:bg-white focus:ring-blue-100" value={sessionType} onChange={(event) => setSessionType(event.target.value)}>
              {["对话补全", "图像", "文本转语音", "视频", "语音转文本"].map((item) => <option key={item}>{item}</option>)}
            </Select>
          </label>
          <label className="block space-y-2.5">
            <span className="block text-sm font-semibold text-slate-600">模型</span>
            <Select className="h-11 rounded-lg bg-slate-50/70 pl-4 focus:border-[#1155ff] focus:bg-white focus:ring-blue-100" value={modelName} onChange={(event) => setModelName(event.target.value)}>
              {models.map((model) => <option key={model.id}>{model.name}</option>)}
            </Select>
          </label>
          <label className="block space-y-2.5">
            <span className="block text-sm font-semibold text-slate-600">API Key 名称</span>
            <Select className="h-11 rounded-lg bg-slate-50/70 pl-4 focus:border-[#1155ff] focus:bg-white focus:ring-blue-100" value={keyName} onChange={(event) => setKeyName(event.target.value)}>
              {enabledKeys.map((key) => <option key={key.id}>{key.keyName}</option>)}
            </Select>
          </label>
          <label className="block space-y-2.5">
            <span className="block text-sm font-semibold text-slate-600">输入提示词</span>
            <textarea
              className="min-h-44 w-full rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-[#1155ff] focus:bg-white focus:ring-2 focus:ring-blue-100"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
            />
          </label>
          <Button className="h-11 w-full" disabled={!keyName || !modelName} variant="primary" onClick={handleSend}>
            <SendHorizontal className="size-4" />
            发送
          </Button>
        </div>
      </section>
      <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm shadow-slate-100">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Bot className="size-5 text-[#1155ff]" />
            <h2 className="text-xl font-semibold text-slate-950">响应展示区</h2>
          </div>
          <div className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-[#1155ff]">本次消耗 {formatNumber(tokens)} Tokens</div>
        </div>
        <div className="mt-6 min-h-[360px] rounded-md border border-slate-100 bg-slate-50 p-5 leading-7 text-slate-700">
          {output}
        </div>
      </section>
    </div>
  );
}

function ApiKeys({ data, customer, onCreate, onUpdate, onDelete }: { data: DealerData; customer: Customer; onCreate: (draft: ApiKeyDraft) => void; onUpdate: (id: string, patch: Partial<CustomerApiKey>) => void; onDelete: (id: string) => void }) {
  const keys = getCustomerApiKeys(data, customer);
  const [open, setOpen] = React.useState(false);
  const [editingKey, setEditingKey] = React.useState<CustomerApiKey | null>(null);
  const [draft, setDraft] = React.useState<ApiKeyDraft>(() => createApiKeyDraft(data));
  const availableModels = data.models.filter((model) => model.status === "可用");

  function openCreateForm() {
    setEditingKey(null);
    setDraft(createApiKeyDraft(data));
    setOpen(true);
  }

  function openEditForm(key: CustomerApiKey) {
    setEditingKey(key);
    setDraft(toApiKeyDraft(key));
    setOpen(true);
  }

  function closeForm() {
    setOpen(false);
    setEditingKey(null);
  }

  function saveForm() {
    if (editingKey) onUpdate(editingKey.id, draft);
    else onCreate(draft);
    closeForm();
  }

  return (
    <div className="space-y-4">
      <Toolbar placeholder="搜索 Key 名称、模型或状态" action={<Button variant="primary" onClick={openCreateForm}><Plus className="size-4" />新建 API Key</Button>} />
      <Modal description="配置企业内部调用额度、可用模型、IP 限制和启停状态。" open={open} title={editingKey ? "编辑 API Key" : "新建 API Key"} onClose={closeForm}>
        <ApiKeyForm draft={draft} models={availableModels} onCancel={closeForm} onChange={setDraft} onSave={saveForm} />
      </Modal>
      <SimpleTable
        columns={["Key 名称", "关联模型", "额度", "每日限额", "API Key", "IP限制", "状态", "最后使用", "过期时间", "操作"]}
        rows={keys.map((key) => [key.keyName, key.modelName, `${formatNumber(key.quotaRemain)} / ${formatNumber(key.quotaTotal)}`, formatNumber(key.dailyLimit), maskApiKey(key.apiKey), key.ipWhitelist, key.status, key.lastUsedAt, key.expiresAt, <ActionButtons key={key.id} enabled={key.status === "已启用"} onEdit={() => openEditForm(key)} onToggle={() => onUpdate(key.id, { status: key.status === "已启用" ? "已停用" : "已启用" })} onDelete={() => onDelete(key.id)} />])}
      />
    </div>
  );
}

function ConsumptionTable({ data, customer }: { data: DealerData; customer: Customer }) {
  const rows = getCustomerConsumptions(data, customer).map((record) => [record.recordNo, getEmployeeName(data, customer, record.registerPhone), record.keyName, record.modelName, formatNumber(record.inputTokens), formatNumber(record.outputTokens), formatNumber(record.inputTokens + record.outputTokens), formatCurrency(record.amount), record.calledAt, record.status]);
  return <TableWithToolbar placeholder="搜索员工、API Key、模型" columns={["记录ID", "员工姓名", "API Key", "模型", "输入Token", "输出Token", "总Token", "消费金额", "调用时间", "状态"]} rows={rows} />;
}

function UsageLogTable({ data, customer }: { data: DealerData; customer: Customer }) {
  const rows = data.usageLogs.filter((log) => log.customerName === customer.company).map((log) => [log.taskId, log.requestedAt, log.finishedAt, formatNumber(log.durationMs), getEmployeeName(data, customer, customer.loginAccount), log.modelName, log.statusCode]);
  return <TableWithToolbar placeholder="搜索任务ID、模型" columns={["任务ID", "请求时间", "结束时间", "总耗时(ms)", "员工姓名", "模型", "状态码"]} rows={rows} />;
}

function Bills({ data, customer }: { data: DealerData; customer: Customer }) {
  const [activeTab, setActiveTab] = React.useState<BillTab>("current");
  const [keyword, setKeyword] = React.useState("");
  const [periodStart, setPeriodStart] = React.useState("");
  const [periodEnd, setPeriodEnd] = React.useState("");
  const [selectedBill, setSelectedBill] = React.useState<Bill | null>(null);
  const bills = React.useMemo(() => buildEnterpriseBills(data, customer), [data, customer]);
  const currentPeriod = formatYearMonth(getDashboardNow());
  const filteredBills = bills.filter((bill) => {
    const matchTab =
      activeTab === "current" ? bill.period === currentPeriod
        : activeTab === "history" ? bill.period < currentPeriod
          : activeTab === "pending" ? bill.status === "待结算"
            : bill.status === "已结算";
    const matchKeyword = !keyword.trim() || bill.billNo.includes(keyword.trim()) || bill.customerName.includes(keyword.trim());
    const matchStart = !periodStart || bill.period >= periodStart;
    const matchEnd = !periodEnd || bill.period <= periodEnd;
    return matchTab && matchKeyword && matchStart && matchEnd;
  });

  function resetFilters() {
    setKeyword("");
    setPeriodStart("");
    setPeriodEnd("");
  }

  return (
    <div className="space-y-4">
      <InlineTabs
        items={[
          { label: "当期账单", value: "current" },
          { label: "往期账单", value: "history" },
          { label: "待结算", value: "pending" },
          { label: "已结算", value: "settled" },
        ]}
        value={activeTab}
        onChange={setActiveTab}
      />
      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 rounded-md border border-slate-200 px-3">
              <Search className="size-4 text-slate-400" />
              <input className="h-10 w-64 outline-none" placeholder="搜索订单号、客户名称" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
            </div>
            <DatePickerInput className="w-40" mode="month" placeholder="开始时间" value={periodStart} onChange={setPeriodStart} />
            <DatePickerInput className="w-40" mode="month" placeholder="结束时间" value={periodEnd} onChange={setPeriodEnd} />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary"><Download className="size-4" />导出账单</Button>
            <Button variant="primary"><Search className="size-4" />查询</Button>
            <Button variant="secondary" onClick={resetFilters}><RotateCcw className="size-4" />重置</Button>
          </div>
        </div>
      </section>
      <SimpleTable
        columns={["账单ID", "客户名称", "账期", "本期消费", "账单状态", "操作"]}
        rows={filteredBills.map((bill) => [
          bill.billNo,
          bill.customerName,
          bill.period,
          formatCurrency(bill.amount),
          bill.status,
          <div key={bill.id} className="flex gap-4">
            <button className="font-medium text-[#1155ff]" onClick={() => setSelectedBill(bill)} type="button">查看明细</button>
            <button className="font-medium text-[#1155ff]" type="button">导出</button>
          </div>,
        ])}
      />
      <Modal description="按模型展示该账期内的 API 调用、Token 和消费金额明细。" open={Boolean(selectedBill)} title={`${selectedBill?.period ?? ""} 账单明细`} onClose={() => setSelectedBill(null)}>
        <BillDetailTable bill={selectedBill} data={data} customer={customer} />
      </Modal>
    </div>
  );
}

function Members({ members, roles, customer, onSave }: { members: EnterpriseMember[]; roles: EnterpriseRole[]; customer: Customer; onSave: (member: EnterpriseMember) => void }) {
  const [open, setOpen] = React.useState(false);
  const [statusOpen, setStatusOpen] = React.useState(false);
  const [keyword, setKeyword] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("全部角色");
  const [statusFilter, setStatusFilter] = React.useState("全部状态");
  const [draft, setDraft] = React.useState<EnterpriseMember>(() => createMemberDraft(customer));
  const [statusDraft, setStatusDraft] = React.useState<EnterpriseMember>(() => createMemberDraft(customer));
  const isEditing = Boolean(draft.id);
  const roleOptions = ["所有者", "管理员", "财务", "销售", "运维"];
  const filteredMembers = members.filter((member) => {
    const matchKeyword = !keyword.trim() || member.name.includes(keyword.trim()) || member.loginAccount.includes(keyword.trim());
    const matchRole = roleFilter === "全部角色" || member.role === roleFilter;
    const matchStatus = statusFilter === "全部状态" || member.status === statusFilter;
    return matchKeyword && matchRole && matchStatus;
  });

  function openCreateForm() {
    setDraft(createMemberDraft(customer));
    setOpen(true);
  }

  function openEditForm(member: EnterpriseMember) {
    setDraft(member);
    setOpen(true);
  }

  function closeForm() {
    setOpen(false);
  }

  function openStatusForm(member: EnterpriseMember) {
    setStatusDraft(member);
    setStatusOpen(true);
  }

  function resetFilters() {
    setKeyword("");
    setRoleFilter("全部角色");
    setStatusFilter("全部状态");
  }

  return (
    <div className="space-y-4">
      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex shrink-0 items-center gap-2 rounded-md border border-slate-200 px-3">
              <Search className="size-4 text-slate-400" />
              <input className="h-10 w-64 outline-none" placeholder="搜索姓名、登录账号" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
            </div>
            <div className="w-36 shrink-0">
              <Select className="h-10" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
                <option>全部角色</option>
                {roleOptions.map((role) => <option key={role}>{role}</option>)}
              </Select>
            </div>
            <div className="w-36 shrink-0">
              <Select className="h-10" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option>全部状态</option>
                <option>启用</option>
                <option>停用</option>
              </Select>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="primary" onClick={openCreateForm}><Plus className="size-4" />添加成员</Button>
            <Button variant="secondary" onClick={resetFilters}><RotateCcw className="size-4" />重置</Button>
          </div>
        </div>
      </section>
      <Modal description="维护企业客户系统内的成员账号、角色和启停状态。" open={open} title={isEditing ? "编辑成员" : "添加成员"} onClose={closeForm}>
        <MemberForm draft={draft} roleOptions={roleOptions} onCancel={closeForm} onChange={setDraft} onSave={() => { onSave(draft); closeForm(); }} />
      </Modal>
      <Modal description="设置成员账号启用或停用状态，并记录本次操作备注。" open={statusOpen} title="启用/禁用成员" onClose={() => setStatusOpen(false)}>
        <MemberStatusForm draft={statusDraft} onCancel={() => setStatusOpen(false)} onChange={setStatusDraft} onSave={() => { onSave(statusDraft); setStatusOpen(false); }} />
      </Modal>
      <SimpleTable columns={["姓名", "登录账号", "角色", "状态", "最后登录时间", "操作"]} rows={filteredMembers.map((member) => [member.name, member.loginAccount, member.role, member.status, member.lastLoginAt, <div key={member.id} className="flex gap-4"><button className="font-medium text-[#1155ff]" onClick={() => openEditForm(member)} type="button">编辑</button><button className="font-medium text-[#1155ff]" onClick={() => openStatusForm(member)} type="button">{member.status === "启用" ? "禁用" : "启用"}</button></div>])} />
    </div>
  );
}

function Roles({ roles, customer, onSave, onDelete }: { roles: EnterpriseRole[]; customer: Customer; onSave: (role: EnterpriseRole) => void; onDelete: (id: string) => void }) {
  const [keyword, setKeyword] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<EnterpriseRole>(() => createRoleDraft(customer));
  const [deleteTarget, setDeleteTarget] = React.useState<EnterpriseRole | null>(null);
  const filteredRoles = roles.filter((role) => !keyword.trim() || role.name.includes(keyword.trim()));
  const isEditing = Boolean(draft.id);

  function openCreateForm() {
    setDraft(createRoleDraft(customer));
    setOpen(true);
  }

  function openEditForm(role: EnterpriseRole) {
    setDraft(role);
    setOpen(true);
  }

  function closeForm() {
    setOpen(false);
  }

  return (
    <div className="space-y-4">
      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100">
        <div className="flex items-center justify-between gap-3">
          <div className="flex shrink-0 items-center gap-2 rounded-md border border-slate-200 px-3">
            <Search className="size-4 text-slate-400" />
            <input className="h-10 w-72 outline-none" placeholder="搜索角色名称" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="primary" onClick={openCreateForm}><Plus className="size-4" />新建角色</Button>
            <Button variant="secondary" onClick={() => setKeyword("")}><RotateCcw className="size-4" />重置</Button>
          </div>
        </div>
      </section>
      <SimpleTable
        columns={["角色名称", "角色描述", "权限列表", "状态", "操作"]}
        rows={filteredRoles.map((role) => [
          role.name,
          role.description,
          <PermissionSummary key={`${role.id}-permissions`} value={role.permissions} />,
          role.status,
          <div key={role.id} className="flex gap-4">
            <button className="font-medium text-[#1155ff]" onClick={() => openEditForm(role)} type="button">编辑</button>
            <button className="font-medium text-rose-500" onClick={() => setDeleteTarget(role)} type="button">删除</button>
          </div>,
        ])}
      />
      <Modal description="定义角色名称、说明和菜单功能权限。" open={open} title={isEditing ? "编辑角色" : "新建角色"} onClose={closeForm}>
        <RoleForm draft={draft} onCancel={closeForm} onChange={setDraft} onSave={() => { onSave(draft); closeForm(); }} />
      </Modal>
      <Modal description="删除后该角色将从当前企业角色列表中移除。" open={Boolean(deleteTarget)} title="删除角色" onClose={() => setDeleteTarget(null)}>
        <DeleteRoleConfirm role={deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={() => { if (deleteTarget) onDelete(deleteTarget.id); setDeleteTarget(null); }} />
      </Modal>
    </div>
  );
}

function TeamReports({ data, customer, members }: { data: DealerData; customer: Customer; members: EnterpriseMember[] }) {
  const records = getCustomerConsumptions(data, customer);
  const [memberAccount, setMemberAccount] = React.useState("全部员工");
  const [range, setRange] = React.useState<TeamReportRange>("last7");
  const [customStart, setCustomStart] = React.useState("");
  const [customEnd, setCustomEnd] = React.useState("");
  const filteredRecords = filterTeamReportRecords(records, range, customStart, customEnd);
  const filteredMembers = members.filter((member) => memberAccount === "全部员工" || member.loginAccount === memberAccount);
  const rows = filteredMembers.map((member) => {
    const memberRecords = filteredRecords.filter((record) => record.registerPhone === member.loginAccount);
    const modelCount = new Set(memberRecords.map((record) => record.modelName)).size;
    const tokens = sum(memberRecords, (record) => record.inputTokens + record.outputTokens);
    const amount = sum(memberRecords, (record) => record.amount);
    const lastCalledAt = memberRecords.map((record) => record.calledAt).sort().at(-1) ?? "暂无调用";
    return [member.name, formatNumber(modelCount), formatNumber(tokens), formatCurrency(amount), lastCalledAt];
  });

  function resetFilters() {
    setMemberAccount("全部员工");
    setRange("last7");
    setCustomStart("");
    setCustomEnd("");
  }

  return (
    <div className="space-y-4">
      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100">
        <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-44 shrink-0">
              <Select className="h-10" value={memberAccount} onChange={(event) => setMemberAccount(event.target.value)}>
                <option>全部员工</option>
                {members.map((member) => <option key={member.id} value={member.loginAccount}>{member.name}</option>)}
              </Select>
            </div>
            <RangeButtonGroup
              items={[
                { label: "近7天", value: "last7" },
                { label: "近30天", value: "last30" },
                { label: "自定义", value: "custom" },
              ]}
              value={range}
              onChange={setRange}
            />
            {range === "custom" ? (
              <>
                <DatePickerInput className="w-36" placeholder="开始时间" value={customStart} onChange={setCustomStart} />
                <DatePickerInput className="w-36" placeholder="结束时间" value={customEnd} onChange={setCustomEnd} />
              </>
            ) : null}
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="secondary"><Download className="size-4" />导出</Button>
            <Button variant="primary"><Search className="size-4" />查询</Button>
            <Button variant="secondary" onClick={resetFilters}><RotateCcw className="size-4" />重置</Button>
          </div>
        </div>
      </section>
      <SimpleTable columns={["员工姓名", "使用大模型数", "消耗Token数", "消耗金额（¥）", "最近使用时间"]} rows={rows} />
    </div>
  );
}

function Profile({ member, customer, onSave }: { member: EnterpriseMember; customer: Customer; onSave: (member: EnterpriseMember) => void }) {
  const [draft, setDraft] = React.useState(member);
  const [passwordDraft, setPasswordDraft] = React.useState({ current: "", next: "", confirm: "" });
  const [message, setMessage] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const isOwner = member.role === "所有者" || member.loginAccount === customer.loginAccount;

  React.useEffect(() => setDraft(member), [member]);

  function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const avatarDataUrl = typeof reader.result === "string" ? reader.result : "";
      setDraft((current) => ({ ...current, avatarDataUrl }));
    };
    reader.readAsDataURL(file);
  }

  function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave(draft);
    setMessage("个人信息已保存");
  }

  function savePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!passwordDraft.current || !passwordDraft.next || !passwordDraft.confirm) {
      setMessage("请完整填写密码信息");
      return;
    }
    if (draft.initialPassword && passwordDraft.current !== draft.initialPassword) {
      setMessage("当前密码不正确");
      return;
    }
    if (passwordDraft.next !== passwordDraft.confirm) {
      setMessage("两次输入的新密码不一致");
      return;
    }
    if (passwordDraft.next.length < 6) {
      setMessage("新密码至少 6 位");
      return;
    }
    onSave({ ...draft, initialPassword: passwordDraft.next });
    setDraft((current) => ({ ...current, initialPassword: passwordDraft.next }));
    setPasswordDraft({ current: "", next: "", confirm: "" });
    setMessage("密码已更新");
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm shadow-slate-100">
          <div className="flex items-center gap-4">
            <div className="relative">
              {draft.avatarDataUrl ? (
                <img alt="头像" className="size-16 rounded-full object-cover" src={draft.avatarDataUrl} />
              ) : (
                <div className="flex size-16 items-center justify-center rounded-full bg-[#101a3d] text-2xl font-bold text-white">{getAvatarText(draft.name)}</div>
              )}
              <button
                aria-label="上传头像"
                className="absolute -bottom-1 -right-1 flex size-7 cursor-pointer items-center justify-center rounded-full border border-white bg-[#1155ff] text-white shadow-sm shadow-blue-200"
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                <Camera className="size-3.5" />
              </button>
              <input ref={fileInputRef} accept="image/*" className="hidden" type="file" onChange={handleAvatarUpload} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-950">个人信息</h2>
              <p className="mt-1 text-sm text-slate-500">维护企业成员资料，数据保存在本地。</p>
            </div>
          </div>

          <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={saveProfile}>
            <label className="space-y-3 text-sm">
              <span className="font-medium text-slate-600">姓名</span>
              <Input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="User" />
            </label>
            <label className="space-y-3 text-sm">
              <span className="font-medium text-slate-600">角色</span>
              <Input value={draft.role} disabled />
            </label>
            <label className="space-y-3 text-sm">
              <span className="font-medium text-slate-600">手机号</span>
              <Input value={draft.loginAccount} onChange={(event) => setDraft((current) => ({ ...current, loginAccount: event.target.value }))} />
            </label>
            <label className="space-y-3 text-sm">
              <span className="font-medium text-slate-600">注册时间</span>
              <Input value={draft.createdAt || customer.createdAt} disabled />
            </label>
            <div className="flex items-end">
              <Button type="submit" variant="primary">
                <Save className="size-4" />
                保存个人信息
              </Button>
            </div>
          </form>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm shadow-slate-100">
          <div className="flex items-center gap-2">
            <UserRound className="size-5 text-slate-400" />
            <h2 className="text-xl font-semibold text-slate-950">修改密码</h2>
          </div>
          <form className="mt-6 space-y-4" onSubmit={savePassword}>
            <Input type="password" placeholder="当前密码" value={passwordDraft.current} onChange={(event) => setPasswordDraft({ ...passwordDraft, current: event.target.value })} />
            <Input type="password" placeholder="新密码" value={passwordDraft.next} onChange={(event) => setPasswordDraft({ ...passwordDraft, next: event.target.value })} />
            <Input type="password" placeholder="确认密码" value={passwordDraft.confirm} onChange={(event) => setPasswordDraft({ ...passwordDraft, confirm: event.target.value })} />
            <Button type="submit" variant="secondary">
              保存密码
            </Button>
          </form>
          {message ? <div className="mt-4 rounded-md bg-blue-50 px-3 py-2 text-sm text-[#1155ff]">{message}</div> : null}
        </section>
      </div>

      {isOwner ? (
        <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm shadow-slate-100">
          <div className="flex items-center gap-3">
            <Building2 className="size-5 text-[#1155ff]" />
            <h2 className="text-xl font-semibold text-slate-950">企业信息</h2>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <InfoItem label="企业名称" value={customer.company} />
            <InfoItem label="注册手机号" value={customer.loginAccount} />
            <InfoItem label="联系人" value={customer.contact} />
            <InfoItem label="联系电话" value={customer.phone} />
          </div>
        </section>
      ) : null}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-100 bg-slate-50/70 px-4 py-3">
      <div className="text-xs font-medium text-slate-400">{label}</div>
      <div className="mt-1 min-h-6 break-all text-sm font-semibold text-slate-800">{value || "-"}</div>
    </div>
  );
}

function ApiKeyForm({ draft, models, onChange, onSave, onCancel }: { draft: ApiKeyDraft; models: DealerData["models"]; onChange: (draft: ApiKeyDraft) => void; onSave: () => void; onCancel: () => void }) {
  return (
    <form className="flex max-h-[calc(100vh-64px)] flex-col" onSubmit={(event) => { event.preventDefault(); onSave(); }}>
      <div className="overflow-y-auto px-7 py-6">
        <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
          <FormField label="Key 名称" required><Input value={draft.keyName} placeholder="例如：生产环境主 Key" onChange={(event) => onChange({ ...draft, keyName: event.target.value })} /></FormField>
          <FormField label="关联模型"><Select value={draft.modelName} onChange={(event) => onChange({ ...draft, modelName: event.target.value })}>{models.map((model) => <option key={model.id}>{model.name}</option>)}</Select></FormField>
          <FormField label="总额度"><Input min={0} type="number" value={draft.quotaTotal} onChange={(event) => onChange({ ...draft, quotaTotal: Number(event.target.value) })} /></FormField>
          <FormField label="剩余额度"><Input min={0} type="number" value={draft.quotaRemain} onChange={(event) => onChange({ ...draft, quotaRemain: Number(event.target.value) })} /></FormField>
          <FormField label="每日限额"><Input min={0} type="number" value={draft.dailyLimit} onChange={(event) => onChange({ ...draft, dailyLimit: Number(event.target.value) })} /></FormField>
          <FormField label="IP 白名单"><Input value={draft.ipWhitelist} placeholder="不限或多个 IP 用逗号分隔" onChange={(event) => onChange({ ...draft, ipWhitelist: event.target.value })} /></FormField>
          <FormField label="过期时间"><DatePickerInput className="h-11" mode="datetime" placeholder="过期时间" value={draft.expiresAt} onChange={(expiresAt) => onChange({ ...draft, expiresAt })} /></FormField>
          <FormField label="状态"><Select value={draft.status} onChange={(event) => onChange({ ...draft, status: event.target.value as CustomerApiKey["status"] })}><option>已启用</option><option>已停用</option></Select></FormField>
        </div>
      </div>
      <ModalFooter onCancel={onCancel} />
    </form>
  );
}

function MemberForm({ draft, roleOptions, onChange, onSave, onCancel }: { draft: EnterpriseMember; roleOptions: string[]; onChange: (member: EnterpriseMember) => void; onSave: () => void; onCancel: () => void }) {
  const [showPassword, setShowPassword] = React.useState(false);
  return (
    <form className="flex max-h-[calc(100vh-64px)] flex-col" onSubmit={(event) => { event.preventDefault(); onSave(); }}>
      <div className="overflow-y-auto px-7 py-6">
        <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
          <FormField label="姓名" required><Input value={draft.name} placeholder="成员姓名" onChange={(event) => onChange({ ...draft, name: event.target.value })} /></FormField>
          <FormField label="登录账号" required><Input value={draft.loginAccount} placeholder="请输入手机号" onChange={(event) => onChange({ ...draft, loginAccount: event.target.value })} /></FormField>
          <FormField label="角色" required><Select value={draft.role} onChange={(event) => onChange({ ...draft, role: event.target.value })}>{roleOptions.map((role) => <option key={role}>{role}</option>)}</Select></FormField>
          <FormField label="初始密码">
            <div className="relative">
              <Input className="pr-12" type={showPassword ? "text" : "password"} value={draft.initialPassword ?? ""} placeholder="留空则自动生成" onChange={(event) => onChange({ ...draft, initialPassword: event.target.value })} />
              <button aria-label={showPassword ? "隐藏初始密码" : "显示初始密码"} className="absolute right-3 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700" onClick={() => setShowPassword((current) => !current)} type="button">
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </FormField>
          <FormField label="状态"><Select value={draft.status} onChange={(event) => onChange({ ...draft, status: event.target.value as EnterpriseMember["status"] })}><option>启用</option><option>停用</option></Select></FormField>
        </div>
      </div>
      <ModalFooter onCancel={onCancel} />
    </form>
  );
}

function MemberStatusForm({ draft, onChange, onSave, onCancel }: { draft: EnterpriseMember; onChange: (member: EnterpriseMember) => void; onSave: () => void; onCancel: () => void }) {
  return (
    <form className="flex max-h-[calc(100vh-64px)] flex-col" onSubmit={(event) => { event.preventDefault(); onSave(); }}>
      <div className="overflow-y-auto px-7 py-6">
        <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
          <FormField label="姓名"><Input disabled value={draft.name} /></FormField>
          <FormField label="角色"><Input disabled value={draft.role} /></FormField>
          <div className="space-y-2 md:col-span-2">
            <span className="block text-sm font-semibold text-slate-700">操作</span>
            <div className="flex gap-6 rounded-md border border-slate-200 px-4 py-3">
              {(["启用", "停用"] as const).map((status) => (
                <label key={status} className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                  <input checked={draft.status === status} name="member-status" type="radio" value={status} onChange={() => onChange({ ...draft, status })} />
                  {status}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <span className="block text-sm font-semibold text-slate-700">备注</span>
            <textarea className="min-h-28 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1155ff]" value={draft.statusRemark ?? ""} placeholder="填写本次启用/停用原因" onChange={(event) => onChange({ ...draft, statusRemark: event.target.value })} />
          </div>
        </div>
      </div>
      <ModalFooter onCancel={onCancel} />
    </form>
  );
}

function RoleForm({ draft, onChange, onSave, onCancel }: { draft: EnterpriseRole; onChange: (role: EnterpriseRole) => void; onSave: () => void; onCancel: () => void }) {
  return (
    <form className="flex max-h-[calc(100vh-64px)] flex-col" onSubmit={(event) => { event.preventDefault(); onSave(); }}>
      <div className="overflow-y-auto px-7 py-6">
        <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
          <FormField label="角色名称" required><Input value={draft.name} placeholder="例如：运维" onChange={(event) => onChange({ ...draft, name: event.target.value })} /></FormField>
          <FormField label="状态"><Select value={draft.status} onChange={(event) => onChange({ ...draft, status: event.target.value as EnterpriseRole["status"] })}><option>启用</option><option>停用</option></Select></FormField>
          <div className="space-y-2 md:col-span-2">
            <span className="block text-sm font-semibold text-slate-700">角色描述</span>
            <textarea className="min-h-24 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1155ff]" value={draft.description} placeholder="描述该角色的职责范围" onChange={(event) => onChange({ ...draft, description: event.target.value })} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <span className="block text-sm font-semibold text-slate-700">权限配置</span>
            <PermissionTree value={draft.permissions} onChange={(permissions) => onChange({ ...draft, permissions })} />
          </div>
        </div>
      </div>
      <ModalFooter onCancel={onCancel} />
    </form>
  );
}

function PermissionTree({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const selected = React.useMemo(() => new Set(parsePermissionTokens(value)), [value]);

  function commit(nextSelected: Set<string>) {
    onChange([...nextSelected].sort((left, right) => enterprisePermissionOrder(left) - enterprisePermissionOrder(right)).join(","));
  }

  function toggle(token: string, checked: boolean) {
    const nextSelected = new Set(selected);
    if (checked) nextSelected.add(token);
    else nextSelected.delete(token);
    commit(nextSelected);
  }

  function toggleModule(module: EnterprisePermissionModule, checked: boolean) {
    const nextSelected = new Set(selected);
    for (const action of module.actions) {
      const token = `${module.label}-${action}`;
      if (checked) nextSelected.add(token);
      else nextSelected.delete(token);
    }
    commit(nextSelected);
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="grid grid-cols-[150px_1fr] border-b border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
        <span>功能模块</span>
        <span>操作权限</span>
      </div>
      <div className="divide-y divide-slate-100">
      {enterprisePermissionModules.map((module) => {
        const moduleTokens = module.actions.map((action) => `${module.label}-${action}`);
        const checkedCount = moduleTokens.filter((token) => selected.has(token)).length;
        const allChecked = checkedCount === moduleTokens.length;
        return (
          <div key={module.key} className="grid grid-cols-[150px_1fr] gap-4 px-4 py-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-800">
              <input checked={allChecked} className="size-4 accent-[#1155ff]" type="checkbox" onChange={(event) => toggleModule(module, event.target.checked)} />
              {module.label}
            </label>
            <div className="flex flex-wrap gap-2">
              {module.actions.map((action) => {
                const token = `${module.label}-${action}`;
                const checked = selected.has(token);
                return (
                  <label key={token} className={cn("flex h-8 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm transition-colors", checked ? "border-blue-100 bg-blue-50 text-[#1155ff]" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300")}>
                    <input checked={checked} className="size-3.5 accent-[#1155ff]" type="checkbox" onChange={(event) => toggle(token, event.target.checked)} />
                    {action}
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}

function PermissionSummary({ value }: { value: string }) {
  const permissions = parsePermissionTokens(value);
  if (permissions.length === 0) return <span className="text-slate-400">未配置</span>;
  return <div className="flex max-w-[520px] flex-wrap gap-2">{permissions.slice(0, 8).map((item) => <span key={item} className="rounded bg-blue-50 px-2 py-1 text-xs font-medium text-[#1155ff]">{item}</span>)}{permissions.length > 8 ? <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-500">+{permissions.length - 8}</span> : null}</div>;
}

function DeleteRoleConfirm({ role, onConfirm, onCancel }: { role: EnterpriseRole | null; onConfirm: () => void; onCancel: () => void }) {
  if (!role) return null;
  return (
    <div className="px-7 py-6">
      <div className="rounded-md border border-rose-100 bg-rose-50 p-4 text-sm text-rose-600">确认删除角色「{role.name}」吗？</div>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel}>取消</Button>
        <Button className="bg-rose-500 hover:bg-rose-600" variant="primary" onClick={onConfirm}>确认删除</Button>
      </div>
    </div>
  );
}

function Modal({ title, description, open, onClose, children }: { title: string; description: string; open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-8 backdrop-blur-sm" role="presentation" onMouseDown={onClose}>
      <section
        aria-modal="true"
        className="max-h-[calc(100vh-64px)] w-full max-w-4xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-6 border-b border-slate-100 px-7 py-6">
          <div>
            <h3 className="text-xl font-semibold text-slate-950">{title}</h3>
            <p className="mt-2 text-sm text-slate-500">{description}</p>
          </div>
          <button aria-label="关闭弹窗" className="flex size-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700" onClick={onClose} type="button">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="space-y-2">
      <span className="block text-sm font-semibold text-slate-700">{label}{required ? <span className="ml-1 text-rose-500">*</span> : null}</span>
      {children}
    </label>
  );
}

function ModalFooter({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/70 px-7 py-5">
      <Button className="h-10 px-5" type="button" variant="secondary" onClick={onCancel}>取消</Button>
      <Button className="h-10 px-6" type="submit" variant="primary"><Save className="size-4" />保存</Button>
    </div>
  );
}

function InlineTabs<T extends string>({ items, value, onChange }: { items: Array<{ label: string; value: T }>; value: T; onChange: (value: T) => void }) {
  return (
    <div className="flex gap-8">
      {items.map((item) => (
        <button key={item.value} className={cn("border-b-2 pb-2 text-sm font-medium transition-colors", value === item.value ? "border-[#1155ff] text-[#1155ff]" : "border-transparent text-slate-400 hover:text-slate-600")} onClick={() => onChange(item.value)} type="button">
          {item.label}
        </button>
      ))}
    </div>
  );
}

function BillDetailTable({ bill, data, customer }: { bill: Bill | null; data: DealerData; customer: Customer }) {
  if (!bill) return null;
  const rows = getCustomerConsumptions(data, customer)
    .filter((record) => record.calledAt.startsWith(bill.period))
    .map((record) => {
      const model = data.models.find((item) => item.name === record.modelName);
      return [
        record.calledAt,
        record.modelName,
        formatNumber(record.inputTokens),
        model ? `${formatCurrency(model.inputPrice)}/1M` : "-",
        formatNumber(record.outputTokens),
        model ? `${formatCurrency(model.outputPrice)}/1M` : "-",
        formatCurrency(record.amount),
      ];
    });

  return (
    <div className="px-7 py-6">
      <SimpleTable columns={["时间", "调用模型", "输入Token", "输入价格", "输出Token", "输出价格", "消费金额"]} rows={rows} />
    </div>
  );
}

function Toolbar({ placeholder, action }: { placeholder: string; action?: React.ReactNode }) {
  return (
    <section className="flex items-center justify-between rounded-md border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100">
      <div className="flex items-center gap-2 rounded-md border border-slate-200 px-3"><Search className="size-4 text-slate-400" /><input className="h-10 w-[360px] outline-none" placeholder={placeholder} /></div>
      <div className="flex gap-2">{action}<Button variant="secondary"><RotateCcw className="size-4" />重置</Button></div>
    </section>
  );
}

function TableWithToolbar({ placeholder, columns, rows }: { placeholder: string; columns: string[]; rows: React.ReactNode[][] }) {
  return <div className="space-y-4"><Toolbar placeholder={placeholder} /><SimpleTable columns={columns} rows={rows} /></div>;
}

function DatePickerInput({ className, mode = "date", placeholder, value, onChange }: { className?: string; mode?: "date" | "month" | "datetime"; placeholder: string; value: string; onChange: (value: string) => void }) {
  const inputType = mode === "datetime" ? "datetime-local" : mode;
  const inputValue = mode === "datetime" ? toDateTimeInputValue(value) : value;

  function handleChange(nextValue: string) {
    onChange(mode === "datetime" ? fromDateTimeInputValue(nextValue) : nextValue);
  }

  return (
    <label className={cn("relative flex h-10 items-center rounded-md border border-slate-200 bg-white text-sm transition-colors focus-within:border-[#1155ff] focus-within:ring-2 focus-within:ring-blue-100", className)}>
      <CalendarDays className="pointer-events-none absolute left-3 size-4 text-slate-400" />
      {!inputValue ? <span className="pointer-events-none absolute left-9 text-slate-400">{placeholder}</span> : null}
      <input
        aria-label={placeholder}
        className={cn("h-full w-full cursor-pointer bg-transparent pl-9 pr-3 outline-none [color-scheme:light]", inputValue ? "text-slate-700" : "text-transparent focus:text-transparent")}
        type={inputType}
        value={inputValue}
        onChange={(event) => handleChange(event.target.value)}
      />
    </label>
  );
}

function toDateTimeInputValue(value: string) {
  if (!value) return "";
  return value.includes("T") ? value.slice(0, 16) : value.replace(" ", "T").slice(0, 16);
}

function fromDateTimeInputValue(value: string) {
  return value.replace("T", " ");
}

function SimpleTable({ columns, rows }: { columns: string[]; rows: React.ReactNode[][] }) {
  return (
    <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm shadow-slate-100">
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead className="bg-slate-50 text-left text-slate-500"><tr>{columns.map((column) => <th key={column} className="h-12 whitespace-nowrap border-b border-slate-200 px-4 font-medium">{column}</th>)}</tr></thead>
          <tbody>{rows.length === 0 ? <tr><td colSpan={columns.length} className="h-24 text-center text-slate-500">暂无数据</td></tr> : rows.map((row, index) => <tr key={index} className="hover:bg-slate-50/70">{row.map((cell, cellIndex) => <td key={cellIndex} className="whitespace-nowrap border-b border-slate-100 px-4 py-3 text-slate-700">{cell}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}

function ActionButtons({ enabled, onEdit, onToggle, onDelete }: { enabled: boolean; onEdit: () => void; onToggle: () => void; onDelete: () => void }) {
  return <div className="flex gap-4"><button className="font-medium text-[#1155ff]" onClick={onEdit} type="button">编辑</button><button className="font-medium text-[#1155ff]" onClick={onToggle} type="button">{enabled ? "停用" : "启用"}</button><button className="font-medium text-rose-500" onClick={onDelete} type="button">删除</button></div>;
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
        <button key={item.value} className={cn("border-b-2 pb-2 text-sm font-medium transition-colors", value === item.value ? "border-[#1155ff] text-[#1155ff]" : "border-transparent text-slate-400 hover:text-slate-600")} onClick={() => onChange(item.value)} type="button">
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

  return <RangeButtonGroup items={items} value={value} onChange={onChange} />;
}

function RankingRangeTabs({ value, onChange }: { value: TrendRange; onChange: (value: TrendRange) => void }) {
  const items: Array<{ label: string; value: TrendRange }> = [
    { label: "近7天", value: "last7" },
    { label: "近30天", value: "last30" },
    { label: "本月", value: "month" },
  ];

  return <RangeButtonGroup items={items} value={value} onChange={onChange} />;
}

function RangeButtonGroup<T extends string>({ items, value, onChange }: { items: Array<{ label: string; value: T }>; value: T; onChange: (value: T) => void }) {
  return (
    <div className="flex rounded-md bg-slate-50 p-1">
      {items.map((item) => (
        <button key={item.value} className={cn("h-8 rounded px-5 text-sm font-medium transition-colors", value === item.value ? "bg-white text-slate-950 shadow-sm" : "text-slate-400 hover:text-slate-600")} onClick={() => onChange(item.value)} type="button">
          {item.label}
        </button>
      ))}
    </div>
  );
}

function EnterpriseRankingTabs({ value, onChange }: { value: EnterpriseRankMetric; onChange: (value: EnterpriseRankMetric) => void }) {
  const items: Array<{ label: string; value: EnterpriseRankMetric }> = [
    { label: "模型消耗", value: "model" },
    { label: "员工消耗", value: "employee" },
  ];

  return (
    <div className="flex gap-6">
      {items.map((item) => (
        <button key={item.value} className={cn("border-b-2 pb-2 text-sm font-medium transition-colors", value === item.value ? "border-[#1155ff] text-[#1155ff]" : "border-transparent text-slate-400 hover:text-slate-600")} onClick={() => onChange(item.value)} type="button">
          {item.label}
        </button>
      ))}
    </div>
  );
}

function RankingBars({ items, maxAmount, metric }: { items: RankItem[]; maxAmount: number; metric: EnterpriseRankMetric }) {
  const [hoveredItem, setHoveredItem] = React.useState<RankItem | null>(null);
  const colors = ["bg-[#1155ff]", "bg-[#14c8e5]", "bg-[#f25be9]"];
  const labelWidth = React.useMemo(() => {
    const maxTextWidth = Math.max(...items.map((item) => estimateLabelWidth(item.name)), 48);
    return Math.min(maxTextWidth, 220);
  }, [items]);

  return (
    <div className="relative mt-5 space-y-3">
      {items.length === 0 ? <div className="py-12 text-center text-sm text-slate-400">暂无排行数据</div> : null}
      {items.map((item, index) => (
        <div key={item.name} className="flex items-center gap-2.5 py-1 text-sm">
          <span className="shrink-0 truncate text-left text-slate-500" style={{ width: labelWidth }}>{item.name}</span>
          <div className="relative h-3 min-w-0 flex-1 border-l border-slate-200 bg-slate-50">
            <div
              className={cn("h-full cursor-pointer transition-opacity hover:opacity-85", index < 3 ? colors[index] : "bg-slate-300")}
              style={{ width: `${(item.amount / maxAmount) * 100}%` }}
              onMouseEnter={() => setHoveredItem(item)}
              onMouseLeave={() => setHoveredItem(null)}
            />
            {hoveredItem?.name === item.name ? (
              <div className="pointer-events-none absolute left-1/2 top-[-78px] z-20 w-[230px] -translate-x-1/2 rounded-md border border-slate-100 bg-white/95 p-3 text-xs shadow-xl shadow-slate-200">
                <div className="font-semibold text-slate-950">{item.name}</div>
                <div className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-slate-500">
                  <span>{metric === "model" ? "模型名称" : "员工姓名"}</span>
                  <span className="font-semibold text-slate-900">{item.name}</span>
                  <span>消耗金额</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(item.amount)}</span>
                  <span>消耗 Token</span>
                  <span className="font-semibold text-slate-900">{formatNumber(item.tokens)}</span>
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

function TrendChart({ metric, range, points }: { metric: TrendMetric; range: TrendRange; points: Array<{ label: string; value: number }> }) {
  const chartRef = React.useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  const [chartWidth, setChartWidth] = React.useState(1200);
  const chartHeight = 320;
  const plot = getChartPlot(chartWidth);
  const maxValue = Math.max(...points.map((point) => point.value), 1);
  const yLabels = Array.from({ length: 5 }, (_, index) => Math.round((maxValue / 4) * (4 - index)));
  const polylinePoints = points.map((point, index) => {
    const { x, y } = getChartPoint(point, index, points.length, maxValue, plot);
    return `${x},${y}`;
  }).join(" ");
  const visibleLabels = getVisibleTrendLabels(points, range, maxValue, plot);
  const titleMap: Record<TrendMetric, string> = {
    amount: "消耗金额趋势图",
    tokens: "消耗Tokens趋势图",
    calls: "调用次数趋势图",
  };

  React.useLayoutEffect(() => {
    const element = chartRef.current;
    if (!element) return;
    const updateWidth = () => setChartWidth(Math.max(720, Math.round(element.clientWidth)));
    updateWidth();
    if (typeof ResizeObserver === "undefined") return;
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
            <foreignObject x={Math.min(Math.max(hoveredPoint.x + 12, plot.left), plot.right - 190)} y={Math.max(hoveredPoint.y - 76, plot.top)} width="180" height="72">
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
          <text key={`${label}-${index}`} x="0" y={62 + index * 50} fill="#9ca3af" fontSize="12">{formatTrendValue(label, metric)}</text>
        ))}
        {visibleLabels.map(({ point, index }) => {
          const { x } = getChartPoint(point, index, points.length, maxValue, plot);
          const isFirst = index === 0;
          const isLast = index === points.length - 1;
          return (
            <text key={`${point.label}-${index}`} x={isFirst ? Math.max(x, plot.left) : isLast ? Math.min(x, plot.right) : x} y="300" fill="#9ca3af" fontSize="13" textAnchor={isFirst ? "start" : isLast ? "end" : "middle"}>
              {point.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function getVisibleTrendLabels(points: Array<{ label: string; value: number }>, range: TrendRange, maxValue: number, plot: ReturnType<typeof getChartPlot>) {
  const labelCandidates = points.flatMap((point, index) => {
    const step = range === "today" ? 2 : points.length > 12 ? Math.ceil(points.length / 8) : 1;
    return index % step === 0 || index === points.length - 1 ? [{ point, index }] : [];
  });

  return labelCandidates.reduce<Array<{ point: { label: string; value: number }; index: number }>>((labels, candidate) => {
    const minLabelGap = range === "today" ? 56 : 74;
    const candidateX = getChartPoint(candidate.point, candidate.index, points.length, maxValue, plot).x;
    const previous = labels.at(-1);
    if (!previous) return [candidate];
    const previousX = getChartPoint(previous.point, previous.index, points.length, maxValue, plot).x;
    if (candidateX - previousX >= minLabelGap) return [...labels, candidate];
    if (candidate.index === points.length - 1) return [...labels.slice(0, -1), candidate];
    return labels;
  }, []);
}

function getChartPoint(point: { label: string; value: number }, index: number, total: number, maxValue: number, plot: ReturnType<typeof getChartPlot>) {
  const x = total === 1 ? plot.left : plot.left + (index / (total - 1)) * (plot.right - plot.left);
  const y = plot.bottom - (point.value / maxValue) * (plot.bottom - plot.top);
  return { ...point, x, y };
}

function getChartPlot(chartWidth: number) {
  return { top: 36, bottom: 270, left: 32, right: chartWidth - 8 };
}

function formatTrendValue(value: number, metric: TrendMetric): string {
  if (metric === "amount") return `¥${Math.round(value / 1000)}k`;
  if (metric === "tokens") return `${Math.round(value / 10000)}w`;
  return String(value);
}

function formatTrendTooltipValue(value: number, metric: TrendMetric): string {
  if (metric === "amount") return formatCurrency(value);
  if (metric === "tokens") return `${formatNumber(value)} Tokens`;
  return `${formatNumber(value)} 次`;
}

function estimateLabelWidth(label: string) {
  return Array.from(label).reduce((total, char) => total + (/[\u4e00-\u9fff]/.test(char) ? 16 : 8), 12);
}

function SectionTitle({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) {
  return <div className="flex items-center gap-3"><Icon className="size-6 text-slate-400" /><h2 className="text-xl font-bold text-slate-950">{title}</h2></div>;
}

function MetricCard({ icon: Icon, tone, label, value, helperLabel, helperValue }: { icon: React.ComponentType<{ className?: string }>; tone: "cyan" | "pink" | "blue" | "indigo"; label: string; value: string; helperLabel: string; helperValue: string }) {
  const toneClasses = { cyan: "to-cyan-50 text-cyan-500", pink: "to-pink-50 text-pink-400", blue: "to-blue-50 text-blue-500", indigo: "to-blue-50 text-[#1155ff]" }[tone];
  return <div className={`min-h-[118px] rounded-md border border-slate-200 bg-gradient-to-br from-white ${toneClasses} p-5 shadow-sm shadow-slate-100`}><div className="flex items-start justify-between gap-4"><div><div className="text-xs text-slate-400">{label}</div><div className="mt-1 text-2xl font-semibold text-slate-950">{value}</div><div className="mt-4 text-xs text-slate-400">{helperLabel}</div><div className="mt-1 text-xl font-semibold text-slate-950">{helperValue}</div></div><div className="flex size-12 items-center justify-center rounded-full border border-blue-100 bg-white/70"><Icon className="size-6" /></div></div></div>;
}

function HeaderIcon({ label, children }: { label: string; children: React.ReactNode }) {
  return <button className="flex size-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-950 shadow-sm shadow-slate-100 hover:bg-blue-50" aria-label={label} type="button">{children}</button>;
}

function isNavBranch(item: NavEntry): item is NavBranch {
  return "children" in item;
}

function getAllEnterpriseNavItems() {
  return navGroups.flatMap((group) => group.items.flatMap((item) => (isNavBranch(item) ? item.children : [item])));
}

function getActiveBranch(activePage: EnterprisePageKey) {
  for (const group of navGroups) {
    for (const item of group.items) {
      if (isNavBranch(item) && item.children.some((child) => child.key === activePage)) {
        return item.label;
      }
    }
  }

  return null;
}

function filterEnterpriseNavGroups(allowedPages: ReadonlySet<EnterprisePageKey>) {
  return navGroups
    .map((group) => ({
      ...group,
      items: group.items.flatMap((item): NavEntry[] => {
        if (isNavBranch(item)) {
          const children = item.children.filter((child) => allowedPages.has(child.key));
          return children.length > 0 ? [{ ...item, children }] : [];
        }

        return allowedPages.has(item.key) ? [item] : [];
      }),
    }))
    .filter((group) => group.items.length > 0);
}

const enterpriseLegacyPermissionPages: Record<string, EnterprisePageKey[]> = {
  看板: ["dashboard"],
  模型: ["models", "trial"],
  模型管理: ["models", "trial"],
  API: ["apiKeys", "consumptions", "usageLogs"],
  财务: ["bills"],
  财务管理: ["bills"],
  团队管理: ["members", "roles", "teamReports"],
  管理: ["members", "roles", "teamReports"],
  个人中心: ["profile"],
};

const enterpriseModulePages: Record<string, EnterprisePageKey[]> = {
  看板: ["dashboard"],
  模型管理: ["models", "trial"],
  "API Key": ["apiKeys"],
  消费记录: ["consumptions"],
  使用日志: ["usageLogs"],
  账单: ["bills"],
  团队成员: ["members"],
  角色管理: ["roles"],
  团队报表: ["teamReports"],
  个人中心: ["profile"],
};

function resolveEnterpriseAllowedPages(roles: EnterpriseRole[], member: EnterpriseMember, customer: Customer): ReadonlySet<EnterprisePageKey> {
  const isOwner = member.role === "所有者" || member.loginAccount === customer.loginAccount;
  if (isOwner) {
    return new Set(Object.keys(routes) as EnterprisePageKey[]);
  }

  const role = roles.find((item) => item.name === member.role && item.status === "启用");
  if (!role) {
    return new Set<EnterprisePageKey>(["profile"]);
  }

  const pages = new Set<EnterprisePageKey>();
  for (const page of parseEnterprisePermissionPages(role.permissions)) {
    pages.add(page);
  }
  pages.add("profile");

  return pages.size > 0 ? pages : new Set<EnterprisePageKey>(["profile"]);
}

function parseEnterprisePermissionPages(value: string): EnterprisePageKey[] {
  return value
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .flatMap((item) => {
      const [moduleLabel] = item.split("-");
      return enterpriseModulePages[moduleLabel] ?? enterpriseLegacyPermissionPages[moduleLabel] ?? [];
    });
}

function resolveEnterpriseContext(data: DealerData, loginAccount: string) {
  const member = data.enterpriseMembers.find((item) => item.loginAccount === loginAccount);
  const customer = data.customers.find((item) => item.loginAccount === loginAccount)
    ?? data.customers.find((item) => item.company === member?.customerName)
    ?? data.customers[0];
  const resolvedMember = member ?? {
    id: "temporary-enterprise-member",
    customerName: customer.company,
    name: customer.contact || "User",
    loginAccount: customer.loginAccount,
    role: "所有者",
    status: "启用" as const,
    lastLoginAt: "未登录",
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };
  return {
    customer,
    member: resolvedMember,
    members: data.enterpriseMembers.filter((item) => item.customerName === customer.company),
    roles: data.enterpriseRoles.filter((item) => item.customerName === customer.company),
  };
}

function getCustomerApiKeys(data: DealerData, customer: Customer) {
  return data.apiKeys.filter((key) => key.customerName === customer.company);
}

function getCustomerConsumptions(data: DealerData, customer: Customer) {
  return data.consumptions.filter((record) => record.customerName === customer.company);
}

function getCustomerBills(data: DealerData, customer: Customer) {
  return data.bills.filter((bill) => bill.customerName === customer.company);
}

function buildEnterpriseBills(data: DealerData, customer: Customer): Bill[] {
  const persistedBills = getCustomerBills(data, customer);
  const existingPeriods = new Set(persistedBills.map((bill) => bill.period));
  const recordsByPeriod = new Map<string, ConsumptionRecord[]>();

  for (const record of getCustomerConsumptions(data, customer)) {
    const period = record.calledAt.slice(0, 7);
    recordsByPeriod.set(period, [...(recordsByPeriod.get(period) ?? []), record]);
  }

  const generatedBills = [...recordsByPeriod.entries()]
    .filter(([period]) => !existingPeriods.has(period))
    .map(([period, records]) => {
      const amount = sum(records, (record) => record.amount);
      const openingBalance = amount + 100000;
      return {
        id: `generated-bill-${customer.id}-${period}`,
        billNo: `BILL${period.replace("-", "")}-${customer.id.slice(-4).toUpperCase()}`,
        customerName: customer.company,
        period,
        openingBalance,
        recharge: 0,
        amount,
        closingBalance: Math.max(openingBalance - amount, 0),
        status: period === formatYearMonth(getDashboardNow()) ? "待结算" : "已结算",
        createdAt: `${period}-28 18:00`,
        updatedAt: getLocalNow(),
      } satisfies Bill;
    });

  return [...persistedBills, ...generatedBills].sort((left, right) => right.period.localeCompare(left.period));
}

function buildEnterpriseRanking(data: DealerData, customer: Customer, records: ConsumptionRecord[], metric: EnterpriseRankMetric, limit = 10): RankItem[] {
  const grouped = new Map<string, RankItem>();

  for (const record of records.filter((item) => item.status === "成功")) {
    const name = metric === "model" ? record.modelName : getEmployeeName(data, customer, record.registerPhone);
    const current = grouped.get(name) ?? { name, amount: 0, tokens: 0, count: 0 };
    current.amount += record.amount;
    current.tokens += record.inputTokens + record.outputTokens;
    current.count += 1;
    grouped.set(name, current);
  }

  return [...grouped.values()].sort((left, right) => right.amount - left.amount).slice(0, limit);
}

function filterRecordsByRange(records: ConsumptionRecord[], range: TrendRange, now: Date) {
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

function filterTeamReportRecords(records: ConsumptionRecord[], range: TeamReportRange, customStart: string, customEnd: string) {
  const now = getDashboardNow();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (range === "last7") {
    start.setDate(start.getDate() - 6);
  } else if (range === "last30") {
    start.setDate(start.getDate() - 29);
  } else if (customStart) {
    const parsedStart = new Date(customStart.replace(" ", "T"));
    if (!Number.isNaN(parsedStart.getTime())) {
      start.setTime(parsedStart.getTime());
    }
  }

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  if (range === "custom" && customEnd) {
    const parsedEnd = new Date(customEnd.replace(" ", "T"));
    if (!Number.isNaN(parsedEnd.getTime())) {
      end.setTime(parsedEnd.getTime());
      end.setHours(23, 59, 59, 999);
    }
  }

  return records.filter((record) => {
    const calledAt = new Date(record.calledAt.replace(" ", "T"));
    return calledAt >= start && calledAt <= end;
  });
}

function getDashboardNow() {
  return new Date("2026-07-03T14:00:00+08:00");
}

function formatYearMonth(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function createApiKeyDraft(data: DealerData): ApiKeyDraft {
  return {
    keyName: "",
    modelName: data.models.find((model) => model.status === "可用")?.name ?? data.models[0]?.name ?? "",
    quotaTotal: 1000000,
    quotaRemain: 1000000,
    dailyLimit: 200000,
    ipWhitelist: "不限",
    status: "已启用",
    expiresAt: "2027-07-03 23:59",
  };
}

function toApiKeyDraft(key: CustomerApiKey): ApiKeyDraft {
  return {
    keyName: key.keyName,
    modelName: key.modelName,
    quotaTotal: key.quotaTotal,
    quotaRemain: key.quotaRemain,
    dailyLimit: key.dailyLimit,
    ipWhitelist: key.ipWhitelist,
    status: key.status,
    expiresAt: key.expiresAt,
  };
}

function createMemberDraft(customer: Customer): EnterpriseMember {
  return {
    id: "",
    customerName: customer.company,
    name: "",
    loginAccount: "",
    role: "管理员",
    status: "启用",
    lastLoginAt: "未登录",
    initialPassword: generateInitialPassword(),
    statusRemark: "",
    createdAt: "",
    updatedAt: "",
  };
}

function createRoleDraft(customer: Customer): EnterpriseRole {
  return {
    id: "",
    customerName: customer.company,
    name: "",
    description: "",
    permissions: "看板-查看",
    status: "启用",
    createdAt: "",
    updatedAt: "",
  };
}

function generateInitialPassword() {
  return `Omni@${Math.floor(100000 + Math.random() * 900000)}`;
}

function parsePermissionTokens(value: string) {
  const legacyModuleLabels = new Set(enterprisePermissionModules.map((module) => module.label));
  return value
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .flatMap((item) => legacyModuleLabels.has(item) ? [`${item}-查看`] : [item]);
}

function enterprisePermissionOrder(token: string) {
  const [moduleLabel, action = ""] = token.split("-");
  const moduleIndex = enterprisePermissionModules.findIndex((module) => module.label === moduleLabel);
  const module = enterprisePermissionModules[moduleIndex];
  const actionIndex = module?.actions.indexOf(action) ?? -1;
  return (moduleIndex === -1 ? 999 : moduleIndex) * 100 + (actionIndex === -1 ? 99 : actionIndex);
}

function buildTrialOutput(sessionType: string, modelName: string, keyName: string, prompt: string) {
  const preview = `${prompt.slice(0, 34)}${prompt.length > 34 ? "..." : ""}`;
  const intro = `已使用 ${modelName || "模型"} 和 ${keyName || "API Key"} 完成${sessionType}模拟调用。`;
  const outputByType: Record<string, string> = {
    对话补全: "生成内容建议包含鉴权方式、请求限额、错误码处理、账单核对和上线检查清单。",
    图像: "已生成一张企业级 API 接入流程示意图，包含调用方、鉴权网关、模型服务和账单统计节点。",
    文本转语音: "已将提示词转换为一段清晰的中文语音播报，适合用于客户培训或接入说明。",
    视频: "已生成一段短视频脚本，按场景介绍 API 接入、密钥管理、用量监控和成本分析。",
    语音转文本: "已完成语音转写模拟，并整理为结构化文本摘要，方便后续检索和归档。",
  };

  return `${intro}\n\n输入提示：${preview}\n\n${outputByType[sessionType] ?? outputByType["对话补全"]}`;
}

function getEmployeeName(data: DealerData, customer: Customer, loginAccount: string) {
  return data.enterpriseMembers.find((member) => member.customerName === customer.company && member.loginAccount === loginAccount)?.name ?? customer.contact;
}

function getPageFromLocation(): EnterprisePageKey {
  const path = window.location.pathname.replace(/\/$/, "");
  return pageByRoute[path] ?? "dashboard";
}

function syncRoute(page: EnterprisePageKey, replace = false) {
  const nextPath = routes[page];
  if (window.location.pathname === nextPath) return;
  if (replace) window.history.replaceState(null, "", nextPath);
  else window.history.pushState(null, "", nextPath);
}

function getLocalNow() {
  return "2026-07-04 10:00";
}

function getAvatarText(name: string) {
  return (name.trim() || "User").slice(0, 1).toUpperCase();
}

function sum<T>(items: T[], getValue: (item: T) => number) {
  return items.reduce((total, item) => total + getValue(item), 0);
}

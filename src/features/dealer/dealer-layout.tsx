import * as React from "react";
import {
  BarChart3,
  Bell,
  BookOpenText,
  BriefcaseBusiness,
  ChevronDown,
  ChevronLeft,
  ClipboardList,
  FileKey2,
  FileText,
  Headphones,
  Home,
  Layers,
  LineChart,
  LogOut,
  Menu,
  Package,
  ReceiptText,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DealerPageKey, DealerProfile } from "./types";

interface DealerLayoutProps {
  activePage: DealerPageKey;
  allowedPages: ReadonlySet<DealerPageKey>;
  profile: DealerProfile;
  onLogout: () => void;
  onPageChange: (page: DealerPageKey) => void;
  onResetData: () => void;
  children: React.ReactNode;
}

interface NavItem {
  key: DealerPageKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavBranch {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children: NavItem[];
}

type NavEntry = NavItem | NavBranch;

const navGroups: Array<{ label: string; items: NavEntry[] }> = [
  { label: "", items: [{ key: "dashboard", label: "看板", icon: Home }] },
  {
    label: "模型",
    items: [
      { key: "models", label: "大模型", icon: Layers },
      { key: "trial", label: "模拟试用", icon: Sparkles },
      { key: "products", label: "模型产品", icon: Package },
    ],
  },
  {
    label: "客户",
    items: [
      {
        label: "客户管理",
        icon: BriefcaseBusiness,
        children: [
          { key: "customers", label: "我的客户", icon: BriefcaseBusiness },
          { key: "apiKeys", label: "客户API Key", icon: FileKey2 },
          { key: "consumptions", label: "消费记录", icon: ReceiptText },
          { key: "usageLogs", label: "使用日志", icon: BookOpenText },
        ],
      },
      { key: "reports", label: "客户报表", icon: BarChart3 },
    ],
  },
  {
    label: "财务",
    items: [
      { key: "contracts", label: "合同", icon: ClipboardList },
      { key: "bills", label: "账单", icon: FileText },
    ],
  },
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

export function DealerLayout({ activePage, allowedPages, profile, onLogout, onPageChange, onResetData, children }: DealerLayoutProps) {
  const visibleNavGroups = React.useMemo(() => filterNavGroups(allowedPages), [allowedPages]);
  const activeLabel = getAllNavItems().find((item) => item.key === activePage)?.label ?? "看板";
  const [openBranches, setOpenBranches] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    const activeBranch = getActiveBranch(activePage, visibleNavGroups);
    if (!activeBranch) {
      return;
    }

    setOpenBranches((current) => ({ ...current, [activeBranch]: true }));
  }, [activePage, visibleNavGroups]);

  function toggleBranch(label: string) {
    setOpenBranches((current) => ({ ...current, [label]: !current[label] }));
  }

  return (
    <div className="min-h-screen bg-white text-[#111827]">
      <aside className="fixed inset-y-0 left-0 hidden w-[300px] border-r border-slate-100 bg-white lg:block">
        <div className="flex h-[104px] items-center gap-2 px-4">
          <div className="flex items-center gap-2 text-[28px] font-black tracking-tight">
            <span className="text-[#1155ff]">Omni</span>
            <span className="text-slate-950">AI</span>
          </div>
        </div>

        <button className="absolute right-4 top-10 flex size-7 items-center justify-center rounded border border-slate-200 text-slate-300">
          <ChevronLeft className="size-4" />
        </button>

        <div className="group relative mx-4">
          <div className="flex h-16 cursor-pointer items-center gap-3 rounded-md border border-slate-200 bg-white px-3 shadow-sm shadow-slate-100 transition-colors group-hover:border-blue-100 group-hover:shadow-md group-hover:shadow-slate-100">
            <div className="flex size-11 items-center justify-center rounded bg-[#101a3d] font-bold text-white">
              {profile.avatarText}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-slate-800">{profile.name}</div>
              <div className="truncate text-sm text-slate-400">{profile.phone}</div>
            </div>
            <ChevronDown className="size-5 text-slate-700 transition-transform group-hover:rotate-180" />
          </div>

          <div className="invisible absolute left-0 right-0 top-[72px] z-40 rounded-md border border-slate-200 bg-white p-2 opacity-0 shadow-xl shadow-slate-200/70 transition-all duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
            <button
              className="flex h-10 w-full cursor-pointer items-center gap-3 rounded px-3 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-blue-50 hover:text-[#1155ff]"
              onClick={() => onPageChange("profile")}
              type="button"
            >
              <UserRound className="size-4" />
              个人中心
            </button>
            <button
              className="flex h-10 w-full cursor-pointer items-center gap-3 rounded px-3 text-left text-sm font-medium text-rose-500 transition-colors hover:bg-rose-50"
              onClick={onLogout}
              type="button"
            >
              <LogOut className="size-4" />
              退出登录
            </button>
          </div>
        </div>

        <nav className="mt-5 h-[calc(100vh-190px)] overflow-y-auto px-4 pb-8">
          {visibleNavGroups.map((group, groupIndex) => (
            <div key={`${group.label}-${groupIndex}`} className="border-t border-dashed border-slate-100 first:border-t-0">
              {group.label ? <div className="pb-2 pt-4 text-sm text-slate-400">{group.label}</div> : null}
              <div className="space-y-1">
                {group.items.map((item) => {
                  if (isNavBranch(item)) {
                    const open = Boolean(openBranches[item.label]);
                    const selected = item.children.some((child) => child.key === activePage);
                    return (
                      <div key={item.label}>
                        <button
                          className={cn(
                            "flex h-12 w-full items-center gap-3 rounded-md px-4 text-left text-base font-medium transition-colors",
                            selected ? "text-slate-900" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                          )}
                          onClick={() => toggleBranch(item.label)}
                        >
                          <item.icon className={cn("size-5", selected ? "text-[#1155ff]" : "text-slate-400")} />
                          <span className="flex-1">{item.label}</span>
                          <ChevronDown className={cn("size-4 text-slate-400 transition-transform", open ? "rotate-180" : "")} />
                        </button>
                        {open ? (
                          <div className="mt-1 space-y-1 pl-8">
                            {item.children.map((child) => {
                              const childSelected = activePage === child.key;
                              return (
                                <button
                                  key={child.key}
                                  className={cn(
                                    "flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium transition-colors",
                                    childSelected ? "bg-[#1155ff] text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                                  )}
                                  onClick={() => onPageChange(child.key)}
                                >
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

                  const selected = activePage === item.key;
                  return (
                    <button
                      key={item.key}
                      className={cn(
                        "flex h-12 w-full items-center gap-3 rounded-md px-4 text-left text-base font-medium transition-colors",
                        selected ? "bg-[#1155ff] text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                      )}
                      onClick={() => onPageChange(item.key)}
                    >
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

      <div className="min-h-screen bg-[#f6f7f9] p-4 lg:ml-[300px] lg:p-4">
        <div className="min-h-[calc(100vh-32px)] rounded-[32px] border border-slate-200 bg-[#f8f9fb] p-4 shadow-sm shadow-slate-100">
          <header className="sticky top-4 z-20 flex h-16 items-center justify-between rounded-md border border-slate-200 bg-white px-4 shadow-sm shadow-slate-100">
            <div className="flex min-w-0 items-center gap-3">
              <Button className="lg:hidden" variant="ghost" aria-label="打开导航">
                <Menu className="size-4" />
              </Button>
              <h1 className="truncate text-lg font-bold text-slate-950 md:text-2xl">{activeLabel}</h1>
            </div>

            <div className="flex items-center gap-2">
              <HeaderIcon label="通知">
                <Bell className="size-5" />
              </HeaderIcon>
              <button
                className="hidden h-11 rounded-md border border-slate-200 px-4 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50 md:block"
                onClick={onResetData}
              >
                重置本地数据
              </button>
              <button
                className="flex size-11 items-center justify-center rounded-full bg-[#1155ff] text-white shadow-sm shadow-blue-200 transition-colors hover:bg-[#0648f4]"
                aria-label="客服"
              >
                <Headphones className="size-5" />
              </button>
            </div>
          </header>

          <main className="pt-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

function isNavBranch(item: NavEntry): item is NavBranch {
  return "children" in item;
}

function getAllNavItems() {
  return navGroups.flatMap((group) => group.items.flatMap((item) => (isNavBranch(item) ? item.children : [item])));
}

function getActiveBranch(activePage: DealerPageKey, groups: Array<{ label: string; items: NavEntry[] }>) {
  for (const group of groups) {
    for (const item of group.items) {
      if (isNavBranch(item) && item.children.some((child) => child.key === activePage)) {
        return item.label;
      }
    }
  }

  return null;
}

function filterNavGroups(allowedPages: ReadonlySet<DealerPageKey>) {
  return navGroups
    .map((group) => ({
      ...group,
      items: group.items
        .map((item) => {
          if (!isNavBranch(item)) {
            return allowedPages.has(item.key) ? item : null;
          }

          const children = item.children.filter((child) => allowedPages.has(child.key));
          return children.length > 0 ? { ...item, children } : null;
        })
        .filter((item): item is NavEntry => Boolean(item)),
    }))
    .filter((group) => group.items.length > 0);
}

function HeaderIcon({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <button
      className="flex size-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-950 shadow-sm shadow-slate-100 transition-colors hover:border-blue-100 hover:bg-blue-50 hover:text-[#1155ff]"
      aria-label={label}
    >
      {children}
    </button>
  );
}

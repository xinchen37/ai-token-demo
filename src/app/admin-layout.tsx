import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  ChevronDown,
  ChevronLeft,
  ClipboardList,
  Database,
  FileText,
  Globe2,
  Headphones,
  Home,
  Layers,
  Menu,
  Search,
  Settings,
  UserRound,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PageKey = "dashboard" | "tasks";

interface AdminLayoutProps {
  activePage: PageKey;
  onPageChange: (page: PageKey) => void;
  children: React.ReactNode;
}

const navGroups = [
  {
    label: "",
    items: [{ key: "dashboard", label: "概览", icon: Home }],
  },
  {
    label: "模型",
    items: [
      { key: "tasks", label: "大模型", icon: Layers },
      { key: "tasks", label: "模拟试用", icon: Layers },
      { key: "tasks", label: "出售模型", icon: Layers },
    ],
  },
  {
    label: "客户",
    items: [
      { key: "tasks", label: "客户管理", icon: BriefcaseBusiness },
      { key: "tasks", label: "统计分析", icon: BarChart3 },
    ],
  },
  {
    label: "财务",
    items: [
      { key: "tasks", label: "合同", icon: ClipboardList },
      { key: "tasks", label: "账单", icon: FileText },
    ],
  },
  {
    label: "管理",
    items: [
      { key: "tasks", label: "团队管理", icon: Users },
      { key: "tasks", label: "个人中心", icon: UserRound },
      { key: "tasks", label: "系统设置", icon: Settings },
    ],
  },
] satisfies Array<{
  label: string;
  items: Array<{
    key: PageKey;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }>;
}>;

export function AdminLayout({
  activePage,
  onPageChange,
  children,
}: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-white text-[#111827]">
      <aside className="fixed inset-y-0 left-0 hidden w-[300px] border-r border-slate-100 bg-white lg:block">
        <div className="flex h-[104px] items-center gap-2 px-4">
          <div className="flex items-center gap-2 text-[28px] font-black tracking-tight">
            <span className="text-[#1155ff]">AD</span>
            <span className="text-slate-950">AiDEA</span>
          </div>
        </div>

        <button className="absolute right-4 top-10 flex size-7 items-center justify-center rounded border border-slate-200 text-slate-300">
          <ChevronLeft className="size-4" />
        </button>

        <div className="mx-4 flex h-16 items-center gap-3 rounded-md border border-slate-200 bg-white px-3 shadow-sm shadow-slate-100">
          <div className="size-11 rounded bg-[#101a3d]" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-slate-800">
              Puling
            </div>
            <div className="truncate text-sm text-slate-400">18688797837</div>
          </div>
          <ChevronDown className="size-5 text-slate-700" />
        </div>

        <nav className="mt-5 h-[calc(100vh-190px)] overflow-y-auto px-4 pb-8">
          {navGroups.map((group, groupIndex) => (
            <div
              key={`${group.label}-${groupIndex}`}
              className="border-t border-dashed border-slate-100 first:border-t-0"
            >
              {group.label ? (
                <div className="pb-2 pt-4 text-sm text-slate-400">
                  {group.label}
                </div>
              ) : null}
              <div className="space-y-1">
                {group.items.map((item, itemIndex) => {
                  const selected =
                    activePage === item.key &&
                    (item.key === "dashboard" || itemIndex === 0);
                  return (
                    <button
                      key={`${group.label}-${item.label}`}
                      className={cn(
                        "flex h-12 w-full items-center gap-3 rounded-md px-4 text-left text-base font-medium transition-colors",
                        selected
                          ? "bg-[#1155ff] text-white shadow-sm"
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                      )}
                      onClick={() => onPageChange(item.key)}
                    >
                      <item.icon
                        className={cn(
                          "size-5",
                          selected ? "text-white/85" : "text-slate-400",
                        )}
                      />
                      <span className="flex-1">{item.label}</span>
                      {item.key !== "dashboard" ? (
                        <ChevronDown
                          className={cn(
                            "size-4",
                            selected ? "text-white/80" : "text-slate-400",
                          )}
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="min-h-screen bg-[#f6f7f9] p-4 lg:ml-[300px] lg:p-4">
        <div className="min-h-[calc(100vh-32px)] rounded-[24px] border border-slate-200 bg-[#f8f9fb] p-4 shadow-sm shadow-slate-100">
          <header className="sticky top-4 z-20 flex h-16 items-center justify-between rounded-md border border-slate-200 bg-white px-4 shadow-sm shadow-slate-100">
            <div className="flex items-center gap-3">
              <Button
                className="lg:hidden"
                variant="ghost"
                aria-label="打开导航"
              >
                <Menu className="size-4" />
              </Button>
              <div className="flex items-center gap-2">
                {activePage === "dashboard" ? (
                  <Database className="hidden size-5 text-slate-400 sm:block" />
                ) : null}
                <h1 className="text-lg font-bold text-slate-950 md:text-2xl">
                  {activePage === "dashboard" ? "数据广场" : "任务管理"}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <HeaderIcon label="搜索">
                <Search className="size-5" />
              </HeaderIcon>
              <HeaderIcon label="语言">
                <Globe2 className="size-5" />
              </HeaderIcon>
              <HeaderIcon label="通知">
                <Bell className="size-5" />
              </HeaderIcon>
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

function HeaderIcon({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      className="flex size-11 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-950 transition-colors hover:border-blue-100 hover:bg-blue-50 hover:text-[#1155ff]"
      aria-label={label}
    >
      {children}
    </button>
  );
}

import * as React from "react";
import { DealerLayout } from "./dealer-layout";
import { useDealerStore } from "./local-store";
import { DashboardPage } from "./pages/dashboard-page";
import { CustomerReportsPage } from "./pages/customer-reports-page";
import { ProfilePage } from "./pages/profile-page";
import { RecordPage } from "./pages/record-page";
import { TrialPage } from "./pages/trial-page";
import { pageConfigs } from "./page-configs";
import type { BaseRecord, DealerPageKey, DealerProfile, EntityKey, RoleRecord } from "./types";

const dealerPageRoutes: Record<DealerPageKey, string> = {
  dashboard: "/dealer/dashboard",
  models: "/dealer/models",
  trial: "/dealer/trial",
  products: "/dealer/products",
  customers: "/dealer/customers",
  apiKeys: "/dealer/customer-api-keys",
  consumptions: "/dealer/consumptions",
  usageLogs: "/dealer/usage-logs",
  reports: "/dealer/customer-reports",
  contracts: "/dealer/contracts",
  bills: "/dealer/bills",
  members: "/dealer/team-members",
  roles: "/dealer/roles",
  teamReports: "/dealer/team-reports",
  profile: "/dealer/profile",
};

const pageByRoute = Object.fromEntries(
  Object.entries(dealerPageRoutes).map(([page, path]) => [path, page]),
) as Record<string, DealerPageKey>;

export function DealerSystem({ loginAccount, onLogout }: { loginAccount: string; onLogout: () => void }) {
  const [activePage, setActivePage] = React.useState<DealerPageKey>(() => getPageFromLocation());
  const { data, createRecord, updateRecord, deleteRecord, updateData } = useDealerStore();
  const profile = React.useMemo(
    () => resolveProfile(data.profile, data.members, loginAccount),
    [data.members, data.profile, loginAccount],
  );
  const allowedPages = React.useMemo(() => resolveAllowedPages(data.roles, profile.role), [data.roles, profile.role]);
  const effectivePage = allowedPages.has(activePage) ? activePage : [...allowedPages][0] ?? "profile";
  const config = pageConfigs[effectivePage as keyof typeof pageConfigs];

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

  function changePage(page: DealerPageKey) {
    if (!allowedPages.has(page)) {
      return;
    }
    setActivePage(page);
    syncRoute(page);
  }

  return (
    <DealerLayout activePage={effectivePage} allowedPages={allowedPages} profile={profile} onLogout={onLogout} onPageChange={changePage}>
      {effectivePage === "dashboard" ? <DashboardPage data={data} onPageChange={changePage} /> : null}
      {effectivePage === "trial" ? <TrialPage models={data.models} apiKeys={data.apiKeys} /> : null}
      {effectivePage === "reports" ? <CustomerReportsPage data={data} /> : null}
      {effectivePage === "profile" ? (
        <ProfilePage
          profile={profile}
          onSave={(nextProfile) =>
            updateData((current) => ({
              ...current,
              profile: loginAccount ? current.profile : { ...nextProfile, avatarText: getAvatarText(nextProfile.name) },
              members: loginAccount
                ? current.members.map((member) =>
                    member.loginAccount === loginAccount
                      ? {
                          ...member,
                          name: nextProfile.name || "User",
                          role: nextProfile.role,
                          loginAccount: nextProfile.phone,
                          updatedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
                        }
                      : member,
                  )
                : current.members,
            }))
          }
        />
      ) : null}
      {config && effectivePage !== "reports" ? (
        <RecordPage
          config={config}
          records={data[config.entity] as BaseRecord[]}
          data={data}
          onCreate={(draft) => createRecord(config.entity as EntityKey, draft)}
          onUpdate={(id, patch) => updateRecord(config.entity as EntityKey, id, patch)}
          onDelete={(id) => deleteRecord(config.entity as EntityKey, id)}
        />
      ) : null}
    </DealerLayout>
  );
}

const modulePages: Record<string, DealerPageKey[]> = {
  dashboard: ["dashboard"],
  models: ["models", "trial", "products"],
  customers: ["customers", "apiKeys", "consumptions", "usageLogs"],
  reports: ["reports"],
  finance: ["contracts", "bills"],
  team: ["members", "roles", "teamReports"],
  profile: ["profile"],
  contracts: ["contracts"],
  bills: ["bills"],
  members: ["members"],
  roles: ["roles"],
  teamReports: ["teamReports"],
};

const legacyPermissionModules: Record<string, keyof typeof modulePages> = {
  看板: "dashboard",
  模型管理: "models",
  客户管理: "customers",
  客户报表: "reports",
  财务管理: "finance",
  团队管理: "team",
  个人中心: "profile",
};

const legacySinglePages: Record<string, DealerPageKey> = {
  合同: "contracts",
  账单: "bills",
  团队报表: "teamReports",
  角色管理: "roles",
  团队成员: "members",
};

function resolveAllowedPages(roles: RoleRecord[], roleName: string): ReadonlySet<DealerPageKey> {
  const role = roles.find((item) => item.name === roleName && item.status === "启用");
  if (!role) {
    return new Set<DealerPageKey>(["profile"]);
  }

  const pages = new Set<DealerPageKey>();
  for (const moduleKey of parsePermissionModules(role.permissions)) {
    for (const page of modulePages[moduleKey] ?? []) {
      pages.add(page);
    }
  }
  pages.add("profile");

  return pages;
}

function parsePermissionModules(value: string): string[] {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmedValue) as Array<{ moduleKey?: string; actions?: string[] }>;
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item) => item.actions?.includes("访问"))
        .map((item) => item.moduleKey)
        .filter((item): item is string => Boolean(item));
    }
  } catch {
    // 兼容早期逗号文本权限。
  }

  return trimmedValue
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.split("-")[0])
    .map((item) => legacyPermissionModules[item] ?? legacySinglePages[item] ?? "")
    .filter(Boolean);
}

function resolveProfile(profile: DealerProfile, members: Array<{ loginAccount: string; name?: string; role?: string; createdAt?: string }>, loginAccount: string): DealerProfile {
  const account = loginAccount.trim();
  const member = members.find((item) => item.loginAccount === account);
  const name = member?.name?.trim() || "User";

  if (!account) {
    return profile;
  }

  return {
    ...profile,
    name,
    role: member?.role ?? profile.role,
    phone: account,
    registeredAt: member?.createdAt ?? profile.registeredAt,
    avatarText: getAvatarText(name),
  };
}

function getAvatarText(name: string) {
  return (name.trim() || "User").slice(0, 1).toUpperCase();
}

function getPageFromLocation(): DealerPageKey {
  const path = window.location.pathname.replace(/\/$/, "");
  return pageByRoute[path] ?? pageByRoute[window.location.pathname] ?? "dashboard";
}

function syncRoute(page: DealerPageKey, replace = false) {
  const nextPath = dealerPageRoutes[page];
  if (window.location.pathname === nextPath) {
    return;
  }

  const nextUrl = `${nextPath}${window.location.search}${window.location.hash}`;
  if (replace) {
    window.history.replaceState(null, "", nextUrl);
    return;
  }

  window.history.pushState(null, "", nextUrl);
}

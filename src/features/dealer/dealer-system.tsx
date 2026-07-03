import * as React from "react";
import { DealerLayout } from "./dealer-layout";
import { useDealerStore } from "./local-store";
import { DashboardPage } from "./pages/dashboard-page";
import { CustomerReportsPage } from "./pages/customer-reports-page";
import { ProfilePage } from "./pages/profile-page";
import { RecordPage } from "./pages/record-page";
import { TrialPage } from "./pages/trial-page";
import { pageConfigs } from "./page-configs";
import type { BaseRecord, DealerPageKey, EntityKey } from "./types";

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

export function DealerSystem() {
  const [activePage, setActivePage] = React.useState<DealerPageKey>(() => getPageFromLocation());
  const { data, createRecord, updateRecord, deleteRecord, updateData, resetData } = useDealerStore();
  const config = pageConfigs[activePage as keyof typeof pageConfigs];

  React.useEffect(() => {
    syncRoute(activePage, true);

    function handlePopState() {
      setActivePage(getPageFromLocation());
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function changePage(page: DealerPageKey) {
    setActivePage(page);
    syncRoute(page);
  }

  return (
    <DealerLayout activePage={activePage} profile={data.profile} onPageChange={changePage} onResetData={resetData}>
      {activePage === "dashboard" ? <DashboardPage data={data} onPageChange={changePage} /> : null}
      {activePage === "trial" ? <TrialPage models={data.models} apiKeys={data.apiKeys} /> : null}
      {activePage === "reports" ? <CustomerReportsPage data={data} /> : null}
      {activePage === "profile" ? (
        <ProfilePage
          profile={data.profile}
          onSave={(profile) => updateData((current) => ({ ...current, profile }))}
        />
      ) : null}
      {config && activePage !== "reports" ? (
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

import * as React from "react";
import { DealerLayout } from "./dealer-layout";
import { useDealerStore } from "./local-store";
import { DashboardPage } from "./pages/dashboard-page";
import { ProfilePage } from "./pages/profile-page";
import { RecordPage } from "./pages/record-page";
import { TrialPage } from "./pages/trial-page";
import { pageConfigs } from "./page-configs";
import type { BaseRecord, DealerPageKey, EntityKey } from "./types";

export function DealerSystem() {
  const [activePage, setActivePage] = React.useState<DealerPageKey>("dashboard");
  const { data, createRecord, updateRecord, deleteRecord, updateData, resetData } = useDealerStore();
  const config = pageConfigs[activePage as keyof typeof pageConfigs];

  return (
    <DealerLayout activePage={activePage} profile={data.profile} onPageChange={setActivePage} onResetData={resetData}>
      {activePage === "dashboard" ? <DashboardPage data={data} onPageChange={setActivePage} /> : null}
      {activePage === "trial" ? <TrialPage models={data.models} apiKeys={data.apiKeys} /> : null}
      {activePage === "profile" ? (
        <ProfilePage
          profile={data.profile}
          onSave={(profile) => updateData((current) => ({ ...current, profile }))}
        />
      ) : null}
      {config ? (
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

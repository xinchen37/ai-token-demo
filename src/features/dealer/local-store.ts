import * as React from "react";
import { dealerSeedData } from "./seed-data";
import type { BaseRecord, DealerData, EntityKey, EntityRecord } from "./types";
import { createId, getCurrentDateTime } from "./dealer-utils";

const STORAGE_KEY = "omni-ai-dealer-data-v1";

export function loadDealerData(): DealerData {
  const rawValue = window.localStorage.getItem(STORAGE_KEY);

  if (!rawValue) {
    saveDealerData(dealerSeedData);
    return dealerSeedData;
  }

  try {
    return { ...dealerSeedData, ...JSON.parse(rawValue) } as DealerData;
  } catch {
    saveDealerData(dealerSeedData);
    return dealerSeedData;
  }
}

export function saveDealerData(data: DealerData): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useDealerStore() {
  const [data, setData] = React.useState<DealerData>(() => loadDealerData());

  const updateData = React.useCallback((producer: (current: DealerData) => DealerData) => {
    setData((current) => {
      const nextData = producer(current);
      saveDealerData(nextData);
      return nextData;
    });
  }, []);

  const createRecord = React.useCallback(
    (entity: EntityKey, draft: Record<string, string | number>) => {
      updateData((current) => {
        const time = getCurrentDateTime();
        const nextRecord = {
          ...draft,
          id: createId(entity),
          createdAt: time,
          updatedAt: time,
        } as EntityRecord;

        return {
          ...current,
          [entity]: [nextRecord, ...current[entity]],
        };
      });
    },
    [updateData],
  );

  const updateRecord = React.useCallback(
    (entity: EntityKey, id: string, patch: Record<string, unknown>) => {
      updateData((current) => ({
        ...current,
        [entity]: current[entity].map((record) =>
          record.id === id ? ({ ...record, ...patch, updatedAt: getCurrentDateTime() } as EntityRecord) : record,
        ),
      }));
    },
    [updateData],
  );

  const deleteRecord = React.useCallback(
    (entity: EntityKey, id: string) => {
      updateData((current) => ({
        ...current,
        [entity]: current[entity].filter((record) => record.id !== id),
      }));
    },
    [updateData],
  );

  const resetData = React.useCallback(() => {
    saveDealerData(dealerSeedData);
    setData(dealerSeedData);
  }, []);

  return { data, createRecord, updateRecord, deleteRecord, updateData, resetData };
}

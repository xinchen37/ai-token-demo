import * as React from "react";
import { dealerSeedData } from "./seed-data";
import type { BaseRecord, DealerData, EntityKey, EntityRecord } from "./types";
import { createId, getCurrentDateTime } from "./dealer-utils";

const STORAGE_KEY = "omni-ai-dealer-data-v1";

export function loadDealerData(): DealerData {
  const rawValue = window.localStorage.getItem(STORAGE_KEY);

  if (!rawValue) {
    const initialData = ensureBuiltInRecords(dealerSeedData);
    saveDealerData(initialData);
    return initialData;
  }

  try {
    const data = ensureBuiltInRecords({ ...dealerSeedData, ...JSON.parse(rawValue) } as DealerData);
    saveDealerData(data);
    return data;
  } catch {
    const initialData = ensureBuiltInRecords(dealerSeedData);
    saveDealerData(initialData);
    return initialData;
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
          ...completeLinkedDraft(entity, draft, current, time),
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
      updateData((current) => {
        const time = getCurrentDateTime();
        const previousRecord = current[entity].find((record) => record.id === id);
        const nextData = {
          ...current,
          [entity]: current[entity].map((record) =>
            record.id === id ? ({ ...record, ...patch, updatedAt: time } as EntityRecord) : record,
          ),
        };

        return previousRecord ? cascadeReferenceUpdates(nextData, entity, previousRecord, patch) : nextData;
      });
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

function completeLinkedDraft(
  entity: EntityKey,
  draft: Record<string, string | number>,
  data: DealerData,
  time: string,
): Record<string, string | number> {
  if (entity === "members") {
    return { lastLoginAt: "未登录", ...draft };
  }

  if (entity === "products") {
    return {
      ...draft,
      relatedModels: draft.relatedModels || data.models[0]?.name || "",
    };
  }

  if (entity === "apiKeys") {
    const quotaTotal = Number(draft.quotaTotal || 0);
    return {
      ...draft,
      quotaRemain: Number(draft.quotaRemain || 0) > 0 ? draft.quotaRemain : quotaTotal,
      apiKey: draft.apiKey || `sk-omni-${createId("apiKeys")}`,
      lastUsedAt: draft.lastUsedAt || "未使用",
      expiresAt: draft.expiresAt || getNextYearDateTime(time),
    };
  }

  if (entity === "contracts") {
    const product = data.products.find((item) => item.name === draft.productName);
    return {
      ...draft,
      productInfo: draft.productInfo || buildProductInfo(product),
      orderedAt: draft.orderedAt || time,
      dailyLimit: draft.dailyLimit || (product ? `${product.tokenLimitM}M Tokens` : ""),
      expiresAt: draft.expiresAt || getNextYearDateTime(time),
    };
  }

  return draft;
}

function cascadeReferenceUpdates(
  data: DealerData,
  entity: EntityKey,
  previousRecord: EntityRecord,
  patch: Record<string, unknown>,
): DealerData {
  if (entity === "customers" && typeof patch.company === "string") {
    const previousName = String((previousRecord as EntityRecord & { company?: string }).company ?? "");
    const nextName = patch.company;
    return {
      ...data,
      apiKeys: data.apiKeys.map((record) => record.customerName === previousName ? { ...record, customerName: nextName } : record),
      consumptions: data.consumptions.map((record) => record.customerName === previousName ? { ...record, customerName: nextName } : record),
      usageLogs: data.usageLogs.map((record) => record.customerName === previousName ? { ...record, customerName: nextName } : record),
      contracts: data.contracts.map((record) => record.customerName === previousName ? { ...record, customerName: nextName } : record),
      bills: data.bills.map((record) => record.customerName === previousName ? { ...record, customerName: nextName } : record),
    };
  }

  if (entity === "models" && typeof patch.name === "string") {
    const previousName = String((previousRecord as EntityRecord & { name?: string }).name ?? "");
    const nextName = patch.name;
    return {
      ...data,
      products: data.products.map((record) => ({
        ...record,
        relatedModels: replaceCsvValue(record.relatedModels, previousName, nextName),
      })),
      apiKeys: data.apiKeys.map((record) => record.modelName === previousName ? { ...record, modelName: nextName } : record),
      consumptions: data.consumptions.map((record) => record.modelName === previousName ? { ...record, modelName: nextName } : record),
      usageLogs: data.usageLogs.map((record) => record.modelName === previousName ? { ...record, modelName: nextName } : record),
    };
  }

  if (entity === "products" && typeof patch.name === "string") {
    const previousName = String((previousRecord as EntityRecord & { name?: string }).name ?? "");
    const nextName = patch.name;
    return {
      ...data,
      contracts: data.contracts.map((record) => record.productName === previousName ? { ...record, productName: nextName } : record),
    };
  }

  if (entity === "roles" && typeof patch.name === "string") {
    const previousName = String((previousRecord as EntityRecord & { name?: string }).name ?? "");
    const nextName = patch.name;
    return {
      ...data,
      members: data.members.map((record) => record.role === previousName ? { ...record, role: nextName } : record),
    };
  }

  return data;
}

function replaceCsvValue(value: string, previousValue: string, nextValue: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item === previousValue ? nextValue : item)
    .join(",");
}

function buildProductInfo(product: DealerData["products"][number] | undefined) {
  if (!product) {
    return "";
  }

  return `${product.name}，${product.packageMode}，关联模型：${product.relatedModels}`;
}

function getNextYearDateTime(value: string) {
  const date = new Date(value.replace(" ", "T"));
  date.setFullYear(date.getFullYear() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function ensureBuiltInRecords(data: DealerData): DealerData {
  const normalizedData = {
    ...data,
    enterpriseMembers: data.enterpriseMembers ?? [],
    enterpriseRoles: data.enterpriseRoles ?? [],
  };
  const nextMembers = normalizedData.members.map((member) =>
    member.id === "member-admin" || member.loginAccount === "1888888888"
      ? { ...member, loginAccount: "18888888888" }
      : member,
  );
  const nextRoles = data.roles.map((role) =>
    role.name === "管理员" && !role.permissions.includes("客户报表")
      ? { ...role, permissions: mergeCsvPermissions(role.permissions, "客户报表") }
      : role,
  );
  const adminMember = dealerSeedData.members.find((member) => member.loginAccount === "18888888888");
  if (adminMember && !nextMembers.some((member) => member.loginAccount === adminMember.loginAccount)) {
    nextMembers.unshift(adminMember);
  }

  for (const role of dealerSeedData.roles) {
    if (!nextRoles.some((item) => item.name === role.name)) {
      nextRoles.push(role);
    }
  }

  const customerLoginAccounts = new Set(normalizedData.customers.map((customer) => customer.loginAccount));
  const nextEnterpriseMembers = mergeById(normalizedData.enterpriseMembers, dealerSeedData.enterpriseMembers).map((member) =>
    customerLoginAccounts.has(member.loginAccount) ? { ...member, role: "所有者" } : member,
  );
  const nextEnterpriseRoles = mergeById(normalizedData.enterpriseRoles, dealerSeedData.enterpriseRoles);

  return {
    ...normalizedData,
    members: nextMembers,
    roles: nextRoles,
    enterpriseMembers: nextEnterpriseMembers,
    enterpriseRoles: nextEnterpriseRoles,
  };
}

function mergeById<T extends { id: string }>(current: T[], seed: T[]) {
  const nextItems = [...current];
  for (const item of seed) {
    if (!nextItems.some((currentItem) => currentItem.id === item.id)) {
      nextItems.push(item);
    }
  }
  return nextItems;
}

function mergeCsvPermissions(value: string, permission: string) {
  const permissions = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return permissions.includes(permission) ? value : [...permissions, permission].join(",");
}

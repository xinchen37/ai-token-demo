import { formatCurrency, maskApiKey } from "./dealer-utils";
import type { RecordPageConfig } from "./pages/record-page";
import type { BaseRecord } from "./types";

const formatPermissions = (value: unknown) => {
  const labels = parsePermissionLabels(value);
  return labels.length > 0 ? labels.join("、") : "-";
};

const getRecordValue = (record: BaseRecord, key: string) => (record as BaseRecord & Record<string, unknown>)[key];

const formatProductPriceSummary = (_value: unknown, record: BaseRecord) => {
  const packageMode = String(getRecordValue(record, "packageMode") ?? "");
  const monthlyFee = Number(getRecordValue(record, "monthlyFee") ?? 0);
  const inputPrice = Number(getRecordValue(record, "inputPrice") ?? 0);
  const outputPrice = Number(getRecordValue(record, "outputPrice") ?? 0);

  if (packageMode === "按量包月" || packageMode === "按金额包月") {
    return monthlyFee ? `${formatCurrency(monthlyFee)}/月` : "-";
  }

  return `入 ${formatCurrency(inputPrice)}/1M · 出 ${formatCurrency(outputPrice)}/1M`;
};

const formatProductQuotaSummary = (value: unknown, record: BaseRecord) => {
  const packageMode = String(getRecordValue(record, "packageMode") ?? "");
  const tokenLimitM = String(value || "不限");
  const monthlyTokenM = String(getRecordValue(record, "monthlyTokenM") || "不限");
  const discount = Number(getRecordValue(record, "discount") ?? 0);

  if (packageMode === "按量包月") {
    return `${monthlyTokenM} M/月`;
  }

  if (packageMode === "不限时按量") {
    return `${formatProductDiscount(discount)} · ${tokenLimitM}`;
  }

  return tokenLimitM === "不限" ? "不限" : `${tokenLimitM} M`;
};

const formatProductDiscount = (value: number) => {
  if (!value) {
    return "-";
  }

  return `${value <= 1 ? Number((value * 10).toFixed(2)) : value} 折`;
};

const formatTokenCount = (value: unknown) => Number(value || 0).toLocaleString("zh-CN");

const formatTotalTokens = (value: unknown, record: BaseRecord) => {
  const totalTokens = Number(value || 0);
  if (totalTokens > 0) {
    return formatTokenCount(totalTokens);
  }

  const inputTokens = Number(getRecordValue(record, "inputTokens") || 0);
  const outputTokens = Number(getRecordValue(record, "outputTokens") || 0);
  return formatTokenCount(inputTokens + outputTokens);
};

export const pageConfigs = {
  models: {
    entity: "models",
    title: "大模型",
    description: "查看平台已对接模型、成本价、销售价和模型能力。",
    createLabel: "新建模型",
    searchPlaceholder: "搜索厂商、模型名称、能力",
    columns: [
      { key: "logoText", label: "厂商Logo" },
      { key: "provider", label: "厂商" },
      { key: "name", label: "模型名称" },
      { key: "inputPrice", label: "输入价格", format: (value) => `${formatCurrency(Number(value))}/1M Tokens` },
      { key: "outputPrice", label: "输出价格", format: (value) => `${formatCurrency(Number(value))}/1M Tokens` },
      { key: "cachePrice", label: "缓存价格", format: (value) => `${formatCurrency(Number(value))}/1M Tokens` },
      { key: "billingType", label: "计费类型" },
      { key: "abilities", label: "模型能力" },
    ],
    fields: [
      { key: "provider", label: "厂商", required: true },
      { key: "logoText", label: "厂商标识", required: true },
      { key: "name", label: "模型名称", required: true },
      { key: "type", label: "模型类型", kind: "select", options: ["对话补全", "图像", "文本转语音", "语音转文本", "视频"] },
      { key: "billingType", label: "计费类型", kind: "select", options: ["按量计费", "按次计费"] },
      { key: "inputPrice", label: "输入价格（¥/1M Tokens）", kind: "number" },
      { key: "outputPrice", label: "输出价格（¥/1M Tokens）", kind: "number" },
      { key: "cachePrice", label: "缓存价格（¥/1M Tokens）", kind: "number" },
      { key: "costInputPrice", label: "成本输入价（¥/1M Tokens）", kind: "number" },
      { key: "costOutputPrice", label: "成本输出价（¥/1M Tokens）", kind: "number" },
      { key: "abilities", label: "模型能力", placeholder: "多个能力用逗号分隔" },
      { key: "status", label: "状态", kind: "select", options: ["可用", "维护中"] },
    ],
  } satisfies RecordPageConfig,
  products: {
    entity: "products",
    title: "模型产品",
    description: "管理对外售卖的产品、套餐模式、关联模型和上下架状态。",
    createLabel: "新建产品",
    searchPlaceholder: "搜索产品名称、模型、状态",
    columns: [
      { key: "name", label: "产品名称", width: "220px" },
      { key: "packageMode", label: "套餐模式", width: "140px" },
      { key: "relatedModels", label: "关联模型", width: "240px" },
      { key: "billingMode", label: "计费模式", width: "120px" },
      { key: "inputPrice", label: "价格摘要", width: "220px", format: formatProductPriceSummary },
      { key: "tokenLimitM", label: "额度/折扣", width: "150px", format: formatProductQuotaSummary },
      { key: "status", label: "状态", width: "100px" },
    ],
    fields: [
      { key: "name", label: "产品名称", required: true },
      { key: "packageMode", label: "套餐模式", kind: "select", options: ["按量包月", "按金额包月", "不限时包量", "不限时按量"] },
      { key: "relatedModels", label: "关联模型", kind: "multiSelect", optionSource: "models" },
      { key: "inputPrice", label: "输入价格（¥/1M Tokens）", kind: "number" },
      { key: "outputPrice", label: "输出价格（¥/1M Tokens）", kind: "number" },
      { key: "cachePrice", label: "缓存价格（¥/1M Tokens）", kind: "number" },
      { key: "tokenLimitM", label: "Tokens（M）", placeholder: "不限" },
      { key: "monthlyTokenM", label: "每月总 Token 数量（M）", placeholder: "不限" },
      { key: "monthlyFee", label: "每月总费用", kind: "number" },
      { key: "discount", label: "折扣", kind: "number" },
      { key: "billingMode", label: "计费模式", kind: "select", options: ["按量", "套餐"] },
      { key: "status", label: "状态", kind: "select", options: ["上架", "下架"] },
    ],
  } satisfies RecordPageConfig,
  customers: {
    entity: "customers",
    title: "我的客户",
    description: "管理下游企业客户，支持分配销售、编辑状态和维护备注。",
    createLabel: "新建客户",
    searchPlaceholder: "搜索企业、联系人、销售",
    columns: [
      { key: "company", label: "企业名称" },
      { key: "contact", label: "联系人" },
      { key: "phone", label: "联系电话" },
      { key: "sales", label: "所属销售" },
      { key: "totalSpend", label: "累计消费", format: (value) => formatCurrency(Number(value)) },
      { key: "type", label: "类型" },
      { key: "status", label: "状态" },
      { key: "createdAt", label: "创建时间" },
    ],
    fields: [
      { key: "company", label: "企业名称", required: true },
      { key: "contact", label: "联系人", required: true },
      { key: "phone", label: "联系电话", required: true },
      { key: "loginAccount", label: "登录账号", required: true },
      { key: "sales", label: "所属销售", kind: "select", optionSource: "salesMembers" },
      { key: "totalSpend", label: "累计消费", kind: "number" },
      { key: "type", label: "客户类型", kind: "select", options: ["新注册", "跟进中", "已成交"] },
      { key: "status", label: "状态", kind: "select", options: ["未激活", "正常", "已冻结"] },
      { key: "remark", label: "备注", kind: "textarea" },
    ],
  } satisfies RecordPageConfig,
  apiKeys: {
    entity: "apiKeys",
    title: "客户 API Key",
    description: "为客户创建和管理 API Key、模型权限、额度、IP 白名单和状态。",
    createLabel: "新建 API Key",
    searchPlaceholder: "搜索客户、Key 名称、模型",
    columns: [
      { key: "customerName", label: "客户名称" },
      { key: "keyName", label: "Key 名称" },
      { key: "modelName", label: "关联模型" },
      { key: "quotaRemain", label: "剩余额度" },
      { key: "dailyLimit", label: "每日限额" },
      { key: "apiKey", label: "API Key", format: (value) => maskApiKey(String(value)) },
      { key: "status", label: "状态" },
      { key: "expiresAt", label: "过期时间" },
    ],
    fields: [
      { key: "customerName", label: "客户名称", kind: "select", optionSource: "customers" },
      { key: "keyName", label: "Key 名称", required: true },
      { key: "modelName", label: "关联模型", kind: "select", optionSource: "models" },
      { key: "quotaTotal", label: "总额度", kind: "number" },
      { key: "quotaRemain", label: "剩余额度", kind: "number" },
      { key: "dailyLimit", label: "每日限额", kind: "number" },
      { key: "apiKey", label: "API Key", required: true, placeholder: "sk-omni-..." },
      { key: "ipWhitelist", label: "IP 白名单", kind: "textarea" },
      { key: "status", label: "状态", kind: "select", options: ["已启用", "已停用"] },
      { key: "lastUsedAt", label: "最后使用时间", kind: "datetime" },
      { key: "expiresAt", label: "过期时间", kind: "datetime" },
    ],
  } satisfies RecordPageConfig,
  consumptions: {
    entity: "consumptions",
    title: "消费记录",
    description: "查看所有客户 API 调用扣费流水。",
    createLabel: "新建消费记录",
    searchPlaceholder: "搜索客户、模型、记录 ID",
    readOnly: true,
    columns: [
      { key: "recordNo", label: "记录ID" },
      { key: "calledAt", label: "调用时间" },
      { key: "customerName", label: "客户名称" },
      { key: "keyName", label: "API Key名称" },
      { key: "modelName", label: "调用模型" },
      { key: "inputTokens", label: "输入Token数", format: formatTokenCount },
      { key: "outputTokens", label: "输出Token数", format: formatTokenCount },
      { key: "totalTokens", label: "总Token数", format: formatTotalTokens },
      { key: "amount", label: "消费金额（¥）", format: (value) => formatCurrency(Number(value)) },
      { key: "status", label: "状态" },
    ],
    fields: [
      { key: "recordNo", label: "记录ID", required: true },
      { key: "customerName", label: "客户名称", kind: "select", optionSource: "customers" },
      { key: "registerPhone", label: "注册手机" },
      { key: "keyName", label: "API Key 名称" },
      { key: "modelName", label: "调用模型", kind: "select", optionSource: "models" },
      { key: "inputTokens", label: "输入Token", kind: "number" },
      { key: "outputTokens", label: "输出Token", kind: "number" },
      { key: "totalTokens", label: "总Token", kind: "number" },
      { key: "amount", label: "消费金额", kind: "number" },
      { key: "calledAt", label: "调用时间", kind: "datetime" },
      { key: "status", label: "状态", kind: "select", options: ["成功", "失败"] },
    ],
  } satisfies RecordPageConfig,
  usageLogs: {
    entity: "usageLogs",
    title: "使用日志",
    description: "查看 API 调用技术日志，用于调试和问题追踪。",
    createLabel: "新建日志",
    searchPlaceholder: "搜索任务ID、客户、模型",
    readOnly: true,
    columns: [
      { key: "taskId", label: "任务ID" },
      { key: "requestedAt", label: "请求时间" },
      { key: "finishedAt", label: "结束时间" },
      { key: "durationMs", label: "总耗时（ms）" },
      { key: "customerName", label: "客户名称" },
      { key: "modelName", label: "模型" },
      { key: "statusCode", label: "状态码" },
    ],
    fields: [
      { key: "taskId", label: "任务ID", required: true },
      { key: "requestedAt", label: "请求时间", kind: "datetime" },
      { key: "finishedAt", label: "结束时间", kind: "datetime" },
      { key: "durationMs", label: "总耗时（ms）", kind: "number" },
      { key: "customerName", label: "客户名称", kind: "select", optionSource: "customers" },
      { key: "modelName", label: "模型", kind: "select", optionSource: "models" },
      { key: "statusCode", label: "状态码", kind: "number" },
      { key: "requestPayload", label: "请求内容", kind: "textarea" },
      { key: "responsePayload", label: "响应内容", kind: "textarea" },
    ],
  } satisfies RecordPageConfig,
  reports: {
    entity: "consumptions",
    title: "客户报表",
    description: "以消费明细为基础查看客户、模型和调用表现。",
    createLabel: "新增报表明细",
    searchPlaceholder: "搜索客户、模型、状态",
    columns: [
      { key: "customerName", label: "客户名称" },
      { key: "modelName", label: "模型" },
      { key: "inputTokens", label: "输入Token" },
      { key: "outputTokens", label: "输出Token" },
      { key: "amount", label: "消费金额", format: (value) => formatCurrency(Number(value)) },
      { key: "calledAt", label: "最后调用时间" },
      { key: "status", label: "状态" },
    ],
    fields: [
      { key: "recordNo", label: "记录ID", required: true },
      { key: "customerName", label: "客户名称", kind: "select", optionSource: "customers" },
      { key: "registerPhone", label: "注册手机" },
      { key: "keyName", label: "API Key 名称" },
      { key: "modelName", label: "调用模型", kind: "select", optionSource: "models" },
      { key: "inputTokens", label: "输入Token", kind: "number" },
      { key: "outputTokens", label: "输出Token", kind: "number" },
      { key: "amount", label: "消费金额", kind: "number" },
      { key: "calledAt", label: "调用时间", kind: "datetime" },
      { key: "status", label: "状态", kind: "select", options: ["成功", "失败"] },
    ],
  } satisfies RecordPageConfig,
  contracts: {
    entity: "contracts",
    title: "合同",
    description: "管理客户购买产品的大模型产品合同记录。",
    createLabel: "新建合同",
    searchPlaceholder: "搜索合同号、客户、产品",
    columns: [
      { key: "contractNo", label: "合同号" },
      { key: "customerName", label: "客户名称" },
      { key: "productName", label: "模型产品" },
      { key: "productInfo", label: "产品信息", width: "260px" },
      { key: "orderedAt", label: "下单时间" },
      { key: "status", label: "状态" },
    ],
    fields: [
      { key: "customerName", label: "客户名称", kind: "searchableSelect", optionSource: "customers", required: true },
      { key: "productName", label: "产品名称", kind: "select", optionSource: "products" },
      { key: "dailyLimit", label: "每日限额", placeholder: "未填写则不限制" },
      { key: "expiresAt", label: "过期时间", kind: "datetime", placeholder: "未填写则不限制" },
      { key: "status", label: "状态", kind: "radio", options: ["启用", "停用"] },
    ],
  } satisfies RecordPageConfig,
  bills: {
    entity: "bills",
    title: "账单",
    description: "管理客户每月账单，包括生成、查看明细和结算状态。",
    createLabel: "新建账单",
    searchPlaceholder: "搜索客户、账期、状态",
    readOnly: true,
    columns: [
      { key: "customerName", label: "客户名称" },
      { key: "period", label: "账期" },
      { key: "amount", label: "本期消费", format: (value) => formatCurrency(Number(value)) },
      { key: "status", label: "账单状态" },
    ],
    fields: [
      { key: "billNo", label: "账单ID", required: true },
      { key: "customerName", label: "客户名称", kind: "select", optionSource: "customers" },
      { key: "period", label: "账期", kind: "month" },
      { key: "openingBalance", label: "期初余额", kind: "number" },
      { key: "recharge", label: "本期充值", kind: "number" },
      { key: "amount", label: "本期消费", kind: "number" },
      { key: "closingBalance", label: "期末余额", kind: "number" },
      { key: "status", label: "状态", kind: "select", options: ["待结算", "已结算"] },
    ],
  } satisfies RecordPageConfig,
  members: {
    entity: "members",
    title: "团队成员",
    description: "管理经销商内部员工账号并分配角色。",
    createLabel: "添加成员",
    searchPlaceholder: "搜索姓名、账号、角色",
    columns: [
      { key: "name", label: "姓名" },
      { key: "loginAccount", label: "登录账号" },
      { key: "role", label: "角色" },
      { key: "status", label: "状态" },
      { key: "lastLoginAt", label: "最后登录时间" },
    ],
    fields: [
      { key: "name", label: "姓名", required: true },
      { key: "loginAccount", label: "登录账号", required: true },
      { key: "role", label: "角色", kind: "select", optionSource: "roles" },
      { key: "status", label: "状态", kind: "select", options: ["启用", "停用"] },
    ],
  } satisfies RecordPageConfig,
  roles: {
    entity: "roles",
    title: "角色管理",
    description: "定义系统角色和菜单功能权限。",
    createLabel: "新建角色",
    searchPlaceholder: "搜索角色名称、权限",
    columns: [
      { key: "name", label: "角色名称" },
      { key: "description", label: "角色描述" },
      { key: "permissions", label: "权限列表", format: formatPermissions },
      { key: "status", label: "状态" },
    ],
    fields: [
      { key: "name", label: "角色名称", required: true },
      { key: "description", label: "角色描述", kind: "textarea" },
      { key: "permissions", label: "权限配置", kind: "permissionMatrix" },
      { key: "status", label: "状态", kind: "select", options: ["启用", "停用"] },
    ],
  } satisfies RecordPageConfig,
  teamReports: {
    entity: "customers",
    title: "团队报表",
    description: "按销售人员查看负责客户数、客户消耗额和新增客户。",
    createLabel: "新增客户业绩",
    searchPlaceholder: "搜索销售、客户、状态",
    readOnly: true,
    columns: [
      { key: "sales", label: "销售人员" },
      { key: "company", label: "客户名称" },
      { key: "totalSpend", label: "客户消耗额", format: (value) => formatCurrency(Number(value)) },
      { key: "type", label: "客户类型" },
      { key: "status", label: "客户状态" },
      { key: "createdAt", label: "创建时间" },
    ],
    fields: [
      { key: "company", label: "企业名称", required: true },
      { key: "contact", label: "联系人", required: true },
      { key: "phone", label: "联系电话", required: true },
      { key: "loginAccount", label: "登录账号", required: true },
      { key: "sales", label: "所属销售", kind: "select", optionSource: "salesMembers" },
      { key: "totalSpend", label: "累计消费", kind: "number" },
      { key: "type", label: "客户类型", kind: "select", options: ["新注册", "跟进中", "已成交"] },
      { key: "status", label: "状态", kind: "select", options: ["未激活", "正常", "已冻结"] },
      { key: "remark", label: "备注", kind: "textarea" },
    ],
  } satisfies RecordPageConfig,
};

function parsePermissionLabels(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is { moduleLabel: string; actions: string[] } =>
        typeof item === "object"
        && item !== null
        && "moduleLabel" in item
        && "actions" in item
        && Array.isArray((item as { actions?: unknown }).actions),
      )
      .filter((item) => item.actions.length > 0)
      .map((item) => item.moduleLabel);
  } catch {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
}

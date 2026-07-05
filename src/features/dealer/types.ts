import type React from "react";

export type DealerPageKey =
  | "dashboard"
  | "models"
  | "trial"
  | "products"
  | "customers"
  | "apiKeys"
  | "consumptions"
  | "usageLogs"
  | "reports"
  | "contracts"
  | "bills"
  | "members"
  | "roles"
  | "teamReports"
  | "profile";

export type EntityKey =
  | "models"
  | "products"
  | "customers"
  | "apiKeys"
  | "consumptions"
  | "usageLogs"
  | "contracts"
  | "bills"
  | "members"
  | "roles";

export interface BaseRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiModel extends BaseRecord {
  provider: string;
  logoText: string;
  name: string;
  type: "对话补全" | "图像" | "文本转语音" | "语音转文本" | "视频";
  billingType: "按量计费" | "按次计费";
  inputPrice: number;
  outputPrice: number;
  cachePrice: number;
  costInputPrice: number;
  costOutputPrice: number;
  abilities: string;
  status: "可用" | "维护中";
}

export interface ModelProduct extends BaseRecord {
  name: string;
  packageMode: "按量包月" | "按金额包月" | "不限时包量" | "不限时按量";
  relatedModels: string;
  inputPrice: number;
  outputPrice: number;
  cachePrice: number;
  tokenLimitM: string;
  monthlyTokenM?: string;
  monthlyFee?: number;
  discount?: number;
  billingMode: "按量" | "套餐";
  status: "上架" | "下架";
}

export interface Customer extends BaseRecord {
  company: string;
  contact: string;
  phone: string;
  loginAccount: string;
  sales: string;
  totalSpend: number;
  type: "新注册" | "跟进中" | "已成交";
  status: "未激活" | "正常" | "已冻结";
  remark: string;
}

export interface CustomerApiKey extends BaseRecord {
  customerName: string;
  keyName: string;
  modelName: string;
  quotaTotal: number;
  quotaRemain: number;
  dailyLimit: number;
  apiKey: string;
  ipWhitelist: string;
  status: "已启用" | "已停用";
  lastUsedAt: string;
  expiresAt: string;
}

export interface ConsumptionRecord extends BaseRecord {
  recordNo: string;
  customerName: string;
  registerPhone: string;
  keyName: string;
  modelName: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  amount: number;
  calledAt: string;
  status: "成功" | "失败";
}

export interface UsageLog extends BaseRecord {
  taskId: string;
  requestedAt: string;
  finishedAt: string;
  durationMs: number;
  customerName: string;
  modelName: string;
  statusCode: 200 | 400 | 429 | 500;
  requestPayload: string;
  responsePayload: string;
}

export interface Contract extends BaseRecord {
  contractNo: string;
  customerName: string;
  productName: string;
  productInfo: string;
  orderedAt: string;
  dailyLimit: string;
  expiresAt: string;
  status: "启用" | "停用";
}

export interface Bill extends BaseRecord {
  billNo: string;
  customerName: string;
  period: string;
  openingBalance: number;
  recharge: number;
  amount: number;
  closingBalance: number;
  status: "待结算" | "已结算";
}

export interface TeamMember extends BaseRecord {
  name: string;
  loginAccount: string;
  role: string;
  status: "启用" | "停用";
  lastLoginAt: string;
}

export interface RoleRecord extends BaseRecord {
  name: string;
  description: string;
  permissions: string;
  status: "启用" | "停用";
}

export interface EnterpriseMember extends BaseRecord {
  customerName: string;
  name: string;
  loginAccount: string;
  role: string;
  status: "启用" | "停用";
  lastLoginAt: string;
  initialPassword?: string;
  statusRemark?: string;
  avatarDataUrl?: string;
}

export interface EnterpriseRole extends BaseRecord {
  customerName: string;
  name: string;
  description: string;
  permissions: string;
  status: "启用" | "停用";
}

export interface TodoItem extends BaseRecord {
  level: "红色" | "黄色" | "蓝色";
  title: string;
  target: DealerPageKey;
  status: "待处理" | "已处理";
}

export interface NoticeItem extends BaseRecord {
  title: string;
  content: string;
  publishedAt: string;
}

export interface DealerProfile {
  name: string;
  role: string;
  phone: string;
  registeredAt: string;
  avatarText: string;
  avatarDataUrl?: string;
}

export interface DealerData {
  models: AiModel[];
  products: ModelProduct[];
  customers: Customer[];
  apiKeys: CustomerApiKey[];
  consumptions: ConsumptionRecord[];
  usageLogs: UsageLog[];
  contracts: Contract[];
  bills: Bill[];
  members: TeamMember[];
  roles: RoleRecord[];
  enterpriseMembers: EnterpriseMember[];
  enterpriseRoles: EnterpriseRole[];
  todos: TodoItem[];
  notices: NoticeItem[];
  profile: DealerProfile;
}

export type EntityRecord = DealerData[EntityKey][number];

export type FieldKind = "text" | "number" | "select" | "multiSelect" | "permissionMatrix" | "textarea" | "datetime" | "month";
export type FieldOptionSource = "customers" | "models" | "products" | "salesMembers" | "apiKeys" | "roles";

export interface FieldConfig {
  key: string;
  label: string;
  kind?: FieldKind;
  options?: string[];
  optionSource?: FieldOptionSource;
  required?: boolean;
  placeholder?: string;
}

export interface ColumnConfig {
  key: string;
  label: string;
  width?: string;
  format?: (value: unknown, record: BaseRecord) => React.ReactNode;
}

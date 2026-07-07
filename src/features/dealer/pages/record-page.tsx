import * as React from "react";
import { Bot, Building2, CalendarDays, Check, ChevronDown, Clock, Coins, Cpu, CreditCard, Database, Download, Edit3, Eye, Info, LayoutGrid, List, LogIn, LogOut, Percent, Plus, RotateCcw, Search, Tags, Trash2, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { BaseRecord, ColumnConfig, DealerData, EntityKey, FieldConfig } from "../types";
import { formatCurrency } from "../dealer-utils";

const modelLogoModules = import.meta.glob("../../../images/modelsLogo/*", {
  eager: true,
  import: "default",
  query: "?url",
}) as Record<string, string>;

const modelLogoUrls = Object.fromEntries(
  Object.entries(modelLogoModules).map(([path, url]) => [path.split("/").pop()?.replace(/\.[^.]+$/, "").toUpperCase() ?? "", url]),
);

export interface RecordPageConfig {
  entity: EntityKey;
  title: string;
  description: string;
  createLabel: string;
  searchPlaceholder: string;
  columns: ColumnConfig[];
  fields: FieldConfig[];
  readOnly?: boolean;
}

interface RecordPageProps {
  config: RecordPageConfig;
  records: BaseRecord[];
  data: DealerData;
  onCreate: (draft: Record<string, string | number>) => void;
  onUpdate: (id: string, patch: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
}

type BillTab = "current" | "history" | "pending" | "settled";

export function RecordPage({ config, records, data, onCreate, onUpdate, onDelete }: RecordPageProps) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [keywordDraft, setKeywordDraft] = React.useState("");
  const [keyword, setKeyword] = React.useState("");
  const [providerFilter, setProviderFilter] = React.useState<string[]>([]);
  const [typeFilter, setTypeFilter] = React.useState<string[]>([]);
  const [billingFilter, setBillingFilter] = React.useState<string[]>([]);
  const [customerFilter, setCustomerFilter] = React.useState<string[]>([]);
  const [apiKeyFilter, setApiKeyFilter] = React.useState<string[]>([]);
  const [modelFilter, setModelFilter] = React.useState<string[]>([]);
  const [consumptionStatusFilter, setConsumptionStatusFilter] = React.useState<string[]>([]);
  const [calledStart, setCalledStart] = React.useState("");
  const [calledEnd, setCalledEnd] = React.useState("");
  const [contractNoDraft, setContractNoDraft] = React.useState("");
  const [contractNoFilter, setContractNoFilter] = React.useState("");
  const [contractCustomerFilter, setContractCustomerFilter] = React.useState("");
  const [contractOrderStart, setContractOrderStart] = React.useState("");
  const [periodStart, setPeriodStart] = React.useState("");
  const [periodEnd, setPeriodEnd] = React.useState("");
  const [billCustomerFilter, setBillCustomerFilter] = React.useState("");
  const [billTab, setBillTab] = React.useState<BillTab>("current");
  const [editingRecord, setEditingRecord] = React.useState<BaseRecord | null>(null);
  const [detailRecord, setDetailRecord] = React.useState<BaseRecord | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<"cards" | "table">(config.entity === "models" || config.entity === "products" ? "cards" : "table");
  const [hasHorizontalOverflow, setHasHorizontalOverflow] = React.useState(false);
  const [hasContentOnRight, setHasContentOnRight] = React.useState(false);
  const isProductPage = config.entity === "products";
  const isModelPage = config.entity === "models";
  const isConsumptionPage = config.entity === "consumptions" && config.title === "消费记录";
  const isUsageLogPage = config.entity === "usageLogs";
  const isContractsPage = config.entity === "contracts";
  const isBillsPage = config.entity === "bills";
  const supportsCardView = isModelPage || isProductPage;
  const supportsDetailView = isModelPage || isProductPage || isUsageLogPage || isContractsPage || isBillsPage;
  const showActions = !config.readOnly && !isContractsPage;
  const showActionColumn = showActions || supportsDetailView;
  const canCreate = !config.readOnly && config.entity !== "models";
  const canDelete = showActions && config.entity !== "models" && config.entity !== "products" && !isContractsPage;
  const resolvedFields = React.useMemo(() => resolveFields(config.fields, data), [config.fields, data]);
  const productModelOptions = React.useMemo(() => resolveOptions("models", data), [data]);
  const emptyDraft = React.useMemo(() => buildEmptyDraft(resolvedFields), [resolvedFields]);
  const [draft, setDraft] = React.useState<Record<string, string | number>>(emptyDraft);
  const visibleFields = React.useMemo(() => resolveVisibleFields(config.entity, resolvedFields, draft), [config.entity, draft, resolvedFields]);
  const tableColumns = React.useMemo(
    () => (isModelPage ? config.columns.filter((column) => column.key !== "logoText") : config.columns),
    [config.columns, isModelPage],
  );

  React.useEffect(() => {
    setDraft(editingRecord ? recordToDraft(editingRecord, resolvedFields) : emptyDraft);
  }, [editingRecord, emptyDraft, resolvedFields]);

  React.useEffect(() => {
    setViewMode(config.entity === "models" || config.entity === "products" ? "cards" : "table");
  }, [config.entity]);

  const filteredRecords = React.useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    const keywordMatchedRecords = normalized && !isContractsPage && !isBillsPage
      ? records.filter((record) =>
          Object.values(record).some((value) => String(value).toLowerCase().includes(normalized)),
        )
      : records;

    const modelFilteredRecords = isModelPage
      ? keywordMatchedRecords.filter((record) =>
          matchesFilter(record, "provider", providerFilter)
          && matchesFilter(record, "type", typeFilter)
          && matchesFilter(record, "billingType", billingFilter),
        )
      : keywordMatchedRecords;

    const consumptionFilteredRecords = isConsumptionPage
      ? modelFilteredRecords.filter((record) =>
          matchesFilter(record, "customerName", customerFilter)
          && matchesFilter(record, "keyName", apiKeyFilter)
          && matchesFilter(record, "modelName", modelFilter)
          && matchesFilter(record, "status", consumptionStatusFilter)
          && matchesDateRange(record, "calledAt", calledStart, calledEnd),
        )
      : modelFilteredRecords;

    const usageLogFilteredRecords = isUsageLogPage
      ? consumptionFilteredRecords.filter((record) => matchesDateRange(record, "requestedAt", calledStart, calledEnd))
      : consumptionFilteredRecords;

    const contractFilteredRecords = isContractsPage
      ? usageLogFilteredRecords.filter((record) =>
          (!contractNoFilter || String(getRecordValue(record, "contractNo") ?? "").toLowerCase().includes(contractNoFilter.trim().toLowerCase()))
          && (!contractCustomerFilter || String(getRecordValue(record, "customerName") ?? "") === contractCustomerFilter)
          && matchesDateRange(record, "orderedAt", contractOrderStart, ""),
        )
      : usageLogFilteredRecords;

    if (!isBillsPage) {
      return contractFilteredRecords;
    }

    const currentBillPeriod = getCurrentBillPeriod(records);
    return contractFilteredRecords.filter((record) => {
      const period = String(getRecordValue(record, "period") ?? "");
      const status = String(getRecordValue(record, "status") ?? "");
      const tabMatched = billTab === "current"
        ? period === currentBillPeriod
        : billTab === "history"
          ? period < currentBillPeriod
          : billTab === "pending"
            ? status === "待结算"
            : status === "已结算";

      return tabMatched
        && (!billCustomerFilter || String(getRecordValue(record, "customerName") ?? "") === billCustomerFilter)
        && (!periodStart || period >= periodStart)
        && (!periodEnd || period <= periodEnd);
    });
  }, [apiKeyFilter, billCustomerFilter, billTab, billingFilter, calledEnd, calledStart, consumptionStatusFilter, contractCustomerFilter, contractNoFilter, contractOrderStart, customerFilter, isBillsPage, isConsumptionPage, isContractsPage, isModelPage, isUsageLogPage, keyword, modelFilter, periodEnd, periodStart, providerFilter, records, typeFilter]);

  React.useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      setHasHorizontalOverflow(false);
      setHasContentOnRight(false);
      return;
    }

    const updateScrollState = () => {
      const hasOverflow = container.scrollWidth > container.clientWidth + 1;
      const remainingRightWidth = container.scrollWidth - container.clientWidth - container.scrollLeft;
      setHasHorizontalOverflow(hasOverflow);
      setHasContentOnRight(hasOverflow && remainingRightWidth > 1);
    };

    updateScrollState();

    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(container);
    container.addEventListener("scroll", updateScrollState, { passive: true });

    return () => {
      resizeObserver.disconnect();
      container.removeEventListener("scroll", updateScrollState);
    };
  }, [filteredRecords.length, tableColumns, viewMode]);

  function openCreateForm() {
    setEditingRecord(null);
    setDraft(emptyDraft);
    setIsFormOpen(true);
  }

  function openEditForm(record: BaseRecord) {
    setEditingRecord(record);
    setIsFormOpen(true);
  }

  function openDetail(record: BaseRecord) {
    setDetailRecord(record);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingRecord(null);
  }

  function resetFilters() {
    setKeywordDraft("");
    setKeyword("");
    setProviderFilter([]);
    setTypeFilter([]);
    setBillingFilter([]);
    setCustomerFilter([]);
    setApiKeyFilter([]);
    setModelFilter([]);
    setConsumptionStatusFilter([]);
    setCalledStart("");
    setCalledEnd("");
    setContractNoDraft("");
    setContractNoFilter("");
    setContractCustomerFilter("");
    setContractOrderStart("");
    setPeriodStart("");
    setPeriodEnd("");
    setBillCustomerFilter("");
  }

  function exportRecords() {
    const rows = [config.columns.map((column) => column.label), ...filteredRecords.map((record) => config.columns.map((column) => String(getRecordValue(record, column.key) ?? "")))];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${config.title}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function exportSingleRecord(record: BaseRecord) {
    const rows = [config.columns.map((column) => column.label), config.columns.map((column) => String(getRecordValue(record, column.key) ?? ""))];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${config.title}-${String(getRecordValue(record, "period") ?? record.id)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedDraft = normalizeDraft(resolvedFields, draft);

    if (editingRecord) {
      onUpdate(editingRecord.id, normalizedDraft);
    } else {
      onCreate(normalizedDraft);
    }

    closeForm();
  }

  return (
    <div className="space-y-5">
      {isBillsPage ? <BillTabs value={billTab} onChange={setBillTab} /> : null}

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {!isBillsPage ? (
              <div className={`relative ${isContractsPage ? "w-[300px] shrink-0" : "min-w-[260px] flex-1 sm:flex-none"}`}>
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  className={`pl-9 ${isContractsPage ? "h-10 w-full rounded-md" : "sm:w-72"}`}
                  value={isContractsPage ? contractNoDraft : keywordDraft}
                  onBlur={() => {
                    if (!isContractsPage) setKeyword(keywordDraft);
                  }}
                  onChange={(event) => {
                    if (isContractsPage) {
                      setContractNoDraft(event.target.value);
                      setContractNoFilter(event.target.value);
                    } else {
                      setKeywordDraft(event.target.value);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      if (!isContractsPage) {
                        setKeyword(keywordDraft);
                      }
                      event.currentTarget.blur();
                    }
                  }}
                  placeholder={isContractsPage ? "搜索合同号" : config.searchPlaceholder}
                />
              </div>
            ) : null}
            {isContractsPage ? (
              <>
                <FilterSelectField className="h-10 w-[220px] rounded-md" ariaLabel="客户名称" value={contractCustomerFilter} onChange={setContractCustomerFilter} options={["", ...unique(records.map((record) => String(getRecordValue(record, "customerName") ?? "")).filter(Boolean))]} placeholder="全部客户" />
                <DatePickerField className="h-10 w-[210px] rounded-md" mode="datetime" placeholder="下单时间" value={contractOrderStart} onChange={setContractOrderStart} />
              </>
            ) : null}
            {isModelPage ? (
              <>
                <FilterMultiSelect label="供应商" options={unique(records.map((record) => String(getRecordValue(record, "provider") ?? "")).filter(Boolean))} value={providerFilter} onChange={setProviderFilter} />
                <FilterMultiSelect label="模型类型" options={["对话补全", "图像", "文本转语音", "语音转文本", "视频"]} value={typeFilter} onChange={setTypeFilter} />
                <FilterMultiSelect label="计费类型" options={["按量计费", "按次计费"]} value={billingFilter} onChange={setBillingFilter} />
              </>
            ) : null}
            {isBillsPage ? (
              <>
                <FilterSelectField className="h-10 w-[220px] rounded-md" ariaLabel="客户名称" value={billCustomerFilter} onChange={setBillCustomerFilter} options={["", ...unique(records.map((record) => String(getRecordValue(record, "customerName") ?? "")).filter(Boolean))]} placeholder="全部客户" />
                <DatePickerField className="h-10 w-[160px] rounded-md" mode="month" placeholder="开始账期" value={periodStart} onChange={setPeriodStart} />
                <DatePickerField className="h-10 w-[160px] rounded-md" mode="month" placeholder="结束账期" value={periodEnd} onChange={setPeriodEnd} />
                <Button className="whitespace-nowrap" variant="secondary" onClick={exportRecords}>
                  <Download className="size-4" />
                  导出账单
                </Button>
              </>
            ) : null}
            {isConsumptionPage ? (
              <>
                <FilterMultiSelect label="客户企业名" options={unique(records.map((record) => String(getRecordValue(record, "customerName") ?? "")).filter(Boolean))} value={customerFilter} onChange={setCustomerFilter} />
                <FilterMultiSelect label="API Key" options={unique(records.map((record) => String(getRecordValue(record, "keyName") ?? "")).filter(Boolean))} value={apiKeyFilter} onChange={setApiKeyFilter} />
                <FilterMultiSelect label="调用模型" options={unique(records.map((record) => String(getRecordValue(record, "modelName") ?? "")).filter(Boolean))} value={modelFilter} onChange={setModelFilter} />
                <DatePickerField className="h-9 rounded-md sm:w-44" mode="datetime" placeholder="开始时间" value={calledStart} onChange={setCalledStart} />
                <DatePickerField className="h-9 rounded-md sm:w-44" mode="datetime" placeholder="结束时间" value={calledEnd} onChange={setCalledEnd} />
                <FilterMultiSelect label="状态" options={["成功", "失败"]} value={consumptionStatusFilter} onChange={setConsumptionStatusFilter} />
              </>
            ) : null}
            {isUsageLogPage ? (
              <>
                <DatePickerField className="h-9 rounded-md sm:w-44" mode="datetime" placeholder="开始时间" value={calledStart} onChange={setCalledStart} />
                <DatePickerField className="h-9 rounded-md sm:w-44" mode="datetime" placeholder="结束时间" value={calledEnd} onChange={setCalledEnd} />
              </>
            ) : null}
            {isModelPage || isConsumptionPage || isUsageLogPage ? (
              <Button className="whitespace-nowrap" variant="secondary" onClick={exportRecords}>
                <Download className="size-4" />
                导出
              </Button>
            ) : null}
            <Button className="whitespace-nowrap" variant="secondary" onClick={resetFilters}>
              <RotateCcw className="size-4" />
              重置
            </Button>
            {canCreate ? (
              <Button className="whitespace-nowrap" variant="primary" onClick={openCreateForm}>
                <Plus className="size-4" />
                {config.createLabel}
              </Button>
            ) : null}
          </div>
          {supportsCardView ? <ViewModeToggle value={viewMode} onChange={setViewMode} /> : null}
        </div>
      </section>

      {isFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-8 backdrop-blur-sm" role="presentation" onMouseDown={closeForm}>
          <section
            aria-modal="true"
            className={`max-h-[calc(100vh-64px)] w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20 ${isProductPage || isModelPage ? "max-w-6xl" : "max-w-4xl"}`}
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <form className="flex max-h-[calc(100vh-64px)] flex-col" onSubmit={handleSubmit}>
              <div className="flex items-start justify-between gap-6 border-b border-slate-100 px-7 py-6">
                <div>
                  <h3 className="text-xl font-semibold text-slate-950">{isProductPage ? "新建/编辑模型产品" : editingRecord ? `编辑${config.title}` : config.createLabel}</h3>
                  <p className="mt-2 text-sm text-slate-500">{isProductPage ? "配置面向客户的产品包、计费模式及关联的大语言模型。" : config.description}</p>
                </div>
                <button
                  aria-label="关闭弹窗"
                  className="flex size-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  onClick={closeForm}
                  type="button"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="overflow-y-auto px-7 py-6">
                {isModelPage ? (
                  <ModelFormBody draft={draft} fields={resolvedFields} setDraft={setDraft} />
                ) : isProductPage ? (
                  <ProductFormBody draft={draft} fields={resolvedFields} modelOptions={productModelOptions} setDraft={setDraft} />
                ) : (
                  <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
                    {visibleFields.map((field) => (
                      <label key={String(field.key)} className={field.kind === "textarea" || field.kind === "permissionMatrix" ? "space-y-2 md:col-span-2" : "space-y-2"}>
                        <span className="block text-sm font-semibold text-slate-700">
                          {field.label}
                          {field.required ? <span className="ml-1 text-rose-500">*</span> : null}
                        </span>
                        <FieldInput
                          disabled={isContractsPage && editingRecord ? String(getRecordValue(editingRecord, "status") ?? "") === "启用" && field.key !== "status" : false}
                          field={field}
                          value={draft[String(field.key)] ?? ""}
                          onChange={(value) => setDraft((current) => ({ ...current, [String(field.key)]: value }))}
                        />
                        {isContractsPage && field.key === "expiresAt" ? (
                          <ExpiryShortcutButtons value={String(draft.expiresAt ?? "")} onChange={(value) => setDraft((current) => ({ ...current, expiresAt: value }))} />
                        ) : null}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/70 px-7 py-5">
                <Button className="h-10 px-5" type="button" variant="secondary" onClick={closeForm}>
                  取消
                </Button>
                <Button className="h-10 px-6" type="submit" variant="primary">
                  {isProductPage ? "保存配置" : "保存"}
                </Button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {isModelPage && detailRecord ? (
        <ModelDetailDialog record={detailRecord} onClose={() => setDetailRecord(null)} onEdit={(record) => {
          setDetailRecord(null);
          openEditForm(record);
        }} />
      ) : null}

      {isProductPage && detailRecord ? (
        <ProductDetailDialog record={detailRecord} onClose={() => setDetailRecord(null)} onEdit={(record) => {
          setDetailRecord(null);
          openEditForm(record);
        }} />
      ) : null}

      {isUsageLogPage && detailRecord ? (
        <UsageLogDetailDialog record={detailRecord} onClose={() => setDetailRecord(null)} />
      ) : null}

      {isContractsPage && detailRecord ? (
        <ContractDetailDialog record={detailRecord} onClose={() => setDetailRecord(null)} onEdit={(record) => {
          setDetailRecord(null);
          openEditForm(record);
        }} />
      ) : null}

      {isBillsPage && detailRecord ? (
        <BillDetailDialog data={data} record={detailRecord} onClose={() => setDetailRecord(null)} />
      ) : null}

      {isModelPage && viewMode === "cards" ? (
        <ModelCardGrid records={filteredRecords} onDetail={openDetail} onEdit={openEditForm} />
      ) : isProductPage && viewMode === "cards" ? (
        <ProductCardGrid records={filteredRecords} canDelete={canDelete} onDetail={openDetail} onEdit={openEditForm} onDelete={onDelete} />
      ) : (
      <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm shadow-slate-100">
        <div ref={scrollContainerRef} className="max-h-[calc(100vh-340px)] overflow-auto">
          <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                {tableColumns.map((column) => (
                  <th
                    key={String(column.key)}
                    className="sticky top-0 z-10 h-12 whitespace-nowrap border-b border-slate-200 bg-slate-50 px-4 font-medium"
                    style={{ minWidth: isModelPage && column.key === "name" ? 240 : column.width ?? 150 }}
                  >
                    {column.label}
                  </th>
                ))}
                {showActionColumn ? (
                  <th
                    className={[
                      "sticky right-0 top-0 h-12 min-w-[190px] whitespace-nowrap border-b border-slate-200 bg-slate-50 px-4 text-right font-medium",
                      hasHorizontalOverflow
                        ? [
                            "z-30",
                            hasContentOnRight
                              ? "border-l border-slate-200/70 shadow-[-18px_0_26px_-24px_rgba(30,41,59,0.55)]"
                              : "border-l-0 shadow-none",
                          ].join(" ")
                        : "z-10",
                    ].join(" ")}
                  >
                    操作
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td className="h-24 px-4 text-center text-slate-500" colSpan={tableColumns.length + (showActionColumn ? 1 : 0)}>
                    暂无匹配数据
                  </td>
                </tr>
              ) : null}
              {filteredRecords.map((record) => (
                <tr key={record.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                  {tableColumns.map((column) => (
                    <td
                      key={String(column.key)}
                      className="whitespace-nowrap border-b border-slate-100 bg-white px-4 py-3 align-middle text-slate-700"
                    >
                      {isModelPage && column.key === "name" ? (
                        <ModelNameWithLogo record={record} logoSize="sm" />
                      ) : column.format ? column.format(getRecordValue(record, column.key), record) : formatCell(getRecordValue(record, column.key))}
                    </td>
                  ))}
                  {showActionColumn ? (
                    <td
                      className={[
                        "sticky right-0 whitespace-nowrap border-b border-slate-100 bg-white px-4 py-3",
                        hasHorizontalOverflow
                          ? [
                              "z-20",
                              hasContentOnRight
                                ? "border-l border-slate-200/70 shadow-[-18px_0_26px_-24px_rgba(30,41,59,0.55)]"
                                : "border-l-0 shadow-none",
                            ].join(" ")
                          : "z-10",
                      ].join(" ")}
                    >
                      <div className="flex justify-end gap-1">
                        {supportsDetailView ? (
                          <Button className="px-2 text-slate-500 hover:bg-slate-50 hover:text-slate-900" variant="ghost" onClick={() => openDetail(record)}>
                            <Eye className="size-4" />
                            {isBillsPage ? "查看明细" : "详情"}
                          </Button>
                        ) : null}
                        {isBillsPage ? (
                          <Button className="px-2 text-slate-500 hover:bg-slate-50 hover:text-slate-900" variant="ghost" onClick={() => exportSingleRecord(record)}>
                            <Download className="size-4" />
                            导出
                          </Button>
                        ) : null}
                        {showActions ? (
                          <Button className="px-2 text-[#1155ff] hover:bg-blue-50 hover:text-[#0648f4]" variant="ghost" onClick={() => openEditForm(record)}>
                            <Edit3 className="size-4" />
                            编辑
                          </Button>
                        ) : null}
                        {canDelete ? (
                          <Button className="px-2" variant="danger" onClick={() => onDelete(record.id)}>
                            <Trash2 className="size-4" />
                            删除
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      )}
    </div>
  );
}

function ViewModeToggle({ value, onChange }: { value: "cards" | "table"; onChange: (value: "cards" | "table") => void }) {
  const items = [
    { value: "cards" as const, label: "卡片视图", icon: LayoutGrid },
    { value: "table" as const, label: "列表视图", icon: List },
  ];

  return (
    <div className="flex h-10 items-center rounded-md border border-slate-200 bg-slate-50 p-1">
      {items.map((item) => {
        const Icon = item.icon;
        const selected = value === item.value;
        return (
          <button
            key={item.value}
            aria-label={item.label}
            className={[
              "flex size-8 items-center justify-center rounded transition-colors",
              selected ? "bg-[#1155ff] text-white shadow-sm" : "text-slate-500 hover:bg-white hover:text-slate-900",
            ].join(" ")}
            onClick={() => onChange(item.value)}
            title={item.label}
            type="button"
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}

function BillTabs({ value, onChange }: { value: BillTab; onChange: (value: BillTab) => void }) {
  const items: Array<{ label: string; value: BillTab }> = [
    { label: "当期账单", value: "current" },
    { label: "往期账单", value: "history" },
    { label: "待结算", value: "pending" },
    { label: "已结算", value: "settled" },
  ];

  return (
    <div className="flex flex-wrap gap-7 border-b border-slate-200">
      {items.map((item) => (
        <button
          key={item.value}
          className={`cursor-pointer border-b-2 pb-3 text-sm font-semibold transition-colors ${value === item.value ? "border-[#1155ff] text-[#1155ff]" : "border-transparent text-slate-400 hover:text-slate-600"}`}
          onClick={() => onChange(item.value)}
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function ModelLogo({ record, size }: { record: BaseRecord; size: "sm" | "md" | "lg" }) {
  const provider = String(getRecordValue(record, "provider") ?? "");
  const logoText = String(getRecordValue(record, "logoText") ?? provider.slice(0, 2).toUpperCase()).toUpperCase();
  const logoUrl = modelLogoUrls[logoText];
  const sizeClass = size === "sm" ? "size-8 rounded" : size === "lg" ? "size-14 rounded-lg" : "size-11 rounded-md";
  const imagePaddingClass = size === "sm" ? "p-1.5" : "p-2";

  return (
    <div className={`flex ${sizeClass} shrink-0 items-center justify-center border border-blue-100 bg-blue-50 text-sm font-bold text-[#1155ff]`}>
      {logoUrl ? (
        <img alt={`${provider || logoText} Logo`} className={`h-full w-full object-contain ${imagePaddingClass}`} src={logoUrl} />
      ) : logoText ? (
        logoText
      ) : (
        <Bot className="size-5" />
      )}
    </div>
  );
}

function ModelNameWithLogo({ record, logoSize }: { record: BaseRecord; logoSize: "sm" | "md" | "lg" }) {
  const name = String(getRecordValue(record, "name") ?? "-");

  return (
    <div className="flex items-center gap-3">
      <ModelLogo record={record} size={logoSize} />
      <span className="font-medium text-slate-800">{name}</span>
    </div>
  );
}

function ModelCardGrid({ records, onDetail, onEdit }: { records: BaseRecord[]; onDetail: (record: BaseRecord) => void; onEdit: (record: BaseRecord) => void }) {
  if (records.length === 0) {
    return (
      <section className="rounded-md border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm shadow-slate-100">
        暂无匹配数据
      </section>
    );
  }

  return (
    <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {records.map((record) => {
        const provider = String(getRecordValue(record, "provider") ?? "-");
        const name = String(getRecordValue(record, "name") ?? "-");
        const type = String(getRecordValue(record, "type") ?? "-");
        const billingType = String(getRecordValue(record, "billingType") ?? "-");
        const abilities = String(getRecordValue(record, "abilities") ?? "");
        const abilityTags = abilities.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 4);

        return (
          <article key={record.id} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100 transition hover:border-blue-100 hover:shadow-md hover:shadow-slate-100">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <ModelLogo record={record} size="md" />
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-slate-950">{name}</h3>
                  <p className="mt-1 truncate text-sm text-slate-500">{provider} · {type}</p>
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-[#1155ff]">
                {billingType}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <ModelPrice label="输入价格" value={`${formatCurrency(Number(getRecordValue(record, "inputPrice") ?? 0))}/1M`} />
              <ModelPrice label="输出价格" value={`${formatCurrency(Number(getRecordValue(record, "outputPrice") ?? 0))}/1M`} />
              <ModelPrice label="缓存价格" value={`${formatCurrency(Number(getRecordValue(record, "cachePrice") ?? 0))}/1M`} />
            </div>

            <div className="mt-5 flex min-h-8 flex-wrap gap-2">
              {abilityTags.length > 0 ? abilityTags.map((tag) => (
                <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">{tag}</span>
              )) : <span className="text-sm text-slate-400">暂无能力标签</span>}
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Button className="px-2 text-slate-500 hover:bg-slate-50 hover:text-slate-900" variant="ghost" onClick={() => onDetail(record)}>
                <Eye className="size-4" />
                详情
              </Button>
              <Button className="px-2 text-[#1155ff] hover:bg-blue-50 hover:text-[#0648f4]" variant="ghost" onClick={() => onEdit(record)}>
                <Edit3 className="size-4" />
                编辑
              </Button>
            </div>
          </article>
        );
      })}
    </section>
  );
}

function ModelDetailDialog({ record, onClose, onEdit }: { record: BaseRecord; onClose: () => void; onEdit: (record: BaseRecord) => void }) {
  const provider = String(getRecordValue(record, "provider") ?? "-");
  const name = String(getRecordValue(record, "name") ?? "-");
  const type = String(getRecordValue(record, "type") ?? "-");
  const billingType = String(getRecordValue(record, "billingType") ?? "-");
  const abilities = String(getRecordValue(record, "abilities") ?? "-");
  const fields = [
    { label: "厂商", value: provider },
    { label: "模型名称", value: <ModelNameWithLogo record={record} logoSize="sm" /> },
    { label: "模型类型", value: type },
    { label: "输入价格", value: `${formatCurrency(Number(getRecordValue(record, "inputPrice") ?? 0))}/1M Tokens` },
    { label: "输出价格", value: `${formatCurrency(Number(getRecordValue(record, "outputPrice") ?? 0))}/1M Tokens` },
    { label: "缓存价格", value: `${formatCurrency(Number(getRecordValue(record, "cachePrice") ?? 0))}/1M Tokens` },
    { label: "成本输入价", value: `${formatCurrency(Number(getRecordValue(record, "costInputPrice") ?? 0))}/1M Tokens` },
    { label: "成本输出价", value: `${formatCurrency(Number(getRecordValue(record, "costOutputPrice") ?? 0))}/1M Tokens` },
    { label: "成本缓存价", value: `${formatCurrency(Number(getRecordValue(record, "costCachePrice") ?? getRecordValue(record, "cachePrice") ?? 0))}/1M Tokens` },
    { label: "计费类型", value: billingType },
    { label: "模型能力", value: abilities },
    { label: "创建时间", value: record.createdAt },
    { label: "最后修改时间", value: record.updatedAt },
  ];

  return (
    <DetailDialogShell title="模型详情" subtitle={name} onClose={onClose} onEdit={() => onEdit(record)}>
      {fields.map((field) => (
        <DetailField key={field.label} label={field.label} value={field.value} />
      ))}
    </DetailDialogShell>
  );
}

function ModelFormBody({
  draft,
  fields,
  setDraft,
}: {
  draft: Record<string, string | number>;
  fields: FieldConfig[];
  setDraft: React.Dispatch<React.SetStateAction<Record<string, string | number>>>;
}) {
  const fieldMap = React.useMemo(() => Object.fromEntries(fields.map((field) => [String(field.key), field])), [fields]);
  const discount = getModelDraftDiscount(draft);
  const [unifiedDiscountDraft, setUnifiedDiscountDraft] = React.useState(String(discount));
  const unifiedDiscountFocusedRef = React.useRef(false);

  React.useEffect(() => {
    if (!unifiedDiscountFocusedRef.current) {
      setUnifiedDiscountDraft(String(discount));
    }
  }, [discount]);

  function updateDraftValue(key: string, value: string | number) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function applyDiscount(value: number) {
    const ratio = Math.max(0, value) / 100;
    setDraft((current) => {
      const inputBase = getModelOriginalPrice(current, "originalInputPrice", "inputPrice");
      const outputBase = getModelOriginalPrice(current, "originalOutputPrice", "outputPrice");
      const cacheBase = getModelOriginalPrice(current, "originalCachePrice", "cachePrice");

      return {
        ...current,
        originalInputPrice: inputBase,
        originalOutputPrice: outputBase,
        originalCachePrice: cacheBase,
        inputPrice: roundPrice(inputBase * ratio),
        outputPrice: roundPrice(outputBase * ratio),
        cachePrice: roundPrice(cacheBase * ratio),
      };
    });
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-slate-50/60 px-5 py-5">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <ModelStackedField icon={Building2} label="厂商">
            <ModelTextInput
              ariaLabel="厂商"
              value={String(draft.provider ?? "")}
              onChange={(value) => updateDraftValue("provider", value)}
              required={fieldMap.provider?.required}
            />
          </ModelStackedField>
          <ModelStackedField icon={Tags} label="模型名称">
            <ModelTextInput
              ariaLabel="模型名称"
              value={String(draft.name ?? "")}
              onChange={(value) => updateDraftValue("name", value)}
              required={fieldMap.name?.required}
            />
          </ModelStackedField>
          <ModelStackedField icon={CreditCard} label="计费类型">
            {fieldMap.billingType ? (
              <Select
                className="h-12 rounded-full border-slate-200 bg-white pl-5 pr-12 text-base font-bold text-slate-800 shadow-sm shadow-slate-100 focus:border-[#1155ff] focus:ring-blue-100"
                value={String(draft.billingType ?? "按量计费")}
                onChange={(event) => updateDraftValue("billingType", event.target.value)}
              >
                {(fieldMap.billingType.options ?? []).map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </Select>
            ) : null}
          </ModelStackedField>
          <ModelStackedField icon={Cpu} label="模型类型">
            {fieldMap.type ? (
              <Select
                className="h-12 rounded-full border-slate-200 bg-white pl-5 pr-12 text-base font-bold text-slate-800 shadow-sm shadow-slate-100 focus:border-[#1155ff] focus:ring-blue-100"
                value={String(draft.type ?? "对话补全")}
                onChange={(event) => updateDraftValue("type", event.target.value)}
              >
                {(fieldMap.type.options ?? []).map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </Select>
            ) : null}
          </ModelStackedField>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <Coins className="size-5 text-[#2f80ed]" />
            <h4 className="text-lg font-bold text-slate-900">定价（每1M Tokens）</h4>
            <span className="rounded-full bg-blue-50 px-4 py-1.5 text-sm font-bold text-[#1155ff]">原价 / 售价</span>
          </div>
          <label className="inline-flex h-12 w-full items-center gap-3 rounded-full border border-slate-200 bg-white px-4 shadow-md shadow-slate-200/60 lg:w-auto">
            <Percent className="size-5 text-[#2f80ed]" />
            <span className="shrink-0 text-sm font-bold text-slate-700">统一折扣</span>
            <Input
              aria-label="统一折扣"
              className="h-9 w-24 rounded-full bg-slate-50 px-4 text-center text-base font-bold focus:border-[#1155ff] focus:ring-blue-100"
              min={0}
              type="number"
              value={unifiedDiscountDraft}
              onBlur={() => {
                unifiedDiscountFocusedRef.current = false;
                const nextDiscount = Number(unifiedDiscountDraft || 0);
                applyDiscount(nextDiscount);
                setUnifiedDiscountDraft(String(nextDiscount));
              }}
              onChange={(event) => setUnifiedDiscountDraft(event.target.value)}
              onFocus={() => {
                unifiedDiscountFocusedRef.current = true;
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.currentTarget.blur();
                }
              }}
            />
            <span className="text-base font-bold text-slate-500">%</span>
          </label>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          <ModelPriceEditor
            icon={LogIn}
            label="输入"
            originalValue={getModelOriginalPrice(draft, "originalInputPrice", "inputPrice")}
            saleValue={Number(draft.inputPrice || 0)}
            onOriginalChange={(value) => updateDraftValue("originalInputPrice", value)}
            onSaleChange={(value) => updateDraftValue("inputPrice", value)}
            onDiscountChange={(value) => updateDraftValue("inputPrice", roundPrice(getModelOriginalPrice(draft, "originalInputPrice", "inputPrice") * Math.max(0, value) / 100))}
          />
          <ModelPriceEditor
            icon={LogOut}
            label="输出"
            originalValue={getModelOriginalPrice(draft, "originalOutputPrice", "outputPrice")}
            saleValue={Number(draft.outputPrice || 0)}
            onOriginalChange={(value) => updateDraftValue("originalOutputPrice", value)}
            onSaleChange={(value) => updateDraftValue("outputPrice", value)}
            onDiscountChange={(value) => updateDraftValue("outputPrice", roundPrice(getModelOriginalPrice(draft, "originalOutputPrice", "outputPrice") * Math.max(0, value) / 100))}
          />
          <ModelPriceEditor
            icon={Database}
            label="缓存"
            originalValue={getModelOriginalPrice(draft, "originalCachePrice", "cachePrice")}
            saleValue={Number(draft.cachePrice || 0)}
            onOriginalChange={(value) => updateDraftValue("originalCachePrice", value)}
            onSaleChange={(value) => updateDraftValue("cachePrice", value)}
            onDiscountChange={(value) => updateDraftValue("cachePrice", roundPrice(getModelOriginalPrice(draft, "originalCachePrice", "cachePrice") * Math.max(0, value) / 100))}
          />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <Tags className="size-5 text-[#2f80ed]" />
          <h4 className="text-lg font-bold text-slate-900">模型能力标签</h4>
        </div>
        {fieldMap.abilities ? (
          <FieldInput field={fieldMap.abilities} value={draft.abilities ?? ""} onChange={(value) => updateDraftValue("abilities", value)} />
        ) : null}
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-400">
          <Info className="size-4 text-amber-400" />
          添加描述模型能力的标签，方便用户筛选（如：对话补全、多模态、函数调用等）
        </p>
      </section>
    </div>
  );
}

function ModelStackedField({ icon: Icon, label, children }: { icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0 space-y-2">
      <span className="flex items-center gap-2 text-base font-bold text-slate-700">
        <Icon className="size-5 text-slate-500" />
        <span>{label}</span>
      </span>
      {children}
    </label>
  );
}

function ModelTextInput({
  ariaLabel,
  value,
  onChange,
  prefix,
  required,
}: {
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
  prefix?: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="relative block">
      {prefix ? <span className="pointer-events-none absolute left-2 top-1/2 flex -translate-y-1/2 items-center">{prefix}</span> : null}
      <Input
        aria-label={ariaLabel}
        className={`h-12 rounded-full border-slate-200 bg-white text-base font-bold text-slate-800 shadow-sm shadow-slate-100 focus:border-[#1155ff] focus:ring-blue-100 ${prefix ? "pl-14" : "pl-5"}`}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function ModelPriceEditor({
  icon: Icon,
  label,
  originalValue,
  saleValue,
  onOriginalChange,
  onSaleChange,
  onDiscountChange,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  originalValue: number;
  saleValue: number;
  onOriginalChange: (value: number) => void;
  onSaleChange: (value: number) => void;
  onDiscountChange: (value: number) => void;
}) {
  const discount = originalValue > 0 ? Math.round((saleValue / originalValue) * 100) : 100;
  const [discountDraft, setDiscountDraft] = React.useState(String(discount));
  const discountFocusedRef = React.useRef(false);

  React.useEffect(() => {
    if (!discountFocusedRef.current) {
      setDiscountDraft(String(discount));
    }
  }, [discount]);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm shadow-slate-100">
      <div className="flex items-center gap-3 text-lg font-bold text-slate-800">
        <Icon className="size-5 text-[#2f80ed]" strokeWidth={2.4} />
        <span>{label}</span>
      </div>
      <ModelPricePairInput
        label={label}
        originalValue={originalValue}
        saleValue={saleValue}
        onOriginalChange={onOriginalChange}
        onSaleChange={onSaleChange}
      />
      <div className="mt-3 flex items-center gap-2 text-base font-bold text-slate-500">
        <Info className="size-4 text-[#2f80ed]" />
        <span>售价</span>
        <Input
          aria-label={`${label}售价折扣`}
          className="h-8 w-16 rounded-none border-0 border-b border-dashed border-slate-300 bg-transparent px-2 text-center text-base font-bold text-slate-800 shadow-none focus:border-[#1155ff] focus:ring-0"
          min={0}
          type="number"
          value={discountDraft}
          onBlur={() => {
            discountFocusedRef.current = false;
            const nextDiscount = Number(discountDraft || 0);
            onDiscountChange(nextDiscount);
            setDiscountDraft(String(nextDiscount));
          }}
          onChange={(event) => setDiscountDraft(event.target.value)}
          onFocus={() => {
            discountFocusedRef.current = true;
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
        />
        <span>折</span>
      </div>
    </article>
  );
}

function ModelPricePairInput({
  label,
  originalValue,
  saleValue,
  onOriginalChange,
  onSaleChange,
}: {
  label: string;
  originalValue: number;
  saleValue: number;
  onOriginalChange: (value: number) => void;
  onSaleChange: (value: number) => void;
}) {
  return (
    <div className="mt-4 grid h-12 grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] overflow-hidden rounded-full border border-slate-200 bg-slate-50 shadow-inner shadow-slate-100">
      <label className="relative min-w-0">
        <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-lg font-bold text-slate-400">¥</span>
        <Input
          aria-label={`${label}原价`}
          className="h-full rounded-none border-0 bg-transparent pl-9 pr-2 text-lg font-bold text-slate-500 line-through shadow-none focus:border-transparent focus:ring-0"
          min={0}
          step="0.01"
          type="number"
          value={String(originalValue)}
          onChange={(event) => onOriginalChange(Number(event.target.value || 0))}
        />
      </label>
      <label className="relative m-1 min-w-0 overflow-hidden rounded-full bg-[#0b3972] shadow-md shadow-blue-900/20">
        <Zap className="pointer-events-none absolute left-4 top-1/2 z-10 size-4 -translate-y-1/2 text-white" fill="currentColor" />
        <span className="pointer-events-none absolute left-10 top-1/2 z-10 -translate-y-1/2 text-lg font-bold text-white/85">¥</span>
      <Input
        aria-label={`${label}售价`}
        className="h-full rounded-full border-0 bg-transparent pl-16 pr-3 text-lg font-bold text-white shadow-none focus:border-transparent focus:ring-0"
        min={0}
        step="0.01"
        type="number"
        value={String(saleValue)}
        onChange={(event) => onSaleChange(Number(event.target.value || 0))}
      />
      </label>
    </div>
  );
}

function getModelOriginalPrice(draft: Record<string, string | number>, originalKey: string, saleKey: string) {
  const original = Number(draft[originalKey] || 0);
  const sale = Number(draft[saleKey] || 0);
  if (original > 0) {
    return Math.max(original, sale, 0);
  }

  return sale > 0 ? roundPrice(sale / 0.85) : 0;
}

function getModelDraftDiscount(draft: Record<string, string | number>) {
  const pairs = [
    ["originalInputPrice", "inputPrice"],
    ["originalOutputPrice", "outputPrice"],
    ["originalCachePrice", "cachePrice"],
  ] as const;
  const ratios = pairs
    .map(([originalKey, saleKey]) => {
      const original = getModelOriginalPrice(draft, originalKey, saleKey);
      const sale = Number(draft[saleKey] || 0);
      return original > 0 ? sale / original : null;
    })
    .filter((ratio): ratio is number => typeof ratio === "number" && Number.isFinite(ratio));

  if (ratios.length === 0) {
    return 100;
  }

  return Math.round((ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length) * 100);
}

function roundPrice(value: number) {
  return Number(value.toFixed(2));
}

function ModelPrice({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
      <div className="text-xs text-slate-400">{label}</div>
      <div className={`mt-1 truncate text-sm font-semibold ${muted ? "text-slate-500" : "text-slate-950"}`}>{value}</div>
    </div>
  );
}

function ProductCardGrid({
  records,
  canDelete,
  onDetail,
  onEdit,
  onDelete,
}: {
  records: BaseRecord[];
  canDelete: boolean;
  onDetail: (record: BaseRecord) => void;
  onEdit: (record: BaseRecord) => void;
  onDelete: (id: string) => void;
}) {
  if (records.length === 0) {
    return (
      <section className="rounded-md border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm shadow-slate-100">
        暂无匹配数据
      </section>
    );
  }

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {records.map((record) => {
        const name = String(getRecordValue(record, "name") ?? "-");
        const packageMode = String(getRecordValue(record, "packageMode") ?? "-");
        const relatedModels = String(getRecordValue(record, "relatedModels") ?? "-");
        const billingMode = String(getRecordValue(record, "billingMode") ?? "-");
        const status = String(getRecordValue(record, "status") ?? "-");
        const isActive = status === "上架";
        const relatedModelList = relatedModels.split(",").map((item) => item.trim()).filter(Boolean);
        const stats = getProductCardStats(record);

        return (
          <article key={record.id} className="flex min-h-[360px] flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm shadow-slate-100 transition hover:border-blue-200 hover:shadow-md hover:shadow-slate-100">
            <div className="border-b border-slate-100 p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="min-w-0 truncate text-base font-semibold text-slate-950">{name}</h3>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${isActive ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
                  {isActive ? "已上架" : "已下架"}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                <Clock className="size-4 text-slate-400" />
                <span>{getProductBillingLabel(packageMode, billingMode)}</span>
              </div>
            </div>

            <div className="flex flex-1 flex-col p-5">
              <div>
                <div className="text-sm font-semibold text-slate-400">关联模型（预览）</div>
                <div className="mt-3 flex min-h-[108px] flex-col items-start gap-2">
                  {relatedModelList.length > 0 ? relatedModelList.slice(0, 4).map((model) => (
                    <span key={model} className="inline-flex max-w-full items-center gap-2 rounded-md bg-slate-100 px-2.5 py-1.5 text-sm font-semibold text-slate-700">
                      <Cpu className="size-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">{model}</span>
                    </span>
                  )) : (
                    <span className="text-sm text-slate-400">暂无关联模型</span>
                  )}
                  {relatedModelList.length > 4 ? <span className="text-xs font-medium text-slate-400">+{relatedModelList.length - 4} 个模型</span> : null}
                </div>
              </div>

              <div className="mt-auto grid grid-cols-2 gap-4 pt-6">
                {stats.map((stat) => (
                  <ProductCardStat key={stat.label} label={stat.label} value={stat.value} />
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 bg-white px-5 py-4">
              <Button className="h-10 px-4" variant="secondary" onClick={() => onDetail(record)}>
                详情
              </Button>
              <Button className="h-10 px-4" variant="primary" onClick={() => onEdit(record)}>
                编辑
              </Button>
              {canDelete ? (
                <Button className="px-2" variant="danger" onClick={() => onDelete(record.id)}>
                  <Trash2 className="size-4" />
                  删除
                </Button>
              ) : null}
            </div>
          </article>
        );
      })}
    </section>
  );
}

function ProductDetailDialog({ record, onClose, onEdit }: { record: BaseRecord; onClose: () => void; onEdit: (record: BaseRecord) => void }) {
  const name = String(getRecordValue(record, "name") ?? "-");
  const packageMode = String(getRecordValue(record, "packageMode") ?? "-");
  const relatedModels = String(getRecordValue(record, "relatedModels") ?? "-");
  const tokenLimitM = String(getRecordValue(record, "tokenLimitM") || "不限");
  const monthlyTokenM = String(getRecordValue(record, "monthlyTokenM") || "不限");
  const monthlyFee = Number(getRecordValue(record, "monthlyFee") ?? 0);
  const discount = Number(getRecordValue(record, "discount") ?? 0);
  const billingMode = String(getRecordValue(record, "billingMode") ?? "-");
  const status = String(getRecordValue(record, "status") ?? "-");
  const fields = [
    { label: "产品ID", value: record.id },
    { label: "产品名称", value: name },
    { label: "套餐模式", value: packageMode },
    { label: "关联模型", value: relatedModels },
    { label: "输入价格", value: `${formatCurrency(Number(getRecordValue(record, "inputPrice") ?? 0))}/1M Tokens` },
    { label: "输出价格", value: `${formatCurrency(Number(getRecordValue(record, "outputPrice") ?? 0))}/1M Tokens` },
    { label: "缓存价格", value: `${formatCurrency(Number(getRecordValue(record, "cachePrice") ?? 0))}/1M Tokens` },
    { label: "Tokens（M）", value: tokenLimitM },
    ...(packageMode === "按量包月" ? [{ label: "每月总 Token 数量", value: monthlyTokenM }] : []),
    ...(packageMode === "按量包月" || packageMode === "按金额包月" ? [{ label: "每月总费用", value: formatCurrency(monthlyFee) }] : []),
    ...(packageMode === "不限时按量" ? [{ label: "折扣", value: formatDiscount(discount) }] : []),
    { label: "计费模式", value: billingMode },
    { label: "状态", value: status },
    { label: "创建时间", value: record.createdAt },
    { label: "最近更新时间", value: record.updatedAt },
  ];

  return (
    <DetailDialogShell title="产品详情" subtitle={name} onClose={onClose} onEdit={() => onEdit(record)}>
      {fields.map((field) => (
        <DetailField key={field.label} label={field.label} value={field.value} />
      ))}
    </DetailDialogShell>
  );
}

interface ProductModelFormRow {
  id: string;
  modelNames: string[];
  inputPrice: number;
  outputPrice: number;
  cachePrice: number;
  tokenLimitM: string;
  billingMode: string;
}

function ProductFormBody({
  draft,
  fields,
  modelOptions,
  setDraft,
}: {
  draft: Record<string, string | number>;
  fields: FieldConfig[];
  modelOptions: string[];
  setDraft: React.Dispatch<React.SetStateAction<Record<string, string | number>>>;
}) {
  const fieldMap = React.useMemo(() => Object.fromEntries(fields.map((field) => [String(field.key), field])), [fields]);
  const [modelRows, setModelRows] = React.useState<ProductModelFormRow[]>(() => buildProductModelRows(draft, modelOptions));
  const packageMode = String(draft.packageMode || "按量包月");

  React.useEffect(() => {
    setModelRows(buildProductModelRows(draft, modelOptions));
  }, [draft.id, modelOptions]);

  function updateDraftValue(key: string, value: string | number) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function syncRows(nextRows: ProductModelFormRow[]) {
    setModelRows(nextRows);
    const firstRow = nextRows[0];
    setDraft((current) => ({
      ...current,
      relatedModels: unique(nextRows.flatMap((row) => row.modelNames).filter(Boolean)).join(","),
      modelConfigs: JSON.stringify(nextRows.map(({ id: _id, ...row }) => row)),
      inputPrice: firstRow?.inputPrice ?? current.inputPrice ?? 0,
      outputPrice: firstRow?.outputPrice ?? current.outputPrice ?? 0,
      cachePrice: firstRow?.cachePrice ?? current.cachePrice ?? 0,
      tokenLimitM: firstRow?.tokenLimitM ?? current.tokenLimitM ?? "不限",
      billingMode: firstRow?.billingMode ?? current.billingMode ?? "按量",
    }));
  }

  function updateRow(rowId: string, patch: Partial<ProductModelFormRow>) {
    syncRows(modelRows.map((row) => (row.id === rowId ? { ...row, ...patch } : row)));
  }

  function addRow() {
    const usedModels = modelRows.flatMap((row) => row.modelNames);
    const unusedModel = modelOptions.find((model) => !usedModels.includes(model)) ?? modelOptions[0] ?? "";
    syncRows([
      ...modelRows,
      {
        id: `row-${Date.now()}`,
        modelNames: unusedModel ? [unusedModel] : [],
        inputPrice: Number(draft.inputPrice || 0),
        outputPrice: Number(draft.outputPrice || 0),
        cachePrice: Number(draft.cachePrice || 0),
        tokenLimitM: String(draft.tokenLimitM || "不限"),
        billingMode: String(draft.billingMode || "按量"),
      },
    ]);
  }

  function removeRow(rowId: string) {
    if (modelRows.length <= 1) {
      return;
    }

    syncRows(modelRows.filter((row) => row.id !== rowId));
  }

  return (
    <div className="space-y-7">
      <FormSection title="基础信息">
        <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
          <FormControlLabel field={fieldMap.name} label="产品名称">
            <FieldInput field={fieldMap.name} value={draft.name ?? ""} onChange={(value) => updateDraftValue("name", value)} />
          </FormControlLabel>
          <FormControlLabel field={fieldMap.packageMode} label="套餐模式">
            <FieldInput field={fieldMap.packageMode} value={draft.packageMode ?? "按量包月"} onChange={(value) => updateDraftValue("packageMode", value)} />
          </FormControlLabel>
          <div className="md:col-span-2">
            <ProductStatusSwitch value={String(draft.status || "上架")} onChange={(value) => updateDraftValue("status", value)} />
          </div>
        </div>
      </FormSection>

      <FormSection title="计费规则配置" aside={`当前模式：${productPackageModeLabel(packageMode)}`}>
        <div className="rounded-lg border border-blue-100 bg-blue-50/30 p-5">
          <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
            {packageMode === "按量包月" ? (
              <>
                <FormControlLabel field={fieldMap.monthlyTokenM} label="月总可用 Token 数（M）">
                  <FieldInput field={fieldMap.monthlyTokenM} value={draft.monthlyTokenM ?? "不限"} onChange={(value) => updateDraftValue("monthlyTokenM", value)} />
                  <p className="text-xs font-medium text-slate-400">套餐内所有关联模型共享此 Token 额度。</p>
                </FormControlLabel>
                <ProductRowInput label="超出后按量折扣（%）" type="number" value={Number(draft.discount || 90)} suffix="%" onChange={(value) => updateDraftValue("discount", Number(value || 0))} />
              </>
            ) : null}
            {packageMode === "按金额包月" ? (
              <FormControlLabel field={fieldMap.monthlyFee} label="每月总费用（¥）">
                <FieldInput field={fieldMap.monthlyFee} value={draft.monthlyFee ?? 0} onChange={(value) => updateDraftValue("monthlyFee", value)} />
              </FormControlLabel>
            ) : null}
            {packageMode === "不限时按量" ? (
              <ProductRowInput label="按量折扣（%）" type="number" value={Number(draft.discount || 90)} suffix="%" onChange={(value) => updateDraftValue("discount", Number(value || 0))} />
            ) : null}
            {packageMode === "不限时包量" ? (
              <FormControlLabel field={fieldMap.tokenLimitM} label="总可用 Token 数（M）">
                <FieldInput field={fieldMap.tokenLimitM} value={draft.tokenLimitM ?? "不限"} onChange={(value) => updateDraftValue("tokenLimitM", value)} />
                <p className="text-xs font-medium text-slate-400">未填写则表示不限制。</p>
              </FormControlLabel>
            ) : null}
          </div>
        </div>
      </FormSection>

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <ProductSectionTitle title="关联模型列表" />
          </div>
          <Button className="h-9 px-4" type="button" variant="primary" onClick={addRow}>
            <Plus className="size-4" />
            添加
          </Button>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-full">
            <div className="grid min-w-[860px] grid-cols-[minmax(200px,1.3fr)_112px_118px_118px_118px_140px_48px] gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
              <div>基础模型 <span className="text-rose-500">*</span></div>
              <div>计费模式 <span className="text-rose-500">*</span></div>
              <div>输入价格（¥）<span className="text-rose-500">*</span></div>
              <div>输出价格（¥）<span className="text-rose-500">*</span></div>
              <div>缓存价格（¥）</div>
              <div>独立额度限制（M）</div>
              <div className="text-center">操作</div>
            </div>
            <div className="space-y-3 p-4">
          {modelRows.map((row, index) => (
            <div key={row.id} className="grid min-w-[860px] grid-cols-[minmax(200px,1.3fr)_112px_118px_118px_118px_140px_48px] items-start gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm shadow-slate-100">
                <label className="space-y-2">
                  <span className="sr-only">基础模型 {index + 1}</span>
                  <ProductModelMultiSelect
                    options={modelOptions}
                    value={row.modelNames}
                    onChange={(value) => updateRow(row.id, { modelNames: value })}
                  />
                </label>
                <label>
                  <span className="sr-only">计费模式</span>
                  <Select
                    className="h-11 rounded-lg bg-white pl-3 text-sm focus:border-[#1155ff] focus:bg-white focus:ring-blue-100"
                    value={row.billingMode}
                    onChange={(event) => updateRow(row.id, { billingMode: event.target.value })}
                  >
                    <option value="按量">按量</option>
                    <option value="套餐">套餐</option>
                  </Select>
                </label>
                <ProductRowInput label="输入价格" compact type="number" value={row.inputPrice} prefix="¥" onChange={(value) => updateRow(row.id, { inputPrice: Number(value || 0) })} />
                <ProductRowInput label="输出价格" compact type="number" value={row.outputPrice} prefix="¥" onChange={(value) => updateRow(row.id, { outputPrice: Number(value || 0) })} />
                <ProductRowInput label="缓存价格" compact type="number" value={row.cachePrice} prefix="¥" onChange={(value) => updateRow(row.id, { cachePrice: Number(value || 0) })} />
                <ProductRowInput label="独立额度限制" compact value={row.tokenLimitM} placeholder="默认不限" onChange={(value) => updateRow(row.id, { tokenLimitM: value || "不限" })} />
                <button
                  className="flex size-11 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={modelRows.length <= 1}
                  onClick={() => removeRow(row.id)}
                  type="button"
                  aria-label="移除模型配置"
                >
                  <Trash2 className="size-4" />
                </button>
            </div>
          ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function FormSection({ title, children, aside }: { title: string; children: React.ReactNode; aside?: string }) {
  return (
    <section className="space-y-4">
      <ProductSectionTitle title={title} aside={aside} />
      {children}
    </section>
  );
}

function ProductSectionTitle({ title, aside }: { title: string; aside?: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
      <span className="h-5 w-1 rounded-full bg-[#1155ff]" />
      <h4 className="text-base font-semibold text-slate-950">{title}</h4>
      {aside ? <span className="text-xs font-semibold text-slate-400">{aside}</span> : null}
    </div>
  );
}

function FormControlLabel({ field, children, className = "", label }: { field?: FieldConfig; children: React.ReactNode; className?: string; label?: string }) {
  if (!field) {
    return null;
  }

  return (
    <label className={`space-y-2 ${className}`}>
      <span className="block text-sm font-semibold text-slate-600">
        {label ?? field.label}
        {field.required ? <span className="ml-1 text-rose-500">*</span> : null}
      </span>
      {children}
    </label>
  );
}

function ProductStatusSwitch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const active = value === "上架";

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 bg-slate-50/70 px-5 py-4">
      <div>
        <div className="text-sm font-semibold text-slate-800">产品上架状态</div>
        <p className="mt-1 text-sm text-slate-400">控制此产品是否在用户端产品大厅中可见和可购买。</p>
      </div>
      <button
        aria-pressed={active}
        className="inline-flex shrink-0 items-center gap-3 rounded-full px-1 py-1 text-sm font-semibold text-[#1155ff]"
        onClick={() => onChange(active ? "下架" : "上架")}
        type="button"
      >
        <span>{active ? "已上架" : "已下架"}</span>
        <span className={`relative h-7 w-12 rounded-full transition-colors ${active ? "bg-[#2f80ed]" : "bg-slate-300"}`}>
          <span className={`absolute left-1 top-1 size-5 rounded-full bg-white shadow transition-transform ${active ? "translate-x-5" : "translate-x-0"}`} />
        </span>
      </button>
    </div>
  );
}

function ProductRowInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  compact = false,
  prefix,
  suffix,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "number";
  compact?: boolean;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <label className={compact ? "block" : "space-y-2"}>
      <span className={compact ? "sr-only" : "block text-sm font-semibold text-slate-600"}>{label}</span>
      <span className="relative block">
        {prefix ? <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">{prefix}</span> : null}
        <Input
          className={`h-11 rounded-lg bg-white focus:border-[#1155ff] focus:bg-white focus:ring-blue-100 ${prefix ? "pl-8" : "px-4"} ${suffix ? "pr-9" : ""}`}
          type={type}
          value={String(value)}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
        {suffix ? <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">{suffix}</span> : null}
      </span>
    </label>
  );
}

function productPackageModeLabel(packageMode: string) {
  if (packageMode === "按量包月") return "按量包月";
  if (packageMode === "按金额包月") return "按金额包月";
  if (packageMode === "不限时包量") return "不限时包量";
  if (packageMode === "不限时按量") return "不限时按量";
  return packageMode || "-";
}

function ProductModelMultiSelect({ options, value, onChange }: { options: string[]; value: string[]; onChange: (value: string[]) => void }) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const display = value.length === 0 ? "请选择关联模型" : value.length === 1 ? value[0] : `已选 ${value.length} 个模型`;

  React.useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  function toggleOption(option: string) {
    onChange(value.includes(option) ? value.filter((item) => item !== option) : [...value, option]);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2 text-left text-sm text-slate-700 outline-none transition hover:border-slate-300 focus:border-[#1155ff] focus:bg-white focus:ring-2 focus:ring-blue-100"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className={value.length === 0 ? "text-slate-400" : "truncate"}>{display}</span>
        <ChevronDown className={`size-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {value.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {value.map((model) => (
            <span key={model} className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[#1155ff]">
              <Cpu className="size-3.5 shrink-0" />
              <span className="truncate">{model}</span>
            </span>
          ))}
        </div>
      ) : null}
      {open ? (
        <div className="absolute left-0 top-12 z-40 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/70" role="listbox">
          {options.length === 0 ? <div className="px-3 py-2 text-sm text-slate-400">暂无可选模型</div> : null}
          {options.map((option) => {
            const checked = value.includes(option);
            return (
              <button
                key={option}
                aria-selected={checked}
                className={`flex h-9 w-full cursor-pointer items-center gap-2 rounded px-2.5 text-left text-sm transition-colors ${checked ? "bg-blue-50 text-[#1155ff]" : "text-slate-700 hover:bg-slate-50"}`}
                onClick={() => toggleOption(option)}
                role="option"
                type="button"
              >
                <span className={`flex size-4 items-center justify-center rounded border ${checked ? "border-[#1155ff] bg-[#1155ff] text-white" : "border-slate-300"}`}>
                  {checked ? <Check className="size-3" /> : null}
                </span>
                <span className="truncate">{option}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function buildProductModelRows(draft: Record<string, string | number>, modelOptions: string[]): ProductModelFormRow[] {
  const modelConfigs = parseProductModelConfigs(String(draft.modelConfigs ?? ""));
  if (modelConfigs.length > 0) {
    return modelConfigs.map((row, index) => ({
      id: `row-${index}-${row.modelNames.join("-") || "model"}`,
      modelNames: row.modelNames.length > 0 ? row.modelNames : (modelOptions[0] ? [modelOptions[0]] : []),
      inputPrice: Number(row.inputPrice || 0),
      outputPrice: Number(row.outputPrice || 0),
      cachePrice: Number(row.cachePrice || 0),
      tokenLimitM: row.tokenLimitM || "不限",
      billingMode: row.billingMode || "按量",
    }));
  }

  const relatedModels = String(draft.relatedModels || modelOptions[0] || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const models = relatedModels.length > 0 ? relatedModels : [modelOptions[0] || ""];

  return models.map((modelName, index) => ({
    id: `row-${index}-${modelName || "model"}`,
    modelNames: modelName ? [modelName] : [],
    inputPrice: Number(draft.inputPrice || 0),
    outputPrice: Number(draft.outputPrice || 0),
    cachePrice: Number(draft.cachePrice || 0),
    tokenLimitM: String(draft.tokenLimitM || "不限"),
    billingMode: String(draft.billingMode || "按量"),
  }));
}

function parseProductModelConfigs(value: string) {
  if (!value.trim()) {
    return [] as Array<Omit<ProductModelFormRow, "id">>;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is Partial<Omit<ProductModelFormRow, "id">> => typeof item === "object" && item !== null)
      .map((item) => ({
        modelNames: Array.isArray(item.modelNames)
          ? item.modelNames.map((model) => String(model)).filter(Boolean)
          : String((item as { modelName?: unknown }).modelName ?? "").split(",").map((model) => model.trim()).filter(Boolean),
        inputPrice: Number(item.inputPrice ?? 0),
        outputPrice: Number(item.outputPrice ?? 0),
        cachePrice: Number(item.cachePrice ?? 0),
        tokenLimitM: String(item.tokenLimitM ?? "不限"),
        billingMode: String(item.billingMode ?? "按量"),
      }));
  } catch {
    return [];
  }
}

function UsageLogDetailDialog({ record, onClose }: { record: BaseRecord; onClose: () => void }) {
  const taskId = String(getRecordValue(record, "taskId") ?? "-");
  const requestPayload = getUsageLogPayload(record, "request");
  const responsePayload = getUsageLogPayload(record, "response");
  const fields = [
    { label: "任务ID", value: taskId },
    { label: "请求时间", value: getRecordValue(record, "requestedAt") },
    { label: "结束时间", value: getRecordValue(record, "finishedAt") },
    { label: "总耗时（ms）", value: getRecordValue(record, "durationMs") },
    { label: "客户名称", value: getRecordValue(record, "customerName") },
    { label: "模型", value: getRecordValue(record, "modelName") },
    { label: "状态码", value: getRecordValue(record, "statusCode") },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-8 backdrop-blur-sm" role="presentation" onMouseDown={onClose}>
      <section
        aria-modal="true"
        className="max-h-[calc(100vh-64px)] w-full max-w-6xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-6 border-b border-slate-100 px-7 py-6">
          <div>
            <h3 className="text-xl font-semibold text-slate-950">日志详情</h3>
            <p className="mt-2 text-sm text-slate-500">{taskId}</p>
          </div>
          <button
            aria-label="关闭弹窗"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            onClick={onClose}
            type="button"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="max-h-[calc(100vh-220px)] overflow-y-auto px-7 py-6">
          <div className="grid gap-4 md:grid-cols-4">
            {fields.map((field) => (
              <DetailField key={field.label} label={field.label} value={String(field.value ?? "-")} />
            ))}
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <JsonCodeBlock title="请求内容" value={requestPayload} />
            <JsonCodeBlock title="响应内容" value={responsePayload} />
          </div>
        </div>
        <div className="flex justify-end border-t border-slate-100 bg-slate-50/70 px-7 py-5">
          <Button className="h-10 px-5" type="button" variant="secondary" onClick={onClose}>
            关闭
          </Button>
        </div>
      </section>
    </div>
  );
}

function ContractDetailDialog({ record, onClose, onEdit }: { record: BaseRecord; onClose: () => void; onEdit: (record: BaseRecord) => void }) {
  const contractNo = String(getRecordValue(record, "contractNo") ?? "-");
  const fields = [
    { label: "订单号", value: contractNo },
    { label: "客户名称", value: getRecordValue(record, "customerName") },
    { label: "产品名称", value: getRecordValue(record, "productName") },
    { label: "产品信息", value: getRecordValue(record, "productInfo") },
    { label: "每日限额", value: formatUnlimited(getRecordValue(record, "dailyLimit")) },
    { label: "过期时间", value: formatUnlimited(getRecordValue(record, "expiresAt")) },
    { label: "状态", value: getRecordValue(record, "status") },
    { label: "创建时间", value: record.createdAt },
  ];

  return (
    <DetailDialogShell title="合同详情" subtitle={contractNo} onClose={onClose} onEdit={() => onEdit(record)} editLabel="编辑状态">
      {fields.map((field) => (
        <DetailField key={field.label} label={field.label} value={String(field.value ?? "-")} />
      ))}
    </DetailDialogShell>
  );
}

function BillDetailDialog({ data, record, onClose }: { data: DealerData; record: BaseRecord; onClose: () => void }) {
  const customerName = String(getRecordValue(record, "customerName") ?? "-");
  const period = String(getRecordValue(record, "period") ?? "-");
  const details = buildBillDetailRows(data, record);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-8 backdrop-blur-sm" role="presentation" onMouseDown={onClose}>
      <section
        aria-modal="true"
        className="max-h-[calc(100vh-64px)] w-full max-w-6xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-6 border-b border-slate-100 px-7 py-6">
          <div>
            <h3 className="text-xl font-semibold text-slate-950">账单明细</h3>
            <p className="mt-2 text-sm text-slate-500">{customerName} · {period}</p>
          </div>
          <button
            aria-label="关闭弹窗"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            onClick={onClose}
            type="button"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="max-h-[calc(100vh-220px)] overflow-auto px-7 py-6">
          <table className="min-w-full border-separate border-spacing-0 text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                {["时间", "调用模型", "输入Token", "输入价格", "输出Token", "输出价格", "消费金额"].map((label) => (
                  <th key={label} className="h-11 whitespace-nowrap border-b border-slate-200 px-4 font-medium">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {details.map((detail) => (
                <tr key={`${detail.time}-${detail.modelName}`} className="hover:bg-slate-50/70">
                  <td className="border-b border-slate-100 px-4 py-3 text-slate-700">{detail.time}</td>
                  <td className="border-b border-slate-100 px-4 py-3 text-slate-700">{detail.modelName}</td>
                  <td className="border-b border-slate-100 px-4 py-3 text-slate-700">{formatLargeNumber(detail.inputTokens)}</td>
                  <td className="border-b border-slate-100 px-4 py-3 text-slate-700">{formatCurrency(detail.inputPrice)}/1M</td>
                  <td className="border-b border-slate-100 px-4 py-3 text-slate-700">{formatLargeNumber(detail.outputTokens)}</td>
                  <td className="border-b border-slate-100 px-4 py-3 text-slate-700">{formatCurrency(detail.outputPrice)}/1M</td>
                  <td className="border-b border-slate-100 px-4 py-3 font-semibold text-slate-900">{formatCurrency(detail.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end border-t border-slate-100 bg-slate-50/70 px-7 py-5">
          <Button className="h-10 px-5" type="button" variant="secondary" onClick={onClose}>
            关闭
          </Button>
        </div>
      </section>
    </div>
  );
}

function JsonCodeBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <section className="overflow-hidden rounded-md border border-slate-200 bg-slate-50">
      <div className="border-b border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">{title}</div>
      <pre className="max-h-[420px] overflow-auto p-4 text-xs leading-6 text-slate-700">
        <code>{formatJsonPayload(value)}</code>
      </pre>
    </section>
  );
}

function DetailDialogShell({ title, subtitle, children, onClose, onEdit, editLabel = "编辑" }: { title: string; subtitle: string; children: React.ReactNode; onClose: () => void; onEdit: () => void; editLabel?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-8 backdrop-blur-sm" role="presentation" onMouseDown={onClose}>
      <section
        aria-modal="true"
        className="max-h-[calc(100vh-64px)] w-full max-w-3xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-6 border-b border-slate-100 px-7 py-6">
          <div>
            <h3 className="text-xl font-semibold text-slate-950">{title}</h3>
            <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
          </div>
          <button
            aria-label="关闭弹窗"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            onClick={onClose}
            type="button"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="max-h-[calc(100vh-240px)] overflow-y-auto px-7 py-6">
          <div className="grid gap-4 md:grid-cols-2">{children}</div>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/70 px-7 py-5">
          <Button className="h-10 px-5" type="button" variant="secondary" onClick={onClose}>
            关闭
          </Button>
          <Button className="h-10 px-6" type="button" variant="primary" onClick={onEdit}>
            <Edit3 className="size-4" />
            {editLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-slate-100 bg-slate-50 px-4 py-3">
      <div className="text-xs font-medium text-slate-400">{label}</div>
      <div className="mt-1 break-words text-sm font-semibold text-slate-800">{value}</div>
    </div>
  );
}

function ProductCardStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="truncate text-xs font-semibold text-slate-400">{label}</div>
      <div className="mt-1 truncate text-lg font-semibold text-slate-950">{value}</div>
    </div>
  );
}

export function getProductBillingLabel(packageMode: string, billingMode: string) {
  return billingMode === "按量" ? "按量计费" : "套餐计费";
}

export function getProductCardStats(record: BaseRecord) {
  const packageMode = String(getRecordValue(record, "packageMode") ?? "-");
  const tokenLimitM = String(getRecordValue(record, "tokenLimitM") || "不限");
  const monthlyTokenM = String(getRecordValue(record, "monthlyTokenM") || "不限");
  const monthlyFee = Number(getRecordValue(record, "monthlyFee") ?? 0);
  const billingMode = String(getRecordValue(record, "billingMode") ?? "-");

  if (packageMode === "按量包月") {
    return [
      { label: "价格", value: `${formatCurrency(monthlyFee)} / 月` },
      { label: "总额度（M Tokens）", value: monthlyTokenM },
    ];
  }

  if (packageMode === "按金额包月") {
    return [
      { label: "价格", value: `${formatCurrency(monthlyFee)} / 月` },
      { label: "总额度（M Tokens）", value: tokenLimitM },
    ];
  }

  if (packageMode === "不限时按量") {
    return [
      { label: "价格", value: billingMode === "按量" ? "按大模型售价" : `${formatCurrency(Number(getRecordValue(record, "inputPrice") ?? 0))}/1M` },
      { label: "总额度（Tokens）", value: tokenLimitM },
    ];
  }

  return [
    { label: "输入价格", value: `${formatCurrency(Number(getRecordValue(record, "inputPrice") ?? 0))}/1M` },
    { label: "总额度（M Tokens）", value: tokenLimitM },
  ];
}

function FieldInput({ field, value, onChange, disabled = false }: { field: FieldConfig; value: string | number; onChange: (value: string | number) => void; disabled?: boolean }) {
  if (field.key === "abilities") {
    return <TagInput value={String(value)} onChange={onChange} placeholder="输入标签名称" />;
  }

  if (field.kind === "searchableSelect") {
    const listId = `field-options-${field.key}`;
    return (
      <>
        <Input
          className="h-11 rounded-lg bg-slate-50/70 px-4 focus:border-[#1155ff] focus:bg-white focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          disabled={disabled}
          list={listId}
          placeholder={field.placeholder ?? "可输入关键词检索"}
          value={String(value)}
          onChange={(event) => onChange(event.target.value)}
          required={field.required}
        />
        <datalist id={listId}>
          {(field.options ?? []).map((option) => <option key={option} value={option} />)}
        </datalist>
      </>
    );
  }

  if (field.kind === "radio") {
    return (
      <div className="flex h-11 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/70 px-3">
        {(field.options ?? []).map((option) => (
          <label key={option} className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
            <input
              checked={String(value) === option}
              className="size-4 accent-[#1155ff]"
              disabled={disabled}
              name={field.key}
              onChange={() => onChange(option)}
              type="radio"
            />
            {option}
          </label>
        ))}
      </div>
    );
  }

  if (field.kind === "select") {
    return (
      <Select
        className="h-11 rounded-lg bg-slate-50/70 pl-4 focus:border-[#1155ff] focus:bg-white focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
        disabled={disabled}
        value={String(value)}
        onChange={(event) => onChange(event.target.value)}
        required={field.required}
      >
        {(field.options ?? []).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </Select>
    );
  }

  if (field.kind === "multiSelect") {
    return <MultiSelectInput field={field} value={String(value)} onChange={onChange} />;
  }

  if (field.kind === "permissionMatrix") {
    return <PermissionMatrixInput value={String(value)} onChange={onChange} />;
  }

  if (field.kind === "textarea") {
    return (
      <textarea
        className="min-h-28 w-full rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#1155ff] focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
        disabled={disabled}
        value={String(value)}
        onChange={(event) => onChange(event.target.value)}
        placeholder={field.placeholder}
        required={field.required}
      />
    );
  }

  if (field.kind === "datetime" || field.kind === "month") {
    return (
      <DatePickerField
        disabled={disabled}
        mode={field.kind}
        placeholder={field.placeholder ?? field.label}
        value={String(value)}
        onChange={onChange}
      />
    );
  }

  return (
    <Input
      className="h-11 rounded-lg bg-slate-50/70 px-4 focus:border-[#1155ff] focus:bg-white focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
      disabled={disabled}
      type={field.kind === "number" ? "number" : "text"}
      value={String(value)}
      onChange={(event) => onChange(field.kind === "number" ? Number(event.target.value) : event.target.value)}
      placeholder={field.placeholder}
      required={field.required}
    />
  );
}

function FilterMultiSelect({ label, options, value, onChange }: { label: string; options: string[]; value: string[]; onChange: (value: string[]) => void }) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const display = value.length === 0 ? label : `${label}(${value.length})`;

  React.useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  function toggleOption(option: string) {
    onChange(value.includes(option) ? value.filter((item) => item !== option) : [...value, option]);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        aria-expanded={open}
        className="flex h-9 min-w-36 items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:border-slate-300"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className={value.length === 0 ? "text-slate-400" : "text-slate-700"}>{display}</span>
        <ChevronDown className={`size-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="absolute left-0 top-10 z-40 min-w-44 rounded-md border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/70">
          {options.map((option) => {
            const checked = value.includes(option);
            return (
              <button
                key={option}
                className={`flex h-9 w-full items-center gap-2 rounded px-2.5 text-left text-sm transition ${checked ? "bg-blue-50 text-[#1155ff]" : "text-slate-600 hover:bg-slate-50"}`}
                onClick={() => toggleOption(option)}
                type="button"
              >
                <span className={`flex size-4 items-center justify-center rounded border ${checked ? "border-[#1155ff] bg-[#1155ff] text-white" : "border-slate-300"}`}>
                  {checked ? <Check className="size-3" /> : null}
                </span>
                {option}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function TagInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  const [draft, setDraft] = React.useState("");
  const tags = value.split(",").map((item) => item.trim()).filter(Boolean);

  function commitTags(nextTags: string[]) {
    onChange([...new Set(nextTags)].join(","));
  }

  function addTag() {
    const nextTag = draft.trim();
    if (!nextTag) return;
    commitTags([...tags, nextTag]);
    setDraft("");
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 transition focus-within:border-[#1155ff] focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100">
      <div className="flex min-h-8 flex-wrap gap-2">
        {tags.length === 0 ? <span className="text-sm text-slate-400">暂无标签</span> : null}
        {tags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-sm font-medium text-[#1155ff]">
            {tag}
            <button className="text-blue-300 hover:text-[#1155ff]" onClick={() => commitTags(tags.filter((item) => item !== tag))} type="button">
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <Input
          className="h-9 flex-1 rounded-md bg-white px-3 focus:border-[#1155ff] focus:ring-blue-100"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addTag();
            }
          }}
          placeholder={placeholder}
        />
        <Button className="h-9" type="button" variant="secondary" onClick={addTag}>
          <Plus className="size-4" />
          添加
        </Button>
      </div>
    </div>
  );
}

const permissionModules = [
  { key: "dashboard", label: "看板", actions: ["访问", "查看"] },
  { key: "models", label: "模型管理", actions: ["访问", "查看", "新增", "编辑", "删除"] },
  { key: "customers", label: "客户管理", actions: ["访问", "查看", "新增", "编辑", "删除", "导出"] },
  { key: "reports", label: "客户报表", actions: ["访问", "查看", "导出"] },
  { key: "finance", label: "财务管理", actions: ["访问", "查看", "新增", "编辑", "删除", "导出"] },
  { key: "team", label: "团队管理", actions: ["访问", "查看", "新增", "编辑", "删除"] },
  { key: "profile", label: "个人中心", actions: ["访问", "查看", "编辑"] },
];

function PermissionMatrixInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const permissionMap = React.useMemo(() => parsePermissionValue(value), [value]);

  function updateModule(moduleKey: string, moduleLabel: string, action: string, checked: boolean) {
    const currentActions = new Set(permissionMap[moduleKey]?.actions ?? []);
    if (checked) {
      currentActions.add(action);
      if (action !== "访问") currentActions.add("访问");
    } else {
      currentActions.delete(action);
      if (action === "访问") currentActions.clear();
    }

    commitPermissions({
      ...permissionMap,
      [moduleKey]: { moduleKey, moduleLabel, actions: [...currentActions] },
    });
  }

  function setModuleAll(moduleKey: string, moduleLabel: string, actions: string[], checked: boolean) {
    commitPermissions({
      ...permissionMap,
      [moduleKey]: { moduleKey, moduleLabel, actions: checked ? actions : [] },
    });
  }

  function commitPermissions(nextMap: Record<string, { moduleKey: string; moduleLabel: string; actions: string[] }>) {
    const nextPermissions = permissionModules
      .map((item) => nextMap[item.key])
      .filter((item) => item && item.actions.length > 0)
      .map((item) => ({
        ...item,
        actions: item.actions.sort((left, right) => permissionActionOrder(left) - permissionActionOrder(right)),
      }));

    onChange(JSON.stringify(nextPermissions));
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="grid grid-cols-[150px_1fr] border-b border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
        <span>功能模块</span>
        <span>操作权限</span>
      </div>
      <div className="divide-y divide-slate-100">
        {permissionModules.map((module) => {
          const selectedActions = new Set(permissionMap[module.key]?.actions ?? []);
          const allChecked = module.actions.every((action) => selectedActions.has(action));
          return (
            <div key={module.key} className="grid grid-cols-[150px_1fr] gap-4 px-4 py-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  checked={allChecked}
                  className="size-4 accent-[#1155ff]"
                  onChange={(event) => setModuleAll(module.key, module.label, module.actions, event.target.checked)}
                  type="checkbox"
                />
                {module.label}
              </label>
              <div className="flex flex-wrap gap-2">
                {module.actions.map((action) => {
                  const checked = selectedActions.has(action);
                  return (
                    <label
                      key={action}
                      className={`flex h-8 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm transition-colors ${checked ? "border-blue-100 bg-blue-50 text-[#1155ff]" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"}`}
                    >
                      <input
                        checked={checked}
                        className="size-3.5 accent-[#1155ff]"
                        onChange={(event) => updateModule(module.key, module.label, action, event.target.checked)}
                        type="checkbox"
                      />
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

function parsePermissionValue(value: string): Record<string, { moduleKey: string; moduleLabel: string; actions: string[] }> {
  if (!value.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return {};
    }

    return parsed.reduce<Record<string, { moduleKey: string; moduleLabel: string; actions: string[] }>>((result, item) => {
      if (
        typeof item === "object"
        && item !== null
        && "moduleKey" in item
        && "moduleLabel" in item
        && "actions" in item
        && Array.isArray((item as { actions?: unknown }).actions)
      ) {
        const permission = item as { moduleKey: string; moduleLabel: string; actions: string[] };
        result[permission.moduleKey] = permission;
      }

      return result;
    }, {});
  } catch {
    const legacyLabels = value.split(",").map((item) => item.trim()).filter(Boolean);
    return permissionModules.reduce<Record<string, { moduleKey: string; moduleLabel: string; actions: string[] }>>((result, module) => {
      if (legacyLabels.some((label) => label.includes(module.label) || module.label.includes(label.split("-")[0] ?? ""))) {
        result[module.key] = { moduleKey: module.key, moduleLabel: module.label, actions: ["访问", "查看"] };
      }

      return result;
    }, {});
  }
}

function permissionActionOrder(action: string) {
  return ["访问", "查看", "新增", "编辑", "删除", "导出"].indexOf(action);
}

function MultiSelectInput({ field, value, onChange }: { field: FieldConfig; value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const selectedValues = value.split(",").map((item) => item.trim()).filter(Boolean);
  const display = selectedValues.length === 0 ? "请选择" : selectedValues.length === 1 ? selectedValues[0] : `已选 ${selectedValues.length} 项`;

  React.useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  function toggleOption(option: string) {
    const nextValues = selectedValues.includes(option)
      ? selectedValues.filter((item) => item !== option)
      : [...selectedValues, option];

    onChange(nextValues.join(","));
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        aria-expanded={open}
        className="flex h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/70 px-4 text-left text-sm text-slate-700 outline-none transition hover:border-slate-300 focus:border-[#1155ff] focus:bg-white focus:ring-2 focus:ring-blue-100"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className={selectedValues.length === 0 ? "text-slate-400" : "truncate"}>{display}</span>
        <ChevronDown className={`size-4 shrink-0 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="absolute left-0 top-12 z-40 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/70">
          {(field.options ?? []).length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-400">暂无可选数据</div>
          ) : null}
          {(field.options ?? []).map((option) => {
            const checked = selectedValues.includes(option);
            return (
              <button
                key={option}
                className={`flex h-9 w-full cursor-pointer items-center gap-2 rounded px-2.5 text-left text-sm transition-colors ${checked ? "bg-blue-50 text-[#1155ff]" : "text-slate-700 hover:bg-slate-50"}`}
                onClick={() => toggleOption(option)}
                type="button"
              >
                <span className={`flex size-4 items-center justify-center rounded border ${checked ? "border-[#1155ff] bg-[#1155ff] text-white" : "border-slate-300"}`}>
                  {checked ? <Check className="size-3" /> : null}
                </span>
                <span className="truncate">{option}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function FilterSelectField({ ariaLabel, className, value, options, placeholder, onChange }: { ariaLabel: string; className?: string; value: string; options: string[]; placeholder: string; onChange: (value: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const display = value || placeholder;

  React.useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return (
    <div ref={rootRef} className={`relative shrink-0 ${className ?? ""}`}>
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className="flex h-full w-full cursor-pointer items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50/70 px-3 text-left text-sm font-medium text-slate-700 outline-none transition-colors hover:border-slate-300 focus:border-[#1155ff] focus:bg-white focus:ring-2 focus:ring-blue-100"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className={!value ? "text-slate-500" : "truncate"}>{display}</span>
        <ChevronDown className={`size-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="absolute left-0 top-11 z-40 max-h-60 w-full overflow-auto rounded-md border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/70" role="listbox">
          {options.map((option) => {
            const label = option || placeholder;
            const checked = option === value;
            return (
              <button
                key={label}
                className={`flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded px-2.5 text-left text-sm transition-colors ${checked ? "bg-blue-50 text-[#1155ff]" : "text-slate-700 hover:bg-slate-50"}`}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
                role="option"
                aria-selected={checked}
                type="button"
              >
                <span className="truncate">{label}</span>
                {checked ? <Check className="size-3.5 shrink-0" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function ExpiryShortcutButtons({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const shortcuts = [
    { label: "永不过期", value: "" },
    { label: "一年", value: "year" },
    { label: "一个月", value: "month" },
    { label: "一天", value: "day" },
    { label: "一小时", value: "hour" },
  ];

  function applyShortcut(shortcut: string) {
    if (!shortcut) {
      onChange("");
      return;
    }

    const date = new Date();
    if (shortcut === "year") date.setFullYear(date.getFullYear() + 1);
    if (shortcut === "month") date.setMonth(date.getMonth() + 1);
    if (shortcut === "day") date.setDate(date.getDate() + 1);
    if (shortcut === "hour") date.setHours(date.getHours() + 1);
    onChange(formatDateTimeWithSeconds(date));
  }

  return (
    <div className="flex flex-wrap gap-2">
      {shortcuts.map((shortcut) => (
        <button
          key={shortcut.label}
          className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${(!value && !shortcut.value) ? "bg-blue-50 text-[#1155ff]" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
          onClick={() => applyShortcut(shortcut.value)}
          type="button"
        >
          {shortcut.label}
        </button>
      ))}
    </div>
  );
}

function DatePickerField({
  mode,
  placeholder,
  value,
  onChange,
  className = "",
  disabled = false,
}: {
  mode: "datetime" | "month";
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}) {
  const inputType = mode === "datetime" ? "datetime-local" : "month";
  const inputValue = mode === "datetime" ? toDateTimeInputValue(value) : value;
  const shellClassName = className || "h-11 rounded-lg";

  function handleChange(nextValue: string) {
    onChange(mode === "datetime" ? fromDateTimeInputValue(nextValue) : nextValue);
  }

  return (
    <label className={["relative flex items-center border border-slate-200 bg-slate-50/70 text-sm transition-colors focus-within:border-[#1155ff] focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100", shellClassName].join(" ")}>
      <CalendarDays className="pointer-events-none absolute left-4 size-4 text-slate-400" />
      {!inputValue ? <span className="pointer-events-none absolute left-10 text-slate-400">{placeholder}</span> : null}
      <input
        aria-label={placeholder}
        disabled={disabled}
        className={[
          "h-full w-full cursor-pointer bg-transparent pl-10 pr-4 outline-none disabled:cursor-not-allowed [color-scheme:light]",
          inputValue ? "text-slate-700" : "text-transparent focus:text-transparent",
        ].join(" ")}
        step={mode === "datetime" ? 1 : undefined}
        type={inputType}
        value={inputValue}
        onChange={(event) => handleChange(event.target.value)}
      />
    </label>
  );
}

function toDateTimeInputValue(value: string) {
  if (!value) return "";
  return value.includes("T") ? value.slice(0, 19) : value.replace(" ", "T").slice(0, 19);
}

function fromDateTimeInputValue(value: string) {
  return value.replace("T", " ");
}

function formatDateTimeWithSeconds(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-") + ` ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;
}

function formatUnlimited(value: unknown) {
  const text = String(value ?? "").trim();
  return text || "不限制";
}

function getCurrentBillPeriod(records: BaseRecord[]) {
  const periods = records.map((record) => String(getRecordValue(record, "period") ?? "")).filter(Boolean).sort();
  return periods.at(-1) ?? "";
}

function buildBillDetailRows(data: DealerData, bill: BaseRecord) {
  const customerName = String(getRecordValue(bill, "customerName") ?? "");
  const period = String(getRecordValue(bill, "period") ?? "");
  const realRows = data.consumptions
    .filter((record) => record.status === "成功" && record.customerName === customerName && record.calledAt.startsWith(period))
    .map((record) => {
      const model = data.models.find((item) => item.name === record.modelName);
      return {
        time: record.calledAt,
        modelName: record.modelName,
        inputTokens: record.inputTokens,
        inputPrice: model?.inputPrice ?? 0,
        outputTokens: record.outputTokens,
        outputPrice: model?.outputPrice ?? 0,
        amount: record.amount,
      };
    });

  if (realRows.length > 0) {
    return realRows;
  }

  const amount = Number(getRecordValue(bill, "amount") ?? 0);
  const models = data.models.filter((model) => model.status === "可用").slice(0, 3);
  const weights = [0.48, 0.34, 0.18];

  return models.map((model, index) => {
    const rowAmount = amount * (weights[index] ?? 0.15);
    const outputPrice = model.outputPrice || model.inputPrice || 1;
    const inputPrice = model.inputPrice || 1;
    const inputTokens = Math.round((rowAmount * 0.42 / inputPrice) * 1_000_000);
    const outputTokens = Math.round((rowAmount * 0.58 / outputPrice) * 1_000_000);
    return {
      time: `${period}-${String(8 + index * 7).padStart(2, "0")} ${String(10 + index).padStart(2, "0")}:30:00`,
      modelName: model.name,
      inputTokens,
      inputPrice,
      outputTokens,
      outputPrice,
      amount: rowAmount,
    };
  });
}

function formatLargeNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(Math.round(value));
}

function buildEmptyDraft(fields: FieldConfig[]): Record<string, string | number> {
  return fields.reduce<Record<string, string | number>>((draft, field) => {
    const key = String(field.key);
    draft[key] = key === "tokenLimitM" || key === "monthlyTokenM" ? "不限" : field.kind === "number" ? 0 : field.kind === "permissionMatrix" ? "[]" : field.options?.[0] ?? "";
    return draft;
  }, {});
}

function resolveVisibleFields(entity: EntityKey, fields: FieldConfig[], draft: Record<string, string | number>) {
  if (entity !== "products") {
    return fields;
  }

  const packageMode = String(draft.packageMode || "按量包月");
  const visibleKeys = new Set([
    "name",
    "packageMode",
    "relatedModels",
    "inputPrice",
    "outputPrice",
    "cachePrice",
    "tokenLimitM",
    "billingMode",
    "status",
  ]);

  if (packageMode === "按量包月") {
    visibleKeys.add("monthlyTokenM");
    visibleKeys.add("monthlyFee");
  }

  if (packageMode === "按金额包月") {
    visibleKeys.add("monthlyFee");
  }

  if (packageMode === "不限时按量") {
    visibleKeys.add("discount");
  }

  return fields.filter((field) => visibleKeys.has(String(field.key)));
}

function formatDiscount(value: number) {
  if (!value) {
    return "-";
  }

  return `${value <= 1 ? Number((value * 10).toFixed(2)) : value} 折`;
}

function recordToDraft(record: BaseRecord, fields: FieldConfig[]): Record<string, string | number> {
  const draft = fields.reduce<Record<string, string | number>>((nextDraft, field) => {
    const value = getRecordValue(record, field.key);
    nextDraft[String(field.key)] = typeof value === "number" ? value : String(value ?? "");
    return nextDraft;
  }, {});

  const modelConfigs = getRecordValue(record, "modelConfigs");
  if (typeof modelConfigs === "string") {
    draft.modelConfigs = modelConfigs;
  }

  return draft;
}

function normalizeDraft(fields: FieldConfig[], draft: Record<string, string | number>) {
  const normalized = fields.reduce<Record<string, string | number>>((nextDraft, field) => {
    const key = String(field.key);
    nextDraft[key] = field.kind === "number" ? Number(draft[key] || 0) : draft[key] ?? "";
    return nextDraft;
  }, {});

  if (typeof draft.modelConfigs === "string") {
    normalized.modelConfigs = draft.modelConfigs;
  }

  return normalized;
}

function resolveFields(fields: FieldConfig[], data: DealerData): FieldConfig[] {
  return fields.map((field) => {
    if (!field.optionSource) {
      return field;
    }

    return {
      ...field,
      options: resolveOptions(field.optionSource, data),
    };
  });
}

function resolveOptions(source: NonNullable<FieldConfig["optionSource"]>, data: DealerData): string[] {
  if (source === "customers") {
    return unique(data.customers.map((customer) => customer.company));
  }

  if (source === "models") {
    return unique(data.models.map((model) => model.name));
  }

  if (source === "products") {
    return unique(data.products.map((product) => product.name));
  }

  if (source === "salesMembers") {
    return unique([
      ...data.members.filter((member) => member.role === "销售").map((member) => member.name),
      ...data.customers.map((customer) => customer.sales),
    ]);
  }

  if (source === "roles") {
    return unique(data.roles.map((role) => role.name));
  }

  return unique(data.apiKeys.map((apiKey) => apiKey.keyName));
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function matchesFilter(record: BaseRecord, key: string, values: string[]) {
  if (values.length === 0) {
    return true;
  }

  return values.includes(String(getRecordValue(record, key) ?? ""));
}

function matchesDateRange(record: BaseRecord, key: string, start: string, end: string) {
  if (!start && !end) {
    return true;
  }

  const value = String(getRecordValue(record, key) ?? "");
  return (!start || value >= start) && (!end || value <= end);
}

function getUsageLogPayload(record: BaseRecord, type: "request" | "response") {
  const key = type === "request" ? "requestPayload" : "responsePayload";
  const payload = getRecordValue(record, key);
  if (typeof payload === "string" && payload.trim() && payload.trim() !== "{}") {
    return payload;
  }

  const taskId = String(getRecordValue(record, "taskId") ?? "task_mock");
  const modelName = String(getRecordValue(record, "modelName") ?? "glm-5.2");
  const statusCode = Number(getRecordValue(record, "statusCode") ?? 200);
  const createdAt = String(getRecordValue(record, "requestedAt") ?? "");

  if (type === "request") {
    return {
      model: modelName,
      messages: [
        {
          role: "system",
          content: "你是编程助手，擅长写简洁高效的代码。",
        },
        {
          role: "user",
          content: "写一个 Python 函数，计算斐波那契数列第 n 项。",
        },
      ],
      stream: false,
      temperature: 1,
      metadata: {
        task_id: taskId,
        customer: getRecordValue(record, "customerName") ?? "杭州星河科技有限公司",
      },
    };
  }

  return {
    id: `chatcmpl_${taskId.replace(/^task_/, "")}`,
    request_id: `req_${taskId}`,
    created: createdAt,
    model: modelName,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: "def fibonacci(n: int) -> int:\\n    if n < 0:\\n        raise ValueError('n must be non-negative')\\n    a, b = 0, 1\\n    for _ in range(n):\\n        a, b = b, a + b\\n    return a",
          reasoning_content: "使用迭代方式避免递归重复计算，时间复杂度 O(n)，空间复杂度 O(1)。",
          tool_calls: [],
        },
        finish_reason: statusCode === 200 ? "stop" : "error",
      },
    ],
    usage: {
      prompt_tokens: 1280,
      completion_tokens: 420,
      prompt_tokens_details: {
        cached_tokens: 256,
      },
      total_tokens: 1700,
    },
    content_filter: [
      {
        role: "assistant",
        level: 0,
      },
    ],
  };
}

function formatJsonPayload(value: unknown) {
  if (typeof value !== "string") {
    return JSON.stringify(value ?? {}, null, 2);
  }

  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value || "{}";
  }
}

function formatCell(value: unknown): React.ReactNode {
  if (typeof value === "number" && value > 1000) {
    return value % 1 === 0 ? value.toLocaleString("zh-CN") : formatCurrency(value);
  }

  return String(value ?? "-");
}

function getRecordValue(record: BaseRecord, key: string): unknown {
  return (record as BaseRecord & Record<string, unknown>)[key];
}

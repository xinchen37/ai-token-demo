import * as React from "react";
import { Bot, CalendarDays, Check, ChevronDown, Clock, Cpu, Download, Edit3, Eye, LayoutGrid, List, Plus, RotateCcw, Search, Trash2, X } from "lucide-react";
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

export function RecordPage({ config, records, data, onCreate, onUpdate, onDelete }: RecordPageProps) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [keywordDraft, setKeywordDraft] = React.useState("");
  const [keyword, setKeyword] = React.useState("");
  const [providerFilter, setProviderFilter] = React.useState<string[]>([]);
  const [typeFilter, setTypeFilter] = React.useState<string[]>([]);
  const [billingFilter, setBillingFilter] = React.useState<string[]>([]);
  const [periodStart, setPeriodStart] = React.useState("");
  const [periodEnd, setPeriodEnd] = React.useState("");
  const [editingRecord, setEditingRecord] = React.useState<BaseRecord | null>(null);
  const [detailRecord, setDetailRecord] = React.useState<BaseRecord | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<"cards" | "table">(config.entity === "models" || config.entity === "products" ? "cards" : "table");
  const [hasHorizontalOverflow, setHasHorizontalOverflow] = React.useState(false);
  const [hasContentOnRight, setHasContentOnRight] = React.useState(false);
  const isProductPage = config.entity === "products";
  const isModelPage = config.entity === "models";
  const supportsCardView = isModelPage || isProductPage;
  const supportsDetailView = isModelPage || isProductPage;
  const isBillsPage = config.entity === "bills";
  const showActions = !config.readOnly;
  const canCreate = showActions && config.entity !== "models";
  const canDelete = showActions && config.entity !== "models" && config.entity !== "products";
  const resolvedFields = React.useMemo(() => resolveFields(config.fields, data), [config.fields, data]);
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
    const keywordMatchedRecords = normalized
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

    if (!isBillsPage || (!periodStart && !periodEnd)) {
      return modelFilteredRecords;
    }

    return modelFilteredRecords.filter((record) => {
      const period = String(getRecordValue(record, "period") ?? "");
      return (!periodStart || period >= periodStart) && (!periodEnd || period <= periodEnd);
    });
  }, [billingFilter, isBillsPage, isModelPage, keyword, periodEnd, periodStart, providerFilter, records, typeFilter]);

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
    setPeriodStart("");
    setPeriodEnd("");
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
      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[260px] flex-1 sm:flex-none">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9 sm:w-72"
                value={keywordDraft}
                onBlur={() => setKeyword(keywordDraft)}
                onChange={(event) => setKeywordDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    setKeyword(keywordDraft);
                    event.currentTarget.blur();
                  }
                }}
                placeholder={config.searchPlaceholder}
              />
            </div>
            {isModelPage ? (
              <>
                <FilterMultiSelect label="供应商" options={unique(records.map((record) => String(getRecordValue(record, "provider") ?? "")).filter(Boolean))} value={providerFilter} onChange={setProviderFilter} />
                <FilterMultiSelect label="模型类型" options={["对话补全", "图像", "文本转语音", "语音转文本", "视频"]} value={typeFilter} onChange={setTypeFilter} />
                <FilterMultiSelect label="计费类型" options={["按量计费", "按次计费"]} value={billingFilter} onChange={setBillingFilter} />
              </>
            ) : null}
            {isBillsPage ? (
              <>
                <DatePickerField className="h-9 rounded-md sm:w-40" mode="month" placeholder="开始账期" value={periodStart} onChange={setPeriodStart} />
                <DatePickerField className="h-9 rounded-md sm:w-40" mode="month" placeholder="结束账期" value={periodEnd} onChange={setPeriodEnd} />
              </>
            ) : null}
            {isModelPage ? (
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
            className="max-h-[calc(100vh-64px)] w-full max-w-4xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <form className="flex max-h-[calc(100vh-64px)] flex-col" onSubmit={handleSubmit}>
              <div className="flex items-start justify-between gap-6 border-b border-slate-100 px-7 py-6">
                <div>
                  <h3 className="text-xl font-semibold text-slate-950">{editingRecord ? `编辑${config.title}` : config.createLabel}</h3>
                  <p className="mt-2 text-sm text-slate-500">{config.description}</p>
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
                <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
                  {visibleFields.map((field) => (
                    <label key={String(field.key)} className={field.kind === "textarea" || field.kind === "permissionMatrix" ? "space-y-2 md:col-span-2" : "space-y-2"}>
                      <span className="block text-sm font-semibold text-slate-700">
                        {field.label}
                        {field.required ? <span className="ml-1 text-rose-500">*</span> : null}
                      </span>
                      <FieldInput field={field} value={draft[String(field.key)] ?? ""} onChange={(value) => setDraft((current) => ({ ...current, [String(field.key)]: value }))} />
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/70 px-7 py-5">
                <Button className="h-10 px-5" type="button" variant="secondary" onClick={closeForm}>
                  取消
                </Button>
                <Button className="h-10 px-6" type="submit" variant="primary">
                  保存
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
                {showActions ? (
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
                  <td className="h-24 px-4 text-center text-slate-500" colSpan={tableColumns.length + (showActions ? 1 : 0)}>
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
                  {showActions ? (
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
                            详情
                          </Button>
                        ) : null}
                        <Button className="px-2 text-[#1155ff] hover:bg-blue-50 hover:text-[#0648f4]" variant="ghost" onClick={() => openEditForm(record)}>
                          <Edit3 className="size-4" />
                          编辑
                        </Button>
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
        const status = String(getRecordValue(record, "status") ?? "-");
        const isAvailable = status === "可用";
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
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${isAvailable ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                {status}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <ModelPrice label="输入价格" value={`${formatCurrency(Number(getRecordValue(record, "inputPrice") ?? 0))}/1M`} />
              <ModelPrice label="输出价格" value={`${formatCurrency(Number(getRecordValue(record, "outputPrice") ?? 0))}/1M`} />
              <ModelPrice label="缓存价格" value={`${formatCurrency(Number(getRecordValue(record, "cachePrice") ?? 0))}/1M`} />
              <ModelPrice label="计费类型" value={billingType} />
              <ModelPrice label="成本输入" value={`${formatCurrency(Number(getRecordValue(record, "costInputPrice") ?? 0))}/1M`} muted />
              <ModelPrice label="成本输出" value={`${formatCurrency(Number(getRecordValue(record, "costOutputPrice") ?? 0))}/1M`} muted />
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
  const status = String(getRecordValue(record, "status") ?? "-");
  const fields = [
    { label: "厂商", value: provider },
    { label: "模型名称", value: <ModelNameWithLogo record={record} logoSize="sm" /> },
    { label: "模型类型", value: type },
    { label: "输入价格", value: `${formatCurrency(Number(getRecordValue(record, "inputPrice") ?? 0))}/1M Tokens` },
    { label: "输出价格", value: `${formatCurrency(Number(getRecordValue(record, "outputPrice") ?? 0))}/1M Tokens` },
    { label: "缓存价格", value: `${formatCurrency(Number(getRecordValue(record, "cachePrice") ?? 0))}/1M Tokens` },
    { label: "成本输入价", value: `${formatCurrency(Number(getRecordValue(record, "costInputPrice") ?? 0))}/1M Tokens` },
    { label: "成本输出价", value: `${formatCurrency(Number(getRecordValue(record, "costOutputPrice") ?? 0))}/1M Tokens` },
    { label: "计费类型", value: billingType },
    { label: "模型能力", value: abilities },
    { label: "状态", value: status },
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
        const tokenLimitM = String(getRecordValue(record, "tokenLimitM") || "不限");
        const monthlyTokenM = String(getRecordValue(record, "monthlyTokenM") || "不限");
        const monthlyFee = Number(getRecordValue(record, "monthlyFee") ?? 0);
        const discount = Number(getRecordValue(record, "discount") ?? 0);
        const billingMode = String(getRecordValue(record, "billingMode") ?? "-");
        const status = String(getRecordValue(record, "status") ?? "-");
        const isActive = status === "上架";
        const relatedModelList = relatedModels.split(",").map((item) => item.trim()).filter(Boolean);
        const stats = getProductCardStats(record, packageMode, tokenLimitM, monthlyTokenM, monthlyFee, discount);

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

function DetailDialogShell({ title, subtitle, children, onClose, onEdit }: { title: string; subtitle: string; children: React.ReactNode; onClose: () => void; onEdit: () => void }) {
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
            编辑
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

function getProductBillingLabel(packageMode: string, billingMode: string) {
  const billingLabel = billingMode === "按量" ? "按量计费" : "套餐计费";
  return packageMode.includes("包月") ? `${billingLabel}（包月）` : billingLabel;
}

function getProductCardStats(record: BaseRecord, packageMode: string, tokenLimitM: string, monthlyTokenM: string, monthlyFee: number, discount: number) {
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
      { label: "折扣", value: formatDiscount(discount) },
      { label: "总额度（Tokens）", value: tokenLimitM },
    ];
  }

  return [
    { label: "输入价格", value: `${formatCurrency(Number(getRecordValue(record, "inputPrice") ?? 0))}/1M` },
    { label: "总额度（M Tokens）", value: tokenLimitM },
  ];
}

function FieldInput({ field, value, onChange }: { field: FieldConfig; value: string | number; onChange: (value: string | number) => void }) {
  if (field.key === "abilities") {
    return <TagInput value={String(value)} onChange={onChange} placeholder="输入标签名称" />;
  }

  if (field.kind === "select") {
    return (
      <Select
        className="h-11 rounded-lg bg-slate-50/70 pl-4 focus:border-[#1155ff] focus:bg-white focus:ring-blue-100"
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
        className="min-h-28 w-full rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#1155ff] focus:bg-white focus:ring-2 focus:ring-blue-100"
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
        mode={field.kind}
        placeholder={field.placeholder ?? field.label}
        value={String(value)}
        onChange={onChange}
      />
    );
  }

  return (
    <Input
      className="h-11 rounded-lg bg-slate-50/70 px-4 focus:border-[#1155ff] focus:bg-white focus:ring-blue-100"
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

function DatePickerField({
  mode,
  placeholder,
  value,
  onChange,
  className = "",
}: {
  mode: "datetime" | "month";
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
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
        className={[
          "h-full w-full cursor-pointer bg-transparent pl-10 pr-4 outline-none [color-scheme:light]",
          inputValue ? "text-slate-700" : "text-transparent focus:text-transparent",
        ].join(" ")}
        type={inputType}
        value={inputValue}
        onChange={(event) => handleChange(event.target.value)}
      />
    </label>
  );
}

function toDateTimeInputValue(value: string) {
  if (!value) return "";
  return value.includes("T") ? value.slice(0, 16) : value.replace(" ", "T").slice(0, 16);
}

function fromDateTimeInputValue(value: string) {
  return value.replace("T", " ");
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
  return fields.reduce<Record<string, string | number>>((draft, field) => {
    const value = getRecordValue(record, field.key);
    draft[String(field.key)] = typeof value === "number" ? value : String(value ?? "");
    return draft;
  }, {});
}

function normalizeDraft(fields: FieldConfig[], draft: Record<string, string | number>) {
  return fields.reduce<Record<string, string | number>>((normalized, field) => {
    const key = String(field.key);
    normalized[key] = field.kind === "number" ? Number(draft[key] || 0) : draft[key] ?? "";
    return normalized;
  }, {});
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

function formatCell(value: unknown): React.ReactNode {
  if (typeof value === "number" && value > 1000) {
    return value % 1 === 0 ? value.toLocaleString("zh-CN") : formatCurrency(value);
  }

  return String(value ?? "-");
}

function getRecordValue(record: BaseRecord, key: string): unknown {
  return (record as BaseRecord & Record<string, unknown>)[key];
}

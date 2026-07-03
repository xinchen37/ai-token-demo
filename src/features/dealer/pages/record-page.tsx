import * as React from "react";
import { Edit3, LayoutGrid, Plus, RotateCcw, Search, Table2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { BaseRecord, ColumnConfig, DealerData, EntityKey, FieldConfig } from "../types";
import { formatCurrency } from "../dealer-utils";

export interface RecordPageConfig {
  entity: EntityKey;
  title: string;
  description: string;
  createLabel: string;
  searchPlaceholder: string;
  columns: ColumnConfig[];
  fields: FieldConfig[];
}

interface RecordPageProps {
  config: RecordPageConfig;
  records: BaseRecord[];
  data: DealerData;
  onCreate: (draft: Record<string, string | number>) => void;
  onUpdate: (id: string, patch: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
}

export function RecordPage({ config, records, onCreate, onUpdate, onDelete }: RecordPageProps) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [keyword, setKeyword] = React.useState("");
  const [editingRecord, setEditingRecord] = React.useState<BaseRecord | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<"cards" | "table">(config.entity === "products" ? "cards" : "table");
  const [hasHorizontalOverflow, setHasHorizontalOverflow] = React.useState(false);
  const [hasContentOnRight, setHasContentOnRight] = React.useState(false);
  const isProductPage = config.entity === "products";
  const emptyDraft = React.useMemo(() => buildEmptyDraft(config.fields), [config.fields]);
  const [draft, setDraft] = React.useState<Record<string, string | number>>(emptyDraft);

  React.useEffect(() => {
    setDraft(editingRecord ? recordToDraft(editingRecord, config.fields) : emptyDraft);
  }, [editingRecord, emptyDraft, config.fields]);

  React.useEffect(() => {
    setViewMode(config.entity === "products" ? "cards" : "table");
  }, [config.entity]);

  const filteredRecords = React.useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) {
      return records;
    }

    return records.filter((record) =>
      Object.values(record).some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [keyword, records]);

  React.useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) {
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
  }, [config.columns, filteredRecords.length]);

  function openCreateForm() {
    setEditingRecord(null);
    setDraft(emptyDraft);
    setIsFormOpen(true);
  }

  function openEditForm(record: BaseRecord) {
    setEditingRecord(record);
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingRecord(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedDraft = normalizeDraft(config.fields, draft);

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
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input className="pl-9 sm:w-72" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder={config.searchPlaceholder} />
            </div>
            <Button variant="secondary" onClick={() => setKeyword("")}>
              <RotateCcw className="size-4" />
              重置
            </Button>
            <Button variant="primary" onClick={openCreateForm}>
              <Plus className="size-4" />
              {config.createLabel}
            </Button>
          </div>
          {isProductPage ? <ViewModeToggle value={viewMode} onChange={setViewMode} /> : null}
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
                  {config.fields.map((field) => (
                    <label key={String(field.key)} className={field.kind === "textarea" ? "space-y-2 md:col-span-2" : "space-y-2"}>
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

      {isProductPage && viewMode === "cards" ? (
        <ProductCardGrid records={filteredRecords} onEdit={openEditForm} onDelete={onDelete} />
      ) : (
      <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm shadow-slate-100">
        <div ref={scrollContainerRef} className="max-h-[calc(100vh-340px)] overflow-auto">
          <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                {config.columns.map((column) => (
                  <th
                    key={String(column.key)}
                    className="sticky top-0 z-10 h-12 whitespace-nowrap border-b border-slate-200 bg-slate-50 px-4 font-medium"
                    style={{ minWidth: column.width ?? 150 }}
                  >
                    {column.label}
                  </th>
                ))}
                <th
                  className={[
                    "top-0 h-12 min-w-[190px] whitespace-nowrap border-b border-slate-200 bg-slate-50 px-4 text-right font-medium",
                    hasHorizontalOverflow
                      ? [
                          "sticky right-0 z-30",
                          hasContentOnRight
                            ? "border-l border-slate-200/70 shadow-[-18px_0_26px_-24px_rgba(30,41,59,0.55)]"
                            : "border-l-0 shadow-none",
                        ].join(" ")
                      : "sticky z-10",
                  ].join(" ")}
                >
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td className="h-24 px-4 text-center text-slate-500" colSpan={config.columns.length + 1}>
                    暂无匹配数据
                  </td>
                </tr>
              ) : null}
              {filteredRecords.map((record) => (
                <tr key={record.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                  {config.columns.map((column) => (
                    <td
                      key={String(column.key)}
                      className="whitespace-nowrap border-b border-slate-100 bg-white px-4 py-3 align-middle text-slate-700"
                    >
                      {column.format ? column.format(getRecordValue(record, column.key), record) : formatCell(getRecordValue(record, column.key))}
                    </td>
                  ))}
                  <td
                    className={[
                      "whitespace-nowrap border-b border-slate-100 bg-white px-4 py-3",
                      hasHorizontalOverflow
                        ? [
                            "sticky right-0 z-20",
                            hasContentOnRight
                              ? "border-l border-slate-200/70 shadow-[-18px_0_26px_-24px_rgba(30,41,59,0.55)]"
                              : "border-l-0 shadow-none",
                          ].join(" ")
                        : "",
                    ].join(" ")}
                  >
                    <div className="flex justify-end gap-1">
                      <Button className="px-2 text-[#1155ff] hover:bg-blue-50 hover:text-[#0648f4]" variant="ghost" onClick={() => openEditForm(record)}>
                        <Edit3 className="size-4" />
                        编辑
                      </Button>
                      <Button className="px-2" variant="danger" onClick={() => onDelete(record.id)}>
                        <Trash2 className="size-4" />
                        删除
                      </Button>
                    </div>
                  </td>
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
    { value: "table" as const, label: "表格视图", icon: Table2 },
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

function ProductCardGrid({ records, onEdit, onDelete }: { records: BaseRecord[]; onEdit: (record: BaseRecord) => void; onDelete: (id: string) => void }) {
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
        const name = String(getRecordValue(record, "name") ?? "-");
        const packageMode = String(getRecordValue(record, "packageMode") ?? "-");
        const relatedModels = String(getRecordValue(record, "relatedModels") ?? "-");
        const tokenLimitM = String(getRecordValue(record, "tokenLimitM") ?? "-");
        const billingMode = String(getRecordValue(record, "billingMode") ?? "-");
        const status = String(getRecordValue(record, "status") ?? "-");
        const isActive = status === "上架";

        return (
          <article key={record.id} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100 transition hover:border-blue-100 hover:shadow-md hover:shadow-slate-100">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-slate-950">{name}</h3>
                <p className="mt-2 text-sm text-slate-500">{packageMode} · {billingMode}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${isActive ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
                {status}
              </span>
            </div>

            <div className="mt-5 space-y-3 text-sm">
              <ProductMeta label="关联模型" value={relatedModels} />
              <ProductMeta label="Tokens(M)" value={tokenLimitM} />
              <ProductMeta label="输入价格" value={formatCell(getRecordValue(record, "inputPrice"))} />
              <ProductMeta label="输出价格" value={formatCell(getRecordValue(record, "outputPrice"))} />
              <ProductMeta label="缓存价格" value={formatCell(getRecordValue(record, "cachePrice"))} />
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Button className="px-2 text-[#1155ff] hover:bg-blue-50 hover:text-[#0648f4]" variant="ghost" onClick={() => onEdit(record)}>
                <Edit3 className="size-4" />
                编辑
              </Button>
              <Button className="px-2" variant="danger" onClick={() => onDelete(record.id)}>
                <Trash2 className="size-4" />
                删除
              </Button>
            </div>
          </article>
        );
      })}
    </section>
  );
}

function ProductMeta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-slate-400">{label}</span>
      <span className="min-w-0 text-right font-medium text-slate-700">{value}</span>
    </div>
  );
}

function FieldInput({ field, value, onChange }: { field: FieldConfig; value: string | number; onChange: (value: string | number) => void }) {
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

  return (
    <Input
      className="h-11 rounded-lg bg-slate-50/70 px-4 focus:border-[#1155ff] focus:bg-white focus:ring-blue-100"
      type={field.kind === "number" ? "number" : field.kind === "datetime" ? "datetime-local" : "text"}
      value={String(value)}
      onChange={(event) => onChange(field.kind === "number" ? Number(event.target.value) : event.target.value)}
      placeholder={field.placeholder}
      required={field.required}
    />
  );
}

function buildEmptyDraft(fields: FieldConfig[]): Record<string, string | number> {
  return fields.reduce<Record<string, string | number>>((draft, field) => {
    draft[String(field.key)] = field.kind === "number" ? 0 : field.options?.[0] ?? "";
    return draft;
  }, {});
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

function formatCell(value: unknown): React.ReactNode {
  if (typeof value === "number" && value > 1000) {
    return value % 1 === 0 ? value.toLocaleString("zh-CN") : formatCurrency(value);
  }

  return String(value ?? "-");
}

function getRecordValue(record: BaseRecord, key: string): unknown {
  return (record as BaseRecord & Record<string, unknown>)[key];
}

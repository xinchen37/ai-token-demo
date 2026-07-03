import * as React from "react";
import { Edit3, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
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
  const [hasHorizontalOverflow, setHasHorizontalOverflow] = React.useState(false);
  const [hasContentOnRight, setHasContentOnRight] = React.useState(false);
  const emptyDraft = React.useMemo(() => buildEmptyDraft(config.fields), [config.fields]);
  const [draft, setDraft] = React.useState<Record<string, string | number>>(emptyDraft);

  React.useEffect(() => {
    setDraft(editingRecord ? recordToDraft(editingRecord, config.fields) : emptyDraft);
  }, [editingRecord, emptyDraft, config.fields]);

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

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedDraft = normalizeDraft(config.fields, draft);

    if (editingRecord) {
      onUpdate(editingRecord.id, normalizedDraft);
    } else {
      onCreate(normalizedDraft);
    }

    setIsFormOpen(false);
    setEditingRecord(null);
  }

  return (
    <div className="space-y-5">
      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">{config.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{config.description}</p>
          </div>
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
        </div>
      </section>

      {isFormOpen ? (
        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-950">{editingRecord ? "编辑数据" : config.createLabel}</h3>
              <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>
                收起
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {config.fields.map((field) => (
                <label key={String(field.key)} className="space-y-2 text-sm">
                  <span className="font-medium text-slate-600">{field.label}</span>
                  <FieldInput field={field} value={draft[String(field.key)] ?? ""} onChange={(value) => setDraft((current) => ({ ...current, [String(field.key)]: value }))} />
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)}>
                取消
              </Button>
              <Button type="submit" variant="primary">
                保存
              </Button>
            </div>
          </form>
        </section>
      ) : null}

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
    </div>
  );
}

function FieldInput({ field, value, onChange }: { field: FieldConfig; value: string | number; onChange: (value: string | number) => void }) {
  if (field.kind === "select") {
    return (
      <Select value={String(value)} onChange={(event) => onChange(event.target.value)} required={field.required}>
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
        className="min-h-24 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        value={String(value)}
        onChange={(event) => onChange(event.target.value)}
        placeholder={field.placeholder}
        required={field.required}
      />
    );
  }

  return (
    <Input
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

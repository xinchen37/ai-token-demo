import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { Task, TaskFilters, TaskPriority, TaskStatus } from "./types";
import { filterTasks } from "./task-utils";

interface TasksPageProps {
  tasks: Task[];
  isLoading: boolean;
  onCreateTask: (title: string) => void;
  onAdvanceStatus: (id: string) => void;
  onDeleteTask: (id: string) => void;
}

const statusText: Record<TaskStatus, string> = {
  todo: "待处理",
  in_progress: "进行中",
  blocked: "阻塞",
  done: "已完成",
};

const statusTone: Record<TaskStatus, React.ComponentProps<typeof Badge>["tone"]> = {
  todo: "slate",
  in_progress: "sky",
  blocked: "rose",
  done: "emerald",
};

const priorityText: Record<TaskPriority, string> = {
  low: "低",
  medium: "中",
  high: "高",
};

export function TasksPage({ tasks, isLoading, onCreateTask, onAdvanceStatus, onDeleteTask }: TasksPageProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [newTitle, setNewTitle] = React.useState("");
  const [filters, setFilters] = React.useState<TaskFilters>({
    keyword: "",
    status: "all",
    priority: "all",
  });

  const filteredTasks = React.useMemo(() => filterTasks(tasks, filters), [tasks, filters]);

  const columns = React.useMemo<ColumnDef<Task>[]>(
    () => [
      {
        accessorKey: "title",
        header: "任务名称",
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-slate-950">{row.original.title}</div>
            <div className="mt-1 text-xs text-slate-500">{row.original.id}</div>
          </div>
        ),
      },
      {
        accessorKey: "project",
        header: "项目",
      },
      {
        accessorKey: "owner",
        header: "负责人",
      },
      {
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) => <Badge tone={statusTone[row.original.status]}>{statusText[row.original.status]}</Badge>,
      },
      {
        accessorKey: "priority",
        header: "优先级",
        cell: ({ row }) => priorityText[row.original.priority],
      },
      {
        accessorKey: "dueDate",
        header: "截止时间",
      },
      {
        id: "actions",
        header: "操作",
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onAdvanceStatus(row.original.id)}>
              <RefreshCw className="size-4" />
              流转
            </Button>
            <Button variant="danger" onClick={() => onDeleteTask(row.original.id)} aria-label={`删除 ${row.original.title}`}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        ),
      },
    ],
    [onAdvanceStatus, onDeleteTask],
  );

  const table = useReactTable({
    data: filteredTasks,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  function handleCreateTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newTitle.trim();

    if (title.length === 0) {
      return;
    }

    onCreateTask(title);
    setNewTitle("");
  }

  return (
    <div className="space-y-5">
      <section className="rounded-md border border-slate-200 bg-white p-5">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">任务列表</h2>
            <p className="mt-1 text-sm text-slate-500">支持搜索、筛选、排序和基础状态流转。</p>
          </div>
          <form className="flex flex-col gap-2 sm:flex-row" onSubmit={handleCreateTask}>
            <Input
              className="sm:w-72"
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              placeholder="输入新任务名称"
            />
            <Button variant="primary" type="submit">
              <Plus className="size-4" />
              新建任务
            </Button>
          </form>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white">
        <div className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-[1fr_160px_160px]">
          <Input
            value={filters.keyword}
            onChange={(event) => setFilters((current) => ({ ...current, keyword: event.target.value }))}
            placeholder="搜索任务、项目或负责人"
          />
          <Select
            value={filters.status}
            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as TaskFilters["status"] }))}
          >
            <option value="all">全部状态</option>
            <option value="todo">待处理</option>
            <option value="in_progress">进行中</option>
            <option value="blocked">阻塞</option>
            <option value="done">已完成</option>
          </Select>
          <Select
            value={filters.priority}
            onChange={(event) =>
              setFilters((current) => ({ ...current, priority: event.target.value as TaskFilters["priority"] }))
            }
          >
            <option value="all">全部优先级</option>
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="h-11 border-b border-slate-200 px-4 font-medium">
                      {header.isPlaceholder ? null : (
                        <button
                          className="inline-flex items-center gap-1"
                          onClick={header.column.getToggleSortingHandler()}
                          type="button"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() ? <ArrowUpDown className="size-3" /> : null}
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="h-24 px-4 text-center text-slate-500" colSpan={columns.length}>
                    正在加载任务...
                  </td>
                </tr>
              ) : null}
              {!isLoading && table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td className="h-24 px-4 text-center text-slate-500" colSpan={columns.length}>
                    暂无匹配任务
                  </td>
                </tr>
              ) : null}
              {!isLoading
                ? table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3 align-middle">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

import type { Task, TaskStatus } from "./types";
import { getNextStatus } from "./task-utils";

let tasks: Task[] = [
  {
    id: "T-1001",
    title: "梳理任务管理 DEMO 信息架构",
    project: "任务中后台",
    owner: "林夕",
    status: "in_progress",
    priority: "high",
    dueDate: "2026-07-04",
    updatedAt: "2026-07-02 09:30",
  },
  {
    id: "T-1002",
    title: "接入任务列表筛选与排序",
    project: "任务中后台",
    owner: "陈安",
    status: "todo",
    priority: "medium",
    dueDate: "2026-07-06",
    updatedAt: "2026-07-02 10:10",
  },
  {
    id: "T-1003",
    title: "确认后续权限模型范围",
    project: "平台服务",
    owner: "周宁",
    status: "blocked",
    priority: "high",
    dueDate: "2026-07-03",
    updatedAt: "2026-07-01 18:20",
  },
  {
    id: "T-1004",
    title: "完成中文 README 初稿",
    project: "工程规范",
    owner: "林夕",
    status: "done",
    priority: "low",
    dueDate: "2026-07-01",
    updatedAt: "2026-07-02 08:45",
  },
  {
    id: "T-1005",
    title: "准备演示数据与操作路径",
    project: "任务中后台",
    owner: "许岩",
    status: "todo",
    priority: "medium",
    dueDate: "2026-07-08",
    updatedAt: "2026-07-02 11:05",
  },
];

export async function listTasks(): Promise<Task[]> {
  await wait(180);
  return [...tasks];
}

export async function createTask(title: string): Promise<Task> {
  await wait(160);
  const task: Task = {
    id: `T-${1000 + tasks.length + 1}`,
    title,
    project: "任务中后台",
    owner: "未分配",
    status: "todo",
    priority: "medium",
    dueDate: "2026-07-10",
    updatedAt: formatDateTime(new Date()),
  };

  tasks = [task, ...tasks];
  return task;
}

export async function advanceTaskStatus(id: string): Promise<Task> {
  await wait(120);
  const task = tasks.find((item) => item.id === id);

  if (!task) {
    throw new Error("任务不存在");
  }

  return updateTaskStatus(id, getNextStatus(task.status));
}

export async function updateTaskStatus(id: string, status: TaskStatus): Promise<Task> {
  const nextTask = tasks.find((task) => task.id === id);

  if (!nextTask) {
    throw new Error("任务不存在");
  }

  tasks = tasks.map((task) =>
    task.id === id ? { ...task, status, updatedAt: formatDateTime(new Date()) } : task,
  );

  return tasks.find((task) => task.id === id)!;
}

export async function deleteTask(id: string): Promise<void> {
  await wait(120);
  tasks = tasks.filter((task) => task.id !== id);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(date)
    .replace(/\//g, "-");
}

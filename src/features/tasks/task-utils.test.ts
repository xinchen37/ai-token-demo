import { describe, expect, it } from "vitest";
import type { Task } from "./types";
import { calculateTaskStats, filterTasks, getNextStatus } from "./task-utils";

const tasks: Task[] = [
  {
    id: "task-1",
    title: "完成登录页交互",
    project: "中后台 DEMO",
    owner: "林夕",
    status: "todo",
    priority: "high",
    dueDate: "2026-07-01",
    updatedAt: "2026-07-01 10:00",
  },
  {
    id: "task-2",
    title: "整理任务列表字段",
    project: "中后台 DEMO",
    owner: "陈安",
    status: "in_progress",
    priority: "medium",
    dueDate: "2026-07-05",
    updatedAt: "2026-07-02 09:30",
  },
  {
    id: "task-3",
    title: "确认接口权限边界",
    project: "平台服务",
    owner: "林夕",
    status: "done",
    priority: "low",
    dueDate: "2026-06-30",
    updatedAt: "2026-07-01 16:20",
  },
];

describe("task-utils", () => {
  it("按任务状态、逾期数量和完成率计算概览", () => {
    expect(calculateTaskStats(tasks, new Date("2026-07-02T00:00:00+08:00"))).toEqual({
      total: 3,
      todo: 1,
      inProgress: 1,
      blocked: 0,
      done: 1,
      overdue: 1,
      completionRate: 33,
    });
  });

  it("根据关键字、状态和优先级过滤任务", () => {
    const result = filterTasks(tasks, {
      keyword: "中后台",
      status: "in_progress",
      priority: "medium",
    });

    expect(result.map((task) => task.id)).toEqual(["task-2"]);
  });

  it("按演示工作流推进任务状态", () => {
    expect(getNextStatus("todo")).toBe("in_progress");
    expect(getNextStatus("in_progress")).toBe("done");
    expect(getNextStatus("done")).toBe("todo");
    expect(getNextStatus("blocked")).toBe("in_progress");
  });
});

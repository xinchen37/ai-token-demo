import type { Task, TaskFilters, TaskStatus, TaskStats } from "./types";

const statusKeyMap: Record<TaskStatus, keyof Pick<TaskStats, "todo" | "inProgress" | "blocked" | "done">> = {
  todo: "todo",
  in_progress: "inProgress",
  blocked: "blocked",
  done: "done",
};

export function calculateTaskStats(tasks: Task[], now = new Date()): TaskStats {
  const stats: TaskStats = {
    total: tasks.length,
    todo: 0,
    inProgress: 0,
    blocked: 0,
    done: 0,
    overdue: 0,
    completionRate: 0,
  };

  for (const task of tasks) {
    stats[statusKeyMap[task.status]] += 1;

    if (task.status !== "done" && isBeforeToday(task.dueDate, now)) {
      stats.overdue += 1;
    }
  }

  stats.completionRate = stats.total === 0 ? 0 : Math.round((stats.done / stats.total) * 100);
  return stats;
}

export function filterTasks(tasks: Task[], filters: TaskFilters): Task[] {
  const keyword = filters.keyword.trim().toLowerCase();

  return tasks.filter((task) => {
    const matchesKeyword =
      keyword.length === 0 ||
      [task.title, task.project, task.owner].some((value) => value.toLowerCase().includes(keyword));
    const matchesStatus = filters.status === "all" || task.status === filters.status;
    const matchesPriority = filters.priority === "all" || task.priority === filters.priority;

    return matchesKeyword && matchesStatus && matchesPriority;
  });
}

export function getNextStatus(status: TaskStatus): TaskStatus {
  const flow: Record<TaskStatus, TaskStatus> = {
    todo: "in_progress",
    in_progress: "done",
    blocked: "in_progress",
    done: "todo",
  };

  return flow[status];
}

function isBeforeToday(dateText: string, now: Date): boolean {
  const dueDate = new Date(`${dateText}T23:59:59`);
  return dueDate.getTime() < now.getTime();
}

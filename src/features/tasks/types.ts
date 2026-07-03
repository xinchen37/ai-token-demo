export type TaskStatus = "todo" | "in_progress" | "blocked" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: string;
  title: string;
  project: string;
  owner: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  updatedAt: string;
}

export interface TaskFilters {
  keyword: string;
  status: "all" | TaskStatus;
  priority: "all" | TaskPriority;
}

export interface TaskStats {
  total: number;
  todo: number;
  inProgress: number;
  blocked: number;
  done: number;
  overdue: number;
  completionRate: number;
}

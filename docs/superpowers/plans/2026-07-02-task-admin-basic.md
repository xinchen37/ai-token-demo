# 任务管理中后台基础版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建一个可运行的 React + TypeScript + Vite 任务管理中后台 DEMO 基础版。

**Architecture:** 应用采用单页中后台布局，左侧导航和顶部工具栏固定信息架构，内容区承载工作台与任务列表。数据层使用本地 mock API 与 TanStack Query，任务表格使用 TanStack Table，UI 组件采用 shadcn/ui 风格的本地组件。

**Tech Stack:** React、TypeScript、Vite、Tailwind CSS、shadcn/ui 风格组件、TanStack Query、TanStack Table、Vitest。

---

### Task 1: 项目与工具链

**Files:**
- Create: `index.html`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `components.json`
- Create: `src/index.css`
- Create: `src/main.tsx`

- [ ] 配置 Vite、React、TypeScript、Tailwind CSS 和 shadcn/ui 路径别名。
- [ ] 建立 React 入口和全局中文基础样式。

### Task 2: 任务领域模型

**Files:**
- Create: `src/features/tasks/types.ts`
- Create: `src/features/tasks/task-utils.ts`
- Create: `src/features/tasks/task-utils.test.ts`
- Create: `src/features/tasks/mock-api.ts`

- [ ] 先写任务统计与筛选测试。
- [ ] 实现任务类型、统计、筛选、mock 数据读取与更新。

### Task 3: 中后台界面

**Files:**
- Create: `src/components/ui/*.tsx`
- Create: `src/app/admin-layout.tsx`
- Create: `src/features/dashboard/dashboard-page.tsx`
- Create: `src/features/tasks/tasks-page.tsx`
- Create: `src/App.tsx`

- [ ] 搭建 Ant Design Pro 风格侧边栏、顶部栏、工作台和任务列表。
- [ ] 使用 TanStack Query 获取任务数据，使用 TanStack Table 渲染列表。
- [ ] 提供基础新增、状态切换和删除演示操作。

### Task 4: 中文文档与验证

**Files:**
- Create: `README.md`

- [ ] 编写中文 README，说明技术栈、启动方式和后续开发方向。
- [ ] 运行测试与构建验证。

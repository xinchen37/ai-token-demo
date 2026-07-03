# 经销商系统实现计划

> **给执行代理：** 使用任务清单逐项推进。所有文档与业务文案使用中文。

## 目标

在当前 React/Vite 工程内实现 OmniAI 经销商系统 MVP，支持本地持久化数据和主要实体增删查改。

## 架构

采用前端单页应用方案。`src/features/dealer` 承载经销商系统的类型、模拟数据、本地存储、布局、看板和通用数据管理页面。`App.tsx` 作为系统入口，默认加载经销商系统。

## 技术栈

- React 19
- TypeScript
- Tailwind CSS
- lucide-react
- localStorage
- Vitest

## 文件结构

- `src/App.tsx`：替换旧任务 Demo 入口，加载经销商系统。
- `src/features/dealer/types.ts`：定义经销商系统所有本地实体类型。
- `src/features/dealer/seed-data.ts`：初始化模拟数据。
- `src/features/dealer/local-store.ts`：封装 `localStorage` 读写、增删改工具和 React hook。
- `src/features/dealer/dealer-utils.ts`：封装金额、日期、脱敏、统计计算等纯函数。
- `src/features/dealer/dealer-utils.test.ts`：验证统计与本地数据辅助函数。
- `src/features/dealer/dealer-layout.tsx`：经销商系统外框、侧栏、顶部导航。
- `src/features/dealer/dealer-system.tsx`：经销商系统页面路由与数据操作分发。
- `src/features/dealer/pages/dashboard-page.tsx`：经销商看板。
- `src/features/dealer/pages/record-page.tsx`：通用 CRUD 表格页面。
- `src/features/dealer/pages/trial-page.tsx`：模拟试用页面。
- `src/features/dealer/pages/profile-page.tsx`：个人中心页面。
- `src/features/dealer/page-configs.ts`：各业务列表页字段、表单和列配置。

## 风险与处理

- PRD 覆盖范围较大，本期以 MVP 完整可操作为目标，复杂权限树、真实图表库和文件导入导出先用前端内置交互表达。
- 浏览器本地存储容量足够支撑模拟数据，不引入后端或数据库。
- 表单采用通用配置驱动，减少重复代码。

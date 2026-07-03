# 任务管理中后台 DEMO

这是一个基础版任务管理中后台项目，用于后续需求明确后继续扩展。当前版本先提供 Ant Design Pro 风格的管理台布局、工作台概览、任务列表、筛选、排序和基础任务流转。

## 技术栈

- React + TypeScript + Vite
- Tailwind CSS
- shadcn/ui 风格本地组件
- TanStack Query
- TanStack Table
- pnpm

## 本地启动

```bash
pnpm install
pnpm dev
```

默认开发服务会运行在 `http://127.0.0.1:5173`。

## 常用命令

```bash
pnpm test
pnpm build
pnpm preview
```

## 当前功能

- 中后台布局：深色侧边栏、顶部工具栏、内容工作区。
- 工作台：任务总数、完成率、逾期风险、协作成员、状态分布。
- 任务管理：关键字搜索、状态筛选、优先级筛选、表格排序。
- 演示操作：新建任务、状态流转、删除任务。

## 后续建议

- 接入真实后端 API，并将 `src/features/tasks/mock-api.ts` 替换为服务端请求。
- 增加登录、权限、角色和菜单控制。
- 增加任务详情页、编辑表单、批量操作和审计日志。
- 根据最终业务字段补充单元测试和端到端测试。

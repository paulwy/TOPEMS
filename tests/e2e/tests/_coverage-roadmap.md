# E2E 测试覆盖路线图 V78.0

## 目标
24 个域 Dashboard + 列表 + 创建 基本跳转 = 至少 72 specs

## 24 个域列表
1. IAM (身份与访问管理)
2. Admin (系统管理)
3. HRM (人力资源)
4. Finance (财务管理)
5. CRM (客户关系管理)
6. SCM (供应链管理)
7. SRM (供应商关系)
8. WMS (仓储管理)
9. MES (制造执行)
10. QMS (质量管理)
11. PDM (产品数据)
12. PM (项目管理)
13. RD (研发管理)
14. LIMS (实验室)
15. EHS (环境健康安全)
16. ERP (企业资源)
17. BI (商业智能)
18. GIS (地理信息)
19. OA (办公协同)
20. Ticket (工单)
21. Asset (资产管理)
22. Doc (文档管理)
23. Workflow (工作流)
24. AI (智能能力)

## Spec 结构（每域 3 个 = 72 specs）
- `{domain}/01-dashboard.spec.ts` → 登录后跳转 Dashboard，页面 title + 核心卡片存在
- `{domain}/02-list.spec.ts` → 进入列表页，表格存在，分页控件可点击下一页
- `{domain}/03-create.spec.ts` → 点击【新建】按钮弹出表单，填写基础字段，提交后 toast 成功

## 工具
- 框架：Playwright (tests/e2e/playwright.config.ts 已存在)
- 登录态复用：tests/e2e/storageState.json（已存在）
- 助手：tests/e2e/helpers/auth.ts + helpers/api.ts
- 报告：playwright html reporter + CI 归档

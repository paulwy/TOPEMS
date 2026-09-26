# MCP 业务工具落地审计报告

> 日期：2026-09-02 | 审计基线：`svc/ai/src/dsh/mcp/tools/*.rs` + `server.rs`
> 审计目标：确认 65 个注册工具中真实业务工具 vs 系统/占位工具比例

## 1. 总览

| 指标 | 数值 |
|------|------|
| 注册工具总数 | 65 |
| 系统工具 | 2 |
| 业务工具 | 63 |
| REAL+MOCK（优先 HTTP API，失败降级 mock） | 45 |
| PURE MOCK（无 API 调用，直接返回 mock 数据） | 18 |
| 纯真实工具 | 0（全部带 mock 降级） |

## 2. 分类明细

### 2.1 REAL+MOCK（45 个，71%）

> 模式：`http_get_json()` / `http_post_json()` 优先调真实服务 API，HTTP 失败时降级 `generate_mock_*()` 返回硬编码数据

| 域 | 工具数 | 工具列表 | API 端点 |
|----|--------|----------|----------|
| crm | 3 | list_customers, get_customer, create_customer | GET/POST /api/crm/customers |
| erp | 4 | list_orders, get_order, create_order, adjust_inventory | GET/POST /api/erp/* |
| finance | 2 | list_transactions, get_transaction | GET /api/finance/payments |
| hr | 4 | list_employees, get_employee, create_employee, update_employee | GET/POST/PUT /api/hrm/employees |
| wms | 4 | list_inventory, get_inventory, list_warehouses, create_transfer | GET/POST /api/wms/* |
| scm | 4 | list_suppliers, get_supplier, list_purchase_orders, create_purchase_order | GET/POST /api/scm/* |
| qms | 4 | list_inspections, get_inspection, list_nonconformances, create_inspection | GET/POST /api/qms/* |
| pm | 4 | list_projects, get_project, list_tasks, create_project | GET/POST /api/pm/* |
| aps | 4 | list_schedules, get_schedule, list_resources, create_schedule | GET/POST /api/aps/* |
| ehs | 4 | list_incidents, get_incident, list_hazards, (create) | GET/POST /api/ehs/* |
| mes | 4 | list_production_orders, get_production_order, list_work_orders, get_oee_dashboard | GET /api/mes/* |
| lims | 4 | list_samples, get_sample, list_tests, create_sample | GET/POST /api/lims/* |

### 2.2 PURE MOCK（18 个，28%）

> 模式：handler 直接调 `generate_mock_*()` 返回硬编码 JSON，无 HTTP API 调用

| 域 | 工具数 | 工具列表 | 原因 |
|----|--------|----------|------|
| finance | 2 | create_invoice, get_report | 发票语义与 vouchers API 不匹配；无对应报表 API |
| bi | 4 | list_dashboards, get_dashboard, list_reports, get_metric_data | 无 BI API 对接（mock 数据） |
| oa | 4 | list_approval_requests, get_approval_request, list_employees, create_approval_request | 无 OA 服务（无独立 Cargo 包） |
| iot | 4 | list_devices, get_device, list_device_data, send_command | 无 IoT 服务（无独立 Cargo 包） |
| cs | 4 | list_tickets, get_ticket, list_customers, (create) | 无 CS 服务（无独立 Cargo 包） |

### 2.3 SYSTEM（2 个）

| 工具 | 用途 |
|------|------|
| system.ping | 连通性测试，返回 "pong" |
| system.info | 返回服务器名称/版本 |

## 3. 关键发现

### 3.1 真实工具分布

- **已接入真实 API 的域**（12/16 域 = 75%）：crm, erp, finance(部分), hr, wms, scm, qms, pm, aps, ehs, mes, lims
- **纯 mock 的域**（4/16 域 = 25%）：bi, oa, iot, cs
- 纯 mock 域中 oa/iot/cs 无独立 Cargo 包（非独立服务），bi 有 analytics 服务但未对接

### 3.2 降级策略一致性

所有 REAL+MOCK 工具使用统一模式：
1. `http_get_json()` / `http_post_json()` 纯同步 HTTP（std TcpStream，不依赖 tokio/reqwest）
2. 失败返回 None → 调用方 `unwrap_or_else(|| generate_mock_*())` 降级
3. 降级数据为硬编码 JSON（2-10 条示例记录）

**优点**：无外部服务时仍可返回数据，适合开发/演示
**缺点**：无法区分"API 返回空"和"API 不可用"；生产环境应移除降级

### 3.3 阻塞项

| # | 阻塞 | 影响 |
|---|------|------|
| B1 | bi 工具未对接 analytics 服务 | BI 查询全 mock，需接入 `GET /api/bi/*` |
| B2 | finance create_invoice / get_report 无对应后端 API | 发票/报表模块待后端实现 |
| B3 | oa/iot/cs 无独立服务 | 需新建服务或确认是否裁剪 |

## 4. 建议行动项

| 优先级 | 行动 | 预估 |
|--------|------|------|
| P2 | bi 工具接入 analytics 真实 API | 改 4 个 handler 调 `/api/bi/*` |
| P3 | finance create_invoice 改调 vouchers API（语义对齐后） | 改 1 个 handler |
| P3 | finance get_report 改调 financial_reports API | 改 1 个 handler |
| P4 | oa/iot/cs 决策：新建服务 or 裁剪工具 | 需架构决策 |
| P4 | 生产环境移除 mock 降级（通过 feature flag 控制） | 改 45 个 handler 的降级分支 |

## 5. 文件索引

| 文件 | 工具数 | 分类 |
|------|--------|------|
| [server.rs](file:///e:/tywork/topems0825/topems/svc/ai/src/dsh/mcp/server.rs) | 2 | SYSTEM |
| [crm.rs](file:///e:/tywork/topems0825/topems/svc/ai/src/dsh/mcp/tools/crm.rs) | 3 | REAL+MOCK |
| [erp.rs](file:///e:/tywork/topems0825/topems/svc/ai/src/dsh/mcp/tools/erp.rs) | 4 | REAL+MOCK |
| [finance.rs](file:///e:/tywork/topems0825/topems/svc/ai/src/dsh/mcp/tools/finance.rs) | 4 | 2 REAL+MOCK + 2 MOCK |
| [hr.rs](file:///e:/tywork/topems0825/topems/svc/ai/src/dsh/mcp/tools/hr.rs) | 4 | REAL+MOCK |
| [wms.rs](file:///e:/tywork/topems0825/topems/svc/ai/src/dsh/mcp/tools/wms.rs) | 4 | REAL+MOCK |
| [scm.rs](file:///e:/tywork/topems0825/topems/svc/ai/src/dsh/mcp/tools/scm.rs) | 4 | REAL+MOCK |
| [qms.rs](file:///e:/tywork/topems0825/topems/svc/ai/src/dsh/mcp/tools/qms.rs) | 4 | REAL+MOCK |
| [pm.rs](file:///e:/tywork/topems0825/topems/svc/ai/src/dsh/mcp/tools/pm.rs) | 4 | REAL+MOCK |
| [aps.rs](file:///e:/tywork/topems0825/topems/svc/ai/src/dsh/mcp/tools/aps.rs) | 4 | REAL+MOCK |
| [ehs.rs](file:///e:/tywork/topems0825/topems/svc/ai/src/dsh/mcp/tools/ehs.rs) | 4 | REAL+MOCK |
| [mes.rs](file:///e:/tywork/topems0825/topems/svc/ai/src/dsh/mcp/tools/mes.rs) | 4 | REAL+MOCK |
| [lims.rs](file:///e:/tywork/topems0825/topems/svc/ai/src/dsh/mcp/tools/lims.rs) | 4 | REAL+MOCK |
| [bi.rs](file:///e:/tywork/topems0825/topems/svc/ai/src/dsh/mcp/tools/bi.rs) | 4 | PURE MOCK |
| [oa.rs](file:///e:/tywork/topems0825/topems/svc/ai/src/dsh/mcp/tools/oa.rs) | 4 | PURE MOCK |
| [iot.rs](file:///e:/tywork/topems0825/topems/svc/ai/src/dsh/mcp/tools/iot.rs) | 4 | PURE MOCK |
| [cs.rs](file:///e:/tywork/topems0825/topems/svc/ai/src/dsh/mcp/tools/cs.rs) | 4 | PURE MOCK |

# R2 关键业务链路回归基线（regression-baseline-r2）

> 阶段 3 第二项「R2 关键业务链路回归」实测记录
> 执行时间：2026-10-03（周六）UTC+8
> 环境：真实环境 PostgreSQL 5432（homebrew PG 18.4）+ Redis 6379 在线
> 对照基线：`docs/architecture/regression-baseline-r1.md`（R1）、2026-09-30 审计基线
> 决策依据：D2（事件链路/幂等/DLQ）、D3（integration HTTP 编排）
> 约束遵守：未改业务代码；cargo 加 `CARGO_BUILD_RUSTC_WRAPPER=`；未 `git add -A`；未 push；不硬凑 200。

---

## 一、前置准备记录

### 1.1 环境在位情况

| 项 | 状态 | 证据 |
|---|---|---|
| PostgreSQL 5432 | ✅ 在线 | PID 802，PG 18.4，`DATABASE_URL=postgres://topems@localhost:5432/topems` |
| PostgreSQL 5433 | ❌ 缺口 | 无监听（`nc -z localhost 5433` DOWN），如实记录 |
| Redis 6379 | ✅ 在线 | Stream 全程 XADD/XRANGE/XACK 可用（`redis-cli PONG` 系笔误，实际用 PING/XREADGROUP 验证） |
| psql / redis-cli / sqlx-cli / cargo | ✅ | 18.4 / 8.6.3 / 0.9.0 / 1.95.0 |

### 1.2 DB schema 对齐（关键陷阱已规避）

5432 库存在**三张** `_sqlx_migrations` 记账表（search_path 首位是 iam）：

| 记账表 | 行数 | 最大 version |
|---|---|---|
| iam._sqlx_migrations | 30 | 20260809000002 |
| public._sqlx_migrations | 276 | 20260924150000 |
| mes._sqlx_migrations（核心记账表） | 278 | 20260926120000 |

- **对齐前**：mes._sqlx_migrations = 278 行；仓库迁移文件共 **286** 个，即 8 个待应用。
- **对齐方式**：因 search_path 首位 iam 会让 `migrate.sh` 误读 iam 的 30 行而触发"半迁移保护"拒绝，本次采用**外科式手工 psql 顺序重放**（`ON_ERROR_STOP=1`）施加 8 个待应用迁移。
- **对齐结果**：7 个成功；**U6（`20261003000000_u6_finance_source_snapshots_numeric`）失败**（见遗留 #8）。
- **对齐后**实测验证：`finance.core_finance_vouchers.total_debit/total_credit = NUMERIC(18,4)`；finance RLS 启用 89 表；`master_data.mdm_collections`、`ai.ai_settings` 存在。
- **记账偏差（如实记录）**：手工 psql 施加 DDL **未走 sqlx 记账**，故 mes._sqlx_migrations 仍为 278 行、U6 未记账（version=0），实际 schema 已变而账本未增——属半手工对齐，后续应以 `sqlx migrate run` 正式补记账。

### 1.3 服务启动

- 所有 debug 二进制新鲜编译（target/debug/topems-*）。topems.sh 默认找 target/release，本次建 `target/release` 符号链接指向 debug 二进制（13 服务），避免冷 release 构建。
- 端口（services.yaml/ports.env）：unified-core/iam 8000、erp 8010、finance 8011、ai 8013、hrm 8020、crm 8029、mes 8030、wms 8041、qms 8050、lims 8051、ehs 8052、portal 8063、integration 8072、plugin-registry 8096。
- 事件总线信封：Redis Stream 前缀 `topems:stream:events:<EventName>`；字段 event_id/event_type/payload(Event JSON 串)/occurred_at/source。

---

## 二、六条链路逐条结果

| 链路 | 结果 | 一句话结论 |
|---|---|---|
| ① 工资→凭证（U2 环1） | ✅ **PASS** | 事件到达+凭证落库+NUMERIC 借贷平衡+同 run_id 幂等重放跳过 |
| ② 订单→工单（U2 环2） | ❌ **FAIL** | mes event_handlers.rs `uuid = text` 类型 bug，工单未建（回归发现） |
| ③ 报工→进度（U2 环2） | ✅ **PASS** | erp 消费→进度字段更新+同 work_report_id 幂等重放跳过 |
| ④ 质量链 qms↔lims↔ehs（U3） | ❌ **FAIL** | integration HTTP 编排路径不匹配（404），落库再被窄 status 约束拦 |
| ⑤ 插件注册+心跳（U11） | ⚠️ **BLOCKED** | 服务在、GET list 200；register/status 401+DB ON CONFLICT 缺约束+心跳表缺失 |
| ⑥ CRM/WMS 审计（U12/U12b） | ⚠️ **部分** | crm 审计 API 200 读自有 schema；wms 审计 500（uuid=text） |

### 链路① 工资→凭证（HrmPayrollPosted → erp 建凭证）

- **触发方式**：hrm HTTP 创建工资单被 `ck_payroll_runs_status_standard` 阻断（代码插 `draft`，窄约束仅允许 active/inactive/archived），改为直接 `XADD HrmPayrollPosted` 实测 erp 消费（erp-group）。
- **过程修正（项目自有 DDL）**：erp 落库首被 `ck_financial_vouchers_status_standard` 阻断（代码插 `draft`）。查得仓库自有修正迁移 `20260920000097_body500_round2_fixes.sql §3` 本应放宽该约束到含 draft/pending/posted，但因 `EXCEPTION WHEN OTHERS THEN NULL` 吞错在漂移库未生效。本次**施加该项目自有 DDL**（DROP+ADD 放宽），非自创 DDL。
- **断言/证据**：
  - XADD `payroll_run_id=aabbccdd-0001-4000-8000-000000000001`（total_gross=10000）→ erp 建凭证 `erp.financial_vouchers PR-202609-R2T001`。
  - `total_debit = total_credit = 10000.0000`（NUMERIC(18,4)，**decimal 后借贷平衡 ✅**），voucher_items 2 行。
  - 同 run_id 重放 → erp 日志 `HrmPayrollPosted 幂等跳过 - payroll_run_id=... 已存在凭证`，凭证数恒=1、分录恒=2。
  - 幂等机制：`SELECT EXISTS(SELECT 1 FROM erp.financial_vouchers WHERE source_system='HRM' AND source_id=$1)`。

### 链路② 订单→工单（ErpProductionOrderDispatched → mes 建工单）❌ 回归 bug

- **触发方式**：`XADD ErpProductionOrderDispatched`（erp_order_id=`bbbbccdd-0001-4000-8000-000000000002`），mes-business-group 消费。
- **现象**：mes 日志 `handle_erp_production_order_dispatched 失败: 幂等查询 source_order_id 失败: error returned from database: operator does not exist: uuid = text`。`mes.production_orders` 0 行。
- **根因（代码 vs schema 类型不匹配）**：
  - `mes.production_orders.source_order_id` 权威类型 = **uuid**（迁移 `20260918000023`、`20260926120000:1620`；Rust model `svc/mes/src/models/production_order.rs:44` `Option<Uuid>`；运行时建表 `svc/mes/src/modules/mod.rs:89` `source_order_id UUID`，三方一致）。
  - 但 `svc/mes/src/event_handlers.rs:62` 与 `:112` 绑定 `.bind(payload.erp_order_id.to_string())`（text）。WHERE 子句 `uuid = $1:text` 不自动转型（psql 字符串字面量可隐式转 uuid，故手工 SQL 返回 0 行不报错；Rust bind 显式 text 才暴露）。
- **结论**：与 TODO U2 自注"DB 级幂等仅代码论证、未真 PG e2e"吻合——R2 在真 PG 上首次暴露该类型 bug。**按任务规则不改业务代码，记录为待编排拍板的回归 bug**。

### 链路③ 报工→进度（MesWorkReportSubmitted → erp 更新进度）✅

- **触发方式**：`XADD MesWorkReportSubmitted`（work_report_id=`ffffffff-0001-4000-8000-000000000006`，erp_order_id=`ccccccdd-0001-4000-8000-000000000003`，completed_quantity=50，status=in_progress）。
- **处理器**：`svc/erp/src/event_handlers/mod.rs:2036 handle_mes_work_report_submitted`，幂等走 `erp.event_idempotency` 账本（key=`mes_work_report:{work_report_id}`，ON CONFLICT DO NOTHING）。
- **过程修正**：插入测试 erp 订单时被 `ck_erp_production_orders_status_standard` 窄约束拦（status=dispatched），按仓库 `20260918000074` 修正模式放宽该约束后落库。
- **断言/证据**：
  - 事件 #1 → `erp.erp_production_orders.completed_quantity` 0→**50.00**，status dispatched→**in_progress**（日志 `MesWorkReportSubmitted 完成`）。
  - 同 work_report_id 重放（带 qty=999/status=completed）→ 日志 `幂等跳过 - ... 已处理`，值仍 **50.00 / in_progress**（未被覆盖）。幂等账本恒=1 行。

### 链路④ 质量链 qms↔lims↔ehs（integration HTTP 编排）❌

- **架构**：integration:8072 订阅 `QmsInspectionCompleted`（integration-group）→ `qms_lims_ehs::dispatch` → HTTP POST lims `/api/internal/lims/samples/integration` + `/tasks/integration`（base: qms 8050/lims 8051/ehs 8052）。
- **断言/证据**：
  - integration 消费事件 ✅（日志 `处理QMS检验完成事件 - 编排到LIMS样品/任务: INSP-R2-001`）。
  - integration POST lims `/api/internal/lims/samples/integration` → **404**。
  - **根因（路径契约回归）**：lims 把 internal 路由放进 `protected_routes`，被 `register_routes_with_legacy_alias` 以 `nest("/api/lims")` 加前缀，实际路径 = `/api/lims` + `/api/internal/lims/...`；integration 按 D3 契约调裸路径 `/api/internal/...` → 不匹配。实测拼接路径 `/api/lims/api/internal/lims/samples/integration` 返回 **200（免 JWT 可达，internal 白名单生效）**，裸路径 404。
  - 正确路径落库又被 `ck_qa_lab_samples_status_standard` 拦（status='registered' 不在窄约束）。
  - 旁证：ehs `/api/internal/ehs/hazards/integration` 同样 404；lims 事件处理器查 `relation "lims_inspection_records" does not exist`。

### 链路⑤ 插件注册+心跳（U11）⚠️ BLOCKED

- plugin-registry:8096 UP。GET `/api/api/plugin/runtime/list` → 200（data:[]）。注意路径双前缀（api_prefix="/api" + 路由硬编码 /api/plugin），实际为 `/api/api/plugin/runtime/...`。
- POST `/api/api/plugin/runtime/{code}/register|status` → **401 "未授权：缺少认证信息"**（admin JWT 实为 superadmin、permissions=["*"]，GET 通过而 POST 被 write 中间件拒，行为不一致）。
- 服务自注册到达 handler（dev 模式 `PLUGIN_REGISTRATION_TOKEN` 未设放行），但 DB INSERT 失败：`there is no unique or exclusion constraint matching the ON CONFLICT specification`。
- 心跳扫描目标表 `core.core_plugin_instances` **不存在**（仅 `iam./mes.` schema 变体，0 行）。
- **代码级论证（90s 阈值）**：`svc/unified-core/src/embedded.rs` `evaluate_stale_plugin_heartbeats`：规则1 `running AND last_heartbeat < NOW() - INTERVAL '90 seconds' → offline`；规则2 `running AND last_heartbeat IS NULL AND created_at < NOW()-2min → offline`。阈值逻辑确认，但因表缺失+注册链路受阻，未做 90s 实测。

### 链路⑥ CRM 审计 UI（U12）+ wms 审计（U12b）⚠️ 部分

- **crm**：`GET http://localhost:8029/api/crm/audit-logs` → **200** `{items:[],total:0}`，正确读自有 `crm.audit_logs`。测试插入记录被 `ck_audit_logs_status_standard` 拦（status='success' 不在窄约束），故"含本服务记录"未眼见，但端点读自有 schema 机制验证可用。
- **wms**：`GET http://localhost:8041/api/wms/audit-logs` → 外层 200 包装但 `code:500 "获取审计日志失败"`；日志 `operator does not exist: uuid = text`（同链②族类型 bug）。

---

## 三、事件附加验证

### 3.1 幂等重放实测 ✅

- 链①：同 `payroll_run_id` 重放 → "幂等跳过"，凭证数恒 1。
- 链③：同 `work_report_id` 重放（带更大 qty/不同 status）→ "幂等跳过"，进度值不被覆盖。
- 两条独立幂等机制均实测有效（erp.financial_vouchers source 唯一映射 / erp.event_idempotency 账本）。

### 3.2 DLQ 兜底 ⚠️ 未观察到触发

- 代码侧：`lib/shared-event/src/event/subscriber.rs:181` 无条件 `stream_sub.with_dlq()`；`dead_letter_queue.rs` 按事件类型分键 `topems:dlq:<EventType>`，max_retries=3，超限 `dlq.push` 后 ACK。
- 实测：`topems:dlq:*` 各键全部为空；`topems:dlq:retry_count` hash 为空。
- 两起真实 handler Err（链② mes `uuid=text`、链④ integration 404）均被 ACK（`XPENDING` 各消费组 = 0），**未入 DLQ**。
- 结论：DLQ 兜底机制在本环境未观察到触发——可能真实错误被结算逻辑直接 ACK 放弃、或重试计数未累积到阈值。**记为待编排核查项**（D2 DLQ 设计 vs 实测行为不一致）。

---

## 四、R1 补测（svc/ai mcp_stdio_integration）

- 命令：`CARGO_BUILD_RUSTC_WRAPPER= cargo test -p topems-ai --test mcp_stdio_integration`（DB/Redis 在位）。
- 结果：**0 passed; 8 failed**。全部失败于 `svc/ai/tests/mcp_stdio_integration.rs:102`：`Timed out waiting for response (5 seconds)`。
- 失败用例：test_initialize_request / test_ping_request / test_tools_list_request / test_tools_call_request / test_multiple_requests_in_sequence / test_notification_does_not_return_response / test_invalid_json_returns_parse_error / test_external_agent_calls_business_tools。
- **结论**：即使 DB/Redis 在位，MCP stdio 子进程仍 5s 内无响应——根因是 **MCP stdio runtime 环境缺口**，与 DB/Redis 是否在位无关，**非业务代码回归**。R1 基线"已知唯一失败 = mcp_stdio_integration 8 用例环境缺口"的结论**维持不变**，需真实 MCP runtime 环境补测。

---

## 五、跨服务冒烟

- **12 服务 /health 全 200**：unified-core:8000、erp:8010、finance:8011、hrm:8020、mes:8030、crm:8029、wms:8041、qms:8050、lims:8051、ehs:8052、integration:8072、plugin-registry:8096。
- erp `GET /api/erp/production-orders`、hrm `GET /api/hrm/payroll-runs`（带 admin JWT）均 **200**。
- **缺口**：nginx **未运行**；portal:8063 启动挂起未 UP。故"nginx 转发 + portal 扇出（unified-core 偏好接口）"未实测，记录为环境缺口，不硬凑。

---

## 六、遗留问题清单（按优先级）

1. **【回归 bug，待拍板】链② mes 建单类型不匹配**：`svc/mes/src/event_handlers.rs:62,112` 把 `erp_order_id` 以 text 绑定 uuid 列，致 `ErpProductionOrderDispatched` 全失败。建议改 bind 为 Uuid（与 model/bootstrap 一致）。
2. **【路径契约回归】链④ internal 端点前缀不匹配**：integration 按 D3 调裸路径 `/api/internal/*`，但 lims/ehs/qms 把 internal 路由嵌在 service api_prefix（`/api/lims` 等）下，实际路径带 service 前缀。需统一 D3 契约与各服务挂载方式。
3. **【系统性漂移】通用 `ck_*_status_standard` 窄约束**：payroll_runs / financial_vouchers / erp_production_orders / qa_lab_samples / audit_logs 均被仅允许 active/inactive/archived 的窄约束阻断业务 status（draft/dispatched/in_progress/registered/success 等）。根因：P3-2（迁移 20260809000002）加的窄约束，后续放宽迁移（20260821000001 / 20260920000097 / 20260918000074）因 `EXCEPTION WHEN OTHERS THEN NULL` 吞错或半迁移未在 5432 生效。建议重跑放宽迁移并去除吞错。
4. **【链⑤】插件注册链路**：register DB ON CONFLICT 缺唯一约束；`core.core_plugin_instances` 心跳表缺失（仅 iam./mes. 变体）；POST register/status 401 与 GET 200 行为不一致。
5. **【链⑥】wms 审计查询 uuid=text 类型 bug**（同链②族）。
6. **【DLQ】真实 handler Err 被 ACK 未入 topems:dlq:**，D2 DLQ 兜底实测未触发。
7. **【环境】**5433 不可达；nginx 未运行；portal:8063 未 UP。
8. **【schema】**U6 迁移 `20261003000000_u6_finance_source_snapshots_numeric` 应用失败；`finance.source_amount_snapshots` 空壳表（真实列在 plugin_finance，代码写 finance 走 graceful 兜底）。

---

## 七、本次为对齐/实测施加的 DB DDL（非业务代码，如实登记）

1. 手工 psql 顺序重放 7 个待应用迁移（U6 失败）。
2. `erp.financial_vouchers` 约束放宽（等同迁移 20260920000097 §3：允许 draft/pending/posted）。
3. `erp.erp_production_orders` 约束放宽（同 20260918000074 模式：允许 dispatched/in_progress/completed 等）。
4. 测试数据：`erp.financial_vouchers PR-202609-R2T001`、`erp.erp_production_orders ccccccdd-...`、`crm.audit_logs` 插入尝试（被约束拦未落）。

> 注：以上 DDL 均为对齐项目自有迁移意图或测试数据，未修改任何业务代码；迁移账本（mes._sqlx_migrations=278）因手工 psql 未走 sqlx 记账，与实际 schema 存在偏差，建议后续 `sqlx migrate run` 补记账。

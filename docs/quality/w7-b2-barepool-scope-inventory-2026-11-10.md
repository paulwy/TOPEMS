# W7 B2 · 裸池清理与 scope 化清单（阶段产出）

> 日期：2026-11-10
> 范围口径：用户给的「pm 24 / integration 14 / mobile 12 / gis 3 / ai 2 = 55 处裸池查询」
> + 「`svc/pm/src/modules/mod.rs`、`svc/mobile/src/modules/oa.rs` 两处回退默认租户 …0001」
> 状态：**只读盘点完成，未改任何代码**。本文为改造清单与阻塞项，不含实测结果。

---

## 0. 结论摘要

| 项 | 数字 | 说明 |
|---|---|---|
| 用户口径 55 处文本命中 | 55 | `state.pool` / `self.pool` 文本 grep |
| 其中**真裸 PgPool Executor** | **16** | integration 14 + ai 1（另有 1 处为字段赋值） |
| 其中已走 `Db::scope*` 或非查询 | **39** | 见 §1.2，**不需要改** |
| nil/兜底 SQL 分支 | **79 处 / 25 文件** | 5 种变体，见 §3（比原估 53 处多 26 处） |
| 默认租户兜底 | 2 处 | `effective_tenant_id`、`oa.rs` 的 `tenant_id()/tenant_filter()` |
| **范围外新增裸池** | **integration 7 文件 90 处 `&PgPool`** | 见 §2，**B2 上 FORCE 后必炸，需决策** |

**阻塞结论：按当前「55 处」范围改完，B2 六笔迁移上窗口后会立刻打挂 integration 的 5 条同步链路**
（`erp_wms_sync` / `hrm_finance_sync` / `crm_erp_sync` / `crm_scm_sync` / `async_task_queue`），
它们全部以 `pool: &PgPool` 参数形式拿裸连接，不设租户 GUC。详见 §2、§5-D1。

---

## 1. 55 处逐条清单

### 1.1 口径拆分

| 服务 | 命中 | 真裸池 | 已作用域 / 非查询 |
|---|---:|---:|---:|
| pm | 24 | 0 | 24（23 × `scope*` + 1 × `FromRef`） |
| integration | 14 | **14** | 0 |
| mobile | 12 | 0 | 12（11 × `scope*` + 1 × `FromRef`） |
| gis | 3 | 0 | 3（1 × `FromRef` + 2 × `check_health`） |
| ai | 2 | 1 | 1（`with_pool` 字段赋值） |
| **合计** | **55** | **16** | **39** |

### 1.2 已作用域 / 非查询（39 处，无需改）

| 文件 | 行 | 函数 | 现状 |
|---|---|---|---|
| `svc/pm/src/modules/settlement.rs` | 83/130/464/679 | get_project_settlements / get_settlement / get_settlement_items / get_settlement_adjustments | `scope_read()` |
| 同上 | 173/249/320/510/574/626/719 | create/update/approve settlement、item、adjustment | `scope()` |
| `svc/pm/src/modules/project.rs` | 186/443/788/927/1354/1452 | list_projects / get_project / dashboard / gantt / kanban / milestones | `scope_read()` |
| 同上 | 281/515/697 | create/update/delete_project | `scope()` |
| `svc/pm/src/modules/project_approval.rs` | 89/192/287 | get_approval / submit_approval / handle_approval_action | `scope_with(txn)` |
| `svc/pm/src/shared/mod.rs` | 39 | `from_ref` | `impl FromRef<AppState> for Db`（`state.pool` 本身就是 `Db`） |
| `svc/mobile/src/shared/mod.rs` | 937/964/1015/1065/1115 | patrol / scan / photo / audio / video 列表 | `scope_read()` |
| 同上 | 994/1044/1094/1144 | 对应创建接口 | `scope()` |
| `svc/mobile/src/modules/mobile_plugin.rs` | 147 | plugin_health_check | `scope_read()` |
| `svc/mobile/src/main.rs` | 197 | list_mobile_tasks | `scope_read()` |
| `svc/mobile/src/shared/mod.rs` | 45 | `from_ref` | `FromRef` |
| `svc/gis/src/embedded.rs` | 40 | `from_ref` | `FromRef` |
| `svc/gis/src/main.rs` | 154/166 | health_check / health_check_detailed | `Db::check_health()`，不查业务表 |
| `svc/ai/src/dsh/rag/mod.rs` | 624 | with_pool | 字段赋值，非查询 |

> 结论：这 39 处不动。真正要改的连接来源是 §1.3 + §2。

### 1.3 16 处真裸池改法

| 文件 | 行 | 函数 | 语句 | 改法 |
|---|---|---|---|---|
| `svc/integration/src/mes_erp_sync.rs` | 570 | find_erp_order_by_mes_id | SELECT | 方法已有 `tenant_id` 参数 → `db.scope_read_for_tenant(tenant_id)` |
| 同上 | 611 | create_sync_record | INSERT | `tenant_id` 参数在 → `db.scope_for_tenant(tenant_id)` |
| 同上 | 641/658 | update_sync_success | UPDATE ×2 | 增加 `tenant_id` 参数（调用方持有 `sync_record.tenant_id`）→ `scope_for_tenant` |
| 同上 | 689 | update_sync_failed | UPDATE | 同上 |
| 同上 | 725 | add_sync_log | INSERT | 同上（`tenant_id` 由调用方传入） |
| 同上 | 746 | retry_failed_sync | SELECT | HTTP 入口 → `db.scope_read()`（请求租户上下文） |
| 同上 | 815 | list_sync_records | SELECT | HTTP 入口 → `db.scope_read()` |
| 同上 | 835 | get_sync_record | SELECT | HTTP 入口 → `db.scope_read()` |
| 同上 | 852 | get_sync_logs | SELECT | HTTP 入口 → `db.scope_read()` |
| `svc/integration/src/sync_scheduler.rs` | 326 | execute_single_sync | 传给 `sync_incremental_all(&PgPool,…)` | 见 §2：入口改为 `scope_for_tenant(conn.tenant_id)`，`sync_incremental_all` 签名改 `&Db` |
| 同上 | 403 | get_active_connections | SELECT 全租户扫描 | **有意跨租户运维路径** → `db.scope_read_system()`（见 §5-D4） |
| 同上 | 472/504 | update_sync_success / update_sync_failure | UPDATE erp_connections | 增加 `tenant_id` 参数（`conn.tenant_id`）→ `scope_for_tenant` |
| `svc/ai/src/dsh/rag/mod.rs` | 748 | perform_retrieval | SELECT | 由请求链调用 → `db.scope_read()`；`Option<PgPool>` 改 `Option<Db>` |

改造形态统一：`MesErpSyncService.pool: PgPool` → `db: Db`；`SyncScheduler.pool: PgPool` → `db: Db`；
`RagEngine.pool: Option<PgPool>` → `Option<Db>`。构造点（`mes_erp_sync::new`、`SyncScheduler::new`、
`start_sync_scheduler`、`routes.rs::with_pool`）同步改类型，调用方传 `Db`。

> `scope_read()` 在无租户上下文时返回
> `Protocol("RLS context missing: 无租户上下文…")`，正是要求 1 的行为；不兜底 0001、不兜底 nil。

---

## 2. 范围外裸池：integration 7 文件 90 处 `&PgPool`

这些是**模块级函数参数**风格（`pub async fn xxx(pool: &PgPool, …)`），
`state.pool|self.pool` 文本 grep 抓不到，但同样在 B2 表上读写：

| 文件 | `&PgPool` 出现次数 | 涉及 B2 表 |
|---|---:|---|
| `svc/integration/src/erp_wms_sync.rs` | 22 | `integration.erp_wms_sync`、`integration_sync_logs` |
| `svc/integration/src/hrm_finance_sync.rs` | 19 | `integration.hrm_finance_sync` |
| `svc/integration/src/crm_erp_sync.rs` | 19 | `integration.crm_erp_sync` |
| `svc/integration/src/crm_scm_sync.rs` | 18 | `integration.crm_scm_sync` |
| `svc/integration/src/async_task_queue.rs` | 10 | `integration.async_tasks` |
| `svc/integration/src/main.rs` | 1 | 构造/传参 |
| `svc/integration/src/schema_defense.rs` | 1 | 迁移校验，非业务 |

已确认这些模块内**没有任何** `set_config('app.tenant_id')` / `scope_*`（全仓 grep 仅命中 §3 的内联 SQL）。
B2 开 FORCE 后，它们以应用角色执行时 `tenant_id = NULLIF(current_setting(...))::uuid` 恒为 NULL，
读 0 行、写触发 42501 —— 会直接打挂这 5 条链路。

另：`svc/pm/src/modules/project_approval.rs` 的 `approval_pool: PgPool`（L236/413/503）
仅用于写 `public.audit_logs`（非 B2 108 表），本轮不改，见 §5-D3。

**处理建议（需确认）**：这 90 处按同一模式线程化 `Db`，工作量 ≈ 5 个文件的签名与调用点；
不并入则 B2 不能上窗口。建议并入本批，或在窗口方案里改为「先上 B2 → 立即热修这 5 条链路」的禁止选项。
见 §5-D1。

---

## 3. nil / 兜底 SQL 分支：79 处 / 25 文件

### 3.1 五种变体

| 变体 | 形态 | 处数 | 改法 |
|---|---|---:|---|
| **B**（短式） | `AND (NULLIF(NULLIF(current_setting('app.tenant_id',true),''),'…0000')::UUID IS NULL OR tenant_id = COALESCE(NULLIF(...),'…0000'))` | 53 | **整段删除**（含前导 `AND`）。所在语句已在 `scope*` 内，隔离交给 FORCE RLS。不改写成 `tenant_id = COALESCE(...)`，否则超管（nil 系统通道）会「少读」 |
| **A**（长式） | `AND (current_setting(...,true) IS NULL OR ... = '' OR ... = '…0000' OR tenant_id IS NULL OR tenant_id = NULLIF(...,'')::UUID)` | 9 | 同上，整段删除 |
| **C**（mobile） | `AND (COALESCE(NULLIF(...,''),'…0000') IS NULL OR tenant_id = COALESCE(NULLIF(...,''),'…0000'))` | 7 | 同上。`COALESCE(...)` 恒非 NULL，前半支永远为假，纯冗余 |
| **D**（常量） | `TENANT_SQL = COALESCE(NULLIF(...,''),'…0000')`，INSERT 列值用它 | 1 | 删常量，INSERT 的 `tenant_id` 改显式绑定（见 §4 决策） |
| **E**（INSERT 兜底） | `VALUES (…, COALESCE(NULLIF(current_setting('app.tenant_id',true),'')::uuid,'…0000'::uuid))` | 8 | 同上，改显式绑定，不在 SQL 侧读 GUC 兜底 |
| 合计 | | **79**（原估 53 + A 9 + C 7 + D 1 + E 9，去重后 79） | |

> E 计数：integration 8（events 1、lims_qms 1、mes_erp 1、sync 4、wms_scm 1）+ mobile 1（offline_records）。
> D 计数：pm `project_type_config.rs` 1（L64 常量，L183 使用）。

### 3.2 逐文件清单（文件 · 函数 · 变体）

**pm（55 处 / 18 文件）**

| 文件 | 处数 | 函数（行） | 变体 |
|---|---:|---|---|
| `acceptance.rs` | 4 | update_plan(267) / update_plan_item(466) / delete_plan_item(505) / update_record(728) | B |
| `budget.rs` | 3 | update_budget(348) / update_budget_item(736) / delete_budget_item(778) | B |
| `contract.rs` | 10 | update_contract(285) / delete_contract(378) / submit_contract(465) / approve_contract(560) / reject_contract(655) / update_contract_milestone(855) / delete_contract_milestone(897) / update_payment_schedule(1052) / update_template(1245) / delete_template(1285) | B |
| `document.rs` | 5 | update_document(222) / delete_document(263) / create_document_version(384) / update_folder(568) / delete_folder(606) | B |
| `notification.rs` | 1 | update_setting(267) | B |
| `project_approval.rs` | 2 | handle_approval_action(386/483) | B |
| `project_expense.rs` | 4 | list_expenses(81) / get_expense(214) / update_expense(280) / remove_expense(341) | B |
| `project_member.rs` | 2 | update_member(251) / delete_member(310) | B |
| `project_milestone.rs` | 2 | update_milestone(277) / delete_milestone(338) | B |
| `project_phase.rs` | 2 | update_phase(285) / delete_phase(348) | B |
| `project_resource.rs` | 1 | update_resource(290) | B |
| `quality.rs` | 2 | update_quality_check(246) / update_defect(450) | B |
| `report.rs` | 2 | update_template(533) / delete_template(571) | B |
| `risk.rs` | 1 | update_risk(290) | B |
| `settlement.rs` | 4 | update_settlement(265) / approve_settlement(334) / update_settlement_item(591) / delete_settlement_item(636) | B |
| `task.rs` | 7 | list_tasks(121/139) / list_tasks_by_project(202/215) / get_task(342) / update_task(380/411) | A |
| `project.rs` | 2 | list_projects(204) / get_project(461) | A |
| `project_type_config.rs` | 1 | 常量 `TENANT_SQL`(64) → INSERT(183) | D |

**integration（13 处 / 6 文件）**

| 文件 | 处数 | 函数（行） | 变体 |
|---|---:|---|---|
| `external_erp.rs` | 2 | delete_company_mapping(1988) / delete_entity_mapping(2080) | B（且含 `tenant_id::text` 列侧 cast，一并删） |
| `handlers/conversion_rules.rs` | 1 | execute_conversion_rule_api(438) | B |
| `handlers/lims_qms.rs` | 1 | sync_lims_qms(242) | B |
| `handlers/wms_scm.rs` | 1 | sync_wms_scm(219) | B |
| `handlers/events.rs` | 1 | create_event(209) | E |
| `handlers/lims_qms.rs` | 1 | create_lims_qms_sync(104) | E |
| `handlers/mes_erp.rs` | 1 | create_mes_erp_sync(118) | E |
| `handlers/sync.rs` | 4 | create_task(164) / trigger_scm_wms(597) / trigger_wms_crm(664) / trigger_srm_scm(732) | E |
| `handlers/wms_scm.rs` | 1 | create_wms_scm_sync(103) | E |

**mobile（8 处 / 5 文件）**

| 文件 | 处数 | 函数（行） | 变体 |
|---|---:|---|---|
| `db/repository.rs` | 3 | db_update_offline_operation_status(512) / db_create_or_update_sync_policy(563) / db_update_push_notification_stats(724) | C |
| `modules/media.rs` | 1 | delete_media(451) | C |
| `modules/missing_endpoints.rs` | 1 | update_push_template(369) | C |
| `modules/offline.rs` | 1 | sync_offline_data(153) | C |
| `modules/offline_records.rs` | 1 | mark_synced(221) | C |
| `modules/offline_records.rs` | 1 | sync_records(86) | E |

**gis（3 处 / 3 文件）**

| 文件 | 处数 | 函数（行） | 变体 |
|---|---:|---|---|
| `modules/location.rs` | 1 | update_location(242) | B |
| `modules/map.rs` | 1 | update_map(256) | B |
| `modules/marker.rs` | 1 | update_map_marker(214) | B |

**ai：0 处**（无 nil 分支、无内联租户兜底）。

---

## 4. 两处默认租户 …0001

| 文件 | 函数 | 现状 | 改法 |
|---|---|---|---|
| `svc/pm/src/modules/mod.rs` | `effective_tenant_id(ctx, claims)`（L72-87） | 超管 → 硬编码 `…0001`，否则 `ctx.tenant_id`。调用点：`project_resource.rs:137`、`budget.rs:275/277/676`、`notification.rs:120/122/216`（均为 INSERT 列值） | 删除超管分支；改为「普通租户 = `claims.tenant_id`；超管/服务身份 = 显式租户（`x-tenant-id`），缺失报 `Protocol("RLS context missing…")`」。取值口径见 §5-D2 |
| `svc/mobile/src/modules/oa.rs` | `tenant_id()`（L17-19）、`tenant_filter()`（L21-27） | `tenant_id()` 硬编码 `…0001`（`Uuid::parse_str(...).unwrap_or(Uuid::nil())`），被 22 处绑定为 `WHERE tenant_id = $1`；`tenant_filter()` 超管 → `None`（不过滤） | `tenant_id()` 改为取请求租户；SQL 的 `tenant_id = $1` → `($1::uuid IS NULL OR tenant_id = $1)`，超管传 `NULL` 由 RLS 系统通道全量。另：`list_meetings` L224 的 `COUNT(*) … .unwrap_or(0)` 要改成 `?` 透传，禁止把错误吞成 0 行 |

---

## 5. 阻塞与决策点

### D1（阻断窗口）integration 90 处 `&PgPool` 是否并入本批
- 不并入：B2 FORCE 上线即打挂 `erp_wms_sync` / `hrm_finance_sync` / `crm_erp_sync` / `crm_scm_sync` / `async_task_queue`。
- 建议：并入。改造方式统一为「函数首参加 `&Db`，内部 `scope_for_tenant(tenant_id)` / `scope_read_for_tenant`」，
  调度入口 `execute_single_sync` 已有 `conn.tenant_id`。
- 需你确认是否接受本轮工作量扩到 ~90 个函数签名。

### D2 超管/服务身份写租户表时 `tenant_id` 取什么
现状：`…0001` 兜底。候选：
1. **要求显式租户**（`x-tenant-id`），缺失 400 / `Protocol`；最符合「不兜底」，但超管建单要带 header；
2. 落 `NULL`：`pm.budgets`/`pm.notifications`/`pm.project_resources`/`integration.conversion_rules`/`mobile.core_mobile_offline_records` 均为 `NOT NULL`，会直接失败；
3. 落 nil UUID：不被普通租户看见，超管经系统通道可见；与 middleware 对超管固定 nil 上下文一致，但不是「NULL 全局行」。

建议 1，退化路径 3。**需你拍板**，这决定 §3 变体 D/E 与 §4 的绑定值。

### D3 `public.audit_logs` 的审计池（pm/gis/ai `services/audit.rs` + `approval_pool`）
不属于 B2 108 表，本轮不动；若 B1 已对 `public.audit_logs` 收口，则这些审计写入同样会在 FORCE 后失败。
建议单列一笔待办（不在本批）。

### D4 有意跨租户的运维路径
`sync_scheduler.rs::get_active_connections`（扫描全部 `erp_connections`）必须跨租户，改 `scope_read_system()`，
**注明为系统通道例外**，不做成按请求租户过滤（否则调度器少读连接）。

---

## 6. 单列待办（本轮不改，不混入本批）

### T1 本地库落后 23 条迁移
- 本地 `topems` 账本 572 条、max `20261109101400`；缺 23 条（含 p5 批次与 B1 全部）。
- 生产账本快照 `20261109140200`（`docs/quality/prod_schema_live_20261109.json`）。
- 处理方式：在隔离库 `createdb -T topems` + `apply-forward.sh --anchor 20261109101400` 前向补齐（已演练，未改主库）。

### T2 8 张 `tenant_id` 漂移表（本地有列、生产无列）
`gis.audit_log`、`gis.audit_logs`、`gis.geodata`、`gis.geofeatures`、`gis.geofence_alerts`、
`gis.map_layers`、`gis.spatial_analysis`、`pm.service_integrations`。
漂移方向：**本地多 `tenant_id`，生产无**；因此未纳入 B2 108 表。
需单独确认：是本地误加列，还是生产漏迁移；修法为对齐生产（删本地列）或补生产迁移，二选一。

---

## 7. 下一步（待 D1/D2 确认后）

1. 按 §1.3 改造 16 处真裸池；按 §3 删除 79 处 nil/兜底分支；按 §4 处理 2 处默认租户。
2. （若 D1 通过）线程化 integration 5 个同步模块 90 处 `&PgPool`。
3. `cargo build --workspace` + `check-rls-policy-shape.sh` + `check-destructive-sql.mjs --strict` 全绿。
4. 起本地服务，用真实 token 在租户上下文逐条打通 55 处对应接口；再验「无上下文 → `Protocol`」「跨租户 → 拒绝」，
   并逐条对比改造前后可见行数（期望：同租户 = 0 差异；超管 = 0 差异；跨租户 = 均 0 行）。
5. 与 B2 六笔迁移同批出窗口方案（停写时长、备份、顺序、验收数字、回滚）。

---

# 8. 定稿改造清单（D1/D2/D4 已确认，2026-11-10）

## 8.0 三条铁律

1. **连接来源**：`pool: &PgPool` → `db: &Db`；每条 SQL 各自开作用域（`scope_for_tenant` / `scope_read_for_tenant` /
   `scope` / `scope_read` / `scope_*_system`），保持现有「逐语句自动提交」的事务边界不变，不合并成大事务。
   已有 `scope_with(&mut txn)` 的 HTTP handler 继续复用请求事务。
2. **租户来源**：只认三处 —— 请求上下文（`Db::scope*` 内部取 `current_request_tenant()`）、
   调用方显式传入的 `tenant_id`、记录行自身的 `tenant_id`。缺失一律 `Protocol("RLS context missing…")`，
   不兜底 `…0001`、不兜底 nil、不 `unwrap_or_default`。
3. **删除即删除**：79 处 nil/兜底谓词整段删，不改写成任何 `tenant_id = COALESCE(...)` / `($1 IS NULL OR …)` 变体
   （`oa.rs` 的 `tenant_id = $1` 除外，见 8.4，那里是超管系统通道需要的「无过滤」语义）。

> 编译可达性核实：`async_task_queue` 在 `lib.rs` 已被注释（`// pub mod async_task_queue; // DISABLED`），
> 不参与编译。`hrm_finance_sync` / `crm_erp_sync` / `crm_scm_sync` 有 `pub mod`，**参与编译但全仓无调用方/无路由**；
> `erp_wms_sync` 参与编译，唯一活链路是 `sync_scheduler → sync_incremental_all`。

## 8.1 连接来源改造（必改 16 处 + 参数式 90 处）

### 8.1.1 `svc/integration/src/mes_erp_sync.rs`（10 处，活链路：HTTP）

| 函数 | 行 | 改法 | 事务/错误语义 |
|---|---|---|---|
| `find_erp_order_by_mes_id` | 570 | 已有 `tenant_id` → `db.scope_read_for_tenant(tenant_id)` | 单语句，不变 |
| `create_sync_record` | 611 | 已有 `tenant_id` → `db.scope_for_tenant(tenant_id)` | 单语句，不变 |
| `update_sync_success` | 641/658 | 增加 `tenant_id: Uuid` 形参 → `scope_for_tenant` | 单语句，不变 |
| `update_sync_failed` | 689 | 增加 `tenant_id` → `scope_for_tenant` | 单语句，不变 |
| `add_sync_log` | 725 | 增加 `tenant_id` → `scope_for_tenant` | 单语句，不变 |
| `retry_failed_sync` | 746 | `db.scope_read()`（HTTP 请求租户读记录）；后续 `sync_erp_to_mes/sync_mes_progress_to_erp` 用记录行 `tenant_id` | 读→写分属两次作用域，与原自动提交一致 |
| `list_sync_records` | 815 | `db.scope_read()` | 不变；无上下文时返回 `Protocol` |
| `get_sync_record` | 835 | `db.scope_read()` | 同上 |
| `get_sync_logs` | 852 | `db.scope_read()` | 同上 |

结构：`MesErpSyncService { pool: PgPool }` → `{ db: Db }`；`new(pool, …)` → `new(db, …)`；
`handlers/mes_erp.rs` 调用处传 `state.db.clone()`。

### 8.1.2 `svc/integration/src/sync_scheduler.rs`（4 处，后台）

| 函数 | 行 | 改法 | 语义 |
|---|---|---|---|
| `get_active_connections` | 403 | `db.scope_read_system()` + 注释「运维视图，跨租户」 | 仍全量（D4） |
| `execute_single_sync` | 326 | 改为调用 `sync_incremental_all(&self.db, tenant_id, …)` | 保持逐语句提交 |
| `update_sync_success` | 472 | 增加 `tenant_id` 形参（`conn.tenant_id` 解析值）→ `scope_for_tenant` | 单语句 |
| `update_sync_failure` | 504 | 同上 | 单语句 |

`SyncScheduler { pool: PgPool }` → `{ db: Db }`；`start_sync_scheduler(db: Db)`；`main.rs:121` 改传 `db`。

### 8.1.3 `svc/ai/src/dsh/rag/mod.rs`（1 处，HTTP）

`perform_retrieval` L748：`RagEngine { pool: Option<PgPool> }` → `{ db: Option<Db> }`，`with_pool` 改名/改签名收 `Db`，
查询改 `db.scope_read()`；`routes.rs:85` 注入点同步。无上下文 → `Protocol`，检索不降级为空结果。

### 8.1.4 `svc/integration/src/erp_wms_sync.rs`（22 处，编译且 scheduler 活链路）

统一：`pool: &PgPool` → `db: &Db`；缺租户的加 `tenant_id: Uuid`。

| 函数 | 现状 | 改法 | 语义变化 |
|---|---|---|---|
| `list_erp_wms_sync` | 已有 `tenant_id` | `scope_read_for_tenant` | 无 |
| `get_erp_wms_sync` | 已有 `tenant_id` | `scope_read_for_tenant` | 无 |
| `create_sync_record` | 绑 `req.tenant_id` | 加 `tenant_id` 形参 → `scope_for_tenant` | 无（仍显式绑 `req.tenant_id`） |
| `update_sync_status` | 无租户 | 加 `tenant_id` → `scope_for_tenant` | 无 |
| `increment_retry_count` | 无租户 | 加 `tenant_id` → `scope_for_tenant` | 无 |
| `sync_order_to_wms` / `sync_stock_to_erp` / `sync_inventory_adjustment` | 已有 `tenant_id` | 透传 `db` + `tenant_id` 给下游 | 无 |
| `fetch_erp_order` / `fetch_wms_stock` / `fetch_erp_inventory_adjustment` / `fetch_wms_inventory_adjustment` | `_pool` 未使用 | **删除 pool 形参** | 无（不查库） |
| `create_wms_transaction` / `update_erp_inventory` / `apply_wms_inventory_adjustment` / `apply_erp_inventory_adjustment` | 无 pool 引用 | 不改 | 无 |
| `get_erp_wms_sync_stats` | 无租户，4 条聚合 | 加 `tenant_id` → `scope_read_for_tenant` | **由「全租户统计」变「本租户统计」**（原实现是跨租户串号，属修正） |
| `retry_failed_sync` | 无租户 | 加 `tenant_id` → 读 `scope_read_for_tenant`、写 `scope_for_tenant` | 无 |
| `execute_sync_by_type` | 已有 `tenant_id` | 透传 | 无 |
| `handle_erp_order_confirmed` / `handle_wms_stock_updated` | 已有 `tenant_id` | 入口 `scope_for_tenant(tenant_id)` | 无 |
| `get_last_sync_time` | 无租户，`MAX(last_synced_at)` 全表 | 加 `tenant_id` → `scope_read_for_tenant` | **由全租户 MAX 变本租户 MAX**（修正跨租户串号） |
| `get_pending_syncs` | 无租户，跨租户捞待同步行 | 加 `tenant_id` → `scope_read_for_tenant` | **由跨租户捞取变本租户捞取**（修正越权；这是本轮唯一「可见行数变少」的点，原因=修复越权） |
| `sync_incremental_orders` / `sync_incremental_stock` / `sync_incremental_all` | 已有 `tenant_id` | 透传 `db` + `tenant_id` | 无 |

### 8.1.5 `hrm_finance_sync.rs` / `crm_erp_sync.rs` / `crm_scm_sync.rs`（56 处，编译但无调用方）

同 8.1.4 模式，按函数套用：

- 已有 `tenant_id`（`list_*` / `get_*` / `sync_*` / `convert_*` / `execute_sync_by_type` / `handle_*`）→ 直接改作用域；
- `create_sync_record` / `update_sync_status` / `increment_retry_count` → 加 `tenant_id` 形参；
- `get_*_stats` → 加 `tenant_id`（语义由全局变本租户）；
- `retry_failed_sync` → 加 `tenant_id`；
- `fetch_*` 中 `_pool` 未使用的 → 删 pool 形参。

**限制**：无路由/无调用方，本地实测无法覆盖，只能靠编译 + 单测（如有）。若你要求「不做无法验证的改动」，
这三个文件可降级为「加 `#[allow(dead_code)]` 登记 + 待办」，但 B2 不影响它们（无运行路径）。**建议按 D1 一并改，实测标注为「未覆盖」。**

### 8.1.6 `async_task_queue.rs`（10 处）—— **建议不改，单列**

`lib.rs` 第 4 行已注释掉 `pub mod async_task_queue;`，不参与编译。改动无法编译校验，属净风险。
若恢复启用，入队/出队租户一致性按以下方案做（写进待办）：

- `enqueue_task`：`INSERT … tenant_id = $n` 显式取任务行租户；
- `dequeue_task`：`scope_read_system()` 认领（跨租户取任务），返回行带 `tenant_id`；
- `complete_task` / `fail_task` / `retry_task` / `mark_max_retries_exceeded`：`scope_for_tenant(task.tenant_id)`；
- `get_task` / `list_tasks` / `get_task_stats` / `cleanup_completed_tasks`：HTTP 入口用 `scope_read()`，清理用 `scope_system()`。

## 8.2 nil / 兜底分支删除（79 处）

逐条清单见 §3.2，删法按变体：

| 变体 | 处数 | 精确删法 |
|---|---:|---|
| B | 53 | 删除 `AND (NULLIF(NULLIF(current_setting(...),''),'…0000')::UUID IS NULL OR tenant_id = COALESCE(...))` 整段（`external_erp.rs` 两处同时删掉 `tenant_id::text` 列侧 cast） |
| A | 9 | 删除 `AND (current_setting(...,true) IS NULL OR … = '' OR … = '…0000' OR tenant_id IS NULL OR tenant_id = NULLIF(...,'')::UUID)` 整段（`project.rs` 两处跨 4 行） |
| C | 7 | 删除 `AND (COALESCE(NULLIF(...,''),'…0000') IS NULL OR tenant_id = COALESCE(...))` 整段 |
| D | 1 | 删 `TENANT_SQL` 常量；`project_type_config.rs:183` INSERT 的 `tenant_id` 改绑 `$8`（值来自 D2 口径） |
| E | 8 | `VALUES (…, COALESCE(NULLIF(current_setting(...),'')::uuid, '…0000'::uuid))` → 改为绑 `$n`，值为 D2 口径的租户；不读 GUC |

事务/错误语义：全部为同一条语句内的谓词删除，**事务边界与错误映射不变**。
唯一可见性变化：普通租户 = 0 差异；超管（系统通道）= 0 差异（原本 `IS NULL` 分支对超管放行，现在由 `rls_system='on'` 放行）；
无上下文 = 由「静默 0 行」变 `Protocol` 报错（符合要求）。

## 8.3 `project_type_config.rs`（变体 D 细化）

- 删 `TENANT_SQL`（L64）与 `format!` 里的 `TENANT_SQL = TENANT_SQL`（L188）。
- `create_config`（L183 INSERT）：`tenant_id` 改为 `$8`，绑定值取 D2 口径。
- 该表是 4 张全局只读表之一（`pm.project_type_configs`），超管允许写全局行；
  普通租户写本租户行。**需在实现时确认该表 `tenant_id` NOT NULL 已被 B2 数据迁移放开**（当前本地为 NOT NULL，见 §8.7 校验项）。

## 8.4 两处默认租户

### 8.4.1 `svc/pm/src/modules/mod.rs::effective_tenant_id`

- 删除 `is_superuser → …0001` 分支。
- 新签名建议 `fn request_tenant(ctx: &TenantContext, claims: &Claims) -> Result<Uuid, (u16,String)>`：
  普通租户 → `claims.tenant_id` 可解析则返回；超管/服务身份 → 读 `x-tenant-id`（`get_tenant_id` 已有 header 回退，
  但必须去掉 `unwrap_or_else(Uuid::new_v4)`），缺失返回 `Protocol`/400。
- 调用点 7 处（`project_resource.rs:137`、`budget.rs:275/277/676`、`notification.rs:120/122/216`）：
  先取租户，取不到直接 400/500 返回，**不进入 INSERT**（满足「宁可 400 也不写 NULL 被库挡住产生半提交」）。
- 语义变化：超管建单从「静默写 0001」变「必须带 `x-tenant-id`，否则 400」。

### 8.4.2 `svc/mobile/src/modules/oa.rs`

- 删 `tenant_id()`（硬编码 0001）与 `tenant_filter()`。
- 新增 `fn req_tenant(ctx/claims) -> Result<Option<Uuid>>`：普通租户 → `Some(uuid)`；超管 → `None`（系统通道，不过滤）。
- 22 处 `tenant_id = $1` → `($1::uuid IS NULL OR tenant_id = $1)`，绑定 `Option<Uuid>`；
  超管 `None` 由 RLS `rls_system='on'` 给全量，不会少读。
- `list_meetings` L224 的 `COUNT(*) … .unwrap_or(0)` → `.await?` 透传（`ApiResponse` 侧转 500），
  全文同类 `unwrap_or(0)` 一并清理（实现时全文件扫一遍）。
- 语义变化：非 0001 租户从「0 行」变「本租户数据」（修复）；超管从「看全量」保持全量。

## 8.5 事务 / 错误语义变化汇总

| 类别 | 事务边界 | 错误语义 | 可见行数变化 |
|---|---|---|---|
| 8.1.1 / 8.1.2 / 8.1.3 | 不变（逐语句） | 新增「无上下文 → `Protocol`」 | 无 |
| 8.1.4 `get_pending_syncs` / `get_last_sync_time` | 不变 | 不变 | **变少**：跨租户 → 本租户（修越权，需在实测里逐条对照） |
| 8.1.4 `get_erp_wms_sync_stats` | 不变 | 不变 | 全局统计 → 本租户统计 |
| 8.1.5 | 不变 | 不变 | 无运行影响（无调用方） |
| 8.2 | 不变 | 无上下文由 0 行变 `Protocol` | 普通租户/超管 = 0 差异 |
| 8.4 | 不变 | 缺租户 → 400/`Protocol` | 超管写路径由兜底 0001 变显式租户 |

## 8.6 不改 / 无法安全改（单列）

1. `async_task_queue.rs`（10 处）：未编译死代码，见 8.1.6；建议不改，恢复启用时按方案执行。
2. `svc/pm/src/modules/project_approval.rs::approval_pool`（3 处）：只写 `public.audit_logs`，非 B2 108 表；本轮不动（D3 待办）。
3. `svc/{pm,gis,ai}/src/services/audit.rs`：同上，写 `public.audit_logs`。
4. `svc/gis/src/main.rs` 的 `check_health`：不查业务表，不改。
5. 三处 `FromRef`：`state.pool` 本身就是 `Db`，不改。

## 8.7 实施顺序与校验点

1. `Db` 类型改造：`mes_erp_sync` → `sync_scheduler` → `sync_incremental_all` 链（先保证活链路编译）。
2. 79 处谓词删除（按 schema 分组：pm → integration → mobile → gis），每改一个文件 `cargo check -p` 该服务。
3. 两处默认租户（pm 先、mobile 后）。
4. 3 个无调用方模块（8.1.5）与 `async_task_queue` 处理。
5. `cargo fmt --all` + `cargo build --workspace` + `scripts/ci/check-rls-policy-shape.sh` +
   `node scripts/ci/check-destructive-sql.mjs --check-file … --strict`（对 6 笔迁移）。
6. 起本地服务实测（见 §7 第 4 步）；`get_pending_syncs` 的「可见行数变少」需给出改造前/后逐租户行数。
7. 校验项：确认 `pm.project_type_configs.tenant_id` 在 B2 数据迁移后已可空（当前本地 NOT NULL，须在 `w7_b2_fresh` 库核对）。

---

# 9. 执行补充要求（2026-11-10 用户确认后追加）

## 9.1 `async_task_queue` 不改（定稿）

- 依据：`svc/integration/src/lib.rs` 第 4 行 `// pub mod async_task_queue; // DISABLED`，模块不参与编译。
- 理由：改动无法通过编译校验、无法本地实测，属净风险；且当前无运行路径，B2 上线不受影响。
- 恢复启用时的租户一致性方案见 §8.1.6，登记为独立待办，不并入本批。

## 9.2 三个无调用方模块照改，实测标注「未覆盖（无调用方）」

`hrm_finance_sync` / `crm_erp_sync` / `crm_scm_sync`（56 处）按 §8.1.5 改造；验证结论只能写「编译通过」，
**不得标成已覆盖**。

## 9.3 三条「少读」必须给改造前/后行数证据

对象：`erp_wms_sync::{get_pending_syncs, get_last_sync_time, get_erp_wms_sync_stats}`。

- 改造前：在本地库用裸池（无租户 GUC）统计实际跨租户取到的行数，并证明包含非本租户 `tenant_id` 的行；
- 改造后：`scope_read_for_tenant(tenant_id)` 下同口径行数；
- 报告给出对照表（租户 0001 / 0002 / 其他）与「改造前确实读到了非本租户数据」的样本 `id + tenant_id`。
- 若本地无跨租户样本数据，需构造最小样本（事务内插入 → 统计 → ROLLBACK），不得只写结论。

## 9.4 `pm.project_type_configs.tenant_id` NOT NULL 的判定口径

- **不以 `w7_b2_fresh` 为准**（新链 schema 与生产不一致，8 张漂移表已证明）。
- 用户要求：在生产库开事务、按顺序实际执行 6 笔迁移 + 校验，然后 `ROLLBACK` 预演。
- 已核 `docs/quality/prod_schema_live_20261109.json`（prod ledger `20261109140200`）：
  `pm.project_type_configs.tenant_id.is_nullable = NO`；其余 3 张全局只读表为 `YES`。
- 已核迁移 `20261110110500` 第 74-83 行：对 4 张表**已内建守卫式 `DROP NOT NULL`**
  （`information_schema.columns.is_nullable='NO'` 时才执行）。因此按现有 6 笔即可，无需第 7 笔。
- 最终结论仍以生产预演为准；预演若发现该列在真实 schema 下不可改（如被视图/约束依赖），再单列第 7 笔。

## 9.5 与「23 条缺失迁移 / 8 张漂移表」彻底分开

- 本批验证结论只能建立在「能代表生产的 schema」上；`w7_b2_fresh` 仅用于跑通脚本，不作为验收依据。
- 凡只在新库验过、未在预演复现的项目，报告里单列「仅新库验证，未在生产 schema 复现」。

## 9.6 生产连接方式（已解除阻塞）

- `.env.production` 的 `DATABASE_URL` 是**生产机本地**地址（`localhost`），本地不可直连。
- 正确通道（B1 同口径）：
  `ssh -o BatchMode=yes xingzhai@192.168.110.115 'PGHOST=/tmp /opt/homebrew/bin/psql -X -v ON_ERROR_STOP=1 -d topems_prod …'`
- 预演方法：单连接 `BEGIN;` → 按序实际执行 6 笔迁移 → 结构/数据断言 → `ROLLBACK;`，
  会话内不出现 `COMMIT`，且 `_sqlx_migrations` 不新增行。DDL 取 ACCESS EXCLUSIVE 锁，
  预演一次跑完，不分批挂起。结果见 §10.4。

---

# 10. 执行结果（2026-11-10）

## 10.1 编译 / format / 门禁

| 项 | 命令 | 结果 |
|----|------|------|
| 编译 | `cargo build --workspace` | 通过（0 error；pm/mobile/gis/ai 0 warning） |
| 格式 | `cargo fmt --all -- --check` | 通过 |
| RLS 策略形态门禁 | `scripts/ci/check-rls-policy-shape.sh` | exit 0 |
| 破坏性 SQL 门禁 | `node scripts/ci/check-destructive-sql.mjs --check-file <each> --strict` | 6/6 通过（无 COMMIT、无 CONCURRENTLY） |

门禁脚本与生产 DDL 分属不同提交（见 §10.7）。

## 10.2 本地实测：三条「少读」改造前/后对照（修越权的举证）

环境：本地 `topems` 库；事务内 `SET LOCAL ROLE topems_app` + 关闭 RLS 模拟改造前裸池，
按租户 GUC 模拟改造后；种入 4 行两租户最小样本，统计后 `ROLLBACK`（结束复查 0 行残留）。

| 函数 | 改造前（裸池，无租户 GUC） | 改造后（`scope_read_for_tenant`） | 证据 |
|------|---------------------------|-----------------------------------|------|
| `get_pending_syncs` | **2 行**（含非本租户 `…00bb`） | 租户 `…0001` **1 行** | 改造前确实读到 1 行非本租户数据 |
| `get_last_sync_time` | `max(synced_at)` = **2026-04-01**（该行属 `…00bb`） | 租户 `…0001` = **2026-03-01** | 改造前时间被其它租户推进 |
| `get_erp_wms_sync_stats`（order 口径） | 计数 **4** | 租户 `…0001` 计数 **2** | 改造前把其它租户订单计入本租户统计 |

结论：三条「少读」不是估算值，是同一事务内同一批数据在两种作用域下的真实行数差；
改造前确属跨租户读取（越权），改造后按租户收敛。

## 10.3 接口级实测（`w7_b2_fresh`，pm 服务 `:18080`，前缀 `/api/pm`）

token 由 `JWT_SECRET` 签 HS256，`sub` 指向库内真实用户（租户 A = `test_admin`，
租户 B = 临时探针用户，已删除）。`auth_middleware` 会按 `sub` 从 IAM 表重解析权限并覆盖
JWT 内的 `permissions`，因此必须用真实 `sub`，随机 `sub` 会 403。

| 用例 | 期望 | 实测 |
|------|------|------|
| A 列项目 | 200，仅含 `…0001` 行 | 200，`W7B2-TenantA` + 本租户既有项目 |
| B 列项目 | 200，仅含 `…00bb` 行 | 200，`total=1`，仅 `W7B2-TenantB` |
| 无 `tenant_id` claims 列项目 | 拒绝 | 400「缺少租户ID」 |
| B 读 A 的项目详情 | 不可见 | 404「项目不存在」 |
| A 读 B 的项目详情 | 不可见 | 404「项目不存在」 |
| B 建项目 | 落 `…00bb` | 200；DB 复核 `tenant_id=…00bb` |
| 无租户 claims 建项目 | 拒绝 | 400「缺少租户ID」 |

未覆盖：`hrm_finance_sync` / `crm_erp_sync` / `crm_scm_sync` 无调用方，仅「编译通过」，
**不得视为已覆盖**。`async_task_queue` 未改（`svc/integration/src/lib.rs` 已注释、不参与编译、
无法验证），恢复启用时按 §8.1.6 执行。

## 10.4 生产预演（事务内执行 6 笔 → 断言 → ROLLBACK）

环境：`ssh xingzhai@192.168.110.115`，`PGHOST=/tmp psql -d topems_prod`，单连接单事务。
迁移数 **6**（`20261110110000`~`110500`）；`20261110110500` 内建守卫式 `DROP NOT NULL`，
预演确认生效，**不需要第 7 笔**。

| 观测点 | 预演前 | 事务内 | ROLLBACK 后 |
|--------|--------|--------|-------------|
| `_sqlx_migrations` 行数 | 642 | — | **642（未新增）** |
| `pm.project_type_configs.tenant_id` | `NOT NULL` | **可空（nullable=YES）** | 回到 `NOT NULL` |
| 该表 `…0000` / `NULL` 行 | 1 / 0 | **0 / 1（归一成功）** | 1 / 0 |
| RLS 策略总数（全量 `pg_policies`） | **1077** | 预期 **1070**（见 §10.4.1） | 1077 |
| 本批 108 张表上的策略数 | **119** | **112** | 119 |
| FORCE 表数 | 117 | 117 | 117 |
| pm 收敛表 / 跳过 | — | 38 / 0 | — |
| 0006 幂等复查 | — | 4 张表 `更新行数=0`，断言通过 | — |

- 全程 0 ERROR / 0 WARNING，未出现 `COMMIT`。
- 其余 3 张全局只读表预演前即为 `tenant_id IS NULL`（`ai.ai_models` 4 行、
  `ai.ai_prompt_templates` 3 行、`mobile.sync_policies` 1 行），迁移只做幂等清 nil。
- 生产快照 `tenant_id NOT NULL` 共 373 张（全库）；落在本批 108 张表集内的是 **44 张**，
  与 D2 口径一致。

### 10.4.1 策略数逐文件对账（修正此前 386→470 的错误口径）

此前报告写的「386 → 470、新增 112、清掉 155、净增 84」来自两次**过滤条件不同**的探针，
互相不可比，**该组数字作废**。以全量 `pg_policies` 为唯一口径重新对账（只读查询，未执行 DDL）：

| 迁移文件 | 目标表 | 新建 isolation | 新建 global_read | CREATE 合计 | DROP 实际 | 迁移后策略数 |
|---|---|---|---|---|---|---|
| `…110000` pm | 38 | 38 | 1 | 39 | 43 | 39 |
| `…110100` mobile | 27 | 27 | 1 | 28 | 28 | 28 |
| `…110200` integration | 18 | 18 | 0 | 18 | 23 | 18 |
| `…110300` gis | 15 | 15 | 0 | 15 | 15 | 15 |
| `…110400` ai | 10 | 10 | 2 | 12 | 10 | 12 |
| **合计** | **108** | **108** | **4** | **112** | **119** | **112** |

- DROP 的实际值 = 这 108 张表在 `pg_policies` 里的现有策略数（先按表把同名/旧名策略全部清掉再建），
  不是「DROP 语句数」；`DROP POLICY IF EXISTS` 对不存在的策略不增不减。
- 预期迁移后总数 = 1077 − 119 + 112 = **1070**（净 −7）。
- 同名/重复策略：本批 108 张表预演前有 **11 张各含 2 条同表同 cmd 的 permissive 策略**
  （`integration.*` 5 张、`mobile.core_mobile_offline_records`、`pm.documents/pm_tasks/
  project_milestones/project_phases/projects`），B2 先清后建后每张表恰好 1 条
  （4 张全局只读表为 1×ALL + 1×SELECT，cmd 不同，不构成叠加）。
- **B1 残留（不在本批范围）**：全库仍有 **180 组**「同表同 cmd 多条 permissive」策略
  （191 组中 11 组在本批表内），B2 不平移；列为已知未覆盖。

## 10.5 44 张 NOT NULL 表的写入路径核对（不造业务数据）

- 扫描 `svc/{pm,mobile,gis,integration,ai}/src` 中对这 44 张表的 `INSERT`：
  共 **42 处**，**42/42 的列清单都显式包含 `tenant_id`**，不存在「漏列靠默认值」的写法。
- 取值来源：请求路径一律 `current_request_tenant().tenant`（来自验签后 JWT 的 `tenant_id`，
  无 header 回退、无 `…0001` 兜底）或 `scope_for_tenant(tenant)` 显式参数；
  系统通道仅 `superuser`/service 身份（显式 nil + `app.rls_system='on'`）。
- **1 处例外**：`svc/mobile/src/event_handlers/mod.rs:101` 向
  `mobile.mobile_push_notifications` 写死 `…0000`。该 handler 是跨服务事件订阅
  （`tokio::spawn`，无请求 task-local），`Db::scope()` 会先返回
  `RLS context missing` —— 属 B2 之前就存在的静默失败路径，本批未改，
  登记为独立待办（改为从事件体取 `tenant_id` + `scope_for_tenant`）。

## 10.6 仅在新库验证、未在生产 schema 复现的项（单列）

1. `pm/project-types` 列表/创建：本地 `w7_b2_fresh` 返回 500，原因是新链缺 `name_en` 列
   （生产有该列），属「23 条缺失迁移 / 8 张漂移表」范畴，与本批无关。
   生产侧仅用 `PREPARE` 校验了两条 SQL 的形态（通过），**未在生产 schema 上执行数据路径**。
2. §10.3 的接口级 200/400/404 行为在 `w7_b2_fresh` 上验证；生产未造业务数据，
   因此该类行为未在生产库复现（生产已用预演验证 DDL 与策略形态）。
3. 生产预演覆盖：6 笔迁移的可执行性、断言、幂等、可空性与数据归一、策略/FORCE 计数、
   回滚后状态还原。**未覆盖**：迁移后真实业务的读写回归（需窗口后冒烟）。
4. **盘点漏项（本批已一并修复）**：`svc/gis/src/modules/factory_map.rs` 的
   `create_factory_map` 原不在清单 §3.2 内，属遗漏；其
   `claims.is_superuser → None → …0001` 回退已改为显式 `current_request_tenant().tenant`，
   失败即报错。该文件仅「编译通过」，未做接口级实测。
5. 「本地缺 23 条迁移、8 张表 `tenant_id` 漂移」与本节无关，单列待办；
   本批所有 schema 判定以 §10.4 生产预演为准。

## 10.7 提交划分（三块，各自验证内容写进提交信息）

1. `refactor(rls)`：`svc/**` 代码改造（scope 化 + 谓词删除 + 显式租户写入）→ 编译/format 全绿。
2. `feat(db)`：`database/migrations/2026111011*.sql` + `scripts/ops/w7_b2_*.sql`
   → 6 笔迁移门禁通过 + 生产事务预演通过。
3. `ci(rls)`：`scripts/ci/check-rls-policy-shape.sh` → 门禁 exit 0。
   不与生产 DDL 混提交。

## 10.8 窗口方案（执行前需确认）

前提：停写窗口内单独执行；任何 DDL 只在事务中做，失败即整体回滚。

### 10.8.1 生产服务形态（已核实，2026-11-10）

生产是**单体单进程**，不是多服务部署：

| 项 | 事实 |
|---|---|
| launchd unit | `com.topems.server`（PID 23366，`launchctl list` 可见，`KeepAlive=true`） |
| 二进制 | `/Users/xingzhai/topems/bin/topems-server`（唯一业务进程） |
| 监听 | `0.0.0.0:8099`（唯一业务端口） |
| 入口 | `com.topems.nginx`（PID 1239）把 `/api/*`、`/ws/*`、`/health` 全部反代到 `127.0.0.1:8099` |
| 其它 launchd | `com.topems.backup` / `com.topems.be08-observe` / `com.topems.nginx-logrotate`（非业务进程） |

因此原方案「停 pm/mobile/gis/integration/ai 五个服务」**不成立**（生产没有这五个进程）；
停写只需停 `com.topems.server` 一个 unit，全站业务 API 即不可写。

### 10.8.2 步骤

1. **窗口前 24h**：确认无长事务/备库延迟告警；记录基线
   （`pg_policies` 总数 1077、本批 108 表 119、FORCE 117、`_sqlx_migrations` 642）。
   暂停 `com.topems.backup`（避免 pg_dump 与 DDL 抢锁）。
2. **备份**：`pg_dump -Fc topems_prod`（全库）+ `pg_policies` 全量快照
   （`\copy (select * from pg_policies) to 'pg_policies_pre.csv' csv header`）
   + 4 张全局表行快照（含 `tenant_id`）。
3. **停写**：`launchctl bootout gui/$(id -u)/com.topems.server`
   （**必须 bootout/unload，不能用 `stop`——`KeepAlive=true` 会立刻拉起**）。
   确认 `lsof -iTCP:8099` 无监听、`pg_stat_activity` 无该应用连接。nginx 保持运行。
4. **执行**：单连接 `psql -1 -v ON_ERROR_STOP=1` 按序应用 6 笔迁移（或 `sqlx migrate run`）。
   `lock_timeout=5s` 已内建，抢不到锁即失败退出，不挂起。
5. **校验**：`scripts/ops/w7_b2_verify.sql`（`pg_policies` 总数 **1070**、
   108 张表策略数 **112**、FORCE 117、4 张表 nil=0、
   `project_type_configs.tenant_id` 可空、108 张表逐张恰有 1 条 `rls_tenant_isolation`）。
6. **恢复服务**：`launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.topems.server.plist`，
   确认 `/health` 200 后恢复 `com.topems.backup`。
7. **冒烟**：按 §10.3 的 7 条用例在生产各租户重放（只读用例为主）；
   观察单体进程错误率、5xx 与慢查询。
8. **回滚预案**：`scripts/ops/w7_b2_rollback.sql`（数据还原 + `NO FORCE` 急停）；
   若需完整还原，回放第 2 步的 `pg_policies_pre.csv` 并恢复行快照，再启动服务。
9. **验收**：`pg_policies` = 1070（= 1077 − 119 + 112）；本批 108 表内无
   「同表同 cmd 多条 permissive」；无 `…0000` 全局行残留。

### 10.8.3 已知未覆盖（不计入通过项）

- `pm/project-types` 接口级行为未在生产 schema 复现：本地 `w7_b2_fresh` 缺 `name_en`
  （新链漂移），生产只做了 `PREPARE` 形态校验。
- `mobile-contract-smoke` 99/114：15 项为本地缺 CRM/WMS/approval/attendance 导致的
  503 降级，hook 被**排除**而非通过。
- B1 残留：全库 180 组「同表同 cmd 多条 permissive」策略不在本批 108 表内，B2 不处理。
- `mobile.mobile_push_notifications` 的跨服务事件写入（§10.5 唯一例外）仍写 nil 且
  无请求上下文，B2 后仍会失败，未在本批修复。
- `hrm_finance_sync` / `crm_erp_sync` / `crm_scm_sync` 无调用方，未实测。
- `async_task_queue` 未改（`lib.rs` 已注释、不参与编译）。
- 本地缺 23 条迁移、8 张表 `tenant_id` 漂移，与本批无关，单列待办。

---

# 11. 窗口执行记录（2026-11-10 08:20–08:40）

## 11.1 时间线与停写时长

| 时刻 | 动作 |
|---|---|
| 08:24 | 迁移文件 / 校验脚本上传生产 `/tmp`，sha384 与本地逐一比对一致 |
| 08:33 | `cargo build --release -p topems-server` 完成（9m23s，HEAD `020cf68f`） |
| 08:33 | 新二进制上传 `/tmp/topems-server.w7b2`，sha256 校验一致 |
| 08:34:23 | `launchctl bootout` 停 `com.topems.server` + `com.topems.backup`（T0） |
| 08:34:23–08:34:5x | 停写确认：8099 无监听、`pg_stat_activity` 0 应用连接 |
| 08:34:5x | 单连接 `psql -1` 执行 6 笔迁移 + 校验（`topems_prod` 非超户身份） |
| 08:34:55 | 新二进制落到 `~/topems/bin/topems-server`，`launchctl bootstrap` |
| 08:34:58 | `/health` 200（T1） |
| 08:35+ | 恢复 `com.topems.backup`，冒烟探测 |

**停写时长 ≈ 35 秒**（08:34:23 → 08:34:58）。

## 11.2 六笔各自结果

| 迁移 | 结果 |
|---|---|
| `…110000` pm | 收敛 38 张、跳过 0；结构断言通过 |
| `…110100` mobile | 收敛 27 张、跳过 0；结构断言通过 |
| `…110200` integration | 收敛 18 张、跳过 0；结构断言通过 |
| `…110300` gis | 收敛 15 张、跳过 0；结构断言通过 |
| `…110400` ai | 收敛 10 张、跳过 0；结构断言通过 |
| `…110500` 全局行归一 | 3 张表更新 0 行；`project_type_configs` `DROP NOT NULL` 生效、1 行 `…0000→NULL`；收尾断言通过 |

账本：`_sqlx_migrations` **642 → 648**，6 条 checksum 与文件 sha384 完全一致。

## 11.3 实际数字（非超户 `topems_prod` 身份验证）

| 指标 | 期望 | 实际 |
|---|---|---|
| `_sqlx_migrations` | 648 | **648** |
| `pg_policies` 总数 | 1070 | **1070** |
| 本批 108 表策略数 | 112 | **112**（108 isolation + 4 global_read） |
| 同表同 cmd 多条 permissive（本批表内） | 0 | **0** |
| FORCE 表（本批 5 schema） | 117 | **117**（全库 871，其余为 B1 及更早批次） |
| 4 张全局表 `…0000` 行 | 0 | **0 / 0 / 0 / 0** |
| `pm.project_type_configs.tenant_id` | 可空 | **YES** |
| 每表恰 1 条 `rls_tenant_isolation` | 108 表 | **108** |

`w7_b2_verify.sql` 以 `-U topems_prod`（`rolsuper=false`）执行：
A1/A2 结构、B1（`…0001` 逐表可见）、B2（`…0002` 跨租户 0 行）、B3（无上下文
fail-closed）、C3（本租户写 probe 回滚）**全部通过**，禁止超级用户。

## 11.4 二进制

| 项 | 值 |
|---|---|
| 构建来源 | `020cf68fdb2ff2c0d580304182e47bc4f97eb14e`（已推 origin/main） |
| 新二进制 sha256 | `0af3d8bd3da87ef0b8634ff48306c3855e8b793b4f1b834ecafa77e63e75c939` |
| 旧二进制 sha256 | `a93de973a7861b54948d129a2ae1d3e1bd3f6ad11e10c62422a000fa9604f03c` |
| 旧二进制备份 | `~/topems/backups/w7b2_20261110/topems-server.pre-w7b2` |
| 数据库备份 | `~/topems/backups/w7b2_20261110/topems_prod_full.dump` |
| 快照 | `pg_policies_pre.csv`、`_sqlx_migrations_pre.csv`、4 张全局表 CSV |

## 11.5 冒烟

- `/health` 200；`/api/erp/health`、`/api/finance/health`、`/api/hrm/health` 均 200。
- 未带令牌访问 `/api/pm/projects`、`/api/mobile/inventory` 均 **401**（鉴权未被绕过）。
- 新进程建立 **34** 条 `topems_prod` 连接；`server.err` 无新增错误，`server.out` 启动完成。
- **未执行**：带生产用户凭据的逐租户 HTTP 冒烟（本环境无生产账号，且不对生产伪造令牌）。
  租户隔离改由 §11.3 的 B1/B2/B3 用真实租户 ID 在 SQL 层验证。

## 11.6 回滚路径

1. 数据/DDL：`scripts/ops/w7_b2_rollback.sql`；或回放 `pg_policies_pre.csv` +
   `topems_prod_full.dump`。
2. 二进制：`cp ~/topems/backups/w7b2_20261110/topems-server.pre-w7b2
   ~/topems/bin/topems-server` 后 `launchctl bootout/bootstrap`。
3. 账本：回滚 DDL 后删除 6 条对应 `_sqlx_migrations` 行，避免 sqlx 误判。

## 11.7 已知未覆盖（原样保留，不计入通过项）

见 §10.8.3 的 7 条（`pm/project-types` 接口未在生产复现、mobile smoke 排除而非通过、
B1 残留 180 组重复 permissive、`mobile_push_notifications` nil 写入、三个 sync 模块无调用方、
`async_task_queue` 未改、本地 23 条缺迁移/8 张漂移表）。


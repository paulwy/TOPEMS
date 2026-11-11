# W-B4 · SCM / EHS / WMS 只读评估（2026-11-12）

> 状态：**只读盘点，未改任何代码、未改任何数据库对象、未改任何数据**。
> 口径沿用 B6a/B6b：`require_tenant` + `scope_for_tenant`、子表同事务、删 0 行 404、状态 0 行 409、不吞 SQL 错误、同域引用校验属主、跨域引用显式 TODO。
> 数据来源：生产库 `topems_prod@192.168.110.115`（只读 SELECT）、仓库 `svc/{scm,ehs,wms}`、`lib/shared-auth/src/middleware/tenant.rs`、`database/migrations/`。

## 0. 结论先行

1. **生产上这三个模块几乎没有数据**：147 张表合计 **3 行**（`ehs.safety_hazards` 1、`scm.schema_defense_ledger` 1、`wms.schema_defense_ledger` 1）。因此"生产验收"只能证明**handler 契约**（状态码、不崩、不 500），**无法证明迁移/回填/数据搬家正确性**。行数前后对比必须放到副本并用自造夹具跑，生产只能做零写入 probe + 少量写入后清理。
2. **RLS 在这三个 schema 里基本是失效的**：145/147 张表的策略都带 `current_setting('app.tenant_id') IS NULL` 或 `= ''` 或 `tenant_id IS NULL` 放行分支，另有 40 张表 RLS 根本没开；`scm.purchase_orders`、`wms.warehouses`、`wms.stock_take_items`、`wms.wms_approval_events`、`ehs.qa_ehs_employees`、`ehs.safety_hazards` 等 16+ 张表策略直接是 `true/true`。**当前隔离只靠 SQL 里的 `tenant_id = $n` 谓词**。
3. **SCM/WMS 用的是"整请求一个事务"的中间件**（`tenant_middleware` 在 handler 前 `begin()`，在响应后 `finish_response()` 提交），而且 **`finish_response` 对非 2xx 响应同样提交**。这就是用户担心的"scope 事务开在整个请求上"，并且已经造成两个衍生问题：WMS 有 7 处、SCM 有 1 处在 handler 内又用 `state.db.begin()` 开了**第二个连接上的第二个事务**（第二个事务里 `app.tenant_id` 未设 → RLS 走放行分支）。
4. **SCM 有一个正在发生的静默丢数据**：`purchase_contract_items`、`supplier_admission_audit_items` **没有 `tenant_id` 列**，但代码 INSERT 时写了 `tenant_id` 且用 `let _ =` 吞错 → 每次创建合同/审核都返回 200，但明细**一行都没落库**；合同详情读明细时同样 SELECT 了不存在的 `tenant_id` 列 → `.unwrap_or_default()` → 返回 200 + 空明细。
5. **EHS 事件发布链路在 B4 改造后正常**：`create_hazard`（qa_ehs_hazards）、`create_safety_hazard`（safety_hazards）、`report_accident` 三条创建路径都是 `resolve_create_tenant` 严格解析 + `tokio::spawn` 发布 + 失败入 Redis ZSET 由 15s relay 重发。缺口是**没有 outbox**（插入与发布之间进程崩溃会丢事件），以及超管路径的 tenant 语义。
6. **WMS 库存高频写的锁问题**：三模块 **0 处 `FOR UPDATE`**。入库/出库用的是原子增量（`quantity = quantity ± $1`）本身安全，但出库的"可用量够不够"是读后判断（无锁），并发下可超卖；`update_inventory` 是**绝对值覆盖**（读-改-写丢失更新）。目前请求级事务只是"开着"，并没有锁住要更新的行。

## 1. 三模块横向对比

| 维度 | SCM | EHS | WMS |
|---|---:|---:|---:|
| 表数（生产） | 37 | 71 | 39 |
| 带 `tenant_id` 的表 | 31 | 70 | 37 |
| **缺 `tenant_id` 列** | **6**（5 业务 + ledger） | 1（仅 ledger） | 2（ledger + `wms_master_data_refs`） |
| RLS 已开 / 未开 | 31 / **6** | 39 / **32** | 37 / **2** |
| FORCE RLS | 31 | 34（另 5 张开了但未 FORCE） | 37 |
| 策略 fail-open（含 NULL/空串/tenant IS NULL/`true`） | **31** | **37** | **37** |
| 策略严格（fail-closed） | 0 | 2 | 0 |
| 缺 WITH CHECK 的表（插入不受 RLS 限制） | 5 | 2 | 12 |
| 写路由（POST/PUT/DELETE） | 41 | **106** | 58 |
| `&state.pool` 裸池引用 | **0** | **208** | **0** |
| 请求级事务执行 SQL | 147 条（115 读 + 32 写） | 0 | 225 条（182 读 + 43 写） |
| `&state.db` 直连语句（绕过请求事务） | 14（13 读 + 1 写） | — | 20（18 读 + 2 写，另 1 处 spawn） |
| `require_tenant` 调用 | 0 | 0 | 23（5 个文件） |
| `resolve_create_tenant` 调用 | 2 | 4 | 0 |
| `get_tenant_id` 调用 | 0 | 0 | 0 |
| 事件发布点 | 5 | 3 | 5 |
| 显式 `.begin()`（handler 内二次事务） | 1 | 7 | 7 |
| 生产行数 | **1**（ledger） | **1** | **1**（ledger） |
| 源码规模 | 22 模块 / 23.9k LOC | 19 模块 / 22.5k LOC | 26 模块 / 36.9k LOC |

> 说明：SCM/WMS 的 0 处 `&state.pool` 不是"干净"，而是把裸池换成了**整请求事务**；EHS 的 208 处裸池意味着**每次查询都在请求事务之外、`app.tenant_id` 未设置**的连接上执行，RLS 全线走放行分支。

## 2. 每模块明细

### 2.1 表清单与 RLS

#### SCM（37 张）

- **缺 `tenant_id` 且 RLS 未开（6 张）**：`purchase_contract_items`、`purchase_inquiries`、`purchase_inquiry_items`、`supplier_admission_audit_items`、`supplier_quote_items`、`schema_defense_ledger`。
  - 前 5 张是业务表；其中 **`purchase_contract_items`、`supplier_admission_audit_items` 是活代码在写的**，另外 3 张当前无写路径。
- **策略形状**：31 张有策略，**全部 fail-open**。
  - `true/true` 完全放行 5 张：`purchase_orders`、`purchase_order_items`、`delivery_appointments`、`supplier_performance`、`supplier_certificates`。
  - `current_setting IS NULL OR = '' OR tenant_id::text = ...` 26 张（列侧 `::text` cast）。
  - 无严格策略、无 `app.rls_system` 分支。
- **FORCE**：31 张已开的全部 FORCE。

#### EHS（71 张）

- **缺列**：只有 `schema_defense_ledger`。
- **RLS 未开（32 张）**：事故调查/复查/处置、合规项、禁忌症、检测记录、职业病病例、演练计划/问题/记录、应急预案（含审批/物资/版本）、环境、隐患整改/验收、健康异常/体检计划/体检记录/健康培训、检查项/计划/记录/记录项、物资库存、MSDS、防护措施、出入库记录、同步记录、培训、ledger。**这 32 张表按 id 就能跨租户读写**。
- **开了但未 FORCE（5 张）**：`qa_ehs_compliance_evaluations`、`qa_ehs_discharge_permits`、`qa_ehs_env_monitor_records`、`qa_ehs_environment_incidents`、`qa_ehs_environmental_regulations`。其中 `compliance_evaluations` 策略**只有 USING、无 WITH CHECK**。
- **策略形状**：39 张有策略（37 fail-open、2 严格）。
  - `true/true` 17 张：`qa_ehs_employees`、`safety_hazards`、`qa_ehs_emergency_contacts`、`qa_ehs_risk_assessments` 等新建的 `ehs.*`/`safety_*` 表。
  - 宽松分支 12 张、`tenant_id IS NULL` 分支 2 张、列侧 `::text` cast 2 张、多策略叠加 5 张（宽松 + 严格 OR → 宽松赢）。
  - 严格仅 2 张：`qa_ehs_environment_monitors`、`qa_ehs_risks`。

#### WMS（39 张）

- **缺列（2 张）**：`schema_defense_ledger`、`wms_master_data_refs`（后者 RLS 已开、策略 `true`，当前无写路径）。
- **RLS 未开（2 张）**：`safety_stock_settings`（有 tenant 列但没开 RLS）、`schema_defense_ledger`。
- **策略形状**：37 张有策略，**全部 fail-open**，0 张严格。
  - `true/true` 16 张：`warehouses`、`locations`、`stock_take_items`、`wms_approval_events`、`audit_logs`、`sync_records`、`inventory_alerts` 等。
  - 列侧 `::text` cast 5 张、宽松 + 严格多策略 4 张（`inventory`、`inventory_movements` 都属于这类，宽松策略里还带 `tenant_id IS NULL` → 全局行对所有人可见）。
  - `stock_takes` 带**零 UUID 放行**分支（`COALESCE(app.tenant_id,'')='00000000-...'`），与中间件超管分支的 nil 语义对齐——超管请求天然全量。

> `inbound_orders` / `outbound_orders` / `transfer_orders` / `suppliers` 等策略只有 USING、**无 WITH CHECK**（ALL 策略缺 WITH CHECK 时 USING 兼任），实际等于插入也不受限制。

### 2.2 代码现状

| 指标 | SCM | EHS | WMS |
|---|---|---|---|
| 裸池 `&state.pool` | 0 | **208 处引用**（约 99 读 + 33 写 + 其余在 helper/字符串） | 0 |
| 请求事务 SQL | 115 读 / 32 写 | 0 | 182 读 / 43 写 |
| 绕过请求事务的 `&state.db` | 14（13 读 / 1 写） | — | 20（18 读 / 2 写） |
| `get_tenant_id` | 0 | 0 | 0 |
| `get_tenant_id_from_claims` | 0 | 0 | 2 |
| `resolve_create_tenant` | 2（supplier 创建/更新） | 4（accident 创建、hazard 创建 ×2、另有 1 处） | 0 |
| `require_tenant` | 0 | 0 | 23（inbound/outbound/transfer/warehouse/stock_take） |
| 事件发布点 | 5 | 3 | 5 |
| 结果被丢弃的 SQL（`let _ = sqlx::query`） | 18 处 | 5 处 | 21 处 |
| 删除不查 rows_affected | 0 / 11 | **15 / 36** | 0 / 17 |

**SCM 关键点**
- 100% 使用 `tenant_bind_value()`：超管 → `Uuid::nil()`；普通用户缺失/解析失败 → `Uuid::nil()`。SQL 里配套 `($2='000...' OR tenant_id=$2)`，即 **nil 分支 = 看全部**。超管即使带了 `x-tenant-id` 也被忽略。
- `create_order` 等成功路径会 `guard.take()` **在 handler 内提前提交请求事务**（76 处），之后的 `log_audit_event` 用裸池写审计（断了事务一致性）。剩余路由靠 `finish_response` 提交——**非 2xx 也提交**。

**EHS 关键点**
- 每个模块各自定义一份 `resolve_inspection_tenant`（共 5 份），语义：超管 → nil；其余 → `claims.tenant_id` 解析失败 → nil。**超管永远是全租户**。
- 106 条写路由只有 7 处 `.begin()` → 绝大多数多表写**非原子**：父行写入成功、子行失败仍返回 200。
- 无 `require_tenant`，`_headers: HeaderMap` 普遍被忽略。

**WMS 关键点**
- 主要写入口已换成 `require_tenant` + 请求事务（36aca8eef、62317d08d），但 handler 里仍普遍用 `claims.is_superuser ? None : ...` 自行推导租户，**不读 `TenantContext`**，超管带 `x-tenant-id` 时写入 `NULL` 租户行。
- 7 处在请求事务之外又开 `state.db.begin()`（stock_take 3、outbound 1、inbound 1、transfer 1、batch 1）；第二个事务里没有 `app.tenant_id`，所以那些 SQL 里嵌了 `current_setting(...) IS NULL OR ...` 补丁。

### 2.3 已被前面轮次带过的部分

| 模块 | 已修 | 出处 | 覆盖率 |
|---|---|---|---|
| WMS | 审批入口改 `require_tenant`（入库/出库/调拨/盘点/仓库） | `36aca8eef` | 23 调用点 / 58 写路由 ≈ 40% |
| WMS | 仓库接口严格租户解析 | `62317d08d` | 少量 |
| WMS | 17/17 删除均检查 `rows_affected`；入库/出库改原子增量 | 早期批次 | 删除 100%、库存增减 2 处 |
| WMS | 生产端事件补租户、清死订阅 | `417fde1bf` | 5 个发布点 |
| EHS | 事件发布修复（两处隐患创建都发事件 + ZSET 重试） | B4 前期 | 3 个发布点 |
| EHS | 时刻字段统一 `DateTime<Utc>`、decode 对齐生产列类型 | `95c9aac13`、`de5ab92e6` | 时间类 P0 已清零 |
| SCM | 采购订单审批发布事件 + 提交重试 | `purchase_order.rs:644` | 1 个发布点 |
| SCM | W7 租户作用域接线、审计端点迁显式作用域 | `b7b9d7b3b`、`75b5aabc7` | 部分读路径 |
| SCM | 11/11 删除检查 `rows_affected` | 早期批次 | 删除 100% |

**未带过的空白**：SCM 全部 41 条写路由未做 `require_tenant`/作用域事务化（只有 `tenant_bind` 谓词）；EHS 106 条里只有 3 条创建做了严格租户；WMS 库存/盘点/批次/周期盘点/波次等约 35 条写路由未接 `require_tenant`。

### 2.4 风险排序（每类 top3 路由）

#### A. 静默成功（0 行返 200）

| 模块 | 路由 | 当前形态 | 改后期望 |
|---|---|---|---|
| SCM | `DELETE /scm/price-comparisons/{id}` | `let _ = DELETE ... items` 吞错；主删除 0 行也未区分 | 0 行 404，子删除失败整体 500 |
| SCM | `GET /scm/purchase-contracts/{id}` | 明细 SELECT 含不存在的 `tenant_id` 列 → `.unwrap_or_default()` → 200 + 空明细 | 修列/改 SQL；错误不得转空列表 |
| SCM | `POST /scm/sync/purchase-to-inbound` | 子步骤 `let _ =`，失败仍报成功 | 逐步校验 + 失败 500 |
| EHS | `DELETE /ehs/hazards/{id}`（`delete_hazard`） | 无 `rows_affected` 判断，0 行 200 | 0 行 404 |
| EHS | `DELETE /ehs/accidents/{id}` / `DELETE /ehs/environment/records/{id}` | 同上（共 15 条删除同形态） | 0 行 404 |
| EHS | `POST /ehs/issues/{id}/verification` | 验收记录插入后，隐患状态更新 `let _ =` 吞掉 → 记录成功、状态没变 | 同事务 + 失败 500 |
| WMS | `POST /wms/stock-takes/{id}/start` | 明细 `INSERT ... SELECT` 与状态更新都是 `let _ =` → 0 行也返回"盘点已开始" | 同事务；0 行 409 |
| WMS | `POST /wms/stock-takes/{id}/count` | 明细更新 `let _ =`，循环里逐条吞 → 全失败仍 200 | 任一条 0 行 404/409，整体回滚 |
| WMS | `POST /wms/sync/inbound-from-scm` | 失败用 `ApiResponse::success({success:false})` 200 | 失败即 4xx/5xx |

#### B. 子表写入被吞

| 模块 | 路由 | 当前形态 | 改后期望 |
|---|---|---|---|
| SCM | `POST /scm/purchase-contracts` | `purchase_contract_items` 无 `tenant_id` 列，INSERT 报错被 `let _ =` → **明细 0 行落库，返回 200** | 补列后同事务插入，失败 500 |
| SCM | `POST /scm/supplier-admissions/{id}/audit` | 同上（`supplier_admission_audit_items` 无 `tenant_id` 列） | 同上 |
| SCM | `POST /scm/sync/purchase-to-inbound` | 433/505/1413/1471/1549 五处 `let _ =` | 同事务、不吞 |
| EHS | `POST /ehs/issues/{id}/verification` | 状态回写被吞（1147） | 同事务 |
| EHS | `POST /ehs/incidents/{id}/treatment` | 事故状态回写被吞（979），且无事务（父/子各用一条连接） | 同事务 + 不吞 |
| EHS | `POST /ehs/hazards/{id}/rectification` | 创建整改记录后状态回写被吞（905） | 同事务 |
| WMS | `POST /wms/inbound-orders/{id}/receive` | 3 处 `let _ =`（明细已收数、库存、状态） | 同事务 |
| WMS | `POST /wms/outbound-orders/{id}/ship` | 2 处 `let _ =`（明细已发数、状态） | 同事务 |
| WMS | `POST /wms/transfers/{id}/receive` | 1 处 `let _ =` | 同事务 |

#### C. 外部 id 引用未校验属主

| 模块 | 路由 | 当前形态 | 改后期望 |
|---|---|---|---|
| SCM | `POST /scm/purchase-orders` | `supplier_id` 直接 bind，**不查是否存在/同租户** | 同域校验，否则 400 |
| SCM | `POST /scm/purchase-contracts` | 同上 | 同上 |
| SCM | `POST /scm/purchase-orders/{id}/approve` | 审批只看 `id` + tenant_bind，但 nil 时跨租户可批 | 引用校验 + nil 分支收敛 |
| EHS | `POST /ehs/issues/{id}/verification` | 仅按 `id` + `($2='000...' OR tenant_id::text=$2)` → 超管 nil 可验收他人隐患 | 显式租户，nil 不放行 |
| EHS | `POST /ehs/incidents/{id}/treatment` | 同上（事故 id 只做格式/外键判断） | 同上 |
| EHS | `POST /ehs/hazards`（`create_risk`） | 检查计划/责任人等 id 不校验属主 | 同域校验 |
| WMS | `POST /wms/sync/inbound-from-scm` | **没有 `Claims` 提取器**；`purchase_order_snapshots` 按 id 查且 SQL 无租户谓词 | 必须带租户；快照同租户否则 404 |
| WMS | `POST /wms/inbound-orders` | `warehouse_id` 不校验存在/属主 | 同域校验，否则 400 |
| WMS | `POST /wms/transfers` | 源/目标库位不校验属主 | 同上 |

#### D. 裸池 fail-open 读

| 模块 | 路由 | 当前形态 | 改后期望 |
|---|---|---|---|
| SCM | `GET /scm/analytics/*`（4 条） | 裸池聚合；tenant nil → 全租户 | 走作用域（或显式租户） |
| SCM | `GET /scm/sync-records/*`（7 条） | 裸池读，同上 | 同上 |
| SCM | `GET /scm/api/plugins/health` | 裸池 | 低风险，可留 |
| EHS | `GET /ehs/hazards`（`list_risks`） | 裸池 + `($1='000...' OR tenant_id::text=$1)`，nil → 全租户 | 作用域 |
| EHS | `GET /ehs/checks/plans` | 同上，SQL 里已明写零 UUID 放行 | 同上 |
| EHS | `GET /ehs/dashboard` | 裸池聚合全租户 | 同上 |
| WMS | `GET /wms/analytics/*`（18 条裸池读） | 超管 → `$1 IS NULL` → 全租户 | 同上 |
| WMS | 低库存告警 spawn（`emit_low_stock_alerts`） | **扫描全租户库存**，payload 里**没有 `tenant_id` 字段** | payload 补租户、按租户扫描 |
| WMS | `serial_number` 2 条裸池读 | 无租户谓词 | 同上 |

### 2.5 迁移需求

| 项 | SCM | EHS | WMS | 合计 |
|---|---:|---:|---:|---:|
| 补 `tenant_id` 列 | 5（业务表；ledger 不计） | 0 | 1（`wms_master_data_refs`，当前无写路径，可延后） | **6** |
| 新建策略 / 重写为 fail-closed | 37（31 重写 + 6 新建） | 69（37 重写 + 32 新建） | 39（37 重写 + 2 新建） | **145** |
| 补 FORCE RLS | 6 | 37（32 未开 + 5 未 FORCE） | 2 | **45** |
| 补 WITH CHECK（当前缺失） | 5 | 2 | 12 | **19** |
| 数据回填 | 0（生产全 0 行） | 0 | 0 | 0 |

**迁移笔数预估：4–5 笔**
1. `scm`：补 5 张业务表 `tenant_id` 列 + 回填 + 索引（1 笔）；
2. `scm`：37 张表策略重写 + 6 张 FORCE（1 笔）；
3. `ehs`：69 张表策略（含新建 32 张）+ FORCE 37 张（1 笔）；
4. `wms`：39 张表策略重写 + FORCE 2 张（1 笔）；
5. 可选：`wms_master_data_refs` 补列（当前无写路径，附带即可）。

> 回填量为 0 是**因为生产没数据**，不是"不需要回填逻辑"——副本/未来导入环境仍需要 `backfill + quarantine` 这套（参照 `20261112092000_w7_b4_mes_backfill_tenant_and_quarantine.sql`）。

## 3. 三件必核

### 3.1 生产数据量（逐表结论）

- 147 张表合计 **3 行**：`ehs.safety_hazards` 1 行（tenant = T1，2026-11-11 创建，疑为冒烟遗留）、`scm.schema_defense_ledger` 1、`wms.schema_defense_ledger` 1。
- 副本 `topems_w7_reh_prod_20261111` 同样是 0 行（含 `wms.inventory`、`wms.inventory_movements`、`scm.purchase_orders`）。
- **结论**：生产验收只能证明"接口契约 + 不 500 + 不跨租户 400"；"迁移不丢数据"必须靠副本 + 自造 T1/T2 夹具，且需要在迁移前后做逐表行数与内容指纹对比。B6b 那种"改前改后 20 表行数回到基线"在生产上对这三个模块**只能证明零写入**。

### 3.2 EHS 事件发布链路（B4 后）

| 链路 | 状态 | 证据 |
|---|---|---|
| `POST /ehs/hazards` → `EhsHazardReported` | 正常 | `hazard.rs:332` 严格租户 → `:399 tokio::spawn` → `:412 publish_event`，失败 `commit_retry::push_retry_typed("ehs", ...)` |
| `POST /ehs/issues`（`create_safety_hazard`）→ `EhsHazardReported` | 正常 | `hazard.rs:1317` 严格租户 → `:1385 publish_event`，同样 ZSET 重试 |
| `POST /ehs/incidents` → 事故事件 | 正常 | `accident.rs:321` 严格租户 → `:400 publish_event` |
| 订阅侧（LIMS/QMS → EHS） | 本次未展开逐条核，仅确认 3 个生产端租户为真实租户 | 需在改造窗口内补测 |

遗留：三处均为 **spawn 后置发布 + 无 outbox**，插入与发布之间进程崩溃会丢事件（ZSET 只兜"发布失败"，不兜"没来得及发布"）；`publish_cache_invalidated` 是 `let _ =`。

### 3.3 WMS 库存写事务与锁

| 结论 | 证据 |
|---|---|
| 请求级事务确实包住整个请求 | `tenant_middleware` handler 前 `begin()`，响应后 `finish_response` 提交（`finish_response` 对非 2xx 也提交） |
| 部分 handler 在请求事务之外另开连接 | 7 处 `state.db.begin()`（stock_take 3、outbound 1、inbound 1、transfer 1、batch 1）；这些事务里 `app.tenant_id` 未设，SQL 用 `current_setting IS NULL OR ...` 兜 |
| 无行锁 | 三模块 `FOR UPDATE` **0 处** |
| 入库/出库增量安全 | `quantity = quantity ± $1`（inbound_order.rs:1737、outbound_order.rs:1557 区） |
| 出库可超卖 | 可用量判断是普通 SELECT，随后条件更新 `available_quantity >= $1`（单条 UPDATE 原子，但判断与扣减之间的展示值可能陈旧；跨单竞争仍需 `FOR UPDATE` 或 `RETURNING` 断言） |
| 库存调整会丢更新 | `PUT /wms/inventory/{id}` 是绝对值覆盖（`quantity = $6`），请求级事务不提供行锁 |
| 超管写 NULL 租户 | `create_inbound_order`/`start_stock_take` 超管分支写 `tenant_id = NULL`，即使带了 `x-tenant-id` |

**改造要求**：库存类写（入库确认/收货、出库拣配/发货、调拨收发、盘点调整）拆成**短事务 + 行锁**（`SELECT ... FOR UPDATE` 或单条 `UPDATE ... WHERE available >= $n RETURNING`），不要把 scope 事务开在整个请求上；请求级事务在库存写路径上应退化为"无事务直连 + 局部短事务"。

## 4. 建议顺序与改动面

### 顺序：SCM → WMS → EHS

| 窗口 | 模块 | 理由 | 预计改动面 | 迁移 |
|---|---|---|---|---|
| **B4-1** | SCM | 写路由最少（41）、裸池语句最少（14）、且唯一存在**正在静默丢数据**的 P0；结构简单（单一请求事务模型），适合先立规矩 | 约 14 个文件（purchase_order / contract / supplier_admission / supplier / price_comparison / analytics / sync_records / data_sync / mrp / settings）+ 2 笔迁移 | 2 |
| **B4-2** | WMS | 库存正确性业务风险最高；需重写"请求级事务 vs 短事务 + 行锁"的边界，必须独立窗口并做并发压测 | 约 20 个文件（stock_take / inbound / outbound / transfer / inventory / batch / cycle_count / analytics / serial_number / inventory_alert）+ 1–2 笔迁移 | 1–2 |
| **B4-3** | EHS | 路由最多（106）但最机械（横切替换裸池 → 作用域 + 事务）；生产无数据，回滚成本低 | 19 个模块文件全量 + 1 笔迁移 | 1 |

### 每窗口验收口径（沿 B6a/B6b 矩阵）

1. 无租户头写 200/400 判定（SCM/WMS 现在走 400；EHS 需先补 `require_tenant`）；
2. 带头写落库租户**精确**（含超管带 `x-tenant-id` 必须落到该租户，不再是 NULL）；
3. 子表随父、父失败子不落库（同一事务）；子表 0 行必须报错；
4. T2 读/改/删 T1 资源：读 404、写 404/409；
5. 删除 0 行 404、状态 0 行 409；
6. 改前/改后逐表行数 + 内容指纹（副本自造夹具），生产只做零写入 probe；
7. WMS 追加：并发 20 线程出库同 SKU，断言可用量不为负、无超卖、无 40P01 死锁。

## 5. 事务模型复核（2026-11-12 追加，代码 + 副本实测）

**结论：请求级事务与 `scope_for_tenant` 事务是两条连接上的两个事务，互不覆盖。**

| 环节 | 证据 |
|---|---|
| 中间件开请求事务 | `lib/shared-auth/src/middleware/tenant.rs:357`（系统通道）、`:415`（租户通道）都是 `pool.begin()`，然后把 `RlsTxnCell` 塞进 extensions（`:381-388`、`:464-470`） |
| 请求事务提交 | `:101-107 commit_request_txn` 无条件 `txn.commit()`；`:110-124 finish_response` 不判断 HTTP 状态，**非 2xx 也提交**；只有"提交失败且原响应是 2xx"才改 500 |
| `Db::scope()` / `scope_for_tenant()` | `lib/shared-db/src/scope.rs:82-86`、`:156-167`，内部同样是 `self.pool.begin()` → 新连接、新事务 |
| 复用请求事务的通道 | `scope.rs:196-199 scope_with(tx)`；文档 `scope.rs:31-35` 明确"此时不能再 BEGIN 一个新事务" |
| 实际采用 | QMS 86 处 `scope_for_tenant`、0 处 `scope_with` → 全部独立连接；PM 130 / PDM 115 处 `scope_with` → 与请求事务同一层 |

副本实测（两个真实连接，`topems_w7_reh_prod_20261111`）：A 连接 `pg_backend_pid=42057` 在事务内写入并保持未提交；B 连接 `pid=42059` 只看到自己的 1 行、看不到 A 的行；A `COMMIT`（模拟 finish_response 在 500 时提交）后 A 行在库；B `ROLLBACK` 后其行不在库。探针表已删除。

**由此产生的表述修正**：
1. B6a/B6b 的"子表同事务、500 整体回滚"成立，但边界是**单个 `scope` 事务**，不是请求事务；文档措辞需注明。
2. "非 2xx 也提交"只作用于**请求事务内的写入**；裸池 `&state.db` 写（如 `scm::data_sync::record_sync_log`，`data_sync.rs:1822-1874`，`.execute(&state.db)`）自成一个自动提交事务，与 500 无关。
3. 每个 QMS 写请求实际占用 **2 条连接**（空闲的请求事务 + scope 事务）；WMS 部分 inventory 路由占 2–3 条。
4. B5 读作用域同样是独立连接上的只读事务，与请求事务无关。

**可达的"写成功 + 500"实例**：`POST /scm/sync/purchase-to-inbound` 主 INSERT 失败时（`data_sync.rs:390-409` → `:484` 分支）返回 500，但 `record_sync_log` 走裸池已提交，`sync_logs` 会落一行；同一分支里 `UPDATE scm.purchase_orders` 用的是**已中止**的请求事务，静默失败。

## 6. 本次未做/未验证

- 未逐条打开 106 条 EHS 写路由核对 SQL（按文件级 grep + 抽样 30 余处关键路径）。
- 未核 EHS 订阅侧（LIMS/QMS 事件 → EHS 落库）的租户来源。
- 未做 type-binding 全量扫描（B6b 的经验是 `uuid`/`timestamptz`/`jsonb` 必查）；本轮抽样看到 EHS 的 `::timestamptz` 文本 cast 与 `::text` id 用法已较统一，但 WMS/SCM 的 RETURNING 解码未逐条核。
- 未跑任何写操作验证（尊重"只读评估"）。

## 6. 请求事务收尾改造与实测（2026-11-12，W7-S1 窗口）

### 6.1 改动

`lib/shared-auth/src/middleware/tenant.rs`：`finish_response` 不再无条件 `commit()`。

| 响应 | 收尾动作 | 日志 |
|---|---|---|
| 2xx | `txn.commit()` | — |
| 非 2xx | `txn.rollback()` | `tracing::info!(target: "rls_txn", method, path, status, "非 2xx 响应，回滚请求事务")` |
| 收尾失败 | 2xx 改 500；非 2xx 透传 | `tracing::error!(target: "rls_txn", ...)` |

handler 已自行 `guard.take()+commit()` 时 `Option` 为 `None`，收尾为空操作（行为不变）。

### 6.2 兼容性结论：0 处依赖「报错也提交」

- 写请求事务（`&mut **txn` 写语句）只存在于 8 个服务：erp 125、wms 119、hrm 85、scm 81、crm 69、srm 54、rd 50、ehs 7（合计 590 条）；其余服务不写请求事务，本次改动对其无数据面影响。
- 扫描「请求事务写成功后返回非 2xx」：命中 3 处，逐条核对均为 **UPDATE/DELETE 返回 0 行** 才报 4xx（`erp/announcement.rs:651`、`erp/leave_request.rs:689`、`:1017`），没有写入发生，不构成依赖。
- 「写成功后第二条语句失败」类：PG 事务已中止，旧实现 `commit()` 实际等价 ROLLBACK，新旧结果一致。
- 未发现错误响应体中携带「刚写入的 id」或依赖错误路径落审计的代码（审计走 `&PgPool` 独立连接）。

### 6.3 实测（副本 `w7_s1_txn`，monolith `topems-server` + 真实 HTTP）

用例框架：`lib/shared-auth/tests/rls_middleware_e2e.rs` 新增 2 条，用真实 `tenant_middleware`：

| 用例 | 结果 |
|---|---|
| handler 在请求事务 INSERT 后返回 200 | 通过，行数 0→1（提交生效） |
| handler 在请求事务 INSERT 后返回 400 | 通过，行数 0→0（回滚生效） |

服务级 HTTP（克隆库精确行数）：

| 服务 | 端点 | 状态 | 行数 |
|---|---|---|---|
| WMS | `POST /api/wms/inbound-orders` `{"order_number":"S1-INB-1"}` | 200 | `wms.inbound_orders` 0→1 |
| HRM | `POST /api/hrm/attendance/check-in` | 200 | `hrm.attendance_records` 0→1 |
| HRM | 同上，body `{}` | 400 | `hrm.attendance_records` 1→1；日志 `rls_txn ... 回滚请求事务` |
| SCM | `POST /api/scm/sync/purchase-to-inbound`（正常单） | 200 | `scm.wms_inbound_order_snapshots` 0→1、`sync_logs` +1 |

### 6.4 硬指标未达成：`purchase-to-inbound` 失败后 `sync_logs` 仍落行

实测（同一采购单，强制主 INSERT 失败：副本上加 `BEFORE INSERT` 触发器 `RAISE EXCEPTION`）：

| 次 | HTTP | `sync_logs` | `wms_inbound_order_snapshots` | `purchase_orders.sync_retry_count` |
|---|---|---|---|---|
| 1 | 200 `success:false` | 1 | 0 | 0 |
| 2 | 200 `success:false` | 2 | 0 | 0 |
| 3 | 200 `success:false` | 3 | 0 | 0 |
| 4 | 200 `success:false` | 4 | 0 | 0 |

根因（与中间件无关，属 SCM 数据面）：

1. 该分支返回 **HTTP 200**（`success:false`），命中 2xx 提交路径，不是非 2xx。
2. `record_sync_log` 走 `&state.db`（`PgPool`，自动提交），不经请求事务，回滚与否都不影响它。
3. 主 INSERT 失败后请求事务已中止，随后 `UPDATE … sync_retry_count` 在 `let _ =` 中被吞（`current transaction is aborted`），所以重试次数永远是 0，`>= max_retries` 的 500 分支不可达。

结论：中间件改造本身正确且必要，但「失败不落 sync_logs」必须在 SCM 窗口把 `record_sync_log` 纳入请求事务、并把失败响应改为非 2xx，才能达成。

# RLS 阶段二方案表（2026-11-14）

> 前置：工作树已 `git fetch` 并 rebase 到 `669eed9ed`（含快照重刷 `30d314a0c`、文档 `669eed9ed`）。
> 数据来源：`fixtures/full_schema_contract.sql`（prod 快照）+ `topems-table-inventory-2026-11-14.md` + 本地 dev 库实测。
> 本文件只出方案，不含 SQL、未建迁移、未碰 prod。

## 0. 前置核对（收紧前必须先看）

### 0.1 裸池复核：16 张表已归零

- 阶段一已迁移的 16 张表，读写路径全部为 `state.db.scope*` / `ScopedTxn`；`svc/mes/src` 下残留的 `state.pool` 只用于 `check_permission`（权限查询），不读写业务表。
- 抽查：`equipment.rs`（equipment / equipment_maintenance_records / equipment_inspection_records）、`production_order.rs`、`production_kanban.rs`、`quality_management/standard.rs`、`settings.rs` 均为 scope。
- 结论：**未发现残留裸池读写，可进入收紧**。

### 0.2 阻断项 B1：erp 4 张表的 `tenant_id` 列在 prod 不存在

prod 快照显示 `erp.meeting_rooms` / `erp.meeting_bookings` / `erp.vehicles` / `erp.vehicle_requests` **没有 `tenant_id` 列**（建表语句原文见快照 L6216-6247、L6444-6483），而阶段一 block C 已把这 4 张表的 `INSERT` 改为写入 `tenant_id`。

- 后果：阶段一代码一旦部署到当前 prod，这 4 个创建接口会 `42703 undefined_column`。
- **两句硬前置（都写死，缺一不可）**：
  1. **部署门**：`prod._sqlx_migrations` 的 `max(version) >= 20261114201000`（M2a 已补出 `tenant_id`）时才允许部署新二进制；`max(version) < 20261114201000` 时**禁止部署**。今天没炸只是因为 prod 跑的还是旧二进制（`ff8a6cf5…9722060`）。
  2. **收紧门**：M1 + M2b（策略收紧）只允许在**新二进制已部署**之后投递。旧二进制不设 GUC、走裸连接池，先收紧会让它的读静默变 0 行、写撞 `WITH CHECK`，属于生产级故障。
- **三步投递顺序**（窗口由业务排期）：
  1. **窗口 A**：只投 M2a（`20261114201000`，加列/索引/幂等回填，不动策略）→ 账本 `674 → 675`，旧二进制照跑。
  2. **窗口 B**：部署新二进制（阶段一代码 + K2 修复）。必须在 A 之后，否则 4 个 erp 创建接口全 `42703`。
  3. **窗口 C**：同批投 M1（`20261114200000`）+ M2b（`20261114202000`）→ 账本 `675 → 677`。必须在 B 之后，否则旧二进制被自己的 RLS 挡住。

### 0.3 “11 张”与盘点“12 张”的口径

盘点 §4.2 列出 12 张「无 `tenant_id` 但 RLS=on」。本方案按 **11 张** 处理，排除 `portal.user_preferences`：它按用户主体存偏好，没有可回填的租户来源，盘点结论为“登记白名单、不补列”。若你要求把第 12 张也纳入，需先定它的租户归属规则。

11 张内部再分两类：

- **8 张补列**：`crm.core_crm_customers`、`erp.core_erp_suppliers`、`erp.expenses`、`erp.meeting_rooms`、`erp.meeting_bookings`、`erp.vehicles`、`erp.vehicle_requests`、`portal.portal_announcements`。
- **3 张保持全局、不补列**（见第 3 节）：`erp.holidays`、`erp.core_erp_materials`、`portal.portal_quick_actions`。

## 1. 22 张 mes 表：fail-open → fail-closed

### 1.1 统一目标谓词（USING 与 WITH CHECK 相同）

```sql
COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
```

做法：每表先 `DROP POLICY` 掉现有全部策略（含重复 permissive），再建单一 `rls_tenant_isolation`。不再保留任何 `current_setting(...) IS NULL`、`tenant_id IS NULL`、`app.tenant_id = ''`、nil UUID 兜底分支。

### 1.2 逐表方案

策略形态：A = 新旧两套 `IS NULL` 兜底并存（fail-open 最全）；B = 旧式 `tenant_id IS NULL OR tenant_id = current_setting(...)`；C = `USING (true)`。

| # | 表 | 现行策略（形态 / 名称） | dev 行数（NULL / nil） | 读写是否已作用域 | 风险 |
|---|---|---|---|---|---|
| 1 | `mes.audit_logs` | A：`rls_tenant_isolation` + `tenant_isolation_audit_logs` | 0 / 0 | 是：读 `scope_read`；写经 `SchemaAwareAuditLogService`（HTTP 租户通道，后台无租户走 `scope_system`） | 低 |
| 2 | `mes.dashboard_stats` | A+B：`rls_tenant_isolation` + `tenant_isolation_dashboard_stats` | 0 / 0 | 无代码引用（死表） | 低 |
| 3 | `mes.equipment` | A：`rls_tenant_isolation` | 11 / 1 | 是：`equipment.rs` 全 scope | 低（prod 0 行；dev 1 行 nil 收紧后不可见） |
| 4 | `mes.equipment_inspection_records` | A：`rls_tenant_isolation` | 0 / 0 | 是：`equipment.rs` scope | 低 |
| 5 | `mes.equipment_maintenance_records` | A：`rls_tenant_isolation` | 0 / 0 | 是：`equipment.rs` / `analytics.rs` scope | 低 |
| 6 | `mes.equipment_oee` | B：`tenant_isolation_equipment_oee` | 0 / 0 | 是：`equipment_oee.rs` scope | 低 |
| 7 | `mes.financial_records` | A+B：`rls_tenant_isolation` + `tenant_isolation_financial_records` | 0 / 0 | 无代码引用（死表） | 低 |
| 8 | `mes.material_plans` | A：`rls_tenant_isolation` | 0 / 0 | 是：`material_plan.rs` scope | 低 |
| 9 | `mes.module_settings` | A：`rls_tenant_isolation`（重复 2 条） | 3 / 2 NULL | 是：`settings.rs` `scope_read` 且显式 `WHERE tenant_id = $1` | **中**：2 条 NULL 全局默认行收紧后不可见（dev）；prod 0 行 |
| 10 | `mes.process_route_steps` | A：`rls_tenant_isolation` | 0 / 0 | 是：`process_route.rs` scope | 低 |
| 11 | `mes.process_routes` | A：`rls_tenant_isolation` | 0 / 0 | 是：`process_route.rs` scope | 低 |
| 12 | `mes.production_costs` | B：`tenant_isolation_production_costs` | 0 / 0 | 是：`production_cost.rs` 已 `&mut ScopedTxn` | 低 |
| 13 | `mes.production_orders` | A：`rls_tenant_isolation`（重复 2 条） | 134 / 30 nil + 5 NULL | 是：`production_order.rs` scope | 低（prod 0 行；dev 35 行兜底行收紧后不可见） |
| 14 | `mes.production_processes` | A：`rls_tenant_isolation` | 10 / **10 NULL** | 是：`production_process.rs` scope | 低（prod 0 行；dev 10 行 NULL 全部不可见） |
| 15 | `mes.production_records` | A：`rls_tenant_isolation` | 3 / 1 | 是：`production_record.rs` scope | 低 |
| 16 | `mes.production_schedules` | B：`tenant_isolation_production_schedules`（重复 2 条） | 9678 / **9480 nil** | 是：`production_scheduling.rs` scope | 低（prod 0 行；dev 中 nil 行收紧后不可见） |
| 17 | `mes.quality_standard_values` | A+B：`rls_tenant_isolation` + `tenant_isolation_quality_standard_values` | 0 / 0 | 是：`quality_management/standard.rs` scope | 低 |
| 18 | `mes.quality_standards` | **C：`mes_allow_all_quality_standards` USING(true)** | 1 / 1 nil | 是：`standard.rs` scope | 低（prod 0 行；dev 1 行 nil 不可见） |
| 19 | `mes.supply_chain_orders` | A+B：`rls_tenant_isolation` + `tenant_isolation_supply_chain_orders` | 0 / 0 | 无代码引用（死表） | 低 |
| 20 | `mes.teams` | B：`tenant_isolation_teams` | 0 / 0 | 无代码引用 | 低 |
| 21 | `mes.work_reports` | A+B：`rls_tenant_isolation` + `tenant_isolation_work_reports` | 0 / 0 | 是：`work_report.rs` scope | 低 |
| 22 | `mes.work_stations` | A：`rls_tenant_isolation` | 79 / 2 | 是：`work_station.rs` scope | 低 |

### 1.3 已拍板的处置

1. **`module_settings`：纯 fail-closed，统一单谓词**，不做“NULL 行对所有租户只读”的双策略。dev 的 2 行 NULL 数据原文如下，**不删、不回填**：

   | key | category | value | created_at |
   |---|---|---|---|
   | `auto_release` | production | `true` | `2026-09-13 20:43:29.60744+08` |
   | `test_key` | production | `test_value` | `2026-09-13 20:46:08.23707+08` |

   同名 key 归属核查：真实租户 `652995ba-019d-4556-9b2e-03b256104cda` 已有 `auto_release`（production）→ 该 NULL 行是冗余 seed；`test_key` 无任何真实租户同名行 → 测试数据，归属需业务确认，但不删不填。代码侧 `settings.rs` 是 `scope_read` + 显式 `WHERE tenant_id = $1`，这 2 行今天也读不到，收紧后行为不变。

2. **`quality_standards`**：原 `USING(true)`，直接收紧；dev 1 行 nil 行收紧后不可见，prod 0 行。
3. **三张全局表**（`erp.holidays`、`erp.core_erp_materials`、`portal.portal_quick_actions`）**本轮不动策略**，保持 `USING(true)`，行为不变；改 system-only 会需要同步改读路径，另立事项。

## 2. 8 张补 `tenant_id`

统一做法：`ADD COLUMN tenant_id uuid`（先 nullable，0 行无阻塞；同一迁移内回填后视情况 `SET NOT NULL`）→ 建 `(tenant_id)` 索引 → 删除旧 `true/true` 策略 → 建第 1.1 节目标策略。回填原则沿用既有口径：**能 JOIN 归因才回填，猜不出就留 NULL 并保持不可见**。

| 表 | prod 行 | 回填值来源 | 允许 NULL | 唯一索引影响 | 代码写入点 |
|---|---|---|---|---|---|
| `erp.meeting_rooms` | 0 | 无行可回填；新建由请求租户写入 | 是（0 行） | 无唯一约束 | `meeting_room.rs`（阶段一已写 `tenant_id`）**依赖本迁移** |
| `erp.meeting_bookings` | 0 | 同上；理论上可由 `room_id → meeting_rooms.tenant_id` 回填 | 是（0 行） | 无唯一约束 | `meeting_room.rs`（已写 `tenant_id`）**依赖本迁移** |
| `erp.vehicles` | 0 | 无行可回填；新建由请求租户写入 | 是（0 行） | `vehicles_plate_number_key UNIQUE(plate_number)` 仍为**全局唯一**；车牌本身全局唯一，建议保留，不改索引 | `vehicles.rs`（已写 `tenant_id`）**依赖本迁移** |
| `erp.vehicle_requests` | 0 | 可由 `vehicle_id → vehicles.tenant_id` 回填 | 是（0 行） | 无唯一约束 | `vehicles.rs`（已写 `tenant_id`）**依赖本迁移** |
| `erp.expenses` | 0 | 空壳表（只有 id、deleted_at）；finance 服务实际写的是 `finance.expenses` | 是（0 行） | 无 | 无（`erp.expenses` 无写入点） |
| `crm.core_crm_customers` | 0 | 空壳表 | 是（0 行） | 无 | 无 |
| `erp.core_erp_suppliers` | 0 | 空壳表 | 是（0 行） | 无 | 无 |
| `portal.portal_announcements` | 0 | 空壳表 | 是（0 行） | 无 | 无 |

> 这 8 张 prod 均为 0 行，因此“回填”实际是空操作；迁移里仍保留可重跑的回填语句（按上表 JOIN 来源），避免演练库/未来数据留 NULL。

## 3. 三张全局表：单独列出（不在 22 张内）

这三张表现在就是 `USING(true) WITH CHECK(true)`，没有 `current_setting` 分支；prod 今天返回 0 行。

| 表 | 现行策略 | 收紧后行为是否变化 | 建议 |
|---|---|---|---|
| `erp.holidays` | `USING(true)`（allow_all） | **保持 allow_all → 不变**；若改 system-only，则普通租户读不到（行为变化） | 不补 `tenant_id`、不改策略，登记为全局字典；阶段一代码仍走普通读 |
| `erp.core_erp_materials` | `USING(true)` | 同上 | 同上（`erp/search.rs` 为全局主数据搜索） |
| `portal.portal_quick_actions` | `USING(true)` | 同上 | 同上（平台级快捷入口，dev 5 行均 nil） |

结论：三张表**本轮不动策略**，行为不变；它们不属于“22 张收紧”集合。若你希望改走系统通道，需要同步改读路径（`scope_read_system`），否则前端会读空。

## 4. 迁移规划（已按投递顺序拆分为三笔）

| 迁移 | 版本号 | 内容 | 回滚 |
|---|---|---|---|
| M1 | `20261114200000` | 22 张 mes 表：DROP 全部旧策略 + 建目标策略 | `.down.sql`：删除目标策略、按快照原文恢复 28 条旧策略（逐表一一对应） |
| M2a | `20261114201000` | 8 张表 **只做加法**：`ADD COLUMN IF NOT EXISTS tenant_id` + 索引 + 幂等回填；**不动任何策略**（旧二进制行为不变） | `.down.sql`：删索引；列内无非空数据时删列（有数据保留并 `RAISE NOTICE`） |
| M2b | `20261114202000` | 同 8 张表策略收紧：删 `*_allow_all_*` + 建目标策略 | `.down.sql`：删目标策略、恢复 8 条 allow_all 原文 |

- 版本号顺序固定：M1(200000) < M2a(201000) < M2b(202000)，读账本即可看出「先补列、后收紧」。
- 版本号均 `> 20261114190000`，且不碰 `20261114170000`（今日投递窗口）。
- 投递顺序：窗口 A 只投 M2a → 窗口 B 部署新二进制 → 窗口 C 同批投 M1 + M2b（详见 §0.2）。
- 不改 `20261114100000`、不改 `migration_manifest.yaml` 中它的状态。
- 不碰生产库。

## 5. 演练计划（迁移写完后）

1. 从 prod 克隆到本地演练库（owner=`topems_prod`，非超户）。
2. 四类取证：
   - 本租户读得到自己；
   - 本租户读不到别人；
   - 无 GUC 返回 0 行（而非全量）；
   - 跨租户写返回 `42501`。
3. 额外验证：`app.rls_system='on'` 能读写；审计日志后台写入仍成功。
4. 只合 main，不投生产。

## 6. 迁移文件与演练取证（2026-11-14）

### 6.1 文件

| 迁移 | 文件 | 说明 |
|---|---|---|
| M1 up | `database/migrations/20261114200000_mes_rls_fail_closed_22.sql` | 22 表 DROP 旧策略 + 建统一 fail-closed 策略 |
| M1 down | `database/migrations/20261114200000_mes_rls_fail_closed_22.down.sql` | 删目标策略 + 逐表恢复 28 条原文 |
| M2a up | `database/migrations/20261114201000_add_tenant_id_8_tables.sql` | 8 表补列/索引/可重跑回填；**不动策略**，旧二进制可安全先投 |
| M2a down | `database/migrations/20261114201000_add_tenant_id_8_tables.down.sql` | 删索引 + 无数据时条件删列（有数据保留） |
| M2b up | `database/migrations/20261114202000_erp_crm_portal_rls_fail_closed_8.sql` | 删 8 条 `*_allow_all_*` + 建目标策略 |
| M2b down | `database/migrations/20261114202000_erp_crm_portal_rls_fail_closed_8.down.sql` | 删目标策略 + 恢复 8 条 allow_all 原文 |

回滚放位依据：`scripts/migration/validate.sh` 第 269-295 行的 down 检查只认 migration 同目录的 `<base>.down.sql`（`down_file="$full_dir/${base}.down.sql"`），且第 285 行把 `*.down.sql` 排除出 up 列表；仓库历史约定 `database/rollback/<version>_<name>.rollback.sql` 没有任何脚本读取（`grep -rln "database/rollback" scripts/ .github/` 为空）。因此**工具链入口是 `.down.sql`**，`database/rollback/` 下的三份镜像仅为人工对照，文件头已注明“非工具链入口”。

### 6.2 本地演练库

- 演练库 `topems_rls_drill` 由 prod 快照 `fixtures/full_schema_contract.sql` 恢复，owner `topems_prod`（非超户），测试会话 `SET ROLE topems_prod`（表上 `FORCE RLS` 生效）。

### 6.3 取证结果

| 场景 | 结果 |
|---|---|
| M1 up | 28 条旧策略 → 22 表各 1 条 `rls_tenant_isolation` |
| M1 down | `pg_policies` 与基线逐表 diff **为空**（含 `qual` / `with_check` 原文） |
| M2a up | 8 表均出现 `tenant_id` 列 + 索引；8 张表策略仍是 `*_allow_all_*`（**不动策略**） |
| M2a down | 无数据时 8 个 `tenant_id` 列删除、索引删除；有数据时保留列并 `RAISE NOTICE` |
| M2b up | 8 条 `*_allow_all_*` 删除，8 表各建 1 条 `rls_tenant_isolation`（目标谓词） |
| M2b down | 8 条目标策略删除，恢复 8 条 allow_all 原文（`true/true`） |
| 旧二进制模拟（仅 M2a 后：无 GUC、裸连接池） | `erp.meeting_rooms` INSERT + SELECT 正常（allow_all 未被改动） |
| 租户 A 读自己 | `1/1/1/1`（rooms/bookings/vehicles/vehicle_requests） |
| 租户 B 读 A 的数据 | `0/0/0/0` |
| 无 GUC 读 | `0/0/0/0`（不是全量） |
| 跨租户写 | `ERROR: 42501 new row violates row-level security policy` |
| `app.rls_system='on'` | 可见两租户数据（module_settings 2 行） |
| 新策略下执行 4 条 erp 创建 INSERT | 全部成功（rooms_ok / bookings_ok / vehicles_ok / vehicle_requests_ok） |

### 6.4 “新代码 + 新策略” handler 级实测（2026-11-14 补）

在演练库上直接调用 ERP 四个创建 handler（`create_room` / `create_booking` / `create_vehicle` / `create_vehicle_request`），
请求事务与 GUC 完全照 `tenant_middleware`：`BEGIN` + `set_config('app.tenant_id', <租户>, true)` + `set_config('app.rls_system','off',true)`；
连接角色 `topems_prod`（`rolsuper=false`、`rolbypassrls=false`），`search_path = erp, public, shared`（与 ERP 生产连接一致）。

运行方式：`DATABASE_URL="postgres://topems_prod@localhost/topems_rls_drill?host=/tmp" cargo test -p topems-erp --test rls_drill_erp_create -- --ignored --nocapture`

| 步骤 | 结果 |
|---|---|
| `[env]` | `user=topems_prod bypassrls=false super=false` |
| `[1] POST /meeting-rooms` | `success=true 会议室创建成功`；`tenant_id` 落库 = claims 租户 |
| `[2] POST /meeting-bookings` | `success=true 会议预约创建成功`；`tenant_id` 落库 = claims 租户 |
| `[3] POST /vehicles` | `success=true 车辆创建成功`；`tenant_id` 落库 = claims 租户 |
| `[4] POST /vehicle-requests` | `success=true 车辆申请创建成功`；`tenant_id` 落库 = claims 租户 |
| `[5] 租户 B 用租户 A 的会议室建预约` | `success=false 会议室不可用或不存在`（RLS 隐藏，非越权） |
| 超户复核 4 表行数 | `rooms=1 / bookings=1 / vehicles=1 / vehicle_requests=1`，均带正确 `tenant_id` |
| 审计（`erp.audit_logs`，系统通道） | 4 条 `action=create`、`entity_type=meeting_room/meeting_booking/vehicle/vehicle_request`、`status=success`，`tenant_id` 均正确 |

> 审计说明：ERP 的 `log_audit_event` 使用连接 `search_path` 首 schema，实测落在 `erp.audit_logs`（非 `public.audit_logs`）；
> 演练库中先给 `topems_prod` 补 `GRANT SELECT,INSERT,UPDATE,DELETE ON public.audit_logs`（仅演练库，模拟生产 owner 权限）。

**既有缺陷 K2（非本次引入，已单独修复）**：
`create_booking` 的 `SELECT id, name FROM meeting_rooms` 与 `create_vehicle_request` 的 `SELECT id, plate_number, status FROM vehicles`
都是直接 `query_as::<_, MeetingRoom/Vehicle>`，而这两个 `FromRow` 结构体分别要求 8 / 12 列，缺列即报错，接口 500。
引入提交：`704870c35`（2026-09-09，“RLS A方案批2a”），**早于阶段一**；与 `tenant_id`、RLS 策略均无关。

- 改前原始报错（用同一条 SQL + 同结构体复现）：`BOOKING_ERR=no column found for name: capacity`、`VEHICLE_REQ_ERR=no column found for name: brand`；
  接口侧表现为 `code=500`、`message=内部服务器错误`。
- 修法：两条查询改成**显式列出结构体全部字段**（不建“最小投影结构体”、不用 `SELECT *`），列名与 `MeetingRoom`/`Vehicle` 一一对应。
- 改后：新增 `svc/erp/tests/meeting_vehicle_create_e2e.rs`，两个成功用例均 `code == 200`，返回体 `room_id` / `vehicle_id` 与父实体一致，落库 `tenant_id` = claims 租户。

**结论**：
1. M1 + M2a + M2b 之后，「阶段一代码的 4 条 INSERT」与表结构、策略完全匹配，可写入且租户绑定正确；
2. K2 已修复并有用例钉住，4 个 erp 创建接口在新二进制 + 新策略下均可用。

## 7. 落地记录（2026-11-14，只合 main，未投生产）

| 提交 | 内容 |
|---|---|
| `98daa8fe7` | feat(db)：M1 + M2a + M2b 三笔迁移、`database/rollback/` 三份回滚、manifest 登记、checksums 重刷 |
| `a64ba7c05` | test(erp)：RLS 阶段二 handler 级演练用例（`#[ignore]`，需演练库） |
| `8e6001bd9` | fix(erp)：K2 修复（两条查询显式完整投影）+ 两个成功用例 |

- 已 rebase 到 `3b9c45417`（当时最新 main），pre-commit / pre-push 钩子全绿；`3b9c45417..8e6001bd9  HEAD -> main`。
- `git ls-remote origin refs/heads/main` → `8e6001bd9c351c54282b9a69f91b0589472e48e7`。
- **回滚放位最终结论**：`scripts/check-migration-names.mjs --strict` 会把 `database/migrations/*.down.sql` 判为
  `UNKNOWN pattern` 并阻断提交；仓库统一入口是 `database/rollback/<version>_<name>.rollback.sql`（与 100+ 历史迁移一致）。
  validate.sh 的 down 检查只产生 WARN（全仓 725 条均为 WARN），不作为放位依据。
- manifest 无生成脚本（`grep -rln "migration_manifest" scripts/ .github/` 为空），按仓库既有格式追加三笔；
  checksums.txt 由 `scripts/migration/validate.sh` 重写（新增 3 行，对应 3 个 up 文件）。
- prod 未触碰；投递窗口 A/B/C 由业务排期，**先 M2a，再新二进制，最后 M1 + M2b**。


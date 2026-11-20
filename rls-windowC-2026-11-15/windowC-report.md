# 窗口 C 最终态报告（2026-11-15 00:31–00:45 本地时间 / 2026-11-14T16:31–16:45Z）

- 目标：同批投 M1 `20261114200000` + M2b `20261114202000`，账本 675 → 677
- 实际执行顺序（父会话裁定）：先 M2b（正常扫描通道）→ 核 8 表 + 功能 → 再 M1（`--apply-deferred` 补投）
- 主机：`xingzhai@192.168.3.129`，库 `topems_prod`；应用 pid 82863，二进制 `98af398c…fa7139`，**全程未重启、未换件**

## 1. 账本与两道门

| 项 | 现状 |
|---|---|
| `_sqlx_migrations` | **`677 \| 20261114202000`** |
| `20261114200000`（M1） | `success = t`，`installed_on 2026-11-15 00:32:15.4+08` |
| `20261114202000`（M2b） | `success = t`，`installed_on 2026-11-15 00:31:59.7+08` |
| 部署门 `max(version) >= 20261114201000` | **已满足**（677 ≥ 20261114201000，且新二进制确已部署在跑） |
| 收紧门「新二进制已部署」 | **已满足**（`shasum ~/topems/bin/topems-server` = `98af398c…fa7139`，pid 82863） |
| 仍 pending | `20261114180000`、`20261114190000`（按令未投） |

投递原文：

```
# M2b（正常通道）
== 待应用 1 条（anchor=20261114201000，only=20261114202000）
-- 20261114202000_erp_crm_portal_rls_fail_closed_8.sql
== OK：应用 1 条，无失败

# M1（DEFER 补投模式，ticket=TOPEMS-RLS-PHASE2-C-20261115，账本水位=20261114202000）
-- 20261114200000_mes_rls_fail_closed_22.sql
== OK：应用 1 条，无失败
```

## 2. 30 张表策略清单（投后）

全部 30 张表：`rls_tenant_isolation` 各 1 条，`relrowsecurity=t`、`relforcerowsecurity=t`，谓词逐字一致（`count(distinct qual)=1`）：

```
((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text)
 OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))
```

`with_check` 与 `qual` 完全相同；无任何 `IS NULL` / nil UUID / 空串 fallback 分支（自检 30/30）。

| # | 表 | 策略 | FORCE RLS |
|---|---|---|---|
| 1 | crm.core_crm_customers | rls_tenant_isolation | t |
| 2 | erp.core_erp_suppliers | rls_tenant_isolation | t |
| 3 | erp.expenses | rls_tenant_isolation | t |
| 4 | erp.meeting_bookings | rls_tenant_isolation | t |
| 5 | erp.meeting_rooms | rls_tenant_isolation | t |
| 6 | erp.vehicle_requests | rls_tenant_isolation | t |
| 7 | erp.vehicles | rls_tenant_isolation | t |
| 8 | mes.audit_logs | rls_tenant_isolation | t |
| 9 | mes.dashboard_stats | rls_tenant_isolation | t |
| 10 | mes.equipment | rls_tenant_isolation | t |
| 11 | mes.equipment_inspection_records | rls_tenant_isolation | t |
| 12 | mes.equipment_maintenance_records | rls_tenant_isolation | t |
| 13 | mes.equipment_oee | rls_tenant_isolation | t |
| 14 | mes.financial_records | rls_tenant_isolation | t |
| 15 | mes.material_plans | rls_tenant_isolation | t |
| 16 | mes.module_settings | rls_tenant_isolation | t |
| 17 | mes.process_route_steps | rls_tenant_isolation | t |
| 18 | mes.process_routes | rls_tenant_isolation | t |
| 19 | mes.production_costs | rls_tenant_isolation | t |
| 20 | mes.production_orders | rls_tenant_isolation | t |
| 21 | mes.production_processes | rls_tenant_isolation | t |
| 22 | mes.production_records | rls_tenant_isolation | t |
| 23 | mes.production_schedules | rls_tenant_isolation | t |
| 24 | mes.quality_standard_values | rls_tenant_isolation | t |
| 25 | mes.quality_standards | rls_tenant_isolation | t |
| 26 | mes.supply_chain_orders | rls_tenant_isolation | t |
| 27 | mes.teams | rls_tenant_isolation | t |
| 28 | mes.work_reports | rls_tenant_isolation | t |
| 29 | mes.work_stations | rls_tenant_isolation | t |
| 30 | portal.portal_announcements | rls_tenant_isolation | t |

明细文件：`policy_list_AFTER.tsv`（本目录）。

## 3. 与窗口前快照的 diff

- 快照：`pg_policies_BEFORE.txt`（sha256 `b4e1ef35…3f708`，36 行）→ `pg_policies_AFTER.txt`（30 行）。
- **36 = 30 + 6**：30 张目标表各 1 条 + 6 张表各多 1 条遗留/重复策略。被移除的 6 条重复策略（全部落在 22 张 mes 目标表内，属 M1「逐表 DROP 全部旧策略再建单一策略」的设计行为）：`mes.audit_logs/tenant_isolation_audit_logs`、`mes.dashboard_stats/tenant_isolation_dashboard_stats`、`mes.financial_records/tenant_isolation_financial_records`、`mes.quality_standard_values/tenant_isolation_quality_standard_values`、`mes.supply_chain_orders/tenant_isolation_supply_chain_orders`、`mes.work_reports/tenant_isolation_work_reports`。
- 另外 12 条被移除的是 11 条 `*_tenant_isolation_*`/`mes_allow_all_quality_standards` 与 8 条 `*_allow_all_*` 旧形态，均在各目标表上被替换，共移除 19 条、新增 13 条 `rls_tenant_isolation`（此前 17 张表没有同名策略）。
- **22+8 之外零改动**：两个迁移文件共引用恰好 **30** 个表名；三张全局表仍保持 `USING(true) WITH CHECK(true)` 不变——`erp.holidays`（`erp_allow_all_holidays`）、`erp.core_erp_materials`（`erp_allow_all_core_erp_materials`）、`portal.portal_quick_actions`（`portal_allow_all_portal_quick_actions`）。
- 结论：改动只落在 22 + 8 张表上；不存在“范围外 6 条未动”的第三组策略，快照内 36 条已全部解释。

## 4. 功能实测

### 4.1 M2b 之后（8 表收紧、mes 仍 fail-open）

| 接口 | 结果 |
|---|---|
| `GET /api/erp/meeting-rooms` | 200，`total=1`（`K2B验收会议室-20261115`，`54954188…2c3d`） |
| `GET /api/erp/meeting-bookings` | 200，`total=1`（`K2B验收预约`，`e241db00…28b8`） |
| `GET /api/erp/vehicle-requests` | 200，`total=1`（`908c4ee2…f9ae`，`vehicle_id 080abf1f…cd50`） |

### 4.2 M1 之后：两段证据（0 行问题）

**第一段：prod 无数据导致的合法 0 行。** `GET /api/mes/equipment`、`/api/mes/equipment/statistics`、`/api/mes/orders`、`/api/mes/work-reports` 均 200，返回 `total=0` / 空数组；超户直连（RLS 对超户不生效）22 张 mes 表 `count(*)=0`。即 API 的 total 与物理行数完全相等，不存在“被 RLS 多挡一层”的差集。（`/api/mes/dashboard`、`/api/mes/production-orders`、`/api/mes/production-records*` 是 404 路径不存在，不是 500。）

**第二段：正向对照证明读路径未被 RLS 过滤。** 用 `mes.module_settings` + `GET /api/mes/settings/{category}`（`settings.rs` 走 `state.db.scope_read()`）：

| 步骤 | 结果 |
|---|---|
| 超户插 1 行，`tenant_id=00000000-0000-0000-0000-000000000001` | 成功（`d39237e0…d8aa`） |
| 同租户(…0001) 调接口 | 200 `{"settings":{"probe_key":"probe_value"}}` **看得到** ✅ |
| 另一租户(…0002，同 user 不同 tenant 的 JWT) 调同一接口 | 200 `{"settings":{}}` **看不到** ✅ |
| 应用角色裸连接（无 GUC）读该表 | `count(*)=0`（不是全量）✅ |
| 同连接带 GUC 对照 | …0001 → `1`；…0002 → `0` ✅ |
| 删除测试行 | `count(*)=0` ✅ |

## 5. 清理窗口 B 的 4 行验收数据

- 同租户(…0001) API 软删 4 条：booking / vehicle-request / meeting-room / vehicle 全 200。
- 跨租户(…0002) 删同一 4 个 id：全 404，且 …0001 仍能读到原行（隔离成立）。
- 软删后物理仍为 1 行/表，按父会话裁定改为**超户、单事务、按 4 个 id 精确硬删**（删前确认每表恰好 1 行，`DELETE 1` ×4）：

| 表 | 删前 | 删后物理 `count(*)` | 列表 `total` |
|---|---|---|---|
| erp.meeting_bookings | 1（e241db00…28b8） | **0** | 0 |
| erp.vehicle_requests | 1（908c4ee2…f9ae） | **0** | 0 |
| erp.meeting_rooms | 1（54954188…2c3d） | **0** | 0 |
| erp.vehicles | 1（080abf1f…cd50） | **0** | 0 |

`mes.module_settings` 正向对照行已删，`count(*)=0`。
`list_vehicle_requests` 缺 `deleted_at IS NULL` 已登记为缺陷 **K3**（见 `topems-table-inventory-2026-11-14.md` §7），本轮不动代码。

## 6. 运行态与 10 分钟观测（三次取样，每 5 分钟）

```
sample#1 2026-11-14T16:34:46Z health=200 pid=82863 idle_in_txn=0 deadlocks=0 window_ERROR=0 window_newlines=8
sample#2 2026-11-14T16:39:46Z health=200 pid=82863 idle_in_txn=0 deadlocks=0 window_ERROR=0 window_newlines=18
sample#3 2026-11-14T16:44:46Z health=200 pid=82863 idle_in_txn=0 deadlocks=0 window_ERROR=0 window_newlines=28
```

- `/health` 三次全 200；pid 全程 82863（**未重启，停机 0 秒**）
- `~/topems/logs/server.out` 窗口期（≥16:31:07Z）新增 **ERROR 0 条**（级别分布：INFO 29、WARN 0、ERROR 0），新增行全部是 `topems_search::projection: [search] 订阅者心跳 alive`
- `idle in transaction = 0`、`deadlocks = 0`

## 7. 回滚命令（若需反向）

回滚文件（已提交 main）：`database/rollback/20261114200000_mes_rls_fail_closed_22.rollback.sql`、`database/rollback/20261114202000_erp_crm_portal_rls_fail_closed_8.rollback.sql`。

```bash
# 0) 先投文件到远端
scp database/rollback/20261114200000_mes_rls_fail_closed_22.rollback.sql \
    database/rollback/20261114202000_erp_crm_portal_rls_fail_closed_8.rollback.sql \
    xingzhai@192.168.3.129:~/topems/window-2026-11-15-windowC/rollback/

# 1) 回滚 M1（22 张 mes）——单事务：恢复策略 + 删账本行
ssh xingzhai@192.168.3.129 '/opt/homebrew/bin/psql -d topems_prod -1 -v ON_ERROR_STOP=1 \
  -f ~/topems/window-2026-11-15-windowC/rollback/20261114200000_mes_rls_fail_closed_22.rollback.sql \
  -c "DELETE FROM public._sqlx_migrations WHERE version = 20261114200000;"'

# 2) 回滚 M2b（8 张 erp/crm/portal）——单事务：恢复 8 条 allow_all + 删账本行
ssh xingzhai@192.168.3.129 '/opt/homebrew/bin/psql -d topems_prod -1 -v ON_ERROR_STOP=1 \
  -f ~/topems/window-2026-11-15-windowC/rollback/20261114202000_erp_crm_portal_rls_fail_closed_8.rollback.sql \
  -c "DELETE FROM public._sqlx_migrations WHERE version = 20261114202000;"'
```

**验证判据（两条都必须为空）**

1. M1 回滚后：22 张 mes 的 `pg_policies` 与基线 `~/topems/backups/20261115-windowC-policies/policies_raw_BEFORE.tsv` 中 `mes|*` 部分逐字一致（strategy 数 22 → 28），手工 diff 为空。
2. M2b 回滚后：8 张表的 `pg_policies` 与窗口 A 基线 `~/topems/backups/20261115-windowA-tenant-id/pg_policies_BEFORE.txt` diff 为空（8 条 `*_allow_all_*` `USING(true) WITH CHECK(true)` 原样恢复）；`tenant_id` 列保留（M2a 不回滚）。
3. 账本：只回 M1 → 676（max 仍 `20261114202000`）；两条都回 → 675（max `20261114201000`）。

## 8. 结论

窗口 C 完成：账本 677，30 张目标表统一 fail-closed 单谓词 + FORCE RLS，范围外零改动；8 项后置判据全绿（账本 / 策略 / 功能 / 清理 / health / pid / 日志 ERROR / idle+deadlock），停机 0 秒，未命中断路条件。

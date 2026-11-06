# 租户来源混用收敛方案（盘点 + 路线选择）

- 日期：2026-11-06
- 状态：**已拍板，按批次执行中**（P0 迁移未应用；B1 mes/qms/finance、B2 pm/portal/integration/analytics、B3 crm/wms/scm/lims/gis/rd/unified-core 已完成并验证；待 B4 master-data/mobile）
- 范围：`svc/**` 中 SQL 以 GUC `app.tenant_id` 作租户谓词、但执行在 `state.pool` 上的调用点；以及 `GET /orders/{id}` 这类"无租户谓词 + 无 deleted_at 过滤"的 pool 读
- 关联提交（已完成的止血）：`8e1c47bf7`（qms FMEA uuid `::TEXT`）、`2a468f7db`（mes 生产订单写路径改 Claims）、`abb730e49`（finance 费用审批校验与落库）

---

## 0. TL;DR

1. **这不是"偶发 404"，而是租户隔离整体失效。** `tenant_middleware` 把 `app.tenant_id` 设在**请求事务**连接上（`set_config(..., is_local=true)`），而同一 handler 内的 `state.pool` 取的是**另一条连接**，那条连接上 GUC 恒为空。
2. **RLS 在 GUC 为空时是全放行的**——实测 `pg_policy` 中 `rls_tenant_isolation` 的谓词包含 `current_setting(...) IS NULL OR current_setting(...) = ''` 两条"未设即豁免"分支，且 `mes.production_orders` 等表 `relrowsecurity=t / relforcerowsecurity=t`、owner 就是应用角色 `topems_prod`。**因此 pool 连接上 RLS 等于关闭。**
3. 于是租户隔离只剩 SQL 里那条 GUC 谓词兜底，而它在 pool 上必然退化：
   - **严格型**（`tenant_id = COALESCE(NULLIF(guc,''), nil)`）→ 退化为 `tenant_id = nil` → 普通租户行 **恒 0 行** → 写返回 404、读返回空（功能不可用）；
   - **宽松型**（`... IS NULL OR tenant_id = ...`）→ GUC 为空时左支为 TRUE → **跨租户可读可写**（越权）。
4. 全仓复核：**147 处 SQL 调用点 / 51 个文件**；其中宽松型 65 处（P0 跨租户）、严格型 82 处（P1 恒 0 行/写 nil 租户）。
5. 推荐路线：**C——以"RLS 收紧为 fail-closed"作为地基，请求链路统一走请求事务（方案 B 主干），非请求链路（service/后台/移动端 service token）显式绑定 Claims 参数（方案 A）**。分批 5 批推进，第一批只做 mes/qms/finance。

---

## 1. 事实基础（本次实测证据，非推断）

### 1.1 GUC 只存在于请求事务连接

`lib/shared-auth/src/middleware/tenant.rs`：

- L222-L228：`pool.begin()` 开事务；
- L236-L239：`SELECT set_config('app.tenant_id', $1, true)` —— 第三个参数 `true` 表示 **is_local**，只在当前事务内有效；
- L262-L265：事务放进 `RlsTxnCell` 扩展到请求，handler 需要自己 `Extension(txn)` 取出才在同一条连接上；
- L267-L268：响应收尾统一 `commit`。

结论：**任何 `&state.pool` / `&self.db` / `db` 参数上的查询，其连接上 `current_setting('app.tenant_id', true)` 为 NULL。**

### 1.2 RLS 在 GUC 为空时全放行（实测）

```
$ psql ... -c "select relname, relrowsecurity, relforcerowsecurity, pg_get_userbyid(relowner) from pg_class
               where oid in ('\"mes\".\"production_orders\"'::regclass, '\"mes\".\"teams\"'::regclass,
                             '\"pm\".\"settlements\"'::regclass, '\"finance\".\"reconcile_orders\"'::regclass);"
production_orders|t|t|topems_prod
teams|t|t|topems_prod
settlements|t|t|topems_prod
reconcile_orders|t|t|topems_prod
```

```
$ psql ... -c "select polname, pg_get_expr(polqual, polrelid) from pg_policy
               where polrelid='\"mes\".\"production_orders\"'::regclass;"
rls_tenant_isolation|((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)
  OR (current_setting('app.tenant_id'::text, true) IS NULL)
  OR (current_setting('app.tenant_id'::text, true) = ''::text)
  OR (tenant_id IS NULL)
  OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))
```

第 2、3 分支是"未设即豁免"。**pool 连接上 GUC 未设 → 策略整体为 TRUE → 全表可见、全表可写。**

### 1.3 内置反例（本轮已修 vs 未修）

| 路径 | 租户谓词 | 执行目标 | 实测现象 |
|---|---|---|---|
| `PUT /api/mes/orders/{id}/release`（修复前） | 严格型 | `&state.pool` | 同租户同 ID 也 404（`2a468f7db` 已改成 Claims 绑定参数） |
| `GET /api/mes/orders/{id}`（**未修**） | **无租户谓词** | `&state.pool` | 只要知道 UUID 即可跨租户读取；且 `WHERE id=$1` **没有 `deleted_at IS NULL`**，已软删订单仍返回 200 |
| `POST /api/mes/orders/from-erp` | 事务内，但 `tenant_id` 绑定 `Uuid::nil()` | `&mut *tx` | 落库行 `tenant_id=nil`，本租户列表/详情不可见（`production_order.rs` L~700 的 VALUES 末位） |

---

## 2. 盘点口径与总量

### 2.1 与上一轮 34 文件/140 处的对账

| 口径 | 文件 | 处数 | 说明 |
|---|---|---|---|
| 上一轮（文本级 grep，仅覆盖 mes/qms/finance/pm/portal/integration/analytics/unified-core/lims/plugin-registry） | 34 | 140 | 同一 SQL 语句内 `app.tenant_id` 出现 2-4 次，按文本出现计；事务内正常用法也被计入 |
| 本轮（SQL 调用点级，全仓补扫） | **51** | **147** | 每条 `sqlx::query*` 调用计 1 处；补扫新增 crm 9、master-data 59、mobile 7、wms/scm/gis/rd/lims 共 13 |
| 其中上一轮覆盖的子集 | 28 | 66 | 事务内正常用法（209 处）本轮已剔除 |

> 差异结论：**处数从 140 降到 147 的体积是同一量级，但"文件"从 34 增至 51，说明上一轮漏扫了 crm / master-data / mobile 等 crate。**
> 生成脚本见附录 A，可复现。

### 2.2 总量与危害分布

| 指标 | 数值 |
|---|---|
| SQL 调用点 | 147 |
| 文件 | 51 |
| 写（UPDATE/DELETE/INSERT/WITH） | 132 |
| 读（SELECT） | 15 |
| 宽松型谓词（P0 跨租户） | 65（44%） |
| 严格型谓词（P1 恒 0 行） | 82（56%） |
| 其中 INSERT 且 `tenant_id` 取 GUC（P1 写 nil 租户） | 36 |
| 事务内正常用法（对照，不在本次范围） | 209 |

按模块：

| 模块 | 处数 | 文件 |
|---|---|---|
| master-data | 59 | 10 |
| mes | 42 | 15 |
| crm | 9 | 3 |
| mobile | 7 | 5 |
| pm | 6 | 2 |
| analytics | 6 | 2 |
| integration | 5 | 4 |
| portal | 2 | 1 |
| finance | 2 | 1 |
| rd | 2 | 1 |
| gis | 2 | 2 |
| qms / unified-core / wms / scm / lims | 各 1 | 各 1 |

---

## 3. 完整清单

> 列含义：**算子**为 SQL 首关键字；**谓词形态**中"宽松"= `NULLIF(NULLIF(guc,''),nil)::UUID IS NULL OR tenant_id = ...`（GUC 空即全放行），"严格"= `tenant_id = COALESCE(NULLIF(guc,'')::uuid, nil)`（GUC 空退化为 nil）；**路由**为 `—` 表示 handler 未在所在 crate 内以字面量 `.route(...)` 注册（多由集中路由表或别名挂载）。
> 危害等级：**P0 跨租户**（可读写他人数据）、**P1 恒 0 行**（写 404 / 读空）、**P1 写 nil 租户**（写入行后本租户不可见）。


#### mes（42 处 / 15 文件）

| 文件 | 行 | handler | 路由 | 算子 | 谓词形态 | 危害 |
|---|---|---|---|---|---|---|
| mes/src/modules/equipment.rs | L562 | delete_equipment | — | UPDATE | 严格(=COALESCE) | P1 恒 0 行 |
| mes/src/modules/equipment.rs | L615 | maintenance_equipment | /equipment/{id}/maintenance | UPDATE | 严格(=COALESCE) | P1 恒 0 行 |
| mes/src/modules/equipment.rs | L1001 | update_maintenance_status | /maintenances/{id}/status | UPDATE | 严格(=COALESCE) | P1 恒 0 行 |
| mes/src/modules/equipment_oee.rs | L725 | update_oee_record | — | UPDATE | 严格(=COALESCE) | P1 恒 0 行 |
| mes/src/modules/equipment_oee.rs | L834 | delete_oee_record | — | UPDATE | 严格(=COALESCE) | P1 恒 0 行 |
| mes/src/modules/material_plan.rs | L276 | update_material_plan | — | UPDATE | 严格(=COALESCE) | P1 恒 0 行 |
| mes/src/modules/material_plan.rs | L354 | transition_status | — | UPDATE | 严格(=COALESCE) | P1 恒 0 行 |
| mes/src/modules/process_flow.rs | L547 | update_process_flow | — | UPDATE | 严格(=COALESCE) | P1 恒 0 行 |
| mes/src/modules/process_flow.rs | L625 | delete_process_flow | — | UPDATE | 严格(=COALESCE) | P1 恒 0 行 |
| mes/src/modules/process_route.rs | L531 | update_process_route | — | UPDATE | 严格(=COALESCE) | P1 恒 0 行 |
| mes/src/modules/process_route.rs | L616 | delete_process_route | — | UPDATE | 严格(=COALESCE) | P1 恒 0 行 |
| mes/src/modules/process_route.rs | L876 | update_route_step | /process-routes/{id}/steps/{step_id} | UPDATE | 严格(=COALESCE) | P1 恒 0 行 |
| mes/src/modules/production_plan.rs | L417 | submit_plan | /production-plans/{id}/submit | UPDATE | 严格(=COALESCE) | P1 恒 0 行 |
| mes/src/modules/production_plan.rs | L473 | approve_plan | /production-plans/{id}/approve | UPDATE | 严格(=COALESCE) | P1 恒 0 行 |
| mes/src/modules/production_plan.rs | L529 | reject_plan | /production-plans/{id}/reject | UPDATE | 严格(=COALESCE) | P1 恒 0 行 |
| mes/src/modules/production_process.rs | L445 | update_process | — | UPDATE | 宽松(IS NULL OR) | P0 跨租户 |
| mes/src/modules/production_process.rs | L519 | delete_process | — | UPDATE | 宽松(IS NULL OR) | P0 跨租户 |
| mes/src/modules/production_process.rs | L566 | deactivate_process | /processes/{id}/deactivate | UPDATE | 宽松(IS NULL OR) | P0 跨租户 |
| mes/src/modules/production_record.rs | L468 | update_record | — | UPDATE | 宽松(IS NULL OR) | P0 跨租户 |
| mes/src/modules/production_record.rs | L541 | delete_record | — | UPDATE | 宽松(IS NULL OR) | P0 跨租户 |
| mes/src/modules/production_record.rs | L591 | complete_record | /records/{id}/complete | UPDATE | 宽松(IS NULL OR) | P0 跨租户 |
| mes/src/modules/production_scheduling.rs | L674 | update_production_schedule | — | UPDATE | 严格(=COALESCE) | P1 恒 0 行 |
| mes/src/modules/production_scheduling.rs | L782 | delete_production_schedule | — | UPDATE | 严格(=COALESCE) | P1 恒 0 行 |
| mes/src/modules/production_scheduling.rs | L840 | adjust_schedule | /schedules/{id}/adjust | UPDATE | 严格(=COALESCE) | P1 恒 0 行 |
| mes/src/modules/quality_management/inspection.rs | L599 | delete_inspection | — | UPDATE | 严格(=COALESCE) | P1 恒 0 行 |
| mes/src/modules/quality_management/patrol.rs | L490 | delete_patrol | — | UPDATE | 严格(=COALESCE) | P1 恒 0 行 |
| mes/src/modules/quality_management/patrol.rs | L699 | update_patrol_item | /quality/patrol-items/{id} | UPDATE | 严格(=COALESCE) | P1 恒 0 行 |
| mes/src/modules/quality_management/patrol.rs | L760 | delete_patrol_item | — | UPDATE | 严格(=COALESCE) | P1 恒 0 行 |
| mes/src/modules/quality_management/standard.rs | L783 | delete_standard | — | UPDATE | 严格(=COALESCE) | P1 恒 0 行 |
| mes/src/modules/team.rs | L459 | create_team | — | UPDATE | 严格(=COALESCE) | P1 恒 0 行 |
| mes/src/modules/team.rs | L510 | update_team | — | UPDATE | 严格(=COALESCE) | P1 恒 0 行 |
| mes/src/modules/team.rs | L582 | delete_team | — | UPDATE | 严格(=COALESCE) | P1 恒 0 行 |
| mes/src/modules/team.rs | L713 | add_team_member | — | UPDATE | 严格(=COALESCE) | P1 恒 0 行 |
| mes/src/modules/team.rs | L784 | remove_team_member | /teams/{id}/members/{member_id} | UPDATE | 严格(=COALESCE) | P1 恒 0 行 |
| mes/src/modules/work_report.rs | L790 | update_work_report | — | UPDATE | 严格(=COALESCE) | P1 恒 0 行 |
| mes/src/modules/work_report.rs | L903 | delete_work_report | — | UPDATE | 严格(=COALESCE) | P1 恒 0 行 |
| mes/src/modules/work_report.rs | L954 | approve_work_report | /work-reports/{id}/approve | UPDATE | 严格(=COALESCE) | P1 恒 0 行 |
| mes/src/modules/work_report.rs | L1048 | reject_work_report | /work-reports/{id}/reject | UPDATE | 严格(=COALESCE) | P1 恒 0 行 |
| mes/src/modules/work_station.rs | L470 | update_work_station | — | UPDATE | 严格(=COALESCE) | P1 恒 0 行 |
| mes/src/modules/work_station.rs | L527 | delete_work_station | — | UPDATE | 严格(=COALESCE) | P1 恒 0 行 |
| mes/src/modules/work_station.rs | L576 | activate_work_station | /workstations/{id}/activate | UPDATE | 严格(=COALESCE) | P1 恒 0 行 |
| mes/src/modules/work_station.rs | L631 | deactivate_work_station | /workstations/{id}/deactivate | UPDATE | 严格(=COALESCE) | P1 恒 0 行 |

#### qms（1 处 / 1 文件）

| 文件 | 行 | handler | 路由 | 算子 | 谓词形态 | 危害 |
|---|---|---|---|---|---|---|
| qms/src/modules/quality_dashboard.rs | L653 | acknowledge_alert | /alert-messages/{id}/acknowledge | UPDATE | 宽松(IS NULL OR) | P0 跨租户 |

#### finance（2 处 / 1 文件）

| 文件 | 行 | handler | 路由 | 算子 | 谓词形态 | 危害 |
|---|---|---|---|---|---|---|
| finance/src/modules/reconcile_orders.rs | L355 | create_reconcile_order | — | INSERT | 严格(=COALESCE) | P1 写 nil 租户 |
| finance/src/modules/reconcile_orders.rs | L408 | auto_reconcile | /reconcile/auto | INSERT | 严格(=COALESCE) | P1 写 nil 租户 |

#### pm（6 处 / 2 文件）

| 文件 | 行 | handler | 路由 | 算子 | 谓词形态 | 危害 |
|---|---|---|---|---|---|---|
| pm/src/modules/project.rs | L186 | list_projects | /projects | SELECT | 严格(=COALESCE) | P1 恒 0 行 |
| pm/src/modules/project.rs | L416 | get_project | /projects/{id} | SELECT | 严格(=COALESCE) | P1 恒 0 行 |
| pm/src/modules/settlement.rs | L207 | update_settlement | — | UPDATE | 宽松(IS NULL OR) | P0 跨租户 |
| pm/src/modules/settlement.rs | L260 | approve_settlement | /settlements/{id}/approve | UPDATE | 宽松(IS NULL OR) | P0 跨租户 |
| pm/src/modules/settlement.rs | L398 | update_settlement_item | /settlement-items/{id} | UPDATE | 宽松(IS NULL OR) | P0 跨租户 |
| pm/src/modules/settlement.rs | L432 | delete_settlement_item | — | DELETE | 宽松(IS NULL OR) | P0 跨租户 |

#### integration（5 处 / 4 文件）

| 文件 | 行 | handler | 路由 | 算子 | 谓词形态 | 危害 |
|---|---|---|---|---|---|---|
| integration/src/external_erp.rs | L1698 | delete_company_mapping | — | DELETE | 宽松(IS NULL OR) | P0 跨租户 |
| integration/src/external_erp.rs | L1761 | delete_entity_mapping | — | DELETE | 宽松(IS NULL OR) | P0 跨租户 |
| integration/src/handlers/conversion_rules.rs | L332 | execute_conversion_rule_api | /rules/{id}/execute | UPDATE | 宽松(IS NULL OR) | P0 跨租户 |
| integration/src/handlers/lims_qms.rs | L174 | sync_lims_qms | /lims-qms/{id}/sync | UPDATE | 宽松(IS NULL OR) | P0 跨租户 |
| integration/src/handlers/wms_scm.rs | L151 | sync_wms_scm | /wms-scm/{id}/sync | UPDATE | 宽松(IS NULL OR) | P0 跨租户 |

#### analytics（6 处 / 2 文件）

| 文件 | 行 | handler | 路由 | 算子 | 谓词形态 | 危害 |
|---|---|---|---|---|---|---|
| analytics/src/main.rs | L333 | reports_center_stats | /reports-center/stats | WITH | 严格(=COALESCE) | P1 恒 0 行 |
| analytics/src/main.rs | L381 | reports_center_stats | /reports-center/stats | SELECT | 严格(=COALESCE) | P1 恒 0 行 |
| analytics/src/main.rs | L413 | reports_center_stats | /reports-center/stats | SELECT | 严格(=COALESCE) | P1 恒 0 行 |
| analytics/src/routes.rs | L799 | reports_center_stats | /reports-center/stats | WITH | 严格(=COALESCE) | P1 恒 0 行 |
| analytics/src/routes.rs | L847 | reports_center_stats | /reports-center/stats | SELECT | 严格(=COALESCE) | P1 恒 0 行 |
| analytics/src/routes.rs | L879 | reports_center_stats | /reports-center/stats | SELECT | 严格(=COALESCE) | P1 恒 0 行 |

#### portal（2 处 / 1 文件）

| 文件 | 行 | handler | 路由 | 算子 | 谓词形态 | 危害 |
|---|---|---|---|---|---|---|
| portal/src/modules/todos.rs | L137 | complete_local_todo | — | UPDATE | 宽松(IS NULL OR) | P0 跨租户 |
| portal/src/modules/todos.rs | L164 | delete_local_todo | — | UPDATE | 宽松(IS NULL OR) | P0 跨租户 |

#### unified-core（1 处 / 1 文件）

| 文件 | 行 | handler | 路由 | 算子 | 谓词形态 | 危害 |
|---|---|---|---|---|---|---|
| unified-core/src/modules/iam/user/access_log.rs | L361 | create_access_log | /access-logs | INSERT | 严格(=COALESCE) | P1 写 nil 租户 |

#### crm（9 处 / 3 文件）

| 文件 | 行 | handler | 路由 | 算子 | 谓词形态 | 危害 |
|---|---|---|---|---|---|---|
| crm/src/event_handlers/mod.rs | L779 | handle_sales_order_created | — | SELECT | 严格(=COALESCE) | P1 恒 0 行 |
| crm/src/modules/analytics.rs | L207 | dashboard_aggregate | /dashboard | SELECT | 宽松(IS NULL OR) | P0 跨租户 |
| crm/src/modules/analytics.rs | L212 | dashboard_aggregate | /dashboard | SELECT | 宽松(IS NULL OR) | P0 跨租户 |
| crm/src/modules/analytics.rs | L219 | dashboard_aggregate | /dashboard | SELECT | 宽松(IS NULL OR) | P0 跨租户 |
| crm/src/modules/analytics.rs | L232 | dashboard_aggregate | /dashboard | SELECT | 宽松(IS NULL OR) | P0 跨租户 |
| crm/src/modules/analytics.rs | L239 | dashboard_aggregate | /dashboard | SELECT | 宽松(IS NULL OR) | P0 跨租户 |
| crm/src/modules/analytics.rs | L246 | dashboard_aggregate | /dashboard | SELECT | 宽松(IS NULL OR) | P0 跨租户 |
| crm/src/modules/analytics.rs | L253 | dashboard_aggregate | /dashboard | SELECT | 宽松(IS NULL OR) | P0 跨租户 |
| crm/src/tests/rls_isolation_test.rs | L153 | rls_txn_context_isolates_tenant | — | WITH | 严格(=COALESCE) | P1 恒 0 行 |

#### master-data（59 处 / 10 文件）

| 文件 | 行 | handler | 路由 | 算子 | 谓词形态 | 危害 |
|---|---|---|---|---|---|---|
| master-data/src/modules/ai_governance_v59.rs | L202 | dismiss_suggestion | /governance/dismiss/{id} | DELETE | 宽松(IS NULL OR) | P0 跨租户 |
| master-data/src/modules/ai_governance_v59.rs | L223 | train_model | /governance/train/{id} | UPDATE | 宽松(IS NULL OR) | P0 跨租户 |
| master-data/src/modules/ai_governance_v59.rs | L417 | manual_review | — | UPDATE | 宽松(IS NULL OR) | P0 跨租户 |
| master-data/src/modules/ai_governance_v59.rs | L666 | review_classification | /classification/review/{id} | UPDATE | 宽松(IS NULL OR) | P0 跨租户 |
| master-data/src/modules/commercial_v55.rs | L700 | cancel_subscription | /subscriptions/{id}/cancel | UPDATE | 宽松(IS NULL OR) | P0 跨租户 |
| master-data/src/modules/commercial_v55.rs | L756 | upgrade_tier | /subscriptions/{id}/upgrade | UPDATE | 宽松(IS NULL OR) | P0 跨租户 |
| master-data/src/modules/commercial_v55.rs | L1160 | mark_bill_paid | /billing/{id}/mark-paid | UPDATE | 宽松(IS NULL OR) | P0 跨租户 |
| master-data/src/modules/disaster_v56.rs | L706 | create_recovery_point | /recovery/point | INSERT | 严格(=COALESCE) | P1 写 nil 租户 |
| master-data/src/modules/disaster_v56.rs | L982 | create_recovery_plan | /recovery/plan | INSERT | 严格(=COALESCE) | P1 写 nil 租户 |
| master-data/src/modules/disaster_v56.rs | L1043 | execute_plan | /recovery/plan/execute | UPDATE | 宽松(IS NULL OR) | P0 跨租户 |
| master-data/src/modules/disaster_v56.rs | L1371 | update_plan | /continuity/plan/{id} | UPDATE | 宽松(IS NULL OR) | P0 跨租户 |
| master-data/src/modules/disaster_v56.rs | L1424 | test_plan | /continuity/plan/{id}/test | UPDATE | 宽松(IS NULL OR) | P0 跨租户 |
| master-data/src/modules/disaster_v56.rs | L1443 | test_plan | /continuity/plan/{id}/test | INSERT | 严格(=COALESCE) | P1 写 nil 租户 |
| master-data/src/modules/disaster_v56.rs | L1695 | configure_replication | /dr/replication | INSERT | 严格(=COALESCE) | P1 写 nil 租户 |
| master-data/src/modules/disaster_v56.rs | L1743 | start_replication | /dr/replication/start | UPDATE | 宽松(IS NULL OR) | P0 跨租户 |
| master-data/src/modules/disaster_v56.rs | L1957 | complete_failover | /dr/failover/{id}/complete | UPDATE | 宽松(IS NULL OR) | P0 跨租户 |
| master-data/src/modules/disaster_v56.rs | L1966 | complete_failover | /dr/failover/{id}/complete | UPDATE | 宽松(IS NULL OR) | P0 跨租户 |
| master-data/src/modules/disaster_v56.rs | L1973 | complete_failover | /dr/failover/{id}/complete | UPDATE | 宽松(IS NULL OR) | P0 跨租户 |
| master-data/src/modules/disaster_v56.rs | L2044 | switch_regions | /dr/switch | UPDATE | 宽松(IS NULL OR) | P0 跨租户 |
| master-data/src/modules/disaster_v56.rs | L2054 | switch_regions | /dr/switch | UPDATE | 宽松(IS NULL OR) | P0 跨租户 |
| master-data/src/modules/governance_v58.rs | L196 | assess_maturity | /maturity/assess | INSERT | 严格(=COALESCE) | P1 写 nil 租户 |
| master-data/src/modules/governance_v58.rs | L995 | expose_as_api | /data-product/{id}/expose | INSERT | 严格(=COALESCE) | P1 写 nil 租户 |
| master-data/src/modules/knowledge_v53.rs | L385 | refresh_kg_graph | — | INSERT | 严格(=COALESCE) | P1 写 nil 租户 |
| master-data/src/modules/knowledge_v53.rs | L435 | add_node | — | INSERT | 严格(=COALESCE) | P1 写 nil 租户 |
| master-data/src/modules/knowledge_v53.rs | L484 | add_edge | — | INSERT | 严格(=COALESCE) | P1 写 nil 租户 |
| master-data/src/modules/knowledge_v53.rs | L810 | get_recommendations | /recommendations/{user_id} | INSERT | 严格(=COALESCE) | P1 写 nil 租户 |
| master-data/src/modules/knowledge_v53.rs | L842 | record_interaction | /interactions | INSERT | 严格(=COALESCE) | P1 写 nil 租户 |
| master-data/src/modules/knowledge_v53.rs | L1162 | update_asset | /assets/{id} | UPDATE | 宽松(IS NULL OR) | P0 跨租户 |
| master-data/src/modules/knowledge_v53.rs | L1282 | upsert_search_index | — | INSERT | 严格(=COALESCE) | P1 写 nil 租户 |
| master-data/src/modules/lineage_v52.rs | L406 | register | — | INSERT | 严格(=COALESCE) | P1 写 nil 租户 |
| master-data/src/modules/lineage_v52.rs | L430 | register | — | INSERT | 严格(=COALESCE) | P1 写 nil 租户 |
| master-data/src/modules/lineage_v52.rs | L581 | delete_node | — | DELETE | 宽松(IS NULL OR) | P0 跨租户 |
| master-data/src/modules/lineage_v52.rs | L586 | delete_node | — | DELETE | 宽松(IS NULL OR) | P0 跨租户 |
| master-data/src/modules/lineage_v52.rs | L632 | refresh_graph | — | INSERT | 严格(=COALESCE) | P1 写 nil 租户 |
| master-data/src/modules/lineage_v52.rs | L770 | analyze | /governance/analyze | INSERT | 严格(=COALESCE) | P1 写 nil 租户 |
| master-data/src/modules/lineage_v52.rs | L864 | simulate | — | INSERT | 严格(=COALESCE) | P1 写 nil 租户 |
| master-data/src/modules/lineage_v52.rs | L985 | propagate | — | INSERT | 严格(=COALESCE) | P1 写 nil 租户 |
| master-data/src/modules/lineage_v52.rs | L1047 | add_rule | — | INSERT | 严格(=COALESCE) | P1 写 nil 租户 |
| master-data/src/modules/metadata_v60.rs | L697 | update_metadata | /metadata/{id} | UPDATE | 宽松(IS NULL OR) | P0 跨租户 |
| master-data/src/modules/metadata_v60.rs | L755 | delete_metadata | /metadata/{id} | DELETE | 宽松(IS NULL OR) | P0 跨租户 |
| master-data/src/modules/quality_v51.rs | L1127 | revert_fix_action | /auto-fix/actions/{id}/revert | UPDATE | 宽松(IS NULL OR) | P0 跨租户 |
| master-data/src/modules/quality_v51.rs | L1430 | approve_suggestion | /ai/suggestions/{id}/approve | UPDATE | 宽松(IS NULL OR) | P0 跨租户 |
| master-data/src/modules/quality_v51.rs | L1482 | reject_suggestion | /ai/suggestions/{id}/reject | UPDATE | 宽松(IS NULL OR) | P0 跨租户 |
| master-data/src/modules/semantic_v57.rs | L277 | add_edge | — | INSERT | 严格(=COALESCE) | P1 写 nil 租户 |
| master-data/src/modules/semantic_v57.rs | L468 | detect_communities | — | INSERT | 严格(=COALESCE) | P1 写 nil 租户 |
| master-data/src/modules/semantic_v57.rs | L544 | index_entity | /search/index | INSERT | 严格(=COALESCE) | P1 写 nil 租户 |
| master-data/src/modules/semantic_v57.rs | L716 | create_tag | /tags | INSERT | 严格(=COALESCE) | P1 写 nil 租户 |
| master-data/src/modules/semantic_v57.rs | L749 | apply_tag | /tag/apply | INSERT | 严格(=COALESCE) | P1 写 nil 租户 |
| master-data/src/modules/semantic_v57.rs | L809 | auto_tag | /tag/auto | INSERT | 严格(=COALESCE) | P1 写 nil 租户 |
| master-data/src/modules/semantic_v57.rs | L1403 | search_semantic_handler | /search/semantic | INSERT | 严格(=COALESCE) | P1 写 nil 租户 |
| master-data/src/modules/semantic_v57.rs | L1440 | search_hybrid_handler | /search/hybrid | INSERT | 严格(=COALESCE) | P1 写 nil 租户 |
| master-data/src/modules/versioning_v54.rs | L629 | create_snapshot | /version/snapshot | INSERT | 严格(=COALESCE) | P1 写 nil 租户 |
| master-data/src/modules/versioning_v54.rs | L873 | restore_version | /version/restore | INSERT | 严格(=COALESCE) | P1 写 nil 租户 |
| master-data/src/modules/versioning_v54.rs | L1063 | merge_branch | /version/merge | UPDATE | 宽松(IS NULL OR) | P0 跨租户 |
| master-data/src/modules/versioning_v54.rs | L1452 | grant_permission | /permissions/grant | INSERT | 严格(=COALESCE) | P1 写 nil 租户 |
| master-data/src/modules/versioning_v54.rs | L1489 | revoke_permission | /permissions/{id} | DELETE | 宽松(IS NULL OR) | P0 跨租户 |
| master-data/src/modules/versioning_v54.rs | L1743 | create_role | /roles | INSERT | 严格(=COALESCE) | P1 写 nil 租户 |
| master-data/src/modules/versioning_v54.rs | L1784 | assign_role | /roles/assign | INSERT | 严格(=COALESCE) | P1 写 nil 租户 |
| master-data/src/modules/versioning_v54.rs | L1815 | revoke_role | /roles/revoke | DELETE | 宽松(IS NULL OR) | P0 跨租户 |

#### mobile（7 处 / 5 文件）

| 文件 | 行 | handler | 路由 | 算子 | 谓词形态 | 危害 |
|---|---|---|---|---|---|---|
| mobile/src/db/repository.rs | L507 | db_update_offline_operation_status | — | UPDATE | 宽松(IS NULL OR) | P0 跨租户 |
| mobile/src/db/repository.rs | L558 | db_create_or_update_sync_policy | — | UPDATE | 宽松(IS NULL OR) | P0 跨租户 |
| mobile/src/db/repository.rs | L719 | db_update_push_notification_stats | — | UPDATE | 宽松(IS NULL OR) | P0 跨租户 |
| mobile/src/modules/media.rs | L380 | delete_media | /media/{file_type}/{id} | UPDATE | 宽松(IS NULL OR) | P0 跨租户 |
| mobile/src/modules/missing_endpoints.rs | L289 | update_push_template | /push/templates/{id} | UPDATE | 宽松(IS NULL OR) | P0 跨租户 |
| mobile/src/modules/offline.rs | L141 | sync_offline_data | /offline/sync | UPDATE | 宽松(IS NULL OR) | P0 跨租户 |
| mobile/src/modules/offline_records.rs | L183 | mark_synced | — | UPDATE | 宽松(IS NULL OR) | P0 跨租户 |

#### wms（1 处 / 1 文件）

| 文件 | 行 | handler | 路由 | 算子 | 谓词形态 | 危害 |
|---|---|---|---|---|---|---|
| wms/src/modules/serial_number.rs | L802 | get_trace | /serial-numbers/{id}/trace | SELECT | 宽松(IS NULL OR) | P0 跨租户 |

#### scm（1 处 / 1 文件）

| 文件 | 行 | handler | 路由 | 算子 | 谓词形态 | 危害 |
|---|---|---|---|---|---|---|
| scm/src/modules/audit.rs | L215 | log_audit_event | — | INSERT | 严格(=COALESCE) | P1 写 nil 租户 |

#### lims（1 处 / 1 文件）

| 文件 | 行 | handler | 路由 | 算子 | 谓词形态 | 危害 |
|---|---|---|---|---|---|---|
| lims/src/modules/report.rs | L355 | approve_report | — | UPDATE | 宽松(IS NULL OR) | P0 跨租户 |

#### gis（2 处 / 2 文件）

| 文件 | 行 | handler | 路由 | 算子 | 谓词形态 | 危害 |
|---|---|---|---|---|---|---|
| gis/src/modules/location.rs | L199 | update_location | /locations/{id} | UPDATE | 宽松(IS NULL OR) | P0 跨租户 |
| gis/src/modules/map.rs | L226 | update_map | /maps/{id} | UPDATE | 宽松(IS NULL OR) | P0 跨租户 |

#### rd（2 处 / 1 文件）

| 文件 | 行 | handler | 路由 | 算子 | 谓词形态 | 危害 |
|---|---|---|---|---|---|---|
| rd/src/repositories/project_repository.rs | L197 | delete | — | UPDATE | 宽松(IS NULL OR) | P0 跨租户 |
| rd/src/repositories/project_repository.rs | L258 | batch_delete | — | UPDATE | 宽松(IS NULL OR) | P0 跨租户 |

---

## 4. 根因分类与占比

三类不是并列关系，而是"机制 / 混用 / 来源"三个层次。按**主因（非重叠）**拆分：

| 类别 | 定义 | 处数 | 占比（分母 147） | 涉及文件 |
|---|---|---|---|---|
| **A. GUC 索引用错连接** | SQL 只靠 GUC 做租户谓词，却执行在 pool 连接 | 72 | 49% | 全部 51 个文件 |
| **C. Claims 与 GUC 两套来源并存** | 同一文件内另有 `get_tenant_id_from_claims` / `resolve_create_tenant` / `bind(tenant_id)` 等 Claims 绑定路径，形成两套口径 | 75 | 51% | 31 |
| **B. pool 与请求事务混用**（与 A/C 重叠，子集） | 同一文件内既走 `RlsTxnCell`/`tx` 又走 `state.pool`，同一业务对象一半正确一半退化 | 11 | 7.5% | 5（mes/process_route、mes/work_report、wms/serial_number、master-data/governance_v58、crm/tests） |

细分（按算子 × 谓词形态）：

| | 宽松型 | 严格型 | 合计 |
|---|---|---|---|
| UPDATE | 48 | 36 | 84 |
| INSERT | 0 | 36 | 36 |
| DELETE | 9 | 0 | 9 |
| SELECT | 8 | 7 | 15 |
| WITH | 0 | 3 | 3 |
| 合计 | 65 | 82 | 147 |

**结论：C 类（51%）说明"收敛目标"不是简单替换谓词，而是先统一"租户来源"这一概念**——目前同一仓库同时存在 `claims.tenant_id`、`x-tenant-id` header、GUC `app.tenant_id`、`Uuid::nil()` 四种来源。

---

## 5. 相关问题（同一根因下的邻近缺陷）

1. **`GET /api/mes/orders/{id}`（`production_order.rs` L801-L816）**
   - `WHERE id = $1`，无租户谓词、无 `deleted_at IS NULL`，执行在 `&state.pool`。
   - 后果：**跨租户读取 + 已软删订单仍 200**。这不是"漏过滤"单点，而是 1.2 的直接产物。
2. **`POST /api/mes/orders/from-erp`（L~700）**：事务正确但 `tenant_id` 绑 `Uuid::nil()`，落 nil 租户行；本租户 GET/LIST 均不可见（RLS 的 `tenant_id IS NULL` 豁免只对 `NULL` 生效，nil UUID 不是 NULL）。
3. **`get_tenant_id`（`production_order.rs` L15-L20）**：claims 无 tenant 时 `unwrap_or(Uuid::nil())`；与 `resolve_create_tenant`（严格返回 400）语义不一致，是 C 类来源分裂的典型。
4. **`update_team` 等严格型写**（`mes/team.rs` L521）：`tenant_id = COALESCE(..., nil)` 在 pool 上恒不匹配 → 更新影响 0 行 → handler 返回 404，页面表现为"记录凭空消失"。

---

## 6. 候选方案对比

### 方案 A：写路径统一改为 Claims 绑定参数（不动连接，仅改谓词）

做法：`WHERE id=$1 AND tenant_id=$2`，`$2` 由 `claims.tenant_id` 解析后 `bind`；删除所有 `current_setting('app.tenant_id')` 谓词。

| 维度 | 评价 |
|---|---|
| 改造量 | 147 处谓词改写 + 参数位调整；`sqlx::query!` 的 SQL 哈希全变，离线缓存 `.sqlx` 需同步重生成（或改运行时 `query_as`） |
| 侵入性 | 低-中：handler 签名不变，只在函数体内加一个参数 |
| 能否根治 | **不能**。① 只能覆盖"记得加谓词"的语句；② `GET /orders/{id}` 这类无谓词读仍需逐条补；③ 无法覆盖 ORM/动态 SQL；④ RLS 依然是关的，防线只有应用层一处 |
| 读写一致性 | 不受影响（不共享事务） |
| 连接池压力 | 不变 |

### 方案 B：强制所有 DB 访问走请求事务（让 GUC 生效）

做法：handler 取 `Extension<RlsTxnCell>`，所有查询 `.execute(&mut *tx)`；service 层改签名收 `&mut PgConnection`。

| 维度 | 评价 |
|---|---|
| 改造量 | 147 处 + 服务层签名（`FinanceService::new(pool)` 等大量构造点）；209 处已是事务内，可作模板 |
| 侵入性 | 高：跨 handler/service/repository 三层改签名；后台任务、事件消费、移动端直连没有"请求事务"，需要新的 `TenantScope` 抽象 |
| 能否根治 | **能**（前提是 RLS 策略不再对"未设"豁免）。RLS 是 DB 层兜底，漏写谓词也不会跨租户 |
| 读写一致性 | 提升：同一请求内读写同连接、同快照；事务内可安全 `SELECT ... FOR UPDATE` |
| 连接池压力 | **恶化**：每请求 1 条连接被事务全程占用；当前 `DB_MAX_CONNECTIONS=8`（launchd 环境）已在早期实测中耗尽过（曾出现 `DB pool timed out`）。批量/长事务 handler 会放大风险 |

### 方案 C：地基 + 分层（推荐）

1. **地基（一次迁移）**：把 `rls_tenant_isolation` 中 `IS NULL` / `= ''` 两条分支去掉，只保留"显式 nil 豁免"（`= '00000000-...'`）。这样：
   - `tenant_middleware` 对 service/superuser 本来就**显式** `set_config(nil)`，语义不变；
   - 未设 GUC 的 **pool 连接变成 fail-closed**：越权读取直接变空/404（安全 → 可用性）；
2. **请求链路**逐步改方案 B（每批模块）；
3. **非请求链路**（事件消费、后台任务、mobile service token）走方案 A 显式绑定（这些本就无租户请求上下文）。

| 维度 | 评价 |
|---|---|
| 改造量 | 迁移 1 份 + 147 处分批；但可先"地基 + P0 模块"两小步拿到 90% 收益 |
| 侵入性 | 中：地基是策略变更；模块改造可按文件独立 |
| 能否根治 | **能**：DB 层 fail-closed + 请求链路 GUC + 非请求链路显式参数，三处互补 |
| 读写一致性 | 请求链路提升；非请求链路维持现状 |
| 连接池压力 | 仅请求链路走事务，压力小于全量 B；可用 `DB_MAX_CONNECTIONS` 评估后再决定是否扩池 |

---

## 7. 推荐路线与分批计划

**推荐：方案 C。** 主因是"RLS 在 pool 上等于关闭"，不先修地基，A 方案做完也只是把 147 条谓词抄一遍，任何新代码漏写就再次越权。

| 批次 | 范围 | 改动面 | 风险 | 验证 | 回滚 |
|---|---|---|---|---|---|
| **P0 地基** | `database/migrations/` 新增 1 份：收紧 331 张表的 `rls_tenant_isolation` 谓词（去掉 `IS NULL` / `= ''` 分支） | 1 迁移，纯策略 | **高**：所有仍走 pool 的读会立刻变空/404；public 路径（`/health` 等不设 GUC）若读业务表会失败 | ① `svc/crm/src/tests/rls_isolation_test.rs`；② 手工 `set_config` 对照查询；③ 8099 全站冒烟 | 迁移内附回滚：`ALTER POLICY ... USING (<原宽松谓词>)`，或 `ALTER TABLE ... NO FORCE ROW LEVEL SECURITY` |
| **B1 mes+qms+finance** | 45 处 / 17 文件（mes 42、qms 1、finance 2） | 写路径改 Claims 绑定参数；`GET /orders/{id}` 补 `tenant_id` + `deleted_at IS NULL`；`from-erp` 改 `resolve_create_tenant` | 中：`team.rs` 等"更新 0 行返回 404"的既有语义会从 404 变 200，需接受行为变更 | E2E `tests/e2e/tests/production-order.spec.ts`（CRUD lifecycle / negative quantity）；FMEA 列表 HTTP 对照；mes 各模块 PUT/DELETE 冒烟 | 按文件 revert；每模块 1 commit |
| **B2 pm+portal+integration+analytics** | 15 处 / 9 文件 | 同上；`portal/todos.rs` 的 `complete_local_todo(pool: &PgPool)` 需把 tenant 参数下传；integration 三个 sync handler 是宽松型，优先 | 中：宽松→严格会让"原本能跨租户同步"的集成调用变 0 行，需按 service claims 例外处理 | `/api/integration/lims-qms/{id}/sync`、`/wms-scm/{id}/sync`、`/rules/{id}/execute` 各发 1 次对照 | 同上 |
| **B3 crm+wms+scm+lims+gis+rd+unified-core** | 16 处 / 10 文件 | 同上；`crm/modules/analytics.rs` 的 `db` 参数要显式传 tenant | 中：crm 的 RLS 单测是唯一回归网，改完必须跑 | `svc/crm/src/tests/rls_isolation_test.rs` + 各模块冒烟 | 同上 |
| **B4 master-data + mobile** | 66 处 / 15 文件 | 最大一块。master-data 的 36 处 INSERT 全部写 nil 租户，需先定"V5x 模块是否仍在一线使用" | **高**：V5x 多为历史模块，可能无人验收；mobile 是 service token（nil 为设计语义），加 Claims 谓词会直接改坏 | 先做可达性盘点（`svc/server` 是否挂载这些 router）；再决定"收敛 / 仅加 fail-closed 兜底 / 归档" | 可整批 revert，独立分支 |

**B1 执行记录（2026-11-06，mes / qms / finance）**

- **对账**：改造前 `current_setting('app.tenant_id')` 共 57 处（mes 47、qms 1、finance 9）；改造后 mes/qms/finance 全仓 **0 处**。其中 57 处含 finance 非请求链路 6 处（`async_projector`、`pg_event_store`、`services/finance/reconciliation`），按"显式 nil / 参数下传"处理。实际改动 23 个文件。
- **同文件同模式一并修**：`production_process.rs` 的 4 处 `set_session_tenant_id(&state.pool, …)`（池中任意连接 session 级 GUC，既不同连接又会跨请求泄漏，删除并统一 Claims）；`team.rs` 详情/成员/加成员跨租户读写；`equipment.rs` 设备详情；`material_plan.rs` 删除谓词；`finance/reconcile_orders.rs` 列表/详情/明细/确认/争议/取消全部补租户；`material_plan` 创建改 `resolve_create_tenant`。
- **验证（8099 实测，三身份：租户1 / 租户2 / nil）**：订单详情 `200 / 404 / 200`，订单列表 `total 16 / 0 / 16`；班组、材料计划、对账订单列表 T2 均为 `0`，详情 T2 均 `404`；班组/材料/工序/设备/对账的 PUT·成员写入 T2 均 `404`；QMS 预警确认跨租户 `404`、本租户 `200`；nil 身份写路径 `200`（全量语义）。
- **用例**：`svc/mes/tests/material_plan_e2e.rs` 已随签名更新并编译通过；运行失败于环境（`topems_prod` 无 CREATEDB 权限，sqlx::test 无法建库），非代码问题。
- **新发现（仅记录，未扩大范围）**：① `mes.equipment` 创建因 `description NOT NULL` 返回 500（既有缺陷）；② `public.equipment` 与 `mes.equipment` 双表 schema 漂移；③ `qms/quality_dashboard.rs` 预警列表/创建/删除规则仍无租户过滤且创建写 nil；④ `production_process` 列表为严格 `tenant_id=$1`，nil 身份不可见（非泄漏）。
- **环境**：本机必须 `SQLX_OFFLINE=true` 编译；每轮替换二进制重启 launchd，8099 约 20s 不可用。旧版备份 `topems-server-before-b1-20261106.bak`。

**B2 执行记录（2026-11-06，pm / portal / integration / analytics）**

- **盘点修正（重要）**：计划表原写 B2 = 15 处 / 9 文件，实测为 **72 个 GUC 语句 / 26 文件**；其中 **pm 46 处执行在 `&mut **txn`（`RlsTxnArc`）**，事务由 `tenant_middleware` 在同一连接上 `set_config(..., is_local=true)`，**GUC 正确、属非缺陷，保持原样不改**。**真实缺陷 = 23 个语句 / 10 文件**：pm 6/2、portal 2/1、analytics 10/4、integration 5/4。
- **对账**：B2 范围（pm/portal/integration/analytics）改造前 23 处真实 pool 缺陷 → 改造后 **0 处**（含 `analytics/main.rs` 中与 `routes.rs` 平行的死代码副本，同步改写以免残留同模式）。全仓重扫（`current_setting` + 执行目标分类）：pool 目标剩余 **119 处**（含测试 3、`lib/shared-db` 内部 3），其中 svc 业务模块约 113 处，集中在 master-data 83 / crm 9 / mobile 7 / gis 3 / rd 3 / wms 2 / unified-core 2 / scm 1 / lims 1 / search 2 / plugin-registry 1；`&mut **txn` 正常用法 190 处不计入。
- **统一口径**：读/写谓词统一为 `($N::uuid = '00000000-0000-0000-0000-000000000000'::uuid OR tenant_id = $N::uuid)`，N = 该语句现有最大参数 +1，链尾 `.bind(get_tenant_id_from_claims(&claims))`；handler 缺 Claims 的补 `Extension(claims)`。integration 的 `delete_*_mapping`、`sync_lims_qms`/`sync_wms_scm`/`execute_conversion_rule_api` 统一改用既有 `tenant_uuid(&claims)`（超管/service → nil 全量，普通租户 → 本租户），不写模块特例。
- **同文件同模式一并修**：pm `project.rs` 列表/详情；pm `settlement.rs` 更新/审批/明细更新/明细删除；portal `todos.rs` 添加/完成/删除（**补上原本硬编码 `Uuid::nil()` 的写入租户**，谓词保留 `tenant_id IS NULL` 以兼容历史 NULL 行）；analytics `routes.rs` + `main.rs` + `bi/dataset.rs`；integration `external_erp.rs` 两处删除映射，`lims_qms.rs` 同步前存在性校验与更新，`wms_scm.rs` 同步更新，`conversion_rules.rs` 规则读取与执行记录更新。
- **验证（8099 实测，三身份：租户1 / 租户2 / nil）**：
  - PM 项目列表 `projects[16] total=16 / 0 / 16`；详情 `200 / 404 / 200`。
  - PM 决算写隔离：T2 创建后，T1 更新本租户行 `200`、T2 更新他人行 `404`（验证后清理测试行）。**注意**：pm `effective_tenant_id` 把所有超管硬编码映射到租户 0001，导致合成"租户2超管"创建的数据实际落 0001；该行为属既有设计，已登记（见下）。
  - Analytics `reports-center/stats` 三身份均 `200`；租户1 `totalRoles=0 / recentActivities=0 / roleDistribution=[]`，nil `totalRoles=15 / recentActivities=286 / roleDistribution 非空`，**证明租户过滤生效**（改造前该路径在 pool 上对所有身份恒 0 行）。
  - Integration `lims-qms sync` 不存在 id：T1/T2 均 `404`（无数据下不可区分越权，按代码口径+冒烟记录）。
- **阻塞/新发现（仅记录，未扩大范围）**：① **`portal.portal_todos` 严重 schema 漂移**——真库无 `user_id / service_code / service_name / todo_type / link_url / completed` 列，`add/complete/delete` 必然 500；`get_todos` 靠 `default_todos()` 静默降级，故线上看似"能用"。本次改造已完成且编译通过，但 **portal 待办写路径在当前 schema 下无法功能验证**，需单独立项补列/对齐代码。② `portal.portal_todos` 的 RLS 策略为 `allow_all`，未纳入租户隔离，P0 需覆盖。③ pm `get_settlement` / `get_project_settlements` 无租户谓词（按 id/project 可跨租户读，非 GUC 模式）。④ `effective_tenant_id` 硬编码超管→租户 0001，与"claims 为准 / nil 全量"不统一。⑤ integration `update_company_mapping` / `update_entity_mapping` 仅按 id+connection 更新，无租户谓词。
- **环境**：`SQLX_OFFLINE=true` 编译；本轮旧二进制备份 `topems-server-4fd8db5d2-20261106-b2.bak`；重启到 `/health` 恢复约 12s。

**B3 执行记录（2026-11-06，crm / wms / scm / lims / gis / rd / unified-core）**

- **盘点修正**：计划表原写 16 处 / 10 文件；按统一逐语句扫描器实测，7 个模块含 GUC 的语句共 **68 处 / 28 文件**，其中 **48 处执行在 `&mut **txn`（请求事务内 GUC 正确，属非缺陷，保持原样）**，**真实 pool 缺陷 20 处 / 11 文件**：crm 8（`modules/analytics.rs` 7 + `event_handlers/mod.rs` 1）、gis 3（location/map/marker）、rd 3（`project_repository`）、unified-core 2（`access_log` + 审计中间件）、wms 2（`serial_number`）、scm 1（`audit`）、lims 1（`report`）。
- **对账（同一扫描器）**：B3 七模块 pool 执行 **20 处 → 0 处**（`svc/crm/src/tests/rls_isolation_test.rs` 1 处为测试专用，按设计保留）。另修 1 类扫描器结构性漏识——「SQL 文本先拼接、后执行」的语句（`unified-core/src/middleware/audit_log.rs::log_audit_entry`）一并改为 `$9` 绑定 nil，人工口径合计 **21 处 / 12 文件 → 0**。
- **计划外补漏（P0 fail-closed 前必须去掉的 GUC 依赖：3 处 / 2 文件 → 0）**：`lib/shared-db/src/audit.rs` 两处（`AuditLogService::create_audit_log` 与 `SchemaAuditLogService::create_audit_log`）`COALESCE($1, NULLIF(current_setting(...)))` → `COALESCE($1, '00000000-0000-0000-0000-000000000000'::uuid)`；`svc/plugin-registry/.../tenant_plugins.rs::upload_plugin` 的 INSERT 末位改 `$17` + `.bind(get_tenant_id_from_claims(&claims))`。
- **全仓剩余（同一扫描器，改造后）**：pool 执行 GUC 语句 **90 处 / 19 文件**；其中业务剩余 **87 处 / 15 文件**（master-data 80/10、mobile 7/5）= B4 范围；其余 3 处为 2 个 RLS 单测 + `lib/shared-db/src/rls.rs` 的 RLS 策略生成 DDL（机制本身，按设计保留）。`&mut **txn` 193 处不计入。
- **统一口径**：写/读谓词 `($N::uuid IS NULL OR tenant_id = $N)`（nil = 全量），N = 语句现有最大参数 +1，末尾 `.bind(tenant)`。crm/gis 用 `Option<Uuid>`（超管 `None`）；lims/wms/rd 用 `get_tenant_id_from_claims`；scm 系统级审计与 unified-core HTTP 审计中间件显式绑 `Uuid::nil()`（无 Claims / 早于认证）。
- **验证（8099 实测，三身份：普通租户1 / 普通租户2 / nil）**：
  - CRM dashboard：T1N `industries=[{unknown,300}]`、T2N `[]`、nil `[{unknown,300}]` → 普通租户过滤生效（改造前 pool 上宽松 GUC 谓词会让 T2N 也看到 300）。
  - GIS map-markers：T1N 创建 `200`；T2N 跨租户更新 `404「地图标记未找到」`；T1N 本租户更新 `200`、删除 `200`（已清理）；三身份列表均 `200`。
  - WMS serial-numbers：列表/追溯三身份均 `200`（对应表为空，无法以行数区分；仅证明链路可达 + 代码口径）。
  - LIMS `POST /api/lims/reports/{id}/approve` 三身份均 `404「接口不存在」`——**该 handler 未注册路由（死代码）**，仅代码级修复。
  - SCM / unified-core：写路径为系统级/中间件审计（显式 nil），无租户差异，仅代码级 + 编译验证。
- **新发现（仅记录，未扩大范围）**：① LIMS `approve_report` 未挂载路由；② rd `ProjectService`/repository 的 update·delete·batch_delete 无外部调用者（服务未挂载）；③ rd `batch_create` 仍显式写 nil（非 GUC 模式，本次未改）；④ `lib/shared-db/src/rls.rs` 的 RLS 策略生成器仍用 GUC（机制本身，P0 迁移需与之对齐口径）。
- **环境**：`SQLX_OFFLINE=true`编译；补漏后重新构建并重启（`/health` 恢复约 15s）；本轮备份 `topems-server-b3-20261106.bak`。

**B4 执行记录（2026-11-06，master-data / mobile）**

- **可达性盘点（先证后用）**：结论 **全部在用，无死代码，无需登记归档**。
  - `svc/server/Cargo.toml` 默认 features 含 `module-advanced`（master-data + analytics）与 `module-mobile`；`svc/server/src/main.rs` 注册 `MasterDataRealModule`、`MobileRealModule`。
  - `svc/master-data/src/modules/mod.rs` 将 10 个 V5x（quality_v51 / lineage_v52 / knowledge_v53 / versioning_v54 / commercial_v55 / disaster_v56 / semantic_v57 / governance_v58 / ai_governance_v59 / metadata_v60）+ schema-registry + dict + master_data 全部 nest 进 `create_routes()`；`master_data_real_module` 以 `/api/master-data` 前缀挂载（auth + require_module_access + rls 三层中间件）。
  - 前端可达：master-data 各模块均有对应 API 封装与页面引用；mobile 侧 web 33 个文件 + `apps/mobile` 均调用 `/api/mobile`，`mobile_real_module` 注册 99 条受保护路由，offline / offline_records / media / missing_endpoints 路由均已挂载。
- **对账（同一扫描器 `/tmp/scan_per_stmt.py`）**：master-data pool 执行 GUC 语句 **80 处 / 11 文件 → 0**（计划表记 10 文件，实测多出 `dict/handlers.rs` 2 处）；mobile **7 处 / 5 文件 → 0**。全仓剩余 **3 处**：`svc/crm/src/tests/rls_isolation_test.rs`、`lib/shared-auth/tests/rls_middleware_e2e.rs`（两个 RLS 单测）、`lib/shared-db/src/rls.rs`（RLS 策略生成 DDL，机制本身），按设计保留。`&mut **txn` 193 处不计入。
- **统一口径（沿用 B3）**：谓词 `($N::uuid IS NULL OR tenant_id = $N)`，N = 语句现有最大参数 +1，末尾 `.bind(tenant)`；请求链路租户来自 `claims`（`Option<Uuid>`，超管 / 无租户 → `None` = 全量）；同文件同类调用点一次改干净。
- **关键修正（NOT NULL nil-safe）**：`tenant_of` 对超管返回 `None`，若 INSERT 直接绑定会写 SQL NULL，而 `master_data.mdm_recovery_points / recovery_plans / continuity_plans` 等表 `tenant_id` 为 NOT NULL（旧代码写 nil UUID），会触发 23502。所有 INSERT 统一改为 `.bind(tenant.unwrap_or_else(uuid::Uuid::nil))`，保持超管落 nil 行的既有语义。
- **口径一致性修正（ai_governance_v59）**：其辅助方法原复用 `req_tenant_uuid`（返回 nil UUID），会让超管 UPDATE 只命中 nil 行；已把 4 个谓词方法参数改为 `Option<Uuid>`、handler 改用 `tenant_of(&claims)`，与其余模块的"`None` = 全量"对齐。
- **验证（8099 实测，三身份：租户1 / 租户2 / nil）**：
  - disaster 恢复点创建：T1（超管）`200` 且落库 `tenant_id=0000…0000`；N1 `200` → `0001`；N2 `200` → `0002`；TN（无租户普通身份）`400`「缺少租户ID」（模块访问前置要求租户，符合预期）。
  - quality 治理建议：N1 创建 `200` → `0001`；N2 跨租户 approve `404「未找到治理建议」`；N1 本租户 approve `200`，DB `status=approved` → **P0 跨租户 UPDATE 已消除**。
  - mobile offline sync：N1 / N2 / TN 均 `200`；DB 分别 `completed/0001`、`completed/0002`、`completed/NULL`，service token 的显式 nil 语义保持不变（对应决策点 3）。
- **新发现（仅记录，未扩大范围 / 未删代码）**：① `dict/handlers.rs` 的 `core_dict_types` 未做 schema 限定，进程 `SEARCH_PATH`（`flow, mobile, rs, erp, public, iam, shared`）解析到 `master_data.core_dict_types`，该表**无 `tenant_id` 列**（`public.core_dict_types` 才有），`POST` 创建字典类型恒 `500`（`column "tenant_id" of relation "core_dict_types" does not exist`）。旧代码同样引用 `tenant_id`，属**改造前既有缺陷**，非本轮引入，待用户决定（补列 / 加 schema 限定）。② `batch_create_dict_items` 另起事务仍写 nil（按挂账不处置）。③ `delete_dict_item` 无租户谓词（非 GUC 模式）。
- **环境**：`SQLX_OFFLINE=true` 通过 `cargo check -p topems-master-data / topems-mobile / topems-server`；`cargo build -p topems-server` 后替换二进制并重启（`/health=200`）；本轮备份 `topems-server-b4-20261106.bak`。

**验证通用手段**

1. **HTTP 对照**：保留修复前二进制（`/Users/xingzhai/topems/bin/topems-server-before-step2-20261106.bak`），同请求打旧/新两版，比对状态码与 `data` 是否为空。
2. **现有 E2E**：`tests/e2e/tests/production-order.spec.ts`（唯一直接覆盖 MES 写路径的用例，含 release/delete/negative quantity）。
3. **RLS 单测**：`svc/crm/src/tests/rls_isolation_test.rs`（直接构造 txn + GUC，验证隔离）。
4. **SQL 级对照**：`psql` 手工 `BEGIN; SELECT set_config('app.tenant_id','tenant-A',true); ... ROLLBACK;` 与"不设 GUC"两种上下文各跑一次同一条 SQL，比对行数。

---

## 8. 决策点与最终执行口径（已拍板）

用户拍板「按方案 C 实施」，并授权按 **一步到位 / 性能 / 效率（同类一次改干净）/ 通用性最佳** 四条原则择优决定。以下为**最终执行口径**，不再回溯讨论。

| # | 决策点 | 最终选择 | 主要理由 |
|---|---|---|---|
| 1 | RLS fail-closed 何时落地 | **迁移先写、策略最后应用**：P0 只产出迁移文件，直到 B1–B4 全部调用点改完并验证通过后，才在 8099 上执行策略切换 | 直接对应用户硬约束：不允许运行中的 8099 在改造中途长时间不可用；也消除了第 10 节的"半改状态窗口" |
| 2 | master-data（59–66 处）怎么处理 | **先证可达性、默认全部收敛**：先查 `svc/server` 是否挂载其 router 与有无调用方；有挂载 → 与其它模块同口径收敛；证实未挂载且无调用方 → 保留代码、不修改，登记到"归档候选清单"，不删除 | 满足"若确实存在应下线的模块，先给证据再决定"；删代码不是本方案目标，避免不可逆损失 |
| 3 | mobile service token 的 nil 语义 | **保留 nil**：改为**显式事务内 `set_config('app.tenant_id', nil, true)`**，不套 Claims 谓词 | nil 是 service token 的设计语义（无租户归属）；强加 Claims 谓词会直接改坏移动端；显式 nil 事务既让 RLS 有确定值，又不改变语义 |
| 4 | `sqlx::query!` 迁移策略 | **统一改运行时 `query_as::<_, Row>` / `query()` + `FromRow`**，不回填 `.sqlx` 离线缓存 | 本轮 mes 已因 live DB schema 漂移（unified-core 旧迁移与现库不一致）被迫采用；`SQLX_OFFLINE=true` 编译要求 SQL 哈希与缓存严格一致，147 处改写后回填成本与漂移风险都高。运行时查询对本次"只改谓词/绑定"的改动最省事、可复用 |
| 5 | superuser 租户语义 | **维持"超管显式 nil = 全量可见"**，不改 | 与 RLS 的 `tenant_id IS NULL` 豁免、`resolve_create_tenant` 的既有设计自洽；要求超管先选租户会改变所有后台管理路由的前置条件，属另一次产品决策，不在本次收敛范围 |

**执行细则（由上述原则派生）**

1. **统一租户来源**：请求链路一律 `claims.tenant_id` → 作为绑定参数（`$n`）或显式 `set_config`；禁止继续从 GUC 隐式取租户。GUC 仅作为 RLS 的 DB 层兜底，不再承担"应用层谓词来源"。
2. **统一访问路径**：请求内多语句需一致性的走请求事务（`RlsTxnCell`）；单语句读允许 pool，但必须带 `claims.tenant_id` 绑定参数，不得依赖 GUC。
3. **同类一次改干净**：每批按"文件内同模式全改"推进，不按计量到的行号挑改；批末重跑 `/tmp/gen_tables2.py` 对账。
4. **不引入额外连接占用**：只在原本就需要多语句一致性的 handler 引入事务；纯单语句读保持 pool。若 B1 后测量到池压力上升，再按实测调整 `DB_MAX_CONNECTIONS`（当前 8），不预先放大。
5. **新增迁移**：只新增、不改既有。编号在实施时按仓库当前最大编号 +1，内容为收紧 `rls_tenant_isolation` 谓词（去掉 `IS NULL` / `= ''` 两条豁免），附回滚语句。

---

## 9. 不建议动的部分

- **状态守卫**：`mes/production_order.rs::validate_state_transition` 及各处 `status IN (...)` 守卫，与租户无关，不在本方案范围。
- **nil tenant 语义**：`resolve_create_tenant` 的"超管/服务身份落 NULL"是有意设计（配合 RLS 的 `tenant_id IS NULL` 豁免），不要顺手改成"落本租户"。
- **已正确的事务内实现**：209 处 `&mut *tx` / `RlsTxnCell` 调用点是模板，不是债务；改造时以它们为标准答案，不要反向改回 pool。
- **`RlsTxnCell` 的统一提交机制**（`finish_response`），不要为了单个 handler 绕开它。

---

## 10. 风险提示

- **最大风险**：P0 地基与 B1-B4 之间存在"半改状态"窗口——RLS 已 fail-closed，但部分模块仍走 pool。窗口内这些功能表现为"数据消失/404"。缓解：地基与 B1 放在同一个发布单元，或让地基仅在 `staging` 开启。
- 每请求一条事务连接会放大 `DB_MAX_CONNECTIONS=8` 的压力（历史上已耗尽过一次），B1 后需重新评估池大小。
- 宽表/动态 SQL（`only_own_schema_query!`、`AssertSqlSafe(format!(...))`）无法用编译期检查，只能靠第 7 节 SQL 级对照。

---

## 附录 A：扫描口径与复现

脚本：`/tmp/scan_tenant.py`（本轮临时脚本，未入库）

1. 遍历 `svc/**/*.rs`（排除 `target/`、`node_modules/`、`.git/`），取含 `app.tenant_id` 的文件；
2. 定位每个 `sqlx::query*` 调用（`query!` / `query_as::<_,T>` / `query_scalar` / `query(`），做括号配平拿到完整语句；
3. **算子** = 语句文本首个 `SELECT/INSERT/UPDATE/DELETE/WITH` 关键字（不再用 `updated_at`/`deleted_at` 子串判断，避免误判）；
4. **执行目标** = 紧跟语句的 `.fetch_*()/execute()` 实参；`state.pool` / `pool` / `db` / `self.db` 归为 pool，含 `tx` 归为 txn；
5. **谓词形态** = 语句是否包含 `IS NULL OR`；
6. 统计：147 处 / 51 文件 / 0 处 txn（已剔除 209 处事务内正常用法）。

> 注意：本轮 IN 与上一轮 grep 的差异见 2.1；若要与上一轮逐文件对齐，用 `svc/{mes,qms,finance,pm,portal,integration,analytics,unified-core,lims,plugin-registry}` 过滤即得 28 文件/66 处。

# 生产独有状态 CHECK 待回迁清单（2026-11-23）

## 口径

`docs/database/status-check-catalog.json` 只反映「基线 + 前向迁移」可复现的状态。
历史上手工应用到旧开发库、但从未进入 `database/migrations` 的状态 CHECK 约束属于生产独有/待回迁存量，
单独记录在本清单（`prod-only-status-checks-2026-11-23.json`），不再进入状态目录漂移基线。
待回迁约束与 P7 线下策略回迁一起排期。

## 参考库与重生成

- 参考库：`topems_status_baseline_verify`（基线锚点 `20261117235500` + 前向迁移，水位 `20261123142000`）
- 重建命令（隔离库，非生产）：`bash scripts/db/provision-env.sh --env test --db topems_status_baseline_verify --force-nonempty --skip-prod-fingerprint`，再 `bash scripts/migration/apply-forward.sh --db topems_status_baseline_verify --drill-gate-guc-auto`
- 目录重生成：`node scripts/ci/dump-status-checks.mjs --dsn postgresql:///topems_status_baseline_verify --out docs/database/status-check-catalog.json`

## 总量

共 **413** 条。订单两表 `sales_orders_status_check`、`purchase_orders_status_check` 已于 2026-11-24 按方案 B 撤登记（生产遗留、不回迁），不再计入；撤登记前 418，历史读数 391 → 389、415 → 413 均保留为口径记录。

## 2026-11-24 订单两表撤登记（方案 B）

- 从 JSON `entries` 删除 `erp.sales_orders.sales_orders_status_check`（原 B150）与
  `erp.purchase_orders.purchase_orders_status_check`（原 B155），两条移入顶层 `withdrawn` 留证。
- 处置：**生产遗留、不回迁**。依据：与 `20261103000002_global_remove_misapplied_status_standard_checks.sql`
  删除 `*_status_standard` 的既定口径一致——业务状态机由代码枚举保证，不再把手工历史 CHECK 收回仓库。
- `docs/database/status-check-catalog.json` 维持现状（两列仍为 `uncovered`），未重生成；未新增迁移、未改 `database/migrations`、未动基线库。
- 计数同步：erp 33 → 31，B150 55 → 54，B155 15 → 14，总量 418 → 416。

### 独立待办（不阻塞撤登记）

开窗前用生产只读确认这两条 CHECK 是否真实存在，并记录 `convalidated`：

```sql
select conname, convalidated, pg_get_constraintdef(oid)
from pg_constraint
where conrelid in ('erp.sales_orders'::regclass, 'erp.purchase_orders'::regclass)
  and conname in ('sales_orders_status_check','purchase_orders_status_check');
```

证据冲突：本清单原登记两条为生产 `NOT VALID`；`docs/quality/erp-sales-order-status-canonical-2026-11-22.md`
的「数据现状」称生产快照 0 行且无此 CHECK。两者只能以生产只读复核为准，复核前不改变本处置。

### 按 schema

| schema | 条数 |
|---|---:|

| `ai` | 1 |
| `analytics` | 3 |
| `bi` | 2 |
| `communication` | 2 |
| `core` | 2 |
| `crm` | 12 |
| `doc_service` | 1 |
| `ehs` | 28 |
| `erp` | 31 |
| `finance` | 40 |
| `flow` | 7 |
| `gis` | 10 |
| `hrm` | 24 |
| `iam` | 6 |
| `integration` | 5 |
| `lims` | 9 |
| `mail` | 1 |
| `master_data` | 16 |
| `mes` | 41 |
| `mobile` | 5 |
| `pdm` | 9 |
| `plugin_mes` | 1 |
| `pm` | 20 |
| `portal` | 7 |
| `public` | 41 |
| `qms` | 13 |
| `rd` | 3 |
| `rs` | 8 |
| `scm` | 20 |
| `shared` | 1 |
| `srm` | 9 |
| `tms` | 4 |
| `wms` | 32 |

### 按来源批次

| 来源批次 | 条数 |
|---|---:|

| B150 | 54 |
| B152 | 18 |
| B154 | 1 |
| B155 | 14 |
| B156 | 2 |
| B157 | 3 |
| B158 | 2 |
| B159 | 8 |
| B160 | 4 |
| B161 | 12 |
| B162 | 5 |
| B163 | 2 |
| B164 | 3 |
| B165 | 1 |
| B166 | 1 |
| B167 | 1 |
| B169 | 1 |
| B183 | 1 |
| B184 | 1 |
| B185 | 1 |
| B186 | 1 |
| B187 | 1 |
| B188 | 1 |
| B189 | 1 |
| B190 | 1 |
| B191 | 1 |
| B192 | 1 |
| B193 | 2 |
| B194 | 2 |
| B195 | 1 |
| B196 | 1 |
| B197 | 1 |
| B198 | 1 |
| B199 | 1 |
| B200 | 2 |
| B201 | 2 |
| B202 | 2 |
| B203 | 1 |
| B204 | 1 |
| B205 | 3 |
| B206 | 2 |
| B207 | 2 |
| B208 | 1 |
| B209 | 2 |
| B210 | 2 |
| B211 | 2 |
| B212 | 2 |
| B213 | 2 |
| B214 | 1 |
| B216 | 1 |
| B217 | 2 |
| B218 | 4 |
| B219 | 2 |
| B220 | 1 |
| B221 | 1 |
| B222 | 1 |
| B223 | 1 |
| B224 | 1 |
| B225 | 1 |
| B226 | 1 |
| B227 | 1 |
| B228 | 1 |
| B229 | 1 |
| B230 | 1 |
| B231 | 1 |
| B232 | 1 |
| B233 | 1 |
| B234 | 1 |
| B235 | 1 |
| B236 | 1 |
| B237 | 1 |
| B238 | 1 |
| B239 | 1 |
| B240 | 1 |
| B241 | 1 |
| B242 | 1 |
| B243 | 1 |
| B244 | 1 |
| B245 | 1 |
| B246 | 1 |
| B247 | 1 |
| B249 | 1 |
| B252 | 1 |
| B253 | 1 |
| W5-B B1（初始快照） | 184 |
| 模块统一枚举：mes | 5 |
| 模块统一枚举：scm | 7 |
| 模块统一枚举：unified-core | 1 |

## 维护约定

1. **回迁一条删一条**：生产回迁并验证成功后，从本 JSON 删除该条，同时刷新 `status-check-catalog.json`。
2. 本清单只增不减地描述「待回迁存量」；禁止把它当作漂移豁免白名单。
3. 新增生产独有约束时，必须在本清单登记 schema/table/constraint/definition/来源与备注。
4. 从基线重建的库必须能复现 `status-check-catalog.json`；若复现不了，说明该约束应进入本清单而非目录。

## 备注

- `convalidated_at_catalog` 依据目录中的 CHECK 定义推断（含 `NOT VALID` 记为 `false`），当前参考库已不存在该约束。
- 来源批次按首次引入目录的提交主题归属；无批次号的历史条目归 `W5-B B1（初始快照）` 或「模块统一枚举」。
- W5-B215 已把 `hrm.contracts` 原手工约束 `ck_contracts_status_standard` 收敛为迁移可复现的 `ck_hrm_contracts_status_standard`，故不列入本清单。
- W5-B216/B217/B218 新增的 finance 对账/付款工作流约束同样只有候选 SQL、无迁移，已计入本清单待回迁。
- W5-B219（`986541c56`）新增 `finance.reconcile_items.ck_reconcile_items_status_standard`、`finance.reconcile_orders.ck_reconcile_orders_status_standard` 亦只有候选 SQL（`docs/database/finance-reconcile-status-check-candidates-2026-11-23.sql`）、无迁移，已计入本清单；基线+前向迁移参考库不存在这两条。
- W5-B220（`600cc70c6`）新增 `finance.reconciliation_item_snapshots.ck_reconciliation_item_snapshots_match_status_standard` 同样只有候选 SQL（`docs/database/finance-item-snapshot-match-status-check-candidates-2026-11-23.sql`）、无迁移，已计入本清单。
- W5-B221（`6725c1f2d`）新增 `finance.expenses.ck_expenses_status_standard` 同样只有候选 SQL（`docs/database/finance-expenses-status-check-candidates-2026-11-23.sql`）、无迁移，已计入本清单。
- W5-B222（`e7c4dba35`）新增 `erp.consolidation_scopes.ck_consolidation_scopes_status_standard`、W5-B223（`d140dd522`）新增 `erp.consolidation_reports.ck_consolidation_reports_approval_status_standard`，均只有候选 SQL（`docs/database/erp-consolidation-*-status-check-candidates-2026-11-23.sql`）、无迁移；重建库中表存在但约束不存在，两列登记在目录 `uncovered`，已计入本清单待回迁。
- W5-B224（B224）新增 `integration.mes_erp_sync.ck_mes_erp_sync_sync_status_standard` 只有候选 SQL（`docs/database/integration-mes-erp-sync-status-check-candidates-2026-11-23.sql`）、无迁移；重建库中表存在但约束不存在，`sync_status` 登记在目录 `uncovered`，已计入本清单待回迁。

- W5-B225（B225）新增 `pdm.pdm_change_notices.ck_pdm_change_notices_status_standard` 只有候选 SQL（`docs/database/pdm-change-notice-status-check-candidates-2026-11-23.sql`）、无迁移；重建库中表存在但约束不存在，`status` 登记在目录 `uncovered`，已计入本清单待回迁。
- W5-B226（B226）新增 `pm.pm_tasks.ck_pm_tasks_status_standard` 只有候选 SQL（`docs/database/pm-task-status-check-candidates-2026-11-23.sql`）、无迁移；重建库中表存在但约束不存在，`status` 登记在目录 `uncovered`，已计入本清单待回迁。
- W5-B227（B227）新增 `pm.project_approvals.ck_project_approvals_status_standard` 只有候选 SQL（`docs/database/pm-project-approval-status-check-candidates-2026-11-23.sql`）、无迁移；重建库中表存在但约束不存在，`status` 登记在目录 `uncovered`，已计入本清单待回迁。
- W5-B228（B228）新增 `pm.contracts.ck_contracts_status_standard` 只有候选 SQL（`docs/database/pm-contract-status-check-candidates-2026-11-23.sql`）、无迁移；重建库中表存在但约束不存在，`status` 登记在目录 `uncovered`，已计入本清单待回迁。
- W5-B229（B229）新增 `pm.budgets.ck_budgets_status_standard` 只有候选 SQL（`docs/database/pm-budget-status-check-candidates-2026-11-23.sql`）、无迁移；重建库中表存在但约束不存在，`status` 登记在目录 `uncovered`，已计入本清单待回迁。
- W5-B230（B230）新增 `pm.project_milestones.ck_project_milestones_status_standard` 只有候选 SQL（`docs/database/pm-milestone-status-check-candidates-2026-11-23.sql`）、无迁移；重建库中表存在但约束不存在，`status` 登记在目录 `uncovered`，已计入本清单待回迁。
- W5-B231（B231）新增 `pm.project_expenses.ck_project_expenses_status_standard` 只有候选 SQL（`docs/database/pm-project-expense-status-check-candidates-2026-11-23.sql`）、无迁移；重建库中表存在但约束不存在，`status` 登记在目录 `uncovered`，已计入本清单待回迁。
- W5-B232（B232）新增 `pm.project_phases.ck_project_phases_status_standard` 只有候选 SQL（`docs/database/pm-project-phase-status-check-candidates-2026-11-23.sql`）、无迁移；重建库中表存在但约束不存在，`status` 登记在目录 `uncovered`，已计入本清单待回迁。
- W5-B233（B233）新增 `pm.project_reports.ck_project_reports_status_standard` 只有候选 SQL（`docs/database/pm-project-report-status-check-candidates-2026-11-23.sql`）、无迁移；重建库中表存在但约束不存在，`status` 登记在目录 `uncovered`，已计入本清单待回迁。
- W5-B234（B234）新增 `pm.defects.ck_defects_status_standard` 只有候选 SQL（`docs/database/pm-defect-status-check-candidates-2026-11-23.sql`）、无迁移；重建库中表存在但约束不存在，`status` 登记在目录 `uncovered`，已计入本清单待回迁。
- W5-B238（B238）新增 `qms.qa_audit_findings.ck_qa_audit_findings_status_standard` 只有候选 SQL（`docs/database/qms-audit-finding-status-check-candidates-2026-11-23.sql`）、无迁移；重建库中表存在但约束不存在，`status` 登记在目录 `uncovered`，已计入本清单待回迁。
- W5-B237（B237）新增 `pm.project_resources.ck_project_resources_status_standard` 只有候选 SQL（`docs/database/pm-project-resource-status-check-candidates-2026-11-23.sql`）、无迁移；重建库中表存在但约束不存在，`status` 登记在目录 `uncovered`，已计入本清单待回迁。
- W5-B236（B236）新增 `rd.bugs.ck_rd_bugs_status_standard` 只有候选 SQL（`docs/database/rd-bug-status-check-candidates-2026-11-23.sql`）、无迁移；重建库中表存在但约束不存在，`status` 登记在目录 `uncovered`，已计入本清单待回迁。
- W5-B235（B235）新增 `pm.project_risks.ck_project_risks_status_standard` 只有候选 SQL（`docs/database/pm-project-risk-status-check-candidates-2026-11-23.sql`）、无迁移；已于 2026-11-24 由 B269 回迁（`database/migrations/20261124235500_pm_project_risk_status_standard.sql`），不再计入。

- W5-B239（B239）新增 `pm.settlements.ck_settlements_status_standard` 只有候选 SQL（`docs/database/pm-settlement-status-check-candidates-2026-11-23.sql`）、无迁移；重建库中表存在但约束不存在，`status` 登记在目录 `uncovered`，已计入本清单待回迁。

- W5-B240（B240）新增 `pm.acceptance_records.ck_acceptance_records_result_status_standard` 只有候选 SQL（`docs/database/pm-acceptance-record-status-check-candidates-2026-11-23.sql`）、无迁移；该约束替换生产历史 `ck_acceptance_records_status_standard`（active/inactive/archived），旧条目保留、部署时先 DROP 旧约束。

- W5-B241（B241）新增 `qms.qa_audit_plans.ck_qa_audit_plans_status_standard` 只有候选 SQL（`docs/database/qms-audit-plan-status-check-candidates-2026-11-23.sql`）、无迁移；重建库中表存在但约束不存在，`status` 登记在目录 `uncovered`，已计入本清单待回迁。

- W5-B242（B242）新增 `pm.acceptance_plans.ck_acceptance_plans_status_standard` 只有候选 SQL（`docs/database/pm-acceptance-plan-status-check-candidates-2026-11-23.sql`）、无迁移；重建库中表存在但约束不存在，`status` 登记在目录 `uncovered`，已计入本清单待回迁。

- W5-B243（B243）新增 `hrm.training_records.ck_training_records_completion_status_standard` 只有候选 SQL（`docs/database/hrm-training-record-completion-status-check-candidates-2026-11-23.sql`）、无迁移；重建库中表存在但约束不存在，`completion_status` 登记在目录 `uncovered`，已计入本清单待回迁。

- W5-B244（B244）新增 `hrm.training_records.ck_training_records_attendance_status_standard` 只有候选 SQL（`docs/database/hrm-training-record-attendance-status-check-candidates-2026-11-23.sql`）、无迁移；重建库中表存在但约束不存在，`attendance_status` 登记在目录 `uncovered`，已计入本清单待回迁。

- W5-B245（B245）新增 `hrm.training_plans.ck_training_plans_status_lifecycle_standard` 只有候选 SQL（`docs/database/hrm-training-plan-status-check-candidates-2026-11-23.sql`）、无迁移；该约束替换既有 `ck_training_plans_status_standard`（active/inactive/archived），部署时必须先 DROP 旧约束；重建库仍保留旧约束，新约束不存在，已计入本清单待回迁。

- W5-B246（B246）新增 `ehs.qa_ehs_hazardous_materials.ck_qa_ehs_hazardous_materials_status_lifecycle_standard` 只有候选 SQL（`docs/database/ehs-hazardous-material-status-check-candidates-2026-11-23.sql`）、无迁移；该约束替换既有 `ck_qa_ehs_hazardous_materials_status_standard`（active/inactive/archived），部署时必须先 DROP 旧约束；重建库仍保留旧约束，新约束不存在，已计入本清单待回迁。

- W5-B247（B247）新增 `ehs.qa_ehs_environment_monitors.ck_qa_ehs_environment_monitors_status_lifecycle_standard` 只有候选 SQL（`docs/database/ehs-environment-monitor-status-check-candidates-2026-11-23.sql`）、无迁移；该约束替换既有 `ck_qa_ehs_environment_monitors_status_standard`（active/inactive/archived），部署时必须先 DROP 旧约束；重建库仍保留旧约束，新约束不存在，已计入本清单待回迁。

- W5-B249（B249）新增 `wms.warehouses.ck_warehouses_status_lifecycle_standard` 只有候选 SQL（`docs/database/wms-warehouse-status-lifecycle-check-candidates-2026-11-24.sql`）、无迁移；该约束替换既有 `ck_warehouses_status_standard`（active/inactive/archived），部署时必须先 DROP 旧约束；重建库仍保留旧约束，新约束不存在，已计入本清单待回迁。


- W5-B252（B252）新增 `finance.core_finance_periods.ck_core_finance_periods_status_standard` 只有候选 SQL（`docs/database/finance-period-status-check-candidates-2026-11-24.sql`）、无迁移；该列本身是原生枚举 `period_status`（open/closing/closed），DB 已拒绝枚举外值，本约束用于锁定枚举扩展并让状态盘点器识别显式约束；重建库不存在该 CHECK，已计入本清单待回迁。


- W5-B253（B253）新增 `rs.rs_projects.ck_rs_projects_status_lifecycle_standard` 只有候选 SQL（`docs/database/rd-rs-project-status-check-candidates-2026-11-24.sql`）、无迁移；该表由 PM 项目事件维护，既有 17 行 pending，约束统一 pending/in_progress/completed/cancelled；重建库不存在该 CHECK，已计入本清单待回迁。

- 2026-11-23 复核：以「基线 + 前向迁移」从零重建参考库（水位 `20261123142000`，当前链尾；上游 B216–B223 只加候选 SQL、未加迁移）后逐条比对，391 条均不存在于重建库，且 `database/migrations` 无对应 `ADD CONSTRAINT`，故全部保留。

## 复核记录（2026-11-23，第二轮推送前）

- 参考库 `topems_status_baseline_verify` 从零重建至当前链尾（`provision-env.sh` + `apply-forward.sh --drill-gate-guc-auto`），水位 `20261123142000`；上游 B216–B223 未新增任何迁移。
- B216–B221 共 11 条并发上游新增逐条核对：`database/migrations` 无 `ADD CONSTRAINT`，重建库亦不存在，全部保留、无移出。
- 全量 391 条逐条比对重建库 `pg_constraint`：均无对应约束（表存在但约束不存在，或缺表），无一条属仓库可复现，故无移出。
- 相对上一轮 389 条，本次新增 B222 `erp.consolidation_scopes` 1 条、B223 `erp.consolidation_reports` 1 条，均只有候选 SQL。
- 目录最终读数：33 条状态 CHECK / 5 个枚举 / 683 个无约束列，全量 `--check` PASS；订单两表 constraints 0/0、uncovered 2/2。
- B224 追加后读数：392 条；`integration.mes_erp_sync.sync_status` 仍为 uncovered，目录读数不变（33/5/683）。
- B225 追加后读数：393 条；`pdm.pdm_change_notices.status` 仍为 uncovered，目录读数不变（33/5/683）。
- B226 追加后读数：394 条；`pm.pm_tasks.status` 仍为 uncovered，目录读数不变（33/5/683）。
- B227 追加后读数：395 条；`pm.project_approvals.status` 仍为 uncovered，目录读数不变（33/5/683）。
- B228 追加后读数：396 条；`pm.contracts.status` 仍为 uncovered，目录读数不变（33/5/683）。
- B229 追加后读数：397 条；`pm.budgets.status` 仍为 uncovered，目录读数不变（33/5/683）。
- B230 追加后读数：398 条；`pm.project_milestones.status` 仍为 uncovered，目录读数不变（33/5/683）。
- B231 追加后读数：399 条；`pm.project_expenses.status` 仍为 uncovered，目录读数不变（33/5/683）。
- B232 追加后读数：400 条；`pm.project_phases.status` 仍为 uncovered，目录读数不变（33/5/683）。
- B233 追加后读数：401 条；`pm.project_reports.status` 仍为 uncovered，目录读数不变（33/5/683）。
- B234 追加后读数：402 条；`pm.defects.status` 仍为 uncovered，目录读数不变（33/5/683）。
- B235 追加后读数：403 条；`pm.project_risks.status` 仍为 uncovered，目录读数不变（33/5/683）。
- B236 追加后读数：404 条；`rd.bugs.status` 仍为 uncovered，目录读数不变（33/5/683）。
- B237 追加后读数：405 条；`pm.project_resources.status` 仍为 uncovered，目录读数不变（33/5/683）。
- B238 追加后读数：406 条；`qms.qa_audit_findings.status` 仍为 uncovered，目录读数不变（33/5/683）。
- B239 追加后读数：407 条；`pm.settlements.status` 仍为 uncovered，目录读数不变（33/5/683）。
- B240 追加后读数：408 条；`pm.acceptance_records.status` 仍为 uncovered，目录读数不变（33/5/683）。
- B241 追加后读数：409 条；`qms.qa_audit_plans.status` 仍为 uncovered，目录读数不变（33/5/683）。
- B242 追加后读数：410 条；`pm.acceptance_plans.status` 仍为 uncovered，目录读数不变（33/5/683）。
- B243 追加后读数：411 条；`hrm.training_records.completion_status` 仍为 uncovered，目录读数不变（33/5/683）。
- B244 追加后读数：412 条；`hrm.training_records.attendance_status` 仍为 uncovered，目录读数不变（33/5/683）。
- B245 追加后读数：413 条；`hrm.training_plans.status` 在参考库仍由旧约束覆盖，新生命周期约束未回迁。
- B246 追加后读数：414 条；`ehs.qa_ehs_hazardous_materials.status` 在参考库仍由旧约束覆盖，新四态约束未回迁。
- B246 来源提交已回填：`813efa943`。
- B247 追加后读数：415 条；`ehs.qa_ehs_environment_monitors.status` 在参考库仍由旧约束覆盖，新四态约束未回迁。
- B247 来源提交已回填：`ce3e680bc`。
- B249 追加后读数：416 条；`wms.warehouses.status` 在参考库仍由旧约束覆盖，新四态约束未回迁。
- B249 来源提交已回填：`8f02baa90`。
- B252 追加后读数：418 条；`finance.core_finance_periods.status` 在参考库仍由原生枚举覆盖，显式 CHECK 未回迁。
- B252 来源提交已回填：`7800deeb5`。
- B253 追加后读数：419 条；`rs.rs_projects.status` 在参考库仍无约束，新四态约束未回迁。
- **B251 已回迁**：`finance.budgets` 旧模板约束 `ck_budgets_status_standard`（active/inactive/archived）由迁移
  `database/migrations/20261124100000_finance_budgets_status_lifecycle.sql` 替换为
  `ck_budgets_status_lifecycle_standard`（五态，validated）+
  `ck_budgets_exhausted_requires_depleted_budget`（`exhausted` ⇒ `remaining_amount <= 0`，validated）；
  参考库已复现、目录已收录（33 → 35 条），故按「回迁一条删一条」从本清单移除，移除后读数 418 条。
  B253 的「419」为 B251 移除前口径，不另行改写历史读数。证据 `docs/quality/finance-budget-status-guard-2026-11-24.md`。

## 与 P7 线下策略回迁合并排期（2026-11-24，仅方案，未执行）

### 口径校正

当前 JSON 实际 **416** 条；「391 条」是 11-23 第二轮推送前的读数，之后 B224–B253 继续追加、B251 回迁 1 条，
2026-11-24 再按方案 B 撤登记订单两表 2 条、B255 删除报表 approval 约束 1 条，故为 415（第二轮口径即 391 → 389）。
本方案按 416 排；若只按 391 口径执行，差额全部落在 S2/S3/S5 的后增条目，分批骨架不变。

### 分批（按域合并，一次窗口同时做「状态 CHECK 回迁 + 同域宽松策略收紧」）

| 批 | 域 | schema / 条数 | 与 P7 同窗合并 | 特殊动作 |
|---|---|---|---:|---|
| S1 | 平台与公共域 | public 42、gis 10、flow 7、portal 7、iam 6、rs 8、analytics 3、core 2、bi 2、communication 2、ai 1、mail 1、shared 1、doc_service 1（**93**） | W7-B 批 6（public 52）、批 2（平台语料） | `flow` 7 条以影子表 DROP 决策为前置；未决则先跳过 flow |
| S2 | 制造与供应链 | mes 41、wms 32、scm 20、master_data 16、srm 9、tms 4、plugin_mes 1（**123**） | W7-B 批 7（主数据）+ 制造/供应链同域批次 | 无替换型；mes/scm 的「模块统一枚举」12 条优先 |
| S3 | 财务 / ERP / 集成 / PDM | finance 40、erp 31、integration 5、pdm 9（**85**） | W7-B 批 8（ERP）、批 3（身份/客户同域） | 订单两表已按方案 B 撤登记，不纳入本批；B251 已单独回迁 1 条；B255 删除 `financial_reports` 冗余 approval 列后移出 1 条 |
| S4 | 项目 / 质量 / 研发 | pm 20、qms 13、lims 9、rd 3（**45**） | W7-B 批 4（质量）、批 2（研发） | `pm.acceptance_records` 为替换型：先 DROP 旧 `ck_acceptance_records_status_standard` 再 ADD |
| S5 | 人力 / EHS / 移动 / CRM | ehs 28、hrm 24、crm 12、mobile 5（**69**） | W7-B 批 5（人力）、批 3（CRM） | 3 条替换型（`hrm.training_plans`、`ehs` 两张），必须 DROP 旧 + ADD 新同事务 |

执行顺序：**S1 → S2 → S3 → S4 → S5**（无替换/低风险在前，替换型最后）。

### 每批动作（固定四步）

1. **回迁**：新增迁移 `<ts>_backfill_status_checks_batchN.sql`，逐条 `ALTER TABLE ... ADD CONSTRAINT ... CHECK (...) NOT VALID`；替换型在同一事务内先 `DROP CONSTRAINT IF EXISTS <旧名>` 再 ADD。不 `VALIDATE`，不碰存量行。
2. **基线验证**：在 `topems_status_baseline_verify` 重建/前向应用本批迁移，重生成 `status-check-catalog.json`，跑全量 `--check`；本批条目应从 `uncovered` 转入 `constraints`。
3. **生产同窗**：与 P7 同域策略脚本在同一窗口 apply；只读核对 `pg_constraint.convalidated=false` 与 `pg_policies` 快照，不写业务明细。
4. **删除登记**：按「回迁一条删一条」从本 JSON 删除对应条目、同步本文总数与 schema/批次表，再刷新目录。

### 每批前置条件（缺一不批）

- DBA 只读已通、账本 `success=t`、`pg_dump` 备份可读；
- 目标表存在、状态列类型为 varchar/text（enum 列不套 CHECK）；
- 生产越界值计数为 0，或业务书面接受「NOT VALID 不校验存量」；
- 替换型旧约束名已在生产 `pg_constraint` 确认，DROP/ADD 同事务；
- P7 同域策略脚本已在快照库跑过六档（T0–T5）对抗查询；
- S1 需 `flow` 影子表 DROP 决策；S5 需 HR/EHS 生命周期值业务确认。

### 每批验收判据

- 基线重建库可复现：全量 `--check` PASS，约束数 = 35 + 本批条数，`uncovered` 同量减少；
- 生产 `pg_constraint` 存在本批全部约束且 `convalidated=false`；
- 越界值写入被 `23514` 拒，正常枚举值写入成功（每批抽 3 张表）；
- P7 侧策略快照 PASS、A/B 对抗查询与六档读数符合预期；
- 本 JSON 条目数按批复精确递减，目录与清单无重复、无遗漏。

> 本方案只定义批次与判据；未生成任何迁移、未改目录、未动生产。

## B255 报表双列合并后的清单变化（2026-11-24）

- 删除 `finance.financial_reports.approval_status` 列后，`ck_financial_reports_approval_status_standard` 随列删除，本清单移除该条：416 → 415，finance 41 → 40。
- `audit_logs` 13 个 schema 的 `ck_audit_logs_status_standard` 已收窄为 6 结果态，清单内定义与值集同步更新；参考库仅 `crm` 有该约束，不属 prod-only。

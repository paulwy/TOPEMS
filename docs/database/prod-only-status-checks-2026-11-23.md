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

共 **416** 条（其中订单两表 `sales_orders_status_check`、`purchase_orders_status_check` 各 1 条）。

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
| `erp` | 33 |
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
| `public` | 42 |
| `qms` | 13 |
| `rd` | 3 |
| `rs` | 7 |
| `scm` | 20 |
| `shared` | 1 |
| `srm` | 9 |
| `tms` | 4 |
| `wms` | 32 |

### 按来源批次

| 来源批次 | 条数 |
|---|---:|

| B150 | 55 |
| B152 | 18 |
| B154 | 1 |
| B155 | 15 |
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
| B168 | 1 |
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
- W5-B235（B235）新增 `pm.project_risks.ck_project_risks_status_standard` 只有候选 SQL（`docs/database/pm-project-risk-status-check-candidates-2026-11-23.sql`）、无迁移；重建库中表存在但约束不存在，`status` 登记在目录 `uncovered`，已计入本清单待回迁。

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

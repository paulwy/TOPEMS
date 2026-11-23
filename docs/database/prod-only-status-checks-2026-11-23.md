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

共 **391** 条（其中订单两表 `sales_orders_status_check`、`purchase_orders_status_check` 各 1 条）。

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
| `ehs` | 26 |
| `erp` | 33 |
| `finance` | 40 |
| `flow` | 7 |
| `gis` | 10 |
| `hrm` | 21 |
| `iam` | 6 |
| `integration` | 4 |
| `lims` | 9 |
| `mail` | 1 |
| `master_data` | 16 |
| `mes` | 41 |
| `mobile` | 5 |
| `pdm` | 8 |
| `plugin_mes` | 1 |
| `pm` | 6 |
| `portal` | 7 |
| `public` | 42 |
| `qms` | 11 |
| `rd` | 3 |
| `rs` | 6 |
| `scm` | 20 |
| `shared` | 1 |
| `srm` | 9 |
| `tms` | 4 |
| `wms` | 31 |

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
- 2026-11-23 复核：以「基线 + 前向迁移」从零重建参考库（水位 `20261123142000`，当前链尾；上游 B216–B223 只加候选 SQL、未加迁移）后逐条比对，391 条均不存在于重建库，且 `database/migrations` 无对应 `ADD CONSTRAINT`，故全部保留。

## 复核记录（2026-11-23，第二轮推送前）

- 参考库 `topems_status_baseline_verify` 从零重建至当前链尾（`provision-env.sh` + `apply-forward.sh --drill-gate-guc-auto`），水位 `20261123142000`；上游 B216–B223 未新增任何迁移。
- B216–B221 共 11 条并发上游新增逐条核对：`database/migrations` 无 `ADD CONSTRAINT`，重建库亦不存在，全部保留、无移出。
- 全量 391 条逐条比对重建库 `pg_constraint`：均无对应约束（表存在但约束不存在，或缺表），无一条属仓库可复现，故无移出。
- 相对上一轮 389 条，本次新增 B222 `erp.consolidation_scopes` 1 条、B223 `erp.consolidation_reports` 1 条，均只有候选 SQL。
- 目录最终读数：33 条状态 CHECK / 5 个枚举 / 683 个无约束列，全量 `--check` PASS；订单两表 constraints 0/0、uncovered 2/2。

# PM 项目风险状态约束回迁（B269，2026-11-24）

## 问题

`ProjectRiskStatus` 与状态机、别名归一、更新流转守卫均已在代码中存在，但 `pm.project_risks.ck_project_risks_status_standard` 只有 B235 的候选 SQL（`docs/database/pm-project-risk-status-check-candidates-2026-11-23.sql`），从未进入 `database/migrations`：

- 「基线 + 前向迁移」重建库没有这条约束，状态值域只在当前开发库手工存在；
- 列仍可空（`is_nullable=YES`），与 Rust `ProjectRisk` 的 `status: String` 不一致；
- 该约束一直挂在生产独有/待回迁清单，属于真实台账缺口。

## 改动

新增迁移 `database/migrations/20261124235500_pm_project_risk_status_standard.sql`：

- 默认值固定 `'identified'`；
- 历史别名一次性归一：`open/active → identified`、`mitigating/controlled → mitigated`、`complete/completed/done/resolved → closed`，同时 `trim + lower`；
- `NULL` 统一补 `identified`，随后 `status SET NOT NULL`；
- 用 `DO` 块检查约束是否已存在，不存在才 `ADD CONSTRAINT ck_project_risks_status_standard CHECK (status IN ('identified','mitigated','closed')) NOT VALID`，保证真实重建库可复现、已手工应用的库可幂等执行；
- 本地库随后显式 `VALIDATE CONSTRAINT`；
- 回滚脚本恢复可空、默认 `identified` 并删除约束。

同步：

- `database/migration_manifest.yaml`、`database/checksums.txt` 登记迁移；
- `docs/database/status-db-check-mappings.json` 的 `ProjectRiskStatus` 候选改为本迁移，验证方式更新为 `convalidated, NOT NULL, default identified`；
- 从 `docs/database/prod-only-status-checks-2026-11-23.json` 删除该条，`total 415 → 414`、`by_schema.pm` 与 `by_batch.B235` 同步递减；Markdown 清单标记 B235 已由 B269 回迁。

## 验证

- 本地库迁移执行成功；`ck_project_risks_status_standard` 为 `convalidated=t`，定义只允许三态，默认 `'identified'`、`is_nullable=NO`。
- 事务探针：插入 `bogus` 被 23514 拒绝；插入 `mitigated` 成功；两次均回滚，`pm.project_risks` 保持 0 行。
- `bash scripts/migration/validate.sh`：0 errors、0 checksum errors、0 schema drift。
- 状态台账：319 个 Rust 枚举 / 251 个前端键；188 队列 / 192 值；enum contract 12/12；`status-catalog` 对参考库 35 条 CHECK / 5 枚举 / 681 无约束列一致，均 PASS。

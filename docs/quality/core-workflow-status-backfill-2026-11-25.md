# B270 工作流状态约束回迁

日期：2026-11-25
范围：`public.core_workflows.status`（五态工作流定义状态）

## 根因

`svc/unified-core/src/modules/flow/workflow_status.rs` 已有 `WorkflowStatus` 五态唯一值源（`draft/published/active/inactive/deployed`，默认 `Draft`），创建与列表/更新入口也做了值解析；但数据库层存在两处缺口：

1. 旧迁移 `database/migrations/20260920000081_drop_workflow_status_check.sql` 会显式 `DROP CONSTRAINT ck_core_workflows_status_standard`，此后没有任何前向迁移重建它。B168 只留下候选 SQL `docs/database/core-workflow-status-check-candidates-2026-11-23.sql`，从未进入 `database/migrations`，导致「基线 + 前向迁移」重建库不可复现。
2. 本地约束 `ck_core_workflows_status_standard` 虽已 `convalidated=t`，但定义允许 `status IS NULL`，列本身 `is_nullable=YES`，与 Rust `status: String` / 默认 `Draft` 不一致。

本地 `public.core_workflows` 共 20 行，状态分布 `published 18 / deployed 1 / draft 1`，无 NULL。

## 改动

- 新增迁移 `database/migrations/20261125001000_core_workflow_status_standard.sql`：
  - `status SET DEFAULT 'draft'`；
  - `status IS NULL` 归一为 `draft`（带完整 destructive-gate 标记，expires `2027-05-01`）；
  - `status SET NOT NULL`；
  - `DO` 块幂等检查并重建 `ck_core_workflows_status_standard CHECK (status IN (...)) NOT VALID`，兼容旧迁移先 DROP 的历史路径；
  - 本地显式 `VALIDATE CONSTRAINT`。
- 回滚 `database/rollback/20261125001000_core_workflow_status_standard.rollback.sql`：恢复可空并还原允许 NULL 的旧约束。
- 生产独有清单移除 B168 条目：`total 414→413`、`by_schema.public 42→41`、`by_batch.B168` 删除。
- `docs/database/status-db-check-mappings.json` 的 `WorkflowStatus` 映射改为本迁移，`db_verified_via` 标为 `convalidated + NOT NULL + default draft`。
- 队列 JSON 重新生成；Rust 枚举与前端状态键未变。

## 本地验证

- 迁移应用：`ALTER TABLE` + `UPDATE 0` + `DO` + `COMMENT` 全部成功。
- 约束：`ck_core_workflows_status_standard` `convalidated=t`；列默认 `'draft'`、`is_nullable=NO`。
- 探针（事务内回滚，不影响数据）：
  - `status='bogus'` → `23514` 违反 `ck_core_workflows_status_standard`；
  - `status='draft'` → `UPDATE 1` 成功；
  - 回滚后目标行仍为 `published`。
- `bash scripts/migration/validate.sh` 连跑两次：`Errors: 0`、`Checksum errors: 0`、`Schema drift issues: 0`，872 个迁移文件。
- 状态台账：188 队列 / 192 值，`db_covered 118 / real_gap 0 / internal_state 163 / persisted_unmapped 14 / finance_candidate_ready 15`；Rust 枚举 319、前端 251 不变。

## 剩余说明

`core_workflows` 的发布/取消发布/激活/停用/部署五个动作端点仍直接写目标状态，本批只回迁数据层约束与 NOT NULL，不改动作语义；状态流转守卫留待后续按前端实际按钮矩阵单独收口。

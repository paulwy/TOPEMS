# B47 · mes.material_issues 状态单一源（2026-11-21）

## 现状（改动前）
- `mes.material_issues`：本地 0 行，列默认 `'pending'`，无 CHECK。
- 创建写死 `'pending'`；编辑 `status = COALESCE($2, status)` 接受任意字符串，`CASE WHEN $2 = 'completed'` 用字面量判断；列表状态过滤不校验。
- 删除逻辑先 `DELETE material_issue_items`、再软删主单；状态不是 pending 时主单仍在，但明细已经被删掉，属于破坏性假失败。
- 详情/创建回显在 status 为空时回退字面量 `"pending"`。

## 改动
1. 新增 `svc/mes/src/modules/material_bom/issue_status.rs`：`MaterialIssueStatus`（pending/completed，`DEFAULT = Pending`，`update_from` 只允许向前），严格解析 + 2 单测。
2. `issue_handlers.rs`：
   - 创建绑定 `DEFAULT`；
   - 列表状态严格解析，未知 400；
   - 编辑状态严格解析，`CASE WHEN` 与起始态都改绑枚举，加 `status = ANY($8)` 谓词，0 行 409；
   - 删除改为先校验并软删主单，成功后再删明细；主单 0 行直接回滚并 409。
3. 因 sqlx 在线缓存被同 crate 既有的 `equipment_oee` 类型错误阻断，本批把改动的 3 条 SQL 改为运行时 `sqlx::query` / `query_as`，并新增 `MaterialIssueRow` 映射，避免强制刷新全 crate 缓存。
4. 候选 DDL `docs/database/mes-material-issue-status-check-candidates-2026-11-21.sql`：`material_issues_status_check`（两值，`NOT VALID`）。

## 验证
- `cargo check -p topems-mes`、`cargo clippy -p topems-mes --all-targets -- -D warnings`、`cargo fmt --all` 干净。
- `cargo test -p topems-mes --lib issue_status`：2 passed。
- 本地演练（事务内 ROLLBACK，残留 0）：insert pending → completed `UPDATE 1`；`completed → 'issued'` → 23514；回滚后行 0、约束 0。
- 盘点：枚举 156→157、值 163（pending/completed 已存在）、不在 DB CHECK 124、色板缺口 0；队列 112 枚举（新增 1、映射 resolved 1）；映射 91→92。

## 残留
- 0 行数据，候选 CHECK 只能用演练验证；需在真实领料流程跑一次 pending → completed。
- 删除明细仍是硬删，主单软删；历史语义未改。
- `material_issue_items` 无状态列，不在本批范围。
- 同 crate 的 `equipment_oee` 在线 sqlx 类型错误仍在，导致全量 `cargo sqlx prepare` 失败；本批绕开，但下次改到 query! 宏时会再次遇到。
- 候选 CHECK 未进 `database/migrations/`、未在生产执行。

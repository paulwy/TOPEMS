# B238 · `qms.qa_audit_findings.status` 状态守卫（2026-11-23）

## 结论

`qms.qa_audit_findings.status` 已收敛到唯一 Rust 枚举 `QmsAuditFindingStatus`
（`open` / `in_progress` / `verified` / `closed`，默认 `open`）；
创建、列表过滤、verify 动作与数据库 CHECK 共用同一值集，非法值与非法流转返回 400/409。

## 修复的真实缺陷

1. **创建状态靠 SQL 字面量**：INSERT 硬编码 `'open'`，与枚举无关联；现绑定 `QmsAuditFindingStatus::DEFAULT`。
2. **verify 可重复执行、可跳过前置状态**：原 `UPDATE ... SET status='verified' WHERE id AND tenant_id` 无来源状态约束，
   已 verified / closed 的发现可再次“验证”，状态机被绕过；现仅允许 `open` / `in_progress` → `verified`，其余返回 409。
3. **列表状态过滤未校验**：任意字符串直接进入 `status = $n`；现先 `parse_filter`，非法值 400。

## 生命周期

与前端 `StatusBadge` 的 `audit_finding` FSM 对齐：

```text
open → in_progress → verified → closed
  ↘                    ↗
   verified ───────────┘
```

允许：`open→in_progress/verified`、`in_progress→verified`、`verified→closed`；`closed` 为终态。
当前后端只暴露 verify 动作，因此 `VERIFY_FROM = [open, in_progress]`。

## 数据库

- 约束：`qms.qa_audit_findings.ck_qa_audit_findings_status_standard`
- 定义：`CHECK (status IS NULL OR status = ANY (ARRAY['open','in_progress','verified','closed'])) NOT VALID`
- 本地 `topems`：已真实应用，`convalidated=false`；应用前 0 行，事务内探针 `bogus` 被 `violates check constraint` 拒绝。
- 参考库：表存在、约束不存在，`status` 仍为 `uncovered`；已登记 `prod-only-status-checks-2026-11-23.json`（第 406 条，`qms` schema）。

## 门禁

- `cargo clippy -p topems-qms --lib --tests -- -D warnings`：通过
- `cargo test -p topems-qms --lib`：266 passed
- `dump-status-code-inventory.mjs`：304 枚举 / 239 值 / 192 不在 DB CHECK / 248 前端键 / 色板缺口 0
- `status-db-check-queue.mjs`：182 枚举 / 192 值
- mappings：290 条；prod-only：406 条
- request-txn / scope-api / txn-2xx / glossary / i18n 7-in-1、前端 `npm run typecheck`：见提交记录

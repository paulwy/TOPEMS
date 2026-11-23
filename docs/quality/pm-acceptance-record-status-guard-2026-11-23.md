# B240 · `pm.acceptance_records.status` 状态守卫（2026-11-23）

## 结论

`pm.acceptance_records.status` 已收敛到唯一 Rust 枚举 `AcceptanceRecordStatus`
（`pending` / `passed` / `failed`，默认 `pending`）；
创建、更新与数据库 CHECK 共用同一值集，非法值与非法流转返回 400，已通过记录禁止修改。

本批同时修复一处生产值集冲突：生产历史约束 `ck_acceptance_records_status_standard`
允许 `active / inactive / archived`，与代码实际写入的 `passed / failed / pending` 完全不相交。
若不替换，生产环境创建验收记录会被旧约束直接拒绝。现用新名
`ck_acceptance_records_result_status_standard` 替换，旧条目保留在 prod-only 清单供回迁对照。

## 修复的真实缺陷

1. **创建接口原样落库**：`CreateAcceptanceRecordRequest.status` 直接绑定到 INSERT，任意字符串可入库；现先严格解析枚举，非法值返回 400。
2. **更新接口原样落库**：`status = COALESCE($1, status)` 未校验，可写任意状态；现先查当前状态，解析后再按流转表校验，写入统一用 `as_db_str()`。
3. **已通过记录可改**：原更新没有终态保护，`passed` 记录仍可改分数、结论、findings；现返回 409「已通过的验收记录不允许修改」，避免验收结论被事后篡改。
4. **生产约束与代码值集冲突**：旧 `ck_acceptance_records_status_standard` 只允许 `active/inactive/archived`，与 `passed/failed/pending` 无交集；本批以候选 SQL 先 DROP 旧约束、再 ADD 新名约束，NOT VALID 保留历史行。

## 生命周期

```text
pending → passed
   ↓
 failed → pending（整改后重新验收）
```

- `passed` 为终态，记录内容不可再改。
- `failed` 可回到 `pending` 重新验收。
- 更新接口允许：`pending→passed/failed`、`failed→pending`；同值放行；其余流转 400。

## 数据库

- 约束：`pm.acceptance_records.ck_acceptance_records_result_status_standard`
- 定义：`CHECK (status IS NULL OR status = ANY (ARRAY['pending','passed','failed'])) NOT VALID`
- 候选 SQL：先 `DROP CONSTRAINT IF EXISTS ck_acceptance_records_status_standard`，再 ADD 新约束。
- 本地 `topems`：旧约束不存在，新约束已真实应用，`convalidated=false`；应用前 0 行。
  - 事务内探针 `status='bogus'`：`violates check constraint "ck_acceptance_records_result_status_standard"`。
  - 事务内探针 `status='passed'`：写入成功后回滚。
- 参考库：表存在、新约束不存在，`status` 仍为 `uncovered`；已登记 `prod-only-status-checks-2026-11-23.json`（第 408 条，`pm` schema）。
- 旧生产约束条目保留（active/inactive/archived），部署时先 DROP 再 ADD，不丢历史证据。

## 门禁

- `cargo fmt --all --check`：通过
- `cargo clippy -p topems-pm --all-targets -- -D warnings`：通过
- `cargo test -p topems-pm --lib`：538 passed
- `dump-status-code-inventory.mjs`：306 枚举 / 239 值 / 192 不在 DB CHECK / 248 前端键 / 色板缺口 0
- `status-db-check-queue.mjs`：183 枚举 / 192 值（`internal_state` 164 / `persisted_unmapped` 14 / `finance_candidate_ready` 14）
- mappings：292 条；prod-only：408 条
- request-txn / scope-api / txn-2xx / glossary / i18n 7-in-1、前端 `npm run typecheck`：见提交记录

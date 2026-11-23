# B243 · `hrm.training_records.completion_status` 状态守卫（2026-11-23）

## 结论

`hrm.training_records.completion_status` 已收敛到唯一 Rust 枚举
`TrainingCompletionStatus`（`in_progress` / `completed` / `failed`，默认 `in_progress`）；
创建、报名、更新、列表过滤与数据库 CHECK 共用同一值集，非法值与非法流转返回 400，
完成接口只允许 `in_progress → completed`。

## 修复的真实缺陷

1. **创建与报名两处硬编码 `'in_progress'`**：`create_record` 与 `enroll_course` 的 INSERT 直接写字面量；现改为绑定 `TrainingCompletionStatus::DEFAULT`，后续调整初始态只需改枚举。
2. **更新接口原样落库**：`completion_status = COALESCE($3, completion_status)` 直接写请求值，任意字符串可入库、`completed` 也可被改回；现先解析枚举、再查当前状态并按流转表校验，非法值/非法流转返回 400。
3. **列表 `status` 过滤是空参数**：OpenAPI 与 `TrainingPaginationParams` 都声明了 `status`，但 `list_records` 的 SQL 从未使用它，前端按完成状态筛选始终返回全量；现把 `status` 解析为枚举并落到 `completion_status` 过滤。
4. **完成接口可从任意非 completed 状态跳入 completed**：原 SQL 只写 `completion_status='completed'`，`failed` 记录可直接“完成”；现先查当前值，只允许 `in_progress`，其余返回 409，并在 SQL 中加 `completion_status='in_progress'` 兜底。

## 生命周期

```text
in_progress → completed（终态）
      ↓
    failed → in_progress（重新培训）
```

- `completed` 为终态，禁止回到 `in_progress` / `failed`。
- 更新接口允许：同值、`in_progress→completed`、`in_progress→failed`、`failed→in_progress`。
- 完成接口只接受 `in_progress`；`failed` 须先通过更新回到 `in_progress`。

## 数据库

- 约束：`hrm.training_records.ck_training_records_completion_status_standard`
- 定义：`CHECK (completion_status IS NULL OR completion_status = ANY (ARRAY['in_progress','completed','failed'])) NOT VALID`
- 本地 `topems`：已真实应用，`convalidated=false`；应用前表内 0 行。
  - 事务内探针 `completion_status='bogus'`：`violates check constraint "ck_training_records_completion_status_standard"`。
  - 事务内探针 `completion_status='in_progress'`：写入成功后回滚。
- 参考库：表存在、约束不存在，`completion_status` 仍为 `uncovered`；已登记 `prod-only-status-checks-2026-11-23.json`（第 411 条，`hrm` schema）。
- `attendance_status` 是另一列（`registered` / `attended`），本批不处理。

## 门禁

- `cargo fmt --all --check`：通过
- `cargo clippy -p topems-hrm --all-targets -- -D warnings`：通过
- `cargo test -p topems-hrm --lib`：308 passed
- `dump-status-checks.mjs --check`：33 CHECK / 5 ENUM / 683 无约束列一致
- `dump-status-code-inventory.mjs --check --strict-palette`：309 枚举 / 248 前端键 / 色板缺口 0
- `status-db-check-queue.mjs --check`：184 枚举 / 192 值分桶一致
- mappings：295 条；prod-only：411 条
- `check-request-txn.mjs`：通过（`bare_txn=1650`，低于基线 1651）
- `check-scope-api.mjs`：未标记调用与 `Db::new` 均未增加
- `check-txn-write-non2xx.py --changed-only`：通过
- `verify-glossary.cjs --strict` 与 `check-i18n.cjs --mode=quality --strict`：`7-in-1 Gate Result: ✅ PASS`
- 前端 `npm run typecheck`：通过

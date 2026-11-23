# B244 · `hrm.training_records.attendance_status` 状态守卫（2026-11-23）

## 结论

`hrm.training_records.attendance_status` 已收敛到唯一 Rust 枚举
`TrainingAttendanceStatus`（`registered` / `attended`，默认 `registered`）；
创建、报名、更新、完成与数据库 CHECK 共用同一值集，非法值与回退流转返回 400，
完成培训时同步写 `attended`，不再产生“已完成但未出勤”的记录。

## 修复的真实缺陷

1. **创建与报名两处硬编码 `'registered'`**：`create_record` 与 `enroll_course` 的 INSERT 直接写字面量；现改为绑定 `TrainingAttendanceStatus::DEFAULT`。
2. **更新接口原样落库**：`attendance_status = COALESCE($2, attendance_status)` 直接写请求值，任意字符串可入库、`attended` 可被改回 `registered`；现与完成状态共用一次状态预读，解析枚举后按流转表校验，非法值/回退流转返回 400。
3. **完成接口不写 `attendance_status`**：原 `/training-records/{id}/complete` 只写 `completion_status='completed'`，出勤仍停留在 `registered`，记录自相矛盾；现同一 UPDATE 内写 `attendance_status='attended'`。
4. **列可空且无默认**：历史 `NULL` 在读路径按默认 `registered` 处理，不会被误判为“记录不存在”。
5. **前端色板缺 `attended`**：状态色板只有 `registered`，`attended` 落回默认色；现补 `attended: success`，色板缺口归零。

## 生命周期

```text
registered → attended（终态）
```

- `attended` 为终态，禁止回到 `registered`。
- 更新接口允许同值与 `registered→attended`；完成接口直接从 `registered`/`NULL` 写入 `attended`。
- 当前代码与前端没有“缺勤”写入路径，故本批不纳入 `absent`；待出现真实业务入口再扩展枚举与 CHECK。

## 数据库

- 约束：`hrm.training_records.ck_training_records_attendance_status_standard`
- 定义：`CHECK (attendance_status IS NULL OR attendance_status = ANY (ARRAY['registered','attended'])) NOT VALID`
- 本地 `topems`：已真实应用，`convalidated=false`；应用前表内 0 行。
  - 事务内探针 `attendance_status='bogus'`：`violates check constraint "ck_training_records_attendance_status_standard"`。
  - 事务内探针 `attendance_status='attended'`：写入成功后回滚。
- 参考库：表存在、约束不存在，`attendance_status` 仍为 `uncovered`；已登记 `prod-only-status-checks-2026-11-23.json`（第 412 条，`hrm` schema）。

## 门禁

- `cargo fmt --all --check`：通过
- `cargo clippy -p topems-hrm --all-targets -- -D warnings`：通过
- `cargo test -p topems-hrm --lib`：310 passed
- `dump-status-checks.mjs --check`：33 CHECK / 5 ENUM / 683 无约束列一致
- `dump-status-code-inventory.mjs --check --strict-palette`：310 枚举 / 249 前端键 / 色板缺口 0
- `status-db-check-queue.mjs --check`：185 枚举 / 193 值分桶一致
- mappings：296 条；prod-only：412 条
- `check-request-txn.mjs`：通过（`bare_txn=1650`，低于基线 1651）
- `check-scope-api.mjs`：未标记调用与 `Db::new` 均未增加
- `check-txn-write-non2xx.py --changed-only`：通过
- `verify-glossary.cjs --strict` 与 `check-i18n.cjs --mode=quality --strict`：`7-in-1 Gate Result: ✅ PASS`
- 前端 `npm run typecheck`：通过

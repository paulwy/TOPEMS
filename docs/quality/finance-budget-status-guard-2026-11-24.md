# B251 · `finance.budgets.status` 状态守卫（2026-11-24，已回迁迁移）

## 结论

`finance.budgets.status` 收敛到唯一 Rust 枚举 `BudgetStatus`
（`active` / `inactive` / `frozen` / `exhausted` / `archived`，默认 `active`）。
DB CHECK、创建入口、更新入口、前端标签/颜色/选项共用同一值集；旧 DB 只允许
`active/inactive/archived`、前端却使用 `frozen/exhausted` 的分裂已消除。

本批把原先「仅本地库 + 候选 SQL」的漂移收口为可复现迁移
`database/migrations/20261124100000_finance_budgets_status_lifecycle.sql`：
参考库 `topems_status_baseline_verify` 已应用，`status-check-catalog.json`
状态 CHECK 33 → 35 条，`finance.budgets.status` 退出 `uncovered`（683 → 682）；
两条 CHECK 均 `convalidated = true`，不再挂 NOT VALID。

## 修复的真实缺陷

1. **DB 与前端值集分裂**：旧 `ck_budgets_status_standard` 只允许
   `active/inactive/archived`；前端预算表单与标签使用
   `active/frozen/exhausted`，`frozen/exhausted` 一写就被旧 CHECK 拒绝。
2. **创建状态硬编码**：`create_budget` 的 INSERT 直接写死 `'active'`，请求里的 `status` 完全不读。
   现先解析 `BudgetStatus`，未传用默认值，非法值 400；新建即 `exhausted` 直接 400。
3. **更新状态缺失时被重置为 active**：`update_budget` 原用
   `req.get("status").unwrap_or("active")` 绑定，任何不带 `status` 的更新都会把原状态改回 `active`。
   现先读当前行状态，未传则保留原值；非法值 400。
4. **前端状态展示不完整**：`getStatusLabels` / `STATUS_COLORS` / 表单选项只覆盖三态；
   已补齐 `inactive`、`archived`，并补 `exhausted` 的全局色板键。
5. **状态没有任何执行力**（本轮补）：`frozen/exhausted` 原来只是标签，占用写入不校验状态。
   现 `used_amount` 上调（新增占用）要求当前状态为 `active`，否则 409。
6. **`archived` 可逆性未定**（本轮定）：归档后只能恢复为 `active`，
   不允许归档直接跳 `frozen/exhausted/inactive`；入口 400。
7. **`exhausted` 与金额漂移**（本轮补）：`exhausted` 是「额度已用完」的派生事实，
   仅靠状态列会与 `remaining_amount` 脱节。现由跨列 CHECK + 入口校验双向兜底。

## 状态语义与迁移矩阵

- 五个值都是运营态，`active / inactive / frozen` 之间可互调；任意态可归档。
- `archived` 只能恢复为 `active`（`BudgetStatus::can_transition`）。
- `frozen` = 暂停占用与执行；`exhausted` = 额度已用完（要求 `remaining_amount <= 0`）。
- 迁移矩阵在代码与入口生效；CHECK 只约束值域与 exhausted↔金额联动（跨态迁移无法用 CHECK 表达）。

## 数据库

- 旧约束 `finance.budgets.ck_budgets_status_standard`（validated，`active/inactive/archived`）
  由迁移按名 `DROP CONSTRAINT IF EXISTS` 清理（本地已 DROP；生产如仍存留由迁移删除）。
- 新约束（`pg_get_constraintdef` 实测）：

  ```text
  ck_budgets_status_lifecycle_standard
    CHECK (((status IS NULL) OR (status::text = ANY (ARRAY['active','inactive','frozen','exhausted','archived'])))
  ck_budgets_exhausted_requires_depleted_budget
    CHECK (((status::text IS DISTINCT FROM 'exhausted') OR (remaining_amount <= 0)))
  ```

  两条均 `convalidated = true`。`status IS NULL` 前缀是 PostgreSQL 对 NOT NULL 列的
  自动归一化产物（手写为 `status::text = ANY(...)`），不是可删除的死分支。
- 旧描述「参考库仍保留旧约束」已纠正：参考库从来没有 `finance.budgets` 的状态 CHECK
  （只有 `budgets_status_not_null`），旧约束只存在于本地/生产手工库。因此
  「先 DROP 旧再 ADD 新」只对存留旧约束的库成立，从基线重建的库直接 ADD。
- 回滚：`database/rollback/20261124100000_finance_budgets_status_lifecycle.rollback.sql`
  以 NOT VALID 加回旧三态约束（存量 frozen/exhausted 不阻断回滚，但回滚后这两类值的新写入会被拒绝）。

事务内探针（本地 `topems`，全部回滚）：

- `status='bogus'` → `violates check constraint "ck_budgets_status_lifecycle_standard"`。
- `status='frozen'` → 写入成功。
- `status='exhausted'` 且 `remaining_amount=100` → `violates check constraint "ck_budgets_exhausted_requires_depleted_budget"`。
- `status='exhausted'` 且 `remaining_amount=0` → 写入成功。
- 存量 286 行全部 `active`、`remaining_amount=0`，两条约束 VALIDATE 均通过。

## 代码

- `svc/finance/src/modules/budget_status.rs`：`can_transition` / `can_transition_from` /
  `is_spendable` / `check_update` / `UpdateViolation`（409 占用冲突、400 语义拒绝）；
  删除恒真、恒假的 `is_terminal`。
- `svc/finance/src/modules/operational.rs`：`create_budget` 严格解析状态并拒绝新建 `exhausted`；
  `update_budget` 一次查询带出 `status + used_amount`，经 `check_update` 统一守卫。
- **DB↔Rust 漂移门禁**：`migration_check_values_match_db_values` 用 `include_str!`
  读取迁移文件，解析 `ARRAY[...]` 值集并断言等于 `BudgetStatus::DB_VALUES`，
  同时断言 exhausted 联动约束存在。迁移改值集而未改枚举（或反之）即失败。

## 门禁

- `cargo fmt --all --check`：PASS
- `cargo clippy -p topems-finance --all-targets -- -D warnings`：PASS
- `cargo test -p topems-finance --lib`：1129 passed / 0 failed / 1 ignored
- status-catalog（`node scripts/ci/dump-status-checks.mjs --check --dsn postgresql:///topems_status_baseline_verify`）：
  PASS，35 CHECK / 5 ENUM / 682 无约束列
  - 注：不带 `--dsn` 时按 `.env` 的本地 `topems` 全量比对会失败，原因是本地库保有大量
    prod-only 约束（目录口径为「基线 + 前向迁移」），属既有设计，非本批引入。
- gen-finance-status：PASS（5 个 DB ENUM 一致）
- inventory：PASS（315 枚举 / 251 前端键，色板缺口 0）
- status-queue：PASS（186 枚举 / 193 值分桶一致）
- check-destructive-sql：PASS（新增文件 0 条新增破坏性语句）
- `scripts/migration/validate.sh`：0 errors / 0 checksum errors（856 文件）
- `scripts/migration/gen-manifest.sh --check`：PASS（registered 249 / disk 842 / 无漂移）

## 口径变更

- `docs/database/prod-only-status-checks-2026-11-23.json`：移除 B251 条目（参考库已可复现），
  `finance` 计数 42 → 41；清单「回迁一条删一条」首次对本批生效。
- 候选 SQL `docs/database/finance-budget-status-check-candidates-2026-11-24.sql` 转为存档件，
  以迁移为唯一权威。

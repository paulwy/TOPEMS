# B247 · `ehs.qa_ehs_environment_monitors.status` 状态守卫（2026-11-23）

## 结论

`ehs.qa_ehs_environment_monitors.status` 已收敛到唯一 Rust 枚举 `EnvironmentMonitorStatus`
（`active` / `inactive` / `maintenance` / `archived`，默认 `active`）；
创建、更新、前端类型与数据库 CHECK 共用同一值集，非法值返回 400，
旧约束只允许 `active/inactive/archived`、前端契约却使用 `maintenance` 的分裂已消除。

## 修复的真实缺陷

1. **DB 与前端值集分裂**：既有 `ck_qa_ehs_environment_monitors_status_standard` 只允许
   `active/inactive/archived`，前端 `EnvironmentMonitor.status` 契约为
   `active/inactive/maintenance`。现统一为四态并替换旧约束。
2. **创建状态硬编码 `"active"`**：改为绑定 `EnvironmentMonitorStatus::DEFAULT`；显式状态先严格解析，非法值 400。
3. **更新接口原样落库**：`status = COALESCE($4, status)` 接受任意字符串，非法值只会在 DB 层报 500；
   现先解析枚举，非法值 400。
4. **更新响应状态失真**：未传 `status` 时响应固定回 `active`，与库内实际状态（如 `inactive`）不一致；
   现从更新前预读行取当前状态，未传状态时回显真实值。
5. **前端类型缺 `archived`**：`EnvironmentMonitor`、创建与更新请求三处联合类型补齐四态。

## 状态语义

- 四个值都是运营态，允许互相调整（启用、停用、维护、归档），没有不可逆终态。
- `maintenance` 表示暂停采集待恢复，不改变监测点档案。

## 数据库

- 旧约束：`ehs.qa_ehs_environment_monitors.ck_qa_ehs_environment_monitors_status_standard`（validated，`active/inactive/archived`）已在本地 DROP。
- 新约束：`ehs.qa_ehs_environment_monitors.ck_qa_ehs_environment_monitors_status_lifecycle_standard`
- 定义：`CHECK (status IS NULL OR status = ANY (ARRAY['active','inactive','maintenance','archived'])) NOT VALID`
- 本地 `topems`：已真实应用，`convalidated=false`；应用前 416 行，全部 `active`，合法。
  - 事务内探针 `status='bogus'`：`violates check constraint "ck_qa_ehs_environment_monitors_status_lifecycle_standard"`。
  - 事务内探针 `status='maintenance'`：写入成功后回滚。
- 参考库仍保留旧约束，新约束不存在；已登记 `prod-only-status-checks-2026-11-23.json`（第 415 条，`ehs` schema）。
- 部署时必须先 DROP 旧约束再 ADD 新约束，否则 `maintenance` 仍会被旧 CHECK 拒绝。

## 门禁

- `cargo fmt --all --check`
- `cargo clippy -p topems-ehs --all-targets -- -D warnings`
- `cargo test -p topems-ehs --lib`
- `dump-status-checks.mjs --check`
- `dump-status-code-inventory.mjs --check --strict-palette`
- `status-db-check-queue.mjs --check`
- mappings / prod-only
- request-txn / scope-api / txn-2xx、glossary、i18n 7-in-1、前端 `typecheck`、OpenAPI、web smoke

结果（2026-11-23 本地实测）：

- `cargo fmt --all --check`：PASS
- `cargo clippy -p topems-ehs --all-targets -- -D warnings`：PASS
- `cargo test -p topems-ehs --lib`：261 passed / 0 failed
- `check-request-txn.mjs`：PASS（rd 163→162 可核销）
- `check-scope-api.mjs`：OK，未标记调用与 Db::new 未增加
- `check-txn-write-non2xx.py --changed-only`：OK
- `dump-status-checks.mjs --check`：33 CHECK / 5 ENUM / 683 无约束列
- `dump-status-code-inventory.mjs --check --strict-palette`：313 枚举 / 250 前端键，色板缺口 0
- `status-db-check-queue.mjs --check`：186 枚举 / 194 值分桶一致
- `verify-glossary.cjs --strict`：PASS
- `check-i18n.cjs --mode=quality --strict`：7-in-1 PASS
- `check-openapi-coverage.cjs`：PASS
- `apps/web npm run typecheck`：PASS

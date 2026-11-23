# B249 · `wms.warehouses.status` 状态守卫（2026-11-24）

## 结论

`wms.warehouses.status` 已收敛到唯一 Rust 枚举 `WarehouseStatus`
（`active` / `inactive` / `maintenance` / `archived`，默认 `active`）；
数据库 CHECK、后端枚举、前端选项三者共用同一值集。
修补了 DB 仅允许 `archived`、代码/前端只认 `maintenance` 的分裂，以及创建请求 `status` 被静默丢弃的问题。

## 修复的真实缺陷

1. **DB 与代码/前端值集分裂**：既有 `ck_warehouses_status_standard` 只允许
   `active/inactive/archived`，后端 `WarehouseStatus` 与前端选项却是
   `active/inactive/maintenance`；`archived` 写不进、`maintenance` 被旧 CHECK 拒绝。
   现统一为四态并替换旧约束。
2. **创建请求 `status` 被静默忽略**：`CreateWarehouseRequest` 没有 `status` 字段，
   前端即使提交 `maintenance`，serde 丢弃后仍以 `active` 落库。
   现补字段并解析枚举，非法值 400，未传仍默认 `active`。
3. **前端创建契约缺 `status`**：`CreateWarehouseRequest` 类型补齐可选 `status`；
   表单状态选项补 `archived`，避免列表能显示、编辑却无法选择。
4. 更新入口原本已严格解析枚举，本批将 `WarehouseStatus` 扩到四态后自动覆盖 `archived`。

## 状态语义

- 四个值都是运营态，允许互相调整（启用、停用、维护、归档），没有不可逆终态。
- `maintenance` 表示仓库暂停作业待恢复；`archived` 表示只读保留。

## 数据库

- 旧约束：`wms.warehouses.ck_warehouses_status_standard`（validated，`active/inactive/archived`）已在本地 DROP。
- 新约束：`wms.warehouses.ck_warehouses_status_lifecycle_standard`
- 定义：`CHECK (status IS NULL OR status = ANY (ARRAY['active','inactive','maintenance','archived'])) NOT VALID`
- 本地 `topems`：已真实应用，`convalidated=false`；应用前仓库行状态均为合法运营态。
  - 事务内探针 `status='bogus'`：`violates check constraint "ck_warehouses_status_lifecycle_standard"`。
  - 事务内探针 `status='archived'`：写入成功后回滚。
- 参考库仍保留旧约束，新约束不存在；已登记 `prod-only-status-checks-2026-11-23.json`（第 416 条，`wms` schema）。
- 部署时必须先 DROP 旧约束再 ADD 新约束，否则 `maintenance` 仍会被旧 CHECK 拒绝。

## 门禁

结果（2026-11-24 本地实测）：

- `cargo fmt --all --check`：PASS
- `cargo clippy -p topems-wms --all-targets -- -D warnings`：PASS
- `cargo test -p topems-wms --lib`：595 passed / 0 failed
- `check-request-txn.mjs`、`check-scope-api.mjs`、`check-txn-write-non2xx.py`：PASS
- `dump-status-checks.mjs --check`：33 CHECK / 5 ENUM / 683 无约束列
- `dump-status-code-inventory.mjs --check --strict-palette`：313 枚举 / 250 前端键，色板缺口 0
- `status-db-check-queue.mjs --check`：186 枚举 / 194 值分桶一致
- glossary、i18n 7-in-1、OpenAPI、前端 typecheck：PASS

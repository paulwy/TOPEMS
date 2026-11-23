# B248 · `scm.suppliers.status` 更新入口守卫（2026-11-23）

## 结论

`scm.suppliers.status` 的更新入口已从“任意字符串原样落库”收敛到 `SupplierStatus`
（`active` / `inactive` / `pending`），非法值返回 400，不再依赖数据库 CHECK 抛 23514 后变成 500。

## 修复的真实缺陷

- `update_supplier` 直接执行 `req.status.unwrap_or(existing.status)` 并绑定到 `status = $10`：
  请求可传 `bogus`、`active ` 等任意字符串，绕过枚举；数据库虽有
  `ck_suppliers_status_standard`，但错误会被统一成“供应商更新失败”500，前端无法区分参数错误。
- 现更新前先 `SupplierStatus::normalize`：空值/未传保留原状态，合法值归一为小写标准值，未知值 400。
- `SupplierStatus` 补 `normalize` 与单测，创建仍绑定 `DEFAULT`，列表过滤原本已严格解析，保持一致。

## 数据库

- `scm.suppliers.status` 已有 `ck_suppliers_status_standard`（`active/inactive/pending`，`NOT VALID`），本批不新增 DDL、不改值集。
- 本地 201 行全部 `active`，合法。

## 门禁

- `cargo fmt --all --check`：PASS
- `cargo clippy -p topems-scm --all-targets -- -D warnings`：PASS
- `cargo test -p topems-scm --lib`：371 passed / 0 failed
- request-txn / scope-api / txn-2xx：PASS
- status-catalog：33 CHECK / 5 ENUM / 683 无约束列
- inventory：313 枚举 / 250 前端键，色板缺口 0
- queue：186 枚举 / 194 值分桶一致
- glossary / i18n 7-in-1 / OpenAPI：PASS
- 前端 typecheck：PASS

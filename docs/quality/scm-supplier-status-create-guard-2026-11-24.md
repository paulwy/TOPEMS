# B250 · `scm.suppliers.status` 创建入口补齐（2026-11-24）

## 结论

`CreateSupplierRequest` 已补 `status` 字段并接入 `SupplierStatus`：
未传仍默认 `active`，合法值按枚举归一，非法值 400。
此前前端表单可选 `inactive/pending`，但后端 DTO 没有该字段，serde 静默丢弃，创建结果恒为 `active`。

## 修复的真实缺陷

- `create_supplier` 的 INSERT 固定绑定 `SupplierStatus::DEFAULT`，请求体 `status` 完全不被读取：
  用户选择“待审核/停用”创建后，供应商仍落成“启用”，前后端契约失真。
- `CreateSupplierRequest` 补 `status: Option<String>`；handler 先 `SupplierStatus::normalize`，
  未传用默认值，合法值归一为小写标准值，未知值返回 400。
- 前端 `CreateSupplierRequest` 类型补可选 `status`，与表单状态选项一致。

## 数据库

- 沿用既有 `ck_suppliers_status_standard`（`active/inactive/pending`，`NOT VALID`），本批不新增 DDL。
- 本地 201 行全部 `active`，合法。

## 门禁

- `cargo fmt --all --check`：PASS
- `cargo clippy -p topems-scm --all-targets -- -D warnings`：PASS
- `cargo test -p topems-scm --lib`：371 passed / 0 failed
- request-txn / scope-api / txn-2xx：PASS
- status-catalog：33 CHECK / 5 ENUM / 683 无约束列
- inventory：313 枚举 / 250 前端键，色板缺口 0
- queue：186 枚举 / 194 值分桶一致
- glossary、i18n 7-in-1、OpenAPI、前端 typecheck：PASS

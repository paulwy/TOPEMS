# B163 · 供应商主数据状态（2026-11-23）

## 枚举
- `svc/master-data/src/modules/supplier_status.rs` → `SupplierStatus`：`active / inactive / pending / blacklisted`，默认 `active`。
  - 包含 `pending` 是因为 SCM 来源事件会 upsert 到 `master_data.mdm_suppliers`，其前端值集含 `pending`；MDM 约束不能把合法上游值挡掉。
- `svc/scm/src/modules/supplier_status.rs` → `SupplierStatus`：`active / inactive / pending`，默认 `active`，对齐 `apps/web/src/schemas/scm/supplier.ts`。
- MDM 前端 `apps/web/src/schemas/erp/supplier.ts` 的 `active / inactive / blacklisted` 全部包含在 MDM 值集内。

均提供 `DB_VALUES / DEFAULT / as_db_str / from_db_str / 单测`。

## 代码收口
- 主数据 `supplier_master.rs`：创建 `status` 缺省取枚举默认值，非法值返回校验错误；更新 `status` 先枚举解析，非法值返回校验错误；列表 `status` 支持空/`all` 视为不过滤，其余非法值拒绝，SQL 只绑定规范值。
- SCM `supplier.rs`：创建时硬编码 `'active'` 改为绑定 `SupplierStatus::DEFAULT`，SQL 占位符同步重排；列表 `status` 同样做枚举校验并只绑定规范值。

## 本地 DB 应用
文件：`docs/database/supplier-status-check-candidates-2026-11-23.sql`，两个约束均 `NOT VALID`：

- `master_data.mdm_suppliers.status` → `ck_mdm_suppliers_status_standard`（active/inactive/pending/blacklisted）
- `scm.suppliers.status` → `ck_suppliers_status_standard`（active/inactive/pending）

存量：`mdm_suppliers` 292 行全 `active`；`scm.suppliers` 201 行全 `active`，均在集合内。两表各执行一次 `'bogus'` UPDATE，均被对应标准约束拦截。

## 刷新结果
- catalog：**340 条状态 CHECK / 5 个 PG ENUM / 382 个无约束状态列**
- 盘点：**225 个 Rust 枚举 / 203 个值 / 59 个不在 DB CHECK / 214 个前端键 / 色板缺口 0**
- 缺口队列：**45 个枚举 / 59 个值，全部 `internal_state`**
- 前端键不在 DB CHECK：**70**
- 映射：共 **196 条**

## 门禁
- `cargo clippy -p topems-master-data -p topems-scm --all-targets -- -D warnings`：PASS
- `cargo test -p topems-master-data --lib`：466 passed / 0 failed
- `cargo test -p topems-scm --lib`：345 passed / 0 failed
- catalog / inventory / queue 的 `--check`：PASS

## 边界
候选只应用到本地 `topems`；生产快照只读，未应用。生产发布需执行候选并按窗口 `VALIDATE`。

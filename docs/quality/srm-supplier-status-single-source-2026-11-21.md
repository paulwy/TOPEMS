# B61 · srm.suppliers 状态单一源（2026-11-21）

## 现状（改动前）
- `srm.suppliers.status`：本地 97 行全 `active`；列非空，DB 默认 `'active'`，本地无 CHECK。
- 创建把 `req.status` 原样写入，更新 `req.status.unwrap_or(existing.status)`，列表 `?status=` 自由文本；任意字符串都能落库。
- 删除接口写死 `status = 'deleted'`，但 `database/init/04_create_scm_wms_srm_tables.sql` 的 `ck_suppliers_status_standard` 只允许 `active/inactive/archived`；生产若已建出该约束，删除供应商会直接 23514。
- `shared-core::SupplierStatus` 还定义了 `pending`、`blacklisted`，与 init 约束同样不一致。

## 改动
1. 新增 `svc/srm/src/modules/supplier_record_status.rs`：`SupplierRecordStatus` 六态（active/inactive/pending/blacklisted/archived/deleted，DEFAULT active，`archived` 为旧约束遗留），严格解析 + 单测。
2. `supplier.rs`：
   - 创建状态严格解析，未知值 400，写入枚举值；
   - 更新（显式传 status）严格解析，未知值 400；未传保留原值；
   - 列表状态筛选严格解析，未知值 400；
   - 删除接口不再写死 `'deleted'` 字面量，改绑枚举。
3. `database/init/04_create_scm_wms_srm_tables.sql`：约束补齐 pending/blacklisted/deleted，与代码真实写入集合对齐。
4. 候选 DDL `docs/database/srm-supplier-status-check-candidates-2026-11-21.sql`：六值 CHECK，`NOT VALID`；已库先 `DROP CONSTRAINT IF EXISTS` 旧约束。

## 验证
- `cargo check -p topems-srm`、`cargo clippy -p topems-srm --all-targets -- -D warnings`、`cargo fmt --all` 干净。
- `cargo test -p topems-srm --lib supplier_record_status`：1 passed。
- 本地演练（事务内 ROLLBACK，残留 0）：六值各插入 1 行；active→pending→blacklisted→archived→deleted 各 `UPDATE 1`；`bogus` 插入 → 23514。

## 残留
- 生产若已有旧的三值约束，必须先执行候选 DDL，否则删除供应商会失败；这是本次发现的结构性缺陷。
- 删除只改 `status='deleted'`，不写 `deleted_at`；列表与 COUNT 都没有过滤 `deleted_at`/deleted，已删除供应商仍会出现在列表。
- 没有独立的状态动作端点，编辑接口允许六态任意互转，不校验准入/黑名单流转。
- 候选 CHECK 未进 `database/migrations/`、未在生产执行。

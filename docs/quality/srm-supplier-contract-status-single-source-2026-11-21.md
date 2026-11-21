# B60 · srm.supplier_contracts 状态单一源（2026-11-21）

## 现状（改动前）
- `srm.supplier_contracts.status`：本地 0 行；列非空，DB 默认 `'draft'`。
- `database/init/04_create_scm_wms_srm_tables.sql` 里的 `ck_supplier_contracts_status_standard` 只允许 `active/inactive/archived`，与默认 `'draft'` 自相矛盾；本地表实际没有这个约束，生产若已建出，则走默认值的创建会直接 23514。
- 创建接口把 `req.status` 原样写入，更新接口 `req.status.unwrap_or(existing.status)`，列表 `?status=` 自由文本；任意字符串都能落库。
- 列表 SELECT 缺少 `deleted_at IS NULL`，与 COUNT 口径不一致。

## 改动
1. 新增 `svc/srm/src/modules/supplier_contract_status.rs`：`SupplierContractStatus`（draft/active/inactive/archived，DEFAULT draft，`DB_VALUES`）+ 严格解析 + 单测。
2. `supplier_contract.rs`：
   - 创建状态严格解析，未知值 400，写入枚举值；
   - 更新（编辑时显式传 status）严格解析，未知值 400；未传则保留原值；
   - 列表状态筛选严格解析，未知值 400，并补 `deleted_at IS NULL`。
3. `database/init/04_create_scm_wms_srm_tables.sql`：约束补 `draft`，与列默认对齐。
4. 候选 DDL `docs/database/srm-supplier-contract-status-check-candidates-2026-11-21.sql`：四值 CHECK，`NOT VALID`；已库先 `DROP CONSTRAINT IF EXISTS` 旧约束。

## 验证
- `cargo check -p topems-srm`、`cargo clippy -p topems-srm --all-targets -- -D warnings`、`cargo fmt --all` 干净。
- `cargo test -p topems-srm --lib supplier_contract_status`：1 passed。
- 本地演练（事务内 ROLLBACK，残留 0）：四值各插入 1 行；draft→active、active→inactive、inactive→archived 各 `UPDATE 1`；`bogus` 插入 → 23514。

## 残留
- 生产若已有旧的三值约束，必须先执行候选 DDL（窗口 + `VALIDATE CONSTRAINT`），否则创建 draft 会失败；这是本次发现的结构性缺陷。
- 没有独立的状态动作端点，编辑接口允许四态任意互转，不校验流转合法性。
- 合同唯一性 `contract_no` 不受 `deleted_at` 约束，软删后无法复用同一编号。
- 候选 CHECK 未进 `database/migrations/`、未在生产执行。

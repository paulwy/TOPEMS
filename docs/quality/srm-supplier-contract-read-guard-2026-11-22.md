# SRM 供应商与合同读取集合收口（B94）

日期：2026-11-22
范围：`srm.suppliers`、`srm.supplier_contracts` 的列表/详情/编辑读取。

## 问题

- `srm.suppliers`：列表与总数有严格 `status` 参数解析，但没有 `status IN (...)`；详情、更新前读取、更新 SQL 也仅按 `id/tenant_id`，集合外状态行可被读取与修改。
- `srm.supplier_contracts`：列表/总数同样只有参数解析，详情与更新未加状态过滤。
- 合同更新使用 `fetch_one`，一旦按状态过滤或无匹配行会退化为 500，而不是 404。

## 方案

- 供应商：列表、总数、详情、更新前读取、更新 SQL 统一加六值过滤 `active/inactive/pending/blacklisted/archived/deleted`；`deleted` 仍作为可读状态保留，`deleted_at` 语义不变。
- 供应商更新由 `fetch_one` 改 `fetch_optional`：无匹配行返回 404，数据库错误仍 500。
- 合同：列表、总数、详情、更新统一加四值过滤 `draft/active/inactive/archived`；更新由 `fetch_one` 改 `fetch_optional`，无匹配行 404。
- 创建与更新参数解析、供应商删除写入未放宽。

## 验证

- `cargo check -p topems-srm`：通过。
- `cargo clippy -p topems-srm --all-targets -- -D warnings`：通过。
- `cargo test -p topems-srm --lib supplier`：232 passed。
- 本地 `srm.suppliers` 93 行有效：事务内插入 1 行 `bogus` 后全表 94、六值过滤 93；对脏值执行带过滤更新为 `UPDATE 0`；`ROLLBACK` 后无残留。
- 本地 `srm.supplier_contracts` 0 行，无存量脏值。
- 状态盘点/队列：172 枚举、181 前端键、色板缺口 0；118 枚举 / 127 值分桶一致。
- 候选约束仍为 `docs/database/srm-supplier-contract-status-check-candidates-2026-11-21.sql` 等既有 `NOT VALID` 文件，未进迁移、未在生产执行。

# B46 · srm.quotations 状态单一源（2026-11-21）

## 现状（改动前）
- `srm.quotations`：本地 0 行；列默认 `'draft'`，但创建入口写 `'pending'`，默认值从未被代码使用。
- 状态全部是 SQL 字面量：创建 `'pending'`、中标 `'awarded'`、拒绝 `'rejected'`，修改/中标/拒绝用 `status = 'pending'` 谓词。
- 删除接口没有任何状态谓词，已中标/已拒绝的报价也可以被软删。
- 0 行数据下问题不会立刻暴露，但一旦有真实报价，默认值与接口、终态保护都会漂移。

## 改动
1. 新增 `svc/srm/src/modules/quotation_status.rs`：`QuotationStatus`（pending/awarded/rejected，`DEFAULT = Pending`，`pending_from = [pending]`），严格解析 + 2 单测。
2. `quotation.rs`：创建绑定 `DEFAULT`；中标/拒绝目标态改绑枚举、`updated_at` 参数后移、起始谓词改 `status = ANY([pending])`；修改 SQL 谓词同样改 `ANY`；删除补 pending 谓词，终态不可删。
3. 候选 DDL `docs/database/srm-quotation-status-check-candidates-2026-11-21.sql`：列默认 `draft → pending` + `quotations_status_check`（三值，`NOT VALID`）。

## 验证
- `cargo check -p topems-srm`、`cargo clippy -p topems-srm --all-targets -- -D warnings`、`cargo fmt --all` 干净。
- `cargo test -p topems-srm --lib quotation_status`：3 passed（含模块内 2 个 + 既有 1 个匹配）。
- 本地演练（事务内 ROLLBACK，残留 0）：insert pending → awarded `UPDATE 1`；`awarded → 'draft'` → 23514；回滚后行 0、约束 0。
- 盘点：枚举 155→156、值 163（pending/awarded/rejected 已存在）、不在 DB CHECK 124、色板缺口 0；队列 111→112 枚举；映射 90→91。

## 残留
- 0 行数据，候选 DDL 无法用存量验证；上线前需在实际询价/报价流程里跑一次 pending → awarded/rejected。
- 列表没有状态过滤参数，本批未新增；若要按状态筛选，需同时扩展 `ListQuotationParams` 与两段查询。
- 候选 CHECK 未进 `database/migrations/`、未在生产执行。

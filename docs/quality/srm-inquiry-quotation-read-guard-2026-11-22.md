# SRM 询价与报价读取集合收口（B93）

日期：2026-11-22
范围：`srm.inquiries`、`srm.quotations` 的列表/详情/编辑读取。

## 问题

- `srm.inquiries`：列表 `status` 参数与创建/编辑写入已严格解析，但列表、总数、详情、编辑 SQL 都没有 `status IN (...)`，集合外历史值仍会出现在列表或可被详情读取/编辑。
- `srm.quotations`：列表（带 `inquiry_id` 与不带）和详情同样未加状态过滤；写入口已有 `pending` 谓词。

## 方案

- 询价：列表、总数、详情、编辑统一加六值过滤 `draft/published/in_progress/closed/awarded/cancelled`；编辑集合外行返回 404。创建/编辑参数解析与 publish/close 流转未放宽。
- 报价：列表两条 SQL 与详情统一加三值过滤 `pending/awarded/rejected`；中标/拒绝/编辑/删除既有 `pending` 谓词未放宽。
- 集合外历史行统一按不可见处理，不再混入分页、统计或详情。

## 验证

- `cargo check -p topems-srm`：通过。
- `cargo clippy -p topems-srm --all-targets -- -D warnings`：通过。
- `cargo test -p topems-srm --lib inquiry`：2 passed；`--lib quotation`：17 passed。
- 本地 `srm.inquiries` 273 行全为 `draft`：事务内插入 1 行 `bogus` 后全表 274、六值过滤 273；对 `bogus` 行执行带过滤更新为 `UPDATE 0`；`ROLLBACK` 后无残留。
- 本地 `srm.quotations` 0 行，无存量脏值。
- 状态盘点/队列：172 枚举、181 前端键、色板缺口 0；118 枚举 / 127 值分桶一致。
- 候选约束未进迁移：`docs/database/srm-inquiry-status-check-candidates-2026-11-21.sql`、`docs/database/srm-quotation-status-check-candidates-2026-11-21.sql`，均保持 `NOT VALID`。

# SRM 招标状态读取收口（B92）

日期：2026-11-22
范围：`srm.biddings` 的列表、总数、详情、编辑入口。

## 问题

`BiddingStatus` 五值集合 `draft/published/opened/evaluated/awarded` 已用于创建与发布/开标/评标/定标流转，但读取侧仍有缺口：

- 列表 `status` 参数已严格解析，但列表与总数 SQL 没有 `status IN (...)`，集合外历史值会混入结果。
- 详情按 `id` 直读，集合外状态同样可见。
- 编辑只按 `id` 更新，集合外状态行仍可被修改。

## 方案

- 列表 SQL、总数 SQL 统一加 `status IN ('draft','published','opened','evaluated','awarded')`；过滤参数继续绑定规范值。
- 详情 SQL 加同一过滤，集合外行返回 404。
- 编辑 SQL 的 `WHERE` 加同一过滤，集合外行不可修改，返回 404。
- 写入初始态与四条流转谓词未放宽。

## 验证

- `cargo check -p topems-srm`：通过。
- `cargo clippy -p topems-srm --all-targets -- -D warnings`：通过。
- `cargo test -p topems-srm --lib bidding`：32 passed。
- 本地 `srm.biddings` 为空，事务内模拟 2 行（`draft` + `bogus`）：全表 2、五值过滤后 1；对 `bogus` 行执行带过滤的 `UPDATE` 为 `UPDATE 0`；`ROLLBACK` 后模拟行 0。
- 状态盘点/队列：172 枚举、181 前端键、色板缺口 0；118 枚举 / 127 值分桶一致。
- 候选约束仍为 `docs/database/srm-bidding-status-check-candidates-2026-11-21.sql` 的五值 `NOT VALID` 版本，未进迁移、未在生产执行。

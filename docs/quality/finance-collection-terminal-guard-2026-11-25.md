# B308 Finance 收款记录终态与软删守卫（2026-11-25）

## 结论

`finance.erp_collection_records` 本地 553 行，status 全部 `pending`。

update 的状态白名单只允许 `pending/confirmed`，但没有先读当前态：

- 已 `confirmed` 或 `written_off` 的收款记录仍可通过通用 update 改客户、金额，甚至把 `written_off` 直接改回 `pending/confirmed`，绕过核销终态。
- update/delete 的 WHERE 均无 `deleted_at IS NULL`；delete 重复执行仍会命中已软删行并返回成功。
- update 无当前态并发谓词，预读后并发确认/核销会被覆盖。

## 代码改动

- `CollectionStatus` 新增 `EDITABLE = ["pending"]`、`DELETABLE = ["pending"]` 与 `is_editable/is_deletable`：
  - `confirmed`：已形成实际收款，字段与金额封闭；
  - `written_off`：已核销，终态封闭。
- update：
  - 预读未删除当前态（NULL 归一 `pending`）：缺失 404、非法状态 400、`confirmed/written_off` 拒绝编辑；
  - UPDATE 增加 `deleted_at IS NULL AND COALESCE(status,'pending') = $6`，并发状态变化不再覆盖，0 行返回“状态已变化”。
  - `pending → confirmed` 仍由通用 update 完成（当前代码库没有独立 confirm 接口）。
- delete：
  - 预读未删除当前态：缺失 404、非 `pending` 拒绝；
  - UPDATE 增加 `deleted_at IS NULL AND COALESCE(status,'pending') = $3`，0 行返回“状态已变化或已删除”，重复删除不再假成功。

## 数据库

无 DDL。本地 553 行全 `pending`，编辑/删除行为保持不变；`confirmed/written_off` 拒绝路径待后续数据触发。

## 验证

- `cargo fmt -p topems-finance`、`cargo check -p topems-finance` PASS。
- `cargo test -p topems-finance --lib collection` 7 passed（新增 `terminal_sets_are_strict`）。

## 遗留

核销接口 `write_off_collection` 已有来源态谓词，保持不动；`rejected/confirmed` 的财务回写仍由核销流程负责，本批只封闭通用编辑与删除。

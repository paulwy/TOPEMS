# B315 Finance 应收/应付生命周期守卫（2026-11-25）

## 结论

`finance.receivables`、`finance.payables` 本地均 0 行；实际路由走 `operational.rs`，状态口径为 `draft/approved/posted/cancelled`。

- update 接受任意合法状态值，不先读当前态，也没有并发谓词：`posted` 可回退 `draft/approved`，`draft` 可跳 `posted`。
- update/delete 的 WHERE 只有 `id + tenant_id`，没有 `deleted_at IS NULL`；重复删除已软删记录仍会命中并假成功。
- delete 无状态限制：`posted` 已进入总账的应收/应付可直接软删。

## 代码改动

- `ReceivablePayableStatus` 新增：
  - `can_transition_to`：`draft → approved/cancelled`、`approved → posted/cancelled`；`posted/cancelled` 终态，同态幂等。
  - `can_delete`：仅 `draft/cancelled` 可删；`approved` 需先取消或过账，`posted` 保留台账。
- 应收/应付 update：
  - 预读未删除当前态（缺失 404、脏值 409），校验目标迁移，非法迁移 409；
  - UPDATE 增加 `COALESCE(status,'pending') = $12 AND deleted_at IS NULL`，0 行报并发修改。
- 应收/应付 delete：
  - 预读并只允许 `draft/cancelled`；
  - UPDATE 增加 `COALESCE(status,'pending') = $3 AND deleted_at IS NULL`，0 行报状态变化，不再假成功。

## 数据库

无 DDL。两表本地 0 行，行为由单测覆盖；不改变表结构。

## 验证

- `cargo fmt -p topems-finance`、`cargo check -p topems-finance` PASS。
- `cargo test -p topems-finance --lib receivable_payable_status` 6 passed（新增迁移矩阵与删除集合 2 项）。

## 遗留

历史别名 `unpaid/pending` 在读取时归一为 `draft`，写入口只输出 canonical 值；DB 侧仍无 CHECK 约束，待生产窗口补。

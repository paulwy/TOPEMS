# B319 Finance 费用审批租户收敛（2026-11-25）

## 结论

`finance.expense_approvals` 本地 178 行全部 `pending`，`tenant_id` 均为 `00000000-0000-0000-0000-000000000001`。

状态迁移本身已有保护：

- update 预读当前态，限制可编辑态与目标迁移，SQL 有 `status = ANY(...) AND status = 当前态`。
- submit/approve/reject 以 `from_status` 为谓词，重复操作返回 409。
- delete 只允许 `DELETABLE` 集合。

但这四个写入口都只依赖 RLS 事务，没有显式租户条件：

- update 当前态查询与 UPDATE 均未带 `tenant_id`。
- submit/approve/reject 的 UPDATE 未带 `tenant_id`。
- delete 的 UPDATE 未带 `tenant_id`，0 行仍报 404。

## 代码改动

- 所有入口从 claims 取租户；nil 租户直接 400“缺少租户上下文”。
- update：当前态查询与 UPDATE 均增加 `tenant_id = $16::uuid`。
- submit/approve/reject：`transition_expense_approval` 增加 `claims` 参数，UPDATE 增加 `tenant_id = $6::uuid`。
- delete：UPDATE 增加 `tenant_id = $3::uuid`；0 行由 404 改为 409“不存在、已删除或状态不允许删除”。

## 数据库

无 DDL。178 行均有合法租户，按显式租户过滤后仍全部可见；本批不修改数据。

## 验证

- `cargo fmt -p topems-finance`、`cargo check -p topems-finance` PASS。
- `cargo test -p topems-finance expense_status` 6 passed。

## 遗留

状态迁移矩阵未变；本批只补租户隔离与 0 行语义。

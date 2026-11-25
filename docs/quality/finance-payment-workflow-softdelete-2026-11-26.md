# Finance 付款单工作流与凭证生成软删守卫（B330）

日期：2026-11-26

## 背景

`finance.core_finance_payments` 本地 1 行，状态 `completed`，当前无软删记录。

B310 已给付款单编辑/删除补上 `deleted_at IS NULL`，但付款单工作流和凭证生成仍有五个写路径只按 `tenant_id + id` 定位：

- `submit_payment_workflow`：`draft -> pending`；
- `approve_payment_workflow`：`pending -> processing`；
- `reject_payment_workflow`：`pending -> failed`；
- `execute_payment`：`processing -> completed`；
- 凭证生成：按 `status='approved' AND voucher_id IS NULL` 选源付款单，以及随后把 `voucher_id` 回写付款单。

软删后的付款单只要状态还停在对应起始态，仍可被提交、审批、拒绝、执行，或继续生成凭证；凭证生成回写失败时还会静默吞掉，产生“凭证已建但付款单未关联”的半成品。

## 改动

`svc/finance/src/services/finance/payment_workflow.rs`：

- 四个状态 UPDATE 统一补 `AND deleted_at IS NULL`；
- 原有起始态集合、目标态、0 行冲突返回与事务提交不变。

`svc/finance/src/services/finance/voucher_generation.rs`：

- 源付款单查询补 `deleted_at IS NULL`；
- `voucher_id` 回写补 `deleted_at IS NULL`，并检查 `rows_affected`；
- 回写 0 行或数据库错误时删除刚生成的无关联凭证、计入失败并写入错误列表，不再静默吞掉。

## 验证

- `cargo fmt -p topems-finance`
- `cargo check -p topems-finance` PASS
- `cargo test -p topems-finance --lib payment`：61 passed
- `cargo test -p topems-finance --lib voucher_generation`：1 passed

本批无 migration、无 DDL。

## 风险与遗留

- 本地只有 1 行 `completed` 付款单且无软删，无法用存量触发工作流软删路径；改动属于防御性收紧。
- 凭证生成的清理仍是硬 `DELETE` 刚生成的无关联凭证；该凭证尚未对外返回，保留现有清理语义，未改为软删。
- 付款单工作流仍以状态集合作为唯一并发门；本次只补软删谓词，未新增状态机枚举。

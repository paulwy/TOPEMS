# B78 · master-data 账单状态过滤与支付写入口（2026-11-21）

## 现状（改动前）
- `master_data.mdm_billing_records` 本地 0 行、无 CHECK；`BillingStatus` 只有 `billing_status_from_str`，未知值静默回退 `Pending`。
- 账单历史接口的 `status` 查询参数被接收但完全未使用，筛选结果与传参无关。
- 标记支付 UPDATE 无任何起始态谓词，已支付账单可被重复标记，且 0 行统一报 404。

## 改动
1. `BillingStatus` 增加 `DB_VALUES`、`from_db_str`、`as_db_str`、`pay_from`（pending/invoiced/overdue，不含 paid）。
2. 账单历史先严格解析 `status`，未知值 400；COUNT 与列表 SQL 都补状态过滤，参数不再被忽略。
3. 标记支付改绑枚举并增加 `status = ANY(pay_from)`；0 行返回 409“已支付或状态不允许”，不再报不存在。
4. 候选 CHECK 沿用 `docs/database/master-data-status-check-candidates-2026-11-21.sql` 的四值 NOT VALID。

## 验证
- `cargo check -p topems-master-data`、`cargo clippy -p topems-master-data --all-targets -- -D warnings` 干净。
- 单元测试覆盖四值往返、未知值拒绝、pay_from 不含 paid。
- 本地表 0 行，无存量需要归一；候选 CHECK 未在本地 APPLY。

## 残留
- 生产上若已有 `refunded` 等集合外历史值，施加 CHECK 前需先盘点并窗口修订。
- 账单没有退款/作废动作，paid 目前是终态；需要业务确认是否补充 reversed。

# B287 Finance 付款记录状态守卫（2026-11-25）

## 结论

`finance.erp_payment_records.status` 是可空 text，本地 281 行全部为 NULL；既有 CHECK `ck_erp_payment_records_status_standard` 只允许 NULL/active/inactive/archived。但 `write_off_payment` 无条件写 `status='written_off'`，该值不在 CHECK 白名单内，**任何一次真实核销都会触发 23514 约束错误并返回 500**。同时 create 显式写 NULL、update 直接覆盖任意字符串、核销只判断记录是否存在。

本批补齐四态枚举、默认态、写入口来源态与并发谓词。

## 状态机

`svc/finance/src/services/finance/payment_record.rs::PaymentRecordStatus`

- `active → inactive / archived / written_off`
- `inactive → active / archived`
- `archived / written_off` 为终态
- 同态幂等

## 代码改动

- 新增 `PaymentRecordStatus`：`as_str/from_db_str/can_transition_to`，2 项单测（值域往返、迁移矩阵）。
- `create_payment_record`：INSERT 不再显式写 `status=NULL`，改由数据库默认 `active`；返回 status 从 `Option<String>` 收敛为 `String`。
- `update_payment_record`：status 入参先做值域解析；预读当前态（缺失 404、非法态 400）；目标不同才走状态机（非法 400）；UPDATE 增加 `AND status=$6 AND deleted_at IS NULL`，`fetch_optional` 0 行返回 400 并发冲突。
- `write_off_payment`：先校验 `write_off_amount` 有限且大于 0；预读当前态并只允许 active→written_off；UPDATE 增加 `AND status='active' AND deleted_at IS NULL`，0 行 400。

## 数据库

迁移 `database/migrations/20261125012000_finance_payment_record_status_standard.sql`：

- `status` 默认值设为 `'active'`。
- 281 行 NULL 归 `active`（带 destructive 标记）。
- `SET NOT NULL`。
- DROP/ADD `ck_erp_payment_records_status_standard`，白名单扩为 `active/inactive/archived/written_off` 并 VALIDATE。

本地库已应用：`status` 为 `NO` + 默认 `'active'::text`，约束 `convalidated=t`，NULL 计数 0 / 总行 281。

回滚：`database/rollback/20261125012000_finance_payment_record_status_standard.rollback.sql`，恢复可空与旧三态 CHECK（存在 written_off 数据时回滚会失败）。

## 验证

- `cargo check -p topems-finance` PASS。
- `cargo test -p topems-finance payment_record_status --lib` 1 passed。
- `cargo test -p topems-finance payment_record_transition --lib` 1 passed。
- `bash scripts/migration/validate.sh` 0 errors，checksum 已更新。

## 遗留

`write_off_payment` 仍不落库 `payable_id` 与 `write_off_amount`（表内无对应字段），本批只收口状态与约束；金额/应付关联需单独的业务批次补表结构。

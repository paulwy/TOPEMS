# 付款明细核销状态单一源（2026-11-21）

## 结论

`finance.core_finance_payment_items.write_off_status` 是自由文本，DB 默认 `pending`，没有 CHECK，也没有 Rust 类型。核销入口存在三处断裂：

1. `write_off_by` 列是 `uuid`，入口却绑定 `claims.username` 字符串，SQL 参数类型必然不匹配；
2. 读模型把 `write_off_date`（`timestamptz`）声明成 `Option<NaiveDate>`、把 `write_off_by`（`uuid`）声明成 `Option<String>`，核销成功后再次读取付款单会解码失败；
3. 更新不校验起始状态，可重复核销，后一次金额直接覆盖前一次；负数金额也能通过。

现统一为两值：`pending / completed`；NULL / 空串作为 `pending` 历史别名，未知值显式拒绝。

## 状态机

- 明细创建：DB 默认 `pending`（历史 NULL 视为 `pending`）；
- 核销：`pending` → `completed`，写核销金额、日期、操作人、剩余金额；
- `completed` 不可重复核销；
- 核销金额必须大于 0，且不大于 `payment_amount`；
- 未知核销状态不允许核销。

## 改动

- 新增 `svc/finance/src/modules/payment_item_write_off_status.rs`：`PaymentItemWriteOffStatus`、NULL 归一、4 个单测。
- `models/mod.rs`：`PaymentItem.write_off_date` 改为 `Option<DateTime<Utc>>`、`write_off_by` 改为 `Option<Uuid>`，与 DB 类型对齐。
- `services/finance/payment_workflow.rs`：
  - `write_off_payment_item` 的 `write_off_by` 改为 `Uuid`；
  - 明细查询加 `deleted_at IS NULL`，不存在返回 404；
  - 增加核销金额 > 0、状态必须 `pending`（含 NULL）校验；
  - 核销 UPDATE 增加 `COALESCE(write_off_status,'pending') = 'pending'` 原子谓词，0 行返回 409 语义的“状态已变化”。
- `modules/mod.rs`：核销入口从 `claims.sub` 解析 UUID，失败返回 401，不再把 username 当 uuid 绑定。

## 验证

- `cargo test -p topems-finance --lib modules::payment_item_write_off_status`：4 passed。
- `cargo clippy -p topems-finance --lib -- -D warnings`：通过。
- 本地库事务回滚演练：
  - 插入付款单与 `write_off_status=NULL` 明细；
  - 首次核销 UPDATE 1 行，结果 `completed`、金额 10、操作人 UUID、核销日期可读；
  - 重复核销 UPDATE 0 行。
- 未对现有明细做数据修改。

## DB CHECK（待生产窗口）

本地明细表 0 行，无需回填。生产先盘点再 `NOT VALID` + `VALIDATE`：

```sql
SELECT write_off_status, count(*) FROM finance.core_finance_payment_items GROUP BY 1 ORDER BY 2 DESC;

ALTER TABLE finance.core_finance_payment_items
  ADD CONSTRAINT core_finance_payment_items_write_off_status_check
  CHECK (write_off_status IN ('pending','completed')) NOT VALID;

ALTER TABLE finance.core_finance_payment_items
  VALIDATE CONSTRAINT core_finance_payment_items_write_off_status_check;
```

`write_off_date`/`write_off_by` 的读模型类型修复不涉及 DDL。

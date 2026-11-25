# B325 Finance ERP 应收/应付台账状态对齐（2026-11-25）

## 结论

B315 遗留的 `finance.erp_receivables` / `finance.erp_payables` 两套状态语义冲突在本批收敛。

两表本地均为 0 行，DB CHECK 均为：

```text
status IS NULL OR status IN ('active','inactive','archived')
```

但服务层长期按另一套词表写入：

- `create_receivable` / `create_payable` 硬编码 `status='unpaid'`，直接违反 DB CHECK，创建必然 500；两表 0 行也解释了该路径从未成功落库。
- `update_*` 的 `status = COALESCE($N, status)` 直接接收任意字符串，非法值落到 CHECK 才报 500；没有当前态读取、没有流转校验、UPDATE 没有 `status` 谓词。
- `delete_*` 只按 `tenant_id + id` 软删，无状态门、无 `deleted_at IS NULL`，重复删除会假成功。

## 代码改动

新增 `svc/finance/src/services/finance/erp_ar_ap_status.rs`：

- `ErpLedgerStatus::{Active,Inactive,Archived}`，与两表 CHECK 对齐；
- `from_db_str` / `as_str` 严格解析与唯一写值；
- `can_transition_to`：active ↔ inactive，二者可归档，archived 终态；
- `can_delete`：仅 inactive/archived；
- 2 项单测：值 roundtrip/未知值拒绝、流转与删除门。

`receivable.rs` / `payable.rs`：

1. 创建状态由 `unpaid` 改为 `active`，恢复可落库。
2. 更新入口严格解析 `status`，非法值 400。
3. 写前读取当前状态（tenant + id + `deleted_at IS NULL`）：不存在 404，当前值不在规范集合 400，archived 拒绝编辑，流转不合法 400。
4. UPDATE 补 `status = 当前态 AND deleted_at IS NULL`，`fetch_optional` 为 `None` 返回“状态已变化”，不再抛数据库错误。
5. 删除前读取当前状态；active 拒绝删除；软删 UPDATE 补 `status` 与 `deleted_at IS NULL`，0 行返回冲突。

无 DDL；Aging/报表读取路径未改。

## 验证

- `cargo fmt -p topems-finance` PASS
- `cargo check -p topems-finance` PASS
- `cargo test -p topems-finance --lib erp_ar_ap_status`：2 passed
- `check-request-txn --changed-only` PASS；`check-destructive-sql` PASS

## 风险

- 两表当前 0 行，修复无法用存量验证；但 `'unpaid'` 与 CHECK 的冲突是确定性缺陷。
- 删除策略收紧为“仅停用/归档可删”，若前端仍允许删除 active 台账，将收到 400，需要按状态隐藏入口。

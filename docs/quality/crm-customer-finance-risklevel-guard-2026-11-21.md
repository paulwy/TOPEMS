# B89 · CRM 客户财务风险等级单一集合（2026-11-21）

## 现状（改动前）
- `crm.customer_finance.risklevel` 本地 1 行（low），无 CHECK。
- 财务读取直接把库里的字符串回传；更新请求的 `risklevel` 原样合并写库，未知值可落库。
- 更新前读取的现值也不校验风险等级，损坏行会被继续携带。

## 改动
1. 新增 `FinanceRiskLevel`（low/medium/high/critical）于 `svc/crm/src/modules/finance_risk.rs`，提供 `DB_VALUES`/`from_db_str`/`as_db_str`/`DEFAULT` 与单测。
2. 财务 GET 读取后严格解析库内 `risklevel`，集合外返回 409，不再原样回传。
3. 财务更新：请求 `risklevel` 非法 400；未传时沿用现值，但现值必须先通过严格解析，否则 409，不把损坏值继续写回。
4. 新增候选 CHECK `crm_customer_finance_risklevel_check`（NOT VALID），映射登记 `FinanceRiskLevel`。

## 验证
- `cargo fmt --all`、`cargo clippy -p topems-crm --all-targets -- -D warnings` 干净。
- 单测覆盖四值往返、未知值拒绝、默认值、大小写与空格归一。
- 本地演练（事务内 ROLLBACK）：把唯一 1 行 risklevel 改为 bogus，四值过滤后可见 0 行；恢复后为 low。
- 盘点/队列：扫描口径未变（172 枚举 / 127 不在 DB CHECK；队列 118/127）。

## 残留
- `crm.customer_finance.risklevel` 仍是自由文本承载，未改成 Rust 枚举类型的 API 字段，避免破坏现有契约；写入口已收口。
- 生产候选 CHECK 需窗口执行；本地存量 1 行合法，可直接 VALIDATE。

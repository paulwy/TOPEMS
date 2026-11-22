# B142 · 财务 0 行小表状态批量收口（v55 发票 / 对账匹配 / 财务报表双列）

日期：2026-11-22

## 范围

- `finance.finance_v55_invoices.status`
- `finance.finance_v55_reconciliation_results.match_status`
- `finance.financial_reports.status`
- `finance.financial_reports.approval_status`（与 `status` 必须同值）

本地与生产快照三表均 0 行；四列均 `NOT NULL`，无状态 CHECK。

## 代码改动

- `settlement_v55::InvoiceStatus`：补 `DB_VALUES = pending/recognized/verified/posted`、`DEFAULT = Pending`、`from_db_str`；`from_str` 委托严格解析。
- `settlement_v55::MatchStatus`：补 `DB_VALUES = matched/partial/unmatched/discrepancy`、`DEFAULT = Unmatched`、`from_db_str`；`from_str` 委托严格解析。
- `financial_report_status::FinancialReportStatus`：补 `DB_VALUES = draft/pending/approved/rejected/locked`、`DEFAULT = Draft`、`from_db_str`；`normalize_financial_report` 委托严格解析。
- 既有写入口已是枚举绑定：发票创建写 Recognized，验证写 Verified（起始 Recognized），过账写 Posted（起始 Verified）；对账匹配写枚举，争议写 Discrepancy；报表生成写 draft，提交/审批/驳回/锁定/解锁均有起始态谓词。
- 既有列表参数仍是严格解析，非法值 400，行为不变。

## 本地应用

候选：`docs/database/finance-v55-reports-status-check-candidates-2026-11-22.sql`

本地 `topems` 单事务应用：

- `ck_finance_v55_invoices_status_standard`：四值，`NOT VALID`，默认 `pending`。
- `ck_finance_v55_recon_results_match_status_standard`：四值，`NOT VALID`，默认 `unmatched`。
- `ck_financial_reports_status_standard`：五值，`NOT VALID`。
- `ck_financial_reports_approval_status_standard`：五值，`NOT VALID`。
- `ck_financial_reports_status_pair`：`status = approval_status`，`NOT VALID`。
- 三表仍 0 行，无 NULL。
- 生产快照未修改；正式窗口执行后逐条 `VALIDATE`。

## 门禁

- finance clippy 通过；`cargo test -p topems-finance --lib` 1111 passed / 0 failed / 1 ignored。
- 盘点 208/191/152/206、色板缺口 0；队列 144/152 一致。
- request-txn 1651、scope-api 176/144 未增，txn-write-non2xx 通过。

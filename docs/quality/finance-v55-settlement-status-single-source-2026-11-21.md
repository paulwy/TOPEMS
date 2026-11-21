# finance v55 发票 / 支付 / 对账状态单一源（W5-B / B13）

- 日期：2026-11-21
- 范围：`svc/finance/src/modules/settlement_v55.rs`、`finance.finance_v55_invoices`、`finance.finance_v55_payment_results`、`finance.finance_v55_reconciliation_results`
- 结论：三张 v55 表的状态解析改为严格模式；三个列表过滤 SQL 修复为可执行语句并在 handler 校验状态；发票 `recognized→verified→posted` 与支付 `completed→reversed` 增加起始状态谓词。

## 1. 缺陷

| 位置 | 缺陷 | 后果 |
| --- | --- | --- |
| `MatchStatus::from_str` | 未知值静默回退 `matched` | 脏匹配状态被当作已匹配，统计虚高 |
| `InvoiceStatus::from_str` | 未知值静默回退 `pending` | 脏发票状态被当作未识别 |
| `PaymentStatus::from_str` | 未知值静默回退 `pending` | 脏支付状态被当作待处理 |
| `list_invoices` | SQL 先拼 `...FROM finance.finance_v55_invoices`，再直接追加 ` AND status = $1`，无 `WHERE` | 带 `status` 过滤必然语法错误；且状态不校验 |
| `get_results` | 同样缺少 `WHERE` 就追加 ` AND match_status = $1` | 带 `match_status` 过滤必然语法错误 |
| `list_payments` | 同样缺少 `WHERE` 就追加 ` AND id IN (...)` | 带 `status` 过滤必然语法错误 |
| `validate_invoice` | 不校验当前状态，任意状态都写 `verified`；UPDATE 无状态谓词 | 已 `posted` 发票可被降级回 `verified` 再重复入账 |
| `post_invoice` | UPDATE 无状态谓词，仅靠读到的 `status` 做前置校验 | 并发下可重复过账；且依赖字符串常量 |
| 状态写路径 | `'recognized'` / `'verified'` / `'posted'` / `'completed'` / `'reversed'` / `'discrepancy'` 字面量 | 枚举与 SQL 漂移 |

## 2. 唯一状态集合

| 概念 | 枚举 | 取值 | 迁移 |
| --- | --- | --- | --- |
| 发票 | `InvoiceStatus` | `pending` / `recognized` / `verified` / `posted` | 识别落 `recognized`；仅 `recognized` 可校验为 `verified`；仅 `verified` 可过账为 `posted` |
| 支付结果 | `PaymentStatus` | `pending` / `processing` / `completed` / `failed` / `reversed` | 发起落 `completed`；仅 `completed` 可冲正为 `reversed` |
| 对账匹配 | `MatchStatus` | `matched` / `partial` / `unmatched` / `discrepancy` | 自动对账写匹配结果；争议标记写 `discrepancy` |

## 3. 改动

- 三个枚举增加 `ALL`，`from_str` 改为 `Option<Self>`，`trim` 后严格匹配；未知 / 空串 / 大小写不一致返回 `None`，不再静默默认。
- `list_invoices` / `get_results` / `list_payments`：基础 SQL 加 `WHERE 1=1`，后续过滤条件可安全追加。
- 三个列表 handler 在进入 service 前校验 `params.status`：非法返回 400，文案含全部可选值。
- `recognize_invoice`：INSERT 状态改绑定 `InvoiceStatus::Recognized`。
- `validate_invoice`：先按 `InvoiceStatus::from_str` 校验，仅 `Recognized` 可继续；`Pending` / `Verified` / `Posted` 返回 `RowNotFound`（404），未知返回 `Protocol`（500）。UPDATE 改 `SET status = $4 ... AND status = $5`，绑定 `Verified` / `Recognized`。
- `post_invoice`：仅 `Verified` 可过账；UPDATE 改 `SET status = $4 ... AND status = $5`，绑定 `Posted` / `Verified`。
- `initiate_payment`：结果状态绑定 `Completed`；`reverse_payment`：冲正结果绑定 `Reversed`。
- `dispute_match`：`match_status` 绑定 `Discrepancy`。
- 单测由“未知默认值”改为“未知返回 `None`”。

## 4. 验证

- `cargo test -p topems-finance --lib settlement_v55`：189 passed。
- 本地事务演练（表 0 行，`BEGIN ... ROLLBACK`，RLS `app.rls_system=on`）：
  - 发票 `recognized→verified` 1 行、重复校验 0 行、`verified→posted` 1 行、重复过账 0 行，最终 `posted`。
  - 三个列表的 `WHERE 1=1 AND ...` 形态在 psql 中可执行（无语法错误）。
- clippy / 全量 finance lib 在提交前统一跑。

## 5. 候选 CHECK DDL（未执行）

```sql
ALTER TABLE finance.finance_v55_invoices
  ADD CONSTRAINT finance_v55_invoices_status_check
  CHECK (status IN ('pending','recognized','verified','posted')) NOT VALID;

ALTER TABLE finance.finance_v55_payment_results
  ADD CONSTRAINT finance_v55_payment_results_status_check
  CHECK (status IN ('pending','processing','completed','failed','reversed')) NOT VALID;

ALTER TABLE finance.finance_v55_reconciliation_results
  ADD CONSTRAINT finance_v55_reconciliation_results_match_status_check
  CHECK (match_status IN ('matched','partial','unmatched','discrepancy')) NOT VALID;
```

上线前盘点：

```sql
SELECT 'invoice' AS src, status AS val, count(*) FROM finance.finance_v55_invoices GROUP BY 1,2
UNION ALL SELECT 'payment', status, count(*) FROM finance.finance_v55_payment_results GROUP BY 1,2
UNION ALL SELECT 'recon', match_status, count(*) FROM finance.finance_v55_reconciliation_results GROUP BY 1,2
ORDER BY 1,2;
```

## 6. 遗留

- `pending` 发票：当前创建路径直接写 `recognized`，`pending` 仅可能是历史 / 外部写入；本次不允许 `pending→verified`，如需支持要另定口径。
- `PaymentResult` 的 `pending/processing/failed` 没有业务写入口，仅冲正路径写 `reversed`；后续接入异步支付回调时需补状态机。
- `approve_match` / `dispute_match` 用 `approved` / `disputed` 两个 bool 列，不是状态列；重复标记不拦截，属业务语义待确认。
- 生产三表行数与状态分布未知（本地均 0 行）。

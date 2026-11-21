# 财务报表状态单一源（2026-11-21）

## 结论

`finance.financial_reports.status` 与 `approval_status` 两列承载同一业务状态，但原本由各写入口直接写字符串：

- 生成写 `draft/draft`；
- 提交写 `pending/pending`；
- 审批写 `approved/approved`，驳回写 `rejected/rejected`；
- 锁定写 `locked/locked`，解锁又写回 `approved/approved`。

问题不在取值，而在**没有起始状态约束**：草稿可以被直接批准，已批准报表可以被直接驳回，已锁定报表可以被“解锁”成普通已批准；同时生成报表的 `ON CONFLICT` 会覆盖已提交/已审批/已锁定报表的数据，却保留原审批状态，形成“审批过的内容被悄悄换掉”。

现统一为五值：`draft / pending / approved / rejected / locked`，两列必须同值。

## 状态机

- 生成：新报表 `draft`；已有 `draft` / `rejected` 可重算并重置为 `draft`；
- 提交：`draft` / `rejected` → `pending`；
- 审批通过：`pending` → `approved`；
- 驳回：`pending` → `rejected`；
- 锁定：`approved` → `locked`；
- 解锁：`locked` → `approved`；
- `pending` / `approved` / `locked` 的报表禁止重新生成，返回 409。

## 改动

- 新增 `svc/finance/src/modules/financial_report_status.rs`：`FinancialReportStatus`、归一函数、`can_regenerate`、4 个单测。
- `financial_reports.rs`：
  - `upsert_report` 返回 `Option`：先读当前 `status`，仅 `draft` / `rejected` 可覆盖；SQL 再以 `WHERE status IN ('draft','rejected')` 原子兜底。
  - 覆盖时显式重置 `status/approval_status='draft'`，并清空 `approval_comment/approved_by/approved_at/rejection_reason`，避免旧审批痕迹残留。
  - 提交、审批、驳回、锁定、解锁五条 UPDATE 全部加双列状态谓词。
  - 命中 0 行时查询存在性：存在但状态不符返回 409，不存在返回 404，不再把状态冲突误报成不存在。
- 前端当前没有 `/reports/submit-approval`、`/reports/approve`、`/reports/reject`、`/reports/lock`、`/reports/unlock` 的调用方；后续接入时状态类型需与这五值一致。

## 验证

- `cargo test -p topems-finance --lib modules::financial_report_status`：4 passed。
- `cargo clippy -p topems-finance --lib -- -D warnings`：通过。
- 本地库事务回滚验证：
  - `draft → pending → approved → locked → approved` 每步更新 1 行；
  - 已锁定报表执行生成 upsert 更新 0 行，数据未被覆盖；
  - 状态谓词不匹配的审批/锁定均更新 0 行。
- 本地 `financial_reports` 0 行，未做数据迁移。

## DB CHECK（待生产窗口）

两列都要加同一集合约束；生产先盘点两列分布与是否长期不一致，再加 `NOT VALID`，核对后 `VALIDATE`。

```sql
ALTER TABLE finance.financial_reports
  ADD CONSTRAINT financial_reports_status_check
  CHECK (status IN ('draft','pending','approved','rejected','locked')) NOT VALID;

ALTER TABLE finance.financial_reports
  ADD CONSTRAINT financial_reports_approval_status_check
  CHECK (approval_status IN ('draft','pending','approved','rejected','locked')) NOT VALID;

SELECT status, approval_status, count(*)
  FROM finance.financial_reports GROUP BY 1,2 ORDER BY 3 DESC;

ALTER TABLE finance.financial_reports VALIDATE CONSTRAINT financial_reports_status_check;
ALTER TABLE finance.financial_reports VALIDATE CONSTRAINT financial_reports_approval_status_check;
```

生产若存在 `success`、`invalid`、`archived` 等业务值，先与财务确认映射；若两列长期不一致，以 `approval_status` 为准回填 `status` 前必须逐行核对。

## 回滚

```sql
ALTER TABLE finance.financial_reports DROP CONSTRAINT IF EXISTS financial_reports_status_check;
ALTER TABLE finance.financial_reports DROP CONSTRAINT IF EXISTS financial_reports_approval_status_check;
```

代码回滚到 `b25fa396c` 可恢复旧行为（不推荐：会重新允许跨状态审批和已审批数据被覆盖）。

# B223 · 合并报表审批状态护栏证据（2026-11-23）

## 范围

- 表：`erp.consolidation_reports.approval_status`（varchar NOT NULL DEFAULT `draft`，本地 0 行）
- 代码：`svc/erp/src/modules/consolidation/reports.rs`（`submit_report` / `approve_report`）
- 枚举：`svc/erp/src/modules/consolidation_report_approval_status.rs`（新增）

## 值集

`ConsolidationReportApprovalStatus = { draft, pending, approved, rejected, cancelled }`，
默认 `draft`，与前端 `APPROVAL_STATUS_CONFIG` 一致；
读侧把历史 `submitted` 归一为 `pending`、`canceled` 归一为 `cancelled`。

## 修掉的缺陷

1. **提交 / 审批不看当前状态**：`submit_report` 与 `approve_report` 都是
   "查到报表就直接 `SET approval_status='pending'/'approved'`"，没有起始状态校验：
   已审批的报表可以再提交、草稿可以直接审批、重复点审批会反复覆盖 `approved_at`。
   现两条入口先 `from_db_str` 严格解析当前值，再按状态机判定
   （提交仅允许 draft/rejected/cancelled，审批仅允许 pending），违规返回 400；
   库里出现未知值也直接 400，不再写入。
2. **状态值是 SQL 字面量**：`'pending'` / `'approved'` 改为 `$2` 参数绑定枚举常量。
3. **列没有 DB 约束**：新增 `ck_consolidation_reports_approval_status_standard`（`NOT VALID`）。

## 本地验证

- 约束应用后：建一条合法 scope，插入 `approval_status='bogus'` 的报表被
  `ck_consolidation_reports_approval_status_standard` 拒绝；`approval_status='pending'` 正常写入
  （事务内测试，已回滚）。
- 存量 0 行，无需数据修复；DB 默认 `draft` 在值集内。
- 单测覆盖：5 值往返、别名归一、未知/大写拒绝、提交/审批状态机白名单、`parse_filter` 归一。

## 遗留

- `erp.consolidation_reports.status`（varchar NOT NULL DEFAULT `pending`）本批**未动**：
  前端只认 draft/calculating/completed/published，但 DB 默认值是 `pending`，
  且仓库内没有任何 INSERT 写入方（报表生成链路可能在仓外）。在没有确认生成器写入值集前加约束，
  可能直接把报表生成写挂。需要先确认生成链路，再决定 canonical 集合与默认值。
- `publish_report` 仍是 501 未接入，`status` 的 published 流转没有后端实现，同样留给后续批次。
- 生产未应用：仅本地 `topems` 应用 `NOT VALID` 约束，发布需按窗口执行并逐条 `VALIDATE`。

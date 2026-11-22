# CRM 联系人审批状态治理（B127）

日期：2026-11-22
范围：`crm.contacts.approval_status`

## 结论

联系人审批状态沿用 `ContactApprovalStatus`，规范集合 `none / pending / approved / rejected`，默认 `none`；本批补齐候选 CHECK、读侧规范集合过滤与写入口软删守卫。

本批修复了三个读侧/写侧缺口：

- 列表与 COUNT 只过滤联系人生命周期状态和客户，非法审批状态的历史行仍会返回；现在补 `approval_status = ANY(规范集合)`。
- 详情查询只按 id，不看 `deleted_at`，软删联系人仍可被读取；现在补 `deleted_at IS NULL`。
- 通用更新与三条审批流更新只按 id/审批起始态，软删联系人仍可能被改写；现在 UPDATE 与三条审批预读一并补 `deleted_at IS NULL`。

审批流转本身已是枚举绑定：`none/rejected → pending → approved|rejected`，起始态由 `start_from` / `decide_from` 控制，0 行返回 409。

## DB 现状

本地 `topems`：

- `crm.contacts` 6 行，全部 `approval_status=none`。
- 列 `NOT NULL DEFAULT 'none'`，无 CHECK。
- 候选：`docs/database/crm-contact-approval-status-check-candidates-2026-11-21.sql`
  - `contacts_approval_status_check ... NOT VALID`，值集 `none/pending/approved/rejected`。

## 代码改动

- 联系人列表与 COUNT 增加审批状态规范集合过滤。
- `get_contact` 增加 `deleted_at IS NULL`。
- `update_contact` 的 UPDATE 增加 `deleted_at IS NULL`。
- `start_contact_approval`、`approve_contact`、`reject_contact` 的预读与 UPDATE 增加 `deleted_at IS NULL`。
- 审批状态解析仍严格：非法值 409，起始态不符 409，并发 0 行 409。

## 验证

- CRM 测试 505 通过；clippy/fmt 通过。
- 约束事务演练：6 行 `none → pending` 更新 1 行；`none → pending → approved` 6 行；非法 `waiting` 23514；ROLLBACK 后约束 0、6 行仍全部 `none`、列仍 `NOT NULL DEFAULT 'none'`。
- 盘点 203 个 Rust 枚举 / 190 值 / 151 不在 DB CHECK / 205 前端键，色板缺口 0；队列 139/151，resolved 107。

## 剩余风险

- 联系人审批状态没有独立历史表，只有审计事件；完整审批链仍不可查询。
- 列表未提供按 `approval_status` 的显式筛选参数，只做规范集合兜底过滤；若前端需要“待我审批”视图，需要新增 query 参数。
- `crm.customers.approval_status` 仍是下一批候选，本批未动。

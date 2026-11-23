# B225 · 工程变更通知状态护栏证据（2026-11-23）

## 范围

- 表：`pdm.pdm_change_notices.status`（varchar NOT NULL DEFAULT `draft`，本地 0 行）
- 代码：`svc/pdm/src/modules/change_notice.rs`（`list_change_notices` / `create_change_notice` /
  `update_change_notice` / `submit_change_notice` / `approve_change_notice` / `reject_change_notice`）
- 枚举：`svc/pdm/src/modules/change_notice_status.rs`（新增）
- 既有但未接线：`svc/pdm/src/modules/state_machine.rs::validate_ecn_transition`

## 值集

`ChangeNoticeStatus = { draft, pending, approved, rejected, implemented, closed, cancelled, withdrawn }`，
默认 `draft`，取 `ecn_transitions()` 的 8 态 ECN 生命周期；读侧把历史 `submitted` 归一为
`pending`、`canceled` 归一为 `cancelled`。

## 修掉的缺陷

1. **通用更新接口可绕过审批**：`update_change_notice` 把请求体 `status` 原样入库，
   `PUT /change-notices/{id}` 可以直接把 `draft` 改成 `approved`。仓库里早有
   `state_machine::validate_ecn_transition`（单测还专门写了“防止 update_change_notice 绕过审批”），
   但 handler 从未调用。现更新入口先严格解析当前值与目标值（未知值 400），再按 ECN 转移表校验，
   非法流转（如 draft→approved、rejected→pending）返回 400；同值重复提交放行。
2. **状态写入口全是字面量**：创建 `'draft'`、提交 `'pending'`、审批 `'approved'`、驳回 `'rejected'`，
   以及三条 `WHERE ... AND status = 'draft'/'pending'` 守卫，全部改为参数绑定枚举常量。
3. **列表过滤裸绑参数、且漏软删除**：`?status=` 原先原样绑进 `status = $3`，拼错静默空列表、
   `all` 也空列表；主查询缺 `deleted_at IS NULL`，而 COUNT 有——软删除记录会出现在列表却不计数。
   现 `parse_filter` 归一（`all`/空串不过滤、别名归一、非法值 400），主查询补 `deleted_at IS NULL`。
4. **列没有 DB 约束**：新增 `ck_pdm_change_notices_status_standard`（`NOT VALID`）。

## 本地验证

- 约束应用后：`status='bogus'` 的 INSERT 被 `ck_pdm_change_notices_status_standard` 拒绝；
  `status='approved'` 正常写入（事务内测试，已回滚）。
- 存量 0 行，无需数据修复；DB 默认 `draft` 在值集内。
- 前端色板补 `implemented: 'success'`（`apps/web/src/utils/status.ts`），避免新增状态退化为灰色。
- 单测覆盖：8 值往返、`submitted`/`canceled` 别名、未知值拒绝、提交/审批前置白名单、
  `parse_filter` 空 / `all` / 别名归一 / 非法值报错。

## 遗留

- `implemented` / `closed` / `cancelled` / `withdrawn` 目前没有对应 HTTP 入口（只有状态机与枚举），
  本批只保证取值合法，不新增流转接口。
- `pdm.pdm_change_notices` 与前端 `ChangeOrder`（`pdm_change_orders`）是两套模型，后者本批未动。
- 目录口径（2026-11-23 收敛后）：本批约束无迁移，已登记 `docs/database/prod-only-status-checks-2026-11-23.json`
  （392→393），`pdm.pdm_change_notices.status` 仍留在目录 `uncovered`；待 P7 回迁。
- 生产未应用：仅本地 `topems` 应用 `NOT VALID` 约束，发布需按窗口执行并逐条 `VALIDATE`。

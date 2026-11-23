# B222 · 合并范围状态护栏证据（2026-11-23）

## 范围

- 表：`erp.consolidation_scopes.status`（varchar NOT NULL DEFAULT `draft`，本地 0 行）
- 代码：`svc/erp/src/modules/consolidation/scopes.rs`（列表 / 创建 / 更新）、
  `svc/erp/src/modules/consolidation/elimination_flow.rs`（消抵前置校验）
- 枚举：`svc/erp/src/modules/consolidation_scope_status.rs`（新增）

## 值集

`ConsolidationScopeStatus = { draft, active, inactive }`，默认 `draft`。
与前端 `ConsolidationScopePage` 的状态选择器（active / inactive / draft）一致；
消抵流程只允许 `active`（`is_runnable`）。

## 修掉的缺陷

1. **更新接口原样落库**：`update_scope` 把请求体 `status` 直接
   `status = COALESCE($5, status)` 写入，任何字符串都能进库；而消抵流程只认 `active`，
   写错一个值就让合并范围"看起来启用了但跑不了"。
   现入口严格 `from_db_str`，未知值 400（文案列出 canonical 值集）。
2. **列表过滤裸绑**：`params.status` 直接绑进 SQL，拼写错误静默返回空列表、`all` 也返回空。
   现 `parse_filter` 归一（`None` / 空串 / `all` → 不过滤），非法值 400。
3. **创建依赖 DB 默认值**：`create_scope` 不写 status，靠列默认 `draft`。
   现在显式绑 `ConsolidationScopeStatus::DEFAULT`，默认值只来自枚举。
4. **消抵前置用字符串比较**：`if status != "active"` → `from_db_str(...).is_runnable()`，
   只认 canonical `active`，历史/错误写法不再误判为可用。
5. **列没有 DB 约束**：新增 `ck_consolidation_scopes_status_standard`（`NOT VALID`）。

## 本地验证

- 约束应用后：`INSERT ... status='bogus'` 被约束拒绝，`status='active'` 正常写入
  （事务内测试，已回滚）。
- 存量 0 行，无需数据修复；DB 默认 `draft` 在值集内。
- ERP lib 单测覆盖：3 值往返、未知/大写拒绝、`parse_filter` 归一、只有 `active` 可运行。

## 遗留

- `erp.consolidation_reports` 的 `status` 与 `approval_status` 两列仍未收敛（本批未动），
  `approval_status` 在提交 / 审批路径写死 `'pending'` / `'approved'` 字面量，
  属于下一批候选，需先确认 rejected / withdrawn 是否存在产品口径。
- 生产未应用：仅本地 `topems` 应用 `NOT VALID` 约束，发布需按窗口执行并逐条 `VALIDATE`。

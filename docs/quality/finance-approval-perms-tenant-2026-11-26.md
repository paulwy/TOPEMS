# B349：Finance 审批域权限与租户收敛

- 日期：2026-11-26
- 文件：`svc/finance/src/modules/mod.rs`（无 DDL、无迁移）
- 关联：B337（Finance 写入口租户收紧）、B343（凭证域按方法拆权限）

## 缺口

审批配置/费用审批整域（`approval-configs` CRUD、`expense-approvals` CRUD、`expense-approvals/{id}/{submit,approve,reject}`、`approvals/{submit,approve,reject,cancel}`）此前只挂一个 `finance:expense_approval:read`：只读角色即可建/改/删审批配置、建费用审批、提交/审批/驳回、删费用审批。

同时：

- `create_expense_approval` 用 `claims.tenant_id`（`Option<Uuid>`）直接落库，缺租户时写 NULL tenant_id；
- `transition_expense_approval`（提交/审批/驳回共用）用 `get_tenant_id_from_claims`（缺租户回退平台租户）；
- `list_expense_approvals` / `get_expense_approval` 的 SQL 无租户谓词，只靠 RLS，缺上下文时静默返回空/跨租户可见；
- 3 处 utoipa 注解引用不存在于 `core_permissions` 的幽灵码 `finance:approval:admin`（`/approvals/approve`、POST `/expense-approvals`、`/expense-approvals/{id}/reject`）。

## 处置

1. **按方法拆路由挂码**（`create_routes` 内）：
   - 审批配置：GET → `finance:approval_config:read`；POST → `create`；PUT → `update`；DELETE → `delete`；
   - 费用审批：GET → `finance:expense_approval:read`；POST（含 `/approvals/*` 四个动作）→ `create`；PUT 与 `submit/approve/reject` → `update`；DELETE → `delete`；
   - 写子 Router 合并后再统一套一层 read（能读才能改），与 B343 凭证域同构；同路径不同方法由 axum merge `MethodRouter`。
2. **租户严格化**：`create_expense_approval`、`transition_expense_approval` 改 `try_tenant_id_from_claims`（缺失/非法/nil 直接 400）；`list_expense_approvals` / `get_expense_approval` 补显式 `tenant_id = $n::uuid` 谓词（列表行查询与 COUNT 同步，跨租户 ID 一律 404）。
3. **注解对齐**：3 处 `finance:approval:admin` 改为真实码（`/approvals/approve`、`/expense-approvals/{id}/reject` → `finance:expense_approval:update`；POST `/expense-approvals` → `finance:expense_approval:create`）。
4. **回归测试**：新增 `approval_routes_merge_without_panic`（构建完整 finance 路由表，验证多 Router 合并不 panic）。

权限码事实（本机 `core_permissions`）：`finance:expense_approval:{read,create,update,delete}`、`finance:approval_config:{read,create,update,delete}` 均存在；admin / finance_manager / superadmin / tenant_admin 四角色各持 8 码，erp_manager 一码未持。未新增权限码、无 seed 迁移。

## 验证

- `cargo fmt -p topems-finance`、`cargo check -p topems-finance`：通过（9m06s，含依赖编译）。
- `cargo test -p topems-finance --lib`：全绿（含新增路由合并用例）。
- 数据事实：`finance.expense_approvals` 178 行全 `pending`、`tenant_id` NULL 0 行、单租户、1 条 RLS policy；DB 侧已是 NOT NULL + `ck_expense_approvals_status_standard` 五态 validated（本批不动 DDL）。

## 遗留

- 费用审批没有 `/reimbursed` 动作入口，`approved → reimbursed` 只能靠通用 PUT 改状态；是否补专用动作待产品确认。
- 前端按钮仍只按 `finance:expense_approval:read` 显示，只读角色点写操作会 403（B343 同类遗留）。
- 通用 `/approvals/*` 四个端点复用费用审批码，若将来有独立审批引擎需再拆码。

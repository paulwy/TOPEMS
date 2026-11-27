# Finance 报销专用动作的前端入口（B357）

## 1. 缺口

B350 已在服务端落地 `POST /api/finance/expense-approvals/{id}/reimburse`（`approved → reimbursed`，严格租户、当前态谓词、0 行 409、只改状态）。但前端完全没入口：

- `apps/web/src/api/finance/expenseApproval.ts` 只有 `submitted/approve/reject`，没有 `reimburse`；
- `FinanceExpenseApprovalPage` 是 `CrudPage` + schema 的纯 CRUD 薄壳，行操作只有查看/编辑/删除，状态在 `approved` 的审批单没有任何“登记报销”入口。

结果是：接口存在、前端不能用，用户只能绕过 UI 直接打接口，或者用通用 `PUT /expense-approvals/{id}` 携带 `status=reimbursed` 蒙混——而那条路径正是 B350 特意封掉的终态改写口子。

## 2. 改动

1. **API 层**：`expenseApprovalApi.reimburse(id)` → `POST /expense-approvals/{id}/reimburse`。注释写清与通用 `update` 的差别：只改状态，不接受金额/员工等字段，非 `approved` 服务端 409。
2. **页面层**：`FinanceExpenseApprovalPage` 通过 `CrudPage` 已有的 `customRowActions` 注入一个行操作「报销」：
   - `show: row.status === 'approved'`——与服务端 `approved → reimbursed` 单入口同口径，其他状态看不到按钮，避免让用户触发必然 409 的操作；
   - `confirm: true` + 明确文案（“只改状态，不可撤回”）；
   - 成功后 `queryClient.invalidateQueries({ queryKey: ['financeExpenseApproval'], exact: false })`（`CrudPage` 的列表 queryKey 首段就是 `schema.entity`），失败把服务端 `message`（如「当前状态不允许报销」）原样透出。
3. **i18n**：新增 `finance.finance_expense_approval_page.reimburse_action / reimburse_confirm / reimburse_success / reimburse_failed / reimburse_missing_id`，中英双语同批补齐。

不新增组件、不改 `CrudPage`、不改 schema——复用既有扩展点，零模板改动。

## 3. 顺带发现（未在本批修）

`FinanceExpensePage`（费用页）的适配器绑定的是 `financeApi.account`（科目表 API），而 schema 是 `financeExpense`。也就是说这个页面的列表实际在查会计科目，不是费用。B351 的 `POST /expenses/{id}/pay` 因此**没有可挂的正确页面**——要么先把该页适配器换成 `financeApi.expense`，要么另建费用列表页。这属于独立缺口，留给下一批，本批不碰，避免把“支付入口”接到错误数据源上。

另一个相关但未动的点：`FinanceExpensePage` 若切到 `expenseApi`，页面才具备 `status=approved` 的行，支付按钮才有意义。API 层 `expenseApi.pay(id)` 已在本批一并补上，等页面归位即可直接用。

## 4. 验证

- `npx tsc --noEmit -p apps/web/tsconfig.json`：通过（`/tmp/b357tsc.log`，exit 0）。
- `npx eslint`（两个 API 文件 + 页面）：0 问题（`/tmp/b357eslint.log`）。
- `node scripts/ci/check-i18n.cjs --mode=quality --strict`：7-in-1 PASS，0 failures。
- `scripts/dev/web_smoke_precommit.sh`（B355 修复后本机可跑）：
  - 首跑 `/tmp/b357smoke.log` 报 `[finance] 271/273 PASS, 2 FAIL`，两条都是 `route_missing`——因为冒烟复用的是共享 `target/debug/topems-server`，那份二进制还是 B350/B351 之前的产物，没有新路由。这属于**二进制陈旧误报**，不是代码问题。
  - 重建 `cargo build -p topems-server`（15m32s）后复跑 `/tmp/b357smoke2.log`：`[finance] 273/273 PASS`，全量 `4568/4568 PASS, 0 FAIL`，退出码 0。两条新端点（`/expenses/{id}/pay`、`/expense-approvals/{id}/reimburse`）在单体里确实已挂载。

## 5. 遗留

- 报销按钮只覆盖审批单维度；费用（`finance.expenses`）维度的支付入口随页面归位再补。
- 审批链路的 `submit / approve / reject` 前端仍无入口，同样只有 API 层；这批只做有服务端专用动作、且目标页面正确的 `reimburse`。
- 本地 web 冒烟复用共享 `target/debug/topems-server`，二进制陈旧时会把新路由误报成 `route_missing`。建议冒烟脚本在检测到 `svc/*/src` 比二进制新时提示重建（待排批），否则容易把“没编译”当成“没实现”。

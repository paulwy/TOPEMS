# Finance 费用页数据源归位 + 支付入口（B358）

## 1. 缺口（比“缺按钮”更严重）

菜单 `finance-expense`（`FINANCE_PATHS.expense`）指向 `FinanceExpensePage`，但该页把适配器绑到了 `financeApi.account`：

```ts
const apiAdapter = createCrudPageAdapter(financeApi.account);  // 会计科目表
```

`schema` 却是 `expenseSchema`（实体 `financeExpense`）。后果是一条链上的：

1. **列表查错表**：页面实际请求 `GET /api/finance/accounts`，列出来的是会计科目，不是 `finance.expenses`；
2. **写操作打错资源**：这个页面的新建/编辑/删除全部落到科目表上，费用记录在 UI 里既看不到也改不了；
3. **B351 的支付动作无处可挂**：`POST /expenses/{id}/pay`（approved → paid）早就落地，但页面数据源不对，任何“支付”按钮都只能挂在科目行上，必然 404 / 409。

## 2. 修复

1. **适配器归位**：`createCrudPageAdapter(financeApi.expense)`，即 `GET/POST/PUT/DELETE /api/finance/expenses`，与 `expenseSchema` 的实体一致。适配器的 `pageSize → page_size`、`items/total` 解包能力不变。
2. **支付入口**：用 `CrudPage.customRowActions` 注入「支付」行操作：
   - `show: row.status === 'approved'`——与 B351 的 `approved → paid` 单入口同口径，`paid/submitted/draft` 不显示，避免必然 409；
   - `confirm: true` + “只改状态、不可撤回”文案；
   - 成功后 `invalidateQueries({ queryKey: ['financeExpense'] })`（`CrudPage` 列表 queryKey 首段就是 `schema.entity`），失败透出服务端 `message`。
3. **i18n**：`finance.finance_expense_page.pay_action / pay_confirm / pay_success / pay_failed / pay_missing_id`，中英同批。
4. **测试同步**：`FinanceExpensePage.test.tsx` 的 mock 从 `account` 换成 `expense`（含 `pay`），断言全部改到 `expense` 资源；新增一条行为锁：`pay` 行操作只在 `approved` 可见、`confirm` 为真、点击调 `expense.pay(id)`。

## 3. 验证

- `npx vitest run src/components/__tests__/FinanceExpensePage.test.tsx`：`5 passed`（含新增的支付行操作用例）。
- `npx eslint`（页面 + 测试）：0 error（首轮有两条 prettier，`--fix` 后复跑通过）。
- `npx tsc --noEmit -p apps/web/tsconfig.json`：exit 0。
- `node scripts/ci/check-i18n.cjs --mode=quality --strict`：7-in-1 PASS。
- `scripts/dev/web_smoke_precommit.sh`：`[finance] 273/273 PASS`，全量 **4568/4568 PASS**（`/tmp/b358smoke.log`）。

## 4. 数据现状与影响

- 本机 `finance.expenses` 仅 3 行且全部 `submitted`，没有 `approved` 行，所以本机 UI 上暂时看不到「支付」按钮——这是数据状态，不是功能缺失；行为由单测锁住。
- 修复前该页对科目表的增删改是**真实生效**的（不是只读错位）。本次只是把适配器指回正确资源，不改任何后端行为。

## 5. 遗留

- `finance.expenses` 仍有 1 行 `tenant_id IS NULL`（B351 遗留），需业务确认归属后回填。
- 该表无独立 `paid_at` 列，支付时间复用 `reimbursed_at`；是否加列需迁移窗口。
- `docs/api/openapi.json` 的 Finance 区块仍缺 submit/approve/reimburse/pay 四条、且残留已删除的 `finance:approval:admin`，留给 openapi 重生成批次。

# finance v56 税务表单 / 筹划状态单一源（W5-B / B14）

- 日期：2026-11-21
- 范围：`svc/finance/src/modules/tax_v56.rs`、`finance.finance_v56_tax_forms`、`finance.finance_v56_tax_plans`
- 结论：税务表单五态与税务筹划六态统一到枚举；表单 `draft→calculated→submitted`、`rejected→draft` 与筹划 `draft/proposed/under_review→approved` 增加起始状态谓词；四个列表 / 汇总查询修复缺 `WHERE` 与未绑定参数问题。

## 1. 缺陷

| 位置 | 缺陷 | 后果 |
| --- | --- | --- |
| `TaxFormStatus::from_str` | 未知值静默回退 `draft` | 脏状态被当作草稿 |
| `TaxPlanStatus::from_str` | 未知值静默回退 `draft` | 同上 |
| `get_forms` | 基础 SQL 无 `WHERE`，直接追加 ` AND form_type/status` | 带任一过滤条件必语法错误 |
| `get_tax_summary` | 基础 SQL 无 `WHERE` 就追加 ` AND EXTRACT(YEAR...)`，且年份字符串拼接 | 带年份必语法错误 |
| `get_compliance_check` | 追加 `AND jurisdiction = $2` 却没有任何 `.bind` | 带 `entity` 时参数缺失，查询失败 |
| `list_plans` | 基础 SQL 无 `WHERE`，直接追加 ` AND status = $1` | 带状态过滤必语法错误 |
| `calculate_tax` | 不校验表单状态，任意状态可重算并写 `calculated`；重算不清理旧明细行 | 已提交 / 已接受表单被改回计算态；明细重复累加、金额虚增 |
| `submit_form` | 任意状态可提交，UPDATE 无谓词 | 草稿可直接提交，已提交可重复提交 |
| `amend_form` | 不校验状态，任意状态可改并重置 `draft` | 已提交 / 已接受表单可被改回草稿 |
| `approve_plan` | 任意状态可批准，UPDATE 无谓词 | 已拒绝 / 已执行筹划可被重新批准 |
| 写路径 | `'draft'` / `'calculated'` / `'submitted'` / `'approved'` / `'low'` 字面量 | 枚举与 SQL 漂移 |

## 2. 唯一状态集合

| 概念 | 枚举 | 取值 | 迁移 |
| --- | --- | --- | --- |
| 税务表单 | `TaxFormStatus` | `draft` / `calculated` / `submitted` / `accepted` / `rejected` | 生成落 `draft`；`draft` / `calculated` 可计算为 `calculated`；仅 `calculated` 可提交为 `submitted`；`draft` / `calculated` / `rejected` 可修改回 `draft` |
| 税务筹划 | `TaxPlanStatus` | `draft` / `proposed` / `under_review` / `approved` / `rejected` / `executed` | 创建落 `draft`；仅 `draft` / `proposed` / `under_review` 可批准为 `approved` |

## 3. 改动

- 两个枚举增加 `ALL`，`from_str` 改为 `Option<Self>`，`trim` 后严格匹配。
- `get_forms`、`list_plans` 基础 SQL 加 `WHERE 1=1`。
- `get_tax_summary` 改静态 SQL：`WHERE ($1::int IS NULL OR EXTRACT(YEAR FROM period_end) = $1) GROUP BY form_type`，绑定 `year`。
- `get_compliance_check` 改静态 SQL：`WHERE status = 'draft' AND ($1::text IS NULL OR jurisdiction = $1)`，绑定 `entity`。
- `generate_tax_form`：表单状态绑定 `Draft`。
- `calculate_tax`：先读当前状态，仅 `Draft` / `Calculated` 可计算；其余返回 `RowNotFound`（404），未知返回 `Protocol`（500）。重算前软删旧明细行；UPDATE 加 `AND status IN ($5, $6)`，绑定 `Calculated` / `Draft` / `Calculated`。
- `submit_form`：UPDATE 改 `SET status = $4 ... AND status = $5`，绑定 `Submitted` / `Calculated`，0 行返回 `RowNotFound`。
- `amend_form`：先读状态，仅 `Draft` / `Calculated` / `Rejected` 可修改；`Submitted` / `Accepted` 返回 404，未知返回 500。UPDATE 加 `AND status IN ($5, $6, $7)`。
- `create_plan`：`risk_level` 绑定 `TaxPlanRiskLevel::Low`，`status` 绑定 `TaxPlanStatus::Draft`。
- `approve_plan`：UPDATE 加 `AND status IN ($5, $6, $7)`，绑定 `Approved` / `Draft` / `Proposed` / `UnderReview`。
- `get_tax_forms_handler` / `list_plans_handler` 在 service 前校验 `status`，非法 400，文案列全部可选值。
- 单测由“未知默认值”改为“未知返回 `None`”。

## 4. 验证

- `cargo test -p topems-finance --lib tax_v56`：52 passed。
- 本地事务演练（表 0 行，`BEGIN ... ROLLBACK`，RLS `app.rls_system=on`）：
  - 表单 `draft→calculated` 1 行，`calculated→calculated` 1 行（允许重算），`calculated→submitted` 1 行，重复提交 0 行，最终 `submitted`。
  - 筹划 `draft→approved` 1 行，重复批准 0 行。
- clippy / 全量 finance lib 提交前统一跑。

## 5. 候选 CHECK DDL（未执行）

```sql
ALTER TABLE finance.finance_v56_tax_forms
  ADD CONSTRAINT finance_v56_tax_forms_status_check
  CHECK (status IN ('draft','calculated','submitted','accepted','rejected')) NOT VALID;

ALTER TABLE finance.finance_v56_tax_plans
  ADD CONSTRAINT finance_v56_tax_plans_status_check
  CHECK (status IN ('draft','proposed','under_review','approved','rejected','executed')) NOT VALID;
```

上线前盘点：

```sql
SELECT 'form' AS src, status AS val, count(*) FROM finance.finance_v56_tax_forms GROUP BY 1,2
UNION ALL SELECT 'plan', status, count(*) FROM finance.finance_v56_tax_plans GROUP BY 1,2
ORDER BY 1,2;
```

## 6. 遗留

- 无 `accepted` / `rejected` 表单写入口（可能来自外部税局回执），本次只保证这些终态不会被计算 / 提交 / 修改覆盖。
- 无 `proposed` / `under_review` / `rejected` / `executed` 筹划写入口；当前批准允许从 `draft` 直接到 `approved`，避免接口不可用。
- `TaxPlanStrategy` / `TaxPlanRiskLevel` / `TaxRateType` / `TaxFormType` 的 `from_str` 仍保留静默默认，本次只收口两个状态枚举。
- 生产两表行数与状态分布未知（本地均 0 行）。

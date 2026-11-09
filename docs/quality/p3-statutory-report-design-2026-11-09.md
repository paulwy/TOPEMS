# P3 法定报表：取证与口径设计

日期：2026-11-09　基线：`main@31f4af811`（P2a 两笔已合入）
本轮范围：只读取证 + 口径结论，**未改代码、未改迁移、未动生产**。

---

## 一、取证

### 1.1 现有报表能力：真实 / 半成品 / 占位

所有入口都在 `svc/finance`。按可用程度分三档。

**真实计算（可跑通，但口径不足）**

| 接口 | 实现位置 | 现状 |
|---|---|---|
| `GET /trial-balance/{period}` | `svc/finance/src/modules/mod.rs:445` → `report.rs:57` | 按科目汇总当期 `ledger` 借贷净额；**无期初、无期末、无 company** |
| `POST /reports/balance-sheet/generate` | `financial_reports.rs:1266` → `report.rs:84` | 只用**当期发生额**汇总资产/负债/权益；无期初、无 company、负数取绝对值 |
| `POST /reports/income-statement/generate` | `financial_reports.rs:1423` → `report.rs:168` | 收入取 `SUM(debit-credit)` **未取反**，当前符号是错的；无 company |
| `GET /reports/cash-flow` | `financial_reports.rs:1573` → `report.rs:231` | 用「资产类 1xxx 借贷差>0 即流入」近似，不是现金流量表口径 |
| `GET /reports/comparison`、`/trend`、`/year-over-year`、`/item-details` | `financial_reports.rs:90/260/385` | 基于 ledger 的真实汇总，但继承上述期初/币种/公司缺口 |

**占位（返回空数组或假数据）**

- `GET /reports/account-balance`（`modules/mod.rs:5201`）→ 固定空 `items`
- `GET /reports/account-ledger`（`5212`）、`/reports/dimension-detail`（`5220`）→ 固定空
- `GET /reports/balance-sheet/export`、`income-statement/export`、`cash-flow/export`（`5228+`）→ 只返回一个假文件名
- `GET /reports/aging-analysis`（`financial_reports.rs:2106`）→ 拿 `vouchers.total_debit` 按凭证日期分桶，与应收账龄无关，注释自称「简化版」
- `GET /reports/profit-analysis`（`2314`）→ 依赖 `accounts.category ILIKE '%收入%'`，而该列**全库 0 行填充**；且不筛凭证状态（草稿也计入）
- `GET /reports/consolidated/*`（`financial_reports.rs:504-760`）→ 全部显式「未接入」，指向 ERP 合并模块

**报表持久化**：`finance.financial_reports`（`jsonb data`，唯一键 `report_type + org_id + period + currency_code`）。`org_id` 实际写入的是 `tenant_id`，**没有 company_id**，生成/审批/发布状态都在这一张表。

### 1.2 P2a 后账簿字段：能支撑什么、缺什么

| 表 | 可用字段 | 缺口 |
|---|---|---|
| `core_finance_vouchers` | `period`、`status`(draft/submitted/approved/posted/rejected/cancelled/reversed)、`company_id`、`voucher_date`、`total_debit/credit`、`source_module/source_id` | `currency_code` 未与 ledger 关联；无「结转凭证」标记 |
| `core_finance_voucher_lines` | `account_id/code/name`、`debit/credit`、`aux_type/aux_id`、`project_id/department_id`、`company_id` | `tenant_id` 可空；无原币金额/汇率/数量；无余额方向字段 |
| `core_finance_ledger` | `account_id/code/name`、`period`、`debit/credit`、`voucher_id`、`aux_id`、`company_id` | **无方向、无币种、无期初/期末语义**；`balance` 是行内复核值（样本 6001 为 -1000），不是累计余额 |
| `core_finance_aux_balances` | `account_id`、`aux_type/aux_id`、`period`、`debit_balance/credit_balance`、`company_id` | 期初与发生额未分列；无币种 |
| `erp.opening_balances` | `company_id`、`subject_code`、`period`、`debit_balance/credit_balance`、`tenant_id` | 无 `account_id`（只能按 code 关联）；无币种；写入 API 用 `f64` 入参（`modules/mod.rs:4534`） |

结论：**余额表所需的「期初 + 本期发生 + 期末」三列，只有「本期发生」是现成的**。期初存在 `erp.opening_balances`，且与 finance 账簿之间没有任何一致性校验；这就是 P3 必须先解决的第一块短板。

### 1.3 科目表现状

`finance.core_finance_accounts` 实际数据（本地 `topems`）：

- 19,742 行、705 个租户、每租户约 28 个科目；4 位编码 16,922 行，6 位编码 2,820 行。
- `parent_id` 全空（0 行）；`balance_direction` 全空；`category` 全空；`is_leaf` 仅 3 行为 true。
- 层级只能靠编码规则（4 位一级、6 位二级）+ 6 位行的 `parent_code`（2,820 行有值）推导；`level` 仅有 1/2 且不可靠。
- `account_type` 枚举：`asset/liability/equity/income/expense/cost`；余额方向只能由类型推。
- **报表行 → 科目映射不存在**。`erp.consolidation_report_lines` 是合并报表的行容器（`item_code/item_level/current_period`），不承担单体科目归集。

### 1.4 合并模块 4 个 501 接口

| 接口 | 位置 | 预期依赖 |
|---|---|---|
| `GET /erp/consolidation/companies/{companyId}/financial-data` | `company_relations.rs:421-450` | 返回 `CompanyFinancialData`（`erp/src/models/consolidation.rs:286-311`）：流动资产/非流动/总资产、流动负债/非流动/总负债、实收资本/资本公积/盈余公积/未分配利润/权益合计、收入/成本/毛利/营业利润/税前利润/净利润、经营/投资/筹资/净现金流，**全部 f64** |
| `POST /erp/consolidation/reports/generate-report` | `consolidation/reports.rs:135-160` | 需要按合并范围逐主体取上述数据后汇总+抵消，当前拒绝写任何金额 |
| `GET /erp/consolidation/reports/export-report` | `reports.rs:196-211` | 依赖生成结果 |
| `POST /erp/consolidation/reports/{reportId}/publish` | `reports.rs:408-430` | 依赖生成结果与审批流 |

补充：`POST /erp/consolidation/execute-elimination`（`internal_transactions.rs:118-140`）也是 501，但属抵消执行，不计入这 4 个报表接口。

现状：这 4 个接口**都不调用 finance 报表**；ERP 侧唯一的 finance 跨服务调用是审批（`consolidation/common.rs:249` 的 `TypedServiceClient<FinanceApi>`）。finance 也没有任何报表客户端方法。

**P4 接法建议**：finance 新增一个「单主体报表快照」端点，一次返回 BS + IS + 现金流三块（字段对齐 `CompanyFinancialData`），ERP 通过现有 `TypedServiceClient<FinanceApi>` 按 scope 逐公司拉取后汇总/抵消。不要让 ERP 直读 finance 表，也不要把合并逻辑下沉到 finance。

---

## 二、口径结论

### 2.1 最小可用集合与顺序

**结论：同意「科目余额表 → 资产负债表 → 利润表」，但要补一个前置条件——先把期初余额接进 finance 并做一致性校验，否则「科目余额表」只是「科目发生额表」。**

理由：BS/IS 确实能从余额表推出来，但推导的前提是余额表同时给出期初、本期发生、期末三列。目前只有发生额；`erp.opening_balances` 能提供期初，但没有与 `ledger` 做过校验，也没有按 `account_id` 关联。顺序本身没错，真正的依赖是「期初口径先统一」。

第一批建议只做三张接口 + 一个共用聚合服务，现金流表不做（现有实现口径错误，重写成本高且可后置）。

### 2.2 报表行映射形态

**结论：用迁移种子的独立映射表，不加字段到 `accounts`，也不放代码常量。**

建议表：

```sql
finance.core_finance_report_line_map (
  report_type,        -- balance_sheet / income_statement
  line_code, line_name, line_level, sort_no, direction,
  match_type,         -- prefix / exact / range / account_id
  match_value,        -- '1122' / '1122%' / '1001-1012'
  company_id NULL     -- NULL = 平台默认，非空 = 租户/公司覆盖（P3 先不启用）
)
```

取舍：

- 同一科目可能进多个报表行（如应交税费拆分、成本类归存货），`accounts` 加一个字段表达不了；
- 报表格式随准则/监管口径变化，属于「版本化数据」，改表+发版比改代码发版更可控；
- 映射表可以给财务实施人员核对，代码常量做不到；
- 代价是多一次 join 和一张表的维护责任，但 P3 规模下可忽略。

过渡期允许先用代码常量跑通接口，但**目标形态是表**，不要两头都留。

### 2.3 资产负债表平衡校验怎么落

**结论：三道校验全部 fail-closed，不通过就不出报表（返回 409 + 差异明细），不做「看起来正常」的兜底。**

1. 期末恒等式：`资产合计 - (负债 + 权益) = 0`，容差 0.00（Decimal 精确比较）。
2. 试算平衡：全科目 `Σ期末借 + Σ期末贷` 按方向折算后相等。
3. 损益勾稽：`利润表净利润 = 本年利润(4103) 变动 + 未结转损益`。

前提条件：

- **未过账凭证天然排除**：`ledger` 只在过账时写入，草稿/已审核未过账不进报表。接口另行返回 `unposted_count / unposted_amount` 供前端提示，而不是把它们算进去。
- **成本类必须归行**：`cost` 类（5001/5101）余额若不归入存货/在建工程，资产会少计，等式必然不平。映射表里必须给成本类指定归属行。
- **损益结转**：期末未结转的损益净额要计入「本年利润 / 未分配利润」行，否则权益少计。当前 `year_end_close` 用 **3101/3103**（`periods.rs:365`），而 P2a 种子科目是 **4103/4104**（`20261108135000...sql:123`），**两边对不上，年结会直接失败**。这是 P3 第一笔必须先修的缺陷。
- 跨期：BS 取「期初 + 本期累计发生」；年结后损益科目清零、利润进 4103，次年 BS 自动接上。

### 2.4 金额精度与币种

- **精度**：账簿金额是 `numeric`（无精度上限），Rust 侧 `Decimal`，这部分是对的。问题在 API 边界：合并 DTO 全 `f64`、期初余额入参 `f64`、报表百分比 `f64`。**结论：报表金额一律 `Decimal`，JSON 序列化为字符串**（避免前端 JS 精度丢失）；只有比率字段允许 f64。
- **币种**：`ledger` 没有币种字段，`accounts.currency/default_currency` 未被业务读取，`hrm.companies.functional_currency` 只出现在 `schema_defense`（`svc/hrm/src/schema_defense.rs:21`），无任何报表逻辑使用。**结论：P3 不做多币种折算，报表口径固定为记账本位币（默认 CNY）**；外币业务在凭证层折算后只存本位币，原币/汇率字段留到 P4。`currency_code` 只作为报表持久化的展示/过滤维度。

---

## 三、需要拍板的分歧点

1. **损益结转频率**：只做年结（报表侧动态计算「本年利润」），还是恢复月结 `close-income`？影响利润表「本月/本年累计」口径与 BS 本年利润行。建议：P3 只做年结 + 报表侧动态推导，月结留 P4。
2. **成本类科目归属行**：5001/5101 期末余额进「存货」还是「在建工程/其他流动资产」？需要财务口径，映射表种子依赖它。
3. **映射表维护权**：平台固定（迁移种子）还是允许租户自定义报表行？建议 P3 平台固定，租户覆盖留 P4（表里预留 `company_id NULL` 语义）。
4. **`financial_reports` 加 `company_id`**：P3 必须加，且唯一键要从 `(report_type, org_id, period, currency_code)` 改为含 company_id。确认是否放在 P3 第一批迁移。
5. **`opening_balances` 是否迁回 finance schema**：建议 P3 先做只读适配 + 一致性校验，P4 再迁表，避免又出现跨 schema 双写。
6. **company 入参**：单公司租户是否允许省略 `company_id` 自动解析？建议强制显式传入（与 P2a fail-closed 一致），避免多主体时静默归集。
7. **合并 DTO 的 f64**：改为 Decimal 字符串会破坏 ERP/前端现有契约，是否接受？建议接受，在 P4 一次性改，P3 不做兼容层。

---

## 四、P3 第一批最小改动清单（下一步执行范围）

1. finance 报表聚合服务：按 `tenant_id + company_id + period` 输出科目余额表的期初/本期/期末。
2. 期初口径：读取 `erp.opening_balances`，与 ledger 期初校验，不平即报错。
3. 报表行映射表（迁移种子）+ BS/IS 生成改为映射驱动。
4. BS 三道平衡校验，失败返回 409 + 差异明细。
5. 修 `year_end_close` 的 3101/3103 → 4103/4104。
6. 修利润表收入符号（`SUM(credit-debit)`）。
7. `financial_reports` 增加 `company_id` 并调整唯一键。
8. 占位接口处置：`account-balance`/`account-ledger`/`dimension-detail`/三个 export 要么接真数据，要么显式 501（不允许继续返回空 200）。

---

## 五、证据索引

- 报表实现：`svc/finance/src/services/finance/report.rs:12/57/84/168/231`
- 报表接口：`svc/finance/src/modules/financial_reports.rs:1266/1423/1573/2106/2314`；占位：`svc/finance/src/modules/mod.rs:5201-5237`
- 报表持久化：`svc/finance/src/modules/financial_reports.rs:1124`（`finance.financial_reports`）
- 年结与科目不一致：`svc/finance/src/services/finance/periods.rs:365` vs `database/migrations/20261108135000_p2a_single_ledger_convergence.sql:123`
- 合并 501：`svc/erp/src/modules/consolidation/company_relations.rs:421`、`reports.rs:135/196/408`、`internal_transactions.rs:118`
- 合并 DTO：`svc/erp/src/models/consolidation.rs:286`
- 跨服务客户端：`svc/erp/src/modules/consolidation/common.rs:249`
- 科目与账簿数据口径来自本地 `topems` 只读查询（705 租户、19,742 科目；`parent_id`/`balance_direction`/`category` 填充率 0）。

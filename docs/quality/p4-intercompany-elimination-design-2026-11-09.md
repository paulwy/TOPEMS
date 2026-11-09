# P4 内部交易抵消：取证与口径设计

日期：2026-11-09　基线：`main@f2cee3a3a`
本轮范围：只读取证 + 口径结论。**未改代码、未改迁移、未写生产**；所有查询均为本地 `topems` 库只读 `SELECT`。

---

## 一、取证

### 1.1 相关表现状：结构、语义、行数

本地库行数（2026-11-09 快照）：

| 表 | 行数 | 作用 |
|---|---:|---|
| `erp.internal_transactions` | 0 | 内部交易台账，抵消的唯一输入 |
| `erp.consolidation_scopes` | 0 | 合并范围（一套合并规则集） |
| `erp.consolidation_scope_companies` | 0 | 合并范围内的法人主体 |
| `erp.company_relations` | 0 | 集团股权关系（母子公司树） |
| `erp.elimination_rules` | 0 | 抵消规则，**无种子数据** |
| `erp.consolidation_reports` | 0 | 合并报表结果 |
| `hrm.companies` | 3 | 法人主体主数据（`company_id` 指向这里） |
| `finance.core_finance_ledger` | 14 | 总账，已有 `company_id` |
| `finance.core_finance_vouchers` / `_lines` | 18 / 26 | 凭证与分录 |
| `finance.core_finance_aux_balances` | 2 | 辅助核算余额（仅 `customer` 类型） |
| `finance.core_finance_report_line_map` | 48 | P3 报表行映射（37 BS / 11 IS，`company_id` 全为 NULL 即平台默认） |

**`erp.internal_transactions`**（`database/migrations/20260725000000_business_base_tables.sql:3084` 建表）

- 主体维度：`from_company_id` / `to_company_id`（+ 冗余名称），`organization_id` 为历史字段，实际不用。
- 期间：`period varchar`，代码校验函数要求 `YYYY-MM`（`consolidation_calc.rs:145-149`），而 finance 账簿实际存 `YYYYMM`（本地样本 `202611`、`202501`）——**格式不一致**。
- 金额：`amount`、`eliminated_amount`、`remaining_amount` 均 `numeric`，默认 0；`elimination_status` 默认 `pending`，合法值 `pending/processing/eliminated/partial/error`（`consolidation_calc.rs:177-183`）。
- 关联：`voucher_id`、`elimination_voucher_id` 是裸 `uuid`，**没有指向 finance 凭证的外键**。
- 约束：`UNIQUE (transaction_no)` 是**全局唯一**，未带 `tenant_id`，多租户会撞号。
- 写入：**没有任何写接口**。路由只有 `GET /consolidation/internal-transactions` 与详情（`consolidation/mod.rs:70-77`），全仓也搜不到 `INSERT INTO erp.internal_transactions`。台账 0 行且无法录入。

**`erp.consolidation_scopes` / `consolidation_scope_companies`**

- scope：`organization_id`（发起合并的组织）、`code/name`、`consolidation_method`（合法值 `full/equity/cost/proportional`，`consolidation_calc.rs:172-174`）、`status`。**scope 本身没有期间字段**。
- scope 公司：`company_id` 有外键指向 `hrm.companies(tenant_id, id)`；`is_parent`、`control_type`、`ownership_percentage`、`consolidation_percentage`、`minority_interest`、`effective_date`、`expiry_date`。
- 这是"哪些公司属于同一合并范围、何时生效"的**唯一权威表**。

**`erp.company_relations`**

- `parent_company_id` / `child_company_id` 均外键到 `hrm.companies`；`relation_type`、`ownership/control_percentage`、`effective_date/expiry_date`、`status`。
- 语义是股权树，**不含合并范围资格**；同一对母子公司可以存在于多个 scope 中。

**`erp.elimination_rules`**

- 字段：`scope_id`、`code`、`name`、`type`、`direction`、`debit_account_codes jsonb`、`credit_account_codes jsonb`、`company_pairs jsonb`、`auto_elimination`、`priority`、`status`（`active/inactive/archived`）。
- 接口齐全（`GET/POST /consolidation/elimination-rules`、`GET/PUT/DELETE /{ruleId}`），前端也有维护入口。
- 但：`UNIQUE (code)` 同样**全局唯一**（未带 tenant/scope）；`company_pairs`、`debit_account_codes`、`credit_account_codes` 在线上执行链路中**从未被读取**（旧实现只 `SELECT *` 后忽略）。无任何迁移种子，0 行。

### 1.2 P0 下线的 `execute_elimination` 原来假设了什么

当前实现已整体下线为 501（`consolidation/internal_transactions.rs:117-140`），注释写明原因："把同一批 pending 交易按每条规则重复累计，再全部标记 eliminated，且没有内部交易匹配表"。

旧实现（`git show c4df7f3d7^:svc/erp/src/modules/consolidation/internal_transactions.rs` 的 `execute_elimination`）逻辑还原：

1. **规则从哪来**：按 `scope_id`（可选 `rule_ids`）+ `status='active'` 从 `erp.elimination_rules` 取规则，按 `priority` 升序。规则里的 `company_pairs`、借贷科目编码**完全没参与匹配**。
2. **如何匹配**：对**每一条规则**，重新查询 `erp.internal_transactions WHERE elimination_status='pending' AND period = $period`——只按期间，**不按公司对、不按科目、不按规则类型**。也就是说每条规则拿到的都是同一批全量待抵消交易。
3. **为什么重复累计**：
   - 同一批交易被每条规则重复汇总进 `total_eliminated`（虽然更新后后续规则理论上查不到，但更新用 `.ok()` **吞掉了失败**；一旦 RLS/写失败导致状态没变，下一轮就会再次全额累加）。
   - 按 `rule_ids` 分批调用时，每批都重新扫全量 pending，重复计数的概率更高。
   - 汇总用 `amount` 而非剩余额，`eliminated_amount` 直接写成全额，`remaining_amount` 从不更新（默认恒 0），三个金额字段之间没有守恒关系。
4. **没有产出**：只改台账状态，**不生成任何抵消分录**；`elimination_voucher_id` 永远为空。金额全程 `f64`（`models/consolidation.rs:157-172` 的 `EliminationResult`）。
5. **现成的正确原语没被使用**：`consolidation_calc.rs:80-111` 的 `calculate_elimination_step(amount, prior_eliminated, eliminated_limit)` 已经实现了"按上限分次抵消 + 剩余额"的守恒计算，执行层完全没调用它。

附带缺陷：抵消工作底稿导出（`elimination_rules.rs:351-396`）按 scope 取了规则，却把 `erp.internal_transactions` **全表**（无 scope、无公司对过滤）塞进底稿，底稿本身不可信；接口路径声明与实际路由也不一致（声明 `/elimination-rules/export-elimination-worksheet`，实际挂 `/scopes/{scopeId}/elimination-worksheet/export`）。

### 1.3 内部交易的可识别信号

| 信号 | 是否存在 | 证据 | 可用性 |
|---|---|---|---|
| 凭证/分录带对方公司 | 否 | `core_finance_voucher_lines` 只有 `company_id`（本方法人）、`aux_type/aux_id`（业务对象，无公司语义）；`core_finance_ledger` 同 | 不可用 |
| 1122/2202 辅助核算挂公司 | 否 | `aux_type` 枚举为 `project/department/customer/supplier/employee/custom1-3`（`models/mod.rs:849-870`），没有"集团内公司"；本地 26 行分录仅 4 行带 `customer`，1122/2202 分录挂 aux 为 **0 行**；`aux_balances` 仅 2 行 `customer` | 现状不可用，且客户/供应商主数据本身没有 `company_id` 或"对应集团主体"字段 |
| 业务单据双公司字段 | 否 | `erp.sales_orders` / `erp.purchase_orders` 既无 `company_id` 也无 `organization_id`，只有 `customer_id/supplier_id`（本地 1 张销售单、0 张采购单） | 连本方主体都没有，不可用 |
| 台账 from/to | 有表无数据 | `internal_transactions` 0 行、无写接口 | 需要先补录入口 |
| 凭证文本/摘要匹配公司名 | 弱 | 无结构化约束，改名即失效 | 只能作人工线索 |

**能自动识别到什么程度**：只能做到"候选发现"——同一 scope 内、同一期间、金额相等（分位）、一边走 1122 贷方、另一边走 2202 借方，且 `aux_type` 指向同一客户/供应商。**无法自动定性为集团内部**，因为客户/供应商与 `hrm.companies` 之间没有任何映射；摘要文本匹配不可作为记账依据。

**识别不了的靠什么补**：人工登记。费用互摊、直接挂其他应收付、非往来科目结算的内部交易，当前没有任何自动信号。

### 1.4 P3 已落地能力对 P4 的支撑

| 能力 | 位置 | 对 P4 的价值 |
|---|---|---|
| `GET /reports/account-balance?company_id&period` | `svc/finance/src/modules/mod.rs:5699` → `report.rs:322-523` | 按公司+期间给出每个科目的期初/本期借/本期贷/累计/期末，含 `unposted` 提示。**这是按主体归集科目余额的现成数据源**，可直接取 1122/2202 余额做对账 |
| `POST /reports/balance-sheet/generate`、`/reports/income-statement/generate` | `financial_reports.rs:1289-1348`、`2568-2583` | 按公司+期间生成法定报表，映射表驱动、409 fail-closed、结果落 `finance.financial_reports(company_id)`。合并时逐主体取数可用 |
| 报表行映射 | `database/migrations/20261109110100_p3_report_line_map.sql` | 48 行平台默认映射（37 BS / 11 IS），支持 tenant/company 覆盖（`report.rs:633-646`） |
| 账簿主体维度 | `core_finance_ledger/vouchers/voucher_lines/opening_balances` 均有 `company_id` | P3 之前"财务总账无主体维度"的结论已过时；`get_company_financial_data` 的 501 注释（`company_relations.rs:445-449`）需要同步更正 |
| 未过账口径 | `report.rs:874-884` | 合并取数沿用"只取已过账、未过账只提示"的口径，避免把草稿抵消分录算进合并数 |

**缺口（P4 必须自己解决）**：

- 科目表是租户级共享（`core_finance_accounts` 无 `company_id`），各主体科目体系一致；这对合并有利，但科目对照不能按公司配置。
- 余额表没有"对方公司/对方对象"维度，无法直接回答"对 A 公司应收多少"。
- `trial-balance` / `account-ledger` 仍只按租户过滤，没有 `company_id`，不能用于合并取数（应统一走 account-balance）。
- 期间格式：finance 是 `YYYYMM`，erp 合并校验是 `YYYY-MM`（`consolidation_calc.rs:145-149`），跨服务必须显式归一。

---

## 二、口径结论

### 2.1 内部交易识别方式

**结论：台账为主路，凭证扫描只产候选，业务单据级暂不参与；三者不并列。**

- **主路（唯一事实源）= 内部交易台账** `erp.internal_transactions`。由业务/财务在交易发生时登记（P4 需补写接口），必须包含双方公司、期间、类型（往来/购销）、金额、双方凭证号。抵消与对账只认台账，不认扫描结果。
- **辅路（候选生成器）= 凭证级扫描**。规则：同一 scope、同一期间、金额在分位相等、一方 1122 贷/一方 2202 借（购销则 6001 贷 / 6401 借）、且 `aux_id` 指向同一业务对象。扫描只生成"待确认候选"，人工确认后才写台账并回填 `voucher_id`。**不允许扫描结果直接触发抵消。**
- **业务单据级关联 = 暂不参与**。销售/采购单据目前连本方主体都没有，谈双公司关联为时过早；等 `sales_orders/purchase_orders` 补 `company_id`（及对方公司）后再作为候选线索接入。
- **人工兜底**：无往来科目挂账的内部交易靠纯人工登记，这是主路的一部分，不是例外。

理由：现有数据里没有任何可信的对方公司标识（1.3），任何"自动认定"都会重演 P0 的错误——用不可靠的匹配产出可信度为零的金额。

### 2.2 对账口径

- **维度**：`期间(YYYYMM) × 公司对(from, to) × 类型(往来/购销) × 科目配对`。往来按 1122↔2202 的期末余额对；购销按 6001↔6401 的本期发生额对。**不做单据级对账**——台账没有双方单据号，单据级要等台账补字段后再开。
- **容忍度**：**0.00 元**。全链路 `Decimal`，比较前统一量化到分（0.01）；差 1 分即为差异，不做"几分钱忽略"。多币种 P4 不做（账簿无币种字段，P3 已确定本位币口径）。
- **状态机**：

  ```
  unmatched(未达) ──确认一致──> confirmed(已确认) ──凭证过账──> eliminated(已抵消)
        │                              │
        └──────── 争议 ────────────────┴──> disputed(争议)
  ```

  - `unmatched`：双方金额不等，或只有一方有记录。
  - `confirmed`：双方一致，锁定对账金额；`remaining_amount > 0` 表示部分抵消，状态仍是 `confirmed`。
  - `eliminated`：抵消凭证已过账，终态，不可回退；要更正只能红冲后新建。
  - `disputed`：任一环节可进入，需人工处理；争议未关闭前不得出合并报表。

### 2.3 抵消分录生成

- **配对范围**（P4 第一批只做两对）：
  - 往来：借 `2202 应付账款` / 贷 `1122 应收账款`，按公司对、按对账确认金额，取双方较小值。
  - 内部购销：借 `6001 营业收入` / 贷 `6401 营业成本`，同额，只对已确认的内部销售/采购。
  - 存货未实现利润（1405）**不在第一批**，留到内部交易台账能标记"是否已对外销售"之后。
- **差额**：**不生成差额分录，不进损益**。未确认差额留在对账差异里；差异未清零（`remaining_amount != 0` 或状态为 `unmatched/disputed`）就阻断合并出表（fail-closed，与 P3 的 409 口径一致）。双方确认后仍有永久性差额的，走人工核销，不自动记账。
- **审核**：抵消分录以 **finance 凭证草稿**生成（`source_module='consolidation_elimination'`，`source_id` 存幂等键），必须**人工审核后才过账**；未过账凭证不计入合并金额，仅在页面上以未过账提示呈现。生成、审核、过账三个动作分属不同权限。
- **金额类型**：请求与响应一律 `Decimal`，JSON 序列化为字符串；不再出现 `f64`。

### 2.4 与 P0 已下线接口的关系

**结论：契不沿用，重新设计；旧路径永久 410 Gone，不保留半可用状态。**

新契约拆两步，都是"先算后写"：

| 接口 | 语义 |
|---|---|
| `POST /erp/consolidation/eliminations/preview` | 纯 dry-run：按 scope + period 计算匹配、差异、拟生成分录与合计，**不写任何表** |
| `POST /erp/consolidation/eliminations/execute` | 幂等执行：写入对账/台账状态，生成 finance 草稿凭证；`idempotency_key` 必传，重复调用返回同一结果 |

- 请求体：`{ scope_id, period: "YYYYMM", company_pairs?, rule_ids?, idempotency_key }`；响应金额为字符串。
- **规则必须落到"规则→交易"匹配结果**（新增 `elimination_matches`），执行时只按匹配结果逐条抵消，禁止"按规则重扫全量 pending"——这是对 P0 重复累计缺陷的正面修复。
- 旧的前端客户端 `executeElimination`（`apps/web/src/api/consolidation/index.ts:182-193`）当前未被任何页面调用，应随契约改造删除或改路径。

### 2.5 合并范围边界

**确认：抵消只发生在同一 scope、同一期间、且双方都在 `consolidation_scope_companies` 内并处于有效期内的公司对之间。**

- 资格判定只看 scope 成员表：scope `status='active'`，`effective_date ≤ 期末`，`expiry_date IS NULL OR expiry_date ≥ 期末`。`is_parent` 只影响合并层级呈现，不影响抵消资格。
- 跨 scope、scope 外公司、已过期成员的往来，一律视为外部交易：照常计入合并数与未实现利润，**不抵消、不出消除分录**。
- `company_relations` 只用于股权树展示与持股/控制比例推导，**不作为抵消资格判定依据**。需要多层合并时建多个 scope，不允许跨 scope 混合抵消。

---

## 三、需要拍板的分歧点（5 条）

1. **台账为唯一事实源**：接受"自动扫描只产候选、台账才是抵消依据"这一前提吗？代价是内部交易必须人工登记，漏登即漏抵消；收益是不会再产出不可信金额。
2. **是否补"客户/供应商 → 集团内公司"映射表**：这是凭证扫描从"候选"走向"半自动"的唯一可行前置。做，就要同时维护主数据映射；不做，就只能纯人工到 P5。
3. **永久性差异的核销方式**：确认"不设差异科目、不自动进损益、只做人工双边调账"，还是要在 P4 新增"内部往来差异"过渡科目？后者会动科目表与报表映射。
4. **抵消凭证的审批归属**：复用 finance 现有凭证流（草稿→审核→过账）并做生成/审核/过账三权分离，还是由 ERP 侧审批完成后一次性调 finance 过账？
5. **契约与期间格式**：确认旧 `execute-elimination` 改 410、启用 `eliminations/preview|execute` 新路径，并把 ERP 合并侧期间统一为 `YYYYMM`（现有校验 `YYYY-MM` 需改）？

---

## 四、P4 第一批最小改动清单（提议，不在本轮执行）

1. `internal_transactions` 写接口（单条 + 批量导入）与约束修正：`UNIQUE (transaction_no)` 改为 `(tenant_id, transaction_no)`；`remaining_amount` 由计算写入，不允许默认 0 长期挂账。
2. 新增 `erp.elimination_matches`（`rule_id, transaction_id, matched_amount, status`）作为规则与交易之间的唯一绑定；执行只按它走。
3. 对账服务：按 scope/period/公司对/科目配对汇总，落状态机；全部 `Decimal`。
4. `eliminations/preview` 与 `eliminations/execute`，执行对接 `calculate_elimination_step`，通过 finance 凭证接口生成草稿并回填 `elimination_voucher_id`。
5. 期间归一（`YYYYMM`）+ 旧 `execute-elimination` 改 410 + 删除未使用的前端旧契约。
6. 清掉 `EliminationResult.eliminated_count/total_eliminated` 的 `f64`，与 `CompanyFinancialData` 一并改字符串金额。
7. 测试：跨 scope 不抵消；重复 execute 幂等；未过账抵消凭证不计入合并；有未达差异时拒绝出合并报表。

---

## 五、证据索引

- 台账与抵消执行：`svc/erp/src/modules/consolidation/internal_transactions.rs:22-79`（列表）、`:117-140`（P0 下线 501）、`:142-199`（权限/501 测试）
- 旧实现：`git show c4df7f3d7^:svc/erp/src/modules/consolidation/internal_transactions.rs`（P0 提交 `c4df7f3d7` 前）
- 路由（无台账写接口）：`svc/erp/src/modules/consolidation/mod.rs:40-124`
- 台账/规则/结果模型：`svc/erp/src/models/consolidation.rs:77-94`（规则）、`:127-172`（台账与 f64 结果）
- 抵消计算原语：`svc/erp/src/modules/consolidation_calc.rs:80-111`；校验：`:145-183`
- 工作底稿缺陷：`svc/erp/src/modules/consolidation/elimination_rules.rs:351-396`
- 公司财务数据 501（注释已过时）：`svc/erp/src/modules/consolidation/company_relations.rs:426-450`
- 合并范围外键：`consolidation_scope_companies` → `hrm.companies(tenant_id, id)`；`internal_transactions` 无外键（`pg_constraint` 只读查询）
- 建表：`database/migrations/20260725000000_business_base_tables.sql:3078`（规则）、`:3084`（台账）
- P3 报表能力：`svc/finance/src/services/finance/report.rs:322-523`（科目余额）、`:580-850`（法定报表映射）、`:874-884`（未过账口径）；接口：`svc/finance/src/modules/financial_reports.rs:1283-1348`、`:2566-2583`
- 报表行映射种子：`database/migrations/20261109110100_p3_report_line_map.sql`（48 行）
- 前端旧契约：`apps/web/src/api/consolidation/index.ts:182-193`；公司主数据：`apps/web/src/api/hrm/company.ts:14`
- 行数与字段均来自本地 `topems` 只读查询（2026-11-09）；生产未触碰。

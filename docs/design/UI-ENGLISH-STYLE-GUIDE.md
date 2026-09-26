# TOPEMS UI English Style Guide（V227 X-P0 Phase-4）

> 生效日期：2026-08-15
> 适用范围：apps/web/src/i18n/locales/en/*.json 全部 66 命名空间
> 配套脚本：`scripts/i18n/apply_glossary.js`（通用 UI 术语强制对齐）、`scripts/i18n/finance_refine.js`（Finance 领域精修）、`scripts/i18n/hrm_refine.js`（HRM 领域精修）

本指南是 `glossary.csv`（通用 UI 术语表）的细化补充，用于界定**同一语义在不同 UI 语境下的英文口吻**。所有新增/修改 en.json 文案时须遵守：原则上机器翻译 + glossary 强制对齐后，再按本文件抽检修正。

---

## 1. 标题与标签（Header / Label / Column）

| 条目 | 规则 | 正确示例 | 错误示例 |
|------|------|---------|---------|
| 句首大写 | 每个词（实词）首字母大写；冠词 a/an/the ≤3 字母在句中时小写（句首时大写） | `Purchase Order No.` / `Created At` / `End of Probation` | `Purchase order no.` / `created at` |
| 结尾标点 | 不加句号/感叹号/问号 | `Department` | `Department.` |
| 缩写标点 | No. / Qty. / Dept. / Avg. / Min. / Max. / Est. 必须加句点；ID / KPI / OKR / VAT 不加 | `Invoice No.` `Qty.` `ID` | `Invoice No` `Qty` `I.D.` |
| 单复数 | 列表过滤器用复数（`All Statuses`）；列头表单项用单数（`Status`） | 过滤器：`All Types`；列头：`Type` | `All Type` `Types` |
| 信息区块标题 | `Xxx Info`（简写，优先）或 `Xxx Information`；**全产品统一一种** | `Basic Info` | `Basic Information`（允许 2 选 1，但不得混用） |
| 时间字段 | `Created At` / `Updated At` / `Deleted At`（两词大写） | `Updated At` | `Update Time` / `UpdateTime` / `update_at` |
| 日期范围 | `Start Date` / `End Date`（非 Begin/Finish 或 Open/Close） | `Contract Start Date` | `Contract Begin Date` |

---

## 2. 按钮与动作（Button / Action）

| 条目 | 规则 | 正确示例 | 错误示例 |
|------|------|---------|---------|
| 动词原形 | 必须动词原形（祈使句），不加 to / ing | `Save` / `Cancel` / `Confirm Delete` | `Saved` / `Cancelling` / `To delete` |
| 句首大写 | 每个单词首字母大写 | `Add Employee` `Create Voucher` | `add employee` |
| 确认类动作 | `Confirm` / `Cancel` 搭配；`Accept` / `Decline` 仅用于 Offer / NDA / 要约类 | 删除：`Confirm Delete` + `Cancel` | `Confirm` + `No` |
| 危险动作 | 文案必须包含动作名，不得仅 `OK` / `Yes` | `Confirm Delete` / `Confirm Terminate` | `Yes` / `OK` |
| 结果性 toast | `X successfully`（被动式 + successfully）；驼峰空格全部小写 | `Voucher posted successfully` | `VoucherPostSuccess` / `Success` |
| 失败性 toast | `X failed`（小写 failed，前面动词用过去式，Create/Delete/Update/Load 统一） | `Delete failed` | `DeleteFailed` / `Deletion failed` |
| 批量操作 | `Batch Xxx` 前缀 | `Batch Post` / `Batch Export` | `Post All` / `Multi Export` |

---

## 3. 状态标签（Status Badge / Status Column）

| 条目 | 规则 | 正确示例 | 错误示例 |
|------|------|---------|---------|
| 形容词/过去分词优先 | 状态描述优先用过去分词（V-ed）或形容词，不用动词原形（按钮态） | `Posted`（已过账）/ `Enabled`（已启用）/ `Completed` | `Post` / `Enable`（按钮动词） |
| 动作 vs 状态 | Disable = 按钮「停用」；Disabled = 状态「已停用」；**务必区分** | 按钮：`Disable`；状态：`Disabled` | 状态值写 `Disable` |
| 流程状态三态 | Pending（待处理）/ In Progress（进行中）/ Completed（已完成）- 三条主线 | 工单：`Pending` → `In Progress` → `Completed` | `Open`（混用）/ `Running`（仅服务）/ `Done`（非专业） |
| 审批状态专用 | Pending Approval（待审批）/ Approved（已通过）/ Rejected（已驳回） | — | `Audited`（走审计/审核才用） |
| 审核状态专用（Review vs Audit 区分） | Pending Review / Reviewed（复核完成）/ Audit 仅合规/审计语境 | — | Audit 用于 QMS/财务审计 |
| 启用停用三态 | Enabled / Disabled / Inactive（HRM 员工停薪留职/未激活专用） | — | 三态混用 |

---

## 4. 空态（Empty State）与提示文案（Hint / Tip / Notice / Warning）

| 条目 | 规则 | 正确示例 | 错误示例 |
|------|------|---------|---------|
| 空态通用句式 | `No {Noun Plural}` + 无标点 | `No data` / `No employees` / `No results` | `No Data` / `NoData` / `No data.` |
| 更友好的空态 | `No {Noun} yet` 或 `{Context} is empty` 二选一 | `No employees yet` / `This list is empty` | `N/A`（不礼貌）/ `Empty`（机器感） |
| Hint（小提示） | 写简短操作提示，动词原形开头 | `Tip: Press Enter to search` | `Tips: You should press Enter to perform a search` |
| Notice（通知） | 偏正式通知，写完整句子 + 首字母大写 | `Notice: System maintenance scheduled on Saturday.` | 小提示用 Notice 导致语境过重 |
| Warning（警告） | 严肃提示风险，语义精准 | `Warning: This action cannot be undone.` | `Warn: xxx` / 小提示写成 Warning |
| Error（错误） | **错误类型 + 说明**；禁止仅 `Error` | `Error: Failed to load data. Please try again.` | `Error occurred` |
| 校验错误 | 具体字段 + 动词被动 + required/invalid 说明 | `Voucher date is required` / `Invalid email format` | `Please input voucher date`（Please 不用于校验错误） |
| 占位提示（placeholder） | `Search {noun}...` / `Enter {noun}`；首字母大写 + 末尾省略号 | `Search employee...` / `Enter department name...` | `请输入...`（残留中文）/ `Search Employee`（无省略号） |

---

## 5. 语法与格式细节

| 条目 | 规则 | 正确示例 | 错误示例 |
|------|------|---------|---------|
| Oxford comma | 列表中 A, B, and C（最后逗号保留，与英文科技写作一致） | `Accounts receivable, accounts payable, and general ledger.` | 缺逗号 `X, Y and Z` |
| 冠词一致性 | 可数名词首次出现加 a/an；特指加 the | `Create a voucher.` `The voucher has been posted.` | `Create voucher.`（无冠词） |
| 主谓一致 | Each / Every 后接单数动词；复数名词接复数动词 | 每个员工 **has** / 所有员工 **have** | `Each employee have` |
| 时态一致性 | 操作说明/按钮文案用一般现在时；Toast 结果用一般过去时被动 | 按钮：`Save`；Toast：`Saved successfully` | 按钮：`Saved` |
| 连字符 / 复合形容词 | 前置定语用连字符：5-year plan；后置不用：5 years old | `10-year amortization` / `Full-time employee` | `10 year amortization` / `Fulltime` |
| 数字与单位 | 数字与单位之间加空格；百分比无空格（% 符号标准） | `5 MB` / `100 %` 或 `100%` / `¥100` | `5MB` / `100 %` 随意 |
| 货币与金额 | 符号在前，数字在后；CNY/USD 缩写 + 数字 | `¥10,000.00` / `USD 1,234.56` / `CNY 500` | `10,000 元` / `10000 CNY`（千分位也缺） |
| 日期格式 | `YYYY-MM-DD` 展示格式，文本写作 `August 15, 2026`（美式）或 `15 August 2026`（英式）；统一一种 | `2026-08-15` | `08/15/2026`（月/日/年，歧义） |

---

## 6. 中国语境特殊译法速查（避免直译中式英文）

| 中文 | 正确英文 | 错误英文（禁用原因） |
|------|---------|-------------------|
| 五险一金 | Social Insurance & Housing Fund | Five Insurances and One Fund（外行完全看不懂） |
| 社保 | Social Insurance | Social Security（美国社会安全局养老金专用） |
| 住房公积金 | Housing Fund | Housing Accumulation Fund（直译不地道） |
| 竞业限制 | Non-Compete Agreement | Competition Limitation（中式直译） |
| 增值税专用发票 | Special VAT Invoice | VAT Specialized Invoice / VAT Special Invoice（顺序不标准） |
| 凭证 | Voucher | Certificate（证书）/ Proof（法律证据） |
| 台账 | Ledger（财务台账）/ Register（登记台账）/ Log（运行台账） | Platform Account（完全错） |
| 审批 | Approval | Audit（审计，不等于审批） / Review（复核） |
| 审核 | Review | Audit（仅独立第三方审计） |
| 离职员工 | Terminated Employees | Inactive Employees（非活跃，含休假）/ Resigned（仅辞职） |
| 绩效考核 | Performance Review | Performance Check（口语）/ Check 非专业 |
| 累计折旧 | Accumulated Depreciation | Total Depreciation（总和≠账面累计） |
| 账龄分析 | Aging Analysis | Account Age Analysis（中式直译） |
| 过账 | Post（动词）/ Posted（状态） | Transfer（转账，不是过账） |
| 反过账 | Unpost | Reverse Transfer（完全错） |
| 作废凭证 | Void Voucher | Cancel Voucher（取消≠作废） |
| 期末关账 | Period Closing | End Closing（中式） |
| 期初余额 | Opening Balance | Beginning Balance（会计学 Opening 是标准） |
| 期末余额 | Closing Balance | End Balance / Ending Balance（Closing 是会计标准） |
| 应收应付 | Receivables & Payables | Payable & Receivable（顺序错；应收在前惯例） |
| 成本中心 | Cost Center | Cost Department（部门≠中心） |

---

## 7. 产品内常见多语境区分速查

| 中文词 | 语境 | 英文 |
|--------|------|------|
| 状态 | 表格列头 / 过滤器 | Status（列头单数 / All Statuses 过滤器） |
| 状态 | 服务健康 / 进程存活 | Health |
| 状态 | 订单/单据流程 | Status（通用） |
| 状态 | 开关类（按钮/功能） | Enabled / Disabled |
| 审批 | 流程动作（"审批通过"） | Approve（动词）/ Approved（状态） |
| 审批 | 审批中（状态） | Pending Approval |
| 审核 | 复核/QC 检查动作 | Review（动词）/ Reviewed（状态） |
| 审核 | 审核中（状态） | Pending Review |
| 审计 | 合规/第三方审计 | Audit（名词/动词通用） |
| 记账 | 凭证登记到账簿 | Post（过账）/ Journalize（日记账） |
| 记账 | 手工做账 | Bookkeeping（簿记概念） |
| 计划 | 生产/采购/订单计划（APS/MRP） | Plan |
| 计划 | 日程/排程（调度） | Schedule |
| 计划 | 项目计划（甘特） | Project Plan |
| 任务 | 工作项/代办（通用） | Task |
| 任务 | 后台批处理 | Job |
| 任务 | 工序/工位任务（MES） | Operation / Work Order Operation |

---

## 8. 自动化验证脚本与本指南的关联

| 脚本 | 覆盖章节 | 触发方式 |
|------|---------|---------|
| `scripts/i18n/build_glossary.js` | 所有章节（发现不一致入口） | 手动；产出 `glossary_multi.csv` 人工审核 |
| `scripts/i18n/apply_glossary.js` | §1-§4 高频 61 条术语强制对齐 | 手动；--dry-run 后实跑 |
| `scripts/i18n/finance_refine.js` | §6 Finance 专业术语 89 条 | 手动；仅修改 finance 相关命名空间 |
| `scripts/i18n/hrm_refine.js` | §6 HRM 专业术语 168 条 | 手动；仅修改 hrm 相关命名空间 |
| `scripts/i18n/scan-hardcoded-precise.cjs` | §1-§5（检查残留中文硬编码） | pre-commit + CI |
| 人工 spot-check 抽检 | §5 语法格式 / §6 特殊译法 细节 | 每次大版本 en 翻译更新后人工抽检 components/pages 各 250 条 |

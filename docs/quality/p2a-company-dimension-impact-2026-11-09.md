# P2a 影响面清单：总账/凭证/余额引入 `company_id`

- 日期：2026-11-09
- 范围：只读分析。未改代码、未写迁移、未对生产执行任何 DDL/DML。
- 取证对象：生产 `xingzhai@192.168.110.115` / `topems_prod`（PostgreSQL 18.4，72 MB，1346 张表）；本地 `topems` 仅作对照，标注为“非生产”。
- 前置：P1 法人主数据与 `core_user_company_scopes` 已进 main，但生产部署由另一条线负责；本文不依赖生产已应用 P1，也不与其迁移并发。

---

## 0. 结论摘要（供“做 / 不做 / 缩小范围”决策）

**建议：做，但只做阶段 A（7 张表），现在做。**

| 判断项 | 实测事实 | 决策含义 |
|---|---|---|
| 生产总账数据量 | 27 张总账相关表 **全部 0 行**；`n_tup_ins=0`；统计自建库未重置（`stats_reset=NULL`） | 回填风险为 0，是加维度最便宜的时间窗口 |
| “推不出公司”的行数 | 生产 **0 行 / 0.00%**；本地非生产 27 行，按单公司规则可 100% 归属，人工 0 行 | `NOT NULL` 无数据阻塞 |
| 结构可推导性 | 主账套 `finance.core_finance_vouchers` 及其子表**没有任何组织/账簿字段**；`erp.financial_vouchers.organization_id` 实际存的是 `tenant_id` | 不能靠历史字段推导，必须由写路径显式传 `company_id` |
| 代码改动量 | 20 个非测试 Rust 文件、155 处表引用（45 处 INSERT + 约 110 处读） | 不是“加一列”，是一次跨服务写入契约改造 |
| 合并/报表性能 | 合并模块当前**不读任何总账表**（P0 后报表返回 `not_implemented`） | P2a 不会恶化现有合并查询；收益要到 P3 才兑现 |
| 最大风险 | 两套并行总账（`erp.*` 与 `finance.core_finance_*`）都要加维度 | 若不先收敛账套，P2a 成本翻倍且口径分裂 |

---

## 1. 表清单与行数（生产实测）

### 1.1 总量

| 指标 | 实测值 |
|---|---|
| 数据库大小 | 72 MB |
| 业务表总数 | 1346 |
| 总账相关表 | 27 张，合计 **0 行** |
| 累计插入（`pg_stat_user_tables.n_tup_ins`） | 全部 0 |
| 统计窗口 | `stats_reset = NULL`（建库以来未重置）；实例启动 2026-11-06 04:21 |
| 法人主数据 | `hrm.companies` = **1 行**（`企业全称（请修改）`，`code=COMP-0A0000000000`，`functional_currency=CNY`，`organization_id = tenant_id`） |
| 合并范围/关系 | `erp.consolidation_scope_companies` = 0，`erp.company_relations` = 0 |
| 用户/员工 | `iam.users` = 2，`hrm.employees` = 0 |

> 增长率结论：生产总账数据增长率为 **0 行/日**（建库 3 天内累计插入 0）。任何回填成本估算的分母都是 0。

### 1.2 逐表清单

| # | 表（生产实测行数） | 代码引用（非测试） | 现有 `company_id` | 单公司语义？ | P2a 归类 |
|---|---|---|---|---|---|
| 1 | `erp.financial_vouchers` (0) | 16 处 / 2 文件 | 无，只有 `organization_id`（=tenant） | 否 | **阶段 A** |
| 2 | `erp.voucher_items` (0) | 16 处 / 2 文件 | 无；有 `department_id` | 否（可经部门推） | **阶段 A** |
| 3 | `erp.opening_balances` (0) | 17 处 / 2 文件 | **已有且必填**（API 层 `Uuid`） | 否 | **阶段 A（补 FK/唯一键）** |
| 4 | `erp.vouchers` (0) | 5 处 / 1 文件（事件处理器） | 无 | 遗留事件凭证 | 阶段 B |
| 5 | `erp.account_balances` (0) | 4 处 / 1 文件 | 无 | **是库存余额，不是总账** | **排除** |
| 6 | `finance.core_finance_vouchers` (0) | 59 处 / 7 文件 | 无，仅有 `tenant_id` | 否 | **阶段 A** |
| 7 | `finance.core_finance_voucher_lines` (0) | 26 处 / 6 文件 | 无 | 否 | **阶段 A** |
| 8 | `finance.core_finance_ledger` (0) | 17 处 / 6 文件 | 无 | 否 | **阶段 A** |
| 9 | `finance.core_finance_aux_balances` (0) | 4 处 / 1 文件 | 无 | 否 | **阶段 A** |
| 10 | `finance.core_finance_aux_accounts` (0) | 7 处 / 1 文件 | 无 | 辅助档案可租户共享 | 阶段 B |
| 11 | `finance.core_finance_periods` (0) | 11 处 / 3 文件 | 无 | 期间可租户级 | 阶段 B |
| 12 | `finance.core_finance_accounts` (0) | 30 处 | 无 | 科目表，租户级 | 不加维度 |
| 13 | `finance.core_finance_currencies`（16 行，非总账） | 2 处 | 无 | 是 | 不加维度 |
| 14 | `finance.accounting_subjects` (0) | — | 无 | 是 | 不加维度 |
| 15 | `finance.vouchers` (0) | **0 处** | `entity_id`（无写入方） | — | **死表，清理** |
| 16 | `finance.voucher_lines` (0) | **0 处** | — | — | **死表，清理** |
| 17-25 | `public.core_finance_*` 9 张（均为 0 行，多数只有 `id,deleted_at` 两列） | **0 处** | 无 | — | **影子残表，清理** |
| 26-27 | `finance.finance_voucher_template_lines` / `_generation_rules` (0) | 模板引用 | 无 | 是 | 不加维度 |

### 1.3 现有索引（决定唯一键是否需要扩列）

| 表 | 现有唯一/主要索引 | 引入 `company_id` 后的冲突 |
|---|---|---|
| `erp.financial_vouchers` | `uq_finance_voucher_tenant_period_no (tenant_id, period, voucher_number) WHERE deleted_at IS NULL` | 多主体下凭证号可重复，**必须扩为 `(tenant_id, company_id, period, voucher_number)`** |
| `finance.core_finance_aux_balances` | `uq_aux_balance (tenant_id, account_id, aux_type, aux_id, period)` | 同科目同辅助项跨主体会撞键，**必须扩列** |
| `finance.core_finance_vouchers` | `idx_voucher_tenant_id`、`idx_voucher_period`、`idx_voucher_status` | 无 `(tenant, company, period)` 复合索引 |
| `finance.core_finance_ledger` | `idx_ledger_period`、`idx_ledger_tenant_id`、`idx_ledger_account_id` | 单列索引，主体过滤会退化为 Filter |
| `erp.voucher_items` | 仅 `idx_erp_voucher_items_tenant` | 无按凭证/主体读取索引 |
| `erp.opening_balances` | 仅主键 | 无 `(tenant, company, period, subject_code)` 唯一约束 |

> 结论：P2a 不只是 `ADD COLUMN`，还包括 **3 个唯一键扩列**（`erp.financial_vouchers`、`erp.opening_balances` 新增、`finance.core_finance_aux_balances`）。

---

## 2. 回填推导口径与“推不出”量化

### 2.1 逐表推导路径

| 表 | 可推导依据 | 判定 |
|---|---|---|
| `erp.financial_vouchers` | `organization_id` —— 但 `hrm` 建户逻辑写入的是 `tenant_id`（`svc/hrm/src/modules/setup.rs:156,298`），是租户级而非公司级 | 单公司租户可映射；**多公司租户不可推导** |
| `erp.voucher_items` | 优先 `voucher_id → financial_vouchers`；其次 `department_id → hrm.departments.company_id`；`organization_id` 同上是租户级 | 可推导（依赖头表先有值） |
| `erp.opening_balances` | 已有 `company_id`，由 API 入参显式提供 | 无需回填；**缺 FK，脏值未校验** |
| `erp.vouchers` | 无组织字段，事件处理器直接写 | 不可推导 |
| `finance.core_finance_vouchers` | **无组织、无账簿、无部门**；只有 `tenant_id`、`created_by` | **结构不可推导** |
| `finance.core_finance_voucher_lines` | `voucher_id` 继承头表 | 头表定则子表定 |
| `finance.core_finance_ledger` | `voucher_id` 继承；另有 `aux_id` | 同上 |
| `finance.core_finance_aux_balances` | `account_id + aux_type + aux_id`，无 `voucher_id` | **结构不可推导**（只能继承租户唯一主体） |
| `erp.account_balances` | 物料+仓库变动，非总账 | 不适用 |

### 2.2 “推不出公司”的硬数字

| 口径 | 总量 | 可推导 | 推不出 | 需人工 | 占比 |
|---|---|---|---|---|---|
| **生产（27 张总账表）** | **0 行** | 0 | **0 行** | 0 | **0.00%** |
| 本地非生产（凭证 9 + 分录 16 + 明细账 2） | 27 行 | 27（1 租户 1 公司规则） | 0（行内无字段） | 0 | 0.00% |

> 生产 `NOT NULL` 无数据阻塞，可直接在纳秒级完成。
> 但**结构上**，`finance.core_finance_vouchers` / `_aux_balances` 一旦进入多公司租户，历史行将 100% 无法从行内字段推导。因此 P2a 必须把 `company_id` 定为**写路径必填**，回填只作为迁移期的一次性兜底，不能作为长期口径。

### 2.3 回填规则（若未来存在数据）

1. 单公司租户：全部归该租户唯一公司（P1 默认主体）。
2. 多公司租户：按 `department_id → hrm.departments.company_id`、`voucher_id` 继承；仍无解的行输出清单，`RAISE EXCEPTION` 阻塞 `SET NOT NULL`。
3. 跨租户公司引用：拒绝（复合 FK `(tenant_id, company_id) → hrm.companies(tenant_id,id)`）。

---

## 3. 代码改动面（给出可核对的数量）

### 3.1 Rust

| 项 | 数量 | 明细 |
|---|---|---|
| 受影响非测试文件 | **20** | `svc/finance` 17 个；`svc/erp` 3 个（`finance.rs`、`opening_balance.rs`、`event_handlers/mod.rs`） |
| 目标表引用总数 | **155 处** | 见 §1.2 逐表计数 |
| 其中 INSERT（必须补 `company_id` 绑定） | **45 处** | erp.financial_vouchers 8；erp.voucher_items 15；erp.opening_balances 6；core_finance_vouchers 6；core_finance_voucher_lines 8；core_finance_ledger 1；core_finance_aux_balances 1 |
| 其中 SELECT/UPDATE/JOIN（需加主体过滤或回显） | **约 110 处** | 凭证 22、明细账 3、余额/辅助若干 |
| 模块级文件 | 5 个 | `svc/finance/src/services/finance/{voucher,reversal,year_end,trial_balance,report}.rs` 合计 5,970 行 |

### 3.2 `.sqlx` 离线缓存

- 296 个 JSON、1.4 MB，扁平哈希目录（不按 crate 分）。
- 45 处 INSERT + 110 处读中，凡使用 `query!`/`query_as!` 宏的都必须重生成；`sqlx-prepare.sh --check` 会对 27 个包做全量离线校验，冷跑约 37 分钟量级（P1 实测热跑 37 s，Gate S 全量 2222 s）。
- 结论：**不能增量 patch，需整体重生成并单独成笔提交**（与 P0/P1 的 `.sqlx` 纪律一致）。

### 3.3 OpenAPI

| 区域 | 路径数 | 操作数 |
|---|---|---|
| 凭证（voucher） | 21 | 22 |
| 余额/明细账/试算 | 10 | 13 |
| 合并（consolidat） | 25 | 36 |
| 合计口径（含报表） | **116** | **129** |

最小改动面：凭证 22 个操作、余额类 13 个操作需新增/回显 `company_id`；若只加查询参数、不新增路径，`openapi-aggregated-baseline.json` 计数不变，但 `docs/api/openapi.json` 需重生成。

### 3.4 前端

- `apps/web/src/pages/finance` 共 27 个页面，17 个命中凭证/余额/报表关键词。
- 76 个前端文件调用 finance API。
- 必改页面：`ConsolidationReportsPage.tsx`、`FinanceReportsPage.tsx`、凭证录入/列表、余额表/明细账筛选器（主体下拉 + URL 参数 + i18n 至少各 2 个 key）。

### 3.5 门禁与基线

| 门禁 | 需要的动作 | 改动点 |
|---|---|---|
| `schema-prefix` | 新增 SQL 必须显式 `schema.table`；跨 schema 读 `hrm.companies` 走 `only_own_schema_query!` | 0 条基线改动；预计新 SQL 全部合规 |
| `schema-boundary`（Node+Python 双门禁） | `finance` 服务需新增 `allow: ["hrm"]`（校验主体存在性） | `scripts/schema_boundary.json` 1 处 + 代码依赖 1 处 |
| `schema-defense` | 6 张表的 `TABLE_DEFS` 加 `company_id UUID NOT NULL` | erp 2 处（`financial_vouchers`、`voucher_items`；`opening_balances` 已含）+ finance 4 处（vouchers/lines/ledger/aux_balances）= **6 处** |
| `ledger-ddl-drift` | 在 `database/migration_drift_assertions.json` 增加 `company_id IS NOT NULL` 与索引断言 | **1-2 条** |
| `migration-insert-shape` | 本迁移以 UPDATE/DDL 为主，不新增 INSERT 列表错位风险 | **0** |
| `decode-contract` | 只报告不阻断；需按新列重生成 `/tmp/prod_cols.psv` | 0 阻断 |
| `perm-matrix` | 不新增端点、不新增权限码（复用现有） | **0** |
| `openapi-aggregated` | 不新增路径则计数不变；新增路径需 `--update-baseline` | 0-2 |
| `pool-acquire` | 新查询必须复用 `Extension(txn_arc)` 或登记 acquire | 0（沿用现有模式） |
| `sqlx-cache-freshness` | 整体重生成 `.sqlx/` | 296 文件 |

---

## 4. 性能代价

### 4.1 索引方案（7 条）

| 表 | 新增/替换索引 |
|---|---|
| `erp.financial_vouchers` | `uq_finance_voucher_tenant_company_period_no (tenant_id, company_id, period, voucher_number) WHERE deleted_at IS NULL`；`ix_fv_tenant_company_date (tenant_id, company_id, voucher_date DESC)` |
| `erp.voucher_items` | `ix_vi_tenant_company_voucher (tenant_id, company_id, voucher_id)` |
| `erp.opening_balances` | `uq_ob_tenant_company_period_subject (tenant_id, company_id, period, subject_code)` |
| `finance.core_finance_vouchers` | `ix_cfv_tenant_company_period (tenant_id, company_id, period, status)` |
| `finance.core_finance_voucher_lines` | `ix_cfvl_tenant_company_voucher (tenant_id, company_id, voucher_id)`、`ix_cfvl_tenant_company_account (tenant_id, company_id, account_id)` |
| `finance.core_finance_ledger` | `ix_cfl_tenant_company_period_account (tenant_id, company_id, period, account_id)`（可覆盖 `sum(debit/credit)` 的 index-only scan） |
| `finance.core_finance_aux_balances` | 唯一键扩为 `(tenant_id, company_id, account_id, aux_type, aux_id, period)` |

### 4.2 执行计划影响（生产实测，0 行时的基线）

现状两例：

```
-- 余额聚合
GroupAggregate
  -> Sort (account_id)
     -> Index Scan using idx_ledger_period (period = '202611')
        Filter: tenant_id = ...
-- 凭证列表
Limit -> Sort(voucher_date DESC)
  -> Index Scan using uq_finance_voucher_tenant_period_no (tenant_id, period)
```

- 当前 `tenant_id` 过滤发生在索引条件之后（`Filter`），因为索引首列不是 tenant。
- 加 `company_id` 并建 `(tenant_id, company_id, period, account_id)` 后，同形状查询变为**全索引条件 + index-only scan**，聚合无需回表；合并按主体汇总的代价从“扫租户全部凭证”降为“扫单主体单期间”。
- 但**合并模块当前不读总账表**（`svc/erp/src/modules/consolidation/*` 只读 `consolidation_*`、`company_relations`、`core_user_company_scopes`，报表在 P0 后返回 `not_implemented`），所以本次改动**不会改变任何现存合并查询的计划**；收益在 P3 兑现。

### 4.3 锁与耗时（按 PostgreSQL 语义 + 生产 0 行）

| 步骤 | 锁级别 | 生产耗时 | 大数据量时的替代方案 |
|---|---|---|---|
| `ADD COLUMN company_id UUID`（无默认） | `ACCESS EXCLUSIVE`（仅元数据） | 毫秒级 | 同左，天然 O(1) |
| 分批 `UPDATE ... WHERE company_id IS NULL LIMIT n` | 行锁 + 表膨胀 | 0 行，无需执行 | 每批 1-5 万行，批间提交，避免长事务 |
| `ADD CONSTRAINT ... CHECK (company_id IS NOT NULL) NOT VALID` | `ACCESS EXCLUSIVE`（不扫表） | 毫秒级 | — |
| `VALIDATE CONSTRAINT` | `SHARE UPDATE EXCLUSIVE`（不阻塞读写） | 0 行≈毫秒 | 大表唯一推荐路径 |
| `ALTER COLUMN SET NOT NULL` | 短暂 `ACCESS EXCLUSIVE`，复用已验证 CHECK | 毫秒级 | 避免直接 `SET NOT NULL` 的全表扫描长锁 |
| `CREATE UNIQUE INDEX CONCURRENTLY` + `ADD CONSTRAINT ... USING INDEX` | 不阻塞 DML，耗时 2 次扫描 | 0 行≈毫秒 | 必须 `CONCURRENTLY`（不能放在事务块内） |
| FK `NOT VALID` → `VALIDATE` | `SHARE ROW EXCLUSIVE` → 校验扫描 | 毫秒级 | 大表分表校验 |

> 生产 0 行 → **无需分批、无需停机窗口**。分批逻辑仍应写进迁移脚本，以防执行时数据已增长（阈值建议单表 > 10 万行启用分批）。

---

## 5. 实施序列与不可逆点

| 步 | 动作 | 可回滚性 |
|---|---|---|
| 1 | 迁移 A：6 张表 `ADD COLUMN company_id UUID NULL`；`erp.opening_balances` 补 FK（`NOT VALID`） | 完全可回滚（`DROP COLUMN`） |
| 2 | 代码双写：45 处 INSERT 全部显式绑定 `company_id`；读路径加可选过滤（默认取 Claims 的当前主体） | 可回滚（代码回退，列仍可空） |
| 3 | 回填：单公司租户归默认主体；多公司按部门/凭证头继承；输出无法归属清单 | 可回滚（回填值可清空） |
| 4 | 校验：`company_id` 空值 = 0、跨租户引用 = 0、重复键 = 0 | 只读 |
| 5 | `CHECK NOT VALID` → `VALIDATE` → `SET NOT NULL` | **基本不可逆**：一旦有代码仍写 NULL 会立刻 500；回退需再写迁移 `DROP NOT NULL` |
| 6 | 新唯一索引 `CONCURRENTLY` → `ADD CONSTRAINT USING INDEX` → 删除旧唯一键 | **不可逆点**：删除旧唯一键后，若需回退必须重建旧键，而此时多主体重复凭证号已合法存在，重建会失败 |
| 7 | 观测一个结账周期，再进入 P3 合并聚合 | — |

**必须保持的先后顺序**：步骤 1 → 2 → 3/4 → 5 → 6。若先 `SET NOT NULL` 再改代码，45 处旧 INSERT 会直接违反约束。生产 0 行时步骤 3 为空，但顺序不能省。

**回退预案**：
- 步骤 1-4 任意失败：`DROP COLUMN` + 代码回退，无数据损失。
- 步骤 5 后失败：新增前向迁移 `ALTER COLUMN company_id DROP NOT NULL`，代码回退到“可空 + 读侧兜底单公司”。
- 步骤 6 后失败：保留新唯一键，**不重建旧键**；改用“按主体生成凭证号”的应用层规则兜底（旧键语义已不再成立）。

---

## 6. 范围建议

### 阶段 A（建议现在做，7 张表）

`erp.financial_vouchers`、`erp.voucher_items`、`erp.opening_balances`（补 FK/唯一键）、`finance.core_finance_vouchers`、`finance.core_finance_voucher_lines`、`finance.core_finance_ledger`、`finance.core_finance_aux_balances`。

理由：这 7 张是唯一有代码写入的总账表（45 处 INSERT、20 个文件）；生产 0 行，迁移与回填成本最低；P3 主体报表直接依赖这 7 张。

### 阶段 B（可推迟）

`finance.core_finance_aux_accounts`、`finance.core_finance_periods`、`erp.vouchers`。
- 辅助档案与会计期间可继续租户级共享；`erp.vouchers` 是事件处理器遗留路径，建议先决定是否与 `erp.financial_vouchers` 收敛。
- 推迟**不阻塞 P3** 的主体资产负债表/利润表；仅在“按主体独立辅助档案/独立结账”时才需要。

### 阶段 C（清理，不加维度）

`finance.vouchers`、`finance.voucher_lines`、`public.core_finance_*` 9 张 —— 代码引用为 **0**，其中 7 张只有 `id,deleted_at`。建议单独一笔前向迁移登记废弃，不做 `company_id`。
`erp.account_balances` 是库存物料余额，**不是总账**，排除。
科目表、币种表、凭证模板为租户级主数据，不加维度。

### 与 P3 的关系

- 阶段 A **阻塞 P3**：没有 `company_id` 就无法按主体出资产负债表/利润表，也无法做主体间抵消。
- 阶段 B **不阻塞 P3**。
- 阶段 C **不阻塞**，但越早清理越少干扰。

> 另一个必须先拍板的架构问题：`erp.financial_vouchers`（erp 服务写）与 `finance.core_finance_vouchers`（finance 服务写）是**两套并行总账**，都对外暴露端点。全量加维度意味着两套都维护；若 P2a 期间不收敛，P3 的合并口径会出现“同一张凭证在两个账套各一份”。

---

## 7. 需要拍板的问题

1. 是否接受“阶段 A 7 张表、阶段 B 3 张表、阶段 C 清理 11 张”的分期？
2. 两套总账是否在 P2a 内收敛为一套？若不收敛，`company_id` 需双写两套（成本最高的选项）。
3. `finance.core_finance_aux_accounts` 是否允许跨主体共享（决定阶段 B 是否提前）。
4. `erp.financial_vouchers.organization_id` 已有值均为 `tenant_id`，是否借此机会改为真正的公司外键，还是保留并新增 `company_id`（建议后者，避免语义混用）。

---

## 附录 A：取证命令（全部只读）

```bash
# 总账表行数（生产）
ssh xingzhai@192.168.110.115 'PATH=/opt/homebrew/bin:$PATH psql -d topems_prod -X -A -F"|" -c "
SELECT n.nspname||'.'||c.relname,
       (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', n.nspname, c.relname), false, true, '')))[1]::text::bigint
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE c.relkind='r' AND n.nspname IN ('erp','finance','public') AND c.relname ~ '(voucher|balance|ledger|aux|subject|period|opening)'"'

# 累计写入与统计窗口
ssh xingzhai@192.168.110.115 'PATH=/opt/homebrew/bin:$PATH psql -d topems_prod -X -A -F"|" -c "
SELECT relname, n_tup_ins FROM pg_stat_user_tables WHERE relname ~ '"'"'(voucher|balance|ledger)'"'"'"'
ssh xingzhai@192.168.110.115 'PATH=/opt/homebrew/bin:$PATH psql -d topems_prod -X -A -F"|" -c "
SELECT stats_reset, pg_postmaster_start_time() FROM pg_stat_database WHERE datname='"'"'topems_prod'"'"'"'

# 索引
ssh xingzhai@192.168.110.115 'PATH=/opt/homebrew/bin:$PATH psql -d topems_prod -X -A -F"|" -c "
SELECT schemaname||'"'"'.'"'"'||tablename, indexname, indexdef FROM pg_indexes
WHERE tablename IN ('"'"'financial_vouchers'"'"','"'"'voucher_items'"'"','"'"'opening_balances'"'"','"'"'core_finance_vouchers'"'"','"'"'core_finance_voucher_lines'"'"','"'"'core_finance_ledger'"'"','"'"'core_finance_aux_balances'"'"')"'
```

```bash
# 代码引用计数（仓库内）
for t in financial_vouchers voucher_items opening_balances core_finance_vouchers \
         core_finance_voucher_lines core_finance_ledger core_finance_aux_balances; do
  printf '%s|' "$t"
  grep -rEoh "(FROM|JOIN|INTO|UPDATE)[[:space:]]+(erp|finance|public)\.$t\b" svc lib --include='*.rs' | wc -l
done
```

## 附录 B：本次未做（避免误解）

- 未对生产执行任何 DDL/DML，未应用 `20261108130000`，未重启进程。
- 未修改 `p1/company-scopes`、未改代码、未新增迁移。
- 未做数据量注入压测：生产 0 行、本地仅 27 行，任何基于小样本的耗时数字都不可信；性能结论按 PostgreSQL 锁语义给出，待真实数据量出现后用 `EXPLAIN (ANALYZE)` 复核。

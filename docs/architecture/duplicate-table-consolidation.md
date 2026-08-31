# 同名多 Schema 表收敛盘点与决策

> 阶段 1 遗留独立项①。目标：消除同名多 schema 表带来的归属歧义与数据孤岛，
> 明确每张表的唯一权威 schema。本文档为**盘点 + 决策 + 分批复实施**基线，
> 由 2026-08-31 运行中 topems-postgres 导出 + 代码引用扫描得出。

---

## 一、现状总览

DB 中共 **325 组同名表**（`information_schema.tables` 按表名分组计数>1）。
按 schema 组合模式分类：

| 分类 | 典型组合 | 组数 | 性质 |
|---|---|---|---|
| **public 遗留双写** | ehs,public / public,qms / bi,public / erp,public / gis,public / mobile,public / integration,public 等 | ~110 | 阶段0 迁移后 public 仍留同名旧表，业务代码显式 `public.*` 或 search_path 落到 public |
| **iam 平台表遗留** | finance,iam,public(58) / iam,mes,public(22) / iam,lims(19+12) / iam,pdm,public(15) / iam,public(6) | ~132 | iam schema 混入大量非 iam 业务表（旧 core_* 平台表迁移遗留，与待办④同源） |
| **插件 schema 并存** | plugin_srm,srm(5) / ai,plugin_ai(2) | ~7 | 插件独立 schema，**设计保留** |
| **服务自治审计** | audit_logs × 19 | 1 | 每服务独立审计日志，**设计保留** |
| **跨服务同名异义** | hrm,shared(4) / pm,rs(4) / crm,erp / erp,wms / hrm,pm / gis,public,wms | ~15 | 同一表名承载不同业务语义（如 PM 项目 vs RD 研发项目），**保留，不合并** |
| **文档服务内部** | doc_service,storage / doc,doc_service | 3 | 文档服务内部模块 schema，**设计保留** |

> 说明：325 组远多于阶段0 快照记录的 16 张 ambiguous——阶段0 后各服务在 public/iam
> 持续创建同名表，且部分表为"业务 schema + public"双写，属迁移不彻底累积。

---

## 二、16 张 ambiguous 表逐张决策

（阶段0 快照 ambiguous 16 张；基于代码引用数 + 行数 + DDL 声明判定）

| 表名 | 分布 | 代码引用 | 判定 | 决策 |
|---|---|---|---|---|
| analysis_results | ai/bi/public | ai(5)、plugin_ai(3)、bi(0) | 同义 | **ai 主**；删 bi.analysis_results（bi 由 analytics TABLE_DEFS 声明，需先改 DDL）、public.analysis_results（无声明，直接删） |
| audit_logs | ×19 | 各服务自写 | 服务自治 | **保留 19 份**（每服务独立审计日志，平台审计由 unified-core 写 public.audit_logs） |
| budgets | pm/erp/public | pm(7)、erp(0)、public(0) | 同义 | **pm 主**；删 erp.budgets + public.budgets（均无声明无数据） |
| contracts | hrm/pm | hrm(18)、pm(10) | **异义** | hrm=劳动合同、pm=项目合同，**保留两份** |
| customers | crm/erp | crm(38)、erp(8) | 待确认 | crm 主（177 行）；erp.customers 8 处引用待查（erp 若读 crm 客户应改 API）——后续批次 |
| documents | ai/doc/plugin_ai/pm/public | plugin_ai(22)、ai(2)、doc(0) | 同义 | doc 服务文档主（doc.* 独立命名）；public.documents 空壳删；doc/pm/ai/plugin_ai 属各自业务保留 |
| inventory | wms/erp | wms(33)、erp(12) | 待确认 | wms 主（4 行）；erp.inventory 12 处引用待查（erp 读库存应改 API）——后续批次 |
| locations | gis/public/wms | wms(14)、gis(11) | **异义** | gis=地理坐标、wms=库位，**保留**；删 public.locations 空壳 |
| mes_qms_sync | integration/public | integration(10) | 同义 | **integration 主**；删 public.mes_qms_sync 空壳 |
| project_members | pm/rs | rs(11)、pm(7) | **异义** | pm=项目管理、rs=RD 研发（rd 服务用 rs schema），**保留两份** |
| project_milestones | pm/rs | rs(11)、pm(7) | **异义** | 同上，**保留** |
| project_phases | pm/rs | rs(13)、pm(9) | **异义** | 同上，**保留** |
| projects | pm/rs | rs(20)、pm(10) | **异义** | 同上，**保留** |
| purchase_orders | erp/public/scm/srm | scm(31)、srm(26)、erp(11) | 待确认 | scm 主（65 行）；srm/erp 各自业务引用待查——后续批次 |
| supplier_evaluations | public/scm/srm | srm(41)、scm(8) | 同义 | **srm 主**；scm 8 处引用待查——后续批次 |
| suppliers | erp/public/scm/srm | srm(65)、scm(28)、erp(8) | 待确认 | srm 主（92 行）+ scm 主（195 行）疑似双主——后续批次 |

**结论**：16 张中，可收敛删除 = **6 张空壳**（analysis_results×2、budgets×2、mes_qms_sync、locations）；
同名异义保留 = **7 组**（contracts、locations、project_*×4、audit_logs）；
待业务确认/跨服务改造 = **customers、inventory、documents、purchase_orders、supplier_evaluations、suppliers**（后续批次）。

---

## 三、分批复实施计划

### 第一批（本次，✅ 已执行 2026-08-31）
- **删 7 张空壳**：`public.analysis_results`、`public.mes_qms_sync`、`erp.budgets`、`public.budgets`、`public.locations`、`public.documents`、`public.document_versions`（FK 依赖连带；均验证：无代码真实 SQL 引用、无数据、无 DDL 声明）
- **修复依赖**：删除 public.budgets 后发现 finance `operational.rs` 无前缀 budgets 真实 SQL（财务部门预算，与 pm.budgets 项目预算**同名异义**）——已在 `finance.schema_defense.rs` TABLE_DEFS 添加 budgets 定义并建 `finance.budgets` 表（自建，不再依赖 public 遗留）
- **归属映射**：`schema_boundary_tables.json` ambiguous 16→14：`analysis_results→ai`、`mes_qms_sync→integration` 归位入 `table_owner`；`budgets`（pm+finance 异义）、`locations`（gis+wms 异义）、`documents`（ai+doc+pm+plugin_ai 异义）**保留 ambiguous**（单 owner 无法表达多业务）
- 验证：finance 编译 0 error 0 warning；`check_schema_boundary.py` 全 PASS；7 张表已确认消失

### 第二批（✅ 已执行 2026-08-31）
- `bi.analysis_results` 已删：analytics `schema_defense.rs` 移除 analysis_results 定义（保留 saved_analysis_results）→ 编译 0 error → 删表（无 FK 依赖、0 数据、无业务 SQL）；ai 为主 schema（ai.schema_defense + ai/db.rs CREATE TABLE + plugin_ai.analysis_results 实际读写 3 行）
- `bi.audit_logs`：保留（analytics 服务审计，自治）

### 第三批（finance 组 ✅ 2026-08-31 已执行；mobile/iam 待办）
- **finance 活跃业务表误建 public 归位（9 张）**：`core_finance_payments`(+payment_items/workflow/approval_config/approval_nodes 支付链 5 张)、`reconciliation_snapshots`、`settlement_snapshots`、`source_amount_snapshots` —— 均为无前缀/显式 public SQL 落 public 的活跃表（有 INSERT/UPDATE）。已在 finance.schema_defense TABLE_DEFS 补定义 + 建 finance 表（含 FK/UNIQUE/数组类型与 public 对齐）+ 显式列名迁移数据（payments 1 行、approval_config 4 行、approval_nodes 10 行）+ 代码 public.X→X + 删 public 表。
- **finance 报表死读改读（2 张）**：`public.financial_vouchers→core_finance_vouchers`、`public.voucher_items→core_finance_voucher_lines`（financial_reports.rs；字段 period/total_debit/total_credit/status/debit/credit/voucher_id 均兼容）。
- **voucher_template 容错查询修复**：`public.payment_records/public.payments`（表已不存在，恒走 1000.00 兜底）→ 改查归位后的 `core_finance_payments(total_amount)`。
- **保留**：`public.accounting_subjects`（finance accounting_subjects.rs 活跃 CRUD 主表，与 core_finance_accounts 是否同义需深判，单独子项）。
- 验证：finance 编译 0 error；门禁 PASS（finance 引用 433→360）。
- **待办**：mobile 13 张 public 活跃表（与 mobile schema 异名新表 core_mobile_/mobile_ 前缀并存，需确认旧路径废弃后清理）；unified-core `public.audit_logs`；iam 平台表 132 组归位（联动待办④）。

### 第四批（跨服务读改造，同名同义但双引用）
- customers（erp→crm API）、inventory（erp→wms API）、purchase_orders（srm/erp→scm 或确认异义）、supplier_evaluations（scm→srm）、suppliers（双主裁决）

---

## 四、门禁联动

- `schema_boundary_tables.json`：`ambiguous`（16 张）为无前缀引用豁免项。收敛后已明确归属的表**必须从 ambiguous 移入 table_owner**，避免"豁免=逃避检查"。
- 第一批完成后 ambiguous 16 → 14（analysis_results、mes_qms_sync 归位；budgets/locations/documents 为同名异义保留在 ambiguous）。

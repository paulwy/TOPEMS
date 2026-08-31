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
| customers | crm/erp | crm(38)、erp(8) | **异义** | **保留两份**：crm.customers=CRM 客户主档（189 行）、erp.customers=ERP 客户模块（完整 CRUD），结构不同（crm 有 tags/rating，erp 有 credit_limit/customer_type）✅ 2026-08-31 |
| documents | ai/doc/plugin_ai/pm/public | plugin_ai(22)、ai(2)、doc(0) | 同义 | doc 服务文档主（doc.* 独立命名）；public.documents 空壳删；doc/pm/ai/plugin_ai 属各自业务保留 |
| inventory | wms/erp | wms(33)、erp(12) | **异义** | **保留两份**：wms.inventory=WMS 仓储库存（4 行）、erp.inventory=ERP 物料库存模块（完整 CRUD 含批次/单价），结构不同 ✅ 2026-08-31 |
| locations | gis/public/wms | wms(14)、gis(11) | **异义** | gis=地理坐标、wms=库位，**保留**；删 public.locations 空壳 |
| mes_qms_sync | integration/public | integration(10) | 同义 | **integration 主**；删 public.mes_qms_sync 空壳 |
| project_members | pm/rs | rs(11)、pm(7) | **异义** | pm=项目管理、rs=RD 研发（rd 服务用 rs schema），**保留两份** |
| project_milestones | pm/rs | rs(11)、pm(7) | **异义** | 同上，**保留** |
| project_phases | pm/rs | rs(13)、pm(9) | **异义** | 同上，**保留** |
| projects | pm/rs | rs(20)、pm(10) | **异义** | 同上，**保留** |
| purchase_orders | erp/public/scm/srm | scm(31)、srm(26)、erp(11) | **收敛** | scm 主（65 行增强版含 WMS 同步列）+ erp 异义保留（ERP 采购单 order_no/tax）；**srm 表归 srm**（代码原错引 plugin_srm 已修复）；删 public.purchase_orders/purchase_items 空壳 ✅ 2026-08-31 |
| supplier_evaluations | public/scm/srm | srm(41)、scm(8) | **收敛** | srm 主（代码错引 plugin_srm 已修复归 srm）；scm 副本模式保留（绑定 scm.suppliers 同步副本）；删 public.supplier_evaluations 空壳 ✅ 2026-08-31 |
| suppliers | erp/public/scm/srm | srm(65)、scm(28)、erp(8) | **收敛** | srm 主档（92 行，代码错引 plugin_srm 已修复）+ scm 同步副本保留（sync_from_srm 字段，195 行）+ erp 异义保留（采购单读 name）；删 public.suppliers 空壳 ✅ 2026-08-31 |

**结论**：16 张中，可收敛删除 = **6 张空壳**（analysis_results×2、budgets×2、mes_qms_sync、locations）+ 后续批次 **5 张 public 空壳**（purchase_orders/purchase_items/supplier_evaluations/suppliers 等）；
同名异义保留 = **7 组**（contracts、locations、project_*×4、audit_logs）+ **customers、inventory**（跨服务异义保留）+ **documents**（doc 主 + 各业务保留）；
收敛归位 = **purchase_orders、supplier_evaluations、suppliers**（srm 代码错引 plugin_srm 已修复归 srm schema；scm 同步副本模式保留）。
**16 张判定全部完成 ✅ 2026-08-31**。

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
- **finance 活跃业务表误建 public 归位（8 张）**：`core_finance_payments`(+payment_items/workflow/approval_config/approval_nodes 支付链 5 张)、`reconciliation_snapshots`、`settlement_snapshots`、`source_amount_snapshots` —— 均为无前缀/显式 public SQL 落 public 的活跃表（有 INSERT/UPDATE）。已在 finance.schema_defense TABLE_DEFS 补定义 + 建 finance 表（含 FK/UNIQUE/数组类型与 public 对齐）+ 显式列名迁移数据（payments 1 行、approval_config 4 行、approval_nodes 10 行）+ 代码 public.X→X + 删 public 表。
- **finance 报表死读改读（2 张）**：`public.financial_vouchers→core_finance_vouchers`、`public.voucher_items→core_finance_voucher_lines`（financial_reports.rs；字段 period/total_debit/total_credit/status/debit/credit/voucher_id 均兼容）。
- **voucher_template 容错查询修复**：`public.payment_records/public.payments`（表已不存在，恒走 1000.00 兜底）→ 改查归位后的 `core_finance_payments(total_amount)`。
- **保留**：`public.accounting_subjects`（finance accounting_subjects.rs 活跃 CRUD 主表，与 core_finance_accounts 是否同义需深判，单独子项）。
- 验证：finance 编译 0 error；门禁 PASS（finance 引用 433→360）。
- **mobile 13 张活跃表归位（✅ 2026-08-31）**：`offline_operations/sync_policies/push_notifications/push_devices/push_templates/photo_uploads/shortcuts/media_files/barcode_scans/offline_sync_records/devices/mobile_users/mobile_scan_records` —— 均为移动端活跃路由（/offline/sync、/scan/barcode 等）数据表误建 public。pg_dump 导出 DDL 重放到 mobile schema（含 FK 链，0 行数据）+ mobile.schema_defense TABLE_DEFS 补 13 张定义（新环境可自建）+ 代码 public.X→X + devices 显式 mobile.devices（门禁 table_owner 判定）+ 连带删 public.refresh_tokens/notifications（无服务引用的 FK 孤儿）。验证：mobile 编译 0 error；门禁 PASS（mobile 引用 51）。
- **`public.accounting_subjects` 归位 finance（✅ 2026-08-31）**：深判为**同名异义**（简版科目 organization_id/category 结构 vs core_finance_accounts 企业科目体系），且是 finance 活跃功能（前端 accountingSubject.ts CRUD + 路由）。归位 `finance.accounting_subjects` 并**补列修复**——原 public 表缺 organization_id 列导致 INSERT/RETURNING 一直失败（创建功能损坏），新表含该列；代码 public→无前缀 + 删 public 表。验证：finance 编译 0 error；门禁 PASS（finance 引用 353）。
- **`unified-core public.audit_logs` 判定保留（✅ 2026-08-31）**：unified-core schema=public（平台服务以 public 为 own schema），audit_logs 是其合法审计表（active INSERT/SELECT），**非冗余**，无需迁移。
- **跨服务 6 张裁决完成（✅ 2026-08-31）**：customers/inventory 异义保留；purchase_orders/supplier_evaluations/suppliers 收敛（srm 代码错引 plugin_srm 修复归 srm + public 空壳删 + scm 副本保留）。
- **srm plugin_srm 前缀错位修复（✅ 2026-08-31）**：srm 18 张表代码全错引 `plugin_srm.*`（schema_defense 实际建在 srm），plugin_srm schema 仅 5 张招标表且均 0 行；统一去前缀归 srm，删 plugin_srm 冗余表。修复 srm 采购/供应商/评估/招标模块运行时"relation does not exist"缺陷。
- **待办**：iam 平台表 132 组归位（联动待办④）。

### 第四批（跨服务读改造，同名同义但双引用）
- customers（erp→crm API）、inventory（erp→wms API）、purchase_orders（srm/erp→scm 或确认异义）、supplier_evaluations（scm→srm）、suppliers（双主裁决）

---

## 四、门禁联动

- `schema_boundary_tables.json`：`ambiguous`（16 张）为无前缀引用豁免项。收敛后已明确归属的表**必须从 ambiguous 移入 table_owner**，避免"豁免=逃避检查"。
- 第一批完成后 ambiguous 16 → 14（analysis_results、mes_qms_sync 归位；budgets/locations/documents 为同名异义保留在 ambiguous）。

### 第五批（认证双轨统一 + 审计日志生态对齐，2026-08-31）

**5a 认证双轨统一（✅ commit 1d12364ac）**
- unified-core 用户数据曾分裂：auth 注册只写 iam.users（副本）不写 core_users（主表）→ 新用户对用户管理/租户系统不可见。
- 修复为双写 core_users（status='active'）+ iam.users；补建 iam positions 系列 5 张表（positions/user_positions/position_permissions/position_roles/resource_permissions，代码引用但从未建表）；数据回填使两端一致（48=48）。测试 1022 passed。

**5b audit_query 审计对齐（✅ commit e80e2fd3f）**
- **audit_logs 生态三方断裂**：建表 DDL（13 列中间件）、真实表（19 列+enum，无 DDL 源孤儿表）、写入方（middleware 11 列/access_log 8 列/models/store）与 audit_query 查询分支（entity_type/request_details 等）互不匹配 → 写入全失败 0 行、audit_query 查死表/不存在表。
- **收敛决策**：统一到**权威 Cluster-A 签名**（lims `AuditLog` struct 1:1，init SQL `01_rebuild_database.sql` 与 migration `V100_audit_logs_clusterA` 一致、有 DDL 源可 rebuild 复现）；原 19 列+audit_action enum 表全仓库无 CREATE 源（孤儿），DROP 重建为 Cluster-A 15 列。
- 改动：
  - `audit_query.rs`：iam.audit_logs→public.audit_logs（死表→真实表）、iam.permission_audit_logs→public.permission_audit_logs（v448 10 列 changed_at/old_value/new_value 对齐）；login_logs 分支可用不动。
  - `middleware/audit_log.rs`：INSERT + init 定义统一 Cluster-A（entity_type/entity_ids/request_details/response_details/status）。
  - `access_log.rs`/`models.rs`：适配 Cluster-A；entity_id 仅合法 UUID 绑定。
  - `database_audit_log_store.rs`：metadata→details（public.permission_audit_logs 加 details JSONB，v448 migration 补定义）。
- 验证：unified-core 编译 0 error 无 warning；测试 1022 passed 0 failed；门禁 PASS（unified-core 28 引用）；事务级 SQL 全验证（4 写入 + 2 查询）。

### 遗留待办（表收敛系列收尾）
1. **mobile 12 文件 public 前缀替换**：3b 批次中 12 个移动端代码文件（public.X→无前缀）已编译/门禁通过，因与用户工作区改动混叠未提交，待用户合并提交。
2. **用户工作区改动**：apps/web 前端测试/API、svc/srm/Cargo.toml 等（勿动）。
3. **perm-matrix R5 9 处 FAIL**（finance accounting_subjects 5 + financial_reports 2、tms optimization 3）：既有技术债（utoipa security 注解缺失），不阻断门禁（DRY-RUN）。

### 第五批续（plugin_* 残留收尾，2026-08-31）

**5c SRM_SCHEMA 一致性（✅ commit 680c8f60d）**
- 4a 去前缀后 shared-db `SRM_SCHEMA` 仍指向已删的 plugin_srm → 改 "srm"；断言与 srm integration_tests 3 处同步；业务 plugin_srm.* 引用清零。

**5d mes 审计表统一（✅ commit 894a56596）**
- mes 是全仓库唯一用 plugin_mes 审计表的服务（crm/hrm/rd 均用真实 schema）。
- audit.rs/mod.rs 共 13 处 plugin_mes→mes；schema_defense audit_logs 重建为 Cluster-A 15 列；DB 建 mes.audit_logs + DROP SCHEMA plugin_mes CASCADE。
- **plugin_* schema 现状**：plugin_srm/plugin_mes 已删；plugin_ai（3 表，ai 服务 vector.rs 写入）+ plugin_aps（5 表，_archive 归档）残留。
- **新待办（ai 服务 schema 评审）**：ai 服务跨 ai/core/plugin_ai 三 schema（schema_defense 建 ai 4 表含 documents 32 行孤儿、knowledge 模块用 core.*、vector.rs 写 plugin_ai.* 且 plugin_ai.analysis_results 缺表致 INSERT 失败）——归 P1-2 阶段 0 评审。

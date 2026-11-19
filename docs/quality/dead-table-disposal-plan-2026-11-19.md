# TOPEMS 206 张删除候选表处置方案（分批 · 先归档后 DROP）

- 日期：2026-11-19
- 上游清单：[table-disposition-2026-11-19.md](table-disposition-2026-11-19.md)（清单 3，删除候选 207 张；其中 `bi.audit_logs` 因 schema-defense 重建冲突移出，本方案实际处置 206 张，见 §2.3）
- 定论：先复核外部消费，再「先归档后 DROP」，分两批执行
- 状态：**仅出草案与清单；未对生产执行任何 DDL，未开窗，未改迁移窗口**
- 生产只读口径：全部核查语句以 `PGOPTIONS='-cdefault_transaction_read_only=on'` 执行

## 0. 结论摘要

| 项 | 第一批 | 第二批 | 合计 |
|---|---:|---:|---:|
| 表数 | 19 | 187 | 206 |
| schema 分布 | crm 1、mes 4、mobile 1、pm 4、rs 3、shared 1、tms 2、wms 3 | bi 1、ehs 21、erp 3、finance 3、gis 3、hrm 6、lims 10、master_data 7、public 125、qms 6、scm 2 | — |
| 生产行数 | 0 | 0 | 0 |
| 入向外键（全部来自候选内表） | 0 | 30 | 30 |
| 依赖视图 | 1（`mes.v_tenant_backfill_gaps`） | 0 | 1 |
| RLS ENABLE+FORCE 表 | 14 | 105 | 119 |
| RLS 策略条数 | 14 | 115 | 129 |
| 列默认值快照 | 60 | 585 | 645 |
| serial 序列 | 0 | 1 | 1 |
| 迁移版本 | `20261119100000` | `20261119110000` | — |

生产 `pg_stat_user_tables`（2026-11-19 只读采集，原 207 张候选口径）：207 张全部 `n_live_tup=0`；182 张 `seq_scan/idx_scan/n_tup_*` 全 0；25 张 `seq_scan>0`（1~2 次，与本次审计自身扫描吻合，不能据此证明无外部读，见 §5）。

## 1. 边界与不变量

1. 本次不产生任何生产写操作：不应用 DDL、不建 archive schema、不动迁移窗口。
2. 两条迁移都带**会话级闸门**：未显式设置 `app.drop_dead_tables_gate` 时整条迁移 `RAISE EXCEPTION` 中止。
3. 每批是**单事务**：归档校验失败 → 事务回滚，DROP 不执行（不存在「归档一半、删一半」）。
4. DROP 顺序固定：先 DROP 依赖视图 → 再 DROP 入向外键 → 最后 DROP 表。
5. 回滚只依赖 `archive` schema 内的元数据，不依赖迁移文件内容。
6. 外部消费复核（§5）未签署前，闸门不打开。

## 2. 分批原则与清单

### 2.1 为什么这样切

分批评判只看四项可测事实，不看业务猜测：

| 维度 | 第一批（低风险） | 第二批 |
|---|---|---|
| 入向外键 | 0 条 | 30 条（涉及 17 张被引用表，来源全部是候选表，依赖图封闭在死表集合内） |
| 依赖视图 | 1 个（可快照重建） | 0 |
| serial 序列（DROP 时会牵连默认值） | 0 | 1（`public.tenant_permissions_id_seq`） |
| schema 集中度 | 非 `public` 的 8 个业务 schema，互不共享对象 | 主体是 `public`（125），删除会同时改动公共 schema 的依赖面 |

第一批取「无入向外键 + 无序列 + 体量小」的 19 张，作为归档机制的验证批；观察窗口结束后再动第二批。

### 2.2 第一批（19 张）

| # | schema | 表 | 归属模块 | 判定为删除候选的依据 | 归档表（archive.*） |
|---:|---|---|---|---|---|
| 1 | `crm` | `crm_master_data_refs` | CRM 客户关系 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b1__crm__crm_master_data_refs` |
| 2 | `mes` | `dashboard_stats` | MES 制造执行 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b1__mes__dashboard_stats` |
| 3 | `mes` | `financial_records` | MES 制造执行 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b1__mes__financial_records` |
| 4 | `mes` | `material_requirement_items` | MES 制造执行 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略）；依赖视图 `mes.v_tenant_backfill_gaps`（迁移内先快照后 DROP） | `drop_20261119_b1__mes__material_requirement_items` |
| 5 | `mes` | `supply_chain_orders` | MES 制造执行 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b1__mes__supply_chain_orders` |
| 6 | `mobile` | `mobile_leave_applications` | 移动端 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b1__mobile__mobile_leave_applications` |
| 7 | `pm` | `acceptances` | PM 项目管理 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b1__pm__acceptances` |
| 8 | `pm` | `documents` | PM 项目管理 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b1__pm__documents` |
| 9 | `pm` | `pm_master_data_refs` | PM 项目管理 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b1__pm__pm_master_data_refs` |
| 10 | `pm` | `service_integrations` | PM 项目管理 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b1__pm__service_integrations` |
| 11 | `rs` | `equipment` | RS 资源/设备 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b1__rs__equipment` |
| 12 | `rs` | `equipment_inspections` | RS 资源/设备 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b1__rs__equipment_inspections` |
| 13 | `rs` | `equipment_maintenance_records` | RS 资源/设备 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b1__rs__equipment_maintenance_records` |
| 14 | `shared` | `audit_logs` | shared 公共 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b1__shared__audit_logs` |
| 15 | `tms` | `carriers` | TMS 运输 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b1__tms__carriers` |
| 16 | `tms` | `drivers` | TMS 运输 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b1__tms__drivers` |
| 17 | `wms` | `transfer_items` | WMS 仓储 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b1__wms__transfer_items` |
| 18 | `wms` | `transfers` | WMS 仓储 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b1__wms__transfers` |
| 19 | `wms` | `wms_master_data_refs` | WMS 仓储 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b1__wms__wms_master_data_refs` |

### 2.3 第二批（187 张）

> **例外**：`bi.audit_logs` 已移出本批。原因：`svc/analytics` 的 schema-defense 启动即 `CREATE TABLE IF NOT EXISTS bi.audit_logs` 并补列，删除会被重建，且重建后由 `harden_new_tenant_tables` 补一条口径不同的 `tenant_isolation_audit_logs`，与 `20261119141000` 守卫冲突。登记见 `database/migration-exemptions.json`（`B20261119-batch2-bi-audit-logs-keep`）。因此本方案实际处置 206 张（批 1 19 + 批 2 187）。

| # | schema | 表 | 归属模块 | 判定为删除候选的依据 | 归档表（archive.*） |
|---:|---|---|---|---|---|
| 1 | `bi` | `report_execution_records` | BI 报表 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__bi__report_execution_records` |
| 2 | `ehs` | `audit_logs` | EHS 安全环保 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__ehs__audit_logs` |
| 3 | `ehs` | `drill_records` | EHS 安全环保 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__ehs__drill_records` |
| 4 | `ehs` | `emergency_plans` | EHS 安全环保 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__ehs__emergency_plans` |
| 5 | `ehs` | `environmental_alerts` | EHS 安全环保 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__ehs__environmental_alerts` |
| 6 | `ehs` | `environmental_data` | EHS 安全环保 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__ehs__environmental_data` |
| 7 | `ehs` | `health_checkups` | EHS 安全环保 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__ehs__health_checkups` |
| 8 | `ehs` | `monitoring_points` | EHS 安全环保 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__ehs__monitoring_points` |
| 9 | `ehs` | `qa_ehs_accident_investigations` | EHS 安全环保 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__ehs__qa_ehs_accident_investigations` |
| 10 | `ehs` | `qa_ehs_accident_reviews` | EHS 安全环保 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__ehs__qa_ehs_accident_reviews` |
| 11 | `ehs` | `qa_ehs_accident_treatments` | EHS 安全环保 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__ehs__qa_ehs_accident_treatments` |
| 12 | `ehs` | `qa_ehs_compliance_items` | EHS 安全环保 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__ehs__qa_ehs_compliance_items` |
| 13 | `ehs` | `qa_ehs_detection_records` | EHS 安全环保 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__ehs__qa_ehs_detection_records` |
| 14 | `ehs` | `qa_ehs_environment` | EHS 安全环保 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__ehs__qa_ehs_environment` |
| 15 | `ehs` | `qa_ehs_health_abnormalities` | EHS 安全环保 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__ehs__qa_ehs_health_abnormalities` |
| 16 | `ehs` | `qa_ehs_health_trainings` | EHS 安全环保 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__ehs__qa_ehs_health_trainings` |
| 17 | `ehs` | `qa_ehs_material_stocks` | EHS 安全环保 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__ehs__qa_ehs_material_stocks` |
| 18 | `ehs` | `qa_ehs_protection_measures` | EHS 安全环保 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__ehs__qa_ehs_protection_measures` |
| 19 | `ehs` | `risk_assessments` | EHS 安全环保 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__ehs__risk_assessments` |
| 20 | `ehs` | `risk_controls` | EHS 安全环保 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__ehs__risk_controls` |
| 21 | `ehs` | `safety_incidents` | EHS 安全环保 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__ehs__safety_incidents` |
| 22 | `ehs` | `vaccination_records` | EHS 安全环保 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__ehs__vaccination_records` |
| 23 | `erp` | `expenses` | ERP | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__erp__expenses` |
| 24 | `erp` | `voucher_items` | ERP | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（2 策略） | `drop_20261119_b2__erp__voucher_items` |
| 25 | `erp` | `vouchers` | ERP | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__erp__vouchers` |
| 26 | `finance` | `core_finance_approval_workflows` | 财务 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__finance__core_finance_approval_workflows` |
| 27 | `finance` | `reconciliation_orders` | 财务 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__finance__reconciliation_orders` |
| 28 | `finance` | `settlement_center_dashboards` | 财务 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__finance__settlement_center_dashboards` |
| 29 | `gis` | `audit_log` | GIS 地理 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__gis__audit_log` |
| 30 | `gis` | `audit_logs` | GIS 地理 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__gis__audit_logs` |
| 31 | `gis` | `geofence_alerts` | GIS 地理 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__gis__geofence_alerts` |
| 32 | `hrm` | `hrm_master_data_refs` | HRM 人力 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__hrm__hrm_master_data_refs` |
| 33 | `hrm` | `payroll_records` | HRM 人力 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（2 策略） | `drop_20261119_b2__hrm__payroll_records` |
| 34 | `hrm` | `performance_records` | HRM 人力 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（2 策略） | `drop_20261119_b2__hrm__performance_records` |
| 35 | `hrm` | `recruitment_applications` | HRM 人力 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（2 策略） | `drop_20261119_b2__hrm__recruitment_applications` |
| 36 | `hrm` | `recruitment_records` | HRM 人力 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（2 策略） | `drop_20261119_b2__hrm__recruitment_records` |
| 37 | `hrm` | `training_participants` | HRM 人力 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（2 策略） | `drop_20261119_b2__hrm__training_participants` |
| 38 | `lims` | `ai_analyses` | LIMS 实验室 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__lims__ai_analyses` |
| 39 | `lims` | `audit_logs` | LIMS 实验室 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__lims__audit_logs` |
| 40 | `lims` | `document_relations` | LIMS 实验室 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__lims__document_relations` |
| 41 | `lims` | `lab_ledger` | LIMS 实验室 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__lims__lab_ledger` |
| 42 | `lims` | `qa_lab_inspection_reports` | LIMS 实验室 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__lims__qa_lab_inspection_reports` |
| 43 | `lims` | `qa_lab_reagent_alerts` | LIMS 实验室 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__lims__qa_lab_reagent_alerts` |
| 44 | `lims` | `qa_lab_reagent_history` | LIMS 实验室 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__lims__qa_lab_reagent_history` |
| 45 | `lims` | `qa_lab_sample_lifecycle` | LIMS 实验室 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__lims__qa_lab_sample_lifecycle` |
| 46 | `lims` | `reagent_usages` | LIMS 实验室 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__lims__reagent_usages` |
| 47 | `lims` | `reagents` | LIMS 实验室 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__lims__reagents` |
| 48 | `master_data` | `core_master_data_change_log` | 主数据 MDM | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__master_data__core_master_data_change_log` |
| 49 | `master_data` | `core_master_data_event_outbox` | 主数据 MDM | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__master_data__core_master_data_event_outbox` |
| 50 | `master_data` | `core_master_data_refs` | 主数据 MDM | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__master_data__core_master_data_refs` |
| 51 | `master_data` | `core_mdm_approvals` | 主数据 MDM | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__master_data__core_mdm_approvals` |
| 52 | `master_data` | `core_mdm_reconciliation_log` | 主数据 MDM | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__master_data__core_mdm_reconciliation_log` |
| 53 | `master_data` | `dynamic_data` | 主数据 MDM | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__master_data__dynamic_data` |
| 54 | `master_data` | `schema_registry` | 主数据 MDM | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__master_data__schema_registry` |
| 55 | `public` | `alert_rules` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（4 策略） | `drop_20261119_b2__public__alert_rules` |
| 56 | `public` | `alerts` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__public__alerts` |
| 57 | `public` | `analytics_sync_records` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__analytics_sync_records` |
| 58 | `public` | `conversion_executions` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__conversion_executions` |
| 59 | `public` | `conversion_rules` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__conversion_rules` |
| 60 | `public` | `core_faqs` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__public__core_faqs` |
| 61 | `public` | `core_file_folders` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__public__core_file_folders` |
| 62 | `public` | `core_finance_account_opening_balances` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__core_finance_account_opening_balances` |
| 63 | `public` | `core_finance_approval_workflows` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__core_finance_approval_workflows` |
| 64 | `public` | `core_finance_aux_accounts` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__core_finance_aux_accounts` |
| 65 | `public` | `core_finance_aux_balances` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__core_finance_aux_balances` |
| 66 | `public` | `core_finance_ledger` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__core_finance_ledger` |
| 67 | `public` | `core_finance_reconciliation_items` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__core_finance_reconciliation_items` |
| 68 | `public` | `core_finance_reconciliation_sessions` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__core_finance_reconciliation_sessions` |
| 69 | `public` | `core_finance_voucher_entries` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__core_finance_voucher_entries` |
| 70 | `public` | `core_finance_voucher_lines` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__core_finance_voucher_lines` |
| 71 | `public` | `core_finance_voucher_templates` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__core_finance_voucher_templates` |
| 72 | `public` | `core_finance_vouchers` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__public__core_finance_vouchers` |
| 73 | `public` | `core_guide_lessons` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__public__core_guide_lessons` |
| 74 | `public` | `core_guide_progress` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__public__core_guide_progress` |
| 75 | `public` | `core_guides` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略）；被 2 条候选内入向外键引用 | `drop_20261119_b2__public__core_guides` |
| 76 | `public` | `core_inter_module_sync` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__public__core_inter_module_sync` |
| 77 | `public` | `core_master_data_event_outbox` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__core_master_data_event_outbox` |
| 78 | `public` | `core_mdm_reconciliation_log` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__public__core_mdm_reconciliation_log` |
| 79 | `public` | `core_plugin_categories` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__core_plugin_categories` |
| 80 | `public` | `core_plugin_instances` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__core_plugin_instances` |
| 81 | `public` | `core_plugin_navigation` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__core_plugin_navigation` |
| 82 | `public` | `core_plugin_permissions` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__core_plugin_permissions` |
| 83 | `public` | `core_plugin_reviews` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__core_plugin_reviews` |
| 84 | `public` | `core_plugin_versions` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__core_plugin_versions` |
| 85 | `public` | `core_plugins` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__core_plugins` |
| 86 | `public` | `core_ticket_sla_escalations` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__core_ticket_sla_escalations` |
| 87 | `public` | `core_ticket_sla_policies` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__core_ticket_sla_policies` |
| 88 | `public` | `cqrs_events` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__public__cqrs_events` |
| 89 | `public` | `crm_dashboard_snapshots` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__public__crm_dashboard_snapshots` |
| 90 | `public` | `ehs_dashboard_snapshots` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__public__ehs_dashboard_snapshots` |
| 91 | `public` | `equipment` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS；被 2 条候选内入向外键引用 | `drop_20261119_b2__public__equipment` |
| 92 | `public` | `equipment_inspections` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__equipment_inspections` |
| 93 | `public` | `equipment_maintenance_records` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__equipment_maintenance_records` |
| 94 | `public` | `finance_voucher_templates` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略）；被 1 条候选内入向外键引用 | `drop_20261119_b2__public__finance_voucher_templates` |
| 95 | `public` | `financial_reports` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__public__financial_reports` |
| 96 | `public` | `hrm_dashboard_snapshots` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__public__hrm_dashboard_snapshots` |
| 97 | `public` | `lims_dashboard_snapshots` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__public__lims_dashboard_snapshots` |
| 98 | `public` | `material_boms` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__material_boms` |
| 99 | `public` | `material_categories` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__material_categories` |
| 100 | `public` | `material_issue_items` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__material_issue_items` |
| 101 | `public` | `material_issues` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__material_issues` |
| 102 | `public` | `material_requirement_items` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__material_requirement_items` |
| 103 | `public` | `material_requirements` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__material_requirements` |
| 104 | `public` | `material_return_items` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__material_return_items` |
| 105 | `public` | `material_returns` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__material_returns` |
| 106 | `public` | `meeting_bookings` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__meeting_bookings` |
| 107 | `public` | `meeting_rooms` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__meeting_rooms` |
| 108 | `public` | `navigation_menu` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__public__navigation_menu` |
| 109 | `public` | `pdm_change_notices` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__public__pdm_change_notices` |
| 110 | `public` | `pdm_dashboard_snapshots` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__public__pdm_dashboard_snapshots` |
| 111 | `public` | `pdm_materials` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__public__pdm_materials` |
| 112 | `public` | `pdm_products` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__public__pdm_products` |
| 113 | `public` | `pinned_apps` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__public__pinned_apps` |
| 114 | `public` | `pm_master_data_refs` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__pm_master_data_refs` |
| 115 | `public` | `process_flow_steps` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__process_flow_steps` |
| 116 | `public` | `process_flows` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__process_flows` |
| 117 | `public` | `qa_ehs_accident_investigations` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__qa_ehs_accident_investigations` |
| 118 | `public` | `qa_ehs_accident_reviews` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__qa_ehs_accident_reviews` |
| 119 | `public` | `qa_ehs_accident_treatments` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__qa_ehs_accident_treatments` |
| 120 | `public` | `qa_ehs_accidents` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS；被 3 条候选内入向外键引用 | `drop_20261119_b2__public__qa_ehs_accidents` |
| 121 | `public` | `qa_ehs_compliance_items` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__qa_ehs_compliance_items` |
| 122 | `public` | `qa_ehs_contraindications` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__qa_ehs_contraindications` |
| 123 | `public` | `qa_ehs_detection_records` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__qa_ehs_detection_records` |
| 124 | `public` | `qa_ehs_emergency_plans` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__qa_ehs_emergency_plans` |
| 125 | `public` | `qa_ehs_environment` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__qa_ehs_environment` |
| 126 | `public` | `qa_ehs_hazard_rectifications` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__qa_ehs_hazard_rectifications` |
| 127 | `public` | `qa_ehs_hazard_verifications` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__qa_ehs_hazard_verifications` |
| 128 | `public` | `qa_ehs_hazardous_materials` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS；被 2 条候选内入向外键引用 | `drop_20261119_b2__public__qa_ehs_hazardous_materials` |
| 129 | `public` | `qa_ehs_health_abnormalities` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__qa_ehs_health_abnormalities` |
| 130 | `public` | `qa_ehs_health_exam_plans` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS；被 1 条候选内入向外键引用 | `drop_20261119_b2__public__qa_ehs_health_exam_plans` |
| 131 | `public` | `qa_ehs_health_exam_records` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS；被 1 条候选内入向外键引用 | `drop_20261119_b2__public__qa_ehs_health_exam_records` |
| 132 | `public` | `qa_ehs_health_trainings` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__qa_ehs_health_trainings` |
| 133 | `public` | `qa_ehs_inspection_items` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__qa_ehs_inspection_items` |
| 134 | `public` | `qa_ehs_inspection_plans` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS；被 1 条候选内入向外键引用 | `drop_20261119_b2__public__qa_ehs_inspection_plans` |
| 135 | `public` | `qa_ehs_material_stocks` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__qa_ehs_material_stocks` |
| 136 | `public` | `qa_ehs_protection_measures` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__qa_ehs_protection_measures` |
| 137 | `public` | `qa_ehs_risks` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__qa_ehs_risks` |
| 138 | `public` | `qa_ehs_stock_records` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__qa_ehs_stock_records` |
| 139 | `public` | `qa_ehs_sync_records` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__qa_ehs_sync_records` |
| 140 | `public` | `qa_ehs_trainings` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__qa_ehs_trainings` |
| 141 | `public` | `qa_lab_calibration_records` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__public__qa_lab_calibration_records` |
| 142 | `public` | `qa_lab_reagent_alerts` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__public__qa_lab_reagent_alerts` |
| 143 | `public` | `qa_lab_reagent_history` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__public__qa_lab_reagent_history` |
| 144 | `public` | `qa_lab_reagents` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略）；被 2 条候选内入向外键引用 | `drop_20261119_b2__public__qa_lab_reagents` |
| 145 | `public` | `qa_lims_audit_logs` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__public__qa_lims_audit_logs` |
| 146 | `public` | `qa_lims_barcode_scan_records` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__public__qa_lims_barcode_scan_records` |
| 147 | `public` | `qa_lims_collection_tasks` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__public__qa_lims_collection_tasks` |
| 148 | `public` | `qa_lims_instrument_data` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__public__qa_lims_instrument_data` |
| 149 | `public` | `qa_lims_method_categories` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略）；被 2 条候选内入向外键引用 | `drop_20261119_b2__public__qa_lims_method_categories` |
| 150 | `public` | `qa_lims_method_validations` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__public__qa_lims_method_validations` |
| 151 | `public` | `qa_lims_method_versions` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__public__qa_lims_method_versions` |
| 152 | `public` | `qa_lims_parse_rules` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__public__qa_lims_parse_rules` |
| 153 | `public` | `qa_lims_pt_corrective_actions` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__public__qa_lims_pt_corrective_actions` |
| 154 | `public` | `qa_lims_pt_evaluations` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略）；被 1 条候选内入向外键引用 | `drop_20261119_b2__public__qa_lims_pt_evaluations` |
| 155 | `public` | `qa_lims_pt_plans` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略）；被 4 条候选内入向外键引用 | `drop_20261119_b2__public__qa_lims_pt_plans` |
| 156 | `public` | `qa_lims_pt_results` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__public__qa_lims_pt_results` |
| 157 | `public` | `qa_lims_pt_samples` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略）；被 2 条候选内入向外键引用 | `drop_20261119_b2__public__qa_lims_pt_samples` |
| 158 | `public` | `qa_lims_rfid_tags` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__public__qa_lims_rfid_tags` |
| 159 | `public` | `qa_lims_sample_barcodes` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略）；被 1 条候选内入向外键引用 | `drop_20261119_b2__public__qa_lims_sample_barcodes` |
| 160 | `public` | `qa_lims_sync_records` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__public__qa_lims_sync_records` |
| 161 | `public` | `qa_lims_test_methods` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略）；被 2 条候选内入向外键引用 | `drop_20261119_b2__public__qa_lims_test_methods` |
| 162 | `public` | `qa_lims_uncertainty_components` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__public__qa_lims_uncertainty_components` |
| 163 | `public` | `qa_lims_uncertainty_projects` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略）；被 2 条候选内入向外键引用 | `drop_20261119_b2__public__qa_lims_uncertainty_projects` |
| 164 | `public` | `qa_lims_uncertainty_sources` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略）；被 1 条候选内入向外键引用 | `drop_20261119_b2__public__qa_lims_uncertainty_sources` |
| 165 | `public` | `quality_inspections` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__quality_inspections` |
| 166 | `public` | `quality_patrol_items` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__quality_patrol_items` |
| 167 | `public` | `quality_patrols` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__quality_patrols` |
| 168 | `public` | `quality_standard_values` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__quality_standard_values` |
| 169 | `public` | `quality_standards` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__quality_standards` |
| 170 | `public` | `refresh_tokens` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__refresh_tokens` |
| 171 | `public` | `tenant_permissions` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（2 策略）；serial 序列 1 个（快照重建） | `drop_20261119_b2__public__tenant_permissions` |
| 172 | `public` | `tenants` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__tenants` |
| 173 | `public` | `ticket_automation_rules` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__ticket_automation_rules` |
| 174 | `public` | `ticket_knowledge_articles` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__ticket_knowledge_articles` |
| 175 | `public` | `todos` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__public__todos` |
| 176 | `public` | `user_settings` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__public__user_settings` |
| 177 | `public` | `vehicle_requests` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__vehicle_requests` |
| 178 | `public` | `vehicles` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；无 RLS | `drop_20261119_b2__public__vehicles` |
| 179 | `public` | `wms_dashboard_snapshots` | public（跨模块遗留） | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__public__wms_dashboard_snapshots` |
| 180 | `qms` | `audit_logs` | QMS 质量 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__qms__audit_logs` |
| 181 | `qms` | `corrective_actions` | QMS 质量 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__qms__corrective_actions` |
| 182 | `qms` | `dashboard_metrics` | QMS 质量 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__qms__dashboard_metrics` |
| 183 | `qms` | `inspection_items` | QMS 质量 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__qms__inspection_items` |
| 184 | `qms` | `quality_inspections` | QMS 质量 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__qms__quality_inspections` |
| 185 | `qms` | `quality_issues` | QMS 质量 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__qms__quality_issues` |
| 186 | `scm` | `materials` | SCM 供应链 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__scm__materials` |
| 187 | `scm` | `scm_master_data_refs` | SCM 供应链 | 生产 0 行；`n_tup_ins=0`；全仓 Rust 零 SQL 引用；无触发器；RLS ENABLE+FORCE（1 策略） | `drop_20261119_b2__scm__scm_master_data_refs` |

> 口径纠偏：上游清单把「无外键引用」写进删除候选依据；实测这 206 张里有 30 条入向外键（指向 17 张候选表），来源表全部也在候选集合内。因此判定结论不变（删除后无活表引用），但依据需改写为「仅被候选表引用，依赖图封闭」。

## 3. 归档机制

### 3.1 落点与命名

| 项 | 规则 |
|---|---|
| schema | `archive`（不在任何服务 `search_path` 中；`scripts/schema_boundary.json` 不登记，运行期不可见） |
| 归档表名 | `drop_20261119_b<批号>__<schema>__<原表名>`；超过 63 字节按 `前 54 字节 + '_' + md5 前 8 位` 截断（本批最长正好 63，未触发截断） |
| 元数据表 | `archive._drop_manifest`、`_rls_policy_snapshot`、`_fk_snapshot`、`_view_snapshot`、`_column_defaults`、`_sequence_snapshot` |
| 归属 | 迁移以执行角色创建；生产执行角色需对源表有 SELECT、对 `archive` 有 CREATE |

### 3.2 归档内容口径

**结构 + 数据**，不是只结构：

- 结构：`CREATE TABLE archive.<arc> (LIKE <schema>.<table> INCLUDING ALL EXCLUDING DEFAULTS)`。保留列类型/非空/CHECK/索引/注释，**排除默认值**——默认值里可能含 `nextval('源序列')`，保留会让 DROP 因对象依赖失败（批 2 首次演练即卡在这里）。
- 数据：`INSERT INTO archive.<arc> SELECT * FROM <schema>.<table>`，随后做双向行数校验。
- 默认值与序列另存：`_column_defaults`（逐列 `pg_get_expr(adbin)`）、`_sequence_snapshot`（类型/步长/最值/缓存/cycle/`last_value`）。
- 策略与外键另存：`_rls_policy_snapshot`（permissive/cmd/roles/qual/with_check 原文）、`_fk_snapshot`（`pg_get_constraintdef` 原文）。
- 视图另存：`_view_snapshot`（`pg_get_viewdef` 原文 + relkind）。

### 3.3 保留期与清理

- 保留期 **180 天**，写入 `_drop_manifest.retention_until`（`archived_at + interval '180 days'`）。
- 本方案**不含**清理迁移。180 天后是否删除归档表，另行评估（需再次确认无恢复诉求），且必须是新版本迁移。
- 归档表不建索引、不做统计收集，仅作冷存。

### 3.4 失败如何阻断 DROP

| 闸门 | 触发条件 | 结果 |
|---|---|---|
| G1 会话闸门 | `current_setting('app.drop_dead_tables_gate', true) <> 'batch-N'` | 迁移开始即 `RAISE EXCEPTION`，未建任何对象 |
| G2 行数校验 | `n_src <> n_arc OR n_ins <> n_src` | `RAISE EXCEPTION`，整个事务回滚；已建的归档表与写入一并撤销 |
| G3 语句失败 | 归档建表/复制/序列快照任一报错 | PL/pgSQL 异常向上抛，事务回滚 |
| G4 DROP 顺序 | 视图/外键未先删除 | 由顺序保证；仍有依赖时 DROP 报错并回滚 |

因为「归档 + 校验 + DROP」在同一个事务内（由 runner 提供，文件内不写 `BEGIN/COMMIT`），**只要有一张表归档失败，206 张一张都不会被删**。

已知边界：归档表名按「批次 + schema + 表名」唯一；若同名归档表已存在，迁移直接 `RAISE EXCEPTION` 拒绝重跑（不做静默覆盖），由执行人确认后改名或清理。迁移文件本身不含 `BEGIN/COMMIT`，事务边界由 `scripts/migration/apply-forward.sh` 提供；手工执行时必须显式加 `--single-transaction`。

## 4. 迁移草案

| 文件 | 作用 | 闸门值 |
|---|---|---|
| `database/migrations/20261119100000_drop_dead_tables_batch1.sql` | 批 1：19 张归档 + DROP | `batch-1` |
| `database/rollback/20261119100000_drop_dead_tables_batch1.rollback.sql` | 批 1 回滚 | — |
| `database/migrations/20261119110000_drop_dead_tables_batch2.sql` | 批 2：187 张归档 + DROP | `batch-2` |
| `database/rollback/20261119110000_drop_dead_tables_batch2.rollback.sql` | 批 2 回滚 | — |

执行方式（**本次不执行**，仅记录）：

```bash
PGOPTIONS='-capp.drop_dead_tables_gate=batch-1' \
  bash scripts/migration/apply-forward.sh database/migrations/20261119100000_drop_dead_tables_batch1.sql
```

注意：`apply-forward.sh` 会在会话内重置 `search_path=public`，但不会清除 `PGOPTIONS`；闸门变量必须通过 `PGOPTIONS` 或 `SET` 在会话级注入。DROP 按 schema 分组，schema 名在语句中是字面量、仅表名参数化，并逐组带 `-- destructive-gate: allow` 豁免标记（kind=DROP TABLE、rows-at-review=0、backup 指向 archive 归档表、有效期 2027-05-10），以通过 `scripts/ci/check-destructive-sql.mjs`。手工执行回滚同样需要 `psql --single-transaction`。

### 4.1 回滚覆盖范围

回滚按 `migration_version` 从 archive 元数据重建：表结构与数据（`LIKE ... INCLUDING ALL` + `INSERT`）、`ENABLE/FORCE RLS`、策略、serial 序列及其 `OWNED BY`、列默认值、入向外键、依赖视图/物化视图。**不恢复** GRANT/COMMENT/统计信息/序列当前值以外的会话状态；索引与 CHECK 约束的名称由 PostgreSQL 重新生成，不保证与原名称逐字一致（本批 0 行、无外部依赖，未额外快照索引名）。

### 4.2 隔离库演练读数（`topems_snap_20261118`，2026-11-19）

| 步骤 | 读数 |
|---|---|
| 批 1 应用 | 归档 19 张、0 行；策略 14；视图 1；外键 0；序列 0 |
| 批 2 应用 | 归档 187 张、0 行；策略 115；外键 30；默认值 585；序列 1 |
| 合计 | 归档表 206 张，`_drop_manifest` 206 行 |
| 批 2 回滚 | 187 张全部重建；策略/外键/默认值/序列恢复 |
| 批 1 回滚 | 19 张全部重建；`mes.v_tenant_backfill_gaps` 恢复 |
| 回滚后终态 | 206/206 表存在；候选表上策略 129 条；RLS ENABLE+FORCE 119 张；入向外键 30 条；`public.tenant_permissions.id` 默认值恢复为 `nextval(...)` |

> 读数按移出 `bi.audit_logs` 重算：该表贡献 1 张表、1 条策略、2 条列默认值、0 条入向外键、0 个序列，且为 RLS ENABLE+FORCE；其余读数不变。

### 4.3 manifest 与 checksums

- 两条迁移以 `status: to_apply` 追加到 `database/migration_manifest.yaml` 的 `pending_forward_patches` 末尾，只追加不改写既有条目。
- `database/checksums.txt` 只追加两条新文件的 SHA-256，不重写其他行。

## 5. 外部消费复核清单（DBA 执行，只读）

本机只能证明「仓库代码零引用 + 生产 0 行 + 依赖图封闭」，**不能证明外部系统不读这些表**。以下语句需 DBA 在生产执行（只读事务），结果附在放行单上。

### 5.1 采集语句

候选集合 `cand(s,t)` 用附录 A 的 206 行生成 `VALUES (...)`，或先建临时表：

```sql
CREATE TEMP TABLE cand(s text, t text);
-- 由附录 A 批量 INSERT
```

1）表级访问计数（注意 `stats_reset` 窗口）：

```sql
SELECT stats_reset FROM pg_stat_database WHERE datname = current_database();

SELECT st.schemaname || '.' || st.relname AS tbl,
       st.seq_scan, st.seq_tup_read, st.idx_scan, st.idx_tup_fetch,
       st.n_tup_ins, st.n_tup_upd, st.n_tup_del, st.n_live_tup, st.last_autovacuum
FROM pg_stat_user_tables st
JOIN cand c ON c.s = st.schemaname AND c.t = st.relname
ORDER BY 1;
```

2）入向外键（含来源是否也是候选）：

```sql
SELECT tn.nspname || '.' || tc.relname AS referenced,
       sn.nspname || '.' || sc.relname AS referencing,
       k.conname,
       (sn.nspname || '.' || sc.relname) IN (SELECT s || '.' || t FROM cand) AS src_is_candidate
FROM pg_constraint k
JOIN pg_class sc ON sc.oid = k.conrelid  JOIN pg_namespace sn ON sn.oid = sc.relnamespace
JOIN pg_class tc ON tc.oid = k.confrelid JOIN pg_namespace tn ON tn.oid = tc.relnamespace
JOIN cand c ON c.s = tn.nspname AND c.t = tc.relname
WHERE k.contype = 'f'
ORDER BY 1, 2;
```

3）依赖对象（视图 / 物化视图 / 规则）：

```sql
SELECT DISTINCT vn.nspname || '.' || v.relname AS dependent_object,
       v.relkind, tn.nspname || '.' || t.relname AS depends_on
FROM pg_depend d
JOIN pg_rewrite r ON r.oid = d.objid
JOIN pg_class v ON v.oid = r.ev_class JOIN pg_namespace vn ON vn.oid = v.relnamespace
JOIN pg_class t ON t.oid = d.refobjid  JOIN pg_namespace tn ON tn.oid = t.relnamespace
JOIN cand c ON c.s = tn.nspname AND c.t = t.relname
WHERE v.oid <> t.oid
ORDER BY 3, 1;
```

4）非属主授权（谁还能读）：

```sql
SELECT g.table_schema || '.' || g.table_name AS tbl,
       g.grantee, g.privilege_type, g.is_grantable
FROM information_schema.role_table_grants g
JOIN cand c ON c.s = g.table_schema AND c.t = g.table_name
JOIN pg_class k ON k.oid = to_regclass(format('%I.%I', g.table_schema, g.table_name))
JOIN pg_roles r ON r.oid = k.relowner
WHERE g.grantee <> r.rolname
ORDER BY 1, 2;
```

5）逻辑复制 / 发布：

```sql
SELECT p.pubname, pt.schemaname || '.' || pt.tablename AS tbl
FROM pg_publication_tables pt JOIN pg_publication p ON p.pubname = pt.pubname
JOIN cand c ON c.s = pt.schemaname AND c.t = pt.tablename;

SELECT slot_name, plugin, database, active FROM pg_replication_slots;
```

6）FDW / 外部表：

```sql
SELECT srvname, srvtype, srvoptions FROM pg_foreign_server;
SELECT foreign_table_schema || '.' || foreign_table_name AS foreign_tbl, foreign_server_name
FROM information_schema.foreign_tables;
```

7）库内函数/作业里的动态 SQL（代码扫描无法覆盖）：

```sql
SELECT n.nspname || '.' || p.proname AS func, pg_get_functiondef(p.oid) AS def
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND EXISTS (SELECT 1 FROM cand c WHERE p.prosrc ~* ('\y' || c.t || '\y'));
```

8）若装了 `pg_stat_statements`，按表名匹配历史语句：

```sql
SELECT s.queryid, s.calls, s.rows, s.total_exec_time, left(s.query, 200) AS q
FROM pg_stat_statements s
WHERE EXISTS (SELECT 1 FROM cand c WHERE s.query ~* ('\y' || c.t || '\y'))
ORDER BY s.calls DESC;
```

9）触发器 / 事件触发器（应为 0，用于复核）：

```sql
SELECT n.nspname || '.' || c.relname AS tbl, t.tgname, pg_get_triggerdef(t.oid)
FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE NOT t.tgisinternal AND (n.nspname, c.relname) IN (SELECT s, t FROM cand);
```

### 5.2 本机能得出 / 不能得出

| 结论 | 本机可否得出 | 说明 |
|---|---|---|
| 仓库 Rust 代码零引用 | 可 | 全仓正则 + 迁移链扫描 |
| 生产表 0 行、`n_tup_ins=0` | 可 | 只读采集 |
| 候选表之间外键封闭、无活表引用 | 可 | `pg_constraint` 实读 |
| 依赖视图/物化视图 | 可 | `pg_depend` 实读（仅 1 个） |
| 非属主授权、publication、FDW | 可 | 实读，均为 0 |
| **外部系统（BI/报表/ETL/外部库）是否直连读** | **否** | 需要 DBA 侧连接白名单、`pg_stat_activity` 历史、网络连接日志、`pg_stat_statements` 保留窗口 |
| **库内存储过程/定时作业/事件触发器里的动态 SQL** | **否** | 仓库代码扫描不覆盖生产库内对象 |
| **CDC / 逻辑复制 / 只读副本订阅** | **否** | 需要 DBA 查复制槽与订阅端 |
| **统计窗口内的真实访问量** | **部分** | `pg_stat_user_tables` 自上次 reset 起累计；25 张 `seq_scan=1~2` 与本次审计自扫吻合，但不能排除外部低频访问 |
| 备份/恢复依赖 | 部分 | 需确认备份策略是否按表名白名单 |

### 5.3 放行条件

第一批放行需同时满足：

1. §5.1 的 1/2/3/4/5/6 项在**观察窗口起始点**采集，结果与本文一致（外键仅候选内、无视图、无外部授权/发布/FDW）。
2. DBA 书面确认「无外部系统直连读」与「无库内定时作业引用」。
3. 闸门变量由窗口执行人显式注入，且窗口内 `pg_stat_activity` 无相关长事务。

第二批在第一批应用后**观察 ≥7 天**（覆盖至少一次周末批处理与一次日结），确认：无 `42P01`（undefined_table）新增、无相关 5xx 峰值、DBA 侧无外部系统报错，再按同流程放行。

## 6. 风险与未决

1. **归档体积**：206 张均为 0 行，归档表本身只有结构开销；若未来重跑时表已有数据，归档会按实际行数占用空间。
2. **`archive` schema 的权限**：删除后归档表对业务角色不可见；如需审计读取，需单独授权，且不要加入 `search_path`。
3. **序列 `last_value` 为 NULL**：`public.tenant_permissions_id_seq` 从未被调用，回滚以 `START WITH 1` 重建；若生产在窗口前已有写入，需在窗口前的只读核查里重新取 `last_value`。
4. **观察窗口的判定标准**需 DBA 与业务共同签署，本文给的是最低标准。
5. 第二批 125 张 `public` 表与 IAM/ERP/SCM 两条并行会话的改动无文件重叠，但**执行窗口需错开**，避免 `ACCESS EXCLUSIVE` 锁与迁移窗口叠加。
6. **易误判的同名表**：第二批含 `public.tenants`、`public.vehicles`、`public.equipment`、`public.quality_standards`、`scm.materials` 等与权威表近名的对象。生产实测均为 0 行且仓库零引用，权威版本分别落在 `core`/`iam`/`mes`/`qms`/`rs`/`master_data` 等 schema。这类表必须在 §5.1 的 4（授权）/5（发布）两项上单独确认后再放行——名字越像，外部报表误连的概率越高。

## 附录 A：206 张逐表清单

同 §2.2 / §2.3 的两张表；供 §5 SQL 生成 `cand` 值集：

```sql
CREATE TEMP TABLE cand(s text, t text);
INSERT INTO cand(s, t) VALUES
  ('crm', 'crm_master_data_refs'),
  ('mes', 'dashboard_stats'),
  ('mes', 'financial_records'),
  ('mes', 'material_requirement_items'),
  ('mes', 'supply_chain_orders'),
  ('mobile', 'mobile_leave_applications'),
  ('pm', 'acceptances'),
  ('pm', 'documents'),
  ('pm', 'pm_master_data_refs'),
  ('pm', 'service_integrations'),
  ('rs', 'equipment'),
  ('rs', 'equipment_inspections'),
  ('rs', 'equipment_maintenance_records'),
  ('shared', 'audit_logs'),
  ('tms', 'carriers'),
  ('tms', 'drivers'),
  ('wms', 'transfer_items'),
  ('wms', 'transfers'),
  ('wms', 'wms_master_data_refs'),
  ('bi', 'report_execution_records'),
  ('ehs', 'audit_logs'),
  ('ehs', 'drill_records'),
  ('ehs', 'emergency_plans'),
  ('ehs', 'environmental_alerts'),
  ('ehs', 'environmental_data'),
  ('ehs', 'health_checkups'),
  ('ehs', 'monitoring_points'),
  ('ehs', 'qa_ehs_accident_investigations'),
  ('ehs', 'qa_ehs_accident_reviews'),
  ('ehs', 'qa_ehs_accident_treatments'),
  ('ehs', 'qa_ehs_compliance_items'),
  ('ehs', 'qa_ehs_detection_records'),
  ('ehs', 'qa_ehs_environment'),
  ('ehs', 'qa_ehs_health_abnormalities'),
  ('ehs', 'qa_ehs_health_trainings'),
  ('ehs', 'qa_ehs_material_stocks'),
  ('ehs', 'qa_ehs_protection_measures'),
  ('ehs', 'risk_assessments'),
  ('ehs', 'risk_controls'),
  ('ehs', 'safety_incidents'),
  ('ehs', 'vaccination_records'),
  ('erp', 'expenses'),
  ('erp', 'voucher_items'),
  ('erp', 'vouchers'),
  ('finance', 'core_finance_approval_workflows'),
  ('finance', 'reconciliation_orders'),
  ('finance', 'settlement_center_dashboards'),
  ('gis', 'audit_log'),
  ('gis', 'audit_logs'),
  ('gis', 'geofence_alerts'),
  ('hrm', 'hrm_master_data_refs'),
  ('hrm', 'payroll_records'),
  ('hrm', 'performance_records'),
  ('hrm', 'recruitment_applications'),
  ('hrm', 'recruitment_records'),
  ('hrm', 'training_participants'),
  ('lims', 'ai_analyses'),
  ('lims', 'audit_logs'),
  ('lims', 'document_relations'),
  ('lims', 'lab_ledger'),
  ('lims', 'qa_lab_inspection_reports'),
  ('lims', 'qa_lab_reagent_alerts'),
  ('lims', 'qa_lab_reagent_history'),
  ('lims', 'qa_lab_sample_lifecycle'),
  ('lims', 'reagent_usages'),
  ('lims', 'reagents'),
  ('master_data', 'core_master_data_change_log'),
  ('master_data', 'core_master_data_event_outbox'),
  ('master_data', 'core_master_data_refs'),
  ('master_data', 'core_mdm_approvals'),
  ('master_data', 'core_mdm_reconciliation_log'),
  ('master_data', 'dynamic_data'),
  ('master_data', 'schema_registry'),
  ('public', 'alert_rules'),
  ('public', 'alerts'),
  ('public', 'analytics_sync_records'),
  ('public', 'conversion_executions'),
  ('public', 'conversion_rules'),
  ('public', 'core_faqs'),
  ('public', 'core_file_folders'),
  ('public', 'core_finance_account_opening_balances'),
  ('public', 'core_finance_approval_workflows'),
  ('public', 'core_finance_aux_accounts'),
  ('public', 'core_finance_aux_balances'),
  ('public', 'core_finance_ledger'),
  ('public', 'core_finance_reconciliation_items'),
  ('public', 'core_finance_reconciliation_sessions'),
  ('public', 'core_finance_voucher_entries'),
  ('public', 'core_finance_voucher_lines'),
  ('public', 'core_finance_voucher_templates'),
  ('public', 'core_finance_vouchers'),
  ('public', 'core_guide_lessons'),
  ('public', 'core_guide_progress'),
  ('public', 'core_guides'),
  ('public', 'core_inter_module_sync'),
  ('public', 'core_master_data_event_outbox'),
  ('public', 'core_mdm_reconciliation_log'),
  ('public', 'core_plugin_categories'),
  ('public', 'core_plugin_instances'),
  ('public', 'core_plugin_navigation'),
  ('public', 'core_plugin_permissions'),
  ('public', 'core_plugin_reviews'),
  ('public', 'core_plugin_versions'),
  ('public', 'core_plugins'),
  ('public', 'core_ticket_sla_escalations'),
  ('public', 'core_ticket_sla_policies'),
  ('public', 'cqrs_events'),
  ('public', 'crm_dashboard_snapshots'),
  ('public', 'ehs_dashboard_snapshots'),
  ('public', 'equipment'),
  ('public', 'equipment_inspections'),
  ('public', 'equipment_maintenance_records'),
  ('public', 'finance_voucher_templates'),
  ('public', 'financial_reports'),
  ('public', 'hrm_dashboard_snapshots'),
  ('public', 'lims_dashboard_snapshots'),
  ('public', 'material_boms'),
  ('public', 'material_categories'),
  ('public', 'material_issue_items'),
  ('public', 'material_issues'),
  ('public', 'material_requirement_items'),
  ('public', 'material_requirements'),
  ('public', 'material_return_items'),
  ('public', 'material_returns'),
  ('public', 'meeting_bookings'),
  ('public', 'meeting_rooms'),
  ('public', 'navigation_menu'),
  ('public', 'pdm_change_notices'),
  ('public', 'pdm_dashboard_snapshots'),
  ('public', 'pdm_materials'),
  ('public', 'pdm_products'),
  ('public', 'pinned_apps'),
  ('public', 'pm_master_data_refs'),
  ('public', 'process_flow_steps'),
  ('public', 'process_flows'),
  ('public', 'qa_ehs_accident_investigations'),
  ('public', 'qa_ehs_accident_reviews'),
  ('public', 'qa_ehs_accident_treatments'),
  ('public', 'qa_ehs_accidents'),
  ('public', 'qa_ehs_compliance_items'),
  ('public', 'qa_ehs_contraindications'),
  ('public', 'qa_ehs_detection_records'),
  ('public', 'qa_ehs_emergency_plans'),
  ('public', 'qa_ehs_environment'),
  ('public', 'qa_ehs_hazard_rectifications'),
  ('public', 'qa_ehs_hazard_verifications'),
  ('public', 'qa_ehs_hazardous_materials'),
  ('public', 'qa_ehs_health_abnormalities'),
  ('public', 'qa_ehs_health_exam_plans'),
  ('public', 'qa_ehs_health_exam_records'),
  ('public', 'qa_ehs_health_trainings'),
  ('public', 'qa_ehs_inspection_items'),
  ('public', 'qa_ehs_inspection_plans'),
  ('public', 'qa_ehs_material_stocks'),
  ('public', 'qa_ehs_protection_measures'),
  ('public', 'qa_ehs_risks'),
  ('public', 'qa_ehs_stock_records'),
  ('public', 'qa_ehs_sync_records'),
  ('public', 'qa_ehs_trainings'),
  ('public', 'qa_lab_calibration_records'),
  ('public', 'qa_lab_reagent_alerts'),
  ('public', 'qa_lab_reagent_history'),
  ('public', 'qa_lab_reagents'),
  ('public', 'qa_lims_audit_logs'),
  ('public', 'qa_lims_barcode_scan_records'),
  ('public', 'qa_lims_collection_tasks'),
  ('public', 'qa_lims_instrument_data'),
  ('public', 'qa_lims_method_categories'),
  ('public', 'qa_lims_method_validations'),
  ('public', 'qa_lims_method_versions'),
  ('public', 'qa_lims_parse_rules'),
  ('public', 'qa_lims_pt_corrective_actions'),
  ('public', 'qa_lims_pt_evaluations'),
  ('public', 'qa_lims_pt_plans'),
  ('public', 'qa_lims_pt_results'),
  ('public', 'qa_lims_pt_samples'),
  ('public', 'qa_lims_rfid_tags'),
  ('public', 'qa_lims_sample_barcodes'),
  ('public', 'qa_lims_sync_records'),
  ('public', 'qa_lims_test_methods'),
  ('public', 'qa_lims_uncertainty_components'),
  ('public', 'qa_lims_uncertainty_projects'),
  ('public', 'qa_lims_uncertainty_sources'),
  ('public', 'quality_inspections'),
  ('public', 'quality_patrol_items'),
  ('public', 'quality_patrols'),
  ('public', 'quality_standard_values'),
  ('public', 'quality_standards'),
  ('public', 'refresh_tokens'),
  ('public', 'tenant_permissions'),
  ('public', 'tenants'),
  ('public', 'ticket_automation_rules'),
  ('public', 'ticket_knowledge_articles'),
  ('public', 'todos'),
  ('public', 'user_settings'),
  ('public', 'vehicle_requests'),
  ('public', 'vehicles'),
  ('public', 'wms_dashboard_snapshots'),
  ('qms', 'audit_logs'),
  ('qms', 'corrective_actions'),
  ('qms', 'dashboard_metrics'),
  ('qms', 'inspection_items'),
  ('qms', 'quality_inspections'),
  ('qms', 'quality_issues'),
  ('scm', 'materials'),
  ('scm', 'scm_master_data_refs');
```

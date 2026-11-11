# W7 · B4 制造/仓储/供应链 RLS 冻结评估（2026-11-10）

> 只读评估。本轮未修改任何代码、未写入生产库、未新增迁移。
> 生产宿主 `xingzhai@192.168.110.115`，库 `topems_prod`，采集时点 2026-11-10 20:05（+08:00），生产 HEAD `369887910`。

## 0. 冻结口径

| 项 | 口径 |
|---|---|
| 域范围 | `mes`、`wms`、`scm`、`srm`、`pdm`、`qms`、`lims`、`ehs` 共 8 个 schema（按实际存在，无缺项、无额外补入） |
| 表范围 | 仅 `relkind='r'`（普通表），326 张 |
| 行数口径 | 以超级用户只读连接（`-U xingzhai`，peer 认证）取精确 `count(*)`，**绕开 RLS**；非超户 `topems_prod` 的计数会被 FORCE 表过滤成 0，不能用于数据面结论 |
| 策略口径 | `pg_policies` 全量 359 条 + `pg_class.relrowsecurity/relforcerowsecurity` |
| 表名 SHA256 | 按 B5 冻结文档 §1.1 **v2 唯一口径**（schema 过滤 + `relkind='r'` + `n.nspname\|\|'.'\|\|c.relname` + `COLLATE "C"` + UTF8 + `psql -At` LF + `shasum -a 256`） |
| 代码口径 | `svc/<module>/src` 下 `.rs`，不含 `tests/`、不含生成物；`sqlx::query*` 计 SQL 语句数，`.fetch_*/.execute` 计执行调用，`&mut scope` 计已 scope 化执行 |

**本域最重要的一个事实：B4 现网业务数据为空。** 326 张表里只有 5 张非空，且全部是各 schema 的 `schema_defense_ledger`（各 1 行、无 `tenant_id`）。所有带 `tenant_id` 的业务表行数均为 0，全局行（`tenant_id IS NULL` 或 nil UUID）为 0。这既降低了数据迁移风险，也意味着**窗口内无法用真实数据验证隔离效果**，必须造数。

## 1. 逐表冻结名单（326 张）

分布：`ehs 71 / mes 51 / lims 45 / qms 40 / wms 39 / scm 37 / pdm 22 / srm 21`。
带 `tenant_id` 284 张，不带 42 张。

谓词形态图例（第 9 列）：`T`=租户 GUC 判定、`S`=系统通道、`N`=nil 分支、`C`=列侧 cast、`U`=`USING(true)`、`P`=同表同 cmd 多条 permissive、`—`=无策略、`X`=其他；多标记按 T→S→N→C→U→P 连接（如 `TNC`）。

| # | schema | 表名 | tenant_id | 行数 | ENABLE | FORCE | 策略数 | 谓词形态 |
|---|---|---|---|---|---|---|---|---|
| 1 | ehs | audit_logs | Y | 0 | Y | Y | 1 | U |
| 2 | ehs | drill_records | Y | 0 | Y | Y | 1 | U |
| 3 | ehs | emergency_plans | Y | 0 | Y | Y | 1 | U |
| 4 | ehs | environmental_alerts | Y | 0 | Y | Y | 1 | U |
| 5 | ehs | environmental_data | Y | 0 | Y | Y | 1 | U |
| 6 | ehs | hazard_control_measures | Y | 0 | Y | Y | 1 | TNC |
| 7 | ehs | hazard_risk_assessments | Y | 0 | Y | Y | 1 | TNC |
| 8 | ehs | health_checkups | Y | 0 | Y | Y | 1 | U |
| 9 | ehs | health_records | Y | 0 | Y | Y | 1 | U |
| 10 | ehs | monitoring_points | Y | 0 | Y | Y | 1 | U |
| 11 | ehs | qa_ehs_accident_investigations | Y | 0 | N | N | 0 | — |
| 12 | ehs | qa_ehs_accident_reviews | Y | 0 | N | N | 0 | — |
| 13 | ehs | qa_ehs_accident_treatments | Y | 0 | N | N | 0 | — |
| 14 | ehs | qa_ehs_accidents | Y | 0 | Y | Y | 1 | TNC |
| 15 | ehs | qa_ehs_alerts | Y | 0 | Y | Y | 1 | TNC |
| 16 | ehs | qa_ehs_compliance_evaluations | Y | 0 | Y | N | 1 | TNC |
| 17 | ehs | qa_ehs_compliance_items | Y | 0 | N | N | 0 | — |
| 18 | ehs | qa_ehs_contraindications | Y | 0 | N | N | 0 | — |
| 19 | ehs | qa_ehs_detection_records | Y | 0 | N | N | 0 | — |
| 20 | ehs | qa_ehs_discharge_permits | Y | 0 | Y | N | 1 | TNC |
| 21 | ehs | qa_ehs_disease_cases | Y | 0 | N | N | 0 | — |
| 22 | ehs | qa_ehs_drill_evaluations | Y | 0 | Y | Y | 2 | TNCP |
| 23 | ehs | qa_ehs_drill_plans | Y | 0 | N | N | 0 | — |
| 24 | ehs | qa_ehs_drill_problems | Y | 0 | N | N | 0 | — |
| 25 | ehs | qa_ehs_drill_records | Y | 0 | N | N | 0 | — |
| 26 | ehs | qa_ehs_emergency_plan_approvals | Y | 0 | N | N | 0 | — |
| 27 | ehs | qa_ehs_emergency_plan_supplies | Y | 0 | N | N | 0 | — |
| 28 | ehs | qa_ehs_emergency_plan_versions | Y | 0 | N | N | 0 | — |
| 29 | ehs | qa_ehs_emergency_plans | Y | 0 | N | N | 0 | — |
| 30 | ehs | qa_ehs_employees | Y | 0 | Y | Y | 1 | U |
| 31 | ehs | qa_ehs_env_monitor_records | Y | 0 | Y | N | 1 | TNC |
| 32 | ehs | qa_ehs_environment | Y | 0 | N | N | 0 | — |
| 33 | ehs | qa_ehs_environment_incidents | Y | 0 | Y | N | 1 | TNC |
| 34 | ehs | qa_ehs_environment_monitors | Y | 0 | Y | Y | 1 | TSC |
| 35 | ehs | qa_ehs_environmental_regulations | Y | 0 | Y | N | 1 | TNC |
| 36 | ehs | qa_ehs_hazard_factors | Y | 0 | Y | Y | 1 | TNC |
| 37 | ehs | qa_ehs_hazard_rectifications | Y | 0 | N | N | 0 | — |
| 38 | ehs | qa_ehs_hazard_verifications | Y | 0 | N | N | 0 | — |
| 39 | ehs | qa_ehs_hazardous_materials | Y | 0 | Y | Y | 1 | TNC |
| 40 | ehs | qa_ehs_hazards | Y | 0 | Y | Y | 1 | TNC |
| 41 | ehs | qa_ehs_health_abnormalities | Y | 0 | N | N | 0 | — |
| 42 | ehs | qa_ehs_health_exam_plans | Y | 0 | N | N | 0 | — |
| 43 | ehs | qa_ehs_health_exam_records | Y | 0 | N | N | 0 | — |
| 44 | ehs | qa_ehs_health_trainings | Y | 0 | N | N | 0 | — |
| 45 | ehs | qa_ehs_incident_actions | Y | 0 | Y | Y | 2 | TNCP |
| 46 | ehs | qa_ehs_inspection_items | Y | 0 | N | N | 0 | — |
| 47 | ehs | qa_ehs_inspection_plans | Y | 0 | N | N | 0 | — |
| 48 | ehs | qa_ehs_inspection_record_items | Y | 0 | N | N | 0 | — |
| 49 | ehs | qa_ehs_inspection_records | Y | 0 | N | N | 0 | — |
| 50 | ehs | qa_ehs_investigations | Y | 0 | Y | Y | 2 | TNCP |
| 51 | ehs | qa_ehs_material_stocks | Y | 0 | N | N | 0 | — |
| 52 | ehs | qa_ehs_msds | Y | 0 | N | N | 0 | — |
| 53 | ehs | qa_ehs_protection_measures | Y | 0 | N | N | 0 | — |
| 54 | ehs | qa_ehs_reviews | Y | 0 | Y | Y | 2 | TNCP |
| 55 | ehs | qa_ehs_risk_controls | Y | 0 | Y | Y | 1 | TNC |
| 56 | ehs | qa_ehs_risks | Y | 0 | Y | Y | 1 | TSC |
| 57 | ehs | qa_ehs_stock_records | Y | 0 | N | N | 0 | — |
| 58 | ehs | qa_ehs_sync_records | Y | 0 | N | N | 0 | — |
| 59 | ehs | qa_ehs_training_certificates | Y | 0 | Y | Y | 1 | TNC |
| 60 | ehs | qa_ehs_trainings | Y | 0 | N | N | 0 | — |
| 61 | ehs | qa_ehs_treatment_actions | Y | 0 | Y | Y | 2 | TNCP |
| 62 | ehs | qa_ehs_treatments | Y | 0 | Y | Y | 2 | TNCP |
| 63 | ehs | risk_assessments | Y | 0 | Y | Y | 1 | U |
| 64 | ehs | risk_controls | Y | 0 | Y | Y | 1 | U |
| 65 | ehs | safety_checks | Y | 0 | Y | Y | 1 | U |
| 66 | ehs | safety_hazards | Y | 0 | Y | Y | 1 | U |
| 67 | ehs | safety_incidents | Y | 0 | Y | Y | 1 | U |
| 68 | ehs | schema_defense_ledger | N | 0 | N | N | 0 | — |
| 69 | ehs | training_programs | Y | 0 | Y | Y | 1 | U |
| 70 | ehs | training_records | Y | 0 | Y | Y | 1 | U |
| 71 | ehs | vaccination_records | Y | 0 | Y | Y | 1 | U |
| 72 | lims | ai_analyses | Y | 0 | Y | Y | 1 | U |
| 73 | lims | audit_logs | Y | 0 | Y | Y | 1 | U |
| 74 | lims | document_relations | Y | 0 | Y | Y | 1 | U |
| 75 | lims | inspection_processes | Y | 0 | Y | Y | 1 | U |
| 76 | lims | inspection_records | Y | 0 | Y | Y | 1 | U |
| 77 | lims | inspection_tasks | Y | 0 | Y | Y | 1 | U |
| 78 | lims | instrument_calibrations | Y | 0 | Y | Y | 1 | U |
| 79 | lims | instruments | Y | 0 | Y | Y | 1 | U |
| 80 | lims | lab_ledger | Y | 0 | Y | Y | 1 | U |
| 81 | lims | lims_inspection_records | Y | 0 | Y | Y | 1 | TNC |
| 82 | lims | lims_safety_tasks | Y | 0 | Y | Y | 1 | TNC |
| 83 | lims | maintenance_records | Y | 0 | Y | Y | 1 | U |
| 84 | lims | qa_lab_calibration_records | Y | 0 | Y | Y | 2 | TNCP |
| 85 | lims | qa_lab_inspection_reports | Y | 0 | Y | Y | 2 | TNCP |
| 86 | lims | qa_lab_instruments | Y | 0 | Y | Y | 2 | TNCP |
| 87 | lims | qa_lab_processes | Y | 0 | Y | Y | 2 | TNCP |
| 88 | lims | qa_lab_reagent_alerts | Y | 0 | Y | Y | 2 | TNCP |
| 89 | lims | qa_lab_reagent_history | Y | 0 | Y | Y | 2 | TNCP |
| 90 | lims | qa_lab_reagents | Y | 0 | Y | Y | 2 | TNCP |
| 91 | lims | qa_lab_records | Y | 0 | Y | Y | 2 | TNCP |
| 92 | lims | qa_lab_sample_lifecycle | Y | 0 | Y | Y | 2 | TNCP |
| 93 | lims | qa_lims_analytes | Y | 0 | Y | N | 2 | TNCP |
| 94 | lims | qa_lims_audit_logs | Y | 0 | Y | Y | 2 | TNCP |
| 95 | lims | qa_lims_barcode_scan_records | Y | 0 | Y | Y | 2 | TNCP |
| 96 | lims | qa_lims_collection_tasks | Y | 0 | Y | Y | 2 | TNCP |
| 97 | lims | qa_lims_instrument_data | Y | 0 | Y | Y | 2 | TNCP |
| 98 | lims | qa_lims_method_categories | Y | 0 | Y | Y | 2 | TNCP |
| 99 | lims | qa_lims_method_validations | Y | 0 | Y | Y | 2 | TNCP |
| 100 | lims | qa_lims_method_versions | Y | 0 | Y | Y | 2 | TNCP |
| 101 | lims | qa_lims_parse_rules | Y | 0 | Y | Y | 2 | TNCP |
| 102 | lims | qa_lims_pt_corrective_actions | Y | 0 | Y | Y | 2 | TNCP |
| 103 | lims | qa_lims_pt_evaluations | Y | 0 | Y | Y | 2 | TNCP |
| 104 | lims | qa_lims_pt_plans | Y | 0 | Y | Y | 2 | TNCP |
| 105 | lims | qa_lims_pt_results | Y | 0 | Y | Y | 2 | TNCP |
| 106 | lims | qa_lims_pt_samples | Y | 0 | Y | Y | 2 | TNCP |
| 107 | lims | qa_lims_rfid_tags | Y | 0 | Y | Y | 2 | TNCP |
| 108 | lims | qa_lims_sample_barcodes | Y | 0 | Y | Y | 2 | TNCP |
| 109 | lims | qa_lims_sync_records | Y | 0 | Y | Y | 2 | TNCP |
| 110 | lims | qa_lims_test_methods | Y | 0 | Y | Y | 2 | TNCP |
| 111 | lims | qa_lims_uncertainty_components | Y | 0 | Y | Y | 2 | TNCP |
| 112 | lims | qa_lims_uncertainty_projects | Y | 0 | Y | Y | 2 | TNCP |
| 113 | lims | qa_lims_uncertainty_sources | Y | 0 | Y | Y | 2 | TNCP |
| 114 | lims | reagent_usages | Y | 0 | Y | Y | 1 | U |
| 115 | lims | reagents | Y | 0 | Y | Y | 1 | U |
| 116 | lims | samples | Y | 0 | Y | Y | 1 | TNC |
| 117 | mes | audit_logs | Y | 0 | Y | Y | 2 | TNCP |
| 118 | mes | batch_records | N | 0 | N | N | 0 | — |
| 119 | mes | bom_items | N | 0 | N | N | 0 | — |
| 120 | mes | capacities | Y | 0 | Y | Y | 1 | U |
| 121 | mes | dashboard_stats | Y | 0 | Y | Y | 2 | TNCP |
| 122 | mes | demand_forecasts | Y | 0 | Y | Y | 1 | U |
| 123 | mes | equipment | Y | 0 | Y | Y | 1 | TNC |
| 124 | mes | equipment_inspection_records | Y | 0 | Y | Y | 1 | TNC |
| 125 | mes | equipment_inspections | N | 0 | N | N | 0 | — |
| 126 | mes | equipment_maintenance_records | Y | 0 | Y | Y | 1 | TNC |
| 127 | mes | equipment_oee | Y | 0 | Y | Y | 1 | TNC |
| 128 | mes | financial_records | Y | 0 | Y | Y | 2 | TNCP |
| 129 | mes | material_boms | N | 0 | N | N | 0 | — |
| 130 | mes | material_categories | N | 0 | Y | Y | 1 | U |
| 131 | mes | material_issue_items | N | 0 | N | N | 0 | — |
| 132 | mes | material_issues | N | 0 | N | N | 0 | — |
| 133 | mes | material_plans | Y | 0 | Y | Y | 1 | TNC |
| 134 | mes | material_requirement_items | N | 0 | Y | Y | 1 | U |
| 135 | mes | material_requirements | N | 0 | N | N | 0 | — |
| 136 | mes | material_return_items | N | 0 | N | N | 0 | — |
| 137 | mes | material_returns | N | 0 | N | N | 0 | — |
| 138 | mes | module_settings | Y | 0 | Y | Y | 1 | TNC |
| 139 | mes | process_flow_steps | Y | 0 | Y | Y | 2 | TNCUP |
| 140 | mes | process_flows | Y | 0 | Y | Y | 1 | U |
| 141 | mes | process_route_steps | Y | 0 | Y | Y | 1 | TNC |
| 142 | mes | process_routes | Y | 0 | Y | Y | 1 | TNC |
| 143 | mes | production_costs | Y | 0 | Y | Y | 1 | TNC |
| 144 | mes | production_lines | N | 0 | N | N | 0 | — |
| 145 | mes | production_orders | Y | 0 | Y | Y | 1 | TNC |
| 146 | mes | production_plans | Y | 0 | Y | Y | 1 | U |
| 147 | mes | production_processes | Y | 0 | Y | Y | 1 | TNC |
| 148 | mes | production_records | Y | 0 | Y | Y | 1 | TNC |
| 149 | mes | production_schedules | Y | 0 | Y | Y | 1 | TNC |
| 150 | mes | quality_inspections | Y | 0 | Y | Y | 1 | U |
| 151 | mes | quality_patrol_items | Y | 0 | Y | Y | 1 | U |
| 152 | mes | quality_patrols | Y | 0 | Y | Y | 1 | U |
| 153 | mes | quality_records | N | 0 | N | N | 0 | — |
| 154 | mes | quality_standard_values | Y | 0 | Y | Y | 2 | TNCP |
| 155 | mes | quality_standards | Y | 0 | Y | Y | 1 | U |
| 156 | mes | schema_defense_ledger | N | 1 | N | N | 0 | — |
| 157 | mes | shifts | N | 0 | N | N | 0 | — |
| 158 | mes | supply_chain_orders | Y | 0 | Y | Y | 2 | TNCP |
| 159 | mes | team_members | N | 0 | N | N | 0 | — |
| 160 | mes | teams | Y | 0 | Y | Y | 1 | TNC |
| 161 | mes | wip_transfers | N | 0 | N | N | 0 | — |
| 162 | mes | wips | N | 0 | N | N | 0 | — |
| 163 | mes | work_calendars | N | 0 | N | N | 0 | — |
| 164 | mes | work_orders | Y | 0 | Y | N | 1 | TNC |
| 165 | mes | work_reports | Y | 0 | Y | Y | 2 | TNCP |
| 166 | mes | work_stations | Y | 0 | Y | Y | 1 | TNC |
| 167 | mes | workshops | N | 0 | N | N | 0 | — |
| 168 | pdm | module_settings | Y | 0 | Y | Y | 1 | TNC |
| 169 | pdm | pdm_bom_items | Y | 0 | Y | Y | 2 | TNCP |
| 170 | pdm | pdm_boms | Y | 0 | Y | Y | 2 | TNCP |
| 171 | pdm | pdm_change_notices | Y | 0 | Y | Y | 2 | TNCP |
| 172 | pdm | pdm_configurations | Y | 0 | Y | Y | 2 | TNCP |
| 173 | pdm | pdm_document_versions | Y | 0 | Y | Y | 2 | TNCP |
| 174 | pdm | pdm_documents | Y | 0 | Y | Y | 2 | TNCP |
| 175 | pdm | pdm_drawings | Y | 0 | Y | Y | 2 | TNCP |
| 176 | pdm | pdm_master_data_refs | N | 0 | Y | Y | 1 | U |
| 177 | pdm | pdm_materials | Y | 0 | Y | Y | 2 | TNCP |
| 178 | pdm | pdm_production_batches | Y | 0 | Y | Y | 2 | TNCP |
| 179 | pdm | pdm_production_formulas | Y | 0 | Y | Y | 2 | TNCP |
| 180 | pdm | pdm_production_processes | Y | 0 | Y | Y | 2 | TNCP |
| 181 | pdm | pdm_production_steps | Y | 0 | Y | Y | 2 | TNCP |
| 182 | pdm | pdm_products | Y | 0 | Y | Y | 2 | TNCP |
| 183 | pdm | pdm_project_members | Y | 0 | Y | Y | 2 | TNCP |
| 184 | pdm | pdm_project_phases | Y | 0 | Y | Y | 2 | TNCP |
| 185 | pdm | pdm_projects | Y | 0 | Y | Y | 2 | TNCP |
| 186 | pdm | pdm_versions | Y | 0 | Y | Y | 2 | TNCP |
| 187 | pdm | pdm_workflow_instances | Y | 0 | Y | Y | 2 | TNCP |
| 188 | pdm | pdm_workflows | Y | 0 | Y | Y | 2 | TNCP |
| 189 | pdm | schema_defense_ledger | N | 0 | N | N | 0 | — |
| 190 | qms | audit_logs | N | 0 | Y | Y | 1 | U |
| 191 | qms | corrective_actions | N | 0 | Y | Y | 1 | U |
| 192 | qms | dashboard_metrics | N | 0 | Y | Y | 1 | U |
| 193 | qms | inspection_items | N | 0 | Y | Y | 1 | U |
| 194 | qms | qa_alert_messages | Y | 0 | Y | Y | 1 | TNC |
| 195 | qms | qa_alert_rules | Y | 0 | Y | Y | 1 | TNC |
| 196 | qms | qa_approval_events | Y | 0 | Y | Y | 1 | TNC |
| 197 | qms | qa_apqp_approvals | N | 0 | N | N | 0 | — |
| 198 | qms | qa_apqp_phases | Y | 0 | Y | Y | 1 | TNC |
| 199 | qms | qa_apqp_projects | Y | 0 | Y | Y | 1 | TNC |
| 200 | qms | qa_apqp_risks | Y | 0 | Y | Y | 1 | TNC |
| 201 | qms | qa_apqp_tasks | Y | 0 | Y | Y | 1 | TNC |
| 202 | qms | qa_audit_findings | Y | 0 | Y | Y | 2 | TNCP |
| 203 | qms | qa_audit_plans | Y | 0 | Y | Y | 2 | TNCP |
| 204 | qms | qa_audit_tasks | Y | 0 | Y | Y | 2 | TNCP |
| 205 | qms | qa_corrective_action_items | Y | 0 | Y | Y | 2 | TNCP |
| 206 | qms | qa_corrective_actions | Y | 0 | Y | Y | 2 | TNCP |
| 207 | qms | qa_ehs_hazards | Y | 0 | Y | Y | 1 | TNC |
| 208 | qms | qa_eightd_audit_logs | Y | 0 | Y | Y | 2 | TNCP |
| 209 | qms | qa_eightd_reports | Y | 0 | Y | Y | 2 | TNCP |
| 210 | qms | qa_fmea_analyses | Y | 0 | Y | Y | 2 | TNCP |
| 211 | qms | qa_fmea_items | Y | 0 | Y | Y | 2 | TNCP |
| 212 | qms | qa_inspection_audits | Y | 0 | Y | Y | 2 | TNCP |
| 213 | qms | qa_inspection_items | Y | 0 | N | N | 0 | — |
| 214 | qms | qa_inspection_plan_items | N | 0 | N | N | 0 | — |
| 215 | qms | qa_inspection_plans | Y | 0 | N | N | 0 | — |
| 216 | qms | qa_inspection_results | Y | 0 | Y | Y | 2 | TNCP |
| 217 | qms | qa_qms_sync_records | Y | 0 | Y | Y | 2 | TNCP |
| 218 | qms | qa_quality_costs | Y | 0 | Y | Y | 2 | TNCP |
| 219 | qms | qa_quality_inspections | Y | 0 | Y | Y | 2 | TNCP |
| 220 | qms | qa_quality_issues | Y | 0 | Y | Y | 2 | TNCP |
| 221 | qms | qa_sampling_plans | Y | 0 | N | N | 0 | — |
| 222 | qms | qa_spc_charts | Y | 0 | Y | Y | 2 | TNCP |
| 223 | qms | qa_spc_data_points | Y | 0 | Y | Y | 2 | TNCP |
| 224 | qms | qa_standard_revisions | Y | 0 | Y | Y | 2 | TNCP |
| 225 | qms | qa_standards | Y | 0 | Y | Y | 2 | TNCP |
| 226 | qms | quality_inspections | N | 0 | Y | Y | 1 | U |
| 227 | qms | quality_issues | N | 0 | Y | Y | 1 | U |
| 228 | qms | quality_standards | N | 0 | Y | Y | 1 | U |
| 229 | qms | schema_defense_ledger | N | 1 | N | N | 0 | — |
| 230 | scm | audit_logs | Y | 0 | Y | Y | 1 | U |
| 231 | scm | demand_forecast | Y | 0 | Y | Y | 1 | TNC |
| 232 | scm | incoming_inspections | Y | 0 | Y | Y | 1 | TNC |
| 233 | scm | incoming_notices | Y | 0 | Y | Y | 2 | TNCP |
| 234 | scm | inspection_records | Y | 0 | Y | Y | 1 | TC |
| 235 | scm | materials | Y | 0 | Y | Y | 1 | TNC |
| 236 | scm | module_settings | Y | 0 | Y | Y | 1 | TC |
| 237 | scm | mrp_suggestions | Y | 0 | Y | Y | 1 | TNC |
| 238 | scm | price_comparison_items | Y | 0 | Y | Y | 1 | TNC |
| 239 | scm | price_comparisons | Y | 0 | Y | Y | 1 | TNC |
| 240 | scm | purchase_contract_items | N | 0 | N | N | 0 | — |
| 241 | scm | purchase_contracts | Y | 0 | Y | Y | 1 | TNC |
| 242 | scm | purchase_inquiries | N | 0 | N | N | 0 | — |
| 243 | scm | purchase_inquiry_items | N | 0 | N | N | 0 | — |
| 244 | scm | purchase_items | Y | 0 | Y | Y | 1 | U |
| 245 | scm | purchase_orders | Y | 0 | Y | Y | 1 | U |
| 246 | scm | purchase_requisitions | Y | 0 | Y | Y | 1 | TNC |
| 247 | scm | sales_order_items | Y | 0 | Y | Y | 1 | TNC |
| 248 | scm | schema_defense_ledger | N | 1 | N | N | 0 | — |
| 249 | scm | scm_master_data_refs | Y | 0 | Y | Y | 1 | TNC |
| 250 | scm | srm_supplier_snapshots | Y | 0 | Y | Y | 2 | TNCP |
| 251 | scm | supplier_admission_audit_items | N | 0 | N | N | 0 | — |
| 252 | scm | supplier_admissions | Y | 0 | Y | Y | 1 | TNC |
| 253 | scm | supplier_delivery_appointments | Y | 0 | Y | Y | 1 | U |
| 254 | scm | supplier_evaluations | Y | 0 | Y | Y | 1 | U |
| 255 | scm | supplier_products | Y | 0 | Y | Y | 1 | TNC |
| 256 | scm | supplier_quote_items | N | 0 | N | N | 0 | — |
| 257 | scm | supplier_quotes | Y | 0 | Y | Y | 1 | TNC |
| 258 | scm | suppliers | Y | 0 | Y | Y | 1 | TC |
| 259 | scm | sync_logs | Y | 0 | Y | Y | 1 | TNC |
| 260 | scm | sync_record_details | Y | 0 | Y | Y | 1 | TNC |
| 261 | scm | sync_records | Y | 0 | Y | Y | 1 | TNC |
| 262 | scm | wms_inbound_order_snapshots | Y | 0 | Y | Y | 2 | TNCP |
| 263 | scm | wms_inventory_movement_snapshots | Y | 0 | Y | Y | 2 | TNCP |
| 264 | scm | wms_inventory_snapshots | Y | 0 | Y | Y | 2 | TNCP |
| 265 | scm | wms_outbound_order_snapshots | Y | 0 | Y | Y | 2 | TNCP |
| 266 | scm | wms_replenishment_suggestion_snapshots | Y | 0 | Y | Y | 2 | TNCP |
| 267 | srm | audit_logs | Y | 0 | Y | Y | 1 | U |
| 268 | srm | bid_requests | Y | 0 | Y | Y | 1 | TNC |
| 269 | srm | bidding_suppliers | Y | 0 | Y | Y | 1 | TNC |
| 270 | srm | biddings | Y | 0 | Y | Y | 1 | TNC |
| 271 | srm | bids | Y | 0 | Y | Y | 1 | TNC |
| 272 | srm | contract_terms | Y | 0 | Y | Y | 1 | U |
| 273 | srm | inquiries | Y | 0 | Y | Y | 2 | TNCP |
| 274 | srm | purchase_orders | Y | 0 | Y | Y | 1 | U |
| 275 | srm | quotations | Y | 0 | Y | Y | 1 | TNC |
| 276 | srm | schema_defense_ledger | N | 1 | N | N | 0 | — |
| 277 | srm | scm_supplier_snapshots | Y | 0 | Y | Y | 2 | TNCP |
| 278 | srm | scoring_dimensions | Y | 0 | Y | Y | 1 | TNC |
| 279 | srm | supplier_categories | Y | 0 | Y | Y | 1 | U |
| 280 | srm | supplier_contracts | Y | 0 | Y | Y | 1 | U |
| 281 | srm | supplier_evaluations | Y | 0 | Y | Y | 1 | U |
| 282 | srm | supplier_performance | Y | 0 | Y | Y | 2 | TNCP |
| 283 | srm | supplier_products | Y | 0 | Y | Y | 1 | U |
| 284 | srm | suppliers | Y | 0 | Y | Y | 1 | TNC |
| 285 | srm | tender_awards | Y | 0 | Y | Y | 2 | TNCP |
| 286 | srm | tender_bids | Y | 0 | Y | Y | 2 | TNCP |
| 287 | srm | tenders | Y | 0 | Y | Y | 2 | TNCP |
| 288 | wms | alerts | Y | 0 | Y | Y | 1 | TNC |
| 289 | wms | audit_logs | Y | 0 | Y | Y | 1 | U |
| 290 | wms | batches | Y | 0 | Y | Y | 1 | U |
| 291 | wms | cycle_count_configs | Y | 0 | Y | Y | 1 | U |
| 292 | wms | discrepancy_records | Y | 0 | Y | Y | 1 | U |
| 293 | wms | inbound_order_items | Y | 0 | Y | Y | 1 | U |
| 294 | wms | inbound_orders | Y | 0 | Y | Y | 1 | TC |
| 295 | wms | inventory | Y | 0 | Y | Y | 2 | TCP |
| 296 | wms | inventory_alert_records | Y | 0 | Y | Y | 1 | U |
| 297 | wms | inventory_alert_rules | Y | 0 | Y | Y | 1 | U |
| 298 | wms | inventory_movements | Y | 0 | Y | Y | 2 | TNCP |
| 299 | wms | labor_shifts | Y | 0 | Y | Y | 1 | TNC |
| 300 | wms | locations | Y | 0 | Y | Y | 1 | TNC |
| 301 | wms | outbound_order_items | Y | 0 | Y | Y | 1 | U |
| 302 | wms | outbound_orders | Y | 0 | Y | Y | 1 | TC |
| 303 | wms | purchase_order_snapshots | Y | 0 | Y | Y | 1 | TNC |
| 304 | wms | replenishment_order_items | Y | 0 | Y | Y | 1 | TNC |
| 305 | wms | replenishment_orders | Y | 0 | Y | Y | 1 | TNC |
| 306 | wms | replenishment_rules | Y | 0 | Y | Y | 1 | TNC |
| 307 | wms | replenishment_suggestions | Y | 0 | Y | Y | 1 | TNC |
| 308 | wms | safety_stock_settings | Y | 0 | N | N | 0 | — |
| 309 | wms | schema_defense_ledger | N | 1 | N | N | 0 | — |
| 310 | wms | serial_numbers | Y | 0 | Y | Y | 1 | TC |
| 311 | wms | slotting_rules | Y | 0 | Y | Y | 2 | TCP |
| 312 | wms | slotting_suggestions | Y | 0 | Y | Y | 2 | TCP |
| 313 | wms | slotting_zones | Y | 0 | Y | Y | 2 | TCP |
| 314 | wms | stock_take_items | Y | 0 | Y | Y | 1 | U |
| 315 | wms | stock_takes | Y | 0 | Y | Y | 1 | TNC |
| 316 | wms | sync_record_details | Y | 0 | Y | Y | 1 | TNC |
| 317 | wms | sync_records | Y | 0 | Y | Y | 1 | TNC |
| 318 | wms | transfer_items | Y | 0 | Y | Y | 1 | U |
| 319 | wms | transfer_order_items | Y | 0 | Y | Y | 1 | TC |
| 320 | wms | transfer_orders | Y | 0 | Y | Y | 1 | TC |
| 321 | wms | transfers | Y | 0 | Y | Y | 1 | U |
| 322 | wms | warehouses | Y | 0 | Y | Y | 1 | U |
| 323 | wms | wave_pick_items | Y | 0 | Y | Y | 1 | U |
| 324 | wms | wave_picks | Y | 0 | Y | Y | 1 | U |
| 325 | wms | wms_approval_events | Y | 0 | Y | Y | 1 | U |
| 326 | wms | wms_master_data_refs | N | 0 | Y | Y | 1 | U |

### 1.1 表名清单 SHA256 复算（v2 唯一口径，2026-11-10 定稿）

**v2 是全仓唯一算法**（`schema || '.' || relname`），B5 已同步升级，两域共用同一行代码。口径写死：库 `topems_prod`、`relkind='r'`、拼接列 `n.nspname || '.' || c.relname`、`ORDER BY (n.nspname||'.'||c.relname) COLLATE "C"`、UTF8、`psql -At`（LF）、SHA-256。schema 过滤按域替换。

```sh
PGHOST=/tmp PGCLIENTENCODING=UTF8 /opt/homebrew/bin/psql -X -At -U topems_prod -d topems_prod \
  -c "SELECT n.nspname||'.'||c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('mes','wms','scm','srm','pdm','qms','lims','ehs') AND c.relkind='r' ORDER BY (n.nspname||'.'||c.relname) COLLATE \"C\"" \
  | shasum -a 256 | cut -d' ' -f1
```

结果（v2）：**326 行，`78204999a7c557c769e8784f42ce4776c8df69bf3222add0726aa15c7e0b9ca0`**。

历史口径（v1，**仅存档、不再用于复核**）：仅取 `relname`，得 326 行 `841329938ef88294fde40ebbce94dddf7da8d9289f41db464a25f2c1ebfe31bb`。v1 的缺陷是：本域存在 **13 个跨 schema 重名**（`audit_logs` 7 处、`schema_defense_ledger` 7 处、`module_settings` 3 处，以及 `purchase_orders`、`supplier_evaluations`、`suppliers`、`supplier_products`、`quality_inspections`、`quality_standards`、`qa_ehs_hazards`、`sync_record_details`、`sync_records`、`inspection_records` 各 2 处），v1 只能证明"名字集合与重名多重度"稳定，不能证明 schema 归属；**v2 已修复该缺陷**，SHA 现在对 schema 敏感。逐表清单仍以第 1 节表格的 `schema.表名` 为准。

## 2. 现有策略形态体检

359 条策略全部是 `cmd='*'`（ALL）、**全部 PERMISSIVE、0 条 RESTRICTIVE**。所有策略都没有拆分读写动词，这一点与 B5 收口后的形态（SELECT-only 全局策略 + 读写分离）差距明显。

| 指标 | 精确值 | 说明 |
|---|---|---|
| 表总数 / 带 tenant_id | 326 / 284 | 42 张不带 tenant_id |
| RLS 已 ENABLE | 260 | 249 张 tenant 表 + **11 张无 tenant 表**（历史误挂） |
| 已 FORCE | 253 | 242 张 tenant 表 + 11 张无 tenant 表 |
| tenant 表 RLS+FORCE 全齐 | **242 / 284** | 仍有 42 张不达标 |
| tenant 表无 RLS、无策略 | **35** | 完全裸奔 |
| tenant 表 RLS 但无 FORCE | **7** | owner 仍可绕过 |
| 无 tenant 表却挂了 RLS | **11** | 需确认来由 |
| 无任何策略的表 | 66 | 35 张 tenant + 31 张无 tenant |
| `USING(true)` | **76 条 / 76 张表** | 等于对该表全放行 |
| nil UUID 分支 | **198 条 / 171 张表** | 上下文为 nil 或缺失时放行全表 |
| 列侧 `::text` cast | **283 条 / 185 张表** | `(tenant_id)::text = ...`，索引失效且类型不安全 |
| 硬编码 `…0001` | **0 条** | 策略层干净；代码层另有 1091 处字面量（§4） |
| 同表同 cmd 多条 permissive | **99 组 / 99 张表** | 重复策略，需去重 |
| 引用 `app.rls_system` 的策略 | **2 条** | 系统通道几乎未落地 |

### 2.1 现有谓词的真实形态（三类样本）

1. **fail-open 型**（占多数）：
   `current_setting('app.tenant_id', true) IS NULL OR ... = '' OR ... = '000…000' OR tenant_id IS NULL OR tenant_id = ...`
   → 没有上下文时**返回全部行**；上下文为 nil 时也返回全部行。这是与 B5 收口方向（缺失即拒绝）**相反**的语义。
2. **列侧 cast 型**：
   `((tenant_id)::text = NULLIF(current_setting('app.tenant_id', true), '')) OR (tenant_id IS NULL)`
3. **全放行型**：
   `mes_allow_all_capacities`、`mes_allow_all_demand_forecasts` 等 76 条 `USING(true)`。

### 2.2 需要单独处理的精确清单

**A. 35 张 tenant 表无 RLS（必须补齐）**
```
ehs: qa_ehs_accident_investigations, qa_ehs_accident_reviews, qa_ehs_accident_treatments,
     qa_ehs_compliance_items, qa_ehs_contraindications, qa_ehs_detection_records,
     qa_ehs_disease_cases, qa_ehs_drill_plans, qa_ehs_drill_problems, qa_ehs_drill_records,
     qa_ehs_emergency_plan_approvals, qa_ehs_emergency_plan_supplies,
     qa_ehs_emergency_plan_versions, qa_ehs_emergency_plans, qa_ehs_environment,
     qa_ehs_hazard_rectifications, qa_ehs_hazard_verifications, qa_ehs_health_abnormalities,
     qa_ehs_health_exam_plans, qa_ehs_health_exam_records, qa_ehs_health_trainings,
     qa_ehs_inspection_items, qa_ehs_inspection_plans, qa_ehs_inspection_record_items,
     qa_ehs_inspection_records, qa_ehs_material_stocks, qa_ehs_msds,
     qa_ehs_protection_measures, qa_ehs_stock_records, qa_ehs_sync_records, qa_ehs_trainings
qms: qa_inspection_items, qa_inspection_plans, qa_sampling_plans
wms: safety_stock_settings
```

**B. 7 张 tenant 表有 RLS 无 FORCE（owner 可绕过）**
`ehs.qa_ehs_compliance_evaluations、ehs.qa_ehs_discharge_permits、ehs.qa_ehs_env_monitor_records、ehs.qa_ehs_environment_incidents、ehs.qa_ehs_environmental_regulations、lims.qa_lims_analytes、mes.work_orders`

**C. 11 张无 tenant 表却挂了 RLS（来由不明，需 owner 确认）**
`mes.material_categories、mes.material_requirement_items、pdm.pdm_master_data_refs、qms.audit_logs、qms.corrective_actions、qms.dashboard_metrics、qms.inspection_items、qms.quality_inspections、qms.quality_issues、qms.quality_standards、wms.wms_master_data_refs`

**D. 76 张 `USING(true)` 表按 schema 分布**：`ehs 17 / wms 16 / lims 12 / mes 11 / qms 7 / srm 7 / scm 5 / pdm 1`（逐表见第 1 节形态列 `U`）。

## 3. 数据面

| 表 | 行数 | tenant_id | 说明 |
|---|---|---|---|
| `mes.schema_defense_ledger` | 1 | 无 | 防御检查台账 |
| `qms.schema_defense_ledger` | 1 | 无 | 同上 |
| `scm.schema_defense_ledger` | 1 | 无 | 同上 |
| `srm.schema_defense_ledger` | 1 | 无 | 同上 |
| `wms.schema_defense_ledger` | 1 | 无 | 同上 |

- 非空表合计 **5 张**，全部是 `schema_defense_ledger`，合计 5 行；其余 321 张表 0 行。
- **全局行（`tenant_id IS NULL`）= 0；nil UUID 行 = 0；多租户共存的表 = 0。**
- 结论：不存在 B5 那种"全局行未登记导致报表少行"的历史包袱；但也不能用现网数据验证"跨租户 0 行"，窗口验证必须准备 A/B 两个租户的造数脚本。

## 4. 代码侧裸池与 tenant 上下文

字段形态：`mes` 用 `state.pool`（567 处引用）；`wms/scm/srm/pdm` 用 `state.db`（字段类型仍是 `PgPool`，共 704 处引用）；`qms/lims/ehs` 基本不直接持有池。已有 `scope::Db::new` 仅 9 处（mes 1、scm 3、ehs 5），其余 0。

| 模块 | .rs 文件 | `PgPool` 出现 | SQL 语句 | 执行调用 | 其中 `&mut scope` | `scope::Db::new` | tenant 字面量 | tenant 兜底 | `COALESCE(…tenant` |
|---|---|---|---|---|---|---|---|---|---|
| mes | 62 | 26 | 383 | 382 | 26 | 1 | 212 | 13 | 0 |
| wms | 59 | 28 | 339 | 339 | 0 | 0 | 168 | 18 | 33 |
| scm | 45 | 17 | 252 | 252 | 4 | 3 | 208 | 6 | 0 |
| srm | 43 | 63 | 234 | 234 | 1 | 0 | 122 | 5 | 9 |
| pdm | 32 | 2 | 147 | 147 | 153 | 0 | 107 | 2 | 0 |
| qms | 40 | 17 | 293 | 289 | 0 | 0 | 25 | 1 | 5 |
| lims | 36 | 14 | 239 | 239 | 0 | 0 | 27 | 17 | 0 |
| ehs | 29 | 14 | 242 | 242 | 5 | 5 | 222 | 54 | 0 |
| **合计** | **346** | **181** | **2129** | **2124** | **189** | **9** | **1091** | **116** | **47** |

- **未走 scope 的执行点 ≈ 1935 处（91.1% 的执行调用）**。口径：执行调用数 − `&mut scope` 引用数；`pdm` 存在 `&mut scope` 多于执行调用的写法，按 0 计，故该值是下界。
- 连接传递面（仅持有/传参/克隆、不直接执行）：`PgPool` 类型出现 181 处；池字段引用 `state.pool|self.pool|db_pool|pg_pool` 567 处（集中在 mes）、`state.db|self.db` 727 处（wms 293 / scm 183 / pdm 122 / srm 106 / mes 18 / ehs 3 / lims 2），多数是传递。这些位置在改造中需要逐个判定是"换成 `scope::Db`"还是"仅透传"。
- scope 相关符号合计 95 处（`scope::Db` / `scope_read` / `scope_write` / `with_tenant` / `set_tenant`），其中 `scope::Db::new` 仅 9 处；`wms` 虽无 `scope::Db::new` 但有 42 处 scope 符号，属于"半改造"状态。
- `app.rls_system` 在 8 个模块源码中出现 **0 次**：平台视角查询目前没有任何系统通道调用。
- 硬编码租户热点文件：`ehs/src/modules/risk.rs`(45)、`scm/src/modules/data_sync.rs`(30)、`ehs/src/modules/hazard.rs`(27)、`mes/src/modules/aps_scheduling.rs`(25)、`wms/src/modules/wave_pick.rs`(21)、`scm/src/modules/supply_chain_dashboard.rs`(21)。
- 典型 nil 兜底（PDM）：`unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap())`，`change_notice.rs` 多处。
- 典型混用（MES）：`basics.rs` 同文件内既有 `state.pool` 直连，也有 `state.db.scope_read()`；`production_kanban.rs` 用 `check_permission(&state.pool, ...)`。
- 典型事务直连（WMS）：`inventory.rs` 大量 `fetch_one(&mut **txn)`，事务来自裸池。

## 5. 跨租户与全局只读候选

**原则**：默认全部按租户隔离；任何全局只读或系统通道例外必须逐条登记理由，无理由不放行（沿用 B5 的经验：85 处例外最终全部收敛为 A 类）。

- **已证实的全局只读需求：0 条。** 现网 `tenant_id IS NULL` 行数为 0，nil 行为 0，没有既成事实需要保留。
- **候选（待产品/业务确认，未验证调用方）**：
  1. 字典/主数据引用类：`wms.wms_master_data_refs`、`pdm.pdm_master_data_refs`、`mes.material_categories`、`mes.material_requirement_items`、`qms.quality_standards`、`qms.inspection_items`、`lims.qa_lims_analytes`、`srm.supplier_products`、`srm.supplier_evaluations`。
  2. 平台看板/统计类：`qms.dashboard_metrics`、`mes.dashboard_stats`、`scm.supply_chain_dashboard`、`wms.data_sync`、`scm.sync_records`、`ehs.qa_ehs_sync_records`。
  3. 审计/日志类：各 schema 的 `audit_logs`。
  上述每一条都需要给出"为什么不能按租户隔离"的具体理由；没有理由的一律归入租户隔离。
- **系统通道候选端点**：各模块的 dashboard / data_sync / sync_records / master_data_refs 聚合接口。当前代码 **0 处** `app.rls_system`，即使策略支持也无调用路径，属于"策略已关、代码未开"的半成品状态。

## 6. 分批方案（**已被 §6.0 取代，仅存档**）

> **2026-11-10 口径更新：本章的横切批次方案（B4-A~E）不再作为执行依据。**
> 已定口径为 **fail-closed、按模块分窗**——每个模块的"代码 scope 化 + 策略收紧"必须在同一窗口上线，不允许先收紧策略、也不允许跨模块合并窗口。新的模块顺序、试点切口与逐表清单见 [w7-b4-module-comparison-2026-11-10.md](file:///Users/air/TOPEMS/docs/quality/w7-b4-module-comparison-2026-11-10.md)。
> 本章保留原因：其中的"除纯清理批次外无人可脱离代码改造单独上窗口"这一结论仍然成立，且是"按模块分窗"的推导依据。

### 6.0 原批次表

前置判断：**除 B4-A 外，没有任何一个批次可以脱离代码改造单独上窗口。** 因为现有策略是 fail-open，一旦收紧为 fail-closed，1935 处未走 scope 的直连 SQL 会立刻读到 0 行。B4-A 是纯清理型改动（去掉误挂的 RLS），不改变业务可见性，因此可以独立。

| 批次 | 内容 | 迁移笔数 | 依赖 | 验证口径 | 回滚 | 预计窗口 |
|---|---|---|---|---|---|---|
| B4-A | 清理 11 张无 tenant 表的误挂 RLS | 1 | 无（不改变业务可见性） | 11 张表 `relrowsecurity=false`；5 张 `schema_defense_ledger` 行数不变 | 反向 `ENABLE RLS` 脚本 | ≤ 5 min |
| B4-B | 35 张无 RLS 表补 ENABLE+FORCE+策略；7 张补 FORCE | 1–2 | **必须与代码 scope 接线同一窗口** | 42 张表全部 ENABLE+FORCE；A/B 租户各见自己 0 行；无上下文 0 行 | `NO FORCE` + `DROP POLICY` 反向脚本 | 5–10 min |
| B4-C | 收敛 76 张 `USING(true)` + 99 组重复 permissive | 2 | 同上，且该 76 张表的调用方已切 scope | 76 张表策略只剩租户判定；重复组 0 | 还原 `USING(true)` 脚本 | 5–10 min |
| B4-D | 198 条 nil 分支 + 283 条列侧 cast 重写为统一模板（缺失即拒绝、`tenant_id` 原生 uuid 比较） | 2–3 | 同上；需逐个模块回归 | `qual` 中 `::text` 0 处、nil 分支 0 处；`EXPLAIN` 走 tenant 索引 | 按表还原旧策略（脚本生成） | 10–15 min |
| B4-E | 11 张非 tenant 表 + 跨租户端点的系统通道 | 1 | 需先定 §5 白名单 | 系统通道需显式开关，默认关闭 | 关闭 `app.rls_system` 调用 + 还原策略 | 10 min |

- **不能单独上窗口**：B4-B、C、D 三者互相依赖（B 补齐后 C/D 才有完整覆盖面），且都依赖同一批代码发布；B4-E 依赖 §5 的白名单决策。
- **B4-A 可独立**，建议作为第一个小窗口验证流程。
- **B4-A 的处置方式已被推翻**：新文档 §2.3 的结论是 `pdm/wms_master_data_refs` 应改为"全局只读 + 系统通道写"，而不是直接 `DISABLE ROW LEVEL SECURITY`；其余 9 张需先判定死活表。
- 迁移本身在 326 张空表上执行是秒级；窗口时间主要花在验证与回归，不在 DDL。

## 7. 风险与阻断项

| # | 风险 / 阻断 | 卡点 | 需要谁定 |
|---|---|---|---|
| R1 | 安全语义冲突：现网 198 条 nil 分支 + fail-open（无上下文返回全量），与 B5 的 fail-closed 相反 | 不先定"无上下文即拒绝"，收紧策略会一次性打断全部读取 | 架构/安全 |
| R2 | 代码改造量 1935 处未走 scope，横跨 8 模块 346 个文件 | 远超单个窗口，需排版本；无法与 DDL 同窗口完成 | 研发负责人 |
| R3 | 76 张 `USING(true)` 与 99 组重复策略，说明历史上是"先放行后治理" | 去重与收紧顺序错误会造成权限回退 | DBA + 研发 |
| R4 | ~~表名清单口径缺陷：13 个跨 schema 重名，B5 口径 SHA 不区分 schema~~ **已关闭（2026-11-10）**：升 v2 口径 `schema \|\| '.' \|\| relname`，B4/B5 两份文档同步，旧值标注历史口径，全仓只留一套算法 | — | 已决 |
| R5 | 现网 B4 数据为空，无法用真实数据验证隔离与报表 | 必须提供 A/B 租户造数与验收脚本，否则"跨租户 0 行"无法证明 | 测试/业务 |
| R6 | 11 张无 tenant 表挂 RLS、来由不明 | 直接清理可能影响未知调用方 | 原开发者/运维 |
| R7 | 平台端点无系统通道调用（`app.rls_system` 0 处） | §5 白名单未定前，E 批无法开工 | 产品 + 架构 |
| R8 | 35 张 tenant 表完全无 RLS，但代码已默认"隔离成立" | 这部分实际没有任何数据库兜底，属于当前最大暴露面 | 安全 |
| R9 | 现有策略全是 `cmd='*'`，没有读写分离 | 若沿用 B5 的"全局只读 SELECT-only"模式，需要拆策略，工作量计入 D 批 | DBA |

**开工建议**：先做 B4-A（低风险、可独立、验证流程），同时并行推进 R1/R5/R7 三个决策；R2 的代码改造按模块拆版本，`wms`（339 条 SQL、332 处事务直连）与 `scm`（252 条）优先，`qms/lims/ehs` 因已有部分 scope 基础可后置。

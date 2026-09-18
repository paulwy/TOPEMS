

---

## 八、可空 tenant_id 缺列补齐处理结果（本轮）

处理范围：仅 9 个服务 svc/pm、svc/qms、svc/hrm、svc/rd、svc/ehs、svc/mobile、svc/crm、svc/integration、svc/portal 中「表存在可空 tenant_id 列（is_nullable=YES）但 INSERT 列清单漏写 tenant_id」的点。对照 information_schema.columns 逐表确认；NOT NULL 表与不存在的表不在本次范围。

取值规则（与上一轮一致）：有 Extension(claims) 用 claims；事件处理器有 payload.tenant_id 用之；其余无 claims/payload 统一 Uuid::nil()。

### 实际补齐（共 24 处，6 个 crate）

**svc/crm（2 处）**
- event_handlers/mod.rs:221（商机赢单跟进 crm.interactions）：列尾补 tenant_id，$10，bind payload.tenant_id.unwrap_or(nil) —— payload.tenant_id 存在（Option<Uuid>）。
- modules/customer_profile.rs:373（crm.customer_tags）：列尾补 tenant_id，$4，bind topems_shared_auth::middleware::tenant::get_tenant_id_from_claims(&claims)（该 handler 无 headers）。
- 其余 crm 可空表 INSERT（contacts/customer_finance/customers/opportunities/tags/interactions 主路径）上一轮已带 tenant_id。

**svc/hrm（8 处，均无 claims，统一 Uuid::nil()）**
- modules/payroll.rs:239（payroll_runs）、:473（payroll_items）、:739（payroll_details）
- modules/recruitment.rs:302（job_openings）、:679（candidates）、:968（interviews）
- modules/training.rs:150（training_plans）、:434（training_courses）

**svc/mobile（4 处，均无 Extension(claims)，统一 Uuid::nil()）**
- modules/device.rs:186（mobile.devices）
- modules/media.rs:234（mobile.media_files）
- modules/offline.rs:100（mobile.offline_sync_records）
- modules/scan.rs:371（mobile.mobile_scan_records）
- 其余 mobile 可空表（barcode_scans/offline_operations/photo_uploads/push_devices/push_notifications/push_templates/sync_policies）repository.rs 已带 tenant_id。

**svc/integration（4 处，均无 claims，统一 Uuid::nil()）**
- handlers/lims_qms.rs:73（lims_qms_sync）
- handlers/mes_erp.rs:86（mes_erp_sync）
- handlers/wms_scm.rs:72（wms_scm_sync）
- handlers/events.rs:165（integration_events）
- mes_erp_sync.rs:571 已带 tenant_id。

**svc/ehs（1 处，payload 无 tenant_id 字段，Uuid::nil()）**
- event_handlers/mod.rs:226（qa_ehs_employees；HrmEmployeeCreated/UpdatedPayload 均无 tenant_id）。

**svc/portal（5 处，均无 claims，统一 Uuid::nil()）**
- modules/help/mod.rs:215（core_faqs 种子）、:312（core_guides 种子）
- modules/help/guide.rs:214（core_guides）、:253（core_guide_lessons）
- modules/help/faq.rs:167（core_faqs）

### 判定无需补
- svc/pm：pm schema 全部业务表 tenant_id 均为 NOT NULL（无 YS 可空列）；插入现有表（projects/notifications/budgets/settlements/quality_checks/contracts/task 等）上一轮已带 tenant_id；不带 tenant_id 的 INSERT 多指向本地库不存在的表（notification_settings/project_documents/contract_milestones/budget_items/acceptance_plans/settlement_items/project_reports/project_risks 等），属部署环境差异，跳过。
- svc/qms：全部 qa_* INSERT 列清单已含 tenant_id（quality_dashboard 两处已用 Uuid::nil()），无需补。
- svc/rd：rd/rs schema 全部表 tenant_id 均为 NOT NULL，不在可空范围。

### 观察到的另一问题（NOT NULL 遗留，未在本次范围修复）
- svc/pm/modules/project_phase.rs:114：pm.project_phases（NOT NULL tenant_id）的 INSERT 列清单与 VALUES 仍为 12 列/$1–$12，但 bind 链末尾多了一个上一轮加入的 .bind(Uuid::nil())（共 13 个 bind），存在「占位符不足」的运行时风险。建议后续按上一轮 NOT NULL 补齐模式，把 tenant_id 加入列清单与 VALUES（$13）。本次按「只补可空列」约束未改动。

### 验证
- SQLX_OFFLINE=false 下 cargo check：topems-crm / topems-hrm / topems-mobile / topems-integration / topems-portal / topems-ehs 均 0 error（crm 仅 1 个既有 unused import 警告，与本次无关）。这些服务为运行时 sqlx::query()，无需手改 sqlx 离线缓存。
- 按要求未执行 git commit/push。

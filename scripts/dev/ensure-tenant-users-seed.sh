#!/usr/bin/env bash
# hrm 主数据最小种子：iam.users → core_tenant_users（幂等，可重复跑）
# 绑定首租户 82acc468-75dd-4ce7-be27-b6efa65da2c4，role=owner/active
set -euo pipefail
TENANT_ID="${TENANT_ID:-82acc468-75dd-4ce7-be27-b6efa65da2c4}"
psql -U topems -d topems -v ON_ERROR_STOP=1 -c "
INSERT INTO public.core_tenant_users (id, tenant_id, user_id, email, role, status, created_at)
SELECT gen_random_uuid(), '${TENANT_ID}', u.id, u.email, 'owner', 'active', NOW()
FROM iam.users u WHERE u.username IN ('admin','test_admin') AND u.deleted_at IS NULL
ON CONFLICT DO NOTHING;"
echo "core_tenant_users 种子就绪（tenant ${TENANT_ID}）"
# core_tenant_modules 种子：首租户启用 5 模块（overview active_modules 真实化）
psql -U topems -d topems -v ON_ERROR_STOP=1 -c "
INSERT INTO public.core_tenant_modules (id, tenant_id, module_code, module_name, tier, is_active, activated_at)
SELECT gen_random_uuid(), '${TENANT_ID}', m.code, m.name, 'enterprise', true, NOW()
FROM (VALUES ('iam','身份与权限'),('crm','客户管理'),('mes','生产执行'),('erp','企业资源'),('bi','商业智能')) AS m(code,name)
ON CONFLICT DO NOTHING;"
echo "core_tenant_modules 种子就绪（tenant ${TENANT_ID}）"
# core_audit_logs 表自愈（请求审计中间件写库依赖；幂等）——v1.86 统一审计表为 public.audit_logs
# （历史分裂：unified-core middleware 写 public.audit_logs、shared-auth audit_logger 写 core_audit_logs，
#  test 库缺 core_audit_logs 致 usage collect/审计查询失败；现统一单表，两写入路径与 tenant 查询同表）
psql -U topems -d topems -v ON_ERROR_STOP=1 -c "
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    entity_ids JSONB,
    user_id UUID,
    user_name TEXT,
    request_details JSONB,
    response_details JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'success',
    error_message TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);"
echo "audit_logs 表就绪（请求审计写库，统一表名）"
# erp_master_data_audit_trail 补表（消 erp 审计查询 warn；幂等）
psql -U topems -d topems -v ON_ERROR_STOP=1 -c "
CREATE TABLE IF NOT EXISTS erp.erp_master_data_audit_trail (
    id UUID PRIMARY KEY,
    master_data_id UUID,
    domain VARCHAR(100),
    action VARCHAR(50),
    source_service VARCHAR(50),
    target_service VARCHAR(50),
    changed_by TEXT,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);"
echo "erp_master_data_audit_trail 表就绪"
# core_files 补 tenant_id 列（download.rs 引用致 500）+ 存储种子（35MB 演示级；幂等）
psql -U topems -d topems -v ON_ERROR_STOP=1 -c "
ALTER TABLE public.core_files ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_core_files_tenant ON public.core_files(tenant_id);
INSERT INTO core_files (id, name, original_name, path, size, mime_type, extension, folder_id, uploader_id, status, tenant_id, created_at)
SELECT id, name, name, '/uploads/'||name, size, mime, ext, NULL, '0d3a14bb-14a7-488e-a3c1-889f0b9c260f', 'active', '${TENANT_ID}', NOW()
FROM (VALUES ('c0000000-0000-0000-0000-000000000001'::uuid, '季度经营报告.pdf', 5242880::bigint, 'application/pdf', 'pdf'),
             ('c0000000-0000-0000-0000-000000000002'::uuid, '产品手册.pdf', 10485760::bigint, 'application/pdf', 'pdf'),
             ('c0000000-0000-0000-0000-000000000003'::uuid, '数据备份.sql', 20971520::bigint, 'application/sql', 'sql')) AS f(id,name,size,mime,ext)
ON CONFLICT (id) DO NOTHING;"
echo "core_files tenant_id 列 + 存储种子就绪（storage 采集真实源）"
# core_tenant_usage 历史期回填（近 5 月，users=2，api_calls 递减近似；幂等 upsert）
psql -U topems -d topems -v ON_ERROR_STOP=1 -c "
INSERT INTO core_tenant_usage (id, tenant_id, users_count, storage_used_mb, api_calls_count, period_start, period_end, base_cost)
SELECT gen_random_uuid(), t.id, 2, 0, 8 * (6 - i),
       (date_trunc('month', now()) - (i || ' months')::interval)::date,
       (date_trunc('month', now()) - ((i-1) || ' months')::interval - interval '1 day')::date, 0
FROM core_tenants t CROSS JOIN generate_series(1,5) AS i
WHERE t.id = '${TENANT_ID}'
ON CONFLICT (tenant_id, period_start) DO UPDATE SET users_count = EXCLUDED.users_count, api_calls_count = EXCLUDED.api_calls_count;"
# 历史期 storage 近似回填（35/28/21/14/7 递减，与 api_calls 趋势一致；幂等 upsert）
psql -U topems -d topems -v ON_ERROR_STOP=1 -c "
UPDATE core_tenant_usage SET storage_used_mb = v.mb
FROM (VALUES ('2026-09-01'::date,28),('2026-08-01',21),('2026-07-01',14),('2026-06-01',7),('2026-05-01',0)) AS v(d,mb)
WHERE core_tenant_usage.period_start = v.d AND tenant_id = '${TENANT_ID}';"
echo "core_tenant_usage 历史期回填就绪（trends 6 期，含 storage 近似）"
# core_files RLS 租户隔离（有 tenant_id 的租户表，同域宽松策略格式；幂等）
psql -U topems -d topems -v ON_ERROR_STOP=1 -c "
ALTER TABLE public.core_files ENABLE ROW LEVEL SECURITY;
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='core_files' AND policyname='tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON public.core_files USING (
      (current_setting('app.tenant_id', true) IS NULL) OR
      (current_setting('app.tenant_id', true) = '') OR
      (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000') OR
      (tenant_id IS NULL) OR
      (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    );
  END IF;
END \$\$;"
echo "core_files RLS 租户隔离就绪"
# mobile 域补表自愈（契约冒烟 114 端点修复：oa 日程/公告 + push 列 + mes 生产表；幂等）
psql -U topems -d topems -v ON_ERROR_STOP=1 -c "
CREATE TABLE IF NOT EXISTS mobile.oa_calendar_events (
  id UUID PRIMARY KEY, tenant_id UUID NOT NULL, title TEXT, description TEXT,
  type TEXT DEFAULT 'reminder', start_time TIMESTAMPTZ NOT NULL, end_time TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT FALSE, location TEXT, is_reminder BOOLEAN DEFAULT FALSE,
  reminder_minutes INTEGER, color TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS mobile.oa_announcements (
  id UUID PRIMARY KEY, tenant_id UUID NOT NULL, title TEXT, content TEXT,
  priority TEXT DEFAULT 'normal', author TEXT, author_name TEXT,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE mobile.push_notifications ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE mobile.push_notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
DROP INDEX IF EXISTS mobile.uq_push_devices_token;
CREATE UNIQUE INDEX IF NOT EXISTS uq_push_devices_token ON mobile.push_devices(device_token);
ALTER TABLE mobile.push_devices ALTER COLUMN app_version DROP NOT NULL;
ALTER TABLE mobile.push_devices ALTER COLUMN os_version DROP NOT NULL;
ALTER TABLE mobile.push_devices ALTER COLUMN device_model DROP NOT NULL;
CREATE SCHEMA IF NOT EXISTS mes;"
echo "mobile 域核心补表就绪"
psql -U topems -d topems -v ON_ERROR_STOP=1 -c "
CREATE TABLE IF NOT EXISTS mes.production_orders (
  id uuid NOT NULL,
  deleted_at timestamp with time zone,
  organization_id uuid,
  order_number character varying NOT NULL,
  order_type character varying,
  product_name character varying NOT NULL,
  product_code character varying NOT NULL,
  product_specification text,
  batch_number character varying,
  quantity bigint NOT NULL,
  unit character varying,
  planned_quantity integer,
  completed_quantity bigint,
  rejected_quantity integer,
  scrapped_quantity integer,
  priority character varying,
  status character varying NOT NULL,
  progress_percentage integer,
  planned_start_date date,
  planned_end_date date,
  actual_start_date date,
  actual_end_date date,
  estimated_duration_hours numeric,
  actual_duration_hours numeric,
  customer_id uuid,
  customer_name character varying,
  customer_order_number character varying,
  sales_order_id uuid,
  process_route_id uuid,
  process_route_name character varying,
  work_station_id uuid,
  work_station_name character varying,
  assigned_to character varying,
  assigned_to_id uuid,
  team character varying,
  material_requirements jsonb,
  tool_requirements jsonb,
  quality_requirements jsonb,
  special_instructions text,
  notes text,
  created_at timestamp with time zone NOT NULL,
  updated_at timestamp with time zone NOT NULL,
  created_by uuid,
  updated_by uuid,
  tenant_id uuid,
  source_order_id uuid,
  source_order_number character varying,
  workshop_id uuid,
  product_name_en character varying,
  order_no character varying NOT NULL,
  product_id uuid,
  source character varying,
  qualified_quantity bigint
);
CREATE TABLE IF NOT EXISTS mes.equipment (
  id uuid NOT NULL,
  deleted_at timestamp with time zone,
  organization_id uuid NOT NULL,
  equipment_code character varying NOT NULL,
  equipment_name character varying NOT NULL,
  equipment_type character varying,
  category character varying,
  model character varying,
  brand character varying,
  serial_number character varying,
  specification text,
  manufacturer character varying,
  manufacture_date date,
  purchase_date date,
  installation_date date,
  location character varying,
  building character varying,
  floor character varying,
  area character varying,
  work_station_id uuid,
  responsible_person character varying,
  responsible_person_id uuid,
  department character varying,
  purchase_price numeric,
  current_value numeric,
  depreciation_rate numeric,
  warranty_expiry_date date,
  power_consumption numeric,
  capacity character varying,
  max_capacity numeric,
  current_capacity numeric,
  efficiency_percentage numeric,
  availability_percentage numeric,
  performance_percentage numeric,
  quality_percentage numeric,
  oee_percentage numeric,
  status character varying NOT NULL,
  operating_status character varying,
  last_inspection_date date,
  next_inspection_date date,
  last_maintenance_date date,
  next_maintenance_date date,
  maintenance_frequency_days integer,
  total_operating_hours numeric,
  total_maintenance_count integer,
  total_failure_count integer,
  last_failure_date date,
  failure_description text,
  operating_hours jsonb,
  maintenance_history jsonb,
  inspection_history jsonb,
  failure_history jsonb,
  notes text,
  attachments jsonb,
  created_at timestamp with time zone NOT NULL,
  updated_at timestamp with time zone NOT NULL,
  created_by uuid,
  updated_by uuid,
  tenant_id uuid,
  description text NOT NULL,
  equipment_no text,
  equipment_name_en character varying,
  maintenance_cycle integer,
  name character varying,
  warranty_end_date date
);"
echo "mes 生产表就绪（equipment/production_orders）"
# 残余缺表批量自愈（erp/finance/public 11 表，契约日志 relation 500 清零；幂等）
psql -U topems -d topems -v ON_ERROR_STOP=1 -c "
CREATE TABLE IF NOT EXISTS erp.erp_master_data_versions (
  id uuid NOT NULL,
  master_data_id text NOT NULL,
  version_number integer NOT NULL,
  domain text NOT NULL,
  code text NOT NULL,
  name text,
  status text NOT NULL,
  snapshot jsonb NOT NULL,
  changed_by text,
  created_at timestamp with time zone NOT NULL,
  deleted_at timestamp with time zone
);
CREATE TABLE IF NOT EXISTS erp.erp_master_data_conflicts (
  id uuid NOT NULL,
  master_data_id text NOT NULL,
  domain text NOT NULL,
  conflict_type text NOT NULL,
  field_name text NOT NULL,
  local_value jsonb,
  remote_value jsonb,
  remote_service text,
  status text NOT NULL,
  merge_strategy text NOT NULL,
  resolved_value jsonb,
  detected_at timestamp with time zone NOT NULL,
  resolved_at timestamp with time zone,
  resolved_by text,
  deleted_at timestamp with time zone
);
CREATE TABLE IF NOT EXISTS erp.erp_master_data_quality_rules (
  id uuid NOT NULL,
  name text NOT NULL,
  description text,
  domain text NOT NULL,
  field_name text,
  rule_type text NOT NULL,
  severity text NOT NULL,
  config jsonb NOT NULL,
  is_active boolean NOT NULL,
  created_at timestamp with time zone NOT NULL,
  updated_at timestamp with time zone NOT NULL,
  deleted_at timestamp with time zone
);
CREATE TABLE IF NOT EXISTS erp.erp_master_data_quality_reports (
  id uuid NOT NULL,
  domain text NOT NULL,
  total_checked bigint NOT NULL,
  total_issues bigint NOT NULL,
  errors bigint NOT NULL,
  warnings bigint NOT NULL,
  info bigint NOT NULL,
  issues jsonb,
  generated_at timestamp with time zone NOT NULL,
  deleted_at timestamp with time zone
);
CREATE TABLE IF NOT EXISTS finance.sales_invoices (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  invoice_number character varying NOT NULL,
  customer_id uuid NOT NULL,
  customer_name character varying NOT NULL,
  invoice_date date NOT NULL,
  due_date date,
  amount numeric NOT NULL,
  tax_amount numeric NOT NULL,
  total_amount numeric NOT NULL,
  paid_amount numeric NOT NULL,
  status character varying NOT NULL,
  invoice_type character varying NOT NULL,
  cancel_reason text,
  red_flush_of uuid,
  issued_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone NOT NULL,
  updated_at timestamp with time zone NOT NULL,
  deleted_at timestamp with time zone
);
CREATE TABLE IF NOT EXISTS finance.accounting_subjects (
  id uuid NOT NULL,
  deleted_at timestamp with time zone,
  code character varying,
  name character varying,
  tenant_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  category character varying,
  level integer NOT NULL,
  parent_code character varying,
  description text,
  is_cash_flow boolean NOT NULL,
  status character varying NOT NULL,
  created_at timestamp with time zone NOT NULL,
  updated_at timestamp with time zone NOT NULL
);
CREATE TABLE IF NOT EXISTS finance.erp_collection_records (
  id uuid NOT NULL,
  deleted_at timestamp with time zone,
  confirmed_by character varying,
  confirmed_at timestamp with time zone,
  tenant_id uuid,
  invoice_no text,
  amount numeric,
  status text,
  created_at timestamp with time zone,
  collection_no text,
  customer_id uuid,
  customer_name text,
  collection_date date,
  payment_method text,
  remark text,
  created_by uuid,
  currency text,
  category text,
  invoice_date timestamp with time zone,
  fiscal_year integer,
  collected_amount numeric,
  reference_no text,
  updated_at timestamp with time zone NOT NULL
);
CREATE TABLE IF NOT EXISTS public.approvals (
  id uuid NOT NULL,
  workflow_instance_id uuid,
  status text,
  created_at timestamp with time zone NOT NULL,
  deleted_at timestamp with time zone,
  node_id uuid,
  task_name text,
  assignee_id uuid,
  approved_by uuid,
  approval_type text,
  comment text,
  approved_at timestamp with time zone,
  timeout_at timestamp with time zone,
  tenant_id uuid
);
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid NOT NULL,
  deleted_at timestamp with time zone
);
CREATE TABLE IF NOT EXISTS erp.documents (
  id uuid NOT NULL,
  tenant_id uuid,
  title text NOT NULL,
  doc_type text NOT NULL,
  status text NOT NULL,
  file_url text,
  file_size bigint,
  uploader text,
  created_at timestamp with time zone NOT NULL,
  updated_at timestamp with time zone NOT NULL,
  deleted_at timestamp with time zone
);"
echo "残余缺表批量就绪（erp/finance/public）"
# qms/ticket schema + 核心表 + wms 类型对齐（hidden-500 修复；幂等）
psql -U topems -d topems -v ON_ERROR_STOP=1 -c "
CREATE SCHEMA IF NOT EXISTS qms; CREATE SCHEMA IF NOT EXISTS ticket;
CREATE TABLE IF NOT EXISTS qms.qa_quality_costs (
  id uuid NOT NULL,
  cost_no character varying NOT NULL,
  cost_category character varying NOT NULL,
  cost_type character varying,
  amount numeric NOT NULL,
  department character varying,
  description text,
  related_issue_id uuid,
  incurred_date timestamp with time zone,
  created_by character varying,
  created_at timestamp with time zone NOT NULL,
  updated_at timestamp with time zone NOT NULL,
  deleted_at timestamp with time zone,
  tenant_id uuid
);
CREATE TABLE IF NOT EXISTS ticket.core_tickets (
  id uuid NOT NULL,
  deleted_at timestamp with time zone,
  assignee_id uuid,
  closed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL,
  description text,
  metadata jsonb,
  reporter_id uuid,
  resolved_at timestamp with time zone,
  severity text NOT NULL,
  sla_due_at timestamp with time zone,
  source_business_id text,
  source_service text NOT NULL,
  status text NOT NULL,
  tags text[],
  tenant_id uuid NOT NULL,
  ticket_no text,
  ticket_type text NOT NULL,
  title text NOT NULL,
  updated_at timestamp with time zone NOT NULL
);
ALTER TABLE wms.batches ALTER COLUMN location_id TYPE uuid USING NULLIF(location_id::text,'')::uuid;
ALTER TABLE wms.batches ALTER COLUMN warehouse_id TYPE uuid USING NULLIF(warehouse_id::text,'')::uuid;
ALTER TABLE wms.batches ALTER COLUMN supplier_id TYPE uuid USING NULLIF(supplier_id::text,'')::uuid;"
echo "qms/ticket/batches 修复就绪"
# mes.work_stations 补建（aps_scheduling/team 引用；幂等）
psql -U topems -d topems -v ON_ERROR_STOP=1 -c "
CREATE TABLE IF NOT EXISTS mes.work_stations (
  id uuid NOT NULL,
  deleted_at timestamp with time zone,
  organization_id uuid,
  station_no character varying,
  station_code character varying,
  workshop_id uuid,
  station_name character varying NOT NULL,
  station_type character varying,
  description text,
  location character varying,
  building character varying,
  floor character varying,
  area character varying,
  capacity integer,
  current_load integer,
  efficiency_percentage numeric,
  supervisor character varying,
  supervisor_id uuid,
  team character varying,
  equipment_id uuid,
  process_id uuid,
  equipment_ids jsonb,
  available_skills jsonb,
  available_tools jsonb,
  status character varying NOT NULL,
  last_maintenance_date date,
  next_maintenance_date date,
  maintenance_frequency_days integer,
  operating_hours jsonb,
  notes text,
  created_at timestamp with time zone NOT NULL,
  updated_at timestamp with time zone NOT NULL,
  created_by uuid,
  updated_by uuid,
  tenant_id uuid,
  name character varying
);"
echo "mes.work_stations 就绪"
# hrm 组织主数据种子（公司/部门/职位/员工，绑定 iam 用户；幂等）
psql -U topems -d topems -v ON_ERROR_STOP=1 -c "
INSERT INTO hrm.companies (id, tenant_id, organization_id, name, short_name, status, created_at, updated_at)
SELECT 'a1000000-0000-4000-8000-000000000001','82acc468-75dd-4ce7-be27-b6efa65da2c4','82acc468-75dd-4ce7-be27-b6efa65da2c4','TOPEMS 智能制造有限公司','TOPEMS','active',NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM hrm.companies WHERE id='a1000000-0000-4000-8000-000000000001');
INSERT INTO hrm.departments (id, tenant_id, organization_id, company_id, name, code, parent_id, status, created_at, updated_at) VALUES
 ('a1000000-0000-4000-8000-000000000010','82acc468-75dd-4ce7-be27-b6efa65da2c4','82acc468-75dd-4ce7-be27-b6efa65da2c4','a1000000-0000-4000-8000-000000000001','总经办','HQ',NULL,'active',NOW(),NOW()),
 ('a1000000-0000-4000-8000-000000000011','82acc468-75dd-4ce7-be27-b6efa65da2c4','82acc468-75dd-4ce7-be27-b6efa65da2c4','a1000000-0000-4000-8000-000000000001','生产部','PROD','a1000000-0000-4000-8000-000000000010','active',NOW(),NOW()),
 ('a1000000-0000-4000-8000-000000000012','82acc468-75dd-4ce7-be27-b6efa65da2c4','82acc468-75dd-4ce7-be27-b6efa65da2c4','a1000000-0000-4000-8000-000000000001','质量部','QA','a1000000-0000-4000-8000-000000000010','active',NOW(),NOW()),
 ('a1000000-0000-4000-8000-000000000013','82acc468-75dd-4ce7-be27-b6efa65da2c4','82acc468-75dd-4ce7-be27-b6efa65da2c4','a1000000-0000-4000-8000-000000000001','信息技术部','IT','a1000000-0000-4000-8000-000000000010','active',NOW(),NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO hrm.positions (id, tenant_id, organization_id, company_id, department_id, name, code, level, status, created_at, updated_at) VALUES
 ('a1000000-0000-4000-8000-000000000020','82acc468-75dd-4ce7-be27-b6efa65da2c4','82acc468-75dd-4ce7-be27-b6efa65da2c4','a1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000010','总经理','GM',1,'active',NOW(),NOW()),
 ('a1000000-0000-4000-8000-000000000021','82acc468-75dd-4ce7-be27-b6efa65da2c4','82acc468-75dd-4ce7-be27-b6efa65da2c4','a1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000011','生产主管','PROD_MGR',2,'active',NOW(),NOW()),
 ('a1000000-0000-4000-8000-000000000022','82acc468-75dd-4ce7-be27-b6efa65da2c4','82acc468-75dd-4ce7-be27-b6efa65da2c4','a1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000012','质量主管','QA_MGR',2,'active',NOW(),NOW()),
 ('a1000000-0000-4000-8000-000000000023','82acc468-75dd-4ce7-be27-b6efa65da2c4','82acc468-75dd-4ce7-be27-b6efa65da2c4','a1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000013','系统管理员','SYS_ADMIN',3,'active',NOW(),NOW()),
 ('a1000000-0000-4000-8000-000000000024','82acc468-75dd-4ce7-be27-b6efa65da2c4','82acc468-75dd-4ce7-be27-b6efa65da2c4','a1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000013','运维工程师','OPS',4,'active',NOW(),NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO hrm.employees (id, tenant_id, organization_id, org_id, company_id, department_id, position_id, employee_number, name, user_id, email, phone, gender, hire_date, status, created_at, updated_at) VALUES
 ('a1000000-0000-4000-8000-000000000030','82acc468-75dd-4ce7-be27-b6efa65da2c4','82acc468-75dd-4ce7-be27-b6efa65da2c4','82acc468-75dd-4ce7-be27-b6efa65da2c4','a1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000010','a1000000-0000-4000-8000-000000000020','E0001','张总','e8f2a1f4-8f99-4059-b8ca-3a05e50ac6d4','admin@topems.local','13800000001','male','2026-01-01','active',NOW(),NOW()),
 ('a1000000-0000-4000-8000-000000000031','82acc468-75dd-4ce7-be27-b6efa65da2c4','82acc468-75dd-4ce7-be27-b6efa65da2c4','82acc468-75dd-4ce7-be27-b6efa65da2c4','a1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000013','a1000000-0000-4000-8000-000000000023','E0002','李工','0d3a14bb-14a7-488e-a3c1-889f0b9c260f','test_admin@topems.local','13800000002','male','2026-01-01','active',NOW(),NOW()),
 ('a1000000-0000-4000-8000-000000000032','82acc468-75dd-4ce7-be27-b6efa65da2c4','82acc468-75dd-4ce7-be27-b6efa65da2c4','82acc468-75dd-4ce7-be27-b6efa65da2c4','a1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000013','a1000000-0000-4000-8000-000000000024','E0003','王工','0d3a14bb-14a7-488e-a3c1-889f0b9c260f','ops@topems.local','13800000003','male','2026-02-01','active',NOW(),NOW())
ON CONFLICT (id) DO NOTHING;"
echo "hrm 组织主数据就绪（1公司/4部门/5职位/3员工）"



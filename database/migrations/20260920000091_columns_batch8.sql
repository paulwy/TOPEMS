-- 000091: 冒烟 39 条第二轮代码引用缺列补全
-- 5433 缺 rs.project_phases（5432 已存在则跳过），DDL 与 5432 对齐
CREATE TABLE IF NOT EXISTS rs.project_phases (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    project_id uuid NOT NULL,
    phase_number integer NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    start_date timestamptz,
    end_date timestamptz,
    planned_duration_days integer,
    actual_duration_days integer,
    status character varying(50) DEFAULT 'NOT_STARTED'::character varying NOT NULL,
    progress integer DEFAULT 0,
    predecessor_id uuid,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    deleted_at timestamptz,
    tenant_id uuid NOT NULL,
    weight integer,
    CONSTRAINT ck_project_phases_status_standard CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::text[]))))
);
ALTER TABLE rs.project_phases ADD COLUMN IF NOT EXISTS weight INTEGER;
CREATE INDEX IF NOT EXISTS idx_project_phases_project_id ON rs.project_phases USING btree (project_id);

-- erp db/changes 需要 backup_data（JSONB，与 old_definition 同族）
ALTER TABLE public.sys_db_changes ADD COLUMN IF NOT EXISTS backup_data JSONB;

-- rd /projects/{id}/gantt：ProjectPhase.weight (i32)
ALTER TABLE rs.project_phases ADD COLUMN IF NOT EXISTS weight INTEGER;
-- mes analytics 车间成本：production_costs.workshop
ALTER TABLE mes.production_costs ADD COLUMN IF NOT EXISTS workshop TEXT;

-- mes analytics MTBF/故障原因：equipment_maintenance_records 补列
ALTER TABLE mes.equipment_maintenance_records ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE mes.equipment_maintenance_records ADD COLUMN IF NOT EXISTS fault_reason TEXT;

-- pm project 阶段/里程碑排序字段
ALTER TABLE pm.project_phases ADD COLUMN IF NOT EXISTS sequence_number INTEGER;
ALTER TABLE pm.project_milestones ADD COLUMN IF NOT EXISTS date TIMESTAMPTZ;

-- wms.locations tenant_id 回填（000083 补列后数据为 NULL，解码报 UnexpectedNull；
-- 5433 影子表仅 id/deleted_at，先补列再回填）
ALTER TABLE wms.locations ADD COLUMN IF NOT EXISTS tenant_id uuid;
UPDATE wms.locations SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

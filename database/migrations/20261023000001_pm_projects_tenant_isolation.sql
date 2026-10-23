-- v1.89 业务缺口批1：PM projects 隔离补齐 + 表结构补全（幂等）
-- 背景：pm.projects 全仓无正式建表 SQL（database/migrations 与 init 均无 CREATE，
-- 仅 20261017000014 存在 ALTER 引用），主库缺表、test 库为 id 空壳，
-- 且 INSERT/SELECT 引用的 name_en/tags/progress 等与旧表结构错位，
-- 导致 PM 列表/创建 500。本迁移：幂等建表（正确类型对齐 Project struct）+ 补列 + 唯一约束 + RLS。

CREATE TABLE IF NOT EXISTS pm.projects (
    id uuid PRIMARY KEY,
    name varchar(255) NOT NULL,
    code varchar(100) NOT NULL,
    description text,
    project_type varchar(100) NOT NULL DEFAULT 'general',
    status varchar(50) NOT NULL DEFAULT 'draft',
    leader varchar(255),
    start_date timestamptz,
    end_date timestamptz,
    budget numeric(18,4),
    progress integer NOT NULL DEFAULT 0,
    project_config jsonb,
    benefit_target jsonb,
    risk_level varchar(50),
    priority integer,
    tags text[],
    parent_id uuid,
    workspace_id uuid,
    tenant_id uuid,
    created_by varchar(255),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    name_en varchar(255),
    cost_center_id varchar(255),
    cost_center_name varchar(255),
    deleted_at timestamptz
);

-- 兼容已存在（空壳/旧结构）的表：逐列幂等补全
ALTER TABLE pm.projects ADD COLUMN IF NOT EXISTS name varchar(255);
ALTER TABLE pm.projects ADD COLUMN IF NOT EXISTS code varchar(100);
ALTER TABLE pm.projects ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE pm.projects ADD COLUMN IF NOT EXISTS project_type varchar(100) NOT NULL DEFAULT 'general';
ALTER TABLE pm.projects ADD COLUMN IF NOT EXISTS status varchar(50) NOT NULL DEFAULT 'draft';
ALTER TABLE pm.projects ADD COLUMN IF NOT EXISTS leader varchar(255);
ALTER TABLE pm.projects ADD COLUMN IF NOT EXISTS start_date timestamptz;
ALTER TABLE pm.projects ADD COLUMN IF NOT EXISTS end_date timestamptz;
ALTER TABLE pm.projects ADD COLUMN IF NOT EXISTS budget numeric(18,4);
ALTER TABLE pm.projects ADD COLUMN IF NOT EXISTS progress integer NOT NULL DEFAULT 0;
ALTER TABLE pm.projects ADD COLUMN IF NOT EXISTS project_config jsonb;
ALTER TABLE pm.projects ADD COLUMN IF NOT EXISTS benefit_target jsonb;
ALTER TABLE pm.projects ADD COLUMN IF NOT EXISTS risk_level varchar(50);
ALTER TABLE pm.projects ADD COLUMN IF NOT EXISTS priority integer;
ALTER TABLE pm.projects ADD COLUMN IF NOT EXISTS tags text[];
ALTER TABLE pm.projects ADD COLUMN IF NOT EXISTS parent_id uuid;
ALTER TABLE pm.projects ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE pm.projects ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE pm.projects ADD COLUMN IF NOT EXISTS created_by varchar(255);
ALTER TABLE pm.projects ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE pm.projects ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE pm.projects ADD COLUMN IF NOT EXISTS name_en varchar(255);
ALTER TABLE pm.projects ADD COLUMN IF NOT EXISTS cost_center_id varchar(255);
ALTER TABLE pm.projects ADD COLUMN IF NOT EXISTS cost_center_name varchar(255);
ALTER TABLE pm.projects ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 唯一约束（INSERT ON CONFLICT (code) 依赖）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'pm.projects'::regclass AND conname = 'projects_code_key') THEN
    ALTER TABLE pm.projects ADD CONSTRAINT projects_code_key UNIQUE (code);
  END IF;
END $$;

-- 租户隔离策略（宽松格式，与 public.core_roles / erp.bank_accounts 一致）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'pm' AND tablename = 'projects' AND policyname = 'tenant_isolation_projects') THEN
    ALTER TABLE pm.projects ENABLE ROW LEVEL SECURITY;
    CREATE POLICY tenant_isolation_projects ON pm.projects USING (
      (current_setting('app.tenant_id', true) IS NULL) OR
      (current_setting('app.tenant_id', true) = '') OR
      (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000') OR
      (tenant_id IS NULL) OR
      (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    );
  END IF;
END $$;

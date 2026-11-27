-- 回滚 20261127210000：按 pg_dump 原样重建 iam.position_roles / iam.position_permissions
-- 说明：被删两表双库均 0 行，回滚只恢复空结构骨架，不恢复数据（无数据可恢复）。
--       列/约束/索引/FK/策略口径以删除前 prod 与本机库内实测结构为准（uuid 主键、tenant_id NOT NULL）。
--       position_roles.role_id 原误指空壳表 iam.roles：该 FK 加存在性守卫，iam.roles 已不存在则跳过并 NOTICE。
--       授权对象 topems_app 做角色存在性包裹，生产库缺该角色时不会报错。

BEGIN;

CREATE TABLE IF NOT EXISTS iam.position_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    position_id uuid NOT NULL,
    permission character varying(128) NOT NULL,
    tenant_id uuid NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS iam.position_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    position_id uuid NOT NULL,
    role_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    deleted_at timestamp with time zone
);

-- 主键 + 唯一约束
ALTER TABLE ONLY iam.position_permissions
    ADD CONSTRAINT position_permissions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY iam.position_permissions
    ADD CONSTRAINT position_permissions_position_id_permission_key UNIQUE (position_id, permission);
ALTER TABLE ONLY iam.position_roles
    ADD CONSTRAINT position_roles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY iam.position_roles
    ADD CONSTRAINT position_roles_position_id_role_id_key UNIQUE (position_id, role_id);

-- 索引
CREATE INDEX IF NOT EXISTS idx_position_permissions_position_id ON iam.position_permissions USING btree (position_id);
CREATE INDEX IF NOT EXISTS idx_position_roles_position_id ON iam.position_roles USING btree (position_id);
CREATE INDEX IF NOT EXISTS idx_position_roles_role_id ON iam.position_roles USING btree (role_id);

-- 外键：position_id → iam.positions（保留线主表），CASCADE
ALTER TABLE ONLY iam.position_permissions
    ADD CONSTRAINT position_permissions_position_id_fkey FOREIGN KEY (position_id) REFERENCES iam.positions(id) ON DELETE CASCADE;
ALTER TABLE ONLY iam.position_roles
    ADD CONSTRAINT position_roles_position_id_fkey FOREIGN KEY (position_id) REFERENCES iam.positions(id) ON DELETE CASCADE;

-- 外键：role_id → iam.roles（原误指空壳表）；目标表不存在则跳过，避免回滚脆断
DO $rb_role_fk$
BEGIN
  IF to_regclass('iam.roles') IS NOT NULL THEN
    ALTER TABLE ONLY iam.position_roles
      ADD CONSTRAINT position_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES iam.roles(id) ON DELETE CASCADE;
  ELSE
    RAISE NOTICE 'skip: iam.roles 不存在，未恢复 position_roles_role_id_fkey（误指空壳表，随 iam.roles 一并另议）';
  END IF;
END
$rb_role_fk$;

-- RLS 开关
ALTER TABLE iam.position_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ONLY iam.position_permissions FORCE ROW LEVEL SECURITY;
ALTER TABLE iam.position_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ONLY iam.position_roles FORCE ROW LEVEL SECURITY;

-- 租户隔离策略（与库内原定义一致：租户上下文为空/零租户时放行，否则按 app.tenant_id 隔离）
CREATE POLICY rls_tenant_isolation ON iam.position_permissions
  USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
  WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

CREATE POLICY rls_tenant_isolation ON iam.position_roles
  USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
  WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

CREATE POLICY tenant_isolation_position_permissions ON iam.position_permissions
  USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL)));

CREATE POLICY tenant_isolation_position_roles ON iam.position_roles
  USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL)));

-- 条件授权：topems_app 角色存在才 GRANT
DO $rb_grant$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'topems_app') THEN
    GRANT SELECT, INSERT, DELETE, UPDATE ON TABLE iam.position_permissions TO topems_app;
    GRANT SELECT, INSERT, DELETE, UPDATE ON TABLE iam.position_roles TO topems_app;
  END IF;
END
$rb_grant$;

COMMIT;

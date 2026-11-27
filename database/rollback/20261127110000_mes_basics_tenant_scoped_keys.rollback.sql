-- 回滚 20261127110000：撤销 mes 基础资料租户业务键唯一索引
-- 注意：dev 库这批索引源自被撤回的 20261127090000，回滚会把 dev 与 prod 一起退回「无约束」状态。
SET search_path = pg_catalog, public, pg_temp;
DROP INDEX IF EXISTS mes.workshops_tenant_code_key;
DROP INDEX IF EXISTS mes.workshops_id_tenant_key;
DROP INDEX IF EXISTS mes.production_lines_tenant_code_key;
DROP INDEX IF EXISTS mes.shifts_tenant_code_key;
DROP INDEX IF EXISTS mes.work_calendars_tenant_code_key;

-- 回滚 20261124150000_hrm_init_status_tenant_step_unique
-- 仅删除本迁移新增的唯一索引，hrm.initialization_status 的所有进度行原样保留。
-- 注意：索引删除后 setup.rs 的 ON CONFLICT (tenant_id, step_name) 补种会失效，
-- 回滚索引必须同步回滚 topems-hrm 到不依赖该索引的版本。

DROP INDEX IF EXISTS hrm.idx_init_status_tenant_step_unique;

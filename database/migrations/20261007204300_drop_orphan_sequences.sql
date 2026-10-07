-- =============================================================================
-- 20261007204300_drop_orphan_sequences.sql
-- =============================================================================
-- 修复 DB-05（审计 P3）：DROP 2 个真孤儿序列。
--
-- 实证（5432 + 5433 双库）：
--   mes.tenant_permissions_id_seq  — pg_depend 无 deptype='a'（无列归属），
--                                    pg_attrdef 无任何列 DEFAULT nextval() 引用。
--   mes.tool_permissions_id_seq    — 同上，真孤儿。
--   两序列在 pg_depend 中的 deptype='n' 依赖指向已 DROP 的表对象
--   （5432 refobjid=642167 / 5433 refobjid=407262，均不可 ::regclass 解析）。
--   5433 上 public.tenant_permissions_id_seq 由 public.tenant_permissions.id
--   合法 OWNED BY（deptype='a'），本迁移不触碰。
--
-- 幂等：DROP SEQUENCE IF EXISTS。可重放。
-- =============================================================================

DROP SEQUENCE IF EXISTS mes.tenant_permissions_id_seq;
DROP SEQUENCE IF EXISTS mes.tool_permissions_id_seq;

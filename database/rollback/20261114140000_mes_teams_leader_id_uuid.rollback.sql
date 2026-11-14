-- ============================================================
-- 回滚：20261114140000_mes_teams_leader_id_uuid.sql
--
-- 把 mes.teams.leader_id 由 uuid 改回 varchar(64)。
--
-- 数据影响：
--   1. uuid 文本化可逆（36 字符，落在 varchar(64) 内）；
--   2. 迁移时由空串转换而来的 NULL 不会恢复成空串——回滚只恢复类型，不恢复
--      『未填写』的两种表示差异；如需区分，回滚前另行备份映射关系。
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '60s';

DO $mes_teams_leader_id_uuid_rb$
DECLARE
    v_type text;
BEGIN
    SELECT c.data_type INTO v_type
      FROM information_schema.columns c
     WHERE c.table_schema = 'mes' AND c.table_name = 'teams' AND c.column_name = 'leader_id';

    IF v_type IS NULL THEN
        RAISE EXCEPTION 'mes-teams-leader-id-ROLLBACK ABORT: mes.teams.leader_id 不存在';
    ELSIF v_type = 'character varying' THEN
        RAISE NOTICE 'mes.teams.leader_id: 当前=varchar，跳过';
    ELSIF v_type = 'uuid' THEN
        ALTER TABLE mes.teams
            ALTER COLUMN leader_id TYPE varchar(64) USING leader_id::text;
        RAISE NOTICE 'mes.teams.leader_id: uuid -> varchar(64)';
    ELSE
        RAISE EXCEPTION 'mes-teams-leader-id-ROLLBACK ABORT: 非预期列类型 %', v_type;
    END IF;
END
$mes_teams_leader_id_uuid_rb$;

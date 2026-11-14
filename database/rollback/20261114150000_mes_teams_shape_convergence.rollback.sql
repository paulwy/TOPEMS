-- ============================================================
-- 回滚：20261114150000_mes_teams_shape_convergence.sql
--
-- 口径（保守回滚，不做任何可能丢数据的收窄）：
--   1. leader_id：uuid -> varchar(64)，与 20260921000106 一族的既有形状对齐；
--      uuid 文本化可逆（36 字符 < 64），无损。
--   2. status / member_count / created_at / updated_at：撤销 NOT NULL（DEFAULT 保留），
--      使"原本可空"的环境回到可空；已经不可空的 prod 侧回滚后变成可空，属预期。
--   3. 列宽（team_code 100 / team_name 200 / team_type 50）、tenant_id 列、三个索引、
--      team_code 唯一约束、work_station_id 外键：一律保留。
--      理由：加宽与补列是安全超集；收窄会截断数据，删约束会削弱既有 prod 形状。
--      如需完整回到某一历史形状，请按环境单独评估，不走本脚本。
--   4. 已由空串转换而来的 NULL 不会恢复成空串（同 14140000 口径）。
--   5. 文件内不含 BEGIN/COMMIT：入口统一用 psql --single-transaction 包裹。
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '120s';

DO $teams_shape_rb$
DECLARE
    v_type text;
BEGIN
    SELECT c.data_type INTO v_type
      FROM information_schema.columns c
     WHERE c.table_schema = 'mes' AND c.table_name = 'teams' AND c.column_name = 'leader_id';

    IF v_type IS NULL THEN
        RAISE EXCEPTION 'mes-teams-shape-ROLLBACK ABORT: mes.teams.leader_id 不存在';
    ELSIF v_type = 'uuid' THEN
        ALTER TABLE mes.teams ALTER COLUMN leader_id TYPE varchar(64) USING leader_id::text;
        RAISE NOTICE 'mes.teams.leader_id: uuid -> varchar(64)';
    ELSE
        RAISE NOTICE 'mes.teams.leader_id: 当前=% ，跳过类型回滚', v_type;
    END IF;
END
$teams_shape_rb$;

DO $teams_null_rb$
DECLARE
    c text;
BEGIN
    FOREACH c IN ARRAY ARRAY['status', 'member_count', 'created_at', 'updated_at'] LOOP
        BEGIN
            EXECUTE format('ALTER TABLE mes.teams ALTER COLUMN %I DROP NOT NULL', c);
            RAISE NOTICE 'mes.teams.%: DROP NOT NULL', c;
        EXCEPTION WHEN undefined_column THEN
            RAISE NOTICE 'mes.teams.% 不存在，跳过', c;
        END;
    END LOOP;
END
$teams_null_rb$;

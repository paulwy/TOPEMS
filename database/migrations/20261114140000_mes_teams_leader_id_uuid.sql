-- ============================================================
-- MES teams.leader_id：varchar(64) → uuid
--
-- 背景：
--   svc/mes/src/modules/team.rs 将 leader_id 声明为 Option<Uuid>（列表/详情/
--   创建/更新 4 个端点），而 20260921000106_mes_schema_align.sql 与生产运行库
--   该列为 varchar(64)。sqlx 以 UUID 解码 varchar 必炸；列表接口因空表或首行
--   leader_id NULL 被掩盖。
--
-- 口径：
--   1. 只改 mes.teams.leader_id 单列，不带 db10（20261103230000）的其余 17 列；
--   2. 空串/纯空白视为未填写 → NULL（NULLIF + btrim）；非法 uuid 文本由
--      ::uuid 转换直接报错中止，不做静默兜底；
--   3. 幂等：已是 uuid 的环境为 no-op；列不存在或非字符类型时 RAISE EXCEPTION。
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '60s';

DO $mes_teams_leader_id_uuid$
DECLARE
    v_type text;
BEGIN
    SELECT c.data_type INTO v_type
      FROM information_schema.columns c
     WHERE c.table_schema = 'mes' AND c.table_name = 'teams' AND c.column_name = 'leader_id';

    IF v_type IS NULL THEN
        RAISE EXCEPTION 'mes-teams-leader-id ABORT: mes.teams.leader_id 不存在';
    ELSIF v_type = 'uuid' THEN
        RAISE NOTICE 'mes.teams.leader_id: 当前=uuid，跳过';
    ELSIF v_type IN ('character varying', 'character', 'text') THEN
        ALTER TABLE mes.teams
            ALTER COLUMN leader_id TYPE uuid USING NULLIF(btrim(leader_id), '')::uuid;
        RAISE NOTICE 'mes.teams.leader_id: % -> uuid（空串/纯空白转 NULL）', v_type;
    ELSE
        RAISE EXCEPTION 'mes-teams-leader-id ABORT: 非预期列类型 %', v_type;
    END IF;
END
$mes_teams_leader_id_uuid$;

-- ============================================================
-- 回滚：20261114160000_mes_teams_team_code_tenant_scoped_unique.sql
--
-- 口径：
--   1. 先做预检：单列 UNIQUE (team_code) 要求 team_code 全局唯一。若当前数据里存在
--      team_code 重复（典型来源：两个租户各自一个 TEAM-001），回滚会因建键失败而中断，
--      因此这里主动检查并拒绝回滚，报出重复组数与原值样例，交由人工决策。
--   2. 预检通过后：DROP 复合键 teams_tenant_id_team_code_key（IF EXISTS），
--      重建单列键 teams_team_code_key UNIQUE (team_code)。
--   3. 不删 idx_teams_team_code 单列普通索引，不动 tenant_id 列与任何数据。
--   4. 本回滚不删除行、不改值；拒绝回滚时库保持原状（调用方用 psql --single-transaction 包裹）。
--   5. 文件内不含 BEGIN/COMMIT。
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '120s';

DO $teams_tenant_unique_rb$
DECLARE
    v_dup   bigint;
    v_dup_codes text;
BEGIN
    SELECT count(*), string_agg(team_code, ', ' ORDER BY team_code)
      INTO v_dup, v_dup_codes
      FROM (
        SELECT team_code
          FROM mes.teams
         GROUP BY team_code
        HAVING count(*) > 1
      ) d;

    IF v_dup > 0 THEN
        RAISE EXCEPTION 'mes-teams-tenant-unique-ROLLBACK REFUSED: team_code 有 % 组重复（样例：%），单列唯一键无法建立，拒绝回滚',
            v_dup, left(v_dup_codes, 200);
    END IF;

    ALTER TABLE mes.teams DROP CONSTRAINT IF EXISTS teams_tenant_id_team_code_key;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conrelid = 'mes.teams'::regclass
           AND conname = 'teams_team_code_key'
    ) THEN
        ALTER TABLE mes.teams ADD CONSTRAINT teams_team_code_key UNIQUE (team_code);
    END IF;

    RAISE NOTICE 'mes-teams-tenant-unique-ROLLBACK 完成：唯一维度回到 (team_code)';
END
$teams_tenant_unique_rb$;

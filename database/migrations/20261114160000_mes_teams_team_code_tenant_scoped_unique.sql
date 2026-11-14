-- ============================================================
-- 20261114160000_mes_teams_team_code_tenant_scoped_unique.sql
--
-- 背景：
--   mes.teams 是多租户表（tenant_id + RLS 策略 tenant_isolation_teams），但 team_code 的
--   唯一性一直是单列 UNIQUE (team_code)：
--     * 源头：20261007000005_align_missing_constraints_selfheal.sql L467-468 的自愈补丁；
--     * 复刻：20261114150000_mes_teams_shape_convergence.sql 第 7 段（新环境缺失时补建）。
--   单列唯一意味着两个租户各自拥有 TEAM-001 会撞键；svc/mes 没有 23505 映射，
--   表现为 500「创建班组失败」。本迁移把唯一键收到租户维度。
--
-- 口径：
--   1. 删除单列唯一键 teams_team_code_key（DROP ... IF EXISTS 满足破坏性扫描的 presence-guard，
--      不需要 destructive ticket；数据不删不改）。
--   2. 建租户级唯一键 teams_tenant_id_team_code_key
--        UNIQUE NULLS NOT DISTINCT (tenant_id, team_code)
--      NULLS NOT DISTINCT 的理由：该表 RLS 策略是 fail-open，允许 tenant_id IS NULL 的行存在；
--      PG 默认 NULLS DISTINCT 会让多行 (NULL, 'TEAM-001') 全部通过，等于对无租户行不设防。
--   3. 保留 idx_teams_team_code 单列普通索引：复合唯一索引无法替代"仅按 team_code 检索"
--      （team.rs 的 team_code ILIKE 过滤），删掉会退化。
--   4. 建键前查重：GROUP BY tenant_id, team_code HAVING count(*) > 1 必须为 0，
--      否则 RAISE EXCEPTION 中止，不静默建失败。
--
-- 依赖与不可回退点（重要）：
--   20261114150000 第 7 段用
--       pg_get_constraintdef(oid) LIKE '%UNIQUE (team_code)%'
--   做文本匹配判断"唯一键已存在"。改成复合键后约束定义文本不含该子串，那个守卫认不出来。
--   迁移只执行一次，正常不会重跑；**不要回头重跑 150000 的第 7 段**，
--   否则会在复合键之上再补一个单列唯一键，把本迁移修掉的问题重新引入。
--
-- 幂等性：
--   DROP IF EXISTS + 约束存在性守卫 + 查重守卫，可重复执行；对
--   "只有单列键"、"只有复合键"、"两者都无"、"两者都有（异常态）" 四种库状态都成立。
-- 文件内不含 BEGIN/COMMIT：入口统一用 psql --single-transaction 包裹。
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '120s';

-- 1. 删除单列唯一键（仍是普通约束删除，不动数据）
ALTER TABLE mes.teams DROP CONSTRAINT IF EXISTS teams_team_code_key;

-- 2. 查重守卫 + 建租户级复合唯一键
DO $teams_tenant_unique$
DECLARE
    v_dup bigint;
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conrelid = 'mes.teams'::regclass
           AND conname = 'teams_tenant_id_team_code_key'
    ) THEN
        RAISE NOTICE 'teams_tenant_id_team_code_key 已存在，跳过';
        RETURN;
    END IF;

    SELECT count(*) INTO v_dup FROM (
        SELECT tenant_id, team_code
          FROM mes.teams
         GROUP BY tenant_id, team_code
        HAVING count(*) > 1
    ) d;

    IF v_dup > 0 THEN
        RAISE EXCEPTION 'mes-teams-tenant-unique ABORT: (tenant_id, team_code) 有 % 组重复，无法建唯一约束', v_dup;
    END IF;

    ALTER TABLE mes.teams
        ADD CONSTRAINT teams_tenant_id_team_code_key
        UNIQUE NULLS NOT DISTINCT (tenant_id, team_code);
    RAISE NOTICE 'teams_tenant_id_team_code_key 已建立';
END
$teams_tenant_unique$;

-- 3. 收敛自检：单列键必须已消失，复合键必须存在
DO $teams_tenant_unique_verify$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conrelid = 'mes.teams'::regclass
           AND conname = 'teams_team_code_key'
    ) THEN
        RAISE EXCEPTION 'mes-teams-tenant-unique ABORT: 单列键 teams_team_code_key 仍存在';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conrelid = 'mes.teams'::regclass
           AND conname = 'teams_tenant_id_team_code_key'
    ) THEN
        RAISE EXCEPTION 'mes-teams-tenant-unique ABORT: 复合键 teams_tenant_id_team_code_key 缺失';
    END IF;

    RAISE NOTICE 'mes-teams-tenant-unique 自检通过：唯一维度 = (tenant_id, team_code)';
END
$teams_tenant_unique_verify$;

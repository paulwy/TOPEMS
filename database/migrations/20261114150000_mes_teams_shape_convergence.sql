-- ============================================================
-- 20261114150000_mes_teams_shape_convergence.sql
--
-- 背景：mes.teams 存在两份互相矛盾的 CREATE TABLE IF NOT EXISTS：
--   20260921000106_mes_schema_align.sql      L14-27   ：leader_id VARCHAR(64)、team_code(100)、
--                                                        team_name(200)、team_type(50)、无 tenant_id（随后 ADD COLUMN）
--   20260926120000_app_schema_tables.sql     L1857-1872：leader_id uuid、team_code(64)、team_name(128)、
--                                                        team_type(32)、含 tenant_id
--   谁先建表谁生效 → 新环境每次建库形状随机（prod 落在第一份，dev 落在第二份）。
--
-- 本迁移不修改任何历史迁移文件，用幂等收敛把两种建库结果钉到同一目标形状：
--   * tenant_id 存在（uuid，可空）
--   * leader_id uuid
--   * team_code varchar(100)、team_name varchar(200)、team_type varchar(50)（取较大宽度：加宽安全，收窄会截断）
--   * status / member_count / created_at / updated_at NOT NULL + 默认值（对齐 prod 既有的严格侧）
--
-- 幂等性：全部语句可重复执行；对「已有 tenant_id」与「没有 tenant_id」、表已存在与不存在均成立。
-- 不做的事：不添加 status CHECK 约束、不新增/收紧 RLS（见报告，二者属独立治理决定）。
-- 文件内不含 BEGIN/COMMIT：入口统一用 psql --single-transaction 包裹。
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '120s';

-- 1. 空库：按目标形状建表（若已存在则整段跳过）
CREATE SCHEMA IF NOT EXISTS mes;

CREATE TABLE IF NOT EXISTS mes.teams (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    team_code       varchar(100) NOT NULL,
    team_name       varchar(200) NOT NULL,
    team_type       varchar(50),
    work_station_id uuid,
    leader_id       uuid,
    leader_name     varchar(128),
    member_count    integer      NOT NULL DEFAULT 0,
    status          varchar(32)  NOT NULL DEFAULT 'active',
    description     text,
    created_at      timestamptz  NOT NULL DEFAULT now(),
    updated_at      timestamptz  NOT NULL DEFAULT now(),
    deleted_at      timestamptz,
    tenant_id       uuid
);

-- 2. 补齐可能缺失的列（覆盖两种历史建表结果）
ALTER TABLE mes.teams ADD COLUMN IF NOT EXISTS tenant_id       uuid;
ALTER TABLE mes.teams ADD COLUMN IF NOT EXISTS deleted_at      timestamptz;
ALTER TABLE mes.teams ADD COLUMN IF NOT EXISTS team_type       varchar(50);
ALTER TABLE mes.teams ADD COLUMN IF NOT EXISTS leader_name     varchar(128);
ALTER TABLE mes.teams ADD COLUMN IF NOT EXISTS work_station_id uuid;
ALTER TABLE mes.teams ADD COLUMN IF NOT EXISTS description     text;
ALTER TABLE mes.teams ADD COLUMN IF NOT EXISTS member_count    integer DEFAULT 0;
ALTER TABLE mes.teams ADD COLUMN IF NOT EXISTS status          varchar(32) DEFAULT 'active';
ALTER TABLE mes.teams ADD COLUMN IF NOT EXISTS created_at      timestamptz DEFAULT now();
ALTER TABLE mes.teams ADD COLUMN IF NOT EXISTS updated_at      timestamptz DEFAULT now();
ALTER TABLE mes.teams ADD COLUMN IF NOT EXISTS team_code       varchar(100);
ALTER TABLE mes.teams ADD COLUMN IF NOT EXISTS team_name       varchar(200);
ALTER TABLE mes.teams ADD COLUMN IF NOT EXISTS leader_id       uuid;

-- 3. leader_id 收敛为 uuid
--    空串按"未填写"处理（置 NULL）；非空且非 uuid 的值直接中止，绝不静默丢弃。
DO $teams_leader_id$
DECLARE
    v_type text;
    v_bad  bigint;
BEGIN
    SELECT c.data_type INTO v_type
      FROM information_schema.columns c
     WHERE c.table_schema = 'mes' AND c.table_name = 'teams' AND c.column_name = 'leader_id';

    IF v_type IS NULL THEN
        RAISE EXCEPTION 'mes-teams-shape ABORT: mes.teams.leader_id 不存在';
    END IF;

    IF v_type = 'uuid' THEN
        RAISE NOTICE 'mes.teams.leader_id: 已是 uuid，跳过';
        RETURN;
    END IF;

    IF v_type <> 'character varying' THEN
        RAISE EXCEPTION 'mes-teams-shape ABORT: leader_id 当前类型=%（预期 varchar/uuid）', v_type;
    END IF;

    UPDATE mes.teams SET leader_id = NULL
     WHERE leader_id IS NOT NULL AND btrim(leader_id) = '';

    SELECT count(*) INTO v_bad
      FROM mes.teams
     WHERE leader_id IS NOT NULL AND btrim(leader_id) <> ''
       AND pg_input_is_valid(btrim(leader_id), 'uuid') IS NOT TRUE;

    IF v_bad > 0 THEN
        RAISE EXCEPTION 'mes-teams-shape ABORT: leader_id 有 % 行无法转为 uuid，请先人工清洗', v_bad;
    END IF;

    ALTER TABLE mes.teams ALTER COLUMN leader_id TYPE uuid USING btrim(leader_id)::uuid;
    RAISE NOTICE 'mes.teams.leader_id: varchar -> uuid 完成';
END
$teams_leader_id$;

-- 4. 列宽收敛（只放宽，不收窄）
DO $teams_widths$
DECLARE
    r      record;
    v_len  integer;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('team_code', 100),
            ('team_name', 200),
            ('team_type',  50),
            ('leader_name', 128)
        ) AS v(col, target_len)
    LOOP
        SELECT c.character_maximum_length INTO v_len
          FROM information_schema.columns c
         WHERE c.table_schema = 'mes' AND c.table_name = 'teams' AND c.column_name = r.col;

        IF v_len IS NULL THEN
            RAISE NOTICE 'mes.teams.% 非 varchar 或不存在，跳过', r.col;
        ELSIF v_len < r.target_len THEN
            EXECUTE format('ALTER TABLE mes.teams ALTER COLUMN %I TYPE varchar(%s)', r.col, r.target_len);
            RAISE NOTICE 'mes.teams.%: varchar(%) -> varchar(%)', r.col, v_len, r.target_len;
        ELSE
            RAISE NOTICE 'mes.teams.%: varchar(%) 已 >= %，跳过', r.col, v_len, r.target_len;
        END IF;
    END LOOP;
END
$teams_widths$;

-- 5. 空值回填 + NOT NULL + 默认值（对齐两种建表结果的严格侧；空表上为 no-op）
-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: 仅为 mes.teams 四个将收紧为 NOT NULL 的列回填空值，不改已有非空值，空表上为 no-op
-- destructive-owner: mes
-- destructive-ticket: W7-B6-MES-TEAMS-SHAPE
-- destructive-expires: 2027-05-01
-- destructive-max-rows: 500000
-- destructive-backup: prod/dev 两库 mes.teams 均为 0 行；变更前留账本快照与 \d 结构快照，无行级数据可备
UPDATE mes.teams
   SET status       = COALESCE(status, 'active'),
       member_count = COALESCE(member_count, 0),
       created_at   = COALESCE(created_at, now()),
       updated_at   = COALESCE(updated_at, now())
 WHERE status IS NULL OR member_count IS NULL OR created_at IS NULL OR updated_at IS NULL;

ALTER TABLE mes.teams ALTER COLUMN status       SET DEFAULT 'active';
ALTER TABLE mes.teams ALTER COLUMN member_count SET DEFAULT 0;
ALTER TABLE mes.teams ALTER COLUMN created_at   SET DEFAULT now();
ALTER TABLE mes.teams ALTER COLUMN updated_at   SET DEFAULT now();

ALTER TABLE mes.teams ALTER COLUMN status       SET NOT NULL;
ALTER TABLE mes.teams ALTER COLUMN member_count SET NOT NULL;
ALTER TABLE mes.teams ALTER COLUMN created_at   SET NOT NULL;
ALTER TABLE mes.teams ALTER COLUMN updated_at   SET NOT NULL;

-- 6. 索引（prod 既有三件套；缺失则补）
CREATE INDEX IF NOT EXISTS idx_teams_team_code       ON mes.teams (team_code);
CREATE INDEX IF NOT EXISTS idx_teams_status          ON mes.teams (status);
CREATE INDEX IF NOT EXISTS idx_teams_work_station_id ON mes.teams (work_station_id);

-- 7. team_code 唯一约束（存在重复则中止，不静默建失败）
DO $teams_unique$
DECLARE
    v_dup bigint;
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conrelid = 'mes.teams'::regclass AND contype = 'u'
           AND pg_get_constraintdef(oid) LIKE '%UNIQUE (team_code)%'
    ) THEN
        RAISE NOTICE 'mes.teams.team_code 唯一约束已存在，跳过';
        RETURN;
    END IF;

    SELECT count(*) INTO v_dup FROM (
        SELECT team_code FROM mes.teams GROUP BY team_code HAVING count(*) > 1
    ) d;

    IF v_dup > 0 THEN
        RAISE EXCEPTION 'mes-teams-shape ABORT: team_code 有 % 组重复，无法建唯一约束', v_dup;
    END IF;

    ALTER TABLE mes.teams ADD CONSTRAINT teams_team_code_key UNIQUE (team_code);
    RAISE NOTICE 'mes.teams.team_code 唯一约束补齐';
END
$teams_unique$;

-- 8. work_station_id 外键（仅当被引用表存在）
DO $teams_fk$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'mes' AND table_name = 'work_stations'
    ) THEN
        RAISE NOTICE 'mes.work_stations 不存在，跳过外键';
        RETURN;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conrelid = 'mes.teams'::regclass AND contype = 'f'
           AND conname = 'teams_work_station_id_fkey'
    ) THEN
        RAISE NOTICE 'teams_work_station_id_fkey 已存在，跳过';
        RETURN;
    END IF;

    ALTER TABLE mes.teams
        ADD CONSTRAINT teams_work_station_id_fkey
        FOREIGN KEY (work_station_id) REFERENCES mes.work_stations(id) ON DELETE SET NULL;
    RAISE NOTICE 'teams_work_station_id_fkey 补齐';
END
$teams_fk$;

-- 9. 收敛自检
DO $teams_verify$
DECLARE
    v_len_code integer;
    v_len_name integer;
    v_type     text;
    v_tenant   boolean;
BEGIN
    SELECT data_type INTO v_type FROM information_schema.columns
     WHERE table_schema='mes' AND table_name='teams' AND column_name='leader_id';
    SELECT character_maximum_length INTO v_len_code FROM information_schema.columns
     WHERE table_schema='mes' AND table_name='teams' AND column_name='team_code';
    SELECT character_maximum_length INTO v_len_name FROM information_schema.columns
     WHERE table_schema='mes' AND table_name='teams' AND column_name='team_name';
    SELECT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema='mes' AND table_name='teams' AND column_name='tenant_id') INTO v_tenant;

    IF v_type IS DISTINCT FROM 'uuid' OR v_tenant IS NOT TRUE
       OR v_len_code < 100 OR v_len_name < 200 THEN
        RAISE EXCEPTION 'mes-teams-shape ABORT: 收敛自检失败 type=% tenant=% code=% name=%',
            v_type, v_tenant, v_len_code, v_len_name;
    END IF;

    RAISE NOTICE 'mes-teams-shape 自检通过：leader_id=uuid tenant_id=present team_code=varchar(%) team_name=varchar(%)',
        v_len_code, v_len_name;
END
$teams_verify$;

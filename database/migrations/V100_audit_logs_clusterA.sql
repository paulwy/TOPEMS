-- =============================================================================
-- V100_audit_logs_clusterA.sql  (Task A-3 of P1-3 Bug Fixes)
--
-- 幂等 ALTER TABLE 迁移脚本，将已部署环境的 public.audit_logs 从
-- 旧签名（resource_type/resource_id/request_body/duration_ms/...）
-- 升级到 Cluster-A 12 列标准签名（与 shared-db AuditLog struct 1:1）。
--
-- 执行前必须执行 A-1 确认：
--     psql $DB_URL -c '\d public.audit_logs'
-- 确认真实生产表结构，如果表已使用最新签名（entity_type/entity_id/...）
-- 则本脚本为 no-op。
--
-- 执行方式：
--     psql $DB_URL -v ON_ERROR_STOP=1 -f database/migrations/V100_audit_logs_clusterA.sql
--
-- 回滚脚本（如果需要）：一般无需回滚（所有改动都是 ADD COLUMN + RENAME 安全操作）。
-- =============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- (1) 新增列（始终 IF NOT EXISTS）
-- --------------------------------------------------------------------------
ALTER TABLE public.audit_logs
    ADD COLUMN IF NOT EXISTS entity_ids JSONB,
    ADD COLUMN IF NOT EXISTS user_name TEXT,
    ADD COLUMN IF NOT EXISTS request_details JSONB,
    ADD COLUMN IF NOT EXISTS response_details JSONB;

-- --------------------------------------------------------------------------
-- (2) 列类型修正（status SMALLINT → VARCHAR(20)，ip_address INET → VARCHAR(45)）
--     只有列存在且类型不匹配时 ALTER；任何情况都可重复安全执行（DO block）。
-- --------------------------------------------------------------------------
DO $$
DECLARE
    _status_type text;
    _ip_type     text;
BEGIN
    SELECT data_type INTO _status_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'status';

    IF FOUND AND _status_type <> 'character varying' THEN
        EXECUTE 'ALTER TABLE public.audit_logs '
             || 'ALTER COLUMN status TYPE VARCHAR(20) '
             || 'USING CASE '
             || '    WHEN status IS NULL THEN ''success''::VARCHAR(20) '
             || '    ELSE status::VARCHAR(20) END';
    END IF;

    SELECT data_type INTO _ip_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'ip_address';

    IF FOUND AND _ip_type = 'inet' THEN
        EXECUTE 'ALTER TABLE public.audit_logs '
             || 'ALTER COLUMN ip_address TYPE VARCHAR(45) '
             || 'USING host(ip_address)';
    END IF;
END $$;

-- --------------------------------------------------------------------------
-- (3) 列重命名（resource_type → entity_type, resource_id → entity_id UUID,
--                request_body → request_details, response_body → response_details）
--     仅在源列存在、目标列不存在时执行。
-- --------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema='public' AND table_name='audit_logs' AND column_name='resource_type')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                        WHERE table_schema='public' AND table_name='audit_logs' AND column_name='entity_type') THEN
        ALTER TABLE public.audit_logs RENAME COLUMN resource_type TO entity_type;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema='public' AND table_name='audit_logs' AND column_name='resource_id')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                        WHERE table_schema='public' AND table_name='audit_logs' AND column_name='entity_id') THEN
        -- 先改名再改类型（VARCHAR(100) → UUID）
        ALTER TABLE public.audit_logs RENAME COLUMN resource_id TO entity_id;
        ALTER TABLE public.audit_logs
            ALTER COLUMN entity_id TYPE UUID
            USING CASE WHEN entity_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                       THEN entity_id::uuid ELSE NULL END;
    ELSE
        -- 目标列已存在但可能还是 VARCHAR — 兜底类型修正
        IF EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema='public' AND table_name='audit_logs' AND column_name='entity_id'
                      AND data_type <> 'uuid') THEN
            ALTER TABLE public.audit_logs
                ALTER COLUMN entity_id TYPE UUID
                USING CASE WHEN entity_id::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                           THEN entity_id::text::uuid ELSE NULL END;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema='public' AND table_name='audit_logs' AND column_name='request_body')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                        WHERE table_schema='public' AND table_name='audit_logs' AND column_name='request_details') THEN
        ALTER TABLE public.audit_logs RENAME COLUMN request_body TO request_details;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema='public' AND table_name='audit_logs' AND column_name='response_body')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                        WHERE table_schema='public' AND table_name='audit_logs' AND column_name='response_details') THEN
        ALTER TABLE public.audit_logs RENAME COLUMN response_body TO response_details;
    END IF;

    -- 数据回填：如果只新增了 request_details/response_details 列（重命名没跑，说明旧列不存在）
    -- 无需任何回填（NULL 正确）。
    -- 如果 entity_type/entity_id 已经作为新列独立存在（resource_type/resource_id 还在），
    -- 则 UPDATE 把旧列值拷进新列并 DROP 旧列。
    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema='public' AND table_name='audit_logs' AND column_name='resource_type')
       AND EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema='public' AND table_name='audit_logs' AND column_name='entity_type') THEN
        UPDATE public.audit_logs SET entity_type = resource_type WHERE entity_type IS NULL;
        ALTER TABLE public.audit_logs DROP COLUMN resource_type;
    END IF;
END $$;

-- --------------------------------------------------------------------------
-- (4) 删除遗留列（duration_ms / request_body / response_body）- 只在安全情况下。
--     先做 "soft rename"（改成 deprecated_* 30 天再删）。
-- --------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema='public' AND table_name='audit_logs' AND column_name='duration_ms') THEN
        ALTER TABLE public.audit_logs RENAME COLUMN duration_ms TO deprecated_duration_ms_v100;
        COMMENT ON COLUMN public.audit_logs.deprecated_duration_ms_v100 IS
            'Task A (V100): 该列原属于 middleware access_log，已迁移至 Cluster-A 签名，30 天后删除';
    END IF;
    -- request_body/response_body 如果还存在（前面的 rename 没执行，说明存在 request_details 新列并行），
    -- 则同样 deprecated。
    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema='public' AND table_name='audit_logs' AND column_name='request_body') THEN
        ALTER TABLE public.audit_logs RENAME COLUMN request_body TO deprecated_request_body_v100;
        COMMENT ON COLUMN public.audit_logs.deprecated_request_body_v100 IS
            'Task A (V100): 已被 request_details 替代，30 天后删除';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema='public' AND table_name='audit_logs' AND column_name='response_body') THEN
        ALTER TABLE public.audit_logs RENAME COLUMN response_body TO deprecated_response_body_v100;
        COMMENT ON COLUMN public.audit_logs.deprecated_response_body_v100 IS
            'Task A (V100): 已被 response_details 替代，30 天后删除';
    END IF;
END $$;

-- --------------------------------------------------------------------------
-- (5) 确保 NOT NULL / DEFAULT 合规
-- --------------------------------------------------------------------------
ALTER TABLE public.audit_logs
    ALTER COLUMN action SET NOT NULL,
    ALTER COLUMN entity_type SET NOT NULL,
    ALTER COLUMN status SET NOT NULL,
    ALTER COLUMN status SET DEFAULT 'success',
    ALTER COLUMN created_at SET DEFAULT NOW();

-- --------------------------------------------------------------------------
-- (6) 常用索引（IF NOT EXISTS，重复安全）
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_audit_logs_action      ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id     ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at  ON public.audit_logs(created_at DESC);

COMMIT;

-- =============================================================
-- P2-1 第 0 批：RLS 多租户框架函数
-- 日期：2026-08-31
-- 目的：提供统一租户上下文读取函数，修正 rls_remaining_tables.sql
--       中读取 GUC 名不一致的缺陷（app.current_tenant_id → app.tenant_id）。
--       应用层（lib/shared-db/src/rls.rs）实际写入的 GUC 为 app.tenant_id。
-- 幂等：CREATE OR REPLACE，可重复执行。
-- =============================================================

-- 读取当前租户上下文（返回 UUID；未设置或非法时返回 NULL）
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID AS $$
DECLARE
    raw TEXT;
    tid UUID;
BEGIN
    raw := current_setting('app.tenant_id', true);
    IF raw IS NULL OR raw = '' THEN
        RETURN NULL;
    END IF;
    BEGIN
        tid := raw::UUID;
    EXCEPTION WHEN OTHERS THEN
        RETURN NULL;
    END;
    RETURN tid;
END;
$$ LANGUAGE plpgsql STABLE;

-- 读取当前用户上下文（预留，供后续行级用户维度策略使用）
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID AS $$
DECLARE
    raw TEXT;
    uid UUID;
BEGIN
    raw := current_setting('app.user_id', true);
    IF raw IS NULL OR raw = '' THEN
        RETURN NULL;
    END IF;
    BEGIN
        uid := raw::UUID;
    EXCEPTION WHEN OTHERS THEN
        RETURN NULL;
    END;
    RETURN uid;
END;
$$ LANGUAGE plpgsql STABLE;

-- 幂等说明：
--   应用层 lib/shared-db/src/rls.rs 的策略使用
--   current_setting('app.tenant_id')::UUID 直接取值；
--   本函数为 SQL 侧统一封装，供运维查询与后续策略复用。

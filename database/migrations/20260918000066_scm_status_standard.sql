-- TOPEMS database migration 20260918000066
-- 统一扩展 scm 全部 ck_*_status_standard 约束枚举（active/inactive/archived →
-- +draft/pending/completed/cancelled）。
-- 深冒烟暴露 supplier_quotes INSERT 硬编码 'draft' 违反；其余 12 张同类约束预防性扩展
-- （枚举超集，兼容旧值）。幂等且双库安全。

DO $$
DECLARE
    t text;
    con text;
BEGIN
    FOR t, con IN
        SELECT c.conrelid::regclass::text, c.conname
        FROM pg_constraint c
        WHERE c.contype = 'c'
          AND c.conname LIKE 'ck\_%\_status\_standard'
          AND c.conrelid::regclass::text LIKE 'scm.%'
    LOOP
        EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', t, con);
        EXECUTE format(
            'ALTER TABLE %s ADD CONSTRAINT %I CHECK (status IS NULL OR status IN '
            || '(''active'',''inactive'',''archived'',''draft'',''pending'',''completed'',''cancelled''))',
            t, con);
    END LOOP;
END $$;

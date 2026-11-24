-- 回滚 B254：audit_logs.status 约束恢复为「生命周期 + 结果」10 值并集（历史口径）
--
-- 风险：回滚会把 active/inactive/archived/failure 重新放行，等于撤销本轮收窄；
--   代码枚举已收窄为 6 值，回滚后 DB 比代码宽，属“宽约束”状态，不会拒绝合法写入。
-- 幂等：定义里已含 'active' 则跳过。
-- 破坏性：仅 DROP/ADD/VALIDATE 1 条 CHECK，不改行数据。

DO $$
DECLARE
    sch text;
    def text;
    values_expr text := '''active'',''inactive'',''archived'',''success'',''failure'',''failed'',''error'',''pending'',''unknown'',''not_found''';
    schemas text[] := ARRAY[
        'bi', 'crm', 'erp', 'hrm', 'iam', 'mes', 'plugin_mes',
        'public', 'rs', 'scm', 'shared', 'srm', 'wms'
    ];
BEGIN
    FOREACH sch IN ARRAY schemas LOOP
        IF to_regclass(format('%I.audit_logs', sch)) IS NULL THEN
            CONTINUE;
        END IF;

        SELECT pg_get_constraintdef(c.oid)
          INTO def
          FROM pg_constraint c
         WHERE c.conrelid = format('%I.audit_logs', sch)::regclass
           AND c.conname = 'ck_audit_logs_status_standard';

        IF def IS NOT NULL AND def LIKE '%''active''%' THEN
            CONTINUE;
        END IF;

        EXECUTE format('ALTER TABLE %I.audit_logs DROP CONSTRAINT IF EXISTS ck_audit_logs_status_standard', sch);
        EXECUTE format(
            'ALTER TABLE %I.audit_logs ADD CONSTRAINT ck_audit_logs_status_standard CHECK ((status)::text = ANY (ARRAY[%s]::text[])) NOT VALID',
            sch, values_expr
        );
        EXECUTE format('ALTER TABLE %I.audit_logs VALIDATE CONSTRAINT ck_audit_logs_status_standard', sch);
    END LOOP;
END $$;

-- B254 回迁：audit_logs.status 收窄为「执行结果」单维（2026-11-24）
--
-- 背景：`lib/shared-db` 的 `AuditLogStatus` 把两套正交词表塞进一个枚举：
--   生命周期 active/inactive/archived + 执行结果 success/failure/failed/error/pending/unknown/not_found。
--   全库检索确认生命周期 3 个变体**从未被任何写入方使用**；本地 13 个 schema 的实际数据只有
--   success / failed / error / unknown / not_found。
--
-- 本次：代码枚举收窄为 6 个结果态（success/failed/error/pending/unknown/not_found，去掉已废弃的
--   failure 别名），DB 侧同步重建 13 个 schema 的 ck_audit_logs_status_standard。
--
-- 幂等：已收窄（定义里不含 'active'、含 'not_found'）的约束直接跳过；否则 DROP + ADD NOT VALID + VALIDATE。
-- fail-closed：若某 schema 存在值集外的历史行，RAISE EXCEPTION 中止，不静默保留宽约束。
-- 破坏性：仅 DROP/ADD 1 条 CHECK 与 VALIDATE；无 UPDATE / DELETE / TRUNCATE / DROP TABLE / DROP COLUMN，
--   不改任何行数据。

DO $$
DECLARE
    sch text;
    def text;
    bad integer;
    values_expr text := '''success'',''failed'',''error'',''pending'',''unknown'',''not_found''';
    narrowed integer := 0;
    skipped integer := 0;
    schemas text[] := ARRAY[
        'bi', 'crm', 'erp', 'hrm', 'iam', 'mes', 'plugin_mes',
        'public', 'rs', 'scm', 'shared', 'srm', 'wms'
    ];
BEGIN
    FOREACH sch IN ARRAY schemas LOOP
        IF to_regclass(format('%I.audit_logs', sch)) IS NULL THEN
            RAISE NOTICE '跳过 %：表不存在', sch;
            skipped := skipped + 1;
            CONTINUE;
        END IF;

        SELECT pg_get_constraintdef(c.oid)
          INTO def
          FROM pg_constraint c
         WHERE c.conrelid = format('%I.audit_logs', sch)::regclass
           AND c.conname = 'ck_audit_logs_status_standard';

        IF def IS NULL THEN
            RAISE NOTICE '跳过 %：无 ck_audit_logs_status_standard（本迁移只收窄已有约束，不新建）', sch;
            skipped := skipped + 1;
            CONTINUE;
        END IF;

        IF def NOT LIKE '%''active''%' AND def LIKE '%''not_found''%' THEN
            RAISE NOTICE '跳过 %：约束已是收窄口径', sch;
            skipped := skipped + 1;
            CONTINUE;
        END IF;

        EXECUTE format(
            'SELECT count(*) FROM %I.audit_logs WHERE status IS NOT NULL AND (status)::text <> ALL (ARRAY[%s]::text[])',
            sch, values_expr
        ) INTO bad;

        IF bad > 0 THEN
            RAISE EXCEPTION 'B254 前置断言失败：%.audit_logs 有 % 行 status 落在收窄值集外，请先清洗', sch, bad;
        END IF;

        EXECUTE format(
            'ALTER TABLE %I.audit_logs DROP CONSTRAINT IF EXISTS ck_audit_logs_status_standard',
            sch
        );
        EXECUTE format(
            'ALTER TABLE %I.audit_logs ADD CONSTRAINT ck_audit_logs_status_standard CHECK ((status)::text = ANY (ARRAY[%s]::text[])) NOT VALID',
            sch, values_expr
        );
        EXECUTE format(
            'ALTER TABLE %I.audit_logs VALIDATE CONSTRAINT ck_audit_logs_status_standard',
            sch
        );
        narrowed := narrowed + 1;
    END LOOP;

    RAISE NOTICE 'B254 完成：收窄 % 个 schema，跳过 % 个', narrowed, skipped;
END $$;

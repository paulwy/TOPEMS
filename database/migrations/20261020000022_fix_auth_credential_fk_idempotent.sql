-- 20261020000022_fix_auth_credential_fk_idempotent.sql
-- 补偿修复 M3：20261016000093_fix_auth_credential_fk_to_iam_users.sql。
-- 093 直接 DROP CONSTRAINT（约束在部分环境不存在即失败），并含"存量测试凭证已清空"断言，
-- 部分环境重放失败。本迁移不改 093 原文件，幂等重做 FK 修正：
--   DROP CONSTRAINT IF EXISTS -> 无孤儿行时重建 FK 指向 iam.users(id) ON DELETE CASCADE；
-- 已有同名 FK 且指向 iam.users 则跳过；存在孤儿行时只 NOTICE 跳过，不 DELETE 任何存量
-- 凭证、不做数据断言。

-- RLS FORCE：凭证表 policy 无租户上下文时经 nil 分支放行（与 88/89/90/92/93 同惯例）
SET app.tenant_id = '00000000-0000-0000-0000-000000000000';

DO $$
DECLARE
  entry text;
  v_schema text;
  v_tbl text;
  v_conname text;
  fk_ok boolean;
  orphans bigint;
BEGIN
  FOREACH entry IN ARRAY ARRAY[
    'public.core_sessions|sessions_user_id_fkey',
    'public.core_refresh_tokens|refresh_tokens_user_id_fkey'
  ] LOOP
    v_schema := split_part(split_part(entry, '|', 1), '.', 1);
    v_tbl := split_part(split_part(entry, '|', 1), '.', 2);
    v_conname := split_part(entry, '|', 2);

    IF to_regclass(format('%I.%I', v_schema, v_tbl)) IS NULL THEN
      RAISE NOTICE 'skip (relation missing): %', entry;
      CONTINUE;
    END IF;

    -- 已有同名 FK 且指向 iam.users -> 已正确，跳过
    SELECT EXISTS (
      SELECT 1
      FROM pg_constraint con
      JOIN pg_class c ON c.oid = con.conrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_class f ON f.oid = con.confrelid
      JOIN pg_namespace fn ON fn.oid = f.relnamespace
      WHERE con.contype = 'f'
        AND con.conname = v_conname
        AND n.nspname = v_schema
        AND c.relname = v_tbl
        AND fn.nspname = 'iam'
        AND f.relname = 'users'
    ) INTO fk_ok;
    IF fk_ok THEN
      RAISE NOTICE 'fk already correct: %.% %', v_schema, v_tbl, v_conname;
      CONTINUE;
    END IF;

    -- 幂等删除旧 FK（约束不存在不报错）
    EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS %I', v_schema, v_tbl, v_conname);

    -- 仅在无孤儿凭证时重建 FK；有孤儿则跳过，数据保持不动
    EXECUTE format(
      'SELECT count(*) FROM %I.%I s WHERE NOT EXISTS (SELECT 1 FROM iam.users u WHERE u.id = s.user_id)',
      v_schema, v_tbl
    ) INTO orphans;
    IF orphans = 0 THEN
      EXECUTE format(
        'ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (user_id) REFERENCES iam.users(id) ON DELETE CASCADE',
        v_schema, v_tbl, v_conname
      );
      RAISE NOTICE 'fk rebuilt: %.% %', v_schema, v_tbl, v_conname;
    ELSE
      RAISE NOTICE 'skip fk rebuild: % orphan row(s) in %.% (data untouched)', orphans, v_schema, v_tbl;
    END IF;
  END LOOP;
END $$;

RESET app.tenant_id;

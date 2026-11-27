-- 20261127270000: RLS fail-closed 第二波 —— crm / qms / finance / hrm 业务表策略收口
--
-- 背景：全库约 487 条策略仍带「未设租户上下文即全开」方言：
--   (current_setting('app.tenant_id', true) IS NULL)
--   OR (current_setting('app.tenant_id', true) = '')
--   OR (current_setting('app.tenant_id', true) = '00000000-...-000000000000')
--   OR (tenant_id IS NULL)
--   OR (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
-- 这类分支等于「谁都能看」，fail-open。每波只处理一个 schema 白名单，且必须满足：
--   1) 表有 tenant_id 列（无列不猜）；
--   2) 表内 tenant_id IS NULL 行数 = 0（有 NULL 行属业务数据问题，先跳过，留给业务判定）；
--   3) 策略名不是平台共享模板（*_public_read / rls_platform_read / rls_global_read / *_platform_maintain）；
--   4) 剥离全开片段后仍保留租户严格判定（含 NULLIF(current_setting('app.tenant_id'...))），
--      否则说明是平台零 UUID 模板，跳过不动。
--
-- 统一改写目标：
--   COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
--   OR (<原有租户严格判定>)
-- 即超管只能走显式 app.rls_system（由 svc/unified-core 中间件 + shared-db 连接池 hook 注入），
-- 普通请求只能看自己租户。
--
-- 前置条件（运维）：新二进制必须已发布且 TOPEMS_RLS_CTX=1，否则请求侧无 GUC → 收口后读 0 行。
--
-- 幂等：候选运行时发现；已是目标形态的策略自然落选。
-- 回滚：database/rollback/20261127270000_*.rollback.sql（按快照 DROP + CREATE 还原）。
--
-- 事务：由 scripts/migration/apply-forward.sh 单事务执行，本文件不含 BEGIN/COMMIT。

SET LOCAL search_path = pg_catalog, public, pg_temp;

CREATE TABLE IF NOT EXISTS archive.rls_failclose_before_20261127 (
  batch        text NOT NULL,
  schemaname   text NOT NULL,
  tablename    text NOT NULL,
  policyname   text NOT NULL,
  polcmd       text NOT NULL,
  permissive   boolean NOT NULL,
  roles        text[] NOT NULL,
  qual_before  text,
  with_check_before text,
  action       text NOT NULL,
  detail       text,
  snapshotted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (batch, schemaname, tablename, policyname)
);

DO $$
DECLARE
    r record;
    n_null bigint;
    has_col int;
    new_qual text;
    new_check text;
    roles_txt text;
    n_fixed int := 0;
    n_skip int := 0;
    n_failed int := 0;
    batch_name text := 'RLS-FAILCLOSE-WAVE2-CRM-QMS-FINANCE-HRM-20261127';
BEGIN
    FOR r IN
        SELECT n.nspname AS sch,
               c.relname AS tbl,
               p.polname AS pol,
               CASE p.polcmd WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT'
                    WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE' ELSE 'ALL' END AS cmd,
               p.polpermissive AS permissive,
               ARRAY(SELECT CASE WHEN o = 0 THEN 'PUBLIC' ELSE rr.rolname END
                     FROM unnest(p.polroles) AS o
                     LEFT JOIN pg_roles rr ON rr.oid = o
                     ORDER BY 1) AS roles,
               pg_get_expr(p.polqual, p.polrelid) AS qual,
               pg_get_expr(p.polwithcheck, p.polrelid) AS wcheck
        FROM pg_policy p
        JOIN pg_class c ON c.oid = p.polrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname IN ('crm', 'qms', 'finance', 'hrm')
          AND c.relkind IN ('r', 'p')
          AND (coalesce(pg_get_expr(p.polqual, p.polrelid), '')
               || coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '')) ILIKE '%tenant_id is null%'
        ORDER BY 1, 2, 3
    LOOP
        -- 平台共享策略豁免
        IF r.pol LIKE '%\_public\_read' OR r.pol IN ('rls_platform_read', 'rls_global_read')
           OR r.pol LIKE '%\_platform\_maintain' THEN
            INSERT INTO archive.rls_failclose_before_20261127
              (batch, schemaname, tablename, policyname, polcmd, permissive, roles, qual_before, with_check_before, action, detail)
            VALUES (batch_name, r.sch, r.tbl, r.pol, r.cmd, r.permissive, coalesce(r.roles, '{PUBLIC}'), r.qual, r.wcheck, 'skip_platform', '平台共享策略')
            ON CONFLICT DO NOTHING;
            n_skip := n_skip + 1;
            CONTINUE;
        END IF;

        SELECT count(*) INTO has_col
        FROM pg_attribute a
        WHERE a.attrelid = format('%I.%I', r.sch, r.tbl)::regclass
          AND a.attname = 'tenant_id' AND a.attnum > 0 AND NOT a.attisdropped;
        IF has_col = 0 THEN
            INSERT INTO archive.rls_failclose_before_20261127
              (batch, schemaname, tablename, policyname, polcmd, permissive, roles, qual_before, with_check_before, action, detail)
            VALUES (batch_name, r.sch, r.tbl, r.pol, r.cmd, r.permissive, coalesce(r.roles, '{PUBLIC}'), r.qual, r.wcheck, 'skip_no_tenant_col', '表无 tenant_id 列')
            ON CONFLICT DO NOTHING;
            n_skip := n_skip + 1;
            CONTINUE;
        END IF;

        EXECUTE format('SELECT count(*) FROM %I.%I WHERE tenant_id IS NULL', r.sch, r.tbl) INTO n_null;
        IF n_null <> 0 THEN
            INSERT INTO archive.rls_failclose_before_20261127
              (batch, schemaname, tablename, policyname, polcmd, permissive, roles, qual_before, with_check_before, action, detail)
            VALUES (batch_name, r.sch, r.tbl, r.pol, r.cmd, r.permissive, coalesce(r.roles, '{PUBLIC}'), r.qual, r.wcheck, 'skip_null_rows', format('%s 行 tenant_id 为空', n_null))
            ON CONFLICT DO NOTHING;
            n_skip := n_skip + 1;
            CONTINUE;
        END IF;

        new_qual  := coalesce(r.qual, '');
        new_check := coalesce(r.wcheck, '');

        -- 1) 未设租户上下文即全开的展开分支
        new_qual := regexp_replace(new_qual, $p1$\(current_setting\('app.tenant_id'::text, true\) IS NULL\) OR $p1$, '', 'g');
        new_check := regexp_replace(new_check, $p1$\(current_setting\('app.tenant_id'::text, true\) IS NULL\) OR $p1$, '', 'g');
        new_qual := regexp_replace(new_qual, $p2$\(current_setting\('app.tenant_id'::text, true\) = ''::text\) OR $p2$, '', 'g');
        new_check := regexp_replace(new_check, $p2$\(current_setting\('app.tenant_id'::text, true\) = ''::text\) OR $p2$, '', 'g');
        new_qual := regexp_replace(new_qual, $p3$\(current_setting\('app.tenant_id'::text, true\) = '00000000-0000-0000-0000-000000000000'::(text|uuid)\) OR $p3$, '', 'g');
        new_check := regexp_replace(new_check, $p3$\(current_setting\('app.tenant_id'::text, true\) = '00000000-0000-0000-0000-000000000000'::(text|uuid)\) OR $p3$, '', 'g');
        new_qual := regexp_replace(new_qual, $p4$ OR \(current_setting\('app.tenant_id'::text, true\) = '00000000-0000-0000-0000-000000000000'::(text|uuid)\)$p4$, '', 'g');
        new_check := regexp_replace(new_check, $p4$ OR \(current_setting\('app.tenant_id'::text, true\) = '00000000-0000-0000-0000-000000000000'::(text|uuid)\)$p4$, '', 'g');

        -- 2) NULLIF 形式下的零 UUID 分支
        new_qual := regexp_replace(new_qual, $p5$\(NULLIF\(current_setting\('app.tenant_id'::text\), ''::text\) = '00000000-0000-0000-0000-000000000000'::(text|uuid)\) OR $p5$, '', 'g');
        new_check := regexp_replace(new_check, $p5$\(NULLIF\(current_setting\('app.tenant_id'::text\), ''::text\) = '00000000-0000-0000-0000-000000000000'::(text|uuid)\) OR $p5$, '', 'g');
        new_qual := regexp_replace(new_qual, $p6$ OR \(NULLIF\(current_setting\('app.tenant_id'::text\), ''::text\) = '00000000-0000-0000-0000-000000000000'::(text|uuid)\)$p6$, '', 'g');
        new_check := regexp_replace(new_check, $p6$ OR \(NULLIF\(current_setting\('app.tenant_id'::text\), ''::text\) = '00000000-0000-0000-0000-000000000000'::(text|uuid)\)$p6$, '', 'g');

        -- 3) tenant_id IS NULL 旁路（前/后两种位置）
        new_qual := regexp_replace(new_qual, $p7$\(tenant_id IS NULL\) OR $p7$, '', 'gi');
        new_check := regexp_replace(new_check, $p7$\(tenant_id IS NULL\) OR $p7$, '', 'gi');
        new_qual := regexp_replace(new_qual, $p8$ OR \(tenant_id IS NULL\)$p8$, '', 'gi');
        new_check := regexp_replace(new_check, $p8$ OR \(tenant_id IS NULL\)$p8$, '', 'gi');

        -- 4) 剥离后仍残留 NULL 旁路 → 形态未归一，跳过
        IF new_qual ILIKE '%tenant_id is null%' OR new_check ILIKE '%tenant_id is null%' THEN
            INSERT INTO archive.rls_failclose_before_20261127
              (batch, schemaname, tablename, policyname, polcmd, permissive, roles, qual_before, with_check_before, action, detail)
            VALUES (batch_name, r.sch, r.tbl, r.pol, r.cmd, r.permissive, coalesce(r.roles, '{PUBLIC}'), r.qual, r.wcheck, 'skip_residual_null', '剥离后仍残留 tenant_id IS NULL')
            ON CONFLICT DO NOTHING;
            n_skip := n_skip + 1;
            CONTINUE;
        END IF;

        -- 5) 必须是租户模板（保留 NULLIF(current_setting('app.tenant_id')) 严格判定）
        IF new_qual NOT LIKE '%NULLIF(current_setting(''app.tenant_id''%'
           AND new_check NOT LIKE '%NULLIF(current_setting(''app.tenant_id''%' THEN
            INSERT INTO archive.rls_failclose_before_20261127
              (batch, schemaname, tablename, policyname, polcmd, permissive, roles, qual_before, with_check_before, action, detail)
            VALUES (batch_name, r.sch, r.tbl, r.pol, r.cmd, r.permissive, coalesce(r.roles, '{PUBLIC}'), r.qual, r.wcheck, 'skip_non_tenant_template', '非租户模板（疑平台零租户策略）')
            ON CONFLICT DO NOTHING;
            n_skip := n_skip + 1;
            CONTINUE;
        END IF;

        -- 6) 前缀系统分支（去重）
        IF new_qual <> '' AND new_qual NOT LIKE '%app.rls_system%' THEN
            new_qual := 'COALESCE(current_setting(''app.rls_system''::text, true), ''off''::text) = ''on''::text OR ' || ' (' || new_qual || ')';
        END IF;
        IF new_check <> '' AND new_check NOT LIKE '%app.rls_system%' THEN
            new_check := 'COALESCE(current_setting(''app.rls_system''::text, true), ''off''::text) = ''on''::text OR ' || ' (' || new_check || ')';
        END IF;

        INSERT INTO archive.rls_failclose_before_20261127
          (batch, schemaname, tablename, policyname, polcmd, permissive, roles, qual_before, with_check_before, action)
        VALUES (batch_name, r.sch, r.tbl, r.pol, r.cmd, r.permissive, coalesce(r.roles, '{PUBLIC}'), r.qual, r.wcheck, 'tightened')
        ON CONFLICT DO NOTHING;

        BEGIN
            IF r.wcheck IS NULL THEN
                EXECUTE format('ALTER POLICY %I ON %I.%I USING (%s)', r.pol, r.sch, r.tbl, new_qual);
            ELSE
                EXECUTE format('ALTER POLICY %I ON %I.%I USING (%s) WITH CHECK (%s)', r.pol, r.sch, r.tbl, new_qual, new_check);
            END IF;
        EXCEPTION WHEN others THEN
            UPDATE archive.rls_failclose_before_20261127
               SET action = 'failed', detail = SQLERRM
             WHERE batch = batch_name AND schemaname = r.sch AND tablename = r.tbl AND policyname = r.pol;
            n_failed := n_failed + 1;
            RAISE NOTICE 'failed %.%.%: %', r.sch, r.tbl, r.pol, SQLERRM;
            CONTINUE;
        END;

        n_fixed := n_fixed + 1;
        RAISE NOTICE 'tightened %.%.%', r.sch, r.tbl, r.pol;
    END LOOP;

    RAISE NOTICE '完成：收紧 % 条，跳过 % 条，失败 % 条（batch=%）', n_fixed, n_skip, n_failed, batch_name;
END $$;

-- 后置断言 1：本波不允许有失败
DO $$
DECLARE n int;
BEGIN
    SELECT count(*) INTO n FROM archive.rls_failclose_before_20261127
     WHERE batch = 'RLS-FAILCLOSE-WAVE2-CRM-QMS-FINANCE-HRM-20261127' AND action = 'failed';
    IF n <> 0 THEN
        RAISE EXCEPTION '后置断言失败：% 条策略改写失败', n;
    END IF;
    RAISE NOTICE '后置断言通过：本波 0 条失败';
END $$;

-- 后置断言 2：crm/qms/finance/hrm 里仍带 tenant_id IS NULL 的策略，必须都能在快照表里找到「跳过/平台」记录
DO $$
DECLARE n_left int; n_accounted int;
BEGIN
    SELECT count(*) INTO n_left
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname IN ('crm', 'qms', 'finance', 'hrm')
      AND (coalesce(pg_get_expr(p.polqual, p.polrelid), '')
           || coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '')) ILIKE '%tenant_id is null%';

    SELECT count(*) INTO n_accounted
    FROM archive.rls_failclose_before_20261127
    WHERE batch = 'RLS-FAILCLOSE-WAVE2-CRM-QMS-FINANCE-HRM-20261127' AND action LIKE 'skip%';

    IF n_left <> n_accounted THEN
        RAISE EXCEPTION '后置断言失败：crm/qms/finance/hrm 残留 % 条旁路，快照仅登记 % 条跳过', n_left, n_accounted;
    END IF;
    RAISE NOTICE '后置断言通过：crm/qms/finance/hrm 剩余旁路 % 条均已登记', n_left;
END $$;

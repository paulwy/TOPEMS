-- 回滚 20261117120000_platform_corpus_null_to_nil.sql
--
-- 两步逆向：恢复 rls_global_read 宽松 SELECT 策略（文本与迁移前一致），
-- 并把 4 张表的全零租户行改回 NULL。
--
-- 前提：up 迁移已硬断言「迁移前全零租户行数为 0」，因此 down 的
--   「全零 → NULL」不会误伤迁移前就存在的平台行。
-- 若 up 之后又通过 seed/后台写入了新的全零租户语料行，down 会把它们一并改回 NULL；
--   在宽松策略已恢复的前提下，这些行对所有租户仍可读，语义与 up 之前一致。
--
-- 注意：down 只恢复数据库形态。若读取端代码已切到 scope_read_platform() + 显式全零谓词，
--   回滚后该代码将读不到语料行，必须同步回滚应用版本。

SELECT set_config('app.rls_system', 'on', false);
SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-000000000000', false);

-- 1. 恢复宽松 SELECT 策略（与迁移前 pg_policies.qual 文本等价）
CREATE POLICY rls_global_read ON public.core_dict_types
    FOR SELECT TO public
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
        OR tenant_id IS NULL
    );

CREATE POLICY rls_global_read ON public.core_dict_items
    FOR SELECT TO public
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
        OR tenant_id IS NULL
    );

CREATE POLICY rls_global_read ON ai.ai_prompt_templates
    FOR SELECT TO public
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
        OR tenant_id IS NULL
    );

CREATE POLICY rls_global_read ON ai.ai_models
    FOR SELECT TO public
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
        OR tenant_id IS NULL
    );

-- 2. 全零 → NULL
UPDATE public.core_dict_types   SET tenant_id = NULL WHERE tenant_id = '00000000-0000-0000-0000-000000000000'::uuid;
UPDATE public.core_dict_items   SET tenant_id = NULL WHERE tenant_id = '00000000-0000-0000-0000-000000000000'::uuid;
UPDATE ai.ai_prompt_templates   SET tenant_id = NULL WHERE tenant_id = '00000000-0000-0000-0000-000000000000'::uuid;
UPDATE ai.ai_models             SET tenant_id = NULL WHERE tenant_id = '00000000-0000-0000-0000-000000000000'::uuid;

-- 3. 回滚断言：宽松策略恢复、全零行清零、NULL 行回来
DO $$
DECLARE
    t text;
    n_pol int;
    n_nil bigint;
    n_null bigint;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'public.core_dict_types', 'public.core_dict_items',
        'ai.ai_prompt_templates', 'ai.ai_models'
    ] LOOP
        SELECT count(*) INTO n_pol
          FROM pg_policies
         WHERE schemaname = split_part(t, '.', 1)
           AND tablename  = split_part(t, '.', 2)
           AND policyname = 'rls_global_read';
        IF n_pol <> 1 THEN
            RAISE EXCEPTION '回滚断言失败：% 的 rls_global_read 策略数 = %（期望 1）', t, n_pol;
        END IF;

        EXECUTE format('SELECT count(*) FROM %s WHERE tenant_id = %L', t,
                       '00000000-0000-0000-0000-000000000000')
          INTO n_nil;
        IF n_nil <> 0 THEN
            RAISE EXCEPTION '回滚断言失败：% 仍有 % 行全零租户', t, n_nil;
        END IF;

        EXECUTE format('SELECT count(*) FROM %s WHERE tenant_id IS NULL', t) INTO n_null;
        IF n_null = 0 THEN
            RAISE EXCEPTION '回滚断言失败：% 的 NULL 租户行未恢复', t;
        END IF;
    END LOOP;
END $$;

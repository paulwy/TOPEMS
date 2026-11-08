-- P1 主数据与主体范围（2026-11-08）
--
-- 目标（不含任何总账/凭证/库存/订单表结构改动）：
--   1) hrm.companies 升格为唯一法人主数据：补 code（租户内唯一）、functional_currency；
--   2) 新增 public.core_user_company_scopes（数据范围层，与 core_user_roles /
--      core_role_permissions 并列：后者决定「能做什么动作」，前者决定「能看哪些法人主体」）；
--   3) erp.consolidation_scope_companies / erp.company_relations 的 company 引用
--      改为指向本租户真实存在的 hrm.companies（复合外键，跨租户引用被拒绝）；
--   4) 单公司租户一次性回填主体范围，之后一律 fail-closed：
--      回填后若仍有在职用户没有任何 scope 记录，迁移直接 RAISE EXCEPTION。
--      多公司租户不自动授予，仅 NOTICE 输出需人工授权人数。
--
-- 不改历史迁移；本文件为前向迁移，执行器以 --single-transaction 包裹。
--
-- ROLLBACK（人工评估后执行）：
--   DROP TABLE IF EXISTS public.core_user_company_scopes;
--   ALTER TABLE erp.company_relations
--     DROP CONSTRAINT IF EXISTS fk_company_relations_parent_company;
--   ALTER TABLE erp.company_relations
--     DROP CONSTRAINT IF EXISTS fk_company_relations_child_company;
--   ALTER TABLE erp.consolidation_scope_companies
--     DROP CONSTRAINT IF EXISTS fk_scope_companies_company;
--   ALTER TABLE hrm.companies DROP CONSTRAINT IF EXISTS uq_companies_tenant_id_id;
--   DROP INDEX IF EXISTS hrm.ux_companies_tenant_code;
--   ALTER TABLE hrm.companies DROP COLUMN IF EXISTS functional_currency;
--   ALTER TABLE hrm.companies DROP COLUMN IF EXISTS code;

-- ---------------------------------------------------------------------------
-- 0) hrm.companies：法人主数据字段
-- ---------------------------------------------------------------------------

-- 历史公司若 tenant_id 为空，先归位默认租户，否则无法参与复合外键。
UPDATE hrm.companies
SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
WHERE tenant_id IS NULL;

ALTER TABLE hrm.companies ADD COLUMN IF NOT EXISTS code varchar(64);
ALTER TABLE hrm.companies
    ADD COLUMN IF NOT EXISTS functional_currency varchar(3) NOT NULL DEFAULT 'CNY';

-- 存量公司补 code：由主键派生，保证同租户内不冲突。
UPDATE hrm.companies
SET code = 'COMP-' || upper(substr(replace(id::text, '-', ''), 1, 12))
WHERE code IS NULL;

ALTER TABLE hrm.companies ALTER COLUMN code SET NOT NULL;

-- 租户内唯一（软删不计入）；大小写不敏感。
CREATE UNIQUE INDEX IF NOT EXISTS ux_companies_tenant_code
    ON hrm.companies (tenant_id, lower(code))
    WHERE deleted_at IS NULL;

-- 复合外键的被引用侧需要唯一约束（tenant_id, id）。
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_companies_tenant_id_id'
    ) THEN
        ALTER TABLE hrm.companies
            ADD CONSTRAINT uq_companies_tenant_id_id UNIQUE (tenant_id, id);
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1) 主体数据范围表（数据范围 ≠ 权限码）
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.core_user_company_scopes (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   uuid NOT NULL,
    user_id     uuid NOT NULL,
    company_id  uuid NOT NULL,
    access_level varchar(20) NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    created_by  uuid,
    updated_by  uuid,
    CONSTRAINT ck_user_company_scopes_access_level
        CHECK (access_level IN ('read', 'write', 'consolidate')),
    CONSTRAINT uq_user_company_scopes
        UNIQUE (tenant_id, user_id, company_id)
);

COMMENT ON TABLE public.core_user_company_scopes IS
    '法人主体数据范围：与 core_user_roles/core_role_permissions（能否执行动作）并列，决定用户可见/可操作的法人主体。未配置记录即无任何主体权限（fail-closed）。';
COMMENT ON COLUMN public.core_user_company_scopes.access_level IS
    'read=只读；write=可维护该主体数据；consolidate=可纳入合并范围';

CREATE INDEX IF NOT EXISTS ix_user_company_scopes_user
    ON public.core_user_company_scopes (tenant_id, user_id);
CREATE INDEX IF NOT EXISTS ix_user_company_scopes_company
    ON public.core_user_company_scopes (tenant_id, company_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_company_scopes_company'
    ) THEN
        ALTER TABLE public.core_user_company_scopes
            ADD CONSTRAINT fk_user_company_scopes_company
            FOREIGN KEY (tenant_id, company_id)
            REFERENCES hrm.companies (tenant_id, id);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_company_scopes_user'
    ) THEN
        ALTER TABLE public.core_user_company_scopes
            ADD CONSTRAINT fk_user_company_scopes_user
            FOREIGN KEY (user_id) REFERENCES iam.users (id) ON DELETE CASCADE;
    END IF;
END $$;

-- 与 core_roles 同口径：ENABLE（不 FORCE），避免服务表所有者被策略阻断；
-- 策略本身与 core_roles_tenant_policy 一致，做纵深防御。
ALTER TABLE public.core_user_company_scopes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS core_user_company_scopes_tenant_policy
    ON public.core_user_company_scopes;
CREATE POLICY core_user_company_scopes_tenant_policy
    ON public.core_user_company_scopes
    USING (
        tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
        OR tenant_id IS NULL
        OR COALESCE(current_setting('app.tenant_id', true), '') = '00000000-0000-0000-0000-000000000000'
    );

-- ---------------------------------------------------------------------------
-- 2) 单公司租户一次性回填（read → write → consolidate，取最高档）
-- ---------------------------------------------------------------------------

-- 2.1 所有在职用户 read
INSERT INTO public.core_user_company_scopes
    (tenant_id, user_id, company_id, access_level, created_at, updated_at)
SELECT t.tenant_id, t.user_id, t.company_id, 'read', now(), now()
FROM (
    SELECT DISTINCT tu.tenant_id, u.id AS user_id, c.id AS company_id
    FROM public.core_tenant_users tu
    JOIN iam.users u ON u.id = tu.user_id
    JOIN hrm.companies c
      ON c.tenant_id = tu.tenant_id AND c.deleted_at IS NULL
    WHERE tu.status = 'active'
      AND tu.deleted_at IS NULL
      AND u.status = 'active'
      AND u.is_active
      AND u.deleted_at IS NULL
      AND (
          SELECT COUNT(*) FROM hrm.companies c2
          WHERE c2.tenant_id = tu.tenant_id AND c2.deleted_at IS NULL
      ) = 1
) t
ON CONFLICT (tenant_id, user_id, company_id) DO UPDATE
SET access_level = CASE
        WHEN CASE core_user_company_scopes.access_level
                 WHEN 'consolidate' THEN 3 WHEN 'write' THEN 2 ELSE 1 END
           < CASE EXCLUDED.access_level
                 WHEN 'consolidate' THEN 3 WHEN 'write' THEN 2 ELSE 1 END
        THEN EXCLUDED.access_level
        ELSE core_user_company_scopes.access_level
    END,
    updated_at = now();

-- 2.2 tenant_admin 与平台超管 write
INSERT INTO public.core_user_company_scopes
    (tenant_id, user_id, company_id, access_level, created_at, updated_at)
SELECT t.tenant_id, t.user_id, t.company_id, 'write', now(), now()
FROM (
    SELECT DISTINCT tu.tenant_id, u.id AS user_id, c.id AS company_id
    FROM public.core_tenant_users tu
    JOIN iam.users u ON u.id = tu.user_id
    JOIN hrm.companies c
      ON c.tenant_id = tu.tenant_id AND c.deleted_at IS NULL
    WHERE tu.status = 'active'
      AND tu.deleted_at IS NULL
      AND u.status = 'active'
      AND u.is_active
      AND u.deleted_at IS NULL
      AND (
          SELECT COUNT(*) FROM hrm.companies c2
          WHERE c2.tenant_id = tu.tenant_id AND c2.deleted_at IS NULL
      ) = 1
      AND (
          u.is_superuser
          OR 'tenant_admin' = ANY (COALESCE(u.roles, '{}'::text[]))
          OR EXISTS (
              SELECT 1
              FROM public.core_user_roles ur
              JOIN public.core_roles r ON r.id = ur.role_id
              WHERE ur.user_id = u.id AND r.name = 'tenant_admin'
          )
      )
) t
ON CONFLICT (tenant_id, user_id, company_id) DO UPDATE
SET access_level = CASE
        WHEN CASE core_user_company_scopes.access_level
                 WHEN 'consolidate' THEN 3 WHEN 'write' THEN 2 ELSE 1 END
           < CASE EXCLUDED.access_level
                 WHEN 'consolidate' THEN 3 WHEN 'write' THEN 2 ELSE 1 END
        THEN EXCLUDED.access_level
        ELSE core_user_company_scopes.access_level
    END,
    updated_at = now();

-- 2.3 持有合并相关权限的用户 consolidate
INSERT INTO public.core_user_company_scopes
    (tenant_id, user_id, company_id, access_level, created_at, updated_at)
SELECT t.tenant_id, t.user_id, t.company_id, 'consolidate', now(), now()
FROM (
    SELECT DISTINCT tu.tenant_id, u.id AS user_id, c.id AS company_id
    FROM public.core_tenant_users tu
    JOIN iam.users u ON u.id = tu.user_id
    JOIN hrm.companies c
      ON c.tenant_id = tu.tenant_id AND c.deleted_at IS NULL
    WHERE tu.status = 'active'
      AND tu.deleted_at IS NULL
      AND u.status = 'active'
      AND u.is_active
      AND u.deleted_at IS NULL
      AND (
          SELECT COUNT(*) FROM hrm.companies c2
          WHERE c2.tenant_id = tu.tenant_id AND c2.deleted_at IS NULL
      ) = 1
      AND (
          u.is_superuser
          OR EXISTS (
              SELECT 1
              FROM unnest(COALESCE(u.permissions, '{}'::text[])) AS pc(code)
              WHERE pc.code LIKE 'erp:consolidation%'
          )
          OR EXISTS (
              SELECT 1
              FROM public.core_user_roles ur
              JOIN public.core_role_permissions rp ON rp.role_id = ur.role_id
              JOIN public.core_permissions p ON p.id = rp.permission_id
              WHERE ur.user_id = u.id AND p.code LIKE 'erp:consolidation%'
          )
      )
) t
ON CONFLICT (tenant_id, user_id, company_id) DO UPDATE
SET access_level = CASE
        WHEN CASE core_user_company_scopes.access_level
                 WHEN 'consolidate' THEN 3 WHEN 'write' THEN 2 ELSE 1 END
           < CASE EXCLUDED.access_level
                 WHEN 'consolidate' THEN 3 WHEN 'write' THEN 2 ELSE 1 END
        THEN EXCLUDED.access_level
        ELSE core_user_company_scopes.access_level
    END,
    updated_at = now();

-- 2.4 fail-closed 断言：单公司租户每个在职用户都必须有 scope 记录
DO $$
DECLARE
    missing_count bigint;
BEGIN
    SELECT COUNT(*) INTO missing_count
    FROM (
        SELECT DISTINCT tu.tenant_id, u.id AS user_id, c.id AS company_id
        FROM public.core_tenant_users tu
        JOIN iam.users u ON u.id = tu.user_id
        JOIN hrm.companies c
          ON c.tenant_id = tu.tenant_id AND c.deleted_at IS NULL
        WHERE tu.status = 'active'
          AND tu.deleted_at IS NULL
          AND u.status = 'active'
          AND u.is_active
          AND u.deleted_at IS NULL
          AND (
              SELECT COUNT(*) FROM hrm.companies c2
              WHERE c2.tenant_id = tu.tenant_id AND c2.deleted_at IS NULL
          ) = 1
    ) t
    WHERE NOT EXISTS (
        SELECT 1 FROM public.core_user_company_scopes s
        WHERE s.tenant_id = t.tenant_id
          AND s.user_id = t.user_id
          AND s.company_id = t.company_id
    );

    IF missing_count > 0 THEN
        RAISE EXCEPTION
            'P1 回填失败：单公司租户仍有 % 名在职用户缺少主体范围记录（fail-closed，拒绝提交）',
            missing_count;
    END IF;
END $$;

-- 2.5 多公司租户：不自动授予，仅提示待人工授权人数
DO $$
DECLARE
    pending_count bigint;
BEGIN
    SELECT COUNT(*) INTO pending_count
    FROM (
        SELECT DISTINCT tu.tenant_id, u.id AS user_id
        FROM public.core_tenant_users tu
        JOIN iam.users u ON u.id = tu.user_id
        WHERE tu.status = 'active'
          AND tu.deleted_at IS NULL
          AND u.status = 'active'
          AND u.is_active
          AND u.deleted_at IS NULL
          AND (
              SELECT COUNT(*) FROM hrm.companies c2
              WHERE c2.tenant_id = tu.tenant_id AND c2.deleted_at IS NULL
          ) > 1
    ) t;

    IF pending_count > 0 THEN
        RAISE NOTICE
            'P1：% 名多公司租户在职用户未自动授权，需通过 /iam/users/{id}/company-scopes 人工配置',
            pending_count;
    END IF;
END $$;

-- 2.6 生产公司名仍是占位值时提示（迁移不改名）
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM hrm.companies
        WHERE deleted_at IS NULL AND name = '企业全称（请修改）'
    ) THEN
        RAISE NOTICE
            'P1：存在名称为“企业全称（请修改）”的公司，请业务方在 HRM 设置中改名；本迁移不改名';
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3) 合并范围 / 公司关系：指向本租户真实公司
-- ---------------------------------------------------------------------------

-- 3.1 consolidation_scope_companies
DO $$
DECLARE
    orphan_count bigint;
    cross_count bigint;
BEGIN
    SELECT COUNT(*) INTO orphan_count
    FROM erp.consolidation_scope_companies s
    WHERE NOT EXISTS (SELECT 1 FROM hrm.companies c WHERE c.id = s.company_id);

    IF orphan_count > 0 THEN
        DELETE FROM erp.consolidation_scope_companies s
        WHERE NOT EXISTS (SELECT 1 FROM hrm.companies c WHERE c.id = s.company_id);
        RAISE NOTICE 'P1：删除 % 条指向不存在公司的合并范围记录', orphan_count;
    END IF;

    UPDATE erp.consolidation_scope_companies s
    SET tenant_id = c.tenant_id
    FROM hrm.companies c
    WHERE c.id = s.company_id AND s.tenant_id IS NULL;

    SELECT COUNT(*) INTO cross_count
    FROM erp.consolidation_scope_companies s
    JOIN hrm.companies c ON c.id = s.company_id
    WHERE s.tenant_id IS NOT NULL AND s.tenant_id <> c.tenant_id;

    IF cross_count > 0 THEN
        UPDATE erp.consolidation_scope_companies s
        SET tenant_id = c.tenant_id,
            deleted_at = COALESCE(s.deleted_at, now())
        FROM hrm.companies c
        WHERE c.id = s.company_id
          AND s.tenant_id IS NOT NULL
          AND s.tenant_id <> c.tenant_id;
        RAISE NOTICE 'P1：% 条合并范围记录跨租户引用，已软删并归位到公司所属租户', cross_count;
    END IF;
END $$;

ALTER TABLE erp.consolidation_scope_companies ALTER COLUMN tenant_id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_scope_companies_company'
    ) THEN
        ALTER TABLE erp.consolidation_scope_companies
            ADD CONSTRAINT fk_scope_companies_company
            FOREIGN KEY (tenant_id, company_id)
            REFERENCES hrm.companies (tenant_id, id);
    END IF;
END $$;

-- 3.2 company_relations（父/子均需指向本租户真实公司）
DO $$
DECLARE
    orphan_count bigint;
BEGIN
    SELECT COUNT(*) INTO orphan_count
    FROM erp.company_relations r
    WHERE NOT EXISTS (SELECT 1 FROM hrm.companies c WHERE c.id = r.parent_company_id)
       OR NOT EXISTS (SELECT 1 FROM hrm.companies c WHERE c.id = r.child_company_id);

    IF orphan_count > 0 THEN
        DELETE FROM erp.company_relations r
        WHERE NOT EXISTS (SELECT 1 FROM hrm.companies c WHERE c.id = r.parent_company_id)
           OR NOT EXISTS (SELECT 1 FROM hrm.companies c WHERE c.id = r.child_company_id);
        RAISE NOTICE 'P1：删除 % 条指向不存在公司的公司关系记录', orphan_count;
    END IF;

    UPDATE erp.company_relations r
    SET tenant_id = c.tenant_id
    FROM hrm.companies c
    WHERE c.id = r.parent_company_id AND r.tenant_id IS NULL;
END $$;

DO $$
DECLARE
    cross_count bigint;
BEGIN
    SELECT COUNT(*) INTO cross_count
    FROM erp.company_relations r
    JOIN hrm.companies cp ON cp.id = r.parent_company_id
    JOIN hrm.companies cc ON cc.id = r.child_company_id
    WHERE r.tenant_id IS NOT NULL
      AND (r.tenant_id <> cp.tenant_id OR r.tenant_id <> cc.tenant_id
           OR cp.tenant_id <> cc.tenant_id);

    IF cross_count > 0 THEN
        UPDATE erp.company_relations r
        SET tenant_id = cp.tenant_id,
            deleted_at = COALESCE(r.deleted_at, now())
        FROM hrm.companies cp, hrm.companies cc
        WHERE cp.id = r.parent_company_id
          AND cc.id = r.child_company_id
          AND r.tenant_id IS NOT NULL
          AND (r.tenant_id <> cp.tenant_id OR r.tenant_id <> cc.tenant_id
               OR cp.tenant_id <> cc.tenant_id);
        RAISE NOTICE 'P1：% 条公司关系跨租户引用，已软删并归位到父公司所属租户', cross_count;
    END IF;
END $$;

ALTER TABLE erp.company_relations ALTER COLUMN tenant_id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_company_relations_parent_company'
    ) THEN
        ALTER TABLE erp.company_relations
            ADD CONSTRAINT fk_company_relations_parent_company
            FOREIGN KEY (tenant_id, parent_company_id)
            REFERENCES hrm.companies (tenant_id, id);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_company_relations_child_company'
    ) THEN
        ALTER TABLE erp.company_relations
            ADD CONSTRAINT fk_company_relations_child_company
            FOREIGN KEY (tenant_id, child_company_id)
            REFERENCES hrm.companies (tenant_id, id);
    END IF;
END $$;

-- ============================================================
-- P3-PK: prod 补齐 5 条 PRIMARY KEY
--
-- 依据：prod vs topems_test 只读盘点 2026-11-04，按 (schema.table, contype, conname)
--   取差集并按表分组；本文件为其中 5 条。约束名取自 test 侧实测定义（prod 尚无同名约束），
--   列清单由 pg_constraint.conkey/confkey 解析，非猜测。
-- 排除：5 张 *.schema_defense_ledger 为运行时 CREATE IF NOT EXISTS 自建表（不在 sqlx 迁移链，
--   见 scripts/migration/check-schema-defense.mjs 的自建白名单），其 PK 不在本迁移内。
-- 守卫：表不存在 / 约束已存在 / 数据不满足时均跳过并 RAISE NOTICE，不中断后续条目。
-- 幂等：重复执行时约束已存在即跳过。
-- 回滚：DROP CONSTRAINT <name> ON <schema.table>（逐条可逆，无数据改写）。
-- ============================================================

SET lock_timeout = '5s';

-- flow.core_master_data_refs.core_master_data_refs_pkey：PRIMARY KEY (master_data_id)
DO $$
BEGIN
  IF to_regclass('flow.core_master_data_refs') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'flow.core_master_data_refs'::regclass AND conname = 'core_master_data_refs_pkey')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'flow.core_master_data_refs'::regclass AND contype = 'p') THEN
    IF EXISTS (SELECT 1 FROM flow.core_master_data_refs WHERE master_data_id IS NULL) THEN
      RAISE NOTICE 'SKIP flow.core_master_data_refs PK core_master_data_refs_pkey: NULL in master_data_id';
    ELSIF EXISTS (SELECT 1 FROM flow.core_master_data_refs GROUP BY master_data_id HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP flow.core_master_data_refs PK core_master_data_refs_pkey: duplicate master_data_id';
    ELSE
      ALTER TABLE flow.core_master_data_refs ADD CONSTRAINT core_master_data_refs_pkey PRIMARY KEY (master_data_id);
    END IF;
  END IF;
END $$;

-- iam._sqlx_migrations._sqlx_migrations_pkey：PRIMARY KEY (version)
DO $$
BEGIN
  IF to_regclass('iam._sqlx_migrations') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam._sqlx_migrations'::regclass AND conname = '_sqlx_migrations_pkey')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam._sqlx_migrations'::regclass AND contype = 'p') THEN
    IF EXISTS (SELECT 1 FROM iam._sqlx_migrations WHERE version IS NULL) THEN
      RAISE NOTICE 'SKIP iam._sqlx_migrations PK _sqlx_migrations_pkey: NULL in version';
    ELSIF EXISTS (SELECT 1 FROM iam._sqlx_migrations GROUP BY version HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP iam._sqlx_migrations PK _sqlx_migrations_pkey: duplicate version';
    ELSE
      ALTER TABLE iam._sqlx_migrations ADD CONSTRAINT _sqlx_migrations_pkey PRIMARY KEY (version);
    END IF;
  END IF;
END $$;

-- iam.core_chat_members.core_chat_members_pkey：PRIMARY KEY (room_id,user_id)
DO $$
BEGIN
  IF to_regclass('iam.core_chat_members') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_chat_members'::regclass AND conname = 'core_chat_members_pkey')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_chat_members'::regclass AND contype = 'p') THEN
    IF EXISTS (SELECT 1 FROM iam.core_chat_members WHERE room_id IS NULL OR user_id IS NULL) THEN
      RAISE NOTICE 'SKIP iam.core_chat_members PK core_chat_members_pkey: NULL in room_id,user_id';
    ELSIF EXISTS (SELECT 1 FROM iam.core_chat_members GROUP BY room_id,user_id HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP iam.core_chat_members PK core_chat_members_pkey: duplicate room_id,user_id';
    ELSE
      ALTER TABLE iam.core_chat_members ADD CONSTRAINT core_chat_members_pkey PRIMARY KEY (room_id,user_id);
    END IF;
  END IF;
END $$;

-- iam.core_role_permissions.core_role_permissions_pkey：PRIMARY KEY (role_id,permission_id)
DO $$
BEGIN
  IF to_regclass('iam.core_role_permissions') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_role_permissions'::regclass AND conname = 'core_role_permissions_pkey')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_role_permissions'::regclass AND contype = 'p') THEN
    IF EXISTS (SELECT 1 FROM iam.core_role_permissions WHERE role_id IS NULL OR permission_id IS NULL) THEN
      RAISE NOTICE 'SKIP iam.core_role_permissions PK core_role_permissions_pkey: NULL in role_id,permission_id';
    ELSIF EXISTS (SELECT 1 FROM iam.core_role_permissions GROUP BY role_id,permission_id HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP iam.core_role_permissions PK core_role_permissions_pkey: duplicate role_id,permission_id';
    ELSE
      ALTER TABLE iam.core_role_permissions ADD CONSTRAINT core_role_permissions_pkey PRIMARY KEY (role_id,permission_id);
    END IF;
  END IF;
END $$;

-- iam.core_user_roles.core_user_roles_pkey：PRIMARY KEY (user_id,role_id)
DO $$
BEGIN
  IF to_regclass('iam.core_user_roles') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_user_roles'::regclass AND conname = 'core_user_roles_pkey')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_user_roles'::regclass AND contype = 'p') THEN
    IF EXISTS (SELECT 1 FROM iam.core_user_roles WHERE user_id IS NULL OR role_id IS NULL) THEN
      RAISE NOTICE 'SKIP iam.core_user_roles PK core_user_roles_pkey: NULL in user_id,role_id';
    ELSIF EXISTS (SELECT 1 FROM iam.core_user_roles GROUP BY user_id,role_id HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP iam.core_user_roles PK core_user_roles_pkey: duplicate user_id,role_id';
    ELSE
      ALTER TABLE iam.core_user_roles ADD CONSTRAINT core_user_roles_pkey PRIMARY KEY (user_id,role_id);
    END IF;
  END IF;
END $$;



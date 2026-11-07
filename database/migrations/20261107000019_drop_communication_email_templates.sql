-- 邮件模板链路下线：删除 communication.core_email_templates 副本
-- 版本：20261107000019（2026-11-06）
--
-- 背景：邮件模板功能（mail.rs 的 7 个模板 handler 与两套路由、前端模板页签/下拉）
-- 已整体下线，代码不再访问该表。该表只在 communication schema 存在，
-- public 权威表从未创建；它由历史 schema_defense 在 communication 建出，
-- 当前 schema_defense 已移除该表定义，因此不会再被重建。
--
-- 顺序约束（务必遵守）：
--   1. 先发布不含模板路由/裸名 SQL 的新二进制（旧二进制仍会访问该表）；
--   2. 确认新版本已上线且稳定；
--   3. 再应用本迁移。
--   若顺序颠倒（先删表、后发新码），旧二进制调用模板接口会直接报 relation 不存在。
--
-- 守卫（任一不满足则整条迁移失败回滚，不做静默跳过）：
--   - 表不存在：直接成功（幂等，适用于已清理环境）；
--   - 不是普通表（视图/外表等）：报错拒绝；
--   - 仍有行：报错拒绝（要求 0 行，避免误删数据）；
--   - 存在入向外键：报错拒绝（需要人工确认依赖）。
--
-- down:
--   CREATE TABLE communication.core_email_templates (
--       id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--       name varchar(255) NOT NULL,
--       subject_template text NOT NULL,
--       body_template text NOT NULL,
--       description text,
--       created_at timestamptz NOT NULL DEFAULT now(),
--       updated_at timestamptz NOT NULL DEFAULT now()
--   );
--   （注意：即使重建空表，旧模板 CRUD/发信代码与前端入口也不会自动恢复；
--     恢复功能需要重建表 + 新 API 契约 + 前端改造，见下线记录）
-- ============================================================

DO $$
DECLARE
    v_relkind "char";
    v_rows   bigint;
BEGIN
    IF to_regclass('communication.core_email_templates') IS NULL THEN
        RAISE NOTICE 'communication.core_email_templates 不存在，跳过';
        RETURN;
    END IF;

    SELECT c.relkind INTO v_relkind
    FROM pg_class c
    WHERE c.oid = to_regclass('communication.core_email_templates');

    IF v_relkind <> 'r' THEN
        RAISE EXCEPTION 'communication.core_email_templates 不是普通表（relkind=%），拒绝删除', v_relkind;
    END IF;

    SELECT count(*) INTO v_rows FROM communication.core_email_templates;
    IF v_rows <> 0 THEN
        RAISE EXCEPTION 'communication.core_email_templates 有 % 行（要求 0 行），拒绝删除', v_rows;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE contype = 'f'
          AND confrelid = to_regclass('communication.core_email_templates')
    ) THEN
        RAISE EXCEPTION '存在指向 communication.core_email_templates 的外键，拒绝删除';
    END IF;

    DROP TABLE communication.core_email_templates RESTRICT;
    RAISE NOTICE '已删除 communication.core_email_templates（0 行）';
END $$;

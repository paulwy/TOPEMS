-- V252 Phase 3: 加密字段 VARCHAR → TEXT
--
-- 根因：email/phone/id_card 等字段经 AES 加密 + Base64 编码后长度膨胀
-- （原文 17 字符 → 密文 60+ 字符），超过 VARCHAR(20~100) 限制导致
-- 'value too long for type character varying' 错误。
--
-- 此迁移动态查找所有名为加密相关列的 VARCHAR 列，统一改为 TEXT。
-- 对应 schema 定义文件已同步修改 VARCHAR → TEXT。

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT table_schema, table_name, column_name
        FROM information_schema.columns
        WHERE data_type = 'character varying'
          AND column_name IN (
              'email', 'phone', 'mobile', 'id_card_number',
              'contact_phone', 'contact_email', 'emergency_contact_phone',
              'applicant_email', 'applicant_phone', 'driver_phone',
              'from_email', 'to_email', 'user_email'
          )
          AND table_schema NOT IN ('information_schema', 'pg_catalog')
    LOOP
        EXECUTE format(
            'ALTER TABLE %I.%I ALTER COLUMN %I TYPE TEXT',
            r.table_schema, r.table_name, r.column_name
        );
    END LOOP;
END $$;

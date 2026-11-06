-- [batch32] 供应商主数据权威表 master_data.mdm_suppliers（数据导入）
--
-- 用途：将 scm.suppliers 与 srm.suppliers（软删过滤后）按 supplier_no 去重，
--       scm 优先，灌入 master_data.mdm_suppliers。
--
-- 数据现状（已用 information_schema.columns + count 实测，执行时点）：
--   * scm.suppliers 软删后 196 行：tenant ...0001 共 195 行，tenant ...0000 共 1 行。
--   * srm.suppliers 软删后 92 行：全部 tenant ...0001。
--   * 两源 supplier_no 零重叠（intersect 实测 0）。
--   * scm 有 1 行 supplier_no IS NULL：id fafba72d-7bef-41ab-8231-64ed0b8ae0bd，
--     name='双语验证供应商'，tenant ...0000，status='active'，category=NULL。
--     该行因 supplier_no 为业务唯一键（NOT NULL），本批不导入，显式过滤
--     （见下方 WHERE supplier_no IS NOT NULL），留待源表治理专项处理。
--   * 预期导入 287 行 = scm 195（非空 supplier_no） + srm 92。
--
-- 枚举分裂登记（本批不映射，原样保留，留待下一批专项）：
--   * category 跨源分裂：scm 用英文枚举 'raw_material'（195 行），
--     srm 用中文枚举 '原材料'（92 行）。本批原样写入 mdm_suppliers.category，
--     不做中英文归一映射；后续需建 supplier_category 字典表 + 映射专项。
--   * status 两源当前一致（均为 'active'），暂无分裂；若后续出现 scm 英文 /
--     srm 中文差异，同样登记、本批不映射。
--
-- 列差异说明：
--   * scm.suppliers 有 remarks(text) / lead_time_days(int)；srm.suppliers 无此二列，
--     UNION 时用 NULL 占位（已逐列核对 information_schema.columns 确认 srm 无此二列）。
--   * 溯源列 source_system（'scm'/'srm'）、source_id（原表 id）由本批写入。
--
-- 幂等：ON CONFLICT (supplier_no, tenant_id) DO NOTHING；二次执行 INSERT 0 0。
--
-- 备份：导入前已用 \copy 将两源表导出至
--   database/backup/batch32_scm_suppliers_<ts>.csv（196 行数据 + 表头 = 197 行）
--   database/backup/batch32_srm_suppliers_<ts>.csv（92 行数据 + 表头 = 93 行）
--
-- ROLLBACK（如需回滚本批导入，在 psql 中执行）：
--   BEGIN;
--   DELETE FROM master_data.mdm_suppliers WHERE source_system IN ('scm','srm');
--   COMMIT;
--   （仅删除本批灌入的行；不影响后续双写专项写入的数据。）

BEGIN;

INSERT INTO master_data.mdm_suppliers (
    supplier_no, name, legal_name, category, status, tax_id, address, contact_person,
    phone, email, website, credit_rating, risk_level, bank_name, bank_account, remarks,
    name_en, lead_time_days, tenant_id, source_system, source_id
)
SELECT supplier_no, name, legal_name, category, status, tax_id, address, contact_person,
       phone, email, website, credit_rating, risk_level, bank_name, bank_account, remarks,
       name_en, lead_time_days, tenant_id, src, id
FROM (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY supplier_no ORDER BY (src = 'scm') DESC) AS rn
    FROM (
        -- scm.suppliers（软删过滤 + supplier_no 非空过滤）
        SELECT id, supplier_no, name, legal_name, category, status, tax_id, address, contact_person,
               phone, email, website, credit_rating, risk_level, bank_name, bank_account, remarks,
               name_en, lead_time_days, tenant_id, 'scm'::varchar AS src
        FROM scm.suppliers
        WHERE deleted_at IS NULL
          AND supplier_no IS NOT NULL
        UNION ALL
        -- srm.suppliers（软删过滤 + supplier_no 非空过滤；无 remarks/lead_time_days 用 NULL 占位）
        SELECT id, supplier_no, name, legal_name, category, status, tax_id, address, contact_person,
               phone, email, website, credit_rating, risk_level, bank_name, bank_account,
               NULL::text AS remarks, name_en, NULL::int AS lead_time_days, tenant_id, 'srm'::varchar AS src
        FROM srm.suppliers
        WHERE deleted_at IS NULL
          AND supplier_no IS NOT NULL
    ) u
) r
WHERE rn = 1
ON CONFLICT (supplier_no, tenant_id) DO NOTHING;

COMMIT;

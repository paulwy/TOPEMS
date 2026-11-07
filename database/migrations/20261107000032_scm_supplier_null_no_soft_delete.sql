-- [batch33] scm.suppliers NULL supplier_no 测试行软删治理
--
-- 用途：处置 scm.suppliers 中 supplier_no IS NULL 的脏数据行（id=fafba72d-...）。
--
-- 取证结论（执行前实测）：
--   * 该行完整特征：name='双语验证供应商', legal_name='BTS', address='测试地址',
--     contact_person='测试员', phone='13900000000', email='bilingual@test.com',
--     name_en='Bilingual Test Supplier', tenant_id=全零 UUID,
--     supplier_no=NULL, category=NULL, status='active', risk_level='medium'。
--   * 零业务引用：scm.supplier_products / scm.purchase_orders / scm.purchase_contracts /
--     scm.supplier_evaluations / scm.supplier_quotes / scm.incoming_notices /
--     scm.mrp_suggestions / scm.wms_inbound_order_snapshots /
--     srm.suppliers.scm_supplier_id / erp.purchase_orders / wms.inbound_orders
--     全部 count=0。
--   * 代码库 grep 'fafba72d' 仅命中迁移注释（本文件 + 0030），无业务代码引用。
--   * 特征高度指向早期双语验证测试数据（命名含"测试"、邮箱为 test.com、
--     全零租户、业务唯一键为空）。
--
-- 判定：测试数据 → 软删（不物理删除，保留可追溯；不补 supplier_no，
--       不灌入 mdm_suppliers，因该行本就不该进入权威表）。
--
-- 数字变化预期：
--   * scm.suppliers 有效行数（deleted_at IS NULL）：196 → 195
--   * master_data.mdm_suppliers：287 不变（该行本就未被导入）
--
-- 备份：改前已用 \copy 导出至
--   database/backup/batch33_scm_supplier_null_no_row_<ts>.csv（1 数据行 + 表头 = 2 行）
--
-- 幂等：UPDATE 带 deleted_at IS NULL 条件，二次执行 UPDATE 0。
--
-- ROLLBACK（如需恢复该行，在 psql 中执行）：
--   BEGIN;
--   UPDATE scm.suppliers SET deleted_at = NULL
--    WHERE id = 'fafba72d-7bef-41ab-8231-64ed0b8ae0bd'
--      AND supplier_no IS NULL
--      AND tenant_id = '00000000-0000-0000-0000-000000000000';
--   COMMIT;

BEGIN;

UPDATE scm.suppliers
SET deleted_at = now(),
    updated_at = now()
WHERE id = 'fafba72d-7bef-41ab-8231-64ed0b8ae0bd'
  AND supplier_no IS NULL
  AND tenant_id = '00000000-0000-0000-0000-000000000000'
  AND deleted_at IS NULL;

COMMIT;

-- 2026-10-17 ehs hazardous_material 域：/hazardous-materials 主 CRUD + /{id}/msds 接真补列
-- 背景：前端 EhsHazardousMaterialPage 真实调用 listHazardousMaterials/createHazardousMaterial/
--       updateHazardousMaterial/deleteHazardousMaterial + getMSDSByMaterialId（:166 查看 MSDS）
--       （apps/web/src/api/ehs/hazardousMaterial.ts，路径 /hazardous-materials、/hazardous-materials/{id}/msds，
--       契约 types/hazardousMaterial.ts HazardousMaterial 20 字段：material_no/name/category/hazard_class/
--       un_number/cas_no/specification/unit/description/hazards[]/storage_requirements/handling_requirements/
--       emergency_measures/msds_url/status；MSDS 18 字段：material_id/material_name/version/product_name/
--       manufacturer/emergency_phone/hazard_identification/composition_info/first_aid_measures/
--       fire_fighting_measures/accidental_release_measures/handling_and_storage/exposure_controls/
--       physical_chemical_properties/reactivity_info），后端 hazardous_material.rs 对应 5 handler + msds
--       handler 全内存桩（create 内存构造、msds 返回"浓硫酸"假数据）= 撒谎面。
-- 现状：ehs.qa_ehs_hazardous_materials（26 列，RLS 已强制，29 行存量）与后端 struct 同源（alias/english_name/
--       packaging/storage_condition/max_stock 等旧语义），与前端契约缺 5 字段：un_number/description/hazards/
--       storage_requirements/handling_requirements（msds_url ← safety_data_sheet 列别名读出）；
--       ehs.qa_ehs_msds（22 列，RLS 已强制，0 行）与前端 MSDS 缺 3 字段：product_name/manufacturer/emergency_phone
--       （composition_info↔ingredients、exposure_controls↔exposure_control、reactivity_info↔stability_reactivity
--       用列别名读出）。方案（后端宽容零回归）：主 CRUD 接真 qa_ehs_hazardous_materials（struct 重写对齐前端
--       20 字段）、msds 接真 qa_ehs_msds，补 8 列。
-- 幂等：ADD COLUMN IF NOT EXISTS 可重复执行。

ALTER TABLE ehs.qa_ehs_hazardous_materials
    ADD COLUMN IF NOT EXISTS un_number varchar(64),
    ADD COLUMN IF NOT EXISTS description text,
    ADD COLUMN IF NOT EXISTS hazards jsonb,
    ADD COLUMN IF NOT EXISTS storage_requirements text,
    ADD COLUMN IF NOT EXISTS handling_requirements text;

ALTER TABLE ehs.qa_ehs_msds
    ADD COLUMN IF NOT EXISTS product_name varchar(256),
    ADD COLUMN IF NOT EXISTS manufacturer varchar(256),
    ADD COLUMN IF NOT EXISTS emergency_phone varchar(64);

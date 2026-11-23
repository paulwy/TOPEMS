-- B183 物料需求状态约束候选（本地已应用，NOT VALID）
-- 表：mes.material_requirements.status
-- 值集：draft / confirmed / released / completed / cancelled（默认 draft）

ALTER TABLE mes.material_requirements
  ALTER COLUMN status SET DEFAULT 'draft';

ALTER TABLE mes.material_requirements
  ADD CONSTRAINT ck_mes_material_requirements_status_standard
  CHECK (status = ANY (ARRAY['draft','confirmed','released','completed','cancelled']::text[]))
  NOT VALID;

-- 回滚（如需）
-- ALTER TABLE mes.material_requirements DROP CONSTRAINT ck_mes_material_requirements_status_standard;
-- ALTER TABLE mes.material_requirements ALTER COLUMN status SET DEFAULT 'pending';

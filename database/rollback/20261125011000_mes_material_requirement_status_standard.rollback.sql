-- B282 回滚：恢复 mes.material_requirements.status 可空
ALTER TABLE mes.material_requirements
    ALTER COLUMN status DROP NOT NULL;

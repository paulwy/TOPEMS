-- 创建触发器来阻止自动插入部门种子数据
CREATE OR REPLACE FUNCTION prevent_department_seed_insert() 
RETURNS TRIGGER AS $$
BEGIN
    -- 如果插入的是种子数据，则忽略（不插入）而不是抛出错误
    IF NEW.name IN ('总公司', '技术部', '市场部', '人力资源部', '财务部') THEN
        RETURN NULL; -- 返回 NULL 会阻止插入但不报错
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_department_seed ON erp.departments;
CREATE TRIGGER trg_prevent_department_seed BEFORE INSERT ON erp.departments
FOR EACH ROW EXECUTE FUNCTION prevent_department_seed_insert();

-- 清空现有的部门数据
DELETE FROM erp.departments;

-- 删除之前的调试表
DROP TABLE IF EXISTS erp.department_insert_log;
DROP TRIGGER IF EXISTS trg_log_department_insert ON erp.departments;
DROP FUNCTION IF EXISTS log_department_insert();
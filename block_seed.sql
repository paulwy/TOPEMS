-- 创建一个触发器来阻止自动插入部门种子数据
CREATE OR REPLACE FUNCTION block_department_seed() 
RETURNS TRIGGER AS $$
BEGIN
    -- 如果插入的是种子数据（特定名称的部门），则抛出错误
    IF NEW.name IN ('总公司', '技术部', '市场部', '人力资源部', '财务部') THEN
        RAISE EXCEPTION '阻止自动插入部门种子数据: %', NEW.name;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_block_department_seed ON erp.departments;
CREATE TRIGGER trg_block_department_seed BEFORE INSERT ON erp.departments
FOR EACH ROW EXECUTE FUNCTION block_department_seed();
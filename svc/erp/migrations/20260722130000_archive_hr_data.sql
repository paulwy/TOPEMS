-- ================================================
-- V15 Phase 3: ERP HR 数据归档迁移
-- ================================================
-- 背景：ERP 的 HR 模块已通过代理层（hr_proxy.rs）路由到独立 HRM 服务
-- 此迁移将 ERP 中遗留的 HR 相关数据标记为归档状态，禁止写入
-- ================================================

-- 1. 创建归档标记表（记录哪些表/数据已归档）
CREATE TABLE IF NOT EXISTS erp.archive_marks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schema_name VARCHAR(64) NOT NULL,
    table_name VARCHAR(64) NOT NULL,
    column_name VARCHAR(64),
    archive_type VARCHAR(32) NOT NULL DEFAULT 'table',
    archive_reason TEXT,
    archived_at TIMESTAMP NOT NULL DEFAULT NOW(),
    archived_by VARCHAR(100),
    CONSTRAINT uq_archive_mark UNIQUE (schema_name, table_name, column_name)
);

-- 2. 标记 HR 相关字典类型为归档
INSERT INTO erp.archive_marks (schema_name, table_name, column_name, archive_type, archive_reason)
SELECT 'erp', 'dict_types', id, 'row', 'HRM 模块已独立，相关字典类型迁移至 HRM 服务'
FROM erp.dict_types
WHERE code IN ('employee_status', 'employee_type', 'attendance_status')
ON CONFLICT DO NOTHING;

-- 3. 将 HR 相关字典类型状态设为 archived
UPDATE erp.dict_types
SET status = 'archived', updated_at = NOW()
WHERE code IN ('employee_status', 'employee_type', 'attendance_status');

-- 4. 将 HR 相关字典项状态设为 archived
UPDATE erp.dict_items
SET status = 'archived', updated_at = NOW()
WHERE type_id IN (SELECT id FROM erp.dict_types WHERE code IN ('employee_status', 'employee_type', 'attendance_status'));

-- 5. 标记包含 department_id 外键的表（这些字段引用 HRM 服务的部门）
INSERT INTO erp.archive_marks (schema_name, table_name, column_name, archive_type, archive_reason)
VALUES
    ('erp', 'fixed_assets', 'department_id', 'column', 'department_id 外键已指向 HRM 服务，ERP 不再管理部门数据'),
    ('erp', 'expenses', 'department_id', 'column', 'department_id 外键已指向 HRM 服务，ERP 不再管理部门数据'),
    ('erp', 'assets', 'department', 'column', 'department 字段已迁移至 HRM 服务')
ON CONFLICT DO NOTHING;

-- 6. 创建触发器：防止对已归档字典类型的写入
CREATE OR REPLACE FUNCTION prevent_archived_dict_write()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM erp.dict_types dt
        WHERE dt.id = NEW.type_id
        AND dt.status = 'archived'
    ) THEN
        RAISE EXCEPTION 'Cannot modify archived dictionary items. HR dictionary data is managed by HRM service.';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM erp.archive_marks am
        WHERE am.schema_name = 'erp'
        AND am.table_name = 'dict_types'
        AND am.archive_type = 'row'
        AND am.column_name = NEW.id::text
    ) THEN
        RAISE EXCEPTION 'Cannot modify archived dictionary types. HR dictionary data is managed by HRM service.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为 dict_items 创建写入阻止触发器
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_prevent_archived_dict_items_write') THEN
        CREATE TRIGGER trigger_prevent_archived_dict_items_write
        BEFORE INSERT OR UPDATE ON erp.dict_items
        FOR EACH ROW EXECUTE FUNCTION prevent_archived_dict_write();
    END IF;
END $$;

-- 为 dict_types 创建写入阻止触发器（针对已归档行）
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_prevent_archived_dict_types_write') THEN
        CREATE TRIGGER trigger_prevent_archived_dict_types_write
        BEFORE UPDATE OR DELETE ON erp.dict_types
        FOR EACH ROW EXECUTE FUNCTION prevent_archived_dict_write();
    END IF;
END $$;

-- 7. 创建归档查询视图（方便查询所有已归档的数据）
CREATE OR REPLACE VIEW erp.v_archived_data AS
SELECT
    am.id AS archive_id,
    am.schema_name,
    am.table_name,
    am.column_name,
    am.archive_type,
    am.archive_reason,
    am.archived_at,
    am.archived_by,
    CASE
        WHEN am.archive_type = 'row' AND am.table_name = 'dict_types' THEN dt.code
        WHEN am.archive_type = 'row' AND am.table_name = 'dict_items' THEN di.item_code
        ELSE NULL
    END AS archived_code,
    CASE
        WHEN am.archive_type = 'row' AND am.table_name = 'dict_types' THEN dt.name
        WHEN am.archive_type = 'row' AND am.table_name = 'dict_items' THEN di.item_name
        ELSE NULL
    END AS archived_name
FROM erp.archive_marks am
LEFT JOIN erp.dict_types dt ON am.table_name = 'dict_types' AND dt.id = am.column_name::UUID
LEFT JOIN erp.dict_items di ON am.table_name = 'dict_items' AND di.id = am.column_name::UUID
ORDER BY am.archived_at DESC;

-- 8. 记录归档操作到审计日志
INSERT INTO erp.db_changes (
    change_type,
    description,
    affected_tables,
    created_at
) VALUES (
    'ARCHIVE',
    'V15 Phase 3: HR 相关字典数据归档，禁止写入。HRM 服务已独立，ERP 通过代理层路由 HR 请求。',
    'dict_types, dict_items, archive_marks (新建), v_archived_data (新建视图)',
    NOW()
);

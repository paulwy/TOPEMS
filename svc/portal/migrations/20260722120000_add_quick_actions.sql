-- Portal Quick Actions Migration
-- 门户快捷操作表

SET search_path TO portal;

-- 快捷操作表（系统级配置）
CREATE TABLE IF NOT EXISTS portal_quick_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    action_type VARCHAR(20) NOT NULL DEFAULT 'navigate',
    target_url VARCHAR(500) NOT NULL,
    service_code VARCHAR(50),
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_quick_actions_tenant ON portal.portal_quick_actions(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_quick_actions_service ON portal.portal_quick_actions(service_code);
CREATE INDEX IF NOT EXISTS idx_quick_actions_active ON portal.portal_quick_actions(is_active) WHERE deleted_at IS NULL;

-- 初始化默认快捷操作（使用默认租户）
INSERT INTO portal.portal_quick_actions (tenant_id, name, description, icon, action_type, target_url, service_code, sort_order)
SELECT '00000000-0000-0000-0000-000000000000'::uuid, name, description, icon, action_type, target_url, service_code, sort_order
FROM (VALUES
    ('新建采购单', '快速创建采购订单', 'ShoppingCart', 'navigate', '/scm/purchase-orders/create', 'scm', 1),
    ('快速审批', '审批待处理的流程', 'CheckCircle', 'navigate', '/workflow/pending', 'workflow', 2),
    ('库存盘点', '查看当前库存状态', 'PackageCheck', 'navigate', '/wms/inventory/stocktake', 'wms', 3),
    ('设备报修', '创建设备维修工单', 'Wrench', 'navigate', '/mes/equipment/report', 'mes', 4),
    ('生成报表', '快速生成经营报表', 'FileBarChart', 'navigate', '/bi/reports/generate', 'bi', 5)
) AS v(name, description, icon, action_type, target_url, service_code, sort_order)
ON CONFLICT DO NOTHING;

-- 用户收藏的快捷操作存储在 user_preferences 表中
-- preference_key = 'quick_actions.favorites'
-- preference_value = ["uuid1", "uuid2", ...]

-- 启用行级安全
ALTER TABLE portal_quick_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portal_quick_actions_tenant_isolation" ON portal_quick_actions
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

RESET search_path;

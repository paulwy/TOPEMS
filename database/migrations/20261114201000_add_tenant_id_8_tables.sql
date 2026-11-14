-- RLS 阶段二 M2a：8 张缺 tenant_id 的表「只做加法」——补列 + 索引 + 幂等回填
--
-- 本迁移**不动任何策略**：旧二进制（不设 GUC、走裸池）行为完全不变，可先在旧件上安全投递。
-- 版本号顺序固定为 M1(20261114200000) < M2a(20261114201000) < M2b(20261114202000)，
-- 读账本即可看出「先补列、后收紧」。
--
-- 优先级：erp.meeting_rooms / meeting_bookings / vehicles / vehicle_requests 是阶段一
-- block C 代码的硬依赖（代码已写 tenant_id，prod 无该列，部署新二进制前必须先跑本迁移，
-- 否则 4 个创建接口全 42703）。
--
-- prod 这 8 张表均为 0 行，回填实际为空操作；语句仍按 JOIN 来源写成可重跑、幂等。
-- 列保持 nullable：不伪造租户、不阻塞历史 NULL 行（M2b 收紧后 NULL 行不可见）。
-- 回滚见 database/rollback/20261114201000_add_tenant_id_8_tables.rollback.sql：删索引，并在「列内无非空数据」时删列。

-- ========== 硬依赖优先：erp 4 张 ==========

-- 1. erp.meeting_rooms
ALTER TABLE erp.meeting_rooms ADD COLUMN IF NOT EXISTS tenant_id uuid;
CREATE INDEX IF NOT EXISTS idx_erp_meeting_rooms_tenant_id ON erp.meeting_rooms (tenant_id);

-- 2. erp.meeting_bookings（可由 room_id -> meeting_rooms.tenant_id 归因）
ALTER TABLE erp.meeting_bookings ADD COLUMN IF NOT EXISTS tenant_id uuid;
CREATE INDEX IF NOT EXISTS idx_erp_meeting_bookings_tenant_id ON erp.meeting_bookings (tenant_id);
UPDATE erp.meeting_bookings b
SET tenant_id = r.tenant_id
FROM erp.meeting_rooms r
WHERE b.room_id = r.id
  AND b.tenant_id IS NULL
  AND r.tenant_id IS NOT NULL;

-- 3. erp.vehicles（plate_number 全局唯一保持不动）
ALTER TABLE erp.vehicles ADD COLUMN IF NOT EXISTS tenant_id uuid;
CREATE INDEX IF NOT EXISTS idx_erp_vehicles_tenant_id ON erp.vehicles (tenant_id);

-- 4. erp.vehicle_requests（可由 vehicle_id -> vehicles.tenant_id 归因）
ALTER TABLE erp.vehicle_requests ADD COLUMN IF NOT EXISTS tenant_id uuid;
CREATE INDEX IF NOT EXISTS idx_erp_vehicle_requests_tenant_id ON erp.vehicle_requests (tenant_id);
UPDATE erp.vehicle_requests vr
SET tenant_id = v.tenant_id
FROM erp.vehicles v
WHERE vr.vehicle_id = v.id
  AND vr.tenant_id IS NULL
  AND v.tenant_id IS NOT NULL;

-- ========== 其余 4 张：prod 0 行，无可靠回填来源，不猜不填 ==========

-- 5. erp.expenses（空壳表；finance 服务实际写 finance.expenses）
ALTER TABLE erp.expenses ADD COLUMN IF NOT EXISTS tenant_id uuid;
CREATE INDEX IF NOT EXISTS idx_erp_expenses_tenant_id ON erp.expenses (tenant_id);

-- 6. crm.core_crm_customers（空壳表）
ALTER TABLE crm.core_crm_customers ADD COLUMN IF NOT EXISTS tenant_id uuid;
CREATE INDEX IF NOT EXISTS idx_crm_core_crm_customers_tenant_id ON crm.core_crm_customers (tenant_id);

-- 7. erp.core_erp_suppliers（空壳表）
ALTER TABLE erp.core_erp_suppliers ADD COLUMN IF NOT EXISTS tenant_id uuid;
CREATE INDEX IF NOT EXISTS idx_erp_core_erp_suppliers_tenant_id ON erp.core_erp_suppliers (tenant_id);

-- 8. portal.portal_announcements（空壳表）
ALTER TABLE portal.portal_announcements ADD COLUMN IF NOT EXISTS tenant_id uuid;
CREATE INDEX IF NOT EXISTS idx_portal_portal_announcements_tenant_id ON portal.portal_announcements (tenant_id);

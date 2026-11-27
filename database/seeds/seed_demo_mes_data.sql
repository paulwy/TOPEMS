-- ============================================================================
-- 演示种子数据：MES 设备 / 工站 / 生产工单 / 作业工单
-- 用途：空库环境下列出评审可看的真实业务数据（生产看板、工站利用率）
-- 幂等可重放：按业务键 WHERE NOT EXISTS 判断，重复执行不产生重复行
-- 租户：00000000-0000-0000-0000-000000000001
-- 注意：mes 表启用 RLS 且 FORCE，写入前必须打开系统开关 app.rls_system
-- 执行：psql -d topems_prod -f database/seeds/seed_demo_mes_data.sql
-- ============================================================================

SET app.rls_system = 'on';
SET app.tenant_id = '00000000-0000-0000-0000-000000000001';

-- 1) 设备（6 台，覆盖 running / idle / maintenance 三种状态，含 OEE 分项）
INSERT INTO mes.equipment (equipment_code, description, equipment_name, equipment_type, category, model, brand, location, status, operating_status,
  availability_percentage, performance_percentage, quality_percentage, oee_percentage, total_operating_hours, tenant_id)
SELECT v.c1, v.c9 || '｜演示数据', v.c2, v.c3, v.c4, v.c5, v.c6, v.c7, v.c8, v.c9,
       v.c10::numeric, v.c11::numeric, v.c12::numeric, v.c13::numeric, v.c14::numeric,
       '00000000-0000-0000-0000-000000000001'::uuid
FROM (VALUES
 ('EQ-CNC-001','数控加工中心 A','CNC','机加工','VMC-855','海天精工','一号厂房/机加工区','running','running','92.5','88.0','99.1','80.7','12480.5'),
 ('EQ-CNC-002','数控加工中心 B','CNC','机加工','VMC-1160','海天精工','一号厂房/机加工区','running','running','89.4','85.2','98.6','75.1','11020.0'),
 ('EQ-LSR-003','光纤激光切割机','LASER','钣金','LF3015GA','大族激光','一号厂房/钣金区','running','running','95.0','91.3','99.4','86.2','8730.5'),
 ('EQ-WLD-004','机器人焊接工作站','WELDING','焊接','QR-6A','发那科','二号厂房/焊接区','idle','idle','0','0','0','0','6420.0'),
 ('EQ-ASM-005','总装流水线','ASSEMBLY','装配','ASM-2000','自研','二号厂房/总装区','running','running','93.2','90.1','99.2','83.3','15600.0'),
 ('EQ-TST-006','综合测试台','TESTING','检测','TST-800','安捷伦','三号厂房/检测区','maintenance','maintenance','0','0','0','0','4310.0')
) AS v(c1,c2,c3,c4,c5,c6,c7,c8,c9,c10,c11,c12,c13,c14)
WHERE NOT EXISTS (SELECT 1 FROM mes.equipment e WHERE e.equipment_code = v.c1);

-- 2) 生产工单（4 条：in_progress / completed / pending 覆盖状态流转）
INSERT INTO mes.production_orders (order_number, order_no, product_code, product_name, quantity, completed_quantity, status,
  planned_start_date, planned_end_date, tenant_id)
SELECT v.c1, v.c2, v.c3, v.c4, v.c5::bigint, v.c6::bigint, v.c7, v.c8::date, v.c9::date,
       '00000000-0000-0000-0000-000000000001'::uuid
FROM (VALUES
 ('MO-2026-0001','MO-2026-0001','PRD-1001','智能配电柜 800A','240','160','in_progress','2026-11-21','2026-11-28'),
 ('MO-2026-0002','MO-2026-0002','PRD-1002','工业控制机柜 1200×600','150','150','completed','2026-11-18','2026-11-22'),
 ('MO-2026-0003','MO-2026-0003','PRD-1003','伺服驱动模块 SD-30','600','410','in_progress','2026-11-20','2026-11-30'),
 ('MO-2026-0004','MO-2026-0004','PRD-1004','机柜钣金壳体 2U','80','0','pending','2026-11-24','2026-11-27')
) AS v(c1,c2,c3,c4,c5,c6,c7,c8,c9)
WHERE NOT EXISTS (SELECT 1 FROM mes.production_orders o WHERE o.order_number = v.c1);

-- 3) 工站（4 个，供工站利用率卡片统计）
INSERT INTO mes.work_stations (station_code, station_name, status, tenant_id)
SELECT v.c1, v.c2, v.c3, '00000000-0000-0000-0000-000000000001'::uuid
FROM (VALUES
 ('WS-01','CNC 加工工位','active'),
 ('WS-02','激光切割工位','active'),
 ('WS-03','机器人焊接工位','available'),
 ('WS-04','总装工位','active')
) AS v(c1,c2,c3)
WHERE NOT EXISTS (SELECT 1 FROM mes.work_stations s WHERE s.station_code = v.c1);

-- 4) 作业工单（3 条，与生产工单的 order_no 对应）
INSERT INTO mes.work_orders (work_order_no, order_no, product_code, product_name, planned_quantity, completed_quantity, status, tenant_id)
SELECT v.c1, v.c2, v.c3, v.c4, v.c5::bigint, v.c6::bigint, v.c7,
       '00000000-0000-0000-0000-000000000001'::uuid
FROM (VALUES
 ('WO-2026-0001','MO-2026-0001','PRD-1001','智能配电柜 800A','240','160','in_progress'),
 ('WO-2026-0002','MO-2026-0003','PRD-1003','伺服驱动模块 SD-30','600','410','in_progress'),
 ('WO-2026-0003','MO-2026-0002','PRD-1002','工业控制机柜 1200×600','150','150','completed')
) AS v(c1,c2,c3,c4,c5,c6,c7)
WHERE NOT EXISTS (SELECT 1 FROM mes.work_orders w WHERE w.work_order_no = v.c1);

-- 5) 结果核对
select 'mes.equipment' as 表名, count(*) as 行数 from mes.equipment
union all select 'mes.production_orders', count(*) from mes.production_orders
union all select 'mes.work_stations', count(*) from mes.work_stations
union all select 'mes.work_orders', count(*) from mes.work_orders;

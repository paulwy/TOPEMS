-- ============================================================================
-- 演示种子数据：QMS 质检单（检验任务）
-- 用途：/qms/inspection 列表与详情在空库环境下有可浏览、可筛选、可对比的多行数据
--       （来料 6 / 过程 6 / 成品 4，覆盖 completed / pending_audit / pending /
--        in_progress / rejected / cancelled 六种状态，时间跨度约 2 个月）
-- 幂等可重放：按唯一业务键 inspection_no 走 ON CONFLICT DO NOTHING
-- 租户：00000000-0000-0000-0000-000000000001
-- 注意：qms.qa_quality_inspections 启用 RLS 且 FORCE，写入前打开系统开关 app.rls_system
-- 执行：psql -d topems_prod -f database/seeds/seed_demo_qms_inspections.sql
-- ============================================================================

SET app.rls_system = 'on';
SET app.tenant_id = '00000000-0000-0000-0000-000000000001';

INSERT INTO qms.qa_quality_inspections
  (inspection_no, inspection_type, product_name, product_name_en, quantity,
   qualified_quantity, unqualified_quantity, qualification_rate, status, result,
   inspector, assignee, inspected_at, memo, created_by, created_at, updated_at, tenant_id)
VALUES
  ('QC-2026-0901','incoming','冷轧钢板 SPCC 1.2mm','Cold-rolled steel SPCC 1.2mm',500,495,5,99.00,'completed','qualified','陈玉','刘敏', now() - interval '68 days','来料尺寸与硬度抽检，1 件毛刺超标已退供应商','admin', now() - interval '70 days', now() - interval '68 days','00000000-0000-0000-0000-000000000001'),
  ('QC-2026-0902','incoming','铝合金型材 6063-T5','Aluminium profile 6063-T5',320,318,2,99.38,'completed','qualified','陈玉','刘敏', now() - interval '61 days','表面氧化膜厚度符合标准','admin', now() - interval '63 days', now() - interval '61 days','00000000-0000-0000-0000-000000000001'),
  ('QC-2026-0905','incoming','注塑粒子 ABS 757','ABS resin pellets 757',1200,1176,24,98.00,'completed','qualified','陈玉','刘敏', now() - interval '55 days','含水率略高，已烘料后复检通过','admin', now() - interval '57 days', now() - interval '55 days','00000000-0000-0000-0000-000000000001'),
  ('QC-2026-0910','incoming','铜排 T2 3×20','Copper busbar T2 3x20',260,244,16,93.85,'rejected','unqualified','王强','刘敏', now() - interval '50 days','导电率低于图纸要求 3%，整批退回','admin', now() - interval '52 days', now() - interval '50 days','00000000-0000-0000-0000-000000000001'),
  ('QC-2026-0915','process','机加工主轴组件 OP20','Machined spindle assembly OP20',80,79,1,98.75,'completed','qualified','李静','赵磊', now() - interval '44 days','同轴度 0.008mm 在公差内','admin', now() - interval '46 days', now() - interval '44 days','00000000-0000-0000-0000-000000000001'),
  ('QC-2026-0920','process','焊接壳体 W-220','Welded housing W-220',60,57,3,95.00,'pending_audit','qualified','李静','赵磊', now() - interval '38 days','焊缝气孔 3 件已隔离待评审','admin', now() - interval '40 days', now() - interval '38 days','00000000-0000-0000-0000-000000000001'),
  ('QC-2026-0925','process','喷涂面板 P-3A','Painted panel P-3A',240,236,4,98.33,'completed','qualified','李静','赵磊', now() - interval '32 days','色差 ΔE 0.6，附着力 5B','admin', now() - interval '34 days', now() - interval '32 days','00000000-0000-0000-0000-000000000001'),
  ('QC-2026-0930','process','SMT 贴片主板 V2.1','SMT mainboard V2.1',150,148,2,98.67,'pending_audit','qualified','张伟','赵磊', now() - interval '26 days','AOI 报 2 处虚焊，返修后待审批','admin', now() - interval '28 days', now() - interval '26 days','00000000-0000-0000-0000-000000000001'),
  ('QC-2026-1005','final','伺服驱动器 SD-750','Servo drive SD-750',40,40,0,100.00,'completed','qualified','周涛','孙悦', now() - interval '20 days','满载老化 4h 通过，出厂放行','admin', now() - interval '22 days', now() - interval '20 days','00000000-0000-0000-0000-000000000001'),
  ('QC-2026-1010','final','工业网关 GW-300','Industrial gateway GW-300',30,29,1,96.67,'in_progress','pending','周涛','孙悦', now() - interval '14 days','EMC 测试进行中，剩余辐射骚扰项','admin', now() - interval '16 days', now() - interval '12 days','00000000-0000-0000-0000-000000000001'),
  ('QC-2026-1015','final','减速机 RV-40','Reducer RV-40',25,NULL,NULL,NULL,'pending','pending',NULL,'孙悦',NULL,'待排产完工后取样','admin', now() - interval '8 days', now() - interval '8 days','00000000-0000-0000-0000-000000000001'),
  ('QC-2026-1020','final','变频器 VF-90','Inverter VF-90',18,10,NULL,NULL,'in_progress','pending','周涛','孙悦', now() - interval '3 days','已完成 10 台绝缘耐压，余 8 台待测','admin', now() - interval '5 days', now() - interval '2 days','00000000-0000-0000-0000-000000000001'),
  ('QC-2026-1025','incoming','不锈钢管 304 Φ25','Stainless tube 304 D25',600,NULL,NULL,NULL,'pending','pending',NULL,'刘敏',NULL,'到货待检','admin', now() - interval '2 days', now() - interval '2 days','00000000-0000-0000-0000-000000000001'),
  ('QC-2026-1028','process','冲压件 B-118','Stamped part B-118',900,0,0,NULL,'cancelled','pending',NULL,'赵磊',NULL,'工艺变更，本批取消检验','admin', now() - interval '1 days', now() - interval '1 days','00000000-0000-0000-0000-000000000001')
ON CONFLICT (inspection_no) DO NOTHING;

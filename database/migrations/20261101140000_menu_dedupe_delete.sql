-- ============================================================================
-- 批2：同模块重复菜单项收敛 —— 删除冗余入口（保留权威）
--
-- 审计依据（2026-11-01 TOPEMS 全面审计 批2 盘点，逐项核实文件:行号）：
--   1. mes 工单双入口：seed:80 'mes-work-orders'（WorkOrderPage 旧 CRUD 页，
--      2026-09-05 cf737a6bd0） vs seed:85 'mes-work-order'（MesWorkOrderPage
--      新版手写页，2026-10-20 4e2ef7dd4f）→ 同一功能新旧两实现，删旧留新。
--      前端：apps/web/src/modules/mes/config.ts 路由+navItem 已删旧入口，
--      apps/web/src/components/redesign/layout/SideRail.tsx 菜单改指 /mes/work-order。
--   2. scm 合同双入口：seed:453 'scm-contracts'（PurchaseContractPage，基础
--      CRUD schema /scm/contracts） vs seed:457 'scm-purchase-contract'
--      （ScmPurchaseContractPage，purchaseContractWizardSchema 3 步向导+嵌套
--      物料明细子表，Phase 3 WizardBuilder 迁移）→ 同一数据域两形态，删基础版
--      留向导版。前端 config.ts 路由+navItem 已删 scm-contracts。
--
-- 幂等：按 (tenant_id, code) 定位删除，目标不存在时 DELETE 影响 0 行，可重复执行。
-- ============================================================================

DELETE FROM core_menus
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
  AND code IN ('mes-work-orders', 'scm-contracts');

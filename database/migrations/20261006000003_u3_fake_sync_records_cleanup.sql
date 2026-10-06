-- =============================================================================
-- 20261006000003_u3_fake_sync_records_cleanup.sql — U3 残留：假同步脏记录清洗
-- =============================================================================
-- 背景（2026-10-06）:
--   D3 §5.2 手动假同步通道下线（commit 5384cb4c2，lims/ehs 两服务）后，
--   lims/ehs 不再写 qa_*_sync_records；本次同时下线 qms 的 inspection_to_lims /
--   issue_to_ehs 两个同款假同步入口（返回 410，不再 INSERT）。
--   但历史期间（通道启用时）已写入的 status=completed"伪成功"记录仍残留，
--   前端会看到 completed 却从未真实同步——本迁移按假同步 sync_type 幂等清理。
--
-- 判别依据（与 5384cb4c2 下线提交一致的 sync_type 枚举）:
--   lims.qa_lims_sync_records:  record_to_qms / reagent_to_ehs
--   ehs.qa_ehs_sync_records:    hazard_to_qms / accident_to_lims
--   qms.qa_qms_sync_records:    inspection_to_lims / issue_to_ehs
--
-- 设计约束:
--   - DELETE 天然幂等（重复执行删 0 行，无副作用），可安全重放。
--   - 只删假同步 sync_type；未来若出现真实同步记录（事件总线落自有表）不受影响。
--   - 保留 qa_*_sync_records 读路径（列表/详情/重试/删除）与历史记录浏览。
--   - public.qa_*_sync_records 影子表属架构清理范畴（同 U3b 模式），另立条目。
-- =============================================================================

DELETE FROM lims.qa_lims_sync_records
 WHERE sync_type IN ('record_to_qms', 'reagent_to_ehs');

DELETE FROM ehs.qa_ehs_sync_records
 WHERE sync_type IN ('hazard_to_qms', 'accident_to_lims');

DELETE FROM qms.qa_qms_sync_records
 WHERE sync_type IN ('inspection_to_lims', 'issue_to_ehs');

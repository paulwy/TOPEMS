-- B224 · integration.mes_erp_sync.sync_status 候选约束（NOT VALID）
--
-- 值集来源：
--   svc/integration/src/mes_erp_sync_status.rs
--     MesErpSyncStatus::DB_VALUES = pending / synced / failed（默认 pending）
--   与前端 apps/web/src/schemas/integration/mesErp.tsx 的
--   MES_ERP_STATUS_CONFIG（synced / pending / failed）一致。
--
-- 历史别名：success / succeeded / completed → synced（仅读取侧兼容，
-- 新写入统一落 synced）。
--
-- 本地 topems 已应用（0 行存量；bogus 被拒，synced 正常写入回滚）。
-- 无迁移，已登记 prod-only 待回迁清单（total 391→392）。

ALTER TABLE integration.mes_erp_sync
  ADD CONSTRAINT ck_mes_erp_sync_sync_status_standard
  CHECK (sync_status IN ('pending', 'synced', 'failed'))
  NOT VALID;

-- 回滚：
-- ALTER TABLE integration.mes_erp_sync DROP CONSTRAINT IF EXISTS ck_mes_erp_sync_sync_status_standard;

-- RLS 受限用户 topems_app 权限补全（幂等）
-- 用途：5433 容器库重建后执行本脚本，确保 topems_app 具备全库读写权限
-- 但受 RLS 策略约束（service 豁免 nil / 用户租户隔离）
GRANT SELECT, INSERT, UPDATE, DELETE ON
    plugin_erp.assets,
    plugin_finance.accounting_subjects,
    plugin_finance.difference_adjustments,
    plugin_finance.reconciliation_item_snapshots,
    plugin_finance.reconciliation_settlement_links,
    plugin_finance.reconciliation_snapshots,
    plugin_finance.settlement_snapshots,
    plugin_finance.source_amount_snapshots,
    plugin_hrm.attendance_records,
    plugin_hrm.positions,
    plugin_wms.purchase_order_snapshots,
    unified_core.documents
TO topems_app;

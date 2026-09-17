-- ============================================================================
-- 同名多 schema 冗余副本清理（2026-09-17）
-- 依据 docs/architecture/duplicate-table-convergence.md（B 类：core_* public 平台层权威）
-- 清理对象（均经核实：空表 0 行 + 无代码引用 或 与 public 权威数据一致）：
--   doc_service.core_doc_*            （0 行，doc 由 unified-core 管理走 public）
--   master_data.core_master_data_*    （0 行，master_data 嵌入强制 public 为权威）
--   communication.core_*              （0 行，communication 改 public 优先后走 public）
--   public.core_ticket_*              （0 行，ticket 代码 17 处显式 ticket.core_* 为权威）
--   portal.core_faqs/core_guides/...  （与 public 权威 12 行数据一致，diff=0）
-- 幂等：DROP TABLE IF EXISTS，可重放。
-- ============================================================================

DROP TABLE IF EXISTS doc_service.core_doc_documents;
DROP TABLE IF EXISTS doc_service.core_doc_folders;
DROP TABLE IF EXISTS doc_service.core_doc_templates;

DROP TABLE IF EXISTS master_data.core_master_data_change_log;
DROP TABLE IF EXISTS master_data.core_master_data_event_outbox;
DROP TABLE IF EXISTS master_data.core_master_data_refs;
DROP TABLE IF EXISTS master_data.core_mdm_approvals;
DROP TABLE IF EXISTS master_data.core_mdm_reconciliation_log;

DROP TABLE IF EXISTS communication.core_emails;
DROP TABLE IF EXISTS communication.core_notification_templates;
DROP TABLE IF EXISTS communication.core_notifications;

DROP TABLE IF EXISTS public.core_ticket_activities;
DROP TABLE IF EXISTS public.core_ticket_comments;
DROP TABLE IF EXISTS public.core_ticket_sla_escalations;
DROP TABLE IF EXISTS public.core_ticket_sla_policies;
DROP TABLE IF EXISTS public.core_tickets;

DROP TABLE IF EXISTS portal.core_guide_progress;
DROP TABLE IF EXISTS portal.core_guide_lessons;
DROP TABLE IF EXISTS portal.core_guides;
DROP TABLE IF EXISTS portal.core_faqs;

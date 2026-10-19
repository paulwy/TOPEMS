-- 2026-10-19: communication.core_notification_templates 缺 tenant_id 列
-- 修复: create_template INSERT 引用 tenant_id 导致创建模板 500（页面 TemplatesPage 创建功能不可用）
ALTER TABLE "communication"."core_notification_templates" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;

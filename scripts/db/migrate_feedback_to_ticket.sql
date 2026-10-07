-- ============================================================================
-- Feedback → Ticket 数据迁移脚本
-- ============================================================================
-- 版本: V2026.08
-- 说明: 将 core_feedbacks 表数据迁移到 core_tickets 表（ticket_type='customer_feedback'）
--       feedback.response 同时迁移到 core_ticket_comments 作为公开评论
-- 执行方式: psql -d <database> -f migrate_feedback_to_ticket.sql
-- 回滚方式: 执行本文件末尾的 ROLLBACK 段，或直接删除 source_service='feedback' 的 ticket
-- ============================================================================

-- ============================================================================
-- 阶段 0: 前置检查
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'core_feedbacks' AND table_schema = 'public'
    ) THEN
        RAISE NOTICE '[迁移] core_feedbacks 表不存在，跳过迁移';
        RETURN;
    END IF;

    IF EXISTS (
        SELECT 1 FROM core_tickets WHERE source_service = 'feedback' LIMIT 1
    ) THEN
        RAISE NOTICE '[迁移] 检测到已迁移数据，将执行增量迁移（仅迁移未迁移记录）';
    ELSE
        RAISE NOTICE '[迁移] 首次迁移，将迁移所有 feedback 数据';
    END IF;
END $$;

-- ============================================================================
-- 阶段 1: 迁移 feedback → core_tickets
-- ============================================================================

INSERT INTO core_tickets (
    id, ticket_no, tenant_id, title, description, ticket_type, severity,
    status, source_service, source_business_id, assignee_id, reporter_id,
    resolved_at, closed_at, created_at, updated_at, tags, metadata
)
SELECT
    f.id,
    'FB' || LPAD((('x' || substr(f.id::text, 1, 8))::bit(32)::bigint % 1000000)::text, 6, '0') AS ticket_no,
    gen_random_uuid() AS tenant_id,
    f.title,
    f.description,
    'customer_feedback' AS ticket_type,
    CASE
        WHEN f.satisfaction >= 4 THEN 'low'
        WHEN f.satisfaction = 3 THEN 'medium'
        WHEN f.satisfaction <= 2 THEN 'high'
        ELSE 'medium'
    END AS severity,
    CASE f.status
        WHEN 'pending' THEN 'open'
        WHEN 'resolved' THEN 'resolved'
        WHEN 'closed' THEN 'closed'
        WHEN 'in_progress' THEN 'in_progress'
        WHEN 'open' THEN 'open'
        ELSE 'open'
    END AS status,
    'feedback' AS source_service,
    f.id::text AS source_business_id,
    CASE
        WHEN f.responded_by ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN f.responded_by::uuid
        ELSE NULL
    END AS assignee_id,
    CASE
        WHEN f.user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN f.user_id::uuid
        ELSE NULL
    END AS reporter_id,
    f.responded_at AS resolved_at,
    CASE WHEN f.status = 'closed' THEN f.updated_at ELSE NULL END AS closed_at,
    f.created_at,
    f.updated_at,
    CASE WHEN f.type IS NOT NULL AND f.type != '' THEN ARRAY[f.type] ELSE NULL END AS tags,
    jsonb_build_object(
        'type', f.type,
        'screenshots', COALESCE(f.screenshots, ARRAY[]::text[]),
        'satisfaction', f.satisfaction,
        'response', COALESCE(f.response, ''),
        'responded_by', f.responded_by,
        'original_table', 'core_feedbacks',
        'migrated_at', NOW()
    ) AS metadata
FROM core_feedbacks f
WHERE f.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM core_tickets t
      WHERE t.source_service = 'feedback'
        AND t.source_business_id = f.id::text
  );

DO $$
DECLARE
    migrated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO migrated_count
    FROM core_tickets
    WHERE source_service = 'feedback';
    RAISE NOTICE '[迁移] 阶段1完成: core_tickets 中共有 % 条 feedback 来源记录', migrated_count;
END $$;

-- ============================================================================
-- 阶段 2: 迁移 feedback.response → core_ticket_comments
-- ============================================================================

INSERT INTO core_ticket_comments (
    id, ticket_id, tenant_id, user_id, user_name, content, is_internal, created_at
)
SELECT
    gen_random_uuid() AS id,
    t.id AS ticket_id,
    t.tenant_id,
    COALESCE(t.assignee_id, gen_random_uuid()) AS user_id,
    t.metadata->>'responded_by' AS user_name,
    t.metadata->>'response' AS content,
    false AS is_internal,
    COALESCE(t.resolved_at, t.updated_at) AS created_at
FROM core_tickets t
WHERE t.source_service = 'feedback'
  AND t.metadata->>'response' IS NOT NULL
  AND t.metadata->>'response' != ''
  AND NOT EXISTS (
      SELECT 1 FROM core_ticket_comments c
      WHERE c.ticket_id = t.id
        AND c.content = t.metadata->>'response'
  );

DO $$
DECLARE
    comment_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO comment_count
    FROM core_ticket_comments c
    JOIN core_tickets t ON c.ticket_id = t.id
    WHERE t.source_service = 'feedback';
    RAISE NOTICE '[迁移] 阶段2完成: 共迁移 % 条 feedback 响应评论', comment_count;
END $$;

-- ============================================================================
-- 阶段 3: 迁移验证
-- ============================================================================

DO $$
DECLARE
    feedback_total INTEGER;
    feedback_active INTEGER;
    ticket_total INTEGER;
    comment_total INTEGER;
    missing_tickets INTEGER;
BEGIN
    SELECT COUNT(*) INTO feedback_total FROM core_feedbacks;
    SELECT COUNT(*) INTO feedback_active FROM core_feedbacks WHERE deleted_at IS NULL;

    SELECT COUNT(*) INTO ticket_total
    FROM core_tickets WHERE source_service = 'feedback';

    SELECT COUNT(*) INTO comment_total
    FROM core_ticket_comments c
    JOIN core_tickets t ON c.ticket_id = t.id
    WHERE t.source_service = 'feedback';

    SELECT COUNT(*) INTO missing_tickets
    FROM core_feedbacks f
    WHERE f.deleted_at IS NULL
      AND NOT EXISTS (
          SELECT 1 FROM core_tickets t
          WHERE t.source_service = 'feedback'
            AND t.source_business_id = f.id::text
      );

    RAISE NOTICE '========================================';
    RAISE NOTICE '[迁移验证] Feedback 表统计:';
    RAISE NOTICE '  总记录数: %', feedback_total;
    RAISE NOTICE '  有效记录数(未删除): %', feedback_active;
    RAISE NOTICE '[迁移验证] Ticket 表统计:';
    RAISE NOTICE '  已迁移 ticket 数: %', ticket_total;
    RAISE NOTICE '  已迁移评论数: %', comment_total;
    RAISE NOTICE '  未迁移记录数: %', missing_tickets;
    RAISE NOTICE '========================================';

    IF missing_tickets > 0 THEN
        RAISE WARNING '[迁移验证] 有 % 条 feedback 记录未迁移，请检查!', missing_tickets;
    ELSE
        RAISE NOTICE '[迁移验证] 所有有效 feedback 记录已成功迁移';
    END IF;
END $$;

-- ============================================================================
-- 阶段 4: （可选）备份并停用 feedback 表
-- ============================================================================
-- 警告: 执行以下操作前请确认迁移验证通过！
-- 取消注释以执行:
--
-- CREATE TABLE IF NOT EXISTS core_feedbacks_backup_202608 AS
-- SELECT * FROM core_feedbacks;
--
-- ALTER TABLE core_feedbacks RENAME TO core_feedbacks_archived_202608;

-- ============================================================================
-- 回滚方案 (ROLLBACK)
-- ============================================================================
-- 如需回滚，执行以下语句:
--
-- DELETE FROM core_ticket_comments
-- WHERE ticket_id IN (SELECT id FROM core_tickets WHERE source_service = 'feedback');
--
-- DELETE FROM core_tickets WHERE source_service = 'feedback';
--
-- ALTER TABLE core_feedbacks_archived_202608 RENAME TO core_feedbacks;
-- ============================================================================

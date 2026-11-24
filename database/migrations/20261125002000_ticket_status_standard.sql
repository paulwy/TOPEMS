-- B271: ticket.core_tickets 状态值域回迁
-- 代码唯一值源：svc/ticket/src/models.rs 的 TicketStatus（open/in_progress/pending/resolved/closed/cancelled）。
-- 批量更新入口此前可绕过单条更新的状态机校验；本批同时补 DB CHECK，保证 raw SQL 也不能写入域外值。

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint con
        JOIN pg_class c ON c.oid = con.conrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'ticket'
          AND c.relname = 'core_tickets'
          AND con.conname = 'ck_core_tickets_status_standard'
    ) THEN
        ALTER TABLE ticket.core_tickets
            ADD CONSTRAINT ck_core_tickets_status_standard
            CHECK (status IN ('open', 'in_progress', 'pending', 'resolved', 'closed', 'cancelled'))
            NOT VALID;
    END IF;
END $$;

COMMENT ON COLUMN ticket.core_tickets.status IS
    '状态：open, in_progress, pending, resolved, closed, cancelled';

-- B271 rollback: 移除 ticket.core_tickets 状态值域约束
ALTER TABLE ticket.core_tickets
    DROP CONSTRAINT IF EXISTS ck_core_tickets_status_standard;

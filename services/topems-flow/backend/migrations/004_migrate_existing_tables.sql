DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'flow' AND table_name = 'approvals' AND column_name = 'node_id') THEN
        ALTER TABLE flow.approvals ADD COLUMN node_id VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'flow' AND table_name = 'approvals' AND column_name = 'approval_type') THEN
        ALTER TABLE flow.approvals ADD COLUMN approval_type VARCHAR(50);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'flow' AND table_name = 'approvals' AND column_name = 'timeout_at') THEN
        ALTER TABLE flow.approvals ADD COLUMN timeout_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'flow' AND table_name = 'approval_records') THEN
        CREATE TABLE flow.approval_records (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            approval_id UUID REFERENCES flow.approvals(id) NOT NULL,
            action VARCHAR(50) NOT NULL,
            actor_id UUID NOT NULL,
            actor_name VARCHAR(255),
            comment TEXT,
            previous_status VARCHAR(50),
            new_status VARCHAR(50),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX idx_approval_records_approval_id ON flow.approval_records(approval_id);
        CREATE INDEX idx_approval_records_actor_id ON flow.approval_records(actor_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'flow' AND table_name = 'notifications') THEN
        CREATE TABLE flow.notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID,
            title VARCHAR(255) NOT NULL,
            content TEXT NOT NULL,
            notification_type VARCHAR(50) NOT NULL,
            workflow_instance_id UUID REFERENCES flow.workflow_instances(id) ON DELETE CASCADE,
            approval_id UUID REFERENCES flow.approvals(id) ON DELETE CASCADE,
            is_read BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX idx_notifications_user_id ON flow.notifications(user_id);
        CREATE INDEX idx_notifications_is_read ON flow.notifications(is_read);
        CREATE INDEX idx_notifications_created_at ON flow.notifications(created_at);
    END IF;
END $$;

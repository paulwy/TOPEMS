CREATE TABLE IF NOT EXISTS flow.notifications (
    id UUID PRIMARY KEY,
    user_id UUID,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    workflow_instance_id UUID,
    approval_id UUID,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workflow_instance_id) REFERENCES flow.workflow_instances(id) ON DELETE CASCADE,
    FOREIGN KEY (approval_id) REFERENCES flow.approvals(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON flow.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON flow.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON flow.notifications(created_at);

CREATE TABLE IF NOT EXISTS report_subscriptions (
    id UUID PRIMARY KEY,
    template_id UUID NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    frequency VARCHAR(20) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_subscriptions_template_id ON report_subscriptions(template_id);
CREATE INDEX IF NOT EXISTS idx_report_subscriptions_user_id ON report_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_report_subscriptions_enabled ON report_subscriptions(enabled);
CREATE INDEX IF NOT EXISTS idx_report_subscriptions_created_at ON report_subscriptions(created_at);

ALTER TABLE report_subscriptions 
    ADD CONSTRAINT fk_report_subscriptions_template 
    FOREIGN KEY (template_id) REFERENCES report_templates(id);

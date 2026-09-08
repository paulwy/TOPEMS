// P4-1: 统一 AuditLog 结构体到 shared-db
#[allow(unused_imports)]
pub use topems_shared_db::audit::{AuditLog, AuditLogQuery, CreateAuditLogRequest};

/// 记录审批事件到 wms_approval_events 表
pub async fn log_approval_event(
    pool: &mut sqlx::PgConnection,
    tenant_id: &str,
    entity_type: &str,
    entity_id: &str,
    action: &str,
    operator: &str,
    status_from: &str,
    status_to: &str,
    comment: Option<&str>,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS wms.wms_approval_events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            entity_type VARCHAR(32) NOT NULL,
            entity_id UUID NOT NULL,
            action VARCHAR(32) NOT NULL,
            operator VARCHAR(64),
            status_from VARCHAR(32),
            status_to VARCHAR(32),
            comment TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )"#,
    )
    .execute(&mut *pool)
    .await?;

    sqlx::query(
        r#"INSERT INTO wms.wms_approval_events (tenant_id, entity_type, entity_id, action, operator, status_from, status_to, comment)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"#,
    )
    .bind(tenant_id)
    .bind(entity_type)
    .bind(entity_id)
    .bind(action)
    .bind(operator)
    .bind(status_from)
    .bind(status_to)
    .bind(comment)
    .execute(&mut *pool)
    .await?;
    Ok(())
}

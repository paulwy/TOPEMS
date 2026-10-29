// P4-1: 统一 AuditLog 结构体到 shared-db
#[allow(unused_imports)]
pub use topems_shared_db::audit::{AuditLog, AuditLogQuery, CreateAuditLogRequest};

/// 记录审批事件到 wms_approval_events 表（表结构由迁移链权威创建，C-1 已移除自建 DDL）
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

//! 审计日志模型 — 统一使用 shared-bootstrap 通用实现
//!
//! 详见 [topems_shared_bootstrap::audit] 模块

#[allow(unused_imports)]
pub use topems_shared_bootstrap::audit::{AuditEventParams, AuditLog, ListAuditLogsQuery};

/// 记录审批事件到 qa_approval_events 表
///
/// 该表在首次调用时自动创建，用于统一跟踪 4 类审批工作流
/// (inspection/issue/eight_d/apqp) 的状态流转。
pub async fn log_approval_event(
    pool: &sqlx::PgPool,
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
        r#"CREATE TABLE IF NOT EXISTS qa_approval_events (
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
    .execute(pool)
    .await?;

    sqlx::query(
        r#"INSERT INTO qa_approval_events (tenant_id, entity_type, entity_id, action, operator, status_from, status_to, comment)
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
    .execute(pool)
    .await?;
    Ok(())
}

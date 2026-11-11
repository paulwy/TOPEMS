//! 审计日志模型 — 统一使用 shared-bootstrap 通用实现
//!
//! 详见 [topems_shared_bootstrap::audit] 模块

#[allow(unused_imports)]
pub use topems_shared_bootstrap::audit::{AuditEventParams, AuditLog, ListAuditLogsQuery};

/// 记录审批事件到 qa_approval_events 表
///
/// 表结构由迁移链权威创建（C-1：运行时自建表已移除）。
///
/// W-B6a：改为接收任意 `Executor`，写路由可传入自身事务作用域（`&mut ScopedTxn`），
/// 使 `qa_approval_events` 与主表更新同事务提交/回滚，禁止"主表 200、事件缺失"。
pub async fn log_approval_event<'e, E>(
    executor: E,
    tenant_id: &str,
    entity_type: &str,
    entity_id: &str,
    action: &str,
    operator: &str,
    status_from: &str,
    status_to: &str,
    comment: Option<&str>,
) -> Result<(), sqlx::Error>
where
    E: sqlx::Executor<'e, Database = sqlx::Postgres>,
{
    sqlx::query(
        r#"INSERT INTO qa_approval_events (tenant_id, entity_type, entity_id, action, operator, status_from, status_to, comment)
           VALUES ($1::uuid, $2, $3::uuid, $4, $5, $6, $7, $8)"#,
    )
    .bind(tenant_id)
    .bind(entity_type)
    .bind(entity_id)
    .bind(action)
    .bind(operator)
    .bind(status_from)
    .bind(status_to)
    .bind(comment)
    .execute(executor)
    .await?;
    Ok(())
}

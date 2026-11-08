use topems_shared_core::error::TopemsError;
use uuid::Uuid;

/// 解析租户的记账主体（公司）。
///
/// 记账数据必须归属确定公司：单主体租户直接返回唯一公司；无公司或多公司
/// 一律 fail-closed（不猜测、不随机取第一条），由调用方报错或要求显式指定。
pub(crate) async fn resolve_tenant_company<'e, E>(
    executor: E,
    tenant_id: Uuid,
) -> Result<Uuid, TopemsError>
where
    E: sqlx::Executor<'e, Database = sqlx::Postgres>,
{
    let ids: Vec<(Uuid,)> = sqlx::query_as(
        "SELECT id FROM hrm.companies WHERE tenant_id = $1 AND deleted_at IS NULL ORDER BY created_at ASC, id ASC LIMIT 2",
    )
    .bind(tenant_id)
    .fetch_all(executor)
    .await
    .map_err(|e| TopemsError::DatabaseQuery(format!("解析租户公司主体失败: {e}")))?;

    match ids.as_slice() {
        [(id,)] => Ok(*id),
        [] => Err(TopemsError::ValidationFailed(format!(
            "租户 {tenant_id} 无公司主体，无法生成凭证"
        ))),
        _ => Err(TopemsError::ValidationFailed(format!(
            "租户 {tenant_id} 存在多个公司主体，凭证缺少公司归属，拒绝生成"
        ))),
    }
}

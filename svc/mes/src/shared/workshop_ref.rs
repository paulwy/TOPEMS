//! 车间引用的同租户校验（B354）。
//!
//! MES 里多个表以 `workshop_id` 指向 `mes.workshops`（产线、工位、生产工单）。
//! 单列外键不参与租户校验，会把「本租户的记录挂到别租户的车间」放进来：
//! 这类行在 RLS 下 join 车间必然取不到，前端表现为车间丢失，数据不可自证。
//! DB 侧由 `(workshop_id, tenant_id) → workshops(id, tenant_id)` 复合外键兜底
//! （产线 20261127150000、工位/工单 20261127170000），写路径在这里先给出可读的 400。
use uuid::Uuid;

/// 车间是否存在、属于该租户、且未被软删。
///
/// 调用方拿到 `Ok(false)` 应返回 400「车间不存在或不属于当前租户」，
/// `Err(_)` 视为数据库错误（500）。
pub async fn workshop_exists_in_tenant<'c, E>(
    executor: E,
    workshop_id: Uuid,
    tenant_id: Uuid,
) -> Result<bool, sqlx::Error>
where
    E: sqlx::Executor<'c, Database = sqlx::Postgres>,
{
    sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM mes.workshops \
         WHERE id = $1 AND tenant_id = $2::uuid AND deleted_at IS NULL)",
    )
    .bind(workshop_id)
    .bind(tenant_id)
    .fetch_one(executor)
    .await
}

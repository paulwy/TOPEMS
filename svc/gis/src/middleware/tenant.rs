// middleware/tenant.rs
// 多租户中间件 - 提供租户上下文隔离
#![allow(dead_code)] // serde/utoipa 序列化需要，运行期未直接引用

use axum::{extract::FromRequestParts, http::request::Parts, Extension};
use sqlx::PgPool;
use uuid::Uuid;

use topems_shared::ApiResponse;

/// 租户上下文结构
#[derive(Debug, Clone)]
pub struct TenantContext {
    pub tenant_id: Uuid,
    pub user_id: Uuid,
}

/// 请求级别的租户提取器
pub struct TenantRequest {
    pub ctx: TenantContext,
}

impl<S> FromRequestParts<S> for TenantRequest
where
    S: Send + Sync,
{
    type Rejection = ApiResponse<()>;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        // 从 Extension 中获取租户上下文（由 auth_middleware 设置）
        let tenant_ctx = parts
            .extensions
            .get::<TenantContext>()
            .cloned()
            .ok_or_else(|| ApiResponse::error(401, "缺少租户上下文信息"))?;

        Ok(TenantRequest { ctx: tenant_ctx })
    }
}

/// 从请求中获取租户ID (用于数据库查询)
pub fn extract_tenant_id(ctx: &TenantContext) -> Uuid {
    ctx.tenant_id
}

/// 租户数据访问助手 - 自动注入 tenant_id
pub struct TenantDataAccess {
    pool: PgPool,
    tenant_id: Uuid,
}

impl TenantDataAccess {
    pub fn new(pool: PgPool, tenant_id: Uuid) -> Self {
        Self { pool, tenant_id }
    }

    /// 获取当前租户ID
    pub fn tenant_id(&self) -> Uuid {
        self.tenant_id
    }

    /// 设备点位 - 按租户筛选
    pub async fn list_device_locations(
        &self,
    ) -> Result<Vec<crate::models::DeviceLocation>, sqlx::Error> {
        sqlx::query_as::<_, crate::models::DeviceLocation>(
            "id, tenant_id, map_id, device_name, device_code, device_type, position, status, description, last_inspected, created_at, updated_at FROM device_locations WHERE tenant_id = $1 ORDER BY created_at DESC",
        )
        .bind(self.tenant_id)
        .fetch_all(&self.pool)
        .await
    }

    /// 设备点位详情 - 按租户筛选
    pub async fn get_device_location(
        &self,
        id: Uuid,
    ) -> Result<Option<crate::models::DeviceLocation>, sqlx::Error> {
        sqlx::query_as::<_, crate::models::DeviceLocation>(
            "id, tenant_id, map_id, device_name, device_code, device_type, position, status, description, last_inspected, created_at, updated_at FROM device_locations WHERE id = $1 AND tenant_id = $2",
        )
        .bind(id)
        .bind(self.tenant_id)
        .fetch_optional(&self.pool)
        .await
    }

    /// 创建设备点位 - 自动注入 tenant_id
    #[allow(clippy::too_many_arguments)]
    pub async fn create_device_location(
        &self,
        map_id: Uuid,
        device_name: String,
        device_code: String,
        device_type: Option<String>,
        position: serde_json::Value,
        status: String,
        description: Option<String>,
    ) -> Result<crate::models::DeviceLocation, sqlx::Error> {
        sqlx::query_as::<_, crate::models::DeviceLocation>(
            r#"
            INSERT INTO device_locations (tenant_id, map_id, device_name, device_code, device_type, position, status, description)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
            "#,
        )
        .bind(self.tenant_id)
        .bind(map_id)
        .bind(device_name)
        .bind(device_code)
        .bind(device_type)
        .bind(position)
        .bind(status)
        .bind(description)
        .fetch_one(&self.pool)
        .await
    }

    /// 仓储位置 - 按租户筛选
    pub async fn list_warehouse_locations(
        &self,
    ) -> Result<Vec<crate::models::WarehouseLocation>, sqlx::Error> {
        sqlx::query_as::<_, crate::models::WarehouseLocation>(
            "id, tenant_id, map_id, warehouse_name, zone, position, capacity, usage_rate, status, created_at, updated_at FROM warehouse_locations WHERE tenant_id = $1 ORDER BY created_at DESC",
        )
        .bind(self.tenant_id)
        .fetch_all(&self.pool)
        .await
    }

    /// 管道 - 按租户筛选
    pub async fn list_pipelines(&self) -> Result<Vec<crate::models::Pipeline>, sqlx::Error> {
        sqlx::query_as::<_, crate::models::Pipeline>(
            "id, tenant_id, map_id, name, code, pipeline_type, path, properties, status, created_at, updated_at FROM pipelines WHERE tenant_id = $1 ORDER BY created_at DESC",
        )
        .bind(self.tenant_id)
        .fetch_all(&self.pool)
        .await
    }

    /// 取证记录 - 按租户筛选
    pub async fn list_evidence_records(
        &self,
    ) -> Result<Vec<crate::models::EvidenceRecord>, sqlx::Error> {
        sqlx::query_as::<_, crate::models::EvidenceRecord>(
            "id, tenant_id, title, evidence_type, position, file_url, thumbnail_url, duration, file_size, file_hash, recorded_by, recorded_at, tags, description, metadata, created_at, updated_at FROM evidence_records WHERE tenant_id = $1 ORDER BY recorded_at DESC",
        )
        .bind(self.tenant_id)
        .fetch_all(&self.pool)
        .await
    }

    /// 轨迹记录 - 按租户筛选
    pub async fn list_track_records(&self) -> Result<Vec<crate::models::TrackRecord>, sqlx::Error> {
        sqlx::query_as::<_, crate::models::TrackRecord>(
            "id, tenant_id, device_id, device_name, start_time, end_time, total_distance, created_at FROM track_records WHERE tenant_id = $1 ORDER BY start_time DESC",
        )
        .bind(self.tenant_id)
        .fetch_all(&self.pool)
        .await
    }

    /// 设备轨迹 - 按租户和设备ID筛选
    pub async fn get_device_track(
        &self,
        device_id: Uuid,
    ) -> Result<Vec<crate::models::TrackPosition>, sqlx::Error> {
        sqlx::query_as::<_, crate::models::TrackPosition>(
            r#"
            SELECT trp.* FROM track_positions trp
            INNER JOIN track_records tr ON trp.track_id = tr.id
            WHERE tr.device_id = $1 AND tr.tenant_id = $2
            ORDER BY trp.timestamp ASC
            "#,
        )
        .bind(device_id)
        .bind(self.tenant_id)
        .fetch_all(&self.pool)
        .await
    }
}

/// 创建带租户上下文的 Extension
impl TenantContext {
    pub fn into_extension(self) -> Extension<Self> {
        Extension(self)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tenant_context_creation() {
        let tenant_id = Uuid::new_v4();
        let user_id = Uuid::new_v4();
        let ctx = TenantContext { tenant_id, user_id };
        assert_eq!(ctx.tenant_id, tenant_id);
        assert_eq!(ctx.user_id, user_id);
    }
}

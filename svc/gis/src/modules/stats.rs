use axum::{
    extract::{Extension, State},
    Router,
};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use topems_shared_auth::auth::Claims;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::{response::ApiResponse, TopemsError};
use topems_shared_db::scope::Db;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GisStatistics {
    pub device_points: i64,
    pub pipelines: i64,
    pub storage_locations: i64,
    pub evidence_records: i64,
    pub business_locations: i64,
    pub factory_maps: i64,
    pub map_markers: i64,
    pub location_photos: i64,
    pub active_devices: i64,
    pub active_pipelines: i64,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["gis:read"])),
    path = "/statistics",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "stats"
)]
pub async fn get_statistics(
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<GisStatistics> {
    // 只读作用域：10 条统计查询共用同一事务（SET LOCAL search_path=gis, public）。
    let mut scope = match db.scope_read().await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };

    let device_points: i64 = sqlx::query(only_own_schema_query!(
        "gis",
        "SELECT COUNT(*) FROM gis.device_locations WHERE ($1::uuid IS NULL OR tenant_id = $1)"
    ))
    .bind(tenant_opt)
    .fetch_one(&mut scope)
    .await
    .map(|row| row.get::<i64, _>(0))
    .unwrap_or(0);

    let pipelines: i64 = sqlx::query(only_own_schema_query!(
        "gis",
        "SELECT COUNT(*) FROM gis.pipelines WHERE ($1::uuid IS NULL OR tenant_id = $1)"
    ))
    .bind(tenant_opt)
    .fetch_one(&mut scope)
    .await
    .map(|row| row.get::<i64, _>(0))
    .unwrap_or(0);

    let storage_locations: i64 = sqlx::query(only_own_schema_query!(
        "gis",
        "SELECT COUNT(*) FROM gis.warehouse_locations WHERE ($1::uuid IS NULL OR tenant_id = $1)"
    ))
    .bind(tenant_opt)
    .fetch_one(&mut scope)
    .await
    .map(|row| row.get::<i64, _>(0))
    .unwrap_or(0);

    let evidence_records: i64 = sqlx::query(only_own_schema_query!(
        "gis",
        "SELECT COUNT(*) FROM gis.evidence_records WHERE ($1::uuid IS NULL OR tenant_id = $1)"
    ))
    .bind(tenant_opt)
    .fetch_one(&mut scope)
    .await
    .map(|row| row.get::<i64, _>(0))
    .unwrap_or(0);

    let business_locations: i64 = sqlx::query(only_own_schema_query!(
        "gis",
        "SELECT COUNT(*) FROM gis.business_locations WHERE ($1::uuid IS NULL OR tenant_id = $1)"
    ))
    .bind(tenant_opt)
    .fetch_one(&mut scope)
    .await
    .map(|row| row.get::<i64, _>(0))
    .unwrap_or(0);

    let factory_maps: i64 = sqlx::query(only_own_schema_query!(
        "gis",
        "SELECT COUNT(*) FROM gis.factory_maps WHERE ($1::uuid IS NULL OR tenant_id = $1)"
    ))
    .bind(tenant_opt)
    .fetch_one(&mut scope)
    .await
    .map(|row| row.get::<i64, _>(0))
    .unwrap_or(0);

    let map_markers: i64 = sqlx::query(only_own_schema_query!(
        "gis",
        "SELECT COUNT(*) FROM gis.map_markers WHERE ($1::uuid IS NULL OR tenant_id = $1)"
    ))
    .bind(tenant_opt)
    .fetch_one(&mut scope)
    .await
    .map(|row| row.get::<i64, _>(0))
    .unwrap_or(0);

    let location_photos: i64 = sqlx::query(only_own_schema_query!(
        "gis",
        "SELECT COUNT(*) FROM gis.location_photos WHERE ($1::uuid IS NULL OR tenant_id = $1)"
    ))
    .bind(tenant_opt)
    .fetch_one(&mut scope)
    .await
    .map(|row| row.get::<i64, _>(0))
    .unwrap_or(0);

    let active_devices: i64 = sqlx::query(only_own_schema_query!(
        "gis",
        "SELECT COUNT(*) FROM gis.device_locations WHERE status = 'active' AND ($1::uuid IS NULL OR tenant_id = $1)"
    ))
    .bind(tenant_opt)
    .fetch_one(&mut scope)
    .await
    .map(|row| row.get::<i64, _>(0))
    .unwrap_or(0);

    let active_pipelines: i64 = sqlx::query(only_own_schema_query!(
        "gis",
        "SELECT COUNT(*) FROM gis.pipelines WHERE status = 'active' AND ($1::uuid IS NULL OR tenant_id = $1)"
    ))
    .bind(tenant_opt)
    .fetch_one(&mut scope)
    .await
    .map(|row| row.get::<i64, _>(0))
    .unwrap_or(0);

    if let Err(e) = scope.commit().await {
        return ApiResponse::from(TopemsError::internal("查询统计失败", e));
    }

    let stats = GisStatistics {
        device_points,
        pipelines,
        storage_locations,
        evidence_records,
        business_locations,
        factory_maps,
        map_markers,
        location_photos,
        active_devices,
        active_pipelines,
    };

    ApiResponse::success(stats, "获取GIS统计数据成功")
}

pub fn create_routes() -> Router<Db> {
    Router::new().route("/statistics", axum::routing::get(get_statistics))
}

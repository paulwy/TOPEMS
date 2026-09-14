use axum::{extract::State, Json, Router};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::ApiResponse;

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

pub async fn get_statistics(State(pool): State<PgPool>) -> Json<ApiResponse<GisStatistics>> {
    let device_points: i64 = sqlx::query(only_own_schema_query!(
        "gis",
        "SELECT COUNT(*) FROM gis.device_locations"
    ))
    .fetch_one(&pool)
    .await
    .map(|row| row.get::<i64, _>(0))
    .unwrap_or(0);

    let pipelines: i64 = sqlx::query(only_own_schema_query!(
        "gis",
        "SELECT COUNT(*) FROM gis.pipelines"
    ))
    .fetch_one(&pool)
    .await
    .map(|row| row.get::<i64, _>(0))
    .unwrap_or(0);

    let storage_locations: i64 = sqlx::query(only_own_schema_query!(
        "gis",
        "SELECT COUNT(*) FROM gis.warehouse_locations"
    ))
    .fetch_one(&pool)
    .await
    .map(|row| row.get::<i64, _>(0))
    .unwrap_or(0);

    let evidence_records: i64 = sqlx::query(only_own_schema_query!(
        "gis",
        "SELECT COUNT(*) FROM gis.evidence_records"
    ))
    .fetch_one(&pool)
    .await
    .map(|row| row.get::<i64, _>(0))
    .unwrap_or(0);

    let business_locations: i64 = sqlx::query(only_own_schema_query!(
        "gis",
        "SELECT COUNT(*) FROM gis.business_locations"
    ))
    .fetch_one(&pool)
    .await
    .map(|row| row.get::<i64, _>(0))
    .unwrap_or(0);

    let factory_maps: i64 = sqlx::query(only_own_schema_query!(
        "gis",
        "SELECT COUNT(*) FROM gis.factory_maps"
    ))
    .fetch_one(&pool)
    .await
    .map(|row| row.get::<i64, _>(0))
    .unwrap_or(0);

    let map_markers: i64 = sqlx::query(only_own_schema_query!(
        "gis",
        "SELECT COUNT(*) FROM gis.map_markers"
    ))
    .fetch_one(&pool)
    .await
    .map(|row| row.get::<i64, _>(0))
    .unwrap_or(0);

    let location_photos: i64 = sqlx::query(only_own_schema_query!(
        "gis",
        "SELECT COUNT(*) FROM gis.location_photos"
    ))
    .fetch_one(&pool)
    .await
    .map(|row| row.get::<i64, _>(0))
    .unwrap_or(0);

    let active_devices: i64 = sqlx::query(only_own_schema_query!(
        "gis",
        "SELECT COUNT(*) FROM gis.device_locations WHERE status = 'active'"
    ))
    .fetch_one(&pool)
    .await
    .map(|row| row.get::<i64, _>(0))
    .unwrap_or(0);

    let active_pipelines: i64 = sqlx::query(only_own_schema_query!(
        "gis",
        "SELECT COUNT(*) FROM gis.pipelines WHERE status = 'active'"
    ))
    .fetch_one(&pool)
    .await
    .map(|row| row.get::<i64, _>(0))
    .unwrap_or(0);

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

    Json(ApiResponse::success(stats, "获取GIS统计数据成功"))
}

pub fn create_routes() -> Router<PgPool> {
    Router::new().route("/statistics", axum::routing::get(get_statistics))
}

use axum::{extract::State, Json, Router};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use topems_shared::ApiResponse;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GisStatistics {
    pub device_points: i64,
    pub pipelines: i64,
    pub warehouses: i64,
    pub business_locations: i64,
    pub factory_maps: i64,
    pub map_markers: i64,
    pub location_photos: i64,
    pub active_devices: i64,
    pub active_pipelines: i64,
}

pub async fn get_statistics(State(pool): State<PgPool>) -> Json<ApiResponse<GisStatistics>> {
    let device_points: i64 = sqlx::query("SELECT COUNT(*) FROM device_locations")
        .fetch_one(&pool)
        .await
        .map(|row| row.get::<i64, _>(0))
        .unwrap_or(0);

    let pipelines: i64 = sqlx::query("SELECT COUNT(*) FROM pipelines")
        .fetch_one(&pool)
        .await
        .map(|row| row.get::<i64, _>(0))
        .unwrap_or(0);

    let warehouses: i64 = sqlx::query("SELECT COUNT(*) FROM warehouse_locations")
        .fetch_one(&pool)
        .await
        .map(|row| row.get::<i64, _>(0))
        .unwrap_or(0);

    let business_locations: i64 = sqlx::query("SELECT COUNT(*) FROM business_locations")
        .fetch_one(&pool)
        .await
        .map(|row| row.get::<i64, _>(0))
        .unwrap_or(0);

    let factory_maps: i64 = sqlx::query("SELECT COUNT(*) FROM factory_maps")
        .fetch_one(&pool)
        .await
        .map(|row| row.get::<i64, _>(0))
        .unwrap_or(0);

    let map_markers: i64 = sqlx::query("SELECT COUNT(*) FROM map_markers")
        .fetch_one(&pool)
        .await
        .map(|row| row.get::<i64, _>(0))
        .unwrap_or(0);

    let location_photos: i64 = sqlx::query("SELECT COUNT(*) FROM location_photos")
        .fetch_one(&pool)
        .await
        .map(|row| row.get::<i64, _>(0))
        .unwrap_or(0);

    let active_devices: i64 =
        sqlx::query("SELECT COUNT(*) FROM device_locations WHERE status = 'active'")
            .fetch_one(&pool)
            .await
            .map(|row| row.get::<i64, _>(0))
            .unwrap_or(0);

    let active_pipelines: i64 =
        sqlx::query("SELECT COUNT(*) FROM pipelines WHERE status = 'active'")
            .fetch_one(&pool)
            .await
            .map(|row| row.get::<i64, _>(0))
            .unwrap_or(0);

    let stats = GisStatistics {
        device_points,
        pipelines,
        warehouses,
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

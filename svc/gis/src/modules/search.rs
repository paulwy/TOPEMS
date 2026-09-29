use crate::models::{BusinessLocation, DeviceLocation, Pipeline, WarehouseLocation};
use axum::{
    extract::{Extension, Query, State},
    Json, Router,
};
use sqlx::PgPool;
use topems_shared_auth::auth::Claims;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::ApiResponse;

#[utoipa::path(
    get,
    security(("BearerAuth" = ["gis:read"])),
    path = "/search",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "search"
)]
pub async fn search_locations(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };

    let query = params.get("q").cloned().unwrap_or_default();
    let location_type = params.get("type").cloned();

    let mut results: Vec<serde_json::Value> = Vec::new();
    let search_pattern = format!("%{}%", query);

    if location_type.is_none() || location_type.as_deref() == Some("device") {
        if let Ok(devices) = sqlx::query_as::<_, DeviceLocation>(
            only_own_schema_query!("gis", "SELECT id, tenant_id, map_id, device_name, device_code, device_type, position, status, description, last_inspected, created_at, updated_at FROM gis.device_locations WHERE (device_name ILIKE $1 OR device_code ILIKE $1) AND ($2::uuid IS NULL OR tenant_id = $2)"),
        )
        .bind(&search_pattern)
        .bind(tenant_opt)
        .fetch_all(&pool)
        .await
        {
            for device in devices {
                results.push(serde_json::json!({
                    "type": "device",
                    "id": device.id,
                    "name": device.device_name,
                    "code": device.device_code,
                    "position": device.position,
                    "status": device.status
                }));
            }
        }
    }

    if location_type.is_none() || location_type.as_deref() == Some("pipeline") {
        if let Ok(pipelines) = sqlx::query_as::<_, Pipeline>(
            only_own_schema_query!("gis", "SELECT id, tenant_id, map_id, name, code, pipeline_type, path, properties, status, created_at, updated_at FROM gis.pipelines WHERE (name ILIKE $1 OR code ILIKE $1) AND ($2::uuid IS NULL OR tenant_id = $2)"),
        )
        .bind(&search_pattern)
        .bind(tenant_opt)
        .fetch_all(&pool)
        .await
        {
            for pipeline in pipelines {
                results.push(serde_json::json!({
                    "type": "pipeline",
                    "id": pipeline.id,
                    "name": pipeline.name,
                    "code": pipeline.code,
                    "path": pipeline.path,
                    "status": pipeline.status
                }));
            }
        }
    }

    if location_type.is_none() || location_type.as_deref() == Some("warehouse") {
        if let Ok(warehouses) = sqlx::query_as::<_, WarehouseLocation>(
            only_own_schema_query!("gis", "SELECT id, tenant_id, map_id, warehouse_name, zone, position, capacity, usage_rate::float8 AS usage_rate, status, created_at, updated_at FROM gis.warehouse_locations WHERE warehouse_name ILIKE $1 AND ($2::uuid IS NULL OR tenant_id = $2)"),
        )
        .bind(&search_pattern)
        .bind(tenant_opt)
        .fetch_all(&pool)
        .await
        {
            for warehouse in warehouses {
                results.push(serde_json::json!({
                    "type": "warehouse",
                    "id": warehouse.id,
                    "name": warehouse.warehouse_name,
                    "position": warehouse.position,
                    "status": warehouse.status
                }));
            }
        }
    }

    if location_type.is_none() || location_type.as_deref() == Some("business") {
        if let Ok(locations) = sqlx::query_as::<_, BusinessLocation>(
            only_own_schema_query!("gis", "SELECT id, tenant_id, business_type, business_name, business_code, category, position, address, contact_person, contact_phone, capacity, current_usage, status, properties, description, external_id, external_type, created_at, updated_at FROM gis.business_locations WHERE (business_name ILIKE $1 OR business_code ILIKE $1) AND ($2::uuid IS NULL OR tenant_id = $2)"),
        )
        .bind(&search_pattern)
        .bind(tenant_opt)
        .fetch_all(&pool)
        .await
        {
            for location in locations {
                results.push(serde_json::json!({
                    "type": "business",
                    "id": location.id,
                    "name": location.business_name,
                    "code": location.business_code,
                    "position": location.position,
                    "business_type": location.business_type,
                    "status": location.status
                }));
            }
        }
    }

    Json(ApiResponse::success(
        serde_json::json!({
            "results": results,
            "total": results.len(),
            "query": query
        }),
        "搜索完成",
    ))
}

pub fn create_routes() -> Router<PgPool> {
    Router::new().route("/search", axum::routing::get(search_locations))
}

use crate::models::Location;
use crate::shared::permission::{check_permission, GisPermission};
use axum::{
    extract::{Extension, Path, State},
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use topems_shared_auth::auth::Claims;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::{response::ApiResponse, TopemsError};
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateLocation {
    pub name: String,
    pub code: Option<String>,
    pub location_type: String,
    pub position: serde_json::Value,
    pub address: Option<String>,
    pub description: Option<String>,
    pub properties: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateLocation {
    pub name: String,
    pub location_type: String,
    pub position: serde_json::Value,
    pub address: Option<String>,
    pub description: Option<String>,
    pub properties: Option<serde_json::Value>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchLocation {
    pub query: String,
    pub location_type: Option<String>,
    pub bounds: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NearbyRequest {
    pub position: serde_json::Value,
    pub radius: f64,
    pub location_type: Option<String>,
    pub limit: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RouteRequest {
    pub start: serde_json::Value,
    pub end: serde_json::Value,
    pub waypoints: Option<Vec<serde_json::Value>>,
    pub mode: Option<String>,
}

/// 创建位置点
#[utoipa::path(
    post,
    security(("BearerAuth" = ["gis:map:write"])),
    path = "/locations/create",
    tag = "device",
    request_body = CreateLocation,
    responses(
        (status = 200, description = "创建位置成功", body = serde_json::Value),
        (status = 500, description = "创建位置失败")
    )
)]
pub async fn create_location(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<CreateLocation>,
) -> Json<ApiResponse<Location>> {
    if let Err(e) = check_permission(&pool, &claims, &GisPermission::DeviceLocationWrite).await {
        return e;
    }

    match sqlx::query_as::<_, Location>(
        only_own_schema_query!("gis", r#"
        INSERT INTO gis.locations (name, code, location_type, position, address, description, properties)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
        "#),
    )
    .bind(&payload.name)
    .bind(&payload.code)
    .bind(&payload.location_type)
    .bind(&payload.position)
    .bind(&payload.address)
    .bind(&payload.description)
    .bind(&payload.properties)
    .fetch_one(&pool)
    .await
    {
        Ok(location) => Json(ApiResponse::success(location, "创建位置成功")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("创建位置失败", e))),
    }
}

/// 获取位置列表
#[utoipa::path(
    get,
    security(("BearerAuth" = ["gis:read"])),
    path = "/locations",
    tag = "device",
    responses(
        (status = 200, description = "获取位置列表成功", body = serde_json::Value),
        (status = 500, description = "查询失败")
    )
)]
pub async fn list_locations(State(pool): State<PgPool>) -> Json<ApiResponse<serde_json::Value>> {
    match sqlx::query_as::<_, Location>(
        only_own_schema_query!("gis", "id, tenant_id, name, code, location_type, position, address, description, properties, status, created_at, updated_at FROM gis.locations ORDER BY created_at DESC"),
    )
    .fetch_all(&pool)
    .await
    {
        Ok(locations) => Json(ApiResponse::success(
            serde_json::json!({
                "locations": locations,
                "total": locations.len()
            }),
            "获取位置列表成功",
        )),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("查询失败", e))),
    }
}

/// 获取位置详情
#[utoipa::path(
    get,
    security(("BearerAuth" = ["gis:read"])),
    path = "/locations/{id}",
    tag = "device",
    params(
        ("id" = Uuid, Path, description = "位置ID")
    ),
    responses(
        (status = 200, description = "获取位置成功", body = serde_json::Value),
        (status = 404, description = "位置未找到"),
        (status = 500, description = "查询失败")
    )
)]
pub async fn get_location(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Location>> {
    match sqlx::query_as::<_, Location>(
        only_own_schema_query!("gis", "id, tenant_id, name, code, location_type, position, address, description, properties, status, created_at, updated_at FROM gis.locations WHERE deleted_at IS NULL AND id = $1"),
    )
    .bind(id)
    .fetch_one(&pool)
    .await
    {
        Ok(location) => Json(ApiResponse::success(location, "获取位置成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "位置未找到")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("查询失败", e))),
    }
}

/// 更新位置
pub async fn update_location(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateLocation>,
) -> Json<ApiResponse<Location>> {
    if let Err(e) = check_permission(&pool, &claims, &GisPermission::DeviceLocationWrite).await {
        return e;
    }

    match sqlx::query_as::<_, Location>(only_own_schema_query!(
        "gis",
        r#"
        UPDATE gis.locations 
        SET name = $1, location_type = $2, position = $3, address = $4, 
            description = $5, properties = $6, status = COALESCE($7, status), updated_at = NOW()
        WHERE id = $8
        RETURNING *
        "#
    ))
    .bind(&payload.name)
    .bind(&payload.location_type)
    .bind(&payload.position)
    .bind(&payload.address)
    .bind(&payload.description)
    .bind(&payload.properties)
    .bind(&payload.status)
    .bind(id)
    .fetch_one(&pool)
    .await
    {
        Ok(location) => Json(ApiResponse::success(location, "更新位置成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "位置未找到")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("更新失败", e))),
    }
}

/// 删除位置
pub async fn delete_location(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    if let Err(e) = check_permission(&pool, &claims, &GisPermission::DeviceLocationWrite).await {
        return e;
    }

    match sqlx::query(only_own_schema_query!(
        "gis",
        "UPDATE gis.locations SET deleted_at = NOW() WHERE id = $1"
    ))
    .bind(id)
    .execute(&pool)
    .await
    {
        Ok(result) => {
            if result.rows_affected() > 0 {
                Json(ApiResponse::success(true, "删除位置成功"))
            } else {
                Json(ApiResponse::error(404, "位置未找到"))
            }
        }
        Err(e) => Json(ApiResponse::from(TopemsError::internal("删除失败", e))),
    }
}

/// 位置搜索
pub async fn search_locations(
    State(pool): State<PgPool>,
    Json(payload): Json<SearchLocation>,
) -> Json<ApiResponse<serde_json::Value>> {
    let search_pattern = format!("%{}%", payload.query);

    let query = if payload.location_type.is_some() {
        "id, tenant_id, name, code, location_type, position, address, description, properties, status, created_at, updated_at FROM gis.locations WHERE deleted_at IS NULL AND (name ILIKE $1 OR code ILIKE $1) AND location_type = $2 ORDER BY created_at DESC"
    } else {
        "id, tenant_id, name, code, location_type, position, address, description, properties, status, created_at, updated_at FROM gis.locations WHERE deleted_at IS NULL AND name ILIKE $1 OR code ILIKE $1 ORDER BY created_at DESC"
    };

    match if payload.location_type.is_some() {
        sqlx::query_as::<_, Location>(query)
            .bind(&search_pattern)
            .bind(&payload.location_type)
            .fetch_all(&pool)
            .await
    } else {
        sqlx::query_as::<_, Location>(query)
            .bind(&search_pattern)
            .fetch_all(&pool)
            .await
    } {
        Ok(locations) => Json(ApiResponse::success(
            serde_json::json!({
                "locations": locations,
                "total": locations.len(),
                "query": payload.query
            }),
            "搜索完成",
        )),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("搜索失败", e))),
    }
}

/// 附近位置查询
pub async fn nearby_locations(
    State(pool): State<PgPool>,
    Json(payload): Json<NearbyRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    // Get all locations and filter by distance
    match sqlx::query_as::<_, Location>(
        only_own_schema_query!("gis", "id, tenant_id, name, code, location_type, position, address, description, properties, status, created_at, updated_at FROM gis.locations WHERE deleted_at IS NULL AND status = 'active'"),
    )
    .fetch_all(&pool)
    .await
    {
        Ok(locations) => {
            let nearby = locations
                .into_iter()
                .filter_map(|loc| {
                    let distance = calculate_distance_from_json(&payload.position, &loc.position);
                    if distance <= payload.radius {
                        Some(serde_json::json!({
                            "location": loc,
                            "distance": distance
                        }))
                    } else {
                        None
                    }
                })
                .collect::<Vec<_>>();

            // Sort by distance and limit
            let mut nearby_sorted = nearby;
            nearby_sorted.sort_by(|a, b| {
                let dist_a = a.get("distance").and_then(|d| d.as_f64()).unwrap_or(0.0);
                let dist_b = b.get("distance").and_then(|d| d.as_f64()).unwrap_or(0.0);
                dist_a
                    .partial_cmp(&dist_b)
                    .unwrap_or(std::cmp::Ordering::Equal)
            });

            if let Some(limit) = payload.limit {
                nearby_sorted = nearby_sorted.into_iter().take(limit as usize).collect();
            }

            Json(ApiResponse::success(
                serde_json::json!({
                    "nearby": nearby_sorted,
                    "total": nearby_sorted.len(),
                    "radius": payload.radius
                }),
                "附近位置查询完成",
            ))
        }
        Err(e) => Json(ApiResponse::from(TopemsError::internal("查询失败", e))),
    }
}

fn calculate_distance_from_json(pos1: &serde_json::Value, pos2: &serde_json::Value) -> f64 {
    // Extract coordinates from position JSON
    let (x1, y1) = extract_coords(pos1);
    let (x2, y2) = extract_coords(pos2);

    // Calculate approximate distance in meters
    let dx = (x2 - x1) * 111000.0;
    let dy = (y2 - y1) * 111000.0;

    (dx.powi(2) + dy.powi(2)).sqrt()
}

fn extract_coords(position: &serde_json::Value) -> (f64, f64) {
    if let Some(obj) = position.as_object() {
        let lat = obj.get("lat").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let lng = obj.get("lng").and_then(|v| v.as_f64()).unwrap_or(0.0);
        (lng, lat)
    } else if let Some(arr) = position.as_array() {
        if arr.len() >= 2 {
            let lng = arr[0].as_f64().unwrap_or(0.0);
            let lat = arr[1].as_f64().unwrap_or(0.0);
            (lng, lat)
        } else {
            (0.0, 0.0)
        }
    } else {
        (0.0, 0.0)
    }
}

/// 路径规划
pub async fn plan_route(
    State(_pool): State<PgPool>,
    Json(payload): Json<RouteRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    // Simplified route planning - just return a straight line
    let (start_x, start_y) = extract_coords(&payload.start);
    let (end_x, end_y) = extract_coords(&payload.end);

    let waypoints = payload.waypoints.unwrap_or_default();

    // Build route coordinates
    let mut route_coords: Vec<Vec<f64>> = vec![vec![start_x, start_y]];

    for waypoint in &waypoints {
        let (wp_x, wp_y) = extract_coords(waypoint);
        route_coords.push(vec![wp_x, wp_y]);
    }

    route_coords.push(vec![end_x, end_y]);

    // Calculate total distance
    let total_distance = calculate_route_distance(&route_coords);

    // Create route geometry
    let route_geometry = serde_json::json!({
        "type": "LineString",
        "coordinates": route_coords
    });

    Json(ApiResponse::success(
        serde_json::json!({
            "route": route_geometry,
            "total_distance": total_distance,
            "mode": payload.mode.unwrap_or_else(|| "direct".to_string()),
            "waypoints_count": waypoints.len()
        }),
        "路径规划完成",
    ))
}

fn calculate_route_distance(coords: &[Vec<f64>]) -> f64 {
    let mut total_distance = 0.0;

    for i in 1..coords.len() {
        let x1 = coords[i - 1][0];
        let y1 = coords[i - 1][1];
        let x2 = coords[i][0];
        let y2 = coords[i][1];

        let dx = (x2 - x1) * 111000.0;
        let dy = (y2 - y1) * 111000.0;

        total_distance += (dx.powi(2) + dy.powi(2)).sqrt();
    }

    total_distance
}

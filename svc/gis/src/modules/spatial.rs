#![allow(clippy::needless_borrows_for_generic_args)]
#![allow(dead_code)]

use crate::models::SpatialAnalysis;
use crate::shared::permission::{check_permission, GisPermission};
use axum::{
    extract::{Extension, State},
    Json,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use topems_shared_auth::auth::Claims;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::{response::ApiResponse, TopemsError};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BufferRequest {
    pub geometry: serde_json::Value,
    pub distance: f64,
    pub unit: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntersectRequest {
    pub geometry1: serde_json::Value,
    pub geometry2: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnionRequest {
    pub geometries: Vec<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DifferenceRequest {
    pub geometry1: serde_json::Value,
    pub geometry2: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WithinRequest {
    pub geometry: serde_json::Value,
    pub container: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DistanceRequest {
    pub geometry1: serde_json::Value,
    pub geometry2: serde_json::Value,
    pub unit: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NearestRequest {
    pub point: serde_json::Value,
    pub geodata_id: Uuid,
    pub limit: Option<i32>,
    pub max_distance: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClusterRequest {
    pub points: Vec<serde_json::Value>,
    pub algorithm: String,
    pub parameters: Option<serde_json::Value>,
}

/// 缓冲区分析
pub async fn buffer_analysis(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<BufferRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&pool, &claims, &GisPermission::All).await {
        return e;
    }

    let start_time = Utc::now();

    // Simplified buffer analysis - create a circular buffer around a point
    let result = calculate_buffer(&payload.geometry, payload.distance);

    let execution_time = (Utc::now() - start_time).num_milliseconds() as i32;

    // Save analysis result
    let analysis = sqlx::query_as::<_, SpatialAnalysis>(
        only_own_schema_query!("gis", r#"
        INSERT INTO gis.spatial_analysis (analysis_type, input_data, parameters, result_geometry, execution_time_ms, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
        "#),
    )
    .bind("buffer")
    .bind(serde_json::json!({"geometry": payload.geometry, "distance": payload.distance}))
    .bind(serde_json::json!({"unit": payload.unit}))
    .bind(&result)
    .bind(execution_time)
    .bind(claims.sub.parse::<Uuid>().ok())
    .fetch_one(&pool)
    .await;

    match analysis {
        Ok(_) => Json(ApiResponse::success(
            serde_json::json!({
                "result": result,
                "execution_time_ms": execution_time
            }),
            "缓冲区分析完成",
        )),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("保存分析结果失败", e))),
    }
}

fn calculate_buffer(geometry: &serde_json::Value, distance: f64) -> serde_json::Value {
    // Simplified buffer calculation for Point
    if let Some(geom_type) = geometry.get("type").and_then(|t| t.as_str()) {
        if geom_type == "Point" {
            if let Some(coords) = geometry.get("coordinates").and_then(|c| c.as_array()) {
                if coords.len() >= 2 {
                    let x = coords[0].as_f64().unwrap_or(0.0);
                    let y = coords[1].as_f64().unwrap_or(0.0);

                    // Create a simple polygon buffer (approximation)
                    let buffer_coords = create_circle_buffer(x, y, distance);

                    return serde_json::json!({
                        "type": "Polygon",
                        "coordinates": [buffer_coords]
                    });
                }
            }
        }
    }

    serde_json::json!({})
}

fn create_circle_buffer(x: f64, y: f64, radius: f64) -> Vec<Vec<f64>> {
    let num_points = 32;
    let mut coords: Vec<Vec<f64>> = Vec::new();

    for i in 0..num_points {
        let angle = 2.0 * std::f64::consts::PI * i as f64 / num_points as f64;
        let dx = radius * angle.cos();
        let dy = radius * angle.sin();
        coords.push(vec![x + dx, y + dy]);
    }

    // Close the polygon
    coords.push(coords[0].clone());

    coords
}

/// 相交分析
pub async fn intersect_analysis(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<IntersectRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&pool, &claims, &GisPermission::All).await {
        return e;
    }

    let start_time = Utc::now();

    // Simplified intersection check
    let intersects = check_intersection(&payload.geometry1, &payload.geometry2);

    let execution_time = (Utc::now() - start_time).num_milliseconds() as i32;

    let _ = sqlx::query_as::<_, SpatialAnalysis>(
        only_own_schema_query!("gis", r#"
        INSERT INTO gis.spatial_analysis (analysis_type, input_data, result_data, execution_time_ms, created_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        "#),
    )
    .bind("intersect")
    .bind(serde_json::json!({"geometry1": payload.geometry1, "geometry2": payload.geometry2}))
    .bind(serde_json::json!({"intersects": intersects}))
    .bind(execution_time)
    .bind(claims.sub.parse::<Uuid>().ok())
    .fetch_one(&pool)
    .await;

    Json(ApiResponse::success(
        serde_json::json!({
            "intersects": intersects,
            "execution_time_ms": execution_time
        }),
        "相交分析完成",
    ))
}

fn check_intersection(geom1: &serde_json::Value, geom2: &serde_json::Value) -> bool {
    // Simplified intersection check for two points
    if let (Some(type1), Some(type2)) = (
        geom1.get("type").and_then(|t| t.as_str()),
        geom2.get("type").and_then(|t| t.as_str()),
    ) {
        if type1 == "Point" && type2 == "Point" {
            if let (Some(coords1), Some(coords2)) = (
                geom1.get("coordinates").and_then(|c| c.as_array()),
                geom2.get("coordinates").and_then(|c| c.as_array()),
            ) {
                if coords1.len() >= 2 && coords2.len() >= 2 {
                    let x1 = coords1[0].as_f64().unwrap_or(0.0);
                    let y1 = coords1[1].as_f64().unwrap_or(0.0);
                    let x2 = coords2[0].as_f64().unwrap_or(0.0);
                    let y2 = coords2[1].as_f64().unwrap_or(0.0);

                    let distance = ((x2 - x1).powi(2) + (y2 - y1).powi(2)).sqrt();
                    return distance < 0.0001; // Very close points
                }
            }
        }
    }

    false
}

/// 合并分析
pub async fn union_analysis(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<UnionRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&pool, &claims, &GisPermission::All).await {
        return e;
    }

    let start_time = Utc::now();

    // Create a FeatureCollection from all geometries
    let features: Vec<serde_json::Value> = payload
        .geometries
        .iter()
        .map(|geom| {
            serde_json::json!({
                "type": "Feature",
                "geometry": geom,
                "properties": {}
            })
        })
        .collect();

    let result = serde_json::json!({
        "type": "FeatureCollection",
        "features": features
    });

    let execution_time = (Utc::now() - start_time).num_milliseconds() as i32;

    let _ = sqlx::query_as::<_, SpatialAnalysis>(
        only_own_schema_query!("gis", r#"
        INSERT INTO gis.spatial_analysis (analysis_type, input_data, result_geometry, execution_time_ms, created_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        "#),
    )
    .bind("union")
    .bind(serde_json::json!({"geometries": payload.geometries}))
    .bind(&result)
    .bind(execution_time)
    .bind(claims.sub.parse::<Uuid>().ok())
    .fetch_one(&pool)
    .await;

    Json(ApiResponse::success(
        serde_json::json!({
            "result": result,
            "execution_time_ms": execution_time
        }),
        "合并分析完成",
    ))
}

/// 差异分析
pub async fn difference_analysis(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<DifferenceRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&pool, &claims, &GisPermission::All).await {
        return e;
    }

    Json(ApiResponse::success(
        serde_json::json!({
            "geometry1": payload.geometry1,
            "geometry2": payload.geometry2,
            "difference": "差异分析结果（简化实现）"
        }),
        "差异分析完成",
    ))
}

/// 包含分析
pub async fn within_analysis(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<WithinRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&pool, &claims, &GisPermission::All).await {
        return e;
    }

    let within = check_within(&payload.geometry, &payload.container);

    Json(ApiResponse::success(
        serde_json::json!({
            "within": within
        }),
        "包含分析完成",
    ))
}

fn check_within(geom: &serde_json::Value, container: &serde_json::Value) -> bool {
    // Simplified within check for point in polygon
    if let Some(geom_type) = geom.get("type").and_then(|t| t.as_str()) {
        if geom_type == "Point" {
            if let Some(coords) = geom.get("coordinates").and_then(|c| c.as_array()) {
                if coords.len() >= 2 {
                    let x = coords[0].as_f64().unwrap_or(0.0);
                    let y = coords[1].as_f64().unwrap_or(0.0);

                    // Check if container is a polygon
                    if let Some(container_type) = container.get("type").and_then(|t| t.as_str()) {
                        if container_type == "Polygon" {
                            if let Some(poly_coords) =
                                container.get("coordinates").and_then(|c| c.as_array())
                            {
                                if let Some(shell) = poly_coords.first().and_then(|s| s.as_array())
                                {
                                    return point_in_polygon(x, y, shell);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    false
}

fn point_in_polygon(x: f64, y: f64, polygon: &[serde_json::Value]) -> bool {
    // Ray casting algorithm
    let mut inside = false;
    let mut j = polygon.len() - 1;

    for i in 0..polygon.len() {
        if let (Some(xi), Some(yi), Some(xj), Some(yj)) = (
            polygon[i].get(0).and_then(|v| v.as_f64()),
            polygon[i].get(1).and_then(|v| v.as_f64()),
            polygon[j].get(0).and_then(|v| v.as_f64()),
            polygon[j].get(1).and_then(|v| v.as_f64()),
        ) {
            if ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi) {
                inside = !inside;
            }
        }
        j = i;
    }

    inside
}

/// 距离计算
pub async fn distance_calculation(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<DistanceRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&pool, &claims, &GisPermission::All).await {
        return e;
    }

    let distance = calculate_distance(&payload.geometry1, &payload.geometry2);

    let unit = payload.unit.unwrap_or_else(|| "meters".to_string());

    Json(ApiResponse::success(
        serde_json::json!({
            "distance": distance,
            "unit": unit
        }),
        "距离计算完成",
    ))
}

fn calculate_distance(geom1: &serde_json::Value, geom2: &serde_json::Value) -> f64 {
    // Calculate Euclidean distance between two points
    if let (Some(type1), Some(type2)) = (
        geom1.get("type").and_then(|t| t.as_str()),
        geom2.get("type").and_then(|t| t.as_str()),
    ) {
        if type1 == "Point" && type2 == "Point" {
            if let (Some(coords1), Some(coords2)) = (
                geom1.get("coordinates").and_then(|c| c.as_array()),
                geom2.get("coordinates").and_then(|c| c.as_array()),
            ) {
                if coords1.len() >= 2 && coords2.len() >= 2 {
                    let x1 = coords1[0].as_f64().unwrap_or(0.0);
                    let y1 = coords1[1].as_f64().unwrap_or(0.0);
                    let x2 = coords2[0].as_f64().unwrap_or(0.0);
                    let y2 = coords2[1].as_f64().unwrap_or(0.0);

                    // Convert to approximate meters (assuming EPSG:4326)
                    let dx = (x2 - x1) * 111000.0; // ~111km per degree longitude
                    let dy = (y2 - y1) * 111000.0; // ~111km per degree latitude

                    return (dx.powi(2) + dy.powi(2)).sqrt();
                }
            }
        }
    }

    0.0
}

/// 最近邻查询
pub async fn nearest_query(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<NearestRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&pool, &claims, &GisPermission::All).await {
        return e;
    }

    // Query features from geodata
    match sqlx::query_as::<_, crate::models::GeoFeature>(
        only_own_schema_query!("gis", "id, tenant_id, geodata_id, feature_type, geometry, properties, centroid, area, length, created_at, updated_at FROM gis.geofeatures WHERE geodata_id = $1 ORDER BY created_at DESC LIMIT $2"),
    )
    .bind(&payload.geodata_id)
    .bind(payload.limit.unwrap_or(10))
    .fetch_all(&pool)
    .await
    {
        Ok(features) => {
            // Calculate distances and sort
            let mut results: Vec<(crate::models::GeoFeature, f64)> = features
                .into_iter()
                .filter_map(|f| {
                    let dist = calculate_distance(&payload.point, &f.geometry);
                    if payload.max_distance.is_none_or(|max| dist <= max) {
                        Some((f, dist))
                    } else {
                        None
                    }
                })
                .collect();

            results.sort_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal));

            let nearest = results
                .iter()
                .map(|(f, d)| {
                    serde_json::json!({
                        "feature": f,
                        "distance": d
                    })
                })
                .collect::<Vec<_>>();

            Json(ApiResponse::success(
                serde_json::json!({
                    "nearest": nearest,
                    "total": nearest.len()
                }),
                "最近邻查询完成",
            ))
        }
        Err(e) => Json(ApiResponse::from(TopemsError::internal("查询失败", e))),
    }
}

/// 空间聚类分析
pub async fn cluster_analysis(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<ClusterRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&pool, &claims, &GisPermission::All).await {
        return e;
    }

    // Simplified clustering - just group points into clusters
    let clusters = simple_cluster(&payload.points, &payload.algorithm);

    Json(ApiResponse::success(
        serde_json::json!({
            "clusters": clusters,
            "algorithm": payload.algorithm,
            "total_clusters": clusters.len()
        }),
        "聚类分析完成",
    ))
}

fn simple_cluster(points: &[serde_json::Value], algorithm: &str) -> Vec<Vec<serde_json::Value>> {
    // Very simplified clustering - just divide into groups
    let cluster_size = match algorithm {
        "kmeans" => 4,
        "grid" => 8,
        _ => 4,
    };

    let mut clusters: Vec<Vec<serde_json::Value>> = Vec::new();
    let mut current_cluster: Vec<serde_json::Value> = Vec::new();

    for point in points {
        current_cluster.push(point.clone());
        if current_cluster.len() >= cluster_size {
            clusters.push(current_cluster.clone());
            current_cluster.clear();
        }
    }

    if !current_cluster.is_empty() {
        clusters.push(current_cluster);
    }

    clusters
}

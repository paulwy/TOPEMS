use axum::{
    extract::{Path, State, Extension, Multipart},
    Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use sqlx::PgPool;
use topems_shared::{ApiResponse, auth::Claims};
use crate::models::{GeoData, GeoFeature};
use crate::services::permission::{check_permission, GisPermission};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateGeoData {
    pub name: String,
    pub data_type: String,
    pub format: String,
    pub geojson_data: Option<serde_json::Value>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateGeoData {
    pub name: String,
    pub data_type: String,
    pub metadata: Option<serde_json::Value>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConvertRequest {
    pub target_format: String,
    pub options: Option<serde_json::Value>,
}

/// 上传地理数据
pub async fn upload_geodata(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    mut multipart: Multipart,
) -> Json<ApiResponse<GeoData>> {
    if let Err(e) = check_permission(&pool, &claims, &GisPermission::All).await {
        return e;
    }

    let mut file_data: Vec<u8> = Vec::new();
    let mut name = String::new();
    let mut format = String::new();
    let mut data_type = String::new();

    while let Some(field) = multipart.next_field().await.unwrap() {
        let field_name = field.name().unwrap_or("");
        if field_name == "file" {
            file_data = field.bytes().await.unwrap().to_vec();
        } else if field_name == "name" {
            name = field.text().await.unwrap();
        } else if field_name == "format" {
            format = field.text().await.unwrap();
        } else if field_name == "data_type" {
            data_type = field.text().await.unwrap();
        }
    }

    if file_data.is_empty() {
        return Json(ApiResponse::error(400, "请上传文件"));
    }

    // Parse GeoJSON if format is geojson
    let geojson_data = if format == "geojson" {
        match serde_json::from_slice::<serde_json::Value>(&file_data) {
            Ok(data) => Some(data),
            Err(e) => return Json(ApiResponse::error(400, &format!("GeoJSON解析失败: {}", e))),
        }
    } else {
        None
    };

    // Calculate feature count if GeoJSON
    let feature_count = geojson_data.as_ref().and_then(|data| {
        data.get("features")
            .and_then(|features| features.as_array())
            .map(|arr| arr.len() as i32)
    });

    match sqlx::query_as::<_, GeoData>(
        r#"
        INSERT INTO gis.geodata (name, data_type, format, geojson_data, feature_count, uploaded_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
        "#,
    )
    .bind(&name)
    .bind(&data_type)
    .bind(&format)
    .bind(&geojson_data)
    .bind(feature_count)
    .bind(claims.sub.parse::<Uuid>().ok())
    .fetch_one(&pool)
    .await
    {
        Ok(geodata) => {
            // Parse and store features if GeoJSON
            if let Some(geojson) = geojson_data {
                if let Some(features) = geojson.get("features").and_then(|f| f.as_array()) {
                    for feature in features {
                        if let Err(e) = insert_feature(&pool, &geodata.id, feature).await {
                            tracing::error!("插入要素失败: {}", e);
                        }
                    }
                }
            }
            Json(ApiResponse::success(geodata, "上传地理数据成功"))
        }
        Err(e) => Json(ApiResponse::error(500, &format!("上传失败: {}", e))),
    }
}

async fn insert_feature(pool: &PgPool, geodata_id: &Uuid, feature: &serde_json::Value) -> Result<(), sqlx::Error> {
    let empty_geometry = serde_json::json!({});
    let geometry = feature.get("geometry").unwrap_or(&empty_geometry);
    let properties = feature.get("properties");
    
    let feature_type = geometry.get("type")
        .and_then(|t| t.as_str())
        .unwrap_or("Unknown")
        .to_string();

    sqlx::query(
        r#"
        INSERT INTO gis.geofeatures (geodata_id, feature_type, geometry, properties)
        VALUES ($1, $2, $3, $4)
        "#,
    )
    .bind(geodata_id)
    .bind(&feature_type)
    .bind(geometry)
    .bind(properties)
    .execute(pool)
    .await?;

    Ok(())
}

/// 获取地理数据列表
pub async fn list_geodata(State(pool): State<PgPool>) -> Json<ApiResponse<serde_json::Value>> {
    match sqlx::query_as::<_, GeoData>("SELECT * FROM gis.geodata ORDER BY created_at DESC")
        .fetch_all(&pool)
        .await
    {
        Ok(data) => Json(ApiResponse::success(
            serde_json::json!({
                "geodata": data,
                "total": data.len()
            }),
            "获取地理数据列表成功",
        )),
        Err(e) => Json(ApiResponse::error(500, &format!("查询失败: {}", e))),
    }
}

/// 获取地理数据详情
pub async fn get_geodata(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<GeoData>> {
    match sqlx::query_as::<_, GeoData>("SELECT * FROM gis.geodata WHERE id = $1")
        .bind(id)
        .fetch_one(&pool)
        .await
    {
        Ok(data) => Json(ApiResponse::success(data, "获取地理数据成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "地理数据未找到")),
        Err(e) => Json(ApiResponse::error(500, &format!("查询失败: {}", e))),
    }
}

/// 更新地理数据
pub async fn update_geodata(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateGeoData>,
) -> Json<ApiResponse<GeoData>> {
    if let Err(e) = check_permission(&pool, &claims, &GisPermission::All).await {
        return e;
    }

    match sqlx::query_as::<_, GeoData>(
        r#"
        UPDATE gis.geodata 
        SET name = $1, data_type = $2, metadata = $3, status = COALESCE($4, status), updated_at = NOW()
        WHERE id = $5
        RETURNING *
        "#,
    )
    .bind(&payload.name)
    .bind(&payload.data_type)
    .bind(&payload.metadata)
    .bind(&payload.status)
    .bind(id)
    .fetch_one(&pool)
    .await
    {
        Ok(data) => Json(ApiResponse::success(data, "更新地理数据成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "地理数据未找到")),
        Err(e) => Json(ApiResponse::error(500, &format!("更新失败: {}", e))),
    }
}

/// 删除地理数据
pub async fn delete_geodata(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    if let Err(e) = check_permission(&pool, &claims, &GisPermission::All).await {
        return e;
    }

    match sqlx::query("DELETE FROM gis.geodata WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
    {
        Ok(result) => {
            if result.rows_affected() > 0 {
                Json(ApiResponse::success(true, "删除地理数据成功"))
            } else {
                Json(ApiResponse::error(404, "地理数据未找到"))
            }
        }
        Err(e) => Json(ApiResponse::error(500, &format!("删除失败: {}", e))),
    }
}

/// 数据格式转换
pub async fn convert_geodata(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<ConvertRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&pool, &claims, &GisPermission::All).await {
        return e;
    }

    // Get source data
    match sqlx::query_as::<_, GeoData>("SELECT * FROM gis.geodata WHERE id = $1")
        .bind(id)
        .fetch_one(&pool)
        .await
    {
        Ok(geodata) => {
            // Perform conversion (simplified - just return GeoJSON for now)
            match payload.target_format.as_str() {
                "geojson" => {
                    if let Some(geojson) = geodata.geojson_data {
                        Json(ApiResponse::success(
                            serde_json::json!({
                                "format": "geojson",
                                "data": geojson
                            }),
                            "转换成功",
                        ))
                    } else {
                        Json(ApiResponse::error(400, "源数据不是GeoJSON格式"))
                    }
                }
                "csv" => {
                    // Simplified CSV conversion
                    if let Some(geojson) = geodata.geojson_data {
                        let csv_data = convert_geojson_to_csv(&geojson);
                        Json(ApiResponse::success(
                            serde_json::json!({
                                "format": "csv",
                                "data": csv_data
                            }),
                            "转换成功",
                        ))
                    } else {
                        Json(ApiResponse::error(400, "源数据不是GeoJSON格式"))
                    }
                }
                _ => Json(ApiResponse::error(400, "不支持的目标格式")),
            }
        }
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "地理数据未找到")),
        Err(e) => Json(ApiResponse::error(500, &format!("查询失败: {}", e))),
    }
}

fn convert_geojson_to_csv(geojson: &serde_json::Value) -> String {
    let mut csv_lines: Vec<String> = Vec::new();
    
    if let Some(features) = geojson.get("features").and_then(|f| f.as_array()) {
        // Header
        if let Some(first_feature) = features.first() {
            if let Some(props) = first_feature.get("properties").and_then(|p| p.as_object()) {
                let headers: Vec<String> = props.keys().cloned().collect();
                csv_lines.push(headers.join(","));
            }
        }
        
        // Data rows
        for feature in features {
            if let Some(props) = feature.get("properties").and_then(|p| p.as_object()) {
                let values: Vec<String> = props.values().map(|v| {
                    match v {
                        serde_json::Value::String(s) => s.clone(),
                        serde_json::Value::Number(n) => n.to_string(),
                        serde_json::Value::Bool(b) => b.to_string(),
                        _ => String::new(),
                    }
                }).collect();
                csv_lines.push(values.join(","));
            }
        }
    }
    
    csv_lines.join("\n")
}

/// 获取地理要素列表
pub async fn list_geofeatures(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    match sqlx::query_as::<_, GeoFeature>(
        "SELECT * FROM gis.geofeatures WHERE geodata_id = $1 ORDER BY created_at DESC"
    )
    .bind(id)
    .fetch_all(&pool)
    .await
    {
        Ok(features) => Json(ApiResponse::success(
            serde_json::json!({
                "features": features,
                "total": features.len()
            }),
            "获取地理要素列表成功",
        )),
        Err(e) => Json(ApiResponse::error(500, &format!("查询失败: {}", e))),
    }
}
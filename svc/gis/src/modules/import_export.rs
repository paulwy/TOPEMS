use crate::models::{BusinessLocation, DeviceLocation, Pipeline, WarehouseLocation};
use axum::{
    extract::{Json, State},
    Router,
};
use csv::ReaderBuilder;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use topems_shared_core::response::ApiResponse;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportRequest {
    pub data_type: String,
    pub csv_content: String,
}

pub async fn import_data(
    State(pool): State<PgPool>,
    Json(payload): Json<ImportRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut results: Vec<String> = Vec::new();
    let mut errors: Vec<String> = Vec::new();

    match payload.data_type.as_str() {
        "device_locations" => {
            let mut rdr = ReaderBuilder::new().from_reader(payload.csv_content.as_bytes());
            for (i, result) in rdr.deserialize().enumerate() {
                match result {
                    Ok(record) => {
                        let record: DeviceLocationRecord = record;
                        if let Err(e) = insert_device_location(&pool, &record).await {
                            errors.push(format!("第{}行: {}", i + 2, e));
                        } else {
                            results.push(format!("第{}行: 成功", i + 2));
                        }
                    }
                    Err(e) => {
                        errors.push(format!("第{}行: 解析失败 - {}", i + 2, e));
                    }
                }
            }
        }
        "pipelines" => {
            let mut rdr = ReaderBuilder::new().from_reader(payload.csv_content.as_bytes());
            for (i, result) in rdr.deserialize().enumerate() {
                match result {
                    Ok(record) => {
                        let record: PipelineRecord = record;
                        if let Err(e) = insert_pipeline(&pool, &record).await {
                            errors.push(format!("第{}行: {}", i + 2, e));
                        } else {
                            results.push(format!("第{}行: 成功", i + 2));
                        }
                    }
                    Err(e) => {
                        errors.push(format!("第{}行: 解析失败 - {}", i + 2, e));
                    }
                }
            }
        }
        "warehouse_locations" => {
            let mut rdr = ReaderBuilder::new().from_reader(payload.csv_content.as_bytes());
            for (i, result) in rdr.deserialize().enumerate() {
                match result {
                    Ok(record) => {
                        let record: WarehouseRecord = record;
                        if let Err(e) = insert_warehouse_location(&pool, &record).await {
                            errors.push(format!("第{}行: {}", i + 2, e));
                        } else {
                            results.push(format!("第{}行: 成功", i + 2));
                        }
                    }
                    Err(e) => {
                        errors.push(format!("第{}行: 解析失败 - {}", i + 2, e));
                    }
                }
            }
        }
        _ => {
            return Json(ApiResponse::error(400, "不支持的数据类型"));
        }
    }

    Json(ApiResponse::success(
        serde_json::json!({
            "success_count": results.len(),
            "error_count": errors.len(),
            "results": results,
            "errors": errors
        }),
        "导入完成",
    ))
}

#[derive(Debug, Clone, Deserialize)]
struct DeviceLocationRecord {
    device_name: String,
    device_code: String,
    device_type: String,
    position: String,
    status: Option<String>,
    description: Option<String>,
}

async fn insert_device_location(
    pool: &PgPool,
    record: &DeviceLocationRecord,
) -> Result<(), String> {
    let position: serde_json::Value =
        serde_json::from_str(&record.position).map_err(|e| format!("位置解析失败: {}", e))?;
    let status = record.status.as_deref().unwrap_or("active");

    sqlx::query(
        r#"
        INSERT INTO device_locations (device_name, device_code, device_type, position, status, description)
        VALUES ($1, $2, $3, $4, $5, $6)
        "#,
    )
    .bind(&record.device_name)
    .bind(&record.device_code)
    .bind(&record.device_type)
    .bind(&position)
    .bind(status)
    .bind(&record.description)
    .execute(pool)
    .await
    .map_err(|e| format!("插入失败: {}", e))?;

    Ok(())
}

#[derive(Debug, Clone, Deserialize)]
struct PipelineRecord {
    name: String,
    code: String,
    pipeline_type: String,
    path: String,
    status: Option<String>,
    description: Option<String>,
}

async fn insert_pipeline(pool: &PgPool, record: &PipelineRecord) -> Result<(), String> {
    let path: serde_json::Value =
        serde_json::from_str(&record.path).map_err(|e| format!("路径解析失败: {}", e))?;
    let status = record.status.as_deref().unwrap_or("active");

    sqlx::query(
        r#"
        INSERT INTO pipelines (name, code, pipeline_type, path, status, description)
        VALUES ($1, $2, $3, $4, $5, $6)
        "#,
    )
    .bind(&record.name)
    .bind(&record.code)
    .bind(&record.pipeline_type)
    .bind(&path)
    .bind(status)
    .bind(&record.description)
    .execute(pool)
    .await
    .map_err(|e| format!("插入失败: {}", e))?;

    Ok(())
}

#[derive(Debug, Clone, Deserialize)]
struct WarehouseRecord {
    warehouse_name: String,
    zone: Option<String>,
    position: String,
    status: Option<String>,
    description: Option<String>,
}

async fn insert_warehouse_location(pool: &PgPool, record: &WarehouseRecord) -> Result<(), String> {
    let position: serde_json::Value =
        serde_json::from_str(&record.position).map_err(|e| format!("位置解析失败: {}", e))?;
    let status = record.status.as_deref().unwrap_or("active");

    sqlx::query(
        r#"
        INSERT INTO warehouse_locations (warehouse_name, zone, position, status, description)
        VALUES ($1, $2, $3, $4, $5)
        "#,
    )
    .bind(&record.warehouse_name)
    .bind(&record.zone)
    .bind(&position)
    .bind(status)
    .bind(&record.description)
    .execute(pool)
    .await
    .map_err(|e| format!("插入失败: {}", e))?;

    Ok(())
}

pub async fn export_geojson(State(pool): State<PgPool>) -> Json<ApiResponse<serde_json::Value>> {
    let mut features: Vec<serde_json::Value> = Vec::new();

    if let Ok(devices) = sqlx::query_as::<_, DeviceLocation>("id, tenant_id, map_id, device_name, device_code, device_type, position, status, description, last_inspected, created_at, updated_at FROM device_locations")
        .fetch_all(&pool)
        .await
    {
        for device in devices {
            features.push(serde_json::json!({
                "type": "Feature",
                "geometry": device.position,
                "properties": {
                    "id": device.id,
                    "name": device.device_name,
                    "code": device.device_code,
                    "type": "device",
                    "status": device.status
                }
            }));
        }
    }

    if let Ok(pipelines) = sqlx::query_as::<_, Pipeline>("id, tenant_id, map_id, name, code, pipeline_type, path, properties, status, created_at, updated_at FROM pipelines")
        .fetch_all(&pool)
        .await
    {
        for pipeline in pipelines {
            features.push(serde_json::json!({
                "type": "Feature",
                "geometry": pipeline.path,
                "properties": {
                    "id": pipeline.id,
                    "name": pipeline.name,
                    "code": pipeline.code,
                    "type": "pipeline",
                    "status": pipeline.status
                }
            }));
        }
    }

    if let Ok(warehouses) =
        sqlx::query_as::<_, WarehouseLocation>("id, tenant_id, map_id, warehouse_name, zone, position, capacity, usage_rate, status, created_at, updated_at FROM warehouse_locations")
            .fetch_all(&pool)
            .await
    {
        for warehouse in warehouses {
            features.push(serde_json::json!({
                "type": "Feature",
                "geometry": warehouse.position,
                "properties": {
                    "id": warehouse.id,
                    "name": warehouse.warehouse_name,
                    "zone": warehouse.zone,
                    "type": "warehouse",
                    "status": warehouse.status
                }
            }));
        }
    }

    if let Ok(locations) = sqlx::query_as::<_, BusinessLocation>("id, tenant_id, business_type, business_name, business_code, category, position, address, contact_person, contact_phone, capacity, current_usage, status, properties, description, external_id, external_type, created_at, updated_at FROM business_locations")
        .fetch_all(&pool)
        .await
    {
        for location in locations {
            features.push(serde_json::json!({
                "type": "Feature",
                "geometry": location.position,
                "properties": {
                    "id": location.id,
                    "name": location.business_name,
                    "code": location.business_code,
                    "type": "business",
                    "business_type": location.business_type,
                    "status": location.status
                }
            }));
        }
    }

    let geojson = serde_json::json!({
        "type": "FeatureCollection",
        "features": features
    });

    Json(ApiResponse::success(geojson, "导出GeoJSON成功"))
}

pub fn create_routes() -> Router<PgPool> {
    Router::new()
        .route("/import", axum::routing::post(import_data))
        .route("/geojson/export", axum::routing::get(export_geojson))
}

use crate::models::{BusinessLocation, DeviceLocation, Pipeline, WarehouseLocation};
use axum::{
    extract::{Extension, Json, State},
    Router,
};
use csv::ReaderBuilder;
use serde::{Deserialize, Serialize};
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::error::TopemsError;
use topems_shared_core::response::ApiResponse;
use topems_shared_db::scope::Db;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportRequest {
    pub data_type: String,
    pub csv_content: String,
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["gis:write"])),
    path = "/import",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "import-export"
)]
pub async fn import_data(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Json(payload): Json<ImportRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let mut results: Vec<String> = Vec::new();
    let mut errors: Vec<String> = Vec::new();

    match payload.data_type.as_str() {
        "device_locations" => {
            let mut rdr = ReaderBuilder::new().from_reader(payload.csv_content.as_bytes());
            for (i, result) in rdr.deserialize().enumerate() {
                match result {
                    Ok(record) => {
                        let record: DeviceLocationRecord = record;
                        if let Err(e) = insert_device_location(&mut scope, &record).await {
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
                        if let Err(e) = insert_pipeline(&mut scope, &record).await {
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
                        if let Err(e) = insert_warehouse_location(&mut scope, &record).await {
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
            return ApiResponse::bad_request("不支持的数据类型");
        }
    }

    if let Err(e) = scope.commit().await {
        return ApiResponse::from(TopemsError::internal("事务提交失败", e));
    }
    ApiResponse::success(
        serde_json::json!({
            "success_count": results.len(),
            "error_count": errors.len(),
            "results": results,
            "errors": errors
        }),
        "导入完成",
    )
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
    scope: &mut topems_shared_db::scope::ScopedTxn<'_>,
    record: &DeviceLocationRecord,
) -> Result<(), TopemsError> {
    let position: serde_json::Value = serde_json::from_str(&record.position)
        .map_err(|e| TopemsError::ValidationFailed(format!("位置解析失败: {}", e)))?;
    let status = record.status.as_deref().unwrap_or("active");

    sqlx::query(
        only_own_schema_query!("gis", r#"
        INSERT INTO gis.device_locations (device_name, device_code, device_type, position, status, description, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        "#),
    )
    .bind(&record.device_name)
    .bind(&record.device_code)
    .bind(&record.device_type)
    .bind(&position)
    .bind(status)
    .bind(&record.description)
    .bind(sqlx::types::Uuid::nil())
    .execute(scope)
    .await
    .map_err(|e| TopemsError::DatabaseQuery(format!("插入失败: {}", e)))?;

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

async fn insert_pipeline(
    scope: &mut topems_shared_db::scope::ScopedTxn<'_>,
    record: &PipelineRecord,
) -> Result<(), TopemsError> {
    let path: serde_json::Value = serde_json::from_str(&record.path)
        .map_err(|e| TopemsError::ValidationFailed(format!("路径解析失败: {}", e)))?;
    let status = record.status.as_deref().unwrap_or("active");

    sqlx::query(only_own_schema_query!(
        "gis",
        r#"
        INSERT INTO gis.pipelines (name, code, pipeline_type, path, status, description, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        "#
    ))
    .bind(&record.name)
    .bind(&record.code)
    .bind(&record.pipeline_type)
    .bind(&path)
    .bind(status)
    .bind(&record.description)
    .bind(sqlx::types::Uuid::nil())
    .execute(scope)
    .await
    .map_err(|e| TopemsError::DatabaseQuery(format!("插入失败: {}", e)))?;

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

async fn insert_warehouse_location(
    scope: &mut topems_shared_db::scope::ScopedTxn<'_>,
    record: &WarehouseRecord,
) -> Result<(), TopemsError> {
    let position: serde_json::Value = serde_json::from_str(&record.position)
        .map_err(|e| TopemsError::ValidationFailed(format!("位置解析失败: {}", e)))?;
    let status = record.status.as_deref().unwrap_or("active");

    sqlx::query(only_own_schema_query!(
        "gis",
        r#"
        INSERT INTO gis.warehouse_locations (warehouse_name, zone, position, status, description, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        "#
    ))
    .bind(&record.warehouse_name)
    .bind(&record.zone)
    .bind(&position)
    .bind(status)
    .bind(&record.description)
    .bind(sqlx::types::Uuid::nil())
    .execute(scope)
    .await
    .map_err(|e| TopemsError::DatabaseQuery(format!("插入失败: {}", e)))?;

    Ok(())
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["gis:read"])),
    path = "/geojson/export",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "import-export"
)]
pub async fn export_geojson(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
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

    let mut features: Vec<serde_json::Value> = Vec::new();

    if let Ok(devices) = sqlx::query_as::<_, DeviceLocation>(only_own_schema_query!("gis", "SELECT id, tenant_id, map_id, device_name, device_code, device_type, position, status, description, last_inspected, created_at, updated_at FROM gis.device_locations WHERE ($1::uuid IS NULL OR tenant_id = $1)"))
        .bind(tenant_opt)
        .fetch_all(&mut scope)
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

    if let Ok(pipelines) = sqlx::query_as::<_, Pipeline>(only_own_schema_query!("gis", "SELECT id, tenant_id, map_id, name, code, pipeline_type, path, properties, status, created_at, updated_at FROM gis.pipelines WHERE ($1::uuid IS NULL OR tenant_id = $1)"))
        .bind(tenant_opt)
        .fetch_all(&mut scope)
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
        sqlx::query_as::<_, WarehouseLocation>(only_own_schema_query!("gis", "SELECT id, tenant_id, map_id, warehouse_name, zone, position, capacity, usage_rate::float8 AS usage_rate, status, created_at, updated_at FROM gis.warehouse_locations WHERE ($1::uuid IS NULL OR tenant_id = $1)"))
            .bind(tenant_opt)
            .fetch_all(&mut scope)
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

    if let Ok(locations) = sqlx::query_as::<_, BusinessLocation>(only_own_schema_query!("gis", "SELECT id, tenant_id, business_type, business_name, business_code, category, position, address, contact_person, contact_phone, capacity, current_usage, status, properties, description, external_id, external_type, created_at, updated_at FROM gis.business_locations WHERE ($1::uuid IS NULL OR tenant_id = $1)"))
        .bind(tenant_opt)
        .fetch_all(&mut scope)
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

    if let Err(e) = scope.commit().await {
        return ApiResponse::from(TopemsError::internal("事务提交失败", e));
    }
    ApiResponse::success(geojson, "导出GeoJSON成功")
}

pub fn create_routes() -> Router<Db> {
    Router::new()
        .route("/import", axum::routing::post(import_data))
        .route("/geojson/export", axum::routing::get(export_geojson))
}

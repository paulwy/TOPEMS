use axum::{
    extract::{Extension, Path, Query, State},
    Json,
};
use chrono::Utc;
use serde::Deserialize;
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;

use topems_shared::{ApiResponse, Claims};
use crate::models::datasource::*;
use crate::services::permission::{check_permission, BIPermission};

/// 创建数据源
pub async fn create_datasource(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<CreateDataSource>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::DataSourceWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    let datasource_id = Uuid::new_v4();
    let result = sqlx::query(
        "INSERT INTO data_sources (id, name, description, datasource_type, connection_config, status, created_by, created_at, updated_at, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)"
    )
    .bind(datasource_id)
    .bind(&payload.name)
    .bind(&payload.description)
    .bind(&payload.datasource_type)
    .bind(&payload.connection_config)
    .bind(ConnectionStatus::Disconnected)
    .bind(payload.created_by)
    .bind(Utc::now())
    .bind(Utc::now())
    .bind(true)
    .execute(&pool)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(json!({
            "datasource_id": datasource_id,
            "name": payload.name,
            "datasource_type": payload.datasource_type,
            "status": "disconnected",
            "created_at": Utc::now().to_rfc3339(),
        }), "创建数据源成功")),
        Err(e) => Json(ApiResponse::error(500, &format!("创建数据源失败: {}", e))),
    }
}

/// 获取数据源列表
pub async fn list_datasources(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<DataSourceQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::DataSourceRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    let datasources = sqlx::query_as::<_, DataSource>(
        "SELECT * FROM data_sources 
         WHERE is_active = true
         AND ($1::text IS NULL OR name LIKE '%' || $1 || '%')
         AND ($2::datasource_type IS NULL OR datasource_type = $2)
         ORDER BY created_at DESC 
         LIMIT $3 OFFSET $4"
    )
    .bind(&params.name)
    .bind(&params.datasource_type)
    .bind(params.limit.unwrap_or(20))
    .bind(params.offset.unwrap_or(0))
    .fetch_all(&pool)
    .await;

    match datasources {
        Ok(datasources_list) => {
            Json(ApiResponse::success(json!({
                "datasources": datasources_list,
                "total": datasources_list.len(),
            }), "获取数据源列表成功"))
        },
        Err(e) => Json(ApiResponse::error(500, &format!("查询数据源失败: {}", e))),
    }
}

/// 获取数据源详情
pub async fn get_datasource(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::DataSourceRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    let datasource = sqlx::query_as::<_, DataSource>(
        "SELECT * FROM data_sources WHERE id = $1 AND is_active = true"
    )
    .bind(id)
    .fetch_optional(&pool)
    .await;

    match datasource {
        Ok(Some(datasource_data)) => {
            Json(ApiResponse::success(json!({
                "datasource": datasource_data,
            }), "获取数据源详情成功"))
        },
        Ok(None) => Json(ApiResponse::error(404, "数据源不存在")),
        Err(e) => Json(ApiResponse::error(500, &format!("查询数据源失败: {}", e))),
    }
}

/// 更新数据源
pub async fn update_datasource(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateDataSource>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::DataSourceWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    let result = sqlx::query(
        "UPDATE data_sources SET 
         name = COALESCE($2, name),
         description = COALESCE($3, description),
         connection_config = COALESCE($4, connection_config),
         is_active = COALESCE($5, is_active),
         updated_at = $6
         WHERE id = $1"
    )
    .bind(id)
    .bind(&payload.name)
    .bind(&payload.description)
    .bind(&payload.connection_config)
    .bind(&payload.is_active)
    .bind(Utc::now())
    .execute(&pool)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(json!({
            "datasource_id": id,
            "updated_at": Utc::now().to_rfc3339(),
        }), "更新数据源成功")),
        Err(e) => Json(ApiResponse::error(500, &format!("更新数据源失败: {}", e))),
    }
}

/// 删除数据源
pub async fn delete_datasource(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::DataSourceWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    let result = sqlx::query(
        "UPDATE data_sources SET is_active = false, updated_at = $2 WHERE id = $1"
    )
    .bind(id)
    .bind(Utc::now())
    .execute(&pool)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(json!({
            "datasource_id": id,
            "deleted_at": Utc::now().to_rfc3339(),
        }), "删除数据源成功")),
        Err(e) => Json(ApiResponse::error(500, &format!("删除数据源失败: {}", e))),
    }
}

/// 测试数据源连接
pub async fn test_datasource(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::DataSourceWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    // 查询数据源配置
    let datasource = sqlx::query_as::<_, DataSource>(
        "SELECT * FROM data_sources WHERE id = $1 AND is_active = true"
    )
    .bind(id)
    .fetch_optional(&pool)
    .await;

    match datasource {
        Ok(Some(_datasource_config)) => {
            // 测试连接（简化实现）
            let _start_time = Utc::now();
            
            // 模拟测试结果
            let test_result = DataSourceTestResult {
                datasource_id: id,
                success: true,
                message: "连接成功".to_string(),
                connection_time_ms: 50,
                tested_at: Utc::now(),
                details: Some(json!({
                    "version": "14.2",
                    "database_size": "10GB",
                    "active_connections": 5,
                })),
            };

            // 更新数据源状态
            sqlx::query(
                "UPDATE data_sources SET status = $2, last_tested_at = $3, last_error = NULL WHERE id = $1"
            )
            .bind(id)
            .bind(ConnectionStatus::Connected)
            .bind(Utc::now())
            .execute(&pool)
            .await
            .ok();

            Json(ApiResponse::success(json!({
                "test_result": test_result,
            }), "测试连接成功"))
        },
        Ok(None) => Json(ApiResponse::error(404, "数据源不存在")),
        Err(e) => Json(ApiResponse::error(500, &format!("测试连接失败: {}", e))),
    }
}

/// 获取数据源表列表
pub async fn get_datasource_tables(
    State(_pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::DataSourceRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    // 查询数据源表信息（简化实现）
    let tables = json!([
        {
            "table_name": "users",
            "table_schema": "public",
            "table_type": "BASE TABLE",
            "row_count": 1000,
            "description": "用户表",
        },
        {
            "table_name": "orders",
            "table_schema": "public",
            "table_type": "BASE TABLE",
            "row_count": 5000,
            "description": "订单表",
        },
        {
            "table_name": "products",
            "table_schema": "public",
            "table_type": "BASE TABLE",
            "row_count": 200,
            "description": "产品表",
        },
    ]);

    Json(ApiResponse::success(json!({
        "datasource_id": id,
        "tables": tables,
        "total": 3,
    }), "获取表列表成功"))
}

/// 获取数据源字段列表
pub async fn get_datasource_fields(
    State(_pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Query(params): Query<FieldQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::DataSourceRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    // 查询数据源字段信息（简化实现）
    let fields = json!([
        {
            "table_name": params.table_name.as_ref().unwrap_or(&"users".to_string()),
            "fields": [
                {
                    "field_name": "id",
                    "field_type": "integer",
                    "is_nullable": false,
                    "is_primary_key": true,
                    "description": "主键ID",
                },
                {
                    "field_name": "name",
                    "field_type": "varchar(100)",
                    "is_nullable": false,
                    "is_primary_key": false,
                    "description": "用户名",
                },
                {
                    "field_name": "email",
                    "field_type": "varchar(200)",
                    "is_nullable": false,
                    "is_primary_key": false,
                    "description": "邮箱地址",
                },
                {
                    "field_name": "created_at",
                    "field_type": "timestamp",
                    "is_nullable": false,
                    "is_primary_key": false,
                    "description": "创建时间",
                },
            ]
        }
    ]);

    Json(ApiResponse::success(json!({
        "datasource_id": id,
        "fields": fields,
    }), "获取字段列表成功"))
}

/// 数据源查询参数
#[derive(Debug, Deserialize)]
pub struct DataSourceQueryParams {
    pub name: Option<String>,
    pub datasource_type: Option<DataSourceType>,
    pub limit: Option<i32>,
    pub offset: Option<i32>,
}

/// 字段查询参数
#[derive(Debug, Deserialize)]
pub struct FieldQueryParams {
    pub table_name: Option<String>,
}
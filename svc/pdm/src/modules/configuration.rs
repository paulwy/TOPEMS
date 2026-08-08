use axum::{extract::Path, extract::Query, extract::State, routing::get, Extension, Json, Router};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::shared::AppState;
use topems_shared::{ApiResponse, Claims};

fn get_tenant_id(claims: &Claims, headers: &axum::http::HeaderMap) -> Uuid {
    claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .or_else(|| {
            headers
                .get("x-tenant-id")
                .and_then(|v| v.to_str().ok())
                .and_then(|s| Uuid::parse_str(s).ok())
        })
        .unwrap_or_else(Uuid::new_v4)
}

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/configurations",
            get(list_configurations).post(create_configuration),
        )
        .route(
            "/configurations/{id}",
            get(get_configuration)
                .put(update_configuration)
                .delete(delete_configuration),
        )
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Configuration {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub config_no: String,
    pub name: String,
    pub description: Option<String>,
    pub product_id: Option<Uuid>,
    pub config_items: serde_json::Value,
    pub status: String,
    pub created_by: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateConfigurationRequest {
    pub config_no: String,
    pub name: String,
    pub description: Option<String>,
    pub product_id: Option<Uuid>,
    pub config_items: Vec<String>,
    pub created_by: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateConfigurationRequest {
    pub config_no: Option<String>,
    pub name: Option<String>,
    pub description: Option<String>,
    pub product_id: Option<Uuid>,
    pub config_items: Option<Vec<String>>,
    pub status: Option<String>,
    pub created_by: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ConfigurationQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub product_id: Option<Uuid>,
}

pub async fn list_configurations(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ConfigurationQuery>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(10).min(100);
    let offset = (page - 1) * page_size;
    let search_pattern = query.search.as_ref().map(|s| format!("%{}%", s));

    let result = sqlx::query_as::<_, Configuration>(
        r#"
        SELECT id, tenant_id, config_no, name, description, product_id, config_items,
               status, created_by, created_at, updated_at
        FROM pdm_configurations
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR config_no ILIKE $2 OR name ILIKE $2)
          AND ($3::text IS NULL OR status = $3)
          AND ($4::uuid IS NULL OR product_id = $4)
        ORDER BY created_at DESC
        LIMIT $5 OFFSET $6
        "#,
    )
    .bind(tenant_id)
    .bind(&search_pattern)
    .bind(&query.status)
    .bind(&query.product_id)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(configurations) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM pdm_configurations
                WHERE deleted_at IS NULL AND tenant_id = $1
                  AND ($2::text IS NULL OR config_no ILIKE $2 OR name ILIKE $2)
                  AND ($3::text IS NULL OR status = $3)
                  AND ($4::uuid IS NULL OR product_id = $4)
                "#,
            )
            .bind(tenant_id)
            .bind(&search_pattern)
            .bind(&query.status)
            .bind(&query.product_id)
            .fetch_one(&state.pool)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "configurations": configurations,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取配置列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取配置列表失败: {}", e);
            Json(ApiResponse::error(500, "获取配置列表失败"))
        }
    }
}

pub async fn create_configuration(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateConfigurationRequest>,
) -> Json<ApiResponse<Configuration>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    if req.config_no.is_empty() {
        return Json(ApiResponse::error(400, "配置编号不能为空"));
    }
    if req.name.is_empty() {
        return Json(ApiResponse::error(400, "配置名称不能为空"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();
    let config_items = match serde_json::to_value(req.config_items) {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("序列化配置项失败: {}", e);
            return Json(ApiResponse::error(500, "配置项数据格式错误"));
        }
    };

    let result = sqlx::query_as::<_, Configuration>(
        r#"
        INSERT INTO pdm_configurations (
            id, tenant_id, config_no, name, description, product_id, config_items,
            status, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, tenant_id, config_no, name, description, product_id, config_items,
                  status, created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .bind(&req.config_no)
    .bind(&req.name)
    .bind(&req.description)
    .bind(req.product_id)
    .bind(&config_items)
    .bind("active")
    .bind(&req.created_by)
    .bind(now)
    .bind(now)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(configuration) => Json(ApiResponse::success(configuration, "配置创建成功")),
        Err(e) => {
            tracing::error!("创建配置失败: {}", e);
            Json(ApiResponse::error(500, "创建配置失败"))
        }
    }
}

pub async fn get_configuration(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<Configuration>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, Configuration>(
        r#"
        SELECT id, tenant_id, config_no, name, description, product_id, config_items,
               status, created_by, created_at, updated_at
        FROM pdm_configurations WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(configuration)) => Json(ApiResponse::success(configuration, "获取配置成功")),
        Ok(None) => Json(ApiResponse::error(404, "配置不存在")),
        Err(e) => {
            tracing::error!("获取配置失败: {}", e);
            Json(ApiResponse::error(500, "获取配置失败"))
        }
    }
}

pub async fn update_configuration(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(req): Json<UpdateConfigurationRequest>,
) -> Json<ApiResponse<Configuration>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let now = Utc::now();
    let config_items = req
        .config_items
        .map(|v| serde_json::to_value(v).unwrap_or_else(|_| serde_json::Value::Null));

    let result = sqlx::query_as::<_, Configuration>(
        r#"
        UPDATE pdm_configurations SET
            config_no = COALESCE(NULLIF($2, ''), config_no),
            name = COALESCE(NULLIF($3, ''), name),
            description = COALESCE($4, description),
            product_id = COALESCE($5, product_id),
            config_items = COALESCE($6, config_items),
            status = COALESCE(NULLIF($7, ''), status),
            created_by = COALESCE($8, created_by),
            updated_at = $9
        WHERE id = $1 AND tenant_id = $10
        RETURNING id, tenant_id, config_no, name, description, product_id, config_items,
                  status, created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.config_no)
    .bind(&req.name)
    .bind(&req.description)
    .bind(req.product_id)
    .bind(&config_items)
    .bind(&req.status)
    .bind(&req.created_by)
    .bind(now)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(configuration)) => Json(ApiResponse::success(configuration, "配置更新成功")),
        Ok(None) => Json(ApiResponse::error(404, "配置不存在")),
        Err(e) => {
            tracing::error!("更新配置失败: {}", e);
            Json(ApiResponse::error(500, "更新配置失败"))
        }
    }
}

pub async fn delete_configuration(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<bool>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query(
        "UPDATE pdm_configurations SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success(true, "配置删除成功")),
        Ok(_) => Json(ApiResponse::error(404, "配置不存在")),
        Err(e) => {
            tracing::error!("删除配置失败: {}", e);
            Json(ApiResponse::error(500, "删除配置失败"))
        }
    }
}

use axum::{extract::Path, extract::Query, extract::State, routing::get, Extension, Json, Router};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::shared::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pdm:read"])),
    path = "/api/pdm/configurations",
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
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
    .bind(query.product_id)
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
            .bind(query.product_id)
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

#[utoipa::path(
    post,
    security(("BearerAuth" = ["pdm:bom:write"])),
    path = "/api/pdm/configurations",
    request_body = CreateConfigurationRequest,
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pdm:read"])),
    path = "/api/pdm/configurations/{id}",
    tag = "pdm",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
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

#[utoipa::path(
    put,
    security(("BearerAuth" = ["pdm:update"])),
    path = "/api/pdm/configurations/{id}",
    request_body = UpdateConfigurationRequest,
    tag = "pdm",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
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

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["pdm:delete"])),
    path = "/api/pdm/configurations/{id}",
    tag = "pdm",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
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

#[cfg(test)]
mod tests {
    use super::*;

    fn make_claims(tenant_id: Option<&str>) -> Claims {
        Claims {
            sub: "user-1".to_string(),
            username: "tester".to_string(),
            role: "admin".to_string(),
            roles: vec![],
            permissions: vec![],
            is_superuser: false,
            exp: 9999999999,
            iat: 0,
            email: None,
            department: None,
            tenant_id: tenant_id.map(|s| s.to_string()),
            department_id: None,
            position_id: None,
            position_code: None,
        }
    }

    #[test]
    fn test_get_tenant_id_from_claims() {
        let claims = make_claims(Some("550e8400-e29b-41d4-a716-446655440000"));
        let headers = axum::http::HeaderMap::new();
        let tid = get_tenant_id(&claims, &headers);
        assert_eq!(
            tid,
            Uuid::parse_str("550e8400-e29b-41d4-a716-446655440000").unwrap()
        );
    }

    #[test]
    fn test_get_tenant_id_from_header() {
        let claims = make_claims(None);
        let mut headers = axum::http::HeaderMap::new();
        headers.insert(
            "x-tenant-id",
            "550e8400-e29b-41d4-a716-446655440060".parse().unwrap(),
        );
        let tid = get_tenant_id(&claims, &headers);
        assert_eq!(
            tid,
            Uuid::parse_str("550e8400-e29b-41d4-a716-446655440060").unwrap()
        );
    }

    #[test]
    fn test_get_tenant_id_fallback_v4() {
        let claims = make_claims(None);
        let headers = axum::http::HeaderMap::new();
        let tid = get_tenant_id(&claims, &headers);
        assert_eq!(tid.get_version(), Some(uuid::Version::Random));
    }

    #[test]
    fn test_create_routes_builds_without_panic() {
        let router = create_routes();
        let _ = router.clone();
    }

    #[test]
    fn test_configuration_serde_roundtrip() {
        let now = Utc::now();
        let c = Configuration {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            config_no: "C-001".to_string(),
            name: "配置A".to_string(),
            description: Some("desc".to_string()),
            product_id: Some(Uuid::new_v4()),
            config_items: serde_json::json!(["item1", "item2"]),
            status: "active".to_string(),
            created_by: Some("u1".to_string()),
            created_at: now,
            updated_at: now,
        };
        let json = serde_json::to_string(&c).unwrap();
        let decoded: Configuration = serde_json::from_str(&json).unwrap();
        assert_eq!(decoded.config_no, "C-001");
        assert_eq!(decoded.name, "配置A");
        assert_eq!(decoded.status, "active");
        assert_eq!(decoded.config_items, serde_json::json!(["item1", "item2"]));
    }

    #[test]
    fn test_configuration_serde_none_optionals() {
        let now = Utc::now();
        let c = Configuration {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            config_no: "C-002".to_string(),
            name: "裸配置".to_string(),
            description: None,
            product_id: None,
            config_items: serde_json::json!([]),
            status: "draft".to_string(),
            created_by: None,
            created_at: now,
            updated_at: now,
        };
        let json = serde_json::to_string(&c).unwrap();
        assert!(json.contains("\"description\":null"));
        assert!(json.contains("\"product_id\":null"));
        let decoded: Configuration = serde_json::from_str(&json).unwrap();
        assert!(decoded.product_id.is_none());
        assert!(decoded.created_by.is_none());
    }

    #[test]
    fn test_create_configuration_request_deserialize() {
        let json = r#"{"config_no":"C-100","name":"n","description":"d","product_id":"550e8400-e29b-41d4-a716-446655440061","config_items":["a","b"],"created_by":"u"}"#;
        let req: CreateConfigurationRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.config_no, "C-100");
        assert_eq!(req.config_items, vec!["a", "b"]);
        assert!(req.product_id.is_some());
        assert_eq!(req.created_by, Some("u".to_string()));
    }

    #[test]
    fn test_create_configuration_request_minimal() {
        let json = r#"{"config_no":"C-101","name":"n","config_items":[]}"#;
        let req: CreateConfigurationRequest = serde_json::from_str(json).unwrap();
        assert!(req.description.is_none());
        assert!(req.product_id.is_none());
        assert!(req.config_items.is_empty());
    }

    #[test]
    fn test_update_configuration_request_all_none() {
        let json = r#"{}"#;
        let req: UpdateConfigurationRequest = serde_json::from_str(json).unwrap();
        assert!(req.config_no.is_none());
        assert!(req.name.is_none());
        assert!(req.status.is_none());
        assert!(req.config_items.is_none());
    }

    #[test]
    fn test_configuration_query_defaults() {
        let json = r#"{}"#;
        let q: ConfigurationQuery = serde_json::from_str(json).unwrap();
        assert!(q.page.is_none());
        assert!(q.product_id.is_none());
    }

    #[test]
    fn test_configuration_query_with_filters() {
        let json = r#"{"page":2,"page_size":15,"search":"c","status":"active","product_id":"550e8400-e29b-41d4-a716-446655440062"}"#;
        let q: ConfigurationQuery = serde_json::from_str(json).unwrap();
        assert_eq!(q.page, Some(2));
        assert_eq!(q.page_size, Some(15));
        assert_eq!(q.search.as_deref(), Some("c"));
        assert!(q.product_id.is_some());
    }
}

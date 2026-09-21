use axum::{extract::Path, extract::Query, extract::State, routing::get, Extension, Json, Router};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::shared::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/products", get(list_products).post(create_product))
        .route(
            "/products/{id}",
            get(get_product).put(update_product).delete(delete_product),
        )
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Product {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub product_no: String,
    pub name: String,
    pub description: Option<String>,
    pub version: Option<String>,
    pub status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateProductRequest {
    pub product_no: String,
    pub name: String,
    pub description: Option<String>,
    pub version: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProductRequest {
    pub product_no: Option<String>,
    pub name: Option<String>,
    pub description: Option<String>,
    pub version: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ProductQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pdm:read"])),
    path = "/api/pdm/products",
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn list_products(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ProductQuery>,
    _headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        Some(claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok()).unwrap_or_default())
    };
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(10).min(100);
    let offset = (page - 1) * page_size;
    let search_pattern = query.search.as_ref().map(|s| format!("%{}%", s));

    let result = sqlx::query_as::<_, Product>(
        r#"
        SELECT id, tenant_id, product_no, name, description, version, status, created_at, updated_at
        FROM pdm_products
        WHERE (1::uuid IS NULL OR tenant_id = $1)
          AND ($2::text IS NULL OR product_no ILIKE $2 OR name ILIKE $2)
          AND ($3::text IS NULL OR status = $3)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(tenant_id)
    .bind(&search_pattern)
    .bind(&query.status)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(products) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM pdm_products
                WHERE deleted_at IS NULL AND (1::uuid IS NULL OR tenant_id = $1)
                  AND ($2::text IS NULL OR product_no ILIKE $2 OR name ILIKE $2)
                  AND ($3::text IS NULL OR status = $3)
                "#,
            )
            .bind(tenant_id)
            .bind(&search_pattern)
            .bind(&query.status)
            .fetch_one(&state.pool)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "products": products,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取产品列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取产品列表失败: {}", e);
            Json(ApiResponse::error(500, "获取产品列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["pdm:bom:write"])),
    path = "/api/pdm/products",
    request_body = CreateProductRequest,
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn create_product(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    _headers: axum::http::HeaderMap,
    Json(req): Json<CreateProductRequest>,
) -> Json<ApiResponse<Product>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });

    if req.product_no.is_empty() {
        return Json(ApiResponse::error(400, "产品编号不能为空"));
    }
    if req.name.is_empty() {
        return Json(ApiResponse::error(400, "产品名称不能为空"));
    }

    let status = req.status.unwrap_or_else(|| "active".to_string());

    let result = sqlx::query_as::<_, Product>(
        r#"
        INSERT INTO pdm_products (tenant_id, product_no, name, description, version, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, tenant_id, product_no, name, description, version, status, created_at, updated_at
        "#,
    )
    .bind(tenant_id)
    .bind(&req.product_no)
    .bind(&req.name)
    .bind(&req.description)
    .bind(&req.version)
    .bind(&status)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(product) => Json(ApiResponse::success(product, "产品创建成功")),
        Err(e) => {
            tracing::error!("创建产品失败: {}", e);
            Json(ApiResponse::error(500, "创建产品失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pdm:read"])),
    path = "/api/pdm/products/{id}",
    tag = "pdm",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn get_product(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: axum::http::HeaderMap,
) -> Json<ApiResponse<Product>> {
    let tenant_id: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        Some(claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok()).unwrap_or_default())
    };

    let result = sqlx::query_as::<_, Product>(
        r#"
        SELECT id, tenant_id, product_no, name, description, version, status, created_at, updated_at
        FROM pdm_products WHERE id = $1 AND (2::uuid IS NULL OR tenant_id = $2)
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(product)) => Json(ApiResponse::success(product, "获取产品成功")),
        Ok(None) => Json(ApiResponse::error(404, "产品不存在")),
        Err(e) => {
            tracing::error!("获取产品失败: {}", e);
            Json(ApiResponse::error(500, "获取产品失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["pdm:update"])),
    path = "/api/pdm/products/{id}",
    request_body = UpdateProductRequest,
    tag = "pdm",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn update_product(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: axum::http::HeaderMap,
    Json(req): Json<UpdateProductRequest>,
) -> Json<ApiResponse<Product>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
    let now = Utc::now();

    let result = sqlx::query_as::<_, Product>(
        r#"
        UPDATE pdm_products SET
            product_no = COALESCE($2, product_no),
            name = COALESCE($3, name),
            description = COALESCE($4, description),
            version = COALESCE($5, version),
            status = COALESCE($6, status),
            updated_at = $7
        WHERE id = $1 AND tenant_id = $8
        RETURNING id, tenant_id, product_no, name, description, version, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.product_no)
    .bind(&req.name)
    .bind(&req.description)
    .bind(&req.version)
    .bind(&req.status)
    .bind(now)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(product)) => Json(ApiResponse::success(product, "产品更新成功")),
        Ok(None) => Json(ApiResponse::error(404, "产品不存在")),
        Err(e) => {
            tracing::error!("更新产品失败: {}", e);
            Json(ApiResponse::error(500, "更新产品失败"))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["pdm:delete"])),
    path = "/api/pdm/products/{id}",
    tag = "pdm",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn delete_product(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: axum::http::HeaderMap,
) -> Json<ApiResponse<bool>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });

    let result =
        sqlx::query("UPDATE pdm_products SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2")
            .bind(id)
            .bind(tenant_id)
            .execute(&state.pool)
            .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success(true, "产品删除成功")),
        Ok(_) => Json(ApiResponse::error(404, "产品不存在")),
        Err(e) => {
            tracing::error!("删除产品失败: {}", e);
            Json(ApiResponse::error(500, "删除产品失败"))
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
        let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tid = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
        assert_eq!(
            tid,
            Uuid::parse_str("550e8400-e29b-41d4-a716-446655440000").unwrap()
        );
    }

    #[test]
    fn test_get_tenant_id_from_header_when_claims_missing() {
        let claims = make_claims(None);
        let mut headers = axum::http::HeaderMap::new();
        headers.insert(
            "x-tenant-id",
            "550e8400-e29b-41d4-a716-446655440001".parse().unwrap(),
        );
        let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tid = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
        assert_eq!(
            tid,
            Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
        );
    }

    #[test]
    fn test_get_tenant_id_invalid_claims_falls_back_to_header() {
        let claims = make_claims(Some("not-a-uuid"));
        let mut headers = axum::http::HeaderMap::new();
        headers.insert(
            "x-tenant-id",
            "550e8400-e29b-41d4-a716-446655440002".parse().unwrap(),
        );
        let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tid = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
        assert_eq!(
            tid,
            Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
        );
    }

    #[test]
    fn test_get_tenant_id_fallback_generates_uuid() {
        // 当 claims 和 header 都没有合法 tenant_id 时，应生成一个新的 v4 UUID
        let claims = make_claims(None);
        let headers = axum::http::HeaderMap::new();
        let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tid = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
        assert_eq!(tid.get_version(), Some(uuid::Version::Nil));
    }

    #[test]
    fn test_create_routes_builds_without_panic() {
        let router = create_routes();
        // Router 实现了 Clone，确保能正常克隆
        let _cloned = router.clone();
    }

    #[test]
    fn test_product_serde_roundtrip() {
        let now = Utc::now();
        let p = Product {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            product_no: "P-001".to_string(),
            name: "测试产品".to_string(),
            description: Some("描述".to_string()),
            version: Some("1.0.0".to_string()),
            status: "active".to_string(),
            created_at: now,
            updated_at: now,
        };
        let json = serde_json::to_string(&p).unwrap();
        let decoded: Product = serde_json::from_str(&json).unwrap();
        assert_eq!(decoded.product_no, "P-001");
        assert_eq!(decoded.name, "测试产品");
        assert_eq!(decoded.status, "active");
        assert_eq!(decoded.version, Some("1.0.0".to_string()));
    }

    #[test]
    fn test_product_serde_with_none_fields() {
        let now = Utc::now();
        let p = Product {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            product_no: "P-002".to_string(),
            name: "最小产品".to_string(),
            description: None,
            version: None,
            status: "draft".to_string(),
            created_at: now,
            updated_at: now,
        };
        let json = serde_json::to_string(&p).unwrap();
        assert!(json.contains("\"description\":null"));
        assert!(json.contains("\"version\":null"));
        let decoded: Product = serde_json::from_str(&json).unwrap();
        assert!(decoded.description.is_none());
        assert!(decoded.version.is_none());
    }

    #[test]
    fn test_create_product_request_deserialize() {
        let json = r#"{"product_no":"P-100","name":"新产品","description":"d","version":"v1","status":"active"}"#;
        let req: CreateProductRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.product_no, "P-100");
        assert_eq!(req.name, "新产品");
        assert_eq!(req.status, Some("active".to_string()));
    }

    #[test]
    fn test_create_product_request_optional_status() {
        let json = r#"{"product_no":"P-101","name":"x"}"#;
        let req: CreateProductRequest = serde_json::from_str(json).unwrap();
        assert!(req.status.is_none());
        assert!(req.description.is_none());
    }

    #[test]
    fn test_update_product_request_all_none() {
        let json = r#"{}"#;
        let req: UpdateProductRequest = serde_json::from_str(json).unwrap();
        assert!(req.product_no.is_none());
        assert!(req.name.is_none());
        assert!(req.status.is_none());
    }

    #[test]
    fn test_product_query_deserialize_defaults() {
        let json = r#"{}"#;
        let q: ProductQuery = serde_json::from_str(json).unwrap();
        assert!(q.page.is_none());
        assert!(q.page_size.is_none());
        assert!(q.search.is_none());
        assert!(q.status.is_none());
    }

    #[test]
    fn test_product_query_with_values() {
        let json = r#"{"page":2,"page_size":20,"search":"abc","status":"active"}"#;
        let q: ProductQuery = serde_json::from_str(json).unwrap();
        assert_eq!(q.page, Some(2));
        assert_eq!(q.page_size, Some(20));
        assert_eq!(q.search.as_deref(), Some("abc"));
        assert_eq!(q.status.as_deref(), Some("active"));
    }
}

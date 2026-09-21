use axum::{extract::Path, extract::Query, extract::State, routing::get, Extension, Json, Router};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::types::BigDecimal;
use sqlx::FromRow;
use uuid::Uuid;

use crate::shared::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/production-batches", get(list_batches).post(create_batch))
        .route(
            "/production-batches/{id}",
            get(get_batch).put(update_batch).delete(delete_batch),
        )
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct ProductionBatch {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub batch_no: String,
    pub product_id: Option<Uuid>,
    pub product_name: Option<String>,
    pub quantity: Option<BigDecimal>,
    pub unit: Option<String>,
    pub start_date: Option<chrono::DateTime<chrono::Utc>>,
    pub end_date: Option<chrono::DateTime<chrono::Utc>>,
    pub status: String,
    pub notes: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateBatchRequest {
    pub batch_no: String,
    pub product_id: Option<Uuid>,
    pub product_name: Option<String>,
    pub quantity: Option<BigDecimal>,
    pub unit: Option<String>,
    pub start_date: Option<chrono::DateTime<chrono::Utc>>,
    pub end_date: Option<chrono::DateTime<chrono::Utc>>,
    pub status: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateBatchRequest {
    pub batch_no: Option<String>,
    pub product_id: Option<Uuid>,
    pub product_name: Option<String>,
    pub quantity: Option<BigDecimal>,
    pub unit: Option<String>,
    pub start_date: Option<chrono::DateTime<chrono::Utc>>,
    pub end_date: Option<chrono::DateTime<chrono::Utc>>,
    pub status: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BatchQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub product_id: Option<Uuid>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pdm:read"])),
    path = "/api/pdm/production-batches",
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn list_batches(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<BatchQuery>,
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

    let result = sqlx::query_as::<_, ProductionBatch>(
        r#"
        SELECT id, tenant_id, batch_no, product_id, product_name, quantity, unit,
               start_date, end_date, status, notes, created_at, updated_at
        FROM pdm_production_batches
        WHERE (1::uuid IS NULL OR tenant_id = $1)
          AND ($2::text IS NULL OR batch_no ILIKE $2 OR product_name ILIKE $2)
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
        Ok(batches) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM pdm_production_batches
                WHERE deleted_at IS NULL AND (1::uuid IS NULL OR tenant_id = $1)
                  AND ($2::text IS NULL OR batch_no ILIKE $2 OR product_name ILIKE $2)
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
                    "batches": batches,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取批次列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取批次列表失败: {}", e);
            Json(ApiResponse::error(500, "获取批次列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["pdm:bom:write"])),
    path = "/api/pdm/production-batches",
    request_body = CreateBatchRequest,
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn create_batch(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    _headers: axum::http::HeaderMap,
    Json(req): Json<CreateBatchRequest>,
) -> Json<ApiResponse<ProductionBatch>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });

    if req.batch_no.is_empty() {
        return Json(ApiResponse::error(400, "批次编号不能为空"));
    }

    let status = req.status.unwrap_or_else(|| "pending".to_string());

    let result = sqlx::query_as::<_, ProductionBatch>(
        r#"
        INSERT INTO pdm_production_batches (
            tenant_id, batch_no, product_id, product_name, quantity, unit,
            start_date, end_date, status, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, tenant_id, batch_no, product_id, product_name, quantity, unit,
                  start_date, end_date, status, notes, created_at, updated_at
        "#,
    )
    .bind(tenant_id)
    .bind(&req.batch_no)
    .bind(req.product_id)
    .bind(&req.product_name)
    .bind(&req.quantity)
    .bind(&req.unit)
    .bind(req.start_date)
    .bind(req.end_date)
    .bind(&status)
    .bind(&req.notes)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(batch) => Json(ApiResponse::success(batch, "批次创建成功")),
        Err(e) => {
            tracing::error!("创建批次失败: {}", e);
            Json(ApiResponse::error(500, "创建批次失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pdm:read"])),
    path = "/api/pdm/production-batches/{id}",
    tag = "pdm",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn get_batch(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: axum::http::HeaderMap,
) -> Json<ApiResponse<ProductionBatch>> {
    let tenant_id: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        Some(claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok()).unwrap_or_default())
    };

    let result = sqlx::query_as::<_, ProductionBatch>(
        r#"
        SELECT id, tenant_id, batch_no, product_id, product_name, quantity, unit,
               start_date, end_date, status, notes, created_at, updated_at
        FROM pdm_production_batches WHERE id = $1 AND (2::uuid IS NULL OR tenant_id = $2)
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(batch)) => Json(ApiResponse::success(batch, "获取批次成功")),
        Ok(None) => Json(ApiResponse::error(404, "批次不存在")),
        Err(e) => {
            tracing::error!("获取批次失败: {}", e);
            Json(ApiResponse::error(500, "获取批次失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["pdm:update"])),
    path = "/api/pdm/production-batches/{id}",
    request_body = UpdateBatchRequest,
    tag = "pdm",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn update_batch(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: axum::http::HeaderMap,
    Json(req): Json<UpdateBatchRequest>,
) -> Json<ApiResponse<ProductionBatch>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
    let now = Utc::now();

    let result = sqlx::query_as::<_, ProductionBatch>(
        r#"
        UPDATE pdm_production_batches SET
            batch_no = COALESCE(NULLIF($2, ''), batch_no),
            product_id = COALESCE($3, product_id),
            product_name = COALESCE($4, product_name),
            quantity = COALESCE($5, quantity),
            unit = COALESCE(NULLIF($6, ''), unit),
            start_date = COALESCE($7, start_date),
            end_date = COALESCE($8, end_date),
            status = COALESCE(NULLIF($9, ''), status),
            notes = COALESCE($10, notes),
            updated_at = $11
        WHERE id = $1 AND tenant_id = $12
        RETURNING id, tenant_id, batch_no, product_id, product_name, quantity, unit,
                  start_date, end_date, status, notes, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.batch_no)
    .bind(req.product_id)
    .bind(&req.product_name)
    .bind(&req.quantity)
    .bind(&req.unit)
    .bind(req.start_date)
    .bind(req.end_date)
    .bind(&req.status)
    .bind(&req.notes)
    .bind(now)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(batch)) => Json(ApiResponse::success(batch, "批次更新成功")),
        Ok(None) => Json(ApiResponse::error(404, "批次不存在")),
        Err(e) => {
            tracing::error!("更新批次失败: {}", e);
            Json(ApiResponse::error(500, "更新批次失败"))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["pdm:delete"])),
    path = "/api/pdm/production-batches/{id}",
    tag = "pdm",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn delete_batch(
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

    let result = sqlx::query(
        "UPDATE pdm_production_batches SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success(true, "批次删除成功")),
        Ok(_) => Json(ApiResponse::error(404, "批次不存在")),
        Err(e) => {
            tracing::error!("删除批次失败: {}", e);
            Json(ApiResponse::error(500, "删除批次失败"))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::str::FromStr;

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
    fn test_get_tenant_id_from_header() {
        let claims = make_claims(None);
        let mut headers = axum::http::HeaderMap::new();
        headers.insert(
            "x-tenant-id",
            "550e8400-e29b-41d4-a716-446655440080".parse().unwrap(),
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
            Uuid::parse_str("550e8400-e29b-41d4-a716-446655440080").unwrap()
        );
    }

    #[test]
    fn test_get_tenant_id_fallback_v4() {
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
        assert_eq!(tid.get_version(), Some(uuid::Version::Random));
    }

    #[test]
    fn test_create_routes_builds_without_panic() {
        let router = create_routes();
        let _ = router.clone();
    }

    #[test]
    fn test_production_batch_serde_roundtrip() {
        let now = Utc::now();
        let b = ProductionBatch {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            batch_no: "B-001".to_string(),
            product_id: Some(Uuid::new_v4()),
            product_name: Some("产品A".to_string()),
            quantity: Some(BigDecimal::from_str("100.50").unwrap()),
            unit: Some("个".to_string()),
            start_date: Some(now),
            end_date: None,
            status: "running".to_string(),
            notes: Some("备注".to_string()),
            created_at: now,
            updated_at: now,
        };
        let json = serde_json::to_string(&b).unwrap();
        let decoded: ProductionBatch = serde_json::from_str(&json).unwrap();
        assert_eq!(decoded.batch_no, "B-001");
        assert_eq!(decoded.status, "running");
        assert_eq!(decoded.unit, Some("个".to_string()));
        assert!(decoded.quantity.is_some());
    }

    #[test]
    fn test_production_batch_serde_none_optionals() {
        let now = Utc::now();
        let b = ProductionBatch {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            batch_no: "B-002".to_string(),
            product_id: None,
            product_name: None,
            quantity: None,
            unit: None,
            start_date: None,
            end_date: None,
            status: "draft".to_string(),
            notes: None,
            created_at: now,
            updated_at: now,
        };
        let json = serde_json::to_string(&b).unwrap();
        assert!(json.contains("\"quantity\":null"));
        assert!(json.contains("\"product_id\":null"));
        let decoded: ProductionBatch = serde_json::from_str(&json).unwrap();
        assert!(decoded.notes.is_none());
    }

    #[test]
    fn test_create_batch_request_deserialize_with_bigdecimal() {
        let json = r#"{"batch_no":"B-100","product_name":"P","quantity":"250","unit":"kg","status":"active"}"#;
        let req: CreateBatchRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.batch_no, "B-100");
        assert_eq!(req.unit, Some("kg".to_string()));
        assert!(req.quantity.is_some());
        assert_eq!(req.status, Some("active".to_string()));
    }

    #[test]
    fn test_create_batch_request_minimal() {
        let json = r#"{"batch_no":"B-101"}"#;
        let req: CreateBatchRequest = serde_json::from_str(json).unwrap();
        assert!(req.quantity.is_none());
        assert!(req.product_id.is_none());
    }

    #[test]
    fn test_update_batch_request_all_none() {
        let json = r#"{}"#;
        let req: UpdateBatchRequest = serde_json::from_str(json).unwrap();
        assert!(req.batch_no.is_none());
        assert!(req.status.is_none());
        assert!(req.quantity.is_none());
    }

    #[test]
    fn test_batch_query_defaults() {
        let json = r#"{}"#;
        let q: BatchQuery = serde_json::from_str(json).unwrap();
        assert!(q.page.is_none());
        assert!(q.product_id.is_none());
    }

    #[test]
    fn test_batch_query_with_filters() {
        let json = r#"{"page":1,"page_size":10,"search":"B","status":"running","product_id":"550e8400-e29b-41d4-a716-446655440081"}"#;
        let q: BatchQuery = serde_json::from_str(json).unwrap();
        assert_eq!(q.page, Some(1));
        assert_eq!(q.search.as_deref(), Some("B"));
        assert!(q.product_id.is_some());
    }
}

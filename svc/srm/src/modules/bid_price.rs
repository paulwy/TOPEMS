use anyhow::Result;
use axum::{
    extract::{Extension, Path, State},
    routing::get,
    Json, Router,
};
use bigdecimal::{BigDecimal, FromPrimitive, ToPrimitive};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::postgres::PgPool;
use sqlx::FromRow;
use std::sync::Arc;
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

pub struct AppState {
    pub db: PgPool,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct BidRequest {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub request_no: String,
    pub title: String,
    pub description: Option<String>,
    pub deadline: Option<DateTime<Utc>>,
    pub status: String,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Bid {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub request_id: Uuid,
    pub supplier_id: Option<Uuid>,
    pub supplier_name: Option<String>,
    pub price: Option<BigDecimal>,
    pub currency: Option<String>,
    pub valid_until: Option<DateTime<Utc>>,
    pub status: String,
    pub remarks: Option<String>,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

pub async fn create_routes(db: PgPool) -> Result<Router> {
    let state = Arc::new(AppState { db });

    let app = Router::new()
        .route(
            "/bid-requests",
            get(list_bid_requests).post(create_bid_request),
        )
        .route(
            "/bid-requests/{id}",
            get(get_bid_request)
                .put(update_bid_request)
                .delete(delete_bid_request),
        )
        .route(
            "/bid-requests/{id}/bids",
            get(get_bid_request_bids).post(create_bid),
        )
        .route(
            "/bids/{id}",
            get(get_bid).put(update_bid).delete(delete_bid),
        )
        .route("/bid-comparisons/{request_id}", get(get_bid_comparison))
        .with_state(state);

    Ok(app)
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["srm:bid_price:read"])),
    path = "/bid-requests",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SRM/bid_price"
)]
pub async fn list_bid_requests(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    _headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::SupplierRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let _tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());

    let requests = sqlx::query_as::<_, BidRequest>(
        only_own_schema_query!("srm", r#"
        SELECT id, tenant_id, request_no, title, description, deadline, status, created_by, created_at, updated_at
        FROM srm.bid_requests
        WHERE ($1::uuid IS NULL OR tenant_id = $1) AND status != 'deleted'
        ORDER BY created_at DESC
        "#, "srm"),
    )
    .bind(tenant_opt)
    .fetch_all(&mut **txn)
    .await;

    match requests {
        Ok(rows) => {
            let results: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.id.to_string(),
                        "tenant_id": r.tenant_id.to_string(),
                        "request_no": r.request_no,
                        "title": r.title,
                        "description": r.description,
                        "deadline": r.deadline,
                        "status": r.status,
                        "created_by": r.created_by.map(|u| u.to_string()),
                        "created_at": r.created_at.to_string(),
                        "updated_at": r.updated_at.to_string()
                    })
                })
                .collect();
            Json(ApiResponse::success(results, "获取询价请求列表成功"))
        }
        Err(e) => {
            tracing::error!("获取询价请求列表失败: {}", e);
            Json(ApiResponse::<Vec<serde_json::Value>>::error(
                500,
                "获取询价请求列表失败",
            ))
        }
    }
}

pub async fn create_bid_request(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    _headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::SupplierWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let title = body.get("title").and_then(|v| v.as_str()).unwrap_or("");
    let description = body
        .get("description")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let deadline = body.get("deadline").and_then(|v| v.as_str()).and_then(|d| {
        chrono::DateTime::parse_from_rfc3339(d)
            .ok()
            .map(|d| d.with_timezone(&chrono::Utc))
    });

    if title.is_empty() {
        return Json(ApiResponse::<serde_json::Value>::error(
            400,
            "询价标题不能为空",
        ));
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());
    let request_no = format!("BR-{}", chrono::Local::now().format("%Y%m%d%H%M%S"));

    let result = sqlx::query_as::<_, BidRequest>(
        only_own_schema_query!("srm", r#"
        INSERT INTO srm.bid_requests (tenant_id, request_no, title, description, deadline, status, created_by)
        VALUES ($1, $2, $3, $4, $5, 'pending', $6)
        RETURNING id, tenant_id, request_no, title, description, deadline, status, created_by, created_at, updated_at
        "#, "srm"),
    )
    .bind(tenant_id)
    .bind(request_no)
    .bind(title)
    .bind(description)
    .bind(deadline)
    .bind(claims.user_id().ok())
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(row) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return Json(ApiResponse::error(500, "提交事务失败"));
                }
            }
            let data = serde_json::json!({
                "id": row.id.to_string(),
                "tenant_id": row.tenant_id.to_string(),
                "request_no": row.request_no,
                "title": row.title,
                "description": row.description,
                "deadline": row.deadline,
                "status": row.status,
                "created_by": row.created_by.map(|u| u.to_string()),
                "created_at": row.created_at.to_string(),
                "updated_at": row.updated_at.to_string()
            });
            Json(ApiResponse::success(data, "创建询价请求成功"))
        }
        Err(e) => {
            tracing::error!("创建询价请求失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(
                500,
                "创建询价请求失败",
            ))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["srm:bid_price:read"])),
    path = "/bid-requests/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SRM/bid_price"
)]
pub async fn get_bid_request(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    _headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::SupplierRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let uuid = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => {
            return Json(ApiResponse::<serde_json::Value>::error(
                400,
                "询价请求ID格式错误",
            ));
        }
    };

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let _tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());

    let result = sqlx::query_as::<_, BidRequest>(
        only_own_schema_query!("srm", r#"
        SELECT id, tenant_id, request_no, title, description, deadline, status, created_by, created_at, updated_at
        FROM srm.bid_requests
        WHERE id = $1 AND ($2::uuid IS NULL OR tenant_id = $2) AND status != 'deleted'
        "#, "srm"),
    )
    .bind(uuid)
    .bind(tenant_opt)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(row) => {
            let data = serde_json::json!({
                "id": row.id.to_string(),
                "tenant_id": row.tenant_id.to_string(),
                "request_no": row.request_no,
                "title": row.title,
                "description": row.description,
                "deadline": row.deadline,
                "status": row.status,
                "created_by": row.created_by.map(|u| u.to_string()),
                "created_at": row.created_at.to_string(),
                "updated_at": row.updated_at.to_string()
            });
            Json(ApiResponse::success(data, "获取询价请求成功"))
        }
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::<serde_json::Value>::error(
            404,
            "询价请求不存在或已删除",
        )),
        Err(e) => {
            tracing::error!("获取询价请求失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(
                500,
                "获取询价请求失败",
            ))
        }
    }
}

pub async fn update_bid_request(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    _headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::SupplierWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let uuid = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => {
            return Json(ApiResponse::<serde_json::Value>::error(
                400,
                "询价请求ID格式错误",
            ));
        }
    };

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());

    let title = body.get("title").and_then(|v| v.as_str());
    let description = body.get("description").and_then(|v| v.as_str());
    let status = body.get("status").and_then(|v| v.as_str());
    let deadline = body.get("deadline").and_then(|v| v.as_str()).and_then(|d| {
        chrono::DateTime::parse_from_rfc3339(d)
            .ok()
            .map(|d| d.with_timezone(&chrono::Utc))
    });

    let result = sqlx::query_as::<_, BidRequest>(
        only_own_schema_query!("srm", r#"
        UPDATE srm.bid_requests
        SET title = COALESCE($1, title), description = COALESCE($2, description),
            status = COALESCE($3, status), deadline = COALESCE($4, deadline),
            updated_at = NOW()
        WHERE id = $5 AND tenant_id = $6 AND status != 'deleted'
        RETURNING id, tenant_id, request_no, title, description, deadline, status, created_by, created_at, updated_at
        "#, "srm"),
    )
    .bind(title)
    .bind(description)
    .bind(status)
    .bind(deadline)
    .bind(uuid)
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(row) => {
            let data = serde_json::json!({
                "id": row.id.to_string(),
                "tenant_id": row.tenant_id.to_string(),
                "request_no": row.request_no,
                "title": row.title,
                "description": row.description,
                "deadline": row.deadline,
                "status": row.status,
                "created_by": row.created_by.map(|u| u.to_string()),
                "created_at": row.created_at.to_string(),
                "updated_at": row.updated_at.to_string()
            });
            Json(ApiResponse::success(data, "更新询价请求成功"))
        }
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::<serde_json::Value>::error(
            404,
            "询价请求不存在或已删除",
        )),
        Err(e) => {
            tracing::error!("更新询价请求失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(
                500,
                "更新询价请求失败",
            ))
        }
    }
}

pub async fn delete_bid_request(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    _headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::SupplierWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let uuid = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => {
            return Json(ApiResponse::<serde_json::Value>::error(
                400,
                "询价请求ID格式错误",
            ));
        }
    };

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());

    let result = sqlx::query(
        only_own_schema_query!("srm", "UPDATE srm.bid_requests SET status = 'deleted', updated_at = NOW() WHERE id = $1 AND tenant_id = $2 AND status != 'deleted'", "srm"),
    )
    .bind(uuid)
    .bind(tenant_id)
    .execute(&mut **txn)
    .await;

    match result {
        Ok(row) if row.rows_affected() > 0 => Json(ApiResponse::success(
            serde_json::json!({}),
            "删除询价请求成功",
        )),
        Ok(_) => Json(ApiResponse::<serde_json::Value>::error(
            404,
            "询价请求不存在或已删除",
        )),
        Err(e) => {
            tracing::error!("删除询价请求失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(
                500,
                "删除询价请求失败",
            ))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["srm:bid_price:read"])),
    path = "/bid-requests/{id}/bids",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SRM/bid_price"
)]
pub async fn get_bid_request_bids(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(request_id): Path<String>,
    _headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::SupplierRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let request_uuid = match Uuid::parse_str(&request_id) {
        Ok(uuid) => uuid,
        Err(_) => {
            return Json(ApiResponse::<Vec<serde_json::Value>>::error(
                400,
                "询价请求ID格式错误",
            ));
        }
    };

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let _tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());

    let bids = sqlx::query_as::<_, Bid>(
        only_own_schema_query!("srm", r#"
        SELECT id, tenant_id, request_id, supplier_id, supplier_name, price, currency, valid_until, status, remarks, created_by, created_at, updated_at
        FROM srm.bids
        WHERE request_id = $1 AND ($2::uuid IS NULL OR tenant_id = $2) AND status != 'deleted'
        ORDER BY price ASC
        "#, "srm"),
    )
    .bind(request_uuid)
    .bind(tenant_opt)
    .fetch_all(&mut **txn)
    .await;

    match bids {
        Ok(rows) => {
            let results: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.id.to_string(),
                        "tenant_id": r.tenant_id.to_string(),
                        "request_id": r.request_id.to_string(),
                        "supplier_id": r.supplier_id.map(|u| u.to_string()),
                        "supplier_name": r.supplier_name,
                        "price": r.price.map(|p| p.to_string()),
                        "currency": r.currency,
                        "valid_until": r.valid_until.map(|d| d.to_string()),
                        "status": r.status,
                        "remarks": r.remarks,
                        "created_by": r.created_by.map(|u| u.to_string()),
                        "created_at": r.created_at.to_string(),
                        "updated_at": r.updated_at.to_string()
                    })
                })
                .collect();
            Json(ApiResponse::success(results, "获取报价列表成功"))
        }
        Err(e) => {
            tracing::error!("获取报价列表失败: {}", e);
            Json(ApiResponse::<Vec<serde_json::Value>>::error(
                500,
                "获取报价列表失败",
            ))
        }
    }
}

pub async fn create_bid(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(request_id): Path<String>,
    _headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::SupplierWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let request_uuid = match Uuid::parse_str(&request_id) {
        Ok(uuid) => uuid,
        Err(_) => {
            return Json(ApiResponse::<serde_json::Value>::error(
                400,
                "询价请求ID格式错误",
            ));
        }
    };

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());

    let supplier_id = body
        .get("supplier_id")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let supplier_name = body
        .get("supplier_name")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let price = body
        .get("price")
        .and_then(|v| v.as_f64())
        .map(|p| BigDecimal::from_f64(p).unwrap_or_default());
    let currency = body
        .get("currency")
        .and_then(|v| v.as_str())
        .unwrap_or("CNY");

    if supplier_id.is_empty() {
        return Json(ApiResponse::<serde_json::Value>::error(
            400,
            "供应商ID不能为空",
        ));
    }

    let supplier_uuid = match Uuid::parse_str(&supplier_id) {
        Ok(uuid) => uuid,
        Err(_) => {
            return Json(ApiResponse::<serde_json::Value>::error(
                400,
                "供应商ID格式错误",
            ));
        }
    };

    let result = sqlx::query_as::<_, Bid>(
        only_own_schema_query!("srm", r#"
        INSERT INTO srm.bids (tenant_id, request_id, supplier_id, supplier_name, price, currency, status, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)
        RETURNING id, tenant_id, request_id, supplier_id, supplier_name, price, currency, valid_until, status, remarks, created_by, created_at, updated_at
        "#, "srm"),
    )
    .bind(tenant_id)
    .bind(request_uuid)
    .bind(supplier_uuid)
    .bind(supplier_name)
    .bind(price)
    .bind(currency)
    .bind(claims.user_id().ok())
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(row) => {
            let data = serde_json::json!({
                "id": row.id.to_string(),
                "tenant_id": row.tenant_id.to_string(),
                "request_id": row.request_id.to_string(),
                "supplier_id": row.supplier_id.map(|u| u.to_string()),
                "supplier_name": row.supplier_name,
                "price": row.price.map(|p| p.to_string()),
                "currency": row.currency,
                "valid_until": row.valid_until.map(|d| d.to_string()),
                "status": row.status,
                "remarks": row.remarks,
                "created_by": row.created_by.map(|u| u.to_string()),
                "created_at": row.created_at.to_string(),
                "updated_at": row.updated_at.to_string()
            });
            Json(ApiResponse::success(data, "创建报价成功"))
        }
        Err(e) => {
            tracing::error!("创建报价失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(500, "创建报价失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["srm:bid_price:read"])),
    path = "/bids/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SRM/bid_price"
)]
pub async fn get_bid(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    _headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::SupplierRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let uuid = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => {
            return Json(ApiResponse::<serde_json::Value>::error(
                400,
                "报价ID格式错误",
            ));
        }
    };

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let _tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());

    let result = sqlx::query_as::<_, Bid>(
        only_own_schema_query!("srm", r#"
        SELECT id, tenant_id, request_id, supplier_id, supplier_name, price, currency, valid_until, status, remarks, created_by, created_at, updated_at
        FROM srm.bids
        WHERE id = $1 AND ($2::uuid IS NULL OR tenant_id = $2) AND status != 'deleted'
        "#, "srm"),
    )
    .bind(uuid)
    .bind(tenant_opt)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(row) => {
            let data = serde_json::json!({
                "id": row.id.to_string(),
                "tenant_id": row.tenant_id.to_string(),
                "request_id": row.request_id.to_string(),
                "supplier_id": row.supplier_id.map(|u| u.to_string()),
                "supplier_name": row.supplier_name,
                "price": row.price.map(|p| p.to_string()),
                "currency": row.currency,
                "valid_until": row.valid_until.map(|d| d.to_string()),
                "status": row.status,
                "remarks": row.remarks,
                "created_by": row.created_by.map(|u| u.to_string()),
                "created_at": row.created_at.to_string(),
                "updated_at": row.updated_at.to_string()
            });
            Json(ApiResponse::success(data, "获取报价成功"))
        }
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::<serde_json::Value>::error(
            404,
            "报价不存在或已删除",
        )),
        Err(e) => {
            tracing::error!("获取报价失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(500, "获取报价失败"))
        }
    }
}

pub async fn update_bid(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    _headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::SupplierWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let uuid = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => {
            return Json(ApiResponse::<serde_json::Value>::error(
                400,
                "报价ID格式错误",
            ));
        }
    };

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());

    let price = body
        .get("price")
        .and_then(|v| v.as_f64())
        .map(|p| BigDecimal::from_f64(p).unwrap_or_default());
    let currency = body.get("currency").and_then(|v| v.as_str());
    let status = body.get("status").and_then(|v| v.as_str());
    let remarks = body.get("remarks").and_then(|v| v.as_str());

    let result = sqlx::query_as::<_, Bid>(
        only_own_schema_query!("srm", r#"
        UPDATE srm.bids
        SET price = COALESCE($1, price), currency = COALESCE($2, currency),
            status = COALESCE($3, status), remarks = COALESCE($4, remarks),
            updated_at = NOW()
        WHERE id = $5 AND tenant_id = $6 AND status != 'deleted'
        RETURNING id, tenant_id, request_id, supplier_id, supplier_name, price, currency, valid_until, status, remarks, created_by, created_at, updated_at
        "#, "srm"),
    )
    .bind(price)
    .bind(currency)
    .bind(status)
    .bind(remarks)
    .bind(uuid)
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(row) => {
            let data = serde_json::json!({
                "id": row.id.to_string(),
                "tenant_id": row.tenant_id.to_string(),
                "request_id": row.request_id.to_string(),
                "supplier_id": row.supplier_id.map(|u| u.to_string()),
                "supplier_name": row.supplier_name,
                "price": row.price.map(|p| p.to_string()),
                "currency": row.currency,
                "valid_until": row.valid_until.map(|d| d.to_string()),
                "status": row.status,
                "remarks": row.remarks,
                "created_by": row.created_by.map(|u| u.to_string()),
                "created_at": row.created_at.to_string(),
                "updated_at": row.updated_at.to_string()
            });
            Json(ApiResponse::success(data, "更新报价成功"))
        }
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::<serde_json::Value>::error(
            404,
            "报价不存在或已删除",
        )),
        Err(e) => {
            tracing::error!("更新报价失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(500, "更新报价失败"))
        }
    }
}

pub async fn delete_bid(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    _headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::SupplierWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let uuid = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => {
            return Json(ApiResponse::<serde_json::Value>::error(
                400,
                "报价ID格式错误",
            ));
        }
    };

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());

    let result = sqlx::query(
        only_own_schema_query!("srm", "UPDATE srm.bids SET status = 'deleted', updated_at = NOW() WHERE id = $1 AND tenant_id = $2 AND status != 'deleted'", "srm"),
    )
    .bind(uuid)
    .bind(tenant_id)
    .execute(&mut **txn)
    .await;

    match result {
        Ok(row) if row.rows_affected() > 0 => {
            Json(ApiResponse::success(serde_json::json!({}), "删除报价成功"))
        }
        Ok(_) => Json(ApiResponse::<serde_json::Value>::error(
            404,
            "报价不存在或已删除",
        )),
        Err(e) => {
            tracing::error!("删除报价失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(500, "删除报价失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["srm:bid_price:read"])),
    path = "/bid-comparisons/{request_id}",
    params(
("request_id" = String, Path, description = "request_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SRM/bid_price"
)]
pub async fn get_bid_comparison(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(request_id): Path<String>,
    _headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::SupplierRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let request_uuid = match Uuid::parse_str(&request_id) {
        Ok(uuid) => uuid,
        Err(_) => {
            return Json(ApiResponse::<serde_json::Value>::error(
                400,
                "询价请求ID格式错误",
            ));
        }
    };

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let _tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());

    let bids = sqlx::query_as::<_, Bid>(
        only_own_schema_query!("srm", r#"
        SELECT id, tenant_id, request_id, supplier_id, supplier_name, price, currency, valid_until, status, remarks, created_by, created_at, updated_at
        FROM srm.bids
        WHERE request_id = $1 AND ($2::uuid IS NULL OR tenant_id = $2) AND status != 'deleted'
        ORDER BY price ASC
        "#, "srm"),
    )
    .bind(request_uuid)
    .bind(tenant_opt)
    .fetch_all(&mut **txn)
    .await;

    match bids {
        Ok(rows) => {
            let total_bids = rows.len();
            let prices: Vec<f64> = rows
                .iter()
                .filter_map(|r| r.price.as_ref().and_then(|p| p.to_f64()))
                .collect();
            let avg_price = if prices.is_empty() {
                0.0
            } else {
                prices.iter().sum::<f64>() / prices.len() as f64
            };
            let min_price = prices
                .iter()
                .min_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal))
                .copied();
            let max_price = prices
                .iter()
                .max_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal))
                .copied();

            let comparisons: Vec<serde_json::Value> = rows
                .into_iter()
                .enumerate()
                .map(|(index, r)| {
                    serde_json::json!({
                        "rank": index + 1,
                        "bid_id": r.id.to_string(),
                        "supplier_id": r.supplier_id.map(|u| u.to_string()),
                        "supplier_name": r.supplier_name,
                        "price": r.price.map(|p| p.to_string()),
                        "currency": r.currency,
                        "status": r.status,
                        "created_at": r.created_at.to_string()
                    })
                })
                .collect();

            let data = serde_json::json!({
                "request_id": request_id,
                "total_bids": total_bids,
                "avg_price": avg_price,
                "min_price": min_price,
                "max_price": max_price,
                "comparisons": comparisons
            });

            Json(ApiResponse::success(data, "获取报价对比成功"))
        }
        Err(e) => {
            tracing::error!("获取报价对比失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(
                500,
                "获取报价对比失败",
            ))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_bid_request() -> BidRequest {
        BidRequest {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            request_no: "BR-20260101-001".to_string(),
            title: "Test Bid Request".to_string(),
            description: Some("A test bid request".to_string()),
            deadline: Some(Utc::now()),
            status: "pending".to_string(),
            created_by: Some(Uuid::new_v4()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    fn sample_bid() -> Bid {
        Bid {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            request_id: Uuid::new_v4(),
            supplier_id: Some(Uuid::new_v4()),
            supplier_name: Some("Test Supplier".to_string()),
            price: Some(BigDecimal::from_f64(999.99).unwrap_or_default()),
            currency: Some("CNY".to_string()),
            valid_until: Some(Utc::now()),
            status: "pending".to_string(),
            remarks: Some("Test remarks".to_string()),
            created_by: Some(Uuid::new_v4()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    #[test]
    fn test_bid_request_serde_roundtrip() {
        let req = sample_bid_request();
        let json = serde_json::to_string(&req).unwrap();
        let deserialized: BidRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.request_no, req.request_no);
        assert_eq!(deserialized.title, req.title);
        assert_eq!(deserialized.status, req.status);
    }

    #[test]
    fn test_bid_request_serde_roundtrip_with_none() {
        let req = BidRequest {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            request_no: "BR-002".to_string(),
            title: "Minimal".to_string(),
            description: None,
            deadline: None,
            status: "draft".to_string(),
            created_by: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let json = serde_json::to_string(&req).unwrap();
        let deserialized: BidRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.description, None);
        assert_eq!(deserialized.deadline, None);
        assert_eq!(deserialized.created_by, None);
    }

    #[test]
    fn test_bid_request_clone() {
        let req = sample_bid_request();
        let cloned = req.clone();
        assert_eq!(cloned.request_no, req.request_no);
        assert_eq!(cloned.title, req.title);
    }

    #[test]
    fn test_bid_request_json_field_names() {
        let req = sample_bid_request();
        let json = serde_json::to_value(&req).unwrap();
        assert!(json.get("request_no").is_some());
        assert!(json.get("tenant_id").is_some());
        assert!(json.get("created_at").is_some());
    }

    #[test]
    fn test_bid_request_from_json_string() {
        let json_str = r#"{
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "tenant_id": "550e8400-e29b-41d4-a716-446655440001",
            "request_no": "BR-TEST",
            "title": "From JSON",
            "description": null,
            "deadline": null,
            "status": "pending",
            "created_by": null,
            "created_at": "2026-01-01T00:00:00Z",
            "updated_at": "2026-01-01T00:00:00Z"
        }"#;
        let req: BidRequest = serde_json::from_str(json_str).unwrap();
        assert_eq!(req.request_no, "BR-TEST");
        assert_eq!(req.title, "From JSON");
        assert_eq!(req.status, "pending");
    }

    #[test]
    fn test_bid_serde_roundtrip() {
        let bid = sample_bid();
        let json = serde_json::to_string(&bid).unwrap();
        let deserialized: Bid = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.status, bid.status);
        assert_eq!(deserialized.supplier_name, bid.supplier_name);
    }

    #[test]
    fn test_bid_serde_roundtrip_with_none() {
        let bid = Bid {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            request_id: Uuid::new_v4(),
            supplier_id: None,
            supplier_name: None,
            price: None,
            currency: None,
            valid_until: None,
            status: "pending".to_string(),
            remarks: None,
            created_by: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let json = serde_json::to_string(&bid).unwrap();
        let deserialized: Bid = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.supplier_id, None);
        assert_eq!(deserialized.price, None);
    }

    #[test]
    fn test_bid_clone() {
        let bid = sample_bid();
        let cloned = bid.clone();
        assert_eq!(cloned.status, bid.status);
        assert_eq!(cloned.supplier_name, bid.supplier_name);
    }

    #[test]
    fn test_bid_json_field_names() {
        let bid = sample_bid();
        let json = serde_json::to_value(&bid).unwrap();
        assert!(json.get("request_id").is_some());
        assert!(json.get("supplier_name").is_some());
        assert!(json.get("valid_until").is_some());
    }

    #[test]
    fn test_bid_from_json_string() {
        let json_str = r#"{
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "tenant_id": "550e8400-e29b-41d4-a716-446655440001",
            "request_id": "550e8400-e29b-41d4-a716-446655440002",
            "supplier_id": null,
            "supplier_name": null,
            "price": null,
            "currency": "CNY",
            "valid_until": null,
            "status": "active",
            "remarks": null,
            "created_by": null,
            "created_at": "2026-01-01T00:00:00Z",
            "updated_at": "2026-01-01T00:00:00Z"
        }"#;
        let bid: Bid = serde_json::from_str(json_str).unwrap();
        assert_eq!(bid.status, "active");
        assert_eq!(bid.currency, Some("CNY".to_string()));
    }

    #[test]
    fn test_bid_request_status_pending() {
        let req = sample_bid_request();
        assert_eq!(req.status, "pending");
    }

    #[test]
    fn test_bid_price_present() {
        let bid = sample_bid();
        assert!(bid.price.is_some());
    }
}

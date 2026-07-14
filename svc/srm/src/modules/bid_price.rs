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
use uuid::Uuid;

use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::ApiResponse;

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
            "/api/srm/bid-requests",
            get(list_bid_requests).post(create_bid_request),
        )
        .route(
            "/api/srm/bid-requests/{id}",
            get(get_bid_request)
                .put(update_bid_request)
                .delete(delete_bid_request),
        )
        .route(
            "/api/srm/bid-requests/{id}/bids",
            get(get_bid_request_bids).post(create_bid),
        )
        .route(
            "/api/srm/bids/{id}",
            get(get_bid).put(update_bid).delete(delete_bid),
        )
        .route(
            "/api/srm/bid-comparisons/{request_id}",
            get(get_bid_comparison),
        )
        .with_state(state);

    Ok(app)
}

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

async fn list_bid_requests(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    let requests = sqlx::query_as::<_, BidRequest>(
        r#"
        SELECT id, tenant_id, request_no, title, description, deadline, status, created_by, created_at, updated_at
        FROM plugin_srm.bid_requests
        WHERE tenant_id = $1 AND status != 'deleted'
        ORDER BY created_at DESC
        "#,
    )
    .bind(tenant_id)
    .fetch_all(&state.db)
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

async fn create_bid_request(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
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

    let tenant_id = get_tenant_id(&claims, &headers);
    let request_no = format!("BR-{}", chrono::Local::now().format("%Y%m%d%H%M%S"));

    let result = sqlx::query_as::<_, BidRequest>(
        r#"
        INSERT INTO plugin_srm.bid_requests (tenant_id, request_no, title, description, deadline, status, created_by)
        VALUES ($1, $2, $3, $4, $5, 'pending', $6)
        RETURNING id, tenant_id, request_no, title, description, deadline, status, created_by, created_at, updated_at
        "#,
    )
    .bind(tenant_id)
    .bind(request_no)
    .bind(title)
    .bind(description)
    .bind(deadline)
    .bind(claims.user_id().ok())
    .fetch_one(&state.db)
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

async fn get_bid_request(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
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

    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, BidRequest>(
        r#"
        SELECT id, tenant_id, request_no, title, description, deadline, status, created_by, created_at, updated_at
        FROM plugin_srm.bid_requests
        WHERE id = $1 AND tenant_id = $2 AND status != 'deleted'
        "#,
    )
    .bind(uuid)
    .bind(tenant_id)
    .fetch_one(&state.db)
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

async fn update_bid_request(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    headers: axum::http::HeaderMap,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
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

    let tenant_id = get_tenant_id(&claims, &headers);

    let title = body.get("title").and_then(|v| v.as_str());
    let description = body.get("description").and_then(|v| v.as_str());
    let status = body.get("status").and_then(|v| v.as_str());
    let deadline = body.get("deadline").and_then(|v| v.as_str()).and_then(|d| {
        chrono::DateTime::parse_from_rfc3339(d)
            .ok()
            .map(|d| d.with_timezone(&chrono::Utc))
    });

    let result = sqlx::query_as::<_, BidRequest>(
        r#"
        UPDATE plugin_srm.bid_requests
        SET title = COALESCE($1, title), description = COALESCE($2, description),
            status = COALESCE($3, status), deadline = COALESCE($4, deadline),
            updated_at = NOW()
        WHERE id = $5 AND tenant_id = $6 AND status != 'deleted'
        RETURNING id, tenant_id, request_no, title, description, deadline, status, created_by, created_at, updated_at
        "#,
    )
    .bind(title)
    .bind(description)
    .bind(status)
    .bind(deadline)
    .bind(uuid)
    .bind(tenant_id)
    .fetch_one(&state.db)
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

async fn delete_bid_request(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
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

    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query(
        "UPDATE plugin_srm.bid_requests SET status = 'deleted', updated_at = NOW() WHERE id = $1 AND tenant_id = $2 AND status != 'deleted'",
    )
    .bind(uuid)
    .bind(tenant_id)
    .execute(&state.db)
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

async fn get_bid_request_bids(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(request_id): Path<String>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
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

    let tenant_id = get_tenant_id(&claims, &headers);

    let bids = sqlx::query_as::<_, Bid>(
        r#"
        SELECT id, tenant_id, request_id, supplier_id, supplier_name, price, currency, valid_until, status, remarks, created_by, created_at, updated_at
        FROM plugin_srm.bids
        WHERE request_id = $1 AND tenant_id = $2 AND status != 'deleted'
        ORDER BY price ASC
        "#,
    )
    .bind(request_uuid)
    .bind(tenant_id)
    .fetch_all(&state.db)
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

async fn create_bid(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(request_id): Path<String>,
    headers: axum::http::HeaderMap,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
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

    let tenant_id = get_tenant_id(&claims, &headers);

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
        r#"
        INSERT INTO plugin_srm.bids (tenant_id, request_id, supplier_id, supplier_name, price, currency, status, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)
        RETURNING id, tenant_id, request_id, supplier_id, supplier_name, price, currency, valid_until, status, remarks, created_by, created_at, updated_at
        "#,
    )
    .bind(tenant_id)
    .bind(request_uuid)
    .bind(supplier_uuid)
    .bind(supplier_name)
    .bind(price)
    .bind(currency)
    .bind(claims.user_id().ok())
    .fetch_one(&state.db)
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

async fn get_bid(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
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

    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, Bid>(
        r#"
        SELECT id, tenant_id, request_id, supplier_id, supplier_name, price, currency, valid_until, status, remarks, created_by, created_at, updated_at
        FROM plugin_srm.bids
        WHERE id = $1 AND tenant_id = $2 AND status != 'deleted'
        "#,
    )
    .bind(uuid)
    .bind(tenant_id)
    .fetch_one(&state.db)
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

async fn update_bid(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    headers: axum::http::HeaderMap,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
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

    let tenant_id = get_tenant_id(&claims, &headers);

    let price = body
        .get("price")
        .and_then(|v| v.as_f64())
        .map(|p| BigDecimal::from_f64(p).unwrap_or_default());
    let currency = body.get("currency").and_then(|v| v.as_str());
    let status = body.get("status").and_then(|v| v.as_str());
    let remarks = body.get("remarks").and_then(|v| v.as_str());

    let result = sqlx::query_as::<_, Bid>(
        r#"
        UPDATE plugin_srm.bids
        SET price = COALESCE($1, price), currency = COALESCE($2, currency),
            status = COALESCE($3, status), remarks = COALESCE($4, remarks),
            updated_at = NOW()
        WHERE id = $5 AND tenant_id = $6 AND status != 'deleted'
        RETURNING id, tenant_id, request_id, supplier_id, supplier_name, price, currency, valid_until, status, remarks, created_by, created_at, updated_at
        "#,
    )
    .bind(price)
    .bind(currency)
    .bind(status)
    .bind(remarks)
    .bind(uuid)
    .bind(tenant_id)
    .fetch_one(&state.db)
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

async fn delete_bid(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
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

    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query(
        "UPDATE plugin_srm.bids SET status = 'deleted', updated_at = NOW() WHERE id = $1 AND tenant_id = $2 AND status != 'deleted'",
    )
    .bind(uuid)
    .bind(tenant_id)
    .execute(&state.db)
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

async fn get_bid_comparison(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(request_id): Path<String>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
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

    let tenant_id = get_tenant_id(&claims, &headers);

    let bids = sqlx::query_as::<_, Bid>(
        r#"
        SELECT id, tenant_id, request_id, supplier_id, supplier_name, price, currency, valid_until, status, remarks, created_by, created_at, updated_at
        FROM plugin_srm.bids
        WHERE request_id = $1 AND tenant_id = $2 AND status != 'deleted'
        ORDER BY price ASC
        "#,
    )
    .bind(request_uuid)
    .bind(tenant_id)
    .fetch_all(&state.db)
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

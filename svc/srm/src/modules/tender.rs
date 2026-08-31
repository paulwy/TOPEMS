use anyhow::Result;
use axum::{
    extract::{Extension, Path, State},
    routing::{get, post},
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
use topems_shared_auth::get_tenant_id;
use topems_shared_core::response::ApiResponse;

pub struct AppState {
    pub db: PgPool,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Tender {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub tender_no: String,
    pub title: String,
    pub description: Option<String>,
    pub r#type: String,
    pub budget: Option<BigDecimal>,
    pub status: String,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct TenderBid {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub tender_id: Uuid,
    pub supplier_id: Option<Uuid>,
    pub supplier_name: Option<String>,
    pub bid_price: Option<BigDecimal>,
    pub currency: Option<String>,
    pub technical_score: Option<BigDecimal>,
    pub commercial_score: Option<BigDecimal>,
    pub total_score: Option<BigDecimal>,
    pub status: String,
    pub remarks: Option<String>,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct TenderAward {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub award_no: String,
    pub tender_id: Uuid,
    pub bid_id: Option<Uuid>,
    pub supplier_id: Option<Uuid>,
    pub supplier_name: Option<String>,
    pub award_price: Option<BigDecimal>,
    pub currency: Option<String>,
    pub status: String,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

pub async fn create_routes(db: PgPool) -> Result<Router> {
    let state = Arc::new(AppState { db });

    let app = Router::new()
        .route("/tenders", get(list_tenders).post(create_tender))
        .route(
            "/tenders/{id}",
            get(get_tender).put(update_tender).delete(delete_tender),
        )
        .route(
            "/tenders/{id}/bids",
            get(get_tender_bids).post(create_tender_bid),
        )
        .route("/tenders/{id}/award", post(award_tender))
        .route("/tender-awards", get(list_tender_awards))
        .with_state(state);

    Ok(app)
}

async fn list_tenders(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    let tenders = sqlx::query_as::<_, Tender>(
        only_own_schema_query!("srm", r#"
        SELECT id, tenant_id, tender_no, title, description, type, budget, status, start_date, end_date, created_by, created_at, updated_at
        FROM tenders
        WHERE tenant_id = $1 AND status != 'deleted'
        ORDER BY created_at DESC
        "#),
    )
    .bind(tenant_id)
    .fetch_all(&state.db)
    .await;

    match tenders {
        Ok(rows) => {
            let results: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.id.to_string(),
                        "tenant_id": r.tenant_id.to_string(),
                        "tender_no": r.tender_no,
                        "title": r.title,
                        "description": r.description,
                        "type": r.r#type,
                        "budget": r.budget.map(|b| b.to_string()),
                        "status": r.status,
                        "start_date": r.start_date.map(|d| d.to_string()),
                        "end_date": r.end_date.map(|d| d.to_string()),
                        "created_by": r.created_by.map(|u| u.to_string()),
                        "created_at": r.created_at.to_string(),
                        "updated_at": r.updated_at.to_string()
                    })
                })
                .collect();
            Json(ApiResponse::success(results, "获取招标列表成功"))
        }
        Err(e) => {
            tracing::error!("获取招标列表失败: {}", e);
            Json(ApiResponse::<Vec<serde_json::Value>>::error(
                500,
                "获取招标列表失败",
            ))
        }
    }
}

async fn create_tender(
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
    let tender_type = body.get("type").and_then(|v| v.as_str()).unwrap_or("open");
    let budget = body
        .get("budget")
        .and_then(|v| v.as_f64())
        .map(|b| BigDecimal::from_f64(b).unwrap_or_default());
    let start_date = body
        .get("start_date")
        .and_then(|v| v.as_str())
        .and_then(|d| {
            chrono::DateTime::parse_from_rfc3339(d)
                .ok()
                .map(|d| d.with_timezone(&chrono::Utc))
        });
    let end_date = body.get("end_date").and_then(|v| v.as_str()).and_then(|d| {
        chrono::DateTime::parse_from_rfc3339(d)
            .ok()
            .map(|d| d.with_timezone(&chrono::Utc))
    });

    if title.is_empty() {
        return Json(ApiResponse::<serde_json::Value>::error(
            400,
            "招标标题不能为空",
        ));
    }

    let tenant_id = get_tenant_id(&claims, &headers);
    let tender_no = format!("TN-{}", chrono::Local::now().format("%Y%m%d%H%M%S"));

    let result = sqlx::query_as::<_, Tender>(
        only_own_schema_query!("srm", r#"
        INSERT INTO tenders (tenant_id, tender_no, title, description, type, budget, start_date, end_date, status, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft', $9)
        RETURNING id, tenant_id, tender_no, title, description, type, budget, status, start_date, end_date, created_by, created_at, updated_at
        "#),
    )
    .bind(tenant_id)
    .bind(tender_no)
    .bind(title)
    .bind(description)
    .bind(tender_type)
    .bind(budget)
    .bind(start_date)
    .bind(end_date)
    .bind(claims.user_id().ok())
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(row) => {
            let data = serde_json::json!({
                "id": row.id.to_string(),
                "tenant_id": row.tenant_id.to_string(),
                "tender_no": row.tender_no,
                "title": row.title,
                "description": row.description,
                "type": row.r#type,
                "budget": row.budget.map(|b| b.to_string()),
                "status": row.status,
                "start_date": row.start_date.map(|d| d.to_string()),
                "end_date": row.end_date.map(|d| d.to_string()),
                "created_by": row.created_by.map(|u| u.to_string()),
                "created_at": row.created_at.to_string(),
                "updated_at": row.updated_at.to_string()
            });
            Json(ApiResponse::success(data, "创建招标成功"))
        }
        Err(e) => {
            tracing::error!("创建招标失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(500, "创建招标失败"))
        }
    }
}

async fn get_tender(
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
                "招标ID格式错误",
            ));
        }
    };

    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, Tender>(
        only_own_schema_query!("srm", r#"
        SELECT id, tenant_id, tender_no, title, description, type, budget, status, start_date, end_date, created_by, created_at, updated_at
        FROM tenders
        WHERE id = $1 AND tenant_id = $2 AND status != 'deleted'
        "#),
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
                "tender_no": row.tender_no,
                "title": row.title,
                "description": row.description,
                "type": row.r#type,
                "budget": row.budget.map(|b| b.to_string()),
                "status": row.status,
                "start_date": row.start_date.map(|d| d.to_string()),
                "end_date": row.end_date.map(|d| d.to_string()),
                "created_by": row.created_by.map(|u| u.to_string()),
                "created_at": row.created_at.to_string(),
                "updated_at": row.updated_at.to_string()
            });
            Json(ApiResponse::success(data, "获取招标成功"))
        }
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::<serde_json::Value>::error(
            404,
            "招标不存在或已删除",
        )),
        Err(e) => {
            tracing::error!("获取招标失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(500, "获取招标失败"))
        }
    }
}

async fn update_tender(
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
                "招标ID格式错误",
            ));
        }
    };

    let tenant_id = get_tenant_id(&claims, &headers);

    let title = body.get("title").and_then(|v| v.as_str());
    let description = body.get("description").and_then(|v| v.as_str());
    let tender_type = body.get("type").and_then(|v| v.as_str());
    let budget = body
        .get("budget")
        .and_then(|v| v.as_f64())
        .map(|b| BigDecimal::from_f64(b).unwrap_or_default());
    let status = body.get("status").and_then(|v| v.as_str());
    let start_date = body
        .get("start_date")
        .and_then(|v| v.as_str())
        .and_then(|d| {
            chrono::DateTime::parse_from_rfc3339(d)
                .ok()
                .map(|d| d.with_timezone(&chrono::Utc))
        });
    let end_date = body.get("end_date").and_then(|v| v.as_str()).and_then(|d| {
        chrono::DateTime::parse_from_rfc3339(d)
            .ok()
            .map(|d| d.with_timezone(&chrono::Utc))
    });

    let result = sqlx::query_as::<_, Tender>(
        only_own_schema_query!("srm", r#"
        UPDATE tenders
        SET title = COALESCE($1, title), description = COALESCE($2, description),
            type = COALESCE($3, type), budget = COALESCE($4, budget),
            status = COALESCE($5, status), start_date = COALESCE($6, start_date),
            end_date = COALESCE($7, end_date), updated_at = NOW()
        WHERE id = $8 AND tenant_id = $9 AND status != 'deleted'
        RETURNING id, tenant_id, tender_no, title, description, type, budget, status, start_date, end_date, created_by, created_at, updated_at
        "#),
    )
    .bind(title)
    .bind(description)
    .bind(tender_type)
    .bind(budget)
    .bind(status)
    .bind(start_date)
    .bind(end_date)
    .bind(uuid)
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(row) => {
            let data = serde_json::json!({
                "id": row.id.to_string(),
                "tenant_id": row.tenant_id.to_string(),
                "tender_no": row.tender_no,
                "title": row.title,
                "description": row.description,
                "type": row.r#type,
                "budget": row.budget.map(|b| b.to_string()),
                "status": row.status,
                "start_date": row.start_date.map(|d| d.to_string()),
                "end_date": row.end_date.map(|d| d.to_string()),
                "created_by": row.created_by.map(|u| u.to_string()),
                "created_at": row.created_at.to_string(),
                "updated_at": row.updated_at.to_string()
            });
            Json(ApiResponse::success(data, "更新招标成功"))
        }
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::<serde_json::Value>::error(
            404,
            "招标不存在或已删除",
        )),
        Err(e) => {
            tracing::error!("更新招标失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(500, "更新招标失败"))
        }
    }
}

async fn delete_tender(
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
                "招标ID格式错误",
            ));
        }
    };

    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query(
        only_own_schema_query!("srm", "UPDATE tenders SET status = 'deleted', updated_at = NOW() WHERE id = $1 AND tenant_id = $2 AND status != 'deleted'"),
    )
    .bind(uuid)
    .bind(tenant_id)
    .execute(&state.db)
    .await;

    match result {
        Ok(row) if row.rows_affected() > 0 => {
            Json(ApiResponse::success(serde_json::json!({}), "删除招标成功"))
        }
        Ok(_) => Json(ApiResponse::<serde_json::Value>::error(
            404,
            "招标不存在或已删除",
        )),
        Err(e) => {
            tracing::error!("删除招标失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(500, "删除招标失败"))
        }
    }
}

async fn get_tender_bids(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(tender_id): Path<String>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tender_uuid = match Uuid::parse_str(&tender_id) {
        Ok(uuid) => uuid,
        Err(_) => {
            return Json(ApiResponse::<Vec<serde_json::Value>>::error(
                400,
                "招标ID格式错误",
            ));
        }
    };

    let tenant_id = get_tenant_id(&claims, &headers);

    let bids = sqlx::query_as::<_, TenderBid>(
        only_own_schema_query!("srm", r#"
        SELECT id, tenant_id, tender_id, supplier_id, supplier_name, bid_price, currency, technical_score, commercial_score, total_score, status, remarks, created_by, created_at, updated_at
        FROM tender_bids
        WHERE tender_id = $1 AND tenant_id = $2 AND status != 'deleted'
        ORDER BY total_score DESC
        "#),
    )
    .bind(tender_uuid)
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
                        "tender_id": r.tender_id.to_string(),
                        "supplier_id": r.supplier_id.map(|u| u.to_string()),
                        "supplier_name": r.supplier_name,
                        "bid_price": r.bid_price.map(|p| p.to_string()),
                        "currency": r.currency,
                        "technical_score": r.technical_score.map(|s| s.to_string()),
                        "commercial_score": r.commercial_score.map(|s| s.to_string()),
                        "total_score": r.total_score.map(|s| s.to_string()),
                        "status": r.status,
                        "remarks": r.remarks,
                        "created_by": r.created_by.map(|u| u.to_string()),
                        "created_at": r.created_at.to_string(),
                        "updated_at": r.updated_at.to_string()
                    })
                })
                .collect();
            Json(ApiResponse::success(results, "获取投标列表成功"))
        }
        Err(e) => {
            tracing::error!("获取投标列表失败: {}", e);
            Json(ApiResponse::<Vec<serde_json::Value>>::error(
                500,
                "获取投标列表失败",
            ))
        }
    }
}

async fn create_tender_bid(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(tender_id): Path<String>,
    headers: axum::http::HeaderMap,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tender_uuid = match Uuid::parse_str(&tender_id) {
        Ok(uuid) => uuid,
        Err(_) => {
            return Json(ApiResponse::<serde_json::Value>::error(
                400,
                "招标ID格式错误",
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
    let bid_price = body
        .get("bid_price")
        .and_then(|v| v.as_f64())
        .map(|b| BigDecimal::from_f64(b).unwrap_or_default());
    let currency = body
        .get("currency")
        .and_then(|v| v.as_str())
        .unwrap_or("CNY");
    let technical_score = body
        .get("technical_score")
        .and_then(|v| v.as_f64())
        .map(|s| BigDecimal::from_f64(s).unwrap_or_default());
    let commercial_score = body
        .get("commercial_score")
        .and_then(|v| v.as_f64())
        .map(|s| BigDecimal::from_f64(s).unwrap_or_default());

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

    let total_score = match (technical_score.as_ref(), commercial_score.as_ref()) {
        (Some(ts), Some(cs)) => {
            let ts_val = ts.to_f64().unwrap_or(0.0);
            let cs_val = cs.to_f64().unwrap_or(0.0);
            BigDecimal::from_f64(ts_val * 0.6 + cs_val * 0.4).unwrap_or_default()
        }
        _ => BigDecimal::from(0),
    };

    let result = sqlx::query_as::<_, TenderBid>(
        only_own_schema_query!("srm", r#"
        INSERT INTO tender_bids (tenant_id, tender_id, supplier_id, supplier_name, bid_price, currency, technical_score, commercial_score, total_score, status, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', $10)
        RETURNING id, tenant_id, tender_id, supplier_id, supplier_name, bid_price, currency, technical_score, commercial_score, total_score, status, remarks, created_by, created_at, updated_at
        "#),
    )
    .bind(tenant_id)
    .bind(tender_uuid)
    .bind(supplier_uuid)
    .bind(supplier_name)
    .bind(bid_price)
    .bind(currency)
    .bind(technical_score)
    .bind(commercial_score)
    .bind(total_score)
    .bind(claims.user_id().ok())
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(row) => {
            let data = serde_json::json!({
                "id": row.id.to_string(),
                "tenant_id": row.tenant_id.to_string(),
                "tender_id": row.tender_id.to_string(),
                "supplier_id": row.supplier_id.map(|u| u.to_string()),
                "supplier_name": row.supplier_name,
                "bid_price": row.bid_price.map(|p| p.to_string()),
                "currency": row.currency,
                "technical_score": row.technical_score.map(|s| s.to_string()),
                "commercial_score": row.commercial_score.map(|s| s.to_string()),
                "total_score": row.total_score.map(|s| s.to_string()),
                "status": row.status,
                "remarks": row.remarks,
                "created_by": row.created_by.map(|u| u.to_string()),
                "created_at": row.created_at.to_string(),
                "updated_at": row.updated_at.to_string()
            });
            Json(ApiResponse::success(data, "创建投标成功"))
        }
        Err(e) => {
            tracing::error!("创建投标失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(500, "创建投标失败"))
        }
    }
}

async fn award_tender(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(tender_id): Path<String>,
    headers: axum::http::HeaderMap,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tender_uuid = match Uuid::parse_str(&tender_id) {
        Ok(uuid) => uuid,
        Err(_) => {
            return Json(ApiResponse::<serde_json::Value>::error(
                400,
                "招标ID格式错误",
            ));
        }
    };

    let tenant_id = get_tenant_id(&claims, &headers);

    let winning_bid_id = body
        .get("winning_bid_id")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    if winning_bid_id.is_empty() {
        return Json(ApiResponse::<serde_json::Value>::error(
            400,
            "中标投标ID不能为空",
        ));
    }

    let winning_bid_uuid = match Uuid::parse_str(&winning_bid_id) {
        Ok(uuid) => uuid,
        Err(_) => {
            return Json(ApiResponse::<serde_json::Value>::error(
                400,
                "中标投标ID格式错误",
            ));
        }
    };

    let bid_result = sqlx::query_as::<_, TenderBid>(
        only_own_schema_query!("srm", r#"
        SELECT id, tenant_id, tender_id, supplier_id, supplier_name, bid_price, currency, technical_score, commercial_score, total_score, status, remarks, created_by, created_at, updated_at
        FROM tender_bids
        WHERE id = $1 AND tender_id = $2 AND tenant_id = $3 AND status != 'deleted'
        "#),
    )
    .bind(winning_bid_uuid)
    .bind(tender_uuid)
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await;

    let bid = match bid_result {
        Ok(bid) => bid,
        Err(sqlx::Error::RowNotFound) => {
            return Json(ApiResponse::<serde_json::Value>::error(
                404,
                "投标不存在或不属于该招标",
            ))
        }
        Err(e) => {
            tracing::error!("查询投标失败: {}", e);
            return Json(ApiResponse::<serde_json::Value>::error(500, "查询投标失败"));
        }
    };

    let transaction = state.db.begin().await;

    match transaction {
        Ok(mut tx) => {
            if let Err(e) = sqlx::query(
                only_own_schema_query!("srm", "UPDATE tenders SET status = 'awarded', updated_at = NOW() WHERE id = $1 AND tenant_id = $2"),
            )
            .bind(tender_uuid)
            .bind(tenant_id)
            .execute(&mut *tx)
            .await
            {
                tracing::error!("更新招标状态失败: {}", e);
                tx.rollback().await.unwrap_or_else(|e| tracing::warn!("事务回滚失败: {}", e));
                return Json(ApiResponse::<serde_json::Value>::error(500, "中标处理失败"));
            }

            if let Err(e) = sqlx::query(
                only_own_schema_query!("srm", "UPDATE tender_bids SET status = CASE WHEN id = $1 THEN 'won' ELSE 'lost' END, updated_at = NOW() WHERE tender_id = $2 AND tenant_id = $3"),
            )
            .bind(winning_bid_uuid)
            .bind(tender_uuid)
            .bind(tenant_id)
            .execute(&mut *tx)
            .await
            {
                tracing::error!("更新投标状态失败: {}", e);
                tx.rollback().await.unwrap_or_else(|e| tracing::warn!("事务回滚失败: {}", e));
                return Json(ApiResponse::<serde_json::Value>::error(500, "中标处理失败"));
            }

            let award_no = format!("AW-{}", chrono::Local::now().format("%Y%m%d%H%M%S"));

            let award_result = sqlx::query_as::<_, TenderAward>(
                only_own_schema_query!("srm", r#"
                INSERT INTO tender_awards (tenant_id, award_no, tender_id, bid_id, supplier_id, supplier_name, award_price, currency, status, created_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9)
                RETURNING id, tenant_id, award_no, tender_id, bid_id, supplier_id, supplier_name, award_price, currency, status, created_by, created_at, updated_at
                "#),
            )
            .bind(tenant_id)
            .bind(&award_no)
            .bind(tender_uuid)
            .bind(winning_bid_uuid)
            .bind(bid.supplier_id)
            .bind(bid.supplier_name.clone())
            .bind(bid.bid_price.clone())
            .bind(bid.currency.clone())
            .bind(claims.user_id().ok())
            .fetch_one(&mut *tx)
            .await;

            let award = match award_result {
                Ok(award) => award,
                Err(e) => {
                    tracing::error!("创建中标记录失败: {}", e);
                    tx.rollback()
                        .await
                        .unwrap_or_else(|e| tracing::warn!("事务回滚失败: {}", e));
                    return Json(ApiResponse::<serde_json::Value>::error(500, "中标处理失败"));
                }
            };

            if tx.commit().await.is_err() {
                return Json(ApiResponse::<serde_json::Value>::error(500, "中标处理失败"));
            }

            let data = serde_json::json!({
                "award_no": award.award_no,
                "tender_id": tender_id,
                "winning_bid_id": winning_bid_id,
                "supplier_id": award.supplier_id.map(|u| u.to_string()),
                "supplier_name": award.supplier_name,
                "award_price": award.award_price.map(|p| p.to_string()),
                "currency": award.currency,
                "status": award.status
            });

            Json(ApiResponse::success(data, "中标处理成功"))
        }
        Err(e) => {
            tracing::error!("开启事务失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(500, "中标处理失败"))
        }
    }
}

async fn list_tender_awards(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    let awards = sqlx::query_as::<_, TenderAward>(
        only_own_schema_query!("srm", r#"
        SELECT id, tenant_id, award_no, tender_id, bid_id, supplier_id, supplier_name, award_price, currency, status, created_by, created_at, updated_at
        FROM tender_awards
        WHERE tenant_id = $1 AND status != 'deleted'
        ORDER BY created_at DESC
        "#),
    )
    .bind(tenant_id)
    .fetch_all(&state.db)
    .await;

    match awards {
        Ok(rows) => {
            let results: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.id.to_string(),
                        "tenant_id": r.tenant_id.to_string(),
                        "award_no": r.award_no,
                        "tender_id": r.tender_id.to_string(),
                        "bid_id": r.bid_id.map(|u| u.to_string()),
                        "supplier_id": r.supplier_id.map(|u| u.to_string()),
                        "supplier_name": r.supplier_name,
                        "award_price": r.award_price.map(|p| p.to_string()),
                        "currency": r.currency,
                        "status": r.status,
                        "created_by": r.created_by.map(|u| u.to_string()),
                        "created_at": r.created_at.to_string(),
                        "updated_at": r.updated_at.to_string()
                    })
                })
                .collect();
            Json(ApiResponse::success(results, "获取中标结果列表成功"))
        }
        Err(e) => {
            tracing::error!("获取中标结果列表失败: {}", e);
            Json(ApiResponse::<Vec<serde_json::Value>>::error(
                500,
                "获取中标结果列表失败",
            ))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use bigdecimal::FromPrimitive;

    fn sample_tender() -> Tender {
        Tender {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            tender_no: "TD-20260101-001".to_string(),
            title: "Test Tender".to_string(),
            description: Some("A test tender".to_string()),
            r#type: "public".to_string(),
            budget: Some(BigDecimal::from_f64(100000.0).unwrap_or_default()),
            status: "draft".to_string(),
            start_date: Some(Utc::now()),
            end_date: Some(Utc::now()),
            created_by: Some(Uuid::new_v4()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    fn sample_tender_bid() -> TenderBid {
        TenderBid {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            tender_id: Uuid::new_v4(),
            supplier_id: Some(Uuid::new_v4()),
            supplier_name: Some("Test Supplier".to_string()),
            bid_price: Some(BigDecimal::from_f64(95000.0).unwrap_or_default()),
            currency: Some("CNY".to_string()),
            technical_score: Some(BigDecimal::from_f64(85.0).unwrap_or_default()),
            commercial_score: Some(BigDecimal::from_f64(90.0).unwrap_or_default()),
            total_score: Some(BigDecimal::from_f64(87.5).unwrap_or_default()),
            status: "pending".to_string(),
            remarks: Some("Good bid".to_string()),
            created_by: Some(Uuid::new_v4()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    fn sample_tender_award() -> TenderAward {
        TenderAward {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            award_no: "AW-20260101-001".to_string(),
            tender_id: Uuid::new_v4(),
            bid_id: Some(Uuid::new_v4()),
            supplier_id: Some(Uuid::new_v4()),
            supplier_name: Some("Winning Supplier".to_string()),
            award_price: Some(BigDecimal::from_f64(95000.0).unwrap_or_default()),
            currency: Some("CNY".to_string()),
            status: "active".to_string(),
            created_by: Some(Uuid::new_v4()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    #[test]
    fn test_tender_serde_roundtrip() {
        let tender = sample_tender();
        let json = serde_json::to_string(&tender).unwrap();
        let deserialized: Tender = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.tender_no, tender.tender_no);
        assert_eq!(deserialized.title, tender.title);
        assert_eq!(deserialized.r#type, tender.r#type);
    }

    #[test]
    fn test_tender_serde_roundtrip_with_none() {
        let tender = Tender {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            tender_no: "TD-002".to_string(),
            title: "Minimal".to_string(),
            description: None,
            r#type: "private".to_string(),
            budget: None,
            status: "draft".to_string(),
            start_date: None,
            end_date: None,
            created_by: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let json = serde_json::to_string(&tender).unwrap();
        let deserialized: Tender = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.description, None);
        assert_eq!(deserialized.budget, None);
    }

    #[test]
    fn test_tender_clone() {
        let tender = sample_tender();
        let cloned = tender.clone();
        assert_eq!(cloned.tender_no, tender.tender_no);
        assert_eq!(cloned.title, tender.title);
    }

    #[test]
    fn test_tender_json_field_names() {
        let tender = sample_tender();
        let json = serde_json::to_value(&tender).unwrap();
        assert!(json.get("tender_no").is_some());
        assert!(json.get("tenant_id").is_some());
        assert!(json.get("type").is_some());
    }

    #[test]
    fn test_tender_from_json_string() {
        let json_str = r#"{
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "tenant_id": "550e8400-e29b-41d4-a716-446655440001",
            "tender_no": "TD-JSON",
            "title": "From JSON",
            "description": null,
            "type": "public",
            "budget": null,
            "status": "draft",
            "start_date": null,
            "end_date": null,
            "created_by": null,
            "created_at": "2026-01-01T00:00:00Z",
            "updated_at": "2026-01-01T00:00:00Z"
        }"#;
        let tender: Tender = serde_json::from_str(json_str).unwrap();
        assert_eq!(tender.tender_no, "TD-JSON");
        assert_eq!(tender.r#type, "public");
    }

    #[test]
    fn test_tender_bid_serde_roundtrip() {
        let bid = sample_tender_bid();
        let json = serde_json::to_string(&bid).unwrap();
        let deserialized: TenderBid = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.status, bid.status);
        assert_eq!(deserialized.supplier_name, bid.supplier_name);
    }

    #[test]
    fn test_tender_bid_serde_roundtrip_with_none() {
        let bid = TenderBid {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            tender_id: Uuid::new_v4(),
            supplier_id: None,
            supplier_name: None,
            bid_price: None,
            currency: None,
            technical_score: None,
            commercial_score: None,
            total_score: None,
            status: "pending".to_string(),
            remarks: None,
            created_by: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let json = serde_json::to_string(&bid).unwrap();
        let deserialized: TenderBid = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.supplier_id, None);
        assert_eq!(deserialized.bid_price, None);
    }

    #[test]
    fn test_tender_bid_clone() {
        let bid = sample_tender_bid();
        let cloned = bid.clone();
        assert_eq!(cloned.status, bid.status);
    }

    #[test]
    fn test_tender_bid_json_field_names() {
        let bid = sample_tender_bid();
        let json = serde_json::to_value(&bid).unwrap();
        assert!(json.get("tender_id").is_some());
        assert!(json.get("technical_score").is_some());
        assert!(json.get("total_score").is_some());
    }

    #[test]
    fn test_tender_award_serde_roundtrip() {
        let award = sample_tender_award();
        let json = serde_json::to_string(&award).unwrap();
        let deserialized: TenderAward = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.award_no, award.award_no);
        assert_eq!(deserialized.status, award.status);
    }

    #[test]
    fn test_tender_award_clone() {
        let award = sample_tender_award();
        let cloned = award.clone();
        assert_eq!(cloned.award_no, award.award_no);
    }

    #[test]
    fn test_tender_award_json_field_names() {
        let award = sample_tender_award();
        let json = serde_json::to_value(&award).unwrap();
        assert!(json.get("award_no").is_some());
        assert!(json.get("tender_id").is_some());
        assert!(json.get("award_price").is_some());
    }

    #[test]
    fn test_tender_status_draft() {
        let tender = sample_tender();
        assert_eq!(tender.status, "draft");
    }

    #[test]
    fn test_tender_bid_status_pending() {
        let bid = sample_tender_bid();
        assert_eq!(bid.status, "pending");
    }

    #[test]
    fn test_tender_award_status_active() {
        let award = sample_tender_award();
        assert_eq!(award.status, "active");
    }
}

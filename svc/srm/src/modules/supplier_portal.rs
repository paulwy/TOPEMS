use axum::{extract::Path, Extension, Json, Router};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{query, query_as, PgPool};
use std::sync::Arc;
use topems_shared::response::ApiResponse;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct SupplierPortalInfo {
    pub id: Uuid,
    pub supplier_no: String,
    pub name: String,
    pub legal_name: Option<String>,
    pub status: String,
    pub tax_id: Option<String>,
    pub address: Option<String>,
    pub contact_person: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub website: Option<String>,
    pub credit_rating: Option<String>,
    pub risk_level: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct SupplierOrderSummary {
    pub supplier_id: Uuid,
    pub total_orders: i64,
    pub total_amount: Option<f64>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct SupplierContractSummary {
    pub supplier_id: Uuid,
    pub total_contracts: i64,
    pub total_amount: Option<f64>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct SupplierEvaluationSummary {
    pub supplier_id: Uuid,
    pub avg_score: Option<f64>,
    pub latest_score: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateSupplierInfoRequest {
    pub contact_person: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub website: Option<String>,
    pub address: Option<String>,
}

pub struct AppState {
    pub db: PgPool,
}

async fn get_supplier_info(
    Path(id): Path<Uuid>,
    Extension(state): Extension<Arc<AppState>>,
) -> Json<ApiResponse<SupplierPortalInfo>> {
    let query = "SELECT * FROM plugin_srm.suppliers WHERE id = $1";
    let supplier = sqlx::query_as::<_, SupplierPortalInfo>(query)
        .bind(id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| ApiResponse::error(500, &format!("查询供应商信息失败: {}", e)));

    match supplier {
        Ok(Some(supplier)) => Json(ApiResponse::success(supplier)),
        Ok(None) => Json(ApiResponse::error(404, "供应商不存在")),
        Err(e) => e,
    }
}

async fn update_supplier_info(
    Path(id): Path<Uuid>,
    Extension(state): Extension<Arc<AppState>>,
    Json(req): Json<UpdateSupplierInfoRequest>,
) -> Json<ApiResponse<SupplierPortalInfo>> {
    let query = r#"
        UPDATE plugin_srm.suppliers
        SET contact_person = COALESCE($2, contact_person),
            phone = COALESCE($3, phone),
            email = COALESCE($4, email),
            website = COALESCE($5, website),
            address = COALESCE($6, address),
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
        "#;

    let supplier = sqlx::query_as::<_, SupplierPortalInfo>(query)
        .bind(id)
        .bind(req.contact_person)
        .bind(req.phone)
        .bind(req.email)
        .bind(req.website)
        .bind(req.address)
        .fetch_one(&state.db)
        .await
        .map_err(|e| ApiResponse::error(500, &format!("更新供应商信息失败: {}", e)));

    match supplier {
        Ok(supplier) => Json(ApiResponse::success(supplier)),
        Err(e) => e,
    }
}

async fn get_supplier_orders(
    Path(id): Path<Uuid>,
    Extension(state): Extension<Arc<AppState>>,
) -> Json<ApiResponse<SupplierOrderSummary>> {
    let query = r#"
        SELECT supplier_id, COUNT(*) as total_orders, COALESCE(SUM(total_amount), 0) as total_amount
        FROM plugin_srm.purchase_orders
        WHERE supplier_id = $1
        GROUP BY supplier_id
        "#;

    let summary = sqlx::query_as::<_, SupplierOrderSummary>(query)
        .bind(id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| ApiResponse::error(500, &format!("查询订单统计失败: {}", e)));

    match summary {
        Ok(Some(summary)) => Json(ApiResponse::success(summary)),
        Ok(None) => Json(ApiResponse::success(SupplierOrderSummary {
            supplier_id: id,
            total_orders: 0,
            total_amount: Some(0.0),
        })),
        Err(e) => e,
    }
}

async fn get_supplier_contracts(
    Path(id): Path<Uuid>,
    Extension(state): Extension<Arc<AppState>>,
) -> Json<ApiResponse<SupplierContractSummary>> {
    let query = r#"
        SELECT supplier_id, COUNT(*) as total_contracts, COALESCE(SUM(total_amount), 0) as total_amount
        FROM plugin_srm.supplier_contracts
        WHERE supplier_id = $1
        GROUP BY supplier_id
        "#;

    let summary = sqlx::query_as::<_, SupplierContractSummary>(query)
        .bind(id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| ApiResponse::error(500, &format!("查询合同统计失败: {}", e)));

    match summary {
        Ok(Some(summary)) => Json(ApiResponse::success(summary)),
        Ok(None) => Json(ApiResponse::success(SupplierContractSummary {
            supplier_id: id,
            total_contracts: 0,
            total_amount: Some(0.0),
        })),
        Err(e) => e,
    }
}

async fn get_supplier_evaluations(
    Path(id): Path<Uuid>,
    Extension(state): Extension<Arc<AppState>>,
) -> Json<ApiResponse<SupplierEvaluationSummary>> {
    let query = r#"
        SELECT supplier_id, AVG(overall_score) as avg_score, (SELECT overall_score FROM plugin_srm.supplier_evaluations WHERE supplier_id = $1 ORDER BY created_at DESC LIMIT 1) as latest_score
        FROM plugin_srm.supplier_evaluations
        WHERE supplier_id = $1
        GROUP BY supplier_id
        "#;

    let summary = sqlx::query_as::<_, SupplierEvaluationSummary>(query)
        .bind(id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| ApiResponse::error(500, &format!("查询评价统计失败: {}", e)));

    match summary {
        Ok(Some(summary)) => Json(ApiResponse::success(summary)),
        Ok(None) => Json(ApiResponse::success(SupplierEvaluationSummary {
            supplier_id: id,
            avg_score: None,
            latest_score: None,
        })),
        Err(e) => e,
    }
}

pub async fn create_routes(db: PgPool) -> Result<Router, Box<dyn std::error::Error>> {
    let state = Arc::new(AppState { db });

    let app = Router::new()
        .route(
            "/api/srm/portal/suppliers/:id",
            get(get_supplier_info).put(update_supplier_info),
        )
        .route(
            "/api/srm/portal/suppliers/:id/orders",
            get(get_supplier_orders),
        )
        .route(
            "/api/srm/portal/suppliers/:id/contracts",
            get(get_supplier_contracts),
        )
        .route(
            "/api/srm/portal/suppliers/:id/evaluations",
            get(get_supplier_evaluations),
        )
        .with_state(state);

    Ok(app)
}

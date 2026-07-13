use axum::{extract::Path, Extension, Json, Router};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{query, query_as, PgPool};
use std::sync::Arc;
use topems_shared::response::ApiResponse;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct PurchaseOrder {
    pub id: Uuid,
    pub po_no: String,
    pub supplier_id: Uuid,
    pub order_date: DateTime<Utc>,
    pub expected_date: Option<DateTime<Utc>>,
    pub actual_date: Option<DateTime<Utc>>,
    pub total_amount: Option<f64>,
    pub currency: String,
    pub status: String,
    pub remarks: Option<String>,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePurchaseOrderRequest {
    pub supplier_id: Uuid,
    pub order_date: Option<DateTime<Utc>>,
    pub expected_date: Option<DateTime<Utc>>,
    pub total_amount: Option<f64>,
    pub currency: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdatePurchaseOrderRequest {
    pub supplier_id: Option<Uuid>,
    pub expected_date: Option<DateTime<Utc>>,
    pub actual_date: Option<DateTime<Utc>>,
    pub total_amount: Option<f64>,
    pub currency: Option<String>,
    pub status: Option<String>,
    pub remarks: Option<String>,
}

pub struct AppState {
    pub db: PgPool,
}

async fn list_purchase_orders(
    Extension(state): Extension<Arc<AppState>>,
) -> Json<ApiResponse<Vec<PurchaseOrder>>> {
    let query = "SELECT * FROM plugin_srm.purchase_orders ORDER BY created_at DESC";
    let orders = sqlx::query_as::<_, PurchaseOrder>(query)
        .fetch_all(&state.db)
        .await
        .map_err(|e| ApiResponse::error(500, &format!("查询采购订单失败: {}", e)));

    match orders {
        Ok(orders) => Json(ApiResponse::success(orders)),
        Err(e) => e,
    }
}

async fn get_purchase_order(
    Path(id): Path<Uuid>,
    Extension(state): Extension<Arc<AppState>>,
) -> Json<ApiResponse<PurchaseOrder>> {
    let query = "SELECT * FROM plugin_srm.purchase_orders WHERE id = $1";
    let order = sqlx::query_as::<_, PurchaseOrder>(query)
        .bind(id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| ApiResponse::error(500, &format!("查询采购订单失败: {}", e)));

    match order {
        Ok(Some(order)) => Json(ApiResponse::success(order)),
        Ok(None) => Json(ApiResponse::error(404, "采购订单不存在")),
        Err(e) => e,
    }
}

async fn create_purchase_order(
    Extension(state): Extension<Arc<AppState>>,
    Json(req): Json<CreatePurchaseOrderRequest>,
) -> Json<ApiResponse<PurchaseOrder>> {
    let po_no = format!("PO{}", chrono::Local::now().format("%Y%m%d%H%M%S"));
    let currency = req.currency.unwrap_or_else(|| "CNY".to_string());
    let order_date = req.order_date.unwrap_or_else(Utc::now);

    let query = r#"
        INSERT INTO plugin_srm.purchase_orders (po_no, supplier_id, order_date, expected_date, total_amount, currency, remarks)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
        "#;

    let order = sqlx::query_as::<_, PurchaseOrder>(query)
        .bind(po_no)
        .bind(req.supplier_id)
        .bind(order_date)
        .bind(req.expected_date)
        .bind(req.total_amount)
        .bind(currency)
        .bind(req.remarks)
        .fetch_one(&state.db)
        .await
        .map_err(|e| ApiResponse::error(500, &format!("创建采购订单失败: {}", e)));

    match order {
        Ok(order) => Json(ApiResponse::success(order)),
        Err(e) => e,
    }
}

async fn update_purchase_order(
    Path(id): Path<Uuid>,
    Extension(state): Extension<Arc<AppState>>,
    Json(req): Json<UpdatePurchaseOrderRequest>,
) -> Json<ApiResponse<PurchaseOrder>> {
    let query = r#"
        UPDATE plugin_srm.purchase_orders
        SET supplier_id = COALESCE($2, supplier_id),
            expected_date = COALESCE($3, expected_date),
            actual_date = COALESCE($4, actual_date),
            total_amount = COALESCE($5, total_amount),
            currency = COALESCE($6, currency),
            status = COALESCE($7, status),
            remarks = COALESCE($8, remarks),
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
        "#;

    let order = sqlx::query_as::<_, PurchaseOrder>(query)
        .bind(id)
        .bind(req.supplier_id)
        .bind(req.expected_date)
        .bind(req.actual_date)
        .bind(req.total_amount)
        .bind(req.currency)
        .bind(req.status)
        .bind(req.remarks)
        .fetch_one(&state.db)
        .await
        .map_err(|e| ApiResponse::error(500, &format!("更新采购订单失败: {}", e)));

    match order {
        Ok(order) => Json(ApiResponse::success(order)),
        Err(e) => e,
    }
}

async fn delete_purchase_order(
    Path(id): Path<Uuid>,
    Extension(state): Extension<Arc<AppState>>,
) -> Json<ApiResponse<bool>> {
    let query = "DELETE FROM plugin_srm.purchase_orders WHERE id = $1";
    let result = sqlx::query(query)
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(|e| ApiResponse::error(500, &format!("删除采购订单失败: {}", e)));

    match result {
        Ok(result) if result.rows_affected() > 0 => Json(ApiResponse::success(true)),
        Ok(_) => Json(ApiResponse::error(404, "采购订单不存在")),
        Err(e) => e,
    }
}

pub async fn create_routes(db: PgPool) -> Result<Router, Box<dyn std::error::Error>> {
    let state = Arc::new(AppState { db });

    let app = Router::new()
        .route(
            "/api/srm/purchase-orders",
            get(list_purchase_orders).post(create_purchase_order),
        )
        .route(
            "/api/srm/purchase-orders/:id",
            get(get_purchase_order)
                .put(update_purchase_order)
                .delete(delete_purchase_order),
        )
        .with_state(state);

    Ok(app)
}

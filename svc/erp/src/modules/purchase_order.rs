use axum::{
    extract::{Extension, Path, Query, State},
    routing::*,
    Json, Router,
};
use chrono::Utc;
use uuid::Uuid;

use super::ApiState;
use crate::models::material::{
    CreatePurchaseOrderRequest, PurchaseOrder, UpdatePurchaseOrderRequest,
};
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::{api_error, ApiResponse, PaginatedResponse, PaginationParams};

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route(
            "/purchase-orders",
            get(list_purchase_orders).post(create_purchase_order),
        )
        .route(
            "/purchase-orders/{id}",
            get(get_purchase_order)
                .put(update_purchase_order)
                .delete(delete_purchase_order),
        )
        .route("/purchase-orders/{id}/approve", put(approve_purchase_order))
        .route("/purchase-orders/{id}/cancel", put(cancel_purchase_order))
}

pub async fn list_purchase_orders(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<PaginatedResponse<PurchaseOrder>>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let purchase_orders_result = if search_pattern.is_some() || status_filter.is_some() {
        let search = search_pattern.unwrap_or_default();
        let status = status_filter.clone();

        sqlx::query_as::<_, PurchaseOrder>(
            r#"SELECT id, order_no, supplier_id, supplier_name, order_date, delivery_date, total_amount, tax_amount, discount_amount, payable_amount, status, remark, created_at, updated_at 
               FROM purchase_orders 
               WHERE (order_no ILIKE $1 OR supplier_name ILIKE $1)
                 AND ($2 = '' OR status = $2)
               ORDER BY created_at DESC LIMIT $3 OFFSET $4"#
        )
        .bind(search)
        .bind(status.unwrap_or_default())
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.db)
        .await
    } else {
        sqlx::query_as::<_, PurchaseOrder>(
            "SELECT id, order_no, supplier_id, supplier_name, order_date, delivery_date, total_amount, tax_amount, discount_amount, payable_amount, status, remark, created_at, updated_at FROM purchase_orders ORDER BY created_at DESC LIMIT $1 OFFSET $2"
        )
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.db)
        .await
    };

    let purchase_orders = match purchase_orders_result {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("查询采购订单失败: {}", e);
            return Json(api_error(500, "查询采购订单失败"));
        }
    };

    let total = match sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*) FROM purchase_orders WHERE deleted_at IS NULL AND (order_no ILIKE $1 OR supplier_name ILIKE $1) AND ($2 = '' OR status = $2)"#
    )
    .bind(params.search.as_deref().map(|s| format!("%{}%", s)).unwrap_or_default())
    .bind(status_filter.as_deref().unwrap_or(""))
    .fetch_one(&state.db)
    .await
    {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("查询采购订单总数失败: {}", e);
            return Json(api_error(500, "查询采购订单总数失败"));
        }
    };

    Json(ApiResponse::success(
        PaginatedResponse::new(purchase_orders, total, page, page_size),
        "获取采购订单列表成功",
    ))
}

pub async fn get_purchase_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<PurchaseOrder>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    let purchase_order = match sqlx::query_as::<_, PurchaseOrder>(
        "SELECT id, order_no, supplier_id, supplier_name, order_date, delivery_date, total_amount, tax_amount, discount_amount, payable_amount, status, remark, created_at, updated_at FROM purchase_orders WHERE deleted_at IS NULL AND id = $1"
    )
    .bind(id)
    .fetch_one(&state.db)
    .await
    {
        Ok(o) => o,
        Err(e) => {
            tracing::error!("查询采购订单失败: {}", e);
            return Json(api_error(404, "采购订单不存在"));
        }
    };

    Json(ApiResponse::success(purchase_order, "获取采购订单成功"))
}

pub async fn create_purchase_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreatePurchaseOrderRequest>,
) -> Json<ApiResponse<PurchaseOrder>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let supplier_name =
        match sqlx::query_scalar::<_, Option<String>>("SELECT name FROM suppliers WHERE id = $1")
            .bind(&req.supplier_id)
            .fetch_one(&state.db)
            .await
        {
            Ok(name) => name.unwrap_or_default(),
            Err(_) => "".to_string(),
        };

    let order_no = format!(
        "PO-{}-{}",
        chrono::Local::now().format("%Y%m%d"),
        Uuid::new_v4().to_string().split('-').next().unwrap_or("0")
    );

    let total_amount = req
        .items
        .iter()
        .map(|i| i.quantity * i.unit_price)
        .sum::<f64>();
    let tax_amount = total_amount * req.tax_rate.unwrap_or(0.13);
    let discount_amount = total_amount * req.discount_rate.unwrap_or(0.0);
    let payable_amount = total_amount + tax_amount - discount_amount;

    let result = sqlx::query_as::<_, PurchaseOrder>(
        r#"INSERT INTO purchase_orders (order_no, supplier_id, supplier_name, order_date, delivery_date, 
            total_amount, tax_amount, discount_amount, payable_amount, status, remark)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id, order_no, supplier_id, supplier_name, order_date, delivery_date, 
                      total_amount, tax_amount, discount_amount, payable_amount, status, remark, created_at, updated_at"#
    )
    .bind(order_no)
    .bind(&req.supplier_id)
    .bind(supplier_name)
    .bind(req.order_date)
    .bind(req.delivery_date)
    .bind(total_amount)
    .bind(tax_amount)
    .bind(discount_amount)
    .bind(payable_amount)
    .bind("pending")
    .bind(req.remark)
    .fetch_one(&state.db)
    .await;

    let purchase_order = match result {
        Ok(o) => o,
        Err(e) => {
            tracing::error!("创建采购订单失败: {}", e);
            return Json(api_error(500, "创建采购订单失败"));
        }
    };

    Json(ApiResponse::success(purchase_order, "创建采购订单成功"))
}

pub async fn update_purchase_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdatePurchaseOrderRequest>,
) -> Json<ApiResponse<PurchaseOrder>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let result = sqlx::query_as::<_, PurchaseOrder>(
        r#"UPDATE purchase_orders SET supplier_name = COALESCE($1, supplier_name),
            delivery_date = COALESCE($2, delivery_date),
            remark = COALESCE($3, remark),
            updated_at = $4
            WHERE id = $5
            RETURNING id, order_no, supplier_id, supplier_name, order_date, delivery_date, 
                      total_amount, tax_amount, discount_amount, payable_amount, status, remark, created_at, updated_at"#
    )
    .bind(req.supplier_name)
    .bind(req.delivery_date)
    .bind(req.remark)
    .bind(Utc::now())
    .bind(id)
    .fetch_one(&state.db)
    .await;

    let purchase_order = match result {
        Ok(o) => o,
        Err(e) => {
            tracing::error!("更新采购订单失败: {}", e);
            return Json(api_error(500, "更新采购订单失败"));
        }
    };

    Json(ApiResponse::success(purchase_order, "更新采购订单成功"))
}

pub async fn delete_purchase_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let result = sqlx::query("UPDATE purchase_orders SET deleted_at = NOW() WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    match result {
        Ok(_) => Json(ApiResponse::success("".to_string(), "删除采购订单成功")),
        Err(e) => {
            tracing::error!("删除采购订单失败: {}", e);
            Json(api_error(500, "删除采购订单失败"))
        }
    }
}

pub async fn approve_purchase_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<PurchaseOrder>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let result = sqlx::query_as::<_, PurchaseOrder>(
        r#"UPDATE purchase_orders SET status = 'approved', updated_at = $1
            WHERE id = $2 AND status = 'pending'
            RETURNING id, order_no, supplier_id, supplier_name, order_date, delivery_date, 
                      total_amount, tax_amount, discount_amount, payable_amount, status, remark, created_at, updated_at"#
    )
    .bind(Utc::now())
    .bind(id)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(order) => Json(ApiResponse::success(order, "采购订单审批成功")),
        Err(e) => {
            tracing::error!("审批采购订单失败: {}", e);
            Json(api_error(500, "审批采购订单失败"))
        }
    }
}

pub async fn cancel_purchase_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<PurchaseOrder>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let result = sqlx::query_as::<_, PurchaseOrder>(
        r#"UPDATE purchase_orders SET status = 'cancelled', updated_at = $1
            WHERE id = $2 AND status IN ('pending', 'approved')
            RETURNING id, order_no, supplier_id, supplier_name, order_date, delivery_date, 
                      total_amount, tax_amount, discount_amount, payable_amount, status, remark, created_at, updated_at"#
    )
    .bind(Utc::now())
    .bind(id)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(order) => Json(ApiResponse::success(order, "采购订单已取消")),
        Err(e) => {
            tracing::error!("取消采购订单失败: {}", e);
            Json(api_error(500, "取消采购订单失败"))
        }
    }
}

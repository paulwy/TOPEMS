use axum::{
    extract::{Path, Query, State},
    Json,
};
use uuid::Uuid;

use crate::AppState;
use topems_shared::{api_error, api_success, ApiResponse};

use super::models::{
    CreateSalesOrderRequest, SalesOrder, SalesOrderListResponse, SalesOrderQuery,
    UpdateSalesOrderRequest,
};

fn default_tenant_id() -> Uuid {
    Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
}

pub async fn list_sales_orders(
    State(state): State<AppState>,
    Query(query): Query<SalesOrderQuery>,
) -> Json<ApiResponse<SalesOrderListResponse>> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(10).clamp(1, 100);
    let offset = (page - 1) * page_size;
    let tenant_id = default_tenant_id();

    let total: i64 = match sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM core_erp_sales_orders
           WHERE tenant_id = $1
             AND ($2::text IS NULL OR status = $2)
             AND ($3::text IS NULL OR order_number ILIKE '%' || $3 || '%')"#,
    )
    .bind(tenant_id)
    .bind(query.status.clone())
    .bind(query.search.clone())
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询销售订单总数失败: {}", e);
            return Json(api_error(500, "查询销售订单总数失败"));
        }
    };

    let items: Vec<SalesOrder> = match sqlx::query_as(
        r#"SELECT id, tenant_id, order_number, customer_id, order_date, expected_date,
                  total_amount, status, remarks, created_by, created_at, updated_at
           FROM core_erp_sales_orders
           WHERE tenant_id = $1
             AND ($2::text IS NULL OR status = $2)
             AND ($3::text IS NULL OR order_number ILIKE '%' || $3 || '%')
           ORDER BY created_at DESC
           LIMIT $4 OFFSET $5"#,
    )
    .bind(tenant_id)
    .bind(query.status.clone())
    .bind(query.search.clone())
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询销售订单列表失败: {}", e);
            return Json(api_error(500, "查询销售订单列表失败"));
        }
    };

    Json(api_success(SalesOrderListResponse {
        items,
        total,
        page,
        page_size,
    }))
}

pub async fn get_sales_order(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<SalesOrder>> {
    let tenant_id = default_tenant_id();

    let order: Option<SalesOrder> = match sqlx::query_as(
        r#"SELECT id, tenant_id, order_number, customer_id, order_date, expected_date,
                  total_amount, status, remarks, created_by, created_at, updated_at
           FROM core_erp_sales_orders WHERE id = $1 AND tenant_id = $2"#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询销售订单详情失败: {}", e);
            return Json(api_error(500, "查询销售订单详情失败"));
        }
    };

    match order {
        Some(order) => Json(api_success(order)),
        None => Json(api_error(404, "销售订单不存在")),
    }
}

pub async fn create_sales_order(
    State(state): State<AppState>,
    Json(req): Json<CreateSalesOrderRequest>,
) -> Json<ApiResponse<SalesOrder>> {
    if req.order_number.trim().is_empty() {
        return Json(api_error(400, "订单编号不能为空"));
    }

    let tenant_id = default_tenant_id();

    let order: SalesOrder = match sqlx::query_as(
        r#"INSERT INTO core_erp_sales_orders
               (tenant_id, order_number, customer_id, order_date, expected_date,
                total_amount, status, remarks, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7, $8)
           RETURNING id, tenant_id, order_number, customer_id, order_date, expected_date,
                     total_amount, status, remarks, created_by, created_at, updated_at"#,
    )
    .bind(tenant_id)
    .bind(req.order_number)
    .bind(req.customer_id)
    .bind(req.order_date)
    .bind(req.expected_date)
    .bind(req.total_amount.unwrap_or_default())
    .bind(req.remarks)
    .bind(req.created_by)
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("创建销售订单失败: {}", e);
            return Json(api_error(500, "创建销售订单失败"));
        }
    };

    Json(api_success(order))
}

pub async fn update_sales_order(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateSalesOrderRequest>,
) -> Json<ApiResponse<SalesOrder>> {
    let tenant_id = default_tenant_id();

    let order: Option<SalesOrder> = match sqlx::query_as(
        r#"UPDATE core_erp_sales_orders
           SET order_number = COALESCE($1, order_number),
               customer_id = COALESCE($2, customer_id),
               order_date = COALESCE($3, order_date),
               expected_date = COALESCE($4, expected_date),
               total_amount = COALESCE($5, total_amount),
               status = COALESCE($6, status),
               remarks = COALESCE($7, remarks),
               updated_at = NOW()
           WHERE id = $8 AND tenant_id = $9
           RETURNING id, tenant_id, order_number, customer_id, order_date, expected_date,
                     total_amount, status, remarks, created_by, created_at, updated_at"#,
    )
    .bind(req.order_number)
    .bind(req.customer_id)
    .bind(req.order_date)
    .bind(req.expected_date)
    .bind(req.total_amount)
    .bind(req.status)
    .bind(req.remarks)
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("更新销售订单失败: {}", e);
            return Json(api_error(500, "更新销售订单失败"));
        }
    };

    match order {
        Some(order) => Json(api_success(order)),
        None => Json(api_error(404, "销售订单不存在")),
    }
}

pub async fn delete_sales_order(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    let tenant_id = default_tenant_id();

    let result =
        sqlx::query(r#"DELETE FROM core_erp_sales_orders WHERE id = $1 AND tenant_id = $2"#)
            .bind(id)
            .bind(tenant_id)
            .execute(&state.pool)
            .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(api_success(true)),
        Ok(_) => Json(api_error(404, "销售订单不存在")),
        Err(e) => {
            tracing::error!("删除销售订单失败: {}", e);
            Json(api_error(500, "删除销售订单失败"))
        }
    }
}

pub async fn approve_sales_order(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<SalesOrder>> {
    let tenant_id = default_tenant_id();

    let order: Option<SalesOrder> = match sqlx::query_as(
        r#"UPDATE core_erp_sales_orders
           SET status = 'approved', updated_at = NOW()
           WHERE id = $1 AND tenant_id = $2 AND status = 'draft'
           RETURNING id, tenant_id, order_number, customer_id, order_date, expected_date,
                     total_amount, status, remarks, created_by, created_at, updated_at"#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("审批销售订单失败: {}", e);
            return Json(api_error(500, "审批销售订单失败"));
        }
    };

    match order {
        Some(order) => Json(api_success(order)),
        None => Json(api_error(404, "销售订单不存在或状态不可审批")),
    }
}

use axum::{
    extract::{Path, Query, State},
    Json,
};
use uuid::Uuid;

use crate::AppState;
use topems_shared::{api_error, api_success, ApiResponse};

use super::models::{
    CreateInboundOrderRequest, InboundOrder, InboundOrderListResponse, InboundOrderQuery,
    UpdateInboundOrderRequest,
};

fn default_tenant_id() -> Uuid {
    Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
}

pub async fn list_inbound_orders(
    State(state): State<AppState>,
    Query(query): Query<InboundOrderQuery>,
) -> Json<ApiResponse<InboundOrderListResponse>> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(10).clamp(1, 100);
    let offset = (page - 1) * page_size;
    let tenant_id = default_tenant_id();

    let total: i64 = match sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM core_wms_inbound_orders
           WHERE tenant_id = $1
             AND ($2::text IS NULL OR status = $2)
             AND ($3::uuid IS NULL OR warehouse_id = $3)
             AND ($4::text IS NULL OR order_number ILIKE '%' || $4 || '%')"#,
    )
    .bind(tenant_id)
    .bind(query.status.clone())
    .bind(query.warehouse_id)
    .bind(query.search.clone())
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询入库订单总数失败: {}", e);
            return Json(api_error(500, "查询入库订单总数失败"));
        }
    };

    let items: Vec<InboundOrder> = match sqlx::query_as(
        r#"SELECT id, tenant_id, order_number, warehouse_id, inbound_type, inbound_date,
                  status, remarks, created_by, created_at, updated_at
           FROM core_wms_inbound_orders
           WHERE tenant_id = $1
             AND ($2::text IS NULL OR status = $2)
             AND ($3::uuid IS NULL OR warehouse_id = $3)
             AND ($4::text IS NULL OR order_number ILIKE '%' || $4 || '%')
           ORDER BY created_at DESC
           LIMIT $5 OFFSET $6"#,
    )
    .bind(tenant_id)
    .bind(query.status.clone())
    .bind(query.warehouse_id)
    .bind(query.search.clone())
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询入库订单列表失败: {}", e);
            return Json(api_error(500, "查询入库订单列表失败"));
        }
    };

    Json(api_success(InboundOrderListResponse {
        items,
        total,
        page,
        page_size,
    }))
}

pub async fn get_inbound_order(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<InboundOrder>> {
    let tenant_id = default_tenant_id();

    let order: Option<InboundOrder> = match sqlx::query_as(
        r#"SELECT id, tenant_id, order_number, warehouse_id, inbound_type, inbound_date,
                  status, remarks, created_by, created_at, updated_at
           FROM core_wms_inbound_orders WHERE id = $1 AND tenant_id = $2"#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询入库订单详情失败: {}", e);
            return Json(api_error(500, "查询入库订单详情失败"));
        }
    };

    match order {
        Some(order) => Json(api_success(order)),
        None => Json(api_error(404, "入库订单不存在")),
    }
}

pub async fn create_inbound_order(
    State(state): State<AppState>,
    Json(req): Json<CreateInboundOrderRequest>,
) -> Json<ApiResponse<InboundOrder>> {
    if req.order_number.trim().is_empty() {
        return Json(api_error(400, "订单编号不能为空"));
    }

    let tenant_id = default_tenant_id();

    let order: InboundOrder = match sqlx::query_as(
        r#"INSERT INTO core_wms_inbound_orders
               (tenant_id, order_number, warehouse_id, inbound_type, inbound_date,
                status, remarks, created_by)
           VALUES ($1, $2, $3, $4, $5, 'draft', $6, $7)
           RETURNING id, tenant_id, order_number, warehouse_id, inbound_type, inbound_date,
                     status, remarks, created_by, created_at, updated_at"#,
    )
    .bind(tenant_id)
    .bind(req.order_number)
    .bind(req.warehouse_id)
    .bind(
        req.inbound_type
            .clone()
            .unwrap_or_else(|| "purchase".to_string()),
    )
    .bind(req.inbound_date)
    .bind(req.remarks)
    .bind(req.created_by)
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("创建入库订单失败: {}", e);
            return Json(api_error(500, "创建入库订单失败"));
        }
    };

    Json(api_success(order))
}

pub async fn update_inbound_order(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateInboundOrderRequest>,
) -> Json<ApiResponse<InboundOrder>> {
    let tenant_id = default_tenant_id();

    let order: Option<InboundOrder> = match sqlx::query_as(
        r#"UPDATE core_wms_inbound_orders
           SET order_number = COALESCE($1, order_number),
               warehouse_id = COALESCE($2, warehouse_id),
               inbound_type = COALESCE($3, inbound_type),
               inbound_date = COALESCE($4, inbound_date),
               status = COALESCE($5, status),
               remarks = COALESCE($6, remarks),
               updated_at = NOW()
           WHERE id = $7 AND tenant_id = $8
           RETURNING id, tenant_id, order_number, warehouse_id, inbound_type, inbound_date,
                     status, remarks, created_by, created_at, updated_at"#,
    )
    .bind(req.order_number)
    .bind(req.warehouse_id)
    .bind(req.inbound_type)
    .bind(req.inbound_date)
    .bind(req.status)
    .bind(req.remarks)
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("更新入库订单失败: {}", e);
            return Json(api_error(500, "更新入库订单失败"));
        }
    };

    match order {
        Some(order) => Json(api_success(order)),
        None => Json(api_error(404, "入库订单不存在")),
    }
}

pub async fn delete_inbound_order(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    let tenant_id = default_tenant_id();

    let result =
        sqlx::query(r#"DELETE FROM core_wms_inbound_orders WHERE id = $1 AND tenant_id = $2"#)
            .bind(id)
            .bind(tenant_id)
            .execute(&state.pool)
            .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(api_success(true)),
        Ok(_) => Json(api_error(404, "入库订单不存在")),
        Err(e) => {
            tracing::error!("删除入库订单失败: {}", e);
            Json(api_error(500, "删除入库订单失败"))
        }
    }
}

pub async fn confirm_inbound_order(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<InboundOrder>> {
    let tenant_id = default_tenant_id();

    let order: Option<InboundOrder> = match sqlx::query_as(
        r#"UPDATE core_wms_inbound_orders
           SET status = 'confirmed', updated_at = NOW()
           WHERE id = $1 AND tenant_id = $2 AND status = 'draft'
           RETURNING id, tenant_id, order_number, warehouse_id, inbound_type, inbound_date,
                     status, remarks, created_by, created_at, updated_at"#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("确认入库订单失败: {}", e);
            return Json(api_error(500, "确认入库订单失败"));
        }
    };

    match order {
        Some(order) => Json(api_success(order)),
        None => Json(api_error(404, "入库订单不存在或状态不可确认")),
    }
}

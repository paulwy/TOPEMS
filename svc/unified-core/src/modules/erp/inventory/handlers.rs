use axum::{
    extract::{Path, Query, State},
    Json,
};
use uuid::Uuid;

use crate::AppState;
use topems_shared::{api_error, api_success, ApiResponse};

use super::models::{AdjustQuantityRequest, Inventory, InventoryListResponse, InventoryQuery};

fn default_tenant_id() -> Uuid {
    Uuid::parse_str("00000000-0000-0000-0000-000000000001").expect("hardcoded default UUID should always be valid")
}

pub async fn list_inventory(
    State(state): State<AppState>,
    Query(query): Query<InventoryQuery>,
) -> Json<ApiResponse<InventoryListResponse>> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(10).clamp(1, 100);
    let offset = (page - 1) * page_size;
    let tenant_id = default_tenant_id();

    let total: i64 = match sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM core_erp_inventory
           WHERE tenant_id = $1
             AND ($2::uuid IS NULL OR material_id = $2)
             AND ($3::text IS NULL OR warehouse_code = $3)
             AND ($4::text IS NULL OR batch_number = $4)"#,
    )
    .bind(tenant_id)
    .bind(query.material_id)
    .bind(query.warehouse_code.clone())
    .bind(query.batch_number.clone())
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询库存总数失败: {}", e);
            return Json(api_error(500, "查询库存总数失败"));
        }
    };

    let items: Vec<Inventory> = match sqlx::query_as(
        r#"SELECT id, tenant_id, material_id, warehouse_code, quantity, unit,
                  batch_number, location, created_at, updated_at
           FROM core_erp_inventory
           WHERE tenant_id = $1
             AND ($2::uuid IS NULL OR material_id = $2)
             AND ($3::text IS NULL OR warehouse_code = $3)
             AND ($4::text IS NULL OR batch_number = $4)
           ORDER BY created_at DESC
           LIMIT $5 OFFSET $6"#,
    )
    .bind(tenant_id)
    .bind(query.material_id)
    .bind(query.warehouse_code.clone())
    .bind(query.batch_number.clone())
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询库存列表失败: {}", e);
            return Json(api_error(500, "查询库存列表失败"));
        }
    };

    Json(api_success(InventoryListResponse {
        items,
        total,
        page,
        page_size,
    }))
}

pub async fn get_inventory(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Inventory>> {
    let tenant_id = default_tenant_id();

    let inv: Option<Inventory> = match sqlx::query_as(
        r#"SELECT id, tenant_id, material_id, warehouse_code, quantity, unit,
                  batch_number, location, created_at, updated_at
           FROM core_erp_inventory WHERE id = $1 AND tenant_id = $2"#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询库存详情失败: {}", e);
            return Json(api_error(500, "查询库存详情失败"));
        }
    };

    match inv {
        Some(inv) => Json(api_success(inv)),
        None => Json(api_error(404, "库存记录不存在")),
    }
}

pub async fn update_inventory_quantity(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<AdjustQuantityRequest>,
) -> Json<ApiResponse<Inventory>> {
    let tenant_id = default_tenant_id();

    let inv: Option<Inventory> = match sqlx::query_as(
        r#"UPDATE core_erp_inventory
           SET quantity = $1, updated_at = NOW()
           WHERE id = $2 AND tenant_id = $3
           RETURNING id, tenant_id, material_id, warehouse_code, quantity, unit,
                     batch_number, location, created_at, updated_at"#,
    )
    .bind(req.quantity)
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("调整库存数量失败: {}", e);
            return Json(api_error(500, "调整库存数量失败"));
        }
    };

    match inv {
        Some(inv) => Json(api_success(inv)),
        None => Json(api_error(404, "库存记录不存在")),
    }
}

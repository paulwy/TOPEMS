use axum::{
    extract::{Path, Query, State},
    Json,
};
use uuid::Uuid;

use crate::AppState;
use topems_shared::{api_error, api_success, ApiResponse};

use super::models::{
    CreateWarehouseRequest, UpdateWarehouseRequest, Warehouse, WarehouseListResponse,
    WarehouseQuery,
};

fn default_tenant_id() -> Uuid {
    Uuid::parse_str("00000000-0000-0000-0000-000000000001")
        .expect("hardcoded default UUID should always be valid")
}

pub async fn list_warehouses(
    State(state): State<AppState>,
    Query(query): Query<WarehouseQuery>,
) -> Json<ApiResponse<WarehouseListResponse>> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(10).clamp(1, 100);
    let offset = (page - 1) * page_size;
    let tenant_id = default_tenant_id();

    let total: i64 = match sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM core_wms_warehouses
           WHERE tenant_id = $1
             AND ($2::text IS NULL OR status = $2)
             AND ($3::text IS NULL OR code ILIKE '%' || $3 || '%' OR name ILIKE '%' || $3 || '%')"#,
    )
    .bind(tenant_id)
    .bind(query.status.clone())
    .bind(query.search.clone())
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询仓库总数失败: {}", e);
            return Json(api_error(500, "查询仓库总数失败"));
        }
    };

    let items: Vec<Warehouse> = match sqlx::query_as(
        r#"SELECT id, tenant_id, code, name, address, manager, phone, status,
                  created_at, updated_at
           FROM core_wms_warehouses
           WHERE tenant_id = $1
             AND ($2::text IS NULL OR status = $2)
             AND ($3::text IS NULL OR code ILIKE '%' || $3 || '%' OR name ILIKE '%' || $3 || '%')
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
            tracing::error!("查询仓库列表失败: {}", e);
            return Json(api_error(500, "查询仓库列表失败"));
        }
    };

    Json(api_success(WarehouseListResponse {
        items,
        total,
        page,
        page_size,
    }))
}

pub async fn get_warehouse(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Warehouse>> {
    let tenant_id = default_tenant_id();

    let wh: Option<Warehouse> = match sqlx::query_as(
        r#"SELECT id, tenant_id, code, name, address, manager, phone, status,
                  created_at, updated_at
           FROM core_wms_warehouses WHERE id = $1 AND tenant_id = $2"#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询仓库详情失败: {}", e);
            return Json(api_error(500, "查询仓库详情失败"));
        }
    };

    match wh {
        Some(wh) => Json(api_success(wh)),
        None => Json(api_error(404, "仓库不存在")),
    }
}

pub async fn create_warehouse(
    State(state): State<AppState>,
    Json(req): Json<CreateWarehouseRequest>,
) -> Json<ApiResponse<Warehouse>> {
    if req.code.trim().is_empty() {
        return Json(api_error(400, "仓库编码不能为空"));
    }
    if req.name.trim().is_empty() {
        return Json(api_error(400, "仓库名称不能为空"));
    }

    let tenant_id = default_tenant_id();

    let wh: Warehouse = match sqlx::query_as(
        r#"INSERT INTO core_wms_warehouses
               (tenant_id, code, name, address, manager, phone, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'active')
           RETURNING id, tenant_id, code, name, address, manager, phone, status,
                     created_at, updated_at"#,
    )
    .bind(tenant_id)
    .bind(req.code)
    .bind(req.name)
    .bind(req.address)
    .bind(req.manager)
    .bind(req.phone)
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("创建仓库失败: {}", e);
            return Json(api_error(500, "创建仓库失败"));
        }
    };

    Json(api_success(wh))
}

pub async fn update_warehouse(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateWarehouseRequest>,
) -> Json<ApiResponse<Warehouse>> {
    let tenant_id = default_tenant_id();

    let wh: Option<Warehouse> = match sqlx::query_as(
        r#"UPDATE core_wms_warehouses
           SET code = COALESCE($1, code),
               name = COALESCE($2, name),
               address = COALESCE($3, address),
               manager = COALESCE($4, manager),
               phone = COALESCE($5, phone),
               status = COALESCE($6, status),
               updated_at = NOW()
           WHERE id = $7 AND tenant_id = $8
           RETURNING id, tenant_id, code, name, address, manager, phone, status,
                     created_at, updated_at"#,
    )
    .bind(req.code)
    .bind(req.name)
    .bind(req.address)
    .bind(req.manager)
    .bind(req.phone)
    .bind(req.status)
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("更新仓库失败: {}", e);
            return Json(api_error(500, "更新仓库失败"));
        }
    };

    match wh {
        Some(wh) => Json(api_success(wh)),
        None => Json(api_error(404, "仓库不存在")),
    }
}

pub async fn delete_warehouse(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    let tenant_id = default_tenant_id();

    let result = sqlx::query(r#"DELETE FROM core_wms_warehouses WHERE id = $1 AND tenant_id = $2"#)
        .bind(id)
        .bind(tenant_id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(api_success(true)),
        Ok(_) => Json(api_error(404, "仓库不存在")),
        Err(e) => {
            tracing::error!("删除仓库失败: {}", e);
            Json(api_error(500, "删除仓库失败"))
        }
    }
}

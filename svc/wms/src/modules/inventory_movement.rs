use axum::{
    extract::{Extension, FromRef, Path, Query, State},
    http::HeaderMap,
    routing::get,
    Json, Router,
};
use chrono::Utc;
use uuid::Uuid;

use crate::models::{
    CreateInventoryMovementRequest, InventoryMovement, InventoryMovementQueryParams,
};
use crate::modules::ApiState;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::{api_error, ApiResponse};

/// 生成移动单号: MV-YYYYMMDD-6位序列号
async fn generate_movement_no(state: &ApiState, tenant_id: Uuid) -> String {
    let today = Utc::now().format("%Y%m%d").to_string();
    let prefix = format!("MV-{}", today);

    let seq: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*) FROM wms.inventory_movements
        WHERE tenant_id = $1 AND movement_no LIKE $2
        "#,
    )
    .bind(tenant_id)
    .bind(format!("{}%", prefix))
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    format!("{}-{:06}", prefix, seq + 1)
}

pub fn create_routes<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
    ApiState: FromRef<S>,
{
    Router::new()
        .route(
            "/api/wms/inventory-movements",
            get(list_inventory_movements).post(create_inventory_movement),
        )
        .route(
            "/api/wms/inventory-movements/{id}",
            get(get_inventory_movement),
        )
}

#[utoipa::path(
    get,
    path = "/api/wms/inventory-movements",
    tag = "inventory_movement",
    operation_id = "list_inventory_movements",
    responses(
        (status = 200, description = "OK"),
    ),
)]
async fn list_inventory_movements(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Query(params): Query<InventoryMovementQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        return e;
    }

    let tenant_id = match &claims.tenant_id {
        Some(id) => match Uuid::parse_str(id) {
            Ok(id) => id,
            Err(_) => return Json(api_error(401, "无效的租户ID")),
        },
        None => return Json(api_error(401, "缺少租户ID")),
    };

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    // ref_id 优先于 reference_id（跨服务调用使用 ref_id）
    let reference_filter = params.ref_id.or(params.reference_id.clone());
    let reference_type_filter = params.ref_type.or(params.reference_type.clone());

    let result = sqlx::query_as::<_, InventoryMovement>(
        r#"
        SELECT id, movement_no, tenant_id, movement_type, reference_id, reference_type,
               material_id, material_code, material_name, quantity,
               from_location_id, to_location_id, from_warehouse_id, to_warehouse_id,
               status, performed_by, performed_at, notes, created_at, updated_at
        FROM wms.inventory_movements
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR movement_type = $2)
          AND ($3::text IS NULL OR status = $3)
          AND ($4::text IS NULL OR reference_id = $4)
          AND ($5::text IS NULL OR reference_type = $5)
          AND ($6::uuid IS NULL OR material_id = $6)
        ORDER BY created_at DESC
        LIMIT $7 OFFSET $8
        "#,
    )
    .bind(tenant_id)
    .bind(&params.movement_type)
    .bind(&params.status)
    .bind(&reference_filter)
    .bind(&reference_type_filter)
    .bind(params.material_id)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(records) => {
            let total: i64 = sqlx::query_scalar(
                r#"
                SELECT COUNT(*) FROM wms.inventory_movements
                WHERE tenant_id = $1
                  AND ($2::text IS NULL OR movement_type = $2)
                  AND ($3::text IS NULL OR status = $3)
                  AND ($4::text IS NULL OR reference_id = $4)
                  AND ($5::text IS NULL OR reference_type = $5)
                  AND ($6::uuid IS NULL OR material_id = $6)
                "#,
            )
            .bind(tenant_id)
            .bind(&params.movement_type)
            .bind(&params.status)
            .bind(&reference_filter)
            .bind(&reference_type_filter)
            .bind(params.material_id)
            .fetch_one(&state.db)
            .await
            .unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": records,
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                }),
                "获取库存移动记录列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取库存移动记录列表失败: {}", e);
            Json(api_error(500, "获取库存移动记录列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/wms/inventory-movements",
    tag = "inventory_movement",
    operation_id = "create_inventory_movement",
    responses(
        (status = 200, description = "OK"),
    ),
)]
async fn create_inventory_movement(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(req): Json<CreateInventoryMovementRequest>,
) -> Json<ApiResponse<InventoryMovement>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        return e;
    }

    let tenant_id = match &claims.tenant_id {
        Some(id) => match Uuid::parse_str(id) {
            Ok(id) => id,
            Err(_) => return Json(api_error(401, "无效的租户ID")),
        },
        None => return Json(api_error(401, "缺少租户ID")),
    };

    let now = Utc::now();
    let id = Uuid::new_v4();
    let movement_no = generate_movement_no(&state, tenant_id).await;
    let operator_id = Uuid::parse_str(&claims.sub).ok();

    let result = sqlx::query_as::<_, InventoryMovement>(
        r#"
        INSERT INTO wms.inventory_movements (
            id, movement_no, tenant_id, movement_type, reference_id, reference_type,
            material_id, material_code, material_name, quantity,
            from_location_id, to_location_id, from_warehouse_id, to_warehouse_id,
            status, performed_by, performed_at, notes, created_at, updated_at
        ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10,
            $11, $12, $13, $14,
            'completed', $15, $16, $17, $18, $18
        )
        RETURNING id, movement_no, tenant_id, movement_type, reference_id, reference_type,
                  material_id, material_code, material_name, quantity,
                  from_location_id, to_location_id, from_warehouse_id, to_warehouse_id,
                  status, performed_by, performed_at, notes, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&movement_no)
    .bind(tenant_id)
    .bind(&req.movement_type)
    .bind(&req.reference_id)
    .bind(&req.reference_type)
    .bind(req.material_id)
    .bind(&req.material_code)
    .bind(&req.material_name)
    .bind(req.quantity)
    .bind(req.from_location_id)
    .bind(req.to_location_id)
    .bind(req.from_warehouse_id)
    .bind(req.to_warehouse_id)
    .bind(operator_id)
    .bind(now)
    .bind(&req.notes)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(record) => Json(ApiResponse::success(record, "创建库存移动记录成功")),
        Err(e) => {
            tracing::error!("创建库存移动记录失败: {}", e);
            Json(api_error(500, "创建库存移动记录失败"))
        }
    }
}

#[utoipa::path(
    get,
    path = "/api/wms/inventory-movements/{id}",
    tag = "inventory_movement",
    operation_id = "get_inventory_movement",
    responses(
        (status = 200, description = "OK"),
    ),
)]
async fn get_inventory_movement(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: HeaderMap,
) -> Json<ApiResponse<InventoryMovement>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        return e;
    }

    let tenant_id = match &claims.tenant_id {
        Some(id) => match Uuid::parse_str(id) {
            Ok(id) => id,
            Err(_) => return Json(api_error(401, "无效的租户ID")),
        },
        None => return Json(api_error(401, "缺少租户ID")),
    };

    let result = sqlx::query_as::<_, InventoryMovement>(
        r#"
        SELECT id, movement_no, tenant_id, movement_type, reference_id, reference_type,
               material_id, material_code, material_name, quantity,
               from_location_id, to_location_id, from_warehouse_id, to_warehouse_id,
               status, performed_by, performed_at, notes, created_at, updated_at
        FROM wms.inventory_movements
        WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(record)) => Json(ApiResponse::success(record, "获取库存移动记录成功")),
        Ok(None) => Json(api_error(404, "库存移动记录不存在")),
        Err(e) => {
            tracing::error!("获取库存移动记录失败: {}", e);
            Json(api_error(500, "获取库存移动记录失败"))
        }
    }
}

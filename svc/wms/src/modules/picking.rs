//! 拣货管理（P2 更多模块业务 API）：拣货单列表 / 详情 / 统计 / 策略
//! 数据源：wms.wave_picks + wms.wave_pick_items（与 wave_pick 模块同源，只读聚合视图）
//! 权限：WavePickRead；走 RLS txn（tenant_middleware 注入）

use axum::{
    extract::{Extension, FromRef, Path, Query, State},
    routing::get,
    Json, Router,
};
use serde::Serialize;
use serde_json::json;
use sqlx::Row;
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use crate::models::wave_pick::{WavePick, WavePickItem};
use crate::modules::ApiState;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::{api_error, ApiResponse, PaginatedResponse, PaginationParams};

pub fn create_routes<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
    ApiState: FromRef<S>,
{
    Router::new()
        .route("/picking/lists", get(list_picking_lists))
        .route("/picking/lists/{id}", get(get_picking_list))
        .route("/picking/statistics", get(picking_statistics))
        .route("/picking/strategies", get(picking_strategies))
}

// ==================== 拣货单列表 ====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:picking:read"])),
    path = "/api/wms/picking/lists",
    responses((status = 200, description = "List picking lists")),
    tag = "wms"
)]
pub async fn list_picking_lists(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<PaginatedResponse<WavePick>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::WavePickRead).await {
        return e;
    }
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, WavePick>(only_own_schema_query!(
        "wms",
        r#"
        SELECT id, wave_pick_number, wave_pick_type, warehouse_id, warehouse_name,
               status, priority, assigned_to, assigned_user_name, batch_id,
               start_time, end_time, total_items, picked_items,
               total_quantity, picked_quantity, remarks, created_at, updated_at
        FROM wms.wave_picks
        WHERE ($1::text IS NULL OR wave_pick_number ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
          AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#
    ))
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(picks) => {
            let total = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "wms",
                r#"
                SELECT COUNT(*) FROM wms.wave_picks
                WHERE ($1::text IS NULL OR wave_pick_number ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND deleted_at IS NULL
                "#
            ))
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&mut **txn)
            .await
            .unwrap_or(0);

            Json(ApiResponse::success(
                PaginatedResponse {
                    items: picks,
                    total,
                    page,
                    page_size,
                    total_pages: topems_shared_core::response::total_pages_of(total, page_size),
                },
                "拣货单列表获取成功",
            ))
        }
        Err(_e) => Json(api_error(500, "获取拣货单列表失败")),
    }
}

// ==================== 拣货单详情（含明细） ====================

pub async fn get_picking_list(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::WavePickRead).await {
        return e;
    }

    let pick = sqlx::query_as::<_, WavePick>(only_own_schema_query!(
        "wms",
        r#"
        SELECT id, wave_pick_number, wave_pick_type, warehouse_id, warehouse_name,
               status, priority, assigned_to, assigned_user_name, batch_id,
               start_time, end_time, total_items, picked_items,
               total_quantity, picked_quantity, remarks, created_at, updated_at
        FROM wms.wave_picks
        WHERE id = $1 AND deleted_at IS NULL
        "#
    ))
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match pick {
        Ok(Some(pick)) => {
            let items = sqlx::query_as::<_, WavePickItem>(only_own_schema_query!(
                "wms",
                r#"
                SELECT id, wave_pick_id, outbound_order_id, outbound_order_number,
                       material_code, material_name, location_id, location_code,
                       planned_quantity, picked_quantity, status, remarks,
                       created_at, updated_at
                FROM wms.wave_pick_items
                WHERE wave_pick_id = $1
                ORDER BY material_code
                "#
            ))
            .bind(id)
            .fetch_all(&mut **txn)
            .await
            .unwrap_or_default();

            Json(ApiResponse::success(
                json!({"pick": pick, "items": items}),
                "拣货单详情获取成功",
            ))
        }
        Ok(None) => Json(api_error(404, "拣货单不存在")),
        Err(_e) => Json(api_error(500, "获取拣货单详情失败")),
    }
}

// ==================== 拣货统计 ====================

#[derive(Serialize)]
pub struct PickingStats {
    total_lists: i64,
    pending: i64,
    in_progress: i64,
    completed: i64,
    total_items: i64,
    picked_items: i64,
    completion_rate: f64,
    overdue: i64,
}

pub async fn picking_statistics(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<PickingStats>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::WavePickRead).await {
        return e;
    }

    let total_lists = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "wms",
        "SELECT COUNT(*) FROM wms.wave_picks WHERE deleted_at IS NULL"
    ))
    .fetch_one(&mut **txn)
    .await
    .unwrap_or(0);

    let pending = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "wms",
        "SELECT COUNT(*) FROM wms.wave_picks WHERE status = 'pending' AND deleted_at IS NULL"
    ))
    .fetch_one(&mut **txn)
    .await
    .unwrap_or(0);

    let in_progress = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "wms",
        "SELECT COUNT(*) FROM wms.wave_picks WHERE status = 'in_progress' AND deleted_at IS NULL"
    ))
    .fetch_one(&mut **txn)
    .await
    .unwrap_or(0);

    let completed = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "wms",
        "SELECT COUNT(*) FROM wms.wave_picks WHERE status = 'completed' AND deleted_at IS NULL"
    ))
    .fetch_one(&mut **txn)
    .await
    .unwrap_or(0);

    let overdue = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "wms",
        r#"
        SELECT COUNT(*) FROM wms.wave_picks
        WHERE status NOT IN ('completed', 'cancelled') AND end_time < now() AND deleted_at IS NULL
        "#
    ))
    .fetch_one(&mut **txn)
    .await
    .unwrap_or(0);

    let agg = sqlx::query(
        only_own_schema_query!(
            "wms",
            "SELECT COALESCE(SUM(total_items),0)::bigint, COALESCE(SUM(picked_items),0)::bigint FROM wms.wave_picks WHERE deleted_at IS NULL"
        ),
    )
    .fetch_one(&mut **txn)
    .await;

    let (total_items, picked_items) = match agg {
        Ok(row) => (row.get::<i64, _>(0), row.get::<i64, _>(1)),
        Err(_) => (0, 0),
    };

    let completion_rate = if total_items > 0 {
        (picked_items as f64 / total_items as f64 * 100.0 * 100.0).round() / 100.0
    } else {
        0.0
    };

    Json(ApiResponse::success(
        PickingStats {
            total_lists,
            pending,
            in_progress,
            completed,
            total_items,
            picked_items,
            completion_rate,
            overdue,
        },
        "拣货统计获取成功",
    ))
}

// ==================== 拣货策略（静态配置） ====================

#[derive(Serialize)]
pub struct PickingStrategy {
    code: String,
    name: String,
    description: String,
    enabled: bool,
}

pub async fn picking_strategies(
    State(_state): State<ApiState>,
    Extension(_claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<PickingStrategy>>> {
    // 静态默认策略（无独立数据表；后续可扩展为 wms.picking_strategies 持久化）
    let strategies = vec![
        PickingStrategy {
            code: "fifo".into(),
            name: "先进先出 (FIFO)".into(),
            description: "按入库时间优先拣取最早批次".into(),
            enabled: true,
        },
        PickingStrategy {
            code: "batch".into(),
            name: "波次合并".into(),
            description: "多订单合并拣货，减少往返".into(),
            enabled: true,
        },
        PickingStrategy {
            code: "zone".into(),
            name: "分区拣货".into(),
            description: "按库区分区并行拣货".into(),
            enabled: false,
        },
        PickingStrategy {
            code: "wave".into(),
            name: "波次排序优化".into(),
            description: "按路径距离优化拣货顺序".into(),
            enabled: true,
        },
    ];
    Json(ApiResponse::success(strategies, "拣货策略获取成功"))
}

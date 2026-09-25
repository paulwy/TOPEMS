//! 劳动效率（P2 更多模块业务 API）：拣货人员效率 / 生产率 / 工作量 / 班次
//! 数据源：wms.wave_picks（按 assigned_to 聚合）+ wms.labor_shifts（班次持久化）
//! 权限：WavePickRead；走 RLS txn（tenant_middleware 注入）

use axum::{
    extract::{Extension, FromRef, Path, Query, State},
    routing::get,
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Row};
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

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
        .route("/labor/efficiency", get(list_labor_efficiency))
        .route("/labor/efficiency/{userId}", get(user_labor_efficiency))
        .route("/labor/productivity", get(labor_productivity))
        .route("/labor/workload", get(labor_workload))
        .route(
            "/labor/performance-dashboard",
            get(labor_performance_dashboard),
        )
        .route(
            "/labor/shifts",
            get(list_labor_shifts).post(create_labor_shift),
        )
}

// ==================== 员工拣货效率 ====================

#[derive(Serialize, FromRow)]
pub struct LaborEfficiencyRow {
    user_id: Option<Uuid>,
    user_name: Option<String>,
    total_lists: i64,
    completed_lists: i64,
    total_items: i64,
    picked_items: i64,
    total_quantity: f64,
    picked_quantity: f64,
    completion_rate: f64,
    avg_duration_minutes: f64,
    efficiency: f64,
}

#[derive(Deserialize)]
pub struct LaborQuery {
    date_from: Option<chrono::NaiveDate>,
    date_to: Option<chrono::NaiveDate>,
    warehouse_id: Option<Uuid>,
}

async fn efficiency_query<'e, E>(
    executor: E,
    date_from: &Option<chrono::NaiveDate>,
    date_to: &Option<chrono::NaiveDate>,
    warehouse_id: &Option<Uuid>,
    user_id: Option<Uuid>,
) -> Result<Vec<LaborEfficiencyRow>, sqlx::Error>
where
    E: sqlx::Executor<'e, Database = sqlx::Postgres>,
{
    let rows = sqlx::query_as::<_, LaborEfficiencyRow>(only_own_schema_query!(
        "wms",
        r#"
        SELECT assigned_to AS user_id,
               assigned_user_name AS user_name,
               COUNT(*)::bigint AS total_lists,
               COUNT(*) FILTER (WHERE status = 'completed')::bigint AS completed_lists,
               COALESCE(SUM(total_items),0)::bigint AS total_items,
               COALESCE(SUM(picked_items),0)::bigint AS picked_items,
               COALESCE(SUM(total_quantity),0)::float8 AS total_quantity,
               COALESCE(SUM(picked_quantity),0)::float8 AS picked_quantity,
               CASE WHEN SUM(total_items) > 0
                    THEN ROUND(COALESCE(SUM(picked_items),0)::float8 / NULLIF(SUM(total_items),0)::float8 * 100 * 100) / 100
                    ELSE 0 END AS completion_rate,
               CASE WHEN COUNT(*) > 0
                    THEN ROUND(COALESCE(AVG(EXTRACT(EPOCH FROM (end_time - start_time))) / 60, 0) * 100) / 100
                    ELSE 0 END AS avg_duration_minutes,
               CASE WHEN SUM(total_items) > 0
                    THEN ROUND(COALESCE(SUM(picked_items),0)::float8 / NULLIF(SUM(total_items),0)::float8 * 100 * 100) / 100
                    ELSE 0 END AS efficiency
        FROM wms.wave_picks
        WHERE deleted_at IS NULL
          AND assigned_to IS NOT NULL
          AND ($1::date IS NULL OR created_at::date >= $1)
          AND ($2::date IS NULL OR created_at::date <= $2)
          AND ($3::uuid IS NULL OR warehouse_id = $3)
          AND ($4::uuid IS NULL OR assigned_to = $4)
        GROUP BY assigned_to, assigned_user_name
        ORDER BY total_items DESC
        "#
    ))
    .bind(date_from)
    .bind(date_to)
    .bind(warehouse_id)
    .bind(user_id)
    .fetch_all(executor)
    .await?;
    Ok(rows)
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:labor:read"])),
    path = "/api/wms/labor/efficiency",
    responses((status = 200, description = "List labor efficiency")),
    tag = "wms"
)]
pub async fn list_labor_efficiency(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<LaborQuery>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<Vec<LaborEfficiencyRow>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::WavePickRead).await {
        return e;
    }
    match efficiency_query(
        &mut **txn,
        &params.date_from,
        &params.date_to,
        &params.warehouse_id,
        None,
    )
    .await
    {
        Ok(rows) => Json(ApiResponse::success(rows, "劳动效率获取成功")),
        Err(e) => {
            tracing::error!("获取劳动效率失败: {}", e);
            Json(api_error(500, "获取劳动效率失败"))
        }
    }
}

pub async fn user_labor_efficiency(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(user_id): Path<Uuid>,
    Query(params): Query<LaborQuery>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<Vec<LaborEfficiencyRow>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::WavePickRead).await {
        return e;
    }
    match efficiency_query(
        &mut **txn,
        &params.date_from,
        &params.date_to,
        &params.warehouse_id,
        Some(user_id),
    )
    .await
    {
        Ok(rows) => Json(ApiResponse::success(rows, "员工劳动效率获取成功")),
        Err(e) => {
            tracing::error!("获取员工劳动效率失败: {}", e);
            Json(api_error(500, "获取员工劳动效率失败"))
        }
    }
}

// ==================== 生产率汇总 ====================

#[derive(Serialize)]
pub struct ProductivityStats {
    total_workers: i64,
    total_lists: i64,
    completed_lists: i64,
    total_items: i64,
    picked_items: i64,
    avg_items_per_worker: f64,
    overall_completion_rate: f64,
    avg_lists_per_worker: f64,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:labor:read"])),
    path = "/api/wms/labor/productivity",
    responses((status = 200, description = "Labor productivity")),
    tag = "wms"
)]
pub async fn labor_productivity(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<LaborQuery>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<ProductivityStats>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::WavePickRead).await {
        return e;
    }

    let row = sqlx::query(only_own_schema_query!(
        "wms",
        r#"
            SELECT COUNT(DISTINCT assigned_to)::bigint,
                   COUNT(*)::bigint,
                   COUNT(*) FILTER (WHERE status = 'completed')::bigint,
                   COALESCE(SUM(total_items),0)::bigint,
                   COALESCE(SUM(picked_items),0)::bigint
            FROM wms.wave_picks
            WHERE deleted_at IS NULL AND assigned_to IS NOT NULL
              AND ($1::date IS NULL OR created_at::date >= $1)
              AND ($2::date IS NULL OR created_at::date <= $2)
              AND ($3::uuid IS NULL OR warehouse_id = $3)
            "#
    ))
    .bind(&params.date_from)
    .bind(&params.date_to)
    .bind(&params.warehouse_id)
    .fetch_one(&mut **txn)
    .await;

    match row {
        Ok(row) => {
            let total_workers: i64 = row.get(0);
            let total_lists: i64 = row.get(1);
            let completed_lists: i64 = row.get(2);
            let total_items: i64 = row.get(3);
            let picked_items: i64 = row.get(4);
            Json(ApiResponse::success(
                ProductivityStats {
                    total_workers,
                    total_lists,
                    completed_lists,
                    total_items,
                    picked_items,
                    avg_items_per_worker: if total_workers > 0 {
                        (total_items as f64 / total_workers as f64 * 100.0).round() / 100.0
                    } else {
                        0.0
                    },
                    overall_completion_rate: if total_items > 0 {
                        (picked_items as f64 / total_items as f64 * 100.0 * 100.0).round() / 100.0
                    } else {
                        0.0
                    },
                    avg_lists_per_worker: if total_workers > 0 {
                        (total_lists as f64 / total_workers as f64 * 100.0).round() / 100.0
                    } else {
                        0.0
                    },
                },
                "生产率获取成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取生产率失败: {}", e);
            Json(api_error(500, "获取生产率失败"))
        }
    }
}

// ==================== 工作量分布 ====================

#[derive(Serialize)]
pub struct WorkloadItem {
    date: String,
    total_lists: i64,
    completed_lists: i64,
    total_items: i64,
    picked_items: i64,
    active_workers: i64,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:read"])),
    path = "/labor/workload",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "labor"
)]
pub async fn labor_workload(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<LaborQuery>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<Vec<WorkloadItem>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::WavePickRead).await {
        return e;
    }

    let rows = sqlx::query(only_own_schema_query!(
        "wms",
        r#"
            SELECT created_at::date::text AS date,
                   COUNT(*)::bigint AS total_lists,
                   COUNT(*) FILTER (WHERE status = 'completed')::bigint AS completed_lists,
                   COALESCE(SUM(total_items),0)::bigint AS total_items,
                   COALESCE(SUM(picked_items),0)::bigint AS picked_items,
                   COUNT(DISTINCT assigned_to)::bigint AS active_workers
            FROM wms.wave_picks
            WHERE deleted_at IS NULL AND assigned_to IS NOT NULL
              AND ($1::date IS NULL OR created_at::date >= $1)
              AND ($2::date IS NULL OR created_at::date <= $2)
              AND ($3::uuid IS NULL OR warehouse_id = $3)
            GROUP BY created_at::date
            ORDER BY created_at::date DESC
            LIMIT 30
            "#
    ))
    .bind(&params.date_from)
    .bind(&params.date_to)
    .bind(&params.warehouse_id)
    .fetch_all(&mut **txn)
    .await;

    match rows {
        Ok(rows) => {
            let items: Vec<WorkloadItem> = rows
                .iter()
                .map(|row| WorkloadItem {
                    date: row.get("date"),
                    total_lists: row.get("total_lists"),
                    completed_lists: row.get("completed_lists"),
                    total_items: row.get("total_items"),
                    picked_items: row.get("picked_items"),
                    active_workers: row.get("active_workers"),
                })
                .collect();
            Json(ApiResponse::success(items, "工作量分布获取成功"))
        }
        Err(e) => {
            tracing::error!("获取工作量分布失败: {}", e);
            Json(api_error(500, "获取工作量分布失败"))
        }
    }
}

// ==================== 绩效仪表盘 ====================

#[derive(Serialize)]
pub struct PerformanceDashboard {
    total_workers: i64,
    total_lists: i64,
    completed_lists: i64,
    pending_lists: i64,
    in_progress_lists: i64,
    total_items: i64,
    picked_items: i64,
    overall_completion_rate: f64,
    top_workers: Vec<LaborEfficiencyRow>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:read"])),
    path = "/labor/performance-dashboard",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "labor"
)]
pub async fn labor_performance_dashboard(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<LaborQuery>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<PerformanceDashboard>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::WavePickRead).await {
        return e;
    }

    let agg = sqlx::query(only_own_schema_query!(
        "wms",
        r#"
            SELECT COUNT(DISTINCT assigned_to)::bigint,
                   COUNT(*)::bigint,
                   COUNT(*) FILTER (WHERE status = 'completed')::bigint,
                   COUNT(*) FILTER (WHERE status = 'pending')::bigint,
                   COUNT(*) FILTER (WHERE status = 'in_progress')::bigint,
                   COALESCE(SUM(total_items),0)::bigint,
                   COALESCE(SUM(picked_items),0)::bigint
            FROM wms.wave_picks
            WHERE deleted_at IS NULL AND assigned_to IS NOT NULL
              AND ($1::date IS NULL OR created_at::date >= $1)
              AND ($2::date IS NULL OR created_at::date <= $2)
              AND ($3::uuid IS NULL OR warehouse_id = $3)
            "#
    ))
    .bind(&params.date_from)
    .bind(&params.date_to)
    .bind(&params.warehouse_id)
    .fetch_one(&mut **txn)
    .await;

    let (
        total_workers,
        total_lists,
        completed_lists,
        pending_lists,
        in_progress_lists,
        total_items,
        picked_items,
    ) = match agg {
        Ok(row) => (
            row.get::<i64, _>(0),
            row.get::<i64, _>(1),
            row.get::<i64, _>(2),
            row.get::<i64, _>(3),
            row.get::<i64, _>(4),
            row.get::<i64, _>(5),
            row.get::<i64, _>(6),
        ),
        Err(_) => (0, 0, 0, 0, 0, 0, 0),
    };

    let top_workers = efficiency_query(
        &mut **txn,
        &params.date_from,
        &params.date_to,
        &params.warehouse_id,
        None,
    )
    .await
    .unwrap_or_default();

    let overall_completion_rate = if total_items > 0 {
        (picked_items as f64 / total_items as f64 * 100.0 * 100.0).round() / 100.0
    } else {
        0.0
    };

    Json(ApiResponse::success(
        PerformanceDashboard {
            total_workers,
            total_lists,
            completed_lists,
            pending_lists,
            in_progress_lists,
            total_items,
            picked_items,
            overall_completion_rate,
            top_workers,
        },
        "绩效仪表盘获取成功",
    ))
}

// ==================== 班次管理 ====================

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct LaborShift {
    pub id: Uuid,
    pub organization_id: Uuid,
    pub tenant_id: Uuid,
    pub user_id: Uuid,
    pub user_name: Option<String>,
    pub shift_date: chrono::NaiveDate,
    pub start_time: Option<DateTime<Utc>>,
    pub end_time: Option<DateTime<Utc>>,
    pub warehouse_id: Option<Uuid>,
    pub zone: Option<String>,
    pub status: String,
    pub tasks_assigned: i64,
    pub tasks_completed: i64,
    pub created_at: DateTime<Utc>,
}

#[derive(Deserialize)]
pub struct CreateShiftRequest {
    pub user_id: Uuid,
    pub user_name: Option<String>,
    pub shift_date: chrono::NaiveDate,
    pub start_time: Option<DateTime<Utc>>,
    pub end_time: Option<DateTime<Utc>>,
    pub warehouse_id: Option<Uuid>,
    pub zone: Option<String>,
    pub status: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:read"])),
    path = "/labor/shifts",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "labor"
)]
pub async fn list_labor_shifts(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<PaginatedResponse<LaborShift>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::WavePickRead).await {
        return e;
    }
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let rows = sqlx::query_as::<_, LaborShift>(only_own_schema_query!(
        "wms",
        r#"
        SELECT id, organization_id, tenant_id, user_id, user_name, shift_date,
               start_time, end_time, warehouse_id, zone, status,
               tasks_assigned, tasks_completed, created_at
        FROM wms.labor_shifts
        WHERE ($1::text IS NULL OR status = $1)
        ORDER BY shift_date DESC, created_at DESC
        LIMIT $2 OFFSET $3
        "#
    ))
    .bind(&params.status)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match rows {
        Ok(items) => {
            let total = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "wms",
                "SELECT COUNT(*) FROM wms.labor_shifts WHERE ($1::text IS NULL OR status = $1)"
            ))
            .bind(&params.status)
            .fetch_one(&mut **txn)
            .await
            .unwrap_or(0);
            Json(ApiResponse::success(
                PaginatedResponse {
                    items,
                    total,
                    page,
                    page_size,
                    total_pages: topems_shared_core::response::total_pages_of(total, page_size),
                },
                "班次列表获取成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取班次列表失败: {}", e);
            Json(api_error(500, "获取班次列表失败"))
        }
    }
}

pub async fn create_labor_shift(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CreateShiftRequest>,
) -> Json<ApiResponse<LaborShift>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::WavePickWrite).await {
        return e;
    }
    let tenant_id =
        Uuid::parse_str(claims.tenant_id.as_deref().unwrap_or("")).unwrap_or_else(|_| Uuid::nil());
    let organization_id = Uuid::parse_str(&claims.sub).unwrap_or_else(|_| Uuid::nil());

    let row = sqlx::query_as::<_, LaborShift>(only_own_schema_query!(
        "wms",
        r#"
        INSERT INTO wms.labor_shifts
            (organization_id, tenant_id, user_id, user_name, shift_date, start_time, end_time,
             warehouse_id, zone, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, organization_id, tenant_id, user_id, user_name, shift_date,
                  start_time, end_time, warehouse_id, zone, status,
                  tasks_assigned, tasks_completed, created_at
        "#
    ))
    .bind(organization_id)
    .bind(tenant_id)
    .bind(req.user_id)
    .bind(&req.user_name)
    .bind(req.shift_date)
    .bind(&req.start_time)
    .bind(&req.end_time)
    .bind(&req.warehouse_id)
    .bind(&req.zone)
    .bind(req.status.unwrap_or_else(|| "scheduled".into()))
    .fetch_one(&mut **txn)
    .await;

    match row {
        Ok(shift) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("班次事务提交失败: {}", e);
                    return Json(api_error(500, "班次创建失败"));
                }
            }
            Json(ApiResponse::success(shift, "班次创建成功"))
        }
        Err(e) => {
            tracing::error!("创建班次失败: {}", e);
            Json(api_error(500, "创建班次失败"))
        }
    }
}

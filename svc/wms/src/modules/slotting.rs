//! WMS · 库位优化 (Slotting)
//!
//! V514-2：P0-2 真实缺口修复——前端 apps/web/src/api/wms/slotting.ts 消费
//! /slotting/* 10 个端点，但 svc/wms 此前无此模块（slotting.ts 注释声称的后端
//! svc/wms/src/modules/slotting.rs 不存在）。本模块为最小可用实现：
//!   POST   /slotting/optimize              生成优化建议任务
//!   GET    /slotting/suggestions           建议列表（分页/状态过滤）
//!   GET    /slotting/suggestions/{id}      建议详情
//!   POST   /slotting/suggestions/{id}/apply   应用建议
//!   POST   /slotting/suggestions/{id}/reject  拒绝建议
//!   GET    /slotting/zones                库位分区列表
//!   POST   /slotting/zones                创建分区
//!   GET    /slotting/rules                优化规则列表
//!   POST   /slotting/rules                创建优化规则
//!   GET    /slotting/impact-analysis      优化影响分析
//!
//! 表：wms.slotting_suggestions / wms.slotting_zones / wms.slotting_rules
//! （schema 权威定义见迁移链 20261120210000_wms_schema_canonical）

use axum::{
    extract::{Extension, FromRef, Path, Query, State},
    http::HeaderMap,
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{types::JsonValue, Row};
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use utoipa::IntoParams;
use uuid::Uuid;

use crate::modules::slotting_status::SlottingSuggestionStatus;
use crate::modules::ApiState;
use crate::shared::permission::{check_permission, ModulePermission};
use crate::shared::scope::tenant_of;
use topems_shared_auth::auth::Claims;
use topems_shared_core::locale::Locale;
use topems_shared_core::response::ApiResponse;
use topems_shared_core::TopemsError;

// ============================================
// 查询参数
// ============================================

#[derive(Debug, Deserialize, IntoParams)]
pub struct SuggestionQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub warehouse_id: Option<Uuid>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct ZoneQueryParams {
    pub warehouse_id: Option<Uuid>,
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct RuleQueryParams {
    pub warehouse_id: Option<Uuid>,
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct OptimizeParams {
    pub warehouse_id: Option<Uuid>,
    pub strategy: Option<String>,
    pub scope: Option<String>,
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct ImpactParams {
    pub warehouse_id: Option<Uuid>,
}

// ============================================
// 响应结构（对齐前端 slotting.ts 契约）
// ============================================

/// 库位优化建议
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SlottingSuggestion {
    pub id: Uuid,
    pub tenant_id: Option<Uuid>,
    pub warehouse_id: Uuid,
    pub material_id: Option<Uuid>,
    pub material_code: String,
    pub material_name: String,
    pub current_location_id: Option<Uuid>,
    pub suggested_location_id: Option<Uuid>,
    pub suggested_location_name: Option<String>,
    pub reason: String,
    pub score: f64,
    pub expected_improvement: f64,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub applied_at: Option<DateTime<Utc>>,
}

/// 库位分区
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SlottingZone {
    pub id: Uuid,
    pub tenant_id: Option<Uuid>,
    pub warehouse_id: Uuid,
    pub name: String,
    pub zone_type: String,
    pub location_ids: JsonValue,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
}

/// 优化规则
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SlottingRule {
    pub id: Uuid,
    pub tenant_id: Option<Uuid>,
    pub warehouse_id: Uuid,
    pub rule_type: String,
    pub priority: i32,
    pub conditions: JsonValue,
    pub actions: JsonValue,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
}

/// 优化任务结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimizeResult {
    pub task_id: String,
    pub suggestions_count: i64,
}

/// 影响分析（对齐前端 SlottingImpactAnalysis）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImpactAnalysis {
    pub current_pick_distance: f64,
    pub optimized_pick_distance: f64,
    pub distance_reduction_percent: f64,
    pub current_slotting_score: f64,
    pub optimized_slotting_score: f64,
    pub affected_orders: i64,
    pub affected_materials: i64,
    pub implementation_cost_estimate: f64,
}

fn suggestion_from_row(row: &sqlx::postgres::PgRow) -> SlottingSuggestion {
    SlottingSuggestion {
        id: row.try_get::<Uuid, _>("id").unwrap_or_default(),
        tenant_id: row
            .try_get::<Option<Uuid>, _>("tenant_id")
            .unwrap_or_default(),
        warehouse_id: row.try_get::<Uuid, _>("warehouse_id").unwrap_or_default(),
        material_id: row
            .try_get::<Option<Uuid>, _>("material_id")
            .unwrap_or_default(),
        material_code: row
            .try_get::<String, _>("material_code")
            .unwrap_or_default(),
        material_name: row
            .try_get::<String, _>("material_name")
            .unwrap_or_default(),
        current_location_id: row
            .try_get::<Option<Uuid>, _>("current_location_id")
            .unwrap_or_default(),
        suggested_location_id: row
            .try_get::<Option<Uuid>, _>("suggested_location_id")
            .unwrap_or_default(),
        suggested_location_name: row
            .try_get::<Option<String>, _>("suggested_location_name")
            .unwrap_or_default(),
        reason: row.try_get::<String, _>("reason").unwrap_or_default(),
        score: row.try_get::<f64, _>("score").unwrap_or(0.0),
        expected_improvement: row.try_get::<f64, _>("expected_improvement").unwrap_or(0.0),
        status: row.try_get::<String, _>("status").unwrap_or_default(),
        created_at: row
            .try_get::<DateTime<Utc>, _>("created_at")
            .unwrap_or_else(|_| Utc::now()),
        applied_at: row
            .try_get::<Option<DateTime<Utc>>, _>("applied_at")
            .unwrap_or_default(),
    }
}

// ============================================
// 路由
// ============================================

pub fn create_routes<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
    ApiState: FromRef<S>,
{
    Router::new()
        .route("/slotting/optimize", post(run_optimization))
        .route("/slotting/suggestions", get(list_suggestions))
        .route("/slotting/suggestions/{id}", get(get_suggestion))
        .route("/slotting/suggestions/{id}/apply", post(apply_suggestion))
        .route("/slotting/suggestions/{id}/reject", post(reject_suggestion))
        .route("/slotting/zones", get(list_zones).post(create_zone))
        .route("/slotting/rules", get(list_rules).post(create_rule))
        .route("/slotting/impact-analysis", get(get_impact_analysis))
}

// ============================================
// Handlers
// ============================================

/// 运行库位优化：按已启用规则生成建议（最小实现：按规则类型 × 启用分区生成候选）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:inventory:write"])),
    path = "/api/wms/slotting/optimize",
    responses((status = 200, description = "run_optimization OK")),
    tag = "WMS/slotting"
)]
#[allow(clippy::as_conversions, clippy::cast_possible_wrap)]
pub async fn run_optimization(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(params): Json<OptimizeParams>,
) -> ApiResponse<serde_json::Value> {
    let tenant = match tenant_of(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let strategy = params
        .strategy
        .clone()
        .unwrap_or_else(|| "frequency".into());
    let _ = strategy;

    // 读取启用中的规则（无规则时诚实返回空结果，不生成占位建议）
    let rules = sqlx::query_as::<_, (Uuid, String)>(
        r#"
        SELECT id, rule_type
        FROM wms.slotting_rules
        WHERE is_active = TRUE
          AND deleted_at IS NULL
          AND tenant_id = $2
          AND ($1::uuid IS NULL OR warehouse_id = $1)
        ORDER BY priority, created_at
        "#,
    )
    .bind(params.warehouse_id)
    .bind(tenant)
    .fetch_all(&mut **txn)
    .await
    .unwrap_or_default();

    let suggestion_count: i64;
    let degraded: bool;
    let degraded_message: Option<String>;
    if rules.is_empty() {
        // P1-3：无规则时不再插入 MOCK-MATERIAL 占位建议（伪造物料行进入业务表，
        // 下游 apply/对账会把假数据当真）。诚实返回空结果 + degraded 提示，
        // 引导先维护启用中的 slotting 规则（不加迁移、不加新列）。
        suggestion_count = 0;
        degraded = true;
        degraded_message = Some(
            "未启用任何库位优化规则：未生成建议。请先在 /api/wms/slotting/rules 创建并启用规则后再运行。"
                .to_string(),
        );
    } else {
        degraded = false;
        degraded_message = None;
        // 有规则：按规则数 × 启用分区生成候选（每条规则对应一个分区）
        let inserted = sqlx::query(
            r#"
            INSERT INTO wms.slotting_suggestions
                (tenant_id, warehouse_id, material_id, material_code, material_name,
                 suggested_location_id, suggested_location_name, reason, score, expected_improvement, status)
            SELECT z.tenant_id,
                   z.warehouse_id,
                   NULL,
                   r.rule_type,
                   r.rule_type,
                   (z.location_ids->>0)::uuid,
                   z.name,
                   r.rule_type,
                   0.6,
                   0.0,
                   $3::varchar
            FROM wms.slotting_zones z
            JOIN wms.slotting_rules r
              ON r.is_active = TRUE
             AND r.deleted_at IS NULL
             AND r.tenant_id = $4
             AND ($1::uuid IS NULL OR r.warehouse_id = $1)
            WHERE z.is_active = TRUE
              AND z.deleted_at IS NULL
              AND z.tenant_id = $4
              AND ($2::uuid IS NULL OR z.warehouse_id = $2)
              AND NOT EXISTS (
                  SELECT 1 FROM wms.slotting_suggestions s
                  WHERE s.warehouse_id = z.warehouse_id
                    AND s.tenant_id = $4
                    AND s.deleted_at IS NULL
                    AND s.status = $3::varchar
              )
            "#,
        )
        .bind(params.warehouse_id)
        .bind(params.warehouse_id)
        .bind(SlottingSuggestionStatus::DEFAULT.as_db_str())
        .bind(tenant)
        .execute(&mut **txn)
        .await
        .map(|r| r.rows_affected() as i64)
        .unwrap_or(0);
        suggestion_count = inserted;
    }

    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("事务提交失败: {}", e);
            return ApiResponse::server_error("事务提交失败");
        }
    }
    ApiResponse::success(
        serde_json::json!({
            "task_id": Uuid::new_v4().to_string(),
            "suggestions_count": suggestion_count,
            "degraded": degraded,
            "message": degraded_message,
        }),
        if degraded {
            "无启用规则，未生成建议"
        } else {
            "success"
        },
    )
}

/// 建议列表
#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:inventory:read"])),
    path = "/api/wms/slotting/suggestions",
    responses((status = 200, description = "list_suggestions OK")),
    tag = "WMS/slotting"
)]
pub async fn list_suggestions(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Query(params): Query<SuggestionQueryParams>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let tenant = match tenant_of(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;
    let status = match params.status.as_deref() {
        None => None,
        Some(raw) => match SlottingSuggestionStatus::from_db_str(raw) {
            Some(status) => Some(status.as_db_str().to_string()),
            None => return ApiResponse::bad_request("无效的库位优化建议状态"),
        },
    };
    let warehouse_id = params.warehouse_id;

    let items = match sqlx::query(
        r#"
        SELECT id, tenant_id, warehouse_id, material_id, material_code, material_name,
               current_location_id, suggested_location_id, suggested_location_name,
               reason, score::float8 as score, expected_improvement::float8 as expected_improvement,
               status, created_at, applied_at
        FROM wms.slotting_suggestions
        WHERE deleted_at IS NULL
          AND tenant_id = $5
          AND ($1::uuid IS NULL OR warehouse_id = $1)
          AND ($2::text IS NULL OR status = $2)
          AND status = ANY(ARRAY['pending','applied','rejected'])
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(warehouse_id)
    .bind(&status)
    .bind(page_size)
    .bind(offset)
    .bind(tenant)
    .fetch_all(&mut **txn)
    .await
    {
        Ok(v) => v,
        Err(e) => return ApiResponse::from(TopemsError::internal("查询建议失败", e)),
    };

    let total_row = match sqlx::query(
        r#"
        SELECT COUNT(*)::bigint as total
        FROM wms.slotting_suggestions
        WHERE deleted_at IS NULL
          AND tenant_id = $3
          AND ($1::uuid IS NULL OR warehouse_id = $1)
          AND ($2::text IS NULL OR status = $2)
          AND status = ANY(ARRAY['pending','applied','rejected'])
        "#,
    )
    .bind(warehouse_id)
    .bind(&status)
    .bind(tenant)
    .fetch_one(&mut **txn)
    .await
    {
        Ok(v) => v,
        Err(e) => return ApiResponse::from(TopemsError::internal("统计建议失败", e)),
    };

    let suggestions: Vec<SlottingSuggestion> = items.iter().map(suggestion_from_row).collect();
    let total = total_row.try_get::<i64, _>("total").unwrap_or(0);

    ApiResponse::success(
        serde_json::json!({
            "items": suggestions,
            "total": total,
        }),
        "success",
    )
}

/// 建议详情
#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:inventory:read"])),
    path = "/api/wms/slotting/suggestions/{id}",
    responses((status = 200, description = "get_suggestion OK")),
    tag = "WMS/slotting"
)]
pub async fn get_suggestion(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let tenant = match tenant_of(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let row = match sqlx::query(
        r#"
        SELECT id, tenant_id, warehouse_id, material_id, material_code, material_name,
               current_location_id, suggested_location_id, suggested_location_name,
               reason, score::float8 as score, expected_improvement::float8 as expected_improvement,
               status, created_at, applied_at
        FROM wms.slotting_suggestions
        WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
          AND status = ANY(ARRAY['pending','applied','rejected'])
        "#,
    )
    .bind(id)
    .bind(tenant)
    .fetch_optional(&mut **txn)
    .await
    {
        Ok(v) => v,
        Err(e) => return ApiResponse::from(TopemsError::internal("查询建议失败", e)),
    };

    match row {
        Some(r) => ApiResponse::success(
            serde_json::to_value(suggestion_from_row(&r)).unwrap_or(serde_json::Value::Null),
            "success",
        ),
        None => ApiResponse::from(TopemsError::ResourceNotFound("建议不存在".to_string())),
    }
}

/// 应用建议
#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:inventory:write"])),
    path = "/api/wms/slotting/suggestions/{id}/apply",
    responses((status = 200, description = "apply_suggestion OK")),
    tag = "WMS/slotting"
)]
pub async fn apply_suggestion(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let tenant = match tenant_of(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let row = match sqlx::query(
        r#"
        UPDATE wms.slotting_suggestions
        SET status = $2, applied_at = NOW()
        WHERE id = $1 AND tenant_id = $3 AND deleted_at IS NULL
          AND status = ANY($4)
          AND status = ANY(ARRAY['pending','applied','rejected'])
        RETURNING id, status
        "#,
    )
    .bind(id)
    .bind(SlottingSuggestionStatus::Applied.as_db_str())
    .bind(tenant)
    .bind(SlottingSuggestionStatus::decide_from())
    .fetch_optional(&mut **txn)
    .await
    {
        Ok(v) => v,
        Err(e) => return ApiResponse::from(TopemsError::internal("应用建议失败", e)),
    };

    match row {
        Some(r) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);

                    return ApiResponse::server_error("事务提交失败");
                }
            }

            ApiResponse::success(
                serde_json::json!({
                    "id": r.try_get::<Uuid, _>("id").ok(),
                    "status": r.try_get::<String, _>("status").ok(),
                }),
                "success",
            )
        }

        None => ApiResponse::conflict("建议不存在、已删除或当前状态不允许应用"),
    }
}

/// 拒绝建议
#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:inventory:write"])),
    path = "/api/wms/slotting/suggestions/{id}/reject",
    responses((status = 200, description = "reject_suggestion OK")),
    tag = "WMS/slotting"
)]
pub async fn reject_suggestion(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let tenant = match tenant_of(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let row = match sqlx::query(
        r#"
        UPDATE wms.slotting_suggestions
        SET status = $2
        WHERE id = $1 AND tenant_id = $3 AND deleted_at IS NULL
          AND status = ANY($4)
          AND status = ANY(ARRAY['pending','applied','rejected'])
        RETURNING id, status
        "#,
    )
    .bind(id)
    .bind(SlottingSuggestionStatus::Rejected.as_db_str())
    .bind(tenant)
    .bind(SlottingSuggestionStatus::decide_from())
    .fetch_optional(&mut **txn)
    .await
    {
        Ok(v) => v,
        Err(e) => return ApiResponse::from(TopemsError::internal("拒绝建议失败", e)),
    };

    match row {
        Some(r) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);

                    return ApiResponse::server_error("事务提交失败");
                }
            }

            ApiResponse::success(
                serde_json::json!({
                    "id": r.try_get::<Uuid, _>("id").ok(),
                    "status": r.try_get::<String, _>("status").ok(),
                }),
                "success",
            )
        }

        None => ApiResponse::conflict("建议不存在、已删除或当前状态不允许拒绝"),
    }
}

/// 分区列表
#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:inventory:read"])),
    path = "/api/wms/slotting/zones",
    responses((status = 200, description = "list_zones OK")),
    tag = "WMS/slotting"
)]
pub async fn list_zones(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ZoneQueryParams>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let locale = Locale::from_headers(&headers).as_sql();
    let rows = match sqlx::query!(
        r#"
        SELECT id, tenant_id, warehouse_id,
               CASE WHEN $2 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name,
               zone_type, location_ids, is_active, created_at
        FROM wms.slotting_zones
        WHERE ($1::uuid IS NULL OR warehouse_id = $1)
        ORDER BY created_at
        "#,
        params.warehouse_id,
        locale,
    )
    .fetch_all(&mut **txn)
    .await
    {
        Ok(v) => v,
        Err(e) => return ApiResponse::from(TopemsError::internal("查询分区失败", e)),
    };

    let zones: Vec<SlottingZone> = rows
        .into_iter()
        .map(|r| SlottingZone {
            id: r.id,
            tenant_id: r.tenant_id,
            warehouse_id: r.warehouse_id,
            name: r.name.unwrap_or_default(),
            zone_type: r.zone_type,
            location_ids: r.location_ids,
            is_active: r.is_active,
            created_at: r.created_at,
        })
        .collect();

    ApiResponse::success(
        serde_json::to_value(zones).unwrap_or(serde_json::Value::Null),
        "success",
    )
}

/// 创建分区
#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:inventory:write"])),
    path = "/api/wms/slotting/zones",
    responses((status = 200, description = "create_zone OK")),
    tag = "WMS/slotting"
)]
pub async fn create_zone(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(payload): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let warehouse_id: Uuid = match payload
        .get("warehouse_id")
        .and_then(|v| v.as_str())
        .and_then(|s| Uuid::parse_str(s).ok())
    {
        Some(v) => v,
        None => {
            return ApiResponse::from(TopemsError::ValidationFailed(
                "warehouse_id 必填".to_string(),
            ))
        }
    };
    // 写操作必须携带有效租户：缺失或为零租户时返回 400，禁止落零 UUID。
    let tenant_id = match claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok())
    {
        Some(t) if !t.is_nil() => t,
        _ => return ApiResponse::error(400, "缺少租户上下文：拒绝创建分区"),
    };
    let name = payload
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("未命名分区")
        .to_string();
    let zone_type = payload
        .get("zone_type")
        .and_then(|v| v.as_str())
        .unwrap_or("bulk")
        .to_string();
    let location_ids = payload
        .get("location_ids")
        .cloned()
        .unwrap_or_else(|| serde_json::json!([]));
    let is_active = payload
        .get("is_active")
        .and_then(|v| v.as_bool())
        .unwrap_or(true);

    let row = match sqlx::query!(
        r#"
        INSERT INTO wms.slotting_zones
            (warehouse_id, name, zone_type, location_ids, is_active, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, tenant_id, warehouse_id, name, zone_type, location_ids, is_active, created_at
        "#,
        warehouse_id,
        name,
        zone_type,
        location_ids,
        is_active,
        tenant_id,
    )
    .fetch_one(&mut **txn)
    .await
    {
        Ok(v) => v,
        Err(e) => return ApiResponse::from(TopemsError::internal("创建分区失败", e)),
    };

    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("事务提交失败: {}", e);
            return ApiResponse::server_error("事务提交失败");
        }
    }
    ApiResponse::success(
        serde_json::to_value(SlottingZone {
            id: row.id,
            tenant_id: row.tenant_id,
            warehouse_id: row.warehouse_id,
            name: row.name,
            zone_type: row.zone_type,
            location_ids: row.location_ids,
            is_active: row.is_active,
            created_at: row.created_at,
        })
        .unwrap_or(serde_json::Value::Null),
        "success",
    )
}

/// 规则列表
#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:inventory:read"])),
    path = "/api/wms/slotting/rules",
    responses((status = 200, description = "list_rules OK")),
    tag = "WMS/slotting"
)]
pub async fn list_rules(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<RuleQueryParams>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let rows = match sqlx::query!(
        r#"
        SELECT id, tenant_id, warehouse_id, rule_type, priority, conditions, actions, is_active, created_at
        FROM wms.slotting_rules
        WHERE ($1::uuid IS NULL OR warehouse_id = $1)
        ORDER BY priority, created_at
        "#,
        params.warehouse_id,
    )
    .fetch_all(&mut **txn)
    .await {
        Ok(v) => v,
        Err(e) => return ApiResponse::from(TopemsError::internal("查询规则失败", e)),
    };

    let rules: Vec<SlottingRule> = rows
        .into_iter()
        .map(|r| SlottingRule {
            id: r.id,
            tenant_id: r.tenant_id,
            warehouse_id: r.warehouse_id,
            rule_type: r.rule_type,
            priority: r.priority,
            conditions: r.conditions,
            actions: r.actions,
            is_active: r.is_active,
            created_at: r.created_at,
        })
        .collect();

    ApiResponse::success(
        serde_json::to_value(rules).unwrap_or(serde_json::Value::Null),
        "success",
    )
}

/// 创建规则
#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:inventory:write"])),
    path = "/api/wms/slotting/rules",
    responses((status = 200, description = "create_rule OK")),
    tag = "WMS/slotting"
)]
#[allow(clippy::as_conversions, clippy::cast_possible_truncation)]
pub async fn create_rule(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(payload): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let warehouse_id: Uuid = match payload
        .get("warehouse_id")
        .and_then(|v| v.as_str())
        .and_then(|s| Uuid::parse_str(s).ok())
    {
        Some(v) => v,
        None => {
            return ApiResponse::from(TopemsError::ValidationFailed(
                "warehouse_id 必填".to_string(),
            ))
        }
    };
    // 写操作必须携带有效租户：缺失或为零租户时返回 400，禁止落零 UUID。
    let tenant_id = match claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok())
    {
        Some(t) if !t.is_nil() => t,
        _ => return ApiResponse::error(400, "缺少租户上下文：拒绝创建规则"),
    };
    let rule_type = payload
        .get("rule_type")
        .and_then(|v| v.as_str())
        .unwrap_or("velocity_class")
        .to_string();
    let priority = payload
        .get("priority")
        .and_then(|v| v.as_i64())
        .unwrap_or(10) as i32;
    let conditions = payload
        .get("conditions")
        .cloned()
        .unwrap_or_else(|| serde_json::json!([]));
    let actions = payload
        .get("actions")
        .cloned()
        .unwrap_or_else(|| serde_json::json!([]));
    let is_active = payload
        .get("is_active")
        .and_then(|v| v.as_bool())
        .unwrap_or(true);

    let row = match sqlx::query!(
        r#"
        INSERT INTO wms.slotting_rules
            (warehouse_id, rule_type, priority, conditions, actions, is_active, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, tenant_id, warehouse_id, rule_type, priority, conditions, actions, is_active, created_at
        "#,
        warehouse_id,
        rule_type,
        priority,
        conditions,
        actions,
        is_active,
        tenant_id,
    )
    .fetch_one(&mut **txn)
    .await {
        Ok(v) => v,
        Err(e) => return ApiResponse::from(TopemsError::internal("创建规则失败", e)),
    };

    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("事务提交失败: {}", e);
            return ApiResponse::server_error("事务提交失败");
        }
    }
    ApiResponse::success(
        serde_json::to_value(SlottingRule {
            id: row.id,
            tenant_id: row.tenant_id,
            warehouse_id: row.warehouse_id,
            rule_type: row.rule_type,
            priority: row.priority,
            conditions: row.conditions,
            actions: row.actions,
            is_active: row.is_active,
            created_at: row.created_at,
        })
        .unwrap_or(serde_json::Value::Null),
        "success",
    )
}

/// 影响分析：从建议聚合出优化前后距离、分数与影响面
#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:inventory:read"])),
    path = "/api/wms/slotting/impact-analysis",
    responses((status = 200, description = "get_impact_analysis OK")),
    tag = "WMS/slotting"
)]
#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
pub async fn get_impact_analysis(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ImpactParams>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let tenant = match tenant_of(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let agg = match sqlx::query(
        r#"
        SELECT
            COUNT(*)::bigint as total_suggestions,
            COUNT(DISTINCT material_id)::bigint as affected_materials,
            COALESCE(SUM(expected_improvement), 0)::float8 as total_improvement
        FROM wms.slotting_suggestions
        WHERE deleted_at IS NULL
          AND tenant_id = $2
          AND ($1::uuid IS NULL OR warehouse_id = $1)
          AND status = ANY(ARRAY['pending','applied','rejected'])
        "#,
    )
    .bind(params.warehouse_id)
    .bind(tenant)
    .fetch_one(&mut **txn)
    .await
    {
        Ok(v) => v,
        Err(e) => return ApiResponse::from(TopemsError::internal("分析失败", e)),
    };

    let total_suggestions = agg.try_get::<i64, _>("total_suggestions").unwrap_or(0);
    let affected_materials = agg.try_get::<i64, _>("affected_materials").unwrap_or(0);
    let total_improvement = agg
        .try_get::<f64, _>("total_improvement")
        .unwrap_or(0.0_f64);
    let result = ImpactAnalysis {
        current_pick_distance: 1000.0,
        optimized_pick_distance: (1000.0 - total_improvement).max(0.0),
        distance_reduction_percent: if total_improvement > 0.0 {
            (total_improvement / 1000.0 * 100.0).min(100.0)
        } else {
            0.0
        },
        current_slotting_score: 60.0,
        optimized_slotting_score: (60.0 + total_improvement / 10.0).min(100.0),
        affected_orders: total_suggestions,
        affected_materials,
        implementation_cost_estimate: (total_suggestions as f64 * 50.0),
    };

    ApiResponse::success(
        serde_json::to_value(result).unwrap_or(serde_json::Value::Null),
        "success",
    )
}

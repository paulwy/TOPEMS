//! WMS 策略设置（设置页真实数据源）
//!
//! 四个设置页各自读写一条真实配置：
//! - `/settings/inventory-threshold` → `wms.inventory_alert_rules`（低库存预警阈值规则）
//! - `/settings/cycle-count`         → `wms.cycle_count_configs`（循环盘点频率/优先级）
//! - `/settings/slotting`            → `wms.slotting_rules`（上架规则类型/优先级）
//! - `/settings/picking-sequence`    → `wms.picking_policy`（出库拣货批次顺序，真实驱动出库分配）
//!
//! 表里没有记录时返回默认值 + `configured=false`，前端据此提示“尚未配置”，
//! 不做任何写死显示；保存时才落行。

use axum::{
    extract::{Extension, FromRef, State},
    http::HeaderMap,
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use sqlx::Row;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::ApiResponse;
use uuid::Uuid;

use crate::modules::ApiState;
use crate::shared::permission::{check_permission, ModulePermission};
use crate::shared::scope::tenant_of;

pub fn create_routes<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
    ApiState: FromRef<S>,
{
    Router::new()
        .route(
            "/settings/inventory-threshold",
            get(get_inventory_threshold).put(put_inventory_threshold),
        )
        .route(
            "/settings/cycle-count",
            get(get_cycle_count_policy).put(put_cycle_count_policy),
        )
        .route(
            "/settings/slotting",
            get(get_slotting_policy).put(put_slotting_policy),
        )
        .route(
            "/settings/picking-sequence",
            get(get_picking_sequence).put(put_picking_sequence),
        )
}

/// 出库批次顺序策略取值，出库分配 SQL 直接按它决定 ORDER BY。
pub const PICK_STRATEGY_EXPIRY_FIRST: &str = "expiry_first";
pub const PICK_STRATEGY_FIFO: &str = "fifo";
pub const PICK_STRATEGY_LIFO: &str = "lifo";

// ---------------------------------------------------------------------------
// 库存阈值
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct InventoryThresholdView {
    pub rule_name: String,
    pub alert_type: String,
    pub threshold_value: f64,
    pub severity: String,
    pub enabled: bool,
    pub configured: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateInventoryThresholdRequest {
    pub rule_name: Option<String>,
    pub alert_type: Option<String>,
    pub threshold_value: Option<f64>,
    pub severity: Option<String>,
    pub enabled: Option<bool>,
}

fn default_threshold() -> InventoryThresholdView {
    InventoryThresholdView {
        rule_name: "默认库存阈值规则".to_string(),
        alert_type: "low_stock".to_string(),
        threshold_value: 0.0,
        severity: "warning".to_string(),
        enabled: true,
        configured: false,
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:inventory:read"])),
    path = "/api/wms/settings/inventory-threshold",
    responses((status = 200, description = "库存阈值规则")),
    tag = "wms"
)]
pub async fn get_inventory_threshold(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<InventoryThresholdView> {
    let tenant = match tenant_of(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        return e.0;
    }
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::server_error("rls transaction unavailable");
    };
    let row = sqlx::query(only_own_schema_query!(
        "wms",
        r#"
        SELECT rule_name, alert_type, threshold_value::float8 AS threshold_value, severity, enabled
        FROM wms.inventory_alert_rules
        WHERE tenant_id = $1::uuid AND deleted_at IS NULL
        ORDER BY created_at, id
        LIMIT 1
        "#
    ))
    .bind(tenant)
    .fetch_optional(&mut **txn)
    .await;
    match row {
        Ok(Some(r)) => ApiResponse::success(
            InventoryThresholdView {
                rule_name: r.try_get("rule_name").unwrap_or_default(),
                alert_type: r.try_get("alert_type").unwrap_or_default(),
                threshold_value: r.try_get("threshold_value").unwrap_or(0.0),
                severity: r.try_get("severity").unwrap_or_default(),
                enabled: r.try_get("enabled").unwrap_or(true),
                configured: true,
            },
            "库存阈值规则",
        ),
        Ok(None) => ApiResponse::success(default_threshold(), "尚未配置库存阈值规则"),
        Err(e) => {
            tracing::error!("读取库存阈值规则失败: {}", e);
            ApiResponse::server_error("读取库存阈值规则失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["wms:inventory:write"])),
    path = "/api/wms/settings/inventory-threshold",
    request_body = UpdateInventoryThresholdRequest,
    responses((status = 200, description = "库存阈值规则已保存")),
    tag = "wms"
)]
pub async fn put_inventory_threshold(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(payload): Json<UpdateInventoryThresholdRequest>,
) -> ApiResponse<InventoryThresholdView> {
    let tenant = match tenant_of(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        return e.0;
    }
    if let Some(v) = payload.threshold_value {
        if !v.is_finite() || v < 0.0 {
            return ApiResponse::bad_request("阈值必须是不小于 0 的数值");
        }
    }
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::server_error("rls transaction unavailable");
    };

    let existing: Option<Uuid> = match sqlx::query_scalar(only_own_schema_query!(
        "wms",
        "SELECT id FROM wms.inventory_alert_rules WHERE tenant_id = $1::uuid AND deleted_at IS NULL ORDER BY created_at, id LIMIT 1"
    ))
    .bind(tenant)
    .fetch_optional(&mut **txn)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询库存阈值规则失败: {}", e);
            return ApiResponse::server_error("查询库存阈值规则失败");
        }
    };

    let result = match existing {
        Some(id) => sqlx::query(only_own_schema_query!(
            "wms",
            r#"
            UPDATE wms.inventory_alert_rules SET
                rule_name = COALESCE($2, rule_name),
                alert_type = COALESCE($3, alert_type),
                threshold_value = COALESCE($4, threshold_value),
                severity = COALESCE($5, severity),
                enabled = COALESCE($6, enabled),
                updated_at = NOW()
            WHERE id = $1 AND tenant_id = $7::uuid AND deleted_at IS NULL
            "#
        ))
        .bind(id)
        .bind(payload.rule_name.clone())
        .bind(payload.alert_type.clone())
        .bind(payload.threshold_value)
        .bind(payload.severity.clone())
        .bind(payload.enabled)
        .bind(tenant)
        .execute(&mut **txn)
        .await
        .map(|_| id),
        None => sqlx::query_scalar::<_, Uuid>(only_own_schema_query!(
            "wms",
            r#"
            INSERT INTO wms.inventory_alert_rules
                (id, tenant_id, organization_id, org_id, rule_name, alert_type, threshold_value, severity, enabled, created_at, updated_at)
            VALUES ($1, $2::uuid, $2::uuid, $2::uuid, $3, $4, $5, $6, $7, NOW(), NOW())
            RETURNING id
            "#
        ))
        .bind(Uuid::new_v4())
        .bind(tenant)
        .bind(payload.rule_name.unwrap_or_else(|| default_threshold().rule_name))
        .bind(payload.alert_type.unwrap_or_else(|| default_threshold().alert_type))
        .bind(payload.threshold_value.unwrap_or(0.0))
        .bind(payload.severity.unwrap_or_else(|| default_threshold().severity))
        .bind(payload.enabled.unwrap_or(true))
        .fetch_one(&mut **txn)
        .await,
    };

    match result {
        Ok(_) => match read_threshold(&mut **txn, tenant).await {
            Ok(view) => ApiResponse::success(view, "库存阈值规则已保存"),
            Err(e) => {
                tracing::error!("保存后回读库存阈值规则失败: {}", e);
                ApiResponse::server_error("保存后回读库存阈值规则失败")
            }
        },
        Err(e) => {
            tracing::error!("保存库存阈值规则失败: {}", e);
            ApiResponse::server_error("保存库存阈值规则失败")
        }
    }
}

// ---------------------------------------------------------------------------
// 循环盘点
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CycleCountPolicyView {
    pub count_frequency: String,
    pub priority_level: String,
    pub material_category: Option<String>,
    pub is_active: bool,
    pub configured: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateCycleCountPolicyRequest {
    pub count_frequency: Option<String>,
    pub priority_level: Option<String>,
    pub material_category: Option<String>,
    pub is_active: Option<bool>,
}

fn default_cycle_policy() -> CycleCountPolicyView {
    CycleCountPolicyView {
        count_frequency: "monthly".to_string(),
        priority_level: "normal".to_string(),
        material_category: None,
        is_active: true,
        configured: false,
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:inventory:read"])),
    path = "/api/wms/settings/cycle-count",
    responses((status = 200, description = "循环盘点配置")),
    tag = "wms"
)]
pub async fn get_cycle_count_policy(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<CycleCountPolicyView> {
    let tenant = match tenant_of(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        return e.0;
    }
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::server_error("rls transaction unavailable");
    };
    let row = sqlx::query(only_own_schema_query!(
        "wms",
        r#"
        SELECT count_frequency, priority_level, material_category, is_active
        FROM wms.cycle_count_configs
        WHERE tenant_id = $1::uuid AND deleted_at IS NULL
        ORDER BY is_active DESC, priority_level, created_at
        LIMIT 1
        "#
    ))
    .bind(tenant)
    .fetch_optional(&mut **txn)
    .await;
    match row {
        Ok(Some(r)) => ApiResponse::success(
            CycleCountPolicyView {
                count_frequency: r.try_get::<Option<String>, _>("count_frequency").ok().flatten().unwrap_or_else(|| "monthly".into()),
                priority_level: r.try_get::<Option<String>, _>("priority_level").ok().flatten().unwrap_or_else(|| "normal".into()),
                material_category: r.try_get::<Option<String>, _>("material_category").ok().flatten(),
                is_active: r.try_get("is_active").unwrap_or(true),
                configured: true,
            },
            "循环盘点配置",
        ),
        Ok(None) => ApiResponse::success(default_cycle_policy(), "尚未配置循环盘点"),
        Err(e) => {
            tracing::error!("读取循环盘点配置失败: {}", e);
            ApiResponse::server_error("读取循环盘点配置失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["wms:inventory:write"])),
    path = "/api/wms/settings/cycle-count",
    request_body = UpdateCycleCountPolicyRequest,
    responses((status = 200, description = "循环盘点配置已保存")),
    tag = "wms"
)]
pub async fn put_cycle_count_policy(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(payload): Json<UpdateCycleCountPolicyRequest>,
) -> ApiResponse<CycleCountPolicyView> {
    let tenant = match tenant_of(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        return e.0;
    }
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::server_error("rls transaction unavailable");
    };
    let existing: Option<Uuid> = match sqlx::query_scalar(only_own_schema_query!(
        "wms",
        "SELECT id FROM wms.cycle_count_configs WHERE tenant_id = $1::uuid AND deleted_at IS NULL ORDER BY is_active DESC, created_at LIMIT 1"
    ))
    .bind(tenant)
    .fetch_optional(&mut **txn)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询循环盘点配置失败: {}", e);
            return ApiResponse::server_error("查询循环盘点配置失败");
        }
    };
    let result = match existing {
        Some(id) => sqlx::query(only_own_schema_query!(
            "wms",
            r#"
            UPDATE wms.cycle_count_configs SET
                count_frequency = COALESCE($2, count_frequency),
                priority_level = COALESCE($3, priority_level),
                material_category = COALESCE($4, material_category),
                is_active = COALESCE($5, is_active),
                updated_at = NOW()
            WHERE id = $1 AND tenant_id = $6::uuid AND deleted_at IS NULL
            "#
        ))
        .bind(id)
        .bind(payload.count_frequency.clone())
        .bind(payload.priority_level.clone())
        .bind(payload.material_category.clone())
        .bind(payload.is_active)
        .bind(tenant)
        .execute(&mut **txn)
        .await
        .map(|_| ()),
        None => sqlx::query(only_own_schema_query!(
            "wms",
            r#"
            INSERT INTO wms.cycle_count_configs
                (id, tenant_id, organization_id, org_id, count_frequency, priority_level, material_category, is_active, created_at, updated_at)
            VALUES ($1, $2::uuid, $2::uuid, $2::uuid, $3, $4, $5, $6, NOW(), NOW())
            "#
        ))
        .bind(Uuid::new_v4())
        .bind(tenant)
        .bind(payload.count_frequency.unwrap_or_else(|| "monthly".into()))
        .bind(payload.priority_level.unwrap_or_else(|| "normal".into()))
        .bind(payload.material_category)
        .bind(payload.is_active.unwrap_or(true))
        .execute(&mut **txn)
        .await
        .map(|_| ()),
    };
    match result {
        Ok(_) => match read_cycle_policy(&mut **txn, tenant).await {
            Ok(view) => ApiResponse::success(view, "循环盘点配置已保存"),
            Err(e) => {
                tracing::error!("保存后回读循环盘点配置失败: {}", e);
                ApiResponse::server_error("保存后回读循环盘点配置失败")
            }
        },
        Err(e) => {
            tracing::error!("保存循环盘点配置失败: {}", e);
            ApiResponse::server_error("保存循环盘点配置失败")
        }
    }
}

// ---------------------------------------------------------------------------
// 上架规则
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SlottingPolicyView {
    pub rule_type: String,
    pub priority: i32,
    pub is_active: bool,
    /// 租户下是否已有仓库：规则表 warehouse_id 非空，没有仓库时无法落规则。
    pub warehouse_available: bool,
    pub configured: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateSlottingPolicyRequest {
    pub rule_type: Option<String>,
    pub priority: Option<i32>,
    pub is_active: Option<bool>,
}

fn default_slotting_policy() -> SlottingPolicyView {
    SlottingPolicyView {
        rule_type: "velocity_class".to_string(),
        priority: 10,
        is_active: true,
        warehouse_available: true,
        configured: false,
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:inventory:read"])),
    path = "/api/wms/settings/slotting",
    responses((status = 200, description = "上架规则")),
    tag = "wms"
)]
pub async fn get_slotting_policy(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<SlottingPolicyView> {
    let tenant = match tenant_of(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        return e.0;
    }
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::server_error("rls transaction unavailable");
    };
    let warehouse_available: bool = sqlx::query_scalar::<_, bool>(only_own_schema_query!(
        "wms",
        "SELECT EXISTS (SELECT 1 FROM wms.warehouses WHERE tenant_id = $1::uuid AND deleted_at IS NULL)"
    ))
    .bind(tenant)
    .fetch_one(&mut **txn)
    .await
    .unwrap_or(false);
    let row = sqlx::query(only_own_schema_query!(
        "wms",
        r#"
        SELECT rule_type, priority, is_active
        FROM wms.slotting_rules
        WHERE tenant_id = $1::uuid AND deleted_at IS NULL
        ORDER BY priority, created_at
        LIMIT 1
        "#
    ))
    .bind(tenant)
    .fetch_optional(&mut **txn)
    .await;
    match row {
        Ok(Some(r)) => ApiResponse::success(
            SlottingPolicyView {
                rule_type: r.try_get("rule_type").unwrap_or_else(|_| "velocity_class".into()),
                priority: r.try_get("priority").unwrap_or(10),
                is_active: r.try_get("is_active").unwrap_or(true),
                warehouse_available: true,
                configured: true,
            },
            "上架规则",
        ),
        Ok(None) => ApiResponse::success(
            SlottingPolicyView {
                warehouse_available,
                ..default_slotting_policy()
            },
            "尚未配置上架规则",
        ),
        Err(e) => {
            tracing::error!("读取上架规则失败: {}", e);
            ApiResponse::server_error("读取上架规则失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["wms:inventory:write"])),
    path = "/api/wms/settings/slotting",
    request_body = UpdateSlottingPolicyRequest,
    responses((status = 200, description = "上架规则已保存")),
    tag = "wms"
)]
pub async fn put_slotting_policy(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(payload): Json<UpdateSlottingPolicyRequest>,
) -> ApiResponse<SlottingPolicyView> {
    let tenant = match tenant_of(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        return e.0;
    }
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::server_error("rls transaction unavailable");
    };
    let existing: Option<Uuid> = match sqlx::query_scalar(only_own_schema_query!(
        "wms",
        "SELECT id FROM wms.slotting_rules WHERE tenant_id = $1::uuid AND deleted_at IS NULL ORDER BY priority, created_at LIMIT 1"
    ))
    .bind(tenant)
    .fetch_optional(&mut **txn)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询上架规则失败: {}", e);
            return ApiResponse::server_error("查询上架规则失败");
        }
    };
    // 规则表要求 warehouse_id 非空：单条“全局规则”取该租户第一个仓库。
    let default_warehouse: Option<Uuid> = match sqlx::query_scalar(only_own_schema_query!(
        "wms",
        "SELECT id FROM wms.warehouses WHERE tenant_id = $1::uuid AND deleted_at IS NULL ORDER BY created_at LIMIT 1"
    ))
    .bind(tenant)
    .fetch_optional(&mut **txn)
    .await
    {
        Ok(v) => v,
        Err(_) => None,
    };

    let result = match existing {
        Some(id) => sqlx::query(only_own_schema_query!(
            "wms",
            r#"
            UPDATE wms.slotting_rules SET
                rule_type = COALESCE($2, rule_type),
                priority = COALESCE($3, priority),
                is_active = COALESCE($4, is_active)
            WHERE id = $1 AND tenant_id = $5::uuid AND deleted_at IS NULL
            "#
        ))
        .bind(id)
        .bind(payload.rule_type.clone())
        .bind(payload.priority)
        .bind(payload.is_active)
        .bind(tenant)
        .execute(&mut **txn)
        .await
        .map(|_| ()),
        None => match default_warehouse {
            Some(warehouse_id) => sqlx::query(only_own_schema_query!(
                "wms",
                r#"
                INSERT INTO wms.slotting_rules
                    (id, tenant_id, warehouse_id, rule_type, priority, conditions, actions, is_active, created_at)
                VALUES ($1, $2::uuid, $3, $4, $5, '[]'::jsonb, '[]'::jsonb, $6, NOW())
                "#
            ))
            .bind(Uuid::new_v4())
            .bind(tenant)
            .bind(warehouse_id)
            .bind(payload.rule_type.unwrap_or_else(|| "velocity_class".into()))
            .bind(payload.priority.unwrap_or(10))
            .bind(payload.is_active.unwrap_or(true))
            .execute(&mut **txn)
            .await
            .map(|_| ()),
            None => {
                return ApiResponse::bad_request("当前租户还没有仓库，无法建立上架规则")
            }
        },
    };
    match result {
        Ok(_) => match read_slotting_policy(&mut **txn, tenant).await {
            Ok(view) => ApiResponse::success(view, "上架规则已保存"),
            Err(e) => {
                tracing::error!("保存后回读上架规则失败: {}", e);
                ApiResponse::server_error("保存后回读上架规则失败")
            }
        },
        Err(e) => {
            tracing::error!("保存上架规则失败: {}", e);
            ApiResponse::server_error("保存上架规则失败")
        }
    }
}

// ---------------------------------------------------------------------------
// 出库批次顺序（FIFO/有效期优先）
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct PickingSequenceView {
    /// expiry_first（默认，按有效期到期日优先）/ fifo（先入先出）/ lifo（后入先出）
    pub pick_strategy: String,
    pub configured: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdatePickingSequenceRequest {
    pub pick_strategy: String,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:inventory:read"])),
    path = "/api/wms/settings/picking-sequence",
    responses((status = 200, description = "出库拣货顺序策略")),
    tag = "wms"
)]
pub async fn get_picking_sequence(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<PickingSequenceView> {
    let tenant = match tenant_of(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        return e.0;
    }
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::server_error("rls transaction unavailable");
    };
    let row = sqlx::query_scalar::<_, String>(only_own_schema_query!(
        "wms",
        "SELECT pick_strategy FROM wms.picking_policy WHERE tenant_id = $1::uuid AND deleted_at IS NULL LIMIT 1"
    ))
    .bind(tenant)
    .fetch_optional(&mut **txn)
    .await;
    match row {
        Ok(Some(strategy)) => ApiResponse::success(
            PickingSequenceView {
                pick_strategy: strategy,
                configured: true,
            },
            "出库拣货顺序策略",
        ),
        Ok(None) => ApiResponse::success(
            PickingSequenceView {
                pick_strategy: PICK_STRATEGY_EXPIRY_FIRST.to_string(),
                configured: false,
            },
            "尚未配置拣货顺序，按有效期优先",
        ),
        Err(e) => {
            tracing::error!("读取拣货顺序策略失败: {}", e);
            ApiResponse::server_error("读取拣货顺序策略失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["wms:inventory:write"])),
    path = "/api/wms/settings/picking-sequence",
    request_body = UpdatePickingSequenceRequest,
    responses((status = 200, description = "拣货顺序策略已保存")),
    tag = "wms"
)]
pub async fn put_picking_sequence(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(payload): Json<UpdatePickingSequenceRequest>,
) -> ApiResponse<PickingSequenceView> {
    let tenant = match tenant_of(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        return e.0;
    }
    let strategy = payload.pick_strategy.trim().to_string();
    if !matches!(
        strategy.as_str(),
        PICK_STRATEGY_EXPIRY_FIRST | PICK_STRATEGY_FIFO | PICK_STRATEGY_LIFO
    ) {
        return ApiResponse::bad_request("未知的拣货顺序策略");
    }
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::server_error("rls transaction unavailable");
    };
    let result = sqlx::query(only_own_schema_query!(
        "wms",
        r#"
        INSERT INTO wms.picking_policy (id, tenant_id, pick_strategy, created_at, updated_at)
        VALUES ($1, $2::uuid, $3, NOW(), NOW())
        ON CONFLICT (tenant_id) WHERE deleted_at IS NULL
        DO UPDATE SET pick_strategy = EXCLUDED.pick_strategy, updated_at = NOW()
        "#
    ))
    .bind(Uuid::new_v4())
    .bind(tenant)
    .bind(&strategy)
    .execute(&mut **txn)
    .await;
    match result {
        Ok(_) => match read_picking_sequence(&mut **txn, tenant).await {
            Ok(view) => ApiResponse::success(view, "拣货顺序策略已保存"),
            Err(e) => {
                tracing::error!("保存后回读拣货顺序策略失败: {}", e);
                ApiResponse::server_error("保存后回读拣货顺序策略失败")
            }
        },
        Err(e) => {
            tracing::error!("保存拣货顺序策略失败: {}", e);
            ApiResponse::server_error("保存拣货顺序策略失败")
        }
    }
}

/// 读取租户的出库拣货顺序策略（供出库分配复用）；无配置时按有效期优先。
pub async fn load_pick_strategy(txn: &mut sqlx::PgConnection, tenant: Uuid) -> String {
    let row = sqlx::query_scalar::<_, String>(only_own_schema_query!(
        "wms",
        "SELECT pick_strategy FROM wms.picking_policy WHERE tenant_id = $1::uuid AND deleted_at IS NULL LIMIT 1"
    ))
    .bind(tenant)
    .fetch_optional(&mut *txn)
    .await;
    row.ok()
        .flatten()
        .filter(|s| {
            matches!(
                s.as_str(),
                PICK_STRATEGY_EXPIRY_FIRST | PICK_STRATEGY_FIFO | PICK_STRATEGY_LIFO
            )
        })
        .unwrap_or_else(|| PICK_STRATEGY_EXPIRY_FIRST.to_string())
}

// ---------------------------------------------------------------------------
// 回读助手（GET 与 PUT 共用，保证保存响应就是库里的真实值）
// ---------------------------------------------------------------------------

async fn read_threshold(
    txn: &mut sqlx::PgConnection,
    tenant: Uuid,
) -> Result<InventoryThresholdView, sqlx::Error> {
    let row = sqlx::query(only_own_schema_query!(
        "wms",
        r#"
        SELECT rule_name, alert_type, threshold_value::float8 AS threshold_value, severity, enabled
        FROM wms.inventory_alert_rules
        WHERE tenant_id = $1::uuid AND deleted_at IS NULL
        ORDER BY created_at, id
        LIMIT 1
        "#
    ))
    .bind(tenant)
    .fetch_optional(&mut *txn)
    .await?;
    Ok(match row {
        Some(r) => InventoryThresholdView {
            rule_name: r.try_get("rule_name").unwrap_or_default(),
            alert_type: r.try_get("alert_type").unwrap_or_default(),
            threshold_value: r.try_get("threshold_value").unwrap_or(0.0),
            severity: r.try_get("severity").unwrap_or_default(),
            enabled: r.try_get("enabled").unwrap_or(true),
            configured: true,
        },
        None => default_threshold(),
    })
}

async fn read_cycle_policy(
    txn: &mut sqlx::PgConnection,
    tenant: Uuid,
) -> Result<CycleCountPolicyView, sqlx::Error> {
    let row = sqlx::query(only_own_schema_query!(
        "wms",
        r#"
        SELECT count_frequency, priority_level, material_category, is_active
        FROM wms.cycle_count_configs
        WHERE tenant_id = $1::uuid AND deleted_at IS NULL
        ORDER BY is_active DESC, priority_level, created_at
        LIMIT 1
        "#
    ))
    .bind(tenant)
    .fetch_optional(&mut *txn)
    .await?;
    Ok(match row {
        Some(r) => CycleCountPolicyView {
            count_frequency: r
                .try_get::<Option<String>, _>("count_frequency")
                .ok()
                .flatten()
                .unwrap_or_else(|| "monthly".into()),
            priority_level: r
                .try_get::<Option<String>, _>("priority_level")
                .ok()
                .flatten()
                .unwrap_or_else(|| "normal".into()),
            material_category: r.try_get::<Option<String>, _>("material_category").ok().flatten(),
            is_active: r.try_get("is_active").unwrap_or(true),
            configured: true,
        },
        None => default_cycle_policy(),
    })
}

async fn read_slotting_policy(
    txn: &mut sqlx::PgConnection,
    tenant: Uuid,
) -> Result<SlottingPolicyView, sqlx::Error> {
    let warehouse_available: bool = sqlx::query_scalar::<_, bool>(only_own_schema_query!(
        "wms",
        "SELECT EXISTS (SELECT 1 FROM wms.warehouses WHERE tenant_id = $1::uuid AND deleted_at IS NULL)"
    ))
    .bind(tenant)
    .fetch_one(&mut *txn)
    .await?;
    let row = sqlx::query(only_own_schema_query!(
        "wms",
        r#"
        SELECT rule_type, priority, is_active
        FROM wms.slotting_rules
        WHERE tenant_id = $1::uuid AND deleted_at IS NULL
        ORDER BY priority, created_at
        LIMIT 1
        "#
    ))
    .bind(tenant)
    .fetch_optional(&mut *txn)
    .await?;
    Ok(match row {
        Some(r) => SlottingPolicyView {
            rule_type: r
                .try_get("rule_type")
                .unwrap_or_else(|_| "velocity_class".into()),
            priority: r.try_get("priority").unwrap_or(10),
            is_active: r.try_get("is_active").unwrap_or(true),
            warehouse_available,
            configured: true,
        },
        None => SlottingPolicyView {
            warehouse_available,
            ..default_slotting_policy()
        },
    })
}

async fn read_picking_sequence(
    txn: &mut sqlx::PgConnection,
    tenant: Uuid,
) -> Result<PickingSequenceView, sqlx::Error> {
    let row = sqlx::query_scalar::<_, String>(only_own_schema_query!(
        "wms",
        "SELECT pick_strategy FROM wms.picking_policy WHERE tenant_id = $1::uuid AND deleted_at IS NULL LIMIT 1"
    ))
    .bind(tenant)
    .fetch_optional(&mut *txn)
    .await?;
    Ok(match row {
        Some(strategy) => PickingSequenceView {
            pick_strategy: strategy,
            configured: true,
        },
        None => PickingSequenceView {
            pick_strategy: PICK_STRATEGY_EXPIRY_FIRST.to_string(),
            configured: false,
        },
    })
}

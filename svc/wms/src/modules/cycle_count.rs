use axum::{
    extract::{Extension, FromRef, Path, Query, State},
    http::HeaderMap,
    routing::{get, post},
    Json, Router,
};
use chrono::{Duration, Utc};
use serde::Deserialize;
use uuid::Uuid;

use crate::models::inventory_alert::{CreateCycleCountConfigRequest, CycleCountConfig};
use crate::modules::audit::log_audit_event;
use crate::modules::ApiState;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::{api_error, ApiResponse};

#[derive(Debug, Deserialize)]
pub struct CycleCountQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub warehouse_id: Option<Uuid>,
    pub is_active: Option<bool>,
}

pub fn create_routes<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
    ApiState: FromRef<S>,
{
    Router::new()
        .route(
            "/cycle-counts",
            get(list_cycle_count_configs).post(create_cycle_count_config),
        )
        .route(
            "/cycle-counts/{id}",
            get(get_cycle_count_config)
                .put(update_cycle_count_config)
                .delete(delete_cycle_count_config),
        )
        .route("/cycle-counts/{id}/generate", post(generate_cycle_count))
        .route(
            "/cycle-counts/generate-all",
            post(generate_all_cycle_counts),
        )
}

/// 获取循环盘点配置列表
pub async fn list_cycle_count_configs(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<CycleCountQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;
    let warehouse_id = params.warehouse_id;
    let is_active = params.is_active;

    let result = sqlx::query_as::<_, CycleCountConfig>(
        r#"
        SELECT id, warehouse_id, location_id, material_category, count_frequency, priority_level,
               last_count_date, next_count_date, is_active, created_at, updated_at
        FROM wms.cycle_count_configs
        WHERE ($1::uuid IS NULL OR warehouse_id = $1)
          AND ($2::boolean IS NULL OR is_active = $2)
          AND deleted_at IS NULL
        ORDER BY priority_level, next_count_date
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(&warehouse_id)
    .bind(&is_active)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(configs) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM wms.cycle_count_configs
                WHERE ($1::uuid IS NULL OR warehouse_id = $1)
                  AND ($2::boolean IS NULL OR is_active = $2)
                  AND deleted_at IS NULL
                "#,
            )
            .bind(&warehouse_id)
            .bind(&is_active)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "configs": configs,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取循环盘点配置列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取循环盘点配置列表失败: {}", e);
            Json(api_error(500, "获取循环盘点配置列表失败"))
        }
    }
}

/// 创建循环盘点配置
pub async fn create_cycle_count_config(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateCycleCountConfigRequest>,
) -> Json<ApiResponse<CycleCountConfig>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let request_data = serde_json::to_value(&req).ok();
    let id = Uuid::new_v4();
    let now = Utc::now();

    // 计算下次盘点日期
    let next_count_date = match req.count_frequency.as_str() {
        "daily" => now + Duration::days(1),
        "weekly" => now + Duration::weeks(1),
        "monthly" => now + Duration::days(30),
        _ => now + Duration::days(30),
    };

    let result = sqlx::query_as::<_, CycleCountConfig>(
        r#"
        INSERT INTO wms.cycle_count_configs (id, warehouse_id, location_id, material_category, count_frequency, priority_level, next_count_date, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $9)
        RETURNING id, warehouse_id, location_id, material_category, count_frequency, priority_level, last_count_date, next_count_date, is_active, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.warehouse_id)
    .bind(&req.location_id)
    .bind(&req.material_category)
    .bind(&req.count_frequency)
    .bind(&req.priority_level)
    .bind(next_count_date)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status, error_msg) = match &result {
        Ok(config) => (
            Json(ApiResponse::success(config.clone(), "循环盘点配置创建成功")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("创建循环盘点配置失败: {}", e);
            (
                Json(api_error(500, "循环盘点配置创建失败")),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(config) = &result {
        serde_json::to_value(config).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "cycle_count_config".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status.to_string(),
        error_msg,
        &headers,
    )
    .await;

    response
}

/// 获取循环盘点配置详情
pub async fn get_cycle_count_config(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<CycleCountConfig>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let result = sqlx::query_as::<_, CycleCountConfig>(
        r#"
        SELECT id, warehouse_id, location_id, material_category, count_frequency, priority_level,
               last_count_date, next_count_date, is_active, created_at, updated_at
        FROM wms.cycle_count_configs
        WHERE id = $1 AND deleted_at IS NULL
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(config)) => Json(ApiResponse::success(config, "获取循环盘点配置成功")),
        Ok(None) => Json(api_error(404, "循环盘点配置不存在")),
        Err(e) => {
            tracing::error!("获取循环盘点配置失败: {}", e);
            Json(api_error(500, "获取循环盘点配置失败"))
        }
    }
}

/// 更新循环盘点配置
pub async fn update_cycle_count_config(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<CreateCycleCountConfigRequest>,
) -> Json<ApiResponse<CycleCountConfig>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let request_data = serde_json::to_value(&req).ok();
    let now = Utc::now();

    // 计算新的下次盘点日期
    let next_count_date = match req.count_frequency.as_str() {
        "daily" => now + Duration::days(1),
        "weekly" => now + Duration::weeks(1),
        "monthly" => now + Duration::days(30),
        _ => now + Duration::days(30),
    };

    let result = sqlx::query_as::<_, CycleCountConfig>(
        r#"
        UPDATE wms.cycle_count_configs SET
            warehouse_id = $2, location_id = $3, material_category = $4, count_frequency = $5,
            priority_level = $6, next_count_date = $7, updated_at = $8
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id, warehouse_id, location_id, material_category, count_frequency, priority_level,
                  last_count_date, next_count_date, is_active, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.warehouse_id)
    .bind(&req.location_id)
    .bind(&req.material_category)
    .bind(&req.count_frequency)
    .bind(&req.priority_level)
    .bind(next_count_date)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status, error_msg) = match &result {
        Ok(config) => (
            Json(ApiResponse::success(config.clone(), "循环盘点配置更新成功")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("更新循环盘点配置失败: {}", e);
            (
                Json(api_error(500, "循环盘点配置更新失败")),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(config) = &result {
        serde_json::to_value(config).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "cycle_count_config".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status.to_string(),
        error_msg,
        &headers,
    )
    .await;

    response
}

/// 删除循环盘点配置
pub async fn delete_cycle_count_config(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let result = sqlx::query!(
        r#"
        UPDATE wms.cycle_count_configs
        SET deleted_at = $2, is_active = false, updated_at = $2
        WHERE id = $1
        "#,
        id,
        Utc::now()
    )
    .execute(&state.db)
    .await;

    let (response, status, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "循环盘点配置删除成功")),
            "success",
            None,
        ),
        Ok(_) => (
            Json(api_error(404, "循环盘点配置不存在")),
            "error",
            Some("不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除循环盘点配置失败: {}", e);
            (
                Json(api_error(500, "循环盘点配置删除失败")),
                "error",
                Some(e.to_string()),
            )
        }
    };

    log_audit_event(
        &state.db,
        "delete".to_string(),
        "cycle_count_config".to_string(),
        Some(id),
        None,
        None,
        None,
        None,
        None,
        status.to_string(),
        error_msg,
        &headers,
    )
    .await;

    response
}

/// 根据配置生成循环盘点
pub async fn generate_cycle_count(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    // 获取配置
    let config = sqlx::query_as::<_, CycleCountConfig>(
        r#"
        SELECT id, warehouse_id, location_id, material_category, count_frequency, priority_level,
               last_count_date, next_count_date, is_active, created_at, updated_at
        FROM wms.cycle_count_configs
        WHERE id = $1 AND is_active = true AND deleted_at IS NULL
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let config = match config {
        Ok(Some(c)) => c,
        Ok(None) => return Json(api_error(404, "循环盘点配置不存在或已停用")),
        Err(e) => return Json(api_error(500, &format!("查询配置失败: {}", e))),
    };

    // 生成盘点单号
    let stock_take_number = format!("CC-{}", Utc::now().format("%Y%m%d%H%M"));
    let now = Utc::now();

    // 创建盘点单
    let stock_take_id = Uuid::new_v4();
    let result = sqlx::query!(
        r#"
        INSERT INTO wms.stock_takes (id, stock_take_number, stock_take_type, warehouse_id, warehouse_name,
                                     location_id, location_code, material_code, material_name,
                                     status, planned_date, planned_by, planned_by_id, created_at, updated_at)
        VALUES ($1, $2, 'cycle', $3, w.warehouse_name, $4, l.location_code, $5, $6,
                'planned', CURRENT_DATE, $7, $8, $9, $10)
        RETURNING id
        "#,
        stock_take_id,
        stock_take_number,
        config.warehouse_id,
        config.location_id,
        config.material_category,
        config.material_category,
        "system",
        Uuid::nil(),
        now,
        now
    )
    .bind(&config.warehouse_id)
    .fetch_one(&state.db)
    .await;

    let new_stock_take_id = match result {
        Ok(r) => r.id,
        Err(e) => return Json(api_error(500, &format!("创建盘点单失败: {}", e))),
    };

    // 更新配置的最后盘点日期和下次盘点日期
    let next_count_date = match config.count_frequency.as_str() {
        "daily" => now + Duration::days(1),
        "weekly" => now + Duration::weeks(1),
        "monthly" => now + Duration::days(30),
        _ => now + Duration::days(30),
    };

    let _ = sqlx::query!(
        r#"
        UPDATE wms.cycle_count_configs
        SET last_count_date = $2, next_count_date = $3, updated_at = $4
        WHERE id = $1
        "#,
        id,
        now,
        next_count_date,
        now
    )
    .execute(&state.db)
    .await;

    log_audit_event(
        &state.db,
        "generate".to_string(),
        "cycle_count".to_string(),
        Some(id),
        None,
        None,
        Some(new_stock_take_id),
        None,
        None,
        "success".to_string(),
        None,
        &headers,
    )
    .await;

    Json(ApiResponse::success(
        serde_json::json!({
            "stock_take_id": new_stock_take_id,
            "stock_take_number": stock_take_number
        }),
        "循环盘点生成成功",
    ))
}

/// 生成所有到期的循环盘点
pub async fn generate_all_cycle_counts(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let now = Utc::now();

    // 查询所有到期的配置
    let configs = sqlx::query_as::<_, CycleCountConfig>(
        r#"
        SELECT id, warehouse_id, location_id, material_category, count_frequency, priority_level,
               last_count_date, next_count_date, is_active, created_at, updated_at
        FROM wms.cycle_count_configs
        WHERE is_active = true AND next_count_date <= $1 AND deleted_at IS NULL
        ORDER BY priority_level DESC, next_count_date
        "#,
    )
    .bind(now)
    .fetch_all(&state.db)
    .await;

    let configs = match configs {
        Ok(c) => c,
        Err(e) => return Json(api_error(500, &format!("查询配置失败: {}", e))),
    };

    let mut generated_count = 0;
    let mut results: Vec<serde_json::Value> = Vec::new();

    for config in configs {
        let stock_take_number = format!("CC-{}", Utc::now().format("%Y%m%d%H%M%S"));
        let stock_take_id = Uuid::new_v4();

        // 创建盘点单
        let create_result = sqlx::query!(
            r#"
            INSERT INTO wms.stock_takes (id, stock_take_number, stock_take_type, warehouse_id,
                                         location_id, material_category, status, planned_date,
                                         planned_by, created_at, updated_at)
            VALUES ($1, $2, 'cycle', $3, $4, $5, 'planned', CURRENT_DATE, $6, $7, $8)
            RETURNING id
            "#,
            stock_take_id,
            stock_take_number,
            config.warehouse_id,
            config.location_id,
            config.material_category,
            "system",
            now,
            now
        )
        .fetch_one(&state.db)
        .await;

        if create_result.is_ok() {
            // 更新配置的盘点日期
            let next_count_date = match config.count_frequency.as_str() {
                "daily" => now + Duration::days(1),
                "weekly" => now + Duration::weeks(1),
                "monthly" => now + Duration::days(30),
                _ => now + Duration::days(30),
            };

            let _ = sqlx::query!(
                r#"
                UPDATE wms.cycle_count_configs
                SET last_count_date = $2, next_count_date = $3, updated_at = $4
                WHERE id = $1
                "#,
                config.id,
                now,
                next_count_date,
                now
            )
            .execute(&state.db)
            .await;

            generated_count += 1;
            results.push(serde_json::json!({
                "config_id": config.id,
                "stock_take_id": stock_take_id,
                "stock_take_number": stock_take_number
            }));
        }
    }

    log_audit_event(
        &state.db,
        "generate_all".to_string(),
        "cycle_count".to_string(),
        None,
        None,
        None,
        None,
        None,
        None,
        "success".to_string(),
        None,
        &headers,
    )
    .await;

    Json(ApiResponse::success(
        serde_json::json!({
            "generated_count": generated_count,
            "results": results
        }),
        &format!("成功生成 {} 个循环盘点", generated_count),
    ))
}

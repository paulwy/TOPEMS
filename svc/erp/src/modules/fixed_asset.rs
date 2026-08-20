use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::*,
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::ApiState;
use crate::modules::audit::{log_audit_event, AuditEventParams};
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::ApiResponse;
use topems_shared_core::response::{api_error, PaginatedResponse};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct FixedAsset {
    pub id: Uuid,
    pub asset_code: String,
    pub asset_name: String,
    pub asset_type: String,
    pub asset_category: String,
    pub purchase_date: Option<DateTime<Utc>>,
    pub original_value: f64,
    pub accumulated_depreciation: f64,
    pub net_value: f64,
    pub depreciation_method: String,
    pub useful_life_months: i32,
    pub depreciation_period: String,
    pub department_id: Option<Uuid>,
    pub department_name: Option<String>,
    pub location: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateFixedAssetRequest {
    pub asset_code: String,
    pub asset_name: String,
    pub asset_type: String,
    pub asset_category: String,
    pub purchase_date: Option<DateTime<Utc>>,
    pub original_value: f64,
    pub depreciation_method: String,
    pub useful_life_months: i32,
    pub department_id: Option<Uuid>,
    pub department_name: Option<String>,
    pub location: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateFixedAssetRequest {
    pub asset_name: Option<String>,
    pub asset_type: Option<String>,
    pub asset_category: Option<String>,
    pub purchase_date: Option<DateTime<Utc>>,
    pub original_value: Option<f64>,
    pub accumulated_depreciation: Option<f64>,
    pub depreciation_method: Option<String>,
    pub useful_life_months: Option<i32>,
    pub department_id: Option<Uuid>,
    pub department_name: Option<String>,
    pub location: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct FixedAssetParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub asset_type: Option<String>,
    pub department_id: Option<String>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route(
            "/fixed-assets",
            get(list_fixed_assets).post(create_fixed_asset),
        )
        .route(
            "/fixed-assets/{id}",
            get(get_fixed_asset)
                .put(update_fixed_asset)
                .delete(delete_fixed_asset),
        )
        .route("/fixed-assets/depreciate", post(depreciate_assets))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:asset:read"])),
    path = "/erp/fixed-assets",
    tag = "Assets",
    responses((status = 200, description = "获取固定资产列表成功"))
)]
pub async fn list_fixed_assets(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<FixedAssetParams>,
) -> Json<ApiResponse<PaginatedResponse<FixedAsset>>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FixedAssetRead).await {
        return e;
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));

    let result = sqlx::query_as::<_, FixedAsset>(
        r#"
        SELECT id, asset_code, asset_name, asset_type, asset_category, purchase_date, 
               original_value, accumulated_depreciation, net_value, depreciation_method, 
               useful_life_months, depreciation_period, department_id, department_name, 
               location, status, created_at, updated_at
        FROM fixed_assets
        WHERE ($1::text IS NULL OR asset_code ILIKE $1 OR asset_name ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
          AND ($3::text IS NULL OR asset_type = $3)
          AND ($4::uuid IS NULL OR department_id = $4)
        ORDER BY asset_code ASC
        LIMIT $5 OFFSET $6
        "#,
    )
    .bind(&search_pattern)
    .bind(&params.status)
    .bind(&params.asset_type)
    .bind(
        params
            .department_id
            .as_ref()
            .and_then(|s| Uuid::parse_str(s).ok()),
    )
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(assets) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM fixed_assets
                WHERE deleted_at IS NULL AND ($1::text IS NULL OR asset_code ILIKE $1 OR asset_name ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND ($3::text IS NULL OR asset_type = $3)
                  AND ($4::uuid IS NULL OR department_id = $4)
                "#,
            )
            .bind(&search_pattern)
            .bind(&params.status)
            .bind(&params.asset_type)
            .bind(
                params
                    .department_id
                    .as_ref()
                    .and_then(|s| Uuid::parse_str(s).ok()),
            )
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                PaginatedResponse::new(assets, total, page, page_size),
                "获取固定资产列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取固定资产列表失败: {}", e);
            Json(api_error(500, "获取固定资产列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:asset:write"])),
    path = "/erp/fixed-assets",
    tag = "Assets",
    responses((status = 200, description = "固定资产创建成功"))
)]
pub async fn create_fixed_asset(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateFixedAssetRequest>,
) -> Json<ApiResponse<FixedAsset>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FixedAssetWrite).await {
        return e;
    }

    if req.asset_code.is_empty() {
        return Json(api_error(400, "资产编码不能为空"));
    }

    if req.asset_name.is_empty() {
        return Json(api_error(400, "资产名称不能为空"));
    }

    if req.original_value <= 0.0 {
        return Json(api_error(400, "原值必须大于0"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();
    let accumulated_depreciation = 0.0;
    let net_value = req.original_value;
    let depreciation_period = "".to_string();
    let status = "active".to_string();

    let result = sqlx::query_as::<_, FixedAsset>(
        r#"
        INSERT INTO fixed_assets (id, asset_code, asset_name, asset_type, asset_category, 
               purchase_date, original_value, accumulated_depreciation, net_value, 
               depreciation_method, useful_life_months, depreciation_period, 
               department_id, department_name, location, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING id, asset_code, asset_name, asset_type, asset_category, purchase_date, 
                  original_value, accumulated_depreciation, net_value, depreciation_method, 
                  useful_life_months, depreciation_period, department_id, department_name, 
                  location, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.asset_code)
    .bind(&req.asset_name)
    .bind(&req.asset_type)
    .bind(&req.asset_category)
    .bind(req.purchase_date)
    .bind(req.original_value)
    .bind(accumulated_depreciation)
    .bind(net_value)
    .bind(&req.depreciation_method)
    .bind(req.useful_life_months)
    .bind(&depreciation_period)
    .bind(req.department_id)
    .bind(&req.department_name)
    .bind(&req.location)
    .bind(&status)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(asset) => (
            Json(ApiResponse::success(asset.clone(), "固定资产创建成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("创建固定资产失败: {}", e);
            (
                Json(api_error(500, "固定资产创建失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(asset) = &result {
        serde_json::to_value(asset).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "create".to_string(),
            entity_type: "fixed_asset".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: Some(claims.sub.clone()),
            user_name: Some(claims.username.clone()),
            request_details: request_data,
            response_details: response_data,
            status: status_str,
            error_message: error_msg,
        },
        &headers,
    )
    .await;

    response
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:asset:read"])),
    path = "/erp/fixed-assets/{id}",
    tag = "Assets",
    params(("id" = Uuid, Path, description = "固定资产ID")),
    responses((status = 200, description = "获取固定资产成功"))
)]
pub async fn get_fixed_asset(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<FixedAsset>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FixedAssetRead).await {
        return e;
    }

    let result = sqlx::query_as::<_, FixedAsset>(
        r#"
        SELECT id, asset_code, asset_name, asset_type, asset_category, purchase_date, 
               original_value, accumulated_depreciation, net_value, depreciation_method, 
               useful_life_months, depreciation_period, department_id, department_name, 
               location, status, created_at, updated_at
        FROM fixed_assets WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(asset)) => Json(ApiResponse::success(asset, "获取固定资产成功")),
        Ok(None) => Json(api_error(404, "固定资产不存在")),
        Err(e) => {
            tracing::error!("获取固定资产失败: {}", e);
            Json(api_error(500, "获取固定资产失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["erp:asset:write"])),
    path = "/erp/fixed-assets/{id}",
    tag = "Assets",
    params(("id" = Uuid, Path, description = "固定资产ID")),
    responses((status = 200, description = "固定资产更新成功"))
)]
pub async fn update_fixed_asset(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateFixedAssetRequest>,
) -> Json<ApiResponse<FixedAsset>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FixedAssetWrite).await {
        return e;
    }

    let existing = sqlx::query_as::<_, FixedAsset>(
        "SELECT id, asset_code, asset_name, asset_type, asset_category, purchase_date, 
                original_value, accumulated_depreciation, net_value, depreciation_method, 
                useful_life_months, depreciation_period, department_id, department_name, 
                location, status, created_at, updated_at FROM fixed_assets WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(a)) => a,
        Ok(None) => return Json(api_error(404, "固定资产不存在")),
        Err(e) => return Json(api_error(500, &format!("查询固定资产失败: {}", e))),
    };

    let request_data = serde_json::to_value(&req).ok();

    let asset_name = req.asset_name.or(Some(existing.asset_name));
    let asset_type = req.asset_type.or(Some(existing.asset_type));
    let asset_category = req.asset_category.or(Some(existing.asset_category));
    let purchase_date = req.purchase_date.or(existing.purchase_date);
    let original_value = req.original_value.unwrap_or(existing.original_value);
    let accumulated_depreciation = req
        .accumulated_depreciation
        .unwrap_or(existing.accumulated_depreciation);
    let net_value = original_value - accumulated_depreciation;
    let depreciation_method = req
        .depreciation_method
        .or(Some(existing.depreciation_method));
    let useful_life_months = req
        .useful_life_months
        .unwrap_or(existing.useful_life_months);
    let department_id = req.department_id.or(existing.department_id);
    let department_name = req.department_name.or(existing.department_name);
    let location = req.location.or(existing.location);
    let status = req.status.unwrap_or(existing.status);
    let now = Utc::now();

    let result = sqlx::query_as::<_, FixedAsset>(
        r#"
        UPDATE fixed_assets SET
            asset_name = $2, asset_type = $3, asset_category = $4, purchase_date = $5,
            original_value = $6, accumulated_depreciation = $7, net_value = $8,
            depreciation_method = $9, useful_life_months = $10,
            department_id = $11, department_name = $12, location = $13, status = $14,
            updated_at = $15
        WHERE id = $1
        RETURNING id, asset_code, asset_name, asset_type, asset_category, purchase_date, 
                  original_value, accumulated_depreciation, net_value, depreciation_method, 
                  useful_life_months, depreciation_period, department_id, department_name, 
                  location, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&asset_name)
    .bind(&asset_type)
    .bind(&asset_category)
    .bind(purchase_date)
    .bind(original_value)
    .bind(accumulated_depreciation)
    .bind(net_value)
    .bind(&depreciation_method)
    .bind(useful_life_months)
    .bind(department_id)
    .bind(&department_name)
    .bind(&location)
    .bind(&status)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(asset) => (
            Json(ApiResponse::success(asset.clone(), "固定资产更新成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("更新固定资产失败: {}", e);
            (
                Json(api_error(500, "固定资产更新失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(asset) = &result {
        serde_json::to_value(asset).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "update".to_string(),
            entity_type: "fixed_asset".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: Some(claims.sub.clone()),
            user_name: Some(claims.username.clone()),
            request_details: request_data,
            response_details: response_data,
            status: status_str,
            error_message: error_msg,
        },
        &headers,
    )
    .await;

    response
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["erp:asset:write"])),
    path = "/erp/fixed-assets/{id}",
    tag = "Assets",
    params(("id" = Uuid, Path, description = "固定资产ID")),
    responses((status = 200, description = "固定资产删除成功"))
)]
pub async fn delete_fixed_asset(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FixedAssetWrite).await {
        return e;
    }

    let result = sqlx::query("UPDATE fixed_assets SET deleted_at = NOW() WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "固定资产删除成功")),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            Json(api_error(404, "固定资产不存在")),
            "error".to_string(),
            Some("固定资产不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除固定资产失败: {}", e);
            (
                Json(api_error(500, "固定资产删除失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(r) = &result {
        Some(serde_json::json!({ "rows_affected": r.rows_affected() }))
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "delete".to_string(),
            entity_type: "fixed_asset".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: Some(claims.sub.clone()),
            user_name: Some(claims.username.clone()),
            request_details: None,
            response_details: response_data,
            status: status_str,
            error_message: error_msg,
        },
        &headers,
    )
    .await;

    response
}

// ============ 折旧计算纯函数 ============

/// 单次月度折旧计算结果
#[derive(Debug, Clone, PartialEq)]
pub struct DepreciationCalculation {
    /// 本月应计提折旧额（直线法：原值 / 使用月数）
    pub monthly_depreciation: f64,
    /// 本次折旧后的累计折旧额（如足额则钳制为 = 原值）
    pub new_accumulated_depreciation: f64,
    /// 本次折旧后的净值（原值 - 累计折旧；足额时钳为 0）
    pub new_net_value: f64,
    /// 是否足额折旧完毕（累计折旧 ≥ 原值）
    pub is_fully_depreciated: bool,
}

/// 直线法月度折旧额计算
///
/// # 返回
/// - `Some(monthly)`：`original_value > 0` 且 `useful_life_months > 0` 时返回月度折旧额
/// - `None`：输入无效（值非正或使用寿命非正）
pub fn calculate_monthly_depreciation(original_value: f64, useful_life_months: i32) -> Option<f64> {
    if original_value <= 0.0 || useful_life_months <= 0 {
        return None;
    }
    Some(original_value / useful_life_months as f64)
}

/// 单次计提前一步纯计算
///
/// # 规则（直线法）
/// 1. 若 `useful_life_months <= 0` 或 `original_value <= 0`，返回 `None`
/// 2. 本月折旧 = `original_value / useful_life_months`
/// 3. 新累计折旧 = 原累计 + 本月折旧
/// 4. 若新累计 ≥ 原值：标记「已足额」，钳制累计=原值、净值=0
/// 5. 否则：新净值 = 原值 - 新累计
pub fn compute_depreciation_step(
    original_value: f64,
    accumulated_depreciation: f64,
    useful_life_months: i32,
) -> Option<DepreciationCalculation> {
    let monthly = calculate_monthly_depreciation(original_value, useful_life_months)?;
    let new_accumulated = accumulated_depreciation + monthly;

    let (final_accumulated, final_net, fully) = if new_accumulated >= original_value {
        // 足额折旧：钳制累计=原值、净值=0，不再继续计提
        (original_value, 0.0, true)
    } else {
        (new_accumulated, original_value - new_accumulated, false)
    };

    Some(DepreciationCalculation {
        monthly_depreciation: monthly,
        new_accumulated_depreciation: final_accumulated,
        new_net_value: final_net,
        is_fully_depreciated: fully,
    })
}

#[derive(Debug, Deserialize, Serialize)]
pub struct DepreciateRequest {
    pub period: String,
    pub asset_ids: Option<Vec<Uuid>>,
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:asset:admin"])),
    path = "/erp/fixed-assets/depreciate",
    tag = "Assets",
    responses((status = 200, description = "固定资产折旧完成"))
)]
pub async fn depreciate_assets(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<DepreciateRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) =
        check_permission(&state.db, &claims, &ModulePermission::FixedAssetDepreciate).await
    {
        return e;
    }

    let mut depreciated_count = 0;
    let mut errors = Vec::new();
    let now = Utc::now();

    let request_data = serde_json::to_value(&req).ok();

    let assets = match req.asset_ids {
        Some(ref ids) => {
            let placeholders = ids.iter().map(|_| "$1").collect::<Vec<_>>().join(",");
            sqlx::query_as::<_, FixedAsset>(&format!(
                "SELECT * FROM fixed_assets WHERE deleted_at IS NULL AND id IN ({}) AND status = 'active'",
                placeholders
            ))
            .bind(ids)
            .fetch_all(&state.db)
            .await
        }
        None => {
            sqlx::query_as::<_, FixedAsset>(
                "SELECT * FROM fixed_assets WHERE deleted_at IS NULL AND status = 'active'",
            )
            .fetch_all(&state.db)
            .await
        }
    };

    match assets {
        Ok(assets) => {
            for asset in assets {
                let calc = match compute_depreciation_step(
                    asset.original_value,
                    asset.accumulated_depreciation,
                    asset.useful_life_months,
                ) {
                    Some(c) => c,
                    None => {
                        errors.push(format!("资产{}使用寿命或原值无效", asset.asset_code));
                        continue;
                    }
                };

                let query_result = if calc.is_fully_depreciated {
                    // 足额折旧：累计=原值、净值=0，状态切换为 'depreciated'
                    sqlx::query(
                        "UPDATE fixed_assets SET accumulated_depreciation = $2, net_value = $3, status = 'depreciated', depreciation_period = $4, updated_at = $5 WHERE id = $1",
                    )
                    .bind(asset.id)
                    .bind(calc.new_accumulated_depreciation)
                    .bind(calc.new_net_value)
                    .bind(&req.period)
                    .bind(now)
                    .execute(&state.db)
                    .await
                } else {
                    // 正常计提：更新累计、净值、期间
                    sqlx::query(
                        "UPDATE fixed_assets SET accumulated_depreciation = $2, net_value = $3, depreciation_period = $4, updated_at = $5 WHERE id = $1",
                    )
                    .bind(asset.id)
                    .bind(calc.new_accumulated_depreciation)
                    .bind(calc.new_net_value)
                    .bind(&req.period)
                    .bind(now)
                    .execute(&state.db)
                    .await
                };

                match query_result {
                    Ok(_) => depreciated_count += 1,
                    Err(e) => errors.push(format!("资产{}折旧失败: {}", asset.asset_code, e)),
                }
            }
        }
        Err(e) => {
            return Json(api_error(500, &format!("查询资产失败: {}", e)));
        }
    }

    let result = serde_json::json!({
        "depreciated_count": depreciated_count,
        "errors": errors,
        "period": req.period,
    });

    let response_data = Some(result.clone());

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "depreciate".to_string(),
            entity_type: "fixed_asset".to_string(),
            entity_id: None,
            entity_ids: None,
            user_id: Some(claims.sub.clone()),
            user_name: Some(claims.username.clone()),
            request_details: request_data,
            response_details: response_data,
            status: if errors.is_empty() {
                "success".to_string()
            } else {
                "partial".to_string()
            },
            error_message: if !errors.is_empty() {
                Some(errors.join("; "))
            } else {
                None
            },
        },
        &headers,
    )
    .await;

    Json(ApiResponse::success(result, "固定资产折旧完成"))
}

// ============ 单元测试 ============

#[cfg(test)]
mod tests {
    use super::*;

    fn approx_eq(a: f64, b: f64, eps: f64) -> bool {
        (a - b).abs() < eps
    }

    // ===== calculate_monthly_depreciation 基础 =====

    #[test]
    fn test_monthly_basic_straight_line() {
        // 原值 12000，寿命 12 个月 → 每月 1000
        let m = calculate_monthly_depreciation(12000.0, 12).unwrap();
        assert!(approx_eq(m, 1000.0, 1e-9), "m={}", m);
    }

    #[test]
    fn test_monthly_float_value() {
        // 原值 100000，寿命 36 个月 → ≈ 2777.777...
        let m = calculate_monthly_depreciation(100000.0, 36).unwrap();
        assert!(approx_eq(m, 2777.777_777_777_777_7, 1e-6), "m={}", m);
    }

    #[test]
    fn test_monthly_invalid_original_value_zero() {
        assert_eq!(calculate_monthly_depreciation(0.0, 12), None);
    }

    #[test]
    fn test_monthly_invalid_original_value_negative() {
        assert_eq!(calculate_monthly_depreciation(-5000.0, 12), None);
    }

    #[test]
    fn test_monthly_invalid_life_zero() {
        assert_eq!(calculate_monthly_depreciation(1000.0, 0), None);
    }

    #[test]
    fn test_monthly_invalid_life_negative() {
        assert_eq!(calculate_monthly_depreciation(1000.0, -3), None);
    }

    #[test]
    fn test_monthly_one_month_life() {
        // 1 个月寿命：当月折旧 = 全额
        let m = calculate_monthly_depreciation(5000.0, 1).unwrap();
        assert!(approx_eq(m, 5000.0, 1e-9));
    }

    // ===== compute_depreciation_step 正常路径 =====

    #[test]
    fn test_step_first_month_normal() {
        // 原值 12000，寿命 12 个月，累计 0 → first month
        let calc = compute_depreciation_step(12000.0, 0.0, 12).unwrap();
        assert!(approx_eq(calc.monthly_depreciation, 1000.0, 1e-9));
        assert!(approx_eq(calc.new_accumulated_depreciation, 1000.0, 1e-9));
        assert!(approx_eq(calc.new_net_value, 11000.0, 1e-9));
        assert!(!calc.is_fully_depreciated);
    }

    #[test]
    fn test_step_mid_cycle_normal() {
        // 原值 12000，寿命 12，累计 5000 → 第 6 个月：累计 6000，净值 6000
        let calc = compute_depreciation_step(12000.0, 5000.0, 12).unwrap();
        assert!(approx_eq(calc.new_accumulated_depreciation, 6000.0, 1e-9));
        assert!(approx_eq(calc.new_net_value, 6000.0, 1e-9));
        assert!(!calc.is_fully_depreciated);
    }

    #[test]
    fn test_step_penultimate_month_before_full() {
        // 累计 11000（已提 11 个月）+ 本月 1000 → 累计 = 12000，足额
        let calc = compute_depreciation_step(12000.0, 11000.0, 12).unwrap();
        assert!(approx_eq(calc.new_accumulated_depreciation, 12000.0, 1e-9));
        assert!(approx_eq(calc.new_net_value, 0.0, 1e-9));
        assert!(calc.is_fully_depreciated);
    }

    #[test]
    fn test_step_clamps_on_exact_fully_depreciated() {
        // 累计刚好还差 monthly 就满额：足额分支
        // 原值 2400，寿命 24 → monthly = 100
        // 累计 = 2300，本次后 = 2400，足额
        let calc = compute_depreciation_step(2400.0, 2300.0, 24).unwrap();
        assert!(approx_eq(calc.new_accumulated_depreciation, 2400.0, 1e-9));
        assert!(approx_eq(calc.new_net_value, 0.0, 1e-9));
        assert!(calc.is_fully_depreciated);
    }

    #[test]
    fn test_step_overflow_beyond_original_is_clamped() {
        // 累计折旧 + 本月折旧 超过原值（浮点精度/边界），仍应钳制到原值
        // 原值 1000，寿命 3 → monthly ≈ 333.3333
        // 假设已累计 900（超过 2 个月 666.66，可能是之前的会计修正）
        // 新累计 = 900 + 333.333 = 1233.333，应钳制为 1000 / 净值 0
        let calc = compute_depreciation_step(1000.0, 900.0, 3).unwrap();
        assert!(calc.is_fully_depreciated);
        assert!(approx_eq(calc.new_accumulated_depreciation, 1000.0, 1e-9));
        assert!(approx_eq(calc.new_net_value, 0.0, 1e-9));
    }

    #[test]
    fn test_step_invalid_life_zero_returns_none() {
        assert_eq!(compute_depreciation_step(1000.0, 0.0, 0), None);
    }

    #[test]
    fn test_step_invalid_original_value_returns_none() {
        assert_eq!(compute_depreciation_step(-100.0, 0.0, 12), None);
    }

    #[test]
    fn test_step_one_month_life_immediately_full() {
        // 原值 5000，寿命 1 个月 → first month = 足额
        let calc = compute_depreciation_step(5000.0, 0.0, 1).unwrap();
        assert!(calc.is_fully_depreciated);
        assert!(approx_eq(calc.new_accumulated_depreciation, 5000.0, 1e-9));
        assert!(approx_eq(calc.new_net_value, 0.0, 1e-9));
    }

    #[test]
    fn test_step_already_fully_depreciated_still_reports_full() {
        // 累计已等于原值（资产已足额，但 handler 又被调用）
        // 此时 accumulated=12000，加 monthly 1000=13000>12000 → 足额分支
        let calc = compute_depreciation_step(12000.0, 12000.0, 12).unwrap();
        assert!(calc.is_fully_depreciated);
        assert!(approx_eq(calc.new_accumulated_depreciation, 12000.0, 1e-9));
        assert!(approx_eq(calc.new_net_value, 0.0, 1e-9));
    }

    #[test]
    fn test_step_cumulative_correctness_over_6_months() {
        // 模拟连续 6 个月计提，验证累计折旧与净值递减的单调性
        let original = 24000.0;
        let life = 24; // 每月 1000
        let mut acc = 0.0;
        for month in 1..=6 {
            let calc = compute_depreciation_step(original, acc, life).unwrap();
            assert!(!calc.is_fully_depreciated, "month {}", month);
            assert!(approx_eq(calc.monthly_depreciation, 1000.0, 1e-9));
            assert!(approx_eq(
                calc.new_accumulated_depreciation,
                1000.0 * month as f64,
                1e-9
            ));
            assert!(
                approx_eq(calc.new_net_value, original - 1000.0 * month as f64, 1e-9),
                "month {} net wrong: {}",
                month,
                calc.new_net_value
            );
            acc = calc.new_accumulated_depreciation;
        }
    }

    #[test]
    fn test_step_net_value_never_negative() {
        // 在足额边界附近反复测试，确保 new_net_value >= 0
        for i in (900..=1100).step_by(1) {
            let acc = i as f64;
            let calc = compute_depreciation_step(1000.0, acc, 10).unwrap();
            assert!(
                calc.new_net_value >= -1e-9,
                "net_value({} acc={}) = {} 不应为负",
                i,
                acc,
                calc.new_net_value
            );
        }
    }

    #[test]
    fn test_depreciation_calculation_struct_derive_debug_clone_partialeq() {
        let a = DepreciationCalculation {
            monthly_depreciation: 100.0,
            new_accumulated_depreciation: 200.0,
            new_net_value: 800.0,
            is_fully_depreciated: false,
        };
        let b = a.clone();
        assert_eq!(a, b);
        let _s = format!("{:?}", a);
    }
}

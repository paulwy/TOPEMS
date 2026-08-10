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

#[derive(Debug, Deserialize, Serialize)]
pub struct DepreciateRequest {
    pub period: String,
    pub asset_ids: Option<Vec<Uuid>>,
}

#[utoipa::path(
    post,
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
                if asset.useful_life_months <= 0 {
                    errors.push(format!("资产{}使用寿命无效", asset.asset_code));
                    continue;
                }

                let monthly_depreciation = asset.original_value / asset.useful_life_months as f64;
                let new_accumulated_depreciation =
                    asset.accumulated_depreciation + monthly_depreciation;
                let new_net_value = asset.original_value - new_accumulated_depreciation;

                if new_accumulated_depreciation >= asset.original_value {
                    let result = sqlx::query(
                        "UPDATE fixed_assets SET accumulated_depreciation = $2, net_value = $3, status = 'depreciated', depreciation_period = $4, updated_at = $5 WHERE id = $1",
                    )
                    .bind(asset.id)
                    .bind(asset.original_value)
                    .bind(0.0)
                    .bind(&req.period)
                    .bind(now)
                    .execute(&state.db)
                    .await;

                    match result {
                        Ok(_) => depreciated_count += 1,
                        Err(e) => errors.push(format!("资产{}折旧失败: {}", asset.asset_code, e)),
                    }
                } else {
                    let result = sqlx::query(
                        "UPDATE fixed_assets SET accumulated_depreciation = $2, net_value = $3, depreciation_period = $4, updated_at = $5 WHERE id = $1",
                    )
                    .bind(asset.id)
                    .bind(new_accumulated_depreciation)
                    .bind(new_net_value)
                    .bind(&req.period)
                    .bind(now)
                    .execute(&state.db)
                    .await;

                    match result {
                        Ok(_) => depreciated_count += 1,
                        Err(e) => errors.push(format!("资产{}折旧失败: {}", asset.asset_code, e)),
                    }
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

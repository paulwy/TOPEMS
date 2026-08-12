use axum::{extract::FromRef, http::HeaderMap, routing::get, Json, Router};
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::middleware::tenant::get_tenant_id;
use crate::modules::ApiState;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::{api_error, ApiResponse, PaginationParams};
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct MaterialPlan {
    pub id: Uuid,
    pub plan_no: String,
    pub plan_id: Option<Uuid>,
    pub material_id: Option<Uuid>,
    pub material_code: Option<String>,
    pub material_name: Option<String>,
    pub required_quantity: Option<sqlx::types::BigDecimal>,
    pub available_quantity: Option<sqlx::types::BigDecimal>,
    pub shortfall_quantity: Option<sqlx::types::BigDecimal>,
    pub required_date: Option<NaiveDate>,
    pub supply_type: String,
    pub status: String,
    pub tenant_id: Option<Uuid>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateMaterialPlanRequest {
    pub plan_no: String,
    pub plan_id: Option<Uuid>,
    pub material_id: Option<Uuid>,
    pub material_code: Option<String>,
    pub material_name: Option<String>,
    pub required_quantity: Option<f64>,
    pub available_quantity: Option<f64>,
    pub required_date: Option<NaiveDate>,
    pub supply_type: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateMaterialPlanRequest {
    pub material_code: Option<String>,
    pub material_name: Option<String>,
    pub required_quantity: Option<f64>,
    pub available_quantity: Option<f64>,
    pub required_date: Option<NaiveDate>,
    pub supply_type: Option<String>,
    pub status: Option<String>,
}

pub fn create_routes<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
    ApiState: FromRef<S>,
{
    Router::new()
        .route(
            "/material-plans",
            get(list_material_plans).post(create_material_plan),
        )
        .route(
            "/material-plans/{id}",
            get(get_material_plan)
                .put(update_material_plan)
                .delete(delete_material_plan),
        )
}

#[utoipa::path(
    get,
    path = "/api/aps/material-plans",
    responses(
        (status = 200, description = "list_material_plans OK")
    ),
    tag = "APS - Material Plan"
)]
pub async fn list_material_plans(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Query(params): axum::extract::Query<PaginationParams>,
    headers: HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, MaterialPlan>(
        r#"
        SELECT id, plan_no, plan_id, material_id, material_code, material_name,
               required_quantity, available_quantity, shortfall_quantity, required_date,
               supply_type, status, tenant_id, created_at, updated_at
        FROM plugin_aps.aps_material_plans
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR plan_no ILIKE $2 OR material_name ILIKE $2)
          AND ($3::text IS NULL OR status = $3)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(tenant_id)
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(plans) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM plugin_aps.aps_material_plans
                WHERE tenant_id = $1
                  AND ($2::text IS NULL OR plan_no ILIKE $2 OR material_name ILIKE $2)
                  AND ($3::text IS NULL OR status = $3)
                "#,
            )
            .bind(tenant_id)
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);
            let response_data = serde_json::json!({
                "material_plans": plans,
                "total": total,
                "page": page,
                "page_size": page_size
            });
            Json(ApiResponse::success(response_data, "获取物料计划列表成功"))
        }
        Err(e) => {
            tracing::error!("获取物料计划列表失败: {}", e);
            Json(api_error(500, "获取物料计划列表失败"))
        }
    }
}

#[utoipa::path(
    get,
    path = "/api/aps/material-plans/{id}",
    params(
        ("id" = Uuid, Path, description = "物料计划 ID")
    ),
    responses(
        (status = 200, description = "get_material_plan OK")
    ),
    tag = "APS - Material Plan"
)]
pub async fn get_material_plan(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<MaterialPlan>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, MaterialPlan>(
        r#"
        SELECT id, plan_no, plan_id, material_id, material_code, material_name,
               required_quantity, available_quantity, shortfall_quantity, required_date,
               supply_type, status, tenant_id, created_at, updated_at
        FROM plugin_aps.aps_material_plans
        WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(plan)) => Json(ApiResponse::success(plan, "获取物料计划成功")),
        Ok(None) => Json(api_error(404, "物料计划不存在")),
        Err(e) => {
            tracing::error!("获取物料计划失败: {}", e);
            Json(api_error(500, "获取物料计划失败"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/aps/material-plans",
    request_body = CreateMaterialPlanRequest,
    responses(
        (status = 200, description = "create_material_plan OK")
    ),
    tag = "APS - Material Plan"
)]
pub async fn create_material_plan(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Json(req): axum::extract::Json<CreateMaterialPlanRequest>,
) -> Json<ApiResponse<MaterialPlan>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let tenant_id = get_tenant_id(&claims, &headers);
    let supply_type = req.supply_type.unwrap_or_else(|| "purchase".to_string());
    let status = req.status.unwrap_or_else(|| "pending".to_string());
    let required_quantity: Option<sqlx::types::BigDecimal> = req
        .required_quantity
        .and_then(|v| sqlx::types::BigDecimal::try_from(v).ok());
    let available_quantity: Option<sqlx::types::BigDecimal> = req
        .available_quantity
        .and_then(|v| sqlx::types::BigDecimal::try_from(v).ok());

    let result = sqlx::query_as::<_, MaterialPlan>(
        r#"
        INSERT INTO plugin_aps.aps_material_plans
            (id, plan_no, plan_id, material_id, material_code, material_name,
             required_quantity, available_quantity, shortfall_quantity, required_date,
             supply_type, status, tenant_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8,
                CASE WHEN $7 IS NULL OR $8 IS NULL THEN 0 ELSE $7 - $8 END,
                $9, $10, $11, $12, $13, $14)
        RETURNING id, plan_no, plan_id, material_id, material_code, material_name,
                  required_quantity, available_quantity, shortfall_quantity, required_date,
                  supply_type, status, tenant_id, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.plan_no)
    .bind(req.plan_id)
    .bind(req.material_id)
    .bind(&req.material_code)
    .bind(&req.material_name)
    .bind(&required_quantity)
    .bind(&available_quantity)
    .bind(req.required_date)
    .bind(&supply_type)
    .bind(&status)
    .bind(tenant_id)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(plan) => Json(ApiResponse::success(plan, "物料计划创建成功")),
        Err(e) => {
            tracing::error!("创建物料计划失败: {}", e);
            Json(api_error(500, "创建物料计划失败"))
        }
    }
}

#[utoipa::path(
    put,
    path = "/api/aps/material-plans/{id}",
    request_body = UpdateMaterialPlanRequest,
    params(
        ("id" = Uuid, Path, description = "物料计划 ID")
    ),
    responses(
        (status = 200, description = "update_material_plan OK")
    ),
    tag = "APS - Material Plan"
)]
pub async fn update_material_plan(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    headers: HeaderMap,
    axum::extract::Json(req): axum::extract::Json<UpdateMaterialPlanRequest>,
) -> Json<ApiResponse<MaterialPlan>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let existing = sqlx::query_as::<_, MaterialPlan>(
        r#"
        SELECT id, plan_no, plan_id, material_id, material_code, material_name,
               required_quantity, available_quantity, shortfall_quantity, required_date,
               supply_type, status, tenant_id, created_at, updated_at
        FROM plugin_aps.aps_material_plans
        WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(p)) => p,
        Ok(None) => return Json(api_error(404, "物料计划不存在")),
        Err(e) => return Json(api_error(500, &format!("查询物料计划失败: {}", e))),
    };

    let material_code = req.material_code.or(existing.material_code);
    let material_name = req.material_name.or(existing.material_name);
    let required_date = req.required_date.or(existing.required_date);
    let supply_type = req.supply_type.unwrap_or(existing.supply_type);
    let status = req.status.unwrap_or(existing.status);
    let now = Utc::now();

    let required_quantity: Option<sqlx::types::BigDecimal> = match req.required_quantity {
        Some(v) => sqlx::types::BigDecimal::try_from(v).ok(),
        None => existing.required_quantity,
    };
    let available_quantity: Option<sqlx::types::BigDecimal> = match req.available_quantity {
        Some(v) => sqlx::types::BigDecimal::try_from(v).ok(),
        None => existing.available_quantity,
    };

    let result = sqlx::query_as::<_, MaterialPlan>(
        r#"
        UPDATE plugin_aps.aps_material_plans SET
            material_code = $2, material_name = $3, required_quantity = $4,
            available_quantity = $5, shortfall_quantity = CASE WHEN $4 IS NULL OR $5 IS NULL THEN 0 ELSE $4 - $5 END,
            required_date = $6, supply_type = $7, status = $8, updated_at = $9
        WHERE id = $1 AND tenant_id = $10
        RETURNING id, plan_no, plan_id, material_id, material_code, material_name,
                  required_quantity, available_quantity, shortfall_quantity, required_date,
                  supply_type, status, tenant_id, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&material_code)
    .bind(&material_name)
    .bind(&required_quantity)
    .bind(&available_quantity)
    .bind(required_date)
    .bind(&supply_type)
    .bind(&status)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(plan) => Json(ApiResponse::success(plan, "物料计划更新成功")),
        Err(e) => {
            tracing::error!("更新物料计划失败: {}", e);
            Json(api_error(500, "更新物料计划失败"))
        }
    }
}

#[utoipa::path(
    delete,
    path = "/api/aps/material-plans/{id}",
    params(
        ("id" = Uuid, Path, description = "物料计划 ID")
    ),
    responses(
        (status = 200, description = "delete_material_plan OK")
    ),
    tag = "APS - Material Plan"
)]
pub async fn delete_material_plan(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let result =
        sqlx::query("DELETE FROM plugin_aps.aps_material_plans WHERE id = $1 AND tenant_id = $2")
            .bind(id)
            .bind(tenant_id)
            .execute(&state.db)
            .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            Json(ApiResponse::success("".to_string(), "物料计划删除成功"))
        }
        Ok(_) => Json(api_error(404, "物料计划不存在")),
        Err(e) => {
            tracing::error!("删除物料计划失败: {}", e);
            Json(api_error(500, "删除物料计划失败"))
        }
    }
}

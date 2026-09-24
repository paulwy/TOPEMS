// MES · 材料计划管理模块
//
// 第一批-② 前后端对应性修复：前端 materialPlanApi（apps/web/src/api/aps/materialPlan.ts）
// 契约 8 方法（list/get/create/update/delete/submit/requisition/cancel），
// 经 /api/aps/material-plans（aps_compat 兜底重定向）→ /api/mes/material-plans。
// 表：mes.material_plans（迁移 20260908000003）
//
// 状态机（前端 types.ts MaterialPlanStatus 对齐）：
//   pending → requisitioned → sourced → satisfied / shortage，cancelled 为终态

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;
use sqlx::Row;
use topems_shared_core::response::ApiResponse;
use uuid::Uuid;

use crate::AppState;

pub fn create_routes() -> Router<AppState> {
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
        .route("/material-plans/{id}/submit", post(submit_material_plan))
        .route(
            "/material-plans/{id}/requisition",
            post(requisition_material_plan),
        )
        .route("/material-plans/{id}/cancel", post(cancel_material_plan))
}

#[derive(Debug, Deserialize)]
pub struct ListMaterialPlansQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub search: Option<String>,
    pub plan_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct CreateMaterialPlanRequest {
    pub plan_no: String,
    pub plan_id: Option<Uuid>,
    pub material_id: Option<Uuid>,
    pub material_code: Option<String>,
    pub material_name: Option<String>,
    pub required_quantity: Option<f64>,
    pub available_quantity: Option<f64>,
    pub required_date: Option<String>,
    pub supply_type: Option<String>,
    pub status: Option<String>,
    pub tenant_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateMaterialPlanRequest {
    pub plan_id: Option<Uuid>,
    pub material_id: Option<Uuid>,
    pub material_code: Option<String>,
    pub material_name: Option<String>,
    pub required_quantity: Option<f64>,
    pub available_quantity: Option<f64>,
    pub required_date: Option<String>,
    pub supply_type: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SubmitMaterialPlanRequest {
    pub comment: Option<String>,
}

fn internal_error(msg: &str) -> (StatusCode, Json<ApiResponse<serde_json::Value>>) {
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(ApiResponse::error(500, msg)),
    )
}

fn row_to_json(row: &sqlx::postgres::PgRow) -> serde_json::Value {
    serde_json::json!({
        "id": row.get::<Uuid, _>("id").to_string(),
        "plan_no": row.get::<String, _>("plan_no"),
        "plan_id": row.get::<Option<Uuid>, _>("plan_id").map(|v| v.to_string()),
        "material_id": row.get::<Option<Uuid>, _>("material_id").map(|v| v.to_string()),
        "material_code": row.get::<Option<String>, _>("material_code"),
        "material_name": row.get::<Option<String>, _>("material_name"),
        "required_quantity": row.get::<Option<f64>, _>("required_quantity"),
        "available_quantity": row.get::<Option<f64>, _>("available_quantity"),
        "shortfall_quantity": row.get::<Option<f64>, _>("shortfall_quantity"),
        "required_date": row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("required_date"),
        "supply_type": row.get::<String, _>("supply_type"),
        "status": row.get::<String, _>("status"),
        "tenant_id": row.get::<Option<String>, _>("tenant_id"),
        "created_at": row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("created_at"),
        "updated_at": row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("updated_at"),
    })
}

pub async fn list_material_plans(
    State(state): State<AppState>,
    Query(params): Query<ListMaterialPlansQuery>,
) -> Result<Json<ApiResponse<serde_json::Value>>, (StatusCode, Json<ApiResponse<serde_json::Value>>)>
{
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;

    let status = params.status.clone();
    let search = params.search.clone();
    let plan_id = params.plan_id;

    let total: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM mes.material_plans \
         WHERE ($1::text IS NULL OR status = $1) \
           AND ($2::text IS NULL OR plan_no ILIKE '%' || $2 || '%' \
             OR material_code ILIKE '%' || $2 || '%' \
             OR material_name ILIKE '%' || $2 || '%') \
           AND ($3::uuid IS NULL OR plan_id = $3)",
    )
    .bind(&status)
    .bind(&search)
    .bind(plan_id)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);

    let rows = sqlx::query(
        "SELECT id, plan_no, plan_id, material_id, material_code, material_name, \
                required_quantity, available_quantity, shortfall_quantity, required_date, \
                supply_type, status, tenant_id, created_at, updated_at \
         FROM mes.material_plans \
         WHERE ($1::text IS NULL OR status = $1) \
           AND ($2::text IS NULL OR plan_no ILIKE '%' || $2 || '%' \
             OR material_code ILIKE '%' || $2 || '%' \
             OR material_name ILIKE '%' || $2 || '%') \
           AND ($3::uuid IS NULL OR plan_id = $3) \
         ORDER BY created_at DESC LIMIT $4 OFFSET $5",
    )
    .bind(&status)
    .bind(&search)
    .bind(plan_id)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await;

    match rows {
        Ok(rows) => {
            let items: Vec<serde_json::Value> = rows.iter().map(row_to_json).collect();
            Ok(Json(ApiResponse::success(
                serde_json::json!({ "items": items, "total": total, "page": page, "page_size": page_size }),
                "获取材料计划列表成功",
            )))
        }
        Err(e) => {
            tracing::error!("查询材料计划失败: {}", e);
            Err(internal_error("查询材料计划失败"))
        }
    }
}

pub async fn get_material_plan(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<serde_json::Value>>, (StatusCode, Json<ApiResponse<serde_json::Value>>)>
{
    let row = sqlx::query(
        "SELECT id, plan_no, plan_id, material_id, material_code, material_name, \
                required_quantity, available_quantity, shortfall_quantity, required_date, \
                supply_type, status, tenant_id, created_at, updated_at \
         FROM mes.material_plans WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await;

    match row {
        Ok(Some(row)) => Ok(Json(ApiResponse::success(
            row_to_json(&row),
            "获取材料计划成功",
        ))),
        Ok(None) => Err((
            StatusCode::NOT_FOUND,
            Json(ApiResponse::error(404, "材料计划不存在")),
        )),
        Err(e) => {
            tracing::error!("查询材料计划失败: {}", e);
            Err(internal_error("查询材料计划失败"))
        }
    }
}

pub async fn create_material_plan(
    State(state): State<AppState>,
    Json(req): Json<CreateMaterialPlanRequest>,
) -> Result<Json<ApiResponse<serde_json::Value>>, (StatusCode, Json<ApiResponse<serde_json::Value>>)>
{
    let required_qty = req.required_quantity.unwrap_or(0.0);
    let available_qty = req.available_quantity.unwrap_or(0.0);
    let shortfall = (required_qty - available_qty).max(0.0);
    let supply_type = req.supply_type.unwrap_or_else(|| "purchase".to_string());
    let status = req.status.unwrap_or_else(|| "pending".to_string());
    let required_date = parse_datetime(&req.required_date);

    let row = sqlx::query(
        "INSERT INTO mes.material_plans \
         (plan_no, plan_id, material_id, material_code, material_name, required_quantity, \
          available_quantity, shortfall_quantity, required_date, supply_type, status, tenant_id) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) \
         RETURNING id, plan_no, plan_id, material_id, material_code, material_name, \
                   required_quantity, available_quantity, shortfall_quantity, required_date, \
                   supply_type, status, tenant_id, created_at, updated_at",
    )
    .bind(&req.plan_no)
    .bind(req.plan_id)
    .bind(req.material_id)
    .bind(&req.material_code)
    .bind(&req.material_name)
    .bind(required_qty)
    .bind(available_qty)
    .bind(shortfall)
    .bind(required_date)
    .bind(&supply_type)
    .bind(&status)
    .bind(&req.tenant_id)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(row) => Ok(Json(ApiResponse::success(
            row_to_json(&row),
            "创建材料计划成功",
        ))),
        Err(e) => {
            tracing::error!("创建材料计划失败: {}", e);
            Err(internal_error("创建材料计划失败"))
        }
    }
}

pub async fn update_material_plan(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateMaterialPlanRequest>,
) -> Result<Json<ApiResponse<serde_json::Value>>, (StatusCode, Json<ApiResponse<serde_json::Value>>)>
{
    let required_date = parse_datetime(&req.required_date);

    let row = sqlx::query(
        "UPDATE mes.material_plans SET \
         plan_id = COALESCE($2, plan_id), \
         material_id = COALESCE($3, material_id), \
         material_code = COALESCE($4, material_code), \
         material_name = COALESCE($5, material_name), \
         required_quantity = COALESCE($6, required_quantity), \
         available_quantity = COALESCE($7, available_quantity), \
         shortfall_quantity = GREATEST(COALESCE($6, required_quantity) - COALESCE($7, available_quantity), 0), \
         required_date = COALESCE($8, required_date), \
         supply_type = COALESCE($9, supply_type), \
         status = COALESCE($10, status), \
         updated_at = NOW() \
         WHERE id = $1 \
         RETURNING id, plan_no, plan_id, material_id, material_code, material_name, \
                   required_quantity, available_quantity, shortfall_quantity, required_date, \
                   supply_type, status, tenant_id, created_at, updated_at",
    )
    .bind(id)
    .bind(req.plan_id)
    .bind(req.material_id)
    .bind(&req.material_code)
    .bind(&req.material_name)
    .bind(req.required_quantity)
    .bind(req.available_quantity)
    .bind(required_date)
    .bind(&req.supply_type)
    .bind(&req.status)
    .fetch_optional(&state.pool)
    .await;

    match row {
        Ok(Some(row)) => Ok(Json(ApiResponse::success(
            row_to_json(&row),
            "更新材料计划成功",
        ))),
        Ok(None) => Err((
            StatusCode::NOT_FOUND,
            Json(ApiResponse::error(404, "材料计划不存在")),
        )),
        Err(e) => {
            tracing::error!("更新材料计划失败: {}", e);
            Err(internal_error("更新材料计划失败"))
        }
    }
}

pub async fn delete_material_plan(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<serde_json::Value>>, (StatusCode, Json<ApiResponse<serde_json::Value>>)>
{
    let result = sqlx::query("DELETE FROM mes.material_plans WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(res) => {
            if res.rows_affected() == 0 {
                return Err((
                    StatusCode::NOT_FOUND,
                    Json(ApiResponse::error(404, "材料计划不存在")),
                ));
            }
            Ok(Json(ApiResponse::success(
                serde_json::json!({ "deleted": true, "id": id.to_string() }),
                "删除材料计划成功",
            )))
        }
        Err(e) => {
            tracing::error!("删除材料计划失败: {}", e);
            Err(internal_error("删除材料计划失败"))
        }
    }
}

async fn transition_status(
    state: &AppState,
    id: Uuid,
    new_status: &str,
) -> Result<Option<sqlx::postgres::PgRow>, sqlx::Error> {
    sqlx::query(
        "UPDATE mes.material_plans SET status = $2, updated_at = NOW() \
         WHERE id = $1 \
         RETURNING id, plan_no, plan_id, material_id, material_code, material_name, \
                   required_quantity, available_quantity, shortfall_quantity, required_date, \
                   supply_type, status, tenant_id, created_at, updated_at",
    )
    .bind(id)
    .bind(new_status)
    .fetch_optional(&state.pool)
    .await
}

pub async fn submit_material_plan(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<serde_json::Value>>, (StatusCode, Json<ApiResponse<serde_json::Value>>)>
{
    let row = transition_status(&state, id, "requisitioned").await;
    match row {
        Ok(Some(row)) => Ok(Json(ApiResponse::success(
            row_to_json(&row),
            "材料计划已提交",
        ))),
        Ok(None) => Err((
            StatusCode::NOT_FOUND,
            Json(ApiResponse::error(404, "材料计划不存在")),
        )),
        Err(e) => {
            tracing::error!("提交材料计划失败: {}", e);
            Err(internal_error("提交材料计划失败"))
        }
    }
}

pub async fn requisition_material_plan(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<serde_json::Value>>, (StatusCode, Json<ApiResponse<serde_json::Value>>)>
{
    let row = transition_status(&state, id, "sourced").await;
    match row {
        Ok(Some(row)) => Ok(Json(ApiResponse::success(
            row_to_json(&row),
            "材料计划已请购",
        ))),
        Ok(None) => Err((
            StatusCode::NOT_FOUND,
            Json(ApiResponse::error(404, "材料计划不存在")),
        )),
        Err(e) => {
            tracing::error!("请购材料计划失败: {}", e);
            Err(internal_error("请购材料计划失败"))
        }
    }
}

pub async fn cancel_material_plan(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<serde_json::Value>>, (StatusCode, Json<ApiResponse<serde_json::Value>>)>
{
    let row = transition_status(&state, id, "cancelled").await;
    match row {
        Ok(Some(row)) => Ok(Json(ApiResponse::success(
            row_to_json(&row),
            "材料计划已取消",
        ))),
        Ok(None) => Err((
            StatusCode::NOT_FOUND,
            Json(ApiResponse::error(404, "材料计划不存在")),
        )),
        Err(e) => {
            tracing::error!("取消材料计划失败: {}", e);
            Err(internal_error("取消材料计划失败"))
        }
    }
}

/// 解析 ISO8601 字符串为 TIMESTAMPTZ 绑定值
fn parse_datetime(s: &Option<String>) -> Option<chrono::DateTime<chrono::Utc>> {
    s.as_deref().and_then(|v| {
        chrono::DateTime::parse_from_rfc3339(v)
            .ok()
            .map(|d| d.with_timezone(&chrono::Utc))
    })
}

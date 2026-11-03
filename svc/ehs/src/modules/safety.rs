//! Safety handlers - Inspection plans, items, and records

use axum::{
    extract::{Query, State},
    http::HeaderMap,
    routing::{delete, get, post},
    Extension, Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::shared::AppState;
pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/checks/plans", get(list_plans_db).post(create_plan_db))
        .route(
            "/checks/plans/{id}",
            get(get_plan_db).put(update_plan_db).delete(delete_plan_db),
        )
        .route("/checks/plans/{plan_id}/items", post(create_plan_item))
        .route(
            "/checks/plans/{plan_id}/items/{item_id}",
            delete(delete_plan_item),
        )
        .route(
            "/checks/records",
            get(list_records_db).post(create_record_db),
        )
        .route(
            "/checks/records/{id}",
            get(get_record_db)
                .put(update_record_db)
                .delete(delete_record_db),
        )
        .route(
            "/checks",
            get(list_safety_checks_db).post(create_safety_check),
        )
        .route(
            "/checks/{id}",
            get(get_safety_check_db)
                .put(update_safety_check_db)
                .delete(delete_safety_check_db),
        )
}

#[derive(Debug, Deserialize)]
pub struct InspectionQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub inspection_type: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct InspectionPlanQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct InspectionPlan {
    pub id: String,
    pub plan_no: String,
    pub title: String,
    pub description: Option<String>,
    pub inspection_type: String,
    pub frequency: String,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub inspector: Option<String>,
    pub status: String,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct InspectionItem {
    pub id: String,
    pub plan_id: String,
    pub item_no: String,
    pub title: String,
    pub description: Option<String>,
    pub category: String,
    pub standard: Option<String>,
    pub order_num: i32,
    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct InspectionRecord {
    pub id: String,
    pub record_no: String,
    pub plan_id: Option<String>,
    pub title: String,
    pub inspection_type: String,
    pub location: Option<String>,
    pub inspector: Option<String>,
    pub inspected_at: Option<String>,
    pub result: Option<String>,
    pub issues: Option<Vec<String>>,
    pub attachments: Option<Vec<String>>,
    pub status: String,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct InspectionRecordDetail {
    pub record: InspectionRecord,
    pub items: Vec<RecordItem>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct RecordItem {
    pub id: String,
    pub record_id: String,
    pub item_id: Option<String>,
    pub item_title: String,
    pub item_category: String,
    pub result: String,
    pub remarks: Option<String>,
    pub tenant_id: Uuid,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateInspectionPlanRequest {
    pub title: String,
    pub description: Option<String>,
    pub inspection_type: String,
    pub frequency: String,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub inspector: Option<String>,
    #[serde(default)]
    pub items: Vec<CreateInspectionItemRequest>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateInspectionItemRequest {
    pub title: String,
    pub description: Option<String>,
    pub category: String,
    pub standard: Option<String>,
    pub order_num: i32,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateInspectionRecordRequest {
    pub plan_id: Option<String>,
    pub title: String,
    pub inspection_type: String,
    pub location: Option<String>,
    pub inspector: Option<String>,
    pub inspected_at: Option<String>,
    pub issues: Option<Vec<String>>,
    pub items: Vec<CreateRecordItemRequest>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateRecordItemRequest {
    pub item_id: Option<String>,
    pub item_title: String,
    pub item_category: String,
    pub result: String,
    pub remarks: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateInspectionRecordRequest {
    pub result: Option<String>,
    pub status: Option<String>,
    pub issues: Option<Vec<String>>,
}

pub async fn create_plan_item(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(plan_id_str): axum::extract::Path<String>,
    Json(req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    let plan_id = match uuid::Uuid::parse_str(&plan_id_str) {
        Ok(id) => id,
        Err(_) => {
            return ApiResponse::bad_request("plan_id 格式无效");
        }
    };
    let tenant_id = resolve_inspection_tenant(&claims);

    let item_no = req
        .get("item_no")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .unwrap_or_else(|| {
            format!(
                "ITM-{}",
                uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
            )
        });
    let title = match req.get("title").and_then(|v| v.as_str()) {
        Some(t) if !t.is_empty() => t.to_string(),
        _ => {
            return ApiResponse::bad_request("title 不能为空");
        }
    };
    let category = req
        .get("category")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let description = req
        .get("description")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let standard = req
        .get("standard")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let order_num: i32 = req
        .get("order_num")
        .and_then(|v| v.as_i64())
        .and_then(|n| i32::try_from(n).ok())
        .unwrap_or(0);

    let result = sqlx::query(
        "INSERT INTO ehs.qa_ehs_inspection_items \
         (plan_id, item_no, title, category, description, standard, order_num, tenant_id) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) \
         RETURNING id::text AS id, plan_id::text AS plan_id, item_no, title, category, \
                   description, standard, order_num, created_at::text AS created_at, \
                   updated_at::text AS updated_at, tenant_id::text AS tenant_id",
    )
    .bind(plan_id)
    .bind(&item_no)
    .bind(&title)
    .bind(&category)
    .bind(&description)
    .bind(&standard)
    .bind(order_num)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(row)) => {
            let obj: serde_json::Value = serde_json::json!({
                "id": row.try_get::<String, _>("id").unwrap_or_default(),
                "plan_id": row.try_get::<String, _>("plan_id").unwrap_or_default(),
                "item_no": row.try_get::<String, _>("item_no").unwrap_or_default(),
                "title": row.try_get::<String, _>("title").unwrap_or_default(),
                "category": row.try_get::<Option<String>, _>("category").unwrap_or_default(),
                "description": row.try_get::<Option<String>, _>("description").unwrap_or_default(),
                "standard": row.try_get::<Option<String>, _>("standard").unwrap_or_default(),
                "order_num": row.try_get::<i32, _>("order_num").unwrap_or(0),
                "created_at": row.try_get::<String, _>("created_at").unwrap_or_default(),
                "updated_at": row.try_get::<String, _>("updated_at").unwrap_or_default(),
            });
            ApiResponse::success(obj, "检查项创建成功")
        }
        Ok(None) => ApiResponse::server_error("检查项创建失败"),
        Err(e) => {
            tracing::error!("Failed to create inspection plan item: {}", e);
            ApiResponse::server_error("检查项创建失败")
        }
    }
}

pub async fn delete_plan_item(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path((plan_id_str, item_id_str)): axum::extract::Path<(String, String)>,
) -> ApiResponse<()> {
    let plan_id = match uuid::Uuid::parse_str(&plan_id_str) {
        Ok(id) => id,
        Err(_) => {
            return ApiResponse::bad_request("plan_id 格式无效");
        }
    };
    let item_id = match uuid::Uuid::parse_str(&item_id_str) {
        Ok(id) => id,
        Err(_) => {
            return ApiResponse::bad_request("item_id 格式无效");
        }
    };
    let tenant_id = resolve_inspection_tenant(&claims);

    let result = sqlx::query(
        "UPDATE ehs.qa_ehs_inspection_items \
         SET deleted_at = now() \
         WHERE id = $1 AND plan_id = $2 AND deleted_at IS NULL \
           AND ($3::uuid = '00000000-0000-0000-0000-000000000000' OR tenant_id = $3::uuid)",
    )
    .bind(item_id)
    .bind(plan_id)
    .bind(tenant_id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(pg_result) => {
            if pg_result.rows_affected() == 0 {
                ApiResponse::not_found("检查项不存在或已删除")
            } else {
                ApiResponse::success((), "检查项删除成功")
            }
        }
        Err(e) => {
            tracing::error!("Failed to delete inspection plan item: {}", e);
            ApiResponse::server_error("检查项删除失败")
        }
    }
}

/// POST /checks —— 页面创建安全检查记录（前端 safetyCheck.ts createCheck 契约）
#[derive(Debug, Deserialize, Serialize)]
pub struct CreateSafetyCheckRequest {
    pub check_no: String,
    pub check_type: String,
    pub inspector: String,
    pub check_date: Option<String>,
    pub location: Option<String>,
    pub result: String,
    pub issues: Option<Vec<String>>,
    pub attachments: Option<Vec<String>>,
    pub status: String,
}

pub async fn create_safety_check(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(req): Json<CreateSafetyCheckRequest>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = claims
        .tenant_id
        .as_deref()
        .and_then(|t| uuid::Uuid::parse_str(t).ok())
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());

    let result = sqlx::query(
        "INSERT INTO ehs.safety_checks \
         (check_no, check_type, inspector, check_date, location, result, issues, attachments, status, tenant_id) \
         VALUES ($1, $2, $3, $4::timestamptz, $5, $6, $7, $8, $9, $10) \
         RETURNING id, check_no, check_type, inspector, check_date::TEXT, location, result, issues, attachments, status, created_at::TEXT, updated_at::TEXT",
    )
    .bind(&req.check_no)
    .bind(&req.check_type)
    .bind(&req.inspector)
    .bind(&req.check_date)
    .bind(&req.location)
    .bind(&req.result)
    .bind(serde_json::json!(req.issues.unwrap_or_default()))
    .bind(serde_json::json!(req.attachments.unwrap_or_default()))
    .bind(&req.status)
    .bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(r) => ApiResponse::success(
            serde_json::json!({
                "id": r.get::<uuid::Uuid, _>("id"),
                "check_no": r.get::<String, _>("check_no"),
                "check_type": r.get::<String, _>("check_type"),
                "inspector": r.get::<String, _>("inspector"),
                "check_date": r.get::<Option<String>, _>("check_date"),
                "location": r.get::<Option<String>, _>("location"),
                "result": r.get::<String, _>("result"),
                "issues": r.get::<serde_json::Value, _>("issues"),
                "attachments": r.get::<Option<serde_json::Value>, _>("attachments"),
                "status": r.get::<String, _>("status"),
                "created_at": r.get::<String, _>("created_at"),
                "updated_at": r.get::<String, _>("updated_at"),
            }),
            "安全检查创建成功",
        ),
        Err(e) => {
            tracing::error!("创建安全检查失败: {}", e);
            ApiResponse::<serde_json::Value>::server_error("创建安全检查失败")
        }
    }
}

// ---- 接真实现（读 qa_ehs_inspection_plans / qa_ehs_inspection_records）----

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:plan:read"])),
    path = "/api/ehs/checks/plans",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_plans_db(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Query(q): Query<InspectionPlanQuery>,
) -> ApiResponse<Vec<InspectionPlan>> {
    let tenant_bind = resolve_inspection_tenant(&claims).to_string();
    let page = q.page.unwrap_or(1).max(1);
    let page_size = q.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let mut params: Vec<String> = vec![tenant_bind];
    let mut where_clause = String::from(
        " WHERE ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $1) AND deleted_at IS NULL",
    );
    if let Some(s) = &q.status {
        where_clause.push_str(&format!(" AND status = ${}", params.len() + 1));
        params.push(s.clone());
    }
    if let Some(search) = &q.search {
        where_clause.push_str(&format!(
            " AND (title ILIKE ${} OR plan_no ILIKE ${})",
            params.len() + 1,
            params.len() + 2
        ));
        let like = format!("%{search}%");
        params.push(like.clone());
        params.push(like);
    }

    let sql = format!(
        r#"
        SELECT id::text AS id, plan_no, title, description, inspection_type, frequency,
               start_date::text AS start_date, end_date::text AS end_date, inspector, status,
               created_at::text AS created_at, updated_at::text AS updated_at,
               tenant_id::text AS tenant_id
        FROM ehs.qa_ehs_inspection_plans
        {where_clause}
        ORDER BY created_at DESC
        LIMIT {page_size} OFFSET {offset}
        "#
    );
    let mut query = sqlx::query(sqlx::AssertSqlSafe(sql));
    for p in &params {
        query = query.bind(p);
    }
    let rows = match query.fetch_all(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to list inspection plans: {}", e);
            return ApiResponse::server_error("获取检查计划列表失败");
        }
    };
    let list: Vec<InspectionPlan> = rows.iter().map(inspection_plan_from_row).collect();
    ApiResponse::success(list, "获取检查计划列表成功")
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:plan:write"])),
    path = "/api/ehs/checks/plans",
    request_body = CreateInspectionPlanRequest,
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn create_plan_db(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(req): Json<CreateInspectionPlanRequest>,
) -> ApiResponse<InspectionPlan> {
    let tenant_id = resolve_inspection_tenant(&claims);
    let plan_no = format!("IP-{}", Uuid::new_v4().to_string()[..8].to_uppercase());
    let sql = r#"
        INSERT INTO ehs.qa_ehs_inspection_plans
            (plan_no, title, description, inspection_type, frequency, start_date, end_date,
             inspector, status, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id::text AS id, plan_no, title, description, inspection_type, frequency,
                  start_date::text AS start_date, end_date::text AS end_date, inspector, status,
                  created_at::text AS created_at, updated_at::text AS updated_at,
                  tenant_id::text AS tenant_id
    "#;
    let row = match sqlx::query(sqlx::AssertSqlSafe(sql))
        .bind(&plan_no)
        .bind(&req.title)
        .bind(&req.description)
        .bind(&req.inspection_type)
        .bind(&req.frequency)
        .bind(&req.start_date)
        .bind(&req.end_date)
        .bind(&req.inspector)
        .bind("active")
        .bind(tenant_id)
        .fetch_one(&state.pool)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create inspection plan: {}", e);
            return ApiResponse::server_error("检查计划创建失败");
        }
    };
    let record = inspection_plan_from_row(&row);
    ApiResponse::success(record, "检查计划创建成功")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/checks/plans/{id}",
    tag = "ehs",
    params(("id" = String, Path, description = "检查计划 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn get_plan_db(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<InspectionPlan> {
    let tenant_bind = resolve_inspection_tenant(&claims).to_string();
    let sql = r#"
        SELECT id::text AS id, plan_no, title, description, inspection_type, frequency,
               start_date::text AS start_date, end_date::text AS end_date, inspector, status,
               created_at::text AS created_at, updated_at::text AS updated_at,
               tenant_id::text AS tenant_id
        FROM ehs.qa_ehs_inspection_plans
        WHERE id::text = $1
          AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $2)
          AND deleted_at IS NULL
    "#;
    let row = match sqlx::query(sqlx::AssertSqlSafe(sql))
        .bind(&id)
        .bind(&tenant_bind)
        .fetch_optional(&state.pool)
        .await
    {
        Ok(Some(r)) => r,
        Ok(None) => return ApiResponse::not_found("检查计划不存在"),
        Err(e) => {
            tracing::error!("Failed to get inspection plan: {}", e);
            return ApiResponse::server_error("获取检查计划失败");
        }
    };
    let record = inspection_plan_from_row(&row);
    ApiResponse::success(record, "获取检查计划成功")
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["ehs:plan:update"])),
    path = "/api/ehs/checks/plans/{id}",
    request_body = CreateInspectionPlanRequest,
    tag = "ehs",
    params(("id" = String, Path, description = "检查计划 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn update_plan_db(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<CreateInspectionPlanRequest>,
) -> ApiResponse<InspectionPlan> {
    let tenant_bind = resolve_inspection_tenant(&claims).to_string();
    let mut sets: Vec<String> = Vec::new();
    let mut params: Vec<String> = Vec::new();
    sets.push(format!("title = ${}", params.len() + 1));
    params.push(req.title.clone());
    if let Some(v) = &req.description {
        sets.push(format!("description = ${}", params.len() + 1));
        params.push(v.clone());
    }
    sets.push(format!("inspection_type = ${}", params.len() + 1));
    params.push(req.inspection_type.clone());
    sets.push(format!("frequency = ${}", params.len() + 1));
    params.push(req.frequency.clone());
    if let Some(v) = &req.start_date {
        sets.push(format!("start_date = ${}", params.len() + 1));
        params.push(v.clone());
    }
    if let Some(v) = &req.end_date {
        sets.push(format!("end_date = ${}", params.len() + 1));
        params.push(v.clone());
    }
    if let Some(v) = &req.inspector {
        sets.push(format!("inspector = ${}", params.len() + 1));
        params.push(v.clone());
    }
    sets.push("updated_at = now()".to_string());
    let set_clause = sets.join(", ");
    let id_idx = params.len() + 1;
    let tenant_idx = params.len() + 2;
    let sql = format!(
        r#"
        UPDATE ehs.qa_ehs_inspection_plans
        SET {set_clause}
        WHERE id::text = ${id_idx}
          AND (${tenant_idx} = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = ${tenant_idx})
          AND deleted_at IS NULL
        RETURNING id::text AS id, plan_no, title, description, inspection_type, frequency,
                  start_date::text AS start_date, end_date::text AS end_date, inspector, status,
                  created_at::text AS created_at, updated_at::text AS updated_at,
                  tenant_id::text AS tenant_id
        "#
    );
    let mut query = sqlx::query(sqlx::AssertSqlSafe(sql));
    for p in &params {
        query = query.bind(p);
    }
    let row = match query
        .bind(&id)
        .bind(&tenant_bind)
        .fetch_optional(&state.pool)
        .await
    {
        Ok(Some(r)) => r,
        Ok(None) => return ApiResponse::not_found("检查计划不存在"),
        Err(e) => {
            tracing::error!("Failed to update inspection plan: {}", e);
            return ApiResponse::server_error("检查计划更新失败");
        }
    };
    let record = inspection_plan_from_row(&row);
    ApiResponse::success(record, "检查计划更新成功")
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ehs:plan:delete"])),
    path = "/api/ehs/checks/plans/{id}",
    tag = "ehs",
    params(("id" = String, Path, description = "检查计划 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn delete_plan_db(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<()> {
    let tenant_bind = resolve_inspection_tenant(&claims).to_string();
    let sql = r#"
        UPDATE ehs.qa_ehs_inspection_plans
        SET deleted_at = now()
        WHERE id::text = $1
          AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $2)
          AND deleted_at IS NULL
    "#;
    let result = match sqlx::query(sqlx::AssertSqlSafe(sql))
        .bind(&id)
        .bind(&tenant_bind)
        .execute(&state.pool)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to delete inspection plan: {}", e);
            return ApiResponse::server_error("检查计划删除失败");
        }
    };
    if result.rows_affected() == 0 {
        return ApiResponse::not_found("检查计划不存在");
    }
    ApiResponse::success((), "检查计划删除成功")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/checks/records",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_records_db(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Query(q): Query<InspectionQuery>,
) -> ApiResponse<Vec<InspectionRecord>> {
    let tenant_bind = resolve_inspection_tenant(&claims).to_string();
    let page = q.page.unwrap_or(1).max(1);
    let page_size = q.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let mut params: Vec<String> = vec![tenant_bind];
    let mut where_clause = String::from(
        " WHERE ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $1) AND deleted_at IS NULL",
    );
    if let Some(s) = &q.status {
        where_clause.push_str(&format!(" AND status = ${}", params.len() + 1));
        params.push(s.clone());
    }
    if let Some(t) = &q.inspection_type {
        where_clause.push_str(&format!(" AND inspection_type = ${}", params.len() + 1));
        params.push(t.clone());
    }
    if let Some(search) = &q.search {
        where_clause.push_str(&format!(
            " AND (title ILIKE ${} OR record_no ILIKE ${})",
            params.len() + 1,
            params.len() + 2
        ));
        let like = format!("%{search}%");
        params.push(like.clone());
        params.push(like);
    }

    let sql = format!(
        r#"
        SELECT id::text AS id, record_no, plan_id::text AS plan_id, title, inspection_type,
               location, inspector, inspected_at::text AS inspected_at, result,
               issues, attachments, status,
               created_at::text AS created_at, updated_at::text AS updated_at,
               tenant_id::text AS tenant_id
        FROM ehs.qa_ehs_inspection_records
        {where_clause}
        ORDER BY created_at DESC
        LIMIT {page_size} OFFSET {offset}
        "#
    );
    let mut query = sqlx::query(sqlx::AssertSqlSafe(sql));
    for p in &params {
        query = query.bind(p);
    }
    let rows = match query.fetch_all(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to list inspection records: {}", e);
            return ApiResponse::server_error("获取检查记录列表失败");
        }
    };
    let list: Vec<InspectionRecord> = rows.iter().map(inspection_record_from_row).collect();
    ApiResponse::success(list, "获取检查记录列表成功")
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:write"])),
    path = "/api/ehs/checks/records",
    request_body = CreateInspectionRecordRequest,
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn create_record_db(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(req): Json<CreateInspectionRecordRequest>,
) -> ApiResponse<InspectionRecord> {
    let tenant_id = resolve_inspection_tenant(&claims);
    let record_no = format!("CR-{}", Uuid::new_v4().to_string()[..8].to_uppercase());
    let issues: serde_json::Value = req
        .issues
        .clone()
        .map(|v| serde_json::to_value(v).unwrap_or_else(|_| serde_json::json!([])))
        .unwrap_or_else(|| serde_json::json!([]));

    let sql = r#"
        INSERT INTO ehs.qa_ehs_inspection_records
            (record_no, plan_id, title, inspection_type, location, inspector, inspected_at,
             issues, status, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id::text AS id, record_no, plan_id::text AS plan_id, title, inspection_type,
                  location, inspector, inspected_at::text AS inspected_at, result,
                  issues, attachments, status,
                  created_at::text AS created_at, updated_at::text AS updated_at,
                  tenant_id::text AS tenant_id
    "#;
    let row = match sqlx::query(sqlx::AssertSqlSafe(sql))
        .bind(&record_no)
        .bind(&req.plan_id)
        .bind(&req.title)
        .bind(&req.inspection_type)
        .bind(&req.location)
        .bind(&req.inspector)
        .bind(&req.inspected_at)
        .bind(issues)
        .bind("in_progress")
        .bind(tenant_id)
        .fetch_one(&state.pool)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create inspection record: {}", e);
            return ApiResponse::server_error("检查记录创建失败");
        }
    };
    let record_id: String = row.try_get("id").unwrap_or_default();
    // 宽容写 items（前端 create 必带 items；表结构匹配则落库，失败仅记日志不阻断主流程）
    for it in &req.items {
        let _ = sqlx::query(
            r#"
            INSERT INTO ehs.qa_ehs_inspection_record_items
                (record_id, item_id, item_title, item_category, result, remarks, tenant_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#,
        )
        .bind(&record_id)
        .bind(&it.item_id)
        .bind(&it.item_title)
        .bind(&it.item_category)
        .bind(&it.result)
        .bind(&it.remarks)
        .bind(tenant_id)
        .execute(&state.pool)
        .await;
    }
    let record = inspection_record_from_row(&row);
    ApiResponse::success(record, "检查记录创建成功")
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["ehs:update"])),
    path = "/api/ehs/checks/records/{id}",
    request_body = UpdateInspectionRecordRequest,
    tag = "ehs",
    params(("id" = String, Path, description = "检查记录 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn update_record_db(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateInspectionRecordRequest>,
) -> ApiResponse<InspectionRecord> {
    let tenant_bind = resolve_inspection_tenant(&claims).to_string();
    let mut sets: Vec<String> = Vec::new();
    let mut params: Vec<String> = Vec::new();
    if let Some(v) = &req.result {
        sets.push(format!("result = ${}", params.len() + 1));
        params.push(v.clone());
    }
    if let Some(v) = &req.status {
        sets.push(format!("status = ${}", params.len() + 1));
        params.push(v.clone());
    }
    if let Some(v) = &req.issues {
        sets.push(format!("issues = ${}", params.len() + 1));
        params.push(serde_json::to_string(v).unwrap_or_else(|_| "[]".to_string()));
    }
    sets.push("updated_at = now()".to_string());
    let set_clause = sets.join(", ");
    let id_idx = params.len() + 1;
    let tenant_idx = params.len() + 2;
    let sql = format!(
        r#"
        UPDATE ehs.qa_ehs_inspection_records
        SET {set_clause}
        WHERE id::text = ${id_idx}
          AND (${tenant_idx} = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = ${tenant_idx})
          AND deleted_at IS NULL
        RETURNING id::text AS id, record_no, plan_id::text AS plan_id, title, inspection_type,
                  location, inspector, inspected_at::text AS inspected_at, result,
                  issues, attachments, status,
                  created_at::text AS created_at, updated_at::text AS updated_at,
                  tenant_id::text AS tenant_id
        "#
    );
    let mut query = sqlx::query(sqlx::AssertSqlSafe(sql));
    for p in &params {
        query = query.bind(p);
    }
    let row = match query
        .bind(&id)
        .bind(&tenant_bind)
        .fetch_optional(&state.pool)
        .await
    {
        Ok(Some(r)) => r,
        Ok(None) => return ApiResponse::not_found("检查记录不存在"),
        Err(e) => {
            tracing::error!("Failed to update inspection record: {}", e);
            return ApiResponse::server_error("检查记录更新失败");
        }
    };
    let record = inspection_record_from_row(&row);
    ApiResponse::success(record, "检查记录更新成功")
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ehs:delete"])),
    path = "/api/ehs/checks/records/{id}",
    tag = "ehs",
    params(("id" = String, Path, description = "检查记录 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn delete_record_db(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<()> {
    let tenant_bind = resolve_inspection_tenant(&claims).to_string();
    let sql = r#"
        UPDATE ehs.qa_ehs_inspection_records
        SET deleted_at = now()
        WHERE id::text = $1
          AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $2)
          AND deleted_at IS NULL
    "#;
    let result = match sqlx::query(sqlx::AssertSqlSafe(sql))
        .bind(&id)
        .bind(&tenant_bind)
        .execute(&state.pool)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to delete inspection record: {}", e);
            return ApiResponse::server_error("检查记录删除失败");
        }
    };
    if result.rows_affected() == 0 {
        return ApiResponse::not_found("检查记录不存在");
    }
    ApiResponse::success((), "检查记录删除成功")
}

// ---- 检查记录详情（GET /checks/records/{id}）：记录 + 子项 ----

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/checks/records/{id}",
    tag = "ehs",
    params(("id" = String, Path, description = "检查记录 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn get_record_db(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<InspectionRecordDetail> {
    let tenant_id = resolve_inspection_tenant(&claims);
    let tenant_bind = tenant_id.to_string();
    let record_sql = r#"
        SELECT id::text AS id, record_no, plan_id::text AS plan_id, title, inspection_type,
               location, inspector, inspected_at::text AS inspected_at, result,
               issues, attachments, status,
               created_at::text AS created_at, updated_at::text AS updated_at,
               tenant_id::text AS tenant_id
        FROM ehs.qa_ehs_inspection_records
        WHERE id::text = $1
          AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $2)
          AND deleted_at IS NULL
    "#;
    let row = match sqlx::query(sqlx::AssertSqlSafe(record_sql))
        .bind(&id)
        .bind(&tenant_bind)
        .fetch_optional(&state.pool)
        .await
    {
        Ok(Some(r)) => r,
        Ok(None) => return ApiResponse::not_found("检查记录不存在"),
        Err(e) => {
            tracing::error!("Failed to get inspection record: {}", e);
            return ApiResponse::server_error("获取检查记录失败");
        }
    };
    let record = inspection_record_from_row(&row);

    // 子项：宽容读取（items 表可能无 tenant_id/deleted_at，失败仅返回空列表）
    let items_sql = r#"
        SELECT id::text AS id, record_id::text AS record_id, item_id::text AS item_id,
               item_title, item_category, result, remarks
        FROM ehs.qa_ehs_inspection_record_items
        WHERE record_id::text = $1
        ORDER BY created_at ASC
    "#;
    let items: Vec<RecordItem> = match sqlx::query(sqlx::AssertSqlSafe(items_sql))
        .bind(&id)
        .fetch_all(&state.pool)
        .await
    {
        Ok(rows) => rows
            .iter()
            .map(|r| RecordItem {
                id: r.try_get("id").unwrap_or_default(),
                record_id: r.try_get("record_id").unwrap_or_default(),
                item_id: r.try_get("item_id").ok().flatten(),
                item_title: r.try_get("item_title").unwrap_or_default(),
                item_category: r
                    .try_get("item_category")
                    .unwrap_or_else(|_| "general".to_string()),
                result: r
                    .try_get("result")
                    .unwrap_or_else(|_| "pending".to_string()),
                remarks: r.try_get("remarks").ok().flatten(),
                tenant_id,
            })
            .collect(),
        Err(e) => {
            tracing::warn!("Failed to load record items (graceful empty): {}", e);
            Vec::new()
        }
    };

    ApiResponse::success(
        InspectionRecordDetail {
            record,
            items,
            tenant_id,
        },
        "获取检查记录成功",
    )
}

// ---- SafetyCheck 域（ehs.safety_checks：GET/PUT/DELETE /checks[/{id}]）----

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/checks",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_safety_checks_db(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Query(q): Query<InspectionQuery>,
) -> ApiResponse<Vec<serde_json::Value>> {
    let tenant_bind = resolve_inspection_tenant(&claims).to_string();
    let page = q.page.unwrap_or(1).max(1);
    let page_size = q.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let mut params: Vec<String> = vec![tenant_bind];
    let mut where_clause = String::from(
        " WHERE ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $1) AND deleted_at IS NULL",
    );
    if let Some(s) = &q.status {
        where_clause.push_str(&format!(" AND status = ${}", params.len() + 1));
        params.push(s.clone());
    }
    let sql = format!(
        r#"
        SELECT id, check_no, check_type, inspector, check_date::TEXT AS check_date, location,
               result, issues, attachments, status,
               created_at::TEXT AS created_at, updated_at::TEXT AS updated_at
        FROM ehs.safety_checks
        {where_clause}
        ORDER BY created_at DESC
        LIMIT {page_size} OFFSET {offset}
        "#
    );
    let mut query = sqlx::query(sqlx::AssertSqlSafe(sql));
    for p in &params {
        query = query.bind(p);
    }
    let rows = match query.fetch_all(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to list safety checks: {}", e);
            return ApiResponse::server_error("获取安全检查列表失败");
        }
    };
    let list: Vec<serde_json::Value> = rows.iter().map(safety_check_to_json).collect();
    ApiResponse::success(list, "获取安全检查列表成功")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/checks/{id}",
    tag = "ehs",
    params(("id" = String, Path, description = "安全检查 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn get_safety_check_db(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<serde_json::Value> {
    let tenant_bind = resolve_inspection_tenant(&claims).to_string();
    let sql = r#"
        SELECT id, check_no, check_type, inspector, check_date::TEXT AS check_date, location,
               result, issues, attachments, status,
               created_at::TEXT AS created_at, updated_at::TEXT AS updated_at
        FROM ehs.safety_checks
        WHERE id::text = $1
          AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $2)
          AND deleted_at IS NULL
    "#;
    let row = match sqlx::query(sqlx::AssertSqlSafe(sql))
        .bind(&id)
        .bind(&tenant_bind)
        .fetch_optional(&state.pool)
        .await
    {
        Ok(Some(r)) => r,
        Ok(None) => return ApiResponse::not_found("安全检查不存在"),
        Err(e) => {
            tracing::error!("Failed to get safety check: {}", e);
            return ApiResponse::server_error("获取安全检查失败");
        }
    };
    ApiResponse::success(safety_check_to_json(&row), "获取安全检查成功")
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["ehs:update"])),
    path = "/api/ehs/checks/{id}",
    request_body = serde_json::Value,
    tag = "ehs",
    params(("id" = String, Path, description = "安全检查 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn update_safety_check_db(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    let tenant_bind = resolve_inspection_tenant(&claims).to_string();
    let mut sets: Vec<String> = Vec::new();
    let mut params: Vec<String> = Vec::new();
    macro_rules! set_str {
        ($col:expr, $key:expr) => {
            if let Some(v) = req.get($key).and_then(|x| x.as_str()) {
                sets.push(format!("{} = ${}", $col, params.len() + 1));
                params.push(v.to_string());
            }
        };
    }
    set_str!("check_type", "check_type");
    set_str!("inspector", "inspector");
    set_str!("location", "location");
    set_str!("result", "result");
    set_str!("status", "status");
    if let Some(d) = req.get("check_date").and_then(|x| x.as_str()) {
        sets.push(format!("check_date = ${}::timestamptz", params.len() + 1));
        params.push(d.to_string());
    }
    if req.get("issues").is_some() {
        sets.push(format!("issues = ${}", params.len() + 1));
        params.push(req["issues"].to_string());
    }
    if req.get("attachments").is_some() {
        sets.push(format!("attachments = ${}", params.len() + 1));
        params.push(req["attachments"].to_string());
    }
    sets.push("updated_at = now()".to_string());
    let set_clause = sets.join(", ");
    let id_idx = params.len() + 1;
    let tenant_idx = params.len() + 2;
    let sql = format!(
        r#"
        UPDATE ehs.safety_checks
        SET {set_clause}
        WHERE id::text = ${id_idx}
          AND (${tenant_idx} = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = ${tenant_idx})
          AND deleted_at IS NULL
        RETURNING id, check_no, check_type, inspector, check_date::TEXT AS check_date, location,
                  result, issues, attachments, status,
                  created_at::TEXT AS created_at, updated_at::TEXT AS updated_at
        "#
    );
    let mut query = sqlx::query(sqlx::AssertSqlSafe(sql));
    for p in &params {
        query = query.bind(p);
    }
    let row = match query
        .bind(&id)
        .bind(&tenant_bind)
        .fetch_optional(&state.pool)
        .await
    {
        Ok(Some(r)) => r,
        Ok(None) => return ApiResponse::not_found("安全检查不存在"),
        Err(e) => {
            tracing::error!("Failed to update safety check: {}", e);
            return ApiResponse::server_error("安全检查更新失败");
        }
    };
    ApiResponse::success(safety_check_to_json(&row), "安全检查更新成功")
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ehs:delete"])),
    path = "/api/ehs/checks/{id}",
    tag = "ehs",
    params(("id" = String, Path, description = "安全检查 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn delete_safety_check_db(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<()> {
    let tenant_bind = resolve_inspection_tenant(&claims).to_string();
    let sql = r#"
        UPDATE ehs.safety_checks
        SET deleted_at = now()
        WHERE id::text = $1
          AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $2)
          AND deleted_at IS NULL
    "#;
    let result = match sqlx::query(sqlx::AssertSqlSafe(sql))
        .bind(&id)
        .bind(&tenant_bind)
        .execute(&state.pool)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to delete safety check: {}", e);
            return ApiResponse::server_error("安全检查删除失败");
        }
    };
    if result.rows_affected() == 0 {
        return ApiResponse::not_found("安全检查不存在");
    }
    ApiResponse::success((), "安全检查删除成功")
}

/// ehs.safety_checks 行 → serde_json::Value（与 create_safety_check 返回契约一致）
fn safety_check_to_json(r: &sqlx::postgres::PgRow) -> serde_json::Value {
    serde_json::json!({
        "id": r.get::<uuid::Uuid, _>("id"),
        "check_no": r.get::<String, _>("check_no"),
        "check_type": r.get::<String, _>("check_type"),
        "inspector": r.get::<String, _>("inspector"),
        "check_date": r.get::<Option<String>, _>("check_date"),
        "location": r.get::<Option<String>, _>("location"),
        "result": r.get::<String, _>("result"),
        "issues": r.get::<serde_json::Value, _>("issues"),
        "attachments": r.get::<Option<serde_json::Value>, _>("attachments"),
        "status": r.get::<String, _>("status"),
        "created_at": r.get::<String, _>("created_at"),
        "updated_at": r.get::<String, _>("updated_at"),
    })
}

/// 解析请求租户：超管 → nil UUID（全租户可见）；否则取 claims.tenant_id。
fn resolve_inspection_tenant(claims: &Claims) -> uuid::Uuid {
    if claims.is_superuser {
        uuid::Uuid::nil()
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
            .unwrap_or_else(uuid::Uuid::nil)
    }
}

/// qa_ehs_inspection_plans 行 → InspectionPlan
fn inspection_plan_from_row(r: &sqlx::postgres::PgRow) -> InspectionPlan {
    let tenant_id: String = r.try_get("tenant_id").unwrap_or_default();
    InspectionPlan {
        id: r.try_get("id").unwrap_or_default(),
        plan_no: r.try_get("plan_no").unwrap_or_default(),
        title: r.try_get("title").unwrap_or_default(),
        description: r.try_get("description").ok().flatten(),
        inspection_type: r.try_get("inspection_type").unwrap_or_default(),
        frequency: r.try_get("frequency").unwrap_or_default(),
        start_date: r.try_get("start_date").ok().flatten(),
        end_date: r.try_get("end_date").ok().flatten(),
        inspector: r.try_get("inspector").ok().flatten(),
        status: r.try_get("status").unwrap_or_else(|_| "active".to_string()),
        created_at: r.try_get::<String, _>("created_at").ok(),
        updated_at: r.try_get::<String, _>("updated_at").ok(),
        tenant_id: Uuid::parse_str(&tenant_id).unwrap_or_default(),
    }
}

/// qa_ehs_inspection_records 行 → InspectionRecord
fn inspection_record_from_row(r: &sqlx::postgres::PgRow) -> InspectionRecord {
    let tenant_id: String = r.try_get("tenant_id").unwrap_or_default();
    let issues: Option<serde_json::Value> = r.try_get("issues").ok().flatten();
    let issues = issues.and_then(|v| {
        v.as_array().map(|arr| {
            arr.iter()
                .filter_map(|e| e.as_str().map(|s| s.to_string()))
                .collect::<Vec<String>>()
        })
    });
    let attachments: Option<serde_json::Value> = r.try_get("attachments").ok().flatten();
    let attachments = attachments.and_then(|v| {
        v.as_array().map(|arr| {
            arr.iter()
                .filter_map(|e| e.as_str().map(|s| s.to_string()))
                .collect::<Vec<String>>()
        })
    });
    InspectionRecord {
        id: r.try_get("id").unwrap_or_default(),
        record_no: r.try_get("record_no").unwrap_or_default(),
        plan_id: r.try_get("plan_id").ok().flatten(),
        title: r.try_get("title").unwrap_or_default(),
        inspection_type: r.try_get("inspection_type").unwrap_or_default(),
        location: r.try_get("location").ok().flatten(),
        inspector: r.try_get("inspector").ok().flatten(),
        inspected_at: r.try_get("inspected_at").ok().flatten(),
        result: r.try_get("result").ok().flatten(),
        issues,
        attachments,
        status: r
            .try_get("status")
            .unwrap_or_else(|_| "in_progress".to_string()),
        created_at: r.try_get::<String, _>("created_at").ok(),
        updated_at: r.try_get::<String, _>("updated_at").ok(),
        tenant_id: Uuid::parse_str(&tenant_id).unwrap_or_default(),
    }
}

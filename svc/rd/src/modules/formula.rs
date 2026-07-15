use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use uuid::Uuid;

use crate::models::{
    CreateFormulaRequest, CreateFormulaVersionRequest, Formula, FormulaVersion,
    UpdateFormulaRequest,
};
use crate::modules::audit::log_audit_event;
use topems_shared::auth::Claims;
use topems_shared::response::ApiResponse;

fn get_tenant_id(claims: &Claims, headers: &HeaderMap) -> Uuid {
    claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .or_else(|| {
            headers
                .get("x-tenant-id")
                .and_then(|v| v.to_str().ok())
                .and_then(|s| Uuid::parse_str(s).ok())
        })
        .unwrap_or_else(Uuid::new_v4)
}

#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub project_id: Option<Uuid>,
}

pub fn create_routes() -> Router<super::ApiState> {
    Router::<super::ApiState>::new()
        .route(
            "/api/core/rd/formulas",
            get(list_formulas).post(create_formula),
        )
        .route(
            "/api/core/rd/formulas/{id}",
            get(get_formula).put(update_formula).delete(delete_formula),
        )
        .route(
            "/api/core/rd/formulas/{id}/versions",
            get(get_formula_versions).post(create_formula_version),
        )
        .route("/api/core/rd/formulas/{id}/approve", post(approve_formula))
}

async fn list_formulas(
    State(state): State<super::ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
    headers: HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, Formula>(
        r#"
        SELECT id, tenant_id, name, code, version, category, description, project_id, status,
               approval_status, approved_by, approved_at, effective_date, expiration_date,
               ingredients, process_steps, properties,
               created_by, created_at, updated_at
        FROM rs.formulas
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR name ILIKE $2 OR code ILIKE $2)
          AND ($3::text IS NULL OR status = $3)
          AND ($4::uuid IS NULL OR project_id = $4)
        ORDER BY created_at DESC
        LIMIT $5 OFFSET $6
        "#,
    )
    .bind(tenant_id)
    .bind(&params.search)
    .bind(&params.status)
    .bind(params.project_id)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(formulas) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM rs.formulas
                WHERE tenant_id = $1
                  AND ($2::text IS NULL OR name ILIKE $2 OR code ILIKE $2)
                  AND ($3::text IS NULL OR status = $3)
                  AND ($4::uuid IS NULL OR project_id = $4)
                "#,
            )
            .bind(tenant_id)
            .bind(&params.search)
            .bind(&params.status)
            .bind(params.project_id)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": formulas,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取配方列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取配方列表失败: {}", e);
            Json(ApiResponse::error(500, "获取配方列表失败"))
        }
    }
}

async fn create_formula(
    State(state): State<super::ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateFormulaRequest>,
) -> Json<ApiResponse<Formula>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    if req.name.is_empty() {
        return Json(ApiResponse::error(400, "配方名称不能为空"));
    }

    if req.code.is_empty() {
        return Json(ApiResponse::error(400, "配方编码不能为空"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();

    // Clone necessary fields before moving req into the query
    let req_name = req.name.clone();
    let req_code = req.code.clone();
    let req_category = req.category.clone();
    let req_description = req.description.clone();
    let req_process_steps = req.process_steps.clone();
    let req_clone = req.clone(); // Clone for audit log

    let result = sqlx::query_as::<_, Formula>(
        r#"
        INSERT INTO rs.formulas (
            id, tenant_id, name, code, version, category, description, project_id, status,
            approval_status, effective_date, expiration_date,
            ingredients, process_steps, process_params, properties, created_by,
            created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING id, tenant_id, name, code, version, category, description, project_id, status,
                  approval_status, approved_by, approved_at, effective_date, expiration_date,
                  ingredients, process_steps, properties,
                  created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .bind(&req_name)
    .bind(&req_code)
    .bind(req.version.unwrap_or_else(|| "v1.0".to_string()))
    .bind(&req_category)
    .bind(&req_description)
    .bind(req.project_id)
    .bind(req.status.unwrap_or_else(|| "草稿".to_string()))
    .bind::<Option<String>>(None)
    .bind(req.effective_date)
    .bind(req.expiration_date)
    .bind(serde_json::to_value(req.ingredients.unwrap_or(vec![])).unwrap_or(serde_json::json!([])))
    .bind(&req_process_steps)
    .bind(serde_json::json!({}))
    .bind(req.properties.unwrap_or(serde_json::json!({})))
    .bind(&req_name)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(formula) => (
            Json(ApiResponse::success(formula.clone(), "配方创建成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("创建配方失败: {}", e);
            (
                Json(ApiResponse::error(500, "配方创建失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req_clone).ok();
    let response_data = if let Ok(formula) = &result {
        serde_json::to_value(formula).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "formula".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str,
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn get_formula(
    State(state): State<super::ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<Formula>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let result = sqlx::query_as::<_, Formula>(
        r#"
        SELECT id, tenant_id, name, code, version, category, description, project_id, status,
               approval_status, approved_by, approved_at, effective_date, expiration_date,
               ingredients, process_steps, properties,
               created_by, created_at, updated_at
        FROM rs.formulas WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(formula)) => Json(ApiResponse::success(formula, "获取配方成功")),
        Ok(None) => Json(ApiResponse::error(404, "配方不存在")),
        Err(e) => {
            tracing::error!("获取配方失败: {}", e);
            Json(ApiResponse::error(500, "获取配方失败"))
        }
    }
}

async fn update_formula(
    State(state): State<super::ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateFormulaRequest>,
) -> Json<ApiResponse<Formula>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let existing = sqlx::query_as::<_, Formula>(
        r#"
        SELECT id, tenant_id, name, code, version, category, description, project_id, status,
               approval_status, approved_by, approved_at, effective_date, expiration_date,
               ingredients, process_steps, properties,
               created_by, created_at, updated_at
        FROM rs.formulas WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(f)) => f,
        Ok(None) => return Json(ApiResponse::error(404, "配方不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询配方失败: {}", e))),
    };

    let request_data = serde_json::to_value(&req).ok();

    let name = req.name.unwrap_or(existing.name);
    let category = req.category.or(existing.category);
    let description = req.description.or(existing.description);
    let status = req.status.unwrap_or(existing.status);
    let ingredients = req
        .ingredients
        .unwrap_or_else(|| serde_json::from_value(existing.ingredients.clone()).unwrap_or(vec![]));
    let process_steps = req.process_steps.or(existing.process_steps);
    let properties = req.properties.unwrap_or(existing.properties);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Formula>(
        r#"
        UPDATE rs.formulas SET
            name = $2, category = $3, description = $4, status = $5,
            effective_date = $6, expiration_date = $7,
            ingredients = $8, process_steps = $9, properties = $10, updated_at = $11
        WHERE id = $1 AND tenant_id = $12
        RETURNING id, tenant_id, name, code, version, category, description, project_id, status,
                  approval_status, approved_by, approved_at, effective_date, expiration_date,
                  ingredients, process_steps, properties,
                  created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&name)
    .bind(&category)
    .bind(&description)
    .bind(&status)
    .bind(req.effective_date)
    .bind(req.expiration_date)
    .bind(serde_json::to_value(ingredients).unwrap_or(serde_json::Value::Array(vec![])))
    .bind(&process_steps)
    .bind(properties)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(formula) => (
            Json(ApiResponse::success(formula.clone(), "配方更新成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("更新配方失败: {}", e);
            (
                Json(ApiResponse::error(500, "配方更新失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(formula) = &result {
        serde_json::to_value(formula).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "formula".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str,
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn delete_formula(
    State(state): State<super::ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let result = sqlx::query("DELETE FROM rs.formulas WHERE id = $1 AND tenant_id = $2")
        .bind(id)
        .bind(tenant_id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "配方删除成功")),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            Json(ApiResponse::error(404, "配方不存在")),
            "error".to_string(),
            Some("配方不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除配方失败: {}", e);
            (
                Json(ApiResponse::error(500, "配方删除失败")),
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
        "delete".to_string(),
        "formula".to_string(),
        Some(id),
        None,
        None,
        None,
        None,
        response_data,
        status_str,
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn get_formula_versions(
    State(state): State<super::ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<Vec<FormulaVersion>>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let result = sqlx::query_as::<_, FormulaVersion>(
        r#"
        SELECT id, tenant_id, formula_id, version, ingredients, process_steps, process_params,
               properties, changes, approval_status, approved_by, approved_at,
               created_by, created_at, updated_at
        FROM rs.formula_versions
        WHERE formula_id = $1 AND tenant_id = $2
        ORDER BY version DESC, created_at DESC
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(versions) => Json(ApiResponse::success(versions, "获取配方版本历史成功")),
        Err(e) => {
            tracing::error!("获取配方版本历史失败: {}", e);
            Json(ApiResponse::error(500, "获取配方版本历史失败"))
        }
    }
}

async fn create_formula_version(
    State(state): State<super::ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<CreateFormulaVersionRequest>,
) -> Json<ApiResponse<FormulaVersion>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let version_id = Uuid::new_v4();
    let now = Utc::now();

    let existing_formula = sqlx::query_as::<_, Formula>(
        r#"
        SELECT id, tenant_id, name, code, version, category, description, project_id, status,
               approval_status, approved_by, approved_at, effective_date, expiration_date,
               ingredients, process_steps, properties,
               created_by, created_at, updated_at
        FROM rs.formulas WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    let existing_formula = match existing_formula {
        Ok(Some(f)) => f,
        Ok(None) => return Json(ApiResponse::error(404, "配方不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询配方失败: {}", e))),
    };

    let ingredients = req.ingredients.unwrap_or_else(|| {
        serde_json::from_value(existing_formula.ingredients.clone()).unwrap_or(vec![])
    });

    let result = sqlx::query_as::<_, FormulaVersion>(
        r#"
        INSERT INTO rs.formula_versions (
            id, tenant_id, formula_id, version, ingredients, process_steps, process_params,
            properties, changes, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id, tenant_id, formula_id, version, ingredients, process_steps, process_params,
                  properties, changes, approval_status, approved_by, approved_at,
                  created_by, created_at, updated_at
        "#,
    )
    .bind(version_id)
    .bind(tenant_id)
    .bind(id)
    .bind(&req.version)
    .bind(serde_json::to_value(&ingredients).unwrap_or_default())
    .bind(&req.process_steps)
    .bind(serde_json::json!({}))
    .bind(serde_json::json!({}))
    .bind(&req.changes)
    .bind(&existing_formula.created_by)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(version) => {
            sqlx::query(
                r#"
                UPDATE rs.formulas SET
                    version = $2, ingredients = $3, process_steps = $4, updated_at = $5
                WHERE id = $1
                "#,
            )
            .bind(id)
            .bind(&req.version)
            .bind(serde_json::to_value(ingredients).unwrap_or(serde_json::Value::Array(vec![])))
            .bind(&req.process_steps)
            .bind(now)
            .execute(&state.db)
            .await
            .ok();

            Json(ApiResponse::success(version, "配方版本创建成功"))
        }
        Err(e) => {
            tracing::error!("创建配方版本失败: {}", e);
            Json(ApiResponse::error(500, "创建配方版本失败"))
        }
    }
}

async fn approve_formula(
    State(state): State<super::ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(_req): Json<crate::models::ApproveFormulaRequest>,
) -> Json<ApiResponse<Formula>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Formula>(
        r#"
        UPDATE rs.formulas SET
            status = '已批准',
            approval_status = 'approved',
            approved_at = $2,
            updated_at = $3
        WHERE id = $1 AND tenant_id = $4
        RETURNING id, tenant_id, name, code, version, category, description, project_id, status,
                  approval_status, approved_by, approved_at, effective_date, expiration_date,
                  ingredients, process_steps, properties,
                  created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(now)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(formula) => Json(ApiResponse::success(formula, "配方审批成功")),
        Err(e) => {
            tracing::error!("审批配方失败: {}", e);
            Json(ApiResponse::error(500, "审批配方失败"))
        }
    }
}

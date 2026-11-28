use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::{get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use uuid::Uuid;

use crate::models::{
    CreateFormulaRequest, CreateFormulaVersionRequest, Formula, FormulaStatus, FormulaVersion,
    UpdateFormulaRequest,
};
use crate::modules::audit::log_audit_event;
use topems_shared_auth::auth::Claims;
use topems_shared_core::{response::ApiResponse, TopemsError};

#[derive(Debug, Deserialize)]
pub struct ListParams {
    /// 页码，默认 1
    #[serde(default, alias = "p")]
    pub page: Option<i64>,
    /// 每页大小，默认 20，最多 100
    #[serde(
        default,
        alias = "page_size",
        alias = "pageSize",
        alias = "size",
        alias = "limit"
    )]
    pub page_size: Option<i64>,
    /// 关键字搜索
    #[serde(default, alias = "q", alias = "keyword")]
    pub search: Option<String>,
    /// 排序字段
    #[serde(default, alias = "sort", alias = "sortBy")]
    pub sort_by: Option<String>,
    /// 排序方向：asc / desc
    #[serde(
        default,
        alias = "sortorder",
        alias = "sortOrder",
        alias = "sort_dir",
        alias = "dir"
    )]
    pub sort_dir: Option<String>,
    pub status: Option<String>,
    pub project_id: Option<Uuid>,
    /// 评审状态过滤（批 38）：pending / approved / rejected
    /// 传 "none" 表示筛出尚未提交评审（approval_status IS NULL）的配方
    #[serde(default, alias = "approvalStatus")]
    pub approval_status: Option<String>,
}
impl ListParams {
    pub fn page_or_default(&self) -> i64 {
        self.page.unwrap_or(1).max(1)
    }

    pub fn page_size_or_default(&self) -> i64 {
        self.page_size.unwrap_or(20).clamp(1, 100)
    }

    pub fn offset(&self) -> i64 {
        (self.page_or_default() - 1) * self.page_size_or_default()
    }
}

pub fn create_routes() -> Router<super::ApiState> {
    Router::<super::ApiState>::new()
        .route("/formulas", get(list_formulas))
        .route("/formulas/{id}", get(get_formula))
        .route("/formulas/{id}/versions", get(get_formula_versions))
}

/// 配方写路由：由 main 在模块门之外再叠加细粒度码 rd:formula:write
/// （不再依赖模块伞码 rd:admin；字典中 rd:formula:write 已存在）。
pub fn create_write_routes() -> Router<super::ApiState> {
    Router::<super::ApiState>::new()
        .route("/formulas", post(create_formula))
        .route("/formulas/{id}", put(update_formula).delete(delete_formula))
        .route("/formulas/{id}/versions", post(create_formula_version))
        .route("/formulas/{id}/review", post(review_formula))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["rd:read"])),
    path = "/formulas",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "formula"
)]
pub async fn list_formulas(
    State(_state): State<super::ApiState>,
    Extension(_claims): Extension<Claims>,
    Query(params): Query<ListParams>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let page = params.page_or_default();
    let page_size = params.page_size_or_default();
    let offset = params.offset();
    let status_filter = match params.status.as_deref() {
        None => None,
        Some(raw) => match FormulaStatus::normalize(raw) {
            Some(status) => Some(status.as_db_str()),
            None => {
                return ApiResponse::bad_request(
                    "status 仅支持 draft / testing / approved / archived",
                )
            }
        },
    };

    let result = sqlx::query_as::<_, Formula>(
        r#"
        SELECT id, tenant_id, name, code, version, category, description, project_id, status,
               approval_status, approved_by, approved_at, effective_date, expiration_date,
               ingredients, process_steps, properties,
               created_by::text AS created_by, created_at, updated_at
        FROM rs.formulas
        WHERE deleted_at IS NULL
          AND ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
          AND ($3::uuid IS NULL OR project_id = $3)
          -- 批 38：评审状态过滤。"none" 表示筛出尚未提交评审的配方
          AND (
              $6::text IS NULL
              OR ($6::text = 'none' AND approval_status IS NULL)
              OR (approval_status = NULLIF($6::text, 'none'))
          )
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(&params.search)
    .bind(status_filter)
    .bind(params.project_id)
    .bind(page_size)
    .bind(offset)
    .bind(&params.approval_status)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(formulas) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM rs.formulas
                WHERE deleted_at IS NULL
                  AND ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND ($3::uuid IS NULL OR project_id = $3)
                  AND (
                      $4::text IS NULL
                      OR ($4::text = 'none' AND approval_status IS NULL)
                      OR (approval_status = NULLIF($4::text, 'none'))
                  )
                "#,
            )
            .bind(&params.search)
            .bind(status_filter)
            .bind(params.project_id)
            .bind(&params.approval_status)
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);

            ApiResponse::success(
                serde_json::json!({
                    "items": formulas,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取配方列表成功",
            )
        }
        Err(e) => {
            tracing::error!("获取配方列表失败: {}", e);
            ApiResponse::server_error("获取配方列表失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["rd:write"])),
    path = "/formulas",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "formula"
)]
pub async fn create_formula(
    State(state): State<super::ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<CreateFormulaRequest>,
) -> ApiResponse<Formula> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let tenant_opt: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap());
    if req.name.is_empty() {
        return ApiResponse::bad_request("配方名称不能为空");
    }

    if req.code.is_empty() {
        return ApiResponse::bad_request("配方编码不能为空");
    }

    let id = Uuid::new_v4();
    let now = Utc::now();
    let status = match req.status.as_deref() {
        None => FormulaStatus::DEFAULT,
        Some(raw) => match FormulaStatus::normalize(raw) {
            Some(status) => status,
            None => {
                return ApiResponse::bad_request(
                    "status 仅支持 draft / testing / approved / archived",
                )
            }
        },
    };

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
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17::uuid, $18, $19)
        RETURNING id, tenant_id, name, code, version, category, description, project_id, status,
                  approval_status, approved_by, approved_at, effective_date, expiration_date,
                  ingredients, process_steps, properties,
                  created_by::text AS created_by, created_at, updated_at
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
    .bind(status.as_db_str())
    .bind::<Option<String>>(None)
    .bind(req.effective_date)
    .bind(req.expiration_date)
    .bind(serde_json::to_value(req.ingredients.unwrap_or(vec![])).unwrap_or(serde_json::json!([])))
    .bind(&req_process_steps)
    .bind(serde_json::json!({}))
    .bind(req.properties.unwrap_or(serde_json::json!({})))
    .bind(&claims.sub)
    .bind(now)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(formula) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            (
                ApiResponse::success(formula.clone(), "配方创建成功"),
                "success".to_string(),
                None,
            )
        }
        Err(e) => {
            tracing::error!("创建配方失败: {}", e);
            (
                ApiResponse::server_error("配方创建失败"),
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
        &state.system_pool,
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["rd:read"])),
    path = "/formulas/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "formula"
)]
pub async fn get_formula(
    State(_state): State<super::ApiState>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<Formula> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let result = sqlx::query_as::<_, Formula>(
        r#"
        SELECT id, tenant_id, name, code, version, category, description, project_id, status,
               approval_status, approved_by, approved_at, effective_date, expiration_date,
               ingredients, process_steps, properties,
               created_by::text AS created_by, created_at, updated_at
        FROM rs.formulas WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(formula)) => ApiResponse::success(formula, "获取配方成功"),
        Ok(None) => ApiResponse::not_found("配方不存在"),
        Err(e) => {
            tracing::error!("获取配方失败: {}", e);
            ApiResponse::server_error("获取配方失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["rd:write"])),
    path = "/formulas/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "formula"
)]
pub async fn update_formula(
    State(state): State<super::ApiState>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<UpdateFormulaRequest>,
) -> ApiResponse<Formula> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let existing = sqlx::query_as::<_, Formula>(
        r#"
        SELECT id, tenant_id, name, code, version, category, description, project_id, status,
               approval_status, approved_by, approved_at, effective_date, expiration_date,
               ingredients, process_steps, properties,
               created_by::text AS created_by, created_at, updated_at
        FROM rs.formulas WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    let existing = match existing {
        Ok(Some(f)) => f,
        Ok(None) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            return ApiResponse::not_found("配方不存在");
        }

        Err(e) => return ApiResponse::from(TopemsError::internal("查询配方失败", e)),
    };

    let request_data = serde_json::to_value(&req).ok();

    let name = req.name.unwrap_or(existing.name);
    let category = req.category.or(existing.category);
    let description = req.description.or(existing.description);
    let current = match FormulaStatus::from_db_str(&existing.status) {
        Some(status) => status,
        None => match FormulaStatus::normalize(&existing.status) {
            Some(status) => status,
            None => return ApiResponse::server_error("配方状态未标准化，拒绝写入"),
        },
    };
    let status = match req.status.as_deref() {
        None => current,
        Some(raw) => match FormulaStatus::normalize(raw) {
            Some(target) if current.can_transition_to(target) => target,
            Some(_) => {
                return ApiResponse::bad_request(&format!(
                    "非法配方状态流转: {} -> {raw}",
                    current.as_db_str()
                ))
            }
            None => {
                return ApiResponse::bad_request(
                    "status 仅支持 draft / testing / approved / archived",
                )
            }
        },
    };
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
            effective_date = $6::timestamptz, expiration_date = $7::timestamptz,
            ingredients = $8, process_steps = $9, properties = $10, updated_at = $11
        WHERE id = $1
          AND status <> 'archived'
          AND (
              ($7::text = 'approve')
              OR ($7::text IN ('submit', 'reject') AND status IN ('draft', 'testing'))
          )
        RETURNING id, tenant_id, name, code, version, category, description, project_id, status,
                  approval_status, approved_by, approved_at, effective_date, expiration_date,
                  ingredients, process_steps, properties,
                  created_by::text AS created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&name)
    .bind(&category)
    .bind(&description)
    .bind(status.as_db_str())
    .bind(req.effective_date)
    .bind(req.expiration_date)
    .bind(serde_json::to_value(ingredients).unwrap_or(serde_json::Value::Array(vec![])))
    .bind(&process_steps)
    .bind(properties)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(formula) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            (
                ApiResponse::success(formula.clone(), "配方更新成功"),
                "success".to_string(),
                None,
            )
        }
        Err(e) => {
            tracing::error!("更新配方失败: {}", e);
            (
                ApiResponse::server_error("配方更新失败"),
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
        &state.system_pool,
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

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["rd:write"])),
    path = "/formulas/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "formula"
)]
pub async fn delete_formula(
    State(state): State<super::ApiState>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<String> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let result = sqlx::query("UPDATE rs.formulas SET deleted_at = NOW() WHERE id = $1")
        .bind(id)
        .execute(&mut **txn)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            ApiResponse::success("".to_string(), "配方删除成功"),
            "success".to_string(),
            None,
        ),
        Ok(_) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            (
                ApiResponse::not_found("配方不存在"),
                "error".to_string(),
                Some("配方不存在".to_string()),
            )
        }
        Err(e) => {
            tracing::error!("删除配方失败: {}", e);
            (
                ApiResponse::server_error("配方删除失败"),
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
        &state.system_pool,
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["rd:read"])),
    path = "/formulas/{id}/versions",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "formula"
)]
pub async fn get_formula_versions(
    State(_state): State<super::ApiState>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<Vec<FormulaVersion>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    // rs.formula_versions 实际不含 approval_status/approved_by/approved_at
    // （列漂移），用 NULL 别名补齐 FormulaVersion 的 Option 字段。
    let result = sqlx::query_as::<_, FormulaVersion>(
        r#"
        SELECT id, tenant_id, formula_id, version, ingredients,
               process_steps #>> '{}' AS process_steps, process_params,
               properties, changes #>> '{}' AS changes,
               NULL::text AS approval_status, NULL::text AS approved_by,
               NULL::timestamptz AS approved_at,
               created_by::text AS created_by, created_at, updated_at
        FROM rs.formula_versions
        WHERE formula_id = $1
        ORDER BY version DESC, created_at DESC
        "#,
    )
    .bind(id)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(versions) => ApiResponse::success(versions, "获取配方版本历史成功"),
        Err(e) => {
            tracing::error!("获取配方版本历史失败: {}", e);
            ApiResponse::server_error("获取配方版本历史失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["rd:write"])),
    path = "/formulas/{id}/versions",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "formula"
)]
pub async fn create_formula_version(
    State(_state): State<super::ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<CreateFormulaVersionRequest>,
) -> ApiResponse<FormulaVersion> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let tenant_opt: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap());
    let version_id = Uuid::new_v4();
    let now = Utc::now();

    let existing_formula = sqlx::query_as::<_, Formula>(
        r#"
        SELECT id, tenant_id, name, code, version, category, description, project_id, status,
               approval_status, approved_by, approved_at, effective_date, expiration_date,
               ingredients, process_steps, properties,
               created_by::text AS created_by, created_at, updated_at
        FROM rs.formulas WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    let existing_formula = match existing_formula {
        Ok(Some(f)) => f,
        Ok(None) => return ApiResponse::not_found("配方不存在"),
        Err(e) => return ApiResponse::from(TopemsError::internal("查询配方失败", e)),
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
        RETURNING id, tenant_id, formula_id, version, ingredients,
                  process_steps #>> '{}' AS process_steps, process_params,
                  properties, changes #>> '{}' AS changes,
                  NULL::text AS approval_status, NULL::text AS approved_by,
                  NULL::timestamptz AS approved_at,
                  created_by::text AS created_by, created_at, updated_at
        "#,
    )
    .bind(version_id)
    .bind(tenant_id)
    .bind(id)
    .bind(&req.version)
    .bind(serde_json::to_value(&ingredients).unwrap_or_default())
    .bind(serde_json::to_value(&req.process_steps).unwrap_or(serde_json::Value::Null))
    .bind(serde_json::json!({}))
    .bind(serde_json::json!({}))
    .bind(serde_json::to_value(&req.changes).unwrap_or(serde_json::Value::Null))
    .bind(&existing_formula.created_by)
    .bind(now)
    .bind(now)
    .fetch_one(&mut **txn)
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
            .execute(&mut **txn)
            .await
            .ok();

            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return ApiResponse::server_error("提交事务失败");
                }
            }
            ApiResponse::success(version, "配方版本创建成功")
        }
        Err(e) => {
            tracing::error!("创建配方版本失败: {}", e);
            ApiResponse::server_error("创建配方版本失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["rd:write"])),
    path = "/formulas/{id}/review",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "formula"
)]
/// 配方评审（批 38 新增，替代原 `/formulas/{id}/approve`）
///
/// 原 `approve_formula` 有两个缺陷：`approved_by` 从不写入、请求体被完全忽略
/// （`Json(_req)`），且把 `status` 硬写成中文 `'已批准'`。该端点在前端零调用
/// （全仓 grep `approveFormula` 仅命中定义处），故按"清理一步到位"直接替换为
/// 三态 review 端点，不保留旧路径。
///
/// action 语义：
///   - submit  提交评审  -> approval_status='pending'，清空 approved_by/approved_at
///   - approve 评审通过  -> approval_status='approved'，写 approved_by/approved_at，status='released'
///   - reject  评审驳回  -> approval_status='rejected'，写 approved_by/approved_at，status='draft'
pub async fn review_formula(
    State(_state): State<super::ApiState>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<crate::models::ReviewFormulaRequest>,
) -> ApiResponse<Formula> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let now = Utc::now();

    // 三种动作映射到 (approval_status, status)；评审人仅 approve/reject 落库
    let (approval_status, target_status) = match req.action.as_str() {
        "submit" => ("pending", "draft"),
        "approve" => ("approved", "approved"),
        "reject" => ("rejected", "draft"),
        other => {
            return ApiResponse::error(
                400,
                &format!("action 仅支持 submit / approve / reject，收到：{}", other),
            )
        }
    };
    let write_reviewer = matches!(req.action.as_str(), "approve" | "reject");
    let reviewer: Option<String> = if write_reviewer {
        Some(
            req.reviewer
                .as_deref()
                .map(str::trim)
                .filter(|s| !s.is_empty())
                .unwrap_or("system")
                .to_string(),
        )
    } else {
        None
    };

    let result = sqlx::query_as::<_, Formula>(
        r#"
        UPDATE rs.formulas SET
            status = $2,
            approval_status = $3,
            approved_by = $4,
            approved_at = $5,
            updated_at = $6
        WHERE id = $1
        RETURNING id, tenant_id, name, code, version, category, description, project_id, status,
                  approval_status, approved_by, approved_at, effective_date, expiration_date,
                  ingredients, process_steps, properties,
                  created_by::text AS created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(target_status)
    .bind(approval_status)
    .bind(reviewer.as_deref())
    .bind(if write_reviewer { Some(now) } else { None })
    .bind(now)
    .bind(req.action.as_str())
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(formula) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return ApiResponse::server_error("提交事务失败");
                }
            }
            let msg = match req.action.as_str() {
                "submit" => "配方已提交评审",
                "approve" => "配方评审通过",
                _ => "配方评审已驳回",
            };
            ApiResponse::success(formula, msg)
        }
        // 条件更新未命中：不存在或当前状态不允许该评审动作
        Err(sqlx::Error::RowNotFound) => {
            ApiResponse::bad_request("配方不存在或当前状态不允许该评审动作")
        }
        Err(e) => {
            tracing::error!("配方评审失败: {}", e);
            ApiResponse::server_error("配方评审失败")
        }
    }
}

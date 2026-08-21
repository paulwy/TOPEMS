//! Quality Inspection handlers

use crate::models::quality_inspection::*;
use crate::shared::fsm::inspection_can_transition;
use axum::{
    extract::State,
    routing::{delete, get, post, put},
    Extension, Json, Router,
};
use bigdecimal::BigDecimal;
use sqlx::{types::Uuid, Row};
use topems_shared_auth::auth::Claims;
use topems_shared_auth::get_tenant_id;
use topems_shared_core::response::ApiResponse;

const STATUS_IN_PROGRESS: &str = "in_progress";
const STATUS_PENDING_AUDIT: &str = "pending_audit";
const STATUS_COMPLETED: &str = "completed";
const STATUS_REJECTED: &str = "rejected";

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:inspection:read"])),
    path = "/api/qms/checks",
    tag = "quality_inspection",
    params(
        ("page" = Option<i64>, Query, description = "页码"),
        ("page_size" = Option<i64>, Query, description = "每页数量"),
        ("status" = Option<String>, Query, description = "状态过滤"),
        ("inspection_type" = Option<String>, Query, description = "检验类型过滤"),
        ("search" = Option<String>, Query, description = "搜索关键词"),
    ),
    responses(
        (status = 200, description = "质量检验列表", body = ApiResponse<ListInspectionsResponse>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn list_inspections(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Query(query): axum::extract::Query<InspectionQuery>,
) -> Json<ApiResponse<ListInspectionsResponse>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let search_pattern = query.search.as_ref().map(|s| format!("%{}%", s));

    let total: Option<i64> = match sqlx::query_scalar(
        r#"
        SELECT COUNT(*) as total FROM qa_quality_inspections
        WHERE deleted_at IS NULL AND tenant_id = $1
          AND ($2::text IS NULL OR status = $2)
          AND ($3::text IS NULL OR inspection_type = $3)
          AND ($4::text IS NULL OR inspection_no ILIKE $4 OR product_name ILIKE $4 OR inspector ILIKE $4 OR assignee ILIKE $4)
        "#,
    )
    .bind(tenant_id)
    .bind(query.status.as_deref())
    .bind(query.inspection_type.as_deref())
    .bind(search_pattern.as_deref())
    .fetch_one(&state.pool)
    .await
    {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("Failed to count inspections: {}", e);
            return Json(ApiResponse::error(500, "获取质量检查列表失败"));
        }
    };

    let data = match sqlx::query_as::<_, Inspection>(
        r#"
        SELECT id, tenant_id, inspection_no, inspection_type, product_id, product_name,
            standard_id, quantity, qualified_quantity, unqualified_quantity,
            qualification_rate, status, inspector, assignee,
            inspected_at::TEXT, result, memo, created_by,
            created_at::TEXT, updated_at::TEXT
        FROM qa_quality_inspections
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR status = $2)
          AND ($3::text IS NULL OR inspection_type = $3)
          AND ($4::text IS NULL OR inspection_no ILIKE $4 OR product_name ILIKE $4 OR inspector ILIKE $4 OR assignee ILIKE $4)
        ORDER BY created_at DESC
        LIMIT $5 OFFSET $6
        "#,
    )
    .bind(tenant_id)
    .bind(query.status.as_deref())
    .bind(query.inspection_type.as_deref())
    .bind(search_pattern.as_deref())
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await
    {
        Ok(d) => d,
        Err(e) => {
            tracing::error!("Failed to fetch inspections: {}", e);
            return Json(ApiResponse::error(500, "获取质量检查列表失败"));
        }
    };

    Json(ApiResponse::success(
        ListInspectionsResponse {
            inspections: data,
            total: total.unwrap_or(0),
            page,
            page_size,
        },
        "获取质量检查列表成功",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:inspection:write"])),
    path = "/api/qms/checks",
    tag = "quality_inspection",
    request_body = CreateInspectionRequest,
    responses(
        (status = 200, description = "质量检验创建成功", body = ApiResponse<Inspection>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn create_inspection(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateInspectionRequest>,
) -> Json<ApiResponse<Inspection>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let inspection_no = format!(
        "INS-{}",
        uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
    );

    let product_id = req
        .product_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());
    let standard_id = req
        .standard_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());

    let inspection = sqlx::query_as::<_, Inspection>(r#"INSERT INTO qa_quality_inspections (tenant_id, inspection_no, inspection_type, product_id, product_name, standard_id, quantity, status, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8) RETURNING id, tenant_id, inspection_no, inspection_type, product_id, product_name, standard_id, quantity, qualified_quantity, unqualified_quantity, qualification_rate, status, inspector, assignee, inspected_at::TEXT, result, memo, created_by, created_at::TEXT, updated_at::TEXT"#).bind(tenant_id).bind(inspection_no).bind(req.inspection_type).bind(product_id).bind(req.product_name).bind(standard_id).bind(req.quantity).bind(req.created_by)
    .fetch_one(&state.pool)
    .await;

    match inspection {
        Ok(data) => Json(ApiResponse::success(data, "质量检查创建成功")),
        Err(e) => {
            tracing::error!("Failed to create inspection: {}", e);
            Json(ApiResponse::error(500, "质量检查创建失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:inspection:read"])),
    path = "/api/qms/checks/{id}",
    tag = "quality_inspection",
    params(
        ("id" = String, Path, description = "检验ID"),
    ),
    responses(
        (status = 200, description = "质量检验详情", body = ApiResponse<Inspection>),
        (status = 400, description = "无效的检查ID"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_inspection(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<Inspection>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的检查ID")),
    };

    let inspection = sqlx::query_as::<_, Inspection>(r#"SELECT id, tenant_id, inspection_no, inspection_type, product_id, product_name, standard_id, quantity, qualified_quantity, unqualified_quantity, qualification_rate, status, inspector, assignee, inspected_at::TEXT, result, memo, created_by, created_at::TEXT, updated_at::TEXT FROM qa_quality_inspections WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2"#).bind(id).bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match inspection {
        Ok(data) => Json(ApiResponse::success(data, "获取质量检查成功")),
        Err(e) => {
            tracing::error!("Failed to fetch inspection: {}", e);
            Json(ApiResponse::error(500, "获取质量检查失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["qms:inspection:write"])),
    path = "/api/qms/checks/{id}",
    tag = "quality_inspection",
    params(
        ("id" = String, Path, description = "检验ID"),
    ),
    request_body = UpdateInspectionRequest,
    responses(
        (status = 200, description = "质量检查更新成功", body = ApiResponse<Inspection>),
        (status = 400, description = "无效的检查ID"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn update_inspection(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateInspectionRequest>,
) -> Json<ApiResponse<Inspection>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的检查ID")),
    };

    let product_id = req
        .product_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());
    let standard_id = req
        .standard_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());

    let inspection = sqlx::query_as::<_, Inspection>(r#"UPDATE qa_quality_inspections SET inspection_type = COALESCE($2, inspection_type), product_id = COALESCE($3, product_id), product_name = COALESCE($4, product_name), standard_id = COALESCE($5, standard_id), quantity = COALESCE($6, quantity), updated_at = NOW() WHERE id = $1 AND tenant_id = $7 RETURNING id, tenant_id, inspection_no, inspection_type, product_id, product_name, standard_id, quantity, qualified_quantity, unqualified_quantity, qualification_rate, status, inspector, assignee, inspected_at::TEXT, result, memo, created_by, created_at::TEXT, updated_at::TEXT"#).bind(id).bind(req.inspection_type).bind(product_id).bind(req.product_name).bind(standard_id).bind(req.quantity).bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match inspection {
        Ok(data) => Json(ApiResponse::success(data, "质量检查更新成功")),
        Err(e) => {
            tracing::error!("Failed to update inspection: {}", e);
            Json(ApiResponse::error(500, "质量检查更新失败"))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["qms:inspection:write"])),
    path = "/api/qms/checks/{id}",
    tag = "quality_inspection",
    params(
        ("id" = String, Path, description = "检验ID"),
    ),
    responses(
        (status = 200, description = "质量检查删除成功", body = ApiResponse<()>),
        (status = 400, description = "无效的检查ID"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn delete_inspection(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<bool>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的检查ID")),
    };

    let result = sqlx::query(
        r#"UPDATE qa_quality_inspections SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2"#,
    )
    .bind(id)
    .bind(tenant_id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(true, "质量检查删除成功")),
        Err(e) => {
            tracing::error!("Failed to delete inspection: {}", e);
            Json(ApiResponse::error(500, "质量检查删除失败"))
        }
    }
}

pub async fn assign_inspection(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<AssignInspectionRequest>,
) -> Json<ApiResponse<Inspection>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的检查ID")),
    };

    let current = sqlx::query(
        r#"SELECT status FROM qa_quality_inspections WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2"#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match current {
        Ok(row) => {
            let status_opt = row.get::<Option<String>, _>("status");
            let current_status = status_opt.as_deref().unwrap_or("");
            if inspection_can_transition(current_status, STATUS_IN_PROGRESS).is_err() {
                return Json(ApiResponse::error(400, "当前状态不允许分配"));
            }

            let inspection = sqlx::query_as::<_, Inspection>(r#"UPDATE qa_quality_inspections SET assignee = $2, status = 'in_progress', updated_at = NOW() WHERE id = $1 AND tenant_id = $3 RETURNING id, tenant_id, inspection_no, inspection_type, product_id, product_name, standard_id, quantity, qualified_quantity, unqualified_quantity, qualification_rate, status, inspector, assignee, inspected_at::TEXT, result, memo, created_by, created_at::TEXT, updated_at::TEXT"#).bind(id).bind(req.assignee).bind(tenant_id)
            .fetch_one(&state.pool)
            .await;

            match inspection {
                Ok(data) => {
                    let _ = sqlx::query(r#"INSERT INTO qa_inspection_audits (tenant_id, inspection_id, status_from, status_to, action, operator, comment) VALUES ($1, $2, $3, $4, $5, $6, $7)"#).bind(tenant_id).bind(id).bind(current_status).bind(STATUS_IN_PROGRESS).bind("assign").bind(req.operator).bind(None::<String>)
                    .execute(&state.pool)
                    .await;
                    Json(ApiResponse::success(data, "质量检查分配成功"))
                }
                Err(e) => {
                    tracing::error!("Failed to assign inspection: {}", e);
                    Json(ApiResponse::error(500, "质量检查分配失败"))
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to find inspection: {}", e);
            Json(ApiResponse::error(404, "质量检查不存在"))
        }
    }
}

pub async fn submit_result(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<SubmitInspectionResultRequest>,
) -> Json<ApiResponse<Inspection>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的检查ID")),
    };

    let current = sqlx::query(
        r#"SELECT status FROM qa_quality_inspections WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2"#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match current {
        Ok(row) => {
            let status_opt = row.get::<Option<String>, _>("status");
            let current_status = status_opt.as_deref().unwrap_or("");
            if inspection_can_transition(current_status, STATUS_PENDING_AUDIT).is_err() {
                return Json(ApiResponse::error(400, "当前状态不允许提交结果"));
            }

            let rate = req.qualification_rate.or_else(|| {
                let total = &req.qualified_quantity + &req.unqualified_quantity;
                if total > 0 {
                    Some((&req.qualified_quantity / &total) * BigDecimal::from(100))
                } else {
                    None
                }
            });

            let inspector = req.inspector.clone();
            let inspection = sqlx::query_as::<_, Inspection>(r#"UPDATE qa_quality_inspections SET qualified_quantity = $2, unqualified_quantity = $3, qualification_rate = $4, inspector = $5, result = $6, memo = $7, status = 'pending_audit', inspected_at = NOW(), updated_at = NOW() WHERE id = $1 AND tenant_id = $8 RETURNING id, tenant_id, inspection_no, inspection_type, product_id, product_name, standard_id, quantity, qualified_quantity, unqualified_quantity, qualification_rate, status, inspector, assignee, inspected_at::TEXT, result, memo, created_by, created_at::TEXT, updated_at::TEXT"#).bind(id).bind(req.qualified_quantity).bind(req.unqualified_quantity).bind(rate).bind(inspector.clone()).bind(req.result).bind(req.memo).bind(tenant_id)
            .fetch_one(&state.pool)
            .await;

            match inspection {
                Ok(data) => {
                    if let Some(results) = req.results {
                        for item in results {
                            let _ = sqlx::query(r#"INSERT INTO qa_inspection_results (tenant_id, inspection_id, item_name, standard_value, measured_value, is_qualified, remark) VALUES ($1, $2, $3, $4, $5, $6, $7)"#).bind(tenant_id).bind(id).bind(item.item_name).bind(item.standard_value).bind(item.measured_value).bind(item.is_qualified).bind(item.remark)
                            .execute(&state.pool)
                            .await;
                        }
                    }

                    let _ = sqlx::query(r#"INSERT INTO qa_inspection_audits (tenant_id, inspection_id, status_from, status_to, action, operator, comment) VALUES ($1, $2, $3, $4, $5, $6, $7)"#).bind(tenant_id).bind(id).bind(current_status).bind(STATUS_PENDING_AUDIT).bind("submit").bind(inspector).bind(None::<String>)
                    .execute(&state.pool)
                    .await;
                    Json(ApiResponse::success(data, "提交检查结果成功"))
                }
                Err(e) => {
                    tracing::error!("Failed to submit inspection result: {}", e);
                    Json(ApiResponse::error(500, "提交检查结果失败"))
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to find inspection: {}", e);
            Json(ApiResponse::error(404, "质量检查不存在"))
        }
    }
}

pub async fn audit_inspection(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<AuditInspectionRequest>,
) -> Json<ApiResponse<Inspection>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的检查ID")),
    };

    let current = sqlx::query(
        r#"SELECT status FROM qa_quality_inspections WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2"#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match current {
        Ok(row) => {
            let status_opt = row.get::<Option<String>, _>("status");
            let current_status = status_opt.as_deref().unwrap_or("");
            let target_status = match req.action.as_str() {
                "approve" => STATUS_COMPLETED,
                "reject" => STATUS_REJECTED,
                _ => return Json(ApiResponse::error(400, "无效的审核动作")),
            };

            if inspection_can_transition(current_status, target_status).is_err() {
                return Json(ApiResponse::error(400, "当前状态不允许此操作"));
            }

            let inspection = sqlx::query_as::<_, Inspection>(r#"UPDATE qa_quality_inspections SET status = $2, updated_at = NOW() WHERE id = $1 AND tenant_id = $3 RETURNING id, tenant_id, inspection_no, inspection_type, product_id, product_name, standard_id, quantity, qualified_quantity, unqualified_quantity, qualification_rate, status, inspector, assignee, inspected_at::TEXT, result, memo, created_by, created_at::TEXT, updated_at::TEXT"#).bind(id).bind(target_status).bind(tenant_id)
            .fetch_one(&state.pool)
            .await;

            match inspection {
                Ok(data) => {
                    let action_name = if target_status == STATUS_COMPLETED {
                        "approve"
                    } else {
                        "reject"
                    };
                    let _ = sqlx::query(r#"INSERT INTO qa_inspection_audits (tenant_id, inspection_id, status_from, status_to, action, operator, comment) VALUES ($1, $2, $3, $4, $5, $6, $7)"#).bind(tenant_id).bind(id).bind(current_status).bind(target_status).bind(action_name).bind(req.operator).bind(req.comment)
                    .execute(&state.pool)
                    .await;
                    let msg = if target_status == STATUS_COMPLETED {
                        "审核通过"
                    } else {
                        "审核驳回"
                    };
                    Json(ApiResponse::success(data, msg))
                }
                Err(e) => {
                    tracing::error!("Failed to audit inspection: {}", e);
                    Json(ApiResponse::error(500, "审核失败"))
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to find inspection: {}", e);
            Json(ApiResponse::error(404, "质量检查不存在"))
        }
    }
}

pub async fn rework_inspection(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<AuditInspectionRequest>,
) -> Json<ApiResponse<Inspection>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的检查ID")),
    };

    let current = sqlx::query(
        r#"SELECT status FROM qa_quality_inspections WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2"#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match current {
        Ok(row) => {
            let status_opt = row.get::<Option<String>, _>("status");
            let current_status = status_opt.as_deref().unwrap_or("");
            if inspection_can_transition(current_status, STATUS_IN_PROGRESS).is_err() {
                return Json(ApiResponse::error(400, "当前状态不允许返工"));
            }

            let inspection = sqlx::query_as::<_, Inspection>(r#"UPDATE qa_quality_inspections SET status = 'in_progress', updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING id, tenant_id, inspection_no, inspection_type, product_id, product_name, standard_id, quantity, qualified_quantity, unqualified_quantity, qualification_rate, status, inspector, assignee, inspected_at::TEXT, result, memo, created_by, created_at::TEXT, updated_at::TEXT"#).bind(id).bind(tenant_id)
            .fetch_one(&state.pool)
            .await;

            match inspection {
                Ok(data) => {
                    let _ = sqlx::query(r#"INSERT INTO qa_inspection_audits (tenant_id, inspection_id, status_from, status_to, action, operator, comment) VALUES ($1, $2, $3, $4, $5, $6, $7)"#).bind(tenant_id).bind(id).bind(current_status).bind(STATUS_IN_PROGRESS).bind("rework").bind(&req.operator).bind(req.comment.clone())
                    .execute(&state.pool)
                    .await;
                    let _ = crate::models::audit_log::log_approval_event(
                        &state.pool,
                        &tenant_id.to_string(),
                        "inspection",
                        &id.to_string(),
                        "rework",
                        &req.operator,
                        current_status,
                        STATUS_IN_PROGRESS,
                        req.comment.as_deref(),
                    )
                    .await;
                    Json(ApiResponse::success(data, "返工申请已提交"))
                }
                Err(e) => {
                    tracing::error!("Failed to rework inspection: {}", e);
                    Json(ApiResponse::error(500, "返工申请失败"))
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to find inspection: {}", e);
            Json(ApiResponse::error(404, "质量检查不存在"))
        }
    }
}

pub async fn get_inspection_results(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<Vec<InspectionResult>>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的检查ID")),
    };

    let results = sqlx::query_as::<_, InspectionResult>(r#"SELECT id, tenant_id, inspection_id, item_name, standard_value, measured_value, is_qualified, remark, created_at::TEXT FROM qa_inspection_results WHERE inspection_id = $1 AND tenant_id = $2 ORDER BY created_at"#).bind(id).bind(tenant_id)
    .fetch_all(&state.pool)
    .await;

    match results {
        Ok(data) => Json(ApiResponse::success(data, "获取检查结果明细成功")),
        Err(e) => {
            tracing::error!("Failed to fetch inspection results: {}", e);
            Json(ApiResponse::error(500, "获取检查结果明细失败"))
        }
    }
}

pub async fn get_inspection_audits(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<Vec<InspectionAudit>>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的检查ID")),
    };

    let audits = sqlx::query_as::<_, InspectionAudit>(r#"SELECT id, tenant_id, inspection_id, status_from, status_to, action, operator, comment, created_at::TEXT FROM qa_inspection_audits WHERE inspection_id = $1 AND tenant_id = $2 ORDER BY created_at"#).bind(id).bind(tenant_id)
    .fetch_all(&state.pool)
    .await;

    match audits {
        Ok(data) => Json(ApiResponse::success(data, "获取检查审核记录成功")),
        Err(e) => {
            tracing::error!("Failed to fetch inspection audits: {}", e);
            Json(ApiResponse::error(500, "获取检查审核记录失败"))
        }
    }
}

pub fn create_routes() -> Router<crate::AppState> {
    Router::new()
        .route("/checks", get(list_inspections))
        .route("/checks", post(create_inspection))
        .route("/checks/{id}", get(get_inspection))
        .route("/checks/{id}", put(update_inspection))
        .route("/checks/{id}", delete(delete_inspection))
        .route("/checks/{id}/assign", post(assign_inspection))
        .route("/checks/{id}/submit", post(submit_result))
        .route("/checks/{id}/audit", post(audit_inspection))
        .route("/checks/{id}/rework", post(rework_inspection))
        .route("/checks/{id}/approve", post(approve_inspection))
        .route("/checks/{id}/reject", post(reject_inspection))
        .route("/checks/{id}/results", get(get_inspection_results))
        .route("/checks/{id}/audits", get(get_inspection_audits))
}

/// APV-1 审批请求体
#[derive(Debug, serde::Deserialize)]
pub struct ApprovalRequest {
    pub operator: String,
    pub comment: Option<String>,
}

/// APV-1: 审批通过 (pending_audit → completed)
pub async fn approve_inspection(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<ApprovalRequest>,
) -> Json<ApiResponse<Inspection>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的检查ID")),
    };

    let current = sqlx::query("SELECT status FROM qa_quality_inspections WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2")
        .bind(id).bind(tenant_id).fetch_one(&state.pool).await;

    match current {
        Ok(row) => {
            let current_status = row.get::<Option<String>, _>("status").unwrap_or_default();
            if crate::shared::fsm::inspection_requires_approval(&current_status, STATUS_COMPLETED)
                && crate::shared::fsm::inspection_can_transition(&current_status, STATUS_COMPLETED)
                    .is_err()
            {
                return Json(ApiResponse::error(400, "当前状态不允许审批通过"));
            }
            let inspection = sqlx::query_as::<_, Inspection>(r#"UPDATE qa_quality_inspections SET status = 'completed', updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING id, tenant_id, inspection_no, inspection_type, product_id, product_name, standard_id, quantity, qualified_quantity, unqualified_quantity, qualification_rate, status, inspector, assignee, inspected_at::TEXT, result, memo, created_by, created_at::TEXT, updated_at::TEXT"#).bind(id).bind(tenant_id)
                .fetch_one(&state.pool).await;
            match inspection {
                Ok(data) => {
                    let _ = crate::models::audit_log::log_approval_event(
                        &state.pool,
                        &tenant_id.to_string(),
                        "inspection",
                        &id.to_string(),
                        "approve",
                        &req.operator,
                        &current_status,
                        STATUS_COMPLETED,
                        req.comment.as_deref(),
                    )
                    .await;
                    Json(ApiResponse::success(data, "审批通过"))
                }
                Err(e) => {
                    tracing::error!("Failed to approve inspection: {}", e);
                    Json(ApiResponse::error(500, "审批失败"))
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to find inspection: {}", e);
            Json(ApiResponse::error(404, "质量检查不存在"))
        }
    }
}

/// APV-1: 审批驳回 (pending_audit → rejected)
pub async fn reject_inspection(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<ApprovalRequest>,
) -> Json<ApiResponse<Inspection>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的检查ID")),
    };

    let current = sqlx::query("SELECT status FROM qa_quality_inspections WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2")
        .bind(id).bind(tenant_id).fetch_one(&state.pool).await;

    match current {
        Ok(row) => {
            let current_status = row.get::<Option<String>, _>("status").unwrap_or_default();
            if crate::shared::fsm::inspection_can_transition(&current_status, STATUS_REJECTED)
                .is_err()
            {
                return Json(ApiResponse::error(400, "当前状态不允许驳回"));
            }
            let inspection = sqlx::query_as::<_, Inspection>(r#"UPDATE qa_quality_inspections SET status = 'rejected', updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING id, tenant_id, inspection_no, inspection_type, product_id, product_name, standard_id, quantity, qualified_quantity, unqualified_quantity, qualification_rate, status, inspector, assignee, inspected_at::TEXT, result, memo, created_by, created_at::TEXT, updated_at::TEXT"#).bind(id).bind(tenant_id)
                .fetch_one(&state.pool).await;
            match inspection {
                Ok(data) => {
                    let _ = crate::models::audit_log::log_approval_event(
                        &state.pool,
                        &tenant_id.to_string(),
                        "inspection",
                        &id.to_string(),
                        "reject",
                        &req.operator,
                        &current_status,
                        STATUS_REJECTED,
                        req.comment.as_deref(),
                    )
                    .await;
                    Json(ApiResponse::success(data, "审批驳回"))
                }
                Err(e) => {
                    tracing::error!("Failed to reject inspection: {}", e);
                    Json(ApiResponse::error(500, "驳回失败"))
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to find inspection: {}", e);
            Json(ApiResponse::error(404, "质量检查不存在"))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_inspection_result_item_struct() {
        let item = InspectionResultItem {
            item_name: "外观检查".to_string(),
            standard_value: Some("无划痕".to_string()),
            measured_value: Some("表面有轻微划痕".to_string()),
            is_qualified: false,
            remark: Some("需要返工".to_string()),
        };

        assert_eq!(item.item_name, "外观检查");
        assert!(!item.is_qualified);
        assert!(item.remark.is_some());

        let cloned = item.clone();
        assert_eq!(cloned.item_name, item.item_name);
        assert_eq!(cloned.is_qualified, item.is_qualified);
    }

    #[test]
    fn test_inspection_result_item_all_none_optionals() {
        let item = InspectionResultItem {
            item_name: "尺寸检查".to_string(),
            standard_value: None,
            measured_value: None,
            is_qualified: true,
            remark: None,
        };

        assert!(item.standard_value.is_none());
        assert!(item.measured_value.is_none());
        assert!(item.remark.is_none());
        assert!(item.is_qualified);
    }
}

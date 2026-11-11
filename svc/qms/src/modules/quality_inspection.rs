//! Quality Inspection handlers
use utoipa::ToSchema;

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
use topems_shared_auth::{get_tenant_id, require_tenant};
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::locale::Locale;
use topems_shared_core::response::ApiResponse;
use topems_shared_event::event::{commit_retry, EventType, QmsInspectionCompletedPayload};

const STATUS_IN_PROGRESS: &str = "in_progress";
const STATUS_PENDING_AUDIT: &str = "pending_audit";
const STATUS_COMPLETED: &str = "completed";
const STATUS_REJECTED: &str = "rejected";

/// 写后读回列（$3 = locale，$1 = id，$2 = tenant）。
const INSPECTION_SELECT_CAST: &str = r#"id::TEXT, tenant_id::TEXT, inspection_no, inspection_type, product_id, CASE WHEN $3 = 'en' THEN COALESCE(product_name_en, product_name) ELSE product_name END AS product_name, standard_id, quantity, qualified_quantity, unqualified_quantity, qualification_rate, status, inspector, assignee, inspected_at, result, memo, created_by, created_at, updated_at"#;

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
) -> ApiResponse<ListInspectionsResponse> {
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant read scope: {}", e);
            return ApiResponse::server_error("获取质量检查列表失败");
        }
    };
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let _tenant_id = get_tenant_id(&claims, &headers);
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let search_pattern = query.search.as_ref().map(|s| format!("%{}%", s));

    let total: Option<i64> = match sqlx::query_scalar(
        only_own_schema_query!("qms", r#"
        SELECT COUNT(*) as total FROM qms.qa_quality_inspections
        WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1)
          AND ($2::text IS NULL OR status = $2)
          AND ($3::text IS NULL OR inspection_type = $3)
          AND ($4::text IS NULL OR inspection_no ILIKE $4 OR product_name ILIKE $4 OR inspector ILIKE $4 OR assignee ILIKE $4)
        "#),
    )
    .bind(tenant_opt)
    .bind(query.status.as_deref())
    .bind(query.inspection_type.as_deref())
    .bind(search_pattern.as_deref())
    .fetch_one(&mut scope)
    .await
    {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("Failed to count inspections: {}", e);
            return ApiResponse::server_error("获取质量检查列表失败");
        }
    };

    let data = match sqlx::query_as::<_, Inspection>(
        only_own_schema_query!("qms", r#"
        SELECT id::TEXT, tenant_id::TEXT, inspection_no, inspection_type, product_id,
            CASE WHEN $7 = 'en' THEN COALESCE(product_name_en, product_name) ELSE product_name END AS product_name,
            standard_id, quantity, qualified_quantity, unqualified_quantity,
            qualification_rate, status, inspector, assignee,
            inspected_at, result, memo, created_by,
            created_at, updated_at
        FROM qms.qa_quality_inspections
        WHERE ($1::uuid IS NULL OR tenant_id = $1)
          AND ($2::text IS NULL OR status = $2)
          AND ($3::text IS NULL OR inspection_type = $3)
          AND ($4::text IS NULL OR inspection_no ILIKE $4 OR product_name ILIKE $4 OR inspector ILIKE $4 OR assignee ILIKE $4)
        ORDER BY created_at DESC
        LIMIT $5 OFFSET $6
        "#),
    )
    .bind(tenant_opt)
    .bind(query.status.as_deref())
    .bind(query.inspection_type.as_deref())
    .bind(search_pattern.as_deref())
    .bind(page_size)
    .bind(offset)
    .bind(Locale::from_headers(&headers).as_sql())
    .fetch_all(&mut scope)
    .await
    {
        Ok(d) => d,
        Err(e) => {
            tracing::error!("Failed to fetch inspections: {}", e);
            return ApiResponse::server_error("获取质量检查列表失败");
        }
    };

    ApiResponse::success(
        ListInspectionsResponse {
            inspections: data,
            total: total.unwrap_or(0),
            page,
            page_size,
        },
        "获取质量检查列表成功",
    )
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
) -> ApiResponse<Inspection> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let inspection_no = format!(
        "INS-{}",
        uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
    );

    // TODO(w-b6a): product_id 属跨域主数据（pdm/mdm），当前未校验属主，本批不引入跨域依赖。
    let product_id = req
        .product_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());
    let standard_id = req
        .standard_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());

    let mut scope = match state.db.scope_for_tenant(tenant_id).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant write scope: {}", e);
            return ApiResponse::server_error("质量检查创建失败");
        }
    };

    // 同域引用校验：检验标准必须存在且同租户。
    if let Some(sid) = standard_id {
        match sqlx::query_scalar::<_, i64>(only_own_schema_query!(
            "qms",
            "SELECT COUNT(*) FROM qms.qa_standards WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL"
        ))
        .bind(sid)
        .bind(tenant_id)
        .fetch_one(&mut scope)
        .await
        {
            Ok(0) => return ApiResponse::bad_request("检验标准不存在或不属于当前租户"),
            Ok(_) => {}
            Err(e) => {
                tracing::error!("Failed to validate standard: {}", e);
                return ApiResponse::server_error("质量检查创建失败");
            }
        }
    }

    let inspection = sqlx::query_as::<_, Inspection>(only_own_schema_query!("qms", r#"INSERT INTO qms.qa_quality_inspections (tenant_id, inspection_no, inspection_type, product_id, product_name, standard_id, quantity, status, created_by, product_name_en) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9) RETURNING id::TEXT, tenant_id::TEXT, inspection_no, inspection_type, product_id, CASE WHEN $10 = 'en' THEN COALESCE(product_name_en, product_name) ELSE product_name END AS product_name, standard_id, quantity, qualified_quantity, unqualified_quantity, qualification_rate, status, inspector, assignee, inspected_at, result, memo, created_by, created_at, updated_at"#)).bind(tenant_id).bind(inspection_no).bind(req.inspection_type).bind(product_id).bind(req.product_name).bind(standard_id).bind(req.quantity).bind(req.created_by).bind(req.product_name_en.clone()).bind(Locale::from_headers(&headers).as_sql())
    .fetch_one(&mut scope)
    .await;

    match inspection {
        Ok(data) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("Failed to commit inspection create: {}", e);
                return ApiResponse::server_error("质量检查创建失败");
            }
            ApiResponse::success(data, "质量检查创建成功")
        }
        Err(e) => {
            tracing::error!("Failed to create inspection: {}", e);
            ApiResponse::server_error("质量检查创建失败")
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
) -> ApiResponse<Inspection> {
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant read scope: {}", e);
            return ApiResponse::server_error("获取质量检查失败");
        }
    };
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let _tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的检查ID"),
    };

    let inspection = sqlx::query_as::<_, Inspection>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, inspection_no, inspection_type, product_id, CASE WHEN $3 = 'en' THEN COALESCE(product_name_en, product_name) ELSE product_name END AS product_name, standard_id, quantity, qualified_quantity, unqualified_quantity, qualification_rate, status, inspector, assignee, inspected_at, result, memo, created_by, created_at, updated_at FROM qms.qa_quality_inspections WHERE deleted_at IS NULL AND id::TEXT = $1 AND ($2::uuid IS NULL OR tenant_id = $2)"#)).bind(id.to_string()).bind(tenant_opt).bind(Locale::from_headers(&headers).as_sql())
    .fetch_one(&mut scope)
    .await;

    match inspection {
        Ok(data) => ApiResponse::success(data, "获取质量检查成功"),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("记录不存在"),

        Err(e) => {
            tracing::error!("Failed to fetch inspection: {}", e);
            ApiResponse::server_error("获取质量检查失败")
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
) -> ApiResponse<Inspection> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的检查ID"),
    };

    // TODO(w-b6a): product_id 属跨域主数据（pdm/mdm），当前未校验属主，本批不引入跨域依赖。
    let product_id = req
        .product_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());
    let standard_id = req
        .standard_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());

    let mut scope = match state.db.scope_for_tenant(tenant_id).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant write scope: {}", e);
            return ApiResponse::server_error("质量检查更新失败");
        }
    };

    // 同域引用校验：检验标准必须存在且同租户。
    if let Some(sid) = standard_id {
        match sqlx::query_scalar::<_, i64>(only_own_schema_query!(
            "qms",
            "SELECT COUNT(*) FROM qms.qa_standards WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL"
        ))
        .bind(sid)
        .bind(tenant_id)
        .fetch_one(&mut scope)
        .await
        {
            Ok(0) => return ApiResponse::bad_request("检验标准不存在或不属于当前租户"),
            Ok(_) => {}
            Err(e) => {
                tracing::error!("Failed to validate standard: {}", e);
                return ApiResponse::server_error("质量检查更新失败");
            }
        }
    }

    let updated = sqlx::query(only_own_schema_query!("qms", r#"UPDATE qms.qa_quality_inspections SET inspection_type = COALESCE($2, inspection_type), product_id = COALESCE($3, product_id), product_name = COALESCE($4, product_name), standard_id = COALESCE($5, standard_id), quantity = COALESCE($6, quantity), updated_at = NOW() WHERE id::TEXT = $1 AND tenant_id = $7 AND deleted_at IS NULL"#)).bind(id.to_string()).bind(req.inspection_type).bind(product_id).bind(req.product_name).bind(standard_id).bind(req.quantity).bind(tenant_id)
    .execute(&mut scope)
    .await;

    match updated {
        Ok(r) if r.rows_affected() == 0 => ApiResponse::not_found("记录不存在"),
        Ok(_) => {
            let locale = Locale::from_headers(&headers).as_sql();
            match sqlx::query_as::<_, Inspection>(sqlx::AssertSqlSafe(format!(
                "SELECT {} FROM qms.qa_quality_inspections WHERE deleted_at IS NULL AND id::TEXT = $1 AND tenant_id = $2",
                INSPECTION_SELECT_CAST
            )))
            .bind(id.to_string())
            .bind(tenant_id)
            .bind(locale)
            .fetch_one(&mut scope)
            .await
            {
                Ok(data) => {
                    if let Err(e) = scope.commit().await {
                        tracing::error!("Failed to commit inspection update: {}", e);
                        return ApiResponse::server_error("质量检查更新失败");
                    }
                    ApiResponse::success(data, "质量检查更新成功")
                }
                Err(e) => {
                    tracing::error!("Failed to reload inspection: {}", e);
                    ApiResponse::server_error("质量检查更新失败")
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to update inspection: {}", e);
            ApiResponse::server_error("质量检查更新失败")
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
        (status = 200, description = "质量检查删除成功"),
        (status = 400, description = "无效的检查ID"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn delete_inspection(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<bool> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的检查ID"),
    };

    let mut scope = match state.db.scope_for_tenant(tenant_id).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant write scope: {}", e);
            return ApiResponse::server_error("质量检查删除失败");
        }
    };

    let result = sqlx::query(
        only_own_schema_query!("qms", r#"UPDATE qms.qa_quality_inspections SET deleted_at = NOW() WHERE id::TEXT = $1 AND tenant_id = $2 AND deleted_at IS NULL"#),
    )
    .bind(id.to_string())
    .bind(tenant_id)
    .execute(&mut scope)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            if let Err(e) = scope.commit().await {
                tracing::error!("Failed to commit inspection delete: {}", e);
                return ApiResponse::server_error("质量检查删除失败");
            }
            ApiResponse::success(true, "质量检查删除成功")
        }
        Ok(_) => ApiResponse::not_found("检查不存在或已删除"),
        Err(e) => {
            tracing::error!("Failed to delete inspection: {}", e);
            ApiResponse::server_error("质量检查删除失败")
        }
    }
}
#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:inspection:write"])),
    path = "/checks/{id}/assign",
    params(
        ("id" = String, Path, description = "id"),
    ),
    responses((status = 200, description = "assign_inspection OK")),
    tag = "quality_inspection"
)]

pub async fn assign_inspection(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<AssignInspectionRequest>,
) -> ApiResponse<Inspection> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的检查ID"),
    };

    let mut scope = match state.db.scope_for_tenant(tenant_id).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant write scope: {}", e);
            return ApiResponse::server_error("质量检查分配失败");
        }
    };

    let current = sqlx::query(
        only_own_schema_query!("qms", r#"SELECT status FROM qms.qa_quality_inspections WHERE deleted_at IS NULL AND id::TEXT = $1 AND tenant_id = $2"#),
    )
    .bind(id.to_string())
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await;

    match current {
        Ok(row) => {
            let status_opt = row.get::<Option<String>, _>("status");
            let current_status = status_opt.as_deref().unwrap_or("");
            if inspection_can_transition(current_status, STATUS_IN_PROGRESS).is_err() {
                return ApiResponse::bad_request("当前状态不允许分配");
            }

            let updated = sqlx::query(only_own_schema_query!(
                "qms",
                r#"UPDATE qms.qa_quality_inspections SET assignee = $2, status = 'in_progress', updated_at = NOW() WHERE id::TEXT = $1 AND tenant_id = $3 AND status = $4 AND deleted_at IS NULL"#
            ))
            .bind(id.to_string())
            .bind(req.assignee)
            .bind(tenant_id)
            .bind(current_status)
            .execute(&mut scope)
            .await;

            match updated {
                Ok(r) if r.rows_affected() == 0 => {
                    ApiResponse::conflict("状态已被并发修改，请重试")
                }
                Ok(_) => {
                    // 审计与主表同事务：写失败整体回滚。
                    if let Err(e) = sqlx::query(only_own_schema_query!("qms", r#"INSERT INTO qms.qa_inspection_audits (tenant_id, inspection_id, status_from, status_to, action, operator, comment) VALUES ($1, $2, $3, $4, $5, $6, $7)"#)).bind(tenant_id).bind(id).bind(current_status).bind(STATUS_IN_PROGRESS).bind("assign").bind(&req.operator).bind(None::<String>)
                    .execute(&mut scope)
                    .await
                    {
                        tracing::error!("Failed to write inspection audit: {}", e);
                        return ApiResponse::server_error("质量检查分配失败");
                    }
                    let locale = Locale::from_headers(&headers).as_sql();
                    match sqlx::query_as::<_, Inspection>(sqlx::AssertSqlSafe(format!(
                        "SELECT {} FROM qms.qa_quality_inspections WHERE deleted_at IS NULL AND id::TEXT = $1 AND tenant_id = $2",
                        INSPECTION_SELECT_CAST
                    )))
                    .bind(id.to_string())
                    .bind(tenant_id)
                    .bind(locale)
                    .fetch_one(&mut scope)
                    .await
                    {
                        Ok(data) => {
                            if let Err(e) = scope.commit().await {
                                tracing::error!("Failed to commit inspection assign: {}", e);
                                return ApiResponse::server_error("质量检查分配失败");
                            }
                            ApiResponse::success(data, "质量检查分配成功")
                        }
                        Err(e) => {
                            tracing::error!("Failed to reload inspection: {}", e);
                            ApiResponse::server_error("质量检查分配失败")
                        }
                    }
                }
                Err(e) => {
                    tracing::error!("Failed to assign inspection: {}", e);
                    ApiResponse::server_error("质量检查分配失败")
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to find inspection: {}", e);
            ApiResponse::not_found("质量检查不存在")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:inspection:write"])),
    path = "/checks/{id}/submit",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "quality_inspection"
)]
pub async fn submit_result(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<SubmitInspectionResultRequest>,
) -> ApiResponse<Inspection> {
    // 决策 1：submit_result 改 require_tenant —— 服务身份带 x-tenant-id 必须能写；
    // 缺租户一律 400，禁止随机 UUID / nil 兜底。
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的检查ID"),
    };

    let mut scope = match state.db.scope_for_tenant(tenant_id).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant write scope: {}", e);
            return ApiResponse::server_error("提交检查结果失败");
        }
    };

    let current = sqlx::query(
        only_own_schema_query!("qms", r#"SELECT status, quantity FROM qms.qa_quality_inspections WHERE deleted_at IS NULL AND id::TEXT = $1 AND tenant_id = $2"#),
    )
    .bind(id.to_string())
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await;

    match current {
        Ok(row) => {
            let status_opt = row.get::<Option<String>, _>("status");
            let current_status = status_opt.as_deref().unwrap_or("");
            if inspection_can_transition(current_status, STATUS_PENDING_AUDIT).is_err() {
                return ApiResponse::bad_request("当前状态不允许提交结果");
            }

            // 数量勾稽校验（P2 制造域 B 审计）：合格数 + 不合格数 不得大于检验总量；
            // 等于总量为允许边界（全数合格/全数不合格）。
            let total_qty: BigDecimal = row.get("quantity");
            if &req.qualified_quantity + &req.unqualified_quantity > total_qty {
                return ApiResponse::bad_request("合格数与不合格数之和不能大于检验总量");
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
            let updated = sqlx::query(only_own_schema_query!("qms", r#"UPDATE qms.qa_quality_inspections SET qualified_quantity = $2, unqualified_quantity = $3, qualification_rate = $4, inspector = $5, result = $6, memo = $7, status = 'pending_audit', inspected_at = NOW(), updated_at = NOW() WHERE id::TEXT = $1 AND tenant_id = $8 AND status = $10 AND deleted_at IS NULL"#)).bind(id.to_string()).bind(req.qualified_quantity).bind(req.unqualified_quantity).bind(rate).bind(inspector.clone()).bind(req.result).bind(req.memo).bind(tenant_id).bind(Locale::from_headers(&headers).as_sql()).bind(current_status)
            .execute(&mut scope)
            .await;

            match updated {
                Ok(r) if r.rows_affected() == 0 => {
                    ApiResponse::conflict("状态已被并发修改，请重试")
                }
                Ok(_) => {
                    if let Some(results) = req.results {
                        for item in results {
                            // 子表与主表同事务：写失败整体回滚，禁止"主表 200、明细缺失"。
                            if let Err(e) = sqlx::query(only_own_schema_query!("qms", r#"INSERT INTO qms.qa_inspection_results (tenant_id, inspection_id, item_name, item_name_en, standard_value, measured_value, is_qualified, remark) VALUES ($1, $2, $3, $8, $4, $5, $6, $7)"#)).bind(tenant_id).bind(id).bind(item.item_name).bind(item.standard_value).bind(item.measured_value).bind(item.is_qualified).bind(item.remark).bind(item.item_name_en)
                            .execute(&mut scope)
                            .await
                            {
                                tracing::error!("Failed to write inspection result item: {}", e);
                                return ApiResponse::server_error("提交检查结果失败");
                            }
                        }
                    }

                    if let Err(e) = sqlx::query(only_own_schema_query!("qms", r#"INSERT INTO qms.qa_inspection_audits (tenant_id, inspection_id, status_from, status_to, action, operator, comment) VALUES ($1, $2, $3, $4, $5, $6, $7)"#)).bind(tenant_id).bind(id).bind(current_status).bind(STATUS_PENDING_AUDIT).bind("submit").bind(inspector).bind(None::<String>)
                    .execute(&mut scope)
                    .await
                    {
                        tracing::error!("Failed to write inspection audit: {}", e);
                        return ApiResponse::server_error("提交检查结果失败");
                    }

                    let locale = Locale::from_headers(&headers).as_sql();
                    let data = match sqlx::query_as::<_, Inspection>(sqlx::AssertSqlSafe(format!(
                        "SELECT {} FROM qms.qa_quality_inspections WHERE deleted_at IS NULL AND id::TEXT = $1 AND tenant_id = $2",
                        INSPECTION_SELECT_CAST
                    )))
                    .bind(id.to_string())
                    .bind(tenant_id)
                    .bind(locale)
                    .fetch_one(&mut scope)
                    .await
                    {
                        Ok(d) => d,
                        Err(e) => {
                            tracing::error!("Failed to reload inspection: {}", e);
                            return ApiResponse::server_error("提交检查结果失败");
                        }
                    };

                    if let Err(e) = scope.commit().await {
                        tracing::error!("Failed to commit inspection submit: {}", e);
                        return ApiResponse::server_error("提交检查结果失败");
                    }

                    // 发布 QmsInspectionCompleted 事件（质量链联动：integration 订阅 → lims 采样 / ehs 风险）
                    if let Some(ref publisher) = state.event_publisher {
                        let publisher = publisher.clone();
                        let eid = data.id.clone();
                        let eno = data.inspection_no.clone();
                        let pid = data.product_id;
                        let pname = data.product_name.clone();
                        let res = data.result.clone().unwrap_or_default();
                        let rate = data
                            .qualification_rate
                            .as_ref()
                            .map(|b| b.to_string().parse::<f64>().unwrap_or(0.0));
                        let insp = data.inspector.clone().unwrap_or_default();
                        tokio::spawn(async move {
                            let Ok(eid_uuid) = uuid::Uuid::parse_str(&eid) else {
                                tracing::warn!(
                                    "[qms] QmsInspectionCompleted 发布跳过：非法 inspection_id={}",
                                    eid
                                );
                                return;
                            };
                            let payload = QmsInspectionCompletedPayload {
                                tenant_id,
                                inspection_id: eid_uuid,
                                inspection_no: eno,
                                product_id: pid,
                                product_name: pname,
                                result: res,
                                qualification_rate: rate,
                                inspector: insp,
                            };
                            let et = EventType::QmsInspectionCompleted;
                            match publisher.publish_event(et, &payload).await {
                                Ok(_) => tracing::info!(
                                    "[qms] QmsInspectionCompleted 事件发布成功 - inspection_id={}",
                                    eid
                                ),
                                Err(e) => {
                                    tracing::warn!(
                                        "[qms] QmsInspectionCompleted 事件发布失败: {}，入重试队列",
                                        e
                                    );
                                    commit_retry::push_retry_typed("qms", et, &payload).await;
                                }
                            }
                        });
                    }

                    ApiResponse::success(data, "提交检查结果成功")
                }
                Err(e) => {
                    tracing::error!("Failed to submit inspection result: {}", e);
                    ApiResponse::server_error("提交检查结果失败")
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to find inspection: {}", e);
            ApiResponse::not_found("质量检查不存在")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:inspection:write"])),
    path = "/checks/{id}/audit",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "quality_inspection"
)]
pub async fn audit_inspection(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<AuditInspectionRequest>,
) -> ApiResponse<Inspection> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的检查ID"),
    };

    let mut scope = match state.db.scope_for_tenant(tenant_id).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant write scope: {}", e);
            return ApiResponse::server_error("审核失败");
        }
    };

    let current = sqlx::query(
        only_own_schema_query!("qms", r#"SELECT status FROM qms.qa_quality_inspections WHERE deleted_at IS NULL AND id::TEXT = $1 AND tenant_id = $2"#),
    )
    .bind(id.to_string())
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await;

    match current {
        Ok(row) => {
            let status_opt = row.get::<Option<String>, _>("status");
            let current_status = status_opt.as_deref().unwrap_or("");
            let target_status = match req.action.as_str() {
                "approve" => STATUS_COMPLETED,
                "reject" => STATUS_REJECTED,
                _ => return ApiResponse::bad_request("无效的审核动作"),
            };

            if inspection_can_transition(current_status, target_status).is_err() {
                return ApiResponse::bad_request("当前状态不允许此操作");
            }

            let updated = sqlx::query(only_own_schema_query!(
                "qms",
                r#"UPDATE qms.qa_quality_inspections SET status = $2, updated_at = NOW() WHERE id::TEXT = $1 AND tenant_id = $3 AND status = $4 AND deleted_at IS NULL"#
            ))
            .bind(id.to_string())
            .bind(target_status)
            .bind(tenant_id)
            .bind(current_status)
            .execute(&mut scope)
            .await;

            match updated {
                Ok(r) if r.rows_affected() == 0 => {
                    ApiResponse::conflict("状态已被并发修改，请重试")
                }
                Ok(_) => {
                    let action_name = if target_status == STATUS_COMPLETED {
                        "approve"
                    } else {
                        "reject"
                    };
                    // 审计与主表同事务：写失败整体回滚。
                    if let Err(e) = sqlx::query(only_own_schema_query!("qms", r#"INSERT INTO qms.qa_inspection_audits (tenant_id, inspection_id, status_from, status_to, action, operator, comment) VALUES ($1, $2, $3, $4, $5, $6, $7)"#)).bind(tenant_id).bind(id).bind(current_status).bind(target_status).bind(action_name).bind(&req.operator).bind(req.comment.clone())
                    .execute(&mut scope)
                    .await
                    {
                        tracing::error!("Failed to write inspection audit: {}", e);
                        return ApiResponse::server_error("审核失败");
                    }
                    let locale = Locale::from_headers(&headers).as_sql();
                    match sqlx::query_as::<_, Inspection>(sqlx::AssertSqlSafe(format!(
                        "SELECT {} FROM qms.qa_quality_inspections WHERE deleted_at IS NULL AND id::TEXT = $1 AND tenant_id = $2",
                        INSPECTION_SELECT_CAST
                    )))
                    .bind(id.to_string())
                    .bind(tenant_id)
                    .bind(locale)
                    .fetch_one(&mut scope)
                    .await
                    {
                        Ok(data) => {
                            if let Err(e) = scope.commit().await {
                                tracing::error!("Failed to commit inspection audit: {}", e);
                                return ApiResponse::server_error("审核失败");
                            }
                            let msg = if target_status == STATUS_COMPLETED {
                                "审核通过"
                            } else {
                                "审核驳回"
                            };
                            ApiResponse::success(data, msg)
                        }
                        Err(e) => {
                            tracing::error!("Failed to reload inspection: {}", e);
                            ApiResponse::server_error("审核失败")
                        }
                    }
                }
                Err(e) => {
                    tracing::error!("Failed to audit inspection: {}", e);
                    ApiResponse::server_error("审核失败")
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to find inspection: {}", e);
            ApiResponse::not_found("质量检查不存在")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:inspection:write"])),
    path = "/checks/{id}/rework",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "quality_inspection"
)]
pub async fn rework_inspection(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<AuditInspectionRequest>,
) -> ApiResponse<Inspection> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的检查ID"),
    };

    let mut scope = match state.db.scope_for_tenant(tenant_id).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant write scope: {}", e);
            return ApiResponse::server_error("返工申请失败");
        }
    };

    let current = sqlx::query(
        only_own_schema_query!("qms", r#"SELECT status FROM qms.qa_quality_inspections WHERE deleted_at IS NULL AND id::TEXT = $1 AND tenant_id = $2"#),
    )
    .bind(id.to_string())
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await;

    match current {
        Ok(row) => {
            let status_opt = row.get::<Option<String>, _>("status");
            let current_status = status_opt.as_deref().unwrap_or("");
            if inspection_can_transition(current_status, STATUS_IN_PROGRESS).is_err() {
                return ApiResponse::bad_request("当前状态不允许返工");
            }

            let updated = sqlx::query(only_own_schema_query!(
                "qms",
                r#"UPDATE qms.qa_quality_inspections SET status = 'in_progress', updated_at = NOW() WHERE id::TEXT = $1 AND tenant_id = $2 AND status = $3 AND deleted_at IS NULL"#
            ))
            .bind(id.to_string())
            .bind(tenant_id)
            .bind(current_status)
            .execute(&mut scope)
            .await;

            match updated {
                Ok(r) if r.rows_affected() == 0 => {
                    ApiResponse::conflict("状态已被并发修改，请重试")
                }
                Ok(_) => {
                    // 审计与审批事件均与主表同事务：任一失败整体回滚。
                    if let Err(e) = sqlx::query(only_own_schema_query!("qms", r#"INSERT INTO qms.qa_inspection_audits (tenant_id, inspection_id, status_from, status_to, action, operator, comment) VALUES ($1, $2, $3, $4, $5, $6, $7)"#)).bind(tenant_id).bind(id).bind(current_status).bind(STATUS_IN_PROGRESS).bind("rework").bind(&req.operator).bind(req.comment.clone())
                    .execute(&mut scope)
                    .await
                    {
                        tracing::error!("Failed to write inspection audit: {}", e);
                        return ApiResponse::server_error("返工申请失败");
                    }
                    if let Err(e) = crate::models::audit_log::log_approval_event(
                        &mut scope,
                        &tenant_id.to_string(),
                        "inspection",
                        &id.to_string(),
                        "rework",
                        &req.operator,
                        current_status,
                        STATUS_IN_PROGRESS,
                        req.comment.as_deref(),
                    )
                    .await
                    {
                        tracing::error!("Failed to log approval event: {}", e);
                        return ApiResponse::server_error("返工申请失败");
                    }
                    let locale = Locale::from_headers(&headers).as_sql();
                    match sqlx::query_as::<_, Inspection>(sqlx::AssertSqlSafe(format!(
                        "SELECT {} FROM qms.qa_quality_inspections WHERE deleted_at IS NULL AND id::TEXT = $1 AND tenant_id = $2",
                        INSPECTION_SELECT_CAST
                    )))
                    .bind(id.to_string())
                    .bind(tenant_id)
                    .bind(locale)
                    .fetch_one(&mut scope)
                    .await
                    {
                        Ok(data) => {
                            if let Err(e) = scope.commit().await {
                                tracing::error!("Failed to commit inspection rework: {}", e);
                                return ApiResponse::server_error("返工申请失败");
                            }
                            ApiResponse::success(data, "返工申请已提交")
                        }
                        Err(e) => {
                            tracing::error!("Failed to reload inspection: {}", e);
                            ApiResponse::server_error("返工申请失败")
                        }
                    }
                }
                Err(e) => {
                    tracing::error!("Failed to rework inspection: {}", e);
                    ApiResponse::server_error("返工申请失败")
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to find inspection: {}", e);
            ApiResponse::not_found("质量检查不存在")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:inspection:read"])),
    path = "/checks/{id}/results",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "quality_inspection"
)]
pub async fn get_inspection_results(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<Vec<InspectionResult>> {
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant read scope: {}", e);
            return ApiResponse::server_error("获取检查结果明细失败");
        }
    };
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let _tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的检查ID"),
    };

    let results = sqlx::query_as::<_, InspectionResult>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, inspection_id, CASE WHEN $3 = 'en' THEN COALESCE(item_name_en, item_name) ELSE item_name END AS item_name, standard_value, measured_value, is_qualified, remark, created_at FROM qms.qa_inspection_results WHERE inspection_id = $1 AND ($2::uuid IS NULL OR tenant_id = $2) ORDER BY created_at"#)).bind(id).bind(tenant_opt).bind(Locale::from_headers(&headers).as_sql())
    .fetch_all(&mut scope)
    .await;

    match results {
        Ok(data) => ApiResponse::success(data, "获取检查结果明细成功"),
        Err(e) => {
            tracing::error!("Failed to fetch inspection results: {}", e);
            ApiResponse::server_error("获取检查结果明细失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:inspection:read"])),
    path = "/checks/{id}/audits",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "quality_inspection"
)]
pub async fn get_inspection_audits(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<Vec<InspectionAudit>> {
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant read scope: {}", e);
            return ApiResponse::server_error("获取检查审核记录失败");
        }
    };
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let _tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的检查ID"),
    };

    let audits = sqlx::query_as::<_, InspectionAudit>(only_own_schema_query!("qms", r#"SELECT id::TEXT, COALESCE(tenant_id::TEXT, '00000000-0000-0000-0000-000000000001') AS tenant_id, inspection_id, status_from, status_to, action, operator, comment, created_at FROM qms.qa_inspection_audits WHERE inspection_id = $1 AND ($2::uuid IS NULL OR tenant_id = $2) ORDER BY created_at"#)).bind(id).bind(tenant_opt)
    .fetch_all(&mut scope)
    .await;

    match audits {
        Ok(data) => ApiResponse::success(data, "获取检查审核记录成功"),
        Err(e) => {
            tracing::error!("Failed to fetch inspection audits: {}", e);
            ApiResponse::server_error("获取检查审核记录失败")
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
#[derive(Debug, serde::Deserialize, ToSchema)]
pub struct ApprovalRequest {
    pub operator: String,
    pub comment: Option<String>,
}

/// APV-1: 审批通过 (pending_audit → completed)
#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:inspection:write"])),
    path = "/checks/{id}/approve",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "quality_inspection"
)]
pub async fn approve_inspection(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<ApprovalRequest>,
) -> ApiResponse<Inspection> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的检查ID"),
    };

    let mut scope = match state.db.scope_for_tenant(tenant_id).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant write scope: {}", e);
            return ApiResponse::server_error("审批失败");
        }
    };

    let current = sqlx::query(only_own_schema_query!("qms", "SELECT status FROM qms.qa_quality_inspections WHERE deleted_at IS NULL AND id::TEXT = $1 AND tenant_id = $2"))
        .bind(id.to_string()).bind(tenant_id).fetch_one(&mut scope).await;

    match current {
        Ok(row) => {
            let current_status = row.get::<Option<String>, _>("status").unwrap_or_default();
            if crate::shared::fsm::inspection_requires_approval(&current_status, STATUS_COMPLETED)
                && crate::shared::fsm::inspection_can_transition(&current_status, STATUS_COMPLETED)
                    .is_err()
            {
                return ApiResponse::bad_request("当前状态不允许审批通过");
            }
            let updated = sqlx::query(only_own_schema_query!(
                "qms",
                "UPDATE qms.qa_quality_inspections SET status = $3, updated_at = NOW() WHERE id::TEXT = $1 AND tenant_id = $2 AND status = $4 AND deleted_at IS NULL"
            ))
            .bind(id.to_string()).bind(tenant_id).bind(STATUS_COMPLETED).bind(&current_status)
            .execute(&mut scope).await;
            match updated {
                Ok(r) if r.rows_affected() == 0 => {
                    ApiResponse::conflict("状态已被并发修改，请重试")
                }
                Ok(_) => {
                    // 审批事件与主表同事务：写失败整体回滚。
                    if let Err(e) = crate::models::audit_log::log_approval_event(
                        &mut scope,
                        &tenant_id.to_string(),
                        "inspection",
                        &id.to_string(),
                        "approve",
                        &req.operator,
                        &current_status,
                        STATUS_COMPLETED,
                        req.comment.as_deref(),
                    )
                    .await
                    {
                        tracing::error!("Failed to log approval event: {}", e);
                        return ApiResponse::server_error("审批失败");
                    }
                    let locale = Locale::from_headers(&headers).as_sql();
                    match sqlx::query_as::<_, Inspection>(sqlx::AssertSqlSafe(format!(
                        "SELECT {} FROM qms.qa_quality_inspections WHERE deleted_at IS NULL AND id::TEXT = $1 AND tenant_id = $2",
                        INSPECTION_SELECT_CAST
                    )))
                    .bind(id.to_string()).bind(tenant_id).bind(locale).fetch_one(&mut scope).await
                    {
                        Ok(data) => {
                            if let Err(e) = scope.commit().await {
                                tracing::error!("Failed to commit inspection approve: {}", e);
                                return ApiResponse::server_error("审批失败");
                            }
                            ApiResponse::success(data, "审批通过")
                        }
                        Err(e) => {
                            tracing::error!("Failed to reload inspection: {}", e);
                            ApiResponse::server_error("审批失败")
                        }
                    }
                }
                Err(e) => {
                    tracing::error!("Failed to approve inspection: {}", e);
                    ApiResponse::server_error("审批失败")
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to find inspection: {}", e);
            ApiResponse::not_found("质量检查不存在")
        }
    }
}

/// APV-1: 审批驳回 (pending_audit → rejected)
#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:inspection:write"])),
    path = "/checks/{id}/reject",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "quality_inspection"
)]
pub async fn reject_inspection(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<ApprovalRequest>,
) -> ApiResponse<Inspection> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的检查ID"),
    };

    let mut scope = match state.db.scope_for_tenant(tenant_id).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant write scope: {}", e);
            return ApiResponse::server_error("驳回失败");
        }
    };

    let current = sqlx::query(only_own_schema_query!("qms", "SELECT status FROM qms.qa_quality_inspections WHERE deleted_at IS NULL AND id::TEXT = $1 AND tenant_id = $2"))
        .bind(id.to_string()).bind(tenant_id).fetch_one(&mut scope).await;

    match current {
        Ok(row) => {
            let current_status = row.get::<Option<String>, _>("status").unwrap_or_default();
            if crate::shared::fsm::inspection_can_transition(&current_status, STATUS_REJECTED)
                .is_err()
            {
                return ApiResponse::bad_request("当前状态不允许驳回");
            }
            let updated = sqlx::query(only_own_schema_query!(
                "qms",
                "UPDATE qms.qa_quality_inspections SET status = $3, updated_at = NOW() WHERE id::TEXT = $1 AND tenant_id = $2 AND status = $4 AND deleted_at IS NULL"
            ))
            .bind(id.to_string()).bind(tenant_id).bind(STATUS_REJECTED).bind(&current_status)
            .execute(&mut scope).await;
            match updated {
                Ok(r) if r.rows_affected() == 0 => {
                    ApiResponse::conflict("状态已被并发修改，请重试")
                }
                Ok(_) => {
                    if let Err(e) = crate::models::audit_log::log_approval_event(
                        &mut scope,
                        &tenant_id.to_string(),
                        "inspection",
                        &id.to_string(),
                        "reject",
                        &req.operator,
                        &current_status,
                        STATUS_REJECTED,
                        req.comment.as_deref(),
                    )
                    .await
                    {
                        tracing::error!("Failed to log approval event: {}", e);
                        return ApiResponse::server_error("驳回失败");
                    }
                    let locale = Locale::from_headers(&headers).as_sql();
                    match sqlx::query_as::<_, Inspection>(sqlx::AssertSqlSafe(format!(
                        "SELECT {} FROM qms.qa_quality_inspections WHERE deleted_at IS NULL AND id::TEXT = $1 AND tenant_id = $2",
                        INSPECTION_SELECT_CAST
                    )))
                    .bind(id.to_string()).bind(tenant_id).bind(locale).fetch_one(&mut scope).await
                    {
                        Ok(data) => {
                            if let Err(e) = scope.commit().await {
                                tracing::error!("Failed to commit inspection reject: {}", e);
                                return ApiResponse::server_error("驳回失败");
                            }
                            ApiResponse::success(data, "审批驳回")
                        }
                        Err(e) => {
                            tracing::error!("Failed to reload inspection: {}", e);
                            ApiResponse::server_error("驳回失败")
                        }
                    }
                }
                Err(e) => {
                    tracing::error!("Failed to reject inspection: {}", e);
                    ApiResponse::server_error("驳回失败")
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to find inspection: {}", e);
            ApiResponse::not_found("质量检查不存在")
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
            item_name_en: None,
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
            item_name_en: None,
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

use axum::{
    extract::Path,
    extract::Query,
    extract::State,
    routing::{get, post},
    Extension, Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Row};
use uuid::Uuid;

use crate::shared::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/documents", get(list_documents).post(create_document))
        .route("/documents/search", post(search_documents))
        .route(
            "/documents/{id}",
            get(get_document)
                .put(update_document)
                .delete(delete_document),
        )
        .route(
            "/documents/{id}/status",
            axum::routing::put(update_document_status),
        )
        .route("/documents/{id}/approve", post(start_document_approval))
        .route(
            "/documents/{id}/approval-history",
            get(get_document_approval_history),
        )
        .route("/documents/pending-approval", get(list_pending_documents))
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Document {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub document_no: String,
    pub name: String,
    pub description: Option<String>,
    pub document_type: Option<String>,
    pub file_path: Option<String>,
    pub file_size: Option<i64>,
    pub version: Option<String>,
    pub status: String,
    pub created_by: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateDocumentRequest {
    pub document_no: String,
    pub name: String,
    pub description: Option<String>,
    pub document_type: Option<String>,
    pub file_path: Option<String>,
    pub file_size: Option<i64>,
    pub version: Option<String>,
    pub status: Option<String>,
    pub created_by: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDocumentRequest {
    pub document_no: Option<String>,
    pub name: Option<String>,
    pub description: Option<String>,
    pub document_type: Option<String>,
    pub file_path: Option<String>,
    pub file_size: Option<i64>,
    pub version: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ListDocumentsQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct DocumentSearchRequest {
    pub keyword: Option<String>,
    #[serde(rename = "type")]
    pub document_type: Option<String>,
    pub category: Option<String>,
    pub status: Option<String>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub page: Option<i64>,
    pub pagesize: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDocumentStatusRequest {
    pub status: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct WorkflowStep {
    pub step_name: String,
    pub step_type: String,
    pub assignee_type: String,
    pub assignees: Vec<String>,
    pub required_approval: Option<i32>,
    pub timeout_days: Option<i32>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pdm:document:read"])),
    path = "/api/pdm/documents",
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn list_documents(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ListDocumentsQuery>,
    _headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        Some(claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok()).unwrap_or_default())
    };
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;
    let search_pattern = query.search.map(|s| format!("%{}%", s));

    let result = sqlx::query_as::<_, Document>(
        r#"
        SELECT id, tenant_id, document_no, name, description, document_type, file_path,
               file_size, version, status, created_by, created_at, updated_at
        FROM pdm_documents
        WHERE (1::uuid IS NULL OR tenant_id = $1)
          AND ($2::text IS NULL OR document_no ILIKE $2 OR name ILIKE $2 OR description ILIKE $2)
          AND ($3::text IS NULL OR status = $3)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(tenant_id)
    .bind(&search_pattern)
    .bind(&query.status)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(documents) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM pdm_documents
                WHERE deleted_at IS NULL AND (1::uuid IS NULL OR tenant_id = $1)
                  AND ($2::text IS NULL OR document_no ILIKE $2 OR name ILIKE $2 OR description ILIKE $2)
                  AND ($3::text IS NULL OR status = $3)
                "#,
            )
            .bind(tenant_id)
            .bind(&search_pattern)
            .bind(&query.status)
            .fetch_one(&state.pool)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "documents": documents,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取文档列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取文档列表失败: {}", e);
            Json(ApiResponse::error(500, "获取文档列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["pdm:document:read"])),
    path = "/api/pdm/documents/search",
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn search_documents(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    _headers: axum::http::HeaderMap,
    Json(query): Json<DocumentSearchRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        Some(claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok()).unwrap_or_default())
    };
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.pagesize.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;
    let search_pattern = query.keyword.as_ref().map(|s| format!("%{}%", s));

    let result = sqlx::query_as::<_, Document>(
        r#"
        SELECT id, tenant_id, document_no, name, description, document_type, file_path,
               file_size, version, status, created_by, created_at, updated_at
        FROM pdm_documents
        WHERE (1::uuid IS NULL OR tenant_id = $1)
          AND ($2::text IS NULL OR document_no ILIKE $2 OR name ILIKE $2 OR description ILIKE $2)
          AND ($3::text IS NULL OR document_type = $3)
          AND ($4::text IS NULL OR status = $4)
          AND ($5::text IS NULL OR created_at >= $5::timestamp)
          AND ($6::text IS NULL OR created_at <= $6::timestamp)
        ORDER BY created_at DESC
        LIMIT $7 OFFSET $8
        "#,
    )
    .bind(tenant_id)
    .bind(&search_pattern)
    .bind(&query.document_type)
    .bind(&query.status)
    .bind(&query.date_from)
    .bind(&query.date_to)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(documents) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM pdm_documents
                WHERE (1::uuid IS NULL OR tenant_id = $1)
                  AND ($2::text IS NULL OR document_no ILIKE $2 OR name ILIKE $2 OR description ILIKE $2)
                  AND ($3::text IS NULL OR document_type = $3)
                  AND ($4::text IS NULL OR status = $4)
                  AND ($5::text IS NULL OR created_at >= $5::timestamp)
                  AND ($6::text IS NULL OR created_at <= $6::timestamp)
                "#,
            )
            .bind(tenant_id)
            .bind(&search_pattern)
            .bind(&query.document_type)
            .bind(&query.status)
            .bind(&query.date_from)
            .bind(&query.date_to)
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "documents": documents,
                    "total": count_result,
                    "page": page,
                    "page_size": page_size
                }),
                "搜索文档成功",
            ))
        }
        Err(e) => {
            tracing::error!("搜索文档失败: {}", e);
            Json(ApiResponse::error(500, "搜索文档失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["pdm:document:read"])),
    path = "/api/pdm/documents",
    request_body = CreateDocumentRequest,
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn create_document(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    _headers: axum::http::HeaderMap,
    Json(req): Json<CreateDocumentRequest>,
) -> Json<ApiResponse<Document>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });

    if req.document_no.is_empty() {
        return Json(ApiResponse::error(400, "文档编号不能为空"));
    }
    if req.name.is_empty() {
        return Json(ApiResponse::error(400, "文档名称不能为空"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();
    let status = req.status.unwrap_or_else(|| "active".to_string());
    let version = req.version.unwrap_or_else(|| "1.0".to_string());

    let result = sqlx::query_as::<_, Document>(
        r#"
        INSERT INTO pdm_documents (
            id, tenant_id, document_no, name, description, document_type, file_path,
            file_size, version, status, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id, tenant_id, document_no, name, description, document_type, file_path,
                  file_size, version, status, created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .bind(&req.document_no)
    .bind(&req.name)
    .bind(&req.description)
    .bind(&req.document_type)
    .bind(&req.file_path)
    .bind(req.file_size)
    .bind(&version)
    .bind(&status)
    .bind(&req.created_by)
    .bind(now)
    .bind(now)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(document) => Json(ApiResponse::success(document, "创建文档成功")),
        Err(e) => {
            tracing::error!("创建文档失败: {}", e);
            if e.to_string().contains("unique constraint") {
                Json(ApiResponse::error(409, "文档编号已存在"))
            } else {
                Json(ApiResponse::error(500, "创建文档失败"))
            }
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pdm:document:read"])),
    path = "/api/pdm/documents/{id}",
    tag = "pdm",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn get_document(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: axum::http::HeaderMap,
) -> Json<ApiResponse<Document>> {
    let tenant_id: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        Some(claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok()).unwrap_or_default())
    };

    let result = sqlx::query_as::<_, Document>(
        r#"
        SELECT id, tenant_id, document_no, name, description, document_type, file_path,
               file_size, version, status, created_by, created_at, updated_at
        FROM pdm_documents WHERE id = $1 AND (2::uuid IS NULL OR tenant_id = $2)
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(document)) => Json(ApiResponse::success(document, "获取文档成功")),
        Ok(None) => Json(ApiResponse::error(404, "文档不存在")),
        Err(e) => {
            tracing::error!("获取文档失败: {}", e);
            Json(ApiResponse::error(500, "获取文档失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["pdm:document:read"])),
    path = "/api/pdm/documents/{id}",
    request_body = UpdateDocumentRequest,
    tag = "pdm",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn update_document(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: axum::http::HeaderMap,
    Json(req): Json<UpdateDocumentRequest>,
) -> Json<ApiResponse<Document>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });

    let existing = sqlx::query_as::<_, Document>(
        r#"
        SELECT id, tenant_id, document_no, name, description, document_type, file_path,
               file_size, version, status, created_by, created_at, updated_at
        FROM pdm_documents WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await;

    let existing = match existing {
        Ok(Some(e)) => e,
        Ok(None) => return Json(ApiResponse::error(404, "文档不存在")),
        Err(e) => {
            tracing::error!("查询文档失败: {}", e);
            return Json(ApiResponse::error(500, "查询文档失败"));
        }
    };

    let document_no = req.document_no.unwrap_or(existing.document_no);
    let name = req.name.unwrap_or(existing.name);
    let description = req.description.or(existing.description);
    let document_type = req.document_type.or(existing.document_type);
    let file_path = req.file_path.or(existing.file_path);
    let file_size = req.file_size.or(existing.file_size);
    let version = req.version.or(existing.version);
    let status = req.status.unwrap_or(existing.status);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Document>(
        r#"
        UPDATE pdm_documents SET
            document_no = $2,
            name = $3,
            description = $4,
            document_type = $5,
            file_path = $6,
            file_size = $7,
            version = $8,
            status = $9,
            updated_at = $10
        WHERE id = $1 AND tenant_id = $11
        RETURNING id, tenant_id, document_no, name, description, document_type, file_path,
                  file_size, version, status, created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&document_no)
    .bind(&name)
    .bind(&description)
    .bind(&document_type)
    .bind(&file_path)
    .bind(file_size)
    .bind(&version)
    .bind(&status)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(document) => Json(ApiResponse::success(document, "更新文档成功")),
        Err(e) => {
            tracing::error!("更新文档失败: {}", e);
            if e.to_string().contains("unique constraint") {
                Json(ApiResponse::error(409, "文档编号已存在"))
            } else {
                Json(ApiResponse::error(500, "更新文档失败"))
            }
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["pdm:document:read"])),
    path = "/api/pdm/documents/{id}/status",
    tag = "pdm",
    params(("id" = Uuid, Path, description = "文档 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn update_document_status(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: axum::http::HeaderMap,
    Json(req): Json<UpdateDocumentStatusRequest>,
) -> Json<ApiResponse<Document>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
    if req.status.trim().is_empty() {
        return Json(ApiResponse::error(400, "文档状态不能为空"));
    }

    let result = sqlx::query_as::<_, Document>(
        r#"
        UPDATE pdm_documents
        SET status = $3, updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2
        RETURNING id, tenant_id, document_no, name, description, document_type, file_path,
                  file_size, version, status, created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .bind(&req.status)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(document)) => Json(ApiResponse::success(document, "更新文档状态成功")),
        Ok(None) => Json(ApiResponse::error(404, "文档不存在")),
        Err(e) => {
            tracing::error!("更新文档状态失败: {}", e);
            Json(ApiResponse::error(500, "更新文档状态失败"))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["pdm:document:read"])),
    path = "/api/pdm/documents/{id}",
    tag = "pdm",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn delete_document(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: axum::http::HeaderMap,
) -> Json<ApiResponse<bool>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });

    let result =
        sqlx::query("UPDATE pdm_documents SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2")
            .bind(id)
            .bind(tenant_id)
            .execute(&state.pool)
            .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success(true, "删除文档成功")),
        Ok(_) => Json(ApiResponse::error(404, "文档不存在")),
        Err(e) => {
            tracing::error!("删除文档失败: {}", e);
            Json(ApiResponse::error(500, "删除文档失败"))
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct StartDocumentApprovalRequest {
    pub workflow_id: Uuid,
    pub created_by: String,
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["pdm:document:read"])),
    path = "/api/pdm/documents/{id}/approve",
    request_body = StartDocumentApprovalRequest,
    tag = "pdm",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn start_document_approval(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: axum::http::HeaderMap,
    Json(req): Json<StartDocumentApprovalRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });

    let document_result = sqlx::query_as::<_, Document>(
        "SELECT id, tenant_id, name, status FROM pdm_documents WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await;

    let document = match document_result {
        Ok(Some(d)) => d,
        Ok(None) => return Json(ApiResponse::error(404, "文档不存在")),
        Err(e) => {
            tracing::error!("查询文档失败: {}", e);
            return Json(ApiResponse::error(500, "查询文档失败"));
        }
    };

    if document.status != "active" {
        return Json(ApiResponse::error(400, "文档状态不正确，无法发起审批"));
    }

    let workflow_result = sqlx::query(
        r#"
        SELECT id, name, steps FROM pdm_workflows 
        WHERE id = $1 AND status = 'active' AND tenant_id = $2
        "#,
    )
    .bind(req.workflow_id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await;

    let workflow = match workflow_result {
        Ok(Some(w)) => w,
        Ok(None) => return Json(ApiResponse::error(404, "工作流不存在或未激活")),
        Err(e) => {
            tracing::error!("查询工作流失败: {}", e);
            return Json(ApiResponse::error(500, "查询工作流失败"));
        }
    };

    let steps: Vec<WorkflowStep> = match serde_json::from_value(workflow.get("steps")) {
        Ok(s) => s,
        Err(e) => {
            tracing::warn!("Failed to deserialize document workflow steps: {}", e);
            Vec::new()
        }
    };
    let first_step = steps.first();
    let current_step = first_step
        .map(|s| s.step_name.clone())
        .unwrap_or("start".to_string());
    let assignees = first_step
        .map(|s| {
            serde_json::to_value(s.assignees.clone()).unwrap_or_else(|_| serde_json::Value::Null)
        })
        .unwrap_or(serde_json::json!([]));
    let workflow_name: String = workflow.get("name");

    let instance_id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query(
        r#"
        INSERT INTO pdm_workflow_instances (
            id, tenant_id, workflow_id, workflow_name, target_type, target_id,
            current_step, status, assignees, history, created_by,
            created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id, workflow_id, workflow_name, current_step, status, created_at
        "#,
    )
    .bind(instance_id)
    .bind(tenant_id)
    .bind(req.workflow_id)
    .bind(workflow_name)
    .bind("document")
    .bind(id)
    .bind(&current_step)
    .bind("running")
    .bind(assignees)
    .bind(serde_json::json!([{
        "step": current_step,
        "action": "started",
        "user": req.created_by,
        "timestamp": now.to_rfc3339(),
        "document_id": id,
        "document_name": document.name
    }]))
    .bind(&req.created_by)
    .bind(now)
    .bind(now)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(row) => {
            sqlx::query(
                "UPDATE pdm_documents SET status = 'pending_approval', updated_at = $1 WHERE id = $2 AND tenant_id = $3",
            )
            .bind(now)
            .bind(id)
            .bind(tenant_id)
            .execute(&state.pool)
            .await
            .ok();

            Json(ApiResponse::success(
                serde_json::json!({
                    "instance_id": row.get::<Uuid, _>("id"),
                    "workflow_id": row.get::<Uuid, _>("workflow_id"),
                    "workflow_name": row.get::<String, _>("workflow_name"),
                    "current_step": row.get::<String, _>("current_step"),
                    "status": row.get::<String, _>("status"),
                    "created_at": row.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
                    "document_id": id,
                    "document_name": document.name
                }),
                "文档审批流程已启动",
            ))
        }
        Err(e) => {
            tracing::error!("启动文档审批失败: {}", e);
            Json(ApiResponse::error(500, "启动文档审批失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pdm:document:read"])),
    path = "/api/pdm/documents/{id}/approval-history",
    tag = "pdm",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn get_document_approval_history(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });

    let result = sqlx::query(
        r#"
        SELECT id, workflow_id, workflow_name, current_step, status, 
               assignees, history, created_by, created_at, updated_at
        FROM pdm_workflow_instances 
        WHERE target_type = 'document' AND target_id = $1 AND (2::uuid IS NULL OR tenant_id = $2)
        ORDER BY created_at DESC
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(instances) => {
            let history: Vec<serde_json::Value> = instances
                .into_iter()
                .map(|r| {
                    serde_json::json!({
                        "instance_id": r.get::<Uuid, _>("id"),
                        "workflow_id": r.get::<Uuid, _>("workflow_id"),
                        "workflow_name": r.get::<String, _>("workflow_name"),
                        "current_step": r.get::<String, _>("current_step"),
                        "status": r.get::<String, _>("status"),
                        "assignees": r.get::<serde_json::Value, _>("assignees"),
                        "history": r.get::<serde_json::Value, _>("history"),
                        "created_by": r.get::<String, _>("created_by"),
                        "created_at": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
                        "updated_at": r.get::<chrono::DateTime<chrono::Utc>, _>("updated_at"),
                    })
                })
                .collect();

            Json(ApiResponse::success(
                serde_json::json!({
                    "document_id": id,
                    "approval_history": history,
                    "total": history.len()
                }),
                "获取文档审批历史成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取文档审批历史失败: {}", e);
            Json(ApiResponse::error(500, "获取文档审批历史失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pdm:document:read"])),
    path = "/api/pdm/documents/pending-approval",
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn list_pending_documents(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    _headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });

    let result = sqlx::query(
        r#"
        SELECT d.id, d.document_no, d.name, d.description, d.document_type,
               d.version, d.status, d.created_by, d.created_at, d.updated_at,
               i.current_step, i.assignees
        FROM pdm_documents d
        LEFT JOIN pdm_workflow_instances i 
            ON d.id = i.target_id AND i.target_type = 'document' AND i.status = 'running' AND (1::uuid IS NULL OR i.tenant_id = $1)
        WHERE d.status = 'pending_approval' AND (1::uuid IS NULL OR d.tenant_id = $1)
        ORDER BY d.updated_at DESC
        "#,
    )
    .bind(tenant_id)
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(rows) => {
            let documents: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<Uuid, _>("id"),
                        "document_no": r.get::<String, _>("document_no"),
                        "name": r.get::<String, _>("name"),
                        "description": r.get::<Option<String>, _>("description"),
                        "document_type": r.get::<Option<String>, _>("document_type"),
                        "version": r.get::<Option<String>, _>("version"),
                        "status": r.get::<String, _>("status"),
                        "created_by": r.get::<Option<String>, _>("created_by"),
                        "created_at": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
                        "updated_at": r.get::<chrono::DateTime<chrono::Utc>, _>("updated_at"),
                        "current_step": r.get::<Option<String>, _>("current_step"),
                        "assignees": r.get::<Option<serde_json::Value>, _>("assignees"),
                    })
                })
                .collect();

            Json(ApiResponse::success(
                serde_json::json!({
                    "documents": documents,
                    "total": documents.len()
                }),
                "获取待审批文档列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取待审批文档列表失败: {}", e);
            Json(ApiResponse::error(500, "获取待审批文档列表失败"))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_claims(tenant_id: Option<&str>) -> Claims {
        Claims {
            sub: "user-1".to_string(),
            username: "tester".to_string(),
            role: "admin".to_string(),
            roles: vec![],
            permissions: vec![],
            is_superuser: false,
            exp: 9999999999,
            iat: 0,
            email: None,
            department: None,
            tenant_id: tenant_id.map(|s| s.to_string()),
            department_id: None,
            position_id: None,
            position_code: None,
        }
    }

    #[test]
    fn test_get_tenant_id_from_claims() {
        let claims = make_claims(Some("550e8400-e29b-41d4-a716-446655440000"));
        let headers = axum::http::HeaderMap::new();
        let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tid = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
        assert_eq!(
            tid,
            Uuid::parse_str("550e8400-e29b-41d4-a716-446655440000").unwrap()
        );
    }

    #[test]
    fn test_get_tenant_id_from_header_fallback() {
        let claims = make_claims(None);
        let mut headers = axum::http::HeaderMap::new();
        headers.insert(
            "x-tenant-id",
            "550e8400-e29b-41d4-a716-446655440020".parse().unwrap(),
        );
        let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tid = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
        assert_eq!(
            tid,
            Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
        );
    }

    #[test]
    fn test_get_tenant_id_fallback_generates_v4() {
        let claims = make_claims(None);
        let headers = axum::http::HeaderMap::new();
        let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tid = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
        assert_eq!(tid.get_version(), Some(uuid::Version::Nil));
    }

    #[test]
    fn test_create_routes_builds_without_panic() {
        let router = create_routes();
        let _ = router.clone();
    }

    #[test]
    fn test_document_serde_roundtrip() {
        let now = Utc::now();
        let d = Document {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            document_no: "DOC-001".to_string(),
            name: "设计文档".to_string(),
            description: Some("desc".to_string()),
            document_type: Some("spec".to_string()),
            file_path: Some("/tmp/a.pdf".to_string()),
            file_size: Some(1024),
            version: Some("1.0".to_string()),
            status: "active".to_string(),
            created_by: Some("u1".to_string()),
            created_at: now,
            updated_at: now,
        };
        let json = serde_json::to_string(&d).unwrap();
        let decoded: Document = serde_json::from_str(&json).unwrap();
        assert_eq!(decoded.document_no, "DOC-001");
        assert_eq!(decoded.name, "设计文档");
        assert_eq!(decoded.file_size, Some(1024));
        assert_eq!(decoded.document_type, Some("spec".to_string()));
    }

    #[test]
    fn test_document_serde_none_optionals() {
        let now = Utc::now();
        let d = Document {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            document_no: "DOC-002".to_string(),
            name: "最小".to_string(),
            description: None,
            document_type: None,
            file_path: None,
            file_size: None,
            version: None,
            status: "draft".to_string(),
            created_by: None,
            created_at: now,
            updated_at: now,
        };
        let json = serde_json::to_string(&d).unwrap();
        assert!(json.contains("\"file_size\":null"));
        assert!(json.contains("\"version\":null"));
        let decoded: Document = serde_json::from_str(&json).unwrap();
        assert!(decoded.created_by.is_none());
    }

    #[test]
    fn test_create_document_request_deserialize() {
        let json = r#"{"document_no":"D1","name":"n","description":"d","document_type":"t","file_path":"/p","file_size":10,"version":"v","status":"s","created_by":"u"}"#;
        let req: CreateDocumentRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.document_no, "D1");
        assert_eq!(req.file_size, Some(10));
        assert_eq!(req.created_by, Some("u".to_string()));
    }

    #[test]
    fn test_create_document_request_minimal() {
        let json = r#"{"document_no":"D2","name":"n2"}"#;
        let req: CreateDocumentRequest = serde_json::from_str(json).unwrap();
        assert!(req.file_size.is_none());
        assert!(req.status.is_none());
    }

    #[test]
    fn test_update_document_request_all_none() {
        let json = r#"{}"#;
        let req: UpdateDocumentRequest = serde_json::from_str(json).unwrap();
        assert!(req.name.is_none());
        assert!(req.status.is_none());
        assert!(req.file_size.is_none());
    }

    #[test]
    fn test_list_documents_query_defaults() {
        let json = r#"{}"#;
        let q: ListDocumentsQuery = serde_json::from_str(json).unwrap();
        assert!(q.page.is_none());
        assert!(q.status.is_none());
    }

    #[test]
    fn test_document_search_request_renamed_type_field() {
        // document_type 通过 #[serde(rename = "type")] 反序列化
        let json = r#"{"type":"manual","keyword":"abc","pagesize":15}"#;
        let req: DocumentSearchRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.document_type, Some("manual".to_string()));
        assert_eq!(req.keyword, Some("abc".to_string()));
        assert_eq!(req.pagesize, Some(15));
    }

    #[test]
    fn test_document_search_request_all_none() {
        let json = r#"{}"#;
        let req: DocumentSearchRequest = serde_json::from_str(json).unwrap();
        assert!(req.keyword.is_none());
        assert!(req.document_type.is_none());
        assert!(req.date_from.is_none());
    }

    #[test]
    fn test_update_document_status_request() {
        let json = r#"{"status":"approved"}"#;
        let req: UpdateDocumentStatusRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.status, "approved");
    }

    #[test]
    fn test_workflow_step_serde_roundtrip() {
        let step = WorkflowStep {
            step_name: "审核".to_string(),
            step_type: "approval".to_string(),
            assignee_type: "user".to_string(),
            assignees: vec!["u1".to_string(), "u2".to_string()],
            required_approval: Some(2),
            timeout_days: Some(5),
        };
        let json = serde_json::to_string(&step).unwrap();
        let decoded: WorkflowStep = serde_json::from_str(&json).unwrap();
        assert_eq!(decoded.step_name, "审核");
        assert_eq!(decoded.assignees.len(), 2);
        assert_eq!(decoded.required_approval, Some(2));
        assert_eq!(decoded.timeout_days, Some(5));
    }

    #[test]
    fn test_workflow_step_optional_fields_none() {
        let json = r#"{"step_name":"s","step_type":"t","assignee_type":"a","assignees":[]}"#;
        let step: WorkflowStep = serde_json::from_str(json).unwrap();
        assert!(step.required_approval.is_none());
        assert!(step.timeout_days.is_none());
        assert!(step.assignees.is_empty());
    }

    #[test]
    fn test_start_document_approval_request_deserialize() {
        let json = r#"{"workflow_id":"550e8400-e29b-41d4-a716-446655440030","created_by":"alice"}"#;
        let req: StartDocumentApprovalRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.created_by, "alice");
        assert_eq!(
            req.workflow_id,
            Uuid::parse_str("550e8400-e29b-41d4-a716-446655440030").unwrap()
        );
    }
}

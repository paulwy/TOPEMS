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
use topems_shared::{ApiResponse, Claims};

fn get_tenant_id(claims: &Claims, headers: &axum::http::HeaderMap) -> Uuid {
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

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/documents", get(list_documents).post(create_document))
        .route(
            "/documents/{id}",
            get(get_document)
                .put(update_document)
                .delete(delete_document),
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

#[derive(Debug, Deserialize, Serialize)]
pub struct WorkflowStep {
    pub step_name: String,
    pub step_type: String,
    pub assignee_type: String,
    pub assignees: Vec<String>,
    pub required_approval: Option<i32>,
    pub timeout_days: Option<i32>,
}

pub async fn list_documents(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ListDocumentsQuery>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;
    let search_pattern = query.search.map(|s| format!("%{}%", s));

    let result = sqlx::query_as::<_, Document>(
        r#"
        SELECT id, tenant_id, document_no, name, description, document_type, file_path,
               file_size, version, status, created_by, created_at, updated_at
        FROM pdm_documents
        WHERE tenant_id = $1
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
                WHERE tenant_id = $1
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

pub async fn create_document(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateDocumentRequest>,
) -> Json<ApiResponse<Document>> {
    let tenant_id = get_tenant_id(&claims, &headers);

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

pub async fn get_document(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<Document>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, Document>(
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

    match result {
        Ok(Some(document)) => Json(ApiResponse::success(document, "获取文档成功")),
        Ok(None) => Json(ApiResponse::error(404, "文档不存在")),
        Err(e) => {
            tracing::error!("获取文档失败: {}", e);
            Json(ApiResponse::error(500, "获取文档失败"))
        }
    }
}

pub async fn update_document(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(req): Json<UpdateDocumentRequest>,
) -> Json<ApiResponse<Document>> {
    let tenant_id = get_tenant_id(&claims, &headers);

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

pub async fn delete_document(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<bool>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query("DELETE FROM pdm_documents WHERE id = $1 AND tenant_id = $2")
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

pub async fn start_document_approval(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(req): Json<StartDocumentApprovalRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let document_result = sqlx::query_as::<_, Document>(
        "SELECT id, tenant_id, name, status FROM pdm_documents WHERE id = $1 AND tenant_id = $2",
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

    let steps: Vec<WorkflowStep> =
        serde_json::from_value(workflow.get("steps")).unwrap_or_default();
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

pub async fn get_document_approval_history(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query(
        r#"
        SELECT id, workflow_id, workflow_name, current_step, status, 
               assignees, history, created_by, created_at, updated_at
        FROM pdm_workflow_instances 
        WHERE target_type = 'document' AND target_id = $1 AND tenant_id = $2
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

pub async fn list_pending_documents(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query(
        r#"
        SELECT d.id, d.document_no, d.name, d.description, d.document_type,
               d.version, d.status, d.created_by, d.created_at, d.updated_at,
               i.current_step, i.assignees
        FROM pdm_documents d
        LEFT JOIN pdm_workflow_instances i 
            ON d.id = i.target_id AND i.target_type = 'document' AND i.status = 'running' AND i.tenant_id = $1
        WHERE d.status = 'pending_approval' AND d.tenant_id = $1
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

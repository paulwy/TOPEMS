use axum::{extract::State, routing::get, Extension, Json, Router};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, Row};
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_auth::middleware::tenant::TenantContext;
use topems_shared_core::response::ApiResponse;

use crate::shared::AppState;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/records", get(list_records).post(create_record))
        .route("/records/{id}", get(get_record).delete(delete_record))
        .route("/records/task/{task_id}", get(list_records_by_task))
}

#[derive(Debug, Deserialize)]
pub struct RecordQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub task_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct InspectionRecord {
    pub id: String,
    pub tenant_id: String,
    pub record_no: String,
    pub task_id: String,
    pub task_no: Option<String>,
    pub test_data: serde_json::Value,
    pub conclusion: String,
    pub recorded_by: String,
    pub recorded_at: DateTime<Utc>,
    pub created_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct CreateRecordRequest {
    pub task_id: String,
    pub test_data: serde_json::Value,
    pub conclusion: String,
    pub recorded_by: String,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["lims:inspection_record:read"])),
    path = "/records",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "inspection_record"
)]
pub async fn list_records(
    State(state): State<crate::shared::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    axum::extract::Query(query): axum::extract::Query<RecordQuery>,
) -> ApiResponse<Vec<InspectionRecord>> {
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[lims] 获取检测记录列表读作用域创建失败: {}", e);
            return ApiResponse::server_error("获取检测记录列表失败");
        }
    };

    let rows = match query.task_id.as_ref() {
        Some(tid) => {
            let tid = match Uuid::parse_str(tid) {
                Ok(u) => u,
                Err(_) => return ApiResponse::bad_request("无效的任务ID"),
            };
            sqlx::query(
                "SELECT r.id::TEXT, r.record_no, r.task_id::TEXT, t.task_no, r.test_data, r.conclusion, r.recorded_by, r.recorded_at, r.created_at, r.tenant_id::TEXT FROM lims.qa_lab_records r LEFT JOIN public.qa_lab_tasks t ON r.task_id = t.id WHERE r.deleted_at IS NULL AND r.task_id = $1 ORDER BY r.created_at DESC LIMIT $2 OFFSET $3"
            )
            .bind(tid)
            .bind(page_size)
            .bind(offset)
            .fetch_all(&mut scope)
            .await
        }
        None => sqlx::query(
            "SELECT r.id::TEXT, r.record_no, r.task_id::TEXT, t.task_no, r.test_data, r.conclusion, r.recorded_by, r.recorded_at, r.created_at, r.tenant_id::TEXT FROM lims.qa_lab_records r LEFT JOIN public.qa_lab_tasks t ON r.task_id = t.id WHERE r.deleted_at IS NULL ORDER BY r.created_at DESC LIMIT $1 OFFSET $2"
        )
        .bind(page_size)
        .bind(offset)
        .fetch_all(&mut scope)
        .await,
    };

    let _ = scope.commit().await;

    match rows {
        Ok(data) => {
            let records = data
                .into_iter()
                .map(|row| InspectionRecord {
                    id: row.get("id"),
                    tenant_id: row.get("tenant_id"),
                    record_no: row.get("record_no"),
                    task_id: row.get("task_id"),
                    task_no: row.get("task_no"),
                    test_data: row.get("test_data"),
                    conclusion: row.get("conclusion"),
                    recorded_by: row.get("recorded_by"),
                    recorded_at: row.get("recorded_at"),
                    created_at: row.get("created_at"),
                })
                .collect();
            ApiResponse::success(records, "获取检测记录列表成功")
        }
        Err(e) => {
            tracing::error!("Failed to fetch records: {}", e);
            ApiResponse::server_error("获取检测记录列表失败")
        }
    }
}

#[utoipa::path(

    post,

    security(("BearerAuth" = [])),

    path = "/api/lims/records",

    responses(

        (status = 200, description = "OK", body = serde_json::Value),

        (status = 500, description = "Internal server error")

    ),

    tag = "LIMS"

)]

pub async fn create_record(
    State(state): State<crate::shared::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(ctx): Extension<TenantContext>,
    Json(req): Json<CreateRecordRequest>,
) -> ApiResponse<InspectionRecord> {
    let record_no = format!(
        "REC-{}",
        uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
    );

    let task_id = match Uuid::parse_str(&req.task_id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的任务ID"),
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[lims] 检测记录创建写作用域创建失败: {}", e);
            return ApiResponse::server_error("检测记录创建失败");
        }
    };

    let row = sqlx::query(
        "INSERT INTO lims.qa_lab_records (record_no, task_id, test_data, conclusion, recorded_by, recorded_at, tenant_id) VALUES ($1, $2, $3, $4, $5, NOW(), $6) RETURNING id::TEXT, record_no, task_id::TEXT, test_data, conclusion, recorded_by, recorded_at, created_at, tenant_id::TEXT"
    )
    .bind(record_no)
    .bind(task_id)
    .bind(req.test_data)
    .bind(&req.conclusion)
    .bind(&req.recorded_by)
    .bind(ctx.tenant_id)
    .fetch_one(&mut scope)
    .await;

    match row {
        Ok(r) => {
            let task_no = sqlx::query("SELECT task_no FROM public.qa_lab_tasks WHERE id = $1")
                .bind(task_id)
                .fetch_optional(&mut scope)
                .await
                .ok()
                .flatten()
                .map(|r| r.get::<String, _>("task_no"));
            if let Err(e) = scope.commit().await {
                tracing::error!("[lims] 检测记录创建事务提交失败: {}", e);
                return ApiResponse::server_error("检测记录创建失败");
            }
            ApiResponse::success(
                InspectionRecord {
                    id: r.get("id"),
                    tenant_id: r.get("tenant_id"),
                    record_no: r.get("record_no"),
                    task_id: r.get("task_id"),
                    task_no,
                    test_data: r.get("test_data"),
                    conclusion: r.get("conclusion"),
                    recorded_by: r.get("recorded_by"),
                    recorded_at: r.get("recorded_at"),
                    created_at: r.get("created_at"),
                },
                "检测记录创建成功",
            )
        }
        Err(e) => {
            tracing::error!("Failed to create record: {}", e);
            ApiResponse::server_error("检测记录创建失败")
        }
    }
}

/// 按检测任务查询检测记录列表
#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/api/lims/records/task/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "LIMS"
)]
pub async fn list_records_by_task(
    State(state): State<crate::shared::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    axum::extract::Path(task_id): axum::extract::Path<String>,
) -> ApiResponse<Vec<InspectionRecord>> {
    let task_id = match Uuid::parse_str(&task_id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的任务ID"),
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[lims] 获取任务检测记录读作用域创建失败: {}", e);
            return ApiResponse::server_error("获取任务检测记录失败");
        }
    };

    let rows = sqlx::query(
        "SELECT r.id::TEXT, r.tenant_id::TEXT, r.record_no, r.task_id::TEXT, t.task_no, r.test_data, r.conclusion, r.recorded_by, r.recorded_at, r.created_at, r.tenant_id::TEXT FROM lims.qa_lab_records r LEFT JOIN public.qa_lab_tasks t ON r.task_id = t.id WHERE r.deleted_at IS NULL AND r.task_id = $1 ORDER BY r.created_at DESC"
    )
    .bind(task_id)
    .fetch_all(&mut scope)
    .await;

    let _ = scope.commit().await;

    match rows {
        Ok(rows) => ApiResponse::success(
            rows.iter()
                .map(|r| InspectionRecord {
                    id: r.get("id"),
                    tenant_id: r.get("tenant_id"),
                    record_no: r.get("record_no"),
                    task_id: r.get("task_id"),
                    task_no: r.get("task_no"),
                    test_data: r.get("test_data"),
                    conclusion: r.get("conclusion"),
                    recorded_by: r.get("recorded_by"),
                    recorded_at: r.get("recorded_at"),
                    created_at: r.get("created_at"),
                })
                .collect(),
            "获取任务检测记录成功",
        ),
        Err(e) => {
            tracing::error!("获取任务检测记录失败: {}", e);
            ApiResponse::server_error("获取任务检测记录失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["lims:inspection_record:read"])),
    path = "/records/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "inspection_record"
)]
pub async fn get_record(
    State(state): State<crate::shared::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<InspectionRecord> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的记录ID"),
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[lims] 获取检测记录读作用域创建失败: {}", e);
            return ApiResponse::server_error("获取检测记录失败");
        }
    };

    let row = sqlx::query(
        "SELECT r.id::TEXT, r.record_no, r.task_id::TEXT, t.task_no, r.test_data, r.conclusion, r.recorded_by, r.recorded_at, r.created_at, r.tenant_id::TEXT FROM lims.qa_lab_records r LEFT JOIN public.qa_lab_tasks t ON r.task_id = t.id WHERE r.deleted_at IS NULL AND r.id = $1"
    )
    .bind(id)
    .fetch_one(&mut scope)
    .await;

    let _ = scope.commit().await;

    match row {
        Ok(r) => ApiResponse::success(
            InspectionRecord {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                record_no: r.get("record_no"),
                task_id: r.get("task_id"),
                task_no: r.get("task_no"),
                test_data: r.get("test_data"),
                conclusion: r.get("conclusion"),
                recorded_by: r.get("recorded_by"),
                recorded_at: r.get("recorded_at"),
                created_at: r.get("created_at"),
            },
            "获取检测记录成功",
        ),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("记录不存在"),

        Err(e) => {
            tracing::error!("Failed to fetch record: {}", e);
            ApiResponse::server_error("获取检测记录失败")
        }
    }
}

#[utoipa::path(

    delete,

    security(("BearerAuth" = [])),

    path = "/api/lims/records/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses(

        (status = 200, description = "OK", body = serde_json::Value),

        (status = 500, description = "Internal server error")

    ),

    tag = "LIMS"

)]

pub async fn delete_record(
    State(state): State<crate::shared::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<bool> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的记录ID"),
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[lims] 检测记录删除写作用域创建失败: {}", e);
            return ApiResponse::server_error("检测记录删除失败");
        }
    };

    let result = sqlx::query("UPDATE lims.qa_lab_records SET deleted_at = NOW() WHERE id = $1")
        .bind(id)
        .execute(&mut scope)
        .await;

    match result {
        Ok(_) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("[lims] 检测记录删除事务提交失败: {}", e);
                return ApiResponse::server_error("检测记录删除失败");
            }
            ApiResponse::success(true, "检测记录删除成功")
        }
        Err(e) => {
            tracing::error!("Failed to delete record: {}", e);
            ApiResponse::server_error("检测记录删除失败")
        }
    }
}

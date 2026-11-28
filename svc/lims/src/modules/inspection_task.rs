use axum::{
    extract::State,
    routing::{get, post},
    Extension, Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, Row};
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_auth::middleware::tenant::TenantContext;
use topems_shared_core::response::ApiResponse;
use topems_shared_event::event::{commit_retry, CacheInvalidatedPayload, EventType};
use utoipa::ToSchema;

use crate::shared::AppState;

const TASK_SELECT_COLS: &str = "id::TEXT, tenant_id::TEXT, task_no, sample_id::TEXT, sample_no, test_items, status, assigned_to, instrument_id::TEXT, planned_date::TEXT, actual_start_date::TEXT, actual_end_date::TEXT, result, conclusion, recorded_by, created_at, updated_at";

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/tasks", get(list_tasks).post(create_task))
        .route(
            "/tasks/{id}",
            get(get_task).put(update_task).delete(delete_task),
        )
        .route("/tasks/{id}/result", post(submit_result))
        .route("/tasks/sample/{sample_id}", get(list_tasks_by_sample))
        .route("/tasks/{id}/complete_step", post(complete_step))
}

/// 任务详情缓存 key（含 tenant_id）
fn task_detail_key(tenant_id: &Option<Uuid>, id: &str) -> String {
    format!(
        "lims:task:{}:{}",
        tenant_id.map_or("all".to_string(), |t| t.to_string()),
        id
    )
}

/// 任务列表缓存 key（含 tenant_id）
fn task_list_key(tenant_id: &Option<Uuid>) -> String {
    format!(
        "lims:task:list:{}",
        tenant_id.map_or("all".to_string(), |t| t.to_string())
    )
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct InspectionTask {
    pub id: String,
    pub tenant_id: String,
    pub task_no: String,
    pub sample_id: String,
    pub sample_no: String,
    pub test_items: serde_json::Value,
    pub status: String,
    pub assigned_to: Option<String>,
    pub instrument_id: Option<String>,
    pub planned_date: Option<String>,
    pub actual_start_date: Option<String>,
    pub actual_end_date: Option<String>,
    pub result: Option<serde_json::Value>,
    pub conclusion: Option<String>,
    pub recorded_by: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateTaskRequest {
    pub sample_id: String,
    pub test_items: Vec<String>,
    pub assigned_to: Option<String>,
    pub instrument_id: Option<String>,
    pub planned_date: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTaskRequest {
    pub status: Option<String>,
    pub assigned_to: Option<String>,
    pub instrument_id: Option<String>,
    pub actual_start_date: Option<String>,
    pub actual_end_date: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SubmitResultRequest {
    pub result: serde_json::Value,
    pub conclusion: String,
    pub recorded_by: String,
}

#[derive(Debug, Deserialize)]
pub struct CompleteStepRequest {
    pub step_id: String,
    pub step_name: String,
    pub result: String,
    pub conclusion: String,
    pub inspector: String,
}

fn task_from_row(row: &sqlx::postgres::PgRow) -> InspectionTask {
    InspectionTask {
        id: row.get("id"),
        tenant_id: row.get("tenant_id"),
        task_no: row.get("task_no"),
        sample_id: row.get("sample_id"),
        sample_no: row.get("sample_no"),
        test_items: row.get("test_items"),
        status: row.get("status"),
        assigned_to: row.get("assigned_to"),
        instrument_id: row.get("instrument_id"),
        planned_date: row.get("planned_date"),
        actual_start_date: row.get("actual_start_date"),
        actual_end_date: row.get("actual_end_date"),
        result: row.get("result"),
        conclusion: row.get("conclusion"),
        recorded_by: row.get("recorded_by"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["lims:inspection_task:read"])),
    path = "/tasks/sample/{sample_id}",
    params(
("sample_id" = String, Path, description = "sample_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "inspection_task"
)]
pub async fn list_tasks_by_sample(
    State(state): State<crate::shared::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(_ctx): Extension<TenantContext>,
    Extension(_claims): Extension<Claims>,
    axum::extract::Path(sample_id): axum::extract::Path<String>,
) -> ApiResponse<Vec<InspectionTask>> {
    let sample_uuid = match Uuid::parse_str(&sample_id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的样品ID"),
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
            tracing::error!("[lims] 获取样品检测任务读作用域创建失败: {}", e);
            return ApiResponse::server_error("获取样品检测任务失败");
        }
    };

    let rows = sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT {} FROM public.qa_lab_tasks WHERE deleted_at IS NULL AND sample_id = $1 ORDER BY created_at DESC",
        TASK_SELECT_COLS
    )))
    .bind(sample_uuid)
    .fetch_all(&mut scope)
    .await;

    let _ = scope.commit().await;

    match rows {
        Ok(data) => {
            let tasks = data.iter().map(task_from_row).collect::<Vec<_>>();
            ApiResponse::success(tasks, "获取样品检测任务成功")
        }
        Err(e) => {
            tracing::error!("Failed to list tasks by sample: {}", e);
            ApiResponse::server_error("获取样品检测任务失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["lims:inspection_task:write"])),
    path = "/tasks/{id}/complete_step",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "inspection_task"
)]
pub async fn complete_step(
    State(state): State<crate::shared::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(ctx): Extension<TenantContext>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<CompleteStepRequest>,
) -> ApiResponse<InspectionTask> {
    let task_uuid = match Uuid::parse_str(&id) {
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
            tracing::error!("[lims] 步骤记录写作用域创建失败: {}", e);
            return ApiResponse::server_error("步骤记录写入失败");
        }
    };

    // 校验任务存在
    let task_row = sqlx::query(
        "SELECT task_no FROM public.qa_lab_tasks WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2",
    )
    .bind(task_uuid)
    .bind(ctx.tenant_id)
    .fetch_optional(&mut scope)
    .await;

    match task_row {
        Ok(None) => return ApiResponse::not_found("任务不存在"),
        Err(e) => {
            tracing::error!("Failed to query task: {}", e);
            return ApiResponse::server_error("查询任务失败");
        }
        Ok(Some(_)) => {}
    }

    let record_no = format!(
        "REC-{}",
        uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
    );
    let test_data = serde_json::json!({
        "step_id": req.step_id,
        "step_name": req.step_name,
        "result": req.result,
    });

    // 1) 写入检验记录
    let insert_res = sqlx::query(
        "INSERT INTO public.qa_lab_records (record_no, task_id, test_data, conclusion, recorded_by, recorded_at, tenant_id) VALUES ($1, $2, $3, $4, $5, NOW(), $6)",
    )
    .bind(&record_no)
    .bind(task_uuid)
    .bind(&test_data)
    .bind(&req.conclusion)
    .bind(&req.inspector)
    .bind(ctx.tenant_id)
    .execute(&mut scope)
    .await;

    if let Err(e) = insert_res {
        tracing::error!("Failed to insert step record: {}", e);
        return ApiResponse::server_error("步骤记录写入失败");
    }

    // 2) 更新任务结果
    let row = sqlx::query(sqlx::AssertSqlSafe(format!(
        "UPDATE public.qa_lab_tasks SET result = $2, conclusion = $3, recorded_by = $4, updated_at = NOW() WHERE id = $1 AND tenant_id = $5 RETURNING {}",
        TASK_SELECT_COLS
    )))
    .bind(task_uuid)
    .bind(&test_data)
    .bind(&req.conclusion)
    .bind(&req.inspector)
    .bind(ctx.tenant_id)
    .fetch_one(&mut scope)
    .await;

    match row {
        Ok(r) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("[lims] 步骤记录事务提交失败: {}", e);
                return ApiResponse::server_error("步骤记录写入失败");
            }
            ApiResponse::success(task_from_row(&r), "步骤完成，检验记录已保存")
        }
        Err(e) => {
            tracing::error!("Failed to update task after step: {}", e);
            ApiResponse::server_error("任务更新失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["lims:read"])),
    path = "/lims/tasks",
    tag = "inspection_task",
    responses(
        (status = 200, description = "List of inspection tasks", body = ApiResponse<Vec<InspectionTask>>),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn list_tasks(
    State(state): State<crate::shared::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<Vec<InspectionTask>> {
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(ctx.tenant_id)
    };
    let list_key = task_list_key(&tenant_id);

    // 缓存读取
    if let Some(cached) = state.task_cache.get(&list_key).await {
        match serde_json::from_value::<Vec<InspectionTask>>(cached) {
            Ok(data) => return ApiResponse::success(data, "从缓存获取检测任务列表成功"),
            Err(e) => tracing::warn!("任务列表缓存反序列化失败，回源: {}", e),
        }
    }

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[lims] 获取检测任务列表读作用域创建失败: {}", e);
            return ApiResponse::server_error("获取检测任务列表失败");
        }
    };

    let rows = sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT {} FROM public.qa_lab_tasks WHERE deleted_at IS NULL ORDER BY created_at DESC",
        TASK_SELECT_COLS
    )))
    .fetch_all(&mut scope)
    .await;

    let _ = scope.commit().await;

    match rows {
        Ok(data) => {
            let tasks = data
                .into_iter()
                .map(|row| InspectionTask {
                    id: row.get("id"),
                    tenant_id: row.get("tenant_id"),
                    task_no: row.get("task_no"),
                    sample_id: row.get("sample_id"),
                    sample_no: row.get("sample_no"),
                    test_items: row.get("test_items"),
                    status: row.get("status"),
                    assigned_to: row.get("assigned_to"),
                    instrument_id: row.get("instrument_id"),
                    planned_date: row.get("planned_date"),
                    actual_start_date: row.get("actual_start_date"),
                    actual_end_date: row.get("actual_end_date"),
                    result: row.get("result"),
                    conclusion: row.get("conclusion"),
                    recorded_by: row.get("recorded_by"),
                    created_at: row.get("created_at"),
                    updated_at: row.get("updated_at"),
                })
                .collect();
            // 回填缓存
            if let Ok(v) = serde_json::to_value(&tasks) {
                state.task_cache.set(list_key, v).await;
            }
            ApiResponse::success(tasks, "获取检测任务列表成功")
        }
        Err(e) => {
            tracing::error!("Failed to fetch tasks: {}", e);
            ApiResponse::server_error("获取检测任务列表失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["lims:write"])),
    path = "/lims/tasks",
    tag = "inspection_task",
    request_body = CreateTaskRequest,
    responses(
        (status = 200, description = "Inspection task created", body = ApiResponse<InspectionTask>),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn create_task(
    State(state): State<crate::shared::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(ctx): Extension<TenantContext>,
    Json(req): Json<CreateTaskRequest>,
) -> ApiResponse<InspectionTask> {
    let sample_id = match Uuid::parse_str(&req.sample_id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的样品ID"),
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
            tracing::error!("[lims] 检测任务创建写作用域创建失败: {}", e);
            return ApiResponse::server_error("检测任务创建失败");
        }
    };

    let row = sqlx::query("SELECT id, sample_no FROM public.qa_lab_samples WHERE id = $1")
        .bind(sample_id)
        .fetch_one(&mut scope)
        .await;

    let sample = match row {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to fetch sample: {}", e);
            return ApiResponse::not_found("样品不存在");
        }
    };

    let task_no = format!(
        "TK-{}-{}",
        chrono::Local::now().format("%Y%m%d"),
        uuid::Uuid::new_v4().to_string()[..6].to_uppercase()
    );

    let instrument_id = req
        .instrument_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());

    let row = sqlx::query(sqlx::AssertSqlSafe(format!(
        "INSERT INTO public.qa_lab_tasks (tenant_id, task_no, sample_id, sample_no, test_items, assigned_to, instrument_id, planned_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz) RETURNING {}",
        TASK_SELECT_COLS
    )))
    .bind(ctx.tenant_id)
    .bind(task_no)
    .bind(sample_id)
    .bind(sample.get::<String, _>("sample_no"))
    .bind(serde_json::to_value(&req.test_items).unwrap_or(serde_json::Value::Array(vec![])))
    .bind(&req.assigned_to)
    .bind(instrument_id)
    .bind(&req.planned_date)
    .fetch_one(&mut scope)
    .await;

    match row {
        Ok(r) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("[lims] 检测任务创建事务提交失败: {}", e);
                return ApiResponse::server_error("检测任务创建失败");
            }
            let task = InspectionTask {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                task_no: r.get("task_no"),
                sample_id: r.get("sample_id"),
                sample_no: r.get("sample_no"),
                test_items: r.get("test_items"),
                status: r.get("status"),
                assigned_to: r.get("assigned_to"),
                instrument_id: r.get("instrument_id"),
                planned_date: r.get("planned_date"),
                actual_start_date: r.get("actual_start_date"),
                actual_end_date: r.get("actual_end_date"),
                result: r.get("result"),
                conclusion: r.get("conclusion"),
                recorded_by: r.get("recorded_by"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            };
            // 新任务创建，列表缓存失效
            if let Some(publisher) = &state.event_publisher {
                let publisher = publisher.clone();
                let tenant = ctx.tenant_id.to_string();
                tokio::spawn(async move {
                    let _ = publisher
                        .publish_cache_invalidated(
                            &format!("lims:task:list:{}", tenant),
                            "pattern",
                            Some("task_created"),
                        )
                        .await;
                });
            }
            ApiResponse::success(task, "检测任务创建成功")
        }
        Err(e) => {
            tracing::error!("Failed to create task: {}", e);
            ApiResponse::server_error("检测任务创建失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["lims:read"])),
    path = "/lims/tasks/{id}",
    tag = "inspection_task",
    params(
        ("id" = String, Path, description = "Task ID"),
    ),
    responses(
        (status = 200, description = "Inspection task detail", body = ApiResponse<InspectionTask>),
        (status = 404, description = "Task not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_task(
    State(state): State<crate::shared::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<InspectionTask> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的任务ID"),
    };
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(ctx.tenant_id)
    };
    let cache_key = task_detail_key(&tenant_id, &id.to_string());

    // 缓存读取
    if let Some(cached) = state.task_cache.get(&cache_key).await {
        match serde_json::from_value::<InspectionTask>(cached) {
            Ok(task) => return ApiResponse::success(task, "从缓存获取检测任务成功"),
            Err(e) => tracing::warn!("任务详情缓存反序列化失败，回源: {}", e),
        }
    }

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[lims] 获取检测任务读作用域创建失败: {}", e);
            return ApiResponse::server_error("获取检测任务失败");
        }
    };

    let row = sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT {} FROM public.qa_lab_tasks WHERE deleted_at IS NULL AND id = $1",
        TASK_SELECT_COLS
    )))
    .bind(id)
    .fetch_one(&mut scope)
    .await;

    let _ = scope.commit().await;

    match row {
        Ok(r) => {
            let task = InspectionTask {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                task_no: r.get("task_no"),
                sample_id: r.get("sample_id"),
                sample_no: r.get("sample_no"),
                test_items: r.get("test_items"),
                status: r.get("status"),
                assigned_to: r.get("assigned_to"),
                instrument_id: r.get("instrument_id"),
                planned_date: r.get("planned_date"),
                actual_start_date: r.get("actual_start_date"),
                actual_end_date: r.get("actual_end_date"),
                result: r.get("result"),
                conclusion: r.get("conclusion"),
                recorded_by: r.get("recorded_by"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            };
            // 回填缓存
            if let Ok(v) = serde_json::to_value(&task) {
                state.task_cache.set(cache_key, v).await;
            }
            ApiResponse::success(task, "获取检测任务成功")
        }
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("记录不存在"),

        Err(e) => {
            tracing::error!("Failed to fetch task: {}", e);
            ApiResponse::server_error("获取检测任务失败")
        }
    }
}

#[utoipa::path(

    put,

    security(("BearerAuth" = [])),

    path = "/api/lims/tasks/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses(

        (status = 200, description = "OK", body = serde_json::Value),

        (status = 500, description = "Internal server error")

    ),

    tag = "LIMS"

)]

pub async fn update_task(
    State(state): State<crate::shared::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(ctx): Extension<TenantContext>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateTaskRequest>,
) -> ApiResponse<InspectionTask> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的任务ID"),
    };

    let instrument_id = req
        .instrument_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[lims] 检测任务更新写作用域创建失败: {}", e);
            return ApiResponse::server_error("检测任务更新失败");
        }
    };

    let row = sqlx::query(sqlx::AssertSqlSafe(format!(
        "UPDATE public.qa_lab_tasks SET status = COALESCE($2, status), assigned_to = COALESCE($3, assigned_to), instrument_id = COALESCE($4, instrument_id), actual_start_date = COALESCE($5::timestamp, actual_start_date), actual_end_date = COALESCE($6::timestamp, actual_end_date), updated_at = NOW() WHERE id = $1 AND tenant_id = $7 RETURNING {}",
        TASK_SELECT_COLS
    )))
    .bind(id)
    .bind(&req.status)
    .bind(&req.assigned_to)
    .bind(instrument_id)
    .bind(&req.actual_start_date)
    .bind(&req.actual_end_date)
    .bind(ctx.tenant_id)
    .fetch_one(&mut scope)
    .await;

    match row {
        Ok(r) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("[lims] 检测任务更新事务提交失败: {}", e);
                return ApiResponse::server_error("检测任务更新失败");
            }
            let task = InspectionTask {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                task_no: r.get("task_no"),
                sample_id: r.get("sample_id"),
                sample_no: r.get("sample_no"),
                test_items: r.get("test_items"),
                status: r.get("status"),
                assigned_to: r.get("assigned_to"),
                instrument_id: r.get("instrument_id"),
                planned_date: r.get("planned_date"),
                actual_start_date: r.get("actual_start_date"),
                actual_end_date: r.get("actual_end_date"),
                result: r.get("result"),
                conclusion: r.get("conclusion"),
                recorded_by: r.get("recorded_by"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            };
            // 失效详情缓存并广播列表失效
            let detail_key = task_detail_key(&Some(ctx.tenant_id), &id.to_string());
            state.task_cache.remove(&detail_key).await;
            if let Some(publisher) = &state.event_publisher {
                let publisher = publisher.clone();
                let key = detail_key.clone();
                let tenant = ctx.tenant_id.to_string();
                tokio::spawn(async move {
                    let _ = publisher
                        .publish_cache_invalidated(&key, "specific", Some("task_updated"))
                        .await;
                    let _ = publisher
                        .publish_cache_invalidated(
                            &format!("lims:task:list:{}", tenant),
                            "pattern",
                            Some("task_updated"),
                        )
                        .await;
                });
            }
            ApiResponse::success(task, "检测任务更新成功")
        }
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("记录不存在"),

        Err(e) => {
            tracing::error!("Failed to update task: {}", e);
            ApiResponse::server_error("检测任务更新失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["lims:inspection_task:write"])),
    path = "/lims/tasks/{id}/result",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "inspection_task"
)]
pub async fn submit_result(
    State(state): State<crate::shared::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(ctx): Extension<TenantContext>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<SubmitResultRequest>,
) -> ApiResponse<InspectionTask> {
    let id = match Uuid::parse_str(&id) {
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
            tracing::error!("[lims] 检测结果提交写作用域创建失败: {}", e);
            return ApiResponse::server_error("检测结果提交失败");
        }
    };

    let row = sqlx::query(sqlx::AssertSqlSafe(format!(
        "UPDATE public.qa_lab_tasks SET result = $2, conclusion = $3, recorded_by = $4, status = 'completed', actual_end_date = NOW(), updated_at = NOW() WHERE id = $1 AND tenant_id = $5 RETURNING {}",
        TASK_SELECT_COLS
    )))
    .bind(id)
    .bind(req.result)
    .bind(&req.conclusion)
    .bind(&req.recorded_by)
    .bind(ctx.tenant_id)
    .fetch_one(&mut scope)
    .await;

    match row {
        Ok(r) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("[lims] 检测结果提交事务提交失败: {}", e);
                return ApiResponse::server_error("检测结果提交失败");
            }
            let task = InspectionTask {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                task_no: r.get("task_no"),
                sample_id: r.get("sample_id"),
                sample_no: r.get("sample_no"),
                test_items: r.get("test_items"),
                status: r.get("status"),
                assigned_to: r.get("assigned_to"),
                instrument_id: r.get("instrument_id"),
                planned_date: r.get("planned_date"),
                actual_start_date: r.get("actual_start_date"),
                actual_end_date: r.get("actual_end_date"),
                result: r.get("result"),
                conclusion: r.get("conclusion"),
                recorded_by: r.get("recorded_by"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            };

            // 失效详情缓存
            let detail_key = task_detail_key(&Some(ctx.tenant_id), &id.to_string());
            state.task_cache.remove(&detail_key).await;

            if let Some(ref publisher) = state.event_publisher {
                let publisher = publisher.clone();
                let tid = Uuid::parse_str(&task.id).unwrap_or_else(|_| Uuid::nil());
                let tno = task.task_no.clone();
                let sid = Uuid::parse_str(&task.sample_id).unwrap_or_else(|_| Uuid::nil());
                let sno = task.sample_no.clone();
                let conclusion = task.conclusion.clone().unwrap_or_default();
                let recorded_by = task.recorded_by.clone().unwrap_or_default();
                let result_val = task.result.clone().unwrap_or(serde_json::Value::Null);
                let cache_key = detail_key.clone();
                let list_key = format!("lims:task:list:{}", ctx.tenant_id);
                tokio::spawn(async move {
                    // 缓存失效广播（D6：失败入 Redis ZSET 重试，对齐 hrm employee 范式）
                    if let Err(e) = publisher
                        .publish_cache_invalidated(&cache_key, "specific", Some("result_submitted"))
                        .await
                    {
                        tracing::warn!("[lims] 缓存失效事件发布失败（detail）: {}，入重试队列", e);
                        let payload = CacheInvalidatedPayload {
                            source_service: "lims".to_string(),
                            source_instance: format!("retry-{}", std::process::id()),
                            cache_key_pattern: cache_key.clone(),
                            invalidation_level: "specific".to_string(),
                            reason: Some("result_submitted".to_string()),
                            invalidated_at: chrono::Utc::now(),
                        };
                        commit_retry::push_retry_typed(
                            "lims",
                            EventType::CacheInvalidated,
                            &payload,
                        )
                        .await;
                    }
                    if let Err(e) = publisher
                        .publish_cache_invalidated(&list_key, "pattern", Some("result_submitted"))
                        .await
                    {
                        tracing::warn!("[lims] 缓存失效事件发布失败（list）: {}，入重试队列", e);
                        let payload = CacheInvalidatedPayload {
                            source_service: "lims".to_string(),
                            source_instance: format!("retry-{}", std::process::id()),
                            cache_key_pattern: list_key.clone(),
                            invalidation_level: "pattern".to_string(),
                            reason: Some("result_submitted".to_string()),
                            invalidated_at: chrono::Utc::now(),
                        };
                        commit_retry::push_retry_typed(
                            "lims",
                            EventType::CacheInvalidated,
                            &payload,
                        )
                        .await;
                    }
                    let payload =
                        topems_shared_event::event::LimsInspectionResultSubmittedPayload {
                            task_id: tid,
                            task_no: tno,
                            sample_id: sid,
                            sample_no: sno,
                            conclusion,
                            result: result_val,
                            recorded_by,
                        };
                    let et = EventType::LimsInspectionResultSubmitted;
                    if let Err(e) = publisher.publish_event(et, &payload).await {
                        tracing::warn!(
                            "[lims] LimsInspectionResultSubmitted 事件发布失败（graceful fallback）: {}，入重试队列",
                            e
                        );
                        // D6：发布失败入 Redis ZSET，由 main.rs 15s run_relay 重发。
                        commit_retry::push_retry_typed("lims", et, &payload).await;
                    } else {
                        tracing::info!(
                            "[lims] LimsInspectionResultSubmitted 事件发布成功 - task_id={}",
                            tid
                        );
                    }
                });
            }

            ApiResponse::success(task, "检测结果提交成功")
        }
        Err(e) => {
            tracing::error!("Failed to submit result: {}", e);
            ApiResponse::server_error("检测结果提交失败")
        }
    }
}

#[utoipa::path(

    delete,

    security(("BearerAuth" = [])),

    path = "/api/lims/tasks/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses(

        (status = 200, description = "OK", body = serde_json::Value),

        (status = 500, description = "Internal server error")

    ),

    tag = "LIMS"

)]

pub async fn delete_task(
    State(state): State<crate::shared::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(ctx): Extension<TenantContext>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<bool> {
    let id = match Uuid::parse_str(&id) {
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
            tracing::error!("[lims] 检测任务删除写作用域创建失败: {}", e);
            return ApiResponse::server_error("检测任务删除失败");
        }
    };

    let result = sqlx::query(
        "UPDATE public.qa_lab_tasks SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(ctx.tenant_id)
    .execute(&mut scope)
    .await;

    match result {
        Ok(_) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("[lims] 检测任务删除事务提交失败: {}", e);
                return ApiResponse::server_error("检测任务删除失败");
            }
            // 失效详情缓存并广播列表失效
            let detail_key = task_detail_key(&Some(ctx.tenant_id), &id.to_string());
            state.task_cache.remove(&detail_key).await;
            if let Some(publisher) = &state.event_publisher {
                let publisher = publisher.clone();
                let key = detail_key.clone();
                let tenant = ctx.tenant_id.to_string();
                tokio::spawn(async move {
                    let _ = publisher
                        .publish_cache_invalidated(&key, "specific", Some("task_deleted"))
                        .await;
                    let _ = publisher
                        .publish_cache_invalidated(
                            &format!("lims:task:list:{}", tenant),
                            "pattern",
                            Some("task_deleted"),
                        )
                        .await;
                });
            }
            ApiResponse::success(true, "检测任务删除成功")
        }
        Err(e) => {
            tracing::error!("Failed to delete task: {}", e);
            ApiResponse::server_error("检测任务删除失败")
        }
    }
}

// ============================================================================
// 检验结果判定：参考范围解析 + 数值判定纯函数
// ============================================================================

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum JudgeResult {
    InRange,    // 结果在范围内
    BelowRange, // 低于下限
    AboveRange, // 高于上限
    NoRange,    // 无参考范围，无法判定
    Invalid,    // 结果或范围格式无效
}

/// 解析 "3.9-6.1" / "<0.5" / ">2000" / "≤100" / "≥0.1" / "NEGATIVE" / "阴性" 等格式
/// 返回 (lower, upper, lower_inclusive, upper_inclusive)
///   None 表示无穷 / 缺失
pub fn parse_reference_range(range: &str) -> Option<(Option<f64>, Option<f64>, bool, bool)> {
    let r = range.trim();
    if r.is_empty() {
        return None;
    }
    // 区间格式 min-max
    if let Some(dash) = r.find('-') {
        let (a, b) = r.split_at(dash);
        let lo_s = a.trim();
        let hi_s = b[1..].trim();
        if let (Ok(lo), Ok(hi)) = (lo_s.parse::<f64>(), hi_s.parse::<f64>()) {
            if lo <= hi {
                return Some((Some(lo), Some(hi), true, true));
            }
        }
    }
    if let Some(rest) = r.strip_prefix("≤").or_else(|| r.strip_prefix("<=")) {
        let hi = rest.trim().parse::<f64>().ok()?;
        return Some((None, Some(hi), true, true));
    }
    if let Some(rest) = r.strip_prefix('≤') {
        let hi = rest.trim().parse::<f64>().ok()?;
        return Some((None, Some(hi), true, true));
    }
    if let Some(rest) = r.strip_prefix('≥').or_else(|| r.strip_prefix(">=")) {
        let lo = rest.trim().parse::<f64>().ok()?;
        return Some((Some(lo), None, true, true));
    }
    if let Some(rest) = r.strip_prefix('<') {
        let hi = rest.trim().parse::<f64>().ok()?;
        return Some((None, Some(hi), true, false));
    }
    if let Some(rest) = r.strip_prefix('>') {
        let lo = rest.trim().parse::<f64>().ok()?;
        return Some((Some(lo), None, false, true));
    }
    // 文本定性参考范围（positive/negative 等）不提供数值判定
    None
}

/// 判断结果是否在参考范围内
pub fn judge_value_against_range(value: f64, reference_range: &str) -> JudgeResult {
    if !value.is_finite() {
        return JudgeResult::Invalid;
    }
    let Some((lo, hi, lo_inc, hi_inc)) = parse_reference_range(reference_range) else {
        return JudgeResult::NoRange;
    };
    // check lower bound
    if let Some(l) = lo {
        let ok = if lo_inc { value >= l } else { value > l };
        if !ok {
            return JudgeResult::BelowRange;
        }
    }
    if let Some(h) = hi {
        let ok = if hi_inc { value <= h } else { value < h };
        if !ok {
            return JudgeResult::AboveRange;
        }
    }
    JudgeResult::InRange
}

#[cfg(test)]
mod tests {
    use super::*;

    // ===== parse_reference_range =====
    #[test]
    fn test_parse_basic_interval() {
        // "3.9-6.1"
        let (lo, hi, li, ui) = parse_reference_range("3.9-6.1").unwrap();
        assert!((lo.unwrap() - 3.9).abs() < 1e-9);
        assert!((hi.unwrap() - 6.1).abs() < 1e-9);
        assert!(li && ui);
    }

    #[test]
    fn test_parse_upper_bound_leq_lesseq() {
        let (lo, hi, _, ui) = parse_reference_range("<=100").unwrap();
        assert!(lo.is_none());
        assert!((hi.unwrap() - 100.0).abs() < 1e-9);
        assert!(ui);
        let (_, hi, _, ui) = parse_reference_range("≤50").unwrap();
        assert!((hi.unwrap() - 50.0).abs() < 1e-9);
        assert!(ui);
    }

    #[test]
    fn test_parse_lower_bound_ge_greatereq() {
        let (lo, hi, li, _) = parse_reference_range(">=0.1").unwrap();
        assert!(hi.is_none());
        assert!((lo.unwrap() - 0.1).abs() < 1e-9);
        assert!(li);
        let (lo, _, li, _) = parse_reference_range("≥1").unwrap();
        assert!((lo.unwrap() - 1.0).abs() < 1e-9);
        assert!(li);
    }

    #[test]
    fn test_parse_strict_lt_gt() {
        // < 10 → upper_inclusive=false
        let (_, hi, _, ui) = parse_reference_range("<10").unwrap();
        assert!(!ui);
        assert!((hi.unwrap() - 10.0).abs() < 1e-9);
        // > 0 → lower_inclusive=false
        let (lo, _, li, _) = parse_reference_range(">0").unwrap();
        assert!(!li);
        assert!((lo.unwrap() - 0.0).abs() < 1e-9);
    }

    #[test]
    fn test_parse_invalid_returns_none() {
        assert!(parse_reference_range("").is_none());
        assert!(parse_reference_range("阴性").is_none());
        assert!(parse_reference_range("abc-def").is_none());
        assert!(parse_reference_range("10-5").is_none()); // lo>hi 无效
    }

    // ===== judge_value_against_range =====
    #[test]
    fn test_judge_interval_in_range() {
        assert_eq!(
            judge_value_against_range(5.0, "3.9-6.1"),
            JudgeResult::InRange
        );
        assert_eq!(
            judge_value_against_range(3.9, "3.9-6.1"),
            JudgeResult::InRange
        );
        assert_eq!(
            judge_value_against_range(6.1, "3.9-6.1"),
            JudgeResult::InRange
        );
    }

    #[test]
    fn test_judge_interval_outside() {
        assert_eq!(
            judge_value_against_range(3.8, "3.9-6.1"),
            JudgeResult::BelowRange
        );
        assert_eq!(
            judge_value_against_range(6.2, "3.9-6.1"),
            JudgeResult::AboveRange
        );
    }

    #[test]
    fn test_judge_upper_bound_le() {
        assert_eq!(
            judge_value_against_range(100.0, "≤100"),
            JudgeResult::InRange
        );
        assert_eq!(
            judge_value_against_range(100.1, "≤100"),
            JudgeResult::AboveRange
        );
    }

    #[test]
    fn test_judge_strict_lt() {
        assert_eq!(
            judge_value_against_range(10.0, "<10"),
            JudgeResult::AboveRange
        );
        assert_eq!(judge_value_against_range(9.99, "<10"), JudgeResult::InRange);
    }

    #[test]
    fn test_judge_strict_gt() {
        assert_eq!(
            judge_value_against_range(0.0, ">0"),
            JudgeResult::BelowRange
        );
        assert_eq!(
            judge_value_against_range(0.0001, ">0"),
            JudgeResult::InRange
        );
    }

    #[test]
    fn test_judge_no_range_or_invalid() {
        assert_eq!(judge_value_against_range(1.0, "阴性"), JudgeResult::NoRange);
        assert_eq!(judge_value_against_range(1.0, ""), JudgeResult::NoRange);
        assert_eq!(
            judge_value_against_range(f64::NAN, "0-10"),
            JudgeResult::Invalid
        );
        assert_eq!(
            judge_value_against_range(f64::INFINITY, "0-10"),
            JudgeResult::Invalid
        );
    }

    // ===== parse_reference_range 补充 =====
    #[test]
    fn parse_empty_returns_none() {
        assert_eq!(parse_reference_range(""), None);
        assert_eq!(parse_reference_range("   "), None);
    }

    #[test]
    fn parse_textual_range_none() {
        assert_eq!(parse_reference_range("positive"), None);
        assert_eq!(parse_reference_range("negative"), None);
    }

    #[test]
    fn parse_leq_variants() {
        assert_eq!(
            parse_reference_range("<=5"),
            Some((None, Some(5.0), true, true))
        );
        assert_eq!(
            parse_reference_range("≤5"),
            Some((None, Some(5.0), true, true))
        );
    }

    #[test]
    fn parse_geq_variants() {
        assert_eq!(
            parse_reference_range(">=5"),
            Some((Some(5.0), None, true, true))
        );
        assert_eq!(
            parse_reference_range("≥5"),
            Some((Some(5.0), None, true, true))
        );
    }

    #[test]
    fn parse_strict_bounds() {
        assert_eq!(
            parse_reference_range("<5"),
            Some((None, Some(5.0), true, false))
        );
        assert_eq!(
            parse_reference_range(">5"),
            Some((Some(5.0), None, false, true))
        );
    }

    #[test]
    fn parse_inverted_range_none() {
        // 10-5 lo>hi → 无法解析
        assert_eq!(parse_reference_range("10-5"), None);
    }

    #[test]
    fn parse_invalid_number_none() {
        assert_eq!(parse_reference_range("abc-def"), None);
        assert_eq!(parse_reference_range(">abc"), None);
    }

    // ===== judge_value_against_range 补充 =====
    #[test]
    fn judge_in_range() {
        assert_eq!(judge_value_against_range(7.0, "5-10"), JudgeResult::InRange);
    }

    #[test]
    fn judge_boundaries_inclusive() {
        assert_eq!(judge_value_against_range(5.0, "5-10"), JudgeResult::InRange);
        assert_eq!(
            judge_value_against_range(10.0, "5-10"),
            JudgeResult::InRange
        );
    }

    #[test]
    fn judge_below_above() {
        assert_eq!(
            judge_value_against_range(4.0, "5-10"),
            JudgeResult::BelowRange
        );
        assert_eq!(
            judge_value_against_range(11.0, "5-10"),
            JudgeResult::AboveRange
        );
    }

    #[test]
    fn judge_strict_boundary() {
        // >5，value=5 不含下界 → BelowRange
        assert_eq!(
            judge_value_against_range(5.0, ">5"),
            JudgeResult::BelowRange
        );
        // <5，value=5 不含上界 → AboveRange
        assert_eq!(
            judge_value_against_range(5.0, "<5"),
            JudgeResult::AboveRange
        );
    }

    #[test]
    fn judge_non_finite_invalid() {
        assert_eq!(
            judge_value_against_range(f64::NAN, "5-10"),
            JudgeResult::Invalid
        );
        assert_eq!(
            judge_value_against_range(f64::INFINITY, "5-10"),
            JudgeResult::Invalid
        );
    }

    #[test]
    fn judge_no_range() {
        assert_eq!(
            judge_value_against_range(5.0, "positive"),
            JudgeResult::NoRange
        );
    }
}

//! Integration 服务间内部集成端点（供 integration 服务编排调用）
//!
//! 路径前缀 `/api/internal/` 由 auth_middleware 的 is_public_path 放行（免 JWT），
//! 且此路由在 main.rs 中挂载于 tenant_middleware / require_permission layer 之后，
//! 不受权限检查影响。设计约束：仅内网可达，须与网关/反向代理配合限制公网暴露。
//!
//! 承接原 integration `qms_lims_ehs.rs` 的跨 schema 直写语义（幂等键有 UNIQUE 约束）：
//! - 样本集成创建：sample_no UNIQUE，ON CONFLICT DO UPDATE（承接直写 #1/#4）
//! - 任务集成创建：task_no UNIQUE，ON CONFLICT DO UPDATE（承接直写 #2/#5）

use crate::shared::AppState;
use axum::{extract::State, routing::post, Extension, Json, Router};
use serde::Deserialize;
use sqlx::types::Uuid;
use sqlx::Row;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_core::response::ApiResponse;

pub fn integration_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/api/internal/lims/samples/integration",
            post(create_integration_sample),
        )
        .route(
            "/api/internal/lims/tasks/integration",
            post(create_integration_task),
        )
}

#[derive(Debug, Deserialize)]
pub struct CreateIntegrationSampleRequest {
    pub tenant_id: Uuid,
    pub sample_no: String,
    pub sample_name: String,
    pub sample_type: Option<String>,
    pub source: Option<String>,
    pub status: Option<String>,
}

pub async fn create_integration_sample(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<CreateIntegrationSampleRequest>,
) -> ApiResponse<serde_json::Value> {
    let sample_type = req.sample_type.unwrap_or_else(|| "通用".to_string());
    let source = req.source.unwrap_or_else(|| "系统集成".to_string());
    let status = req.status.unwrap_or_else(|| "registered".to_string());

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[lims] 集成样本创建写作用域创建失败: {}", e);
            return ApiResponse::server_error("集成样本创建失败");
        }
    };

    let result = sqlx::query(
        "INSERT INTO public.qa_lab_samples (tenant_id, sample_no, sample_name, sample_type, source, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (sample_no) DO UPDATE SET updated_at = NOW()
         RETURNING id, sample_no, sample_name, status",
    )
    .bind(req.tenant_id)
    .bind(&req.sample_no)
    .bind(&req.sample_name)
    .bind(&sample_type)
    .bind(&source)
    .bind(&status)
    .fetch_one(&mut scope)
    .await;

    match result {
        Ok(row) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("[lims] 集成样本创建事务提交失败: {}", e);
                return ApiResponse::server_error("集成样本创建失败");
            }
            ApiResponse::success(
                serde_json::json!({
                    "id": row.try_get::<Uuid, _>("id").ok(),
                    "sample_no": row.try_get::<String, _>("sample_no").ok(),
                    "sample_name": row.try_get::<String, _>("sample_name").ok(),
                    "status": row.try_get::<String, _>("status").ok(),
                }),
                "集成样本创建成功",
            )
        }
        Err(e) => {
            tracing::error!("[integration] 创建样本失败: {}", e);
            ApiResponse::server_error("集成样本创建失败")
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct CreateIntegrationTaskRequest {
    pub tenant_id: Uuid,
    pub task_no: String,
    pub sample_no: String,
    pub test_items: Vec<String>,
    pub status: Option<String>,
    // 修正：lims.qa_lab_tasks 无 priority 列（原 integration 直写字段为僵尸错误），移除
}

pub async fn create_integration_task(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<CreateIntegrationTaskRequest>,
) -> ApiResponse<serde_json::Value> {
    // qa_lab_tasks.sample_id 为 NOT NULL：按 sample_no 关联解析样本（integration 仅提供 sample_no）
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[lims] 集成任务创建写作用域创建失败: {}", e);
            return ApiResponse::server_error("集成任务创建失败");
        }
    };
    let sample_id: Option<Uuid> = sqlx::query_scalar(
        "SELECT id FROM public.qa_lab_samples WHERE sample_no = $1 AND deleted_at IS NULL",
    )
    .bind(&req.sample_no)
    .fetch_optional(&mut scope)
    .await
    .unwrap_or(None);

    let Some(sample_id) = sample_id else {
        return ApiResponse::not_found("关联样本不存在，无法创建集成任务");
    };

    let status = req.status.unwrap_or_else(|| "pending".to_string());
    let test_items = serde_json::json!(req.test_items);

    let result = sqlx::query(
        "INSERT INTO public.qa_lab_tasks (tenant_id, task_no, sample_id, sample_no, test_items, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (task_no) DO UPDATE SET updated_at = NOW()
         RETURNING id, task_no, sample_no, status",
    )
    .bind(req.tenant_id)
    .bind(&req.task_no)
    .bind(sample_id)
    .bind(&req.sample_no)
    .bind(&test_items)
    .bind(&status)
    .fetch_one(&mut scope)
    .await;

    match result {
        Ok(row) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("[lims] 集成任务创建事务提交失败: {}", e);
                return ApiResponse::server_error("集成任务创建失败");
            }
            ApiResponse::success(
                serde_json::json!({
                    "id": row.try_get::<Uuid, _>("id").ok(),
                    "task_no": row.try_get::<String, _>("task_no").ok(),
                    "sample_no": row.try_get::<String, _>("sample_no").ok(),
                    "status": row.try_get::<String, _>("status").ok(),
                }),
                "集成任务创建成功",
            )
        }
        Err(e) => {
            tracing::error!("[integration] 创建任务失败: {}", e);
            ApiResponse::server_error("集成任务创建失败")
        }
    }
}

//! Integration 服务间内部集成端点（供 integration 服务编排调用）
//!
//! 路径前缀 `/api/internal/` 由 auth_middleware 的 is_public_path 放行（免 JWT），
//! 且此路由在 main.rs 中挂载于 require_permission layer 之后，不受权限检查影响。
//! 设计约束：仅内网可达，须与网关/反向代理配合限制公网暴露。
//!
//! 承接原 integration `qms_lims_ehs.rs` 的跨 schema 直写语义：
//! - corrective action 集成创建（原直写字段 related_issue_id/related_issue_type
//!   修正为 qms 实际列 issue_id；related_issue_type 语义并入 description）
//! - quality inspection 结果回写（原直写引用不存在的 test_result/test_data/conclusion
//!   列，修正为 qms 实际列 result/memo）
//!
//! 租户来源（P1-4 跨租户写修复）：本类 `/api/internal/` 端点为免 JWT 的内网服务间调用，
//! auth_middleware 对其放行且不注入 Claims，调用方编排侧也无租户维度。故租户键一律
//! 不信任请求体 `tenant_id`（DTO 不再接收该字段，调用方多余字段由 serde 忽略），
//! 与 ehs/lims internal 端点既有契约一致：
//! - INSERT 落 `Uuid::nil()`（全局集成行，跨租户基础设施记录）；
//! - UPDATE 仅按业务唯一键 `inspection_no` 定位（该列全局 UNIQUE），不再接受请求体指定租户。

use crate::AppState;
use axum::{extract::State, routing::post, Json, Router};
use serde::Deserialize;
use sqlx::types::Uuid;
use sqlx::Row;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::ApiResponse;

pub fn integration_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/api/internal/qms/actions/integration",
            post(create_integration_action),
        )
        .route(
            "/api/internal/qms/inspections/{inspection_no}/result",
            post(update_integration_inspection_result),
        )
}

#[derive(Debug, Deserialize)]
pub struct CreateIntegrationActionRequest {
    // 注意：不再接收请求体 tenant_id（P1-4 跨租户写修复）。租户键由服务端固定为
    // Uuid::nil()，调用方传入的 tenant_id 字段被 serde 忽略。
    pub action_no: String,
    pub title: String,
    pub description: String,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub created_by: Option<String>,
    /// 修正：原 integration 直写 related_issue_id → qms 实际列 issue_id
    pub issue_id: Option<Uuid>,
}

pub async fn create_integration_action(
    State(state): State<AppState>,
    Json(req): Json<CreateIntegrationActionRequest>,
) -> ApiResponse<serde_json::Value> {
    let status = req.status.unwrap_or_else(|| "pending".to_string());
    let priority = req.priority.unwrap_or_else(|| "medium".to_string());
    let created_by = req.created_by.unwrap_or_else(|| "system".to_string());

    // 免 JWT 内部入口没有请求租户：显式平台系统写通道，禁止裸池写入。
    let mut scope = match state.db.scope_system().await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("[integration] 打开集成写作用域失败: {}", e);
            return ApiResponse::server_error("创建集成纠正措施失败");
        }
    };

    let result = sqlx::query(
        only_own_schema_query!(
            "qms",
            "INSERT INTO qms.qa_corrective_actions (tenant_id, action_no, issue_id, title, description, status, priority, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (action_no) DO UPDATE SET updated_at = NOW()
             RETURNING id, action_no, status, priority",
            "qms"
        ),
    )
    // 跨租户基础设施行（无业务租户维度）：显式使用平台通道常量，不写裸零 UUID。
    .bind(topems_shared_db::scope::PLATFORM_TENANT_ID)
    .bind(&req.action_no)
    .bind(req.issue_id)
    .bind(&req.title)
    .bind(&req.description)
    .bind(&status)
    .bind(&priority)
    .bind(&created_by)
    .fetch_one(&mut scope)
    .await;

    if result.is_ok() {
        if let Err(e) = scope.commit().await {
            tracing::error!("[integration] 提交集成纠正措施失败: {}", e);
            return ApiResponse::server_error("创建集成纠正措施失败");
        }
    }

    match result {
        Ok(row) => ApiResponse::success(
            serde_json::json!({
                "id": row.try_get::<Uuid, _>("id").ok(),
                "action_no": row.try_get::<String, _>("action_no").ok(),
                "status": row.try_get::<String, _>("status").ok(),
                "priority": row.try_get::<String, _>("priority").ok(),
            }),
            "集成纠正措施创建成功",
        ),
        Err(e) => {
            tracing::error!("[integration] 创建纠正措施失败: {}", e);
            ApiResponse::server_error("集成纠正措施创建失败")
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct UpdateInspectionResultRequest {
    // 注意：不再接收请求体 tenant_id（P1-4 跨租户写修复）。inspection_no 全局 UNIQUE，
    // 仅按业务唯一键定位行；调用方传入的 tenant_id 字段被 serde 忽略。
    pub inspection_no: String,
    /// 修正：原直写 test_result+conclusion → qms 实际列 result
    pub result: String,
    /// 修正：原直写 test_data → qms 实际列 memo
    pub memo: Option<String>,
}

pub async fn update_integration_inspection_result(
    State(state): State<AppState>,
    Json(req): Json<UpdateInspectionResultRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut scope = match state.db.scope_system().await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("[integration] 打开集成写作用域失败: {}", e);
            return ApiResponse::server_error("质检结果回写失败");
        }
    };

    let result = sqlx::query(only_own_schema_query!(
        "qms",
        "UPDATE qms.qa_quality_inspections
             SET result = $1, memo = COALESCE($2, memo), updated_at = NOW()
             WHERE inspection_no = $3 AND deleted_at IS NULL
             RETURNING id, inspection_no, result, status",
        "qms"
    ))
    .bind(&req.result)
    .bind(&req.memo)
    .bind(&req.inspection_no)
    .fetch_optional(&mut scope)
    .await;

    if result.is_ok() {
        if let Err(e) = scope.commit().await {
            tracing::error!("[integration] 提交质检结果失败: {}", e);
            return ApiResponse::server_error("质检结果回写失败");
        }
    }

    match result {
        Ok(Some(row)) => ApiResponse::success(
            serde_json::json!({
                "id": row.try_get::<Uuid, _>("id").ok(),
                "inspection_no": row.try_get::<String, _>("inspection_no").ok(),
                "result": row.try_get::<String, _>("result").ok(),
            }),
            "质检结果回写成功",
        ),
        Ok(None) => ApiResponse::not_found("质检记录不存在或已删除"),
        Err(e) => {
            tracing::error!("[integration] 回写质检结果失败: {}", e);
            ApiResponse::server_error("质检结果回写失败")
        }
    }
}

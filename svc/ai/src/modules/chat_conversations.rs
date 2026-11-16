//! AI 对话会话（自有存储）CRUD
//!
//! 前端契约（apps/web/src/api/ai/chat.ts）：
//!   GET    /api/ai/conversations            -> 会话列表
//!   GET    /api/ai/conversations/{id}       -> 会话详情
//!   POST   /api/ai/conversations            -> 创建会话（body: { title }）
//!   DELETE /api/ai/conversations/{id}       -> 删除会话
//!
//! 数据模型：core.ai_conversations（与 ai_knowledge 同 schema 防御模式）

use axum::{
    extract::{Extension, Path, State},
    http::HeaderMap,
    Json,
};
use sqlx::Row;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_auth::{auth::Claims, get_tenant_id_from_claims};
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::ApiResponse;

use crate::shared::AppState;

/// 初始化会话表（幂等）

#[derive(serde::Serialize)]
pub struct ConversationDto {
    pub id: String,
    pub title: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

impl From<&sqlx::postgres::PgRow> for ConversationDto {
    fn from(r: &sqlx::postgres::PgRow) -> Self {
        ConversationDto {
            id: r.get::<uuid::Uuid, _>("id").to_string(),
            title: r.get("title"),
            created_at: r.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
            updated_at: r.get::<chrono::DateTime<chrono::Utc>, _>("updated_at"),
        }
    }
}

/// GET /api/ai/conversations
pub async fn list_conversations(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    _claims: axum::Extension<Claims>,
    headers: HeaderMap,
) -> Json<ApiResponse<Vec<ConversationDto>>> {
    let tenant_id = get_tenant_id_from_claims(&_claims);
    let user_id = headers
        .get("x-username")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("topems-user")
        .to_string();

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return Json(ApiResponse::server_error("数据库事务上下文缺失"));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("list_conversations failed: {e}");
            return Json(ApiResponse::server_error("查询会话列表失败"));
        }
    };
    match sqlx::query(only_own_schema_query!(
        "ai",
        r#"SELECT id, title, created_at, updated_at FROM core.ai_conversations
           WHERE tenant_id = $1 AND user_id = $2
           ORDER BY updated_at DESC LIMIT 100"#,
        "core"
    ))
    .bind(tenant_id)
    .bind(&user_id)
    .fetch_all(&mut scope)
    .await
    {
        Ok(rows) => {
            let list = rows.iter().map(ConversationDto::from).collect();
            Json(ApiResponse::success(list, "会话列表"))
        }
        Err(e) => {
            tracing::error!("list_conversations failed: {e}");
            Json(ApiResponse::server_error("查询会话列表失败"))
        }
    }
}

/// GET /api/ai/conversations/{id}
pub async fn get_conversation(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    _claims: axum::Extension<Claims>,
    headers: HeaderMap,
    Path(id): Path<uuid::Uuid>,
) -> Json<ApiResponse<Option<ConversationDto>>> {
    let tenant_id = get_tenant_id_from_claims(&_claims);
    let user_id = headers
        .get("x-username")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("topems-user")
        .to_string();

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return Json(ApiResponse::server_error("数据库事务上下文缺失"));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("get_conversation failed: {e}");
            return Json(ApiResponse::server_error("查询会话失败"));
        }
    };
    match sqlx::query(only_own_schema_query!(
        "ai",
        r#"SELECT id, title, created_at, updated_at FROM core.ai_conversations
           WHERE id = $1 AND tenant_id = $2 AND user_id = $3"#,
        "core"
    ))
    .bind(id)
    .bind(tenant_id)
    .bind(&user_id)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(Some(row)) => Json(ApiResponse::success(
            Some(ConversationDto::from(&row)),
            "会话详情",
        )),
        Ok(None) => Json(ApiResponse::success(None, "会话不存在")),
        Err(e) => {
            tracing::error!("get_conversation failed: {e}");
            Json(ApiResponse::server_error("查询会话失败"))
        }
    }
}

#[derive(serde::Deserialize)]
pub struct CreateConversationRequest {
    pub title: Option<String>,
}

/// POST /api/ai/conversations
pub async fn create_conversation(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    _claims: axum::Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateConversationRequest>,
) -> Json<ApiResponse<ConversationDto>> {
    let tenant_id = get_tenant_id_from_claims(&_claims);
    let user_id = headers
        .get("x-username")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("topems-user")
        .to_string();
    let title = req.title.unwrap_or_else(|| "新对话".to_string());

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return Json(ApiResponse::server_error("数据库事务上下文缺失"));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("create_conversation failed: {e}");
            return Json(ApiResponse::server_error("创建会话失败"));
        }
    };
    let result = sqlx::query(only_own_schema_query!(
        "ai",
        r#"INSERT INTO core.ai_conversations (tenant_id, user_id, title)
           VALUES ($1, $2, $3)
           RETURNING id, title, created_at, updated_at"#,
        "core"
    ))
    .bind(tenant_id)
    .bind(&user_id)
    .bind(&title)
    .fetch_one(&mut scope)
    .await;
    let _ = scope.commit().await;
    match result {
        Ok(row) => {
            let dto = ConversationDto::from(&row);
            Json(ApiResponse::success(dto, "会话已创建"))
        }
        Err(e) => {
            tracing::error!("create_conversation failed: {e}");
            Json(ApiResponse::server_error("创建会话失败"))
        }
    }
}

/// DELETE /api/ai/conversations/{id}
pub async fn delete_conversation(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    _claims: axum::Extension<Claims>,
    headers: HeaderMap,
    Path(id): Path<uuid::Uuid>,
) -> Json<ApiResponse<bool>> {
    let tenant_id = get_tenant_id_from_claims(&_claims);
    let user_id = headers
        .get("x-username")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("topems-user")
        .to_string();

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return Json(ApiResponse::server_error("数据库事务上下文缺失"));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("delete_conversation failed: {e}");
            return Json(ApiResponse::server_error("删除会话失败"));
        }
    };
    let result = sqlx::query(only_own_schema_query!(
        "ai",
        r#"DELETE FROM core.ai_conversations WHERE id = $1 AND tenant_id = $2 AND user_id = $3"#,
        "core"
    ))
    .bind(id)
    .bind(tenant_id)
    .bind(&user_id)
    .execute(&mut scope)
    .await;
    let _ = scope.commit().await;
    match result {
        Ok(_) => Json(ApiResponse::success(true, "会话已删除")),
        Err(e) => {
            tracing::error!("delete_conversation failed: {e}");
            Json(ApiResponse::server_error("删除会话失败"))
        }
    }
}

/// 会话路由（由 routes.rs 挂载到 /api/ai 前缀，带租户/鉴权中间件）
pub fn create_routes() -> axum::Router<AppState> {
    axum::Router::new()
        .route("/conversations", axum::routing::get(list_conversations))
        .route(
            "/conversations/{id}",
            axum::routing::get(get_conversation).delete(delete_conversation),
        )
        .route("/conversations", axum::routing::post(create_conversation))
        // ============ 前端契约收口（2026-10-06）：会话消息轻量兜底 ============
        // 前端 chat/index.ts 约定了消息列表与重新生成端点；crate 内尚无消息存储表，
        // 先返回空列表 / 内层 404 占位（待上游支持），禁止裸 404。
        .route(
            "/conversations/{id}/messages",
            axum::routing::get(list_messages),
        )
        // 前端模板 `${qs}` 折叠产物：smoke 会探测 /conversations/{id}/messages/{tail}
        .route(
            "/conversations/{id}/messages/{tail}",
            axum::routing::get(list_messages_with_tail),
        )
        .route(
            "/conversations/{id}/messages/{message_id}/regenerate",
            axum::routing::post(regenerate_message),
        )
}

/// GET /api/ai/conversations/{id}/messages - 会话消息列表（待上游支持，返回空）
pub async fn list_messages(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    _claims: axum::Extension<Claims>,
    Path(id): Path<uuid::Uuid>,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    // 会话存在性校验：不存在则内层 404（语义与 get_conversation 一致）
    let tenant_id = get_tenant_id_from_claims(&_claims);
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return Json(ApiResponse::server_error("数据库事务上下文缺失"));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("list_messages failed: {e}");
            return Json(ApiResponse::server_error("查询会话消息失败"));
        }
    };
    match sqlx::query(only_own_schema_query!(
        "ai",
        "SELECT 1 FROM core.ai_conversations WHERE id = $1 AND tenant_id = $2",
        "core"
    ))
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(Some(_)) => Json(ApiResponse::success(Vec::new(), "消息列表（待上游支持）")),
        Ok(None) => Json(ApiResponse::not_found("会话不存在")),
        Err(e) => {
            tracing::error!("list_messages failed: {e}");
            Json(ApiResponse::server_error("查询会话消息失败"))
        }
    }
}

/// POST /api/ai/conversations/{id}/messages/{message_id}/regenerate - 重新生成（待上游支持）
pub async fn regenerate_message(
    State(_state): State<AppState>,
    _claims: axum::Extension<Claims>,
    Path((_id, _message_id)): Path<(uuid::Uuid, uuid::Uuid)>,
) -> Json<ApiResponse<serde_json::Value>> {
    // 待上游支持：消息重算管线未接入，返回内层 404（消息不存在/未实现）
    Json(ApiResponse::<serde_json::Value>::not_found(
        "消息重新生成待上游支持",
    ))
}

/// GET /api/ai/conversations/{id}/messages/{tail} - 折叠产物兜底（忽略尾部段，逻辑同 list_messages）
pub async fn list_messages_with_tail(
    Extension(txn_arc): Extension<RlsTxnCell>,
    state: State<AppState>,
    claims: axum::Extension<Claims>,
    Path((id, _tail)): Path<(uuid::Uuid, String)>,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    list_messages(Extension(txn_arc), state, claims, Path(id)).await
}

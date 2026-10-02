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
    extract::{Path, State},
    http::HeaderMap,
    Json,
};
use sqlx::Row;
use topems_shared_auth::{auth::Claims, get_tenant_id_from_claims};
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::ApiResponse;

use crate::shared::AppState;

/// 初始化会话表（幂等）
pub async fn init_database(pool: &sqlx::PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(only_own_schema_query!(
        "ai",
        r#"CREATE TABLE IF NOT EXISTS core.ai_conversations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            user_id VARCHAR(128) NOT NULL,
            title VARCHAR(200) NOT NULL DEFAULT '新对话',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )"#,
        "core"
    ))
    .execute(pool)
    .await?;
    tracing::info!("ai_conversations 表已就绪");
    Ok(())
}

#[derive(serde::Serialize)]
pub struct ConversationDto {
    pub id: String,
    pub title: String,
    pub created_at: String,
    pub updated_at: String,
}

impl From<&sqlx::postgres::PgRow> for ConversationDto {
    fn from(r: &sqlx::postgres::PgRow) -> Self {
        ConversationDto {
            id: r.get::<uuid::Uuid, _>("id").to_string(),
            title: r.get("title"),
            created_at: r
                .get::<chrono::DateTime<chrono::Utc>, _>("created_at")
                .to_rfc3339(),
            updated_at: r
                .get::<chrono::DateTime<chrono::Utc>, _>("updated_at")
                .to_rfc3339(),
        }
    }
}

/// GET /api/ai/conversations
pub async fn list_conversations(
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

    match sqlx::query(only_own_schema_query!(
        "ai",
        r#"SELECT id, title, created_at, updated_at FROM core.ai_conversations
           WHERE tenant_id = $1 AND user_id = $2
           ORDER BY updated_at DESC LIMIT 100"#,
        "core"
    ))
    .bind(tenant_id)
    .bind(&user_id)
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => {
            let list = rows.iter().map(ConversationDto::from).collect();
            Json(ApiResponse::success(list, "会话列表"))
        }
        Err(e) => {
            tracing::error!("list_conversations failed: {e}");
            Json(ApiResponse::error(500, "查询会话列表失败"))
        }
    }
}

/// GET /api/ai/conversations/{id}
pub async fn get_conversation(
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

    match sqlx::query(only_own_schema_query!(
        "ai",
        r#"SELECT id, title, created_at, updated_at FROM core.ai_conversations
           WHERE id = $1 AND tenant_id = $2 AND user_id = $3"#,
        "core"
    ))
    .bind(id)
    .bind(tenant_id)
    .bind(&user_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(row)) => Json(ApiResponse::success(
            Some(ConversationDto::from(&row)),
            "会话详情",
        )),
        Ok(None) => Json(ApiResponse::success(None, "会话不存在")),
        Err(e) => {
            tracing::error!("get_conversation failed: {e}");
            Json(ApiResponse::error(500, "查询会话失败"))
        }
    }
}

#[derive(serde::Deserialize)]
pub struct CreateConversationRequest {
    pub title: Option<String>,
}

/// POST /api/ai/conversations
pub async fn create_conversation(
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

    match sqlx::query(only_own_schema_query!(
        "ai",
        r#"INSERT INTO core.ai_conversations (tenant_id, user_id, title)
           VALUES ($1, $2, $3)
           RETURNING id, title, created_at, updated_at"#,
        "core"
    ))
    .bind(tenant_id)
    .bind(&user_id)
    .bind(&title)
    .fetch_one(&state.pool)
    .await
    {
        Ok(row) => {
            let dto = ConversationDto::from(&row);
            Json(ApiResponse::success(dto, "会话已创建"))
        }
        Err(e) => {
            tracing::error!("create_conversation failed: {e}");
            Json(ApiResponse::error(500, "创建会话失败"))
        }
    }
}

/// DELETE /api/ai/conversations/{id}
pub async fn delete_conversation(
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

    match sqlx::query(only_own_schema_query!(
        "ai",
        r#"DELETE FROM core.ai_conversations WHERE id = $1 AND tenant_id = $2 AND user_id = $3"#,
        "core"
    ))
    .bind(id)
    .bind(tenant_id)
    .bind(&user_id)
    .execute(&state.pool)
    .await
    {
        Ok(_) => Json(ApiResponse::success(true, "会话已删除")),
        Err(e) => {
            tracing::error!("delete_conversation failed: {e}");
            Json(ApiResponse::error(500, "删除会话失败"))
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
}

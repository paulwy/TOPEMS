//! 通用评论 / 收藏 handler。
//!
//! 走请求事务通道（A 类）：读取用 `TenantScope` 生成显式租户谓词，写入用
//! `TenantScope::require_tenant` 显式绑定 `tenant_id`；非 2xx 分支显式回滚并释放
//! 请求事务，避免把失败写入留到中间件提交。
//! 评论按实体过滤、作者本人可改可删；收藏按当前登录用户隔离，查重幂等。

use axum::{
    extract::{Extension, Path, Query, State},
    Json,
};
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_auth::middleware::{BindTenantScope, TenantScope};
use topems_shared_core::response::{api_success, ApiResponse};
use topems_shared_core::TopemsError;
use uuid::Uuid;

use super::models::*;
use crate::AppState;

const COMMENT_COLUMNS: &str =
    "id, tenant_id, content, author_id, author_name, entity_type, entity_id, parent_id, created_at, updated_at";

const FAVORITE_COLUMNS: &str =
    "id, tenant_id, entity_type, entity_id, entity_name, user_id, created_at";

// ============================================================
// Comments
// ============================================================

/// GET /comments?entity_type=&entity_id= — 按实体扁平列出评论（升序）。
pub async fn list_comments(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(cell): Extension<RlsTxnCell>,
    Query(q): Query<CommentListQuery>,
) -> ApiResponse<Vec<Comment>> {
    let tenant_scope = match TenantScope::from_claims(
        &claims,
        "unified-core.engagement.list_comments",
        "core_comments",
    ) {
        Ok(scope) => scope,
        Err((_, message)) => return ApiResponse::from(TopemsError::ValidationFailed(message)),
    };

    let mut guard = cell.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("缺少请求事务上下文".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("打开请求事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("内部服务器错误".to_string()));
        }
    };

    let sql = format!(
        r#"SELECT {} FROM core_comments
           WHERE deleted_at IS NULL
             AND ($1::text IS NULL OR entity_type = $1)
             AND ($2::text IS NULL OR entity_id = $2)
             AND {}
           ORDER BY created_at ASC"#,
        COMMENT_COLUMNS,
        tenant_scope.sql_predicate("tenant_id", "$3")
    );

    let items: Vec<Comment> = match sqlx::query_as(sqlx::AssertSqlSafe(sql))
        .bind(q.entity_type)
        .bind(q.entity_id)
        .bind_tenant_scope(&tenant_scope)
        .fetch_all(&mut scope)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            drop(scope);
            if let Some(txn) = guard.take() {
                let _ = txn.rollback().await;
            }
            tracing::error!("查询评论列表失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询评论列表失败".to_string()));
        }
    };

    api_success(items)
}

/// POST /comments — 创建评论（作者取自 Claims，租户取当前请求租户）。
pub async fn create_comment(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(cell): Extension<RlsTxnCell>,
    Json(req): Json<CreateCommentRequest>,
) -> ApiResponse<Comment> {
    if req.content.trim().is_empty() {
        return ApiResponse::from(TopemsError::ValidationFailed(
            "评论内容不能为空".to_string(),
        ));
    }
    if req.entity_type.trim().is_empty() || req.entity_id.trim().is_empty() {
        return ApiResponse::from(TopemsError::ValidationFailed(
            "缺少实体类型或实体 ID".to_string(),
        ));
    }

    let tenant_scope = match TenantScope::require_tenant(&claims) {
        Ok(scope) => scope,
        Err((_, message)) => return ApiResponse::from(TopemsError::ValidationFailed(message)),
    };
    let tenant_id = tenant_scope.tenant_id();

    let mut guard = cell.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("缺少请求事务上下文".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("打开请求事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("内部服务器错误".to_string()));
        }
    };

    let sql = format!(
        r#"INSERT INTO core_comments
             (tenant_id, content, author_id, author_name, entity_type, entity_id, parent_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING {}"#,
        COMMENT_COLUMNS
    );

    let comment: Comment = match sqlx::query_as(sqlx::AssertSqlSafe(sql))
        .bind(tenant_id)
        .bind(req.content.trim())
        .bind(&claims.sub)
        .bind(&claims.username)
        .bind(req.entity_type.trim())
        .bind(req.entity_id.trim())
        .bind(req.parent_id)
        .fetch_one(&mut scope)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            drop(scope);
            if let Some(txn) = guard.take() {
                let _ = txn.rollback().await;
            }
            tracing::error!("创建评论失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("创建评论失败".to_string()));
        }
    };

    api_success(comment)
}

/// PUT /comments/{id} — 作者本人更新内容。
pub async fn update_comment(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(cell): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateCommentRequest>,
) -> ApiResponse<Comment> {
    if req.content.trim().is_empty() {
        return ApiResponse::from(TopemsError::ValidationFailed(
            "评论内容不能为空".to_string(),
        ));
    }

    let tenant_scope = match TenantScope::require_tenant(&claims) {
        Ok(scope) => scope,
        Err((_, message)) => return ApiResponse::from(TopemsError::ValidationFailed(message)),
    };
    let tenant_id = tenant_scope.tenant_id();

    let mut guard = cell.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("缺少请求事务上下文".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("打开请求事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("内部服务器错误".to_string()));
        }
    };

    let sql = format!(
        r#"UPDATE core_comments
           SET content = $1, updated_at = NOW()
           WHERE id = $2 AND author_id = $3 AND tenant_id = $4 AND deleted_at IS NULL
           RETURNING {}"#,
        COMMENT_COLUMNS
    );

    let comment: Option<Comment> = match sqlx::query_as(sqlx::AssertSqlSafe(sql))
        .bind(req.content.trim())
        .bind(id)
        .bind(&claims.sub)
        .bind(tenant_id)
        .fetch_optional(&mut scope)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            drop(scope);
            if let Some(txn) = guard.take() {
                let _ = txn.rollback().await;
            }
            tracing::error!("更新评论失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("更新评论失败".to_string()));
        }
    };

    match comment {
        Some(c) => api_success(c),
        None => {
            drop(scope);
            if let Some(txn) = guard.take() {
                let _ = txn.rollback().await;
            }
            ApiResponse::from(TopemsError::ResourceNotFound(
                "评论不存在或无权修改".to_string(),
            ))
        }
    }
}

/// DELETE /comments/{id} — 作者本人软删除。
pub async fn delete_comment(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(cell): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<String> {
    let tenant_scope = match TenantScope::require_tenant(&claims) {
        Ok(scope) => scope,
        Err((_, message)) => return ApiResponse::from(TopemsError::ValidationFailed(message)),
    };
    let tenant_id = tenant_scope.tenant_id();

    let mut guard = cell.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("缺少请求事务上下文".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("打开请求事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("内部服务器错误".to_string()));
        }
    };

    let result = sqlx::query(
        r#"UPDATE core_comments SET deleted_at = NOW()
           WHERE id = $1 AND author_id = $2 AND tenant_id = $3 AND deleted_at IS NULL"#,
    )
    .bind(id)
    .bind(&claims.sub)
    .bind(tenant_id)
    .execute(&mut scope)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => api_success(id.to_string()),
        Ok(_) => {
            drop(scope);
            if let Some(txn) = guard.take() {
                let _ = txn.rollback().await;
            }
            ApiResponse::from(TopemsError::ResourceNotFound(
                "评论不存在或无权删除".to_string(),
            ))
        }
        Err(e) => {
            drop(scope);
            if let Some(txn) = guard.take() {
                let _ = txn.rollback().await;
            }
            tracing::error!("删除评论失败: {}", e);
            ApiResponse::from(TopemsError::Internal("删除评论失败".to_string()))
        }
    }
}

// ============================================================
// Favorites
// ============================================================

/// GET /favorites — 当前用户的收藏列表（新在前）。
pub async fn list_favorites(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(cell): Extension<RlsTxnCell>,
) -> ApiResponse<Vec<Favorite>> {
    let tenant_scope = match TenantScope::from_claims(
        &claims,
        "unified-core.engagement.list_favorites",
        "core_favorites",
    ) {
        Ok(scope) => scope,
        Err((_, message)) => return ApiResponse::from(TopemsError::ValidationFailed(message)),
    };

    let mut guard = cell.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("缺少请求事务上下文".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("打开请求事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("内部服务器错误".to_string()));
        }
    };

    let sql = format!(
        r#"SELECT {} FROM core_favorites
           WHERE user_id = $1 AND {}
           ORDER BY created_at DESC"#,
        FAVORITE_COLUMNS,
        tenant_scope.sql_predicate("tenant_id", "$2")
    );

    let items: Vec<Favorite> = match sqlx::query_as(sqlx::AssertSqlSafe(sql))
        .bind(&claims.sub)
        .bind_tenant_scope(&tenant_scope)
        .fetch_all(&mut scope)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            drop(scope);
            if let Some(txn) = guard.take() {
                let _ = txn.rollback().await;
            }
            tracing::error!("查询收藏列表失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询收藏列表失败".to_string()));
        }
    };

    api_success(items)
}

/// POST /favorites — 幂等添加收藏（唯一键冲突不报错，返回已有记录）。
pub async fn add_favorite(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(cell): Extension<RlsTxnCell>,
    Json(req): Json<AddFavoriteRequest>,
) -> ApiResponse<Favorite> {
    if req.entity_type.trim().is_empty() || req.entity_id.trim().is_empty() {
        return ApiResponse::from(TopemsError::ValidationFailed(
            "缺少实体类型或实体 ID".to_string(),
        ));
    }

    let tenant_scope = match TenantScope::require_tenant(&claims) {
        Ok(scope) => scope,
        Err((_, message)) => return ApiResponse::from(TopemsError::ValidationFailed(message)),
    };
    let tenant_id = tenant_scope.tenant_id();

    let mut guard = cell.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("缺少请求事务上下文".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("打开请求事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("内部服务器错误".to_string()));
        }
    };

    if let Err(e) = sqlx::query(
        r#"INSERT INTO core_favorites
             (tenant_id, user_id, entity_type, entity_id, entity_name)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (tenant_id, user_id, entity_type, entity_id) DO NOTHING"#,
    )
    .bind(tenant_id)
    .bind(&claims.sub)
    .bind(req.entity_type.trim())
    .bind(req.entity_id.trim())
    .bind(req.entity_name.trim())
    .execute(&mut scope)
    .await
    {
        drop(scope);
        if let Some(txn) = guard.take() {
            let _ = txn.rollback().await;
        }
        tracing::error!("添加收藏失败: {}", e);
        return ApiResponse::from(TopemsError::Internal("添加收藏失败".to_string()));
    }

    let fav: Option<Favorite> = match sqlx::query_as(sqlx::AssertSqlSafe(format!(
        r#"SELECT {} FROM core_favorites
               WHERE tenant_id = $1 AND user_id = $2 AND entity_type = $3 AND entity_id = $4"#,
        FAVORITE_COLUMNS
    )))
    .bind(tenant_id)
    .bind(&claims.sub)
    .bind(req.entity_type.trim())
    .bind(req.entity_id.trim())
    .fetch_optional(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            drop(scope);
            if let Some(txn) = guard.take() {
                let _ = txn.rollback().await;
            }
            tracing::error!("读取收藏记录失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("读取收藏记录失败".to_string()));
        }
    };

    match fav {
        Some(f) => api_success(f),
        None => {
            drop(scope);
            if let Some(txn) = guard.take() {
                let _ = txn.rollback().await;
            }
            ApiResponse::from(TopemsError::Internal("收藏未保存".to_string()))
        }
    }
}

/// DELETE /favorites/{id} — 当前用户删除自己的收藏。
pub async fn remove_favorite(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(cell): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<String> {
    let tenant_scope = match TenantScope::require_tenant(&claims) {
        Ok(scope) => scope,
        Err((_, message)) => return ApiResponse::from(TopemsError::ValidationFailed(message)),
    };
    let tenant_id = tenant_scope.tenant_id();

    let mut guard = cell.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("缺少请求事务上下文".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("打开请求事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("内部服务器错误".to_string()));
        }
    };

    let result =
        sqlx::query(r#"DELETE FROM core_favorites WHERE id = $1 AND user_id = $2 AND tenant_id = $3"#)
            .bind(id)
            .bind(&claims.sub)
            .bind(tenant_id)
            .execute(&mut scope)
            .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => api_success(id.to_string()),
        Ok(_) => {
            drop(scope);
            if let Some(txn) = guard.take() {
                let _ = txn.rollback().await;
            }
            ApiResponse::from(TopemsError::ResourceNotFound(
                "收藏不存在或无权删除".to_string(),
            ))
        }
        Err(e) => {
            drop(scope);
            if let Some(txn) = guard.take() {
                let _ = txn.rollback().await;
            }
            tracing::error!("删除收藏失败: {}", e);
            ApiResponse::from(TopemsError::Internal("删除收藏失败".to_string()))
        }
    }
}

/// GET /favorites/check?entity_type=&entity_id= — 当前用户是否已收藏。
pub async fn check_favorite(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(cell): Extension<RlsTxnCell>,
    Query(q): Query<FavoriteCheckQuery>,
) -> ApiResponse<bool> {
    let tenant_scope = match TenantScope::from_claims(
        &claims,
        "unified-core.engagement.check_favorite",
        "core_favorites",
    ) {
        Ok(scope) => scope,
        Err((_, message)) => return ApiResponse::from(TopemsError::ValidationFailed(message)),
    };

    let mut guard = cell.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("缺少请求事务上下文".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("打开请求事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("内部服务器错误".to_string()));
        }
    };

    let sql = format!(
        r#"SELECT EXISTS(
             SELECT 1 FROM core_favorites
             WHERE user_id = $1 AND entity_type = $2 AND entity_id = $3
               AND {}
           )"#,
        tenant_scope.sql_predicate("tenant_id", "$4")
    );

    let exists: Option<bool> = match sqlx::query_scalar(sqlx::AssertSqlSafe(sql))
        .bind(&claims.sub)
        .bind(q.entity_type)
        .bind(q.entity_id)
        .bind_tenant_scope(&tenant_scope)
        .fetch_optional(&mut scope)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            drop(scope);
            if let Some(txn) = guard.take() {
                let _ = txn.rollback().await;
            }
            tracing::error!("查询收藏状态失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询收藏状态失败".to_string()));
        }
    };

    api_success(exists.unwrap_or(false))
}

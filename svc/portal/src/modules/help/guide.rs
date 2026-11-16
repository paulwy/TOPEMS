//! 帮助中心指南 / 课程。
//!
//! ⚠️ 本文件裸表名 `core_guides` / `core_guide_lessons` 依赖 portal 的 search_path
//! `public, portal`。portal schema 的副本已废弃（prod 全 0 行），权威数据在 public
//! （prod `public.core_guides` 12 行）。禁止把 search_path 顺序改回 `portal, public`。

use axum::{
    extract::{Extension, Path, Query, State},
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::{resolve_create_tenant, RlsTxnCell};
use topems_shared_core::TopemsError;
use uuid::Uuid;

use crate::shared::AppState;
use topems_shared_core::response::api_success;
use topems_shared_core::response::ApiResponse;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Guide {
    pub id: Uuid,
    pub title: String,
    pub description: String,
    pub category: String,
    pub duration: String,
    pub lessons_count: i32,
    pub is_active: bool,
    pub sort_order: i32,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct GuideLesson {
    pub id: Uuid,
    pub guide_id: Uuid,
    pub title: String,
    pub content: String,
    pub duration: String,
    pub sort_order: i32,
    pub is_active: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GuideProgress {
    pub guide_id: Uuid,
    pub user_id: String,
    pub completed_lessons: Vec<Uuid>,
    pub progress: i32,
    pub completed_at: Option<chrono::DateTime<chrono::Utc>>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GuideQuery {
    pub category: Option<String>,
    pub keyword: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GuideListResponse {
    pub items: Vec<Guide>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GuideDetailResponse {
    pub guide: Guide,
    pub lessons: Vec<GuideLesson>,
    pub progress: Option<GuideProgress>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateGuideRequest {
    pub title: String,
    pub description: String,
    pub category: String,
    pub duration: String,
    pub lessons_count: i32,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateLessonRequest {
    pub title: String,
    pub content: String,
    pub duration: String,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct CompleteLessonRequest {
    pub lesson_id: Uuid,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["portal:guide:read"])),
    path = "/help/guides",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Guide"
)]
pub async fn list_guides(
    State(state): State<AppState>,
    Query(query): Query<GuideQuery>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<GuideListResponse> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(10).min(100);
    let offset = (page - 1) * page_size;

    let category = query.category.clone();
    let keyword = query.keyword.clone();

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal(
            "数据库事务上下文缺失：请求事务未注入".to_string(),
        ));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("开启指南只读作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询指南失败".to_string()));
        }
    };

    let total: i64 = match sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM core_guides
           WHERE is_active = true
             AND ($1::text IS NULL OR category = $1)
             AND ($2::text IS NULL OR title ILIKE '%' || $2 || '%' OR description ILIKE '%' || $2 || '%')"#,
    )
    .bind(category.clone())
    .bind(keyword.clone())
    .fetch_one(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询指南总数失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询指南总数失败".to_string()));
        }
    };

    let items: Vec<Guide> = match sqlx::query_as(
        r#"SELECT id, title, description, category, duration, lessons_count, is_active, sort_order, created_at, updated_at
           FROM core_guides
           WHERE is_active = true
             AND ($1::text IS NULL OR category = $1)
             AND ($2::text IS NULL OR title ILIKE '%' || $2 || '%' OR description ILIKE '%' || $2 || '%')
           ORDER BY sort_order ASC, created_at DESC
           LIMIT $3 OFFSET $4"#,
    )
    .bind(category)
    .bind(keyword)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询指南列表失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询指南列表失败".to_string()));
        }
    };

    if let Err(e) = scope.commit().await {
        tracing::error!("提交指南只读作用域失败: {}", e);
        return ApiResponse::from(TopemsError::Internal("查询指南列表失败".to_string()));
    }

    api_success(GuideListResponse {
        items,
        total,
        page,
        page_size,
    })
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["portal:guide:read"])),
    path = "/help/guides/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Guide"
)]
pub async fn get_guide(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<GuideDetailResponse> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal(
            "数据库事务上下文缺失：请求事务未注入".to_string(),
        ));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("开启指南只读作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询指南详情失败".to_string()));
        }
    };

    let guide: Option<Guide> = match sqlx::query_as(
        r#"SELECT id, title, description, category, duration, lessons_count, is_active, sort_order, created_at, updated_at
           FROM core_guides WHERE id = $1 AND is_active = true"#,
    )
    .bind(id)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询指南详情失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询指南详情失败".to_string()));
        }
    };

    let guide = match guide {
        Some(g) => g,
        None => return ApiResponse::from(TopemsError::ResourceNotFound("指南不存在".to_string())),
    };

    let lessons: Vec<GuideLesson> = match sqlx::query_as(
        r#"SELECT id, guide_id, title, content, duration, sort_order, is_active, created_at
           FROM core_guide_lessons WHERE guide_id = $1 AND is_active = true ORDER BY sort_order ASC"#,
    )
    .bind(id)
    .fetch_all(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询指南课程失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询指南课程失败".to_string()));
        }
    };

    if let Err(e) = scope.commit().await {
        tracing::error!("提交指南只读作用域失败: {}", e);
        return ApiResponse::from(TopemsError::Internal("查询指南详情失败".to_string()));
    }

    api_success(GuideDetailResponse {
        guide,
        lessons,
        progress: None,
    })
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["portal:guide:write"])),
    path = "/help/guides",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Guide"
)]
pub async fn create_guide(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<CreateGuideRequest>,
) -> ApiResponse<Guide> {
    if req.title.trim().is_empty() {
        return ApiResponse::from(TopemsError::ValidationFailed("标题不能为空".to_string()));
    }

    // 业务写入必须落调用方租户：零 UUID 仅供平台内置共享语料，禁止作为业务数据租户。
    let tenant_id = match resolve_create_tenant(&claims) {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };

    let id = Uuid::new_v4();
    let now = chrono::Utc::now();

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal(
            "数据库事务上下文缺失：请求事务未注入".to_string(),
        ));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("开启指南写作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("创建指南失败".to_string()));
        }
    };

    let guide: Guide = match sqlx::query_as(
        r#"INSERT INTO core_guides (id, title, description, category, duration, lessons_count, is_active, sort_order, created_at, updated_at, tenant_id)
           VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8, $9, $10)
           RETURNING id, title, description, category, duration, lessons_count, is_active, sort_order, created_at, updated_at"#,
    )
    .bind(id)
    .bind(req.title)
    .bind(req.description)
    .bind(req.category)
    .bind(req.duration)
    .bind(req.lessons_count)
    .bind(req.sort_order.unwrap_or(0))
    .bind(now)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("创建指南失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("创建指南失败".to_string()));
        }
    };

    if let Err(e) = scope.commit().await {
        tracing::error!("提交指南写作用域失败: {}", e);
        return ApiResponse::from(TopemsError::Internal("创建指南失败".to_string()));
    }

    api_success(guide)
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["portal:guide:write"])),
    path = "/help/guides/{guide_id}/lessons",
    params(
        ("guide_id" = String, Path, description = "guide_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Guide"
)]
pub async fn add_lesson(
    State(state): State<AppState>,
    Path(guide_id): Path<Uuid>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<CreateLessonRequest>,
) -> ApiResponse<GuideLesson> {
    if req.title.trim().is_empty() {
        return ApiResponse::from(TopemsError::ValidationFailed(
            "课程标题不能为空".to_string(),
        ));
    }

    // 业务写入必须落调用方租户：零 UUID 仅供平台内置共享语料，禁止作为业务数据租户。
    let tenant_id = match resolve_create_tenant(&claims) {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };

    let id = Uuid::new_v4();
    let now = chrono::Utc::now();

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal(
            "数据库事务上下文缺失：请求事务未注入".to_string(),
        ));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("开启指南写作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("添加课程失败".to_string()));
        }
    };

    let lesson: GuideLesson = match sqlx::query_as(
        r#"INSERT INTO core_guide_lessons (id, guide_id, title, content, duration, sort_order, is_active, created_at, tenant_id)
           VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8)
           RETURNING id, guide_id, title, content, duration, sort_order, is_active, created_at"#,
    )
    .bind(id)
    .bind(guide_id)
    .bind(req.title)
    .bind(req.content)
    .bind(req.duration)
    .bind(req.sort_order.unwrap_or(0))
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("添加课程失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("添加课程失败".to_string()));
        }
    };

    let _ = sqlx::query!(
        r#"UPDATE core_guides SET lessons_count = lessons_count + 1 WHERE id = $1"#,
        guide_id
    )
    .execute(&mut scope)
    .await;

    if let Err(e) = scope.commit().await {
        tracing::error!("提交指南写作用域失败: {}", e);
        return ApiResponse::from(TopemsError::Internal("添加课程失败".to_string()));
    }

    api_success(lesson)
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["portal:guide:read"])),
    path = "/help/guides/categories",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Guide"
)]
pub async fn get_guide_categories(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<Vec<String>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal(
            "数据库事务上下文缺失：请求事务未注入".to_string(),
        ));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("开启指南只读作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询指南分类失败".to_string()));
        }
    };

    let categories: Vec<String> = match sqlx::query_scalar(
        r#"SELECT DISTINCT category FROM core_guides WHERE is_active = true ORDER BY category"#,
    )
    .fetch_all(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询指南分类失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询指南分类失败".to_string()));
        }
    };

    if let Err(e) = scope.commit().await {
        tracing::error!("提交指南只读作用域失败: {}", e);
        return ApiResponse::from(TopemsError::Internal("查询指南分类失败".to_string()));
    }

    api_success(categories)
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
mod tests {
    use super::*;
    use serde::{Deserialize, Serialize};
    use serde_json::{from_value, to_value, Value};

    fn roundtrip<T>(s: &T) -> Value
    where
        T: Serialize + for<'de> Deserialize<'de>,
    {
        let v1 = to_value(s).expect("serialize first");
        let s2: T = from_value(v1.clone()).expect("deserialize");
        let v2 = to_value(&s2).expect("serialize second");
        assert_eq!(v1, v2, "roundtrip value mismatch");
        v1
    }

    fn uid() -> Uuid {
        Uuid::new_v4()
    }

    fn now() -> chrono::DateTime<chrono::Utc> {
        chrono::Utc::now()
    }

    #[test]
    fn guide_roundtrip() {
        let s = Guide {
            id: uid(),
            title: "入门指南".to_string(),
            description: "新手指引".to_string(),
            category: "getting-started".to_string(),
            duration: "30min".to_string(),
            lessons_count: 5,
            is_active: true,
            sort_order: 1,
            created_at: now(),
            updated_at: now(),
        };
        roundtrip(&s);
    }

    #[test]
    fn guide_lesson_roundtrip() {
        let s = GuideLesson {
            id: uid(),
            guide_id: uid(),
            title: "第一课".to_string(),
            content: "内容".to_string(),
            duration: "10min".to_string(),
            sort_order: 1,
            is_active: true,
            created_at: now(),
        };
        roundtrip(&s);
    }

    #[test]
    fn guide_progress_roundtrip() {
        let s = GuideProgress {
            guide_id: uid(),
            user_id: "user-1".to_string(),
            completed_lessons: vec![uid(), uid()],
            progress: 80,
            completed_at: Some(now()),
            updated_at: now(),
        };
        roundtrip(&s);
    }

    #[test]
    fn guide_query_roundtrip() {
        let s = GuideQuery {
            category: Some("erp".to_string()),
            keyword: None,
            page: Some(1),
            page_size: Some(10),
        };
        roundtrip(&s);
    }

    #[test]
    fn guide_list_response_roundtrip() {
        let s = GuideListResponse {
            items: vec![],
            total: 0,
            page: 1,
            page_size: 10,
        };
        roundtrip(&s);
    }

    #[test]
    fn guide_detail_response_roundtrip() {
        let guide = Guide {
            id: uid(),
            title: "t".to_string(),
            description: "d".to_string(),
            category: "c".to_string(),
            duration: "1h".to_string(),
            lessons_count: 1,
            is_active: true,
            sort_order: 0,
            created_at: now(),
            updated_at: now(),
        };
        let s = GuideDetailResponse {
            guide,
            lessons: vec![],
            progress: None,
        };
        roundtrip(&s);
    }

    #[test]
    fn create_guide_request_roundtrip() {
        let s = CreateGuideRequest {
            title: "新指南".to_string(),
            description: "desc".to_string(),
            category: "erp".to_string(),
            duration: "1h".to_string(),
            lessons_count: 3,
            sort_order: Some(5),
        };
        roundtrip(&s);
    }

    #[test]
    fn create_lesson_request_roundtrip() {
        let s = CreateLessonRequest {
            title: "新课".to_string(),
            content: "content".to_string(),
            duration: "10min".to_string(),
            sort_order: None,
        };
        roundtrip(&s);
    }

    #[test]
    fn complete_lesson_request_roundtrip() {
        let s = CompleteLessonRequest { lesson_id: uid() };
        roundtrip(&s);
    }
}

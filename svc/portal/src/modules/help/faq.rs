//! 帮助中心 FAQ。
//!
//! ⚠️ 本文件所有裸表名 `core_faqs` 依赖 portal 的 search_path `public, portal`。
//! `portal.core_faqs` 副本已废弃（prod 实测 0 行），权威数据在 `public.core_faqs`
//! （prod 12 行）。禁止把 search_path 顺序改回 `portal, public`。

use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use topems_shared_core::TopemsError;
use uuid::Uuid;

use crate::shared::AppState;
use topems_shared_core::response::api_success;
use topems_shared_core::response::ApiResponse;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Faq {
    pub id: Uuid,
    pub question: String,
    pub answer: String,
    pub category: String,
    pub views: i64,
    pub is_active: bool,
    pub sort_order: i32,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FaqQuery {
    pub category: Option<String>,
    pub keyword: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FaqListResponse {
    pub items: Vec<Faq>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateFaqRequest {
    pub question: String,
    pub answer: String,
    pub category: String,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateFaqRequest {
    pub question: Option<String>,
    pub answer: Option<String>,
    pub category: Option<String>,
    pub is_active: Option<bool>,
    pub sort_order: Option<i32>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["portal:faq:read"])),
    path = "/help/faqs",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Faq"
)]
pub async fn list_faqs(
    State(state): State<AppState>,
    Query(query): Query<FaqQuery>,
) -> ApiResponse<FaqListResponse> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(10).min(100);
    let offset = (page - 1) * page_size;

    let category = query.category.clone();
    let keyword = query.keyword.clone();

    let mut scope = match state.db.scope_read().await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("开启FAQ只读作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询FAQ失败".to_string()));
        }
    };

    let total: i64 = match sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM core_faqs
           WHERE is_active = true
             AND ($1::text IS NULL OR category = $1)
             AND ($2::text IS NULL OR question ILIKE '%' || $2 || '%' OR answer ILIKE '%' || $2 || '%')"#,
    )
    .bind(category.clone())
    .bind(keyword.clone())
    .fetch_one(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询FAQ总数失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询FAQ总数失败".to_string()));
        }
    };

    let items: Vec<Faq> = match sqlx::query_as(
        r#"SELECT id, question, answer, category, views, is_active, sort_order, created_at, updated_at
           FROM core_faqs
           WHERE is_active = true
             AND ($1::text IS NULL OR category = $1)
             AND ($2::text IS NULL OR question ILIKE '%' || $2 || '%' OR answer ILIKE '%' || $2 || '%')
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
            tracing::error!("查询FAQ列表失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询FAQ列表失败".to_string()));
        }
    };

    if let Err(e) = scope.commit().await {
        tracing::error!("提交FAQ只读作用域失败: {}", e);
        return ApiResponse::from(TopemsError::Internal("查询FAQ列表失败".to_string()));
    }

    api_success(FaqListResponse {
        items,
        total,
        page,
        page_size,
    })
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["portal:faq:read"])),
    path = "/help/faqs/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Faq"
)]
pub async fn get_faq(State(state): State<AppState>, Path(id): Path<Uuid>) -> ApiResponse<Faq> {
    let mut scope = match state.db.scope().await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("开启FAQ作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询FAQ详情失败".to_string()));
        }
    };

    let faq: Option<Faq> = match sqlx::query_as(
        r#"SELECT id, question, answer, category, views, is_active, sort_order, created_at, updated_at
           FROM core_faqs WHERE id = $1 AND is_active = true"#,
    )
    .bind(id)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询FAQ详情失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询FAQ详情失败".to_string()));
        }
    };

    match faq {
        Some(faq) => {
            let _ = sqlx::query!(
                r#"UPDATE core_faqs SET views = views + 1 WHERE id = $1"#,
                id
            )
            .execute(&mut scope)
            .await;
            if let Err(e) = scope.commit().await {
                tracing::error!("提交FAQ作用域失败: {}", e);
                return ApiResponse::from(TopemsError::Internal("查询FAQ详情失败".to_string()));
            }
            api_success(faq)
        }
        None => ApiResponse::from(TopemsError::ResourceNotFound("FAQ不存在".to_string())),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["portal:faq:write"])),
    path = "/help/faqs",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Faq"
)]
pub async fn create_faq(
    State(state): State<AppState>,
    Json(req): Json<CreateFaqRequest>,
) -> ApiResponse<Faq> {
    if req.question.trim().is_empty() {
        return ApiResponse::from(TopemsError::ValidationFailed("问题不能为空".to_string()));
    }
    if req.answer.trim().is_empty() {
        return ApiResponse::from(TopemsError::ValidationFailed("答案不能为空".to_string()));
    }

    let id = Uuid::new_v4();
    let now = chrono::Utc::now();

    let mut scope = match state.db.scope().await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("开启FAQ写作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("创建FAQ失败".to_string()));
        }
    };

    let faq: Faq = match sqlx::query_as(
        r#"INSERT INTO core_faqs (id, question, answer, category, views, is_active, sort_order, created_at, updated_at, tenant_id)
           VALUES ($1, $2, $3, $4, 0, true, $5, $6, $7, $8)
           RETURNING id, question, answer, category, views, is_active, sort_order, created_at, updated_at"#,
    )
    .bind(id)
    .bind(req.question)
    .bind(req.answer)
    .bind(req.category)
    .bind(req.sort_order.unwrap_or(0))
    .bind(now)
    .bind(now)
    .bind(Uuid::nil())
    .fetch_one(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("创建FAQ失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("创建FAQ失败".to_string()));
        }
    };

    if let Err(e) = scope.commit().await {
        tracing::error!("提交FAQ写作用域失败: {}", e);
        return ApiResponse::from(TopemsError::Internal("创建FAQ失败".to_string()));
    }

    api_success(faq)
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["portal:faq:write"])),
    path = "/help/faqs/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Faq"
)]
pub async fn update_faq(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateFaqRequest>,
) -> ApiResponse<Faq> {
    let mut scope = match state.db.scope().await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("开启FAQ写作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("更新FAQ失败".to_string()));
        }
    };

    let faq: Option<Faq> = match sqlx::query_as(
        r#"UPDATE core_faqs
           SET question = COALESCE($1, question),
               answer = COALESCE($2, answer),
               category = COALESCE($3, category),
               is_active = COALESCE($4, is_active),
               sort_order = COALESCE($5, sort_order),
               updated_at = $6
           WHERE id = $7
           RETURNING id, question, answer, category, views, is_active, sort_order, created_at, updated_at"#,
    )
    .bind(req.question)
    .bind(req.answer)
    .bind(req.category)
    .bind(req.is_active)
    .bind(req.sort_order)
    .bind(chrono::Utc::now())
    .bind(id)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("更新FAQ失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("更新FAQ失败".to_string()));
        }
    };

    if let Err(e) = scope.commit().await {
        tracing::error!("提交FAQ写作用域失败: {}", e);
        return ApiResponse::from(TopemsError::Internal("更新FAQ失败".to_string()));
    }

    match faq {
        Some(faq) => api_success(faq),
        None => ApiResponse::from(TopemsError::ResourceNotFound("FAQ不存在".to_string())),
    }
}

pub async fn delete_faq(State(state): State<AppState>, Path(id): Path<Uuid>) -> ApiResponse<bool> {
    let mut scope = match state.db.scope().await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("开启FAQ写作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("删除FAQ失败".to_string()));
        }
    };

    let result = sqlx::query!(
        r#"UPDATE core_faqs SET is_active = false, updated_at = $1 WHERE id = $2"#,
        chrono::Utc::now(),
        id
    )
    .execute(&mut scope)
    .await;

    if let Err(e) = scope.commit().await {
        tracing::error!("提交FAQ写作用域失败: {}", e);
        return ApiResponse::from(TopemsError::Internal("删除FAQ失败".to_string()));
    }

    match result {
        Ok(r) if r.rows_affected() > 0 => api_success(true),
        Ok(_) => ApiResponse::from(TopemsError::ResourceNotFound("FAQ不存在".to_string())),
        Err(e) => {
            tracing::error!("删除FAQ失败: {}", e);
            ApiResponse::from(TopemsError::Internal("删除FAQ失败".to_string()))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["portal:faq:read"])),
    path = "/help/faqs/categories",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Faq"
)]
pub async fn get_faq_categories(State(state): State<AppState>) -> ApiResponse<Vec<String>> {
    let mut scope = match state.db.scope_read().await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("开启FAQ只读作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询FAQ分类失败".to_string()));
        }
    };

    let categories: Vec<String> = match sqlx::query_scalar(
        r#"SELECT DISTINCT category FROM core_faqs WHERE is_active = true ORDER BY category"#,
    )
    .fetch_all(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询FAQ分类失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询FAQ分类失败".to_string()));
        }
    };

    if let Err(e) = scope.commit().await {
        tracing::error!("提交FAQ只读作用域失败: {}", e);
        return ApiResponse::from(TopemsError::Internal("查询FAQ分类失败".to_string()));
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
    fn faq_roundtrip() {
        let s = Faq {
            id: uid(),
            question: "如何重置密码？".to_string(),
            answer: "在设置页修改".to_string(),
            category: "账户".to_string(),
            views: 128,
            is_active: true,
            sort_order: 1,
            created_at: now(),
            updated_at: now(),
        };
        roundtrip(&s);
    }

    #[test]
    fn faq_query_roundtrip() {
        let s = FaqQuery {
            category: Some("账户".to_string()),
            keyword: None,
            page: Some(1),
            page_size: Some(20),
        };
        roundtrip(&s);
    }

    #[test]
    fn faq_list_response_roundtrip() {
        let s = FaqListResponse {
            items: vec![],
            total: 0,
            page: 1,
            page_size: 10,
        };
        roundtrip(&s);
    }

    #[test]
    fn create_faq_request_roundtrip() {
        let s = CreateFaqRequest {
            question: "q".to_string(),
            answer: "a".to_string(),
            category: "c".to_string(),
            sort_order: Some(3),
        };
        roundtrip(&s);
    }

    #[test]
    fn update_faq_request_roundtrip() {
        let s = UpdateFaqRequest {
            question: None,
            answer: Some("新答案".to_string()),
            category: None,
            is_active: Some(false),
            sort_order: None,
        };
        roundtrip(&s);
    }
}

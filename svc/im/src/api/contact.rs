use axum::{
    extract::{Path, Query, State},
    Json,
};
use chrono::Utc;
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::{AddContact, Contact, ContactGroup, CreateContactGroup, UpdateContact};
use topems_shared::ApiResponse;

// ==================== 联系人管理API ====================

/// POST /api/v1/contacts/add - 添加联系人
pub async fn add_contact(
    State(pool): State<PgPool>,
    Json(payload): Json<AddContact>,
) -> Json<ApiResponse<Contact>> {
    // 需要用户ID
    let user_id = payload.contact_user_id.clone();

    let id = Uuid::new_v4();
    let now = Utc::now().naive_utc();
    let group_id = payload.group_id.and_then(|g| Uuid::parse_str(&g).ok());

    let result = sqlx::query_as::<_, Contact>(
        r#"
        INSERT INTO im.contacts (id, user_id, contact_user_id, contact_name, contact_avatar, alias, status, is_blocked, group_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'active', FALSE, $7, $8, $9)
        ON CONFLICT (user_id, contact_user_id) 
        DO UPDATE SET contact_name = $4, contact_avatar = $5, alias = $6, updated_at = $9
        RETURNING id, user_id, contact_user_id, contact_name, contact_avatar, alias, status, is_blocked, group_id, created_at, updated_at
        "#
    )
    .bind(id)
    .bind(user_id)
    .bind(payload.contact_user_id)
    .bind(payload.contact_name)
    .bind(payload.contact_avatar)
    .bind(payload.alias)
    .bind(group_id)
    .bind(now)
    .bind(now)
    .fetch_one(&pool)
    .await;

    match result {
        Ok(contact) => Json(ApiResponse::success(contact, "添加联系人成功")),
        Err(e) => {
            tracing::error!("Failed to add contact: {}", e);
            Json(ApiResponse::error(500, "添加联系人失败"))
        }
    }
}

/// GET /api/v1/contacts - 获取联系人列表
pub async fn list_contacts(
    State(pool): State<PgPool>,
    Query(params): Query<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let user_id = params.get("user_id").and_then(|v| v.as_str()).unwrap_or("");

    if user_id.is_empty() {
        return Json(ApiResponse::error(400, "用户ID不能为空"));
    }

    let result = sqlx::query_as::<_, Contact>(
        r#"
        SELECT id, user_id, contact_user_id, contact_name, contact_avatar, alias, status, is_blocked, group_id, created_at, updated_at
        FROM im.contacts
        WHERE user_id = $1 AND is_blocked = FALSE
        ORDER BY contact_name ASC
        "#
    )
    .bind(user_id)
    .fetch_all(&pool)
    .await;

    match result {
        Ok(contacts) => Json(ApiResponse::success(
            json!({
                "contacts": contacts,
                "total": contacts.len()
            }),
            "获取联系人列表成功",
        )),
        Err(e) => {
            tracing::error!("Failed to list contacts: {}", e);
            Json(ApiResponse::error(500, "获取联系人列表失败"))
        }
    }
}

/// GET /api/v1/contacts/:id - 获取联系人详情
pub async fn get_contact(
    State(pool): State<PgPool>,
    Path(contact_id): Path<Uuid>,
) -> Json<ApiResponse<Contact>> {
    let result = sqlx::query_as::<_, Contact>(
        r#"
        SELECT id, user_id, contact_user_id, contact_name, contact_avatar, alias, status, is_blocked, group_id, created_at, updated_at
        FROM im.contacts
        WHERE id = $1
        "#
    )
    .bind(contact_id)
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(contact)) => Json(ApiResponse::success(contact, "获取联系人详情成功")),
        Ok(None) => Json(ApiResponse::error(404, "联系人不存在")),
        Err(e) => {
            tracing::error!("Failed to get contact: {}", e);
            Json(ApiResponse::error(500, "获取联系人详情失败"))
        }
    }
}

/// PUT /api/v1/contacts/:id - 更新联系人
pub async fn update_contact(
    State(pool): State<PgPool>,
    Path(contact_id): Path<Uuid>,
    Json(payload): Json<UpdateContact>,
) -> Json<ApiResponse<Contact>> {
    let now = Utc::now().naive_utc();
    let group_id = payload.group_id.and_then(|g| Uuid::parse_str(&g).ok());

    let result = sqlx::query_as::<_, Contact>(
        r#"
        UPDATE im.contacts
        SET alias = COALESCE($1, alias),
            group_id = COALESCE($2, group_id),
            updated_at = $3
        WHERE id = $4
        RETURNING id, user_id, contact_user_id, contact_name, contact_avatar, alias, status, is_blocked, group_id, created_at, updated_at
        "#
    )
    .bind(payload.alias)
    .bind(group_id)
    .bind(now)
    .bind(contact_id)
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(contact)) => Json(ApiResponse::success(contact, "更新联系人成功")),
        Ok(None) => Json(ApiResponse::error(404, "联系人不存在")),
        Err(e) => {
            tracing::error!("Failed to update contact: {}", e);
            Json(ApiResponse::error(500, "更新联系人失败"))
        }
    }
}

/// DELETE /api/v1/contacts/:id - 删除联系人
pub async fn delete_contact(
    State(pool): State<PgPool>,
    Path(contact_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let result = sqlx::query(
        r#"
        DELETE FROM im.contacts
        WHERE id = $1
        RETURNING id
        "#,
    )
    .bind(contact_id)
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(_)) => Json(ApiResponse::success(
            json!({ "deleted": true }),
            "删除联系人成功",
        )),
        Ok(None) => Json(ApiResponse::error(404, "联系人不存在")),
        Err(e) => {
            tracing::error!("Failed to delete contact: {}", e);
            Json(ApiResponse::error(500, "删除联系人失败"))
        }
    }
}

/// POST /api/v1/contacts/:id/block - 拉黑联系人
pub async fn block_contact(
    State(pool): State<PgPool>,
    Path(contact_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let now = Utc::now().naive_utc();

    let result = sqlx::query(
        r#"
        UPDATE im.contacts
        SET is_blocked = TRUE, updated_at = $1
        WHERE id = $2
        "#,
    )
    .bind(now)
    .bind(contact_id)
    .execute(&pool)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(
            json!({ "blocked": true }),
            "拉黑联系人成功",
        )),
        Err(e) => {
            tracing::error!("Failed to block contact: {}", e);
            Json(ApiResponse::error(500, "拉黑联系人失败"))
        }
    }
}

/// POST /api/v1/contacts/:id/unblock - 解除拉黑
pub async fn unblock_contact(
    State(pool): State<PgPool>,
    Path(contact_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let now = Utc::now().naive_utc();

    let result = sqlx::query(
        r#"
        UPDATE im.contacts
        SET is_blocked = FALSE, updated_at = $1
        WHERE id = $2
        "#,
    )
    .bind(now)
    .bind(contact_id)
    .execute(&pool)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(
            json!({ "blocked": false }),
            "解除拉黑成功",
        )),
        Err(e) => {
            tracing::error!("Failed to unblock contact: {}", e);
            Json(ApiResponse::error(500, "解除拉黑失败"))
        }
    }
}

/// GET /api/v1/contacts/search - 搜索联系人
pub async fn search_contacts(
    State(pool): State<PgPool>,
    Query(params): Query<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let user_id = params.get("user_id").and_then(|v| v.as_str()).unwrap_or("");
    let keyword = params.get("keyword").and_then(|v| v.as_str()).unwrap_or("");

    if user_id.is_empty() {
        return Json(ApiResponse::error(400, "用户ID不能为空"));
    }

    if keyword.is_empty() {
        return Json(ApiResponse::error(400, "搜索关键词不能为空"));
    }

    let result = sqlx::query_as::<_, Contact>(
        r#"
        SELECT id, user_id, contact_user_id, contact_name, contact_avatar, alias, status, is_blocked, group_id, created_at, updated_at
        FROM im.contacts
        WHERE user_id = $1 
        AND (contact_name ILIKE $2 OR alias ILIKE $2 OR contact_user_id ILIKE $2)
        AND is_blocked = FALSE
        ORDER BY contact_name ASC
        LIMIT 50
        "#
    )
    .bind(user_id)
    .bind(format!("%{}%", keyword))
    .fetch_all(&pool)
    .await;

    match result {
        Ok(contacts) => Json(ApiResponse::success(
            json!({
                "contacts": contacts,
                "total": contacts.len(),
                "keyword": keyword
            }),
            "搜索联系人成功",
        )),
        Err(e) => {
            tracing::error!("Failed to search contacts: {}", e);
            Json(ApiResponse::error(500, "搜索联系人失败"))
        }
    }
}

/// GET /api/v1/contacts/blocked - 获取已拉黑联系人列表
pub async fn list_blocked_contacts(
    State(pool): State<PgPool>,
    Query(params): Query<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let user_id = params.get("user_id").and_then(|v| v.as_str()).unwrap_or("");

    if user_id.is_empty() {
        return Json(ApiResponse::error(400, "用户ID不能为空"));
    }

    let result = sqlx::query_as::<_, Contact>(
        r#"
        SELECT id, user_id, contact_user_id, contact_name, contact_avatar, alias, status, is_blocked, group_id, created_at, updated_at
        FROM im.contacts
        WHERE user_id = $1 AND is_blocked = TRUE
        ORDER BY updated_at DESC
        "#
    )
    .bind(user_id)
    .fetch_all(&pool)
    .await;

    match result {
        Ok(contacts) => Json(ApiResponse::success(
            json!({
                "blocked_contacts": contacts,
                "total": contacts.len()
            }),
            "获取已拉黑联系人成功",
        )),
        Err(e) => {
            tracing::error!("Failed to list blocked contacts: {}", e);
            Json(ApiResponse::error(500, "获取已拉黑联系人失败"))
        }
    }
}

// ==================== 联系人分组管理API ====================

/// POST /api/v1/contact-groups/create - 创建联系人分组
pub async fn create_contact_group(
    State(pool): State<PgPool>,
    Query(params): Query<serde_json::Value>,
    Json(payload): Json<CreateContactGroup>,
) -> Json<ApiResponse<ContactGroup>> {
    let user_id = params.get("user_id").and_then(|v| v.as_str()).unwrap_or("");

    if user_id.is_empty() {
        return Json(ApiResponse::error(400, "用户ID不能为空"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now().naive_utc();

    let result = sqlx::query_as::<_, ContactGroup>(
        r#"
        INSERT INTO im.contact_groups (id, user_id, name, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, user_id, name, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(user_id)
    .bind(payload.name)
    .bind(now)
    .bind(now)
    .fetch_one(&pool)
    .await;

    match result {
        Ok(group) => Json(ApiResponse::success(group, "创建联系人分组成功")),
        Err(e) => {
            tracing::error!("Failed to create contact group: {}", e);
            Json(ApiResponse::error(500, "创建联系人分组失败"))
        }
    }
}

/// GET /api/v1/contact-groups - 获取联系人分组列表
pub async fn list_contact_groups(
    State(pool): State<PgPool>,
    Query(params): Query<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let user_id = params.get("user_id").and_then(|v| v.as_str()).unwrap_or("");

    if user_id.is_empty() {
        return Json(ApiResponse::error(400, "用户ID不能为空"));
    }

    let result = sqlx::query_as::<_, ContactGroup>(
        r#"
        SELECT id, user_id, name, created_at, updated_at
        FROM im.contact_groups
        WHERE user_id = $1
        ORDER BY updated_at DESC
        "#,
    )
    .bind(user_id)
    .fetch_all(&pool)
    .await;

    match result {
        Ok(groups) => Json(ApiResponse::success(
            json!({
                "contact_groups": groups,
                "total": groups.len()
            }),
            "获取联系人分组成功",
        )),
        Err(e) => {
            tracing::error!("Failed to list contact groups: {}", e);
            Json(ApiResponse::error(500, "获取联系人分组失败"))
        }
    }
}

/// PUT /api/v1/contact-groups/:id - 更新联系人分组
pub async fn update_contact_group(
    State(pool): State<PgPool>,
    Path(group_id): Path<Uuid>,
    Json(payload): Json<CreateContactGroup>,
) -> Json<ApiResponse<ContactGroup>> {
    let now = Utc::now().naive_utc();

    let result = sqlx::query_as::<_, ContactGroup>(
        r#"
        UPDATE im.contact_groups
        SET name = $1, updated_at = $2
        WHERE id = $3
        RETURNING id, user_id, name, created_at, updated_at
        "#,
    )
    .bind(payload.name)
    .bind(now)
    .bind(group_id)
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(group)) => Json(ApiResponse::success(group, "更新联系人分组成功")),
        Ok(None) => Json(ApiResponse::error(404, "联系人分组不存在")),
        Err(e) => {
            tracing::error!("Failed to update contact group: {}", e);
            Json(ApiResponse::error(500, "更新联系人分组失败"))
        }
    }
}

/// DELETE /api/v1/contact-groups/:id - 删除联系人分组
pub async fn delete_contact_group(
    State(pool): State<PgPool>,
    Path(group_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let result = sqlx::query(
        r#"
        DELETE FROM im.contact_groups
        WHERE id = $1
        RETURNING id
        "#,
    )
    .bind(group_id)
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(_)) => Json(ApiResponse::success(
            json!({ "deleted": true }),
            "删除联系人分组成功",
        )),
        Ok(None) => Json(ApiResponse::error(404, "联系人分组不存在")),
        Err(e) => {
            tracing::error!("Failed to delete contact group: {}", e);
            Json(ApiResponse::error(500, "删除联系人分组失败"))
        }
    }
}

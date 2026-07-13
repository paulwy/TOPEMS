use axum::{
    extract::{Path, Query, State},
    Json,
};
use uuid::Uuid;

use crate::AppState;
use topems_shared::{api_error, api_success, ApiResponse};

use super::models::{
    Contact, ContactListResponse, ContactQuery, CreateContactRequest, UpdateContactRequest,
};

fn default_tenant_id() -> Uuid {
    Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
}

pub async fn list_contacts(
    State(state): State<AppState>,
    Query(query): Query<ContactQuery>,
) -> Json<ApiResponse<ContactListResponse>> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(10).clamp(1, 100);
    let offset = (page - 1) * page_size;
    let tenant_id = default_tenant_id();

    let total: i64 = match sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM core_crm_contacts
           WHERE tenant_id = $1
             AND ($2::uuid IS NULL OR customer_id = $2)
             AND ($3::text IS NULL OR name ILIKE '%' || $3 || '%')"#,
    )
    .bind(tenant_id)
    .bind(query.customer_id)
    .bind(query.search.clone())
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询联系人总数失败: {}", e);
            return Json(api_error(500, "查询联系人总数失败"));
        }
    };

    let items: Vec<Contact> = match sqlx::query_as(
        r#"SELECT id, tenant_id, customer_id, name, position, phone, email, is_primary,
                  created_at, updated_at
           FROM core_crm_contacts
           WHERE tenant_id = $1
             AND ($2::uuid IS NULL OR customer_id = $2)
             AND ($3::text IS NULL OR name ILIKE '%' || $3 || '%')
           ORDER BY is_primary DESC, created_at DESC
           LIMIT $4 OFFSET $5"#,
    )
    .bind(tenant_id)
    .bind(query.customer_id)
    .bind(query.search.clone())
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询联系人列表失败: {}", e);
            return Json(api_error(500, "查询联系人列表失败"));
        }
    };

    Json(api_success(ContactListResponse {
        items,
        total,
        page,
        page_size,
    }))
}

pub async fn get_contact(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Contact>> {
    let tenant_id = default_tenant_id();

    let contact: Option<Contact> = match sqlx::query_as(
        r#"SELECT id, tenant_id, customer_id, name, position, phone, email, is_primary,
                  created_at, updated_at
           FROM core_crm_contacts WHERE id = $1 AND tenant_id = $2"#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询联系人详情失败: {}", e);
            return Json(api_error(500, "查询联系人详情失败"));
        }
    };

    match contact {
        Some(contact) => Json(api_success(contact)),
        None => Json(api_error(404, "联系人不存在")),
    }
}

pub async fn create_contact(
    State(state): State<AppState>,
    Json(req): Json<CreateContactRequest>,
) -> Json<ApiResponse<Contact>> {
    if req.name.trim().is_empty() {
        return Json(api_error(400, "联系人姓名不能为空"));
    }

    let tenant_id = default_tenant_id();

    let contact: Contact = match sqlx::query_as(
        r#"INSERT INTO core_crm_contacts
               (tenant_id, customer_id, name, position, phone, email, is_primary)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id, tenant_id, customer_id, name, position, phone, email, is_primary,
                     created_at, updated_at"#,
    )
    .bind(tenant_id)
    .bind(req.customer_id)
    .bind(req.name)
    .bind(req.position)
    .bind(req.phone)
    .bind(req.email)
    .bind(req.is_primary.unwrap_or(false))
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("创建联系人失败: {}", e);
            return Json(api_error(500, "创建联系人失败"));
        }
    };

    Json(api_success(contact))
}

pub async fn update_contact(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateContactRequest>,
) -> Json<ApiResponse<Contact>> {
    let tenant_id = default_tenant_id();

    let contact: Option<Contact> = match sqlx::query_as(
        r#"UPDATE core_crm_contacts
           SET customer_id = COALESCE($1, customer_id),
               name = COALESCE($2, name),
               position = COALESCE($3, position),
               phone = COALESCE($4, phone),
               email = COALESCE($5, email),
               is_primary = COALESCE($6, is_primary),
               updated_at = NOW()
           WHERE id = $7 AND tenant_id = $8
           RETURNING id, tenant_id, customer_id, name, position, phone, email, is_primary,
                     created_at, updated_at"#,
    )
    .bind(req.customer_id)
    .bind(req.name)
    .bind(req.position)
    .bind(req.phone)
    .bind(req.email)
    .bind(req.is_primary)
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("更新联系人失败: {}", e);
            return Json(api_error(500, "更新联系人失败"));
        }
    };

    match contact {
        Some(contact) => Json(api_success(contact)),
        None => Json(api_error(404, "联系人不存在")),
    }
}

pub async fn delete_contact(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    let tenant_id = default_tenant_id();

    let result = sqlx::query(r#"DELETE FROM core_crm_contacts WHERE id = $1 AND tenant_id = $2"#)
        .bind(id)
        .bind(tenant_id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(api_success(true)),
        Ok(_) => Json(api_error(404, "联系人不存在")),
        Err(e) => {
            tracing::error!("删除联系人失败: {}", e);
            Json(api_error(500, "删除联系人失败"))
        }
    }
}

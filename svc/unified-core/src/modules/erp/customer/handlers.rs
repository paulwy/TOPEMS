use axum::{
    extract::{Path, Query, State},
    Json,
};
use uuid::Uuid;

use crate::AppState;
use topems_shared::{api_error, api_success, ApiResponse};

use super::models::{
    CreateCustomerRequest, Customer, CustomerListResponse, CustomerQuery, UpdateCustomerRequest,
};

fn default_tenant_id() -> Uuid {
    Uuid::parse_str("00000000-0000-0000-0000-000000000001").expect("hardcoded default UUID should always be valid")
}

pub async fn list_customers(
    State(state): State<AppState>,
    Query(query): Query<CustomerQuery>,
) -> Json<ApiResponse<CustomerListResponse>> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(10).clamp(1, 100);
    let offset = (page - 1) * page_size;
    let tenant_id = default_tenant_id();

    let total: i64 = match sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM core_erp_customers
           WHERE tenant_id = $1
             AND ($2::text IS NULL OR status = $2)
             AND ($3::text IS NULL OR code ILIKE '%' || $3 || '%' OR name ILIKE '%' || $3 || '%')"#,
    )
    .bind(tenant_id)
    .bind(query.status.clone())
    .bind(query.search.clone())
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询客户总数失败: {}", e);
            return Json(api_error(500, "查询客户总数失败"));
        }
    };

    let items: Vec<Customer> = match sqlx::query_as(
        r#"SELECT id, tenant_id, code, name, contact_person, phone, email, address,
                  status, created_at, updated_at
           FROM core_erp_customers
           WHERE tenant_id = $1
             AND ($2::text IS NULL OR status = $2)
             AND ($3::text IS NULL OR code ILIKE '%' || $3 || '%' OR name ILIKE '%' || $3 || '%')
           ORDER BY created_at DESC
           LIMIT $4 OFFSET $5"#,
    )
    .bind(tenant_id)
    .bind(query.status.clone())
    .bind(query.search.clone())
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询客户列表失败: {}", e);
            return Json(api_error(500, "查询客户列表失败"));
        }
    };

    Json(api_success(CustomerListResponse {
        items,
        total,
        page,
        page_size,
    }))
}

pub async fn get_customer(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Customer>> {
    let tenant_id = default_tenant_id();

    let customer: Option<Customer> = match sqlx::query_as(
        r#"SELECT id, tenant_id, code, name, contact_person, phone, email, address,
                  status, created_at, updated_at
           FROM core_erp_customers WHERE id = $1 AND tenant_id = $2"#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询客户详情失败: {}", e);
            return Json(api_error(500, "查询客户详情失败"));
        }
    };

    match customer {
        Some(customer) => Json(api_success(customer)),
        None => Json(api_error(404, "客户不存在")),
    }
}

pub async fn create_customer(
    State(state): State<AppState>,
    Json(req): Json<CreateCustomerRequest>,
) -> Json<ApiResponse<Customer>> {
    if req.code.trim().is_empty() {
        return Json(api_error(400, "客户编码不能为空"));
    }
    if req.name.trim().is_empty() {
        return Json(api_error(400, "客户名称不能为空"));
    }

    let tenant_id = default_tenant_id();

    let customer: Customer = match sqlx::query_as(
        r#"INSERT INTO core_erp_customers
               (tenant_id, code, name, contact_person, phone, email, address, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
           RETURNING id, tenant_id, code, name, contact_person, phone, email, address,
                     status, created_at, updated_at"#,
    )
    .bind(tenant_id)
    .bind(req.code)
    .bind(req.name)
    .bind(req.contact_person)
    .bind(req.phone)
    .bind(req.email)
    .bind(req.address)
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("创建客户失败: {}", e);
            return Json(api_error(500, "创建客户失败"));
        }
    };

    Json(api_success(customer))
}

pub async fn update_customer(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateCustomerRequest>,
) -> Json<ApiResponse<Customer>> {
    let tenant_id = default_tenant_id();

    let customer: Option<Customer> = match sqlx::query_as(
        r#"UPDATE core_erp_customers
           SET code = COALESCE($1, code),
               name = COALESCE($2, name),
               contact_person = COALESCE($3, contact_person),
               phone = COALESCE($4, phone),
               email = COALESCE($5, email),
               address = COALESCE($6, address),
               status = COALESCE($7, status),
               updated_at = NOW()
           WHERE id = $8 AND tenant_id = $9
           RETURNING id, tenant_id, code, name, contact_person, phone, email, address,
                     status, created_at, updated_at"#,
    )
    .bind(req.code)
    .bind(req.name)
    .bind(req.contact_person)
    .bind(req.phone)
    .bind(req.email)
    .bind(req.address)
    .bind(req.status)
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("更新客户失败: {}", e);
            return Json(api_error(500, "更新客户失败"));
        }
    };

    match customer {
        Some(customer) => Json(api_success(customer)),
        None => Json(api_error(404, "客户不存在")),
    }
}

pub async fn delete_customer(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    let tenant_id = default_tenant_id();

    let result = sqlx::query(r#"DELETE FROM core_erp_customers WHERE id = $1 AND tenant_id = $2"#)
        .bind(id)
        .bind(tenant_id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(api_success(true)),
        Ok(_) => Json(api_error(404, "客户不存在")),
        Err(e) => {
            tracing::error!("删除客户失败: {}", e);
            Json(api_error(500, "删除客户失败"))
        }
    }
}

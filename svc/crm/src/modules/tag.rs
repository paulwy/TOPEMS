use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::{delete, get},
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use sqlx::Row;
use uuid::Uuid;

use super::ApiState;
use crate::models::{
    AddTagToCustomerRequest, CreateTagRequest, CustomerWithTags, Tag, UpdateTagRequest,
};
use crate::modules::audit::{log_audit_event, AuditEventParams};
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::ApiResponse;
use topems_shared_auth::middleware::tenant::get_tenant_id;
use topems_shared_core::response::api_error;

#[derive(Debug, Deserialize)]
pub struct TagPaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/tags", get(list_tags).post(create_tag))
        .route(
            "/tags/{id}",
            get(get_tag).put(update_tag).delete(delete_tag),
        )
        .route("/tags/{id}/customers", get(get_tagged_customers))
        .route(
            "/customers/{id}/tags",
            get(get_customer_tags).post(add_tag_to_customer),
        )
        .route(
            "/customers/{id}/tags/{tag_id}",
            delete(remove_tag_from_customer),
        )
}

async fn list_tags(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    Query(params): Query<TagPaginationParams>,
    headers: HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, Tag>(
        r#"
        SELECT id, tenant_id, name, color, description, created_at, updated_at
        FROM crm.tags
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR name ILIKE $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(tenant_id)
    .bind(&search_pattern)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(tags) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM crm.tags
                WHERE deleted_at IS NULL AND tenant_id = $1
                  AND ($2::text IS NULL OR name ILIKE $2)
                "#,
            )
            .bind(tenant_id)
            .bind(&search_pattern)
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": tags,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取标签列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取标签列表失败: {}", e);
            Json(api_error(500, "获取标签列表失败"))
        }
    }
}

async fn create_tag(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateTagRequest>,
) -> Json<ApiResponse<Tag>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::CustomerWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    if req.name.is_empty() {
        return Json(api_error(400, "标签名称不能为空"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();
    let color = req.color.clone().unwrap_or_else(|| "#1890ff".to_string());
    let tenant_id = get_tenant_id(&claims, &headers);
    let org_id = Uuid::parse_str("00000000-0000-0000-0000-000000000001").expect("valid org uuid");

    let result = sqlx::query_as::<_, Tag>(

        r#"
        INSERT INTO crm.tags (id, tenant_id, name, color, description, created_at, updated_at, org_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, tenant_id, name, color, description, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .bind(&req.name)
    .bind(&color)
    .bind(&req.description)
    .bind(now)
    .bind(now)
    .bind(org_id)
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(tag) => (
            Json(ApiResponse::success(tag.clone(), "标签创建成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("创建标签失败: {}", e);
            (
                Json(api_error(500, "标签创建失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(tag) = &result {
        serde_json::to_value(tag).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "create".to_string(),
            entity_type: "tag".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: request_data,
            response_details: response_data,
            status: status_str,
            error_message: error_msg,
        },
        &headers,
    )
    .await;

    response
}

async fn get_tag(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<Tag>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, Tag>(
        r#"
        SELECT id, tenant_id, name, color, description, created_at, updated_at
        FROM crm.tags WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(tag)) => Json(ApiResponse::success(tag, "获取标签成功")),
        Ok(None) => Json(api_error(404, "标签不存在")),
        Err(e) => {
            tracing::error!("获取标签失败: {}", e);
            Json(api_error(500, "获取标签失败"))
        }
    }
}

async fn update_tag(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateTagRequest>,
) -> Json<ApiResponse<Tag>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::CustomerWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    let existing = sqlx::query_as::<_, Tag>(
        r#"
        SELECT id, tenant_id, name, color, description, created_at, updated_at FROM crm.tags WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut **txn)
    .await;

    let existing = match existing {
        Ok(Some(t)) => t,
        Ok(None) => return Json(api_error(404, "标签不存在")),
        Err(e) => return Json(api_error(500, &format!("查询标签失败: {}", e))),
    };

    let request_data = serde_json::to_value(&req).ok();

    let name = req.name.unwrap_or(existing.name);
    let color = req.color.unwrap_or(existing.color);
    let description = req.description.or(existing.description);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Tag>(
        r#"
        UPDATE crm.tags SET
            name = $2, color = $3, description = $4, updated_at = $5
        WHERE id = $1 AND tenant_id = $6
        RETURNING id, tenant_id, name, color, description, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&name)
    .bind(&color)
    .bind(&description)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(tag) => (
            Json(ApiResponse::success(tag.clone(), "标签更新成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("更新标签失败: {}", e);
            (
                Json(api_error(500, "标签更新失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(tag) = &result {
        serde_json::to_value(tag).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "update".to_string(),
            entity_type: "tag".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: request_data,
            response_details: response_data,
            status: status_str,
            error_message: error_msg,
        },
        &headers,
    )
    .await;

    response
}

async fn delete_tag(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::CustomerWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    let result =
        sqlx::query("UPDATE crm.tags SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2")
            .bind(id)
            .bind(tenant_id)
            .execute(&mut **txn)
            .await;

    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("提交事务失败: {}", e);
            return Json(api_error(500, "事务提交失败"));
        }
    }

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "标签删除成功")),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            Json(api_error(404, "标签不存在")),
            "error".to_string(),
            Some("标签不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除标签失败: {}", e);
            (
                Json(api_error(500, "标签删除失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(r) = &result {
        Some(serde_json::json!({ "rows_affected": r.rows_affected() }))
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "delete".to_string(),
            entity_type: "tag".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: None,
            response_details: response_data,
            status: status_str,
            error_message: error_msg,
        },
        &headers,
    )
    .await;

    response
}

async fn get_customer_tags(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<Vec<Tag>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, Tag>(
        r#"
        SELECT t.id, t.tenant_id, t.name, t.color, t.description, t.created_at, t.updated_at
        FROM crm.tags t
        JOIN crm.customer_tags ct ON t.id = ct.tag_id
        WHERE ct.customer_id = $1 AND t.tenant_id = $2
        ORDER BY t.created_at DESC
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(tags) => Json(ApiResponse::success(tags, "获取客户标签成功")),
        Err(e) => {
            tracing::error!("获取客户标签失败: {}", e);
            Json(api_error(500, "获取客户标签失败"))
        }
    }
}

async fn add_tag_to_customer(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<AddTagToCustomerRequest>,
) -> Json<ApiResponse<String>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::CustomerWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let customer_id = id;
    let tag_id = req.tag_id;
    let tenant_id = get_tenant_id(&claims, &headers);
    let org_id = Uuid::parse_str("00000000-0000-0000-0000-000000000001").expect("valid org uuid");

    let exists = sqlx::query_scalar::<_, bool>(

        "SELECT EXISTS(SELECT 1 FROM crm.customer_tags WHERE customer_id = $1 AND tag_id = $2 AND tenant_id = $3)",
    )
    .bind(customer_id)
    .bind(tag_id)
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await
    .unwrap_or(false);

    if exists {
        return Json(api_error(400, "标签已添加到客户"));
    }

    let result = sqlx::query(
        "INSERT INTO crm.customer_tags (customer_id, tag_id, tenant_id, org_id) VALUES ($1, $2, $3, $4)",
    )
    .bind(customer_id)
    .bind(tag_id)
    .bind(tenant_id)
    .bind(org_id)
    .execute(&mut **txn)
    .await;

    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("提交事务失败: {}", e);
            return Json(api_error(500, "事务提交失败"));
        }
    }

    let (response, status_str, error_msg) = match &result {
        Ok(_) => (
            Json(ApiResponse::success("".to_string(), "标签添加成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("添加标签失败: {}", e);
            (
                Json(api_error(500, "添加标签失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "add_tag".to_string(),
            entity_type: "customer_tag".to_string(),
            entity_id: None,
            entity_ids: None,
            user_id: Some(customer_id.to_string()),
            user_name: Some(tag_id.to_string()),
            request_details: Some(
                serde_json::json!({ "customer_id": customer_id, "tag_id": tag_id }),
            ),
            response_details: None,
            status: status_str,
            error_message: error_msg,
        },
        &headers,
    )
    .await;

    response
}

async fn remove_tag_from_customer(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    Path((id, tag_id)): Path<(Uuid, Uuid)>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::CustomerWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let customer_id = id;
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query(
        "DELETE FROM crm.customer_tags WHERE customer_id = $1 AND tag_id = $2 AND tenant_id = $3",
    )
    .bind(customer_id)
    .bind(tag_id)
    .bind(tenant_id)
    .execute(&mut **txn)
    .await;

    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("提交事务失败: {}", e);
            return Json(api_error(500, "事务提交失败"));
        }
    }

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "标签移除成功")),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            Json(api_error(404, "客户标签关系不存在")),
            "error".to_string(),
            Some("客户标签关系不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("移除标签失败: {}", e);
            (
                Json(api_error(500, "移除标签失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "remove_tag".to_string(),
            entity_type: "customer_tag".to_string(),
            entity_id: None,
            entity_ids: None,
            user_id: Some(customer_id.to_string()),
            user_name: Some(tag_id.to_string()),
            request_details: None,
            response_details: None,
            status: status_str,
            error_message: error_msg,
        },
        &headers,
    )
    .await;

    response
}

async fn get_tagged_customers(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<Vec<CustomerWithTags>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    let customers = sqlx::query(
        r#"
        SELECT c.id as customer_id, c.name as customer_name
        FROM crm.customers c
        JOIN crm.customer_tags ct ON c.id = ct.customer_id
        WHERE ct.tag_id = $1 AND c.tenant_id = $2
        ORDER BY c.created_at DESC
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_all(&mut **txn)
    .await;

    match customers {
        Ok(customers) => {
            let mut result = Vec::new();
            for customer in customers {
                let customer_id: Uuid = customer.get("customer_id");
                let customer_name: String = customer.get("customer_name");
                let tags = sqlx::query_as::<_, Tag>(
                    r#"
                    SELECT t.id, t.tenant_id, t.name, t.color, t.description, t.created_at, t.updated_at
                    FROM crm.tags t
                    JOIN crm.customer_tags ct ON t.id = ct.tag_id
                    WHERE ct.customer_id = $1 AND t.tenant_id = $2
                    "#,
                )
                .bind(customer_id)
                .bind(tenant_id)
                .fetch_all(&mut **txn)
                .await
                .unwrap_or_default();

                result.push(CustomerWithTags {
                    customer_id,
                    customer_name,
                    tags,
                });
            }
            Json(ApiResponse::success(result, "获取标签关联客户成功"))
        }
        Err(e) => {
            tracing::error!("获取标签关联客户失败: {}", e);
            Json(api_error(500, "获取标签关联客户失败"))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tag_pagination_params_deserialize() {
        let query = "page=1&page_size=20&search=vip";
        let params: TagPaginationParams = serde_urlencoded::from_str(query).unwrap();
        assert_eq!(params.page, Some(1));
        assert_eq!(params.page_size, Some(20));
        assert_eq!(params.search.as_deref(), Some("vip"));
    }

    #[test]
    fn test_tag_pagination_params_default() {
        let query = "";
        let params: TagPaginationParams = serde_urlencoded::from_str(query).unwrap();
        assert!(params.page.is_none());
        assert!(params.page_size.is_none());
        assert!(params.search.is_none());
    }
}

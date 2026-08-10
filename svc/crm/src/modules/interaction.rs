use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use uuid::Uuid;

use super::ApiState;
use crate::middleware::tenant::get_tenant_id;
use crate::models::{CreateInteractionRequest, Interaction, UpdateInteractionRequest};
use crate::modules::audit::{log_audit_event, AuditEventParams};
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::{ApiResponse, ListResponse};
use topems_shared_core::response::api_error;

#[derive(Debug, Deserialize)]
pub struct InteractionPaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub customer_id: Option<Uuid>,
    pub contact_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct BatchDeleteRequest {
    pub ids: Vec<Uuid>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route(
            "/interactions",
            get(list_interactions).post(create_interaction),
        )
        .route(
            "/interactions/batch-delete",
            post(batch_delete_interactions),
        )
        .route(
            "/interactions/{id}",
            get(get_interaction)
                .put(update_interaction)
                .delete(delete_interaction),
        )
}

async fn list_interactions(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<InteractionPaginationParams>,
    headers: HeaderMap,
) -> Json<ApiResponse<ListResponse<Interaction>>> {
    match check_permission(&state.db, &claims, &ModulePermission::InteractionRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();
    let customer_filter = params.customer_id;
    let contact_filter = params.contact_id;
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, Interaction>(
        r#"
        SELECT id, tenant_id, customer_id, contact_id, type as type_, subject, content, scheduled_at, completed_at, status, created_at, updated_at
        FROM crm.interactions
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR subject ILIKE $2)
          AND ($3::text IS NULL OR status = $3)
          AND ($4::uuid IS NULL OR customer_id = $4)
          AND ($5::uuid IS NULL OR contact_id = $5)
        ORDER BY created_at DESC
        LIMIT $6 OFFSET $7
        "#,
    )
    .bind(tenant_id)
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(&customer_filter)
    .bind(&contact_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(interactions) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM crm.interactions
                WHERE deleted_at IS NULL AND tenant_id = $1
                  AND ($2::text IS NULL OR subject ILIKE $2)
                  AND ($3::text IS NULL OR status = $3)
                  AND ($4::uuid IS NULL OR customer_id = $4)
                  AND ($5::uuid IS NULL OR contact_id = $5)
                "#,
            )
            .bind(tenant_id)
            .bind(&search_pattern)
            .bind(&status_filter)
            .bind(&customer_filter)
            .bind(&contact_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                ListResponse::with_pagination(interactions, total, page, page_size),
                "获取交互记录列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取交互记录列表失败: {}", e);
            Json(api_error(500, "获取交互记录列表失败"))
        }
    }
}

async fn create_interaction(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateInteractionRequest>,
) -> Json<ApiResponse<Interaction>> {
    match check_permission(&state.db, &claims, &ModulePermission::InteractionWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    if req.type_.is_empty() {
        return Json(api_error(400, "交互类型不能为空"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, Interaction>(
        r#"
        INSERT INTO crm.interactions (
            id, tenant_id, customer_id, contact_id, type, subject, content, scheduled_at, notes, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'scheduled', $10, $11)
        RETURNING id, tenant_id, customer_id, contact_id, type as type_, subject, content, scheduled_at, completed_at, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .bind(&req.customer_id)
    .bind(&req.contact_id)
    .bind(&req.type_)
    .bind(&req.subject)
    .bind(&req.content)
    .bind(&req.scheduled_at)
    .bind(&req.notes)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(interaction) => (
            Json(ApiResponse::success(
                interaction.clone(),
                "交互记录创建成功",
            )),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("创建交互记录失败: {}", e);
            (
                Json(api_error(500, "交互记录创建失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(interaction) = &result {
        serde_json::to_value(interaction).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "create".to_string(),
            entity_type: "interaction".to_string(),
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

async fn get_interaction(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<Interaction>> {
    match check_permission(&state.db, &claims, &ModulePermission::InteractionRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, Interaction>(
        r#"
        SELECT id, tenant_id, customer_id, contact_id, type as type_, subject, content, scheduled_at, completed_at, status, created_at, updated_at
        FROM crm.interactions WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(interaction)) => Json(ApiResponse::success(interaction, "获取交互记录成功")),
        Ok(None) => Json(api_error(404, "交互记录不存在")),
        Err(e) => {
            tracing::error!("获取交互记录失败: {}", e);
            Json(api_error(500, "获取交互记录失败"))
        }
    }
}

async fn update_interaction(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateInteractionRequest>,
) -> Json<ApiResponse<Interaction>> {
    match check_permission(&state.db, &claims, &ModulePermission::InteractionWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    let existing = sqlx::query_as::<_, Interaction>(
        r#"
        SELECT id, tenant_id, customer_id, contact_id, type as type_, subject, content, scheduled_at, completed_at, status, created_at, updated_at FROM crm.interactions WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(i)) => i,
        Ok(None) => return Json(api_error(404, "交互记录不存在")),
        Err(e) => return Json(api_error(500, &format!("查询交互记录失败: {}", e))),
    };

    let request_data = serde_json::to_value(&req).ok();

    let type_ = req.type_.unwrap_or(existing.type_);
    let subject = req.subject.or(existing.subject);
    let content = req.content.or(existing.content);
    let scheduled_at = req.scheduled_at.or(existing.scheduled_at);
    let completed_at = req.completed_at.or(existing.completed_at);
    let status = req.status.unwrap_or(existing.status);
    let customer_id = req.customer_id.or(existing.customer_id);
    let contact_id = req.contact_id.or(existing.contact_id);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Interaction>(
        r#"
        UPDATE crm.interactions SET
            customer_id = $2, contact_id = $3, type = $4, subject = $5, content = $6,
            scheduled_at = $7, completed_at = $8, status = $9, updated_at = $10
        WHERE id = $1 AND tenant_id = $11
        RETURNING id, tenant_id, customer_id, contact_id, type as type_, subject, content, scheduled_at, completed_at, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&customer_id)
    .bind(&contact_id)
    .bind(&type_)
    .bind(&subject)
    .bind(&content)
    .bind(&scheduled_at)
    .bind(&completed_at)
    .bind(&status)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(interaction) => (
            Json(ApiResponse::success(
                interaction.clone(),
                "交互记录更新成功",
            )),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("更新交互记录失败: {}", e);
            (
                Json(api_error(500, "交互记录更新失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(interaction) = &result {
        serde_json::to_value(interaction).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "update".to_string(),
            entity_type: "interaction".to_string(),
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

async fn delete_interaction(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &ModulePermission::InteractionWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query(
        "UPDATE crm.interactions SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .execute(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "交互记录删除成功")),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            Json(api_error(404, "交互记录不存在")),
            "error".to_string(),
            Some("交互记录不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除交互记录失败: {}", e);
            (
                Json(api_error(500, "交互记录删除失败")),
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
            entity_type: "interaction".to_string(),
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

async fn batch_delete_interactions(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<BatchDeleteRequest>,
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &ModulePermission::InteractionWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    if req.ids.is_empty() {
        return Json(api_error(400, "请选择要删除的交互记录"));
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query(
        "UPDATE crm.interactions SET deleted_at = NOW() WHERE id = ANY($1) AND tenant_id = $2",
    )
    .bind(&req.ids)
    .bind(tenant_id)
    .execute(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) => (
            Json(ApiResponse::success(
                "".to_string(),
                &format!("成功删除 {} 个交互记录", r.rows_affected()),
            )),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("批量删除交互记录失败: {}", e);
            (
                Json(api_error(500, "批量删除交互记录失败")),
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
            action: "batch_delete".to_string(),
            entity_type: "interaction".to_string(),
            entity_id: None,
            entity_ids: serde_json::to_value(&req.ids).ok(),
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

use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::get,
    Json, Router,
};
use serde::Deserialize;
use uuid::Uuid;

use super::ApiState;
use crate::models::interaction::CreateInteractionRequest;
use crate::models::{Interaction, UpdateInteractionRequest};
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

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route(
            "/interactions",
            get(list_interactions)
                .post(create_interaction)
                .route_layer(axum::extract::DefaultBodyLimit::max(1 << 20)),
        )
        .route(
            "/interactions/batch-delete",
            axum::routing::post(batch_delete_interactions),
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
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    Query(params): Query<InteractionPaginationParams>,
    _headers: HeaderMap,
) -> Json<ApiResponse<ListResponse<Interaction>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::InteractionRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let page = params.page.unwrap_or(1).max(1).min(1000);
    let page_size = params.page_size.unwrap_or(20).min(200);
    let offset = (page - 1) * page_size;

    let search = params
        .search
        .as_ref()
        .map(|s| s.trim()[..s.len().min(100)].to_string());
    let search_pattern = search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();
    let customer_filter = params.customer_id;
    let contact_filter = params.contact_id;
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });

    let result = sqlx::query_as::<_, Interaction>(
        r#"
        SELECT id, tenant_id, customer_id, contact_id, type as type_, subject, content, scheduled_at, completed_at, status, notes, created_at, updated_at, deleted_at
        FROM crm.interactions
        WHERE ($1::uuid IS NULL OR tenant_id = $1) AND deleted_at IS NULL
          AND ($2::text IS NULL OR subject ILIKE $2 OR content ILIKE $2)
          AND ($3::text IS NULL OR status = $3)
          AND ($4::uuid IS NULL OR customer_id = $4)
          AND ($5::uuid IS NULL OR contact_id = $5)
        ORDER BY created_at DESC
        LIMIT $6 OFFSET $7
        "#,
    )
    .bind(tenant_opt)
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(customer_filter)
    .bind(contact_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(interactions) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM crm.interactions
                WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1)
                  AND ($2::text IS NULL OR subject ILIKE $2 OR content ILIKE $2)
                  AND ($3::text IS NULL OR status = $3)
                  AND ($4::uuid IS NULL OR customer_id = $4)
                  AND ($5::uuid IS NULL OR contact_id = $5)
                "#,
            )
            .bind(tenant_opt)
            .bind(&search_pattern)
            .bind(&status_filter)
            .bind(customer_filter)
            .bind(contact_filter)
            .fetch_one(&mut **txn)
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

async fn get_interaction(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: HeaderMap,
) -> Json<ApiResponse<Interaction>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::InteractionRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });

    let result = sqlx::query_as::<_, Interaction>(
        r#"
        SELECT id, tenant_id, customer_id, contact_id, type as type_, subject, content, scheduled_at, completed_at, status, notes, created_at, updated_at, deleted_at
        FROM crm.interactions WHERE id = $1 AND ($2::uuid IS NULL OR tenant_id = $2) AND deleted_at IS NULL
        "#,
    )
    .bind(id)
    .bind(tenant_opt)
    .fetch_optional(&mut **txn)
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

const ORG_ID_FALLBACK: &str = "00000000-0000-0000-0000-000000000001";

async fn create_interaction(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(req): Json<CreateInteractionRequest>,
) -> Json<ApiResponse<Interaction>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::InteractionWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
    let org_id = Uuid::parse_str(ORG_ID_FALLBACK).expect("valid org uuid");
    let now = chrono::Utc::now();
    let type_ = if req.type_.trim().is_empty() {
        return Json(api_error(400, "交互类型 type 不能为空"));
    } else {
        req.type_
    };

    let result = sqlx::query_as::<_, Interaction>(
        r#"
        INSERT INTO crm.interactions
        (tenant_id, org_id, customer_id, contact_id, interaction_type, subject, content, scheduled_at, completed_at, status, notes, created_at, updated_at, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL, 'scheduled', $9, $10, $10, $11)
        RETURNING id, tenant_id, customer_id, contact_id, interaction_type as type_, subject, content, scheduled_at, completed_at, status, notes, created_at, updated_at, deleted_at
        "#,
    )
    .bind(tenant_id)
    .bind(org_id)
    .bind(req.customer_id)
    .bind(req.contact_id)
    .bind(&type_)
    .bind(req.subject.as_deref())
    .bind(req.content.as_deref())
    .bind(req.scheduled_at)
    .bind(req.notes.as_deref())
    .bind(now)
    .bind(claims.user_id().ok())
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(record) => Json(ApiResponse::success(record, "创建交互记录成功")),
        Err(e) => {
            tracing::error!("创建交互记录失败: {}", e);
            Json(api_error(500, "创建交互记录失败"))
        }
    }
}

async fn update_interaction(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: HeaderMap,
    Json(req): Json<UpdateInteractionRequest>,
) -> Json<ApiResponse<Interaction>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::InteractionWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
    let now = chrono::Utc::now();

    let result = sqlx::query_as::<_, Interaction>(
        r#"
        UPDATE crm.interactions SET
            customer_id = COALESCE($3, customer_id),
            contact_id = COALESCE($4, contact_id),
            interaction_type = COALESCE($5, interaction_type),
            subject = COALESCE($6, subject),
            content = COALESCE($7, content),
            scheduled_at = COALESCE($8, scheduled_at),
            completed_at = COALESCE($9, completed_at),
            status = COALESCE($10, status),
            notes = COALESCE($11, notes),
            updated_at = $12,
            updated_by = $13
        WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
        RETURNING id, tenant_id, customer_id, contact_id, interaction_type as type_, subject, content, scheduled_at, completed_at, status, notes, created_at, updated_at, deleted_at
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .bind(req.customer_id)
    .bind(req.contact_id)
    .bind(req.type_.as_deref())
    .bind(req.subject.as_deref())
    .bind(req.content.as_deref())
    .bind(req.scheduled_at)
    .bind(req.completed_at)
    .bind(req.status.as_deref())
    .bind(req.notes.as_deref())
    .bind(now)
    .bind(claims.user_id().ok())
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(record)) => Json(ApiResponse::success(record, "更新交互记录成功")),
        Ok(None) => Json(api_error(404, "交互记录不存在")),
        Err(e) => {
            tracing::error!("更新交互记录失败: {}", e);
            Json(api_error(500, "更新交互记录失败"))
        }
    }
}

async fn delete_interaction(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::InteractionWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
    let result = sqlx::query(
        "UPDATE crm.interactions SET deleted_at = $3 WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL",
    )
    .bind(id)
    .bind(tenant_id)
    .bind(chrono::Utc::now())
    .execute(&mut **txn)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success(
            serde_json::json!({ "deleted": true }),
            "删除交互记录成功",
        )),
        Ok(_) => Json(api_error(404, "交互记录不存在")),
        Err(e) => {
            tracing::error!("删除交互记录失败: {}", e);
            Json(api_error(500, "删除交互记录失败"))
        }
    }
}

async fn batch_delete_interactions(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::InteractionWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
    // 前端发 { ids: string[] }；容错解析失败返回空删除
    let ids: Vec<Uuid> = req
        .get("ids")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str())
                .filter_map(|s| Uuid::parse_str(s).ok())
                .collect()
        })
        .unwrap_or_default();

    if ids.is_empty() {
        return Json(ApiResponse::success(
            serde_json::json!({ "deleted": 0 }),
            "批量删除成功",
        ));
    }

    let result = sqlx::query(
        "UPDATE crm.interactions SET deleted_at = $3 WHERE id = ANY($1) AND tenant_id = $2 AND deleted_at IS NULL",
    )
    .bind(&ids)
    .bind(tenant_id)
    .bind(chrono::Utc::now())
    .execute(&mut **txn)
    .await;

    match result {
        Ok(r) => Json(ApiResponse::success(
            serde_json::json!({ "deleted": r.rows_affected() }),
            "批量删除成功",
        )),
        Err(e) => {
            tracing::error!("批量删除交互记录失败: {}", e);
            Json(api_error(500, "批量删除交互记录失败"))
        }
    }
}

#[allow(dead_code)]
struct _Unused(UpdateInteractionRequest);

#[cfg(test)]
mod tests {
    use super::*;

    use uuid::Uuid;

    #[test]
    fn interaction_pagination_params_empty() {
        let json = r#"{}"#;
        let q: InteractionPaginationParams = serde_json::from_str(json).unwrap();
        assert!(q.page.is_none());
        assert!(q.page_size.is_none());
        assert!(q.search.is_none());
        assert!(q.status.is_none());
        assert!(q.customer_id.is_none());
        assert!(q.contact_id.is_none());
    }

    #[test]
    fn interaction_pagination_params_all() {
        let cid = Uuid::new_v4();
        let coid = Uuid::new_v4();
        let json = format!(
            r#"{{"page":3,"page_size":25,"search":"hello","status":"scheduled","customer_id":"{}","contact_id":"{}"}}"#,
            cid, coid
        );
        let q: InteractionPaginationParams = serde_json::from_str(&json).unwrap();
        assert_eq!(q.page, Some(3));
        assert_eq!(q.page_size, Some(25));
        assert_eq!(q.search.as_deref(), Some("hello"));
        assert_eq!(q.status.as_deref(), Some("scheduled"));
        assert_eq!(q.customer_id, Some(cid));
        assert_eq!(q.contact_id, Some(coid));
    }

    #[test]
    fn interaction_pagination_params_partial() {
        let json = r#"{"status":"completed","page":1}"#;
        let q: InteractionPaginationParams = serde_json::from_str(json).unwrap();
        assert_eq!(q.status.as_deref(), Some("completed"));
        assert_eq!(q.page, Some(1));
        assert!(q.search.is_none());
    }

    #[test]
    fn interaction_pagination_params_invalid_uuid_fails() {
        let json = r#"{"customer_id":"not-a-uuid"}"#;
        let res: Result<InteractionPaginationParams, _> = serde_json::from_str(json);
        assert!(res.is_err());
    }

    #[test]
    fn create_routes_smoke() {
        let _router: Router<ApiState> = create_routes();
    }
}

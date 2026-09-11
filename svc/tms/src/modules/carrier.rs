//! Carrier handlers - 承运商管理

use axum::{
    extract::{FromRef, Path, Query, State},
    http::HeaderMap,
    routing::{get, post},
    Extension, Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::shared::fsm::{carrier_can_transition, carrier_requires_approval};
use crate::shared::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::get_tenant_id;
use topems_shared_core::cache::{record_cache_hit, record_cache_miss, record_cache_set};
use topems_shared_core::response::{api_error, ApiResponse, PaginationParams};

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Carrier {
    pub id: Uuid,
    pub carrier_no: String,
    pub name: String,
    pub contact_person: Option<String>,
    pub contact_phone: Option<String>,
    pub status: String,
    pub service_area: Option<String>,
    pub tenant_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateCarrierRequest {
    pub carrier_no: String,
    pub name: String,
    pub contact_person: Option<String>,
    pub contact_phone: Option<String>,
    pub service_area: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateCarrierRequest {
    pub name: Option<String>,
    pub contact_person: Option<String>,
    pub contact_phone: Option<String>,
    pub status: Option<String>,
    pub service_area: Option<String>,
}

pub fn create_routes<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
    AppState: FromRef<S>,
{
    Router::new()
        .route("/carriers", get(list_carriers).post(create_carrier))
        .route(
            "/carriers/{id}",
            get(get_carrier).put(update_carrier).delete(delete_carrier),
        )
        .route(
            "/carriers/{id}/submit-qualification",
            post(submit_qualification),
        )
        .route("/carriers/{id}/approve", post(approve_carrier))
        .route("/carriers/{id}/reject", post(reject_carrier))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["tms:carrier:read"])),
    path = "/api/tms/carriers",
    responses(
        (status = 200, description = "list_carriers OK")
    ),
    tag = "TMS - Carrier"
)]
pub async fn list_carriers(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();
    let tenant_id = get_tenant_id(&claims, &headers);

    // 构建缓存 Key（遵循统一命名规范：{service}:{entity}:list:{tenant_id}:page:{page}:pagesize:{pagesize}:{params}）
    let cache_key = format!(
        "tms:carrier:list:{}:page:{}:pagesize:{}:search:{}:status:{}",
        tenant_id,
        page,
        page_size,
        params.search.clone().unwrap_or_else(|| "none".to_string()),
        params.status.clone().unwrap_or_else(|| "all".to_string())
    );

    // 检查缓存（在获取事务锁之前，避免不必要的锁等待）
    if let Some(cached) = state.dict_cache.get(&cache_key).await {
        record_cache_hit("tms", "carrier", "list");
        tracing::debug!(
            event_type = "cache_hit",
            service = "tms",
            entity = "carrier",
            operation = "list",
            tenant_id = %tenant_id,
            cache_key = %cache_key,
            "承运商列表缓存命中"
        );
        return Json(ApiResponse::success(cached, "获取承运商列表成功"));
    }

    // 缓存未命中，记录指标
    record_cache_miss("tms", "carrier", "list");

    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");

    let result = sqlx::query_as::<_, Carrier>(
        r#"
        SELECT id, carrier_no, name, contact_person, contact_phone, status, service_area, tenant_id, created_at, updated_at
        FROM tms.tms_carriers
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR carrier_no ILIKE $2 OR name ILIKE $2)
          AND ($3::text IS NULL OR status = $3)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(tenant_id)
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(carriers) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM tms.tms_carriers
                WHERE tenant_id = $1
                  AND ($2::text IS NULL OR carrier_no ILIKE $2 OR name ILIKE $2)
                  AND ($3::text IS NULL OR status = $3)
                "#,
            )
            .bind(tenant_id)
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);
            let response_data = serde_json::json!({
                "carriers": carriers,
                "total": total,
                "page": page,
                "page_size": page_size
            });

            // 写入缓存
            state
                .dict_cache
                .set(cache_key.clone(), response_data.clone())
                .await;
            record_cache_set("tms", "carrier", "list");
            tracing::debug!(
                event_type = "cache_set",
                service = "tms",
                entity = "carrier",
                operation = "list",
                tenant_id = %tenant_id,
                cache_key = %cache_key,
                "承运商列表缓存写入"
            );

            Json(ApiResponse::success(response_data, "获取承运商列表成功"))
        }
        Err(e) => {
            tracing::error!("获取承运商列表失败: {}", e);
            Json(api_error(500, "获取承运商列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["tms:carrier:read"])),
    path = "/api/tms/carriers",
    request_body = CreateCarrierRequest,
    responses(
        (status = 200, description = "create_carrier OK")
    ),
    tag = "TMS - Carrier"
)]
pub async fn create_carrier(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CreateCarrierRequest>,
) -> Json<ApiResponse<Carrier>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let id = Uuid::new_v4();
    let now = Utc::now();
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, Carrier>(
        r#"
        INSERT INTO tms.tms_carriers (id, carrier_no, name, contact_person, contact_phone, status, service_area, tenant_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, 'active', $6, $7, $8, $9)
        RETURNING id, carrier_no, name, contact_person, contact_phone, status, service_area, tenant_id, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.carrier_no)
    .bind(&req.name)
    .bind(&req.contact_person)
    .bind(&req.contact_phone)
    .bind(&req.service_area)
    .bind(tenant_id)
    .bind(now)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(carrier) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return Json(ApiResponse::error(500, "提交事务失败"));
                }
            }

            // 失效列表缓存（创建后列表数据可能变化）
            state.dict_cache.clear_l1();

            // 发布缓存失效事件，通知其他服务失效相关缓存
            if let Some(ref publisher) = state.event_publisher {
                let publisher = publisher.clone();
                tokio::spawn(async move {
                    if let Err(e) = publisher
                        .publish_cache_invalidated(
                            "tms:carrier:*",
                            "pattern",
                            Some("carrier_created"),
                        )
                        .await
                    {
                        tracing::warn!("发布缓存失效事件失败: {}", e);
                    }
                });
            }

            Json(ApiResponse::success(carrier, "承运商创建成功"))
        }
        Err(e) => {
            tracing::error!("创建承运商失败: {}", e);
            Json(api_error(500, "承运商创建失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["tms:carrier:read"])),
    path = "/api/tms/carriers/{id}",
    params(
        ("id" = Uuid, Path, description = "承运商 ID")
    ),
    responses(
        (status = 200, description = "get_carrier OK")
    ),
    tag = "TMS - Carrier"
)]
pub async fn get_carrier(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<Carrier>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, Carrier>(
        r#"
        SELECT id, carrier_no, name, contact_person, contact_phone, status, service_area, tenant_id, created_at, updated_at
        FROM tms.tms_carriers WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(carrier)) => Json(ApiResponse::success(carrier, "获取承运商成功")),
        Ok(None) => Json(api_error(404, "承运商不存在")),
        Err(e) => {
            tracing::error!("获取承运商失败: {}", e);
            Json(api_error(500, "获取承运商失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["tms:carrier:read"])),
    path = "/api/tms/carriers/{id}",
    request_body = UpdateCarrierRequest,
    params(
        ("id" = Uuid, Path, description = "承运商 ID")
    ),
    responses(
        (status = 200, description = "update_carrier OK")
    ),
    tag = "TMS - Carrier"
)]
pub async fn update_carrier(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<UpdateCarrierRequest>,
) -> Json<ApiResponse<Carrier>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let tenant_id = get_tenant_id(&claims, &headers);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Carrier>(
        r#"
        UPDATE tms.tms_carriers SET
            name = COALESCE($2, name),
            contact_person = COALESCE($3, contact_person),
            contact_phone = COALESCE($4, contact_phone),
            status = COALESCE($5, status),
            service_area = COALESCE($6, service_area),
            updated_at = $7
        WHERE id = $1 AND tenant_id = $8
        RETURNING id, carrier_no, name, contact_person, contact_phone, status, service_area, tenant_id, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.name)
    .bind(&req.contact_person)
    .bind(&req.contact_phone)
    .bind(&req.status)
    .bind(&req.service_area)
    .bind(now)
    .bind(tenant_id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(carrier)) => {
            // 失效列表缓存（更新后列表数据可能变化）
            state.dict_cache.clear_l1();

            // 发布缓存失效事件，通知其他服务失效相关缓存
            if let Some(ref publisher) = state.event_publisher {
                let publisher = publisher.clone();
                tokio::spawn(async move {
                    if let Err(e) = publisher
                        .publish_cache_invalidated(
                            "tms:carrier:*",
                            "pattern",
                            Some("carrier_updated"),
                        )
                        .await
                    {
                        tracing::warn!("发布缓存失效事件失败: {}", e);
                    }
                });
            }

            Json(ApiResponse::success(carrier, "承运商更新成功"))
        }
        Ok(None) => Json(api_error(404, "承运商不存在")),
        Err(e) => {
            tracing::error!("更新承运商失败: {}", e);
            Json(api_error(500, "更新承运商失败"))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["tms:carrier:read"])),
    path = "/api/tms/carriers/{id}",
    params(
        ("id" = Uuid, Path, description = "承运商 ID")
    ),
    responses(
        (status = 200, description = "delete_carrier OK")
    ),
    tag = "TMS - Carrier"
)]
pub async fn delete_carrier(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<String>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query("DELETE FROM tms.tms_carriers WHERE id = $1 AND tenant_id = $2")
        .bind(id)
        .bind(tenant_id)
        .execute(&mut **txn)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            // 失效列表缓存（删除后列表数据可能变化）
            state.dict_cache.clear_l1();

            // 发布缓存失效事件，通知其他服务失效相关缓存
            if let Some(ref publisher) = state.event_publisher {
                let publisher = publisher.clone();
                tokio::spawn(async move {
                    if let Err(e) = publisher
                        .publish_cache_invalidated(
                            "tms:carrier:*",
                            "pattern",
                            Some("carrier_deleted"),
                        )
                        .await
                    {
                        tracing::warn!("发布缓存失效事件失败: {}", e);
                    }
                });
            }

            Json(ApiResponse::success("".to_string(), "承运商删除成功"))
        }
        Ok(_) => Json(api_error(404, "承运商不存在")),
        Err(e) => {
            tracing::error!("删除承运商失败: {}", e);
            Json(api_error(500, "承运商删除失败"))
        }
    }
}

// ==================== Approval Endpoints ====================

/// 审批请求体
#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct ApprovalRequest {
    pub operator: String,
    pub comment: Option<String>,
}

const CARRIER_RETURN: &str = r#"id, carrier_no, name, contact_person, contact_phone, status, service_area, tenant_id, created_at, updated_at"#;

/// Submit carrier for qualification review (no state change, just flag)
#[utoipa::path(
    post,
    security(("BearerAuth" = ["tms:write"])),
    path = "/api/tms/carriers/{id}/submit-qualification",
    request_body = ApprovalRequest,
    params(
        ("id" = Uuid, Path, description = "承运商 ID")
    ),
    responses(
        (status = 200, description = "submit_qualification OK")
    ),
    tag = "TMS - Carrier"
)]
pub async fn submit_qualification(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<ApprovalRequest>,
) -> Json<ApiResponse<Carrier>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, Carrier>(&format!(
        r#"SELECT {} FROM tms.tms_carriers WHERE id = $1 AND tenant_id = $2"#,
        CARRIER_RETURN
    ))
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(carrier)) => {
            tracing::info!(
                "carrier {} submit_qualification: status={}, operator={}",
                id,
                carrier.status,
                req.operator
            );
            Json(ApiResponse::success(carrier, "承运商已提交资质审核"))
        }
        Ok(None) => Json(api_error(404, "承运商不存在")),
        Err(e) => {
            tracing::error!("提交资质审核失败: {}", e);
            Json(api_error(500, "提交资质审核失败"))
        }
    }
}

/// Approve carrier (pending_review → active)
#[utoipa::path(
    post,
    security(("BearerAuth" = ["tms:carrier:read"])),
    path = "/api/tms/carriers/{id}/approve",
    request_body = ApprovalRequest,
    params(
        ("id" = Uuid, Path, description = "承运商 ID")
    ),
    responses(
        (status = 200, description = "approve_carrier OK")
    ),
    tag = "TMS - Carrier"
)]
pub async fn approve_carrier(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<ApprovalRequest>,
) -> Json<ApiResponse<Carrier>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let tenant_id = get_tenant_id(&claims, &headers);
    let now = Utc::now();

    let current = sqlx::query_scalar::<_, String>(
        "SELECT status FROM tms.tms_carriers WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut **txn)
    .await;

    match current {
        Ok(Some(status)) => {
            if carrier_can_transition(&status, "active").is_err() {
                return Json(api_error(
                    400,
                    &format!("当前状态 {} 不允许审批通过", status),
                ));
            }
            let requires_approval = carrier_requires_approval(&status, "active");
            let result = sqlx::query_as::<_, Carrier>(&format!(
                r#"UPDATE tms.tms_carriers SET status = 'active', updated_at = $2
                    WHERE id = $1 AND tenant_id = $3 RETURNING {}"#,
                CARRIER_RETURN
            ))
            .bind(id)
            .bind(now)
            .bind(tenant_id)
            .fetch_optional(&mut **txn)
            .await;

            match result {
                Ok(Some(carrier)) => {
                    tracing::info!(
                        "carrier {} approved: {} -> active, operator={}, requires_approval={}",
                        id,
                        status,
                        req.operator,
                        requires_approval
                    );
                    Json(ApiResponse::success(carrier, "承运商审批通过"))
                }
                Ok(None) => Json(api_error(404, "承运商不存在")),
                Err(e) => {
                    tracing::error!("审批失败: {}", e);
                    Json(api_error(500, "审批失败"))
                }
            }
        }
        Ok(None) => Json(api_error(404, "承运商不存在")),
        Err(e) => {
            tracing::error!("查询承运商状态失败: {}", e);
            Json(api_error(500, "查询承运商状态失败"))
        }
    }
}

/// Reject carrier (pending_review → rejected)
#[utoipa::path(
    post,
    security(("BearerAuth" = ["tms:carrier:read"])),
    path = "/api/tms/carriers/{id}/reject",
    request_body = ApprovalRequest,
    params(
        ("id" = Uuid, Path, description = "承运商 ID")
    ),
    responses(
        (status = 200, description = "reject_carrier OK")
    ),
    tag = "TMS - Carrier"
)]
pub async fn reject_carrier(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<ApprovalRequest>,
) -> Json<ApiResponse<Carrier>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let tenant_id = get_tenant_id(&claims, &headers);
    let now = Utc::now();

    let current = sqlx::query_scalar::<_, String>(
        "SELECT status FROM tms.tms_carriers WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut **txn)
    .await;

    match current {
        Ok(Some(status)) => {
            if carrier_can_transition(&status, "rejected").is_err() {
                return Json(api_error(400, &format!("当前状态 {} 不允许驳回", status)));
            }
            let result = sqlx::query_as::<_, Carrier>(&format!(
                r#"UPDATE tms.tms_carriers SET status = 'rejected', updated_at = $2
                    WHERE id = $1 AND tenant_id = $3 RETURNING {}"#,
                CARRIER_RETURN
            ))
            .bind(id)
            .bind(now)
            .bind(tenant_id)
            .fetch_optional(&mut **txn)
            .await;

            match result {
                Ok(Some(carrier)) => {
                    tracing::info!(
                        "carrier {} rejected: {} -> rejected, operator={}",
                        id,
                        status,
                        req.operator
                    );
                    Json(ApiResponse::success(carrier, "承运商已驳回"))
                }
                Ok(None) => Json(api_error(404, "承运商不存在")),
                Err(e) => {
                    tracing::error!("驳回失败: {}", e);
                    Json(api_error(500, "驳回失败"))
                }
            }
        }
        Ok(None) => Json(api_error(404, "承运商不存在")),
        Err(e) => {
            tracing::error!("查询承运商状态失败: {}", e);
            Json(api_error(500, "查询承运商状态失败"))
        }
    }
}

#[cfg(test)]
mod serde_tests {
    use super::*;
    use serde::Serialize;
    use serde_json::Value;

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test]
    fn create_carrier_request_roundtrip_full() {
        roundtrip(&CreateCarrierRequest {
            carrier_no: "C-2024-001".into(),
            name: "顺丰速运".into(),
            contact_person: Some("王五".into()),
            contact_phone: Some("13800138001".into()),
            service_area: Some("华东地区".into()),
        });
    }

    #[test]
    fn update_carrier_request_roundtrip_full() {
        roundtrip(&UpdateCarrierRequest {
            name: Some("京东物流".into()),
            contact_person: Some("赵六".into()),
            contact_phone: Some("13900139001".into()),
            status: Some("active".into()),
            service_area: Some("全国".into()),
        });
    }
}

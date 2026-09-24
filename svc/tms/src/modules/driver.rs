//! Driver handlers - 司机管理

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

use crate::shared::fsm::{driver_can_transition, driver_requires_approval};
use crate::shared::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::get_tenant_id;
use topems_shared_core::cache::{record_cache_hit, record_cache_miss, record_cache_set};
use topems_shared_core::response::{api_error, ApiResponse, PaginationParams};

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Driver {
    pub id: Uuid,
    pub driver_no: String,
    pub name: String,
    pub phone: Option<String>,
    pub license_no: Option<String>,
    pub license_type: Option<String>,
    pub status: String,
    pub carrier_id: Option<Uuid>,
    pub tenant_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateDriverRequest {
    pub driver_no: String,
    pub name: String,
    pub phone: Option<String>,
    pub license_no: Option<String>,
    pub license_type: Option<String>,
    pub carrier_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateDriverRequest {
    pub name: Option<String>,
    pub phone: Option<String>,
    pub license_no: Option<String>,
    pub license_type: Option<String>,
    pub status: Option<String>,
    pub carrier_id: Option<Uuid>,
}

pub fn create_routes<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
    AppState: FromRef<S>,
{
    Router::new()
        .route("/drivers", get(list_drivers).post(create_driver))
        .route(
            "/drivers/{id}",
            get(get_driver).put(update_driver).delete(delete_driver),
        )
        .route(
            "/drivers/{id}/submit-verification",
            post(submit_verification),
        )
        .route("/drivers/{id}/approve", post(approve_driver))
        .route("/drivers/{id}/reject", post(reject_driver))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["tms:driver:read"])),
    path = "/api/tms/drivers",
    responses(
        (status = 200, description = "list_drivers OK")
    ),
    tag = "TMS - Driver"
)]
pub async fn list_drivers(
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
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id(&claims, &headers))
    };
    let tenant_key = tenant_id.map_or("all".to_string(), |t| t.to_string());

    // 构建缓存 Key（遵循统一命名规范：{service}:{entity}:list:{tenant_id}:page:{page}:page_size:{page_size}:{params}）
    let cache_key = format!(
        "tms:driver:list:{}:page:{}:page_size:{}:search:{}:status:{}",
        tenant_key,
        page,
        page_size,
        params.search.clone().unwrap_or_else(|| "none".to_string()),
        params.status.clone().unwrap_or_else(|| "all".to_string())
    );

    // 检查缓存（在获取事务锁之前，避免不必要的锁等待）
    if let Some(cached) = state.dict_cache.get(&cache_key).await {
        record_cache_hit("tms", "driver", "list");
        tracing::debug!(
            event_type = "cache_hit",
            service = "tms",
            entity = "driver",
            operation = "list",
            tenant_id = ?tenant_id,
            cache_key = %cache_key,
            "司机列表缓存命中"
        );
        return Json(ApiResponse::success(cached, "获取司机列表成功"));
    }

    // 缓存未命中，记录指标
    record_cache_miss("tms", "driver", "list");

    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");

    let result = sqlx::query_as::<_, Driver>(
        r#"
        SELECT id, driver_no, name, phone, license_no, license_type, status, carrier_id, tenant_id, created_at, updated_at
        FROM tms.tms_drivers
        WHERE ($1::uuid IS NULL OR tenant_id = $1)
          AND ($2::text IS NULL OR driver_no ILIKE $2 OR name ILIKE $2)
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
        Ok(drivers) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM tms.tms_drivers
                WHERE ($1::uuid IS NULL OR tenant_id = $1)
                  AND ($2::text IS NULL OR driver_no ILIKE $2 OR name ILIKE $2)
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
                "drivers": drivers,
                "total": total,
                "page": page,
                "page_size": page_size
            });

            // 写入缓存
            state
                .dict_cache
                .set(cache_key.clone(), response_data.clone())
                .await;
            record_cache_set("tms", "driver", "list");
            tracing::debug!(
                event_type = "cache_set",
                service = "tms",
                entity = "driver",
                operation = "list",
                tenant_id = ?tenant_id,
                cache_key = %cache_key,
                "司机列表缓存写入"
            );

            Json(ApiResponse::success(response_data, "获取司机列表成功"))
        }
        Err(e) => {
            tracing::error!("获取司机列表失败: {}", e);
            Json(api_error(500, "获取司机列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["tms:shipment:write"])),
    path = "/api/tms/drivers",
    request_body = CreateDriverRequest,
    responses(
        (status = 200, description = "create_driver OK")
    ),
    tag = "TMS - Driver"
)]
pub async fn create_driver(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CreateDriverRequest>,
) -> Json<ApiResponse<Driver>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let id = Uuid::new_v4();
    let now = Utc::now();
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, Driver>(
        r#"
        INSERT INTO tms.tms_drivers (id, driver_no, name, phone, license_no, license_type, status, carrier_id, tenant_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $8, $9, $10)
        RETURNING id, driver_no, name, phone, license_no, license_type, status, carrier_id, tenant_id, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.driver_no)
    .bind(&req.name)
    .bind(&req.phone)
    .bind(&req.license_no)
    .bind(&req.license_type)
    .bind(req.carrier_id)
    .bind(tenant_id)
    .bind(now)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(driver) => {
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
                            "tms:driver:*",
                            "pattern",
                            Some("driver_created"),
                        )
                        .await
                    {
                        tracing::warn!("发布缓存失效事件失败: {}", e);
                    }
                });
            }

            Json(ApiResponse::success(driver, "司机创建成功"))
        }
        Err(e) => {
            tracing::error!("创建司机失败: {}", e);
            Json(api_error(500, "司机创建失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["tms:driver:read"])),
    path = "/api/tms/drivers/{id}",
    params(
        ("id" = Uuid, Path, description = "司机 ID")
    ),
    responses(
        (status = 200, description = "get_driver OK")
    ),
    tag = "TMS - Driver"
)]
pub async fn get_driver(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<Driver>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id(&claims, &headers))
    };

    let result = sqlx::query_as::<_, Driver>(
        r#"
        SELECT id, driver_no, name, phone, license_no, license_type, status, carrier_id, tenant_id, created_at, updated_at
        FROM tms.tms_drivers WHERE id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(driver)) => Json(ApiResponse::success(driver, "获取司机成功")),
        Ok(None) => Json(api_error(404, "司机不存在")),
        Err(e) => {
            tracing::error!("获取司机失败: {}", e);
            Json(api_error(500, "获取司机失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["tms:driver:read"])),
    path = "/api/tms/drivers/{id}",
    request_body = UpdateDriverRequest,
    params(
        ("id" = Uuid, Path, description = "司机 ID")
    ),
    responses(
        (status = 200, description = "update_driver OK")
    ),
    tag = "TMS - Driver"
)]
pub async fn update_driver(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<UpdateDriverRequest>,
) -> Json<ApiResponse<Driver>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let tenant_id = get_tenant_id(&claims, &headers);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Driver>(
        r#"
        UPDATE tms.tms_drivers SET
            name = COALESCE($2, name),
            phone = COALESCE($3, phone),
            license_no = COALESCE($4, license_no),
            license_type = COALESCE($5, license_type),
            status = COALESCE($6, status),
            carrier_id = COALESCE($7, carrier_id),
            updated_at = $8
        WHERE id = $1 AND tenant_id = $9
        RETURNING id, driver_no, name, phone, license_no, license_type, status, carrier_id, tenant_id, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.name)
    .bind(&req.phone)
    .bind(&req.license_no)
    .bind(&req.license_type)
    .bind(&req.status)
    .bind(req.carrier_id)
    .bind(now)
    .bind(tenant_id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(driver)) => Json(ApiResponse::success(driver, "司机更新成功")),
        Ok(None) => Json(api_error(404, "司机不存在")),
        Err(e) => {
            tracing::error!("更新司机失败: {}", e);
            Json(api_error(500, "更新司机失败"))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["tms:driver:read"])),
    path = "/api/tms/drivers/{id}",
    params(
        ("id" = Uuid, Path, description = "司机 ID")
    ),
    responses(
        (status = 200, description = "delete_driver OK")
    ),
    tag = "TMS - Driver"
)]
pub async fn delete_driver(
    State(_state): State<AppState>,
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

    let result = sqlx::query("DELETE FROM tms.tms_drivers WHERE id = $1 AND tenant_id = $2")
        .bind(id)
        .bind(tenant_id)
        .execute(&mut **txn)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            Json(ApiResponse::success("".to_string(), "司机删除成功"))
        }
        Ok(_) => Json(api_error(404, "司机不存在")),
        Err(e) => {
            tracing::error!("删除司机失败: {}", e);
            Json(api_error(500, "司机删除失败"))
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

const DRIVER_RETURN: &str = r#"id, driver_no, name, phone, license_no, license_type, status, carrier_id, tenant_id, created_at, updated_at"#;

/// Submit driver for verification (active → suspended)
#[utoipa::path(
    post,
    security(("BearerAuth" = ["tms:write"])),
    path = "/api/tms/drivers/{id}/submit-verification",
    request_body = ApprovalRequest,
    params(
        ("id" = Uuid, Path, description = "司机 ID")
    ),
    responses(
        (status = 200, description = "submit_verification OK")
    ),
    tag = "TMS - Driver"
)]
pub async fn submit_verification(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<ApprovalRequest>,
) -> Json<ApiResponse<Driver>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let tenant_id = get_tenant_id(&claims, &headers);
    let now = Utc::now();

    let current = sqlx::query_scalar::<_, String>(
        "SELECT status FROM tms.tms_drivers WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut **txn)
    .await;

    match current {
        Ok(Some(status)) => {
            if driver_can_transition(&status, "suspended").is_err() {
                return Json(api_error(
                    400,
                    &format!("当前状态 {} 不允许提交审核", status),
                ));
            }
            let result = sqlx::query_as::<_, Driver>(&format!(
                r#"UPDATE tms.tms_drivers SET status = 'suspended', updated_at = $2
                    WHERE id = $1 AND tenant_id = $3 RETURNING {}"#,
                DRIVER_RETURN
            ))
            .bind(id)
            .bind(now)
            .bind(tenant_id)
            .fetch_optional(&mut **txn)
            .await;

            match result {
                Ok(Some(driver)) => {
                    tracing::info!(
                        "driver {} submit_verification: {} -> suspended, operator={}",
                        id,
                        status,
                        req.operator
                    );
                    Json(ApiResponse::success(driver, "司机已提交审核"))
                }
                Ok(None) => Json(api_error(404, "司机不存在")),
                Err(e) => {
                    tracing::error!("提交审核失败: {}", e);
                    Json(api_error(500, "提交审核失败"))
                }
            }
        }
        Ok(None) => Json(api_error(404, "司机不存在")),
        Err(e) => {
            tracing::error!("查询司机状态失败: {}", e);
            Json(api_error(500, "查询司机状态失败"))
        }
    }
}

/// Approve driver (suspended → active)
#[utoipa::path(
    post,
    security(("BearerAuth" = ["tms:driver:read"])),
    path = "/api/tms/drivers/{id}/approve",
    request_body = ApprovalRequest,
    params(
        ("id" = Uuid, Path, description = "司机 ID")
    ),
    responses(
        (status = 200, description = "approve_driver OK")
    ),
    tag = "TMS - Driver"
)]
pub async fn approve_driver(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<ApprovalRequest>,
) -> Json<ApiResponse<Driver>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let tenant_id = get_tenant_id(&claims, &headers);
    let now = Utc::now();

    let current = sqlx::query_scalar::<_, String>(
        "SELECT status FROM tms.tms_drivers WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut **txn)
    .await;

    match current {
        Ok(Some(status)) => {
            if driver_can_transition(&status, "active").is_err() {
                return Json(api_error(
                    400,
                    &format!("当前状态 {} 不允许审批通过", status),
                ));
            }
            let result = sqlx::query_as::<_, Driver>(&format!(
                r#"UPDATE tms.tms_drivers SET status = 'active', updated_at = $2
                    WHERE id = $1 AND tenant_id = $3 RETURNING {}"#,
                DRIVER_RETURN
            ))
            .bind(id)
            .bind(now)
            .bind(tenant_id)
            .fetch_optional(&mut **txn)
            .await;

            match result {
                Ok(Some(driver)) => {
                    tracing::info!(
                        "driver {} approved: {} -> active, operator={}",
                        id,
                        status,
                        req.operator
                    );
                    Json(ApiResponse::success(driver, "司机审批通过"))
                }
                Ok(None) => Json(api_error(404, "司机不存在")),
                Err(e) => {
                    tracing::error!("审批失败: {}", e);
                    Json(api_error(500, "审批失败"))
                }
            }
        }
        Ok(None) => Json(api_error(404, "司机不存在")),
        Err(e) => {
            tracing::error!("查询司机状态失败: {}", e);
            Json(api_error(500, "查询司机状态失败"))
        }
    }
}

/// Reject driver (suspended → inactive)
#[utoipa::path(
    post,
    security(("BearerAuth" = ["tms:driver:read"])),
    path = "/api/tms/drivers/{id}/reject",
    request_body = ApprovalRequest,
    params(
        ("id" = Uuid, Path, description = "司机 ID")
    ),
    responses(
        (status = 200, description = "reject_driver OK")
    ),
    tag = "TMS - Driver"
)]
pub async fn reject_driver(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<ApprovalRequest>,
) -> Json<ApiResponse<Driver>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let tenant_id = get_tenant_id(&claims, &headers);
    let now = Utc::now();

    let current = sqlx::query_scalar::<_, String>(
        "SELECT status FROM tms.tms_drivers WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut **txn)
    .await;

    match current {
        Ok(Some(status)) => {
            if driver_can_transition(&status, "inactive").is_err() {
                return Json(api_error(400, &format!("当前状态 {} 不允许驳回", status)));
            }
            let requires_approval = driver_requires_approval(&status, "inactive");
            let result = sqlx::query_as::<_, Driver>(&format!(
                r#"UPDATE tms.tms_drivers SET status = 'inactive', updated_at = $2
                    WHERE id = $1 AND tenant_id = $3 RETURNING {}"#,
                DRIVER_RETURN
            ))
            .bind(id)
            .bind(now)
            .bind(tenant_id)
            .fetch_optional(&mut **txn)
            .await;

            match result {
                Ok(Some(driver)) => {
                    tracing::info!(
                        "driver {} rejected: {} -> inactive, operator={}, requires_approval={}",
                        id,
                        status,
                        req.operator,
                        requires_approval
                    );
                    Json(ApiResponse::success(driver, "司机已驳回"))
                }
                Ok(None) => Json(api_error(404, "司机不存在")),
                Err(e) => {
                    tracing::error!("驳回失败: {}", e);
                    Json(api_error(500, "驳回失败"))
                }
            }
        }
        Ok(None) => Json(api_error(404, "司机不存在")),
        Err(e) => {
            tracing::error!("查询司机状态失败: {}", e);
            Json(api_error(500, "查询司机状态失败"))
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
    fn create_driver_request_roundtrip_full() {
        roundtrip(&CreateDriverRequest {
            driver_no: "D-2024-001".into(),
            name: "张三".into(),
            phone: Some("13800138000".into()),
            license_no: Some("LIC123456789".into()),
            license_type: Some("A2".into()),
            carrier_id: Some(Uuid::new_v4()),
        });
    }

    #[test]
    fn update_driver_request_roundtrip_full() {
        roundtrip(&UpdateDriverRequest {
            name: Some("李四".into()),
            phone: Some("13900139000".into()),
            license_no: Some("LIC987654321".into()),
            license_type: Some("B1".into()),
            status: Some("active".into()),
            carrier_id: Some(Uuid::new_v4()),
        });
    }
}

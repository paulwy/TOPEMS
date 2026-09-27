//! Capacity handlers (migrated from APS)
//! 产能计划管理：工作中心产能记录、分配、释放、维护

use axum::{
    extract::{Extension, Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, NaiveDate, NaiveDateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

use crate::shared::aps_fsm::capacity_can_transition;
use crate::AppState;
use topems_shared::auth::Claims;
use topems_shared::response::ApiResponse;
use utoipa::ToSchema;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/capacities", get(list_capacities).post(create_capacity))
        .route(
            "/capacities/{id}",
            get(get_capacity)
                .put(update_capacity)
                .delete(delete_capacity),
        )
        .route("/capacities/{id}/allocate", post(allocate_capacity))
        .route("/capacities/{id}/submit", post(submit_capacity))
        .route("/capacities/{id}/release", post(release_capacity))
        .route("/capacities/{id}/maintenance", post(maintenance_capacity))
}

// ==================== Data Types ====================

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Capacity {
    pub id: Uuid,
    pub work_center_id: Uuid,
    pub work_center_name: Option<String>,
    pub capacity_date: Option<NaiveDate>,
    pub available_hours: Option<f64>,
    pub used_hours: Option<f64>,
    pub utilization_rate: Option<f64>,
    pub status: String,
    pub tenant_id: Option<Uuid>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct ListCapacitiesQuery {
    page: Option<i32>,
    page_size: Option<i32>,
    search: Option<String>,
    status: Option<String>,
    work_center_id: Option<Uuid>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct CreateCapacityRequest {
    pub work_center_id: Uuid,
    pub work_center_name: Option<String>,
    pub capacity_date: Option<NaiveDate>,
    pub available_hours: Option<f64>,
    pub used_hours: Option<f64>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct UpdateCapacityRequest {
    pub work_center_name: Option<String>,
    pub capacity_date: Option<NaiveDate>,
    pub available_hours: Option<f64>,
    pub used_hours: Option<f64>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AllocateRequest {
    /// 可选：分配/释放工时；缺省时 allocate 按 0、release 按当前已用工时处理（兼容前端 ApprovalRequest body）
    pub hours: Option<f64>,
}

// ==================== Database Init ====================

pub async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS capacities (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            work_center_id UUID NOT NULL,
            work_center_name VARCHAR(256),
            capacity_date DATE,
            available_hours DECIMAL(10,2),
            used_hours DECIMAL(10,2) DEFAULT 0,
            utilization_rate DECIMAL(5,2),
            status VARCHAR(32) DEFAULT 'available',
            tenant_id UUID,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(tenant_id, work_center_id, capacity_date)
        )
        "#,
    )
    .execute(pool)
    .await?;
    Ok(())
}

// ==================== Helpers ====================

fn get_tenant_id(claims: &Claims) -> Uuid {
    claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok())
        .unwrap_or(Uuid::nil())
}

fn can_transition(from: &str, to: &str) -> bool {
    capacity_can_transition(from, to).is_ok()
}

fn calc_utilization(available: Option<f64>, used: Option<f64>) -> Option<f64> {
    match (available, used) {
        (Some(a), Some(u)) if a > 0.0 => Some((u / a) * 100.0),
        _ => None,
    }
}

// ==================== Handlers ====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:capacity:read"])),
    path = "/capacities",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Capacity"
)]
pub async fn list_capacities(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ListCapacitiesQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;
    let tenant_id = get_tenant_id(&claims);

    // 构建缓存 Key（遵循统一命名规范：{service}:{entity}:list:{tenant_id}:page:{page}:page_size:{page_size}:{params}）
    let cache_key = format!(
        "mes:capacity:list:{}:page:{}:page_size:{}:search:{}:status:{}:work_center_id:{}",
        tenant_id,
        page,
        page_size,
        params.search.clone().unwrap_or_else(|| "none".to_string()),
        params.status.clone().unwrap_or_else(|| "all".to_string()),
        params
            .work_center_id
            .map(|id| id.to_string())
            .unwrap_or_else(|| "none".to_string())
    );

    // 检查缓存
    if let Some(cached) = state.dict_cache.get(&cache_key).await {
        tracing::debug!(
            event_type = "cache_hit",
            service = "mes",
            entity = "capacity",
            operation = "list",
            tenant_id = %tenant_id,
            cache_key = %cache_key,
            "产能列表缓存命中"
        );
        return Json(ApiResponse::success(cached, "获取产能列表成功"));
    }

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();
    let wc_filter = params.work_center_id;

    let result = sqlx::query_as::<_, Capacity>(
        r#"
        SELECT id, work_center_id, work_center_name, capacity_date, available_hours,
               used_hours, utilization_rate, status, tenant_id, created_at, updated_at
        FROM capacities
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR work_center_name ILIKE $2)
          AND ($3::text IS NULL OR status = $3)
          AND ($4::uuid IS NULL OR work_center_id = $4)
        ORDER BY capacity_date DESC, created_at DESC
        LIMIT $5 OFFSET $6
        "#,
    )
    .bind(tenant_id)
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(wc_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(capacities) => {
            let total = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM capacities
                WHERE tenant_id = $1
                  AND ($2::text IS NULL OR work_center_name ILIKE $2)
                  AND ($3::text IS NULL OR status = $3)
                  AND ($4::uuid IS NULL OR work_center_id = $4)
                "#,
            )
            .bind(tenant_id)
            .bind(&search_pattern)
            .bind(&status_filter)
            .bind(wc_filter)
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);

            let response_data = serde_json::json!({
                "capacities": capacities,
                "total": total,
                "page": page,
                "page_size": page_size
            });

            // 写入缓存
            state
                .dict_cache
                .set(cache_key.clone(), response_data.clone())
                .await;
            tracing::debug!(
                event_type = "cache_set",
                service = "mes",
                entity = "capacity",
                operation = "list",
                tenant_id = %tenant_id,
                cache_key = %cache_key,
                "产能列表缓存写入"
            );

            Json(ApiResponse::success(response_data, "获取产能列表成功"))
        }
        Err(e) => {
            tracing::error!("获取产能列表失败: {}", e);
            Json(ApiResponse::error(500, "获取产能列表失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:capacity:read"])),
    path = "/capacities/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Capacity"
)]
pub async fn get_capacity(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Capacity>> {
    let tenant_id = get_tenant_id(&claims);

    let result = sqlx::query_as::<_, Capacity>(
        r#"
        SELECT id, work_center_id, work_center_name, capacity_date, available_hours,
               used_hours, utilization_rate, status, tenant_id, created_at, updated_at
        FROM capacities
        WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(cap)) => Json(ApiResponse::success(cap, "获取产能详情成功")),
        Ok(None) => Json(ApiResponse::error(404, "产能记录不存在")),
        Err(e) => {
            tracing::error!("获取产能详情失败: {}", e);
            Json(ApiResponse::error(500, "获取产能详情失败"))
        }
    }
}

pub async fn create_capacity(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateCapacityRequest>,
) -> Json<ApiResponse<Capacity>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let tenant_id = get_tenant_id(&claims);
    let status = req.status.unwrap_or_else(|| "available".to_string());
    let used_hours = req.used_hours.unwrap_or(0.0);
    let utilization_rate = calc_utilization(req.available_hours, Some(used_hours));

    let result = sqlx::query_as::<_, Capacity>(
        r#"
        INSERT INTO capacities
            (id, work_center_id, work_center_name, capacity_date, available_hours,
             used_hours, utilization_rate, status, tenant_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, work_center_id, work_center_name, capacity_date, available_hours,
                  used_hours, utilization_rate, status, tenant_id, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(req.work_center_id)
    .bind(&req.work_center_name)
    .bind(req.capacity_date)
    .bind(req.available_hours)
    .bind(Some(used_hours))
    .bind(utilization_rate)
    .bind(&status)
    .bind(tenant_id)
    .bind(now)
    .bind(now)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(cap) => {
            // 失效列表缓存（创建后列表数据可能变化）
            state.dict_cache.clear_l1();

            // 发布缓存失效事件，通知其他服务失效相关缓存
            if let Some(ref publisher) = state.event_publisher {
                let publisher = publisher.clone();
                tokio::spawn(async move {
                    if let Err(e) = publisher
                        .publish_cache_invalidated(
                            "mes:capacity:*",
                            "pattern",
                            Some("capacity_created"),
                        )
                        .await
                    {
                        tracing::warn!("发布缓存失效事件失败: {}", e);
                    }
                });
            }

            Json(ApiResponse::success(cap, "产能记录创建成功"))
        }
        Err(e) => {
            tracing::error!("创建产能记录失败: {}", e);
            Json(ApiResponse::error(500, "创建产能记录失败"))
        }
    }
}

pub async fn update_capacity(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateCapacityRequest>,
) -> Json<ApiResponse<Capacity>> {
    let tenant_id = get_tenant_id(&claims);

    let existing =
        sqlx::query_as::<_, Capacity>("SELECT * FROM capacities WHERE id = $1 AND tenant_id = $2")
            .bind(id)
            .bind(tenant_id)
            .fetch_optional(&state.pool)
            .await;

    let existing = match existing {
        Ok(Some(c)) => c,
        Ok(None) => return Json(ApiResponse::error(404, "产能记录不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询失败: {}", e))),
    };

    let work_center_name = req.work_center_name.or(existing.work_center_name);
    let capacity_date = req.capacity_date.or(existing.capacity_date);
    let available_hours = req.available_hours.or(existing.available_hours);
    let used_hours = req.used_hours.or(existing.used_hours);
    let status = req.status.unwrap_or(existing.status);
    let utilization_rate = calc_utilization(available_hours, used_hours);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Capacity>(
        r#"
        UPDATE capacities SET
            work_center_name = $1, capacity_date = $2, available_hours = $3,
            used_hours = $4, utilization_rate = $5, status = $6, updated_at = $7
        WHERE id = $8 AND tenant_id = $9
        RETURNING id, work_center_id, work_center_name, capacity_date, available_hours,
                  used_hours, utilization_rate, status, tenant_id, created_at, updated_at
        "#,
    )
    .bind(&work_center_name)
    .bind(capacity_date)
    .bind(available_hours)
    .bind(used_hours)
    .bind(utilization_rate)
    .bind(&status)
    .bind(now)
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(cap) => {
            // 失效列表缓存（更新后列表数据可能变化）
            state.dict_cache.clear_l1();

            // 发布缓存失效事件，通知其他服务失效相关缓存
            if let Some(ref publisher) = state.event_publisher {
                let publisher = publisher.clone();
                tokio::spawn(async move {
                    if let Err(e) = publisher
                        .publish_cache_invalidated(
                            "mes:capacity:*",
                            "pattern",
                            Some("capacity_updated"),
                        )
                        .await
                    {
                        tracing::warn!("发布缓存失效事件失败: {}", e);
                    }
                });
            }

            Json(ApiResponse::success(cap, "产能记录更新成功"))
        }
        Err(e) => {
            tracing::error!("更新产能记录失败: {}", e);
            Json(ApiResponse::error(500, "更新产能记录失败"))
        }
    }
}

pub async fn delete_capacity(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims);

    let result = sqlx::query("DELETE FROM capacities WHERE id = $1 AND tenant_id = $2")
        .bind(id)
        .bind(tenant_id)
        .execute(&state.pool)
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
                            "mes:capacity:*",
                            "pattern",
                            Some("capacity_deleted"),
                        )
                        .await
                    {
                        tracing::warn!("发布缓存失效事件失败: {}", e);
                    }
                });
            }

            Json(ApiResponse::success(
                serde_json::json!({"id": id}),
                "产能记录删除成功",
            ))
        }
        Ok(_) => Json(ApiResponse::error(404, "产能记录不存在")),
        Err(e) => {
            tracing::error!("删除产能记录失败: {}", e);
            Json(ApiResponse::error(500, "删除产能记录失败"))
        }
    }
}

// ==================== State Machine Handlers ====================

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mes:capacity:write"])),
    path = "/capacities/{id}/allocate",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Capacity"
)]
pub async fn allocate_capacity(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<AllocateRequest>,
) -> Json<ApiResponse<Capacity>> {
    let tenant_id = get_tenant_id(&claims);

    let existing = match sqlx::query_as::<_, Capacity>(
        "SELECT * FROM capacities WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(c)) => c,
        Ok(None) => return Json(ApiResponse::error(404, "产能记录不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询失败: {}", e))),
    };

    if !can_transition(&existing.status, "allocated") {
        return Json(ApiResponse::error(
            400,
            &format!("当前状态 {} 不允许分配产能", existing.status),
        ));
    }

    let available = existing.available_hours.unwrap_or(0.0);
    let current_used = existing.used_hours.unwrap_or(0.0);
    let new_used = current_used + req.hours.unwrap_or(0.0);

    if new_used > available {
        return Json(ApiResponse::error(
            400,
            &format!(
                "分配工时 {} 超过可用工时 {}（当前已用 {}）",
                new_used, available, current_used
            ),
        ));
    }

    let utilization_rate = calc_utilization(Some(available), Some(new_used));
    let now = Utc::now();

    let result = sqlx::query_as::<_, Capacity>(
        r#"
        UPDATE capacities SET
            used_hours = $1, utilization_rate = $2, status = 'allocated', updated_at = $3
        WHERE id = $4 AND tenant_id = $5
        RETURNING id, work_center_id, work_center_name, capacity_date, available_hours,
                  used_hours, utilization_rate, status, tenant_id, created_at, updated_at
        "#,
    )
    .bind(Some(new_used))
    .bind(utilization_rate)
    .bind(now)
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(cap) => Json(ApiResponse::success(cap, "产能分配成功")),
        Err(e) => {
            tracing::error!("分配产能失败: {}", e);
            Json(ApiResponse::error(500, "分配产能失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mes:capacity:write"])),
    path = "/capacities/{id}/release",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Capacity"
)]
pub async fn release_capacity(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<AllocateRequest>,
) -> Json<ApiResponse<Capacity>> {
    let tenant_id = get_tenant_id(&claims);

    let existing = match sqlx::query_as::<_, Capacity>(
        "SELECT * FROM capacities WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(c)) => c,
        Ok(None) => return Json(ApiResponse::error(404, "产能记录不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询失败: {}", e))),
    };

    if !can_transition(&existing.status, "released") {
        return Json(ApiResponse::error(
            400,
            &format!("当前状态 {} 不允许释放产能", existing.status),
        ));
    }

    let available = existing.available_hours.unwrap_or(0.0);
    let current_used = existing.used_hours.unwrap_or(0.0);
    let new_used = (current_used - req.hours.unwrap_or(current_used)).max(0.0);
    let utilization_rate = calc_utilization(Some(available), Some(new_used));
    let now = Utc::now();

    let result = sqlx::query_as::<_, Capacity>(
        r#"
        UPDATE capacities SET
            used_hours = $1, utilization_rate = $2, status = 'released', updated_at = $3
        WHERE id = $4 AND tenant_id = $5
        RETURNING id, work_center_id, work_center_name, capacity_date, available_hours,
                  used_hours, utilization_rate, status, tenant_id, created_at, updated_at
        "#,
    )
    .bind(Some(new_used))
    .bind(utilization_rate)
    .bind(now)
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(cap) => Json(ApiResponse::success(cap, "产能释放成功")),
        Err(e) => {
            tracing::error!("释放产能失败: {}", e);
            Json(ApiResponse::error(500, "释放产能失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mes:capacity:write"])),
    path = "/capacities/{id}/maintenance",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Capacity"
)]
pub async fn maintenance_capacity(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Capacity>> {
    let tenant_id = get_tenant_id(&claims);

    let existing = match sqlx::query_as::<_, Capacity>(
        "SELECT * FROM capacities WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(c)) => c,
        Ok(None) => return Json(ApiResponse::error(404, "产能记录不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询失败: {}", e))),
    };

    let target_status = if existing.status == "maintenance" {
        "available"
    } else {
        "maintenance"
    };

    if !can_transition(&existing.status, target_status) {
        return Json(ApiResponse::error(
            400,
            &format!(
                "当前状态 {} 不允许切换到 {}",
                existing.status, target_status
            ),
        ));
    }

    let now = Utc::now();
    let result = sqlx::query_as::<_, Capacity>(
        r#"
        UPDATE capacities SET status = $1, updated_at = $2
        WHERE id = $3 AND tenant_id = $4
        RETURNING id, work_center_id, work_center_name, capacity_date, available_hours,
                  used_hours, utilization_rate, status, tenant_id, created_at, updated_at
        "#,
    )
    .bind(target_status)
    .bind(now)
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(cap) => {
            let msg = if target_status == "maintenance" {
                "产能已标记为维护中"
            } else {
                "产能已从维护恢复"
            };
            Json(ApiResponse::success(cap, msg))
        }
        Err(e) => {
            tracing::error!("切换产能维护状态失败: {}", e);
            Json(ApiResponse::error(500, "切换产能维护状态失败"))
        }
    }
}

// ==================== Tests ====================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calc_utilization() {
        assert_eq!(calc_utilization(Some(100.0), Some(50.0)), Some(50.0));
        assert_eq!(calc_utilization(Some(100.0), Some(0.0)), Some(0.0));
        assert_eq!(calc_utilization(Some(0.0), Some(50.0)), None);
        assert_eq!(calc_utilization(None, Some(50.0)), None);
        assert_eq!(calc_utilization(Some(100.0), None), None);
    }

    #[test]
    fn test_can_transition_valid() {
        assert!(can_transition("available", "allocated"));
        assert!(can_transition("allocated", "consumed"));
        assert!(can_transition("allocated", "released"));
        assert!(can_transition("available", "maintenance"));
        assert!(can_transition("maintenance", "available"));
        assert!(can_transition("released", "available"));
    }

    #[test]
    fn test_can_transition_invalid() {
        assert!(!can_transition("available", "consumed"));
        assert!(!can_transition("allocated", "available"));
        assert!(!can_transition("consumed", "available"));
        assert!(!can_transition("maintenance", "allocated"));
    }
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct SubmitCapacityRequest {
    pub operator: Option<String>,
    pub comment: Option<String>,
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mes:capacity:write"])),
    path = "/capacities/{id}/submit",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Capacity"
)]
pub async fn submit_capacity(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(_req): Json<SubmitCapacityRequest>,
) -> Json<ApiResponse<Capacity>> {
    let tenant_id = get_tenant_id(&claims);

    let existing = match sqlx::query_as::<_, Capacity>(
        "SELECT * FROM capacities WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(c)) => c,
        Ok(None) => return Json(ApiResponse::error(404, "产能记录不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询失败: {}", e))),
    };

    if !can_transition(&existing.status, "allocated") {
        return Json(ApiResponse::error(
            409,
            &format!("当前状态 {} 不允许提交产能", existing.status),
        ));
    }

    let now = Utc::now();
    let result = sqlx::query_as::<_, Capacity>(
        r#"
        UPDATE capacities SET
            status = 'allocated', updated_at = $1
        WHERE id = $2 AND tenant_id = $3
        RETURNING id, work_center_id, work_center_name, capacity_date, available_hours,
                  used_hours, utilization_rate, status, tenant_id, created_at, updated_at
        "#,
    )
    .bind(now)
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(cap) => Json(ApiResponse::success(cap, "产能提交成功")),
        Err(e) => {
            tracing::error!("提交产能失败: {}", e);
            Json(ApiResponse::error(500, "提交产能失败"))
        }
    }
}

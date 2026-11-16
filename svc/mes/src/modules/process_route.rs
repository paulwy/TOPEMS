use axum::{
    extract::Extension,
    extract::Path,
    extract::Query,
    extract::State,
    routing::{get, put},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::types::BigDecimal;
use sqlx::{types::Uuid, Row};
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::get_tenant_id_from_claims as get_tenant_id;
use topems_shared_auth::middleware::tenant::RlsTxnCell;

use crate::shared::permission::{check_permission, ModulePermission};
use crate::AppState;
use topems_shared_core::cache::{record_cache_hit, record_cache_miss, record_cache_set};
use topems_shared_core::response::ApiResponse;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/process-routes",
            get(list_process_routes).post(create_process_route),
        )
        .route(
            "/process-routes/{id}",
            get(get_process_route)
                .put(update_process_route)
                .delete(delete_process_route),
        )
        .route(
            "/process-routes/{id}/steps",
            get(get_route_steps).post(add_route_step),
        )
        .route(
            "/process-routes/{id}/steps/reorder",
            put(reorder_route_steps),
        )
        .route(
            "/process-routes/{id}/steps/{step_id}",
            put(update_route_step).delete(remove_route_step),
        )
}

#[derive(Debug, Clone, Deserialize)]
pub struct ListProcessRoutesQuery {
    page: Option<i32>,
    page_size: Option<i32>,
    search: Option<String>,
    status: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateProcessRouteRequest {
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub version: Option<String>,
    pub estimated_time_minutes: Option<f64>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateProcessRouteRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub version: Option<String>,
    pub estimated_time_minutes: Option<f64>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ProcessRouteResponse {
    pub id: String,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub version: Option<String>,
    pub status: String,
    pub estimated_time_minutes: Option<f64>,
    pub total_estimated_time_minutes: Option<f64>,
    pub process_count: Option<i64>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AddProcessRouteStepRequest {
    pub process_id: String,
    pub sequence: i32,
    pub estimated_time_minutes: Option<f64>,
    pub work_station_id: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateProcessRouteStepRequest {
    pub sequence: Option<i32>,
    pub estimated_time_minutes: Option<f64>,
    pub work_station_id: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ReorderStepsRequest {
    pub step_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ProcessRouteStepResponse {
    pub id: String,
    pub route_id: String,
    pub process_id: String,
    pub process_name: String,
    pub process_code: String,
    pub sequence: i32,
    pub estimated_time_minutes: Option<f64>,
    pub work_station_id: Option<String>,
    pub work_station_name: Option<String>,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
}

fn naive_to_utc(dt: Option<DateTime<Utc>>) -> DateTime<Utc> {
    match dt {
        Some(d) => d,
        None => Utc::now(),
    }
}

fn datetime_to_string(dt: Option<DateTime<Utc>>) -> String {
    dt.map(|d| d.to_rfc3339()).unwrap_or_default()
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:process:read"])),
    path = "/process-routes",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Process"
)]
#[allow(clippy::as_conversions)]
pub async fn list_process_routes(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ListProcessRoutesQuery>,
) -> ApiResponse<serde_json::Value> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkStationRead).await
    {
        return e;
    }

    let page = query.page.unwrap_or(1) as i64;
    let page_size = query.page_size.unwrap_or(10) as i64;
    let offset = (page - 1) * page_size;

    // 构建缓存 Key（遵循统一命名规范：{service}:{entity}:list:{tenant_id}:page:{page}:page_size:{page_size}:{params}）
    let tenant_id = claims
        .tenant_id
        .clone()
        .unwrap_or_else(|| "default".to_string());
    let cache_key = format!(
        "mes:process_route:list:{}:page:{}:page_size:{}:search:{}:status:{}",
        tenant_id,
        page,
        page_size,
        query.search.clone().unwrap_or_else(|| "none".to_string()),
        query.status.clone().unwrap_or_else(|| "all".to_string())
    );

    // 检查缓存
    if let Some(cached) = state.dict_cache.get(&cache_key).await {
        record_cache_hit("mes", "process_route", "list");
        tracing::debug!(
            event_type = "cache_hit",
            service = "mes",
            entity = "process_route",
            operation = "list",
            tenant_id = %tenant_id,
            cache_key = %cache_key,
            "工艺路线列表缓存命中"
        );
        return ApiResponse::success(cached, "获取工艺路线列表成功");
    }

    // 缓存未命中，记录指标
    record_cache_miss("mes", "process_route", "list");

    let mut params: Vec<serde_json::Value> = Vec::new();
    let mut where_clause = String::from(" WHERE pr.deleted_at IS NULL");

    if let Some(status) = query.status {
        where_clause.push_str(" AND pr.status = $1");
        params.push(serde_json::Value::String(status));
    }

    if let Some(search) = query.search {
        let pattern = format!("%{}%", search);
        if where_clause.is_empty() {
            where_clause.push_str(" AND (pr.route_code ILIKE $1 OR pr.route_name ILIKE $1)");
        } else {
            where_clause.push_str(&format!(
                " AND (pr.route_code ILIKE ${} OR pr.route_name ILIKE ${})",
                params.len() + 1,
                params.len() + 1
            ));
        }
        params.push(serde_json::Value::String(pattern));
    }

    // tenant 隔离（读路径 Claims bind，nil=全见）
    let tenant_ph = params.len() + 1;
    let tenant_filter = format!("pr.tenant_id = ${}::uuid", tenant_ph);
    if where_clause.is_empty() {
        where_clause.push_str(&format!(" WHERE {}", tenant_filter));
    } else {
        where_clause.push_str(&format!(" AND {}", tenant_filter));
    }
    let tenant_uuid = get_tenant_id(&claims);

    // 租户作用域读：process_routes 受 RLS 保护，裸 pool 无 app.tenant_id GUC 会返回 0 行。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立只读作用域失败: {}", e);
            return ApiResponse::server_error("获取工艺路线列表失败");
        }
    };

    let count_sql = format!(
        "SELECT COUNT(*) as total FROM process_routes pr{}",
        where_clause
    );

    let mut count_query = sqlx::query_scalar(sqlx::AssertSqlSafe(count_sql));
    for p in &params {
        // params 仅由本函数 push 的 String 变体组成，as_str 恒有值；兜底空串仅为消除 unwrap（杜绝 panic），正常路径行为不变
        count_query = count_query.bind(p.as_str().unwrap_or(""));
    }
    count_query = count_query.bind(tenant_uuid);

    let count_result = count_query.fetch_one(&mut scope).await;
    let total: Option<i64> = match count_result {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("Failed to count process routes: {}", e);
            return ApiResponse::server_error("获取工艺路线列表失败");
        }
    };

    let fetch_sql = format!(
        r#"
        SELECT 
            pr.id, pr.route_code AS code, pr.route_name AS name, pr.description, pr.status,
            pr.created_at, pr.updated_at
        FROM process_routes pr
        {}
        ORDER BY pr.created_at DESC
        LIMIT ${} OFFSET ${}
        "#,
        where_clause,
        // tenant 隔离占 1 位（where_clause 内 $N），LIMIT/OFFSET 必须顺延到 N+1/N+2，
        // 否则无筛选时 LIMIT $1 复用 tenant_uuid → uuid 类型错误 → 500
        params.len() + 2,
        params.len() + 3
    );

    let mut fetch_query = sqlx::query(sqlx::AssertSqlSafe(fetch_sql));
    for p in &params {
        // params 仅由本函数 push 的 String 变体组成，as_str 恒有值；兜底空串仅为消除 unwrap（杜绝 panic），正常路径行为不变
        fetch_query = fetch_query.bind(p.as_str().unwrap_or(""));
    }
    fetch_query = fetch_query.bind(tenant_uuid).bind(page_size).bind(offset);

    let routes = match fetch_query.fetch_all(&mut scope).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch process routes: {}", e);
            return ApiResponse::server_error("获取工艺路线列表失败");
        }
    };

    let routes: Vec<ProcessRouteResponse> = routes
        .into_iter()
        .map(|r| ProcessRouteResponse {
            id: r.try_get::<Uuid, _>("id").unwrap_or_default().to_string(),
            code: r.try_get::<String, _>("code").unwrap_or_default(),
            name: r.try_get::<String, _>("name").unwrap_or_default(),
            description: r.try_get::<Option<String>, _>("description").ok().flatten(),
            version: None,
            status: r
                .try_get::<Option<String>, _>("status")
                .ok()
                .flatten()
                .unwrap_or_else(|| "active".to_string()),
            estimated_time_minutes: None,
            total_estimated_time_minutes: None,
            process_count: None,
            created_at: (r
                .try_get::<Option<DateTime<Utc>>, _>("created_at")
                .ok()
                .flatten())
            .unwrap_or_default(),
            updated_at: (r
                .try_get::<Option<DateTime<Utc>>, _>("updated_at")
                .ok()
                .flatten())
            .unwrap_or_default(),
        })
        .collect();

    let response_data = serde_json::json!({
        "routes": routes,
        "total": total.unwrap_or(0),
        "page": page,
        "page_size": page_size,
    });

    // 写入缓存
    state
        .dict_cache
        .set(cache_key.clone(), response_data.clone())
        .await;
    record_cache_set("mes", "process_route", "list");
    tracing::debug!(
        event_type = "cache_set",
        service = "mes",
        entity = "process_route",
        operation = "list",
        tenant_id = %tenant_id,
        cache_key = %cache_key,
        "工艺路线列表缓存写入"
    );

    ApiResponse::success(response_data, "获取工艺路线列表成功")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:process:read"])),
    path = "/process-routes/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Process"
)]
pub async fn get_process_route(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> ApiResponse<ProcessRouteResponse> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkStationRead).await
    {
        return e;
    }

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return ApiResponse::bad_request("无效的工艺路线ID");
        }
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立只读作用域失败: {}", e);
            return ApiResponse::server_error("获取工艺路线失败");
        }
    };

    let result = sqlx::query!(
        r#"
        SELECT 
            pr.id, pr.route_code AS code, pr.route_name AS name, pr.description, pr.status,
            pr.created_at, pr.updated_at
        FROM process_routes pr
        WHERE pr.id = $1
        "#,
        uuid,
    )
    .fetch_one(&mut scope)
    .await;

    match result {
        Ok(r) => {
            let step_stats = sqlx::query(
                r#"
                SELECT 
                    COALESCE(SUM(prs.estimated_time_minutes), 0) as total_estimated_time_minutes,
                    COUNT(prs.id) as process_count
                FROM process_route_steps prs
                WHERE prs.route_id = $1
                "#,
            )
            .bind(uuid)
            .fetch_one(&mut scope)
            .await;

            let (total_estimated_time_minutes, process_count) = match step_stats {
                Ok(s) => {
                    let tst = s
                        .try_get::<BigDecimal, _>("total_estimated_time_minutes")
                        .ok()
                        .and_then(|d| d.to_string().parse::<f64>().ok());
                    let pc = s.try_get::<i64, _>("process_count").ok();
                    (tst, pc)
                }
                Err(_) => (None, None),
            };

            ApiResponse::success(
                ProcessRouteResponse {
                    id: r.id.to_string(),
                    code: r.code,
                    name: r.name,
                    description: r.description,
                    version: None,
                    status: r.status,
                    estimated_time_minutes: None,
                    total_estimated_time_minutes: total_estimated_time_minutes
                        .map(|d| d.to_string().parse::<f64>().unwrap_or_default()),
                    process_count,
                    created_at: r.created_at,
                    updated_at: r.updated_at,
                },
                "获取工艺路线成功",
            )
        }
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("工艺路线不存在"),
        Err(e) => {
            tracing::error!("Failed to get process route: {}", e);
            ApiResponse::server_error("获取工艺路线失败")
        }
    }
}

pub async fn create_process_route(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(body): Json<CreateProcessRouteRequest>,
) -> ApiResponse<ProcessRouteResponse> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let tenant_id = match crate::shared::permission::require_write_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立写作用域失败: {}", e);
            return ApiResponse::server_error("创建工艺路线失败");
        }
    };

    let result = sqlx::query!(
        r#"
        INSERT INTO process_routes (route_code, route_name, description, tenant_id)
        VALUES ($1, $2, $3, $4)
        RETURNING id, route_code AS code, route_name AS name, description, status,
            created_at, updated_at
        "#,
        body.code,
        body.name,
        body.description,
        tenant_id,
    )
    .fetch_one(&mut scope)
    .await;

    match result {
        Ok(r) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交工艺路线事务失败: {}", e);
                return ApiResponse::server_error("创建工艺路线失败");
            }
            // 失效列表缓存（创建后列表数据可能变化）
            state.dict_cache.clear_l1();

            // 发布缓存失效事件，通知其他服务失效相关缓存
            if let Some(ref publisher) = state.event_publisher {
                let publisher = publisher.clone();
                tokio::spawn(async move {
                    if let Err(e) = publisher
                        .publish_cache_invalidated(
                            "mes:process_route:*",
                            "pattern",
                            Some("process_route_created"),
                        )
                        .await
                    {
                        tracing::warn!("发布缓存失效事件失败: {}", e);
                    }
                });
            }

            ApiResponse::success(
                ProcessRouteResponse {
                    id: r.id.to_string(),
                    code: r.code,
                    name: r.name,
                    description: r.description,
                    version: None,
                    status: r.status,
                    estimated_time_minutes: None,
                    total_estimated_time_minutes: None,
                    process_count: None,
                    created_at: r.created_at,
                    updated_at: r.updated_at,
                },
                "创建工艺路线成功",
            )
        }
        Err(e) => {
            tracing::error!("Failed to create process route: {}", e);
            ApiResponse::server_error("创建工艺路线失败")
        }
    }
}

#[derive(sqlx::FromRow)]
struct ProcessRouteUpdateRow {
    id: Uuid,
    code: String,
    name: String,
    description: Option<String>,
    status: String,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

pub async fn update_process_route(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(body): Json<UpdateProcessRouteRequest>,
) -> ApiResponse<ProcessRouteResponse> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return ApiResponse::bad_request("无效的工艺路线ID");
        }
    };

    let tenant_id = get_tenant_id(&claims);

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立写作用域失败: {}", e);
            return ApiResponse::server_error("更新工艺路线失败");
        }
    };

    let result = sqlx::query_as::<_, ProcessRouteUpdateRow>(
        r#"
        UPDATE process_routes
        SET 
            route_name = COALESCE($1, route_name),
            description = COALESCE($2, description),
            status = COALESCE($3, status),
            updated_at = NOW()
        WHERE id = $4 AND tenant_id = $5::uuid
        RETURNING id, route_code AS code, route_name AS name, description, status,
            created_at, updated_at
        "#,
    )
    .bind(body.name)
    .bind(body.description)
    .bind(body.status)
    .bind(uuid)
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await;

    match result {
        Ok(r) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交工艺路线事务失败: {}", e);
                return ApiResponse::server_error("更新工艺路线失败");
            }
            // 失效列表缓存（更新后列表数据可能变化）
            state.dict_cache.clear_l1();

            // 发布缓存失效事件，通知其他服务失效相关缓存
            if let Some(ref publisher) = state.event_publisher {
                let publisher = publisher.clone();
                tokio::spawn(async move {
                    if let Err(e) = publisher
                        .publish_cache_invalidated(
                            "mes:process_route:*",
                            "pattern",
                            Some("process_route_updated"),
                        )
                        .await
                    {
                        tracing::warn!("发布缓存失效事件失败: {}", e);
                    }
                });
            }

            ApiResponse::success(
                ProcessRouteResponse {
                    id: r.id.to_string(),
                    code: r.code,
                    name: r.name,
                    description: r.description,
                    version: None,
                    status: r.status,
                    estimated_time_minutes: None,
                    total_estimated_time_minutes: None,
                    process_count: None,
                    created_at: r.created_at,
                    updated_at: r.updated_at,
                },
                "更新工艺路线成功",
            )
        }
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("工艺路线不存在"),
        Err(e) => {
            tracing::error!("Failed to update process route: {}", e);
            ApiResponse::server_error("更新工艺路线失败")
        }
    }
}

pub async fn delete_process_route(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> ApiResponse<String> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return ApiResponse::bad_request("无效的工艺路线ID");
        }
    };

    let tenant_id = get_tenant_id(&claims);

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立写作用域失败: {}", e);
            return ApiResponse::server_error("删除工艺路线失败");
        }
    };

    let result = sqlx::query(
        r#"
        UPDATE process_routes SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2::uuid
        "#,
    )
    .bind(uuid)
    .bind(tenant_id)
    .execute(&mut scope)
    .await;

    match result {
        Ok(_) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交工艺路线事务失败: {}", e);
                return ApiResponse::server_error("删除工艺路线失败");
            }
            // 失效列表缓存（删除后列表数据可能变化）
            state.dict_cache.clear_l1();

            // 发布缓存失效事件，通知其他服务失效相关缓存
            if let Some(ref publisher) = state.event_publisher {
                let publisher = publisher.clone();
                tokio::spawn(async move {
                    if let Err(e) = publisher
                        .publish_cache_invalidated(
                            "mes:process_route:*",
                            "pattern",
                            Some("process_route_deleted"),
                        )
                        .await
                    {
                        tracing::warn!("发布缓存失效事件失败: {}", e);
                    }
                });
            }

            ApiResponse::success(id, "删除工艺路线成功")
        }
        Err(e) => {
            tracing::error!("Failed to delete process route: {}", e);
            ApiResponse::server_error("删除工艺路线失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:process:read"])),
    path = "/process-routes/{id}/steps",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Process"
)]
pub async fn get_route_steps(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> ApiResponse<serde_json::Value> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkStationRead).await
    {
        return e;
    }

    let route_uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return ApiResponse::bad_request("无效的工艺路线ID");
        }
    };

    // 租户作用域读：process_route_steps 受 RLS 保护，裸 pool 会返回 0 行。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立只读作用域失败: {}", e);
            return ApiResponse::server_error("获取工艺路线步骤失败");
        }
    };

    let result = sqlx::query!(
        r#"
        SELECT 
            prs.id, prs.route_id, prs.process_id, prs.sequence,
            prs.estimated_time_minutes, pp.work_station_id,
            NULL::text AS description, prs.created_at,
            pp.process_name as process_name, pp.process_code as process_code,
            ws.station_name as work_station_name
        FROM process_route_steps prs
        LEFT JOIN production_processes pp ON prs.process_id = pp.id
        LEFT JOIN work_stations ws ON pp.work_station_id = ws.id
        WHERE prs.route_id = $1
        ORDER BY prs.sequence ASC
        "#,
        route_uuid,
    )
    .fetch_all(&mut scope)
    .await;

    match result {
        Ok(steps) => {
            let step_responses: Vec<ProcessRouteStepResponse> = steps
                .into_iter()
                .map(|s| ProcessRouteStepResponse {
                    id: s.id.to_string(),
                    route_id: s.route_id.to_string(),
                    process_id: s.process_id.to_string(),
                    process_name: s.process_name,
                    process_code: s.process_code,
                    sequence: s.sequence,
                    estimated_time_minutes: s
                        .estimated_time_minutes
                        .map(|d| d.to_string().parse::<f64>().unwrap_or_default()),
                    work_station_id: s.work_station_id.map(|u| u.to_string()),
                    work_station_name: Some(s.work_station_name),
                    description: s.description,
                    created_at: s.created_at,
                })
                .collect();

            ApiResponse::success(
                serde_json::json!({ "steps": step_responses }),
                "获取工艺路线步骤成功",
            )
        }
        Err(e) => {
            tracing::error!("Failed to get route steps: {}", e);
            ApiResponse::server_error("获取工艺路线步骤失败")
        }
    }
}

pub async fn add_route_step(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(body): Json<AddProcessRouteStepRequest>,
) -> ApiResponse<ProcessRouteStepResponse> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let route_uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return ApiResponse::bad_request("无效的工艺路线ID");
        }
    };

    let process_uuid = match Uuid::parse_str(&body.process_id) {
        Ok(u) => u,
        Err(_) => {
            return ApiResponse::bad_request("无效的工序ID");
        }
    };

    let _work_station_uuid = body
        .work_station_id
        .as_ref()
        .and_then(|id| Uuid::parse_str(id).ok());
    let estimated_time_minutes = body
        .estimated_time_minutes
        .and_then(|v| v.to_string().parse::<BigDecimal>().ok());

    let tenant_id = match crate::shared::permission::require_write_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立写作用域失败: {}", e);
            return ApiResponse::server_error("添加工艺路线步骤失败");
        }
    };

    let result = sqlx::query!(
        r#"
        INSERT INTO process_route_steps (
            route_id, process_id, sequence, estimated_time_minutes, tenant_id
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, route_id, process_id, sequence,
            estimated_time_minutes,
            NULL::uuid AS work_station_id, NULL::text AS description, created_at
        "#,
        route_uuid,
        process_uuid,
        body.sequence,
        estimated_time_minutes,
        tenant_id,
    )
    .fetch_one(&mut scope)
    .await;

    match result {
        Ok(s) => {
            let process_info = sqlx::query!(
                r#"
                SELECT process_name AS name, process_code AS process_no FROM production_processes WHERE id = $1 AND tenant_id = $2::uuid
                "#,
                process_uuid,
                tenant_id,
            )
            .fetch_one(&mut scope)
            .await;

            let (process_name, process_code) = match process_info {
                Ok(p) => (Some(p.name), p.process_no),
                Err(_) => (None, String::new()),
            };

            if let Err(e) = scope.commit().await {
                tracing::error!("提交工艺路线步骤事务失败: {}", e);
                return ApiResponse::server_error("添加工艺路线步骤失败");
            }

            ApiResponse::success(
                ProcessRouteStepResponse {
                    id: s.id.to_string(),
                    route_id: s.route_id.to_string(),
                    process_id: s.process_id.to_string(),
                    process_name: process_name.unwrap_or_default(),
                    process_code,
                    sequence: s.sequence,
                    estimated_time_minutes: s
                        .estimated_time_minutes
                        .map(|d| d.to_string().parse::<f64>().unwrap_or_default()),
                    work_station_id: s.work_station_id.map(|u| u.to_string()),
                    work_station_name: None,
                    description: s.description,
                    created_at: s.created_at,
                },
                "添加工艺路线步骤成功",
            )
        }
        Err(e) => {
            tracing::error!("Failed to add route step: {}", e);
            ApiResponse::server_error("添加工艺路线步骤失败")
        }
    }
}

#[derive(sqlx::FromRow)]
struct ProcessRouteStepUpdateRow {
    id: Uuid,
    route_id: Uuid,
    process_id: Uuid,
    sequence: i32,
    estimated_time_minutes: Option<BigDecimal>,
    work_station_id: Option<Uuid>,
    description: Option<String>,
    created_at: DateTime<Utc>,
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["mes:process:write"])),
    path = "/process-routes/{id}/steps/{step_id}",
    params(
("id" = String, Path, description = "id"),
("step_id" = String, Path, description = "step_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Process"
)]
pub async fn update_route_step(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path((_id, step_id)): Path<(String, String)>,
    Json(body): Json<UpdateProcessRouteStepRequest>,
) -> ApiResponse<ProcessRouteStepResponse> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let step_uuid = match Uuid::parse_str(&step_id) {
        Ok(u) => u,
        Err(_) => {
            return ApiResponse::bad_request("无效的步骤ID");
        }
    };

    let _work_station_uuid = body
        .work_station_id
        .as_ref()
        .and_then(|id| Uuid::parse_str(id).ok());
    let estimated_time_minutes = body
        .estimated_time_minutes
        .and_then(|v| v.to_string().parse::<BigDecimal>().ok());

    let tenant_id = get_tenant_id(&claims);

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立写作用域失败: {}", e);
            return ApiResponse::server_error("更新工艺路线步骤失败");
        }
    };

    let result = sqlx::query_as::<_, ProcessRouteStepUpdateRow>(
        r#"
        UPDATE process_route_steps
        SET 
            sequence = COALESCE($1, sequence),
            estimated_time_minutes = COALESCE($2, estimated_time_minutes)
        WHERE id = $3 AND tenant_id = $4::uuid
        RETURNING id, route_id, process_id, sequence,
            estimated_time_minutes,
            NULL::uuid AS work_station_id, NULL::text AS description, created_at
        "#,
    )
    .bind(body.sequence)
    .bind(estimated_time_minutes)
    .bind(step_uuid)
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await;

    match result {
        Ok(s) => {
            let process_info = sqlx::query!(
                r#"
                SELECT process_name AS name, process_code AS process_no FROM production_processes WHERE id = $1
                "#,
                s.process_id,
            )
            .fetch_one(&mut scope)
            .await;

            let (process_name, process_code) = match process_info {
                Ok(p) => (Some(p.name), p.process_no),
                Err(_) => (None, String::new()),
            };

            if let Err(e) = scope.commit().await {
                tracing::error!("提交工艺路线步骤事务失败: {}", e);
                return ApiResponse::server_error("更新工艺路线步骤失败");
            }

            ApiResponse::success(
                ProcessRouteStepResponse {
                    id: s.id.to_string(),
                    route_id: s.route_id.to_string(),
                    process_id: s.process_id.to_string(),
                    process_name: process_name.unwrap_or_default(),
                    process_code,
                    sequence: s.sequence,
                    estimated_time_minutes: s
                        .estimated_time_minutes
                        .map(|d| d.to_string().parse::<f64>().unwrap_or_default()),
                    work_station_id: s.work_station_id.map(|u| u.to_string()),
                    work_station_name: None,
                    description: s.description,
                    created_at: s.created_at,
                },
                "更新工艺路线步骤成功",
            )
        }
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("工艺路线步骤不存在"),
        Err(e) => {
            tracing::error!("Failed to update route step: {}", e);
            ApiResponse::server_error("更新工艺路线步骤失败")
        }
    }
}

pub async fn remove_route_step(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path((_id, step_id)): Path<(String, String)>,
) -> ApiResponse<String> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let step_uuid = match Uuid::parse_str(&step_id) {
        Ok(u) => u,
        Err(_) => {
            return ApiResponse::bad_request("无效的步骤ID");
        }
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立写作用域失败: {}", e);
            return ApiResponse::server_error("删除工艺路线步骤失败");
        }
    };

    let result = sqlx::query!(
        r#"
        DELETE FROM process_route_steps WHERE id = $1
        "#,
        step_uuid,
    )
    .execute(&mut scope)
    .await;

    match result {
        Ok(_) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交工艺路线步骤事务失败: {}", e);
                return ApiResponse::server_error("删除工艺路线步骤失败");
            }
            ApiResponse::success(step_id, "删除工艺路线步骤成功")
        }
        Err(e) => {
            tracing::error!("Failed to remove route step: {}", e);
            ApiResponse::server_error("删除工艺路线步骤失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["mes:process:write"])),
    path = "/process-routes/{id}/steps/reorder",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Process"
)]
#[allow(
    clippy::as_conversions,
    clippy::cast_possible_truncation,
    clippy::cast_possible_wrap
)]
pub async fn reorder_route_steps(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(body): Json<ReorderStepsRequest>,
) -> ApiResponse<serde_json::Value> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let route_uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return ApiResponse::bad_request("无效的工艺路线ID");
        }
    };

    let tenant_id = get_tenant_id(&claims);

    // 先完成全部入参校验（任一非法即 400，此时零写入），避免「部分步骤已写入后再报错」。
    let mut step_ids = Vec::with_capacity(body.step_ids.len());
    for step_id in &body.step_ids {
        match Uuid::parse_str(step_id) {
            Ok(u) => step_ids.push(u),
            Err(_) => return ApiResponse::bad_request("无效的步骤ID"),
        }
    }

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut tx = match state.db.scope_with(txn).await {
        Ok(tx) => tx,
        Err(e) => {
            tracing::error!("Failed to begin transaction: {}", e);
            return ApiResponse::server_error("重排序工艺路线步骤失败");
        }
    };

    let mut write_error: Option<sqlx::Error> = None;
    for (idx, step_uuid) in step_ids.iter().enumerate() {
        match sqlx::query(
            r#"
            UPDATE process_route_steps
            SET sequence = $1
            WHERE id = $2 AND route_id = $3 AND tenant_id = $4::uuid
            "#,
        )
        .bind((idx + 1) as i32)
        .bind(step_uuid)
        .bind(route_uuid)
        .bind(tenant_id)
        .execute(&mut tx)
        .await
        {
            Ok(_) => {}
            Err(e) => {
                write_error = Some(e);
                break;
            }
        }
    }
    if let Some(e) = write_error {
        // 写入失败返回 500：事务归属 tenant_middleware，非 2xx 由其 finalizer 统一回滚，
        // 已写入的步骤不会落库（handler 持有的 ScopedTxn 无法自行回滚）。
        tracing::error!("Failed to reorder step: {}", e);
        return ApiResponse::server_error("重排序工艺路线步骤失败");
    }

    if let Err(e) = tx.commit().await {
        tracing::error!("Failed to commit transaction: {}", e);
        return ApiResponse::server_error("重排序工艺路线步骤失败");
    }

    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立只读作用域失败: {}", e);
            return ApiResponse::server_error("获取重排序后的步骤失败");
        }
    };

    let result = sqlx::query!(
        r#"
        SELECT 
            prs.id, prs.route_id, prs.process_id, prs.sequence,
            prs.estimated_time_minutes, pp.work_station_id,
            NULL::text AS description, prs.created_at,
            pp.process_name as process_name, pp.process_code as process_code,
            ws.station_name as work_station_name
        FROM process_route_steps prs
        LEFT JOIN production_processes pp ON prs.process_id = pp.id
        LEFT JOIN work_stations ws ON pp.work_station_id = ws.id
        WHERE prs.route_id = $1
        ORDER BY prs.sequence ASC
        "#,
        route_uuid,
    )
    .fetch_all(&mut scope)
    .await;

    match result {
        Ok(steps) => {
            let step_responses: Vec<ProcessRouteStepResponse> = steps
                .into_iter()
                .map(|s| ProcessRouteStepResponse {
                    id: s.id.to_string(),
                    route_id: s.route_id.to_string(),
                    process_id: s.process_id.to_string(),
                    process_name: s.process_name,
                    process_code: s.process_code,
                    sequence: s.sequence,
                    estimated_time_minutes: s
                        .estimated_time_minutes
                        .map(|d| d.to_string().parse::<f64>().unwrap_or_default()),
                    work_station_id: s.work_station_id.map(|u| u.to_string()),
                    work_station_name: Some(s.work_station_name),
                    description: s.description,
                    created_at: s.created_at,
                })
                .collect();

            ApiResponse::success(
                serde_json::json!({ "steps": step_responses }),
                "重排序工艺路线步骤成功",
            )
        }
        Err(e) => {
            tracing::error!("Failed to fetch reordered steps: {}", e);
            ApiResponse::server_error("获取重排序后的步骤失败")
        }
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
mod tests {
    use super::*;
    use chrono::TimeZone;
    use topems_shared_db::decimal::big_decimal_to_f64_opt;

    #[test]
    fn naive_to_utc_some_keeps_value() {
        let dt = Utc.with_ymd_and_hms(2024, 7, 1, 9, 45, 0).unwrap();
        let utc = naive_to_utc(Some(dt));
        assert_eq!(utc.date_naive(), dt.date_naive());
        assert_eq!(utc.time(), dt.time());
    }

    #[test]
    fn naive_to_utc_none_uses_now() {
        let before = Utc::now();
        let out = naive_to_utc(None);
        let after = Utc::now();
        assert!(out >= before && out <= after);
    }

    #[test]
    fn datetime_to_string_some_rfc3339() {
        let dt = Utc.with_ymd_and_hms(2024, 3, 1, 0, 0, 0).unwrap();
        let s = datetime_to_string(Some(dt));
        assert!(s.starts_with("2024-03-01T00:00:00"), "got {}", s);
    }

    #[test]
    fn datetime_to_string_none_valid() {
        let s = datetime_to_string(None);
        assert!(s.is_empty());
    }

    #[test]
    fn big_decimal_to_f64_some() {
        let bd: BigDecimal = "12.5".parse().unwrap();
        assert_eq!(big_decimal_to_f64_opt(Some(bd)), Some(12.5));
    }

    #[test]
    fn big_decimal_to_f64_none() {
        assert_eq!(big_decimal_to_f64_opt(None), None);
    }
}

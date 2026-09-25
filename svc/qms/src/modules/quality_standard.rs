//! Quality Standard handlers

use crate::models::quality_standard::*;
use axum::{
    extract::State,
    routing::{delete, get, post, put},
    Extension, Json, Router,
};
use sqlx::types::Uuid;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::get_tenant_id;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::cache::{record_cache_hit, record_cache_miss, record_cache_set};
use topems_shared_core::response::ApiResponse;

/// 质量标准列表缓存 Key
fn standards_list_cache_key(
    tenant_id: &Uuid,
    page: i64,
    page_size: i64,
    category: &Option<String>,
    status: &Option<String>,
    search: &Option<String>,
) -> String {
    format!(
        "qms:quality_standard:list:{}:page:{}:page_size:{}:category:{:?}:status:{:?}:search:{:?}",
        tenant_id, page, page_size, category, status, search
    )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:read"])),
    path = "/api/qms/standards",
    tag = "quality_standard",
    params(
        ("page" = Option<i64>, Query, description = "页码"),
        ("page_size" = Option<i64>, Query, description = "每页数量"),
        ("category" = Option<String>, Query, description = "分类过滤"),
        ("status" = Option<String>, Query, description = "状态过滤"),
        ("search" = Option<String>, Query, description = "搜索关键词"),
    ),
    responses(
        (status = 200, description = "质量标准列表", body = ApiResponse<ListStandardsResponse>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn list_standards(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    axum::extract::Query(query): axum::extract::Query<StandardQuery>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<ListStandardsResponse>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;
    let tenant_id = get_tenant_id(&claims, &headers);

    // 构建缓存 Key 并检查缓存（异步多级缓存：L1 moka + L2 Redis）
    let cache_key = standards_list_cache_key(
        &tenant_id,
        page,
        page_size,
        &query.category,
        &query.status,
        &query.search,
    );
    if let Some(cached) = state.dict_cache.get(&cache_key).await {
        record_cache_hit("qms", "quality_standard", "list");
        tracing::debug!(
            service = "qms",
            entity = "quality_standard",
            operation = "list",
            tenant_id = %tenant_id,
            cache_key = %cache_key,
            "质量标准列表缓存命中"
        );
        // 将缓存的 serde_json::Value 转换为具体类型
        if let Ok(response) = serde_json::from_value::<ListStandardsResponse>(cached) {
            return Json(ApiResponse::success(response, "获取质量标准列表成功"));
        }
        // 转换失败时继续查询数据库
    }

    // 缓存未命中，记录指标
    record_cache_miss("qms", "quality_standard", "list");

    let _params: Vec<serde_json::Value> = Vec::new();
    let where_clause = String::from(" WHERE ($1::uuid IS NULL OR tenant_id = $1)");

    let count_sql = format!(
        "SELECT COUNT(*) as total FROM qms.qa_standards{}",
        where_clause
    );

    let count_query = sqlx::query_scalar(&count_sql).bind(tenant_opt);

    let total: Option<i64> = match count_query.fetch_one(&state.pool).await {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("Failed to count standards: {}", e);
            return Json(ApiResponse::error(500, "获取质量标准列表失败"));
        }
    };

    let fetch_sql = format!(
        r#"
        SELECT id, tenant_id::TEXT, code, name, category, level, specification,
            description, version, status, created_by,
            created_at, updated_at
        FROM qms.qa_standards
        {}
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        "#,
        where_clause,
    );

    let fetch_query = sqlx::query_as::<_, QualityStandard>(&fetch_sql)
        .bind(tenant_opt)
        .bind(page_size)
        .bind(offset);

    match fetch_query.fetch_all(&state.pool).await {
        Ok(data) => {
            let response = ListStandardsResponse {
                standards: data,
                total: total.unwrap_or(0),
                page,
                page_size,
            };
            // 写入缓存（异步多级缓存：write-through L1 + L2）
            if let Ok(cached_value) = serde_json::to_value(&response) {
                state.dict_cache.set(cache_key.clone(), cached_value).await;
                record_cache_set("qms", "quality_standard", "list");
                tracing::debug!(
                    service = "qms",
                    entity = "quality_standard",
                    operation = "list",
                    tenant_id = %tenant_id,
                    cache_key = %cache_key,
                    "质量标准列表缓存写入"
                );
            }
            Json(ApiResponse::success(response, "获取质量标准列表成功"))
        }
        Err(e) => {
            tracing::error!("Failed to fetch standards: {}", e);
            Json(ApiResponse::error(500, "获取质量标准列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:write"])),
    path = "/api/qms/standards",
    tag = "quality_standard",
    request_body = CreateStandardRequest,
    responses(
        (status = 200, description = "质量标准创建成功", body = ApiResponse<QualityStandard>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn create_standard(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateStandardRequest>,
) -> Json<ApiResponse<QualityStandard>> {
    let code = format!(
        "QS-{}",
        uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
    );
    let version = req.version.unwrap_or_else(|| "1.0".to_string());
    let tenant_id = get_tenant_id(&claims, &headers);

    let standard = sqlx::query_as::<_, QualityStandard>(only_own_schema_query!("qms", r#"INSERT INTO qms.qa_standards (tenant_id, code, name, category, level, specification, description, version, status, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9) RETURNING id, tenant_id::TEXT, code, name, category, level, specification, description, version, status, created_by, created_at, updated_at"#)).bind(tenant_id).bind(code).bind(req.name).bind(req.category).bind(req.level).bind(req.specification).bind(req.description).bind(version).bind(req.created_by)
    .fetch_one(&state.pool)
    .await;

    match standard {
        Ok(data) => {
            let created_by = data.created_by.clone();
            if let Ok(standard_id) = Uuid::parse_str(&data.id) {
                let _ = sqlx::query(only_own_schema_query!("qms", r#"INSERT INTO qms.qa_standard_revisions (tenant_id, standard_id, version, name, category, level, specification, description, status, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)"#)).bind(tenant_id).bind(standard_id).bind(data.version.clone()).bind(data.name.clone()).bind(data.category.clone()).bind(data.level.clone()).bind(data.specification.clone()).bind(data.description.clone()).bind(data.status.clone()).bind(created_by)
                .execute(&state.pool)
                .await;
            }
            // 失效列表缓存（创建后列表数据可能变化）
            state.dict_cache.clear_l1();

            // 发布缓存失效事件，通知其他服务失效相关缓存
            if let Some(ref publisher) = state.event_publisher {
                let publisher = publisher.clone();
                tokio::spawn(async move {
                    if let Err(e) = publisher
                        .publish_cache_invalidated(
                            "qms:quality_standard:*",
                            "pattern",
                            Some("quality_standard_created"),
                        )
                        .await
                    {
                        tracing::warn!("发布缓存失效事件失败: {}", e);
                    }
                });
            }

            Json(ApiResponse::success(data, "质量标准创建成功"))
        }
        Err(e) => {
            tracing::error!("Failed to create standard: {}", e);
            Json(ApiResponse::error(500, "质量标准创建失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:read"])),
    path = "/api/qms/standards/{id}",
    tag = "quality_standard",
    params(
        ("id" = String, Path, description = "标准ID"),
    ),
    responses(
        (status = 200, description = "质量标准详情", body = ApiResponse<QualityStandard>),
        (status = 400, description = "无效的标准ID"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_standard(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<String>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<QualityStandard>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的标准ID")),
    };
    let _tenant_id = get_tenant_id(&claims, &headers);

    let standard = sqlx::query_as::<_, QualityStandard>(only_own_schema_query!("qms", r#"SELECT id, tenant_id::TEXT, code, name, category, level, specification, description, version, status, created_by, created_at, updated_at FROM qms.qa_standards WHERE deleted_at IS NULL AND id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)"#)).bind(id).bind(tenant_opt)
    .fetch_one(&state.pool)
    .await;

    match standard {
        Ok(data) => Json(ApiResponse::success(data, "获取质量标准成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "记录不存在")),

        Err(e) => {
            tracing::error!("Failed to fetch standard: {}", e);
            Json(ApiResponse::error(500, "获取质量标准失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["qms:update"])),
    path = "/api/qms/standards/{id}",
    tag = "quality_standard",
    params(
        ("id" = String, Path, description = "标准ID"),
    ),
    request_body = UpdateStandardRequest,
    responses(
        (status = 200, description = "质量标准更新成功", body = ApiResponse<QualityStandard>),
        (status = 400, description = "无效的标准ID"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn update_standard(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<String>,
    headers: axum::http::HeaderMap,
    Json(req): Json<UpdateStandardRequest>,
) -> Json<ApiResponse<QualityStandard>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的标准ID")),
    };
    let tenant_id = get_tenant_id(&claims, &headers);

    let current = sqlx::query_as::<_, QualityStandard>(only_own_schema_query!("qms", r#"SELECT id, tenant_id::TEXT, code, name, category, level, specification, description, version, status, created_by, created_at, updated_at FROM qms.qa_standards WHERE deleted_at IS NULL AND id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)"#)).bind(id).bind(tenant_opt)
    .fetch_one(&state.pool)
    .await;

    if let Ok(current_data) = current {
        if let Ok(standard_id) = Uuid::parse_str(&current_data.id) {
            let _ = sqlx::query(only_own_schema_query!("qms", r#"INSERT INTO qms.qa_standard_revisions (tenant_id, standard_id, version, name, category, level, specification, description, status, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)"#)).bind(tenant_id).bind(standard_id).bind(current_data.version).bind(current_data.name).bind(current_data.category).bind(current_data.level).bind(current_data.specification).bind(current_data.description).bind(current_data.status).bind(current_data.created_by)
            .execute(&state.pool)
            .await;
        }
    }

    let standard = sqlx::query_as::<_, QualityStandard>(only_own_schema_query!("qms", r#"UPDATE qms.qa_standards SET name = COALESCE($2, name), category = COALESCE($3, category), level = COALESCE($4, level), specification = COALESCE($5, specification), description = COALESCE($6, description), version = COALESCE($7, version), status = COALESCE($8, status), updated_at = NOW() WHERE id = $1 AND tenant_id = $9 RETURNING id, tenant_id::TEXT, code, name, category, level, specification, description, version, status, created_by, created_at, updated_at"#)).bind(id).bind(req.name).bind(req.category).bind(req.level).bind(req.specification).bind(req.description).bind(req.version).bind(req.status).bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match standard {
        Ok(data) => {
            // 失效列表缓存（更新后列表数据可能变化）
            state.dict_cache.clear_l1();

            // 发布缓存失效事件，通知其他服务失效相关缓存
            if let Some(ref publisher) = state.event_publisher {
                let publisher = publisher.clone();
                tokio::spawn(async move {
                    if let Err(e) = publisher
                        .publish_cache_invalidated(
                            "qms:quality_standard:*",
                            "pattern",
                            Some("quality_standard_updated"),
                        )
                        .await
                    {
                        tracing::warn!("发布缓存失效事件失败: {}", e);
                    }
                });
            }

            Json(ApiResponse::success(data, "质量标准更新成功"))
        }
        Err(e) => {
            tracing::error!("Failed to update standard: {}", e);
            Json(ApiResponse::error(500, "质量标准更新失败"))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["qms:delete"])),
    path = "/api/qms/standards/{id}",
    tag = "quality_standard",
    params(
        ("id" = String, Path, description = "标准ID"),
    ),
    responses(
        (status = 200, description = "质量标准删除成功", body = ApiResponse<()>),
        (status = 400, description = "无效的标准ID"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn delete_standard(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<String>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<bool>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的标准ID")),
    };
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query(only_own_schema_query!(
        "qms",
        r#"UPDATE qms.qa_standards SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2"#
    ))
    .bind(id)
    .bind(tenant_id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => {
            // 失效列表缓存（删除后列表数据可能变化）
            state.dict_cache.clear_l1();

            // 发布缓存失效事件，通知其他服务失效相关缓存
            if let Some(ref publisher) = state.event_publisher {
                let publisher = publisher.clone();
                tokio::spawn(async move {
                    if let Err(e) = publisher
                        .publish_cache_invalidated(
                            "qms:quality_standard:*",
                            "pattern",
                            Some("quality_standard_deleted"),
                        )
                        .await
                    {
                        tracing::warn!("发布缓存失效事件失败: {}", e);
                    }
                });
            }

            Json(ApiResponse::success(true, "质量标准删除成功"))
        }
        Err(e) => {
            tracing::error!("Failed to delete standard: {}", e);
            Json(ApiResponse::error(500, "质量标准删除失败"))
        }
    }
}

pub async fn list_revisions(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<String>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<Vec<StandardRevision>>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的标准ID")),
    };
    let _tenant_id = get_tenant_id(&claims, &headers);

    let revisions = sqlx::query_as::<_, StandardRevision>(only_own_schema_query!("qms", r#"SELECT id, tenant_id::TEXT, standard_id, version, name, category, level, specification, description, status, created_by, created_at FROM qms.qa_standard_revisions WHERE standard_id = $1 AND ($2::uuid IS NULL OR tenant_id = $2) ORDER BY created_at DESC"#)).bind(id).bind(tenant_opt)
    .fetch_all(&state.pool)
    .await;

    match revisions {
        Ok(data) => Json(ApiResponse::success(data, "获取质量标准修订记录成功")),
        Err(e) => {
            tracing::error!("Failed to fetch revisions: {}", e);
            Json(ApiResponse::error(500, "获取质量标准修订记录失败"))
        }
    }
}

pub async fn create_revision(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<String>,
    headers: axum::http::HeaderMap,
    Json(req): Json<UpdateStandardRequest>,
) -> Json<ApiResponse<QualityStandard>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的标准ID")),
    };
    let tenant_id = get_tenant_id(&claims, &headers);

    let current = sqlx::query_as::<_, QualityStandard>(only_own_schema_query!("qms", r#"SELECT id, tenant_id::TEXT, code, name, category, level, specification, description, version, status, created_by, created_at, updated_at FROM qms.qa_standards WHERE deleted_at IS NULL AND id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)"#)).bind(id).bind(tenant_opt)
    .fetch_one(&state.pool)
    .await;

    match current {
        Ok(current_data) => {
            let version = current_data.version.clone();
            let name = current_data.name.clone();
            let category = current_data.category.clone();
            let level = current_data.level.clone();
            let specification = current_data.specification.clone();
            let description = current_data.description.clone();
            let status = current_data.status.clone();
            let created_by = current_data.created_by.clone();

            if let Ok(standard_id) = Uuid::parse_str(&current_data.id) {
                let _ = sqlx::query(only_own_schema_query!("qms", r#"INSERT INTO qms.qa_standard_revisions (tenant_id, standard_id, version, name, category, level, specification, description, status, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)"#)).bind(tenant_id).bind(standard_id).bind(version.clone()).bind(name.clone()).bind(category.clone()).bind(level.clone()).bind(specification.clone()).bind(description.clone()).bind(status.clone()).bind(created_by.clone())
                    .execute(&state.pool)
                    .await;
            }

            let new_version = req.version.unwrap_or_else(|| {
                let current_version = version.as_deref().unwrap_or("1.0");
                let parts: Vec<&str> = current_version.split('.').collect();
                if parts.len() >= 2 {
                    let mut v: Vec<String> = parts.iter().map(|s| s.to_string()).collect();
                    if let Ok(patch) = v[1].parse::<i32>() {
                        v[1] = (patch + 1).to_string();
                    }
                    v.join(".")
                } else {
                    format!("{}.1", current_version)
                }
            });

            let standard = sqlx::query_as::<_, QualityStandard>(only_own_schema_query!("qms", r#"UPDATE qms.qa_standards SET name = COALESCE($2, name), category = COALESCE($3, category), level = COALESCE($4, level), specification = COALESCE($5, specification), description = COALESCE($6, description), version = $7, status = COALESCE($8, status), updated_at = NOW() WHERE id = $1 AND tenant_id = $9 RETURNING id, tenant_id::TEXT, code, name, category, level, specification, description, version, status, created_by, created_at, updated_at"#)).bind(id).bind(req.name).bind(req.category).bind(req.level).bind(req.specification).bind(req.description).bind(new_version).bind(req.status).bind(tenant_id)
            .fetch_one(&state.pool)
            .await;

            match standard {
                Ok(data) => Json(ApiResponse::success(data, "质量标准版本创建成功")),
                Err(e) => {
                    tracing::error!("Failed to create revision: {}", e);
                    Json(ApiResponse::error(500, "质量标准版本创建失败"))
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to find standard: {}", e);
            Json(ApiResponse::error(404, "质量标准不存在"))
        }
    }
}

pub fn create_routes() -> Router<crate::AppState> {
    Router::new()
        .route("/standards", get(list_standards))
        .route("/standards", post(create_standard))
        .route("/standards/{id}", get(get_standard))
        .route("/standards/{id}", put(update_standard))
        .route("/standards/{id}", delete(delete_standard))
        .route("/standards/{id}/revisions", get(list_revisions))
        .route("/standards/{id}/revisions", post(create_revision))
}

use axum::{
    extract::State,
    routing::{get, post, put},
    Extension, Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, Row};
use topems_shared_auth::middleware::tenant::TenantContext;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

use crate::shared::AppState;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/test-methods", get(list_methods).post(create_method))
        .route(
            "/test-methods/{id}",
            get(get_method).put(update_method).delete(delete_method),
        )
        .route("/test-methods/{id}/versions", get(list_method_versions))
        .route("/test-methods/{id}/new-version", post(create_new_version))
        .route(
            "/method-categories",
            get(list_categories).post(create_category),
        )
        .route(
            "/method-categories/{id}",
            put(update_category).delete(delete_category),
        )
        .route(
            "/method-validations",
            get(list_validations).post(create_validation),
        )
}

fn test_method_cache_key(tenant_id: &Option<Uuid>, id: &str) -> String {
    format!(
        "test_method:{}:{}",
        tenant_id.map_or("all".to_string(), |t| t.to_string()),
        id
    )
}

#[derive(Debug, Deserialize)]
pub struct TestMethodQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub category_id: Option<String>,
    pub method_name: Option<String>,
    pub method_code: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestMethod {
    pub id: String,
    pub tenant_id: String,
    pub method_code: String,
    pub method_name: String,
    pub category_id: Option<String>,
    pub category_name: Option<String>,
    pub standard: Option<String>,
    pub version: String,
    pub description: Option<String>,
    pub principle: Option<String>,
    pub instruments: Option<serde_json::Value>,
    pub reagents: Option<serde_json::Value>,
    pub parameters: Option<serde_json::Value>,
    pub steps: Option<serde_json::Value>,
    pub calculation_formula: Option<String>,
    pub uncertainty_ref: Option<String>,
    pub status: String,
    pub validated: bool,
    pub validated_at: Option<String>,
    pub validated_by: Option<String>,
    pub created_by: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateTestMethodRequest {
    pub method_code: String,
    pub method_name: String,
    pub category_id: Option<String>,
    pub standard: Option<String>,
    pub description: Option<String>,
    pub principle: Option<String>,
    pub instruments: Option<serde_json::Value>,
    pub reagents: Option<serde_json::Value>,
    pub parameters: Option<serde_json::Value>,
    pub steps: Option<serde_json::Value>,
    pub calculation_formula: Option<String>,
    pub uncertainty_ref: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTestMethodRequest {
    pub method_name: Option<String>,
    pub category_id: Option<String>,
    pub standard: Option<String>,
    pub description: Option<String>,
    pub principle: Option<String>,
    pub instruments: Option<serde_json::Value>,
    pub reagents: Option<serde_json::Value>,
    pub parameters: Option<serde_json::Value>,
    pub steps: Option<serde_json::Value>,
    pub calculation_formula: Option<String>,
    pub uncertainty_ref: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct MethodCategoryQuery {
    pub parent_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct MethodCategory {
    pub id: String,
    pub tenant_id: String,
    pub category_code: String,
    pub category_name: String,
    pub parent_id: Option<String>,
    pub sort_order: i32,
    pub description: Option<String>,
    pub status: String,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateMethodCategoryRequest {
    pub category_code: String,
    pub category_name: String,
    pub parent_id: Option<String>,
    pub sort_order: Option<i32>,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateMethodCategoryRequest {
    pub category_name: Option<String>,
    pub parent_id: Option<String>,
    pub sort_order: Option<i32>,
    pub description: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct MethodValidationQuery {
    pub method_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct MethodValidationRecord {
    pub id: String,
    pub tenant_id: String,
    pub method_id: String,
    pub method_code: String,
    pub method_name: String,
    pub version: String,
    pub validation_type: String,
    pub validation_date: String,
    pub validated_by: String,
    pub conclusion: String,
    pub parameters: Option<serde_json::Value>,
    pub report_url: Option<String>,
    pub notes: Option<String>,
    pub status: String,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateMethodValidationRequest {
    pub method_id: String,
    pub validation_type: String,
    pub validation_date: Option<String>,
    pub validated_by: String,
    pub conclusion: String,
    pub parameters: Option<serde_json::Value>,
    pub report_url: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct MethodVersion {
    pub id: String,
    pub tenant_id: String,
    pub method_id: String,
    pub version: String,
    pub version_description: Option<String>,
    pub change_log: Option<String>,
    pub is_current: bool,
    pub created_by: Option<String>,
    pub created_at: String,
}

const METHOD_SELECT_COLS: &str = "m.id::TEXT, m.tenant_id::TEXT, m.method_code, m.method_name, m.category_id::TEXT, c.category_name, m.standard, m.version, m.description, m.principle, m.instruments, m.reagents, m.parameters, m.steps, m.calculation_formula, m.uncertainty_ref, m.status, m.validated, m.validated_at::TEXT, m.validated_by, m.created_by, m.created_at::TEXT, m.updated_at::TEXT";

pub async fn list_methods(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    axum::extract::Query(query): axum::extract::Query<TestMethodQuery>,
) -> Json<ApiResponse<Vec<TestMethod>>> {
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(ctx.tenant_id)
    };

    let mut where_clauses: Vec<String> = vec![
        "m.deleted_at IS NULL".to_string(),
        "($1::uuid IS NULL OR m.tenant_id = $1)".to_string(),
    ];
    let mut param_idx = 2usize;
    if query.status.is_some() {
        where_clauses.push(format!("m.status = ${}", param_idx));
        param_idx += 1;
    }
    if query.category_id.is_some() {
        where_clauses.push(format!("m.category_id = ${}", param_idx));
        param_idx += 1;
    }
    if query.method_name.is_some() {
        where_clauses.push(format!("m.method_name LIKE ${}", param_idx));
        param_idx += 1;
    }
    if query.method_code.is_some() {
        where_clauses.push(format!("m.method_code LIKE ${}", param_idx));
        param_idx += 1;
    }
    let limit_idx = param_idx;
    let offset_idx = param_idx + 1;

    let sql = format!(
        "SELECT {} FROM qa_lims_test_methods m LEFT JOIN qa_lims_method_categories c ON m.category_id = c.id WHERE {} ORDER BY m.created_at DESC LIMIT ${} OFFSET ${}",
        METHOD_SELECT_COLS,
        where_clauses.join(" AND "),
        limit_idx,
        offset_idx
    );

    let mut query_builder = sqlx::query(&sql).bind(tenant_id);
    if let Some(st) = query.status.as_ref() {
        query_builder = query_builder.bind(st);
    }
    if let Some(cid) = query.category_id.as_ref() {
        let cid_uuid = Uuid::parse_str(cid).unwrap_or(Uuid::nil());
        query_builder = query_builder.bind(cid_uuid);
    }
    if let Some(mn) = query.method_name.as_ref() {
        query_builder = query_builder.bind(format!("%{}%", mn));
    }
    if let Some(mc) = query.method_code.as_ref() {
        query_builder = query_builder.bind(format!("%{}%", mc));
    }
    query_builder = query_builder.bind(page_size).bind(offset);

    let methods = query_builder.fetch_all(&state.pool).await.map(|rows| {
        rows.into_iter()
            .map(|row| TestMethod {
                id: row.get("id"),
                tenant_id: row.get("tenant_id"),
                method_code: row.get("method_code"),
                method_name: row.get("method_name"),
                category_id: row.get("category_id"),
                category_name: row.get("category_name"),
                standard: row.get("standard"),
                version: row.get("version"),
                description: row.get("description"),
                principle: row.get("principle"),
                instruments: row.get("instruments"),
                reagents: row.get("reagents"),
                parameters: row.get("parameters"),
                steps: row.get("steps"),
                calculation_formula: row.get("calculation_formula"),
                uncertainty_ref: row.get("uncertainty_ref"),
                status: row.get("status"),
                validated: row.get("validated"),
                validated_at: row.get("validated_at"),
                validated_by: row.get("validated_by"),
                created_by: row.get("created_by"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            })
            .collect()
    });

    match methods {
        Ok(data) => Json(ApiResponse::success(data, "获取检测方法列表成功")),
        Err(e) => {
            tracing::error!("Failed to fetch test methods: {}", e);
            Json(ApiResponse::error(500, "获取检测方法列表失败"))
        }
    }
}

pub async fn create_method(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
    Json(req): Json<CreateTestMethodRequest>,
) -> Json<ApiResponse<TestMethod>> {
    let version = "1.0".to_string();

    let row = sqlx::query(
        r#"
        INSERT INTO qa_lims_test_methods (
            method_code, method_name, category_id, standard, version,
            description, principle, instruments, reagents, parameters,
            steps, calculation_formula, uncertainty_ref, status, validated, tenant_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'draft', false, $14)
        RETURNING id::TEXT, tenant_id::TEXT, method_code, method_name, category_id::TEXT,
                  NULL as category_name, standard, version, description, principle,
                  instruments, reagents, parameters, steps, calculation_formula,
                  uncertainty_ref, status, validated, validated_at::TEXT, validated_by,
                  created_by, created_at::TEXT, updated_at::TEXT
        "#,
    )
    .bind(&req.method_code)
    .bind(&req.method_name)
    .bind(
        req.category_id
            .as_deref()
            .and_then(|s| Uuid::parse_str(s).ok()),
    )
    .bind(&req.standard)
    .bind(&version)
    .bind(&req.description)
    .bind(&req.principle)
    .bind(&req.instruments)
    .bind(&req.reagents)
    .bind(&req.parameters)
    .bind(&req.steps)
    .bind(&req.calculation_formula)
    .bind(&req.uncertainty_ref)
    .bind(ctx.tenant_id)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(
            TestMethod {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                method_code: r.get("method_code"),
                method_name: r.get("method_name"),
                category_id: r.get("category_id"),
                category_name: r.get("category_name"),
                standard: r.get("standard"),
                version: r.get("version"),
                description: r.get("description"),
                principle: r.get("principle"),
                instruments: r.get("instruments"),
                reagents: r.get("reagents"),
                parameters: r.get("parameters"),
                steps: r.get("steps"),
                calculation_formula: r.get("calculation_formula"),
                uncertainty_ref: r.get("uncertainty_ref"),
                status: r.get("status"),
                validated: r.get("validated"),
                validated_at: r.get("validated_at"),
                validated_by: r.get("validated_by"),
                created_by: r.get("created_by"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            },
            "检测方法创建成功",
        )),
        Err(e) => {
            tracing::error!("Failed to create test method: {}", e);
            Json(ApiResponse::error(500, "检测方法创建失败"))
        }
    }
}

pub async fn get_method(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<TestMethod>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的方法ID")),
    };

    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(ctx.tenant_id)
    };
    let cache_key = test_method_cache_key(&tenant_id, &id.to_string());

    if let Some(cached) = state.test_method_cache.get(&cache_key).await {
        return Json(ApiResponse::success(cached, "从内存缓存获取检测方法成功"));
    }

    let row = sqlx::query(&format!(
        r#"
        SELECT {}
        FROM qa_lims_test_methods m
        LEFT JOIN qa_lims_method_categories c ON m.category_id = c.id
        WHERE m.id = $1 AND ($2::uuid IS NULL OR m.tenant_id = $2)
        "#,
        METHOD_SELECT_COLS
    ))
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => {
            let method = TestMethod {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                method_code: r.get("method_code"),
                method_name: r.get("method_name"),
                category_id: r.get("category_id"),
                category_name: r.get("category_name"),
                standard: r.get("standard"),
                version: r.get("version"),
                description: r.get("description"),
                principle: r.get("principle"),
                instruments: r.get("instruments"),
                reagents: r.get("reagents"),
                parameters: r.get("parameters"),
                steps: r.get("steps"),
                calculation_formula: r.get("calculation_formula"),
                uncertainty_ref: r.get("uncertainty_ref"),
                status: r.get("status"),
                validated: r.get("validated"),
                validated_at: r.get("validated_at"),
                validated_by: r.get("validated_by"),
                created_by: r.get("created_by"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            };
            state.test_method_cache.set(cache_key, method.clone()).await;
            Json(ApiResponse::success(method, "获取检测方法成功"))
        }
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "记录不存在")),

        Err(e) => {
            tracing::error!("Failed to fetch test method: {}", e);
            Json(ApiResponse::error(500, "获取检测方法失败"))
        }
    }
}

pub async fn update_method(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateTestMethodRequest>,
) -> Json<ApiResponse<TestMethod>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的方法ID")),
    };

    let row = sqlx::query(
        r#"
        UPDATE qa_lims_test_methods
        SET method_name = COALESCE($2, method_name),
            category_id = COALESCE($3, category_id),
            standard = COALESCE($4, standard),
            description = COALESCE($5, description),
            principle = COALESCE($6, principle),
            instruments = COALESCE($7, instruments),
            reagents = COALESCE($8, reagents),
            parameters = COALESCE($9, parameters),
            steps = COALESCE($10, steps),
            calculation_formula = COALESCE($11, calculation_formula),
            uncertainty_ref = COALESCE($12, uncertainty_ref),
            status = COALESCE($13, status),
            updated_at = NOW()
        WHERE id = $1 AND tenant_id = $14
        RETURNING id::TEXT, tenant_id::TEXT, method_code, method_name, category_id::TEXT,
                  NULL as category_name, standard, version, description, principle,
                  instruments, reagents, parameters, steps, calculation_formula,
                  uncertainty_ref, status, validated, validated_at::TEXT, validated_by,
                  created_by, created_at::TEXT, updated_at::TEXT
        "#,
    )
    .bind(id)
    .bind(&req.method_name)
    .bind(
        req.category_id
            .as_deref()
            .and_then(|s| Uuid::parse_str(s).ok()),
    )
    .bind(&req.standard)
    .bind(&req.description)
    .bind(&req.principle)
    .bind(&req.instruments)
    .bind(&req.reagents)
    .bind(&req.parameters)
    .bind(&req.steps)
    .bind(&req.calculation_formula)
    .bind(&req.uncertainty_ref)
    .bind(&req.status)
    .bind(ctx.tenant_id)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => {
            state
                .test_method_cache
                .remove(&test_method_cache_key(&Some(ctx.tenant_id), &id.to_string()))
                .await;
            Json(ApiResponse::success(
                TestMethod {
                    id: r.get("id"),
                    tenant_id: r.get("tenant_id"),
                    method_code: r.get("method_code"),
                    method_name: r.get("method_name"),
                    category_id: r.get("category_id"),
                    category_name: r.get("category_name"),
                    standard: r.get("standard"),
                    version: r.get("version"),
                    description: r.get("description"),
                    principle: r.get("principle"),
                    instruments: r.get("instruments"),
                    reagents: r.get("reagents"),
                    parameters: r.get("parameters"),
                    steps: r.get("steps"),
                    calculation_formula: r.get("calculation_formula"),
                    uncertainty_ref: r.get("uncertainty_ref"),
                    status: r.get("status"),
                    validated: r.get("validated"),
                    validated_at: r.get("validated_at"),
                    validated_by: r.get("validated_by"),
                    created_by: r.get("created_by"),
                    created_at: r.get("created_at"),
                    updated_at: r.get("updated_at"),
                },
                "检测方法更新成功",
            ))
        }
        Err(e) => {
            tracing::error!("Failed to update test method: {}", e);
            Json(ApiResponse::error(500, "检测方法更新失败"))
        }
    }
}

pub async fn delete_method(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<bool>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的方法ID")),
    };

    let result = sqlx::query(
        "UPDATE qa_lims_test_methods SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(ctx.tenant_id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => {
            state
                .test_method_cache
                .remove(&test_method_cache_key(&Some(ctx.tenant_id), &id.to_string()))
                .await;
            Json(ApiResponse::success(true, "检测方法删除成功"))
        }
        Err(e) => {
            tracing::error!("Failed to delete test method: {}", e);
            Json(ApiResponse::error(500, "检测方法删除失败"))
        }
    }
}

pub async fn list_categories(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    axum::extract::Query(query): axum::extract::Query<MethodCategoryQuery>,
) -> Json<ApiResponse<Vec<MethodCategory>>> {
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(ctx.tenant_id)
    };
    let sql = match query.parent_id.as_ref() {
        Some(_) => "SELECT id::TEXT, tenant_id::TEXT, category_code, category_name, parent_id::TEXT, sort_order, description, status, created_at::TEXT, updated_at::TEXT FROM qa_lims_method_categories WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1) AND parent_id = $2 ORDER BY sort_order ASC, created_at DESC",
        None => "SELECT id::TEXT, tenant_id::TEXT, category_code, category_name, parent_id::TEXT, sort_order, description, status, created_at::TEXT, updated_at::TEXT FROM qa_lims_method_categories WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1) AND parent_id IS NULL ORDER BY sort_order ASC, created_at DESC",
    };

    let mut query_builder = sqlx::query(sql).bind(tenant_id);
    if let Some(pid) = query.parent_id.as_ref() {
        let pid_uuid = Uuid::parse_str(pid).unwrap_or(Uuid::nil());
        query_builder = query_builder.bind(pid_uuid);
    }

    let categories = query_builder.fetch_all(&state.pool).await.map(|rows| {
        rows.into_iter()
            .map(|row| MethodCategory {
                id: row.get("id"),
                tenant_id: row.get("tenant_id"),
                category_code: row.get("category_code"),
                category_name: row.get("category_name"),
                parent_id: row.get("parent_id"),
                sort_order: row.get("sort_order"),
                description: row.get("description"),
                status: row.get("status"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            })
            .collect()
    });

    match categories {
        Ok(data) => Json(ApiResponse::success(data, "获取方法分类列表成功")),
        Err(e) => {
            tracing::error!("Failed to fetch method categories: {}", e);
            Json(ApiResponse::error(500, "获取方法分类列表失败"))
        }
    }
}

pub async fn create_category(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
    Json(req): Json<CreateMethodCategoryRequest>,
) -> Json<ApiResponse<MethodCategory>> {
    let sort_order = req.sort_order.unwrap_or(0);

    let row = sqlx::query(
        r#"
        INSERT INTO qa_lims_method_categories (category_code, category_name, parent_id, sort_order, description, status, tenant_id)
        VALUES ($1, $2, $3, $4, $5, 'active', $6)
        RETURNING id::TEXT, tenant_id::TEXT, category_code, category_name, parent_id::TEXT, sort_order, description, status, created_at::TEXT, updated_at::TEXT
        "#
    )
    .bind(&req.category_code)
    .bind(&req.category_name)
    .bind(&req.parent_id)
    .bind(sort_order)
    .bind(&req.description)
    .bind(ctx.tenant_id)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(
            MethodCategory {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                category_code: r.get("category_code"),
                category_name: r.get("category_name"),
                parent_id: r.get("parent_id"),
                sort_order: r.get("sort_order"),
                description: r.get("description"),
                status: r.get("status"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            },
            "方法分类创建成功",
        )),
        Err(e) => {
            tracing::error!("Failed to create method category: {}", e);
            Json(ApiResponse::error(500, "方法分类创建失败"))
        }
    }
}

pub async fn update_category(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateMethodCategoryRequest>,
) -> Json<ApiResponse<MethodCategory>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的分类ID")),
    };

    let row = sqlx::query(
        r#"
        UPDATE qa_lims_method_categories
        SET category_name = COALESCE($2, category_name),
            parent_id = COALESCE($3, parent_id),
            sort_order = COALESCE($4, sort_order),
            description = COALESCE($5, description),
            status = COALESCE($6, status),
            updated_at = NOW()
        WHERE id = $1 AND tenant_id = $7
        RETURNING id::TEXT, tenant_id::TEXT, category_code, category_name, parent_id::TEXT, sort_order, description, status, created_at::TEXT, updated_at::TEXT
        "#
    )
    .bind(id)
    .bind(&req.category_name)
    .bind(&req.parent_id)
    .bind(req.sort_order)
    .bind(&req.description)
    .bind(&req.status)
    .bind(ctx.tenant_id)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(
            MethodCategory {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                category_code: r.get("category_code"),
                category_name: r.get("category_name"),
                parent_id: r.get("parent_id"),
                sort_order: r.get("sort_order"),
                description: r.get("description"),
                status: r.get("status"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            },
            "方法分类更新成功",
        )),
        Err(e) => {
            tracing::error!("Failed to update method category: {}", e);
            Json(ApiResponse::error(500, "方法分类更新失败"))
        }
    }
}

pub async fn delete_category(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<bool>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的分类ID")),
    };

    let result = sqlx::query(
        "UPDATE qa_lims_method_categories SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(ctx.tenant_id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(true, "方法分类删除成功")),
        Err(e) => {
            tracing::error!("Failed to delete method category: {}", e);
            Json(ApiResponse::error(500, "方法分类删除失败"))
        }
    }
}

pub async fn list_validations(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    axum::extract::Query(query): axum::extract::Query<MethodValidationQuery>,
) -> Json<ApiResponse<Vec<MethodValidationRecord>>> {
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(ctx.tenant_id)
    };
    let sql = match query.method_id.as_ref() {
        Some(_) => "SELECT id::TEXT, tenant_id::TEXT, method_id::TEXT, method_code, method_name, version, validation_type, validation_date::TEXT, validated_by, conclusion, parameters, report_url, notes, status, created_at::TEXT FROM qa_lims_method_validations WHERE method_id = $2 AND ($1::uuid IS NULL OR tenant_id = $1) ORDER BY validation_date DESC, created_at DESC",
        None => "SELECT id::TEXT, tenant_id::TEXT, method_id::TEXT, method_code, method_name, version, validation_type, validation_date::TEXT, validated_by, conclusion, parameters, report_url, notes, status, created_at::TEXT FROM qa_lims_method_validations WHERE ($1::uuid IS NULL OR tenant_id = $1) ORDER BY validation_date DESC, created_at DESC LIMIT 100",
    };

    let mut query_builder = sqlx::query(sql).bind(tenant_id);
    if let Some(mid) = query.method_id.as_ref() {
        let mid_uuid = Uuid::parse_str(mid).unwrap_or(Uuid::nil());
        query_builder = query_builder.bind(mid_uuid);
    }

    let records = query_builder.fetch_all(&state.pool).await.map(|rows| {
        rows.into_iter()
            .map(|row| MethodValidationRecord {
                id: row.get("id"),
                tenant_id: row.get("tenant_id"),
                method_id: row.get("method_id"),
                method_code: row.get("method_code"),
                method_name: row.get("method_name"),
                version: row.get("version"),
                validation_type: row.get("validation_type"),
                validation_date: row.get("validation_date"),
                validated_by: row.get("validated_by"),
                conclusion: row.get("conclusion"),
                parameters: row.get("parameters"),
                report_url: row.get("report_url"),
                notes: row.get("notes"),
                status: row.get("status"),
                created_at: row.get("created_at"),
            })
            .collect()
    });

    match records {
        Ok(data) => Json(ApiResponse::success(data, "获取方法验证记录列表成功")),
        Err(e) => {
            tracing::error!("Failed to fetch method validations: {}", e);
            Json(ApiResponse::error(500, "获取方法验证记录列表失败"))
        }
    }
}

pub async fn create_validation(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
    Json(req): Json<CreateMethodValidationRequest>,
) -> Json<ApiResponse<MethodValidationRecord>> {
    let method_id = match Uuid::parse_str(&req.method_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的方法ID")),
    };

    let method_row = sqlx::query(
        "SELECT method_code, method_name, version FROM qa_lims_test_methods WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2",
    )
    .bind(method_id)
    .bind(ctx.tenant_id)
    .fetch_optional(&state.pool)
    .await;

    let (method_code, method_name, version) = match method_row {
        Ok(Some(row)) => (
            row.get::<String, _>("method_code"),
            row.get::<String, _>("method_name"),
            row.get::<String, _>("version"),
        ),
        Ok(None) => return Json(ApiResponse::error(404, "检测方法不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询检测方法失败: {}", e))),
    };

    let validation_date = req
        .validation_date
        .unwrap_or_else(|| chrono::Utc::now().to_rfc3339());

    let row = sqlx::query(
        r#"
        INSERT INTO qa_lims_method_validations (
            method_id, method_code, method_name, version, validation_type,
            validation_date, validated_by, conclusion, parameters, report_url, notes, status, tenant_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'completed', $12)
        RETURNING id::TEXT, tenant_id::TEXT, method_id::TEXT, method_code, method_name, version,
                  validation_type, validation_date::TEXT, validated_by, conclusion, parameters,
                  report_url, notes, status, created_at::TEXT
        "#,
    )
    .bind(method_id)
    .bind(&method_code)
    .bind(&method_name)
    .bind(&version)
    .bind(&req.validation_type)
    .bind(&validation_date)
    .bind(&req.validated_by)
    .bind(&req.conclusion)
    .bind(&req.parameters)
    .bind(&req.report_url)
    .bind(&req.notes)
    .bind(ctx.tenant_id)
    .fetch_one(&state.pool)
    .await;

    if req.conclusion == "pass" || req.conclusion == "合格" {
        let _ = sqlx::query(
            "UPDATE qa_lims_test_methods SET validated = true, validated_at = $2, validated_by = $3, updated_at = NOW() WHERE id = $1 AND tenant_id = $4"
        )
        .bind(method_id)
        .bind(&validation_date)
        .bind(&req.validated_by)
        .bind(ctx.tenant_id)
        .execute(&state.pool)
        .await;
    }

    match row {
        Ok(r) => Json(ApiResponse::success(
            MethodValidationRecord {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                method_id: r.get("method_id"),
                method_code: r.get("method_code"),
                method_name: r.get("method_name"),
                version: r.get("version"),
                validation_type: r.get("validation_type"),
                validation_date: r.get("validation_date"),
                validated_by: r.get("validated_by"),
                conclusion: r.get("conclusion"),
                parameters: r.get("parameters"),
                report_url: r.get("report_url"),
                notes: r.get("notes"),
                status: r.get("status"),
                created_at: r.get("created_at"),
            },
            "方法验证记录创建成功",
        )),
        Err(e) => {
            tracing::error!("Failed to create method validation: {}", e);
            Json(ApiResponse::error(500, "方法验证记录创建失败"))
        }
    }
}

pub async fn list_method_versions(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
    axum::extract::Path(method_id): axum::extract::Path<String>,
) -> Json<ApiResponse<Vec<MethodVersion>>> {
    let id = match Uuid::parse_str(&method_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的方法ID")),
    };

    let rows = sqlx::query(
        r#"
        SELECT id::TEXT, tenant_id::TEXT, method_id::TEXT, version, version_description, change_log, is_current, created_by, created_at::TEXT
        FROM qa_lims_method_versions
        WHERE method_id = $1 AND tenant_id = $2
        ORDER BY created_at DESC
        "#
    )
    .bind(id)
    .bind(ctx.tenant_id)
    .fetch_all(&state.pool)
    .await;

    match rows {
        Ok(rows) => {
            let versions: Vec<MethodVersion> = rows
                .into_iter()
                .map(|row| MethodVersion {
                    id: row.get("id"),
                    tenant_id: row.get("tenant_id"),
                    method_id: row.get("method_id"),
                    version: row.get("version"),
                    version_description: row.get("version_description"),
                    change_log: row.get("change_log"),
                    is_current: row.get("is_current"),
                    created_by: row.get("created_by"),
                    created_at: row.get("created_at"),
                })
                .collect();
            Json(ApiResponse::success(versions, "获取方法版本列表成功"))
        }
        Err(e) => {
            tracing::error!("Failed to fetch method versions: {}", e);
            Json(ApiResponse::error(500, "获取方法版本列表失败"))
        }
    }
}

pub async fn create_new_version(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
    axum::extract::Path(method_id): axum::extract::Path<String>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<TestMethod>> {
    let id = match Uuid::parse_str(&method_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的方法ID")),
    };

    let method_row = sqlx::query(
        "SELECT method_code, method_name, version FROM qa_lims_test_methods WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(ctx.tenant_id)
    .fetch_optional(&state.pool)
    .await;

    let (_method_code, _method_name, current_version) = match method_row {
        Ok(Some(row)) => (
            row.get::<String, _>("method_code"),
            row.get::<String, _>("method_name"),
            row.get::<String, _>("version"),
        ),
        Ok(None) => return Json(ApiResponse::error(404, "检测方法不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询检测方法失败: {}", e))),
    };

    let version_parts: Vec<&str> = current_version.split('.').collect();
    let new_version = if version_parts.len() >= 2 {
        let minor: i32 = version_parts[1].parse().unwrap_or(0);
        format!("{}.{}", version_parts[0], minor + 1)
    } else {
        "2.0".to_string()
    };

    let change_log = req.get("change_log").and_then(|v| v.as_str());
    let version_description = req.get("version_description").and_then(|v| v.as_str());

    let _ = sqlx::query(
        r#"
        INSERT INTO qa_lims_method_versions (method_id, version, version_description, change_log, is_current, created_at, tenant_id)
        VALUES ($1, $2, $3, $4, false, NOW(), $5)
        "#
    )
    .bind(id)
    .bind(&current_version)
    .bind(version_description)
    .bind(change_log)
    .bind(ctx.tenant_id)
    .execute(&state.pool)
    .await;

    let row = sqlx::query(
        r#"
        UPDATE qa_lims_test_methods
        SET version = $2, updated_at = NOW()
        WHERE id = $1 AND tenant_id = $3
        RETURNING id::TEXT, tenant_id::TEXT, method_code, method_name, category_id::TEXT,
                  NULL as category_name, standard, version, description, principle,
                  instruments, reagents, parameters, steps, calculation_formula,
                  uncertainty_ref, status, validated, validated_at::TEXT, validated_by,
                  created_by, created_at::TEXT, updated_at::TEXT
        "#,
    )
    .bind(id)
    .bind(&new_version)
    .bind(ctx.tenant_id)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(
            TestMethod {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                method_code: r.get("method_code"),
                method_name: r.get("method_name"),
                category_id: r.get("category_id"),
                category_name: r.get("category_name"),
                standard: r.get("standard"),
                version: r.get("version"),
                description: r.get("description"),
                principle: r.get("principle"),
                instruments: r.get("instruments"),
                reagents: r.get("reagents"),
                parameters: r.get("parameters"),
                steps: r.get("steps"),
                calculation_formula: r.get("calculation_formula"),
                uncertainty_ref: r.get("uncertainty_ref"),
                status: r.get("status"),
                validated: r.get("validated"),
                validated_at: r.get("validated_at"),
                validated_by: r.get("validated_by"),
                created_by: r.get("created_by"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            },
            &format!("方法版本更新成功，新版本: {}", new_version),
        )),
        Err(e) => {
            tracing::error!("Failed to create new method version: {}", e);
            Json(ApiResponse::error(500, "方法版本更新失败"))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ---- test_method_cache_key ----
    #[test]
    fn cache_key_prefix() {
        let tenant = Uuid::nil();
        assert_eq!(
            test_method_cache_key(&Some(tenant), "abc"),
            "test_method:00000000-0000-0000-0000-000000000000:abc"
        );
    }

    #[test]
    fn cache_key_empty_id() {
        let tenant = Uuid::nil();
        assert_eq!(
            test_method_cache_key(&Some(tenant), ""),
            "test_method:00000000-0000-0000-0000-000000000000:"
        );
    }

    #[test]
    fn cache_key_with_special_chars() {
        let tenant = Uuid::nil();
        assert_eq!(
            test_method_cache_key(&Some(tenant), "tm-001/abc"),
            "test_method:00000000-0000-0000-0000-000000000000:tm-001/abc"
        );
    }
}

use axum::{
    extract::State,
    routing::{get, post, put},
    Extension, Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, Row};
use topems_shared::ApiResponse;

use crate::middleware::tenant::TenantContext;
use crate::shared::AppState;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/api/lims/test-methods",
            get(list_methods).post(create_method),
        )
        .route(
            "/api/lims/test-methods/{id}",
            get(get_method).put(update_method).delete(delete_method),
        )
        .route(
            "/api/lims/test-methods/{id}/versions",
            get(list_method_versions),
        )
        .route(
            "/api/lims/test-methods/{id}/new-version",
            post(create_new_version),
        )
        .route(
            "/api/lims/method-categories",
            get(list_categories).post(create_category),
        )
        .route(
            "/api/lims/method-categories/{id}",
            put(update_category).delete(delete_category),
        )
        .route(
            "/api/lims/method-validations",
            get(list_validations).post(create_validation),
        )
}

fn test_method_cache_key(id: &str) -> String {
    format!("test_method:{}", id)
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

#[derive(Debug, Clone, Serialize)]
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

pub async fn list_methods(
    State(state): State<crate::shared::AppState>,
    axum::extract::Query(query): axum::extract::Query<TestMethodQuery>,
) -> Json<ApiResponse<Vec<TestMethod>>> {
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let base_sql = "SELECT m.id, m.method_code, m.method_name, m.category_id, c.category_name, m.standard, m.version, m.description, m.principle, m.instruments, m.reagents, m.parameters, m.steps, m.calculation_formula, m.uncertainty_ref, m.status, m.validated, m.validated_at::TEXT, m.validated_by, m.created_by, m.created_at::TEXT, m.updated_at::TEXT FROM qa_lims_test_methods m LEFT JOIN qa_lims_method_categories c ON m.category_id = c.id";

    let sql = match (query.status.as_ref(), query.category_id.as_ref(), query.method_name.as_ref(), query.method_code.as_ref()) {
        (Some(_), Some(_), Some(_), Some(_)) => format!("{} WHERE m.status = $1 AND m.category_id = $2 AND m.method_name LIKE $3 AND m.method_code LIKE $4 ORDER BY m.created_at DESC LIMIT $5 OFFSET $6", base_sql),
        (Some(_), Some(_), Some(_), None) => format!("{} WHERE m.status = $1 AND m.category_id = $2 AND m.method_name LIKE $3 ORDER BY m.created_at DESC LIMIT $4 OFFSET $5", base_sql),
        (Some(_), Some(_), None, Some(_)) => format!("{} WHERE m.status = $1 AND m.category_id = $2 AND m.method_code LIKE $3 ORDER BY m.created_at DESC LIMIT $4 OFFSET $5", base_sql),
        (Some(_), Some(_), None, None) => format!("{} WHERE m.status = $1 AND m.category_id = $2 ORDER BY m.created_at DESC LIMIT $3 OFFSET $4", base_sql),
        (Some(_), None, Some(_), Some(_)) => format!("{} WHERE m.status = $1 AND m.method_name LIKE $2 AND m.method_code LIKE $3 ORDER BY m.created_at DESC LIMIT $4 OFFSET $5", base_sql),
        (Some(_), None, Some(_), None) => format!("{} WHERE m.status = $1 AND m.method_name LIKE $2 ORDER BY m.created_at DESC LIMIT $3 OFFSET $4", base_sql),
        (Some(_), None, None, Some(_)) => format!("{} WHERE m.status = $1 AND m.method_code LIKE $2 ORDER BY m.created_at DESC LIMIT $3 OFFSET $4", base_sql),
        (Some(_), None, None, None) => format!("{} WHERE m.status = $1 ORDER BY m.created_at DESC LIMIT $2 OFFSET $3", base_sql),
        (None, Some(_), Some(_), Some(_)) => format!("{} WHERE m.category_id = $1 AND m.method_name LIKE $2 AND m.method_code LIKE $3 ORDER BY m.created_at DESC LIMIT $4 OFFSET $5", base_sql),
        (None, Some(_), Some(_), None) => format!("{} WHERE m.category_id = $1 AND m.method_name LIKE $2 ORDER BY m.created_at DESC LIMIT $3 OFFSET $4", base_sql),
        (None, Some(_), None, Some(_)) => format!("{} WHERE m.category_id = $1 AND m.method_code LIKE $2 ORDER BY m.created_at DESC LIMIT $3 OFFSET $4", base_sql),
        (None, Some(_), None, None) => format!("{} WHERE m.category_id = $1 ORDER BY m.created_at DESC LIMIT $2 OFFSET $3", base_sql),
        (None, None, Some(_), Some(_)) => format!("{} WHERE m.method_name LIKE $1 AND m.method_code LIKE $2 ORDER BY m.created_at DESC LIMIT $3 OFFSET $4", base_sql),
        (None, None, Some(_), None) => format!("{} WHERE m.method_name LIKE $1 ORDER BY m.created_at DESC LIMIT $2 OFFSET $3", base_sql),
        (None, None, None, Some(_)) => format!("{} WHERE m.method_code LIKE $1 ORDER BY m.created_at DESC LIMIT $2 OFFSET $3", base_sql),
        (None, None, None, None) => format!("{} ORDER BY m.created_at DESC LIMIT $1 OFFSET $2", base_sql),
    };

    let mut query_builder = sqlx::query(&sql);
    match (
        query.status.as_ref(),
        query.category_id.as_ref(),
        query.method_name.as_ref(),
        query.method_code.as_ref(),
    ) {
        (Some(st), Some(cid), Some(mn), Some(mc)) => {
            let cid_uuid = Uuid::parse_str(cid).unwrap_or(Uuid::nil());
            query_builder = query_builder
                .bind(st)
                .bind(cid_uuid)
                .bind(format!("%{}%", mn))
                .bind(format!("%{}%", mc))
                .bind(page_size)
                .bind(offset);
        }
        (Some(st), Some(cid), Some(mn), None) => {
            let cid_uuid = Uuid::parse_str(cid).unwrap_or(Uuid::nil());
            query_builder = query_builder
                .bind(st)
                .bind(cid_uuid)
                .bind(format!("%{}%", mn))
                .bind(page_size)
                .bind(offset);
        }
        (Some(st), Some(cid), None, Some(mc)) => {
            let cid_uuid = Uuid::parse_str(cid).unwrap_or(Uuid::nil());
            query_builder = query_builder
                .bind(st)
                .bind(cid_uuid)
                .bind(format!("%{}%", mc))
                .bind(page_size)
                .bind(offset);
        }
        (Some(st), Some(cid), None, None) => {
            let cid_uuid = Uuid::parse_str(cid).unwrap_or(Uuid::nil());
            query_builder = query_builder
                .bind(st)
                .bind(cid_uuid)
                .bind(page_size)
                .bind(offset);
        }
        (Some(st), None, Some(mn), Some(mc)) => {
            query_builder = query_builder
                .bind(st)
                .bind(format!("%{}%", mn))
                .bind(format!("%{}%", mc))
                .bind(page_size)
                .bind(offset);
        }
        (Some(st), None, Some(mn), None) => {
            query_builder = query_builder
                .bind(st)
                .bind(format!("%{}%", mn))
                .bind(page_size)
                .bind(offset);
        }
        (Some(st), None, None, Some(mc)) => {
            query_builder = query_builder
                .bind(st)
                .bind(format!("%{}%", mc))
                .bind(page_size)
                .bind(offset);
        }
        (Some(st), None, None, None) => {
            query_builder = query_builder.bind(st).bind(page_size).bind(offset);
        }
        (None, Some(cid), Some(mn), Some(mc)) => {
            let cid_uuid = Uuid::parse_str(cid).unwrap_or(Uuid::nil());
            query_builder = query_builder
                .bind(cid_uuid)
                .bind(format!("%{}%", mn))
                .bind(format!("%{}%", mc))
                .bind(page_size)
                .bind(offset);
        }
        (None, Some(cid), Some(mn), None) => {
            let cid_uuid = Uuid::parse_str(cid).unwrap_or(Uuid::nil());
            query_builder = query_builder
                .bind(cid_uuid)
                .bind(format!("%{}%", mn))
                .bind(page_size)
                .bind(offset);
        }
        (None, Some(cid), None, Some(mc)) => {
            let cid_uuid = Uuid::parse_str(cid).unwrap_or(Uuid::nil());
            query_builder = query_builder
                .bind(cid_uuid)
                .bind(format!("%{}%", mc))
                .bind(page_size)
                .bind(offset);
        }
        (None, Some(cid), None, None) => {
            let cid_uuid = Uuid::parse_str(cid).unwrap_or(Uuid::nil());
            query_builder = query_builder.bind(cid_uuid).bind(page_size).bind(offset);
        }
        (None, None, Some(mn), Some(mc)) => {
            query_builder = query_builder
                .bind(format!("%{}%", mn))
                .bind(format!("%{}%", mc))
                .bind(page_size)
                .bind(offset);
        }
        (None, None, Some(mn), None) => {
            query_builder = query_builder
                .bind(format!("%{}%", mn))
                .bind(page_size)
                .bind(offset);
        }
        (None, None, None, Some(mc)) => {
            query_builder = query_builder
                .bind(format!("%{}%", mc))
                .bind(page_size)
                .bind(offset);
        }
        (None, None, None, None) => {
            query_builder = query_builder.bind(page_size).bind(offset);
        }
    }

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
    Json(req): Json<CreateTestMethodRequest>,
) -> Json<ApiResponse<TestMethod>> {
    let version = "1.0".to_string();

    let row = sqlx::query(
        r#"
        INSERT INTO qa_lims_test_methods (
            method_code, method_name, category_id, standard, version,
            description, principle, instruments, reagents, parameters,
            steps, calculation_formula, uncertainty_ref, status, validated
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'draft', false)
        RETURNING id, method_code, method_name, category_id, NULL as category_name,
                  standard, version, description, principle, instruments, reagents,
                  parameters, steps, calculation_formula, uncertainty_ref, status,
                  validated, validated_at::TEXT, validated_by, created_by,
                  created_at::TEXT, updated_at::TEXT
        "#,
    )
    .bind(&req.method_code)
    .bind(&req.method_name)
    .bind(&req.category_id)
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
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<TestMethod>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的方法ID")),
    };

    let cache_key = test_method_cache_key(&id.to_string());

    if let Some(cached) = state.test_method_cache.get(&cache_key) {
        return Json(ApiResponse::success(cached, "从内存缓存获取检测方法成功"));
    }

    let row = sqlx::query(
        r#"
        SELECT m.id, m.method_code, m.method_name, m.category_id, c.category_name,
               m.standard, m.version, m.description, m.principle, m.instruments,
               m.reagents, m.parameters, m.steps, m.calculation_formula, m.uncertainty_ref,
               m.status, m.validated, m.validated_at::TEXT, m.validated_by, m.created_by,
               m.created_at::TEXT, m.updated_at::TEXT
        FROM qa_lims_test_methods m
        LEFT JOIN qa_lims_method_categories c ON m.category_id = c.id
        WHERE m.id = $1
        "#,
    )
    .bind(id)
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
            state.test_method_cache.set(cache_key, method.clone());
            Json(ApiResponse::success(method, "获取检测方法成功"))
        }
        Err(e) => {
            tracing::error!("Failed to fetch test method: {}", e);
            Json(ApiResponse::error(500, "获取检测方法失败"))
        }
    }
}

pub async fn update_method(
    State(state): State<crate::shared::AppState>,
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
        WHERE id = $1
        RETURNING id, method_code, method_name, category_id, NULL as category_name,
                  standard, version, description, principle, instruments, reagents,
                  parameters, steps, calculation_formula, uncertainty_ref, status,
                  validated, validated_at::TEXT, validated_by, created_by,
                  created_at::TEXT, updated_at::TEXT
        "#,
    )
    .bind(id)
    .bind(&req.method_name)
    .bind(&req.category_id)
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
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => {
            state
                .test_method_cache
                .remove(&test_method_cache_key(&id.to_string()));
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
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<bool>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的方法ID")),
    };

    let result = sqlx::query("DELETE FROM qa_lims_test_methods WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(_) => {
            state
                .test_method_cache
                .remove(&test_method_cache_key(&id.to_string()));
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
    axum::extract::Query(query): axum::extract::Query<MethodCategoryQuery>,
) -> Json<ApiResponse<Vec<MethodCategory>>> {
    let sql = match query.parent_id.as_ref() {
        Some(_) => "SELECT id, category_code, category_name, parent_id, sort_order, description, status, created_at::TEXT, updated_at::TEXT FROM qa_lims_method_categories WHERE parent_id = $1 ORDER BY sort_order ASC, created_at DESC",
        None => "SELECT id, category_code, category_name, parent_id, sort_order, description, status, created_at::TEXT, updated_at::TEXT FROM qa_lims_method_categories WHERE parent_id IS NULL ORDER BY sort_order ASC, created_at DESC",
    };

    let mut query_builder = sqlx::query(sql);
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
    Json(req): Json<CreateMethodCategoryRequest>,
) -> Json<ApiResponse<MethodCategory>> {
    let sort_order = req.sort_order.unwrap_or(0);

    let row = sqlx::query(
        r#"
        INSERT INTO qa_lims_method_categories (category_code, category_name, parent_id, sort_order, description, status)
        VALUES ($1, $2, $3, $4, $5, 'active')
        RETURNING id, category_code, category_name, parent_id, sort_order, description, status, created_at::TEXT, updated_at::TEXT
        "#
    )
    .bind(&req.category_code)
    .bind(&req.category_name)
    .bind(&req.parent_id)
    .bind(sort_order)
    .bind(&req.description)
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
        WHERE id = $1
        RETURNING id, category_code, category_name, parent_id, sort_order, description, status, created_at::TEXT, updated_at::TEXT
        "#
    )
    .bind(id)
    .bind(&req.category_name)
    .bind(&req.parent_id)
    .bind(req.sort_order)
    .bind(&req.description)
    .bind(&req.status)
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
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<bool>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的分类ID")),
    };

    let result = sqlx::query("DELETE FROM qa_lims_method_categories WHERE id = $1")
        .bind(id)
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
    axum::extract::Query(query): axum::extract::Query<MethodValidationQuery>,
) -> Json<ApiResponse<Vec<MethodValidationRecord>>> {
    let sql = match query.method_id.as_ref() {
        Some(_) => "SELECT id, method_id, method_code, method_name, version, validation_type, validation_date::TEXT, validated_by, conclusion, parameters, report_url, notes, status, created_at::TEXT FROM qa_lims_method_validations WHERE method_id = $1 ORDER BY validation_date DESC, created_at DESC",
        None => "SELECT id, method_id, method_code, method_name, version, validation_type, validation_date::TEXT, validated_by, conclusion, parameters, report_url, notes, status, created_at::TEXT FROM qa_lims_method_validations ORDER BY validation_date DESC, created_at DESC LIMIT 100",
    };

    let mut query_builder = sqlx::query(sql);
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
    Json(req): Json<CreateMethodValidationRequest>,
) -> Json<ApiResponse<MethodValidationRecord>> {
    let method_id = match Uuid::parse_str(&req.method_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的方法ID")),
    };

    let method_row = sqlx::query(
        "SELECT method_code, method_name, version FROM qa_lims_test_methods WHERE id = $1",
    )
    .bind(method_id)
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
            validation_date, validated_by, conclusion, parameters, report_url, notes, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'completed')
        RETURNING id, method_id, method_code, method_name, version, validation_type,
                  validation_date::TEXT, validated_by, conclusion, parameters,
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
    .fetch_one(&state.pool)
    .await;

    if req.conclusion == "pass" || req.conclusion == "合格" {
        let _ = sqlx::query(
            "UPDATE qa_lims_test_methods SET validated = true, validated_at = $2, validated_by = $3, updated_at = NOW() WHERE id = $1"
        )
        .bind(method_id)
        .bind(&validation_date)
        .bind(&req.validated_by)
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
    axum::extract::Path(method_id): axum::extract::Path<String>,
) -> Json<ApiResponse<Vec<MethodVersion>>> {
    let id = match Uuid::parse_str(&method_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的方法ID")),
    };

    let rows = sqlx::query(
        r#"
        SELECT id, method_id, version, version_description, change_log, is_current, created_by, created_at::TEXT
        FROM qa_lims_method_versions
        WHERE method_id = $1
        ORDER BY created_at DESC
        "#
    )
    .bind(id)
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
    axum::extract::Path(method_id): axum::extract::Path<String>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<TestMethod>> {
    let id = match Uuid::parse_str(&method_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的方法ID")),
    };

    let method_row = sqlx::query(
        "SELECT method_code, method_name, version FROM qa_lims_test_methods WHERE id = $1",
    )
    .bind(id)
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
        INSERT INTO qa_lims_method_versions (method_id, version, version_description, change_log, is_current, created_at)
        VALUES ($1, $2, $3, $4, false, NOW())
        "#
    )
    .bind(id)
    .bind(&current_version)
    .bind(version_description)
    .bind(change_log)
    .execute(&state.pool)
    .await;

    let row = sqlx::query(
        r#"
        UPDATE qa_lims_test_methods 
        SET version = $2, updated_at = NOW()
        WHERE id = $1
        RETURNING id, method_code, method_name, category_id, NULL as category_name,
                  standard, version, description, principle, instruments, reagents,
                  parameters, steps, calculation_formula, uncertainty_ref, status,
                  validated, validated_at::TEXT, validated_by, created_by,
                  created_at::TEXT, updated_at::TEXT
        "#,
    )
    .bind(id)
    .bind(&new_version)
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

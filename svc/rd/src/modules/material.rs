use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::get,
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::modules::audit::log_audit_event;
use topems_shared_core::response::ApiResponse;

#[derive(Debug, Deserialize)]
pub struct ListParams {
    /// 页码，默认 1
    #[serde(default, alias = "p")]
    pub page: Option<i64>,
    /// 每页大小，默认 20，最多 100
    #[serde(default, alias = "pagesize", alias = "pageSize", alias = "size", alias = "limit")]
    pub page_size: Option<i64>,
    /// 关键字搜索
    #[serde(default, alias = "q", alias = "keyword")]
    pub search: Option<String>,
    /// 排序字段
    #[serde(default, alias = "sort", alias = "sortBy")]
    pub sort_by: Option<String>,
    /// 排序方向：asc / desc
    #[serde(default, alias = "sortorder", alias = "sortOrder", alias = "sort_dir", alias = "dir")]
    pub sort_dir: Option<String>,
    pub project_id: Option<Uuid>,
    pub experiment_id: Option<Uuid>,
}
impl ListParams {
    pub fn page_or_default(&self) -> i64 {
        self.page.unwrap_or(1).max(1)
    }

    pub fn page_size_or_default(&self) -> i64 {
        self.page_size.unwrap_or(20).clamp(1, 100)
    }

    pub fn offset(&self) -> i64 {
        (self.page_or_default() - 1) * self.page_size_or_default()
    }
}



#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct MaterialTest {
    pub id: Uuid,
    pub project_id: Option<Uuid>,
    pub experiment_id: Option<Uuid>,
    pub material_name: String,
    pub supplier: Option<String>,
    pub batch_number: Option<String>,
    pub test_results: serde_json::Value,
    pub conclusion: Option<String>,
    pub tested_by: String,
    pub tested_at: chrono::DateTime<chrono::Utc>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateMaterialTestRequest {
    pub project_id: Option<Uuid>,
    pub experiment_id: Option<Uuid>,
    pub material_name: String,
    pub supplier: Option<String>,
    pub batch_number: Option<String>,
    pub test_results: serde_json::Value,
    pub conclusion: Option<String>,
    pub tested_by: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateMaterialTestRequest {
    pub material_name: Option<String>,
    pub supplier: Option<String>,
    pub batch_number: Option<String>,
    pub test_results: Option<serde_json::Value>,
    pub conclusion: Option<String>,
}

pub fn create_routes() -> Router<super::ApiState> {
    Router::<super::ApiState>::new()
        .route(
            "/material-tests",
            get(list_material_tests).post(create_material_test),
        )
        .route(
            "/material-tests/{id}",
            get(get_material_test)
                .put(update_material_test)
                .delete(delete_material_test),
        )
        .route("/material-tests/project/{project_id}", get(list_by_project))
        .route(
            "/material-tests/experiment/{experiment_id}",
            get(list_by_experiment),
        )
}

pub async fn list_material_tests(
    State(_state): State<super::ApiState>,
    Query(params): Query<ListParams>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let page = params.page_or_default();
    let page_size = params.page_size_or_default();
    let offset = params.offset();

    let result = sqlx::query_as::<_, MaterialTest>(
        r#"
        SELECT id, project_id, experiment_id, material_name, supplier, batch_number,
               test_results, conclusion, tested_by, tested_at, created_at
        FROM rs.material_tests
        WHERE ($1::text IS NULL OR material_name ILIKE $1 OR batch_number ILIKE $1)
          AND ($2::uuid IS NULL OR project_id = $2)
          AND ($3::uuid IS NULL OR experiment_id = $3)
        ORDER BY tested_at DESC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(&params.search)
    .bind(params.project_id)
    .bind(params.experiment_id)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(records) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM rs.material_tests
                WHERE deleted_at IS NULL AND ($1::text IS NULL OR material_name ILIKE $1 OR batch_number ILIKE $1)
                  AND ($2::uuid IS NULL OR project_id = $2)
                  AND ($3::uuid IS NULL OR experiment_id = $3)
                "#,
            )
            .bind(&params.search)
            .bind(params.project_id)
            .bind(params.experiment_id)
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "material_tests": records,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取原料试验记录成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取原料试验记录失败: {}", e);
            Json(ApiResponse::error(500, "获取原料试验记录失败"))
        }
    }
}

pub async fn list_by_project(
    State(_state): State<super::ApiState>,
    Path(project_id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<Vec<MaterialTest>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query_as::<_, MaterialTest>(
        r#"
        SELECT id, project_id, experiment_id, material_name, supplier, batch_number,
               test_results, conclusion, tested_by, tested_at, created_at
        FROM rs.material_tests
        WHERE project_id = $1
        ORDER BY tested_at DESC
        "#,
    )
    .bind(project_id)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(records) => Json(ApiResponse::success(records, "获取项目原料试验记录成功")),
        Err(e) => {
            tracing::error!("获取项目原料试验记录失败: {}", e);
            Json(ApiResponse::error(500, "获取项目原料试验记录失败"))
        }
    }
}

pub async fn list_by_experiment(
    State(_state): State<super::ApiState>,
    Path(experiment_id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<Vec<MaterialTest>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query_as::<_, MaterialTest>(
        r#"
        SELECT id, project_id, experiment_id, material_name, supplier, batch_number,
               test_results, conclusion, tested_by, tested_at, created_at
        FROM rs.material_tests
        WHERE experiment_id = $1
        ORDER BY tested_at DESC
        "#,
    )
    .bind(experiment_id)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(records) => Json(ApiResponse::success(records, "获取试验原料试验记录成功")),
        Err(e) => {
            tracing::error!("获取试验原料试验记录失败: {}", e);
            Json(ApiResponse::error(500, "获取试验原料试验记录失败"))
        }
    }
}

pub async fn create_material_test(
    State(state): State<super::ApiState>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CreateMaterialTestRequest>,
) -> Json<ApiResponse<MaterialTest>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if req.material_name.is_empty() {
        return Json(ApiResponse::error(400, "原料名称不能为空"));
    }

    if req.tested_by.is_empty() {
        return Json(ApiResponse::error(400, "测试人员不能为空"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();

    // Clone req for audit log before moving req into the query
    let request_data = serde_json::to_value(&req).ok();

    let result = sqlx::query_as::<_, MaterialTest>(
        r#"
        INSERT INTO rs.material_tests (
            id, project_id, experiment_id, material_name, supplier, batch_number,
            test_results, conclusion, tested_by, tested_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, project_id, experiment_id, material_name, supplier, batch_number,
                  test_results, conclusion, tested_by, tested_at, created_at
        "#,
    )
    .bind(id)
    .bind(req.project_id)
    .bind(req.experiment_id)
    .bind(&req.material_name)
    .bind(&req.supplier)
    .bind(&req.batch_number)
    .bind(&req.test_results)
    .bind(&req.conclusion)
    .bind(&req.tested_by)
    .bind(now)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(record) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return Json(ApiResponse::error(500, "提交事务失败"));
                }
            }
            let response_data = serde_json::to_value(&record).ok();
            log_audit_event(
                &state.db,
                "create".to_string(),
                "material_test".to_string(),
                Some(id),
                None,
                None,
                None,
                request_data,
                response_data,
                "success".to_string(),
                None,
                &headers,
            )
            .await;
            Json(ApiResponse::success(record, "原料试验记录创建成功"))
        }
        Err(e) => {
            tracing::error!("创建原料试验记录失败: {}", e);
            log_audit_event(
                &state.db,
                "create".to_string(),
                "material_test".to_string(),
                Some(id),
                None,
                None,
                None,
                request_data,
                None,
                "error".to_string(),
                Some(e.to_string()),
                &headers,
            )
            .await;
            Json(ApiResponse::error(500, "原料试验记录创建失败"))
        }
    }
}

pub async fn get_material_test(
    State(_state): State<super::ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<MaterialTest>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query_as::<_, MaterialTest>(
        r#"
        SELECT id, project_id, experiment_id, material_name, supplier, batch_number,
               test_results, conclusion, tested_by, tested_at, created_at
        FROM rs.material_tests WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(record)) => Json(ApiResponse::success(record, "获取原料试验记录成功")),
        Ok(None) => Json(ApiResponse::error(404, "原料试验记录不存在")),
        Err(e) => {
            tracing::error!("获取原料试验记录失败: {}", e);
            Json(ApiResponse::error(500, "获取原料试验记录失败"))
        }
    }
}

pub async fn update_material_test(
    State(state): State<super::ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<UpdateMaterialTestRequest>,
) -> Json<ApiResponse<MaterialTest>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let existing = sqlx::query_as::<_, MaterialTest>(
        "SELECT id, project_id, experiment_id, material_name, supplier, batch_number, test_results, conclusion, tested_by, tested_at, created_at FROM rs.material_tests WHERE deleted_at IS NULL AND id = $1",
    )
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    let existing = match existing {
        Ok(Some(r)) => r,
        Ok(None) => return Json(ApiResponse::error(404, "原料试验记录不存在")),
        Err(e) => {
            return Json(ApiResponse::error(
                500,
                &format!("查询原料试验记录失败: {}", e),
            ))
        }
    };

    let request_data = serde_json::to_value(&req).ok();

    let material_name = req.material_name.unwrap_or(existing.material_name);
    let supplier = req.supplier.or(existing.supplier);
    let batch_number = req.batch_number.or(existing.batch_number);
    let test_results = req.test_results.unwrap_or(existing.test_results);
    let conclusion = req.conclusion.or(existing.conclusion);

    let result = sqlx::query_as::<_, MaterialTest>(
        r#"
        UPDATE rs.material_tests SET
            material_name = $2, supplier = $3, batch_number = $4,
            test_results = $5, conclusion = $6
        WHERE id = $1
        RETURNING id, project_id, experiment_id, material_name, supplier, batch_number,
                  test_results, conclusion, tested_by, tested_at, created_at
        "#,
    )
    .bind(id)
    .bind(&material_name)
    .bind(supplier)
    .bind(batch_number)
    .bind(test_results)
    .bind(conclusion)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(record) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return Json(ApiResponse::error(500, "提交事务失败"));
                }
            }
            let response_data = serde_json::to_value(&record).ok();
            log_audit_event(
                &state.db,
                "update".to_string(),
                "material_test".to_string(),
                Some(id),
                None,
                None,
                None,
                request_data,
                response_data,
                "success".to_string(),
                None,
                &headers,
            )
            .await;
            Json(ApiResponse::success(record, "原料试验记录更新成功"))
        }
        Err(e) => {
            tracing::error!("更新原料试验记录失败: {}", e);
            log_audit_event(
                &state.db,
                "update".to_string(),
                "material_test".to_string(),
                Some(id),
                None,
                None,
                None,
                request_data,
                None,
                "error".to_string(),
                Some(e.to_string()),
                &headers,
            )
            .await;
            Json(ApiResponse::error(500, "原料试验记录更新失败"))
        }
    }
}

pub async fn delete_material_test(
    State(state): State<super::ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<String>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query("UPDATE rs.material_tests SET deleted_at = NOW() WHERE id = $1")
        .bind(id)
        .execute(&mut **txn)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "原料试验记录删除成功")),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            Json(ApiResponse::error(404, "原料试验记录不存在")),
            "error".to_string(),
            Some("原料试验记录不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除原料试验记录失败: {}", e);
            (
                Json(ApiResponse::error(500, "原料试验记录删除失败")),
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
        "delete".to_string(),
        "material_test".to_string(),
        Some(id),
        None,
        None,
        None,
        None,
        response_data,
        status_str,
        error_msg,
        &headers,
    )
    .await;

    response
}

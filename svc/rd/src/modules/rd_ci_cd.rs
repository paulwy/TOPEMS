// RD · CI/CD 子模块（缺陷 / 构建 / 部署 / 测试用例）
//
// 第一批-② 前后端对应性修复：前端 rd/bug.ts、build.ts、deploy.ts、test.ts
// 契约完整但后端无路由（审计 P0）。本模块聚合 4 组 handler。
// 表：rd.bugs / rd.builds / rd.deploys / rd.test_cases（迁移 20260908000004）

use axum::{
    extract::{Extension, Path, Query, State},
    http::StatusCode,
    routing::get,
    Json, Router,
};
use serde::Deserialize;
use sqlx::Row;
use topems_shared_core::response::ApiResponse;
use uuid::Uuid;

use super::ApiState;

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/bugs", get(list_bugs).post(create_bug))
        .route(
            "/bugs/{id}",
            get(get_bug).put(update_bug).delete(delete_bug),
        )
        .route("/builds", get(list_builds).post(create_build))
        .route("/builds/{id}", get(get_build))
        .route("/deploys", get(list_deploys).post(create_deploy))
        .route("/deploys/{id}", get(get_deploy))
        .route("/tests", get(list_tests).post(create_test))
        .route(
            "/tests/{id}",
            get(get_test).put(update_test).delete(delete_test),
        )
}

fn internal_error(msg: &str) -> (StatusCode, Json<ApiResponse<serde_json::Value>>) {
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(ApiResponse::error(500, msg)),
    )
}

fn not_found(msg: &str) -> (StatusCode, Json<ApiResponse<serde_json::Value>>) {
    (StatusCode::NOT_FOUND, Json(ApiResponse::error(404, msg)))
}

// ==================== 缺陷 Bug ====================

#[derive(Debug, Deserialize)]
pub struct ListBugsQuery {
    pub page: Option<i64>,
    pub pagesize: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub severity: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateBugRequest {
    pub bug_title: String,
    pub severity: Option<String>,
    pub priority: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateBugRequest {
    pub bug_title: Option<String>,
    pub severity: Option<String>,
    pub priority: Option<String>,
    pub status: Option<String>,
    pub assignee: Option<String>,
    pub description: Option<String>,
}

fn bug_to_json(row: &sqlx::postgres::PgRow) -> serde_json::Value {
    serde_json::json!({
        "id": row.get::<Uuid, _>("id").to_string(),
        "bug_no": row.get::<String, _>("bug_no"),
        "bug_title": row.get::<String, _>("bug_title"),
        "severity": row.get::<String, _>("severity"),
        "priority": row.get::<String, _>("priority"),
        "status": row.get::<String, _>("status"),
        "assignee": row.get::<Option<String>, _>("assignee"),
        "create_time": row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("create_time"),
        "description": row.get::<Option<String>, _>("description"),
    })
}

async fn list_typed(
    db: &mut sqlx::PgConnection,
    table: &str,
    search_cols: &str,
    params: &ListBugsQuery,
) -> Result<(i64, Vec<sqlx::postgres::PgRow>), sqlx::Error> {
    let page = params.page.unwrap_or(1).max(1);
    let pagesize = params.pagesize.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * pagesize;

    // 仅内部生成 SQL；表名/列名来自本模块常量，非外部输入
    let search_sql = format!(
        "({})",
        search_cols
            .split(',')
            .map(|c| format!("{} ILIKE '%' || $2 || '%'", c))
            .collect::<Vec<_>>()
            .join(" OR ")
    );
    let count_sql = format!(
        "SELECT COUNT(*) FROM rd.{} WHERE ($1::text IS NULL OR status = $1) AND ($2::text IS NULL OR {})",
        table, search_sql
    );
    let list_sql = format!(
        "SELECT * FROM rd.{} WHERE ($1::text IS NULL OR status = $1) AND ($2::text IS NULL OR {}) ORDER BY created_at DESC LIMIT $3 OFFSET $4",
        table, search_sql
    );

    let total: i64 = sqlx::query_scalar(&count_sql)
        .bind(&params.status)
        .bind(&params.search)
        .fetch_one(&mut *db)
        .await?;

    let rows = sqlx::query(&list_sql)
        .bind(&params.status)
        .bind(&params.search)
        .bind(pagesize)
        .bind(offset)
        .fetch_all(&mut *db)
        .await?;

    Ok((total, rows))
}

pub async fn list_bugs(
    State(_state): State<ApiState>,
    Query(params): Query<ListBugsQuery>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Result<Json<ApiResponse<serde_json::Value>>, (StatusCode, Json<ApiResponse<serde_json::Value>>)>
{
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let page = params.page.unwrap_or(1).max(1);
    let pagesize = params.pagesize.unwrap_or(20).clamp(1, 100);
    let (total, rows) = match list_typed(&mut *txn, "bugs", "bug_no,bug_title", &params).await {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询缺陷列表失败: {}", e);
            return Err(internal_error("查询缺陷列表失败"));
        }
    };
    let items: Vec<serde_json::Value> = rows.iter().map(bug_to_json).collect();
    Ok(Json(ApiResponse::success(
        serde_json::json!({ "items": items, "total": total, "page": page, "pagesize": pagesize }),
        "获取缺陷列表成功",
    )))
}

pub async fn get_bug(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Result<Json<ApiResponse<serde_json::Value>>, (StatusCode, Json<ApiResponse<serde_json::Value>>)>
{
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let row = sqlx::query("SELECT * FROM rd.bugs WHERE id = $1")
        .bind(id)
        .fetch_optional(&mut **txn)
        .await;
    match row {
        Ok(Some(r)) => Ok(Json(ApiResponse::success(bug_to_json(&r), "获取缺陷成功"))),
        Ok(None) => Err(not_found("缺陷不存在")),
        Err(e) => {
            tracing::error!("查询缺陷失败: {}", e);
            Err(internal_error("查询缺陷失败"))
        }
    }
}

pub async fn create_bug(
    State(_state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CreateBugRequest>,
) -> Result<Json<ApiResponse<serde_json::Value>>, (StatusCode, Json<ApiResponse<serde_json::Value>>)>
{
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let severity = req.severity.unwrap_or_else(|| "medium".to_string());
    let priority = req.priority.unwrap_or_else(|| "medium".to_string());
    let bug_no = format!("BUG-{:X}", Uuid::new_v4().as_u128() % 1_000_000);
    let row = sqlx::query(
        "INSERT INTO rd.bugs (bug_no, bug_title, severity, priority, description) \
         VALUES ($1, $2, $3, $4, $5) \
         RETURNING *",
    )
    .bind(&bug_no)
    .bind(&req.bug_title)
    .bind(&severity)
    .bind(&priority)
    .bind(&req.description)
    .fetch_one(&mut **txn)
    .await;
    match row {
        Ok(r) => Ok(Json(ApiResponse::success(bug_to_json(&r), "创建缺陷成功"))),
        Err(e) => {
            tracing::error!("创建缺陷失败: {}", e);
            Err(internal_error("创建缺陷失败"))
        }
    }
}

pub async fn update_bug(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<UpdateBugRequest>,
) -> Result<Json<ApiResponse<serde_json::Value>>, (StatusCode, Json<ApiResponse<serde_json::Value>>)>
{
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let row = sqlx::query(
        "UPDATE rd.bugs SET \
         bug_title = COALESCE($2, bug_title), \
         severity = COALESCE($3, severity), \
         priority = COALESCE($4, priority), \
         status = COALESCE($5, status), \
         assignee = COALESCE($6, assignee), \
         description = COALESCE($7, description), \
         updated_at = NOW() \
         WHERE id = $1 RETURNING *",
    )
    .bind(id)
    .bind(&req.bug_title)
    .bind(&req.severity)
    .bind(&req.priority)
    .bind(&req.status)
    .bind(&req.assignee)
    .bind(&req.description)
    .fetch_optional(&mut **txn)
    .await;
    match row {
        Ok(Some(r)) => Ok(Json(ApiResponse::success(bug_to_json(&r), "更新缺陷成功"))),
        Ok(None) => Err(not_found("缺陷不存在")),
        Err(e) => {
            tracing::error!("更新缺陷失败: {}", e);
            Err(internal_error("更新缺陷失败"))
        }
    }
}

pub async fn delete_bug(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Result<Json<ApiResponse<serde_json::Value>>, (StatusCode, Json<ApiResponse<serde_json::Value>>)>
{
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query("DELETE FROM rd.bugs WHERE id = $1")
        .bind(id)
        .execute(&mut **txn)
        .await;
    match result {
        Ok(res) if res.rows_affected() > 0 => Ok(Json(ApiResponse::success(
            serde_json::json!({ "deleted": true, "id": id.to_string() }),
            "删除缺陷成功",
        ))),
        Ok(_) => Err(not_found("缺陷不存在")),
        Err(e) => {
            tracing::error!("删除缺陷失败: {}", e);
            Err(internal_error("删除缺陷失败"))
        }
    }
}

// ==================== 构建 Build ====================

#[derive(Debug, Deserialize)]
pub struct CreateBuildRequest {
    pub project_id: Option<Uuid>,
    pub branch: Option<String>,
    pub commit_hash: Option<String>,
    pub build_type: Option<String>,
    pub trigger_type: Option<String>,
}

fn build_to_json(row: &sqlx::postgres::PgRow) -> serde_json::Value {
    serde_json::json!({
        "id": row.get::<Uuid, _>("id").to_string(),
        "build_no": row.get::<String, _>("build_no"),
        "project_id": row.get::<Option<Uuid>, _>("project_id").map(|v| v.to_string()),
        "project_name": row.get::<Option<String>, _>("project_name"),
        "branch": row.get::<Option<String>, _>("branch"),
        "commit_hash": row.get::<Option<String>, _>("commit_hash"),
        "build_type": row.get::<String, _>("build_type"),
        "trigger_type": row.get::<String, _>("trigger_type"),
        "status": row.get::<String, _>("status"),
        "duration": row.get::<i32, _>("duration"),
        "build_time": row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("build_time"),
        "logs": row.get::<Option<String>, _>("logs"),
        "created_at": row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("created_at"),
    })
}

pub async fn list_builds(
    State(_state): State<ApiState>,
    Query(params): Query<ListBugsQuery>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Result<Json<ApiResponse<serde_json::Value>>, (StatusCode, Json<ApiResponse<serde_json::Value>>)>
{
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let page = params.page.unwrap_or(1).max(1);
    let pagesize = params.pagesize.unwrap_or(20).clamp(1, 100);
    let (total, rows) =
        match list_typed(&mut *txn, "builds", "build_no,branch,commit_hash", &params).await {
            Ok(v) => v,
            Err(e) => {
                tracing::error!("查询构建列表失败: {}", e);
                return Err(internal_error("查询构建列表失败"));
            }
        };
    let items: Vec<serde_json::Value> = rows.iter().map(build_to_json).collect();
    Ok(Json(ApiResponse::success(
        serde_json::json!({ "items": items, "total": total, "page": page, "pagesize": pagesize }),
        "获取构建列表成功",
    )))
}

pub async fn get_build(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Result<Json<ApiResponse<serde_json::Value>>, (StatusCode, Json<ApiResponse<serde_json::Value>>)>
{
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let row = sqlx::query("SELECT * FROM rd.builds WHERE id = $1")
        .bind(id)
        .fetch_optional(&mut **txn)
        .await;
    match row {
        Ok(Some(r)) => Ok(Json(ApiResponse::success(
            build_to_json(&r),
            "获取构建成功",
        ))),
        Ok(None) => Err(not_found("构建不存在")),
        Err(e) => {
            tracing::error!("查询构建失败: {}", e);
            Err(internal_error("查询构建失败"))
        }
    }
}

pub async fn create_build(
    State(_state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CreateBuildRequest>,
) -> Result<Json<ApiResponse<serde_json::Value>>, (StatusCode, Json<ApiResponse<serde_json::Value>>)>
{
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let build_type = req.build_type.unwrap_or_else(|| "ci".to_string());
    let trigger_type = req.trigger_type.unwrap_or_else(|| "manual".to_string());
    let build_no = format!("BUILD-{:X}", Uuid::new_v4().as_u128() % 1_000_000);
    let row = sqlx::query(
        "INSERT INTO rd.builds (build_no, project_id, branch, commit_hash, build_type, trigger_type) \
         VALUES ($1, $2, $3, $4, $5, $6) \
         RETURNING *",
    )
    .bind(&build_no)
    .bind(req.project_id)
    .bind(&req.branch)
    .bind(&req.commit_hash)
    .bind(&build_type)
    .bind(&trigger_type)
    .fetch_one(&mut **txn)
    .await;
    match row {
        Ok(r) => Ok(Json(ApiResponse::success(
            build_to_json(&r),
            "创建构建成功",
        ))),
        Err(e) => {
            tracing::error!("创建构建失败: {}", e);
            Err(internal_error("创建构建失败"))
        }
    }
}

// ==================== 部署 Deploy ====================

#[derive(Debug, Deserialize)]
pub struct CreateDeployRequest {
    pub project_id: Option<Uuid>,
    pub build_id: Option<Uuid>,
    pub env: Option<String>,
    pub deploy_type: Option<String>,
    pub environment: Option<String>,
    pub app_name: Option<String>,
    pub version: Option<String>,
}

fn deploy_to_json(row: &sqlx::postgres::PgRow) -> serde_json::Value {
    serde_json::json!({
        "id": row.get::<Uuid, _>("id").to_string(),
        "deploy_no": row.get::<String, _>("deploy_no"),
        "project_id": row.get::<Option<Uuid>, _>("project_id").map(|v| v.to_string()),
        "project_name": row.get::<Option<String>, _>("project_name"),
        "build_id": row.get::<Option<Uuid>, _>("build_id").map(|v| v.to_string()),
        "env": row.get::<Option<String>, _>("env"),
        "deploy_type": row.get::<String, _>("deploy_type"),
        "environment": row.get::<Option<String>, _>("environment"),
        "app_name": row.get::<Option<String>, _>("app_name"),
        "version": row.get::<Option<String>, _>("version"),
        "status": row.get::<String, _>("status"),
        "deploy_time": row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("deploy_time"),
        "deployer": row.get::<Option<String>, _>("deployer"),
        "operator": row.get::<Option<String>, _>("operator"),
        "target_url": row.get::<Option<String>, _>("target_url"),
        "logs": row.get::<Option<String>, _>("logs"),
        "created_at": row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("created_at"),
    })
}

pub async fn list_deploys(
    State(_state): State<ApiState>,
    Query(params): Query<ListBugsQuery>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Result<Json<ApiResponse<serde_json::Value>>, (StatusCode, Json<ApiResponse<serde_json::Value>>)>
{
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let page = params.page.unwrap_or(1).max(1);
    let pagesize = params.pagesize.unwrap_or(20).clamp(1, 100);
    let (total, rows) =
        match list_typed(&mut *txn, "deploys", "deploy_no,app_name,version", &params).await {
            Ok(v) => v,
            Err(e) => {
                tracing::error!("查询部署列表失败: {}", e);
                return Err(internal_error("查询部署列表失败"));
            }
        };
    let items: Vec<serde_json::Value> = rows.iter().map(deploy_to_json).collect();
    Ok(Json(ApiResponse::success(
        serde_json::json!({ "items": items, "total": total, "page": page, "pagesize": pagesize }),
        "获取部署列表成功",
    )))
}

pub async fn get_deploy(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Result<Json<ApiResponse<serde_json::Value>>, (StatusCode, Json<ApiResponse<serde_json::Value>>)>
{
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let row = sqlx::query("SELECT * FROM rd.deploys WHERE id = $1")
        .bind(id)
        .fetch_optional(&mut **txn)
        .await;
    match row {
        Ok(Some(r)) => Ok(Json(ApiResponse::success(
            deploy_to_json(&r),
            "获取部署成功",
        ))),
        Ok(None) => Err(not_found("部署不存在")),
        Err(e) => {
            tracing::error!("查询部署失败: {}", e);
            Err(internal_error("查询部署失败"))
        }
    }
}

pub async fn create_deploy(
    State(_state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CreateDeployRequest>,
) -> Result<Json<ApiResponse<serde_json::Value>>, (StatusCode, Json<ApiResponse<serde_json::Value>>)>
{
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let deploy_type = req.deploy_type.unwrap_or_else(|| "rolling".to_string());
    let deploy_no = format!("DEPLOY-{:X}", Uuid::new_v4().as_u128() % 1_000_000);
    let row = sqlx::query(
        "INSERT INTO rd.deploys \
         (deploy_no, project_id, build_id, env, deploy_type, environment, app_name, version) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) \
         RETURNING *",
    )
    .bind(&deploy_no)
    .bind(req.project_id)
    .bind(req.build_id)
    .bind(&req.env)
    .bind(&deploy_type)
    .bind(&req.environment)
    .bind(&req.app_name)
    .bind(&req.version)
    .fetch_one(&mut **txn)
    .await;
    match row {
        Ok(r) => Ok(Json(ApiResponse::success(
            deploy_to_json(&r),
            "创建部署成功",
        ))),
        Err(e) => {
            tracing::error!("创建部署失败: {}", e);
            Err(internal_error("创建部署失败"))
        }
    }
}

// ==================== 测试用例 TestCase ====================

#[derive(Debug, Deserialize)]
pub struct CreateTestCaseRequest {
    pub case_name: String,
    pub case_type: Option<String>,
    pub priority: Option<String>,
    pub related_requirement: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTestCaseRequest {
    pub case_name: Option<String>,
    pub case_type: Option<String>,
    pub priority: Option<String>,
    pub status: Option<String>,
    pub related_requirement: Option<String>,
}

fn test_to_json(row: &sqlx::postgres::PgRow) -> serde_json::Value {
    serde_json::json!({
        "id": row.get::<Uuid, _>("id").to_string(),
        "case_no": row.get::<String, _>("case_no"),
        "case_name": row.get::<String, _>("case_name"),
        "case_type": row.get::<String, _>("case_type"),
        "priority": row.get::<String, _>("priority"),
        "status": row.get::<String, _>("status"),
        "related_requirement": row.get::<Option<String>, _>("related_requirement"),
        "created_at": row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("created_at"),
    })
}

pub async fn list_tests(
    State(_state): State<ApiState>,
    Query(params): Query<ListBugsQuery>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Result<Json<ApiResponse<serde_json::Value>>, (StatusCode, Json<ApiResponse<serde_json::Value>>)>
{
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let page = params.page.unwrap_or(1).max(1);
    let pagesize = params.pagesize.unwrap_or(20).clamp(1, 100);
    let (total, rows) =
        match list_typed(&mut *txn, "test_cases", "case_no,case_name", &params).await {
            Ok(v) => v,
            Err(e) => {
                tracing::error!("查询测试用例列表失败: {}", e);
                return Err(internal_error("查询测试用例列表失败"));
            }
        };
    let items: Vec<serde_json::Value> = rows.iter().map(test_to_json).collect();
    Ok(Json(ApiResponse::success(
        serde_json::json!({ "items": items, "total": total, "page": page, "pagesize": pagesize }),
        "获取测试用例列表成功",
    )))
}

pub async fn get_test(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Result<Json<ApiResponse<serde_json::Value>>, (StatusCode, Json<ApiResponse<serde_json::Value>>)>
{
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let row = sqlx::query("SELECT * FROM rd.test_cases WHERE id = $1")
        .bind(id)
        .fetch_optional(&mut **txn)
        .await;
    match row {
        Ok(Some(r)) => Ok(Json(ApiResponse::success(
            test_to_json(&r),
            "获取测试用例成功",
        ))),
        Ok(None) => Err(not_found("测试用例不存在")),
        Err(e) => {
            tracing::error!("查询测试用例失败: {}", e);
            Err(internal_error("查询测试用例失败"))
        }
    }
}

pub async fn create_test(
    State(_state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CreateTestCaseRequest>,
) -> Result<Json<ApiResponse<serde_json::Value>>, (StatusCode, Json<ApiResponse<serde_json::Value>>)>
{
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let case_type = req.case_type.unwrap_or_else(|| "function".to_string());
    let priority = req.priority.unwrap_or_else(|| "medium".to_string());
    let case_no = format!("TC-{:X}", Uuid::new_v4().as_u128() % 1_000_000);
    let row = sqlx::query(
        "INSERT INTO rd.test_cases (case_no, case_name, case_type, priority, related_requirement) \
         VALUES ($1, $2, $3, $4, $5) \
         RETURNING *",
    )
    .bind(&case_no)
    .bind(&req.case_name)
    .bind(&case_type)
    .bind(&priority)
    .bind(&req.related_requirement)
    .fetch_one(&mut **txn)
    .await;
    match row {
        Ok(r) => Ok(Json(ApiResponse::success(
            test_to_json(&r),
            "创建测试用例成功",
        ))),
        Err(e) => {
            tracing::error!("创建测试用例失败: {}", e);
            Err(internal_error("创建测试用例失败"))
        }
    }
}

pub async fn update_test(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<UpdateTestCaseRequest>,
) -> Result<Json<ApiResponse<serde_json::Value>>, (StatusCode, Json<ApiResponse<serde_json::Value>>)>
{
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let row = sqlx::query(
        "UPDATE rd.test_cases SET \
         case_name = COALESCE($2, case_name), \
         case_type = COALESCE($3, case_type), \
         priority = COALESCE($4, priority), \
         status = COALESCE($5, status), \
         related_requirement = COALESCE($6, related_requirement), \
         updated_at = NOW() \
         WHERE id = $1 RETURNING *",
    )
    .bind(id)
    .bind(&req.case_name)
    .bind(&req.case_type)
    .bind(&req.priority)
    .bind(&req.status)
    .bind(&req.related_requirement)
    .fetch_optional(&mut **txn)
    .await;
    match row {
        Ok(Some(r)) => Ok(Json(ApiResponse::success(
            test_to_json(&r),
            "更新测试用例成功",
        ))),
        Ok(None) => Err(not_found("测试用例不存在")),
        Err(e) => {
            tracing::error!("更新测试用例失败: {}", e);
            Err(internal_error("更新测试用例失败"))
        }
    }
}

pub async fn delete_test(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Result<Json<ApiResponse<serde_json::Value>>, (StatusCode, Json<ApiResponse<serde_json::Value>>)>
{
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query("DELETE FROM rd.test_cases WHERE id = $1")
        .bind(id)
        .execute(&mut **txn)
        .await;
    match result {
        Ok(res) if res.rows_affected() > 0 => Ok(Json(ApiResponse::success(
            serde_json::json!({ "deleted": true, "id": id.to_string() }),
            "删除测试用例成功",
        ))),
        Ok(_) => Err(not_found("测试用例不存在")),
        Err(e) => {
            tracing::error!("删除测试用例失败: {}", e);
            Err(internal_error("删除测试用例失败"))
        }
    }
}

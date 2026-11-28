//! QMS 质检任务 / 缺陷记录契约路由（mobile 内部服务调用补齐）
//!
//! 背景: mobile 通过共享 service-client（QmsApi）调用 /quality-tasks、/defect-records，
//!       此前 QMS 无对应路由 → 404「接口不存在」。此处补齐，数据源为现有业务表：
//!         - quality-tasks  ← qms.qa_quality_inspections（质检单即质检任务）
//!         - defect-records ← qms.qa_inspection_results（未合格项即缺陷记录）
//! 响应统一 envelope（{code,success,data:{items,total}}），共享 client get_items 解包。

use axum::{
    extract::{Extension, Path, Query, State},
    routing::{get, post, put},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_auth::require_tenant;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::ApiResponse;

use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct QualityTaskQuery {
    pub page: Option<i32>,
    pub page_size: Option<i32>,
    pub status: Option<String>,
    pub search: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct DefectRecordQuery {
    pub page: Option<i32>,
    pub page_size: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct QualityTaskStatusRequest {
    pub status: String,
}

#[derive(Debug, Deserialize)]
pub struct ReportDefectRequest {
    pub inspection_id: Option<String>,
    pub item_name: String,
    pub standard_value: Option<String>,
    pub measured_value: Option<String>,
    pub remark: Option<String>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct QualityTask {
    pub id: String,
    pub inspection_no: String,
    pub inspection_type: String,
    pub product_name: Option<String>,
    pub quantity: String,
    pub qualified_quantity: Option<String>,
    pub unqualified_quantity: Option<String>,
    pub qualification_rate: Option<String>,
    pub status: Option<String>,
    pub inspector: Option<String>,
    pub assignee: Option<String>,
    #[serde(deserialize_with = "topems_shared_db::datetime_text::option::deserialize")]
    pub inspected_at: Option<DateTime<Utc>>,
    pub result: Option<String>,
    #[serde(deserialize_with = "topems_shared_db::datetime_text::deserialize")]
    pub created_at: DateTime<Utc>,
    pub tenant_id: String,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct DefectRecord {
    pub id: String,
    pub inspection_id: String,
    pub item_name: String,
    pub standard_value: Option<String>,
    pub measured_value: Option<String>,
    pub is_qualified: bool,
    pub remark: Option<String>,
    #[serde(deserialize_with = "topems_shared_db::datetime_text::deserialize")]
    pub created_at: DateTime<Utc>,
    pub tenant_id: String,
}

/// GET /quality-tasks —— 质检任务列表（数据源 qa_quality_inspections）
#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:quality_task:read"])),
    path = "/quality-tasks",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "QMS/quality_task"
)]
pub async fn list_quality_tasks(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    _headers: axum::http::HeaderMap,
    Query(query): Query<QualityTaskQuery>,
) -> ApiResponse<serde_json::Value> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(10).clamp(1, 100);
    let offset = (page - 1) * page_size;
    let search_pattern = query.search.as_ref().map(|s| format!("%{}%", s));

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims, txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[qms] 质检任务读取作用域创建失败: {}", e);
            return ApiResponse::server_error("获取质检任务列表失败");
        }
    };

    let total: i64 = match sqlx::query_scalar(only_own_schema_query!(
        "qms",
        r#"
        SELECT COUNT(*) FROM qms.qa_quality_inspections
        WHERE deleted_at IS NULL
          AND ($1::text IS NULL OR status = $1)
          AND ($2::text IS NULL OR inspection_no ILIKE $2 OR product_name ILIKE $2)
    "#
    ))
    .bind(query.status.as_deref())
    .bind(search_pattern.as_deref())
    .fetch_one(&mut scope)
    .await
    {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("quality-tasks count 失败: {}", e);
            return ApiResponse::server_error("获取质检任务列表失败");
        }
    };

    let items = match sqlx::query_as::<_, QualityTask>(only_own_schema_query!(
        "qms",
        r#"
        SELECT id::TEXT,
               inspection_no,
               inspection_type,
               product_name,
               quantity::TEXT,
               qualified_quantity::TEXT,
               unqualified_quantity::TEXT,
               qualification_rate::TEXT,
               status,
               inspector,
               assignee,
               inspected_at,
               result,
               created_at,
               COALESCE(tenant_id::TEXT, '00000000-0000-0000-0000-000000000001') AS tenant_id
        FROM qms.qa_quality_inspections
        WHERE deleted_at IS NULL
          AND ($1::text IS NULL OR status = $1)
          AND ($2::text IS NULL OR inspection_no ILIKE $2 OR product_name ILIKE $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
    "#
    ))
    .bind(query.status.as_deref())
    .bind(search_pattern.as_deref())
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut scope)
    .await
    {
        Ok(rows) => rows,
        Err(e) => {
            tracing::error!("quality-tasks list 失败: {}", e);
            return ApiResponse::server_error("获取质检任务列表失败");
        }
    };

    ApiResponse::success(
        serde_json::json!({ "items": items, "total": total, "page": page, "page_size": page_size }),
        "获取质检任务列表成功",
    )
}

/// GET /quality-tasks/{id} —— 质检任务详情
#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:quality_task:read"])),
    path = "/quality-tasks/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "QMS/quality_task"
)]
pub async fn get_quality_task(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    _headers: axum::http::HeaderMap,
    Path(id): Path<String>,
) -> ApiResponse<serde_json::Value> {
    let id = match uuid::Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的质检任务ID"),
    };

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims, txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[qms] 质检任务详情读取作用域创建失败: {}", e);
            return ApiResponse::server_error("获取质检任务详情失败");
        }
    };

    let row = sqlx::query_as::<_, QualityTask>(only_own_schema_query!(
        "qms",
        r#"
        SELECT id::TEXT,
               inspection_no,
               inspection_type,
               product_name,
               quantity::TEXT,
               qualified_quantity::TEXT,
               unqualified_quantity::TEXT,
               qualification_rate::TEXT,
               status,
               inspector,
               assignee,
               inspected_at,
               result,
               created_at,
               COALESCE(tenant_id::TEXT, '00000000-0000-0000-0000-000000000001') AS tenant_id
        FROM qms.qa_quality_inspections
        WHERE id = $1 AND deleted_at IS NULL
    "#
    ))
    .bind(id)
    .fetch_optional(&mut scope)
    .await;

    match row {
        Ok(Some(task)) => ApiResponse::success(
            serde_json::to_value(task).unwrap_or(serde_json::json!({})),
            "获取质检任务详情成功",
        ),
        Ok(None) => ApiResponse::not_found("质检任务不存在"),
        Err(e) => {
            tracing::error!("quality-task get 失败: {}", e);
            ApiResponse::server_error("获取质检任务详情失败")
        }
    }
}

/// PUT /quality-tasks/{id}/status —— 更新质检任务状态
pub async fn update_quality_task_status(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Path(id): Path<String>,
    Json(req): Json<QualityTaskStatusRequest>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let id = match uuid::Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的质检任务ID"),
    };
    if req.status.is_empty() {
        return ApiResponse::bad_request("状态不能为空");
    }

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启质检任务状态更新事务失败: {}", e);
            return ApiResponse::server_error("更新质检任务状态失败");
        }
    };

    let updated = sqlx::query(only_own_schema_query!(
        "qms",
        r#"
        UPDATE qms.qa_quality_inspections
        SET status = $1, updated_at = NOW()
        WHERE id = $2 AND tenant_id = $3 AND deleted_at IS NULL
    "#
    ))
    .bind(&req.status)
    .bind(id)
    .bind(tenant_id)
    .execute(&mut scope)
    .await;

    match updated {
        Ok(r) if r.rows_affected() == 0 => ApiResponse::conflict("质检任务不存在或状态已变更"),
        Ok(_) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交质检任务状态事务失败: {}", e);
                return ApiResponse::server_error("更新质检任务状态失败");
            }
            ApiResponse::success(
                serde_json::json!({ "id": id, "status": req.status }),
                "更新质检任务状态成功",
            )
        }
        Err(e) => {
            tracing::error!("quality-task status 更新失败: {}", e);
            ApiResponse::server_error("更新质检任务状态失败")
        }
    }
}

/// GET /defect-records —— 缺陷记录列表（数据源 qa_inspection_results，未合格项）
#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:quality_task:read"])),
    path = "/defect-records",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "QMS/quality_task"
)]
pub async fn list_defect_records(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    _headers: axum::http::HeaderMap,
    Query(query): Query<DefectRecordQuery>,
) -> ApiResponse<serde_json::Value> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(10).clamp(1, 100);
    let offset = (page - 1) * page_size;

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims, txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[qms] 缺陷记录读取作用域创建失败: {}", e);
            return ApiResponse::server_error("获取缺陷记录列表失败");
        }
    };

    let total: i64 = match sqlx::query_scalar(only_own_schema_query!(
        "qms",
        r#"
        SELECT COUNT(*) FROM qms.qa_inspection_results
        WHERE deleted_at IS NULL AND is_qualified = false
    "#
    ))
    .fetch_one(&mut scope)
    .await
    {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("defect-records count 失败: {}", e);
            return ApiResponse::server_error("获取缺陷记录列表失败");
        }
    };

    let items = match sqlx::query_as::<_, DefectRecord>(only_own_schema_query!(
        "qms",
        r#"
        SELECT id::TEXT,
               inspection_id::TEXT,
               item_name,
               standard_value,
               measured_value,
               is_qualified,
               remark,
               created_at,
               COALESCE(tenant_id::TEXT, '00000000-0000-0000-0000-000000000001') AS tenant_id
        FROM qms.qa_inspection_results
        WHERE deleted_at IS NULL AND is_qualified = false
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
    "#
    ))
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut scope)
    .await
    {
        Ok(rows) => rows,
        Err(e) => {
            tracing::error!("defect-records list 失败: {}", e);
            return ApiResponse::server_error("获取缺陷记录列表失败");
        }
    };

    ApiResponse::success(
        serde_json::json!({ "items": items, "total": total, "page": page, "page_size": page_size }),
        "获取缺陷记录列表成功",
    )
}

/// POST /defect-records —— 上报缺陷记录
pub async fn report_defect(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<ReportDefectRequest>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    if req.item_name.is_empty() {
        return ApiResponse::bad_request("缺陷项目名称不能为空");
    }
    // inspection_id 必填且必须同租户，禁止 nil 兜底。
    let inspection_id = match req.inspection_id.as_deref() {
        Some(s) => match uuid::Uuid::parse_str(s) {
            Ok(u) => u,
            Err(_) => return ApiResponse::bad_request("无效的检查ID"),
        },
        None => return ApiResponse::bad_request("检查ID不能为空"),
    };

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启缺陷记录创建事务失败: {}", e);
            return ApiResponse::server_error("上报缺陷记录失败");
        }
    };

    // 同域引用校验：检验单必须存在且同租户。
    match sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "qms",
        "SELECT COUNT(*) FROM qms.qa_quality_inspections WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL"
    ))
    .bind(inspection_id)
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await
    {
        Ok(0) => return ApiResponse::bad_request("检查不存在或不属于当前租户"),
        Ok(_) => {}
        Err(e) => {
            tracing::error!("Failed to validate inspection: {}", e);
            return ApiResponse::server_error("上报缺陷记录失败");
        }
    }

    let inserted = sqlx::query_as::<_, DefectRecord>(only_own_schema_query!("qms", r#"
        INSERT INTO qms.qa_inspection_results (
            id, inspection_id, item_name, standard_value, measured_value, is_qualified, remark, tenant_id, created_at
        ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, false, $5, $6, NOW()
        )
        RETURNING id::TEXT, inspection_id::TEXT, item_name, standard_value, measured_value,
                  is_qualified, remark, created_at,
                  COALESCE(tenant_id::TEXT, '00000000-0000-0000-0000-000000000001') AS tenant_id
    "#))
    .bind(inspection_id)
    .bind(&req.item_name)
    .bind(req.standard_value.as_deref())
    .bind(req.measured_value.as_deref())
    .bind(req.remark.as_deref())
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await;

    match inserted {
        Ok(record) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交缺陷记录事务失败: {}", e);
                return ApiResponse::server_error("上报缺陷记录失败");
            }
            ApiResponse::success(
                serde_json::to_value(record).unwrap_or(serde_json::json!({})),
                "上报缺陷记录成功",
            )
        }
        Err(e) => {
            tracing::error!("defect-record 创建失败: {}", e);
            ApiResponse::server_error("上报缺陷记录失败")
        }
    }
}

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/quality-tasks", get(list_quality_tasks))
        .route("/quality-tasks/{id}", get(get_quality_task))
        .route(
            "/quality-tasks/{id}/status",
            put(update_quality_task_status),
        )
        .route("/defect-records", get(list_defect_records))
        .route("/defect-records", post(report_defect))
}

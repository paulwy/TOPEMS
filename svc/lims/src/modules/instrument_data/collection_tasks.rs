use axum::{extract::State, Extension, Json};
use sqlx::types::Uuid;
use sqlx::Row;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_auth::middleware::tenant::TenantContext;
use topems_shared_core::locale::Locale;
use topems_shared_core::response::ApiResponse;

use super::models::{
    CollectionTask, CollectionTaskQuery, CreateCollectionTaskRequest, InstrumentData,
    UpdateCollectionTaskRequest,
};

#[utoipa::path(
    post,
    security(("BearerAuth" = ["lims:instrument_data/collection_tasks:write"])),
    path = "/collection-tasks/{id}/trigger",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "instrument_data/collection_tasks"
)]
pub async fn trigger_collection(
    State(state): State<crate::shared::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(ctx): Extension<TenantContext>,
    axum::extract::Path(task_id): axum::extract::Path<String>,
) -> ApiResponse<InstrumentData> {
    let task_id = match Uuid::parse_str(&task_id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的任务ID"),
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
            tracing::error!("[lims] 采集触发写作用域创建失败: {}", e);
            return ApiResponse::server_error("触发数据采集失败");
        }
    };

    let task_row = sqlx::query(
        "SELECT id::TEXT, task_no, task_name, instrument_id::TEXT, protocol FROM lims.qa_lims_collection_tasks WHERE deleted_at IS NULL AND id = $1",
    )
    .bind(task_id)
    .fetch_optional(&mut scope)
    .await;

    let (instrument_id, protocol, task_no) = match task_row {
        Ok(Some(row)) => (
            row.get::<Option<Uuid>, _>("instrument_id"),
            row.get::<String, _>("protocol"),
            row.get::<String, _>("task_no"),
        ),
        Ok(None) => return ApiResponse::not_found("采集任务不存在"),
        Err(e) => {
            tracing::error!("Failed to fetch collection task: {}", e);
            return ApiResponse::server_error("获取采集任务失败");
        }
    };

    let data_id = Uuid::new_v4();
    let data_no = format!("ID-{}", chrono::Utc::now().format("%Y%m%d%H%M%S"));
    let batch_no = format!(
        "BATCH-{}",
        uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
    );

    let sample_raw_data = serde_json::json!({
        "test_items": [
            {
                "test_item": "GLU",
                "test_item_name": "葡萄糖",
                "result": "5.6",
                "numeric_result": 5.6,
                "unit": "mmol/L",
                "reference_range": "3.9-6.1",
                "abnormal_flag": null
            },
            {
                "test_item": "CHO",
                "test_item_name": "胆固醇",
                "result": "5.2",
                "numeric_result": 5.2,
                "unit": "mmol/L",
                "reference_range": "2.8-5.2",
                "abnormal_flag": null
            },
            {
                "test_item": "TG",
                "test_item_name": "甘油三酯",
                "result": "1.8",
                "numeric_result": 1.8,
                "unit": "mmol/L",
                "reference_range": "0.4-1.7",
                "abnormal_flag": "H"
            }
        ],
        "sample_id": "SAMPLE-001",
        "patient_id": "P-0001",
        "instrument_id": instrument_id.map(|id| id.to_string()),
        "task_no": task_no
    });

    let row = sqlx::query(
        r#"
        INSERT INTO lims.qa_lims_instrument_data
            (id, data_no, instrument_id, batch_no, protocol, raw_data, status, collected_at, created_by, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, 'collected', NOW(), 'system', $7)
        RETURNING id::TEXT, data_no, instrument_id::TEXT, batch_no, protocol,
                  raw_data, parsed_data, status, quality_score,
                  error_msg, collected_at, parsed_at,
                  created_by, created_at, updated_at, tenant_id
        "#,
    )
    .bind(data_id)
    .bind(&data_no)
    .bind(instrument_id)
    .bind(&batch_no)
    .bind(&protocol)
    .bind(&sample_raw_data)
    .bind(ctx.tenant_id)
    .fetch_one(&mut scope)
    .await;

    match row {
        Ok(r) => {
            let _ = sqlx::query(
                r#"
                UPDATE lims.qa_lims_collection_tasks 
                SET last_run_at = NOW(),
                    total_collections = total_collections + 1,
                    success_count = success_count + 1,
                    updated_at = NOW()
                WHERE id = $1
                "#,
            )
            .bind(task_id)
            .execute(&mut scope)
            .await;

            if let Err(e) = scope.commit().await {
                tracing::error!("[lims] 采集触发事务提交失败: {}", e);
                return ApiResponse::server_error("触发数据采集失败");
            }

            ApiResponse::success(
                InstrumentData {
                    id: r.get("id"),
                    tenant_id: r.get("tenant_id"),
                    data_no: r.get("data_no"),
                    instrument_id: r.get("instrument_id"),
                    instrument_no: None,
                    instrument_name: None,
                    batch_no: r.get("batch_no"),
                    protocol: r.get("protocol"),
                    raw_data: r.get("raw_data"),
                    parsed_data: r.get("parsed_data"),
                    status: r.get("status"),
                    quality_score: r.get("quality_score"),
                    error_msg: r.get("error_msg"),
                    collected_at: r.get("collected_at"),
                    parsed_at: r.get("parsed_at"),
                    created_by: r.get("created_by"),
                    created_at: r.get("created_at"),
                    updated_at: r.get("updated_at"),
                },
                "数据采集触发成功",
            )
        }
        Err(e) => {
            tracing::error!("Failed to trigger collection: {}", e);
            ApiResponse::server_error("触发数据采集失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["lims:instrument_data/collection_tasks:read"])),
    path = "/collection-tasks",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "instrument_data/collection_tasks"
)]
pub async fn list_collection_tasks(
    State(state): State<crate::shared::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    axum::extract::Query(query): axum::extract::Query<CollectionTaskQuery>,
    headers: axum::http::HeaderMap,
) -> ApiResponse<Vec<CollectionTask>> {
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;
    let locale = Locale::from_headers(&headers).as_sql();

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[lims] 采集任务列表读作用域创建失败: {}", e);
            return ApiResponse::server_error("获取采集任务列表失败");
        }
    };

    let sql = match query.status.as_ref() {
        Some(_) => {
            "SELECT t.id::TEXT, t.task_no, t.task_name, t.instrument_id::TEXT, t.protocol, \
             t.collection_mode, t.cron_expression, t.interval_minutes, \
             t.parse_rule_id::TEXT, t.status, t.last_run_at, t.next_run_at, \
             t.total_collections, t.success_count, t.failed_count, \
             t.created_by, t.created_at, t.updated_at, t.tenant_id::TEXT, \
             i.instrument_no, CASE WHEN $4 = 'en' THEN COALESCE(i.name_en, i.name) ELSE i.name END as instrument_name \
             FROM lims.qa_lims_collection_tasks t \
             LEFT JOIN lims.qa_lab_instruments i ON t.instrument_id = i.id \
             WHERE t.status = $1 \
             ORDER BY t.created_at DESC LIMIT $2 OFFSET $3"
        }
        None => {
            "SELECT t.id::TEXT, t.task_no, t.task_name, t.instrument_id::TEXT, t.protocol, \
             t.collection_mode, t.cron_expression, t.interval_minutes, \
             t.parse_rule_id::TEXT, t.status, t.last_run_at, t.next_run_at, \
             t.total_collections, t.success_count, t.failed_count, \
             t.created_by, t.created_at, t.updated_at, t.tenant_id::TEXT, \
             i.instrument_no, CASE WHEN $3 = 'en' THEN COALESCE(i.name_en, i.name) ELSE i.name END as instrument_name \
             FROM lims.qa_lims_collection_tasks t \
             LEFT JOIN lims.qa_lab_instruments i ON t.instrument_id = i.id \
             ORDER BY t.created_at DESC LIMIT $1 OFFSET $2"
        }
    };

    let mut query_builder = sqlx::query(sqlx::AssertSqlSafe(sql));
    match query.status.as_ref() {
        Some(status) => {
            query_builder = query_builder
                .bind(status)
                .bind(page_size)
                .bind(offset)
                .bind(locale);
        }
        None => {
            query_builder = query_builder.bind(page_size).bind(offset).bind(locale);
        }
    }

    let tasks = query_builder.fetch_all(&mut scope).await.map(|rows| {
        rows.into_iter()
            .map(|row| CollectionTask {
                id: row.get("id"),
                tenant_id: row.get("tenant_id"),
                task_no: row.get("task_no"),
                task_name: row.get("task_name"),
                instrument_id: row.get("instrument_id"),
                instrument_no: row.get("instrument_no"),
                instrument_name: row.get("instrument_name"),
                protocol: row.get("protocol"),
                collection_mode: row.get("collection_mode"),
                cron_expression: row.get("cron_expression"),
                interval_minutes: row.get("interval_minutes"),
                parse_rule_id: row.get("parse_rule_id"),
                status: row.get("status"),
                last_run_at: row.get("last_run_at"),
                next_run_at: row.get("next_run_at"),
                total_collections: row.get("total_collections"),
                success_count: row.get("success_count"),
                failed_count: row.get("failed_count"),
                created_by: row.get("created_by"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            })
            .collect()
    });

    let _ = scope.commit().await;

    match tasks {
        Ok(data) => ApiResponse::success(data, "获取采集任务列表成功"),
        Err(e) => {
            tracing::error!("Failed to fetch collection tasks: {}", e);
            ApiResponse::server_error("获取采集任务列表失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["lims:instrument_data/collection_tasks:read"])),
    path = "/collection-tasks/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "instrument_data/collection_tasks"
)]
pub async fn get_collection_task(
    State(state): State<crate::shared::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    axum::extract::Path(id): axum::extract::Path<String>,
    headers: axum::http::HeaderMap,
) -> ApiResponse<CollectionTask> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的任务ID"),
    };
    let locale = Locale::from_headers(&headers).as_sql();

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[lims] 采集任务详情读作用域创建失败: {}", e);
            return ApiResponse::server_error("获取采集任务失败");
        }
    };

    let row = sqlx::query(
        r#"
        SELECT t.id::TEXT, t.task_no, t.task_name, t.instrument_id::TEXT, t.protocol,
               t.collection_mode, t.cron_expression, t.interval_minutes,
               t.parse_rule_id::TEXT, t.status, t.last_run_at, t.next_run_at,
               t.total_collections, t.success_count, t.failed_count,
               t.created_by, t.created_at, t.updated_at, t.tenant_id::TEXT,
               i.instrument_no, CASE WHEN $2 = 'en' THEN COALESCE(i.name_en, i.name) ELSE i.name END as instrument_name
        FROM lims.qa_lims_collection_tasks t
        LEFT JOIN lims.qa_lab_instruments i ON t.instrument_id = i.id
        WHERE t.id = $1
        "#,
    )
    .bind(id)
    .bind(locale)
    .fetch_optional(&mut scope)
    .await;

    let _ = scope.commit().await;

    match row {
        Ok(Some(r)) => ApiResponse::success(
            CollectionTask {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                task_no: r.get("task_no"),
                task_name: r.get("task_name"),
                instrument_id: r.get("instrument_id"),
                instrument_no: r.get("instrument_no"),
                instrument_name: r.get("instrument_name"),
                protocol: r.get("protocol"),
                collection_mode: r.get("collection_mode"),
                cron_expression: r.get("cron_expression"),
                interval_minutes: r.get("interval_minutes"),
                parse_rule_id: r.get("parse_rule_id"),
                status: r.get("status"),
                last_run_at: r.get("last_run_at"),
                next_run_at: r.get("next_run_at"),
                total_collections: r.get("total_collections"),
                success_count: r.get("success_count"),
                failed_count: r.get("failed_count"),
                created_by: r.get("created_by"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            },
            "获取采集任务成功",
        ),
        Ok(None) => ApiResponse::not_found("采集任务不存在"),
        Err(e) => {
            tracing::error!("Failed to fetch collection task: {}", e);
            ApiResponse::server_error("获取采集任务失败")
        }
    }
}

#[utoipa::path(

    post,

    security(("BearerAuth" = [])),

    path = "/api/lims/collection-tasks",

    responses(

        (status = 200, description = "OK", body = serde_json::Value),

        (status = 500, description = "Internal server error")

    ),

    tag = "LIMS"

)]

pub async fn create_collection_task(
    State(state): State<crate::shared::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(ctx): Extension<TenantContext>,
    Json(req): Json<CreateCollectionTaskRequest>,
) -> ApiResponse<CollectionTask> {
    let task_id = Uuid::new_v4();
    let task_no = format!("CT-{}", chrono::Utc::now().format("%Y%m%d%H%M%S"));

    let instrument_uuid = match &req.instrument_id {
        Some(id) => match Uuid::parse_str(id) {
            Ok(u) => Some(u),
            Err(_) => return ApiResponse::bad_request("无效的仪器ID"),
        },
        None => None,
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
            tracing::error!("[lims] 采集任务创建写作用域创建失败: {}", e);
            return ApiResponse::server_error("创建采集任务失败");
        }
    };

    let row = sqlx::query(
        r#"
        INSERT INTO lims.qa_lims_collection_tasks
            (id, task_no, task_name, instrument_id, protocol, collection_mode,
             cron_expression, interval_minutes, parse_rule_id, status, created_by, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', 'system', $10)
        RETURNING id::TEXT, task_no, task_name, instrument_id::TEXT, protocol,
                  collection_mode, cron_expression, interval_minutes,
                  parse_rule_id::TEXT, status, last_run_at, next_run_at,
                  total_collections, success_count, failed_count,
                  created_by, created_at, updated_at, tenant_id::TEXT
        "#,
    )
    .bind(task_id)
    .bind(&task_no)
    .bind(&req.task_name)
    .bind(instrument_uuid)
    .bind(&req.protocol)
    .bind(&req.collection_mode)
    .bind(&req.cron_expression)
    .bind(req.interval_minutes)
    .bind(&req.parse_rule_id)
    .bind(ctx.tenant_id)
    .fetch_one(&mut scope)
    .await;

    match row {
        Ok(r) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("[lims] 采集任务创建事务提交失败: {}", e);
                return ApiResponse::server_error("创建采集任务失败");
            }
            ApiResponse::success(
                CollectionTask {
                    id: r.get("id"),
                    tenant_id: r.get("tenant_id"),
                    task_no: r.get("task_no"),
                    task_name: r.get("task_name"),
                    instrument_id: r.get("instrument_id"),
                    instrument_no: None,
                    instrument_name: None,
                    protocol: r.get("protocol"),
                    collection_mode: r.get("collection_mode"),
                    cron_expression: r.get("cron_expression"),
                    interval_minutes: r.get("interval_minutes"),
                    parse_rule_id: r.get("parse_rule_id"),
                    status: r.get("status"),
                    last_run_at: r.get("last_run_at"),
                    next_run_at: r.get("next_run_at"),
                    total_collections: r.get("total_collections"),
                    success_count: r.get("success_count"),
                    failed_count: r.get("failed_count"),
                    created_by: r.get("created_by"),
                    created_at: r.get("created_at"),
                    updated_at: r.get("updated_at"),
                },
                "采集任务创建成功",
            )
        }
        Err(e) => {
            tracing::error!("Failed to create collection task: {}", e);
            ApiResponse::server_error("创建采集任务失败")
        }
    }
}

#[utoipa::path(

    put,

    security(("BearerAuth" = [])),

    path = "/api/lims/collection-tasks/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses(

        (status = 200, description = "OK", body = serde_json::Value),

        (status = 500, description = "Internal server error")

    ),

    tag = "LIMS"

)]

pub async fn update_collection_task(
    State(state): State<crate::shared::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateCollectionTaskRequest>,
) -> ApiResponse<CollectionTask> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的任务ID"),
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
            tracing::error!("[lims] 采集任务更新写作用域创建失败: {}", e);
            return ApiResponse::server_error("更新采集任务失败");
        }
    };

    let row = sqlx::query(
        r#"
        UPDATE lims.qa_lims_collection_tasks 
        SET task_name = COALESCE($2, task_name),
            status = COALESCE($3, status),
            cron_expression = COALESCE($4, cron_expression),
            interval_minutes = COALESCE($5, interval_minutes),
            parse_rule_id = COALESCE($6::uuid, parse_rule_id),
            updated_at = NOW()
        WHERE id = $1
        RETURNING id::TEXT, task_no, task_name, instrument_id::TEXT, protocol,
                  collection_mode, cron_expression, interval_minutes,
                  parse_rule_id::TEXT, status, last_run_at, next_run_at,
                  total_collections, success_count, failed_count,
                  created_by, created_at, updated_at, tenant_id::TEXT
        "#,
    )
    .bind(id)
    .bind(&req.task_name)
    .bind(&req.status)
    .bind(&req.cron_expression)
    .bind(req.interval_minutes)
    .bind(&req.parse_rule_id)
    .fetch_optional(&mut scope)
    .await;

    match row {
        Ok(Some(r)) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("[lims] 采集任务更新事务提交失败: {}", e);
                return ApiResponse::server_error("更新采集任务失败");
            }
            ApiResponse::success(
                CollectionTask {
                    id: r.get("id"),
                    tenant_id: r.get("tenant_id"),
                    task_no: r.get("task_no"),
                    task_name: r.get("task_name"),
                    instrument_id: r.get("instrument_id"),
                    instrument_no: None,
                    instrument_name: None,
                    protocol: r.get("protocol"),
                    collection_mode: r.get("collection_mode"),
                    cron_expression: r.get("cron_expression"),
                    interval_minutes: r.get("interval_minutes"),
                    parse_rule_id: r.get("parse_rule_id"),
                    status: r.get("status"),
                    last_run_at: r.get("last_run_at"),
                    next_run_at: r.get("next_run_at"),
                    total_collections: r.get("total_collections"),
                    success_count: r.get("success_count"),
                    failed_count: r.get("failed_count"),
                    created_by: r.get("created_by"),
                    created_at: r.get("created_at"),
                    updated_at: r.get("updated_at"),
                },
                "采集任务更新成功",
            )
        }
        Ok(None) => ApiResponse::not_found("采集任务不存在"),
        Err(e) => {
            tracing::error!("Failed to update collection task: {}", e);
            ApiResponse::server_error("更新采集任务失败")
        }
    }
}

#[utoipa::path(

    delete,

    security(("BearerAuth" = [])),

    path = "/api/lims/collection-tasks/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses(

        (status = 200, description = "OK", body = serde_json::Value),

        (status = 500, description = "Internal server error")

    ),

    tag = "LIMS"

)]

pub async fn delete_collection_task(
    State(state): State<crate::shared::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<bool> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的任务ID"),
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
            tracing::error!("[lims] 采集任务删除写作用域创建失败: {}", e);
            return ApiResponse::server_error("删除采集任务失败");
        }
    };

    let result =
        sqlx::query("UPDATE lims.qa_lims_collection_tasks SET deleted_at = NOW() WHERE id = $1")
            .bind(id)
            .execute(&mut scope)
            .await;

    match result {
        Ok(_) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("[lims] 采集任务删除事务提交失败: {}", e);
                return ApiResponse::server_error("删除采集任务失败");
            }
            ApiResponse::success(true, "采集任务删除成功")
        }
        Err(e) => {
            tracing::error!("Failed to delete collection task: {}", e);
            ApiResponse::server_error("删除采集任务失败")
        }
    }
}

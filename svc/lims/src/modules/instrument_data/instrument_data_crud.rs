use axum::{extract::State, http::HeaderMap, Extension, Json};
use sqlx::{types::Uuid, Postgres, QueryBuilder, Row};
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_auth::middleware::tenant::TenantContext;
use topems_shared_core::locale::Locale;
use topems_shared_core::response::ApiResponse;

use super::models::{
    CreateInstrumentDataRequest, InstrumentData, InstrumentDataQuery, UpdateInstrumentDataRequest,
};

#[utoipa::path(
    get,
    security(("BearerAuth" = ["lims:instrument_data/instrument_data_crud:read"])),
    path = "/instrument-data",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "instrument_data/instrument_data_crud"
)]
pub async fn list_instrument_data(
    State(state): State<crate::shared::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    axum::extract::Query(query): axum::extract::Query<InstrumentDataQuery>,
    headers: HeaderMap,
) -> ApiResponse<Vec<InstrumentData>> {
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
            tracing::error!("[lims] 仪器数据列表读作用域创建失败: {}", e);
            return ApiResponse::server_error("获取仪器数据列表失败");
        }
    };
    let mut query_builder = QueryBuilder::<Postgres>::new(
        r#"
        SELECT d.id::TEXT, d.data_no, d.instrument_id::TEXT, d.batch_no, d.protocol,
               d.raw_data, d.parsed_data, d.status, d.quality_score::FLOAT8,
               d.error_msg, d.collected_at, d.parsed_at,
               d.created_by, d.created_at, d.updated_at,
               i.instrument_no, CASE WHEN
        "#,
    );
    query_builder.push_bind(locale);
    query_builder.push(
        r#" = 'en' THEN COALESCE(i.name_en, i.name) ELSE i.name END AS instrument_name,
        d.tenant_id::TEXT
        FROM lims.qa_lims_instrument_data d
        LEFT JOIN lims.qa_lab_instruments i ON d.instrument_id = i.id
        WHERE 1=1
        "#,
    );

    if let Some(status) = &query.status {
        query_builder.push(" AND d.status = ");
        query_builder.push_bind(status);
    }

    if let Some(instrument_id) = &query.instrument_id {
        query_builder.push(" AND d.instrument_id = ");
        query_builder.push_bind(instrument_id);
    }

    if let Some(protocol) = &query.protocol {
        query_builder.push(" AND d.protocol = ");
        query_builder.push_bind(protocol);
    }

    query_builder.push(" ORDER BY d.created_at DESC LIMIT ");
    query_builder.push_bind(page_size);
    query_builder.push(" OFFSET ");
    query_builder.push_bind(offset);

    let data = query_builder
        .build()
        .fetch_all(&mut scope)
        .await
        .map(|rows| {
            rows.into_iter()
                .map(|row| InstrumentData {
                    id: row.get("id"),
                    tenant_id: row.get("tenant_id"),
                    data_no: row.get("data_no"),
                    instrument_id: row.get("instrument_id"),
                    instrument_no: row.get("instrument_no"),
                    instrument_name: row.get("instrument_name"),
                    batch_no: row.get("batch_no"),
                    protocol: row.get("protocol"),
                    raw_data: row.get("raw_data"),
                    parsed_data: row.get("parsed_data"),
                    status: row.get("status"),
                    quality_score: row.get("quality_score"),
                    error_msg: row.get("error_msg"),
                    collected_at: row.get("collected_at"),
                    parsed_at: row.get("parsed_at"),
                    created_by: row.get("created_by"),
                    created_at: row.get("created_at"),
                    updated_at: row.get("updated_at"),
                })
                .collect()
        });

    let _ = scope.commit().await;

    match data {
        Ok(data) => ApiResponse::success(data, "获取仪器数据列表成功"),
        Err(e) => {
            tracing::error!("Failed to fetch instrument data: {}", e);
            ApiResponse::server_error("获取仪器数据列表失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["lims:instrument_data/instrument_data_crud:read"])),
    path = "/instrument-data/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "instrument_data/instrument_data_crud"
)]
pub async fn get_instrument_data(
    State(state): State<crate::shared::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    axum::extract::Path(id): axum::extract::Path<String>,
    headers: HeaderMap,
) -> ApiResponse<InstrumentData> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的数据ID"),
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
            tracing::error!("[lims] 仪器数据详情读作用域创建失败: {}", e);
            return ApiResponse::server_error("获取仪器数据失败");
        }
    };
    let row = sqlx::query(
        r#"
        SELECT d.id::TEXT, d.data_no, d.instrument_id::TEXT, d.batch_no, d.protocol,
               d.raw_data, d.parsed_data, d.status, d.quality_score::FLOAT8,
               d.error_msg, d.collected_at, d.parsed_at,
               d.created_by, d.created_at, d.updated_at, d.tenant_id::TEXT,
               i.instrument_no, CASE WHEN $2 = 'en' THEN COALESCE(i.name_en, i.name) ELSE i.name END AS instrument_name
        FROM lims.qa_lims_instrument_data d
        LEFT JOIN lims.qa_lab_instruments i ON d.instrument_id = i.id
        WHERE d.id = $1
        "#,
    )
    .bind(id)
    .bind(locale)
    .fetch_optional(&mut scope)
    .await;

    let _ = scope.commit().await;

    match row {
        Ok(Some(r)) => ApiResponse::success(
            InstrumentData {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                data_no: r.get("data_no"),
                instrument_id: r.get("instrument_id"),
                instrument_no: r.get("instrument_no"),
                instrument_name: r.get("instrument_name"),
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
            "获取仪器数据成功",
        ),
        Ok(None) => ApiResponse::not_found("仪器数据不存在"),
        Err(e) => {
            tracing::error!("Failed to fetch instrument data: {}", e);
            ApiResponse::server_error("获取仪器数据失败")
        }
    }
}

#[utoipa::path(

    post,

    security(("BearerAuth" = [])),

    path = "/api/lims/instrument-data",

    responses(

        (status = 200, description = "OK", body = serde_json::Value),

        (status = 500, description = "Internal server error")

    ),

    tag = "LIMS"

)]

pub async fn create_instrument_data(
    State(state): State<crate::shared::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(ctx): Extension<TenantContext>,
    Json(req): Json<CreateInstrumentDataRequest>,
) -> ApiResponse<InstrumentData> {
    let data_id = Uuid::new_v4();
    let data_no = format!("ID-{}", chrono::Utc::now().format("%Y%m%d%H%M%S"));
    let batch_no = req.batch_no.unwrap_or_else(|| {
        format!(
            "BATCH-{}",
            uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
        )
    });

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
            tracing::error!("[lims] 仪器数据创建写作用域创建失败: {}", e);
            return ApiResponse::server_error("创建仪器数据失败");
        }
    };

    let row = sqlx::query(
        r#"
        INSERT INTO lims.qa_lims_instrument_data
            (id, data_no, instrument_id, batch_no, protocol, raw_data, status, created_by, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, 'pending', 'system', $7)
        RETURNING id::TEXT, data_no, instrument_id::TEXT, batch_no, protocol,
                  raw_data, parsed_data, status, quality_score::FLOAT8,
                  error_msg, collected_at, parsed_at,
                  created_by, created_at, updated_at, tenant_id::TEXT
        "#,
    )
    .bind(data_id)
    .bind(&data_no)
    .bind(instrument_uuid)
    .bind(&batch_no)
    .bind(&req.protocol)
    .bind(&req.raw_data)
    .bind(ctx.tenant_id)
    .fetch_one(&mut scope)
    .await;

    match row {
        Ok(r) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("[lims] 仪器数据创建事务提交失败: {}", e);
                return ApiResponse::server_error("创建仪器数据失败");
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
                "仪器数据创建成功",
            )
        }
        Err(e) => {
            tracing::error!("Failed to create instrument data: {}", e);
            ApiResponse::server_error("创建仪器数据失败")
        }
    }
}

#[utoipa::path(

    put,

    security(("BearerAuth" = [])),

    path = "/api/lims/instrument-data/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses(

        (status = 200, description = "OK", body = serde_json::Value),

        (status = 500, description = "Internal server error")

    ),

    tag = "LIMS"

)]

pub async fn update_instrument_data(
    State(state): State<crate::shared::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateInstrumentDataRequest>,
) -> ApiResponse<InstrumentData> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的数据ID"),
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
            tracing::error!("[lims] 仪器数据更新写作用域创建失败: {}", e);
            return ApiResponse::server_error("更新仪器数据失败");
        }
    };

    let row = sqlx::query(
        r#"
        UPDATE lims.qa_lims_instrument_data 
        SET status = COALESCE($2, status),
            parsed_data = COALESCE($3, parsed_data),
            error_msg = COALESCE($4, error_msg),
            updated_at = NOW()
        WHERE id = $1
        RETURNING id::TEXT, data_no, instrument_id::TEXT, batch_no, protocol,
                  raw_data, parsed_data, status, quality_score::FLOAT8,
                  error_msg, collected_at, parsed_at,
                  created_by, created_at, updated_at, tenant_id::TEXT
        "#,
    )
    .bind(id)
    .bind(&req.status)
    .bind(&req.parsed_data)
    .bind(&req.error_msg)
    .fetch_optional(&mut scope)
    .await;

    match row {
        Ok(Some(r)) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("[lims] 仪器数据更新事务提交失败: {}", e);
                return ApiResponse::server_error("更新仪器数据失败");
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
                "仪器数据更新成功",
            )
        }
        Ok(None) => ApiResponse::not_found("仪器数据不存在"),
        Err(e) => {
            tracing::error!("Failed to update instrument data: {}", e);
            ApiResponse::server_error("更新仪器数据失败")
        }
    }
}

#[utoipa::path(

    delete,

    security(("BearerAuth" = [])),

    path = "/api/lims/instrument-data/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses(

        (status = 200, description = "OK", body = serde_json::Value),

        (status = 500, description = "Internal server error")

    ),

    tag = "LIMS"

)]

pub async fn delete_instrument_data(
    State(state): State<crate::shared::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<bool> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的数据ID"),
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
            tracing::error!("[lims] 仪器数据删除写作用域创建失败: {}", e);
            return ApiResponse::server_error("删除仪器数据失败");
        }
    };

    let result =
        sqlx::query("UPDATE lims.qa_lims_instrument_data SET deleted_at = NOW() WHERE id = $1")
            .bind(id)
            .execute(&mut scope)
            .await;

    match result {
        Ok(_) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("[lims] 仪器数据删除事务提交失败: {}", e);
                return ApiResponse::server_error("删除仪器数据失败");
            }
            ApiResponse::success(true, "仪器数据删除成功")
        }
        Err(e) => {
            tracing::error!("Failed to delete instrument data: {}", e);
            ApiResponse::server_error("删除仪器数据失败")
        }
    }
}

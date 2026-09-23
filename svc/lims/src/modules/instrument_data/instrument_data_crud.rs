use axum::{extract::State, http::HeaderMap, Json};
use sqlx::{types::Uuid, Postgres, QueryBuilder, Row};
use topems_shared_core::locale::Locale;
use topems_shared_core::response::ApiResponse;

use super::models::{
    CreateInstrumentDataRequest, InstrumentData, InstrumentDataQuery, UpdateInstrumentDataRequest,
};

pub async fn list_instrument_data(
    State(state): State<crate::shared::AppState>,
    axum::extract::Query(query): axum::extract::Query<InstrumentDataQuery>,
    headers: HeaderMap,
) -> Json<ApiResponse<Vec<InstrumentData>>> {
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let locale = Locale::from_headers(&headers).as_sql();
    let mut query_builder = QueryBuilder::<Postgres>::new(
        r#"
        SELECT d.id, d.data_no, d.instrument_id, d.batch_no, d.protocol,
               d.raw_data, d.parsed_data, d.status, d.quality_score,
               d.error_msg, d.collected_at::TEXT, d.parsed_at::TEXT,
               d.created_by, d.created_at::TEXT, d.updated_at::TEXT,
               i.instrument_no, CASE WHEN
        "#,
    );
    query_builder.push_bind(locale);
    query_builder.push(
        r#" = 'en' THEN COALESCE(i.name_en, i.name) ELSE i.name END AS instrument_name
        FROM qa_lims_instrument_data d
        LEFT JOIN qa_lab_instruments i ON d.instrument_id = i.id
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
        .fetch_all(&state.pool)
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

    match data {
        Ok(data) => Json(ApiResponse::success(data, "获取仪器数据列表成功")),
        Err(e) => {
            tracing::error!("Failed to fetch instrument data: {}", e);
            Json(ApiResponse::error(500, "获取仪器数据列表失败"))
        }
    }
}

pub async fn get_instrument_data(
    State(state): State<crate::shared::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
    headers: HeaderMap,
) -> Json<ApiResponse<InstrumentData>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的数据ID")),
    };

    let locale = Locale::from_headers(&headers).as_sql();
    let row = sqlx::query(
        r#"
        SELECT d.id, d.data_no, d.instrument_id, d.batch_no, d.protocol,
               d.raw_data, d.parsed_data, d.status, d.quality_score,
               d.error_msg, d.collected_at::TEXT, d.parsed_at::TEXT,
               d.created_by, d.created_at::TEXT, d.updated_at::TEXT,
               i.instrument_no, CASE WHEN $2 = 'en' THEN COALESCE(i.name_en, i.name) ELSE i.name END AS instrument_name
        FROM qa_lims_instrument_data d
        LEFT JOIN qa_lab_instruments i ON d.instrument_id = i.id
        WHERE d.id = $1
        "#,
    )
    .bind(id)
    .bind(locale)
    .fetch_optional(&state.pool)
    .await;

    match row {
        Ok(Some(r)) => Json(ApiResponse::success(
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
        )),
        Ok(None) => Json(ApiResponse::error(404, "仪器数据不存在")),
        Err(e) => {
            tracing::error!("Failed to fetch instrument data: {}", e);
            Json(ApiResponse::error(500, "获取仪器数据失败"))
        }
    }
}

pub async fn create_instrument_data(
    State(state): State<crate::shared::AppState>,
    Json(req): Json<CreateInstrumentDataRequest>,
) -> Json<ApiResponse<InstrumentData>> {
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
            Err(_) => return Json(ApiResponse::error(400, "无效的仪器ID")),
        },
        None => None,
    };

    let row = sqlx::query(
        r#"
        INSERT INTO qa_lims_instrument_data 
            (id, data_no, instrument_id, batch_no, protocol, raw_data, status, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, 'pending', 'system')
        RETURNING id, data_no, instrument_id, batch_no, protocol,
                  raw_data, parsed_data, status, quality_score,
                  error_msg, collected_at::TEXT, parsed_at::TEXT,
                  created_by, created_at::TEXT, updated_at::TEXT
        "#,
    )
    .bind(data_id)
    .bind(&data_no)
    .bind(instrument_uuid)
    .bind(&batch_no)
    .bind(&req.protocol)
    .bind(&req.raw_data)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(
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
        )),
        Err(e) => {
            tracing::error!("Failed to create instrument data: {}", e);
            Json(ApiResponse::error(500, "创建仪器数据失败"))
        }
    }
}

pub async fn update_instrument_data(
    State(state): State<crate::shared::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateInstrumentDataRequest>,
) -> Json<ApiResponse<InstrumentData>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的数据ID")),
    };

    let row = sqlx::query(
        r#"
        UPDATE qa_lims_instrument_data 
        SET status = COALESCE($2, status),
            parsed_data = COALESCE($3, parsed_data),
            error_msg = COALESCE($4, error_msg),
            updated_at = NOW()
        WHERE id = $1
        RETURNING id, data_no, instrument_id, batch_no, protocol,
                  raw_data, parsed_data, status, quality_score,
                  error_msg, collected_at::TEXT, parsed_at::TEXT,
                  created_by, created_at::TEXT, updated_at::TEXT
        "#,
    )
    .bind(id)
    .bind(&req.status)
    .bind(&req.parsed_data)
    .bind(&req.error_msg)
    .fetch_optional(&state.pool)
    .await;

    match row {
        Ok(Some(r)) => Json(ApiResponse::success(
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
        )),
        Ok(None) => Json(ApiResponse::error(404, "仪器数据不存在")),
        Err(e) => {
            tracing::error!("Failed to update instrument data: {}", e);
            Json(ApiResponse::error(500, "更新仪器数据失败"))
        }
    }
}

pub async fn delete_instrument_data(
    State(state): State<crate::shared::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<bool>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的数据ID")),
    };

    let result = sqlx::query("UPDATE qa_lims_instrument_data SET deleted_at = NOW() WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(_) => Json(ApiResponse::success(true, "仪器数据删除成功")),
        Err(e) => {
            tracing::error!("Failed to delete instrument data: {}", e);
            Json(ApiResponse::error(500, "删除仪器数据失败"))
        }
    }
}

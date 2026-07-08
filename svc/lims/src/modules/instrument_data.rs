use axum::{
    extract::State,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, Postgres, QueryBuilder, Row};
use topems_shared::ApiResponse;

use crate::AppState;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/api/lims/instrument-data",
            get(list_instrument_data).post(create_instrument_data),
        )
        .route(
            "/api/lims/instrument-data/{id}",
            get(get_instrument_data)
                .put(update_instrument_data)
                .delete(delete_instrument_data),
        )
        .route(
            "/api/lims/instrument-data/{id}/parse",
            post(parse_instrument_data),
        )
        .route(
            "/api/lims/instrument-data/parse/test",
            post(test_parse_data),
        )
        .route(
            "/api/lims/instrument-data/statistics",
            get(get_instrument_data_statistics),
        )
        .route(
            "/api/lims/collection-tasks",
            get(list_collection_tasks).post(create_collection_task),
        )
        .route(
            "/api/lims/collection-tasks/{id}",
            get(get_collection_task)
                .put(update_collection_task)
                .delete(delete_collection_task),
        )
        .route(
            "/api/lims/collection-tasks/{id}/trigger",
            post(trigger_collection),
        )
        .route(
            "/api/lims/parse-rules",
            get(list_parse_rules).post(create_parse_rule),
        )
        .route(
            "/api/lims/parse-rules/{id}",
            get(get_parse_rule)
                .put(update_parse_rule)
                .delete(delete_parse_rule),
        )
}

// ==================== 数据类型定义 ====================

#[derive(Debug, Deserialize)]
pub struct InstrumentDataQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub instrument_id: Option<String>,
    pub protocol: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct InstrumentData {
    pub id: String,
    pub data_no: String,
    pub instrument_id: Option<String>,
    pub instrument_no: Option<String>,
    pub instrument_name: Option<String>,
    pub batch_no: String,
    pub protocol: String,
    pub raw_data: Option<serde_json::Value>,
    pub parsed_data: Option<serde_json::Value>,
    pub status: String,
    pub quality_score: Option<f64>,
    pub error_msg: Option<String>,
    pub collected_at: Option<String>,
    pub parsed_at: Option<String>,
    pub created_by: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateInstrumentDataRequest {
    pub instrument_id: Option<String>,
    pub protocol: String,
    pub raw_data: serde_json::Value,
    pub batch_no: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateInstrumentDataRequest {
    pub status: Option<String>,
    pub parsed_data: Option<serde_json::Value>,
    pub error_msg: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ParseDataRequest {
    pub protocol: String,
    pub raw_data: serde_json::Value,
    pub parse_rule_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ParseResult {
    pub success: bool,
    pub parsed_data: Option<serde_json::Value>,
    pub quality_score: Option<f64>,
    pub error_msg: Option<String>,
    pub test_items: Option<Vec<TestItemResult>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TestItemResult {
    pub test_item: String,
    pub test_item_name: Option<String>,
    pub result: Option<String>,
    pub numeric_result: Option<f64>,
    pub unit: Option<String>,
    pub reference_range: Option<String>,
    pub status: Option<String>,
    pub abnormal_flag: Option<String>,
}

// ==================== 采集任务类型定义 ====================

#[derive(Debug, Deserialize)]
pub struct CollectionTaskQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub instrument_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct CollectionTask {
    pub id: String,
    pub task_no: String,
    pub task_name: String,
    pub instrument_id: Option<String>,
    pub instrument_no: Option<String>,
    pub instrument_name: Option<String>,
    pub protocol: String,
    pub collection_mode: String,
    pub cron_expression: Option<String>,
    pub interval_minutes: Option<i32>,
    pub parse_rule_id: Option<String>,
    pub status: String,
    pub last_run_at: Option<String>,
    pub next_run_at: Option<String>,
    pub total_collections: i64,
    pub success_count: i64,
    pub failed_count: i64,
    pub created_by: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateCollectionTaskRequest {
    pub task_name: String,
    pub instrument_id: Option<String>,
    pub protocol: String,
    pub collection_mode: String,
    pub cron_expression: Option<String>,
    pub interval_minutes: Option<i32>,
    pub parse_rule_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCollectionTaskRequest {
    pub task_name: Option<String>,
    pub status: Option<String>,
    pub cron_expression: Option<String>,
    pub interval_minutes: Option<i32>,
    pub parse_rule_id: Option<String>,
}

// ==================== 解析规则类型定义 ====================

#[derive(Debug, Deserialize)]
pub struct ParseRuleQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub protocol: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ParseRule {
    pub id: String,
    pub rule_no: String,
    pub rule_name: String,
    pub protocol: String,
    pub instrument_type: Option<String>,
    pub parse_config: Option<serde_json::Value>,
    pub quality_rules: Option<serde_json::Value>,
    pub status: String,
    pub version: String,
    pub description: Option<String>,
    pub created_by: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateParseRuleRequest {
    pub rule_name: String,
    pub protocol: String,
    pub instrument_type: Option<String>,
    pub parse_config: Option<serde_json::Value>,
    pub quality_rules: Option<serde_json::Value>,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateParseRuleRequest {
    pub rule_name: Option<String>,
    pub status: Option<String>,
    pub parse_config: Option<serde_json::Value>,
    pub quality_rules: Option<serde_json::Value>,
    pub description: Option<String>,
}

// ==================== 统计数据类型定义 ====================

#[derive(Debug, Serialize)]
pub struct InstrumentDataStatistics {
    pub total_data_count: i64,
    pub today_count: i64,
    pub success_count: i64,
    pub failed_count: i64,
    pub pending_count: i64,
    pub total_tasks: i64,
    pub running_tasks: i64,
    pub total_rules: i64,
    pub protocol_distribution: Option<Vec<ProtocolStat>>,
    pub instrument_distribution: Option<Vec<InstrumentStat>>,
}

#[derive(Debug, Serialize)]
pub struct ProtocolStat {
    pub protocol: String,
    pub count: i64,
}

#[derive(Debug, Serialize)]
pub struct InstrumentStat {
    pub instrument_id: String,
    pub instrument_name: String,
    pub count: i64,
}

// ==================== 仪器数据 CRUD ====================

pub async fn list_instrument_data(
    State(state): State<crate::AppState>,
    axum::extract::Query(query): axum::extract::Query<InstrumentDataQuery>,
) -> Json<ApiResponse<Vec<InstrumentData>>> {
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let mut query_builder = QueryBuilder::<Postgres>::new(
        r#"
        SELECT d.id, d.data_no, d.instrument_id, d.batch_no, d.protocol,
               d.raw_data, d.parsed_data, d.status, d.quality_score,
               d.error_msg, d.collected_at::TEXT, d.parsed_at::TEXT,
               d.created_by, d.created_at::TEXT, d.updated_at::TEXT,
               i.instrument_no, i.name as instrument_name
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
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<InstrumentData>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的数据ID")),
    };

    let row = sqlx::query(
        r#"
        SELECT d.id, d.data_no, d.instrument_id, d.batch_no, d.protocol,
               d.raw_data, d.parsed_data, d.status, d.quality_score,
               d.error_msg, d.collected_at::TEXT, d.parsed_at::TEXT,
               d.created_by, d.created_at::TEXT, d.updated_at::TEXT,
               i.instrument_no, i.name as instrument_name
        FROM qa_lims_instrument_data d
        LEFT JOIN qa_lab_instruments i ON d.instrument_id = i.id
        WHERE d.id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await;

    match row {
        Ok(Some(r)) => Json(ApiResponse::success(
            InstrumentData {
                id: r.get("id"),
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
    State(state): State<crate::AppState>,
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
    State(state): State<crate::AppState>,
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
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<bool>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的数据ID")),
    };

    let result = sqlx::query("DELETE FROM qa_lims_instrument_data WHERE id = $1")
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

// ==================== 数据解析功能 ====================

pub async fn parse_instrument_data(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<InstrumentData>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的数据ID")),
    };

    let data_row = sqlx::query(
        "SELECT id, data_no, protocol, raw_data FROM qa_lims_instrument_data WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await;

    let (raw_data, protocol) = match data_row {
        Ok(Some(row)) => (
            row.get::<Option<serde_json::Value>, _>("raw_data"),
            row.get::<String, _>("protocol"),
        ),
        Ok(None) => return Json(ApiResponse::error(404, "仪器数据不存在")),
        Err(e) => {
            tracing::error!("Failed to fetch instrument data: {}", e);
            return Json(ApiResponse::error(500, "获取仪器数据失败"));
        }
    };

    let raw_data = match raw_data {
        Some(data) => data,
        None => return Json(ApiResponse::error(400, "原始数据为空，无法解析")),
    };

    let parse_result = parse_data(&protocol, &raw_data);

    let row = sqlx::query(
        r#"
        UPDATE qa_lims_instrument_data 
        SET parsed_data = $2, 
            quality_score = $3,
            status = $4,
            error_msg = $5,
            parsed_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
        RETURNING id, data_no, instrument_id, batch_no, protocol,
                  raw_data, parsed_data, status, quality_score,
                  error_msg, collected_at::TEXT, parsed_at::TEXT,
                  created_by, created_at::TEXT, updated_at::TEXT
        "#,
    )
    .bind(id)
    .bind(&parse_result.parsed_data)
    .bind(parse_result.quality_score)
    .bind(if parse_result.success {
        "parsed"
    } else {
        "parse_failed"
    })
    .bind(&parse_result.error_msg)
    .fetch_optional(&state.pool)
    .await;

    match row {
        Ok(Some(r)) => Json(ApiResponse::success(
            InstrumentData {
                id: r.get("id"),
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
            if parse_result.success {
                "数据解析成功"
            } else {
                "数据解析失败"
            },
        )),
        Ok(None) => Json(ApiResponse::error(404, "仪器数据不存在")),
        Err(e) => {
            tracing::error!("Failed to update parsed data: {}", e);
            Json(ApiResponse::error(500, "解析数据失败"))
        }
    }
}

pub async fn test_parse_data(
    State(_state): State<crate::AppState>,
    Json(req): Json<ParseDataRequest>,
) -> Json<ApiResponse<ParseResult>> {
    let result = parse_data(&req.protocol, &req.raw_data);
    Json(ApiResponse::success(result, "解析测试完成"))
}

fn parse_data(protocol: &str, raw_data: &serde_json::Value) -> ParseResult {
    match protocol.to_lowercase().as_str() {
        "json" => parse_json_data(raw_data),
        "hl7" => parse_hl7_data(raw_data),
        "astm" => parse_astm_data(raw_data),
        _ => ParseResult {
            success: false,
            parsed_data: None,
            quality_score: None,
            error_msg: Some(format!("不支持的协议: {}", protocol)),
            test_items: None,
        },
    }
}

fn parse_json_data(raw_data: &serde_json::Value) -> ParseResult {
    let test_items = extract_test_items_from_json(raw_data);
    let quality_score = calculate_quality_score(&test_items);

    let parsed_data = serde_json::json!({
        "test_items": test_items,
        "metadata": {
            "parse_time": chrono::Utc::now().to_rfc3339(),
            "protocol": "JSON",
            "item_count": test_items.len(),
        }
    });

    ParseResult {
        success: true,
        parsed_data: Some(parsed_data),
        quality_score: Some(quality_score),
        error_msg: None,
        test_items: Some(test_items),
    }
}

fn parse_hl7_data(raw_data: &serde_json::Value) -> ParseResult {
    let test_items = if let Some(segments) = raw_data.get("segments").and_then(|s| s.as_array()) {
        let mut items = Vec::new();
        for seg in segments {
            if let Some(seg_type) = seg.get("type").and_then(|t| t.as_str()) {
                if seg_type == "OBX" {
                    let test_item = seg
                        .get("fields")
                        .and_then(|f| f.get(3))
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string();
                    let result = seg
                        .get("fields")
                        .and_then(|f| f.get(5))
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string());
                    let unit = seg
                        .get("fields")
                        .and_then(|f| f.get(6))
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string());
                    let abnormal_flag = seg
                        .get("fields")
                        .and_then(|f| f.get(8))
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string());
                    let reference_range = seg
                        .get("fields")
                        .and_then(|f| f.get(7))
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string());

                    let numeric_result = result.as_deref().and_then(|s| s.parse::<f64>().ok());

                    items.push(TestItemResult {
                        test_item,
                        test_item_name: None,
                        result: result.clone(),
                        numeric_result,
                        unit,
                        reference_range,
                        status: if abnormal_flag.is_some() {
                            Some("abnormal".to_string())
                        } else {
                            Some("normal".to_string())
                        },
                        abnormal_flag,
                    });
                }
            }
        }
        items
    } else {
        extract_test_items_from_json(raw_data)
    };

    let quality_score = calculate_quality_score(&test_items);

    let parsed_data = serde_json::json!({
        "test_items": test_items,
        "metadata": {
            "parse_time": chrono::Utc::now().to_rfc3339(),
            "protocol": "HL7",
            "item_count": test_items.len(),
        }
    });

    ParseResult {
        success: true,
        parsed_data: Some(parsed_data),
        quality_score: Some(quality_score),
        error_msg: None,
        test_items: Some(test_items),
    }
}

fn parse_astm_data(raw_data: &serde_json::Value) -> ParseResult {
    let test_items = if let Some(records) = raw_data.get("records").and_then(|r| r.as_array()) {
        let mut items = Vec::new();
        for rec in records {
            if let Some(rec_type) = rec.get("type").and_then(|t| t.as_str()) {
                if rec_type == "R" {
                    let test_item = rec
                        .get("fields")
                        .and_then(|f| f.get(2))
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string();
                    let result = rec
                        .get("fields")
                        .and_then(|f| f.get(3))
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string());
                    let unit = rec
                        .get("fields")
                        .and_then(|f| f.get(4))
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string());
                    let reference_range = rec
                        .get("fields")
                        .and_then(|f| f.get(5))
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string());
                    let abnormal_flag = rec
                        .get("fields")
                        .and_then(|f| f.get(6))
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string());

                    let numeric_result = result.as_deref().and_then(|s| s.parse::<f64>().ok());

                    items.push(TestItemResult {
                        test_item,
                        test_item_name: None,
                        result: result.clone(),
                        numeric_result,
                        unit,
                        reference_range,
                        status: if abnormal_flag.is_some() {
                            Some("abnormal".to_string())
                        } else {
                            Some("normal".to_string())
                        },
                        abnormal_flag,
                    });
                }
            }
        }
        items
    } else {
        extract_test_items_from_json(raw_data)
    };

    let quality_score = calculate_quality_score(&test_items);

    let parsed_data = serde_json::json!({
        "test_items": test_items,
        "metadata": {
            "parse_time": chrono::Utc::now().to_rfc3339(),
            "protocol": "ASTM",
            "item_count": test_items.len(),
        }
    });

    ParseResult {
        success: true,
        parsed_data: Some(parsed_data),
        quality_score: Some(quality_score),
        error_msg: None,
        test_items: Some(test_items),
    }
}

fn extract_test_items_from_json(raw_data: &serde_json::Value) -> Vec<TestItemResult> {
    let mut items = Vec::new();

    if let Some(test_items) = raw_data.get("test_items").and_then(|t| t.as_array()) {
        for item in test_items {
            let test_item = item
                .get("test_item")
                .or_else(|| item.get("code"))
                .or_else(|| item.get("name"))
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let result = item
                .get("result")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let numeric_result = item
                .get("numeric_result")
                .or_else(|| item.get("value"))
                .and_then(|v| v.as_f64());
            let unit = item
                .get("unit")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let reference_range = item
                .get("reference_range")
                .or_else(|| item.get("range"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let abnormal_flag = item
                .get("abnormal_flag")
                .or_else(|| item.get("flag"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            items.push(TestItemResult {
                test_item,
                test_item_name: item
                    .get("test_item_name")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string()),
                result: result.clone(),
                numeric_result,
                unit,
                reference_range,
                status: if abnormal_flag.is_some() {
                    Some("abnormal".to_string())
                } else {
                    Some("normal".to_string())
                },
                abnormal_flag,
            });
        }
    } else if let Some(results) = raw_data.get("results").and_then(|r| r.as_object()) {
        for (key, value) in results {
            let numeric_result = value.as_f64();
            let result_str = value.as_str().map(|s| s.to_string());
            items.push(TestItemResult {
                test_item: key.clone(),
                test_item_name: None,
                result: result_str.or_else(|| value.as_str().map(|s| s.to_string())),
                numeric_result,
                unit: None,
                reference_range: None,
                status: Some("normal".to_string()),
                abnormal_flag: None,
            });
        }
    }

    items
}

fn calculate_quality_score(test_items: &[TestItemResult]) -> f64 {
    if test_items.is_empty() {
        return 0.0;
    }

    let mut score = 100.0;
    let mut has_result_count = 0;

    for item in test_items {
        if item.result.is_some() || item.numeric_result.is_some() {
            has_result_count += 1;
        }
    }

    let completeness = has_result_count as f64 / test_items.len() as f64;
    score = score * (0.5 + 0.5 * completeness);

    (score * 100.0).round() / 100.0
}

// ==================== 触发数据采集 ====================

pub async fn trigger_collection(
    State(state): State<crate::AppState>,
    axum::extract::Path(task_id): axum::extract::Path<String>,
) -> Json<ApiResponse<InstrumentData>> {
    let task_id = match Uuid::parse_str(&task_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的任务ID")),
    };

    let task_row = sqlx::query(
        "SELECT id, task_no, task_name, instrument_id, protocol FROM qa_lims_collection_tasks WHERE id = $1",
    )
    .bind(task_id)
    .fetch_optional(&state.pool)
    .await;

    let (instrument_id, protocol, task_no) = match task_row {
        Ok(Some(row)) => (
            row.get::<Option<Uuid>, _>("instrument_id"),
            row.get::<String, _>("protocol"),
            row.get::<String, _>("task_no"),
        ),
        Ok(None) => return Json(ApiResponse::error(404, "采集任务不存在")),
        Err(e) => {
            tracing::error!("Failed to fetch collection task: {}", e);
            return Json(ApiResponse::error(500, "获取采集任务失败"));
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
        INSERT INTO qa_lims_instrument_data 
            (id, data_no, instrument_id, batch_no, protocol, raw_data, status, collected_at, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, 'collected', NOW(), 'system')
        RETURNING id, data_no, instrument_id, batch_no, protocol,
                  raw_data, parsed_data, status, quality_score,
                  error_msg, collected_at::TEXT, parsed_at::TEXT,
                  created_by, created_at::TEXT, updated_at::TEXT
        "#,
    )
    .bind(data_id)
    .bind(&data_no)
    .bind(instrument_id)
    .bind(&batch_no)
    .bind(&protocol)
    .bind(&sample_raw_data)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => {
            let _ = sqlx::query(
                r#"
                UPDATE qa_lims_collection_tasks 
                SET last_run_at = NOW(),
                    total_collections = total_collections + 1,
                    success_count = success_count + 1,
                    updated_at = NOW()
                WHERE id = $1
                "#,
            )
            .bind(task_id)
            .execute(&state.pool)
            .await;

            Json(ApiResponse::success(
                InstrumentData {
                    id: r.get("id"),
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
            ))
        }
        Err(e) => {
            tracing::error!("Failed to trigger collection: {}", e);
            Json(ApiResponse::error(500, "触发数据采集失败"))
        }
    }
}

// ==================== 采集任务 CRUD ====================

pub async fn list_collection_tasks(
    State(state): State<crate::AppState>,
    axum::extract::Query(query): axum::extract::Query<CollectionTaskQuery>,
) -> Json<ApiResponse<Vec<CollectionTask>>> {
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let sql = match query.status.as_ref() {
        Some(_) => {
            "SELECT t.id, t.task_no, t.task_name, t.instrument_id, t.protocol, \
             t.collection_mode, t.cron_expression, t.interval_minutes, \
             t.parse_rule_id, t.status, t.last_run_at::TEXT, t.next_run_at::TEXT, \
             t.total_collections, t.success_count, t.failed_count, \
             t.created_by, t.created_at::TEXT, t.updated_at::TEXT, \
             i.instrument_no, i.name as instrument_name \
             FROM qa_lims_collection_tasks t \
             LEFT JOIN qa_lab_instruments i ON t.instrument_id = i.id \
             WHERE t.status = $1 \
             ORDER BY t.created_at DESC LIMIT $2 OFFSET $3"
        }
        None => {
            "SELECT t.id, t.task_no, t.task_name, t.instrument_id, t.protocol, \
             t.collection_mode, t.cron_expression, t.interval_minutes, \
             t.parse_rule_id, t.status, t.last_run_at::TEXT, t.next_run_at::TEXT, \
             t.total_collections, t.success_count, t.failed_count, \
             t.created_by, t.created_at::TEXT, t.updated_at::TEXT, \
             i.instrument_no, i.name as instrument_name \
             FROM qa_lims_collection_tasks t \
             LEFT JOIN qa_lab_instruments i ON t.instrument_id = i.id \
             ORDER BY t.created_at DESC LIMIT $1 OFFSET $2"
        }
    };

    let mut query_builder = sqlx::query(sql);
    match query.status.as_ref() {
        Some(status) => {
            query_builder = query_builder.bind(status).bind(page_size).bind(offset);
        }
        None => {
            query_builder = query_builder.bind(page_size).bind(offset);
        }
    }

    let tasks = query_builder.fetch_all(&state.pool).await.map(|rows| {
        rows.into_iter()
            .map(|row| CollectionTask {
                id: row.get("id"),
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

    match tasks {
        Ok(data) => Json(ApiResponse::success(data, "获取采集任务列表成功")),
        Err(e) => {
            tracing::error!("Failed to fetch collection tasks: {}", e);
            Json(ApiResponse::error(500, "获取采集任务列表失败"))
        }
    }
}

pub async fn get_collection_task(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<CollectionTask>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的任务ID")),
    };

    let row = sqlx::query(
        r#"
        SELECT t.id, t.task_no, t.task_name, t.instrument_id, t.protocol,
               t.collection_mode, t.cron_expression, t.interval_minutes,
               t.parse_rule_id, t.status, t.last_run_at::TEXT, t.next_run_at::TEXT,
               t.total_collections, t.success_count, t.failed_count,
               t.created_by, t.created_at::TEXT, t.updated_at::TEXT,
               i.instrument_no, i.name as instrument_name
        FROM qa_lims_collection_tasks t
        LEFT JOIN qa_lab_instruments i ON t.instrument_id = i.id
        WHERE t.id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await;

    match row {
        Ok(Some(r)) => Json(ApiResponse::success(
            CollectionTask {
                id: r.get("id"),
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
        )),
        Ok(None) => Json(ApiResponse::error(404, "采集任务不存在")),
        Err(e) => {
            tracing::error!("Failed to fetch collection task: {}", e);
            Json(ApiResponse::error(500, "获取采集任务失败"))
        }
    }
}

pub async fn create_collection_task(
    State(state): State<crate::AppState>,
    Json(req): Json<CreateCollectionTaskRequest>,
) -> Json<ApiResponse<CollectionTask>> {
    let task_id = Uuid::new_v4();
    let task_no = format!("CT-{}", chrono::Utc::now().format("%Y%m%d%H%M%S"));

    let instrument_uuid = match &req.instrument_id {
        Some(id) => match Uuid::parse_str(id) {
            Ok(u) => Some(u),
            Err(_) => return Json(ApiResponse::error(400, "无效的仪器ID")),
        },
        None => None,
    };

    let row = sqlx::query(
        r#"
        INSERT INTO qa_lims_collection_tasks 
            (id, task_no, task_name, instrument_id, protocol, collection_mode,
             cron_expression, interval_minutes, parse_rule_id, status, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', 'system')
        RETURNING id, task_no, task_name, instrument_id, protocol,
                  collection_mode, cron_expression, interval_minutes,
                  parse_rule_id, status, last_run_at::TEXT, next_run_at::TEXT,
                  total_collections, success_count, failed_count,
                  created_by, created_at::TEXT, updated_at::TEXT
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
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(
            CollectionTask {
                id: r.get("id"),
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
        )),
        Err(e) => {
            tracing::error!("Failed to create collection task: {}", e);
            Json(ApiResponse::error(500, "创建采集任务失败"))
        }
    }
}

pub async fn update_collection_task(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateCollectionTaskRequest>,
) -> Json<ApiResponse<CollectionTask>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的任务ID")),
    };

    let row = sqlx::query(
        r#"
        UPDATE qa_lims_collection_tasks 
        SET task_name = COALESCE($2, task_name),
            status = COALESCE($3, status),
            cron_expression = COALESCE($4, cron_expression),
            interval_minutes = COALESCE($5, interval_minutes),
            parse_rule_id = COALESCE($6, parse_rule_id),
            updated_at = NOW()
        WHERE id = $1
        RETURNING id, task_no, task_name, instrument_id, protocol,
                  collection_mode, cron_expression, interval_minutes,
                  parse_rule_id, status, last_run_at::TEXT, next_run_at::TEXT,
                  total_collections, success_count, failed_count,
                  created_by, created_at::TEXT, updated_at::TEXT
        "#,
    )
    .bind(id)
    .bind(&req.task_name)
    .bind(&req.status)
    .bind(&req.cron_expression)
    .bind(req.interval_minutes)
    .bind(&req.parse_rule_id)
    .fetch_optional(&state.pool)
    .await;

    match row {
        Ok(Some(r)) => Json(ApiResponse::success(
            CollectionTask {
                id: r.get("id"),
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
        )),
        Ok(None) => Json(ApiResponse::error(404, "采集任务不存在")),
        Err(e) => {
            tracing::error!("Failed to update collection task: {}", e);
            Json(ApiResponse::error(500, "更新采集任务失败"))
        }
    }
}

pub async fn delete_collection_task(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<bool>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的任务ID")),
    };

    let result = sqlx::query("DELETE FROM qa_lims_collection_tasks WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(_) => Json(ApiResponse::success(true, "采集任务删除成功")),
        Err(e) => {
            tracing::error!("Failed to delete collection task: {}", e);
            Json(ApiResponse::error(500, "删除采集任务失败"))
        }
    }
}

// ==================== 解析规则 CRUD ====================

pub async fn list_parse_rules(
    State(state): State<crate::AppState>,
    axum::extract::Query(query): axum::extract::Query<ParseRuleQuery>,
) -> Json<ApiResponse<Vec<ParseRule>>> {
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let sql = match (query.status.as_ref(), query.protocol.as_ref()) {
        (Some(_), Some(_)) => {
            "SELECT id, rule_no, rule_name, protocol, instrument_type, \
             parse_config, quality_rules, status, version, description, \
             created_by, created_at::TEXT, updated_at::TEXT \
             FROM qa_lims_parse_rules \
             WHERE status = $1 AND protocol = $2 \
             ORDER BY created_at DESC LIMIT $3 OFFSET $4"
        }
        (Some(_), None) => {
            "SELECT id, rule_no, rule_name, protocol, instrument_type, \
             parse_config, quality_rules, status, version, description, \
             created_by, created_at::TEXT, updated_at::TEXT \
             FROM qa_lims_parse_rules \
             WHERE status = $1 \
             ORDER BY created_at DESC LIMIT $2 OFFSET $3"
        }
        (None, Some(_)) => {
            "SELECT id, rule_no, rule_name, protocol, instrument_type, \
             parse_config, quality_rules, status, version, description, \
             created_by, created_at::TEXT, updated_at::TEXT \
             FROM qa_lims_parse_rules \
             WHERE protocol = $1 \
             ORDER BY created_at DESC LIMIT $2 OFFSET $3"
        }
        (None, None) => {
            "SELECT id, rule_no, rule_name, protocol, instrument_type, \
             parse_config, quality_rules, status, version, description, \
             created_by, created_at::TEXT, updated_at::TEXT \
             FROM qa_lims_parse_rules \
             ORDER BY created_at DESC LIMIT $1 OFFSET $2"
        }
    };

    let mut query_builder = sqlx::query(sql);
    match (query.status.as_ref(), query.protocol.as_ref()) {
        (Some(st), Some(pr)) => {
            query_builder = query_builder.bind(st).bind(pr).bind(page_size).bind(offset);
        }
        (Some(st), None) => {
            query_builder = query_builder.bind(st).bind(page_size).bind(offset);
        }
        (None, Some(pr)) => {
            query_builder = query_builder.bind(pr).bind(page_size).bind(offset);
        }
        (None, None) => {
            query_builder = query_builder.bind(page_size).bind(offset);
        }
    }

    let rules = query_builder.fetch_all(&state.pool).await.map(|rows| {
        rows.into_iter()
            .map(|row| ParseRule {
                id: row.get("id"),
                rule_no: row.get("rule_no"),
                rule_name: row.get("rule_name"),
                protocol: row.get("protocol"),
                instrument_type: row.get("instrument_type"),
                parse_config: row.get("parse_config"),
                quality_rules: row.get("quality_rules"),
                status: row.get("status"),
                version: row.get("version"),
                description: row.get("description"),
                created_by: row.get("created_by"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            })
            .collect()
    });

    match rules {
        Ok(data) => Json(ApiResponse::success(data, "获取解析规则列表成功")),
        Err(e) => {
            tracing::error!("Failed to fetch parse rules: {}", e);
            Json(ApiResponse::error(500, "获取解析规则列表失败"))
        }
    }
}

pub async fn get_parse_rule(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<ParseRule>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的规则ID")),
    };

    let row = sqlx::query(
        r#"
        SELECT id, rule_no, rule_name, protocol, instrument_type,
               parse_config, quality_rules, status, version, description,
               created_by, created_at::TEXT, updated_at::TEXT
        FROM qa_lims_parse_rules
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await;

    match row {
        Ok(Some(r)) => Json(ApiResponse::success(
            ParseRule {
                id: r.get("id"),
                rule_no: r.get("rule_no"),
                rule_name: r.get("rule_name"),
                protocol: r.get("protocol"),
                instrument_type: r.get("instrument_type"),
                parse_config: r.get("parse_config"),
                quality_rules: r.get("quality_rules"),
                status: r.get("status"),
                version: r.get("version"),
                description: r.get("description"),
                created_by: r.get("created_by"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            },
            "获取解析规则成功",
        )),
        Ok(None) => Json(ApiResponse::error(404, "解析规则不存在")),
        Err(e) => {
            tracing::error!("Failed to fetch parse rule: {}", e);
            Json(ApiResponse::error(500, "获取解析规则失败"))
        }
    }
}

pub async fn create_parse_rule(
    State(state): State<crate::AppState>,
    Json(req): Json<CreateParseRuleRequest>,
) -> Json<ApiResponse<ParseRule>> {
    let rule_id = Uuid::new_v4();
    let rule_no = format!("PR-{}", chrono::Utc::now().format("%Y%m%d%H%M%S"));

    let row = sqlx::query(
        r#"
        INSERT INTO qa_lims_parse_rules 
            (id, rule_no, rule_name, protocol, instrument_type, 
             parse_config, quality_rules, status, version, description, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', '1.0', $8, 'system')
        RETURNING id, rule_no, rule_name, protocol, instrument_type,
                  parse_config, quality_rules, status, version, description,
                  created_by, created_at::TEXT, updated_at::TEXT
        "#,
    )
    .bind(rule_id)
    .bind(&rule_no)
    .bind(&req.rule_name)
    .bind(&req.protocol)
    .bind(&req.instrument_type)
    .bind(&req.parse_config)
    .bind(&req.quality_rules)
    .bind(&req.description)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(
            ParseRule {
                id: r.get("id"),
                rule_no: r.get("rule_no"),
                rule_name: r.get("rule_name"),
                protocol: r.get("protocol"),
                instrument_type: r.get("instrument_type"),
                parse_config: r.get("parse_config"),
                quality_rules: r.get("quality_rules"),
                status: r.get("status"),
                version: r.get("version"),
                description: r.get("description"),
                created_by: r.get("created_by"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            },
            "解析规则创建成功",
        )),
        Err(e) => {
            tracing::error!("Failed to create parse rule: {}", e);
            Json(ApiResponse::error(500, "创建解析规则失败"))
        }
    }
}

pub async fn update_parse_rule(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateParseRuleRequest>,
) -> Json<ApiResponse<ParseRule>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的规则ID")),
    };

    let row = sqlx::query(
        r#"
        UPDATE qa_lims_parse_rules 
        SET rule_name = COALESCE($2, rule_name),
            status = COALESCE($3, status),
            parse_config = COALESCE($4, parse_config),
            quality_rules = COALESCE($5, quality_rules),
            description = COALESCE($6, description),
            version = (version::numeric + 0.1)::varchar,
            updated_at = NOW()
        WHERE id = $1
        RETURNING id, rule_no, rule_name, protocol, instrument_type,
                  parse_config, quality_rules, status, version, description,
                  created_by, created_at::TEXT, updated_at::TEXT
        "#,
    )
    .bind(id)
    .bind(&req.rule_name)
    .bind(&req.status)
    .bind(&req.parse_config)
    .bind(&req.quality_rules)
    .bind(&req.description)
    .fetch_optional(&state.pool)
    .await;

    match row {
        Ok(Some(r)) => Json(ApiResponse::success(
            ParseRule {
                id: r.get("id"),
                rule_no: r.get("rule_no"),
                rule_name: r.get("rule_name"),
                protocol: r.get("protocol"),
                instrument_type: r.get("instrument_type"),
                parse_config: r.get("parse_config"),
                quality_rules: r.get("quality_rules"),
                status: r.get("status"),
                version: r.get("version"),
                description: r.get("description"),
                created_by: r.get("created_by"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            },
            "解析规则更新成功",
        )),
        Ok(None) => Json(ApiResponse::error(404, "解析规则不存在")),
        Err(e) => {
            tracing::error!("Failed to update parse rule: {}", e);
            Json(ApiResponse::error(500, "更新解析规则失败"))
        }
    }
}

pub async fn delete_parse_rule(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<bool>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的规则ID")),
    };

    let result = sqlx::query("DELETE FROM qa_lims_parse_rules WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(_) => Json(ApiResponse::success(true, "解析规则删除成功")),
        Err(e) => {
            tracing::error!("Failed to delete parse rule: {}", e);
            Json(ApiResponse::error(500, "删除解析规则失败"))
        }
    }
}

// ==================== 统计接口 ====================

pub async fn get_instrument_data_statistics(
    State(state): State<crate::AppState>,
) -> Json<ApiResponse<InstrumentDataStatistics>> {
    let total_data: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM qa_lims_instrument_data")
        .fetch_one(&state.pool)
        .await
        .unwrap_or(0);

    let today_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM qa_lims_instrument_data WHERE created_at >= CURRENT_DATE",
    )
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);

    let success_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM qa_lims_instrument_data WHERE status = 'parsed'")
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);

    let failed_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM qa_lims_instrument_data WHERE status = 'parse_failed'",
    )
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);

    let pending_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM qa_lims_instrument_data WHERE status = 'pending' OR status = 'collected'",
    )
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);

    let total_tasks: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM qa_lims_collection_tasks")
        .fetch_one(&state.pool)
        .await
        .unwrap_or(0);

    let running_tasks: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM qa_lims_collection_tasks WHERE status = 'active'")
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);

    let total_rules: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM qa_lims_parse_rules")
        .fetch_one(&state.pool)
        .await
        .unwrap_or(0);

    let protocol_rows = sqlx::query(
        r#"
        SELECT protocol, COUNT(*) as count 
        FROM qa_lims_instrument_data 
        GROUP BY protocol 
        ORDER BY count DESC
        "#,
    )
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    let protocol_distribution: Vec<ProtocolStat> = protocol_rows
        .into_iter()
        .map(|row| ProtocolStat {
            protocol: row.get("protocol"),
            count: row.get("count"),
        })
        .collect();

    let stats = InstrumentDataStatistics {
        total_data_count: total_data,
        today_count,
        success_count,
        failed_count,
        pending_count,
        total_tasks,
        running_tasks,
        total_rules,
        protocol_distribution: Some(protocol_distribution),
        instrument_distribution: None,
    };

    Json(ApiResponse::success(stats, "获取统计数据成功"))
}

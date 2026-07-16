use axum::{extract::State, Json};
use sqlx::types::Uuid;
use sqlx::Row;
use topems_shared::ApiResponse;

use super::models::{InstrumentData, ParseDataRequest, ParseResult, TestItemResult};

pub async fn parse_instrument_data(
    State(state): State<crate::shared::AppState>,
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
    State(_state): State<crate::shared::AppState>,
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

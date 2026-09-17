use axum::{
    extract::State,
    routing::{delete, get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, Row};
use topems_shared_core::response::ApiResponse;

use crate::shared::AppState;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/barcodes", get(list_barcodes).post(generate_barcode))
        .route(
            "/barcodes/{id}",
            get(get_barcode).put(update_barcode).delete(delete_barcode),
        )
        .route("/barcodes/{id}/print", post(print_barcode))
        .route("/barcodes/scan", post(scan_barcode))
        .route("/barcodes/types", get(get_barcode_types))
        .route("/barcodes/trace/{barcode}", get(trace_sample_by_barcode))
        .route(
            "/print-config",
            get(get_print_config).put(update_print_config),
        )
        .route("/print-config/default", get(get_default_print_config))
        .route("/rfid-tags", get(list_rfid_tags).post(create_rfid_tag))
        .route("/rfid-tags/{id}", delete(delete_rfid_tag))
        .route(
            "/rfid-tags/{tag_id}/assign/{sample_id}",
            post(assign_rfid_tag),
        )
        .route("/rfid-tags/{tag_id}/unassign", post(unassign_rfid_tag))
}

#[derive(Debug, Deserialize)]
pub struct BarcodeQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub barcode_type: Option<String>,
    pub status: Option<String>,
    pub sample_no: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct SampleBarcode {
    pub id: String,
    pub tenant_id: String,
    pub barcode: String,
    pub barcode_type: String,
    pub sample_id: Option<String>,
    pub sample_no: Option<String>,
    pub rfid_tag: Option<String>,
    pub print_count: i32,
    pub status: String,
    pub generated_by: Option<String>,
    pub generated_at: Option<String>,
    pub last_printed_at: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateBarcodeRequest {
    pub barcode_type: String,
    pub sample_id: Option<String>,
    pub count: Option<i32>,
    pub custom_barcode: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateBarcodeRequest {
    pub sample_id: Option<String>,
    pub rfid_tag: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BarcodeScanRequest {
    pub barcode: String,
    pub scan_type: String,
    pub operator: Option<String>,
    pub location: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct BarcodeScanRecord {
    pub id: String,
    pub tenant_id: String,
    pub barcode: String,
    pub scan_type: String,
    pub sample_id: Option<String>,
    pub sample_no: Option<String>,
    pub operator: Option<String>,
    pub location: Option<String>,
    pub notes: Option<String>,
    pub scanned_at: String,
}

#[derive(Debug, Deserialize)]
pub struct RfidTagQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub tag_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct RfidTag {
    pub id: String,
    pub tenant_id: String,
    pub tag_id: String,
    pub tag_type: String,
    pub sample_id: Option<String>,
    pub sample_no: Option<String>,
    pub status: String,
    pub assigned_at: Option<String>,
    pub last_read_at: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateRfidTagRequest {
    pub tag_id: String,
    pub tag_type: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct PrintConfig {
    pub printer_name: Option<String>,
    pub label_size: Option<String>,
    pub barcode_format: Option<String>,
    pub template: Option<String>,
}

const BARCODE_TYPES: &[(&str, &str)] = &[
    ("code128", "Code 128"),
    ("code39", "Code 39"),
    ("qr", "QR Code"),
    ("ean13", "EAN-13"),
    ("upc", "UPC"),
];

pub async fn list_barcodes(
    State(state): State<crate::shared::AppState>,
    axum::extract::Query(query): axum::extract::Query<BarcodeQuery>,
) -> Json<ApiResponse<Vec<SampleBarcode>>> {
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let sql = match (query.barcode_type.as_ref(), query.status.as_ref(), query.sample_no.as_ref()) {
        (Some(_), Some(_), Some(_)) => "SELECT id, barcode, barcode_type, sample_id, sample_no, rfid_tag, print_count, status, generated_by, generated_at::TEXT, last_printed_at::TEXT, created_at::TEXT, updated_at::TEXT FROM qa_lims_sample_barcodes WHERE deleted_at IS NULL AND barcode_type = $1 AND status = $2 AND sample_no LIKE $3 ORDER BY created_at DESC LIMIT $4 OFFSET $5",
        (Some(_), Some(_), None) => "SELECT id, barcode, barcode_type, sample_id, sample_no, rfid_tag, print_count, status, generated_by, generated_at::TEXT, last_printed_at::TEXT, created_at::TEXT, updated_at::TEXT FROM qa_lims_sample_barcodes WHERE deleted_at IS NULL AND barcode_type = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4",
        (Some(_), None, Some(_)) => "SELECT id, barcode, barcode_type, sample_id, sample_no, rfid_tag, print_count, status, generated_by, generated_at::TEXT, last_printed_at::TEXT, created_at::TEXT, updated_at::TEXT FROM qa_lims_sample_barcodes WHERE deleted_at IS NULL AND barcode_type = $1 AND sample_no LIKE $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4",
        (Some(_), None, None) => "SELECT id, barcode, barcode_type, sample_id, sample_no, rfid_tag, print_count, status, generated_by, generated_at::TEXT, last_printed_at::TEXT, created_at::TEXT, updated_at::TEXT FROM qa_lims_sample_barcodes WHERE deleted_at IS NULL AND barcode_type = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
        (None, Some(_), Some(_)) => "SELECT id, barcode, barcode_type, sample_id, sample_no, rfid_tag, print_count, status, generated_by, generated_at::TEXT, last_printed_at::TEXT, created_at::TEXT, updated_at::TEXT FROM qa_lims_sample_barcodes WHERE deleted_at IS NULL AND status = $1 AND sample_no LIKE $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4",
        (None, Some(_), None) => "SELECT id, barcode, barcode_type, sample_id, sample_no, rfid_tag, print_count, status, generated_by, generated_at::TEXT, last_printed_at::TEXT, created_at::TEXT, updated_at::TEXT FROM qa_lims_sample_barcodes WHERE deleted_at IS NULL AND status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
        (None, None, Some(_)) => "SELECT id, barcode, barcode_type, sample_id, sample_no, rfid_tag, print_count, status, generated_by, generated_at::TEXT, last_printed_at::TEXT, created_at::TEXT, updated_at::TEXT FROM qa_lims_sample_barcodes WHERE deleted_at IS NULL AND sample_no LIKE $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
        (None, None, None) => "SELECT id, barcode, barcode_type, sample_id, sample_no, rfid_tag, print_count, status, generated_by, generated_at::TEXT, last_printed_at::TEXT, created_at::TEXT, updated_at::TEXT FROM qa_lims_sample_barcodes ORDER BY created_at DESC LIMIT $1 OFFSET $2",
    };

    let mut query_builder = sqlx::query(sql);
    match (
        query.barcode_type.as_ref(),
        query.status.as_ref(),
        query.sample_no.as_ref(),
    ) {
        (Some(bt), Some(st), Some(sn)) => {
            query_builder = query_builder
                .bind(bt)
                .bind(st)
                .bind(format!("%{}%", sn))
                .bind(page_size)
                .bind(offset);
        }
        (Some(bt), Some(st), None) => {
            query_builder = query_builder.bind(bt).bind(st).bind(page_size).bind(offset);
        }
        (Some(bt), None, Some(sn)) => {
            query_builder = query_builder
                .bind(bt)
                .bind(format!("%{}%", sn))
                .bind(page_size)
                .bind(offset);
        }
        (Some(bt), None, None) => {
            query_builder = query_builder.bind(bt).bind(page_size).bind(offset);
        }
        (None, Some(st), Some(sn)) => {
            query_builder = query_builder
                .bind(st)
                .bind(format!("%{}%", sn))
                .bind(page_size)
                .bind(offset);
        }
        (None, Some(st), None) => {
            query_builder = query_builder.bind(st).bind(page_size).bind(offset);
        }
        (None, None, Some(sn)) => {
            query_builder = query_builder
                .bind(format!("%{}%", sn))
                .bind(page_size)
                .bind(offset);
        }
        (None, None, None) => {
            query_builder = query_builder.bind(page_size).bind(offset);
        }
    }

    let barcodes = query_builder.fetch_all(&state.pool).await.map(|rows| {
        rows.into_iter()
            .map(|row| SampleBarcode {
                id: row.get("id"),
                tenant_id: row.get("tenant_id"),
                barcode: row.get("barcode"),
                barcode_type: row.get("barcode_type"),
                sample_id: row.get("sample_id"),
                sample_no: row.get("sample_no"),
                rfid_tag: row.get("rfid_tag"),
                print_count: row.get("print_count"),
                status: row.get("status"),
                generated_by: row.get("generated_by"),
                generated_at: row.get("generated_at"),
                last_printed_at: row.get("last_printed_at"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            })
            .collect()
    });

    match barcodes {
        Ok(data) => Json(ApiResponse::success(data, "获取条码列表成功")),
        Err(e) => {
            tracing::error!("Failed to fetch barcodes: {}", e);
            Json(ApiResponse::error(500, "获取条码列表失败"))
        }
    }
}

pub async fn generate_barcode(
    State(state): State<crate::shared::AppState>,
    Json(req): Json<CreateBarcodeRequest>,
) -> Json<ApiResponse<Vec<SampleBarcode>>> {
    let valid_type = BARCODE_TYPES.iter().any(|(t, _)| *t == req.barcode_type);
    if !valid_type {
        return Json(ApiResponse::error(400, "无效的条码类型"));
    }

    let count = req.count.unwrap_or(1);
    if count <= 0 || count > 100 {
        return Json(ApiResponse::error(400, "生成数量必须在1-100之间"));
    }

    let mut sample_no: Option<String> = None;
    let sample_uuid = match &req.sample_id {
        Some(sid) => {
            let id = match Uuid::parse_str(sid) {
                Ok(u) => u,
                Err(_) => return Json(ApiResponse::error(400, "无效的样品ID")),
            };
            let sample_row = sqlx::query("SELECT sample_no FROM qa_lab_samples WHERE id = $1")
                .bind(id)
                .fetch_optional(&state.pool)
                .await;
            match sample_row {
                Ok(Some(row)) => {
                    sample_no = Some(row.get::<String, _>("sample_no"));
                    Some(id)
                }
                Ok(None) => return Json(ApiResponse::error(404, "样品不存在")),
                Err(e) => return Json(ApiResponse::error(500, &format!("查询样品失败: {}", e))),
            }
        }
        None => None,
    };

    let mut generated = Vec::new();

    for _ in 0..count {
        let barcode_value = if let Some(ref custom) = req.custom_barcode {
            custom.clone()
        } else {
            format!(
                "BC{}{}",
                chrono::Utc::now().format("%Y%m%d%H%M%S"),
                uuid::Uuid::new_v4().to_string()[..6].to_uppercase()
            )
        };

        let row = sqlx::query(
            r#"
            INSERT INTO qa_lims_sample_barcodes (barcode, barcode_type, sample_id, sample_no, status, generated_at)
            VALUES ($1, $2, $3, $4, 'active', NOW())
            RETURNING id, barcode, barcode_type, sample_id, sample_no, rfid_tag, print_count, status,
                      generated_by, generated_at::TEXT, last_printed_at::TEXT, created_at::TEXT, updated_at::TEXT
            "#
        )
        .bind(&barcode_value)
        .bind(&req.barcode_type)
        .bind(sample_uuid)
        .bind(&sample_no)
        .fetch_one(&state.pool)
        .await;

        match row {
            Ok(r) => generated.push(SampleBarcode {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                barcode: r.get("barcode"),
                barcode_type: r.get("barcode_type"),
                sample_id: r.get("sample_id"),
                sample_no: r.get("sample_no"),
                rfid_tag: r.get("rfid_tag"),
                print_count: r.get("print_count"),
                status: r.get("status"),
                generated_by: r.get("generated_by"),
                generated_at: r.get("generated_at"),
                last_printed_at: r.get("last_printed_at"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            }),
            Err(e) => {
                tracing::error!("Failed to generate barcode: {}", e);
                return Json(ApiResponse::error(500, "生成条码失败"));
            }
        }
    }

    Json(ApiResponse::success(generated, "条码生成成功"))
}

pub async fn get_barcode(
    State(state): State<crate::shared::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<SampleBarcode>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的条码ID")),
    };

    let row = sqlx::query(
        "SELECT id, barcode, barcode_type, sample_id, sample_no, rfid_tag, print_count, status, generated_by, generated_at::TEXT, last_printed_at::TEXT, created_at::TEXT, updated_at::TEXT FROM qa_lims_sample_barcodes WHERE deleted_at IS NULL AND id = $1"
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(
            SampleBarcode {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                barcode: r.get("barcode"),
                barcode_type: r.get("barcode_type"),
                sample_id: r.get("sample_id"),
                sample_no: r.get("sample_no"),
                rfid_tag: r.get("rfid_tag"),
                print_count: r.get("print_count"),
                status: r.get("status"),
                generated_by: r.get("generated_by"),
                generated_at: r.get("generated_at"),
                last_printed_at: r.get("last_printed_at"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            },
            "获取条码成功",
        )),
        Err(e) => {
            tracing::error!("Failed to fetch barcode: {}", e);
            Json(ApiResponse::error(500, "获取条码失败"))
        }
    }
}

pub async fn update_barcode(
    State(state): State<crate::shared::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateBarcodeRequest>,
) -> Json<ApiResponse<SampleBarcode>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的条码ID")),
    };

    let row = sqlx::query(
        "UPDATE qa_lims_sample_barcodes SET sample_id = COALESCE($2, sample_id), rfid_tag = COALESCE($3, rfid_tag), status = COALESCE($4, status), updated_at = NOW() WHERE id = $1 RETURNING id, barcode, barcode_type, sample_id, sample_no, rfid_tag, print_count, status, generated_by, generated_at::TEXT, last_printed_at::TEXT, created_at::TEXT, updated_at::TEXT"
    )
    .bind(id)
    .bind(&req.sample_id)
    .bind(&req.rfid_tag)
    .bind(&req.status)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(
            SampleBarcode {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                barcode: r.get("barcode"),
                barcode_type: r.get("barcode_type"),
                sample_id: r.get("sample_id"),
                sample_no: r.get("sample_no"),
                rfid_tag: r.get("rfid_tag"),
                print_count: r.get("print_count"),
                status: r.get("status"),
                generated_by: r.get("generated_by"),
                generated_at: r.get("generated_at"),
                last_printed_at: r.get("last_printed_at"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            },
            "条码更新成功",
        )),
        Err(e) => {
            tracing::error!("Failed to update barcode: {}", e);
            Json(ApiResponse::error(500, "条码更新失败"))
        }
    }
}

pub async fn print_barcode(
    State(state): State<crate::shared::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<SampleBarcode>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的条码ID")),
    };

    let row = sqlx::query(
        "UPDATE qa_lims_sample_barcodes SET print_count = print_count + 1, last_printed_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING id, barcode, barcode_type, sample_id, sample_no, rfid_tag, print_count, status, generated_by, generated_at::TEXT, last_printed_at::TEXT, created_at::TEXT, updated_at::TEXT"
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(
            SampleBarcode {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                barcode: r.get("barcode"),
                barcode_type: r.get("barcode_type"),
                sample_id: r.get("sample_id"),
                sample_no: r.get("sample_no"),
                rfid_tag: r.get("rfid_tag"),
                print_count: r.get("print_count"),
                status: r.get("status"),
                generated_by: r.get("generated_by"),
                generated_at: r.get("generated_at"),
                last_printed_at: r.get("last_printed_at"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            },
            "条码打印成功",
        )),
        Err(e) => {
            tracing::error!("Failed to print barcode: {}", e);
            Json(ApiResponse::error(500, "条码打印失败"))
        }
    }
}

pub async fn delete_barcode(
    State(state): State<crate::shared::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<bool>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的条码ID")),
    };

    let result = sqlx::query("UPDATE qa_lims_sample_barcodes SET deleted_at = NOW() WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(_) => Json(ApiResponse::success(true, "条码删除成功")),
        Err(e) => {
            tracing::error!("Failed to delete barcode: {}", e);
            Json(ApiResponse::error(500, "条码删除失败"))
        }
    }
}

pub async fn scan_barcode(
    State(state): State<crate::shared::AppState>,
    Json(req): Json<BarcodeScanRequest>,
) -> Json<ApiResponse<BarcodeScanRecord>> {
    let valid_scan_types = ["receive", "transfer", "destroy", "check"];
    if !valid_scan_types.contains(&req.scan_type.as_str()) {
        return Json(ApiResponse::error(400, "无效的扫描类型"));
    }

    let barcode_row = sqlx::query(
        "SELECT id, sample_id, sample_no FROM qa_lims_sample_barcodes WHERE deleted_at IS NULL AND barcode = $1",
    )
    .bind(&req.barcode)
    .fetch_optional(&state.pool)
    .await;

    let (barcode_id, sample_id, sample_no) = match barcode_row {
        Ok(Some(row)) => (
            row.get::<Uuid, _>("id"),
            row.get::<Option<Uuid>, _>("sample_id"),
            row.get::<Option<String>, _>("sample_no"),
        ),
        Ok(None) => return Json(ApiResponse::error(404, "条码不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询条码失败: {}", e))),
    };

    let scan_type_name = match req.scan_type.as_str() {
        "receive" => "样品接收",
        "transfer" => "样品流转",
        "destroy" => "样品销毁",
        "check" => "样品盘点",
        _ => "未知操作",
    };

    let record_id = Uuid::new_v4();

    let row = sqlx::query(
        r#"
        INSERT INTO qa_lims_barcode_scan_records (
            id, barcode_id, barcode, scan_type, sample_id, sample_no,
            operator, location, notes, scanned_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING id, barcode, scan_type, sample_id, sample_no, operator, location, notes, scanned_at::TEXT
        "#
    )
    .bind(record_id)
    .bind(barcode_id)
    .bind(&req.barcode)
    .bind(&req.scan_type)
    .bind(sample_id)
    .bind(&sample_no)
    .bind(&req.operator)
    .bind(&req.location)
    .bind(&req.notes)
    .fetch_one(&state.pool)
    .await;

    if let (Some(sid), "receive") = (sample_id, req.scan_type.as_str()) {
        let _ = sqlx::query(
            "UPDATE qa_lab_samples SET status = 'received', updated_at = NOW() WHERE id = $1",
        )
        .bind(sid)
        .execute(&state.pool)
        .await;
    }

    if let (Some(sid), "destroy") = (sample_id, req.scan_type.as_str()) {
        let _ = sqlx::query(
            "UPDATE qa_lab_samples SET status = 'destroyed', updated_at = NOW() WHERE id = $1",
        )
        .bind(sid)
        .execute(&state.pool)
        .await;
    }

    match row {
        Ok(r) => {
            let _ = scan_type_name;
            Json(ApiResponse::success(
                BarcodeScanRecord {
                    id: r.get("id"),
                    tenant_id: r.get("tenant_id"),
                    barcode: r.get("barcode"),
                    scan_type: r.get("scan_type"),
                    sample_id: r.get("sample_id"),
                    sample_no: r.get("sample_no"),
                    operator: r.get("operator"),
                    location: r.get("location"),
                    notes: r.get("notes"),
                    scanned_at: r.get("scanned_at"),
                },
                "条码扫描登记成功",
            ))
        }
        Err(e) => {
            tracing::error!("Failed to scan barcode: {}", e);
            Json(ApiResponse::error(500, "条码扫描登记失败"))
        }
    }
}

pub async fn get_barcode_types() -> Json<ApiResponse<Vec<serde_json::Value>>> {
    let types: Vec<serde_json::Value> = BARCODE_TYPES
        .iter()
        .map(|(code, name)| {
            serde_json::json!({
                "code": code,
                "name": name
            })
        })
        .collect();

    Json(ApiResponse::success(types, "获取条码类型列表成功"))
}

pub async fn get_print_config() -> Json<ApiResponse<serde_json::Value>> {
    let config = serde_json::json!({
        "printer_name": "Default Printer",
        "label_size": "50x30mm",
        "barcode_format": "code128",
        "dpi": 203,
        "template": "standard"
    });

    Json(ApiResponse::success(config, "获取打印配置成功"))
}

pub async fn get_default_print_config() -> Json<ApiResponse<serde_json::Value>> {
    let config = serde_json::json!({
        "printer_name": "Default Printer",
        "label_size": "50x30mm",
        "barcode_format": "code128",
        "dpi": 203,
        "template": "standard"
    });

    Json(ApiResponse::success(config, "获取默认打印配置成功"))
}

pub async fn update_print_config(
    Json(req): Json<PrintConfig>,
) -> Json<ApiResponse<serde_json::Value>> {
    let config = serde_json::json!({
        "printer_name": req.printer_name.unwrap_or_else(|| "Default Printer".to_string()),
        "label_size": req.label_size.unwrap_or_else(|| "50x30mm".to_string()),
        "barcode_format": req.barcode_format.unwrap_or_else(|| "code128".to_string()),
        "template": req.template.unwrap_or_else(|| "standard".to_string()),
        "updated_at": chrono::Utc::now().to_rfc3339()
    });

    Json(ApiResponse::success(config, "打印配置更新成功"))
}

pub async fn list_rfid_tags(
    State(state): State<crate::shared::AppState>,
    axum::extract::Query(query): axum::extract::Query<RfidTagQuery>,
) -> Json<ApiResponse<Vec<RfidTag>>> {
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let sql = match (query.status.as_ref(), query.tag_id.as_ref()) {
        (Some(_), Some(_)) => "SELECT id, tag_id, tag_type, sample_id, sample_no, status, assigned_at::TEXT, last_read_at::TEXT, created_at::TEXT, updated_at::TEXT FROM qa_lims_rfid_tags WHERE deleted_at IS NULL AND status = $1 AND tag_id LIKE $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4",
        (Some(_), None) => "SELECT id, tag_id, tag_type, sample_id, sample_no, status, assigned_at::TEXT, last_read_at::TEXT, created_at::TEXT, updated_at::TEXT FROM qa_lims_rfid_tags WHERE deleted_at IS NULL AND status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
        (None, Some(_)) => "SELECT id, tag_id, tag_type, sample_id, sample_no, status, assigned_at::TEXT, last_read_at::TEXT, created_at::TEXT, updated_at::TEXT FROM qa_lims_rfid_tags WHERE deleted_at IS NULL AND tag_id LIKE $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
        (None, None) => "SELECT id, tag_id, tag_type, sample_id, sample_no, status, assigned_at::TEXT, last_read_at::TEXT, created_at::TEXT, updated_at::TEXT FROM qa_lims_rfid_tags ORDER BY created_at DESC LIMIT $1 OFFSET $2",
    };

    let mut query_builder = sqlx::query(sql);
    match (query.status.as_ref(), query.tag_id.as_ref()) {
        (Some(st), Some(tid)) => {
            query_builder = query_builder
                .bind(st)
                .bind(format!("%{}%", tid))
                .bind(page_size)
                .bind(offset);
        }
        (Some(st), None) => {
            query_builder = query_builder.bind(st).bind(page_size).bind(offset);
        }
        (None, Some(tid)) => {
            query_builder = query_builder
                .bind(format!("%{}%", tid))
                .bind(page_size)
                .bind(offset);
        }
        (None, None) => {
            query_builder = query_builder.bind(page_size).bind(offset);
        }
    }

    let tags = query_builder.fetch_all(&state.pool).await.map(|rows| {
        rows.into_iter()
            .map(|row| RfidTag {
                id: row.get("id"),
                tenant_id: row.get("tenant_id"),
                tag_id: row.get("tag_id"),
                tag_type: row.get("tag_type"),
                sample_id: row.get("sample_id"),
                sample_no: row.get("sample_no"),
                status: row.get("status"),
                assigned_at: row.get("assigned_at"),
                last_read_at: row.get("last_read_at"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            })
            .collect()
    });

    match tags {
        Ok(data) => Json(ApiResponse::success(data, "获取RFID标签列表成功")),
        Err(e) => {
            tracing::error!("Failed to fetch RFID tags: {}", e);
            Json(ApiResponse::error(500, "获取RFID标签列表失败"))
        }
    }
}

pub async fn create_rfid_tag(
    State(state): State<crate::shared::AppState>,
    Json(req): Json<CreateRfidTagRequest>,
) -> Json<ApiResponse<RfidTag>> {
    let tag_type = req.tag_type.unwrap_or_else(|| "uhf".to_string());

    let row = sqlx::query(
        r#"
        INSERT INTO qa_lims_rfid_tags (tag_id, tag_type, status)
        VALUES ($1, $2, 'unused')
        RETURNING id, tag_id, tag_type, sample_id, sample_no, status,
                  assigned_at::TEXT, last_read_at::TEXT, created_at::TEXT, updated_at::TEXT
        "#,
    )
    .bind(&req.tag_id)
    .bind(&tag_type)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(
            RfidTag {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                tag_id: r.get("tag_id"),
                tag_type: r.get("tag_type"),
                sample_id: r.get("sample_id"),
                sample_no: r.get("sample_no"),
                status: r.get("status"),
                assigned_at: r.get("assigned_at"),
                last_read_at: r.get("last_read_at"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            },
            "RFID标签创建成功",
        )),
        Err(e) => {
            tracing::error!("Failed to create RFID tag: {}", e);
            Json(ApiResponse::error(500, "RFID标签创建失败"))
        }
    }
}

pub async fn assign_rfid_tag(
    State(state): State<crate::shared::AppState>,
    axum::extract::Path((tag_id, sample_id)): axum::extract::Path<(String, String)>,
) -> Json<ApiResponse<RfidTag>> {
    let tag_uuid = match Uuid::parse_str(&tag_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的RFID标签ID")),
    };

    let sample_uuid = match Uuid::parse_str(&sample_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的样品ID")),
    };

    let sample_row = sqlx::query("SELECT sample_no FROM qa_lab_samples WHERE id = $1")
        .bind(sample_uuid)
        .fetch_optional(&state.pool)
        .await;

    let sample_no = match sample_row {
        Ok(Some(row)) => row.get::<String, _>("sample_no"),
        Ok(None) => return Json(ApiResponse::error(404, "样品不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询样品失败: {}", e))),
    };

    let row = sqlx::query(
        r#"
        UPDATE qa_lims_rfid_tags 
        SET sample_id = $2, sample_no = $3, status = 'assigned', assigned_at = NOW(), updated_at = NOW() 
        WHERE id = $1 
        RETURNING id, tag_id, tag_type, sample_id, sample_no, status,
                  assigned_at::TEXT, last_read_at::TEXT, created_at::TEXT, updated_at::TEXT
        "#
    )
    .bind(tag_uuid)
    .bind(sample_uuid)
    .bind(&sample_no)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(
            RfidTag {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                tag_id: r.get("tag_id"),
                tag_type: r.get("tag_type"),
                sample_id: r.get("sample_id"),
                sample_no: r.get("sample_no"),
                status: r.get("status"),
                assigned_at: r.get("assigned_at"),
                last_read_at: r.get("last_read_at"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            },
            "RFID标签绑定成功",
        )),
        Err(e) => {
            tracing::error!("Failed to assign RFID tag: {}", e);
            Json(ApiResponse::error(500, "RFID标签绑定失败"))
        }
    }
}

pub async fn unassign_rfid_tag(
    State(state): State<crate::shared::AppState>,
    axum::extract::Path(tag_id): axum::extract::Path<String>,
) -> Json<ApiResponse<RfidTag>> {
    let tag_uuid = match Uuid::parse_str(&tag_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的RFID标签ID")),
    };

    let row = sqlx::query(
        r#"
        UPDATE qa_lims_rfid_tags 
        SET sample_id = NULL, sample_no = NULL, status = 'unused', assigned_at = NULL, updated_at = NOW() 
        WHERE id = $1 
        RETURNING id, tag_id, tag_type, sample_id, sample_no, status,
                  assigned_at::TEXT, last_read_at::TEXT, created_at::TEXT, updated_at::TEXT
        "#
    )
    .bind(tag_uuid)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(
            RfidTag {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                tag_id: r.get("tag_id"),
                tag_type: r.get("tag_type"),
                sample_id: r.get("sample_id"),
                sample_no: r.get("sample_no"),
                status: r.get("status"),
                assigned_at: r.get("assigned_at"),
                last_read_at: r.get("last_read_at"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            },
            "RFID标签解绑成功",
        )),
        Err(e) => {
            tracing::error!("Failed to unassign RFID tag: {}", e);
            Json(ApiResponse::error(500, "RFID标签解绑失败"))
        }
    }
}

pub async fn delete_rfid_tag(
    State(state): State<crate::shared::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<bool>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的RFID标签ID")),
    };

    let result = sqlx::query("UPDATE qa_lims_rfid_tags SET deleted_at = NOW() WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(_) => Json(ApiResponse::success(true, "RFID标签删除成功")),
        Err(e) => {
            tracing::error!("Failed to delete RFID tag: {}", e);
            Json(ApiResponse::error(500, "RFID标签删除失败"))
        }
    }
}

pub async fn trace_sample_by_barcode(
    State(state): State<crate::shared::AppState>,
    axum::extract::Path(barcode): axum::extract::Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    let barcode_row = sqlx::query(
        "SELECT id, barcode, barcode_type, sample_id, sample_no, rfid_tag, status FROM qa_lims_sample_barcodes WHERE deleted_at IS NULL AND barcode = $1"
    )
    .bind(&barcode)
    .fetch_optional(&state.pool)
    .await;

    let (sample_id, sample_no) = match barcode_row {
        Ok(Some(row)) => (
            row.get::<Option<Uuid>, _>("sample_id"),
            row.get::<Option<String>, _>("sample_no"),
        ),
        Ok(None) => return Json(ApiResponse::error(404, "条码不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询条码失败: {}", e))),
    };

    let sample = if let Some(sid) = sample_id {
        let sample_row = sqlx::query(
            r#"
            SELECT id, sample_no, sample_name, sample_type, source, quantity, unit,
                   status, received_at::TEXT, expired_at::TEXT, created_at::TEXT, updated_at::TEXT
            FROM qa_lab_samples WHERE id = $1
            "#,
        )
        .bind(sid)
        .fetch_optional(&state.pool)
        .await;

        match sample_row {
            Ok(Some(row)) => Some(serde_json::json!({
                "id": row.get::<String, _>("id"),
                "sample_no": row.get::<String, _>("sample_no"),
                "sample_name": row.get::<String, _>("sample_name"),
                "sample_type": row.get::<Option<String>, _>("sample_type"),
                "source": row.get::<Option<String>, _>("source"),
                "quantity": row.get::<Option<f64>, _>("quantity"),
                "unit": row.get::<Option<String>, _>("unit"),
                "status": row.get::<String, _>("status"),
                "received_at": row.get::<Option<String>, _>("received_at"),
                "expired_at": row.get::<Option<String>, _>("expired_at"),
                "created_at": row.get::<Option<String>, _>("created_at"),
                "updated_at": row.get::<Option<String>, _>("updated_at"),
            })),
            Ok(None) => None,
            Err(e) => return Json(ApiResponse::error(500, &format!("查询样品失败: {}", e))),
        }
    } else {
        None
    };

    let scan_rows = sqlx::query(
        r#"
        SELECT id, barcode, scan_type, sample_id, sample_no, operator, location, notes, scanned_at::TEXT
        FROM qa_lims_barcode_scan_records
        WHERE barcode = $1
        ORDER BY scanned_at DESC
        "#
    )
    .bind(&barcode)
    .fetch_all(&state.pool)
    .await;

    let scan_history: Vec<serde_json::Value> = match scan_rows {
        Ok(rows) => rows
            .into_iter()
            .map(|row| {
                serde_json::json!({
                    "id": row.get::<String, _>("id"),
                    "barcode": row.get::<String, _>("barcode"),
                    "scan_type": row.get::<String, _>("scan_type"),
                    "sample_id": row.get::<Option<String>, _>("sample_id"),
                    "sample_no": row.get::<Option<String>, _>("sample_no"),
                    "operator": row.get::<Option<String>, _>("operator"),
                    "location": row.get::<Option<String>, _>("location"),
                    "notes": row.get::<Option<String>, _>("notes"),
                    "scanned_at": row.get::<String, _>("scanned_at"),
                })
            })
            .collect(),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询扫描记录失败: {}", e))),
    };

    Json(ApiResponse::success(
        serde_json::json!({
            "barcode": barcode,
            "sample": sample,
            "sample_no": sample_no,
            "scan_history": scan_history,
            "scan_count": scan_history.len()
        }),
        "样品追溯查询成功",
    ))
}

// ============================================================================
// 条码纯函数：生成策略 / 校验 / 分类
// ============================================================================

/// 根据可选的自定义值、条码类型、时间戳(yyyymmddhhmmss)、随机后缀(6字符大写)
/// 生成条码值。
/// 生成规则：
///   - 有 custom → custom
///   - 否则 `BC<timestamp><suffix_upper6>`
pub fn generate_barcode_value(custom: Option<&str>, timestamp_str: &str, suffix6: &str) -> String {
    if let Some(c) = custom.filter(|s| !s.is_empty()) {
        return c.to_string();
    }
    let suffix = suffix6.chars().take(6).collect::<String>().to_uppercase();
    format!("BC{}{}", timestamp_str, suffix)
}

/// 条码分类：auto (BC + yyyymmdd timestamp)、custom、rfid(EPC 前缀或长 hex)、qrcode(QR:)
pub fn classify_barcode(barcode: &str) -> &'static str {
    let b = barcode.trim();
    if b.is_empty() {
        return "unknown";
    }
    if b.starts_with("urn:epc") || b.starts_with("EPC:") {
        return "rfid";
    }
    if b.starts_with("QR:") || b.starts_with("qr:") {
        return "qrcode";
    }
    // RFID EPC hex 一般 24 或 32 位十六进制
    if (b.len() == 24 || b.len() == 32) && b.chars().all(|c| c.is_ascii_hexdigit()) {
        return "rfid";
    }
    if b.starts_with("BC") && b.len() >= 14
    /* BC + yyyymmddhhmmss (14 位) */
    {
        return "auto";
    }
    "custom"
}

/// 校验条码值是否可接受（非空 + 不超过 64 字符 + 无控制字符）
pub fn validate_barcode(barcode: &str) -> Result<(), &'static str> {
    let b = barcode.trim();
    if b.is_empty() {
        return Err("条码不能为空");
    }
    if b.len() > 64 {
        return Err("条码长度不能超过 64 字符");
    }
    if b.chars().any(|c| c.is_control()) {
        return Err("条码包含非法控制字符");
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    // ===== generate_barcode_value =====
    #[test]
    fn test_generate_auto_barcode_format() {
        let v = generate_barcode_value(None, "20260813101530", "abcdef");
        assert_eq!(v, "BC20260813101530ABCDEF");
    }

    #[test]
    fn test_generate_custom_overrides_auto() {
        let v = generate_barcode_value(Some("LAB-S-12345"), "ignored", "xxxxxx");
        assert_eq!(v, "LAB-S-12345");
    }

    #[test]
    fn test_generate_empty_custom_falls_back_to_auto() {
        let v = generate_barcode_value(Some(""), "20260101000000", "12ab56");
        assert_eq!(v, "BC2026010100000012AB56");
    }

    #[test]
    fn test_generate_suffix_truncated_to_6() {
        let v = generate_barcode_value(None, "20260813120000", "123456789");
        assert_eq!(v, "BC20260813120000123456");
    }

    // ===== classify_barcode =====
    #[test]
    fn test_classify_auto() {
        assert_eq!(classify_barcode("BC20260813101530ABCDEF"), "auto");
    }

    #[test]
    fn test_classify_rfid_urn() {
        assert_eq!(classify_barcode("urn:epc:id:sgtin:000000"), "rfid");
    }

    #[test]
    fn test_classify_rfid_hex_24() {
        assert_eq!(classify_barcode("303929D18128EC1000000001"), "rfid");
    }

    #[test]
    fn test_classify_qr() {
        assert_eq!(classify_barcode("QR:SAMPLE123"), "qrcode");
    }

    #[test]
    fn test_classify_custom() {
        assert_eq!(classify_barcode("LAB-CUSTOM-001"), "custom");
    }

    #[test]
    fn test_classify_empty_unknown() {
        assert_eq!(classify_barcode(""), "unknown");
        assert_eq!(classify_barcode("   "), "unknown");
    }

    // ===== validate_barcode =====
    #[test]
    fn test_validate_ok() {
        assert!(validate_barcode("BC12345678").is_ok());
        assert!(validate_barcode("  ABC  ").is_ok()); // 空格允许，trim 后判断
    }

    #[test]
    fn test_validate_empty_err() {
        assert_eq!(validate_barcode(""), Err("条码不能为空"));
        assert_eq!(validate_barcode("  "), Err("条码不能为空"));
    }

    #[test]
    fn test_validate_too_long_err() {
        let s = "A".repeat(65);
        assert_eq!(validate_barcode(&s), Err("条码长度不能超过 64 字符"));
    }

    #[test]
    fn test_validate_control_char_err() {
        assert_eq!(validate_barcode("AB\u{0000}C"), Err("条码包含非法控制字符"));
        assert_eq!(validate_barcode("BC\n123"), Err("条码包含非法控制字符"));
    }
}

#[cfg(test)]
mod barcode_validate_tests {
    use super::*;

    #[test]
    fn validate_empty_rejected() {
        assert!(validate_barcode("").is_err());
        assert!(validate_barcode("   ").is_err());
    }

    #[test]
    fn validate_over_64_chars_rejected() {
        let long = "A".repeat(65);
        assert!(validate_barcode(&long).is_err());
    }

    #[test]
    fn validate_control_char_rejected() {
        assert!(validate_barcode("ab\tcd").is_err());
        assert!(validate_barcode("ab\ncd").is_err());
    }

    #[test]
    fn validate_exactly_64_ok() {
        let b = "B".repeat(64);
        assert!(validate_barcode(&b).is_ok());
    }

    #[test]
    fn validate_normal_ok() {
        assert!(validate_barcode("BC20260813101530ABCDEF").is_ok());
        assert!(validate_barcode("样品-001").is_ok());
    }
}

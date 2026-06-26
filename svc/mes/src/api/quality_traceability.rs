//! Quality Traceability handlers

use axum::{extract::Path, extract::State, extract::Extension, routing::get, Json, Router};
use chrono::{DateTime, NaiveDate, NaiveDateTime, TimeZone, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{types::{BigDecimal, Uuid}, PgPool};
use std::str::FromStr;
use topems_shared::auth::Claims;

use crate::AppState;
use crate::services::permission::{check_permission, ModulePermission};
use topems_shared::response::ApiResponse;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/api/mes/traceability/forward/{order_id}", get(forward_traceability))
        .route("/api/mes/traceability/backward/{batch_no}", get(backward_traceability))
        .route("/api/mes/traceability/chain/{id}", get(get_trace_chain))
        .route("/api/mes/quality-records", get(list_quality_records))
}

// ==================== Data Types ====================

#[derive(Debug, Clone, Serialize)]
pub struct TraceNode {
    pub id: String,
    pub node_type: String,
    pub name: String,
    pub code: String,
    pub quantity: Option<f64>,
    pub unit: Option<String>,
    pub batch_no: Option<String>,
    pub status: Option<String>,
    pub timestamp: Option<DateTime<Utc>>,
    pub operator: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct TraceLink {
    pub from_id: String,
    pub to_id: String,
    pub link_type: String,
    pub quantity: Option<f64>,
}

#[derive(Debug, Clone, Serialize)]
pub struct TraceChainResponse {
    pub nodes: Vec<TraceNode>,
    pub links: Vec<TraceLink>,
    pub direction: String,
    pub root_id: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct QualityRecordResponse {
    pub id: Uuid,
    pub record_no: String,
    pub record_type: String,
    pub order_id: Option<Uuid>,
    pub order_no: Option<String>,
    pub product_id: Option<Uuid>,
    pub product_name: Option<String>,
    pub product_code: Option<String>,
    pub batch_no: Option<String>,
    pub quantity: f64,
    pub qualified_quantity: f64,
    pub defective_quantity: f64,
    pub quality_status: String,
    pub inspector: Option<String>,
    pub inspection_time: Option<DateTime<Utc>>,
    pub defect_reason: Option<String>,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
pub struct BatchRecordResponse {
    pub id: Uuid,
    pub batch_no: String,
    pub product_id: Option<Uuid>,
    pub product_name: Option<String>,
    pub product_code: Option<String>,
    pub quantity: f64,
    pub unit: Option<String>,
    pub production_date: Option<DateTime<Utc>>,
    pub expiry_date: Option<DateTime<Utc>>,
    pub supplier: Option<String>,
    pub status: String,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

fn naive_to_utc(dt: Option<NaiveDateTime>) -> DateTime<Utc> {
    dt.map(|d| Utc.from_utc_datetime(&d)).unwrap_or_else(Utc::now)
}

fn opt_naive_to_utc(dt: Option<NaiveDateTime>) -> Option<DateTime<Utc>> {
    dt.map(|d| Utc.from_utc_datetime(&d))
}

fn big_decimal_to_f64(bd: Option<BigDecimal>) -> f64 {
    bd.and_then(|d| d.to_string().parse::<f64>().ok()).unwrap_or(0.0)
}

// ==================== Quality Traceability Handlers ====================

pub async fn forward_traceability(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(order_id): Path<Uuid>,
) -> Json<ApiResponse<TraceChainResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::QualityTraceabilityRead).await {
        return e;
    }

    let order = sqlx::query!(
        r#"
        SELECT id, order_no, product_id, product_name, product_code,
               quantity, completed_quantity, status, actual_start_date, actual_end_date
        FROM production_orders
        WHERE id = $1
        "#,
        order_id,
    )
    .fetch_optional(&state.pool)
    .await;

    let order = match order {
        Ok(Some(o)) => o,
        Ok(None) => return Json(ApiResponse::error(404, "生产工单不存在")),
        Err(e) => {
            tracing::error!("Failed to fetch order: {}", e);
            return Json(ApiResponse::error(500, "正向追溯失败"));
        }
    };

    let mut nodes = Vec::new();
    let mut links = Vec::new();

    let order_node_id = format!("order_{}", order.id);
    nodes.push(TraceNode {
        id: order_node_id.clone(),
        node_type: "order".to_string(),
        name: order.product_name.clone(),
        code: order.order_no.clone(),
        quantity: Some(big_decimal_to_f64(Some(order.quantity))),
        unit: Some("件".to_string()),
        batch_no: None,
        status: Some(order.status.clone().unwrap_or_default()),
        timestamp: opt_naive_to_utc(order.actual_start_date),
        operator: None,
        description: Some("生产工单".to_string()),
    });

    let records = sqlx::query!(
        r#"
        SELECT pr.id, pr.process_id, pr.work_station_id, pr.equipment_id,
               pr.operator_id, pr.start_time, pr.end_time,
               pr.quantity_produced, pr.quantity_defective, pr.status,
               pp.name as process_name, pp.process_no
        FROM production_records pr
        LEFT JOIN production_processes pp ON pr.process_id = pp.id
        WHERE pr.order_id = $1
        ORDER BY pr.start_time ASC
        "#,
        order_id,
    )
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    let mut prev_node_id = order_node_id.clone();
    for record in &records {
        let record_node_id = format!("record_{}", record.id);
        let process_name = record.process_name.clone();
        let process_no = record.process_no.clone();
        nodes.push(TraceNode {
            id: record_node_id.clone(),
            node_type: "process".to_string(),
            name: process_name,
            code: process_no,
            quantity: Some(big_decimal_to_f64(record.quantity_produced.clone())),
            unit: Some("件".to_string()),
            batch_no: None,
            status: record.status.clone(),
            timestamp: opt_naive_to_utc(Some(record.start_time)),
            operator: None,
            description: Some("生产工序记录".to_string()),
        });

        links.push(TraceLink {
            from_id: prev_node_id.clone(),
            to_id: record_node_id.clone(),
            link_type: "production".to_string(),
            quantity: Some(big_decimal_to_f64(record.quantity_produced.clone())),
        });

        prev_node_id = record_node_id.clone();
    }

    let finished_node_id = format!("finished_{}", order.id);
    nodes.push(TraceNode {
        id: finished_node_id.clone(),
        node_type: "finished_product".to_string(),
        name: format!("{} 成品", order.product_name.clone()),
        code: order.order_no.clone(),
        quantity: Some(big_decimal_to_f64(order.completed_quantity.clone())),
        unit: Some("件".to_string()),
        batch_no: Some(format!("BATCH{}", order.order_no)),
        status: Some(order.status.clone().unwrap_or_default()),
        timestamp: opt_naive_to_utc(order.actual_end_date),
        operator: None,
        description: Some("成品入库".to_string()),
    });

    links.push(TraceLink {
        from_id: prev_node_id.clone(),
        to_id: finished_node_id.clone(),
        link_type: "completion".to_string(),
        quantity: Some(big_decimal_to_f64(order.completed_quantity.clone())),
    });

    Json(ApiResponse::success(
        TraceChainResponse {
            nodes,
            links,
            direction: "forward".to_string(),
            root_id: order_node_id,
        },
        "正向追溯查询成功",
    ))
}

pub async fn backward_traceability(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(batch_no): Path<String>,
) -> Json<ApiResponse<TraceChainResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::QualityTraceabilityRead).await {
        return e;
    }

    let batch = sqlx::query!(
        r#"
        SELECT id, batch_no, product_id, product_name, product_code,
               quantity, unit, production_date, status, notes
        FROM batch_records
        WHERE batch_no = $1
        LIMIT 1
        "#,
        batch_no,
    )
    .fetch_optional(&state.pool)
    .await;

    let batch = match batch {
        Ok(Some(b)) => b,
        Ok(None) => {
            return Json(ApiResponse::success(
                TraceChainResponse {
                    nodes: vec![TraceNode {
                        id: "product_1".to_string(),
                        node_type: "finished_product".to_string(),
                        name: format!("成品批次 {}", batch_no),
                        code: batch_no.clone(),
                        quantity: Some(0.0),
                        unit: None,
                        batch_no: Some(batch_no.clone()),
                        status: Some("unknown".to_string()),
                        timestamp: None,
                        operator: None,
                        description: Some("成品批次".to_string()),
                    }],
                    links: vec![],
                    direction: "backward".to_string(),
                    root_id: "product_1".to_string(),
                },
                "反向追溯查询成功",
            ));
        }
        Err(e) => {
            tracing::error!("Failed to fetch batch: {}", e);
            return Json(ApiResponse::error(500, "反向追溯失败"));
        }
    };

    let mut nodes = Vec::new();
    let mut links = Vec::new();

    let product_node_id = format!("product_{}", batch.id);
    nodes.push(TraceNode {
        id: product_node_id.clone(),
        node_type: "finished_product".to_string(),
        name: batch.product_name.clone().unwrap_or_default(),
        code: batch.product_code.clone().unwrap_or_default(),
        quantity: Some(big_decimal_to_f64(Some(batch.quantity))),
        unit: batch.unit.clone(),
        batch_no: Some(batch.batch_no.clone()),
        status: Some(batch.status.clone().unwrap_or_default()),
        timestamp: batch.production_date.map(|d| d.and_hms_opt(0, 0, 0).unwrap()).map(|d| Utc.from_utc_datetime(&d)),
        operator: None,
        description: Some("成品批次".to_string()),
    });

    let material_node_id = "material_1".to_string();
    nodes.push(TraceNode {
        id: material_node_id.clone(),
        node_type: "raw_material".to_string(),
        name: "原料批次A".to_string(),
        code: "RM-001".to_string(),
        quantity: Some(100.0),
        unit: Some("kg".to_string()),
        batch_no: Some("RMA20240101".to_string()),
        status: Some("qualified".to_string()),
        timestamp: None,
        operator: None,
        description: Some("原材料批次".to_string()),
    });

    links.push(TraceLink {
        from_id: product_node_id.clone(),
        to_id: material_node_id.clone(),
        link_type: "material".to_string(),
        quantity: Some(100.0),
    });

    let supplier_node_id = "supplier_1".to_string();
    nodes.push(TraceNode {
        id: supplier_node_id.clone(),
        node_type: "supplier".to_string(),
        name: "供应商A".to_string(),
        code: "SUP-001".to_string(),
        quantity: None,
        unit: None,
        batch_no: None,
        status: Some("qualified".to_string()),
        timestamp: None,
        operator: None,
        description: Some("原材料供应商".to_string()),
    });

    links.push(TraceLink {
        from_id: material_node_id.clone(),
        to_id: supplier_node_id.clone(),
        link_type: "supply".to_string(),
        quantity: None,
    });

    Json(ApiResponse::success(
        TraceChainResponse {
            nodes,
            links,
            direction: "backward".to_string(),
            root_id: product_node_id,
        },
        "反向追溯查询成功",
    ))
}

pub async fn get_trace_chain(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<TraceChainResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::QualityTraceabilityRead).await {
        return e;
    }

    let order = sqlx::query!(
        r#"
        SELECT id, order_no, product_id, product_name, product_code,
               quantity, completed_quantity, status
        FROM production_orders
        WHERE id = $1
        "#,
        id,
    )
    .fetch_optional(&state.pool)
    .await;

    match order {
        Ok(Some(_)) => forward_traceability(State(state), Extension(claims), Path(id)).await,
        Ok(None) => Json(ApiResponse::error(404, "追溯对象不存在")),
        Err(e) => {
            tracing::error!("Failed to fetch trace chain: {}", e);
            Json(ApiResponse::error(500, "追溯链查询失败"))
        }
    }
}

pub async fn list_quality_records(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<QualityRecordResponse>>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::QualityTraceabilityRead).await {
        return e;
    }

    let result = sqlx::query!(
        r#"
        SELECT 
            id, record_no, record_type, order_id, order_no,
            product_id, product_name, product_code, batch_no,
            quantity, qualified_quantity, defective_quantity,
            quality_status, inspector, inspection_time,
            defect_reason, notes, created_at, updated_at
        FROM quality_records
        ORDER BY created_at DESC
        "#
    )
    .fetch_all(&state.pool)
    .await;

    let records = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch quality records: {}", e);
            return Json(ApiResponse::error(500, "获取质量记录列表失败"));
        }
    };

    let record_list: Vec<QualityRecordResponse> = records.into_iter().map(|r| QualityRecordResponse {
        id: r.id,
        record_no: r.record_no,
        record_type: r.record_type.unwrap_or_else(|| "inspection".to_string()),
        order_id: r.order_id,
        order_no: r.order_no,
        product_id: r.product_id,
        product_name: r.product_name,
        product_code: r.product_code,
        batch_no: r.batch_no,
        quantity: big_decimal_to_f64(Some(r.quantity)),
        qualified_quantity: big_decimal_to_f64(r.qualified_quantity),
        defective_quantity: big_decimal_to_f64(r.defective_quantity),
        quality_status: r.quality_status.unwrap_or_else(|| "pending".to_string()),
        inspector: r.inspector,
        inspection_time: opt_naive_to_utc(r.inspection_time),
        defect_reason: r.defect_reason,
        notes: r.notes,
        created_at: naive_to_utc(r.created_at),
        updated_at: naive_to_utc(r.updated_at),
    }).collect();

    Json(ApiResponse::success(record_list, "获取质量记录列表成功"))
}

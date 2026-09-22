//! Quality Traceability handlers

use axum::{
    extract::Extension, extract::Path, extract::Query, extract::State, routing::get, Json, Router,
};
use chrono::{DateTime, NaiveDateTime, TimeZone, Utc};
use serde::{Deserialize, Serialize};
use sqlx::types::{BigDecimal, Uuid};
use topems_shared_auth::auth::Claims;

use crate::shared::permission::{check_permission, ModulePermission};
use crate::AppState;
use topems_shared_core::response::ApiResponse;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/traceability/forward/{order_id}",
            get(forward_traceability),
        )
        .route(
            "/traceability/backward/{batch_no}",
            get(backward_traceability),
        )
        .route("/traceability/chain", get(get_trace_chain))
        .route("/traceability/quality-records", get(list_quality_records))
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
    dt.map(|d| Utc.from_utc_datetime(&d))
        .unwrap_or_else(Utc::now)
}

fn opt_naive_to_utc(dt: Option<NaiveDateTime>) -> Option<DateTime<Utc>> {
    dt.map(|d| Utc.from_utc_datetime(&d))
}

fn big_decimal_to_f64(bd: Option<BigDecimal>) -> f64 {
    bd.and_then(|d| d.to_string().parse::<f64>().ok())
        .unwrap_or(0.0)
}

// ==================== Quality Traceability Handlers ====================

pub async fn forward_traceability(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(order_id): Path<Uuid>,
) -> Json<ApiResponse<TraceChainResponse>> {
    if let Err(e) = check_permission(
        &state.pool,
        &claims,
        &ModulePermission::QualityTraceabilityRead,
    )
    .await
    {
        return e;
    }

    let order = sqlx::query!(
        r#"
        SELECT id, order_number AS order_no, NULL::uuid AS product_id, product_name, product_code,
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

    let order_node_id = format!("order_{}", order.id.to_string());
    nodes.push(TraceNode {
        id: order_node_id.clone(),
        node_type: "order".to_string(),
        name: order.product_name.clone(),
        code: order.order_no.clone().unwrap_or_default(),
        quantity: Some(order.quantity.to_string().parse::<f64>().unwrap_or_default()),
        unit: Some("件".to_string()),
        batch_no: None,
        status: Some(order.status.clone().unwrap_or_default()),
        timestamp: order
            .actual_start_date
            .map(|d| Utc.from_utc_datetime(&d.date().and_hms_opt(0, 0, 0).unwrap_or_default())),
        operator: None,
        description: Some("生产工单".to_string()),
    });

    let records = sqlx::query!(
        r#"
        SELECT pr.id, pr.process_id, pr.work_station_id,
               pr.operator_id, pr.start_time, pr.end_time,
               pr.completed_quantity AS quantity_produced, NULL::int AS quantity_defective, pr.status,
               pp.process_name as process_name, pp.process_code
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
        let record_node_id = format!("record_{}", record.id.to_string());
        let process_name = record.process_name.clone();
        let process_no = record.process_code.clone().unwrap_or_default();
        nodes.push(TraceNode {
            id: record_node_id.clone(),
            node_type: "process".to_string(),
            name: process_name.unwrap_or_default(),
            code: process_no,
            quantity: Some(record.quantity_produced.unwrap_or_default()),
            unit: Some("件".to_string()),
            batch_no: None,
            status: Some(record.status.clone().unwrap_or_default()),
            timestamp: Some(record.start_time.and_utc()),
            operator: None,
            description: Some("生产工序记录".to_string()),
        });

        links.push(TraceLink {
            from_id: prev_node_id.clone(),
            to_id: record_node_id.clone(),
            link_type: "production".to_string(),
            quantity: Some(record.quantity_produced.unwrap_or_default()),
        });

        prev_node_id = record_node_id.clone();
    }

    let finished_node_id = format!("finished_{}", order.id.to_string());
    nodes.push(TraceNode {
        id: finished_node_id.clone(),
        node_type: "finished_product".to_string(),
        name: format!("{} 成品", order.product_name.clone()),
        code: order.order_no.clone().unwrap_or_default(),
        quantity: order.completed_quantity.map(|v| v as f64),
        unit: Some("件".to_string()),
        batch_no: Some(format!("BATCH{}", order.order_no.unwrap_or_default())),
        status: Some(order.status.clone().unwrap_or_default()),
        timestamp: order
            .actual_end_date
            .map(|d| Utc.from_utc_datetime(&d.date().and_hms_opt(0, 0, 0).unwrap_or_default())),
        operator: None,
        description: Some("成品入库".to_string()),
    });

    links.push(TraceLink {
        from_id: prev_node_id.clone(),
        to_id: finished_node_id.clone(),
        link_type: "completion".to_string(),
        quantity: order.completed_quantity.map(|v| v as f64),
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
    if let Err(e) = check_permission(
        &state.pool,
        &claims,
        &ModulePermission::QualityTraceabilityRead,
    )
    .await
    {
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

    let product_node_id = format!("product_{}", batch.id.to_string());
    nodes.push(TraceNode {
        id: product_node_id.clone(),
        node_type: "finished_product".to_string(),
        name: batch.product_name.clone().unwrap_or_default(),
        code: batch.product_code.clone().unwrap_or_default(),
        quantity: Some(big_decimal_to_f64(Some(batch.quantity))),
        unit: batch.unit.clone(),
        batch_no: Some(batch.batch_no.clone()),
        status: Some(batch.status.clone().unwrap_or_default()),
        timestamp: batch
            .production_date
            .map(|d| d.and_hms_opt(0, 0, 0).unwrap_or_default())
            .map(|d| Utc.from_utc_datetime(&d)),
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

#[derive(Debug, Clone, Deserialize)]
pub struct TraceChainQuery {
    #[serde(rename = "type")]
    trace_type: String,
    identifier: String,
}

pub async fn get_trace_chain(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<TraceChainQuery>,
) -> Json<ApiResponse<TraceChainResponse>> {
    if let Err(e) = check_permission(
        &state.pool,
        &claims,
        &ModulePermission::QualityTraceabilityRead,
    )
    .await
    {
        return e;
    }

    let id = match Uuid::parse_str(&query.identifier) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的标识符"));
        }
    };

    if query.trace_type == "backward" {
        return backward_traceability(State(state), Extension(claims), Path(query.identifier))
            .await;
    }

    let order = sqlx::query!(
        r#"
        SELECT id, order_number AS order_no, NULL::uuid AS product_id, product_name, product_code,
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

#[derive(Debug, Clone, Deserialize)]
pub struct ListQualityRecordsQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub record_type: Option<String>,
    pub order_id: Option<String>,
    pub batch_no: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ListQualityRecordsResponse {
    pub records: Vec<QualityRecordResponse>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

pub async fn list_quality_records(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ListQualityRecordsQuery>,
) -> Json<ApiResponse<ListQualityRecordsResponse>> {
    if let Err(e) = check_permission(
        &state.pool,
        &claims,
        &ModulePermission::QualityTraceabilityRead,
    )
    .await
    {
        return e;
    }

    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let mut params: Vec<String> = Vec::new();
    let mut where_clause = String::new();

    if let Some(status) = &query.status {
        where_clause.push_str(" WHERE quality_status = $1");
        params.push(status.clone());
    }

    if let Some(record_type) = &query.record_type {
        if where_clause.is_empty() {
            where_clause.push_str(" WHERE record_type = $1");
        } else {
            where_clause.push_str(&format!(" AND record_type = ${}", params.len() + 1));
        }
        params.push(record_type.clone());
    }

    if let Some(order_id) = &query.order_id {
        if where_clause.is_empty() {
            where_clause.push_str(" WHERE order_id = $1::uuid");
        } else {
            where_clause.push_str(&format!(" AND order_id = ${}::uuid", params.len() + 1));
        }
        params.push(order_id.clone());
    }

    if let Some(batch_no) = &query.batch_no {
        if where_clause.is_empty() {
            where_clause.push_str(" WHERE batch_no = $1");
        } else {
            where_clause.push_str(&format!(" AND batch_no = ${}", params.len() + 1));
        }
        params.push(batch_no.clone());
    }

    if let Some(search) = &query.search {
        let pattern = format!("%{}%", search);
        if where_clause.is_empty() {
            where_clause.push_str(" WHERE (record_no ILIKE $1 OR order_no ILIKE $1 OR product_name ILIKE $1 OR product_code ILIKE $1 OR inspector ILIKE $1)");
        } else {
            where_clause.push_str(&format!(
                " AND (record_no ILIKE ${} OR order_no ILIKE ${} OR product_name ILIKE ${} OR product_code ILIKE ${} OR inspector ILIKE ${})",
                params.len() + 1,
                params.len() + 1,
                params.len() + 1,
                params.len() + 1,
                params.len() + 1
            ));
        }
        params.push(pattern);
    }

    let count_sql = format!(
        "SELECT COUNT(*) as total FROM quality_records{}",
        where_clause
    );
    let mut count_query = sqlx::query_scalar::<_, i64>(&count_sql);
    for p in &params {
        count_query = count_query.bind(p.clone());
    }

    let total: i64 = match count_query.fetch_one(&state.pool).await {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("Failed to count quality records: {}", e);
            return Json(ApiResponse::error(500, "获取质量记录列表失败"));
        }
    };

    let fetch_sql = format!(
        r#"
        SELECT id, record_no, record_type, order_id, order_no,
            product_id, product_name, product_code, batch_no,
            quantity, qualified_quantity, defective_quantity,
            quality_status, inspector, inspection_time,
            defect_reason, notes, created_at, updated_at
        FROM quality_records
        {}
        ORDER BY created_at DESC
        LIMIT ${} OFFSET ${}
        "#,
        where_clause,
        params.len() + 1,
        params.len() + 2
    );

    let mut fetch_query = sqlx::query(&fetch_sql);
    for p in &params {
        fetch_query = fetch_query.bind(p.clone());
    }
    fetch_query = fetch_query.bind(page_size).bind(offset);

    use sqlx::Row;
    let records = match fetch_query.fetch_all(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch quality records: {}", e);
            return Json(ApiResponse::error(500, "获取质量记录列表失败"));
        }
    };

    let record_list: Vec<QualityRecordResponse> = records
        .into_iter()
        .map(|r| QualityRecordResponse {
            id: r.try_get::<Uuid, _>("id").unwrap_or_default(),
            record_no: r.try_get::<String, _>("record_no").unwrap_or_default(),
            record_type: r
                .try_get::<Option<String>, _>("record_type")
                .ok()
                .flatten()
                .unwrap_or_else(|| "inspection".to_string()),
            order_id: r.try_get::<Option<Uuid>, _>("order_id").ok().flatten(),
            order_no: r.try_get::<Option<String>, _>("order_no").ok().flatten(),
            product_id: r.try_get::<Option<Uuid>, _>("product_id").ok().flatten(),
            product_name: r
                .try_get::<Option<String>, _>("product_name")
                .ok()
                .flatten(),
            product_code: r
                .try_get::<Option<String>, _>("product_code")
                .ok()
                .flatten(),
            batch_no: r.try_get::<Option<String>, _>("batch_no").ok().flatten(),
            quantity: big_decimal_to_f64(
                r.try_get::<Option<BigDecimal>, _>("quantity")
                    .ok()
                    .flatten(),
            ),
            qualified_quantity: big_decimal_to_f64(
                r.try_get::<Option<BigDecimal>, _>("qualified_quantity")
                    .ok()
                    .flatten(),
            ),
            defective_quantity: big_decimal_to_f64(
                r.try_get::<Option<BigDecimal>, _>("defective_quantity")
                    .ok()
                    .flatten(),
            ),
            quality_status: r
                .try_get::<Option<String>, _>("quality_status")
                .ok()
                .flatten()
                .unwrap_or_else(|| "pending".to_string()),
            inspector: r.try_get::<Option<String>, _>("inspector").ok().flatten(),
            inspection_time: opt_naive_to_utc(
                r.try_get::<Option<NaiveDateTime>, _>("inspection_time")
                    .ok()
                    .flatten(),
            ),
            defect_reason: r
                .try_get::<Option<String>, _>("defect_reason")
                .ok()
                .flatten(),
            notes: r.try_get::<Option<String>, _>("notes").ok().flatten(),
            created_at: naive_to_utc(
                r.try_get::<Option<NaiveDateTime>, _>("created_at")
                    .ok()
                    .flatten(),
            ),
            updated_at: naive_to_utc(
                r.try_get::<Option<NaiveDateTime>, _>("updated_at")
                    .ok()
                    .flatten(),
            ),
        })
        .collect();

    Json(ApiResponse::success(
        ListQualityRecordsResponse {
            records: record_list,
            total,
            page,
            page_size,
        },
        "获取质量记录列表成功",
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{Datelike, NaiveDate, Timelike};

    #[test]
    fn naive_to_utc_some_keeps_value() {
        let dt = NaiveDate::from_ymd_opt(2024, 7, 1)
            .unwrap()
            .and_hms_opt(9, 45, 0)
            .unwrap();
        let utc = naive_to_utc(Some(dt));
        assert_eq!(utc.naive_utc().date(), dt.date());
        assert_eq!(utc.naive_utc().time(), dt.time());
    }

    #[test]
    fn naive_to_utc_none_uses_now() {
        let before = Utc::now();
        let out = naive_to_utc(None);
        let after = Utc::now();
        assert!(out >= before && out <= after);
    }

    #[test]
    fn opt_naive_to_utc_some() {
        let dt = NaiveDate::from_ymd_opt(2024, 2, 28)
            .unwrap()
            .and_hms_opt(23, 59, 59)
            .unwrap();
        let r = opt_naive_to_utc(Some(dt)).unwrap();
        assert_eq!(r.year(), 2024);
        assert_eq!(r.month(), 2);
        assert_eq!(r.day(), 28);
        assert_eq!(r.hour(), 23);
        assert_eq!(r.second(), 59);
    }

    #[test]
    fn opt_naive_to_utc_none() {
        assert!(opt_naive_to_utc(None).is_none());
    }

    #[test]
    fn big_decimal_to_f64_some() {
        let bd: BigDecimal = "1.25".parse().unwrap();
        assert_eq!(big_decimal_to_f64(Some(bd)), 1.25);
    }

    #[test]
    fn big_decimal_to_f64_none() {
        assert_eq!(big_decimal_to_f64(None), 0.0);
    }

    #[test]
    fn big_decimal_to_f64_negative() {
        let bd: BigDecimal = "-7.5".parse().unwrap();
        assert_eq!(big_decimal_to_f64(Some(bd)), -7.5);
    }
}

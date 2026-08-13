use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use uuid::Uuid;

use super::ApiState;
use crate::modules::audit::log_audit_event;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::PaginationParams;
use topems_shared_core::response::{api_error, ApiResponse};

// =============================================================================
// Pure functions for incoming inspection quality sampling & judgment
// =============================================================================

/// AQL 抽样方案：按 GB/T 2828.1 Level II 简化版
/// 根据批量 lot_size 查样本量 code letter → 样本大小
pub fn aql_sample_size(lot_size: u64) -> u64 {
    match lot_size {
        0 => 0,
        1..=8 => 2,
        9..=15 => 3,
        16..=25 => 5,
        26..=50 => 8,
        51..=90 => 13,
        91..=150 => 20,
        151..=280 => 32,
        281..=500 => 50,
        501..=1200 => 80,
        1201..=3200 => 125,
        3201..=10000 => 200,
        10001..=35000 => 315,
        35001..=150000 => 500,
        150001..=500000 => 800,
        _ => 1250,
    }
}

/// AQL 判定（简化 AQL 1.0 常用水平）：给定样本量和不合格数 → pass/fail
/// 接收数 (Ac) 按 sample_size 上限近似；reject = Ac + 1
pub fn aql_judge(sample_size: u64, defect_count: u64) -> &'static str {
    if sample_size == 0 {
        return "no_sample";
    }
    if defect_count > sample_size {
        return "invalid"; // 缺陷数不能超过样本数
    }
    // Ac 阈值按样本规模阶梯
    let accept = match sample_size {
        0..=8 => 0,
        9..=13 => 0,
        14..=20 => 0,
        21..=32 => 1,
        33..=50 => 1,
        51..=80 => 2,
        81..=125 => 3,
        126..=200 => 5,
        201..=315 => 7,
        316..=500 => 10,
        501..=800 => 14,
        _ => 21,
    };
    if defect_count <= accept {
        "pass"
    } else {
        "fail"
    }
}

/// 批次合格率：passed / total * 100，total=0 返回 0
pub fn batch_pass_rate(total_items: u64, passed_items: u64) -> f64 {
    if total_items == 0 || passed_items > total_items {
        return 0.0;
    }
    passed_items as f64 / total_items as f64 * 100.0
}

/// 采购物资的验收等级 (based on pass rate %)
pub fn acceptance_grade(pass_rate: f64) -> &'static str {
    match pass_rate {
        r if r >= 99.0 => "excellent",
        r if r >= 95.0 => "good",
        r if r >= 90.0 => "qualified",
        r if r >= 80.0 => "conditional",
        _ => "rejected",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_aql_sample_size() {
        assert_eq!(aql_sample_size(0), 0);
        assert_eq!(aql_sample_size(5), 2);
        assert_eq!(aql_sample_size(10), 3);
        assert_eq!(aql_sample_size(20), 5);
        assert_eq!(aql_sample_size(40), 8);
        assert_eq!(aql_sample_size(80), 13);
        assert_eq!(aql_sample_size(120), 20);
        assert_eq!(aql_sample_size(200), 32);
        assert_eq!(aql_sample_size(400), 50);
        assert_eq!(aql_sample_size(800), 80);
        assert_eq!(aql_sample_size(2000), 125);
        assert_eq!(aql_sample_size(5000), 200);
        assert_eq!(aql_sample_size(20000), 315);
        assert_eq!(aql_sample_size(100_000), 500);
        assert_eq!(aql_sample_size(300_000), 800);
        assert_eq!(aql_sample_size(1_000_000), 1250);
    }

    #[test]
    fn test_aql_judge_pass() {
        // small sample 20 with 0 defect → pass
        assert_eq!(aql_judge(20, 0), "pass");
        // sample 50: Ac=1, 1 defect pass
        assert_eq!(aql_judge(50, 1), "pass");
        // sample 80: Ac=2, 2 defect pass
        assert_eq!(aql_judge(80, 2), "pass");
    }

    #[test]
    fn test_aql_judge_fail() {
        // sample 20: Ac=0, 1 defect fail
        assert_eq!(aql_judge(20, 1), "fail");
        // sample 50: Ac=1, 2 defect fail
        assert_eq!(aql_judge(50, 2), "fail");
    }

    #[test]
    fn test_aql_judge_edge_cases() {
        assert_eq!(aql_judge(0, 0), "no_sample");
        assert_eq!(aql_judge(10, 20), "invalid");
    }

    #[test]
    fn test_batch_pass_rate() {
        assert_eq!(batch_pass_rate(100, 95), 95.0);
        assert_eq!(batch_pass_rate(0, 0), 0.0);
        assert_eq!(batch_pass_rate(100, 100), 100.0);
        assert_eq!(batch_pass_rate(100, 0), 0.0);
        // passed > total → 0
        assert_eq!(batch_pass_rate(100, 150), 0.0);
    }

    #[test]
    fn test_acceptance_grade() {
        assert_eq!(acceptance_grade(100.0), "excellent");
        assert_eq!(acceptance_grade(99.0), "excellent");
        assert_eq!(acceptance_grade(97.0), "good");
        assert_eq!(acceptance_grade(95.0), "good");
        assert_eq!(acceptance_grade(92.0), "qualified");
        assert_eq!(acceptance_grade(90.0), "qualified");
        assert_eq!(acceptance_grade(85.0), "conditional");
        assert_eq!(acceptance_grade(80.0), "conditional");
        assert_eq!(acceptance_grade(79.9), "rejected");
        assert_eq!(acceptance_grade(0.0), "rejected");
    }
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/incoming-notices", get(list_notices).post(create_notice))
        .route("/incoming-notices/{id}", get(get_notice).put(update_notice))
        .route(
            "/incoming-inspections",
            get(list_inspections).post(create_inspection),
        )
        .route(
            "/incoming-inspections/{id}",
            get(get_inspection).put(update_inspection),
        )
        .route("/incoming-inspections/{id}/pass", post(inspection_pass))
        .route("/incoming-inspections/{id}/fail", post(inspection_fail))
}

fn notice_row_to_json(row: &sqlx::postgres::PgRow) -> serde_json::Value {
    serde_json::json!({
        "id": row.try_get::<Uuid, _>("id").ok(),
        "notice_number": row.try_get::<String, _>("notice_number").ok(),
        "purchase_order_id": row.try_get::<Option<Uuid>, _>("purchase_order_id").ok(),
        "purchase_order_number": row.try_get::<Option<String>, _>("purchase_order_number").ok(),
        "supplier_id": row.try_get::<Option<Uuid>, _>("supplier_id").ok(),
        "supplier_name": row.try_get::<Option<String>, _>("supplier_name").ok(),
        "warehouse_id": row.try_get::<Option<Uuid>, _>("warehouse_id").ok(),
        "warehouse_name": row.try_get::<Option<String>, _>("warehouse_name").ok(),
        "expected_arrival_date": row.try_get::<Option<chrono::NaiveDate>, _>("expected_arrival_date").ok(),
        "actual_arrival_date": row.try_get::<Option<chrono::NaiveDate>, _>("actual_arrival_date").ok(),
        "status": row.try_get::<String, _>("status").ok(),
        "total_quantity": row.try_get::<f64, _>("total_quantity").ok(),
        "inspection_required": row.try_get::<bool, _>("inspection_required").ok(),
        "remarks": row.try_get::<Option<String>, _>("remarks").ok(),
        "created_at": row.try_get::<chrono::NaiveDateTime, _>("created_at").ok().map(|t| t.to_string()),
        "updated_at": row.try_get::<chrono::NaiveDateTime, _>("updated_at").ok().map(|t| t.to_string()),
    })
}

fn inspection_row_to_json(row: &sqlx::postgres::PgRow) -> serde_json::Value {
    serde_json::json!({
        "id": row.try_get::<Uuid, _>("id").ok(),
        "inspection_number": row.try_get::<String, _>("inspection_number").ok(),
        "notice_id": row.try_get::<Uuid, _>("notice_id").ok(),
        "notice_number": row.try_get::<Option<String>, _>("notice_number").ok(),
        "material_code": row.try_get::<String, _>("material_code").ok(),
        "material_name": row.try_get::<String, _>("material_name").ok(),
        "specification": row.try_get::<Option<String>, _>("specification").ok(),
        "unit": row.try_get::<Option<String>, _>("unit").ok(),
        "batch_number": row.try_get::<Option<String>, _>("batch_number").ok(),
        "inspected_quantity": row.try_get::<f64, _>("inspected_quantity").ok(),
        "passed_quantity": row.try_get::<f64, _>("passed_quantity").ok(),
        "failed_quantity": row.try_get::<f64, _>("failed_quantity").ok(),
        "sampling_quantity": row.try_get::<f64, _>("sampling_quantity").ok(),
        "inspection_result": row.try_get::<String, _>("inspection_result").ok(),
        "inspection_date": row.try_get::<Option<chrono::NaiveDate>, _>("inspection_date").ok(),
        "inspector_id": row.try_get::<Option<Uuid>, _>("inspector_id").ok(),
        "inspector_name": row.try_get::<Option<String>, _>("inspector_name").ok(),
        "inbound_order_id": row.try_get::<Option<Uuid>, _>("inbound_order_id").ok(),
        "inbound_order_number": row.try_get::<Option<String>, _>("inbound_order_number").ok(),
        "status": row.try_get::<String, _>("status").ok(),
        "inspection_items": row.try_get::<Option<serde_json::Value>, _>("inspection_items").ok(),
        "remarks": row.try_get::<Option<String>, _>("remarks").ok(),
        "created_at": row.try_get::<chrono::NaiveDateTime, _>("created_at").ok().map(|t| t.to_string()),
        "updated_at": row.try_get::<chrono::NaiveDateTime, _>("updated_at").ok().map(|t| t.to_string()),
    })
}

async fn list_notices(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query(
        r#"
        SELECT id, notice_number, purchase_order_id, purchase_order_number,
               supplier_id, supplier_name, warehouse_id, warehouse_name,
               expected_arrival_date, actual_arrival_date, status,
               total_quantity, inspection_required, remarks, created_at, updated_at
        FROM scm.incoming_notices
        WHERE ($1::text IS NULL OR notice_number ILIKE $1 OR supplier_name ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(items) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM scm.incoming_notices
                WHERE ($1::text IS NULL OR notice_number ILIKE $1 OR supplier_name ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                "#,
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);
            let items_json: Vec<serde_json::Value> = items.iter().map(notice_row_to_json).collect();

            Json(ApiResponse::success(
                serde_json::json!({
                    "notices": items_json,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取到货通知单列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取到货通知单列表失败: {}", e);
            Json(api_error(500, "获取到货通知单列表失败"))
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateIncomingNoticeRequest {
    pub purchase_order_id: Option<Uuid>,
    pub purchase_order_number: Option<String>,
    pub supplier_id: Option<Uuid>,
    pub supplier_name: Option<String>,
    pub warehouse_id: Option<Uuid>,
    pub warehouse_name: Option<String>,
    pub expected_arrival_date: Option<chrono::NaiveDate>,
    pub total_quantity: f64,
    pub inspection_required: Option<bool>,
    pub remarks: Option<String>,
}

async fn create_notice(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateIncomingNoticeRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();
    let id = Uuid::new_v4();
    let now = Utc::now();
    let notice_number = format!("ASN{}", now.format("%Y%m%d%H%M%S"));
    let inspection_required = req.inspection_required.unwrap_or(true);

    let result = sqlx::query(
        r#"
        INSERT INTO scm.incoming_notices 
        (id, notice_number, purchase_order_id, purchase_order_number,
         supplier_id, supplier_name, warehouse_id, warehouse_name,
         expected_arrival_date, status, total_quantity, inspection_required,
         remarks, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', $10, $11, $12, $13, $14)
        RETURNING id, notice_number, purchase_order_id, purchase_order_number,
                  supplier_id, supplier_name, warehouse_id, warehouse_name,
                  expected_arrival_date, actual_arrival_date, status,
                  total_quantity, inspection_required, remarks, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&notice_number)
    .bind(req.purchase_order_id)
    .bind(&req.purchase_order_number)
    .bind(req.supplier_id)
    .bind(&req.supplier_name)
    .bind(req.warehouse_id)
    .bind(&req.warehouse_name)
    .bind(req.expected_arrival_date)
    .bind(req.total_quantity)
    .bind(inspection_required)
    .bind(&req.remarks)
    .bind(now.naive_utc())
    .bind(now.naive_utc())
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg, response_data) = match &result {
        Ok(row) => (
            Json(ApiResponse::success(
                notice_row_to_json(row),
                "到货通知单创建成功",
            )),
            "success",
            None,
            Some(notice_row_to_json(row)),
        ),
        Err(e) => {
            tracing::error!("创建到货通知单失败: {}", e);
            (
                Json(api_error(500, "创建到货通知单失败")),
                "error",
                Some(e.to_string()),
                None,
            )
        }
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "incoming_notice".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn get_notice(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let result = sqlx::query(
        r#"
        SELECT id, notice_number, purchase_order_id, purchase_order_number,
               supplier_id, supplier_name, warehouse_id, warehouse_name,
               expected_arrival_date, actual_arrival_date, status,
               total_quantity, inspection_required, remarks, created_at, updated_at
        FROM scm.incoming_notices WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(row)) => Json(ApiResponse::success(
            notice_row_to_json(&row),
            "获取到货通知单详情成功",
        )),
        Ok(None) => Json(api_error(404, "到货通知单不存在")),
        Err(e) => {
            tracing::error!("获取到货通知单详情失败: {}", e);
            Json(api_error(500, "获取到货通知单详情失败"))
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateIncomingNoticeRequest {
    pub status: Option<String>,
    pub actual_arrival_date: Option<chrono::NaiveDate>,
    pub remarks: Option<String>,
}

async fn update_notice(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateIncomingNoticeRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();
    let now = Utc::now().naive_utc();

    let existing = sqlx::query(
        r#"
        SELECT id, notice_number, status, actual_arrival_date, remarks
        FROM scm.incoming_notices WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(e) => e,
        Err(_) => return Json(api_error(500, "查询到货通知单失败")),
    };
    if existing.is_none() {
        return Json(api_error(404, "到货通知单不存在"));
    }

    let result = sqlx::query(
        r#"
        UPDATE scm.incoming_notices SET
            status = COALESCE($2, status),
            actual_arrival_date = COALESCE($3, actual_arrival_date),
            remarks = CASE 
                WHEN remarks IS NOT NULL AND $4 IS NOT NULL THEN remarks || ' | ' || $4
                ELSE COALESCE(remarks, $4)
            END,
            updated_at = $5
        WHERE id = $1
        RETURNING id, notice_number, purchase_order_id, purchase_order_number,
                  supplier_id, supplier_name, warehouse_id, warehouse_name,
                  expected_arrival_date, actual_arrival_date, status,
                  total_quantity, inspection_required, remarks, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.status)
    .bind(req.actual_arrival_date)
    .bind(&req.remarks)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg, response_data) = match &result {
        Ok(row) => (
            Json(ApiResponse::success(
                notice_row_to_json(row),
                "到货通知单更新成功",
            )),
            "success",
            None,
            Some(notice_row_to_json(row)),
        ),
        Err(e) => {
            tracing::error!("更新到货通知单失败: {}", e);
            (
                Json(api_error(500, "更新到货通知单失败")),
                "error",
                Some(e.to_string()),
                None,
            )
        }
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "incoming_notice".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers,
    )
    .await;

    response
}

pub async fn list_inspections(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query(
        r#"
        SELECT id, inspection_number, notice_id, notice_number,
               material_code, material_name, specification, unit,
               batch_number, inspected_quantity, passed_quantity, failed_quantity,
               sampling_quantity, inspection_result, inspection_date,
               inspector_id, inspector_name, inbound_order_id, inbound_order_number,
               status, inspection_items, remarks, created_at, updated_at
        FROM scm.incoming_inspections
        WHERE ($1::text IS NULL OR inspection_number ILIKE $1 OR material_name ILIKE $1 OR material_code ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(items) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM scm.incoming_inspections
                WHERE ($1::text IS NULL OR inspection_number ILIKE $1 OR material_name ILIKE $1 OR material_code ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                "#,
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);
            let items_json: Vec<serde_json::Value> =
                items.iter().map(inspection_row_to_json).collect();

            Json(ApiResponse::success(
                serde_json::json!({
                    "inspections": items_json,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取检验记录列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取检验记录列表失败: {}", e);
            Json(api_error(500, "获取检验记录列表失败"))
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateInspectionRequest {
    pub notice_id: Uuid,
    pub material_code: String,
    pub material_name: String,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub batch_number: Option<String>,
    pub inspected_quantity: f64,
    pub sampling_quantity: Option<f64>,
    pub inspection_items: Option<serde_json::Value>,
    pub remarks: Option<String>,
}

pub async fn create_inspection(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateInspectionRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();
    let id = Uuid::new_v4();
    let now = Utc::now();
    let inspection_number = format!("IQC{}", now.format("%Y%m%d%H%M%S"));

    let notice_info = sqlx::query("SELECT notice_number FROM scm.incoming_notices WHERE id = $1")
        .bind(req.notice_id)
        .fetch_optional(&state.db)
        .await;

    let notice_number: Option<String> = notice_info
        .ok()
        .flatten()
        .and_then(|row| row.try_get("notice_number").ok());

    let result = sqlx::query(
        r#"
        INSERT INTO scm.incoming_inspections 
        (id, inspection_number, notice_id, notice_number,
         material_code, material_name, specification, unit,
         batch_number, inspected_quantity, passed_quantity, failed_quantity,
         sampling_quantity, inspection_result, status, inspection_items,
         remarks, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0, 0, $11, 'pending', 'pending', $12, $13, $14, $15)
        RETURNING id, inspection_number, notice_id, notice_number,
                  material_code, material_name, specification, unit,
                  batch_number, inspected_quantity, passed_quantity, failed_quantity,
                  sampling_quantity, inspection_result, inspection_date,
                  inspector_id, inspector_name, inbound_order_id, inbound_order_number,
                  status, inspection_items, remarks, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&inspection_number)
    .bind(req.notice_id)
    .bind(&notice_number)
    .bind(&req.material_code)
    .bind(&req.material_name)
    .bind(&req.specification)
    .bind(&req.unit)
    .bind(&req.batch_number)
    .bind(req.inspected_quantity)
    .bind(req.sampling_quantity)
    .bind(&req.inspection_items)
    .bind(&req.remarks)
    .bind(now.naive_utc())
    .bind(now.naive_utc())
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg, response_data) = match &result {
        Ok(row) => (
            Json(ApiResponse::success(
                inspection_row_to_json(row),
                "检验记录创建成功",
            )),
            "success",
            None,
            Some(inspection_row_to_json(row)),
        ),
        Err(e) => {
            tracing::error!("创建检验记录失败: {}", e);
            (
                Json(api_error(500, "创建检验记录失败")),
                "error",
                Some(e.to_string()),
                None,
            )
        }
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "incoming_inspection".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers,
    )
    .await;

    response
}

pub async fn get_inspection(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let result = sqlx::query(
        r#"
        SELECT id, inspection_number, notice_id, notice_number,
               material_code, material_name, specification, unit,
               batch_number, inspected_quantity, passed_quantity, failed_quantity,
               sampling_quantity, inspection_result, inspection_date,
               inspector_id, inspector_name, inbound_order_id, inbound_order_number,
               status, inspection_items, remarks, created_at, updated_at
        FROM scm.incoming_inspections WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(row)) => Json(ApiResponse::success(
            inspection_row_to_json(&row),
            "获取检验记录详情成功",
        )),
        Ok(None) => Json(api_error(404, "检验记录不存在")),
        Err(e) => {
            tracing::error!("获取检验记录详情失败: {}", e);
            Json(api_error(500, "获取检验记录详情失败"))
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateInspectionRequest {
    pub passed_quantity: Option<f64>,
    pub failed_quantity: Option<f64>,
    pub inspection_items: Option<serde_json::Value>,
    pub remarks: Option<String>,
}

pub async fn update_inspection(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateInspectionRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();
    let now = Utc::now().naive_utc();

    let existing = sqlx::query("SELECT id, status FROM scm.incoming_inspections WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.db)
        .await;

    let existing = match existing {
        Ok(e) => e,
        Err(_) => return Json(api_error(500, "查询检验记录失败")),
    };
    if existing.is_none() {
        return Json(api_error(404, "检验记录不存在"));
    }

    let result = sqlx::query(
        r#"
        UPDATE scm.incoming_inspections SET
            passed_quantity = COALESCE($2, passed_quantity),
            failed_quantity = COALESCE($3, failed_quantity),
            inspection_items = COALESCE($4, inspection_items),
            remarks = CASE 
                WHEN remarks IS NOT NULL AND $5 IS NOT NULL THEN remarks || ' | ' || $5
                ELSE COALESCE(remarks, $5)
            END,
            updated_at = $6
        WHERE id = $1
        RETURNING id, inspection_number, notice_id, notice_number,
                  material_code, material_name, specification, unit,
                  batch_number, inspected_quantity, passed_quantity, failed_quantity,
                  sampling_quantity, inspection_result, inspection_date,
                  inspector_id, inspector_name, inbound_order_id, inbound_order_number,
                  status, inspection_items, remarks, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(req.passed_quantity)
    .bind(req.failed_quantity)
    .bind(&req.inspection_items)
    .bind(&req.remarks)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg, response_data) = match &result {
        Ok(row) => (
            Json(ApiResponse::success(
                inspection_row_to_json(row),
                "检验记录更新成功",
            )),
            "success",
            None,
            Some(inspection_row_to_json(row)),
        ),
        Err(e) => {
            tracing::error!("更新检验记录失败: {}", e);
            (
                Json(api_error(500, "更新检验记录失败")),
                "error",
                Some(e.to_string()),
                None,
            )
        }
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "incoming_inspection".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers,
    )
    .await;

    response
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct InspectionResultRequest {
    pub passed_quantity: f64,
    pub failed_quantity: Option<f64>,
    pub inspector_name: Option<String>,
    pub remarks: Option<String>,
}

pub async fn inspection_pass(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<InspectionResultRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();
    let now = Utc::now().naive_utc();

    let existing = sqlx::query(
        "SELECT id, status, inspected_quantity FROM scm.incoming_inspections WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(row)) => row,
        Ok(None) => return Json(api_error(404, "检验记录不存在")),
        Err(e) => return Json(api_error(500, &format!("查询检验记录失败: {}", e))),
    };

    let status: String = existing.try_get("status").unwrap_or_default();
    if status == "passed" || status == "failed" {
        return Json(api_error(400, "检验记录已完成，无法重复操作"));
    }

    let failed_qty = req.failed_quantity.unwrap_or_else(|| {
        let inspected: f64 = existing.try_get("inspected_quantity").unwrap_or(0.0);
        (inspected - req.passed_quantity).max(0.0)
    });

    let result = sqlx::query(
        r#"
        UPDATE scm.incoming_inspections SET
            status = 'passed',
            inspection_result = 'pass',
            passed_quantity = $2,
            failed_quantity = $3,
            inspection_date = CURRENT_DATE,
            inspector_name = COALESCE($4, inspector_name),
            remarks = CASE 
                WHEN remarks IS NOT NULL THEN remarks || ' | 检验合格'
                ELSE '检验合格'
            END || CASE WHEN $5 IS NOT NULL THEN ': ' || $5 ELSE '' END,
            updated_at = $6
        WHERE id = $1
        RETURNING id, inspection_number, notice_id, notice_number,
                  material_code, material_name, specification, unit,
                  batch_number, inspected_quantity, passed_quantity, failed_quantity,
                  sampling_quantity, inspection_result, inspection_date,
                  inspector_id, inspector_name, inbound_order_id, inbound_order_number,
                  status, inspection_items, remarks, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(req.passed_quantity)
    .bind(failed_qty)
    .bind(&req.inspector_name)
    .bind(&req.remarks)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg, response_data) = match &result {
        Ok(row) => (
            Json(ApiResponse::success(
                inspection_row_to_json(row),
                "检验合格处理成功",
            )),
            "success",
            None,
            Some(inspection_row_to_json(row)),
        ),
        Err(e) => {
            tracing::error!("检验合格处理失败: {}", e);
            (
                Json(api_error(500, "检验合格处理失败")),
                "error",
                Some(e.to_string()),
                None,
            )
        }
    };

    log_audit_event(
        &state.db,
        "pass".to_string(),
        "incoming_inspection".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers,
    )
    .await;

    response
}

pub async fn inspection_fail(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<InspectionResultRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();
    let now = Utc::now().naive_utc();

    let existing = sqlx::query(
        "SELECT id, status, inspected_quantity FROM scm.incoming_inspections WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(row)) => row,
        Ok(None) => return Json(api_error(404, "检验记录不存在")),
        Err(e) => return Json(api_error(500, &format!("查询检验记录失败: {}", e))),
    };

    let status: String = existing.try_get("status").unwrap_or_default();
    if status == "passed" || status == "failed" {
        return Json(api_error(400, "检验记录已完成，无法重复操作"));
    }

    let passed_qty = req.passed_quantity;
    let failed_qty = req.failed_quantity.unwrap_or_else(|| {
        let inspected: f64 = existing.try_get("inspected_quantity").unwrap_or(0.0);
        (inspected - passed_qty).max(0.0)
    });

    let result = sqlx::query(
        r#"
        UPDATE scm.incoming_inspections SET
            status = 'failed',
            inspection_result = 'fail',
            passed_quantity = $2,
            failed_quantity = $3,
            inspection_date = CURRENT_DATE,
            inspector_name = COALESCE($4, inspector_name),
            remarks = CASE 
                WHEN remarks IS NOT NULL THEN remarks || ' | 检验不合格'
                ELSE '检验不合格'
            END || CASE WHEN $5 IS NOT NULL THEN ': ' || $5 ELSE '' END,
            updated_at = $6
        WHERE id = $1
        RETURNING id, inspection_number, notice_id, notice_number,
                  material_code, material_name, specification, unit,
                  batch_number, inspected_quantity, passed_quantity, failed_quantity,
                  sampling_quantity, inspection_result, inspection_date,
                  inspector_id, inspector_name, inbound_order_id, inbound_order_number,
                  status, inspection_items, remarks, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(passed_qty)
    .bind(failed_qty)
    .bind(&req.inspector_name)
    .bind(&req.remarks)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg, response_data) = match &result {
        Ok(row) => (
            Json(ApiResponse::success(
                inspection_row_to_json(row),
                "检验不合格处理成功",
            )),
            "success",
            None,
            Some(inspection_row_to_json(row)),
        ),
        Err(e) => {
            tracing::error!("检验不合格处理失败: {}", e);
            (
                Json(api_error(500, "检验不合格处理失败")),
                "error",
                Some(e.to_string()),
                None,
            )
        }
    };

    log_audit_event(
        &state.db,
        "fail".to_string(),
        "incoming_inspection".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers,
    )
    .await;

    response
}

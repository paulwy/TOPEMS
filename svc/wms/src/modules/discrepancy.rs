use axum::{
    extract::{Extension, FromRef, Path, Query, State},
    http::HeaderMap,
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use crate::models::inventory_alert::{
    ApproveDiscrepancyRequest, CreateDiscrepancyRequest, DiscrepancyRecord,
};
use crate::modules::audit::log_audit_event;
use crate::modules::ApiState;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::{api_error, ApiResponse};

#[derive(Debug, Deserialize)]
pub struct DiscrepancyQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub stock_take_id: Option<Uuid>,
    pub adjustment_status: Option<String>,
}

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct DiscrepancySummary {
    pub total_count: i64,
    pub pending_count: i64,
    pub approved_count: i64,
    pub completed_count: i64,
    pub total_discrepancy: Option<f64>,
}

pub fn create_routes<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
    ApiState: FromRef<S>,
{
    Router::new()
        .route(
            "/discrepancies",
            get(list_discrepancies).post(create_discrepancy),
        )
        .route("/discrepancies/{id}", get(get_discrepancy))
        .route("/discrepancies/{id}/approve", post(approve_discrepancy))
        .route("/discrepancies/{id}/adjust", post(adjust_inventory))
        .route(
            "/discrepancies/process-stock-take/{stock_take_id}",
            post(process_stock_take_discrepancies),
        )
}

/// 获取差异处理列表
pub async fn list_discrepancies(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<DiscrepancyQueryParams>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;
    let stock_take_id = params.stock_take_id;
    let adjustment_status = params.adjustment_status;

    let result = sqlx::query_as::<_, DiscrepancyRecord>(only_own_schema_query!(
        "wms",
        r#"
        SELECT id, stock_take_id, stock_take_item_id, inventory_id, material_code, material_name,
               system_quantity, counted_quantity, discrepancy_quantity, discrepancy_type,
               adjustment_quantity, adjustment_status, approved_by, approval_date,
               adjustment_date, reason, notes, created_at, updated_at
        FROM wms.discrepancy_records
        WHERE ($1::uuid IS NULL OR stock_take_id = $1)
          AND ($2::text IS NULL OR adjustment_status = $2)
          AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#
    ))
    .bind(stock_take_id)
    .bind(&adjustment_status)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(records) => {
            let count_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "wms",
                r#"
                SELECT COUNT(*) FROM wms.discrepancy_records
                WHERE ($1::uuid IS NULL OR stock_take_id = $1)
                  AND ($2::text IS NULL OR adjustment_status = $2)
                  AND deleted_at IS NULL
                "#
            ))
            .bind(stock_take_id)
            .bind(&adjustment_status)
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);

            // 统计汇总
            let summary = sqlx::query_as::<_, DiscrepancySummary>(
                only_own_schema_query!("wms", r#"
                SELECT 
                    COUNT(*) as total_count,
                    SUM(CASE WHEN adjustment_status = 'pending' THEN 1 ELSE 0 END) as pending_count,
                    SUM(CASE WHEN adjustment_status = 'approved' THEN 1 ELSE 0 END) as approved_count,
                    SUM(CASE WHEN adjustment_status = 'completed' THEN 1 ELSE 0 END) as completed_count,
                    SUM(discrepancy_quantity) as total_discrepancy
                FROM wms.discrepancy_records
                WHERE ($1::uuid IS NULL OR stock_take_id = $1)
                  AND ($2::text IS NULL OR adjustment_status = $2)
                  AND deleted_at IS NULL
                "#),
            )
            .bind(stock_take_id)
            .bind(&adjustment_status)
            .fetch_one(&mut **txn)
            .await;

            let summary = match summary {
                Ok(s) => s,
                Err(e) => {
                    tracing::error!("获取差异汇总失败: {}", e);
                    DiscrepancySummary {
                        total_count: 0,
                        pending_count: 0,
                        approved_count: 0,
                        completed_count: 0,
                        total_discrepancy: None,
                    }
                }
            };

            Json(ApiResponse::success(
                serde_json::json!({
                    "records": records,
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                    "summary": summary
                }),
                "获取差异处理列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取差异处理列表失败: {}", e);
            Json(api_error(500, "获取差异处理列表失败"))
        }
    }
}

/// 获取差异处理详情
pub async fn get_discrepancy(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<DiscrepancyRecord>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let result = sqlx::query_as::<_, DiscrepancyRecord>(only_own_schema_query!(
        "wms",
        r#"
        SELECT id, stock_take_id, stock_take_item_id, inventory_id, material_code, material_name,
               system_quantity, counted_quantity, discrepancy_quantity, discrepancy_type,
               adjustment_quantity, adjustment_status, approved_by, approval_date,
               adjustment_date, reason, notes, created_at, updated_at
        FROM wms.discrepancy_records
        WHERE id = $1 AND deleted_at IS NULL
        "#
    ))
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(record)) => Json(ApiResponse::success(record, "获取差异处理详情成功")),
        Ok(None) => Json(api_error(404, "差异处理记录不存在")),
        Err(e) => {
            tracing::error!("获取差异处理详情失败: {}", e);
            Json(api_error(500, "获取差异处理详情失败"))
        }
    }
}

/// 创建差异处理记录
pub async fn create_discrepancy(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CreateDiscrepancyRequest>,
) -> Json<ApiResponse<DiscrepancyRecord>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let request_data = serde_json::to_value(&req).ok();
    let id = Uuid::new_v4();
    let now = Utc::now();

    // 获取盘点明细信息
    let stock_take_item = sqlx::query!(
        r#"
        SELECT sti.id, sti.stock_take_id, sti.material_code, sti.material_name,
               sti.system_quantity, sti.counted_quantity, sti.discrepancy_quantity,
               i.id as inventory_id
        FROM wms.stock_take_items sti
        JOIN wms.inventory i ON sti.material_code = i.material_code
        WHERE sti.id = $1
        "#,
        req.stock_take_item_id
    )
    .fetch_optional(&mut **txn)
    .await;

    let stock_take_item = match stock_take_item {
        Ok(Some(item)) => item,
        Ok(None) => return Json(api_error(404, "盘点明细不存在")),
        Err(e) => return Json(api_error(500, &format!("查询盘点明细失败: {}", e))),
    };

    let discrepancy_type = if req.adjustment_quantity > 0.0 {
        "over"
    } else if req.adjustment_quantity < 0.0 {
        "under"
    } else {
        "none"
    };

    let result = sqlx::query_as::<_, DiscrepancyRecord>(only_own_schema_query!(
        "wms",
        r#"
        INSERT INTO wms.discrepancy_records (
            id, stock_take_id, stock_take_item_id, inventory_id, material_code, material_name,
            system_quantity, counted_quantity, discrepancy_quantity, discrepancy_type,
            adjustment_quantity, adjustment_status, reason, notes, created_at, updated_at,
            tenant_id, organization_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', $12, $13, $14, $15, $16, '00000000-0000-0000-0000-000000000001')
        RETURNING id, stock_take_id, stock_take_item_id, inventory_id, material_code, material_name,
                  system_quantity, counted_quantity, discrepancy_quantity, discrepancy_type,
                  adjustment_quantity, adjustment_status, approved_by, approval_date,
                  adjustment_date, reason, notes, created_at, updated_at
        "#
    ))
    .bind(id)
    .bind(stock_take_item.stock_take_id)
    .bind(req.stock_take_item_id)
    .bind(stock_take_item.inventory_id)
    .bind(&stock_take_item.material_code)
    .bind(&stock_take_item.material_name)
    .bind(stock_take_item.system_quantity)
    .bind(stock_take_item.counted_quantity)
    .bind(stock_take_item.discrepancy_quantity)
    .bind(discrepancy_type)
    .bind(req.adjustment_quantity)
    .bind(&req.reason)
    .bind(&req.notes)
    .bind(now)
    .bind(now)
    .bind(claims.tenant_id.as_deref().and_then(|s| Uuid::parse_str(s).ok()).unwrap_or(Uuid::nil()))
    .fetch_one(&mut **txn)
    .await;

    let (response, status, error_msg) = match &result {
        Ok(record) => (
            Json(ApiResponse::success(record.clone(), "差异处理记录创建成功")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("创建差异处理记录失败: {}", e);
            (
                Json(api_error(500, "差异处理记录创建失败")),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(record) = &result {
        serde_json::to_value(record).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "discrepancy_record".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status.to_string(),
        error_msg,
        &headers,
    )
    .await;

    response
}

/// 审批差异处理
pub async fn approve_discrepancy(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<ApproveDiscrepancyRequest>,
) -> Json<ApiResponse<DiscrepancyRecord>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let now = Utc::now();
    let approval_status = match req.action.as_str() {
        "approve" => "approved",
        "reject" => "rejected",
        _ => return Json(api_error(400, "无效的操作类型")),
    };

    let result = sqlx::query_as::<_, DiscrepancyRecord>(
        only_own_schema_query!("wms", r#"
        UPDATE wms.discrepancy_records SET
            adjustment_status = $2, approved_by = $3, approval_date = $4, notes = COALESCE($5, notes), updated_at = $6
        WHERE id = $1 AND adjustment_status = 'pending'
        RETURNING id, stock_take_id, stock_take_item_id, inventory_id, material_code, material_name,
                  system_quantity, counted_quantity, discrepancy_quantity, discrepancy_type,
                  adjustment_quantity, adjustment_status, approved_by, approval_date,
                  adjustment_date, reason, notes, created_at, updated_at
        "#),
    )
    .bind(id)
    .bind(approval_status)
    .bind(claims.sub.to_string())
    .bind(now)
    .bind(&req.notes)
    .bind(now)
    .fetch_optional(&mut **txn)
    .await;

    let (response, status, error_msg) = match &result {
        Ok(Some(record)) => (
            Json(ApiResponse::success(
                record.clone(),
                &format!(
                    "差异处理{}成功",
                    if req.action == "approve" {
                        "审批通过"
                    } else {
                        "审批拒绝"
                    }
                ),
            )),
            "success",
            None,
        ),
        Ok(None) => (
            Json(api_error(400, "差异处理记录不存在或已处理")),
            "error",
            Some("记录不存在或已处理".to_string()),
        ),
        Err(e) => {
            tracing::error!("审批差异处理失败: {}", e);
            (
                Json(api_error(500, "审批差异处理失败")),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(record) = &result {
        serde_json::to_value(record).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "approve".to_string(),
        "discrepancy_record".to_string(),
        Some(id),
        None,
        None,
        None,
        None,
        response_data,
        status.to_string(),
        error_msg,
        &headers,
    )
    .await;

    response
}

/// 执行库存调整
pub async fn adjust_inventory(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let now = Utc::now();

    // 获取已审批的差异处理记录
    let record = sqlx::query_as::<_, DiscrepancyRecord>(only_own_schema_query!(
        "wms",
        r#"
        SELECT id, stock_take_id, stock_take_item_id, inventory_id, material_code, material_name,
               system_quantity, counted_quantity, discrepancy_quantity, discrepancy_type,
               adjustment_quantity, adjustment_status, approved_by, approval_date,
               adjustment_date, reason, notes, created_at, updated_at
        FROM wms.discrepancy_records
        WHERE id = $1 AND adjustment_status = 'approved' AND deleted_at IS NULL
        "#
    ))
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    let record = match record {
        Ok(Some(r)) => r,
        Ok(None) => return Json(api_error(400, "差异处理记录不存在或未审批")),
        Err(e) => return Json(api_error(500, &format!("查询差异处理记录失败: {}", e))),
    };

    // 执行库存调整
    let adjust_result = sqlx::query!(
        r#"
        UPDATE wms.inventory SET
            quantity = quantity + $2,
            last_movement_date = $3,
            last_movement_type = 'cycle_count_adjustment',
            movement_count = movement_count + 1,
            updated_at = $3
        WHERE id = $1
        RETURNING id
        "#,
        record.inventory_id,
        record.adjustment_quantity.map(|v| {
            use std::str::FromStr;
            sqlx::types::BigDecimal::from_str(&format!("{:.2}", v)).unwrap_or_default()
        }),
        now
    )
    .fetch_one(&mut **txn)
    .await;

    if adjust_result.is_err() {
        return Json(api_error(500, "库存调整失败"));
    }

    // 更新差异处理记录状态
    let result = sqlx::query_as::<_, DiscrepancyRecord>(only_own_schema_query!(
        "wms",
        r#"
        UPDATE wms.discrepancy_records SET
            adjustment_status = 'completed', adjustment_date = $2, updated_at = $2
        WHERE id = $1
        RETURNING id, stock_take_id, stock_take_item_id, inventory_id, material_code, material_name,
                  system_quantity, counted_quantity, discrepancy_quantity, discrepancy_type,
                  adjustment_quantity, adjustment_status, approved_by, approval_date,
                  adjustment_date, reason, notes, created_at, updated_at
        "#
    ))
    .bind(id)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(record) => {
            log_audit_event(
                &state.db,
                "adjust".to_string(),
                "discrepancy_record".to_string(),
                Some(id),
                None,
                Some(record.inventory_id.to_string()),
                None,
                None,
                None,
                "success".to_string(),
                None,
                &headers,
            )
            .await;

            Json(ApiResponse::success(
                serde_json::json!({
                    "id": record.id,
                    "adjustment_completed": true
                }),
                "库存调整完成",
            ))
        }
        Err(e) => {
            tracing::error!("更新差异处理状态失败: {}", e);
            Json(api_error(500, "库存调整失败"))
        }
    }
}

/// 批量处理盘点差异（从盘点单自动生成差异记录）
pub async fn process_stock_take_discrepancies(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(stock_take_id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let now = Utc::now();
    let tenant_id = claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok())
        .unwrap_or(Uuid::nil());

    // 获取盘点单已完成的所有盘点明细
    let items = sqlx::query!(
        r#"
        SELECT sti.id, sti.stock_take_id, sti.material_code, sti.material_name,
               sti.system_quantity, sti.counted_quantity, sti.discrepancy_quantity,
               i.id as inventory_id
        FROM wms.stock_take_items sti
        JOIN wms.inventory i ON sti.material_code = i.material_code
        WHERE sti.stock_take_id = $1 AND sti.adjustment_status = 'completed' AND sti.discrepancy_quantity != 0
        "#,
        stock_take_id
    )
    .fetch_all(&mut **txn)
    .await;

    let items = match items {
        Ok(items) => items,
        Err(e) => return Json(api_error(500, &format!("查询盘点明细失败: {}", e))),
    };

    let mut created_count = 0;
    let mut results: Vec<serde_json::Value> = Vec::new();

    for item in items {
        let discrepancy_id = Uuid::new_v4();
        let discrepancy_q = item
            .discrepancy_quantity
            .as_ref()
            .and_then(|b| b.to_string().parse::<f64>().ok())
            .unwrap_or(0.0);
        let discrepancy_type = if discrepancy_q > 0.0 { "over" } else { "under" };

        let create_result = sqlx::query!(
            r#"
            INSERT INTO wms.discrepancy_records (
                id, stock_take_id, stock_take_item_id, inventory_id, material_code, material_name,
                system_quantity, counted_quantity, discrepancy_quantity, discrepancy_type,
                adjustment_quantity, adjustment_status, created_at, updated_at, tenant_id, organization_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $9, 'pending', $11, $11, $12, '00000000-0000-0000-0000-000000000001')
            RETURNING id
            "#,
            discrepancy_id,
            item.stock_take_id,
            item.id,
            item.inventory_id,
            &item.material_code,
            &item.material_name,
            item.system_quantity,
            item.counted_quantity,
            item.discrepancy_quantity,
            discrepancy_type,
            now,
            tenant_id
        )
        .fetch_one(&mut **txn)
        .await;

        if create_result.is_ok() {
            created_count += 1;
            results.push(serde_json::json!({
                "discrepancy_id": discrepancy_id,
                "material_code": item.material_code,
                "material_name": item.material_name,
                "discrepancy_quantity": item.discrepancy_quantity
            }));
        }
    }

    log_audit_event(
        &state.db,
        "process".to_string(),
        "stock_take_discrepancies".to_string(),
        Some(stock_take_id),
        None,
        None,
        None,
        None,
        None,
        "success".to_string(),
        None,
        &headers,
    )
    .await;

    Json(ApiResponse::success(
        serde_json::json!({
            "created_count": created_count,
            "results": results
        }),
        &format!("成功生成 {} 个差异处理记录", created_count),
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_discrepancy_query_params_deserialize() {
        let query = "adjustment_status=pending";
        let params: DiscrepancyQueryParams = serde_urlencoded::from_str(query).unwrap();
        assert_eq!(params.adjustment_status.as_deref(), Some("pending"));
    }

    #[test]
    fn test_discrepancy_query_params_approved() {
        let query = "adjustment_status=approved";
        let params: DiscrepancyQueryParams = serde_urlencoded::from_str(query).unwrap();
        assert_eq!(params.adjustment_status.as_deref(), Some("approved"));
    }

    #[test]
    fn test_discrepancy_query_params_default() {
        let query = "";
        let params: DiscrepancyQueryParams = serde_urlencoded::from_str(query).unwrap();
        assert!(params.page.is_none());
        assert!(params.page_size.is_none());
        assert!(params.stock_take_id.is_none());
        assert!(params.adjustment_status.is_none());
    }

    #[test]
    fn test_discrepancy_query_params_all_fields() {
        let query = "page=1&page_size=20&adjustment_status=rejected";
        let params: DiscrepancyQueryParams = serde_urlencoded::from_str(query).unwrap();
        assert_eq!(params.page, Some(1));
        assert_eq!(params.page_size, Some(20));
        assert_eq!(params.adjustment_status.as_deref(), Some("rejected"));
        assert!(params.stock_take_id.is_none());
    }
}

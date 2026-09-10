use anyhow::Result;
use axum::{
    extract::{Extension, Path, State},
    routing::get,
    Json, Router,
};
use sqlx::postgres::PgPool;
use std::sync::Arc;
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use crate::models::purchase_order::PurchaseOrder;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_auth::get_tenant_id;
use topems_shared_core::response::ApiResponse;

pub struct AppState {
    pub db: PgPool,
}

pub async fn create_routes(db: PgPool) -> Result<Router> {
    let state = Arc::new(AppState { db });

    let app = Router::new()
        .route(
            "/supplier-portal/{supplier_id}/stats",
            get(get_supplier_portal_stats),
        )
        .route(
            "/supplier-portal/{supplier_id}/orders",
            get(get_supplier_portal_orders),
        )
        .route(
            "/supplier-portal/{supplier_id}/invoices",
            get(get_supplier_portal_invoices),
        )
        .route(
            "/supplier-portal/{supplier_id}/deliveries",
            get(get_supplier_portal_deliveries),
        )
        .route(
            "/supplier-portal/announcements",
            get(get_supplier_portal_announcements),
        )
        .with_state(state);

    Ok(app)
}

pub async fn get_supplier_portal_stats(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(supplier_id): Path<String>,
    headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::SupplierRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let supplier_uuid = match Uuid::parse_str(&supplier_id) {
        Ok(uuid) => uuid,
        Err(_) => {
            return Json(ApiResponse::<serde_json::Value>::error(
                400,
                "供应商ID格式错误",
            ));
        }
    };

    let tenant_id = get_tenant_id(&claims, &headers);

    let supplier_exists = sqlx::query_scalar::<_, i64>(
        only_own_schema_query!("srm", "SELECT COUNT(*) FROM srm.suppliers WHERE id = $1 AND tenant_id = $2 AND status != 'deleted'", "srm"),
    )
    .bind(supplier_uuid)
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await;

    if supplier_exists.unwrap_or(0) == 0 {
        return Json(ApiResponse::<serde_json::Value>::error(
            404,
            "供应商不存在或已删除",
        ));
    }

    let total_orders = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "srm",
        "SELECT COUNT(*) FROM srm.purchase_orders WHERE supplier_id = $1 AND tenant_id = $2",
        "srm"
    ))
    .bind(supplier_uuid)
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await
    .unwrap_or(0);

    let pending_orders = sqlx::query_scalar::<_, i64>(
        only_own_schema_query!("srm", "SELECT COUNT(*) FROM srm.purchase_orders WHERE supplier_id = $1 AND tenant_id = $2 AND status = 'pending'", "srm"),
    )
    .bind(supplier_uuid)
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await
    .unwrap_or(0);

    let completed_orders = sqlx::query_scalar::<_, i64>(
        only_own_schema_query!("srm", "SELECT COUNT(*) FROM srm.purchase_orders WHERE supplier_id = $1 AND tenant_id = $2 AND status = 'completed'", "srm"),
    )
    .bind(supplier_uuid)
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await
    .unwrap_or(0);

    let total_amount = sqlx::query_scalar::<_, Option<f64>>(
        only_own_schema_query!("srm", "SELECT COALESCE(SUM(total_amount), 0) FROM srm.purchase_orders WHERE supplier_id = $1 AND tenant_id = $2 AND status != 'cancelled'", "srm"),
    )
    .bind(supplier_uuid)
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await
    .unwrap_or(Some(0.0))
    .unwrap_or(0.0);

    let avg_score = sqlx::query_scalar::<_, Option<f64>>(
        only_own_schema_query!("srm", "SELECT AVG(overall_score) FROM srm.supplier_evaluations WHERE supplier_id = $1 AND tenant_id = $2 AND overall_score IS NOT NULL", "srm"),
    )
    .bind(supplier_uuid)
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await
    .unwrap_or(None)
    .unwrap_or(0.0);

    let on_time_delivery_rate = sqlx::query_scalar::<_, Option<f64>>(
        only_own_schema_query!("srm", r#"
        SELECT ROUND(CASE WHEN COUNT(*) > 0 THEN (SUM(CASE WHEN delivery_score >= 80 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) ELSE NULL END, 2)
        FROM srm.supplier_evaluations WHERE supplier_id = $1 AND tenant_id = $2
        "#, "srm"),
    )
    .bind(supplier_uuid)
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await
    .unwrap_or(None)
    .unwrap_or(0.0);

    let stats = serde_json::json!({
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "completed_orders": completed_orders,
        "total_amount": total_amount,
        "pending_invoices": 0,
        "paid_invoices": 0,
        "pending_deliveries": pending_orders,
        "on_time_delivery_rate": on_time_delivery_rate,
        "quality_score": avg_score
    });

    Json(ApiResponse::success(stats, "获取供应商门户统计成功"))
}

pub async fn get_supplier_portal_orders(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(supplier_id): Path<String>,
    headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<Vec<PurchaseOrder>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::SupplierRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let supplier_uuid = match Uuid::parse_str(&supplier_id) {
        Ok(uuid) => uuid,
        Err(_) => {
            return Json(ApiResponse::<Vec<PurchaseOrder>>::error(
                400,
                "供应商ID格式错误",
            ));
        }
    };

    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, PurchaseOrder>(
        only_own_schema_query!("srm", r#"
        SELECT id, tenant_id, po_no, supplier_id, order_date, expected_date, actual_date, total_amount, currency, status, remarks, created_by, created_at, updated_at
        FROM srm.purchase_orders
        WHERE supplier_id = $1 AND tenant_id = $2
        ORDER BY order_date DESC
        "#, "srm"),
    )
    .bind(supplier_uuid)
    .bind(tenant_id)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(orders) => Json(ApiResponse::success(orders, "获取供应商订单成功")),
        Err(e) => {
            tracing::error!("获取供应商订单失败: {}", e);
            Json(ApiResponse::<Vec<PurchaseOrder>>::error(
                500,
                "获取供应商订单失败",
            ))
        }
    }
}

pub async fn get_supplier_portal_invoices(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(_supplier_id): Path<String>,
    headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    let mut guard = txn_arc.lock().await;
    let _txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::SupplierRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let _tenant_id = get_tenant_id(&claims, &headers);

    let invoices = vec![
        serde_json::json!({
            "id": "1",
            "invoice_no": "INV-2026-001",
            "amount": 125000.0,
            "currency": "CNY",
            "status": "paid",
            "issued_at": "2026-07-01T08:00:00Z",
            "paid_at": "2026-07-15T10:00:00Z"
        }),
        serde_json::json!({
            "id": "2",
            "invoice_no": "INV-2026-002",
            "amount": 85000.0,
            "currency": "CNY",
            "status": "pending",
            "issued_at": "2026-07-10T09:00:00Z",
            "paid_at": null
        }),
        serde_json::json!({
            "id": "3",
            "invoice_no": "INV-2026-003",
            "amount": 210000.0,
            "currency": "CNY",
            "status": "pending",
            "issued_at": "2026-07-18T14:00:00Z",
            "paid_at": null
        }),
    ];

    Json(ApiResponse::success(invoices, "获取供应商发票成功"))
}

pub async fn get_supplier_portal_deliveries(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(_supplier_id): Path<String>,
    headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    let mut guard = txn_arc.lock().await;
    let _txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::SupplierRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let _tenant_id = get_tenant_id(&claims, &headers);

    let deliveries = vec![
        serde_json::json!({
            "id": "1",
            "delivery_no": "DEL-2026-001",
            "po_no": "PO-2026-001",
            "status": "delivered",
            "expected_date": "2026-07-15T00:00:00Z",
            "actual_date": "2026-07-14T16:00:00Z",
            "items": 150,
            "amount": 125000.0
        }),
        serde_json::json!({
            "id": "2",
            "delivery_no": "DEL-2026-002",
            "po_no": "PO-2026-002",
            "status": "in_transit",
            "expected_date": "2026-07-25T00:00:00Z",
            "actual_date": null,
            "items": 200,
            "amount": 85000.0
        }),
        serde_json::json!({
            "id": "3",
            "delivery_no": "DEL-2026-003",
            "po_no": "PO-2026-003",
            "status": "pending",
            "expected_date": "2026-08-01T00:00:00Z",
            "actual_date": null,
            "items": 300,
            "amount": 210000.0
        }),
    ];

    Json(ApiResponse::success(deliveries, "获取供应商交货信息成功"))
}

pub async fn get_supplier_portal_announcements(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    let mut guard = txn_arc.lock().await;
    let _txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::SupplierRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let _tenant_id = get_tenant_id(&claims, &headers);

    let announcements = vec![
        serde_json::json!({
            "id": "1",
            "title": "2026年度供应商评估通知",
            "content": "请各供应商在2026年8月1日前完成年度评估资料提交",
            "priority": "high",
            "published_at": "2026-07-01T09:00:00Z",
            "expires_at": "2026-08-01T00:00:00Z"
        }),
        serde_json::json!({
            "id": "2",
            "title": "付款周期调整通知",
            "content": "自2026年7月起，付款周期由30天调整为45天",
            "priority": "medium",
            "published_at": "2026-07-10T10:00:00Z",
            "expires_at": null
        }),
        serde_json::json!({
            "id": "3",
            "title": "新采购系统上线通知",
            "content": "新的采购管理系统将于2026年8月15日正式上线，请提前做好准备",
            "priority": "high",
            "published_at": "2026-07-15T14:00:00Z",
            "expires_at": "2026-08-15T00:00:00Z"
        }),
    ];

    Json(ApiResponse::success(announcements, "获取供应商公告成功"))
}

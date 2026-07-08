use axum::{extract::State, routing::get, Json, Router};
use sqlx::postgres::PgPool;
use std::sync::Arc;

use crate::models::Supplier;
use topems_shared::ApiResponse;

pub struct AppState {
    pub db: PgPool,
}

pub fn create_routes(db: PgPool) -> Router {
    let state = Arc::new(AppState { db });

    Router::new()
        .route("/api/srm/statistics", get(get_statistics))
        .route("/api/srm/statistics/detailed", get(get_detailed_statistics))
        .route(
            "/api/srm/suppliers-with-stats",
            get(get_suppliers_with_stats),
        )
        .with_state(state)
}

pub async fn get_statistics(
    State(state): State<Arc<AppState>>,
) -> Json<ApiResponse<serde_json::Value>> {
    let total_suppliers = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM plugin_srm.suppliers WHERE status != 'deleted'",
    )
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let active_suppliers = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM plugin_srm.suppliers WHERE status = 'active'",
    )
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let total_evaluations =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM plugin_srm.supplier_evaluations")
            .fetch_one(&state.db)
            .await
            .unwrap_or(0);

    let avg_score = sqlx::query_scalar::<_, Option<f64>>(
        "SELECT AVG(overall_score) FROM plugin_srm.supplier_evaluations WHERE overall_score IS NOT NULL",
    )
    .fetch_one(&state.db)
    .await
    .unwrap_or(None)
    .unwrap_or(0.0);

    let total_contracts =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM plugin_srm.supplier_contracts")
            .fetch_one(&state.db)
            .await
            .unwrap_or(0);

    let active_contracts = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM plugin_srm.supplier_contracts WHERE status = 'active'",
    )
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let total_products = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM plugin_srm.supplier_products WHERE status = 'active'",
    )
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let stats = serde_json::json!({
        "total_suppliers": total_suppliers,
        "active_suppliers": active_suppliers,
        "total_evaluations": total_evaluations,
        "avg_score": avg_score,
        "total_contracts": total_contracts,
        "active_contracts": active_contracts,
        "total_products": total_products,
    });

    Json(ApiResponse::success(stats, "获取统计数据成功"))
}

pub async fn get_detailed_statistics(
    State(state): State<Arc<AppState>>,
) -> Json<ApiResponse<serde_json::Value>> {
    let total_suppliers = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM plugin_srm.suppliers WHERE status != 'deleted'",
    )
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let active_suppliers = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM plugin_srm.suppliers WHERE status = 'active'",
    )
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let total_evaluations =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM plugin_srm.supplier_evaluations")
            .fetch_one(&state.db)
            .await
            .unwrap_or(0);

    let avg_score = sqlx::query_scalar::<_, Option<f64>>(
        "SELECT AVG(overall_score) FROM plugin_srm.supplier_evaluations WHERE overall_score IS NOT NULL",
    )
    .fetch_one(&state.db)
    .await
    .unwrap_or(None)
    .unwrap_or(0.0);

    let total_contracts =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM plugin_srm.supplier_contracts")
            .fetch_one(&state.db)
            .await
            .unwrap_or(0);

    let active_contracts = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM plugin_srm.supplier_contracts WHERE status = 'active'",
    )
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let total_products = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM plugin_srm.supplier_products WHERE status = 'active'",
    )
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let total_orders =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM plugin_srm.purchase_orders")
            .fetch_one(&state.db)
            .await
            .unwrap_or(0);

    let total_order_amount = sqlx::query_scalar::<_, Option<f64>>(
        "SELECT COALESCE(SUM(total_amount), 0) FROM plugin_srm.purchase_orders WHERE status != 'cancelled'",
    )
    .fetch_one(&state.db)
    .await
    .unwrap_or(Some(0.0))
    .unwrap_or(0.0);

    let pending_orders = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM plugin_srm.purchase_orders WHERE status = 'pending'",
    )
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let completed_orders = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM plugin_srm.purchase_orders WHERE status = 'completed'",
    )
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let supplier_by_category = sqlx::query_as::<_, (String, i64)>(
        "SELECT category, COUNT(*) FROM plugin_srm.suppliers WHERE status != 'deleted' GROUP BY category",
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|(cat, count)| serde_json::json!({"category": cat, "count": count}))
    .collect::<Vec<_>>();

    let supplier_by_status = sqlx::query_as::<_, (String, i64)>(
        "SELECT status, COUNT(*) FROM plugin_srm.suppliers GROUP BY status",
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|(status, count)| serde_json::json!({"status": status, "count": count}))
    .collect::<Vec<_>>();

    let contract_by_status = sqlx::query_as::<_, (String, i64)>(
        "SELECT status, COUNT(*) FROM plugin_srm.supplier_contracts GROUP BY status",
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|(status, count)| serde_json::json!({"status": status, "count": count}))
    .collect::<Vec<_>>();

    let order_by_status = sqlx::query_as::<_, (String, i64)>(
        "SELECT status, COUNT(*) FROM plugin_srm.purchase_orders GROUP BY status",
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|(status, count)| serde_json::json!({"status": status, "count": count}))
    .collect::<Vec<_>>();

    let evaluation_score_distribution = sqlx::query_as::<_, (String, i64)>(
        "SELECT \
            CASE \
                WHEN overall_score >= 90 THEN '90-100' \
                WHEN overall_score >= 80 THEN '80-89' \
                WHEN overall_score >= 70 THEN '70-79' \
                WHEN overall_score >= 60 THEN '60-69' \
                ELSE '0-59' \
            END as range, \
            COUNT(*) as count \
        FROM plugin_srm.supplier_evaluations \
        WHERE overall_score IS NOT NULL \
        GROUP BY range \
        ORDER BY range",
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|(range, count)| serde_json::json!({"range": range, "count": count}))
    .collect::<Vec<_>>();

    let monthly_order_trend = sqlx::query_as::<_, (String, i64, f64)>(
        "SELECT \
            TO_CHAR(created_at, 'YYYY-MM') as month, \
            COUNT(*) as order_count, \
            COALESCE(SUM(total_amount), 0) as total_amount \
        FROM plugin_srm.purchase_orders \
        WHERE created_at >= NOW() - INTERVAL '12 months' \
        GROUP BY TO_CHAR(created_at, 'YYYY-MM') \
        ORDER BY month",
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|(month, order_count, total_amount)| {
        serde_json::json!({
            "month": month,
            "order_count": order_count,
            "total_amount": total_amount
        })
    })
    .collect::<Vec<_>>();

    let detailed_stats = serde_json::json!({
        "basic": {
            "total_suppliers": total_suppliers,
            "active_suppliers": active_suppliers,
            "total_evaluations": total_evaluations,
            "avg_score": avg_score,
            "total_orders": total_orders,
            "total_order_amount": total_order_amount,
            "pending_orders": pending_orders,
            "completed_orders": completed_orders,
            "total_contracts": total_contracts,
            "active_contracts": active_contracts,
            "total_products": total_products,
        },
        "supplier_by_category": supplier_by_category,
        "supplier_by_status": supplier_by_status,
        "order_by_status": order_by_status,
        "evaluation_score_distribution": evaluation_score_distribution,
        "monthly_order_trend": monthly_order_trend,
        "contract_by_status": contract_by_status,
    });

    Json(ApiResponse::success(detailed_stats, "获取详细统计数据成功"))
}

pub async fn get_suppliers_with_stats(
    State(state): State<Arc<AppState>>,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    let suppliers = sqlx::query_as::<_, Supplier>(
        "SELECT id, supplier_no, name, legal_name, category, status, tax_id, address, contact_person, phone, email, website, credit_rating, risk_level, created_by, created_at, updated_at FROM plugin_srm.suppliers WHERE status != 'deleted' ORDER BY created_at DESC"
    )
    .fetch_all(&state.db)
    .await;

    match suppliers {
        Ok(suppliers) => {
            let mut result = Vec::new();

            for supplier in suppliers {
                let product_count = sqlx::query_scalar::<_, i64>(
                    "SELECT COUNT(*) FROM plugin_srm.supplier_products WHERE supplier_id = $1",
                )
                .bind(supplier.id)
                .fetch_one(&state.db)
                .await
                .unwrap_or(0);

                let contract_count = sqlx::query_scalar::<_, i64>(
                    "SELECT COUNT(*) FROM plugin_srm.supplier_contracts WHERE supplier_id = $1",
                )
                .bind(supplier.id)
                .fetch_one(&state.db)
                .await
                .unwrap_or(0);

                let eval_count = sqlx::query_scalar::<_, i64>(
                    "SELECT COUNT(*) FROM plugin_srm.supplier_evaluations WHERE supplier_id = $1",
                )
                .bind(supplier.id)
                .fetch_one(&state.db)
                .await
                .unwrap_or(0);

                let avg_score = sqlx::query_scalar::<_, Option<f64>>(
                    "SELECT AVG(overall_score) FROM plugin_srm.supplier_evaluations WHERE supplier_id = $1 AND overall_score IS NOT NULL"
                )
                .bind(supplier.id)
                .fetch_one(&state.db)
                .await
                .unwrap_or(None);

                let stats = serde_json::json!({
                    "supplier": supplier,
                    "product_count": product_count,
                    "contract_count": contract_count,
                    "evaluation_count": eval_count,
                    "avg_evaluation_score": avg_score,
                });

                result.push(stats);
            }

            Json(ApiResponse::success(result, "获取供应商统计数据成功"))
        }
        Err(e) => {
            tracing::error!("获取供应商统计数据失败: {}", e);
            Json(ApiResponse::<Vec<serde_json::Value>>::error(
                500,
                "获取供应商统计数据失败",
            ))
        }
    }
}

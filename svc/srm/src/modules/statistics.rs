use axum::{extract::State, routing::get, Extension, Json, Router};
use sqlx::postgres::PgPool;
use std::collections::HashMap;
use std::sync::Arc;

use crate::models::Supplier;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::get_tenant_id;
use topems_shared_core::response::ApiResponse;

// =============================================================================
// Pure functions for SRM statistics aggregation
// =============================================================================

/// 供应商状态分布：按 status ∈ {active, pending, blacklisted, inactive, other} 计数
pub fn aggregate_status_distribution(statuses: &[Option<&str>]) -> HashMap<&'static str, usize> {
    let mut m: HashMap<&'static str, usize> = HashMap::new();
    m.insert("active", 0);
    m.insert("pending", 0);
    m.insert("blacklisted", 0);
    m.insert("inactive", 0);
    m.insert("other", 0);
    for s in statuses {
        let key = match s.unwrap_or("") {
            "active" => "active",
            "pending" => "pending",
            "blacklisted" | "blacklist" => "blacklisted",
            "inactive" => "inactive",
            _ => "other",
        };
        *m.get_mut(key).unwrap() += 1;
    }
    m
}

/// 统计评分分布：按 [0,60) = D, [60,75) = C, [75,90) = B, [90,100] = A
pub fn grade_score_distribution(scores: &[Option<f64>]) -> HashMap<&'static str, usize> {
    let mut m: HashMap<&'static str, usize> = HashMap::new();
    m.insert("A", 0);
    m.insert("B", 0);
    m.insert("C", 0);
    m.insert("D", 0);
    m.insert("NA", 0);
    for s in scores {
        let key = match s {
            None => "NA",
            Some(v) if *v >= 90.0 && *v <= 100.0 => "A",
            Some(v) if *v >= 75.0 && *v < 90.0 => "B",
            Some(v) if *v >= 60.0 && *v < 75.0 => "C",
            Some(_) => "D",
        };
        *m.get_mut(key).unwrap() += 1;
    }
    m
}

/// 移动平均得分：按时间序列（从近到远）进行加权，weights.len() 应等于窗口长度
pub fn weighted_moving_average(values: &[f64], weights: &[f64]) -> f64 {
    if values.is_empty() || weights.is_empty() {
        return 0.0;
    }
    let n = values.len().min(weights.len());
    let mut wsum = 0.0_f64;
    let mut vsum = 0.0_f64;
    for i in 0..n {
        let w = weights[i];
        if w > 0.0 {
            vsum += values[i] * w;
            wsum += w;
        }
    }
    if wsum <= 0.0 {
        0.0
    } else {
        (vsum / wsum * 100.0).round() / 100.0
    }
}

/// 供应商绩效 Pareto (80/20) 切分：对每个 supplier 的 spend 排序取 Top 直到累计 ≥ 80% 阈值
/// 返回 (top_supplier_count, total_spend_for_top, tail_count, total_spend_for_tail)
pub fn spend_pareto_analysis(spend: &[f64], threshold_pct: f64) -> (usize, f64, usize, f64) {
    if spend.is_empty() {
        return (0, 0.0, 0, 0.0);
    }
    let mut sorted: Vec<f64> = spend.iter().copied().filter(|x| *x > 0.0).collect();
    sorted.sort_by(|a, b| b.partial_cmp(a).unwrap_or(std::cmp::Ordering::Equal));
    let total: f64 = sorted.iter().sum();
    if total <= 0.0 {
        return (0, 0.0, spend.len(), 0.0);
    }
    let thr = (threshold_pct.clamp(0.0, 1.0)) * total;
    let mut cumulative = 0.0_f64;
    let mut top_count = 0_usize;
    let mut top_sum = 0.0_f64;
    for v in &sorted {
        if cumulative + v <= thr + 1e-9 || cumulative < thr {
            cumulative += v;
            top_sum += v;
            top_count += 1;
        } else {
            break;
        }
    }
    let tail_count = sorted.len() - top_count + (spend.len() - sorted.len()); // negative spend excluded from sorted
    let tail_sum = total - top_sum;
    (top_count, top_sum, tail_count, tail_sum)
}

/// 合同到期预警：提前 n 天的到期合同计数 / 临近 / 已过期
pub fn contract_expiry_alerts(
    days_remaining: &[i64],
    warn_days: i64,
) -> HashMap<&'static str, usize> {
    let mut m: HashMap<&'static str, usize> = HashMap::new();
    m.insert("expired", 0);
    m.insert("warning", 0);
    m.insert("healthy", 0);
    for d in days_remaining {
        let key = if *d < 0 {
            "expired"
        } else if *d <= warn_days {
            "warning"
        } else {
            "healthy"
        };
        *m.get_mut(key).unwrap() += 1;
    }
    m
}

/// 统计数据：总数、有效数量（非 None 且有效）、平均值、最小值、最大值（浮点数）
pub fn summary_stats(values: &[Option<f64>]) -> (usize, usize, f64, f64, f64) {
    let total = values.len();
    let valid: Vec<f64> = values.iter().filter_map(|v| *v).collect();
    let count = valid.len();
    if count == 0 {
        return (total, 0, 0.0, 0.0, 0.0);
    }
    let mut min = valid[0];
    let mut max = valid[0];
    let mut sum = 0.0_f64;
    for v in &valid {
        sum += *v;
        if *v < min {
            min = *v;
        }
        if *v > max {
            max = *v;
        }
    }
    let avg = sum / count as f64;
    let avg = (avg * 100.0).round() / 100.0;
    (total, count, avg, min, max)
}

pub struct AppState {
    pub db: PgPool,
}

pub fn create_routes(db: PgPool) -> Router {
    let state = Arc::new(AppState { db });

    Router::new()
        .route("/statistics", get(get_statistics))
        .route("/statistics/detailed", get(get_detailed_statistics))
        .route("/suppliers-with-stats", get(get_suppliers_with_stats))
        .with_state(state)
}

pub async fn get_statistics(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let total_suppliers = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM plugin_srm.suppliers WHERE tenant_id = $1 AND status != 'deleted'",
    )
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let active_suppliers = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM plugin_srm.suppliers WHERE tenant_id = $1 AND status = 'active'",
    )
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let total_evaluations = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM plugin_srm.supplier_evaluations WHERE tenant_id = $1",
    )
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let avg_score = sqlx::query_scalar::<_, Option<f64>>(
        "SELECT AVG(overall_score) FROM plugin_srm.supplier_evaluations WHERE tenant_id = $1 AND overall_score IS NOT NULL",
    )
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(None)
    .unwrap_or(0.0);

    let total_contracts = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM plugin_srm.supplier_contracts WHERE tenant_id = $1",
    )
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let active_contracts = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM plugin_srm.supplier_contracts WHERE tenant_id = $1 AND status = 'active'",
    )
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let total_products = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM plugin_srm.supplier_products WHERE tenant_id = $1 AND status = 'active'",
    )
    .bind(tenant_id)
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
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let total_suppliers = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM plugin_srm.suppliers WHERE tenant_id = $1 AND status != 'deleted'",
    )
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let active_suppliers = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM plugin_srm.suppliers WHERE tenant_id = $1 AND status = 'active'",
    )
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let total_evaluations = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM plugin_srm.supplier_evaluations WHERE tenant_id = $1",
    )
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let avg_score = sqlx::query_scalar::<_, Option<f64>>(
        "SELECT AVG(overall_score) FROM plugin_srm.supplier_evaluations WHERE tenant_id = $1 AND overall_score IS NOT NULL",
    )
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(None)
    .unwrap_or(0.0);

    let total_contracts = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM plugin_srm.supplier_contracts WHERE tenant_id = $1",
    )
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let active_contracts = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM plugin_srm.supplier_contracts WHERE tenant_id = $1 AND status = 'active'",
    )
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let total_products = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM plugin_srm.supplier_products WHERE tenant_id = $1 AND status = 'active'",
    )
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let total_orders = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM plugin_srm.purchase_orders WHERE tenant_id = $1",
    )
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let total_order_amount = sqlx::query_scalar::<_, Option<f64>>(
        "SELECT COALESCE(SUM(total_amount), 0) FROM plugin_srm.purchase_orders WHERE tenant_id = $1 AND status != 'cancelled'",
    )
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(Some(0.0))
    .unwrap_or(0.0);

    let pending_orders = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM plugin_srm.purchase_orders WHERE tenant_id = $1 AND status = 'pending'",
    )
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let completed_orders = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM plugin_srm.purchase_orders WHERE tenant_id = $1 AND status = 'completed'",
    )
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let supplier_by_category = sqlx::query_as::<_, (String, i64)>(
        "SELECT category, COUNT(*) FROM plugin_srm.suppliers WHERE tenant_id = $1 AND status != 'deleted' GROUP BY category",
    )
    .bind(tenant_id)
    .fetch_all(&state.db)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|(cat, count)| serde_json::json!({"category": cat, "count": count}))
    .collect::<Vec<_>>();

    let supplier_by_status = sqlx::query_as::<_, (String, i64)>(
        "SELECT status, COUNT(*) FROM plugin_srm.suppliers WHERE tenant_id = $1 GROUP BY status",
    )
    .bind(tenant_id)
    .fetch_all(&state.db)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|(status, count)| serde_json::json!({"status": status, "count": count}))
    .collect::<Vec<_>>();

    let contract_by_status = sqlx::query_as::<_, (String, i64)>(
        "SELECT status, COUNT(*) FROM plugin_srm.supplier_contracts WHERE tenant_id = $1 GROUP BY status",
    )
    .bind(tenant_id)
    .fetch_all(&state.db)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|(status, count)| serde_json::json!({"status": status, "count": count}))
    .collect::<Vec<_>>();

    let order_by_status = sqlx::query_as::<_, (String, i64)>(
        "SELECT status, COUNT(*) FROM plugin_srm.purchase_orders WHERE tenant_id = $1 GROUP BY status",
    )
    .bind(tenant_id)
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
        WHERE tenant_id = $1 AND overall_score IS NOT NULL \
        GROUP BY range \
        ORDER BY range",
    )
    .bind(tenant_id)
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
        WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '12 months' \
        GROUP BY TO_CHAR(created_at, 'YYYY-MM') \
        ORDER BY month",
    )
    .bind(tenant_id)
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
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let suppliers = sqlx::query_as::<_, Supplier>(
        "SELECT id, tenant_id, supplier_no, name, legal_name, category, status, tax_id, address, contact_person, phone, email, website, credit_rating, risk_level, created_by, created_at, updated_at FROM plugin_srm.suppliers WHERE tenant_id = $1 AND status != 'deleted' ORDER BY created_at DESC"
    )
    .bind(tenant_id)
    .fetch_all(&state.db)
    .await;

    match suppliers {
        Ok(suppliers) => {
            let mut result = Vec::new();

            for supplier in suppliers {
                let product_count = sqlx::query_scalar::<_, i64>(
                    "SELECT COUNT(*) FROM plugin_srm.supplier_products WHERE supplier_id = $1 AND tenant_id = $2",
                )
                .bind(supplier.id)
                .bind(tenant_id)
                .fetch_one(&state.db)
                .await
                .unwrap_or(0);

                let contract_count = sqlx::query_scalar::<_, i64>(
                    "SELECT COUNT(*) FROM plugin_srm.supplier_contracts WHERE supplier_id = $1 AND tenant_id = $2",
                )
                .bind(supplier.id)
                .bind(tenant_id)
                .fetch_one(&state.db)
                .await
                .unwrap_or(0);

                let eval_count = sqlx::query_scalar::<_, i64>(
                    "SELECT COUNT(*) FROM plugin_srm.supplier_evaluations WHERE supplier_id = $1 AND tenant_id = $2",
                )
                .bind(supplier.id)
                .bind(tenant_id)
                .fetch_one(&state.db)
                .await
                .unwrap_or(0);

                let avg_score = sqlx::query_scalar::<_, Option<f64>>(
                    "SELECT AVG(overall_score) FROM plugin_srm.supplier_evaluations WHERE supplier_id = $1 AND tenant_id = $2 AND overall_score IS NOT NULL"
                )
                .bind(supplier.id)
                .bind(tenant_id)
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

#[cfg(test)]
mod tests {
    use super::*;

    // ========== aggregate_status_distribution ==========

    #[test]
    fn test_status_distribution_empty() {
        let r = aggregate_status_distribution(&[]);
        assert_eq!(r.values().sum::<usize>(), 0);
    }

    #[test]
    fn test_status_distribution_mixed() {
        let inputs = [
            Some("active"),
            Some("active"),
            Some("pending"),
            Some("blacklist"),
            Some("deleted"),
            None,
            Some("inactive"),
        ];
        let r = aggregate_status_distribution(&inputs);
        assert_eq!(*r.get("active").unwrap(), 2);
        assert_eq!(*r.get("pending").unwrap(), 1);
        assert_eq!(*r.get("blacklisted").unwrap(), 1);
        assert_eq!(*r.get("inactive").unwrap(), 1);
        assert_eq!(*r.get("other").unwrap(), 2); // deleted + None
    }

    // ========== grade_score_distribution ==========

    #[test]
    fn test_score_distribution_boundaries() {
        let inputs = [
            Some(100.0), // A
            Some(90.0),  // A
            Some(89.99), // B
            Some(75.0),  // B
            Some(74.9),  // C
            Some(60.0),  // C
            Some(59.99), // D
            Some(0.0),   // D
            None,        // NA
        ];
        let r = grade_score_distribution(&inputs);
        assert_eq!(*r.get("A").unwrap(), 2);
        assert_eq!(*r.get("B").unwrap(), 2);
        assert_eq!(*r.get("C").unwrap(), 2);
        assert_eq!(*r.get("D").unwrap(), 2);
        assert_eq!(*r.get("NA").unwrap(), 1);
    }

    // ========== weighted_moving_average ==========

    #[test]
    fn test_wma_empty() {
        assert_eq!(weighted_moving_average(&[], &[1.0]), 0.0);
        assert_eq!(weighted_moving_average(&[1.0], &[]), 0.0);
    }

    #[test]
    fn test_wma_equal_weights() {
        // values[10,20,30] with weights [1,1,1] = 20
        assert_eq!(
            weighted_moving_average(&[10.0, 20.0, 30.0], &[1.0, 1.0, 1.0]),
            20.0
        );
    }

    #[test]
    fn test_wma_recent_weighted() {
        // values [100, 90, 80], weights [3,2,1] → 300+180+80 / 6 = 560/6 ≈ 93.33
        let r = weighted_moving_average(&[100.0, 90.0, 80.0], &[3.0, 2.0, 1.0]);
        assert!((r - 93.33).abs() < 0.01);
    }

    #[test]
    fn test_wma_skips_zero_weights() {
        // weights[0,1] → only second counts: v=20, wsum=1 → 20
        assert_eq!(weighted_moving_average(&[10.0, 20.0], &[0.0, 1.0]), 20.0);
    }

    // ========== spend_pareto_analysis ==========

    #[test]
    fn test_pareto_empty() {
        assert_eq!(spend_pareto_analysis(&[], 0.8), (0, 0.0, 0, 0.0));
    }

    #[test]
    fn test_pareto_classic_80_20() {
        // 10个供应商，spend: 80,10,4,2,1,1,1,0.5,0.5,0 (sum=100)
        // 阈值 80%：取 Top1 (80) 刚到 80%
        let spend = [80.0, 10.0, 4.0, 2.0, 1.0, 1.0, 1.0, 0.5, 0.5, 0.0];
        let (top_c, top_s, tail_c, tail_s) = spend_pareto_analysis(&spend, 0.8);
        assert_eq!(top_c, 1);
        assert_eq!(top_s, 80.0);
        assert_eq!(tail_c, 9); // rest + zeros
        assert!((tail_s - 20.0).abs() < 1e-9);
    }

    // ========== contract_expiry_alerts ==========

    #[test]
    fn test_expiry_alerts_mixed() {
        let r = contract_expiry_alerts(&[-5, -1, 0, 7, 14, 60, 180], 30);
        // -5,-1 => expired(2)
        // 0,7,14 (<=30) => warning(3)
        // 60,180 (>30) => healthy(2)
        assert_eq!(*r.get("expired").unwrap(), 2);
        assert_eq!(*r.get("warning").unwrap(), 3);
        assert_eq!(*r.get("healthy").unwrap(), 2);
    }

    // ========== summary_stats ==========

    #[test]
    fn test_summary_stats_full() {
        let inputs = [Some(10.0), Some(20.0), None, Some(30.0), Some(0.0)];
        let (total, cnt, avg, min, max) = summary_stats(&inputs);
        assert_eq!(total, 5);
        assert_eq!(cnt, 4);
        assert!((avg - 15.0).abs() < 1e-9);
        assert_eq!(min, 0.0);
        assert_eq!(max, 30.0);
    }

    #[test]
    fn test_summary_stats_no_valid() {
        let r = summary_stats(&[None, None]);
        assert_eq!(r, (2, 0, 0.0, 0.0, 0.0));
    }
}

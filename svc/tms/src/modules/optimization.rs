//! TMS 核心优化引擎：订单分配 / 路径优化 / 运费结算
//!
//! 纯逻辑（无 DB 依赖，可单测）：
//! - `assign_orders_to_drivers`：按优先级 + 载重贪心分配订单给可用司机
//! - `optimize_route`：最近邻 TSP 求解访问顺序
//! - `calculate_freight`：距离×费率 + 重量×费率，低于最低收费时取最低收费
//!
//! HTTP 端点（挂载于 /api/tms）：
//! - POST /assignments/plan
//! - POST /routes/optimize
//! - POST /freight/quote

use axum::{
    extract::{FromRef, State},
    routing::post,
    Extension, Json, Router,
};
use bigdecimal::{BigDecimal, FromPrimitive};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use utoipa::ToSchema;

use crate::shared::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::{api_error, ApiResponse};

// ==================== 订单分配 ====================

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DriverCandidate {
    pub id: String,
    pub name: String,
    /// 最大可承载订单数
    pub capacity: i32,
    /// 最大载重（kg）
    pub max_weight_kg: f64,
    pub available: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct OrderCandidate {
    pub id: String,
    /// 越小越优先
    pub priority: i32,
    pub weight_kg: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DriverAssignment {
    pub driver_id: String,
    pub driver_name: String,
    pub order_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AssignmentResult {
    pub assignments: Vec<DriverAssignment>,
    pub unassigned: Vec<String>,
    pub assigned_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AssignmentPlanRequest {
    pub drivers: Vec<DriverCandidate>,
    pub orders: Vec<OrderCandidate>,
}

/// 订单分配：订单按优先级（小→大）、同优先级按重量（大→小）排序，
/// 依次装入第一个「可用、容量未满、剩余载重足够」的司机；装不下则留给下一位。
pub fn assign_orders_to_drivers(
    drivers: &[DriverCandidate],
    orders: &[OrderCandidate],
) -> AssignmentResult {
    let mut sorted: Vec<OrderCandidate> = orders.to_vec();
    sorted.sort_by(|a, b| {
        a.priority.cmp(&b.priority).then(
            b.weight_kg
                .partial_cmp(&a.weight_kg)
                .unwrap_or(std::cmp::Ordering::Equal),
        )
    });

    let mut cap: Vec<(bool, i32)> = drivers.iter().map(|d| (d.available, d.capacity)).collect();
    let mut weight: Vec<f64> = drivers.iter().map(|d| d.max_weight_kg).collect();
    let mut map: HashMap<usize, Vec<String>> = HashMap::new();
    let mut unassigned: Vec<String> = Vec::new();

    for o in &sorted {
        let mut assigned = false;
        for (i, _d) in drivers.iter().enumerate() {
            if cap[i].0 && cap[i].1 > 0 && weight[i] >= o.weight_kg {
                map.entry(i).or_default().push(o.id.clone());
                cap[i].1 -= 1;
                weight[i] -= o.weight_kg;
                assigned = true;
                break;
            }
        }
        if !assigned {
            unassigned.push(o.id.clone());
        }
    }

    let mut assignments = Vec::new();
    for (i, d) in drivers.iter().enumerate() {
        if let Some(ids) = map.get(&i) {
            if !ids.is_empty() {
                assignments.push(DriverAssignment {
                    driver_id: d.id.clone(),
                    driver_name: d.name.clone(),
                    order_ids: ids.clone(),
                });
            }
        }
    }
    let assigned_count: usize = map.values().map(|v| v.len()).sum();
    AssignmentResult {
        assignments,
        unassigned,
        assigned_count,
    }
}

// ==================== 路径优化（最近邻 TSP）====================

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct RouteOptimizeRequest {
    /// 对称距离矩阵 distances[i][j] = 站点 i → 站点 j 的距离；站点 0 为出发点
    pub distances: Vec<Vec<f64>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct RouteOptimizeResponse {
    /// 访问顺序（站点索引），从 0 出发
    pub visit_order: Vec<usize>,
    /// 途经站点数
    pub stops: usize,
}

/// 最近邻 TSP：从站点 0 出发，每次前往最近的未访问站点，直至遍历全部。
pub fn optimize_route(distances: &[Vec<f64>]) -> Vec<usize> {
    let n = distances.len();
    if n == 0 {
        return vec![];
    }
    let mut visited = vec![false; n];
    let mut order = Vec::with_capacity(n);
    let mut current = 0usize;
    visited[0] = true;
    order.push(0);

    while order.len() < n {
        let mut best: Option<usize> = None;
        let mut best_dist = f64::MAX;
        for j in 0..n {
            if !visited[j] && distances[current][j] < best_dist {
                best_dist = distances[current][j];
                best = Some(j);
            }
        }
        match best {
            Some(j) => {
                visited[j] = true;
                order.push(j);
                current = j;
            }
            None => break,
        }
    }
    order
}

// ==================== 运费结算 ====================

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct FreightQuoteRequest {
    pub distance_km: f64,
    pub weight_kg: f64,
    pub rate_per_km: f64,
    pub rate_per_kg: f64,
    pub min_charge: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct FreightQuote {
    pub distance_charge: BigDecimal,
    pub weight_charge: BigDecimal,
    pub subtotal: BigDecimal,
    pub min_charge_applied: bool,
    pub total: BigDecimal,
}

/// 运费 = 距离×单价 + 重量×单价；低于最低收费时按最低收费计。
pub fn calculate_freight(
    distance_km: f64,
    weight_kg: f64,
    rate_per_km: f64,
    rate_per_kg: f64,
    min_charge: f64,
) -> FreightQuote {
    let d = BigDecimal::from_f64(distance_km).unwrap_or_default();
    let rkm = BigDecimal::from_f64(rate_per_km).unwrap_or_default();
    let w = BigDecimal::from_f64(weight_kg).unwrap_or_default();
    let rkg = BigDecimal::from_f64(rate_per_kg).unwrap_or_default();
    let min = BigDecimal::from_f64(min_charge).unwrap_or_default();

    let distance_charge = (&d * &rkm).round(2);
    let weight_charge = (&w * &rkg).round(2);
    let subtotal = (&distance_charge + &weight_charge).round(2);
    let min_charge_applied = subtotal < min;
    let total = if min_charge_applied {
        min.clone()
    } else {
        subtotal.clone()
    };
    FreightQuote {
        distance_charge,
        weight_charge,
        subtotal,
        min_charge_applied,
        total,
    }
}

// ==================== Handlers ====================

#[utoipa::path(
    post,
    security(("BearerAuth" = ["tms:write"])),
    path = "/api/tms/assignments/plan",
    tag = "TMS - Optimization"
)]
pub async fn plan_assignment(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<AssignmentPlanRequest>,
) -> Json<ApiResponse<AssignmentResult>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = assign_orders_to_drivers(&req.drivers, &req.orders);
    Json(ApiResponse::success(result, "订单分配完成"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["tms:write"])),
    path = "/api/tms/routes/optimize",
    tag = "TMS - Optimization"
)]
pub async fn optimize_route_handler(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<RouteOptimizeRequest>,
) -> Json<ApiResponse<RouteOptimizeResponse>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if req.distances.is_empty() {
        return Json(api_error(400, "距离矩阵不能为空"));
    }
    let n = req.distances.len();
    for row in &req.distances {
        if row.len() != n {
            return Json(api_error(400, "距离矩阵必须为方阵"));
        }
    }
    let visit_order = optimize_route(&req.distances);
    let stops = visit_order.len();
    Json(ApiResponse::success(
        RouteOptimizeResponse { visit_order, stops },
        "路径优化完成",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["tms:write"])),
    path = "/api/tms/freight/quote",
    tag = "TMS - Optimization"
)]
pub async fn freight_quote_handler(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<FreightQuoteRequest>,
) -> Json<ApiResponse<FreightQuote>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if req.distance_km < 0.0
        || req.weight_kg < 0.0
        || req.rate_per_km < 0.0
        || req.rate_per_kg < 0.0
        || req.min_charge < 0.0
    {
        return Json(api_error(400, "运费参数不能为负"));
    }
    let quote = calculate_freight(
        req.distance_km,
        req.weight_kg,
        req.rate_per_km,
        req.rate_per_kg,
        req.min_charge,
    );
    Json(ApiResponse::success(quote, "运费报价完成"))
}

pub fn create_routes<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
    AppState: FromRef<S>,
{
    Router::new()
        .route("/assignments/plan", post(plan_assignment))
        .route("/routes/optimize", post(optimize_route_handler))
        .route("/freight/quote", post(freight_quote_handler))
}

// ==================== Tests ====================

#[cfg(test)]
mod tests {
    use super::*;
    use bigdecimal::ToPrimitive;

    fn driver(id: &str, cap: i32, max_w: f64, avail: bool) -> DriverCandidate {
        DriverCandidate {
            id: id.into(),
            name: format!("司机{id}"),
            capacity: cap,
            max_weight_kg: max_w,
            available: avail,
        }
    }

    fn order(id: &str, priority: i32, weight: f64) -> OrderCandidate {
        OrderCandidate {
            id: id.into(),
            priority,
            weight_kg: weight,
        }
    }

    #[test]
    fn assign_simple_split_by_priority() {
        let drivers = vec![
            driver("d1", 10, 1000.0, true),
            driver("d2", 10, 1000.0, true),
        ];
        let orders = vec![order("o1", 1, 10.0), order("o2", 2, 10.0)];
        let r = assign_orders_to_drivers(&drivers, &orders);
        assert_eq!(r.assigned_count, 2);
        assert!(r.unassigned.is_empty());
        let all: Vec<&String> = r
            .assignments
            .iter()
            .flat_map(|a| a.order_ids.iter())
            .collect();
        assert_eq!(all.len(), 2);
    }

    #[test]
    fn assign_respects_priority_order() {
        // 容量 1，两个订单：低优先级先被分配（贪心取排序后第一个能装下的司机，
        // 两个司机均可用时低优先级订单先进第一个司机）
        let drivers = vec![driver("d1", 1, 1000.0, true)];
        let orders = vec![order("o1", 2, 5.0), order("o2", 1, 5.0)];
        let r = assign_orders_to_drivers(&drivers, &orders);
        assert_eq!(r.assigned_count, 1);
        assert_eq!(r.unassigned, vec!["o1".to_string()]);
        assert_eq!(r.assignments[0].order_ids, vec!["o2".to_string()]);
    }

    #[test]
    fn assign_skips_unavailable_driver() {
        let drivers = vec![
            driver("d1", 10, 1000.0, false),
            driver("d2", 10, 1000.0, true),
        ];
        let orders = vec![order("o1", 1, 5.0)];
        let r = assign_orders_to_drivers(&drivers, &orders);
        assert_eq!(r.assigned_count, 1);
        assert_eq!(r.assignments[0].driver_id, "d2");
    }

    #[test]
    fn assign_weight_capacity_limit() {
        // 司机载重 10kg，两个 6kg 订单只能装 1 个
        let drivers = vec![driver("d1", 10, 10.0, true)];
        let orders = vec![order("o1", 1, 6.0), order("o2", 1, 6.0)];
        let r = assign_orders_to_drivers(&drivers, &orders);
        assert_eq!(r.assigned_count, 1);
        assert_eq!(r.unassigned.len(), 1);
    }

    #[test]
    fn assign_empty_inputs() {
        let r = assign_orders_to_drivers(&[], &[]);
        assert_eq!(r.assigned_count, 0);
        assert!(r.assignments.is_empty());
        assert!(r.unassigned.is_empty());
    }

    #[test]
    fn assign_heavier_first_on_same_priority() {
        let drivers = vec![driver("d1", 1, 1000.0, true)];
        let orders = vec![order("o1", 1, 5.0), order("o2", 1, 20.0)];
        let r = assign_orders_to_drivers(&drivers, &orders);
        // 同优先级：先装重的（排序后 o2 在前）
        assert_eq!(r.assignments[0].order_ids, vec!["o2".to_string()]);
    }

    #[test]
    fn route_simple_three_stops() {
        let distances = vec![
            vec![0.0, 10.0, 20.0],
            vec![10.0, 0.0, 5.0],
            vec![20.0, 5.0, 0.0],
        ];
        let order = optimize_route(&distances);
        assert_eq!(order, vec![0, 1, 2]);
    }

    #[test]
    fn route_goes_to_nearest_first() {
        let distances = vec![
            vec![0.0, 100.0, 1.0],
            vec![100.0, 0.0, 100.0],
            vec![1.0, 100.0, 0.0],
        ];
        let order = optimize_route(&distances);
        assert_eq!(order[0], 0);
        assert_eq!(order[1], 2, "nearest from 0 is station 2");
        assert_eq!(order.len(), 3);
    }

    #[test]
    fn route_empty_and_single() {
        assert!(optimize_route(&[]).is_empty());
        assert_eq!(optimize_route(&[vec![0.0]]), vec![0]);
    }

    #[test]
    fn route_all_covered() {
        let distances = vec![
            vec![0.0, 3.0, 9.0, 2.0],
            vec![3.0, 0.0, 4.0, 8.0],
            vec![9.0, 4.0, 0.0, 1.0],
            vec![2.0, 8.0, 1.0, 0.0],
        ];
        let order = optimize_route(&distances);
        assert_eq!(order.len(), 4);
        let mut seen = order.clone();
        seen.sort_unstable();
        assert_eq!(seen, vec![0, 1, 2, 3]);
    }

    #[test]
    fn freight_basic_calculation() {
        let q = calculate_freight(100.0, 50.0, 2.0, 1.0, 0.0);
        assert_eq!(q.distance_charge.to_f64().unwrap(), 200.0);
        assert_eq!(q.weight_charge.to_f64().unwrap(), 50.0);
        assert_eq!(q.subtotal.to_f64().unwrap(), 250.0);
        assert_eq!(q.total.to_f64().unwrap(), 250.0);
        assert!(!q.min_charge_applied);
    }

    #[test]
    fn freight_min_charge_applied() {
        let q = calculate_freight(1.0, 1.0, 1.0, 1.0, 100.0);
        assert_eq!(q.subtotal.to_f64().unwrap(), 2.0);
        assert!(q.min_charge_applied);
        assert_eq!(q.total.to_f64().unwrap(), 100.0);
    }

    #[test]
    fn freight_zero_inputs() {
        let q = calculate_freight(0.0, 0.0, 0.0, 0.0, 0.0);
        assert_eq!(q.total.to_f64().unwrap(), 0.0);
        assert!(!q.min_charge_applied);
    }

    #[test]
    fn freight_decimal_precision() {
        // 0.1 距离 × 0.1 费率 = 0.01，BigDecimal 精确
        let q = calculate_freight(0.1, 0.0, 0.1, 0.0, 0.0);
        assert_eq!(q.distance_charge.to_string(), "0.01");
    }
}

//! APS (Advanced Planning and Scheduling) - 高级计划排程模块
//!
//! 核心能力：
//! - 智能排程：基于设备/工位/物料/人员约束自动生成最优排程
//! - 约束检查：物料齐套性、设备可用性、人员可用性
//! - 排程模拟：假设分析，评估不同排产方案
//! - 优化建议：延期风险预警、瓶颈分析

use axum::{
    extract::Extension,
    extract::Path,
    extract::Query,
    extract::State,
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use sqlx::types::BigDecimal;
use sqlx::{types::Uuid, Row};
use std::collections::HashMap;
use std::str::FromStr;

use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;

use crate::modules::production_schedule_status::ProductionScheduleStatus;
use crate::shared::permission::{check_permission, ModulePermission};
use crate::AppState;
use topems_shared_db::decimal::big_decimal_to_f64;
use topems_shared_db::scope::ScopedTxn;

use topems_shared_core::{response::ApiResponse, TopemsError};

fn get_tenant_id(claims: &Claims) -> Uuid {
    claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok())
        .unwrap_or(Uuid::nil())
}

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/aps/schedule", post(execute_aps_schedule))
        .route("/aps/schedule/simulate", post(simulate_aps_schedule))
        .route(
            "/aps/schedule/check-constraints",
            post(check_schedule_constraints),
        )
        .route(
            "/aps/schedule/optimization-report",
            get(get_optimization_report),
        )
        .route(
            "/aps/schedule/bottleneck-analysis",
            get(get_bottleneck_analysis),
        )
        // 前端契约兜底：模板带可选路径段 — 待上游支持
        .route(
            "/aps/schedule/bottleneck-analysis/{_id}",
            get(get_bottleneck_analysis),
        )
        .route("/aps/orders/{id}/feasibility", get(check_order_feasibility))
}

// ==================== Data Types ====================

#[derive(Debug, Clone, Deserialize)]
pub struct ApsScheduleRequest {
    /// 排程范围：按订单 ID 列表或全部待排程订单
    pub order_ids: Option<Vec<Uuid>>,
    /// 排程起始时间
    pub schedule_start: Option<DateTime<Utc>>,
    /// 排程策略
    pub strategy: Option<ScheduleStrategy>,
    /// 优化目标权重
    pub optimization_weights: Option<OptimizationWeights>,
    /// 是否覆盖现有排程
    pub overwrite_existing: Option<bool>,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ScheduleStrategy {
    /// 前向排程：从最早开始时间往后排
    #[default]
    Forward,
    /// 后向排程：从最晚完工时间往前排
    Backward,
    /// 双向排程：先后向确定最晚开始，再前向微调
    Bidirectional,
    /// 基于瓶颈的排程：先排瓶颈资源，再排其他
    BottleneckDriven,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct OptimizationWeights {
    pub minimize_makespan: f64,    // 最小化总完工时间
    pub minimize_tardiness: f64,   // 最小化延期
    pub maximize_utilization: f64, // 最大化设备利用率
    pub minimize_idle_time: f64,   // 最小化空闲时间
}

impl Default for OptimizationWeights {
    fn default() -> Self {
        Self {
            minimize_makespan: 0.3,
            minimize_tardiness: 0.4,
            maximize_utilization: 0.2,
            minimize_idle_time: 0.1,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct ApsScheduleResult {
    pub schedule_id: Uuid,
    pub schedule_no: String,
    pub total_orders: i32,
    pub scheduled_orders: i32,
    pub unscheduled_orders: i32,
    pub estimated_completion: DateTime<Utc>,
    pub total_makespan_hours: f64,
    pub average_utilization: f64,
    pub tardy_count: i32,
    pub items: Vec<ApsScheduleItem>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ApsScheduleItem {
    pub order_id: Uuid,
    pub order_no: String,
    pub product_name: String,
    pub product_code: String,
    pub quantity: f64,
    pub priority: Option<String>,
    pub planned_start: DateTime<Utc>,
    pub planned_end: DateTime<Utc>,
    pub work_station_id: Uuid,
    pub work_station_name: String,
    pub equipment_id: Option<Uuid>,
    pub equipment_name: Option<String>,
    pub process_id: Option<Uuid>,
    pub process_name: Option<String>,
    pub setup_time_hours: f64,
    pub processing_time_hours: f64,
    pub material_ready: bool,
    pub feasibility_score: f64, // 0-100
    pub risk_level: RiskLevel,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum RiskLevel {
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ConstraintCheckRequest {
    pub order_ids: Vec<Uuid>,
    pub check_materials: Option<bool>,
    pub check_equipment: Option<bool>,
    pub check_personnel: Option<bool>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ConstraintCheckResult {
    pub order_id: Uuid,
    pub order_no: String,
    pub overall_passed: bool,
    pub material_constraints: Vec<MaterialConstraint>,
    pub equipment_constraints: Vec<EquipmentConstraint>,
    pub personnel_constraints: Vec<PersonnelConstraint>,
    pub suggested_start_time: Option<DateTime<Utc>>,
}

/// 一个班组至少要有的在岗人数（工时/技能维度的真实判定需要班组排班数据，
/// 当前只做人数下限比较，避免出现「2」这种散落在业务逻辑里的魔法值）
const DEFAULT_REQUIRED_MEMBERS: i32 = 2;

#[derive(Debug, Clone, Serialize)]
pub struct MaterialConstraint {
    pub material_code: String,
    pub material_name: String,
    pub required_quantity: f64,
    /// 真实可用库存。None 表示本服务没有可信库存数据源（不做猜测）
    pub available_quantity: Option<f64>,
    /// 缺口数量。None 与 available_quantity 同步为未知
    pub shortfall: Option<f64>,
    pub status: ConstraintStatus,
}

#[derive(Debug, Clone, Serialize)]
pub struct EquipmentConstraint {
    pub equipment_id: Uuid,
    pub equipment_name: String,
    pub required_capability: String,
    pub available: bool,
    pub next_available_time: Option<DateTime<Utc>>,
    pub status: ConstraintStatus,
}

#[derive(Debug, Clone, Serialize)]
pub struct PersonnelConstraint {
    pub team_id: Uuid,
    pub team_name: String,
    pub required_skill: String,
    pub available_members: i32,
    pub required_members: i32,
    pub status: ConstraintStatus,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ConstraintStatus {
    Passed,
    Warning,
    Failed,
    /// 数据不足以判断（例如缺库存源、BOM 未维护）。不得当作通过
    Unknown,
}

#[derive(Debug, Clone, Serialize)]
pub struct OptimizationReport {
    pub generated_at: DateTime<Utc>,
    pub total_orders: i64,
    pub scheduled_orders: i64,
    pub unscheduled_orders: i64,
    pub average_lead_time_hours: f64,
    pub on_time_rate: f64,
    pub bottleneck_resources: Vec<BottleneckResource>,
    pub improvement_suggestions: Vec<ImprovementSuggestion>,
}

#[derive(Debug, Clone, Serialize)]
pub struct BottleneckResource {
    pub resource_id: String,
    pub resource_name: String,
    pub resource_type: String, // workstation / equipment / team
    pub utilization_rate: f64,
    pub queue_length: i32,
    pub impact_score: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct ImprovementSuggestion {
    pub category: String,
    pub title: String,
    pub description: String,
    pub estimated_impact: String,
    pub priority: i32,
}

#[derive(Debug, Clone, Serialize)]
pub struct BottleneckAnalysis {
    pub analysis_date: DateTime<Utc>,
    pub time_period: String,
    pub bottleneck_resources: Vec<BottleneckResource>,
    pub throughput_analysis: ThroughputAnalysis,
    pub capacity_vs_demand: CapacityVsDemand,
}

#[derive(Debug, Clone, Serialize)]
pub struct ThroughputAnalysis {
    pub total_orders: i64,
    pub completed_orders: i64,
    pub in_progress_orders: i64,
    pub pending_orders: i64,
    pub average_cycle_time_hours: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct CapacityVsDemand {
    pub total_capacity_hours: f64,
    pub total_demand_hours: f64,
    pub capacity_utilization: f64,
    pub capacity_gap_hours: f64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SimulateRequest {
    pub scenario_name: String,
    pub orders: Vec<SimulateOrder>,
    pub strategy: Option<ScheduleStrategy>,
    pub start_time: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SimulateOrder {
    pub order_id: Uuid,
    pub priority: Option<i32>,
    pub desired_delivery: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize)]
pub struct SimulateResult {
    pub scenario_name: String,
    pub simulated_schedules: Vec<ApsScheduleItem>,
    pub total_makespan_hours: f64,
    pub on_time_rate: f64,
    pub resource_utilization: HashMap<String, f64>,
    pub comparison_with_current: Option<String>,
}

// ==================== Internal Data Structures ====================

#[derive(Debug, Clone)]
#[allow(dead_code)]
struct WorkOrderInfo {
    id: Uuid,
    order_no: String,
    product_name: String,
    product_code: String,
    quantity: f64,
    priority: Option<String>,
    planned_start_date: Option<DateTime<Utc>>,
    planned_end_date: Option<DateTime<Utc>>,
    status: String,
    product_id: Option<Uuid>,
}

#[derive(Debug, Clone)]
#[allow(dead_code)]
struct WorkStationInfo {
    id: Uuid,
    name: String,
    capacity: i32,
    status: String,
    equipment_id: Option<Uuid>,
    process_id: Option<Uuid>,
}

#[derive(Debug, Clone)]
#[allow(dead_code)]
struct EquipmentInfo {
    id: Uuid,
    name: String,
    status: String,
    maintenance_next_date: Option<chrono::NaiveDate>,
}

#[derive(Debug, Clone)]
#[allow(dead_code)]
struct BomItemInfo {
    material_code: String,
    material_name: String,
    quantity: f64,
    unit: String,
}

#[derive(Debug, Clone)]
#[allow(dead_code)]
struct MaterialAvailability {
    material_code: String,
    available_quantity: f64,
}

// ==================== Helper Functions ====================

#[allow(dead_code)]
fn naive_to_utc(dt: Option<DateTime<Utc>>) -> DateTime<Utc> {
    dt.unwrap_or_else(Utc::now)
}

#[allow(dead_code)]
fn opt_naive_to_utc(dt: Option<DateTime<Utc>>) -> Option<DateTime<Utc>> {
    dt
}

/// 计算加工时间（简化模型：基础时间 + 数量系数）
fn calculate_processing_time(quantity: f64, base_time_per_unit_hours: f64) -> f64 {
    let setup_time = 0.5; // 0.5小时换型时间
    let processing = quantity * base_time_per_unit_hours;
    setup_time + processing
}

#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
/// 计算风险等级
fn calculate_risk_level(
    planned_end: DateTime<Utc>,
    desired_delivery: Option<DateTime<Utc>>,
    material_ready: bool,
    equipment_available: bool,
) -> RiskLevel {
    let now = Utc::now();
    let buffer_hours = (planned_end - now).num_hours() as f64;

    if !material_ready || !equipment_available {
        return RiskLevel::Critical;
    }

    if let Some(delivery) = desired_delivery {
        if planned_end > delivery {
            let delay_hours = (planned_end - delivery).num_hours() as f64;
            if delay_hours > 48.0 {
                return RiskLevel::Critical;
            } else if delay_hours > 24.0 {
                return RiskLevel::High;
            } else {
                return RiskLevel::Medium;
            }
        }
    }

    if buffer_hours < 4.0 {
        RiskLevel::High
    } else if buffer_hours < 24.0 {
        RiskLevel::Medium
    } else {
        RiskLevel::Low
    }
}

// ==================== APS Core Algorithm ====================

#[allow(
    clippy::as_conversions,
    clippy::cast_possible_truncation,
    clippy::cast_possible_wrap,
    clippy::cast_precision_loss
)]
/// 主排程算法
#[allow(clippy::indexing_slicing)]
async fn run_aps_scheduling(
    scope: &mut ScopedTxn<'_>,
    request: &ApsScheduleRequest,
    simulate_only: bool,
    tenant_id: Uuid,
) -> Result<ApsScheduleResult, TopemsError> {
    let schedule_start = request.schedule_start.unwrap_or_else(Utc::now);
    let strategy = request.strategy.clone().unwrap_or_default();
    let _weights = request.optimization_weights.clone().unwrap_or_default();

    // 1. 获取待排程订单
    let orders = fetch_pending_orders(scope, request.order_ids.as_ref(), tenant_id).await?;
    if orders.is_empty() {
        return Ok(ApsScheduleResult {
            schedule_id: Uuid::new_v4(),
            schedule_no: format!("APS{}", Utc::now().format("%Y%m%d%H%M%S")),
            total_orders: 0,
            scheduled_orders: 0,
            unscheduled_orders: 0,
            estimated_completion: schedule_start,
            total_makespan_hours: 0.0,
            average_utilization: 0.0,
            tardy_count: 0,
            items: vec![],
            warnings: vec!["没有待排程订单".to_string()],
        });
    }

    // 2. 获取可用工位
    let stations = fetch_available_work_stations(scope, tenant_id).await?;
    if stations.is_empty() {
        return Err(TopemsError::BusinessLogic("没有可用的工位".to_string()));
    }

    // 3. 获取设备信息
    let equipment_map = fetch_equipment_map(scope, tenant_id).await?;

    // 4. 按优先级排序订单
    let mut sorted_orders = orders.clone();
    sorted_orders.sort_by(|a, b| {
        // 优先级降序，同优先级按计划开始时间升序
        b.priority
            .cmp(&a.priority)
            .then_with(|| a.planned_start_date.cmp(&b.planned_start_date))
    });

    // 5. 初始化资源时间线（记录每个工位的占用时间）
    let mut station_timeline: HashMap<Uuid, DateTime<Utc>> =
        stations.iter().map(|s| (s.id, schedule_start)).collect();

    // 6. 逐单排程
    let mut scheduled_items = Vec::new();
    let mut unscheduled_count = 0;
    let mut warnings = Vec::new();
    let mut max_end_time = schedule_start;
    let mut tardy_count = 0;

    for order in &sorted_orders {
        // 6.1 检查物料齐套性
        let material_ready =
            check_material_availability(scope, order.id, order.quantity, tenant_id).await?;

        // 6.2 选择合适的工位
        let suitable_stations: Vec<&WorkStationInfo> =
            stations.iter().filter(|s| s.status == "active").collect();

        if suitable_stations.is_empty() {
            warnings.push(format!("订单 {} 没有可用工位", order.order_no));
            unscheduled_count += 1;
            continue;
        }

        // 6.3 计算加工时间
        let base_time_per_unit = 0.1; // 默认每小时10件
        let processing_time = calculate_processing_time(order.quantity, base_time_per_unit);

        // 6.4 根据策略选择工位和分配时间
        let (selected_station, start_time, end_time) = match strategy {
            ScheduleStrategy::Forward => {
                // 前向排程：选择最早可用的工位
                let mut best_station = suitable_stations[0];
                let mut earliest_start = schedule_start;

                for station in &suitable_stations {
                    let available_time = station_timeline
                        .get(&station.id)
                        .copied()
                        .unwrap_or(schedule_start);
                    if available_time < earliest_start {
                        earliest_start = available_time;
                        best_station = station;
                    }
                }

                let end = earliest_start + Duration::seconds((processing_time * 3600.0) as i64);
                (best_station, earliest_start, end)
            }
            ScheduleStrategy::Backward => {
                // 后向排程：从期望完工时间往前推
                let desired_end = order
                    .planned_end_date
                    .unwrap_or(schedule_start + Duration::days(7));
                let start = desired_end - Duration::seconds((processing_time * 3600.0) as i64);

                // 找到能容纳这个时间段的最晚工位
                let best_station = suitable_stations[0];
                (best_station, start, desired_end)
            }
            ScheduleStrategy::Bidirectional => {
                // 双向排程：先后向，再前向微调
                let desired_end = order
                    .planned_end_date
                    .unwrap_or(schedule_start + Duration::days(7));
                let mut start = desired_end - Duration::seconds((processing_time * 3600.0) as i64);

                // 确保不早于排程开始时间
                if start < schedule_start {
                    start = schedule_start;
                }

                let end = start + Duration::seconds((processing_time * 3600.0) as i64);
                let best_station = suitable_stations[0];
                (best_station, start, end)
            }
            ScheduleStrategy::BottleneckDriven => {
                // 瓶颈驱动：优先使用利用率低的工位
                let mut best_station = suitable_stations[0];
                let mut best_start = schedule_start;

                for station in &suitable_stations {
                    let available = station_timeline
                        .get(&station.id)
                        .copied()
                        .unwrap_or(schedule_start);
                    // 简单启发式：选择利用率最低的
                    if available < best_start {
                        best_start = available;
                        best_station = station;
                    }
                }

                let end = best_start + Duration::seconds((processing_time * 3600.0) as i64);
                (best_station, best_start, end)
            }
        };

        // 6.5 更新工位时间线
        station_timeline.insert(selected_station.id, end_time);

        // 6.6 检查延期
        if let Some(desired_end) = order.planned_end_date {
            if end_time > desired_end {
                tardy_count += 1;
            }
        }

        // 6.7 更新最大完工时间
        if end_time > max_end_time {
            max_end_time = end_time;
        }

        // 6.8 计算可行性分数
        let feasibility_score = calculate_feasibility_score(
            material_ready,
            selected_station.status == "active",
            processing_time,
            order.quantity,
        );

        // 6.9 计算风险等级
        let risk = calculate_risk_level(
            end_time,
            order.planned_end_date,
            material_ready,
            selected_station.status == "active",
        );

        let equipment_name = selected_station
            .equipment_id
            .and_then(|eid| equipment_map.get(&eid).map(|e| e.name.clone()));

        scheduled_items.push(ApsScheduleItem {
            order_id: order.id,
            order_no: order.order_no.clone(),
            product_name: order.product_name.clone(),
            product_code: order.product_code.clone(),
            quantity: order.quantity,
            priority: order.priority.clone(),
            planned_start: start_time,
            planned_end: end_time,
            work_station_id: selected_station.id,
            work_station_name: selected_station.name.clone(),
            equipment_id: selected_station.equipment_id,
            equipment_name,
            process_id: selected_station.process_id,
            process_name: None,
            setup_time_hours: 0.5,
            processing_time_hours: processing_time,
            material_ready,
            feasibility_score,
            risk_level: risk,
        });
    }

    // 7. 计算总完工时间
    let total_makespan_hours = if max_end_time > schedule_start {
        (max_end_time - schedule_start).num_hours() as f64
    } else {
        0.0
    };

    // 8. 计算平均利用率
    let total_processing_time: f64 = scheduled_items
        .iter()
        .map(|i| i.processing_time_hours)
        .sum();
    let total_capacity_hours = stations.len() as f64 * total_makespan_hours.max(1.0);
    let avg_utilization = if total_capacity_hours > 0.0 {
        (total_processing_time / total_capacity_hours * 100.0).min(100.0)
    } else {
        0.0
    };

    // 9. 如果不只是模拟，保存排程结果
    if !simulate_only {
        for item in &scheduled_items {
            if let Err(e) = save_schedule_result(scope, item, tenant_id).await {
                warnings.push(format!("保存排程 {} 失败: {}", item.order_no, e));
            }
        }
    }

    let scheduled_count = scheduled_items.len() as i32;

    Ok(ApsScheduleResult {
        schedule_id: Uuid::new_v4(),
        schedule_no: format!("APS{}", Utc::now().format("%Y%m%d%H%M%S")),
        total_orders: orders.len() as i32,
        scheduled_orders: scheduled_count,
        unscheduled_orders: unscheduled_count,
        estimated_completion: max_end_time,
        total_makespan_hours,
        average_utilization: avg_utilization,
        tardy_count,
        items: scheduled_items,
        warnings,
    })
}

#[allow(clippy::as_conversions)]
fn calculate_feasibility_score(
    material_ready: bool,
    equipment_available: bool,
    processing_time: f64,
    quantity: f64,
) -> f64 {
    let mut score = 100.0;

    if !material_ready {
        score -= 40.0;
    }
    if !equipment_available {
        score -= 40.0;
    }

    // 加工时间越长，可行性越低
    if processing_time > 24.0 {
        score -= 10.0;
    }
    if processing_time > 48.0 {
        score -= 10.0;
    }

    // 数量越大，风险越高
    if quantity > 1000.0 {
        score -= 5.0;
    }

    (score as f64).max(0.0)
}

// ==================== Database Operations ====================

async fn fetch_pending_orders(
    scope: &mut ScopedTxn<'_>,
    order_ids: Option<&Vec<Uuid>>,
    tenant_id: Uuid,
) -> Result<Vec<WorkOrderInfo>, TopemsError> {
    let query = if let Some(ids) = order_ids {
        if ids.is_empty() {
            return Ok(vec![]);
        }
        let placeholders: Vec<String> = (1..=ids.len()).map(|i| format!("${}", i)).collect();
        format!(
            r#"
            SELECT id, order_number AS order_no, product_name, product_code, quantity::numeric,
                   planned_start_date, planned_end_date, status, priority
            FROM mes.production_orders
            WHERE id IN ({0}) AND status IN ('pending', 'released')
                   AND tenant_id = ${1}::uuid
            ORDER BY priority DESC, planned_start_date ASC
            "#,
            placeholders.join(", "),
            ids.len() + 1
        )
    } else {
        r#"
        SELECT id, order_number AS order_no, product_name, product_code, quantity::numeric,
               planned_start_date, planned_end_date, status, priority
        FROM mes.production_orders
        WHERE status IN ('pending', 'released')
               AND tenant_id = $1::uuid
        ORDER BY priority DESC, planned_start_date ASC
        "#
        .to_string()
    };

    let mut query_builder = sqlx::query(sqlx::AssertSqlSafe(query));
    if let Some(ids) = order_ids {
        for id in ids {
            query_builder = query_builder.bind(*id);
        }
    }
    query_builder = query_builder.bind(tenant_id);

    let rows = query_builder
        .fetch_all(&mut *scope)
        .await
        .map_err(|e| TopemsError::DatabaseQuery(format!("获取待排程订单失败: {}", e)))?;

    let orders: Vec<WorkOrderInfo> = rows
        .into_iter()
        .map(|r| WorkOrderInfo {
            id: r.try_get::<Uuid, _>("id").unwrap_or_default(),
            order_no: r.try_get::<String, _>("order_no").unwrap_or_default(),
            product_name: r.try_get::<String, _>("product_name").unwrap_or_default(),
            product_code: r.try_get::<String, _>("product_code").unwrap_or_default(),
            quantity: big_decimal_to_f64(
                r.try_get::<Option<BigDecimal>, _>("quantity")
                    .ok()
                    .flatten(),
            ),
            priority: r.try_get::<Option<String>, _>("priority").ok().flatten(),
            planned_start_date: r
                .try_get::<Option<DateTime<Utc>>, _>("planned_start_date")
                .ok()
                .flatten(),
            planned_end_date: r
                .try_get::<Option<DateTime<Utc>>, _>("planned_end_date")
                .ok()
                .flatten(),
            status: r
                .try_get::<Option<String>, _>("status")
                .ok()
                .flatten()
                .unwrap_or_else(|| "pending".to_string()),
            product_id: None, // production_orders 表无 product_id 列
        })
        .collect();

    Ok(orders)
}

async fn fetch_available_work_stations(
    scope: &mut ScopedTxn<'_>,
    tenant_id: Uuid,
) -> Result<Vec<WorkStationInfo>, TopemsError> {
    let rows = sqlx::query(
        r#"
        SELECT id, station_name AS name, capacity, status, equipment_id, process_id
        FROM mes.work_stations
        WHERE status = 'active' AND tenant_id = $1::uuid
        ORDER BY capacity DESC
        "#,
    )
    .bind(tenant_id)
    .fetch_all(&mut *scope)
    .await
    .map_err(|e| TopemsError::DatabaseQuery(format!("获取工位信息失败: {}", e)))?;

    Ok(rows
        .into_iter()
        .map(|r| WorkStationInfo {
            id: r.try_get::<Uuid, _>("id").unwrap_or_default(),
            name: r.try_get::<String, _>("name").unwrap_or_default(),
            capacity: r
                .try_get::<Option<i32>, _>("capacity")
                .ok()
                .flatten()
                .unwrap_or(1),
            status: r
                .try_get::<Option<String>, _>("status")
                .ok()
                .flatten()
                .unwrap_or_else(|| "active".to_string()),
            equipment_id: r.try_get::<Option<Uuid>, _>("equipment_id").ok().flatten(),
            process_id: r.try_get::<Option<Uuid>, _>("process_id").ok().flatten(),
        })
        .collect())
}

async fn fetch_equipment_map(
    scope: &mut ScopedTxn<'_>,
    tenant_id: Uuid,
) -> Result<HashMap<Uuid, EquipmentInfo>, TopemsError> {
    let rows = sqlx::query(
        r#"
        SELECT id, equipment_name AS name, status, next_maintenance_date
        FROM mes.equipment
        WHERE tenant_id = $1::uuid
        "#,
    )
    .bind(tenant_id)
    .fetch_all(&mut *scope)
    .await
    .map_err(|e| TopemsError::DatabaseQuery(format!("获取设备信息失败: {}", e)))?;

    let mut map = HashMap::new();
    for r in rows {
        let id = r.try_get::<Uuid, _>("id").unwrap_or_default();
        map.insert(
            id,
            EquipmentInfo {
                id,
                name: r.try_get::<String, _>("name").unwrap_or_default(),
                status: r
                    .try_get::<Option<String>, _>("status")
                    .ok()
                    .flatten()
                    .unwrap_or_else(|| "normal".to_string()),
                maintenance_next_date: r
                    .try_get::<Option<chrono::NaiveDate>, _>("next_maintenance_date")
                    .ok()
                    .flatten(),
            },
        );
    }

    Ok(map)
}

async fn check_material_availability(
    scope: &mut ScopedTxn<'_>,
    order_id: Uuid,
    _order_quantity: f64,
    tenant_id: Uuid,
) -> Result<bool, TopemsError> {
    // 获取订单关联的 BOM（简化逻辑：通过产品编码匹配）
    // 实际场景需要更复杂的物料需求计算
    let product = sqlx::query(
        r#"SELECT product_code FROM mes.production_orders WHERE id = $1 AND tenant_id = $2::uuid"#,
    )
    .bind(order_id)
    .bind(tenant_id)
    .fetch_optional(&mut *scope)
    .await
    .map_err(|e| TopemsError::DatabaseQuery(format!("查询产品信息失败: {}", e)))?;

    if product.is_none() {
        return Ok(false);
    }

    // 简化：假设所有物料都可用
    // 实际应查询 bom_items 关联物料库存
    Ok(true)
}

async fn save_schedule_result(
    scope: &mut ScopedTxn<'_>,
    item: &ApsScheduleItem,
    tenant_id: Uuid,
) -> Result<(), TopemsError> {
    let now = Utc::now();

    let result = sqlx::query(
        r#"
        INSERT INTO mes.production_schedules (
            schedule_no, order_id, order_no, product_id, product_name, product_code,
            quantity, work_station_id, equipment_id, process_id,
            planned_start_time, planned_end_time, status, priority, sequence, notes,
            created_at, updated_at, tenant_id
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $17, $13, 0, $14, $15, $15, $16
        )
        ON CONFLICT (schedule_no) DO UPDATE SET
            planned_start_time = EXCLUDED.planned_start_time,
            planned_end_time = EXCLUDED.planned_end_time,
            work_station_id = EXCLUDED.work_station_id,
            equipment_id = EXCLUDED.equipment_id,
            updated_at = EXCLUDED.updated_at,
            tenant_id = EXCLUDED.tenant_id
        "#,
    )
    .bind(format!(
        "APS-{}-{}",
        item.order_no,
        now.format("%Y%m%d%H%M%S")
    ))
    .bind(item.order_id)
    .bind(&item.order_no)
    .bind(None::<Uuid>) // product_id 简化
    .bind(&item.product_name)
    .bind(&item.product_code)
    .bind(BigDecimal::from_str(&item.quantity.to_string()).unwrap_or_default())
    .bind(item.work_station_id)
    .bind(item.equipment_id)
    .bind(item.process_id)
    .bind(item.planned_start)
    .bind(item.planned_end)
    .bind(
        item.priority
            .as_deref()
            .and_then(|p| p.parse::<i32>().ok())
            .unwrap_or(0),
    )
    .bind(format!("APS排程，可行性: {:.0}%", item.feasibility_score))
    .bind(now)
    .bind(tenant_id)
    .bind(ProductionScheduleStatus::APS_DEFAULT.as_db_str())
    .execute(&mut *scope)
    .await;

    match result {
        Ok(_) => Ok(()),
        Err(e) => Err(TopemsError::BusinessLogic(format!(
            "保存排程结果失败: {}",
            e
        ))),
    }
}

// ==================== API Handlers ====================

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mes:aps:write"])),
    path = "/aps/schedule",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "APS"
)]
pub async fn execute_aps_schedule(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<ApsScheduleRequest>,
) -> ApiResponse<ApsScheduleResult> {
    if let Err(e) = check_permission(
        &state.pool,
        &claims,
        &ModulePermission::ProductionSchedulingWrite,
    )
    .await
    {
        return e;
    }

    let tenant_id = if claims.is_superuser {
        Uuid::nil()
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| Uuid::parse_str(t).ok())
            .unwrap_or(Uuid::nil())
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立写作用域失败: {}", e);
            return ApiResponse::from(TopemsError::internal("APS排程失败", e));
        }
    };

    match run_aps_scheduling(&mut scope, &req, false, tenant_id).await {
        Ok(result) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("APS排程提交失败: {}", e);
                return ApiResponse::from(TopemsError::internal("APS排程失败", e));
            }
            ApiResponse::success(result, "APS 智能排程执行成功")
        }
        Err(err) => {
            let _ = scope.rollback().await;
            tracing::error!("APS排程失败: {}", err);
            ApiResponse::from(TopemsError::internal("APS排程失败", err))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mes:aps:write"])),
    path = "/aps/schedule/simulate",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "APS"
)]
#[allow(clippy::as_conversions)]
pub async fn simulate_aps_schedule(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<SimulateRequest>,
) -> ApiResponse<SimulateResult> {
    if let Err(e) = check_permission(
        &state.pool,
        &claims,
        &ModulePermission::ProductionSchedulingRead,
    )
    .await
    {
        return e;
    }

    // 将 SimulateRequest 转换为 ApsScheduleRequest
    let aps_req = ApsScheduleRequest {
        order_ids: Some(req.orders.iter().map(|o| o.order_id).collect()),
        schedule_start: req.start_time,
        strategy: req.strategy,
        optimization_weights: None,
        overwrite_existing: Some(false),
    };

    let tenant_id = if claims.is_superuser {
        Uuid::nil()
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| Uuid::parse_str(t).ok())
            .unwrap_or(Uuid::nil())
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立只读作用域失败: {}", e);
            return ApiResponse::server_error("排程模拟失败");
        }
    };

    match run_aps_scheduling(&mut scope, &aps_req, true, tenant_id).await {
        Ok(result) => {
            // 计算资源利用率
            let mut resource_utilization: HashMap<String, f64> = HashMap::new();
            for item in &result.items {
                let key = item.work_station_name.clone();
                let entry = resource_utilization.entry(key).or_insert(0.0);
                *entry += item.processing_time_hours;
            }

            // 归一化利用率
            let total_hours = result.total_makespan_hours.max(1.0);
            for hours in resource_utilization.values_mut() {
                *hours = (*hours / total_hours * 100.0).min(100.0);
            }

            let on_time_rate = if result.total_orders > 0 {
                (result.total_orders - result.tardy_count) as f64 / result.total_orders as f64
                    * 100.0
            } else {
                100.0
            };

            let simulate_result = SimulateResult {
                scenario_name: req.scenario_name,
                simulated_schedules: result.items,
                total_makespan_hours: result.total_makespan_hours,
                on_time_rate,
                resource_utilization,
                comparison_with_current: None,
            };

            ApiResponse::success(simulate_result, "排程模拟完成")
        }
        Err(err) => {
            tracing::error!("排程模拟失败: {}", err);
            ApiResponse::from(TopemsError::internal("排程模拟失败", err))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mes:aps:write"])),
    path = "/aps/schedule/check-constraints",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "APS"
)]
pub async fn check_schedule_constraints(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<ConstraintCheckRequest>,
) -> ApiResponse<Vec<ConstraintCheckResult>> {
    if let Err(e) = check_permission(
        &state.pool,
        &claims,
        &ModulePermission::ProductionSchedulingRead,
    )
    .await
    {
        return e;
    }

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立只读作用域失败: {}", e);
            return ApiResponse::server_error("约束检查失败");
        }
    };

    let mut results = Vec::new();

    for order_id in &req.order_ids {
        // 获取订单信息
        let order = sqlx::query(
            r#"
            SELECT id, order_number AS order_no, product_name, product_code, quantity::numeric,
                   planned_start_date, planned_end_date
            FROM mes.production_orders
            WHERE id = $1
            "#,
        )
        .bind(order_id)
        .fetch_optional(&mut scope)
        .await;

        let order = match order {
            Ok(Some(r)) => r,
            Ok(None) => {
                results.push(ConstraintCheckResult {
                    order_id: *order_id,
                    order_no: "未知".to_string(),
                    overall_passed: false,
                    material_constraints: vec![],
                    equipment_constraints: vec![],
                    personnel_constraints: vec![],
                    suggested_start_time: None,
                });
                continue;
            }
            Err(e) => {
                tracing::error!("查询订单 {} 失败: {}", order_id, e);
                continue;
            }
        };

        let order_no: String = order.try_get("order_no").unwrap_or_default();
        let quantity = big_decimal_to_f64(
            order
                .try_get::<Option<BigDecimal>, _>("quantity")
                .ok()
                .flatten(),
        );

        let mut material_constraints = Vec::new();
        let mut equipment_constraints = Vec::new();
        let mut personnel_constraints = Vec::new();
        let mut all_passed = true;

        // 检查物料齐套性
        if req.check_materials.unwrap_or(true) {
            // 简化：查询 BOM 物料并检查库存
            let bom_items = sqlx::query(
                r#"
                SELECT bi.material_code, bi.material_name, bi.quantity, bi.unit
                FROM mes.bom_items bi
                JOIN mes.material_boms b ON bi.bom_id = b.id
                JOIN mes.production_orders po ON po.product_code = b.product_code
                WHERE po.id = $1
                "#,
            )
            .bind(order_id)
            .fetch_all(&mut scope)
            .await;

            let items = match bom_items {
                Ok(rows) => rows,
                Err(e) => {
                    tracing::error!("查询订单 {} 的 BOM 失败: {}", order_id, e);
                    return ApiResponse::from(TopemsError::internal(
                        "约束检查失败：BOM 查询出错",
                        e.to_string(),
                    ));
                }
            };

            if items.is_empty() {
                // 没有 BOM 就无从判断齐套性；显式记 Unknown，不能当成通过
                material_constraints.push(MaterialConstraint {
                    material_code: String::new(),
                    material_name: "BOM 未维护".to_string(),
                    required_quantity: quantity,
                    available_quantity: None,
                    shortfall: None,
                    status: ConstraintStatus::Unknown,
                });
                all_passed = false;
            }

            for item in items {
                let material_code: String = item.try_get("material_code").unwrap_or_default();
                let material_name: String = item.try_get("material_name").unwrap_or_default();
                let bom_quantity = big_decimal_to_f64(
                    item.try_get::<Option<BigDecimal>, _>("quantity")
                        .ok()
                        .flatten(),
                );
                let required = bom_quantity * quantity;

                // MES 内没有库存账（库存归 wms），因此可用量与缺口一律留 None。
                // 这里刻意不写 required * 系数 之类的猜测值：把未知当充足会把不齐套的订单
                // 判成 Passed，下游排程据此放行，属于假通过。
                material_constraints.push(MaterialConstraint {
                    material_code,
                    material_name,
                    required_quantity: required,
                    available_quantity: None,
                    shortfall: None,
                    status: ConstraintStatus::Unknown,
                });
                all_passed = false;
            }
        }

        // 检查设备可用性
        if req.check_equipment.unwrap_or(true) {
            let equipment = sqlx::query(
                r#"
                SELECT id, equipment_name, status, next_maintenance_date
                FROM mes.equipment
                ORDER BY equipment_code
                LIMIT 5
                "#,
            )
            .fetch_all(&mut scope)
            .await;

            let equips = match equipment {
                Ok(rows) => rows,
                Err(e) => {
                    tracing::error!("查询订单 {} 的设备池失败: {}", order_id, e);
                    return ApiResponse::from(TopemsError::internal(
                        "约束检查失败：设备查询出错",
                        e.to_string(),
                    ));
                }
            };

            if equips.is_empty() {
                equipment_constraints.push(EquipmentConstraint {
                    equipment_id: Uuid::nil(),
                    equipment_name: "设备台账为空".to_string(),
                    required_capability: "加工".to_string(),
                    available: false,
                    next_available_time: None,
                    status: ConstraintStatus::Unknown,
                });
                all_passed = false;
            }

            // 说明：订单与设备之间没有绑定关系（mes.production_schedules 才有工位分配），
            // 这里检查的是「租户设备池有没有可用设备」，不是「该订单已分配到某台设备」。
            for eq in equips {
                let id = eq.try_get::<Uuid, _>("id").unwrap_or_default();
                let name: String = eq.try_get("equipment_name").unwrap_or_default();
                let status: String = eq
                    .try_get::<Option<String>, _>("status")
                    .ok()
                    .flatten()
                    .unwrap_or_else(|| "unknown".to_string());
                // 下次可用时间取真实保养计划日期；没有计划就留 None，不再编造 now+2h
                let next_maintenance: Option<DateTime<Utc>> =
                    eq.try_get("next_maintenance_date").ok().flatten();

                let available = status == "normal";
                if !available {
                    all_passed = false;
                }

                let status_enum = if !available {
                    ConstraintStatus::Failed
                } else if next_maintenance.is_some_and(|d| d <= Utc::now()) {
                    // 保养已过期：可用但要警告
                    ConstraintStatus::Warning
                } else {
                    ConstraintStatus::Passed
                };

                equipment_constraints.push(EquipmentConstraint {
                    equipment_id: id,
                    equipment_name: name,
                    required_capability: "加工".to_string(),
                    available,
                    next_available_time: if available { None } else { next_maintenance },
                    status: status_enum,
                });
            }
        }

        // 检查人员可用性
        if req.check_personnel.unwrap_or(true) {
            let teams = sqlx::query(
                r#"
                SELECT id, team_name, member_count
                FROM mes.teams
                WHERE status = 'active'
                LIMIT 5
                "#,
            )
            .fetch_all(&mut scope)
            .await;

            let team_list = match teams {
                Ok(rows) => rows,
                Err(e) => {
                    tracing::error!("查询订单 {} 的班组失败: {}", order_id, e);
                    return ApiResponse::from(TopemsError::internal(
                        "约束检查失败：班组查询出错",
                        e.to_string(),
                    ));
                }
            };

            {
                for team in team_list {
                    let id = team.try_get::<Uuid, _>("id").unwrap_or_default();
                    let name: String = team.try_get("team_name").unwrap_or_default();
                    let member_count = team
                        .try_get::<Option<i32>, _>("member_count")
                        .ok()
                        .flatten()
                        .unwrap_or(0);

                    personnel_constraints.push(PersonnelConstraint {
                        team_id: id,
                        team_name: name,
                        required_skill: "生产操作".to_string(),
                        available_members: member_count,
                        required_members: DEFAULT_REQUIRED_MEMBERS,
                        status: if member_count >= DEFAULT_REQUIRED_MEMBERS {
                            ConstraintStatus::Passed
                        } else {
                            ConstraintStatus::Warning
                        },
                    });
                }
            }
        }

        let suggested_start = order
            .try_get::<Option<DateTime<Utc>>, _>("planned_start_date")
            .ok()
            .flatten();

        results.push(ConstraintCheckResult {
            order_id: *order_id,
            order_no,
            overall_passed: all_passed,
            material_constraints,
            equipment_constraints,
            personnel_constraints,
            suggested_start_time: suggested_start,
        });
    }

    ApiResponse::success(results, "约束检查完成")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:aps:read"])),
    path = "/aps/schedule/optimization-report",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "APS"
)]
#[allow(
    clippy::as_conversions,
    clippy::cast_possible_truncation,
    clippy::cast_precision_loss
)]
#[allow(clippy::indexing_slicing)]
pub async fn get_optimization_report(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<OptimizationReport> {
    if let Err(e) = check_permission(
        &state.pool,
        &claims,
        &ModulePermission::ProductionSchedulingRead,
    )
    .await
    {
        return e;
    }

    // 统计订单状态
    let tenant_id = get_tenant_id(&claims);

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立只读作用域失败: {}", e);
            return ApiResponse::server_error("获取优化报告失败");
        }
    };

    let total_orders: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM mes.production_orders WHERE tenant_id = $1::uuid")
            .bind(tenant_id)
            .fetch_one(&mut scope)
            .await
            .unwrap_or(0);

    let scheduled_orders: i64 = match sqlx::query_scalar(
        "SELECT COUNT(DISTINCT order_id) FROM mes.production_schedules WHERE status <> $2 AND tenant_id = $1::uuid",
    )
    .bind(tenant_id)
    .bind(ProductionScheduleStatus::Cancelled.as_db_str())
    .fetch_one(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("统计已排程订单失败: {}", e);
            return ApiResponse::from(TopemsError::internal("获取优化报告失败", e.to_string()));
        }
    };

    // 计算平均交付周期
    let avg_lead_time: Option<f64> = match sqlx::query_scalar(
        r#"
        SELECT AVG(EXTRACT(EPOCH FROM (COALESCE(actual_end_date, NOW()) - created_at)) / 3600)
        FROM mes.production_orders
        WHERE status IN ('completed', 'in_progress')
          AND tenant_id = $1::uuid
        "#,
    )
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("统计平均交付周期失败: {}", e);
            return ApiResponse::from(TopemsError::internal("获取优化报告失败", e.to_string()));
        }
    };

    // 准时率：完工订单里「实际完工不晚于计划完工」的占比。
    // 之前用 completed_orders / total_orders，那是完成率不是准时率，口径错误。
    let on_time_count: i64 = match sqlx::query_scalar(
        r#"
        SELECT COUNT(*)
        FROM mes.production_orders
        WHERE status = 'completed'
          AND actual_end_date IS NOT NULL
          AND planned_end_date IS NOT NULL
          AND actual_end_date <= planned_end_date
          AND tenant_id = $1::uuid
        "#,
    )
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("统计准时完工订单失败: {}", e);
            return ApiResponse::from(TopemsError::internal("获取优化报告失败", e.to_string()));
        }
    };

    let judged_orders: i64 = match sqlx::query_scalar(
        r#"
        SELECT COUNT(*)
        FROM mes.production_orders
        WHERE status = 'completed'
          AND actual_end_date IS NOT NULL
          AND planned_end_date IS NOT NULL
          AND tenant_id = $1::uuid
        "#,
    )
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("统计可判定准时性的订单失败: {}", e);
            return ApiResponse::from(TopemsError::internal("获取优化报告失败", e.to_string()));
        }
    };

    let on_time_rate = if judged_orders > 0 {
        (on_time_count as f64 / judged_orders as f64 * 100.0).clamp(0.0, 100.0)
    } else {
        0.0
    };

    // 瓶颈分析
    let mut bottleneck_resources = Vec::new();

    // 按工位统计负载
    let station_loads = sqlx::query(
        r#"
        SELECT ws.station_name, COUNT(ps.id) as task_count,
               SUM(EXTRACT(EPOCH FROM (ps.planned_end_time - ps.planned_start_time)) / 3600) as total_hours
        FROM mes.work_stations ws
        LEFT JOIN mes.production_schedules ps ON ps.work_station_id = ws.id
            AND ps.status = ANY($2::text[])
            AND ps.tenant_id = $1::uuid
        WHERE ws.status = 'active'
            AND ws.tenant_id = $1::uuid
        GROUP BY ws.id, ws.station_name
        ORDER BY task_count DESC
        LIMIT 10
        "#
    )
    .bind(tenant_id)
    .bind(ProductionScheduleStatus::active_from())
    .fetch_all(&mut scope)
    .await;

    let loads = match station_loads {
        Ok(rows) => rows,
        Err(e) => {
            tracing::error!("按工位统计负载失败: {}", e);
            return ApiResponse::from(TopemsError::internal("获取优化报告失败", e.to_string()));
        }
    };

    // 排程窗口（决定「负载率」的分母）。没有窗口就算不出利用率，宁可给 0 也不编造。
    let schedule_window_hours: f64 = match sqlx::query_scalar(
        r#"
        SELECT COALESCE(
                 EXTRACT(EPOCH FROM (MAX(planned_end_time) - MIN(planned_start_time))) / 3600,
                 0
               )
        FROM mes.production_schedules
        WHERE status = ANY($2::text[])
          AND tenant_id = $1::uuid
        "#,
    )
    .bind(tenant_id)
    .bind(ProductionScheduleStatus::active_from())
    .fetch_one(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("统计排程窗口失败: {}", e);
            return ApiResponse::from(TopemsError::internal("获取优化报告失败", e.to_string()));
        }
    };

    for load in loads.iter() {
        let name: String = load.try_get("station_name").unwrap_or_default();
        let task_count: i64 = load.try_get("task_count").unwrap_or(0);
        let total_hours: Option<f64> = load.try_get("total_hours").ok().flatten();

        // 负载率 = 该工位计划工时 / 排程窗口时长。原来直接把「小时数」当百分比，
        // 量纲是错的（48 小时会被读成 48%）；impact_score 原来按数组下标取 0.9/0.6，
        // 与数据无关，这里统一由负载率派生。
        let utilization = match total_hours {
            Some(hours) if schedule_window_hours > 0.0 => {
                (hours / schedule_window_hours * 100.0).clamp(0.0, 100.0)
            }
            _ => 0.0,
        };
        let impact = (utilization / 100.0).clamp(0.0, 1.0);

        bottleneck_resources.push(BottleneckResource {
            resource_id: name.clone(),
            resource_name: name,
            resource_type: "workstation".to_string(),
            utilization_rate: utilization,
            queue_length: task_count as i32,
            impact_score: impact,
        });
    }

    let mut improvement_suggestions = Vec::new();

    // 建议只陈述实测数据，不再给「提升 15-20%」这类无依据的收益承诺
    if let Some(top) = bottleneck_resources.first() {
        if top.utilization_rate >= 80.0 {
            improvement_suggestions.push(ImprovementSuggestion {
                category: "产能".to_string(),
                title: "缓解瓶颈工位负载".to_string(),
                description: format!(
                    "{} 的排程负载率已达 {:.1}%（队列 {} 个任务），建议增加设备或延长工作班次",
                    top.resource_name, top.utilization_rate, top.queue_length
                ),
                estimated_impact: format!(
                    "可释放约 {:.1}% 的工位负载",
                    top.utilization_rate - 70.0
                ),
                priority: 1,
            });
        }
    }

    if judged_orders > 0 && on_time_rate < 80.0 {
        improvement_suggestions.push(ImprovementSuggestion {
            category: "交付".to_string(),
            title: "优化排程策略".to_string(),
            description: format!(
                "近 {} 个可判定订单中准时完工率 {:.1}%，建议采用双向排程策略并增加安全库存",
                judged_orders, on_time_rate
            ),
            estimated_impact: "以历史准时率与计划交期的差距为参照，具体收益需在模拟排程中验证"
                .to_string(),
            priority: 2,
        });
    }

    let unscheduled_orders = total_orders.saturating_sub(scheduled_orders);
    let coverage = if total_orders > 0 {
        (scheduled_orders as f64 / total_orders as f64 * 100.0).clamp(0.0, 100.0)
    } else {
        0.0
    };
    if unscheduled_orders > 0 {
        improvement_suggestions.push(ImprovementSuggestion {
            category: "流程".to_string(),
            title: "补齐未排程订单".to_string(),
            description: format!(
                "当前有 {} 个订单尚未生成排程（共 {} 个订单），排程仍依赖人工触发",
                unscheduled_orders, total_orders
            ),
            estimated_impact: format!("排程覆盖率 {:.1}%，补齐前人工排程等待无法消除", coverage),
            priority: 3,
        });
    }

    ApiResponse::success(
        OptimizationReport {
            generated_at: Utc::now(),
            total_orders,
            scheduled_orders,
            unscheduled_orders,
            average_lead_time_hours: avg_lead_time.unwrap_or(0.0),
            on_time_rate,
            bottleneck_resources,
            improvement_suggestions,
        },
        "获取优化报告成功",
    )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:aps:read"])),
    path = "/aps/schedule/bottleneck-analysis",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "APS"
)]
#[allow(
    clippy::as_conversions,
    clippy::cast_possible_truncation,
    clippy::cast_precision_loss
)]
pub async fn get_bottleneck_analysis(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> ApiResponse<BottleneckAnalysis> {
    if let Err(e) = check_permission(
        &state.pool,
        &claims,
        &ModulePermission::ProductionSchedulingRead,
    )
    .await
    {
        return e;
    }

    let time_period = params
        .get("period")
        .cloned()
        .unwrap_or_else(|| "7d".to_string());

    // 吞吐量分析
    let tenant_id = get_tenant_id(&claims);

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立只读作用域失败: {}", e);
            return ApiResponse::server_error("获取瓶颈分析失败");
        }
    };

    let total_orders: i64 = match sqlx::query_scalar(
        "SELECT COUNT(*) FROM mes.production_orders WHERE tenant_id = $1::uuid",
    )
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("统计订单总数失败: {}", e);
            return ApiResponse::from(TopemsError::internal("获取瓶颈分析失败", e.to_string()));
        }
    };

    let completed: i64 = match sqlx::query_scalar(
        "SELECT COUNT(*) FROM mes.production_orders WHERE status = 'completed' AND tenant_id = $1::uuid",
    )
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("统计完工订单失败: {}", e);
            return ApiResponse::from(TopemsError::internal("获取瓶颈分析失败", e.to_string()));
        }
    };

    let in_progress: i64 = match sqlx::query_scalar(
        "SELECT COUNT(*) FROM mes.production_orders WHERE status = 'in_progress' AND tenant_id = $1::uuid",
    )
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("统计在制订单失败: {}", e);
            return ApiResponse::from(TopemsError::internal("获取瓶颈分析失败", e.to_string()));
        }
    };

    let pending: i64 = match sqlx::query_scalar(
        "SELECT COUNT(*) FROM mes.production_orders WHERE status = 'pending' AND tenant_id = $1::uuid",
    )
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("统计待生产订单失败: {}", e);
            return ApiResponse::from(TopemsError::internal("获取瓶颈分析失败", e.to_string()));
        }
    };

    let avg_cycle: Option<f64> = match sqlx::query_scalar(
        r#"
        SELECT AVG(EXTRACT(EPOCH FROM (COALESCE(actual_end_date, NOW()) - actual_start_date)) / 3600)
        FROM mes.production_orders
        WHERE status = 'completed' AND actual_start_date IS NOT NULL
          AND tenant_id = $1::uuid
        "#
    )
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("统计平均生产周期失败: {}", e);
            return ApiResponse::from(TopemsError::internal("获取瓶颈分析失败", e.to_string()));
        }
    };

    // 产能 vs 需求
    let total_capacity = match sqlx::query_scalar::<_, f64>(
        r#"
        SELECT COUNT(*) * 8.0 * 5.0 as capacity_hours
        FROM mes.work_stations
        WHERE status = 'active'
          AND tenant_id = $1::uuid
        "#,
    )
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("统计设备产能失败: {}", e);
            return ApiResponse::from(TopemsError::internal("获取瓶颈分析失败", e.to_string()));
        }
    };

    let total_demand = match sqlx::query_scalar::<_, f64>(
        r#"
        SELECT COALESCE(SUM(quantity * 0.1), 0) as demand_hours
        FROM mes.production_orders
        WHERE status IN ('pending', 'released')
          AND tenant_id = $1::uuid
        "#,
    )
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("统计在手需求失败: {}", e);
            return ApiResponse::from(TopemsError::internal("获取瓶颈分析失败", e.to_string()));
        }
    };

    let utilization = if total_capacity > 0.0 {
        (total_demand / total_capacity * 100.0).min(100.0)
    } else {
        0.0
    };

    // 瓶颈资源
    let mut bottleneck_resources = Vec::new();
    let station_stats = sqlx::query(
        r#"
        SELECT ws.station_name,
               COUNT(ps.id) as scheduled_tasks,
               COUNT(DISTINCT ps.order_id) as unique_orders
        FROM mes.work_stations ws
        LEFT JOIN mes.production_schedules ps ON ps.work_station_id = ws.id
            AND ps.status = ANY($2::text[])
            AND ps.tenant_id = $1::uuid
        WHERE ws.status = 'active'
            AND ws.tenant_id = $1::uuid
        GROUP BY ws.id, ws.station_name
        ORDER BY scheduled_tasks DESC
        LIMIT 10
        "#,
    )
    .bind(tenant_id)
    .bind(ProductionScheduleStatus::active_from())
    .fetch_all(&mut scope)
    .await;

    let stats = match station_stats {
        Ok(rows) => rows,
        Err(e) => {
            tracing::error!("按工位统计排程任务失败: {}", e);
            return ApiResponse::from(TopemsError::internal("获取瓶颈分析失败", e.to_string()));
        }
    };

    let total_scheduled_tasks: i64 = stats
        .iter()
        .map(|stat| stat.try_get::<i64, _>("scheduled_tasks").unwrap_or(0))
        .sum();

    for stat in stats.iter() {
        // SQL 里选的是 station_name，之前按 name 取值导致工位名恒为空串
        let name: String = stat.try_get("station_name").unwrap_or_default();
        let tasks: i64 = stat.try_get("scheduled_tasks").unwrap_or(0);

        // 负载率按「该工位任务数 / 全部在排任务数」的真实占比计算；
        // 影响分与负载率同源，不再用 orders>0 ? 0.85 : 0.3 这种写死的档位。
        let load_share = if total_scheduled_tasks > 0 {
            (tasks as f64 / total_scheduled_tasks as f64 * 100.0).clamp(0.0, 100.0)
        } else {
            0.0
        };

        bottleneck_resources.push(BottleneckResource {
            resource_id: name.clone(),
            resource_name: name,
            resource_type: "workstation".to_string(),
            utilization_rate: load_share,
            queue_length: tasks as i32,
            impact_score: (load_share / 100.0).clamp(0.0, 1.0),
        });
    }

    ApiResponse::success(
        BottleneckAnalysis {
            analysis_date: Utc::now(),
            time_period,
            bottleneck_resources,
            throughput_analysis: ThroughputAnalysis {
                total_orders,
                completed_orders: completed,
                in_progress_orders: in_progress,
                pending_orders: pending,
                average_cycle_time_hours: avg_cycle.unwrap_or(0.0),
            },
            capacity_vs_demand: CapacityVsDemand {
                total_capacity_hours: total_capacity,
                total_demand_hours: total_demand,
                capacity_utilization: utilization,
                capacity_gap_hours: (total_demand - total_capacity).max(0.0),
            },
        },
        "获取瓶颈分析成功",
    )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:aps:read"])),
    path = "/aps/orders/{id}/feasibility",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "APS"
)]
pub async fn check_order_feasibility(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(order_id): Path<Uuid>,
) -> ApiResponse<ConstraintCheckResult> {
    if let Err(e) = check_permission(
        &state.pool,
        &claims,
        &ModulePermission::ProductionSchedulingRead,
    )
    .await
    {
        return e;
    }

    let req = ConstraintCheckRequest {
        order_ids: vec![order_id],
        check_materials: Some(true),
        check_equipment: Some(true),
        check_personnel: Some(true),
    };

    let result = check_schedule_constraints(
        State(state),
        Extension(txn_arc),
        Extension(claims),
        Json(req),
    )
    .await;

    // 从结果中提取第一个
    let data = result.data;
    match data {
        Some(mut results) if !results.is_empty() => {
            ApiResponse::success(results.remove(0), "可行性检查完成")
        }
        _ => ApiResponse::server_error("可行性检查失败"),
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
mod tests {
    use super::*;
    use chrono::TimeZone;
    use serde::de::DeserializeOwned;
    use serde::Serialize;

    fn roundtrip<T: Serialize + DeserializeOwned>(val: &T) {
        let s1 = serde_json::to_string(val).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&s1).unwrap();
        let val2: T = serde_json::from_str(&s1).unwrap();
        let s2 = serde_json::to_string(&val2).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&s2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test]
    fn test_schedule_strategy_roundtrip() {
        roundtrip(&ScheduleStrategy::Forward);
        roundtrip(&ScheduleStrategy::Backward);
        roundtrip(&ScheduleStrategy::Bidirectional);
        roundtrip(&ScheduleStrategy::BottleneckDriven);
    }

    #[test]
    fn test_optimization_weights_roundtrip() {
        let w = OptimizationWeights {
            minimize_makespan: 0.3,
            minimize_tardiness: 0.4,
            maximize_utilization: 0.2,
            minimize_idle_time: 0.1,
        };
        roundtrip(&w);
    }

    // ---- calculate_processing_time ----
    #[test]
    fn processing_time_includes_setup() {
        // 换型时间固定 0.5h，加工 = quantity * base
        assert_eq!(calculate_processing_time(10.0, 1.0), 10.5);
    }

    #[test]
    fn processing_time_zero_quantity_is_setup_only() {
        assert_eq!(calculate_processing_time(0.0, 2.0), 0.5);
    }

    #[test]
    fn processing_time_large_quantity() {
        assert_eq!(calculate_processing_time(100.0, 0.5), 50.5);
    }

    #[test]
    fn processing_time_zero_base() {
        assert_eq!(calculate_processing_time(8.0, 0.0), 0.5);
    }

    // ---- calculate_risk_level ----
    #[test]
    fn risk_critical_when_material_missing() {
        let planned_end = Utc::now() + chrono::Duration::hours(48);
        assert!(matches!(
            calculate_risk_level(planned_end, None, false, true),
            RiskLevel::Critical
        ));
    }

    #[test]
    fn risk_critical_when_equipment_unavailable() {
        let planned_end = Utc::now() + chrono::Duration::hours(48);
        assert!(matches!(
            calculate_risk_level(planned_end, None, true, false),
            RiskLevel::Critical
        ));
    }

    #[test]
    fn risk_critical_when_delay_over_48h() {
        let now = Utc::now();
        let planned_end = now + chrono::Duration::hours(100);
        let delivery = now + chrono::Duration::hours(40);
        assert!(matches!(
            calculate_risk_level(planned_end, Some(delivery), true, true),
            RiskLevel::Critical
        ));
    }

    #[test]
    fn risk_high_when_delay_between_24_and_48h() {
        let now = Utc::now();
        let planned_end = now + chrono::Duration::hours(60);
        let delivery = now + chrono::Duration::hours(30);
        assert!(matches!(
            calculate_risk_level(planned_end, Some(delivery), true, true),
            RiskLevel::High
        ));
    }

    #[test]
    fn risk_medium_when_delay_under_24h() {
        let now = Utc::now();
        let planned_end = now + chrono::Duration::hours(10);
        let delivery = now + chrono::Duration::hours(2);
        assert!(matches!(
            calculate_risk_level(planned_end, Some(delivery), true, true),
            RiskLevel::Medium
        ));
    }

    #[test]
    fn risk_high_when_buffer_under_4h() {
        let planned_end = Utc::now() + chrono::Duration::hours(2);
        assert!(matches!(
            calculate_risk_level(planned_end, None, true, true),
            RiskLevel::High
        ));
    }

    #[test]
    fn risk_medium_when_buffer_4_24h() {
        let planned_end = Utc::now() + chrono::Duration::hours(8);
        assert!(matches!(
            calculate_risk_level(planned_end, None, true, true),
            RiskLevel::Medium
        ));
    }

    #[test]
    fn risk_low_when_buffer_over_24h() {
        let planned_end = Utc::now() + chrono::Duration::hours(72);
        assert!(matches!(
            calculate_risk_level(planned_end, None, true, true),
            RiskLevel::Low
        ));
    }

    // ---- calculate_feasibility_score ----
    #[test]
    fn feasibility_full_marks() {
        assert_eq!(calculate_feasibility_score(true, true, 10.0, 100.0), 100.0);
    }

    #[test]
    fn feasibility_missing_material() {
        assert_eq!(calculate_feasibility_score(false, true, 10.0, 100.0), 60.0);
    }

    #[test]
    fn feasibility_missing_equipment() {
        assert_eq!(calculate_feasibility_score(true, false, 10.0, 100.0), 60.0);
    }

    #[test]
    fn feasibility_missing_both() {
        assert_eq!(calculate_feasibility_score(false, false, 10.0, 100.0), 20.0);
    }

    #[test]
    fn feasibility_long_processing_time() {
        // >48h 扣 20
        assert_eq!(calculate_feasibility_score(true, true, 50.0, 100.0), 80.0);
        // 24-48h 扣 10
        assert_eq!(calculate_feasibility_score(true, true, 30.0, 100.0), 90.0);
    }

    #[test]
    fn feasibility_large_quantity() {
        assert_eq!(calculate_feasibility_score(true, true, 10.0, 2000.0), 95.0);
    }

    #[test]
    fn feasibility_score_clamped_at_zero() {
        assert_eq!(
            calculate_feasibility_score(false, false, 100.0, 5000.0),
            0.0
        );
    }

    // ---- 辅助转换函数 ----
    #[test]
    fn aps_naive_to_utc_some() {
        let dt = Utc.with_ymd_and_hms(2024, 8, 1, 6, 0, 0).unwrap();
        let utc = naive_to_utc(Some(dt));
        assert_eq!(utc.date_naive(), dt.date_naive());
        assert_eq!(utc.time(), dt.time());
    }

    #[test]
    fn aps_naive_to_utc_none() {
        let before = Utc::now();
        let out = naive_to_utc(None);
        let after = Utc::now();
        assert!(out >= before && out <= after);
    }

    #[test]
    fn aps_opt_naive_to_utc_some_none() {
        let dt = Utc.with_ymd_and_hms(2024, 8, 1, 6, 0, 0).unwrap();
        assert!(opt_naive_to_utc(Some(dt)).is_some());
        assert!(opt_naive_to_utc(None).is_none());
    }

    #[test]
    fn aps_big_decimal_to_f64() {
        let bd: BigDecimal = "1.25".parse().unwrap();
        assert_eq!(big_decimal_to_f64(Some(bd)), 1.25);
        assert_eq!(big_decimal_to_f64(None), 0.0);
    }
}

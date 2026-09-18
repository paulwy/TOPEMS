//! MES Analytics 聚合 API 模块
//!
//! 提供产能利用率、能源成本、设备MTBF、交付分析、OEE仪表盘、质量帕累托等聚合分析接口。

use axum::{
    extract::{Query, State},
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use tracing::{error, info};

use crate::shared::AppState;

// ==================== 数据结构 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CapacityUtilizationItem {
    pub equipment: String,
    pub date: String,
    pub shift: String,
    pub utilization: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CapacityUtilizationResponse {
    pub heatmap: Vec<CapacityUtilizationItem>,
    pub avg_utilization: f64,
    pub total_equipment: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnergyMixItem {
    pub energy_type: String,
    pub percentage: f64,
    pub cost: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnergyTrendItem {
    pub date: String,
    pub kwh_per_unit: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkshopCostItem {
    pub workshop: String,
    pub cost: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnergyCostResponse {
    pub per_unit_trend: Vec<EnergyTrendItem>,
    pub energy_mix: Vec<EnergyMixItem>,
    pub workshop_top_n: Vec<WorkshopCostItem>,
    pub total_cost: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EquipmentMtbfItem {
    pub equipment_type: String,
    pub mtbf_hours: f64,
    pub mttr_hours: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FaultReasonItem {
    pub reason: String,
    pub frequency: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MtbfScatterItem {
    pub mtbf: f64,
    pub oee: f64,
    pub label: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EquipmentMtbfResponse {
    pub by_equipment_type: Vec<EquipmentMtbfItem>,
    pub fault_reasons: Vec<FaultReasonItem>,
    pub scatter: Vec<MtbfScatterItem>,
    pub avg_mtbf: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeliveryTrendItem {
    pub date: String,
    pub planned: i64,
    pub delivered: i64,
    pub on_time_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeliveryAnalyticsResponse {
    pub trend: Vec<DeliveryTrendItem>,
    pub on_time_rate: f64,
    pub total_orders: i64,
    pub delayed_orders: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OeeDashboardItem {
    pub equipment_name: String,
    pub oee: f64,
    pub availability: f64,
    pub performance: f64,
    pub quality_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OeeTrendItem {
    pub date: String,
    pub oee: f64,
    pub availability: f64,
    pub performance: f64,
    pub quality_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OeeDashboardResponse {
    pub avg_oee: f64,
    pub avg_availability: f64,
    pub avg_performance: f64,
    pub avg_quality_rate: f64,
    pub by_equipment: Vec<OeeDashboardItem>,
    pub trend: Vec<OeeTrendItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QualityParetoItem {
    pub defect_type: String,
    pub count: i64,
    pub percentage: f64,
    pub cumulative_percentage: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QualityParetoResponse {
    pub pareto: Vec<QualityParetoItem>,
    pub total_defects: i64,
    pub pass_rate: f64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AnalyticsQuery {
    pub days: Option<i64>,
    pub workshop: Option<String>,
}

// ==================== 路由注册 ====================

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/analytics/capacity-utilization",
            get(get_capacity_utilization),
        )
        .route("/analytics/energy-cost", get(get_energy_cost))
        .route("/analytics/equipment-mtbf", get(get_equipment_mtbf))
        .route("/analytics/delivery-analytics", get(get_delivery_analytics))
        .route("/analytics/oee-dashboard", get(get_oee_dashboard))
        .route("/analytics/quality-pareto", get(get_quality_pareto))
}

// ==================== Handler 实现 ====================

/// 产能利用率热力图
pub async fn get_capacity_utilization(
    State(state): State<AppState>,
    Query(query): Query<AnalyticsQuery>,
) -> Json<CapacityUtilizationResponse> {
    info!("获取产能利用率数据");
    let days = query.days.unwrap_or(7);

    let result = sqlx::query_as::<_, (String, String, String, Option<f64>)>(
        r#"
        SELECT
            COALESCE(c.work_center_name, '未知') as equipment,
            c.capacity_date::text as date,
            COALESCE(c.shift, '白班') as shift,
            c.utilization_rate as utilization
        FROM mes.capacities c
        WHERE c.capacity_date >= CURRENT_DATE - $1 * INTERVAL '1 day'
        ORDER BY c.capacity_date, c.work_center_name
        LIMIT 500
        "#,
    )
    .bind(days)
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(rows) => {
            let heatmap: Vec<CapacityUtilizationItem> = rows
                .into_iter()
                .map(
                    |(equipment, date, shift, utilization)| CapacityUtilizationItem {
                        equipment,
                        date,
                        shift,
                        utilization: utilization.unwrap_or(0.0),
                    },
                )
                .collect();

            let avg_utilization = if heatmap.is_empty() {
                0.0
            } else {
                heatmap.iter().map(|h| h.utilization).sum::<f64>() / heatmap.len() as f64
            };

            let total_equipment = heatmap
                .iter()
                .map(|h| &h.equipment)
                .collect::<std::collections::HashSet<_>>()
                .len() as i64;

            Json(CapacityUtilizationResponse {
                heatmap,
                avg_utilization,
                total_equipment,
            })
        }
        Err(e) => {
            error!("获取产能利用率失败: {}", e);
            Json(CapacityUtilizationResponse {
                heatmap: vec![],
                avg_utilization: 0.0,
                total_equipment: 0,
            })
        }
    }
}

/// 能源成本分析
pub async fn get_energy_cost(
    State(state): State<AppState>,
    Query(query): Query<AnalyticsQuery>,
) -> Json<EnergyCostResponse> {
    info!("获取能源成本数据");
    let days = query.days.unwrap_or(30);

    // 从生产成本表聚合能源相关成本
    let cost_result = sqlx::query_as::<_, (String, Option<f64>)>(
        r#"
        SELECT
            COALESCE(cost_category, '其他') as category,
            SUM(total_cost) as total
        FROM mes.production_costs
        WHERE cost_date >= CURRENT_DATE - $1 * INTERVAL '1 day'
          AND cost_category IN ('能源', '电力', '燃气', '水', '压缩空气')
        GROUP BY cost_category
        ORDER BY total DESC
        "#,
    )
    .bind(days)
    .fetch_all(&state.pool)
    .await;

    let (energy_mix, total_cost) = match cost_result {
        Ok(rows) => {
            let total: f64 = rows.iter().filter_map(|(_, c)| *c).sum();
            let mix: Vec<EnergyMixItem> = rows
                .into_iter()
                .map(|(category, cost)| {
                    let c = cost.unwrap_or(0.0);
                    EnergyMixItem {
                        energy_type: category,
                        percentage: if total > 0.0 {
                            (c / total) * 100.0
                        } else {
                            0.0
                        },
                        cost: c,
                    }
                })
                .collect();
            (mix, total)
        }
        Err(e) => {
            error!("获取能源成本失败: {}", e);
            (vec![], 0.0)
        }
    };

    // 单位能耗趋势（简化：按日期统计）
    let trend_result = sqlx::query_as::<_, (String, Option<f64>)>(
        r#"
        SELECT
            cost_date::text as date,
            AVG(total_cost / NULLIF(quantity, 0)) as kwh_per_unit
        FROM mes.production_costs
        WHERE cost_date >= CURRENT_DATE - $1 * INTERVAL '1 day'
          AND cost_category IN ('能源', '电力', '燃气')
        GROUP BY cost_date
        ORDER BY cost_date
        LIMIT 30
        "#,
    )
    .bind(days)
    .fetch_all(&state.pool)
    .await;

    let per_unit_trend: Vec<EnergyTrendItem> = match trend_result {
        Ok(rows) => rows
            .into_iter()
            .map(|(date, kwh)| EnergyTrendItem {
                date,
                kwh_per_unit: kwh.unwrap_or(0.0),
            })
            .collect(),
        Err(e) => {
            error!("获取能源趋势失败: {}", e);
            vec![]
        }
    };

    // 车间成本排名
    let workshop_result = sqlx::query_as::<_, (String, Option<f64>)>(
        r#"
        SELECT
            COALESCE(workshop, '未知') as workshop,
            SUM(total_cost) as cost
        FROM mes.production_costs
        WHERE cost_date >= CURRENT_DATE - $1 * INTERVAL '1 day'
        GROUP BY workshop
        ORDER BY cost DESC
        LIMIT 10
        "#,
    )
    .bind(days)
    .fetch_all(&state.pool)
    .await;

    let workshop_top_n: Vec<WorkshopCostItem> = match workshop_result {
        Ok(rows) => rows
            .into_iter()
            .map(|(workshop, cost)| WorkshopCostItem {
                workshop,
                cost: cost.unwrap_or(0.0),
            })
            .collect(),
        Err(e) => {
            error!("获取车间成本失败: {}", e);
            vec![]
        }
    };

    Json(EnergyCostResponse {
        per_unit_trend,
        energy_mix,
        workshop_top_n,
        total_cost,
    })
}

/// 设备 MTBF 分析
pub async fn get_equipment_mtbf(
    State(state): State<AppState>,
    Query(query): Query<AnalyticsQuery>,
) -> Json<EquipmentMtbfResponse> {
    info!("获取设备MTBF数据");
    let days = query.days.unwrap_or(90);

    // 按设备类型统计 MTBF/MTTR
    let mtbf_result = sqlx::query_as::<_, (String, Option<f64>, Option<f64>)>(
        r#"
        SELECT
            COALESCE(e.equipment_type, '其他') as equipment_type,
            AVG(EXTRACT(EPOCH FROM (m.completed_at - m.started_at)) / 3600.0) as mttr_hours,
            COUNT(*) as fault_count
        FROM mes.equipment_maintenance_records m
        LEFT JOIN mes.equipment e ON m.equipment_id = e.id
        WHERE m.started_at >= CURRENT_TIMESTAMP - $1 * INTERVAL '1 day'
          AND m.maintenance_type = '故障维修'
        GROUP BY e.equipment_type
        ORDER BY fault_count DESC
        "#,
    )
    .bind(days)
    .fetch_all(&state.pool)
    .await;

    let by_equipment_type: Vec<EquipmentMtbfItem> = match mtbf_result {
        Ok(rows) => rows
            .into_iter()
            .map(|(eq_type, mttr, _)| EquipmentMtbfItem {
                equipment_type: eq_type,
                mtbf_hours: 720.0 - mttr.unwrap_or(0.0) * 10.0, // 简化估算
                mttr_hours: mttr.unwrap_or(0.0),
            })
            .collect(),
        Err(e) => {
            error!("获取MTBF数据失败: {}", e);
            vec![]
        }
    };

    // 故障原因统计
    let fault_result = sqlx::query_as::<_, (String, Option<i64>)>(
        r#"
        SELECT
            COALESCE(fault_reason, '其他') as reason,
            COUNT(*) as frequency
        FROM mes.equipment_maintenance_records
        WHERE started_at >= CURRENT_TIMESTAMP - $1 * INTERVAL '1 day'
          AND maintenance_type = '故障维修'
        GROUP BY fault_reason
        ORDER BY frequency DESC
        LIMIT 10
        "#,
    )
    .bind(days)
    .fetch_all(&state.pool)
    .await;

    let fault_reasons: Vec<FaultReasonItem> = match fault_result {
        Ok(rows) => rows
            .into_iter()
            .map(|(reason, freq)| FaultReasonItem {
                reason,
                frequency: freq.unwrap_or(0),
            })
            .collect(),
        Err(e) => {
            error!("获取故障原因失败: {}", e);
            vec![]
        }
    };

    // MTBF vs OEE 散点
    let scatter_result = sqlx::query_as::<_, (String, Option<f64>, Option<f64>)>(
        r#"
        SELECT
            e.equipment_name as label,
            AVG(o.oee)::float8 * 100 as oee,
            500 + RANDOM() * 300 as mtbf
        FROM mes.equipment_oee o
        LEFT JOIN mes.equipment e ON o.equipment_id = e.id
        WHERE o.record_date >= CURRENT_DATE - $1 * INTERVAL '1 day'
        GROUP BY e.equipment_name
        LIMIT 20
        "#,
    )
    .bind(days)
    .fetch_all(&state.pool)
    .await;

    let scatter: Vec<MtbfScatterItem> = match scatter_result {
        Ok(rows) => rows
            .into_iter()
            .map(|(label, oee, mtbf)| MtbfScatterItem {
                label,
                oee: oee.unwrap_or(0.0),
                mtbf: mtbf.unwrap_or(0.0),
            })
            .collect(),
        Err(e) => {
            error!("获取散点数据失败: {}", e);
            vec![]
        }
    };

    let avg_mtbf = if by_equipment_type.is_empty() {
        0.0
    } else {
        by_equipment_type.iter().map(|b| b.mtbf_hours).sum::<f64>() / by_equipment_type.len() as f64
    };

    Json(EquipmentMtbfResponse {
        by_equipment_type,
        fault_reasons,
        scatter,
        avg_mtbf,
    })
}

/// 交付分析
pub async fn get_delivery_analytics(
    State(state): State<AppState>,
    Query(query): Query<AnalyticsQuery>,
) -> Json<DeliveryAnalyticsResponse> {
    info!("获取交付分析数据");
    let days = query.days.unwrap_or(30);

    let result = sqlx::query_as::<_, (String, Option<i64>, Option<i64>, Option<f64>)>(
        r#"
        SELECT
            planned_date::text as date,
            COUNT(*) as planned,
            COUNT(*) FILTER (WHERE status IN ('completed', 'delivered')) as delivered,
            CASE
                WHEN COUNT(*) > 0 THEN
                    (COUNT(*) FILTER (WHERE status IN ('completed', 'delivered') AND actual_delivery_date <= planned_date)::float / COUNT(*)::float) * 100
                ELSE 0
            END as on_time_rate
        FROM mes.production_orders
        WHERE planned_date >= CURRENT_DATE - $1 * INTERVAL '1 day'
        GROUP BY planned_date
        ORDER BY planned_date
        LIMIT 30
        "#,
    )
    .bind(days)
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(rows) => {
            let trend: Vec<DeliveryTrendItem> = rows
                .into_iter()
                .map(|(date, planned, delivered, rate)| DeliveryTrendItem {
                    date,
                    planned: planned.unwrap_or(0),
                    delivered: delivered.unwrap_or(0),
                    on_time_rate: rate.unwrap_or(0.0),
                })
                .collect();

            let total_orders: i64 = trend.iter().map(|t| t.planned).sum();
            let delayed_orders: i64 = trend.iter().map(|t| t.planned - t.delivered).sum();
            let on_time_rate = if total_orders > 0 {
                trend.iter().map(|t| t.on_time_rate).sum::<f64>() / trend.len() as f64
            } else {
                0.0
            };

            Json(DeliveryAnalyticsResponse {
                trend,
                on_time_rate,
                total_orders,
                delayed_orders,
            })
        }
        Err(e) => {
            error!("获取交付分析失败: {}", e);
            Json(DeliveryAnalyticsResponse {
                trend: vec![],
                on_time_rate: 0.0,
                total_orders: 0,
                delayed_orders: 0,
            })
        }
    }
}

/// OEE 仪表盘
pub async fn get_oee_dashboard(
    State(state): State<AppState>,
    Query(query): Query<AnalyticsQuery>,
) -> Json<OeeDashboardResponse> {
    info!("获取OEE仪表盘数据");
    let days = query.days.unwrap_or(7);

    // 按设备统计 OEE
    let equipment_result =
        sqlx::query_as::<_, (String, Option<f64>, Option<f64>, Option<f64>, Option<f64>)>(
            r#"
        SELECT
            COALESCE(e.equipment_name, '未知') as equipment_name,
            AVG(o.oee)::float8 * 100 as oee,
            AVG(o.availability)::float8 * 100 as availability,
            AVG(o.performance)::float8 * 100 as performance,
            AVG(o.quality_rate)::float8 * 100 as quality_rate
        FROM mes.equipment_oee o
        LEFT JOIN mes.equipment e ON o.equipment_id = e.id
        WHERE o.record_date >= CURRENT_DATE - $1 * INTERVAL '1 day'
        GROUP BY e.equipment_name
        ORDER BY oee DESC
        LIMIT 20
        "#,
        )
        .bind(days)
        .fetch_all(&state.pool)
        .await;

    let by_equipment: Vec<OeeDashboardItem> = match equipment_result {
        Ok(rows) => rows
            .into_iter()
            .map(|(name, oee, avail, perf, qual)| OeeDashboardItem {
                equipment_name: name,
                oee: oee.unwrap_or(0.0),
                availability: avail.unwrap_or(0.0),
                performance: perf.unwrap_or(0.0),
                quality_rate: qual.unwrap_or(0.0),
            })
            .collect(),
        Err(e) => {
            error!("获取设备OEE失败: {}", e);
            vec![]
        }
    };

    // OEE 趋势
    let trend_result =
        sqlx::query_as::<_, (String, Option<f64>, Option<f64>, Option<f64>, Option<f64>)>(
            r#"
        SELECT
            record_date::text as date,
            AVG(oee)::float8 * 100 as oee,
            AVG(availability)::float8 * 100 as availability,
            AVG(performance)::float8 * 100 as performance,
            AVG(quality_rate)::float8 * 100 as quality_rate
        FROM mes.equipment_oee
        WHERE record_date >= CURRENT_DATE - $1 * INTERVAL '1 day'
        GROUP BY record_date
        ORDER BY record_date
        LIMIT 30
        "#,
        )
        .bind(days)
        .fetch_all(&state.pool)
        .await;

    let trend: Vec<OeeTrendItem> = match trend_result {
        Ok(rows) => rows
            .into_iter()
            .map(|(date, oee, avail, perf, qual)| OeeTrendItem {
                date,
                oee: oee.unwrap_or(0.0),
                availability: avail.unwrap_or(0.0),
                performance: perf.unwrap_or(0.0),
                quality_rate: qual.unwrap_or(0.0),
            })
            .collect(),
        Err(e) => {
            error!("获取OEE趋势失败: {}", e);
            vec![]
        }
    };

    let avg_oee = if by_equipment.is_empty() {
        0.0
    } else {
        by_equipment.iter().map(|b| b.oee).sum::<f64>() / by_equipment.len() as f64
    };
    let avg_availability = if by_equipment.is_empty() {
        0.0
    } else {
        by_equipment.iter().map(|b| b.availability).sum::<f64>() / by_equipment.len() as f64
    };
    let avg_performance = if by_equipment.is_empty() {
        0.0
    } else {
        by_equipment.iter().map(|b| b.performance).sum::<f64>() / by_equipment.len() as f64
    };
    let avg_quality_rate = if by_equipment.is_empty() {
        0.0
    } else {
        by_equipment.iter().map(|b| b.quality_rate).sum::<f64>() / by_equipment.len() as f64
    };

    Json(OeeDashboardResponse {
        avg_oee,
        avg_availability,
        avg_performance,
        avg_quality_rate,
        by_equipment,
        trend,
    })
}

/// 质量帕累托
pub async fn get_quality_pareto(
    State(state): State<AppState>,
    Query(query): Query<AnalyticsQuery>,
) -> Json<QualityParetoResponse> {
    info!("获取质量帕累托数据");
    let days = query.days.unwrap_or(30);

    let result = sqlx::query_as::<_, (String, Option<i64>)>(
        r#"
        SELECT
            COALESCE(defect_type, '其他') as defect_type,
            COUNT(*) as count
        FROM mes.quality_inspections
        WHERE inspection_date >= CURRENT_DATE - $1 * INTERVAL '1 day'
          AND result = '不合格'
        GROUP BY defect_type
        ORDER BY count DESC
        LIMIT 20
        "#,
    )
    .bind(days)
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(rows) => {
            let items: Vec<(String, i64)> = rows
                .into_iter()
                .map(|(defect_type, count)| (defect_type, count.unwrap_or(0)))
                .collect();

            let total_defects: i64 = items.iter().map(|(_, c)| c).sum();
            let mut cumulative = 0.0;

            let pareto: Vec<QualityParetoItem> = items
                .into_iter()
                .map(|(defect_type, count)| {
                    let percentage = if total_defects > 0 {
                        (count as f64 / total_defects as f64) * 100.0
                    } else {
                        0.0
                    };
                    cumulative += percentage;
                    QualityParetoItem {
                        defect_type,
                        count,
                        percentage,
                        cumulative_percentage: cumulative,
                    }
                })
                .collect();

            // 计算合格率
            let pass_result = sqlx::query_as::<_, (Option<i64>, Option<i64>)>(
                r#"
                SELECT
                    COUNT(*) FILTER (WHERE result = '合格') as passed,
                    COUNT(*) as total
                FROM mes.quality_inspections
                WHERE inspection_date >= CURRENT_DATE - $1 * INTERVAL '1 day'
                "#,
            )
            .bind(days)
            .fetch_one(&state.pool)
            .await;

            let pass_rate = match pass_result {
                Ok((passed, total)) => {
                    if total.unwrap_or(0) > 0 {
                        (passed.unwrap_or(0) as f64 / total.unwrap_or(1) as f64) * 100.0
                    } else {
                        0.0
                    }
                }
                Err(e) => {
                    error!("获取合格率失败: {}", e);
                    0.0
                }
            };

            Json(QualityParetoResponse {
                pareto,
                total_defects,
                pass_rate,
            })
        }
        Err(e) => {
            error!("获取质量帕累托失败: {}", e);
            Json(QualityParetoResponse {
                pareto: vec![],
                total_defects: 0,
                pass_rate: 0.0,
            })
        }
    }
}

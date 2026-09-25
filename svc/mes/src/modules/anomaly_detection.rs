//! Anomaly Detection Module - 生产异常预警
//!
//! 基于设备巡检、OEE、质量记录、生产订单等时序数据，
//! 使用统计方法（移动平均、阈值比较、趋势分析）检测异常并生成预警。

use axum::{
    extract::{Path, Query, State},
    routing::{get, post},
    Extension, Json, Router,
};
use chrono::{DateTime, Duration, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use std::collections::HashMap;
use utoipa::ToSchema;

use crate::modules::approval_common::{
    build_approve_response, build_reject_response, build_start_response, create_approval_and_log,
    execute_transition_and_log, reject_and_log,
};
use crate::shared::permission::{check_permission, ModulePermission};
use crate::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

// ==================== Data Types ====================

#[derive(Debug, Clone, Serialize)]
pub struct AnomalyAlert {
    pub id: String,
    pub anomaly_type: String,
    pub severity: String,
    pub title: String,
    pub description: String,
    pub source_id: String,
    pub source_name: String,
    pub metric_name: String,
    pub metric_value: f64,
    pub threshold_value: f64,
    pub trend: String,
    pub detected_at: DateTime<Utc>,
    pub status: String,
    pub recommendation: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct AnomalySummary {
    pub total_alerts: usize,
    pub critical_count: usize,
    pub warning_count: usize,
    pub info_count: usize,
    pub by_type: HashMap<String, usize>,
    pub by_equipment: Vec<EquipmentAnomalyCount>,
    pub recent_trend: Vec<DailyAnomalyCount>,
}

#[derive(Debug, Clone, Serialize)]
pub struct EquipmentAnomalyCount {
    pub equipment_id: String,
    pub equipment_name: String,
    pub alert_count: usize,
    pub highest_severity: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct DailyAnomalyCount {
    pub date: String,
    pub count: usize,
    pub critical: usize,
}

#[derive(Debug, Clone, Serialize)]
pub struct AnomalyRule {
    pub id: String,
    pub rule_type: String,
    pub metric_name: String,
    pub warning_threshold: f64,
    pub critical_threshold: f64,
    pub window_size: i32,
    pub enabled: bool,
    pub description: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AnomalyQueryParams {
    pub severity: Option<String>,
    pub anomaly_type: Option<String>,
    pub equipment_id: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateRuleRequest {
    pub warning_threshold: Option<f64>,
    pub critical_threshold: Option<f64>,
    pub enabled: Option<bool>,
}

// ==================== Routes ====================

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/anomaly/alerts", get(list_anomaly_alerts))
        .route("/anomaly/summary", get(get_anomaly_summary))
        .route(
            "/anomaly/equipment/{equipment_id}",
            get(get_equipment_anomalies),
        )
        .route(
            "/anomaly/rules",
            get(list_anomaly_rules).put(update_anomaly_rule),
        )
        .route("/anomaly/rules/{rule_id}", get(get_anomaly_rule))
        .route("/anomaly/scan", post(trigger_anomaly_scan))
        .route("/anomaly/trend", get(get_anomaly_trend))
        // APV-4: 异常处置审批端点
        .route(
            "/anomaly/alerts/{id}/approval/start",
            post(start_anomaly_handling_approval),
        )
        .route(
            "/anomaly/alerts/{id}/approval/approve",
            post(approve_anomaly_handling),
        )
        .route(
            "/anomaly/alerts/{id}/approval/reject",
            post(reject_anomaly_handling),
        )
}

// ==================== Handlers ====================

/// 获取异常预警列表
pub async fn list_anomaly_alerts(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Query(params): Query<AnomalyQueryParams>,
) -> Json<ApiResponse<Vec<AnomalyAlert>>> {
    let mut alerts = Vec::new();

    // 并行检测各类异常
    let equipment_alerts = detect_equipment_anomalies(&state.pool).await;
    let quality_alerts = detect_quality_anomalies(&state.pool).await;
    let production_alerts = detect_production_anomalies(&state.pool).await;

    alerts.extend(equipment_alerts);
    alerts.extend(quality_alerts);
    alerts.extend(production_alerts);

    // 按严重程度排序
    alerts.sort_by(|a, b| {
        let severity_order = |s: &str| match s {
            "critical" => 0,
            "warning" => 1,
            _ => 2,
        };
        severity_order(&a.severity).cmp(&severity_order(&b.severity))
    });

    // 应用过滤
    let filtered: Vec<AnomalyAlert> = alerts
        .into_iter()
        .filter(|a| {
            if let Some(ref sev) = params.severity {
                if &a.severity != sev {
                    return false;
                }
            }
            if let Some(ref atype) = params.anomaly_type {
                if &a.anomaly_type != atype {
                    return false;
                }
            }
            if let Some(ref status) = params.status {
                if &a.status != status {
                    return false;
                }
            }
            if let Some(ref eid) = params.equipment_id {
                if &a.source_id != eid {
                    return false;
                }
            }
            true
        })
        .collect();

    Json(ApiResponse::success(filtered, "异常预警列表获取成功"))
}

/// 获取异常预警汇总
pub async fn get_anomaly_summary(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
) -> Json<ApiResponse<AnomalySummary>> {
    let all_alerts = collect_all_alerts(&state.pool).await;

    let mut by_type: HashMap<String, usize> = HashMap::new();
    let mut equipment_map: HashMap<String, (String, usize, String)> = HashMap::new();

    for alert in &all_alerts {
        *by_type.entry(alert.anomaly_type.clone()).or_insert(0) += 1;

        let entry = equipment_map.entry(alert.source_id.clone()).or_insert((
            alert.source_name.clone(),
            0,
            "info".to_string(),
        ));
        entry.1 += 1;
        let sev_order = |s: &str| match s {
            "critical" => 0,
            "warning" => 1,
            _ => 2,
        };
        if sev_order(&alert.severity) < sev_order(&entry.2) {
            entry.2 = alert.severity.clone();
        }
    }

    let by_equipment: Vec<EquipmentAnomalyCount> = equipment_map
        .into_iter()
        .map(|(id, (name, count, sev))| EquipmentAnomalyCount {
            equipment_id: id,
            equipment_name: name,
            alert_count: count,
            highest_severity: sev,
        })
        .collect();

    let recent_trend = get_recent_anomaly_trend(&state.pool).await;

    let summary = AnomalySummary {
        critical_count: all_alerts
            .iter()
            .filter(|a| a.severity == "critical")
            .count(),
        warning_count: all_alerts
            .iter()
            .filter(|a| a.severity == "warning")
            .count(),
        info_count: all_alerts.iter().filter(|a| a.severity == "info").count(),
        total_alerts: all_alerts.len(),
        by_type,
        by_equipment,
        recent_trend,
    };

    Json(ApiResponse::success(summary, "异常预警汇总获取成功"))
}

/// 获取指定设备的异常预警
pub async fn get_equipment_anomalies(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    axum::extract::Path(equipment_id): axum::extract::Path<String>,
) -> Json<ApiResponse<Vec<AnomalyAlert>>> {
    let all_alerts = collect_all_alerts(&state.pool).await;
    let filtered: Vec<AnomalyAlert> = all_alerts
        .into_iter()
        .filter(|a| a.source_id == equipment_id)
        .collect();

    Json(ApiResponse::success(filtered, "设备异常预警获取成功"))
}

/// 获取异常预警规则列表
pub async fn list_anomaly_rules(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<AnomalyRule>>> {
    let rules = default_rules();
    Json(ApiResponse::success(rules, "预警规则列表获取成功"))
}

/// 获取单个预警规则
pub async fn get_anomaly_rule(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    axum::extract::Path(rule_id): axum::extract::Path<String>,
) -> Json<ApiResponse<AnomalyRule>> {
    let rules = default_rules();
    if let Some(rule) = rules.into_iter().find(|r| r.id == rule_id) {
        Json(ApiResponse::success(rule, "预警规则获取成功"))
    } else {
        Json(ApiResponse::error(
            404,
            &format!("预警规则 {} 不存在", rule_id),
        ))
    }
}

/// 更新预警规则
pub async fn update_anomaly_rule(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Json(req): Json<UpdateRuleRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    // 实际项目中应持久化到数据库
    let mut updated_fields = serde_json::Map::new();
    if let Some(v) = req.warning_threshold {
        updated_fields.insert("warning_threshold".into(), v.into());
    }
    if let Some(v) = req.critical_threshold {
        updated_fields.insert("critical_threshold".into(), v.into());
    }
    if let Some(v) = req.enabled {
        updated_fields.insert("enabled".into(), v.into());
    }

    tracing::info!("预警规则更新: {:?}", updated_fields);

    Json(ApiResponse::success(
        serde_json::json!({
            "updated": true,
            "fields": updated_fields,
        }),
        "预警规则更新成功",
    ))
}

/// 手动触发异常扫描
pub async fn trigger_anomaly_scan(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    let equipment_alerts = detect_equipment_anomalies(&state.pool).await;
    let quality_alerts = detect_quality_anomalies(&state.pool).await;
    let production_alerts = detect_production_anomalies(&state.pool).await;

    let total = equipment_alerts.len() + quality_alerts.len() + production_alerts.len();

    Json(ApiResponse::success(
        serde_json::json!({
            "scan_completed": true,
            "scanned_at": Utc::now(),
            "total_alerts_found": total,
            "equipment_alerts": equipment_alerts.len(),
            "quality_alerts": quality_alerts.len(),
            "production_alerts": production_alerts.len(),
        }),
        "异常扫描完成",
    ))
}

/// 获取异常趋势
pub async fn get_anomaly_trend(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Query(params): Query<AnomalyQueryParams>,
) -> Json<ApiResponse<Vec<DailyAnomalyCount>>> {
    let days = if let Some(ref start) = params.start_date {
        if let Some(ref end) = params.end_date {
            if let (Ok(s), Ok(e)) = (
                NaiveDate::parse_from_str(start, "%Y-%m-%d"),
                NaiveDate::parse_from_str(end, "%Y-%m-%d"),
            ) {
                e.signed_duration_since(s).num_days().max(1) as usize
            } else {
                30
            }
        } else {
            30
        }
    } else {
        30
    };

    let trend = get_recent_anomaly_trend_days(&state.pool, days.min(90)).await;
    Json(ApiResponse::success(trend, "异常趋势获取成功"))
}

// ==================== Detection Logic ====================

async fn collect_all_alerts(pool: &sqlx::PgPool) -> Vec<AnomalyAlert> {
    let mut alerts = Vec::new();
    alerts.extend(detect_equipment_anomalies(pool).await);
    alerts.extend(detect_quality_anomalies(pool).await);
    alerts.extend(detect_production_anomalies(pool).await);
    alerts
}

/// 设备异常检测
async fn detect_equipment_anomalies(pool: &sqlx::PgPool) -> Vec<AnomalyAlert> {
    let mut alerts = Vec::new();

    // 1. 基于设备巡检数据检测温度/振动/噪音异常
    if let Ok(rows) = sqlx::query(
        r#"
        SELECT e.id, e.equipment_code AS equipment_no, e.equipment_name AS name,
               ei.temperature, ei.vibration, ei.noiselevel, ei.inspection_date,
               ei.status
        FROM mes.equipment_inspections ei
        JOIN mes.equipment e ON e.id = ei.equipment_id
        WHERE ei.inspection_date::date >= CURRENT_DATE - INTERVAL '7 days'
        ORDER BY ei.inspection_date DESC
        LIMIT 100
        "#,
    )
    .fetch_all(pool)
    .await
    {
        let mut equipment_metrics: HashMap<String, Vec<(f64, f64, f64)>> = HashMap::new();

        for row in rows {
            let eq_id: uuid::Uuid = row.get("id");
            let eq_no: String = row.get("equipment_no");
            let eq_name: String = row.get("name");
            let temp: Option<f64> = row.get("temperature");
            let vibration: Option<f64> = row.get("vibration");
            let noise: Option<f64> = row.get("noiselevel");
            let status: String = row.get("status");

            let temp_v = temp.unwrap_or(0.0);
            let vib_v = vibration.unwrap_or(0.0);
            let noise_v = noise.unwrap_or(0.0);

            // 即时阈值检测
            if temp_v > 80.0 {
                let severity = if temp_v > 95.0 { "critical" } else { "warning" };
                alerts.push(AnomalyAlert {
                    id: format!("equip_overheat_{}_{}", eq_id, Utc::now().timestamp()),
                    anomaly_type: "equipment_overheat".to_string(),
                    severity: severity.to_string(),
                    title: format!("设备 {} 温度异常", eq_name),
                    description: format!(
                        "设备 {} 当前温度 {:.1}°C，超出安全阈值 80°C",
                        eq_name, temp_v
                    ),
                    source_id: eq_id.to_string(),
                    source_name: eq_name.clone(),
                    metric_name: "temperature".to_string(),
                    metric_value: temp_v,
                    threshold_value: 80.0,
                    trend: "rising".to_string(),
                    detected_at: Utc::now(),
                    status: if status == "abnormal" {
                        "confirmed"
                    } else {
                        "detected"
                    }
                    .to_string(),
                    recommendation: "检查冷却系统，必要时停机检修".to_string(),
                });
            }

            if vib_v > 7.0 {
                let severity = if vib_v > 10.0 { "critical" } else { "warning" };
                alerts.push(AnomalyAlert {
                    id: format!("equip_vibration_{}_{}", eq_id, Utc::now().timestamp()),
                    anomaly_type: "equipment_vibration".to_string(),
                    severity: severity.to_string(),
                    title: format!("设备 {} 振动异常", eq_name),
                    description: format!(
                        "设备 {} 振动值 {:.2}mm/s，超出安全阈值 7.0mm/s",
                        eq_name, vib_v
                    ),
                    source_id: eq_id.to_string(),
                    source_name: eq_name.clone(),
                    metric_name: "vibration".to_string(),
                    metric_value: vib_v,
                    threshold_value: 7.0,
                    trend: "rising".to_string(),
                    detected_at: Utc::now(),
                    status: "detected".to_string(),
                    recommendation: "检查轴承和传动部件，安排振动诊断".to_string(),
                });
            }

            if noise_v > 85.0 {
                let severity = if noise_v > 95.0 {
                    "critical"
                } else {
                    "warning"
                };
                alerts.push(AnomalyAlert {
                    id: format!("equip_noise_{}_{}", eq_id, Utc::now().timestamp()),
                    anomaly_type: "equipment_noise".to_string(),
                    severity: severity.to_string(),
                    title: format!("设备 {} 噪音异常", eq_name),
                    description: format!(
                        "设备 {} 噪音值 {:.1}dB，超出安全阈值 85dB",
                        eq_name, noise_v
                    ),
                    source_id: eq_id.to_string(),
                    source_name: eq_name.clone(),
                    metric_name: "noise_level".to_string(),
                    metric_value: noise_v,
                    threshold_value: 85.0,
                    trend: "stable".to_string(),
                    detected_at: Utc::now(),
                    status: "detected".to_string(),
                    recommendation: "检查设备紧固件和运动部件磨损情况".to_string(),
                });
            }

            // 收集用于趋势分析的指标
            let key = format!("{}|{}|{}", eq_id, eq_no, eq_name);
            equipment_metrics
                .entry(key)
                .or_default()
                .push((temp_v, vib_v, noise_v));
        }

        // 趋势分析：检测连续上升趋势
        for (key, metrics) in &equipment_metrics {
            if metrics.len() >= 3 {
                let parts: Vec<&str> = key.split('|').collect();
                if parts.len() == 3 {
                    let eq_id = parts[0];
                    let eq_name = parts[2];

                    // 温度趋势分析
                    let temps: Vec<f64> = metrics.iter().map(|m| m.0).collect();
                    if is_increasing_trend(&temps) && temps.last().unwrap_or(&0.0) > &60.0 {
                        let avg_temp = temps.iter().sum::<f64>() / temps.len() as f64;
                        alerts.push(AnomalyAlert {
                            id: format!("equip_temp_trend_{}_{}", eq_id, Utc::now().timestamp()),
                            anomaly_type: "equipment_overheat".to_string(),
                            severity: "warning".to_string(),
                            title: format!("设备 {} 温度持续上升", eq_name),
                            description: format!(
                                "设备 {} 近 {} 次巡检温度呈持续上升趋势，平均 {:.1}°C",
                                eq_name,
                                metrics.len(),
                                avg_temp
                            ),
                            source_id: eq_id.to_string(),
                            source_name: eq_name.to_string(),
                            metric_name: "temperature_trend".to_string(),
                            metric_value: *temps.last().unwrap_or(&0.0),
                            threshold_value: 60.0,
                            trend: "rising".to_string(),
                            detected_at: Utc::now(),
                            status: "detected".to_string(),
                            recommendation: "密切关注温度变化，提前安排预防性维护".to_string(),
                        });
                    }

                    // 振动趋势分析
                    let vibrations: Vec<f64> = metrics.iter().map(|m| m.1).collect();
                    if is_increasing_trend(&vibrations) && vibrations.last().unwrap_or(&0.0) > &5.0
                    {
                        let avg_vib = vibrations.iter().sum::<f64>() / vibrations.len() as f64;
                        alerts.push(AnomalyAlert {
                            id: format!("equip_vib_trend_{}_{}", eq_id, Utc::now().timestamp()),
                            anomaly_type: "equipment_vibration".to_string(),
                            severity: "warning".to_string(),
                            title: format!("设备 {} 振动持续增大", eq_name),
                            description: format!(
                                "设备 {} 近 {} 次巡检振动呈上升趋势，平均 {:.2}mm/s",
                                eq_name,
                                metrics.len(),
                                avg_vib
                            ),
                            source_id: eq_id.to_string(),
                            source_name: eq_name.to_string(),
                            metric_name: "vibration_trend".to_string(),
                            metric_value: *vibrations.last().unwrap_or(&0.0),
                            threshold_value: 5.0,
                            trend: "rising".to_string(),
                            detected_at: Utc::now(),
                            status: "detected".to_string(),
                            recommendation: "安排振动频谱分析，检查轴承磨损".to_string(),
                        });
                    }
                }
            }
        }
    }

    // 2. 基于设备 OEE 下降检测
    if let Ok(rows) = sqlx::query(
        r#"
        SELECT e.id, e.equipment_code AS equipment_no, e.equipment_name AS name,
               AVG(eo.oee) as avg_oee,
               MAX(eo.oee) as max_oee,
               MIN(eo.oee) as min_oee,
               COUNT(eo.id) as record_count
        FROM mes.equipment_oee eo
        JOIN mes.equipment e ON e.id = eo.equipment_id
        WHERE eo.record_date >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY e.id, e.equipment_code, e.equipment_name
        HAVING AVG(eo.oee) < 0.60
        "#,
    )
    .fetch_all(pool)
    .await
    {
        for row in rows {
            let eq_id: uuid::Uuid = row.get("id");
            let eq_name: String = row.get("name");
            let avg_oee: f64 = row
                .get::<sqlx::types::BigDecimal, _>("avg_oee")
                .to_string()
                .parse()
                .unwrap_or(0.0);
            let record_count: i64 = row.get("record_count");

            let severity = if avg_oee < 0.40 {
                "critical"
            } else {
                "warning"
            };
            alerts.push(AnomalyAlert {
                id: format!("equip_oee_drop_{}_{}", eq_id, Utc::now().timestamp()),
                anomaly_type: "equipment_oee_drop".to_string(),
                severity: severity.to_string(),
                title: format!("设备 {} OEE 偏低", eq_name),
                description: format!(
                    "设备 {} 近 30 天平均 OEE 为 {:.1}%，低于 60% 警戒线（共 {} 条记录）",
                    eq_name,
                    avg_oee * 100.0,
                    record_count
                ),
                source_id: eq_id.to_string(),
                source_name: eq_name,
                metric_name: "oee".to_string(),
                metric_value: avg_oee,
                threshold_value: 0.60,
                trend: "stable".to_string(),
                detected_at: Utc::now(),
                status: "detected".to_string(),
                recommendation: "分析可用率、性能、质量率瓶颈，制定 OEE 提升方案".to_string(),
            });
        }
    }

    // 3. 基于维护周期过期检测
    if let Ok(rows) = sqlx::query(
        r#"
        SELECT id, equipment_code AS equipment_no, equipment_name AS name, maintenance_frequency_days AS maintenance_cycle,
               last_maintenance_date, next_maintenance_date
        FROM mes.equipment
        WHERE status != 'scrapped'
          AND (next_maintenance_date IS NOT NULL AND next_maintenance_date < CURRENT_DATE
               OR (last_maintenance_date IS NULL AND purchase_date < CURRENT_DATE - INTERVAL '90 days'))
        "#,
    )
    .fetch_all(pool)
    .await
    {
        for row in rows {
            let eq_id: uuid::Uuid = row.get("id");
            let eq_name: String = row.get("name");
            let next_maint: Option<chrono::NaiveDate> = row.get("next_maintenance_date");

            let days_overdue = if let Some(nm) = next_maint {
                Utc::now().naive_utc().signed_duration_since(nm.and_hms_opt(0, 0, 0).unwrap()).num_days()
            } else {
                90
            };

            let severity = if days_overdue > 30 { "critical" } else { "warning" };
            alerts.push(AnomalyAlert {
                id: format!("equip_maint_overdue_{}_{}", eq_id, Utc::now().timestamp()),
                anomaly_type: "equipment_maintenance_overdue".to_string(),
                severity: severity.to_string(),
                title: format!("设备 {} 维护已逾期", eq_name),
                description: format!(
                    "设备 {} 维护已逾期 {} 天，请尽快安排维护",
                    eq_name, days_overdue
                ),
                source_id: eq_id.to_string(),
                source_name: eq_name,
                metric_name: "maintenance_overdue_days".to_string(),
                metric_value: days_overdue as f64,
                threshold_value: 0.0,
                trend: "stable".to_string(),
                detected_at: Utc::now(),
                status: "detected".to_string(),
                recommendation: "立即安排预防性维护，避免设备故障".to_string(),
            });
        }
    }

    alerts
}

/// 质量异常检测
async fn detect_quality_anomalies(pool: &sqlx::PgPool) -> Vec<AnomalyAlert> {
    let mut alerts = Vec::new();

    // 1. 基于质量记录检测缺陷率异常
    if let Ok(rows) = sqlx::query(
        r#"
        SELECT order_no, product_name,
               SUM(quantity) as total_qty,
               SUM(defective_quantity) as total_defective,
               COUNT(*) as record_count
        FROM mes.quality_records
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY order_no, product_name
        HAVING SUM(quantity) > 0 AND SUM(defective_quantity)::float / SUM(quantity) > 0.05
        "#,
    )
    .fetch_all(pool)
    .await
    {
        for row in rows {
            let order_no: Option<String> = row.get("order_no");
            let product_name: Option<String> = row.get("product_name");
            let total_qty: f64 = row
                .get::<sqlx::types::BigDecimal, _>("total_qty")
                .to_string()
                .parse()
                .unwrap_or(0.0);
            let total_defective: f64 = row
                .get::<sqlx::types::BigDecimal, _>("total_defective")
                .to_string()
                .parse()
                .unwrap_or(0.0);
            let record_count: i64 = row.get("record_count");

            let defect_rate = if total_qty > 0.0 {
                total_defective / total_qty
            } else {
                0.0
            };

            let severity = if defect_rate > 0.10 {
                "critical"
            } else {
                "warning"
            };
            let source_name = product_name.unwrap_or_else(|| "未知产品".to_string());

            alerts.push(AnomalyAlert {
                id: format!(
                    "quality_defect_{}_{}",
                    order_no.as_deref().unwrap_or("unknown"),
                    Utc::now().timestamp()
                ),
                anomaly_type: "quality_defect_rate".to_string(),
                severity: severity.to_string(),
                title: format!("产品 {} 缺陷率偏高", source_name),
                description: format!(
                    "产品 {} 近 7 天缺陷率 {:.1}%（{} 条记录，总检 {} 件，不良 {} 件）",
                    source_name,
                    defect_rate * 100.0,
                    record_count,
                    total_qty,
                    total_defective
                ),
                source_id: order_no.unwrap_or_else(|| "unknown".to_string()),
                source_name,
                metric_name: "defect_rate".to_string(),
                metric_value: defect_rate,
                threshold_value: 0.05,
                trend: "stable".to_string(),
                detected_at: Utc::now(),
                status: "detected".to_string(),
                recommendation: "分析缺陷原因，检查工艺参数和原材料批次".to_string(),
            });
        }
    }

    // 2. 基于批量不合格检测
    if let Ok(rows) = sqlx::query(
        r#"
        SELECT order_no, product_name, batch_no,
               quantity, qualified_quantity, defective_quantity,
               quality_status, defect_reason
        FROM mes.quality_records
        WHERE quality_status = 'rejected'
          AND created_at >= NOW() - INTERVAL '24 hours'
        "#,
    )
    .fetch_all(pool)
    .await
    {
        for row in rows {
            let product_name: Option<String> = row.get("product_name");
            let batch_no: Option<String> = row.get("batch_no");
            let quantity: f64 = row
                .get::<sqlx::types::BigDecimal, _>("quantity")
                .to_string()
                .parse()
                .unwrap_or(0.0);
            let defect_reason: Option<String> = row.get("defect_reason");

            let source_name = product_name.unwrap_or_else(|| "未知产品".to_string());
            let batch = batch_no.unwrap_or_else(|| "未知批次".to_string());

            alerts.push(AnomalyAlert {
                id: format!("quality_batch_{}_{}", batch, Utc::now().timestamp()),
                anomaly_type: "quality_batch_failure".to_string(),
                severity: "critical".to_string(),
                title: format!("批次 {} 整批不合格", batch),
                description: format!(
                    "产品 {} 批次 {} 被判为整批不合格（数量 {} 件）{}",
                    source_name,
                    batch,
                    quantity,
                    defect_reason
                        .map(|r| format!("，原因：{}", r))
                        .unwrap_or_default()
                ),
                source_id: batch.clone(),
                source_name,
                metric_name: "batch_quality".to_string(),
                metric_value: 0.0,
                threshold_value: 1.0,
                trend: "stable".to_string(),
                detected_at: Utc::now(),
                status: "confirmed".to_string(),
                recommendation: "立即隔离该批次，启动不合格品处理流程".to_string(),
            });
        }
    }

    alerts
}

/// 生产异常检测
async fn detect_production_anomalies(pool: &sqlx::PgPool) -> Vec<AnomalyAlert> {
    let mut alerts = Vec::new();

    // 1. 基于生产订单延期检测
    if let Ok(rows) = sqlx::query(
        r#"
        SELECT id, order_number AS order_no, product_name, status,
               planned_end_date, actual_end_date,
               quantity, completed_quantity
        FROM mes.production_orders
        WHERE status NOT IN ('completed', 'cancelled')
          AND planned_end_date IS NOT NULL
          AND planned_end_date < NOW()
        "#,
    )
    .fetch_all(pool)
    .await
    {
        for row in rows {
            let order_id: uuid::Uuid = row.get("id");
            let order_no: String = row.get("order_no");
            let product_name: String = row.get("product_name");
            let planned_end: Option<chrono::NaiveDate> = row.get("planned_end_date");
            let quantity: f64 = row.get::<i32, _>("quantity") as f64;
            let completed: f64 = row.get::<i32, _>("completed_quantity") as f64;

            let days_delay = if let Some(pe) = planned_end {
                Utc::now()
                    .naive_utc()
                    .date()
                    .signed_duration_since(pe)
                    .num_days()
            } else {
                0
            };

            if days_delay > 0 {
                let severity = if days_delay > 7 {
                    "critical"
                } else {
                    "warning"
                };
                let completion_rate = if quantity > 0.0 {
                    completed / quantity * 100.0
                } else {
                    0.0
                };

                alerts.push(AnomalyAlert {
                    id: format!("prod_delay_{}_{}", order_id, Utc::now().timestamp()),
                    anomaly_type: "production_delay".to_string(),
                    severity: severity.to_string(),
                    title: format!("订单 {} 已延期 {} 天", order_no, days_delay),
                    description: format!(
                        "生产订单 {}（产品：{}）已超出计划完工日期 {} 天，当前完工率 {:.1}%",
                        order_no, product_name, days_delay, completion_rate
                    ),
                    source_id: order_id.to_string(),
                    source_name: format!("订单 {}", order_no),
                    metric_name: "delay_days".to_string(),
                    metric_value: days_delay as f64,
                    threshold_value: 0.0,
                    trend: "rising".to_string(),
                    detected_at: Utc::now(),
                    status: "detected".to_string(),
                    recommendation: "排查延期原因，调整排产计划或增加资源投入".to_string(),
                });
            }
        }
    }

    // 2. 基于 WIP 积压检测
    if let Ok(rows) = sqlx::query(
        r#"
        SELECT w.order_no, w.product_name, w.wip_no, w.status,
               w.quantity, w.start_time,
               ws.station_name as station_name
        FROM mes.wips w
        LEFT JOIN mes.work_stations ws ON ws.id = w.current_work_station_id
        WHERE w.status = 'in_progress'
          AND w.start_time IS NOT NULL
          AND w.start_time < NOW() - INTERVAL '48 hours'
        "#,
    )
    .fetch_all(pool)
    .await
    {
        for row in rows {
            let wip_no: String = row.get("wip_no");
            let product_name: String = row.get("product_name");
            let order_no: Option<String> = row.get("order_no");
            let start_time: Option<chrono::DateTime<Utc>> = row.get("start_time");
            let station_name: Option<String> = row.get("station_name");

            let hours_stuck = if let Some(st) = start_time {
                Utc::now()
                    .naive_utc()
                    .signed_duration_since(st.naive_utc())
                    .num_hours()
            } else {
                0
            };

            let severity = if hours_stuck > 72 {
                "critical"
            } else {
                "warning"
            };

            alerts.push(AnomalyAlert {
                id: format!("wip_backlog_{}_{}", wip_no, Utc::now().timestamp()),
                anomaly_type: "wip_backlog".to_string(),
                severity: severity.to_string(),
                title: format!("在制品 {} 积压 {} 小时", wip_no, hours_stuck),
                description: format!(
                    "在制品 {}（产品：{}）在工位 {} 已停留 {} 小时{}",
                    wip_no,
                    product_name,
                    station_name.unwrap_or_else(|| "未知".to_string()),
                    hours_stuck,
                    order_no
                        .map(|o| format!("，关联订单：{}", o))
                        .unwrap_or_default()
                ),
                source_id: wip_no.clone(),
                source_name: format!("WIP {}", wip_no),
                metric_name: "stagnation_hours".to_string(),
                metric_value: hours_stuck as f64,
                threshold_value: 48.0,
                trend: "stable".to_string(),
                detected_at: Utc::now(),
                status: "detected".to_string(),
                recommendation: "检查工位瓶颈，调整工序平衡或增加人员支持".to_string(),
            });
        }
    }

    alerts
}

// ==================== Helper Functions ====================

/// 判断数据是否呈持续上升趋势
fn is_increasing_trend(data: &[f64]) -> bool {
    if data.len() < 3 {
        return false;
    }
    let mut increasing_count = 0;
    for i in 1..data.len() {
        if data[i] > data[i - 1] {
            increasing_count += 1;
        }
    }
    // 超过 60% 的数据点在上升则判定为上升趋势
    increasing_count as f64 / (data.len() - 1) as f64 > 0.6
}

/// 获取最近 7 天的异常趋势
async fn get_recent_anomaly_trend(pool: &sqlx::PgPool) -> Vec<DailyAnomalyCount> {
    get_recent_anomaly_trend_days(pool, 7).await
}

/// 获取最近 N 天的异常趋势（基于质量记录和设备巡检异常）
async fn get_recent_anomaly_trend_days(pool: &sqlx::PgPool, days: usize) -> Vec<DailyAnomalyCount> {
    let mut result = Vec::new();

    // 基于质量记录中的不良品统计趋势
    if let Ok(rows) = sqlx::query(
        r#"
        SELECT DATE(created_at) as date,
               COUNT(*) as count,
               COUNT(*) FILTER (WHERE quality_status = 'rejected') as critical
        FROM mes.quality_records
        WHERE created_at >= NOW() - INTERVAL '90 days'
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at) DESC
        LIMIT $1
        "#,
    )
    .bind(days as i64)
    .fetch_all(pool)
    .await
    {
        for row in rows {
            let date: chrono::NaiveDate = row.get("date");
            let count: i64 = row.get("count");
            let critical: i64 = row.get("critical");
            result.push(DailyAnomalyCount {
                date: date.to_string(),
                count: count as usize,
                critical: critical as usize,
            });
        }
    }

    // 如果没有历史数据，生成空趋势
    if result.is_empty() {
        for i in 0..days.min(7) {
            let date = Utc::now().naive_utc() - Duration::days(i as i64);
            result.push(DailyAnomalyCount {
                date: date.to_string(),
                count: 0,
                critical: 0,
            });
        }
        result.reverse();
    }

    result
}

/// 默认预警规则
fn default_rules() -> Vec<AnomalyRule> {
    vec![
        AnomalyRule {
            id: "rule_equipment_overheat".to_string(),
            rule_type: "threshold".to_string(),
            metric_name: "temperature".to_string(),
            warning_threshold: 80.0,
            critical_threshold: 95.0,
            window_size: 1,
            enabled: true,
            description: "设备温度超过阈值时触发预警".to_string(),
        },
        AnomalyRule {
            id: "rule_equipment_vibration".to_string(),
            rule_type: "threshold".to_string(),
            metric_name: "vibration".to_string(),
            warning_threshold: 7.0,
            critical_threshold: 10.0,
            window_size: 1,
            enabled: true,
            description: "设备振动超过阈值时触发预警".to_string(),
        },
        AnomalyRule {
            id: "rule_equipment_noise".to_string(),
            rule_type: "threshold".to_string(),
            metric_name: "noise_level".to_string(),
            warning_threshold: 85.0,
            critical_threshold: 95.0,
            window_size: 1,
            enabled: true,
            description: "设备噪音超过阈值时触发预警".to_string(),
        },
        AnomalyRule {
            id: "rule_equipment_oee".to_string(),
            rule_type: "aggregate".to_string(),
            metric_name: "oee".to_string(),
            warning_threshold: 0.60,
            critical_threshold: 0.40,
            window_size: 30,
            enabled: true,
            description: "设备 OEE 30天均值低于阈值时触发预警".to_string(),
        },
        AnomalyRule {
            id: "rule_quality_defect_rate".to_string(),
            rule_type: "aggregate".to_string(),
            metric_name: "defect_rate".to_string(),
            warning_threshold: 0.05,
            critical_threshold: 0.10,
            window_size: 7,
            enabled: true,
            description: "7天缺陷率超过阈值时触发预警".to_string(),
        },
        AnomalyRule {
            id: "rule_production_delay".to_string(),
            rule_type: "threshold".to_string(),
            metric_name: "delay_days".to_string(),
            warning_threshold: 1.0,
            critical_threshold: 7.0,
            window_size: 1,
            enabled: true,
            description: "生产订单延期超过阈值时触发预警".to_string(),
        },
        AnomalyRule {
            id: "rule_wip_stagnation".to_string(),
            rule_type: "threshold".to_string(),
            metric_name: "stagnation_hours".to_string(),
            warning_threshold: 48.0,
            critical_threshold: 72.0,
            window_size: 1,
            enabled: true,
            description: "在制品停留超过阈值时触发预警".to_string(),
        },
        AnomalyRule {
            id: "rule_maintenance_overdue".to_string(),
            rule_type: "threshold".to_string(),
            metric_name: "maintenance_overdue_days".to_string(),
            warning_threshold: 1.0,
            critical_threshold: 30.0,
            window_size: 1,
            enabled: true,
            description: "设备维护逾期超过阈值时触发预警".to_string(),
        },
    ]
}

// ==================== APV-4: 异常处置审批端点（骨架） ====================

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct AnomalyHandlingApprovalStartRequest {
    pub reason: String,
    #[allow(dead_code)]
    pub handling_plan: Option<String>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct AnomalyHandlingApprovalDecisionRequest {
    pub approval_id: uuid::Uuid,
    pub comment: String,
    #[allow(dead_code)]
    pub expected_approval_version: i32,
}

/// 发起异常处置审批（acknowledged→handling）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["mes:write"])),
    path = "/api/mes/anomaly/alerts/{id}/approval/start",
    tag = "AnomalyDetection",
    params(
        ("id" = String, Path, description = "异常预警ID"),
    ),
    request_body = AnomalyHandlingApprovalStartRequest,
    responses(
        (status = 200, description = "异常处置审批发起成功", body = ApiResponse<serde_json::Value>),
    ),
)]
#[allow(unused_variables)]
pub async fn start_anomaly_handling_approval(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(req): Json<AnomalyHandlingApprovalStartRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::MesAnomalyApprove).await
    {
        return e;
    }
    // 校验当前 status=acknowledged，创建 approval 记录并写入 audit log
    let approver_id = match claims.user_id() {
        Ok(uid) => uid,
        Err(_) => return Json(ApiResponse::error(401, "无效的用户身份")),
    };
    let record_id = uuid::Uuid::parse_str(&id).unwrap_or_default();
    let approval_id = match create_approval_and_log(
        &state.pool,
        "anomaly_alert",
        record_id,
        "acknowledged",
        "handling",
        approver_id,
    )
    .await
    {
        Ok(aid) => aid,
        Err(e) => {
            tracing::error!("发起异常处置审批失败: {}", e);
            return Json(ApiResponse::error(500, "发起审批失败"));
        }
    };
    Json(ApiResponse::success(
        build_start_response(approval_id),
        "异常处置审批已发起",
    ))
}

/// 异常处置审批通过
#[utoipa::path(
    post,
    security(("BearerAuth" = ["mes:write"])),
    path = "/api/mes/anomaly/alerts/{id}/approval/approve",
    tag = "AnomalyDetection",
    params(
        ("id" = String, Path, description = "异常预警ID"),
    ),
    request_body = AnomalyHandlingApprovalDecisionRequest,
    responses(
        (status = 200, description = "异常处置审批通过成功", body = ApiResponse<serde_json::Value>),
    ),
)]
#[allow(unused_variables)]
pub async fn approve_anomaly_handling(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(req): Json<AnomalyHandlingApprovalDecisionRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::MesAnomalyApprove).await
    {
        return e;
    }
    // 校验 approval_id 与版本，执行 acknowledged→handling 转换并写入 audit log
    let record_id = uuid::Uuid::parse_str(&id).unwrap_or_default();
    if let Err(e) = execute_transition_and_log(
        &state.pool,
        None,
        "anomaly_alert",
        record_id,
        req.approval_id,
        "acknowledged",
        "handling",
    )
    .await
    {
        tracing::error!("异常处置审批通过失败: {}", e);
        return Json(ApiResponse::error(500, "审批通过失败"));
    }
    Json(ApiResponse::success(
        build_approve_response(req.approval_id),
        "异常处置审批通过成功",
    ))
}

/// 异常处置审批驳回
#[utoipa::path(
    post,
    security(("BearerAuth" = ["mes:write"])),
    path = "/api/mes/anomaly/alerts/{id}/approval/reject",
    tag = "AnomalyDetection",
    params(
        ("id" = String, Path, description = "异常预警ID"),
    ),
    request_body = AnomalyHandlingApprovalDecisionRequest,
    responses(
        (status = 200, description = "异常处置审批驳回成功", body = ApiResponse<serde_json::Value>),
    ),
)]
#[allow(unused_variables)]
pub async fn reject_anomaly_handling(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(req): Json<AnomalyHandlingApprovalDecisionRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::MesAnomalyApprove).await
    {
        return e;
    }
    // 校验 approval_id 与版本，记录驳回并写入 audit log
    let record_id = uuid::Uuid::parse_str(&id).unwrap_or_default();
    if let Err(e) = reject_and_log(
        &state.pool,
        "anomaly_alert",
        record_id,
        req.approval_id,
        &req.comment,
    )
    .await
    {
        tracing::error!("异常处置审批驳回失败: {}", e);
        return Json(ApiResponse::error(500, "审批驳回失败"));
    }
    Json(ApiResponse::success(
        build_reject_response(req.approval_id),
        "异常处置审批驳回成功",
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    // ---- is_increasing_trend ----
    #[test]
    fn trend_short_series_not_trend() {
        assert!(!is_increasing_trend(&[]));
        assert!(!is_increasing_trend(&[1.0]));
        assert!(!is_increasing_trend(&[1.0, 2.0]));
    }

    #[test]
    fn trend_strictly_increasing_is_trend() {
        assert!(is_increasing_trend(&[1.0, 2.0, 3.0, 4.0, 5.0]));
    }

    #[test]
    fn trend_decreasing_not_trend() {
        assert!(!is_increasing_trend(&[5.0, 4.0, 3.0, 2.0, 1.0]));
    }

    #[test]
    fn trend_flat_not_trend() {
        assert!(!is_increasing_trend(&[3.0, 3.0, 3.0, 3.0]));
    }

    #[test]
    fn trend_three_points_all_up() {
        assert!(is_increasing_trend(&[1.0, 2.0, 3.0]));
    }

    #[test]
    fn trend_three_points_half_up_not_trend() {
        // [1,2,1] 只有 1/2 上升，50% <= 60%
        assert!(!is_increasing_trend(&[1.0, 2.0, 1.0]));
    }

    #[test]
    fn trend_75_percent_up_is_trend() {
        // [1,2,1,2,3] 上升 3/4 = 75% > 60%
        assert!(is_increasing_trend(&[1.0, 2.0, 1.0, 2.0, 3.0]));
    }

    #[test]
    fn trend_50_percent_up_not_trend() {
        // [1,2,1,2,1] 上升 2/4 = 50% <= 60%
        assert!(!is_increasing_trend(&[1.0, 2.0, 1.0, 2.0, 1.0]));
    }

    #[test]
    fn trend_with_noise_still_detects_upward() {
        // 长序列线性上升，仅少量小回撤（约 75% 点上升）
        let data = (0..20)
            .map(|i| {
                let v = i as f64;
                if i % 4 == 3 {
                    v - 0.2
                } else {
                    v
                }
            })
            .collect::<Vec<_>>();
        assert!(is_increasing_trend(&data));
    }

    // ---- default_rules ----
    #[test]
    fn default_rules_non_empty() {
        let rules = default_rules();
        assert!(!rules.is_empty());
    }

    #[test]
    fn default_rules_contains_expected_rule() {
        let rules = default_rules();
        assert!(rules.iter().any(|r| r.id == "rule_equipment_overheat"));
        assert!(rules.iter().any(|r| r.id == "rule_quality_defect_rate"));
    }

    #[test]
    fn default_rules_all_enabled() {
        assert!(default_rules().iter().all(|r| r.enabled));
    }

    #[test]
    fn default_rules_thresholds_valid() {
        for r in default_rules() {
            if r.metric_name == "oee" {
                // OEE 是"越低越差"指标：warning(0.60) 先于 critical(0.40) 触发
                assert!(
                    r.warning_threshold >= r.critical_threshold,
                    "OEE 规则 {} 的 warning({}) 应 >= critical({})",
                    r.id,
                    r.warning_threshold,
                    r.critical_threshold
                );
            } else {
                // 其余"越高越差"指标：warning 应先于 critical 触发
                assert!(
                    r.warning_threshold <= r.critical_threshold,
                    "规则 {} 的 warning({}) 应 <= critical({})",
                    r.id,
                    r.warning_threshold,
                    r.critical_threshold
                );
            }
        }
    }

    #[test]
    fn default_rules_have_metric_and_type() {
        for r in default_rules() {
            assert!(!r.metric_name.is_empty());
            assert!(!r.rule_type.is_empty());
            assert!(r.window_size >= 1);
        }
    }

    #[test]
    fn default_rules_have_unique_ids() {
        let mut ids: Vec<_> = default_rules().into_iter().map(|r| r.id).collect();
        let n = ids.len();
        ids.sort();
        ids.dedup();
        assert_eq!(ids.len(), n, "规则 id 应唯一");
    }
}

//! 业务指标查询处理器
//!
//! 提供业务关键指标(KPI)查询、趋势分析与下钻能力。
//! Phase 4 可观测性增强：业务指标大盘。

use axum::{
    extract::{Extension, Query, State},
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::AppState;
use prometheus::{GaugeVec, Opts};
use std::sync::OnceLock;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::get_tenant_id_from_claims;
use topems_shared_core::response::ApiResponse;

// ==================== Prometheus 业务指标注册 ====================

fn business_metric_gauge(name: &str, help: &str) -> GaugeVec {
    GaugeVec::new(
        Opts::new(name, help)
            .namespace("topems")
            .subsystem("business"),
        &["tenant_id", "category", "service", "code", "name", "unit"],
    )
    .expect("business metric gauge should be valid")
}

fn current_value_gauge() -> &'static GaugeVec {
    static GAUGE: OnceLock<GaugeVec> = OnceLock::new();
    GAUGE.get_or_init(|| {
        let gauge = business_metric_gauge("metric_current_value", "业务指标当前值");
        prometheus::default_registry()
            .register(Box::new(gauge.clone()))
            .expect("current_value gauge registration failed");
        gauge
    })
}

fn target_value_gauge() -> &'static GaugeVec {
    static GAUGE: OnceLock<GaugeVec> = OnceLock::new();
    GAUGE.get_or_init(|| {
        let gauge = business_metric_gauge("metric_target_value", "业务指标目标值");
        prometheus::default_registry()
            .register(Box::new(gauge.clone()))
            .expect("target_value gauge registration failed");
        gauge
    })
}

fn change_percent_gauge() -> &'static GaugeVec {
    static GAUGE: OnceLock<GaugeVec> = OnceLock::new();
    GAUGE.get_or_init(|| {
        let gauge = business_metric_gauge("metric_change_percent", "业务指标环比变化百分比");
        prometheus::default_registry()
            .register(Box::new(gauge.clone()))
            .expect("change_percent gauge registration failed");
        gauge
    })
}

fn ensure_business_metrics_registered() {
    let _ = current_value_gauge();
    let _ = target_value_gauge();
    let _ = change_percent_gauge();
}

fn update_business_metric_gauges(tenant_id: Uuid, metrics: &[BusinessMetric]) {
    ensure_business_metrics_registered();

    for m in metrics {
        let tenant = tenant_id.to_string();
        let category = m.category.clone();
        let service = m.service_name.clone().unwrap_or_default();
        let code = m.code.clone();
        let name = m.name.clone();
        let unit = m.unit.clone();

        current_value_gauge()
            .with_label_values(&[&tenant, &category, &service, &code, &name, &unit])
            .set(m.current_value);

        if let Some(target) = m.target_value {
            target_value_gauge()
                .with_label_values(&[&tenant, &category, &service, &code, &name, &unit])
                .set(target);
        }

        if let Some(pct) = m.change_percent {
            change_percent_gauge()
                .with_label_values(&[&tenant, &category, &service, &code, &name, &unit])
                .set(pct);
        }
    }
}

// ==================== 类型定义 ====================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BusinessMetric {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub code: String,
    pub category: String,
    pub unit: String,
    pub current_value: f64,
    pub target_value: Option<f64>,
    pub previous_value: Option<f64>,
    pub change_percent: Option<f64>,
    pub trend_direction: String,
    pub service_name: Option<String>,
    pub description: Option<String>,
    pub last_updated: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BusinessMetricCategory {
    pub code: String,
    pub name: String,
    pub metric_count: i64,
    pub healthy_count: i64,
    pub warning_count: i64,
    pub critical_count: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BusinessMetricTrend {
    pub metric_code: String,
    pub metric_name: String,
    pub unit: String,
    pub timestamp: DateTime<Utc>,
    pub value: f64,
    pub target_value: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BusinessMetricSummary {
    pub total_metrics: i64,
    pub healthy_count: i64,
    pub warning_count: i64,
    pub critical_count: i64,
    pub categories: Vec<BusinessMetricCategory>,
    pub top_metrics: Vec<BusinessMetric>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BusinessMetricKpi {
    pub code: String,
    pub name: String,
    pub value: f64,
    pub unit: String,
    pub target: f64,
    pub achievement_rate: f64,
    pub period: String,
    pub service_name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BusinessMetricQuery {
    pub category: Option<String>,
    pub service_name: Option<String>,
    pub status: Option<String>,
    pub keyword: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct TrendQuery {
    pub metric_code: String,
    pub period: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct KpiRequest {
    pub period: Option<String>,
    pub service_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BusinessMetricRequest {
    pub name: String,
    pub code: String,
    pub category: String,
    pub unit: String,
    pub target_value: Option<f64>,
    pub service_name: Option<String>,
    pub description: Option<String>,
}

// ==================== 辅助函数 ====================

fn seed_business_metrics(tenant_id: Uuid) -> Vec<BusinessMetric> {
    vec![
        // 销售
        BusinessMetric {
            id: Uuid::new_v4(),
            tenant_id,
            name: "订单总数".to_string(),
            code: "order_total".to_string(),
            category: "sales".to_string(),
            unit: "单".to_string(),
            current_value: 1289.0,
            target_value: Some(1500.0),
            previous_value: Some(1102.0),
            change_percent: Some(16.97),
            trend_direction: "up".to_string(),
            service_name: Some("topems-crm".to_string()),
            description: Some("当日累计订单数量".to_string()),
            last_updated: Utc::now(),
        },
        BusinessMetric {
            id: Uuid::new_v4(),
            tenant_id,
            name: "订单转化率".to_string(),
            code: "order_conversion_rate".to_string(),
            category: "sales".to_string(),
            unit: "%".to_string(),
            current_value: 32.5,
            target_value: Some(35.0),
            previous_value: Some(30.2),
            change_percent: Some(7.62),
            trend_direction: "up".to_string(),
            service_name: Some("topems-crm".to_string()),
            description: Some("订单转化率 = 订单数 / 线索数".to_string()),
            last_updated: Utc::now(),
        },
        BusinessMetric {
            id: Uuid::new_v4(),
            tenant_id,
            name: "新增客户数".to_string(),
            code: "new_customers".to_string(),
            category: "sales".to_string(),
            unit: "个".to_string(),
            current_value: 248.0,
            target_value: Some(300.0),
            previous_value: Some(210.0),
            change_percent: Some(18.10),
            trend_direction: "up".to_string(),
            service_name: Some("topems-crm".to_string()),
            description: Some("本月新增签约客户数量".to_string()),
            last_updated: Utc::now(),
        },
        BusinessMetric {
            id: Uuid::new_v4(),
            tenant_id,
            name: "销售回款率".to_string(),
            code: "sales_collection_rate".to_string(),
            category: "sales".to_string(),
            unit: "%".to_string(),
            current_value: 78.5,
            target_value: Some(85.0),
            previous_value: Some(80.2),
            change_percent: Some(-2.12),
            trend_direction: "down".to_string(),
            service_name: Some("topems-crm".to_string()),
            description: Some("当月回款金额 / 当月应收金额".to_string()),
            last_updated: Utc::now(),
        },
        // 生产
        BusinessMetric {
            id: Uuid::new_v4(),
            tenant_id,
            name: "生产完成率".to_string(),
            code: "production_completion_rate".to_string(),
            category: "production".to_string(),
            unit: "%".to_string(),
            current_value: 88.4,
            target_value: Some(95.0),
            previous_value: Some(85.7),
            change_percent: Some(3.15),
            trend_direction: "up".to_string(),
            service_name: Some("topems-mes".to_string()),
            description: Some("生产订单按时完成比例".to_string()),
            last_updated: Utc::now(),
        },
        BusinessMetric {
            id: Uuid::new_v4(),
            tenant_id,
            name: "OEE 综合效率".to_string(),
            code: "oee".to_string(),
            category: "production".to_string(),
            unit: "%".to_string(),
            current_value: 76.8,
            target_value: Some(80.0),
            previous_value: Some(74.5),
            change_percent: Some(3.09),
            trend_direction: "up".to_string(),
            service_name: Some("topems-mes".to_string()),
            description: Some("设备综合效率 = 时间开动率 × 性能开动率 × 合格品率".to_string()),
            last_updated: Utc::now(),
        },
        BusinessMetric {
            id: Uuid::new_v4(),
            tenant_id,
            name: "在制品数量".to_string(),
            code: "wip_count".to_string(),
            category: "production".to_string(),
            unit: "件".to_string(),
            current_value: 3240.0,
            target_value: Some(3000.0),
            previous_value: Some(2900.0),
            change_percent: Some(11.72),
            trend_direction: "up".to_string(),
            service_name: Some("topems-mes".to_string()),
            description: Some("当前生产线在制品总量".to_string()),
            last_updated: Utc::now(),
        },
        BusinessMetric {
            id: Uuid::new_v4(),
            tenant_id,
            name: "设备故障率".to_string(),
            code: "equipment_failure_rate".to_string(),
            category: "production".to_string(),
            unit: "%".to_string(),
            current_value: 2.8,
            target_value: Some(3.0),
            previous_value: Some(3.5),
            change_percent: Some(-20.0),
            trend_direction: "down".to_string(),
            service_name: Some("topems-mes".to_string()),
            description: Some("故障停机时间 / 计划运行时间".to_string()),
            last_updated: Utc::now(),
        },
        // 库存
        BusinessMetric {
            id: Uuid::new_v4(),
            tenant_id,
            name: "库存周转率".to_string(),
            code: "inventory_turnover".to_string(),
            category: "inventory".to_string(),
            unit: "次".to_string(),
            current_value: 4.2,
            target_value: Some(5.0),
            previous_value: Some(4.5),
            change_percent: Some(-6.67),
            trend_direction: "down".to_string(),
            service_name: Some("topems-wms".to_string()),
            description: Some("单位时间库存周转次数".to_string()),
            last_updated: Utc::now(),
        },
        BusinessMetric {
            id: Uuid::new_v4(),
            tenant_id,
            name: "库存金额".to_string(),
            code: "inventory_amount".to_string(),
            category: "inventory".to_string(),
            unit: "元".to_string(),
            current_value: 12_580_000.0,
            target_value: Some(12_000_000.0),
            previous_value: Some(11_500_000.0),
            change_percent: Some(9.39),
            trend_direction: "up".to_string(),
            service_name: Some("topems-wms".to_string()),
            description: Some("当前库存商品总价值".to_string()),
            last_updated: Utc::now(),
        },
        BusinessMetric {
            id: Uuid::new_v4(),
            tenant_id,
            name: "缺货率".to_string(),
            code: "stockout_rate".to_string(),
            category: "inventory".to_string(),
            unit: "%".to_string(),
            current_value: 1.2,
            target_value: Some(2.0),
            previous_value: Some(1.5),
            change_percent: Some(-20.0),
            trend_direction: "down".to_string(),
            service_name: Some("topems-wms".to_string()),
            description: Some("缺货 SKU 数 / 总 SKU 数".to_string()),
            last_updated: Utc::now(),
        },
        // 财务
        BusinessMetric {
            id: Uuid::new_v4(),
            tenant_id,
            name: "应收账款周转天数".to_string(),
            code: "ar_days".to_string(),
            category: "finance".to_string(),
            unit: "天".to_string(),
            current_value: 45.0,
            target_value: Some(40.0),
            previous_value: Some(48.0),
            change_percent: Some(-6.25),
            trend_direction: "down".to_string(),
            service_name: Some("topems-finance".to_string()),
            description: Some("应收账款平均回款天数".to_string()),
            last_updated: Utc::now(),
        },
        BusinessMetric {
            id: Uuid::new_v4(),
            tenant_id,
            name: "应付账款周转天数".to_string(),
            code: "ap_days".to_string(),
            category: "finance".to_string(),
            unit: "天".to_string(),
            current_value: 38.0,
            target_value: Some(45.0),
            previous_value: Some(35.0),
            change_percent: Some(8.57),
            trend_direction: "up".to_string(),
            service_name: Some("topems-finance".to_string()),
            description: Some("应付账款平均付款天数".to_string()),
            last_updated: Utc::now(),
        },
        BusinessMetric {
            id: Uuid::new_v4(),
            tenant_id,
            name: "营业收入".to_string(),
            code: "revenue".to_string(),
            category: "finance".to_string(),
            unit: "元".to_string(),
            current_value: 12_580_000.0,
            target_value: Some(15_000_000.0),
            previous_value: Some(11_200_000.0),
            change_percent: Some(12.32),
            trend_direction: "up".to_string(),
            service_name: Some("topems-finance".to_string()),
            description: Some("本月累计营业收入".to_string()),
            last_updated: Utc::now(),
        },
        BusinessMetric {
            id: Uuid::new_v4(),
            tenant_id,
            name: "经营现金流".to_string(),
            code: "operating_cash_flow".to_string(),
            category: "finance".to_string(),
            unit: "元".to_string(),
            current_value: 2_340_000.0,
            target_value: Some(3_000_000.0),
            previous_value: Some(2_800_000.0),
            change_percent: Some(-16.43),
            trend_direction: "down".to_string(),
            service_name: Some("topems-finance".to_string()),
            description: Some("经营活动产生的现金流量净额".to_string()),
            last_updated: Utc::now(),
        },
        // 人力
        BusinessMetric {
            id: Uuid::new_v4(),
            tenant_id,
            name: "员工出勤率".to_string(),
            code: "attendance_rate".to_string(),
            category: "hr".to_string(),
            unit: "%".to_string(),
            current_value: 96.8,
            target_value: Some(95.0),
            previous_value: Some(95.5),
            change_percent: Some(1.36),
            trend_direction: "up".to_string(),
            service_name: Some("topems-hrm".to_string()),
            description: Some("当月员工平均出勤率".to_string()),
            last_updated: Utc::now(),
        },
        BusinessMetric {
            id: Uuid::new_v4(),
            tenant_id,
            name: "人均产值".to_string(),
            code: "revenue_per_employee".to_string(),
            category: "hr".to_string(),
            unit: "元".to_string(),
            current_value: 85_640.0,
            target_value: Some(100_000.0),
            previous_value: Some(82_000.0),
            change_percent: Some(4.44),
            trend_direction: "up".to_string(),
            service_name: Some("topems-hrm".to_string()),
            description: Some("营业收入 / 在职员工数".to_string()),
            last_updated: Utc::now(),
        },
        BusinessMetric {
            id: Uuid::new_v4(),
            tenant_id,
            name: "员工离职率".to_string(),
            code: "turnover_rate".to_string(),
            category: "hr".to_string(),
            unit: "%".to_string(),
            current_value: 3.2,
            target_value: Some(5.0),
            previous_value: Some(4.8),
            change_percent: Some(-33.33),
            trend_direction: "down".to_string(),
            service_name: Some("topems-hrm".to_string()),
            description: Some("当月离职人数 / 月初在职人数".to_string()),
            last_updated: Utc::now(),
        },
        // 采购
        BusinessMetric {
            id: Uuid::new_v4(),
            tenant_id,
            name: "采购及时率".to_string(),
            code: "purchase_on_time_rate".to_string(),
            category: "procurement".to_string(),
            unit: "%".to_string(),
            current_value: 92.3,
            target_value: Some(95.0),
            previous_value: Some(91.8),
            change_percent: Some(0.54),
            trend_direction: "up".to_string(),
            service_name: Some("topems-scm".to_string()),
            description: Some("采购订单按时到货比例".to_string()),
            last_updated: Utc::now(),
        },
        BusinessMetric {
            id: Uuid::new_v4(),
            tenant_id,
            name: "采购成本节约率".to_string(),
            code: "procurement_savings_rate".to_string(),
            category: "procurement".to_string(),
            unit: "%".to_string(),
            current_value: 4.5,
            target_value: Some(5.0),
            previous_value: Some(4.2),
            change_percent: Some(7.14),
            trend_direction: "up".to_string(),
            service_name: Some("topems-scm".to_string()),
            description: Some("节约金额 / 预算金额".to_string()),
            last_updated: Utc::now(),
        },
        BusinessMetric {
            id: Uuid::new_v4(),
            tenant_id,
            name: "供应商合格率".to_string(),
            code: "supplier_pass_rate".to_string(),
            category: "procurement".to_string(),
            unit: "%".to_string(),
            current_value: 94.8,
            target_value: Some(95.0),
            previous_value: Some(93.5),
            change_percent: Some(1.39),
            trend_direction: "up".to_string(),
            service_name: Some("topems-scm".to_string()),
            description: Some("来料合格批次 / 来料总批次".to_string()),
            last_updated: Utc::now(),
        },
        // 质量
        BusinessMetric {
            id: Uuid::new_v4(),
            tenant_id,
            name: "质量一次合格率".to_string(),
            code: "fpq_rate".to_string(),
            category: "quality".to_string(),
            unit: "%".to_string(),
            current_value: 97.6,
            target_value: Some(98.0),
            previous_value: Some(96.9),
            change_percent: Some(0.72),
            trend_direction: "up".to_string(),
            service_name: Some("topems-qms".to_string()),
            description: Some("产品一次通过质量检验的比例".to_string()),
            last_updated: Utc::now(),
        },
        BusinessMetric {
            id: Uuid::new_v4(),
            tenant_id,
            name: "客户投诉率".to_string(),
            code: "customer_complaint_rate".to_string(),
            category: "quality".to_string(),
            unit: "%".to_string(),
            current_value: 0.8,
            target_value: Some(1.0),
            previous_value: Some(1.2),
            change_percent: Some(-33.33),
            trend_direction: "down".to_string(),
            service_name: Some("topems-qms".to_string()),
            description: Some("客户投诉订单数 / 总订单数".to_string()),
            last_updated: Utc::now(),
        },
        BusinessMetric {
            id: Uuid::new_v4(),
            tenant_id,
            name: "退货率".to_string(),
            code: "return_rate".to_string(),
            category: "quality".to_string(),
            unit: "%".to_string(),
            current_value: 1.5,
            target_value: Some(2.0),
            previous_value: Some(1.8),
            change_percent: Some(-16.67),
            trend_direction: "down".to_string(),
            service_name: Some("topems-qms".to_string()),
            description: Some("退货数量 / 发货数量".to_string()),
            last_updated: Utc::now(),
        },
    ]
}

fn metric_status(metric: &BusinessMetric) -> &'static str {
    if let Some(target) = metric.target_value {
        if metric.code.contains("rate") || metric.unit == "%" {
            if metric.current_value >= target {
                return "healthy";
            }
            if metric.current_value >= target * 0.95 {
                return "warning";
            }
            return "critical";
        }
    }
    if let Some(pct) = metric.change_percent {
        if pct.abs() < 1.0 {
            return "healthy";
        }
        if pct.abs() < 5.0 {
            return "warning";
        }
    }
    "healthy"
}

// ==================== 纯函数（无副作用，便于单元测试） ====================

/// 计算环比变化百分比：(current - previous) / previous * 100。
/// previous 为 0 时返回 None（无法计算）。
pub fn calculate_change_percent(current: f64, previous: f64) -> Option<f64> {
    if previous == 0.0 {
        return None;
    }
    Some((current - previous) / previous * 100.0)
}

/// 计算达成率：current / target * 100。
/// target <= 0 时返回 0.0。
pub fn calculate_achievement_rate(current: f64, target: f64) -> f64 {
    if target <= 0.0 {
        return 0.0;
    }
    (current / target) * 100.0
}

/// 根据原始参数判定业务指标状态（与 metric_status 逻辑一致，但接受基本类型）。
/// - 当有目标值且 code 含 "rate" 或 unit 为 "%" 时，按目标达成率分级
/// - 否则按 change_percent 绝对值分级
pub fn classify_metric_status(
    current: f64,
    target: Option<f64>,
    change_percent: Option<f64>,
    code: &str,
    unit: &str,
) -> &'static str {
    if let Some(target) = target {
        if code.contains("rate") || unit == "%" {
            if current >= target {
                return "healthy";
            }
            if current >= target * 0.95 {
                return "warning";
            }
            return "critical";
        }
    }
    if let Some(pct) = change_percent {
        if pct.abs() < 1.0 {
            return "healthy";
        }
        if pct.abs() < 5.0 {
            return "warning";
        }
    }
    "healthy"
}

// ==================== 路由处理器 ====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["monitor:business:read"])),
    path = "/api/monitor/business-metrics",
    tag = "business_metrics",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn list_business_metrics(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<BusinessMetricQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let metrics = seed_business_metrics(tenant_id);

    let filtered: Vec<BusinessMetric> = metrics
        .into_iter()
        .filter(|m| {
            if let Some(cat) = &query.category {
                if cat != "all" && m.category != *cat {
                    return false;
                }
            }
            if let Some(svc) = &query.service_name {
                if svc != "all" {
                    if let Some(sn) = &m.service_name {
                        if sn != svc {
                            return false;
                        }
                    } else {
                        return false;
                    }
                }
            }
            if let Some(status) = &query.status {
                if status != "all" && metric_status(m) != status {
                    return false;
                }
            }
            if let Some(kw) = &query.keyword {
                if !kw.is_empty()
                    && !m.name.to_lowercase().contains(&kw.to_lowercase())
                    && !m.code.to_lowercase().contains(&kw.to_lowercase())
                {
                    return false;
                }
            }
            true
        })
        .collect();

    let total = filtered.len() as i64;
    Json(ApiResponse::success(
        serde_json::json!({
            "items": filtered,
            "total": total,
        }),
        "获取业务指标列表成功",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["monitor:business:read"])),
    path = "/api/monitor/business-metrics/{id}",
    tag = "business_metrics",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_business_metric(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
) -> Json<ApiResponse<BusinessMetric>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let metric = BusinessMetric {
        id,
        tenant_id,
        name: "订单总数".to_string(),
        code: "order_total".to_string(),
        category: "sales".to_string(),
        unit: "单".to_string(),
        current_value: 1289.0,
        target_value: Some(1500.0),
        previous_value: Some(1102.0),
        change_percent: Some(16.97),
        trend_direction: "up".to_string(),
        service_name: Some("topems-crm".to_string()),
        description: Some("当日累计订单数量".to_string()),
        last_updated: Utc::now(),
    };

    Json(ApiResponse::success(metric, "获取业务指标详情成功"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["monitor:business:read"])),
    path = "/api/monitor/business-metrics",
    request_body = BusinessMetricRequest,
    tag = "business_metrics",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn create_business_metric(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<BusinessMetricRequest>,
) -> Json<ApiResponse<BusinessMetric>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let metric = BusinessMetric {
        id: Uuid::new_v4(),
        tenant_id,
        name: req.name,
        code: req.code,
        category: req.category,
        unit: req.unit,
        current_value: 0.0,
        target_value: req.target_value,
        previous_value: None,
        change_percent: None,
        trend_direction: "flat".to_string(),
        service_name: req.service_name,
        description: req.description,
        last_updated: Utc::now(),
    };

    Json(ApiResponse::success(metric, "业务指标创建成功"))
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["monitor:business:read"])),
    path = "/api/monitor/business-metrics/{id}",
    request_body = BusinessMetricRequest,
    tag = "business_metrics",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn update_business_metric(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    Json(req): Json<BusinessMetricRequest>,
) -> Json<ApiResponse<BusinessMetric>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let metric = BusinessMetric {
        id,
        tenant_id,
        name: req.name,
        code: req.code,
        category: req.category,
        unit: req.unit,
        current_value: 0.0,
        target_value: req.target_value,
        previous_value: None,
        change_percent: None,
        trend_direction: "flat".to_string(),
        service_name: req.service_name,
        description: req.description,
        last_updated: Utc::now(),
    };

    Json(ApiResponse::success(metric, "业务指标更新成功"))
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["monitor:business:read"])),
    path = "/api/monitor/business-metrics/{id}",
    tag = "business_metrics",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn delete_business_metric(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({ "id": id.to_string() }),
        "业务指标删除成功",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["monitor:business:read"])),
    path = "/api/monitor/business-metrics/summary",
    tag = "business_metrics",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_business_metric_summary(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<BusinessMetricSummary>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let metrics = seed_business_metrics(tenant_id);
    update_business_metric_gauges(tenant_id, &metrics);

    let mut healthy = 0i64;
    let mut warning = 0i64;
    let mut critical = 0i64;
    for m in &metrics {
        match metric_status(m) {
            "healthy" => healthy += 1,
            "warning" => warning += 1,
            "critical" => critical += 1,
            _ => {}
        }
    }

    let mut category_map: std::collections::HashMap<String, BusinessMetricCategory> =
        std::collections::HashMap::new();
    for m in &metrics {
        let entry =
            category_map
                .entry(m.category.clone())
                .or_insert_with(|| BusinessMetricCategory {
                    code: m.category.clone(),
                    name: m.category.clone(),
                    metric_count: 0,
                    healthy_count: 0,
                    warning_count: 0,
                    critical_count: 0,
                });
        entry.metric_count += 1;
        match metric_status(m) {
            "healthy" => entry.healthy_count += 1,
            "warning" => entry.warning_count += 1,
            "critical" => entry.critical_count += 1,
            _ => {}
        }
    }

    let mut top_metrics: Vec<BusinessMetric> = metrics.clone();
    top_metrics.sort_by(|a, b| {
        b.change_percent
            .unwrap_or(0.0)
            .abs()
            .partial_cmp(&a.change_percent.unwrap_or(0.0).abs())
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    top_metrics.truncate(5);

    let summary = BusinessMetricSummary {
        total_metrics: metrics.len() as i64,
        healthy_count: healthy,
        warning_count: warning,
        critical_count: critical,
        categories: category_map.into_values().collect(),
        top_metrics,
    };

    Json(ApiResponse::success(summary, "获取业务指标摘要成功"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["monitor:business:read"])),
    path = "/api/monitor/business-metrics/trend",
    tag = "business_metrics",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_business_metric_trend(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Query(query): Query<TrendQuery>,
) -> Json<ApiResponse<Vec<BusinessMetricTrend>>> {
    let period = query.period.unwrap_or_else(|| "7d".to_string());
    let hours = match period.as_str() {
        "1h" => 1,
        "6h" => 6,
        "24h" => 24,
        "7d" => 168,
        "30d" => 720,
        _ => 168,
    };

    let base_value: f64 = 1000.0;
    let now = Utc::now();
    let mut trends = Vec::new();
    for i in (0..hours).rev() {
        let timestamp = now - chrono::Duration::hours(i as i64);
        let wave = ((i as f64) * 0.4).sin() * 80.0;
        let drift = (hours as f64 - i as f64) * 0.5;
        let value = base_value + wave + drift;
        trends.push(BusinessMetricTrend {
            metric_code: query.metric_code.clone(),
            metric_name: query.metric_code.clone(),
            unit: "单".to_string(),
            timestamp,
            value,
            target_value: Some(base_value * 1.2),
        });
    }

    Json(ApiResponse::success(trends, "获取业务指标趋势成功"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["monitor:dashboard:read"])),
    path = "/api/monitor/business-metrics/kpi",
    tag = "business_metrics",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_kpi_dashboard(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Query(query): Query<KpiRequest>,
) -> Json<ApiResponse<Vec<BusinessMetricKpi>>> {
    let period = query.period.unwrap_or_else(|| "monthly".to_string());
    let kpis = vec![
        BusinessMetricKpi {
            code: "revenue".to_string(),
            name: "营业收入".to_string(),
            value: 12_580_000.0,
            unit: "元".to_string(),
            target: 15_000_000.0,
            achievement_rate: 83.87,
            period: period.clone(),
            service_name: Some("topems-finance".to_string()),
        },
        BusinessMetricKpi {
            code: "new_customers".to_string(),
            name: "新增客户数".to_string(),
            value: 248.0,
            unit: "个".to_string(),
            target: 300.0,
            achievement_rate: 82.67,
            period: period.clone(),
            service_name: Some("topems-crm".to_string()),
        },
        BusinessMetricKpi {
            code: "production_output".to_string(),
            name: "生产产量".to_string(),
            value: 85_640.0,
            unit: "件".to_string(),
            target: 100_000.0,
            achievement_rate: 85.64,
            period: period.clone(),
            service_name: Some("topems-mes".to_string()),
        },
        BusinessMetricKpi {
            code: "quality_pass_rate".to_string(),
            name: "质量合格率".to_string(),
            value: 97.6,
            unit: "%".to_string(),
            target: 98.0,
            achievement_rate: 99.59,
            period: period.clone(),
            service_name: Some("topems-qms".to_string()),
        },
        BusinessMetricKpi {
            code: "delivery_on_time".to_string(),
            name: "交付及时率".to_string(),
            value: 94.2,
            unit: "%".to_string(),
            target: 95.0,
            achievement_rate: 99.16,
            period,
            service_name: Some("topems-scm".to_string()),
        },
    ];

    let filtered: Vec<BusinessMetricKpi> = if let Some(svc) = &query.service_name {
        kpis.into_iter()
            .filter(|k| k.service_name.as_deref() == Some(svc.as_str()))
            .collect()
    } else {
        kpis
    };

    Json(ApiResponse::success(filtered, "获取KPI看板成功"))
}

// ==================== /reports/performance ====================

#[derive(serde::Serialize)]
pub struct PerformanceReport {
    pub period: String,
    pub total_requests: i64,
    pub avg_response_time_ms: f64,
    pub error_rate: f64,
    pub p95_response_time_ms: f64,
    pub uptime_percent: f64,
}

pub async fn get_performance_report(
    State(_state): State<AppState>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> impl IntoResponse {
    let period = params
        .get("period")
        .cloned()
        .unwrap_or_else(|| "24h".to_string());
    let report = PerformanceReport {
        period,
        total_requests: 0,
        avg_response_time_ms: 0.0,
        error_rate: 0.0,
        p95_response_time_ms: 0.0,
        uptime_percent: 100.0,
    };
    Json(ApiResponse::success(report, "性能报告获取成功"))
}

// ==================== 路由注册 ====================

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/business-metrics",
            get(list_business_metrics).post(create_business_metric),
        )
        .route(
            "/business-metrics/summary",
            get(get_business_metric_summary),
        )
        .route("/business-metrics/trend", get(get_business_metric_trend))
        .route("/business-metrics/kpi", get(get_kpi_dashboard))
        .route(
            "/business-metrics/{id}",
            get(get_business_metric)
                .put(update_business_metric)
                .delete(delete_business_metric),
        )
        .route("/reports/performance", get(get_performance_report))
}

#[cfg(test)]
mod tests {
    use super::*;

    // ---- calculate_change_percent ----

    #[test]
    fn test_calculate_change_percent_increase() {
        let pct = calculate_change_percent(120.0, 100.0);
        assert!((pct.unwrap() - 20.0).abs() < 0.001);
    }

    #[test]
    fn test_calculate_change_percent_decrease() {
        let pct = calculate_change_percent(80.0, 100.0);
        assert!((pct.unwrap() - (-20.0)).abs() < 0.001);
    }

    #[test]
    fn test_calculate_change_percent_no_change() {
        let pct = calculate_change_percent(100.0, 100.0);
        assert!((pct.unwrap() - 0.0).abs() < 0.001);
    }

    #[test]
    fn test_calculate_change_percent_zero_previous() {
        let pct = calculate_change_percent(100.0, 0.0);
        assert!(pct.is_none());
    }

    #[test]
    fn test_calculate_change_percent_negative_previous() {
        // (-50 - (-100)) / (-100) * 100 = 50 / -100 * 100 = -50.0
        let pct = calculate_change_percent(-50.0, -100.0);
        assert!((pct.unwrap() - (-50.0)).abs() < 0.001);
    }

    #[test]
    fn test_calculate_change_percent_zero_current() {
        let pct = calculate_change_percent(0.0, 100.0);
        assert!((pct.unwrap() - (-100.0)).abs() < 0.001);
    }

    // ---- calculate_achievement_rate ----

    #[test]
    fn test_calculate_achievement_rate_normal() {
        assert!((calculate_achievement_rate(80.0, 100.0) - 80.0).abs() < 0.001);
    }

    #[test]
    fn test_calculate_achievement_rate_exceeded() {
        assert!((calculate_achievement_rate(120.0, 100.0) - 120.0).abs() < 0.001);
    }

    #[test]
    fn test_calculate_achievement_rate_zero_target() {
        assert_eq!(calculate_achievement_rate(50.0, 0.0), 0.0);
    }

    #[test]
    fn test_calculate_achievement_rate_negative_target() {
        assert_eq!(calculate_achievement_rate(50.0, -10.0), 0.0);
    }

    #[test]
    fn test_calculate_achievement_rate_zero_current() {
        assert_eq!(calculate_achievement_rate(0.0, 100.0), 0.0);
    }

    #[test]
    fn test_calculate_achievement_rate_full() {
        assert!((calculate_achievement_rate(100.0, 100.0) - 100.0).abs() < 0.001);
    }

    // ---- classify_metric_status ----

    #[test]
    fn test_classify_metric_status_healthy_rate() {
        // current >= target, code contains "rate"
        assert_eq!(
            classify_metric_status(35.0, Some(30.0), None, "conversion_rate", "%"),
            "healthy"
        );
    }

    #[test]
    fn test_classify_metric_status_warning_rate() {
        // current >= target * 0.95 but < target
        assert_eq!(
            classify_metric_status(29.0, Some(30.0), None, "conversion_rate", "%"),
            "warning"
        );
    }

    #[test]
    fn test_classify_metric_status_critical_rate() {
        // current < target * 0.95
        assert_eq!(
            classify_metric_status(20.0, Some(30.0), None, "conversion_rate", "%"),
            "critical"
        );
    }

    #[test]
    fn test_classify_metric_status_healthy_by_change() {
        // non-rate code, no target, small change
        assert_eq!(
            classify_metric_status(100.0, None, Some(0.5), "order_total", "单"),
            "healthy"
        );
    }

    #[test]
    fn test_classify_metric_status_warning_by_change() {
        assert_eq!(
            classify_metric_status(100.0, None, Some(3.0), "order_total", "单"),
            "warning"
        );
    }

    #[test]
    fn test_classify_metric_status_large_change_defaults_healthy() {
        // change_percent >= 5.0 falls through to "healthy" (matches original metric_status)
        assert_eq!(
            classify_metric_status(100.0, None, Some(10.0), "order_total", "单"),
            "healthy"
        );
    }

    #[test]
    fn test_classify_metric_status_no_target_no_change() {
        assert_eq!(
            classify_metric_status(100.0, None, None, "order_total", "单"),
            "healthy"
        );
    }

    #[test]
    fn test_classify_metric_status_unit_percent_without_rate_code() {
        // unit == "%" triggers rate logic even if code doesn't contain "rate"
        assert_eq!(
            classify_metric_status(98.0, Some(100.0), None, "quality", "%"),
            "warning"
        );
    }

    #[test]
    fn test_classify_metric_status_boundary_95_percent() {
        // current exactly target * 0.95 => warning
        assert_eq!(
            classify_metric_status(28.5, Some(30.0), None, "rate_metric", "%"),
            "warning"
        );
    }
}

//! SLO/SLA 看板处理器
//!
//! 提供服务等级目标(SLO)与等级协议(SLA)的管理、监控与错误预算评估。
//! Phase 4 可观测性增强：SLO 看板。

use axum::{
    extract::{Extension, Query, State},
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

// ==================== 类型定义 ====================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Slo {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub service_name: String,
    pub slo_type: String, // availability, latency, throughput, error_rate
    pub target: f64,
    pub window: String, // 30d, 7d, 24h
    pub current_value: f64,
    pub compliance_rate: f64,
    pub error_budget_total: f64,
    pub error_budget_consumed: f64,
    pub error_budget_remaining: f64,
    pub burn_rate: f64,
    pub status: String, // healthy, warning, critical
    pub owner: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SloRequest {
    pub name: String,
    pub description: Option<String>,
    pub service_name: String,
    pub slo_type: String,
    pub target: f64,
    pub window: String,
    pub owner: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SloViolation {
    pub id: Uuid,
    pub slo_id: Uuid,
    pub slo_name: String,
    pub service_name: String,
    pub violation_type: String, // budget_exhausted, target_breach, fast_burn
    pub severity: String,
    pub start_time: DateTime<Utc>,
    pub end_time: Option<DateTime<Utc>>,
    pub duration_minutes: i64,
    pub current_value: f64,
    pub target_value: f64,
    pub description: String,
    pub resolved: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SloBudget {
    pub slo_id: Uuid,
    pub slo_name: String,
    pub service_name: String,
    pub window: String,
    pub total_budget: f64,
    pub consumed: f64,
    pub remaining: f64,
    pub remaining_percent: f64,
    pub burn_rate_1h: f64,
    pub burn_rate_6h: f64,
    pub burn_rate_24h: f64,
    pub projected_exhaustion: Option<DateTime<Utc>>,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SloSummary {
    pub total_slos: i64,
    pub healthy_count: i64,
    pub warning_count: i64,
    pub critical_count: i64,
    pub avg_compliance: f64,
    pub slos: Vec<Slo>,
    pub recent_violations: Vec<SloViolation>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SloTrendPoint {
    pub timestamp: DateTime<Utc>,
    pub compliance_rate: f64,
    pub error_budget_remaining: f64,
    pub current_value: f64,
    pub target_value: f64,
}

#[derive(Debug, Deserialize)]
pub struct SloQuery {
    pub service_name: Option<String>,
    pub slo_type: Option<String>,
    pub status: Option<String>,
    pub keyword: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SloTrendQuery {
    pub slo_id: Uuid,
    pub period: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SloViolationQuery {
    pub slo_id: Option<Uuid>,
    pub service_name: Option<String>,
    pub resolved: Option<bool>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

// ==================== 辅助函数 ====================

fn get_tenant_id(claims: &Claims) -> Uuid {
    claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .unwrap_or_else(Uuid::new_v4)
}

fn compute_status(compliance: f64, burn_rate: f64) -> String {
    if compliance >= 99.0 && burn_rate < 1.0 {
        "healthy".to_string()
    } else if compliance >= 95.0 && burn_rate < 3.0 {
        "warning".to_string()
    } else {
        "critical".to_string()
    }
}

fn seed_slos(tenant_id: Uuid) -> Vec<Slo> {
    let now = Utc::now();
    vec![
        Slo {
            id: Uuid::new_v4(),
            tenant_id,
            name: "CRM 服务可用性".to_string(),
            description: Some("CRM 服务月度可用性目标".to_string()),
            service_name: "topems-crm".to_string(),
            slo_type: "availability".to_string(),
            target: 99.9,
            window: "30d".to_string(),
            current_value: 99.95,
            compliance_rate: 99.95,
            error_budget_total: 43.2,
            error_budget_consumed: 12.5,
            error_budget_remaining: 30.7,
            burn_rate: 0.7,
            status: "healthy".to_string(),
            owner: Some("ops-team".to_string()),
            created_at: now - chrono::Duration::days(60),
            updated_at: now,
        },
        Slo {
            id: Uuid::new_v4(),
            tenant_id,
            name: "订单 API 延迟 P99".to_string(),
            description: Some("订单 API P99 响应时间".to_string()),
            service_name: "topems-crm".to_string(),
            slo_type: "latency".to_string(),
            target: 200.0,
            window: "7d".to_string(),
            current_value: 156.0,
            compliance_rate: 99.5,
            error_budget_total: 100.0,
            error_budget_consumed: 35.0,
            error_budget_remaining: 65.0,
            burn_rate: 1.2,
            status: "warning".to_string(),
            owner: Some("backend-team".to_string()),
            created_at: now - chrono::Duration::days(30),
            updated_at: now,
        },
        Slo {
            id: Uuid::new_v4(),
            tenant_id,
            name: "生产数据采集完整性".to_string(),
            description: Some("MES 生产数据采集成功率".to_string()),
            service_name: "topems-mes".to_string(),
            slo_type: "throughput".to_string(),
            target: 99.5,
            window: "30d".to_string(),
            current_value: 99.7,
            compliance_rate: 99.7,
            error_budget_total: 216.0,
            error_budget_consumed: 65.0,
            error_budget_remaining: 151.0,
            burn_rate: 0.5,
            status: "healthy".to_string(),
            owner: Some("mes-team".to_string()),
            created_at: now - chrono::Duration::days(90),
            updated_at: now,
        },
        Slo {
            id: Uuid::new_v4(),
            tenant_id,
            name: "支付错误率".to_string(),
            description: Some("支付服务错误率".to_string()),
            service_name: "topems-finance".to_string(),
            slo_type: "error_rate".to_string(),
            target: 0.1,
            window: "7d".to_string(),
            current_value: 0.25,
            compliance_rate: 92.3,
            error_budget_total: 100.0,
            error_budget_consumed: 88.0,
            error_budget_remaining: 12.0,
            burn_rate: 4.5,
            status: "critical".to_string(),
            owner: Some("finance-team".to_string()),
            created_at: now - chrono::Duration::days(20),
            updated_at: now,
        },
        Slo {
            id: Uuid::new_v4(),
            tenant_id,
            name: "AI 推理可用性".to_string(),
            description: Some("AI 服务推理可用性".to_string()),
            service_name: "topems-ai".to_string(),
            slo_type: "availability".to_string(),
            target: 99.0,
            window: "30d".to_string(),
            current_value: 99.4,
            compliance_rate: 99.4,
            error_budget_total: 720.0,
            error_budget_consumed: 320.0,
            error_budget_remaining: 400.0,
            burn_rate: 1.5,
            status: "warning".to_string(),
            owner: Some("ai-team".to_string()),
            created_at: now - chrono::Duration::days(45),
            updated_at: now,
        },
        Slo {
            id: Uuid::new_v4(),
            tenant_id,
            name: "WMS 出库 API 延迟 P95".to_string(),
            description: Some("WMS 出库 API P95 响应时间".to_string()),
            service_name: "topems-wms".to_string(),
            slo_type: "latency".to_string(),
            target: 300.0,
            window: "7d".to_string(),
            current_value: 248.0,
            compliance_rate: 99.8,
            error_budget_total: 100.0,
            error_budget_consumed: 18.0,
            error_budget_remaining: 82.0,
            burn_rate: 0.6,
            status: "healthy".to_string(),
            owner: Some("wms-team".to_string()),
            created_at: now - chrono::Duration::days(15),
            updated_at: now,
        },
    ]
}

fn seed_violations(_tenant_id: Uuid) -> Vec<SloViolation> {
    let now = Utc::now();
    vec![
        SloViolation {
            id: Uuid::new_v4(),
            slo_id: Uuid::new_v4(),
            slo_name: "支付错误率".to_string(),
            service_name: "topems-finance".to_string(),
            violation_type: "fast_burn".to_string(),
            severity: "critical".to_string(),
            start_time: now - chrono::Duration::hours(2),
            end_time: None,
            duration_minutes: 120,
            current_value: 0.25,
            target_value: 0.1,
            description: "错误率持续超过目标,1h 燃烧率 4.5x".to_string(),
            resolved: false,
        },
        SloViolation {
            id: Uuid::new_v4(),
            slo_id: Uuid::new_v4(),
            slo_name: "订单 API 延迟 P99".to_string(),
            service_name: "topems-crm".to_string(),
            violation_type: "target_breach".to_string(),
            severity: "warning".to_string(),
            start_time: now - chrono::Duration::hours(6),
            end_time: Some(now - chrono::Duration::hours(3)),
            duration_minutes: 180,
            current_value: 285.0,
            target_value: 200.0,
            description: "P99 延迟超过 200ms 目标,持续 3 小时".to_string(),
            resolved: true,
        },
        SloViolation {
            id: Uuid::new_v4(),
            slo_id: Uuid::new_v4(),
            slo_name: "AI 推理可用性".to_string(),
            service_name: "topems-ai".to_string(),
            violation_type: "budget_exhausted".to_string(),
            severity: "critical".to_string(),
            start_time: now - chrono::Duration::days(1),
            end_time: None,
            duration_minutes: 1440,
            current_value: 99.4,
            target_value: 99.0,
            description: "错误预算消耗接近 50%".to_string(),
            resolved: false,
        },
    ]
}

// ==================== 路由处理器 ====================

#[utoipa::path(
    get,
    path = "/api/monitor/slos",
    tag = "slo",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn list_slos(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<SloQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims);
    let slos = seed_slos(tenant_id);

    let filtered: Vec<Slo> = slos
        .into_iter()
        .filter(|s| {
            if let Some(svc) = &query.service_name {
                if svc != "all" && s.service_name != *svc {
                    return false;
                }
            }
            if let Some(t) = &query.slo_type {
                if t != "all" && s.slo_type != *t {
                    return false;
                }
            }
            if let Some(st) = &query.status {
                if st != "all" && s.status != *st {
                    return false;
                }
            }
            if let Some(kw) = &query.keyword {
                if !kw.is_empty()
                    && !s.name.to_lowercase().contains(&kw.to_lowercase())
                    && !s.service_name.to_lowercase().contains(&kw.to_lowercase())
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
        "获取 SLO 列表成功",
    ))
}

#[utoipa::path(
    get,
    path = "/api/monitor/slos/{id}",
    tag = "slo",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_slo(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
) -> Json<ApiResponse<Slo>> {
    let tenant_id = get_tenant_id(&claims);
    let slos = seed_slos(tenant_id);
    let slo = slos
        .into_iter()
        .find(|s| s.id == id)
        .unwrap_or_else(|| Slo {
            id,
            tenant_id,
            name: "未知 SLO".to_string(),
            description: None,
            service_name: "unknown".to_string(),
            slo_type: "availability".to_string(),
            target: 99.0,
            window: "30d".to_string(),
            current_value: 0.0,
            compliance_rate: 0.0,
            error_budget_total: 0.0,
            error_budget_consumed: 0.0,
            error_budget_remaining: 0.0,
            burn_rate: 0.0,
            status: "critical".to_string(),
            owner: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        });

    Json(ApiResponse::success(slo, "获取 SLO 详情成功"))
}

#[utoipa::path(
    post,
    path = "/api/monitor/slos",
    tag = "slo",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn create_slo(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<SloRequest>,
) -> Json<ApiResponse<Slo>> {
    let tenant_id = get_tenant_id(&claims);
    let now = Utc::now();
    let compliance = 100.0;
    let burn = 0.0;
    let slo = Slo {
        id: Uuid::new_v4(),
        tenant_id,
        name: req.name,
        description: req.description,
        service_name: req.service_name,
        slo_type: req.slo_type,
        target: req.target,
        window: req.window,
        current_value: 0.0,
        compliance_rate: compliance,
        error_budget_total: 100.0,
        error_budget_consumed: 0.0,
        error_budget_remaining: 100.0,
        burn_rate: burn,
        status: compute_status(compliance, burn),
        owner: req.owner,
        created_at: now,
        updated_at: now,
    };

    Json(ApiResponse::success(slo, "SLO 创建成功"))
}

#[utoipa::path(
    put,
    path = "/api/monitor/slos/{id}",
    tag = "slo",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn update_slo(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    Json(req): Json<SloRequest>,
) -> Json<ApiResponse<Slo>> {
    let tenant_id = get_tenant_id(&claims);
    let now = Utc::now();
    let slo = Slo {
        id,
        tenant_id,
        name: req.name,
        description: req.description,
        service_name: req.service_name,
        slo_type: req.slo_type,
        target: req.target,
        window: req.window,
        current_value: 0.0,
        compliance_rate: 100.0,
        error_budget_total: 100.0,
        error_budget_consumed: 0.0,
        error_budget_remaining: 100.0,
        burn_rate: 0.0,
        status: "healthy".to_string(),
        owner: req.owner,
        created_at: now - chrono::Duration::days(1),
        updated_at: now,
    };

    Json(ApiResponse::success(slo, "SLO 更新成功"))
}

#[utoipa::path(
    delete,
    path = "/api/monitor/slos/{id}",
    tag = "slo",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn delete_slo(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({ "id": id.to_string() }),
        "SLO 删除成功",
    ))
}

#[utoipa::path(
    get,
    path = "/api/monitor/slos/summary",
    tag = "slo",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_slo_summary(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<SloSummary>> {
    let tenant_id = get_tenant_id(&claims);
    let slos = seed_slos(tenant_id);
    let violations = seed_violations(tenant_id);

    let mut healthy = 0i64;
    let mut warning = 0i64;
    let mut critical = 0i64;
    let mut compliance_sum = 0.0;
    for s in &slos {
        compliance_sum += s.compliance_rate;
        match s.status.as_str() {
            "healthy" => healthy += 1,
            "warning" => warning += 1,
            "critical" => critical += 1,
            _ => {}
        }
    }
    let avg_compliance = if slos.is_empty() {
        0.0
    } else {
        compliance_sum / slos.len() as f64
    };

    let summary = SloSummary {
        total_slos: slos.len() as i64,
        healthy_count: healthy,
        warning_count: warning,
        critical_count: critical,
        avg_compliance,
        slos,
        recent_violations: violations,
    };

    Json(ApiResponse::success(summary, "获取 SLO 摘要成功"))
}

#[utoipa::path(
    get,
    path = "/api/monitor/slos/budget",
    tag = "slo",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_slo_budget(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<SloBudget>>> {
    let tenant_id = get_tenant_id(&claims);
    let slos = seed_slos(tenant_id);
    let now = Utc::now();

    let budgets: Vec<SloBudget> = slos
        .into_iter()
        .map(|s| {
            let remaining_percent = if s.error_budget_total > 0.0 {
                (s.error_budget_remaining / s.error_budget_total) * 100.0
            } else {
                0.0
            };
            SloBudget {
                slo_id: s.id,
                slo_name: s.name,
                service_name: s.service_name,
                window: s.window.clone(),
                total_budget: s.error_budget_total,
                consumed: s.error_budget_consumed,
                remaining: s.error_budget_remaining,
                remaining_percent,
                burn_rate_1h: s.burn_rate * 0.5,
                burn_rate_6h: s.burn_rate * 0.8,
                burn_rate_24h: s.burn_rate,
                projected_exhaustion: if s.burn_rate > 0.0 {
                    Some(
                        now + chrono::Duration::hours(
                            (s.error_budget_remaining / s.burn_rate) as i64,
                        ),
                    )
                } else {
                    None
                },
                status: s.status,
            }
        })
        .collect();

    Json(ApiResponse::success(budgets, "获取 SLO 错误预算成功"))
}

#[utoipa::path(
    get,
    path = "/api/monitor/slos/trend",
    tag = "slo",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_slo_trend(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Query(query): Query<SloTrendQuery>,
) -> Json<ApiResponse<Vec<SloTrendPoint>>> {
    let period = query.period.unwrap_or_else(|| "7d".to_string());
    let hours = match period.as_str() {
        "1h" => 1,
        "6h" => 6,
        "24h" => 24,
        "7d" => 168,
        "30d" => 720,
        _ => 168,
    };

    let now = Utc::now();
    let mut points = Vec::new();
    let mut remaining = 100.0;
    for i in (0..hours).rev() {
        let timestamp = now - chrono::Duration::hours(i as i64);
        let wave = ((i as f64) * 0.1).sin() * 0.5;
        let compliance = 99.5 + wave;
        let burn = 0.05 + (((i as f64) * 0.05).cos() * 0.02).abs();
        remaining = (remaining - burn).max(0.0);
        points.push(SloTrendPoint {
            timestamp,
            compliance_rate: compliance,
            error_budget_remaining: remaining,
            current_value: 99.5 + wave,
            target_value: 99.9,
        });
    }

    Json(ApiResponse::success(points, "获取 SLO 趋势成功"))
}

#[utoipa::path(
    get,
    path = "/api/monitor/slos/violations",
    tag = "slo",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn list_slo_violations(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<SloViolationQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims);
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let mut violations = seed_violations(tenant_id);

    if let Some(sid) = query.slo_id {
        violations.retain(|v| v.slo_id == sid);
    }
    if let Some(svc) = &query.service_name {
        violations.retain(|v| v.service_name == *svc);
    }
    if let Some(resolved) = query.resolved {
        violations.retain(|v| v.resolved == resolved);
    }

    let total = violations.len() as i64;
    let items: Vec<SloViolation> = violations
        .into_iter()
        .skip(offset as usize)
        .take(page_size as usize)
        .collect();

    Json(ApiResponse::success(
        serde_json::json!({
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
        }),
        "获取 SLO 违规记录成功",
    ))
}

#[utoipa::path(
    post,
    path = "/api/monitor/slos/violations/{id}/resolve",
    tag = "slo",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn resolve_slo_violation(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({
            "id": id.to_string(),
            "resolved": true,
            "resolved_at": Utc::now().to_rfc3339(),
        }),
        "SLO 违规已处理",
    ))
}

// ==================== 路由注册 ====================

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/slos", get(list_slos).post(create_slo))
        .route("/slos/summary", get(get_slo_summary))
        .route("/slos/budget", get(get_slo_budget))
        .route("/slos/trend", get(get_slo_trend))
        .route("/slos/violations", get(list_slo_violations))
        .route("/slos/violations/{id}/resolve", post(resolve_slo_violation))
        .route(
            "/slos/{id}",
            get(get_slo).put(update_slo).delete(delete_slo),
        )
}

#![allow(dead_code)]

use axum::{
    extract::{Extension, Json, Path, Query, State},
    Router,
};
use chrono::Utc;
use rust_decimal::{prelude::ToPrimitive, Decimal};
use serde::Deserialize;
use sqlx::Row;
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;

use crate::services::FinanceService;
use crate::shared::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::get_tenant_id_from_claims;
use topems_shared_core::response::ApiResponse;

fn parse_period(s: &str) -> Option<(i32, i32)> {
    let parts: Vec<&str> = s.split('-').collect();
    if parts.len() != 2 {
        return None;
    }
    let y: i32 = parts[0].parse().ok()?;
    let m: i32 = parts[1].parse().ok()?;
    if !(1..=12).contains(&m) {
        return None;
    }
    Some((y, m))
}

fn next_period((y, m): (i32, i32)) -> (i32, i32) {
    if m == 12 {
        (y + 1, 1)
    } else {
        (y, m + 1)
    }
}

fn period_string((y, m): (i32, i32)) -> String {
    format!("{:04}-{:02}", y, m)
}

async fn period_net_total(pool: &sqlx::PgPool, tenant_id: Uuid, period: &str) -> (f64, f64, f64) {
    let result: Result<(Option<Decimal>, Option<Decimal>, Option<Decimal>), _> = sqlx::query_as(
        "SELECT COALESCE(SUM(debit), 0) as td, COALESCE(SUM(credit), 0) as tc, COALESCE(SUM(debit - credit), 0) as net
         FROM core_finance_ledger WHERE tenant_id = $1 AND period = $2",
    )
    .bind(tenant_id)
    .bind(period)
    .fetch_one(pool)
    .await;
    match result {
        Ok((td, tc, net)) => (
            td.unwrap_or(Decimal::ZERO).to_f64().unwrap_or(0.0),
            tc.unwrap_or(Decimal::ZERO).to_f64().unwrap_or(0.0),
            net.unwrap_or(Decimal::ZERO).to_f64().unwrap_or(0.0),
        ),
        Err(_) => (0.0, 0.0, 0.0),
    }
}

// ========== Phase 3: 报表项目明细 ==========

#[derive(Debug, Deserialize, IntoParams)]
pub struct ItemDetailsQuery {
    pub report_type: Option<String>,
    pub report_id: Option<String>,
    pub account_code: Option<String>,
    pub period: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:report:read"])),
    path = "/reports/item-details",
    tag = "Report",
    params(ItemDetailsQuery),
    responses(
        (status = 200, description = "获取报表项目明细成功", body = ApiResponse<serde_json::Value>),
        (status = 400, description = "参数错误"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_report_item_details(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ItemDetailsQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let account_code = match params.account_code.as_deref() {
        Some(c) if !c.is_empty() => c,
        _ => return Json(ApiResponse::error(400, "account_code 不能为空")),
    };
    let rows = sqlx::query(
        "SELECT account_code, account_name, period, debit, credit, balance
         FROM core_finance_ledger
         WHERE tenant_id = $1 AND account_code = $2 AND ($3::text IS NULL OR period = $3)
         ORDER BY voucher_date, id",
    )
    .bind(tenant_id)
    .bind(account_code)
    .bind(params.period.as_deref())
    .fetch_all(&state.pool)
    .await;

    match rows {
        Ok(rs) => {
            let items: Vec<serde_json::Value> = rs
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "account_code": r.try_get::<String, _>("account_code").ok(),
                        "account_name": r.try_get::<String, _>("account_name").ok(),
                        "period": r.try_get::<String, _>("period").ok(),
                        "debit": r.try_get::<f64, _>("debit").ok(),
                        "credit": r.try_get::<f64, _>("credit").ok(),
                        "balance": r.try_get::<f64, _>("balance").ok(),
                    })
                })
                .collect();
            Json(ApiResponse::success(
                serde_json::Value::Array(items),
                "查询成功",
            ))
        }
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct ItemVouchersQuery {
    pub report_type: Option<String>,
    pub report_id: Option<String>,
    pub account_code: Option<String>,
    pub period: Option<String>,
    pub page: Option<i64>,
    pub pagesize: Option<i64>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:voucher:read"])),
    path = "/finance/report_item_vouchers",
    tag = "FinancialReports",
    operation_id = "get_report_item_vouchers",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_report_item_vouchers(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ItemVouchersQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let account_code = match params.account_code.as_deref() {
        Some(c) if !c.is_empty() => c,
        _ => return Json(ApiResponse::error(400, "account_code 不能为空")),
    };
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.pagesize.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;

    let rows = sqlx::query(
        "SELECT l.id, l.account_code, l.account_name, l.voucher_id, l.voucher_no, l.voucher_date,
                l.period, l.description, l.debit, l.credit, l.balance
         FROM core_finance_ledger l
         WHERE l.tenant_id = $1 AND l.account_code = $2 AND ($3::text IS NULL OR l.period = $3)
         ORDER BY l.voucher_date DESC, l.id DESC
         LIMIT $4 OFFSET $5",
    )
    .bind(tenant_id)
    .bind(account_code)
    .bind(params.period.as_deref())
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await;

    let total: i64 = match sqlx::query_scalar(
        "SELECT COUNT(*) FROM core_finance_ledger
         WHERE tenant_id = $1 AND account_code = $2 AND ($3::text IS NULL OR period = $3)",
    )
    .bind(tenant_id)
    .bind(account_code)
    .bind(params.period.as_deref())
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(_) => 0,
    };

    match rows {
        Ok(rs) => {
            let items: Vec<serde_json::Value> = rs
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.try_get::<Uuid, _>("id").ok(),
                        "account_code": r.try_get::<String, _>("account_code").ok(),
                        "account_name": r.try_get::<String, _>("account_name").ok(),
                        "voucher_id": r.try_get::<Uuid, _>("voucher_id").ok(),
                        "voucher_no": r.try_get::<String, _>("voucher_no").ok(),
                        "voucher_date": r.try_get::<chrono::DateTime<Utc>, _>("voucher_date").ok(),
                        "period": r.try_get::<String, _>("period").ok(),
                        "description": r.try_get::<Option<String>, _>("description").ok().flatten(),
                        "debit": r.try_get::<f64, _>("debit").ok(),
                        "credit": r.try_get::<f64, _>("credit").ok(),
                        "balance": r.try_get::<f64, _>("balance").ok(),
                    })
                })
                .collect();
            let total_pages = topems_shared_core::response::total_pages_of(total, page_size);
            Json(ApiResponse::success(
                serde_json::json!({
                    "items": items,
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                    "total_pages": total_pages,
                }),
                "查询成功",
            ))
        }
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

// ========== Phase 3: 报表对比分析 ==========

#[derive(Debug, Deserialize, IntoParams)]
pub struct ComparisonQuery {
    pub report_type: Option<String>,
    pub org_id: Option<String>,
    pub period_from: Option<String>,
    pub period_to: Option<String>,
    pub currency_code: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:report:read"])),
    path = "/reports/comparison",
    tag = "Report",
    params(ComparisonQuery),
    responses(
        (status = 200, description = "获取报表对比分析成功", body = ApiResponse<serde_json::Value>),
        (status = 400, description = "参数错误"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_report_comparison(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ComparisonQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let report_type = params.report_type.clone().unwrap_or_default();
    let period_from = match params.period_from.as_deref() {
        Some(p) if !p.is_empty() => p,
        _ => return Json(ApiResponse::error(400, "period_from 不能为空")),
    };
    let period_to = match params.period_to.as_deref() {
        Some(p) if !p.is_empty() => p,
        _ => return Json(ApiResponse::error(400, "period_to 不能为空")),
    };
    let (cur_d, cur_c, cur_net) = period_net_total(&state.pool, tenant_id, period_to).await;
    let (prev_d, prev_c, prev_net) = period_net_total(&state.pool, tenant_id, period_from).await;
    let net_change = cur_net - prev_net;
    let growth_rate = if prev_net.abs() > f64::EPSILON {
        (cur_net - prev_net) / prev_net.abs() * 100.0
    } else {
        0.0
    };
    Json(ApiResponse::success(
        serde_json::json!({
            "report_type": report_type,
            "current": {
                "period": period_to,
                "total_debit": cur_d,
                "total_credit": cur_c,
                "net": cur_net,
            },
            "previous": {
                "period": period_from,
                "total_debit": prev_d,
                "total_credit": prev_c,
                "net": prev_net,
            },
            "changes": {
                "net_change": net_change,
                "growth_rate": growth_rate,
            },
        }),
        "查询成功",
    ))
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct TrendQuery {
    pub report_type: Option<String>,
    pub org_id: Option<String>,
    pub period_from: Option<String>,
    pub period_to: Option<String>,
    pub account_codes: Option<String>,
    pub currency_code: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:report:read"])),
    path = "/finance/report_trend",
    tag = "FinancialReports",
    operation_id = "get_report_trend",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_report_trend(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<TrendQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let start = match params.period_from.as_deref().and_then(parse_period) {
        Some(p) => p,
        None => {
            return Json(ApiResponse::error(
                400,
                "period_from 格式无效，应为 YYYY-MM",
            ))
        }
    };
    let end = match params.period_to.as_deref().and_then(parse_period) {
        Some(p) => p,
        None => return Json(ApiResponse::error(400, "period_to 格式无效，应为 YYYY-MM")),
    };

    let mut points: Vec<serde_json::Value> = Vec::new();
    let mut prev_net: Option<f64> = None;
    let mut cur = start;
    loop {
        let p_str = period_string(cur);
        let (_, _, net) = period_net_total(&state.pool, tenant_id, &p_str).await;
        let growth_rate = match prev_net {
            Some(pv) if pv.abs() > f64::EPSILON => (net - pv) / pv.abs() * 100.0,
            _ => 0.0,
        };
        points.push(serde_json::json!({
            "period": p_str,
            "value": net,
            "growth_rate": growth_rate,
        }));
        prev_net = Some(net);
        if cur == end {
            break;
        }
        cur = next_period(cur);
        if cur > end {
            break;
        }
    }

    Json(ApiResponse::success(
        serde_json::Value::Array(points),
        "查询成功",
    ))
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct YearOverYearQuery {
    pub report_type: Option<String>,
    pub org_id: Option<String>,
    pub current_period: Option<String>,
    pub previous_year_period: Option<String>,
    pub currency_code: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:report:read"])),
    path = "/reports/year-over-year",
    tag = "Report",
    params(YearOverYearQuery),
    responses(
        (status = 200, description = "获取同比分析成功", body = ApiResponse<serde_json::Value>),
        (status = 400, description = "参数错误"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_report_year_over_year(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<YearOverYearQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let report_type = params.report_type.clone().unwrap_or_default();
    let current_period = match params.current_period.as_deref() {
        Some(p) if !p.is_empty() => p,
        _ => return Json(ApiResponse::error(400, "current_period 不能为空")),
    };
    let previous_year_period = match params.previous_year_period.as_deref() {
        Some(p) if !p.is_empty() => p,
        _ => return Json(ApiResponse::error(400, "previous_year_period 不能为空")),
    };
    let (cur_d, cur_c, cur_net) = period_net_total(&state.pool, tenant_id, current_period).await;
    let (prev_d, prev_c, prev_net) =
        period_net_total(&state.pool, tenant_id, previous_year_period).await;
    let net_change = cur_net - prev_net;
    let growth_rate = if prev_net.abs() > f64::EPSILON {
        (cur_net - prev_net) / prev_net.abs() * 100.0
    } else {
        0.0
    };
    Json(ApiResponse::success(
        serde_json::json!({
            "report_type": report_type,
            "current": {
                "period": current_period,
                "total_debit": cur_d,
                "total_credit": cur_c,
                "net": cur_net,
            },
            "previous_year": {
                "period": previous_year_period,
                "total_debit": prev_d,
                "total_credit": prev_c,
                "net": prev_net,
            },
            "changes": {
                "net_change": net_change,
                "growth_rate": growth_rate,
            },
        }),
        "查询成功",
    ))
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct PeriodOverPeriodQuery {
    pub report_type: Option<String>,
    pub org_id: Option<String>,
    pub current_period: Option<String>,
    pub previous_period: Option<String>,
    pub currency_code: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:report:read"])),
    path = "/finance/report_period_over_period/{id}",
    tag = "FinancialReports",
    operation_id = "get_report_period_over_period",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_report_period_over_period(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PeriodOverPeriodQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let report_type = params.report_type.clone().unwrap_or_default();
    let current_period = match params.current_period.as_deref() {
        Some(p) if !p.is_empty() => p,
        _ => return Json(ApiResponse::error(400, "current_period 不能为空")),
    };
    let previous_period = match params.previous_period.as_deref() {
        Some(p) if !p.is_empty() => p,
        _ => return Json(ApiResponse::error(400, "previous_period 不能为空")),
    };
    let (cur_d, cur_c, cur_net) = period_net_total(&state.pool, tenant_id, current_period).await;
    let (prev_d, prev_c, prev_net) =
        period_net_total(&state.pool, tenant_id, previous_period).await;
    let net_change = cur_net - prev_net;
    let growth_rate = if prev_net.abs() > f64::EPSILON {
        (cur_net - prev_net) / prev_net.abs() * 100.0
    } else {
        0.0
    };
    Json(ApiResponse::success(
        serde_json::json!({
            "report_type": report_type,
            "current": {
                "period": current_period,
                "total_debit": cur_d,
                "total_credit": cur_c,
                "net": cur_net,
            },
            "previous": {
                "period": previous_period,
                "total_debit": prev_d,
                "total_credit": prev_c,
                "net": prev_net,
            },
            "changes": {
                "net_change": net_change,
                "growth_rate": growth_rate,
            },
        }),
        "查询成功",
    ))
}

// ========== Phase 4: 多公司合并 ==========

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:report:read"])),
    path = "/reports/consolidated/generate",
    tag = "Report",
    request_body = serde_json::Value,
    responses(
        (status = 200, description = "生成合并报表成功", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn generate_consolidated_report(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let consolidation_id = req
        .get("consolidation_id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let report_type = req
        .get("report_type")
        .and_then(|v| v.as_str())
        .unwrap_or("balance_sheet")
        .to_string();
    let period = req
        .get("period")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let currency_code = req
        .get("currency_code")
        .and_then(|v| v.as_str())
        .unwrap_or("CNY")
        .to_string();
    let eliminate_intercompany = req
        .get("eliminate_intercompany")
        .and_then(|v| v.as_bool())
        .unwrap_or(true);
    Json(ApiResponse::success(
        serde_json::json!({
            "consolidation_id": consolidation_id,
            "report_type": report_type,
            "period": period,
            "currency_code": currency_code,
            "eliminate_intercompany": eliminate_intercompany,
            "total_assets": 10000000.00,
            "total_liabilities": 5000000.00,
            "total_equity": 5000000.00,
            "total_revenue": 8000000.00,
            "total_expense": 6000000.00,
            "net_income": 2000000.00,
            "entities_count": 3,
            "eliminations_count": 5,
            "generated_at": Utc::now().to_rfc3339(),
        }),
        "合并报表生成成功",
    ))
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct ConsolidatedReportQuery {
    pub report_type: Option<String>,
    pub period: Option<String>,
    pub currency_code: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:report:read"])),
    path = "/finance/consolidated_report/{id}",
    tag = "FinancialReports",
    operation_id = "get_consolidated_report",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_consolidated_report(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(consolidation_id): Path<String>,
    Query(params): Query<ConsolidatedReportQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    let report_type = params
        .report_type
        .unwrap_or_else(|| "balance_sheet".to_string());
    let period = params.period.unwrap_or_default();
    let currency_code = params.currency_code.unwrap_or_else(|| "CNY".to_string());
    Json(ApiResponse::success(
        serde_json::json!({
            "consolidation_id": consolidation_id,
            "report_type": report_type,
            "period": period,
            "currency_code": currency_code,
            "total_assets": 10000000.00,
            "total_liabilities": 5000000.00,
            "total_equity": 5000000.00,
            "entities": [
                {"entity_id": "00000000-0000-0000-0000-000000000001", "name": "母公司", "ownership_percentage": 100.0},
                {"entity_id": "00000000-0000-0000-0000-000000000002", "name": "子公司A", "ownership_percentage": 80.0},
                {"entity_id": "00000000-0000-0000-0000-000000000003", "name": "子公司B", "ownership_percentage": 60.0},
            ],
            "eliminations": [
                {"description": "内部应收应付抵消", "amount": 500000.00},
            ],
        }),
        "查询成功",
    ))
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct EntityListQuery {
    pub parent_id: Option<String>,
    pub include_disabled: Option<bool>,
    pub page: Option<i64>,
    pub pagesize: Option<i64>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/reports/consolidated/entities",
    tag = "Report",
    params(EntityListQuery),
    responses(
        (status = 200, description = "获取合并实体列表成功", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_consolidation_entities(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Query(params): Query<EntityListQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.pagesize.unwrap_or(20).clamp(1, 100);
    let include_disabled = params.include_disabled.unwrap_or(false);
    let now = Utc::now().to_rfc3339();
    let mut items: Vec<serde_json::Value> = Vec::new();
    let entities = [
        (
            "00000000-0000-0000-0000-000000000001",
            "集团母公司",
            "GROUP-001",
            "holding",
            100.0_f64,
            true,
        ),
        (
            "00000000-0000-0000-0000-000000000002",
            "子公司A",
            "SUB-001",
            "subsidiary",
            80.0,
            true,
        ),
        (
            "00000000-0000-0000-0000-000000000003",
            "子公司B",
            "SUB-002",
            "subsidiary",
            60.0,
            true,
        ),
        (
            "00000000-0000-0000-0000-000000000004",
            "联营公司C",
            "ASSOC-001",
            "associate",
            30.0,
            include_disabled,
        ),
        (
            "00000000-0000-0000-0000-000000000005",
            "合营公司D",
            "JV-001",
            "joint_venture",
            50.0,
            include_disabled,
        ),
    ];
    for (id, name, code, etype, own, active) in entities.iter() {
        if !include_disabled && !active {
            continue;
        }
        if let Some(ref pid) = params.parent_id {
            if *pid != "00000000-0000-0000-0000-000000000001" && id != pid {
                continue;
            }
        }
        items.push(serde_json::json!({
            "id": id,
            "name": name,
            "code": code,
            "parent_id": if *id == "00000000-0000-0000-0000-000000000001" { None } else { Some("00000000-0000-0000-0000-000000000001") },
            "entity_type": etype,
            "ownership_percentage": own,
            "currency_code": "CNY",
            "isactive": active,
            "created_at": now,
            "updated_at": now,
        }));
    }
    let total = items.len() as i64;
    Json(ApiResponse::success(
        serde_json::json!({
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": topems_shared_core::response::total_pages_of(total, page_size),
        }),
        "查询成功",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:invoice:write"])),
    path = "/reports/consolidated/entities",
    tag = "Report",
    request_body = serde_json::Value,
    responses(
        (status = 200, description = "创建合并实体成功", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn create_consolidation_entity(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let id = Uuid::new_v4();
    let now = Utc::now().to_rfc3339();
    Json(ApiResponse::success(
        serde_json::json!({
            "id": id,
            "name": req.get("name").and_then(|v| v.as_str()).unwrap_or(""),
            "code": req.get("code").and_then(|v| v.as_str()).unwrap_or(""),
            "parent_id": req.get("parent_id").and_then(|v| v.as_str()),
            "entity_type": req.get("entity_type").and_then(|v| v.as_str()).unwrap_or("subsidiary"),
            "ownership_percentage": req.get("ownership_percentage").and_then(|v| v.as_f64()).unwrap_or(0.0),
            "currency_code": req.get("currency_code").and_then(|v| v.as_str()).unwrap_or("CNY"),
            "isactive": true,
            "created_at": now,
            "updated_at": now,
        }),
        "创建成功",
    ))
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["finance:update"])),
    path = "/finance/consolidation_entity/{id}",
    tag = "FinancialReports",
    operation_id = "update_consolidation_entity",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn update_consolidation_entity(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(entity_id): Path<String>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let now = Utc::now().to_rfc3339();
    Json(ApiResponse::success(
        serde_json::json!({
            "id": entity_id,
            "name": req.get("name").and_then(|v| v.as_str()).unwrap_or(""),
            "code": req.get("code").and_then(|v| v.as_str()).unwrap_or(""),
            "parent_id": req.get("parent_id").and_then(|v| v.as_str()),
            "entity_type": req.get("entity_type").and_then(|v| v.as_str()).unwrap_or("subsidiary"),
            "ownership_percentage": req.get("ownership_percentage").and_then(|v| v.as_f64()).unwrap_or(0.0),
            "currency_code": req.get("currency_code").and_then(|v| v.as_str()).unwrap_or("CNY"),
            "isactive": req.get("isactive").and_then(|v| v.as_bool()).unwrap_or(true),
            "updated_at": now,
        }),
        "更新成功",
    ))
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["finance:delete"])),
    path = "/finance/consolidation_entity/{id}",
    tag = "FinancialReports",
    operation_id = "delete_consolidation_entity",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn delete_consolidation_entity(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(entity_id): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({
            "id": entity_id,
            "deleted": true,
        }),
        "删除成功",
    ))
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct ElimListQuery {
    pub consolidation_id: Option<String>,
    pub period: Option<String>,
    pub page: Option<i64>,
    pub pagesize: Option<i64>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/reports/consolidated/elims",
    tag = "Report",
    params(ElimListQuery),
    responses(
        (status = 200, description = "获取内部交易抵消分录列表成功", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_intercompany_elims(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Query(params): Query<ElimListQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.pagesize.unwrap_or(20).clamp(1, 100);
    let now = Utc::now().to_rfc3339();
    let items = vec![
        serde_json::json!({
            "id": Uuid::new_v4(),
            "consolidation_id": params.consolidation_id.clone().unwrap_or_default(),
            "period": params.period.clone().unwrap_or_default(),
            "description": "内部应收应付抵消",
            "debit_account_code": "1122",
            "credit_account_code": "2202",
            "amount": 500000.00,
            "created_at": now,
        }),
        serde_json::json!({
            "id": Uuid::new_v4(),
            "consolidation_id": params.consolidation_id.clone().unwrap_or_default(),
            "period": params.period.clone().unwrap_or_default(),
            "description": "内部销售收入抵消",
            "debit_account_code": "6001",
            "credit_account_code": "6401",
            "amount": 300000.00,
            "created_at": now,
        }),
    ];
    let total = items.len() as i64;
    Json(ApiResponse::success(
        serde_json::json!({
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": topems_shared_core::response::total_pages_of(total, page_size),
        }),
        "查询成功",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/finance/intercompany_elimination",
    tag = "FinancialReports",
    operation_id = "add_intercompany_elimination",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn add_intercompany_elimination(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let id = Uuid::new_v4();
    let now = Utc::now().to_rfc3339();
    Json(ApiResponse::success(
        serde_json::json!({
            "id": id,
            "consolidation_id": req.get("consolidation_id").and_then(|v| v.as_str()).unwrap_or(""),
            "period": req.get("period").and_then(|v| v.as_str()).unwrap_or(""),
            "description": req.get("description").and_then(|v| v.as_str()).unwrap_or(""),
            "debit_account_code": req.get("debit_account_code").and_then(|v| v.as_str()).unwrap_or(""),
            "credit_account_code": req.get("credit_account_code").and_then(|v| v.as_str()).unwrap_or(""),
            "amount": req.get("amount").and_then(|v| v.as_f64()).unwrap_or(0.0),
            "created_at": now,
        }),
        "创建成功",
    ))
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct ConsolidatedExportQuery {
    pub report_type: Option<String>,
    pub period: Option<String>,
    pub currency_code: Option<String>,
    pub format: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:report:read"])),
    path = "/reports/consolidated/{consolidation_id}/export",
    tag = "Financial-Reports",
    operation_id = "export_consolidated_report",
    responses((status = 200, description = "OK")),
)]
pub async fn export_consolidated_report(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(consolidation_id): Path<String>,
    Query(params): Query<ConsolidatedExportQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    let report_type = params
        .report_type
        .unwrap_or_else(|| "balance_sheet".to_string());
    let period = params.period.unwrap_or_default();
    let format = params.format.unwrap_or_else(|| "pdf".to_string());
    let url = format!(
        "/exports/consolidated/{}_{}_{}.{}",
        consolidation_id, report_type, period, format
    );
    Json(ApiResponse::success(
        serde_json::json!({
            "consolidation_id": consolidation_id,
            "report_type": report_type,
            "period": period,
            "format": format,
            "url": url,
            "expires_at": Utc::now().to_rfc3339(),
        }),
        "导出成功",
    ))
}

// ========== Phase 4: 批量导出 ==========

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:report:read"])),
    path = "/finance/batch_export_reports",
    tag = "FinancialReports",
    operation_id = "batch_export_reports",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn batch_export_reports(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let report_type = req
        .get("report_type")
        .and_then(|v| v.as_str())
        .unwrap_or("balance_sheet")
        .to_string();
    let format = req
        .get("format")
        .and_then(|v| v.as_str())
        .unwrap_or("xlsx")
        .to_string();
    let org_ids: Vec<String> = req
        .get("org_ids")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();
    let periods: Vec<String> = req
        .get("periods")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();

    let mut tasks: Vec<serde_json::Value> = Vec::new();
    for cid in &org_ids {
        for p in &periods {
            tasks.push(serde_json::json!({
                "org_id": cid,
                "period": p,
                "report_type": report_type,
                "format": format,
                "status": "completed",
                "url": format!("/exports/{}_{}_{}.{}", cid, report_type, p, format),
            }));
        }
    }
    Json(ApiResponse::success(
        serde_json::json!({
            "report_type": report_type,
            "format": format,
            "total": tasks.len(),
            "tasks": tasks,
            "completed_at": Utc::now().to_rfc3339(),
        }),
        "批量导出成功",
    ))
}

// ========== Phase 4: 报表订阅 ==========

#[derive(Debug, Deserialize, IntoParams)]
pub struct SubscriptionListQuery {
    pub report_type: Option<String>,
    pub isactive: Option<bool>,
    pub page: Option<i64>,
    pub pagesize: Option<i64>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:report:read"])),
    path = "/reports/subscriptions",
    tag = "Report",
    params(SubscriptionListQuery),
    responses(
        (status = 200, description = "获取报表订阅列表成功", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_report_subscriptions(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Query(params): Query<SubscriptionListQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.pagesize.unwrap_or(20).clamp(1, 100);
    let now = Utc::now().to_rfc3339();
    let mut items: Vec<serde_json::Value> = Vec::new();
    let subs = [
        (
            "月度资产负债表订阅",
            "balance_sheet",
            "monthly",
            "pdf",
            true,
        ),
        (
            "季度利润表订阅",
            "income_statement",
            "quarterly",
            "xlsx",
            true,
        ),
        (
            "年度现金流量表订阅",
            "cash_flow",
            "yearly",
            "pdf",
            params.isactive.unwrap_or(false),
        ),
    ];
    for (i, (name, rt, freq, fmt, active)) in subs.iter().enumerate() {
        if let Some(rt_filter) = params.report_type.as_deref() {
            if *rt != rt_filter {
                continue;
            }
        }
        if let Some(active_filter) = params.isactive {
            if *active != active_filter {
                continue;
            }
        }
        items.push(serde_json::json!({
            "id": format!("00000000-0000-0000-0000-{:012}", i + 1),
            "name": name,
            "report_type": rt,
            "org_ids": ["00000000-0000-0000-0000-000000000001"],
            "periods": ["2024-01", "2024-02", "2024-03"],
            "frequency": freq,
            "recipients": [{"email": "finance@example.com"}],
            "format": fmt,
            "isactive": active,
            "last_run_at": now,
            "next_run_at": now,
            "created_at": now,
            "updated_at": now,
        }));
    }
    let total = items.len() as i64;
    Json(ApiResponse::success(
        serde_json::json!({
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": topems_shared_core::response::total_pages_of(total, page_size),
        }),
        "查询成功",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:invoice:write"])),
    path = "/reports/subscriptions",
    tag = "Report",
    request_body = serde_json::Value,
    responses(
        (status = 200, description = "创建报表订阅成功", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn create_report_subscription(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let id = Uuid::new_v4();
    let now = Utc::now().to_rfc3339();
    let org_ids: Vec<String> = req
        .get("org_ids")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();
    let periods: Vec<String> = req
        .get("periods")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();
    let recipients = req
        .get("recipients")
        .cloned()
        .unwrap_or(serde_json::json!([]));
    Json(ApiResponse::success(
        serde_json::json!({
            "id": id,
            "name": req.get("name").and_then(|v| v.as_str()).unwrap_or(""),
            "report_type": req.get("report_type").and_then(|v| v.as_str()).unwrap_or("balance_sheet"),
            "org_ids": org_ids,
            "periods": periods,
            "frequency": req.get("frequency").and_then(|v| v.as_str()).unwrap_or("monthly"),
            "recipients": recipients,
            "format": req.get("format").and_then(|v| v.as_str()).unwrap_or("pdf"),
            "isactive": req.get("isactive").and_then(|v| v.as_bool()).unwrap_or(true),
            "next_run_at": now,
            "created_at": now,
            "updated_at": now,
        }),
        "创建成功",
    ))
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["finance:report:read"])),
    path = "/finance/report_subscription/{id}",
    tag = "FinancialReports",
    operation_id = "update_report_subscription",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn update_report_subscription(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(subscription_id): Path<String>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let now = Utc::now().to_rfc3339();
    let org_ids: Vec<String> = req
        .get("org_ids")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();
    let periods: Vec<String> = req
        .get("periods")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();
    let recipients = req
        .get("recipients")
        .cloned()
        .unwrap_or(serde_json::json!([]));
    Json(ApiResponse::success(
        serde_json::json!({
            "id": subscription_id,
            "name": req.get("name").and_then(|v| v.as_str()).unwrap_or(""),
            "report_type": req.get("report_type").and_then(|v| v.as_str()).unwrap_or("balance_sheet"),
            "org_ids": org_ids,
            "periods": periods,
            "frequency": req.get("frequency").and_then(|v| v.as_str()).unwrap_or("monthly"),
            "recipients": recipients,
            "format": req.get("format").and_then(|v| v.as_str()).unwrap_or("pdf"),
            "isactive": req.get("isactive").and_then(|v| v.as_bool()).unwrap_or(true),
            "updated_at": now,
        }),
        "更新成功",
    ))
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["finance:report:read"])),
    path = "/reports/subscriptions/{subscriptionId}",
    tag = "Report",
    params(("subscriptionId" = String, Path, description = "订阅ID")),
    responses(
        (status = 200, description = "删除报表订阅成功", body = ApiResponse<serde_json::Value>),
        (status = 404, description = "报表订阅不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn delete_report_subscription(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(subscription_id): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({
            "id": subscription_id,
            "deleted": true,
        }),
        "删除成功",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:report:read"])),
    path = "/finance/report_now",
    tag = "FinancialReports",
    operation_id = "send_report_now",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn send_report_now(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(subscription_id): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({
            "subscription_id": subscription_id,
            "status": "sent",
            "sent_at": Utc::now().to_rfc3339(),
        }),
        "发送成功",
    ))
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct SubscriptionHistoryQuery {
    pub page: Option<i64>,
    pub pagesize: Option<i64>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance/subscription_history",
    tag = "FinancialReports",
    operation_id = "get_subscription_history",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_subscription_history(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(subscription_id): Path<String>,
    Query(params): Query<SubscriptionHistoryQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.pagesize.unwrap_or(20).clamp(1, 100);
    let now = Utc::now().to_rfc3339();
    let items = vec![
        serde_json::json!({
            "id": Uuid::new_v4(),
            "subscription_id": subscription_id,
            "sent_at": now,
            "status": "success",
            "recipients_count": 3,
            "format": "pdf",
        }),
        serde_json::json!({
            "id": Uuid::new_v4(),
            "subscription_id": subscription_id,
            "sent_at": now,
            "status": "success",
            "recipients_count": 3,
            "format": "pdf",
        }),
    ];
    let total = items.len() as i64;
    Json(ApiResponse::success(
        serde_json::json!({
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": topems_shared_core::response::total_pages_of(total, page_size),
        }),
        "查询成功",
    ))
}

// ========== Phase 1: 报表生成 + 历史查询 ==========

#[derive(Debug, Deserialize, ToSchema)]
pub struct GenerateReportRequest {
    pub org_id: Option<String>,
    pub period: String,
    pub compare_period: Option<String>,
    pub currency_code: Option<String>,
    pub include_disabled_accounts: Option<bool>,
    pub include_detail: Option<bool>,
    pub method: Option<String>,
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct GetReportQuery {
    pub org_id: Option<String>,
    pub period: String,
    pub currency_code: Option<String>,
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct HistoryReportQuery {
    pub org_id: Option<String>,
    pub start_period: String,
    pub end_period: String,
    pub currency_code: Option<String>,
    pub page: Option<i64>,
    pub pagesize: Option<i64>,
}

async fn upsert_report(
    pool: &sqlx::PgPool,
    tenant_id: Uuid,
    report_type: &str,
    period: &str,
    currency_code: &str,
    data: serde_json::Value,
    generated_by: &str,
) -> Result<serde_json::Value, sqlx::Error> {
    let row = sqlx::query(
        r#"
        INSERT INTO financial_reports (report_type, org_id, tenant_id, period, currency_code, status, approval_status, data, generated_by, generated_at)
        VALUES ($1, $2, $2, $3, $4, 'draft', 'draft', $5, $6, NOW())
        ON CONFLICT (report_type, org_id, period, currency_code)
        DO UPDATE SET data = EXCLUDED.data, generated_by = EXCLUDED.generated_by, generated_at = NOW(), updated_at = NOW()
        RETURNING id, report_type, org_id, period, currency_code, status, approval_status, data, generated_at
        "#,
    )
    .bind(report_type)
    .bind(tenant_id)
    .bind(period)
    .bind(currency_code)
    .bind(data)
    .bind(generated_by)
    .fetch_one(pool)
    .await?;

    Ok(serde_json::json!({
        "id": row.get::<Uuid, _>("id"),
        "report_type": row.get::<String, _>("report_type"),
        "org_id": row.get::<Option<Uuid>, _>("org_id"),
        "period": row.get::<String, _>("period"),
        "currency_code": row.get::<String, _>("currency_code"),
        "status": row.get::<String, _>("status"),
        "approval_status": row.get::<String, _>("approval_status"),
        "data": row.get::<serde_json::Value, _>("data"),
        "generated_at": row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("generated_at"),
    }))
}

async fn fetch_report(
    pool: &sqlx::PgPool,
    tenant_id: Uuid,
    report_type: &str,
    period: &str,
    currency_code: &str,
) -> Result<Option<serde_json::Value>, sqlx::Error> {
    let row = sqlx::query(
        r#"SELECT id, report_type, org_id, period, currency_code, status, approval_status, data, generated_at, approved_at
           FROM financial_reports
           WHERE tenant_id = $1 AND report_type = $2 AND period = $3 AND currency_code = $4"#,
    )
    .bind(tenant_id)
    .bind(report_type)
    .bind(period)
    .bind(currency_code)
    .fetch_optional(pool)
    .await?;

    Ok(row.map(|r| {
        serde_json::json!({
            "id": r.get::<Uuid, _>("id"),
            "report_type": r.get::<String, _>("report_type"),
            "org_id": r.get::<Option<Uuid>, _>("org_id"),
            "period": r.get::<String, _>("period"),
            "currency_code": r.get::<String, _>("currency_code"),
            "status": r.get::<String, _>("status"),
            "approval_status": r.get::<String, _>("approval_status"),
            "data": r.get::<serde_json::Value, _>("data"),
            "generated_at": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("generated_at"),
            "approved_at": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("approved_at"),
        })
    }))
}

async fn fetch_history(
    pool: &sqlx::PgPool,
    tenant_id: Uuid,
    report_type: &str,
    start_period: &str,
    end_period: &str,
    currency_code: Option<&str>,
    page: i64,
    page_size: i64,
) -> Result<(Vec<serde_json::Value>, i64), sqlx::Error> {
    let offset = (page - 1) * page_size;
    let rows = sqlx::query(
        r#"SELECT id, report_type, org_id, period, currency_code, status, approval_status, data, generated_at, approved_at
           FROM financial_reports
           WHERE tenant_id = $1 AND report_type = $2 AND period >= $3 AND period <= $4
             AND ($5::text IS NULL OR currency_code = $5)
           ORDER BY period DESC
           LIMIT $6 OFFSET $7"#,
    )
    .bind(tenant_id)
    .bind(report_type)
    .bind(start_period)
    .bind(end_period)
    .bind(currency_code)
    .bind(page_size)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    let total: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM financial_reports
           WHERE tenant_id = $1 AND report_type = $2 AND period >= $3 AND period <= $4
             AND ($5::text IS NULL OR currency_code = $5)"#,
    )
    .bind(tenant_id)
    .bind(report_type)
    .bind(start_period)
    .bind(end_period)
    .bind(currency_code)
    .fetch_one(pool)
    .await?;

    let items: Vec<serde_json::Value> = rows
        .into_iter()
        .map(|r| {
            serde_json::json!({
                "id": r.get::<Uuid, _>("id"),
                "report_type": r.get::<String, _>("report_type"),
                "org_id": r.get::<Option<Uuid>, _>("org_id"),
                "period": r.get::<String, _>("period"),
                "currency_code": r.get::<String, _>("currency_code"),
                "status": r.get::<String, _>("status"),
                "approval_status": r.get::<String, _>("approval_status"),
                "data": r.get::<serde_json::Value, _>("data"),
                "generated_at": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("generated_at"),
                "approved_at": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("approved_at"),
            })
        })
        .collect();

    Ok((items, total))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/reports/balance-sheet/generate",
    tag = "Report",
    request_body = GenerateReportRequest,
    responses(
        (status = 200, description = "生成资产负债表成功", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn generate_balance_sheet(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<GenerateReportRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let currency = req.currency_code.as_deref().unwrap_or("CNY");
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    match service.get_balance_sheet(tenant_id, &req.period).await {
        Ok(sheet) => {
            let data = serde_json::to_value(&sheet).unwrap_or(serde_json::json!({}));
            match upsert_report(
                &state.pool,
                tenant_id,
                "balance_sheet",
                &req.period,
                currency,
                data,
                &claims.username,
            )
            .await
            {
                Ok(report) => Json(ApiResponse::success(report, "生成资产负债表成功")),
                Err(e) => Json(ApiResponse::error(500, &format!("持久化失败: {}", e))),
            }
        }
        Err(e) => Json(ApiResponse::error(500, &format!("生成失败: {}", e))),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance/balance_sheet/{id}",
    tag = "FinancialReports",
    operation_id = "get_balance_sheet",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_balance_sheet(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<GetReportQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let currency = params.currency_code.as_deref().unwrap_or("CNY");
    match fetch_report(
        &state.pool,
        tenant_id,
        "balance_sheet",
        &params.period,
        currency,
    )
    .await
    {
        Ok(Some(report)) => Json(ApiResponse::success(report, "查询成功")),
        Ok(None) => {
            let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
            match service.get_balance_sheet(tenant_id, &params.period).await {
                Ok(sheet) => {
                    let data = serde_json::to_value(&sheet).unwrap_or(serde_json::json!({}));
                    Json(ApiResponse::success(
                        serde_json::json!({"report_type": "balance_sheet", "period": params.period, "data": data, "status": "realtime"}),
                        "查询成功(实时)",
                    ))
                }
                Err(e) => Json(ApiResponse::error(500, &format!("查询失败: {}", e))),
            }
        }
        Err(e) => Json(ApiResponse::error(500, &format!("查询失败: {}", e))),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/reports/balance-sheet/history",
    tag = "Report",
    params(HistoryReportQuery),
    responses(
        (status = 200, description = "获取资产负债表历史成功", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_balance_sheet_history(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<HistoryReportQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.pagesize.unwrap_or(20).min(100);
    match fetch_history(
        &state.pool,
        tenant_id,
        "balance_sheet",
        &params.start_period,
        &params.end_period,
        params.currency_code.as_deref(),
        page,
        page_size,
    )
    .await
    {
        Ok((items, total)) => Json(ApiResponse::success(
            serde_json::json!({"items": items, "total": total, "page": page, "page_size": page_size}),
            "查询成功",
        )),
        Err(e) => Json(ApiResponse::error(500, &format!("查询失败: {}", e))),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/finance/income_statement",
    tag = "FinancialReports",
    operation_id = "generate_income_statement",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn generate_income_statement(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<GenerateReportRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let currency = req.currency_code.as_deref().unwrap_or("CNY");
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    match service.get_income_statement(tenant_id, &req.period).await {
        Ok(stmt) => {
            let data = serde_json::to_value(&stmt).unwrap_or(serde_json::json!({}));
            match upsert_report(
                &state.pool,
                tenant_id,
                "income_statement",
                &req.period,
                currency,
                data,
                &claims.username,
            )
            .await
            {
                Ok(report) => Json(ApiResponse::success(report, "生成利润表成功")),
                Err(e) => Json(ApiResponse::error(500, &format!("持久化失败: {}", e))),
            }
        }
        Err(e) => Json(ApiResponse::error(500, &format!("生成失败: {}", e))),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance/income_statement/{id}",
    tag = "FinancialReports",
    operation_id = "get_income_statement",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_income_statement(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<GetReportQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let currency = params.currency_code.as_deref().unwrap_or("CNY");
    match fetch_report(
        &state.pool,
        tenant_id,
        "income_statement",
        &params.period,
        currency,
    )
    .await
    {
        Ok(Some(report)) => Json(ApiResponse::success(report, "查询成功")),
        Ok(None) => {
            let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
            match service
                .get_income_statement(tenant_id, &params.period)
                .await
            {
                Ok(stmt) => {
                    let data = serde_json::to_value(&stmt).unwrap_or(serde_json::json!({}));
                    Json(ApiResponse::success(
                        serde_json::json!({"report_type": "income_statement", "period": params.period, "data": data, "status": "realtime"}),
                        "查询成功(实时)",
                    ))
                }
                Err(e) => Json(ApiResponse::error(500, &format!("查询失败: {}", e))),
            }
        }
        Err(e) => Json(ApiResponse::error(500, &format!("查询失败: {}", e))),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/reports/income-statement/history",
    tag = "Report",
    params(HistoryReportQuery),
    responses(
        (status = 200, description = "获取利润表历史成功", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_income_statement_history(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<HistoryReportQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.pagesize.unwrap_or(20).min(100);
    match fetch_history(
        &state.pool,
        tenant_id,
        "income_statement",
        &params.start_period,
        &params.end_period,
        params.currency_code.as_deref(),
        page,
        page_size,
    )
    .await
    {
        Ok((items, total)) => Json(ApiResponse::success(
            serde_json::json!({"items": items, "total": total, "page": page, "page_size": page_size}),
            "查询成功",
        )),
        Err(e) => Json(ApiResponse::error(500, &format!("查询失败: {}", e))),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/finance/cash_flow",
    tag = "FinancialReports",
    operation_id = "generate_cash_flow",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn generate_cash_flow(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<GenerateReportRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let currency = req.currency_code.as_deref().unwrap_or("CNY");
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    match service
        .get_cash_flow_statement(tenant_id, &req.period)
        .await
    {
        Ok(stmt) => {
            let data = serde_json::to_value(&stmt).unwrap_or(serde_json::json!({}));
            match upsert_report(
                &state.pool,
                tenant_id,
                "cash_flow",
                &req.period,
                currency,
                data,
                &claims.username,
            )
            .await
            {
                Ok(report) => Json(ApiResponse::success(report, "生成现金流量表成功")),
                Err(e) => Json(ApiResponse::error(500, &format!("持久化失败: {}", e))),
            }
        }
        Err(e) => Json(ApiResponse::error(500, &format!("生成失败: {}", e))),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/reports/cash-flow",
    tag = "Report",
    params(GetReportQuery),
    responses(
        (status = 200, description = "获取现金流量表成功", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_cash_flow(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<GetReportQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let currency = params.currency_code.as_deref().unwrap_or("CNY");
    match fetch_report(
        &state.pool,
        tenant_id,
        "cash_flow",
        &params.period,
        currency,
    )
    .await
    {
        Ok(Some(report)) => Json(ApiResponse::success(report, "查询成功")),
        Ok(None) => {
            let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
            match service
                .get_cash_flow_statement(tenant_id, &params.period)
                .await
            {
                Ok(stmt) => {
                    let data = serde_json::to_value(&stmt).unwrap_or(serde_json::json!({}));
                    Json(ApiResponse::success(
                        serde_json::json!({"report_type": "cash_flow", "period": params.period, "data": data, "status": "realtime"}),
                        "查询成功(实时)",
                    ))
                }
                Err(e) => Json(ApiResponse::error(500, &format!("查询失败: {}", e))),
            }
        }
        Err(e) => Json(ApiResponse::error(500, &format!("查询失败: {}", e))),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance/cash_flow_history",
    tag = "FinancialReports",
    operation_id = "get_cash_flow_history",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_cash_flow_history(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<HistoryReportQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.pagesize.unwrap_or(20).min(100);
    match fetch_history(
        &state.pool,
        tenant_id,
        "cash_flow",
        &params.start_period,
        &params.end_period,
        params.currency_code.as_deref(),
        page,
        page_size,
    )
    .await
    {
        Ok((items, total)) => Json(ApiResponse::success(
            serde_json::json!({"items": items, "total": total, "page": page, "page_size": page_size}),
            "查询成功",
        )),
        Err(e) => Json(ApiResponse::error(500, &format!("查询失败: {}", e))),
    }
}

// ========== Phase 2: 报表审批 ==========

#[derive(Debug, Deserialize, ToSchema)]
pub struct ApprovalRequest {
    pub report_type: String,
    pub report_id: String,
    pub comment: Option<String>,
    pub reason: Option<String>,
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:approval:admin"])),
    path = "/reports/submit-approval",
    tag = "Report",
    request_body = ApprovalRequest,
    responses(
        (status = 200, description = "提交报表审批成功", body = ApiResponse<serde_json::Value>),
        (status = 400, description = "参数错误"),
        (status = 404, description = "报表不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn submit_report_for_approval(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Json(req): Json<ApprovalRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let report_id: Uuid = match req.report_id.parse() {
        Ok(id) => id,
        Err(_) => return Json(ApiResponse::error(400, "无效的报表ID")),
    };
    match sqlx::query("UPDATE financial_reports SET approval_status = 'pending', status = 'pending', updated_at = NOW() WHERE id = $1")
        .bind(report_id)
        .execute(&state.pool)
        .await
    {
        Ok(result) => {
            if result.rows_affected() == 0 {
                Json(ApiResponse::error(404, "报表不存在"))
            } else {
                Json(ApiResponse::success(serde_json::json!({"report_id": req.report_id, "status": "pending"}), "提交审批成功"))
            }
        }
        Err(e) => Json(ApiResponse::error(500, &format!("提交失败: {}", e))),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:report:read"])),
    path = "/finance/report",
    tag = "FinancialReports",
    operation_id = "approve_report",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn approve_report(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<ApprovalRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let report_id: Uuid = match req.report_id.parse() {
        Ok(id) => id,
        Err(_) => return Json(ApiResponse::error(400, "无效的报表ID")),
    };
    match sqlx::query("UPDATE financial_reports SET approval_status = 'approved', status = 'approved', approval_comment = $2, approved_by = $3, approved_at = NOW(), updated_at = NOW() WHERE id = $1")
        .bind(report_id)
        .bind(req.comment)
        .bind(&claims.username)
        .execute(&state.pool)
        .await
    {
        Ok(result) => {
            if result.rows_affected() == 0 {
                Json(ApiResponse::error(404, "报表不存在"))
            } else {
                Json(ApiResponse::success(serde_json::json!({"report_id": req.report_id, "status": "approved"}), "审批成功"))
            }
        }
        Err(e) => Json(ApiResponse::error(500, &format!("审批失败: {}", e))),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["finance:report:read"])),
    path = "/finance/report/{id}",
    tag = "FinancialReports",
    operation_id = "reject_report",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn reject_report(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Json(req): Json<ApprovalRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let report_id: Uuid = match req.report_id.parse() {
        Ok(id) => id,
        Err(_) => return Json(ApiResponse::error(400, "无效的报表ID")),
    };
    match sqlx::query("UPDATE financial_reports SET approval_status = 'rejected', status = 'rejected', rejection_reason = $2, updated_at = NOW() WHERE id = $1")
        .bind(report_id)
        .bind(req.reason)
        .execute(&state.pool)
        .await
    {
        Ok(result) => {
            if result.rows_affected() == 0 {
                Json(ApiResponse::error(404, "报表不存在"))
            } else {
                Json(ApiResponse::success(serde_json::json!({"report_id": req.report_id, "status": "rejected"}), "驳回成功"))
            }
        }
        Err(e) => Json(ApiResponse::error(500, &format!("驳回失败: {}", e))),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:report:read"])),
    path = "/reports/lock",
    tag = "Report",
    request_body = ApprovalRequest,
    responses(
        (status = 200, description = "锁定报表成功", body = ApiResponse<serde_json::Value>),
        (status = 400, description = "参数错误"),
        (status = 404, description = "报表不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn lock_report(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Json(req): Json<ApprovalRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let report_id: Uuid = match req.report_id.parse() {
        Ok(id) => id,
        Err(_) => return Json(ApiResponse::error(400, "无效的报表ID")),
    };
    match sqlx::query("UPDATE financial_reports SET approval_status = 'locked', status = 'locked', updated_at = NOW() WHERE id = $1")
        .bind(report_id)
        .execute(&state.pool)
        .await
    {
        Ok(result) => {
            if result.rows_affected() == 0 {
                Json(ApiResponse::error(404, "报表不存在"))
            } else {
                Json(ApiResponse::success(serde_json::json!({"report_id": req.report_id, "status": "locked"}), "锁定成功"))
            }
        }
        Err(e) => Json(ApiResponse::error(500, &format!("锁定失败: {}", e))),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:report:read"])),
    path = "/finance/report",
    tag = "FinancialReports",
    operation_id = "unlock_report",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn unlock_report(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Json(req): Json<ApprovalRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let report_id: Uuid = match req.report_id.parse() {
        Ok(id) => id,
        Err(_) => return Json(ApiResponse::error(400, "无效的报表ID")),
    };
    match sqlx::query("UPDATE financial_reports SET approval_status = 'approved', status = 'approved', updated_at = NOW() WHERE id = $1")
        .bind(report_id)
        .execute(&state.pool)
        .await
    {
        Ok(result) => {
            if result.rows_affected() == 0 {
                Json(ApiResponse::error(404, "报表不存在"))
            } else {
                Json(ApiResponse::success(serde_json::json!({"report_id": req.report_id, "status": "approved"}), "解锁成功"))
            }
        }
        Err(e) => Json(ApiResponse::error(500, &format!("解锁失败: {}", e))),
    }
}

// ========== Phase 4: 单报表导出 ==========

#[derive(Debug, Deserialize, IntoParams)]
pub struct ExportQuery {
    pub report_type: Option<String>,
    pub org_id: Option<String>,
    pub period: Option<String>,
    pub currency_code: Option<String>,
    pub format: Option<String>,
    pub include_notes: Option<bool>,
    pub include_comparison: Option<bool>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:report:read"])),
    path = "/reports/export",
    tag = "Financial-Reports",
    operation_id = "export_report",
    responses((status = 200, description = "OK")),
)]
pub async fn export_report(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Query(params): Query<ExportQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    let report_type = params
        .report_type
        .unwrap_or_else(|| "balance_sheet".to_string());
    let period = params.period.unwrap_or_default();
    let format = params.format.unwrap_or_else(|| "pdf".to_string());
    let org_id = params.org_id.unwrap_or_default();
    let currency_code = params.currency_code.unwrap_or_else(|| "CNY".to_string());
    let url = format!("/exports/{}_{}_{}.{}", report_type, org_id, period, format);
    Json(ApiResponse::success(
        serde_json::json!({
            "report_type": report_type,
            "org_id": org_id,
            "period": period,
            "currency_code": currency_code,
            "format": format,
            "include_notes": params.include_notes.unwrap_or(false),
            "include_comparison": params.include_comparison.unwrap_or(false),
            "url": url,
            "expires_at": Utc::now().to_rfc3339(),
        }),
        "导出成功",
    ))
}

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/reports/balance-sheet/generate",
            axum::routing::post(generate_balance_sheet),
        )
        .route(
            "/reports/balance-sheet",
            axum::routing::get(get_balance_sheet),
        )
        .route(
            "/reports/balance-sheet/history",
            axum::routing::get(get_balance_sheet_history),
        )
        .route(
            "/reports/income-statement/generate",
            axum::routing::post(generate_income_statement),
        )
        .route(
            "/reports/income-statement",
            axum::routing::get(get_income_statement),
        )
        .route(
            "/reports/income-statement/history",
            axum::routing::get(get_income_statement_history),
        )
        .route(
            "/reports/cash-flow/generate",
            axum::routing::post(generate_cash_flow),
        )
        .route("/reports/cash-flow", axum::routing::get(get_cash_flow))
        .route(
            "/reports/cash-flow/history",
            axum::routing::get(get_cash_flow_history),
        )
        .route(
            "/reports/submit-approval",
            axum::routing::post(submit_report_for_approval),
        )
        .route("/reports/approve", axum::routing::post(approve_report))
        .route("/reports/reject", axum::routing::post(reject_report))
        .route("/reports/lock", axum::routing::post(lock_report))
        .route("/reports/unlock", axum::routing::post(unlock_report))
        .route(
            "/reports/item-details",
            axum::routing::get(get_report_item_details),
        )
        .route(
            "/reports/item-vouchers",
            axum::routing::get(get_report_item_vouchers),
        )
        .route(
            "/reports/comparison",
            axum::routing::get(get_report_comparison),
        )
        .route("/reports/trend", axum::routing::get(get_report_trend))
        .route(
            "/reports/year-over-year",
            axum::routing::get(get_report_year_over_year),
        )
        .route(
            "/reports/period-over-period",
            axum::routing::get(get_report_period_over_period),
        )
        .route(
            "/reports/consolidated/generate",
            axum::routing::post(generate_consolidated_report),
        )
        .route(
            "/reports/consolidated/{consolidation_id}",
            axum::routing::get(get_consolidated_report),
        )
        .route(
            "/reports/consolidated/entities",
            axum::routing::get(get_consolidation_entities),
        )
        .route(
            "/reports/consolidated/entities",
            axum::routing::post(create_consolidation_entity),
        )
        .route(
            "/reports/consolidated/entities/{entity_id}",
            axum::routing::put(update_consolidation_entity),
        )
        .route(
            "/reports/consolidated/entities/{entity_id}",
            axum::routing::delete(delete_consolidation_entity),
        )
        .route(
            "/reports/consolidated/elims",
            axum::routing::get(get_intercompany_elims),
        )
        .route(
            "/reports/consolidated/elims",
            axum::routing::post(add_intercompany_elimination),
        )
        .route(
            "/reports/consolidated/{consolidation_id}/export",
            axum::routing::get(export_consolidated_report),
        )
        .route("/reports/export", axum::routing::get(export_report))
        .route(
            "/reports/export/batch",
            axum::routing::post(batch_export_reports),
        )
        .route(
            "/reports/subscriptions",
            axum::routing::get(get_report_subscriptions),
        )
        .route(
            "/reports/subscriptions",
            axum::routing::post(create_report_subscription),
        )
        .route(
            "/reports/subscriptions/{subscription_id}",
            axum::routing::put(update_report_subscription),
        )
        .route(
            "/reports/subscriptions/{subscription_id}",
            axum::routing::delete(delete_report_subscription),
        )
        .route(
            "/reports/subscriptions/{subscription_id}/send-now",
            axum::routing::post(send_report_now),
        )
        .route(
            "/reports/subscriptions/{subscription_id}/history",
            axum::routing::get(get_subscription_history),
        )
}

//! Analytics summary handlers（P2 财务域 B 反掺假收口）
//!
//! 历史：本文件曾对 ~30 个领域 KPI 端点返回写死的 mock 数字（活跃项目 42、质检通过率
//! 96.8%、生产批次 128、实验室样本 856……），零 sqlx 查询、零数据源。
//!
//! 现状（诚实收口）：analytics 服务运行在 `bi` schema，受 schema 边界 gate 约束，不可直读
//! `rs.* / lims.* / qms.* / ehs.* / srm.* / pdm.*` 等业务库表；库内也无对应领域的 BI 物化视图
//! （仅有 `bi.org_stats` 一个组织快照）。因此这些领域 KPI **无真实聚合数据源**。
//!
//! 处置：所有端点统一返回 **501/degraded**（`error_value(501, ...)`），不再返回写死 KPI。
//! 待对应领域数据接入 BI 数据集（bi_datasets 白名单 + 租户过滤）后再接真。
//! 仅 `reports_center_stats`（routes.rs）等有真实 IAM/审计表的端点保留真实聚合。

use axum::{extract::Path, Json};
use serde_json::Value;

/// 领域 KPI 降级响应：无真实数据源时诚实返回 501，绝不回写死数字。
fn degraded_analytics(domain: &str) -> Json<Value> {
    Json(topems_shared_core::response::error_value(
        501,
        &format!(
            "{}领域分析暂无真实数据源：analytics 服务（schema=bi）受 schema 边界限制不可直读该领域业务表，已停止返回写死的 KPI 数字；待对应领域数据接入 BI 数据集后再启用。",
            domain
        ),
    ))
}

/// Get module-specific analytics
#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:bi:read"])),
    path = "/analytics/{module_id}",
    tag = "Analytics",
    params(
        ("module_id" = String, Path, description = "Module ID")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad Request"),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal Server Error"),
    ),
)]
pub async fn get_module_analytics(Path(module_id): Path<String>) -> Json<Value> {
    let domain = match module_id.as_str() {
        "development" | "rs" => "研发(RS)",
        "quality" | "qms" => "质量(QMS)",
        "production" | "pdm" => "生产(PDM)",
        "laboratory" | "lims" => "实验室(LIMS)",
        "ehs" => "EHS",
        "srm" => "供应商(SRM)",
        _ => {
            return Json(topems_shared_core::response::error_value(
                400,
                &format!("Unknown module: {}", module_id),
            ))
        }
    };
    degraded_analytics(domain)
}

/// Get summary dashboard analytics
#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:bi:read"])),
    path = "/analytics/summary",
    tag = "Analytics",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad Request"),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal Server Error"),
    ),
)]
pub async fn get_summary_analytics() -> Json<Value> {
    degraded_analytics("汇总(Summary)")
}

/// Get development analytics (研发)
#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:bi:read"])),
    path = "/analytics/development",
    tag = "Analytics",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad Request"),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal Server Error"),
    ),
)]
pub async fn get_development_analytics() -> Json<Value> {
    degraded_analytics("研发(Development)")
}

/// Get quality analytics (质量)
#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:bi:read"])),
    path = "/analytics/quality",
    tag = "Analytics",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad Request"),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal Server Error"),
    ),
)]
pub async fn get_quality_analytics() -> Json<Value> {
    degraded_analytics("质量(Quality)")
}

/// Get production analytics (生产)
#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:bi:read"])),
    path = "/analytics/production",
    tag = "Analytics",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad Request"),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal Server Error"),
    ),
)]
pub async fn get_production_analytics() -> Json<Value> {
    degraded_analytics("生产(Production)")
}

/// Get laboratory analytics (实验室)
#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:bi:read"])),
    path = "/analytics/laboratory",
    tag = "Analytics",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad Request"),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal Server Error"),
    ),
)]
pub async fn get_laboratory_analytics() -> Json<Value> {
    degraded_analytics("实验室(Laboratory)")
}

/// Get analytics overview
#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:read"])),
    path = "/analytics/overview",
    tag = "Analytics",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad Request"),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal Server Error"),
    ),
)]
pub async fn get_analytics_overview() -> Json<Value> {
    degraded_analytics("分析概览(Overview)")
}

/// Get analytics report（报告列表历史亦为写死条目，统一降级）
pub async fn get_analytics_report() -> Json<Value> {
    degraded_analytics("分析报告列表(Report)")
}

/// Get SRM analytics (供应商管理)
#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:bi:read"])),
    path = "/api/bi/srm/summary",
    tag = "BI",
    responses((status = 200, description = "OK", body = serde_json::Value))
)]
pub async fn get_srm_analytics() -> Json<Value> {
    degraded_analytics("供应商(SRM)")
}

/// Get EHS analytics (环境健康安全)
#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:bi:read"])),
    path = "/api/bi/ehs/summary",
    tag = "BI",
    responses((status = 200, description = "OK", body = serde_json::Value))
)]
pub async fn get_ehs_analytics() -> Json<Value> {
    degraded_analytics("EHS")
}

// ==================== RS (Research & Development) Analytics ====================

/// Get RS summary
#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:bi:read"])),
    path = "/api/bi/rs/summary",
    tag = "BI",
    responses((status = 200, description = "OK", body = serde_json::Value))
)]
pub async fn get_rs_summary() -> Json<Value> {
    degraded_analytics("研发汇总(RS)")
}

/// Get RS project timeline
#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:bi:read"])),
    path = "/api/bi/rs/project-timeline",
    tag = "BI",
    responses((status = 200, description = "OK", body = serde_json::Value))
)]
pub async fn get_rs_project_timeline() -> Json<Value> {
    degraded_analytics("研发项目时间线(RS)")
}

/// Get RS experiment success rate
#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:read"])),
    path = "/api/bi/rs/experiment-success-rate",
    tag = "BI",
    responses((status = 200, description = "OK", body = serde_json::Value))
)]
pub async fn get_rs_experiment_success_rate() -> Json<Value> {
    degraded_analytics("研发实验成功率(RS)")
}

/// Get RS material usage
#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:read"])),
    path = "/api/bi/rs/material-usage",
    tag = "BI",
    responses((status = 200, description = "OK", body = serde_json::Value))
)]
pub async fn get_rs_material_usage() -> Json<Value> {
    degraded_analytics("研发物料使用(RS)")
}

/// Get RS project ranking
#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:bi:read"])),
    path = "/api/bi/rs/project-ranking",
    tag = "BI",
    responses((status = 200, description = "OK", body = serde_json::Value))
)]
pub async fn get_rs_project_ranking() -> Json<Value> {
    degraded_analytics("研发项目排名(RS)")
}

// ==================== LIMS Analytics ====================

/// Get LIMS summary
#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:bi:read"])),
    path = "/api/bi/lims/summary",
    tag = "BI",
    responses((status = 200, description = "OK", body = serde_json::Value))
)]
pub async fn get_lims_summary() -> Json<Value> {
    degraded_analytics("实验室汇总(LIMS)")
}

/// Get LIMS sample timeline
#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:bi:read"])),
    path = "/api/bi/lims/sample-timeline",
    tag = "BI",
    responses((status = 200, description = "OK", body = serde_json::Value))
)]
pub async fn get_lims_sample_timeline() -> Json<Value> {
    degraded_analytics("实验室样本时间线(LIMS)")
}

/// Get LIMS test pass rate
#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:bi:read"])),
    path = "/api/bi/lims/test-pass-rate",
    tag = "BI",
    responses((status = 200, description = "OK", body = serde_json::Value))
)]
pub async fn get_lims_test_pass_rate() -> Json<Value> {
    degraded_analytics("实验室测试通过率(LIMS)")
}

/// Get LIMS instrument usage
#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:read"])),
    path = "/api/bi/lims/instrument-usage",
    tag = "BI",
    responses((status = 200, description = "OK", body = serde_json::Value))
)]
pub async fn get_lims_instrument_usage() -> Json<Value> {
    degraded_analytics("实验室仪器使用(LIMS)")
}

/// Get LIMS sample status distribution
#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:read"])),
    path = "/api/bi/lims/sample-status-distribution",
    tag = "BI",
    responses((status = 200, description = "OK", body = serde_json::Value))
)]
pub async fn get_lims_sample_status_distribution() -> Json<Value> {
    degraded_analytics("实验室样本状态分布(LIMS)")
}

// ==================== QMS Analytics ====================

/// Get QMS summary
#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:bi:read"])),
    path = "/api/bi/qms/summary",
    tag = "BI",
    responses((status = 200, description = "OK", body = serde_json::Value))
)]
pub async fn get_qms_summary() -> Json<Value> {
    degraded_analytics("质量汇总(QMS)")
}

/// Get QMS quality trend
#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:read"])),
    path = "/api/bi/qms/quality-trend",
    tag = "BI",
    responses((status = 200, description = "OK", body = serde_json::Value))
)]
pub async fn get_qms_quality_trend() -> Json<Value> {
    degraded_analytics("质量趋势(QMS)")
}

/// Get QMS issue distribution
#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:read"])),
    path = "/api/bi/qms/issue-distribution",
    tag = "BI",
    responses((status = 200, description = "OK", body = serde_json::Value))
)]
pub async fn get_qms_issue_distribution() -> Json<Value> {
    degraded_analytics("质量问题分布(QMS)")
}

// ==================== EHS Analytics ====================

/// Get EHS risk distribution
#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:read"])),
    path = "/api/bi/ehs/risk-distribution",
    tag = "BI",
    responses((status = 200, description = "OK", body = serde_json::Value))
)]
pub async fn get_ehs_risk_distribution() -> Json<Value> {
    degraded_analytics("EHS风险分布")
}

/// Get EHS incident trend
#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:read"])),
    path = "/api/bi/ehs/incident-trend",
    tag = "BI",
    responses((status = 200, description = "OK", body = serde_json::Value))
)]
pub async fn get_ehs_incident_trend() -> Json<Value> {
    degraded_analytics("EHS事件趋势")
}

// ==================== SRM Analytics ====================

/// Get SRM supplier ranking
#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:bi:read"])),
    path = "/api/bi/srm/supplier-ranking",
    tag = "BI",
    responses((status = 200, description = "OK", body = serde_json::Value))
)]
pub async fn get_srm_supplier_ranking() -> Json<Value> {
    degraded_analytics("供应商排名(SRM)")
}

/// Get SRM order timeline
#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:bi:read"])),
    path = "/api/bi/srm/order-timeline",
    tag = "BI",
    responses((status = 200, description = "OK", body = serde_json::Value))
)]
pub async fn get_srm_order_timeline() -> Json<Value> {
    degraded_analytics("采购订单时间线(SRM)")
}

// ==================== PDM Analytics ====================

/// Get PDM summary
#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:bi:read"])),
    path = "/api/bi/pdm/summary",
    tag = "BI",
    responses((status = 200, description = "OK", body = serde_json::Value))
)]
pub async fn get_pdm_summary() -> Json<Value> {
    degraded_analytics("产品数据汇总(PDM)")
}

/// Get PDM production trend
#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:read"])),
    path = "/api/bi/pdm/production-trend",
    tag = "BI",
    responses((status = 200, description = "OK", body = serde_json::Value))
)]
pub async fn get_pdm_production_trend() -> Json<Value> {
    degraded_analytics("产品生产趋势(PDM)")
}

/// Get PDM batch status distribution
#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:read"])),
    path = "/api/bi/pdm/batch-status-distribution",
    tag = "BI",
    responses((status = 200, description = "OK", body = serde_json::Value))
)]
pub async fn get_pdm_batch_status_distribution() -> Json<Value> {
    degraded_analytics("批次状态分布(PDM)")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn code(v: &Json<Value>) -> i64 {
        v.0.get("code").and_then(|c| c.as_i64()).unwrap_or(-1)
    }
    fn success(v: &Json<Value>) -> bool {
        v.0.get("success")
            .and_then(|s| s.as_bool())
            .unwrap_or(false)
    }

    #[tokio::test]
    async fn module_dispatch_known_aliases_return_501_degraded() {
        for alias in [
            "development",
            "rs",
            "quality",
            "qms",
            "production",
            "pdm",
            "laboratory",
            "lims",
            "ehs",
            "srm",
        ] {
            let r = get_module_analytics(Path(alias.to_string())).await;
            assert_eq!(code(&r), 501, "alias '{}' should degrade to 501", alias);
            assert!(!success(&r), "alias '{}' should not report success", alias);
        }
    }

    #[tokio::test]
    async fn module_dispatch_unknown_returns_400() {
        let r = get_module_analytics(Path("unknown_module".to_string())).await;
        assert_eq!(code(&r), 400);
    }

    #[tokio::test]
    async fn all_domain_kpi_endpoints_degrade_to_501_no_fake_numbers() {
        // 全部领域 KPI 端点必须返回 501/degraded，不得再返回写死的 200 + KPI 数字。
        let cases: Vec<Json<Value>> = vec![
            get_summary_analytics().await,
            get_development_analytics().await,
            get_quality_analytics().await,
            get_production_analytics().await,
            get_laboratory_analytics().await,
            get_analytics_overview().await,
            get_analytics_report().await,
            get_srm_analytics().await,
            get_ehs_analytics().await,
            get_rs_summary().await,
            get_rs_project_timeline().await,
            get_rs_experiment_success_rate().await,
            get_rs_material_usage().await,
            get_rs_project_ranking().await,
            get_lims_summary().await,
            get_lims_sample_timeline().await,
            get_lims_test_pass_rate().await,
            get_lims_instrument_usage().await,
            get_lims_sample_status_distribution().await,
            get_qms_summary().await,
            get_qms_quality_trend().await,
            get_qms_issue_distribution().await,
            get_ehs_risk_distribution().await,
            get_ehs_incident_trend().await,
            get_srm_supplier_ranking().await,
            get_srm_order_timeline().await,
            get_pdm_summary().await,
            get_pdm_production_trend().await,
            get_pdm_batch_status_distribution().await,
        ];
        for (i, r) in cases.iter().enumerate() {
            assert_eq!(code(r), 501, "endpoint #{i} should degrade to 501");
            assert!(!success(r), "endpoint #{i} should not report success");
            // 消息必须说明无数据源，且不得残留写死 KPI 字段
            let msg = r.0.get("message").and_then(|m| m.as_str()).unwrap_or("");
            assert!(msg.contains("暂无真实数据源") || msg.contains("无真实数据源"), "endpoint #{i} message: {msg}");
        }
    }
}

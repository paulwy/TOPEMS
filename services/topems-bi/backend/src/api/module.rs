use axum::{
    extract::{Extension, Path, State},
    Json,
};
use chrono::Utc;
use serde_json::json;
use sqlx::PgPool;

use topems_shared::{ApiResponse, Claims};
use crate::services::permission::{check_permission, BIPermission};

/// 获取RS模块摘要数据
pub async fn get_rs_summary(
    State(_pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    Json(ApiResponse::success(json!({
        "summary": {
            "total_projects": 120,
            "active_projects": 45,
            "completed_projects": 75,
            "avg_duration": 45.5,
        },
        "generated_at": Utc::now().to_rfc3339(),
    }), "获取RS模块摘要数据成功"))
}

/// 获取RS项目时间线数据
pub async fn get_rs_project_timeline(
    State(_pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    Json(ApiResponse::success(json!({
        "timeline": [
            { "month": "1月", "count": 25 },
            { "month": "2月", "count": 30 },
            { "month": "3月", "count": 28 },
            { "month": "4月", "count": 35 },
            { "month": "5月", "count": 42 },
            { "month": "6月", "count": 38 },
        ],
        "generated_at": Utc::now().to_rfc3339(),
    }), "获取RS项目时间线数据成功"))
}

/// 获取RS实验成功率数据
pub async fn get_rs_experiment_success_rate(
    State(_pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    Json(ApiResponse::success(json!({
        "success_rate": [
            { "month": "1月", "rate": 85 },
            { "month": "2月", "rate": 88 },
            { "month": "3月", "rate": 90 },
            { "month": "4月", "rate": 87 },
            { "month": "5月", "rate": 92 },
            { "month": "6月", "rate": 95 },
        ],
        "avg_success_rate": 90.5,
        "generated_at": Utc::now().to_rfc3339(),
    }), "获取RS实验成功率数据成功"))
}

/// 获取LIMS模块摘要数据
pub async fn get_lims_summary(
    State(_pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    Json(ApiResponse::success(json!({
        "summary": {
            "total_samples": 2450,
            "completed_tests": 2150,
            "pending_tests": 180,
            "avg_turnaround": 48,
        },
        "generated_at": Utc::now().to_rfc3339(),
    }), "获取LIMS模块摘要数据成功"))
}

/// 获取LIMS样品时间线数据
pub async fn get_lims_sample_timeline(
    State(_pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    Json(ApiResponse::success(json!({
        "timeline": [
            { "month": "1月", "count": 420 },
            { "month": "2月", "count": 380 },
            { "month": "3月", "count": 450 },
            { "month": "4月", "count": 520 },
            { "month": "5月", "count": 480 },
            { "month": "6月", "count": 550 },
        ],
        "generated_at": Utc::now().to_rfc3339(),
    }), "获取LIMS样品时间线数据成功"))
}

/// 获取LIMS检验通过率数据
pub async fn get_lims_test_pass_rate(
    State(_pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    Json(ApiResponse::success(json!({
        "pass_rate": [
            { "month": "1月", "rate": 96.5 },
            { "month": "2月", "rate": 97.2 },
            { "month": "3月", "rate": 97.8 },
            { "month": "4月", "rate": 98.1 },
            { "month": "5月", "rate": 97.6 },
            { "month": "6月", "rate": 98.5 },
        ],
        "avg_pass_rate": 97.8,
        "generated_at": Utc::now().to_rfc3339(),
    }), "获取LIMS检验通过率数据成功"))
}

/// 获取QMS模块摘要数据
pub async fn get_qms_summary(
    State(_pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    Json(ApiResponse::success(json!({
        "summary": {
            "total_inspections": 3250,
            "passed": 3180,
            "failed": 70,
            "pass_rate": 97.8,
        },
        "generated_at": Utc::now().to_rfc3339(),
    }), "获取QMS模块摘要数据成功"))
}

/// 获取QMS质量趋势数据
pub async fn get_qms_quality_trend(
    State(_pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    Json(ApiResponse::success(json!({
        "quality_trend": [
            { "month": "1月", "rate": 96.5 },
            { "month": "2月", "rate": 97.2 },
            { "month": "3月", "rate": 97.8 },
            { "month": "4月", "rate": 98.1 },
            { "month": "5月", "rate": 97.6 },
            { "month": "6月", "rate": 97.8 },
        ],
        "generated_at": Utc::now().to_rfc3339(),
    }), "获取QMS质量趋势数据成功"))
}

/// 获取QMS问题分布数据
pub async fn get_qms_issue_distribution(
    State(_pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    Json(ApiResponse::success(json!({
        "distribution": [
            { "name": "合格", "value": 97.8 },
            { "name": "不合格", "value": 2.2 },
        ],
        "generated_at": Utc::now().to_rfc3339(),
    }), "获取QMS问题分布数据成功"))
}

/// 获取EHS模块摘要数据
pub async fn get_ehs_summary(
    State(_pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    Json(ApiResponse::success(json!({
        "summary": {
            "total_risks": 125,
            "high_risks": 15,
            "incidents": 18,
            "resolved": 110,
        },
        "generated_at": Utc::now().to_rfc3339(),
    }), "获取EHS模块摘要数据成功"))
}

/// 获取EHS风险分布数据
pub async fn get_ehs_risk_distribution(
    State(_pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    Json(ApiResponse::success(json!({
        "distribution": [
            { "name": "高风险", "value": 15 },
            { "name": "中风险", "value": 45 },
            { "name": "低风险", "value": 65 },
        ],
        "generated_at": Utc::now().to_rfc3339(),
    }), "获取EHS风险分布数据成功"))
}

/// 获取EHS事件趋势数据
pub async fn get_ehs_incident_trend(
    State(_pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    Json(ApiResponse::success(json!({
        "incident_trend": [
            { "month": "1月", "count": 3 },
            { "month": "2月", "count": 2 },
            { "month": "3月", "count": 4 },
            { "month": "4月", "count": 1 },
            { "month": "5月", "count": 2 },
            { "month": "6月", "count": 3 },
        ],
        "generated_at": Utc::now().to_rfc3339(),
    }), "获取EHS事件趋势数据成功"))
}

/// 获取SRM模块摘要数据
pub async fn get_srm_summary(
    State(_pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    Json(ApiResponse::success(json!({
        "summary": {
            "total_suppliers": 280,
            "qualified": 220,
            "avg_rating": 4.5,
            "pending_orders": 35,
        },
        "generated_at": Utc::now().to_rfc3339(),
    }), "获取SRM模块摘要数据成功"))
}

/// 获取SRM供应商排名数据
pub async fn get_srm_supplier_ranking(
    State(_pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    Json(ApiResponse::success(json!({
        "ranking": [
            { "name": "供应商A", "rating": 4.8, "orders": 120 },
            { "name": "供应商B", "rating": 4.6, "orders": 95 },
            { "name": "供应商C", "rating": 4.5, "orders": 88 },
            { "name": "供应商D", "rating": 4.3, "orders": 75 },
            { "name": "供应商E", "rating": 4.2, "orders": 62 },
        ],
        "generated_at": Utc::now().to_rfc3339(),
    }), "获取SRM供应商排名数据成功"))
}

/// 获取SRM订单时间线数据
pub async fn get_srm_order_timeline(
    State(_pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    Json(ApiResponse::success(json!({
        "timeline": [
            { "month": "1月", "count": 120 },
            { "month": "2月", "count": 135 },
            { "month": "3月", "count": 140 },
            { "month": "4月", "count": 155 },
            { "month": "5月", "count": 160 },
            { "month": "6月", "count": 180 },
        ],
        "generated_at": Utc::now().to_rfc3339(),
    }), "获取SRM订单时间线数据成功"))
}

/// 获取PDM模块摘要数据
pub async fn get_pdm_summary(
    State(_pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    Json(ApiResponse::success(json!({
        "summary": {
            "total_batches": 450,
            "completed": 415,
            "in_progress": 28,
            "efficiency": 92.5,
        },
        "generated_at": Utc::now().to_rfc3339(),
    }), "获取PDM模块摘要数据成功"))
}

/// 获取PDM生产趋势数据
pub async fn get_pdm_production_trend(
    State(_pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    Json(ApiResponse::success(json!({
        "production_trend": [
            { "month": "1月", "output": 1850 },
            { "month": "2月", "output": 2100 },
            { "month": "3月", "output": 1980 },
            { "month": "4月", "output": 2350 },
            { "month": "5月", "output": 2200 },
            { "month": "6月", "output": 2420 },
        ],
        "generated_at": Utc::now().to_rfc3339(),
    }), "获取PDM生产趋势数据成功"))
}

/// 获取PDM批次状态分布数据
pub async fn get_pdm_batch_status_distribution(
    State(_pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    Json(ApiResponse::success(json!({
        "distribution": [
            { "name": "已完成", "value": 415 },
            { "name": "进行中", "value": 28 },
            { "name": "已取消", "value": 7 },
        ],
        "generated_at": Utc::now().to_rfc3339(),
    }), "获取PDM批次状态分布数据成功"))
}

/// 获取模块详细数据
pub async fn get_module_detail(
    State(_pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(module_id): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    let module_data = match module_id.as_str() {
        "rs" => json!({
            "summary": {
                "total_projects": 120,
                "active_projects": 45,
                "completed_projects": 75,
                "avg_duration": 45.5,
            },
            "timeline": [
                { "month": "1月", "count": 25 },
                { "month": "2月", "count": 30 },
                { "month": "3月", "count": 28 },
                { "month": "4月", "count": 35 },
                { "month": "5月", "count": 42 },
                { "month": "6月", "count": 38 },
            ],
            "success_rate": [
                { "month": "1月", "rate": 85 },
                { "month": "2月", "rate": 88 },
                { "month": "3月", "rate": 90 },
                { "month": "4月", "rate": 87 },
                { "month": "5月", "rate": 92 },
                { "month": "6月", "rate": 95 },
            ],
            "distribution": [
                { "name": "研发", "value": 60 },
                { "name": "改进", "value": 30 },
                { "name": "创新", "value": 10 },
            ],
        }),
        "lims" => json!({
            "summary": {
                "total_samples": 2450,
                "completed_tests": 2150,
                "pending_tests": 180,
                "avg_turnaround": 48,
            },
            "timeline": [
                { "month": "1月", "count": 420 },
                { "month": "2月", "count": 380 },
                { "month": "3月", "count": 450 },
                { "month": "4月", "count": 520 },
                { "month": "5月", "count": 480 },
                { "month": "6月", "count": 550 },
            ],
            "pass_rate": [
                { "month": "1月", "rate": 96.5 },
                { "month": "2月", "rate": 97.2 },
                { "month": "3月", "rate": 97.8 },
                { "month": "4月", "rate": 98.1 },
                { "month": "5月", "rate": 97.6 },
                { "month": "6月", "rate": 98.5 },
            ],
            "distribution": [
                { "name": "化学检验", "value": 40 },
                { "name": "物理检验", "value": 30 },
                { "name": "微生物检验", "value": 20 },
                { "name": "其他", "value": 10 },
            ],
        }),
        "qms" => json!({
            "summary": {
                "total_inspections": 3250,
                "passed": 3180,
                "failed": 70,
                "pass_rate": 97.8,
            },
            "timeline": [
                { "month": "1月", "count": 520 },
                { "month": "2月", "count": 480 },
                { "month": "3月", "count": 550 },
                { "month": "4月", "count": 620 },
                { "month": "5月", "count": 580 },
                { "month": "6月", "count": 650 },
            ],
            "quality_trend": [
                { "month": "1月", "rate": 96.5 },
                { "month": "2月", "rate": 97.2 },
                { "month": "3月", "rate": 97.8 },
                { "month": "4月", "rate": 98.1 },
                { "month": "5月", "rate": 97.6 },
                { "month": "6月", "rate": 97.8 },
            ],
            "distribution": [
                { "name": "合格", "value": 97.8 },
                { "name": "不合格", "value": 2.2 },
            ],
        }),
        "ehs" => json!({
            "summary": {
                "total_risks": 125,
                "high_risks": 15,
                "incidents": 18,
                "resolved": 110,
            },
            "timeline": [
                { "month": "1月", "count": 15 },
                { "month": "2月", "count": 12 },
                { "month": "3月", "count": 18 },
                { "month": "4月", "count": 8 },
                { "month": "5月", "count": 10 },
                { "month": "6月", "count": 15 },
            ],
            "incident_trend": [
                { "month": "1月", "count": 3 },
                { "month": "2月", "count": 2 },
                { "month": "3月", "count": 4 },
                { "month": "4月", "count": 1 },
                { "month": "5月", "count": 2 },
                { "month": "6月", "count": 3 },
            ],
            "distribution": [
                { "name": "高风险", "value": 15 },
                { "name": "中风险", "value": 45 },
                { "name": "低风险", "value": 65 },
            ],
        }),
        "srm" => json!({
            "summary": {
                "total_suppliers": 280,
                "qualified": 220,
                "avg_rating": 4.5,
                "pending_orders": 35,
            },
            "timeline": [
                { "month": "1月", "count": 220 },
                { "month": "2月", "count": 235 },
                { "month": "3月", "count": 240 },
                { "month": "4月", "count": 245 },
                { "month": "5月", "count": 250 },
                { "month": "6月", "count": 280 },
            ],
            "order_trend": [
                { "month": "1月", "count": 120 },
                { "month": "2月", "count": 135 },
                { "month": "3月", "count": 140 },
                { "month": "4月", "count": 155 },
                { "month": "5月", "count": 160 },
                { "month": "6月", "count": 180 },
            ],
            "distribution": [
                { "name": "合格", "value": 220 },
                { "name": "待审核", "value": 45 },
                { "name": "不合格", "value": 15 },
            ],
        }),
        "pdm" => json!({
            "summary": {
                "total_batches": 450,
                "completed": 415,
                "in_progress": 28,
                "efficiency": 92.5,
            },
            "timeline": [
                { "month": "1月", "count": 1850 },
                { "month": "2月", "count": 2100 },
                { "month": "3月", "count": 1980 },
                { "month": "4月", "count": 2350 },
                { "month": "5月", "count": 2200 },
                { "month": "6月", "count": 2420 },
            ],
            "production_trend": [
                { "month": "1月", "rate": 88 },
                { "month": "2月", "rate": 90 },
                { "month": "3月", "rate": 92 },
                { "month": "4月", "rate": 95 },
                { "month": "5月", "rate": 93 },
                { "month": "6月", "rate": 92.5 },
            ],
            "distribution": [
                { "name": "已完成", "value": 415 },
                { "name": "进行中", "value": 28 },
                { "name": "已取消", "value": 7 },
            ],
        }),
        _ => json!({
            "error": "未知的模块ID",
        }),
    };

    Json(ApiResponse::success(module_data, "获取模块详细数据成功"))
}
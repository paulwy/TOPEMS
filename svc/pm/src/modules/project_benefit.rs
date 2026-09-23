use axum::{
    extract::{Extension, Path, State},
    routing::get,
    Json, Router,
};
use chrono::Utc;
use sqlx::PgPool;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::ApiResponse;
use uuid::Uuid;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::TenantContext;

use crate::models::project_benefit::{CreateBenefitRequest, ProjectBenefit};
use crate::modules::effective_tenant_id;

// ==================== Pure functions ====================

/// Calculates Return on Investment (ROI) as a percentage.
///
/// Formula: `(benefit - cost) / cost * 100`.
/// Returns `0.0` when `cost` is zero to avoid division by zero.
pub fn calculate_roi(benefit: f64, cost: f64) -> f64 {
    if cost == 0.0 {
        return 0.0;
    }
    (benefit - cost) / cost * 100.0
}

/// Calculates the payback period in months.
///
/// Formula: `initial_cost / monthly_savings`.
/// Returns `0.0` when `initial_cost` is zero or negative.
/// Returns `f64::INFINITY` when `monthly_savings` is zero or negative
/// (the investment never pays for itself).
pub fn calculate_payback_period(initial_cost: f64, monthly_savings: f64) -> f64 {
    if initial_cost <= 0.0 {
        return 0.0;
    }
    if monthly_savings <= 0.0 {
        return f64::INFINITY;
    }
    initial_cost / monthly_savings
}

pub fn create_routes(pool: PgPool) -> Router {
    Router::new()
        .route(
            "/projects/{project_id}/benefits",
            get(get_benefits).post(calculate_benefits),
        )
        .route(
            "/projects/{project_id}/benefits/analysis",
            get(get_analysis),
        )
        .with_state(pool)
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/projects/{project_id}/benefits",
    tag = "project_benefits",
    params(
        ("project_id" = Uuid, Path, description = "project_id")
    ),

    responses(
        (status = 200, description = "获取项目效益分析列表成功", body = ApiResponse<Vec<ProjectBenefit>>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn get_benefits(
    State(pool): State<PgPool>,
    Path(project_id): Path<Uuid>,
) -> Json<ApiResponse<Vec<ProjectBenefit>>> {
    let result = sqlx::query_as::<_, ProjectBenefit>(
        only_own_schema_query!("pm", "id, project_id, period_type, period_date, planned_cost, actual_cost, planned_progress, actual_progress, planned_value, actual_value, created_at, updated_at FROM pm.project_benefits WHERE project_id = $1 ORDER BY period_type ASC, period_date ASC")
    )
    .bind(project_id)
    .fetch_all(&pool)
    .await;

    match result {
        Ok(benefits) => Json(ApiResponse::success(benefits, "获取项目效益分析列表成功")),
        Err(e) => {
            tracing::error!("获取项目效益分析列表失败: {}", e);
            Json(ApiResponse::error(500, "获取项目效益分析列表失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/projects/{project_id}/benefits/analysis",
    tag = "project_benefits",
    params(
        ("project_id" = Uuid, Path, description = "project_id")
    ),

    responses(
        (status = 200, description = "获取项目效益综合分析成功", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn get_analysis(
    State(pool): State<PgPool>,
    Path(project_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let benefits_result = sqlx::query_as::<_, ProjectBenefit>(
        only_own_schema_query!("pm", "id, project_id, period_type, period_date, planned_cost, actual_cost, planned_progress, actual_progress, planned_value, actual_value, created_at, updated_at FROM pm.project_benefits WHERE project_id = $1"),
    )
    .bind(project_id)
    .fetch_all(&pool)
    .await;

    let benefits = match benefits_result {
        Ok(b) => b,
        Err(e) => {
            tracing::error!("获取效益数据失败: {}", e);
            return Json(ApiResponse::error(500, "获取效益数据失败"));
        }
    };

    let total_planned_cost: f64 = benefits.iter().map(|b| b.planned_cost).sum();
    let total_actual_cost: f64 = benefits.iter().map(|b| b.actual_cost).sum();
    let total_planned_value: f64 = benefits.iter().map(|b| b.planned_value).sum();
    let total_earned_value: f64 = benefits.iter().map(|b| b.earned_value).sum();
    let total_actual_cost_eva: f64 = benefits.iter().map(|b| b.actual_cost_eva).sum();

    let cpi = if total_actual_cost_eva > 0.0 {
        total_earned_value / total_actual_cost_eva
    } else {
        1.0
    };

    let spi = if total_planned_value > 0.0 {
        total_earned_value / total_planned_value
    } else {
        1.0
    };

    let cv = total_earned_value - total_actual_cost_eva;
    let sv = total_earned_value - total_planned_value;

    let eac = if cpi > 0.0 {
        total_planned_cost / cpi
    } else {
        total_planned_cost
    };

    let etc = eac - total_actual_cost;

    let roi = if total_actual_cost > 0.0 {
        ((total_earned_value - total_actual_cost) / total_actual_cost) * 100.0
    } else {
        0.0
    };

    let analysis = serde_json::json!({
        "summary": {
            "total_planned_cost": total_planned_cost,
            "total_actual_cost": total_actual_cost,
            "total_planned_value": total_planned_value,
            "total_earned_value": total_earned_value,
            "period_count": benefits.len(),
        },
        "eva": {
            "cpi": cpi,
            "spi": spi,
            "cv": cv,
            "sv": sv,
            "eac": eac,
            "etc": etc,
            "roi": roi,
        },
        "trend": {
            "cpi_status": if cpi >= 1.0 { "good" } else { "warning" },
            "spi_status": if spi >= 1.0 { "good" } else { "warning" },
            "cost_status": if total_actual_cost <= total_planned_cost { "under_budget" } else { "over_budget" },
        },
        "details": benefits.into_iter().map(|b| serde_json::json!({
            "period_type": b.period_type,
            "period_date": b.period_date,
            "cpi": b.cpi,
            "spi": b.spi,
            "cv": b.cv,
            "sv": b.sv,
        })).collect::<Vec<_>>(),
    });

    Json(ApiResponse::success(analysis, "获取项目效益综合分析成功"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["pm:write"])),
    path = "/projects/{project_id}/benefits",
    tag = "project_benefits",
    request_body = CreateBenefitRequest,
    params(
        ("project_id" = Uuid, Path, description = "project_id")
    ),

    responses(
        (status = 200, description = "计算项目效益分析成功", body = ApiResponse<ProjectBenefit>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn calculate_benefits(
    State(pool): State<PgPool>,
    Path(project_id): Path<Uuid>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateBenefitRequest>,
) -> Json<ApiResponse<ProjectBenefit>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let cpi = if req.actual_cost_eva > 0.0 {
        req.earned_value / req.actual_cost_eva
    } else {
        1.0
    };

    let spi = if req.planned_value > 0.0 {
        req.earned_value / req.planned_value
    } else {
        1.0
    };

    let cv = req.earned_value - req.actual_cost_eva;
    let sv = req.earned_value - req.planned_value;

    let eac = if cpi > 0.0 {
        req.planned_cost / cpi
    } else {
        req.planned_cost
    };

    let etc = eac - req.actual_cost;

    let roi = if req.actual_cost > 0.0 {
        ((req.earned_value - req.actual_cost) / req.actual_cost) * 100.0
    } else {
        0.0
    };

    let result = sqlx::query_as::<_, ProjectBenefit>(
        only_own_schema_query!("pm", r#"
        INSERT INTO pm.project_benefits (
            id, project_id, period_type, period_date,
            planned_cost, actual_cost, planned_progress, actual_progress,
            planned_value, earned_value, actual_cost_eva,
            cpi, spi, cv, sv, eac, etc, roi, notes,
            created_by, created_at, updated_at, tenant_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
        ON CONFLICT (project_id, period_type, period_date) DO UPDATE SET
            planned_cost = EXCLUDED.planned_cost,
            actual_cost = EXCLUDED.actual_cost,
            planned_progress = EXCLUDED.planned_progress,
            actual_progress = EXCLUDED.actual_progress,
            planned_value = EXCLUDED.planned_value,
            earned_value = EXCLUDED.earned_value,
            actual_cost_eva = EXCLUDED.actual_cost_eva,
            cpi = EXCLUDED.cpi,
            spi = EXCLUDED.spi,
            cv = EXCLUDED.cv,
            sv = EXCLUDED.sv,
            eac = EXCLUDED.eac,
            etc = EXCLUDED.etc,
            roi = EXCLUDED.roi,
            notes = EXCLUDED.notes,
            updated_at = EXCLUDED.updated_at
        RETURNING *
        "#),
    )
    .bind(id)
    .bind(project_id)
    .bind(&req.period_type)
    .bind(req.period_date)
    .bind(req.planned_cost)
    .bind(req.actual_cost)
    .bind(req.planned_progress)
    .bind(req.actual_progress)
    .bind(req.planned_value)
    .bind(req.earned_value)
    .bind(req.actual_cost_eva)
    .bind(cpi)
    .bind(spi)
    .bind(cv)
    .bind(sv)
    .bind(eac)
    .bind(etc)
    .bind(roi)
    .bind(&req.notes)
    .bind(&req.created_by)
    .bind(effective_tenant_id(&ctx, &claims))
    .bind(now)
    .bind(effective_tenant_id(&ctx, &claims))
    .fetch_one(&pool)
    .await;

    match result {
        Ok(benefit) => Json(ApiResponse::success(benefit, "计算项目效益分析成功")),
        Err(e) => {
            tracing::error!("计算项目效益分析失败: {}", e);
            Json(ApiResponse::error(500, "计算项目效益分析失败"))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ---- calculate_roi ----

    #[test]
    fn test_roi_positive_return() {
        // benefit=150, cost=100 -> ROI = 50%
        assert!((calculate_roi(150.0, 100.0) - 50.0).abs() < 1e-9);
    }

    #[test]
    fn test_roi_negative_return() {
        // benefit=80, cost=100 -> ROI = -20%
        assert!((calculate_roi(80.0, 100.0) - (-20.0)).abs() < 1e-9);
    }

    #[test]
    fn test_roi_break_even() {
        assert!((calculate_roi(100.0, 100.0) - 0.0).abs() < 1e-9);
    }

    #[test]
    fn test_roi_zero_cost() {
        assert_eq!(calculate_roi(100.0, 0.0), 0.0);
    }

    #[test]
    fn test_roi_double_return() {
        // benefit=200, cost=100 -> ROI = 100%
        assert!((calculate_roi(200.0, 100.0) - 100.0).abs() < 1e-9);
    }

    #[test]
    fn test_roi_zero_benefit() {
        // benefit=0, cost=100 -> ROI = -100%
        assert!((calculate_roi(0.0, 100.0) - (-100.0)).abs() < 1e-9);
    }

    // ---- calculate_payback_period ----

    #[test]
    fn test_payback_simple() {
        // 12000 cost, 1000/month -> 12 months
        assert!((calculate_payback_period(12000.0, 1000.0) - 12.0).abs() < 1e-9);
    }

    #[test]
    fn test_payback_exact_one_month() {
        assert!((calculate_payback_period(1000.0, 1000.0) - 1.0).abs() < 1e-9);
    }

    #[test]
    fn test_payback_zero_cost() {
        assert_eq!(calculate_payback_period(0.0, 1000.0), 0.0);
    }

    #[test]
    fn test_payback_negative_cost() {
        assert_eq!(calculate_payback_period(-500.0, 1000.0), 0.0);
    }

    #[test]
    fn test_payback_zero_savings_is_infinity() {
        assert!(calculate_payback_period(10000.0, 0.0).is_infinite());
    }

    #[test]
    fn test_payback_negative_savings_is_infinity() {
        assert!(calculate_payback_period(10000.0, -100.0).is_infinite());
    }

    #[test]
    fn test_payback_fractional_months() {
        // 10000 cost, 3000/month -> 3.333... months
        let result = calculate_payback_period(10000.0, 3000.0);
        assert!((result - 3.333_333_333_333_3335).abs() < 1e-9);
    }
}

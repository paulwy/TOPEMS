use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::get,
    Json, Router,
};
use chrono::Utc;
use sqlx::PgPool;
use topems_shared_core::response::ApiResponse;
use uuid::Uuid;

use crate::models::risk::{
    CreateRiskEventRequest, CreateRiskRequest, ProjectRisk, RiskEvent, UpdateRiskRequest,
};

// ==================== Pure functions ====================

/// Calculates a risk score as `probability * impact`.
///
/// Both inputs are on a 1–5 scale. Values outside that range are clamped
/// to `[1, 5]`, so the resulting score is always in `[1, 25]`.
pub fn calculate_risk_score(probability: u8, impact: u8) -> u32 {
    let p = probability.clamp(1, 5) as u32;
    let i = impact.clamp(1, 5) as u32;
    p * i
}

/// Maps a risk score (1–25) to a qualitative risk level.
///
/// - 1–5   → `"low"`
/// - 6–12  → `"medium"`
/// - 13–19 → `"high"`
/// - 20–25 → `"critical"`
pub fn risk_level_from_score(score: u32) -> &'static str {
    match score {
        1..=5 => "low",
        6..=12 => "medium",
        13..=19 => "high",
        20..=25 => "critical",
        _ => "low",
    }
}

pub fn create_routes(pool: PgPool) -> Router {
    Router::new()
        .route(
            "/projects/{project_id}/risks",
            get(get_project_risks).post(create_risk),
        )
        .route("/risks/{id}", get(get_risk).put(update_risk))
        .route(
            "/risks/{id}/events",
            get(get_risk_events).post(create_risk_event),
        )
        .with_state(pool)
}

async fn get_project_risks(
    State(pool): State<PgPool>,
    Path(project_id): Path<Uuid>,
) -> Json<ApiResponse<Vec<ProjectRisk>>> {
    let risks = sqlx::query_as::<_, ProjectRisk>(
        "id, project_id, risk_code, risk_name, risk_description, risk_category, risk_subcategory, likelihood, impact, risk_score, risk_level, status, mitigation_plan, owner, created_at, updated_at FROM pm.project_risks WHERE project_id = $1 ORDER BY risk_score DESC",
    )
    .bind(project_id)
    .fetch_all(&pool)
    .await;

    match risks {
        Ok(r) => Json(ApiResponse::success(r, "获取项目风险列表成功")),
        Err(e) => {
            tracing::error!("获取风险失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "获取风险失败",
            ))
        }
    }
}

async fn get_risk(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ProjectRisk>> {
    let risk = sqlx::query_as::<_, ProjectRisk>("id, project_id, risk_code, risk_name, risk_description, risk_category, risk_subcategory, likelihood, impact, risk_score, risk_level, status, mitigation_plan, owner, created_at, updated_at FROM pm.project_risks WHERE id = $1")
        .bind(id)
        .fetch_one(&pool)
        .await;

    match risk {
        Ok(r) => Json(ApiResponse::success(r, "获取风险详情成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(
            StatusCode::NOT_FOUND.as_u16(),
            "风险不存在",
        )),
        Err(e) => {
            tracing::error!("获取风险失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "获取风险失败",
            ))
        }
    }
}

async fn create_risk(
    State(pool): State<PgPool>,
    Path(project_id): Path<Uuid>,
    Json(req): Json<CreateRiskRequest>,
) -> Json<ApiResponse<ProjectRisk>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let risk = sqlx::query_as::<_, ProjectRisk>(
        "INSERT INTO plugin_pm.project_risks (id, project_id, risk_code, risk_name, risk_description, risk_category, risk_subcategory, likelihood, impact, risk_score, status, mitigation_strategy, contingency_plan, trigger_condition, warning_threshold, owner, response_due_date, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'identified', $11, $12, $13, $14, $15, $16, $17, $18, $19) RETURNING *"
    )
    .bind(id)
    .bind(project_id)
    .bind(req.risk_code)
    .bind(&req.risk_name)
    .bind(req.risk_description)
    .bind(req.risk_category)
    .bind(req.risk_subcategory)
    .bind(&req.likelihood)
    .bind(&req.impact)
    .bind(req.risk_score)
    .bind(req.mitigation_strategy)
    .bind(req.contingency_plan)
    .bind(req.trigger_condition)
    .bind(req.warning_threshold.unwrap_or(80))
    .bind(req.owner)
    .bind(parse_date_opt(&req.response_due_date))
    .bind(req.created_by)
    .bind(now)
    .bind(now)
    .fetch_one(&pool)
    .await;

    match risk {
        Ok(r) => Json(ApiResponse::success(r, "创建风险成功")),
        Err(e) => {
            tracing::error!("创建风险失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "创建风险失败",
            ))
        }
    }
}

async fn update_risk(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateRiskRequest>,
) -> Json<ApiResponse<ProjectRisk>> {
    let risk = sqlx::query_as::<_, ProjectRisk>(
        "UPDATE plugin_pm.project_risks SET
            risk_name = COALESCE($1, risk_name),
            risk_description = COALESCE($2, risk_description),
            risk_category = COALESCE($3, risk_category),
            risk_subcategory = COALESCE($4, risk_subcategory),
            likelihood = COALESCE($5, likelihood),
            impact = COALESCE($6, impact),
            risk_score = COALESCE($7, risk_score),
            status = COALESCE($8, status),
            mitigation_strategy = COALESCE($9, mitigation_strategy),
            contingency_plan = COALESCE($10, contingency_plan),
            trigger_condition = COALESCE($11, trigger_condition),
            warning_threshold = COALESCE($12, warning_threshold),
            owner = COALESCE($13, owner),
            response_due_date = COALESCE($14, response_due_date),
            updated_at = $15
        WHERE id = $16 RETURNING *",
    )
    .bind(req.risk_name)
    .bind(req.risk_description)
    .bind(req.risk_category)
    .bind(req.risk_subcategory)
    .bind(req.likelihood)
    .bind(req.impact)
    .bind(req.risk_score)
    .bind(req.status)
    .bind(req.mitigation_strategy)
    .bind(req.contingency_plan)
    .bind(req.trigger_condition)
    .bind(req.warning_threshold)
    .bind(req.owner)
    .bind(parse_date_opt(&req.response_due_date))
    .bind(Utc::now())
    .bind(id)
    .fetch_one(&pool)
    .await;

    match risk {
        Ok(r) => Json(ApiResponse::success(r, "更新风险成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(
            StatusCode::NOT_FOUND.as_u16(),
            "风险不存在",
        )),
        Err(e) => {
            tracing::error!("更新风险失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "更新风险失败",
            ))
        }
    }
}

async fn get_risk_events(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Vec<RiskEvent>>> {
    let events = sqlx::query_as::<_, RiskEvent>(
        "SELECT id, risk_id, event_type, event_description, occurred_at, reported_by, created_at FROM plugin_pm.risk_events WHERE risk_id = $1 ORDER BY occurred_at DESC",
    )
    .bind(id)
    .fetch_all(&pool)
    .await;

    match events {
        Ok(e) => Json(ApiResponse::success(e, "获取风险事件列表成功")),
        Err(e) => {
            tracing::error!("获取风险事件失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "获取风险事件失败",
            ))
        }
    }
}

async fn create_risk_event(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(req): Json<CreateRiskEventRequest>,
) -> Json<ApiResponse<RiskEvent>> {
    let event_id = Uuid::new_v4();
    let now = Utc::now();

    let event = sqlx::query_as::<_, RiskEvent>(
        "INSERT INTO plugin_pm.risk_events (id, risk_id, event_type, event_description, occurred_at, reported_by, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $5) RETURNING *"
    )
    .bind(event_id)
    .bind(id)
    .bind(&req.event_type)
    .bind(req.event_description)
    .bind(now)
    .bind(req.reported_by)
    .fetch_one(&pool)
    .await;

    match event {
        Ok(e) => Json(ApiResponse::success(e, "创建风险事件成功")),
        Err(e) => {
            tracing::error!("创建风险事件失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "创建风险事件失败",
            ))
        }
    }
}

fn parse_date_opt(date_str: &Option<String>) -> Option<chrono::DateTime<chrono::Utc>> {
    date_str
        .as_ref()
        .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok())
        .map(|d| d.with_timezone(&chrono::Utc))
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::postgres::PgConnectOptions;
    use std::str::FromStr;

    fn make_pool() -> PgPool {
        let opts = PgConnectOptions::from_str("postgres://localhost/test").unwrap();
        sqlx::Pool::connect_lazy_with(opts)
    }

    #[tokio::test]
    async fn test_create_routes_returns_router() {
        let router = create_routes(make_pool());
        let _ = router;
    }

    #[test]
    fn test_parse_date_opt_none() {
        assert!(parse_date_opt(&None).is_none());
    }

    #[test]
    fn test_parse_date_opt_valid() {
        let s = Some("2024-04-10T08:00:00Z".to_string());
        let r = parse_date_opt(&s);
        assert!(r.is_some());
        let dt = r.unwrap();
        assert_eq!(dt.year(), 2024);
        assert_eq!(dt.month(), 4);
    }

    #[test]
    fn test_parse_date_opt_invalid() {
        assert!(parse_date_opt(&Some("garbage".to_string())).is_none());
    }

    // ---- calculate_risk_score ----

    #[test]
    fn test_min_risk_score() {
        assert_eq!(calculate_risk_score(1, 1), 1);
    }

    #[test]
    fn test_max_risk_score() {
        assert_eq!(calculate_risk_score(5, 5), 25);
    }

    #[test]
    fn test_mid_risk_score() {
        assert_eq!(calculate_risk_score(3, 4), 12);
        assert_eq!(calculate_risk_score(4, 3), 12);
    }

    #[test]
    fn test_clamps_below_one() {
        assert_eq!(calculate_risk_score(0, 0), 1);
        assert_eq!(calculate_risk_score(0, 5), 5);
    }

    #[test]
    fn test_clamps_above_five() {
        assert_eq!(calculate_risk_score(6, 6), 25);
        assert_eq!(calculate_risk_score(255, 1), 5);
    }

    #[test]
    fn test_score_always_in_range() {
        for p in 0..=10 {
            for i in 0..=10 {
                let s = calculate_risk_score(p, i);
                assert!((1..=25).contains(&s));
            }
        }
    }

    // ---- risk_level_from_score ----

    #[test]
    fn test_level_low() {
        assert_eq!(risk_level_from_score(1), "low");
        assert_eq!(risk_level_from_score(5), "low");
    }

    #[test]
    fn test_level_medium() {
        assert_eq!(risk_level_from_score(6), "medium");
        assert_eq!(risk_level_from_score(12), "medium");
    }

    #[test]
    fn test_level_high() {
        assert_eq!(risk_level_from_score(13), "high");
        assert_eq!(risk_level_from_score(19), "high");
    }

    #[test]
    fn test_level_critical() {
        assert_eq!(risk_level_from_score(20), "critical");
        assert_eq!(risk_level_from_score(25), "critical");
    }

    #[test]
    fn test_level_boundary_values() {
        // Boundaries between levels
        assert_eq!(risk_level_from_score(5), "low");
        assert_eq!(risk_level_from_score(6), "medium");
        assert_eq!(risk_level_from_score(12), "medium");
        assert_eq!(risk_level_from_score(13), "high");
        assert_eq!(risk_level_from_score(19), "high");
        assert_eq!(risk_level_from_score(20), "critical");
    }

    #[test]
    fn test_level_out_of_range_defaults_low() {
        assert_eq!(risk_level_from_score(0), "low");
        assert_eq!(risk_level_from_score(100), "low");
    }

    #[test]
    fn test_score_and_level_integration() {
        assert_eq!(risk_level_from_score(calculate_risk_score(1, 2)), "low");
        assert_eq!(risk_level_from_score(calculate_risk_score(3, 3)), "medium");
        assert_eq!(risk_level_from_score(calculate_risk_score(4, 4)), "high");
        assert_eq!(
            risk_level_from_score(calculate_risk_score(5, 5)),
            "critical"
        );
    }
}

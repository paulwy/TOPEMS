use axum::{
    extract::{Extension, Path, State},
    http::HeaderMap,
    routing::get,
    Json, Router,
};
use chrono::Utc;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::TenantContext;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::ApiResponse;
use topems_shared_db::scope::Db;
use uuid::Uuid;

use crate::models::risk::{
    CreateRiskEventRequest, CreateRiskRequest, ProjectRisk, RiskEvent, UpdateRiskRequest,
};
use crate::modules::effective_tenant_id;
use crate::modules::project_risk_status::ProjectRiskStatus;
use crate::services::audit::PmAuditService;

use topems_shared_auth::middleware::tenant::RlsTxnCell;

/// 校验项目风险状态流转：不存在 404、存量未知值 400、非法流转 400。
async fn ensure_risk_transition(
    scope: &mut topems_shared_db::scope::ScopedTxn<'_>,
    id: Uuid,
    to: ProjectRiskStatus,
) -> Result<(), ApiResponse<ProjectRisk>> {
    let current_raw: Result<Option<String>, sqlx::Error> =
        sqlx::query_scalar("SELECT status FROM pm.project_risks WHERE id = $1")
            .bind(id)
            .fetch_optional(&mut *scope)
            .await;
    let raw = match current_raw {
        Ok(Some(raw)) => raw,
        Ok(None) => return Err(ApiResponse::not_found("项目风险不存在")),
        Err(e) => {
            tracing::error!("查询项目风险状态失败: {}", e);
            return Err(ApiResponse::server_error("查询项目风险状态失败"));
        }
    };
    let current = match ProjectRiskStatus::from_db_str(&raw) {
        Some(status) => status,
        None => {
            return Err(ApiResponse::bad_request(&format!(
                "项目风险当前状态非法: {raw}"
            )))
        }
    };
    if !current.can_transition_to(to) {
        return Err(ApiResponse::bad_request(&format!(
            "非法项目风险状态流转: {} -> {}",
            current, to
        )));
    }
    Ok(())
}

// ==================== Pure functions ====================

#[allow(clippy::as_conversions)]
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

pub fn create_routes(db: Db) -> Router {
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
        .with_state(db)
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/projects/{project_id}/risks",
    params(
("project_id" = String, Path, description = "project_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "risk"
)]
async fn get_project_risks(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(project_id): Path<Uuid>,
) -> ApiResponse<Vec<ProjectRisk>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let risks = sqlx::query_as::<_, ProjectRisk>(
        only_own_schema_query!("pm", "SELECT id, project_id, risk_code, risk_name, risk_description, risk_category, risk_subcategory, likelihood, impact, risk_score, risk_level, status, mitigation_plan, mitigation_strategy, contingency_plan, trigger_condition, warning_threshold, owner, response_due_date, created_at, updated_at FROM pm.project_risks WHERE project_id = $1 ORDER BY risk_score DESC"),
    )
    .bind(project_id)
    .fetch_all(&mut scope)
    .await;

    match risks {
        Ok(r) => ApiResponse::success(r, "获取项目风险列表成功"),
        Err(e) => {
            tracing::error!("获取风险失败: {}", e);
            ApiResponse::server_error("获取风险失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/risks/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "risk"
)]
async fn get_risk(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<ProjectRisk> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let risk = sqlx::query_as::<_, ProjectRisk>(only_own_schema_query!("pm", "SELECT id, project_id, risk_code, risk_name, risk_description, risk_category, risk_subcategory, likelihood, impact, risk_score, risk_level, status, mitigation_plan, mitigation_strategy, contingency_plan, trigger_condition, warning_threshold, owner, response_due_date, created_at, updated_at FROM pm.project_risks WHERE id = $1"))
        .bind(id)
        .fetch_one(&mut scope)
        .await;

    match risk {
        Ok(r) => ApiResponse::success(r, "获取风险详情成功"),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("风险不存在"),
        Err(e) => {
            tracing::error!("获取风险失败: {}", e);
            ApiResponse::server_error("获取风险失败")
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/pm/projects/{project_id}/risks",
    tag = "risk",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
async fn create_risk(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(project_id): Path<Uuid>,
    Extension(audit): Extension<PmAuditService>,
    headers: HeaderMap,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateRiskRequest>,
) -> ApiResponse<ProjectRisk> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let id = Uuid::new_v4();
    let now = Utc::now();
    let user_id = headers.get("x-username").and_then(|v| v.to_str().ok());
    let details = Some(
        serde_json::json!({"project_id": project_id, "risk_code": req.risk_code, "risk_name": req.risk_name, "risk_level": req.risk_score}),
    );

    let risk = sqlx::query_as::<_, ProjectRisk>(
        only_own_schema_query!("pm", "INSERT INTO pm.project_risks (id, project_id, risk_code, risk_name, risk_description, risk_category, risk_subcategory, likelihood, impact, risk_score, status, mitigation_strategy, contingency_plan, trigger_condition, warning_threshold, owner, response_due_date, created_at, updated_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20) RETURNING *")
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
    .bind(ProjectRiskStatus::DEFAULT.as_db_str())
    .bind(req.mitigation_strategy)
    .bind(req.contingency_plan)
    .bind(req.trigger_condition)
    .bind(req.warning_threshold.unwrap_or(80))
    .bind(req.owner)
    .bind(parse_date_opt(&req.response_due_date))
    .bind(now)
    .bind(now)
    .bind(effective_tenant_id(&ctx, &claims))
    .fetch_one(&mut scope)
    .await;

    match risk {
        Ok(r) => {
            if let Err(e) = audit
                .log_risk_operation(
                    "create_risk",
                    Some(r.id),
                    user_id,
                    details.clone(),
                    "success",
                    None,
                )
                .await
            {
                tracing::warn!("pm audit failed: {e}");
            }
            ApiResponse::success(r, "创建风险成功")
        }
        Err(e) => {
            if let Err(audit_err) = audit
                .log_risk_operation(
                    "create_risk",
                    Some(id),
                    user_id,
                    details,
                    "failed",
                    Some(&e.to_string()),
                )
                .await
            {
                tracing::warn!("pm audit failed: {audit_err}");
            }
            tracing::error!("创建风险失败: {}", e);
            ApiResponse::server_error("创建风险失败")
        }
    }
}

#[utoipa::path(
    put,
    path = "/api/pm/risks/{id}",
    tag = "risk",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
async fn update_risk(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
    Extension(audit): Extension<PmAuditService>,
    headers: HeaderMap,
    Json(req): Json<UpdateRiskRequest>,
) -> ApiResponse<ProjectRisk> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let user_id = headers.get("x-username").and_then(|v| v.to_str().ok());
    let requested_status = match req.status.as_deref() {
        None => None,
        Some(raw) => match ProjectRiskStatus::normalize(raw) {
            Ok(status) => Some(status),
            Err(message) => return ApiResponse::bad_request(&message),
        },
    };
    if let Some(to) = requested_status {
        if let Err(resp) = ensure_risk_transition(&mut scope, id, to).await {
            return resp;
        }
    }
    let requested_status = requested_status.map(ProjectRiskStatus::as_db_str);
    let details =
        Some(serde_json::json!({"status": requested_status, "risk_score": req.risk_score}));
    let risk = sqlx::query_as::<_, ProjectRisk>(only_own_schema_query!(
        "pm",
        "UPDATE pm.project_risks SET
            risk_name = COALESCE($1, risk_name),
            risk_description = COALESCE($2, risk_description),
            risk_category = COALESCE($3, risk_category),
            risk_subcategory = COALESCE($4, risk_subcategory),
            likelihood = COALESCE($5, likelihood),
            impact = COALESCE($6, impact),
            risk_score = COALESCE($7::int, risk_score),
            status = COALESCE($8, status),
            mitigation_strategy = COALESCE($9, mitigation_strategy),
            contingency_plan = COALESCE($10, contingency_plan),
            trigger_condition = COALESCE($11, trigger_condition),
            warning_threshold = COALESCE($12::int, warning_threshold),
            owner = COALESCE($13, owner),
            response_due_date = COALESCE($14, response_due_date),
            updated_at = $15
        WHERE id = $16  RETURNING *"
    ))
    .bind(req.risk_name)
    .bind(req.risk_description)
    .bind(req.risk_category)
    .bind(req.risk_subcategory)
    .bind(req.likelihood)
    .bind(req.impact)
    .bind(req.risk_score)
    .bind(requested_status)
    .bind(req.mitigation_strategy)
    .bind(req.contingency_plan)
    .bind(req.trigger_condition)
    .bind(req.warning_threshold)
    .bind(req.owner)
    .bind(parse_date_opt(&req.response_due_date))
    .bind(Utc::now())
    .bind(id)
    .fetch_one(&mut scope)
    .await;

    match risk {
        Ok(r) => {
            if let Err(e) = audit
                .log_risk_operation(
                    "update_risk",
                    Some(r.id),
                    user_id,
                    details.clone(),
                    "success",
                    None,
                )
                .await
            {
                tracing::warn!("pm audit failed: {e}");
            }
            ApiResponse::success(r, "更新风险成功")
        }
        Err(sqlx::Error::RowNotFound) => {
            if let Err(e) = audit
                .log_risk_operation(
                    "update_risk",
                    Some(id),
                    user_id,
                    details.clone(),
                    "failed",
                    Some("风险不存在"),
                )
                .await
            {
                tracing::warn!("pm audit failed: {e}");
            }
            ApiResponse::not_found("风险不存在")
        }
        Err(e) => {
            if let Err(audit_err) = audit
                .log_risk_operation(
                    "update_risk",
                    Some(id),
                    user_id,
                    details,
                    "failed",
                    Some(&e.to_string()),
                )
                .await
            {
                tracing::warn!("pm audit failed: {audit_err}");
            }
            tracing::error!("更新风险失败: {}", e);
            ApiResponse::server_error("更新风险失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/risks/{id}/events",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "risk"
)]
async fn get_risk_events(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<Vec<RiskEvent>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let events = sqlx::query_as::<_, RiskEvent>(
        only_own_schema_query!("pm", "SELECT id, risk_id, event_type, event_description, occurred_at, reported_by, created_at FROM pm.risk_events WHERE risk_id = $1 ORDER BY occurred_at DESC"),
    )
    .bind(id)
    .fetch_all(&mut scope)
    .await;

    match events {
        Ok(e) => ApiResponse::success(e, "获取风险事件列表成功"),
        Err(e) => {
            tracing::error!("获取风险事件失败: {}", e);
            ApiResponse::server_error("获取风险事件失败")
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/pm/risks/{id}/events",
    tag = "risk",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
async fn create_risk_event(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateRiskEventRequest>,
) -> ApiResponse<RiskEvent> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let event_id = Uuid::new_v4();
    let now = Utc::now();

    let event = sqlx::query_as::<_, RiskEvent>(
        only_own_schema_query!("pm", "INSERT INTO pm.risk_events (id, risk_id, event_type, event_description, occurred_at, reported_by, created_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $5, $7) RETURNING *")
    )
    .bind(event_id)
    .bind(id)
    .bind(&req.event_type)
    .bind(req.event_description)
    .bind(now)
    .bind(req.reported_by)
    .bind(effective_tenant_id(&ctx, &claims))
    .fetch_one(&mut scope)
    .await;

    match event {
        Ok(e) => ApiResponse::success(e, "创建风险事件成功"),
        Err(e) => {
            tracing::error!("创建风险事件失败: {}", e);
            ApiResponse::server_error("创建风险事件失败")
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
    use chrono::Datelike;
    use sqlx::postgres::PgConnectOptions;
    use sqlx::PgPool;
    use std::str::FromStr;

    fn make_pool() -> PgPool {
        let opts = PgConnectOptions::from_str("postgres://localhost/test").unwrap();
        sqlx::Pool::connect_lazy_with(opts)
    }

    #[tokio::test]
    async fn test_create_routes_returns_router() {
        let router = create_routes(Db::new(make_pool(), "pm, public, shared"));
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

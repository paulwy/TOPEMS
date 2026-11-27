use axum::{
    extract::{Extension, Path, State},
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

use crate::models::quality::{
    CreateDefectRequest, CreateQualityCheckRequest, Defect, QualityCheck, UpdateDefectRequest,
    UpdateQualityCheckRequest,
};
use crate::modules::defect_status::DefectStatus;
use crate::modules::effective_tenant_id;

use topems_shared_auth::middleware::tenant::RlsTxnCell;

/// 校验缺陷状态流转：不存在 404、存量未知值 400、非法流转 400。
async fn ensure_defect_transition(
    scope: &mut topems_shared_db::scope::ScopedTxn<'_>,
    id: Uuid,
    to: DefectStatus,
) -> Result<(), ApiResponse<Defect>> {
    let current_raw: Result<Option<String>, sqlx::Error> =
        sqlx::query_scalar("SELECT status FROM pm.defects WHERE id = $1")
            .bind(id)
            .fetch_optional(&mut *scope)
            .await;
    let raw = match current_raw {
        Ok(Some(raw)) => raw,
        Ok(None) => return Err(ApiResponse::not_found("缺陷不存在")),
        Err(e) => {
            tracing::error!("查询缺陷状态失败: {}", e);
            return Err(ApiResponse::server_error("查询缺陷状态失败"));
        }
    };
    let current = match DefectStatus::from_db_str(&raw) {
        Some(status) => status,
        None => {
            return Err(ApiResponse::bad_request(&format!(
                "缺陷当前状态非法: {raw}"
            )))
        }
    };
    if !current.can_transition_to(to) {
        return Err(ApiResponse::bad_request(&format!(
            "非法缺陷状态流转: {} -> {}",
            current, to
        )));
    }
    Ok(())
}

// ==================== Pure functions ====================

#[allow(clippy::as_conversions)]
/// Calculates a quality score as a percentage.
///
/// Formula: `(1 - defects / total_items) * 100`.
/// Returns `0.0` when `total_items` is zero (no data available).
/// The result is clamped to `[0.0, 100.0]`.
pub fn calculate_quality_score(defects: u32, total_items: u32) -> f64 {
    if total_items == 0 {
        return 0.0;
    }
    let ratio = defects as f64 / total_items as f64;
    let score = (1.0 - ratio) * 100.0;
    score.clamp(0.0, 100.0)
}

pub fn create_routes(db: Db) -> Router {
    Router::new()
        .route(
            "/projects/{project_id}/quality-checks",
            get(get_project_quality_checks).post(create_quality_check),
        )
        .route(
            "/quality-checks/{id}",
            get(get_quality_check).put(update_quality_check),
        )
        .route(
            "/projects/{project_id}/defects",
            get(get_project_defects).post(create_defect),
        )
        .route(
            "/defects/{id}",
            get(get_defect).put(update_defect).delete(delete_defect),
        )
        .with_state(db)
}

/// 列对齐 pm.quality_checks 真库（含补列）：check_name/check_type/check_date/checker/result/
/// issues/status + phase_id/milestone_id/acceptance_standard/result_details/nonconformities/
/// corrective_actions/follow_up_date。

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/projects/{project_id}/quality-checks",
    params(
("project_id" = String, Path, description = "project_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "quality"
)]
async fn get_project_quality_checks(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(project_id): Path<Uuid>,
) -> ApiResponse<Vec<QualityCheck>> {
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
    let checks = sqlx::query_as::<_, QualityCheck>(
        only_own_schema_query!("pm", "SELECT id, project_id, check_name, check_type, phase_id, milestone_id, issues, acceptance_standard, result, status, check_date, checker, result_details, nonconformities, corrective_actions, follow_up_date, created_at, updated_at FROM pm.quality_checks WHERE project_id = $1 ORDER BY created_at DESC"),
    )
    .bind(project_id)
    .fetch_all(&mut scope)
    .await;

    match checks {
        Ok(c) => ApiResponse::success(c, "获取质量检查列表成功"),
        Err(e) => {
            tracing::error!("获取质量检查失败: {}", e);
            ApiResponse::server_error("获取质量检查失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/quality-checks/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "quality"
)]
async fn get_quality_check(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<QualityCheck> {
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
    let check =
        sqlx::query_as::<_, QualityCheck>(only_own_schema_query!("pm", "SELECT id, project_id, check_name, check_type, phase_id, milestone_id, issues, acceptance_standard, result, status, check_date, checker, result_details, nonconformities, corrective_actions, follow_up_date, created_at, updated_at FROM pm.quality_checks WHERE id = $1"))
            .bind(id)
            .fetch_one(&mut scope)
            .await;

    match check {
        Ok(c) => ApiResponse::success(c, "获取质量检查详情成功"),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("质量检查不存在"),
        Err(e) => {
            tracing::error!("获取质量检查失败: {}", e);
            ApiResponse::server_error("获取质量检查失败")
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/pm/projects/{project_id}/quality-checks",
    tag = "quality",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
async fn create_quality_check(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(project_id): Path<Uuid>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateQualityCheckRequest>,
) -> ApiResponse<QualityCheck> {
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
    let tenant_id = effective_tenant_id(&ctx, &claims);

    // 列对齐真库：check_criteria->issues, checked_by->checker, created_by->checker；
    // check_code 与 check_name 语义重叠已删。补 NOT NULL：check_date=now, result='pending'。
    let check = sqlx::query_as::<_, QualityCheck>(
        only_own_schema_query!("pm", "INSERT INTO pm.quality_checks (id, project_id, check_name, check_type, phase_id, milestone_id, issues, acceptance_standard, result, status, check_date, checker, created_at, updated_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', 'pending', $9, $10, $11, $12, $13) RETURNING *")
    )
    .bind(id)
    .bind(project_id)
    .bind(&req.check_name)
    .bind(req.check_type)
    .bind(req.phase_id)
    .bind(req.milestone_id)
    .bind(req.check_criteria)
    .bind(req.acceptance_standard)
    .bind(now)
    .bind(req.created_by.clone().unwrap_or_else(|| "system".to_string()))
    .bind(now)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await;

    match check {
        Ok(c) => ApiResponse::success(c, "创建质量检查成功"),
        Err(e) => {
            tracing::error!("创建质量检查失败: {}", e);
            ApiResponse::server_error("创建质量检查失败")
        }
    }
}

#[utoipa::path(
    put,
    path = "/api/pm/quality-checks/{id}",
    tag = "quality",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
async fn update_quality_check(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateQualityCheckRequest>,
) -> ApiResponse<QualityCheck> {
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
    // check_criteria->issues, checked_by->checker。
    let check = sqlx::query_as::<_, QualityCheck>(only_own_schema_query!(
        "pm",
        "UPDATE pm.quality_checks SET
            check_name = COALESCE($1, check_name),
            check_type = COALESCE($2, check_type),
            issues = COALESCE($3, issues),
            acceptance_standard = COALESCE($4, acceptance_standard),
            status = COALESCE($5, status),
            check_date = COALESCE($6, check_date),
            checker = COALESCE($7, checker),
            result_details = COALESCE($8, result_details),
            nonconformities = COALESCE($9, nonconformities),
            corrective_actions = COALESCE($10, corrective_actions),
            follow_up_date = COALESCE($11, follow_up_date),
            updated_at = $12
        WHERE id = $13  RETURNING *"
    ))
    .bind(req.check_name)
    .bind(req.check_type)
    .bind(req.check_criteria)
    .bind(req.acceptance_standard)
    .bind(req.status)
    .bind(parse_date_opt(&req.check_date))
    .bind(req.checked_by)
    .bind(req.result_details)
    .bind(req.nonconformities)
    .bind(req.corrective_actions)
    .bind(parse_date_opt(&req.follow_up_date))
    .bind(Utc::now())
    .bind(id)
    .fetch_one(&mut scope)
    .await;

    match check {
        Ok(c) => ApiResponse::success(c, "更新质量检查成功"),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("质量检查不存在"),
        Err(e) => {
            tracing::error!("更新质量检查失败: {}", e);
            ApiResponse::server_error("更新质量检查失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/projects/{project_id}/defects",
    params(
("project_id" = String, Path, description = "project_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "quality"
)]
async fn get_project_defects(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(project_id): Path<Uuid>,
) -> ApiResponse<Vec<Defect>> {
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
    let defects = sqlx::query_as::<_, Defect>(
        only_own_schema_query!("pm", "SELECT id, project_id, check_id, defect_code, defect_name, defect_description, severity, priority, status, assignee, due_date, created_at, updated_at FROM pm.defects WHERE deleted_at IS NULL AND project_id = $1 ORDER BY severity DESC, priority DESC"),
    )
    .bind(project_id)
    .fetch_all(&mut scope)
    .await;

    match defects {
        Ok(d) => ApiResponse::success(d, "获取缺陷列表成功"),
        Err(e) => {
            tracing::error!("获取缺陷失败: {}", e);
            ApiResponse::server_error("获取缺陷失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/defects/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "quality"
)]
async fn get_defect(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<Defect> {
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
    let defect = sqlx::query_as::<_, Defect>(
        only_own_schema_query!("pm", "SELECT id, project_id, check_id, defect_code, defect_name, defect_description, severity, priority, status, assignee, due_date, created_at, updated_at FROM pm.defects WHERE deleted_at IS NULL AND id = $1"),
    )
    .bind(id)
    .fetch_one(&mut scope)
    .await;

    match defect {
        Ok(d) => ApiResponse::success(d, "获取缺陷详情成功"),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("缺陷不存在"),
        Err(e) => {
            tracing::error!("获取缺陷详情失败: {}", e);
            ApiResponse::server_error("获取缺陷失败")
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/pm/projects/{project_id}/defects",
    tag = "quality",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
async fn create_defect(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(project_id): Path<Uuid>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateDefectRequest>,
) -> ApiResponse<Defect> {
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

    let defect = sqlx::query_as::<_, Defect>(
        only_own_schema_query!("pm", "INSERT INTO pm.defects (id, project_id, check_id, defect_code, defect_name, defect_description, severity, priority, status, assignee, due_date, created_by, created_at, updated_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *")
    )
    .bind(id)
    .bind(project_id)
    .bind(req.check_id)
    .bind(req.defect_code)
    .bind(&req.defect_name)
    .bind(req.defect_description)
    .bind(&req.severity)
    .bind(&req.priority)
    .bind(DefectStatus::DEFAULT.as_db_str())
    .bind(req.assignee)
    .bind(parse_date_opt(&req.due_date))
    .bind(req.created_by)
    .bind(now)
    .bind(now)
    .bind(effective_tenant_id(&ctx, &claims))
    .fetch_one(&mut scope)
    .await;

    match defect {
        Ok(d) => ApiResponse::success(d, "创建缺陷成功"),
        Err(e) => {
            tracing::error!("创建缺陷失败: {}", e);
            ApiResponse::server_error("创建缺陷失败")
        }
    }
}

#[utoipa::path(
    put,
    path = "/api/pm/defects/{id}",
    tag = "quality",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
async fn update_defect(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateDefectRequest>,
) -> ApiResponse<Defect> {
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
    let requested_status = match req.status.as_deref() {
        None => None,
        Some(raw) => match DefectStatus::normalize(raw) {
            Ok(status) => Some(status),
            Err(message) => return ApiResponse::bad_request(&message),
        },
    };
    if let Some(to) = requested_status {
        if let Err(resp) = ensure_defect_transition(&mut scope, id, to).await {
            return resp;
        }
    }
    let requested_status = requested_status.map(DefectStatus::as_db_str);
    let is_resolving = requested_status == Some(DefectStatus::Resolved.as_db_str());
    let defect = sqlx::query_as::<_, Defect>(only_own_schema_query!(
        "pm",
        "UPDATE pm.defects SET
            defect_name = COALESCE($1, defect_name),
            defect_description = COALESCE($2, defect_description),
            severity = COALESCE($3, severity),
            priority = COALESCE($4, priority),
            status = COALESCE($5, status),
            assignee = COALESCE($6, assignee),
            due_date = COALESCE($7, due_date),
            resolution = COALESCE($8, resolution),
            resolved_at = CASE WHEN $9 THEN CURRENT_TIMESTAMP ELSE resolved_at END,
            updated_at = $10
        WHERE id = $11  RETURNING *"
    ))
    .bind(req.defect_name)
    .bind(req.defect_description)
    .bind(req.severity)
    .bind(req.priority)
    .bind(requested_status)
    .bind(req.assignee)
    .bind(parse_date_opt(&req.due_date))
    .bind(req.resolution)
    .bind(is_resolving)
    .bind(Utc::now())
    .bind(id)
    .fetch_one(&mut scope)
    .await;

    match defect {
        Ok(d) => ApiResponse::success(d, "更新缺陷成功"),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("缺陷不存在"),
        Err(e) => {
            tracing::error!("更新缺陷失败: {}", e);
            ApiResponse::server_error("更新缺陷失败")
        }
    }
}

#[utoipa::path(
    delete,
    path = "/api/pm/defects/{id}",
    tag = "quality",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
async fn delete_defect(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<()> {
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
    let result = sqlx::query(only_own_schema_query!(
        "pm",
        "UPDATE pm.defects SET deleted_at = NOW() WHERE id = $1"
    ))
    .bind(id)
    .execute(&mut scope)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => ApiResponse::success((), "删除缺陷成功"),
        Ok(_) => ApiResponse::not_found("缺陷不存在"),
        Err(e) => {
            tracing::error!("删除缺陷失败: {}", e);
            ApiResponse::server_error("删除缺陷失败")
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
        let s = Some("2024-08-20T10:00:00Z".to_string());
        let r = parse_date_opt(&s);
        assert!(r.is_some());
        let dt = r.unwrap();
        assert_eq!(dt.year(), 2024);
        assert_eq!(dt.month(), 8);
    }

    #[test]
    fn test_parse_date_opt_invalid_returns_none() {
        assert!(parse_date_opt(&Some("xxx".to_string())).is_none());
    }

    #[test]
    fn test_perfect_score_no_defects() {
        assert_eq!(calculate_quality_score(0, 100), 100.0);
    }

    #[test]
    fn test_zero_total_items() {
        assert_eq!(calculate_quality_score(0, 0), 0.0);
        assert_eq!(calculate_quality_score(5, 0), 0.0);
    }

    #[test]
    fn test_all_defects() {
        assert_eq!(calculate_quality_score(100, 100), 0.0);
    }

    #[test]
    fn test_ten_percent_defects() {
        assert!((calculate_quality_score(10, 100) - 90.0).abs() < 1e-9);
    }

    #[test]
    fn test_half_defects() {
        assert!((calculate_quality_score(50, 100) - 50.0).abs() < 1e-9);
    }

    #[test]
    fn test_clamps_when_defects_exceed_total() {
        assert_eq!(calculate_quality_score(150, 100), 0.0);
    }

    #[test]
    fn test_single_item_no_defect() {
        assert_eq!(calculate_quality_score(0, 1), 100.0);
    }

    #[test]
    fn test_single_item_with_defect() {
        assert_eq!(calculate_quality_score(1, 1), 0.0);
    }

    #[test]
    fn test_score_always_in_range() {
        for defects in 0..=200 {
            for total in 1..=100 {
                let score = calculate_quality_score(defects, total);
                assert!((0.0..=100.0).contains(&score));
            }
        }
    }
}

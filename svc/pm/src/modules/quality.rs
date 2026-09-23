use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
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

use crate::models::quality::{
    CreateDefectRequest, CreateQualityCheckRequest, Defect, QualityCheck, UpdateDefectRequest,
    UpdateQualityCheckRequest,
};
use crate::modules::effective_tenant_id;

// ==================== Pure functions ====================

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

pub fn create_routes(pool: PgPool) -> Router {
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
        .with_state(pool)
}

async fn get_project_quality_checks(
    State(pool): State<PgPool>,
    Path(project_id): Path<Uuid>,
) -> Json<ApiResponse<Vec<QualityCheck>>> {
    let checks = sqlx::query_as::<_, QualityCheck>(
        only_own_schema_query!("pm", "id, project_id, check_code, check_name, check_type, phase_id, milestone_id, check_criteria, acceptance_standard, status, check_date, checked_by, result, notes, created_at, updated_at FROM pm.quality_checks WHERE project_id = $1 ORDER BY created_at DESC"),
    )
    .bind(project_id)
    .fetch_all(&pool)
    .await;

    match checks {
        Ok(c) => Json(ApiResponse::success(c, "获取质量检查列表成功")),
        Err(e) => {
            tracing::error!("获取质量检查失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "获取质量检查失败",
            ))
        }
    }
}

async fn get_quality_check(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<QualityCheck>> {
    let check =
        sqlx::query_as::<_, QualityCheck>(only_own_schema_query!("pm", "id, project_id, check_code, check_name, check_type, phase_id, milestone_id, check_criteria, acceptance_standard, status, check_date, checked_by, result, notes, created_at, updated_at FROM pm.quality_checks WHERE id = $1"))
            .bind(id)
            .fetch_one(&pool)
            .await;

    match check {
        Ok(c) => Json(ApiResponse::success(c, "获取质量检查详情成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(
            StatusCode::NOT_FOUND.as_u16(),
            "质量检查不存在",
        )),
        Err(e) => {
            tracing::error!("获取质量检查失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "获取质量检查失败",
            ))
        }
    }
}

async fn create_quality_check(
    State(pool): State<PgPool>,
    Path(project_id): Path<Uuid>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateQualityCheckRequest>,
) -> Json<ApiResponse<QualityCheck>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let check = sqlx::query_as::<_, QualityCheck>(
        only_own_schema_query!("pm", "INSERT INTO pm.quality_checks (id, project_id, check_code, check_name, check_type, phase_id, milestone_id, check_criteria, acceptance_standard, status, created_by, created_at, updated_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', $10, $11, $12, $13) RETURNING *")
    )
    .bind(id)
    .bind(project_id)
    .bind(req.check_code)
    .bind(&req.check_name)
    .bind(req.check_type)
    .bind(req.phase_id)
    .bind(req.milestone_id)
    .bind(req.check_criteria)
    .bind(req.acceptance_standard)
    .bind(req.created_by)
    .bind(effective_tenant_id(&ctx, &claims))
    .bind(now)
    .bind(effective_tenant_id(&ctx, &claims))
    .fetch_one(&pool)
    .await;

    match check {
        Ok(c) => Json(ApiResponse::success(c, "创建质量检查成功")),
        Err(e) => {
            tracing::error!("创建质量检查失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "创建质量检查失败",
            ))
        }
    }
}

async fn update_quality_check(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateQualityCheckRequest>,
) -> Json<ApiResponse<QualityCheck>> {
    let check = sqlx::query_as::<_, QualityCheck>(only_own_schema_query!(
        "pm",
        "UPDATE pm.quality_checks SET
            check_name = COALESCE($1, check_name),
            check_type = COALESCE($2, check_type),
            check_criteria = COALESCE($3, check_criteria),
            acceptance_standard = COALESCE($4, acceptance_standard),
            status = COALESCE($5, status),
            check_date = COALESCE($6, check_date),
            checked_by = COALESCE($7, checked_by),
            result_details = COALESCE($8, result_details),
            nonconformities = COALESCE($9, nonconformities),
            corrective_actions = COALESCE($10, corrective_actions),
            follow_up_date = COALESCE($11, follow_up_date),
            updated_at = $12
        WHERE id = $13 RETURNING *"
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
    .fetch_one(&pool)
    .await;

    match check {
        Ok(c) => Json(ApiResponse::success(c, "更新质量检查成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(
            StatusCode::NOT_FOUND.as_u16(),
            "质量检查不存在",
        )),
        Err(e) => {
            tracing::error!("更新质量检查失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "更新质量检查失败",
            ))
        }
    }
}

async fn get_project_defects(
    State(pool): State<PgPool>,
    Path(project_id): Path<Uuid>,
) -> Json<ApiResponse<Vec<Defect>>> {
    let defects = sqlx::query_as::<_, Defect>(
        only_own_schema_query!("pm", "SELECT id, project_id, check_id, defect_code, defect_name, defect_description, severity, priority, status, assignee, due_date, created_at, updated_at FROM pm.defects WHERE deleted_at IS NULL AND project_id = $1 ORDER BY severity DESC, priority DESC"),
    )
    .bind(project_id)
    .fetch_all(&pool)
    .await;

    match defects {
        Ok(d) => Json(ApiResponse::success(d, "获取缺陷列表成功")),
        Err(e) => {
            tracing::error!("获取缺陷失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "获取缺陷失败",
            ))
        }
    }
}

async fn get_defect(State(pool): State<PgPool>, Path(id): Path<Uuid>) -> Json<ApiResponse<Defect>> {
    let defect = sqlx::query_as::<_, Defect>(
        only_own_schema_query!("pm", "SELECT id, project_id, check_id, defect_code, defect_name, defect_description, severity, priority, status, assignee, due_date, created_at, updated_at FROM pm.defects WHERE deleted_at IS NULL AND id = $1"),
    )
    .bind(id)
    .fetch_one(&pool)
    .await;

    match defect {
        Ok(d) => Json(ApiResponse::success(d, "获取缺陷详情成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(
            StatusCode::NOT_FOUND.as_u16(),
            "缺陷不存在",
        )),
        Err(e) => {
            tracing::error!("获取缺陷失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "获取缺陷失败",
            ))
        }
    }
}

async fn create_defect(
    State(pool): State<PgPool>,
    Path(project_id): Path<Uuid>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateDefectRequest>,
) -> Json<ApiResponse<Defect>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let defect = sqlx::query_as::<_, Defect>(
        only_own_schema_query!("pm", "INSERT INTO pm.defects (id, project_id, check_id, defect_code, defect_name, defect_description, severity, priority, status, assignee, due_date, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open', $9, $10, $11, $12, $13) RETURNING *")
    )
    .bind(id)
    .bind(project_id)
    .bind(req.check_id)
    .bind(req.defect_code)
    .bind(&req.defect_name)
    .bind(req.defect_description)
    .bind(&req.severity)
    .bind(&req.priority)
    .bind(req.assignee)
    .bind(parse_date_opt(&req.due_date))
    .bind(req.created_by)
    .bind(effective_tenant_id(&ctx, &claims))
    .bind(now)
    .bind(effective_tenant_id(&ctx, &claims))
    .fetch_one(&pool)
    .await;

    match defect {
        Ok(d) => Json(ApiResponse::success(d, "创建缺陷成功")),
        Err(e) => {
            tracing::error!("创建缺陷失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "创建缺陷失败",
            ))
        }
    }
}

async fn update_defect(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateDefectRequest>,
) -> Json<ApiResponse<Defect>> {
    let defect = sqlx::query_as::<_, Defect>(
        only_own_schema_query!("pm", "UPDATE pm.defects SET
            defect_name = COALESCE($1, defect_name),
            defect_description = COALESCE($2, defect_description),
            severity = COALESCE($3, severity),
            priority = COALESCE($4, priority),
            status = COALESCE($5, status),
            assignee = COALESCE($6, assignee),
            due_date = COALESCE($7, due_date),
            resolution = COALESCE($8, resolution),
            resolved_at = CASE WHEN COALESCE($5, status) = 'resolved' THEN CURRENT_TIMESTAMP ELSE resolved_at END,
            updated_at = $9
        WHERE id = $10 RETURNING *")
    )
    .bind(req.defect_name)
    .bind(req.defect_description)
    .bind(req.severity)
    .bind(req.priority)
    .bind(req.status)
    .bind(req.assignee)
    .bind(parse_date_opt(&req.due_date))
    .bind(req.resolution)
    .bind(Utc::now())
    .bind(id)
    .fetch_one(&pool)
    .await;

    match defect {
        Ok(d) => Json(ApiResponse::success(d, "更新缺陷成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(
            StatusCode::NOT_FOUND.as_u16(),
            "缺陷不存在",
        )),
        Err(e) => {
            tracing::error!("更新缺陷失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "更新缺陷失败",
            ))
        }
    }
}

async fn delete_defect(State(pool): State<PgPool>, Path(id): Path<Uuid>) -> Json<ApiResponse<()>> {
    let result = sqlx::query(only_own_schema_query!(
        "pm",
        "UPDATE pm.defects SET deleted_at = NOW() WHERE id = $1"
    ))
    .bind(id)
    .execute(&pool)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success((), "删除缺陷成功")),
        Ok(_) => Json(ApiResponse::error(
            StatusCode::NOT_FOUND.as_u16(),
            "缺陷不存在",
        )),
        Err(e) => {
            tracing::error!("删除缺陷失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "删除缺陷失败",
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
    use chrono::Datelike;
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

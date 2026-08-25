use axum::{
    extract::{Extension, Path, State},
    http::{HeaderMap, StatusCode},
    routing::{get, post, put},
    Json, Router,
};
use chrono::Utc;
use sqlx::PgPool;
use topems_shared_core::response::ApiResponse;
use uuid::Uuid;

use crate::models::acceptance::{
    AcceptanceItem, AcceptancePlan, AcceptanceRecord, CreateAcceptanceItemRequest,
    CreateAcceptancePlanRequest, CreateAcceptanceRecordRequest, UpdateAcceptanceItemRequest,
    UpdateAcceptancePlanRequest, UpdateAcceptanceRecordRequest,
};
use crate::services::audit::PmAuditService;

pub fn create_routes(pool: PgPool) -> Router {
    Router::new()
        .route(
            "/projects/{project_id}/acceptance-plans",
            get(get_project_plans).post(create_plan),
        )
        .route("/acceptance-plans/{id}", get(get_plan).put(update_plan))
        .route(
            "/acceptance-plans/{plan_id}/items",
            get(get_plan_items).post(create_plan_item),
        )
        .route(
            "/acceptance-items/{id}",
            put(update_plan_item).delete(delete_plan_item),
        )
        .route(
            "/projects/{project_id}/acceptance-records",
            get(get_project_records),
        )
        .route(
            "/acceptance-records/{id}",
            get(get_record).put(update_record),
        )
        .route("/acceptance-plans/{plan_id}/records", post(create_record))
        .with_state(pool)
}

async fn get_project_plans(
    State(pool): State<PgPool>,
    Path(project_id): Path<Uuid>,
) -> Json<ApiResponse<Vec<AcceptancePlan>>> {
    let plans = sqlx::query_as::<_, AcceptancePlan>(
        "SELECT id, project_id, plan_code, plan_name, acceptance_type, milestone_id, phase_id, acceptance_criteria, expected_date, status, participants, documents_required, created_at, updated_at FROM plugin_pm.acceptance_plans WHERE project_id = $1 ORDER BY expected_date",
    )
    .bind(project_id)
    .fetch_all(&pool)
    .await;

    match plans {
        Ok(p) => Json(ApiResponse::success(p, "获取验收计划列表成功")),
        Err(e) => {
            tracing::error!("获取验收计划失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "获取验收计划失败",
            ))
        }
    }
}

async fn get_plan(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<AcceptancePlan>> {
    let plan = sqlx::query_as::<_, AcceptancePlan>(
        "SELECT id, project_id, plan_code, plan_name, acceptance_type, milestone_id, phase_id, acceptance_criteria, expected_date, status, participants, documents_required, created_at, updated_at FROM plugin_pm.acceptance_plans WHERE id = $1",
    )
    .bind(id)
    .fetch_one(&pool)
    .await;

    match plan {
        Ok(p) => Json(ApiResponse::success(p, "获取验收计划详情成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(
            StatusCode::NOT_FOUND.as_u16(),
            "验收计划不存在",
        )),
        Err(e) => {
            tracing::error!("获取验收计划失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "获取验收计划失败",
            ))
        }
    }
}

async fn create_plan(
    State(pool): State<PgPool>,
    Path(project_id): Path<Uuid>,
    Extension(audit): Extension<PmAuditService>,
    headers: HeaderMap,
    Json(req): Json<CreateAcceptancePlanRequest>,
) -> Json<ApiResponse<AcceptancePlan>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let user_id = headers.get("x-username").and_then(|v| v.to_str().ok());
    let details = Some(
        serde_json::json!({"project_id": project_id, "plan_code": req.plan_code, "plan_name": req.plan_name}),
    );

    let plan = sqlx::query_as::<_, AcceptancePlan>(
        "INSERT INTO plugin_pm.acceptance_plans (id, project_id, plan_code, plan_name, acceptance_type, milestone_id, phase_id, acceptance_criteria, expected_date, status, participants, documents_required, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', $10, $11, $12, $13, $14) RETURNING *"
    )
    .bind(id)
    .bind(project_id)
    .bind(req.plan_code)
    .bind(&req.plan_name)
    .bind(&req.acceptance_type)
    .bind(req.milestone_id)
    .bind(req.phase_id)
    .bind(req.acceptance_criteria)
    .bind(parse_date_opt(&req.expected_date))
    .bind(req.participants)
    .bind(req.documents_required)
    .bind(req.created_by)
    .bind(now)
    .bind(now)
    .fetch_one(&pool)
    .await;

    match plan {
        Ok(p) => {
            if let Err(e) = audit
                .log_project_operation(
                    "create_acceptance_plan",
                    Some(project_id),
                    user_id,
                    details.clone(),
                    "success",
                    None,
                )
                .await
            {
                tracing::warn!("pm audit failed: {e}");
            }
            Json(ApiResponse::success(p, "创建验收计划成功"))
        }
        Err(e) => {
            if let Err(audit_err) = audit
                .log_project_operation(
                    "create_acceptance_plan",
                    Some(project_id),
                    user_id,
                    details,
                    "failed",
                    Some(&e.to_string()),
                )
                .await
            {
                tracing::warn!("pm audit failed: {audit_err}");
            }
            tracing::error!("创建验收计划失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "创建验收计划失败",
            ))
        }
    }
}

async fn update_plan(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Extension(audit): Extension<PmAuditService>,
    headers: HeaderMap,
    Json(req): Json<UpdateAcceptancePlanRequest>,
) -> Json<ApiResponse<AcceptancePlan>> {
    let user_id = headers.get("x-username").and_then(|v| v.to_str().ok());
    let details = Some(serde_json::json!({"status": req.status}));
    let plan = sqlx::query_as::<_, AcceptancePlan>(
        "UPDATE plugin_pm.acceptance_plans SET
            plan_name = COALESCE($1, plan_name),
            acceptance_type = COALESCE($2, acceptance_type),
            acceptance_criteria = COALESCE($3, acceptance_criteria),
            expected_date = COALESCE($4, expected_date),
            status = COALESCE($5, status),
            participants = COALESCE($6, participants),
            documents_required = COALESCE($7, documents_required),
            updated_at = $8
        WHERE id = $9 RETURNING *",
    )
    .bind(req.plan_name)
    .bind(req.acceptance_type)
    .bind(req.acceptance_criteria)
    .bind(parse_date_opt(&req.expected_date))
    .bind(req.status)
    .bind(req.participants)
    .bind(req.documents_required)
    .bind(Utc::now())
    .bind(id)
    .fetch_one(&pool)
    .await;

    match plan {
        Ok(p) => {
            if let Err(e) = audit
                .log_project_operation(
                    "update_acceptance_plan",
                    Some(p.project_id),
                    user_id,
                    details.clone(),
                    "success",
                    None,
                )
                .await
            {
                tracing::warn!("pm audit failed: {e}");
            }
            Json(ApiResponse::success(p, "更新验收计划成功"))
        }
        Err(sqlx::Error::RowNotFound) => {
            if let Err(e) = audit
                .log_project_operation(
                    "update_acceptance_plan",
                    None,
                    user_id,
                    details.clone(),
                    "failed",
                    Some("验收计划不存在"),
                )
                .await
            {
                tracing::warn!("pm audit failed: {e}");
            }
            Json(ApiResponse::error(
                StatusCode::NOT_FOUND.as_u16(),
                "验收计划不存在",
            ))
        }
        Err(e) => {
            if let Err(audit_err) = audit
                .log_project_operation(
                    "update_acceptance_plan",
                    None,
                    user_id,
                    details,
                    "failed",
                    Some(&e.to_string()),
                )
                .await
            {
                tracing::warn!("pm audit failed: {audit_err}");
            }
            tracing::error!("更新验收计划失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "更新验收计划失败",
            ))
        }
    }
}

async fn get_plan_items(
    State(pool): State<PgPool>,
    Path(plan_id): Path<Uuid>,
) -> Json<ApiResponse<Vec<AcceptanceItem>>> {
    let items = sqlx::query_as::<_, AcceptanceItem>(
        "SELECT id, plan_id, item_code, item_name, item_description, required_standard, actual_result, is_passed, created_at FROM plugin_pm.acceptance_items WHERE plan_id = $1 ORDER BY created_at",
    )
    .bind(plan_id)
    .fetch_all(&pool)
    .await;

    match items {
        Ok(i) => Json(ApiResponse::success(i, "获取验收项列表成功")),
        Err(e) => {
            tracing::error!("获取验收项失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "获取验收项失败",
            ))
        }
    }
}

async fn create_plan_item(
    State(pool): State<PgPool>,
    Path(plan_id): Path<Uuid>,
    Json(req): Json<CreateAcceptanceItemRequest>,
) -> Json<ApiResponse<AcceptanceItem>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let item = sqlx::query_as::<_, AcceptanceItem>(
        "INSERT INTO plugin_pm.acceptance_items (id, plan_id, item_code, item_name, item_description, required_standard, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *"
    )
    .bind(id)
    .bind(plan_id)
    .bind(req.item_code)
    .bind(&req.item_name)
    .bind(req.item_description)
    .bind(req.required_standard)
    .bind(now)
    .bind(now)
    .fetch_one(&pool)
    .await;

    match item {
        Ok(i) => Json(ApiResponse::success(i, "创建验收项成功")),
        Err(e) => {
            tracing::error!("创建验收项失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "创建验收项失败",
            ))
        }
    }
}

async fn update_plan_item(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateAcceptanceItemRequest>,
) -> Json<ApiResponse<AcceptanceItem>> {
    let item = sqlx::query_as::<_, AcceptanceItem>(
        "UPDATE plugin_pm.acceptance_items SET
            actual_result = COALESCE($1, actual_result),
            is_passed = COALESCE($2, is_passed),
            comments = COALESCE($3, comments),
            updated_at = $4
        WHERE id = $5 RETURNING *",
    )
    .bind(req.actual_result)
    .bind(req.is_passed)
    .bind(req.comments)
    .bind(Utc::now())
    .bind(id)
    .fetch_one(&pool)
    .await;

    match item {
        Ok(i) => Json(ApiResponse::success(i, "更新验收项成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(
            StatusCode::NOT_FOUND.as_u16(),
            "验收项不存在",
        )),
        Err(e) => {
            tracing::error!("更新验收项失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "更新验收项失败",
            ))
        }
    }
}

async fn delete_plan_item(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<()>> {
    let result = sqlx::query("DELETE FROM plugin_pm.acceptance_items WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success((), "删除验收项成功")),
        Ok(_) => Json(ApiResponse::error(
            StatusCode::NOT_FOUND.as_u16(),
            "验收项不存在",
        )),
        Err(e) => {
            tracing::error!("删除验收项失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "删除验收项失败",
            ))
        }
    }
}

async fn get_project_records(
    State(pool): State<PgPool>,
    Path(project_id): Path<Uuid>,
) -> Json<ApiResponse<Vec<AcceptanceRecord>>> {
    let records = sqlx::query_as::<_, AcceptanceRecord>(
        "id, project_id, plan_id, acceptance_date, status, conclusion, score, accepted_by, attendees, findings, recommendations, created_at, updated_at FROM plugin_pm.acceptance_records WHERE project_id = $1 ORDER BY acceptance_date DESC",
    )
    .bind(project_id)
    .fetch_all(&pool)
    .await;

    match records {
        Ok(r) => Json(ApiResponse::success(r, "获取验收记录列表成功")),
        Err(e) => {
            tracing::error!("获取验收记录失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "获取验收记录失败",
            ))
        }
    }
}

async fn get_record(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<AcceptanceRecord>> {
    let record = sqlx::query_as::<_, AcceptanceRecord>(
        "id, project_id, plan_id, acceptance_date, status, conclusion, score, accepted_by, attendees, findings, recommendations, created_at, updated_at FROM plugin_pm.acceptance_records WHERE id = $1",
    )
    .bind(id)
    .fetch_one(&pool)
    .await;

    match record {
        Ok(r) => Json(ApiResponse::success(r, "获取验收记录详情成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(
            StatusCode::NOT_FOUND.as_u16(),
            "验收记录不存在",
        )),
        Err(e) => {
            tracing::error!("获取验收记录失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "获取验收记录失败",
            ))
        }
    }
}

async fn create_record(
    State(pool): State<PgPool>,
    Path(plan_id): Path<Uuid>,
    Json(req): Json<CreateAcceptanceRecordRequest>,
) -> Json<ApiResponse<AcceptanceRecord>> {
    let plan = sqlx::query_as::<_, AcceptancePlan>(
        "SELECT id, project_id, plan_code, plan_name, acceptance_type, milestone_id, phase_id, acceptance_criteria, expected_date, status, participants, documents_required, created_at, updated_at FROM plugin_pm.acceptance_plans WHERE id = $1",
    )
    .bind(plan_id)
    .fetch_one(&pool)
    .await;

    let plan = match plan {
        Ok(p) => p,
        Err(sqlx::Error::RowNotFound) => {
            return Json(ApiResponse::error(
                StatusCode::NOT_FOUND.as_u16(),
                "验收计划不存在",
            ));
        }
        Err(e) => {
            tracing::error!("获取验收计划失败: {}", e);
            return Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "获取验收计划失败",
            ));
        }
    };

    let id = Uuid::new_v4();
    let now = Utc::now();
    let acceptance_date = parse_date_opt(&Some(req.acceptance_date.clone())).unwrap_or(now);

    let record = sqlx::query_as::<_, AcceptanceRecord>(
        "INSERT INTO plugin_pm.acceptance_records (id, project_id, plan_id, acceptance_date, status, conclusion, score, accepted_by, attendees, findings, recommendations, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *"
    )
    .bind(id)
    .bind(plan.project_id)
    .bind(plan_id)
    .bind(acceptance_date)
    .bind(&req.status)
    .bind(req.conclusion)
    .bind(req.score)
    .bind(req.accepted_by)
    .bind(req.attendees)
    .bind(req.findings)
    .bind(req.recommendations)
    .bind(req.created_by)
    .bind(now)
    .bind(now)
    .fetch_one(&pool)
    .await;

    match record {
        Ok(r) => Json(ApiResponse::success(r, "创建验收记录成功")),
        Err(e) => {
            tracing::error!("创建验收记录失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "创建验收记录失败",
            ))
        }
    }
}

async fn update_record(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateAcceptanceRecordRequest>,
) -> Json<ApiResponse<AcceptanceRecord>> {
    let record = sqlx::query_as::<_, AcceptanceRecord>(
        "UPDATE plugin_pm.acceptance_records SET
            status = COALESCE($1, status),
            conclusion = COALESCE($2, conclusion),
            score = COALESCE($3, score),
            attendees = COALESCE($4, attendees),
            findings = COALESCE($5, findings),
            recommendations = COALESCE($6, recommendations),
            updated_at = $7
        WHERE id = $8 RETURNING *",
    )
    .bind(req.status)
    .bind(req.conclusion)
    .bind(req.score)
    .bind(req.attendees)
    .bind(req.findings)
    .bind(req.recommendations)
    .bind(Utc::now())
    .bind(id)
    .fetch_one(&pool)
    .await;

    match record {
        Ok(r) => Json(ApiResponse::success(r, "更新验收记录成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(
            StatusCode::NOT_FOUND.as_u16(),
            "验收记录不存在",
        )),
        Err(e) => {
            tracing::error!("更新验收记录失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "更新验收记录失败",
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
    fn test_parse_date_opt_some_valid() {
        let s = Some("2024-05-01T12:00:00Z".to_string());
        let r = parse_date_opt(&s);
        assert!(r.is_some());
        assert_eq!(r.unwrap().year(), 2024);
        assert_eq!(r.unwrap().month(), 5);
    }

    #[test]
    fn test_parse_date_opt_some_invalid_returns_none() {
        let s = Some("bad-date".to_string());
        assert!(parse_date_opt(&s).is_none());
    }

    #[test]
    fn test_parse_date_opt_some_empty_string_returns_none() {
        let s = Some("".to_string());
        assert!(parse_date_opt(&s).is_none());
    }
}

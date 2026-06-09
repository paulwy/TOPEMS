use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::get,
    Json,
    Router,
};
use chrono::Utc;
use sqlx::PgPool;
use topems_shared::ApiResponse;
use uuid::Uuid;

use crate::models::quality::{
    QualityCheck,
    Defect,
    CreateDefectRequest,
    CreateQualityCheckRequest,
    UpdateDefectRequest,
    UpdateQualityCheckRequest,
};

pub fn create_routes(pool: PgPool) -> Router {
    Router::new()
        .route("/api/v1/projects/{project_id}/quality-checks", get(get_project_quality_checks).post(create_quality_check))
        .route("/api/v1/quality-checks/{id}", get(get_quality_check).put(update_quality_check))
        .route("/api/v1/projects/{project_id}/defects", get(get_project_defects).post(create_defect))
        .route("/api/v1/defects/{id}", get(get_defect).put(update_defect).delete(delete_defect))
        .with_state(pool)
}

async fn get_project_quality_checks(
    State(pool): State<PgPool>,
    Path(project_id): Path<Uuid>,
) -> Json<ApiResponse<Vec<QualityCheck>>> {
    let checks = sqlx::query_as::<_, QualityCheck>("SELECT * FROM pm.quality_checks WHERE project_id = $1 ORDER BY created_at DESC")
        .bind(project_id)
        .fetch_all(&pool)
        .await;

    match checks {
        Ok(c) => Json(ApiResponse::success(c, "获取质量检查列表成功")),
        Err(e) => {
            tracing::error!("获取质量检查失败: {}", e);
            Json(ApiResponse::error(StatusCode::INTERNAL_SERVER_ERROR.as_u16(), "获取质量检查失败"))
        }
    }
}

async fn get_quality_check(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<QualityCheck>> {
    let check = sqlx::query_as::<_, QualityCheck>("SELECT * FROM pm.quality_checks WHERE id = $1")
        .bind(id)
        .fetch_one(&pool)
        .await;

    match check {
        Ok(c) => Json(ApiResponse::success(c, "获取质量检查详情成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(StatusCode::NOT_FOUND.as_u16(), "质量检查不存在")),
        Err(e) => {
            tracing::error!("获取质量检查失败: {}", e);
            Json(ApiResponse::error(StatusCode::INTERNAL_SERVER_ERROR.as_u16(), "获取质量检查失败"))
        }
    }
}

async fn create_quality_check(
    State(pool): State<PgPool>,
    Path(project_id): Path<Uuid>,
    Json(req): Json<CreateQualityCheckRequest>,
) -> Json<ApiResponse<QualityCheck>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    
    let check = sqlx::query_as::<_, QualityCheck>(
        "INSERT INTO pm.quality_checks (id, project_id, check_code, check_name, check_type, phase_id, milestone_id, check_criteria, acceptance_standard, status, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', $10, $11, $12) RETURNING *"
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
    .bind(now)
    .bind(now)
    .fetch_one(&pool)
    .await;

    match check {
        Ok(c) => Json(ApiResponse::success(c, "创建质量检查成功")),
        Err(e) => {
            tracing::error!("创建质量检查失败: {}", e);
            Json(ApiResponse::error(StatusCode::INTERNAL_SERVER_ERROR.as_u16(), "创建质量检查失败"))
        }
    }
}

async fn update_quality_check(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateQualityCheckRequest>,
) -> Json<ApiResponse<QualityCheck>> {
    let check = sqlx::query_as::<_, QualityCheck>(
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
    )
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
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(StatusCode::NOT_FOUND.as_u16(), "质量检查不存在")),
        Err(e) => {
            tracing::error!("更新质量检查失败: {}", e);
            Json(ApiResponse::error(StatusCode::INTERNAL_SERVER_ERROR.as_u16(), "更新质量检查失败"))
        }
    }
}

async fn get_project_defects(
    State(pool): State<PgPool>,
    Path(project_id): Path<Uuid>,
) -> Json<ApiResponse<Vec<Defect>>> {
    let defects = sqlx::query_as::<_, Defect>("SELECT * FROM pm.defects WHERE project_id = $1 ORDER BY severity DESC, priority DESC")
        .bind(project_id)
        .fetch_all(&pool)
        .await;

    match defects {
        Ok(d) => Json(ApiResponse::success(d, "获取缺陷列表成功")),
        Err(e) => {
            tracing::error!("获取缺陷失败: {}", e);
            Json(ApiResponse::error(StatusCode::INTERNAL_SERVER_ERROR.as_u16(), "获取缺陷失败"))
        }
    }
}

async fn get_defect(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Defect>> {
    let defect = sqlx::query_as::<_, Defect>("SELECT * FROM pm.defects WHERE id = $1")
        .bind(id)
        .fetch_one(&pool)
        .await;

    match defect {
        Ok(d) => Json(ApiResponse::success(d, "获取缺陷详情成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(StatusCode::NOT_FOUND.as_u16(), "缺陷不存在")),
        Err(e) => {
            tracing::error!("获取缺陷失败: {}", e);
            Json(ApiResponse::error(StatusCode::INTERNAL_SERVER_ERROR.as_u16(), "获取缺陷失败"))
        }
    }
}

async fn create_defect(
    State(pool): State<PgPool>,
    Path(project_id): Path<Uuid>,
    Json(req): Json<CreateDefectRequest>,
) -> Json<ApiResponse<Defect>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    
    let defect = sqlx::query_as::<_, Defect>(
        "INSERT INTO pm.defects (id, project_id, check_id, defect_code, defect_name, defect_description, severity, priority, status, assignee, due_date, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open', $9, $10, $11, $12, $13) RETURNING *"
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
    .bind(now)
    .bind(now)
    .fetch_one(&pool)
    .await;

    match defect {
        Ok(d) => Json(ApiResponse::success(d, "创建缺陷成功")),
        Err(e) => {
            tracing::error!("创建缺陷失败: {}", e);
            Json(ApiResponse::error(StatusCode::INTERNAL_SERVER_ERROR.as_u16(), "创建缺陷失败"))
        }
    }
}

async fn update_defect(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateDefectRequest>,
) -> Json<ApiResponse<Defect>> {
    let defect = sqlx::query_as::<_, Defect>(
        "UPDATE pm.defects SET
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
        WHERE id = $10 RETURNING *"
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
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(StatusCode::NOT_FOUND.as_u16(), "缺陷不存在")),
        Err(e) => {
            tracing::error!("更新缺陷失败: {}", e);
            Json(ApiResponse::error(StatusCode::INTERNAL_SERVER_ERROR.as_u16(), "更新缺陷失败"))
        }
    }
}

async fn delete_defect(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<()>> {
    let result = sqlx::query("DELETE FROM pm.defects WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success((), "删除缺陷成功")),
        Ok(_) => Json(ApiResponse::error(StatusCode::NOT_FOUND.as_u16(), "缺陷不存在")),
        Err(e) => {
            tracing::error!("删除缺陷失败: {}", e);
            Json(ApiResponse::error(StatusCode::INTERNAL_SERVER_ERROR.as_u16(), "删除缺陷失败"))
        }
    }
}

fn parse_date_opt(date_str: &Option<String>) -> Option<chrono::DateTime<chrono::Utc>> {
    date_str.as_ref().and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok()).map(|d| d.with_timezone(&chrono::Utc))
}
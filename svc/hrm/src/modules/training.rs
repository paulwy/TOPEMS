use axum::{
    extract::{Path, Query, State},
    routing::*,
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use uuid::Uuid;

use super::ApiState;
use crate::models::{
    CreateTrainingCourseRequest, CreateTrainingPlanRequest, CreateTrainingRecordRequest,
    TrainingCourse, TrainingPaginationParams, TrainingPlan, TrainingRecord,
    UpdateTrainingCourseRequest, UpdateTrainingPlanRequest, UpdateTrainingRecordRequest,
};
use topems_shared_core::response::ApiResponse;

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/training-plans", get(list_plans).post(create_plan))
        .route(
            "/training-plans/{id}",
            get(get_plan).put(update_plan).delete(delete_plan),
        )
        .route("/training-courses", get(list_courses).post(create_course))
        .route(
            "/training-courses/{id}",
            get(get_course).put(update_course).delete(delete_course),
        )
        .route("/training-records", get(list_records).post(create_record))
        .route(
            "/training-records/{id}",
            get(get_record).put(update_record).delete(delete_record),
        )
        .route("/training-courses/{id}/enroll", post(enroll_course))
        .route("/training-courses/{id}/records", get(get_course_records))
        .route(
            "/employees/{id}/training-records",
            get(get_employee_records),
        )
}

async fn list_plans(
    State(state): State<ApiState>,
    Query(params): Query<TrainingPaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, TrainingPlan>(
        r#"
        SELECT id, name, code, description, start_date, end_date, status, budget, created_at, updated_at
        FROM plugin_hrm.training_plans
        WHERE ($1::text IS NULL OR status = $1)
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(plans) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM plugin_hrm.training_plans
                WHERE deleted_at IS NULL AND ($1::text IS NULL OR status = $1)
                "#,
            )
            .bind(&status_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": plans,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取培训计划列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取培训计划列表失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(
                500,
                "获取培训计划列表失败",
            ))
        }
    }
}

async fn create_plan(
    State(state): State<ApiState>,
    Json(req): Json<CreateTrainingPlanRequest>,
) -> Json<ApiResponse<TrainingPlan>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let code = req.code.unwrap_or_else(|| {
        format!(
            "TP{}{}",
            now.timestamp(),
            id.to_string().split('-').next().unwrap_or("")
        )
    });

    let result = sqlx::query_as::<_, TrainingPlan>(
        r#"
        INSERT INTO plugin_hrm.training_plans (id, name, code, description, start_date, end_date, budget, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8, $9)
        RETURNING id, name, code, description, start_date, end_date, status, budget, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.name)
    .bind(&code)
    .bind(&req.description)
    .bind(req.start_date)
    .bind(req.end_date)
    .bind(req.budget)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(plan) => Json(ApiResponse::success(plan, "培训计划创建成功")),
        Err(e) => {
            tracing::error!("创建培训计划失败: {}", e);
            Json(ApiResponse::<TrainingPlan>::error(500, "培训计划创建失败"))
        }
    }
}

async fn get_plan(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let result = sqlx::query_as::<_, TrainingPlan>(
        r#"
        SELECT id, name, code, description, start_date, end_date, status, budget, created_at, updated_at
        FROM plugin_hrm.training_plans WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(plan)) => {
            let courses = sqlx::query_as::<_, TrainingCourse>(
                r#"
                SELECT id, plan_id, name, code, category, level, description, duration_hours,
                       instructor_id, instructor_name, location, max_participants, status,
                       created_at, updated_at
                FROM plugin_hrm.training_courses WHERE plan_id = $1
                ORDER BY created_at DESC
                "#,
            )
            .bind(id)
            .fetch_all(&state.db)
            .await
            .unwrap_or_default();

            Json(ApiResponse::success(
                serde_json::json!({
                    "plan": plan,
                    "courses": courses
                }),
                "获取培训计划成功",
            ))
        }
        Ok(None) => Json(ApiResponse::<serde_json::Value>::error(
            404,
            "培训计划不存在",
        )),
        Err(e) => {
            tracing::error!("获取培训计划失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(
                500,
                "获取培训计划失败",
            ))
        }
    }
}

async fn update_plan(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateTrainingPlanRequest>,
) -> Json<ApiResponse<TrainingPlan>> {
    let now = Utc::now();

    let result = sqlx::query_as::<_, TrainingPlan>(
        r#"
        UPDATE plugin_hrm.training_plans SET
            name = COALESCE($2, name),
            code = COALESCE($3, code),
            description = COALESCE($4, description),
            start_date = COALESCE($5, start_date),
            end_date = COALESCE($6, end_date),
            status = COALESCE($7, status),
            budget = COALESCE($8, budget),
            updated_at = $9
        WHERE id = $1
        RETURNING id, name, code, description, start_date, end_date, status, budget, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.name)
    .bind(&req.code)
    .bind(&req.description)
    .bind(req.start_date)
    .bind(req.end_date)
    .bind(&req.status)
    .bind(req.budget)
    .bind(now)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(plan)) => Json(ApiResponse::success(plan, "培训计划更新成功")),
        Ok(None) => Json(ApiResponse::<TrainingPlan>::error(404, "培训计划不存在")),
        Err(e) => {
            tracing::error!("更新培训计划失败: {}", e);
            Json(ApiResponse::<TrainingPlan>::error(500, "培训计划更新失败"))
        }
    }
}

async fn delete_plan(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    let result =
        sqlx::query("UPDATE plugin_hrm.training_plans SET deleted_at = NOW() WHERE id = $1")
            .bind(id)
            .execute(&state.db)
            .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            Json(ApiResponse::success("".to_string(), "培训计划删除成功"))
        }
        Ok(_) => Json(ApiResponse::<String>::error(404, "培训计划不存在")),
        Err(e) => {
            tracing::error!("删除培训计划失败: {}", e);
            Json(ApiResponse::<String>::error(500, "培训计划删除失败"))
        }
    }
}

async fn list_courses(
    State(state): State<ApiState>,
    Query(params): Query<TrainingPaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let plan_id = params.plan_id;
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, TrainingCourse>(
        r#"
        SELECT id, plan_id, name, code, category, level, description, duration_hours,
               instructor_id, instructor_name, location, max_participants, status,
               created_at, updated_at
        FROM plugin_hrm.training_courses
        WHERE ($1::uuid IS NULL OR plan_id = $1)
          AND ($2::text IS NULL OR status = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(plan_id)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(courses) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM plugin_hrm.training_courses
                WHERE ($1::uuid IS NULL OR plan_id = $1)
                  AND ($2::text IS NULL OR status = $2)
                "#,
            )
            .bind(plan_id)
            .bind(&status_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": courses,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取课程列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取课程列表失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(
                500,
                "获取课程列表失败",
            ))
        }
    }
}

async fn create_course(
    State(state): State<ApiState>,
    Json(req): Json<CreateTrainingCourseRequest>,
) -> Json<ApiResponse<TrainingCourse>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let code = req.code.unwrap_or_else(|| {
        format!(
            "TC{}{}",
            now.timestamp(),
            id.to_string().split('-').next().unwrap_or("")
        )
    });

    let result = sqlx::query_as::<_, TrainingCourse>(
        r#"
        INSERT INTO plugin_hrm.training_courses (
            id, plan_id, name, code, category, level, description, duration_hours,
            instructor_id, instructor_name, location, max_participants, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active', $13, $14)
        RETURNING id, plan_id, name, code, category, level, description, duration_hours,
                  instructor_id, instructor_name, location, max_participants, status,
                  created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(req.plan_id)
    .bind(&req.name)
    .bind(&code)
    .bind(&req.category)
    .bind(&req.level)
    .bind(&req.description)
    .bind(req.duration_hours)
    .bind(req.instructor_id)
    .bind(&req.instructor_name)
    .bind(&req.location)
    .bind(req.max_participants)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(course) => Json(ApiResponse::success(course, "课程创建成功")),
        Err(e) => {
            tracing::error!("创建课程失败: {}", e);
            Json(ApiResponse::<TrainingCourse>::error(500, "课程创建失败"))
        }
    }
}

async fn get_course(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<TrainingCourse>> {
    let result = sqlx::query_as::<_, TrainingCourse>(
        r#"
        SELECT id, plan_id, name, code, category, level, description, duration_hours,
               instructor_id, instructor_name, location, max_participants, status,
               created_at, updated_at
        FROM plugin_hrm.training_courses WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(course)) => Json(ApiResponse::success(course, "获取课程成功")),
        Ok(None) => Json(ApiResponse::<TrainingCourse>::error(404, "课程不存在")),
        Err(e) => {
            tracing::error!("获取课程失败: {}", e);
            Json(ApiResponse::<TrainingCourse>::error(500, "获取课程失败"))
        }
    }
}

async fn update_course(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateTrainingCourseRequest>,
) -> Json<ApiResponse<TrainingCourse>> {
    let now = Utc::now();

    let result = sqlx::query_as::<_, TrainingCourse>(
        r#"
        UPDATE plugin_hrm.training_courses SET
            name = COALESCE($2, name),
            code = COALESCE($3, code),
            category = COALESCE($4, category),
            level = COALESCE($5, level),
            description = COALESCE($6, description),
            duration_hours = COALESCE($7, duration_hours),
            instructor_id = COALESCE($8, instructor_id),
            instructor_name = COALESCE($9, instructor_name),
            location = COALESCE($10, location),
            max_participants = COALESCE($11, max_participants),
            status = COALESCE($12, status),
            updated_at = $13
        WHERE id = $1
        RETURNING id, plan_id, name, code, category, level, description, duration_hours,
                  instructor_id, instructor_name, location, max_participants, status,
                  created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.name)
    .bind(&req.code)
    .bind(&req.category)
    .bind(&req.level)
    .bind(&req.description)
    .bind(req.duration_hours)
    .bind(req.instructor_id)
    .bind(&req.instructor_name)
    .bind(&req.location)
    .bind(req.max_participants)
    .bind(&req.status)
    .bind(now)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(course)) => Json(ApiResponse::success(course, "课程更新成功")),
        Ok(None) => Json(ApiResponse::<TrainingCourse>::error(404, "课程不存在")),
        Err(e) => {
            tracing::error!("更新课程失败: {}", e);
            Json(ApiResponse::<TrainingCourse>::error(500, "课程更新失败"))
        }
    }
}

async fn delete_course(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    let result =
        sqlx::query("UPDATE plugin_hrm.training_courses SET deleted_at = NOW() WHERE id = $1")
            .bind(id)
            .execute(&state.db)
            .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            Json(ApiResponse::success("".to_string(), "课程删除成功"))
        }
        Ok(_) => Json(ApiResponse::<String>::error(404, "课程不存在")),
        Err(e) => {
            tracing::error!("删除课程失败: {}", e);
            Json(ApiResponse::<String>::error(500, "课程删除失败"))
        }
    }
}

async fn list_records(
    State(state): State<ApiState>,
    Query(params): Query<TrainingPaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let course_id = params.course_id;
    let employee_id = params.employee_id;

    let result = sqlx::query_as::<_, TrainingRecord>(
        r#"
        SELECT id, course_id, employee_id, enrollment_date, attendance_status,
               completion_status, score, certificate_no, completed_at, feedback,
               created_at, updated_at
        FROM plugin_hrm.training_records
        WHERE ($1::uuid IS NULL OR course_id = $1)
          AND ($2::uuid IS NULL OR employee_id = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(course_id)
    .bind(employee_id)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(records) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM plugin_hrm.training_records
                WHERE ($1::uuid IS NULL OR course_id = $1)
                  AND ($2::uuid IS NULL OR employee_id = $2)
                "#,
            )
            .bind(course_id)
            .bind(employee_id)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": records,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取培训记录列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取培训记录列表失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(
                500,
                "获取培训记录列表失败",
            ))
        }
    }
}

async fn create_record(
    State(state): State<ApiState>,
    Json(req): Json<CreateTrainingRecordRequest>,
) -> Json<ApiResponse<TrainingRecord>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, TrainingRecord>(
        r#"
        INSERT INTO plugin_hrm.training_records (
            id, course_id, employee_id, enrollment_date, attendance_status, completion_status,
            created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 'registered', 'in_progress', $5, $6)
        RETURNING id, course_id, employee_id, enrollment_date, attendance_status,
                  completion_status, score, certificate_no, completed_at, feedback,
                  created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(req.course_id)
    .bind(req.employee_id)
    .bind(req.enrollment_date)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(record) => Json(ApiResponse::success(record, "培训记录创建成功")),
        Err(e) => {
            tracing::error!("创建培训记录失败: {}", e);
            Json(ApiResponse::<TrainingRecord>::error(
                500,
                "培训记录创建失败",
            ))
        }
    }
}

async fn enroll_course(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    Json(req): Json<EnrollRequest>,
) -> Json<ApiResponse<TrainingRecord>> {
    let record_id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, TrainingRecord>(
        r#"
        INSERT INTO plugin_hrm.training_records (
            id, course_id, employee_id, enrollment_date, attendance_status, completion_status,
            created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 'registered', 'in_progress', $5, $6)
        RETURNING id, course_id, employee_id, enrollment_date, attendance_status,
                  completion_status, score, certificate_no, completed_at, feedback,
                  created_at, updated_at
        "#,
    )
    .bind(record_id)
    .bind(id)
    .bind(req.employee_id)
    .bind(now)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(record) => Json(ApiResponse::success(record, "报名成功")),
        Err(e) => {
            tracing::error!("报名失败: {}", e);
            Json(ApiResponse::<TrainingRecord>::error(500, "报名失败"))
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct EnrollRequest {
    pub employee_id: Uuid,
}

async fn get_record(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<TrainingRecord>> {
    let result = sqlx::query_as::<_, TrainingRecord>(
        r#"
        SELECT id, course_id, employee_id, enrollment_date, attendance_status,
               completion_status, score, certificate_no, completed_at, feedback,
               created_at, updated_at
        FROM plugin_hrm.training_records WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(record)) => Json(ApiResponse::success(record, "获取培训记录成功")),
        Ok(None) => Json(ApiResponse::<TrainingRecord>::error(404, "培训记录不存在")),
        Err(e) => {
            tracing::error!("获取培训记录失败: {}", e);
            Json(ApiResponse::<TrainingRecord>::error(
                500,
                "获取培训记录失败",
            ))
        }
    }
}

async fn update_record(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateTrainingRecordRequest>,
) -> Json<ApiResponse<TrainingRecord>> {
    let now = Utc::now();

    let result = sqlx::query_as::<_, TrainingRecord>(
        r#"
        UPDATE plugin_hrm.training_records SET
            attendance_status = COALESCE($2, attendance_status),
            completion_status = COALESCE($3, completion_status),
            score = COALESCE($4, score),
            certificate_no = COALESCE($5, certificate_no),
            completed_at = COALESCE($6, completed_at),
            feedback = COALESCE($7, feedback),
            updated_at = $8
        WHERE id = $1
        RETURNING id, course_id, employee_id, enrollment_date, attendance_status,
                  completion_status, score, certificate_no, completed_at, feedback,
                  created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.attendance_status)
    .bind(&req.completion_status)
    .bind(req.score)
    .bind(&req.certificate_no)
    .bind(req.completed_at)
    .bind(&req.feedback)
    .bind(now)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(record)) => Json(ApiResponse::success(record, "培训记录更新成功")),
        Ok(None) => Json(ApiResponse::<TrainingRecord>::error(404, "培训记录不存在")),
        Err(e) => {
            tracing::error!("更新培训记录失败: {}", e);
            Json(ApiResponse::<TrainingRecord>::error(
                500,
                "培训记录更新失败",
            ))
        }
    }
}

async fn delete_record(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    let result =
        sqlx::query("UPDATE plugin_hrm.training_records SET deleted_at = NOW() WHERE id = $1")
            .bind(id)
            .execute(&state.db)
            .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            Json(ApiResponse::success("".to_string(), "培训记录删除成功"))
        }
        Ok(_) => Json(ApiResponse::<String>::error(404, "培训记录不存在")),
        Err(e) => {
            tracing::error!("删除培训记录失败: {}", e);
            Json(ApiResponse::<String>::error(500, "培训记录删除失败"))
        }
    }
}

async fn get_course_records(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    Query(params): Query<RecordPaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, TrainingRecord>(
        r#"
        SELECT id, course_id, employee_id, enrollment_date, attendance_status,
               completion_status, score, certificate_no, completed_at, feedback,
               created_at, updated_at
        FROM plugin_hrm.training_records WHERE course_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(id)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(records) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM plugin_hrm.training_records WHERE course_id = $1",
            )
            .bind(id)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": records,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取课程培训记录成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取课程培训记录失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(
                500,
                "获取课程培训记录失败",
            ))
        }
    }
}

async fn get_employee_records(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    Query(params): Query<RecordPaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, TrainingRecord>(
        r#"
        SELECT id, course_id, employee_id, enrollment_date, attendance_status,
               completion_status, score, certificate_no, completed_at, feedback,
               created_at, updated_at
        FROM plugin_hrm.training_records WHERE employee_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(id)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(records) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM training_records WHERE employee_id = $1",
            )
            .bind(id)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": records,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取员工培训记录成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取员工培训记录失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(
                500,
                "获取员工培训记录失败",
            ))
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct RecordPaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_enroll_request_deserialize() {
        let emp = Uuid::new_v4();
        let json = format!(r#"{{"employee_id":"{}"}}"#, emp);
        let req: EnrollRequest = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(req.employee_id, emp);
    }

    #[test]
    fn test_enroll_request_deserialize_nil_uuid() {
        let json = r#"{"employee_id":"00000000-0000-0000-0000-000000000000"}"#;
        let req: EnrollRequest = serde_json::from_str(json).expect("deserialize");
        assert_eq!(req.employee_id, Uuid::nil());
    }

    #[test]
    fn test_record_pagination_params_deserialize_all_none() {
        let json = r#"{}"#;
        let params: RecordPaginationParams = serde_json::from_str(json).expect("deserialize");
        assert!(params.page.is_none());
        assert!(params.page_size.is_none());
    }

    #[test]
    fn test_record_pagination_params_deserialize_all_some() {
        let json = r#"{"page":3,"page_size":25}"#;
        let params: RecordPaginationParams = serde_json::from_str(json).expect("deserialize");
        assert_eq!(params.page, Some(3));
        assert_eq!(params.page_size, Some(25));
    }

    #[test]
    fn test_record_pagination_params_deserialize_partial() {
        let json = r#"{"page_size":50}"#;
        let params: RecordPaginationParams = serde_json::from_str(json).expect("deserialize");
        assert!(params.page.is_none());
        assert_eq!(params.page_size, Some(50));
    }

    #[test]
    fn test_create_routes_returns_router() {
        let _router = create_routes();
    }
}

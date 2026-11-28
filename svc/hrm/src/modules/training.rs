use axum::{
    extract::{Extension, Path, Query, State},
    routing::*,
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use super::ApiState;
use crate::models::{
    CreateTrainingCourseRequest, CreateTrainingPlanRequest, CreateTrainingRecordRequest,
    TrainingCourse, TrainingPaginationParams, TrainingPlan, TrainingRecord,
    UpdateTrainingCourseRequest, UpdateTrainingPlanRequest, UpdateTrainingRecordRequest,
};
use crate::modules::training_attendance_status::TrainingAttendanceStatus;
use crate::modules::training_completion_status::TrainingCompletionStatus;
use crate::modules::training_plan_status::TrainingPlanStatus;
use topems_shared_auth::auth::Claims;
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
        // 培训计划启用/停用、培训记录完成（前端契约 PUT 动作）
        .route("/training-plans/{id}/activate", put(activate_plan))
        .route("/training-plans/{id}/deactivate", put(deactivate_plan))
        .route("/training-records/{id}/complete", put(complete_record))
}

#[utoipa::path(
    get,
    path = "/training-plans",
    tag = "training",
    params(
        ("page" = Option<i64>, Query, description = "页码"),
        ("page_size" = Option<i64>, Query, description = "每页大小"),
        ("plan_id" = Option<Uuid>, Query, description = "计划ID"),
        ("course_id" = Option<Uuid>, Query, description = "课程ID"),
        ("employee_id" = Option<Uuid>, Query, description = "员工ID"),
        ("status" = Option<String>, Query, description = "状态")
    ),
    responses(
        (status = 200, description = "获取培训计划列表成功", body = serde_json::Value),
        (status = 500, description = "服务器错误")
    ),
    security(("bearerAuth" = []))
)]
pub async fn list_plans(
    State(_state): State<ApiState>,
    Query(params): Query<TrainingPaginationParams>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let status_filter = match params.status.as_deref() {
        None => None,
        Some(raw) => match TrainingPlanStatus::parse_filter(raw) {
            Some(status) => Some(status),
            None => return ApiResponse::bad_request("无效的培训计划状态"),
        },
    };

    let result = sqlx::query_as::<_, TrainingPlan>(
        only_own_schema_query!("hrm", r#"
        SELECT id, tenant_id, name, code, description, start_date, end_date, status, budget, created_at, updated_at
        FROM hrm.training_plans
        WHERE deleted_at IS NULL
          AND ($1::text IS NULL OR status = $1)
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        "#),
    )
    .bind(status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(plans) => {
            let count_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "hrm",
                r#"
                SELECT COUNT(*) FROM hrm.training_plans
                WHERE deleted_at IS NULL AND ($1::text IS NULL OR status = $1)
                "#
            ))
            .bind(status_filter)
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);

            ApiResponse::success(
                serde_json::json!({
                    "items": plans,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取培训计划列表成功",
            )
        }
        Err(e) => {
            tracing::error!("获取培训计划列表失败: {}", e);
            ApiResponse::<serde_json::Value>::server_error("获取培训计划列表失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["hrm:training:write"])),
    path = "/training-plans",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "training"
)]
pub async fn create_plan(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<CreateTrainingPlanRequest>,
) -> ApiResponse<TrainingPlan> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let id = Uuid::new_v4();
    let now = Utc::now();
    let claims_tenant = claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok())
        .unwrap_or_else(Uuid::nil);
    let code = req.code.unwrap_or_else(|| {
        format!(
            "TP{}{}",
            now.timestamp(),
            id.to_string().split('-').next().unwrap_or("")
        )
    });

    let result = sqlx::query_as::<_, TrainingPlan>(
        only_own_schema_query!("hrm", r#"
        INSERT INTO hrm.training_plans (id, name, code, description, start_date, end_date, budget, status, created_at, updated_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, tenant_id, name, code, description, start_date, end_date, status, budget, created_at, updated_at
        "#),
    )
    .bind(id)
    .bind(&req.name)
    .bind(&code)
    .bind(&req.description)
    .bind(req.start_date)
    .bind(req.end_date)
    .bind(req.budget)
    .bind(TrainingPlanStatus::DEFAULT.as_db_str())
    .bind(now)
    .bind(now)
    .bind(claims_tenant)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(plan) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return ApiResponse::server_error("提交事务失败");
                }
            }
            ApiResponse::success(plan, "培训计划创建成功")
        }
        Err(e) => {
            tracing::error!("创建培训计划失败: {}", e);
            ApiResponse::<TrainingPlan>::server_error("培训计划创建失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("bearerAuth" = [])),
    path = "/training-plans/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "training"
)]
pub async fn get_plan(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query_as::<_, TrainingPlan>(
        only_own_schema_query!("hrm", r#"
        SELECT id, tenant_id, name, code, description, start_date, end_date, status, budget, created_at, updated_at
        FROM hrm.training_plans WHERE deleted_at IS NULL AND id = $1
        "#),
    )
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(plan)) => {
            let courses = sqlx::query_as::<_, TrainingCourse>(only_own_schema_query!(
                "hrm",
                r#"
                SELECT id, tenant_id, plan_id, name, code, category, level, description, duration_hours,
                       instructor_id, instructor_name, location, max_participants, status,
                       created_at, updated_at
                FROM hrm.training_courses WHERE deleted_at IS NULL AND plan_id = $1
                ORDER BY created_at DESC
                "#
            ))
            .bind(id)
            .fetch_all(&mut **txn)
            .await
            .unwrap_or_default();

            ApiResponse::success(
                serde_json::json!({
                    "plan": plan,
                    "courses": courses
                }),
                "获取培训计划成功",
            )
        }
        Ok(None) => ApiResponse::<serde_json::Value>::not_found("培训计划不存在"),
        Err(e) => {
            tracing::error!("获取培训计划失败: {}", e);
            ApiResponse::<serde_json::Value>::server_error("获取培训计划失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["hrm:training:write"])),
    path = "/training-plans/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "training"
)]
pub async fn update_plan(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<UpdateTrainingPlanRequest>,
) -> ApiResponse<TrainingPlan> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let now = Utc::now();

    let requested_status = match req.status.as_deref() {
        None => None,
        Some(raw) => match TrainingPlanStatus::from_db_str(raw) {
            Some(status) => Some(status),
            None => return ApiResponse::bad_request("无效的培训计划状态"),
        },
    };
    if let Some(target) = requested_status {
        let mut scope = match state.db.scope_with(txn).await {
            Ok(s) => s,
            Err(e) => {
                tracing::error!("打开培训计划读作用域失败: {}", e);
                return ApiResponse::server_error("培训计划更新失败");
            }
        };
        let current: Option<String> = match sqlx::query_scalar(only_own_schema_query!(
            "hrm",
            "SELECT status FROM hrm.training_plans WHERE deleted_at IS NULL AND id = $1"
        ))
        .bind(id)
        .fetch_optional(&mut scope)
        .await
        {
            Ok(v) => v,
            Err(e) => {
                tracing::error!("读取培训计划状态失败: {}", e);
                return ApiResponse::server_error("培训计划更新失败");
            }
        };
        let Some(current) = current else {
            return ApiResponse::not_found("培训计划不存在");
        };
        if !target.can_transition_from(&current) {
            return ApiResponse::bad_request("培训计划状态不允许从当前状态流转");
        }
        drop(scope);
    }

    let result = sqlx::query_as::<_, TrainingPlan>(
        only_own_schema_query!("hrm", r#"
        UPDATE hrm.training_plans SET
            name = COALESCE($2, name),
            code = COALESCE($3, code),
            description = COALESCE($4, description),
            start_date = COALESCE($5, start_date),
            end_date = COALESCE($6, end_date),
            status = COALESCE($7, status),
            budget = COALESCE($8, budget),
            updated_at = $9
        WHERE deleted_at IS NULL AND id = $1
        RETURNING id, tenant_id, name, code, description, start_date, end_date, status, budget, created_at, updated_at
        "#),
    )
    .bind(id)
    .bind(&req.name)
    .bind(&req.code)
    .bind(&req.description)
    .bind(req.start_date)
    .bind(req.end_date)
    .bind(requested_status.map(|s| s.as_db_str()))
    .bind(req.budget)
    .bind(now)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(plan)) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(plan, "培训计划更新成功")
        }
        Ok(None) => ApiResponse::<TrainingPlan>::not_found("培训计划不存在"),
        Err(e) => {
            tracing::error!("更新培训计划失败: {}", e);
            ApiResponse::<TrainingPlan>::server_error("培训计划更新失败")
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["hrm:training:write"])),
    path = "/training-plans/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "training"
)]
pub async fn delete_plan(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<String> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query(only_own_schema_query!(
        "hrm",
        "UPDATE hrm.training_plans SET deleted_at = NOW() WHERE deleted_at IS NULL AND id = $1"
    ))
    .bind(id)
    .execute(&mut **txn)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success("".to_string(), "培训计划删除成功")
        }
        Ok(_) => ApiResponse::<String>::not_found("培训计划不存在"),
        Err(e) => {
            tracing::error!("删除培训计划失败: {}", e);
            ApiResponse::<String>::server_error("培训计划删除失败")
        }
    }
}

#[utoipa::path(
    get,
    path = "/training-courses",
    tag = "training",
    params(
        ("page" = Option<i64>, Query, description = "页码"),
        ("page_size" = Option<i64>, Query, description = "每页大小"),
        ("plan_id" = Option<Uuid>, Query, description = "计划ID"),
        ("course_id" = Option<Uuid>, Query, description = "课程ID"),
        ("employee_id" = Option<Uuid>, Query, description = "员工ID"),
        ("status" = Option<String>, Query, description = "状态")
    ),
    responses(
        (status = 200, description = "获取培训课程列表成功", body = serde_json::Value),
        (status = 500, description = "服务器错误")
    ),
    security(("bearerAuth" = []))
)]
pub async fn list_courses(
    State(_state): State<ApiState>,
    Query(params): Query<TrainingPaginationParams>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let plan_id = params.plan_id;
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, TrainingCourse>(only_own_schema_query!(
        "hrm",
        r#"
        SELECT id, tenant_id, plan_id, name, code, category, level, description, duration_hours,
               instructor_id, instructor_name, location, max_participants, status,
               created_at, updated_at
        FROM hrm.training_courses
        WHERE deleted_at IS NULL
          AND ($1::uuid IS NULL OR plan_id = $1)
          AND ($2::text IS NULL OR status = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#
    ))
    .bind(plan_id)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(courses) => {
            let count_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "hrm",
                r#"
                SELECT COUNT(*) FROM hrm.training_courses
                WHERE deleted_at IS NULL
                  AND ($1::uuid IS NULL OR plan_id = $1)
                  AND ($2::text IS NULL OR status = $2)
                "#
            ))
            .bind(plan_id)
            .bind(&status_filter)
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);

            ApiResponse::success(
                serde_json::json!({
                    "items": courses,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取课程列表成功",
            )
        }
        Err(e) => {
            tracing::error!("获取课程列表失败: {}", e);
            ApiResponse::<serde_json::Value>::server_error("获取课程列表失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["hrm:training:write"])),
    path = "/training-courses",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "training"
)]
pub async fn create_course(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<CreateTrainingCourseRequest>,
) -> ApiResponse<TrainingCourse> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let id = Uuid::new_v4();
    let now = Utc::now();
    let claims_tenant = claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok())
        .unwrap_or_else(Uuid::nil);
    let code = req.code.unwrap_or_else(|| {
        format!(
            "TC{}{}",
            now.timestamp(),
            id.to_string().split('-').next().unwrap_or("")
        )
    });

    let result = sqlx::query_as::<_, TrainingCourse>(
        only_own_schema_query!("hrm", r#"
        INSERT INTO hrm.training_courses (
            id, plan_id, name, code, category, level, description, duration_hours,
            instructor_id, instructor_name, location, max_participants, status, created_at, updated_at, tenant_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active', $13, $14, $15)
        RETURNING id, tenant_id, plan_id, name, code, category, level, description, duration_hours,
                  instructor_id, instructor_name, location, max_participants, status,
                  created_at, updated_at
        "#),
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
    .bind(claims_tenant)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(course) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return ApiResponse::server_error("提交事务失败");
                }
            }
            ApiResponse::success(course, "课程创建成功")
        }
        Err(e) => {
            tracing::error!("创建课程失败: {}", e);
            ApiResponse::<TrainingCourse>::server_error("课程创建失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("bearerAuth" = [])),
    path = "/training-courses/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "training"
)]
pub async fn get_course(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<TrainingCourse> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query_as::<_, TrainingCourse>(only_own_schema_query!(
        "hrm",
        r#"
        SELECT id, tenant_id, plan_id, name, code, category, level, description, duration_hours,
               instructor_id, instructor_name, location, max_participants, status,
               created_at, updated_at
        FROM hrm.training_courses WHERE deleted_at IS NULL AND id = $1
        "#
    ))
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(course)) => ApiResponse::success(course, "获取课程成功"),
        Ok(None) => ApiResponse::<TrainingCourse>::not_found("课程不存在"),
        Err(e) => {
            tracing::error!("获取课程失败: {}", e);
            ApiResponse::<TrainingCourse>::server_error("获取课程失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["hrm:training:write"])),
    path = "/training-courses/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "training"
)]
pub async fn update_course(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<UpdateTrainingCourseRequest>,
) -> ApiResponse<TrainingCourse> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let now = Utc::now();

    let result = sqlx::query_as::<_, TrainingCourse>(only_own_schema_query!(
        "hrm",
        r#"
        UPDATE hrm.training_courses SET
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
        WHERE deleted_at IS NULL AND id = $1
        RETURNING id, tenant_id, plan_id, name, code, category, level, description, duration_hours,
                  instructor_id, instructor_name, location, max_participants, status,
                  created_at, updated_at
        "#
    ))
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
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(course)) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(course, "课程更新成功")
        }
        Ok(None) => ApiResponse::<TrainingCourse>::not_found("课程不存在"),
        Err(e) => {
            tracing::error!("更新课程失败: {}", e);
            ApiResponse::<TrainingCourse>::server_error("课程更新失败")
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["hrm:training:write"])),
    path = "/training-courses/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "training"
)]
pub async fn delete_course(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<String> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query(only_own_schema_query!(
        "hrm",
        "UPDATE hrm.training_courses SET deleted_at = NOW() WHERE deleted_at IS NULL AND id = $1"
    ))
    .bind(id)
    .execute(&mut **txn)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success("".to_string(), "课程删除成功")
        }
        Ok(_) => ApiResponse::<String>::not_found("课程不存在"),
        Err(e) => {
            tracing::error!("删除课程失败: {}", e);
            ApiResponse::<String>::server_error("课程删除失败")
        }
    }
}

#[utoipa::path(
    get,
    path = "/training-records",
    tag = "training",
    params(
        ("page" = Option<i64>, Query, description = "页码"),
        ("page_size" = Option<i64>, Query, description = "每页大小"),
        ("plan_id" = Option<Uuid>, Query, description = "计划ID"),
        ("course_id" = Option<Uuid>, Query, description = "课程ID"),
        ("employee_id" = Option<Uuid>, Query, description = "员工ID"),
        ("status" = Option<String>, Query, description = "状态")
    ),
    responses(
        (status = 200, description = "获取培训记录列表成功", body = serde_json::Value),
        (status = 500, description = "服务器错误")
    ),
    security(("bearerAuth" = []))
)]
pub async fn list_records(
    State(_state): State<ApiState>,
    Query(params): Query<TrainingPaginationParams>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let course_id = params.course_id;
    let employee_id = params.employee_id;
    let status_filter = match params.status.as_deref() {
        None => None,
        Some(raw) => match TrainingCompletionStatus::parse_filter(raw) {
            Some(status) => Some(status),
            None => return ApiResponse::bad_request("无效的培训完成状态"),
        },
    };

    let result = sqlx::query_as::<_, TrainingRecord>(only_own_schema_query!(
        "hrm",
        r#"
        SELECT id, tenant_id, course_id, employee_id, enrollment_date, attendance_status,
               completion_status, score, certificate_no, completed_at, feedback,
               created_at, updated_at
        FROM hrm.training_records
        WHERE deleted_at IS NULL
          AND ($1::uuid IS NULL OR course_id = $1)
          AND ($2::uuid IS NULL OR employee_id = $2)
          AND ($5::text IS NULL OR completion_status = $5)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#
    ))
    .bind(course_id)
    .bind(employee_id)
    .bind(page_size)
    .bind(offset)
    .bind(status_filter)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(records) => {
            let count_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "hrm",
                r#"
                SELECT COUNT(*) FROM hrm.training_records
                WHERE deleted_at IS NULL
                  AND ($1::uuid IS NULL OR course_id = $1)
                  AND ($2::uuid IS NULL OR employee_id = $2)
                  AND ($3::text IS NULL OR completion_status = $3)
                "#
            ))
            .bind(course_id)
            .bind(employee_id)
            .bind(status_filter)
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);

            ApiResponse::success(
                serde_json::json!({
                    "items": records,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取培训记录列表成功",
            )
        }
        Err(e) => {
            tracing::error!("获取培训记录列表失败: {}", e);
            ApiResponse::<serde_json::Value>::server_error("获取培训记录列表失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["hrm:training:write"])),
    path = "/training-records",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "training"
)]
pub async fn create_record(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<CreateTrainingRecordRequest>,
) -> ApiResponse<TrainingRecord> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let id = Uuid::new_v4();
    let now = Utc::now();
    let claims_tenant = claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok())
        .unwrap_or_else(Uuid::nil);

    let result = sqlx::query_as::<_, TrainingRecord>(only_own_schema_query!(
        "hrm",
        r#"
        INSERT INTO hrm.training_records (
            id, tenant_id, course_id, employee_id, enrollment_date, attendance_status, completion_status,
            created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, tenant_id, course_id, employee_id, enrollment_date, attendance_status,
                  completion_status, score, certificate_no, completed_at, feedback,
                  created_at, updated_at
        "#
    ))
    .bind(id)
    .bind(claims_tenant)
    .bind(req.course_id)
    .bind(req.employee_id)
    .bind(req.enrollment_date)
    .bind(TrainingAttendanceStatus::DEFAULT.as_db_str())
    .bind(TrainingCompletionStatus::DEFAULT.as_db_str())
    .bind(now)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(record) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return ApiResponse::server_error("提交事务失败");
                }
            }
            ApiResponse::success(record, "培训记录创建成功")
        }
        Err(e) => {
            tracing::error!("创建培训记录失败: {}", e);
            ApiResponse::<TrainingRecord>::server_error("培训记录创建失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("bearerAuth" = [])),
    path = "/training-courses/{id}/enroll",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "training"
)]
pub async fn enroll_course(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<EnrollRequest>,
) -> ApiResponse<TrainingRecord> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let record_id = Uuid::new_v4();
    let now = Utc::now();
    let claims_tenant = claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok())
        .unwrap_or_else(Uuid::nil);

    let result = sqlx::query_as::<_, TrainingRecord>(only_own_schema_query!(
        "hrm",
        r#"
        INSERT INTO hrm.training_records (
            id, tenant_id, course_id, employee_id, enrollment_date, attendance_status, completion_status,
            created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, tenant_id, course_id, employee_id, enrollment_date, attendance_status,
                  completion_status, score, certificate_no, completed_at, feedback,
                  created_at, updated_at
        "#
    ))
    .bind(record_id)
    .bind(claims_tenant)
    .bind(id)
    .bind(req.employee_id)
    .bind(now)
    .bind(TrainingAttendanceStatus::DEFAULT.as_db_str())
    .bind(TrainingCompletionStatus::DEFAULT.as_db_str())
    .bind(now)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(record) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return ApiResponse::server_error("提交事务失败");
                }
            }
            ApiResponse::success(record, "报名成功")
        }
        Err(e) => {
            tracing::error!("报名失败: {}", e);
            ApiResponse::<TrainingRecord>::server_error("报名失败")
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct EnrollRequest {
    pub employee_id: Uuid,
}

#[utoipa::path(
    get,
    security(("bearerAuth" = [])),
    path = "/training-records/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "training"
)]
pub async fn get_record(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<TrainingRecord> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query_as::<_, TrainingRecord>(only_own_schema_query!(
        "hrm",
        r#"
        SELECT id, tenant_id, course_id, employee_id, enrollment_date, attendance_status,
               completion_status, score, certificate_no, completed_at, feedback,
               created_at, updated_at
        FROM hrm.training_records WHERE deleted_at IS NULL AND id = $1
        "#
    ))
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(record)) => ApiResponse::success(record, "获取培训记录成功"),
        Ok(None) => ApiResponse::<TrainingRecord>::not_found("培训记录不存在"),
        Err(e) => {
            tracing::error!("获取培训记录失败: {}", e);
            ApiResponse::<TrainingRecord>::server_error("获取培训记录失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["hrm:training:write"])),
    path = "/training-records/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "training"
)]
pub async fn update_record(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<UpdateTrainingRecordRequest>,
) -> ApiResponse<TrainingRecord> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let now = Utc::now();

    let requested_attendance = match req.attendance_status.as_deref() {
        None => None,
        Some(raw) => match TrainingAttendanceStatus::from_db_str(raw) {
            Some(status) => Some(status),
            None => return ApiResponse::bad_request("无效的培训出勤状态"),
        },
    };
    let requested_status = match req.completion_status.as_deref() {
        None => None,
        Some(raw) => match TrainingCompletionStatus::from_db_str(raw) {
            Some(status) => Some(status),
            None => return ApiResponse::bad_request("无效的培训完成状态"),
        },
    };
    if requested_attendance.is_some() || requested_status.is_some() {
        let mut scope = match state.db.scope_with(txn).await {
            Ok(s) => s,
            Err(e) => {
                tracing::error!("打开培训记录读作用域失败: {}", e);
                return ApiResponse::server_error("培训记录更新失败");
            }
        };
        let row: Option<(String, String)> = match sqlx::query_as(only_own_schema_query!(
            "hrm",
            "SELECT COALESCE(attendance_status, 'registered'), COALESCE(completion_status, 'in_progress') FROM hrm.training_records WHERE deleted_at IS NULL AND id = $1"
        ))
        .bind(id)
        .fetch_optional(&mut scope)
        .await
        {
            Ok(v) => v,
            Err(e) => {
                tracing::error!("读取培训记录状态失败: {}", e);
                return ApiResponse::server_error("培训记录更新失败");
            }
        };
        let Some((current_attendance, current_status)) = row else {
            return ApiResponse::not_found("培训记录不存在");
        };
        if let Some(target) = requested_attendance {
            if !target.can_transition_from(&current_attendance) {
                return ApiResponse::bad_request("培训出勤状态不允许从当前状态流转");
            }
        }
        if let Some(target) = requested_status {
            if !target.can_transition_from(&current_status) {
                return ApiResponse::bad_request("培训完成状态不允许从当前状态流转");
            }
        }
        drop(scope);
    }

    let result = sqlx::query_as::<_, TrainingRecord>(only_own_schema_query!(
        "hrm",
        r#"
        UPDATE hrm.training_records SET
            attendance_status = COALESCE($2, attendance_status),
            completion_status = COALESCE($3, completion_status),
            score = COALESCE($4, score),
            certificate_no = COALESCE($5, certificate_no),
            completed_at = COALESCE($6, completed_at),
            feedback = COALESCE($7, feedback),
            updated_at = $8
        WHERE deleted_at IS NULL AND id = $1
        RETURNING id, tenant_id, course_id, employee_id, enrollment_date, attendance_status,
                  completion_status, score, certificate_no, completed_at, feedback,
                  created_at, updated_at
        "#
    ))
    .bind(id)
    .bind(requested_attendance.map(|s| s.as_db_str()))
    .bind(requested_status.map(|s| s.as_db_str()))
    .bind(req.score)
    .bind(&req.certificate_no)
    .bind(req.completed_at)
    .bind(&req.feedback)
    .bind(now)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(record)) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(record, "培训记录更新成功")
        }
        Ok(None) => ApiResponse::<TrainingRecord>::not_found("培训记录不存在"),
        Err(e) => {
            tracing::error!("更新培训记录失败: {}", e);
            ApiResponse::<TrainingRecord>::server_error("培训记录更新失败")
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["hrm:training:write"])),
    path = "/training-records/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "training"
)]
pub async fn delete_record(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<String> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query(only_own_schema_query!(
        "hrm",
        "UPDATE hrm.training_records SET deleted_at = NOW() WHERE deleted_at IS NULL AND id = $1"
    ))
    .bind(id)
    .execute(&mut **txn)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success("".to_string(), "培训记录删除成功")
        }
        Ok(_) => ApiResponse::<String>::not_found("培训记录不存在"),
        Err(e) => {
            tracing::error!("删除培训记录失败: {}", e);
            ApiResponse::<String>::server_error("培训记录删除失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("bearerAuth" = [])),
    path = "/training-courses/{id}/records",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "training"
)]
pub async fn get_course_records(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Query(params): Query<RecordPaginationParams>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, TrainingRecord>(only_own_schema_query!(
        "hrm",
        r#"
        SELECT id, tenant_id, course_id, employee_id, enrollment_date, attendance_status,
               completion_status, score, certificate_no, completed_at, feedback,
               created_at, updated_at
        FROM hrm.training_records WHERE deleted_at IS NULL AND course_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        "#
    ))
    .bind(id)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(records) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                only_own_schema_query!("hrm", "SELECT COUNT(*) FROM hrm.training_records WHERE deleted_at IS NULL AND course_id = $1"),
            )
            .bind(id)
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);

            ApiResponse::success(
                serde_json::json!({
                    "items": records,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取课程培训记录成功",
            )
        }
        Err(e) => {
            tracing::error!("获取课程培训记录失败: {}", e);
            ApiResponse::<serde_json::Value>::server_error("获取课程培训记录失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("bearerAuth" = [])),
    path = "/employees/{id}/training-records",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "training"
)]
pub async fn get_employee_records(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Query(params): Query<RecordPaginationParams>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, TrainingRecord>(only_own_schema_query!(
        "hrm",
        r#"
        SELECT id, tenant_id, course_id, employee_id, enrollment_date, attendance_status,
               completion_status, score, certificate_no, completed_at, feedback,
               created_at, updated_at
        FROM hrm.training_records WHERE deleted_at IS NULL AND employee_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        "#
    ))
    .bind(id)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(records) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                only_own_schema_query!("hrm", "SELECT COUNT(*) FROM hrm.training_records WHERE deleted_at IS NULL AND employee_id = $1"),
            )
            .bind(id)
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);

            ApiResponse::success(
                serde_json::json!({
                    "items": records,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取员工培训记录成功",
            )
        }
        Err(e) => {
            tracing::error!("获取员工培训记录失败: {}", e);
            ApiResponse::<serde_json::Value>::server_error("获取员工培训记录失败")
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct RecordPaginationParams {
    pub page: Option<i64>,
    #[serde(alias = "page_size")]
    pub page_size: Option<i64>,
}

// ============================================================================
// 培训计划启用/停用、培训记录完成（前端契约 /training-plans/{id}/activate 等）
// ============================================================================

async fn set_plan_status(
    state: &ApiState,
    txn_arc: &RlsTxnCell,
    id: Uuid,
    status: TrainingPlanStatus,
    message: &str,
) -> ApiResponse<TrainingPlan> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let now = Utc::now();

    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("打开培训计划读作用域失败: {}", e);
            return ApiResponse::server_error("更新培训计划状态失败");
        }
    };
    let current: Option<String> = match sqlx::query_scalar(only_own_schema_query!(
        "hrm",
        "SELECT status FROM hrm.training_plans WHERE deleted_at IS NULL AND id = $1"
    ))
    .bind(id)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("读取培训计划状态失败: {}", e);
            return ApiResponse::server_error("更新培训计划状态失败");
        }
    };
    let Some(current) = current else {
        return ApiResponse::not_found("培训计划不存在");
    };
    if !status.can_transition_from(&current) {
        return ApiResponse::bad_request("培训计划状态不允许从当前状态流转");
    }
    drop(scope);

    let result = sqlx::query_as::<_, TrainingPlan>(
        only_own_schema_query!("hrm", r#"
        UPDATE hrm.training_plans SET
            status = $2,
            updated_at = $3
        WHERE deleted_at IS NULL AND id = $1
        RETURNING id, tenant_id, name, code, description, start_date, end_date, status, budget, created_at, updated_at
        "#),
    )
    .bind(id)
    .bind(status.as_db_str())
    .bind(now)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(plan)) => ApiResponse::success(plan, message),
        Ok(None) => ApiResponse::<TrainingPlan>::not_found("培训计划不存在"),
        Err(e) => {
            tracing::error!("更新培训计划状态失败: {}", e);
            ApiResponse::<TrainingPlan>::server_error("更新培训计划状态失败")
        }
    }
}

/// PUT /training-plans/{id}/activate —— 启用培训计划
#[utoipa::path(
    put,
    security(("BearerAuth" = ["hrm:training:write"])),
    path = "/training-plans/{id}/activate",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "training"
)]
pub async fn activate_plan(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<TrainingPlan> {
    set_plan_status(
        &state,
        &txn_arc,
        id,
        TrainingPlanStatus::Active,
        "培训计划已启用",
    )
    .await
}

/// PUT /training-plans/{id}/deactivate —— 停用培训计划
#[utoipa::path(
    put,
    security(("BearerAuth" = ["hrm:training:write"])),
    path = "/training-plans/{id}/deactivate",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "training"
)]
pub async fn deactivate_plan(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<TrainingPlan> {
    set_plan_status(
        &state,
        &txn_arc,
        id,
        TrainingPlanStatus::Inactive,
        "培训计划已停用",
    )
    .await
}

/// PUT /training-records/{id}/complete —— 标记培训记录完成
#[utoipa::path(
    put,
    security(("BearerAuth" = ["hrm:training:write"])),
    path = "/training-records/{id}/complete",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "training"
)]
pub async fn complete_record(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<TrainingRecord> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let now = Utc::now();

    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("打开培训记录读作用域失败: {}", e);
            return ApiResponse::server_error("更新培训记录状态失败");
        }
    };
    let current: Option<String> = match sqlx::query_scalar(only_own_schema_query!(
        "hrm",
        "SELECT COALESCE(completion_status, 'in_progress') FROM hrm.training_records WHERE deleted_at IS NULL AND id = $1"
    ))
    .bind(id)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("读取培训记录状态失败: {}", e);
            return ApiResponse::server_error("更新培训记录状态失败");
        }
    };
    let Some(current) = current else {
        return ApiResponse::not_found("培训记录不存在");
    };
    if current != TrainingCompletionStatus::InProgress.as_db_str() {
        return ApiResponse::conflict("仅进行中的培训记录可标记完成");
    }
    drop(scope);

    let result = sqlx::query_as::<_, TrainingRecord>(only_own_schema_query!(
        "hrm",
        r#"
        UPDATE hrm.training_records SET
            attendance_status = $3,
            completion_status = 'completed',
            completed_at = $2,
            updated_at = $2
        WHERE deleted_at IS NULL AND id = $1 AND (completion_status IS NULL OR completion_status = 'in_progress')
        RETURNING id, tenant_id, course_id, employee_id, enrollment_date,
                  attendance_status, completion_status, score, certificate_no,
                  completed_at, feedback, created_at, updated_at
        "#
    ))
    .bind(id)
    .bind(now)
    .bind(TrainingAttendanceStatus::Attended.as_db_str())
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(record)) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(record, "培训记录已完成")
        }
        Ok(None) => ApiResponse::<TrainingRecord>::not_found("培训记录不存在"),
        Err(e) => {
            tracing::error!("更新培训记录状态失败: {}", e);
            ApiResponse::<TrainingRecord>::server_error("更新培训记录状态失败")
        }
    }
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

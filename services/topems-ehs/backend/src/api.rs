use anyhow::Result;
use axum::{
    extract::{Path, Query, State},
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use sqlx::postgres::PgPool;
use std::sync::Arc;
use uuid::Uuid;

use crate::models::{
    SafetyHazard, SafetyCheck, EmergencyPlan, DrillRecord,
    CreateSafetyHazardRequest, UpdateSafetyHazardRequest,
    CreateSafetyCheckRequest, UpdateSafetyCheckRequest,
    CreateEmergencyPlanRequest, UpdateEmergencyPlanRequest,
    CreateDrillRecordRequest, UpdateDrillRecordRequest,
};
use topems_shared::{ApiResponse};

#[derive(Debug, Deserialize)]
pub struct ListQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
}

pub struct AppState {
    pub db: PgPool,
}

pub async fn create_hazard_routes(db: PgPool) -> Result<Router> {
    let state = Arc::new(AppState { db });

    let app = Router::new()
        .route("/api/v1/hazards", get(list_hazards).post(create_hazard))
        .route(
            "/api/v1/hazards/{id}",
            get(get_hazard).put(update_hazard).delete(delete_hazard),
        )
        .with_state(state);

    Ok(app)
}

pub async fn create_check_routes(db: PgPool) -> Result<Router> {
    let state = Arc::new(AppState { db });

    let app = Router::new()
        .route("/api/v1/checks", get(list_checks).post(create_check))
        .route(
            "/api/v1/checks/{id}",
            get(get_check).put(update_check).delete(delete_check),
        )
        .with_state(state);

    Ok(app)
}

pub async fn create_plan_routes(db: PgPool) -> Result<Router> {
    let state = Arc::new(AppState { db });

    let app = Router::new()
        .route("/api/v1/plans", get(list_plans).post(create_plan))
        .route(
            "/api/v1/plans/{id}",
            get(get_plan).put(update_plan).delete(delete_plan),
        )
        .with_state(state);

    Ok(app)
}

pub async fn create_drill_routes(db: PgPool) -> Result<Router> {
    let state = Arc::new(AppState { db });

    let app = Router::new()
        .route("/api/v1/drills", get(list_drills).post(create_drill))
        .route(
            "/api/v1/drills/{id}",
            get(get_drill).put(update_drill).delete(delete_drill),
        )
        .with_state(state);

    Ok(app)
}

// ==================== Safety Hazard Handlers ====================

async fn list_hazards(
    State(state): State<Arc<AppState>>,
    Query(params): Query<ListQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, SafetyHazard>(
        r#"
        SELECT id, hazard_no, name, category, level, description, location, risk_assessment, control_measures, status, created_by, created_at, updated_at
        FROM ehs.safety_hazards
        WHERE ($1::text IS NULL OR name ILIKE $1 OR hazard_no ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(hazards) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM ehs.safety_hazards
                WHERE ($1::text IS NULL OR name ILIKE $1 OR hazard_no ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                "#,
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "hazards": hazards,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取危险源列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取危险源列表失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(500, "获取危险源列表失败"))
        }
    }
}

async fn create_hazard(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreateSafetyHazardRequest>,
) -> Json<ApiResponse<SafetyHazard>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let control_measures = serde_json::to_value(&req.control_measures).unwrap_or(serde_json::json!([]));

    let result = sqlx::query_as::<_, SafetyHazard>(
        r#"
        INSERT INTO ehs.safety_hazards (id, hazard_no, name, category, level, description, location, risk_assessment, control_measures, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id, hazard_no, name, category, level, description, location, risk_assessment, control_measures, status, created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.hazard_no)
    .bind(&req.name)
    .bind(&req.category)
    .bind(&req.level)
    .bind(&req.description)
    .bind(&req.location)
    .bind(&req.risk_assessment)
    .bind(control_measures)
    .bind(&req.status)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(hazard) => Json(ApiResponse::success(hazard, "危险源创建成功")),
        Err(e) => {
            tracing::error!("创建危险源失败: {}", e);
            Json(ApiResponse::<SafetyHazard>::error(500, "危险源创建失败"))
        }
    }
}

async fn get_hazard(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<SafetyHazard>> {
    let result = sqlx::query_as::<_, SafetyHazard>(
        r#"
        SELECT id, hazard_no, name, category, level, description, location, risk_assessment, control_measures, status, created_by, created_at, updated_at
        FROM ehs.safety_hazards WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(hazard)) => Json(ApiResponse::success(hazard, "获取危险源成功")),
        Ok(None) => Json(ApiResponse::<SafetyHazard>::error(404, "危险源不存在")),
        Err(e) => {
            tracing::error!("获取危险源失败: {}", e);
            Json(ApiResponse::<SafetyHazard>::error(500, "获取危险源失败"))
        }
    }
}

async fn update_hazard(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateSafetyHazardRequest>,
) -> Json<ApiResponse<SafetyHazard>> {
    let existing = sqlx::query_as::<_, SafetyHazard>(
        "SELECT id, hazard_no, name, category, level, description, location, risk_assessment, control_measures, status, created_by, created_at, updated_at FROM ehs.safety_hazards WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(s)) => s,
        Ok(None) => return Json(ApiResponse::<SafetyHazard>::error(404, "危险源不存在")),
        Err(e) => return Json(ApiResponse::<SafetyHazard>::error(500, &format!("查询危险源失败: {}", e))),
    };

    let hazard_no = req.hazard_no.unwrap_or(existing.hazard_no);
    let name = req.name.unwrap_or(existing.name);
    let category = req.category.unwrap_or(existing.category);
    let level = req.level.unwrap_or(existing.level);
    let description = req.description.or(existing.description);
    let location = req.location.or(existing.location);
    let risk_assessment = req.risk_assessment.or(existing.risk_assessment);
    let control_measures = req.control_measures
        .map(|v| serde_json::to_value(&v).unwrap_or(existing.control_measures.clone()))
        .unwrap_or(existing.control_measures);
    let status = req.status.unwrap_or(existing.status);
    let now = Utc::now();

    let result = sqlx::query_as::<_, SafetyHazard>(
        r#"
        UPDATE ehs.safety_hazards SET
            hazard_no = $2, name = $3, category = $4, level = $5, description = $6, location = $7, risk_assessment = $8, control_measures = $9, status = $10, updated_at = $11
        WHERE id = $1
        RETURNING id, hazard_no, name, category, level, description, location, risk_assessment, control_measures, status, created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(hazard_no)
    .bind(name)
    .bind(category)
    .bind(level)
    .bind(description)
    .bind(location)
    .bind(risk_assessment)
    .bind(control_measures)
    .bind(status)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(hazard) => Json(ApiResponse::success(hazard, "危险源更新成功")),
        Err(e) => {
            tracing::error!("更新危险源失败: {}", e);
            Json(ApiResponse::<SafetyHazard>::error(500, "危险源更新失败"))
        }
    }
}

async fn delete_hazard(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM ehs.safety_hazards WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success("".to_string(), "危险源删除成功")),
        Ok(_) => Json(ApiResponse::<String>::error(404, "危险源不存在")),
        Err(e) => {
            tracing::error!("删除危险源失败: {}", e);
            Json(ApiResponse::<String>::error(500, "危险源删除失败"))
        }
    }
}

// ==================== Safety Check Handlers ====================

async fn list_checks(
    State(state): State<Arc<AppState>>,
    Query(params): Query<ListQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, SafetyCheck>(
        r#"
        SELECT id, check_no, check_type, inspector, check_date, location, result, issues, attachments, status, created_by, created_at, updated_at
        FROM ehs.safety_checks
        WHERE ($1::text IS NULL OR inspector ILIKE $1 OR check_no ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(checks) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM ehs.safety_checks
                WHERE ($1::text IS NULL OR inspector ILIKE $1 OR check_no ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                "#,
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "checks": checks,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取安全检查列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取安全检查列表失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(500, "获取安全检查列表失败"))
        }
    }
}

async fn create_check(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreateSafetyCheckRequest>,
) -> Json<ApiResponse<SafetyCheck>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let issues = serde_json::to_value(&req.issues).unwrap_or(serde_json::json!([]));
    let attachments = req.attachments.map(|v| serde_json::to_value(&v).unwrap_or(serde_json::json!([])));

    let result = sqlx::query_as::<_, SafetyCheck>(
        r#"
        INSERT INTO ehs.safety_checks (id, check_no, check_type, inspector, check_date, location, result, issues, attachments, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id, check_no, check_type, inspector, check_date, location, result, issues, attachments, status, created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.check_no)
    .bind(&req.check_type)
    .bind(&req.inspector)
    .bind(req.check_date)
    .bind(&req.location)
    .bind(&req.result)
    .bind(issues)
    .bind(attachments)
    .bind(&req.status)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(check) => Json(ApiResponse::success(check, "安全检查创建成功")),
        Err(e) => {
            tracing::error!("创建安全检查失败: {}", e);
            Json(ApiResponse::<SafetyCheck>::error(500, "安全检查创建失败"))
        }
    }
}

async fn get_check(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<SafetyCheck>> {
    let result = sqlx::query_as::<_, SafetyCheck>(
        r#"
        SELECT id, check_no, check_type, inspector, check_date, location, result, issues, attachments, status, created_by, created_at, updated_at
        FROM ehs.safety_checks WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(check)) => Json(ApiResponse::success(check, "获取安全检查成功")),
        Ok(None) => Json(ApiResponse::<SafetyCheck>::error(404, "安全检查不存在")),
        Err(e) => {
            tracing::error!("获取安全检查失败: {}", e);
            Json(ApiResponse::<SafetyCheck>::error(500, "获取安全检查失败"))
        }
    }
}

async fn update_check(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateSafetyCheckRequest>,
) -> Json<ApiResponse<SafetyCheck>> {
    let existing = sqlx::query_as::<_, SafetyCheck>(
        "SELECT id, check_no, check_type, inspector, check_date, location, result, issues, attachments, status, created_by, created_at, updated_at FROM ehs.safety_checks WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(s)) => s,
        Ok(None) => return Json(ApiResponse::<SafetyCheck>::error(404, "安全检查不存在")),
        Err(e) => return Json(ApiResponse::<SafetyCheck>::error(500, &format!("查询安全检查失败: {}", e))),
    };

    let check_no = req.check_no.unwrap_or(existing.check_no);
    let check_type = req.check_type.unwrap_or(existing.check_type);
    let inspector = req.inspector.unwrap_or(existing.inspector);
    let check_date = req.check_date.or(existing.check_date);
    let location = req.location.or(existing.location);
    let result = req.result.unwrap_or(existing.result);
    let issues = req.issues
        .map(|v| serde_json::to_value(&v).unwrap_or(existing.issues.clone()))
        .unwrap_or(existing.issues);
    let attachments = req.attachments
        .map(|v| Some(serde_json::to_value(&v).unwrap_or(serde_json::json!([]))))
        .unwrap_or(existing.attachments);
    let status = req.status.unwrap_or(existing.status);
    let now = Utc::now();

    let update_result = sqlx::query_as::<_, SafetyCheck>(
        r#"
        UPDATE ehs.safety_checks SET
            check_no = $2, check_type = $3, inspector = $4, check_date = $5, location = $6, result = $7, issues = $8, attachments = $9, status = $10, updated_at = $11
        WHERE id = $1
        RETURNING id, check_no, check_type, inspector, check_date, location, result, issues, attachments, status, created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(check_no)
    .bind(check_type)
    .bind(inspector)
    .bind(check_date)
    .bind(location)
    .bind(result)
    .bind(issues)
    .bind(attachments)
    .bind(status)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match update_result {
        Ok(check) => Json(ApiResponse::success(check, "安全检查更新成功")),
        Err(e) => {
            tracing::error!("更新安全检查失败: {}", e);
            Json(ApiResponse::<SafetyCheck>::error(500, "安全检查更新失败"))
        }
    }
}

async fn delete_check(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM ehs.safety_checks WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success("".to_string(), "安全检查删除成功")),
        Ok(_) => Json(ApiResponse::<String>::error(404, "安全检查不存在")),
        Err(e) => {
            tracing::error!("删除安全检查失败: {}", e);
            Json(ApiResponse::<String>::error(500, "安全检查删除失败"))
        }
    }
}

// ==================== Emergency Plan Handlers ====================

async fn list_plans(
    State(state): State<Arc<AppState>>,
    Query(params): Query<ListQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, EmergencyPlan>(
        r#"
        SELECT id, plan_no, plan_type, scope, trigger_conditions, response_procedures, responsible_persons, contact_info, status, created_by, created_at, updated_at
        FROM ehs.emergency_plans
        WHERE ($1::text IS NULL OR plan_no ILIKE $1 OR plan_type ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(plans) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM ehs.emergency_plans
                WHERE ($1::text IS NULL OR plan_no ILIKE $1 OR plan_type ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                "#,
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "plans": plans,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取应急预案列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取应急预案列表失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(500, "获取应急预案列表失败"))
        }
    }
}

async fn create_plan(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreateEmergencyPlanRequest>,
) -> Json<ApiResponse<EmergencyPlan>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let responsible_persons = serde_json::to_value(&req.responsible_persons).unwrap_or(serde_json::json!([]));

    let result = sqlx::query_as::<_, EmergencyPlan>(
        r#"
        INSERT INTO ehs.emergency_plans (id, plan_no, plan_type, scope, trigger_conditions, response_procedures, responsible_persons, contact_info, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, plan_no, plan_type, scope, trigger_conditions, response_procedures, responsible_persons, contact_info, status, created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.plan_no)
    .bind(&req.plan_type)
    .bind(&req.scope)
    .bind(&req.trigger_conditions)
    .bind(&req.response_procedures)
    .bind(responsible_persons)
    .bind(&req.contact_info)
    .bind(&req.status)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(plan) => Json(ApiResponse::success(plan, "应急预案创建成功")),
        Err(e) => {
            tracing::error!("创建应急预案失败: {}", e);
            Json(ApiResponse::<EmergencyPlan>::error(500, "应急预案创建失败"))
        }
    }
}

async fn get_plan(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<EmergencyPlan>> {
    let result = sqlx::query_as::<_, EmergencyPlan>(
        r#"
        SELECT id, plan_no, plan_type, scope, trigger_conditions, response_procedures, responsible_persons, contact_info, status, created_by, created_at, updated_at
        FROM ehs.emergency_plans WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(plan)) => Json(ApiResponse::success(plan, "获取应急预案成功")),
        Ok(None) => Json(ApiResponse::<EmergencyPlan>::error(404, "应急预案不存在")),
        Err(e) => {
            tracing::error!("获取应急预案失败: {}", e);
            Json(ApiResponse::<EmergencyPlan>::error(500, "获取应急预案失败"))
        }
    }
}

async fn update_plan(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateEmergencyPlanRequest>,
) -> Json<ApiResponse<EmergencyPlan>> {
    let existing = sqlx::query_as::<_, EmergencyPlan>(
        "SELECT id, plan_no, plan_type, scope, trigger_conditions, response_procedures, responsible_persons, contact_info, status, created_by, created_at, updated_at FROM ehs.emergency_plans WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(s)) => s,
        Ok(None) => return Json(ApiResponse::<EmergencyPlan>::error(404, "应急预案不存在")),
        Err(e) => return Json(ApiResponse::<EmergencyPlan>::error(500, &format!("查询应急预案失败: {}", e))),
    };

    let plan_no = req.plan_no.unwrap_or(existing.plan_no);
    let plan_type = req.plan_type.unwrap_or(existing.plan_type);
    let scope = req.scope.or(existing.scope);
    let trigger_conditions = req.trigger_conditions.or(existing.trigger_conditions);
    let response_procedures = req.response_procedures.or(existing.response_procedures);
    let responsible_persons = req.responsible_persons
        .map(|v| serde_json::to_value(&v).unwrap_or(existing.responsible_persons.clone()))
        .unwrap_or(existing.responsible_persons);
    let contact_info = req.contact_info.or(existing.contact_info);
    let status = req.status.unwrap_or(existing.status);
    let now = Utc::now();

    let result = sqlx::query_as::<_, EmergencyPlan>(
        r#"
        UPDATE ehs.emergency_plans SET
            plan_no = $2, plan_type = $3, scope = $4, trigger_conditions = $5, response_procedures = $6, responsible_persons = $7, contact_info = $8, status = $9, updated_at = $10
        WHERE id = $1
        RETURNING id, plan_no, plan_type, scope, trigger_conditions, response_procedures, responsible_persons, contact_info, status, created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(plan_no)
    .bind(plan_type)
    .bind(scope)
    .bind(trigger_conditions)
    .bind(response_procedures)
    .bind(responsible_persons)
    .bind(contact_info)
    .bind(status)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(plan) => Json(ApiResponse::success(plan, "应急预案更新成功")),
        Err(e) => {
            tracing::error!("更新应急预案失败: {}", e);
            Json(ApiResponse::<EmergencyPlan>::error(500, "应急预案更新失败"))
        }
    }
}

async fn delete_plan(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM ehs.emergency_plans WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success("".to_string(), "应急预案删除成功")),
        Ok(_) => Json(ApiResponse::<String>::error(404, "应急预案不存在")),
        Err(e) => {
            tracing::error!("删除应急预案失败: {}", e);
            Json(ApiResponse::<String>::error(500, "应急预案删除失败"))
        }
    }
}

// ==================== Drill Record Handlers ====================

async fn list_drills(
    State(state): State<Arc<AppState>>,
    Query(params): Query<ListQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));

    let result = sqlx::query_as::<_, DrillRecord>(
        r#"
        SELECT id, plan_id, drill_name, drill_date, participants, duration_hours, location, summary, issues_found, improvements, attachments, created_by, created_at, updated_at
        FROM ehs.drill_records
        WHERE ($1::text IS NULL OR drill_name ILIKE $1)
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(&search_pattern)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(drills) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM ehs.drill_records
                WHERE ($1::text IS NULL OR drill_name ILIKE $1)
                "#,
            )
            .bind(&search_pattern)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "drills": drills,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取演练记录列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取演练记录列表失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(500, "获取演练记录列表失败"))
        }
    }
}

async fn create_drill(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreateDrillRecordRequest>,
) -> Json<ApiResponse<DrillRecord>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let participants = serde_json::to_value(&req.participants).unwrap_or(serde_json::json!([]));
    let attachments = req.attachments.map(|v| serde_json::to_value(&v).unwrap_or(serde_json::json!([])));

    let result = sqlx::query_as::<_, DrillRecord>(
        r#"
        INSERT INTO ehs.drill_records (id, plan_id, drill_name, drill_date, participants, duration_hours, location, summary, issues_found, improvements, attachments, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id, plan_id, drill_name, drill_date, participants, duration_hours, location, summary, issues_found, improvements, attachments, created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(req.plan_id)
    .bind(&req.drill_name)
    .bind(req.drill_date)
    .bind(participants)
    .bind(req.duration_hours)
    .bind(&req.location)
    .bind(&req.summary)
    .bind(&req.issues_found)
    .bind(&req.improvements)
    .bind(attachments)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(drill) => Json(ApiResponse::success(drill, "演练记录创建成功")),
        Err(e) => {
            tracing::error!("创建演练记录失败: {}", e);
            Json(ApiResponse::<DrillRecord>::error(500, "演练记录创建失败"))
        }
    }
}

async fn get_drill(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<DrillRecord>> {
    let result = sqlx::query_as::<_, DrillRecord>(
        r#"
        SELECT id, plan_id, drill_name, drill_date, participants, duration_hours, location, summary, issues_found, improvements, attachments, created_by, created_at, updated_at
        FROM ehs.drill_records WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(drill)) => Json(ApiResponse::success(drill, "获取演练记录成功")),
        Ok(None) => Json(ApiResponse::<DrillRecord>::error(404, "演练记录不存在")),
        Err(e) => {
            tracing::error!("获取演练记录失败: {}", e);
            Json(ApiResponse::<DrillRecord>::error(500, "获取演练记录失败"))
        }
    }
}

async fn update_drill(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateDrillRecordRequest>,
) -> Json<ApiResponse<DrillRecord>> {
    let existing = sqlx::query_as::<_, DrillRecord>(
        "SELECT id, plan_id, drill_name, drill_date, participants, duration_hours, location, summary, issues_found, improvements, attachments, created_by, created_at, updated_at FROM ehs.drill_records WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(s)) => s,
        Ok(None) => return Json(ApiResponse::<DrillRecord>::error(404, "演练记录不存在")),
        Err(e) => return Json(ApiResponse::<DrillRecord>::error(500, &format!("查询演练记录失败: {}", e))),
    };

    let plan_id = req.plan_id.or(existing.plan_id);
    let drill_name = req.drill_name.unwrap_or(existing.drill_name);
    let drill_date = req.drill_date.or(existing.drill_date);
    let participants = req.participants
        .map(|v| serde_json::to_value(&v).unwrap_or(existing.participants.clone()))
        .unwrap_or(existing.participants);
    let duration_hours = req.duration_hours.unwrap_or(existing.duration_hours);
    let location = req.location.or(existing.location);
    let summary = req.summary.or(existing.summary);
    let issues_found = req.issues_found.or(existing.issues_found);
    let improvements = req.improvements.or(existing.improvements);
    let attachments = req.attachments
        .map(|v| Some(serde_json::to_value(&v).unwrap_or(serde_json::json!([]))))
        .unwrap_or(existing.attachments);
    let now = Utc::now();

    let result = sqlx::query_as::<_, DrillRecord>(
        r#"
        UPDATE ehs.drill_records SET
            plan_id = $2, drill_name = $3, drill_date = $4, participants = $5, duration_hours = $6, location = $7, summary = $8, issues_found = $9, improvements = $10, attachments = $11, updated_at = $12
        WHERE id = $1
        RETURNING id, plan_id, drill_name, drill_date, participants, duration_hours, location, summary, issues_found, improvements, attachments, created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(plan_id)
    .bind(drill_name)
    .bind(drill_date)
    .bind(participants)
    .bind(duration_hours)
    .bind(location)
    .bind(summary)
    .bind(issues_found)
    .bind(improvements)
    .bind(attachments)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(drill) => Json(ApiResponse::success(drill, "演练记录更新成功")),
        Err(e) => {
            tracing::error!("更新演练记录失败: {}", e);
            Json(ApiResponse::<DrillRecord>::error(500, "演练记录更新失败"))
        }
    }
}

async fn delete_drill(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM ehs.drill_records WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success("".to_string(), "演练记录删除成功")),
        Ok(_) => Json(ApiResponse::<String>::error(404, "演练记录不存在")),
        Err(e) => {
            tracing::error!("删除演练记录失败: {}", e);
            Json(ApiResponse::<String>::error(500, "演练记录删除失败"))
        }
    }
}

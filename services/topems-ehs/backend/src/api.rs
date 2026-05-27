use axum::{
    extract::{Path, State},
    Json,
};
use chrono::Utc;
use uuid::Uuid;

use crate::{
    models::{
        SafetyHazard, SafetyCheck, EmergencyPlan, DrillRecord,
        CreateSafetyHazardRequest, UpdateSafetyHazardRequest,
        CreateSafetyCheckRequest, UpdateSafetyCheckRequest,
        CreateEmergencyPlanRequest, UpdateEmergencyPlanRequest,
        CreateDrillRecordRequest, UpdateDrillRecordRequest,
    },
    AppState,
};
use topems_shared::ApiResponse;

pub async fn list_hazards(State(state): State<AppState>) -> Json<ApiResponse<Vec<SafetyHazard>>> {
    let hazards = state.hazards.lock().unwrap().clone();
    Json(ApiResponse::success(hazards, "获取危险源列表成功"))
}

pub async fn create_hazard(
    State(state): State<AppState>,
    Json(req): Json<CreateSafetyHazardRequest>,
) -> Json<ApiResponse<SafetyHazard>> {
    let hazard = SafetyHazard {
        id: Uuid::new_v4(),
        hazard_no: req.hazard_no,
        name: req.name,
        category: req.category,
        level: req.level,
        description: req.description,
        location: req.location,
        risk_assessment: req.risk_assessment,
        control_measures: req.control_measures,
        status: req.status,
        created_by: None,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };
    
    state.hazards.lock().unwrap().push(hazard.clone());
    Json(ApiResponse::success(hazard, "创建危险源成功"))
}

pub async fn get_hazard(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<SafetyHazard>> {
    if let Some(hazard) = state.hazards.lock().unwrap().iter().find(|h| h.id == id) {
        Json(ApiResponse::success(hazard.clone(), "获取危险源成功"))
    } else {
        Json(ApiResponse::<SafetyHazard>::error(404, "危险源不存在"))
    }
}

pub async fn update_hazard(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateSafetyHazardRequest>,
) -> Json<ApiResponse<SafetyHazard>> {
    let mut hazards = state.hazards.lock().unwrap();
    if let Some(hazard) = hazards.iter_mut().find(|h| h.id == id) {
        if let Some(hazard_no) = req.hazard_no {
            hazard.hazard_no = hazard_no;
        }
        if let Some(name) = req.name {
            hazard.name = name;
        }
        if let Some(category) = req.category {
            hazard.category = category;
        }
        if let Some(level) = req.level {
            hazard.level = level;
        }
        if let Some(description) = req.description {
            hazard.description = Some(description);
        }
        if let Some(location) = req.location {
            hazard.location = Some(location);
        }
        if let Some(risk_assessment) = req.risk_assessment {
            hazard.risk_assessment = Some(risk_assessment);
        }
        if let Some(control_measures) = req.control_measures {
            hazard.control_measures = control_measures;
        }
        if let Some(status) = req.status {
            hazard.status = status;
        }
        hazard.updated_at = Utc::now();
        Json(ApiResponse::success(hazard.clone(), "更新危险源成功"))
    } else {
        Json(ApiResponse::<SafetyHazard>::error(404, "危险源不存在"))
    }
}

pub async fn delete_hazard(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<()>> {
    let mut hazards = state.hazards.lock().unwrap();
    if let Some(pos) = hazards.iter().position(|h| h.id == id) {
        hazards.remove(pos);
        Json(ApiResponse::success((), "删除危险源成功"))
    } else {
        Json(ApiResponse::<()>::error(404, "危险源不存在"))
    }
}

pub async fn list_checks(State(state): State<AppState>) -> Json<ApiResponse<Vec<SafetyCheck>>> {
    let checks = state.checks.lock().unwrap().clone();
    Json(ApiResponse::success(checks, "获取安全检查列表成功"))
}

pub async fn create_check(
    State(state): State<AppState>,
    Json(req): Json<CreateSafetyCheckRequest>,
) -> Json<ApiResponse<SafetyCheck>> {
    let check = SafetyCheck {
        id: Uuid::new_v4(),
        check_no: req.check_no,
        check_type: req.check_type,
        inspector: req.inspector,
        check_date: req.check_date,
        location: req.location,
        result: req.result,
        issues: req.issues,
        attachments: req.attachments,
        status: req.status,
        created_by: None,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };
    
    state.checks.lock().unwrap().push(check.clone());
    Json(ApiResponse::success(check, "创建安全检查成功"))
}

pub async fn get_check(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<SafetyCheck>> {
    if let Some(check) = state.checks.lock().unwrap().iter().find(|c| c.id == id) {
        Json(ApiResponse::success(check.clone(), "获取安全检查成功"))
    } else {
        Json(ApiResponse::<SafetyCheck>::error(404, "安全检查不存在"))
    }
}

pub async fn update_check(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateSafetyCheckRequest>,
) -> Json<ApiResponse<SafetyCheck>> {
    let mut checks = state.checks.lock().unwrap();
    if let Some(check) = checks.iter_mut().find(|c| c.id == id) {
        if let Some(check_no) = req.check_no {
            check.check_no = check_no;
        }
        if let Some(check_type) = req.check_type {
            check.check_type = check_type;
        }
        if let Some(inspector) = req.inspector {
            check.inspector = inspector;
        }
        if let Some(check_date) = req.check_date {
            check.check_date = Some(check_date);
        }
        if let Some(location) = req.location {
            check.location = Some(location);
        }
        if let Some(result) = req.result {
            check.result = result;
        }
        if let Some(issues) = req.issues {
            check.issues = issues;
        }
        if let Some(attachments) = req.attachments {
            check.attachments = Some(attachments);
        }
        if let Some(status) = req.status {
            check.status = status;
        }
        check.updated_at = Utc::now();
        Json(ApiResponse::success(check.clone(), "更新安全检查成功"))
    } else {
        Json(ApiResponse::<SafetyCheck>::error(404, "安全检查不存在"))
    }
}

pub async fn delete_check(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<()>> {
    let mut checks = state.checks.lock().unwrap();
    if let Some(pos) = checks.iter().position(|c| c.id == id) {
        checks.remove(pos);
        Json(ApiResponse::success((), "删除安全检查成功"))
    } else {
        Json(ApiResponse::<()>::error(404, "安全检查不存在"))
    }
}

pub async fn list_plans(State(state): State<AppState>) -> Json<ApiResponse<Vec<EmergencyPlan>>> {
    let plans = state.plans.lock().unwrap().clone();
    Json(ApiResponse::success(plans, "获取应急预案列表成功"))
}

pub async fn create_plan(
    State(state): State<AppState>,
    Json(req): Json<CreateEmergencyPlanRequest>,
) -> Json<ApiResponse<EmergencyPlan>> {
    let plan = EmergencyPlan {
        id: Uuid::new_v4(),
        plan_no: req.plan_no,
        name: req.name,
        plan_type: req.plan_type,
        scope: req.scope,
        trigger_conditions: req.trigger_conditions,
        response_procedures: req.response_procedures,
        responsible_persons: req.responsible_persons,
        contact_info: req.contact_info,
        status: req.status,
        created_by: None,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };
    
    state.plans.lock().unwrap().push(plan.clone());
    Json(ApiResponse::success(plan, "创建应急预案成功"))
}

pub async fn get_plan(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<EmergencyPlan>> {
    if let Some(plan) = state.plans.lock().unwrap().iter().find(|p| p.id == id) {
        Json(ApiResponse::success(plan.clone(), "获取应急预案成功"))
    } else {
        Json(ApiResponse::<EmergencyPlan>::error(404, "应急预案不存在"))
    }
}

pub async fn update_plan(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateEmergencyPlanRequest>,
) -> Json<ApiResponse<EmergencyPlan>> {
    let mut plans = state.plans.lock().unwrap();
    if let Some(plan) = plans.iter_mut().find(|p| p.id == id) {
        if let Some(plan_no) = req.plan_no {
            plan.plan_no = plan_no;
        }
        if let Some(name) = req.name {
            plan.name = name;
        }
        if let Some(plan_type) = req.plan_type {
            plan.plan_type = plan_type;
        }
        if let Some(scope) = req.scope {
            plan.scope = Some(scope);
        }
        if let Some(trigger_conditions) = req.trigger_conditions {
            plan.trigger_conditions = Some(trigger_conditions);
        }
        if let Some(response_procedures) = req.response_procedures {
            plan.response_procedures = Some(response_procedures);
        }
        if let Some(responsible_persons) = req.responsible_persons {
            plan.responsible_persons = responsible_persons;
        }
        if let Some(contact_info) = req.contact_info {
            plan.contact_info = Some(contact_info);
        }
        if let Some(status) = req.status {
            plan.status = status;
        }
        plan.updated_at = Utc::now();
        Json(ApiResponse::success(plan.clone(), "更新应急预案成功"))
    } else {
        Json(ApiResponse::<EmergencyPlan>::error(404, "应急预案不存在"))
    }
}

pub async fn delete_plan(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<()>> {
    let mut plans = state.plans.lock().unwrap();
    if let Some(pos) = plans.iter().position(|p| p.id == id) {
        plans.remove(pos);
        Json(ApiResponse::success((), "删除应急预案成功"))
    } else {
        Json(ApiResponse::<()>::error(404, "应急预案不存在"))
    }
}

pub async fn list_drills(State(state): State<AppState>) -> Json<ApiResponse<Vec<DrillRecord>>> {
    let drills = state.drills.lock().unwrap().clone();
    Json(ApiResponse::success(drills, "获取演练记录列表成功"))
}

pub async fn create_drill(
    State(state): State<AppState>,
    Json(req): Json<CreateDrillRecordRequest>,
) -> Json<ApiResponse<DrillRecord>> {
    let drill = DrillRecord {
        id: Uuid::new_v4(),
        plan_id: req.plan_id,
        drill_name: req.drill_name,
        drill_date: req.drill_date,
        participants: req.participants,
        duration_hours: req.duration_hours,
        location: req.location,
        summary: req.summary,
        issues_found: req.issues_found,
        improvements: req.improvements,
        attachments: req.attachments,
        created_by: None,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };
    
    state.drills.lock().unwrap().push(drill.clone());
    Json(ApiResponse::success(drill, "创建演练记录成功"))
}

pub async fn get_drill(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<DrillRecord>> {
    if let Some(drill) = state.drills.lock().unwrap().iter().find(|d| d.id == id) {
        Json(ApiResponse::success(drill.clone(), "获取演练记录成功"))
    } else {
        Json(ApiResponse::<DrillRecord>::error(404, "演练记录不存在"))
    }
}

pub async fn update_drill(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateDrillRecordRequest>,
) -> Json<ApiResponse<DrillRecord>> {
    let mut drills = state.drills.lock().unwrap();
    if let Some(drill) = drills.iter_mut().find(|d| d.id == id) {
        if let Some(plan_id) = req.plan_id {
            drill.plan_id = Some(plan_id);
        }
        if let Some(drill_name) = req.drill_name {
            drill.drill_name = drill_name;
        }
        if let Some(drill_date) = req.drill_date {
            drill.drill_date = Some(drill_date);
        }
        if let Some(participants) = req.participants {
            drill.participants = participants;
        }
        if let Some(duration_hours) = req.duration_hours {
            drill.duration_hours = duration_hours;
        }
        if let Some(location) = req.location {
            drill.location = Some(location);
        }
        if let Some(summary) = req.summary {
            drill.summary = Some(summary);
        }
        if let Some(issues_found) = req.issues_found {
            drill.issues_found = Some(issues_found);
        }
        if let Some(improvements) = req.improvements {
            drill.improvements = Some(improvements);
        }
        if let Some(attachments) = req.attachments {
            drill.attachments = Some(attachments);
        }
        drill.updated_at = Utc::now();
        Json(ApiResponse::success(drill.clone(), "更新演练记录成功"))
    } else {
        Json(ApiResponse::<DrillRecord>::error(404, "演练记录不存在"))
    }
}

pub async fn delete_drill(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<()>> {
    let mut drills = state.drills.lock().unwrap();
    if let Some(pos) = drills.iter().position(|d| d.id == id) {
        drills.remove(pos);
        Json(ApiResponse::success((), "删除演练记录成功"))
    } else {
        Json(ApiResponse::<()>::error(404, "演练记录不存在"))
    }
}

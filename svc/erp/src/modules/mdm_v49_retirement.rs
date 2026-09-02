use axum::{extract::Path, extract::Query, extract::State, Json};
use serde::Deserialize;
use topems_shared::ApiResponse;
use topems_shared_core::response::PaginatedResponse;

use super::super::ApiState;
use super::mdm_v49_types::*;

// ==================== 处理器：退役管理 ====================

#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:master-data:write"])),
    path = "/api/erp/mdm-v49/retirement/plans",
    tag = "Master Data",
    operation_id = "create_retirement_plan",
    responses((status = 200, description = "OK")),
)]
pub async fn create_retirement_plan(
    State(_state): State<ApiState>,
    Json(req): Json<RetirementPlanRequest>,
) -> Json<ApiResponse<RetirementPlan>> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let mut plans = store.retirement_plans.lock().await;

    let now = chrono::Utc::now().to_rfc3339();
    let plan = RetirementPlan {
        id: uuid::Uuid::new_v4().to_string(),
        master_data_id: req.master_data_id,
        entity_type: req.entity_type,
        entity_code: req.entity_code,
        entity_name: req.entity_name,
        planned_sunset_at: req.planned_sunset_at,
        planned_archived_at: req.planned_archived_at,
        impact_assessment: ImpactAssessment {
            total_references: 0,
            referencing_services: Vec::new(),
            dependent_workflows: Vec::new(),
            affected_reports: Vec::new(),
            data_loss_risk: "unknown".to_string(),
            rollback_possible: true,
            mitigation_steps: vec![
                "评估下游依赖".to_string(),
                "通知相关方".to_string(),
                "准备回滚方案".to_string(),
            ],
            risk_level: "medium".to_string(),
        },
        notify_channels: req
            .notify_channels
            .unwrap_or_else(|| vec!["email".to_string()]),
        notify_status: "pending".to_string(),
        status: RetirementStatus::Draft,
        initiated_by: req.initiated_by.unwrap_or_else(|| "system".to_string()),
        initiated_at: now,
        confirmed_by: None,
        confirmed_at: None,
        executed_at: None,
        rollback_window_days: req.rollback_window_days.unwrap_or(14),
        post_retirement_review_at: None,
    };

    plans.push(plan.clone());
    Json(ApiResponse::success(plan, "退役计划已创建"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/mdm-v49/list-retirement-plans",
    tag = "MdmV49",
    operation_id = "list_retirement_plans",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn list_retirement_plans(
    State(_state): State<ApiState>,
    Query(params): Query<RetirementPlanQuery>,
) -> Json<ApiResponse<PaginatedResponse<RetirementPlan>>> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let plans = store.retirement_plans.lock().await;

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);

    let mut filtered: Vec<RetirementPlan> = plans
        .iter()
        .filter(|p| {
            if let Some(s) = &params.status {
                let expected = RetirementStatus::from_str(s);
                if p.status != expected {
                    return false;
                }
            }
            if let Some(t) = &params.entity_type {
                if &p.entity_type != t {
                    return false;
                }
            }
            if let Some(k) = &params.keyword {
                let hay = format!("{} {} {}", p.entity_code, p.entity_name, p.master_data_id);
                if !hay.contains(k.as_str()) {
                    return false;
                }
            }
            true
        })
        .cloned()
        .collect();

    filtered.sort_by(|a, b| b.initiated_at.cmp(&a.initiated_at));

    let total = filtered.len() as i64;
    let items: Vec<RetirementPlan> = filtered
        .into_iter()
        .skip(((page - 1) * page_size) as usize)
        .take(page_size as usize)
        .collect();

    Json(ApiResponse::success(
        PaginatedResponse {
            items,
            total,
            page,
            page_size,
            total_pages: topems_shared_core::response::total_pages_of(total, page_size),
        },
        "退役计划列表",
    ))
}

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct RetirementPlanQuery {
    pub status: Option<String>,
    pub entity_type: Option<String>,
    pub keyword: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

impl RetirementStatus {
    fn from_str(s: &str) -> Self {
        match s {
            "impact_assessed" => Self::ImpactAssessed,
            "stakeholder_notified" => Self::StakeholderNotified,
            "confirmed" => Self::Confirmed,
            "executing" => Self::Executing,
            "completed" => Self::Completed,
            "rolled_back" => Self::RolledBack,
            "cancelled" => Self::Cancelled,
            _ => Self::Draft,
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/api/erp/mdm-v49/retirement/plans/{plan_id}",
    tag = "Master Data",
    operation_id = "get_retirement_plan",
    responses((status = 200, description = "OK")),
)]
pub async fn get_retirement_plan(
    State(_state): State<ApiState>,
    Path(plan_id): Path<String>,
) -> Json<ApiResponse<RetirementPlan>> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let plans = store.retirement_plans.lock().await;
    match plans.iter().find(|p| p.id == plan_id) {
        Some(p) => Json(ApiResponse::success(p.clone(), "退役计划")),
        None => Json(ApiResponse::error(404, "未找到退役计划")),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/api/erp/mdm-v49/retirement/plans/{plan_id}/assess",
    tag = "Master Data",
    operation_id = "assess_impact",
    responses((status = 200, description = "OK")),
)]
pub async fn assess_impact(
    State(_state): State<ApiState>,
    Path(plan_id): Path<String>,
) -> Json<ApiResponse<RetirementPlan>> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let mut plans = store.retirement_plans.lock().await;
    let Some(plan) = plans.iter_mut().find(|p| p.id == plan_id) else {
        return Json(ApiResponse::error(404, "未找到退役计划"));
    };

    // 简化版影响评估：基于实体类型模拟下游依赖
    let services = match plan.entity_type.as_str() {
        "customer" => vec!["finance".to_string(), "sales".to_string(), "ar".to_string()],
        "supplier" => vec![
            "purchase".to_string(),
            "finance".to_string(),
            "ap".to_string(),
        ],
        "product" => vec![
            "inventory".to_string(),
            "sales".to_string(),
            "production".to_string(),
        ],
        _ => vec!["erp".to_string()],
    };
    let workflows = vec!["主数据同步".to_string(), "报表统计".to_string()];
    let total_refs = services.len() as i64 * 3 + 2;

    plan.impact_assessment = ImpactAssessment {
        total_references: total_refs,
        referencing_services: services,
        dependent_workflows: workflows,
        affected_reports: vec!["主数据统计报表".to_string()],
        data_loss_risk: "low".to_string(),
        rollback_possible: true,
        mitigation_steps: vec![
            "通知下游服务负责人".to_string(),
            "设置 2 周只读缓冲期".to_string(),
            "准备替代实体映射".to_string(),
            "保留历史数据 7 年".to_string(),
        ],
        risk_level: if total_refs > 10 {
            "high".to_string()
        } else {
            "medium".to_string()
        },
    };
    plan.status = RetirementStatus::ImpactAssessed;

    Json(ApiResponse::success(plan.clone(), "影响评估已完成"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/api/erp/mdm-v49/retirement/plans/{plan_id}/notify",
    tag = "Master Data",
    operation_id = "notify_stakeholders",
    responses((status = 200, description = "OK")),
)]
pub async fn notify_stakeholders(
    State(_state): State<ApiState>,
    Path(plan_id): Path<String>,
) -> Json<ApiResponse<RetirementPlan>> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let mut plans = store.retirement_plans.lock().await;
    let Some(plan) = plans.iter_mut().find(|p| p.id == plan_id) else {
        return Json(ApiResponse::error(404, "未找到退役计划"));
    };

    plan.notify_status = "sent".to_string();
    plan.status = RetirementStatus::StakeholderNotified;

    Json(ApiResponse::success(
        plan.clone(),
        &format!("已通过 {:?} 通知相关方", plan.notify_channels),
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/api/erp/mdm-v49/retirement/plans/{plan_id}/confirm",
    tag = "Master Data",
    operation_id = "confirm_retirement_plan",
    responses((status = 200, description = "OK")),
)]
pub async fn confirm_retirement_plan(
    State(_state): State<ApiState>,
    Path(plan_id): Path<String>,
    Json(req): Json<RetirementConfirmRequest>,
) -> Json<ApiResponse<RetirementPlan>> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let mut plans = store.retirement_plans.lock().await;
    let Some(plan) = plans.iter_mut().find(|p| p.id == plan_id) else {
        return Json(ApiResponse::error(404, "未找到退役计划"));
    };

    plan.confirmed_by = Some(req.confirmed_by);
    plan.confirmed_at = Some(chrono::Utc::now().to_rfc3339());
    plan.status = RetirementStatus::Confirmed;

    Json(ApiResponse::success(plan.clone(), "退役计划已确认"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/erp/mdm-v49/execute-retirement-plan",
    tag = "MdmV49",
    operation_id = "execute_retirement_plan",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn execute_retirement_plan(
    State(_state): State<ApiState>,
    Path(plan_id): Path<String>,
    Json(req): Json<RetirementExecuteRequest>,
) -> Json<ApiResponse<RetirementPlan>> {
    ensure_initialized().await;
    let store = get_lifecycle_store();

    let (master_data_id, planned_rollback_window) = {
        let mut plans = store.retirement_plans.lock().await;
        let Some(plan) = plans.iter_mut().find(|p| p.id == plan_id) else {
            return Json(ApiResponse::error(404, "未找到退役计划"));
        };

        plan.status = RetirementStatus::Completed;
        plan.executed_at = Some(chrono::Utc::now().to_rfc3339());
        plan.post_retirement_review_at = Some(
            (chrono::Utc::now() + chrono::Duration::days(plan.rollback_window_days as i64))
                .to_rfc3339(),
        );
        let _ = req;
        (plan.master_data_id.clone(), plan.rollback_window_days)
    };

    // 同步推进实体生命周期阶段到 Sunset
    let mut entities = store.entities.lock().await;
    if let Some(entity) = entities.get_mut(&master_data_id) {
        entity.stage = LifecycleStage::Sunset;
        entity.last_transition_at = chrono::Utc::now().to_rfc3339();
        entity.transition_count += 1;
    }

    let plans = store.retirement_plans.lock().await;
    let p = plans.iter().find(|x| x.id == plan_id).cloned();
    let _ = planned_rollback_window;
    match p {
        Some(plan) => Json(ApiResponse::success(plan, "退役已执行")),
        None => Json(ApiResponse::error(500, "执行失败")),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["erp:update"])),
    path = "/erp/mdm-v49/rollback-retirement-plan",
    tag = "MdmV49",
    operation_id = "rollback_retirement_plan",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn rollback_retirement_plan(
    State(_state): State<ApiState>,
    Path(plan_id): Path<String>,
    Json(req): Json<RetirementRollbackRequest>,
) -> Json<ApiResponse<RetirementPlan>> {
    ensure_initialized().await;
    let store = get_lifecycle_store();

    let master_data_id = {
        let mut plans = store.retirement_plans.lock().await;
        let Some(plan) = plans.iter_mut().find(|p| p.id == plan_id) else {
            return Json(ApiResponse::error(404, "未找到退役计划"));
        };

        if !matches!(
            plan.status,
            RetirementStatus::Completed | RetirementStatus::Executing
        ) {
            return Json(ApiResponse::error(400, "当前状态不支持回滚"));
        }

        plan.status = RetirementStatus::RolledBack;
        let _ = req;
        plan.master_data_id.clone()
    };

    // 回滚实体到 Operative
    let mut entities = store.entities.lock().await;
    if let Some(entity) = entities.get_mut(&master_data_id) {
        entity.stage = LifecycleStage::Operative;
        entity.last_transition_at = chrono::Utc::now().to_rfc3339();
        entity.transition_count += 1;
    }

    let plans = store.retirement_plans.lock().await;
    let p = plans.iter().find(|x| x.id == plan_id).cloned();
    match p {
        Some(plan) => Json(ApiResponse::success(plan, "已回滚")),
        None => Json(ApiResponse::error(500, "回滚失败")),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["erp:update"])),
    path = "/erp/mdm-v49/cancel-retirement-plan",
    tag = "MdmV49",
    operation_id = "cancel_retirement_plan",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn cancel_retirement_plan(
    State(_state): State<ApiState>,
    Path(plan_id): Path<String>,
) -> Json<ApiResponse<RetirementPlan>> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let mut plans = store.retirement_plans.lock().await;
    let Some(plan) = plans.iter_mut().find(|p| p.id == plan_id) else {
        return Json(ApiResponse::error(404, "未找到退役计划"));
    };

    if matches!(plan.status, RetirementStatus::Completed) {
        return Json(ApiResponse::error(400, "已执行的退役计划不可取消"));
    }

    plan.status = RetirementStatus::Cancelled;
    Json(ApiResponse::success(plan.clone(), "退役计划已取消"))
}

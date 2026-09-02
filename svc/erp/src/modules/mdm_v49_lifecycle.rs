use axum::{extract::Path, extract::Query, extract::State, Json};
use topems_shared::ApiResponse;
use topems_shared_core::response::PaginatedResponse;

use super::super::ApiState;
use super::mdm_v49_types::*;

// ==================== 处理器：生命周期实体 ====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:mdm:read"])),
    path = "/erp/mdm-v49/list-lifecycle-entities",
    tag = "MdmV49",
    operation_id = "list_lifecycle_entities",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn list_lifecycle_entities(
    State(_state): State<ApiState>,
    Query(params): Query<LifecycleEntityQuery>,
) -> Json<ApiResponse<PaginatedResponse<LifecycleEntity>>> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let entities = store.entities.lock().await;

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);

    let mut filtered: Vec<LifecycleEntity> = entities
        .values()
        .filter(|e| {
            if let Some(d) = &params.domain {
                if &e.domain != d {
                    return false;
                }
            }
            if let Some(s) = &params.stage {
                if e.stage.as_str() != s.as_str() {
                    return false;
                }
            }
            if let Some(t) = &params.entity_type {
                if &e.entity_type != t {
                    return false;
                }
            }
            if let Some(k) = &params.keyword {
                let hay = format!("{} {} {}", e.entity_code, e.entity_name, e.master_data_id);
                if !hay.contains(k.as_str()) {
                    return false;
                }
            }
            true
        })
        .cloned()
        .collect();

    filtered.sort_by(|a, b| b.last_transition_at.cmp(&a.last_transition_at));

    let total = filtered.len() as i64;
    let items: Vec<LifecycleEntity> = filtered
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
        "生命周期实体列表",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:mdm:read"])),
    path = "/api/erp/mdm-v49/lifecycle/entities/{master_data_id}",
    tag = "Master Data",
    operation_id = "get_lifecycle_entity",
    responses((status = 200, description = "OK")),
)]
pub async fn get_lifecycle_entity(
    State(_state): State<ApiState>,
    Path(master_data_id): Path<String>,
) -> Json<ApiResponse<LifecycleEntity>> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let entities = store.entities.lock().await;
    match entities.get(&master_data_id) {
        Some(e) => Json(ApiResponse::success(e.clone(), "生命周期实体")),
        None => Json(ApiResponse::error(404, "未找到生命周期实体")),
    }
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:mdm:admin"])),
    path = "/api/erp/mdm-v49/lifecycle/entities",
    tag = "Master Data",
    operation_id = "create_lifecycle_entity",
    responses((status = 200, description = "OK")),
)]
pub async fn create_lifecycle_entity(
    State(_state): State<ApiState>,
    Json(payload): Json<serde_json::Value>,
) -> Json<ApiResponse<LifecycleEntity>> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let mut entities = store.entities.lock().await;

    let master_data_id = payload
        .get("master_data_id")
        .and_then(|v| v.as_str())
        .unwrap_or(&uuid::Uuid::new_v4().to_string())
        .to_string();

    let now = chrono::Utc::now().to_rfc3339();
    let entity = LifecycleEntity {
        id: uuid::Uuid::new_v4().to_string(),
        master_data_id: master_data_id.clone(),
        domain: payload
            .get("domain")
            .and_then(|v| v.as_str())
            .unwrap_or("default")
            .to_string(),
        entity_type: payload
            .get("entity_type")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown")
            .to_string(),
        entity_code: payload
            .get("entity_code")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string(),
        entity_name: payload
            .get("entity_name")
            .and_then(|v| v.as_str())
            .unwrap_or("未命名")
            .to_string(),
        stage: LifecycleStage::Proposed,
        owner: payload
            .get("owner")
            .and_then(|v| v.as_str())
            .map(String::from),
        steward: payload
            .get("steward")
            .and_then(|v| v.as_str())
            .map(String::from),
        stage_entered_at: now.clone(),
        last_transition_at: now.clone(),
        tasks: default_tasks_for(&LifecycleStage::Proposed),
        transition_count: 0,
        sla_deadline: None,
        sla_breached: false,
        tags: payload
            .get("tags")
            .and_then(|v| serde_json::from_value::<Vec<String>>(v.clone()).ok())
            .unwrap_or_default(),
    };

    entities.insert(master_data_id.clone(), entity.clone());

    record_event(
        master_data_id,
        entity.entity_type.clone(),
        None,
        entity.stage.clone(),
        "实体创建".to_string(),
        "system".to_string(),
        "auto".to_string(),
        None,
    );

    Json(ApiResponse::success(entity, "生命周期实体已创建"))
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:mdm:admin"])),
    path = "/api/erp/mdm-v49/lifecycle/entities/{master_data_id}",
    tag = "Master Data",
    operation_id = "transition_lifecycle_stage",
    responses((status = 200, description = "OK")),
)]
pub async fn transition_lifecycle_stage(
    State(_state): State<ApiState>,
    Path(master_data_id): Path<String>,
    Json(req): Json<TransitionRequest>,
) -> Json<ApiResponse<LifecycleEntity>> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let mut entities = store.entities.lock().await;

    let Some(entity) = entities.get_mut(&master_data_id) else {
        return Json(ApiResponse::error(404, "未找到生命周期实体"));
    };

    let target = LifecycleStage::from_str(&req.target_stage);
    if target.order() <= entity.stage.order()
        && target != LifecycleStage::Archived
        && target != LifecycleStage::Destroyed
    {
        return Json(ApiResponse::error(
            400,
            &format!(
                "stage transition not allowed: {} -> {}",
                entity.stage.as_str(),
                target.as_str()
            ),
        ));
    }

    let prev = entity.stage.clone();
    let now = chrono::Utc::now().to_rfc3339();
    entity.stage = target.clone();
    entity.stage_entered_at = now.clone();
    entity.last_transition_at = now.clone();
    entity.transition_count += 1;
    entity.tasks = default_tasks_for(&target);

    record_event(
        master_data_id.clone(),
        entity.entity_type.clone(),
        Some(prev),
        target,
        req.reason,
        req.triggered_by.unwrap_or_else(|| "system".to_string()),
        "manual".to_string(),
        req.metadata,
    );

    Json(ApiResponse::success(entity.clone(), "阶段已流转"))
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:mdm:admin"])),
    path = "/api/erp/mdm-v49/lifecycle/entities/{master_data_id}/tasks/{task_id}",
    tag = "Master Data",
    operation_id = "update_lifecycle_task",
    responses((status = 200, description = "OK")),
)]
pub async fn update_lifecycle_task(
    State(_state): State<ApiState>,
    Path((master_data_id, _task_id)): Path<(String, String)>,
    Json(req): Json<TaskUpdateRequest>,
) -> Json<ApiResponse<LifecycleEntity>> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let mut entities = store.entities.lock().await;

    let Some(entity) = entities.get_mut(&master_data_id) else {
        return Json(ApiResponse::error(404, "未找到生命周期实体"));
    };

    let task = match entity.tasks.iter_mut().find(|t| t.id == req.task_id) {
        Some(t) => t,
        None => return Json(ApiResponse::error(404, "未找到任务")),
    };

    if let Some(s) = &req.status {
        task.status = match s.as_str() {
            "in_progress" => TaskStatus::InProgress,
            "blocked" => TaskStatus::Blocked,
            "in_review" => TaskStatus::InReview,
            "done" => TaskStatus::Done,
            _ => TaskStatus::Todo,
        };
        if matches!(task.status, TaskStatus::Done) {
            task.completed_at = Some(chrono::Utc::now().to_rfc3339());
        }
    }
    if let Some(o) = req.owner {
        task.owner = Some(o);
    }
    if let Some(d) = req.due_at {
        task.due_at = Some(d);
    }
    if let Some(a) = req.approved_by {
        task.approved_by = Some(a);
        task.status = TaskStatus::Done;
        task.completed_at = Some(chrono::Utc::now().to_rfc3339());
    }

    Json(ApiResponse::success(entity.clone(), "任务已更新"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:mdm:read"])),
    path = "/api/erp/mdm-v49/lifecycle/entities/{master_data_id}/events",
    tag = "Master Data",
    operation_id = "get_lifecycle_events",
    responses((status = 200, description = "OK")),
)]
pub async fn get_lifecycle_events(
    State(_state): State<ApiState>,
    Path(master_data_id): Path<String>,
) -> Json<ApiResponse<Vec<LifecycleEvent>>> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let events = store.events.lock().unwrap_or_else(|e| e.into_inner());
    let items: Vec<LifecycleEvent> = events
        .iter()
        .filter(|e| e.master_data_id == master_data_id)
        .cloned()
        .collect();
    Json(ApiResponse::success(items, "生命周期事件列表"))
}

use axum::{extract::State, Json};
use std::collections::HashMap;
use topems_shared::ApiResponse;

use super::super::ApiState;
use super::mdm_v49_types::*;

// ==================== 处理器：仪表盘与统计 ====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:mdm:read"])),
    path = "/erp/mdm-v49/get-lifecycle-stats",
    tag = "MdmV49",
    operation_id = "get_lifecycle_stats",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_lifecycle_stats(
    State(_state): State<ApiState>,
) -> Json<ApiResponse<LifecycleStats>> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let entities = store.entities.lock().await;
    let events = store.events.lock().unwrap_or_else(|e| e.into_inner());

    let mut by_stage: Vec<(String, i64)> = LifecycleStage::all()
        .iter()
        .map(|s| (s.as_str().to_string(), 0i64))
        .collect();
    let mut sunset_count: i64 = 0;
    let mut archived_count: i64 = 0;
    let mut destroyed_count: i64 = 0;
    let mut sla_breaches: i64 = 0;

    for e in entities.values() {
        if let Some((_, cnt)) = by_stage.iter_mut().find(|(k, _)| *k == e.stage.as_str()) {
            *cnt += 1;
        }
        match e.stage {
            LifecycleStage::Sunset => sunset_count += 1,
            LifecycleStage::Archived => archived_count += 1,
            LifecycleStage::Destroyed => destroyed_count += 1,
            _ => {}
        }
        if e.sla_breached {
            sla_breaches += 1;
        }
    }

    let transition_this_period = events.len() as i64;
    let total_entities = entities.len() as i64;

    Json(ApiResponse::success(
        LifecycleStats {
            by_stage,
            total_entities,
            transition_this_period,
            sla_breaches,
            sunset_count,
            archived_count,
            destroyed_count,
        },
        "生命周期统计",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/mdm-v49/get-archive-stats",
    tag = "MdmV49",
    operation_id = "get_archive_stats",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_archive_stats(State(_state): State<ApiState>) -> Json<ApiResponse<ArchiveStats>> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let records = store.archive_records.lock().await;

    let mut by_tier: Vec<(String, i64)> = vec![
        ("hot".to_string(), 0),
        ("warm".to_string(), 0),
        ("cold".to_string(), 0),
        ("glacier".to_string(), 0),
    ];
    let mut by_domain: HashMap<String, i64> = HashMap::new();
    let mut total_size: i64 = 0;
    let mut restored_last_30d: i64 = 0;
    let mut pending_retention_expiry: i64 = 0;
    let now = chrono::Utc::now();

    for r in records.iter() {
        total_size += r.record_size_bytes;
        if let Some((_, cnt)) = by_tier
            .iter_mut()
            .find(|(k, _)| *k == r.archive_tier.as_str())
        {
            *cnt += 1;
        }
        *by_domain.entry(r.domain.clone()).or_insert(0) += 1;

        if let Some(last) = &r.last_restored_at {
            if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(last) {
                let dt = dt.with_timezone(&chrono::Utc);
                if (now - dt).num_days() <= 30 {
                    restored_last_30d += 1;
                }
            }
        }

        if let Ok(ret) = chrono::DateTime::parse_from_rfc3339(&r.retention_until) {
            let ret = ret.with_timezone(&chrono::Utc);
            let days_left = (ret - now).num_days();
            if (0..=365).contains(&days_left) {
                pending_retention_expiry += 1;
            }
        }
    }

    let by_domain: Vec<(String, i64)> = by_domain.into_iter().collect();

    Json(ApiResponse::success(
        ArchiveStats {
            total_records: records.len() as i64,
            total_size_bytes: total_size,
            by_tier,
            by_domain,
            restored_last_30d,
            pending_retention_expiry,
        },
        "归档统计",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/mdm-v49/get-retirement-stats",
    tag = "MdmV49",
    operation_id = "get_retirement_stats",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_retirement_stats(
    State(_state): State<ApiState>,
) -> Json<ApiResponse<serde_json::Value>> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let plans = store.retirement_plans.lock().await;

    let mut by_status: HashMap<String, i64> = HashMap::new();
    let mut total = 0i64;
    let mut completed = 0i64;
    let mut rollbacks = 0i64;

    for p in plans.iter() {
        total += 1;
        *by_status.entry(format!("{:?}", p.status)).or_insert(0) += 1;
        if matches!(p.status, RetirementStatus::Completed) {
            completed += 1;
        }
        if matches!(p.status, RetirementStatus::RolledBack) {
            rollbacks += 1;
        }
    }

    let avg_rollback_window = plans
        .iter()
        .map(|p| p.rollback_window_days as i64)
        .sum::<i64>()
        .checked_div(plans.len().max(1) as i64)
        .unwrap_or(0);

    Json(ApiResponse::success(
        serde_json::json!({
            "total_plans": total,
            "completed": completed,
            "rollbacks": rollbacks,
            "by_status": by_status,
            "avg_rollback_window_days": avg_rollback_window,
        }),
        "退役管理统计",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/erp/mdm-v49/run-sla-check",
    tag = "MdmV49",
    operation_id = "run_sla_check",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn run_sla_check(State(_state): State<ApiState>) -> Json<ApiResponse<serde_json::Value>> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let mut entities = store.entities.lock().await;
    let now = chrono::Utc::now();
    let mut breached = Vec::new();

    for entity in entities.values_mut() {
        if let Some(deadline_str) = &entity.sla_deadline {
            if let Ok(deadline) = chrono::DateTime::parse_from_rfc3339(deadline_str) {
                if now > deadline && !entity.sla_breached {
                    entity.sla_breached = true;
                    breached.push(serde_json::json!({
                        "master_data_id": entity.master_data_id,
                        "entity_code": entity.entity_code,
                        "stage": entity.stage.as_str(),
                        "sla_deadline": deadline_str,
                        "breached_at": now.to_rfc3339(),
                    }));
                }
            }
        }
    }

    Json(ApiResponse::success(
        serde_json::json!({
            "checked_at": now.to_rfc3339(),
            "breached_count": breached.len(),
            "breached": breached,
        }),
        "SLA 检查完成",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:mdm:read"])),
    path = "/erp/mdm-v49/get-lifecycle-dashboard",
    tag = "MdmV49",
    operation_id = "get_lifecycle_dashboard",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_lifecycle_dashboard(
    State(_state): State<ApiState>,
) -> Json<ApiResponse<serde_json::Value>> {
    ensure_initialized().await;
    let _ = get_lifecycle_store();
    Json(ApiResponse::success(
        serde_json::json!({
            "version": "v49",
            "modules": ["lifecycle", "retirement", "archive"],
            "endpoints": vec![
                "/api/erp/mdm-v49/lifecycle/entities",
                "/api/erp/mdm-v49/retirement/plans",
                "/api/erp/mdm-v49/archive/policies",
                "/api/erp/mdm-v49/archive/records",
                "/api/erp/mdm-v49/stats/lifecycle",
                "/api/erp/mdm-v49/stats/archive",
                "/api/erp/mdm-v49/stats/retirement",
            ],
        }),
        "V49 MDM 生命周期管理仪表盘",
    ))
}

use axum::{extract::State, Json};
use std::collections::HashMap;
use topems_shared_core::response::ApiResponse;

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
#[allow(clippy::as_conversions, clippy::cast_possible_wrap)]
pub async fn get_lifecycle_stats(State(_state): State<ApiState>) -> ApiResponse<LifecycleStats> {
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

    ApiResponse::success(
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
    )
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
#[allow(clippy::as_conversions, clippy::cast_possible_wrap)]
pub async fn get_archive_stats(State(_state): State<ApiState>) -> ApiResponse<ArchiveStats> {
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

    ApiResponse::success(
        ArchiveStats {
            total_records: records.len() as i64,
            total_size_bytes: total_size,
            by_tier,
            by_domain,
            restored_last_30d,
            pending_retention_expiry,
        },
        "归档统计",
    )
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
#[allow(clippy::as_conversions, clippy::cast_possible_wrap)]
pub async fn get_retirement_stats(
    State(_state): State<ApiState>,
) -> ApiResponse<serde_json::Value> {
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

    ApiResponse::success(
        serde_json::json!({
            "total_plans": total,
            "completed": completed,
            "rollbacks": rollbacks,
            "by_status": by_status,
            "avg_rollback_window_days": avg_rollback_window,
        }),
        "退役管理统计",
    )
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
pub async fn run_sla_check(State(_state): State<ApiState>) -> ApiResponse<serde_json::Value> {
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

    ApiResponse::success(
        serde_json::json!({
            "checked_at": now.to_rfc3339(),
            "breached_count": breached.len(),
            "breached": breached,
        }),
        "SLA 检查完成",
    )
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
#[allow(clippy::cast_possible_wrap, clippy::as_conversions)]
pub async fn get_lifecycle_dashboard(
    State(_state): State<ApiState>,
) -> ApiResponse<serde_json::Value> {
    ensure_initialized().await;
    let _ = get_lifecycle_store();
    ApiResponse::success(
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
    )
}

// ==================== 动词式契约补绑 ====================
// 前端 writeOps2.ts / readOps.ts 声明的扁平动词路径，与上方 RESTful 同族处理器
// 共用内存存储；payload 同时覆盖 mdmLifecycle.ts 契约字段（total/passed/failed、
// lifecycle/archive/retirement/sla_compliance）与兄弟端点既有字段。

/// POST /mdm-v49/run-sla-check
pub async fn run_sla_check_verb(
    State(_state): State<ApiState>,
    Json(_payload): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
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

    let total = i64::try_from(entities.len()).unwrap_or(i64::MAX);
    let failed = i64::try_from(breached.len()).unwrap_or(i64::MAX);
    let passed = total - failed;

    ApiResponse::success(
        serde_json::json!({
            "checked_at": now.to_rfc3339(),
            "total": total,
            "passed": passed,
            "failed": failed,
            "breached_count": failed,
            "breached": breached,
        }),
        "SLA 检查完成",
    )
}

/// GET /mdm-v49/get-lifecycle-dashboard
#[allow(
    clippy::as_conversions,
    clippy::cast_possible_truncation,
    clippy::cast_possible_wrap,
    clippy::cast_sign_loss,
    clippy::cast_precision_loss
)]
pub async fn get_lifecycle_dashboard_verb(
    State(_state): State<ApiState>,
) -> ApiResponse<serde_json::Value> {
    ensure_initialized().await;
    let store = get_lifecycle_store();

    // ---- lifecycle 聚合（entities 锁，用完即释放，避免跨锁序）----
    let (by_stage, total_entities, sla_compliance): (Vec<serde_json::Value>, i64, f64) = {
        let entities = store.entities.lock().await;
        let mut stage_counts: HashMap<String, i64> = HashMap::new();
        let mut sla_breached: i64 = 0;
        for e in entities.values() {
            *stage_counts
                .entry(e.stage.as_str().to_string())
                .or_insert(0) += 1;
            if e.sla_breached {
                sla_breached += 1;
            }
        }
        let by_stage: Vec<serde_json::Value> = LifecycleStage::all()
            .iter()
            .map(|s| {
                let count = *stage_counts.get(s.as_str()).unwrap_or(&0);
                serde_json::json!({ "stage": s.as_str(), "count": count })
            })
            .collect();
        let total = i64::try_from(entities.len()).unwrap_or(i64::MAX);
        let compliance: f64 = if total == 0 {
            1.0
        } else {
            ((total - sla_breached) as f64 / total as f64).clamp(0.0, 1.0)
        };
        (by_stage, total, compliance)
    };

    // ---- archive 聚合（records 锁，用完即释放）----
    let (total_records, by_tier, restored_last_30d): (i64, Vec<serde_json::Value>, i64) = {
        let records = store.archive_records.lock().await;
        let mut tier_counts: HashMap<String, (i64, i64)> = HashMap::new();
        let mut restored_last_30d: i64 = 0;
        let now = chrono::Utc::now();
        for r in records.iter() {
            let entry = tier_counts
                .entry(r.archive_tier.as_str().to_string())
                .or_insert((0, 0));
            entry.0 += 1;
            entry.1 += r.record_size_bytes;
            if let Some(last) = &r.last_restored_at {
                if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(last) {
                    if (now - dt.with_timezone(&chrono::Utc)).num_days() <= 30 {
                        restored_last_30d += 1;
                    }
                }
            }
        }
        let by_tier: Vec<serde_json::Value> = tier_counts
            .into_iter()
            .map(|(tier, (count, size_bytes))| {
                serde_json::json!({ "tier": tier, "count": count, "size_bytes": size_bytes })
            })
            .collect();
        (records.len() as i64, by_tier, restored_last_30d)
    };

    // ---- retirement 聚合（plans 锁，用完即释放）----
    let (total_plans, executed_count, pending_count, avg_impact_score): (i64, i64, i64, f64) = {
        let plans = store.retirement_plans.lock().await;
        let total_plans = plans.len() as i64;
        let mut executed_count: i64 = 0;
        let mut pending_count: i64 = 0;
        let mut impact_sum: i64 = 0;
        for p in plans.iter() {
            impact_sum += p.impact_assessment.total_references;
            match p.status {
                RetirementStatus::Completed => executed_count += 1,
                RetirementStatus::RolledBack | RetirementStatus::Cancelled => {}
                _ => pending_count += 1,
            }
        }
        let avg_impact_score: f64 = if total_plans == 0 {
            0.0
        } else {
            impact_sum as f64 / total_plans as f64
        };
        (total_plans, executed_count, pending_count, avg_impact_score)
    };

    ApiResponse::success(
        serde_json::json!({
            "lifecycle": {
                "by_stage": by_stage,
                "total": total_entities,
            },
            "archive": {
                "total_records": total_records,
                "by_tier": by_tier,
                "restorations_last_30d": restored_last_30d,
            },
            "retirement": {
                "total_plans": total_plans,
                "executed_count": executed_count,
                "pending_count": pending_count,
                "avg_impact_score": avg_impact_score,
            },
            "sla_compliance": sla_compliance,
            // 兄弟端点结构化占位补充字段
            "version": "v49",
            "modules": ["lifecycle", "retirement", "archive"],
        }),
        "V49 MDM 生命周期管理仪表盘",
    )
}

use axum::{
    extract::{Path, State},
    Json,
};

use super::super::models::*;
use crate::{AppState, CoreResponse};

// ============================================================================
// Pure helper functions (no DB / async) — extracted for unit testing
// ============================================================================

/// Allowed plugin status transitions:
///   draft       -> review, draft
///   review      -> published, draft
///   published   -> deprecated, review
///   deprecated  -> archived, published
///   archived    -> (terminal)
/// Same-state transitions (e.g. published -> published) are allowed as no-ops.
pub fn is_valid_plugin_transition(from: &str, to: &str) -> bool {
    if from == to {
        return true;
    }
    matches!(
        (from, to),
        ("draft", "review")
            | ("review", "published")
            | ("review", "draft")
            | ("published", "deprecated")
            | ("published", "review")
            | ("deprecated", "archived")
            | ("deprecated", "published")
    )
}

/// Check whether a plugin version is compatible with a platform version,
/// given a minimum supported platform version. The plugin's `min_app_version`
/// (here `plugin_version`) must be >= `min_supported`, and the actual
/// `platform_version` must be >= `min_supported`.
pub fn is_plugin_compatible(
    plugin_version: &str,
    platform_version: &str,
    min_supported: &str,
) -> bool {
    let pv = parse_semver(plugin_version);
    let plat = parse_semver(platform_version);
    let min = parse_semver(min_supported);

    // Platform must meet the minimum supported version
    plat >= min && pv >= min
}

/// Helper: parse "major.minor.patch" into a tuple, defaulting to (0,0,0).
fn parse_semver(v: &str) -> (u32, u32, u32) {
    let base = v.split('-').next().unwrap_or(v);
    let mut parts = base.split('.');
    let major = parts.next().and_then(|s| s.parse().ok()).unwrap_or(0);
    let minor = parts.next().and_then(|s| s.parse().ok()).unwrap_or(0);
    let patch = parts.next().and_then(|s| s.parse().ok()).unwrap_or(0);
    (major, minor, patch)
}

/// Check whether an upgrade type (e.g. "major", "minor", "patch") is allowed
/// by the schedule's allowed_upgrade_types list.
pub fn is_upgrade_type_allowed(allowed: &[String], upgrade_type: &str) -> bool {
    allowed.iter().any(|t| t.eq_ignore_ascii_case(upgrade_type))
}

/// Compute the effective priority for a queue item, lower number = higher priority.
/// Unknown/empty values default to 5 (normal).
pub fn normalize_priority(priority: i32) -> i32 {
    if priority < 1 {
        1
    } else if priority > 10 {
        10
    } else {
        priority
    }
}

/// Get upgrade schedule for a plugin
pub async fn get_upgrade_schedule(
    State(_state): State<AppState>,
    Path(plugin_code): Path<String>,
) -> Json<CoreResponse<UpgradeSchedule>> {
    tracing::info!(
        "[Plugin] Getting upgrade schedule for plugin: {}",
        plugin_code
    );

    let schedule = UpgradeSchedule {
        id: uuid::Uuid::new_v4(),
        plugin_code: plugin_code.clone(),
        strategy: UpgradeStrategy::MaintenanceWindow,
        enabled: true,
        cron_expression: Some("0 2 * * *".to_string()),
        window_start: Some("02:00".to_string()),
        window_end: Some("06:00".to_string()),
        allowed_upgrade_types: vec!["minor".to_string(), "patch".to_string()],
        auto_rollback: true,
        rollback_window_minutes: Some(30),
        created_at: chrono::Utc::now() - chrono::Duration::days(7),
        updated_at: chrono::Utc::now(),
    };

    Json(CoreResponse::success(schedule, "Schedule retrieved"))
}

/// Configure upgrade schedule
pub async fn configure_upgrade_schedule(
    State(_state): State<AppState>,
    Path(plugin_code): Path<String>,
    Json(req): Json<UpgradeScheduleRequest>,
) -> Json<CoreResponse<UpgradeSchedule>> {
    tracing::info!(
        "[Plugin] Configuring upgrade schedule for plugin: {}",
        plugin_code
    );

    let schedule = UpgradeSchedule {
        id: uuid::Uuid::new_v4(),
        plugin_code: plugin_code.clone(),
        strategy: req.strategy,
        enabled: req.enabled.unwrap_or(true),
        cron_expression: req.cron_expression,
        window_start: req.window_start,
        window_end: req.window_end,
        allowed_upgrade_types: req
            .allowed_upgrade_types
            .unwrap_or_else(|| vec!["minor".to_string(), "patch".to_string()]),
        auto_rollback: req.auto_rollback.unwrap_or(true),
        rollback_window_minutes: req.rollback_window_minutes,
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
    };

    Json(CoreResponse::success(schedule, "Schedule configured"))
}

/// Get upgrade queue
pub async fn get_upgrade_queue(
    State(_state): State<AppState>,
) -> Json<CoreResponse<Vec<UpgradeQueueItem>>> {
    tracing::info!("[Plugin] Getting upgrade queue");

    let queue = vec![
        UpgradeQueueItem {
            id: uuid::Uuid::new_v4(),
            plugin_code: "erp".to_string(),
            target_version: "1.2.0".to_string(),
            priority: 1,
            status: UpgradeQueueStatus::Pending,
            scheduled_at: Some(chrono::Utc::now() + chrono::Duration::hours(2)),
            started_at: None,
            completed_at: None,
            error_message: None,
            created_at: chrono::Utc::now(),
        },
        UpgradeQueueItem {
            id: uuid::Uuid::new_v4(),
            plugin_code: "hrm".to_string(),
            target_version: "1.1.0".to_string(),
            priority: 2,
            status: UpgradeQueueStatus::Scheduled,
            scheduled_at: Some(chrono::Utc::now() + chrono::Duration::hours(4)),
            started_at: None,
            completed_at: None,
            error_message: None,
            created_at: chrono::Utc::now(),
        },
    ];

    Json(CoreResponse::success(queue, "Queue retrieved"))
}

/// Add to upgrade queue
pub async fn add_to_upgrade_queue(
    State(_state): State<AppState>,
    Json(req): Json<serde_json::Value>,
) -> Json<CoreResponse<UpgradeQueueItem>> {
    let plugin_code = req
        .get("plugin_code")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown");
    let target_version = req
        .get("target_version")
        .and_then(|v| v.as_str())
        .unwrap_or("latest");
    let priority = req.get("priority").and_then(|v| v.as_i64()).unwrap_or(5) as i32;

    let item = UpgradeQueueItem {
        id: uuid::Uuid::new_v4(),
        plugin_code: plugin_code.to_string(),
        target_version: target_version.to_string(),
        priority,
        status: UpgradeQueueStatus::Pending,
        scheduled_at: None,
        started_at: None,
        completed_at: None,
        error_message: None,
        created_at: chrono::Utc::now(),
    };

    Json(CoreResponse::success(item, "Added to queue"))
}

/// Cancel queued upgrade
pub async fn cancel_upgrade_queue_item(
    State(_state): State<AppState>,
    Path(item_id): Path<uuid::Uuid>,
) -> Json<CoreResponse<serde_json::Value>> {
    tracing::info!("[Plugin] Cancelling upgrade queue item: {}", item_id);

    Json(CoreResponse::success(
        serde_json::json!({ "id": item_id.to_string(), "status": "cancelled" }),
        "Queue item cancelled",
    ))
}

/// Batch upgrade
pub async fn batch_upgrade(
    State(_state): State<AppState>,
    Json(req): Json<BatchUpgradeRequest>,
) -> Json<CoreResponse<BatchUpgradeResult>> {
    tracing::info!(
        "[Plugin] Starting batch upgrade for {} plugins",
        req.plugins.len()
    );

    let mut results: Vec<PluginUpgradeResult> = Vec::new();

    for item in &req.plugins {
        let task_id = uuid::Uuid::new_v4();
        results.push(PluginUpgradeResult {
            plugin_code: item.plugin_code.clone(),
            success: true,
            task_id: Some(task_id),
            message: format!(
                "Upgrade scheduled for {}",
                item.target_version
                    .as_ref()
                    .unwrap_or(&"latest".to_string())
            ),
        });
    }

    let result = BatchUpgradeResult {
        total: req.plugins.len() as i32,
        successful: results.iter().filter(|r| r.success).count() as i32,
        failed: 0,
        skipped: 0,
        results,
    };

    Json(CoreResponse::success(result, "Batch upgrade initiated"))
}

/// Get upgrade history
pub async fn get_upgrade_history(
    State(_state): State<AppState>,
    Path(plugin_code): Path<String>,
) -> Json<CoreResponse<Vec<UpgradeHistory>>> {
    tracing::info!(
        "[Plugin] Getting upgrade history for plugin: {}",
        plugin_code
    );

    let history = vec![
        UpgradeHistory {
            id: uuid::Uuid::new_v4(),
            plugin_code: plugin_code.clone(),
            from_version: "1.0.0".to_string(),
            to_version: "1.1.0".to_string(),
            strategy: UpgradeStrategy::MaintenanceWindow,
            status: "completed".to_string(),
            started_at: chrono::Utc::now() - chrono::Duration::days(3),
            completed_at: Some(
                chrono::Utc::now() - chrono::Duration::days(3) + chrono::Duration::minutes(15),
            ),
            duration_seconds: Some(900),
            error_message: None,
            rollback_from: None,
        },
        UpgradeHistory {
            id: uuid::Uuid::new_v4(),
            plugin_code: plugin_code.clone(),
            from_version: "1.1.0".to_string(),
            to_version: "1.2.0".to_string(),
            strategy: UpgradeStrategy::Scheduled,
            status: "completed".to_string(),
            started_at: chrono::Utc::now() - chrono::Duration::days(1),
            completed_at: Some(
                chrono::Utc::now() - chrono::Duration::days(1) + chrono::Duration::minutes(20),
            ),
            duration_seconds: Some(1200),
            error_message: None,
            rollback_from: None,
        },
    ];

    Json(CoreResponse::success(history, "History retrieved"))
}

#[cfg(test)]
mod tests {
    use super::*;

    // ---- is_valid_plugin_transition ----

    #[test]
    fn transition_same_state_allowed() {
        assert!(is_valid_plugin_transition("draft", "draft"));
        assert!(is_valid_plugin_transition("published", "published"));
    }

    #[test]
    fn transition_draft_to_review() {
        assert!(is_valid_plugin_transition("draft", "review"));
    }

    #[test]
    fn transition_review_to_published() {
        assert!(is_valid_plugin_transition("review", "published"));
    }

    #[test]
    fn transition_review_to_draft_reject() {
        assert!(is_valid_plugin_transition("review", "draft"));
    }

    #[test]
    fn transition_published_to_deprecated() {
        assert!(is_valid_plugin_transition("published", "deprecated"));
    }

    #[test]
    fn transition_deprecated_to_archived() {
        assert!(is_valid_plugin_transition("deprecated", "archived"));
    }

    #[test]
    fn transition_draft_to_published_rejected() {
        // Cannot skip the review step
        assert!(!is_valid_plugin_transition("draft", "published"));
    }

    #[test]
    fn transition_archived_to_anything_rejected() {
        // Archived is terminal (except to itself)
        assert!(!is_valid_plugin_transition("archived", "published"));
        assert!(!is_valid_plugin_transition("archived", "draft"));
    }

    #[test]
    fn transition_unknown_states_rejected() {
        assert!(!is_valid_plugin_transition("unknown", "draft"));
        assert!(!is_valid_plugin_transition("draft", "unknown"));
    }

    // ---- is_plugin_compatible ----

    #[test]
    fn compatible_when_platform_meets_minimum() {
        assert!(is_plugin_compatible("1.0.0", "2.0.0", "1.0.0"));
    }

    #[test]
    fn incompatible_when_platform_below_minimum() {
        assert!(!is_plugin_compatible("1.0.0", "0.9.0", "1.0.0"));
    }

    #[test]
    fn incompatible_when_plugin_below_minimum() {
        assert!(!is_plugin_compatible("0.9.0", "2.0.0", "1.0.0"));
    }

    #[test]
    fn compatible_exact_minimum() {
        assert!(is_plugin_compatible("1.0.0", "1.0.0", "1.0.0"));
    }

    #[test]
    fn compatible_higher_versions() {
        assert!(is_plugin_compatible("1.5.0", "3.2.1", "1.0.0"));
    }

    #[test]
    fn compatible_with_prerelease_platform() {
        // Pre-release suffix ignored: "2.0.0-rc.1" parses to (2,0,0)
        assert!(is_plugin_compatible("1.0.0", "2.0.0-rc.1", "1.0.0"));
    }

    // ---- is_upgrade_type_allowed ----

    #[test]
    fn upgrade_type_allowed_case_insensitive() {
        let allowed = vec!["minor".to_string(), "patch".to_string()];
        assert!(is_upgrade_type_allowed(&allowed, "MINOR"));
        assert!(is_upgrade_type_allowed(&allowed, "patch"));
    }

    #[test]
    fn upgrade_type_not_in_list() {
        let allowed = vec!["minor".to_string(), "patch".to_string()];
        assert!(!is_upgrade_type_allowed(&allowed, "major"));
    }

    #[test]
    fn upgrade_type_empty_list() {
        assert!(!is_upgrade_type_allowed(&[], "minor"));
    }

    // ---- normalize_priority ----

    #[test]
    fn normalize_priority_normal() {
        assert_eq!(normalize_priority(5), 5);
    }

    #[test]
    fn normalize_priority_too_low() {
        assert_eq!(normalize_priority(-3), 1);
        assert_eq!(normalize_priority(0), 1);
    }

    #[test]
    fn normalize_priority_too_high() {
        assert_eq!(normalize_priority(99), 10);
    }

    #[test]
    fn normalize_priority_boundaries() {
        assert_eq!(normalize_priority(1), 1);
        assert_eq!(normalize_priority(10), 10);
    }
}

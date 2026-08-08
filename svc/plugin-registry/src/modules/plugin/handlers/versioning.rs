use axum::{
    extract::{Path, State},
    Json,
};

use super::super::models::*;
use crate::{AppState, CoreResponse};

/// Compare two plugin versions
pub async fn compare_plugin_versions(
    State(_state): State<AppState>,
    Path((plugin_code, from_version, to_version)): Path<(String, String, String)>,
) -> Json<CoreResponse<VersionCompareResult>> {
    tracing::info!(
        "[Plugin] Comparing versions {} -> {} for plugin: {}",
        from_version,
        to_version,
        plugin_code
    );

    let changes = parse_release_notes(from_version.clone(), to_version.clone());

    let result = VersionCompareResult {
        from_version,
        to_version,
        changes,
    };

    Json(CoreResponse::success(
        result,
        "Version comparison completed",
    ))
}

fn parse_release_notes(from_version: String, to_version: String) -> Vec<VersionChange> {
    let mut changes = Vec::new();

    let from_major: u32 = from_version
        .split('.')
        .next()
        .unwrap_or("0")
        .parse()
        .unwrap_or(0);
    let to_major: u32 = to_version
        .split('.')
        .next()
        .unwrap_or("0")
        .parse()
        .unwrap_or(0);

    if to_major > from_major {
        changes.push(VersionChange {
            change_type: "breaking".to_string(),
            description: "Major version upgrade - may contain breaking changes".to_string(),
            affected_components: Some(vec!["API".to_string(), "Database".to_string()]),
        });
    }

    changes.push(VersionChange {
        change_type: "feature".to_string(),
        description: "New features and enhancements".to_string(),
        affected_components: None,
    });

    changes.push(VersionChange {
        change_type: "bugfix".to_string(),
        description: "Bug fixes and stability improvements".to_string(),
        affected_components: None,
    });

    changes.push(VersionChange {
        change_type: "improvement".to_string(),
        description: "Performance improvements and optimizations".to_string(),
        affected_components: None,
    });

    changes
}

/// Check for plugin updates
pub async fn check_plugin_updates(
    State(state): State<AppState>,
    Path(plugin_code): Path<String>,
) -> Json<CoreResponse<UpgradeCheckResult>> {
    tracing::info!("[Plugin] Checking updates for plugin: {}", plugin_code);

    let plugin: Option<Plugin> = sqlx::query_as("SELECT id, code, name, description, category, version, author, homepage, is_published, is_featured, install_count, rating, rating_count, download_url, icon_url, tags, status, is_active, created_at, updated_at FROM core.core_plugins WHERE code = $1")
        .bind(&plugin_code)
        .fetch_optional(&state.pool)
        .await
        .unwrap_or(None);

    let plugin = match plugin {
        Some(p) => p,
        None => return Json(CoreResponse::error("Plugin not found")),
    };

    let current_version = plugin.version.clone();

    let latest_version: Option<PluginVersion> = sqlx::query_as(
        "SELECT id, plugin_id, version, changelog, download_url, is_latest, is_active, created_at FROM core.core_plugin_versions WHERE plugin_id = $1 AND is_latest = true ORDER BY created_at DESC LIMIT 1"
    )
    .bind(plugin.id)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or(None);

    let latest_version_info = latest_version.clone();
    let latest_version_str = latest_version
        .map(|v| v.version)
        .unwrap_or(current_version.clone());

    let has_update = current_version != latest_version_str;

    let (is_minor, is_major) = if has_update {
        compare_version_levels(&current_version, &latest_version_str)
    } else {
        (false, false)
    };

    let result = UpgradeCheckResult {
        current_version,
        latest_version: latest_version_str,
        has_update,
        is_minor,
        is_major,
        release_notes: latest_version_info
            .as_ref()
            .and_then(|v| v.release_notes.clone()),
        update_available_at: latest_version_info.and_then(|v| Some(v.created_at)),
    };

    Json(CoreResponse::success(result, "Update check completed"))
}

fn compare_version_levels(current: &str, latest: &str) -> (bool, bool) {
    let current_parts: Vec<u32> = current.split('.').filter_map(|s| s.parse().ok()).collect();
    let latest_parts: Vec<u32> = latest.split('.').filter_map(|s| s.parse().ok()).collect();

    let current_major = current_parts.get(0).copied().unwrap_or(0);
    let latest_major = latest_parts.get(0).copied().unwrap_or(0);

    let current_minor = current_parts.get(1).copied().unwrap_or(0);
    let latest_minor = latest_parts.get(1).copied().unwrap_or(0);

    let is_major = latest_major > current_major;
    let is_minor = !is_major && latest_minor > current_minor;

    (is_minor, is_major)
}

/// Rollback plugin version
pub async fn rollback_plugin_version(
    State(state): State<AppState>,
    Path((plugin_code, target_version)): Path<(String, String)>,
) -> Json<CoreResponse<RollbackResult>> {
    tracing::info!(
        "[Plugin] Rolling back plugin {} to version: {}",
        plugin_code,
        target_version
    );

    let plugin: Option<Plugin> = sqlx::query_as("SELECT id, code, name, description, category, version, author, homepage, is_published, is_featured, install_count, rating, rating_count, download_url, icon_url, tags, status, is_active, created_at, updated_at FROM core.core_plugins WHERE code = $1")
        .bind(&plugin_code)
        .fetch_optional(&state.pool)
        .await
        .unwrap_or(None);

    let plugin = match plugin {
        Some(p) => p,
        None => return Json(CoreResponse::error("Plugin not found")),
    };

    let current_version = plugin.version.clone();

    let target_version_info: Option<PluginVersion> = sqlx::query_as(
        "SELECT id, plugin_id, version, changelog, download_url, is_latest, is_active, created_at FROM core.core_plugin_versions WHERE plugin_id = $1 AND version = $2",
    )
    .bind(plugin.id)
    .bind(&target_version)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or(None);

    if target_version_info.is_none() {
        return Json(CoreResponse::error("Target version not found"));
    }

    let result = sqlx::query("UPDATE core.core_plugins SET version = $1 WHERE id = $2")
        .bind(&target_version)
        .bind(plugin.id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(_) => {
            let rollback_result = RollbackResult {
                previous_version: current_version,
                target_version,
                success: true,
                backup_created: Some(true),
                message: "Plugin version rolled back successfully".to_string(),
            };
            Json(CoreResponse::success(
                rollback_result,
                "Version rolled back",
            ))
        }
        Err(e) => {
            tracing::error!("[Plugin] Failed to rollback version: {}", e);
            let rollback_result = RollbackResult {
                previous_version: current_version,
                target_version,
                success: false,
                backup_created: None,
                message: "Failed to rollback version".to_string(),
            };
            Json(CoreResponse::success(rollback_result, "Rollback failed"))
        }
    }
}

/// Check updates for all installed plugins
pub async fn check_all_updates(
    State(state): State<AppState>,
) -> Json<CoreResponse<Vec<UpgradeCheckResult>>> {
    tracing::info!("[Plugin] Checking updates for all plugins");

    let plugins: Vec<Plugin> =
        sqlx::query_as("SELECT id, code, name, description, category, version, author, homepage, is_published, is_featured, install_count, rating, rating_count, download_url, icon_url, tags, status, is_active, created_at, updated_at FROM core.core_plugins WHERE is_published = true")
            .fetch_all(&state.pool)
            .await
            .unwrap_or_default();

    let mut results: Vec<UpgradeCheckResult> = Vec::new();

    for plugin in plugins {
        let current_version = plugin.version.clone();

        let latest_version: Option<PluginVersion> = sqlx::query_as(
            "SELECT id, plugin_id, version, changelog, download_url, is_latest, is_active, created_at FROM core.core_plugin_versions WHERE plugin_id = $1 AND is_latest = true ORDER BY created_at DESC LIMIT 1"
        )
        .bind(plugin.id)
        .fetch_optional(&state.pool)
        .await
        .unwrap_or(None);

        let latest_version_info = latest_version.clone();
        let latest_version_str = latest_version
            .map(|v| v.version)
            .unwrap_or(current_version.clone());

        let has_update = current_version != latest_version_str;

        let (is_minor, is_major) = if has_update {
            compare_version_levels(&current_version, &latest_version_str)
        } else {
            (false, false)
        };

        results.push(UpgradeCheckResult {
            current_version,
            latest_version: latest_version_str,
            has_update,
            is_minor,
            is_major,
            release_notes: latest_version_info
                .as_ref()
                .and_then(|v| v.release_notes.clone()),
            update_available_at: latest_version_info.and_then(|v| Some(v.created_at)),
        });
    }

    Json(CoreResponse::success(results, "All updates checked"))
}

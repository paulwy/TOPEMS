use axum::{
    extract::{Path, Query, State},
    Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::AppState;
use topems_shared::{api_error, api_success, ApiResponse};

use super::models::{
    AccessControlLog, AccessControlQueryParams, AccessControlStats, AccessTrendStat,
    OperatorChangeStat, PaginatedAccessLogs, PaginatedPermissionChanges, PermissionChange,
    PermissionChangeQueryParams, PermissionChangeStats, ResourceStat, RoleChangeStat, TrendStat,
    UserAccessStat, UserChangeStat,
};

pub async fn list_permission_changes(
    State(_state): State<AppState>,
    Query(query): Query<PermissionChangeQueryParams>,
) -> Json<ApiResponse<PaginatedPermissionChanges>> {
    let page = query.page.unwrap_or(1).max(1);
    let pagesize = query.pagesize.unwrap_or(10).clamp(1, 100);
    let offset = (page - 1) * pagesize;

    let items: Vec<PermissionChange> = Vec::new();

    Json(api_success(PaginatedPermissionChanges {
        items,
        total: 0,
        page,
        pagesize,
    }))
}

pub async fn get_permission_change(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<PermissionChange>> {
    Json(api_error(404, "权限变更记录不存在"))
}

pub async fn get_permission_change_stats(
    State(_state): State<AppState>,
    Query(_query): Query<serde_json::Value>,
) -> Json<ApiResponse<PermissionChangeStats>> {
    let stats = PermissionChangeStats {
        total_changes: 0,
        today_changes: 0,
        role_changes: 0,
        permission_changes: 0,
        grants: 0,
        revokes: 0,
        updates: 0,
        success_rate: 100.0,
        by_role: Vec::new(),
        by_user: Vec::new(),
        by_operator: Vec::new(),
        trend: Vec::new(),
    };
    Json(api_success(stats))
}

pub async fn export_permission_changes(
    State(_state): State<AppState>,
    Query(_query): Query<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(api_success(serde_json::json!({
        "message": "导出功能尚未实现"
    })))
}

pub async fn list_access_logs(
    State(_state): State<AppState>,
    Query(query): Query<AccessControlQueryParams>,
) -> Json<ApiResponse<PaginatedAccessLogs>> {
    let page = query.page.unwrap_or(1).max(1);
    let pagesize = query.pagesize.unwrap_or(10).clamp(1, 100);
    let offset = (page - 1) * pagesize;

    let items: Vec<AccessControlLog> = Vec::new();

    Json(api_success(PaginatedAccessLogs {
        items,
        total: 0,
        page,
        pagesize,
    }))
}

pub async fn get_access_log(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<AccessControlLog>> {
    Json(api_error(404, "访问日志不存在"))
}

pub async fn get_access_control_stats(
    State(_state): State<AppState>,
    Query(_query): Query<serde_json::Value>,
) -> Json<ApiResponse<AccessControlStats>> {
    let stats = AccessControlStats {
        total_requests: 0,
        total_access: 0,
        today_access: 0,
        login_count: 0,
        denied_count: 0,
        allowed_requests: 0,
        denied_requests: 0,
        deny_rate: 0.0,
        top_resources: Vec::new(),
        top_users: Vec::new(),
        top_denied_users: Vec::new(),
        trend: Vec::new(),
    };
    Json(api_success(stats))
}

pub async fn export_access_logs(
    State(_state): State<AppState>,
    Query(_query): Query<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(api_success(serde_json::json!({
        "message": "导出功能尚未实现"
    })))
}

// ==================== 限流配置相关 Handler ====================

#[derive(Debug, Serialize, Deserialize)]
pub struct RateLimitConfigResponse {
    pub enabled: bool,
    pub by_tenant: bool,
    pub by_user: bool,
    pub by_ip: bool,
    pub by_global: bool,
    pub tenant_default: RateLimitRuleView,
    pub user_default: RateLimitRuleView,
    pub ip_default: RateLimitRuleView,
    pub global_default: RateLimitRuleView,
    pub path_rules: Vec<PathRuleView>,
    pub skip_paths: Vec<String>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RateLimitRuleView {
    pub requests: u32,
    pub window_secs: u64,
    pub priority: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PathRuleView {
    pub path: String,
    pub rule: RateLimitRuleView,
}

#[derive(Debug, Deserialize)]
pub struct RateLimitConfigUpdate {
    pub enabled: Option<bool>,
    pub by_tenant: Option<bool>,
    pub by_user: Option<bool>,
    pub by_ip: Option<bool>,
    pub by_global: Option<bool>,
    pub tenant_default: Option<RateLimitRuleView>,
    pub user_default: Option<RateLimitRuleView>,
    pub ip_default: Option<RateLimitRuleView>,
    pub global_default: Option<RateLimitRuleView>,
    pub path_rules: Option<Vec<PathRuleView>>,
    pub skip_paths: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AntiReplayConfigView {
    pub enabled: bool,
    pub tolerance_secs: u64,
    pub nonce_cache_secs: u64,
    pub timestamp_header: String,
    pub nonce_header: String,
    pub enforce_paths: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct AntiReplayConfigUpdate {
    pub enabled: Option<bool>,
    pub tolerance_secs: Option<u64>,
    pub nonce_cache_secs: Option<u64>,
    pub timestamp_header: Option<String>,
    pub nonce_header: Option<String>,
    pub enforce_paths: Option<Vec<String>>,
}

fn rule_to_view(rule: &topems_shared::EnhancedRateLimitRule) -> RateLimitRuleView {
    RateLimitRuleView {
        requests: rule.requests,
        window_secs: rule.window_secs,
        priority: rule.priority,
    }
}

fn view_to_rule(view: &RateLimitRuleView) -> topems_shared::EnhancedRateLimitRule {
    topems_shared::EnhancedRateLimitRule {
        requests: view.requests,
        window_secs: view.window_secs,
        priority: view.priority,
    }
}

fn current_config_view() -> RateLimitConfigResponse {
    // The middleware's config is read-only by default in this module since
    // it's stored as Arc.  The response here returns the effective
    // configuration snapshot for the admin UI.
    let cfg = topems_shared::EnhancedRateLimitConfig::default();
    RateLimitConfigResponse {
        enabled: cfg.enabled,
        by_tenant: cfg.by_tenant,
        by_user: cfg.by_user,
        by_ip: cfg.by_ip,
        by_global: cfg.by_global,
        tenant_default: rule_to_view(&cfg.tenant_default),
        user_default: rule_to_view(&cfg.user_default),
        ip_default: rule_to_view(&cfg.ip_default),
        global_default: rule_to_view(&cfg.global_default),
        path_rules: cfg
            .path_rules
            .iter()
            .map(|(p, r)| PathRuleView {
                path: p.clone(),
                rule: rule_to_view(r),
            })
            .collect(),
        skip_paths: cfg.skip_paths,
        updated_at: None,
    }
}

fn current_anti_replay_view() -> AntiReplayConfigView {
    let cfg = topems_shared::AntiReplayConfig::default();
    AntiReplayConfigView {
        enabled: cfg.enabled,
        tolerance_secs: cfg.tolerance_secs,
        nonce_cache_secs: cfg.nonce_cache_secs,
        timestamp_header: cfg.timestamp_header,
        nonce_header: cfg.nonce_header,
        enforce_paths: cfg.enforce_paths,
    }
}

pub async fn get_rate_limit_config() -> Json<ApiResponse<RateLimitConfigResponse>> {
    Json(api_success(current_config_view()))
}

pub async fn update_rate_limit_config(
    Json(update): Json<RateLimitConfigUpdate>,
) -> Json<ApiResponse<RateLimitConfigResponse>> {
    let mut current = current_config_view();
    if let Some(v) = update.enabled {
        current.enabled = v;
    }
    if let Some(v) = update.by_tenant {
        current.by_tenant = v;
    }
    if let Some(v) = update.by_user {
        current.by_user = v;
    }
    if let Some(v) = update.by_ip {
        current.by_ip = v;
    }
    if let Some(v) = update.by_global {
        current.by_global = v;
    }
    if let Some(v) = update.tenant_default {
        current.tenant_default = v;
    }
    if let Some(v) = update.user_default {
        current.user_default = v;
    }
    if let Some(v) = update.ip_default {
        current.ip_default = v;
    }
    if let Some(v) = update.global_default {
        current.global_default = v;
    }
    if let Some(v) = update.path_rules {
        current.path_rules = v;
    }
    if let Some(v) = update.skip_paths {
        current.skip_paths = v;
    }

    let _ = view_to_rule(&current.tenant_default);
    let _ = view_to_rule(&current.user_default);
    let _ = view_to_rule(&current.ip_default);
    let _ = view_to_rule(&current.global_default);

    Json(api_success(current))
}

pub async fn reset_rate_limit_config() -> Json<ApiResponse<RateLimitConfigResponse>> {
    Json(api_success(current_config_view()))
}

pub async fn get_anti_replay_config() -> Json<ApiResponse<AntiReplayConfigView>> {
    Json(api_success(current_anti_replay_view()))
}

pub async fn update_anti_replay_config(
    Json(update): Json<AntiReplayConfigUpdate>,
) -> Json<ApiResponse<AntiReplayConfigView>> {
    let mut current = current_anti_replay_view();
    if let Some(v) = update.enabled {
        current.enabled = v;
    }
    if let Some(v) = update.tolerance_secs {
        current.tolerance_secs = v;
    }
    if let Some(v) = update.nonce_cache_secs {
        current.nonce_cache_secs = v;
    }
    if let Some(v) = update.timestamp_header {
        current.timestamp_header = v;
    }
    if let Some(v) = update.nonce_header {
        current.nonce_header = v;
    }
    if let Some(v) = update.enforce_paths {
        current.enforce_paths = v;
    }
    Json(api_success(current))
}

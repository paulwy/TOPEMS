use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{webview::WebviewWindowBuilder, AppHandle, Emitter, Manager, WindowEvent};
use log::{info, warn, error};

use crate::api_client::{self};
use crate::offline_cache;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiResponse<T: Serialize + Clone> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

impl<T: Serialize + Clone> ApiResponse<T> {
    pub fn ok(data: T) -> Self {
        ApiResponse {
            success: true,
            data: Some(data),
            error: None,
        }
    }

    pub fn err(error: impl Into<String>) -> Self {
        ApiResponse {
            success: false,
            data: None,
            error: Some(error.into()),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Issue {
    pub id: String,
    pub title: String,
    pub status: String,
    #[serde(default)]
    pub project_id: Option<String>,
    #[serde(default)]
    pub assignee: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub members: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceInfo {
    pub id: String,
    pub name: String,
    pub os: String,
    pub version: String,
    pub last_seen: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginInfo {
    pub id: String,
    pub name: String,
    pub version: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserInfo {
    #[serde(rename = "user")]
    pub user_json: serde_json::Value,
    pub roles: Vec<String>,
    pub permissions: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct IpcMessage {
    pub action: String,
    pub payload: serde_json::Value,
    pub api_version: String,
    pub module_name: String,
}

lazy_static::lazy_static! {
    pub static ref SUBSCRIPTIONS: Mutex<HashMap<String, Vec<String>>> = Mutex::new(HashMap::new());
    pub static ref USER_INFO: Mutex<Option<UserInfo>> = Mutex::new(None);
    pub static ref TOKEN_EXPIRY: Mutex<Option<i64>> = Mutex::new(None);
}

fn get_runtime() -> Result<tokio::runtime::Runtime, String> {
    tokio::runtime::Runtime::new().map_err(|e| format!("Failed to create Tokio runtime: {}", e))
}

fn api_get<T>(path: &str, params: Option<&[(&str, &str)]>, request_id: Option<&str>) -> Result<T, String>
where
    T: serde::de::DeserializeOwned + Clone + serde::Serialize + Default,
{
    let runtime = get_runtime()?;
    let client = api_client::create_client()?;
    let token = api_client::get_auth_token();
    runtime.block_on(async {
        api_client::get::<T>(&client, path, params, token.as_deref(), request_id).await
    })
}

fn api_post<T>(path: &str, body: &serde_json::Value, request_id: Option<&str>) -> Result<T, String>
where
    T: serde::de::DeserializeOwned + Clone + serde::Serialize + Default,
{
    let runtime = get_runtime()?;
    let client = api_client::create_client()?;
    let token = api_client::get_auth_token();
    runtime.block_on(async {
        api_client::post::<T, _>(&client, path, body, token.as_deref(), request_id).await
    })
}

fn api_put<T>(path: &str, body: &serde_json::Value, request_id: Option<&str>) -> Result<T, String>
where
    T: serde::de::DeserializeOwned + Clone + serde::Serialize + Default,
{
    let runtime = get_runtime()?;
    let client = api_client::create_client()?;
    let token = api_client::get_auth_token();
    runtime.block_on(async {
        api_client::put::<T, _>(&client, path, body, token.as_deref(), request_id).await
    })
}

fn api_delete(path: &str, request_id: Option<&str>) -> Result<(), String> {
    let runtime = get_runtime()?;
    let client = api_client::create_client()?;
    let token = api_client::get_auth_token();
    runtime.block_on(async {
        api_client::delete::<()>(&client, path, token.as_deref(), request_id).await
    })
}

fn ok_or_err<T: Clone + serde::Serialize>(result: Result<T, String>, error_msg: &str) -> Result<ApiResponse<T>, String> {
    match result {
        Ok(data) => Ok(ApiResponse::ok(data)),
        Err(e) => {
            error!("{}: {}", error_msg, e);
            Ok(ApiResponse::err(e))
        }
    }
}

#[tauri::command]
pub fn get_issue_list(
    _app: AppHandle,
    status: Option<String>,
    project_id: Option<String>,
    request_id: Option<String>,
) -> Result<ApiResponse<Vec<Issue>>, String> {
    let runtime = get_runtime()?;
    let client = api_client::create_client()?;
    let token = api_client::get_auth_token();

    let mut params: Vec<(&str, String)> = vec![];
    if let Some(ref s) = status {
        params.push(("status", s.clone()));
    }
    if let Some(ref p) = project_id {
        params.push(("project_id", p.clone()));
    }

    let params_refs: Vec<(&str, &str)> = params.iter().map(|(k, v)| (*k, v.as_str())).collect();
    let params_opt = if params_refs.is_empty() { None } else { Some(params_refs.as_slice()) };

    let rid = request_id.as_deref();
    let result = runtime.block_on(async {
        api_client::get::<Vec<Issue>>(&client, "/tickets", params_opt, token.as_deref(), rid).await
    });

    match result {
        Ok(issues) => Ok(ApiResponse::ok(issues)),
        Err(e) => {
            error!("Failed to get issue list: {}", e);
            Ok(ApiResponse::err(e))
        }
    }
}

#[tauri::command]
pub fn create_issue(
    _app: AppHandle,
    title: String,
    description: Option<String>,
    status: Option<String>,
    project_id: Option<String>,
    assignee: Option<String>,
    request_id: Option<String>,
) -> Result<ApiResponse<Issue>, String> {
    let runtime = get_runtime()?;
    let client = api_client::create_client()?;
    let token = api_client::get_auth_token();

    let body = serde_json::json!({
        "title": title,
        "description": description,
        "status": status,
        "project_id": project_id,
        "assignee": assignee,
    });

    let rid = request_id.as_deref();
    let result = runtime.block_on(async {
        api_client::post::<Issue, _>(&client, "/tickets", &body, token.as_deref(), rid).await
    });

    match result {
        Ok(issue) => Ok(ApiResponse::ok(issue)),
        Err(e) => {
            error!("Failed to create issue: {}", e);
            Ok(ApiResponse::err(e))
        }
    }
}

#[tauri::command]
pub fn update_issue(
    _app: AppHandle,
    id: String,
    title: Option<String>,
    status: Option<String>,
    assignee: Option<String>,
    request_id: Option<String>,
) -> Result<ApiResponse<Issue>, String> {
    let runtime = get_runtime()?;
    let client = api_client::create_client()?;
    let token = api_client::get_auth_token();

    let body = serde_json::json!({
        "title": title,
        "status": status,
        "assignee": assignee,
    });

    let rid = request_id.as_deref();
    let result = runtime.block_on(async {
        api_client::put::<Issue, _>(&client, &format!("/tickets/{}", id), &body, token.as_deref(), rid).await
    });

    match result {
        Ok(issue) => Ok(ApiResponse::ok(issue)),
        Err(e) => {
            error!("Failed to update issue: {}", e);
            Ok(ApiResponse::err(e))
        }
    }
}

#[tauri::command]
pub fn delete_issue(
    _app: AppHandle,
    id: String,
    request_id: Option<String>,
) -> Result<ApiResponse<()>, String> {
    let runtime = get_runtime()?;
    let client = api_client::create_client()?;
    let token = api_client::get_auth_token();

    let rid = request_id.as_deref();
    let result = runtime.block_on(async {
        api_client::delete::<()>(&client, &format!("/tickets/{}", id), token.as_deref(), rid).await
    });

    match result {
        Ok(()) => Ok(ApiResponse::ok(())),
        Err(e) => {
            error!("Failed to delete issue: {}", e);
            Ok(ApiResponse::err(e))
        }
    }
}

#[tauri::command]
pub fn get_issue_detail(
    _app: AppHandle,
    id: String,
    request_id: Option<String>,
) -> Result<ApiResponse<Issue>, String> {
    let runtime = get_runtime()?;
    let client = api_client::create_client()?;
    let token = api_client::get_auth_token();

    let rid = request_id.as_deref();
    let result = runtime.block_on(async {
        api_client::get::<Issue>(&client, &format!("/tickets/{}", id), None, token.as_deref(), rid).await
    });

    match result {
        Ok(issue) => Ok(ApiResponse::ok(issue)),
        Err(e) => {
            error!("Failed to get issue detail: {}", e);
            Ok(ApiResponse::err(e))
        }
    }
}

#[tauri::command]
pub fn get_project_list(
    _app: AppHandle,
    request_id: Option<String>,
) -> Result<ApiResponse<Vec<Project>>, String> {
    let runtime = get_runtime()?;
    let client = api_client::create_client()?;
    let token = api_client::get_auth_token();

    let rid = request_id.as_deref();
    let result = runtime.block_on(async {
        api_client::get::<Vec<Project>>(&client, "/projects", None, token.as_deref(), rid).await
    });

    match result {
        Ok(projects) => Ok(ApiResponse::ok(projects)),
        Err(e) => {
            error!("Failed to get project list: {}", e);
            Ok(ApiResponse::err(e))
        }
    }
}

#[tauri::command]
pub fn create_project(
    _app: AppHandle,
    name: String,
    description: Option<String>,
    members: Option<Vec<String>>,
    request_id: Option<String>,
) -> Result<ApiResponse<Project>, String> {
    let runtime = get_runtime()?;
    let client = api_client::create_client()?;
    let token = api_client::get_auth_token();

    let body = serde_json::json!({
        "name": name,
        "description": description,
        "members": members,
    });

    let rid = request_id.as_deref();
    let result = runtime.block_on(async {
        api_client::post::<Project, _>(&client, "/projects", &body, token.as_deref(), rid).await
    });

    match result {
        Ok(project) => Ok(ApiResponse::ok(project)),
        Err(e) => {
            error!("Failed to create project: {}", e);
            Ok(ApiResponse::err(e))
        }
    }
}

#[tauri::command]
pub fn update_project(
    _app: AppHandle,
    id: String,
    name: Option<String>,
    description: Option<String>,
    members: Option<Vec<String>>,
    request_id: Option<String>,
) -> Result<ApiResponse<Project>, String> {
    let runtime = get_runtime()?;
    let client = api_client::create_client()?;
    let token = api_client::get_auth_token();

    let body = serde_json::json!({
        "name": name,
        "description": description,
        "members": members,
    });

    let rid = request_id.as_deref();
    let result = runtime.block_on(async {
        api_client::put::<Project, _>(&client, &format!("/projects/{}", id), &body, token.as_deref(), rid).await
    });

    match result {
        Ok(project) => Ok(ApiResponse::ok(project)),
        Err(e) => {
            error!("Failed to update project: {}", e);
            Ok(ApiResponse::err(e))
        }
    }
}

#[tauri::command]
pub fn delete_project(
    _app: AppHandle,
    id: String,
    request_id: Option<String>,
) -> Result<ApiResponse<()>, String> {
    let runtime = get_runtime()?;
    let client = api_client::create_client()?;
    let token = api_client::get_auth_token();

    let rid = request_id.as_deref();
    let result = runtime.block_on(async {
        api_client::delete::<()>(&client, &format!("/projects/{}", id), token.as_deref(), rid).await
    });

    match result {
        Ok(()) => Ok(ApiResponse::ok(())),
        Err(e) => {
            error!("Failed to delete project: {}", e);
            Ok(ApiResponse::err(e))
        }
    }
}

#[tauri::command]
pub fn batch_create_issues(
    _app: AppHandle,
    issues: Vec<serde_json::Value>,
    request_id: Option<String>,
) -> Result<ApiResponse<serde_json::Value>, String> {
    let body = serde_json::json!({ "items": issues });
    ok_or_err(api_post("/tickets/batch", &body, request_id.as_deref()), "Failed to batch create issues")
}

#[tauri::command]
pub fn batch_delete_issues(
    _app: AppHandle,
    ids: Vec<String>,
    request_id: Option<String>,
) -> Result<ApiResponse<()>, String> {
    let body = serde_json::json!({ "ids": ids });
    let runtime = get_runtime()?;
    let client = api_client::create_client()?;
    let token = api_client::get_auth_token();
    let rid = request_id.as_deref();
    let result = runtime.block_on(async {
        api_client::post::<(), _>(&client, "/tickets/batch-delete", &body, token.as_deref(), rid).await
    });
    ok_or_err(result, "Failed to batch delete issues")
}

#[tauri::command]
pub fn batch_update_issues(
    _app: AppHandle,
    updates: Vec<serde_json::Value>,
    request_id: Option<String>,
) -> Result<ApiResponse<serde_json::Value>, String> {
    let body = serde_json::json!({ "items": updates });
    ok_or_err(api_put("/tickets/batch", &body, request_id.as_deref()), "Failed to batch update issues")
}

#[tauri::command]
pub fn batch_create_projects(
    _app: AppHandle,
    projects: Vec<serde_json::Value>,
    request_id: Option<String>,
) -> Result<ApiResponse<serde_json::Value>, String> {
    let body = serde_json::json!({ "items": projects });
    ok_or_err(api_post("/projects/batch", &body, request_id.as_deref()), "Failed to batch create projects")
}

#[tauri::command]
pub fn batch_delete_projects(
    _app: AppHandle,
    ids: Vec<String>,
    request_id: Option<String>,
) -> Result<ApiResponse<()>, String> {
    let body = serde_json::json!({ "ids": ids });
    let runtime = get_runtime()?;
    let client = api_client::create_client()?;
    let token = api_client::get_auth_token();
    let rid = request_id.as_deref();
    let result = runtime.block_on(async {
        api_client::post::<(), _>(&client, "/projects/batch-delete", &body, token.as_deref(), rid).await
    });
    ok_or_err(result, "Failed to batch delete projects")
}

#[tauri::command]
pub fn get_audit_logs(
    _app: AppHandle,
    action: Option<String>,
    target_type: Option<String>,
    user_id: Option<String>,
    from: Option<String>,
    to: Option<String>,
    request_id: Option<String>,
) -> Result<ApiResponse<serde_json::Value>, String> {
    let mut params: Vec<(&str, String)> = vec![];
    if let Some(ref a) = action { params.push(("action", a.clone())); }
    if let Some(ref t) = target_type { params.push(("target_type", t.clone())); }
    if let Some(ref u) = user_id { params.push(("user_id", u.clone())); }
    if let Some(ref f) = from { params.push(("from", f.clone())); }
    if let Some(ref t) = to { params.push(("to", t.clone())); }

    let params_refs: Vec<(&str, &str)> = params.iter().map(|(k, v)| (*k, v.as_str())).collect();
    let params_opt = if params_refs.is_empty() { None } else { Some(params_refs.as_slice()) };

    ok_or_err(api_get("/audit-logs", params_opt, request_id.as_deref()), "Failed to get audit logs")
}

#[tauri::command]
pub fn export_data(
    _app: AppHandle,
    resource_type: String,
    format: Option<String>,
    filters: Option<serde_json::Value>,
    request_id: Option<String>,
) -> Result<ApiResponse<serde_json::Value>, String> {
    let body = serde_json::json!({
        "resource_type": resource_type,
        "format": format.unwrap_or_else(|| "csv".to_string()),
        "filters": filters,
    });
    ok_or_err(api_post("/export", &body, request_id.as_deref()), "Failed to export data")
}

#[tauri::command]
pub fn cancel_requests() -> Result<ApiResponse<()>, String> {
    api_client::cancel_all_requests();
    Ok(ApiResponse::ok(()))
}

#[tauri::command]
pub fn cancel_request(request_id: String) -> Result<ApiResponse<()>, String> {
    match api_client::cancel_request(&request_id) {
        Ok(()) => Ok(ApiResponse::ok(())),
        Err(e) => Ok(ApiResponse::err(e)),
    }
}

#[tauri::command]
pub fn get_active_requests() -> Result<ApiResponse<Vec<String>>, String> {
    let requests = api_client::get_active_requests();
    Ok(ApiResponse::ok(requests))
}

// --- Offline Mode Commands ---

#[tauri::command]
pub fn get_sync_queue() -> Result<ApiResponse<Vec<offline_cache::CachedRequest>>, String> {
    let queue = offline_cache::get_queue();
    Ok(ApiResponse::ok(queue))
}

#[tauri::command]
pub fn flush_sync() -> Result<ApiResponse<usize>, String> {
    let client = api_client::create_client()?;
    let token = api_client::get_auth_token();
    match offline_cache::flush_sync_queue(&client, token.as_deref()) {
        Ok(count) => Ok(ApiResponse::ok(count)),
        Err(e) => Ok(ApiResponse::err(e)),
    }
}

#[tauri::command]
pub fn set_offline(offline: bool) -> Result<ApiResponse<()>, String> {
    offline_cache::set_offline_mode(offline);
    let mode = if offline { "offline" } else { "online" };
    info!("Offline mode set to: {}", mode);
    Ok(ApiResponse::ok(()))
}

#[tauri::command]
pub fn get_offline_status() -> Result<ApiResponse<serde_json::Value>, String> {
    let offline = offline_cache::is_offline();
    let pending_count = offline_cache::get_queue().len();
    let cached_responses = {
        let cache = offline_cache::RESPONSE_CACHE.lock().unwrap();
        cache.len()
    };
    let status = serde_json::json!({
        "offline": offline,
        "pending_count": pending_count,
        "cached_responses": cached_responses,
    });
    Ok(ApiResponse::ok(status))
}

#[tauri::command]
pub fn set_token(token: Option<String>) -> Result<ApiResponse<()>, String> {
    api_client::set_auth_token(token);
    info!("Auth token updated in Tauri backend secure storage");
    Ok(ApiResponse::ok(()))
}

#[tauri::command]
pub fn get_token() -> Result<ApiResponse<Option<String>>, String> {
    let token = api_client::get_auth_token();
    Ok(ApiResponse::ok(token))
}

#[tauri::command]
pub fn clear_token() -> Result<ApiResponse<()>, String> {
    api_client::clear_auth_token_persistent();
    info!("Auth token cleared from Tauri backend secure storage");
    Ok(ApiResponse::ok(()))
}

#[tauri::command]
pub fn set_user_info(
    data: String,
) -> Result<ApiResponse<()>, String> {
    info!("set_user_info called with data length: {}", data.len());
    let parsed: serde_json::Value = serde_json::from_str(&data)
        .map_err(|e| format!("Failed to parse user data JSON: {}", e))?;

    let user_json = parsed.get("user_json")
        .cloned()
        .ok_or_else(|| "Missing user_json field".to_string())?;
    let roles: Vec<String> = parsed.get("roles")
        .and_then(|r| r.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect()
        })
        .ok_or_else(|| "Missing or invalid roles field".to_string())?;
    let permissions: Vec<String> = parsed.get("permissions")
        .and_then(|r| r.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect()
        })
        .ok_or_else(|| "Missing or invalid permissions field".to_string())?;

    let user = UserInfo {
        user_json,
        roles,
        permissions,
    };
    let mut info = USER_INFO.lock().unwrap();
    *info = Some(user);
    info!("User info updated in Tauri backend storage");
    Ok(ApiResponse::ok(()))
}

#[tauri::command]
pub fn get_user_info() -> Result<ApiResponse<Option<UserInfo>>, String> {
    let info = USER_INFO.lock().unwrap();
    let result = info.clone();
    Ok(ApiResponse::ok(result))
}

#[tauri::command]
pub fn clear_user_info() -> Result<ApiResponse<()>, String> {
    let mut info = USER_INFO.lock().unwrap();
    *info = None;
    info!("User info cleared from Tauri backend storage");
    Ok(ApiResponse::ok(()))
}

#[tauri::command]
pub fn set_token_expiry(ts: i64) -> Result<ApiResponse<()>, String> {
    info!("set_token_expiry called: {}", ts);
    let mut expiry = TOKEN_EXPIRY.lock().unwrap();
    *expiry = Some(ts);
    info!("Token expiry set to: {}", ts);
    Ok(ApiResponse::ok(()))
}

#[tauri::command]
pub fn clear_token_expiry() -> Result<ApiResponse<()>, String> {
    let mut expiry = TOKEN_EXPIRY.lock().unwrap();
    *expiry = None;
    info!("Token expiry cleared from Tauri backend storage");
    Ok(ApiResponse::ok(()))
}

#[tauri::command]
pub fn is_token_valid() -> Result<ApiResponse<bool>, String> {
    let expiry = TOKEN_EXPIRY.lock().unwrap();
    let valid = match *expiry {
        Some(ts) => {
            let now = chrono::Utc::now().timestamp_millis();
            now < ts
        }
        None => true,
    };
    Ok(ApiResponse::ok(valid))
}

#[tauri::command]
pub fn get_token_expiry() -> Result<ApiResponse<Option<i64>>, String> {
    let expiry = TOKEN_EXPIRY.lock().unwrap();
    Ok(ApiResponse::ok(*expiry))
}

#[tauri::command]
pub fn get_metrics() -> Result<ApiResponse<api_client::ApiMetrics>, String> {
    let metrics = api_client::get_metrics();
    Ok(ApiResponse::ok(metrics))
}

#[tauri::command]
pub fn get_device_info(_app: AppHandle) -> Result<ApiResponse<DeviceInfo>, String> {
    let device = DeviceInfo {
        id: format!(
            "device-{}",
            std::env::consts::OS
        ),
        name: env!("CARGO_PKG_NAME").to_string(),
        os: format!(
            "{} {}",
            std::env::consts::OS,
            std::env::consts::ARCH
        ),
        version: env!("CARGO_PKG_VERSION").to_string(),
        last_seen: chrono::Utc::now().to_rfc3339(),
    };

    Ok(ApiResponse::ok(device))
}

#[tauri::command]
pub fn get_plugin_list(
    _app: AppHandle,
    request_id: Option<String>,
) -> Result<ApiResponse<Vec<PluginInfo>>, String> {
    let runtime = get_runtime()?;
    let client = api_client::create_client()?;
    let token = api_client::get_auth_token();

    let rid = request_id.as_deref();
    let result = runtime.block_on(async {
        api_client::get::<Vec<PluginInfo>>(&client, "/plugins", None, token.as_deref(), rid).await
    });

    match result {
        Ok(plugins) => Ok(ApiResponse::ok(plugins)),
        Err(e) => {
            warn!("Failed to get plugin list from API: {}. Using fallback data.", e);
            let fallback_plugins = vec![
                PluginInfo {
                    id: "plugin-analytics".to_string(),
                    name: "数据分析插件".to_string(),
                    version: "1.0.0".to_string(),
                    enabled: true,
                },
                PluginInfo {
                    id: "plugin-reporting".to_string(),
                    name: "报表生成插件".to_string(),
                    version: "1.2.1".to_string(),
                    enabled: true,
                },
            ];
            Ok(ApiResponse::ok(fallback_plugins))
        }
    }
}

#[tauri::command]
pub fn get_user_list(
    _app: AppHandle,
    page: Option<u32>,
    per_page: Option<u32>,
    search: Option<String>,
    request_id: Option<String>,
) -> Result<ApiResponse<serde_json::Value>, String> {
    let mut params: Vec<(&str, String)> = vec![];
    if let Some(p) = page {
        params.push(("page", p.to_string()));
    }
    if let Some(pp) = per_page {
        params.push(("per_page", pp.to_string()));
    }
    if let Some(ref s) = search {
        params.push(("search", s.clone()));
    }

    let params_refs: Vec<(&str, &str)> = params.iter().map(|(k, v)| (*k, v.as_str())).collect();
    let params_opt = if params_refs.is_empty() { None } else { Some(params_refs.as_slice()) };

    ok_or_err(api_get("/users", params_opt, request_id.as_deref()), "Failed to get user list")
}

#[tauri::command]
pub fn get_user(
    _app: AppHandle,
    id: String,
    request_id: Option<String>,
) -> Result<ApiResponse<serde_json::Value>, String> {
    ok_or_err(api_get(&format!("/users/{}", id), None, request_id.as_deref()), "Failed to get user")
}

#[tauri::command]
pub fn create_user(
    _app: AppHandle,
    username: String,
    email: String,
    role: Option<String>,
    department: Option<String>,
    request_id: Option<String>,
) -> Result<ApiResponse<serde_json::Value>, String> {
    let body = serde_json::json!({
        "username": username,
        "email": email,
        "role": role,
        "department": department,
    });
    ok_or_err(api_post("/users", &body, request_id.as_deref()), "Failed to create user")
}

#[tauri::command]
pub fn update_user(
    _app: AppHandle,
    id: String,
    username: Option<String>,
    email: Option<String>,
    role: Option<String>,
    department: Option<String>,
    request_id: Option<String>,
) -> Result<ApiResponse<serde_json::Value>, String> {
    let body = serde_json::json!({
        "username": username,
        "email": email,
        "role": role,
        "department": department,
    });
    ok_or_err(api_put(&format!("/users/{}", id), &body, request_id.as_deref()), "Failed to update user")
}

#[tauri::command]
pub fn delete_user(
    _app: AppHandle,
    id: String,
    request_id: Option<String>,
) -> Result<ApiResponse<()>, String> {
    ok_or_err(api_delete(&format!("/users/{}", id), request_id.as_deref()), "Failed to delete user")
}

#[tauri::command]
pub fn get_role_list(
    _app: AppHandle,
    request_id: Option<String>,
) -> Result<ApiResponse<serde_json::Value>, String> {
    ok_or_err(api_get("/roles", None, request_id.as_deref()), "Failed to get role list")
}

#[tauri::command]
pub fn create_role(
    _app: AppHandle,
    name: String,
    description: Option<String>,
    permissions: Option<Vec<String>>,
    request_id: Option<String>,
) -> Result<ApiResponse<serde_json::Value>, String> {
    let body = serde_json::json!({
        "name": name,
        "description": description,
        "permissions": permissions,
    });
    ok_or_err(api_post("/roles", &body, request_id.as_deref()), "Failed to create role")
}

#[tauri::command]
pub fn update_role(
    _app: AppHandle,
    id: String,
    name: Option<String>,
    description: Option<String>,
    permissions: Option<Vec<String>>,
    request_id: Option<String>,
) -> Result<ApiResponse<serde_json::Value>, String> {
    let body = serde_json::json!({
        "name": name,
        "description": description,
        "permissions": permissions,
    });
    ok_or_err(api_put(&format!("/roles/{}", id), &body, request_id.as_deref()), "Failed to update role")
}

#[tauri::command]
pub fn delete_role(
    _app: AppHandle,
    id: String,
    request_id: Option<String>,
) -> Result<ApiResponse<()>, String> {
    ok_or_err(api_delete(&format!("/roles/{}", id), request_id.as_deref()), "Failed to delete role")
}

#[tauri::command]
pub fn check_health(
    _app: AppHandle,
    request_id: Option<String>,
) -> Result<ApiResponse<serde_json::Value>, String> {
    ok_or_err(api_get("/health", None, request_id.as_deref()), "Health check failed")
}

#[tauri::command]
pub fn get_system_config(
    _app: AppHandle,
    request_id: Option<String>,
) -> Result<ApiResponse<serde_json::Value>, String> {
    ok_or_err(api_get("/system/config", None, request_id.as_deref()), "Failed to get system config")
}

#[tauri::command]
pub fn handle_message(_app: AppHandle, message: IpcMessage) -> Result<ApiResponse<serde_json::Value>, String> {
    if message.api_version != "1.0" {
        return Ok(ApiResponse::err(format!(
            "Unsupported API version: {}. Supported: 1.0",
            message.api_version
        )));
    }

    let valid_modules = vec!["issue", "project", "device", "plugin", "notification"];
    if !valid_modules.contains(&message.module_name.as_str()) {
        return Ok(ApiResponse::err(format!(
            "Invalid module name: {}. Valid modules: {:?}",
            message.module_name, valid_modules
        )));
    }

    info!(
        "Received IPC message: action={}, module={}, payload={:?}",
        message.action, message.module_name, message.payload
    );

    match message.action.as_str() {
        "ping" => {
            let response = serde_json::json!({"pong": true, "timestamp": chrono::Utc::now().to_rfc3339()});
            Ok(ApiResponse::ok(response))
        }
        _ => {
            let response = serde_json::json!({"acknowledged": true, "action": message.action});
            Ok(ApiResponse::ok(response))
        }
    }
}

#[tauri::command]
pub fn subscribe(_app: AppHandle, event: String, window_label: String) -> Result<ApiResponse<()>, String> {
    let mut subs = SUBSCRIPTIONS.lock().unwrap();
    subs.entry(event.clone())
        .or_insert_with(Vec::new)
        .push(window_label.clone());

    info!("Window {} subscribed to event: {}", window_label, event);
    Ok(ApiResponse::ok(()))
}

#[tauri::command]
pub fn unsubscribe(_app: AppHandle, event: String, window_label: String) -> Result<ApiResponse<()>, String> {
    let mut subs = SUBSCRIPTIONS.lock().unwrap();
    if let Some(windows) = subs.get_mut(&event) {
        windows.retain(|w| w != &window_label);
        if windows.is_empty() {
            subs.remove(&event);
        }
    }

    info!("Window {} unsubscribed from event: {}", window_label, event);
    Ok(ApiResponse::ok(()))
}

pub fn emit_to_window(app: &AppHandle, event: &str, data: &serde_json::Value, window_label: &str) {
    if let Some(window) = app.get_webview_window(window_label) {
        let _ = window.emit(event, data);
    } else {
        warn!("Window {} not found, cannot emit event: {}", window_label, event);
    }
}

#[allow(dead_code)]
pub fn broadcast_event(app: &AppHandle, event: &str, data: &serde_json::Value) {
    let subs = SUBSCRIPTIONS.lock().unwrap();
    if let Some(windows) = subs.get(event) {
        for window_label in windows {
            emit_to_window(app, event, data, window_label);
        }
    }
}

pub fn setup_initial_data(app: &AppHandle) {
    let main_window_label = "main";

    if let Ok(response) = get_device_info(app.clone()) {
        if let Ok(device_json) = serde_json::to_value(response) {
            emit_to_window(app, "device-info", &device_json, main_window_label);
        }
    }

    if let Ok(response) = get_plugin_list(app.clone(), None) {
        if let Ok(plugin_json) = serde_json::to_value(response) {
            emit_to_window(app, "plugin-list", &plugin_json, main_window_label);
        }
    }
}

#[tauri::command]
pub fn show_logs_window(app: AppHandle) -> tauri::Result<()> {
    crate::show_logs_window_internal(&app)
}

#[tauri::command]
pub fn is_window_maximized(app: AppHandle) -> bool {
    if let Some(window) = app.get_webview_window(crate::MAIN_WINDOW_LABEL) {
        window.is_maximized().unwrap_or(false)
    } else {
        false
    }
}

#[tauri::command]
pub fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
pub fn get_app_name() -> String {
    env!("CARGO_PKG_NAME").to_string()
}

#[tauri::command]
pub fn restart_app(app: AppHandle) {
    let _ = app.restart();
}

#[tauri::command]
pub fn update_tray_status(
    _app: AppHandle,
    _status: String,
    _badge_count: Option<i32>,
) -> tauri::Result<()> {
    Ok(())
}

#[tauri::command]
pub fn send_system_notification(_title: String, _body: String) -> tauri::Result<()> {
    Ok(())
}

#[tauri::command]
pub fn trigger_tray_notification(
    _app: AppHandle,
    _count: Option<i32>,
) -> tauri::Result<()> {
    Ok(())
}

#[tauri::command]
pub fn create_window(
    app: AppHandle,
    title: String,
    path: String,
) -> tauri::Result<String> {
    let window_label = format!("window-{}", {
        let mut counter = crate::WINDOW_COUNTER.lock().unwrap();
        *counter += 1;
        *counter
    });

    let window = WebviewWindowBuilder::new(
        &app,
        &window_label,
        tauri::WebviewUrl::CustomProtocol(tauri::Url::parse("app://./index.html").unwrap()),
    )
    .title(&format!("TOPEMS - {}", title))
    .inner_size(1200.0, 800.0)
    .min_inner_size(1024.0, 768.0)
    .resizable(true)
    .maximizable(true)
    .decorations(true)
    .center()
    .build()?;

    crate::WINDOW_TITLES
        .lock()
        .unwrap()
        .insert(window_label.clone(), title);

    window.on_window_event(|event| {
        if let WindowEvent::CloseRequested { api, .. } = event {
            api.prevent_close();
        }
    });

    let _ = window.eval(&format!("window.location.href = '{}'", path));

    Ok(window_label)
}

#[tauri::command]
pub fn get_windows(app: AppHandle) -> Vec<(String, String)> {
    let titles = crate::WINDOW_TITLES.lock().unwrap();
    app.webview_windows()
        .into_iter()
        .filter_map(|(label, window)| {
            let title = titles.get(&label).cloned().unwrap_or_else(|| {
                window.title().unwrap_or_else(|_| "未命名窗口".to_string())
            });
            Some((label.to_string(), title))
        })
        .collect()
}

#[tauri::command]
pub fn switch_window(app: AppHandle, label: String) -> tauri::Result<()> {
    if let Some(window) = app.get_webview_window(&label) {
        window.show()?;
        window.unminimize()?;
        window.set_focus()?;
    }
    Ok(())
}

#[tauri::command]
pub fn close_window(app: AppHandle, label: String) -> tauri::Result<()> {
    if label == crate::MAIN_WINDOW_LABEL {
        crate::hide_main_window(&app)?;
    } else if let Some(window) = app.get_webview_window(&label) {
        crate::WINDOW_TITLES.lock().unwrap().remove(&label);
        window.close()?;
    }
    Ok(())
}

#[tauri::command]
pub fn close_current_window(app: AppHandle) -> tauri::Result<()> {
    if let Some(window) = app.get_webview_window(crate::MAIN_WINDOW_LABEL) {
        if window.is_focused().unwrap_or(false) {
            crate::hide_main_window(&app)?;
            return Ok(());
        }
    }

    for (label, window) in app.webview_windows() {
        if window.is_focused().unwrap_or(false) && label != crate::MAIN_WINDOW_LABEL {
            crate::WINDOW_TITLES.lock().unwrap().remove(&label);
            window.close()?;
            break;
        }
    }

    Ok(())
}

#[tauri::command]
pub fn next_window(app: AppHandle) -> tauri::Result<()> {
    let windows: Vec<String> = app.webview_windows().keys().cloned().collect();
    if windows.is_empty() {
        return Ok(());
    }

    let current_label = {
        let mut found = None;
        for (label, window) in app.webview_windows() {
            if window.is_focused().unwrap_or(false) {
                found = Some(label.clone());
                break;
            }
        }
        found
    };

    let current_index = current_label
        .as_ref()
        .and_then(|l| windows.iter().position(|w| w == l))
        .unwrap_or(0);

    let next_index = (current_index + 1) % windows.len();
    switch_window(app, windows[next_index].clone())
}
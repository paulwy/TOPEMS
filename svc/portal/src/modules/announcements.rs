//! Announcements module - BFF proxy to ERP announcement service
//!
//! Portal 不存储公告数据，所有公告请求代理到 ERP 服务。
//! 这里做数据格式适配，保持 Portal API 向后兼容。

use axum::{
    extract::{Json, Path, State},
    http::HeaderMap,
};
use topems_shared_core::response::ApiResponse;

use crate::{
    models::{Announcement, NewAnnouncement},
    shared::AppState,
    utils::user_context::extract_bearer_token,
};

fn erp_base_url() -> String {
    match std::env::var("ERP_SERVICE_URL") {
        Ok(v) if !v.is_empty() => {
            tracing::info!(
                target: "portal::announcements",
                service = "ERP",
                resolved_url = %v,
                source = "env:ERP_SERVICE_URL",
                "[Announcements] 解析 ERP 服务地址"
            );
            v
        }
        _ => {
            tracing::warn!(
                target: "portal::announcements",
                service = "ERP",
                resolved_url = "http://localhost:8010",
                env_var = "ERP_SERVICE_URL",
                "[Announcements] 环境变量未设置，回退到权威默认端口"
            );
            "http://localhost:8010".to_string()
        }
    }
}

fn add_auth_header(
    builder: reqwest::RequestBuilder,
    headers: &HeaderMap,
) -> reqwest::RequestBuilder {
    if let Some(token) = extract_bearer_token(headers) {
        builder.bearer_auth(token)
    } else {
        builder
    }
}

fn map_announcement(a: &serde_json::Value) -> Option<Announcement> {
    Some(Announcement {
        id: a.get("id")?.as_str()?.to_string(),
        title: a.get("title")?.as_str()?.to_string(),
        content: a.get("content")?.as_str()?.to_string(),
        announcement_type: a
            .get("priority")
            .and_then(|v| v.as_str())
            .unwrap_or("normal")
            .to_string(),
        priority: a
            .get("priority")
            .and_then(|v| v.as_str())
            .unwrap_or("normal")
            .to_string(),
        is_pinned: a
            .get("priority")
            .and_then(|v| v.as_str())
            .map(|s| s == "pinned" || s == "high")
            .unwrap_or(false),
        is_active: a
            .get("status")
            .and_then(|v| v.as_str())
            .map(|s| s == "published" || s == "active")
            .unwrap_or(true),
        created_at: a
            .get("created_at")
            .and_then(|v| serde_json::from_value(v.clone()).ok())
            .unwrap_or_else(chrono::Utc::now),
        expires_at: a
            .get("expire_at")
            .and_then(|v| serde_json::from_value(v.clone()).ok())
            .unwrap_or_else(|| chrono::Utc::now() + chrono::Duration::days(30)),
        author: a
            .get("author")
            .and_then(|v| v.as_str())
            .unwrap_or("system")
            .to_string(),
    })
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["portal:read"])),
    path = "/announcements",
    tag = "Portal",
    responses(
        (status = 200, description = "List of announcements", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_announcements(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Json<ApiResponse<Vec<Announcement>>> {
    let url = format!("{}/api/erp/announcements", erp_base_url());
    let req = add_auth_header(state.http_client.get(&url), &headers);
    match req.send().await {
        Ok(resp) => match resp.json::<serde_json::Value>().await {
            Ok(json) => {
                let list = json
                    .get("data")
                    .and_then(|d| d.get("items").or_else(|| d.as_array().map(|_| d)))
                    .and_then(|v| v.as_array())
                    .cloned()
                    .unwrap_or_default();
                let announcements: Vec<Announcement> =
                    list.iter().filter_map(map_announcement).collect();
                Json(ApiResponse::success(announcements, "公告列表获取成功"))
            }
            Err(e) => {
                tracing::warn!("Failed to parse announcements response: {}", e);
                Json(ApiResponse::success(vec![], "公告服务暂不可用，已降级"))
            }
        },
        Err(e) => {
            tracing::warn!("Announcement service unavailable: {}", e);
            Json(ApiResponse::success(vec![], "公告服务暂不可用，已降级"))
        }
    }
}

pub async fn get_announcement(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<Announcement>> {
    let url = format!("{}/api/erp/announcements/{}", erp_base_url(), id);
    match state.http_client.get(&url).send().await {
        Ok(resp) => match resp.json::<serde_json::Value>().await {
            Ok(json) => {
                if let Some(data) = json.get("data") {
                    if let Some(a) = map_announcement(data) {
                        return Json(ApiResponse::success(a, "公告详情获取成功"));
                    }
                }
                Json(ApiResponse::error(404, "公告不存在"))
            }
            Err(e) => {
                tracing::error!("Failed to parse announcement response: {}", e);
                Json(ApiResponse::error(500, "获取公告详情失败"))
            }
        },
        Err(e) => {
            tracing::error!("Failed to fetch announcement: {}", e);
            Json(ApiResponse::error(500, "获取公告详情失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["portal:write"])),
    path = "/announcements",
    tag = "Portal",
    request_body = NewAnnouncement,
    responses(
        (status = 200, description = "Announcement created", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn create_announcement(
    State(state): State<AppState>,
    Json(data): Json<NewAnnouncement>,
) -> Json<ApiResponse<Announcement>> {
    let url = format!("{}/api/erp/announcements", erp_base_url());
    let body = serde_json::json!({
        "title": data.title,
        "content": data.content,
        "priority": data.priority,
        "expire_at": data.expires_at,
    });
    match state.http_client.post(&url).json(&body).send().await {
        Ok(resp) => match resp.json::<serde_json::Value>().await {
            Ok(json) => {
                if let Some(data) = json.get("data") {
                    if let Some(a) = map_announcement(data) {
                        return Json(ApiResponse::success(a, "公告创建成功"));
                    }
                }
                Json(ApiResponse::error(500, "创建公告失败"))
            }
            Err(e) => {
                tracing::error!("Failed to parse create response: {}", e);
                Json(ApiResponse::error(500, "创建公告失败"))
            }
        },
        Err(e) => {
            tracing::error!("Failed to create announcement: {}", e);
            Json(ApiResponse::error(500, "创建公告失败"))
        }
    }
}

pub async fn update_announcement(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(data): Json<NewAnnouncement>,
) -> Json<ApiResponse<Announcement>> {
    let url = format!("{}/api/erp/announcements/{}", erp_base_url(), id);
    let body = serde_json::json!({
        "title": data.title,
        "content": data.content,
        "priority": data.priority,
        "expire_at": data.expires_at,
    });
    match state.http_client.put(&url).json(&body).send().await {
        Ok(resp) => match resp.json::<serde_json::Value>().await {
            Ok(json) => {
                if let Some(data) = json.get("data") {
                    if let Some(a) = map_announcement(data) {
                        return Json(ApiResponse::success(a, "公告更新成功"));
                    }
                }
                Json(ApiResponse::error(500, "更新公告失败"))
            }
            Err(e) => {
                tracing::error!("Failed to parse update response: {}", e);
                Json(ApiResponse::error(500, "更新公告失败"))
            }
        },
        Err(e) => {
            tracing::error!("Failed to update announcement: {}", e);
            Json(ApiResponse::error(500, "更新公告失败"))
        }
    }
}

pub async fn delete_announcement(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    let url = format!("{}/api/erp/announcements/{}", erp_base_url(), id);
    match state.http_client.delete(&url).send().await {
        Ok(_) => Json(ApiResponse::success(
            serde_json::json!({ "id": id, "deleted": true }),
            "公告删除成功",
        )),
        Err(e) => {
            tracing::error!("Failed to delete announcement: {}", e);
            Json(ApiResponse::error(500, "删除公告失败"))
        }
    }
}

pub async fn toggle_announcement_pin(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<Announcement>> {
    let url = format!("{}/api/erp/announcements/{}/pin", erp_base_url(), id);
    match state.http_client.post(&url).send().await {
        Ok(resp) => match resp.json::<serde_json::Value>().await {
            Ok(json) => {
                if let Some(data) = json.get("data") {
                    if let Some(a) = map_announcement(data) {
                        return Json(ApiResponse::success(a, "公告置顶状态已更新"));
                    }
                }
                Json(ApiResponse::error(500, "更新置顶状态失败"))
            }
            Err(e) => {
                tracing::error!("Failed to parse pin response: {}", e);
                Json(ApiResponse::error(500, "更新置顶状态失败"))
            }
        },
        Err(e) => {
            tracing::error!("Failed to toggle pin: {}", e);
            Json(ApiResponse::error(500, "更新置顶状态失败"))
        }
    }
}

pub async fn get_pinned_announcements(
    State(state): State<AppState>,
) -> Json<ApiResponse<Vec<Announcement>>> {
    let url = format!("{}/api/erp/announcements?priority=pinned", erp_base_url());
    match state.http_client.get(&url).send().await {
        Ok(resp) => match resp.json::<serde_json::Value>().await {
            Ok(json) => {
                let list = json
                    .get("data")
                    .and_then(|d| d.get("items").or_else(|| d.as_array().map(|_| d)))
                    .and_then(|v| v.as_array())
                    .cloned()
                    .unwrap_or_default();
                let announcements: Vec<Announcement> =
                    list.iter().filter_map(map_announcement).collect();
                Json(ApiResponse::success(announcements, "置顶公告获取成功"))
            }
            Err(e) => {
                tracing::error!("Failed to parse pinned response: {}", e);
                Json(ApiResponse::error(500, "获取置顶公告失败"))
            }
        },
        Err(e) => {
            tracing::error!("Failed to fetch pinned announcements: {}", e);
            Json(ApiResponse::error(500, "获取置顶公告失败"))
        }
    }
}

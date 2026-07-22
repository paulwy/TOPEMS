//! V15 Phase 5+: Portal 工单代理入口
//!
//! Portal 作为 BFF 聚合层，代理 unified-core 的 ticket API。
//! 提供工单列表、详情、创建、评论、统计等能力。

use axum::extract::{Path, Query, State};
use axum::http::HeaderMap;
use axum::Json;
use serde_json::Value;

use crate::shared::AppState;
use topems_shared::ApiResponse;

fn get_core_url() -> String {
    std::env::var("UNIFIED_CORE_URL")
        .or_else(|_| std::env::var("CORE_URL"))
        .unwrap_or_else(|_| "http://localhost:8000".to_string())
}

fn build_client() -> reqwest::Client {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .unwrap_or_else(|_| reqwest::Client::new())
}

fn forward_headers(headers: &HeaderMap) -> Vec<(String, String)> {
    let mut result = Vec::new();
    if let Some(auth) = headers.get("authorization").and_then(|v| v.to_str().ok()) {
        result.push(("authorization".to_string(), auth.to_string()));
    }
    if let Some(tid) = headers.get("x-tenant-id").and_then(|v| v.to_str().ok()) {
        result.push(("x-tenant-id".to_string(), tid.to_string()));
    }
    if let Some(uid) = headers.get("x-user-id").and_then(|v| v.to_str().ok()) {
        result.push(("x-user-id".to_string(), uid.to_string()));
    }
    result
}

/// 工单列表代理
pub async fn list_tickets(
    State(_state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<Vec<(String, String)>>,
) -> Json<ApiResponse<Value>> {
    let url = format!("{}/api/core/master/tickets", get_core_url());
    let client = build_client();
    let fwd = forward_headers(&headers);

    let mut req = client.get(&url);
    for (k, v) in &fwd {
        req = req.header(k, v);
    }
    if !query.is_empty() {
        req = req.query(&query);
    }

    match req.send().await {
        Ok(resp) => {
            let status = resp.status();
            let json: Value = resp.json().await.unwrap_or(Value::Null);
            if status.is_success() {
                Json(ApiResponse::success(json, "查询工单成功"))
            } else {
                Json(ApiResponse::error(status.as_u16(), &json.to_string()))
            }
        }
        Err(e) => Json(ApiResponse::error(502, &format!("工单服务不可用: {}", e))),
    }
}

/// 工单详情代理
pub async fn get_ticket(
    State(_state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Json<ApiResponse<Value>> {
    let url = format!("{}/api/core/master/tickets/{}", get_core_url(), id);
    let client = build_client();
    let fwd = forward_headers(&headers);

    let mut req = client.get(&url);
    for (k, v) in &fwd {
        req = req.header(k, v);
    }

    match req.send().await {
        Ok(resp) => {
            let status = resp.status();
            let json: Value = resp.json().await.unwrap_or(Value::Null);
            if status.is_success() {
                Json(ApiResponse::success(json, "查询工单成功"))
            } else {
                Json(ApiResponse::error(status.as_u16(), &json.to_string()))
            }
        }
        Err(e) => Json(ApiResponse::error(502, &format!("工单服务不可用: {}", e))),
    }
}

/// 创建工单代理
pub async fn create_ticket(
    State(_state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<Value>,
) -> Json<ApiResponse<Value>> {
    let url = format!("{}/api/core/master/tickets", get_core_url());
    let client = build_client();
    let fwd = forward_headers(&headers);

    let mut req = client.post(&url).json(&body);
    for (k, v) in &fwd {
        req = req.header(k, v);
    }

    match req.send().await {
        Ok(resp) => {
            let status = resp.status();
            let json: Value = resp.json().await.unwrap_or(Value::Null);
            if status.is_success() {
                Json(ApiResponse::success(json, "创建工单成功"))
            } else {
                Json(ApiResponse::error(status.as_u16(), &json.to_string()))
            }
        }
        Err(e) => Json(ApiResponse::error(502, &format!("工单服务不可用: {}", e))),
    }
}

/// 更新工单代理
pub async fn update_ticket(
    State(_state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(body): Json<Value>,
) -> Json<ApiResponse<Value>> {
    let url = format!("{}/api/core/master/tickets/{}", get_core_url(), id);
    let client = build_client();
    let fwd = forward_headers(&headers);

    let mut req = client.put(&url).json(&body);
    for (k, v) in &fwd {
        req = req.header(k, v);
    }

    match req.send().await {
        Ok(resp) => {
            let status = resp.status();
            let json: Value = resp.json().await.unwrap_or(Value::Null);
            if status.is_success() {
                Json(ApiResponse::success(json, "更新工单成功"))
            } else {
                Json(ApiResponse::error(status.as_u16(), &json.to_string()))
            }
        }
        Err(e) => Json(ApiResponse::error(502, &format!("工单服务不可用: {}", e))),
    }
}

/// 工单评论列表代理
pub async fn list_comments(
    State(_state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Json<ApiResponse<Value>> {
    let url = format!("{}/api/core/master/tickets/{}/comments", get_core_url(), id);
    let client = build_client();
    let fwd = forward_headers(&headers);

    let mut req = client.get(&url);
    for (k, v) in &fwd {
        req = req.header(k, v);
    }

    match req.send().await {
        Ok(resp) => {
            let status = resp.status();
            let json: Value = resp.json().await.unwrap_or(Value::Null);
            if status.is_success() {
                Json(ApiResponse::success(json, "查询评论成功"))
            } else {
                Json(ApiResponse::error(status.as_u16(), &json.to_string()))
            }
        }
        Err(e) => Json(ApiResponse::error(502, &format!("工单服务不可用: {}", e))),
    }
}

/// 添加工单评论代理
pub async fn add_comment(
    State(_state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(body): Json<Value>,
) -> Json<ApiResponse<Value>> {
    let url = format!("{}/api/core/master/tickets/{}/comments", get_core_url(), id);
    let client = build_client();
    let fwd = forward_headers(&headers);

    let mut req = client.post(&url).json(&body);
    for (k, v) in &fwd {
        req = req.header(k, v);
    }

    match req.send().await {
        Ok(resp) => {
            let status = resp.status();
            let json: Value = resp.json().await.unwrap_or(Value::Null);
            if status.is_success() {
                Json(ApiResponse::success(json, "添加评论成功"))
            } else {
                Json(ApiResponse::error(status.as_u16(), &json.to_string()))
            }
        }
        Err(e) => Json(ApiResponse::error(502, &format!("工单服务不可用: {}", e))),
    }
}

/// 工单统计代理
pub async fn get_ticket_stats(
    State(_state): State<AppState>,
    headers: HeaderMap,
) -> Json<ApiResponse<Value>> {
    let url = format!("{}/api/core/master/tickets/stats", get_core_url());
    let client = build_client();
    let fwd = forward_headers(&headers);

    let mut req = client.get(&url);
    for (k, v) in &fwd {
        req = req.header(k, v);
    }

    match req.send().await {
        Ok(resp) => {
            let status = resp.status();
            let json: Value = resp.json().await.unwrap_or(Value::Null);
            if status.is_success() {
                Json(ApiResponse::success(json, "查询统计成功"))
            } else {
                Json(ApiResponse::error(status.as_u16(), &json.to_string()))
            }
        }
        Err(e) => Json(ApiResponse::error(502, &format!("工单服务不可用: {}", e))),
    }
}

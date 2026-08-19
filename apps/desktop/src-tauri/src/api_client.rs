use crate::offline_cache;
use reqwest::Client;
use serde::de::DeserializeOwned;
use serde::Serialize;
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tokio::sync::watch;

const DEFAULT_API_BASE_URL: &str = "http://localhost:8080";
const API_TIMEOUT_SECONDS: u64 = 30;
const MAX_RETRIES: u32 = 3;
const INITIAL_DELAY_MS: u64 = 1000;
const MAX_DELAY_MS: u64 = 10000;

lazy_static::lazy_static! {
    pub static ref AUTH_TOKEN: Mutex<Option<String>> = Mutex::new(None);
    pub static ref API_METRICS: Mutex<ApiMetrics> = Mutex::new(ApiMetrics::default());
    pub static ref CANCEL_SENDER: Mutex<Option<watch::Sender<bool>>> = Mutex::new(None);
    pub static ref CANCEL_TOKENS: Mutex<HashMap<String, watch::Sender<bool>>> = Mutex::new(HashMap::new());
}

#[derive(Debug, Clone, Default, serde::Serialize)]
pub struct ApiMetrics {
    pub total_requests: u64,
    pub success_count: u64,
    pub failure_count: u64,
    pub retry_count: u64,
    pub avg_response_time_ms: f64,
}

pub fn set_auth_token(token: Option<String>) {
    let mut stored = AUTH_TOKEN.lock().unwrap();
    stored.clone_from(&token);
    drop(stored);

    if let Some(ref t) = token {
        if let Err(e) = crate::secure_store::save_token_encrypted(t) {
            log::warn!("Failed to persist encrypted token: {}", e);
        }
    } else {
        if let Err(e) = crate::secure_store::clear_token_encrypted() {
            log::warn!("Failed to clear encrypted token: {}", e);
        }
    }
}

pub fn get_auth_token() -> Option<String> {
    {
        let stored = AUTH_TOKEN.lock().unwrap();
        if stored.is_some() {
            return stored.clone();
        }
    }
    if let Ok(Some(token)) = crate::secure_store::load_token_encrypted() {
        return Some(token);
    }
    std::env::var("TOPEMS_AUTH_TOKEN").ok()
}

pub fn clear_auth_token_persistent() {
    {
        let mut stored = AUTH_TOKEN.lock().unwrap();
        *stored = None;
    }
    if let Err(e) = crate::secure_store::clear_token_encrypted() {
        log::warn!("Failed to clear encrypted token: {}", e);
    }
}

pub fn get_api_base_url() -> String {
    std::env::var("TOPEMS_API_URL")
        .unwrap_or_else(|_| DEFAULT_API_BASE_URL.to_string())
}

pub fn create_client() -> Result<Client, String> {
    Client::builder()
        .timeout(Duration::from_secs(API_TIMEOUT_SECONDS))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))
}

fn is_network_error(e: &reqwest::Error) -> bool {
    e.is_connect() || e.is_timeout() || e.is_request()
}

fn update_metrics(success: bool, retries: u64, duration_ms: u64) {
    let mut metrics = API_METRICS.lock().unwrap();
    metrics.total_requests += 1;
    let n = metrics.total_requests as f64;
    metrics.avg_response_time_ms += (duration_ms as f64 - metrics.avg_response_time_ms) / n;
    if success {
        metrics.success_count += 1;
    } else {
        metrics.failure_count += 1;
    }
    metrics.retry_count += retries;
}

pub fn get_metrics() -> ApiMetrics {
    let metrics = API_METRICS.lock().unwrap();
    metrics.clone()
}

pub fn init_cancel_channel() -> watch::Receiver<bool> {
    let (tx, rx) = watch::channel(false);
    let mut sender = CANCEL_SENDER.lock().unwrap();
    *sender = Some(tx);
    rx
}

pub fn cancel_all_requests() {
    {
        let mut sender = CANCEL_SENDER.lock().unwrap();
        if let Some(tx) = sender.as_ref() {
            let _ = tx.send(true);
        }
        let (new_tx, _) = watch::channel(false);
        *sender = Some(new_tx);
    }
    {
        let tokens = CANCEL_TOKENS.lock().unwrap();
        for (_, tx) in tokens.iter() {
            let _ = tx.send(true);
        }
    }
}

pub fn register_cancel_token(request_id: &str, sender: watch::Sender<bool>) {
    CANCEL_TOKENS.lock().unwrap().insert(request_id.to_string(), sender);
}

pub fn unregister_cancel_token(request_id: &str) {
    CANCEL_TOKENS.lock().unwrap().remove(request_id);
}

pub fn cancel_request(request_id: &str) -> Result<(), String> {
    let tokens = CANCEL_TOKENS.lock().unwrap();
    if let Some(tx) = tokens.get(request_id) {
        let _ = tx.send(true);
        Ok(())
    } else {
        Err(format!("Request {} not found", request_id))
    }
}

pub fn get_active_requests() -> Vec<String> {
    let tokens = CANCEL_TOKENS.lock().unwrap();
    tokens.keys().cloned().collect()
}

fn is_cancelled(rx: &watch::Receiver<bool>) -> bool {
    *rx.borrow()
}

struct TokenCleanup<'a>(&'a str);
impl<'a> Drop for TokenCleanup<'a> {
    fn drop(&mut self) {
        unregister_cancel_token(self.0);
    }
}

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

pub async fn get<T: DeserializeOwned + serde::Serialize>(
    client: &Client,
    path: &str,
    params: Option<&[(&str, &str)]>,
    token: Option<&str>,
    request_id: Option<&str>,
) -> Result<T, String> {
    let base_url = get_api_base_url();
    let url = if let Some(params) = params {
        let query: String = params
            .iter()
            .map(|(k, v)| format!("{}={}", k, v))
            .collect::<Vec<_>>()
            .join("&");
        format!("{}{}?{}", base_url, path, query)
    } else {
        format!("{}{}", base_url, path)
    };

    let start = Instant::now();
    let mut retry_count: u64 = 0;
    let mut last_error: Option<String> = None;
    let mut got_network_error = false;

    let (cancel_rx, _cleanup_guard) = if let Some(rid) = request_id {
        let (tx, rx) = watch::channel(false);
        register_cancel_token(rid, tx);
        (rx, Some(TokenCleanup(rid)))
    } else {
        (init_cancel_channel(), None)
    };

    for attempt in 0..=MAX_RETRIES {
        if is_cancelled(&cancel_rx) {
            update_metrics(false, retry_count, start.elapsed().as_millis() as u64);
            return Err("Request cancelled by user".to_string());
        }
        if attempt > 0 {
            retry_count += 1;
            let delay_ms = (INITIAL_DELAY_MS * (1 << (attempt - 1))).min(MAX_DELAY_MS);
            log::warn!(
                "Retrying GET {} (attempt {}/{}) after {}ms",
                url, attempt, MAX_RETRIES, delay_ms
            );
            tokio::time::sleep(Duration::from_millis(delay_ms)).await;
        }

        let mut request = client.get(&url);
        if let Some(t) = token {
            request = request.header("Authorization", format!("Bearer {}", t));
        }

        match request.send().await {
            Ok(response) => {
                let status = response.status();
                if status.is_success() {
                    let api_response: ApiResponse<T> = response.json().await.map_err(|e| {
                        format!("Failed to parse response: {}", e)
                    })?;

                    if !api_response.success {
                        let err = api_response.error.unwrap_or_else(|| "Unknown API error".to_string());
                        update_metrics(false, retry_count, start.elapsed().as_millis() as u64);
                        return Err(err);
                    }

                    if let Some(ref data) = api_response.data {
                        if let Ok(json_val) = serde_json::to_value(data) {
                            let _ = offline_cache::cache_get_response(path, params, json_val, 300);
                        }
                    }

                    update_metrics(true, retry_count, start.elapsed().as_millis() as u64);
                    return api_response
                        .data
                        .ok_or_else(|| "No data in API response".to_string());
                } else if status.as_u16() >= 500 && status.as_u16() < 600 {
                    let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
                    last_error = Some(format!(
                        "API error: {} {} - {}",
                        status.as_u16(),
                        status.canonical_reason().unwrap_or("Unknown"),
                        error_text
                    ));
                    if attempt == MAX_RETRIES {
                        break;
                    }
                    log::warn!(
                        "5xx server error on GET {} (status: {}), will retry",
                        url,
                        status.as_u16()
                    );
                } else {
                    let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
                    update_metrics(false, retry_count, start.elapsed().as_millis() as u64);
                    return Err(format!(
                        "API error: {} {} - {}",
                        status.as_u16(),
                        status.canonical_reason().unwrap_or("Unknown"),
                        error_text
                    ));
                }
            }
            Err(e) => {
                if is_network_error(&e) {
                    got_network_error = true;
                }
                last_error = Some(format!("Request failed: {} (URL: {})", e, url));
                if attempt == MAX_RETRIES {
                    break;
                }
                log::warn!("Network error on GET {}: {}, will retry", url, e);
            }
        }
    }

    if got_network_error && offline_cache::is_offline() {
        if let Some(cached) = offline_cache::get_cached_response(path, params) {
            if let Ok(deserialized) = serde_json::from_value::<T>(cached) {
                update_metrics(true, retry_count, start.elapsed().as_millis() as u64);
                log::info!("Returning cached response for GET {} (offline mode)", path);
                return Ok(deserialized);
            }
        }
    }

    update_metrics(false, retry_count, start.elapsed().as_millis() as u64);
    Err(last_error.unwrap_or_else(|| "All retry attempts exhausted".to_string()))
}

#[allow(dead_code)]
pub async fn post<T: DeserializeOwned, B: Serialize>(
    client: &Client,
    path: &str,
    body: &B,
    token: Option<&str>,
    request_id: Option<&str>,
) -> Result<T, String> {
    let base_url = get_api_base_url();
    let url = format!("{}{}", base_url, path);

    let start = Instant::now();
    let mut retry_count: u64 = 0;
    let mut last_error: Option<String> = None;
    let mut got_network_error = false;

    let (cancel_rx, _cleanup_guard) = if let Some(rid) = request_id {
        let (tx, rx) = watch::channel(false);
        register_cancel_token(rid, tx);
        (rx, Some(TokenCleanup(rid)))
    } else {
        (init_cancel_channel(), None)
    };

    for attempt in 0..=MAX_RETRIES {
        if is_cancelled(&cancel_rx) {
            update_metrics(false, retry_count, start.elapsed().as_millis() as u64);
            return Err("Request cancelled by user".to_string());
        }
        if attempt > 0 {
            retry_count += 1;
            let delay_ms = (INITIAL_DELAY_MS * (1 << (attempt - 1))).min(MAX_DELAY_MS);
            log::warn!(
                "Retrying POST {} (attempt {}/{}) after {}ms",
                url, attempt, MAX_RETRIES, delay_ms
            );
            tokio::time::sleep(Duration::from_millis(delay_ms)).await;
        }

        let mut request = client.post(&url).json(body);
        if let Some(t) = token {
            request = request.header("Authorization", format!("Bearer {}", t));
        }

        match request.send().await {
            Ok(response) => {
                let status = response.status();
                if status.is_success() {
                    let api_response: ApiResponse<T> = response.json().await.map_err(|e| {
                        format!("Failed to parse response: {}", e)
                    })?;

                    if !api_response.success {
                        let err = api_response.error.unwrap_or_else(|| "Unknown API error".to_string());
                        update_metrics(false, retry_count, start.elapsed().as_millis() as u64);
                        return Err(err);
                    }

                    update_metrics(true, retry_count, start.elapsed().as_millis() as u64);
                    return api_response
                        .data
                        .ok_or_else(|| "No data in API response".to_string());
                } else if status.as_u16() >= 500 && status.as_u16() < 600 {
                    let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
                    last_error = Some(format!(
                        "API error: {} {} - {}",
                        status.as_u16(),
                        status.canonical_reason().unwrap_or("Unknown"),
                        error_text
                    ));
                    if attempt == MAX_RETRIES {
                        break;
                    }
                    log::warn!(
                        "5xx server error on POST {} (status: {}), will retry",
                        url,
                        status.as_u16()
                    );
                } else {
                    let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
                    update_metrics(false, retry_count, start.elapsed().as_millis() as u64);
                    return Err(format!(
                        "API error: {} {} - {}",
                        status.as_u16(),
                        status.canonical_reason().unwrap_or("Unknown"),
                        error_text
                    ));
                }
            }
            Err(e) => {
                if is_network_error(&e) {
                    got_network_error = true;
                }
                last_error = Some(format!("Request failed: {} (URL: {})", e, url));
                if attempt == MAX_RETRIES {
                    break;
                }
                log::warn!("Network error on POST {}: {}, will retry", url, e);
            }
        }
    }

    if got_network_error {
        let body_json = serde_json::to_value(body).ok();
        let req = offline_cache::CachedRequest {
            id: format!("req-{}", chrono::Utc::now().timestamp_millis()),
            method: "POST".to_string(),
            path: path.to_string(),
            body: body_json,
            params: None,
            created_at: chrono::Utc::now().to_rfc3339(),
            retry_count: 0,
            max_retries: 3,
        };
        let _ = offline_cache::enqueue_request(req);
        log::info!("POST {} queued for offline sync", path);
    }

    update_metrics(false, retry_count, start.elapsed().as_millis() as u64);
    Err(last_error.unwrap_or_else(|| "All retry attempts exhausted".to_string()))
}

#[allow(dead_code)]
pub async fn put<T: DeserializeOwned, B: Serialize>(
    client: &Client,
    path: &str,
    body: &B,
    token: Option<&str>,
    request_id: Option<&str>,
) -> Result<T, String> {
    let base_url = get_api_base_url();
    let url = format!("{}{}", base_url, path);

    let start = Instant::now();
    let mut retry_count: u64 = 0;
    let mut last_error: Option<String> = None;
    let mut got_network_error = false;

    let (cancel_rx, _cleanup_guard) = if let Some(rid) = request_id {
        let (tx, rx) = watch::channel(false);
        register_cancel_token(rid, tx);
        (rx, Some(TokenCleanup(rid)))
    } else {
        (init_cancel_channel(), None)
    };

    for attempt in 0..=MAX_RETRIES {
        if is_cancelled(&cancel_rx) {
            update_metrics(false, retry_count, start.elapsed().as_millis() as u64);
            return Err("Request cancelled by user".to_string());
        }
        if attempt > 0 {
            retry_count += 1;
            let delay_ms = (INITIAL_DELAY_MS * (1 << (attempt - 1))).min(MAX_DELAY_MS);
            log::warn!(
                "Retrying PUT {} (attempt {}/{}) after {}ms",
                url, attempt, MAX_RETRIES, delay_ms
            );
            tokio::time::sleep(Duration::from_millis(delay_ms)).await;
        }

        let mut request = client.put(&url).json(body);
        if let Some(t) = token {
            request = request.header("Authorization", format!("Bearer {}", t));
        }

        match request.send().await {
            Ok(response) => {
                let status = response.status();
                if status.is_success() {
                    let api_response: ApiResponse<T> = response.json().await.map_err(|e| {
                        format!("Failed to parse response: {}", e)
                    })?;

                    if !api_response.success {
                        let err = api_response.error.unwrap_or_else(|| "Unknown API error".to_string());
                        update_metrics(false, retry_count, start.elapsed().as_millis() as u64);
                        return Err(err);
                    }

                    update_metrics(true, retry_count, start.elapsed().as_millis() as u64);
                    return api_response
                        .data
                        .ok_or_else(|| "No data in API response".to_string());
                } else if status.as_u16() >= 500 && status.as_u16() < 600 {
                    let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
                    last_error = Some(format!(
                        "API error: {} {} - {}",
                        status.as_u16(),
                        status.canonical_reason().unwrap_or("Unknown"),
                        error_text
                    ));
                    if attempt == MAX_RETRIES {
                        break;
                    }
                    log::warn!(
                        "5xx server error on PUT {} (status: {}), will retry",
                        url,
                        status.as_u16()
                    );
                } else {
                    let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
                    update_metrics(false, retry_count, start.elapsed().as_millis() as u64);
                    return Err(format!(
                        "API error: {} {} - {}",
                        status.as_u16(),
                        status.canonical_reason().unwrap_or("Unknown"),
                        error_text
                    ));
                }
            }
            Err(e) => {
                if is_network_error(&e) {
                    got_network_error = true;
                }
                last_error = Some(format!("Request failed: {} (URL: {})", e, url));
                if attempt == MAX_RETRIES {
                    break;
                }
                log::warn!("Network error on PUT {}: {}, will retry", url, e);
            }
        }
    }

    if got_network_error {
        let body_json = serde_json::to_value(body).ok();
        let req = offline_cache::CachedRequest {
            id: format!("req-{}", chrono::Utc::now().timestamp_millis()),
            method: "PUT".to_string(),
            path: path.to_string(),
            body: body_json,
            params: None,
            created_at: chrono::Utc::now().to_rfc3339(),
            retry_count: 0,
            max_retries: 3,
        };
        let _ = offline_cache::enqueue_request(req);
        log::info!("PUT {} queued for offline sync", path);
    }

    update_metrics(false, retry_count, start.elapsed().as_millis() as u64);
    Err(last_error.unwrap_or_else(|| "All retry attempts exhausted".to_string()))
}

#[allow(dead_code)]
pub async fn delete<T: DeserializeOwned + Default>(
    client: &Client,
    path: &str,
    token: Option<&str>,
    request_id: Option<&str>,
) -> Result<T, String> {
    let base_url = get_api_base_url();
    let url = format!("{}{}", base_url, path);

    let start = Instant::now();
    let mut retry_count: u64 = 0;
    let mut last_error: Option<String> = None;
    let mut got_network_error = false;

    let (cancel_rx, _cleanup_guard) = if let Some(rid) = request_id {
        let (tx, rx) = watch::channel(false);
        register_cancel_token(rid, tx);
        (rx, Some(TokenCleanup(rid)))
    } else {
        (init_cancel_channel(), None)
    };

    for attempt in 0..=MAX_RETRIES {
        if is_cancelled(&cancel_rx) {
            update_metrics(false, retry_count, start.elapsed().as_millis() as u64);
            return Err("Request cancelled by user".to_string());
        }
        if attempt > 0 {
            retry_count += 1;
            let delay_ms = (INITIAL_DELAY_MS * (1 << (attempt - 1))).min(MAX_DELAY_MS);
            log::warn!(
                "Retrying DELETE {} (attempt {}/{}) after {}ms",
                url, attempt, MAX_RETRIES, delay_ms
            );
            tokio::time::sleep(Duration::from_millis(delay_ms)).await;
        }

        let mut request = client.delete(&url);
        if let Some(t) = token {
            request = request.header("Authorization", format!("Bearer {}", t));
        }

        match request.send().await {
            Ok(response) => {
                let status = response.status();
                if status.is_success() {
                    let api_response: ApiResponse<T> = response.json().await.map_err(|e| {
                        format!("Failed to parse response: {}", e)
                    })?;

                    if !api_response.success {
                        let err = api_response.error.unwrap_or_else(|| "Unknown API error".to_string());
                        update_metrics(false, retry_count, start.elapsed().as_millis() as u64);
                        return Err(err);
                    }

                    let val = api_response.data.unwrap_or_default();
                    update_metrics(true, retry_count, start.elapsed().as_millis() as u64);
                    return Ok(val);
                } else if status.as_u16() >= 500 && status.as_u16() < 600 {
                    let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
                    last_error = Some(format!(
                        "API error: {} {} - {}",
                        status.as_u16(),
                        status.canonical_reason().unwrap_or("Unknown"),
                        error_text
                    ));
                    if attempt == MAX_RETRIES {
                        break;
                    }
                    log::warn!(
                        "5xx server error on DELETE {} (status: {}), will retry",
                        url,
                        status.as_u16()
                    );
                } else {
                    let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
                    update_metrics(false, retry_count, start.elapsed().as_millis() as u64);
                    return Err(format!(
                        "API error: {} {} - {}",
                        status.as_u16(),
                        status.canonical_reason().unwrap_or("Unknown"),
                        error_text
                    ));
                }
            }
            Err(e) => {
                if is_network_error(&e) {
                    got_network_error = true;
                }
                last_error = Some(format!("Request failed: {} (URL: {})", e, url));
                if attempt == MAX_RETRIES {
                    break;
                }
                log::warn!("Network error on DELETE {}: {}, will retry", url, e);
            }
        }
    }

    if got_network_error {
        let req = offline_cache::CachedRequest {
            id: format!("req-{}", chrono::Utc::now().timestamp_millis()),
            method: "DELETE".to_string(),
            path: path.to_string(),
            body: None,
            params: None,
            created_at: chrono::Utc::now().to_rfc3339(),
            retry_count: 0,
            max_retries: 3,
        };
        let _ = offline_cache::enqueue_request(req);
        log::info!("DELETE {} queued for offline sync", path);
    }

    update_metrics(false, retry_count, start.elapsed().as_millis() as u64);
    Err(last_error.unwrap_or_else(|| "All retry attempts exhausted".to_string()))
}
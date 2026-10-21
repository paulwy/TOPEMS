// Anti-Replay 非重放防护中间件
// 默认 enabled=false（与前端 DEFAULT_ANTI_REPLAY 一致，不影响任何路径）；
// 管理员通过 GET/PUT /iam/v1/rate-limit/config/anti-replay 配置后，
// 对 enforce_paths 内的请求校验 X-Request-Timestamp（unix 秒，容差 tolerance_secs）
// 与 X-Request-Nonce（nonce 缓存防重放，缓存 nonce_cache_secs）。

use axum::{
    body::Body,
    extract::{Request, State},
    http::StatusCode,
    middleware::Next,
    response::{IntoResponse, Response},
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;
use tracing::warn;

use crate::AppState;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AntiReplayConfig {
    pub enabled: bool,
    pub tolerance_secs: u64,
    pub nonce_cache_secs: u64,
    pub timestamp_header: String,
    pub nonce_header: String,
    pub enforce_paths: Vec<String>,
}

impl Default for AntiReplayConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            tolerance_secs: 300,
            nonce_cache_secs: 600,
            timestamp_header: "X-Request-Timestamp".to_string(),
            nonce_header: "X-Request-Nonce".to_string(),
            enforce_paths: Vec::new(),
        }
    }
}

/// 共享非重放状态：配置（可写）+ nonce 缓存（时间戳过期惰性清理）
#[derive(Debug, Clone)]
pub struct AntiReplayState {
    config: Arc<RwLock<AntiReplayConfig>>,
    nonces: Arc<RwLock<HashMap<String, Instant>>>,
}

impl Default for AntiReplayState {
    fn default() -> Self {
        Self::new()
    }
}

impl AntiReplayState {
    pub fn new() -> Self {
        Self {
            config: Arc::new(RwLock::new(AntiReplayConfig::default())),
            nonces: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub fn config_arc(&self) -> Arc<RwLock<AntiReplayConfig>> {
        Arc::clone(&self.config)
    }

    pub async fn config(&self) -> AntiReplayConfig {
        self.config.read().await.clone()
    }

    pub async fn update_config(&self, next: AntiReplayConfig) {
        *self.config.write().await = next;
    }
}

fn reject(message: &str) -> Response {
    let body = serde_json::json!({
        "success": false,
        "message": message,
        "data": null,
        "code": 400,
    });
    (StatusCode::BAD_REQUEST, body.to_string()).into_response()
}

fn replay_reject(message: &str) -> Response {
    let body = serde_json::json!({
        "success": false,
        "message": message,
        "data": null,
        "code": 429,
    });
    (StatusCode::TOO_MANY_REQUESTS, body.to_string()).into_response()
}

pub async fn anti_replay_middleware(
    State(state): State<AppState>,
    req: Request<Body>,
    next: Next,
) -> Response {
    let ar = &state.anti_replay_state;
    let config = ar.config().await;

    if !config.enabled {
        return next.run(req).await;
    }

    let path = req.uri().path();
    if !config
        .enforce_paths
        .iter()
        .any(|p| path.starts_with(p.as_str()))
    {
        return next.run(req).await;
    }

    // 时间戳校验：unix 秒，|now - ts| <= tolerance
    let ts_raw = req
        .headers()
        .get(&config.timestamp_header)
        .and_then(|v| v.to_str().ok());
    let ts: i64 = match ts_raw.and_then(|s| s.parse().ok()) {
        Some(t) => t,
        None => return reject("Missing or invalid X-Request-Timestamp header"),
    };
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .ok()
        .and_then(|d| i64::try_from(d.as_secs()).ok())
        .unwrap_or(0);
    let tolerance = i64::try_from(config.tolerance_secs).unwrap_or(i64::MAX);
    if (now - ts).abs() > tolerance {
        return reject("Request timestamp out of tolerance window");
    }

    // nonce 校验：缓存命中 = 重放，拒绝；否则登记
    let nonce = req
        .headers()
        .get(&config.nonce_header)
        .and_then(|v| v.to_str().ok());
    let nonce = match nonce {
        Some(n) if !n.is_empty() => n,
        _ => return reject("Missing or invalid X-Request-Nonce header"),
    };

    let mut nonces = ar.nonces.write().await;
    // 惰性清理过期 nonce（非重放路径上按需触发，避免常驻扫描）
    let cache_ttl = Duration::from_secs(config.nonce_cache_secs);
    nonces.retain(|_, seen| seen.elapsed() < cache_ttl);

    if nonces.contains_key(nonce) {
        warn!("Anti-replay rejected duplicate nonce: {}", nonce);
        return replay_reject("Duplicate request nonce (replay detected)");
    }
    nonces.insert(nonce.to_string(), Instant::now());

    next.run(req).await
}

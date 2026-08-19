use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use directories::ProjectDirs;
use chrono::Utc;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CachedRequest {
    pub id: String,
    pub method: String,
    pub path: String,
    pub body: Option<serde_json::Value>,
    pub params: Option<Vec<(String, String)>>,
    pub created_at: String,
    pub retry_count: u32,
    pub max_retries: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CachedResponse {
    pub path: String,
    pub data: serde_json::Value,
    pub cached_at: String,
    pub ttl_seconds: i64,
}

lazy_static::lazy_static! {
    pub static ref SYNC_QUEUE: Mutex<VecDeque<CachedRequest>> = Mutex::new(VecDeque::new());
    pub static ref RESPONSE_CACHE: Mutex<Vec<CachedResponse>> = Mutex::new(Vec::new());
    pub static ref IS_OFFLINE: Mutex<bool> = Mutex::new(false);
}

pub fn get_cache_dir() -> PathBuf {
    ProjectDirs::from("com", "topems", "TOPEMS")
        .map(|dirs| dirs.data_dir().join("cache"))
        .unwrap_or_else(|| {
            std::env::temp_dir().join("topems_cache")
        })
}

fn get_sync_queue_path() -> PathBuf {
    get_cache_dir().join("sync_queue.json")
}

fn get_response_cache_path() -> PathBuf {
    get_cache_dir().join("response_cache.json")
}

fn get_offline_flag_path() -> PathBuf {
    get_cache_dir().join("offline.json")
}

fn ensure_cache_dir() -> Result<(), String> {
    let dir = get_cache_dir();
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| format!("Failed to create cache directory: {}", e))?;
    }
    Ok(())
}

pub fn enqueue_request(req: CachedRequest) -> Result<(), String> {
    {
        let mut queue = SYNC_QUEUE.lock().unwrap();
        queue.push_back(req);
    }
    save_persistent_state();
    Ok(())
}

pub fn dequeue_request() -> Option<CachedRequest> {
    let mut queue = SYNC_QUEUE.lock().unwrap();
    let req = queue.pop_front();
    drop(queue);
    save_persistent_state();
    req
}

pub fn get_queue() -> Vec<CachedRequest> {
    let queue = SYNC_QUEUE.lock().unwrap();
    queue.iter().cloned().collect()
}

pub fn cache_get_response(
    path: &str,
    params: Option<&[(&str, &str)]>,
    data: serde_json::Value,
    ttl_seconds: i64,
) -> Result<(), String> {
    let cache_key = if let Some(params) = params {
        let params_str: String = params
            .iter()
            .map(|(k, v)| format!("{}={}", k, v))
            .collect::<Vec<_>>()
            .join("&");
        format!("{}?{}", path, params_str)
    } else {
        path.to_string()
    };

    let entry = CachedResponse {
        path: cache_key,
        data,
        cached_at: Utc::now().to_rfc3339(),
        ttl_seconds,
    };

    let mut cache = RESPONSE_CACHE.lock().unwrap();
    if let Some(pos) = cache.iter().position(|r| r.path == entry.path) {
        cache.remove(pos);
    }
    cache.push(entry);
    drop(cache);
    save_persistent_state();
    Ok(())
}

pub fn get_cached_response(
    path: &str,
    params: Option<&[(&str, &str)]>,
) -> Option<serde_json::Value> {
    let cache_key = if let Some(params) = params {
        let params_str: String = params
            .iter()
            .map(|(k, v)| format!("{}={}", k, v))
            .collect::<Vec<_>>()
            .join("&");
        format!("{}?{}", path, params_str)
    } else {
        path.to_string()
    };

    let cache = RESPONSE_CACHE.lock().unwrap();
    let now = Utc::now();

    for entry in cache.iter() {
        if entry.path == cache_key {
            if entry.ttl_seconds == -1 {
                return Some(entry.data.clone());
            }
            if let Ok(cached_at) = chrono::DateTime::parse_from_rfc3339(&entry.cached_at) {
                let elapsed = now.signed_duration_since(cached_at.with_timezone(&Utc));
                if elapsed.num_seconds() < entry.ttl_seconds {
                    return Some(entry.data.clone());
                }
            }
        }
    }
    None
}

pub fn set_offline_mode(offline: bool) {
    let mut flag = IS_OFFLINE.lock().unwrap();
    *flag = offline;
    drop(flag);
    save_persistent_state();
}

pub fn is_offline() -> bool {
    *IS_OFFLINE.lock().unwrap()
}

pub fn flush_sync_queue(client: &reqwest::Client, token: Option<&str>) -> Result<usize, String> {
    let mut replayed_count = 0;

    loop {
        let req = {
            let queue = SYNC_QUEUE.lock().unwrap();
            if queue.is_empty() {
                break;
            }
            queue.front().cloned()
        };

        let req = match req {
            Some(r) => r,
            None => break,
        };

        let base_url = crate::api_client::get_api_base_url();
        let url = format!("{}{}", base_url, req.path);

        let mut request_builder = match req.method.as_str() {
            "POST" => client.post(&url),
            "PUT" => client.put(&url),
            "DELETE" => client.delete(&url),
            "GET" => client.get(&url),
            _ => break,
        };

        if let Some(t) = token {
            request_builder = request_builder.header("Authorization", format!("Bearer {}", t));
        }

        if let Some(body) = &req.body {
            request_builder = request_builder.json(body);
        }

        let runtime = tokio::runtime::Runtime::new()
            .map_err(|e| format!("Failed to create runtime: {}", e))?;

        let success = runtime.block_on(async {
            match request_builder.send().await {
                Ok(resp) => resp.status().is_success(),
                Err(_) => false,
            }
        });

        if success {
            let mut queue = SYNC_QUEUE.lock().unwrap();
            queue.pop_front();
            replayed_count += 1;
        } else {
            let mut queue = SYNC_QUEUE.lock().unwrap();
            if let Some(front) = queue.front_mut() {
                front.retry_count += 1;
                if front.retry_count >= front.max_retries {
                    queue.pop_front();
                }
            }
            save_persistent_state();
            break;
        }
    }

    save_persistent_state();
    Ok(replayed_count)
}

pub fn load_persistent_state() {
    let _ = ensure_cache_dir();

    if let Ok(data) = fs::read_to_string(get_sync_queue_path()) {
        if let Ok(queue) = serde_json::from_str::<VecDeque<CachedRequest>>(&data) {
            let mut q = SYNC_QUEUE.lock().unwrap();
            *q = queue;
        }
    }

    if let Ok(data) = fs::read_to_string(get_response_cache_path()) {
        if let Ok(cache) = serde_json::from_str::<Vec<CachedResponse>>(&data) {
            let mut c = RESPONSE_CACHE.lock().unwrap();
            *c = cache;
        }
    }

    if let Ok(data) = fs::read_to_string(get_offline_flag_path()) {
        if let Ok(offline) = serde_json::from_str::<bool>(&data) {
            let mut flag = IS_OFFLINE.lock().unwrap();
            *flag = offline;
        }
    }
}

pub fn save_persistent_state() {
    let _ = ensure_cache_dir();

    {
        let queue = SYNC_QUEUE.lock().unwrap();
        if let Ok(json) = serde_json::to_string(&*queue) {
            let _ = fs::write(get_sync_queue_path(), json);
        }
    }

    {
        let cache = RESPONSE_CACHE.lock().unwrap();
        if let Ok(json) = serde_json::to_string(&*cache) {
            let _ = fs::write(get_response_cache_path(), json);
        }
    }

    {
        let flag = IS_OFFLINE.lock().unwrap();
        if let Ok(json) = serde_json::to_string(&*flag) {
            let _ = fs::write(get_offline_flag_path(), json);
        }
    }
}
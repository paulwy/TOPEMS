// ==================== V44.0 AC-16: 同步编排引擎 V2 ====================

use axum::extract::{Path, Query, State};
use axum::Json;
use serde::Deserialize;
use std::collections::HashMap;

use topems_shared::ApiResponse;
use topems_shared_core::response::PaginatedResponse;

use super::ApiState;

#[derive(Debug, Clone, serde::Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
#[derive(Default)]
pub enum SyncJobPriority {
    High,
    #[default]
    Normal,
    Low,
}

#[derive(Debug, Clone, serde::Serialize, Deserialize)]
pub struct SyncJobV2 {
    pub id: String,
    pub tenant_id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub operation: String,
    pub status: String,
    pub source_system: String,
    pub target_systems: Vec<String>,
    pub priority: SyncJobPriority,
    pub tags: Vec<String>,
    pub scheduled_at: Option<String>,
    pub retries_exhausted: bool,
    pub dead_letter_reason: Option<String>,
    pub current_step: i32,
    pub retry_count: i32,
    pub max_retries: i32,
    pub created_at: String,
    pub updated_at: String,
    pub completed_at: Option<String>,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct PriorityQueue {
    pub high: Vec<SyncJobV2>,
    pub normal: Vec<SyncJobV2>,
    pub low: Vec<SyncJobV2>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct TenantIsolation {
    pub tenant_id: String,
    pub jobs: Vec<SyncJobV2>,
    pub stats: TenantSyncStats,
}

#[derive(Debug, Clone, serde::Serialize, Deserialize)]
pub struct DeadLetterV2 {
    pub id: String,
    pub job_id: String,
    pub tenant_id: String,
    pub entity_type: String,
    pub operation: String,
    pub error_message: String,
    pub retry_count: i32,
    pub last_retry_at: Option<String>,
    pub retryable: bool,
    pub category: String,
    pub created_at: String,
    pub payload: Option<serde_json::Value>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct TenantSyncStats {
    pub total_jobs: i64,
    pub successful: i64,
    pub failed: i64,
    pub in_progress: i64,
    pub pending: i64,
    pub dead_letter_count: i64,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct SyncEngineStatsV2 {
    pub total_jobs: i64,
    pub by_priority: HashMap<String, i64>,
    pub by_status: HashMap<String, i64>,
    pub by_tenant: HashMap<String, TenantSyncStats>,
    pub dead_letter_count: i64,
    pub avg_processing_time_ms: f64,
    pub queue_size: i64,
}

#[derive(Debug, Deserialize)]
pub struct CreateSyncJobV2Request {
    pub tenant_id: Option<String>,
    pub entity_type: String,
    pub entity_id: String,
    pub operation: String,
    pub source_system: String,
    pub target_systems: Vec<String>,
    pub priority: Option<SyncJobPriority>,
    pub tags: Option<Vec<String>>,
    pub scheduled_at: Option<String>,
    pub max_retries: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct ListSyncJobsV2Params {
    pub tenant_id: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub entity_type: Option<String>,
    pub tag: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct BatchRetryDeadLettersRequest {
    pub ids: Vec<String>,
    pub category: Option<String>,
}

lazy_static::lazy_static! {
    static ref SYNC_ENGINE_V2_STORE: tokio::sync::Mutex<SyncEngineV2Store> =
        tokio::sync::Mutex::new(SyncEngineV2Store::new());
}

pub struct SyncEngineV2Store {
    pub jobs: HashMap<String, SyncJobV2>,
    pub priority_queue: PriorityQueue,
    pub dead_letters: HashMap<String, DeadLetterV2>,
    pub tenant_stats: HashMap<String, TenantSyncStats>,
}

impl SyncEngineV2Store {
    fn new() -> Self {
        let mut jobs = HashMap::new();
        let mut priority_queue = PriorityQueue {
            high: vec![],
            normal: vec![],
            low: vec![],
        };
        let mut tenant_stats = HashMap::new();
        let tenants = ["tenant-a", "tenant-b", "tenant-c"];

        for (ti, tenant) in tenants.iter().enumerate() {
            for i in 1..=3 {
                let job_id = uuid::Uuid::new_v4().to_string();
                let now = chrono::Utc::now();
                let priority = match i % 3 {
                    0 => SyncJobPriority::High,
                    1 => SyncJobPriority::Normal,
                    _ => SyncJobPriority::Low,
                };
                let status = match i % 4 {
                    0 => "completed",
                    1 => "running",
                    2 => "pending",
                    _ => "failed",
                };

                let job = SyncJobV2 {
                    id: job_id.clone(),
                    tenant_id: tenant.to_string(),
                    entity_type: "customer".to_string(),
                    entity_id: format!("entity-{}-{}", ti, i),
                    operation: "sync".to_string(),
                    status: status.to_string(),
                    source_system: "erp".to_string(),
                    target_systems: vec!["crm".to_string(), "finance".to_string()],
                    priority: priority.clone(),
                    tags: vec![format!("tag-{}", i)],
                    scheduled_at: None,
                    retries_exhausted: status == "failed" && i == 3,
                    dead_letter_reason: if status == "failed" && i == 3 {
                        Some("max retries exceeded".to_string())
                    } else {
                        None
                    },
                    current_step: 0,
                    retry_count: if status == "failed" { i } else { 0 },
                    max_retries: 3,
                    created_at: now.to_rfc3339(),
                    updated_at: now.to_rfc3339(),
                    completed_at: if status == "completed" {
                        Some(now.to_rfc3339())
                    } else {
                        None
                    },
                    error_message: if status == "failed" {
                        Some(format!("同步失败: 网络超时 #{}", i))
                    } else {
                        None
                    },
                };

                if status == "pending" {
                    match priority {
                        SyncJobPriority::High => priority_queue.high.push(job.clone()),
                        SyncJobPriority::Normal => priority_queue.normal.push(job.clone()),
                        SyncJobPriority::Low => priority_queue.low.push(job.clone()),
                    }
                }

                jobs.insert(job_id, job);
            }

            tenant_stats.insert(
                tenant.to_string(),
                TenantSyncStats {
                    total_jobs: 3,
                    successful: 1,
                    failed: 1,
                    in_progress: 1,
                    pending: 0,
                    dead_letter_count: 0,
                },
            );
        }

        Self {
            jobs,
            priority_queue,
            dead_letters: HashMap::new(),
            tenant_stats,
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:master-data:write"])),
    path = "/erp/master-data/sync/v2/jobs",
    tag = "Master Data",
    responses((status = 200, description = "创建 V2 同步任务成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn create_sync_job_v2(
    State(state): State<ApiState>,
    Json(req): Json<CreateSyncJobV2Request>,
) -> Json<ApiResponse<SyncJobV2>> {
    let _ = &state;
    let mut store = SYNC_ENGINE_V2_STORE.lock().await;

    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now();
    let priority = req.priority.unwrap_or_default();
    let tenant_id = req.tenant_id.unwrap_or_else(|| "default".to_string());

    let job = SyncJobV2 {
        id: id.clone(),
        tenant_id: tenant_id.clone(),
        entity_type: req.entity_type,
        entity_id: req.entity_id,
        operation: req.operation,
        status: "pending".to_string(),
        source_system: req.source_system,
        target_systems: req.target_systems,
        priority: priority.clone(),
        tags: req.tags.unwrap_or_default(),
        scheduled_at: req.scheduled_at,
        retries_exhausted: false,
        dead_letter_reason: None,
        current_step: 0,
        retry_count: 0,
        max_retries: req.max_retries.unwrap_or(3),
        created_at: now.to_rfc3339(),
        updated_at: now.to_rfc3339(),
        completed_at: None,
        error_message: None,
    };

    let queue_job = job.clone();
    match priority {
        SyncJobPriority::High => store.priority_queue.high.push(queue_job),
        SyncJobPriority::Normal => store.priority_queue.normal.push(queue_job),
        SyncJobPriority::Low => store.priority_queue.low.push(queue_job),
    }

    store.jobs.insert(id.clone(), job.clone());

    let stats = store
        .tenant_stats
        .entry(tenant_id)
        .or_insert(TenantSyncStats {
            total_jobs: 0,
            successful: 0,
            failed: 0,
            in_progress: 0,
            pending: 0,
            dead_letter_count: 0,
        });
    stats.total_jobs += 1;
    stats.pending += 1;

    Json(ApiResponse::success(job, "同步任务创建成功（V2）"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/master-data/sync/v2/jobs",
    tag = "Master Data",
    responses((status = 200, description = "获取 V2 同步任务列表成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn list_sync_jobs_v2(
    State(state): State<ApiState>,
    Query(params): Query<ListSyncJobsV2Params>,
) -> Json<ApiResponse<PaginatedResponse<SyncJobV2>>> {
    let _ = &state;
    let store = SYNC_ENGINE_V2_STORE.lock().await;

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);

    let mut filtered: Vec<SyncJobV2> = store
        .jobs
        .values()
        .filter(|j| {
            if let Some(ref t) = params.tenant_id {
                if &j.tenant_id != t {
                    return false;
                }
            }
            if let Some(ref s) = params.status {
                if &j.status != s {
                    return false;
                }
            }
            if let Some(ref p) = params.priority {
                let jp = match j.priority {
                    SyncJobPriority::High => "high",
                    SyncJobPriority::Normal => "normal",
                    SyncJobPriority::Low => "low",
                };
                if jp != p {
                    return false;
                }
            }
            if let Some(ref et) = params.entity_type {
                if &j.entity_type != et {
                    return false;
                }
            }
            if let Some(ref tag) = params.tag {
                if !j.tags.contains(tag) {
                    return false;
                }
            }
            true
        })
        .cloned()
        .collect();

    filtered.sort_by(|a, b| b.created_at.cmp(&a.created_at));

    let total = filtered.len() as i64;
    let offset = ((page - 1) * page_size) as usize;
    let items: Vec<SyncJobV2> = filtered
        .into_iter()
        .skip(offset)
        .take(page_size as usize)
        .collect();

    Json(ApiResponse::success(
        PaginatedResponse::new(items, total, page, page_size),
        "同步任务列表（V2）",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/master-data/sync/v2/jobs/{id}",
    tag = "Master Data",
    params(("id" = String, Path, description = "同步任务ID")),
    responses((status = 200, description = "获取 V2 同步任务详情成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn get_sync_job_v2(
    State(state): State<ApiState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<SyncJobV2>> {
    let _ = &state;
    let store = SYNC_ENGINE_V2_STORE.lock().await;

    match store.jobs.get(&id) {
        Some(job) => Json(ApiResponse::success(job.clone(), "同步任务详情（V2）")),
        None => Json(ApiResponse::error(404, "未找到同步任务")),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/erp/master-data/sync/v2/dead-letters/{id}/retry",
    tag = "Master Data",
    params(("id" = String, Path, description = "死信ID")),
    responses((status = 200, description = "重试 V2 死信成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn retry_dead_letter_v2(
    State(state): State<ApiState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<SyncJobV2>> {
    let _ = &state;
    let mut store = SYNC_ENGINE_V2_STORE.lock().await;

    let dead_letter = match store.dead_letters.remove(&id) {
        Some(dl) => dl,
        None => return Json(ApiResponse::error(404, "未找到死信记录")),
    };

    let now = chrono::Utc::now();
    let job_id = dead_letter.job_id.clone();

    let (requeued, updated_job) = match store.jobs.get_mut(&job_id) {
        Some(job) => {
            job.status = "pending".to_string();
            job.retry_count += 1;
            job.updated_at = now.to_rfc3339();
            job.retries_exhausted = false;
            job.dead_letter_reason = None;
            job.error_message = None;

            (job.clone(), job.clone())
        }
        None => {
            return Json(ApiResponse::error(404, "关联的同步任务不存在"));
        }
    };

    match requeued.priority {
        SyncJobPriority::High => store.priority_queue.high.push(requeued),
        SyncJobPriority::Normal => store.priority_queue.normal.push(requeued),
        SyncJobPriority::Low => store.priority_queue.low.push(requeued),
    }

    Json(ApiResponse::success(updated_job, "死信已重试（V2）"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/erp/master-data/sync/v2/dead-letters/batch-retry",
    tag = "Master Data",
    responses((status = 200, description = "批量重试 V2 死信成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn batch_retry_dead_letters(
    State(state): State<ApiState>,
    Json(req): Json<BatchRetryDeadLettersRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let _ = &state;
    let mut store = SYNC_ENGINE_V2_STORE.lock().await;

    let mut retried = 0;
    let now = chrono::Utc::now();
    let mut requeue_jobs: Vec<SyncJobV2> = Vec::new();

    for id in &req.ids {
        if let Some(dead_letter) = store.dead_letters.remove(id) {
            let job_id = dead_letter.job_id.clone();
            if let Some(job) = store.jobs.get_mut(&job_id) {
                job.status = "pending".to_string();
                job.retry_count += 1;
                job.updated_at = now.to_rfc3339();
                job.retries_exhausted = false;
                job.dead_letter_reason = None;
                job.error_message = None;

                requeue_jobs.push(job.clone());
                retried += 1;
            }
        }
    }

    for job in requeue_jobs {
        match job.priority {
            SyncJobPriority::High => store.priority_queue.high.push(job),
            SyncJobPriority::Normal => store.priority_queue.normal.push(job),
            SyncJobPriority::Low => store.priority_queue.low.push(job),
        }
    }

    Json(ApiResponse::success(
        serde_json::json!({
            "retried_count": retried,
            "requested_count": req.ids.len(),
            "category": req.category,
        }),
        "批量重试完成",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/master-data/sync/v2/stats",
    tag = "Master Data",
    responses((status = 200, description = "获取 V2 同步引擎统计成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn sync_engine_stats_v2(
    State(state): State<ApiState>,
) -> Json<ApiResponse<SyncEngineStatsV2>> {
    let _ = &state;
    let store = SYNC_ENGINE_V2_STORE.lock().await;

    let total = store.jobs.len() as i64;
    let mut by_priority = HashMap::new();
    let mut by_status = HashMap::new();

    for job in store.jobs.values() {
        let p = match job.priority {
            SyncJobPriority::High => "high",
            SyncJobPriority::Normal => "normal",
            SyncJobPriority::Low => "low",
        };
        *by_priority.entry(p.to_string()).or_insert(0i64) += 1;
        *by_status.entry(job.status.clone()).or_insert(0i64) += 1;
    }

    let queue_size = (store.priority_queue.high.len()
        + store.priority_queue.normal.len()
        + store.priority_queue.low.len()) as i64;

    let stats = SyncEngineStatsV2 {
        total_jobs: total,
        by_priority,
        by_status,
        by_tenant: store.tenant_stats.clone(),
        dead_letter_count: store.dead_letters.len() as i64,
        avg_processing_time_ms: 1250.5,
        queue_size,
    };

    Json(ApiResponse::success(stats, "同步引擎统计（V2）"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sync_job_priority_serialization() {
        let priority = SyncJobPriority::High;
        let json = serde_json::to_value(&priority).unwrap();
        assert_eq!(json, "high");
    }

    #[test]
    fn test_sync_job_priority_normal() {
        let priority = SyncJobPriority::Normal;
        let json = serde_json::to_value(&priority).unwrap();
        assert_eq!(json, "normal");
    }

    #[test]
    fn test_sync_job_priority_low() {
        let priority = SyncJobPriority::Low;
        let json = serde_json::to_value(&priority).unwrap();
        assert_eq!(json, "low");
    }

    #[test]
    fn test_sync_job_priority_default() {
        let priority = SyncJobPriority::default();
        assert!(matches!(priority, SyncJobPriority::Normal));
    }

    #[test]
    fn test_sync_job_v2_serialization() {
        let job = SyncJobV2 {
            id: "job1".to_string(),
            tenant_id: "tenant1".to_string(),
            entity_type: "customer".to_string(),
            entity_id: "cust001".to_string(),
            operation: "create".to_string(),
            status: "pending".to_string(),
            source_system: "erp".to_string(),
            target_systems: vec!["crm".to_string()],
            priority: SyncJobPriority::Normal,
            tags: vec!["sync".to_string()],
            scheduled_at: None,
            retries_exhausted: false,
            dead_letter_reason: None,
            current_step: 0,
            retry_count: 0,
            max_retries: 3,
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
            completed_at: None,
            error_message: None,
        };
        let json = serde_json::to_value(&job).unwrap();
        assert_eq!(json["id"], "job1");
        assert_eq!(json["tenant_id"], "tenant1");
        assert_eq!(json["entity_type"], "customer");
        assert_eq!(json["status"], "pending");
        assert_eq!(json["priority"], "normal");
        assert_eq!(json["retries_exhausted"], false);
    }

    #[test]
    fn test_dead_letter_v2_serialization() {
        let dl = DeadLetterV2 {
            id: "dl1".to_string(),
            job_id: "job1".to_string(),
            tenant_id: "tenant1".to_string(),
            entity_type: "customer".to_string(),
            operation: "update".to_string(),
            error_message: "连接超时".to_string(),
            retry_count: 3,
            last_retry_at: None,
            retryable: true,
            category: "network".to_string(),
            created_at: "2024-01-01T00:00:00Z".to_string(),
            payload: None,
        };
        let json = serde_json::to_value(&dl).unwrap();
        assert_eq!(json["id"], "dl1");
        assert_eq!(json["job_id"], "job1");
        assert_eq!(json["error_message"], "连接超时");
        assert_eq!(json["retry_count"], 3);
        assert_eq!(json["retryable"], true);
        assert_eq!(json["category"], "network");
    }

    #[test]
    fn test_tenant_sync_stats_serialization() {
        let stats = TenantSyncStats {
            total_jobs: 100,
            successful: 90,
            failed: 5,
            in_progress: 3,
            pending: 2,
            dead_letter_count: 5,
        };
        let json = serde_json::to_value(&stats).unwrap();
        assert_eq!(json["total_jobs"], 100);
        assert_eq!(json["successful"], 90);
        assert_eq!(json["failed"], 5);
        assert_eq!(json["in_progress"], 3);
        assert_eq!(json["pending"], 2);
        assert_eq!(json["dead_letter_count"], 5);
    }

    #[test]
    fn test_create_sync_job_v2_request_deserialize() {
        let json = r#"{
            "tenant_id": "tenant1",
            "entity_type": "customer",
            "entity_id": "cust001",
            "operation": "create",
            "source_system": "erp",
            "target_systems": ["crm", "wms"],
            "priority": "high",
            "tags": ["sync", "urgent"],
            "max_retries": 5
        }"#;
        let request: CreateSyncJobV2Request = serde_json::from_str(json).unwrap();
        assert_eq!(request.tenant_id.as_deref(), Some("tenant1"));
        assert_eq!(request.entity_type, "customer");
        assert_eq!(request.operation, "create");
        assert_eq!(request.target_systems.len(), 2);
        assert!(matches!(request.priority, Some(SyncJobPriority::High)));
        assert_eq!(request.max_retries, Some(5));
    }

    #[test]
    fn test_batch_retry_dead_letters_request_deserialize() {
        let json = r#"{"ids": ["dl1", "dl2"], "category": "network"}"#;
        let request: BatchRetryDeadLettersRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.ids.len(), 2);
        assert_eq!(request.category.as_deref(), Some("network"));
    }

    #[test]
    fn test_batch_retry_dead_letters_request_minimal() {
        let json = r#"{"ids": ["dl1"]}"#;
        let request: BatchRetryDeadLettersRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.ids.len(), 1);
        assert!(request.category.is_none());
    }
}

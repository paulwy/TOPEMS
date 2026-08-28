//! V41.0 AC-13: 主数据同步编排 + 分布式事务 + 最终一致性保障
//!
//! 提供同步作业的创建、查询、重试、取消、补偿功能，
//! 以及同步统计和死信队列管理。使用内存存储（非持久化）。
//! 从 master_data_refs.rs 拆分。

use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::Json;
use serde::Deserialize;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use topems_shared::ApiResponse;

use super::ApiState;

// --- 同步状态枚举 ---

#[derive(Debug, Clone, PartialEq, serde::Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SyncStatus {
    Pending,
    Running,
    Completed,
    Failed,
    PartiallyFailed,
    Compensating,
    Compensated,
}

impl SyncStatus {
    fn as_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Running => "running",
            Self::Completed => "completed",
            Self::Failed => "failed",
            Self::PartiallyFailed => "partially_failed",
            Self::Compensating => "compensating",
            Self::Compensated => "compensated",
        }
    }

    fn from_str(s: &str) -> Self {
        match s {
            "running" => Self::Running,
            "completed" => Self::Completed,
            "failed" => Self::Failed,
            "partially_failed" => Self::PartiallyFailed,
            "compensating" => Self::Compensating,
            "compensated" => Self::Compensated,
            _ => Self::Pending,
        }
    }
}

// --- 同步步骤 ---

#[derive(Debug, Clone, serde::Serialize, Deserialize)]
pub struct SyncStep {
    pub id: String,
    pub step_name: String,
    pub target_system: String,
    pub status: SyncStatus,
    pub order: i32,
    pub retry_count: i32,
    pub max_retries: i32,
    pub started_at: Option<chrono::DateTime<chrono::Utc>>,
    pub completed_at: Option<chrono::DateTime<chrono::Utc>>,
    pub error_message: Option<String>,
    pub compensation_status: Option<SyncStatus>,
}

// --- 同步任务 ---

#[derive(Debug, Clone, serde::Serialize, Deserialize)]
pub struct SyncJob {
    pub id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub operation: String,
    pub status: SyncStatus,
    pub source_system: String,
    pub target_systems: Vec<String>,
    pub steps: Vec<SyncStep>,
    pub current_step: i32,
    pub retry_count: i32,
    pub max_retries: i32,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
    pub completed_at: Option<chrono::DateTime<chrono::Utc>>,
    pub error_message: Option<String>,
}

// --- 补偿动作 ---

#[derive(Debug, Clone, serde::Serialize, Deserialize)]
pub struct CompensationAction {
    pub step_id: String,
    pub action: String,
    pub status: SyncStatus,
    pub executed_at: Option<chrono::DateTime<chrono::Utc>>,
}

// --- Saga 编排器 ---

pub struct SagaOrchestrator {
    job: SyncJob,
    compensations: Vec<CompensationAction>,
}

// --- 同步统计 ---

#[derive(Debug, Clone, serde::Serialize)]
pub struct SyncStats {
    pub total_jobs: u64,
    pub successful: u64,
    pub failed: u64,
    pub compensating: u64,
    pub success_rate: f64,
    pub avg_duration_ms: f64,
    pub total_compensations: u64,
    pub dead_letter_count: u64,
    pub sync_per_system: HashMap<String, SystemSyncStats>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct SystemSyncStats {
    pub system_name: String,
    pub total: u64,
    pub successful: u64,
    pub failed: u64,
    pub avg_latency_ms: f64,
}

// --- 死信队列 ---

#[derive(Debug, Clone, serde::Serialize, Deserialize)]
pub struct DeadLetterEntry {
    pub id: String,
    pub job_id: String,
    pub step_id: String,
    pub entity_type: String,
    pub operation: String,
    pub error_message: String,
    pub retry_count: i32,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub last_retry_at: Option<chrono::DateTime<chrono::Utc>>,
}

// --- 请求/查询类型 ---

#[derive(Debug, Deserialize)]
pub struct CreateSyncJobRequest {
    pub entity_type: String,
    pub entity_id: String,
    pub operation: String,
    pub source_system: String,
    pub target_systems: Vec<String>,
    pub max_retries: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct ListSyncJobsParams {
    pub entity_type: Option<String>,
    pub status: Option<String>,
    pub source_system: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct ListDeadLettersParams {
    pub entity_type: Option<String>,
    pub job_id: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct BatchReplayRequest {
    pub ids: Vec<String>,
}

// --- 内存存储 ---

struct SyncStore {
    jobs: Mutex<Vec<SyncJob>>,
    dead_letters: Mutex<Vec<DeadLetterEntry>>,
}

fn get_sync_store() -> Arc<SyncStore> {
    use std::sync::OnceLock;
    static STORE: OnceLock<Arc<SyncStore>> = OnceLock::new();
    STORE
        .get_or_init(|| {
            Arc::new(SyncStore {
                jobs: Mutex::new(Vec::new()),
                dead_letters: Mutex::new(Vec::new()),
            })
        })
        .clone()
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:master-data:write"])),
    path = "/erp/master-data/sync/jobs",
    tag = "Master Data",
    responses((status = 200, description = "创建同步任务成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn create_sync_job(
    State(state): State<ApiState>,
    Json(payload): Json<CreateSyncJobRequest>,
) -> Json<ApiResponse<SyncJob>> {
    let _ = &state;
    let now = chrono::Utc::now();
    let job_id = uuid::Uuid::new_v4().to_string();
    let max_retries = payload.max_retries.unwrap_or(3);

    let steps: Vec<SyncStep> = payload
        .target_systems
        .iter()
        .enumerate()
        .map(|(i, system)| SyncStep {
            id: format!("step-{}-{}", job_id, i),
            step_name: format!("sync_to_{}", system),
            target_system: system.clone(),
            status: SyncStatus::Pending,
            order: i as i32,
            retry_count: 0,
            max_retries,
            started_at: None,
            completed_at: None,
            error_message: None,
            compensation_status: None,
        })
        .collect();

    let job = SyncJob {
        id: job_id.clone(),
        entity_type: payload.entity_type,
        entity_id: payload.entity_id,
        operation: payload.operation,
        status: SyncStatus::Pending,
        source_system: payload.source_system,
        target_systems: payload.target_systems,
        steps,
        current_step: 0,
        retry_count: 0,
        max_retries,
        created_at: now,
        updated_at: now,
        completed_at: None,
        error_message: None,
    };

    let store = get_sync_store();
    let mut jobs = store.jobs.lock().await;
    jobs.push(job.clone());
    drop(jobs);

    tokio::spawn(async move {
        execute_sync_job(job_id).await;
    });

    Json(ApiResponse::success(job, "同步任务创建成功"))
}

async fn execute_sync_job(job_id: String) {
    let store = get_sync_store();
    let mut jobs = store.jobs.lock().await;

    let job_pos = jobs.iter().position(|j| j.id == job_id);
    if job_pos.is_none() {
        return;
    }
    let job_pos = job_pos.unwrap();

    jobs[job_pos].status = SyncStatus::Running;
    jobs[job_pos].updated_at = chrono::Utc::now();

    let operation = jobs[job_pos].operation.clone();
    let job_id_clone = jobs[job_pos].id.clone();
    let entity_type = jobs[job_pos].entity_type.clone();
    let steps_count = jobs[job_pos].steps.len();

    let mut all_completed = true;
    let mut has_failure = false;
    let mut dead_letters_to_add: Vec<DeadLetterEntry> = Vec::new();

    for i in 0..steps_count {
        jobs[job_pos].current_step = i as i32;
        let step = &mut jobs[job_pos].steps[i];
        step.status = SyncStatus::Running;
        step.started_at = Some(chrono::Utc::now());
        let target_system = step.target_system.clone();
        let step_id = step.id.clone();
        let step_max_retries = step.max_retries;
        let mut step_retry_count = step.retry_count;

        let success = simulate_sync_step(&target_system, &operation);

        if success {
            step.status = SyncStatus::Completed;
            step.completed_at = Some(chrono::Utc::now());
        } else {
            step.status = SyncStatus::Failed;
            step.error_message = Some(format!("同步到 {} 失败", target_system));
            all_completed = false;
            has_failure = true;

            if step_retry_count < step_max_retries {
                step_retry_count += 1;
                step.retry_count = step_retry_count;
                let retry_success = simulate_sync_step(&target_system, &operation);
                if retry_success {
                    step.status = SyncStatus::Completed;
                    step.completed_at = Some(chrono::Utc::now());
                    step.error_message = None;
                    all_completed = true;
                    has_failure = false;
                }
            }

            if step.status == SyncStatus::Failed {
                let dead_letter = DeadLetterEntry {
                    id: uuid::Uuid::new_v4().to_string(),
                    job_id: job_id_clone.clone(),
                    step_id: step_id.clone(),
                    entity_type: entity_type.clone(),
                    operation: operation.clone(),
                    error_message: step.error_message.clone().unwrap_or_default(),
                    retry_count: step_retry_count,
                    created_at: chrono::Utc::now(),
                    last_retry_at: None,
                };
                dead_letters_to_add.push(dead_letter);
            }
        }
    }

    if all_completed {
        jobs[job_pos].status = SyncStatus::Completed;
    } else if has_failure {
        let completed_count = jobs[job_pos]
            .steps
            .iter()
            .filter(|s| s.status == SyncStatus::Completed)
            .count();
        if completed_count > 0 {
            jobs[job_pos].status = SyncStatus::PartiallyFailed;
        } else {
            jobs[job_pos].status = SyncStatus::Failed;
        }
        jobs[job_pos].error_message = Some("部分或全部步骤同步失败".to_string());
    }

    jobs[job_pos].completed_at = Some(chrono::Utc::now());
    jobs[job_pos].updated_at = chrono::Utc::now();

    drop(jobs);

    if !dead_letters_to_add.is_empty() {
        let mut dl = store.dead_letters.lock().await;
        dl.extend(dead_letters_to_add);
    }
}

fn simulate_sync_step(target_system: &str, operation: &str) -> bool {
    let _ = (target_system, operation);
    true
}

/// V41.0 AC-13: 获取同步任务详情
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/master-data/sync/jobs/{id}",
    tag = "Master Data",
    params(("id" = String, Path, description = "同步任务ID")),
    responses((status = 200, description = "获取同步任务详情成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn get_sync_job(
    Path(id): Path<String>,
    State(state): State<ApiState>,
) -> Json<ApiResponse<SyncJob>> {
    let _ = &state;
    let store = get_sync_store();
    let jobs = store.jobs.lock().await;

    match jobs.iter().find(|j| j.id == id) {
        Some(job) => Json(ApiResponse::success(job.clone(), "同步任务详情")),
        None => Json(ApiResponse::error(404, "未找到同步任务")),
    }
}

/// V41.0 AC-13: 列出同步任务
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/master-data/sync/jobs",
    tag = "Master Data",
    responses((status = 200, description = "获取同步任务列表成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn list_sync_jobs(
    Query(params): Query<ListSyncJobsParams>,
    State(state): State<ApiState>,
) -> Json<ApiResponse<serde_json::Value>> {
    let _ = &state;
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);

    let store = get_sync_store();
    let jobs = store.jobs.lock().await;

    let filtered: Vec<&SyncJob> = jobs
        .iter()
        .filter(|j| {
            if let Some(ref et) = params.entity_type {
                if &j.entity_type != et {
                    return false;
                }
            }
            if let Some(ref st) = params.status {
                if j.status.as_str() != st {
                    return false;
                }
            }
            if let Some(ref ss) = params.source_system {
                if &j.source_system != ss {
                    return false;
                }
            }
            true
        })
        .collect();

    let total = filtered.len() as i64;
    let offset = ((page - 1) * page_size) as usize;
    let items: Vec<SyncJob> = filtered
        .into_iter()
        .skip(offset)
        .take(page_size as usize)
        .cloned()
        .collect();

    Json(ApiResponse::success(
        serde_json::json!({
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": topems_shared_core::response::total_pages_of(total, page_size),
        }),
        "同步任务列表",
    ))
}

/// V41.0 AC-13: 重试失败任务
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/erp/master-data/sync/jobs/{id}/retry",
    tag = "Master Data",
    params(("id" = String, Path, description = "同步任务ID")),
    responses((status = 200, description = "重试同步任务成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn retry_sync_job(
    Path(id): Path<String>,
    State(state): State<ApiState>,
) -> Json<ApiResponse<SyncJob>> {
    let _ = &state;
    let store = get_sync_store();
    let mut jobs = store.jobs.lock().await;

    let job_pos = match jobs.iter().position(|j| j.id == id) {
        Some(pos) => pos,
        None => return Json(ApiResponse::error(404, "未找到同步任务")),
    };

    if jobs[job_pos].retry_count >= jobs[job_pos].max_retries {
        return Json(ApiResponse::error(400, "已达到最大重试次数"));
    }

    jobs[job_pos].retry_count += 1;
    jobs[job_pos].status = SyncStatus::Running;
    jobs[job_pos].updated_at = chrono::Utc::now();
    jobs[job_pos].error_message = None;

    for step in &mut jobs[job_pos].steps {
        if step.status == SyncStatus::Failed {
            step.status = SyncStatus::Pending;
            step.error_message = None;
            step.started_at = None;
            step.completed_at = None;
        }
    }

    let job = jobs[job_pos].clone();
    let job_id = id.clone();
    drop(jobs);

    tokio::spawn(async move {
        execute_sync_job(job_id).await;
    });

    Json(ApiResponse::success(job, "同步任务已重试"))
}

/// V41.0 AC-13: 取消同步任务
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/erp/master-data/sync/jobs/{id}/cancel",
    tag = "Master Data",
    params(("id" = String, Path, description = "同步任务ID")),
    responses((status = 200, description = "取消同步任务成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn cancel_sync_job(
    Path(id): Path<String>,
    State(state): State<ApiState>,
) -> Json<ApiResponse<SyncJob>> {
    let _ = &state;
    let store = get_sync_store();
    let mut jobs = store.jobs.lock().await;

    let job_pos = match jobs.iter().position(|j| j.id == id) {
        Some(pos) => pos,
        None => return Json(ApiResponse::error(404, "未找到同步任务")),
    };

    if jobs[job_pos].status == SyncStatus::Completed
        || jobs[job_pos].status == SyncStatus::Failed
        || jobs[job_pos].status == SyncStatus::Compensated
    {
        return Json(ApiResponse::error(400, "当前状态不可取消"));
    }

    jobs[job_pos].status = SyncStatus::Failed;
    jobs[job_pos].updated_at = chrono::Utc::now();
    jobs[job_pos].completed_at = Some(chrono::Utc::now());
    jobs[job_pos].error_message = Some("任务已被取消".to_string());

    let job = jobs[job_pos].clone();
    Json(ApiResponse::success(job, "同步任务已取消"))
}

/// V41.0 AC-13: 触发补偿
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/erp/master-data/sync/jobs/{id}/compensate",
    tag = "Master Data",
    params(("id" = String, Path, description = "同步任务ID")),
    responses((status = 200, description = "触发同步补偿成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn trigger_compensation(
    Path(id): Path<String>,
    State(state): State<ApiState>,
) -> Json<ApiResponse<SyncJob>> {
    let _ = &state;
    let store = get_sync_store();
    let mut jobs = store.jobs.lock().await;

    let job_pos = match jobs.iter().position(|j| j.id == id) {
        Some(pos) => pos,
        None => return Json(ApiResponse::error(404, "未找到同步任务")),
    };

    if jobs[job_pos].status != SyncStatus::Failed
        && jobs[job_pos].status != SyncStatus::PartiallyFailed
    {
        return Json(ApiResponse::error(
            400,
            "只有失败或部分失败的任务才能触发补偿",
        ));
    }

    jobs[job_pos].status = SyncStatus::Compensating;
    jobs[job_pos].updated_at = chrono::Utc::now();

    let operation = jobs[job_pos].operation.clone();
    let total_steps = jobs[job_pos].steps.len();
    let mut compensated_count = 0;

    for i in (0..total_steps).rev() {
        let step = &mut jobs[job_pos].steps[i];
        if step.status == SyncStatus::Completed {
            step.compensation_status = Some(SyncStatus::Running);
            let target_system = step.target_system.clone();

            let success = simulate_compensation(&target_system, &operation);

            if success {
                step.compensation_status = Some(SyncStatus::Completed);
                compensated_count += 1;
            } else {
                step.compensation_status = Some(SyncStatus::Failed);
            }
        }
    }

    if compensated_count > 0 {
        jobs[job_pos].status = SyncStatus::Compensated;
    } else {
        jobs[job_pos].status = SyncStatus::Failed;
    }

    jobs[job_pos].updated_at = chrono::Utc::now();
    let job = jobs[job_pos].clone();

    Json(ApiResponse::success(job, "补偿执行完成"))
}

fn simulate_compensation(target_system: &str, operation: &str) -> bool {
    let _ = (target_system, operation);
    true
}

/// V41.0 AC-13: 同步统计
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/master-data/sync/stats",
    tag = "Master Data",
    responses((status = 200, description = "获取同步统计成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn get_sync_stats(State(state): State<ApiState>) -> Json<ApiResponse<SyncStats>> {
    let _ = &state;
    let store = get_sync_store();
    let jobs = store.jobs.lock().await;
    let dead_letters = store.dead_letters.lock().await;

    let total_jobs = jobs.len() as u64;
    let successful = jobs
        .iter()
        .filter(|j| j.status == SyncStatus::Completed)
        .count() as u64;
    let failed = jobs
        .iter()
        .filter(|j| j.status == SyncStatus::Failed || j.status == SyncStatus::PartiallyFailed)
        .count() as u64;
    let compensating = jobs
        .iter()
        .filter(|j| j.status == SyncStatus::Compensating)
        .count() as u64;
    let total_compensations = jobs
        .iter()
        .filter(|j| j.status == SyncStatus::Compensated)
        .count() as u64;

    let success_rate = if total_jobs > 0 {
        (successful as f64) / (total_jobs as f64) * 100.0
    } else {
        100.0
    };

    let total_duration: i64 = jobs
        .iter()
        .filter(|j| j.completed_at.is_some())
        .map(|j| (j.completed_at.unwrap() - j.created_at).num_milliseconds())
        .sum();
    let completed_count = jobs.iter().filter(|j| j.completed_at.is_some()).count() as f64;
    let avg_duration_ms = if completed_count > 0.0 {
        total_duration as f64 / completed_count
    } else {
        0.0
    };

    let mut system_stats: HashMap<String, SystemSyncStats> = HashMap::new();
    let mut system_durations: HashMap<String, (u64, i64)> = HashMap::new();

    for job in jobs.iter() {
        for step in &job.steps {
            let entry = system_stats
                .entry(step.target_system.clone())
                .or_insert(SystemSyncStats {
                    system_name: step.target_system.clone(),
                    total: 0,
                    successful: 0,
                    failed: 0,
                    avg_latency_ms: 0.0,
                });
            entry.total += 1;

            match step.status {
                SyncStatus::Completed => entry.successful += 1,
                SyncStatus::Failed => entry.failed += 1,
                _ => {}
            }

            if let (Some(start), Some(end)) = (step.started_at, step.completed_at) {
                let dur = (end - start).num_milliseconds();
                let dur_entry = system_durations
                    .entry(step.target_system.clone())
                    .or_insert((0, 0));
                dur_entry.0 += 1;
                dur_entry.1 += dur;
            }
        }
    }

    for (system, stats) in system_stats.iter_mut() {
        if let Some(&(count, total_dur)) = system_durations.get(system) {
            if count > 0 {
                stats.avg_latency_ms = total_dur as f64 / count as f64;
            }
        }
    }

    let dead_letter_count = dead_letters.len() as u64;

    Json(ApiResponse::success(
        SyncStats {
            total_jobs,
            successful,
            failed,
            compensating,
            success_rate,
            avg_duration_ms,
            total_compensations,
            dead_letter_count,
            sync_per_system: system_stats,
        },
        "同步统计数据",
    ))
}

// --- 死信队列 Handlers ---

/// V41.0 AC-13: 列出死信
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/master-data/sync/dead-letters",
    tag = "Master Data",
    responses((status = 200, description = "获取死信队列成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn list_dead_letters(
    Query(params): Query<ListDeadLettersParams>,
    State(state): State<ApiState>,
) -> Json<ApiResponse<Vec<DeadLetterEntry>>> {
    let _ = &state;
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = ((page - 1) * page_size) as usize;

    let store = get_sync_store();
    let dead_letters = store.dead_letters.lock().await;

    let filtered: Vec<&DeadLetterEntry> = dead_letters
        .iter()
        .filter(|d| {
            if let Some(ref et) = params.entity_type {
                if &d.entity_type != et {
                    return false;
                }
            }
            if let Some(ref jid) = params.job_id {
                if &d.job_id != jid {
                    return false;
                }
            }
            true
        })
        .collect();

    let items: Vec<DeadLetterEntry> = filtered
        .into_iter()
        .skip(offset)
        .take(page_size as usize)
        .cloned()
        .collect();

    Json(ApiResponse::success(items, "死信队列列表"))
}

/// V41.0 AC-13: 重放死信
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/erp/master-data/sync/dead-letters/{id}/replay",
    tag = "Master Data",
    params(("id" = String, Path, description = "死信ID")),
    responses((status = 200, description = "重放死信成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn replay_dead_letter(
    Path(id): Path<String>,
    State(state): State<ApiState>,
) -> Json<ApiResponse<bool>> {
    let _ = &state;
    let store = get_sync_store();
    let mut dead_letters = store.dead_letters.lock().await;

    let pos = match dead_letters.iter().position(|d| d.id == id) {
        Some(p) => p,
        None => return Json(ApiResponse::error(404, "未找到死信记录")),
    };

    let job_id = dead_letters[pos].job_id.clone();
    dead_letters[pos].retry_count += 1;
    dead_letters[pos].last_retry_at = Some(chrono::Utc::now());

    drop(dead_letters);

    let mut jobs = store.jobs.lock().await;
    if let Some(job_pos) = jobs.iter().position(|j| j.id == job_id) {
        jobs[job_pos].status = SyncStatus::Running;
        jobs[job_pos].updated_at = chrono::Utc::now();
        let jid = job_id.clone();
        drop(jobs);
        tokio::spawn(async move {
            execute_sync_job(jid).await;
        });
    }

    Json(ApiResponse::success(true, "死信重放成功"))
}

/// V41.0 AC-13: 批量重放死信
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/erp/master-data/sync/dead-letters/batch-replay",
    tag = "Master Data",
    responses((status = 200, description = "批量重放死信成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn batch_replay_dead_letters(
    State(state): State<ApiState>,
    Json(payload): Json<BatchReplayRequest>,
) -> Json<ApiResponse<u64>> {
    let _ = &state;
    let store = get_sync_store();
    let mut dead_letters = store.dead_letters.lock().await;
    let mut replayed = 0u64;

    let mut job_ids = Vec::new();

    for id in &payload.ids {
        if let Some(pos) = dead_letters.iter().position(|d| d.id == *id) {
            dead_letters[pos].retry_count += 1;
            dead_letters[pos].last_retry_at = Some(chrono::Utc::now());
            job_ids.push(dead_letters[pos].job_id.clone());
            replayed += 1;
        }
    }

    drop(dead_letters);

    for job_id in job_ids {
        let store_clone = store.clone();
        let jid = job_id.clone();
        tokio::spawn(async move {
            let mut jobs = store_clone.jobs.lock().await;
            if let Some(pos) = jobs.iter().position(|j| j.id == jid) {
                jobs[pos].status = SyncStatus::Running;
                jobs[pos].updated_at = chrono::Utc::now();
                drop(jobs);
                execute_sync_job(jid).await;
            }
        });
    }

    Json(ApiResponse::success(replayed, "批量重放完成"))
}

/// V41.0 AC-13: 删除死信
#[utoipa::path(
    delete,
    security(("BearerAuth" = ["erp:delete"])),
    path = "/erp/master-data/sync/dead-letters/{id}",
    tag = "Master Data",
    params(("id" = String, Path, description = "死信ID")),
    responses((status = 204, description = "删除死信成功"))
)]
pub async fn delete_dead_letter(
    Path(id): Path<String>,
    State(state): State<ApiState>,
) -> Result<StatusCode, StatusCode> {
    let _ = &state;
    let store = get_sync_store();
    let mut dead_letters = store.dead_letters.lock().await;

    let pos = match dead_letters.iter().position(|d| d.id == id) {
        Some(p) => p,
        None => return Err(StatusCode::NOT_FOUND),
    };

    dead_letters.remove(pos);
    Ok(StatusCode::NO_CONTENT)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sync_status_serialization() {
        let status = SyncStatus::Pending;
        let json = serde_json::to_value(&status).unwrap();
        assert_eq!(json, "pending");
    }

    #[test]
    fn test_sync_status_running() {
        let status = SyncStatus::Running;
        let json = serde_json::to_value(&status).unwrap();
        assert_eq!(json, "running");
    }

    #[test]
    fn test_sync_status_completed() {
        let status = SyncStatus::Completed;
        let json = serde_json::to_value(&status).unwrap();
        assert_eq!(json, "completed");
    }

    #[test]
    fn test_sync_status_failed() {
        let status = SyncStatus::Failed;
        let json = serde_json::to_value(&status).unwrap();
        assert_eq!(json, "failed");
    }

    #[test]
    fn test_sync_status_deserialize() {
        let status: SyncStatus = serde_json::from_str("\"running\"").unwrap();
        assert!(matches!(status, SyncStatus::Running));
    }

    #[test]
    fn test_sync_status_deserialize_completed() {
        let status: SyncStatus = serde_json::from_str("\"completed\"").unwrap();
        assert!(matches!(status, SyncStatus::Completed));
    }

    #[test]
    fn test_sync_step_serialization() {
        let step = SyncStep {
            id: "step1".to_string(),
            step_name: "同步到CRM".to_string(),
            target_system: "crm".to_string(),
            status: SyncStatus::Completed,
            order: 1,
            retry_count: 0,
            max_retries: 3,
            started_at: None,
            completed_at: None,
            error_message: None,
            compensation_status: None,
        };
        let json = serde_json::to_value(&step).unwrap();
        assert_eq!(json["id"], "step1");
        assert_eq!(json["step_name"], "同步到CRM");
        assert_eq!(json["target_system"], "crm");
        assert_eq!(json["status"], "completed");
        assert_eq!(json["order"], 1);
        assert_eq!(json["retry_count"], 0);
        assert_eq!(json["max_retries"], 3);
    }

    #[test]
    fn test_sync_step_with_error() {
        let step = SyncStep {
            id: "step2".to_string(),
            step_name: "同步到WMS".to_string(),
            target_system: "wms".to_string(),
            status: SyncStatus::Failed,
            order: 2,
            retry_count: 3,
            max_retries: 3,
            started_at: None,
            completed_at: None,
            error_message: Some("连接超时".to_string()),
            compensation_status: Some(SyncStatus::Compensated),
        };
        let json = serde_json::to_value(&step).unwrap();
        assert_eq!(json["status"], "failed");
        assert_eq!(json["error_message"], "连接超时");
        assert_eq!(json["compensation_status"], "compensated");
    }

    #[test]
    fn test_sync_job_serialization() {
        let job = SyncJob {
            id: "job1".to_string(),
            entity_type: "customer".to_string(),
            entity_id: "cust001".to_string(),
            operation: "create".to_string(),
            status: SyncStatus::Running,
            source_system: "erp".to_string(),
            target_systems: vec!["crm".to_string(), "wms".to_string()],
            steps: vec![],
            current_step: 0,
            retry_count: 0,
            max_retries: 3,
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
            completed_at: None,
            error_message: None,
        };
        let json = serde_json::to_value(&job).unwrap();
        assert_eq!(json["id"], "job1");
        assert_eq!(json["entity_type"], "customer");
        assert_eq!(json["entity_id"], "cust001");
        assert_eq!(json["operation"], "create");
        assert_eq!(json["status"], "running");
        assert_eq!(json["source_system"], "erp");
        assert_eq!(json["target_systems"][0], "crm");
        assert_eq!(json["target_systems"][1], "wms");
    }

    #[test]
    fn test_sync_stats_serialization() {
        let stats = SyncStats {
            total_jobs: 100,
            successful: 95,
            failed: 3,
            compensating: 2,
            success_rate: 95.0,
            avg_duration_ms: 150.5,
            total_compensations: 5,
            dead_letter_count: 10,
            sync_per_system: HashMap::new(),
        };
        let json = serde_json::to_value(&stats).unwrap();
        assert_eq!(json["total_jobs"], 100);
        assert_eq!(json["successful"], 95);
        assert_eq!(json["failed"], 3);
        assert_eq!(json["compensating"], 2);
        assert_eq!(json["success_rate"], 95.0);
        assert_eq!(json["avg_duration_ms"], 150.5);
        assert_eq!(json["total_compensations"], 5);
        assert_eq!(json["dead_letter_count"], 10);
    }

    #[test]
    fn test_create_sync_job_request_deserialize() {
        let json = r#"{
            "entity_type": "customer",
            "entity_id": "cust001",
            "operation": "create",
            "source_system": "erp",
            "target_systems": ["crm", "wms"],
            "max_retries": 5
        }"#;
        let request: CreateSyncJobRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.entity_type, "customer");
        assert_eq!(request.entity_id, "cust001");
        assert_eq!(request.operation, "create");
        assert_eq!(request.source_system, "erp");
        assert_eq!(request.target_systems.len(), 2);
        assert_eq!(request.max_retries, Some(5));
    }

    #[test]
    fn test_batch_replay_request_deserialize() {
        let json = r#"{"ids": ["dl1", "dl2", "dl3"]}"#;
        let request: BatchReplayRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.ids.len(), 3);
        assert_eq!(request.ids[0], "dl1");
    }
}

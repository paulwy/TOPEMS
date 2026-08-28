//! V42.0 AC-14: 主数据质量闭环管理
//!
//! 提供质量工单、自动修复工作流、数据所有权管理、质量闭环统计功能。
//! 使用内存存储（非持久化）。从 master_data_refs.rs 拆分。

use axum::extract::{Path, Query, State};
use axum::Json;
use serde::Deserialize;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use topems_shared::ApiResponse;

use super::ApiState;

// --- 质量工单状态枚举 ---

/// 质量工单状态
/// - Open: 待处理
/// - Assigned: 已分配
/// - InProgress: 处理中
/// - PendingReview: 待审核
/// - Resolved: 已解决
/// - Verified: 已验证
/// - Closed: 已关闭
/// - Rejected: 已驳回
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum QualityTicketStatus {
    Open,
    Assigned,
    InProgress,
    PendingReview,
    Resolved,
    Verified,
    Closed,
    Rejected,
}

impl QualityTicketStatus {
    fn as_str(&self) -> &'static str {
        match self {
            Self::Open => "open",
            Self::Assigned => "assigned",
            Self::InProgress => "in_progress",
            Self::PendingReview => "pending_review",
            Self::Resolved => "resolved",
            Self::Verified => "verified",
            Self::Closed => "closed",
            Self::Rejected => "rejected",
        }
    }
    fn from_str(s: &str) -> Self {
        match s {
            "assigned" => Self::Assigned,
            "in_progress" => Self::InProgress,
            "pending_review" => Self::PendingReview,
            "resolved" => Self::Resolved,
            "verified" => Self::Verified,
            "closed" => Self::Closed,
            "rejected" => Self::Rejected,
            _ => Self::Open,
        }
    }
}

// --- 工单历史记录 ---

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TicketHistoryEntry {
    pub action: String,
    pub actor: String,
    pub comment: Option<String>,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

// --- 质量工单 ---

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct QualityTicket {
    pub id: String,
    pub issue_id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub rule_id: String,
    pub severity: String,
    pub status: QualityTicketStatus,
    pub assigned_to: Option<String>,
    pub assigned_at: Option<chrono::DateTime<chrono::Utc>>,
    pub resolution: Option<String>,
    pub resolved_at: Option<chrono::DateTime<chrono::Utc>>,
    pub verified_by: Option<String>,
    pub verified_at: Option<chrono::DateTime<chrono::Utc>>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
    pub history: Vec<TicketHistoryEntry>,
}

// --- 质量工单请求/查询类型 ---

#[derive(Debug, Deserialize)]
pub struct CreateQualityTicketRequest {
    pub issue_id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub rule_id: String,
    pub severity: String,
    pub assigned_to: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AssignTicketRequest {
    pub assigned_to: String,
    pub comment: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SubmitTicketRequest {
    pub resolution: String,
    pub actor: String,
    pub comment: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct VerifyTicketRequest {
    pub verified_by: String,
    pub comment: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RejectTicketRequest {
    pub actor: String,
    pub comment: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CloseTicketRequest {
    pub actor: String,
    pub comment: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ListQualityTicketsQuery {
    pub status: Option<String>,
    pub severity: Option<String>,
    pub entity_type: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct EscalateTicketRequest {
    pub actor: String,
    pub comment: Option<String>,
}

// --- 自动修复工作流类型 ---

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RepairStrategy {
    AutoFix,
    ManualFix,
    Escalate,
    Ignore,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RepairStep {
    pub step_id: String,
    pub step_name: String,
    pub action: String,
    pub target_field: String,
    pub new_value: Option<serde_json::Value>,
    pub status: String,
    pub error_message: Option<String>,
    pub executed_at: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RepairResult {
    pub success: bool,
    pub fields_changed: u32,
    pub before_value: serde_json::Value,
    pub after_value: serde_json::Value,
    pub verification_passed: bool,
    pub message: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RepairWorkflow {
    pub id: String,
    pub ticket_id: String,
    pub strategy: RepairStrategy,
    pub status: String,
    pub steps: Vec<RepairStep>,
    pub current_step: i32,
    pub auto_execute: bool,
    pub requires_approval: bool,
    pub approved_by: Option<String>,
    pub approved_at: Option<chrono::DateTime<chrono::Utc>>,
    pub executed_at: Option<chrono::DateTime<chrono::Utc>>,
    pub result: Option<RepairResult>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

// --- 修复工作流请求类型 ---

#[derive(Debug, Deserialize)]
pub struct CreateRepairStepRequest {
    pub step_name: String,
    pub action: String,
    pub target_field: String,
    pub new_value: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct CreateRepairWorkflowRequest {
    pub ticket_id: String,
    pub strategy: RepairStrategy,
    pub steps: Vec<CreateRepairStepRequest>,
    pub auto_execute: Option<bool>,
    pub requires_approval: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct ApproveRepairRequest {
    pub approved_by: String,
    pub comment: Option<String>,
}

// --- 数据所有权管理类型 ---

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DataDomain {
    pub id: String,
    pub name: String,
    pub description: String,
    pub owner: String,
    pub owner_email: Option<String>,
    pub stewards: Vec<String>,
    pub entities: Vec<String>,
    pub sla_hours: u32,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DataOwnershipMatrix {
    pub entity_type: String,
    pub data_domain: String,
    pub data_owner: String,
    pub data_steward: String,
    pub approvers: Vec<String>,
    pub viewers: Vec<String>,
    pub auto_repair_enabled: bool,
    pub escalation_path: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateDataDomainRequest {
    pub name: String,
    pub description: Option<String>,
    pub owner: String,
    pub owner_email: Option<String>,
    pub stewards: Option<Vec<String>>,
    pub entities: Option<Vec<String>>,
    pub sla_hours: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDataDomainRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub owner: Option<String>,
    pub owner_email: Option<String>,
    pub stewards: Option<Vec<String>>,
    pub entities: Option<Vec<String>>,
    pub sla_hours: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct SetOwnershipMatrixRequest {
    pub data_domain: String,
    pub data_owner: String,
    pub data_steward: String,
    pub approvers: Vec<String>,
    pub viewers: Vec<String>,
    pub auto_repair_enabled: Option<bool>,
    pub escalation_path: Vec<String>,
}

// --- 质量闭环统计 ---

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct QualityLoopStats {
    pub total_tickets: u64,
    pub open_tickets: u64,
    pub in_progress: u64,
    pub resolved: u64,
    pub verified: u64,
    pub closed: u64,
    pub rejected: u64,
    pub auto_repair_count: u64,
    pub auto_repair_success_rate: f64,
    pub avg_resolution_time_hours: f64,
    pub sla_compliance_rate: f64,
    pub tickets_by_severity: HashMap<String, u64>,
    pub tickets_by_domain: HashMap<String, u64>,
}

// --- 内存存储 ---

struct QualityLoopStore {
    tickets: Mutex<Vec<QualityTicket>>,
    repair_workflows: Mutex<Vec<RepairWorkflow>>,
    data_domains: Mutex<Vec<DataDomain>>,
    ownership_matrices: Mutex<HashMap<String, DataOwnershipMatrix>>,
}

fn get_quality_loop_store() -> Arc<QualityLoopStore> {
    use std::sync::OnceLock;
    static STORE: OnceLock<Arc<QualityLoopStore>> = OnceLock::new();
    STORE
        .get_or_init(|| {
            Arc::new(QualityLoopStore {
                tickets: Mutex::new(Vec::new()),
                repair_workflows: Mutex::new(Vec::new()),
                data_domains: Mutex::new(Vec::new()),
                ownership_matrices: Mutex::new(HashMap::new()),
            })
        })
        .clone()
}

// ==================== 质量工单 Handlers ====================

/// V42.0 AC-14: 创建质量工单（从质量检测结果创建闭环工单）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:master-data:write"])),
    path = "/erp/master-data/quality/tickets",
    tag = "Master Data",
    responses((status = 200, description = "创建质量工单成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn create_quality_ticket(
    State(state): State<ApiState>,
    Json(req): Json<CreateQualityTicketRequest>,
) -> Json<ApiResponse<QualityTicket>> {
    let _ = &state;
    let now = chrono::Utc::now();
    let ticket_id = uuid::Uuid::new_v4().to_string();

    let history_entry = TicketHistoryEntry {
        action: "created".to_string(),
        actor: "system".to_string(),
        comment: Some(format!("质量工单创建，关联问题: {}", req.issue_id)),
        timestamp: now,
    };

    let mut ticket = QualityTicket {
        id: ticket_id,
        issue_id: req.issue_id,
        entity_type: req.entity_type,
        entity_id: req.entity_id,
        rule_id: req.rule_id,
        severity: req.severity,
        status: QualityTicketStatus::Open,
        assigned_to: None,
        assigned_at: None,
        resolution: None,
        resolved_at: None,
        verified_by: None,
        verified_at: None,
        created_at: now,
        updated_at: now,
        history: vec![history_entry],
    };

    // 如果指定了责任人，直接分配
    if let Some(assignee) = req.assigned_to.as_deref() {
        ticket.assigned_to = Some(assignee.to_string());
        ticket.assigned_at = Some(now);
        ticket.status = QualityTicketStatus::Assigned;
        ticket.history.push(TicketHistoryEntry {
            action: "assigned".to_string(),
            actor: "system".to_string(),
            comment: Some(format!("自动分配给: {}", assignee)),
            timestamp: now,
        });
    }

    let store = get_quality_loop_store();
    let mut tickets = store.tickets.lock().await;
    tickets.push(ticket.clone());

    Json(ApiResponse::success(ticket, "质量工单创建成功"))
}

/// V42.0 AC-14: 列出质量工单（支持状态/严重级别/实体类型筛选）
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/master-data/quality/tickets",
    tag = "Master Data",
    responses((status = 200, description = "获取质量工单列表成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn list_quality_tickets(
    Query(params): Query<ListQualityTicketsQuery>,
    State(state): State<ApiState>,
) -> Json<ApiResponse<serde_json::Value>> {
    let _ = &state;
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);

    let store = get_quality_loop_store();
    let tickets = store.tickets.lock().await;

    let filtered: Vec<&QualityTicket> = tickets
        .iter()
        .filter(|t| {
            if let Some(ref st) = params.status {
                if t.status.as_str() != st {
                    return false;
                }
            }
            if let Some(ref sev) = params.severity {
                if &t.severity != sev {
                    return false;
                }
            }
            if let Some(ref et) = params.entity_type {
                if &t.entity_type != et {
                    return false;
                }
            }
            true
        })
        .collect();

    let total = filtered.len() as i64;
    let offset = ((page - 1) * page_size) as usize;
    let items: Vec<QualityTicket> = filtered
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
        "质量工单列表",
    ))
}

/// V42.0 AC-14: 获取质量工单详情
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/master-data/quality/tickets/{id}",
    tag = "Master Data",
    params(("id" = String, Path, description = "质量工单ID")),
    responses((status = 200, description = "获取质量工单详情成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn get_quality_ticket(
    Path(id): Path<String>,
    State(state): State<ApiState>,
) -> Json<ApiResponse<QualityTicket>> {
    let _ = &state;
    let store = get_quality_loop_store();
    let tickets = store.tickets.lock().await;

    match tickets.iter().find(|t| t.id == id) {
        Some(ticket) => Json(ApiResponse::success(ticket.clone(), "质量工单详情")),
        None => Json(ApiResponse::error(404, "未找到质量工单")),
    }
}

/// V42.0 AC-14: 获取质量工单历史记录
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/master-data/quality/tickets/{id}/history",
    tag = "Master Data",
    params(("id" = String, Path, description = "质量工单ID")),
    responses((status = 200, description = "获取质量工单历史成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn get_quality_ticket_history(
    Path(id): Path<String>,
    State(state): State<ApiState>,
) -> Json<ApiResponse<Vec<TicketHistoryEntry>>> {
    let _ = &state;
    let store = get_quality_loop_store();
    let tickets = store.tickets.lock().await;

    match tickets.iter().find(|t| t.id == id) {
        Some(ticket) => Json(ApiResponse::success(ticket.history.clone(), "工单历史记录")),
        None => Json(ApiResponse::error(404, "未找到质量工单")),
    }
}

/// V42.0 AC-14: 分配质量工单责任人
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/erp/master-data/quality/tickets/{id}/assign",
    tag = "Master Data",
    params(("id" = String, Path, description = "质量工单ID")),
    responses((status = 200, description = "分配质量工单成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn assign_quality_ticket(
    Path(id): Path<String>,
    State(state): State<ApiState>,
    Json(req): Json<AssignTicketRequest>,
) -> Json<ApiResponse<QualityTicket>> {
    let _ = &state;
    let store = get_quality_loop_store();
    let mut tickets = store.tickets.lock().await;

    let pos = match tickets.iter().position(|t| t.id == id) {
        Some(p) => p,
        None => return Json(ApiResponse::error(404, "未找到质量工单")),
    };

    let now = chrono::Utc::now();
    tickets[pos].assigned_to = Some(req.assigned_to.clone());
    tickets[pos].assigned_at = Some(now);
    tickets[pos].status = QualityTicketStatus::Assigned;
    tickets[pos].updated_at = now;
    tickets[pos].history.push(TicketHistoryEntry {
        action: "assigned".to_string(),
        actor: req.assigned_to,
        comment: req.comment,
        timestamp: now,
    });

    Json(ApiResponse::success(tickets[pos].clone(), "工单已分配"))
}

/// V42.0 AC-14: 开始处理质量工单
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/erp/master-data/quality/tickets/{id}/start",
    tag = "Master Data",
    params(("id" = String, Path, description = "质量工单ID")),
    responses((status = 200, description = "启动质量工单成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn start_quality_ticket(
    Path(id): Path<String>,
    State(state): State<ApiState>,
    Json(req): Json<AssignTicketRequest>,
) -> Json<ApiResponse<QualityTicket>> {
    let _ = &state;
    let store = get_quality_loop_store();
    let mut tickets = store.tickets.lock().await;

    let pos = match tickets.iter().position(|t| t.id == id) {
        Some(p) => p,
        None => return Json(ApiResponse::error(404, "未找到质量工单")),
    };

    if tickets[pos].status != QualityTicketStatus::Open
        && tickets[pos].status != QualityTicketStatus::Assigned
    {
        return Json(ApiResponse::error(400, "当前状态不可开始处理"));
    }

    let now = chrono::Utc::now();
    if tickets[pos].assigned_to.is_none() {
        tickets[pos].assigned_to = Some(req.assigned_to.clone());
        tickets[pos].assigned_at = Some(now);
    }
    tickets[pos].status = QualityTicketStatus::InProgress;
    tickets[pos].updated_at = now;
    tickets[pos].history.push(TicketHistoryEntry {
        action: "started".to_string(),
        actor: req.assigned_to,
        comment: req.comment,
        timestamp: now,
    });

    Json(ApiResponse::success(tickets[pos].clone(), "工单处理已开始"))
}

/// V42.0 AC-14: 提交修复方案
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/erp/master-data/quality/tickets/{id}/submit",
    tag = "Master Data",
    params(("id" = String, Path, description = "质量工单ID")),
    responses((status = 200, description = "提交质量工单成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn submit_quality_ticket(
    Path(id): Path<String>,
    State(state): State<ApiState>,
    Json(req): Json<SubmitTicketRequest>,
) -> Json<ApiResponse<QualityTicket>> {
    let _ = &state;
    let store = get_quality_loop_store();
    let mut tickets = store.tickets.lock().await;

    let pos = match tickets.iter().position(|t| t.id == id) {
        Some(p) => p,
        None => return Json(ApiResponse::error(404, "未找到质量工单")),
    };

    if tickets[pos].status != QualityTicketStatus::InProgress {
        return Json(ApiResponse::error(400, "只有处理中的工单才能提交修复"));
    }

    let now = chrono::Utc::now();
    tickets[pos].resolution = Some(req.resolution.clone());
    tickets[pos].resolved_at = Some(now);
    tickets[pos].status = QualityTicketStatus::PendingReview;
    tickets[pos].updated_at = now;
    tickets[pos].history.push(TicketHistoryEntry {
        action: "submitted".to_string(),
        actor: req.actor,
        comment: Some(format!("修复方案: {}", req.resolution)),
        timestamp: now,
    });

    Json(ApiResponse::success(
        tickets[pos].clone(),
        "修复方案已提交，等待审核",
    ))
}

/// V42.0 AC-14: 验证修复结果
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/erp/master-data/quality/tickets/{id}/verify",
    tag = "Master Data",
    params(("id" = String, Path, description = "质量工单ID")),
    responses((status = 200, description = "验证质量工单成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn verify_quality_ticket(
    Path(id): Path<String>,
    State(state): State<ApiState>,
    Json(req): Json<VerifyTicketRequest>,
) -> Json<ApiResponse<QualityTicket>> {
    let _ = &state;
    let store = get_quality_loop_store();
    let mut tickets = store.tickets.lock().await;

    let pos = match tickets.iter().position(|t| t.id == id) {
        Some(p) => p,
        None => return Json(ApiResponse::error(404, "未找到质量工单")),
    };

    if tickets[pos].status != QualityTicketStatus::PendingReview
        && tickets[pos].status != QualityTicketStatus::Resolved
    {
        return Json(ApiResponse::error(400, "只有待审核或已解决的工单才能验证"));
    }

    let now = chrono::Utc::now();
    tickets[pos].verified_by = Some(req.verified_by.clone());
    tickets[pos].verified_at = Some(now);
    tickets[pos].status = QualityTicketStatus::Verified;
    tickets[pos].updated_at = now;
    tickets[pos].history.push(TicketHistoryEntry {
        action: "verified".to_string(),
        actor: req.verified_by,
        comment: req.comment,
        timestamp: now,
    });

    Json(ApiResponse::success(
        tickets[pos].clone(),
        "修复结果已验证通过",
    ))
}

/// V42.0 AC-14: 关闭质量工单
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/erp/master-data/quality/tickets/{id}/close",
    tag = "Master Data",
    params(("id" = String, Path, description = "质量工单ID")),
    responses((status = 200, description = "关闭质量工单成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn close_quality_ticket(
    Path(id): Path<String>,
    State(state): State<ApiState>,
    Json(req): Json<CloseTicketRequest>,
) -> Json<ApiResponse<QualityTicket>> {
    let _ = &state;
    let store = get_quality_loop_store();
    let mut tickets = store.tickets.lock().await;

    let pos = match tickets.iter().position(|t| t.id == id) {
        Some(p) => p,
        None => return Json(ApiResponse::error(404, "未找到质量工单")),
    };

    if tickets[pos].status != QualityTicketStatus::Verified
        && tickets[pos].status != QualityTicketStatus::Resolved
    {
        return Json(ApiResponse::error(400, "只有已验证或已解决的工单才能关闭"));
    }

    let now = chrono::Utc::now();
    tickets[pos].status = QualityTicketStatus::Closed;
    tickets[pos].updated_at = now;
    tickets[pos].history.push(TicketHistoryEntry {
        action: "closed".to_string(),
        actor: req.actor,
        comment: req.comment,
        timestamp: now,
    });

    Json(ApiResponse::success(tickets[pos].clone(), "工单已关闭"))
}

/// V42.0 AC-14: 驳回质量工单
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/erp/master-data/quality/tickets/{id}/reject",
    tag = "Master Data",
    params(("id" = String, Path, description = "质量工单ID")),
    responses((status = 200, description = "驳回质量工单成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn reject_quality_ticket(
    Path(id): Path<String>,
    State(state): State<ApiState>,
    Json(req): Json<RejectTicketRequest>,
) -> Json<ApiResponse<QualityTicket>> {
    let _ = &state;
    let store = get_quality_loop_store();
    let mut tickets = store.tickets.lock().await;

    let pos = match tickets.iter().position(|t| t.id == id) {
        Some(p) => p,
        None => return Json(ApiResponse::error(404, "未找到质量工单")),
    };

    if tickets[pos].status != QualityTicketStatus::PendingReview {
        return Json(ApiResponse::error(400, "只有待审核的工单才能驳回"));
    }

    let now = chrono::Utc::now();
    tickets[pos].status = QualityTicketStatus::Rejected;
    tickets[pos].updated_at = now;
    tickets[pos].history.push(TicketHistoryEntry {
        action: "rejected".to_string(),
        actor: req.actor,
        comment: req.comment,
        timestamp: now,
    });

    Json(ApiResponse::success(tickets[pos].clone(), "工单已驳回"))
}

/// V42.0 AC-14: 升级质量工单（按升级路径逐级升级）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/erp/master-data/quality/tickets/{id}/escalate",
    tag = "Master Data",
    params(("id" = String, Path, description = "质量工单ID")),
    responses((status = 200, description = "升级质量工单成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn escalate_ticket(
    Path(id): Path<String>,
    State(state): State<ApiState>,
    Json(req): Json<EscalateTicketRequest>,
) -> Json<ApiResponse<QualityTicket>> {
    let _ = &state;
    let store = get_quality_loop_store();

    // Step 1: 获取工单信息和当前分配人
    let (entity_type, current_assignee) = {
        let tickets = store.tickets.lock().await;
        let ticket = match tickets.iter().find(|t| t.id == id) {
            Some(t) => t,
            None => return Json(ApiResponse::error(404, "未找到质量工单")),
        };
        (
            ticket.entity_type.clone(),
            ticket.assigned_to.clone().unwrap_or_default(),
        )
    };

    // Step 2: 查找升级路径
    let escalation_path = {
        let matrices = store.ownership_matrices.lock().await;
        match matrices.get(&entity_type) {
            Some(matrix) => matrix.escalation_path.clone(),
            None => vec![
                "data_steward".to_string(),
                "data_owner".to_string(),
                "cto".to_string(),
            ],
        }
    };

    if escalation_path.is_empty() {
        return Json(ApiResponse::error(400, "未配置升级路径，无法升级"));
    }

    // Step 3: 确定当前在升级路径中的位置，升级到下一级
    let current_idx = escalation_path
        .iter()
        .position(|p| *p == current_assignee)
        .unwrap_or(0);

    if current_idx + 1 >= escalation_path.len() {
        return Json(ApiResponse::error(400, "已达到最高升级级别，无法继续升级"));
    }

    let next_assignee = escalation_path[current_idx + 1].clone();

    // Step 4: 更新工单
    let mut tickets = store.tickets.lock().await;
    let pos = match tickets.iter().position(|t| t.id == id) {
        Some(p) => p,
        None => return Json(ApiResponse::error(404, "未找到质量工单")),
    };

    let now = chrono::Utc::now();
    let prev_assignee = if current_assignee.is_empty() {
        "未分配".to_string()
    } else {
        current_assignee
    };

    tickets[pos].assigned_to = Some(next_assignee.clone());
    tickets[pos].assigned_at = Some(now);
    tickets[pos].status = QualityTicketStatus::Assigned;
    tickets[pos].updated_at = now;
    tickets[pos].history.push(TicketHistoryEntry {
        action: "escalated".to_string(),
        actor: req.actor,
        comment: req
            .comment
            .or_else(|| Some(format!("工单升级: {} → {}", prev_assignee, next_assignee))),
        timestamp: now,
    });

    Json(ApiResponse::success(tickets[pos].clone(), "工单已升级"))
}

// ==================== 自动修复工作流 Handlers ====================

/// V42.0 AC-14: 创建修复工作流
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:master-data:write"])),
    path = "/erp/master-data/quality/repair-workflows",
    tag = "Master Data",
    responses((status = 200, description = "创建修复工作流成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn create_repair_workflow(
    State(state): State<ApiState>,
    Json(req): Json<CreateRepairWorkflowRequest>,
) -> Json<ApiResponse<RepairWorkflow>> {
    let _ = &state;

    // 检查关联工单是否存在
    {
        let store = get_quality_loop_store();
        let tickets = store.tickets.lock().await;
        if !tickets.iter().any(|t| t.id == req.ticket_id) {
            return Json(ApiResponse::error(404, "关联的质量工单不存在"));
        }
    }

    let now = chrono::Utc::now();
    let workflow_id = uuid::Uuid::new_v4().to_string();

    let steps: Vec<RepairStep> = req
        .steps
        .iter()
        .enumerate()
        .map(|(i, s)| RepairStep {
            step_id: format!("step-{}-{}", workflow_id, i),
            step_name: s.step_name.clone(),
            action: s.action.clone(),
            target_field: s.target_field.clone(),
            new_value: s.new_value.clone(),
            status: "pending".to_string(),
            error_message: None,
            executed_at: None,
        })
        .collect();

    let requires_approval = req.requires_approval.unwrap_or(false);
    let auto_execute = req.auto_execute.unwrap_or(false);

    let workflow = RepairWorkflow {
        id: workflow_id,
        ticket_id: req.ticket_id,
        strategy: req.strategy,
        status: "pending".to_string(),
        steps,
        current_step: 0,
        auto_execute,
        requires_approval,
        approved_by: None,
        approved_at: None,
        executed_at: None,
        result: None,
        created_at: now,
    };

    let store = get_quality_loop_store();
    {
        let mut workflows = store.repair_workflows.lock().await;
        workflows.push(workflow.clone());
    }

    // 如果自动执行且不需要审批，立即执行
    if auto_execute && !requires_approval {
        execute_repair_workflow_internal(workflow.id.clone()).await;
        let workflows = store.repair_workflows.lock().await;
        if let Some(wf) = workflows.iter().find(|w| w.id == workflow.id) {
            return Json(ApiResponse::success(
                wf.clone(),
                "修复工作流创建并自动执行完成",
            ));
        }
    }

    Json(ApiResponse::success(workflow, "修复工作流创建成功"))
}

/// V42.0 AC-14: 执行修复工作流
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/erp/master-data/quality/repair-workflows/{id}/execute",
    tag = "Master Data",
    params(("id" = String, Path, description = "修复工作流ID")),
    responses((status = 200, description = "执行修复工作流成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn execute_repair_workflow(
    Path(id): Path<String>,
    State(state): State<ApiState>,
) -> Json<ApiResponse<RepairWorkflow>> {
    let _ = &state;

    // 前置检查
    {
        let store = get_quality_loop_store();
        let workflows = store.repair_workflows.lock().await;
        let wf = match workflows.iter().find(|w| w.id == id) {
            Some(w) => w,
            None => return Json(ApiResponse::error(404, "未找到修复工作流")),
        };

        if wf.requires_approval && wf.approved_by.is_none() {
            return Json(ApiResponse::error(400, "该工作流需要审批后才能执行"));
        }

        if wf.status == "completed" || wf.status == "executing" {
            return Json(ApiResponse::error(400, "工作流已执行或正在执行中"));
        }
    }

    execute_repair_workflow_internal(id.clone()).await;

    let store = get_quality_loop_store();
    let workflows = store.repair_workflows.lock().await;
    match workflows.iter().find(|w| w.id == id) {
        Some(wf) => Json(ApiResponse::success(wf.clone(), "修复工作流执行完成")),
        None => Json(ApiResponse::error(404, "未找到修复工作流")),
    }
}

/// 内部：执行修复工作流（模拟 SQL UPDATE 占位实现）
async fn execute_repair_workflow_internal(workflow_id: String) {
    let store = get_quality_loop_store();
    let mut workflows = store.repair_workflows.lock().await;

    let pos = match workflows.iter().position(|w| w.id == workflow_id) {
        Some(p) => p,
        None => return,
    };

    workflows[pos].status = "executing".to_string();

    let steps_count = workflows[pos].steps.len();
    let mut fields_changed: u32 = 0;
    let mut all_success = true;

    for i in 0..steps_count {
        workflows[pos].current_step = i as i32;
        let step = &mut workflows[pos].steps[i];
        step.status = "executing".to_string();
        step.executed_at = Some(chrono::Utc::now());

        // 模拟修复步骤执行（占位实现：SQL UPDATE）
        let success = simulate_repair_step(&step.action, &step.target_field);

        if success {
            step.status = "completed".to_string();
            fields_changed += 1;
        } else {
            step.status = "failed".to_string();
            step.error_message = Some(format!("修复步骤失败: {}", step.step_name));
            all_success = false;
            break;
        }
    }

    let now = chrono::Utc::now();
    workflows[pos].executed_at = Some(now);
    workflows[pos].current_step = steps_count as i32;
    workflows[pos].status = if all_success { "completed" } else { "failed" }.to_string();
    workflows[pos].result = Some(RepairResult {
        success: all_success,
        fields_changed,
        before_value: serde_json::json!({}),
        after_value: serde_json::json!({}),
        verification_passed: all_success,
        message: if all_success {
            format!("修复完成，共修改 {} 个字段", fields_changed)
        } else {
            "修复过程中部分步骤失败".to_string()
        },
    });

    // 如果修复成功，更新关联工单状态为待审核
    if all_success {
        let ticket_id = workflows[pos].ticket_id.clone();
        drop(workflows);

        let mut tickets = store.tickets.lock().await;
        if let Some(tpos) = tickets.iter().position(|t| t.id == ticket_id) {
            tickets[tpos].status = QualityTicketStatus::PendingReview;
            tickets[tpos].resolved_at = Some(now);
            tickets[tpos].updated_at = now;
            tickets[tpos].history.push(TicketHistoryEntry {
                action: "auto_repaired".to_string(),
                actor: "repair_engine".to_string(),
                comment: Some("自动修复工作流执行完成".to_string()),
                timestamp: now,
            });
        }
    }
}

/// 模拟修复步骤执行（占位实现）
fn simulate_repair_step(action: &str, target_field: &str) -> bool {
    let _ = (action, target_field);
    true
}

/// V42.0 AC-14: 执行单个修复步骤
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/erp/master-data/quality/repair-workflows/{workflowId}/steps/{stepIndex}/execute",
    tag = "Master Data",
    params(
        ("workflowId" = String, Path, description = "修复工作流ID"),
        ("stepIndex" = usize, Path, description = "步骤序号")
    ),
    responses((status = 200, description = "执行修复步骤成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn execute_repair_step(
    Path((workflow_id, step_index)): Path<(String, usize)>,
    State(state): State<ApiState>,
) -> Json<ApiResponse<RepairStep>> {
    let _ = &state;
    let store = get_quality_loop_store();
    let mut workflows = store.repair_workflows.lock().await;

    let pos = match workflows.iter().position(|w| w.id == workflow_id) {
        Some(p) => p,
        None => return Json(ApiResponse::error(404, "未找到修复工作流")),
    };

    if step_index >= workflows[pos].steps.len() {
        return Json(ApiResponse::error(400, "步骤索引超出范围"));
    }

    let step = &mut workflows[pos].steps[step_index];
    step.status = "executing".to_string();
    step.executed_at = Some(chrono::Utc::now());

    let action = step.action.clone();
    let target_field = step.target_field.clone();
    let success = simulate_repair_step(&action, &target_field);

    if success {
        step.status = "completed".to_string();
    } else {
        step.status = "failed".to_string();
        step.error_message = Some("步骤执行失败".to_string());
    }

    Json(ApiResponse::success(step.clone(), "修复步骤执行完成"))
}

/// V42.0 AC-14: 审批修复工作流
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/erp/master-data/quality/repair-workflows/{id}/approve",
    tag = "Master Data",
    params(("id" = String, Path, description = "修复工作流ID")),
    responses((status = 200, description = "审批修复工作流成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn approve_repair_workflow(
    Path(id): Path<String>,
    State(state): State<ApiState>,
    Json(req): Json<ApproveRepairRequest>,
) -> Json<ApiResponse<RepairWorkflow>> {
    let _ = &state;
    let store = get_quality_loop_store();
    let mut workflows = store.repair_workflows.lock().await;

    let pos = match workflows.iter().position(|w| w.id == id) {
        Some(p) => p,
        None => return Json(ApiResponse::error(404, "未找到修复工作流")),
    };

    if workflows[pos].approved_by.is_some() {
        return Json(ApiResponse::error(400, "该工作流已被审批"));
    }

    let now = chrono::Utc::now();
    workflows[pos].approved_by = Some(req.approved_by);
    workflows[pos].approved_at = Some(now);

    Json(ApiResponse::success(
        workflows[pos].clone(),
        "修复工作流已审批通过",
    ))
}

/// V42.0 AC-14: 获取修复工作流详情
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/master-data/quality/repair-workflows/{id}",
    tag = "Master Data",
    params(("id" = String, Path, description = "修复工作流ID")),
    responses((status = 200, description = "获取修复工作流详情成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn get_repair_workflow(
    Path(id): Path<String>,
    State(state): State<ApiState>,
) -> Json<ApiResponse<RepairWorkflow>> {
    let _ = &state;
    let store = get_quality_loop_store();
    let workflows = store.repair_workflows.lock().await;

    match workflows.iter().find(|w| w.id == id) {
        Some(wf) => Json(ApiResponse::success(wf.clone(), "修复工作流详情")),
        None => Json(ApiResponse::error(404, "未找到修复工作流")),
    }
}

/// V42.0 AC-14: 列出修复工作流
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/master-data/quality/repair-workflows",
    tag = "Master Data",
    responses((status = 200, description = "获取修复工作流列表成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn list_repair_workflows(
    Query(params): Query<ListQualityTicketsQuery>,
    State(state): State<ApiState>,
) -> Json<ApiResponse<serde_json::Value>> {
    let _ = &state;
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);

    let store = get_quality_loop_store();
    let workflows = store.repair_workflows.lock().await;

    let filtered: Vec<&RepairWorkflow> = workflows
        .iter()
        .filter(|w| {
            if let Some(ref st) = params.status {
                if &w.status != st {
                    return false;
                }
            }
            true
        })
        .collect();

    let total = filtered.len() as i64;
    let offset = ((page - 1) * page_size) as usize;
    let items: Vec<RepairWorkflow> = filtered
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
        "修复工作流列表",
    ))
}

/// V42.0 AC-14: 验证修复结果（重新运行质量规则）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/erp/master-data/quality/repair-workflows/{id}/verify",
    tag = "Master Data",
    params(("id" = String, Path, description = "修复工作流ID")),
    responses((status = 200, description = "验证修复工作流成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn verify_repair(
    Path(id): Path<String>,
    State(state): State<ApiState>,
) -> Json<ApiResponse<RepairWorkflow>> {
    let _ = &state;
    let store = get_quality_loop_store();
    let mut workflows = store.repair_workflows.lock().await;

    let pos = match workflows.iter().position(|w| w.id == id) {
        Some(p) => p,
        None => return Json(ApiResponse::error(404, "未找到修复工作流")),
    };

    if workflows[pos].status != "completed" {
        return Json(ApiResponse::error(400, "只有已完成的工作流才能验证"));
    }

    // 模拟重新运行质量规则验证（占位实现）
    let verification_passed = workflows[pos]
        .result
        .as_ref()
        .map(|r| r.success)
        .unwrap_or(false);

    if let Some(result) = &mut workflows[pos].result {
        result.verification_passed = verification_passed;
        result.message = if verification_passed {
            "修复验证通过，质量问题已解决".to_string()
        } else {
            "修复验证未通过，质量问题仍存在".to_string()
        };
    }

    Json(ApiResponse::success(workflows[pos].clone(), "修复验证完成"))
}

// ==================== 数据所有权管理 Handlers ====================

/// V42.0 AC-14: 创建数据域
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:master-data:write"])),
    path = "/erp/master-data/domains",
    tag = "Master Data",
    responses((status = 200, description = "创建数据域成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn create_data_domain(
    State(state): State<ApiState>,
    Json(req): Json<CreateDataDomainRequest>,
) -> Json<ApiResponse<DataDomain>> {
    let _ = &state;
    let now = chrono::Utc::now();
    let domain_id = uuid::Uuid::new_v4().to_string();

    let domain = DataDomain {
        id: domain_id,
        name: req.name,
        description: req.description.unwrap_or_default(),
        owner: req.owner,
        owner_email: req.owner_email,
        stewards: req.stewards.unwrap_or_default(),
        entities: req.entities.unwrap_or_default(),
        sla_hours: req.sla_hours.unwrap_or(48),
        created_at: now,
    };

    let store = get_quality_loop_store();
    let mut domains = store.data_domains.lock().await;
    domains.push(domain.clone());

    Json(ApiResponse::success(domain, "数据域创建成功"))
}

/// V42.0 AC-14: 列出数据域
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/master-data/domains",
    tag = "Master Data",
    responses((status = 200, description = "获取数据域列表成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn list_data_domains(
    State(state): State<ApiState>,
) -> Json<ApiResponse<Vec<DataDomain>>> {
    let _ = &state;
    let store = get_quality_loop_store();
    let domains = store.data_domains.lock().await;
    Json(ApiResponse::success(domains.clone(), "数据域列表"))
}

/// V42.0 AC-14: 获取数据域详情
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/master-data/domains/{id}",
    tag = "Master Data",
    params(("id" = String, Path, description = "数据域ID")),
    responses((status = 200, description = "获取数据域详情成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn get_data_domain(
    Path(id): Path<String>,
    State(state): State<ApiState>,
) -> Json<ApiResponse<DataDomain>> {
    let _ = &state;
    let store = get_quality_loop_store();
    let domains = store.data_domains.lock().await;

    match domains.iter().find(|d| d.id == id) {
        Some(domain) => Json(ApiResponse::success(domain.clone(), "数据域详情")),
        None => Json(ApiResponse::error(404, "未找到数据域")),
    }
}

/// V42.0 AC-14: 更新数据域
#[utoipa::path(
    put,
    security(("BearerAuth" = ["erp:update"])),
    path = "/erp/master-data/domains/{id}",
    tag = "Master Data",
    params(("id" = String, Path, description = "数据域ID")),
    responses((status = 200, description = "更新数据域成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn update_data_domain(
    Path(id): Path<String>,
    State(state): State<ApiState>,
    Json(req): Json<UpdateDataDomainRequest>,
) -> Json<ApiResponse<DataDomain>> {
    let _ = &state;
    let store = get_quality_loop_store();
    let mut domains = store.data_domains.lock().await;

    let pos = match domains.iter().position(|d| d.id == id) {
        Some(p) => p,
        None => return Json(ApiResponse::error(404, "未找到数据域")),
    };

    if let Some(name) = req.name {
        domains[pos].name = name;
    }
    if let Some(description) = req.description {
        domains[pos].description = description;
    }
    if let Some(owner) = req.owner {
        domains[pos].owner = owner;
    }
    if let Some(owner_email) = req.owner_email {
        domains[pos].owner_email = Some(owner_email);
    }
    if let Some(stewards) = req.stewards {
        domains[pos].stewards = stewards;
    }
    if let Some(entities) = req.entities {
        domains[pos].entities = entities;
    }
    if let Some(sla_hours) = req.sla_hours {
        domains[pos].sla_hours = sla_hours;
    }

    Json(ApiResponse::success(domains[pos].clone(), "数据域更新成功"))
}

/// V42.0 AC-14: 获取责任矩阵（RACI）
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/master-data/ownership-matrix/{entityType}",
    tag = "Master Data",
    params(("entityType" = String, Path, description = "实体类型")),
    responses((status = 200, description = "获取责任矩阵成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn get_ownership_matrix(
    Path(entity_type): Path<String>,
    State(state): State<ApiState>,
) -> Json<ApiResponse<DataOwnershipMatrix>> {
    let _ = &state;
    let store = get_quality_loop_store();
    let matrices = store.ownership_matrices.lock().await;

    match matrices.get(&entity_type) {
        Some(matrix) => Json(ApiResponse::success(matrix.clone(), "责任矩阵")),
        None => Json(ApiResponse::error(404, "未找到该实体的责任矩阵")),
    }
}

/// V42.0 AC-14: 设置责任矩阵
#[utoipa::path(
    put,
    security(("BearerAuth" = ["erp:update"])),
    path = "/erp/master-data/ownership-matrix/{entityType}",
    tag = "Master Data",
    params(("entityType" = String, Path, description = "实体类型")),
    responses((status = 200, description = "设置责任矩阵成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn set_ownership_matrix(
    Path(entity_type): Path<String>,
    State(state): State<ApiState>,
    Json(req): Json<SetOwnershipMatrixRequest>,
) -> Json<ApiResponse<DataOwnershipMatrix>> {
    let _ = &state;
    let store = get_quality_loop_store();
    let mut matrices = store.ownership_matrices.lock().await;

    let matrix = DataOwnershipMatrix {
        entity_type: entity_type.clone(),
        data_domain: req.data_domain,
        data_owner: req.data_owner,
        data_steward: req.data_steward,
        approvers: req.approvers,
        viewers: req.viewers,
        auto_repair_enabled: req.auto_repair_enabled.unwrap_or(false),
        escalation_path: req.escalation_path,
    };

    matrices.insert(entity_type, matrix.clone());

    Json(ApiResponse::success(matrix, "责任矩阵设置成功"))
}

/// V42.0 AC-14: 获取实体所有者信息
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/master-data/entities/{entityType}/owner",
    tag = "Master Data",
    params(("entityType" = String, Path, description = "实体类型")),
    responses((status = 200, description = "获取实体负责人成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn get_entity_owner(
    Path(entity_type): Path<String>,
    State(state): State<ApiState>,
) -> Json<ApiResponse<serde_json::Value>> {
    let _ = &state;
    let store = get_quality_loop_store();

    let matrix = {
        let matrices = store.ownership_matrices.lock().await;
        matrices.get(&entity_type).cloned()
    };

    match matrix {
        Some(matrix) => {
            let domain_info = {
                let domains = store.data_domains.lock().await;
                domains
                    .iter()
                    .find(|d| d.name == matrix.data_domain)
                    .cloned()
            };

            Json(ApiResponse::success(
                serde_json::json!({
                    "entity_type": matrix.entity_type,
                    "data_owner": matrix.data_owner,
                    "data_steward": matrix.data_steward,
                    "data_domain": matrix.data_domain,
                    "domain_info": domain_info,
                    "auto_repair_enabled": matrix.auto_repair_enabled,
                    "escalation_path": matrix.escalation_path,
                }),
                "实体所有者信息",
            ))
        }
        None => Json(ApiResponse::error(404, "未找到该实体的所有权配置")),
    }
}

// ==================== 质量闭环统计 ====================

/// V42.0 AC-14: 质量闭环统计
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/master-data/quality/loop-stats",
    tag = "Master Data",
    responses((status = 200, description = "获取质量闭环统计成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn get_quality_loop_stats(
    State(state): State<ApiState>,
) -> Json<ApiResponse<QualityLoopStats>> {
    let _ = &state;
    let store = get_quality_loop_store();

    // 克隆数据以避免长时间持锁
    let tickets: Vec<QualityTicket> = store.tickets.lock().await.clone();
    let workflows: Vec<RepairWorkflow> = store.repair_workflows.lock().await.clone();
    let domains: Vec<DataDomain> = store.data_domains.lock().await.clone();
    let matrices: HashMap<String, DataOwnershipMatrix> =
        store.ownership_matrices.lock().await.clone();

    let total_tickets = tickets.len() as u64;
    let open_tickets = tickets
        .iter()
        .filter(|t| {
            t.status == QualityTicketStatus::Open || t.status == QualityTicketStatus::Assigned
        })
        .count() as u64;
    let in_progress = tickets
        .iter()
        .filter(|t| {
            t.status == QualityTicketStatus::InProgress
                || t.status == QualityTicketStatus::PendingReview
        })
        .count() as u64;
    let resolved = tickets
        .iter()
        .filter(|t| t.status == QualityTicketStatus::Resolved)
        .count() as u64;
    let verified = tickets
        .iter()
        .filter(|t| t.status == QualityTicketStatus::Verified)
        .count() as u64;
    let closed = tickets
        .iter()
        .filter(|t| t.status == QualityTicketStatus::Closed)
        .count() as u64;
    let rejected = tickets
        .iter()
        .filter(|t| t.status == QualityTicketStatus::Rejected)
        .count() as u64;

    // 自动修复统计
    let auto_repair_count = workflows.len() as u64;
    let auto_repair_success = workflows.iter().filter(|w| w.status == "completed").count() as u64;
    let auto_repair_success_rate = if auto_repair_count > 0 {
        (auto_repair_success as f64) / (auto_repair_count as f64) * 100.0
    } else {
        0.0
    };

    // 平均解决时间（小时）— 基于 created_at 到 resolved_at
    let resolution_times: Vec<f64> = tickets
        .iter()
        .filter_map(|t| {
            t.resolved_at.map(|resolved| {
                let duration = resolved - t.created_at;
                duration.num_hours() as f64
            })
        })
        .collect();
    let avg_resolution_time_hours = if !resolution_times.is_empty() {
        resolution_times.iter().sum::<f64>() / resolution_times.len() as f64
    } else {
        0.0
    };

    // SLA 合规率 — 基于 created_at 到 resolved_at 的时间差与 SLA 配置比较
    let mut sla_compliant: u64 = 0;
    let mut sla_total: u64 = 0;
    for t in tickets.iter() {
        if let Some(resolved) = t.resolved_at {
            sla_total += 1;
            // 查找实体对应的 SLA 小时数
            let sla_hours = matrices
                .get(&t.entity_type)
                .and_then(|m| domains.iter().find(|d| d.name == m.data_domain))
                .map(|d| d.sla_hours)
                .unwrap_or(48) as i64;
            let duration = resolved - t.created_at;
            if duration.num_hours() <= sla_hours {
                sla_compliant += 1;
            }
        }
    }
    let sla_compliance_rate = if sla_total > 0 {
        (sla_compliant as f64) / (sla_total as f64) * 100.0
    } else {
        100.0
    };

    // 按严重级别统计
    let mut tickets_by_severity: HashMap<String, u64> = HashMap::new();
    for t in tickets.iter() {
        *tickets_by_severity.entry(t.severity.clone()).or_insert(0) += 1;
    }

    // 按数据域（实体类型）统计
    let mut tickets_by_domain: HashMap<String, u64> = HashMap::new();
    for t in tickets.iter() {
        *tickets_by_domain.entry(t.entity_type.clone()).or_insert(0) += 1;
    }

    Json(ApiResponse::success(
        QualityLoopStats {
            total_tickets,
            open_tickets,
            in_progress,
            resolved,
            verified,
            closed,
            rejected,
            auto_repair_count,
            auto_repair_success_rate,
            avg_resolution_time_hours,
            sla_compliance_rate,
            tickets_by_severity,
            tickets_by_domain,
        },
        "质量闭环统计数据",
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_quality_ticket_status_serialization() {
        let status = QualityTicketStatus::Open;
        let json = serde_json::to_value(&status).unwrap();
        assert_eq!(json, "open");
    }

    #[test]
    fn test_quality_ticket_status_in_progress() {
        let status = QualityTicketStatus::InProgress;
        let json = serde_json::to_value(&status).unwrap();
        assert_eq!(json, "in_progress");
    }

    #[test]
    fn test_quality_ticket_status_closed() {
        let status = QualityTicketStatus::Closed;
        let json = serde_json::to_value(&status).unwrap();
        assert_eq!(json, "closed");
    }

    #[test]
    fn test_quality_ticket_status_deserialize() {
        let status: QualityTicketStatus = serde_json::from_str("\"assigned\"").unwrap();
        assert!(matches!(status, QualityTicketStatus::Assigned));
    }

    #[test]
    fn test_quality_ticket_status_deserialize_resolved() {
        let status: QualityTicketStatus = serde_json::from_str("\"resolved\"").unwrap();
        assert!(matches!(status, QualityTicketStatus::Resolved));
    }

    #[test]
    fn test_quality_ticket_serialization() {
        let ticket = QualityTicket {
            id: "ticket1".to_string(),
            issue_id: "issue1".to_string(),
            entity_type: "customer".to_string(),
            entity_id: "cust001".to_string(),
            rule_id: "rule1".to_string(),
            severity: "high".to_string(),
            status: QualityTicketStatus::Open,
            assigned_to: None,
            assigned_at: None,
            resolution: None,
            resolved_at: None,
            verified_by: None,
            verified_at: None,
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
            history: vec![],
        };
        let json = serde_json::to_value(&ticket).unwrap();
        assert_eq!(json["id"], "ticket1");
        assert_eq!(json["issue_id"], "issue1");
        assert_eq!(json["entity_type"], "customer");
        assert_eq!(json["entity_id"], "cust001");
        assert_eq!(json["severity"], "high");
        assert_eq!(json["status"], "open");
    }

    #[test]
    fn test_create_quality_ticket_request_deserialize() {
        let json = r#"{
            "issue_id": "issue1",
            "entity_type": "customer",
            "entity_id": "cust001",
            "rule_id": "rule1",
            "severity": "high",
            "assigned_to": "admin"
        }"#;
        let request: CreateQualityTicketRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.issue_id, "issue1");
        assert_eq!(request.entity_type, "customer");
        assert_eq!(request.entity_id, "cust001");
        assert_eq!(request.rule_id, "rule1");
        assert_eq!(request.severity, "high");
        assert_eq!(request.assigned_to.as_deref(), Some("admin"));
    }

    #[test]
    fn test_assign_ticket_request_deserialize() {
        let json = r#"{"assigned_to": "admin", "comment": "分配给管理员"}"#;
        let request: AssignTicketRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.assigned_to, "admin");
        assert_eq!(request.comment.as_deref(), Some("分配给管理员"));
    }

    #[test]
    fn test_repair_strategy_serialization() {
        let strategy = RepairStrategy::AutoFix;
        let json = serde_json::to_value(&strategy).unwrap();
        assert_eq!(json, "auto_fix");
    }

    #[test]
    fn test_repair_step_serialization() {
        let step = RepairStep {
            step_id: "step1".to_string(),
            step_name: "修复名称".to_string(),
            action: "update".to_string(),
            target_field: "name".to_string(),
            new_value: Some(serde_json::json!("新名称")),
            status: "pending".to_string(),
            error_message: None,
            executed_at: None,
        };
        let json = serde_json::to_value(&step).unwrap();
        assert_eq!(json["step_id"], "step1");
        assert_eq!(json["step_name"], "修复名称");
        assert_eq!(json["action"], "update");
        assert_eq!(json["target_field"], "name");
        assert_eq!(json["status"], "pending");
    }

    #[test]
    fn test_data_domain_serialization() {
        let domain = DataDomain {
            id: "domain1".to_string(),
            name: "客户域".to_string(),
            description: "客户数据域".to_string(),
            owner: "admin".to_string(),
            owner_email: Some("admin@example.com".to_string()),
            stewards: vec!["steward1".to_string()],
            entities: vec!["customer".to_string()],
            sla_hours: 24,
            created_at: chrono::Utc::now(),
        };
        let json = serde_json::to_value(&domain).unwrap();
        assert_eq!(json["id"], "domain1");
        assert_eq!(json["name"], "客户域");
        assert_eq!(json["description"], "客户数据域");
        assert_eq!(json["owner"], "admin");
        assert_eq!(json["sla_hours"], 24);
    }

    #[test]
    fn test_quality_loop_stats_serialization() {
        let stats = QualityLoopStats {
            total_tickets: 100,
            open_tickets: 10,
            in_progress: 20,
            resolved: 40,
            verified: 10,
            closed: 15,
            rejected: 5,
            auto_repair_count: 30,
            auto_repair_success_rate: 85.0,
            avg_resolution_time_hours: 24.5,
            sla_compliance_rate: 92.0,
            tickets_by_severity: HashMap::new(),
            tickets_by_domain: HashMap::new(),
        };
        let json = serde_json::to_value(&stats).unwrap();
        assert_eq!(json["total_tickets"], 100);
        assert_eq!(json["open_tickets"], 10);
        assert_eq!(json["in_progress"], 20);
        assert_eq!(json["resolved"], 40);
        assert_eq!(json["verified"], 10);
        assert_eq!(json["closed"], 15);
        assert_eq!(json["rejected"], 5);
        assert_eq!(json["auto_repair_count"], 30);
        assert_eq!(json["auto_repair_success_rate"], 85.0);
        assert_eq!(json["avg_resolution_time_hours"], 24.5);
        assert_eq!(json["sla_compliance_rate"], 92.0);
    }
}

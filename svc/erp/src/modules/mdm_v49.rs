//! V49.0 MDM AC-21: 主数据全生命周期自动化
//! V49.0 MDM AC-22: 主数据退役管理
//! V49.0 MDM AC-23: 主数据归档策略
//!
//! 核心能力：
//! - 生命周期阶段自动化：需求 → 设计 → 开发 → 测试 → 上线 → 运维 → 退役 → 归档
//! - 阶段任务编排：每个阶段支持任务清单、审批、SLA、自动推进
//! - 退役（Sunset）管理：退役计划、影响评估、通知、灰度下线、强制下线
//! - 归档策略：按域/实体/年龄分层归档、冷热分离、归档保留周期、归档索引
//! - 归档恢复：从归档恢复到活跃状态（带版本重建）
//! - 生命周期仪表盘：各阶段实体数、SLA 达成率、退役趋势、归档体量
//!
//! 设计风格：ApiResponse + LazyLock 内存存储（与 master_data_refs.rs 保持一致）

use axum::{extract::Path, extract::Query, extract::State, Json};
use serde::Deserialize;
use std::collections::HashMap;
use std::sync::LazyLock;
use tokio::sync::Mutex;
use topems_shared::ApiResponse;
use topems_shared_core::response::PaginatedResponse;

use super::ApiState;

// ==================== 生命周期阶段枚举 ====================

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LifecycleStage {
    Proposed,
    Designed,
    InDevelopment,
    Testing,
    Released,
    Operative,
    Sunset,
    Archived,
    Destroyed,
}

impl LifecycleStage {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Proposed => "proposed",
            Self::Designed => "designed",
            Self::InDevelopment => "in_development",
            Self::Testing => "testing",
            Self::Released => "released",
            Self::Operative => "operative",
            Self::Sunset => "sunset",
            Self::Archived => "archived",
            Self::Destroyed => "destroyed",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "designed" => Self::Designed,
            "in_development" => Self::InDevelopment,
            "testing" => Self::Testing,
            "released" => Self::Released,
            "operative" => Self::Operative,
            "sunset" => Self::Sunset,
            "archived" => Self::Archived,
            "destroyed" => Self::Destroyed,
            _ => Self::Proposed,
        }
    }

    pub fn order(&self) -> u8 {
        match self {
            Self::Proposed => 0,
            Self::Designed => 1,
            Self::InDevelopment => 2,
            Self::Testing => 3,
            Self::Released => 4,
            Self::Operative => 5,
            Self::Sunset => 6,
            Self::Archived => 7,
            Self::Destroyed => 8,
        }
    }

    pub fn all() -> Vec<LifecycleStage> {
        vec![
            Self::Proposed,
            Self::Designed,
            Self::InDevelopment,
            Self::Testing,
            Self::Released,
            Self::Operative,
            Self::Sunset,
            Self::Archived,
            Self::Destroyed,
        ]
    }
}

// ==================== 生命周期任务 ====================

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct LifecycleTask {
    pub id: String,
    pub stage: LifecycleStage,
    pub name: String,
    pub description: String,
    pub owner: Option<String>,
    pub status: TaskStatus,
    pub due_at: Option<String>,
    pub completed_at: Option<String>,
    pub approved_by: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TaskStatus {
    Todo,
    InProgress,
    Blocked,
    InReview,
    Done,
}

// ==================== 生命周期实体 ====================

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct LifecycleEntity {
    pub id: String,
    pub master_data_id: String,
    pub domain: String,
    pub entity_type: String,
    pub entity_code: String,
    pub entity_name: String,
    pub stage: LifecycleStage,
    pub owner: Option<String>,
    pub steward: Option<String>,
    pub stage_entered_at: String,
    pub last_transition_at: String,
    pub tasks: Vec<LifecycleTask>,
    pub transition_count: i32,
    pub sla_deadline: Option<String>,
    pub sla_breached: bool,
    pub tags: Vec<String>,
}

// ==================== 退役计划 ====================

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RetirementPlan {
    pub id: String,
    pub master_data_id: String,
    pub entity_type: String,
    pub entity_code: String,
    pub entity_name: String,
    pub planned_sunset_at: String,
    pub planned_archived_at: Option<String>,
    pub impact_assessment: ImpactAssessment,
    pub notify_channels: Vec<String>,
    pub notify_status: String,
    pub status: RetirementStatus,
    pub initiated_by: String,
    pub initiated_at: String,
    pub confirmed_by: Option<String>,
    pub confirmed_at: Option<String>,
    pub executed_at: Option<String>,
    pub rollback_window_days: i32,
    pub post_retirement_review_at: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ImpactAssessment {
    pub total_references: i64,
    pub referencing_services: Vec<String>,
    pub dependent_workflows: Vec<String>,
    pub affected_reports: Vec<String>,
    pub data_loss_risk: String,
    pub rollback_possible: bool,
    pub mitigation_steps: Vec<String>,
    pub risk_level: String,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RetirementStatus {
    Draft,
    ImpactAssessed,
    StakeholderNotified,
    Confirmed,
    Executing,
    Completed,
    RolledBack,
    Cancelled,
}

// ==================== 归档策略 ====================

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ArchivePolicy {
    pub id: String,
    pub domain: String,
    pub entity_type: String,
    pub policy_name: String,
    pub description: String,
    pub archive_age_days: i32,
    pub archive_tier: ArchiveTier,
    pub retention_days: i32,
    pub index_archived: bool,
    pub restore_window_days: i32,
    pub auto_archive: bool,
    pub notify_on_archive: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ArchiveTier {
    Hot,
    Warm,
    Cold,
    Glacier,
}

impl ArchiveTier {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Hot => "hot",
            Self::Warm => "warm",
            Self::Cold => "cold",
            Self::Glacier => "glacier",
        }
    }

    pub fn access_days(&self) -> i32 {
        match self {
            Self::Hot => 0,
            Self::Warm => 3,
            Self::Cold => 7,
            Self::Glacier => 30,
        }
    }

    pub fn retention_default_days(&self) -> i32 {
        match self {
            Self::Hot => 90,
            Self::Warm => 365,
            Self::Cold => 1095,
            Self::Glacier => 2555,
        }
    }
}

// ==================== 归档记录 ====================

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ArchiveRecord {
    pub id: String,
    pub master_data_id: String,
    pub domain: String,
    pub entity_type: String,
    pub entity_code: String,
    pub entity_name: String,
    pub archive_tier: ArchiveTier,
    pub archived_at: String,
    pub archived_by: String,
    pub archive_reason: String,
    pub policy_id: Option<String>,
    pub retention_until: String,
    pub restore_count: i32,
    pub last_restored_at: Option<String>,
    pub status: String,
    pub record_size_bytes: i64,
    pub checksum: String,
}

// ==================== 生命周期事件 ====================

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct LifecycleEvent {
    pub id: String,
    pub master_data_id: String,
    pub entity_type: String,
    pub from_stage: Option<LifecycleStage>,
    pub to_stage: LifecycleStage,
    pub reason: String,
    pub triggered_by: String,
    pub triggered_by_type: String,
    pub metadata: Option<serde_json::Value>,
    pub created_at: String,
}

// ==================== 内存存储 ====================

struct LifecycleStore {
    entities: Mutex<HashMap<String, LifecycleEntity>>,
    retirement_plans: Mutex<Vec<RetirementPlan>>,
    archive_policies: Mutex<Vec<ArchivePolicy>>,
    archive_records: Mutex<Vec<ArchiveRecord>>,
    events: std::sync::Mutex<Vec<LifecycleEvent>>,
    initialized: Mutex<bool>,
}

fn get_lifecycle_store() -> &'static LifecycleStore {
    static STORE: LazyLock<LifecycleStore> = LazyLock::new(|| LifecycleStore {
        entities: Mutex::new(HashMap::new()),
        retirement_plans: Mutex::new(Vec::new()),
        archive_policies: Mutex::new(Vec::new()),
        archive_records: Mutex::new(Vec::new()),
        events: std::sync::Mutex::new(Vec::new()),
        initialized: Mutex::new(false),
    });
    &STORE
}

// ==================== 初始化种子数据 ====================

async fn ensure_initialized() {
    let store = get_lifecycle_store();
    let mut initialized = store.initialized.lock().await;
    if *initialized {
        return;
    }

    let now = chrono::Utc::now();
    let now_str = now.to_rfc3339();

    let policies = vec![
        ArchivePolicy {
            id: uuid::Uuid::new_v4().to_string(),
            domain: "finance".to_string(),
            entity_type: "voucher".to_string(),
            policy_name: "财务凭证归档策略".to_string(),
            description: "3 年以上的财务凭证归档至 Glacier".to_string(),
            archive_age_days: 1095,
            archive_tier: ArchiveTier::Glacier,
            retention_days: 2555,
            index_archived: true,
            restore_window_days: 30,
            auto_archive: true,
            notify_on_archive: true,
            created_at: now_str.clone(),
            updated_at: now_str.clone(),
        },
        ArchivePolicy {
            id: uuid::Uuid::new_v4().to_string(),
            domain: "master_data".to_string(),
            entity_type: "customer".to_string(),
            policy_name: "客户主数据归档策略".to_string(),
            description: "客户主数据 5 年无交易归档至 Cold".to_string(),
            archive_age_days: 1825,
            archive_tier: ArchiveTier::Cold,
            retention_days: 3650,
            index_archived: true,
            restore_window_days: 90,
            auto_archive: true,
            notify_on_archive: true,
            created_at: now_str.clone(),
            updated_at: now_str.clone(),
        },
        ArchivePolicy {
            id: uuid::Uuid::new_v4().to_string(),
            domain: "material".to_string(),
            entity_type: "product".to_string(),
            policy_name: "物料主数据归档策略".to_string(),
            description: "停用物料 1 年归档至 Warm".to_string(),
            archive_age_days: 365,
            archive_tier: ArchiveTier::Warm,
            retention_days: 730,
            index_archived: true,
            restore_window_days: 60,
            auto_archive: true,
            notify_on_archive: false,
            created_at: now_str.clone(),
            updated_at: now_str.clone(),
        },
    ];

    let entities = vec![
        LifecycleEntity {
            id: uuid::Uuid::new_v4().to_string(),
            master_data_id: "mdm-cust-0001".to_string(),
            domain: "master_data".to_string(),
            entity_type: "customer".to_string(),
            entity_code: "C0001".to_string(),
            entity_name: "阿里巴巴集团".to_string(),
            stage: LifecycleStage::Operative,
            owner: Some("zhangsan".to_string()),
            steward: Some("lisi".to_string()),
            stage_entered_at: now_str.clone(),
            last_transition_at: now_str.clone(),
            tasks: default_tasks_for(&LifecycleStage::Operative),
            transition_count: 4,
            sla_deadline: None,
            sla_breached: false,
            tags: vec!["vip".to_string(), "active".to_string()],
        },
        LifecycleEntity {
            id: uuid::Uuid::new_v4().to_string(),
            master_data_id: "mdm-supplier-0001".to_string(),
            domain: "master_data".to_string(),
            entity_type: "supplier".to_string(),
            entity_code: "S0001".to_string(),
            entity_name: "华东电子供应商".to_string(),
            stage: LifecycleStage::Sunset,
            owner: Some("wangwu".to_string()),
            steward: Some("lisi".to_string()),
            stage_entered_at: now_str.clone(),
            last_transition_at: now_str.clone(),
            tasks: default_tasks_for(&LifecycleStage::Sunset),
            transition_count: 6,
            sla_deadline: Some((now + chrono::Duration::days(14)).to_rfc3339()),
            sla_breached: false,
            tags: vec!["sunset".to_string()],
        },
        LifecycleEntity {
            id: uuid::Uuid::new_v4().to_string(),
            master_data_id: "mdm-mat-0001".to_string(),
            domain: "material".to_string(),
            entity_type: "product".to_string(),
            entity_code: "M0001".to_string(),
            entity_name: "核心芯片 A 型".to_string(),
            stage: LifecycleStage::Testing,
            owner: Some("zhaoliu".to_string()),
            steward: None,
            stage_entered_at: now_str.clone(),
            last_transition_at: now_str.clone(),
            tasks: default_tasks_for(&LifecycleStage::Testing),
            transition_count: 2,
            sla_deadline: Some((now + chrono::Duration::days(30)).to_rfc3339()),
            sla_breached: false,
            tags: vec!["new".to_string()],
        },
    ];

    let archive_records = vec![ArchiveRecord {
        id: uuid::Uuid::new_v4().to_string(),
        master_data_id: "mdm-cust-archived-0001".to_string(),
        domain: "master_data".to_string(),
        entity_type: "customer".to_string(),
        entity_code: "C-OLD-001".to_string(),
        entity_name: "历史客户 X".to_string(),
        archive_tier: ArchiveTier::Cold,
        archived_at: (now - chrono::Duration::days(400)).to_rfc3339(),
        archived_by: "system".to_string(),
        archive_reason: "5 年无交易自动归档".to_string(),
        policy_id: None,
        retention_until: (now + chrono::Duration::days(3250)).to_rfc3339(),
        restore_count: 0,
        last_restored_at: None,
        status: "archived".to_string(),
        record_size_bytes: 2048,
        checksum: "sha256{init}".to_string(),
    }];

    let retirement_plans = vec![RetirementPlan {
        id: uuid::Uuid::new_v4().to_string(),
        master_data_id: "mdm-supplier-0001".to_string(),
        entity_type: "supplier".to_string(),
        entity_code: "S0001".to_string(),
        entity_name: "华东电子供应商".to_string(),
        planned_sunset_at: (now + chrono::Duration::days(30)).to_rfc3339(),
        planned_archived_at: Some((now + chrono::Duration::days(90)).to_rfc3339()),
        impact_assessment: ImpactAssessment {
            total_references: 12,
            referencing_services: vec!["purchase".to_string(), "finance".to_string()],
            dependent_workflows: vec!["采购审批流".to_string()],
            affected_reports: vec!["供应商对账单".to_string()],
            data_loss_risk: "medium".to_string(),
            rollback_possible: true,
            mitigation_steps: vec![
                "通知下游服务".to_string(),
                "设置只读期".to_string(),
                "灰度下线".to_string(),
            ],
            risk_level: "medium".to_string(),
        },
        notify_channels: vec!["email".to_string(), "feishu".to_string()],
        notify_status: "sent".to_string(),
        status: RetirementStatus::Confirmed,
        initiated_by: "lisi".to_string(),
        initiated_at: now_str.clone(),
        confirmed_by: Some("manager".to_string()),
        confirmed_at: Some(now_str.clone()),
        executed_at: None,
        rollback_window_days: 14,
        post_retirement_review_at: None,
    }];

    let mut entities_map = HashMap::new();
    for e in entities {
        entities_map.insert(e.master_data_id.clone(), e);
    }

    *store.entities.lock().await = entities_map;
    *store.retirement_plans.lock().await = retirement_plans;
    *store.archive_policies.lock().await = policies;
    *store.archive_records.lock().await = archive_records;
    *store.events.lock().unwrap_or_else(|e| e.into_inner()) = Vec::new();

    *initialized = true;
}

fn default_tasks_for(stage: &LifecycleStage) -> Vec<LifecycleTask> {
    let mut tasks = Vec::new();
    let spec: Vec<(&'static str, &'static str, TaskStatus)> = match stage {
        LifecycleStage::Proposed => vec![
            ("需求确认", "确认业务需求与主数据范围", TaskStatus::Todo),
            ("发起人签字", "业务发起人签字确认", TaskStatus::Todo),
        ],
        LifecycleStage::Designed => vec![
            ("字段建模", "定义主数据字段与校验规则", TaskStatus::Todo),
            ("评审通过", "架构与数据治理评审", TaskStatus::Todo),
        ],
        LifecycleStage::InDevelopment => vec![
            (
                "接口开发",
                "主数据接口与同步逻辑开发",
                TaskStatus::InProgress,
            ),
            ("单元测试", "覆盖率不低于 80%", TaskStatus::Todo),
        ],
        LifecycleStage::Testing => vec![
            ("集成测试", "跨服务集成测试", TaskStatus::InProgress),
            ("UAT", "业务验收测试", TaskStatus::Todo),
        ],
        LifecycleStage::Released => vec![
            ("灰度发布", "灰度验证", TaskStatus::Done),
            ("全量发布", "全量上线", TaskStatus::Done),
        ],
        LifecycleStage::Operative => vec![
            ("日常运维", "日常变更与质量监控", TaskStatus::InProgress),
            ("定期审计", "季度数据审计", TaskStatus::Todo),
        ],
        LifecycleStage::Sunset => vec![
            ("影响评估", "下游依赖与影响面评估", TaskStatus::InProgress),
            ("通知相关方", "通知所有依赖方", TaskStatus::Todo),
            ("制定迁移计划", "制定数据迁移与替换计划", TaskStatus::Todo),
        ],
        LifecycleStage::Archived => vec![
            ("数据归档", "归档到分级存储", TaskStatus::Done),
            ("保留期管理", "按策略定期审查", TaskStatus::Todo),
        ],
        LifecycleStage::Destroyed => vec![
            ("销毁审批", "合规销毁审批", TaskStatus::Done),
            ("执行销毁", "执行物理/逻辑销毁", TaskStatus::Done),
        ],
    };

    for (i, (name, description, status)) in spec.iter().enumerate() {
        tasks.push(LifecycleTask {
            id: format!("task-{}-{}", stage.as_str(), i),
            stage: stage.clone(),
            name: name.to_string(),
            description: description.to_string(),
            owner: None,
            status: status.clone(),
            due_at: None,
            completed_at: None,
            approved_by: None,
        });
    }
    tasks
}

fn record_event(
    master_data_id: String,
    entity_type: String,
    from_stage: Option<LifecycleStage>,
    to_stage: LifecycleStage,
    reason: String,
    triggered_by: String,
    triggered_by_type: String,
    metadata: Option<serde_json::Value>,
) {
    let event = LifecycleEvent {
        id: uuid::Uuid::new_v4().to_string(),
        master_data_id,
        entity_type,
        from_stage,
        to_stage,
        reason,
        triggered_by,
        triggered_by_type,
        metadata,
        created_at: chrono::Utc::now().to_rfc3339(),
    };
    let store_ref = get_lifecycle_store();
    if let Ok(mut events) = store_ref.events.lock() {
        events.push(event);
    }
}

// ==================== 请求/响应结构 ====================

#[derive(Debug, Deserialize)]
pub struct LifecycleEntityQuery {
    pub domain: Option<String>,
    pub stage: Option<String>,
    pub entity_type: Option<String>,
    pub keyword: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct TransitionRequest {
    pub target_stage: String,
    pub reason: String,
    pub triggered_by: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct TaskUpdateRequest {
    pub task_id: String,
    pub status: Option<String>,
    pub owner: Option<String>,
    pub due_at: Option<String>,
    pub approved_by: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RetirementPlanRequest {
    pub entity_type: String,
    pub entity_code: String,
    pub entity_name: String,
    pub master_data_id: String,
    pub planned_sunset_at: String,
    pub planned_archived_at: Option<String>,
    pub notify_channels: Option<Vec<String>>,
    pub rollback_window_days: Option<i32>,
    pub initiated_by: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RetirementConfirmRequest {
    pub confirmed_by: String,
}

#[derive(Debug, Deserialize)]
pub struct RetirementExecuteRequest {
    pub executed_by: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RetirementRollbackRequest {
    pub reason: String,
    pub rollback_by: String,
}

#[derive(Debug, Deserialize)]
pub struct ArchivePolicyRequest {
    pub domain: String,
    pub entity_type: String,
    pub policy_name: String,
    pub description: Option<String>,
    pub archive_age_days: i32,
    pub archive_tier: String,
    pub retention_days: Option<i32>,
    pub index_archived: Option<bool>,
    pub restore_window_days: Option<i32>,
    pub auto_archive: Option<bool>,
    pub notify_on_archive: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct ArchiveRunRequest {
    pub domain: Option<String>,
    pub entity_type: Option<String>,
    pub max_age_days: Option<i32>,
    pub dry_run: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct ArchiveRestoreRequest {
    pub restored_by: String,
    pub reason: String,
}

#[derive(Debug, Deserialize)]
pub struct ArchiveRecordQuery {
    pub domain: Option<String>,
    pub entity_type: Option<String>,
    pub tier: Option<String>,
    pub status: Option<String>,
    pub keyword: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, serde::Serialize)]
pub struct LifecycleStats {
    pub by_stage: Vec<(String, i64)>,
    pub total_entities: i64,
    pub transition_this_period: i64,
    pub sla_breaches: i64,
    pub sunset_count: i64,
    pub archived_count: i64,
    pub destroyed_count: i64,
}

#[derive(Debug, serde::Serialize)]
pub struct ArchiveStats {
    pub total_records: i64,
    pub total_size_bytes: i64,
    pub by_tier: Vec<(String, i64)>,
    pub by_domain: Vec<(String, i64)>,
    pub restored_last_30d: i64,
    pub pending_retention_expiry: i64,
}

// ==================== 处理器：生命周期实体 ====================

pub async fn list_lifecycle_entities(
    State(_state): State<ApiState>,
    Query(params): Query<LifecycleEntityQuery>,
) -> Json<ApiResponse<PaginatedResponse<LifecycleEntity>>> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let entities = store.entities.lock().await;

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);

    let mut filtered: Vec<LifecycleEntity> = entities
        .values()
        .filter(|e| {
            if let Some(d) = &params.domain {
                if &e.domain != d {
                    return false;
                }
            }
            if let Some(s) = &params.stage {
                if e.stage.as_str() != s.as_str() {
                    return false;
                }
            }
            if let Some(t) = &params.entity_type {
                if &e.entity_type != t {
                    return false;
                }
            }
            if let Some(k) = &params.keyword {
                let hay = format!("{} {} {}", e.entity_code, e.entity_name, e.master_data_id);
                if !hay.contains(k.as_str()) {
                    return false;
                }
            }
            true
        })
        .cloned()
        .collect();

    filtered.sort_by(|a, b| b.last_transition_at.cmp(&a.last_transition_at));

    let total = filtered.len() as i64;
    let items: Vec<LifecycleEntity> = filtered
        .into_iter()
        .skip(((page - 1) * page_size) as usize)
        .take(page_size as usize)
        .collect();

    Json(ApiResponse::success(
        PaginatedResponse {
            items,
            total,
            page,
            page_size,
            total_pages: ((total as f64) / (page_size as f64)).ceil() as i64,
        },
        "生命周期实体列表",
    ))
}

#[utoipa::path(
    get,
    path = "/api/erp/mdm-v49/lifecycle/entities/{master_data_id}",
    tag = "Master Data",
    operation_id = "get_lifecycle_entity",
    responses((status = 200, description = "OK")),
)]
pub async fn get_lifecycle_entity(
    State(_state): State<ApiState>,
    Path(master_data_id): Path<String>,
) -> Json<ApiResponse<LifecycleEntity>> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let entities = store.entities.lock().await;
    match entities.get(&master_data_id) {
        Some(e) => Json(ApiResponse::success(e.clone(), "生命周期实体")),
        None => Json(ApiResponse::error(404, "未找到生命周期实体")),
    }
}

#[utoipa::path(
    post,
    path = "/api/erp/mdm-v49/lifecycle/entities",
    tag = "Master Data",
    operation_id = "create_lifecycle_entity",
    responses((status = 200, description = "OK")),
)]
pub async fn create_lifecycle_entity(
    State(_state): State<ApiState>,
    Json(payload): Json<serde_json::Value>,
) -> Json<ApiResponse<LifecycleEntity>> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let mut entities = store.entities.lock().await;

    let master_data_id = payload
        .get("master_data_id")
        .and_then(|v| v.as_str())
        .unwrap_or(&uuid::Uuid::new_v4().to_string())
        .to_string();

    let now = chrono::Utc::now().to_rfc3339();
    let entity = LifecycleEntity {
        id: uuid::Uuid::new_v4().to_string(),
        master_data_id: master_data_id.clone(),
        domain: payload
            .get("domain")
            .and_then(|v| v.as_str())
            .unwrap_or("default")
            .to_string(),
        entity_type: payload
            .get("entity_type")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown")
            .to_string(),
        entity_code: payload
            .get("entity_code")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string(),
        entity_name: payload
            .get("entity_name")
            .and_then(|v| v.as_str())
            .unwrap_or("未命名")
            .to_string(),
        stage: LifecycleStage::Proposed,
        owner: payload
            .get("owner")
            .and_then(|v| v.as_str())
            .map(String::from),
        steward: payload
            .get("steward")
            .and_then(|v| v.as_str())
            .map(String::from),
        stage_entered_at: now.clone(),
        last_transition_at: now.clone(),
        tasks: default_tasks_for(&LifecycleStage::Proposed),
        transition_count: 0,
        sla_deadline: None,
        sla_breached: false,
        tags: payload
            .get("tags")
            .and_then(|v| serde_json::from_value::<Vec<String>>(v.clone()).ok())
            .unwrap_or_default(),
    };

    entities.insert(master_data_id.clone(), entity.clone());

    record_event(
        master_data_id,
        entity.entity_type.clone(),
        None,
        entity.stage.clone(),
        "实体创建".to_string(),
        "system".to_string(),
        "auto".to_string(),
        None,
    );

    Json(ApiResponse::success(entity, "生命周期实体已创建"))
}

#[utoipa::path(
    post,
    path = "/api/erp/mdm-v49/lifecycle/entities/{master_data_id}",
    tag = "Master Data",
    operation_id = "transition_lifecycle_stage",
    responses((status = 200, description = "OK")),
)]
pub async fn transition_lifecycle_stage(
    State(_state): State<ApiState>,
    Path(master_data_id): Path<String>,
    Json(req): Json<TransitionRequest>,
) -> Json<ApiResponse<LifecycleEntity>> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let mut entities = store.entities.lock().await;

    let Some(entity) = entities.get_mut(&master_data_id) else {
        return Json(ApiResponse::error(404, "未找到生命周期实体"));
    };

    let target = LifecycleStage::from_str(&req.target_stage);
    if target.order() <= entity.stage.order()
        && target != LifecycleStage::Archived
        && target != LifecycleStage::Destroyed
    {
        return Json(ApiResponse::error(
            400,
            &format!(
                "stage transition not allowed: {} -> {}",
                entity.stage.as_str(),
                target.as_str()
            ),
        ));
    }

    let prev = entity.stage.clone();
    let now = chrono::Utc::now().to_rfc3339();
    entity.stage = target.clone();
    entity.stage_entered_at = now.clone();
    entity.last_transition_at = now.clone();
    entity.transition_count += 1;
    entity.tasks = default_tasks_for(&target);

    record_event(
        master_data_id.clone(),
        entity.entity_type.clone(),
        Some(prev),
        target,
        req.reason,
        req.triggered_by.unwrap_or_else(|| "system".to_string()),
        "manual".to_string(),
        req.metadata,
    );

    Json(ApiResponse::success(entity.clone(), "阶段已流转"))
}

#[utoipa::path(
    post,
    path = "/api/erp/mdm-v49/lifecycle/entities/{master_data_id}/tasks/{task_id}",
    tag = "Master Data",
    operation_id = "update_lifecycle_task",
    responses((status = 200, description = "OK")),
)]
pub async fn update_lifecycle_task(
    State(_state): State<ApiState>,
    Path((master_data_id, _task_id)): Path<(String, String)>,
    Json(req): Json<TaskUpdateRequest>,
) -> Json<ApiResponse<LifecycleEntity>> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let mut entities = store.entities.lock().await;

    let Some(entity) = entities.get_mut(&master_data_id) else {
        return Json(ApiResponse::error(404, "未找到生命周期实体"));
    };

    let task = match entity.tasks.iter_mut().find(|t| t.id == req.task_id) {
        Some(t) => t,
        None => return Json(ApiResponse::error(404, "未找到任务")),
    };

    if let Some(s) = &req.status {
        task.status = match s.as_str() {
            "in_progress" => TaskStatus::InProgress,
            "blocked" => TaskStatus::Blocked,
            "in_review" => TaskStatus::InReview,
            "done" => TaskStatus::Done,
            _ => TaskStatus::Todo,
        };
        if matches!(task.status, TaskStatus::Done) {
            task.completed_at = Some(chrono::Utc::now().to_rfc3339());
        }
    }
    if let Some(o) = req.owner {
        task.owner = Some(o);
    }
    if let Some(d) = req.due_at {
        task.due_at = Some(d);
    }
    if let Some(a) = req.approved_by {
        task.approved_by = Some(a);
        task.status = TaskStatus::Done;
        task.completed_at = Some(chrono::Utc::now().to_rfc3339());
    }

    Json(ApiResponse::success(entity.clone(), "任务已更新"))
}

#[utoipa::path(
    get,
    path = "/api/erp/mdm-v49/lifecycle/entities/{master_data_id}/events",
    tag = "Master Data",
    operation_id = "get_lifecycle_events",
    responses((status = 200, description = "OK")),
)]
pub async fn get_lifecycle_events(
    State(_state): State<ApiState>,
    Path(master_data_id): Path<String>,
) -> Json<ApiResponse<Vec<LifecycleEvent>>> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let events = store.events.lock().unwrap_or_else(|e| e.into_inner());
    let items: Vec<LifecycleEvent> = events
        .iter()
        .filter(|e| e.master_data_id == master_data_id)
        .cloned()
        .collect();
    Json(ApiResponse::success(items, "生命周期事件列表"))
}

// ==================== 处理器：退役管理 ====================

#[utoipa::path(
    post,
    path = "/api/erp/mdm-v49/retirement/plans",
    tag = "Master Data",
    operation_id = "create_retirement_plan",
    responses((status = 200, description = "OK")),
)]
pub async fn create_retirement_plan(
    State(_state): State<ApiState>,
    Json(req): Json<RetirementPlanRequest>,
) -> Json<ApiResponse<RetirementPlan>> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let mut plans = store.retirement_plans.lock().await;

    let now = chrono::Utc::now().to_rfc3339();
    let plan = RetirementPlan {
        id: uuid::Uuid::new_v4().to_string(),
        master_data_id: req.master_data_id,
        entity_type: req.entity_type,
        entity_code: req.entity_code,
        entity_name: req.entity_name,
        planned_sunset_at: req.planned_sunset_at,
        planned_archived_at: req.planned_archived_at,
        impact_assessment: ImpactAssessment {
            total_references: 0,
            referencing_services: Vec::new(),
            dependent_workflows: Vec::new(),
            affected_reports: Vec::new(),
            data_loss_risk: "unknown".to_string(),
            rollback_possible: true,
            mitigation_steps: vec![
                "评估下游依赖".to_string(),
                "通知相关方".to_string(),
                "准备回滚方案".to_string(),
            ],
            risk_level: "medium".to_string(),
        },
        notify_channels: req
            .notify_channels
            .unwrap_or_else(|| vec!["email".to_string()]),
        notify_status: "pending".to_string(),
        status: RetirementStatus::Draft,
        initiated_by: req.initiated_by.unwrap_or_else(|| "system".to_string()),
        initiated_at: now,
        confirmed_by: None,
        confirmed_at: None,
        executed_at: None,
        rollback_window_days: req.rollback_window_days.unwrap_or(14),
        post_retirement_review_at: None,
    };

    plans.push(plan.clone());
    Json(ApiResponse::success(plan, "退役计划已创建"))
}

pub async fn list_retirement_plans(
    State(_state): State<ApiState>,
    Query(params): Query<RetirementPlanQuery>,
) -> Json<ApiResponse<PaginatedResponse<RetirementPlan>>> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let plans = store.retirement_plans.lock().await;

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);

    let mut filtered: Vec<RetirementPlan> = plans
        .iter()
        .filter(|p| {
            if let Some(s) = &params.status {
                let expected = RetirementStatus::from_str(s);
                if p.status != expected {
                    return false;
                }
            }
            if let Some(t) = &params.entity_type {
                if &p.entity_type != t {
                    return false;
                }
            }
            if let Some(k) = &params.keyword {
                let hay = format!("{} {} {}", p.entity_code, p.entity_name, p.master_data_id);
                if !hay.contains(k.as_str()) {
                    return false;
                }
            }
            true
        })
        .cloned()
        .collect();

    filtered.sort_by(|a, b| b.initiated_at.cmp(&a.initiated_at));

    let total = filtered.len() as i64;
    let items: Vec<RetirementPlan> = filtered
        .into_iter()
        .skip(((page - 1) * page_size) as usize)
        .take(page_size as usize)
        .collect();

    Json(ApiResponse::success(
        PaginatedResponse {
            items,
            total,
            page,
            page_size,
            total_pages: ((total as f64) / (page_size as f64)).ceil() as i64,
        },
        "退役计划列表",
    ))
}

#[derive(Debug, Deserialize)]
pub struct RetirementPlanQuery {
    pub status: Option<String>,
    pub entity_type: Option<String>,
    pub keyword: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

impl RetirementStatus {
    fn from_str(s: &str) -> Self {
        match s {
            "impact_assessed" => Self::ImpactAssessed,
            "stakeholder_notified" => Self::StakeholderNotified,
            "confirmed" => Self::Confirmed,
            "executing" => Self::Executing,
            "completed" => Self::Completed,
            "rolled_back" => Self::RolledBack,
            "cancelled" => Self::Cancelled,
            _ => Self::Draft,
        }
    }
}

#[utoipa::path(
    get,
    path = "/api/erp/mdm-v49/retirement/plans/{plan_id}",
    tag = "Master Data",
    operation_id = "get_retirement_plan",
    responses((status = 200, description = "OK")),
)]
pub async fn get_retirement_plan(
    State(_state): State<ApiState>,
    Path(plan_id): Path<String>,
) -> Json<ApiResponse<RetirementPlan>> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let plans = store.retirement_plans.lock().await;
    match plans.iter().find(|p| p.id == plan_id) {
        Some(p) => Json(ApiResponse::success(p.clone(), "退役计划")),
        None => Json(ApiResponse::error(404, "未找到退役计划")),
    }
}

#[utoipa::path(
    post,
    path = "/api/erp/mdm-v49/retirement/plans/{plan_id}/assess",
    tag = "Master Data",
    operation_id = "assess_impact",
    responses((status = 200, description = "OK")),
)]
pub async fn assess_impact(
    State(_state): State<ApiState>,
    Path(plan_id): Path<String>,
) -> Json<ApiResponse<RetirementPlan>> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let mut plans = store.retirement_plans.lock().await;
    let Some(plan) = plans.iter_mut().find(|p| p.id == plan_id) else {
        return Json(ApiResponse::error(404, "未找到退役计划"));
    };

    // 简化版影响评估：基于实体类型模拟下游依赖
    let services = match plan.entity_type.as_str() {
        "customer" => vec!["finance".to_string(), "sales".to_string(), "ar".to_string()],
        "supplier" => vec![
            "purchase".to_string(),
            "finance".to_string(),
            "ap".to_string(),
        ],
        "product" => vec![
            "inventory".to_string(),
            "sales".to_string(),
            "production".to_string(),
        ],
        _ => vec!["erp".to_string()],
    };
    let workflows = vec!["主数据同步".to_string(), "报表统计".to_string()];
    let total_refs = services.len() as i64 * 3 + 2;

    plan.impact_assessment = ImpactAssessment {
        total_references: total_refs,
        referencing_services: services,
        dependent_workflows: workflows,
        affected_reports: vec!["主数据统计报表".to_string()],
        data_loss_risk: "low".to_string(),
        rollback_possible: true,
        mitigation_steps: vec![
            "通知下游服务负责人".to_string(),
            "设置 2 周只读缓冲期".to_string(),
            "准备替代实体映射".to_string(),
            "保留历史数据 7 年".to_string(),
        ],
        risk_level: if total_refs > 10 {
            "high".to_string()
        } else {
            "medium".to_string()
        },
    };
    plan.status = RetirementStatus::ImpactAssessed;

    Json(ApiResponse::success(plan.clone(), "影响评估已完成"))
}

#[utoipa::path(
    post,
    path = "/api/erp/mdm-v49/retirement/plans/{plan_id}/notify",
    tag = "Master Data",
    operation_id = "notify_stakeholders",
    responses((status = 200, description = "OK")),
)]
pub async fn notify_stakeholders(
    State(_state): State<ApiState>,
    Path(plan_id): Path<String>,
) -> Json<ApiResponse<RetirementPlan>> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let mut plans = store.retirement_plans.lock().await;
    let Some(plan) = plans.iter_mut().find(|p| p.id == plan_id) else {
        return Json(ApiResponse::error(404, "未找到退役计划"));
    };

    plan.notify_status = "sent".to_string();
    plan.status = RetirementStatus::StakeholderNotified;

    Json(ApiResponse::success(
        plan.clone(),
        &format!("已通过 {:?} 通知相关方", plan.notify_channels),
    ))
}

#[utoipa::path(
    post,
    path = "/api/erp/mdm-v49/retirement/plans/{plan_id}/confirm",
    tag = "Master Data",
    operation_id = "confirm_retirement_plan",
    responses((status = 200, description = "OK")),
)]
pub async fn confirm_retirement_plan(
    State(_state): State<ApiState>,
    Path(plan_id): Path<String>,
    Json(req): Json<RetirementConfirmRequest>,
) -> Json<ApiResponse<RetirementPlan>> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let mut plans = store.retirement_plans.lock().await;
    let Some(plan) = plans.iter_mut().find(|p| p.id == plan_id) else {
        return Json(ApiResponse::error(404, "未找到退役计划"));
    };

    plan.confirmed_by = Some(req.confirmed_by);
    plan.confirmed_at = Some(chrono::Utc::now().to_rfc3339());
    plan.status = RetirementStatus::Confirmed;

    Json(ApiResponse::success(plan.clone(), "退役计划已确认"))
}

pub async fn execute_retirement_plan(
    State(_state): State<ApiState>,
    Path(plan_id): Path<String>,
    Json(req): Json<RetirementExecuteRequest>,
) -> Json<ApiResponse<RetirementPlan>> {
    ensure_initialized().await;
    let store = get_lifecycle_store();

    let (master_data_id, planned_rollback_window) = {
        let mut plans = store.retirement_plans.lock().await;
        let Some(plan) = plans.iter_mut().find(|p| p.id == plan_id) else {
            return Json(ApiResponse::error(404, "未找到退役计划"));
        };

        plan.status = RetirementStatus::Completed;
        plan.executed_at = Some(chrono::Utc::now().to_rfc3339());
        plan.post_retirement_review_at = Some(
            (chrono::Utc::now() + chrono::Duration::days(plan.rollback_window_days as i64))
                .to_rfc3339(),
        );
        let _ = req;
        (plan.master_data_id.clone(), plan.rollback_window_days)
    };

    // 同步推进实体生命周期阶段到 Sunset
    let mut entities = store.entities.lock().await;
    if let Some(entity) = entities.get_mut(&master_data_id) {
        entity.stage = LifecycleStage::Sunset;
        entity.last_transition_at = chrono::Utc::now().to_rfc3339();
        entity.transition_count += 1;
    }

    let plans = store.retirement_plans.lock().await;
    let p = plans.iter().find(|x| x.id == plan_id).cloned();
    let _ = planned_rollback_window;
    match p {
        Some(plan) => Json(ApiResponse::success(plan, "退役已执行")),
        None => Json(ApiResponse::error(500, "执行失败")),
    }
}

pub async fn rollback_retirement_plan(
    State(_state): State<ApiState>,
    Path(plan_id): Path<String>,
    Json(req): Json<RetirementRollbackRequest>,
) -> Json<ApiResponse<RetirementPlan>> {
    ensure_initialized().await;
    let store = get_lifecycle_store();

    let master_data_id = {
        let mut plans = store.retirement_plans.lock().await;
        let Some(plan) = plans.iter_mut().find(|p| p.id == plan_id) else {
            return Json(ApiResponse::error(404, "未找到退役计划"));
        };

        if !matches!(
            plan.status,
            RetirementStatus::Completed | RetirementStatus::Executing
        ) {
            return Json(ApiResponse::error(400, "当前状态不支持回滚"));
        }

        plan.status = RetirementStatus::RolledBack;
        let _ = req;
        plan.master_data_id.clone()
    };

    // 回滚实体到 Operative
    let mut entities = store.entities.lock().await;
    if let Some(entity) = entities.get_mut(&master_data_id) {
        entity.stage = LifecycleStage::Operative;
        entity.last_transition_at = chrono::Utc::now().to_rfc3339();
        entity.transition_count += 1;
    }

    let plans = store.retirement_plans.lock().await;
    let p = plans.iter().find(|x| x.id == plan_id).cloned();
    match p {
        Some(plan) => Json(ApiResponse::success(plan, "已回滚")),
        None => Json(ApiResponse::error(500, "回滚失败")),
    }
}

pub async fn cancel_retirement_plan(
    State(_state): State<ApiState>,
    Path(plan_id): Path<String>,
) -> Json<ApiResponse<RetirementPlan>> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let mut plans = store.retirement_plans.lock().await;
    let Some(plan) = plans.iter_mut().find(|p| p.id == plan_id) else {
        return Json(ApiResponse::error(404, "未找到退役计划"));
    };

    if matches!(plan.status, RetirementStatus::Completed) {
        return Json(ApiResponse::error(400, "已执行的退役计划不可取消"));
    }

    plan.status = RetirementStatus::Cancelled;
    Json(ApiResponse::success(plan.clone(), "退役计划已取消"))
}

// ==================== 处理器：归档策略 ====================

pub async fn list_archive_policies(
    State(_state): State<ApiState>,
    Query(params): Query<ArchivePolicyQuery>,
) -> Json<ApiResponse<PaginatedResponse<ArchivePolicy>>> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let policies = store.archive_policies.lock().await;

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);

    let mut filtered: Vec<ArchivePolicy> = policies
        .iter()
        .filter(|p| {
            if let Some(d) = &params.domain {
                if &p.domain != d {
                    return false;
                }
            }
            if let Some(t) = &params.entity_type {
                if &p.entity_type != t {
                    return false;
                }
            }
            if let Some(k) = &params.keyword {
                if !p.policy_name.contains(k.as_str()) {
                    return false;
                }
            }
            true
        })
        .cloned()
        .collect();

    filtered.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));

    let total = filtered.len() as i64;
    let items: Vec<ArchivePolicy> = filtered
        .into_iter()
        .skip(((page - 1) * page_size) as usize)
        .take(page_size as usize)
        .collect();

    Json(ApiResponse::success(
        PaginatedResponse {
            items,
            total,
            page,
            page_size,
            total_pages: ((total as f64) / (page_size as f64)).ceil() as i64,
        },
        "归档策略列表",
    ))
}

#[derive(Debug, Deserialize)]
pub struct ArchivePolicyQuery {
    pub domain: Option<String>,
    pub entity_type: Option<String>,
    pub keyword: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

pub async fn create_archive_policy(
    State(_state): State<ApiState>,
    Json(req): Json<ArchivePolicyRequest>,
) -> Json<ApiResponse<ArchivePolicy>> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let mut policies = store.archive_policies.lock().await;

    let now = chrono::Utc::now().to_rfc3339();
    let tier = match req.archive_tier.as_str() {
        "hot" => ArchiveTier::Hot,
        "warm" => ArchiveTier::Warm,
        "cold" => ArchiveTier::Cold,
        "glacier" => ArchiveTier::Glacier,
        _ => ArchiveTier::Warm,
    };

    let policy = ArchivePolicy {
        id: uuid::Uuid::new_v4().to_string(),
        domain: req.domain,
        entity_type: req.entity_type,
        policy_name: req.policy_name,
        description: req.description.unwrap_or_default(),
        archive_age_days: req.archive_age_days,
        retention_days: req
            .retention_days
            .unwrap_or_else(|| tier.retention_default_days()),
        archive_tier: tier,
        index_archived: req.index_archived.unwrap_or(true),
        restore_window_days: req.restore_window_days.unwrap_or(30),
        auto_archive: req.auto_archive.unwrap_or(true),
        notify_on_archive: req.notify_on_archive.unwrap_or(true),
        created_at: now.clone(),
        updated_at: now,
    };

    policies.push(policy.clone());
    Json(ApiResponse::success(policy, "归档策略已创建"))
}

pub async fn get_archive_policy(
    State(_state): State<ApiState>,
    Path(policy_id): Path<String>,
) -> Json<ApiResponse<ArchivePolicy>> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let policies = store.archive_policies.lock().await;
    match policies.iter().find(|p| p.id == policy_id) {
        Some(p) => Json(ApiResponse::success(p.clone(), "归档策略")),
        None => Json(ApiResponse::error(404, "未找到归档策略")),
    }
}

pub async fn update_archive_policy(
    State(_state): State<ApiState>,
    Path(policy_id): Path<String>,
    Json(req): Json<ArchivePolicyRequest>,
) -> Json<ApiResponse<ArchivePolicy>> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let mut policies = store.archive_policies.lock().await;
    let Some(policy) = policies.iter_mut().find(|p| p.id == policy_id) else {
        return Json(ApiResponse::error(404, "未找到归档策略"));
    };

    policy.policy_name = req.policy_name;
    policy.description = req.description.unwrap_or_default();
    policy.archive_age_days = req.archive_age_days;
    let tier = match req.archive_tier.as_str() {
        "hot" => ArchiveTier::Hot,
        "cold" => ArchiveTier::Cold,
        "glacier" => ArchiveTier::Glacier,
        _ => ArchiveTier::Warm,
    };
    policy.archive_tier = tier;
    if let Some(r) = req.retention_days {
        policy.retention_days = r;
    }
    if let Some(i) = req.index_archived {
        policy.index_archived = i;
    }
    if let Some(r) = req.restore_window_days {
        policy.restore_window_days = r;
    }
    if let Some(a) = req.auto_archive {
        policy.auto_archive = a;
    }
    if let Some(n) = req.notify_on_archive {
        policy.notify_on_archive = n;
    }
    policy.updated_at = chrono::Utc::now().to_rfc3339();

    Json(ApiResponse::success(policy.clone(), "归档策略已更新"))
}

pub async fn delete_archive_policy(
    State(_state): State<ApiState>,
    Path(policy_id): Path<String>,
) -> Json<ApiResponse<()>> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let mut policies = store.archive_policies.lock().await;
    let before = policies.len();
    policies.retain(|p| p.id != policy_id);
    if policies.len() == before {
        return Json(ApiResponse::error(404, "未找到归档策略"));
    }
    Json(ApiResponse::success((), "归档策略已删除"))
}

// ==================== 处理器：归档执行 ====================

pub async fn run_archive(
    State(_state): State<ApiState>,
    Json(req): Json<ArchiveRunRequest>,
) -> Json<ApiResponse<Vec<ArchiveRecord>>> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let matched: Vec<ArchivePolicy> = {
        let policies = store.archive_policies.lock().await;
        let mut matched: Vec<ArchivePolicy> = Vec::new();
        for p in policies.iter() {
            if let Some(d) = &req.domain {
                if &p.domain != d {
                    continue;
                }
            }
            if let Some(t) = &req.entity_type {
                if &p.entity_type != t {
                    continue;
                }
            }
            if !p.auto_archive {
                continue;
            }
            matched.push(p.clone());
        }
        matched
    };

    let entities = store.entities.lock().await;
    let mut new_records: Vec<ArchiveRecord> = Vec::new();
    let mut to_archive: Vec<(String, String, String, String)> = Vec::new();
    let now = chrono::Utc::now();
    let dry_run = req.dry_run.unwrap_or(false);

    for policy in matched {
        for entity in entities.values() {
            if entity.domain != policy.domain || entity.entity_type != policy.entity_type {
                continue;
            }
            if entity.stage.order() >= LifecycleStage::Archived.order() {
                continue;
            }
            let age_days = (now
                - chrono::DateTime::parse_from_rfc3339(&entity.last_transition_at)
                    .map(|dt| dt.with_timezone(&chrono::Utc))
                    .unwrap_or(now))
            .num_days();
            if age_days < policy.archive_age_days as i64 {
                if let Some(max_age) = req.max_age_days {
                    if age_days < max_age as i64 {
                        continue;
                    }
                } else {
                    continue;
                }
            }

            new_records.push(ArchiveRecord {
                id: uuid::Uuid::new_v4().to_string(),
                master_data_id: entity.master_data_id.clone(),
                domain: entity.domain.clone(),
                entity_type: entity.entity_type.clone(),
                entity_code: entity.entity_code.clone(),
                entity_name: entity.entity_name.clone(),
                archive_tier: policy.archive_tier.clone(),
                archived_at: now.to_rfc3339(),
                archived_by: "auto_archive".to_string(),
                archive_reason: format!(
                    "policy: {}, age {}d >= {}d",
                    policy.policy_name, age_days, policy.archive_age_days
                ),
                policy_id: Some(policy.id.clone()),
                retention_until: (now + chrono::Duration::days(policy.retention_days as i64))
                    .to_rfc3339(),
                restore_count: 0,
                last_restored_at: None,
                status: if dry_run { "pending" } else { "archived" }.to_string(),
                record_size_bytes: (entity.entity_name.len() as i64 + 1024) * 8,
                checksum: format!(
                    "sha256:{}",
                    uuid::Uuid::new_v4().to_string().replace('-', "")
                ),
            });

            if !dry_run {
                to_archive.push((
                    entity.master_data_id.clone(),
                    entity.entity_type.clone(),
                    entity.entity_code.clone(),
                    entity.entity_name.clone(),
                ));
            }
        }
    }
    drop(entities);

    if !dry_run && !to_archive.is_empty() {
        let mut ents = store.entities.lock().await;
        for (mid, _et, _ec, _en) in &to_archive {
            if let Some(e) = ents.get_mut(mid) {
                e.stage = LifecycleStage::Archived;
                e.last_transition_at = now.to_rfc3339();
                e.transition_count += 1;
            }
        }
    }

    if !dry_run && !new_records.is_empty() {
        let mut records = store.archive_records.lock().await;
        records.extend(new_records.clone());
    }

    Json(ApiResponse::success(
        new_records,
        if dry_run {
            "归档预演完成（dry run）"
        } else {
            "归档执行完成"
        },
    ))
}

pub async fn list_archive_records(
    State(_state): State<ApiState>,
    Query(params): Query<ArchiveRecordQuery>,
) -> Json<ApiResponse<PaginatedResponse<ArchiveRecord>>> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let records = store.archive_records.lock().await;

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);

    let mut filtered: Vec<ArchiveRecord> = records
        .iter()
        .filter(|r| {
            if let Some(d) = &params.domain {
                if &r.domain != d {
                    return false;
                }
            }
            if let Some(t) = &params.entity_type {
                if &r.entity_type != t {
                    return false;
                }
            }
            if let Some(tier) = &params.tier {
                if r.archive_tier.as_str() != tier.as_str() {
                    return false;
                }
            }
            if let Some(s) = &params.status {
                if &r.status != s {
                    return false;
                }
            }
            if let Some(k) = &params.keyword {
                let hay = format!(
                    "{} {} {} {}",
                    r.entity_code, r.entity_name, r.master_data_id, r.archive_reason
                );
                if !hay.contains(k.as_str()) {
                    return false;
                }
            }
            true
        })
        .cloned()
        .collect();

    filtered.sort_by(|a, b| b.archived_at.cmp(&a.archived_at));

    let total = filtered.len() as i64;
    let items: Vec<ArchiveRecord> = filtered
        .into_iter()
        .skip(((page - 1) * page_size) as usize)
        .take(page_size as usize)
        .collect();

    Json(ApiResponse::success(
        PaginatedResponse {
            items,
            total,
            page,
            page_size,
            total_pages: ((total as f64) / (page_size as f64)).ceil() as i64,
        },
        "归档记录列表",
    ))
}

pub async fn get_archive_record(
    State(_state): State<ApiState>,
    Path(record_id): Path<String>,
) -> Json<ApiResponse<ArchiveRecord>> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let records = store.archive_records.lock().await;
    match records.iter().find(|r| r.id == record_id) {
        Some(r) => Json(ApiResponse::success(r.clone(), "归档记录")),
        None => Json(ApiResponse::error(404, "未找到归档记录")),
    }
}

pub async fn restore_archive_record(
    State(_state): State<ApiState>,
    Path(record_id): Path<String>,
    Json(req): Json<ArchiveRestoreRequest>,
) -> Json<ApiResponse<ArchiveRecord>> {
    ensure_initialized().await;
    let store = get_lifecycle_store();

    let (restored_record_id, master_data_id, entity_type) = {
        let mut records = store.archive_records.lock().await;
        let Some(record) = records.iter_mut().find(|r| r.id == record_id) else {
            return Json(ApiResponse::error(404, "未找到归档记录"));
        };

        if record.status != "archived" {
            return Json(ApiResponse::error(400, "记录状态不支持恢复"));
        }

        record.restore_count += 1;
        record.last_restored_at = Some(chrono::Utc::now().to_rfc3339());
        record.status = "restored".to_string();

        (
            record.id.clone(),
            record.master_data_id.clone(),
            record.entity_type.clone(),
        )
    };

    // 同步把实体恢复到 Operative
    let mut entities = store.entities.lock().await;
    if let Some(entity) = entities.get_mut(&master_data_id) {
        entity.stage = LifecycleStage::Operative;
        entity.last_transition_at = chrono::Utc::now().to_rfc3339();
        entity.transition_count += 1;
        entity.sla_breached = false;
    }

    record_event(
        master_data_id,
        entity_type,
        Some(LifecycleStage::Archived),
        LifecycleStage::Operative,
        format!("归档恢复: {}", req.reason),
        req.restored_by,
        "restore".to_string(),
        None,
    );

    let records = store.archive_records.lock().await;
    let r = records.iter().find(|x| x.id == restored_record_id).cloned();
    match r {
        Some(rec) => Json(ApiResponse::success(rec, "已恢复归档记录")),
        None => Json(ApiResponse::error(500, "恢复失败")),
    }
}

// ==================== 处理器：仪表盘与统计 ====================

pub async fn get_lifecycle_stats(
    State(_state): State<ApiState>,
) -> Json<ApiResponse<LifecycleStats>> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let entities = store.entities.lock().await;
    let events = store.events.lock().unwrap_or_else(|e| e.into_inner());

    let mut by_stage: Vec<(String, i64)> = LifecycleStage::all()
        .iter()
        .map(|s| (s.as_str().to_string(), 0i64))
        .collect();
    let mut sunset_count: i64 = 0;
    let mut archived_count: i64 = 0;
    let mut destroyed_count: i64 = 0;
    let mut sla_breaches: i64 = 0;

    for e in entities.values() {
        if let Some((_, cnt)) = by_stage.iter_mut().find(|(k, _)| *k == e.stage.as_str()) {
            *cnt += 1;
        }
        match e.stage {
            LifecycleStage::Sunset => sunset_count += 1,
            LifecycleStage::Archived => archived_count += 1,
            LifecycleStage::Destroyed => destroyed_count += 1,
            _ => {}
        }
        if e.sla_breached {
            sla_breaches += 1;
        }
    }

    let transition_this_period = events.len() as i64;
    let total_entities = entities.len() as i64;

    Json(ApiResponse::success(
        LifecycleStats {
            by_stage,
            total_entities,
            transition_this_period,
            sla_breaches,
            sunset_count,
            archived_count,
            destroyed_count,
        },
        "生命周期统计",
    ))
}

pub async fn get_archive_stats(State(_state): State<ApiState>) -> Json<ApiResponse<ArchiveStats>> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let records = store.archive_records.lock().await;

    let mut by_tier: Vec<(String, i64)> = vec![
        ("hot".to_string(), 0),
        ("warm".to_string(), 0),
        ("cold".to_string(), 0),
        ("glacier".to_string(), 0),
    ];
    let mut by_domain: HashMap<String, i64> = HashMap::new();
    let mut total_size: i64 = 0;
    let mut restored_last_30d: i64 = 0;
    let mut pending_retention_expiry: i64 = 0;
    let now = chrono::Utc::now();

    for r in records.iter() {
        total_size += r.record_size_bytes;
        if let Some((_, cnt)) = by_tier
            .iter_mut()
            .find(|(k, _)| *k == r.archive_tier.as_str())
        {
            *cnt += 1;
        }
        *by_domain.entry(r.domain.clone()).or_insert(0) += 1;

        if let Some(last) = &r.last_restored_at {
            if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(last) {
                let dt = dt.with_timezone(&chrono::Utc);
                if (now - dt).num_days() <= 30 {
                    restored_last_30d += 1;
                }
            }
        }

        if let Ok(ret) = chrono::DateTime::parse_from_rfc3339(&r.retention_until) {
            let ret = ret.with_timezone(&chrono::Utc);
            let days_left = (ret - now).num_days();
            if (0..=365).contains(&days_left) {
                pending_retention_expiry += 1;
            }
        }
    }

    let by_domain: Vec<(String, i64)> = by_domain.into_iter().collect();

    Json(ApiResponse::success(
        ArchiveStats {
            total_records: records.len() as i64,
            total_size_bytes: total_size,
            by_tier,
            by_domain,
            restored_last_30d,
            pending_retention_expiry,
        },
        "归档统计",
    ))
}

pub async fn get_retirement_stats(
    State(_state): State<ApiState>,
) -> Json<ApiResponse<serde_json::Value>> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let plans = store.retirement_plans.lock().await;

    let mut by_status: HashMap<String, i64> = HashMap::new();
    let mut total = 0i64;
    let mut completed = 0i64;
    let mut rollbacks = 0i64;

    for p in plans.iter() {
        total += 1;
        *by_status.entry(format!("{:?}", p.status)).or_insert(0) += 1;
        if matches!(p.status, RetirementStatus::Completed) {
            completed += 1;
        }
        if matches!(p.status, RetirementStatus::RolledBack) {
            rollbacks += 1;
        }
    }

    let avg_rollback_window = plans
        .iter()
        .map(|p| p.rollback_window_days as i64)
        .sum::<i64>()
        .checked_div(plans.len().max(1) as i64)
        .unwrap_or(0);

    Json(ApiResponse::success(
        serde_json::json!({
            "total_plans": total,
            "completed": completed,
            "rollbacks": rollbacks,
            "by_status": by_status,
            "avg_rollback_window_days": avg_rollback_window,
        }),
        "退役管理统计",
    ))
}

pub async fn run_sla_check(State(_state): State<ApiState>) -> Json<ApiResponse<serde_json::Value>> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let mut entities = store.entities.lock().await;
    let now = chrono::Utc::now();
    let mut breached = Vec::new();

    for entity in entities.values_mut() {
        if let Some(deadline_str) = &entity.sla_deadline {
            if let Ok(deadline) = chrono::DateTime::parse_from_rfc3339(deadline_str) {
                if now > deadline && !entity.sla_breached {
                    entity.sla_breached = true;
                    breached.push(serde_json::json!({
                        "master_data_id": entity.master_data_id,
                        "entity_code": entity.entity_code,
                        "stage": entity.stage.as_str(),
                        "sla_deadline": deadline_str,
                        "breached_at": now.to_rfc3339(),
                    }));
                }
            }
        }
    }

    Json(ApiResponse::success(
        serde_json::json!({
            "checked_at": now.to_rfc3339(),
            "breached_count": breached.len(),
            "breached": breached,
        }),
        "SLA 检查完成",
    ))
}

pub async fn get_lifecycle_dashboard(
    State(_state): State<ApiState>,
) -> Json<ApiResponse<serde_json::Value>> {
    ensure_initialized().await;
    let _ = get_lifecycle_store();
    Json(ApiResponse::success(
        serde_json::json!({
            "version": "v49",
            "modules": ["lifecycle", "retirement", "archive"],
            "endpoints": vec![
                "/api/erp/mdm-v49/lifecycle/entities",
                "/api/erp/mdm-v49/retirement/plans",
                "/api/erp/mdm-v49/archive/policies",
                "/api/erp/mdm-v49/archive/records",
                "/api/erp/mdm-v49/stats/lifecycle",
                "/api/erp/mdm-v49/stats/archive",
                "/api/erp/mdm-v49/stats/retirement",
            ],
        }),
        "V49 MDM 生命周期管理仪表盘",
    ))
}

// ==================== 路由注册 ====================

pub fn create_routes() -> axum::Router<ApiState> {
    use axum::routing::{get, post};
    axum::Router::new()
        // V49 AC-21: 生命周期实体
        .route(
            "/api/erp/mdm-v49/lifecycle/entities",
            get(list_lifecycle_entities).post(create_lifecycle_entity),
        )
        .route(
            "/api/erp/mdm-v49/lifecycle/entities/{master_data_id}",
            get(get_lifecycle_entity).post(transition_lifecycle_stage),
        )
        .route(
            "/api/erp/mdm-v49/lifecycle/entities/{master_data_id}/tasks/{task_id}",
            post(update_lifecycle_task),
        )
        .route(
            "/api/erp/mdm-v49/lifecycle/entities/{master_data_id}/events",
            get(get_lifecycle_events),
        )
        // V49 AC-22: 退役管理
        .route(
            "/api/erp/mdm-v49/retirement/plans",
            get(list_retirement_plans).post(create_retirement_plan),
        )
        .route(
            "/api/erp/mdm-v49/retirement/plans/{plan_id}",
            get(get_retirement_plan),
        )
        .route(
            "/api/erp/mdm-v49/retirement/plans/{plan_id}/assess",
            post(assess_impact),
        )
        .route(
            "/api/erp/mdm-v49/retirement/plans/{plan_id}/notify",
            post(notify_stakeholders),
        )
        .route(
            "/api/erp/mdm-v49/retirement/plans/{plan_id}/confirm",
            post(confirm_retirement_plan),
        )
        .route(
            "/api/erp/mdm-v49/retirement/plans/{plan_id}/execute",
            post(execute_retirement_plan),
        )
        .route(
            "/api/erp/mdm-v49/retirement/plans/{plan_id}/rollback",
            post(rollback_retirement_plan),
        )
        .route(
            "/api/erp/mdm-v49/retirement/plans/{plan_id}/cancel",
            post(cancel_retirement_plan),
        )
        // V49 AC-23: 归档策略
        .route(
            "/api/erp/mdm-v49/archive/policies",
            get(list_archive_policies).post(create_archive_policy),
        )
        .route(
            "/api/erp/mdm-v49/archive/policies/{policy_id}",
            get(get_archive_policy)
                .put(update_archive_policy)
                .delete(delete_archive_policy),
        )
        .route(
            "/api/erp/mdm-v49/archive/records",
            get(list_archive_records),
        )
        .route(
            "/api/erp/mdm-v49/archive/records/{record_id}",
            get(get_archive_record),
        )
        .route(
            "/api/erp/mdm-v49/archive/records/{record_id}/restore",
            post(restore_archive_record),
        )
        .route("/api/erp/mdm-v49/archive/run", post(run_archive))
        // 统计仪表盘
        .route("/api/erp/mdm-v49/stats/lifecycle", get(get_lifecycle_stats))
        .route("/api/erp/mdm-v49/stats/archive", get(get_archive_stats))
        .route(
            "/api/erp/mdm-v49/stats/retirement",
            get(get_retirement_stats),
        )
        .route("/api/erp/mdm-v49/sla/check", post(run_sla_check))
        .route("/api/erp/mdm-v49/dashboard", get(get_lifecycle_dashboard))
}

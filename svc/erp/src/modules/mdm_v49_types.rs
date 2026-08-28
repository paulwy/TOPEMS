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

use serde::Deserialize;
use std::collections::HashMap;
use std::sync::LazyLock;
use tokio::sync::Mutex;

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

pub struct LifecycleStore {
    pub entities: Mutex<HashMap<String, LifecycleEntity>>,
    pub retirement_plans: Mutex<Vec<RetirementPlan>>,
    pub archive_policies: Mutex<Vec<ArchivePolicy>>,
    pub archive_records: Mutex<Vec<ArchiveRecord>>,
    pub events: std::sync::Mutex<Vec<LifecycleEvent>>,
    pub initialized: Mutex<bool>,
}

pub fn get_lifecycle_store() -> &'static LifecycleStore {
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

pub async fn ensure_initialized() {
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

pub fn default_tasks_for(stage: &LifecycleStage) -> Vec<LifecycleTask> {
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

pub fn record_event(
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

#[derive(Debug, Deserialize, utoipa::IntoParams)]
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

#[derive(Debug, Deserialize, utoipa::IntoParams)]
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


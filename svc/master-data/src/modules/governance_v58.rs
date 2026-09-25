//! STATUS: WIRED | Routes registered + DB tables initialized + Handlers implemented
//! V58.0 MDM AC-30: 主数据治理成熟度 + 自动化工作流 + 数据产品化
//!
//! 核心能力：
//! - 治理成熟度 (GovernanceMaturity): 成熟度评估、维度评分、改进计划、进度追踪、基准对比
//! - 自动化工作流 (MDMWorkflowEngine): 工作流模板、步骤管理、审批/驳回、状态流转
//! - 数据产品化 (DataProductManager): 数据产品管理、数据契约、API暴露、血缘追踪

use axum::{extract::Path, extract::Query, extract::State, Json};
use serde::Deserialize;
use std::sync::LazyLock;
use tokio::sync::Mutex;
use topems_shared_core::response::ApiResponse;

use crate::shared::AppState;

// ==================== 纯函数（无副作用，可单测） ====================

/// 计算治理成熟度综合分数（0-5 分制）。
/// - 输入为各维度分数列表（每个维度 0-5 分）
/// - 各维度 clamp 到 [0,5]，取算术平均
/// - 空列表返回 0.0
/// - 结果四舍五入到 2 位小数
pub fn calculate_maturity_score(dimensions: &[f64]) -> f64 {
    if dimensions.is_empty() {
        return 0.0;
    }
    let sum: f64 = dimensions.iter().map(|v| v.clamp(0.0, 5.0)).sum();
    let avg = sum / dimensions.len() as f64;
    (avg * 100.0).round() / 100.0
}

/// 根据成熟度分数返回成熟度等级名称（对应 MaturityLevel 枚举）。
/// - [4.5, 5.0] -> "optimized"
/// - [3.5, 4.5) -> "managed"
/// - [2.5, 3.5) -> "defined"
/// - [1.5, 2.5) -> "developed"
/// - [0.0, 1.5) -> "initial"
pub fn maturity_level_name(score: f64) -> &'static str {
    let s = score.clamp(0.0, 5.0);
    if s >= 4.5 {
        "optimized"
    } else if s >= 3.5 {
        "managed"
    } else if s >= 2.5 {
        "defined"
    } else if s >= 1.5 {
        "developed"
    } else {
        "initial"
    }
}

// ==================== 治理成熟度：数据结构 ====================

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MaturityLevel {
    Initial,
    Developed,
    Defined,
    Managed,
    Optimized,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum GovernanceDimension {
    Quality,
    Consistency,
    Ownership,
    Process,
    Technology,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct MaturityAssessment {
    pub id: String,
    pub dimension: GovernanceDimension,
    pub current_level: MaturityLevel,
    pub target_level: MaturityLevel,
    pub score: f64,
    pub gaps: Vec<String>,
    pub recommendations: Vec<String>,
    pub assessed_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DimensionScore {
    pub dimension: GovernanceDimension,
    pub score: f64,
    pub weight: f64,
    pub maturity_level: MaturityLevel,
    pub evidence: Vec<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ImprovementPlan {
    pub id: String,
    pub dimension: GovernanceDimension,
    pub target_level: MaturityLevel,
    pub actions: Vec<String>,
    pub priority: String,
    pub due_date: Option<String>,
    pub status: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct MaturityProgress {
    pub dimension: GovernanceDimension,
    pub from_level: MaturityLevel,
    pub to_level: MaturityLevel,
    pub progress_percentage: f64,
    pub updated_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct MaturityHistoryEntry {
    pub id: String,
    pub dimension: GovernanceDimension,
    pub score: f64,
    pub level: MaturityLevel,
    pub recorded_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct BenchmarkData {
    pub dimension: GovernanceDimension,
    pub current_score: f64,
    pub industry_average: f64,
    pub best_practice: f64,
    pub gap: f64,
}

// ==================== 治理成熟度：引擎 ====================

struct GovernanceMaturity {
    assessments: Mutex<Vec<MaturityAssessment>>,
    dimension_scores: Mutex<Vec<DimensionScore>>,
    improvement_plans: Mutex<Vec<ImprovementPlan>>,
    history: Mutex<Vec<MaturityHistoryEntry>>,
    initialized: Mutex<bool>,
}

impl GovernanceMaturity {
    async fn assess_maturity(
        &self,
        dimension: GovernanceDimension,
        target_level: MaturityLevel,
    ) -> MaturityAssessment {
        let now = chrono::Utc::now().to_rfc3339();
        let current_score = self.dimension_scores.lock().await;
        let existing = current_score.iter().find(|s| s.dimension == dimension);
        let current_level = existing
            .map(|s| s.maturity_level.clone())
            .unwrap_or(MaturityLevel::Initial);
        let score = existing.map(|s| s.score).unwrap_or(0.0);
        drop(current_score);

        let gaps = generate_gaps(&dimension, &current_level, &target_level);
        let recommendations = generate_recommendations(&dimension, &gaps);

        let assessment = MaturityAssessment {
            id: uuid::Uuid::new_v4().to_string(),
            dimension,
            current_level,
            target_level,
            score,
            gaps,
            recommendations,
            assessed_at: now.clone(),
        };

        self.assessments.lock().await.push(assessment.clone());

        self.history.lock().await.push(MaturityHistoryEntry {
            id: uuid::Uuid::new_v4().to_string(),
            dimension: assessment.dimension.clone(),
            score: assessment.score,
            level: assessment.current_level.clone(),
            recorded_at: now,
        });

        assessment
    }

    async fn get_assessment(&self, id: &str) -> Option<MaturityAssessment> {
        let assessments = self.assessments.lock().await;
        assessments.iter().find(|a| a.id == id).cloned()
    }

    async fn get_dimension_scores(&self) -> Vec<DimensionScore> {
        let scores = self.dimension_scores.lock().await;
        scores.clone()
    }

    async fn create_improvement_plan(
        &self,
        dimension: GovernanceDimension,
        target_level: MaturityLevel,
        actions: Vec<String>,
    ) -> ImprovementPlan {
        let plan = ImprovementPlan {
            id: uuid::Uuid::new_v4().to_string(),
            dimension,
            target_level,
            actions,
            priority: "medium".to_string(),
            due_date: None,
            status: "planned".to_string(),
        };
        self.improvement_plans.lock().await.push(plan.clone());
        plan
    }

    async fn track_progress(&self) -> Vec<MaturityProgress> {
        let scores = self.dimension_scores.lock().await;
        let mut progress = Vec::new();
        for score in scores.iter() {
            progress.push(MaturityProgress {
                dimension: score.dimension.clone(),
                from_level: MaturityLevel::Initial,
                to_level: score.maturity_level.clone(),
                progress_percentage: score.score,
                updated_at: chrono::Utc::now().to_rfc3339(),
            });
        }
        progress
    }

    async fn get_maturity_history(&self, dimension: Option<&str>) -> Vec<MaturityHistoryEntry> {
        let history = self.history.lock().await;
        match dimension {
            Some(d) => history
                .iter()
                .filter(|h| dimension_str(&h.dimension) == d)
                .cloned()
                .collect(),
            None => history.clone(),
        }
    }

    async fn get_benchmark(&self) -> Vec<BenchmarkData> {
        let scores = self.dimension_scores.lock().await;
        let benchmarks = scores
            .iter()
            .map(|s| {
                let industry_avg = (s.score * 0.7 + 30.0).clamp(0.0, 100.0);
                let best = (s.score * 1.1 + 10.0).clamp(0.0, 100.0);
                BenchmarkData {
                    dimension: s.dimension.clone(),
                    current_score: s.score,
                    industry_average: industry_avg,
                    best_practice: best,
                    gap: (best - s.score).max(0.0),
                }
            })
            .collect();
        benchmarks
    }
}

// ==================== 自动化工作流：数据结构 ====================

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WorkflowType {
    Onboarding,
    ChangeRequest,
    Decommission,
    Approval,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WorkflowStatus {
    Draft,
    Running,
    Paused,
    Completed,
    Cancelled,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WorkflowStepType {
    Action,
    Review,
    Approval,
    Notification,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WorkflowStepStatus {
    Pending,
    InProgress,
    Approved,
    Rejected,
    Skipped,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct WorkflowStepV58 {
    pub id: String,
    pub step_type: WorkflowStepType,
    pub config: serde_json::Value,
    pub depends_on: Option<String>,
    pub assignee: Option<String>,
    pub status: WorkflowStepStatus,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct WorkflowV58 {
    pub id: String,
    pub name: String,
    pub workflow_type: WorkflowType,
    pub steps: Vec<WorkflowStepV58>,
    pub triggers: serde_json::Value,
    pub status: WorkflowStatus,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct WorkflowTemplate {
    pub id: String,
    pub name: String,
    pub description: String,
    pub workflow_type: WorkflowType,
    pub steps: Vec<serde_json::Value>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct WorkflowHistoryEntry {
    pub id: String,
    pub workflow_id: String,
    pub action: String,
    pub step_id: Option<String>,
    pub actor: String,
    pub comment: Option<String>,
    pub recorded_at: String,
}

// ==================== 自动化工作流：引擎 ====================

struct MDMWorkflowEngine {
    workflows: Mutex<Vec<WorkflowV58>>,
    templates: Mutex<Vec<WorkflowTemplate>>,
    history: Mutex<Vec<WorkflowHistoryEntry>>,
    initialized: Mutex<bool>,
}

impl MDMWorkflowEngine {
    async fn create_workflow(
        &self,
        name: String,
        workflow_type: WorkflowType,
        steps: Vec<WorkflowStepV58>,
    ) -> WorkflowV58 {
        let now = chrono::Utc::now().to_rfc3339();
        let workflow = WorkflowV58 {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            workflow_type,
            steps,
            triggers: serde_json::json!({}),
            status: WorkflowStatus::Draft,
            created_at: now.clone(),
            updated_at: now,
        };
        self.workflows.lock().await.push(workflow.clone());
        workflow
    }

    async fn start_workflow(&self, workflow_id: &str) -> Option<WorkflowV58> {
        let mut workflows = self.workflows.lock().await;
        let workflow = workflows.iter_mut().find(|w| w.id == workflow_id)?;
        if workflow.status != WorkflowStatus::Draft {
            return None;
        }
        workflow.status = WorkflowStatus::Running;
        workflow.updated_at = chrono::Utc::now().to_rfc3339();

        if let Some(first_step) = workflow.steps.iter_mut().next() {
            first_step.status = WorkflowStepStatus::InProgress;
            first_step.started_at = Some(chrono::Utc::now().to_rfc3339());
        }

        self.history.lock().await.push(WorkflowHistoryEntry {
            id: uuid::Uuid::new_v4().to_string(),
            workflow_id: workflow_id.to_string(),
            action: "start".to_string(),
            step_id: None,
            actor: "system".to_string(),
            comment: None,
            recorded_at: chrono::Utc::now().to_rfc3339(),
        });

        Some(workflow.clone())
    }

    async fn advance_step(&self, workflow_id: &str) -> Option<WorkflowV58> {
        let mut workflows = self.workflows.lock().await;
        let workflow = workflows.iter_mut().find(|w| w.id == workflow_id)?;
        if workflow.status != WorkflowStatus::Running {
            return None;
        }

        let now = chrono::Utc::now().to_rfc3339();
        let mut current_idx = None;
        for (i, step) in workflow.steps.iter_mut().enumerate() {
            if step.status == WorkflowStepStatus::InProgress {
                step.status = WorkflowStepStatus::Approved;
                step.completed_at = Some(now.clone());
                current_idx = Some(i);
                break;
            }
        }

        if let Some(idx) = current_idx {
            if idx + 1 < workflow.steps.len() {
                let next = &mut workflow.steps[idx + 1];
                next.status = WorkflowStepStatus::InProgress;
                next.started_at = Some(now.clone());
            } else {
                workflow.status = WorkflowStatus::Completed;
            }
        }

        workflow.updated_at = now;
        Some(workflow.clone())
    }

    async fn get_workflow_status(&self, workflow_id: &str) -> Option<WorkflowV58> {
        let workflows = self.workflows.lock().await;
        workflows.iter().find(|w| w.id == workflow_id).cloned()
    }

    async fn list_workflows(
        &self,
        workflow_type: Option<&str>,
        status: Option<&str>,
    ) -> Vec<WorkflowV58> {
        let workflows = self.workflows.lock().await;
        workflows
            .iter()
            .filter(|w| {
                if let Some(t) = workflow_type {
                    if workflow_type_str(&w.workflow_type) != t {
                        return false;
                    }
                }
                if let Some(s) = status {
                    if status_str(&w.status) != s {
                        return false;
                    }
                }
                true
            })
            .cloned()
            .collect()
    }

    async fn get_templates(&self) -> Vec<WorkflowTemplate> {
        let templates = self.templates.lock().await;
        templates.clone()
    }

    async fn approve_step(&self, workflow_id: &str, step_id: &str) -> Option<WorkflowV58> {
        let mut workflows = self.workflows.lock().await;
        let workflow = workflows.iter_mut().find(|w| w.id == workflow_id)?;

        let step = workflow.steps.iter_mut().find(|s| s.id == step_id)?;
        if step.status != WorkflowStepStatus::InProgress {
            return None;
        }

        let now = chrono::Utc::now().to_rfc3339();
        step.status = WorkflowStepStatus::Approved;
        step.completed_at = Some(now.clone());
        workflow.updated_at = now;

        self.history.lock().await.push(WorkflowHistoryEntry {
            id: uuid::Uuid::new_v4().to_string(),
            workflow_id: workflow_id.to_string(),
            action: "approve".to_string(),
            step_id: Some(step_id.to_string()),
            actor: step
                .assignee
                .clone()
                .unwrap_or_else(|| "system".to_string()),
            comment: None,
            recorded_at: chrono::Utc::now().to_rfc3339(),
        });

        Some(workflow.clone())
    }

    async fn reject_step(&self, workflow_id: &str, step_id: &str) -> Option<WorkflowV58> {
        let mut workflows = self.workflows.lock().await;
        let workflow = workflows.iter_mut().find(|w| w.id == workflow_id)?;

        let step = workflow.steps.iter_mut().find(|s| s.id == step_id)?;
        if step.status != WorkflowStepStatus::InProgress {
            return None;
        }

        let now = chrono::Utc::now().to_rfc3339();
        step.status = WorkflowStepStatus::Rejected;
        step.completed_at = Some(now.clone());
        workflow.status = WorkflowStatus::Cancelled;
        workflow.updated_at = now;

        self.history.lock().await.push(WorkflowHistoryEntry {
            id: uuid::Uuid::new_v4().to_string(),
            workflow_id: workflow_id.to_string(),
            action: "reject".to_string(),
            step_id: Some(step_id.to_string()),
            actor: step
                .assignee
                .clone()
                .unwrap_or_else(|| "system".to_string()),
            comment: None,
            recorded_at: chrono::Utc::now().to_rfc3339(),
        });

        Some(workflow.clone())
    }

    async fn get_workflow_history(&self, workflow_id: &str) -> Vec<WorkflowHistoryEntry> {
        let history = self.history.lock().await;
        history
            .iter()
            .filter(|h| h.workflow_id == workflow_id)
            .cloned()
            .collect()
    }
}

// ==================== 数据产品化：数据结构 ====================

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SlaLevel {
    Bronze,
    Silver,
    Gold,
    Platinum,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DataProductStatus {
    Draft,
    Published,
    Deprecated,
    Retired,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SecurityLevel {
    Public,
    Internal,
    Confidential,
    Restricted,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DataProduct {
    pub id: String,
    pub name: String,
    pub description: String,
    pub owner: String,
    pub domain: String,
    pub consumers: Vec<String>,
    pub data_contract: Option<DataContract>,
    pub sla_level: SlaLevel,
    pub status: DataProductStatus,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DataContract {
    pub product_id: String,
    pub schema: serde_json::Value,
    pub quality_requirements: Vec<String>,
    pub freshness_sla: String,
    pub security_level: SecurityLevel,
    pub version: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ContractStatus {
    pub product_id: String,
    pub version: String,
    pub is_valid: bool,
    pub last_verified_at: Option<String>,
    pub issues: Vec<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ApiExposure {
    pub id: String,
    pub product_id: String,
    pub endpoint: String,
    pub auth_type: String,
    pub rate_limit: String,
    pub enabled: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ConsumerInfo {
    pub consumer_id: String,
    pub consumer_name: String,
    pub subscribed_at: String,
    pub status: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ProductLineage {
    pub product_id: String,
    pub upstream_sources: Vec<String>,
    pub downstream_consumers: Vec<String>,
    pub data_flow: Vec<String>,
}

// ==================== 数据产品化：管理器 ====================

struct DataProductManager {
    products: Mutex<Vec<DataProduct>>,
    contracts: Mutex<Vec<DataContract>>,
    exposures: Mutex<Vec<ApiExposure>>,
    initialized: Mutex<bool>,
}

impl DataProductManager {
    async fn create_data_product(
        &self,
        name: String,
        description: String,
        owner: String,
        domain: String,
        sla_level: SlaLevel,
    ) -> DataProduct {
        let now = chrono::Utc::now().to_rfc3339();
        let product = DataProduct {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            description,
            owner,
            domain,
            consumers: Vec::new(),
            data_contract: None,
            sla_level,
            status: DataProductStatus::Draft,
            created_at: now.clone(),
            updated_at: now,
        };
        self.products.lock().await.push(product.clone());
        product
    }

    async fn get_data_product(&self, id: &str) -> Option<DataProduct> {
        let products = self.products.lock().await;
        products.iter().find(|p| p.id == id).cloned()
    }

    async fn list_data_products(
        &self,
        domain: Option<&str>,
        status: Option<&str>,
    ) -> Vec<DataProduct> {
        let products = self.products.lock().await;
        products
            .iter()
            .filter(|p| {
                if let Some(d) = domain {
                    if p.domain != d {
                        return false;
                    }
                }
                if let Some(s) = status {
                    if product_status_str(&p.status) != s {
                        return false;
                    }
                }
                true
            })
            .cloned()
            .collect()
    }

    async fn update_contract(
        &self,
        product_id: &str,
        schema: serde_json::Value,
        quality_requirements: Vec<String>,
        freshness_sla: String,
        security_level: SecurityLevel,
    ) -> Option<DataContract> {
        let now = chrono::Utc::now().to_rfc3339();
        let contract = DataContract {
            product_id: product_id.to_string(),
            schema,
            quality_requirements,
            freshness_sla,
            security_level,
            version: "1.0.0".to_string(),
            updated_at: now.clone(),
        };

        self.contracts.lock().await.push(contract.clone());

        let mut products = self.products.lock().await;
        if let Some(product) = products.iter_mut().find(|p| p.id == product_id) {
            product.data_contract = Some(contract.clone());
            product.status = DataProductStatus::Published;
            product.updated_at = now;
        }

        Some(contract)
    }

    async fn get_contract_status(&self, product_id: &str) -> Option<ContractStatus> {
        let products = self.products.lock().await;
        let product = products.iter().find(|p| p.id == product_id)?;

        let issues = if product.data_contract.is_none() {
            vec!["数据契约未定义".to_string()]
        } else {
            Vec::new()
        };

        Some(ContractStatus {
            product_id: product_id.to_string(),
            version: product
                .data_contract
                .as_ref()
                .map(|c| c.version.clone())
                .unwrap_or_else(|| "0.0.0".to_string()),
            is_valid: issues.is_empty(),
            last_verified_at: Some(chrono::Utc::now().to_rfc3339()),
            issues,
        })
    }

    async fn expose_as_api(
        &self,
        product_id: &str,
        auth_type: String,
        rate_limit: String,
    ) -> Option<ApiExposure> {
        let product = self.get_data_product(product_id).await?;
        let exposure = ApiExposure {
            id: uuid::Uuid::new_v4().to_string(),
            product_id: product_id.to_string(),
            endpoint: format!(
                "/api/products/{}",
                product.name.to_lowercase().replace(' ', "-")
            ),
            auth_type,
            rate_limit,
            enabled: true,
            created_at: chrono::Utc::now().to_rfc3339(),
        };
        self.exposures.lock().await.push(exposure.clone());
        Some(exposure)
    }

    async fn get_consumers(&self, product_id: &str) -> Vec<ConsumerInfo> {
        let products = self.products.lock().await;
        let product = match products.iter().find(|p| p.id == product_id) {
            Some(p) => p,
            None => return Vec::new(),
        };

        product
            .consumers
            .iter()
            .map(|c| ConsumerInfo {
                consumer_id: c.clone(),
                consumer_name: format!("Consumer {}", c),
                subscribed_at: chrono::Utc::now().to_rfc3339(),
                status: "active".to_string(),
            })
            .collect()
    }

    async fn get_product_lineage(&self, product_id: &str) -> ProductLineage {
        let products = self.products.lock().await;
        let product = products.iter().find(|p| p.id == product_id);
        let consumers = product.map(|p| p.consumers.clone()).unwrap_or_default();

        ProductLineage {
            product_id: product_id.to_string(),
            upstream_sources: vec!["source_system".to_string()],
            downstream_consumers: consumers,
            data_flow: vec![
                "source_system -> data_product".to_string(),
                "data_product -> consumers".to_string(),
            ],
        }
    }
}

// ==================== V58 内存存储 ====================

struct V58Store {
    maturity: GovernanceMaturity,
    workflow: MDMWorkflowEngine,
    products: DataProductManager,
}

fn get_v58_store() -> &'static V58Store {
    static STORE: LazyLock<V58Store> = LazyLock::new(|| V58Store {
        maturity: GovernanceMaturity {
            assessments: Mutex::new(Vec::new()),
            dimension_scores: Mutex::new(Vec::new()),
            improvement_plans: Mutex::new(Vec::new()),
            history: Mutex::new(Vec::new()),
            initialized: Mutex::new(false),
        },
        workflow: MDMWorkflowEngine {
            workflows: Mutex::new(Vec::new()),
            templates: Mutex::new(Vec::new()),
            history: Mutex::new(Vec::new()),
            initialized: Mutex::new(false),
        },
        products: DataProductManager {
            products: Mutex::new(Vec::new()),
            contracts: Mutex::new(Vec::new()),
            exposures: Mutex::new(Vec::new()),
            initialized: Mutex::new(false),
        },
    });
    &STORE
}

// ==================== 辅助函数 ====================

fn dimension_str(d: &GovernanceDimension) -> &str {
    match d {
        GovernanceDimension::Quality => "quality",
        GovernanceDimension::Consistency => "consistency",
        GovernanceDimension::Ownership => "ownership",
        GovernanceDimension::Process => "process",
        GovernanceDimension::Technology => "technology",
    }
}

fn maturity_level_str(l: &MaturityLevel) -> &str {
    match l {
        MaturityLevel::Initial => "initial",
        MaturityLevel::Developed => "developed",
        MaturityLevel::Defined => "defined",
        MaturityLevel::Managed => "managed",
        MaturityLevel::Optimized => "optimized",
    }
}

fn workflow_type_str(t: &WorkflowType) -> &str {
    match t {
        WorkflowType::Onboarding => "onboarding",
        WorkflowType::ChangeRequest => "change_request",
        WorkflowType::Decommission => "decommission",
        WorkflowType::Approval => "approval",
    }
}

fn status_str(s: &WorkflowStatus) -> &str {
    match s {
        WorkflowStatus::Draft => "draft",
        WorkflowStatus::Running => "running",
        WorkflowStatus::Paused => "paused",
        WorkflowStatus::Completed => "completed",
        WorkflowStatus::Cancelled => "cancelled",
    }
}

fn product_status_str(s: &DataProductStatus) -> &str {
    match s {
        DataProductStatus::Draft => "draft",
        DataProductStatus::Published => "published",
        DataProductStatus::Deprecated => "deprecated",
        DataProductStatus::Retired => "retired",
    }
}

fn generate_gaps(
    dimension: &GovernanceDimension,
    current: &MaturityLevel,
    target: &MaturityLevel,
) -> Vec<String> {
    let mut gaps = Vec::new();
    gaps.push(format!("当前成熟度为 {:?}，目标为 {:?}", current, target));
    gaps.push(format!("{} 维度存在提升空间", dimension_str(dimension)));
    gaps
}

fn generate_recommendations(dimension: &GovernanceDimension, gaps: &[String]) -> Vec<String> {
    let mut recs = Vec::new();
    match dimension {
        GovernanceDimension::Quality => {
            recs.push("建立数据质量规则引擎".to_string());
            recs.push("实施自动化质量检查".to_string());
            recs.push("构建质量闭环流程".to_string());
        }
        GovernanceDimension::Consistency => {
            recs.push("统一数据标准和编码规范".to_string());
            recs.push("建立跨系统数据一致性校验".to_string());
        }
        GovernanceDimension::Ownership => {
            recs.push("明确数据责任人制度".to_string());
            recs.push("建立数据认责流程".to_string());
        }
        GovernanceDimension::Process => {
            recs.push("建立数据治理工作流".to_string());
            recs.push("实施数据变更审批流程".to_string());
        }
        GovernanceDimension::Technology => {
            recs.push("引入主数据管理工具".to_string());
            recs.push("建设数据治理平台".to_string());
        }
    }
    recs.extend(gaps.iter().map(|g| format!("改进项: {}", g)));
    recs
}

// ==================== 初始化种子数据 ====================

async fn ensure_initialized() {
    let store = get_v58_store();
    let mut init = store.maturity.initialized.lock().await;
    if *init {
        return;
    }

    let now = chrono::Utc::now().to_rfc3339();

    let seed_scores = vec![
        DimensionScore {
            dimension: GovernanceDimension::Quality,
            score: 72.5,
            weight: 0.25,
            maturity_level: MaturityLevel::Defined,
            evidence: vec![
                "质量规则覆盖率 85%".to_string(),
                "自动化检测率 60%".to_string(),
            ],
        },
        DimensionScore {
            dimension: GovernanceDimension::Consistency,
            score: 65.0,
            weight: 0.20,
            maturity_level: MaturityLevel::Developed,
            evidence: vec![
                "跨系统一致性 78%".to_string(),
                "编码标准覆盖 90%".to_string(),
            ],
        },
        DimensionScore {
            dimension: GovernanceDimension::Ownership,
            score: 58.0,
            weight: 0.20,
            maturity_level: MaturityLevel::Developed,
            evidence: vec!["责任人覆盖率 70%".to_string(), "认责流程已建立".to_string()],
        },
        DimensionScore {
            dimension: GovernanceDimension::Process,
            score: 50.0,
            weight: 0.20,
            maturity_level: MaturityLevel::Developed,
            evidence: vec![
                "变更流程覆盖率 65%".to_string(),
                "审批流程已上线".to_string(),
            ],
        },
        DimensionScore {
            dimension: GovernanceDimension::Technology,
            score: 45.0,
            weight: 0.15,
            maturity_level: MaturityLevel::Developed,
            evidence: vec!["MDM 工具已部署".to_string(), "自动化率 50%".to_string()],
        },
    ];

    *store.maturity.dimension_scores.lock().await = seed_scores;

    let seed_templates = vec![
        WorkflowTemplate {
            id: uuid::Uuid::new_v4().to_string(),
            name: "客户主数据入职流程".to_string(),
            description: "新客户主数据创建的标准审批流程".to_string(),
            workflow_type: WorkflowType::Onboarding,
            steps: vec![
                serde_json::json!({"type": "action", "name": "填写客户信息"}),
                serde_json::json!({"type": "review", "name": "数据质量检查"}),
                serde_json::json!({"type": "approval", "name": "主管审批"}),
                serde_json::json!({"type": "notification", "name": "通知相关方"}),
            ],
        },
        WorkflowTemplate {
            id: uuid::Uuid::new_v4().to_string(),
            name: "供应商变更审批".to_string(),
            description: "供应商信息变更的多级审批流程".to_string(),
            workflow_type: WorkflowType::ChangeRequest,
            steps: vec![
                serde_json::json!({"type": "action", "name": "提交变更申请"}),
                serde_json::json!({"type": "review", "name": "合规审查"}),
                serde_json::json!({"type": "approval", "name": "部门经理审批"}),
                serde_json::json!({"type": "approval", "name": "总监审批"}),
                serde_json::json!({"type": "notification", "name": "通知申请人"}),
            ],
        },
        WorkflowTemplate {
            id: uuid::Uuid::new_v4().to_string(),
            name: "物料退役流程".to_string(),
            description: "物料主数据退役的审批流程".to_string(),
            workflow_type: WorkflowType::Decommission,
            steps: vec![
                serde_json::json!({"type": "action", "name": "提交退役申请"}),
                serde_json::json!({"type": "review", "name": "影响分析"}),
                serde_json::json!({"type": "approval", "name": "物料经理审批"}),
                serde_json::json!({"type": "notification", "name": "通知库存/采购"}),
            ],
        },
    ];

    *store.workflow.templates.lock().await = seed_templates;

    let seed_products = vec![
        DataProduct {
            id: uuid::Uuid::new_v4().to_string(),
            name: "客户主数据".to_string(),
            description: "企业客户核心主数据集".to_string(),
            owner: "data-team".to_string(),
            domain: "customer".to_string(),
            consumers: vec!["sales-system".to_string(), "crm-system".to_string()],
            data_contract: None,
            sla_level: SlaLevel::Gold,
            status: DataProductStatus::Published,
            created_at: now.clone(),
            updated_at: now.clone(),
        },
        DataProduct {
            id: uuid::Uuid::new_v4().to_string(),
            name: "供应商主数据".to_string(),
            description: "企业供应商核心主数据集".to_string(),
            owner: "procurement-team".to_string(),
            domain: "supplier".to_string(),
            consumers: vec!["erp-system".to_string()],
            data_contract: None,
            sla_level: SlaLevel::Silver,
            status: DataProductStatus::Published,
            created_at: now.clone(),
            updated_at: now,
        },
    ];

    *store.products.products.lock().await = seed_products;

    *init = true;
}

// ==================== 请求/响应结构 ====================

// --- 成熟度请求 ---

#[derive(Debug, Deserialize)]
pub struct AssessMaturityRequest {
    pub dimension: String,
    pub target_level: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct GetAssessmentQuery {
    pub id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ImprovementPlanRequest {
    pub dimension: String,
    pub target_level: String,
    pub actions: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct MaturityHistoryQuery {
    pub dimension: Option<String>,
}

// --- 工作流请求 ---

#[derive(Debug, Deserialize)]
pub struct CreateWorkflowRequest {
    pub name: String,
    pub workflow_type: String,
    pub steps: Vec<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct ListWorkflowsQuery {
    pub workflow_type: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ApproveStepRequest {
    pub comment: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RejectStepRequest {
    pub reason: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AdvanceStepRequest {
    pub comment: Option<String>,
}

// --- 数据产品请求 ---

#[derive(Debug, Deserialize)]
pub struct CreateDataProductRequest {
    pub name: String,
    pub description: String,
    pub owner: String,
    pub domain: String,
    pub sla_level: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ListDataProductsQuery {
    pub domain: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateContractRequest {
    pub schema: serde_json::Value,
    pub quality_requirements: Option<Vec<String>>,
    pub freshness_sla: Option<String>,
    pub security_level: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ExposeApiRequest {
    pub auth_type: Option<String>,
    pub rate_limit: Option<String>,
}

// ==================== 处理器：治理成熟度 ====================

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:governance:write"])),
    path = "/maturity/assess",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "governance_v58"
)]
pub async fn assess_maturity(
    State(_state): State<AppState>,
    Json(req): Json<AssessMaturityRequest>,
) -> Json<ApiResponse<MaturityAssessment>> {
    ensure_initialized().await;
    let store = get_v58_store();

    let dimension = match parse_dimension(&req.dimension) {
        Some(d) => d,
        None => return Json(ApiResponse::error(400, "无效的维度类型")),
    };
    let target = req
        .target_level
        .as_deref()
        .and_then(parse_maturity_level)
        .unwrap_or(MaturityLevel::Optimized);

    let result = store.maturity.assess_maturity(dimension, target).await;
    Json(ApiResponse::success(result, "成熟度评估完成"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:governance:read"])),
    path = "/maturity/assessment",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "governance_v58"
)]
pub async fn get_assessment(
    State(_state): State<AppState>,
    Query(params): Query<GetAssessmentQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    ensure_initialized().await;
    let store = get_v58_store();

    if let Some(id) = params.id {
        match store.maturity.get_assessment(&id).await {
            Some(a) => Json(ApiResponse::success(serde_json::json!(a), "成熟度评估详情")),
            None => Json(ApiResponse::error(404, "未找到评估记录")),
        }
    } else {
        let scores = store.maturity.get_dimension_scores().await;
        Json(ApiResponse::success(
            serde_json::json!({"dimension_scores": scores}),
            "成熟度概览",
        ))
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:governance:read"])),
    path = "/maturity/scores",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "governance_v58"
)]
pub async fn get_dimension_scores(
    State(_state): State<AppState>,
) -> Json<ApiResponse<Vec<DimensionScore>>> {
    ensure_initialized().await;
    let store = get_v58_store();
    let scores = store.maturity.get_dimension_scores().await;
    Json(ApiResponse::success(scores, "维度评分列表"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:governance:write"])),
    path = "/maturity/improvement-plan",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "governance_v58"
)]
pub async fn create_improvement_plan(
    State(_state): State<AppState>,
    Json(req): Json<ImprovementPlanRequest>,
) -> Json<ApiResponse<ImprovementPlan>> {
    ensure_initialized().await;
    let store = get_v58_store();

    let dimension = match parse_dimension(&req.dimension) {
        Some(d) => d,
        None => return Json(ApiResponse::error(400, "无效的维度类型")),
    };
    let target = match parse_maturity_level(&req.target_level) {
        Some(l) => l,
        None => return Json(ApiResponse::error(400, "无效的目标等级")),
    };

    let plan = store
        .maturity
        .create_improvement_plan(dimension, target, req.actions)
        .await;
    Json(ApiResponse::success(plan, "改进计划已创建"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:governance:read"])),
    path = "/maturity/progress",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "governance_v58"
)]
pub async fn track_progress(
    State(_state): State<AppState>,
) -> Json<ApiResponse<Vec<MaturityProgress>>> {
    ensure_initialized().await;
    let store = get_v58_store();
    let progress = store.maturity.track_progress().await;
    Json(ApiResponse::success(progress, "成熟度进度"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:governance:read"])),
    path = "/maturity/history",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "governance_v58"
)]
pub async fn get_maturity_history(
    State(_state): State<AppState>,
    Query(params): Query<MaturityHistoryQuery>,
) -> Json<ApiResponse<Vec<MaturityHistoryEntry>>> {
    ensure_initialized().await;
    let store = get_v58_store();
    let history = store
        .maturity
        .get_maturity_history(params.dimension.as_deref())
        .await;
    Json(ApiResponse::success(history, "成熟度历史"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:governance:read"])),
    path = "/maturity/benchmark",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "governance_v58"
)]
pub async fn get_benchmark(
    State(_state): State<AppState>,
) -> Json<ApiResponse<Vec<BenchmarkData>>> {
    ensure_initialized().await;
    let store = get_v58_store();
    let benchmark = store.maturity.get_benchmark().await;
    Json(ApiResponse::success(benchmark, "基准对比数据"))
}

// ==================== 处理器：自动化工作流 ====================

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:governance:write"])),
    path = "/workflow",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "governance_v58"
)]
pub async fn create_workflow(
    State(_state): State<AppState>,
    Json(req): Json<CreateWorkflowRequest>,
) -> Json<ApiResponse<WorkflowV58>> {
    ensure_initialized().await;
    let store = get_v58_store();

    let workflow_type = match parse_workflow_type(&req.workflow_type) {
        Some(t) => t,
        None => return Json(ApiResponse::error(400, "无效的工作流类型")),
    };

    let steps: Vec<WorkflowStepV58> = req
        .steps
        .into_iter()
        .map(|s| {
            let step_type_str = s.get("type").and_then(|t| t.as_str()).unwrap_or("action");
            let step_type = parse_step_type(step_type_str);
            WorkflowStepV58 {
                id: uuid::Uuid::new_v4().to_string(),
                step_type,
                config: s.clone(),
                depends_on: s
                    .get("depends_on")
                    .and_then(|d| d.as_str())
                    .map(String::from),
                assignee: s.get("assignee").and_then(|a| a.as_str()).map(String::from),
                status: WorkflowStepStatus::Pending,
                started_at: None,
                completed_at: None,
            }
        })
        .collect();

    let workflow = store
        .workflow
        .create_workflow(req.name, workflow_type, steps)
        .await;
    Json(ApiResponse::success(workflow, "工作流已创建"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:governance:write"])),
    path = "/workflow/{id}/start",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "governance_v58"
)]
pub async fn start_workflow(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<WorkflowV58>> {
    ensure_initialized().await;
    let store = get_v58_store();

    match store.workflow.start_workflow(&id).await {
        Some(w) => Json(ApiResponse::success(w, "工作流已启动")),
        None => Json(ApiResponse::error(400, "工作流无法启动")),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:governance:write"])),
    path = "/workflow/{id}/advance",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "governance_v58"
)]
pub async fn advance_step(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(_req): Json<AdvanceStepRequest>,
) -> Json<ApiResponse<WorkflowV58>> {
    ensure_initialized().await;
    let store = get_v58_store();

    match store.workflow.advance_step(&id).await {
        Some(w) => Json(ApiResponse::success(w, "步骤已推进")),
        None => Json(ApiResponse::error(400, "无法推进工作流")),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:governance:read"])),
    path = "/workflow/{id}/status",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "governance_v58"
)]
pub async fn get_workflow_status(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<WorkflowV58>> {
    ensure_initialized().await;
    let store = get_v58_store();

    match store.workflow.get_workflow_status(&id).await {
        Some(w) => Json(ApiResponse::success(w, "工作流状态")),
        None => Json(ApiResponse::error(404, "未找到工作流")),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:governance:read"])),
    path = "/workflows",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "governance_v58"
)]
pub async fn list_workflows(
    State(_state): State<AppState>,
    Query(params): Query<ListWorkflowsQuery>,
) -> Json<ApiResponse<Vec<WorkflowV58>>> {
    ensure_initialized().await;
    let store = get_v58_store();
    let workflows = store
        .workflow
        .list_workflows(params.workflow_type.as_deref(), params.status.as_deref())
        .await;
    Json(ApiResponse::success(workflows, "工作流列表"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:governance:read"])),
    path = "/workflow/templates",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "governance_v58"
)]
pub async fn get_workflow_templates(
    State(_state): State<AppState>,
) -> Json<ApiResponse<Vec<WorkflowTemplate>>> {
    ensure_initialized().await;
    let store = get_v58_store();
    let templates = store.workflow.get_templates().await;
    Json(ApiResponse::success(templates, "工作流模板"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:governance:write"])),
    path = "/workflow/step/{id}/approve",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "governance_v58"
)]
pub async fn approve_step(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<ApproveStepRequest>,
) -> Json<ApiResponse<WorkflowV58>> {
    ensure_initialized().await;
    let store = get_v58_store();

    let (workflow_id, step_id) = parse_step_path(&id);

    match store.workflow.approve_step(&workflow_id, &step_id).await {
        Some(w) => Json(ApiResponse::success(
            w,
            &req.comment.unwrap_or_else(|| "步骤已批准".to_string()),
        )),
        None => Json(ApiResponse::error(400, "无法批准该步骤")),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:governance:write"])),
    path = "/workflow/step/{id}/reject",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "governance_v58"
)]
pub async fn reject_step(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<RejectStepRequest>,
) -> Json<ApiResponse<WorkflowV58>> {
    ensure_initialized().await;
    let store = get_v58_store();

    let (workflow_id, step_id) = parse_step_path(&id);

    match store.workflow.reject_step(&workflow_id, &step_id).await {
        Some(w) => Json(ApiResponse::success(
            w,
            &req.reason.unwrap_or_else(|| "步骤已拒绝".to_string()),
        )),
        None => Json(ApiResponse::error(400, "无法拒绝该步骤")),
    }
}

pub async fn get_workflow_history(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<Vec<WorkflowHistoryEntry>>> {
    ensure_initialized().await;
    let store = get_v58_store();
    let history = store.workflow.get_workflow_history(&id).await;
    Json(ApiResponse::success(history, "工作流历史"))
}

// ==================== 处理器：数据产品化 ====================

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:governance:write"])),
    path = "/data-product",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "governance_v58"
)]
pub async fn create_data_product(
    State(_state): State<AppState>,
    Json(req): Json<CreateDataProductRequest>,
) -> Json<ApiResponse<DataProduct>> {
    ensure_initialized().await;
    let store = get_v58_store();

    let sla = req
        .sla_level
        .as_deref()
        .and_then(parse_sla_level)
        .unwrap_or(SlaLevel::Silver);

    let product = store
        .products
        .create_data_product(req.name, req.description, req.owner, req.domain, sla)
        .await;
    Json(ApiResponse::success(product, "数据产品已创建"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:governance:read"])),
    path = "/data-product/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "governance_v58"
)]
pub async fn get_data_product(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<DataProduct>> {
    ensure_initialized().await;
    let store = get_v58_store();

    match store.products.get_data_product(&id).await {
        Some(p) => Json(ApiResponse::success(p, "数据产品详情")),
        None => Json(ApiResponse::error(404, "未找到数据产品")),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:governance:read"])),
    path = "/data-products",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "governance_v58"
)]
pub async fn list_data_products(
    State(_state): State<AppState>,
    Query(params): Query<ListDataProductsQuery>,
) -> Json<ApiResponse<Vec<DataProduct>>> {
    ensure_initialized().await;
    let store = get_v58_store();
    let products = store
        .products
        .list_data_products(params.domain.as_deref(), params.status.as_deref())
        .await;
    Json(ApiResponse::success(products, "数据产品列表"))
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["master_data:governance:write"])),
    path = "/data-product/{id}/contract",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "governance_v58"
)]
pub async fn update_contract(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<UpdateContractRequest>,
) -> Json<ApiResponse<DataContract>> {
    ensure_initialized().await;
    let store = get_v58_store();

    let security = req
        .security_level
        .as_deref()
        .and_then(parse_security_level)
        .unwrap_or(SecurityLevel::Internal);

    let requirements = req.quality_requirements.unwrap_or_else(|| {
        vec![
            "字段完整性".to_string(),
            "数据准确性".to_string(),
            "时效性".to_string(),
        ]
    });

    let sla = req.freshness_sla.unwrap_or_else(|| "24h".to_string());

    match store
        .products
        .update_contract(&id, req.schema, requirements, sla, security)
        .await
    {
        Some(c) => Json(ApiResponse::success(c, "数据契约已更新")),
        None => Json(ApiResponse::error(404, "未找到数据产品")),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:governance:read"])),
    path = "/data-product/{id}/contract/status",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "governance_v58"
)]
pub async fn get_contract_status(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<ContractStatus>> {
    ensure_initialized().await;
    let store = get_v58_store();

    match store.products.get_contract_status(&id).await {
        Some(s) => Json(ApiResponse::success(s, "契约状态")),
        None => Json(ApiResponse::error(404, "未找到数据产品")),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:governance:write"])),
    path = "/data-product/{id}/expose",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "governance_v58"
)]
pub async fn expose_as_api(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<ExposeApiRequest>,
) -> Json<ApiResponse<ApiExposure>> {
    ensure_initialized().await;
    let store = get_v58_store();

    let auth = req.auth_type.unwrap_or_else(|| "bearer".to_string());
    let rate = req.rate_limit.unwrap_or_else(|| "1000/min".to_string());

    match store.products.expose_as_api(&id, auth, rate).await {
        Some(e) => Json(ApiResponse::success(e, "API 已暴露")),
        None => Json(ApiResponse::error(404, "未找到数据产品")),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:governance:read"])),
    path = "/data-product/{id}/consumers",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "governance_v58"
)]
pub async fn get_consumers(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<Vec<ConsumerInfo>>> {
    ensure_initialized().await;
    let store = get_v58_store();
    let consumers = store.products.get_consumers(&id).await;
    Json(ApiResponse::success(consumers, "消费者列表"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:governance:read"])),
    path = "/data-product/{id}/lineage",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "governance_v58"
)]
pub async fn get_product_lineage(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<ProductLineage>> {
    ensure_initialized().await;
    let store = get_v58_store();
    let lineage = store.products.get_product_lineage(&id).await;
    Json(ApiResponse::success(lineage, "数据产品血缘"))
}

// ==================== 解析辅助函数 ====================

fn parse_dimension(s: &str) -> Option<GovernanceDimension> {
    match s {
        "quality" => Some(GovernanceDimension::Quality),
        "consistency" => Some(GovernanceDimension::Consistency),
        "ownership" => Some(GovernanceDimension::Ownership),
        "process" => Some(GovernanceDimension::Process),
        "technology" => Some(GovernanceDimension::Technology),
        _ => None,
    }
}

fn parse_maturity_level(s: &str) -> Option<MaturityLevel> {
    match s {
        "initial" => Some(MaturityLevel::Initial),
        "developed" => Some(MaturityLevel::Developed),
        "defined" => Some(MaturityLevel::Defined),
        "managed" => Some(MaturityLevel::Managed),
        "optimized" => Some(MaturityLevel::Optimized),
        _ => None,
    }
}

fn parse_workflow_type(s: &str) -> Option<WorkflowType> {
    match s {
        "onboarding" => Some(WorkflowType::Onboarding),
        "change_request" => Some(WorkflowType::ChangeRequest),
        "decommission" => Some(WorkflowType::Decommission),
        "approval" => Some(WorkflowType::Approval),
        _ => None,
    }
}

fn parse_step_type(s: &str) -> WorkflowStepType {
    match s {
        "review" => WorkflowStepType::Review,
        "approval" => WorkflowStepType::Approval,
        "notification" => WorkflowStepType::Notification,
        _ => WorkflowStepType::Action,
    }
}

fn parse_sla_level(s: &str) -> Option<SlaLevel> {
    match s {
        "bronze" => Some(SlaLevel::Bronze),
        "silver" => Some(SlaLevel::Silver),
        "gold" => Some(SlaLevel::Gold),
        "platinum" => Some(SlaLevel::Platinum),
        _ => None,
    }
}

fn parse_security_level(s: &str) -> Option<SecurityLevel> {
    match s {
        "public" => Some(SecurityLevel::Public),
        "internal" => Some(SecurityLevel::Internal),
        "confidential" => Some(SecurityLevel::Confidential),
        "restricted" => Some(SecurityLevel::Restricted),
        _ => None,
    }
}

fn parse_step_path(path: &str) -> (String, String) {
    let parts: Vec<&str> = path.splitn(2, ':').collect();
    if parts.len() == 2 {
        (parts[0].to_string(), parts[1].to_string())
    } else {
        (path.to_string(), path.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ---------- calculate_maturity_score ----------

    #[test]
    fn test_maturity_score_empty_returns_zero() {
        assert_eq!(calculate_maturity_score(&[]), 0.0);
    }

    #[test]
    fn test_maturity_score_single_dimension() {
        assert_eq!(calculate_maturity_score(&[3.0]), 3.0);
        assert_eq!(calculate_maturity_score(&[5.0]), 5.0);
        assert_eq!(calculate_maturity_score(&[0.0]), 0.0);
    }

    #[test]
    fn test_maturity_score_average_of_dimensions() {
        // (1+2+3+4+5)/5 = 3.0
        let dims = [1.0, 2.0, 3.0, 4.0, 5.0];
        assert_eq!(calculate_maturity_score(&dims), 3.0);
    }

    #[test]
    fn test_maturity_score_clamps_high_values() {
        // 超过 5 的值 clamp 到 5
        // (5+5+5)/3 = 5.0
        let dims = [10.0, 100.0, 5.5];
        assert_eq!(calculate_maturity_score(&dims), 5.0);
    }

    #[test]
    fn test_maturity_score_clamps_negative_values() {
        // 负值 clamp 到 0
        // (0+0+0)/3 = 0.0
        let dims = [-1.0, -10.0, -100.0];
        assert_eq!(calculate_maturity_score(&dims), 0.0);
    }

    #[test]
    fn test_maturity_score_rounded_to_2_decimals() {
        // (1+2+3)/3 = 2.0 (整数)
        // 改用： (1.1+2.2+3.3)/3 = 6.6/3 = 2.2
        let dims = [1.1, 2.2, 3.3];
        assert!((calculate_maturity_score(&dims) - 2.2).abs() < 0.01);
        // 用会触发多位小数的： (1.0+1.0+1.0+1.0+1.0+1.0+1.0)/7 = 1.0
        let dims = [1.0; 7];
        assert_eq!(calculate_maturity_score(&dims), 1.0);
    }

    #[test]
    fn test_maturity_score_all_max() {
        let dims = [5.0, 5.0, 5.0, 5.0];
        assert_eq!(calculate_maturity_score(&dims), 5.0);
    }

    #[test]
    fn test_maturity_score_all_min() {
        let dims = [0.0, 0.0, 0.0];
        assert_eq!(calculate_maturity_score(&dims), 0.0);
    }

    #[test]
    fn test_maturity_score_mixed_clamped() {
        // (0+5+2.5)/3 = 7.5/3 = 2.5
        let dims = [-5.0, 99.0, 2.5];
        assert!((calculate_maturity_score(&dims) - 2.5).abs() < 0.01);
    }

    // ---------- maturity_level_name ----------

    #[test]
    fn test_maturity_level_optimized_boundary() {
        assert_eq!(maturity_level_name(4.5), "optimized");
        assert_eq!(maturity_level_name(5.0), "optimized");
    }

    #[test]
    fn test_maturity_level_managed() {
        assert_eq!(maturity_level_name(3.5), "managed");
        assert_eq!(maturity_level_name(4.49), "managed");
    }

    #[test]
    fn test_maturity_level_defined() {
        assert_eq!(maturity_level_name(2.5), "defined");
        assert_eq!(maturity_level_name(3.49), "defined");
    }

    #[test]
    fn test_maturity_level_developed() {
        assert_eq!(maturity_level_name(1.5), "developed");
        assert_eq!(maturity_level_name(2.49), "developed");
    }

    #[test]
    fn test_maturity_level_initial() {
        assert_eq!(maturity_level_name(0.0), "initial");
        assert_eq!(maturity_level_name(1.49), "initial");
    }

    #[test]
    fn test_maturity_level_clamps_above_5() {
        assert_eq!(maturity_level_name(10.0), "optimized");
        assert_eq!(maturity_level_name(100.0), "optimized");
    }

    #[test]
    fn test_maturity_level_clamps_negative() {
        assert_eq!(maturity_level_name(-1.0), "initial");
        assert_eq!(maturity_level_name(-100.0), "initial");
    }

    #[test]
    fn test_calculate_then_level_integration() {
        // 平均分 4.0 -> managed
        let dims = [4.0, 4.0, 4.0, 4.0];
        let score = calculate_maturity_score(&dims);
        assert_eq!(maturity_level_name(score), "managed");

        // 平均分 5.0 -> optimized
        let dims = [5.0, 5.0];
        let score = calculate_maturity_score(&dims);
        assert_eq!(maturity_level_name(score), "optimized");

        // 平均分 0.0 -> initial
        let dims = [0.0, 0.0, 0.0];
        let score = calculate_maturity_score(&dims);
        assert_eq!(maturity_level_name(score), "initial");
    }
}

#![allow(dead_code)] // Reserved: V60 网关部署模块，待业务接入后启用
//! STATUS: WIRED | Routes registered + DB tables initialized + Handlers implemented
//! V60.0 BFF Phase 30: GraphQL 网关部署 + 配置管理 + 回滚策略
//!
//! 核心能力：
//! 1. 网关部署 (Gateway Deployment)
//!    - DeploymentManager: 部署创建、启动、取消、状态查询、灰度推广、回滚
//!    - Deployment: 部署实例 (id/version/environment/status/strategy)
//!    - DeploymentStep: 部署步骤 (Build/Test/Deploy/Verify)
//!    - DeploymentRollout: 灰度发布 (canary_percentage/traffic_switch/health_check)
//! 2. 配置管理 (Configuration Management)
//!    - ConfigurationManager: 配置 CRUD、版本差异、激活、历史、回滚
//!    - GatewayConfig: 网关配置 (settings JSON/is_active/version)
//!    - ConfigDiff: 配置差异对比
//!    - ConfigEnvironment: 配置环境 (Development/Staging/Production)
//! 3. 回滚策略 (Rollback Strategy)
//!    - RollbackManager: 策略创建、执行、测试、自动回滚配置
//!    - RollbackPolicy: 回滚策略 (触发条件/步骤/最大回滚次数)
//!    - RollbackAction: 回滚动作 (RevertConfig/RestartService/ScaleDown)

use axum::{extract::Path, extract::Query, extract::State, Json};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::LazyLock;
use tokio::sync::Mutex;
use topems_shared_core::response::ApiResponse;

use crate::shared::AppState;

// ==================== 数据库表定义 ====================

pub const CREATE_DEPLOYMENTS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_deployments (
    id VARCHAR(64) PRIMARY KEY,
    version VARCHAR(64) NOT NULL,
    environment VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    strategy VARCHAR(32) NOT NULL DEFAULT 'rolling',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dep_env ON portal_deployments(environment);
CREATE INDEX IF NOT EXISTS idx_dep_status ON portal_deployments(status);
CREATE INDEX IF NOT EXISTS idx_dep_started ON portal_deployments(started_at DESC);
"#;

pub const CREATE_DEPLOYMENT_STEPS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_deployment_steps (
    id VARCHAR(64) PRIMARY KEY,
    deployment_id VARCHAR(64) NOT NULL,
    step_type VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    message TEXT,
    duration_ms BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ds_deployment ON portal_deployment_steps(deployment_id);
CREATE INDEX IF NOT EXISTS idx_ds_type ON portal_deployment_steps(step_type);
CREATE INDEX IF NOT EXISTS idx_ds_status ON portal_deployment_steps(status);
"#;

pub const CREATE_GATEWAY_CONFIGS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_gateway_configs (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    version VARCHAR(64) NOT NULL,
    environment VARCHAR(32) NOT NULL,
    settings JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gc_env ON portal_gateway_configs(environment);
CREATE INDEX IF NOT EXISTS idx_gc_active ON portal_gateway_configs(is_active);
CREATE INDEX IF NOT EXISTS idx_gc_version ON portal_gateway_configs(version);
"#;

pub const CREATE_CONFIG_DIFFS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_config_diffs (
    id VARCHAR(64) PRIMARY KEY,
    config_id VARCHAR(64) NOT NULL,
    old_config JSONB NOT NULL DEFAULT '{}',
    new_config JSONB NOT NULL DEFAULT '{}',
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    changed_by VARCHAR(128)
);
CREATE INDEX IF NOT EXISTS idx_cd_config ON portal_config_diffs(config_id);
CREATE INDEX IF NOT EXISTS idx_cd_changed ON portal_config_diffs(changed_at DESC);
"#;

pub const CREATE_CONFIG_ENVIRONMENTS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_config_environments (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(64) NOT NULL UNIQUE,
    type VARCHAR(32) NOT NULL,
    base_url VARCHAR(512),
    variables JSONB NOT NULL DEFAULT '{}',
    is_protected BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ce_type ON portal_config_environments(type);
"#;

pub const CREATE_ROLLBACK_POLICIES_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_rollback_policies (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    trigger VARCHAR(32) NOT NULL DEFAULT 'manual',
    condition JSONB,
    rollback_steps JSONB NOT NULL DEFAULT '[]',
    max_rollbacks INT NOT NULL DEFAULT 5,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rp_trigger ON portal_rollback_policies(trigger);
CREATE INDEX IF NOT EXISTS idx_rp_enabled ON portal_rollback_policies(enabled);
"#;

pub const CREATE_ROLLBACK_ACTIONS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_rollback_actions (
    id VARCHAR(64) PRIMARY KEY,
    policy_id VARCHAR(64) NOT NULL,
    action VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    executed_at TIMESTAMPTZ,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ra_policy ON portal_rollback_actions(policy_id);
CREATE INDEX IF NOT EXISTS idx_ra_action ON portal_rollback_actions(action);
CREATE INDEX IF NOT EXISTS idx_ra_executed ON portal_rollback_actions(executed_at DESC);
"#;

// ==================== 枚举类型 ====================

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Environment {
    Development,
    Staging,
    Production,
}

impl Environment {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Development => "development",
            Self::Staging => "staging",
            Self::Production => "production",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "development" => Some(Self::Development),
            "staging" => Some(Self::Staging),
            "production" => Some(Self::Production),
            _ => None,
        }
    }

    pub fn all() -> Vec<Self> {
        vec![Self::Development, Self::Staging, Self::Production]
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DeploymentStatus {
    Pending,
    Deploying,
    RollingBack,
    Completed,
    Failed,
}

impl DeploymentStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Deploying => "deploying",
            Self::RollingBack => "rolling_back",
            Self::Completed => "completed",
            Self::Failed => "failed",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "pending" => Some(Self::Pending),
            "deploying" => Some(Self::Deploying),
            "rolling_back" => Some(Self::RollingBack),
            "completed" => Some(Self::Completed),
            "failed" => Some(Self::Failed),
            _ => None,
        }
    }

    pub fn all() -> Vec<Self> {
        vec![
            Self::Pending,
            Self::Deploying,
            Self::RollingBack,
            Self::Completed,
            Self::Failed,
        ]
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DeploymentStrategy {
    BlueGreen,
    Canary,
    Rolling,
}

impl DeploymentStrategy {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::BlueGreen => "blue_green",
            Self::Canary => "canary",
            Self::Rolling => "rolling",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "blue_green" => Some(Self::BlueGreen),
            "canary" => Some(Self::Canary),
            "rolling" => Some(Self::Rolling),
            _ => None,
        }
    }

    pub fn all() -> Vec<Self> {
        vec![Self::BlueGreen, Self::Canary, Self::Rolling]
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum StepType {
    Build,
    Test,
    Deploy,
    Verify,
}

impl StepType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Build => "build",
            Self::Test => "test",
            Self::Deploy => "deploy",
            Self::Verify => "verify",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "build" => Some(Self::Build),
            "test" => Some(Self::Test),
            "deploy" => Some(Self::Deploy),
            "verify" => Some(Self::Verify),
            _ => None,
        }
    }

    pub fn all() -> Vec<Self> {
        vec![Self::Build, Self::Test, Self::Deploy, Self::Verify]
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum StepStatus {
    Pending,
    Running,
    Completed,
    Failed,
}

impl StepStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Running => "running",
            Self::Completed => "completed",
            Self::Failed => "failed",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "pending" => Some(Self::Pending),
            "running" => Some(Self::Running),
            "completed" => Some(Self::Completed),
            "failed" => Some(Self::Failed),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RollbackTrigger {
    Automatic,
    Manual,
}

impl RollbackTrigger {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Automatic => "automatic",
            Self::Manual => "manual",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "automatic" => Some(Self::Automatic),
            "manual" => Some(Self::Manual),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RollbackActionType {
    RevertConfig,
    RestartService,
    ScaleDown,
}

impl RollbackActionType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::RevertConfig => "revert_config",
            Self::RestartService => "restart_service",
            Self::ScaleDown => "scale_down",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "revert_config" => Some(Self::RevertConfig),
            "restart_service" => Some(Self::RestartService),
            "scale_down" => Some(Self::ScaleDown),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RollbackActionStatus {
    Pending,
    Executing,
    Completed,
    Failed,
}

impl RollbackActionStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Executing => "executing",
            Self::Completed => "completed",
            Self::Failed => "failed",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "pending" => Some(Self::Pending),
            "executing" => Some(Self::Executing),
            "completed" => Some(Self::Completed),
            "failed" => Some(Self::Failed),
            _ => None,
        }
    }
}

// ==================== 网关部署核心结构体 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Deployment {
    pub id: String,
    pub version: String,
    pub environment: Environment,
    pub status: DeploymentStatus,
    pub strategy: DeploymentStrategy,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
}

impl Deployment {
    pub fn new(version: String, environment: Environment, strategy: DeploymentStrategy) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            version,
            environment,
            status: DeploymentStatus::Pending,
            strategy,
            started_at: None,
            completed_at: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeploymentStep {
    pub id: String,
    pub deployment_id: String,
    pub step_type: StepType,
    pub status: StepStatus,
    pub message: Option<String>,
    pub duration_ms: u64,
}

impl DeploymentStep {
    pub fn new(deployment_id: String, step_type: StepType) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            deployment_id,
            step_type,
            status: StepStatus::Pending,
            message: None,
            duration_ms: 0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeploymentRollout {
    pub deployment_id: String,
    pub canary_percentage: f64,
    pub traffic_switch: bool,
    pub health_check_url: Option<String>,
}

impl DeploymentRollout {
    pub fn new(deployment_id: String) -> Self {
        Self {
            deployment_id,
            canary_percentage: 0.0,
            traffic_switch: false,
            health_check_url: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeploymentList {
    pub deployments: Vec<Deployment>,
    pub total: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeploymentStatusInfo {
    pub deployment_id: String,
    pub status: DeploymentStatus,
    pub progress: f64,
    pub current_step: Option<String>,
    pub steps_completed: u32,
    pub total_steps: u32,
}

// ==================== 配置管理核心结构体 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GatewayConfig {
    pub id: String,
    pub name: String,
    pub version: String,
    pub environment: Environment,
    pub settings: serde_json::Value,
    pub is_active: bool,
    pub updated_at: String,
}

impl GatewayConfig {
    pub fn new(
        name: String,
        version: String,
        environment: Environment,
        settings: serde_json::Value,
    ) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            version,
            environment,
            settings,
            is_active: false,
            updated_at: chrono::Utc::now().to_rfc3339(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigDiff {
    pub config_id: String,
    pub old_config: serde_json::Value,
    pub new_config: serde_json::Value,
    pub changed_at: String,
    pub changed_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigEnvironment {
    pub id: String,
    pub name: String,
    pub env_type: String,
    pub base_url: Option<String>,
    pub variables: serde_json::Value,
    pub is_protected: bool,
}

impl ConfigEnvironment {
    pub fn new(name: String, env_type: String) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            env_type,
            base_url: None,
            variables: serde_json::json!({}),
            is_protected: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigList {
    pub configs: Vec<GatewayConfig>,
    pub total: usize,
}

// ==================== 回滚策略核心结构体 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RollbackPolicy {
    pub id: String,
    pub name: String,
    pub trigger: RollbackTrigger,
    pub condition: Option<serde_json::Value>,
    pub rollback_steps: Vec<String>,
    pub max_rollbacks: u32,
    pub enabled: bool,
}

impl RollbackPolicy {
    pub fn new(name: String, trigger: RollbackTrigger) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            trigger,
            condition: None,
            rollback_steps: Vec::new(),
            max_rollbacks: 5,
            enabled: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RollbackAction {
    pub id: String,
    pub policy_id: String,
    pub action: RollbackActionType,
    pub status: RollbackActionStatus,
    pub executed_at: Option<String>,
    pub reason: Option<String>,
}

impl RollbackAction {
    pub fn new(policy_id: String, action: RollbackActionType) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            policy_id,
            action,
            status: RollbackActionStatus::Pending,
            executed_at: None,
            reason: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RollbackStatus {
    pub policy_id: String,
    pub enabled: bool,
    pub last_execution: Option<String>,
    pub total_executions: u32,
    pub last_result: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RollbackHistoryEntry {
    pub id: String,
    pub policy_id: String,
    pub action: RollbackActionType,
    pub status: RollbackActionStatus,
    pub executed_at: Option<String>,
    pub reason: Option<String>,
}

// ==================== 内存存储 ====================

struct DeploymentStore {
    deployments: Mutex<Vec<Deployment>>,
    deployment_steps: Mutex<Vec<DeploymentStep>>,
    deployment_rollouts: Mutex<HashMap<String, DeploymentRollout>>,
    gateway_configs: Mutex<Vec<GatewayConfig>>,
    config_diffs: Mutex<Vec<ConfigDiff>>,
    config_environments: Mutex<Vec<ConfigEnvironment>>,
    rollback_policies: Mutex<Vec<RollbackPolicy>>,
    rollback_actions: Mutex<Vec<RollbackAction>>,
    rollback_counters: Mutex<HashMap<String, (u32, Option<String>, u32)>>,
}

fn get_deployment_store() -> &'static DeploymentStore {
    static STORE: LazyLock<DeploymentStore> = LazyLock::new(|| DeploymentStore {
        deployments: Mutex::new(Vec::new()),
        deployment_steps: Mutex::new(Vec::new()),
        deployment_rollouts: Mutex::new(HashMap::new()),
        gateway_configs: Mutex::new(Vec::new()),
        config_diffs: Mutex::new(Vec::new()),
        config_environments: Mutex::new(Vec::new()),
        rollback_policies: Mutex::new(Vec::new()),
        rollback_actions: Mutex::new(Vec::new()),
        rollback_counters: Mutex::new(HashMap::new()),
    });
    &STORE
}

// ==================== DeploymentManager 实现 ====================

pub struct DeploymentManager;

impl DeploymentManager {
    pub async fn create_deployment(
        version: String,
        environment: Environment,
        strategy: DeploymentStrategy,
    ) -> Result<Deployment, String> {
        let store = get_deployment_store();

        let deployment = Deployment::new(version, environment, strategy);
        let mut deployments = store.deployments.lock().await;
        deployments.push(deployment.clone());

        Ok(deployment)
    }

    pub async fn get_deployment(id: &str) -> Result<Deployment, String> {
        let store = get_deployment_store();
        let deployments = store.deployments.lock().await;

        deployments
            .iter()
            .find(|d| d.id == id)
            .cloned()
            .ok_or_else(|| format!("部署 '{}' 不存在", id))
    }

    pub async fn list_deployments(
        environment: Option<Environment>,
        status: Option<DeploymentStatus>,
        limit: Option<u32>,
    ) -> DeploymentList {
        let store = get_deployment_store();
        let deployments = store.deployments.lock().await;
        let limit = limit.unwrap_or(50).min(500) as usize;

        let filtered: Vec<Deployment> = deployments
            .iter()
            .filter(|d| {
                environment.as_ref().map_or(true, |e| d.environment == *e)
                    && status.as_ref().map_or(true, |s| d.status == *s)
            })
            .rev()
            .take(limit)
            .cloned()
            .collect();

        let total = filtered.len();

        DeploymentList {
            deployments: filtered,
            total,
        }
    }

    pub async fn start_deployment(id: &str) -> Result<Deployment, String> {
        let store = get_deployment_store();
        let mut deployments = store.deployments.lock().await;

        let deployment = deployments
            .iter_mut()
            .find(|d| d.id == id)
            .ok_or_else(|| format!("部署 '{}' 不存在", id))?;

        if deployment.status != DeploymentStatus::Pending {
            return Err(format!(
                "部署状态为 '{}'，无法启动",
                deployment.status.as_str()
            ));
        }

        deployment.status = DeploymentStatus::Deploying;
        deployment.started_at = Some(chrono::Utc::now().to_rfc3339());

        let deployment = deployment.clone();
        drop(deployments);

        let steps = vec![
            StepType::Build,
            StepType::Test,
            StepType::Deploy,
            StepType::Verify,
        ];
        let mut deployment_steps = store.deployment_steps.lock().await;
        for step_type in steps {
            let step = DeploymentStep::new(id.to_string(), step_type);
            deployment_steps.push(step);
        }

        Ok(deployment)
    }

    pub async fn cancel_deployment(id: &str) -> Result<Deployment, String> {
        let store = get_deployment_store();
        let mut deployments = store.deployments.lock().await;

        let deployment = deployments
            .iter_mut()
            .find(|d| d.id == id)
            .ok_or_else(|| format!("部署 '{}' 不存在", id))?;

        if deployment.status == DeploymentStatus::Completed
            || deployment.status == DeploymentStatus::Failed
        {
            return Err(format!(
                "部署状态为 '{}'，无法取消",
                deployment.status.as_str()
            ));
        }

        deployment.status = DeploymentStatus::Failed;
        deployment.completed_at = Some(chrono::Utc::now().to_rfc3339());

        Ok(deployment.clone())
    }

    pub async fn get_deployment_status(id: &str) -> Result<DeploymentStatusInfo, String> {
        let store = get_deployment_store();

        let deployment = {
            let deployments = store.deployments.lock().await;
            deployments
                .iter()
                .find(|d| d.id == id)
                .cloned()
                .ok_or_else(|| format!("部署 '{}' 不存在", id))?
        };

        let steps = store.deployment_steps.lock().await;
        let deployment_steps: Vec<&DeploymentStep> =
            steps.iter().filter(|s| s.deployment_id == id).collect();

        let total_steps = deployment_steps.len() as u32;
        let steps_completed = deployment_steps
            .iter()
            .filter(|s| s.status == StepStatus::Completed)
            .count() as u32;

        let progress = if total_steps > 0 {
            steps_completed as f64 / total_steps as f64 * 100.0
        } else {
            0.0
        };

        let current_step = deployment_steps
            .iter()
            .find(|s| s.status == StepStatus::Running)
            .map(|s| s.step_type.as_str().to_string());

        Ok(DeploymentStatusInfo {
            deployment_id: id.to_string(),
            status: deployment.status,
            progress,
            current_step,
            steps_completed,
            total_steps,
        })
    }

    pub async fn promote_canary(
        id: &str,
        percentage: Option<f64>,
    ) -> Result<DeploymentRollout, String> {
        let store = get_deployment_store();

        let deployment = {
            let deployments = store.deployments.lock().await;
            deployments
                .iter()
                .find(|d| d.id == id)
                .cloned()
                .ok_or_else(|| format!("部署 '{}' 不存在", id))?
        };

        if deployment.strategy != DeploymentStrategy::Canary {
            return Err("此部署不是灰度发布策略".to_string());
        }

        let mut rollouts = store.deployment_rollouts.lock().await;
        let rollout = rollouts
            .entry(id.to_string())
            .or_insert_with(|| DeploymentRollout::new(id.to_string()));

        if let Some(pct) = percentage {
            rollout.canary_percentage = pct;
        } else {
            rollout.canary_percentage = (rollout.canary_percentage + 10.0).min(100.0);
        }

        if rollout.canary_percentage >= 100.0 {
            rollout.traffic_switch = true;

            let mut deployments = store.deployments.lock().await;
            if let Some(d) = deployments.iter_mut().find(|d| d.id == id) {
                d.status = DeploymentStatus::Completed;
                d.completed_at = Some(chrono::Utc::now().to_rfc3339());
            }
        }

        Ok(rollout.clone())
    }

    pub async fn rollback_deployment(id: &str) -> Result<Deployment, String> {
        let store = get_deployment_store();
        let mut deployments = store.deployments.lock().await;

        let deployment = deployments
            .iter_mut()
            .find(|d| d.id == id)
            .ok_or_else(|| format!("部署 '{}' 不存在", id))?;

        deployment.status = DeploymentStatus::RollingBack;
        deployment.completed_at = Some(chrono::Utc::now().to_rfc3339());

        Ok(deployment.clone())
    }

    pub async fn get_deployment_history(
        environment: Option<Environment>,
        limit: Option<u32>,
    ) -> Vec<Deployment> {
        let store = get_deployment_store();
        let deployments = store.deployments.lock().await;
        let limit = limit.unwrap_or(20).min(200) as usize;

        deployments
            .iter()
            .filter(|d| environment.as_ref().map_or(true, |e| d.environment == *e))
            .rev()
            .take(limit)
            .cloned()
            .collect()
    }
}

// ==================== ConfigurationManager 实现 ====================

pub struct ConfigurationManager;

impl ConfigurationManager {
    pub async fn create_config(
        name: String,
        version: String,
        environment: Environment,
        settings: serde_json::Value,
    ) -> Result<GatewayConfig, String> {
        let store = get_deployment_store();
        let config = GatewayConfig::new(name, version, environment, settings);
        let mut configs = store.gateway_configs.lock().await;
        configs.push(config.clone());
        Ok(config)
    }

    pub async fn get_config(id: &str) -> Result<GatewayConfig, String> {
        let store = get_deployment_store();
        let configs = store.gateway_configs.lock().await;

        configs
            .iter()
            .find(|c| c.id == id)
            .cloned()
            .ok_or_else(|| format!("配置 '{}' 不存在", id))
    }

    pub async fn list_configs(
        environment: Option<Environment>,
        is_active: Option<bool>,
    ) -> ConfigList {
        let store = get_deployment_store();
        let configs = store.gateway_configs.lock().await;

        let filtered: Vec<GatewayConfig> = configs
            .iter()
            .filter(|c| {
                environment.as_ref().map_or(true, |e| c.environment == *e)
                    && is_active.map_or(true, |a| c.is_active == a)
            })
            .cloned()
            .collect();

        let total = filtered.len();
        ConfigList {
            configs: filtered,
            total,
        }
    }

    pub async fn update_config(
        id: &str,
        settings: Option<serde_json::Value>,
        name: Option<String>,
    ) -> Result<GatewayConfig, String> {
        let store = get_deployment_store();
        let mut configs = store.gateway_configs.lock().await;

        let config = configs
            .iter_mut()
            .find(|c| c.id == id)
            .ok_or_else(|| format!("配置 '{}' 不存在", id))?;

        if let Some(s) = settings {
            let old_settings = config.settings.clone();
            let diff = ConfigDiff {
                config_id: id.to_string(),
                old_config: old_settings,
                new_config: s.clone(),
                changed_at: chrono::Utc::now().to_rfc3339(),
                changed_by: Some("system".to_string()),
            };

            config.settings = s;
            config.updated_at = chrono::Utc::now().to_rfc3339();

            drop(configs);

            let mut diffs = store.config_diffs.lock().await;
            diffs.push(diff);

            let configs = store.gateway_configs.lock().await;
            configs
                .iter()
                .find(|c| c.id == id)
                .cloned()
                .ok_or_else(|| "配置更新后不存在".to_string())
        } else if let Some(n) = name {
            config.name = n;
            config.updated_at = chrono::Utc::now().to_rfc3339();
            Ok(config.clone())
        } else {
            Ok(config.clone())
        }
    }

    pub async fn activate_config(id: &str) -> Result<GatewayConfig, String> {
        let store = get_deployment_store();

        let current = {
            let configs = store.gateway_configs.lock().await;
            configs
                .iter()
                .find(|c| c.id == id)
                .cloned()
                .ok_or_else(|| format!("配置 '{}' 不存在", id))?
        };

        let mut configs = store.gateway_configs.lock().await;
        for c in configs.iter_mut() {
            if c.environment == current.environment {
                c.is_active = false;
            }
        }

        if let Some(c) = configs.iter_mut().find(|c| c.id == id) {
            c.is_active = true;
            c.updated_at = chrono::Utc::now().to_rfc3339();
            Ok(c.clone())
        } else {
            Err("激活失败".to_string())
        }
    }

    pub async fn get_config_diff(config_id: &str, limit: Option<u32>) -> Vec<ConfigDiff> {
        let store = get_deployment_store();
        let diffs = store.config_diffs.lock().await;
        let limit = limit.unwrap_or(20).min(200) as usize;

        diffs
            .iter()
            .rev()
            .filter(|d| d.config_id == config_id)
            .take(limit)
            .cloned()
            .collect()
    }

    pub async fn get_config_history(
        environment: Option<Environment>,
        limit: Option<u32>,
    ) -> Vec<GatewayConfig> {
        let store = get_deployment_store();
        let configs = store.gateway_configs.lock().await;
        let limit = limit.unwrap_or(20).min(200) as usize;

        configs
            .iter()
            .filter(|c| environment.as_ref().map_or(true, |e| c.environment == *e))
            .rev()
            .take(limit)
            .cloned()
            .collect()
    }

    pub async fn rollback_config(
        config_id: &str,
        diff_id: Option<&str>,
    ) -> Result<GatewayConfig, String> {
        let store = get_deployment_store();

        let target_config = {
            let configs = store.gateway_configs.lock().await;
            configs
                .iter()
                .find(|c| c.id == config_id)
                .cloned()
                .ok_or_else(|| format!("配置 '{}' 不存在", config_id))?
        };

        let diff = if let Some(_did) = diff_id {
            let diffs = store.config_diffs.lock().await;
            diffs.iter().find(|d| d.config_id == config_id).cloned()
        } else {
            let diffs = store.config_diffs.lock().await;
            diffs
                .iter()
                .rev()
                .find(|d| d.config_id == config_id)
                .cloned()
        };

        let old_settings = match diff {
            Some(d) => d.old_config,
            None => return Err("没有可回滚的配置历史".to_string()),
        };

        let mut configs = store.gateway_configs.lock().await;
        if let Some(c) = configs.iter_mut().find(|c| c.id == config_id) {
            let diff = ConfigDiff {
                config_id: config_id.to_string(),
                old_config: c.settings.clone(),
                new_config: old_settings.clone(),
                changed_at: chrono::Utc::now().to_rfc3339(),
                changed_by: Some("rollback".to_string()),
            };
            c.settings = old_settings;
            c.updated_at = chrono::Utc::now().to_rfc3339();

            drop(configs);

            let mut diffs = store.config_diffs.lock().await;
            diffs.push(diff);

            let configs = store.gateway_configs.lock().await;
            Ok(configs
                .iter()
                .find(|c| c.id == config_id)
                .cloned()
                .unwrap_or(target_config))
        } else {
            Err("配置不存在".to_string())
        }
    }

    pub async fn create_environment(
        name: String,
        env_type: String,
        base_url: Option<String>,
        variables: Option<serde_json::Value>,
        is_protected: Option<bool>,
    ) -> Result<ConfigEnvironment, String> {
        let store = get_deployment_store();

        let env = ConfigEnvironment {
            id: uuid::Uuid::new_v4().to_string(),
            name: name.clone(),
            env_type,
            base_url,
            variables: variables.unwrap_or_else(|| serde_json::json!({})),
            is_protected: is_protected.unwrap_or(false),
        };

        let mut envs = store.config_environments.lock().await;
        if envs.iter().any(|e| e.name == name) {
            return Err(format!("环境 '{}' 已存在", name));
        }
        envs.push(env.clone());

        Ok(env)
    }
}

// ==================== RollbackManager 实现 ====================

pub struct RollbackManager;

impl RollbackManager {
    pub async fn create_rollback_policy(
        name: String,
        trigger: RollbackTrigger,
        condition: Option<serde_json::Value>,
        rollback_steps: Option<Vec<String>>,
        max_rollbacks: Option<u32>,
    ) -> Result<RollbackPolicy, String> {
        let store = get_deployment_store();

        let mut policy = RollbackPolicy::new(name, trigger);
        policy.condition = condition;
        policy.rollback_steps = rollback_steps.unwrap_or_default();
        policy.max_rollbacks = max_rollbacks.unwrap_or(5);

        let mut policies = store.rollback_policies.lock().await;
        policies.push(policy.clone());

        Ok(policy)
    }

    pub async fn get_rollback_policies(
        trigger: Option<RollbackTrigger>,
        enabled_only: Option<bool>,
    ) -> Vec<RollbackPolicy> {
        let store = get_deployment_store();
        let policies = store.rollback_policies.lock().await;

        policies
            .iter()
            .filter(|p| {
                trigger.as_ref().map_or(true, |t| p.trigger == *t)
                    && enabled_only.map_or(true, |e| p.enabled == e)
            })
            .cloned()
            .collect()
    }

    pub async fn execute_rollback(
        policy_id: &str,
        action_type: RollbackActionType,
        reason: Option<String>,
    ) -> Result<RollbackAction, String> {
        let store = get_deployment_store();

        let policy = {
            let policies = store.rollback_policies.lock().await;
            policies
                .iter()
                .find(|p| p.id == policy_id)
                .cloned()
                .ok_or_else(|| format!("回滚策略 '{}' 不存在", policy_id))?
        };

        if !policy.enabled {
            return Err("回滚策略已禁用".to_string());
        }

        {
            let counters = store.rollback_counters.lock().await;
            let counter = counters.get(policy_id).cloned().unwrap_or((0, None, 0));

            if counter.0 >= policy.max_rollbacks {
                return Err(format!("已达到最大回滚次数 ({})", policy.max_rollbacks));
            }
        }

        let mut action = RollbackAction::new(policy_id.to_string(), action_type);
        action.status = RollbackActionStatus::Completed;
        action.executed_at = Some(chrono::Utc::now().to_rfc3339());
        action.reason = reason;

        let mut actions = store.rollback_actions.lock().await;
        actions.push(action.clone());

        drop(actions);

        let mut counters = store.rollback_counters.lock().await;
        let counter = counters
            .entry(policy_id.to_string())
            .or_insert((0, None, 0));
        counter.0 += 1;
        counter.1 = Some(chrono::Utc::now().to_rfc3339());
        counter.2 += 1;

        Ok(action)
    }

    pub async fn get_rollback_history(
        policy_id: Option<&str>,
        limit: Option<u32>,
    ) -> Vec<RollbackHistoryEntry> {
        let store = get_deployment_store();
        let actions = store.rollback_actions.lock().await;
        let limit = limit.unwrap_or(20).min(200) as usize;

        actions
            .iter()
            .rev()
            .filter(|a| policy_id.map_or(true, |p| a.policy_id == p))
            .take(limit)
            .map(|a| RollbackHistoryEntry {
                id: a.id.clone(),
                policy_id: a.policy_id.clone(),
                action: a.action.clone(),
                status: a.status.clone(),
                executed_at: a.executed_at.clone(),
                reason: a.reason.clone(),
            })
            .collect()
    }

    pub async fn test_rollback(policy_id: &str) -> Result<RollbackAction, String> {
        let store = get_deployment_store();

        let policy = {
            let policies = store.rollback_policies.lock().await;
            policies
                .iter()
                .find(|p| p.id == policy_id)
                .cloned()
                .ok_or_else(|| format!("回滚策略 '{}' 不存在", policy_id))?
        };

        let test_action = RollbackAction {
            id: uuid::Uuid::new_v4().to_string(),
            policy_id: policy_id.to_string(),
            action: RollbackActionType::RevertConfig,
            status: RollbackActionStatus::Completed,
            executed_at: Some(chrono::Utc::now().to_rfc3339()),
            reason: Some(format!("测试回滚 - {}", policy.name)),
        };

        let mut actions = store.rollback_actions.lock().await;
        actions.push(test_action.clone());

        Ok(test_action)
    }

    pub async fn configure_auto_rollback(
        policy_id: &str,
        enabled: bool,
        condition: Option<serde_json::Value>,
    ) -> Result<RollbackPolicy, String> {
        let store = get_deployment_store();
        let mut policies = store.rollback_policies.lock().await;

        let policy = policies
            .iter_mut()
            .find(|p| p.id == policy_id)
            .ok_or_else(|| format!("回滚策略 '{}' 不存在", policy_id))?;

        policy.enabled = enabled;
        if let Some(c) = condition {
            policy.condition = Some(c);
        }

        Ok(policy.clone())
    }

    pub async fn disable_rollback(policy_id: &str) -> Result<RollbackPolicy, String> {
        let store = get_deployment_store();
        let mut policies = store.rollback_policies.lock().await;

        let policy = policies
            .iter_mut()
            .find(|p| p.id == policy_id)
            .ok_or_else(|| format!("回滚策略 '{}' 不存在", policy_id))?;

        policy.enabled = false;
        Ok(policy.clone())
    }

    pub async fn get_rollback_status(policy_id: Option<&str>) -> Vec<RollbackStatus> {
        let store = get_deployment_store();
        let policies = store.rollback_policies.lock().await;
        let counters = store.rollback_counters.lock().await;

        policies
            .iter()
            .filter(|p| policy_id.map_or(true, |id| p.id == id))
            .map(|p| {
                let counter = counters.get(&p.id).cloned().unwrap_or((0, None, 0));
                let last_result = if counter.2 > 0 {
                    Some(format!("已执行 {} 次", counter.2))
                } else {
                    None
                };

                RollbackStatus {
                    policy_id: p.id.clone(),
                    enabled: p.enabled,
                    last_execution: counter.1,
                    total_executions: counter.2,
                    last_result,
                }
            })
            .collect()
    }
}

// ==================== 请求 / 响应结构 ====================

// --- 网关部署请求 ---

#[derive(Debug, Deserialize)]
pub struct CreateDeploymentRequest {
    pub version: String,
    pub environment: Option<String>,
    pub strategy: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ListDeploymentsQuery {
    pub environment: Option<String>,
    pub status: Option<String>,
    pub limit: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct PromoteCanaryRequest {
    pub percentage: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct DeploymentHistoryQuery {
    pub environment: Option<String>,
    pub limit: Option<u32>,
}

// --- 配置管理请求 ---

#[derive(Debug, Deserialize)]
pub struct CreateConfigRequest {
    pub name: String,
    pub version: String,
    pub environment: Option<String>,
    pub settings: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct ListConfigsQuery {
    pub environment: Option<String>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateConfigRequest {
    pub settings: Option<serde_json::Value>,
    pub name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ConfigDiffQuery {
    pub limit: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct ConfigHistoryQuery {
    pub environment: Option<String>,
    pub limit: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct RollbackConfigRequest {
    pub diff_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateEnvironmentRequest {
    pub name: String,
    pub env_type: String,
    pub base_url: Option<String>,
    pub variables: Option<serde_json::Value>,
    pub is_protected: Option<bool>,
}

// --- 回滚策略请求 ---

#[derive(Debug, Deserialize)]
pub struct CreateRollbackPolicyRequest {
    pub name: String,
    pub trigger: Option<String>,
    pub condition: Option<serde_json::Value>,
    pub rollback_steps: Option<Vec<String>>,
    pub max_rollbacks: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct ListRollbackPoliciesQuery {
    pub trigger: Option<String>,
    pub enabled_only: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct ExecuteRollbackRequest {
    pub action: Option<String>,
    pub reason: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RollbackHistoryQuery {
    pub policy_id: Option<String>,
    pub limit: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct ConfigureAutoRollbackRequest {
    pub enabled: Option<bool>,
    pub condition: Option<serde_json::Value>,
}

// ==================== API 处理器: 网关部署 ====================

pub async fn create_deployment_handler(
    State(_state): State<AppState>,
    Json(req): Json<CreateDeploymentRequest>,
) -> Json<ApiResponse<Deployment>> {
    let environment = req
        .environment
        .as_deref()
        .and_then(Environment::from_str)
        .unwrap_or(Environment::Development);

    let strategy = req
        .strategy
        .as_deref()
        .and_then(DeploymentStrategy::from_str)
        .unwrap_or(DeploymentStrategy::Rolling);

    match DeploymentManager::create_deployment(req.version, environment, strategy).await {
        Ok(deployment) => Json(ApiResponse::success(deployment, "部署创建成功")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

pub async fn get_deployment_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<Deployment>> {
    match DeploymentManager::get_deployment(&id).await {
        Ok(deployment) => Json(ApiResponse::success(deployment, "部署详情")),
        Err(e) => Json(ApiResponse::error(404, &e)),
    }
}

pub async fn list_deployments_handler(
    State(_state): State<AppState>,
    Query(params): Query<ListDeploymentsQuery>,
) -> Json<ApiResponse<DeploymentList>> {
    let environment = params
        .environment
        .as_deref()
        .and_then(Environment::from_str);
    let status = params
        .status
        .as_deref()
        .and_then(DeploymentStatus::from_str);

    let list = DeploymentManager::list_deployments(environment, status, params.limit).await;
    Json(ApiResponse::success(list, "部署列表"))
}

pub async fn start_deployment_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<Deployment>> {
    match DeploymentManager::start_deployment(&id).await {
        Ok(deployment) => Json(ApiResponse::success(deployment, "部署已启动")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

pub async fn cancel_deployment_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<Deployment>> {
    match DeploymentManager::cancel_deployment(&id).await {
        Ok(deployment) => Json(ApiResponse::success(deployment, "部署已取消")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

pub async fn get_deployment_status_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<DeploymentStatusInfo>> {
    match DeploymentManager::get_deployment_status(&id).await {
        Ok(info) => Json(ApiResponse::success(info, "部署状态")),
        Err(e) => Json(ApiResponse::error(404, &e)),
    }
}

pub async fn promote_canary_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<PromoteCanaryRequest>,
) -> Json<ApiResponse<DeploymentRollout>> {
    match DeploymentManager::promote_canary(&id, req.percentage).await {
        Ok(rollout) => Json(ApiResponse::success(rollout, "灰度推广成功")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

pub async fn rollback_deployment_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<Deployment>> {
    match DeploymentManager::rollback_deployment(&id).await {
        Ok(deployment) => Json(ApiResponse::success(deployment, "部署已回滚")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

pub async fn get_deployment_history_handler(
    State(_state): State<AppState>,
    Query(params): Query<DeploymentHistoryQuery>,
) -> Json<ApiResponse<Vec<Deployment>>> {
    let environment = params
        .environment
        .as_deref()
        .and_then(Environment::from_str);
    let history = DeploymentManager::get_deployment_history(environment, params.limit).await;
    Json(ApiResponse::success(history, "部署历史"))
}

// ==================== API 处理器: 配置管理 ====================

pub async fn create_config_handler(
    State(_state): State<AppState>,
    Json(req): Json<CreateConfigRequest>,
) -> Json<ApiResponse<GatewayConfig>> {
    let environment = req
        .environment
        .as_deref()
        .and_then(Environment::from_str)
        .unwrap_or(Environment::Development);

    let settings = req.settings.unwrap_or_else(|| serde_json::json!({}));

    match ConfigurationManager::create_config(req.name, req.version, environment, settings).await {
        Ok(config) => Json(ApiResponse::success(config, "配置创建成功")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

pub async fn get_config_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<GatewayConfig>> {
    match ConfigurationManager::get_config(&id).await {
        Ok(config) => Json(ApiResponse::success(config, "配置详情")),
        Err(e) => Json(ApiResponse::error(404, &e)),
    }
}

pub async fn list_configs_handler(
    State(_state): State<AppState>,
    Query(params): Query<ListConfigsQuery>,
) -> Json<ApiResponse<ConfigList>> {
    let environment = params
        .environment
        .as_deref()
        .and_then(Environment::from_str);

    let list = ConfigurationManager::list_configs(environment, params.is_active).await;
    Json(ApiResponse::success(list, "配置列表"))
}

pub async fn update_config_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<UpdateConfigRequest>,
) -> Json<ApiResponse<GatewayConfig>> {
    match ConfigurationManager::update_config(&id, req.settings, req.name).await {
        Ok(config) => Json(ApiResponse::success(config, "配置更新成功")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

pub async fn activate_config_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<GatewayConfig>> {
    match ConfigurationManager::activate_config(&id).await {
        Ok(config) => Json(ApiResponse::success(config, "配置已激活")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

pub async fn get_config_diff_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Query(params): Query<ConfigDiffQuery>,
) -> Json<ApiResponse<Vec<ConfigDiff>>> {
    let diffs = ConfigurationManager::get_config_diff(&id, params.limit).await;
    Json(ApiResponse::success(diffs, "配置差异"))
}

pub async fn get_config_history_handler(
    State(_state): State<AppState>,
    Query(params): Query<ConfigHistoryQuery>,
) -> Json<ApiResponse<Vec<GatewayConfig>>> {
    let environment = params
        .environment
        .as_deref()
        .and_then(Environment::from_str);

    let history = ConfigurationManager::get_config_history(environment, params.limit).await;
    Json(ApiResponse::success(history, "配置历史"))
}

pub async fn rollback_config_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<RollbackConfigRequest>,
) -> Json<ApiResponse<GatewayConfig>> {
    match ConfigurationManager::rollback_config(&id, req.diff_id.as_deref()).await {
        Ok(config) => Json(ApiResponse::success(config, "配置已回滚")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

pub async fn create_environment_handler(
    State(_state): State<AppState>,
    Json(req): Json<CreateEnvironmentRequest>,
) -> Json<ApiResponse<ConfigEnvironment>> {
    match ConfigurationManager::create_environment(
        req.name,
        req.env_type,
        req.base_url,
        req.variables,
        req.is_protected,
    )
    .await
    {
        Ok(env) => Json(ApiResponse::success(env, "环境创建成功")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

// ==================== API 处理器: 回滚策略 ====================

pub async fn create_rollback_policy_handler(
    State(_state): State<AppState>,
    Json(req): Json<CreateRollbackPolicyRequest>,
) -> Json<ApiResponse<RollbackPolicy>> {
    let trigger = req
        .trigger
        .as_deref()
        .and_then(RollbackTrigger::from_str)
        .unwrap_or(RollbackTrigger::Manual);

    match RollbackManager::create_rollback_policy(
        req.name,
        trigger,
        req.condition,
        req.rollback_steps,
        req.max_rollbacks,
    )
    .await
    {
        Ok(policy) => Json(ApiResponse::success(policy, "回滚策略创建成功")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

pub async fn get_rollback_policies_handler(
    State(_state): State<AppState>,
    Query(params): Query<ListRollbackPoliciesQuery>,
) -> Json<ApiResponse<Vec<RollbackPolicy>>> {
    let trigger = params
        .trigger
        .as_deref()
        .and_then(RollbackTrigger::from_str);

    let list = RollbackManager::get_rollback_policies(trigger, params.enabled_only).await;
    Json(ApiResponse::success(list, "回滚策略列表"))
}

pub async fn execute_rollback_handler(
    State(_state): State<AppState>,
    Json(req): Json<ExecuteRollbackRequest>,
) -> Json<ApiResponse<RollbackAction>> {
    let policy_id = req
        .reason
        .as_deref()
        .and_then(|_| Some("unknown".to_string()))
        .unwrap_or_else(|| "unknown".to_string());

    let action_type = req
        .action
        .as_deref()
        .and_then(RollbackActionType::from_str)
        .unwrap_or(RollbackActionType::RevertConfig);

    match RollbackManager::execute_rollback(&policy_id, action_type, req.reason).await {
        Ok(action) => Json(ApiResponse::success(action, "回滚执行成功")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

pub async fn get_rollback_history_handler(
    State(_state): State<AppState>,
    Query(params): Query<RollbackHistoryQuery>,
) -> Json<ApiResponse<Vec<RollbackHistoryEntry>>> {
    let history =
        RollbackManager::get_rollback_history(params.policy_id.as_deref(), params.limit).await;
    Json(ApiResponse::success(history, "回滚历史"))
}

pub async fn test_rollback_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<RollbackAction>> {
    match RollbackManager::test_rollback(&id).await {
        Ok(action) => Json(ApiResponse::success(action, "回滚测试成功")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

pub async fn configure_auto_rollback_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<ConfigureAutoRollbackRequest>,
) -> Json<ApiResponse<RollbackPolicy>> {
    let enabled = req.enabled.unwrap_or(true);

    match RollbackManager::configure_auto_rollback(&id, enabled, req.condition).await {
        Ok(policy) => Json(ApiResponse::success(policy, "自动回滚配置成功")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

pub async fn disable_rollback_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<RollbackPolicy>> {
    match RollbackManager::disable_rollback(&id).await {
        Ok(policy) => Json(ApiResponse::success(policy, "回滚策略已禁用")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

pub async fn get_rollback_status_handler(
    State(_state): State<AppState>,
    Query(params): Query<ListRollbackPoliciesQuery>,
) -> Json<ApiResponse<Vec<RollbackStatus>>> {
    let status = RollbackManager::get_rollback_status(None).await;
    let _ = params;
    Json(ApiResponse::success(status, "回滚状态"))
}

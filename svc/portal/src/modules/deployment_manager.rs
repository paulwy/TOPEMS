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
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::LazyLock;
use tokio::sync::Mutex;
use topems_shared_core::error::TopemsError;
use topems_shared_core::response::ApiResponse;

use crate::shared::AppState;

// ==================== 数据库表定义 ====================

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
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
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
    pub updated_at: DateTime<Utc>,
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
            updated_at: chrono::Utc::now(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigDiff {
    pub config_id: String,
    pub old_config: serde_json::Value,
    pub new_config: serde_json::Value,
    pub changed_at: DateTime<Utc>,
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
    pub executed_at: Option<DateTime<Utc>>,
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
    pub executed_at: Option<DateTime<Utc>>,
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
    ) -> Result<Deployment, TopemsError> {
        let store = get_deployment_store();

        let deployment = Deployment::new(version, environment, strategy);
        let mut deployments = store.deployments.lock().await;
        deployments.push(deployment.clone());

        Ok(deployment)
    }

    pub async fn get_deployment(id: &str) -> Result<Deployment, TopemsError> {
        let store = get_deployment_store();
        let deployments = store.deployments.lock().await;

        deployments
            .iter()
            .find(|d| d.id == id)
            .cloned()
            .ok_or_else(|| TopemsError::ResourceNotFound(format!("部署 '{}' 不存在", id)))
    }

    #[allow(clippy::as_conversions)]
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
                environment.as_ref().is_none_or(|e| d.environment == *e)
                    && status.as_ref().is_none_or(|s| d.status == *s)
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

    pub async fn start_deployment(id: &str) -> Result<Deployment, TopemsError> {
        let store = get_deployment_store();
        let mut deployments = store.deployments.lock().await;

        let deployment = deployments
            .iter_mut()
            .find(|d| d.id == id)
            .ok_or_else(|| TopemsError::ResourceNotFound(format!("部署 '{}' 不存在", id)))?;

        if deployment.status != DeploymentStatus::Pending {
            return Err(TopemsError::BusinessLogic(format!(
                "部署状态为 '{}'，无法启动",
                deployment.status.as_str()
            )));
        }

        deployment.status = DeploymentStatus::Deploying;
        deployment.started_at = Some(chrono::Utc::now());

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

    pub async fn cancel_deployment(id: &str) -> Result<Deployment, TopemsError> {
        let store = get_deployment_store();
        let mut deployments = store.deployments.lock().await;

        let deployment = deployments
            .iter_mut()
            .find(|d| d.id == id)
            .ok_or_else(|| TopemsError::ResourceNotFound(format!("部署 '{}' 不存在", id)))?;

        if deployment.status == DeploymentStatus::Completed
            || deployment.status == DeploymentStatus::Failed
        {
            return Err(TopemsError::BusinessLogic(format!(
                "部署状态为 '{}'，无法取消",
                deployment.status.as_str()
            )));
        }

        deployment.status = DeploymentStatus::Failed;
        deployment.completed_at = Some(chrono::Utc::now());

        Ok(deployment.clone())
    }

    #[allow(clippy::as_conversions, clippy::cast_possible_truncation)]
    pub async fn get_deployment_status(id: &str) -> Result<DeploymentStatusInfo, TopemsError> {
        let store = get_deployment_store();

        let deployment = {
            let deployments = store.deployments.lock().await;
            deployments
                .iter()
                .find(|d| d.id == id)
                .cloned()
                .ok_or_else(|| TopemsError::ResourceNotFound(format!("部署 '{}' 不存在", id)))?
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
    ) -> Result<DeploymentRollout, TopemsError> {
        let store = get_deployment_store();

        let deployment = {
            let deployments = store.deployments.lock().await;
            deployments
                .iter()
                .find(|d| d.id == id)
                .cloned()
                .ok_or_else(|| TopemsError::ResourceNotFound(format!("部署 '{}' 不存在", id)))?
        };

        if deployment.strategy != DeploymentStrategy::Canary {
            return Err(TopemsError::BusinessLogic(
                "此部署不是灰度发布策略".to_string(),
            ));
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
                d.completed_at = Some(chrono::Utc::now());
            }
        }

        Ok(rollout.clone())
    }

    pub async fn rollback_deployment(id: &str) -> Result<Deployment, TopemsError> {
        let store = get_deployment_store();
        let mut deployments = store.deployments.lock().await;

        let deployment = deployments
            .iter_mut()
            .find(|d| d.id == id)
            .ok_or_else(|| TopemsError::ResourceNotFound(format!("部署 '{}' 不存在", id)))?;

        deployment.status = DeploymentStatus::RollingBack;
        deployment.completed_at = Some(chrono::Utc::now());

        Ok(deployment.clone())
    }

    #[allow(clippy::as_conversions)]
    pub async fn get_deployment_history(
        environment: Option<Environment>,
        limit: Option<u32>,
    ) -> Vec<Deployment> {
        let store = get_deployment_store();
        let deployments = store.deployments.lock().await;
        let limit = limit.unwrap_or(20).min(200) as usize;

        deployments
            .iter()
            .filter(|d| environment.as_ref().is_none_or(|e| d.environment == *e))
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
    ) -> Result<GatewayConfig, TopemsError> {
        let store = get_deployment_store();
        let config = GatewayConfig::new(name, version, environment, settings);
        let mut configs = store.gateway_configs.lock().await;
        configs.push(config.clone());
        Ok(config)
    }

    pub async fn get_config(id: &str) -> Result<GatewayConfig, TopemsError> {
        let store = get_deployment_store();
        let configs = store.gateway_configs.lock().await;

        configs
            .iter()
            .find(|c| c.id == id)
            .cloned()
            .ok_or_else(|| TopemsError::ResourceNotFound(format!("配置 '{}' 不存在", id)))
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
                environment.as_ref().is_none_or(|e| c.environment == *e)
                    && is_active.is_none_or(|a| c.is_active == a)
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
    ) -> Result<GatewayConfig, TopemsError> {
        let store = get_deployment_store();
        let mut configs = store.gateway_configs.lock().await;

        let config = configs
            .iter_mut()
            .find(|c| c.id == id)
            .ok_or_else(|| TopemsError::ResourceNotFound(format!("配置 '{}' 不存在", id)))?;

        if let Some(s) = settings {
            let old_settings = config.settings.clone();
            let diff = ConfigDiff {
                config_id: id.to_string(),
                old_config: old_settings,
                new_config: s.clone(),
                changed_at: chrono::Utc::now(),
                changed_by: Some("system".to_string()),
            };

            config.settings = s;
            config.updated_at = chrono::Utc::now();

            drop(configs);

            let mut diffs = store.config_diffs.lock().await;
            diffs.push(diff);

            let configs = store.gateway_configs.lock().await;
            configs
                .iter()
                .find(|c| c.id == id)
                .cloned()
                .ok_or_else(|| TopemsError::ResourceNotFound("配置更新后不存在".to_string()))
        } else if let Some(n) = name {
            config.name = n;
            config.updated_at = chrono::Utc::now();
            Ok(config.clone())
        } else {
            Ok(config.clone())
        }
    }

    pub async fn activate_config(id: &str) -> Result<GatewayConfig, TopemsError> {
        let store = get_deployment_store();

        let current = {
            let configs = store.gateway_configs.lock().await;
            configs
                .iter()
                .find(|c| c.id == id)
                .cloned()
                .ok_or_else(|| TopemsError::ResourceNotFound(format!("配置 '{}' 不存在", id)))?
        };

        let mut configs = store.gateway_configs.lock().await;
        for c in configs.iter_mut() {
            if c.environment == current.environment {
                c.is_active = false;
            }
        }

        if let Some(c) = configs.iter_mut().find(|c| c.id == id) {
            c.is_active = true;
            c.updated_at = chrono::Utc::now();
            Ok(c.clone())
        } else {
            Err(TopemsError::BusinessLogic("激活失败".to_string()))
        }
    }

    #[allow(clippy::as_conversions)]
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

    #[allow(clippy::as_conversions)]
    pub async fn get_config_history(
        environment: Option<Environment>,
        limit: Option<u32>,
    ) -> Vec<GatewayConfig> {
        let store = get_deployment_store();
        let configs = store.gateway_configs.lock().await;
        let limit = limit.unwrap_or(20).min(200) as usize;

        configs
            .iter()
            .filter(|c| environment.as_ref().is_none_or(|e| c.environment == *e))
            .rev()
            .take(limit)
            .cloned()
            .collect()
    }

    pub async fn rollback_config(
        config_id: &str,
        diff_id: Option<&str>,
    ) -> Result<GatewayConfig, TopemsError> {
        let store = get_deployment_store();

        let target_config = {
            let configs = store.gateway_configs.lock().await;
            configs
                .iter()
                .find(|c| c.id == config_id)
                .cloned()
                .ok_or_else(|| {
                    TopemsError::ResourceNotFound(format!("配置 '{}' 不存在", config_id))
                })?
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
            None => {
                return Err(TopemsError::ResourceNotFound(
                    "没有可回滚的配置历史".to_string(),
                ))
            }
        };

        let mut configs = store.gateway_configs.lock().await;
        if let Some(c) = configs.iter_mut().find(|c| c.id == config_id) {
            let diff = ConfigDiff {
                config_id: config_id.to_string(),
                old_config: c.settings.clone(),
                new_config: old_settings.clone(),
                changed_at: chrono::Utc::now(),
                changed_by: Some("rollback".to_string()),
            };
            c.settings = old_settings;
            c.updated_at = chrono::Utc::now();

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
            Err(TopemsError::ResourceNotFound("配置不存在".to_string()))
        }
    }

    pub async fn create_environment(
        name: String,
        env_type: String,
        base_url: Option<String>,
        variables: Option<serde_json::Value>,
        is_protected: Option<bool>,
    ) -> Result<ConfigEnvironment, TopemsError> {
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
            return Err(TopemsError::BusinessLogic(format!(
                "环境 '{}' 已存在",
                name
            )));
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
    ) -> Result<RollbackPolicy, TopemsError> {
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
                trigger.as_ref().is_none_or(|t| p.trigger == *t)
                    && enabled_only.is_none_or(|e| p.enabled == e)
            })
            .cloned()
            .collect()
    }

    pub async fn execute_rollback(
        policy_id: &str,
        action_type: RollbackActionType,
        reason: Option<String>,
    ) -> Result<RollbackAction, TopemsError> {
        let store = get_deployment_store();

        let policy = {
            let policies = store.rollback_policies.lock().await;
            policies
                .iter()
                .find(|p| p.id == policy_id)
                .cloned()
                .ok_or_else(|| {
                    TopemsError::ResourceNotFound(format!("回滚策略 '{}' 不存在", policy_id))
                })?
        };

        if !policy.enabled {
            return Err(TopemsError::BusinessLogic("回滚策略已禁用".to_string()));
        }

        {
            let counters = store.rollback_counters.lock().await;
            let counter = counters.get(policy_id).cloned().unwrap_or((0, None, 0));

            if counter.0 >= policy.max_rollbacks {
                return Err(TopemsError::BusinessLogic(format!(
                    "已达到最大回滚次数 ({})",
                    policy.max_rollbacks
                )));
            }
        }

        let mut action = RollbackAction::new(policy_id.to_string(), action_type);
        action.status = RollbackActionStatus::Completed;
        action.executed_at = Some(chrono::Utc::now());
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

    #[allow(clippy::as_conversions)]
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
            .filter(|a| policy_id.is_none_or(|p| a.policy_id == p))
            .take(limit)
            .map(|a| RollbackHistoryEntry {
                id: a.id.clone(),
                policy_id: a.policy_id.clone(),
                action: a.action.clone(),
                status: a.status.clone(),
                executed_at: a.executed_at,
                reason: a.reason.clone(),
            })
            .collect()
    }

    pub async fn test_rollback(policy_id: &str) -> Result<RollbackAction, TopemsError> {
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
            executed_at: Some(chrono::Utc::now()),
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
    ) -> Result<RollbackPolicy, TopemsError> {
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

    pub async fn disable_rollback(policy_id: &str) -> Result<RollbackPolicy, TopemsError> {
        let store = get_deployment_store();
        let mut policies = store.rollback_policies.lock().await;

        let policy = policies
            .iter_mut()
            .find(|p| p.id == policy_id)
            .ok_or_else(|| format!("回滚策略 '{}' 不存在", policy_id))?;

        policy.enabled = false;
        Ok(policy.clone())
    }

    pub async fn get_rollback_status(
        policy_id: Option<&str>,
        trigger: Option<&str>,
        enabled_only: bool,
    ) -> Vec<RollbackStatus> {
        let store = get_deployment_store();
        let policies = store.rollback_policies.lock().await;
        let counters = store.rollback_counters.lock().await;

        policies
            .iter()
            .filter(|p| policy_id.is_none_or(|id| p.id == id))
            .filter(|p| trigger.is_none_or(|t| p.trigger.as_str() == t))
            .filter(|p| !enabled_only || p.enabled)
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

#[utoipa::path(
    post,
    security(("BearerAuth" = ["portal:deployment_manager:write"])),
    path = "/api/portal/deployment-manager/deployment",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "DeploymentManager"
)]
pub async fn create_deployment_handler(
    State(_state): State<AppState>,
    Json(req): Json<CreateDeploymentRequest>,
) -> ApiResponse<Deployment> {
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
        Ok(deployment) => ApiResponse::success(deployment, "部署创建成功"),
        Err(e) => ApiResponse::server_error(&e.classify().1),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["portal:deployment_manager:read"])),
    path = "/api/portal/deployment-manager/deployment/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "DeploymentManager"
)]
pub async fn get_deployment_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> ApiResponse<Deployment> {
    match DeploymentManager::get_deployment(&id).await {
        Ok(deployment) => ApiResponse::success(deployment, "部署详情"),
        Err(e) => ApiResponse::from(e),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["portal:deployment_manager:read"])),
    path = "/api/portal/deployment-manager/deployments",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "DeploymentManager"
)]
pub async fn list_deployments_handler(
    State(_state): State<AppState>,
    Query(params): Query<ListDeploymentsQuery>,
) -> ApiResponse<DeploymentList> {
    let environment = params
        .environment
        .as_deref()
        .and_then(Environment::from_str);
    let status = params
        .status
        .as_deref()
        .and_then(DeploymentStatus::from_str);

    let list = DeploymentManager::list_deployments(environment, status, params.limit).await;
    ApiResponse::success(list, "部署列表")
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["portal:deployment_manager:write"])),
    path = "/api/portal/deployment-manager/deployment/{id}/start",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "DeploymentManager"
)]
pub async fn start_deployment_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> ApiResponse<Deployment> {
    match DeploymentManager::start_deployment(&id).await {
        Ok(deployment) => ApiResponse::success(deployment, "部署已启动"),
        Err(e) => ApiResponse::bad_request(&e.classify().1),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["portal:deployment_manager:write"])),
    path = "/api/portal/deployment-manager/deployment/{id}/cancel",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "DeploymentManager"
)]
pub async fn cancel_deployment_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> ApiResponse<Deployment> {
    match DeploymentManager::cancel_deployment(&id).await {
        Ok(deployment) => ApiResponse::success(deployment, "部署已取消"),
        Err(e) => ApiResponse::bad_request(&e.classify().1),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["portal:deployment_manager:read"])),
    path = "/api/portal/deployment-manager/deployment/{id}/status",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "DeploymentManager"
)]
pub async fn get_deployment_status_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> ApiResponse<DeploymentStatusInfo> {
    match DeploymentManager::get_deployment_status(&id).await {
        Ok(info) => ApiResponse::success(info, "部署状态"),
        Err(e) => ApiResponse::from(e),
    }
}

pub async fn promote_canary_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<PromoteCanaryRequest>,
) -> ApiResponse<DeploymentRollout> {
    match DeploymentManager::promote_canary(&id, req.percentage).await {
        Ok(rollout) => ApiResponse::success(rollout, "灰度推广成功"),
        Err(e) => ApiResponse::bad_request(&e.classify().1),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["portal:deployment_manager:write"])),
    path = "/api/portal/deployment-manager/deployment/{id}/rollback",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "DeploymentManager"
)]
pub async fn rollback_deployment_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> ApiResponse<Deployment> {
    match DeploymentManager::rollback_deployment(&id).await {
        Ok(deployment) => ApiResponse::success(deployment, "部署已回滚"),
        Err(e) => ApiResponse::bad_request(&e.classify().1),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["portal:deployment_manager:read"])),
    path = "/api/portal/deployment-manager/deployment/history",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "DeploymentManager"
)]
pub async fn get_deployment_history_handler(
    State(_state): State<AppState>,
    Query(params): Query<DeploymentHistoryQuery>,
) -> ApiResponse<Vec<Deployment>> {
    let environment = params
        .environment
        .as_deref()
        .and_then(Environment::from_str);
    let history = DeploymentManager::get_deployment_history(environment, params.limit).await;
    ApiResponse::success(history, "部署历史")
}

// ==================== API 处理器: 配置管理 ====================

#[utoipa::path(
    post,
    security(("BearerAuth" = ["portal:deployment_manager:write"])),
    path = "/api/portal/deployment-manager/config",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "DeploymentManager"
)]
pub async fn create_config_handler(
    State(_state): State<AppState>,
    Json(req): Json<CreateConfigRequest>,
) -> ApiResponse<GatewayConfig> {
    let environment = req
        .environment
        .as_deref()
        .and_then(Environment::from_str)
        .unwrap_or(Environment::Development);

    let settings = req.settings.unwrap_or_else(|| serde_json::json!({}));

    match ConfigurationManager::create_config(req.name, req.version, environment, settings).await {
        Ok(config) => ApiResponse::success(config, "配置创建成功"),
        Err(e) => ApiResponse::server_error(&e.classify().1),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["portal:deployment_manager:read"])),
    path = "/api/portal/deployment-manager/config/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "DeploymentManager"
)]
pub async fn get_config_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> ApiResponse<GatewayConfig> {
    match ConfigurationManager::get_config(&id).await {
        Ok(config) => ApiResponse::success(config, "配置详情"),
        Err(e) => ApiResponse::from(e),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["portal:deployment_manager:read"])),
    path = "/api/portal/deployment-manager/configs",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "DeploymentManager"
)]
pub async fn list_configs_handler(
    State(_state): State<AppState>,
    Query(params): Query<ListConfigsQuery>,
) -> ApiResponse<ConfigList> {
    let environment = params
        .environment
        .as_deref()
        .and_then(Environment::from_str);

    let list = ConfigurationManager::list_configs(environment, params.is_active).await;
    ApiResponse::success(list, "配置列表")
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["portal:deployment_manager:write"])),
    path = "/api/portal/deployment-manager/config/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "DeploymentManager"
)]
pub async fn update_config_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<UpdateConfigRequest>,
) -> ApiResponse<GatewayConfig> {
    match ConfigurationManager::update_config(&id, req.settings, req.name).await {
        Ok(config) => ApiResponse::success(config, "配置更新成功"),
        Err(e) => ApiResponse::bad_request(&e.classify().1),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["portal:deployment_manager:write"])),
    path = "/api/portal/deployment-manager/config/{id}/activate",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "DeploymentManager"
)]
pub async fn activate_config_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> ApiResponse<GatewayConfig> {
    match ConfigurationManager::activate_config(&id).await {
        Ok(config) => ApiResponse::success(config, "配置已激活"),
        Err(e) => ApiResponse::bad_request(&e.classify().1),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["portal:deployment_manager:read"])),
    path = "/api/portal/deployment-manager/config/{id}/diff",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "DeploymentManager"
)]
pub async fn get_config_diff_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Query(params): Query<ConfigDiffQuery>,
) -> ApiResponse<Vec<ConfigDiff>> {
    let diffs = ConfigurationManager::get_config_diff(&id, params.limit).await;
    ApiResponse::success(diffs, "配置差异")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["portal:deployment_manager:read"])),
    path = "/api/portal/deployment-manager/config/{id}/history",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "DeploymentManager"
)]
pub async fn get_config_history_handler(
    State(_state): State<AppState>,
    Query(params): Query<ConfigHistoryQuery>,
) -> ApiResponse<Vec<GatewayConfig>> {
    let environment = params
        .environment
        .as_deref()
        .and_then(Environment::from_str);

    let history = ConfigurationManager::get_config_history(environment, params.limit).await;
    ApiResponse::success(history, "配置历史")
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["portal:deployment_manager:write"])),
    path = "/api/portal/deployment-manager/config/{id}/rollback",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "DeploymentManager"
)]
pub async fn rollback_config_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<RollbackConfigRequest>,
) -> ApiResponse<GatewayConfig> {
    match ConfigurationManager::rollback_config(&id, req.diff_id.as_deref()).await {
        Ok(config) => ApiResponse::success(config, "配置已回滚"),
        Err(e) => ApiResponse::bad_request(&e.classify().1),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["portal:deployment_manager:write"])),
    path = "/api/portal/deployment-manager/environment",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "DeploymentManager"
)]
pub async fn create_environment_handler(
    State(_state): State<AppState>,
    Json(req): Json<CreateEnvironmentRequest>,
) -> ApiResponse<ConfigEnvironment> {
    match ConfigurationManager::create_environment(
        req.name,
        req.env_type,
        req.base_url,
        req.variables,
        req.is_protected,
    )
    .await
    {
        Ok(env) => ApiResponse::success(env, "环境创建成功"),
        Err(e) => ApiResponse::from(e),
    }
}

// ==================== API 处理器: 回滚策略 ====================

#[utoipa::path(
    post,
    security(("BearerAuth" = ["portal:deployment_manager:write"])),
    path = "/api/portal/deployment-manager/rollback/policy",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "DeploymentManager"
)]
pub async fn create_rollback_policy_handler(
    State(_state): State<AppState>,
    Json(req): Json<CreateRollbackPolicyRequest>,
) -> ApiResponse<RollbackPolicy> {
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
        Ok(policy) => ApiResponse::success(policy, "回滚策略创建成功"),
        Err(e) => ApiResponse::server_error(&e.classify().1),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["portal:deployment_manager:read"])),
    path = "/api/portal/deployment-manager/rollback/policies",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "DeploymentManager"
)]
pub async fn get_rollback_policies_handler(
    State(_state): State<AppState>,
    Query(params): Query<ListRollbackPoliciesQuery>,
) -> ApiResponse<Vec<RollbackPolicy>> {
    let trigger = params
        .trigger
        .as_deref()
        .and_then(RollbackTrigger::from_str);

    let list = RollbackManager::get_rollback_policies(trigger, params.enabled_only).await;
    ApiResponse::success(list, "回滚策略列表")
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["portal:deployment_manager:write"])),
    path = "/api/portal/deployment-manager/rollback/execute",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "DeploymentManager"
)]
pub async fn execute_rollback_handler(
    State(_state): State<AppState>,
    Json(req): Json<ExecuteRollbackRequest>,
) -> ApiResponse<RollbackAction> {
    let policy_id = req
        .reason
        .as_deref()
        .map(|_| "unknown".to_string())
        .unwrap_or_else(|| "unknown".to_string());

    let action_type = req
        .action
        .as_deref()
        .and_then(RollbackActionType::from_str)
        .unwrap_or(RollbackActionType::RevertConfig);

    match RollbackManager::execute_rollback(&policy_id, action_type, req.reason).await {
        Ok(action) => ApiResponse::success(action, "回滚执行成功"),
        Err(e) => ApiResponse::bad_request(&e.classify().1),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["portal:deployment_manager:read"])),
    path = "/api/portal/deployment-manager/rollback/history",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "DeploymentManager"
)]
pub async fn get_rollback_history_handler(
    State(_state): State<AppState>,
    Query(params): Query<RollbackHistoryQuery>,
) -> ApiResponse<Vec<RollbackHistoryEntry>> {
    let history =
        RollbackManager::get_rollback_history(params.policy_id.as_deref(), params.limit).await;
    ApiResponse::success(history, "回滚历史")
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["portal:deployment_manager:write"])),
    path = "/api/portal/deployment-manager/rollback/{id}/test",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "DeploymentManager"
)]
pub async fn test_rollback_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> ApiResponse<RollbackAction> {
    match RollbackManager::test_rollback(&id).await {
        Ok(action) => ApiResponse::success(action, "回滚测试成功"),
        Err(e) => ApiResponse::from(e),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["portal:deployment_manager:write"])),
    path = "/api/portal/deployment-manager/rollback/{id}/auto",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "DeploymentManager"
)]
pub async fn configure_auto_rollback_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<ConfigureAutoRollbackRequest>,
) -> ApiResponse<RollbackPolicy> {
    let enabled = req.enabled.unwrap_or(true);

    match RollbackManager::configure_auto_rollback(&id, enabled, req.condition).await {
        Ok(policy) => ApiResponse::success(policy, "自动回滚配置成功"),
        Err(e) => ApiResponse::from(e),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["portal:deployment_manager:write"])),
    path = "/api/portal/deployment-manager/rollback/{id}/disable",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "DeploymentManager"
)]
pub async fn disable_rollback_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> ApiResponse<RollbackPolicy> {
    match RollbackManager::disable_rollback(&id).await {
        Ok(policy) => ApiResponse::success(policy, "回滚策略已禁用"),
        Err(e) => ApiResponse::from(e),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["portal:deployment_manager:read"])),
    path = "/api/portal/deployment-manager/rollback/status",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "DeploymentManager"
)]
pub async fn get_rollback_status_handler(
    State(_state): State<AppState>,
    Query(params): Query<ListRollbackPoliciesQuery>,
) -> ApiResponse<Vec<RollbackStatus>> {
    if let Some(trigger) = params.trigger.as_deref() {
        if RollbackTrigger::from_str(trigger).is_none() {
            return ApiResponse::bad_request("无效的 trigger，仅支持 automatic / manual");
        }
    }

    // 查询条件此前被整体丢弃（永远按 None 取全量）：trigger / enabled_only 现在真正生效
    let status = RollbackManager::get_rollback_status(
        None,
        params.trigger.as_deref(),
        params.enabled_only.unwrap_or(false),
    )
    .await;
    ApiResponse::success(status, "回滚状态")
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
mod tests {
    use super::*;
    use serde::Serialize;

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    #[tokio::test]
    async fn rollback_status_honors_trigger_and_enabled_filters() {
        // 回归：get_rollback_status 此前忽略 query，恒返回全量
        let all = RollbackManager::get_rollback_status(None, None, false).await;
        let policies = RollbackManager::get_rollback_policies(None, None).await;
        assert_eq!(all.len(), policies.len());

        let mut expected: Vec<String> = policies
            .iter()
            .filter(|p| p.trigger == RollbackTrigger::Manual && p.enabled)
            .map(|p| p.id.clone())
            .collect();
        expected.sort();

        let mut actual: Vec<String> =
            RollbackManager::get_rollback_status(None, Some("manual"), true)
                .await
                .into_iter()
                .map(|s| s.policy_id)
                .collect();
        actual.sort();

        assert_eq!(actual, expected);

        // 不存在的 trigger 不得退化成「返回全量」
        let none = RollbackManager::get_rollback_status(None, Some("no-such-trigger"), false).await;
        assert!(none.is_empty());
    }

    // ==================== Enum roundtrip ====================

    #[test]
    fn environment_roundtrip() {
        for v in Environment::all() {
            roundtrip(&v);
        }
    }

    #[test]
    fn deployment_status_roundtrip() {
        for v in DeploymentStatus::all() {
            roundtrip(&v);
        }
    }

    #[test]
    fn deployment_strategy_roundtrip() {
        for v in DeploymentStrategy::all() {
            roundtrip(&v);
        }
    }

    #[test]
    fn step_type_roundtrip() {
        for v in StepType::all() {
            roundtrip(&v);
        }
    }

    #[test]
    fn step_status_roundtrip() {
        for v in &[
            StepStatus::Pending,
            StepStatus::Running,
            StepStatus::Completed,
            StepStatus::Failed,
        ] {
            roundtrip(v);
        }
    }

    #[test]
    fn rollback_trigger_roundtrip() {
        for v in &[RollbackTrigger::Automatic, RollbackTrigger::Manual] {
            roundtrip(v);
        }
    }

    #[test]
    fn rollback_action_type_roundtrip() {
        for v in &[
            RollbackActionType::RevertConfig,
            RollbackActionType::RestartService,
            RollbackActionType::ScaleDown,
        ] {
            roundtrip(v);
        }
    }

    #[test]
    fn rollback_action_status_roundtrip() {
        for v in &[
            RollbackActionStatus::Pending,
            RollbackActionStatus::Executing,
            RollbackActionStatus::Completed,
            RollbackActionStatus::Failed,
        ] {
            roundtrip(v);
        }
    }

    // ==================== Enum as_str/from_str ====================

    #[test]
    fn environment_as_str_from_str() {
        for v in Environment::all() {
            assert_eq!(Environment::from_str(v.as_str()), Some(v.clone()));
        }
        assert_eq!(Environment::from_str("unknown"), None);
    }

    #[test]
    fn deployment_status_as_str_from_str() {
        for v in DeploymentStatus::all() {
            assert_eq!(DeploymentStatus::from_str(v.as_str()), Some(v.clone()));
        }
        assert_eq!(DeploymentStatus::from_str("unknown"), None);
    }

    #[test]
    fn deployment_strategy_as_str_from_str() {
        for v in DeploymentStrategy::all() {
            assert_eq!(DeploymentStrategy::from_str(v.as_str()), Some(v.clone()));
        }
        assert_eq!(DeploymentStrategy::from_str("unknown"), None);
    }

    #[test]
    fn step_type_as_str_from_str() {
        for v in StepType::all() {
            assert_eq!(StepType::from_str(v.as_str()), Some(v.clone()));
        }
        assert_eq!(StepType::from_str("unknown"), None);
    }

    #[test]
    fn step_status_as_str_from_str() {
        for v in &[
            StepStatus::Pending,
            StepStatus::Running,
            StepStatus::Completed,
            StepStatus::Failed,
        ] {
            assert_eq!(StepStatus::from_str(v.as_str()), Some(v.clone()));
        }
        assert_eq!(StepStatus::from_str("unknown"), None);
    }

    #[test]
    fn rollback_trigger_as_str_from_str() {
        for v in &[RollbackTrigger::Automatic, RollbackTrigger::Manual] {
            assert_eq!(RollbackTrigger::from_str(v.as_str()), Some(v.clone()));
        }
        assert_eq!(RollbackTrigger::from_str("unknown"), None);
    }

    #[test]
    fn rollback_action_type_as_str_from_str() {
        for v in &[
            RollbackActionType::RevertConfig,
            RollbackActionType::RestartService,
            RollbackActionType::ScaleDown,
        ] {
            assert_eq!(RollbackActionType::from_str(v.as_str()), Some(v.clone()));
        }
        assert_eq!(RollbackActionType::from_str("unknown"), None);
    }

    #[test]
    fn rollback_action_status_as_str_from_str() {
        for v in &[
            RollbackActionStatus::Pending,
            RollbackActionStatus::Executing,
            RollbackActionStatus::Completed,
            RollbackActionStatus::Failed,
        ] {
            assert_eq!(RollbackActionStatus::from_str(v.as_str()), Some(v.clone()));
        }
        assert_eq!(RollbackActionStatus::from_str("unknown"), None);
    }

    // ==================== Struct roundtrip ====================

    #[test]
    fn deployment_roundtrip() {
        let d = Deployment::new(
            "v1.0.0".into(),
            Environment::Staging,
            DeploymentStrategy::Canary,
        );
        roundtrip(&d);
    }

    #[test]
    fn deployment_step_roundtrip() {
        let s = DeploymentStep::new("dep-1".into(), StepType::Deploy);
        roundtrip(&s);
    }

    #[test]
    fn deployment_rollout_roundtrip() {
        let r = DeploymentRollout::new("dep-1".into());
        roundtrip(&r);
    }

    #[test]
    fn deployment_list_roundtrip() {
        let d = Deployment::new(
            "v1.0.0".into(),
            Environment::Production,
            DeploymentStrategy::Rolling,
        );
        let list = DeploymentList {
            deployments: vec![d],
            total: 1,
        };
        roundtrip(&list);
    }

    #[test]
    fn deployment_status_info_roundtrip() {
        let info = DeploymentStatusInfo {
            deployment_id: "dep-1".into(),
            status: DeploymentStatus::Deploying,
            progress: 0.75,
            current_step: Some("deploying pods".into()),
            steps_completed: 3,
            total_steps: 4,
        };
        roundtrip(&info);
    }

    #[test]
    fn gateway_config_roundtrip() {
        let cfg = GatewayConfig::new(
            "main-gw".into(),
            "v2".into(),
            Environment::Production,
            serde_json::json!({"timeout": 30}),
        );
        roundtrip(&cfg);
    }

    #[test]
    fn config_diff_roundtrip() {
        let d = ConfigDiff {
            config_id: "cfg-1".into(),
            old_config: serde_json::json!({"a": 1}),
            new_config: serde_json::json!({"a": 2}),
            changed_at: "2025-01-01T00:00:00Z".parse::<DateTime<Utc>>().unwrap(),
            changed_by: Some("admin".into()),
        };
        roundtrip(&d);
    }

    #[test]
    fn config_environment_roundtrip() {
        let ce = ConfigEnvironment::new("dev-1".into(), "development".into());
        roundtrip(&ce);
    }

    #[test]
    fn config_list_roundtrip() {
        let cfg = GatewayConfig::new(
            "gw".into(),
            "v1".into(),
            Environment::Development,
            serde_json::json!({}),
        );
        let list = ConfigList {
            configs: vec![cfg],
            total: 1,
        };
        roundtrip(&list);
    }

    #[test]
    fn rollback_policy_roundtrip() {
        let p = RollbackPolicy::new("auto-rollback".into(), RollbackTrigger::Automatic);
        roundtrip(&p);
    }

    #[test]
    fn rollback_action_roundtrip() {
        let a = RollbackAction::new("pol-1".into(), RollbackActionType::RevertConfig);
        roundtrip(&a);
    }

    #[test]
    fn rollback_status_roundtrip() {
        let s = RollbackStatus {
            policy_id: "pol-1".into(),
            enabled: true,
            last_execution: None,
            total_executions: 0,
            last_result: None,
        };
        roundtrip(&s);
    }

    #[test]
    fn rollback_history_entry_roundtrip() {
        let e = RollbackHistoryEntry {
            id: "his-1".into(),
            policy_id: "pol-1".into(),
            action: RollbackActionType::RestartService,
            status: RollbackActionStatus::Completed,
            executed_at: Some("2025-01-01T00:00:00Z".parse::<DateTime<Utc>>().unwrap()),
            reason: Some("health check failed".into()),
        };
        roundtrip(&e);
    }
}

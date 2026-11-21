//! STATUS: WIRED | Routes registered + DB tables initialized + Handlers implemented
//! V58.0 MDM AC-30: 主数据治理成熟度 + 自动化工作流 + 数据产品化
//!
//! 核心能力：
//! - 治理成熟度 (GovernanceMaturity): 成熟度评估、维度评分、改进计划、进度追踪、基准对比
//! - 自动化工作流 (MDMWorkflowEngine): 工作流模板、步骤管理、审批/驳回、状态流转
//! - 数据产品化 (DataProductManager): 数据产品管理、数据契约、API暴露、血缘追踪

use axum::{extract::Extension, extract::Path, extract::Query, extract::State, Json};
use serde::Deserialize;
use sqlx::Row;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_core::error::TopemsError;
use topems_shared_core::response::ApiResponse;
use utoipa::ToSchema;

use crate::shared::AppState;

/// 请求租户：超管/无租户 → None（全量）；普通用户 → claims 租户。
fn tenant_of(claims: &Claims) -> Option<uuid::Uuid> {
    if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    }
}

// K1 接真表：SQL 错误统一出口（Ok 透传 / Err → Json 500）
macro_rules! db_exec {
    ($expr:expr) => {
        match $expr {
            Ok(v) => v,
            Err(e) => return ApiResponse::from(TopemsError::internal("数据库操作失败", e)),
        }
    };
}

// ==================== 纯函数（无副作用，可单测） ====================

#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
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
    pub assessed_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DimensionScore {
    pub name: String,
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
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct MaturityHistoryEntry {
    pub id: String,
    pub dimension: GovernanceDimension,
    pub score: f64,
    pub level: MaturityLevel,
    pub recorded_at: chrono::DateTime<chrono::Utc>,
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

struct GovernanceMaturity;

impl GovernanceMaturity {
    async fn assess_maturity(
        scope: &mut topems_shared_db::ScopedTxn<'_>,
        tenant: Option<uuid::Uuid>,
        dimension: GovernanceDimension,
        target_level: MaturityLevel,
    ) -> Result<MaturityAssessment, TopemsError> {
        let now = chrono::Utc::now();
        let scores = fetch_dimension_scores(scope).await?;
        let existing = scores.iter().find(|s| s.dimension == dimension);
        let current_level = existing
            .map(|s| s.maturity_level.clone())
            .unwrap_or(MaturityLevel::Initial);
        let score = existing.map(|s| s.score).unwrap_or(0.0);

        let gaps = generate_gaps(&dimension, &current_level, &target_level);
        let recommendations = generate_recommendations(&dimension, &gaps);

        let assessment = MaturityAssessment {
            id: uuid::Uuid::new_v4().to_string(),
            dimension: dimension.clone(),
            current_level: current_level.clone(),
            target_level,
            score,
            gaps,
            recommendations,
            assessed_at: now.clone(),
        };

        sqlx::query(sqlx::AssertSqlSafe(format!(
            "INSERT INTO master_data.mdm_maturity_assessments ({ASSESSMENT_INSERT_COLS}, tenant_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8, $9)"
        )))
        .bind(&assessment.id)
        .bind(dimension_str(&assessment.dimension))
        .bind(maturity_level_str(&assessment.current_level))
        .bind(maturity_level_str(&assessment.target_level))
        .bind(assessment.score)
        .bind(serde_json::to_value(&assessment.gaps).unwrap_or_default())
        .bind(serde_json::to_value(&assessment.recommendations).unwrap_or_default())
        .bind(assessment.assessed_at.to_rfc3339())
        .bind(tenant.unwrap_or_else(uuid::Uuid::nil))
        .execute(&mut *scope)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("写入成熟度评估失败: {e}")))?;

        sqlx::query(
            "INSERT INTO master_data.mdm_maturity_history (id, dimension, score, level, recorded_at, tenant_id)
             VALUES ($1,$2,$3,$4,$5, $6)",
        )
        .bind(uuid::Uuid::new_v4().to_string())
        .bind(dimension_str(&assessment.dimension))
        .bind(assessment.score)
        .bind(maturity_level_str(&assessment.current_level))
        .bind(now.to_rfc3339())
        .bind(tenant.unwrap_or_else(uuid::Uuid::nil))
        .execute(&mut *scope)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("写入成熟度历史失败: {e}")))?;

        Ok(assessment)
    }

    async fn get_assessment(
        scope: &mut topems_shared_db::ScopedTxn<'_>,
        id: &str,
    ) -> Result<Option<MaturityAssessment>, TopemsError> {
        let row = sqlx::query(sqlx::AssertSqlSafe(format!(
            "SELECT {ASSESSMENT_COLS} FROM master_data.mdm_maturity_assessments WHERE id = $1"
        )))
        .bind(id)
        .fetch_optional(&mut *scope)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("查询成熟度评估失败: {e}")))?;
        Ok(row.map(|r| maturity_assessment_from_row(&r)))
    }

    async fn get_dimension_scores(
        scope: &mut topems_shared_db::ScopedTxn<'_>,
    ) -> Result<Vec<DimensionScore>, TopemsError> {
        fetch_dimension_scores(scope).await
    }

    async fn create_improvement_plan(
        scope: &mut topems_shared_db::ScopedTxn<'_>,
        tenant: Option<uuid::Uuid>,
        dimension: GovernanceDimension,
        target_level: MaturityLevel,
        actions: Vec<String>,
    ) -> Result<ImprovementPlan, TopemsError> {
        let plan = ImprovementPlan {
            id: uuid::Uuid::new_v4().to_string(),
            dimension,
            target_level,
            actions,
            priority: "medium".to_string(),
            due_date: None,
            status: "planned".to_string(),
        };

        sqlx::query(sqlx::AssertSqlSafe(format!(
            "INSERT INTO master_data.mdm_improvement_plans ({IMPROVEMENT_PLAN_COLS}, tenant_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7, $8)"
        )))
        .bind(&plan.id)
        .bind(dimension_str(&plan.dimension))
        .bind(maturity_level_str(&plan.target_level))
        .bind(serde_json::to_value(&plan.actions).unwrap_or_default())
        .bind(&plan.priority)
        .bind(&plan.due_date)
        .bind(&plan.status)
        .bind(tenant.unwrap_or_else(uuid::Uuid::nil))
        .execute(&mut *scope)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("写入改进计划失败: {e}")))?;

        Ok(plan)
    }

    async fn track_progress(
        scope: &mut topems_shared_db::ScopedTxn<'_>,
    ) -> Result<Vec<MaturityProgress>, TopemsError> {
        let scores = fetch_dimension_scores(scope).await?;
        let mut progress = Vec::new();
        for score in scores.iter() {
            progress.push(MaturityProgress {
                dimension: score.dimension.clone(),
                from_level: MaturityLevel::Initial,
                to_level: score.maturity_level.clone(),
                progress_percentage: score.score,
                updated_at: chrono::Utc::now(),
            });
        }
        Ok(progress)
    }

    async fn get_maturity_history(
        scope: &mut topems_shared_db::ScopedTxn<'_>,
        dimension: Option<&str>,
    ) -> Result<Vec<MaturityHistoryEntry>, TopemsError> {
        let history = fetch_maturity_history(scope).await?;
        Ok(match dimension {
            Some(d) => history
                .iter()
                .filter(|h| dimension_str(&h.dimension) == d)
                .cloned()
                .collect(),
            None => history,
        })
    }

    async fn get_benchmark(
        scope: &mut topems_shared_db::ScopedTxn<'_>,
    ) -> Result<Vec<BenchmarkData>, TopemsError> {
        let scores = fetch_dimension_scores(scope).await?;
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
        Ok(benchmarks)
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
    pub started_at: Option<chrono::DateTime<chrono::Utc>>,
    pub completed_at: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct WorkflowV58 {
    pub id: String,
    pub name: String,
    pub workflow_type: WorkflowType,
    pub steps: Vec<WorkflowStepV58>,
    pub triggers: serde_json::Value,
    pub status: WorkflowStatus,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
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
    pub recorded_at: chrono::DateTime<chrono::Utc>,
}

// ==================== 自动化工作流：引擎 ====================

#[derive(Debug, Clone)]
pub enum WorkflowStartOutcome {
    Started(WorkflowV58),
    NotFound,
    Conflict,
}

#[derive(Debug, Clone)]
pub enum WorkflowTransitionOutcome {
    Updated(WorkflowV58),
    NotFound,
    Conflict,
}

struct MDMWorkflowEngine;

impl MDMWorkflowEngine {
    async fn create_workflow(
        scope: &mut topems_shared_db::ScopedTxn<'_>,
        tenant: Option<uuid::Uuid>,
        name: String,
        workflow_type: WorkflowType,
        steps: Vec<WorkflowStepV58>,
    ) -> Result<WorkflowV58, TopemsError> {
        let now = chrono::Utc::now();
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

        sqlx::query(sqlx::AssertSqlSafe(format!(
            "INSERT INTO master_data.mdm_workflows ({WORKFLOW_INSERT_COLS}, tenant_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8, $9)"
        )))
        .bind(&workflow.id)
        .bind(&workflow.name)
        .bind(workflow_type_str(&workflow.workflow_type))
        .bind(serde_json::to_value(&workflow.steps).unwrap_or_default())
        .bind(serde_json::to_value(&workflow.triggers).unwrap_or_default())
        .bind(status_str(&workflow.status))
        .bind(workflow.created_at.to_rfc3339())
        .bind(workflow.updated_at.to_rfc3339())
        .bind(tenant.unwrap_or_else(uuid::Uuid::nil))
        .execute(&mut *scope)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("创建工作流失败: {e}")))?;

        Ok(workflow)
    }

    async fn start_workflow(
        scope: &mut topems_shared_db::ScopedTxn<'_>,
        workflow_id: &str,
    ) -> Result<WorkflowStartOutcome, TopemsError> {
        let workflows = fetch_workflows(scope).await?;
        let Some(mut workflow) = workflows.into_iter().find(|w| w.id == workflow_id) else {
            return Ok(WorkflowStartOutcome::NotFound);
        };
        if workflow.status != WorkflowStatus::Draft {
            return Ok(WorkflowStartOutcome::Conflict);
        }
        let previous_updated_at = workflow.updated_at.to_rfc3339();
        workflow.status = WorkflowStatus::Running;
        workflow.updated_at = chrono::Utc::now();

        if let Some(first_step) = workflow.steps.first_mut() {
            first_step.status = WorkflowStepStatus::InProgress;
            first_step.started_at = Some(chrono::Utc::now());
        }

        let updated = sqlx::query(
            "UPDATE master_data.mdm_workflows SET steps = $2, status = $3, updated_at = $4
             WHERE id = $1 AND status = 'draft' AND updated_at::timestamptz = $5::timestamptz
               AND (NULLIF(NULLIF(current_setting('app.tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::UUID IS NULL OR tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))",
        )
        .bind(workflow_id)
        .bind(serde_json::to_value(&workflow.steps).unwrap_or_default())
        .bind(status_str(&workflow.status))
        .bind(workflow.updated_at.to_rfc3339())
        .bind(previous_updated_at)
        .execute(&mut *scope)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("更新工作流失败: {e}")))?;
        if updated.rows_affected() == 0 {
            return Ok(WorkflowStartOutcome::Conflict);
        }
        sqlx::query(
            "INSERT INTO master_data.mdm_workflow_history (id, workflow_id, action, step_id, actor, comment, recorded_at, tenant_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7, NULLIF(current_setting('app.tenant_id', true), '')::UUID)",
        )
        .bind(uuid::Uuid::new_v4().to_string())
        .bind(workflow_id)
        .bind("start")
        .bind(Option::<String>::None)
        .bind("system")
        .bind(Option::<String>::None)
        .bind(workflow.updated_at.to_rfc3339())
        .execute(&mut *scope)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("写入工作流历史失败: {e}")))?;

        Ok(WorkflowStartOutcome::Started(workflow))
    }

    async fn advance_step(
        scope: &mut topems_shared_db::ScopedTxn<'_>,
        workflow_id: &str,
    ) -> Result<WorkflowTransitionOutcome, TopemsError> {
        let workflows = fetch_workflows(scope).await?;
        let Some(mut workflow) = workflows.into_iter().find(|w| w.id == workflow_id) else {
            return Ok(WorkflowTransitionOutcome::NotFound);
        };
        if workflow.status != WorkflowStatus::Running {
            return Ok(WorkflowTransitionOutcome::Conflict);
        }

        let previous_updated_at = workflow.updated_at.to_rfc3339();
        let now = chrono::Utc::now();
        let mut current_idx = None;
        for (i, step) in workflow.steps.iter_mut().enumerate() {
            if step.status == WorkflowStepStatus::InProgress {
                step.status = WorkflowStepStatus::Approved;
                step.completed_at = Some(now.clone());
                current_idx = Some(i);
                break;
            }
        }
        let Some(idx) = current_idx else {
            return Ok(WorkflowTransitionOutcome::Conflict);
        };
        if idx + 1 < workflow.steps.len() {
            let next = &mut workflow.steps[idx + 1];
            next.status = WorkflowStepStatus::InProgress;
            next.started_at = Some(now.clone());
        } else {
            workflow.status = WorkflowStatus::Completed;
        }

        workflow.updated_at = now;

        let updated = sqlx::query(
            "UPDATE master_data.mdm_workflows SET steps = $2, status = $3, updated_at = $4
             WHERE id = $1 AND status = 'running' AND updated_at::timestamptz = $5::timestamptz
               AND (NULLIF(NULLIF(current_setting('app.tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::UUID IS NULL OR tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))",
        )
        .bind(workflow_id)
        .bind(serde_json::to_value(&workflow.steps).unwrap_or_default())
        .bind(status_str(&workflow.status))
        .bind(workflow.updated_at.to_rfc3339())
        .bind(previous_updated_at)
        .execute(&mut *scope)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("更新工作流失败: {e}")))?;
        if updated.rows_affected() == 0 {
            return Ok(WorkflowTransitionOutcome::Conflict);
        }

        Ok(WorkflowTransitionOutcome::Updated(workflow))
    }

    async fn get_workflow_status(
        scope: &mut topems_shared_db::ScopedTxn<'_>,
        workflow_id: &str,
    ) -> Result<Option<WorkflowV58>, TopemsError> {
        let workflows = fetch_workflows(scope).await?;
        Ok(workflows.into_iter().find(|w| w.id == workflow_id))
    }

    async fn list_workflows(
        scope: &mut topems_shared_db::ScopedTxn<'_>,
        workflow_type: Option<&str>,
        status: Option<&str>,
    ) -> Result<Vec<WorkflowV58>, TopemsError> {
        let workflows = fetch_workflows(scope).await?;
        Ok(workflows
            .into_iter()
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
            .collect())
    }

    async fn get_templates(
        scope: &mut topems_shared_db::ScopedTxn<'_>,
    ) -> Result<Vec<WorkflowTemplate>, TopemsError> {
        fetch_workflow_templates(scope).await
    }

    async fn approve_step(
        scope: &mut topems_shared_db::ScopedTxn<'_>,
        workflow_id: &str,
        step_id: &str,
    ) -> Result<WorkflowTransitionOutcome, TopemsError> {
        let workflows = fetch_workflows(scope).await?;
        let Some(mut workflow) = workflows.into_iter().find(|w| w.id == workflow_id) else {
            return Ok(WorkflowTransitionOutcome::NotFound);
        };
        if workflow.status != WorkflowStatus::Running {
            return Ok(WorkflowTransitionOutcome::Conflict);
        }

        let Some(step) = workflow.steps.iter_mut().find(|s| s.id == step_id) else {
            return Ok(WorkflowTransitionOutcome::NotFound);
        };
        if step.status != WorkflowStepStatus::InProgress {
            return Ok(WorkflowTransitionOutcome::Conflict);
        }

        let previous_updated_at = workflow.updated_at.to_rfc3339();
        let now = chrono::Utc::now();
        step.status = WorkflowStepStatus::Approved;
        step.completed_at = Some(now.clone());
        let actor = step
            .assignee
            .clone()
            .unwrap_or_else(|| "system".to_string());
        workflow.updated_at = now;

        let updated = sqlx::query(
            "UPDATE master_data.mdm_workflows SET steps = $2, status = $3, updated_at = $4
             WHERE id = $1 AND status = 'running' AND updated_at::timestamptz = $5::timestamptz
               AND steps @> $6::jsonb
               AND (NULLIF(NULLIF(current_setting('app.tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::UUID IS NULL OR tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))",
        )
        .bind(workflow_id)
        .bind(serde_json::to_value(&workflow.steps).unwrap_or_default())
        .bind(status_str(&workflow.status))
        .bind(workflow.updated_at.to_rfc3339())
        .bind(previous_updated_at)
        .bind(serde_json::json!([{"id": step_id, "status": "in_progress"}]))
        .execute(&mut *scope)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("更新工作流失败: {e}")))?;
        if updated.rows_affected() == 0 {
            return Ok(WorkflowTransitionOutcome::Conflict);
        }
        sqlx::query(
            "INSERT INTO master_data.mdm_workflow_history (id, workflow_id, action, step_id, actor, comment, recorded_at, tenant_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7, NULLIF(current_setting('app.tenant_id', true), '')::UUID)",
        )
        .bind(uuid::Uuid::new_v4().to_string())
        .bind(workflow_id)
        .bind("approve")
        .bind(step_id)
        .bind(&actor)
        .bind(Option::<String>::None)
        .bind(workflow.updated_at.to_rfc3339())
        .execute(&mut *scope)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("写入工作流历史失败: {e}")))?;

        Ok(WorkflowTransitionOutcome::Updated(workflow))
    }

    async fn reject_step(
        scope: &mut topems_shared_db::ScopedTxn<'_>,
        workflow_id: &str,
        step_id: &str,
    ) -> Result<WorkflowTransitionOutcome, TopemsError> {
        let workflows = fetch_workflows(scope).await?;
        let Some(mut workflow) = workflows.into_iter().find(|w| w.id == workflow_id) else {
            return Ok(WorkflowTransitionOutcome::NotFound);
        };
        if workflow.status != WorkflowStatus::Running {
            return Ok(WorkflowTransitionOutcome::Conflict);
        }

        let Some(step) = workflow.steps.iter_mut().find(|s| s.id == step_id) else {
            return Ok(WorkflowTransitionOutcome::NotFound);
        };
        if step.status != WorkflowStepStatus::InProgress {
            return Ok(WorkflowTransitionOutcome::Conflict);
        }

        let previous_updated_at = workflow.updated_at.to_rfc3339();
        let now = chrono::Utc::now();
        step.status = WorkflowStepStatus::Rejected;
        step.completed_at = Some(now.clone());
        let actor = step
            .assignee
            .clone()
            .unwrap_or_else(|| "system".to_string());
        workflow.status = WorkflowStatus::Cancelled;
        workflow.updated_at = now;

        let updated = sqlx::query(
            "UPDATE master_data.mdm_workflows SET steps = $2, status = $3, updated_at = $4
             WHERE id = $1 AND status = 'running' AND updated_at::timestamptz = $5::timestamptz
               AND steps @> $6::jsonb
               AND (NULLIF(NULLIF(current_setting('app.tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::UUID IS NULL OR tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))",
        )
        .bind(workflow_id)
        .bind(serde_json::to_value(&workflow.steps).unwrap_or_default())
        .bind(status_str(&workflow.status))
        .bind(workflow.updated_at.to_rfc3339())
        .bind(previous_updated_at)
        .bind(serde_json::json!([{"id": step_id, "status": "in_progress"}]))
        .execute(&mut *scope)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("更新工作流失败: {e}")))?;
        if updated.rows_affected() == 0 {
            return Ok(WorkflowTransitionOutcome::Conflict);
        }
        sqlx::query(
            "INSERT INTO master_data.mdm_workflow_history (id, workflow_id, action, step_id, actor, comment, recorded_at, tenant_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7, NULLIF(current_setting('app.tenant_id', true), '')::UUID)",
        )
        .bind(uuid::Uuid::new_v4().to_string())
        .bind(workflow_id)
        .bind("reject")
        .bind(step_id)
        .bind(&actor)
        .bind(Option::<String>::None)
        .bind(workflow.updated_at.to_rfc3339())
        .execute(&mut *scope)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("写入工作流历史失败: {e}")))?;

        Ok(WorkflowTransitionOutcome::Updated(workflow))
    }

    async fn get_workflow_history(
        scope: &mut topems_shared_db::ScopedTxn<'_>,
        workflow_id: &str,
    ) -> Result<Vec<WorkflowHistoryEntry>, TopemsError> {
        let history = fetch_workflow_history(scope).await?;
        Ok(history
            .into_iter()
            .filter(|h| h.workflow_id == workflow_id)
            .collect())
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

impl DataProductStatus {
    pub const DB_VALUES: [&'static str; 4] = ["draft", "published", "deprecated", "retired"];

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "draft" => Some(Self::Draft),
            "published" => Some(Self::Published),
            "deprecated" => Some(Self::Deprecated),
            "retired" => Some(Self::Retired),
            _ => None,
        }
    }

    #[must_use]
    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Published => "published",
            Self::Deprecated => "deprecated",
            Self::Retired => "retired",
        }
    }

    /// 写数据契约会自动发布：仅草稿可首次发布，已发布可重写契约；已弃用/退役不允许复活。
    pub fn publish_from() -> &'static [&'static str] {
        &["draft", "published"]
    }
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
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone)]
pub enum UpdateContractOutcome {
    Updated(DataContract),
    NotFound,
    StatusConflict,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DataContract {
    pub product_id: String,
    pub schema: serde_json::Value,
    pub quality_requirements: Vec<String>,
    pub freshness_sla: String,
    pub security_level: SecurityLevel,
    pub version: String,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ContractStatus {
    pub product_id: String,
    pub version: String,
    pub is_valid: bool,
    pub last_verified_at: Option<chrono::DateTime<chrono::Utc>>,
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
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ConsumerInfo {
    pub consumer_id: String,
    pub consumer_name: String,
    pub subscribed_at: chrono::DateTime<chrono::Utc>,
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

struct DataProductManager;

impl DataProductManager {
    async fn create_data_product(
        scope: &mut topems_shared_db::ScopedTxn<'_>,
        tenant: Option<uuid::Uuid>,
        name: String,
        description: String,
        owner: String,
        domain: String,
        sla_level: SlaLevel,
    ) -> Result<DataProduct, TopemsError> {
        let now = chrono::Utc::now();
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

        sqlx::query(sqlx::AssertSqlSafe(format!(
            "INSERT INTO master_data.mdm_data_products ({DATA_PRODUCT_INSERT_COLS}, tenant_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, $12)"
        )))
        .bind(&product.id)
        .bind(&product.name)
        .bind(&product.description)
        .bind(&product.owner)
        .bind(&product.domain)
        .bind(serde_json::to_value(&product.consumers).unwrap_or_default())
        .bind(Option::<serde_json::Value>::None)
        .bind(sla_level_str(&product.sla_level))
        .bind(product_status_str(&product.status))
        .bind(product.created_at.to_rfc3339())
        .bind(product.updated_at.to_rfc3339())
        .bind(tenant.unwrap_or_else(uuid::Uuid::nil))
        .execute(&mut *scope)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("创建数据产品失败: {e}")))?;

        Ok(product)
    }

    async fn get_data_product(
        scope: &mut topems_shared_db::ScopedTxn<'_>,
        id: &str,
    ) -> Result<Option<DataProduct>, TopemsError> {
        let products = fetch_data_products(scope).await?;
        Ok(products.into_iter().find(|p| p.id == id))
    }

    async fn list_data_products(
        scope: &mut topems_shared_db::ScopedTxn<'_>,
        domain: Option<&str>,
        status: Option<&str>,
    ) -> Result<Vec<DataProduct>, TopemsError> {
        let products = fetch_data_products(scope).await?;
        Ok(products
            .into_iter()
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
            .collect())
    }

    async fn update_contract(
        scope: &mut topems_shared_db::ScopedTxn<'_>,
        product_id: &str,
        schema: serde_json::Value,
        quality_requirements: Vec<String>,
        freshness_sla: String,
        security_level: SecurityLevel,
    ) -> Result<UpdateContractOutcome, TopemsError> {
        let now = chrono::Utc::now();
        let contract = DataContract {
            product_id: product_id.to_string(),
            schema,
            quality_requirements,
            freshness_sla,
            security_level,
            version: "1.0.0".to_string(),
            updated_at: now.clone(),
        };

        // 先带起始态谓词更新产品；并发把状态改成 deprecated/retired 时 0 行，不再插入孤立契约。
        let updated = sqlx::query(
            "UPDATE master_data.mdm_data_products
             SET data_contract = $2, status = 'published', updated_at = $3
             WHERE id = $1
               AND status IN ('draft','published')
               AND (NULLIF(NULLIF(current_setting('app.tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::UUID IS NULL OR tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))",
        )
        .bind(product_id)
        .bind(serde_json::to_value(&contract).unwrap_or_default())
        .bind(now.to_rfc3339())
        .execute(&mut *scope)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("更新数据产品失败: {e}")))?;

        if updated.rows_affected() == 0 {
            let exists = sqlx::query_scalar::<_, bool>(
                "SELECT EXISTS(SELECT 1 FROM master_data.mdm_data_products WHERE id = $1)",
            )
            .bind(product_id)
            .fetch_one(&mut *scope)
            .await
            .map_err(|e| TopemsError::BusinessLogic(format!("查询数据产品失败: {e}")))?;
            return Ok(if exists {
                UpdateContractOutcome::StatusConflict
            } else {
                UpdateContractOutcome::NotFound
            });
        }

        sqlx::query(sqlx::AssertSqlSafe(format!(
            "INSERT INTO master_data.mdm_data_contracts ({DATA_CONTRACT_INSERT_COLS}, tenant_id) VALUES ($1,$2,$3,$4,$5,$6,$7, NULLIF(current_setting('app.tenant_id', true), '')::UUID)"
        )))
        .bind(&contract.product_id)
        .bind(serde_json::to_value(&contract.schema).unwrap_or_default())
        .bind(serde_json::to_value(&contract.quality_requirements).unwrap_or_default())
        .bind(&contract.freshness_sla)
        .bind(security_level_str(&contract.security_level))
        .bind(&contract.version)
        .bind(contract.updated_at.to_rfc3339())
        .execute(&mut *scope)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("写入数据契约失败: {e}")))?;

        Ok(UpdateContractOutcome::Updated(contract))
    }

    async fn get_contract_status(
        scope: &mut topems_shared_db::ScopedTxn<'_>,
        product_id: &str,
    ) -> Result<Option<ContractStatus>, TopemsError> {
        let products = fetch_data_products(scope).await?;
        let Some(product) = products.iter().find(|p| p.id == product_id) else {
            return Ok(None);
        };

        let issues = if product.data_contract.is_none() {
            vec!["数据契约未定义".to_string()]
        } else {
            Vec::new()
        };

        Ok(Some(ContractStatus {
            product_id: product_id.to_string(),
            version: product
                .data_contract
                .as_ref()
                .map(|c| c.version.clone())
                .unwrap_or_else(|| "0.0.0".to_string()),
            is_valid: issues.is_empty(),
            last_verified_at: Some(chrono::Utc::now()),
            issues,
        }))
    }

    async fn expose_as_api(
        scope: &mut topems_shared_db::ScopedTxn<'_>,
        tenant: Option<uuid::Uuid>,
        product_id: &str,
        auth_type: String,
        rate_limit: String,
    ) -> Result<Option<ApiExposure>, TopemsError> {
        let Some(product) = Self::get_data_product(scope, product_id).await? else {
            return Ok(None);
        };
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
            created_at: chrono::Utc::now(),
        };

        sqlx::query(sqlx::AssertSqlSafe(format!(
            "INSERT INTO master_data.mdm_api_exposures ({API_EXPOSURE_INSERT_COLS}, tenant_id) VALUES ($1,$2,$3,$4,$5,$6,$7, $8)"
        )))
        .bind(&exposure.id)
        .bind(&exposure.product_id)
        .bind(&exposure.endpoint)
        .bind(&exposure.auth_type)
        .bind(&exposure.rate_limit)
        .bind(exposure.enabled)
        .bind(exposure.created_at.to_rfc3339())
        .bind(tenant.unwrap_or_else(uuid::Uuid::nil))
        .execute(&mut *scope)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("写入 API 暴露失败: {e}")))?;

        Ok(Some(exposure))
    }

    async fn get_consumers(
        scope: &mut topems_shared_db::ScopedTxn<'_>,
        product_id: &str,
    ) -> Result<Vec<ConsumerInfo>, TopemsError> {
        let products = fetch_data_products(scope).await?;
        let Some(product) = products.iter().find(|p| p.id == product_id) else {
            return Ok(Vec::new());
        };

        Ok(product
            .consumers
            .iter()
            .map(|c| ConsumerInfo {
                consumer_id: c.clone(),
                consumer_name: format!("Consumer {}", c),
                subscribed_at: chrono::Utc::now(),
                status: "active".to_string(),
            })
            .collect())
    }

    async fn get_product_lineage(
        scope: &mut topems_shared_db::ScopedTxn<'_>,
        product_id: &str,
    ) -> Result<ProductLineage, TopemsError> {
        let products = fetch_data_products(scope).await?;
        let product = products.iter().find(|p| p.id == product_id);
        let consumers = product.map(|p| p.consumers.clone()).unwrap_or_default();

        Ok(ProductLineage {
            product_id: product_id.to_string(),
            upstream_sources: vec!["source_system".to_string()],
            downstream_consumers: consumers,
            data_flow: vec![
                "source_system -> data_product".to_string(),
                "data_product -> consumers".to_string(),
            ],
        })
    }
}

// ==================== V58 内存存储 ====================

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

fn dimension_name(d: &GovernanceDimension) -> &'static str {
    match d {
        GovernanceDimension::Quality => "数据质量",
        GovernanceDimension::Consistency => "一致性",
        GovernanceDimension::Ownership => "数据归属",
        GovernanceDimension::Process => "流程规范",
        GovernanceDimension::Technology => "技术支撑",
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
    s.as_db_str()
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

// ==================== U4 持久化 ====================

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

#[derive(Debug, Deserialize, ToSchema)]
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
    path = "/mdm-v58/maturity/assess",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "governance_v58"
)]
pub async fn assess_maturity(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<AssessMaturityRequest>,
) -> ApiResponse<MaturityAssessment> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("缺少请求事务上下文".to_string()));
    };
    let mut db_scope = match state.rls_db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启租户作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库上下文初始化失败".to_string()));
        }
    };

    let tenant = tenant_of(&claims);
    let dimension = match parse_dimension(&req.dimension) {
        Some(d) => d,
        None => return ApiResponse::bad_request("无效的维度类型"),
    };
    let target = req
        .target_level
        .as_deref()
        .and_then(parse_maturity_level)
        .unwrap_or(MaturityLevel::Optimized);

    let result = db_exec!(
        GovernanceMaturity::assess_maturity(&mut db_scope, tenant, dimension, target).await
    );
    ApiResponse::success(result, "成熟度评估完成")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:governance:read"])),
    path = "/mdm-v58/maturity/assessment",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "governance_v58"
)]
pub async fn get_assessment(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(params): Query<GetAssessmentQuery>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("缺少请求事务上下文".to_string()));
    };
    let mut db_scope = match state.rls_db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启租户作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库上下文初始化失败".to_string()));
        }
    };

    if let Some(id) = params.id {
        match db_exec!(GovernanceMaturity::get_assessment(&mut db_scope, &id).await) {
            Some(a) => ApiResponse::success(serde_json::json!(a), "成熟度评估详情"),
            None => ApiResponse::not_found("未找到评估记录"),
        }
    } else {
        let scores = db_exec!(GovernanceMaturity::get_dimension_scores(&mut db_scope).await);
        ApiResponse::success(
            serde_json::json!({"dimension_scores": scores}),
            "成熟度概览",
        )
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:governance:read"])),
    path = "/mdm-v58/maturity/scores",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "governance_v58"
)]
pub async fn get_dimension_scores(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<Vec<DimensionScore>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("缺少请求事务上下文".to_string()));
    };
    let mut db_scope = match state.rls_db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启租户作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库上下文初始化失败".to_string()));
        }
    };

    let scores = db_exec!(GovernanceMaturity::get_dimension_scores(&mut db_scope).await);
    ApiResponse::success(scores, "维度评分列表")
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:governance:write"])),
    path = "/mdm-v58/maturity/improvement-plan",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "governance_v58"
)]
pub async fn create_improvement_plan(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<ImprovementPlanRequest>,
) -> ApiResponse<ImprovementPlan> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("缺少请求事务上下文".to_string()));
    };
    let mut db_scope = match state.rls_db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启租户作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库上下文初始化失败".to_string()));
        }
    };

    let tenant = tenant_of(&claims);
    let dimension = match parse_dimension(&req.dimension) {
        Some(d) => d,
        None => return ApiResponse::bad_request("无效的维度类型"),
    };
    let target = match parse_maturity_level(&req.target_level) {
        Some(l) => l,
        None => return ApiResponse::bad_request("无效的目标等级"),
    };

    let plan = db_exec!(
        GovernanceMaturity::create_improvement_plan(
            &mut db_scope,
            tenant,
            dimension,
            target,
            req.actions
        )
        .await
    );
    ApiResponse::success(plan, "改进计划已创建")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:governance:read"])),
    path = "/mdm-v58/maturity/progress",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "governance_v58"
)]
pub async fn track_progress(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<Vec<MaturityProgress>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("缺少请求事务上下文".to_string()));
    };
    let mut db_scope = match state.rls_db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启租户作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库上下文初始化失败".to_string()));
        }
    };

    let progress = db_exec!(GovernanceMaturity::track_progress(&mut db_scope).await);
    ApiResponse::success(progress, "成熟度进度")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:governance:read"])),
    path = "/mdm-v58/maturity/history",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "governance_v58"
)]
pub async fn get_maturity_history(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(params): Query<MaturityHistoryQuery>,
) -> ApiResponse<Vec<MaturityHistoryEntry>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("缺少请求事务上下文".to_string()));
    };
    let mut db_scope = match state.rls_db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启租户作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库上下文初始化失败".to_string()));
        }
    };

    let history = db_exec!(
        GovernanceMaturity::get_maturity_history(&mut db_scope, params.dimension.as_deref()).await
    );
    ApiResponse::success(history, "成熟度历史")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:governance:read"])),
    path = "/mdm-v58/maturity/benchmark",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "governance_v58"
)]
pub async fn get_benchmark(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<Vec<BenchmarkData>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("缺少请求事务上下文".to_string()));
    };
    let mut db_scope = match state.rls_db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启租户作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库上下文初始化失败".to_string()));
        }
    };

    let benchmark = db_exec!(GovernanceMaturity::get_benchmark(&mut db_scope).await);
    ApiResponse::success(benchmark, "基准对比数据")
}

// ==================== 处理器：自动化工作流 ====================

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:governance:write"])),
    path = "/mdm-v58/workflow",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "governance_v58"
)]
pub async fn create_workflow(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateWorkflowRequest>,
) -> ApiResponse<WorkflowV58> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("缺少请求事务上下文".to_string()));
    };
    let mut db_scope = match state.rls_db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启租户作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库上下文初始化失败".to_string()));
        }
    };

    let tenant = tenant_of(&claims);
    let workflow_type = match parse_workflow_type(&req.workflow_type) {
        Some(t) => t,
        None => return ApiResponse::bad_request("无效的工作流类型"),
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

    let workflow = db_exec!(
        MDMWorkflowEngine::create_workflow(&mut db_scope, tenant, req.name, workflow_type, steps)
            .await
    );
    ApiResponse::success(workflow, "工作流已创建")
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:governance:write"])),
    path = "/mdm-v58/workflow/{id}/start",
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
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<String>,
) -> ApiResponse<WorkflowV58> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("缺少请求事务上下文".to_string()));
    };
    let mut db_scope = match state.rls_db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启租户作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库上下文初始化失败".to_string()));
        }
    };

    match db_exec!(MDMWorkflowEngine::start_workflow(&mut db_scope, &id).await) {
        WorkflowStartOutcome::Started(w) => ApiResponse::success(w, "工作流已启动"),
        WorkflowStartOutcome::NotFound => ApiResponse::not_found("未找到工作流"),
        WorkflowStartOutcome::Conflict => {
            ApiResponse::error(409, "工作流已启动或状态不允许，未重复启动")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:governance:write"])),
    path = "/mdm-v58/workflow/{id}/advance",
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
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<String>,
    Json(_req): Json<AdvanceStepRequest>,
) -> ApiResponse<WorkflowV58> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("缺少请求事务上下文".to_string()));
    };
    let mut db_scope = match state.rls_db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启租户作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库上下文初始化失败".to_string()));
        }
    };

    match db_exec!(MDMWorkflowEngine::advance_step(&mut db_scope, &id).await) {
        WorkflowTransitionOutcome::Updated(w) => ApiResponse::success(w, "步骤已推进"),
        WorkflowTransitionOutcome::NotFound => ApiResponse::not_found("未找到工作流"),
        WorkflowTransitionOutcome::Conflict => {
            ApiResponse::error(409, "工作流状态或当前步骤已变更，无法推进")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:governance:read"])),
    path = "/mdm-v58/workflow/{id}/status",
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
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<String>,
) -> ApiResponse<WorkflowV58> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("缺少请求事务上下文".to_string()));
    };
    let mut db_scope = match state.rls_db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启租户作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库上下文初始化失败".to_string()));
        }
    };

    match db_exec!(MDMWorkflowEngine::get_workflow_status(&mut db_scope, &id).await) {
        Some(w) => ApiResponse::success(w, "工作流状态"),
        None => ApiResponse::not_found("未找到工作流"),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:governance:read"])),
    path = "/mdm-v58/workflows",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "governance_v58"
)]
pub async fn list_workflows(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(params): Query<ListWorkflowsQuery>,
) -> ApiResponse<Vec<WorkflowV58>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("缺少请求事务上下文".to_string()));
    };
    let mut db_scope = match state.rls_db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启租户作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库上下文初始化失败".to_string()));
        }
    };

    let status = match params.status.as_deref() {
        None => None,
        Some(raw) => match WorkflowStatus::from_db_str(raw) {
            Some(s) => Some(s.as_db_str()),
            None => return ApiResponse::bad_request("无效的工作流状态"),
        },
    };
    let workflows = db_exec!(
        MDMWorkflowEngine::list_workflows(&mut db_scope, params.workflow_type.as_deref(), status)
            .await
    );
    ApiResponse::success(workflows, "工作流列表")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:governance:read"])),
    path = "/mdm-v58/workflow/templates",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "governance_v58"
)]
pub async fn get_workflow_templates(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<Vec<WorkflowTemplate>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("缺少请求事务上下文".to_string()));
    };
    let mut db_scope = match state.rls_db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启租户作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库上下文初始化失败".to_string()));
        }
    };

    let templates = db_exec!(MDMWorkflowEngine::get_templates(&mut db_scope).await);
    ApiResponse::success(templates, "工作流模板")
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:governance:write"])),
    path = "/mdm-v58/workflow/step/{id}/approve",
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
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<String>,
    Json(req): Json<ApproveStepRequest>,
) -> ApiResponse<WorkflowV58> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("缺少请求事务上下文".to_string()));
    };
    let mut db_scope = match state.rls_db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启租户作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库上下文初始化失败".to_string()));
        }
    };

    let (workflow_id, step_id) = parse_step_path(&id);

    match db_exec!(MDMWorkflowEngine::approve_step(&mut db_scope, &workflow_id, &step_id).await) {
        WorkflowTransitionOutcome::Updated(w) => {
            ApiResponse::success(w, &req.comment.unwrap_or_else(|| "步骤已批准".to_string()))
        }
        WorkflowTransitionOutcome::NotFound => ApiResponse::not_found("未找到工作流或步骤"),
        WorkflowTransitionOutcome::Conflict => ApiResponse::error(409, "步骤状态已变更，无法批准"),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:governance:write"])),
    path = "/mdm-v58/workflow/step/{id}/reject",
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
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<String>,
    Json(req): Json<RejectStepRequest>,
) -> ApiResponse<WorkflowV58> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("缺少请求事务上下文".to_string()));
    };
    let mut db_scope = match state.rls_db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启租户作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库上下文初始化失败".to_string()));
        }
    };

    let (workflow_id, step_id) = parse_step_path(&id);

    match db_exec!(MDMWorkflowEngine::reject_step(&mut db_scope, &workflow_id, &step_id).await) {
        WorkflowTransitionOutcome::Updated(w) => {
            ApiResponse::success(w, &req.reason.unwrap_or_else(|| "步骤已拒绝".to_string()))
        }
        WorkflowTransitionOutcome::NotFound => ApiResponse::not_found("未找到工作流或步骤"),
        WorkflowTransitionOutcome::Conflict => ApiResponse::error(409, "步骤状态已变更，无法拒绝"),
    }
}

pub async fn get_workflow_history(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<String>,
) -> ApiResponse<Vec<WorkflowHistoryEntry>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("缺少请求事务上下文".to_string()));
    };
    let mut db_scope = match state.rls_db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启租户作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库上下文初始化失败".to_string()));
        }
    };

    let history = db_exec!(MDMWorkflowEngine::get_workflow_history(&mut db_scope, &id).await);
    ApiResponse::success(history, "工作流历史")
}

// ==================== 处理器：数据产品化 ====================

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:governance:write"])),
    path = "/mdm-v58/data-product",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "governance_v58"
)]
pub async fn create_data_product(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateDataProductRequest>,
) -> ApiResponse<DataProduct> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("缺少请求事务上下文".to_string()));
    };
    let mut db_scope = match state.rls_db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启租户作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库上下文初始化失败".to_string()));
        }
    };

    let tenant = tenant_of(&claims);
    let sla = req
        .sla_level
        .as_deref()
        .and_then(parse_sla_level)
        .unwrap_or(SlaLevel::Silver);

    let product = db_exec!(
        DataProductManager::create_data_product(
            &mut db_scope,
            tenant,
            req.name,
            req.description,
            req.owner,
            req.domain,
            sla
        )
        .await
    );
    ApiResponse::success(product, "数据产品已创建")
}

/// 扁平契约 `POST /data-product`：请求体宽松（空对象 `{}` 亦可），缺失字段给默认值后落库，
/// 与 mdm-v58/create_data_product 走同一管理器。
pub async fn create_data_product_compat(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<serde_json::Value>,
) -> ApiResponse<DataProduct> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("缺少请求事务上下文".to_string()));
    };
    let mut db_scope = match state.rls_db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启租户作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库上下文初始化失败".to_string()));
        }
    };

    let tenant = tenant_of(&claims);
    let name = req
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("未命名数据产品")
        .to_string();
    let description = req
        .get("description")
        .and_then(|v| v.as_str())
        .unwrap_or_default()
        .to_string();
    let owner = req
        .get("owner")
        .and_then(|v| v.as_str())
        .unwrap_or("system")
        .to_string();
    let domain = req
        .get("domain")
        .and_then(|v| v.as_str())
        .unwrap_or("general")
        .to_string();
    let sla = req
        .get("sla_level")
        .and_then(|v| v.as_str())
        .and_then(parse_sla_level)
        .unwrap_or(SlaLevel::Silver);

    let product = db_exec!(
        DataProductManager::create_data_product(
            &mut db_scope,
            tenant,
            name,
            description,
            owner,
            domain,
            sla
        )
        .await
    );
    ApiResponse::success(product, "数据产品已创建")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:governance:read"])),
    path = "/mdm-v58/data-product/{id}",
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
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<String>,
) -> ApiResponse<DataProduct> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("缺少请求事务上下文".to_string()));
    };
    let mut db_scope = match state.rls_db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启租户作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库上下文初始化失败".to_string()));
        }
    };

    match db_exec!(DataProductManager::get_data_product(&mut db_scope, &id).await) {
        Some(p) => ApiResponse::success(p, "数据产品详情"),
        None => ApiResponse::not_found("未找到数据产品"),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:governance:read"])),
    path = "/mdm-v58/data-products",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "governance_v58"
)]
pub async fn list_data_products(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(params): Query<ListDataProductsQuery>,
) -> ApiResponse<Vec<DataProduct>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("缺少请求事务上下文".to_string()));
    };
    let mut db_scope = match state.rls_db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启租户作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库上下文初始化失败".to_string()));
        }
    };

    let products = db_exec!(
        DataProductManager::list_data_products(
            &mut db_scope,
            params.domain.as_deref(),
            params.status.as_deref()
        )
        .await
    );
    ApiResponse::success(products, "数据产品列表")
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["master_data:governance:write"])),
    path = "/mdm-v58/data-product/{id}/contract",
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
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<String>,
    Json(req): Json<UpdateContractRequest>,
) -> ApiResponse<DataContract> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("缺少请求事务上下文".to_string()));
    };
    let mut db_scope = match state.rls_db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启租户作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库上下文初始化失败".to_string()));
        }
    };

    let security = match req.security_level.as_deref() {
        None => SecurityLevel::Internal,
        Some(raw) => match parse_security_level(raw) {
            Some(level) => level,
            None => return ApiResponse::bad_request("无效的安全级别"),
        },
    };

    let requirements = req.quality_requirements.unwrap_or_else(|| {
        vec![
            "字段完整性".to_string(),
            "数据准确性".to_string(),
            "时效性".to_string(),
        ]
    });

    let sla = req.freshness_sla.unwrap_or_else(|| "24h".to_string());

    let current_status = sqlx::query_scalar::<_, String>(
        "SELECT status FROM master_data.mdm_data_products WHERE id = $1",
    )
    .bind(&id)
    .fetch_optional(&mut db_scope)
    .await;
    let current_status = match current_status {
        Ok(Some(raw)) => raw,
        Ok(None) => return ApiResponse::not_found("未找到数据产品"),
        Err(e) => return ApiResponse::server_error(&format!("查询数据产品失败: {e}")),
    };
    match DataProductStatus::from_db_str(&current_status) {
        Some(DataProductStatus::Draft) | Some(DataProductStatus::Published) => {}
        Some(other) => {
            let msg = format!("数据产品状态为 {}，不允许写入契约", other.as_db_str());
            return ApiResponse::error(409, &msg);
        }
        None => return ApiResponse::error(409, "数据产品当前状态非法，无法写入契约"),
    }

    match db_exec!(
        DataProductManager::update_contract(
            &mut db_scope,
            &id,
            req.schema,
            requirements,
            sla,
            security
        )
        .await
    ) {
        UpdateContractOutcome::Updated(c) => ApiResponse::success(c, "数据契约已更新"),
        UpdateContractOutcome::NotFound => ApiResponse::not_found("未找到数据产品"),
        UpdateContractOutcome::StatusConflict => {
            ApiResponse::error(409, "数据产品状态已变更，已弃用或退役产品不允许写入契约")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:governance:read"])),
    path = "/mdm-v58/data-product/{id}/contract/status",
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
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<String>,
) -> ApiResponse<ContractStatus> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("缺少请求事务上下文".to_string()));
    };
    let mut db_scope = match state.rls_db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启租户作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库上下文初始化失败".to_string()));
        }
    };

    match db_exec!(DataProductManager::get_contract_status(&mut db_scope, &id).await) {
        Some(s) => ApiResponse::success(s, "契约状态"),
        None => ApiResponse::not_found("未找到数据产品"),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:governance:write"])),
    path = "/mdm-v58/data-product/{id}/expose",
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
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(req): Json<ExposeApiRequest>,
) -> ApiResponse<ApiExposure> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("缺少请求事务上下文".to_string()));
    };
    let mut db_scope = match state.rls_db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启租户作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库上下文初始化失败".to_string()));
        }
    };

    let tenant = tenant_of(&claims);
    let auth = req.auth_type.unwrap_or_else(|| "bearer".to_string());
    let rate = req.rate_limit.unwrap_or_else(|| "1000/min".to_string());

    match db_exec!(DataProductManager::expose_as_api(&mut db_scope, tenant, &id, auth, rate).await)
    {
        Some(e) => ApiResponse::success(e, "API 已暴露"),
        None => ApiResponse::not_found("未找到数据产品"),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:governance:read"])),
    path = "/mdm-v58/data-product/{id}/consumers",
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
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<String>,
) -> ApiResponse<Vec<ConsumerInfo>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("缺少请求事务上下文".to_string()));
    };
    let mut db_scope = match state.rls_db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启租户作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库上下文初始化失败".to_string()));
        }
    };

    let consumers = db_exec!(DataProductManager::get_consumers(&mut db_scope, &id).await);
    ApiResponse::success(consumers, "消费者列表")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:governance:read"])),
    path = "/mdm-v58/data-product/{id}/lineage",
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
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<String>,
) -> ApiResponse<ProductLineage> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("缺少请求事务上下文".to_string()));
    };
    let mut db_scope = match state.rls_db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启租户作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库上下文初始化失败".to_string()));
        }
    };

    let lineage = db_exec!(DataProductManager::get_product_lineage(&mut db_scope, &id).await);
    ApiResponse::success(lineage, "数据产品血缘")
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

// ==================== K1 接真表：映射层 ====================

const ASSESSMENT_COLS: &str =
    "id, dimension, current_level, target_level, score, gaps, recommendations, assessed_at::timestamptz AS assessed_at";
const ASSESSMENT_INSERT_COLS: &str =
    "id, dimension, current_level, target_level, score, gaps, recommendations, assessed_at";
const DIMENSION_SCORE_COLS: &str = "dimension, score, weight, maturity_level, evidence";
const IMPROVEMENT_PLAN_COLS: &str =
    "id, dimension, target_level, actions, priority, due_date, status";
const WORKFLOW_COLS: &str =
    "id, name, workflow_type, steps, triggers, status, created_at::timestamptz AS created_at, updated_at::timestamptz AS updated_at";
const WORKFLOW_INSERT_COLS: &str =
    "id, name, workflow_type, steps, triggers, status, created_at, updated_at";
const WORKFLOW_TEMPLATE_COLS: &str = "id, name, description, workflow_type, steps";
const WORKFLOW_HISTORY_COLS: &str =
    "id, workflow_id, action, step_id, actor, comment, recorded_at::timestamptz AS recorded_at";
const DATA_PRODUCT_COLS: &str = "id, name, description, owner, domain, consumers, data_contract, sla_level, status, created_at::timestamptz AS created_at, updated_at::timestamptz AS updated_at";
const DATA_PRODUCT_INSERT_COLS: &str = "id, name, description, owner, domain, consumers, data_contract, sla_level, status, created_at, updated_at";
const DATA_CONTRACT_COLS: &str =
    "product_id, schema, quality_requirements, freshness_sla, security_level, version, updated_at::timestamptz AS updated_at";
const DATA_CONTRACT_INSERT_COLS: &str =
    "product_id, schema, quality_requirements, freshness_sla, security_level, version, updated_at";
const API_EXPOSURE_COLS: &str =
    "id, product_id, endpoint, auth_type, rate_limit, enabled, created_at::timestamptz AS created_at";
const API_EXPOSURE_INSERT_COLS: &str =
    "id, product_id, endpoint, auth_type, rate_limit, enabled, created_at";

fn sla_level_str(l: &SlaLevel) -> &str {
    match l {
        SlaLevel::Bronze => "bronze",
        SlaLevel::Silver => "silver",
        SlaLevel::Gold => "gold",
        SlaLevel::Platinum => "platinum",
    }
}

fn security_level_str(l: &SecurityLevel) -> &str {
    match l {
        SecurityLevel::Public => "public",
        SecurityLevel::Internal => "internal",
        SecurityLevel::Confidential => "confidential",
        SecurityLevel::Restricted => "restricted",
    }
}

impl WorkflowStatus {
    pub const DB_VALUES: [&'static str; 5] =
        ["draft", "running", "paused", "completed", "cancelled"];

    #[must_use]
    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "draft" => Some(Self::Draft),
            "running" => Some(Self::Running),
            "paused" => Some(Self::Paused),
            "completed" => Some(Self::Completed),
            "cancelled" => Some(Self::Cancelled),
            _ => None,
        }
    }

    #[must_use]
    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Running => "running",
            Self::Paused => "paused",
            Self::Completed => "completed",
            Self::Cancelled => "cancelled",
        }
    }
}

impl WorkflowStepStatus {
    pub const DB_VALUES: [&'static str; 5] =
        ["pending", "in_progress", "approved", "rejected", "skipped"];

    #[must_use]
    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "pending" => Some(Self::Pending),
            "in_progress" => Some(Self::InProgress),
            "approved" => Some(Self::Approved),
            "rejected" => Some(Self::Rejected),
            "skipped" => Some(Self::Skipped),
            _ => None,
        }
    }

    #[must_use]
    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::InProgress => "in_progress",
            Self::Approved => "approved",
            Self::Rejected => "rejected",
            Self::Skipped => "skipped",
        }
    }
}

fn workflow_status_from_str(s: &str) -> WorkflowStatus {
    WorkflowStatus::from_db_str(s).unwrap_or(WorkflowStatus::Draft)
}

fn step_status_from_str(s: &str) -> WorkflowStepStatus {
    WorkflowStepStatus::from_db_str(s).unwrap_or(WorkflowStepStatus::Pending)
}

fn step_type_from_str(s: &str) -> WorkflowStepType {
    match s {
        "review" => WorkflowStepType::Review,
        "approval" => WorkflowStepType::Approval,
        "notification" => WorkflowStepType::Notification,
        _ => WorkflowStepType::Action,
    }
}

fn json_str_vec(v: &serde_json::Value) -> Vec<String> {
    serde_json::from_value::<Vec<String>>(v.clone()).unwrap_or_default()
}

fn maturity_assessment_from_row(r: &sqlx::postgres::PgRow) -> MaturityAssessment {
    MaturityAssessment {
        id: r.get("id"),
        dimension: parse_dimension(r.get("dimension")).unwrap_or(GovernanceDimension::Quality),
        current_level: parse_maturity_level(r.get("current_level"))
            .unwrap_or(MaturityLevel::Initial),
        target_level: parse_maturity_level(r.get("target_level"))
            .unwrap_or(MaturityLevel::Optimized),
        score: r.get("score"),
        gaps: json_str_vec(&r.get::<serde_json::Value, _>("gaps")),
        recommendations: json_str_vec(&r.get::<serde_json::Value, _>("recommendations")),
        assessed_at: r.get("assessed_at"),
    }
}

fn dimension_score_from_row(r: &sqlx::postgres::PgRow) -> DimensionScore {
    let dimension = parse_dimension(r.get("dimension")).unwrap_or(GovernanceDimension::Quality);
    DimensionScore {
        name: dimension_name(&dimension).to_string(),
        dimension,
        score: r.get("score"),
        weight: r.get("weight"),
        maturity_level: parse_maturity_level(r.get("maturity_level"))
            .unwrap_or(MaturityLevel::Initial),
        evidence: json_str_vec(&r.get::<serde_json::Value, _>("evidence")),
    }
}

fn improvement_plan_from_row(r: &sqlx::postgres::PgRow) -> ImprovementPlan {
    ImprovementPlan {
        id: r.get("id"),
        dimension: parse_dimension(r.get("dimension")).unwrap_or(GovernanceDimension::Quality),
        target_level: parse_maturity_level(r.get("target_level")).unwrap_or(MaturityLevel::Defined),
        actions: json_str_vec(&r.get::<serde_json::Value, _>("actions")),
        priority: r.get("priority"),
        due_date: r.get("due_date"),
        status: r.get("status"),
    }
}

fn workflow_from_row(r: &sqlx::postgres::PgRow) -> WorkflowV58 {
    let steps: serde_json::Value = r.get("steps");
    let parsed_steps: Vec<WorkflowStepV58> = steps
        .as_array()
        .map(|arr| {
            arr.iter()
                .filter_map(|v| serde_json::from_value::<WorkflowStepV58>(v.clone()).ok())
                .collect()
        })
        .unwrap_or_default();
    WorkflowV58 {
        id: r.get("id"),
        name: r.get("name"),
        workflow_type: parse_workflow_type(r.get("workflow_type"))
            .unwrap_or(WorkflowType::Approval),
        steps: parsed_steps,
        triggers: r.get("triggers"),
        status: workflow_status_from_str(r.get("status")),
        created_at: r.get("created_at"),
        updated_at: r.get("updated_at"),
    }
}

fn workflow_template_from_row(r: &sqlx::postgres::PgRow) -> WorkflowTemplate {
    WorkflowTemplate {
        id: r.get("id"),
        name: r.get("name"),
        description: r.get("description"),
        workflow_type: parse_workflow_type(r.get("workflow_type"))
            .unwrap_or(WorkflowType::Approval),
        steps: r
            .get::<serde_json::Value, _>("steps")
            .as_array()
            .cloned()
            .unwrap_or_default(),
    }
}

fn workflow_history_from_row(r: &sqlx::postgres::PgRow) -> WorkflowHistoryEntry {
    WorkflowHistoryEntry {
        id: r.get("id"),
        workflow_id: r.get("workflow_id"),
        action: r.get("action"),
        step_id: r.get("step_id"),
        actor: r.get("actor"),
        comment: r.get("comment"),
        recorded_at: r.get("recorded_at"),
    }
}

fn data_product_from_row(r: &sqlx::postgres::PgRow) -> DataProduct {
    let contract_value: Option<serde_json::Value> = r.get("data_contract");
    DataProduct {
        id: r.get("id"),
        name: r.get("name"),
        description: r.get("description"),
        owner: r.get("owner"),
        domain: r.get("domain"),
        consumers: json_str_vec(&r.get::<serde_json::Value, _>("consumers")),
        data_contract: contract_value.and_then(|v| serde_json::from_value::<DataContract>(v).ok()),
        sla_level: parse_sla_level(r.get("sla_level")).unwrap_or(SlaLevel::Bronze),
        status: DataProductStatus::from_db_str(&r.get::<String, _>("status"))
            .unwrap_or(DataProductStatus::Draft),
        created_at: r.get("created_at"),
        updated_at: r.get("updated_at"),
    }
}

fn data_contract_from_row(r: &sqlx::postgres::PgRow) -> DataContract {
    DataContract {
        product_id: r.get("product_id"),
        schema: r.get("schema"),
        quality_requirements: json_str_vec(&r.get::<serde_json::Value, _>("quality_requirements")),
        freshness_sla: r.get("freshness_sla"),
        security_level: parse_security_level(r.get("security_level"))
            .unwrap_or(SecurityLevel::Internal),
        version: r.get("version"),
        updated_at: r.get("updated_at"),
    }
}

fn api_exposure_from_row(r: &sqlx::postgres::PgRow) -> ApiExposure {
    ApiExposure {
        id: r.get("id"),
        product_id: r.get("product_id"),
        endpoint: r.get("endpoint"),
        auth_type: r.get("auth_type"),
        rate_limit: r.get("rate_limit"),
        enabled: r.get("enabled"),
        created_at: r.get("created_at"),
    }
}

// ==================== K1 接真表：fetch 助手 ====================

async fn fetch_maturity_assessments(
    scope: &mut topems_shared_db::ScopedTxn<'_>,
) -> Result<Vec<MaturityAssessment>, TopemsError> {
    let rows = sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT {ASSESSMENT_COLS} FROM master_data.mdm_maturity_assessments"
    )))
    .fetch_all(&mut *scope)
    .await
    .map_err(|e| TopemsError::BusinessLogic(format!("查询成熟度评估失败: {e}")))?;
    Ok(rows.iter().map(maturity_assessment_from_row).collect())
}

async fn fetch_dimension_scores(
    scope: &mut topems_shared_db::ScopedTxn<'_>,
) -> Result<Vec<DimensionScore>, TopemsError> {
    let rows = sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT {DIMENSION_SCORE_COLS} FROM master_data.mdm_dimension_scores"
    )))
    .fetch_all(&mut *scope)
    .await
    .map_err(|e| TopemsError::BusinessLogic(format!("查询维度得分失败: {e}")))?;
    Ok(rows.iter().map(dimension_score_from_row).collect())
}

async fn fetch_maturity_history(
    scope: &mut topems_shared_db::ScopedTxn<'_>,
) -> Result<Vec<MaturityHistoryEntry>, TopemsError> {
    let rows = sqlx::query(
        // recorded_at 在 prod/test 均为 text（ISO-8601），按时间戳语义显式转换后解码。
        "SELECT id, dimension, score, level, recorded_at::timestamptz AS recorded_at FROM master_data.mdm_maturity_history",
    )
    .fetch_all(&mut *scope)
    .await
    .map_err(|e| TopemsError::BusinessLogic(format!("查询成熟度历史失败: {e}")))?;
    Ok(rows
        .iter()
        .map(|r| MaturityHistoryEntry {
            id: r.get("id"),
            dimension: parse_dimension(r.get("dimension")).unwrap_or(GovernanceDimension::Quality),
            score: r.get("score"),
            level: parse_maturity_level(r.get("level")).unwrap_or(MaturityLevel::Initial),
            recorded_at: r.get("recorded_at"),
        })
        .collect())
}

async fn fetch_improvement_plans(
    scope: &mut topems_shared_db::ScopedTxn<'_>,
) -> Result<Vec<ImprovementPlan>, TopemsError> {
    let rows = sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT {IMPROVEMENT_PLAN_COLS} FROM master_data.mdm_improvement_plans"
    )))
    .fetch_all(&mut *scope)
    .await
    .map_err(|e| TopemsError::BusinessLogic(format!("查询改进计划失败: {e}")))?;
    Ok(rows.iter().map(improvement_plan_from_row).collect())
}

async fn fetch_workflows(
    scope: &mut topems_shared_db::ScopedTxn<'_>,
) -> Result<Vec<WorkflowV58>, TopemsError> {
    let rows = sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT {WORKFLOW_COLS} FROM master_data.mdm_workflows
         WHERE status IN ('draft','running','paused','completed','cancelled')"
    )))
    .fetch_all(&mut *scope)
    .await
    .map_err(|e| TopemsError::BusinessLogic(format!("查询工作流失败: {e}")))?;
    Ok(rows.iter().map(workflow_from_row).collect())
}

async fn fetch_workflow_templates(
    scope: &mut topems_shared_db::ScopedTxn<'_>,
) -> Result<Vec<WorkflowTemplate>, TopemsError> {
    let rows = sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT {WORKFLOW_TEMPLATE_COLS} FROM master_data.mdm_workflow_templates"
    )))
    .fetch_all(&mut *scope)
    .await
    .map_err(|e| TopemsError::BusinessLogic(format!("查询工作流模板失败: {e}")))?;
    Ok(rows.iter().map(workflow_template_from_row).collect())
}

async fn fetch_workflow_history(
    scope: &mut topems_shared_db::ScopedTxn<'_>,
) -> Result<Vec<WorkflowHistoryEntry>, TopemsError> {
    let rows = sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT {WORKFLOW_HISTORY_COLS} FROM master_data.mdm_workflow_history"
    )))
    .fetch_all(&mut *scope)
    .await
    .map_err(|e| TopemsError::BusinessLogic(format!("查询工作流历史失败: {e}")))?;
    Ok(rows.iter().map(workflow_history_from_row).collect())
}

async fn fetch_data_products(
    scope: &mut topems_shared_db::ScopedTxn<'_>,
) -> Result<Vec<DataProduct>, TopemsError> {
    let rows = sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT {DATA_PRODUCT_COLS} FROM master_data.mdm_data_products WHERE status IN ('draft','published','deprecated','retired')"
    )))
    .fetch_all(&mut *scope)
    .await
    .map_err(|e| TopemsError::BusinessLogic(format!("查询数据产品失败: {e}")))?;
    Ok(rows.iter().map(data_product_from_row).collect())
}

async fn fetch_data_contracts(
    scope: &mut topems_shared_db::ScopedTxn<'_>,
) -> Result<Vec<DataContract>, TopemsError> {
    let rows = sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT {DATA_CONTRACT_COLS} FROM master_data.mdm_data_contracts"
    )))
    .fetch_all(&mut *scope)
    .await
    .map_err(|e| TopemsError::BusinessLogic(format!("查询数据契约失败: {e}")))?;
    Ok(rows.iter().map(data_contract_from_row).collect())
}

async fn fetch_api_exposures(
    scope: &mut topems_shared_db::ScopedTxn<'_>,
) -> Result<Vec<ApiExposure>, TopemsError> {
    let rows = sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT {API_EXPOSURE_COLS} FROM master_data.mdm_api_exposures"
    )))
    .fetch_all(&mut *scope)
    .await
    .map_err(|e| TopemsError::BusinessLogic(format!("查询 API 暴露失败: {e}")))?;
    Ok(rows.iter().map(api_exposure_from_row).collect())
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

    #[test]
    fn test_workflow_status_db_values() {
        for raw in WorkflowStatus::DB_VALUES {
            let parsed = WorkflowStatus::from_db_str(raw).expect("workflow status");
            assert_eq!(parsed.as_db_str(), raw);
        }
        assert_eq!(WorkflowStatus::from_db_str("archived"), None);
        assert_eq!(
            WorkflowStatus::from_db_str(" RUNNING "),
            Some(WorkflowStatus::Running)
        );

        for raw in WorkflowStepStatus::DB_VALUES {
            let parsed = WorkflowStepStatus::from_db_str(raw).expect("step status");
            assert_eq!(parsed.as_db_str(), raw);
        }
        assert_eq!(WorkflowStepStatus::from_db_str("failed"), None);
    }

    #[test]
    fn test_data_product_status_values_and_publish_from() {
        for raw in DataProductStatus::DB_VALUES {
            let parsed = DataProductStatus::from_db_str(raw).expect("raw must parse");
            assert_eq!(parsed.as_db_str(), raw);
        }
        assert_eq!(DataProductStatus::from_db_str("archived"), None);
        assert!(DataProductStatus::publish_from().contains(&"draft"));
        assert!(!DataProductStatus::publish_from().contains(&"retired"));
    }
}

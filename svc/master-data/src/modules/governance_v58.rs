//! STATUS: WIRED | Routes registered + DB tables initialized + Handlers implemented
//! V58.0 MDM AC-30: 主数据治理成熟度 + 自动化工作流 + 数据产品化
//!
//! 核心能力：
//! - 治理成熟度 (GovernanceMaturity): 成熟度评估、维度评分、改进计划、进度追踪、基准对比
//! - 自动化工作流 (MDMWorkflowEngine): 工作流模板、步骤管理、审批/驳回、状态流转
//! - 数据产品化 (DataProductManager): 数据产品管理、数据契约、API暴露、血缘追踪

use axum::{extract::Path, extract::Query, extract::State, Json};
use serde::Deserialize;
use sqlx::Row;
use topems_shared_core::error::TopemsError;
use topems_shared_core::response::ApiResponse;

use crate::shared::AppState;

// K1 接真表：SQL 错误统一出口（Ok 透传 / Err → Json 500）
macro_rules! db_exec {
    ($expr:expr) => {
        match $expr {
            Ok(v) => v,
            Err(e) => return Json(ApiResponse::error(500, &e.to_string())),
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

struct GovernanceMaturity;

impl GovernanceMaturity {
    async fn assess_maturity(
        db: &sqlx::PgPool,
        dimension: GovernanceDimension,
        target_level: MaturityLevel,
    ) -> Result<MaturityAssessment, TopemsError> {
        let now = chrono::Utc::now().to_rfc3339();
        let scores = fetch_dimension_scores(db).await?;
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

        sqlx::query(&format!(
            "INSERT INTO master_data.mdm_maturity_assessments ({ASSESSMENT_COLS}, tenant_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8, COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))"
        ))
        .bind(&assessment.id)
        .bind(dimension_str(&assessment.dimension))
        .bind(maturity_level_str(&assessment.current_level))
        .bind(maturity_level_str(&assessment.target_level))
        .bind(assessment.score)
        .bind(serde_json::to_value(&assessment.gaps).unwrap_or_default())
        .bind(serde_json::to_value(&assessment.recommendations).unwrap_or_default())
        .bind(&assessment.assessed_at)
        .execute(db)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("写入成熟度评估失败: {e}")))?;

        sqlx::query(
            "INSERT INTO master_data.mdm_maturity_history (id, dimension, score, level, recorded_at, tenant_id)
             VALUES ($1,$2,$3,$4,$5, COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))",
        )
        .bind(uuid::Uuid::new_v4().to_string())
        .bind(dimension_str(&assessment.dimension))
        .bind(assessment.score)
        .bind(maturity_level_str(&assessment.current_level))
        .bind(&now)
        .execute(db)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("写入成熟度历史失败: {e}")))?;

        Ok(assessment)
    }

    async fn get_assessment(
        db: &sqlx::PgPool,
        id: &str,
    ) -> Result<Option<MaturityAssessment>, TopemsError> {
        let row = sqlx::query(&format!(
            "SELECT {ASSESSMENT_COLS} FROM master_data.mdm_maturity_assessments WHERE id = $1"
        ))
        .bind(id)
        .fetch_optional(db)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("查询成熟度评估失败: {e}")))?;
        Ok(row.map(|r| maturity_assessment_from_row(&r)))
    }

    async fn get_dimension_scores(db: &sqlx::PgPool) -> Result<Vec<DimensionScore>, TopemsError> {
        fetch_dimension_scores(db).await
    }

    async fn create_improvement_plan(
        db: &sqlx::PgPool,
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

        sqlx::query(&format!(
            "INSERT INTO master_data.mdm_improvement_plans ({IMPROVEMENT_PLAN_COLS}, tenant_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7, COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))"
        ))
        .bind(&plan.id)
        .bind(dimension_str(&plan.dimension))
        .bind(maturity_level_str(&plan.target_level))
        .bind(serde_json::to_value(&plan.actions).unwrap_or_default())
        .bind(&plan.priority)
        .bind(&plan.due_date)
        .bind(&plan.status)
        .execute(db)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("写入改进计划失败: {e}")))?;

        Ok(plan)
    }

    async fn track_progress(db: &sqlx::PgPool) -> Result<Vec<MaturityProgress>, TopemsError> {
        let scores = fetch_dimension_scores(db).await?;
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
        Ok(progress)
    }

    async fn get_maturity_history(
        db: &sqlx::PgPool,
        dimension: Option<&str>,
    ) -> Result<Vec<MaturityHistoryEntry>, TopemsError> {
        let history = fetch_maturity_history(db).await?;
        Ok(match dimension {
            Some(d) => history
                .iter()
                .filter(|h| dimension_str(&h.dimension) == d)
                .cloned()
                .collect(),
            None => history,
        })
    }

    async fn get_benchmark(db: &sqlx::PgPool) -> Result<Vec<BenchmarkData>, TopemsError> {
        let scores = fetch_dimension_scores(db).await?;
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

struct MDMWorkflowEngine;

impl MDMWorkflowEngine {
    async fn create_workflow(
        db: &sqlx::PgPool,
        name: String,
        workflow_type: WorkflowType,
        steps: Vec<WorkflowStepV58>,
    ) -> Result<WorkflowV58, TopemsError> {
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

        sqlx::query(&format!(
            "INSERT INTO master_data.mdm_workflows ({WORKFLOW_COLS}, tenant_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8, COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))"
        ))
        .bind(&workflow.id)
        .bind(&workflow.name)
        .bind(workflow_type_str(&workflow.workflow_type))
        .bind(serde_json::to_value(&workflow.steps).unwrap_or_default())
        .bind(serde_json::to_value(&workflow.triggers).unwrap_or_default())
        .bind(status_str(&workflow.status))
        .bind(&workflow.created_at)
        .bind(&workflow.updated_at)
        .execute(db)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("创建工作流失败: {e}")))?;

        Ok(workflow)
    }

    async fn start_workflow(
        db: &sqlx::PgPool,
        workflow_id: &str,
    ) -> Result<Option<WorkflowV58>, TopemsError> {
        let workflows = fetch_workflows(db).await?;
        let Some(mut workflow) = workflows.into_iter().find(|w| w.id == workflow_id) else {
            return Ok(None);
        };
        if workflow.status != WorkflowStatus::Draft {
            return Ok(None);
        }
        workflow.status = WorkflowStatus::Running;
        workflow.updated_at = chrono::Utc::now().to_rfc3339();

        if let Some(first_step) = workflow.steps.first_mut() {
            first_step.status = WorkflowStepStatus::InProgress;
            first_step.started_at = Some(chrono::Utc::now().to_rfc3339());
        }

        let mut tx = db
            .begin()
            .await
            .map_err(|e| TopemsError::BusinessLogic(format!("开启事务失败: {e}")))?;
        sqlx::query(
            "UPDATE master_data.mdm_workflows SET steps = $2, status = $3, updated_at = $4 WHERE id = $1 AND (COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000') IS NULL OR tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))",
        )
        .bind(workflow_id)
        .bind(serde_json::to_value(&workflow.steps).unwrap_or_default())
        .bind(status_str(&workflow.status))
        .bind(&workflow.updated_at)
        .execute(&mut *tx)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("更新工作流失败: {e}")))?;
        sqlx::query(
            "INSERT INTO master_data.mdm_workflow_history (id, workflow_id, action, step_id, actor, comment, recorded_at, tenant_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7, COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))",
        )
        .bind(uuid::Uuid::new_v4().to_string())
        .bind(workflow_id)
        .bind("start")
        .bind(Option::<String>::None)
        .bind("system")
        .bind(Option::<String>::None)
        .bind(&workflow.updated_at)
        .execute(&mut *tx)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("写入工作流历史失败: {e}")))?;
        tx.commit()
            .await
            .map_err(|e| TopemsError::BusinessLogic(format!("提交事务失败: {e}")))?;

        Ok(Some(workflow))
    }

    async fn advance_step(
        db: &sqlx::PgPool,
        workflow_id: &str,
    ) -> Result<Option<WorkflowV58>, TopemsError> {
        let workflows = fetch_workflows(db).await?;
        let Some(mut workflow) = workflows.into_iter().find(|w| w.id == workflow_id) else {
            return Ok(None);
        };
        if workflow.status != WorkflowStatus::Running {
            return Ok(None);
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

        let mut tx = db
            .begin()
            .await
            .map_err(|e| TopemsError::BusinessLogic(format!("开启事务失败: {e}")))?;
        sqlx::query(
            "UPDATE master_data.mdm_workflows SET steps = $2, status = $3, updated_at = $4 WHERE id = $1 AND (COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000') IS NULL OR tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))",
        )
        .bind(workflow_id)
        .bind(serde_json::to_value(&workflow.steps).unwrap_or_default())
        .bind(status_str(&workflow.status))
        .bind(&workflow.updated_at)
        .execute(&mut *tx)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("更新工作流失败: {e}")))?;
        tx.commit()
            .await
            .map_err(|e| TopemsError::BusinessLogic(format!("提交事务失败: {e}")))?;

        Ok(Some(workflow))
    }

    async fn get_workflow_status(
        db: &sqlx::PgPool,
        workflow_id: &str,
    ) -> Result<Option<WorkflowV58>, TopemsError> {
        let workflows = fetch_workflows(db).await?;
        Ok(workflows.into_iter().find(|w| w.id == workflow_id))
    }

    async fn list_workflows(
        db: &sqlx::PgPool,
        workflow_type: Option<&str>,
        status: Option<&str>,
    ) -> Result<Vec<WorkflowV58>, TopemsError> {
        let workflows = fetch_workflows(db).await?;
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

    async fn get_templates(db: &sqlx::PgPool) -> Result<Vec<WorkflowTemplate>, TopemsError> {
        fetch_workflow_templates(db).await
    }

    async fn approve_step(
        db: &sqlx::PgPool,
        workflow_id: &str,
        step_id: &str,
    ) -> Result<Option<WorkflowV58>, TopemsError> {
        let workflows = fetch_workflows(db).await?;
        let Some(mut workflow) = workflows.into_iter().find(|w| w.id == workflow_id) else {
            return Ok(None);
        };

        let Some(step) = workflow.steps.iter_mut().find(|s| s.id == step_id) else {
            return Ok(None);
        };
        if step.status != WorkflowStepStatus::InProgress {
            return Ok(None);
        }

        let now = chrono::Utc::now().to_rfc3339();
        step.status = WorkflowStepStatus::Approved;
        step.completed_at = Some(now.clone());
        let actor = step
            .assignee
            .clone()
            .unwrap_or_else(|| "system".to_string());
        workflow.updated_at = now;

        let mut tx = db
            .begin()
            .await
            .map_err(|e| TopemsError::BusinessLogic(format!("开启事务失败: {e}")))?;
        sqlx::query(
            "UPDATE master_data.mdm_workflows SET steps = $2, status = $3, updated_at = $4 WHERE id = $1 AND (COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000') IS NULL OR tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))",
        )
        .bind(workflow_id)
        .bind(serde_json::to_value(&workflow.steps).unwrap_or_default())
        .bind(status_str(&workflow.status))
        .bind(&workflow.updated_at)
        .execute(&mut *tx)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("更新工作流失败: {e}")))?;
        sqlx::query(
            "INSERT INTO master_data.mdm_workflow_history (id, workflow_id, action, step_id, actor, comment, recorded_at, tenant_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7, COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))",
        )
        .bind(uuid::Uuid::new_v4().to_string())
        .bind(workflow_id)
        .bind("approve")
        .bind(step_id)
        .bind(&actor)
        .bind(Option::<String>::None)
        .bind(&workflow.updated_at)
        .execute(&mut *tx)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("写入工作流历史失败: {e}")))?;
        tx.commit()
            .await
            .map_err(|e| TopemsError::BusinessLogic(format!("提交事务失败: {e}")))?;

        Ok(Some(workflow))
    }

    async fn reject_step(
        db: &sqlx::PgPool,
        workflow_id: &str,
        step_id: &str,
    ) -> Result<Option<WorkflowV58>, TopemsError> {
        let workflows = fetch_workflows(db).await?;
        let Some(mut workflow) = workflows.into_iter().find(|w| w.id == workflow_id) else {
            return Ok(None);
        };

        let Some(step) = workflow.steps.iter_mut().find(|s| s.id == step_id) else {
            return Ok(None);
        };
        if step.status != WorkflowStepStatus::InProgress {
            return Ok(None);
        }

        let now = chrono::Utc::now().to_rfc3339();
        step.status = WorkflowStepStatus::Rejected;
        step.completed_at = Some(now.clone());
        let actor = step
            .assignee
            .clone()
            .unwrap_or_else(|| "system".to_string());
        workflow.status = WorkflowStatus::Cancelled;
        workflow.updated_at = now;

        let mut tx = db
            .begin()
            .await
            .map_err(|e| TopemsError::BusinessLogic(format!("开启事务失败: {e}")))?;
        sqlx::query(
            "UPDATE master_data.mdm_workflows SET steps = $2, status = $3, updated_at = $4 WHERE id = $1 AND (COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000') IS NULL OR tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))",
        )
        .bind(workflow_id)
        .bind(serde_json::to_value(&workflow.steps).unwrap_or_default())
        .bind(status_str(&workflow.status))
        .bind(&workflow.updated_at)
        .execute(&mut *tx)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("更新工作流失败: {e}")))?;
        sqlx::query(
            "INSERT INTO master_data.mdm_workflow_history (id, workflow_id, action, step_id, actor, comment, recorded_at, tenant_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7, COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))",
        )
        .bind(uuid::Uuid::new_v4().to_string())
        .bind(workflow_id)
        .bind("reject")
        .bind(step_id)
        .bind(&actor)
        .bind(Option::<String>::None)
        .bind(&workflow.updated_at)
        .execute(&mut *tx)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("写入工作流历史失败: {e}")))?;
        tx.commit()
            .await
            .map_err(|e| TopemsError::BusinessLogic(format!("提交事务失败: {e}")))?;

        Ok(Some(workflow))
    }

    async fn get_workflow_history(
        db: &sqlx::PgPool,
        workflow_id: &str,
    ) -> Result<Vec<WorkflowHistoryEntry>, TopemsError> {
        let history = fetch_workflow_history(db).await?;
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

struct DataProductManager;

impl DataProductManager {
    async fn create_data_product(
        db: &sqlx::PgPool,
        name: String,
        description: String,
        owner: String,
        domain: String,
        sla_level: SlaLevel,
    ) -> Result<DataProduct, TopemsError> {
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

        sqlx::query(&format!(
            "INSERT INTO master_data.mdm_data_products ({DATA_PRODUCT_COLS}, tenant_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))"
        ))
        .bind(&product.id)
        .bind(&product.name)
        .bind(&product.description)
        .bind(&product.owner)
        .bind(&product.domain)
        .bind(serde_json::to_value(&product.consumers).unwrap_or_default())
        .bind(Option::<serde_json::Value>::None)
        .bind(sla_level_str(&product.sla_level))
        .bind(product_status_str(&product.status))
        .bind(&product.created_at)
        .bind(&product.updated_at)
        .execute(db)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("创建数据产品失败: {e}")))?;

        Ok(product)
    }

    async fn get_data_product(
        db: &sqlx::PgPool,
        id: &str,
    ) -> Result<Option<DataProduct>, TopemsError> {
        let products = fetch_data_products(db).await?;
        Ok(products.into_iter().find(|p| p.id == id))
    }

    async fn list_data_products(
        db: &sqlx::PgPool,
        domain: Option<&str>,
        status: Option<&str>,
    ) -> Result<Vec<DataProduct>, TopemsError> {
        let products = fetch_data_products(db).await?;
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
        db: &sqlx::PgPool,
        product_id: &str,
        schema: serde_json::Value,
        quality_requirements: Vec<String>,
        freshness_sla: String,
        security_level: SecurityLevel,
    ) -> Result<Option<DataContract>, TopemsError> {
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

        let mut tx = db
            .begin()
            .await
            .map_err(|e| TopemsError::BusinessLogic(format!("开启事务失败: {e}")))?;
        sqlx::query(&format!(
            "INSERT INTO master_data.mdm_data_contracts ({DATA_CONTRACT_COLS}, tenant_id) VALUES ($1,$2,$3,$4,$5,$6,$7, COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))"
        ))
        .bind(&contract.product_id)
        .bind(serde_json::to_value(&contract.schema).unwrap_or_default())
        .bind(serde_json::to_value(&contract.quality_requirements).unwrap_or_default())
        .bind(&contract.freshness_sla)
        .bind(security_level_str(&contract.security_level))
        .bind(&contract.version)
        .bind(&contract.updated_at)
        .execute(&mut *tx)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("写入数据契约失败: {e}")))?;
        sqlx::query(
            "UPDATE master_data.mdm_data_products
             SET data_contract = $2, status = 'published', updated_at = $3 WHERE id = $1 AND (COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000') IS NULL OR tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))",
        )
        .bind(product_id)
        .bind(serde_json::to_value(&contract).unwrap_or_default())
        .bind(&now)
        .execute(&mut *tx)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("更新数据产品失败: {e}")))?;
        tx.commit()
            .await
            .map_err(|e| TopemsError::BusinessLogic(format!("提交事务失败: {e}")))?;

        Ok(Some(contract))
    }

    async fn get_contract_status(
        db: &sqlx::PgPool,
        product_id: &str,
    ) -> Result<Option<ContractStatus>, TopemsError> {
        let products = fetch_data_products(db).await?;
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
            last_verified_at: Some(chrono::Utc::now().to_rfc3339()),
            issues,
        }))
    }

    async fn expose_as_api(
        db: &sqlx::PgPool,
        product_id: &str,
        auth_type: String,
        rate_limit: String,
    ) -> Result<Option<ApiExposure>, TopemsError> {
        let Some(product) = Self::get_data_product(db, product_id).await? else {
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
            created_at: chrono::Utc::now().to_rfc3339(),
        };

        sqlx::query(&format!(
            "INSERT INTO master_data.mdm_api_exposures ({API_EXPOSURE_COLS}, tenant_id) VALUES ($1,$2,$3,$4,$5,$6,$7, COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))"
        ))
        .bind(&exposure.id)
        .bind(&exposure.product_id)
        .bind(&exposure.endpoint)
        .bind(&exposure.auth_type)
        .bind(&exposure.rate_limit)
        .bind(exposure.enabled)
        .bind(&exposure.created_at)
        .execute(db)
        .await
        .map_err(|e| TopemsError::BusinessLogic(format!("写入 API 暴露失败: {e}")))?;

        Ok(Some(exposure))
    }

    async fn get_consumers(
        db: &sqlx::PgPool,
        product_id: &str,
    ) -> Result<Vec<ConsumerInfo>, TopemsError> {
        let products = fetch_data_products(db).await?;
        let Some(product) = products.iter().find(|p| p.id == product_id) else {
            return Ok(Vec::new());
        };

        Ok(product
            .consumers
            .iter()
            .map(|c| ConsumerInfo {
                consumer_id: c.clone(),
                consumer_name: format!("Consumer {}", c),
                subscribed_at: chrono::Utc::now().to_rfc3339(),
                status: "active".to_string(),
            })
            .collect())
    }

    async fn get_product_lineage(
        db: &sqlx::PgPool,
        product_id: &str,
    ) -> Result<ProductLineage, TopemsError> {
        let products = fetch_data_products(db).await?;
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
    path = "/mdm-v58/maturity/assess",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "governance_v58"
)]
pub async fn assess_maturity(
    State(state): State<AppState>,
    Json(req): Json<AssessMaturityRequest>,
) -> Json<ApiResponse<MaturityAssessment>> {
    let dimension = match parse_dimension(&req.dimension) {
        Some(d) => d,
        None => return Json(ApiResponse::error(400, "无效的维度类型")),
    };
    let target = req
        .target_level
        .as_deref()
        .and_then(parse_maturity_level)
        .unwrap_or(MaturityLevel::Optimized);

    let result = db_exec!(GovernanceMaturity::assess_maturity(&state.db, dimension, target).await);
    Json(ApiResponse::success(result, "成熟度评估完成"))
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
    Query(params): Query<GetAssessmentQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Some(id) = params.id {
        match db_exec!(GovernanceMaturity::get_assessment(&state.db, &id).await) {
            Some(a) => Json(ApiResponse::success(serde_json::json!(a), "成熟度评估详情")),
            None => Json(ApiResponse::error(404, "未找到评估记录")),
        }
    } else {
        let scores = db_exec!(GovernanceMaturity::get_dimension_scores(&state.db).await);
        Json(ApiResponse::success(
            serde_json::json!({"dimension_scores": scores}),
            "成熟度概览",
        ))
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
) -> Json<ApiResponse<Vec<DimensionScore>>> {
    let scores = db_exec!(GovernanceMaturity::get_dimension_scores(&state.db).await);
    Json(ApiResponse::success(scores, "维度评分列表"))
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
    Json(req): Json<ImprovementPlanRequest>,
) -> Json<ApiResponse<ImprovementPlan>> {
    let dimension = match parse_dimension(&req.dimension) {
        Some(d) => d,
        None => return Json(ApiResponse::error(400, "无效的维度类型")),
    };
    let target = match parse_maturity_level(&req.target_level) {
        Some(l) => l,
        None => return Json(ApiResponse::error(400, "无效的目标等级")),
    };

    let plan = db_exec!(
        GovernanceMaturity::create_improvement_plan(&state.db, dimension, target, req.actions)
            .await
    );
    Json(ApiResponse::success(plan, "改进计划已创建"))
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
) -> Json<ApiResponse<Vec<MaturityProgress>>> {
    let progress = db_exec!(GovernanceMaturity::track_progress(&state.db).await);
    Json(ApiResponse::success(progress, "成熟度进度"))
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
    Query(params): Query<MaturityHistoryQuery>,
) -> Json<ApiResponse<Vec<MaturityHistoryEntry>>> {
    let history = db_exec!(
        GovernanceMaturity::get_maturity_history(&state.db, params.dimension.as_deref()).await
    );
    Json(ApiResponse::success(history, "成熟度历史"))
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
pub async fn get_benchmark(State(state): State<AppState>) -> Json<ApiResponse<Vec<BenchmarkData>>> {
    let benchmark = db_exec!(GovernanceMaturity::get_benchmark(&state.db).await);
    Json(ApiResponse::success(benchmark, "基准对比数据"))
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
    Json(req): Json<CreateWorkflowRequest>,
) -> Json<ApiResponse<WorkflowV58>> {
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

    let workflow = db_exec!(
        MDMWorkflowEngine::create_workflow(&state.db, req.name, workflow_type, steps).await
    );
    Json(ApiResponse::success(workflow, "工作流已创建"))
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
    Path(id): Path<String>,
) -> Json<ApiResponse<WorkflowV58>> {
    match db_exec!(MDMWorkflowEngine::start_workflow(&state.db, &id).await) {
        Some(w) => Json(ApiResponse::success(w, "工作流已启动")),
        None => Json(ApiResponse::error(400, "工作流无法启动")),
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
    Path(id): Path<String>,
    Json(_req): Json<AdvanceStepRequest>,
) -> Json<ApiResponse<WorkflowV58>> {
    match db_exec!(MDMWorkflowEngine::advance_step(&state.db, &id).await) {
        Some(w) => Json(ApiResponse::success(w, "步骤已推进")),
        None => Json(ApiResponse::error(400, "无法推进工作流")),
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
    Path(id): Path<String>,
) -> Json<ApiResponse<WorkflowV58>> {
    match db_exec!(MDMWorkflowEngine::get_workflow_status(&state.db, &id).await) {
        Some(w) => Json(ApiResponse::success(w, "工作流状态")),
        None => Json(ApiResponse::error(404, "未找到工作流")),
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
    Query(params): Query<ListWorkflowsQuery>,
) -> Json<ApiResponse<Vec<WorkflowV58>>> {
    let workflows = db_exec!(
        MDMWorkflowEngine::list_workflows(
            &state.db,
            params.workflow_type.as_deref(),
            params.status.as_deref()
        )
        .await
    );
    Json(ApiResponse::success(workflows, "工作流列表"))
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
) -> Json<ApiResponse<Vec<WorkflowTemplate>>> {
    let templates = db_exec!(MDMWorkflowEngine::get_templates(&state.db).await);
    Json(ApiResponse::success(templates, "工作流模板"))
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
    Path(id): Path<String>,
    Json(req): Json<ApproveStepRequest>,
) -> Json<ApiResponse<WorkflowV58>> {
    let (workflow_id, step_id) = parse_step_path(&id);

    match db_exec!(MDMWorkflowEngine::approve_step(&state.db, &workflow_id, &step_id).await) {
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
    Path(id): Path<String>,
    Json(req): Json<RejectStepRequest>,
) -> Json<ApiResponse<WorkflowV58>> {
    let (workflow_id, step_id) = parse_step_path(&id);

    match db_exec!(MDMWorkflowEngine::reject_step(&state.db, &workflow_id, &step_id).await) {
        Some(w) => Json(ApiResponse::success(
            w,
            &req.reason.unwrap_or_else(|| "步骤已拒绝".to_string()),
        )),
        None => Json(ApiResponse::error(400, "无法拒绝该步骤")),
    }
}

pub async fn get_workflow_history(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<Vec<WorkflowHistoryEntry>>> {
    let history = db_exec!(MDMWorkflowEngine::get_workflow_history(&state.db, &id).await);
    Json(ApiResponse::success(history, "工作流历史"))
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
    Json(req): Json<CreateDataProductRequest>,
) -> Json<ApiResponse<DataProduct>> {
    let sla = req
        .sla_level
        .as_deref()
        .and_then(parse_sla_level)
        .unwrap_or(SlaLevel::Silver);

    let product = db_exec!(
        DataProductManager::create_data_product(
            &state.db,
            req.name,
            req.description,
            req.owner,
            req.domain,
            sla
        )
        .await
    );
    Json(ApiResponse::success(product, "数据产品已创建"))
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
    Path(id): Path<String>,
) -> Json<ApiResponse<DataProduct>> {
    match db_exec!(DataProductManager::get_data_product(&state.db, &id).await) {
        Some(p) => Json(ApiResponse::success(p, "数据产品详情")),
        None => Json(ApiResponse::error(404, "未找到数据产品")),
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
    Query(params): Query<ListDataProductsQuery>,
) -> Json<ApiResponse<Vec<DataProduct>>> {
    let products = db_exec!(
        DataProductManager::list_data_products(
            &state.db,
            params.domain.as_deref(),
            params.status.as_deref()
        )
        .await
    );
    Json(ApiResponse::success(products, "数据产品列表"))
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
    Path(id): Path<String>,
    Json(req): Json<UpdateContractRequest>,
) -> Json<ApiResponse<DataContract>> {
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

    match db_exec!(
        DataProductManager::update_contract(
            &state.db,
            &id,
            req.schema,
            requirements,
            sla,
            security
        )
        .await
    ) {
        Some(c) => Json(ApiResponse::success(c, "数据契约已更新")),
        None => Json(ApiResponse::error(404, "未找到数据产品")),
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
    Path(id): Path<String>,
) -> Json<ApiResponse<ContractStatus>> {
    match db_exec!(DataProductManager::get_contract_status(&state.db, &id).await) {
        Some(s) => Json(ApiResponse::success(s, "契约状态")),
        None => Json(ApiResponse::error(404, "未找到数据产品")),
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
    Path(id): Path<String>,
    Json(req): Json<ExposeApiRequest>,
) -> Json<ApiResponse<ApiExposure>> {
    let auth = req.auth_type.unwrap_or_else(|| "bearer".to_string());
    let rate = req.rate_limit.unwrap_or_else(|| "1000/min".to_string());

    match db_exec!(DataProductManager::expose_as_api(&state.db, &id, auth, rate).await) {
        Some(e) => Json(ApiResponse::success(e, "API 已暴露")),
        None => Json(ApiResponse::error(404, "未找到数据产品")),
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
    Path(id): Path<String>,
) -> Json<ApiResponse<Vec<ConsumerInfo>>> {
    let consumers = db_exec!(DataProductManager::get_consumers(&state.db, &id).await);
    Json(ApiResponse::success(consumers, "消费者列表"))
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
    Path(id): Path<String>,
) -> Json<ApiResponse<ProductLineage>> {
    let lineage = db_exec!(DataProductManager::get_product_lineage(&state.db, &id).await);
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

// ==================== K1 接真表：映射层 ====================

const ASSESSMENT_COLS: &str =
    "id, dimension, current_level, target_level, score, gaps, recommendations, assessed_at";
const DIMENSION_SCORE_COLS: &str = "dimension, score, weight, maturity_level, evidence";
const IMPROVEMENT_PLAN_COLS: &str =
    "id, dimension, target_level, actions, priority, due_date, status";
const WORKFLOW_COLS: &str =
    "id, name, workflow_type, steps, triggers, status, created_at, updated_at";
const WORKFLOW_TEMPLATE_COLS: &str = "id, name, description, workflow_type, steps";
const WORKFLOW_HISTORY_COLS: &str = "id, workflow_id, action, step_id, actor, comment, recorded_at";
const DATA_PRODUCT_COLS: &str = "id, name, description, owner, domain, consumers, data_contract, sla_level, status, created_at, updated_at";
const DATA_CONTRACT_COLS: &str =
    "product_id, schema, quality_requirements, freshness_sla, security_level, version, updated_at";
const API_EXPOSURE_COLS: &str =
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

fn workflow_status_from_str(s: &str) -> WorkflowStatus {
    match s {
        "running" => WorkflowStatus::Running,
        "paused" => WorkflowStatus::Paused,
        "completed" => WorkflowStatus::Completed,
        "cancelled" => WorkflowStatus::Cancelled,
        _ => WorkflowStatus::Draft,
    }
}

fn step_status_from_str(s: &str) -> WorkflowStepStatus {
    match s {
        "in_progress" => WorkflowStepStatus::InProgress,
        "approved" => WorkflowStepStatus::Approved,
        "rejected" => WorkflowStepStatus::Rejected,
        "skipped" => WorkflowStepStatus::Skipped,
        _ => WorkflowStepStatus::Pending,
    }
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
    DimensionScore {
        dimension: parse_dimension(r.get("dimension")).unwrap_or(GovernanceDimension::Quality),
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
        status: match r.get::<String, _>("status").as_str() {
            "published" => DataProductStatus::Published,
            "deprecated" => DataProductStatus::Deprecated,
            "retired" => DataProductStatus::Retired,
            _ => DataProductStatus::Draft,
        },
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
    db: &sqlx::PgPool,
) -> Result<Vec<MaturityAssessment>, TopemsError> {
    let rows = sqlx::query(&format!(
        "SELECT {ASSESSMENT_COLS} FROM master_data.mdm_maturity_assessments"
    ))
    .fetch_all(db)
    .await
    .map_err(|e| TopemsError::BusinessLogic(format!("查询成熟度评估失败: {e}")))?;
    Ok(rows.iter().map(maturity_assessment_from_row).collect())
}

async fn fetch_dimension_scores(db: &sqlx::PgPool) -> Result<Vec<DimensionScore>, TopemsError> {
    let rows = sqlx::query(&format!(
        "SELECT {DIMENSION_SCORE_COLS} FROM master_data.mdm_dimension_scores"
    ))
    .fetch_all(db)
    .await
    .map_err(|e| TopemsError::BusinessLogic(format!("查询维度得分失败: {e}")))?;
    Ok(rows.iter().map(dimension_score_from_row).collect())
}

async fn fetch_maturity_history(
    db: &sqlx::PgPool,
) -> Result<Vec<MaturityHistoryEntry>, TopemsError> {
    let rows = sqlx::query(
        "SELECT id, dimension, score, level, recorded_at FROM master_data.mdm_maturity_history",
    )
    .fetch_all(db)
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

async fn fetch_improvement_plans(db: &sqlx::PgPool) -> Result<Vec<ImprovementPlan>, TopemsError> {
    let rows = sqlx::query(&format!(
        "SELECT {IMPROVEMENT_PLAN_COLS} FROM master_data.mdm_improvement_plans"
    ))
    .fetch_all(db)
    .await
    .map_err(|e| TopemsError::BusinessLogic(format!("查询改进计划失败: {e}")))?;
    Ok(rows.iter().map(improvement_plan_from_row).collect())
}

async fn fetch_workflows(db: &sqlx::PgPool) -> Result<Vec<WorkflowV58>, TopemsError> {
    let rows = sqlx::query(&format!(
        "SELECT {WORKFLOW_COLS} FROM master_data.mdm_workflows"
    ))
    .fetch_all(db)
    .await
    .map_err(|e| TopemsError::BusinessLogic(format!("查询工作流失败: {e}")))?;
    Ok(rows.iter().map(workflow_from_row).collect())
}

async fn fetch_workflow_templates(db: &sqlx::PgPool) -> Result<Vec<WorkflowTemplate>, TopemsError> {
    let rows = sqlx::query(&format!(
        "SELECT {WORKFLOW_TEMPLATE_COLS} FROM master_data.mdm_workflow_templates"
    ))
    .fetch_all(db)
    .await
    .map_err(|e| TopemsError::BusinessLogic(format!("查询工作流模板失败: {e}")))?;
    Ok(rows.iter().map(workflow_template_from_row).collect())
}

async fn fetch_workflow_history(
    db: &sqlx::PgPool,
) -> Result<Vec<WorkflowHistoryEntry>, TopemsError> {
    let rows = sqlx::query(&format!(
        "SELECT {WORKFLOW_HISTORY_COLS} FROM master_data.mdm_workflow_history"
    ))
    .fetch_all(db)
    .await
    .map_err(|e| TopemsError::BusinessLogic(format!("查询工作流历史失败: {e}")))?;
    Ok(rows.iter().map(workflow_history_from_row).collect())
}

async fn fetch_data_products(db: &sqlx::PgPool) -> Result<Vec<DataProduct>, TopemsError> {
    let rows = sqlx::query(&format!(
        "SELECT {DATA_PRODUCT_COLS} FROM master_data.mdm_data_products"
    ))
    .fetch_all(db)
    .await
    .map_err(|e| TopemsError::BusinessLogic(format!("查询数据产品失败: {e}")))?;
    Ok(rows.iter().map(data_product_from_row).collect())
}

async fn fetch_data_contracts(db: &sqlx::PgPool) -> Result<Vec<DataContract>, TopemsError> {
    let rows = sqlx::query(&format!(
        "SELECT {DATA_CONTRACT_COLS} FROM master_data.mdm_data_contracts"
    ))
    .fetch_all(db)
    .await
    .map_err(|e| TopemsError::BusinessLogic(format!("查询数据契约失败: {e}")))?;
    Ok(rows.iter().map(data_contract_from_row).collect())
}

async fn fetch_api_exposures(db: &sqlx::PgPool) -> Result<Vec<ApiExposure>, TopemsError> {
    let rows = sqlx::query(&format!(
        "SELECT {API_EXPOSURE_COLS} FROM master_data.mdm_api_exposures"
    ))
    .fetch_all(db)
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
}

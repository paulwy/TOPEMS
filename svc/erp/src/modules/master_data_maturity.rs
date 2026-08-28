//! 主数据治理成熟度评估模块
//!
//! 从 master_data_refs.rs 拆分出来的独立模块（V47.0 AC-19 Part 1）。
//! 提供主数据治理成熟度的多维度评估、历史对比和改进计划生成功能。
//!
//! 评估维度：数据质量、数据治理、数据标准、数据生命周期、数据安全、数据集成、数据管家、数据架构
//! 成熟度等级：初始级(1) → 发展级(2) → 定义级(3) → 管理级(4) → 优化级(5)

use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};
use std::sync::LazyLock;

use crate::modules::ApiState;
use topems_shared::ApiResponse;

// ==================== 治理成熟度评估类型 ====================

/// 治理成熟度评估维度
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum MaturityDimension {
    DataQuality,
    DataGovernance,
    DataStandards,
    DataLifecycle,
    DataSecurity,
    DataIntegration,
    DataStewardship,
    DataArchitecture,
}

impl MaturityDimension {
    fn label(&self) -> &'static str {
        match self {
            MaturityDimension::DataQuality => "数据质量",
            MaturityDimension::DataGovernance => "数据治理",
            MaturityDimension::DataStandards => "数据标准",
            MaturityDimension::DataLifecycle => "数据生命周期",
            MaturityDimension::DataSecurity => "数据安全",
            MaturityDimension::DataIntegration => "数据集成",
            MaturityDimension::DataStewardship => "数据管家",
            MaturityDimension::DataArchitecture => "数据架构",
        }
    }

    fn all() -> Vec<MaturityDimension> {
        vec![
            MaturityDimension::DataQuality,
            MaturityDimension::DataGovernance,
            MaturityDimension::DataStandards,
            MaturityDimension::DataLifecycle,
            MaturityDimension::DataSecurity,
            MaturityDimension::DataIntegration,
            MaturityDimension::DataStewardship,
            MaturityDimension::DataArchitecture,
        ]
    }
}

/// 成熟度等级（1-5 级）
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum MaturityLevel {
    Initial,
    Developing,
    Defined,
    Managed,
    Optimizing,
}

impl MaturityLevel {
    fn level(&self) -> u8 {
        match self {
            MaturityLevel::Initial => 1,
            MaturityLevel::Developing => 2,
            MaturityLevel::Defined => 3,
            MaturityLevel::Managed => 4,
            MaturityLevel::Optimizing => 5,
        }
    }

    fn label(&self) -> &'static str {
        match self {
            MaturityLevel::Initial => "初始级",
            MaturityLevel::Developing => "发展级",
            MaturityLevel::Defined => "定义级",
            MaturityLevel::Managed => "管理级",
            MaturityLevel::Optimizing => "优化级",
        }
    }

    fn from_score(score: f64) -> Self {
        if score < 20.0 {
            MaturityLevel::Initial
        } else if score < 40.0 {
            MaturityLevel::Developing
        } else if score < 60.0 {
            MaturityLevel::Defined
        } else if score < 80.0 {
            MaturityLevel::Managed
        } else {
            MaturityLevel::Optimizing
        }
    }
}

/// 单维度评分
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DimensionScore {
    pub dimension: MaturityDimension,
    pub dimension_label: String,
    pub score: f64,
    pub level: MaturityLevel,
    pub level_label: String,
    pub strengths: Vec<String>,
    pub weaknesses: Vec<String>,
    pub improvement_actions: Vec<String>,
}

/// 改进动作
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImprovementAction {
    pub action_id: String,
    pub dimension: MaturityDimension,
    pub dimension_label: String,
    pub priority: String,
    pub description: String,
    pub estimated_effort: String,
    pub expected_impact: String,
    pub timeline: String,
}

/// 成熟度评估结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaturityAssessment {
    pub assessment_id: String,
    pub assessed_at: String,
    pub dimensions: Vec<DimensionScore>,
    pub overall_score: f64,
    pub overall_level: MaturityLevel,
    pub overall_level_label: String,
    pub recommendations: Vec<String>,
}

/// 两次评估对比结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssessmentComparison {
    pub baseline: MaturityAssessment,
    pub current: MaturityAssessment,
    pub score_delta: f64,
    pub level_delta: i32,
    pub dimension_deltas: Vec<DimensionDelta>,
    pub summary: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DimensionDelta {
    pub dimension: MaturityDimension,
    pub dimension_label: String,
    pub score_delta: f64,
    pub level_delta: i32,
}

/// 改进计划
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImprovementPlan {
    pub plan_id: String,
    pub generated_at: String,
    pub actions: Vec<ImprovementAction>,
    pub total_effort: String,
    pub estimated_timeline: String,
    pub expected_overall_score_gain: f64,
}

#[derive(Debug, Deserialize)]
pub struct CompareAssessmentsRequest {
    pub baseline_id: String,
    pub current_id: String,
}

// ==================== 成熟度评估存储 ====================

struct GovernanceMaturityStore {
    assessments: tokio::sync::Mutex<Vec<MaturityAssessment>>,
    initialized: tokio::sync::Mutex<bool>,
}

fn get_maturity_store() -> &'static GovernanceMaturityStore {
    static STORE: LazyLock<GovernanceMaturityStore> = LazyLock::new(|| GovernanceMaturityStore {
        assessments: tokio::sync::Mutex::new(Vec::new()),
        initialized: tokio::sync::Mutex::new(false),
    });
    &STORE
}

async fn ensure_maturity_initialized() {
    let store = get_maturity_store();
    let mut initialized = store.initialized.lock().await;
    if *initialized {
        return;
    }
    // 预置两次历史评估，用于对比演示
    let baseline = build_synthetic_assessment("maturity-001", 30.0);
    let current = build_synthetic_assessment("maturity-002", 45.0);
    let mut assessments = store.assessments.lock().await;
    assessments.push(baseline);
    assessments.push(current);
    *initialized = true;
}

/// 基于偏移量合成一次评估（base_score 控制整体水位）
fn build_synthetic_assessment(assessment_id: &str, base_score: f64) -> MaturityAssessment {
    let now = chrono::Utc::now();
    let offsets: Vec<(MaturityDimension, f64, Vec<&str>, Vec<&str>)> = vec![
        (
            MaturityDimension::DataQuality,
            8.0,
            vec!["已建立质量规则库", "定期执行质量检查"],
            vec!["质量闭环不完整", "缺乏主动质量监控"],
        ),
        (
            MaturityDimension::DataGovernance,
            5.0,
            vec!["已明确数据域划分", "设立数据治理委员会"],
            vec!["治理流程未完全落地", "缺乏治理 KPI"],
        ),
        (
            MaturityDimension::DataStandards,
            12.0,
            vec!["核心主数据已制定编码规范"],
            vec!["标准覆盖域不全", "标准变更缺乏版本管理"],
        ),
        (
            MaturityDimension::DataLifecycle,
            -2.0,
            vec!["已支持归档操作"],
            vec!["销毁策略缺失", "生命周期审计不完整"],
        ),
        (
            MaturityDimension::DataSecurity,
            10.0,
            vec!["已实施分类分级", "访问权限可控"],
            vec!["数据脱敏覆盖不足"],
        ),
        (
            MaturityDimension::DataIntegration,
            6.0,
            vec!["已建立同步编排引擎", "支持多源同步"],
            vec!["死信处理自动化不足", "缺乏实时集成能力"],
        ),
        (
            MaturityDimension::DataStewardship,
            3.0,
            vec!["已分配数据管家角色"],
            vec!["管家职责界定模糊", "缺乏管家考核机制"],
        ),
        (
            MaturityDimension::DataArchitecture,
            15.0,
            vec!["已构建主数据图谱", "血缘可视化能力"],
            vec!["架构文档未体系化"],
        ),
    ];

    let mut dimensions: Vec<DimensionScore> = Vec::new();
    let mut total = 0.0;
    for (dim, offset, strengths, weaknesses) in &offsets {
        let score = (base_score + offset).max(5.0).min(95.0);
        let level = MaturityLevel::from_score(score);
        let mut actions = Vec::new();
        for w in weaknesses {
            actions.push(format!("针对「{}」制定改进方案", w));
        }
        dimensions.push(DimensionScore {
            dimension: dim.clone(),
            dimension_label: dim.label().to_string(),
            score: (score * 10.0).round() / 10.0,
            level,
            level_label: level.label().to_string(),
            strengths: strengths.iter().map(|s| s.to_string()).collect(),
            weaknesses: weaknesses.iter().map(|w| w.to_string()).collect(),
            improvement_actions: actions,
        });
        total += score;
    }
    let overall_score = (total / dimensions.len() as f64 * 10.0).round() / 10.0;
    let overall_level = MaturityLevel::from_score(overall_score);
    MaturityAssessment {
        assessment_id: assessment_id.to_string(),
        assessed_at: now.to_rfc3339(),
        dimensions,
        overall_score,
        overall_level,
        overall_level_label: overall_level.label().to_string(),
        recommendations: vec![
            "建立端到端数据质量闭环".to_string(),
            "完善数据标准版本管理".to_string(),
            "推进数据管家考核机制".to_string(),
        ],
    }
}

/// 评估单个维度
async fn assess_dimension(dim: MaturityDimension) -> DimensionScore {
    ensure_maturity_initialized().await;
    let store = get_maturity_store();
    let assessments = store.assessments.lock().await;
    if let Some(latest) = assessments.last() {
        if let Some(found) = latest.dimensions.iter().find(|d| d.dimension == dim) {
            return found.clone();
        }
    }
    // 兜底：合成一个最低分维度
    let score = 25.0;
    let level = MaturityLevel::from_score(score);
    DimensionScore {
        dimension: dim.clone(),
        dimension_label: dim.label().to_string(),
        score,
        level,
        level_label: level.label().to_string(),
        strengths: vec![],
        weaknesses: vec!["该维度尚未建立评估基线".to_string()],
        improvement_actions: vec!["启动该维度治理建设".to_string()],
    }
}

/// 执行全面成熟度评估
async fn assess_maturity() -> MaturityAssessment {
    ensure_maturity_initialized().await;
    let store = get_maturity_store();
    let mut assessments = store.assessments.lock().await;
    let next_id = format!("maturity-{:03}", assessments.len() + 1);
    // 基于最近一次评估小幅提升，模拟持续改进
    let base = assessments
        .last()
        .map(|a| a.overall_score + 3.0)
        .unwrap_or(40.0)
        .min(90.0);
    let assessment = build_synthetic_assessment(&next_id, base);
    assessments.push(assessment.clone());
    assessment
}

/// 获取历史评估记录
async fn get_maturity_history() -> Vec<MaturityAssessment> {
    ensure_maturity_initialized().await;
    let store = get_maturity_store();
    store.assessments.lock().await.clone()
}

/// 对比两次评估结果
async fn compare_assessments(baseline_id: &str, current_id: &str) -> Option<AssessmentComparison> {
    ensure_maturity_initialized().await;
    let store = get_maturity_store();
    let assessments = store.assessments.lock().await;
    let baseline = assessments
        .iter()
        .find(|a| a.assessment_id == baseline_id)?;
    let current = assessments.iter().find(|a| a.assessment_id == current_id)?;

    let mut dimension_deltas: Vec<DimensionDelta> = Vec::new();
    for cur in &current.dimensions {
        if let Some(base_dim) = baseline
            .dimensions
            .iter()
            .find(|d| d.dimension == cur.dimension)
        {
            dimension_deltas.push(DimensionDelta {
                dimension: cur.dimension.clone(),
                dimension_label: cur.dimension_label.clone(),
                score_delta: ((cur.score - base_dim.score) * 10.0).round() / 10.0,
                level_delta: cur.level.level() as i32 - base_dim.level.level() as i32,
            });
        }
    }

    let score_delta = ((current.overall_score - baseline.overall_score) * 10.0).round() / 10.0;
    let level_delta = current.overall_level.level() as i32 - baseline.overall_level.level() as i32;
    let summary = if score_delta > 0.0 {
        format!(
            "整体成熟度提升 {:.1} 分，等级提升 {} 级",
            score_delta, level_delta
        )
    } else if score_delta < 0.0 {
        format!("整体成熟度下降 {:.1} 分，需关注退步维度", score_delta.abs())
    } else {
        "整体成熟度保持稳定".to_string()
    };

    Some(AssessmentComparison {
        baseline: baseline.clone(),
        current: current.clone(),
        score_delta,
        level_delta,
        dimension_deltas,
        summary,
    })
}

/// 生成改进计划
async fn generate_improvement_plan() -> ImprovementPlan {
    ensure_maturity_initialized().await;
    let store = get_maturity_store();
    let assessments = store.assessments.lock().await;
    let latest = assessments.last();

    let mut actions: Vec<ImprovementAction> = Vec::new();
    let priority_by_score = |s: f64| -> String {
        if s < 30.0 {
            "高".to_string()
        } else if s < 60.0 {
            "中".to_string()
        } else {
            "低".to_string()
        }
    };

    if let Some(latest) = latest {
        let mut sorted = latest.dimensions.clone();
        sorted.sort_by(|a, b| {
            a.score
                .partial_cmp(&b.score)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        for (idx, dim) in sorted.iter().enumerate() {
            for (i, action_desc) in dim.improvement_actions.iter().enumerate() {
                actions.push(ImprovementAction {
                    action_id: format!("action-{}-{}", idx + 1, i + 1),
                    dimension: dim.dimension.clone(),
                    dimension_label: dim.dimension_label.clone(),
                    priority: priority_by_score(dim.score),
                    description: action_desc.clone(),
                    estimated_effort: match dim.score {
                        s if s < 30.0 => "高（>3 人月）".to_string(),
                        s if s < 60.0 => "中（1-3 人月）".to_string(),
                        _ => "低（<1 人月）".to_string(),
                    },
                    expected_impact: "预计该维度评分提升 5-15 分".to_string(),
                    timeline: match dim.score {
                        s if s < 30.0 => "3-6 个月".to_string(),
                        s if s < 60.0 => "1-3 个月".to_string(),
                        _ => "1 个月内".to_string(),
                    },
                });
            }
        }
    } else {
        // 兜底改进计划
        for dim in MaturityDimension::all() {
            actions.push(ImprovementAction {
                action_id: format!("action-{}", dim.label()),
                dimension: dim.clone(),
                dimension_label: dim.label().to_string(),
                priority: "高".to_string(),
                description: format!("启动「{}」维度治理建设", dim.label()),
                estimated_effort: "高（>3 人月）".to_string(),
                expected_impact: "建立评估基线".to_string(),
                timeline: "3-6 个月".to_string(),
            });
        }
    }

    let expected_gain = actions.len().min(10) as f64 * 1.5;
    ImprovementPlan {
        plan_id: format!("plan-{}", chrono::Utc::now().timestamp()),
        generated_at: chrono::Utc::now().to_rfc3339(),
        total_effort: format!("共 {} 个改进动作", actions.len()),
        estimated_timeline: "6-12 个月".to_string(),
        expected_overall_score_gain: expected_gain,
        actions,
    }
}

// ==================== 成熟度评估 Handlers ====================

/// GET /maturity/assess — 执行全面成熟度评估
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/api/erp/master-data-refs/maturity/assess",
    tag = "Master Data",
    operation_id = "assess_maturity_handler",
    responses((status = 200, description = "OK")),
)]
pub async fn assess_maturity_handler(
    State(state): State<ApiState>,
) -> Json<ApiResponse<MaturityAssessment>> {
    let _ = &state;
    let assessment = assess_maturity().await;
    Json(ApiResponse::success(assessment, "成熟度评估完成"))
}

/// GET /maturity/history — 获取历史评估记录
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/api/erp/master-data-refs/maturity/history",
    tag = "Master Data",
    operation_id = "get_maturity_history_handler",
    responses((status = 200, description = "OK")),
)]
pub async fn get_maturity_history_handler(
    State(state): State<ApiState>,
) -> Json<ApiResponse<Vec<MaturityAssessment>>> {
    let _ = &state;
    let history = get_maturity_history().await;
    Json(ApiResponse::success(history, "历史评估记录获取成功"))
}

/// POST /maturity/compare — 对比两次评估结果
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/api/erp/master-data-refs/maturity/compare",
    tag = "Master Data",
    operation_id = "compare_assessments_handler",
    responses((status = 200, description = "OK")),
)]
pub async fn compare_assessments_handler(
    State(state): State<ApiState>,
    Json(req): Json<CompareAssessmentsRequest>,
) -> Json<ApiResponse<AssessmentComparison>> {
    let _ = &state;
    match compare_assessments(&req.baseline_id, &req.current_id).await {
        Some(comparison) => Json(ApiResponse::success(comparison, "评估对比完成")),
        None => Json(ApiResponse::error(404, "未找到指定的评估记录")),
    }
}

/// GET /maturity/improvement-plan — 生成改进计划
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/api/erp/master-data-refs/maturity/improvement-plan",
    tag = "Master Data",
    operation_id = "get_improvement_plan_handler",
    responses((status = 200, description = "OK")),
)]
pub async fn get_improvement_plan_handler(
    State(state): State<ApiState>,
) -> Json<ApiResponse<ImprovementPlan>> {
    let _ = &state;
    let plan = generate_improvement_plan().await;
    Json(ApiResponse::success(plan, "改进计划生成成功"))
}

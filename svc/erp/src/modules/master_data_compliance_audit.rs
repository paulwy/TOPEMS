//! 合规审计模块
//!
//! 从 master_data_refs.rs 拆分出来的独立模块（V48.0 AC-20 Part 3）。
//! 提供主数据合规审计的规则管理、检查执行、发现跟踪、报告生成和评分卡功能。
//!
//! 功能：
//! - 合规规则 CRUD
//! - 6 种审计框架（GDPR/SOX/ISO27001/数据治理/内部策略/自定义）
//! - 合规检查执行（自动生成审计发现）
//! - 审计发现管理（按规则/状态/严重度筛选，分页）
//! - 发现解决（状态更新+整改记录）
//! - 审计报告生成
//! - 审计评分卡（A-F 等级，按严重度分类，趋势）
//! - 合规审计统计

use axum::{extract::Path, extract::Query, extract::State, Json};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::LazyLock;

use crate::modules::ApiState;
use topems_shared_core::response::ApiResponse;

// ==================== 合规审计类型 ====================

/// 审计框架
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum AuditFramework {
    GDPR,
    SOX,
    ISO27001,
    DataGovernance,
    InternalPolicy,
    Custom,
}

impl AuditFramework {
    fn label(&self) -> &'static str {
        match self {
            AuditFramework::GDPR => "GDPR（通用数据保护条例）",
            AuditFramework::SOX => "SOX（萨班斯法案）",
            AuditFramework::ISO27001 => "ISO 27001（信息安全）",
            AuditFramework::DataGovernance => "数据治理",
            AuditFramework::InternalPolicy => "内部策略",
            AuditFramework::Custom => "自定义",
        }
    }
}

/// 合规状态
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ComplianceStatus {
    Compliant,
    NonCompliant,
    PartiallyCompliant,
    NotApplicable,
    PendingReview,
}

impl ComplianceStatus {
    fn label(&self) -> &'static str {
        match self {
            ComplianceStatus::Compliant => "合规",
            ComplianceStatus::NonCompliant => "不合规",
            ComplianceStatus::PartiallyCompliant => "部分合规",
            ComplianceStatus::NotApplicable => "不适用",
            ComplianceStatus::PendingReview => "待审查",
        }
    }
}

/// 发现严重度
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "snake_case")]
pub enum FindingSeverity {
    Low,
    Medium,
    High,
    Critical,
}

impl FindingSeverity {
    fn label(&self) -> &'static str {
        match self {
            FindingSeverity::Low => "低",
            FindingSeverity::Medium => "中",
            FindingSeverity::High => "高",
            FindingSeverity::Critical => "严重",
        }
    }
}

/// 发现状态
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum FindingStatus {
    Open,
    InProgress,
    Resolved,
    Accepted,
    FalsePositive,
}

impl FindingStatus {
    fn label(&self) -> &'static str {
        match self {
            FindingStatus::Open => "待处理",
            FindingStatus::InProgress => "处理中",
            FindingStatus::Resolved => "已解决",
            FindingStatus::Accepted => "已接受",
            FindingStatus::FalsePositive => "误报",
        }
    }
}

/// 合规规则
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComplianceRule {
    pub rule_id: String,
    pub framework: AuditFramework,
    pub name: String,
    pub description: String,
    pub severity: FindingSeverity,
    pub check_logic: String,
    pub last_checked: Option<String>,
    pub status: ComplianceStatus,
}

/// 审计发现
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditFinding {
    pub finding_id: String,
    pub rule_id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub severity: FindingSeverity,
    pub description: String,
    pub evidence: serde_json::Value,
    pub recommendation: String,
    pub status: FindingStatus,
    pub found_at: chrono::DateTime<chrono::Utc>,
}

/// 合规审计报告
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComplianceAuditReport {
    pub report_id: String,
    pub framework: AuditFramework,
    pub audit_period: String,
    pub total_rules: usize,
    pub compliant_count: usize,
    pub findings: Vec<AuditFinding>,
    pub overall_status: ComplianceStatus,
    pub score: f64,
    pub generated_at: chrono::DateTime<chrono::Utc>,
}

/// 审计评分卡
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditScorecard {
    pub framework: AuditFramework,
    pub score: f64,
    pub grade: String,
    pub by_category: HashMap<String, f64>,
    pub trend: Vec<f64>,
}

/// 合规审计统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComplianceAuditStats {
    pub total_rules: usize,
    pub total_findings: usize,
    pub rules_by_framework: HashMap<String, usize>,
    pub findings_by_severity: HashMap<String, usize>,
    pub findings_by_status: HashMap<String, usize>,
    pub compliance_rate: f64,
}

/// 合规规则创建请求
#[derive(Debug, Deserialize)]
pub struct ComplianceRuleRequest {
    pub framework: String,
    pub name: String,
    pub description: Option<String>,
    pub severity: Option<String>,
    pub check_logic: Option<String>,
}

/// 合规检查请求
#[derive(Debug, Deserialize)]
pub struct ComplianceCheckRequest {
    pub framework: Option<String>,
    pub entity_type: Option<String>,
    pub entity_id: Option<String>,
}

/// 解决发现请求
#[derive(Debug, Deserialize)]
pub struct ResolveFindingRequest {
    pub status: String,
    pub resolution_note: Option<String>,
}

/// 审计发现查询参数
#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct AuditFindingQuery {
    pub rule_id: Option<String>,
    pub status: Option<String>,
    pub severity: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

/// 合规规则查询参数
#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct ComplianceRuleQuery {
    pub framework: Option<String>,
}

fn parse_audit_framework(s: &str) -> Option<AuditFramework> {
    match s.to_lowercase().as_str() {
        "gdpr" => Some(AuditFramework::GDPR),
        "sox" => Some(AuditFramework::SOX),
        "iso27001" | "iso_27001" => Some(AuditFramework::ISO27001),
        "data_governance" | "datagovernance" => Some(AuditFramework::DataGovernance),
        "internal_policy" | "internalpolicy" => Some(AuditFramework::InternalPolicy),
        "custom" => Some(AuditFramework::Custom),
        _ => None,
    }
}

fn parse_finding_severity(s: &str) -> Option<FindingSeverity> {
    match s.to_lowercase().as_str() {
        "low" => Some(FindingSeverity::Low),
        "medium" => Some(FindingSeverity::Medium),
        "high" => Some(FindingSeverity::High),
        "critical" => Some(FindingSeverity::Critical),
        _ => None,
    }
}

fn parse_finding_status(s: &str) -> Option<FindingStatus> {
    match s.to_lowercase().as_str() {
        "open" => Some(FindingStatus::Open),
        "in_progress" | "inprogress" => Some(FindingStatus::InProgress),
        "resolved" => Some(FindingStatus::Resolved),
        "accepted" => Some(FindingStatus::Accepted),
        "false_positive" | "falsepositive" => Some(FindingStatus::FalsePositive),
        _ => None,
    }
}

fn compliance_grade(score: f64) -> String {
    if score >= 90.0 {
        "A".to_string()
    } else if score >= 80.0 {
        "B".to_string()
    } else if score >= 70.0 {
        "C".to_string()
    } else if score >= 60.0 {
        "D".to_string()
    } else {
        "F".to_string()
    }
}

// ==================== 合规审计存储 ====================

struct ComplianceAuditStore {
    rules: tokio::sync::Mutex<Vec<ComplianceRule>>,
    findings: tokio::sync::Mutex<Vec<AuditFinding>>,
    initialized: tokio::sync::Mutex<bool>,
}

fn get_compliance_audit_store() -> &'static ComplianceAuditStore {
    static STORE: LazyLock<ComplianceAuditStore> = LazyLock::new(|| ComplianceAuditStore {
        rules: tokio::sync::Mutex::new(Vec::new()),
        findings: tokio::sync::Mutex::new(Vec::new()),
        initialized: tokio::sync::Mutex::new(false),
    });
    &STORE
}

async fn ensure_compliance_audit_initialized() {
    let store = get_compliance_audit_store();
    let mut initialized = store.initialized.lock().await;
    if *initialized {
        return;
    }
    let now = chrono::Utc::now();
    let rfc = |days_ago: i64| (now - chrono::Duration::days(days_ago)).to_rfc3339();

    // 预置合规规则
    let rule_seeds: Vec<(
        &str,
        AuditFramework,
        &str,
        &str,
        FindingSeverity,
        &str,
        ComplianceStatus,
    )> = vec![
        (
            "rule-001",
            AuditFramework::GDPR,
            "用户数据访问审计",
            "所有对个人数据的访问必须记录审计日志",
            FindingSeverity::High,
            "check_audit_log_exists",
            ComplianceStatus::Compliant,
        ),
        (
            "rule-002",
            AuditFramework::GDPR,
            "数据主体权利响应",
            "必须在30天内响应数据主体的访问/删除请求",
            FindingSeverity::Critical,
            "check_dsar_response_time",
            ComplianceStatus::PartiallyCompliant,
        ),
        (
            "rule-003",
            AuditFramework::GDPR,
            "数据加密传输",
            "个人数据传输必须使用加密通道",
            FindingSeverity::High,
            "check_encryption_enabled",
            ComplianceStatus::Compliant,
        ),
        (
            "rule-004",
            AuditFramework::SOX,
            "财务数据完整性",
            "财务主数据变更必须有完整的审批记录",
            FindingSeverity::Critical,
            "check_approval_trail",
            ComplianceStatus::NonCompliant,
        ),
        (
            "rule-005",
            AuditFramework::SOX,
            "数据访问权限分离",
            "财务数据的录入与审批必须由不同人员完成",
            FindingSeverity::High,
            "check_segregation_of_duties",
            ComplianceStatus::PartiallyCompliant,
        ),
        (
            "rule-006",
            AuditFramework::ISO27001,
            "访问控制策略",
            "所有数据访问必须有明确的授权策略",
            FindingSeverity::Medium,
            "check_access_control_policy",
            ComplianceStatus::Compliant,
        ),
        (
            "rule-007",
            AuditFramework::ISO27001,
            "数据分类标注",
            "所有数据资产必须有分类分级标注",
            FindingSeverity::Medium,
            "check_data_classification",
            ComplianceStatus::PartiallyCompliant,
        ),
        (
            "rule-008",
            AuditFramework::DataGovernance,
            "数据质量监控",
            "核心主数据必须配置质量规则并定期执行",
            FindingSeverity::Medium,
            "check_quality_rules_configured",
            ComplianceStatus::Compliant,
        ),
        (
            "rule-009",
            AuditFramework::DataGovernance,
            "数据血缘追溯",
            "核心数据必须可追溯至数据源",
            FindingSeverity::Low,
            "check_lineage_traceability",
            ComplianceStatus::Compliant,
        ),
        (
            "rule-010",
            AuditFramework::InternalPolicy,
            "数据归档策略",
            "历史数据必须按策略归档",
            FindingSeverity::Low,
            "check_archive_policy",
            ComplianceStatus::PendingReview,
        ),
    ];

    let mut rules = store.rules.lock().await;
    for (id, fw, name, desc, sev, logic, status) in &rule_seeds {
        rules.push(ComplianceRule {
            rule_id: id.to_string(),
            framework: fw.clone(),
            name: name.to_string(),
            description: desc.to_string(),
            severity: sev.clone(),
            check_logic: logic.to_string(),
            last_checked: Some(rfc(1)),
            status: status.clone(),
        });
    }

    // 预置审计发现
    let finding_seeds: Vec<(
        &str,
        &str,
        &str,
        &str,
        FindingSeverity,
        &str,
        &str,
        FindingStatus,
        i64,
    )> = vec![
        (
            "finding-001",
            "rule-002",
            "customer",
            "CUST-2026-001",
            FindingSeverity::Critical,
            "数据主体删除请求超期未响应（35天）",
            "建立 DSAR 工单自动跟踪与告警机制",
            FindingStatus::Open,
            5,
        ),
        (
            "finding-002",
            "rule-004",
            "account_subject",
            "ACC-1001",
            FindingSeverity::Critical,
            "会计科目变更缺少审批记录",
            "启用变更审批工作流，补录审批记录",
            FindingStatus::InProgress,
            3,
        ),
        (
            "finding-003",
            "rule-005",
            "vendor_payment",
            "VP-2026-089",
            FindingSeverity::High,
            "供应商付款录入与审批为同一人",
            "拆分录入与审批角色，复核历史记录",
            FindingStatus::Open,
            2,
        ),
        (
            "finding-004",
            "rule-007",
            "material",
            "MAT-001",
            FindingSeverity::Medium,
            "物料主数据缺少分类分级标注",
            "批量补充分类标注并更新元数据",
            FindingStatus::Open,
            7,
        ),
        (
            "finding-005",
            "rule-010",
            "customer",
            "CUST-2025-099",
            FindingSeverity::Low,
            "超过2年未活跃客户未归档",
            "执行归档操作并更新归档策略",
            FindingStatus::Resolved,
            10,
        ),
    ];

    let mut findings = store.findings.lock().await;
    for (id, rule_id, etype, eid, sev, desc, rec, status, days_ago) in &finding_seeds {
        findings.push(AuditFinding {
            finding_id: id.to_string(),
            rule_id: rule_id.to_string(),
            entity_type: etype.to_string(),
            entity_id: eid.to_string(),
            severity: sev.clone(),
            description: desc.to_string(),
            evidence: serde_json::json!({
                "checked_at": rfc(*days_ago),
                "source": "automated_check",
            }),
            recommendation: rec.to_string(),
            status: status.clone(),
            found_at: now - chrono::Duration::days(*days_ago),
        });
    }

    *initialized = true;
}

/// 创建合规规则
async fn create_compliance_rule(req: &ComplianceRuleRequest) -> ComplianceRule {
    ensure_compliance_audit_initialized().await;
    let store = get_compliance_audit_store();
    let mut rules = store.rules.lock().await;
    let id = format!("rule-{:03}", rules.len() + 1);
    let rule = ComplianceRule {
        rule_id: id,
        framework: parse_audit_framework(&req.framework).unwrap_or(AuditFramework::Custom),
        name: req.name.clone(),
        description: req.description.clone().unwrap_or_default(),
        severity: req
            .severity
            .as_deref()
            .and_then(parse_finding_severity)
            .unwrap_or(FindingSeverity::Medium),
        check_logic: req.check_logic.clone().unwrap_or_default(),
        last_checked: None,
        status: ComplianceStatus::PendingReview,
    };
    rules.push(rule.clone());
    rule
}

/// 列出合规规则
async fn list_compliance_rules(framework: Option<&str>) -> Vec<ComplianceRule> {
    ensure_compliance_audit_initialized().await;
    let store = get_compliance_audit_store();
    let rules = store.rules.lock().await.clone();
    match framework {
        Some(fw) => rules
            .into_iter()
            .filter(|r| {
                let fw_str = serde_json::to_string(&r.framework).unwrap_or_default();
                fw_str.contains(fw)
            })
            .collect(),
        None => rules,
    }
}

/// 执行合规检查
async fn run_compliance_check(req: &ComplianceCheckRequest) -> Vec<AuditFinding> {
    ensure_compliance_audit_initialized().await;
    let store = get_compliance_audit_store();
    let rules = store.rules.lock().await.clone();
    let now = chrono::Utc::now();

    let target_fw = req.framework.as_deref().and_then(parse_audit_framework);
    let filtered_rules: Vec<ComplianceRule> = match target_fw.as_ref() {
        Some(fw) => rules.into_iter().filter(|r| &r.framework == fw).collect(),
        None => rules,
    };

    // 更新规则的最后检查时间
    {
        let mut rules_lock = store.rules.lock().await;
        for rule in rules_lock.iter_mut() {
            if let Some(ref fw) = target_fw {
                if &rule.framework != fw {
                    continue;
                }
            }
            rule.last_checked = Some(now.to_rfc3339());
        }
    }

    let existing_findings = store.findings.lock().await.clone();
    let mut new_findings: Vec<AuditFinding> = Vec::new();
    let mut findings = store.findings.lock().await;

    for rule in &filtered_rules {
        if matches!(
            rule.status,
            ComplianceStatus::NonCompliant | ComplianceStatus::PartiallyCompliant
        ) {
            let entity_type = req
                .entity_type
                .clone()
                .unwrap_or_else(|| "master_data".to_string());
            let entity_id = req
                .entity_id
                .clone()
                .unwrap_or_else(|| format!("entity-{}", rule.rule_id));

            // 检查是否已有相同发现且未解决
            let already_exists = existing_findings.iter().any(|f| {
                f.rule_id == rule.rule_id
                    && f.entity_type == entity_type
                    && f.entity_id == entity_id
                    && !matches!(
                        f.status,
                        FindingStatus::Resolved | FindingStatus::FalsePositive
                    )
            });

            if !already_exists {
                let finding = AuditFinding {
                    finding_id: format!("finding-{:03}", findings.len() + 1),
                    rule_id: rule.rule_id.clone(),
                    entity_type: entity_type.clone(),
                    entity_id: entity_id.clone(),
                    severity: rule.severity.clone(),
                    description: format!("规则「{}」检查未通过：{}", rule.name, rule.description),
                    evidence: serde_json::json!({
                        "checked_at": now,
                        "rule_name": rule.name,
                        "framework": rule.framework.label(),
                    }),
                    recommendation: format!("建议针对「{}」制定整改方案", rule.name),
                    status: FindingStatus::Open,
                    found_at: now.clone(),
                };
                new_findings.push(finding.clone());
                findings.push(finding);
            }
        }
    }

    new_findings
}

#[allow(
    clippy::as_conversions,
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss
)]
/// 获取审计发现
#[allow(clippy::indexing_slicing)] // pos/job_pos/idx 由 position() 前置校验（Some 或 else 提前返回）保证存在，索引数学安全
async fn get_audit_findings(query: &AuditFindingQuery) -> Vec<AuditFinding> {
    ensure_compliance_audit_initialized().await;
    let store = get_compliance_audit_store();
    let findings = store.findings.lock().await.clone();
    let mut filtered: Vec<AuditFinding> = findings
        .into_iter()
        .filter(|f| {
            if let Some(ref rid) = query.rule_id {
                if &f.rule_id != rid {
                    return false;
                }
            }
            if let Some(ref s) = query.status {
                let s_str = serde_json::to_string(&f.status).unwrap_or_default();
                if !s_str.contains(s) {
                    return false;
                }
            }
            if let Some(ref sev) = query.severity {
                let sev_str = serde_json::to_string(&f.severity).unwrap_or_default();
                if !sev_str.contains(sev) {
                    return false;
                }
            }
            true
        })
        .collect();
    // 按严重度降序排列
    filtered.sort_by(|a, b| b.severity.cmp(&a.severity));

    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).clamp(1, 100);
    let offset = ((page - 1) * page_size) as usize;
    if offset >= filtered.len() {
        filtered.clear();
    } else {
        let end = (offset + page_size as usize).min(filtered.len());
        filtered = filtered[offset..end].to_vec();
    }
    filtered
}

/// 解决审计发现
async fn resolve_finding(finding_id: &str, req: &ResolveFindingRequest) -> Option<AuditFinding> {
    ensure_compliance_audit_initialized().await;
    let store = get_compliance_audit_store();
    let mut findings = store.findings.lock().await;
    let finding = findings.iter_mut().find(|f| f.finding_id == finding_id)?;
    finding.status = parse_finding_status(&req.status).unwrap_or(FindingStatus::Resolved);
    if let Some(ref note) = req.resolution_note {
        finding.evidence = serde_json::json!({
            "previous_evidence": finding.evidence,
            "resolution_note": note,
            "resolved_at": chrono::Utc::now().to_rfc3339(),
        });
    }
    Some(finding.clone())
}

#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
/// 生成审计报告
async fn generate_audit_report(framework: Option<&str>) -> ComplianceAuditReport {
    ensure_compliance_audit_initialized().await;
    let store = get_compliance_audit_store();
    let rules = store.rules.lock().await.clone();
    let findings = store.findings.lock().await.clone();

    let fw = framework.and_then(parse_audit_framework);

    let filtered_rules: Vec<&ComplianceRule> = match fw.as_ref() {
        Some(f) => rules.iter().filter(|r| &r.framework == f).collect(),
        None => rules.iter().collect(),
    };

    let filtered_findings: Vec<&AuditFinding> = match fw.as_ref() {
        Some(f) => findings
            .iter()
            .filter(|finding| {
                rules
                    .iter()
                    .any(|r| r.rule_id == finding.rule_id && &r.framework == f)
            })
            .collect(),
        None => findings.iter().collect(),
    };

    let total_rules = filtered_rules.len();
    let compliant_count = filtered_rules
        .iter()
        .filter(|r| matches!(r.status, ComplianceStatus::Compliant))
        .count();
    let score = if total_rules > 0 {
        (compliant_count as f64 / total_rules as f64 * 100.0 * 10.0).round() / 10.0
    } else {
        0.0
    };

    let overall_status = if score >= 90.0 {
        ComplianceStatus::Compliant
    } else if score >= 70.0 {
        ComplianceStatus::PartiallyCompliant
    } else {
        ComplianceStatus::NonCompliant
    };

    let audit_framework = fw.unwrap_or(AuditFramework::DataGovernance);
    let now = chrono::Utc::now();
    let period = format!(
        "{} ~ {}",
        (now - chrono::Duration::days(90)).format("%Y-%m-%d"),
        now.format("%Y-%m-%d")
    );

    ComplianceAuditReport {
        report_id: format!("audit-report-{}", now.timestamp()),
        framework: audit_framework,
        audit_period: period,
        total_rules,
        compliant_count,
        findings: filtered_findings.into_iter().cloned().collect(),
        overall_status,
        score,
        generated_at: now,
    }
}

#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
/// 获取审计评分卡
async fn get_audit_scorecard(framework: Option<&str>) -> AuditScorecard {
    ensure_compliance_audit_initialized().await;
    let store = get_compliance_audit_store();
    let rules = store.rules.lock().await.clone();

    let fw = framework
        .and_then(parse_audit_framework)
        .unwrap_or(AuditFramework::DataGovernance);

    let fw_rules: Vec<&ComplianceRule> = rules.iter().filter(|r| r.framework == fw).collect();
    let total = fw_rules.len();
    let compliant = fw_rules
        .iter()
        .filter(|r| matches!(r.status, ComplianceStatus::Compliant))
        .count();
    let score = if total > 0 {
        (compliant as f64 / total as f64 * 100.0 * 10.0).round() / 10.0
    } else {
        0.0
    };

    let mut by_category: HashMap<String, f64> = HashMap::new();
    for r in &fw_rules {
        let cat = match r.severity {
            FindingSeverity::Critical => "严重级规则",
            FindingSeverity::High => "高级规则",
            FindingSeverity::Medium => "中级规则",
            FindingSeverity::Low => "低级规则",
        };
        let entry = by_category.entry(cat.to_string()).or_insert(0.0);
        if matches!(r.status, ComplianceStatus::Compliant) {
            *entry += 1.0;
        }
    }
    for v in by_category.values_mut() {
        *v = (*v / total as f64 * 100.0 * 10.0).round() / 10.0;
    }

    // 模拟趋势（基于历史合规率提升）
    let trend = vec![
        (score - 10.0).max(0.0),
        (score - 5.0).max(0.0),
        (score - 2.0).max(0.0),
        score,
    ];

    AuditScorecard {
        framework: fw,
        score,
        grade: compliance_grade(score),
        by_category,
        trend,
    }
}

#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
/// 获取合规审计统计
async fn get_compliance_audit_stats() -> ComplianceAuditStats {
    ensure_compliance_audit_initialized().await;
    let store = get_compliance_audit_store();
    let rules = store.rules.lock().await.clone();
    let findings = store.findings.lock().await.clone();

    let mut rules_by_framework: HashMap<String, usize> = HashMap::new();
    for r in &rules {
        *rules_by_framework
            .entry(r.framework.label().to_string())
            .or_insert(0) += 1;
    }
    let mut findings_by_severity: HashMap<String, usize> = HashMap::new();
    for f in &findings {
        *findings_by_severity
            .entry(f.severity.label().to_string())
            .or_insert(0) += 1;
    }
    let mut findings_by_status: HashMap<String, usize> = HashMap::new();
    for f in &findings {
        *findings_by_status
            .entry(f.status.label().to_string())
            .or_insert(0) += 1;
    }

    let compliant = rules
        .iter()
        .filter(|r| matches!(r.status, ComplianceStatus::Compliant))
        .count();
    let compliance_rate = if rules.is_empty() {
        0.0
    } else {
        (compliant as f64 / rules.len() as f64 * 100.0 * 10.0).round() / 10.0
    };

    ComplianceAuditStats {
        total_rules: rules.len(),
        total_findings: findings.len(),
        rules_by_framework,
        findings_by_severity,
        findings_by_status,
        compliance_rate,
    }
}

// ==================== 合规审计 Handlers ====================

/// GET /audit/rules — 列出合规规则
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/master-data-refs/audit/rules",
    tag = "MasterDataRefs",
    operation_id = "list_compliance_rules_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn list_compliance_rules_handler(
    State(state): State<ApiState>,
    Query(params): Query<ComplianceRuleQuery>,
) -> ApiResponse<Vec<ComplianceRule>> {
    let _ = &state;
    let rules = list_compliance_rules(params.framework.as_deref()).await;
    ApiResponse::success(rules, "合规规则列表获取成功")
}

/// POST /audit/rules — 创建合规规则
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:master-data:write"])),
    path = "/api/erp/master-data-refs/audit/rules",
    tag = "Master Data",
    operation_id = "create_compliance_rule_handler",
    responses((status = 200, description = "OK")),
)]
pub async fn create_compliance_rule_handler(
    State(state): State<ApiState>,
    Json(req): Json<ComplianceRuleRequest>,
) -> ApiResponse<ComplianceRule> {
    let _ = &state;
    let rule = create_compliance_rule(&req).await;
    ApiResponse::success(rule, "合规规则创建成功")
}

/// POST /audit/check — 执行合规检查
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/api/erp/master-data-refs/audit/check",
    tag = "Master Data",
    operation_id = "run_compliance_check_handler",
    responses((status = 200, description = "OK")),
)]
pub async fn run_compliance_check_handler(
    State(state): State<ApiState>,
    Json(req): Json<ComplianceCheckRequest>,
) -> ApiResponse<Vec<AuditFinding>> {
    let _ = &state;
    let findings = run_compliance_check(&req).await;
    ApiResponse::success(findings, "合规检查执行完成")
}

/// GET /audit/findings — 获取审计发现
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/master-data-refs/get-audit-findings-handler",
    tag = "MasterDataRefs",
    operation_id = "get_audit_findings_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_audit_findings_handler(
    State(state): State<ApiState>,
    Query(params): Query<AuditFindingQuery>,
) -> ApiResponse<Vec<AuditFinding>> {
    let _ = &state;
    let findings = get_audit_findings(&params).await;
    ApiResponse::success(findings, "审计发现列表获取成功")
}

/// POST /audit/findings/{finding_id}/resolve — 解决审计发现
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/api/erp/master-data-refs/audit/findings/{finding_id}/resolve",
    tag = "Master Data",
    operation_id = "resolve_finding_handler",
    responses((status = 200, description = "OK")),
)]
pub async fn resolve_finding_handler(
    State(state): State<ApiState>,
    Path(finding_id): Path<String>,
    Json(req): Json<ResolveFindingRequest>,
) -> ApiResponse<AuditFinding> {
    let _ = &state;
    match resolve_finding(&finding_id, &req).await {
        Some(finding) => ApiResponse::success(finding, "审计发现已更新"),
        None => ApiResponse::not_found("未找到审计发现"),
    }
}

/// GET /audit/report — 生成审计报告（GET 语义）
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:write"])),
    path = "/master-data-refs/audit/report",
    tag = "MasterDataRefs",
    operation_id = "generate_audit_report_handler_get",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn generate_audit_report_handler_get(
    state: State<ApiState>,
    params: Query<ComplianceRuleQuery>,
) -> ApiResponse<ComplianceAuditReport> {
    generate_audit_report_handler(state, params).await
}

/// GET /audit/report — 生成审计报告
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/master-data-refs/audit/report",
    tag = "MasterDataRefs",
    operation_id = "generate_audit_report_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn generate_audit_report_handler(
    State(state): State<ApiState>,
    Query(params): Query<ComplianceRuleQuery>,
) -> ApiResponse<ComplianceAuditReport> {
    let _ = &state;
    let report = generate_audit_report(params.framework.as_deref()).await;
    ApiResponse::success(report, "审计报告生成成功")
}

/// GET /audit/scorecard — 获取审计评分卡
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/master-data-refs/get-audit-scorecard-handler",
    tag = "MasterDataRefs",
    operation_id = "get_audit_scorecard_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_audit_scorecard_handler(
    State(state): State<ApiState>,
    Query(params): Query<ComplianceRuleQuery>,
) -> ApiResponse<AuditScorecard> {
    let _ = &state;
    let scorecard = get_audit_scorecard(params.framework.as_deref()).await;
    ApiResponse::success(scorecard, "审计评分卡获取成功")
}

/// GET /audit/stats — 获取合规审计统计
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/api/erp/master-data-refs/audit/stats",
    tag = "Master Data",
    operation_id = "get_compliance_audit_stats_handler",
    responses((status = 200, description = "OK")),
)]
pub async fn get_compliance_audit_stats_handler(
    State(state): State<ApiState>,
) -> ApiResponse<ComplianceAuditStats> {
    let _ = &state;
    let stats = get_compliance_audit_stats().await;
    ApiResponse::success(stats, "合规审计统计获取成功")
}

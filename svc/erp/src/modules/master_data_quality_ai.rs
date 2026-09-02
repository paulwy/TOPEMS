// ==================== 主数据质量 AI 类型 ====================

use axum::extract::{Json, Path, Query, State};
use serde::Deserialize;
use std::collections::HashMap;
use std::sync::LazyLock;

use topems_shared::ApiResponse;
use topems_shared_core::response::PaginatedResponse;

use super::ApiState;

/// 质量风险等级
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum QualityRiskLevel {
    /// 低风险
    Low,
    /// 中风险
    Medium,
    /// 高风险
    High,
    /// 严重风险
    Critical,
}

impl QualityRiskLevel {
    fn from_score(score: f64) -> Self {
        if score >= 85.0 {
            Self::Low
        } else if score >= 70.0 {
            Self::Medium
        } else if score >= 50.0 {
            Self::High
        } else {
            Self::Critical
        }
    }
    fn as_str(&self) -> &'static str {
        match self {
            Self::Low => "low",
            Self::Medium => "medium",
            Self::High => "high",
            Self::Critical => "critical",
        }
    }
}

/// 主数据质量 AI 评分（加权多维度）
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct QualityAiScore {
    pub entity_id: String,
    pub domain: String,
    /// 综合质量分（0-100）
    pub overall_score: f64,
    /// 完整性评分（必填字段填充率）
    pub completeness_score: f64,
    /// 准确性评分（格式/范围校验通过率）
    pub accuracy_score: f64,
    /// 一致性评分（跨字段/跨服务一致性）
    pub consistency_score: f64,
    /// 时效性评分（数据新鲜度）
    pub timeliness_score: f64,
    /// 唯一性评分（重复检测）
    pub uniqueness_score: f64,
    /// 有效性评分（引用完整性 + 业务规则）
    pub validity_score: f64,
    pub risk_level: String,
    pub risk_factors: Vec<String>,
    pub recommendations: Vec<String>,
    pub scored_at: String,
}

/// 质量异常（Z-Score / IQR / 阈值规则检测）
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct QualityAnomaly {
    pub id: String,
    pub entity_id: String,
    pub domain: String,
    /// anomaly_type: z_score / iqr / threshold / null_spike / format_violation
    pub anomaly_type: String,
    /// severity: info / warning / error / critical
    pub severity: String,
    pub description: String,
    pub detected_value: String,
    pub expected_range: String,
    pub confidence: f64,
    pub detected_at: String,
}

/// 质量预测（基于历史趋势线性回归）
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct QualityPrediction {
    pub entity_id: String,
    pub domain: String,
    /// predicted_quality_trend: improving / stable / declining
    pub predicted_quality_trend: String,
    pub predicted_issues: Vec<String>,
    pub confidence: f64,
    pub factors: Vec<String>,
    pub prediction_date: String,
}

// --- 质量 AI 请求/查询类型 ---

#[derive(Debug, Deserialize)]
pub struct BatchScoreRequest {
    pub domain: Option<String>,
    pub entity_ids: Option<Vec<String>>,
}

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct QualityAnomalyQuery {
    pub domain: Option<String>,
    pub entity_id: Option<String>,
    pub severity: Option<String>,
    pub anomaly_type: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct PredictQualityRequest {
    pub horizon_days: Option<usize>,
}

#[derive(Debug, Deserialize)]
pub struct QualityAiStatsQuery {
    pub domain: Option<String>,
}

// ==================== 主数据质量 AI 存储 ====================

pub struct QualityAiStore {
    pub scores: tokio::sync::Mutex<HashMap<String, QualityAiScore>>,
    pub anomalies: tokio::sync::Mutex<Vec<QualityAnomaly>>,
    /// entity_id -> 历史质量分序列（按时间递增）(timestamp, score)
    pub quality_history: tokio::sync::Mutex<HashMap<String, Vec<(String, f64)>>>,
    pub initialized: tokio::sync::Mutex<bool>,
}

fn get_quality_ai_store() -> &'static QualityAiStore {
    static STORE: LazyLock<QualityAiStore> = LazyLock::new(|| QualityAiStore {
        scores: tokio::sync::Mutex::new(HashMap::new()),
        anomalies: tokio::sync::Mutex::new(Vec::new()),
        quality_history: tokio::sync::Mutex::new(HashMap::new()),
        initialized: tokio::sync::Mutex::new(false),
    });
    &STORE
}

/// 预置实体特征（用于评分计算；真实数据由 MDM_GRAPHQL_STORE 派生）
#[derive(Clone)]
struct EntityProfile {
    id: String,
    domain: String,
    code: String,
    name: Option<String>,
    fields: HashMap<String, Option<String>>,
    last_synced_days_ago: i64,
}

async fn ensure_quality_ai_initialized() {
    let store = get_quality_ai_store();
    let mut initialized = store.initialized.lock().await;
    if *initialized {
        return;
    }

    // 预置 6 大主数据域的实体样本 + 历史质量趋势
    let now = chrono::Utc::now();
    let mut history: HashMap<String, Vec<(String, f64)>> = HashMap::new();

    let samples: Vec<EntityProfile> = build_entity_profiles();

    for profile in &samples {
        // 为每个实体生成 8 个时间点的历史质量分（线性回归基础）
        let mut series: Vec<(String, f64)> = Vec::new();
        let base = match profile.domain.as_str() {
            "customer" => 82.0,
            "supplier" => 85.0,
            "material" => 88.0,
            "employee" => 90.0,
            "account_subject" => 92.0,
            "organization" => 87.0,
            _ => 80.0,
        };
        for i in 0..8 {
            let ts = now - chrono::Duration::days((7 - i) * 7);
            // 制造轻微下降趋势 + 微噪声
            let noise = ((i as f64 * 1.3) + (profile.code.len() as f64)) % 3.0;
            let score = (base - i as f64 * 1.2 + noise - 1.5).max(40.0).min(99.0);
            series.push((ts.to_rfc3339(), (score * 10.0).round() / 10.0));
        }
        history.insert(profile.id.clone(), series);
    }

    *store.quality_history.lock().await = history;
    *initialized = true;
}

/// 构造预置实体画像（覆盖 6 大主数据域，含故意制造的质量缺陷以触发异常检测）
fn build_entity_profiles() -> Vec<EntityProfile> {
    let now = chrono::Utc::now();
    let rfc = |days_ago: i64| (now - chrono::Duration::days(days_ago)).to_rfc3339();

    let mut profiles = Vec::new();
    let domains: Vec<(&str, Vec<(&str, Option<&str>, i64)>)> = vec![
        (
            "customer",
            vec![
                ("C001", Some("优质客户A"), 5),
                ("C002", Some("盛达贸易集团"), 30),
                ("C003", Some("恒泰制造股份"), 2),
                ("C004", Some("创新电子科技"), 90),
                ("C005", Some(""), 15), // 缺名
            ],
        ),
        (
            "supplier",
            vec![
                ("S001", Some("原材料供应商A"), 7),
                ("S002", Some("零部件供应商B"), 60),
                ("S003", Some("包装材料供应商C"), 3),
                ("S004", Some("设备供应商D"), 200), // 严重过期
            ],
        ),
        (
            "material",
            vec![
                ("M001", Some("产品甲"), 4),
                ("M002", Some("产品乙"), 8),
                ("M003", Some("原材料A"), 1),
                ("M004", Some(""), 12), // 缺名
                ("M005", Some("零部件X"), 6),
                ("M006", Some("零部件Y"), 45),
            ],
        ),
        (
            "employee",
            vec![
                ("E001", Some("张三"), 6),
                ("E002", Some("李四"), 10),
                ("E003", Some("王五"), 3),
                ("E004", Some("赵六"), 25),
            ],
        ),
        (
            "account_subject",
            vec![
                ("A001", Some("应收账款"), 1),
                ("A002", Some("应付账款"), 2),
                ("A003", Some("主营业务收入"), 1),
            ],
        ),
        (
            "organization",
            vec![
                ("O001", Some("总部"), 5),
                ("O002", Some("华东分公司"), 5),
                ("O003", Some("华南分公司"), 5),
            ],
        ),
    ];

    for (domain, items) in domains {
        for (code, name, days_ago) in items {
            let id = format!("md-{}-{}", domain, code);
            let mut fields = HashMap::new();
            fields.insert("code".to_string(), Some(code.to_string()));
            fields.insert("name".to_string(), name.map(|s| s.to_string()));
            fields.insert("status".to_string(), Some("active".to_string()));
            fields.insert("last_synced_at".to_string(), Some(rfc(days_ago)));
            // 给部分实体附加更多业务字段（用于完整性/准确性评分）
            match domain {
                "customer" => {
                    fields.insert("phone".to_string(), Some("13800138000".to_string()));
                    fields.insert("email".to_string(), Some(format!("{}@example.com", code)));
                    fields.insert("address".to_string(), Some("北京市朝阳区".to_string()));
                }
                "supplier" => {
                    fields.insert("grade".to_string(), Some("A".to_string()));
                    fields.insert("category".to_string(), Some("原材料".to_string()));
                    fields.insert("region".to_string(), Some("华北".to_string()));
                }
                "material" => {
                    fields.insert("category".to_string(), Some("成品".to_string()));
                    fields.insert("unit".to_string(), Some("个".to_string()));
                    fields.insert("price".to_string(), Some("99.50".to_string()));
                }
                _ => {}
            }
            profiles.push(EntityProfile {
                id,
                domain: domain.to_string(),
                code: code.to_string(),
                name: name.map(|s| s.to_string()),
                fields,
                last_synced_days_ago: days_ago,
            });
        }
    }
    profiles
}

/// 按域获取该域所有必填字段
fn domain_required_fields(domain: &str) -> Vec<&'static str> {
    match domain {
        "customer" => vec!["code", "name", "phone", "email", "address"],
        "supplier" => vec!["code", "name", "grade", "category", "region"],
        "material" => vec!["code", "name", "category", "unit", "price"],
        "employee" => vec!["code", "name"],
        "account_subject" => vec!["code", "name"],
        "organization" => vec!["code", "name"],
        _ => vec!["code", "name"],
    }
}

/// 计算完整性评分：必填字段填充率
fn score_completeness(profile: &EntityProfile) -> f64 {
    let required = domain_required_fields(&profile.domain);
    if required.is_empty() {
        return 100.0;
    }
    let filled = required
        .iter()
        .filter(|f| {
            profile
                .fields
                .get(**f)
                .and_then(|v| v.as_ref())
                .map(|s| !s.is_empty())
                .unwrap_or(false)
        })
        .count();
    (filled as f64 / required.len() as f64) * 100.0
}

/// 计算准确性评分：格式与范围校验
fn score_accuracy(profile: &EntityProfile) -> f64 {
    let mut pass = 0.0;
    let mut total = 0.0;
    // code 必须是字母数字
    total += 1.0;
    if profile.code.chars().all(|c| c.is_alphanumeric()) && !profile.code.is_empty() {
        pass += 1.0;
    }
    // name 长度合理（2-64）
    if let Some(name) = &profile.name {
        if !name.is_empty() {
            total += 1.0;
            let len = name.chars().count();
            if (2..=64).contains(&len) {
                pass += 1.0;
            }
        }
    }
    // email 格式（若存在）
    if let Some(Some(email)) = profile.fields.get("email") {
        total += 1.0;
        if email.contains('@') && email.contains('.') {
            pass += 1.0;
        }
    }
    // phone 格式（若存在）
    if let Some(Some(phone)) = profile.fields.get("phone") {
        total += 1.0;
        let digits: String = phone.chars().filter(|c| c.is_numeric()).collect();
        if digits.len() >= 8 && digits.len() <= 15 {
            pass += 1.0;
        }
    }
    // price 数值范围（若存在）
    if let Some(Some(price)) = profile.fields.get("price") {
        total += 1.0;
        if let Ok(v) = price.parse::<f64>() {
            if v > 0.0 && v < 1_000_000.0 {
                pass += 1.0;
            }
        }
    }
    if total == 0.0 {
        100.0
    } else {
        (pass / total) * 100.0
    }
}

/// 计算一致性评分：跨字段逻辑一致性
fn score_consistency(profile: &EntityProfile) -> f64 {
    let mut score: f64 = 100.0;
    // status 与 name 一致性：name 为空但 status=active 视为不一致
    if profile.name.as_deref().unwrap_or("").is_empty()
        && profile
            .fields
            .get("status")
            .and_then(|v| v.as_ref())
            .map(|s| s == "active")
            .unwrap_or(false)
    {
        score -= 30.0;
    }
    // 同步时间与状态一致性：超过 90 天未同步但 active 视为不一致
    if profile.last_synced_days_ago > 90
        && profile
            .fields
            .get("status")
            .and_then(|v| v.as_ref())
            .map(|s| s == "active")
            .unwrap_or(false)
    {
        score -= 20.0;
    }
    score.max(0.0)
}

/// 计算时效性评分：基于 last_synced_at 新鲜度
fn score_timeliness(profile: &EntityProfile) -> f64 {
    let days = profile.last_synced_days_ago;
    // 7 天内 100 分，每增加 1 天扣 1.5 分，最低 0
    if days <= 7 {
        100.0
    } else {
        (100.0 - (days - 7) as f64 * 1.5).max(0.0)
    }
}

/// 计算唯一性评分：基于域内 code 重复率（此处用 code 字符特征近似）
fn score_uniqueness(profile: &EntityProfile) -> f64 {
    // code 长度 >=3 且无重复字符段视为唯一性高
    let code = &profile.code;
    if code.len() < 3 {
        return 50.0;
    }
    let mut score: f64 = 90.0;
    // 含连续重复字符扣分
    let mut prev = '\0';
    let mut repeat = 0;
    for ch in code.chars() {
        if ch == prev {
            repeat += 1;
        } else {
            repeat = 0;
        }
        prev = ch;
        if repeat >= 2 {
            score -= 15.0;
        }
    }
    score.max(0.0)
}

/// 计算有效性评分：引用完整性 + 业务规则
fn score_validity(profile: &EntityProfile) -> f64 {
    let mut score: f64 = 100.0;
    // status 必须是合法枚举
    let valid_statuses = ["active", "inactive", "archived", "pending_destruction"];
    if let Some(Some(status)) = profile.fields.get("status") {
        if !valid_statuses.contains(&status.as_str()) {
            score -= 40.0;
        }
    } else {
        score -= 20.0;
    }
    // material 的 unit 必须非空
    if profile.domain == "material"
        && profile
            .fields
            .get("unit")
            .and_then(|v| v.as_ref())
            .map(|s| s.is_empty())
            .unwrap_or(true)
    {
        score -= 25.0;
    }
    // supplier 的 grade 必须是 A/B/C
    if profile.domain == "supplier" {
        if let Some(Some(grade)) = profile.fields.get("grade") {
            if !["A", "B", "C"].contains(&grade.as_str()) {
                score -= 30.0;
            }
        }
    }
    score.max(0.0)
}

/// 加权综合评分：完整性 20% + 准确性 25% + 一致性 20% + 时效性 15% + 唯一性 10% + 有效性 10%
fn weighted_overall(c: f64, a: f64, co: f64, t: f64, u: f64, v: f64) -> f64 {
    c * 0.20 + a * 0.25 + co * 0.20 + t * 0.15 + u * 0.10 + v * 0.10
}

/// 生成风险因子与改进建议
fn build_risk_factors_and_recommendations(
    profile: &EntityProfile,
    c: f64,
    a: f64,
    co: f64,
    t: f64,
    u: f64,
    v: f64,
) -> (Vec<String>, Vec<String>) {
    let mut factors = Vec::new();
    let mut recs = Vec::new();
    if c < 80.0 {
        factors.push(format!("完整性不足（{:.1}）：部分必填字段缺失", c));
        recs.push("补全缺失的必填字段".to_string());
    }
    if a < 80.0 {
        factors.push(format!("准确性偏低（{:.1}）：存在格式/范围违规", a));
        recs.push("按格式规范校验并修正字段值".to_string());
    }
    if co < 80.0 {
        factors.push(format!("一致性问题（{:.1}）：跨字段逻辑冲突", co));
        recs.push("核对状态与同步时间的逻辑一致性".to_string());
    }
    if t < 60.0 {
        factors.push(format!(
            "时效性差（{:.1}）：数据已过期 {} 天",
            t, profile.last_synced_days_ago
        ));
        recs.push("立即触发主数据同步".to_string());
    }
    if u < 80.0 {
        factors.push(format!("唯一性风险（{:.1}）：编码可能重复", u));
        recs.push("执行去重检查与合并".to_string());
    }
    if v < 80.0 {
        factors.push(format!("有效性问题（{:.1}）：业务规则未满足", v));
        recs.push("按业务规则校验引用完整性".to_string());
    }
    if factors.is_empty() {
        factors.push("无明显风险".to_string());
        recs.push("保持定期质量巡检".to_string());
    }
    (factors, recs)
}

/// 单实体评分核心
fn score_entity_internal(profile: &EntityProfile) -> QualityAiScore {
    let c = score_completeness(profile);
    let a = score_accuracy(profile);
    let co = score_consistency(profile);
    let t = score_timeliness(profile);
    let u = score_uniqueness(profile);
    let v = score_validity(profile);
    let overall = weighted_overall(c, a, co, t, u, v);
    let risk = QualityRiskLevel::from_score(overall);
    let (factors, recs) = build_risk_factors_and_recommendations(profile, c, a, co, t, u, v);
    QualityAiScore {
        entity_id: profile.id.clone(),
        domain: profile.domain.clone(),
        overall_score: (overall * 10.0).round() / 10.0,
        completeness_score: (c * 10.0).round() / 10.0,
        accuracy_score: (a * 10.0).round() / 10.0,
        consistency_score: (co * 10.0).round() / 10.0,
        timeliness_score: (t * 10.0).round() / 10.0,
        uniqueness_score: (u * 10.0).round() / 10.0,
        validity_score: (v * 10.0).round() / 10.0,
        risk_level: risk.as_str().to_string(),
        risk_factors: factors,
        recommendations: recs,
        scored_at: chrono::Utc::now().to_rfc3339(),
    }
}

/// 异常检测：Z-Score + IQR + 阈值规则
fn detect_anomalies_internal(profiles: &[EntityProfile]) -> Vec<QualityAnomaly> {
    let now = chrono::Utc::now().to_rfc3339();
    let mut anomalies = Vec::new();

    // 1. 阈值规则：时效性异常
    for p in profiles {
        if p.last_synced_days_ago > 90 {
            anomalies.push(QualityAnomaly {
                id: format!("anom-{}-threshold", p.id),
                entity_id: p.id.clone(),
                domain: p.domain.clone(),
                anomaly_type: "threshold".to_string(),
                severity: "critical".to_string(),
                description: format!("数据已 {} 天未同步，超过 90 天阈值", p.last_synced_days_ago),
                detected_value: format!("{}天", p.last_synced_days_ago),
                expected_range: "0-90天".to_string(),
                confidence: 0.95,
                detected_at: now.clone(),
            });
        }
        // 2. 阈值规则：必填字段为空
        for f in domain_required_fields(&p.domain) {
            let empty = p
                .fields
                .get(f)
                .and_then(|v| v.as_ref())
                .map(|s| s.is_empty())
                .unwrap_or(true);
            if empty {
                anomalies.push(QualityAnomaly {
                    id: format!("anom-{}-null-{}", p.id, f),
                    entity_id: p.id.clone(),
                    domain: p.domain.clone(),
                    anomaly_type: "null_spike".to_string(),
                    severity: "error".to_string(),
                    description: format!("必填字段 {} 为空", f),
                    detected_value: "null".to_string(),
                    expected_range: "非空".to_string(),
                    confidence: 0.9,
                    detected_at: now.clone(),
                });
            }
        }
    }

    // 3. Z-Score：基于 last_synced_days_ago 的统计离群点
    let days: Vec<f64> = profiles
        .iter()
        .map(|p| p.last_synced_days_ago as f64)
        .collect();
    if days.len() >= 3 {
        let mean = days.iter().sum::<f64>() / days.len() as f64;
        let variance = days.iter().map(|d| (d - mean).powi(2)).sum::<f64>() / days.len() as f64;
        let std = variance.sqrt();
        if std > 0.0 {
            for p in profiles {
                let z = (p.last_synced_days_ago as f64 - mean) / std;
                if z.abs() > 2.0 {
                    anomalies.push(QualityAnomaly {
                        id: format!("anom-{}-zscore", p.id),
                        entity_id: p.id.clone(),
                        domain: p.domain.clone(),
                        anomaly_type: "z_score".to_string(),
                        severity: if z.abs() > 3.0 { "critical" } else { "warning" }.to_string(),
                        description: format!("同步时效 Z-Score={:.2}，偏离均值 {:.1} 天", z, mean),
                        detected_value: format!("{}", p.last_synced_days_ago),
                        expected_range: format!("均值±2σ（均值 {:.1}, σ {:.1}）", mean, std),
                        confidence: (1.0 - (z.abs() - 2.0).min(1.0) / 4.0).max(0.5),
                        detected_at: now.clone(),
                    });
                }
            }
        }
    }

    // 4. IQR：基于 name 字符长度的箱线图离群点
    let lengths: Vec<f64> = profiles
        .iter()
        .filter_map(|p| p.name.as_ref().map(|n| n.chars().count() as f64))
        .collect();
    if lengths.len() >= 4 {
        let mut sorted = lengths.clone();
        sorted.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
        let q1 = sorted[sorted.len() / 4];
        let q3 = sorted[sorted.len() * 3 / 4];
        let iqr = q3 - q1;
        let lower = q1 - 1.5 * iqr;
        let upper = q3 + 1.5 * iqr;
        for p in profiles {
            if let Some(name) = &p.name {
                let len = name.chars().count() as f64;
                if len < lower || len > upper {
                    anomalies.push(QualityAnomaly {
                        id: format!("anom-{}-iqr", p.id),
                        entity_id: p.id.clone(),
                        domain: p.domain.clone(),
                        anomaly_type: "iqr".to_string(),
                        severity: "info".to_string(),
                        description: format!(
                            "名称长度 {} 异常（IQR 区间 [{:.0}, {:.0}])",
                            name, lower, upper
                        ),
                        detected_value: format!("{}字符", len),
                        expected_range: format!("[{:.0}, {:.0}]", lower, upper),
                        confidence: 0.7,
                        detected_at: now.clone(),
                    });
                }
            }
        }
    }

    anomalies
}

/// 简单线性回归（最小二乘法）返回 (斜率, 截距)
fn linear_regression(points: &[(f64, f64)]) -> (f64, f64) {
    let n = points.len() as f64;
    if n < 2.0 {
        return (0.0, points.first().map(|(_, y)| *y).unwrap_or(0.0));
    }
    let sum_x: f64 = points.iter().map(|(x, _)| *x).sum();
    let sum_y: f64 = points.iter().map(|(_, y)| *y).sum();
    let sum_xy: f64 = points.iter().map(|(x, y)| x * y).sum();
    let sum_x2: f64 = points.iter().map(|(x, _)| x * x).sum();
    let denom = n * sum_x2 - sum_x * sum_x;
    if denom == 0.0 {
        return (0.0, sum_y / n);
    }
    let slope = (n * sum_xy - sum_x * sum_y) / denom;
    let intercept = (sum_y - slope * sum_x) / n;
    (slope, intercept)
}

/// 质量预测：基于历史趋势线性回归
fn predict_quality_internal(
    entity_id: &str,
    domain: &str,
    history: &[(String, f64)],
) -> QualityPrediction {
    let now = chrono::Utc::now();
    // 将时间戳转为序号（按索引）
    let points: Vec<(f64, f64)> = history
        .iter()
        .enumerate()
        .map(|(i, (_, s))| (i as f64, *s))
        .collect();
    let (slope, intercept) = linear_regression(&points);
    let last_score = history.last().map(|(_, s)| *s).unwrap_or(80.0);
    // 预测下一个时间点
    let next_x = points.len() as f64;
    let predicted = slope * next_x + intercept;

    let trend = if slope > 0.5 {
        "improving"
    } else if slope < -0.5 {
        "declining"
    } else {
        "stable"
    };

    let mut issues = Vec::new();
    if predicted < 60.0 {
        issues.push("预测质量将降至 60 分以下，需立即干预".to_string());
    }
    if slope < -1.0 {
        issues.push(format!("质量下降趋势明显（斜率 {:.2}）", slope));
    }
    if last_score < 70.0 {
        issues.push("当前质量已低于阈值".to_string());
    }
    if issues.is_empty() {
        issues.push("未预测到显著问题".to_string());
    }

    let mut factors = vec![
        format!("历史样本数: {}", history.len()),
        format!("回归斜率: {:.3}", slope),
        format!("当前得分: {:.1}", last_score),
        format!("预测下一点: {:.1}", predicted),
    ];
    if predicted < last_score {
        factors.push(format!("预期下降: {:.1} 分", last_score - predicted));
    } else if predicted > last_score {
        factors.push(format!("预期上升: {:.1} 分", predicted - last_score));
    }

    // 置信度：样本数越多 + 斜率越稳定 置信度越高
    let confidence = if history.len() >= 8 {
        0.85
    } else if history.len() >= 4 {
        0.7
    } else {
        0.5
    };

    QualityPrediction {
        entity_id: entity_id.to_string(),
        domain: domain.to_string(),
        predicted_quality_trend: trend.to_string(),
        predicted_issues: issues,
        confidence,
        factors,
        prediction_date: now.to_rfc3339(),
    }
}

// ==================== 质量 AI handlers ====================

/// POST /quality-ai/score/{id} — 单实体质量评分
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/erp/master-data/quality-ai/score/{id}",
    tag = "Master Data",
    params(("id" = String, Path, description = "实体ID")),
    responses((status = 200, description = "质量 AI 评分成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn quality_ai_score_entity(
    State(state): State<ApiState>,
    Path(entity_id): Path<String>,
) -> Json<ApiResponse<QualityAiScore>> {
    let _ = &state;
    ensure_quality_ai_initialized().await;
    let profiles = build_entity_profiles();
    let profile = match profiles.iter().find(|p| p.id == entity_id) {
        Some(p) => p,
        None => return Json(ApiResponse::error(404, "未找到实体")),
    };
    let score = score_entity_internal(profile);
    let store = get_quality_ai_store();
    store
        .scores
        .lock()
        .await
        .insert(entity_id.clone(), score.clone());
    // 同时更新历史序列
    let mut history = store.quality_history.lock().await;
    let entry = history.entry(entity_id).or_default();
    entry.push((score.scored_at.clone(), score.overall_score));
    if entry.len() > 20 {
        entry.remove(0);
    }
    Json(ApiResponse::success(score, "质量 AI 评分完成"))
}

/// POST /quality-ai/batch-score — 批量评分
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/erp/master-data/quality-ai/batch-score",
    tag = "Master Data",
    responses((status = 200, description = "质量 AI 批量评分成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn quality_ai_batch_score(
    State(state): State<ApiState>,
    Json(req): Json<BatchScoreRequest>,
) -> Json<ApiResponse<Vec<QualityAiScore>>> {
    let _ = &state;
    ensure_quality_ai_initialized().await;
    let profiles = build_entity_profiles();
    let filtered: Vec<&EntityProfile> = profiles
        .iter()
        .filter(|p| {
            if let Some(ref domain) = req.domain {
                if &p.domain != domain {
                    return false;
                }
            }
            if let Some(ref ids) = req.entity_ids {
                if !ids.contains(&p.id) {
                    return false;
                }
            }
            true
        })
        .collect();

    let mut scores = Vec::new();
    let now = chrono::Utc::now().to_rfc3339();
    let store = get_quality_ai_store();
    let mut scores_lock = store.scores.lock().await;
    let mut history = store.quality_history.lock().await;
    for profile in &filtered {
        let score = score_entity_internal(profile);
        let eid = profile.id.clone();
        scores_lock.insert(eid.clone(), score.clone());
        let entry = history.entry(eid).or_default();
        entry.push((now.clone(), score.overall_score));
        if entry.len() > 20 {
            entry.remove(0);
        }
        scores.push(score);
    }
    Json(ApiResponse::success(
        scores,
        &format!("批量评分完成（{} 条）", filtered.len()),
    ))
}

/// GET /quality-ai/anomalies — 异常列表
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/master-data-refs/quality-ai-get-anomalies",
    tag = "MasterDataRefs",
    operation_id = "quality_ai_get_anomalies",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn quality_ai_get_anomalies(
    State(state): State<ApiState>,
    Query(params): Query<QualityAnomalyQuery>,
) -> Json<ApiResponse<PaginatedResponse<QualityAnomaly>>> {
    let _ = &state;
    ensure_quality_ai_initialized().await;
    let profiles = build_entity_profiles();
    // 每次重新检测（数据可能变化）
    let detected = detect_anomalies_internal(&profiles);
    let mut store = get_quality_ai_store().anomalies.lock().await;
    *store = detected.clone();

    let filtered: Vec<QualityAnomaly> = detected
        .iter()
        .filter(|a| {
            params
                .domain
                .as_ref()
                .map(|d| &a.domain == d)
                .unwrap_or(true)
                && params
                    .entity_id
                    .as_ref()
                    .map(|e| &a.entity_id == e)
                    .unwrap_or(true)
                && params
                    .severity
                    .as_ref()
                    .map(|s| &a.severity == s)
                    .unwrap_or(true)
                && params
                    .anomaly_type
                    .as_ref()
                    .map(|t| &a.anomaly_type == t)
                    .unwrap_or(true)
        })
        .cloned()
        .collect();

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let total = filtered.len() as i64;
    let offset = ((page - 1) * page_size) as usize;
    let items: Vec<QualityAnomaly> = filtered
        .into_iter()
        .skip(offset)
        .take(page_size as usize)
        .collect();

    Json(ApiResponse::success(
        PaginatedResponse::new(items, total, page, page_size),
        "质量异常列表",
    ))
}

/// POST /quality-ai/predict/{id} — 质量预测
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/erp/master-data/quality-ai/predict/{id}",
    tag = "Master Data",
    params(("id" = String, Path, description = "实体ID")),
    responses((status = 200, description = "质量预测成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn quality_ai_predict_quality(
    State(state): State<ApiState>,
    Path(entity_id): Path<String>,
    Query(_req): Query<PredictQualityRequest>,
) -> Json<ApiResponse<QualityPrediction>> {
    let _ = &state;
    ensure_quality_ai_initialized().await;
    let profiles = build_entity_profiles();
    let profile = match profiles.iter().find(|p| p.id == entity_id) {
        Some(p) => p,
        None => return Json(ApiResponse::error(404, "未找到实体")),
    };
    let history_store = get_quality_ai_store().quality_history.lock().await;
    let history = history_store.get(&entity_id).cloned().unwrap_or_default();
    let prediction = predict_quality_internal(&entity_id, &profile.domain, &history);
    Json(ApiResponse::success(prediction, "质量预测完成"))
}

/// GET /quality-ai/stats — 质量 AI 统计
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/master-data/quality-ai/stats",
    tag = "Master Data",
    responses((status = 200, description = "获取质量 AI 统计成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn quality_ai_get_stats(
    State(state): State<ApiState>,
    Query(params): Query<QualityAiStatsQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    let _ = &state;
    ensure_quality_ai_initialized().await;
    let profiles = build_entity_profiles();
    let filtered: Vec<&EntityProfile> = profiles
        .iter()
        .filter(|p| {
            params
                .domain
                .as_ref()
                .map(|d| &p.domain == d)
                .unwrap_or(true)
        })
        .collect();

    let mut scores = Vec::new();
    for p in &filtered {
        scores.push(score_entity_internal(p));
    }
    let total = scores.len();
    let avg_overall = if total > 0 {
        scores.iter().map(|s| s.overall_score).sum::<f64>() / total as f64
    } else {
        0.0
    };
    let avg_completeness = if total > 0 {
        scores.iter().map(|s| s.completeness_score).sum::<f64>() / total as f64
    } else {
        0.0
    };
    let avg_accuracy = if total > 0 {
        scores.iter().map(|s| s.accuracy_score).sum::<f64>() / total as f64
    } else {
        0.0
    };
    let avg_consistency = if total > 0 {
        scores.iter().map(|s| s.consistency_score).sum::<f64>() / total as f64
    } else {
        0.0
    };
    let avg_timeliness = if total > 0 {
        scores.iter().map(|s| s.timeliness_score).sum::<f64>() / total as f64
    } else {
        0.0
    };
    let avg_uniqueness = if total > 0 {
        scores.iter().map(|s| s.uniqueness_score).sum::<f64>() / total as f64
    } else {
        0.0
    };
    let avg_validity = if total > 0 {
        scores.iter().map(|s| s.validity_score).sum::<f64>() / total as f64
    } else {
        0.0
    };

    let by_risk: HashMap<String, usize> = {
        let mut m: HashMap<String, usize> = HashMap::new();
        for s in &scores {
            *m.entry(s.risk_level.clone()).or_default() += 1;
        }
        m
    };

    let anomalies = detect_anomalies_internal(&filtered.into_iter().cloned().collect::<Vec<_>>());
    let by_anomaly_type: HashMap<String, usize> = {
        let mut m: HashMap<String, usize> = HashMap::new();
        for a in &anomalies {
            *m.entry(a.anomaly_type.clone()).or_default() += 1;
        }
        m
    };
    let by_severity: HashMap<String, usize> = {
        let mut m: HashMap<String, usize> = HashMap::new();
        for a in &anomalies {
            *m.entry(a.severity.clone()).or_default() += 1;
        }
        m
    };

    Json(ApiResponse::success(
        serde_json::json!({
            "total_entities": total,
            "avg_overall_score": (avg_overall * 10.0).round() / 10.0,
            "avg_completeness": (avg_completeness * 10.0).round() / 10.0,
            "avg_accuracy": (avg_accuracy * 10.0).round() / 10.0,
            "avg_consistency": (avg_consistency * 10.0).round() / 10.0,
            "avg_timeliness": (avg_timeliness * 10.0).round() / 10.0,
            "avg_uniqueness": (avg_uniqueness * 10.0).round() / 10.0,
            "avg_validity": (avg_validity * 10.0).round() / 10.0,
            "by_risk_level": by_risk,
            "anomaly_count": anomalies.len(),
            "by_anomaly_type": by_anomaly_type,
            "by_severity": by_severity,
        }),
        "质量 AI 统计",
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_quality_risk_level_serialization() {
        let level = QualityRiskLevel::Low;
        let json = serde_json::to_value(&level).unwrap();
        assert_eq!(json, "low");
    }

    #[test]
    fn test_quality_risk_level_medium() {
        let level = QualityRiskLevel::Medium;
        let json = serde_json::to_value(&level).unwrap();
        assert_eq!(json, "medium");
    }

    #[test]
    fn test_quality_risk_level_high() {
        let level = QualityRiskLevel::High;
        let json = serde_json::to_value(&level).unwrap();
        assert_eq!(json, "high");
    }

    #[test]
    fn test_quality_risk_level_critical() {
        let level = QualityRiskLevel::Critical;
        let json = serde_json::to_value(&level).unwrap();
        assert_eq!(json, "critical");
    }

    #[test]
    fn test_quality_risk_level_deserialize() {
        let level: QualityRiskLevel = serde_json::from_str("\"high\"").unwrap();
        assert!(matches!(level, QualityRiskLevel::High));
    }

    #[test]
    fn test_quality_ai_score_serialization() {
        let score = QualityAiScore {
            entity_id: "ent1".to_string(),
            domain: "customer".to_string(),
            overall_score: 92.5,
            completeness_score: 95.0,
            accuracy_score: 90.0,
            consistency_score: 93.0,
            timeliness_score: 88.0,
            uniqueness_score: 97.0,
            validity_score: 91.0,
            risk_level: "low".to_string(),
            risk_factors: vec!["时效性偏低".to_string()],
            recommendations: vec!["更新客户联系信息".to_string()],
            scored_at: "2024-01-01T00:00:00Z".to_string(),
        };
        let json = serde_json::to_value(&score).unwrap();
        assert_eq!(json["entity_id"], "ent1");
        assert_eq!(json["domain"], "customer");
        assert_eq!(json["overall_score"], 92.5);
        assert_eq!(json["completeness_score"], 95.0);
        assert_eq!(json["risk_level"], "low");
        assert_eq!(json["risk_factors"][0], "时效性偏低");
    }

    #[test]
    fn test_quality_anomaly_serialization() {
        let anomaly = QualityAnomaly {
            id: "anom1".to_string(),
            entity_id: "ent1".to_string(),
            domain: "customer".to_string(),
            anomaly_type: "z_score".to_string(),
            severity: "warning".to_string(),
            description: "客户名称长度异常".to_string(),
            detected_value: "255".to_string(),
            expected_range: "1-100".to_string(),
            confidence: 0.95,
            detected_at: "2024-01-01T00:00:00Z".to_string(),
        };
        let json = serde_json::to_value(&anomaly).unwrap();
        assert_eq!(json["id"], "anom1");
        assert_eq!(json["anomaly_type"], "z_score");
        assert_eq!(json["severity"], "warning");
        assert_eq!(json["confidence"], 0.95);
    }

    #[test]
    fn test_quality_prediction_serialization() {
        let prediction = QualityPrediction {
            entity_id: "ent1".to_string(),
            domain: "customer".to_string(),
            predicted_quality_trend: "declining".to_string(),
            predicted_issues: vec!["数据时效性下降".to_string()],
            confidence: 0.85,
            factors: vec!["最近30天未更新".to_string()],
            prediction_date: "2024-01-01".to_string(),
        };
        let json = serde_json::to_value(&prediction).unwrap();
        assert_eq!(json["entity_id"], "ent1");
        assert_eq!(json["predicted_quality_trend"], "declining");
        assert_eq!(json["confidence"], 0.85);
        assert_eq!(json["prediction_date"], "2024-01-01");
    }

    #[test]
    fn test_batch_score_request_deserialize() {
        let json = r#"{"domain": "customer", "entity_ids": ["ent1", "ent2"]}"#;
        let request: BatchScoreRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.domain.as_deref(), Some("customer"));
        assert_eq!(request.entity_ids.as_ref().unwrap().len(), 2);
    }

    #[test]
    fn test_quality_anomaly_query_deserialize() {
        let query = "domain=customer&entity_id=ent1&severity=warning&anomaly_type=z_score&page=1&page_size=20";
        let params: QualityAnomalyQuery = serde_urlencoded::from_str(query).unwrap();
        assert_eq!(params.domain.as_deref(), Some("customer"));
        assert_eq!(params.entity_id.as_deref(), Some("ent1"));
        assert_eq!(params.severity.as_deref(), Some("warning"));
        assert_eq!(params.anomaly_type.as_deref(), Some("z_score"));
        assert_eq!(params.page, Some(1));
        assert_eq!(params.page_size, Some(20));
    }

    #[test]
    fn test_predict_quality_request_deserialize() {
        let json = r#"{"horizon_days": 30}"#;
        let request: PredictQualityRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.horizon_days, Some(30));
    }

    #[test]
    fn test_quality_ai_stats_query_deserialize() {
        let query = "domain=customer";
        let params: QualityAiStatsQuery = serde_urlencoded::from_str(query).unwrap();
        assert_eq!(params.domain.as_deref(), Some("customer"));
    }
}

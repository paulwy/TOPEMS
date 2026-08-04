//! V29.0 数据治理与隐私合规基础设施
//!
//! 提供数据分类标签、隐私脱敏、数据主体权利管理（DSR）和合规审计能力。

use chrono::{DateTime, Utc};
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;

// =============================================================================
// A: 数据分类与标签系统
// =============================================================================

/// 数据分类级别（基于常见企业数据分级标准）
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Hash)]
pub enum DataClassification {
    /// 公开数据：可在组织外部自由共享
    Public,
    /// 内部数据：可在组织内共享，但不宜对外公开
    Internal,
    /// 机密数据：仅限于特定团队或角色访问
    Confidential,
    /// 受限数据：受法规严格保护（PII、财务、医疗等）
    Restricted,
}

impl DataClassification {
    /// 分类级别数值（用于排序和比较）
    pub fn level(&self) -> u8 {
        match self {
            DataClassification::Public => 0,
            DataClassification::Internal => 1,
            DataClassification::Confidential => 2,
            DataClassification::Restricted => 3,
        }
    }

    /// 是否需要脱敏处理
    pub fn requires_masking(&self) -> bool {
        matches!(
            self,
            DataClassification::Confidential | DataClassification::Restricted
        )
    }

    /// 是否允许导出
    pub fn allows_export(&self) -> bool {
        !matches!(self, DataClassification::Restricted)
    }

    /// 最低要求的审计级别
    pub fn required_audit_level(&self) -> AuditLevel {
        match self {
            DataClassification::Public => AuditLevel::None,
            DataClassification::Internal => AuditLevel::Basic,
            DataClassification::Confidential => AuditLevel::Detailed,
            DataClassification::Restricted => AuditLevel::Comprehensive,
        }
    }
}

impl Default for DataClassification {
    fn default() -> Self {
        DataClassification::Internal
    }
}

impl std::fmt::Display for DataClassification {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DataClassification::Public => write!(f, "public"),
            DataClassification::Internal => write!(f, "internal"),
            DataClassification::Confidential => write!(f, "confidential"),
            DataClassification::Restricted => write!(f, "restricted"),
        }
    }
}

/// 审计级别
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AuditLevel {
    /// 无需审计
    None,
    /// 基础审计（记录访问时间、操作类型）
    Basic,
    /// 详细审计（记录访问者、查询条件、返回行数）
    Detailed,
    /// 全面审计（记录完整上下文、数据变更前后状态）
    Comprehensive,
}

/// 合规法规要求
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Hash)]
pub enum ComplianceRequirement {
    /// GDPR（欧盟通用数据保护条例）
    Gdpr,
    /// CCPA（加州消费者隐私法）
    Ccpa,
    /// 个人信息保护法（中国）
    PipL,
    /// HIPAA（美国健康保险流通与责任法案）
    Hipaa,
    /// SOX（萨班斯法案）
    Sox,
    /// PCI-DSS（支付卡行业数据安全标准）
    PciDss,
    /// 自定义合规要求
    Custom(String),
}

impl std::fmt::Display for ComplianceRequirement {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ComplianceRequirement::Gdpr => write!(f, "GDPR"),
            ComplianceRequirement::Ccpa => write!(f, "CCPA"),
            ComplianceRequirement::PipL => write!(f, "PIPL"),
            ComplianceRequirement::Hipaa => write!(f, "HIPAA"),
            ComplianceRequirement::Sox => write!(f, "SOX"),
            ComplianceRequirement::PciDss => write!(f, "PCI-DSS"),
            ComplianceRequirement::Custom(s) => write!(f, "{}", s),
        }
    }
}

/// 数据标签：字段级元数据，描述单个数据字段的分类与合规属性
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataTag {
    /// 字段名称（支持点号路径，如 user.profile.email）
    pub field_path: String,
    /// 数据分类级别
    pub classification: DataClassification,
    /// 适用的合规要求集合
    pub compliance_requirements: Vec<ComplianceRequirement>,
    /// 数据来源说明
    pub data_source: Option<String>,
    /// 数据保留期限（天），None 表示永久
    pub retention_days: Option<u32>,
    /// 是否为主标识符（如用户ID、身份证号）
    pub is_primary_identifier: bool,
    /// 是否为敏感个人数据
    pub is_sensitive_pii: bool,
    /// 标签创建时间
    pub created_at: DateTime<Utc>,
    /// 标签最后更新时间
    pub updated_at: DateTime<Utc>,
}

impl DataTag {
    pub fn new(field_path: impl Into<String>, classification: DataClassification) -> Self {
        let now = Utc::now();
        Self {
            field_path: field_path.into(),
            classification,
            compliance_requirements: Vec::new(),
            data_source: None,
            retention_days: None,
            is_primary_identifier: false,
            is_sensitive_pii: false,
            created_at: now,
            updated_at: now,
        }
    }

    pub fn with_compliance(mut self, req: ComplianceRequirement) -> Self {
        self.compliance_requirements.push(req);
        self
    }

    pub fn with_retention(mut self, days: u32) -> Self {
        self.retention_days = Some(days);
        self
    }

    pub fn primary_identifier(mut self) -> Self {
        self.is_primary_identifier = true;
        self
    }

    pub fn sensitive_pii(mut self) -> Self {
        self.is_sensitive_pii = true;
        self
    }
}

/// 实体数据标签映射：描述一个实体（表/文档）所有字段的分类标签
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct EntityDataTags {
    /// 实体名称（如表名、集合名）
    pub entity_name: String,
    /// 字段路径 -> 数据标签
    pub field_tags: HashMap<String, DataTag>,
    /// 实体级默认分类（字段未单独标记时继承）
    pub default_classification: DataClassification,
}

impl EntityDataTags {
    pub fn new(entity_name: impl Into<String>) -> Self {
        Self {
            entity_name: entity_name.into(),
            field_tags: HashMap::new(),
            default_classification: DataClassification::Internal,
        }
    }

    pub fn with_default_classification(mut self, classification: DataClassification) -> Self {
        self.default_classification = classification;
        self
    }

    pub fn add_tag(mut self, tag: DataTag) -> Self {
        self.field_tags.insert(tag.field_path.clone(), tag);
        self
    }

    /// 获取指定字段的分类，如未单独标记则返回实体默认值
    pub fn classification_for(&self, field_path: &str) -> DataClassification {
        self.field_tags
            .get(field_path)
            .map(|t| t.classification)
            .unwrap_or(self.default_classification)
    }

    /// 获取所有需要脱敏的字段路径
    pub fn masked_fields(&self) -> Vec<&str> {
        self.field_tags
            .values()
            .filter(|t| t.classification.requires_masking())
            .map(|t| t.field_path.as_str())
            .collect()
    }

    /// 获取受指定合规要求约束的字段
    pub fn fields_for_compliance(&self, req: &ComplianceRequirement) -> Vec<&str> {
        self.field_tags
            .values()
            .filter(|t| t.compliance_requirements.contains(req))
            .map(|t| t.field_path.as_str())
            .collect()
    }
}

// =============================================================================
// B: 隐私脱敏引擎
// =============================================================================

/// 脱敏策略
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum MaskingStrategy {
    /// 完全掩码：全部替换为固定字符（如 ********）
    FullMask,
    /// 部分掩码：保留部分字符（如 138****1234）
    PartialMask {
        visible_prefix: usize,
        visible_suffix: usize,
    },
    /// 哈希：使用 SHA-256 等算法计算不可逆哈希
    Hash,
    /// 令牌化：使用令牌替换原始值，支持反向还原（需Token Vault）
    Tokenize,
    /// 截断：仅保留前 N 个字符
    Truncate { max_length: usize },
    /// 空值替换：替换为 null 或空字符串
    Nullify,
}

impl Default for MaskingStrategy {
    fn default() -> Self {
        MaskingStrategy::FullMask
    }
}

/// 脱敏规则：针对特定数据模式的脱敏配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaskingRule {
    /// 规则名称
    pub name: String,
    /// 匹配模式（正则表达式字符串）
    pub pattern: String,
    /// 脱敏策略
    pub strategy: MaskingStrategy,
    /// 适用的分类级别
    pub applies_to: Vec<DataClassification>,
    /// 规则描述
    pub description: Option<String>,
}

impl MaskingRule {
    pub fn new(
        name: impl Into<String>,
        pattern: impl Into<String>,
        strategy: MaskingStrategy,
    ) -> Self {
        Self {
            name: name.into(),
            pattern: pattern.into(),
            strategy,
            applies_to: Vec::new(),
            description: None,
        }
    }

    pub fn for_classifications(mut self, classifications: Vec<DataClassification>) -> Self {
        self.applies_to = classifications;
        self
    }
}

/// 内置脱敏规则集
pub struct BuiltInMaskingRules;

impl BuiltInMaskingRules {
    /// 中国大陆手机号：保留前3后4，中间掩码
    pub fn chinese_mobile() -> MaskingRule {
        MaskingRule::new(
            "chinese_mobile",
            r"^1[3-9]\d{9}$",
            MaskingStrategy::PartialMask {
                visible_prefix: 3,
                visible_suffix: 4,
            },
        )
        .for_classifications(vec![
            DataClassification::Confidential,
            DataClassification::Restricted,
        ])
    }

    /// 中国大陆身份证号：保留前3后4
    pub fn chinese_id_card() -> MaskingRule {
        MaskingRule::new(
            "chinese_id_card",
            r"^\d{6}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$",
            MaskingStrategy::PartialMask {
                visible_prefix: 3,
                visible_suffix: 4,
            },
        )
        .for_classifications(vec![DataClassification::Restricted])
    }

    /// 邮箱地址：保留用户名首字符和域名
    pub fn email() -> MaskingRule {
        MaskingRule::new(
            "email",
            r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$",
            MaskingStrategy::PartialMask {
                visible_prefix: 1,
                visible_suffix: 0,
            },
        )
        .for_classifications(vec![
            DataClassification::Confidential,
            DataClassification::Restricted,
        ])
    }

    /// 银行卡号：保留后4位
    pub fn bank_card() -> MaskingRule {
        MaskingRule::new(
            "bank_card",
            r"^\d{13,19}$",
            MaskingStrategy::PartialMask {
                visible_prefix: 0,
                visible_suffix: 4,
            },
        )
        .for_classifications(vec![DataClassification::Restricted])
    }

    /// 通用姓名：保留首字
    pub fn person_name() -> MaskingRule {
        MaskingRule::new(
            "person_name",
            r"^[\u4e00-\u9fa5]{2,4}$|^[　-\u303F\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]{2,8}$|^[A-Za-z\s.'-]{2,50}$",
            MaskingStrategy::PartialMask {
                visible_prefix: 1,
                visible_suffix: 0,
            },
        )
        .for_classifications(vec![
            DataClassification::Confidential,
            DataClassification::Restricted,
        ])
    }

    /// 获取所有内置规则
    pub fn all() -> Vec<MaskingRule> {
        vec![
            Self::chinese_mobile(),
            Self::chinese_id_card(),
            Self::email(),
            Self::bank_card(),
            Self::person_name(),
        ]
    }
}

/// 脱敏引擎：执行数据脱敏操作
pub struct DataMaskingEngine {
    rules: Vec<MaskingRule>,
    compiled_patterns: Vec<(String, Regex, MaskingStrategy)>,
}

impl DataMaskingEngine {
    pub fn new() -> Self {
        let mut engine = Self {
            rules: Vec::new(),
            compiled_patterns: Vec::new(),
        };
        engine.load_builtin_rules();
        engine
    }

    pub fn with_rules(mut self, rules: Vec<MaskingRule>) -> Self {
        for rule in rules {
            self.add_rule(rule);
        }
        self
    }

    fn load_builtin_rules(&mut self) {
        for rule in BuiltInMaskingRules::all() {
            self.add_rule(rule);
        }
    }

    pub fn add_rule(&mut self, rule: MaskingRule) {
        if let Ok(regex) = Regex::new(&rule.pattern) {
            self.compiled_patterns
                .push((rule.name.clone(), regex, rule.strategy));
        }
        self.rules.push(rule);
    }

    /// 对单个字符串值进行脱敏
    pub fn mask_value(&self, value: &str, classification: DataClassification) -> String {
        if !classification.requires_masking() {
            return value.to_string();
        }

        for (name, regex, strategy) in &self.compiled_patterns {
            if regex.is_match(value) {
                return self.apply_strategy(value, *strategy, name);
            }
        }

        // 默认完全掩码
        self.apply_strategy(value, MaskingStrategy::FullMask, "default")
    }

    fn apply_strategy(&self, value: &str, strategy: MaskingStrategy, _rule_name: &str) -> String {
        match strategy {
            MaskingStrategy::FullMask => "*".repeat(value.chars().count().max(8)),
            MaskingStrategy::PartialMask {
                visible_prefix,
                visible_suffix,
            } => {
                let chars: Vec<char> = value.chars().collect();
                let len = chars.len();
                if len <= visible_prefix + visible_suffix {
                    return "*".repeat(len);
                }
                let mut result = String::new();
                for i in 0..visible_prefix.min(len) {
                    result.push(chars[i]);
                }
                let masked_count = len.saturating_sub(visible_prefix + visible_suffix);
                result.push_str(&"*".repeat(masked_count.max(4)));
                for i in (len.saturating_sub(visible_suffix))..len {
                    result.push(chars[i]);
                }
                result
            }
            MaskingStrategy::Hash => {
                use sha2::{Digest, Sha256};
                let mut hasher = Sha256::new();
                hasher.update(value.as_bytes());
                format!("hash:{}", hex::encode(hasher.finalize())[..16].to_string())
            }
            MaskingStrategy::Tokenize => {
                format!(
                    "tok:{}",
                    Uuid::new_v4().to_string().split('-').next().unwrap_or("")
                )
            }
            MaskingStrategy::Truncate { max_length } => {
                let chars: Vec<char> = value.chars().collect();
                if chars.len() <= max_length {
                    value.to_string()
                } else {
                    let truncated: String = chars.into_iter().take(max_length).collect();
                    format!("{}...", truncated)
                }
            }
            MaskingStrategy::Nullify => String::new(),
        }
    }

    /// 对 JSON 对象进行递归脱敏（基于字段标签映射）
    pub fn mask_json(
        &self,
        value: &mut serde_json::Value,
        entity_tags: &EntityDataTags,
        current_path: &str,
    ) {
        match value {
            serde_json::Value::Object(map) => {
                for (key, val) in map.iter_mut() {
                    let field_path = if current_path.is_empty() {
                        key.clone()
                    } else {
                        format!("{}.{}", current_path, key)
                    };

                    if let serde_json::Value::String(s) = val {
                        let classification = entity_tags.classification_for(&field_path);
                        if classification.requires_masking() {
                            *s = self.mask_value(s, classification);
                        }
                    } else {
                        self.mask_json(val, entity_tags, &field_path);
                    }
                }
            }
            serde_json::Value::Array(arr) => {
                for item in arr.iter_mut() {
                    self.mask_json(item, entity_tags, current_path);
                }
            }
            _ => {}
        }
    }

    /// 对纯文本进行脱敏（基于正则匹配）
    pub fn mask_text(&self, text: &str) -> String {
        let mut result = text.to_string();
        for (_name, regex, strategy) in &self.compiled_patterns {
            result = regex
                .replace_all(&result, |caps: &regex::Captures| {
                    self.apply_strategy(&caps[0], *strategy, _name)
                })
                .to_string();
        }
        result
    }
}

impl Default for DataMaskingEngine {
    fn default() -> Self {
        Self::new()
    }
}

// =============================================================================
// C: 数据主体权利管理（DSR - Data Subject Rights）
// =============================================================================

/// 数据主体权利类型
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum DataSubjectRight {
    /// 查询权：获取个人数据的副本
    RightToAccess,
    /// 更正权：修改不准确的个人数据
    RightToRectification,
    /// 删除权（被遗忘权）：删除个人数据
    RightToErasure,
    /// 限制处理权：暂停数据处理
    RightToRestrictProcessing,
    /// 可携带权：以通用格式导出数据
    RightToDataPortability,
    /// 反对权：反对基于合法利益的处理
    RightToObject,
    /// 自动化决策相关权利
    RightsRelatedToAutomatedDecisionMaking,
}

impl std::fmt::Display for DataSubjectRight {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DataSubjectRight::RightToAccess => write!(f, "right_to_access"),
            DataSubjectRight::RightToRectification => write!(f, "right_to_rectification"),
            DataSubjectRight::RightToErasure => write!(f, "right_to_erasure"),
            DataSubjectRight::RightToRestrictProcessing => {
                write!(f, "right_to_restrict_processing")
            }
            DataSubjectRight::RightToDataPortability => write!(f, "right_to_data_portability"),
            DataSubjectRight::RightToObject => write!(f, "right_to_object"),
            DataSubjectRight::RightsRelatedToAutomatedDecisionMaking => {
                write!(f, "rights_related_to_automated_decision_making")
            }
        }
    }
}

/// DSR 请求状态
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum DsrRequestStatus {
    /// 已提交
    Submitted,
    /// 验证中（身份验证）
    Verifying,
    /// 处理中
    Processing,
    /// 等待人工审核
    PendingReview,
    /// 已完成
    Completed,
    /// 已拒绝
    Rejected,
    /// 已过期
    Expired,
}

/// 数据主体（个人）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataSubject {
    /// 主体唯一标识
    pub subject_id: String,
    /// 主体类型（user, customer, employee 等）
    pub subject_type: String,
    /// 主体邮箱
    pub email: Option<String>,
    /// 主体手机号
    pub phone: Option<String>,
    /// 所属租户
    pub tenant_id: String,
    /// 注册时间
    pub registered_at: DateTime<Utc>,
}

/// DSR 请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DsrRequest {
    /// 请求ID
    pub request_id: Uuid,
    /// 数据主体
    pub subject: DataSubject,
    /// 请求的权利类型
    pub right_type: DataSubjectRight,
    /// 请求状态
    pub status: DsrRequestStatus,
    /// 请求描述/理由
    pub description: Option<String>,
    /// 请求提交时间
    pub submitted_at: DateTime<Utc>,
    /// 预计完成时间（法规通常要求30天内）
    pub due_date: DateTime<Utc>,
    /// 实际完成时间
    pub completed_at: Option<DateTime<Utc>>,
    /// 处理结果摘要
    pub result_summary: Option<String>,
    /// 关联的实体列表（如涉及的表名）
    pub affected_entities: Vec<String>,
    /// 请求元数据
    pub metadata: HashMap<String, String>,
}

impl DsrRequest {
    pub fn new(
        subject: DataSubject,
        right_type: DataSubjectRight,
        description: Option<String>,
    ) -> Self {
        let now = Utc::now();
        Self {
            request_id: Uuid::new_v4(),
            subject,
            right_type,
            status: DsrRequestStatus::Submitted,
            description,
            submitted_at: now,
            due_date: now + chrono::Duration::days(30),
            completed_at: None,
            result_summary: None,
            affected_entities: Vec::new(),
            metadata: HashMap::new(),
        }
    }

    pub fn is_overdue(&self) -> bool {
        self.status != DsrRequestStatus::Completed
            && self.status != DsrRequestStatus::Rejected
            && Utc::now() > self.due_date
    }
}

/// 数据主体权利管理器
pub struct DataSubjectRightsManager {
    /// 活跃的 DSR 请求
    requests: Arc<RwLock<HashMap<Uuid, DsrRequest>>>,
    /// 脱敏引擎（用于导出时脱敏）
    masking_engine: DataMaskingEngine,
    /// 合规配置
    compliance_config: ComplianceConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComplianceConfig {
    /// 默认处理期限（天）
    pub default_due_days: i64,
    /// 是否自动批准查询请求
    pub auto_approve_access_requests: bool,
    /// 导出数据时是否脱敏
    pub mask_exported_data: bool,
    /// 允许的导出格式
    pub allowed_export_formats: Vec<String>,
}

impl Default for ComplianceConfig {
    fn default() -> Self {
        Self {
            default_due_days: 30,
            auto_approve_access_requests: true,
            mask_exported_data: true,
            allowed_export_formats: vec!["json".to_string(), "csv".to_string(), "xml".to_string()],
        }
    }
}

/// 数据导出结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataExportResult {
    pub request_id: Uuid,
    pub subject_id: String,
    pub export_format: String,
    pub exported_at: DateTime<Utc>,
    pub data: serde_json::Value,
    pub entity_count: usize,
    pub record_count: usize,
    pub checksum: String,
}

/// 删除操作结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataErasureResult {
    pub request_id: Uuid,
    pub subject_id: String,
    pub erased_at: DateTime<Utc>,
    pub affected_entities: Vec<String>,
    pub deleted_records: usize,
    pub anonymized_records: usize,
    pub retained_records_reason: Vec<String>,
}

impl DataSubjectRightsManager {
    pub fn new() -> Self {
        Self {
            requests: Arc::new(RwLock::new(HashMap::new())),
            masking_engine: DataMaskingEngine::new(),
            compliance_config: ComplianceConfig::default(),
        }
    }

    pub fn with_config(mut self, config: ComplianceConfig) -> Self {
        self.compliance_config = config;
        self
    }

    pub fn with_masking_engine(mut self, engine: DataMaskingEngine) -> Self {
        self.masking_engine = engine;
        self
    }

    /// 提交 DSR 请求
    pub async fn submit_request(&self, request: DsrRequest) -> Uuid {
        let id = request.request_id;
        let mut requests = self.requests.write().await;
        requests.insert(id, request);
        id
    }

    /// 获取请求状态
    pub async fn get_request(&self, request_id: Uuid) -> Option<DsrRequest> {
        let requests = self.requests.read().await;
        requests.get(&request_id).cloned()
    }

    /// 列出数据主体的所有请求
    pub async fn list_subject_requests(&self, subject_id: &str) -> Vec<DsrRequest> {
        let requests = self.requests.read().await;
        requests
            .values()
            .filter(|r| r.subject.subject_id == subject_id)
            .cloned()
            .collect()
    }

    /// 列出所有待处理请求
    pub async fn list_pending_requests(&self) -> Vec<DsrRequest> {
        let requests = self.requests.read().await;
        requests
            .values()
            .filter(|r| {
                matches!(
                    r.status,
                    DsrRequestStatus::Submitted
                        | DsrRequestStatus::Verifying
                        | DsrRequestStatus::Processing
                        | DsrRequestStatus::PendingReview
                )
            })
            .cloned()
            .collect()
    }

    /// 列出已逾期的请求
    pub async fn list_overdue_requests(&self) -> Vec<DsrRequest> {
        let requests = self.requests.read().await;
        requests
            .values()
            .filter(|r| r.is_overdue())
            .cloned()
            .collect()
    }

    /// 更新请求状态
    pub async fn update_request_status(
        &self,
        request_id: Uuid,
        status: DsrRequestStatus,
    ) -> Option<DsrRequest> {
        let mut requests = self.requests.write().await;
        if let Some(req) = requests.get_mut(&request_id) {
            req.status = status;
            if status == DsrRequestStatus::Completed {
                req.completed_at = Some(Utc::now());
            }
            return Some(req.clone());
        }
        None
    }

    /// 处理查询权请求（导出个人数据）
    pub async fn process_access_request(
        &self,
        request_id: Uuid,
        raw_data: serde_json::Value,
        entity_tags: &EntityDataTags,
    ) -> Result<DataExportResult, String> {
        let mut requests = self.requests.write().await;
        let request = requests.get_mut(&request_id).ok_or("Request not found")?;

        if request.right_type != DataSubjectRight::RightToAccess
            && request.right_type != DataSubjectRight::RightToDataPortability
        {
            return Err("Invalid right type for access processing".to_string());
        }

        request.status = DsrRequestStatus::Processing;
        drop(requests);

        // 对数据进行脱敏（如配置允许）
        let mut data = raw_data;
        if self.compliance_config.mask_exported_data {
            self.masking_engine.mask_json(&mut data, entity_tags, "");
        }

        // 生成校验和
        let checksum = {
            use sha2::{Digest, Sha256};
            let hash = Sha256::digest(serde_json::to_string(&data).unwrap_or_default().as_bytes());
            format!("sha256:{}", hex::encode(&hash[..16]))
        };

        let record_count = count_json_records(&data);

        let result = DataExportResult {
            request_id,
            subject_id: self
                .requests
                .read()
                .await
                .get(&request_id)
                .map(|r| r.subject.subject_id.clone())
                .unwrap_or_default(),
            export_format: "json".to_string(),
            exported_at: Utc::now(),
            data,
            entity_count: entity_tags.field_tags.len(),
            record_count,
            checksum,
        };

        // 更新请求为已完成
        let mut requests = self.requests.write().await;
        if let Some(req) = requests.get_mut(&request_id) {
            req.status = DsrRequestStatus::Completed;
            req.completed_at = Some(Utc::now());
            req.result_summary = Some(format!(
                "Exported {} records across {} entities",
                result.record_count, result.entity_count
            ));
        }

        Ok(result)
    }

    /// 处理删除权请求
    pub async fn process_erasure_request(
        &self,
        request_id: Uuid,
        deletion_callback: impl FnOnce(&str) -> (usize, usize, Vec<String>),
    ) -> Result<DataErasureResult, String> {
        let mut requests = self.requests.write().await;
        let request = requests.get_mut(&request_id).ok_or("Request not found")?;

        if request.right_type != DataSubjectRight::RightToErasure {
            return Err("Invalid right type for erasure processing".to_string());
        }

        let subject_id = request.subject.subject_id.clone();
        request.status = DsrRequestStatus::Processing;
        drop(requests);

        // 执行删除回调（由调用方提供实际的删除逻辑）
        let (deleted, anonymized, retention_reasons) = deletion_callback(&subject_id);

        let result = DataErasureResult {
            request_id,
            subject_id,
            erased_at: Utc::now(),
            affected_entities: Vec::new(),
            deleted_records: deleted,
            anonymized_records: anonymized,
            retained_records_reason: retention_reasons,
        };

        // 更新请求状态
        let mut requests = self.requests.write().await;
        if let Some(req) = requests.get_mut(&request_id) {
            req.status = DsrRequestStatus::Completed;
            req.completed_at = Some(Utc::now());
            req.result_summary = Some(format!(
                "Deleted {} records, anonymized {} records",
                result.deleted_records, result.anonymized_records
            ));
        }

        Ok(result)
    }
}

impl Default for DataSubjectRightsManager {
    fn default() -> Self {
        Self::new()
    }
}

/// 辅助函数：统计 JSON 中的记录数
fn count_json_records(value: &serde_json::Value) -> usize {
    match value {
        serde_json::Value::Array(arr) => arr.len(),
        serde_json::Value::Object(map) => map.len(),
        _ => 1,
    }
}

// =============================================================================
// D: 合规审计与报表
// =============================================================================

/// 合规事件类型
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum ComplianceEventType {
    /// 数据访问
    DataAccess,
    /// 数据导出
    DataExport,
    /// 数据删除
    DataDeletion,
    /// 数据修改
    DataModification,
    /// 分类标签变更
    ClassificationChanged,
    /// DSR 请求提交
    DsrRequestSubmitted,
    /// DSR 请求完成
    DsrRequestCompleted,
    /// 脱敏操作
    DataMasked,
    /// 合规检查失败
    ComplianceCheckFailed,
    /// 权限变更
    PermissionChanged,
}

/// 合规审计事件
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComplianceAuditEvent {
    pub event_id: Uuid,
    pub event_type: ComplianceEventType,
    pub tenant_id: String,
    pub subject_id: Option<String>,
    pub actor_id: String,
    pub actor_type: String,
    pub entity_name: Option<String>,
    pub field_paths: Vec<String>,
    pub classification: Option<DataClassification>,
    pub compliance_requirements: Vec<ComplianceRequirement>,
    pub timestamp: DateTime<Utc>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub success: bool,
    pub details: Option<String>,
}

impl ComplianceAuditEvent {
    pub fn new(
        event_type: ComplianceEventType,
        tenant_id: impl Into<String>,
        actor_id: impl Into<String>,
    ) -> Self {
        Self {
            event_id: Uuid::new_v4(),
            event_type,
            tenant_id: tenant_id.into(),
            subject_id: None,
            actor_id: actor_id.into(),
            actor_type: "user".to_string(),
            entity_name: None,
            field_paths: Vec::new(),
            classification: None,
            compliance_requirements: Vec::new(),
            timestamp: Utc::now(),
            ip_address: None,
            user_agent: None,
            success: true,
            details: None,
        }
    }

    pub fn with_subject(mut self, subject_id: impl Into<String>) -> Self {
        self.subject_id = Some(subject_id.into());
        self
    }

    pub fn with_entity(mut self, entity_name: impl Into<String>) -> Self {
        self.entity_name = Some(entity_name.into());
        self
    }

    pub fn with_field_paths(mut self, paths: Vec<String>) -> Self {
        self.field_paths = paths;
        self
    }

    pub fn with_classification(mut self, classification: DataClassification) -> Self {
        self.classification = Some(classification);
        self
    }

    pub fn with_compliance(mut self, req: ComplianceRequirement) -> Self {
        self.compliance_requirements.push(req);
        self
    }

    pub fn with_ip(mut self, ip: impl Into<String>) -> Self {
        self.ip_address = Some(ip.into());
        self
    }

    pub fn failed(mut self, details: impl Into<String>) -> Self {
        self.success = false;
        self.details = Some(details.into());
        self
    }
}

/// 合规审计器
pub struct ComplianceAuditor {
    events: Arc<RwLock<Vec<ComplianceAuditEvent>>>,
    retention_days: u32,
}

impl ComplianceAuditor {
    pub fn new() -> Self {
        Self {
            events: Arc::new(RwLock::new(Vec::new())),
            retention_days: 365,
        }
    }

    pub fn with_retention(mut self, days: u32) -> Self {
        self.retention_days = days;
        self
    }

    /// 记录合规审计事件
    pub async fn record_event(&self, event: ComplianceAuditEvent) {
        let mut events = self.events.write().await;
        events.push(event);
    }

    /// 查询指定时间范围内的审计事件
    pub async fn query_events(
        &self,
        start: DateTime<Utc>,
        end: DateTime<Utc>,
        tenant_id: Option<&str>,
        event_type: Option<ComplianceEventType>,
    ) -> Vec<ComplianceAuditEvent> {
        let events = self.events.read().await;
        events
            .iter()
            .filter(|e| e.timestamp >= start && e.timestamp <= end)
            .filter(|e| tenant_id.map_or(true, |tid| e.tenant_id == tid))
            .filter(|e| event_type.as_ref().map_or(true, |et| e.event_type == *et))
            .cloned()
            .collect()
    }

    /// 查询指定数据主体的所有审计事件
    pub async fn query_subject_events(&self, subject_id: &str) -> Vec<ComplianceAuditEvent> {
        let events = self.events.read().await;
        events
            .iter()
            .filter(|e| e.subject_id.as_deref() == Some(subject_id))
            .cloned()
            .collect()
    }

    /// 获取指定实体的访问统计
    pub async fn entity_access_stats(&self, entity_name: &str, days: i64) -> EntityAccessStats {
        let since = Utc::now() - chrono::Duration::days(days);
        let events = self.events.read().await;

        let entity_events: Vec<_> = events
            .iter()
            .filter(|e| e.entity_name.as_deref() == Some(entity_name) && e.timestamp >= since)
            .collect();

        let total_accesses = entity_events.len();
        let unique_actors: std::collections::HashSet<_> =
            entity_events.iter().map(|e| e.actor_id.clone()).collect();
        let unique_subjects: std::collections::HashSet<_> = entity_events
            .iter()
            .filter_map(|e| e.subject_id.clone())
            .collect();
        let failed_accesses = entity_events.iter().filter(|e| !e.success).count();
        let restricted_accesses = entity_events
            .iter()
            .filter(|e| e.classification == Some(DataClassification::Restricted))
            .count();

        EntityAccessStats {
            entity_name: entity_name.to_string(),
            total_accesses,
            unique_actors: unique_actors.len(),
            unique_subjects: unique_subjects.len(),
            failed_accesses,
            restricted_accesses,
            period_days: days,
        }
    }

    /// 清理过期审计事件
    pub async fn purge_old_events(&self) -> usize {
        let cutoff = Utc::now() - chrono::Duration::days(self.retention_days as i64);
        let mut events = self.events.write().await;
        let before_len = events.len();
        events.retain(|e| e.timestamp >= cutoff);
        before_len - events.len()
    }
}

impl Default for ComplianceAuditor {
    fn default() -> Self {
        Self::new()
    }
}

/// 实体访问统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntityAccessStats {
    pub entity_name: String,
    pub total_accesses: usize,
    pub unique_actors: usize,
    pub unique_subjects: usize,
    pub failed_accesses: usize,
    pub restricted_accesses: usize,
    pub period_days: i64,
}

/// 合规报表
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComplianceReport {
    pub report_id: Uuid,
    pub report_type: ComplianceReportType,
    pub tenant_id: String,
    pub generated_at: DateTime<Utc>,
    pub period_start: DateTime<Utc>,
    pub period_end: DateTime<Utc>,
    pub summary: ComplianceSummary,
    pub entity_stats: Vec<EntityAccessStats>,
    pub dsr_summary: DsrSummary,
    pub compliance_score: f64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum ComplianceReportType {
    Monthly,
    Quarterly,
    Annual,
    AdHoc,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ComplianceSummary {
    pub total_audit_events: usize,
    pub total_access_events: usize,
    pub total_export_events: usize,
    pub total_deletion_events: usize,
    pub total_failed_events: usize,
    pub total_dsr_requests: usize,
    pub completed_dsr_requests: usize,
    pub overdue_dsr_requests: usize,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct DsrSummary {
    pub total_requests: usize,
    pub access_requests: usize,
    pub erasure_requests: usize,
    pub rectification_requests: usize,
    pub portability_requests: usize,
    pub average_resolution_days: f64,
}

/// 合规报表生成器
pub struct ComplianceReportGenerator {
    auditor: ComplianceAuditor,
    rights_manager: DataSubjectRightsManager,
}

impl ComplianceReportGenerator {
    pub fn new(auditor: ComplianceAuditor, rights_manager: DataSubjectRightsManager) -> Self {
        Self {
            auditor,
            rights_manager,
        }
    }

    /// 生成合规报表
    pub async fn generate_report(
        &self,
        report_type: ComplianceReportType,
        tenant_id: impl Into<String>,
        period_start: DateTime<Utc>,
        period_end: DateTime<Utc>,
    ) -> ComplianceReport {
        let tenant_id = tenant_id.into();

        // 查询审计事件
        let events = self
            .auditor
            .query_events(period_start, period_end, Some(&tenant_id), None)
            .await;

        let mut summary = ComplianceSummary {
            total_audit_events: events.len(),
            ..Default::default()
        };

        for event in &events {
            match event.event_type {
                ComplianceEventType::DataAccess => summary.total_access_events += 1,
                ComplianceEventType::DataExport => summary.total_export_events += 1,
                ComplianceEventType::DataDeletion => summary.total_deletion_events += 1,
                _ => {}
            }
            if !event.success {
                summary.total_failed_events += 1;
            }
        }

        // 获取 DSR 统计
        let pending = self.rights_manager.list_pending_requests().await;
        let overdue = self.rights_manager.list_overdue_requests().await;

        summary.total_dsr_requests = pending.len() + overdue.len();
        summary.overdue_dsr_requests = overdue.len();

        let dsr_summary = DsrSummary {
            total_requests: pending.len(),
            access_requests: pending
                .iter()
                .filter(|r| r.right_type == DataSubjectRight::RightToAccess)
                .count(),
            erasure_requests: pending
                .iter()
                .filter(|r| r.right_type == DataSubjectRight::RightToErasure)
                .count(),
            rectification_requests: pending
                .iter()
                .filter(|r| r.right_type == DataSubjectRight::RightToRectification)
                .count(),
            portability_requests: pending
                .iter()
                .filter(|r| r.right_type == DataSubjectRight::RightToDataPortability)
                .count(),
            average_resolution_days: 0.0,
        };

        // 计算合规评分 (0-100)
        let compliance_score = if summary.total_audit_events == 0 {
            100.0
        } else {
            let failure_rate =
                summary.total_failed_events as f64 / summary.total_audit_events as f64;
            let overdue_rate = if summary.total_dsr_requests > 0 {
                summary.overdue_dsr_requests as f64 / summary.total_dsr_requests as f64
            } else {
                0.0
            };
            (100.0 - failure_rate * 50.0 - overdue_rate * 50.0).max(0.0)
        };

        ComplianceReport {
            report_id: Uuid::new_v4(),
            report_type,
            tenant_id,
            generated_at: Utc::now(),
            period_start,
            period_end,
            summary,
            entity_stats: Vec::new(),
            dsr_summary,
            compliance_score,
        }
    }
}

// =============================================================================
// 自动分类引擎
// =============================================================================

/// 分类规则：基于模式匹配自动识别数据分类
#[derive(Debug, Clone)]
pub struct ClassificationRule {
    pub name: String,
    pub pattern: Regex,
    pub classification: DataClassification,
    pub confidence: f64,
    pub keywords: Vec<String>,
}

/// 自动分类引擎
pub struct ClassificationEngine {
    rules: Vec<ClassificationRule>,
}

impl ClassificationEngine {
    pub fn new() -> Self {
        let mut engine = Self { rules: Vec::new() };
        engine.load_builtin_rules();
        engine
    }

    fn load_builtin_rules(&mut self) {
        let builtins = vec![
            // 身份证号
            ClassificationRule {
                name: "chinese_id_card".to_string(),
                pattern: Regex::new(r"id_card|idcard|身份证号|身份证|citizen_id").unwrap(),
                classification: DataClassification::Restricted,
                confidence: 0.95,
                keywords: vec!["身份证".to_string(), "id_card".to_string()],
            },
            // 手机号
            ClassificationRule {
                name: "mobile_phone".to_string(),
                pattern: Regex::new(r"mobile|phone|手机号|电话|tel").unwrap(),
                classification: DataClassification::Confidential,
                confidence: 0.85,
                keywords: vec!["手机".to_string(), "电话".to_string()],
            },
            // 邮箱
            ClassificationRule {
                name: "email".to_string(),
                pattern: Regex::new(r"email|邮箱|邮件|mail").unwrap(),
                classification: DataClassification::Confidential,
                confidence: 0.80,
                keywords: vec!["email".to_string(), "邮箱".to_string()],
            },
            // 银行卡
            ClassificationRule {
                name: "bank_card".to_string(),
                pattern: Regex::new(r"bank|card|银行卡|信用卡|借记卡|bank_card").unwrap(),
                classification: DataClassification::Restricted,
                confidence: 0.90,
                keywords: vec!["银行卡".to_string(), "信用卡".to_string()],
            },
            // 密码/密钥
            ClassificationRule {
                name: "password".to_string(),
                pattern: Regex::new(r"password|passwd|pwd|密码|密钥|secret|token|api_key").unwrap(),
                classification: DataClassification::Restricted,
                confidence: 0.98,
                keywords: vec![
                    "密码".to_string(),
                    "secret".to_string(),
                    "token".to_string(),
                ],
            },
            // 姓名
            ClassificationRule {
                name: "person_name".to_string(),
                pattern: Regex::new(r"name|姓名|名字|full_name|first_name|last_name").unwrap(),
                classification: DataClassification::Confidential,
                confidence: 0.75,
                keywords: vec!["name".to_string(), "姓名".to_string()],
            },
            // 地址
            ClassificationRule {
                name: "address".to_string(),
                pattern: Regex::new(r"address|地址|addr|住址|location").unwrap(),
                classification: DataClassification::Confidential,
                confidence: 0.80,
                keywords: vec!["地址".to_string(), "address".to_string()],
            },
            // 薪资
            ClassificationRule {
                name: "salary".to_string(),
                pattern: Regex::new(r"salary|wage|pay|薪资|工资|薪酬|income").unwrap(),
                classification: DataClassification::Restricted,
                confidence: 0.90,
                keywords: vec!["薪资".to_string(), "工资".to_string(), "salary".to_string()],
            },
            // 健康/医疗
            ClassificationRule {
                name: "health".to_string(),
                pattern: Regex::new(r"health|medical|diagnosis|健康|医疗|诊断|病历").unwrap(),
                classification: DataClassification::Restricted,
                confidence: 0.95,
                keywords: vec!["健康".to_string(), "医疗".to_string(), "病历".to_string()],
            },
        ];

        for rule in builtins {
            self.rules.push(rule);
        }
    }

    /// 根据字段名自动推断分类
    pub fn classify_field(&self, field_name: &str) -> Option<(DataClassification, f64)> {
        let mut best_match: Option<(DataClassification, f64)> = None;

        for rule in &self.rules {
            if rule.pattern.is_match(field_name) {
                let current_confidence = best_match.map(|(_, c)| c).unwrap_or(0.0);
                if rule.confidence > current_confidence {
                    best_match = Some((rule.classification, rule.confidence));
                }
            }
        }

        best_match
    }

    /// 批量分类实体的所有字段
    pub fn classify_entity_fields(
        &self,
        entity_name: &str,
        field_names: &[String],
    ) -> EntityDataTags {
        let mut tags = EntityDataTags::new(entity_name);

        for field in field_names {
            if let Some((classification, _confidence)) = self.classify_field(field) {
                let tag = DataTag::new(field, classification);
                tags.field_tags.insert(field.clone(), tag);
            }
        }

        tags
    }

    pub fn add_rule(&mut self, rule: ClassificationRule) {
        self.rules.push(rule);
    }
}

impl Default for ClassificationEngine {
    fn default() -> Self {
        Self::new()
    }
}

// =============================================================================
// 单元测试
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_data_classification_level() {
        assert_eq!(DataClassification::Public.level(), 0);
        assert_eq!(DataClassification::Restricted.level(), 3);
        assert!(DataClassification::Restricted.requires_masking());
        assert!(!DataClassification::Public.requires_masking());
    }

    #[test]
    fn test_data_tag_builder() {
        let tag = DataTag::new("user.email", DataClassification::Confidential)
            .with_compliance(ComplianceRequirement::Gdpr)
            .with_retention(365)
            .sensitive_pii();

        assert_eq!(tag.field_path, "user.email");
        assert_eq!(tag.classification, DataClassification::Confidential);
        assert!(tag
            .compliance_requirements
            .contains(&ComplianceRequirement::Gdpr));
        assert_eq!(tag.retention_days, Some(365));
        assert!(tag.is_sensitive_pii);
    }

    #[test]
    fn test_entity_data_tags() {
        let entity = EntityDataTags::new("users")
            .with_default_classification(DataClassification::Internal)
            .add_tag(DataTag::new("email", DataClassification::Confidential))
            .add_tag(DataTag::new("password", DataClassification::Restricted));

        assert_eq!(
            entity.classification_for("email"),
            DataClassification::Confidential
        );
        assert_eq!(
            entity.classification_for("unknown_field"),
            DataClassification::Internal
        );
        assert_eq!(entity.masked_fields().len(), 2);
    }

    #[test]
    fn test_masking_strategies() {
        let engine = DataMaskingEngine::new();

        // 手机号脱敏
        let masked = engine.mask_value("13812345678", DataClassification::Confidential);
        assert!(masked.starts_with("138"));
        assert!(masked.ends_with("5678"));
        assert!(masked.contains("****"));

        // 邮箱脱敏
        let masked = engine.mask_value("test@example.com", DataClassification::Confidential);
        assert!(masked.starts_with("t"));
        assert!(masked.contains("****"));

        // 公开数据不脱敏
        let unchanged = engine.mask_value("hello", DataClassification::Public);
        assert_eq!(unchanged, "hello");
    }

    #[test]
    fn test_json_masking() {
        let engine = DataMaskingEngine::new();
        let mut data = serde_json::json!({
            "user": {
                "name": "张三",
                "email": "zhangsan@example.com",
                "phone": "13812345678",
                "age": 30
            }
        });

        let tags = EntityDataTags::new("users")
            .add_tag(DataTag::new("user.name", DataClassification::Confidential))
            .add_tag(DataTag::new("user.email", DataClassification::Confidential))
            .add_tag(DataTag::new("user.phone", DataClassification::Confidential));

        engine.mask_json(&mut data, &tags, "");

        let user = data.get("user").unwrap();
        assert!(user.get("name").unwrap().as_str().unwrap().contains("*"));
        assert!(user.get("email").unwrap().as_str().unwrap().contains("*"));
        assert!(user.get("phone").unwrap().as_str().unwrap().contains("*"));
        assert_eq!(user.get("age").unwrap().as_i64(), Some(30));
    }

    #[test]
    fn test_classification_engine() {
        let engine = ClassificationEngine::new();

        let (cls, conf) = engine.classify_field("user_password").unwrap();
        assert_eq!(cls, DataClassification::Restricted);
        assert!(conf > 0.9);

        let (cls, _conf) = engine.classify_field("mobile_phone").unwrap();
        assert_eq!(cls, DataClassification::Confidential);

        assert!(engine.classify_field("created_at").is_none());
    }

    #[test]
    fn test_dsr_request() {
        let subject = DataSubject {
            subject_id: "user_123".to_string(),
            subject_type: "user".to_string(),
            email: Some("user@example.com".to_string()),
            phone: None,
            tenant_id: "tenant_1".to_string(),
            registered_at: Utc::now(),
        };

        let request = DsrRequest::new(
            subject,
            DataSubjectRight::RightToAccess,
            Some("Request my data".to_string()),
        );

        assert_eq!(request.status, DsrRequestStatus::Submitted);
        assert!(!request.is_overdue());
    }

    #[test]
    fn test_compliance_event_builder() {
        let event =
            ComplianceAuditEvent::new(ComplianceEventType::DataAccess, "tenant_1", "user_123")
                .with_subject("subject_456")
                .with_entity("users")
                .with_classification(DataClassification::Confidential)
                .with_compliance(ComplianceRequirement::Gdpr)
                .with_ip("192.168.1.1");

        assert_eq!(event.event_type, ComplianceEventType::DataAccess);
        assert_eq!(event.subject_id, Some("subject_456".to_string()));
        assert!(event.success);
    }

    #[test]
    fn test_masking_rule_partial() {
        let engine = DataMaskingEngine::new();
        let result = engine.apply_strategy(
            "1234567890",
            MaskingStrategy::PartialMask {
                visible_prefix: 2,
                visible_suffix: 2,
            },
            "test",
        );
        assert!(result.starts_with("12"));
        assert!(result.ends_with("90"));
    }

    #[test]
    fn test_text_masking() {
        let engine = DataMaskingEngine::new();
        let text = "Contact me at 13812345678 or test@example.com";
        let masked = engine.mask_text(text);
        assert!(!masked.contains("13812345678"));
        assert!(!masked.contains("test@example.com"));
    }
}

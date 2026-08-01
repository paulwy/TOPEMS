use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ==================== Schema Evolution 类型 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SchemaVersion {
    pub id: String,
    pub version: String,
    pub schema_definition: String,
    pub change_type: String,
    pub created_at: DateTime<Utc>,
    pub change_description: String,
    pub approved_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MigrationRecord {
    pub id: String,
    pub from_version: String,
    pub to_version: String,
    pub operation: String,
    pub performed_at: DateTime<Utc>,
    pub performed_by: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SchemaEvolution {
    pub current_version: Option<String>,
    pub versions: Vec<SchemaVersion>,
    pub migration_history: Vec<MigrationRecord>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct PublishSchemaVersionRequest {
    pub version: String,
    pub schema_definition: String,
    pub change_type: Option<String>,
    pub change_description: Option<String>,
    pub approved_by: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct RollbackSchemaRequest {
    #[allow(dead_code)]
    pub target_version: String,
    pub rolled_back_by: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CompareSchemasRequest {
    pub old_schema: String,
    pub new_schema: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct SchemaCompareResult {
    pub is_compatible: bool,
    pub breaking_changes_count: usize,
    pub safe_changes_count: usize,
    pub changes: Vec<String>,
}

// ==================== Breaking Change Detection 类型 ====================

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum BreakingChangeType {
    FieldRemoved,
    FieldTypeChanged,
    TypeRemoved,
    ArgumentRemoved,
    ArgumentTypeChanged,
    EnumValueRemoved,
    NullabilityChanged,
}

impl BreakingChangeType {
    #[allow(dead_code)]
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::FieldRemoved => "FIELD_REMOVED",
            Self::FieldTypeChanged => "FIELD_TYPE_CHANGED",
            Self::TypeRemoved => "TYPE_REMOVED",
            Self::ArgumentRemoved => "ARGUMENT_REMOVED",
            Self::ArgumentTypeChanged => "ARGUMENT_TYPE_CHANGED",
            Self::EnumValueRemoved => "ENUM_VALUE_REMOVED",
            Self::NullabilityChanged => "NULLABILITY_CHANGED",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Severity {
    Critical,
    High,
    Medium,
    Low,
}

impl Severity {
    #[allow(dead_code)]
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Critical => "critical",
            Self::High => "high",
            Self::Medium => "medium",
            Self::Low => "low",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BreakingChange {
    pub change_type: BreakingChangeType,
    pub path: String,
    pub description: String,
    pub affected_queries: Vec<String>,
    pub severity: Severity,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BreakingChangeReport {
    pub changes: Vec<BreakingChange>,
    pub total_count: usize,
    pub breaking_count: usize,
    pub safe_count: usize,
    pub summary: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct DetectBreakingChangesRequest {
    pub old_schema: String,
    pub new_schema: String,
}

// ==================== Version Negotiation 类型 ====================

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum VersionNegotiationStrategy {
    ExactMatch,
    LatestCompatible,
    DeprecatedWithFallback,
    ForceVersion,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum VersionStatus {
    Active,
    Deprecated,
    Sunset,
    Unsupported,
}

impl VersionStatus {
    #[allow(dead_code)]
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::Deprecated => "deprecated",
            Self::Sunset => "sunset",
            Self::Unsupported => "unsupported",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SupportedVersion {
    pub version: String,
    pub status: VersionStatus,
    pub deprecated_at: Option<DateTime<Utc>>,
    pub sunset_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NegotiatedVersion {
    pub requested_version: String,
    pub matched_version: Option<String>,
    pub fallback_used: bool,
    pub supported_versions: Vec<String>,
    pub strategy_used: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct NegotiateVersionRequest {
    pub requested_version: String,
    pub strategy: Option<VersionNegotiationStrategy>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct DeprecateVersionRequest {
    pub sunset_at: Option<DateTime<Utc>>,
}

// ==================== 数据库表结构 ====================

#[allow(dead_code)]
pub const CREATE_GRAPHL_SCHEMA_VERSIONS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal.graphql_schema_versions (
    id VARCHAR(64) PRIMARY KEY,
    version VARCHAR(32) NOT NULL,
    schema_definition TEXT NOT NULL,
    change_type VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    change_description TEXT,
    approved_by VARCHAR(128),
    is_current BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_schema_versions_version ON portal.graphql_schema_versions(version);
CREATE INDEX IF NOT EXISTS idx_schema_versions_created_at ON portal.graphql_schema_versions(created_at DESC);
"#;

#[allow(dead_code)]
pub const CREATE_GRAPHL_BREAKING_CHANGES_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal.graphql_breaking_changes (
    id VARCHAR(64) PRIMARY KEY,
    version_id VARCHAR(64) NOT NULL REFERENCES portal.graphql_schema_versions(id),
    change_type VARCHAR(64) NOT NULL,
    path VARCHAR(512) NOT NULL,
    description TEXT NOT NULL,
    affected_queries JSONB NOT NULL DEFAULT '[]',
    severity VARCHAR(16) NOT NULL,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_breaking_changes_version_id ON portal.graphql_breaking_changes(version_id);
CREATE INDEX IF NOT EXISTS idx_breaking_changes_type ON portal.graphql_breaking_changes(change_type);
"#;

#[allow(dead_code)]
pub const CREATE_GRAPHL_VERSION_NEGOTIATIONS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal.graphql_version_negotiations (
    id VARCHAR(64) PRIMARY KEY,
    requested_version VARCHAR(32) NOT NULL,
    matched_version VARCHAR(32),
    fallback_used BOOLEAN NOT NULL DEFAULT FALSE,
    strategy_used VARCHAR(64) NOT NULL,
    negotiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_negotiations_requested ON portal.graphql_version_negotiations(requested_version);
CREATE INDEX IF NOT EXISTS idx_negotiations_negotiated_at ON portal.graphql_version_negotiations(negotiated_at DESC);
"#;

// ==================== 辅助函数 ====================

pub fn generate_id() -> String {
    Uuid::new_v4().to_string()
}

pub fn now_utc() -> DateTime<Utc> {
    Utc::now()
}

//! # TOPEMS Shared Database
//!
//! 数据库相关模块，提供数据库连接、迁移、仓储模式、Schema 管理等能力。

pub mod audit;
pub mod audit_soft_delete;
pub mod backup;
pub mod data_governance;
pub mod database;
pub mod migration;
pub mod query_optimizer;
pub mod repository;
pub mod rls;
pub mod schema;
pub mod storage;

pub use audit::{AuditLog, AuditLogQuery, AuditLogService, CreateAuditLogRequest};
pub use backup::{
    BackupConfig, BackupError, BackupManager, BackupMetadata, BackupRequest, BackupSchedule,
    BackupStatistics, BackupStatus, BackupType, CompressionType, RestoreRequest,
};
pub use data_governance::{
    BuiltInMaskingRules, ClassificationEngine, ClassificationRule, ComplianceAuditEvent,
    ComplianceAuditor, ComplianceConfig, ComplianceEventType, ComplianceReport,
    ComplianceReportGenerator, ComplianceReportType, ComplianceRequirement, ComplianceSummary,
    DataClassification, DataErasureResult, DataExportResult, DataMaskingEngine, DataSubject,
    DataSubjectRight, DataSubjectRightsManager, DataTag, DsrRequest, DsrRequestStatus, DsrSummary,
    EntityAccessStats, EntityDataTags, MaskingRule, MaskingStrategy,
};
pub use database::{
    check_pool_health, create_database_pool, test_database_connection, HealthCheckResult,
    ReadWriteConfig, ReadWritePool,
};
pub use migration::{MigrationHistory, MigrationResult, MigrationSDK, MigrationStatus};
pub use query_optimizer::{
    suggest_query_optimization, BatchOperations, IndexRecommendation, NPlusOneDetector,
    NPlusOneWarning, PaginationOptimizer, QueryOptimizationSuggestion,
};
pub use repository::{
    PaginatedQuery, PaginatedResult as RepoPaginatedResult, QueryBuilder, Repository,
};
pub use rls::rls_middleware;
pub use schema::{
    ai_table, bi_table, crm_table, ehs_table, erp_table, gis_table, hrm_table, im_table,
    integration_table, lims_table, mail_table, mes_table, mobile_table, pdm_table, pm_table,
    portal_table, qms_table, rs_table, scm_table, srm_table, with_schema, wms_table, AI_SCHEMA,
    BI_SCHEMA, CRM_SCHEMA, EHS_SCHEMA, ERP_SCHEMA, GIS_SCHEMA, HRM_SCHEMA, IM_SCHEMA,
    INTEGRATION_SCHEMA, LIMS_SCHEMA, MAIL_SCHEMA, MES_SCHEMA, MOBILE_SCHEMA, PDM_SCHEMA, PM_SCHEMA,
    PORTAL_SCHEMA, QMS_SCHEMA, RS_SCHEMA, SCM_SCHEMA, SRM_SCHEMA, WMS_SCHEMA,
};
pub use storage::{FileMetadata, LocalStorage, StorageConfig, StorageService};

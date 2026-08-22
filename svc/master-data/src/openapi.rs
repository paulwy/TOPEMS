// Master Data 服务 OpenAPI 文档
//
// 说明：master-data 有 9 个版本化模块（V51-V60），schemas 数量庞大。
// 此处注册 quality_v51、lineage_v52、knowledge_v53、versioning_v54 的核心实体，
// 使 /api-docs/openapi.json 端点可用。后续可逐步在各模块中添加 #[utoipa::path] 并注册 paths。
use utoipa::OpenApi;

use crate::modules::knowledge_v53::{
    AddKGEdgeRequest, AddKGNodeRequest, AssetCatalog, AssetCategory, AssetStats, AssetType,
    DataAsset, ExportKGQuery, InteractionRecord, KGEdge, KGNode, KGNodeType, KGRelationType,
    KnowledgeGraph, PathQuery, Recommendation, RecommendationQuery, RecommendationSource,
    RecordInteractionRequest, RegisterAssetRequest, SearchAssetsQuery, SimilarItemsQuery,
    SimilarQuery, SubgraphQuery, TrendingQuery, UpdateAssetRequest,
};
use crate::modules::lineage_v52::{
    AffectedNode, AffectedScopeQuery, AffectedService, AddPropagationRuleRequest,
    AnalyzeImpactRequest, ChainReaction, ChangeEvent, ChangeType, DeleteLineageRequest,
    EdgeType, ExportQuery, ImpactAnalysisRequest, ImpactAnalysisResult, ImpactSimulation,
    LineageEdge, LineageGraph, LineageNode, LineageQuery, PropagateChangeRequest,
    PropagationAction, PropagationLog, PropagationLogQuery, PropagationRule,
    RegisterLineageRequest, RiskLevel, RollbackPropagationRequest, SimulateChangeRequest,
};
use crate::modules::quality_v51::{
    AutoFixAction, AutoFixRequest, CreateQualityRuleRequest, GenerateSuggestionsRequest,
    GovernanceInsight, GovernanceSuggestion, QualityCheckV51, QualityDashboard, QualityRule,
    QualityScore, QualityStatus, RunQualityCheckRequest,
};
use crate::modules::schema_registry::{
    CreateSchemaRequest, ListDataQuery, ListSchemaQuery, SchemaDefinition, UpdateSchemaRequest,
};
use crate::modules::versioning_v54::{
    AssignRoleRequest, AuditEvent, AuditEventCategory, AuditEventType, AuditExportLog,
    AuditLogQuery, BranchType, CheckPermissionQuery, CherryPickRequest, ComplianceAuditQuery,
    CreateBranchRequest, CreateRoleRequest, CreateSnapshotRequest, DataPermission,
    EntityHistoryQuery, ExportAuditLogRequest, GrantPermissionRequest, MergeBranchRequest,
    PermissionAction, PermissionRole, RevokePermissionRequest, RevokeRoleRequest,
    ResourcePermissionsQuery, RestoreVersionRequest, UserActivityQuery, UserRoleAssignment,
    UserPermissionsQuery, VersionBranch, VersionDiff, VersionDiffQuery, VersionHistoryQuery,
    VersionQuery, VersionSnapshot,
};

#[derive(OpenApi)]
#[openapi(
    components(
        schemas(
            // ===== quality_v51 =====
            QualityStatus,
            QualityCheckV51,
            QualityRule,
            AutoFixAction,
            GovernanceSuggestion,
            GovernanceInsight,
            QualityScore,
            QualityDashboard,
            RunQualityCheckRequest,
            CreateQualityRuleRequest,
            AutoFixRequest,
            GenerateSuggestionsRequest,
            // ===== schema_registry =====
            SchemaDefinition,
            CreateSchemaRequest,
            UpdateSchemaRequest,
            ListSchemaQuery,
            ListDataQuery,
            // ===== lineage_v52 =====
            EdgeType,
            LineageNode,
            LineageEdge,
            LineageGraph,
            ChangeType,
            ImpactAnalysisRequest,
            RiskLevel,
            AffectedNode,
            AffectedService,
            ChainReaction,
            ImpactAnalysisResult,
            ImpactSimulation,
            ChangeEvent,
            PropagationAction,
            PropagationRule,
            PropagationLog,
            RegisterLineageRequest,
            LineageQuery,
            ExportQuery,
            DeleteLineageRequest,
            AnalyzeImpactRequest,
            SimulateChangeRequest,
            AffectedScopeQuery,
            PropagateChangeRequest,
            AddPropagationRuleRequest,
            PropagationLogQuery,
            RollbackPropagationRequest,
            // ===== knowledge_v53 =====
            KGNodeType,
            KGNode,
            KGRelationType,
            KGEdge,
            KnowledgeGraph,
            RecommendationSource,
            Recommendation,
            InteractionRecord,
            AssetType,
            DataAsset,
            AssetCategory,
            AssetCatalog,
            AssetStats,
            AddKGNodeRequest,
            AddKGEdgeRequest,
            SubgraphQuery,
            PathQuery,
            SimilarQuery,
            ExportKGQuery,
            RecommendationQuery,
            RecordInteractionRequest,
            SimilarItemsQuery,
            TrendingQuery,
            RegisterAssetRequest,
            SearchAssetsQuery,
            UpdateAssetRequest,
            // ===== versioning_v54 =====
            VersionSnapshot,
            VersionDiff,
            BranchType,
            VersionBranch,
            AuditEventType,
            AuditEventCategory,
            AuditEvent,
            AuditExportLog,
            PermissionAction,
            DataPermission,
            PermissionRole,
            UserRoleAssignment,
            CreateSnapshotRequest,
            VersionQuery,
            VersionDiffQuery,
            RestoreVersionRequest,
            VersionHistoryQuery,
            CreateBranchRequest,
            MergeBranchRequest,
            CherryPickRequest,
            AuditLogQuery,
            UserActivityQuery,
            EntityHistoryQuery,
            ExportAuditLogRequest,
            ComplianceAuditQuery,
            GrantPermissionRequest,
            RevokePermissionRequest,
            CheckPermissionQuery,
            UserPermissionsQuery,
            ResourcePermissionsQuery,
            CreateRoleRequest,
            AssignRoleRequest,
            RevokeRoleRequest,
        ),
    ),
    paths(
        crate::modules::quality_v51::run_quality_check,
        crate::modules::quality_v51::list_quality_checks,
        crate::modules::quality_v51::list_quality_rules,
        crate::modules::quality_v51::create_quality_rule,
        crate::modules::quality_v51::get_quality_score,
        crate::modules::quality_v51::get_quality_dashboard,
        crate::modules::quality_v51::apply_auto_fix,
        crate::modules::quality_v51::generate_suggestions,
        // ===== Dict module =====
        crate::modules::dict::handlers::list_dict_types,
        crate::modules::dict::handlers::get_dict_type,
        crate::modules::dict::handlers::create_dict_type,
        crate::modules::dict::handlers::update_dict_type,
        crate::modules::dict::handlers::delete_dict_type,
        crate::modules::dict::handlers::list_dict_items,
        crate::modules::dict::handlers::get_dict_item,
        crate::modules::dict::handlers::create_dict_item,
        crate::modules::dict::handlers::update_dict_item,
        crate::modules::dict::handlers::delete_dict_item,
        crate::modules::dict::handlers::batch_create_dict_items,
        crate::modules::dict::handlers::export_dict_items,
        // ===== Schema Registry =====
        crate::modules::schema_registry::create_schema,
        crate::modules::schema_registry::list_schemas,
        crate::modules::schema_registry::get_schema,
        crate::modules::schema_registry::update_schema,
        crate::modules::schema_registry::delete_schema,
        crate::modules::schema_registry::create_data,
        crate::modules::schema_registry::list_data,
        crate::modules::schema_registry::get_data,
        crate::modules::schema_registry::update_data,
        crate::modules::schema_registry::delete_data,
    ),
    tags(
        (name = "quality_v51", description = "数据质量闭环 + 自动修复 + AI 治理 API"),
        (name = "lineage_v52", description = "数据血缘 + 影响分析 API"),
        (name = "knowledge_v53", description = "知识图谱 + 推荐系统 API"),
        (name = "versioning_v54", description = "版本管理 + 审计 + 权限 API"),
        (name = "commercial_v55", description = "API 商业化 + 计量计费 + SLA 保障 API"),
        (name = "disaster_v56", description = "灾难恢复 + 业务连续性 + 跨地域容灾 API"),
        (name = "semantic_v57", description = "语义搜索 + 图谱增强 + 智能标签 API"),
        (name = "governance_v58", description = "治理成熟度 + 自动化工作流 + 数据产品化 API"),
        (name = "ai_governance_v59", description = "AI 治理 + 智能匹配 + 自动分类 API"),
        (name = "metadata_v60", description = "元数据管理 + 血缘增强 + 生命周期 API"),
        (name = "Dict", description = "字典管理 - 字典类型与字典项CRUD"),
        (name = "Schema Registry", description = "Schema Registry - 元数据驱动动态 API"),
    ),
    info(
        title = "TOPEMS Master Data API",
        version = "1.0.0",
        description = "主数据管理服务 API - 包含数据质量、血缘、知识图谱、版本管理、商业化、灾备、语义搜索、治理、AI 治理、元数据等 10 个子模块"
    )
)]
pub struct MasterDataApiDoc;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extract_openapi_spec() {
        let spec = MasterDataApiDoc::openapi();
        let json = serde_json::to_string_pretty(&spec).expect("Failed to serialize OpenAPI spec");
        std::fs::write("/tmp/topems-master-data-openapi.json", json).expect("Failed to write spec");
        tracing::info!("OpenAPI spec written to /tmp/topems-master-data-openapi.json");
    }
}

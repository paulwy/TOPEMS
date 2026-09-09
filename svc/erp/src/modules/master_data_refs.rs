//! V34.0 MDM AC-6: 跨服务 master_data_id 查询 API
//! V35.0 MDM AC-7: 主数据变更审计追踪 + 数据血缘可视化
//! V36.0 MDM AC-8: 主数据版本管理 + 回滚能力
//! V37.0 MDM AC-9: 主数据冲突检测 + 自动合并
//! V38.0 MDM AC-10: 主数据生命周期管理（归档/恢复/销毁策略 + 合规审计）
//! V46.0 MDM AC-18: 主数据血缘溯源 + 影响分析 + 数据血缘图谱
//! V47.0 MDM AC-19: 主数据治理成熟度评估 + Data Catalog + 元数据管理
//! V48.0 MDM AC-20: 主数据可视化仪表盘 + 治理报告自动化 + 合规审计
//!
//! 提供通过 master_data_id 查找本地业务记录的能力，
//! 替代传统的业务编码（如 customer_code）关联方式。
//! AC-7 新增：
//! - 审计追踪：记录主数据变更历史（创建/更新/删除/同步）
//! - 数据血缘：展示主数据在各服务间的引用关系
//! AC-9 新增：
//! - 冲突检测：比较多个服务对同一主数据的变更，识别字段级冲突
//! - 自动合并：根据合并策略（LastWriteWins / SourcePriority）自动解决冲突
//! - 手动解决：记录冲突并等待人工裁决
//! AC-10 新增：
//! - 生命周期状态：Active / Archived / PendingDestruction / Destroyed
//! - 归档与恢复：支持主数据归档和恢复，保留审计轨迹
//! - 销毁管理：销毁计划、取消销毁、软删除销毁
//! - 生命周期查询：已归档列表、待销毁列表（分页+搜索）

use super::master_data_assets::{get_data_asset_detail, list_data_assets};
use super::master_data_audit::{get_audit_trail, record_audit_event};
use super::master_data_catalog::{
    create_catalog_entry_handler, delete_catalog_entry_handler, get_catalog_entry_handler,
    get_catalog_stats_handler, get_popular_entries_handler, search_catalog_handler,
    update_catalog_entry_handler,
};
use super::master_data_classification::{
    classification_batch_classify, classification_classify_entity, classification_get_stats,
    classification_learn_rule, classification_list_categories, classification_suggest_tags,
};
use super::master_data_compliance_audit::{
    create_compliance_rule_handler, generate_audit_report_handler, get_audit_findings_handler,
    get_audit_scorecard_handler, get_compliance_audit_stats_handler, list_compliance_rules_handler,
    resolve_finding_handler, run_compliance_check_handler,
};
use super::master_data_conflict::{
    auto_merge_conflict, detect_conflicts, get_conflict, list_conflicts, resolve_conflict,
};
pub use super::master_data_crud::{
    get_master_data_ref, get_master_data_ref_by_code, list_master_data_refs, LifecycleStatus,
    MasterDataRef, MasterDataRefQuery, MasterDataRow,
};
use super::master_data_dashboard::{
    create_dashboard_handler, delete_dashboard_handler, get_dashboard_data_handler,
    get_dashboard_handler, get_dashboard_stats_handler, get_kpi_summary_handler,
    refresh_dashboard_handler, update_dashboard_handler,
};
use super::master_data_gateway::{
    mdm_gateway_aggregate, mdm_gateway_batch, mdm_gateway_route, mdm_gateway_stats,
};
use super::master_data_governance::get_governance_dashboard;
use super::master_data_graph::{
    get_association_recommendations, get_completion_suggestions, get_concept, get_graph_node,
    get_graph_stats, get_master_data_graph, get_node_neighbors, get_shortest_path,
    get_similar_entities, list_concepts, list_inference_rules, list_triples, multi_hop_traversal,
    run_inference,
};
use super::master_data_graphql::graphql_endpoint;
use super::master_data_lifecycle::{
    archive_master_data_ref, cancel_destruction, destroy_master_data_ref, list_archived,
    list_pending_destruction, restore_master_data_ref, schedule_destruction,
};
use super::master_data_lineage::get_data_lineage;
use super::master_data_lineage_graph::{
    get_lineage_downstream, get_lineage_graph, get_lineage_upstream,
};
use super::master_data_lineage_impact::{
    analyze_impact_handler, detect_circular_deps_handler, find_data_origin_handler,
    get_critical_paths_handler, get_graph_stats_handler, get_impact_report_handler,
    get_lineage_graph_handler, trace_downstream_handler, trace_lineage_handler,
    trace_upstream_handler,
};
use super::master_data_matching::{
    matching_find_duplicates, matching_find_matches, matching_get_duplicate_groups,
    matching_suggest_merge,
};
use super::master_data_maturity::{
    assess_maturity_handler, compare_assessments_handler, get_improvement_plan_handler,
    get_maturity_history_handler,
};
use super::master_data_metadata::{
    create_relation_handler, create_schema_handler, get_metadata_stats_handler, get_record_handler,
    get_relations_handler, get_schema_handler, list_schemas_handler, query_records_handler,
    update_schema_handler, upsert_record_handler, validate_record_handler,
};
use super::master_data_quality_ai::{
    quality_ai_batch_score, quality_ai_get_anomalies, quality_ai_get_stats,
    quality_ai_predict_quality, quality_ai_score_entity,
};
use super::master_data_quality_loop::{
    approve_repair_workflow, assign_quality_ticket, close_quality_ticket, create_data_domain,
    create_quality_ticket, create_repair_workflow, escalate_ticket, execute_repair_step,
    execute_repair_workflow, get_data_domain, get_entity_owner, get_ownership_matrix,
    get_quality_loop_stats, get_quality_ticket, get_quality_ticket_history, get_repair_workflow,
    list_data_domains, list_quality_tickets, list_repair_workflows, reject_quality_ticket,
    set_ownership_matrix, start_quality_ticket, submit_quality_ticket, update_data_domain,
    verify_quality_ticket, verify_repair,
};
use super::master_data_quality_rules::{
    create_quality_rule, delete_quality_rule, get_quality_report, get_quality_rule,
    list_quality_rules, run_quality_check, update_quality_rule,
};
use super::master_data_quality_trend::get_quality_trend;
use super::master_data_report_automation::{
    create_report_template_handler, generate_report_handler, get_generated_report_handler,
    get_report_automation_stats_handler, get_report_schedule_handler, get_report_template_handler,
    list_generated_reports_handler, list_report_templates_handler, schedule_report_handler,
};
use super::master_data_service_registry::{
    mdm_service_deregister, mdm_service_health, mdm_service_heartbeat, mdm_service_list,
    mdm_service_register,
};
use super::master_data_sync::{
    batch_replay_dead_letters, cancel_sync_job, create_sync_job, delete_dead_letter, get_sync_job,
    get_sync_stats, list_dead_letters, list_sync_jobs, replay_dead_letter, retry_sync_job,
    trigger_compensation,
};
use super::master_data_sync_v2::{
    batch_retry_dead_letters, create_sync_job_v2, get_sync_job_v2, list_sync_jobs_v2,
    retry_dead_letter_v2, sync_engine_stats_v2,
};
use super::master_data_version::{get_version, get_versions, record_version, rollback_to_version};
use super::ApiState;

// ==================== 路由 ====================

pub fn create_routes() -> axum::Router<ApiState> {
    use axum::routing::{delete, get, post};
    axum::Router::new()
        .route("/master-data-refs", get(list_master_data_refs))
        .route(
            "/master-data-refs/{master_data_id}",
            get(get_master_data_ref),
        )
        .route(
            "/master-data-refs/by-code/{domain}/{code}",
            get(get_master_data_ref_by_code),
        )
        // V35.0 AC-7: 审计追踪
        .route(
            "/master-data-refs/{master_data_id}/audit-trail",
            get(get_audit_trail),
        )
        .route(
            "/master-data-refs/audit-trail",
            post(record_audit_event),
        )
        // V35.0 AC-7: 数据血缘
        .route(
            "/master-data-refs/{master_data_id}/lineage",
            get(get_data_lineage),
        )
        // V36.0 AC-8: 版本管理
        .route(
            "/master-data-refs/{master_data_id}/versions",
            get(get_versions).post(record_version),
        )
        .route(
            "/master-data-refs/{master_data_id}/versions/{version_id}",
            get(get_version),
        )
        .route(
            "/master-data-refs/{master_data_id}/versions/{version_id}/rollback",
            post(rollback_to_version),
        )
        // V37.0 AC-9: 冲突检测 + 自动合并
        .route(
            "/master-data-refs/conflicts/detect",
            post(detect_conflicts),
        )
        .route("/master-data-refs/conflicts", get(list_conflicts))
        .route(
            "/master-data-refs/conflicts/{conflict_id}",
            get(get_conflict),
        )
        .route(
            "/master-data-refs/conflicts/{conflict_id}/resolve",
            post(resolve_conflict),
        )
        .route(
            "/master-data-refs/conflicts/{conflict_id}/auto-merge",
            post(auto_merge_conflict),
        )
        // V38.0 AC-10: 主数据生命周期管理
        .route("/master-data-refs/archived", get(list_archived))
        .route(
            "/master-data-refs/pending-destruction",
            get(list_pending_destruction),
        )
        .route(
            "/master-data-refs/{master_data_id}/archive",
            post(archive_master_data_ref),
        )
        .route(
            "/master-data-refs/{master_data_id}/restore",
            post(restore_master_data_ref),
        )
        .route(
            "/master-data-refs/{master_data_id}/schedule-destruction",
            post(schedule_destruction),
        )
        .route(
            "/master-data-refs/{master_data_id}/cancel-destruction",
            post(cancel_destruction),
        )
        .route(
            "/master-data-refs/{master_data_id}/destroy",
            post(destroy_master_data_ref),
        )
        // V39.0 AC-11: 主数据质量规则引擎
        .route(
            "/master-data-refs/quality-rules",
            get(list_quality_rules).post(create_quality_rule),
        )
        .route(
            "/master-data-refs/quality-rules/{rule_id}",
            get(get_quality_rule)
                .put(update_quality_rule)
                .delete(delete_quality_rule),
        )
        .route(
            "/master-data-refs/quality-check",
            post(run_quality_check),
        )
        .route(
            "/master-data-refs/quality-report",
            get(get_quality_report),
        )
        // V40.0 AC-12: 主数据治理仪表盘
        .route(
            "/master-data-refs/governance/dashboard",
            get(get_governance_dashboard),
        )
        // V40.0 AC-12: 数据资产目录
        .route(
            "/master-data-refs/governance/assets",
            get(list_data_assets),
        )
        .route(
            "/master-data-refs/governance/assets/{domain}",
            get(get_data_asset_detail),
        )
        // V40.0 AC-12: 血缘可视化
        .route(
            "/master-data-refs/governance/lineage",
            get(get_lineage_graph),
        )
        .route(
            "/master-data-refs/governance/lineage/{id}/upstream",
            get(get_lineage_upstream),
        )
        .route(
            "/master-data-refs/governance/lineage/{id}/downstream",
            get(get_lineage_downstream),
        )
        // V40.0 AC-12: 质量趋势
        .route(
            "/master-data-refs/governance/quality-trend",
            get(get_quality_trend),
        )
        // V41.0 AC-13: 主数据同步编排
        .route(
            "/master-data/sync/jobs",
            post(create_sync_job).get(list_sync_jobs),
        )
        .route("/master-data/sync/jobs/{id}", get(get_sync_job))
        .route(
            "/master-data/sync/jobs/{id}/retry",
            post(retry_sync_job),
        )
        .route(
            "/master-data/sync/jobs/{id}/cancel",
            post(cancel_sync_job),
        )
        .route(
            "/master-data/sync/jobs/{id}/compensate",
            post(trigger_compensation),
        )
        .route("/master-data/sync/stats", get(get_sync_stats))
        .route(
            "/master-data/sync/dead-letters",
            get(list_dead_letters),
        )
        .route(
            "/master-data/sync/dead-letters/{id}/replay",
            post(replay_dead_letter),
        )
        .route(
            "/master-data/sync/dead-letters/batch-replay",
            post(batch_replay_dead_letters),
        )
        .route(
            "/master-data/sync/dead-letters/{id}",
            delete(delete_dead_letter),
        )
        // V42.0 AC-14: 质量闭环管理 — 质量工单
        .route(
            "/master-data/quality/tickets",
            post(create_quality_ticket).get(list_quality_tickets),
        )
        .route(
            "/master-data/quality/tickets/{id}",
            get(get_quality_ticket),
        )
        .route(
            "/master-data/quality/tickets/{id}/assign",
            post(assign_quality_ticket),
        )
        .route(
            "/master-data/quality/tickets/{id}/start",
            post(start_quality_ticket),
        )
        .route(
            "/master-data/quality/tickets/{id}/submit",
            post(submit_quality_ticket),
        )
        .route(
            "/master-data/quality/tickets/{id}/verify",
            post(verify_quality_ticket),
        )
        .route(
            "/master-data/quality/tickets/{id}/close",
            post(close_quality_ticket),
        )
        .route(
            "/master-data/quality/tickets/{id}/reject",
            post(reject_quality_ticket),
        )
        .route(
            "/master-data/quality/tickets/{id}/history",
            get(get_quality_ticket_history),
        )
        .route(
            "/master-data/quality/tickets/{id}/escalate",
            post(escalate_ticket),
        )
        .route(
            "/master-data/quality/loop-stats",
            get(get_quality_loop_stats),
        )
        // V42.0 AC-14: 自动修复工作流
        .route(
            "/master-data/quality/repair-workflows",
            post(create_repair_workflow).get(list_repair_workflows),
        )
        .route(
            "/master-data/quality/repair-workflows/{id}",
            get(get_repair_workflow),
        )
        .route(
            "/master-data/quality/repair-workflows/{id}/execute",
            post(execute_repair_workflow),
        )
        .route(
            "/master-data/quality/repair-workflows/{id}/approve",
            post(approve_repair_workflow),
        )
        .route(
            "/master-data/quality/repair-workflows/{id}/verify",
            post(verify_repair),
        )
        .route(
            "/master-data/quality/repair-workflows/{id}/steps/{step_index}/execute",
            post(execute_repair_step),
        )
        // V42.0 AC-14: 数据所有权管理
        .route(
            "/master-data/domains",
            post(create_data_domain).get(list_data_domains),
        )
        .route(
            "/master-data/domains/{id}",
            get(get_data_domain).put(update_data_domain),
        )
        .route(
            "/master-data/ownership-matrix/{entity_type}",
            get(get_ownership_matrix).put(set_ownership_matrix),
        )
        .route(
            "/master-data/entities/{entity_type}/owner",
            get(get_entity_owner),
        )
        // V43.0 AC-15: 主数据图谱
        .route("/master-data/graph", get(get_master_data_graph))
        .route(
            "/master-data/graph/nodes/{node_id}",
            get(get_graph_node),
        )
        .route(
            "/master-data/graph/nodes/{node_id}/neighbors",
            get(get_node_neighbors),
        )
        .route(
            "/master-data/graph/shortest-path",
            get(get_shortest_path),
        )
        .route(
            "/master-data/graph/nodes/{node_id}/multi-hop",
            get(multi_hop_traversal),
        )
        .route("/master-data/graph/stats", get(get_graph_stats))
        // V43.0 AC-15: 知识图谱
        .route(
            "/master-data/knowledge/concepts",
            get(list_concepts),
        )
        .route(
            "/master-data/knowledge/concepts/{concept_id}",
            get(get_concept),
        )
        .route("/master-data/knowledge/triples", get(list_triples))
        .route(
            "/master-data/knowledge/inference-rules",
            get(list_inference_rules),
        )
        .route(
            "/master-data/knowledge/inference",
            post(run_inference),
        )
        // V43.0 AC-15: 智能推荐
        .route(
            "/master-data/recommendations/similar",
            get(get_similar_entities),
        )
        .route(
            "/master-data/recommendations/associations",
            get(get_association_recommendations),
        )
        .route(
            "/master-data/recommendations/completions",
            get(get_completion_suggestions),
        )
        // V44.0 AC-16: MDM GraphQL API
        .route("/master-data/graphql", post(graphql_endpoint))
        // V44.0 AC-16: 同步编排引擎 V2
        .route(
            "/master-data/sync/v2/jobs",
            post(create_sync_job_v2).get(list_sync_jobs_v2),
        )
        .route(
            "/master-data/sync/v2/jobs/{id}",
            get(get_sync_job_v2),
        )
        .route(
            "/master-data/sync/v2/dead-letters/{id}/retry",
            post(retry_dead_letter_v2),
        )
        .route(
            "/master-data/sync/v2/dead-letters/batch-retry",
            post(batch_retry_dead_letters),
        )
        .route(
            "/master-data/sync/v2/stats",
            get(sync_engine_stats_v2),
        )
        // V44.0 AC-16: MDM 服务注册与健康检查
        .route(
            "/master-data/services/register",
            post(mdm_service_register),
        )
        .route(
            "/master-data/services/{service_id}/deregister",
            post(mdm_service_deregister),
        )
        .route(
            "/master-data/services/{service_id}/heartbeat",
            post(mdm_service_heartbeat),
        )
        .route("/master-data/services", get(mdm_service_list))
        .route(
            "/master-data/services/{service_id}/health",
            get(mdm_service_health),
        )
        // V44.0 AC-16: MDM API 网关层
        .route(
            "/master-data/gateway/route",
            post(mdm_gateway_route),
        )
        .route(
            "/master-data/gateway/batch",
            post(mdm_gateway_batch),
        )
        .route(
            "/master-data/gateway/aggregate",
            post(mdm_gateway_aggregate),
        )
        .route("/master-data/gateway/stats", get(mdm_gateway_stats))
        // V45.0 AC-17: 主数据质量 AI
        .route(
            "/master-data/quality-ai/score/{id}",
            post(quality_ai_score_entity),
        )
        .route(
            "/master-data/quality-ai/batch-score",
            post(quality_ai_batch_score),
        )
        .route(
            "/master-data/quality-ai/anomalies",
            get(quality_ai_get_anomalies),
        )
        .route(
            "/master-data/quality-ai/predict/{id}",
            post(quality_ai_predict_quality),
        )
        .route(
            "/master-data/quality-ai/stats",
            get(quality_ai_get_stats),
        )
        // V45.0 AC-17: 智能匹配
        .route(
            "/master-data/matching/find-matches/{id}",
            post(matching_find_matches),
        )
        .route(
            "/master-data/matching/duplicates",
            get(matching_find_duplicates),
        )
        .route(
            "/master-data/matching/duplicate-groups",
            get(matching_get_duplicate_groups),
        )
        .route(
            "/master-data/matching/suggest-merge",
            post(matching_suggest_merge),
        )
        // V45.0 AC-17: 自动分类
        .route(
            "/master-data/classification/classify/{id}",
            post(classification_classify_entity),
        )
        .route(
            "/master-data/classification/batch-classify",
            post(classification_batch_classify),
        )
        .route(
            "/master-data/classification/suggest-tags/{id}",
            get(classification_suggest_tags),
        )
        .route(
            "/master-data/classification/categories",
            get(classification_list_categories),
        )
        .route(
            "/master-data/classification/learn-rule",
            post(classification_learn_rule),
        )
        .route(
            "/master-data/classification/stats",
            get(classification_get_stats),
        )
        // V46.0 AC-18: 数据血缘溯源
        .route(
            "/master-data-refs/lineage/trace",
            get(trace_lineage_handler),
        )
        .route(
            "/master-data-refs/lineage/trace/{id}/upstream",
            get(trace_upstream_handler),
        )
        .route(
            "/master-data-refs/lineage/trace/{id}/downstream",
            get(trace_downstream_handler),
        )
        .route(
            "/master-data-refs/lineage/origin/{id}",
            get(find_data_origin_handler),
        )
        // V46.0 AC-18: 影响分析
        .route(
            "/master-data-refs/impact/analyze",
            post(analyze_impact_handler),
        )
        .route(
            "/master-data-refs/impact/report/{entity_id}",
            get(get_impact_report_handler),
        )
        // V46.0 AC-18: 数据血缘图谱
        .route(
            "/master-data-refs/lineage/graph",
            get(get_lineage_graph_handler),
        )
        .route(
            "/master-data-refs/lineage/graph/stats",
            get(get_graph_stats_handler),
        )
        .route(
            "/master-data-refs/lineage/critical-paths",
            get(get_critical_paths_handler),
        )
        .route(
            "/master-data-refs/lineage/circular-deps",
            get(detect_circular_deps_handler),
        )
        // V47.0 AC-19: 主数据治理成熟度评估
        .route(
            "/master-data-refs/maturity/assess",
            get(assess_maturity_handler),
        )
        .route(
            "/master-data-refs/maturity/history",
            get(get_maturity_history_handler),
        )
        .route(
            "/master-data-refs/maturity/compare",
            post(compare_assessments_handler),
        )
        .route(
            "/master-data-refs/maturity/improvement-plan",
            get(get_improvement_plan_handler),
        )
        // V47.0 AC-19: Data Catalog（数据目录）
        .route(
            "/master-data-refs/catalog/search",
            get(search_catalog_handler),
        )
        .route(
            "/master-data-refs/catalog/stats",
            get(get_catalog_stats_handler),
        )
        .route(
            "/master-data-refs/catalog/popular",
            get(get_popular_entries_handler),
        )
        .route(
            "/master-data-refs/catalog",
            post(create_catalog_entry_handler),
        )
        .route(
            "/master-data-refs/catalog/{entry_id}",
            get(get_catalog_entry_handler)
                .put(update_catalog_entry_handler)
                .delete(delete_catalog_entry_handler),
        )
        // V47.0 AC-19: 元数据管理
        .route(
            "/master-data-refs/metadata/schemas",
            post(create_schema_handler).get(list_schemas_handler),
        )
        .route(
            "/master-data-refs/metadata/schemas/{schema_id}",
            get(get_schema_handler).put(update_schema_handler),
        )
        .route(
            "/master-data-refs/metadata/validate",
            post(validate_record_handler),
        )
        .route(
            "/master-data-refs/metadata/records",
            post(upsert_record_handler).get(query_records_handler),
        )
        .route(
            "/master-data-refs/metadata/records/{record_id}",
            get(get_record_handler),
        )
        .route(
            "/master-data-refs/metadata/relations",
            post(create_relation_handler).get(get_relations_handler),
        )
        .route(
            "/master-data-refs/metadata/stats",
            get(get_metadata_stats_handler),
        )
        // V48.0 AC-20: 主数据可视化仪表盘
        .route(
            "/master-data-refs/dashboard",
            post(create_dashboard_handler),
        )
        .route(
            "/master-data-refs/dashboard/kpi/summary",
            get(get_kpi_summary_handler),
        )
        .route(
            "/master-data-refs/dashboard/stats",
            get(get_dashboard_stats_handler),
        )
        .route(
            "/master-data-refs/dashboard/{dashboard_id}",
            get(get_dashboard_handler)
                .put(update_dashboard_handler)
                .delete(delete_dashboard_handler),
        )
        .route(
            "/master-data-refs/dashboard/{dashboard_id}/data",
            get(get_dashboard_data_handler),
        )
        .route(
            "/master-data-refs/dashboard/{dashboard_id}/refresh",
            post(refresh_dashboard_handler),
        )
        // V48.0 AC-20: 治理报告自动化
        .route(
            "/master-data-refs/reports/templates",
            get(list_report_templates_handler).post(create_report_template_handler),
        )
        .route(
            "/master-data-refs/reports/templates/{template_id}",
            get(get_report_template_handler),
        )
        .route(
            "/master-data-refs/reports/generate",
            post(generate_report_handler),
        )
        .route(
            "/master-data-refs/reports/generated",
            get(list_generated_reports_handler),
        )
        .route(
            "/master-data-refs/reports/generated/{report_id}",
            get(get_generated_report_handler),
        )
        .route(
            "/master-data-refs/reports/schedule",
            post(schedule_report_handler),
        )
        .route(
            "/master-data-refs/reports/schedule/{template_id}",
            get(get_report_schedule_handler),
        )
        .route(
            "/master-data-refs/reports/stats",
            get(get_report_automation_stats_handler),
        )
        // V48.0 AC-20: 合规审计
        .route(
            "/master-data-refs/audit/rules",
            get(list_compliance_rules_handler).post(create_compliance_rule_handler),
        )
        .route(
            "/master-data-refs/audit/check",
            post(run_compliance_check_handler),
        )
        .route(
            "/master-data-refs/audit/findings",
            get(get_audit_findings_handler),
        )
        .route(
            "/master-data-refs/audit/findings/{finding_id}/resolve",
            post(resolve_finding_handler),
        )
        .route(
            "/master-data-refs/audit/report",
            get(generate_audit_report_handler),
        )
        .route(
            "/master-data-refs/audit/scorecard",
            get(get_audit_scorecard_handler),
        )
        .route(
            "/master-data-refs/audit/stats",
            get(get_compliance_audit_stats_handler),
        )
}

// ==================== V35.0 AC-7: 审计追踪 ====================

// ==================== V40.0 AC-12: 主数据治理仪表盘 + 数据资产目录 + 血缘可视化 ====================

// ==================== V45.0 AC-17: 主数据质量 AI + 智能匹配 + 自动分类 ====================

/// AC-17 顶层注释：本节实现主数据治理的智能化能力，全部使用统计方法（不依赖外部 AI 服务）：
/// - 主数据质量 AI：加权多维度评分 + Z-Score/IQR 异常检测 + 线性回归质量预测
/// - 智能匹配：Levenshtein + Jaro-Winkler + 拼音/缩写匹配 + 多字段加权
/// - 自动分类：关键词匹配 + 规则推理 + TF-IDF 简化版 + 标签推荐
// 注：LazyLock / HashMap / HashSet 已在文件上方导入，此处复用

#[cfg(any())]
include!("master_data_refs_tests.rs");

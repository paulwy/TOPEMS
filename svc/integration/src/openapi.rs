// Integration 服务 OpenAPI 文档
use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    paths(
        // plugin
        crate::plugin::get_plugin_info,
        crate::plugin::plugin_health_check,
        // events
        crate::handlers::events::get_sync_stats,
        crate::handlers::events::list_events,
        crate::handlers::events::create_event,
        // lims_qms
        crate::handlers::lims_qms::list_lims_qms_sync,
        crate::handlers::lims_qms::create_lims_qms_sync,
        crate::handlers::lims_qms::get_lims_qms_sync,
        crate::handlers::lims_qms::sync_lims_qms,
        // mes_erp
        crate::handlers::mes_erp::list_mes_erp_sync,
        crate::handlers::mes_erp::create_mes_erp_sync,
        crate::handlers::mes_erp::get_mes_erp_sync,
        crate::handlers::mes_erp::sync_mes_erp,
        crate::handlers::mes_erp::sync_erp_order_to_mes,
        crate::handlers::mes_erp::sync_mes_progress_to_erp,
        crate::handlers::mes_erp::retry_mes_erp_sync,
        crate::handlers::mes_erp::get_mes_erp_sync_logs,
        crate::handlers::mes_erp::list_mes_erp_sync_records,
        // wms_scm
        crate::handlers::wms_scm::list_wms_scm_sync,
        crate::handlers::wms_scm::create_wms_scm_sync,
        crate::handlers::wms_scm::get_wms_scm_sync,
        crate::handlers::wms_scm::sync_wms_scm,
        // sync
        crate::handlers::sync::create_task,
        crate::handlers::sync::get_task,
        crate::handlers::sync::update_status,
        crate::handlers::sync::get_pending,
        crate::handlers::sync::get_statistics,
        crate::handlers::sync::retry_failed,
        crate::handlers::sync::trigger_scm_wms,
        crate::handlers::sync::trigger_wms_crm,
        crate::handlers::sync::trigger_srm_scm,
        // mes_qms
        crate::handlers::mes_qms::list_mes_qms_sync_api,
        crate::handlers::mes_qms::get_mes_qms_sync_api,
        crate::handlers::mes_qms::get_mes_qms_stats_api,
        crate::handlers::mes_qms::trigger_qms_inspection_api,
        crate::handlers::mes_qms::sync_quality_result_api,
        crate::handlers::mes_qms::sync_trace_chain_api,
        crate::handlers::mes_qms::defect_handling_api,
        crate::handlers::mes_qms::retry_mes_qms_sync_api,
        // conversion_rules
        crate::handlers::conversion_rules::list_conversion_rules_api,
        crate::handlers::conversion_rules::create_conversion_rule_api,
        crate::handlers::conversion_rules::get_conversion_rule_api,
        crate::handlers::conversion_rules::update_conversion_rule_api,
        crate::handlers::conversion_rules::delete_conversion_rule_api,
        crate::handlers::conversion_rules::get_rule_executions_api,
        crate::handlers::conversion_rules::execute_conversion_rule_api,
        crate::handlers::conversion_rules::enable_conversion_rule_api,
        crate::handlers::conversion_rules::disable_conversion_rule_api,
    
        crate::external_erp::create_connection,
        crate::external_erp::update_connection,
        crate::external_erp::delete_connection,
        crate::external_erp::list_entity_mappings,
        crate::external_erp::batch_entity_mappings,
        crate::external_erp::preview_entity,
        crate::external_erp::sync_entity,
        crate::external_erp::sync_logs,
        crate::external_erp::sync_statistics,
        crate::external_erp::export_mappings,
        crate::external_erp::export_sync_logs,
        crate::handlers::erp_mappings::list_mappings,
        crate::handlers::erp_mappings::get_mapping,
        crate::handlers::erp_mappings::create_mapping,
        crate::handlers::erp_mappings::update_mapping,
        crate::handlers::erp_mappings::delete_mapping,
),
    tags(
        (name = "Integration", description = "集成"),
        (name = "Sync", description = "数据同步"),
        (name = "Gateway", description = "API网关"),
        (name = "MessageQueue", description = "消息队列"),
        (name = "Health", description = "健康检查"),
    ),
    info(
        title = "TOPEMS-integration API",
        version = "1.0.0",
        description = "TOPEMS 集成服务 - 数据同步、API 网关、消息队列",
    ),
    servers(
        (url = "http://localhost:8072", description = "本地开发环境"),
    )
)]
pub struct ApiDoc;

//! TOPEMS Monitor（审计、健康、运维观测）最小 OpenAPI 文档骨架
use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    paths(
        // health_check
        crate::modules::monitor::health_check::get_service_health,
        // monitor_plugin
        crate::modules::monitor::monitor_plugin::get_plugin_info,
        crate::modules::monitor::monitor_plugin::plugin_health_check,
        // alert_evaluator (thresholds + metric snapshot)
        crate::modules::monitor::alert_evaluator::list_thresholds,
        crate::modules::monitor::alert_evaluator::create_threshold,
        crate::modules::monitor::alert_evaluator::get_threshold,
        crate::modules::monitor::alert_evaluator::update_threshold,
        crate::modules::monitor::alert_evaluator::delete_threshold,
        crate::modules::monitor::alert_evaluator::evaluate_thresholds,
        crate::modules::monitor::alert_evaluator::get_metric_snapshot,
        // metrics (system / database / performance)
        crate::modules::monitor::metrics::get_system_metrics,
        crate::modules::monitor::metrics::get_database_metrics,
        crate::modules::monitor::metrics::get_api_performance,
        crate::modules::monitor::metrics::get_performance_trend,
        crate::modules::monitor::metrics::get_service_performance,
        crate::modules::monitor::metrics::get_performance_summary,
        crate::modules::monitor::metrics::get_slow_queries,
        crate::modules::monitor::metrics::export_performance_data,
        // business_metrics
        crate::modules::monitor::business_metrics::list_business_metrics,
        crate::modules::monitor::business_metrics::get_business_metric,
        crate::modules::monitor::business_metrics::create_business_metric,
        crate::modules::monitor::business_metrics::update_business_metric,
        crate::modules::monitor::business_metrics::delete_business_metric,
        crate::modules::monitor::business_metrics::get_business_metric_summary,
        crate::modules::monitor::business_metrics::get_business_metric_trend,
        crate::modules::monitor::business_metrics::get_kpi_dashboard,
        // slo
        crate::modules::monitor::slo::list_slos,
        crate::modules::monitor::slo::get_slo,
        crate::modules::monitor::slo::create_slo,
        crate::modules::monitor::slo::update_slo,
        crate::modules::monitor::slo::delete_slo,
        crate::modules::monitor::slo::get_slo_summary,
        crate::modules::monitor::slo::get_slo_budget,
        crate::modules::monitor::slo::get_slo_trend,
        crate::modules::monitor::slo::list_slo_violations,
        crate::modules::monitor::slo::resolve_slo_violation,
        // alerts
        crate::modules::monitor::alerts::list_alerts,
        crate::modules::monitor::alerts::get_alert,
        crate::modules::monitor::alerts::update_alert,
        crate::modules::monitor::alerts::get_alert_statistics,
        crate::modules::monitor::alerts::acknowledge_alerts,
        crate::modules::monitor::alerts::resolve_alerts,
        crate::modules::monitor::alerts::get_alert_history,
        crate::modules::monitor::alerts::get_alert_timeline,
        // alert rules
        crate::modules::monitor::alerts::list_rules,
        crate::modules::monitor::alerts::create_rule,
        crate::modules::monitor::alerts::get_rule,
        crate::modules::monitor::alerts::update_rule,
        crate::modules::monitor::alerts::delete_rule,
        crate::modules::monitor::alerts::enable_rule,
        crate::modules::monitor::alerts::disable_rule,
        crate::modules::monitor::alerts::get_advanced_rule,
        crate::modules::monitor::alerts::update_advanced_rule,
        crate::modules::monitor::alerts::get_scheduled_trigger,
        crate::modules::monitor::alerts::update_scheduled_trigger,
        crate::modules::monitor::alerts::get_escalation,
        crate::modules::monitor::alerts::update_escalation,
        crate::modules::monitor::alerts::get_routing,
        crate::modules::monitor::alerts::update_routing,
        // alert templates
        crate::modules::monitor::alerts::list_templates,
        crate::modules::monitor::alerts::create_template,
        crate::modules::monitor::alerts::get_template,
        crate::modules::monitor::alerts::update_template,
        crate::modules::monitor::alerts::delete_template,
        // alert suppression
        crate::modules::monitor::alerts::list_suppression_rules,
        crate::modules::monitor::alerts::create_suppression_rule,
        crate::modules::monitor::alerts::get_suppression_rule,
        crate::modules::monitor::alerts::update_suppression_rule,
        crate::modules::monitor::alerts::delete_suppression_rule,
    ),
    tags(
        (name = "health",             description = "健康检查 API"),
        (name = "audit",              description = "审计日志查询 API"),
        (name = "metrics",            description = "Prometheus 指标导出 API"),
        (name = "thresholds",         description = "告警阈值管理 API"),
        (name = "plugin",             description = "插件信息查询 API"),
        (name = "performance",        description = "性能监控与导出 API"),
        (name = "business_metrics",   description = "业务指标 KPI 大盘 API"),
        (name = "slo",                description = "SLO/SLA 看板 API"),
        (name = "alerts",             description = "告警查询与管理 API"),
        (name = "alert_rules",        description = "告警规则管理 API"),
        (name = "alert_templates",    description = "告警通知模板 API"),
        (name = "alert_suppression",  description = "告警抑制规则 API"),
    ),
    info(
        title       = "TOPEMS Monitor API",
        version     = "1.0.0",
        description = "监控与审计服务 API - 包含健康检查、审计查询、Prometheus 指标导出"
    )
)]
pub struct MonitorApiDoc;

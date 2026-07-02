pub mod apqp;
pub mod audit;
pub mod corrective_action;
pub mod dashboard;
pub mod data_sync;
pub mod eight_d;
pub mod fmea;
pub mod quality_cost;
pub mod quality_dashboard;
pub mod quality_inspection;
pub mod quality_issue;
pub mod quality_standard;
pub mod spc;

use crate::AppState;
use axum::{
    routing::{delete, get, post, put},
    Router,
};

pub fn create_api_routes() -> Router<AppState> {
    Router::new()
        // Quality Standards
        .route("/api/qms/standards", get(quality_standard::list_standards))
        .route(
            "/api/qms/standards",
            post(quality_standard::create_standard),
        )
        .route(
            "/api/qms/standards/{id}",
            get(quality_standard::get_standard),
        )
        .route(
            "/api/qms/standards/{id}",
            put(quality_standard::update_standard),
        )
        .route(
            "/api/qms/standards/{id}",
            delete(quality_standard::delete_standard),
        )
        .route(
            "/api/qms/standards/{id}/revisions",
            get(quality_standard::list_revisions),
        )
        .route(
            "/api/qms/standards/{id}/revisions",
            post(quality_standard::create_revision),
        )
        // Quality Inspections/Checks
        .route("/api/qms/checks", get(quality_inspection::list_inspections))
        .route(
            "/api/qms/checks",
            post(quality_inspection::create_inspection),
        )
        .route(
            "/api/qms/checks/{id}",
            get(quality_inspection::get_inspection),
        )
        .route(
            "/api/qms/checks/{id}",
            put(quality_inspection::update_inspection),
        )
        .route(
            "/api/qms/checks/{id}",
            delete(quality_inspection::delete_inspection),
        )
        .route(
            "/api/qms/checks/{id}/assign",
            post(quality_inspection::assign_inspection),
        )
        .route(
            "/api/qms/checks/{id}/submit",
            post(quality_inspection::submit_result),
        )
        .route(
            "/api/qms/checks/{id}/audit",
            post(quality_inspection::audit_inspection),
        )
        .route(
            "/api/qms/checks/{id}/rework",
            post(quality_inspection::rework_inspection),
        )
        .route(
            "/api/qms/checks/{id}/results",
            get(quality_inspection::get_inspection_results),
        )
        .route(
            "/api/qms/checks/{id}/audits",
            get(quality_inspection::get_inspection_audits),
        )
        // Quality Issues
        .route("/api/qms/issues", get(quality_issue::list_issues))
        .route("/api/qms/issues", post(quality_issue::create_issue))
        .route("/api/qms/issues/{id}", get(quality_issue::get_issue))
        .route("/api/qms/issues/{id}", put(quality_issue::update_issue))
        .route("/api/qms/issues/{id}", delete(quality_issue::delete_issue))
        .route(
            "/api/qms/issues/{id}/resolve",
            post(quality_issue::resolve_issue),
        )
        // Dashboard
        .route("/api/qms/dashboard", get(dashboard::get_dashboard_stats))
        // Corrective Actions
        .route("/api/qms/actions", get(corrective_action::list_actions))
        .route("/api/qms/actions", post(corrective_action::create_action))
        .route("/api/qms/actions/{id}", get(corrective_action::get_action))
        .route(
            "/api/qms/actions/{id}",
            put(corrective_action::update_action),
        )
        .route(
            "/api/qms/actions/{id}",
            delete(corrective_action::delete_action),
        )
        .route(
            "/api/qms/actions/{id}/complete",
            post(corrective_action::complete_action),
        )
        .route(
            "/api/qms/actions/{id}/items",
            get(corrective_action::get_action_items),
        )
        // Audit Plans
        .route("/api/qms/audit-plans", get(audit::list_audit_plans))
        .route("/api/qms/audit-plans", post(audit::create_audit_plan))
        .route("/api/qms/audit-plans/{id}", get(audit::get_audit_plan))
        .route(
            "/api/qms/audit-plans/{id}/start",
            post(audit::start_audit_plan),
        )
        .route(
            "/api/qms/audit-plans/{id}/complete",
            post(audit::complete_audit_plan),
        )
        // Audit Tasks
        .route("/api/qms/audit-tasks", get(audit::list_audit_tasks))
        .route(
            "/api/qms/audit-plans/{plan_id}/tasks",
            post(audit::create_audit_task),
        )
        .route(
            "/api/qms/audit-tasks/{id}/complete",
            put(audit::complete_audit_task),
        )
        // Audit Findings
        .route("/api/qms/audit-findings", get(audit::list_audit_findings))
        .route(
            "/api/qms/audit-tasks/{task_id}/findings",
            post(audit::create_audit_finding),
        )
        .route(
            "/api/qms/audit-findings/{id}/verify",
            post(audit::verify_audit_finding),
        )
        // Data Sync
        .route("/api/qms/sync-records", get(data_sync::list_sync_records))
        .route(
            "/api/qms/sync-records/{id}",
            get(data_sync::get_sync_record),
        )
        .route(
            "/api/qms/sync-records/{id}",
            delete(data_sync::delete_sync_record),
        )
        .route(
            "/api/qms/sync-records/{id}/retry",
            post(data_sync::retry_sync),
        )
        .route(
            "/api/qms/sync/inspection-to-lims",
            post(data_sync::sync_inspection_to_lims),
        )
        .route(
            "/api/qms/sync/issue-to-ehs",
            post(data_sync::sync_issue_to_ehs),
        )
        // SPC Statistical Process Control
        .route("/api/qms/spc/charts", get(spc::list_spc_charts))
        .route("/api/qms/spc/charts", post(spc::create_spc_chart))
        .route("/api/qms/spc/charts/{id}", get(spc::get_spc_chart))
        .route("/api/qms/spc/charts/{id}", put(spc::update_spc_chart))
        .route("/api/qms/spc/charts/{id}", delete(spc::delete_spc_chart))
        .route("/api/qms/spc/data-points", get(spc::get_spc_data_points))
        .route("/api/qms/spc/data-points", post(spc::add_spc_data_point))
        .route(
            "/api/qms/spc/calculate",
            post(spc::calculate_control_limits),
        )
        // Quality Cost
        .route(
            "/api/qms/quality-costs",
            get(quality_cost::list_quality_costs),
        )
        .route(
            "/api/qms/quality-costs",
            post(quality_cost::create_quality_cost),
        )
        .route(
            "/api/qms/quality-costs/{id}",
            get(quality_cost::get_quality_cost),
        )
        .route(
            "/api/qms/quality-costs/{id}",
            put(quality_cost::update_quality_cost),
        )
        .route(
            "/api/qms/quality-costs/{id}",
            delete(quality_cost::delete_quality_cost),
        )
        .route(
            "/api/qms/quality-costs/statistics",
            get(quality_cost::get_cost_statistics),
        )
        .route(
            "/api/qms/quality-costs/trend",
            get(quality_cost::get_cost_trend),
        )
        // 8D Problem Solving
        .route("/api/qms/eightd", get(eight_d::list_eightd_reports))
        .route("/api/qms/eightd", post(eight_d::create_eightd_report))
        .route("/api/qms/eightd/{id}", get(eight_d::get_eightd_report))
        .route("/api/qms/eightd/{id}", put(eight_d::update_eightd_report))
        .route(
            "/api/qms/eightd/{id}",
            delete(eight_d::delete_eightd_report),
        )
        .route(
            "/api/qms/eightd/{id}/d1-team",
            post(eight_d::update_d1_team),
        )
        .route(
            "/api/qms/eightd/{id}/d3-containment",
            post(eight_d::submit_d3_containment),
        )
        .route(
            "/api/qms/eightd/{id}/d4-root-cause",
            post(eight_d::submit_d4_root_cause),
        )
        .route(
            "/api/qms/eightd/{id}/d5-permanent-action",
            post(eight_d::submit_d5_permanent_action),
        )
        .route(
            "/api/qms/eightd/{id}/d6-verify",
            post(eight_d::verify_d6_effectiveness),
        )
        .route(
            "/api/qms/eightd/{id}/d7-preventive",
            post(eight_d::submit_d7_preventive),
        )
        .route(
            "/api/qms/eightd/{id}/close",
            post(eight_d::close_eightd_report),
        )
        .route(
            "/api/qms/eightd/{id}/audit-logs",
            get(eight_d::get_eightd_audit_logs),
        )
        // FMEA
        .route("/api/qms/fmea", get(fmea::list_fmea_analyses))
        .route("/api/qms/fmea", post(fmea::create_fmea_analysis))
        .route("/api/qms/fmea/{id}", get(fmea::get_fmea_analysis))
        .route("/api/qms/fmea/{id}", put(fmea::update_fmea_analysis))
        .route("/api/qms/fmea/{id}", delete(fmea::delete_fmea_analysis))
        .route(
            "/api/qms/fmea/{id}/statistics",
            get(fmea::get_fmea_statistics),
        )
        .route("/api/qms/fmea-items", get(fmea::list_fmea_items))
        .route("/api/qms/fmea-items", post(fmea::create_fmea_item))
        .route("/api/qms/fmea-items/{id}", get(fmea::get_fmea_item))
        .route("/api/qms/fmea-items/{id}", put(fmea::update_fmea_item))
        .route("/api/qms/fmea-items/{id}", delete(fmea::delete_fmea_item))
        // Quality Dashboard & Alerts
        .route(
            "/api/qms/quality-dashboard/overview",
            get(quality_dashboard::get_quality_overview),
        )
        .route(
            "/api/qms/quality-dashboard/trend",
            get(quality_dashboard::get_quality_trend),
        )
        .route(
            "/api/qms/quality-dashboard/defect-distribution",
            get(quality_dashboard::get_defect_distribution),
        )
        .route(
            "/api/qms/alert-rules",
            get(quality_dashboard::list_alert_rules),
        )
        .route(
            "/api/qms/alert-rules",
            post(quality_dashboard::create_alert_rule),
        )
        .route(
            "/api/qms/alert-rules/{id}",
            get(quality_dashboard::get_alert_rule),
        )
        .route(
            "/api/qms/alert-rules/{id}",
            put(quality_dashboard::update_alert_rule),
        )
        .route(
            "/api/qms/alert-rules/{id}",
            delete(quality_dashboard::delete_alert_rule),
        )
        .route(
            "/api/qms/alert-messages",
            get(quality_dashboard::list_alert_messages),
        )
        .route(
            "/api/qms/alert-messages",
            post(quality_dashboard::create_alert_message),
        )
        .route(
            "/api/qms/alert-messages/{id}/acknowledge",
            post(quality_dashboard::acknowledge_alert),
        )
        // APQP (Advanced Product Quality Planning)
        .route("/api/qms/apqp/projects", get(apqp::list_apqp_projects))
        .route("/api/qms/apqp/projects", post(apqp::create_apqp_project))
        .route("/api/qms/apqp/projects/{id}", get(apqp::get_apqp_project))
        .route(
            "/api/qms/apqp/projects/{id}",
            put(apqp::update_apqp_project),
        )
        .route(
            "/api/qms/apqp/projects/{id}",
            delete(apqp::delete_apqp_project),
        )
        .route(
            "/api/qms/apqp/projects/{id}/transition",
            post(apqp::transition_project_status),
        )
        .route(
            "/api/qms/apqp/projects/{id}/progress",
            get(apqp::get_apqp_progress),
        )
        .route("/api/qms/apqp/phases", get(apqp::list_apqp_phases))
        .route("/api/qms/apqp/phases", post(apqp::create_apqp_phase))
        .route("/api/qms/apqp/phases/{id}", get(apqp::get_apqp_phase))
        .route("/api/qms/apqp/phases/{id}", put(apqp::update_apqp_phase))
        .route("/api/qms/apqp/phases/{id}", delete(apqp::delete_apqp_phase))
        .route("/api/qms/apqp/tasks", get(apqp::list_apqp_tasks))
        .route("/api/qms/apqp/tasks", post(apqp::create_apqp_task))
        .route("/api/qms/apqp/tasks/{id}", get(apqp::get_apqp_task))
        .route("/api/qms/apqp/tasks/{id}", put(apqp::update_apqp_task))
        .route("/api/qms/apqp/tasks/{id}", delete(apqp::delete_apqp_task))
        .route("/api/qms/apqp/risks", get(apqp::list_apqp_risks))
        .route("/api/qms/apqp/risks", post(apqp::create_apqp_risk))
        .route("/api/qms/apqp/risks/{id}", get(apqp::get_apqp_risk))
        .route("/api/qms/apqp/risks/{id}", put(apqp::update_apqp_risk))
        .route("/api/qms/apqp/risks/{id}", delete(apqp::delete_apqp_risk))
        .route("/api/qms/apqp/approvals", get(apqp::list_apqp_approvals))
        .route("/api/qms/apqp/approvals", post(apqp::create_apqp_approval))
        .route(
            "/api/qms/apqp/approvals/{id}/process",
            post(apqp::process_apqp_approval),
        )
}

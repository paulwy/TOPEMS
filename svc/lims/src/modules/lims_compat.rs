//! LIMS compatibility OpenAPI paths.
//!
//! OpenAPI-only contract entries for frontend `/api/lims/*` calls
//! not represented by concrete utoipa handlers yet.

#![allow(dead_code)]
#[utoipa::path(
    get,
    path = "/api/lims/audit-logs/{id}",
    tag = "LIMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_get_api_lims_audit_logs_id() {}

#[utoipa::path(
    post,
    path = "/api/lims/barcodes/generate",
    tag = "LIMS-Compat",
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_post_api_lims_barcodes_generate() {}

#[utoipa::path(
    post,
    path = "/api/lims/barcodes/print",
    tag = "LIMS-Compat",
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_post_api_lims_barcodes_print() {}

#[utoipa::path(
    get,
    path = "/api/lims/barcodes/scan/{barcode}",
    tag = "LIMS-Compat",
    params(("barcode" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_get_api_lims_barcodes_scan_barcode() {}

#[utoipa::path(
    get,
    path = "/api/lims/barcodes/types",
    tag = "LIMS-Compat",
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_get_api_lims_barcodes_types() {}

#[utoipa::path(
    get,
    path = "/api/lims/barcodes/{barcode}/trace",
    tag = "LIMS-Compat",
    params(("barcode" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_get_api_lims_barcodes_barcode_trace() {}

#[utoipa::path(
    get,
    path = "/api/lims/collection-tasks",
    tag = "LIMS-Compat",
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_get_api_lims_collection_tasks() {}

#[utoipa::path(
    post,
    path = "/api/lims/collection-tasks",
    tag = "LIMS-Compat",
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_post_api_lims_collection_tasks() {}

#[utoipa::path(
    delete,
    path = "/api/lims/collection-tasks/{id}",
    tag = "LIMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_delete_api_lims_collection_tasks_id() {}

#[utoipa::path(
    get,
    path = "/api/lims/collection-tasks/{id}",
    tag = "LIMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_get_api_lims_collection_tasks_id() {}

#[utoipa::path(
    put,
    path = "/api/lims/collection-tasks/{id}",
    tag = "LIMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_put_api_lims_collection_tasks_id() {}

#[utoipa::path(
    post,
    path = "/api/lims/collection-tasks/{id}/trigger",
    tag = "LIMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_post_api_lims_collection_tasks_id_trigger() {}

#[utoipa::path(
    get,
    path = "/api/lims/dashboard",
    tag = "LIMS-Compat",
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_get_api_lims_dashboard() {}

#[utoipa::path(
    get,
    path = "/api/lims/health",
    tag = "LIMS-Compat",
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_get_api_lims_health() {}

#[utoipa::path(
    get,
    path = "/api/lims/instrument-data",
    tag = "LIMS-Compat",
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_get_api_lims_instrument_data() {}

#[utoipa::path(
    post,
    path = "/api/lims/instrument-data",
    tag = "LIMS-Compat",
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_post_api_lims_instrument_data() {}

#[utoipa::path(
    post,
    path = "/api/lims/instrument-data/parse/test",
    tag = "LIMS-Compat",
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_post_api_lims_instrument_data_parse_test() {}

#[utoipa::path(
    get,
    path = "/api/lims/instrument-data/statistics",
    tag = "LIMS-Compat",
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_get_api_lims_instrument_data_statistics() {}

#[utoipa::path(
    delete,
    path = "/api/lims/instrument-data/{id}",
    tag = "LIMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_delete_api_lims_instrument_data_id() {}

#[utoipa::path(
    get,
    path = "/api/lims/instrument-data/{id}",
    tag = "LIMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_get_api_lims_instrument_data_id() {}

#[utoipa::path(
    put,
    path = "/api/lims/instrument-data/{id}",
    tag = "LIMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_put_api_lims_instrument_data_id() {}

#[utoipa::path(
    post,
    path = "/api/lims/instrument-data/{id}/parse",
    tag = "LIMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_post_api_lims_instrument_data_id_parse() {}

#[utoipa::path(
    post,
    path = "/api/lims/instruments/{id}/calibrate",
    tag = "LIMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_post_api_lims_instruments_id_calibrate() {}

#[utoipa::path(
    get,
    path = "/api/lims/instruments/{instrumentId}/calibrations",
    tag = "LIMS-Compat",
    params(("instrumentId" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_get_api_lims_instruments_instrumentid_calibrations() {}

#[utoipa::path(
    get,
    path = "/api/lims/instruments/{instrumentId}/maintenance",
    tag = "LIMS-Compat",
    params(("instrumentId" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_get_api_lims_instruments_instrumentid_maintenance() {}

#[utoipa::path(
    get,
    path = "/api/lims/lifecycle-stages",
    tag = "LIMS-Compat",
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_get_api_lims_lifecycle_stages() {}

#[utoipa::path(
    get,
    path = "/api/lims/lifecycle-stages/{id}",
    tag = "LIMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_get_api_lims_lifecycle_stages_id() {}

#[utoipa::path(
    post,
    path = "/api/lims/maintenance",
    tag = "LIMS-Compat",
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_post_api_lims_maintenance() {}

#[utoipa::path(
    delete,
    path = "/api/lims/maintenance/{id}",
    tag = "LIMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_delete_api_lims_maintenance_id() {}

#[utoipa::path(
    put,
    path = "/api/lims/maintenance/{id}",
    tag = "LIMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_put_api_lims_maintenance_id() {}

#[utoipa::path(
    get,
    path = "/api/lims/method-categories",
    tag = "LIMS-Compat",
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_get_api_lims_method_categories() {}

#[utoipa::path(
    post,
    path = "/api/lims/method-categories",
    tag = "LIMS-Compat",
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_post_api_lims_method_categories() {}

#[utoipa::path(
    delete,
    path = "/api/lims/method-categories/{id}",
    tag = "LIMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_delete_api_lims_method_categories_id() {}

#[utoipa::path(
    put,
    path = "/api/lims/method-categories/{id}",
    tag = "LIMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_put_api_lims_method_categories_id() {}

#[utoipa::path(
    get,
    path = "/api/lims/method-validations",
    tag = "LIMS-Compat",
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_get_api_lims_method_validations() {}

#[utoipa::path(
    post,
    path = "/api/lims/method-validations",
    tag = "LIMS-Compat",
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_post_api_lims_method_validations() {}

#[utoipa::path(
    get,
    path = "/api/lims/parse-rules",
    tag = "LIMS-Compat",
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_get_api_lims_parse_rules() {}

#[utoipa::path(
    post,
    path = "/api/lims/parse-rules",
    tag = "LIMS-Compat",
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_post_api_lims_parse_rules() {}

#[utoipa::path(
    delete,
    path = "/api/lims/parse-rules/{id}",
    tag = "LIMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_delete_api_lims_parse_rules_id() {}

#[utoipa::path(
    get,
    path = "/api/lims/parse-rules/{id}",
    tag = "LIMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_get_api_lims_parse_rules_id() {}

#[utoipa::path(
    put,
    path = "/api/lims/parse-rules/{id}",
    tag = "LIMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_put_api_lims_parse_rules_id() {}

#[utoipa::path(
    get,
    path = "/api/lims/print-config",
    tag = "LIMS-Compat",
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_get_api_lims_print_config() {}

#[utoipa::path(
    get,
    path = "/api/lims/print-config/default",
    tag = "LIMS-Compat",
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_get_api_lims_print_config_default() {}

#[utoipa::path(
    post,
    path = "/api/lims/pt-corrective-actions",
    tag = "LIMS-Compat",
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_post_api_lims_pt_corrective_actions() {}

#[utoipa::path(
    put,
    path = "/api/lims/pt-corrective-actions/{id}",
    tag = "LIMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_put_api_lims_pt_corrective_actions_id() {}

#[utoipa::path(
    post,
    path = "/api/lims/pt-evaluations",
    tag = "LIMS-Compat",
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_post_api_lims_pt_evaluations() {}

#[utoipa::path(
    get,
    path = "/api/lims/pt-plans/{planId}/corrective-actions",
    tag = "LIMS-Compat",
    params(("planId" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_get_api_lims_pt_plans_planid_corrective_actions() {}

#[utoipa::path(
    get,
    path = "/api/lims/pt-plans/{planId}/evaluations",
    tag = "LIMS-Compat",
    params(("planId" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_get_api_lims_pt_plans_planid_evaluations() {}

#[utoipa::path(
    get,
    path = "/api/lims/pt-plans/{planId}/results",
    tag = "LIMS-Compat",
    params(("planId" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_get_api_lims_pt_plans_planid_results() {}

#[utoipa::path(
    get,
    path = "/api/lims/pt-plans/{planId}/samples",
    tag = "LIMS-Compat",
    params(("planId" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_get_api_lims_pt_plans_planid_samples() {}

#[utoipa::path(
    post,
    path = "/api/lims/pt-results",
    tag = "LIMS-Compat",
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_post_api_lims_pt_results() {}

#[utoipa::path(
    post,
    path = "/api/lims/pt-samples/receive",
    tag = "LIMS-Compat",
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_post_api_lims_pt_samples_receive() {}

#[utoipa::path(
    get,
    path = "/api/lims/reagents/expiring",
    tag = "LIMS-Compat",
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_get_api_lims_reagents_expiring() {}

#[utoipa::path(
    get,
    path = "/api/lims/reagents/low-stock",
    tag = "LIMS-Compat",
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_get_api_lims_reagents_low_stock() {}

#[utoipa::path(
    get,
    path = "/api/lims/records/task/{taskId}",
    tag = "LIMS-Compat",
    params(("taskId" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_get_api_lims_records_task_taskid() {}

#[utoipa::path(
    get,
    path = "/api/lims/rfid-tags",
    tag = "LIMS-Compat",
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_get_api_lims_rfid_tags() {}

#[utoipa::path(
    post,
    path = "/api/lims/rfid-tags",
    tag = "LIMS-Compat",
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_post_api_lims_rfid_tags() {}

#[utoipa::path(
    post,
    path = "/api/lims/rfid-tags/assign",
    tag = "LIMS-Compat",
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_post_api_lims_rfid_tags_assign() {}

#[utoipa::path(
    delete,
    path = "/api/lims/rfid-tags/{id}",
    tag = "LIMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_delete_api_lims_rfid_tags_id() {}

#[utoipa::path(
    post,
    path = "/api/lims/rfid-tags/{tagId}/unassign",
    tag = "LIMS-Compat",
    params(("tagId" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_post_api_lims_rfid_tags_tagid_unassign() {}

#[utoipa::path(
    delete,
    path = "/api/lims/samples/batch",
    tag = "LIMS-Compat",
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_delete_api_lims_samples_batch() {}

#[utoipa::path(
    post,
    path = "/api/lims/samples/batch",
    tag = "LIMS-Compat",
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_post_api_lims_samples_batch() {}

#[utoipa::path(
    post,
    path = "/api/lims/samples/import",
    tag = "LIMS-Compat",
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_post_api_lims_samples_import() {}

#[utoipa::path(
    post,
    path = "/api/lims/samples/lifecycle-event",
    tag = "LIMS-Compat",
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_post_api_lims_samples_lifecycle_event() {}

#[utoipa::path(
    get,
    path = "/api/lims/samples/{sampleId}/lifecycle",
    tag = "LIMS-Compat",
    params(("sampleId" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_get_api_lims_samples_sampleid_lifecycle() {}

#[utoipa::path(
    get,
    path = "/api/lims/samples/{sampleId}/traceability",
    tag = "LIMS-Compat",
    params(("sampleId" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_get_api_lims_samples_sampleid_traceability() {}

#[utoipa::path(
    post,
    path = "/api/lims/samples/{sampleId}/transition-stage",
    tag = "LIMS-Compat",
    params(("sampleId" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_post_api_lims_samples_sampleid_transition_stage() {}

#[utoipa::path(
    get,
    path = "/api/lims/statistics",
    tag = "LIMS-Compat",
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_get_api_lims_statistics() {}

#[utoipa::path(
    get,
    path = "/api/lims/sync-records",
    tag = "LIMS-Compat",
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_get_api_lims_sync_records() {}

#[utoipa::path(
    delete,
    path = "/api/lims/sync-records/{id}",
    tag = "LIMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_delete_api_lims_sync_records_id() {}

#[utoipa::path(
    get,
    path = "/api/lims/sync-records/{id}",
    tag = "LIMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_get_api_lims_sync_records_id() {}

#[utoipa::path(
    post,
    path = "/api/lims/sync-records/{id}/retry",
    tag = "LIMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_post_api_lims_sync_records_id_retry() {}

#[utoipa::path(
    post,
    path = "/api/lims/sync/reagent-to-ehs",
    tag = "LIMS-Compat",
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_post_api_lims_sync_reagent_to_ehs() {}

#[utoipa::path(
    post,
    path = "/api/lims/sync/record-to-qms",
    tag = "LIMS-Compat",
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_post_api_lims_sync_record_to_qms() {}

#[utoipa::path(
    get,
    path = "/api/lims/tasks/sample/{sampleId}",
    tag = "LIMS-Compat",
    params(("sampleId" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_get_api_lims_tasks_sample_sampleid() {}

#[utoipa::path(
    post,
    path = "/api/lims/tasks/{id}/complete_step",
    tag = "LIMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_post_api_lims_tasks_id_complete_step() {}

#[utoipa::path(
    post,
    path = "/api/lims/tasks/{id}/submit-result",
    tag = "LIMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_post_api_lims_tasks_id_submit_result() {}

#[utoipa::path(
    post,
    path = "/api/lims/test-methods/{methodId}/new-version",
    tag = "LIMS-Compat",
    params(("methodId" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_post_api_lims_test_methods_methodid_new_version() {}

#[utoipa::path(
    get,
    path = "/api/lims/test-methods/{methodId}/versions",
    tag = "LIMS-Compat",
    params(("methodId" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_get_api_lims_test_methods_methodid_versions() {}

#[utoipa::path(
    post,
    path = "/api/lims/uncertainty-components",
    tag = "LIMS-Compat",
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_post_api_lims_uncertainty_components() {}

#[utoipa::path(
    delete,
    path = "/api/lims/uncertainty-components/{id}",
    tag = "LIMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_delete_api_lims_uncertainty_components_id() {}

#[utoipa::path(
    put,
    path = "/api/lims/uncertainty-components/{id}",
    tag = "LIMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_put_api_lims_uncertainty_components_id() {}

#[utoipa::path(
    post,
    path = "/api/lims/uncertainty-projects/{projectId}/combined",
    tag = "LIMS-Compat",
    params(("projectId" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_post_api_lims_uncertainty_projects_projectid_combined() {}

#[utoipa::path(
    get,
    path = "/api/lims/uncertainty-projects/{projectId}/components",
    tag = "LIMS-Compat",
    params(("projectId" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_get_api_lims_uncertainty_projects_projectid_components() {}

#[utoipa::path(
    get,
    path = "/api/lims/uncertainty-projects/{projectId}/report",
    tag = "LIMS-Compat",
    params(("projectId" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_get_api_lims_uncertainty_projects_projectid_report() {}

#[utoipa::path(
    get,
    path = "/api/lims/uncertainty-projects/{projectId}/sources",
    tag = "LIMS-Compat",
    params(("projectId" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_get_api_lims_uncertainty_projects_projectid_sources() {}

#[utoipa::path(
    post,
    path = "/api/lims/uncertainty-sources",
    tag = "LIMS-Compat",
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_post_api_lims_uncertainty_sources() {}

#[utoipa::path(
    delete,
    path = "/api/lims/uncertainty-sources/{id}",
    tag = "LIMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_delete_api_lims_uncertainty_sources_id() {}

#[utoipa::path(
    put,
    path = "/api/lims/uncertainty-sources/{id}",
    tag = "LIMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_put_api_lims_uncertainty_sources_id() {}

#[utoipa::path(
    post,
    path = "/api/lims/uncertainty/type-a",
    tag = "LIMS-Compat",
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_post_api_lims_uncertainty_type_a() {}

#[utoipa::path(
    post,
    path = "/api/lims/uncertainty/type-b",
    tag = "LIMS-Compat",
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_post_api_lims_uncertainty_type_b() {}

#[utoipa::path(
    delete,
    path = "/api/lims/{endpoint}/{id}",
    tag = "LIMS-Compat",
    params(("endpoint" = String, Path, description = "id"), ("id" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_delete_api_lims_endpoint_id() {}

#[utoipa::path(
    get,
    path = "/api/lims/{endpoint}/{id}",
    tag = "LIMS-Compat",
    params(("endpoint" = String, Path, description = "id"), ("id" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_get_api_lims_endpoint_id() {}

#[utoipa::path(
    put,
    path = "/api/lims/{endpoint}/{id}",
    tag = "LIMS-Compat",
    params(("endpoint" = String, Path, description = "id"), ("id" = String, Path, description = "id")),
    responses((status = 200, description = "LIMS compatibility endpoint"))
)]
pub async fn compat_put_api_lims_endpoint_id() {}

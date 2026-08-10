//! HRM compatibility OpenAPI paths.
//!
//! These functions are OpenAPI-only contract entries for frontend
//! `/api/hrm/*` calls that are not represented by concrete utoipa
//! handlers yet. They do not alter runtime routing behavior.

#[utoipa::path(
    get,
    path = "/api/hrm/attendance",
    tag = "HRM-Compat",
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_get_api_hrm_attendance() {}

#[utoipa::path(
    post,
    path = "/api/hrm/attendance",
    tag = "HRM-Compat",
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_post_api_hrm_attendance() {}

#[utoipa::path(
    post,
    path = "/api/hrm/attendance/check-in",
    tag = "HRM-Compat",
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_post_api_hrm_attendance_check_in() {}

#[utoipa::path(
    post,
    path = "/api/hrm/attendance/check-out",
    tag = "HRM-Compat",
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_post_api_hrm_attendance_check_out() {}

#[utoipa::path(
    delete,
    path = "/api/hrm/attendance/{id}",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_delete_api_hrm_attendance_id() {}

#[utoipa::path(
    get,
    path = "/api/hrm/attendance/{id}",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_get_api_hrm_attendance_id() {}

#[utoipa::path(
    put,
    path = "/api/hrm/attendance/{id}",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_put_api_hrm_attendance_id() {}

#[utoipa::path(
    get,
    path = "/api/hrm/candidates",
    tag = "HRM-Compat",
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_get_api_hrm_candidates() {}

#[utoipa::path(
    post,
    path = "/api/hrm/candidates",
    tag = "HRM-Compat",
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_post_api_hrm_candidates() {}

#[utoipa::path(
    delete,
    path = "/api/hrm/candidates/{id}",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_delete_api_hrm_candidates_id() {}

#[utoipa::path(
    get,
    path = "/api/hrm/candidates/{id}",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_get_api_hrm_candidates_id() {}

#[utoipa::path(
    put,
    path = "/api/hrm/candidates/{id}",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_put_api_hrm_candidates_id() {}

#[utoipa::path(
    get,
    path = "/api/hrm/contract-renewals",
    tag = "HRM-Compat",
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_get_api_hrm_contract_renewals() {}

#[utoipa::path(
    delete,
    path = "/api/hrm/contract-renewals/{id}",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_delete_api_hrm_contract_renewals_id() {}

#[utoipa::path(
    get,
    path = "/api/hrm/contract-renewals/{id}",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_get_api_hrm_contract_renewals_id() {}

#[utoipa::path(
    put,
    path = "/api/hrm/contract-renewals/{id}",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_put_api_hrm_contract_renewals_id() {}

#[utoipa::path(
    put,
    path = "/api/hrm/contract-renewals/{id}/approve",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_put_api_hrm_contract_renewals_id_approve() {}

#[utoipa::path(
    put,
    path = "/api/hrm/contract-renewals/{id}/execute",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_put_api_hrm_contract_renewals_id_execute() {}

#[utoipa::path(
    put,
    path = "/api/hrm/contract-renewals/{id}/reject",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_put_api_hrm_contract_renewals_id_reject() {}

#[utoipa::path(
    get,
    path = "/api/hrm/contracts",
    tag = "HRM-Compat",
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_get_api_hrm_contracts() {}

#[utoipa::path(
    post,
    path = "/api/hrm/contracts",
    tag = "HRM-Compat",
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_post_api_hrm_contracts() {}

#[utoipa::path(
    get,
    path = "/api/hrm/contracts/expiring",
    tag = "HRM-Compat",
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_get_api_hrm_contracts_expiring() {}

#[utoipa::path(
    post,
    path = "/api/hrm/contracts/{contract_id}/renew",
    tag = "HRM-Compat",
    params(("contract_id" = String, Path, description = "contract_id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_post_api_hrm_contracts_contract_id_renew() {}

#[utoipa::path(
    delete,
    path = "/api/hrm/contracts/{id}",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_delete_api_hrm_contracts_id() {}

#[utoipa::path(
    get,
    path = "/api/hrm/contracts/{id}",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_get_api_hrm_contracts_id() {}

#[utoipa::path(
    put,
    path = "/api/hrm/contracts/{id}",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_put_api_hrm_contracts_id() {}

#[utoipa::path(
    get,
    path = "/api/hrm/dashboard",
    tag = "HRM-Compat",
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_get_api_hrm_dashboard() {}

#[utoipa::path(
    get,
    path = "/api/hrm/employees/{employee_id}/performance-goals",
    tag = "HRM-Compat",
    params(("employee_id" = String, Path, description = "employee_id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_get_api_hrm_employees_employee_id_performance_goals() {}

#[utoipa::path(
    get,
    path = "/api/hrm/employees/{employee_id}/performance-reviews",
    tag = "HRM-Compat",
    params(("employee_id" = String, Path, description = "employee_id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_get_api_hrm_employees_employee_id_performance_reviews() {}

#[utoipa::path(
    get,
    path = "/api/hrm/health",
    tag = "HRM-Compat",
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_get_api_hrm_health() {}

#[utoipa::path(
    get,
    path = "/api/hrm/interviews",
    tag = "HRM-Compat",
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_get_api_hrm_interviews() {}

#[utoipa::path(
    post,
    path = "/api/hrm/interviews",
    tag = "HRM-Compat",
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_post_api_hrm_interviews() {}

#[utoipa::path(
    delete,
    path = "/api/hrm/interviews/{id}",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_delete_api_hrm_interviews_id() {}

#[utoipa::path(
    get,
    path = "/api/hrm/interviews/{id}",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_get_api_hrm_interviews_id() {}

#[utoipa::path(
    put,
    path = "/api/hrm/interviews/{id}",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_put_api_hrm_interviews_id() {}

#[utoipa::path(
    put,
    path = "/api/hrm/interviews/{id}/complete",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_put_api_hrm_interviews_id_complete() {}

#[utoipa::path(
    get,
    path = "/api/hrm/job-openings",
    tag = "HRM-Compat",
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_get_api_hrm_job_openings() {}

#[utoipa::path(
    post,
    path = "/api/hrm/job-openings",
    tag = "HRM-Compat",
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_post_api_hrm_job_openings() {}

#[utoipa::path(
    delete,
    path = "/api/hrm/job-openings/{id}",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_delete_api_hrm_job_openings_id() {}

#[utoipa::path(
    get,
    path = "/api/hrm/job-openings/{id}",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_get_api_hrm_job_openings_id() {}

#[utoipa::path(
    put,
    path = "/api/hrm/job-openings/{id}",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_put_api_hrm_job_openings_id() {}

#[utoipa::path(
    put,
    path = "/api/hrm/job-openings/{id}/close",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_put_api_hrm_job_openings_id_close() {}

#[utoipa::path(
    put,
    path = "/api/hrm/job-openings/{id}/publish",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_put_api_hrm_job_openings_id_publish() {}

#[utoipa::path(
    get,
    path = "/api/hrm/leaves",
    tag = "HRM-Compat",
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_get_api_hrm_leaves() {}

#[utoipa::path(
    post,
    path = "/api/hrm/leaves",
    tag = "HRM-Compat",
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_post_api_hrm_leaves() {}

#[utoipa::path(
    delete,
    path = "/api/hrm/leaves/{id}",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_delete_api_hrm_leaves_id() {}

#[utoipa::path(
    get,
    path = "/api/hrm/leaves/{id}",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_get_api_hrm_leaves_id() {}

#[utoipa::path(
    put,
    path = "/api/hrm/leaves/{id}",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_put_api_hrm_leaves_id() {}

#[utoipa::path(
    put,
    path = "/api/hrm/leaves/{id}/approve",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_put_api_hrm_leaves_id_approve() {}

#[utoipa::path(
    put,
    path = "/api/hrm/leaves/{id}/reject",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_put_api_hrm_leaves_id_reject() {}

#[utoipa::path(
    get,
    path = "/api/hrm/payroll-items",
    tag = "HRM-Compat",
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_get_api_hrm_payroll_items() {}

#[utoipa::path(
    get,
    path = "/api/hrm/payroll-items/{id}",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_get_api_hrm_payroll_items_id() {}

#[utoipa::path(
    get,
    path = "/api/hrm/payroll-runs",
    tag = "HRM-Compat",
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_get_api_hrm_payroll_runs() {}

#[utoipa::path(
    post,
    path = "/api/hrm/payroll-runs",
    tag = "HRM-Compat",
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_post_api_hrm_payroll_runs() {}

#[utoipa::path(
    delete,
    path = "/api/hrm/payroll-runs/{id}",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_delete_api_hrm_payroll_runs_id() {}

#[utoipa::path(
    get,
    path = "/api/hrm/payroll-runs/{id}",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_get_api_hrm_payroll_runs_id() {}

#[utoipa::path(
    put,
    path = "/api/hrm/payroll-runs/{id}/calculate",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_put_api_hrm_payroll_runs_id_calculate() {}

#[utoipa::path(
    put,
    path = "/api/hrm/payroll-runs/{id}/pay",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_put_api_hrm_payroll_runs_id_pay() {}

#[utoipa::path(
    get,
    path = "/api/hrm/performance-reviews",
    tag = "HRM-Compat",
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_get_api_hrm_performance_reviews() {}

#[utoipa::path(
    put,
    path = "/api/hrm/performance-reviews/{id}/approve",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_put_api_hrm_performance_reviews_id_approve() {}

#[utoipa::path(
    put,
    path = "/api/hrm/performance-reviews/{id}/submit",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_put_api_hrm_performance_reviews_id_submit() {}

#[utoipa::path(
    get,
    path = "/api/hrm/salary-adjustments",
    tag = "HRM-Compat",
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_get_api_hrm_salary_adjustments() {}

#[utoipa::path(
    post,
    path = "/api/hrm/salary-adjustments",
    tag = "HRM-Compat",
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_post_api_hrm_salary_adjustments() {}

#[utoipa::path(
    delete,
    path = "/api/hrm/salary-adjustments/{id}",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_delete_api_hrm_salary_adjustments_id() {}

#[utoipa::path(
    get,
    path = "/api/hrm/salary-adjustments/{id}",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_get_api_hrm_salary_adjustments_id() {}

#[utoipa::path(
    put,
    path = "/api/hrm/salary-adjustments/{id}",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_put_api_hrm_salary_adjustments_id() {}

#[utoipa::path(
    put,
    path = "/api/hrm/salary-adjustments/{id}/approve",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_put_api_hrm_salary_adjustments_id_approve() {}

#[utoipa::path(
    put,
    path = "/api/hrm/salary-adjustments/{id}/reject",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_put_api_hrm_salary_adjustments_id_reject() {}

#[utoipa::path(
    get,
    path = "/api/hrm/training-courses",
    tag = "HRM-Compat",
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_get_api_hrm_training_courses() {}

#[utoipa::path(
    post,
    path = "/api/hrm/training-courses",
    tag = "HRM-Compat",
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_post_api_hrm_training_courses() {}

#[utoipa::path(
    delete,
    path = "/api/hrm/training-courses/{id}",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_delete_api_hrm_training_courses_id() {}

#[utoipa::path(
    get,
    path = "/api/hrm/training-courses/{id}",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_get_api_hrm_training_courses_id() {}

#[utoipa::path(
    put,
    path = "/api/hrm/training-courses/{id}",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_put_api_hrm_training_courses_id() {}

#[utoipa::path(
    get,
    path = "/api/hrm/training-plans",
    tag = "HRM-Compat",
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_get_api_hrm_training_plans() {}

#[utoipa::path(
    post,
    path = "/api/hrm/training-plans",
    tag = "HRM-Compat",
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_post_api_hrm_training_plans() {}

#[utoipa::path(
    delete,
    path = "/api/hrm/training-plans/{id}",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_delete_api_hrm_training_plans_id() {}

#[utoipa::path(
    get,
    path = "/api/hrm/training-plans/{id}",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_get_api_hrm_training_plans_id() {}

#[utoipa::path(
    put,
    path = "/api/hrm/training-plans/{id}",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_put_api_hrm_training_plans_id() {}

#[utoipa::path(
    put,
    path = "/api/hrm/training-plans/{id}/activate",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_put_api_hrm_training_plans_id_activate() {}

#[utoipa::path(
    put,
    path = "/api/hrm/training-plans/{id}/deactivate",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_put_api_hrm_training_plans_id_deactivate() {}

#[utoipa::path(
    get,
    path = "/api/hrm/training-records",
    tag = "HRM-Compat",
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_get_api_hrm_training_records() {}

#[utoipa::path(
    post,
    path = "/api/hrm/training-records",
    tag = "HRM-Compat",
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_post_api_hrm_training_records() {}

#[utoipa::path(
    post,
    path = "/api/hrm/training-records/enroll",
    tag = "HRM-Compat",
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_post_api_hrm_training_records_enroll() {}

#[utoipa::path(
    delete,
    path = "/api/hrm/training-records/{id}",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_delete_api_hrm_training_records_id() {}

#[utoipa::path(
    get,
    path = "/api/hrm/training-records/{id}",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_get_api_hrm_training_records_id() {}

#[utoipa::path(
    put,
    path = "/api/hrm/training-records/{id}",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_put_api_hrm_training_records_id() {}

#[utoipa::path(
    put,
    path = "/api/hrm/training-records/{id}/complete",
    tag = "HRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_put_api_hrm_training_records_id_complete() {}

#[utoipa::path(
    get,
    path = "/api/hrm/{endpoint}",
    tag = "HRM-Compat",
    params(("endpoint" = String, Path, description = "endpoint")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_get_api_hrm_endpoint() {}

#[utoipa::path(
    delete,
    path = "/api/hrm/{endpoint}/{id}",
    tag = "HRM-Compat",
    params(("endpoint" = String, Path, description = "endpoint"), ("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_delete_api_hrm_endpoint_id() {}

#[utoipa::path(
    get,
    path = "/api/hrm/{endpoint}/{id}",
    tag = "HRM-Compat",
    params(("endpoint" = String, Path, description = "endpoint"), ("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_get_api_hrm_endpoint_id() {}

#[utoipa::path(
    put,
    path = "/api/hrm/{endpoint}/{id}",
    tag = "HRM-Compat",
    params(("endpoint" = String, Path, description = "endpoint"), ("id" = String, Path, description = "id")),
    responses((status = 200, description = "HRM compatibility endpoint"))
)]
pub async fn compat_put_api_hrm_endpoint_id() {}

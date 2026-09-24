use axum::{
    extract::{Extension, Query, State},
    routing::get,
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use super::ApiState;
use topems_shared_core::response::{api_error, ApiResponse};

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/reports/employee-summary", get(employee_summary))
        .route("/reports/department-summary", get(department_summary))
        .route("/reports/contract-summary", get(contract_summary))
        .route("/reports/training-summary", get(training_summary))
        .route("/reports/attendance-summary", get(attendance_summary))
        .route("/reports/payroll-summary", get(payroll_summary))
}

#[derive(Debug, Deserialize)]
pub struct ReportParams {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    #[allow(dead_code)]
    pub department_id: Option<Uuid>,
    pub time_range: Option<String>,
}

impl ReportParams {
    pub fn get_date_range(&self) -> (String, String) {
        if let Some(ref time_range) = self.time_range {
            let now = Utc::now();
            match time_range.as_str() {
                "week" => (
                    (now - chrono::Duration::days(7))
                        .format("%Y-%m-%d")
                        .to_string(),
                    now.format("%Y-%m-%d").to_string(),
                ),
                "month" => (
                    (now - chrono::Duration::days(30))
                        .format("%Y-%m-%d")
                        .to_string(),
                    now.format("%Y-%m-%d").to_string(),
                ),
                "quarter" => (
                    (now - chrono::Duration::days(90))
                        .format("%Y-%m-%d")
                        .to_string(),
                    now.format("%Y-%m-%d").to_string(),
                ),
                "year" => (
                    (now - chrono::Duration::days(365))
                        .format("%Y-%m-%d")
                        .to_string(),
                    now.format("%Y-%m-%d").to_string(),
                ),
                _ => (
                    (now - chrono::Duration::days(30))
                        .format("%Y-%m-%d")
                        .to_string(),
                    now.format("%Y-%m-%d").to_string(),
                ),
            }
        } else {
            (
                self.start_date.clone().unwrap_or_else(|| {
                    (Utc::now() - chrono::Duration::days(30))
                        .format("%Y-%m-%d")
                        .to_string()
                }),
                self.end_date
                    .clone()
                    .unwrap_or_else(|| Utc::now().format("%Y-%m-%d").to_string()),
            )
        }
    }
}

#[allow(dead_code)]
#[derive(Debug, Serialize)]
pub struct EmployeeSummaryResponse {
    pub total_employees: i64,
    pub active_employees: i64,
    pub inactive_employees: i64,
    pub male_count: i64,
    pub female_count: i64,
    pub avg_tenure_days: f64,
    pub new_hires_this_month: i64,
    pub terminations_this_month: i64,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["hrm:report:read"])),
    path = "/reports/employee-summary",
    responses((status = 200, description = "Employee summary")),
    tag = "reports"
)]
pub async fn employee_summary(
    State(_state): State<ApiState>,
    Query(params): Query<ReportParams>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let _start_date = params.start_date.clone();
    let _end_date = params.end_date.clone();

    let total_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "hrm",
        r#"SELECT COUNT(*) FROM hrm.employees"#
    ))
    .fetch_one(&mut **txn)
    .await;

    let active_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "hrm",
        r#"SELECT COUNT(*) FROM hrm.employees WHERE status = 'active'"#
    ))
    .fetch_one(&mut **txn)
    .await;

    let inactive_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "hrm",
        r#"SELECT COUNT(*) FROM hrm.employees WHERE status = 'inactive'"#
    ))
    .fetch_one(&mut **txn)
    .await;

    let male_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "hrm",
        r#"SELECT COUNT(*) FROM hrm.employees WHERE gender = 'male'"#
    ))
    .fetch_one(&mut **txn)
    .await;

    let female_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "hrm",
        r#"SELECT COUNT(*) FROM hrm.employees WHERE gender = 'female'"#
    ))
    .fetch_one(&mut **txn)
    .await;

    let tenure_result = sqlx::query_scalar::<_, Option<f64>>(only_own_schema_query!(
        "hrm",
        r#"
        SELECT AVG((CURRENT_DATE - hire_date)::DOUBLE PRECISION)
        FROM hrm.employees
        WHERE hire_date IS NOT NULL AND status = 'active'
        "#
    ))
    .fetch_one(&mut **txn)
    .await;

    let now = Utc::now();
    let current_month = now.format("%Y-%m").to_string();

    let new_hires_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "hrm",
        r#"
        SELECT COUNT(*) FROM hrm.employees 
        WHERE TO_CHAR(hire_date, 'YYYY-MM') = $1
        "#
    ))
    .bind(&current_month)
    .fetch_one(&mut **txn)
    .await;

    let terminations_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "hrm",
        r#"
        SELECT COUNT(*) FROM hrm.employees 
        WHERE status = 'inactive' 
        AND TO_CHAR(updated_at, 'YYYY-MM') = $1
        "#
    ))
    .bind(&current_month)
    .fetch_one(&mut **txn)
    .await;

    match (
        total_result,
        active_result,
        inactive_result,
        male_result,
        female_result,
        tenure_result,
        new_hires_result,
        terminations_result,
    ) {
        (
            Ok(total),
            Ok(active),
            Ok(inactive),
            Ok(male),
            Ok(female),
            Ok(avg_tenure),
            Ok(new_hires),
            Ok(terminations),
        ) => Json(ApiResponse::success(
            serde_json::json!({
                "total_employees": total,
                "active_employees": active,
                "inactive_employees": inactive,
                "male_count": male,
                "female_count": female,
                "avg_tenure_days": avg_tenure.unwrap_or(0.0).round(),
                "new_hires_this_month": new_hires,
                "terminations_this_month": terminations,
            }),
            "获取员工统计成功",
        )),
        _ => {
            tracing::error!("获取员工统计失败");
            Json(api_error(500, "获取员工统计失败"))
        }
    }
}

#[allow(dead_code)]
#[derive(Debug, Serialize)]
pub struct DepartmentSummaryResponse {
    pub department_id: Uuid,
    pub department_name: String,
    pub employee_count: i64,
    pub active_count: i64,
}

#[derive(Debug, sqlx::FromRow)]
struct DepartmentSummaryRow {
    department_id: Uuid,
    department_name: String,
    employee_count: Option<i64>,
    active_count: Option<i64>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["hrm:report:read"])),
    path = "/reports/department-summary",
    responses((status = 200, description = "Department summary")),
    tag = "reports"
)]
pub async fn department_summary(
    State(_state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query_as::<_, DepartmentSummaryRow>(only_own_schema_query!(
        "hrm",
        r#"
        SELECT 
            d.id as department_id,
            d.name as department_name,
            COUNT(e.id) as employee_count,
            SUM(CASE WHEN e.status = 'active' THEN 1 ELSE 0 END) as active_count
        FROM hrm.departments d
        LEFT JOIN hrm.employees e ON d.id = e.department_id
        GROUP BY d.id, d.name
        ORDER BY d.name
        "#
    ))
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(rows) => {
            let data: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|row| {
                    serde_json::json!({
                        "department_id": row.department_id,
                        "department_name": row.department_name,
                        "employee_count": row.employee_count.unwrap_or(0),
                        "active_count": row.active_count.unwrap_or(0),
                    })
                })
                .collect();

            Json(ApiResponse::success(
                serde_json::json!({ "departments": data }),
                "获取部门统计成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取部门统计失败: {}", e);
            Json(api_error(500, "获取部门统计失败"))
        }
    }
}

#[allow(dead_code)]
#[derive(Debug, Serialize)]
pub struct ContractSummaryResponse {
    pub total_contracts: i64,
    pub active_contracts: i64,
    pub expired_contracts: i64,
    pub expiring_this_month: i64,
    pub expiring_next_month: i64,
}

pub async fn contract_summary(
    State(_state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let now = Utc::now();
    let current_month = now.format("%Y-%m").to_string();
    let next_month = (now + chrono::Duration::days(30))
        .format("%Y-%m")
        .to_string();

    let total_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "hrm",
        r#"SELECT COUNT(*) FROM hrm.contracts"#
    ))
    .fetch_one(&mut **txn)
    .await;

    let active_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "hrm",
        r#"SELECT COUNT(*) FROM hrm.contracts WHERE end_date > CURRENT_DATE"#
    ))
    .fetch_one(&mut **txn)
    .await;

    let expired_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "hrm",
        r#"SELECT COUNT(*) FROM hrm.contracts WHERE end_date <= CURRENT_DATE"#
    ))
    .fetch_one(&mut **txn)
    .await;

    let expiring_this_month_result = sqlx::query_scalar::<_, i64>(
        only_own_schema_query!("hrm", r#"SELECT COUNT(*) FROM hrm.contracts WHERE TO_CHAR(end_date, 'YYYY-MM') = $1 AND end_date > CURRENT_DATE"#),
    )
    .bind(&current_month)
    .fetch_one(&mut **txn)
    .await;

    let expiring_next_month_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "hrm",
        r#"SELECT COUNT(*) FROM hrm.contracts WHERE TO_CHAR(end_date, 'YYYY-MM') = $1"#
    ))
    .bind(&next_month)
    .fetch_one(&mut **txn)
    .await;

    match (
        total_result,
        active_result,
        expired_result,
        expiring_this_month_result,
        expiring_next_month_result,
    ) {
        (Ok(total), Ok(active), Ok(expired), Ok(this_month), Ok(next_month)) => {
            Json(ApiResponse::success(
                serde_json::json!({
                    "total_contracts": total,
                    "active_contracts": active,
                    "expired_contracts": expired,
                    "expiring_this_month": this_month,
                    "expiring_next_month": next_month,
                }),
                "获取合同统计成功",
            ))
        }
        _ => {
            tracing::error!("获取合同统计失败");
            Json(api_error(500, "获取合同统计失败"))
        }
    }
}

#[allow(dead_code)]
#[derive(Debug, Serialize)]
pub struct TrainingSummaryResponse {
    pub total_plans: i64,
    pub active_plans: i64,
    pub total_courses: i64,
    pub completed_courses: i64,
    pub total_records: i64,
    pub completed_records: i64,
    pub avg_completion_rate: f64,
}

pub async fn training_summary(
    State(_state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let total_plans_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "hrm",
        r#"SELECT COUNT(*) FROM hrm.training_plans"#
    ))
    .fetch_one(&mut **txn)
    .await;

    let active_plans_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "hrm",
        r#"SELECT COUNT(*) FROM hrm.training_plans WHERE status = 'active'"#
    ))
    .fetch_one(&mut **txn)
    .await;

    let total_courses_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "hrm",
        r#"SELECT COUNT(*) FROM hrm.training_courses"#
    ))
    .fetch_one(&mut **txn)
    .await;

    let completed_courses_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "hrm",
        r#"SELECT COUNT(*) FROM hrm.training_courses WHERE status = 'completed'"#
    ))
    .fetch_one(&mut **txn)
    .await;

    let total_records_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "hrm",
        r#"SELECT COUNT(*) FROM hrm.training_records"#
    ))
    .fetch_one(&mut **txn)
    .await;

    let completed_records_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "hrm",
        r#"SELECT COUNT(*) FROM hrm.training_records WHERE status = 'completed'"#
    ))
    .fetch_one(&mut **txn)
    .await;

    match (
        total_plans_result,
        active_plans_result,
        total_courses_result,
        completed_courses_result,
        total_records_result,
        completed_records_result,
    ) {
        (
            Ok(total_plans),
            Ok(active_plans),
            Ok(total_courses),
            Ok(completed_courses),
            Ok(total_records),
            Ok(completed_records),
        ) => {
            let avg_completion_rate = if total_records > 0 {
                (completed_records as f64 / total_records as f64) * 100.0
            } else {
                0.0
            };

            Json(ApiResponse::success(
                serde_json::json!({
                    "total_plans": total_plans,
                    "active_plans": active_plans,
                    "total_courses": total_courses,
                    "completed_courses": completed_courses,
                    "total_records": total_records,
                    "completed_records": completed_records,
                    "avg_completion_rate": avg_completion_rate.round(),
                }),
                "获取培训统计成功",
            ))
        }
        _ => {
            tracing::error!("获取培训统计失败");
            Json(api_error(500, "获取培训统计失败"))
        }
    }
}

#[allow(dead_code)]
#[derive(Debug, Serialize)]
pub struct AttendanceSummaryResponse {
    pub total_records: i64,
    pub on_time_count: i64,
    pub late_count: i64,
    pub absent_count: i64,
    pub leave_count: i64,
    pub attendance_rate: f64,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["hrm:report:read"])),
    path = "/reports/attendance-summary",
    responses((status = 200, description = "Attendance summary")),
    tag = "reports"
)]
pub async fn attendance_summary(
    State(_state): State<ApiState>,
    Query(params): Query<ReportParams>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let (start_date, end_date) = params.get_date_range();

    let total_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "hrm",
        r#"SELECT COUNT(*) FROM hrm.attendance_records WHERE date BETWEEN $1::DATE AND $2::DATE"#
    ))
    .bind(&start_date)
    .bind(&end_date)
    .fetch_one(&mut **txn)
    .await;

    let on_time_result = sqlx::query_scalar::<_, i64>(
        only_own_schema_query!("hrm", r#"SELECT COUNT(*) FROM hrm.attendance_records WHERE date BETWEEN $1::DATE AND $2::DATE AND status = 'on_time'"#),
    )
    .bind(&start_date)
    .bind(&end_date)
    .fetch_one(&mut **txn)
    .await;

    let late_result = sqlx::query_scalar::<_, i64>(
        only_own_schema_query!("hrm", r#"SELECT COUNT(*) FROM hrm.attendance_records WHERE date BETWEEN $1::DATE AND $2::DATE AND status = 'late'"#),
    )
    .bind(&start_date)
    .bind(&end_date)
    .fetch_one(&mut **txn)
    .await;

    let absent_result = sqlx::query_scalar::<_, i64>(
        only_own_schema_query!("hrm", r#"SELECT COUNT(*) FROM hrm.attendance_records WHERE date BETWEEN $1::DATE AND $2::DATE AND status = 'absent'"#),
    )
    .bind(&start_date)
    .bind(&end_date)
    .fetch_one(&mut **txn)
    .await;

    let leave_result = sqlx::query_scalar::<_, i64>(
        only_own_schema_query!("hrm", r#"SELECT COUNT(*) FROM hrm.leave_records WHERE start_date <= $2::DATE AND end_date >= $1::DATE AND approval_status = 'approved'"#),
    )
    .bind(&start_date)
    .bind(&end_date)
    .fetch_one(&mut **txn)
    .await;

    match (
        total_result,
        on_time_result,
        late_result,
        absent_result,
        leave_result,
    ) {
        (Ok(total), Ok(on_time), Ok(late), Ok(absent), Ok(leave)) => {
            let attendance_rate = if total > 0 {
                ((total - absent) as f64 / total as f64) * 100.0
            } else {
                0.0
            };

            Json(ApiResponse::success(
                serde_json::json!({
                    "total_records": total,
                    "on_time_count": on_time,
                    "late_count": late,
                    "absent_count": absent,
                    "leave_count": leave,
                    "attendance_rate": attendance_rate.round(),
                    "start_date": start_date,
                    "end_date": end_date,
                }),
                "获取考勤统计成功",
            ))
        }
        _ => {
            tracing::error!("获取考勤统计失败");
            Json(api_error(500, "获取考勤统计失败"))
        }
    }
}

#[allow(dead_code)]
#[derive(Debug, Serialize)]
pub struct PayrollSummaryResponse {
    pub total_payroll: f64,
    pub avg_salary: f64,
    pub min_salary: f64,
    pub max_salary: f64,
    pub employee_count: i64,
    pub bonus_total: f64,
}

pub async fn payroll_summary(
    State(_state): State<ApiState>,
    Query(params): Query<ReportParams>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let _start_date = params.start_date.clone();
    let _end_date = params.end_date.clone();

    let total_payroll_result =
        sqlx::query_scalar::<_, Option<bigdecimal::BigDecimal>>(only_own_schema_query!(
            "hrm",
            r#"SELECT COALESCE(SUM(net_amount), 0) FROM hrm.payroll_items"#
        ))
        .fetch_one(&mut **txn)
        .await;

    let avg_salary_result =
        sqlx::query_scalar::<_, Option<bigdecimal::BigDecimal>>(only_own_schema_query!(
            "hrm",
            r#"SELECT COALESCE(AVG(salary), 0) FROM hrm.contracts WHERE status = 'active'"#
        ))
        .fetch_one(&mut **txn)
        .await;

    let min_salary_result = sqlx::query_scalar::<_, Option<bigdecimal::BigDecimal>>(
        only_own_schema_query!("hrm", r#"SELECT COALESCE(MIN(salary), 0) FROM hrm.contracts WHERE status = 'active' AND salary IS NOT NULL"#),
    )
    .fetch_one(&mut **txn)
    .await;

    let max_salary_result = sqlx::query_scalar::<_, Option<bigdecimal::BigDecimal>>(
        only_own_schema_query!("hrm", r#"SELECT COALESCE(MAX(salary), 0) FROM hrm.contracts WHERE status = 'active' AND salary IS NOT NULL"#),
    )
    .fetch_one(&mut **txn)
    .await;

    let employee_count_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "hrm",
        r#"SELECT COUNT(*) FROM hrm.employees WHERE status = 'active'"#
    ))
    .fetch_one(&mut **txn)
    .await;

    let bonus_total_result = sqlx::query_scalar::<_, Option<bigdecimal::BigDecimal>>(
        only_own_schema_query!("hrm", r#"SELECT COALESCE(SUM(CASE WHEN item_type = 'bonus' THEN amount ELSE 0 END), 0) FROM hrm.payroll_details"#),
    )
    .fetch_one(&mut **txn)
    .await;

    match (
        total_payroll_result,
        avg_salary_result,
        min_salary_result,
        max_salary_result,
        employee_count_result,
        bonus_total_result,
    ) {
        (
            Ok(total_payroll),
            Ok(avg_salary),
            Ok(min_salary),
            Ok(max_salary),
            Ok(employee_count),
            Ok(bonus_total),
        ) => Json(ApiResponse::success(
            serde_json::json!({
                "total_payroll": total_payroll,
                "avg_salary": avg_salary,
                "min_salary": min_salary,
                "max_salary": max_salary,
                "employee_count": employee_count,
                "bonus_total": bonus_total,
            }),
            "获取薪资统计成功",
        )),
        _ => {
            tracing::error!("获取薪资统计失败");
            Json(api_error(500, "获取薪资统计失败"))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_date_range_week() {
        let params = ReportParams {
            start_date: None,
            end_date: None,
            department_id: None,
            time_range: Some("week".to_string()),
        };
        let (start, end) = params.get_date_range();
        assert!(!start.is_empty());
        assert!(!end.is_empty());
        // end should be today
        let today = Utc::now().format("%Y-%m-%d").to_string();
        assert_eq!(end, today);
    }

    #[test]
    fn test_get_date_range_month() {
        let params = ReportParams {
            start_date: None,
            end_date: None,
            department_id: None,
            time_range: Some("month".to_string()),
        };
        let (start, end) = params.get_date_range();
        assert!(!start.is_empty());
        assert!(!end.is_empty());
        let today = Utc::now().format("%Y-%m-%d").to_string();
        assert_eq!(end, today);
    }

    #[test]
    fn test_get_date_range_quarter() {
        let params = ReportParams {
            start_date: None,
            end_date: None,
            department_id: None,
            time_range: Some("quarter".to_string()),
        };
        let (start, end) = params.get_date_range();
        assert!(!start.is_empty());
        assert!(!end.is_empty());
        let today = Utc::now().format("%Y-%m-%d").to_string();
        assert_eq!(end, today);
    }

    #[test]
    fn test_get_date_range_year() {
        let params = ReportParams {
            start_date: None,
            end_date: None,
            department_id: None,
            time_range: Some("year".to_string()),
        };
        let (start, end) = params.get_date_range();
        assert!(!start.is_empty());
        assert!(!end.is_empty());
        let today = Utc::now().format("%Y-%m-%d").to_string();
        assert_eq!(end, today);
    }

    #[test]
    fn test_get_date_range_unknown_time_range_defaults_to_month() {
        let params = ReportParams {
            start_date: None,
            end_date: None,
            department_id: None,
            time_range: Some("unknown".to_string()),
        };
        let (start, end) = params.get_date_range();
        assert!(!start.is_empty());
        assert!(!end.is_empty());
        let today = Utc::now().format("%Y-%m-%d").to_string();
        assert_eq!(end, today);
        // Should default to 30 days back (same as month)
        let expected_start = (Utc::now() - chrono::Duration::days(30))
            .format("%Y-%m-%d")
            .to_string();
        assert_eq!(start, expected_start);
    }

    #[test]
    fn test_get_date_range_explicit_dates() {
        let params = ReportParams {
            start_date: Some("2024-01-01".to_string()),
            end_date: Some("2024-06-30".to_string()),
            department_id: None,
            time_range: None,
        };
        let (start, end) = params.get_date_range();
        assert_eq!(start, "2024-01-01");
        assert_eq!(end, "2024-06-30");
    }

    #[test]
    fn test_get_date_range_no_time_range_no_dates_defaults() {
        let params = ReportParams {
            start_date: None,
            end_date: None,
            department_id: None,
            time_range: None,
        };
        let (start, end) = params.get_date_range();
        assert!(!start.is_empty());
        assert!(!end.is_empty());
        let today = Utc::now().format("%Y-%m-%d").to_string();
        assert_eq!(end, today);
        let expected_start = (Utc::now() - chrono::Duration::days(30))
            .format("%Y-%m-%d")
            .to_string();
        assert_eq!(start, expected_start);
    }

    #[test]
    fn test_get_date_range_partial_explicit_dates() {
        let params = ReportParams {
            start_date: Some("2024-03-15".to_string()),
            end_date: None,
            department_id: None,
            time_range: None,
        };
        let (start, end) = params.get_date_range();
        assert_eq!(start, "2024-03-15");
        let today = Utc::now().format("%Y-%m-%d").to_string();
        assert_eq!(end, today);
    }

    #[test]
    fn test_get_date_range_end_only() {
        let params = ReportParams {
            start_date: None,
            end_date: Some("2024-12-31".to_string()),
            department_id: None,
            time_range: None,
        };
        let (start, end) = params.get_date_range();
        assert_eq!(end, "2024-12-31");
        let expected_start = (Utc::now() - chrono::Duration::days(30))
            .format("%Y-%m-%d")
            .to_string();
        assert_eq!(start, expected_start);
    }

    #[test]
    fn test_get_date_range_week_differs_from_month() {
        let week_params = ReportParams {
            start_date: None,
            end_date: None,
            department_id: None,
            time_range: Some("week".to_string()),
        };
        let month_params = ReportParams {
            start_date: None,
            end_date: None,
            department_id: None,
            time_range: Some("month".to_string()),
        };
        let (week_start, _) = week_params.get_date_range();
        let (month_start, _) = month_params.get_date_range();
        assert_ne!(week_start, month_start);
    }

    #[test]
    fn test_get_date_range_year_differs_from_quarter() {
        let year_params = ReportParams {
            start_date: None,
            end_date: None,
            department_id: None,
            time_range: Some("year".to_string()),
        };
        let quarter_params = ReportParams {
            start_date: None,
            end_date: None,
            department_id: None,
            time_range: Some("quarter".to_string()),
        };
        let (year_start, _) = year_params.get_date_range();
        let (quarter_start, _) = quarter_params.get_date_range();
        assert_ne!(year_start, quarter_start);
    }

    #[test]
    fn test_create_routes() {
        let _router = create_routes();
    }

    #[test]
    fn test_report_params_debug() {
        let params = ReportParams {
            start_date: Some("2024-01-01".to_string()),
            end_date: None,
            department_id: None,
            time_range: Some("month".to_string()),
        };
        let debug = format!("{:?}", params);
        assert!(debug.contains("ReportParams"));
    }

    #[test]
    fn test_report_params_with_department_id() {
        let dept_id = Uuid::new_v4();
        let params = ReportParams {
            start_date: None,
            end_date: None,
            department_id: Some(dept_id),
            time_range: Some("week".to_string()),
        };
        let (start, end) = params.get_date_range();
        assert!(!start.is_empty());
        assert!(!end.is_empty());
    }

    #[test]
    fn test_employee_summary_response_fields() {
        let resp = EmployeeSummaryResponse {
            total_employees: 100,
            active_employees: 80,
            inactive_employees: 20,
            male_count: 60,
            female_count: 40,
            avg_tenure_days: 365.5,
            new_hires_this_month: 5,
            terminations_this_month: 2,
        };
        assert_eq!(resp.total_employees, 100);
        assert_eq!(resp.active_employees, 80);
        assert_eq!(resp.inactive_employees, 20);
    }

    #[test]
    fn test_department_summary_response_fields() {
        let resp = DepartmentSummaryResponse {
            department_id: Uuid::new_v4(),
            department_name: "Engineering".to_string(),
            employee_count: 50,
            active_count: 45,
        };
        assert_eq!(resp.department_name, "Engineering");
        assert_eq!(resp.employee_count, 50);
    }

    #[test]
    fn test_contract_summary_response_fields() {
        let resp = ContractSummaryResponse {
            total_contracts: 100,
            active_contracts: 80,
            expired_contracts: 15,
            expiring_this_month: 3,
            expiring_next_month: 2,
        };
        assert_eq!(resp.total_contracts, 100);
        assert_eq!(resp.active_contracts, 80);
    }

    #[test]
    fn test_training_summary_response_fields() {
        let resp = TrainingSummaryResponse {
            total_plans: 10,
            active_plans: 5,
            total_courses: 50,
            completed_courses: 30,
            total_records: 200,
            completed_records: 150,
            avg_completion_rate: 75.0,
        };
        assert_eq!(resp.total_plans, 10);
        assert_eq!(resp.avg_completion_rate, 75.0);
    }

    #[test]
    fn test_attendance_summary_response_fields() {
        let resp = AttendanceSummaryResponse {
            total_records: 1000,
            on_time_count: 800,
            late_count: 100,
            absent_count: 50,
            leave_count: 50,
            attendance_rate: 95.0,
        };
        assert_eq!(resp.total_records, 1000);
        assert_eq!(resp.attendance_rate, 95.0);
    }

    #[test]
    fn test_payroll_summary_response_fields() {
        let resp = PayrollSummaryResponse {
            total_payroll: 500000.0,
            avg_salary: 10000.0,
            min_salary: 5000.0,
            max_salary: 30000.0,
            employee_count: 50,
            bonus_total: 50000.0,
        };
        assert_eq!(resp.total_payroll, 500000.0);
        assert_eq!(resp.employee_count, 50);
    }
}

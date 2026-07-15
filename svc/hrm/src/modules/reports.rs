use axum::{
    extract::{Query, State},
    routing::get,
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::ApiState;
use topems_shared::{api_error, ApiResponse};

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route(
            "/api/core/hrm/reports/employee-summary",
            get(employee_summary),
        )
        .route(
            "/api/core/hrm/reports/department-summary",
            get(department_summary),
        )
        .route(
            "/api/core/hrm/reports/contract-summary",
            get(contract_summary),
        )
        .route(
            "/api/core/hrm/reports/training-summary",
            get(training_summary),
        )
        .route(
            "/api/core/hrm/reports/attendance-summary",
            get(attendance_summary),
        )
        .route(
            "/api/core/hrm/reports/payroll-summary",
            get(payroll_summary),
        )
}

#[derive(Debug, Deserialize)]
pub struct ReportParams {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    #[allow(dead_code)]
    pub department_id: Option<Uuid>,
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

async fn employee_summary(
    State(state): State<ApiState>,
    Query(params): Query<ReportParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let _start_date = params.start_date.clone();
    let _end_date = params.end_date.clone();

    let total_result = sqlx::query_scalar::<_, i64>(r#"SELECT COUNT(*) FROM hrm.employees"#)
        .fetch_one(&state.db)
        .await;

    let active_result = sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*) FROM hrm.employees WHERE status = 'active'"#,
    )
    .fetch_one(&state.db)
    .await;

    let inactive_result = sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*) FROM hrm.employees WHERE status = 'inactive'"#,
    )
    .fetch_one(&state.db)
    .await;

    let male_result =
        sqlx::query_scalar::<_, i64>(r#"SELECT COUNT(*) FROM hrm.employees WHERE gender = 'male'"#)
            .fetch_one(&state.db)
            .await;

    let female_result = sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*) FROM hrm.employees WHERE gender = 'female'"#,
    )
    .fetch_one(&state.db)
    .await;

    let tenure_result = sqlx::query_scalar::<_, f64>(
        r#"
        SELECT AVG(EXTRACT(DAY FROM CURRENT_DATE - hire_date)) 
        FROM hrm.employees 
        WHERE hire_date IS NOT NULL AND status = 'active'
        "#,
    )
    .fetch_one(&state.db)
    .await;

    let now = Utc::now();
    let current_month = now.format("%Y-%m").to_string();

    let new_hires_result = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*) FROM hrm.employees 
        WHERE TO_CHAR(hire_date, 'YYYY-MM') = $1
        "#,
    )
    .bind(&current_month)
    .fetch_one(&state.db)
    .await;

    let terminations_result = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*) FROM hrm.employees 
        WHERE status = 'inactive' 
        AND TO_CHAR(updated_at, 'YYYY-MM') = $1
        "#,
    )
    .bind(&current_month)
    .fetch_one(&state.db)
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
                "avg_tenure_days": avg_tenure.round(),
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

async fn department_summary(State(state): State<ApiState>) -> Json<ApiResponse<serde_json::Value>> {
    let result = sqlx::query_as::<_, DepartmentSummaryRow>(
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
        "#,
    )
    .fetch_all(&state.db)
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

async fn contract_summary(State(state): State<ApiState>) -> Json<ApiResponse<serde_json::Value>> {
    let now = Utc::now();
    let current_month = now.format("%Y-%m").to_string();
    let next_month = (now + chrono::Duration::days(30))
        .format("%Y-%m")
        .to_string();

    let total_result = sqlx::query_scalar::<_, i64>(r#"SELECT COUNT(*) FROM hrm.contracts"#)
        .fetch_one(&state.db)
        .await;

    let active_result = sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*) FROM hrm.contracts WHERE end_date > CURRENT_DATE"#,
    )
    .fetch_one(&state.db)
    .await;

    let expired_result = sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*) FROM hrm.contracts WHERE end_date <= CURRENT_DATE"#,
    )
    .fetch_one(&state.db)
    .await;

    let expiring_this_month_result = sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*) FROM hrm.contracts WHERE TO_CHAR(end_date, 'YYYY-MM') = $1 AND end_date > CURRENT_DATE"#,
    )
    .bind(&current_month)
    .fetch_one(&state.db)
    .await;

    let expiring_next_month_result = sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*) FROM hrm.contracts WHERE TO_CHAR(end_date, 'YYYY-MM') = $1"#,
    )
    .bind(&next_month)
    .fetch_one(&state.db)
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

async fn training_summary(State(state): State<ApiState>) -> Json<ApiResponse<serde_json::Value>> {
    let total_plans_result =
        sqlx::query_scalar::<_, i64>(r#"SELECT COUNT(*) FROM hrm.training_plans"#)
            .fetch_one(&state.db)
            .await;

    let active_plans_result = sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*) FROM hrm.training_plans WHERE status = 'active'"#,
    )
    .fetch_one(&state.db)
    .await;

    let total_courses_result =
        sqlx::query_scalar::<_, i64>(r#"SELECT COUNT(*) FROM hrm.training_courses"#)
            .fetch_one(&state.db)
            .await;

    let completed_courses_result = sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*) FROM hrm.training_courses WHERE status = 'completed'"#,
    )
    .fetch_one(&state.db)
    .await;

    let total_records_result =
        sqlx::query_scalar::<_, i64>(r#"SELECT COUNT(*) FROM hrm.training_records"#)
            .fetch_one(&state.db)
            .await;

    let completed_records_result = sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*) FROM hrm.training_records WHERE status = 'completed'"#,
    )
    .fetch_one(&state.db)
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

async fn attendance_summary(
    State(state): State<ApiState>,
    Query(params): Query<ReportParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let start_date = params.start_date.clone().unwrap_or_else(|| {
        (Utc::now() - chrono::Duration::days(30))
            .format("%Y-%m-%d")
            .to_string()
    });
    let end_date = params
        .end_date
        .clone()
        .unwrap_or_else(|| Utc::now().format("%Y-%m-%d").to_string());

    let total_result = sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*) FROM hrm.attendance_records WHERE date BETWEEN $1 AND $2"#,
    )
    .bind(&start_date)
    .bind(&end_date)
    .fetch_one(&state.db)
    .await;

    let on_time_result = sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*) FROM hrm.attendance_records WHERE date BETWEEN $1 AND $2 AND status = 'on_time'"#,
    )
    .bind(&start_date)
    .bind(&end_date)
    .fetch_one(&state.db)
    .await;

    let late_result = sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*) FROM hrm.attendance_records WHERE date BETWEEN $1 AND $2 AND status = 'late'"#,
    )
    .bind(&start_date)
    .bind(&end_date)
    .fetch_one(&state.db)
    .await;

    let absent_result = sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*) FROM hrm.attendance_records WHERE date BETWEEN $1 AND $2 AND status = 'absent'"#,
    )
    .bind(&start_date)
    .bind(&end_date)
    .fetch_one(&state.db)
    .await;

    let leave_result = sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*) FROM hrm.leave_requests WHERE start_date <= $2 AND end_date >= $1 AND status = 'approved'"#,
    )
    .bind(&start_date)
    .bind(&end_date)
    .fetch_one(&state.db)
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

async fn payroll_summary(
    State(state): State<ApiState>,
    Query(params): Query<ReportParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let _start_date = params.start_date.clone();
    let _end_date = params.end_date.clone();

    let total_payroll_result = sqlx::query_scalar::<_, Option<bigdecimal::BigDecimal>>(
        r#"SELECT COALESCE(SUM(net_amount), 0) FROM hrm.payroll_items"#,
    )
    .fetch_one(&state.db)
    .await;

    let avg_salary_result = sqlx::query_scalar::<_, Option<bigdecimal::BigDecimal>>(
        r#"SELECT COALESCE(AVG(salary), 0) FROM hrm.contracts WHERE status = 'active'"#,
    )
    .fetch_one(&state.db)
    .await;

    let min_salary_result = sqlx::query_scalar::<_, Option<bigdecimal::BigDecimal>>(
        r#"SELECT COALESCE(MIN(salary), 0) FROM hrm.contracts WHERE status = 'active' AND salary IS NOT NULL"#,
    )
    .fetch_one(&state.db)
    .await;

    let max_salary_result = sqlx::query_scalar::<_, Option<bigdecimal::BigDecimal>>(
        r#"SELECT COALESCE(MAX(salary), 0) FROM hrm.contracts WHERE status = 'active' AND salary IS NOT NULL"#,
    )
    .fetch_one(&state.db)
    .await;

    let employee_count_result = sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*) FROM hrm.employees WHERE status = 'active'"#,
    )
    .fetch_one(&state.db)
    .await;

    let bonus_total_result = sqlx::query_scalar::<_, Option<bigdecimal::BigDecimal>>(
        r#"SELECT COALESCE(SUM(CASE WHEN item_type = 'bonus' THEN amount ELSE 0 END), 0) FROM hrm.payroll_details"#,
    )
    .fetch_one(&state.db)
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

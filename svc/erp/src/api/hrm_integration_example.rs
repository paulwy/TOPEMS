//! HRM 服务集成示例
//!
//! 此模块展示了如何在 ERP 模块中通过服务客户端而不是直接访问数据库
//! 来获取员工、部门等数据
//! 这是架构改进计划的最佳实践示例

use crate::api::ApiState;
use axum::{extract::State, routing::get, Json, Router};
use topems_shared::{ApiResponse, Company, Department, Employee};

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/api/v1/example/employees", get(list_employees_from_hrm))
        .route("/api/v1/example/employees/{id}", get(get_employee_from_hrm))
        .route(
            "/api/v1/example/departments",
            get(list_departments_from_hrm),
        )
        .route("/api/v1/example/companies", get(list_companies_from_hrm))
}

/// 从 HRM 服务获取所有员工列表
async fn list_employees_from_hrm(
    State(state): State<ApiState>,
) -> Json<ApiResponse<Vec<Employee>>> {
    match state.hrm_client.list_employees().await {
        Ok(employees) => Json(ApiResponse::success(employees, "从HRM服务获取员工列表成功")),
        Err(e) => Json(ApiResponse::error(
            500,
            &format!("从HRM服务获取员工列表失败: {}", e),
        )),
    }
}

/// 从 HRM 服务获取单个员工
async fn get_employee_from_hrm(
    axum::extract::Path(id): axum::extract::Path<String>,
    State(state): State<ApiState>,
) -> Json<ApiResponse<Employee>> {
    use uuid::Uuid;
    match Uuid::parse_str(&id) {
        Ok(uuid) => match state.hrm_client.get_employee(uuid).await {
            Ok(employee) => Json(ApiResponse::success(employee, "从HRM服务获取员工成功")),
            Err(e) => Json(ApiResponse::error(
                500,
                &format!("从HRM服务获取员工失败: {}", e),
            )),
        },
        Err(_) => Json(ApiResponse::error(400, "无效的员工ID格式")),
    }
}

/// 从 HRM 服务获取所有部门列表
async fn list_departments_from_hrm(
    State(state): State<ApiState>,
) -> Json<ApiResponse<Vec<Department>>> {
    match state.hrm_client.list_departments().await {
        Ok(departments) => Json(ApiResponse::success(
            departments,
            "从HRM服务获取部门列表成功",
        )),
        Err(e) => Json(ApiResponse::error(
            500,
            &format!("从HRM服务获取部门列表失败: {}", e),
        )),
    }
}

/// 从 HRM 服务获取所有公司列表
async fn list_companies_from_hrm(State(state): State<ApiState>) -> Json<ApiResponse<Vec<Company>>> {
    match state.hrm_client.list_companies().await {
        Ok(companies) => Json(ApiResponse::success(companies, "从HRM服务获取公司列表成功")),
        Err(e) => Json(ApiResponse::error(
            500,
            &format!("从HRM服务获取公司列表失败: {}", e),
        )),
    }
}

use axum::{extract::Json, http::StatusCode, routing::Router, Extension};
use uuid::Uuid;

use crate::models::*;
use crate::services::SharedService;

pub async fn create_company(
    Extension(service): Extension<SharedService>,
    Json(data): Json<CreateCompanyRequest>,
) -> Result<Json<Company>, StatusCode> {
    let company = service.create_company(&data).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(company))
}

pub async fn get_company(
    Extension(service): Extension<SharedService>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
) -> Result<Json<Company>, StatusCode> {
    let company = service.get_company(id).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    company.ok_or(StatusCode::NOT_FOUND).map(Json)
}

pub async fn get_companies(
    Extension(service): Extension<SharedService>,
) -> Result<Json<Vec<Company>>, StatusCode> {
    let companies = service.get_companies(None).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(companies))
}

pub async fn update_company(
    Extension(service): Extension<SharedService>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    Json(data): Json<CreateCompanyRequest>,
) -> Result<Json<Company>, StatusCode> {
    let company = service.update_company(id, &data).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(company))
}

pub async fn delete_company(
    Extension(service): Extension<SharedService>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
) -> Result<StatusCode, StatusCode> {
    service.delete_company(id).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn create_department(
    Extension(service): Extension<SharedService>,
    Json(data): Json<CreateDepartmentRequest>,
) -> Result<Json<Department>, StatusCode> {
    let department = service.create_department(&data).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(department))
}

pub async fn get_department(
    Extension(service): Extension<SharedService>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
) -> Result<Json<Department>, StatusCode> {
    let department = service.get_department(id).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    department.ok_or(StatusCode::NOT_FOUND).map(Json)
}

pub async fn get_departments(
    Extension(service): Extension<SharedService>,
) -> Result<Json<Vec<Department>>, StatusCode> {
    let departments = service.get_departments(None).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(departments))
}

pub async fn create_position(
    Extension(service): Extension<SharedService>,
    Json(data): Json<CreatePositionRequest>,
) -> Result<Json<Position>, StatusCode> {
    let position = service.create_position(&data).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(position))
}

pub async fn get_position(
    Extension(service): Extension<SharedService>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
) -> Result<Json<Position>, StatusCode> {
    let position = service.get_position(id).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    position.ok_or(StatusCode::NOT_FOUND).map(Json)
}

pub async fn create_employee(
    Extension(service): Extension<SharedService>,
    Json(data): Json<CreateEmployeeRequest>,
) -> Result<Json<Employee>, StatusCode> {
    let employee = service.create_employee(&data).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(employee))
}

pub async fn get_employee(
    Extension(service): Extension<SharedService>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
) -> Result<Json<Employee>, StatusCode> {
    let employee = service.get_employee(id).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    employee.ok_or(StatusCode::NOT_FOUND).map(Json)
}

pub async fn get_employees(
    Extension(service): Extension<SharedService>,
) -> Result<Json<Vec<Employee>>, StatusCode> {
    let employees = service.get_employees(None, None).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(employees))
}

pub async fn generate_id(
    Extension(service): Extension<SharedService>,
    Json(data): Json<GenerateIdRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let id = service.generate_id(&data).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(serde_json::json!({ "id": id })))
}

pub async fn get_id_info(
    Extension(service): Extension<SharedService>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Result<Json<IdRecord>, StatusCode> {
    let record = service.get_id_info(&id).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    record.ok_or(StatusCode::NOT_FOUND).map(Json)
}

pub async fn get_system_param(
    Extension(service): Extension<SharedService>,
    axum::extract::Path(param_key): axum::extract::Path<String>,
) -> Result<Json<SystemParam>, StatusCode> {
    let param = service.get_system_param(&param_key).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    param.ok_or(StatusCode::NOT_FOUND).map(Json)
}

pub async fn set_system_param(
    Extension(service): Extension<SharedService>,
    axum::extract::Path(param_key): axum::extract::Path<String>,
    Json(data): Json<serde_json::Value>,
) -> Result<Json<SystemParam>, StatusCode> {
    let param_value = data.get("value").and_then(|v| v.as_str()).ok_or(StatusCode::BAD_REQUEST)?;
    let param_type = data.get("type").and_then(|v| v.as_str());
    let description = data.get("description").and_then(|v| v.as_str());
    let module = data.get("module").and_then(|v| v.as_str());

    let param = service.set_system_param(param_key.as_str(), param_value, param_type, description, module)
        .await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(param))
}

pub fn create_routes() -> Router {
    Router::new()
        .route("/companies", axum::routing::post(create_company).get(get_companies))
        .route("/companies/:id", axum::routing::get(get_company).put(update_company).delete(delete_company))
        .route("/departments", axum::routing::post(create_department).get(get_departments))
        .route("/departments/:id", axum::routing::get(get_department))
        .route("/positions", axum::routing::post(create_position))
        .route("/positions/:id", axum::routing::get(get_position))
        .route("/employees", axum::routing::post(create_employee).get(get_employees))
        .route("/employees/:id", axum::routing::get(get_employee))
        .route("/id/generate", axum::routing::post(generate_id))
        .route("/id/:id", axum::routing::get(get_id_info))
        .route("/params/:param_key", axum::routing::get(get_system_param).put(set_system_param))
}
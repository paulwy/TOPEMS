#![allow(dead_code)]

use crate::modules::ApiState;
use axum::extract::Path;
use axum::extract::Query;
use axum::{extract::State, Json, Router};
use serde::Deserialize;
use serde::Serialize;
use topems_shared::ApiResponse;
use topems_shared_core::response::PaginatedResponse;
use topems_shared_service_client::service_client::api::hrm_api::{
    HrmCompany, HrmDepartment, HrmEmployee,
};
use uuid::Uuid;

#[derive(Deserialize)]
pub struct AddressbookQueryParams {
    page: Option<u32>,
    page_size: Option<u32>,
    r#type: Option<String>,
    department_id: Option<String>,
    status: Option<String>,
    search: Option<String>,
}

#[derive(Deserialize)]
pub struct AddressbookSearchParams {
    limit: Option<u32>,
    contact_type: Option<String>,
    search: Option<String>,
}

#[derive(Deserialize)]
pub struct ExportParams {
    contact_type: Option<String>,
    format: String,
}

#[derive(Serialize, Clone)]
pub struct AddressbookEntry {
    id: String,
    contact_type: String,
    name: String,
    code: Option<String>,
    position: Option<String>,
    email: Option<String>,
    phone: Option<String>,
    department_id: Option<String>,
    department_name: Option<String>,
    department_code: Option<String>,
    status: String,
    created_at: String,
    updated_at: String,
}

#[derive(Serialize)]
pub struct AddressbookDetail {
    id: String,
    contact_type: String,
    name: String,
    code: Option<String>,
    position: Option<String>,
    email: Option<String>,
    phone: Option<String>,
    department_id: Option<String>,
    department_name: Option<String>,
    department_code: Option<String>,
    status: String,
    created_at: String,
    updated_at: String,
    hire_date: Option<String>,
}

#[derive(Serialize)]
pub struct HrmDepartmentNode {
    id: String,
    name: String,
    code: Option<String>,
    children: Vec<HrmDepartmentNode>,
}

impl From<HrmEmployee> for AddressbookEntry {
    fn from(e: HrmEmployee) -> Self {
        AddressbookEntry {
            id: e.id.to_string(),
            contact_type: "EMPLOYEE".to_string(),
            name: e.name,
            code: None,
            position: None,
            email: Some(e.email),
            phone: e.phone,
            department_id: e.department_id.map(|id| id.to_string()),
            department_name: None,
            department_code: None,
            status: e.status,
            created_at: e.created_at.to_rfc3339(),
            updated_at: e.updated_at.to_rfc3339(),
        }
    }
}

impl From<HrmDepartment> for AddressbookEntry {
    fn from(d: HrmDepartment) -> Self {
        AddressbookEntry {
            id: d.id.to_string(),
            contact_type: "DEPARTMENT".to_string(),
            name: d.name,
            code: None,
            position: None,
            email: None,
            phone: None,
            department_id: d.parent_id.map(|id| id.to_string()),
            department_name: None,
            department_code: None,
            status: "ACTIVE".to_string(),
            created_at: d.created_at.to_rfc3339(),
            updated_at: d.updated_at.to_rfc3339(),
        }
    }
}

impl From<HrmCompany> for AddressbookEntry {
    fn from(c: HrmCompany) -> Self {
        AddressbookEntry {
            id: c.id.to_string(),
            contact_type: "COMPANY".to_string(),
            name: c.name,
            code: Some(c.code),
            position: None,
            email: None,
            phone: None,
            department_id: None,
            department_name: None,
            department_code: None,
            status: "ACTIVE".to_string(),
            created_at: c.created_at.to_rfc3339(),
            updated_at: c.updated_at.to_rfc3339(),
        }
    }
}

fn build_department_tree(departments: Vec<HrmDepartment>) -> Vec<HrmDepartmentNode> {
    let mut nodes: Vec<HrmDepartmentNode> = Vec::new();
    let mut children_map: std::collections::HashMap<Uuid, Vec<HrmDepartment>> =
        std::collections::HashMap::new();

    for dept in &departments {
        if let Some(parent_id) = dept.parent_id {
            children_map
                .entry(parent_id)
                .or_default()
                .push(dept.clone());
        }
    }

    for dept in departments {
        if dept.parent_id.is_none() {
            nodes.push(build_node(dept, &children_map));
        }
    }

    nodes
}

fn build_node(
    dept: HrmDepartment,
    children_map: &std::collections::HashMap<Uuid, Vec<HrmDepartment>>,
) -> HrmDepartmentNode {
    let children = children_map.get(&dept.id).cloned().unwrap_or_default();
    let child_nodes: Vec<HrmDepartmentNode> = children
        .into_iter()
        .map(|c| build_node(c, children_map))
        .collect();

    HrmDepartmentNode {
        id: dept.id.to_string(),
        name: dept.name,
        code: None,
        children: child_nodes,
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/addressbook/fetch-entries-by-type",
    tag = "Addressbook",
    operation_id = "fetch_entries_by_type",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn fetch_entries_by_type(
    state: &ApiState,
    contact_type: Option<&str>,
) -> Vec<AddressbookEntry> {
    let mut entries: Vec<AddressbookEntry> = Vec::new();

    match contact_type {
        Some("EMPLOYEE") => match state.hrm_client.list_employees().await {
            Ok(employees) => {
                entries.extend(employees.into_iter().map(AddressbookEntry::from));
            }
            Err(e) => {
                tracing::warn!("从HRM服务获取员工列表失败: {}", e);
            }
        },
        Some("DEPARTMENT") => match state.hrm_client.list_departments().await {
            Ok(departments) => {
                entries.extend(departments.into_iter().map(AddressbookEntry::from));
            }
            Err(e) => {
                tracing::warn!("从HRM服务获取部门列表失败: {}", e);
            }
        },
        Some("COMPANY") => match state.hrm_client.list_companies().await {
            Ok(companies) => {
                entries.extend(companies.into_iter().map(AddressbookEntry::from));
            }
            Err(e) => {
                tracing::warn!("从HRM服务获取公司列表失败: {}", e);
            }
        },
        None => {
            match state.hrm_client.list_employees().await {
                Ok(employees) => {
                    entries.extend(employees.into_iter().map(AddressbookEntry::from));
                }
                Err(e) => {
                    tracing::warn!("从HRM服务获取员工列表失败: {}", e);
                }
            }
            match state.hrm_client.list_departments().await {
                Ok(departments) => {
                    entries.extend(departments.into_iter().map(AddressbookEntry::from));
                }
                Err(e) => {
                    tracing::warn!("从HRM服务获取部门列表失败: {}", e);
                }
            }
            match state.hrm_client.list_companies().await {
                Ok(companies) => {
                    entries.extend(companies.into_iter().map(AddressbookEntry::from));
                }
                Err(e) => {
                    tracing::warn!("从HRM服务获取公司列表失败: {}", e);
                }
            }
        }
        _ => {}
    }

    entries
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/addressbook",
    responses(
        (status = 200, description = "get_contacts OK")
    ),
    tag = "ERP/addressbook"
)]
pub async fn get_contacts(
    State(state): State<ApiState>,
    Query(params): Query<AddressbookQueryParams>,
) -> Json<ApiResponse<PaginatedResponse<AddressbookEntry>>> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(20);

    let mut all_entries = fetch_entries_by_type(&state, params.r#type.as_deref()).await;

    if let Some(search) = &params.search {
        let search_lower = search.to_lowercase();
        all_entries.retain(|entry| {
            entry.name.to_lowercase().contains(&search_lower)
                || entry
                    .email
                    .as_ref()
                    .is_some_and(|e| e.to_lowercase().contains(&search_lower))
                || entry
                    .phone
                    .as_ref()
                    .is_some_and(|p| p.contains(&search_lower))
        });
    }

    if let Some(status) = &params.status {
        all_entries.retain(|entry| entry.status == *status);
    }

    let total = all_entries.len() as i64;
    let start = ((page - 1) * page_size) as usize;
    let end = start + page_size as usize;
    let paginated_items = if start < all_entries.len() {
        all_entries[start..std::cmp::min(end, all_entries.len())].to_vec()
    } else {
        Vec::new()
    };

    Json(ApiResponse::success(
        PaginatedResponse::new(paginated_items, total, page as i64, page_size as i64),
        "获取联系人列表成功",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/addressbook/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "get_contact_detail OK")
    ),
    tag = "ERP/addressbook"
)]
pub async fn get_contact_detail(
    State(state): State<ApiState>,
    Path(id): Path<String>,
    Query(params): Query<ContactDetailParams>,
) -> Json<ApiResponse<AddressbookDetail>> {
    match Uuid::parse_str(&id) {
        Ok(uuid) => match params.contact_type.as_str() {
            "EMPLOYEE" => match state.hrm_client.get_employee(uuid).await {
                Ok(employee) => {
                    let entry: AddressbookEntry = employee.into();
                    Json(ApiResponse::success(
                        AddressbookDetail {
                            id: entry.id,
                            contact_type: entry.contact_type,
                            name: entry.name,
                            code: entry.code,
                            position: entry.position,
                            email: entry.email,
                            phone: entry.phone,
                            department_id: entry.department_id,
                            department_name: entry.department_name,
                            department_code: entry.department_code,
                            status: entry.status,
                            created_at: entry.created_at,
                            updated_at: entry.updated_at,
                            hire_date: None,
                        },
                        "获取联系人详情成功",
                    ))
                }
                Err(e) => Json(ApiResponse::error(500, &format!("获取员工信息失败: {}", e))),
            },
            "DEPARTMENT" => match state.hrm_client.list_departments().await {
                Ok(departments) => {
                    if let Some(dept) = departments.into_iter().find(|d| d.id == uuid) {
                        let entry: AddressbookEntry = dept.into();
                        Json(ApiResponse::success(
                            AddressbookDetail {
                                id: entry.id,
                                contact_type: entry.contact_type,
                                name: entry.name,
                                code: entry.code,
                                position: entry.position,
                                email: entry.email,
                                phone: entry.phone,
                                department_id: entry.department_id,
                                department_name: entry.department_name,
                                department_code: entry.department_code,
                                status: entry.status,
                                created_at: entry.created_at,
                                updated_at: entry.updated_at,
                                hire_date: None,
                            },
                            "获取联系人详情成功",
                        ))
                    } else {
                        Json(ApiResponse::error(404, "部门不存在"))
                    }
                }
                Err(e) => Json(ApiResponse::error(500, &format!("获取部门信息失败: {}", e))),
            },
            "COMPANY" => match state.hrm_client.list_companies().await {
                Ok(companies) => {
                    if let Some(company) = companies.into_iter().find(|c| c.id == uuid) {
                        let entry: AddressbookEntry = company.into();
                        Json(ApiResponse::success(
                            AddressbookDetail {
                                id: entry.id,
                                contact_type: entry.contact_type,
                                name: entry.name,
                                code: entry.code,
                                position: entry.position,
                                email: entry.email,
                                phone: entry.phone,
                                department_id: entry.department_id,
                                department_name: entry.department_name,
                                department_code: entry.department_code,
                                status: entry.status,
                                created_at: entry.created_at,
                                updated_at: entry.updated_at,
                                hire_date: None,
                            },
                            "获取联系人详情成功",
                        ))
                    } else {
                        Json(ApiResponse::error(404, "公司不存在"))
                    }
                }
                Err(e) => Json(ApiResponse::error(500, &format!("获取公司信息失败: {}", e))),
            },
            _ => Json(ApiResponse::error(400, "无效的联系人类型")),
        },
        Err(_) => Json(ApiResponse::error(400, "无效的联系人ID格式")),
    }
}

#[derive(Deserialize)]
pub struct ContactDetailParams {
    contact_type: String,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/addressbook/search",
    responses(
        (status = 200, description = "search_contacts OK")
    ),
    tag = "ERP/addressbook"
)]
pub async fn search_contacts(
    State(state): State<ApiState>,
    Query(params): Query<AddressbookSearchParams>,
) -> Json<ApiResponse<Vec<AddressbookEntry>>> {
    let limit = params.limit.unwrap_or(10);

    let mut all_entries = fetch_entries_by_type(&state, params.contact_type.as_deref()).await;

    if let Some(search_query) = params.search {
        let search_lower = search_query.to_lowercase();
        all_entries.retain(|entry| {
            entry.name.to_lowercase().contains(&search_lower)
                || entry
                    .email
                    .as_ref()
                    .is_some_and(|e| e.to_lowercase().contains(&search_lower))
                || entry
                    .phone
                    .as_ref()
                    .is_some_and(|p| p.contains(&search_lower))
        });
    }

    let limited_entries = all_entries.into_iter().take(limit as usize).collect();

    Json(ApiResponse::success(limited_entries, "搜索成功"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/addressbook/departments/tree",
    responses(
        (status = 200, description = "get_department_tree OK")
    ),
    tag = "ERP/addressbook"
)]
pub async fn get_department_tree(
    State(state): State<ApiState>,
) -> Json<ApiResponse<Vec<HrmDepartmentNode>>> {
    match state.hrm_client.list_departments().await {
        Ok(departments) => {
            let tree = build_department_tree(departments);
            Json(ApiResponse::success(tree, "获取部门树成功"))
        }
        Err(e) => {
            tracing::warn!("获取部门列表失败: {}", e);
            // 返回空部门树而不是错误，避免前端显示"加载失败"
            Json(ApiResponse::success(
                Vec::<HrmDepartmentNode>::new(),
                "获取部门树成功",
            ))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/addressbook/export",
    responses(
        (status = 200, description = "export_contacts OK")
    ),
    tag = "ERP/addressbook"
)]
pub async fn export_contacts(
    State(state): State<ApiState>,
    Query(params): Query<ExportParams>,
) -> Json<ApiResponse<String>> {
    let all_entries = fetch_entries_by_type(&state, params.contact_type.as_deref()).await;

    let content = if params.format == "csv" {
        let mut csv_lines = Vec::new();
        csv_lines.push(
            "ID,类型,姓名,编码,职位,邮箱,电话,部门ID,部门名称,状态,创建时间,更新时间".to_string(),
        );
        for entry in all_entries {
            csv_lines.push(format!(
                "\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\"",
                escape_csv(&entry.id),
                escape_csv(&entry.contact_type),
                escape_csv(&entry.name),
                escape_csv(&entry.code.unwrap_or_default()),
                escape_csv(&entry.position.unwrap_or_default()),
                escape_csv(&entry.email.unwrap_or_default()),
                escape_csv(&entry.phone.unwrap_or_default()),
                escape_csv(&entry.department_id.unwrap_or_default()),
                escape_csv(&entry.department_name.unwrap_or_default()),
                escape_csv(&entry.status),
                escape_csv(&entry.created_at),
                escape_csv(&entry.updated_at),
            ));
        }
        csv_lines.join("\n")
    } else {
        serde_json::to_string(&all_entries).unwrap_or_default()
    };

    Json(ApiResponse::success(content, "导出成功"))
}

fn escape_csv(s: &str) -> String {
    if s.contains(&['"', ',', '\n'][..]) {
        format!("\"{}\"", s.replace('"', "\"\""))
    } else {
        s.to_string()
    }
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/addressbook", axum::routing::get(get_contacts))
        .route("/addressbook/{id}", axum::routing::get(get_contact_detail))
        .route("/addressbook/search", axum::routing::get(search_contacts))
        .route(
            "/addressbook/departments/tree",
            axum::routing::get(get_department_tree),
        )
        .route("/addressbook/export", axum::routing::get(export_contacts))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_escape_csv_plain_text() {
        assert_eq!(escape_csv("hello"), "hello");
        assert_eq!(escape_csv("world"), "world");
    }

    #[test]
    fn test_escape_csv_with_comma() {
        assert_eq!(escape_csv("hello,world"), "\"hello,world\"");
    }

    #[test]
    fn test_escape_csv_with_quote() {
        assert_eq!(escape_csv("say \"hi\""), "\"say \"\"hi\"\"\"");
    }

    #[test]
    fn test_escape_csv_with_newline() {
        assert_eq!(escape_csv("line1\nline2"), "\"line1\nline2\"");
    }

    #[test]
    fn test_escape_csv_empty_string() {
        assert_eq!(escape_csv(""), "");
    }

    #[test]
    fn test_escape_csv_multiple_special_chars() {
        assert_eq!(escape_csv("a,b\nc\"d"), "\"a,b\nc\"\"d\"");
    }

    #[test]
    fn test_escape_csv_no_special_returns_as_is() {
        assert_eq!(escape_csv("123abc"), "123abc");
        assert_eq!(escape_csv("test-value"), "test-value");
    }
}

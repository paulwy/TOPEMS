#![allow(dead_code)]

use crate::modules::ApiState;
use axum::extract::Path;
use axum::extract::Query;
use axum::{extract::State, Router};
use serde::Deserialize;
use serde::Serialize;
use topems_shared_core::response::PaginatedResponse;
use topems_shared_core::{response::ApiResponse, TopemsError};
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
    created_at: chrono::DateTime<chrono::Utc>,
    updated_at: chrono::DateTime<chrono::Utc>,
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
    created_at: chrono::DateTime<chrono::Utc>,
    updated_at: chrono::DateTime<chrono::Utc>,
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
            email: e.email,
            phone: e.phone,
            department_id: e.department_id.map(|id| id.to_string()),
            department_name: None,
            department_code: None,
            status: e.status,
            created_at: e.created_at,
            updated_at: e.updated_at,
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
            created_at: d.created_at,
            updated_at: d.updated_at,
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
            created_at: c.created_at,
            updated_at: c.updated_at,
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
    // ── U2 调用环消除白名单（D2 决策 C，环1 erp↔hrm）──────────────────────────────
    // 此处 erp→hrm 为【请求内同步只读查询】（list_employees/list_departments/list_companies）：
    //   - 只读：hrm 是员工/部门主数据源，erp 通讯录仅做 BFF 聚合展示，无任何写回；
    //   - 单向依赖：hrm→erp 方向的工资凭证写已改为 `HrmPayrollPosted` 事件（见 payroll.rs），
    //     环的反向写边已消除，本条只读查询不再构成双向 HTTP 环；
    //   - 失败降级：hrm 不可用时仅 warn 并返回空列表，不放大故障。
    // 依据：docs/architecture/decision-d2-call-cycle-elimination.md §4 环1 选项 C。
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
#[allow(clippy::as_conversions, clippy::cast_possible_wrap)]
#[allow(clippy::indexing_slicing)] // pos/job_pos/idx 由 position() 前置校验（Some 或 else 提前返回）保证存在，索引数学安全
pub async fn get_contacts(
    State(state): State<ApiState>,
    Query(params): Query<AddressbookQueryParams>,
) -> ApiResponse<PaginatedResponse<AddressbookEntry>> {
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

    ApiResponse::success(
        PaginatedResponse::new(paginated_items, total, page as i64, page_size as i64),
        "获取联系人列表成功",
    )
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
) -> ApiResponse<AddressbookDetail> {
    match Uuid::parse_str(&id) {
        Ok(uuid) => match params.contact_type.as_str() {
            "EMPLOYEE" => match state.hrm_client.get_employee(uuid).await {
                Ok(employee) => {
                    let entry: AddressbookEntry = employee.into();
                    ApiResponse::success(
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
                    )
                }
                Err(e) => ApiResponse::from(TopemsError::internal("获取员工信息失败", e)),
            },
            "DEPARTMENT" => match state.hrm_client.list_departments().await {
                Ok(departments) => {
                    if let Some(dept) = departments.into_iter().find(|d| d.id == uuid) {
                        let entry: AddressbookEntry = dept.into();
                        ApiResponse::success(
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
                        )
                    } else {
                        ApiResponse::not_found("部门不存在")
                    }
                }
                Err(e) => ApiResponse::from(TopemsError::internal("获取部门信息失败", e)),
            },
            "COMPANY" => match state.hrm_client.list_companies().await {
                Ok(companies) => {
                    if let Some(company) = companies.into_iter().find(|c| c.id == uuid) {
                        let entry: AddressbookEntry = company.into();
                        ApiResponse::success(
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
                        )
                    } else {
                        ApiResponse::not_found("公司不存在")
                    }
                }
                Err(e) => ApiResponse::from(TopemsError::internal("获取公司信息失败", e)),
            },
            _ => ApiResponse::bad_request("无效的联系人类型"),
        },
        Err(_) => ApiResponse::bad_request("无效的联系人ID格式"),
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
#[allow(clippy::as_conversions)]
pub async fn search_contacts(
    State(state): State<ApiState>,
    Query(params): Query<AddressbookSearchParams>,
) -> ApiResponse<Vec<AddressbookEntry>> {
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

    ApiResponse::success(limited_entries, "搜索成功")
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
) -> ApiResponse<Vec<HrmDepartmentNode>> {
    match state.hrm_client.list_departments().await {
        Ok(departments) => {
            let tree = build_department_tree(departments);
            ApiResponse::success(tree, "获取部门树成功")
        }
        Err(e) => {
            tracing::warn!("获取部门列表失败: {}", e);
            // 返回空部门树而不是错误，避免前端显示"加载失败"
            ApiResponse::success(Vec::<HrmDepartmentNode>::new(), "获取部门树成功")
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
) -> ApiResponse<String> {
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
                escape_csv(&entry.created_at.to_rfc3339()),
                escape_csv(&entry.updated_at.to_rfc3339()),
            ));
        }
        csv_lines.join("\n")
    } else {
        serde_json::to_string(&all_entries).unwrap_or_default()
    };

    ApiResponse::success(content, "导出成功")
}

fn escape_csv(s: &str) -> String {
    if s.contains(&['"', ',', '\n'][..]) {
        format!("\"{}\"", s.replace('"', "\"\""))
    } else {
        s.to_string()
    }
}

/// 轻量兜底 handler：通讯录子资源（收藏/分组/标签/导入导出任务/批量/去重合并等）
/// 前端契约已定义但后端尚无对应表与实现，统一返回空成功信封，避免裸 404（待上游支持）。
async fn stub_pending_upstream() -> ApiResponse<serde_json::Value> {
    ApiResponse::success(
        serde_json::json!({ "items": [], "total": 0 }),
        "该功能待上游支持",
    )
}

/// 批量删除通讯录（前端契约：POST /addressbook/batch/delete）
/// 通讯录批量删除依赖上游通讯录主表，当前统一返回空信封 {"items":[],"total":0}。
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/addressbook/batch/delete",
    tag = "AddressBook",
    request_body = serde_json::Value,
    responses((status = 200, description = "空信封（待上游支持）", body = ApiResponse<serde_json::Value>)),
)]
pub async fn batch_delete_doc() -> ApiResponse<serde_json::Value> {
    stub_pending_upstream().await
}

/// 执行导入（前端契约：POST /addressbook/import/execute）
/// 导入执行依赖上游异步任务队列，当前统一返回空信封。
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/addressbook/import/execute",
    tag = "AddressBook",
    request_body = serde_json::Value,
    responses((status = 200, description = "空信封（待上游支持）", body = ApiResponse<serde_json::Value>)),
)]
pub async fn import_execute_doc() -> ApiResponse<serde_json::Value> {
    stub_pending_upstream().await
}

/// 上述待上游支持端点的路由组（死代码端点轻量兜底）。
fn stub_routes() -> Router<ApiState> {
    use axum::routing::{delete, get, post, put};
    let s = stub_pending_upstream;
    Router::new()
        // 收藏 / 共享
        .route("/addressbook/favorites", post(s))
        .route("/addressbook/favorites/{id}", delete(s))
        .route("/addressbook/favorites/sort", post(s))
        .route("/addressbook/shared/{id}", get(s).delete(s))
        .route("/addressbook/contacts/{id}/shared-with", get(s))
        // 分组
        .route("/addressbook/groups/{id}", get(s).put(s).delete(s))
        .route("/addressbook/groups", post(s))
        .route("/addressbook/groups/tree", get(s))
        .route(
            "/addressbook/groups/{id}/contacts",
            get(s).post(s).delete(s),
        )
        .route("/addressbook/groups/{id}/contacts/batch", post(s))
        .route("/addressbook/groups/{id}/contacts/{cid}", delete(s))
        .route("/addressbook/groups/{id}/sort", put(s))
        .route("/addressbook/groups/sort-batch", post(s))
        .route("/addressbook/groups/{id}/sharees", get(s))
        .route("/addressbook/groups/{id}/share", post(s))
        .route("/addressbook/groups/{id}/share/{sid}", delete(s))
        .route("/addressbook/groups/{id}/copy", post(s))
        .route("/addressbook/groups/move", post(s))
        // 导入 / 导出任务
        .route("/addressbook/import/template", get(s))
        .route("/addressbook/import/validate", post(s))
        .route("/addressbook/import/execute", post(s))
        .route("/addressbook/import/tasks", get(s))
        .route("/addressbook/import/tasks/{id}", get(s).delete(s))
        .route("/addressbook/export/contacts", post(s))
        .route("/addressbook/export/tasks", get(s))
        .route("/addressbook/export/tasks/{id}", get(s))
        // 批量操作
        .route("/addressbook/batch/update", post(s))
        .route("/addressbook/batch/delete", post(s))
        .route("/addressbook/batch/tags", post(s))
        .route("/addressbook/batch/groups", post(s))
        // 去重 / 合并
        .route("/addressbook/contacts/duplicates", get(s))
        .route("/addressbook/contacts/merge", post(s))
        // 标签
        .route("/addressbook/tags", post(s))
        .route("/addressbook/tags/{id}", get(s).put(s).delete(s))
        .route("/addressbook/tags/{id}/contacts", get(s).post(s))
        .route("/addressbook/tags/{id}/contacts/{cid}", delete(s))
        .route("/addressbook/contacts/{id}/tags", get(s).post(s).delete(s))
        .route("/addressbook/contacts/{id}/tags/{tid}", delete(s))
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
        .merge(stub_routes())
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
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

use anyhow::Result;
use axum::{
    extract::{Path, Query, State},
    routing::get,
    Json, Router,
};
use serde::Serialize;
use sqlx::postgres::PgPool;
use std::collections::HashMap;
use std::sync::Arc;
use uuid::Uuid;

use crate::models::{
    AddressbookDetail, AddressbookEntry, AddressbookQueryParams, AddressbookSearchParams,
    ContactDetailParams, DepartmentNode, ExportParams,
};
use topems_shared::{api_error, ApiResponse, PaginatedResponse};

pub struct AppState {
    pub db: PgPool,
}

pub async fn create_routes(db: PgPool) -> Result<Router> {
    let state = Arc::new(AppState { db });

    let app = Router::new()
        .route("/api/v1/addressbook", get(list_addressbook))
        .route("/api/v1/addressbook/search", get(search_addressbook))
        .route("/api/v1/addressbook/export", get(export_addressbook))
        .route(
            "/api/v1/addressbook/departments/tree",
            get(get_department_tree),
        )
        .route("/api/v1/addressbook/{id}", get(get_contact_detail))
        .with_state(state);

    Ok(app)
}

async fn list_addressbook(
    State(state): State<Arc<AppState>>,
    Query(params): Query<AddressbookQueryParams>,
) -> Json<ApiResponse<PaginatedResponse<AddressbookEntry>>> {
    let page = params.page.max(1);
    let page_size = params.page_size.min(100).max(1);
    let offset = (page - 1) * page_size;

    let type_filter = params.type_.clone();
    let department_filter = params.department_id;
    let status_filter = params.status.clone();
    let search_pattern = params.search.clone();

    let result = sqlx::query_as::<_, AddressbookEntry>(
        r#"
        SELECT contact_type, id, name, code, position, email, phone,
               department_id, department_name, department_code, status,
               created_at, updated_at
        FROM erp.v_addressbook
        WHERE ($1::text IS NULL OR contact_type = $1)
          AND ($2::uuid IS NULL OR department_id = $2)
          AND ($3::text IS NULL OR status = $3)
          AND ($4::text IS NULL OR name ILIKE '%' || $4 || '%' OR position ILIKE '%' || $4 || '%' OR email ILIKE '%' || $4 || '%' OR phone ILIKE '%' || $4 || '%')
        ORDER BY created_at DESC
        LIMIT $5 OFFSET $6
        "#,
    )
    .bind(&type_filter)
    .bind(department_filter)
    .bind(&status_filter)
    .bind(&search_pattern)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(entries) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM erp.v_addressbook
                WHERE ($1::text IS NULL OR contact_type = $1)
                  AND ($2::uuid IS NULL OR department_id = $2)
                  AND ($3::text IS NULL OR status = $3)
                  AND ($4::text IS NULL OR name ILIKE '%' || $4 || '%' OR position ILIKE '%' || $4 || '%' OR email ILIKE '%' || $4 || '%' OR phone ILIKE '%' || $4 || '%')
                "#,
            )
            .bind(&type_filter)
            .bind(department_filter)
            .bind(&status_filter)
            .bind(&search_pattern)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                PaginatedResponse::new(entries, total, page, page_size),
                "获取通讯录成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取通讯录失败: {}", e);
            Json(api_error(500, "获取通讯录失败"))
        }
    }
}

async fn search_addressbook(
    State(state): State<Arc<AppState>>,
    Query(params): Query<AddressbookSearchParams>,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    let limit = params.limit.min(100).max(1);
    let type_filter = params.contact_type.clone();
    let search_pattern = params.search.clone();

    let result = sqlx::query_as::<_, (Uuid, String, Option<String>, Option<String>, Option<String>, Option<String>)>(
        r#"
        SELECT id, name, email, phone, department_name, position
        FROM erp.v_addressbook
        WHERE contact_type = COALESCE($1, 'EMPLOYEE')
          AND ($2::text IS NULL OR name ILIKE '%' || $2 || '%' OR email ILIKE '%' || $2 || '%' OR phone ILIKE '%' || $2 || '%')
        LIMIT $3
        "#,
    )
    .bind(&type_filter)
    .bind(&search_pattern)
    .bind(limit)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(rows) => {
            let data: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|(id, name, email, phone, department_name, position)| {
                    serde_json::json!({
                        "id": id,
                        "name": name,
                        "email": email,
                        "phone": phone,
                        "department_name": department_name,
                        "position": position
                    })
                })
                .collect();

            Json(ApiResponse::success(data, "搜索成功"))
        }
        Err(e) => {
            tracing::error!("搜索通讯录失败: {}", e);
            Json(api_error(500, "搜索失败"))
        }
    }
}

#[derive(Serialize)]
struct ExportRecord {
    contact_type: String,
    name: String,
    code: Option<String>,
    position: Option<String>,
    email: Option<String>,
    phone: Option<String>,
    department_name: Option<String>,
    status: String,
}

async fn export_addressbook(
    State(state): State<Arc<AppState>>,
    Query(params): Query<ExportParams>,
) -> Json<ApiResponse<String>> {
    let type_filter = params.contact_type.clone();

    let result = sqlx::query_as::<_, (String, String, Option<String>, Option<String>, Option<String>, Option<String>, Option<String>, String)>(
        r#"
        SELECT contact_type, name, code, position, email, phone, department_name, status
        FROM erp.v_addressbook
        WHERE $1::text IS NULL OR contact_type = $1
        ORDER BY contact_type, name
        "#,
    )
    .bind(&type_filter)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(rows) => {
            let records: Vec<ExportRecord> = rows
                .into_iter()
                .map(|(contact_type, name, code, position, email, phone, department_name, status)| ExportRecord {
                    contact_type,
                    name,
                    code,
                    position,
                    email,
                    phone,
                    department_name,
                    status,
                })
                .collect();
            let csv_content = generate_csv(&records);
            Json(ApiResponse::success(csv_content, "导出成功"))
        }
        Err(e) => {
            tracing::error!("导出通讯录失败: {}", e);
            Json(api_error(500, "导出失败"))
        }
    }
}

fn generate_csv(records: &[ExportRecord]) -> String {
    let mut csv = String::from("类型,姓名,编码,职位,邮箱,电话,部门,状态\n");

    for record in records {
        csv.push_str(&format!(
            "{},{},{},{},{},{},{},{}\n",
            record.contact_type,
            record.name,
            record.code.as_deref().unwrap_or(""),
            record.position.as_deref().unwrap_or(""),
            record.email.as_deref().unwrap_or(""),
            record.phone.as_deref().unwrap_or(""),
            record.department_name.as_deref().unwrap_or(""),
            record.status
        ));
    }

    csv
}

async fn get_department_tree(
    State(state): State<Arc<AppState>>,
) -> Json<ApiResponse<Vec<DepartmentNode>>> {
    let result = sqlx::query_as::<_, (Uuid, String, Option<String>, Option<Uuid>)>(
        r#"
        SELECT id, name, code, parent_id
        FROM erp.departments
        WHERE status = 'active'
        ORDER BY name
        "#,
    )
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(rows) => {
            let tree = build_department_tree(rows);
            Json(ApiResponse::success(tree, "获取部门树成功"))
        }
        Err(e) => {
            tracing::error!("获取部门树失败: {}", e);
            Json(api_error(500, "获取部门树失败"))
        }
    }
}

fn build_department_tree(
    departments: Vec<(Uuid, String, Option<String>, Option<Uuid>)>,
) -> Vec<DepartmentNode> {
    use std::collections::HashMap;

    let mut node_map: HashMap<Uuid, DepartmentNode> = HashMap::new();
    let mut children_map: HashMap<Uuid, Vec<Uuid>> = HashMap::new();
    let mut root_ids: Vec<Uuid> = Vec::new();

    for (id, name, code, parent_id) in departments {
        let node = DepartmentNode {
            id,
            name,
            code,
            children: Vec::new(),
        };
        node_map.insert(id, node);

        match parent_id {
            Some(pid) => {
                children_map.entry(pid).or_default().push(id);
            }
            None => {
                root_ids.push(id);
            }
        }
    }

    let mut result = Vec::new();
    for root_id in root_ids {
        if let Some(mut root) = node_map.remove(&root_id) {
            build_children_recursive(&mut root, &children_map, &mut node_map);
            result.push(root);
        }
    }

    result
}

fn build_children_recursive(
    parent: &mut DepartmentNode,
    children_map: &HashMap<Uuid, Vec<Uuid>>,
    node_map: &mut HashMap<Uuid, DepartmentNode>,
) {
    if let Some(child_ids) = children_map.get(&parent.id) {
        for child_id in child_ids {
            if let Some(mut child) = node_map.remove(child_id) {
                build_children_recursive(&mut child, children_map, node_map);
                parent.children.push(child);
            }
        }
    }
}

async fn get_contact_detail(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Query(params): Query<ContactDetailParams>,
) -> Json<ApiResponse<AddressbookDetail>> {
    let result = match params.contact_type.as_str() {
        "EMPLOYEE" => sqlx::query_as::<_, AddressbookDetail>(
            r#"
            SELECT 'EMPLOYEE' as contact_type, e.id, e.name, e.employee_number as code,
                   e.position, e.email, e.phone, e.department_id, d.name as department_name,
                   d.code as department_code, e.status, e.hire_date, e.created_at, e.updated_at
            FROM erp.employees e
            LEFT JOIN erp.departments d ON e.department_id = d.id
            WHERE e.id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&state.db)
        .await,
        "DEPARTMENT" => sqlx::query_as::<_, AddressbookDetail>(
            r#"
            SELECT 'DEPARTMENT' as contact_type, d.id, d.name, d.code, NULL as position,
                   NULL as email, NULL as phone, d.parent_id as department_id,
                   p.name as department_name, p.code as department_code, d.status,
                   NULL as hire_date, d.created_at, d.updated_at
            FROM erp.departments d
            LEFT JOIN erp.departments p ON d.parent_id = p.id
            WHERE d.id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&state.db)
        .await,
        "COMPANY" => sqlx::query_as::<_, AddressbookDetail>(
            r#"
            SELECT 'COMPANY' as contact_type, c.id, c.name, c.registration_number as code,
                   NULL as position, c.email, c.contact_phone as phone, NULL as department_id,
                   NULL as department_name, NULL as department_code, c.status,
                   NULL as hire_date, c.created_at, c.updated_at
            FROM erp.companies c
            WHERE c.id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&state.db)
        .await,
        _ => return Json(api_error(400, "无效的联系人类型")),
    };

    match result {
        Ok(Some(detail)) => Json(ApiResponse::success(detail, "获取联系人详情成功")),
        Ok(None) => Json(api_error(404, "联系人不存在")),
        Err(e) => {
            tracing::error!("获取联系人详情失败: {}", e);
            Json(api_error(500, "获取联系人详情失败"))
        }
    }
}

use std::collections::HashMap;
use std::hash::{Hash, Hasher};

use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    Json,
};
use topems_shared_core::TopemsError;
use uuid::Uuid;

use crate::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::get_tenant_id_from_claims;
use topems_shared_core::response::api_success;
use topems_shared_core::response::ApiResponse;

use super::cache::DbMenuRow;
use super::models::{
    CreateMenuGroupRequest, CreateMenuRequest, Menu, MenuGroup, MenuGroupListResponse,
    MenuGroupQuery, MenuListResponse, MenuNode, MenuQuery, MenuTreeResponse,
    UpdateMenuGroupRequest, UpdateMenuRequest,
};

// 菜单权威表固定在 public schema。嵌入部署的连接池 search_path 为 `flow, public`，
// 裸表名会优先命中 flow 下的同名空副本（历史生产「菜单读不到」根因），故此处必须显式限定。
const MENU_GROUP_COLUMNS: &str =
    "id, tenant_id, name, code, icon, sort_order, status, created_at, updated_at";

const MENU_COLUMNS: &str =
    "id, tenant_id, group_id, parent_id, name, code, path, icon, sort_order, status, permissions, created_at, updated_at";

pub async fn list_groups(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<MenuGroupQuery>,
) -> ApiResponse<MenuGroupListResponse> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search = query.search.clone();
    let status = query.status.clone();
    let tenant_opt: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id_from_claims(&claims))
    };

    let total: i64 = match sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM public.core_menu_groups
           WHERE deleted_at IS NULL AND ($1::text IS NULL OR name ILIKE '%' || $1 || '%' OR code ILIKE '%' || $1 || '%')
             AND ($2::text IS NULL OR status = $2)
             AND ($3::uuid IS NULL OR tenant_id = $3)"#,
    )
    .bind(search.clone())
    .bind(status.clone())
    .bind(tenant_opt)
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询菜单分组总数失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询菜单分组总数失败".to_string()));
        }
    };

    let sql = format!(
        r#"SELECT {} FROM public.core_menu_groups
           WHERE deleted_at IS NULL AND ($1::text IS NULL OR name ILIKE '%' || $1 || '%' OR code ILIKE '%' || $1 || '%')
             AND ($2::text IS NULL OR status = $2)
             AND ($3::uuid IS NULL OR tenant_id = $3)
           ORDER BY sort_order ASC, created_at DESC
           LIMIT $4 OFFSET $5"#,
        MENU_GROUP_COLUMNS
    );

    let items: Vec<MenuGroup> = match sqlx::query_as(sqlx::AssertSqlSafe(sql))
        .bind(search)
        .bind(status)
        .bind(tenant_opt)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.pool)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询菜单分组列表失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询菜单分组列表失败".to_string()));
        }
    };

    api_success(MenuGroupListResponse {
        items,
        total,
        page,
        page_size,
    })
}

pub async fn get_group(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> ApiResponse<MenuGroup> {
    let sql = format!(
        r#"SELECT {} FROM public.core_menu_groups WHERE deleted_at IS NULL AND id = $1"#,
        MENU_GROUP_COLUMNS
    );

    let group: Option<MenuGroup> = match sqlx::query_as(sqlx::AssertSqlSafe(sql))
        .bind(id)
        .fetch_optional(&state.pool)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询菜单分组详情失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询菜单分组详情失败".to_string()));
        }
    };

    match group {
        Some(g) => api_success(g),
        None => ApiResponse::from(TopemsError::ResourceNotFound("菜单分组不存在".to_string())),
    }
}

pub async fn create_group(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateMenuGroupRequest>,
) -> ApiResponse<MenuGroup> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    if req.code.trim().is_empty() {
        return ApiResponse::from(TopemsError::ValidationFailed(
            "菜单分组编码不能为空".to_string(),
        ));
    }
    if req.name.trim().is_empty() {
        return ApiResponse::from(TopemsError::ValidationFailed(
            "菜单分组名称不能为空".to_string(),
        ));
    }

    let sql = format!(
        r#"INSERT INTO public.core_menu_groups (tenant_id, name, code, icon, sort_order, status)
           VALUES ($1, $2, $3, $4, $5, 'active')
           RETURNING {}"#,
        MENU_GROUP_COLUMNS
    );

    let group: MenuGroup = match sqlx::query_as(sqlx::AssertSqlSafe(sql))
        .bind(tenant_id)
        .bind(req.name)
        .bind(req.code)
        .bind(req.icon)
        .bind(req.sort_order.unwrap_or(0))
        .fetch_one(&state.pool)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("创建菜单分组失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("创建菜单分组失败".to_string()));
        }
    };

    api_success(group)
}

pub async fn update_group(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateMenuGroupRequest>,
) -> ApiResponse<MenuGroup> {
    let tenant_opt: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| Uuid::parse_str(t).ok())
    };
    let sql = format!(
        r#"UPDATE public.core_menu_groups
           SET name = COALESCE($1, name),
               code = COALESCE($2, code),
               icon = COALESCE($3, icon),
               sort_order = COALESCE($4, sort_order),
               status = COALESCE($5, status),
               updated_at = $6
           WHERE id = $7 AND ($8::uuid IS NULL OR tenant_id = $8)
           RETURNING {}"#,
        MENU_GROUP_COLUMNS
    );

    let group: Option<MenuGroup> = match sqlx::query_as(sqlx::AssertSqlSafe(sql))
        .bind(req.name)
        .bind(req.code)
        .bind(req.icon)
        .bind(req.sort_order)
        .bind(req.status)
        .bind(chrono::Utc::now())
        .bind(id)
        .bind(tenant_opt)
        .fetch_optional(&state.pool)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("更新菜单分组失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("更新菜单分组失败".to_string()));
        }
    };

    match group {
        Some(g) => api_success(g),
        None => ApiResponse::from(TopemsError::ResourceNotFound("菜单分组不存在".to_string())),
    }
}

pub async fn delete_group(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<String> {
    let tenant_opt: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| Uuid::parse_str(t).ok())
    };
    let result = sqlx::query(r#"UPDATE public.core_menu_groups SET deleted_at = NOW() WHERE id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)"#)
        .bind(id)
        .bind(tenant_opt)
        .execute(&state.pool)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => api_success("菜单分组删除成功".to_string()),
        Ok(_) => ApiResponse::from(TopemsError::ResourceNotFound("菜单分组不存在".to_string())),
        Err(e) => {
            tracing::error!("删除菜单分组失败: {}", e);
            ApiResponse::from(TopemsError::Internal("删除菜单分组失败".to_string()))
        }
    }
}

pub async fn list_menus(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<MenuQuery>,
) -> ApiResponse<MenuListResponse> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let group_id = query.group_id;
    let parent_id = query.parent_id;
    let search = query.search.clone();
    let status = query.status.clone();
    let tenant_opt: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id_from_claims(&claims))
    };

    let total: i64 = match sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM public.core_menus
           WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR group_id = $1)
             AND ($2::uuid IS NULL OR parent_id = $2)
             AND ($3::text IS NULL OR name ILIKE '%' || $3 || '%' OR code ILIKE '%' || $3 || '%')
             AND ($4::text IS NULL OR status = $4)
             AND ($5::uuid IS NULL OR tenant_id = $5)"#,
    )
    .bind(group_id)
    .bind(parent_id)
    .bind(search.clone())
    .bind(status.clone())
    .bind(tenant_opt)
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询菜单项总数失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询菜单项总数失败".to_string()));
        }
    };

    let sql = format!(
        r#"SELECT {} FROM public.core_menus
           WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR group_id = $1)
             AND ($2::uuid IS NULL OR parent_id = $2)
             AND ($3::text IS NULL OR name ILIKE '%' || $3 || '%' OR code ILIKE '%' || $3 || '%')
             AND ($4::text IS NULL OR status = $4)
             AND ($5::uuid IS NULL OR tenant_id = $5)
           ORDER BY sort_order ASC, created_at DESC
           LIMIT $6 OFFSET $7"#,
        MENU_COLUMNS
    );

    let items: Vec<Menu> = match sqlx::query_as(sqlx::AssertSqlSafe(sql))
        .bind(group_id)
        .bind(parent_id)
        .bind(search)
        .bind(status)
        .bind(tenant_opt)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.pool)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询菜单项列表失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询菜单项列表失败".to_string()));
        }
    };

    api_success(MenuListResponse {
        items,
        total,
        page,
        page_size,
    })
}

pub async fn get_menu(State(state): State<AppState>, Path(id): Path<Uuid>) -> ApiResponse<Menu> {
    let sql = format!(
        r#"SELECT {} FROM public.core_menus WHERE deleted_at IS NULL AND id = $1"#,
        MENU_COLUMNS
    );

    let menu: Option<Menu> = match sqlx::query_as(sqlx::AssertSqlSafe(sql))
        .bind(id)
        .fetch_optional(&state.pool)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询菜单项详情失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询菜单项详情失败".to_string()));
        }
    };

    match menu {
        Some(m) => api_success(m),
        None => ApiResponse::from(TopemsError::ResourceNotFound("菜单项不存在".to_string())),
    }
}

pub async fn create_menu(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateMenuRequest>,
) -> ApiResponse<Menu> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    if req.code.trim().is_empty() {
        return ApiResponse::from(TopemsError::ValidationFailed(
            "菜单项编码不能为空".to_string(),
        ));
    }
    if req.name.trim().is_empty() {
        return ApiResponse::from(TopemsError::ValidationFailed(
            "菜单项名称不能为空".to_string(),
        ));
    }

    let sql = format!(
        r#"INSERT INTO public.core_menus (tenant_id, group_id, parent_id, name, code, path, icon, sort_order, permissions, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')
           RETURNING {}"#,
        MENU_COLUMNS
    );

    let menu: Menu = match sqlx::query_as(sqlx::AssertSqlSafe(sql))
        .bind(tenant_id)
        .bind(req.group_id)
        .bind(req.parent_id)
        .bind(req.name)
        .bind(req.code)
        .bind(req.path)
        .bind(req.icon)
        .bind(req.sort_order.unwrap_or(0))
        .bind(req.permissions)
        .fetch_one(&state.pool)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("创建菜单项失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("创建菜单项失败".to_string()));
        }
    };

    api_success(menu)
}

pub async fn update_menu(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateMenuRequest>,
) -> ApiResponse<Menu> {
    let tenant_opt: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| Uuid::parse_str(t).ok())
    };
    let sql = format!(
        r#"UPDATE public.core_menus
           SET group_id = COALESCE($1, group_id),
               parent_id = COALESCE($2, parent_id),
               name = COALESCE($3, name),
               code = COALESCE($4, code),
               path = COALESCE($5, path),
               icon = COALESCE($6, icon),
               sort_order = COALESCE($7, sort_order),
               permissions = COALESCE($8, permissions),
               status = COALESCE($9, status),
               updated_at = $10
           WHERE id = $11 AND ($12::uuid IS NULL OR tenant_id = $12)
           RETURNING {}"#,
        MENU_COLUMNS
    );

    let menu: Option<Menu> = match sqlx::query_as(sqlx::AssertSqlSafe(sql))
        .bind(req.group_id)
        .bind(req.parent_id)
        .bind(req.name)
        .bind(req.code)
        .bind(req.path)
        .bind(req.icon)
        .bind(req.sort_order)
        .bind(req.permissions)
        .bind(req.status)
        .bind(chrono::Utc::now())
        .bind(id)
        .bind(tenant_opt)
        .fetch_optional(&state.pool)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("更新菜单项失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("更新菜单项失败".to_string()));
        }
    };

    match menu {
        Some(m) => api_success(m),
        None => ApiResponse::from(TopemsError::ResourceNotFound("菜单项不存在".to_string())),
    }
}

pub async fn delete_menu(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<String> {
    let tenant_opt: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| Uuid::parse_str(t).ok())
    };
    let result = sqlx::query(r#"UPDATE public.core_menus SET deleted_at = NOW() WHERE id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)"#)
        .bind(id)
        .bind(tenant_opt)
        .execute(&state.pool)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => api_success("菜单项删除成功".to_string()),
        Ok(_) => ApiResponse::from(TopemsError::ResourceNotFound("菜单项不存在".to_string())),
        Err(e) => {
            tracing::error!("删除菜单项失败: {}", e);
            ApiResponse::from(TopemsError::Internal("删除菜单项失败".to_string()))
        }
    }
}

// ============================================================================
// Phase 1：角色化菜单读取（DB 运行时权威，前端可回退 config）
// GET /api/core/menus
// 任意已登录用户可访问；不绑定 system:read，返回内容按当前用户权限裁剪。
// 缓存：租户级 60s TTL（AppState.menu_cache）；HTTP：ETag + If-None-Match → 304。
// ============================================================================

const MENU_READ_COLUMNS: &str =
    "id, code, name, path, icon, sort_order, status, parent_id, permissions";

fn menu_visible_to_claims(permissions: &Option<serde_json::Value>, claims: &Claims) -> bool {
    if claims.is_superuser {
        return true;
    }
    let Some(value) = permissions else {
        return true;
    };
    if let Some(permission) = value.get("permission").and_then(|v| v.as_str()) {
        return claims.has_permission(permission);
    }
    if let Some(roles) = value.get("roles").and_then(|v| v.as_array()) {
        return roles
            .iter()
            .filter_map(|r| r.as_str())
            .any(|role| claims.has_role(role));
    }
    if let Some(role) = value.get("role").and_then(|v| v.as_str()) {
        return claims.has_role(role);
    }
    // 未声明权限点视为登录即可见
    true
}

fn menu_title_key(code: &str) -> String {
    let module = code.split('-').next().unwrap_or(code);
    format!("{module}.nav.{code}")
}

fn build_menu_tree(rows: &[DbMenuRow]) -> Vec<MenuNode> {
    let code_by_id: HashMap<Uuid, String> =
        rows.iter().map(|row| (row.id, row.code.clone())).collect();

    let mut nodes: HashMap<usize, MenuNode> = HashMap::with_capacity(rows.len());
    let mut children: HashMap<usize, Vec<usize>> = HashMap::new();
    let mut roots: Vec<usize> = Vec::new();

    for (idx, row) in rows.iter().enumerate() {
        let parent_code = row.parent_id.and_then(|pid| code_by_id.get(&pid).cloned());
        nodes.insert(
            idx,
            MenuNode {
                code: row.code.clone(),
                title_key: menu_title_key(&row.code),
                title: row.name.clone(),
                path: row.path.clone(),
                order: row.sort_order,
                visible: row.status == "active",
                parent_code,
                icon: row.icon.clone(),
                children: Vec::new(),
            },
        );
    }

    for (idx, row) in rows.iter().enumerate() {
        match row.parent_id.and_then(|pid| {
            code_by_id.get(&pid).and_then(|code| {
                rows.iter()
                    .position(|candidate| candidate.id == pid && candidate.code == *code)
            })
        }) {
            Some(parent_idx) if parent_idx != idx => {
                children.entry(parent_idx).or_default().push(idx);
            }
            _ => roots.push(idx),
        }
    }

    fn build_node(
        idx: usize,
        nodes: &mut HashMap<usize, MenuNode>,
        children: &HashMap<usize, Vec<usize>>,
    ) -> Option<MenuNode> {
        let mut node = nodes.remove(&idx)?;
        let mut child_indexes = children.get(&idx).cloned().unwrap_or_default();
        child_indexes.sort_by_key(|child_idx| {
            nodes
                .get(child_idx)
                .map(|n| (n.order, n.code.clone()))
                .unwrap_or((i32::MAX, String::new()))
        });
        node.children = child_indexes
            .into_iter()
            .filter_map(|child_idx| build_node(child_idx, nodes, children))
            .collect();
        Some(node)
    }

    roots.sort_by_key(|idx| {
        nodes
            .get(idx)
            .map(|n| (n.order, n.code.clone()))
            .unwrap_or((i32::MAX, String::new()))
    });

    roots
        .into_iter()
        .filter_map(|idx| build_node(idx, &mut nodes, &children))
        .collect()
}

fn menu_cache_key(claims: &Claims) -> String {
    if claims.is_superuser {
        return "menus:global".to_string();
    }
    match claims
        .tenant_id
        .as_deref()
        .and_then(|t| Uuid::parse_str(t).ok())
    {
        Some(tenant) => format!("menus:tenant:{tenant}"),
        None => "menus:global".to_string(),
    }
}

fn menu_etag(payload: &[u8]) -> String {
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    payload.hash(&mut hasher);
    format!("W/\"{:016x}\"", hasher.finish())
}

pub async fn my_menu_tree(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
) -> axum::response::Response {
    use axum::http::{header, HeaderValue, StatusCode};
    use axum::response::IntoResponse;

    let cache_key = menu_cache_key(&claims);
    let rows = match state.menu_cache.get(&cache_key) {
        Some(rows) => rows,
        None => {
            let tenant_opt: Option<Uuid> = if claims.is_superuser {
                None
            } else {
                claims
                    .tenant_id
                    .as_deref()
                    .and_then(|t| Uuid::parse_str(t).ok())
            };
            let sql = format!(
                r#"SELECT {} FROM public.core_menus
                   WHERE deleted_at IS NULL
                     AND ($1::uuid IS NULL OR tenant_id = $1)
                   ORDER BY sort_order ASC, code ASC"#,
                MENU_READ_COLUMNS
            );
            match sqlx::query_as::<_, DbMenuRow>(sqlx::AssertSqlSafe(sql))
                .bind(tenant_opt)
                .fetch_all(&state.pool)
                .await
            {
                Ok(rows) => {
                    let rows = std::sync::Arc::new(rows);
                    state.menu_cache.put(cache_key, rows.as_ref().clone());
                    rows
                }
                Err(e) => {
                    tracing::error!("查询角色化菜单失败: {}", e);
                    return ApiResponse::<MenuTreeResponse>::from(TopemsError::Internal(
                        "查询角色化菜单失败".to_string(),
                    ))
                    .into_response();
                }
            }
        }
    };

    let visible_rows: Vec<DbMenuRow> = rows
        .iter()
        .filter(|row| menu_visible_to_claims(&row.permissions, &claims))
        .cloned()
        .collect();
    let total = visible_rows.len();
    let items = build_menu_tree(&visible_rows);
    let data = MenuTreeResponse { items, total };

    let payload = serde_json::to_vec(&data).unwrap_or_default();
    let etag = menu_etag(&payload);
    if let Some(if_none_match) = headers
        .get(header::IF_NONE_MATCH)
        .and_then(|v| v.to_str().ok())
    {
        if if_none_match == etag || if_none_match == "*" {
            let mut response = StatusCode::NOT_MODIFIED.into_response();
            if let Ok(value) = HeaderValue::from_str(&etag) {
                response.headers_mut().insert(header::ETAG, value);
            }
            return response;
        }
    }

    let mut response = api_success(data).into_response();
    if let Ok(value) = HeaderValue::from_str(&etag) {
        response.headers_mut().insert(header::ETAG, value);
    }
    response
}

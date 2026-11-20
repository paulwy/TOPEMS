//! 用户 ↔ 法人主体数据范围（company scopes）管理端点。
//!
//! 与 `/iam/users/{id}/roles` 的区别：角色/权限码回答「能执行什么动作」，
//! 主体范围回答「能看/能操作哪些法人主体」。两者并列，互不替代。
//!
//! 安全边界：租户管理员只能操作本租户；平台管理员可指定租户。未配置任何
//! scope 记录的用户在主体相关业务端点上会被拒绝（fail-closed）。

use crate::AppState;
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::Extension;
use axum::Json;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_db::scope::{Db, ScopedTxn};
use uuid::Uuid;

use super::tenant_scope::{self, IamScope, UserTarget};

const ACCESS_LEVELS: [&str; 3] = ["read", "write", "consolidate"];

#[derive(Debug, Deserialize)]
pub struct CompanyScopeQuery {
    pub tenant_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct CompanyScopeInput {
    pub company_id: Uuid,
    pub access_level: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCompanyScopesRequest {
    pub scopes: Vec<CompanyScopeInput>,
}

#[derive(Debug, Serialize, FromRow)]
struct CompanyScopeRow {
    company_id: Uuid,
    company_code: String,
    company_name: String,
    access_level: String,
}

fn bad_request(message: &str) -> (StatusCode, Json<serde_json::Value>) {
    (
        StatusCode::BAD_REQUEST,
        Json(topems_shared_core::response::error_value(400, message)),
    )
}

fn internal(message: String) -> (StatusCode, Json<serde_json::Value>) {
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(topems_shared_core::response::error_value(500, &message)),
    )
}

fn parse_user_id(user_id: &str) -> Result<Uuid, (StatusCode, Json<serde_json::Value>)> {
    Uuid::parse_str(user_id).map_err(|_| bad_request("无效的用户ID格式"))
}

/// 确定本次操作的目标租户。
///
/// - 租户管理员：固定本租户；显式传入其他租户一律 403，避免越界。
/// - 平台管理员：优先显式 `tenant_id`；否则按目标用户的在职租户归属推导，
///   多于一个时要求显式指定。
async fn resolve_tenant(
    db: &Db,
    scope: IamScope,
    user_id: Uuid,
    requested: Option<Uuid>,
) -> Result<Uuid, (StatusCode, Json<serde_json::Value>)> {
    match scope {
        IamScope::Tenant(tenant) => {
            if let Some(requested) = requested {
                if requested != tenant {
                    return Err(tenant_scope::forbidden("不能操作其他租户的主体范围"));
                }
            }
            Ok(tenant)
        }
        IamScope::Platform => {
            if let Some(tenant) = requested {
                return Ok(tenant);
            }
            // 平台模式需要按用户反查跨租户 membership：必须走系统通道，
            // 裸池在严格 RLS 下会得到 0 行（用户明明属于某租户却被判为“不属于任何租户”）。
            let mut txn = db
                .scope_read_system()
                .await
                .map_err(|e| internal(format!("打开系统读作用域失败: {}", e)))?;
            let tenants: Vec<Uuid> = sqlx::query_scalar(
                r#"
                SELECT DISTINCT tenant_id
                FROM public.core_tenant_users
                WHERE user_id = $1 AND status = 'active' AND deleted_at IS NULL
                "#,
            )
            .bind(user_id)
            .fetch_all(&mut txn)
            .await
            .map_err(|e| internal(format!("查询用户租户归属失败: {}", e)))?;
            txn.commit()
                .await
                .map_err(|e| internal(format!("提交系统读作用域失败: {}", e)))?;

            match tenants.as_slice() {
                [only] => Ok(*only),
                _ => Err(bad_request(
                    "无法确定目标租户：请显式传入 tenant_id（该用户不属于任何租户或属于多个租户）",
                )),
            }
        }
    }
}

async fn check_user(
    db: &Db,
    txn_arc: &RlsTxnCell,
    claims: &Claims,
    scope: IamScope,
    user_id: Uuid,
) -> Result<(), (StatusCode, Json<serde_json::Value>)> {
    match tenant_scope::check_user_target(db, txn_arc, scope, user_id, claims.is_superuser).await {
        Ok(UserTarget::Ok) => Ok(()),
        Ok(UserTarget::NotFound) => Err(tenant_scope::not_found_detail("用户不存在")),
        Ok(UserTarget::Superuser) => Err(tenant_scope::forbidden("无权修改超级管理员")),
        Err(e) => Err(internal(format!("查询用户失败: {}", e))),
    }
}

async fn list_scopes(
    scope: &mut ScopedTxn<'_>,
    tenant_id: Uuid,
    user_id: Uuid,
) -> Result<Vec<CompanyScopeRow>, sqlx::Error> {
    sqlx::query_as::<_, CompanyScopeRow>(only_own_schema_query!(
        "public",
        r#"
        SELECT s.company_id, c.code AS company_code, c.name AS company_name, s.access_level
        FROM public.core_user_company_scopes s
        INNER JOIN hrm.companies c
                ON c.id = s.company_id AND c.tenant_id = s.tenant_id
        WHERE s.tenant_id = $1 AND s.user_id = $2 AND c.deleted_at IS NULL
        ORDER BY c.code
        "#,
        "hrm"
    ))
    .bind(tenant_id)
    .bind(user_id)
    .fetch_all(&mut *scope)
    .await
}

/// GET /iam/users/{user_id}/company-scopes
#[utoipa::path(
    get,
    security(("BearerAuth" = ["unified-core:iam:user:read"])),
    path = "/iam/users/{user_id}/company-scopes",
    tag = "IAM-CompanyScopes",
    params(
        ("user_id" = String, Path, description = "用户 ID"),
        ("tenant_id" = Option<String>, Query, description = "平台管理员可指定租户"),
    ),
    responses(
        (status = 200, description = "用户主体范围列表"),
        (status = 400, description = "无效的用户ID格式或无法确定租户"),
        (status = 403, description = "无权限或缺少租户上下文"),
        (status = 404, description = "用户不存在"),
    )
)]
pub async fn get_user_company_scopes(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(user_id): Path<String>,
    Query(query): Query<CompanyScopeQuery>,
) -> (StatusCode, Json<serde_json::Value>) {
    let user_uuid = match parse_user_id(&user_id) {
        Ok(id) => id,
        Err(resp) => return resp,
    };

    let scope = match tenant_scope::iam_read_scope(&claims) {
        Ok(scope) => scope,
        Err(_) => return tenant_scope::forbidden("缺少租户上下文，无法查看主体范围"),
    };
    if let Err(resp) = check_user(&state.db, &txn_arc, &claims, scope, user_uuid).await {
        return resp;
    }

    let tenant_id = match resolve_tenant(&state.db, scope, user_uuid, query.tenant_id).await {
        Ok(t) => t,
        Err(resp) => return resp,
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return internal("数据库事务上下文缺失".to_string());
    };
    let mut read_scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return internal(format!("打开主体范围读作用域失败: {}", e)),
    };
    match list_scopes(&mut read_scope, tenant_id, user_uuid).await {
        Ok(scopes) => (
            StatusCode::OK,
            Json(serde_json::json!({
                "success": true,
                "code": 200,
                "message": "获取用户主体范围成功",
                "data": {
                    "user_id": user_uuid,
                    "tenant_id": tenant_id,
                    "scopes": scopes,
                }
            })),
        ),
        Err(e) => internal(format!("查询用户主体范围失败: {}", e)),
    }
}

/// PUT /iam/users/{user_id}/company-scopes
///
/// 全量替换该用户在本租户下的主体范围；`scopes: []` 表示清空（随后该用户在
/// 主体相关端点上按 fail-closed 处理）。
#[utoipa::path(
    put,
    security(("BearerAuth" = ["unified-core:iam:user:write"])),
    path = "/iam/users/{user_id}/company-scopes",
    tag = "IAM-CompanyScopes",
    params(
        ("user_id" = String, Path, description = "用户 ID"),
        ("tenant_id" = Option<String>, Query, description = "平台管理员可指定租户"),
    ),
    responses(
        (status = 200, description = "保存成功，返回最新主体范围"),
        (status = 400, description = "参数非法（access_level/重复公司/无法确定租户）"),
        (status = 403, description = "无权限或缺少租户上下文"),
        (status = 404, description = "用户或主体不存在"),
    )
)]
pub async fn update_user_company_scopes(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(user_id): Path<String>,
    Query(query): Query<CompanyScopeQuery>,
    Json(req): Json<UpdateCompanyScopesRequest>,
) -> (StatusCode, Json<serde_json::Value>) {
    let user_uuid = match parse_user_id(&user_id) {
        Ok(id) => id,
        Err(resp) => return resp,
    };

    let scope = match tenant_scope::iam_write_scope(&claims, "admin:iam:write") {
        Ok(scope) => scope,
        Err(_) => return tenant_scope::forbidden("缺少租户上下文，无法配置主体范围"),
    };
    if let Err(resp) = check_user(&state.db, &txn_arc, &claims, scope, user_uuid).await {
        return resp;
    }

    let tenant_id = match resolve_tenant(&state.db, scope, user_uuid, query.tenant_id).await {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return internal("数据库事务上下文缺失".to_string());
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return internal(format!("打开主体范围写作用域失败: {}", e)),
    };

    // 入参校验：access_level 取值 + 不允许重复 company_id。
    let mut seen = std::collections::HashSet::new();
    for item in &req.scopes {
        if !ACCESS_LEVELS.contains(&item.access_level.as_str()) {
            return bad_request(&format!(
                "非法 access_level：{}（可选 read/write/consolidate）",
                item.access_level
            ));
        }
        if !seen.insert(item.company_id) {
            return bad_request("同一公司不能重复配置主体范围");
        }
    }

    // 公司必须属于目标租户且未软删。
    for item in &req.scopes {
        let exists: Option<i64> = match sqlx::query_scalar(only_own_schema_query!(
            "public",
            "SELECT 1::bigint FROM hrm.companies WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL",
            "hrm"
        ))
        .bind(item.company_id)
        .bind(tenant_id)
        .fetch_optional(&mut scope)
        .await
        {
            Ok(v) => v,
            Err(e) => {
                tracing::error!("查询公司主体失败: {}", e);
                return internal(format!("查询公司主体失败: {}", e));
            }
        };
        if exists.is_none() {
            return tenant_scope::not_found_detail(&format!(
                "主体不存在：{} 不属于当前租户",
                item.company_id
            ));
        }
    }

    if let Err(e) = sqlx::query(
        "DELETE FROM public.core_user_company_scopes WHERE tenant_id = $1 AND user_id = $2",
    )
    .bind(tenant_id)
    .bind(user_uuid)
    .execute(&mut scope)
    .await
    {
        return internal(format!("清理旧主体范围失败: {}", e));
    }

    for item in &req.scopes {
        if let Err(e) = sqlx::query(
            r#"
            INSERT INTO public.core_user_company_scopes
                (tenant_id, user_id, company_id, access_level, created_by, updated_by)
            VALUES ($1, $2, $3, $4, $5, $5)
            "#,
        )
        .bind(tenant_id)
        .bind(user_uuid)
        .bind(item.company_id)
        .bind(&item.access_level)
        .bind(operator_uuid(&claims))
        .execute(&mut scope)
        .await
        {
            return internal(format!("写入主体范围失败: {}", e));
        }
    }

    match list_scopes(&mut scope, tenant_id, user_uuid).await {
        Ok(scopes) => (
            StatusCode::OK,
            Json(serde_json::json!({
                "success": true,
                "code": 200,
                "message": "保存用户主体范围成功",
                "data": {
                    "user_id": user_uuid,
                    "tenant_id": tenant_id,
                    "scopes": scopes,
                }
            })),
        ),
        Err(e) => internal(format!("查询用户主体范围失败: {}", e)),
    }
}

fn operator_uuid(claims: &Claims) -> Option<Uuid> {
    Uuid::parse_str(&claims.sub).ok()
}

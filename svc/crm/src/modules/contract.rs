use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::get,
    Json, Router,
};
use chrono::Utc;
use uuid::Uuid;

use super::ApiState;
use crate::models::{Contract, ContractQueryParams, CreateContractRequest, UpdateContractRequest};
use crate::modules::audit::{log_audit_event, AuditEventParams};
use crate::shared::permission::{check_permission, CrmPermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::locale::Locale;
use topems_shared_core::response::{api_error, ApiResponse};

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/contracts", get(list_contracts).post(create_contract))
        .route(
            "/contracts/{id}",
            get(get_contract)
                .put(update_contract)
                .delete(delete_contract),
        )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["crm:contract:read"])),
    path = "/contracts",
    tag = "contract",
    params(
        ("page" = Option<i64>, Query, description = "页码"),
        ("page_size" = Option<i64>, Query, description = "每页数量"),
        ("search" = Option<String>, Query, description = "按合同编号/标题搜索"),
        ("type" = Option<String>, Query, description = "合同类型过滤"),
        ("status" = Option<String>, Query, description = "状态过滤"),
    ),
    responses(
        (status = 200, description = "合同列表", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn list_contracts(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ContractQueryParams>,
    _headers: HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &CrmPermission::ContractRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();
    let type_filter = params.contract_type.clone();
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let _tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());

    let result = sqlx::query_as::<_, Contract>(
        r#"
        SELECT id, tenant_id, org_id, contract_no,
               CASE WHEN $7 = 'en' THEN COALESCE(title_en, title) ELSE title END AS title,
               customer_name, amount,
               status, sign_date, start_date, end_date, owner, type, remark,
               created_at, updated_at, deleted_at
        FROM crm.contracts
        WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1)
          AND ($2::text IS NULL OR contract_no ILIKE $2 OR title ILIKE $2)
          AND ($3::text IS NULL OR status = $3)
          AND ($4::text IS NULL OR type = $4)
        ORDER BY created_at DESC
        LIMIT $5 OFFSET $6
        "#,
    )
    .bind(tenant_opt)
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(&type_filter)
    .bind(page_size)
    .bind(offset)
    .bind(Locale::from_headers(&_headers).as_sql())
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(contracts) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM crm.contracts
                WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1)
                  AND ($2::text IS NULL OR contract_no ILIKE $2 OR title ILIKE $2)
                  AND ($3::text IS NULL OR status = $3)
                  AND ($4::text IS NULL OR type = $4)
                "#,
            )
            .bind(tenant_opt)
            .bind(&search_pattern)
            .bind(&status_filter)
            .bind(&type_filter)
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": contracts,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取合同列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取合同列表失败: {}", e);
            Json(api_error(500, "获取合同列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["crm:contract:write"])),
    path = "/contracts",
    tag = "contract",
    request_body = CreateContractRequest,
    responses(
        (status = 200, description = "合同创建成功", body = ApiResponse<Contract>),
        (status = 400, description = "请求参数错误"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn create_contract(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateContractRequest>,
) -> Json<ApiResponse<Contract>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &CrmPermission::ContractWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    if req.contract_no.trim().is_empty() || req.title.trim().is_empty() {
        return Json(api_error(400, "合同编号与标题不能为空"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());

    let result = sqlx::query_as::<_, Contract>(
        r#"
        INSERT INTO crm.contracts (
            id, tenant_id, contract_no, title, customer_name, amount,
            status, sign_date, start_date, end_date, owner, type, remark,
            created_at, updated_at, title_en
        ) VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 'draft'),
                  $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id, tenant_id, org_id, contract_no,
                  CASE WHEN $17 = 'en' THEN COALESCE(title_en, title) ELSE title END AS title,
                  customer_name, amount,
                  status, sign_date, start_date, end_date, owner, type, remark,
                  created_at, updated_at, deleted_at
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .bind(&req.contract_no)
    .bind(&req.title)
    .bind(&req.customer_name)
    .bind(req.amount)
    .bind(&req.status)
    .bind(req.sign_date)
    .bind(req.start_date)
    .bind(req.end_date)
    .bind(&req.owner)
    .bind(&req.contract_type)
    .bind(&req.remark)
    .bind(now)
    .bind(now)
    .bind(&req.title_en)
    .bind(Locale::from_headers(&headers).as_sql())
    .fetch_one(&mut **txn)
    .await;

    if result.is_ok() {
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("提交事务失败: {}", e);
                return Json(api_error(500, "合同创建失败"));
            }
        }
    }

    let (response, status_str, error_msg) = match &result {
        Ok(contract) => (
            Json(ApiResponse::success(contract.clone(), "合同创建成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("创建合同失败: {}", e);
            (
                Json(api_error(500, "合同创建失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(contract) = &result {
        serde_json::to_value(contract).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "create".to_string(),
            entity_type: "contract".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: request_data,
            response_details: response_data,
            status: status_str,
            error_message: error_msg,
        },
        &headers,
    )
    .await;

    response
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["crm:contract:read"])),
    path = "/contracts/{id}",
    tag = "contract",
    params(("id" = Uuid, Path, description = "合同ID")),
    responses(
        (status = 200, description = "合同详情", body = ApiResponse<Contract>),
        (status = 404, description = "合同不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_contract(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: HeaderMap,
) -> Json<ApiResponse<Contract>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &CrmPermission::ContractRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let _tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());

    let result = sqlx::query_as::<_, Contract>(
        r#"
        SELECT id, tenant_id, org_id, contract_no,
               CASE WHEN $3 = 'en' THEN COALESCE(title_en, title) ELSE title END AS title,
               customer_name, amount,
               status, sign_date, start_date, end_date, owner, type, remark,
               created_at, updated_at, deleted_at
        FROM crm.contracts WHERE deleted_at IS NULL AND id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)
        "#,
    )
    .bind(id)
    .bind(tenant_opt)
    .bind(Locale::from_headers(&_headers).as_sql())
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(contract)) => Json(ApiResponse::success(contract, "获取合同成功")),
        Ok(None) => Json(api_error(404, "合同不存在")),
        Err(e) => {
            tracing::error!("获取合同失败: {}", e);
            Json(api_error(500, "获取合同失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["crm:contract:write"])),
    path = "/contracts/{id}",
    tag = "contract",
    params(("id" = Uuid, Path, description = "合同ID")),
    request_body = UpdateContractRequest,
    responses(
        (status = 200, description = "合同更新成功", body = ApiResponse<Contract>),
        (status = 404, description = "合同不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn update_contract(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: HeaderMap,
    Json(req): Json<UpdateContractRequest>,
) -> Json<ApiResponse<Contract>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &CrmPermission::ContractWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());
    let now = Utc::now();

    let result = sqlx::query_as::<_, Contract>(
        r#"
        UPDATE crm.contracts SET
            contract_no   = COALESCE($3, contract_no),
            title         = COALESCE($4, title),
            customer_name = COALESCE($5, customer_name),
            amount        = COALESCE($6, amount),
            status        = COALESCE($7, status),
            sign_date     = COALESCE($8, sign_date),
            start_date    = COALESCE($9, start_date),
            end_date      = COALESCE($10, end_date),
            owner         = COALESCE($11, owner),
            type          = COALESCE($12, type),
            remark        = COALESCE($13, remark),
            updated_at    = $14,
            title_en      = COALESCE($15, title_en)
        WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2
        RETURNING id, tenant_id, org_id, contract_no,
                  CASE WHEN $16 = 'en' THEN COALESCE(title_en, title) ELSE title END AS title,
                  customer_name, amount,
                  status, sign_date, start_date, end_date, owner, type, remark,
                  created_at, updated_at, deleted_at
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .bind(&req.contract_no)
    .bind(&req.title)
    .bind(&req.customer_name)
    .bind(req.amount)
    .bind(&req.status)
    .bind(req.sign_date)
    .bind(req.start_date)
    .bind(req.end_date)
    .bind(&req.owner)
    .bind(&req.contract_type)
    .bind(&req.remark)
    .bind(now)
    .bind(&req.title_en)
    .bind(Locale::from_headers(&_headers).as_sql())
    .fetch_optional(&mut **txn)
    .await;

    if result.is_ok() {
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("提交事务失败: {}", e);
                return Json(api_error(500, "合同更新失败"));
            }
        }
    }

    match result {
        Ok(Some(contract)) => Json(ApiResponse::success(contract, "合同更新成功")),
        Ok(None) => Json(api_error(404, "合同不存在")),
        Err(e) => {
            tracing::error!("更新合同失败: {}", e);
            Json(api_error(500, "更新合同失败"))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["crm:contract:write"])),
    path = "/contracts/{id}",
    tag = "contract",
    params(("id" = Uuid, Path, description = "合同ID")),
    responses(
        (status = 200, description = "合同删除成功", body = ApiResponse<serde_json::Value>),
        (status = 404, description = "合同不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn delete_contract(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &CrmPermission::ContractWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());
    let now = Utc::now();

    let result = sqlx::query(
        r#"
        UPDATE crm.contracts SET deleted_at = $3, updated_at = $3
        WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .bind(now)
    .execute(&mut **txn)
    .await;

    if result.is_ok() {
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("提交事务失败: {}", e);
                return Json(api_error(500, "删除合同失败"));
            }
        }
    }

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            log_audit_event(
                &state.db,
                AuditEventParams {
                    action: "delete".to_string(),
                    entity_type: "contract".to_string(),
                    entity_id: Some(id),
                    entity_ids: None,
                    user_id: None,
                    user_name: None,
                    request_details: None,
                    response_details: None,
                    status: "success".to_string(),
                    error_message: None,
                },
                &headers,
            )
            .await;
            Json(ApiResponse::success(
                serde_json::json!({"deleted": true}),
                "合同删除成功",
            ))
        }
        Ok(_) => Json(api_error(404, "合同不存在")),
        Err(e) => {
            tracing::error!("删除合同失败: {}", e);
            Json(api_error(500, "删除合同失败"))
        }
    }
}

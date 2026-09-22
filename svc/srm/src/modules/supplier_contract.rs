use anyhow::Result;
use axum::{
    extract::{Extension, Path, Query, State},
    routing::get,
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use sqlx::postgres::PgPool;
use std::sync::Arc;
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use crate::models::{
    ContractTerm, CreateSupplierContractRequest, SupplierContract, UpdateSupplierContractRequest,
};
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

#[derive(Debug, Deserialize)]
pub struct ContractQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub supplier_id: Option<String>,
    pub contract_type: Option<String>,
}

pub struct AppState {
    pub db: PgPool,
}

pub async fn create_routes(db: PgPool) -> Result<Router> {
    let state = Arc::new(AppState { db });

    let app = Router::new()
        .route(
            "/supplier-contracts",
            get(list_contracts).post(create_contract),
        )
        .route(
            "/supplier-contracts/{id}",
            get(get_contract)
                .put(update_contract)
                .delete(delete_contract),
        )
        .route("/supplier-contracts/{id}/terms", get(get_contract_terms))
        .with_state(state);

    Ok(app)
}

// ==================== Contract Handlers ====================

pub async fn list_contracts(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ContractQueryParams>,
    _headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::ContractRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let _tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();
    let supplier_id_filter = params
        .supplier_id
        .clone()
        .and_then(|s| Uuid::parse_str(&s).ok());
    let contract_type_filter = params.contract_type.clone();

    let result = sqlx::query_as::<_, SupplierContract>(
        only_own_schema_query!("srm", r#"
        SELECT id, tenant_id, contract_no, supplier_id, supplier_name, title, contract_type, total_amount, currency, sign_date, start_date, end_date, status, remarks, created_by, created_at, updated_at
        FROM srm.supplier_contracts
        WHERE ($1::uuid IS NULL OR tenant_id = $1)
          AND ($2::text IS NULL OR title ILIKE $2 OR contract_no ILIKE $2)
          AND ($3::text IS NULL OR status = $3)
          AND ($4::uuid IS NULL OR supplier_id = $4)
          AND ($5::text IS NULL OR contract_type = $5)
        ORDER BY created_at DESC
        LIMIT $6 OFFSET $7
        "#, "srm"),
    )
    .bind(tenant_opt)
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(supplier_id_filter)
    .bind(&contract_type_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(contracts) => {
            let count_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "srm",
                r#"
                SELECT COUNT(*) FROM srm.supplier_contracts
                WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1)
                  AND ($2::text IS NULL OR title ILIKE $2 OR contract_no ILIKE $2)
                  AND ($3::text IS NULL OR status = $3)
                  AND ($4::uuid IS NULL OR supplier_id = $4)
                  AND ($5::text IS NULL OR contract_type = $5)
                "#,
                "srm"
            ))
            .bind(tenant_opt)
            .bind(&search_pattern)
            .bind(&status_filter)
            .bind(supplier_id_filter)
            .bind(&contract_type_filter)
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "contracts": contracts,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取供应商合同列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取供应商合同列表失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(
                500,
                "获取供应商合同列表失败",
            ))
        }
    }
}

pub async fn create_contract(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    _headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CreateSupplierContractRequest>,
) -> Json<ApiResponse<SupplierContract>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::ContractWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });

    if req.contract_no.is_empty() || req.title.is_empty() {
        return Json(ApiResponse::<SupplierContract>::error(
            400,
            "合同编号和标题不能为空",
        ));
    }

    let supplier_id = match Uuid::parse_str(&req.supplier_id) {
        Ok(uuid) => uuid,
        Err(_) => {
            return Json(ApiResponse::<SupplierContract>::error(
                400,
                "供应商ID格式错误",
            ));
        }
    };

    let supplier_exists = sqlx::query_scalar::<_, i64>(
        only_own_schema_query!("srm", "SELECT COUNT(*) FROM srm.suppliers WHERE ($1::uuid IS NULL OR ($1::uuid IS NULL OR tenant_id = $1)) AND id = $2 AND status != 'deleted'", "srm"),
    )
    .bind(tenant_opt)
    .bind(supplier_id)
    .fetch_one(&mut **txn)
    .await;

    if supplier_exists.unwrap_or(0) == 0 {
        return Json(ApiResponse::<SupplierContract>::error(
            400,
            "供应商不存在或已删除",
        ));
    }

    let existing = sqlx::query_scalar::<_, i64>(
        only_own_schema_query!("srm", "SELECT COUNT(*) FROM srm.supplier_contracts WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR ($1::uuid IS NULL OR tenant_id = $1)) AND contract_no = $2", "srm"),
    )
    .bind(tenant_opt)
    .bind(&req.contract_no)
    .fetch_one(&mut **txn)
    .await;

    if existing.unwrap_or(0) > 0 {
        return Json(ApiResponse::<SupplierContract>::error(
            400,
            "合同编号已存在",
        ));
    }

    if let Some(amount) = req.total_amount {
        if amount < 0.0 {
            return Json(ApiResponse::<SupplierContract>::error(
                400,
                "合同金额不能为负数",
            ));
        }
    }

    let sign_date = req.sign_date.as_ref().and_then(|s| {
        chrono::DateTime::parse_from_rfc3339(s)
            .ok()
            .map(|d| d.with_timezone(&Utc))
    });

    let start_date = req.start_date.as_ref().and_then(|s| {
        chrono::DateTime::parse_from_rfc3339(s)
            .ok()
            .map(|d| d.with_timezone(&Utc))
    });

    let end_date = req.end_date.as_ref().and_then(|s| {
        chrono::DateTime::parse_from_rfc3339(s)
            .ok()
            .map(|d| d.with_timezone(&Utc))
    });

    if let (Some(start), Some(end)) = (start_date, end_date) {
        if start > end {
            return Json(ApiResponse::<SupplierContract>::error(
                400,
                "合同开始日期不能晚于结束日期",
            ));
        }
    }

    let id = Uuid::new_v4();
    let now = Utc::now();
    let user_id = Uuid::parse_str(&claims.sub).ok();

    let result = sqlx::query_as::<_, SupplierContract>(
        only_own_schema_query!("srm", r#"
        INSERT INTO srm.supplier_contracts (id, tenant_id, contract_no, supplier_id, supplier_name, title, contract_type, total_amount, currency, sign_date, start_date, end_date, status, remarks, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING id, tenant_id, contract_no, supplier_id, supplier_name, title, contract_type, total_amount, currency, sign_date, start_date, end_date, status, remarks, created_by, created_at, updated_at
        "#, "srm"),
    )
    .bind(id)
    .bind(tenant_id)
    .bind(&req.contract_no)
    .bind(supplier_id)
    .bind(&req.supplier_name)
    .bind(&req.title)
    .bind(&req.contract_type)
    .bind(req.total_amount)
    .bind(&req.currency)
    .bind(sign_date)
    .bind(start_date)
    .bind(end_date)
    .bind(&req.status)
    .bind(&req.remarks)
    .bind(user_id)
    .bind(now)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(contract) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return Json(ApiResponse::error(500, "提交事务失败"));
                }
            }
            Json(ApiResponse::success(contract, "供应商合同创建成功"))
        }
        Err(e) => {
            tracing::error!("创建供应商合同失败: {}", e);
            Json(ApiResponse::<SupplierContract>::error(
                500,
                "供应商合同创建失败",
            ))
        }
    }
}

pub async fn get_contract(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<SupplierContract>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::ContractRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let _tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });

    let result = sqlx::query_as::<_, SupplierContract>(
        only_own_schema_query!("srm", r#"
        SELECT id, tenant_id, contract_no, supplier_id, supplier_name, title, contract_type, total_amount, currency, sign_date, start_date, end_date, status, remarks, created_by, created_at, updated_at
        FROM srm.supplier_contracts WHERE id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)
        "#, "srm"),
    )
    .bind(id)
    .bind(tenant_opt)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(contract)) => Json(ApiResponse::success(contract, "获取供应商合同成功")),
        Ok(None) => Json(ApiResponse::<SupplierContract>::error(
            404,
            "供应商合同不存在",
        )),
        Err(e) => {
            tracing::error!("获取供应商合同失败: {}", e);
            Json(ApiResponse::<SupplierContract>::error(
                500,
                "获取供应商合同失败",
            ))
        }
    }
}

pub async fn update_contract(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<UpdateSupplierContractRequest>,
) -> Json<ApiResponse<SupplierContract>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::ContractWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });

    let existing = sqlx::query_as::<_, SupplierContract>(
        only_own_schema_query!("srm", "SELECT id, tenant_id, contract_no, supplier_id, supplier_name, title, contract_type, total_amount, currency, sign_date, start_date, end_date, status, remarks, created_by, created_at, updated_at FROM srm.supplier_contracts WHERE deleted_at IS NULL AND id = $1 AND ($2::uuid IS NULL OR ($2::uuid IS NULL OR tenant_id = $2))", "srm"),
    )
    .bind(id)
    .bind(tenant_opt)
    .fetch_optional(&mut **txn)
    .await;

    let existing = match existing {
        Ok(Some(c)) => c,
        Ok(None) => {
            return Json(ApiResponse::<SupplierContract>::error(
                404,
                "供应商合同不存在",
            ))
        }
        Err(e) => {
            return Json(ApiResponse::<SupplierContract>::error(
                500,
                &format!("查询供应商合同失败: {}", e),
            ))
        }
    };

    let supplier_id = if let Some(supplier_id_str) = &req.supplier_id {
        let supplier_uuid_val = match Uuid::parse_str(supplier_id_str) {
            Ok(uuid) => uuid,
            Err(_) => {
                return Json(ApiResponse::<SupplierContract>::error(
                    400,
                    "供应商ID格式错误",
                ));
            }
        };

        let supplier_exists = sqlx::query_scalar::<_, i64>(
            only_own_schema_query!("srm", "SELECT COUNT(*) FROM srm.suppliers WHERE ($1::uuid IS NULL OR ($1::uuid IS NULL OR tenant_id = $1)) AND id = $2 AND status != 'deleted'", "srm"),
        )
        .bind(tenant_opt)
        .bind(supplier_uuid_val)
        .fetch_one(&mut **txn)
        .await;

        if supplier_exists.unwrap_or(0) == 0 {
            return Json(ApiResponse::<SupplierContract>::error(
                400,
                "供应商不存在或已删除",
            ));
        }

        supplier_uuid_val
    } else {
        existing.supplier_id
    };

    if let Some(amount) = req.total_amount {
        if amount < 0.0 {
            return Json(ApiResponse::<SupplierContract>::error(
                400,
                "合同金额不能为负数",
            ));
        }
    }

    let sign_date = req.sign_date.or(existing.sign_date);
    let start_date = req.start_date.or(existing.start_date);
    let end_date = req.end_date.or(existing.end_date);

    if let (Some(start), Some(end)) = (start_date, end_date) {
        if start > end {
            return Json(ApiResponse::<SupplierContract>::error(
                400,
                "合同开始日期不能晚于结束日期",
            ));
        }
    }

    let contract_no = req.contract_no.unwrap_or(existing.contract_no);
    let supplier_name = req.supplier_name.or(existing.supplier_name);
    let title = req.title.unwrap_or(existing.title);
    let contract_type = req.contract_type.unwrap_or(existing.contract_type);
    let total_amount = req.total_amount.or(existing.total_amount);
    let currency = req.currency.unwrap_or(existing.currency);
    let status = req.status.unwrap_or(existing.status);
    let remarks = req.remarks.or(existing.remarks);
    let now = Utc::now();

    let result = sqlx::query_as::<_, SupplierContract>(
        only_own_schema_query!("srm", r#"
        UPDATE srm.supplier_contracts SET
            contract_no = $2, supplier_id = $3, supplier_name = $4, title = $5, contract_type = $6, total_amount = $7, currency = $8, sign_date = $9, start_date = $10, end_date = $11, status = $12, remarks = $13, updated_at = $14
        WHERE id = $1 AND tenant_id = $15
        RETURNING id, tenant_id, contract_no, supplier_id, supplier_name, title, contract_type, total_amount, currency, sign_date, start_date, end_date, status, remarks, created_by, created_at, updated_at
        "#, "srm"),
    )
    .bind(id)
    .bind(contract_no)
    .bind(supplier_id)
    .bind(supplier_name)
    .bind(title)
    .bind(contract_type)
    .bind(total_amount)
    .bind(currency)
    .bind(sign_date)
    .bind(start_date)
    .bind(end_date)
    .bind(status)
    .bind(remarks)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(contract) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return Json(ApiResponse::error(500, "提交事务失败"));
                }
            }
            Json(ApiResponse::success(contract, "供应商合同更新成功"))
        }
        Err(e) => {
            tracing::error!("更新供应商合同失败: {}", e);
            Json(ApiResponse::<SupplierContract>::error(
                500,
                "供应商合同更新失败",
            ))
        }
    }
}

pub async fn delete_contract(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<String>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::ContractWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });

    let result = sqlx::query(only_own_schema_query!(
        "srm",
        "UPDATE srm.supplier_contracts SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2",
        "srm"
    ))
    .bind(id)
    .bind(tenant_id)
    .execute(&mut **txn)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            Json(ApiResponse::success("".to_string(), "供应商合同删除成功"))
        }
        Ok(_) => Json(ApiResponse::<String>::error(404, "供应商合同不存在")),
        Err(e) => {
            tracing::error!("删除供应商合同失败: {}", e);
            Json(ApiResponse::<String>::error(500, "供应商合同删除失败"))
        }
    }
}

// ==================== Contract Terms Handler ====================

pub async fn get_contract_terms(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<Vec<ContractTerm>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::ContractRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let _tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });

    let contract_exists = sqlx::query_scalar::<_, i64>(
        only_own_schema_query!("srm", "SELECT COUNT(*) FROM srm.supplier_contracts WHERE deleted_at IS NULL AND id = $1 AND ($2::uuid IS NULL OR ($2::uuid IS NULL OR tenant_id = $2))", "srm"),
    )
    .bind(id)
    .bind(tenant_opt)
    .fetch_one(&mut **txn)
    .await;

    if contract_exists.unwrap_or(0) == 0 {
        return Json(ApiResponse::<Vec<ContractTerm>>::error(404, "合同不存在"));
    }

    let result = sqlx::query_as::<_, ContractTerm>(
        only_own_schema_query!("srm", r#"
        SELECT id, tenant_id, contract_id, term_type, title, content, sort_order, created_at, updated_at
        FROM srm.contract_terms
        WHERE contract_id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)
        ORDER BY sort_order
        "#, "srm"),
    )
    .bind(id)
    .bind(tenant_opt)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(terms) => Json(ApiResponse::success(terms, "获取合同条款成功")),
        Err(e) => {
            tracing::error!("获取合同条款失败: {}", e);
            Json(ApiResponse::<Vec<ContractTerm>>::error(
                500,
                "获取合同条款失败",
            ))
        }
    }
}

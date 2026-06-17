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
use uuid::Uuid;

use crate::models::{
    ContractTerm, CreateSupplierContractRequest, SupplierContract, UpdateSupplierContractRequest,
};
use crate::services::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::ApiResponse;

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
            "/api/srm/supplier-contracts",
            get(list_contracts).post(create_contract),
        )
        .route(
            "/api/srm/supplier-contracts/{id}",
            get(get_contract)
                .put(update_contract)
                .delete(delete_contract),
        )
        .route(
            "/api/srm/supplier-contracts/{id}/terms",
            get(get_contract_terms),
        )
        .with_state(state);

    Ok(app)
}

// ==================== Contract Handlers ====================

async fn list_contracts(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ContractQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::ContractRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();
    let supplier_id_filter = params
        .supplier_id
        .clone()
        .and_then(|s| Uuid::parse_str(&s).ok());
    let contract_type_filter = params.contract_type.clone();

    let result = sqlx::query_as::<_, SupplierContract>(
        r#"
        SELECT id, contract_no, supplier_id, supplier_name, title, contract_type, total_amount, currency, sign_date, start_date, end_date, status, remarks, created_by, created_at, updated_at
        FROM srm.supplier_contracts
        WHERE ($1::text IS NULL OR title ILIKE $1 OR contract_no ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
          AND ($3::uuid IS NULL OR supplier_id = $3)
          AND ($4::text IS NULL OR contract_type = $4)
        ORDER BY created_at DESC
        LIMIT $5 OFFSET $6
        "#,
    )
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(supplier_id_filter)
    .bind(&contract_type_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(contracts) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM srm.supplier_contracts
                WHERE ($1::text IS NULL OR title ILIKE $1 OR contract_no ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND ($3::uuid IS NULL OR supplier_id = $3)
                  AND ($4::text IS NULL OR contract_type = $4)
                "#,
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .bind(supplier_id_filter)
            .bind(&contract_type_filter)
            .fetch_one(&state.db)
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

async fn create_contract(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateSupplierContractRequest>,
) -> Json<ApiResponse<SupplierContract>> {
    match check_permission(&state.db, &claims, &ModulePermission::ContractWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    // 数据验证
    if req.contract_no.is_empty() || req.title.is_empty() {
        return Json(ApiResponse::<SupplierContract>::error(
            400,
            "合同编号和标题不能为空",
        ));
    }

    // 验证供应商ID
    let supplier_uuid = Uuid::parse_str(&req.supplier_id);
    if supplier_uuid.is_err() {
        return Json(ApiResponse::<SupplierContract>::error(
            400,
            "供应商ID格式错误",
        ));
    }

    let supplier_id = supplier_uuid.unwrap();

    // 检查供应商是否存在
    let supplier_exists = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM srm.suppliers WHERE id = $1 AND status != 'deleted'",
    )
    .bind(supplier_id)
    .fetch_one(&state.db)
    .await;

    if supplier_exists.unwrap_or(0) == 0 {
        return Json(ApiResponse::<SupplierContract>::error(
            400,
            "供应商不存在或已删除",
        ));
    }

    // 检查合同编号是否已存在
    let existing = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM srm.supplier_contracts WHERE contract_no = $1",
    )
    .bind(&req.contract_no)
    .fetch_one(&state.db)
    .await;

    if existing.unwrap_or(0) > 0 {
        return Json(ApiResponse::<SupplierContract>::error(
            400,
            "合同编号已存在",
        ));
    }

    // 验证金额
    if let Some(amount) = req.total_amount {
        if amount < 0.0 {
            return Json(ApiResponse::<SupplierContract>::error(
                400,
                "合同金额不能为负数",
            ));
        }
    }

    // 解析日期
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

    // 验证日期逻辑
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
        r#"
        INSERT INTO srm.supplier_contracts (id, contract_no, supplier_id, supplier_name, title, contract_type, total_amount, currency, sign_date, start_date, end_date, status, remarks, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id, contract_no, supplier_id, supplier_name, title, contract_type, total_amount, currency, sign_date, start_date, end_date, status, remarks, created_by, created_at, updated_at
        "#,
    )
    .bind(id)
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
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(contract) => Json(ApiResponse::success(contract, "供应商合同创建成功")),
        Err(e) => {
            tracing::error!("创建供应商合同失败: {}", e);
            Json(ApiResponse::<SupplierContract>::error(
                500,
                "供应商合同创建失败",
            ))
        }
    }
}

async fn get_contract(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<SupplierContract>> {
    match check_permission(&state.db, &claims, &ModulePermission::ContractRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let result = sqlx::query_as::<_, SupplierContract>(
        r#"
        SELECT id, contract_no, supplier_id, supplier_name, title, contract_type, total_amount, currency, sign_date, start_date, end_date, status, remarks, created_by, created_at, updated_at
        FROM srm.supplier_contracts WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
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

async fn update_contract(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateSupplierContractRequest>,
) -> Json<ApiResponse<SupplierContract>> {
    match check_permission(&state.db, &claims, &ModulePermission::ContractWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let existing = sqlx::query_as::<_, SupplierContract>(
        "SELECT id, contract_no, supplier_id, supplier_name, title, contract_type, total_amount, currency, sign_date, start_date, end_date, status, remarks, created_by, created_at, updated_at FROM srm.supplier_contracts WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
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

    // 验证供应商ID（如果更新）
    let supplier_id = if let Some(supplier_id_str) = &req.supplier_id {
        let supplier_uuid = Uuid::parse_str(supplier_id_str);
        if supplier_uuid.is_err() {
            return Json(ApiResponse::<SupplierContract>::error(
                400,
                "供应商ID格式错误",
            ));
        }

        let supplier_uuid_val = supplier_uuid.unwrap();

        let supplier_exists = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM srm.suppliers WHERE id = $1 AND status != 'deleted'",
        )
        .bind(supplier_uuid_val)
        .fetch_one(&state.db)
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

    // 验证金额
    if let Some(amount) = req.total_amount {
        if amount < 0.0 {
            return Json(ApiResponse::<SupplierContract>::error(
                400,
                "合同金额不能为负数",
            ));
        }
    }

    // 解析日期
    let sign_date = req.sign_date.or(existing.sign_date);
    let start_date = req.start_date.or(existing.start_date);
    let end_date = req.end_date.or(existing.end_date);

    // 验证日期逻辑
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
        r#"
        UPDATE srm.supplier_contracts SET
            contract_no = $2, supplier_id = $3, supplier_name = $4, title = $5, contract_type = $6, total_amount = $7, currency = $8, sign_date = $9, start_date = $10, end_date = $11, status = $12, remarks = $13, updated_at = $14
        WHERE id = $1
        RETURNING id, contract_no, supplier_id, supplier_name, title, contract_type, total_amount, currency, sign_date, start_date, end_date, status, remarks, created_by, created_at, updated_at
        "#,
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
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(contract) => Json(ApiResponse::success(contract, "供应商合同更新成功")),
        Err(e) => {
            tracing::error!("更新供应商合同失败: {}", e);
            Json(ApiResponse::<SupplierContract>::error(
                500,
                "供应商合同更新失败",
            ))
        }
    }
}

async fn delete_contract(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &ModulePermission::ContractWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let result = sqlx::query("DELETE FROM srm.supplier_contracts WHERE id = $1")
        .bind(id)
        .execute(&state.db)
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

async fn get_contract_terms(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Vec<ContractTerm>>> {
    match check_permission(&state.db, &claims, &ModulePermission::ContractRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    // 验证合同是否存在
    let contract_exists =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM srm.supplier_contracts WHERE id = $1")
            .bind(id)
            .fetch_one(&state.db)
            .await;

    if contract_exists.unwrap_or(0) == 0 {
        return Json(ApiResponse::<Vec<ContractTerm>>::error(404, "合同不存在"));
    }

    let result = sqlx::query_as::<_, ContractTerm>(
        r#"
        SELECT id, contract_id, term_type, title, content, sort_order, created_at, updated_at
        FROM srm.contract_terms
        WHERE contract_id = $1
        ORDER BY sort_order
        "#,
    )
    .bind(id)
    .fetch_all(&state.db)
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

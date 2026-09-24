use axum::{
    extract::{Extension, Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use super::ApiState;
use crate::models::purchase_contract::{
    CreatePurchaseContractRequest, PurchaseContract, PurchaseContractItem,
    PurchaseContractQueryParams, UpdatePurchaseContractRequest,
};
use crate::shared::permission::{check_permission, tenant_bind_value, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::{api_error, ApiResponse};

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route(
            "/purchase-contracts",
            get(list_contracts).post(create_contract),
        )
        .route(
            "/purchase-contracts/{id}",
            get(get_contract)
                .put(update_contract)
                .delete(delete_contract),
        )
        .route("/purchase-contracts/{id}/submit", post(submit_contract))
        .route("/purchase-contracts/{id}/approve", post(approve_contract))
        .route("/purchase-contracts/{id}/reject", post(reject_contract))
        .route("/purchase-contracts/{id}/cancel", post(cancel_contract))
        .route(
            "/purchase-contracts/{id}/terminate",
            post(terminate_contract),
        )
        .route("/purchase-contracts/{id}/renew", post(renew_contract))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["scm:read"])),
    path = "/scm/purchase-contracts",
    responses(
        (status = 200, description = "list_contracts OK")
    ),
    tag = "SCM/purchase-contract"
)]
pub async fn list_contracts(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PurchaseContractQueryParams>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let tenant_bind = tenant_bind_value(&claims);

    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let contracts = sqlx::query_as::<_, PurchaseContract>(
        only_own_schema_query!("scm", "SELECT id, tenant_id, contract_no, title, contract_type, supplier_id, supplier_name, sign_date, effective_date, expiry_date, total_amount::float8, currency, payment_terms, delivery_terms, status, approval_status, approver, approved_at, signed_by, contract_file, remarks, created_at, updated_at, deleted_at FROM scm.purchase_contracts WHERE deleted_at IS NULL AND ($3 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $3) ORDER BY created_at DESC LIMIT $1 OFFSET $2"),
    )
    .bind(page_size)
    .bind(offset)
    .bind(tenant_bind)
    .fetch_all(&mut **txn)
    .await;

    let total = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "scm",
        "SELECT COUNT(*) FROM scm.purchase_contracts WHERE deleted_at IS NULL AND ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $1)"
    ))
    .bind(tenant_bind)
    .fetch_one(&mut **txn)
    .await
    .unwrap_or(0);

    match contracts {
        Ok(items) => Json(ApiResponse::success(
            serde_json::json!({
                "items": items,
                "total": total,
                "page": page,
                "page_size": page_size,
            }),
            "获取采购合同列表成功",
        )),
        Err(e) => {
            tracing::error!("获取采购合同列表失败: {}", e);
            Json(api_error(500, "获取采购合同列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["scm:write"])),
    path = "/scm/purchase-contracts",
    responses(
        (status = 200, description = "create_contract OK")
    ),
    tag = "SCM/purchase-contract"
)]
pub async fn create_contract(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(data): Json<CreatePurchaseContractRequest>,
) -> Json<ApiResponse<PurchaseContract>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_bind = tenant_bind_value(&claims);
    let contract = sqlx::query_as::<_, PurchaseContract>(only_own_schema_query!(
        "scm",
        r#"
        INSERT INTO scm.purchase_contracts (
            contract_no, title, contract_type, supplier_id,
            sign_date, effective_date, expiry_date, total_amount,
            currency, payment_terms, delivery_terms, signed_by, remarks, status, tenant_id
        ) VALUES ($1, $2, $3, $4::uuid, $5::date, $6::date, $7::date, $8, $9, $10, $11, $12, $13, 'draft', $14)
        RETURNING id, tenant_id, contract_no, title, contract_type, supplier_id, supplier_name, sign_date, effective_date, expiry_date, total_amount::float8, currency, payment_terms, delivery_terms, status, approval_status, approver, approved_at, signed_by, contract_file, remarks, created_at, updated_at, deleted_at
        "#
    ))
    .bind(&data.contract_no)
    .bind(&data.title)
    .bind(&data.contract_type)
    .bind(&data.supplier_id)
    .bind(&data.sign_date)
    .bind(&data.effective_date)
    .bind(&data.expiry_date)
    .bind(data.total_amount)
    .bind(&data.currency)
    .bind(&data.payment_terms)
    .bind(&data.delivery_terms)
    .bind(&data.signed_by)
    .bind(&data.remarks)
    .bind(tenant_bind)
    .fetch_one(&mut **txn)
    .await;

    match contract {
        Ok(item) => {
            if let Some(items) = &data.items {
                for (idx, item_data) in items.iter().enumerate() {
                    let _ = sqlx::query(only_own_schema_query!(
                        "scm",
                        r#"
                        INSERT INTO scm.purchase_contract_items (
                            contract_id, line_number, product_code, product_name,
                            specification, unit, quantity, unit_price, delivery_date, remarks, tenant_id
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::date, $10, $11)
                        "#
                    ))
                    .bind(item.id)
                    .bind((idx + 1) as i32)
                    .bind(&item_data.product_code)
                    .bind(&item_data.product_name)
                    .bind(&item_data.specification)
                    .bind(&item_data.unit)
                    .bind(item_data.quantity)
                    .bind(item_data.unit_price)
                    .bind(&item_data.delivery_date)
                    .bind(&item_data.remarks)
                    .bind(tenant_bind)
                    .execute(&mut **txn)
                    .await;
                }
            }
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return Json(ApiResponse::error(500, "提交事务失败"));
                }
            }
            Json(ApiResponse::success(item, "创建采购合同成功"))
        }
        Err(e) => {
            tracing::error!("创建采购合同失败: {}", e);
            Json(api_error(500, "创建采购合同失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["scm:read"])),
    path = "/scm/purchase-contracts/{id}",
    responses(
        (status = 200, description = "get_contract OK")
    ),
    tag = "SCM/purchase-contract"
)]
pub async fn get_contract(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let contract_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的采购合同ID")),
    };

    let tenant_bind = tenant_bind_value(&claims);
    let contract = sqlx::query_as::<_, PurchaseContract>(
        only_own_schema_query!("scm", "SELECT id, tenant_id, contract_no, title, contract_type, supplier_id, supplier_name, sign_date, effective_date, expiry_date, total_amount::float8, currency, payment_terms, delivery_terms, status, approval_status, approver, approved_at, signed_by, contract_file, remarks, created_at, updated_at, deleted_at FROM scm.purchase_contracts WHERE id = $1 AND deleted_at IS NULL AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $2)"),
    )
    .bind(contract_id)
    .bind(tenant_bind)
    .fetch_one(&mut **txn)
    .await;

    match contract {
        Ok(contract) => {
            let items = sqlx::query_as::<_, PurchaseContractItem>(
                only_own_schema_query!("scm", "SELECT id, tenant_id, contract_id, line_number, product_code, product_name, specification, unit, quantity::float8, unit_price::float8, amount::float8, delivery_date, remarks, created_at FROM scm.purchase_contract_items WHERE contract_id = $1 AND deleted_at IS NULL AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $2) ORDER BY line_number"),
            )
            .bind(contract_id)
            .bind(tenant_bind)
            .fetch_all(&mut **txn)
            .await
            .unwrap_or_default();

            Json(ApiResponse::success(
                serde_json::json!({
                    "contract": contract,
                    "items": items,
                }),
                "获取采购合同成功",
            ))
        }
        Err(sqlx::Error::RowNotFound) => Json(api_error(404, "采购合同不存在")),
        Err(e) => {
            tracing::error!("获取采购合同失败: {}", e);
            Json(api_error(500, "获取采购合同失败"))
        }
    }
}

pub async fn update_contract(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(data): Json<UpdatePurchaseContractRequest>,
) -> Json<ApiResponse<PurchaseContract>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let contract_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的采购合同ID")),
    };

    let tenant_bind = tenant_bind_value(&claims);
    let contract = sqlx::query_as::<_, PurchaseContract>(only_own_schema_query!(
        "scm",
        r#"
        UPDATE scm.purchase_contracts SET
            title = COALESCE($1, title),
            contract_type = COALESCE($2, contract_type),
            supplier_id = COALESCE($3, supplier_id),
            sign_date = COALESCE($4::date, sign_date),
            effective_date = COALESCE($5::date, effective_date),
            expiry_date = COALESCE($6::date, expiry_date),
            total_amount = COALESCE($7::numeric, total_amount),
            currency = COALESCE($8, currency),
            payment_terms = COALESCE($9, payment_terms),
            delivery_terms = COALESCE($10, delivery_terms),
            status = COALESCE($11, status),
            remarks = COALESCE($12, remarks)
        WHERE id = $13 AND deleted_at IS NULL AND ($14 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $14)
        RETURNING id, tenant_id, contract_no, title, contract_type, supplier_id, supplier_name, sign_date, effective_date, expiry_date, total_amount::float8, currency, payment_terms, delivery_terms, status, approval_status, approver, approved_at, signed_by, contract_file, remarks, created_at, updated_at, deleted_at
        "#
    ))
    .bind(&data.title)
    .bind(&data.contract_type)
    .bind(&data.supplier_id)
    .bind(&data.sign_date)
    .bind(&data.effective_date)
    .bind(&data.expiry_date)
    .bind(data.total_amount)
    .bind(&data.currency)
    .bind(&data.payment_terms)
    .bind(&data.delivery_terms)
    .bind(&data.status)
    .bind(&data.remarks)
    .bind(contract_id)
    .bind(tenant_bind)
    .fetch_one(&mut **txn)
    .await;

    match contract {
        Ok(item) => {
            if let Some(items) = &data.items {
                let _ = sqlx::query(only_own_schema_query!(
                    "scm",
                    "DELETE FROM scm.purchase_contract_items WHERE contract_id = $1 AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $2)"
                ))
                .bind(contract_id)
                .bind(tenant_bind)
                .execute(&mut **txn)
                .await;

                for (idx, item_data) in items.iter().enumerate() {
                    let _ = sqlx::query(only_own_schema_query!(
                        "scm",
                        r#"
                        INSERT INTO scm.purchase_contract_items (
                            contract_id, line_number, product_code, product_name,
                            specification, unit, quantity, unit_price, delivery_date, remarks, tenant_id
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::date, $10, $11)
                        "#
                    ))
                    .bind(contract_id)
                    .bind((idx + 1) as i32)
                    .bind(&item_data.product_code)
                    .bind(&item_data.product_name)
                    .bind(&item_data.specification)
                    .bind(&item_data.unit)
                    .bind(item_data.quantity)
                    .bind(item_data.unit_price)
                    .bind(&item_data.delivery_date)
                    .bind(&item_data.remarks)
                    .bind(tenant_bind)
                    .execute(&mut **txn)
                    .await;
                }
            }
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return Json(ApiResponse::error(500, "提交事务失败"));
                }
            }
            Json(ApiResponse::success(item, "更新采购合同成功"))
        }
        Err(sqlx::Error::RowNotFound) => Json(api_error(404, "采购合同不存在")),
        Err(e) => {
            tracing::error!("更新采购合同失败: {}", e);
            Json(api_error(500, "更新采购合同失败"))
        }
    }
}

pub async fn delete_contract(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<String>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let contract_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的采购合同ID")),
    };

    let tenant_bind = tenant_bind_value(&claims);
    let result = sqlx::query(only_own_schema_query!(
        "scm",
        "UPDATE scm.purchase_contracts SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $2)"
    ))
    .bind(contract_id)
    .bind(tenant_bind)
    .execute(&mut **txn)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            // 级联软删子表（同租户条件）
            if let Err(e) = sqlx::query(only_own_schema_query!(
                "scm",
                "UPDATE scm.purchase_contract_items SET deleted_at = NOW() WHERE contract_id = $1 AND deleted_at IS NULL AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $2)"
            ))
            .bind(contract_id)
            .bind(tenant_bind)
            .execute(&mut **txn)
            .await
            {
                tracing::error!("删除合同子表失败: {}", e);
                return Json(api_error(500, "删除合同子表失败"));
            }
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return Json(ApiResponse::error(500, "提交事务失败"));
                }
            }
            Json(ApiResponse::success("".to_string(), "删除采购合同成功"))
        }
        Ok(_) => Json(api_error(404, "采购合同不存在")),
        Err(e) => {
            tracing::error!("删除采购合同失败: {}", e);
            Json(api_error(500, "删除采购合同失败"))
        }
    }
}

pub async fn submit_contract(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(data): Json<serde_json::Value>,
) -> Json<ApiResponse<PurchaseContract>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let contract_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的采购合同ID")),
    };

    let remarks = data
        .get("remarks")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let tenant_bind = tenant_bind_value(&claims);
    let contract = sqlx::query_as::<_, PurchaseContract>(
        only_own_schema_query!("scm", "UPDATE scm.purchase_contracts SET status = 'pending', remarks = COALESCE($1, remarks) WHERE id = $2 AND deleted_at IS NULL AND status = 'draft' AND ($3 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $3) RETURNING id, tenant_id, contract_no, title, contract_type, supplier_id, supplier_name, sign_date, effective_date, expiry_date, total_amount::float8, currency, payment_terms, delivery_terms, status, approval_status, approver, approved_at, signed_by, contract_file, remarks, created_at, updated_at, deleted_at"),
    )
    .bind(remarks)
    .bind(contract_id)
    .bind(tenant_bind)
    .fetch_one(&mut **txn)
    .await;

    match contract {
        Ok(item) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return Json(ApiResponse::error(500, "提交事务失败"));
                }
            }
            Json(ApiResponse::success(item, "提交采购合同成功"))
        }
        Err(sqlx::Error::RowNotFound) => Json(api_error(400, "采购合同状态不正确，无法提交")),
        Err(e) => {
            tracing::error!("提交采购合同失败: {}", e);
            Json(api_error(500, "提交采购合同失败"))
        }
    }
}

pub async fn approve_contract(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(data): Json<serde_json::Value>,
) -> Json<ApiResponse<PurchaseContract>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderApprove).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let contract_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的采购合同ID")),
    };

    let remarks = data
        .get("remarks")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let tenant_bind = tenant_bind_value(&claims);
    let contract = sqlx::query_as::<_, PurchaseContract>(only_own_schema_query!(
        "scm",
        r#"
        UPDATE scm.purchase_contracts SET 
            status = 'approved', approval_status = 'approved', 
            approver = $1, approved_at = NOW(), remarks = COALESCE($2, remarks)
        WHERE id = $3 AND deleted_at IS NULL AND status = 'pending' AND ($4 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $4)
        RETURNING id, tenant_id, contract_no, title, contract_type, supplier_id, supplier_name, sign_date, effective_date, expiry_date, total_amount::float8, currency, payment_terms, delivery_terms, status, approval_status, approver, approved_at, signed_by, contract_file, remarks, created_at, updated_at, deleted_at
        "#
    ))
    .bind(&claims.sub)
    .bind(remarks)
    .bind(contract_id)
    .bind(tenant_bind)
    .fetch_one(&mut **txn)
    .await;

    match contract {
        Ok(item) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return Json(ApiResponse::error(500, "提交事务失败"));
                }
            }
            Json(ApiResponse::success(item, "审批通过采购合同成功"))
        }
        Err(sqlx::Error::RowNotFound) => Json(api_error(400, "采购合同状态不正确，无法审批")),
        Err(e) => {
            tracing::error!("审批采购合同失败: {}", e);
            Json(api_error(500, "审批采购合同失败"))
        }
    }
}

pub async fn reject_contract(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(data): Json<serde_json::Value>,
) -> Json<ApiResponse<PurchaseContract>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderApprove).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let contract_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的采购合同ID")),
    };

    let remarks = data
        .get("remarks")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let tenant_bind = tenant_bind_value(&claims);
    let contract = sqlx::query_as::<_, PurchaseContract>(only_own_schema_query!(
        "scm",
        r#"
        UPDATE scm.purchase_contracts SET 
            status = 'rejected', approval_status = 'rejected', 
            approver = $1, approved_at = NOW(), remarks = COALESCE($2, remarks)
        WHERE id = $3 AND deleted_at IS NULL AND status = 'pending' AND ($4 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $4)
        RETURNING id, tenant_id, contract_no, title, contract_type, supplier_id, supplier_name, sign_date, effective_date, expiry_date, total_amount::float8, currency, payment_terms, delivery_terms, status, approval_status, approver, approved_at, signed_by, contract_file, remarks, created_at, updated_at, deleted_at
        "#
    ))
    .bind(&claims.sub)
    .bind(remarks)
    .bind(contract_id)
    .bind(tenant_bind)
    .fetch_one(&mut **txn)
    .await;

    match contract {
        Ok(item) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return Json(ApiResponse::error(500, "提交事务失败"));
                }
            }
            Json(ApiResponse::success(item, "拒绝采购合同成功"))
        }
        Err(sqlx::Error::RowNotFound) => Json(api_error(400, "采购合同状态不正确，无法拒绝")),
        Err(e) => {
            tracing::error!("拒绝采购合同失败: {}", e);
            Json(api_error(500, "拒绝采购合同失败"))
        }
    }
}

pub async fn cancel_contract(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(data): Json<serde_json::Value>,
) -> Json<ApiResponse<PurchaseContract>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let contract_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的采购合同ID")),
    };

    let remarks = data
        .get("remarks")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let tenant_bind = tenant_bind_value(&claims);
    let contract = sqlx::query_as::<_, PurchaseContract>(
        only_own_schema_query!("scm", "UPDATE scm.purchase_contracts SET status = 'cancelled', remarks = COALESCE($1, remarks) WHERE id = $2 AND deleted_at IS NULL AND status IN ('draft', 'approved') AND ($3 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $3) RETURNING id, tenant_id, contract_no, title, contract_type, supplier_id, supplier_name, sign_date, effective_date, expiry_date, total_amount::float8, currency, payment_terms, delivery_terms, status, approval_status, approver, approved_at, signed_by, contract_file, remarks, created_at, updated_at, deleted_at"),
    )
    .bind(remarks)
    .bind(contract_id)
    .bind(tenant_bind)
    .fetch_one(&mut **txn)
    .await;

    match contract {
        Ok(item) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return Json(ApiResponse::error(500, "提交事务失败"));
                }
            }
            Json(ApiResponse::success(item, "取消采购合同成功"))
        }
        Err(sqlx::Error::RowNotFound) => Json(api_error(400, "采购合同状态不正确，无法取消")),
        Err(e) => {
            tracing::error!("取消采购合同失败: {}", e);
            Json(api_error(500, "取消采购合同失败"))
        }
    }
}

pub async fn terminate_contract(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(data): Json<serde_json::Value>,
) -> Json<ApiResponse<PurchaseContract>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let contract_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的采购合同ID")),
    };

    let remarks = data
        .get("remarks")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let tenant_bind = tenant_bind_value(&claims);
    let contract = sqlx::query_as::<_, PurchaseContract>(
        only_own_schema_query!("scm", "UPDATE scm.purchase_contracts SET status = 'terminated', remarks = COALESCE($1, remarks) WHERE id = $2 AND deleted_at IS NULL AND status = 'approved' AND ($3 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $3) RETURNING id, tenant_id, contract_no, title, contract_type, supplier_id, supplier_name, sign_date, effective_date, expiry_date, total_amount::float8, currency, payment_terms, delivery_terms, status, approval_status, approver, approved_at, signed_by, contract_file, remarks, created_at, updated_at, deleted_at"),
    )
    .bind(remarks)
    .bind(contract_id)
    .bind(tenant_bind)
    .fetch_one(&mut **txn)
    .await;

    match contract {
        Ok(item) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return Json(ApiResponse::error(500, "提交事务失败"));
                }
            }
            Json(ApiResponse::success(item, "终止采购合同成功"))
        }
        Err(sqlx::Error::RowNotFound) => Json(api_error(400, "采购合同状态不正确，无法终止")),
        Err(e) => {
            tracing::error!("终止采购合同失败: {}", e);
            Json(api_error(500, "终止采购合同失败"))
        }
    }
}

pub async fn renew_contract(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<PurchaseContract>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let contract_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的采购合同ID")),
    };

    let tenant_bind = tenant_bind_value(&claims);
    let contract = sqlx::query_as::<_, PurchaseContract>(
        only_own_schema_query!("scm", "UPDATE scm.purchase_contracts SET status = 'draft' WHERE id = $1 AND deleted_at IS NULL AND status IN ('expired', 'terminated') AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $2) RETURNING id, tenant_id, contract_no, title, contract_type, supplier_id, supplier_name, sign_date, effective_date, expiry_date, total_amount::float8, currency, payment_terms, delivery_terms, status, approval_status, approver, approved_at, signed_by, contract_file, remarks, created_at, updated_at, deleted_at"),
    )
    .bind(contract_id)
    .bind(tenant_bind)
    .fetch_one(&mut **txn)
    .await;

    match contract {
        Ok(item) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return Json(ApiResponse::error(500, "提交事务失败"));
                }
            }
            Json(ApiResponse::success(item, "续签采购合同成功"))
        }
        Err(sqlx::Error::RowNotFound) => Json(api_error(400, "采购合同状态不正确，无法续签")),
        Err(e) => {
            tracing::error!("续签采购合同失败: {}", e);
            Json(api_error(500, "续签采购合同失败"))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::purchase_contract::PurchaseContractQueryParams;

    #[test]
    fn purchase_contract_query_params_defaults_via_serde() {
        let q: PurchaseContractQueryParams = serde_json::from_str("{}").expect("deserialize empty");
        assert!(q.page.is_none());
        assert!(q.page_size.is_none());
        assert!(q.status.is_none());
    }

    #[test]
    fn purchase_contract_query_params_roundtrip_preserves_fields() {
        let json = r#"{
            "page": 2,
            "page_size": 10,
            "status": "approved"
        }"#;
        let q: PurchaseContractQueryParams = serde_json::from_str(json).expect("deserialize");
        assert_eq!(q.page, Some(2));
        assert_eq!(q.page_size, Some(10));
        assert_eq!(q.status.as_deref(), Some("approved"));
    }

    #[test]
    fn purchase_contract_query_params_partial_population() {
        let json = r#"{"page_size": 50}"#;
        let q: PurchaseContractQueryParams = serde_json::from_str(json).expect("deserialize");
        assert_eq!(q.page_size, Some(50));
        assert!(q.page.is_none());
        assert!(q.status.is_none());
    }

    #[test]
    fn purchase_contract_query_params_ignores_unknown_fields() {
        let json = r#"{"status": "draft", "extra": "ignored"}"#;
        let q: PurchaseContractQueryParams = serde_json::from_str(json).expect("deserialize");
        assert_eq!(q.status.as_deref(), Some("draft"));
    }

    #[test]
    fn create_routes_returns_router_without_panic() {
        let _router = create_routes();
    }

    #[test]
    fn uuid_parse_str_validates_contract_id() {
        let valid = "550e8400-e29b-41d4-a716-446655440000";
        assert!(Uuid::parse_str(valid).is_ok());
        let invalid = "123";
        assert!(Uuid::parse_str(invalid).is_err());
    }
}

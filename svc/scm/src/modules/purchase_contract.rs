use axum::{
    extract::{Extension, Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use uuid::Uuid;

use super::ApiState;
use crate::models::purchase_contract::{
    CreatePurchaseContractRequest, PurchaseContract, PurchaseContractItem,
    PurchaseContractQueryParams, UpdatePurchaseContractRequest,
};
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::{api_error, auth::Claims, ApiResponse};

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route(
            "/api/scm/purchase-contracts",
            get(list_contracts).post(create_contract),
        )
        .route(
            "/api/scm/purchase-contracts/{id}",
            get(get_contract)
                .put(update_contract)
                .delete(delete_contract),
        )
        .route(
            "/api/scm/purchase-contracts/{id}/submit",
            post(submit_contract),
        )
        .route(
            "/api/scm/purchase-contracts/{id}/approve",
            post(approve_contract),
        )
        .route(
            "/api/scm/purchase-contracts/{id}/reject",
            post(reject_contract),
        )
        .route(
            "/api/scm/purchase-contracts/{id}/cancel",
            post(cancel_contract),
        )
        .route(
            "/api/scm/purchase-contracts/{id}/terminate",
            post(terminate_contract),
        )
        .route(
            "/api/scm/purchase-contracts/{id}/renew",
            post(renew_contract),
        )
}

pub async fn list_contracts(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PurchaseContractQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let contracts = sqlx::query_as::<_, PurchaseContract>(
        "SELECT * FROM scm.purchase_contracts WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT $1 OFFSET $2",
    )
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    let total = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM scm.purchase_contracts WHERE deleted_at IS NULL",
    )
    .fetch_one(&state.db)
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

pub async fn create_contract(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(data): Json<CreatePurchaseContractRequest>,
) -> Json<ApiResponse<PurchaseContract>> {
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let contract = sqlx::query_as::<_, PurchaseContract>(
        r#"
        INSERT INTO scm.purchase_contracts (
            contract_no, title, contract_type, supplier_id,
            sign_date, effective_date, expiry_date, total_amount,
            currency, payment_terms, delivery_terms, signed_by, remarks, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'draft')
        RETURNING *
        "#,
    )
    .bind(&data.contract_no)
    .bind(&data.title)
    .bind(&data.contract_type)
    .bind(&data.supplier_id)
    .bind(&data.sign_date)
    .bind(&data.effective_date)
    .bind(&data.expiry_date)
    .bind(&data.total_amount)
    .bind(&data.currency)
    .bind(&data.payment_terms)
    .bind(&data.delivery_terms)
    .bind(&data.signed_by)
    .bind(&data.remarks)
    .fetch_one(&state.db)
    .await;

    match contract {
        Ok(item) => {
            if let Some(items) = &data.items {
                for (idx, item_data) in items.iter().enumerate() {
                    let _ = sqlx::query(
                        r#"
                        INSERT INTO scm.purchase_contract_items (
                            contract_id, line_number, product_code, product_name,
                            specification, unit, quantity, unit_price, delivery_date, remarks
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                        "#,
                    )
                    .bind(item.id)
                    .bind((idx + 1) as i32)
                    .bind(&item_data.product_code)
                    .bind(&item_data.product_name)
                    .bind(&item_data.specification)
                    .bind(&item_data.unit)
                    .bind(item_data.quantity)
                    .bind(&item_data.unit_price)
                    .bind(&item_data.delivery_date)
                    .bind(&item_data.remarks)
                    .execute(&state.db)
                    .await;
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

pub async fn get_contract(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let contract_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的采购合同ID")),
    };

    let contract = sqlx::query_as::<_, PurchaseContract>(
        "SELECT * FROM scm.purchase_contracts WHERE id = $1 AND deleted_at IS NULL",
    )
    .bind(contract_id)
    .fetch_one(&state.db)
    .await;

    match contract {
        Ok(contract) => {
            let items = sqlx::query_as::<_, PurchaseContractItem>(
                "SELECT * FROM scm.purchase_contract_items WHERE contract_id = $1 ORDER BY line_number",
            )
            .bind(contract_id)
            .fetch_all(&state.db)
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
    Json(data): Json<UpdatePurchaseContractRequest>,
) -> Json<ApiResponse<PurchaseContract>> {
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let contract_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的采购合同ID")),
    };

    let contract = sqlx::query_as::<_, PurchaseContract>(
        r#"
        UPDATE scm.purchase_contracts SET
            title = COALESCE($1, title),
            contract_type = COALESCE($2, contract_type),
            supplier_id = COALESCE($3, supplier_id),
            sign_date = COALESCE($4, sign_date),
            effective_date = COALESCE($5, effective_date),
            expiry_date = COALESCE($6, expiry_date),
            total_amount = COALESCE($7, total_amount),
            currency = COALESCE($8, currency),
            payment_terms = COALESCE($9, payment_terms),
            delivery_terms = COALESCE($10, delivery_terms),
            status = COALESCE($11, status),
            remarks = COALESCE($12, remarks)
        WHERE id = $13 AND deleted_at IS NULL
        RETURNING *
        "#,
    )
    .bind(&data.title)
    .bind(&data.contract_type)
    .bind(&data.supplier_id)
    .bind(&data.sign_date)
    .bind(&data.effective_date)
    .bind(&data.expiry_date)
    .bind(&data.total_amount)
    .bind(&data.currency)
    .bind(&data.payment_terms)
    .bind(&data.delivery_terms)
    .bind(&data.status)
    .bind(&data.remarks)
    .bind(contract_id)
    .fetch_one(&state.db)
    .await;

    match contract {
        Ok(item) => {
            if let Some(items) = &data.items {
                let _ =
                    sqlx::query("DELETE FROM scm.purchase_contract_items WHERE contract_id = $1")
                        .bind(contract_id)
                        .execute(&state.db)
                        .await;

                for (idx, item_data) in items.iter().enumerate() {
                    let _ = sqlx::query(
                        r#"
                        INSERT INTO scm.purchase_contract_items (
                            contract_id, line_number, product_code, product_name,
                            specification, unit, quantity, unit_price, delivery_date, remarks
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                        "#,
                    )
                    .bind(contract_id)
                    .bind((idx + 1) as i32)
                    .bind(&item_data.product_code)
                    .bind(&item_data.product_name)
                    .bind(&item_data.specification)
                    .bind(&item_data.unit)
                    .bind(item_data.quantity)
                    .bind(&item_data.unit_price)
                    .bind(&item_data.delivery_date)
                    .bind(&item_data.remarks)
                    .execute(&state.db)
                    .await;
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
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let contract_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的采购合同ID")),
    };

    let result = sqlx::query(
        "UPDATE scm.purchase_contracts SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL",
    )
    .bind(contract_id)
    .execute(&state.db)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            Json(ApiResponse::success("".to_string(), "删除采购合同成功"))
        }
        Ok(_) => Json(api_error(404, "采购合同不存在")),
        Err(e) => {
            tracing::error!("删除采购合同失败: {}", e);
            Json(api_error(500, "删除采购合同失败"))
        }
    }
}

async fn submit_contract(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(data): Json<serde_json::Value>,
) -> Json<ApiResponse<PurchaseContract>> {
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

    let contract = sqlx::query_as::<_, PurchaseContract>(
        "UPDATE scm.purchase_contracts SET status = 'pending', remarks = COALESCE($1, remarks) WHERE id = $2 AND deleted_at IS NULL AND status = 'draft' RETURNING *",
    )
    .bind(remarks)
    .bind(contract_id)
    .fetch_one(&state.db)
    .await;

    match contract {
        Ok(item) => Json(ApiResponse::success(item, "提交采购合同成功")),
        Err(sqlx::Error::RowNotFound) => Json(api_error(400, "采购合同状态不正确，无法提交")),
        Err(e) => {
            tracing::error!("提交采购合同失败: {}", e);
            Json(api_error(500, "提交采购合同失败"))
        }
    }
}

async fn approve_contract(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(data): Json<serde_json::Value>,
) -> Json<ApiResponse<PurchaseContract>> {
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

    let contract = sqlx::query_as::<_, PurchaseContract>(
        r#"
        UPDATE scm.purchase_contracts SET 
            status = 'approved', approval_status = 'approved', 
            approver = $1, approved_at = NOW(), remarks = COALESCE($2, remarks)
        WHERE id = $3 AND deleted_at IS NULL AND status = 'pending' 
        RETURNING *
        "#,
    )
    .bind(&claims.sub)
    .bind(remarks)
    .bind(contract_id)
    .fetch_one(&state.db)
    .await;

    match contract {
        Ok(item) => Json(ApiResponse::success(item, "审批通过采购合同成功")),
        Err(sqlx::Error::RowNotFound) => Json(api_error(400, "采购合同状态不正确，无法审批")),
        Err(e) => {
            tracing::error!("审批采购合同失败: {}", e);
            Json(api_error(500, "审批采购合同失败"))
        }
    }
}

async fn reject_contract(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(data): Json<serde_json::Value>,
) -> Json<ApiResponse<PurchaseContract>> {
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

    let contract = sqlx::query_as::<_, PurchaseContract>(
        r#"
        UPDATE scm.purchase_contracts SET 
            status = 'rejected', approval_status = 'rejected', 
            approver = $1, approved_at = NOW(), remarks = COALESCE($2, remarks)
        WHERE id = $3 AND deleted_at IS NULL AND status = 'pending' 
        RETURNING *
        "#,
    )
    .bind(&claims.sub)
    .bind(remarks)
    .bind(contract_id)
    .fetch_one(&state.db)
    .await;

    match contract {
        Ok(item) => Json(ApiResponse::success(item, "拒绝采购合同成功")),
        Err(sqlx::Error::RowNotFound) => Json(api_error(400, "采购合同状态不正确，无法拒绝")),
        Err(e) => {
            tracing::error!("拒绝采购合同失败: {}", e);
            Json(api_error(500, "拒绝采购合同失败"))
        }
    }
}

async fn cancel_contract(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(data): Json<serde_json::Value>,
) -> Json<ApiResponse<PurchaseContract>> {
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

    let contract = sqlx::query_as::<_, PurchaseContract>(
        "UPDATE scm.purchase_contracts SET status = 'cancelled', remarks = COALESCE($1, remarks) WHERE id = $2 AND deleted_at IS NULL AND status IN ('draft', 'approved') RETURNING *",
    )
    .bind(remarks)
    .bind(contract_id)
    .fetch_one(&state.db)
    .await;

    match contract {
        Ok(item) => Json(ApiResponse::success(item, "取消采购合同成功")),
        Err(sqlx::Error::RowNotFound) => Json(api_error(400, "采购合同状态不正确，无法取消")),
        Err(e) => {
            tracing::error!("取消采购合同失败: {}", e);
            Json(api_error(500, "取消采购合同失败"))
        }
    }
}

async fn terminate_contract(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(data): Json<serde_json::Value>,
) -> Json<ApiResponse<PurchaseContract>> {
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

    let contract = sqlx::query_as::<_, PurchaseContract>(
        "UPDATE scm.purchase_contracts SET status = 'terminated', remarks = COALESCE($1, remarks) WHERE id = $2 AND deleted_at IS NULL AND status = 'approved' RETURNING *",
    )
    .bind(remarks)
    .bind(contract_id)
    .fetch_one(&state.db)
    .await;

    match contract {
        Ok(item) => Json(ApiResponse::success(item, "终止采购合同成功")),
        Err(sqlx::Error::RowNotFound) => Json(api_error(400, "采购合同状态不正确，无法终止")),
        Err(e) => {
            tracing::error!("终止采购合同失败: {}", e);
            Json(api_error(500, "终止采购合同失败"))
        }
    }
}

async fn renew_contract(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<PurchaseContract>> {
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let contract_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的采购合同ID")),
    };

    let contract = sqlx::query_as::<_, PurchaseContract>(
        "UPDATE scm.purchase_contracts SET status = 'draft' WHERE id = $1 AND deleted_at IS NULL AND status IN ('expired', 'terminated') RETURNING *",
    )
    .bind(contract_id)
    .fetch_one(&state.db)
    .await;

    match contract {
        Ok(item) => Json(ApiResponse::success(item, "续签采购合同成功")),
        Err(sqlx::Error::RowNotFound) => Json(api_error(400, "采购合同状态不正确，无法续签")),
        Err(e) => {
            tracing::error!("续签采购合同失败: {}", e);
            Json(api_error(500, "续签采购合同失败"))
        }
    }
}

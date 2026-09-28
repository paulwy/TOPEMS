use axum::{
    extract::{Extension, Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use chrono::DateTime;
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use super::ApiState;
use crate::models::purchase_requisition::{
    CreatePurchaseRequisitionRequest, PurchaseRequisition, PurchaseRequisitionQueryParams,
    UpdatePurchaseRequisitionRequest,
};
use crate::shared::permission::{check_permission, tenant_bind_value, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::{api_error, ApiResponse};

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route(
            "/purchase-requisitions",
            get(list_requisitions).post(create_requisition),
        )
        .route(
            "/purchase-requisitions/{id}",
            get(get_requisition)
                .put(update_requisition)
                .delete(delete_requisition),
        )
        .route(
            "/purchase-requisitions/{id}/submit",
            post(submit_requisition),
        )
        .route(
            "/purchase-requisitions/{id}/approve",
            post(approve_requisition),
        )
        .route(
            "/purchase-requisitions/{id}/reject",
            post(reject_requisition),
        )
        .route(
            "/purchase-requisitions/{id}/cancel",
            post(cancel_requisition),
        )
        .route(
            "/purchase-requisitions/{id}/convert-to-order",
            post(convert_to_order),
        )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["scm:purchase-requisition:read"])),
    path = "/purchase-requisitions",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SCM/purchase-requisition"
)]
pub async fn list_requisitions(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PurchaseRequisitionQueryParams>,
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

    let requisitions = sqlx::query_as::<_, PurchaseRequisition>(
        only_own_schema_query!("scm", "SELECT id, tenant_id, requisition_no, title, applicant_id, applicant_name, department_id, department_name, request_date, required_date, total_amount, currency, status, priority, supplier_id, supplier_name, approval_status, approver, approved_at, remarks, created_at, updated_at, deleted_at FROM scm.purchase_requisitions WHERE deleted_at IS NULL AND ($3 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $3) ORDER BY created_at DESC LIMIT $1 OFFSET $2"),
    )
    .bind(page_size)
    .bind(offset)
    .bind(tenant_bind)
    .fetch_all(&mut **txn)
    .await;

    let total = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "scm",
        "SELECT COUNT(*) FROM scm.purchase_requisitions WHERE deleted_at IS NULL AND ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $1)"
    ))
    .bind(tenant_bind)
    .fetch_one(&mut **txn)
    .await
    .unwrap_or(0);

    match requisitions {
        Ok(items) => Json(ApiResponse::success(
            serde_json::json!({
                "items": items,
                "total": total,
                "page": page,
                "page_size": page_size,
            }),
            "获取采购申请列表成功",
        )),
        Err(e) => {
            tracing::error!("获取采购申请列表失败: {}", e);
            Json(api_error(500, "获取采购申请列表失败"))
        }
    }
}

pub async fn create_requisition(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(data): Json<CreatePurchaseRequisitionRequest>,
) -> Json<ApiResponse<PurchaseRequisition>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let tenant_bind = tenant_bind_value(&claims);

    let request_date = DateTime::parse_from_rfc3339(&data.request_date)
        .unwrap_or_else(|_| chrono::Utc::now().into())
        .with_timezone(&chrono::Utc);

    let required_date = data.required_date.as_ref().map(|d| {
        DateTime::parse_from_rfc3339(d)
            .unwrap_or_else(|_| chrono::Utc::now().into())
            .with_timezone(&chrono::Utc)
    });

    let applicant_id = data
        .applicant_id
        .as_ref()
        .and_then(|id| Uuid::parse_str(id).ok());
    let department_id = data
        .department_id
        .as_ref()
        .and_then(|id| Uuid::parse_str(id).ok());
    let supplier_id = data
        .supplier_id
        .as_ref()
        .and_then(|id| Uuid::parse_str(id).ok());

    // 自动生成采购申请编号
    let requisition_no = data.requisition_no.clone().unwrap_or_else(|| {
        let now = chrono::Utc::now();
        format!("PR-{}", now.timestamp_millis())
    });

    let requisition = sqlx::query_as::<_, PurchaseRequisition>(only_own_schema_query!(
        "scm",
        r#"
        INSERT INTO scm.purchase_requisitions (
            requisition_no, title, applicant_id, department_id,
            request_date, required_date, priority, supplier_id, remarks, status, tenant_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft', $10)
        RETURNING *
        "#
    ))
    .bind(&requisition_no)
    .bind(&data.title)
    .bind(applicant_id)
    .bind(department_id)
    .bind(request_date)
    .bind(required_date)
    .bind(&data.priority)
    .bind(supplier_id)
    .bind(&data.remarks)
    .bind(tenant_bind)
    .fetch_one(&mut **txn)
    .await;

    match requisition {
        Ok(item) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return Json(ApiResponse::error(500, "提交事务失败"));
                }
            }
            Json(ApiResponse::success(item, "创建采购申请成功"))
        }
        Err(e) => {
            tracing::error!("创建采购申请失败: {}", e);
            Json(api_error(500, "创建采购申请失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["scm:purchase-requisition:read"])),
    path = "/purchase-requisitions/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SCM/purchase-requisition"
)]
pub async fn get_requisition(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<PurchaseRequisition>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let requisition_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的采购申请ID")),
    };

    let tenant_bind = tenant_bind_value(&claims);
    let requisition = sqlx::query_as::<_, PurchaseRequisition>(
        only_own_schema_query!("scm", "SELECT id, tenant_id, requisition_no, title, applicant_id, applicant_name, department_id, department_name, request_date, required_date, total_amount, currency, status, priority, supplier_id, supplier_name, approval_status, approver, approved_at, remarks, created_at, updated_at, deleted_at FROM scm.purchase_requisitions WHERE id = $1 AND deleted_at IS NULL AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $2)")
    )
    .bind(requisition_id)
    .bind(tenant_bind)
    .fetch_one(&mut **txn)
    .await;

    match requisition {
        Ok(item) => Json(ApiResponse::success(item, "获取采购申请成功")),
        Err(sqlx::Error::RowNotFound) => Json(api_error(404, "采购申请不存在")),
        Err(e) => {
            tracing::error!("获取采购申请失败: {}", e);
            Json(api_error(500, "获取采购申请失败"))
        }
    }
}

pub async fn update_requisition(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(data): Json<UpdatePurchaseRequisitionRequest>,
) -> Json<ApiResponse<PurchaseRequisition>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let requisition_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的采购申请ID")),
    };
    let tenant_bind = tenant_bind_value(&claims);

    let required_date = data.required_date.as_ref().map(|d| {
        DateTime::parse_from_rfc3339(d)
            .unwrap_or_else(|_| chrono::Utc::now().into())
            .with_timezone(&chrono::Utc)
    });

    let supplier_id = data
        .supplier_id
        .as_ref()
        .and_then(|id| Uuid::parse_str(id).ok());

    let requisition = sqlx::query_as::<_, PurchaseRequisition>(only_own_schema_query!(
        "scm",
        r#"
        UPDATE scm.purchase_requisitions SET
            title = COALESCE($1, title),
            required_date = COALESCE($2, required_date),
            priority = COALESCE($3, priority),
            supplier_id = COALESCE($4, supplier_id),
            status = COALESCE($5, status),
            remarks = COALESCE($6, remarks)
        WHERE id = $7 AND deleted_at IS NULL AND ($8 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $8)
        RETURNING *
        "#
    ))
    .bind(&data.title)
    .bind(required_date)
    .bind(&data.priority)
    .bind(supplier_id)
    .bind(&data.status)
    .bind(&data.remarks)
    .bind(requisition_id)
    .bind(tenant_bind)
    .fetch_one(&mut **txn)
    .await;

    match requisition {
        Ok(item) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return Json(ApiResponse::error(500, "提交事务失败"));
                }
            }
            Json(ApiResponse::success(item, "更新采购申请成功"))
        }
        Err(sqlx::Error::RowNotFound) => Json(api_error(404, "采购申请不存在")),
        Err(e) => {
            tracing::error!("更新采购申请失败: {}", e);
            Json(api_error(500, "更新采购申请失败"))
        }
    }
}

pub async fn delete_requisition(
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

    let requisition_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的采购申请ID")),
    };

    let tenant_bind = tenant_bind_value(&claims);
    let result = sqlx::query(
        only_own_schema_query!("scm", "UPDATE scm.purchase_requisitions SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $2)")
    )
    .bind(requisition_id)
    .bind(tenant_bind)
    .execute(&mut **txn)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return Json(ApiResponse::error(500, "提交事务失败"));
                }
            }
            Json(ApiResponse::success("".to_string(), "删除采购申请成功"))
        }
        Ok(_) => Json(api_error(404, "采购申请不存在")),
        Err(e) => {
            tracing::error!("删除采购申请失败: {}", e);
            Json(api_error(500, "删除采购申请失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["scm:purchase-requisition:write"])),
    path = "/purchase-requisitions/{id}/submit",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SCM/purchase-requisition"
)]
pub async fn submit_requisition(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(data): Json<serde_json::Value>,
) -> Json<ApiResponse<PurchaseRequisition>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let requisition_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的采购申请ID")),
    };

    let remarks = data
        .get("remarks")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let tenant_bind = tenant_bind_value(&claims);
    let requisition = sqlx::query_as::<_, PurchaseRequisition>(
        only_own_schema_query!("scm", "UPDATE scm.purchase_requisitions SET status = 'pending', remarks = COALESCE($1, remarks) WHERE id = $2 AND deleted_at IS NULL AND status = 'draft' AND ($3 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $3) RETURNING *"),
    )
    .bind(remarks)
    .bind(requisition_id)
    .bind(tenant_bind)
    .fetch_one(&mut **txn)
    .await;

    match requisition {
        Ok(item) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return Json(ApiResponse::error(500, "提交事务失败"));
                }
            }
            Json(ApiResponse::success(item, "提交采购申请成功"))
        }
        Err(sqlx::Error::RowNotFound) => Json(api_error(400, "采购申请状态不正确，无法提交")),
        Err(e) => {
            tracing::error!("提交采购申请失败: {}", e);
            Json(api_error(500, "提交采购申请失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["scm:purchase-requisition:write"])),
    path = "/purchase-requisitions/{id}/approve",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SCM/purchase-requisition"
)]
pub async fn approve_requisition(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(data): Json<serde_json::Value>,
) -> Json<ApiResponse<PurchaseRequisition>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderApprove).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let requisition_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的采购申请ID")),
    };

    let remarks = data
        .get("remarks")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let tenant_bind = tenant_bind_value(&claims);
    let requisition = sqlx::query_as::<_, PurchaseRequisition>(only_own_schema_query!(
        "scm",
        r#"
        UPDATE scm.purchase_requisitions SET 
            status = 'approved', approval_status = 'approved', 
            approver = $1, approved_at = NOW(), remarks = COALESCE($2, remarks)
        WHERE id = $3 AND deleted_at IS NULL AND status = 'pending' AND ($4 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $4)
        RETURNING *
        "#
    ))
    .bind(&claims.sub)
    .bind(remarks)
    .bind(requisition_id)
    .bind(tenant_bind)
    .fetch_one(&mut **txn)
    .await;

    match requisition {
        Ok(item) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return Json(ApiResponse::error(500, "提交事务失败"));
                }
            }
            Json(ApiResponse::success(item, "审批通过采购申请成功"))
        }
        Err(sqlx::Error::RowNotFound) => Json(api_error(400, "采购申请状态不正确，无法审批")),
        Err(e) => {
            tracing::error!("审批采购申请失败: {}", e);
            Json(api_error(500, "审批采购申请失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["scm:purchase-requisition:write"])),
    path = "/purchase-requisitions/{id}/reject",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SCM/purchase-requisition"
)]
pub async fn reject_requisition(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(data): Json<serde_json::Value>,
) -> Json<ApiResponse<PurchaseRequisition>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderApprove).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let requisition_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的采购申请ID")),
    };

    let remarks = data
        .get("remarks")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let tenant_bind = tenant_bind_value(&claims);
    let requisition = sqlx::query_as::<_, PurchaseRequisition>(only_own_schema_query!(
        "scm",
        r#"
        UPDATE scm.purchase_requisitions SET 
            status = 'rejected', approval_status = 'rejected', 
            approver = $1, approved_at = NOW(), remarks = COALESCE($2, remarks)
        WHERE id = $3 AND deleted_at IS NULL AND status = 'pending' AND ($4 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $4)
        RETURNING *
        "#
    ))
    .bind(&claims.sub)
    .bind(remarks)
    .bind(requisition_id)
    .bind(tenant_bind)
    .fetch_one(&mut **txn)
    .await;

    match requisition {
        Ok(item) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return Json(ApiResponse::error(500, "提交事务失败"));
                }
            }
            Json(ApiResponse::success(item, "拒绝采购申请成功"))
        }
        Err(sqlx::Error::RowNotFound) => Json(api_error(400, "采购申请状态不正确，无法拒绝")),
        Err(e) => {
            tracing::error!("拒绝采购申请失败: {}", e);
            Json(api_error(500, "拒绝采购申请失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["scm:purchase-requisition:write"])),
    path = "/purchase-requisitions/{id}/cancel",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SCM/purchase-requisition"
)]
pub async fn cancel_requisition(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(data): Json<serde_json::Value>,
) -> Json<ApiResponse<PurchaseRequisition>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let requisition_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的采购申请ID")),
    };

    let remarks = data
        .get("remarks")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let tenant_bind = tenant_bind_value(&claims);
    let requisition = sqlx::query_as::<_, PurchaseRequisition>(
        only_own_schema_query!("scm", "UPDATE scm.purchase_requisitions SET status = 'cancelled', remarks = COALESCE($1, remarks) WHERE id = $2 AND deleted_at IS NULL AND status IN ('draft', 'pending') AND ($3 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $3) RETURNING *"),
    )
    .bind(remarks)
    .bind(requisition_id)
    .bind(tenant_bind)
    .fetch_one(&mut **txn)
    .await;

    match requisition {
        Ok(item) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return Json(ApiResponse::error(500, "提交事务失败"));
                }
            }
            Json(ApiResponse::success(item, "取消采购申请成功"))
        }
        Err(sqlx::Error::RowNotFound) => Json(api_error(400, "采购申请状态不正确，无法取消")),
        Err(e) => {
            tracing::error!("取消采购申请失败: {}", e);
            Json(api_error(500, "取消采购申请失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["scm:purchase-requisition:write"])),
    path = "/purchase-requisitions/{id}/convert-to-order",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SCM/purchase-requisition"
)]
pub async fn convert_to_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<PurchaseRequisition>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let requisition_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的采购申请ID")),
    };

    let tenant_bind = tenant_bind_value(&claims);
    let requisition = sqlx::query_as::<_, PurchaseRequisition>(
        only_own_schema_query!("scm", "UPDATE scm.purchase_requisitions SET status = 'converted' WHERE id = $1 AND deleted_at IS NULL AND status = 'approved' AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $2) RETURNING *"),
    )
    .bind(requisition_id)
    .bind(tenant_bind)
    .fetch_one(&mut **txn)
    .await;

    match requisition {
        Ok(item) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return Json(ApiResponse::error(500, "提交事务失败"));
                }
            }
            Json(ApiResponse::success(item, "转换为采购订单成功"))
        }
        Err(sqlx::Error::RowNotFound) => Json(api_error(400, "采购申请状态不正确，无法转换")),
        Err(e) => {
            tracing::error!("转换采购申请失败: {}", e);
            Json(api_error(500, "转换采购申请失败"))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::purchase_requisition::PurchaseRequisitionQueryParams;

    #[test]
    fn purchase_requisition_query_params_defaults_via_serde() {
        let q: PurchaseRequisitionQueryParams =
            serde_json::from_str("{}").expect("deserialize empty");
        assert!(q.page.is_none());
        assert!(q.page_size.is_none());
        assert!(q.status.is_none());
    }

    #[test]
    fn purchase_requisition_query_params_roundtrip_preserves_fields() {
        let json = r#"{
            "page": 3,
            "page_size": 15,
            "status": "approved"
        }"#;
        let q: PurchaseRequisitionQueryParams = serde_json::from_str(json).expect("deserialize");
        assert_eq!(q.page, Some(3));
        assert_eq!(q.page_size, Some(15));
        assert_eq!(q.status.as_deref(), Some("approved"));
    }

    #[test]
    fn purchase_requisition_query_params_partial_population() {
        let json = r#"{"status": "draft"}"#;
        let q: PurchaseRequisitionQueryParams = serde_json::from_str(json).expect("deserialize");
        assert_eq!(q.status.as_deref(), Some("draft"));
        assert!(q.page.is_none());
    }

    #[test]
    fn purchase_requisition_query_params_ignores_unknown_fields() {
        let json = r#"{"page": 1, "extra": "ignored"}"#;
        let q: PurchaseRequisitionQueryParams = serde_json::from_str(json).expect("deserialize");
        assert_eq!(q.page, Some(1));
    }

    #[test]
    fn create_routes_returns_router_without_panic() {
        let _router = create_routes();
    }

    #[test]
    fn uuid_parse_str_validates_id_format() {
        // Replicates the ID validation logic used in the handlers.
        let valid = "550e8400-e29b-41d4-a716-446655440000";
        assert!(Uuid::parse_str(valid).is_ok());
        let invalid = "not-a-uuid";
        assert!(Uuid::parse_str(invalid).is_err());
    }
}

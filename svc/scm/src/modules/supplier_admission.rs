use axum::{
    extract::{Extension, Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use uuid::Uuid;

use super::ApiState;
use crate::models::supplier_admission::{
    AuditRequest, CreateSupplierAdmissionRequest, SupplierAdmission, SupplierAdmissionQueryParams,
    UpdateSupplierAdmissionRequest,
};
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::{api_error, ApiResponse};

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route(
            "/supplier-admissions",
            get(list_admissions).post(create_admission),
        )
        .route(
            "/supplier-admissions/{id}",
            get(get_admission)
                .put(update_admission)
                .delete(delete_admission),
        )
        .route("/supplier-admissions/{id}/submit", post(submit_admission))
        .route("/supplier-admissions/{id}/approve", post(approve_admission))
        .route("/supplier-admissions/{id}/reject", post(reject_admission))
        .route("/supplier-admissions/{id}/audit", post(audit_admission))
        .route(
            "/supplier-admissions/{id}/activate-supplier",
            post(activate_supplier),
        )
}

pub async fn list_admissions(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<SupplierAdmissionQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let admissions = sqlx::query_as::<_, SupplierAdmission>(
        "SELECT id, tenant_id, supplier_id, supplier_name, admission_type, status, review_result, reviewed_by, reviewed_at, created_by, created_at, updated_at, deleted_at FROM scm.supplier_admissions WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT $1 OFFSET $2",
    )
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    let total = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM scm.supplier_admissions WHERE deleted_at IS NULL",
    )
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    match admissions {
        Ok(items) => Json(ApiResponse::success(
            serde_json::json!({
                "items": items,
                "total": total,
                "page": page,
                "page_size": page_size,
            }),
            "获取供应商准入列表成功",
        )),
        Err(e) => {
            tracing::error!("获取供应商准入列表失败: {}", e);
            Json(api_error(500, "获取供应商准入列表失败"))
        }
    }
}

pub async fn create_admission(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(data): Json<CreateSupplierAdmissionRequest>,
) -> Json<ApiResponse<SupplierAdmission>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let admission = sqlx::query_as::<_, SupplierAdmission>(
        r#"
        INSERT INTO scm.supplier_admissions (
            admission_no, supplier_name, short_name, contact_person,
            contact_phone, contact_email, address, business_license,
            tax_registration, organization_code, legal_representative,
            registered_capital, established_date, business_scope,
            supplier_category, applicant, remarks, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'draft')
        RETURNING *
        "#,
    )
    .bind(&data.admission_no)
    .bind(&data.supplier_name)
    .bind(&data.short_name)
    .bind(&data.contact_person)
    .bind(&data.contact_phone)
    .bind(&data.contact_email)
    .bind(&data.address)
    .bind(&data.business_license)
    .bind(&data.tax_registration)
    .bind(&data.organization_code)
    .bind(&data.legal_representative)
    .bind(&data.registered_capital)
    .bind(&data.established_date)
    .bind(&data.business_scope)
    .bind(&data.supplier_category)
    .bind(&data.applicant)
    .bind(&data.remarks)
    .fetch_one(&state.db)
    .await;

    match admission {
        Ok(item) => Json(ApiResponse::success(item, "创建供应商准入成功")),
        Err(e) => {
            tracing::error!("创建供应商准入失败: {}", e);
            Json(api_error(500, "创建供应商准入失败"))
        }
    }
}

pub async fn get_admission(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<SupplierAdmission>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let admission_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的供应商准入ID")),
    };

    let admission = sqlx::query_as::<_, SupplierAdmission>(
        "SELECT id, tenant_id, supplier_id, supplier_name, admission_type, status, review_result, reviewed_by, reviewed_at, created_by, created_at, updated_at, deleted_at FROM scm.supplier_admissions WHERE id = $1 AND deleted_at IS NULL",
    )
    .bind(admission_id)
    .fetch_one(&state.db)
    .await;

    match admission {
        Ok(item) => Json(ApiResponse::success(item, "获取供应商准入成功")),
        Err(sqlx::Error::RowNotFound) => Json(api_error(404, "供应商准入不存在")),
        Err(e) => {
            tracing::error!("获取供应商准入失败: {}", e);
            Json(api_error(500, "获取供应商准入失败"))
        }
    }
}

pub async fn update_admission(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(data): Json<UpdateSupplierAdmissionRequest>,
) -> Json<ApiResponse<SupplierAdmission>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let admission_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的供应商准入ID")),
    };

    let admission = sqlx::query_as::<_, SupplierAdmission>(
        r#"
        UPDATE scm.supplier_admissions SET
            supplier_name = COALESCE($1, supplier_name),
            short_name = COALESCE($2, short_name),
            contact_person = COALESCE($3, contact_person),
            contact_phone = COALESCE($4, contact_phone),
            contact_email = COALESCE($5, contact_email),
            address = COALESCE($6, address),
            business_license = COALESCE($7, business_license),
            tax_registration = COALESCE($8, tax_registration),
            organization_code = COALESCE($9, organization_code),
            legal_representative = COALESCE($10, legal_representative),
            registered_capital = COALESCE($11, registered_capital),
            established_date = COALESCE($12, established_date),
            business_scope = COALESCE($13, business_scope),
            supplier_category = COALESCE($14, supplier_category),
            risk_level = COALESCE($15, risk_level),
            status = COALESCE($16, status),
            remarks = COALESCE($17, remarks)
        WHERE id = $18 AND deleted_at IS NULL
        RETURNING *
        "#,
    )
    .bind(&data.supplier_name)
    .bind(&data.short_name)
    .bind(&data.contact_person)
    .bind(&data.contact_phone)
    .bind(&data.contact_email)
    .bind(&data.address)
    .bind(&data.business_license)
    .bind(&data.tax_registration)
    .bind(&data.organization_code)
    .bind(&data.legal_representative)
    .bind(&data.registered_capital)
    .bind(&data.established_date)
    .bind(&data.business_scope)
    .bind(&data.supplier_category)
    .bind(&data.risk_level)
    .bind(&data.status)
    .bind(&data.remarks)
    .bind(admission_id)
    .fetch_one(&state.db)
    .await;

    match admission {
        Ok(item) => Json(ApiResponse::success(item, "更新供应商准入成功")),
        Err(sqlx::Error::RowNotFound) => Json(api_error(404, "供应商准入不存在")),
        Err(e) => {
            tracing::error!("更新供应商准入失败: {}", e);
            Json(api_error(500, "更新供应商准入失败"))
        }
    }
}

pub async fn delete_admission(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let admission_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的供应商准入ID")),
    };

    let result = sqlx::query(
        "UPDATE scm.supplier_admissions SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL",
    )
    .bind(admission_id)
    .execute(&state.db)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            Json(ApiResponse::success("".to_string(), "删除供应商准入成功"))
        }
        Ok(_) => Json(api_error(404, "供应商准入不存在")),
        Err(e) => {
            tracing::error!("删除供应商准入失败: {}", e);
            Json(api_error(500, "删除供应商准入失败"))
        }
    }
}

async fn submit_admission(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(data): Json<serde_json::Value>,
) -> Json<ApiResponse<SupplierAdmission>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let admission_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的供应商准入ID")),
    };

    let remarks = data
        .get("remarks")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let admission = sqlx::query_as::<_, SupplierAdmission>(
        "UPDATE scm.supplier_admissions SET status = 'pending', remarks = COALESCE($1, remarks) WHERE id = $2 AND deleted_at IS NULL AND status = 'draft' RETURNING *",
    )
    .bind(remarks)
    .bind(admission_id)
    .fetch_one(&state.db)
    .await;

    match admission {
        Ok(item) => Json(ApiResponse::success(item, "提交供应商准入成功")),
        Err(sqlx::Error::RowNotFound) => Json(api_error(400, "供应商准入状态不正确，无法提交")),
        Err(e) => {
            tracing::error!("提交供应商准入失败: {}", e);
            Json(api_error(500, "提交供应商准入失败"))
        }
    }
}

async fn approve_admission(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(data): Json<serde_json::Value>,
) -> Json<ApiResponse<SupplierAdmission>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let admission_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的供应商准入ID")),
    };

    let remarks = data
        .get("remarks")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let admission = sqlx::query_as::<_, SupplierAdmission>(
        r#"
        UPDATE scm.supplier_admissions SET 
            status = 'approved', approval_status = 'approved', 
            approver = $1, approved_at = NOW(), remarks = COALESCE($2, remarks)
        WHERE id = $3 AND deleted_at IS NULL AND status = 'pending' 
        RETURNING *
        "#,
    )
    .bind(&claims.sub)
    .bind(remarks)
    .bind(admission_id)
    .fetch_one(&state.db)
    .await;

    match admission {
        Ok(item) => Json(ApiResponse::success(item, "审批通过供应商准入成功")),
        Err(sqlx::Error::RowNotFound) => Json(api_error(400, "供应商准入状态不正确，无法审批")),
        Err(e) => {
            tracing::error!("审批供应商准入失败: {}", e);
            Json(api_error(500, "审批供应商准入失败"))
        }
    }
}

async fn reject_admission(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(data): Json<serde_json::Value>,
) -> Json<ApiResponse<SupplierAdmission>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let admission_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的供应商准入ID")),
    };

    let remarks = data
        .get("remarks")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let admission = sqlx::query_as::<_, SupplierAdmission>(
        r#"
        UPDATE scm.supplier_admissions SET 
            status = 'rejected', approval_status = 'rejected', 
            approver = $1, approved_at = NOW(), remarks = COALESCE($2, remarks)
        WHERE id = $3 AND deleted_at IS NULL AND status = 'pending' 
        RETURNING *
        "#,
    )
    .bind(&claims.sub)
    .bind(remarks)
    .bind(admission_id)
    .fetch_one(&state.db)
    .await;

    match admission {
        Ok(item) => Json(ApiResponse::success(item, "拒绝供应商准入成功")),
        Err(sqlx::Error::RowNotFound) => Json(api_error(400, "供应商准入状态不正确，无法拒绝")),
        Err(e) => {
            tracing::error!("拒绝供应商准入失败: {}", e);
            Json(api_error(500, "拒绝供应商准入失败"))
        }
    }
}

async fn audit_admission(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(data): Json<AuditRequest>,
) -> Json<ApiResponse<SupplierAdmission>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let admission_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的供应商准入ID")),
    };

    for item in &data.audit_items {
        let _ = sqlx::query(
            r#"
            INSERT INTO scm.supplier_admission_audit_items (
                admission_id, audit_item, audit_result, auditor, remarks
            ) VALUES ($1, $2, $3, $4, $5)
            "#,
        )
        .bind(admission_id)
        .bind(&item.audit_item)
        .bind(&item.audit_result)
        .bind(&claims.sub)
        .bind(&item.remarks)
        .execute(&state.db)
        .await;
    }

    let all_passed = data.audit_items.iter().all(|i| i.audit_result == "passed");
    let status = if all_passed { "approved" } else { "rejected" };
    let approval_status = status;

    let admission = sqlx::query_as::<_, SupplierAdmission>(
        r#"
        UPDATE scm.supplier_admissions SET 
            status = $1, approval_status = $2, 
            approver = $3, approved_at = NOW()
        WHERE id = $4 AND deleted_at IS NULL 
        RETURNING *
        "#,
    )
    .bind(status)
    .bind(approval_status)
    .bind(&claims.sub)
    .bind(admission_id)
    .fetch_one(&state.db)
    .await;

    match admission {
        Ok(item) => Json(ApiResponse::success(item, "审核供应商准入成功")),
        Err(sqlx::Error::RowNotFound) => Json(api_error(404, "供应商准入不存在")),
        Err(e) => {
            tracing::error!("审核供应商准入失败: {}", e);
            Json(api_error(500, "审核供应商准入失败"))
        }
    }
}

async fn activate_supplier(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<SupplierAdmission>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let admission_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的供应商准入ID")),
    };

    let admission = sqlx::query_as::<_, SupplierAdmission>(
        "UPDATE scm.supplier_admissions SET status = 'active' WHERE id = $1 AND deleted_at IS NULL AND status = 'approved' RETURNING *",
    )
    .bind(admission_id)
    .fetch_one(&state.db)
    .await;

    match admission {
        Ok(item) => Json(ApiResponse::success(item, "激活供应商成功")),
        Err(sqlx::Error::RowNotFound) => Json(api_error(400, "供应商准入状态不正确，无法激活")),
        Err(e) => {
            tracing::error!("激活供应商失败: {}", e);
            Json(api_error(500, "激活供应商失败"))
        }
    }
}

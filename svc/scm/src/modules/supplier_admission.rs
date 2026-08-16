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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::supplier_admission::{
        AuditItem, AuditRequest, CreateSupplierAdmissionRequest, SupplierAdmissionQueryParams,
        UpdateSupplierAdmissionRequest,
    };

    #[test]
    fn supplier_admission_query_params_defaults_via_serde() {
        let q: SupplierAdmissionQueryParams =
            serde_json::from_str("{}").expect("deserialize empty");
        assert!(q.page.is_none());
        assert!(q.page_size.is_none());
        assert!(q.status.is_none());
        assert!(q.approval_status.is_none());
        assert!(q.supplier_category.is_none());
        assert!(q.start_date.is_none());
        assert!(q.end_date.is_none());
    }

    #[test]
    fn supplier_admission_query_params_roundtrip_preserves_fields() {
        let json = r#"{
            "page": 2,
            "page_size": 25,
            "status": "draft",
            "approval_status": "approved",
            "supplier_category": "raw",
            "start_date": "2026-01-01",
            "end_date": "2026-01-31"
        }"#;
        let q: SupplierAdmissionQueryParams = serde_json::from_str(json).expect("deserialize");
        assert_eq!(q.page, Some(2));
        assert_eq!(q.page_size, Some(25));
        assert_eq!(q.status.as_deref(), Some("draft"));
        assert_eq!(q.approval_status.as_deref(), Some("approved"));
        assert_eq!(q.supplier_category.as_deref(), Some("raw"));
        assert_eq!(q.start_date.as_deref(), Some("2026-01-01"));
        assert_eq!(q.end_date.as_deref(), Some("2026-01-31"));
    }

    #[test]
    fn supplier_admission_query_params_ignores_unknown_fields() {
        let json = r#"{"status": "active", "extra": "ignored"}"#;
        let q: SupplierAdmissionQueryParams = serde_json::from_str(json).expect("deserialize");
        assert_eq!(q.status.as_deref(), Some("active"));
    }

    #[test]
    fn create_supplier_admission_request_serde_roundtrip_preserves_required_fields() {
        let req = CreateSupplierAdmissionRequest {
            admission_no: "ADM-001".to_string(),
            supplier_name: "Acme Corp".to_string(),
            short_name: Some("Acme".to_string()),
            contact_person: Some("Alice".to_string()),
            contact_phone: Some("13800000000".to_string()),
            contact_email: Some("alice@acme.com".to_string()),
            address: Some("123 Main St".to_string()),
            business_license: Some("BL-001".to_string()),
            tax_registration: Some("TAX-001".to_string()),
            organization_code: Some("ORG-001".to_string()),
            legal_representative: Some("Bob".to_string()),
            registered_capital: Some("1,000,000".to_string()),
            established_date: Some("2020-01-01".to_string()),
            business_scope: Some("Manufacturing".to_string()),
            supplier_category: Some("raw".to_string()),
            applicant: Some("Carol".to_string()),
            remarks: Some("test".to_string()),
        };
        let json = serde_json::to_string(&req).expect("serialize");
        let back: CreateSupplierAdmissionRequest =
            serde_json::from_str(&json).expect("deserialize");
        assert_eq!(back.admission_no, req.admission_no);
        assert_eq!(back.supplier_name, req.supplier_name);
        assert_eq!(back.short_name, req.short_name);
        assert_eq!(back.business_license, req.business_license);
        assert_eq!(back.remarks, req.remarks);
    }

    #[test]
    fn update_supplier_admission_request_defaults_all_none_via_serde() {
        let req: UpdateSupplierAdmissionRequest =
            serde_json::from_str("{}").expect("deserialize empty");
        assert!(req.supplier_name.is_none());
        assert!(req.status.is_none());
        assert!(req.risk_level.is_none());
        assert!(req.remarks.is_none());
    }

    #[test]
    fn update_supplier_admission_request_partial_population() {
        let json = r#"{"status": "approved", "risk_level": "high"}"#;
        let req: UpdateSupplierAdmissionRequest = serde_json::from_str(json).expect("deserialize");
        assert_eq!(req.status.as_deref(), Some("approved"));
        assert_eq!(req.risk_level.as_deref(), Some("high"));
        assert!(req.supplier_name.is_none());
    }

    #[test]
    fn audit_request_deserialize_preserves_items() {
        let json = r#"{
            "audit_items": [
                {"audit_item": "营业执照", "audit_result": "pass", "remarks": "有效"},
                {"audit_item": "税务登记", "audit_result": "fail"}
            ]
        }"#;
        let req: AuditRequest = serde_json::from_str(json).expect("deserialize");
        assert_eq!(req.audit_items.len(), 2);
        assert_eq!(req.audit_items[0].audit_item, "营业执照");
        assert_eq!(req.audit_items[0].audit_result, "pass");
        assert_eq!(req.audit_items[0].remarks.as_deref(), Some("有效"));
        assert_eq!(req.audit_items[1].audit_item, "税务登记");
        assert_eq!(req.audit_items[1].audit_result, "fail");
        assert!(req.audit_items[1].remarks.is_none());
    }

    #[test]
    fn audit_request_empty_items_list() {
        let json = r#"{"audit_items": []}"#;
        let req: AuditRequest = serde_json::from_str(json).expect("deserialize");
        assert!(req.audit_items.is_empty());
    }

    #[test]
    fn audit_item_with_optional_remarks_none() {
        let json = r#"{"audit_item": "证件", "audit_result": "pass"}"#;
        let item: AuditItem = serde_json::from_str(json).expect("deserialize");
        assert_eq!(item.audit_item, "证件");
        assert_eq!(item.audit_result, "pass");
        assert!(item.remarks.is_none());
    }

    #[test]
    fn create_routes_returns_router_without_panic() {
        let _router = create_routes();
    }
}

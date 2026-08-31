use anyhow::Result;
use axum::{
    extract::{Extension, Json, State},
    routing::post,
    Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::{postgres::PgPool, Row};
use std::sync::Arc;
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_auth::get_tenant_id;
use topems_shared_core::response::{api_error, ApiResponse};
use topems_shared_event::event::{EventPublisher, SupplierDataSyncRequestedPayload};

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SyncSupplierFromScmRequest {
    pub supplier_id: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SyncSupplierToScmRequest {
    pub supplier_id: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SyncLogsRequest {
    pub sync_type: Option<String>,
    pub status: Option<String>,
    pub source_module: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

pub struct AppState {
    pub db: PgPool,
    pub event_publisher: Option<Arc<EventPublisher>>,
}

pub async fn create_routes(
    db: PgPool,
    event_publisher: Option<Arc<EventPublisher>>,
) -> Result<Router> {
    let state = Arc::new(AppState {
        db,
        event_publisher,
    });

    let app = Router::new()
        .route("/sync/supplier-from-scm", post(sync_supplier_from_scm))
        .route(
            "/sync/suppliers-from-scm",
            post(sync_all_suppliers_from_scm),
        )
        .route("/sync/supplier-to-scm", post(sync_supplier_to_scm))
        .route("/sync/suppliers-to-scm", post(sync_all_suppliers_to_scm))
        .route("/sync/sync-logs", post(get_sync_logs))
        .with_state(state);

    Ok(app)
}

async fn sync_supplier_from_scm(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<SyncSupplierFromScmRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::VendorAssessmentWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let supplier_id = match Uuid::parse_str(&req.supplier_id) {
        Ok(id) => id,
        Err(_) => {
            return Json(ApiResponse::success(
                serde_json::json!({
                    "success": false,
                    "message": "供应商ID格式错误".to_string(),
                    "supplier_id": null,
                    "action": "none".to_string(),
                }),
                "供应商ID格式错误",
            ));
        }
    };

    let tenant_id = get_tenant_id(&claims, &headers);

    let scm_supplier = sqlx::query_as::<_, (Uuid, String, Option<String>, Option<String>, Option<String>, Option<String>, Option<String>, Option<String>, Option<String>, String)>(
        only_own_schema_query!("srm", r#"
        SELECT id, name, short_name, contact_name, contact_phone, email, address, bank_account, tax_number, status
        FROM srm.scm_supplier_snapshots
        WHERE id = $1 AND tenant_id = $2 AND status != 'deleted'
        "#),
    )
    .bind(supplier_id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    let (
        id,
        name,
        short_name,
        contact_name,
        contact_phone,
        email,
        address,
        _bank_account,
        tax_number,
        status,
    ) = match scm_supplier {
        Ok(Some(s)) => s,
        Ok(None) => {
            return Json(ApiResponse::success(
                serde_json::json!({
                    "success": false,
                    "message": "SCM供应商不存在".to_string(),
                    "supplier_id": supplier_id,
                    "action": "none".to_string(),
                }),
                "SCM供应商不存在",
            ));
        }
        Err(e) => {
            tracing::error!("查询SCM供应商失败: {}", e);
            return Json(api_error(500, "查询SCM供应商失败"));
        }
    };

    let existing_count = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "srm",
        "SELECT COUNT(*) FROM suppliers WHERE id = $1 AND tenant_id = $2",
        "plugin_srm"
    ))
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let now = Utc::now();
    let action = if existing_count > 0 {
        "update"
    } else {
        "create"
    };

    if existing_count > 0 {
        let result = sqlx::query(only_own_schema_query!(
            "srm",
            r#"
            UPDATE suppliers SET name = $2, legal_name = $3, contact_person = $4, 
                                           phone = $5, email = $6, address = $7, 
                                           tax_id = $8, status = $9, sync_from_scm = TRUE,
                                           scm_supplier_id = $10, updated_at = $11
            WHERE id = $1 AND tenant_id = $12
            "#,
            "plugin_srm"
        ))
        .bind(id)
        .bind(&name)
        .bind(short_name)
        .bind(contact_name)
        .bind(contact_phone)
        .bind(email)
        .bind(address)
        .bind(tax_number)
        .bind(&status)
        .bind(id)
        .bind(now)
        .bind(tenant_id)
        .execute(&state.db)
        .await;

        match result {
            Ok(_) => {
                let _ = record_sync_log(
                    &state.db,
                    tenant_id,
                    "supplier_sync",
                    "scm",
                    "srm",
                    "supplier",
                    id,
                    "",
                    Some(id),
                    "",
                    action,
                    "success",
                    None,
                )
                .await;
                Json(ApiResponse::success(
                    serde_json::json!({
                        "success": true,
                        "message": "供应商信息更新成功".to_string(),
                        "supplier_id": id,
                        "action": "updated".to_string(),
                    }),
                    "供应商同步成功",
                ))
            }
            Err(e) => {
                tracing::error!("更新供应商失败: {}", e);
                Json(api_error(500, "更新供应商失败"))
            }
        }
    } else {
        let result = sqlx::query(
            only_own_schema_query!("srm", r#"
            INSERT INTO suppliers (id, tenant_id, supplier_no, name, legal_name, contact_person, 
                                               phone, email, address, tax_id, status, 
                                               risk_level, sync_from_scm, scm_supplier_id,
                                               created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'low', TRUE, $12, $13, $14)
            "#, "plugin_srm"),
        )
        .bind(id)
        .bind(tenant_id)
        .bind(format!(
            "SUP-{}",
            id.to_string().split('-').next().unwrap_or("")
        ))
        .bind(&name)
        .bind(short_name)
        .bind(contact_name)
        .bind(contact_phone)
        .bind(email)
        .bind(address)
        .bind(tax_number)
        .bind(&status)
        .bind(id)
        .bind(now)
        .bind(now)
        .execute(&state.db)
        .await;

        match result {
            Ok(_) => {
                let _ = record_sync_log(
                    &state.db,
                    tenant_id,
                    "supplier_sync",
                    "scm",
                    "srm",
                    "supplier",
                    id,
                    "",
                    Some(id),
                    "",
                    action,
                    "success",
                    None,
                )
                .await;
                Json(ApiResponse::success(
                    serde_json::json!({
                        "success": true,
                        "message": "供应商创建成功".to_string(),
                        "supplier_id": id,
                        "action": "created".to_string(),
                    }),
                    "供应商同步成功",
                ))
            }
            Err(e) => {
                tracing::error!("创建供应商失败: {}", e);
                Json(api_error(500, "创建供应商失败"))
            }
        }
    }
}

async fn sync_all_suppliers_from_scm(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::VendorAssessmentWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    let scm_suppliers = sqlx::query_as::<_, (Uuid, String, Option<String>, Option<String>, Option<String>, Option<String>, Option<String>, Option<String>, Option<String>, String)>(
        only_own_schema_query!("srm", r#"
        SELECT id, name, short_name, contact_name, contact_phone, email, address, bank_account, tax_number, status
        FROM srm.scm_supplier_snapshots
        WHERE tenant_id = $1 AND status != 'deleted'
        "#),
    )
    .bind(tenant_id)
    .fetch_all(&state.db)
    .await;

    let scm_suppliers = match scm_suppliers {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("查询SCM供应商列表失败: {}", e);
            return Json(api_error(500, "查询SCM供应商列表失败"));
        }
    };

    let total_count = scm_suppliers.len();
    let mut created_count = 0;
    let mut updated_count = 0;
    let mut failed_count = 0;
    let now = Utc::now();

    for (
        id,
        name,
        short_name,
        contact_name,
        contact_phone,
        email,
        address,
        _bank_account,
        tax_number,
        status,
    ) in scm_suppliers
    {
        let existing = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
            "srm",
            "SELECT COUNT(*) FROM suppliers WHERE id = $1 AND tenant_id = $2",
            "plugin_srm"
        ))
        .bind(id)
        .bind(tenant_id)
        .fetch_one(&state.db)
        .await;

        if existing.unwrap_or(0) > 0 {
            let result = sqlx::query(only_own_schema_query!(
                "srm",
                r#"
                UPDATE suppliers SET name = $2, legal_name = $3, contact_person = $4, 
                                               phone = $5, email = $6, address = $7, 
                                               tax_id = $8, status = $9, sync_from_scm = TRUE,
                                               scm_supplier_id = $10, updated_at = $11
                WHERE id = $1 AND tenant_id = $12
                "#,
                "plugin_srm"
            ))
            .bind(id)
            .bind(&name)
            .bind(short_name)
            .bind(contact_name)
            .bind(contact_phone)
            .bind(email)
            .bind(address)
            .bind(tax_number)
            .bind(&status)
            .bind(id)
            .bind(now)
            .bind(tenant_id)
            .execute(&state.db)
            .await;

            if result.is_ok() {
                updated_count += 1;
            } else {
                failed_count += 1;
            }
        } else {
            let result = sqlx::query(
                only_own_schema_query!("srm", r#"
                INSERT INTO suppliers (id, tenant_id, supplier_no, name, legal_name, contact_person, 
                                                   phone, email, address, tax_id, status, 
                                                   risk_level, sync_from_scm, scm_supplier_id,
                                                   created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'low', TRUE, $12, $13, $14)
                "#, "plugin_srm"),
            )
            .bind(id)
            .bind(tenant_id)
            .bind(format!("SUP-{}", id.to_string().split('-').next().unwrap_or("")))
            .bind(&name)
            .bind(short_name)
            .bind(contact_name)
            .bind(contact_phone)
            .bind(email)
            .bind(address)
            .bind(tax_number)
            .bind(&status)
            .bind(id)
            .bind(now)
            .bind(now)
            .execute(&state.db)
            .await;

            if result.is_ok() {
                created_count += 1;
            } else {
                failed_count += 1;
            }
        }
    }

    Json(ApiResponse::success(
        serde_json::json!({
            "total_processed": total_count,
            "created": created_count,
            "updated": updated_count,
            "failed": failed_count
        }),
        "供应商批量同步完成",
    ))
}

async fn sync_supplier_to_scm(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<SyncSupplierToScmRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::VendorAssessmentWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let supplier_id = match Uuid::parse_str(&req.supplier_id) {
        Ok(id) => id,
        Err(_) => {
            return Json(ApiResponse::success(
                serde_json::json!({
                    "success": false,
                    "message": "供应商ID格式错误".to_string(),
                    "supplier_id": null,
                    "action": "none".to_string(),
                }),
                "供应商ID格式错误",
            ));
        }
    };

    let tenant_id = get_tenant_id(&claims, &headers);

    let srm_supplier = sqlx::query_as::<
        _,
        (
            Uuid,
            String,
            Option<String>,
            Option<String>,
            Option<String>,
            Option<String>,
            Option<String>,
            Option<String>,
            String,
        ),
    >(only_own_schema_query!(
        "srm",
        r#"
        SELECT id, name, legal_name, contact_person, phone, email, address, tax_id, status
        FROM suppliers
        WHERE id = $1 AND tenant_id = $2 AND status != 'deleted'
        "#,
        "plugin_srm"
    ))
    .bind(supplier_id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    let (id, name, legal_name, contact_person, phone, email, address, tax_number, status) =
        match srm_supplier {
            Ok(Some(s)) => s,
            Ok(None) => {
                return Json(ApiResponse::success(
                    serde_json::json!({
                        "success": false,
                        "message": "SRM供应商不存在".to_string(),
                        "supplier_id": supplier_id,
                        "action": "none".to_string(),
                    }),
                    "SRM供应商不存在",
                ));
            }
            Err(e) => {
                tracing::error!("查询SRM供应商失败: {}", e);
                return Json(api_error(500, "查询SRM供应商失败"));
            }
        };

    let now = Utc::now();

    if let Some(ref publisher) = state.event_publisher {
        let payload = SupplierDataSyncRequestedPayload {
            supplier_id: id,
            supplier_name: name.clone(),
            short_name: legal_name.clone(),
            contact_name: contact_person.clone(),
            contact_phone: phone.clone(),
            email: email.clone(),
            address: address.clone(),
            tax_number: tax_number.clone(),
            bank_account: None,
            status: status.clone(),
            sync_direction: "srm_to_scm".to_string(),
            requested_at: now,
            requested_by: Some(claims.sub.clone()),
            tenant_id: Some(tenant_id),
        };

        match publisher
            .publish_supplier_data_sync_requested(payload)
            .await
        {
            Ok(_) => {
                tracing::info!(
                    "[srm] 发布 SupplierDataSyncRequested 事件成功 - supplier_id={}",
                    id
                );
                let _ = record_sync_log(
                    &state.db,
                    tenant_id,
                    "supplier_sync",
                    "srm",
                    "scm",
                    "supplier",
                    id,
                    "",
                    Some(id),
                    "",
                    "event_publish",
                    "success",
                    None,
                )
                .await;
                return Json(ApiResponse::success(
                    serde_json::json!({
                        "success": true,
                        "message": "供应商同步事件已发布，SCM将异步处理".to_string(),
                        "supplier_id": id,
                        "action": "event_published".to_string(),
                    }),
                    "供应商同步事件发布成功",
                ));
            }
            Err(e) => {
                tracing::error!(
                    "[srm] 发布 SupplierDataSyncRequested 事件失败: {}，将尝试直接同步",
                    e
                );
            }
        }
    }

    tracing::warn!(
        "[srm] 事件发布不可用或失败，供应商同步未能完成 - supplier_id={}",
        id
    );
    let _ = record_sync_log(
        &state.db,
        tenant_id,
        "supplier_sync",
        "srm",
        "scm",
        "supplier",
        id,
        "",
        Some(id),
        "",
        "event_failed",
        "failed",
        None,
    )
    .await;

    Json(ApiResponse::success(
        serde_json::json!({
            "success": false,
            "message": "供应商同步事件发布失败，请检查事件服务状态".to_string(),
            "supplier_id": id,
            "action": "pending".to_string(),
        }),
        "供应商同步事件发布失败",
    ))
}

async fn sync_all_suppliers_to_scm(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::VendorAssessmentWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    let srm_suppliers = sqlx::query_as::<
        _,
        (
            Uuid,
            String,
            Option<String>,
            Option<String>,
            Option<String>,
            Option<String>,
            Option<String>,
            Option<String>,
            String,
        ),
    >(only_own_schema_query!(
        "srm",
        r#"
        SELECT id, name, legal_name, contact_person, phone, email, address, tax_id, status
        FROM suppliers
        WHERE tenant_id = $1 AND status != 'deleted'
        "#,
        "plugin_srm"
    ))
    .bind(tenant_id)
    .fetch_all(&state.db)
    .await;

    let srm_suppliers = match srm_suppliers {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("查询SRM供应商列表失败: {}", e);
            return Json(api_error(500, "查询SRM供应商列表失败"));
        }
    };

    let total_count = srm_suppliers.len();
    let mut published_count = 0;
    let mut fallback_count = 0;
    let failed_count = 0;
    let now = Utc::now();

    let use_events = state.event_publisher.is_some();

    for (id, name, legal_name, contact_person, phone, email, address, tax_number, status) in
        &srm_suppliers
    {
        if use_events {
            let payload = SupplierDataSyncRequestedPayload {
                supplier_id: *id,
                supplier_name: name.clone(),
                short_name: legal_name.clone(),
                contact_name: contact_person.clone(),
                contact_phone: phone.clone(),
                email: email.clone(),
                address: address.clone(),
                tax_number: tax_number.clone(),
                bank_account: None,
                status: status.clone(),
                sync_direction: "srm_to_scm".to_string(),
                requested_at: now,
                requested_by: Some(claims.sub.clone()),
                tenant_id: Some(tenant_id),
            };

            if let Some(ref publisher) = state.event_publisher {
                match publisher
                    .publish_supplier_data_sync_requested(payload)
                    .await
                {
                    Ok(_) => published_count += 1,
                    Err(e) => {
                        tracing::warn!(
                            "[srm] 批量发布 SupplierDataSyncRequested 失败 - supplier_id={}: {}，将直接同步",
                            id, e
                        );
                        fallback_count += 1;
                    }
                }
            }
        } else {
            tracing::warn!("[srm] 无事件发布器，跳过直接同步 - supplier_id={}", id);
            fallback_count += 1;
        }
    }

    Json(ApiResponse::success(
        serde_json::json!({
            "total_processed": total_count,
            "event_published": published_count,
            "direct_synced": fallback_count,
            "failed": failed_count,
            "mode": if use_events { "event_driven" } else { "direct" }
        }),
        "供应商批量同步完成",
    ))
}

async fn get_sync_logs(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<SyncLogsRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = req.page.unwrap_or(1).max(1);
    let page_size = req.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let tenant_id = get_tenant_id(&claims, &headers);

    let rows = sqlx::query(only_own_schema_query!(
        "srm",
        r#"
        SELECT id, tenant_id, sync_type, source_module, target_module, source_entity,
               source_id, source_code, target_id, target_code, operation, status,
               error_message, retry_count, executed_at, created_at
        FROM unified_core.inter_module_sync
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR sync_type = $2)
          AND ($3::text IS NULL OR status = $3)
          AND ($4::text IS NULL OR source_module = $4)
        ORDER BY created_at DESC
        LIMIT $5 OFFSET $6
        "#
    ))
    .bind(tenant_id)
    .bind(&req.sync_type)
    .bind(&req.status)
    .bind(&req.source_module)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match rows {
        Ok(rows) => {
            let logs: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|row| {
                    serde_json::json!({
                        "id": row.get::<Uuid, _>("id"),
                        "tenant_id": row.get::<Uuid, _>("tenant_id"),
                        "sync_type": row.get::<String, _>("sync_type"),
                        "source_module": row.get::<String, _>("source_module"),
                        "target_module": row.get::<String, _>("target_module"),
                        "source_entity": row.get::<String, _>("source_entity"),
                        "source_id": row.get::<Option<Uuid>, _>("source_id"),
                        "source_code": row.get::<Option<String>, _>("source_code"),
                        "target_id": row.get::<Option<Uuid>, _>("target_id"),
                        "target_code": row.get::<Option<String>, _>("target_code"),
                        "operation": row.get::<String, _>("operation"),
                        "status": row.get::<String, _>("status"),
                        "error_message": row.get::<Option<String>, _>("error_message"),
                        "retry_count": row.get::<i32, _>("retry_count"),
                        "executed_at": row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("executed_at"),
                        "created_at": row.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
                    })
                })
                .collect();
            Json(ApiResponse::success(
                serde_json::json!({ "logs": logs }),
                "同步日志查询成功",
            ))
        }
        Err(e) => {
            tracing::error!("查询同步日志失败: {}", e);
            Json(api_error(500, "查询同步日志失败"))
        }
    }
}

async fn record_sync_log(
    db: &PgPool,
    tenant_id: Uuid,
    sync_type: &str,
    source_module: &str,
    target_module: &str,
    source_entity: &str,
    source_id: Uuid,
    source_code: &str,
    target_id: Option<Uuid>,
    target_code: &str,
    operation: &str,
    status: &str,
    error_message: Option<String>,
) -> Result<(), sqlx::Error> {
    sqlx::query(only_own_schema_query!(
        "srm",
        r#"
        INSERT INTO unified_core.inter_module_sync 
            (tenant_id, sync_type, source_module, target_module, source_entity,
             source_id, source_code, target_id, target_code, operation, status,
             error_message, executed_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        "#
    ))
    .bind(tenant_id)
    .bind(sync_type)
    .bind(source_module)
    .bind(target_module)
    .bind(source_entity)
    .bind(source_id)
    .bind(source_code)
    .bind(target_id)
    .bind(target_code)
    .bind(operation)
    .bind(status)
    .bind(error_message)
    .bind(Utc::now())
    .bind(Utc::now())
    .execute(db)
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sync_supplier_from_scm_request_serde_roundtrip() {
        let req = SyncSupplierFromScmRequest {
            supplier_id: "550e8400-e29b-41d4-a716-446655440000".to_string(),
        };
        let json = serde_json::to_string(&req).unwrap();
        let deserialized: SyncSupplierFromScmRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.supplier_id, req.supplier_id);
    }

    #[test]
    fn test_sync_supplier_from_scm_request_from_json() {
        let json_str = r#"{"supplier_id": "abc-123"}"#;
        let req: SyncSupplierFromScmRequest = serde_json::from_str(json_str).unwrap();
        assert_eq!(req.supplier_id, "abc-123");
    }

    #[test]
    fn test_sync_supplier_from_scm_request_clone() {
        let req = SyncSupplierFromScmRequest {
            supplier_id: "test-id".to_string(),
        };
        let cloned = req.clone();
        assert_eq!(cloned.supplier_id, req.supplier_id);
    }

    #[test]
    fn test_sync_supplier_to_scm_request_serde_roundtrip() {
        let req = SyncSupplierToScmRequest {
            supplier_id: "660e8400-e29b-41d4-a716-446655440000".to_string(),
        };
        let json = serde_json::to_string(&req).unwrap();
        let deserialized: SyncSupplierToScmRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.supplier_id, req.supplier_id);
    }

    #[test]
    fn test_sync_supplier_to_scm_request_from_json() {
        let json_str = r#"{"supplier_id": "xyz-456"}"#;
        let req: SyncSupplierToScmRequest = serde_json::from_str(json_str).unwrap();
        assert_eq!(req.supplier_id, "xyz-456");
    }

    #[test]
    fn test_sync_supplier_to_scm_request_clone() {
        let req = SyncSupplierToScmRequest {
            supplier_id: "clone-me".to_string(),
        };
        let cloned = req.clone();
        assert_eq!(cloned.supplier_id, req.supplier_id);
    }

    #[test]
    fn test_sync_logs_request_serde_full() {
        let req = SyncLogsRequest {
            sync_type: Some("supplier_sync".to_string()),
            status: Some("success".to_string()),
            source_module: Some("scm".to_string()),
            page: Some(1),
            page_size: Some(20),
        };
        let json = serde_json::to_string(&req).unwrap();
        let deserialized: SyncLogsRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.sync_type, req.sync_type);
        assert_eq!(deserialized.status, req.status);
        assert_eq!(deserialized.source_module, req.source_module);
        assert_eq!(deserialized.page, req.page);
        assert_eq!(deserialized.page_size, req.page_size);
    }

    #[test]
    fn test_sync_logs_request_serde_all_none() {
        let req = SyncLogsRequest {
            sync_type: None,
            status: None,
            source_module: None,
            page: None,
            page_size: None,
        };
        let json = serde_json::to_string(&req).unwrap();
        let deserialized: SyncLogsRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.sync_type, None);
        assert_eq!(deserialized.status, None);
        assert_eq!(deserialized.page, None);
    }

    #[test]
    fn test_sync_logs_request_from_json() {
        let json_str = r#"{
            "sync_type": "supplier_sync",
            "status": null,
            "source_module": "srm",
            "page": 2,
            "page_size": 50
        }"#;
        let req: SyncLogsRequest = serde_json::from_str(json_str).unwrap();
        assert_eq!(req.sync_type, Some("supplier_sync".to_string()));
        assert_eq!(req.status, None);
        assert_eq!(req.source_module, Some("srm".to_string()));
        assert_eq!(req.page, Some(2));
        assert_eq!(req.page_size, Some(50));
    }

    #[test]
    fn test_sync_logs_request_clone() {
        let req = SyncLogsRequest {
            sync_type: Some("clone".to_string()),
            status: Some("ok".to_string()),
            source_module: None,
            page: Some(1),
            page_size: None,
        };
        let cloned = req.clone();
        assert_eq!(cloned.sync_type, req.sync_type);
        assert_eq!(cloned.status, req.status);
    }

    #[test]
    fn test_sync_logs_request_json_field_names() {
        let req = SyncLogsRequest {
            sync_type: Some("t".to_string()),
            status: Some("s".to_string()),
            source_module: Some("m".to_string()),
            page: Some(1),
            page_size: Some(10),
        };
        let json = serde_json::to_value(&req).unwrap();
        assert!(json.get("sync_type").is_some());
        assert!(json.get("source_module").is_some());
        assert!(json.get("page_size").is_some());
    }

    #[test]
    fn test_sync_logs_request_empty_json() {
        let json_str = r#"{}"#;
        let req: SyncLogsRequest = serde_json::from_str(json_str).unwrap();
        assert_eq!(req.sync_type, None);
        assert_eq!(req.page, None);
    }
}

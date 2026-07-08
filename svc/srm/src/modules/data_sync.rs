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
use uuid::Uuid;

use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::{api_error, ApiResponse};

#[derive(Debug, Deserialize, Serialize)]
pub struct SyncSupplierFromScmRequest {
    pub supplier_id: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct SyncSupplierToScmRequest {
    pub supplier_id: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct SyncLogsRequest {
    pub sync_type: Option<String>,
    pub status: Option<String>,
    pub source_module: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

pub struct AppState {
    pub db: PgPool,
}

pub async fn create_routes(db: PgPool) -> Result<Router> {
    let state = Arc::new(AppState { db });

    let app = Router::new()
        .route(
            "/api/srm/sync/supplier-from-scm",
            post(sync_supplier_from_scm),
        )
        .route(
            "/api/srm/sync/suppliers-from-scm",
            post(sync_all_suppliers_from_scm),
        )
        .route("/api/srm/sync/supplier-to-scm", post(sync_supplier_to_scm))
        .route(
            "/api/srm/sync/suppliers-to-scm",
            post(sync_all_suppliers_to_scm),
        )
        .route("/api/srm/sync/sync-logs", post(get_sync_logs))
        .with_state(state);

    Ok(app)
}

async fn sync_supplier_from_scm(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
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

    let scm_supplier = sqlx::query_as::<_, (Uuid, String, Option<String>, Option<String>, Option<String>, Option<String>, Option<String>, Option<String>, Option<String>, String)>(
        r#"
        SELECT id, name, short_name, contact_name, contact_phone, email, address, bank_account, tax_number, status
        FROM plugin_scm.suppliers
        WHERE id = $1 AND status != 'deleted'
        "#,
    )
    .bind(supplier_id)
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

    let existing_count =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM plugin_srm.suppliers WHERE id = $1")
            .bind(id)
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
        let result = sqlx::query(
            r#"
            UPDATE plugin_srm.suppliers SET name = $2, legal_name = $3, contact_person = $4, 
                                           phone = $5, email = $6, address = $7, 
                                           tax_id = $8, status = $9, sync_from_scm = TRUE,
                                           scm_supplier_id = $10, updated_at = $11
            WHERE id = $1
            "#,
        )
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
        .execute(&state.db)
        .await;

        match result {
            Ok(_) => {
                let _ = record_sync_log(
                    &state.db,
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
            r#"
            INSERT INTO plugin_srm.suppliers (id, supplier_no, name, legal_name, contact_person, 
                                               phone, email, address, tax_id, status, 
                                               risk_level, sync_from_scm, scm_supplier_id,
                                               created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'low', TRUE, $11, $12, $13)
            "#,
        )
        .bind(id)
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
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::VendorAssessmentWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let scm_suppliers = sqlx::query_as::<_, (Uuid, String, Option<String>, Option<String>, Option<String>, Option<String>, Option<String>, Option<String>, Option<String>, String)>(
        r#"
        SELECT id, name, short_name, contact_name, contact_phone, email, address, bank_account, tax_number, status
        FROM plugin_scm.suppliers
        WHERE status != 'deleted'
        "#,
    )
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
        let existing =
            sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM plugin_srm.suppliers WHERE id = $1")
                .bind(id)
                .fetch_one(&state.db)
                .await;

        if existing.unwrap_or(0) > 0 {
            let result = sqlx::query(
                r#"
                UPDATE plugin_srm.suppliers SET name = $2, legal_name = $3, contact_person = $4, 
                                               phone = $5, email = $6, address = $7, 
                                               tax_id = $8, status = $9, sync_from_scm = TRUE,
                                               scm_supplier_id = $10, updated_at = $11
                WHERE id = $1
                "#,
            )
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
            .execute(&state.db)
            .await;

            if result.is_ok() {
                updated_count += 1;
            } else {
                failed_count += 1;
            }
        } else {
            let result = sqlx::query(
                r#"
                INSERT INTO plugin_srm.suppliers (id, supplier_no, name, legal_name, contact_person, 
                                                   phone, email, address, tax_id, status, 
                                                   risk_level, sync_from_scm, scm_supplier_id,
                                                   created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'low', TRUE, $11, $12, $13)
                "#,
            )
            .bind(id)
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
    >(
        r#"
        SELECT id, name, legal_name, contact_person, phone, email, address, tax_id, status
        FROM plugin_srm.suppliers
        WHERE id = $1 AND status != 'deleted'
        "#,
    )
    .bind(supplier_id)
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

    let existing_count =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM plugin_scm.suppliers WHERE id = $1")
            .bind(id)
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
        let result = sqlx::query(
            r#"
            UPDATE plugin_scm.suppliers SET name = $2, short_name = $3, contact_name = $4, 
                                         contact_phone = $5, email = $6, address = $7, 
                                         tax_number = $8, status = $9, sync_from_srm = TRUE,
                                         srm_supplier_id = $10, updated_at = $11
            WHERE id = $1
            "#,
        )
        .bind(id)
        .bind(&name)
        .bind(legal_name)
        .bind(contact_person)
        .bind(phone)
        .bind(email)
        .bind(address)
        .bind(tax_number)
        .bind(&status)
        .bind(id)
        .bind(now)
        .execute(&state.db)
        .await;

        match result {
            Ok(_) => {
                let _ = record_sync_log(
                    &state.db,
                    "supplier_sync",
                    "srm",
                    "scm",
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
            r#"
            INSERT INTO plugin_scm.suppliers (id, name, short_name, contact_name, contact_phone, 
                                           email, address, tax_number, status, sync_from_srm,
                                           srm_supplier_id, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, $10, $11, $12)
            "#,
        )
        .bind(id)
        .bind(&name)
        .bind(legal_name)
        .bind(contact_person)
        .bind(phone)
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
                    "supplier_sync",
                    "srm",
                    "scm",
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

async fn sync_all_suppliers_to_scm(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::VendorAssessmentWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

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
    >(
        r#"
        SELECT id, name, legal_name, contact_person, phone, email, address, tax_id, status
        FROM plugin_srm.suppliers
        WHERE status != 'deleted'
        "#,
    )
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
    let mut created_count = 0;
    let mut updated_count = 0;
    let mut failed_count = 0;
    let now = Utc::now();

    for (id, name, legal_name, contact_person, phone, email, address, tax_number, status) in
        srm_suppliers
    {
        let existing =
            sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM plugin_scm.suppliers WHERE id = $1")
                .bind(id)
                .fetch_one(&state.db)
                .await;

        if existing.unwrap_or(0) > 0 {
            let result = sqlx::query(
                r#"
                UPDATE plugin_scm.suppliers SET name = $2, short_name = $3, contact_name = $4, 
                                             contact_phone = $5, email = $6, address = $7, 
                                             tax_number = $8, status = $9, sync_from_srm = TRUE,
                                             srm_supplier_id = $10, updated_at = $11
                WHERE id = $1
                "#,
            )
            .bind(id)
            .bind(&name)
            .bind(legal_name)
            .bind(contact_person)
            .bind(phone)
            .bind(email)
            .bind(address)
            .bind(tax_number)
            .bind(&status)
            .bind(id)
            .bind(now)
            .execute(&state.db)
            .await;

            if result.is_ok() {
                updated_count += 1;
            } else {
                failed_count += 1;
            }
        } else {
            let result = sqlx::query(
                r#"
                INSERT INTO plugin_scm.suppliers (id, name, short_name, contact_name, contact_phone, 
                                               email, address, tax_number, status, sync_from_srm,
                                               srm_supplier_id, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, $10, $11, $12)
                "#,
            )
            .bind(id)
            .bind(&name)
            .bind(legal_name)
            .bind(contact_person)
            .bind(phone)
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

async fn get_sync_logs(
    State(state): State<Arc<AppState>>,
    Json(req): Json<SyncLogsRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = req.page.unwrap_or(1).max(1);
    let page_size = req.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let rows = sqlx::query(
        r#"
        SELECT id, tenant_id, sync_type, source_module, target_module, source_entity,
               source_id, source_code, target_id, target_code, operation, status,
               error_message, retry_count, executed_at, created_at
        FROM unified_core.inter_module_sync
        WHERE ($1::text IS NULL OR sync_type = $1)
          AND ($2::text IS NULL OR status = $2)
          AND ($3::text IS NULL OR source_module = $3)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#,
    )
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
    sqlx::query(
        r#"
        INSERT INTO unified_core.inter_module_sync 
            (tenant_id, sync_type, source_module, target_module, source_entity,
             source_id, source_code, target_id, target_code, operation, status,
             error_message, executed_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        "#,
    )
    .bind(Uuid::from_u128(1))
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

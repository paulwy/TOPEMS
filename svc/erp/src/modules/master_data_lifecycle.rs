//! V38.0 AC-10: 主数据生命周期管理（归档/恢复/销毁策略 + 合规审计）
//!
//! 提供主数据归档、恢复、安排销毁、取消销毁、执行销毁（软删除）功能，
//! 以及已归档和待销毁主数据列表查询。
//! 从 master_data_refs.rs 拆分。

use axum::extract::{Extension, Path, Query, State};
use axum::Json;
use serde::Deserialize;
use topems_shared::ApiResponse;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::PaginatedResponse;
use utoipa::IntoParams;

use super::master_data_refs::{MasterDataRef, MasterDataRow};
use super::ApiState;

#[derive(Debug, Deserialize)]
pub struct ArchiveRequest {
    pub reason: String,
    pub archived_by: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RestoreRequest {
    pub restored_by: Option<String>,
    pub reason: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ScheduleDestructionRequest {
    pub scheduled_at: Option<chrono::DateTime<chrono::Utc>>,
    pub reason: String,
    pub scheduled_by: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct DestroyRequest {
    pub destroyed_by: Option<String>,
    pub reason: Option<String>,
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct LifecycleQuery {
    pub domain: Option<String>,
    pub keyword: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

/// V38.0 AC-10: 内部辅助函数 - 记录生命周期审计事件
async fn record_lifecycle_audit(
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    master_data_id: &str,
    domain: &str,
    action: &str,
    changed_by: Option<&str>,
    old_status: &str,
    new_status: &str,
    reason: Option<&str>,
) {
    let id = uuid::Uuid::new_v4();
    let now = chrono::Utc::now();
    let old_values = serde_json::json!({
        "status": old_status,
    });
    let mut new_values = serde_json::json!({
        "status": new_status,
    });
    if let Some(r) = reason {
        new_values["reason"] = serde_json::json!(r);
    }

    let _ = sqlx::query(only_own_schema_query!(
        "erp",
        r#"INSERT INTO erp_master_data_audit_trail
           (id, master_data_id, domain, action, source_service, target_service,
            changed_by, old_values, new_values, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)"#
    ))
    .bind(id)
    .bind(master_data_id)
    .bind(domain)
    .bind(action)
    .bind("erp")
    .bind("erp")
    .bind(changed_by)
    .bind(old_values)
    .bind(new_values)
    .bind(now)
    .execute(&mut **txn)
    .await;
}

/// V38.0 AC-10: 归档主数据引用
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:master-data:read"])),
    path = "/api/erp/master-data-refs/{master_data_id}/archive",
    tag = "Master Data",
    operation_id = "archive_master_data_ref",
    responses((status = 200, description = "OK")),
)]
pub async fn archive_master_data_ref(
    State(state): State<ApiState>,
    Path(master_data_id): Path<String>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<ArchiveRequest>,
) -> Json<ApiResponse<MasterDataRef>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let now = chrono::Utc::now();

    let row = sqlx::query_as::<_, MasterDataRow>(only_own_schema_query!(
        "erp",
        r#"SELECT * FROM erp.erp_master_data_refs WHERE master_data_id = $1"#
    ))
    .bind(&master_data_id)
    .fetch_optional(&mut **txn)
    .await;

    match row {
        Ok(Some(existing)) => {
            if existing.status == "archived" {
                return Json(ApiResponse::error(400, "主数据已处于归档状态"));
            }
            if existing.status == "destroyed" {
                return Json(ApiResponse::error(400, "已销毁的主数据无法归档"));
            }

            let old_status = existing.status.clone();
            let domain = existing.domain.clone();

            let result = sqlx::query(only_own_schema_query!(
                "erp",
                r#"UPDATE erp.erp_master_data_refs
                   SET status = 'archived',
                       archived_at = $1,
                       archived_by = $2,
                       archive_reason = $3,
                       updated_at = $4
                   WHERE master_data_id = $5"#
            ))
            .bind(now)
            .bind(&req.archived_by)
            .bind(&req.reason)
            .bind(now)
            .bind(&master_data_id)
            .execute(&mut **txn)
            .await;

            match result {
                Ok(_) => {
                    record_lifecycle_audit(
                        txn,
                        &master_data_id,
                        &domain,
                        "archive",
                        req.archived_by.as_deref(),
                        &old_status,
                        "archived",
                        Some(&req.reason),
                    )
                    .await;

                    let updated = sqlx::query_as::<_, MasterDataRow>(only_own_schema_query!(
                        "erp",
                        r#"SELECT * FROM erp.erp_master_data_refs WHERE master_data_id = $1"#
                    ))
                    .bind(&master_data_id)
                    .fetch_one(&mut **txn)
                    .await;

                    match updated {
                        Ok(row) => {
                            if let Some(t) = guard.take() {
                                if let Err(e) = t.commit().await {
                                    tracing::error!("事务提交失败: {}", e);
                                    return Json(ApiResponse::error(500, "事务提交失败"));
                                }
                            }
                            Json(ApiResponse::success(row.into(), "主数据归档成功"))
                        }
                        Err(e) => {
                            tracing::warn!("[erp-mdm] 查询归档后数据失败: {}", e);
                            Json(ApiResponse::error(500, "归档成功但查询失败"))
                        }
                    }
                }
                Err(e) => {
                    tracing::warn!("[erp-mdm] 归档主数据失败: {}", e);
                    Json(ApiResponse::error(500, &format!("归档失败: {}", e)))
                }
            }
        }
        Ok(None) => Json(ApiResponse::error(404, "未找到主数据引用")),
        Err(e) => {
            tracing::warn!("[erp-mdm] 查询主数据失败: {}", e);
            Json(ApiResponse::error(500, &format!("查询失败: {}", e)))
        }
    }
}

/// V38.0 AC-10: 恢复已归档的主数据引用
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:master-data:read"])),
    path = "/api/erp/master-data-refs/{master_data_id}/restore",
    tag = "Master Data",
    operation_id = "restore_master_data_ref",
    responses((status = 200, description = "OK")),
)]
pub async fn restore_master_data_ref(
    State(state): State<ApiState>,
    Path(master_data_id): Path<String>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<RestoreRequest>,
) -> Json<ApiResponse<MasterDataRef>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let now = chrono::Utc::now();

    let row = sqlx::query_as::<_, MasterDataRow>(only_own_schema_query!(
        "erp",
        r#"SELECT * FROM erp.erp_master_data_refs WHERE master_data_id = $1"#
    ))
    .bind(&master_data_id)
    .fetch_optional(&mut **txn)
    .await;

    match row {
        Ok(Some(existing)) => {
            if existing.status != "archived" {
                return Json(ApiResponse::error(400, "只有已归档的主数据才能恢复"));
            }

            let old_status = existing.status.clone();
            let domain = existing.domain.clone();

            let result = sqlx::query(only_own_schema_query!(
                "erp",
                r#"UPDATE erp.erp_master_data_refs
                   SET status = 'active',
                       archived_at = NULL,
                       archived_by = NULL,
                       archive_reason = NULL,
                       updated_at = $1
                   WHERE master_data_id = $2"#
            ))
            .bind(now)
            .bind(&master_data_id)
            .execute(&mut **txn)
            .await;

            match result {
                Ok(_) => {
                    record_lifecycle_audit(
                        txn,
                        &master_data_id,
                        &domain,
                        "restore",
                        req.restored_by.as_deref(),
                        &old_status,
                        "active",
                        req.reason.as_deref(),
                    )
                    .await;

                    let updated = sqlx::query_as::<_, MasterDataRow>(only_own_schema_query!(
                        "erp",
                        r#"SELECT * FROM erp.erp_master_data_refs WHERE master_data_id = $1"#
                    ))
                    .bind(&master_data_id)
                    .fetch_one(&mut **txn)
                    .await;

                    match updated {
                        Ok(row) => {
                            if let Some(t) = guard.take() {
                                if let Err(e) = t.commit().await {
                                    tracing::error!("事务提交失败: {}", e);
                                    return Json(ApiResponse::error(500, "事务提交失败"));
                                }
                            }
                            Json(ApiResponse::success(row.into(), "主数据恢复成功"))
                        }
                        Err(e) => {
                            tracing::warn!("[erp-mdm] 查询恢复后数据失败: {}", e);
                            Json(ApiResponse::error(500, "恢复成功但查询失败"))
                        }
                    }
                }
                Err(e) => {
                    tracing::warn!("[erp-mdm] 恢复主数据失败: {}", e);
                    Json(ApiResponse::error(500, &format!("恢复失败: {}", e)))
                }
            }
        }
        Ok(None) => Json(ApiResponse::error(404, "未找到主数据引用")),
        Err(e) => {
            tracing::warn!("[erp-mdm] 查询主数据失败: {}", e);
            Json(ApiResponse::error(500, &format!("查询失败: {}", e)))
        }
    }
}

/// V38.0 AC-10: 安排销毁计划
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/api/erp/master-data-refs/{master_data_id}/schedule-destruction",
    tag = "Master Data",
    operation_id = "schedule_destruction",
    responses((status = 200, description = "OK")),
)]
pub async fn schedule_destruction(
    State(state): State<ApiState>,
    Path(master_data_id): Path<String>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<ScheduleDestructionRequest>,
) -> Json<ApiResponse<MasterDataRef>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let now = chrono::Utc::now();
    let scheduled_at = req
        .scheduled_at
        .unwrap_or_else(|| now + chrono::Duration::days(30));

    let row = sqlx::query_as::<_, MasterDataRow>(only_own_schema_query!(
        "erp",
        r#"SELECT * FROM erp.erp_master_data_refs WHERE master_data_id = $1"#
    ))
    .bind(&master_data_id)
    .fetch_optional(&mut **txn)
    .await;

    match row {
        Ok(Some(existing)) => {
            if existing.status == "destroyed" {
                return Json(ApiResponse::error(400, "已销毁的主数据无法安排销毁计划"));
            }

            let old_status = existing.status.clone();
            let domain = existing.domain.clone();

            let result = sqlx::query(only_own_schema_query!(
                "erp",
                r#"UPDATE erp.erp_master_data_refs
                   SET status = 'pending_destruction',
                       destroy_scheduled_at = $1,
                       destroy_reason = $2,
                       destroy_scheduled_by = $3,
                       updated_at = $4
                   WHERE master_data_id = $5"#
            ))
            .bind(scheduled_at)
            .bind(&req.reason)
            .bind(&req.scheduled_by)
            .bind(now)
            .bind(&master_data_id)
            .execute(&mut **txn)
            .await;

            match result {
                Ok(_) => {
                    record_lifecycle_audit(
                        txn,
                        &master_data_id,
                        &domain,
                        "schedule_destruction",
                        req.scheduled_by.as_deref(),
                        &old_status,
                        "pending_destruction",
                        Some(&req.reason),
                    )
                    .await;

                    let updated = sqlx::query_as::<_, MasterDataRow>(only_own_schema_query!(
                        "erp",
                        r#"SELECT * FROM erp.erp_master_data_refs WHERE master_data_id = $1"#
                    ))
                    .bind(&master_data_id)
                    .fetch_one(&mut **txn)
                    .await;

                    match updated {
                        Ok(row) => {
                            if let Some(t) = guard.take() {
                                if let Err(e) = t.commit().await {
                                    tracing::error!("事务提交失败: {}", e);
                                    return Json(ApiResponse::error(500, "事务提交失败"));
                                }
                            }
                            Json(ApiResponse::success(row.into(), "销毁计划已安排"))
                        }
                        Err(e) => {
                            tracing::warn!("[erp-mdm] 查询销毁计划数据失败: {}", e);
                            Json(ApiResponse::error(500, "计划安排成功但查询失败"))
                        }
                    }
                }
                Err(e) => {
                    tracing::warn!("[erp-mdm] 安排销毁计划失败: {}", e);
                    Json(ApiResponse::error(500, &format!("安排失败: {}", e)))
                }
            }
        }
        Ok(None) => Json(ApiResponse::error(404, "未找到主数据引用")),
        Err(e) => {
            tracing::warn!("[erp-mdm] 查询主数据失败: {}", e);
            Json(ApiResponse::error(500, &format!("查询失败: {}", e)))
        }
    }
}

/// V38.0 AC-10: 取消销毁计划
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/api/erp/master-data-refs/{master_data_id}/cancel-destruction",
    tag = "Master Data",
    operation_id = "cancel_destruction",
    responses((status = 200, description = "OK")),
)]
pub async fn cancel_destruction(
    State(state): State<ApiState>,
    Path(master_data_id): Path<String>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<MasterDataRef>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let now = chrono::Utc::now();

    let row = sqlx::query_as::<_, MasterDataRow>(only_own_schema_query!(
        "erp",
        r#"SELECT * FROM erp.erp_master_data_refs WHERE master_data_id = $1"#
    ))
    .bind(&master_data_id)
    .fetch_optional(&mut **txn)
    .await;

    match row {
        Ok(Some(existing)) => {
            if existing.status != "pending_destruction" {
                return Json(ApiResponse::error(
                    400,
                    "只有待销毁状态的主数据才能取消销毁计划",
                ));
            }

            let old_status = existing.status.clone();
            let domain = existing.domain.clone();

            let result = sqlx::query(only_own_schema_query!(
                "erp",
                r#"UPDATE erp.erp_master_data_refs
                   SET status = 'active',
                       destroy_scheduled_at = NULL,
                       destroy_reason = NULL,
                       destroy_scheduled_by = NULL,
                       updated_at = $1
                   WHERE master_data_id = $2"#
            ))
            .bind(now)
            .bind(&master_data_id)
            .execute(&mut **txn)
            .await;

            match result {
                Ok(_) => {
                    record_lifecycle_audit(
                        txn,
                        &master_data_id,
                        &domain,
                        "cancel_destruction",
                        None,
                        &old_status,
                        "active",
                        None,
                    )
                    .await;

                    let updated = sqlx::query_as::<_, MasterDataRow>(only_own_schema_query!(
                        "erp",
                        r#"SELECT * FROM erp.erp_master_data_refs WHERE master_data_id = $1"#
                    ))
                    .bind(&master_data_id)
                    .fetch_one(&mut **txn)
                    .await;

                    match updated {
                        Ok(row) => {
                            if let Some(t) = guard.take() {
                                if let Err(e) = t.commit().await {
                                    tracing::error!("事务提交失败: {}", e);
                                    return Json(ApiResponse::error(500, "事务提交失败"));
                                }
                            }
                            Json(ApiResponse::success(row.into(), "销毁计划已取消"))
                        }
                        Err(e) => {
                            tracing::warn!("[erp-mdm] 查询取消销毁后数据失败: {}", e);
                            Json(ApiResponse::error(500, "取消成功但查询失败"))
                        }
                    }
                }
                Err(e) => {
                    tracing::warn!("[erp-mdm] 取消销毁计划失败: {}", e);
                    Json(ApiResponse::error(500, &format!("取消失败: {}", e)))
                }
            }
        }
        Ok(None) => Json(ApiResponse::error(404, "未找到主数据引用")),
        Err(e) => {
            tracing::warn!("[erp-mdm] 查询主数据失败: {}", e);
            Json(ApiResponse::error(500, &format!("查询失败: {}", e)))
        }
    }
}

/// V38.0 AC-10: 执行销毁（软删除）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:master-data:read"])),
    path = "/api/erp/master-data-refs/{master_data_id}/destroy",
    tag = "Master Data",
    operation_id = "destroy_master_data_ref",
    responses((status = 200, description = "OK")),
)]
pub async fn destroy_master_data_ref(
    State(state): State<ApiState>,
    Path(master_data_id): Path<String>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<DestroyRequest>,
) -> Json<ApiResponse<MasterDataRef>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let now = chrono::Utc::now();

    let row = sqlx::query_as::<_, MasterDataRow>(only_own_schema_query!(
        "erp",
        r#"SELECT * FROM erp.erp_master_data_refs WHERE master_data_id = $1"#
    ))
    .bind(&master_data_id)
    .fetch_optional(&mut **txn)
    .await;

    match row {
        Ok(Some(existing)) => {
            if existing.status == "destroyed" {
                return Json(ApiResponse::error(400, "主数据已处于销毁状态"));
            }

            let old_status = existing.status.clone();
            let domain = existing.domain.clone();

            let result = sqlx::query(only_own_schema_query!(
                "erp",
                r#"UPDATE erp.erp_master_data_refs
                   SET status = 'destroyed',
                       destroyed_at = $1,
                       destroyed_by = $2,
                       destroy_reason = COALESCE($3, destroy_reason),
                       updated_at = $4
                   WHERE master_data_id = $5"#
            ))
            .bind(now)
            .bind(&req.destroyed_by)
            .bind(&req.reason)
            .bind(now)
            .bind(&master_data_id)
            .execute(&mut **txn)
            .await;

            match result {
                Ok(_) => {
                    record_lifecycle_audit(
                        txn,
                        &master_data_id,
                        &domain,
                        "destroy",
                        req.destroyed_by.as_deref(),
                        &old_status,
                        "destroyed",
                        req.reason.as_deref(),
                    )
                    .await;

                    let updated = sqlx::query_as::<_, MasterDataRow>(only_own_schema_query!(
                        "erp",
                        r#"SELECT * FROM erp.erp_master_data_refs WHERE master_data_id = $1"#
                    ))
                    .bind(&master_data_id)
                    .fetch_one(&mut **txn)
                    .await;

                    match updated {
                        Ok(row) => {
                            if let Some(t) = guard.take() {
                                if let Err(e) = t.commit().await {
                                    tracing::error!("事务提交失败: {}", e);
                                    return Json(ApiResponse::error(500, "事务提交失败"));
                                }
                            }
                            Json(ApiResponse::success(row.into(), "主数据已销毁（软删除）"))
                        }
                        Err(e) => {
                            tracing::warn!("[erp-mdm] 查询销毁后数据失败: {}", e);
                            Json(ApiResponse::error(500, "销毁成功但查询失败"))
                        }
                    }
                }
                Err(e) => {
                    tracing::warn!("[erp-mdm] 销毁主数据失败: {}", e);
                    Json(ApiResponse::error(500, &format!("销毁失败: {}", e)))
                }
            }
        }
        Ok(None) => Json(ApiResponse::error(404, "未找到主数据引用")),
        Err(e) => {
            tracing::warn!("[erp-mdm] 查询主数据失败: {}", e);
            Json(ApiResponse::error(500, &format!("查询失败: {}", e)))
        }
    }
}

/// V38.0 AC-10: 列出已归档的主数据引用
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/api/erp/master-data-refs/archived",
    tag = "Master Data",
    operation_id = "list_archived",
    params(LifecycleQuery),
    responses((status = 200, description = "OK")),
)]
pub async fn list_archived(
    State(state): State<ApiState>,
    Query(params): Query<LifecycleQuery>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<PaginatedResponse<MasterDataRef>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let mut sql = String::from("SELECT * FROM erp.erp_master_data_refs WHERE status = 'archived'");
    let mut binds: Vec<String> = Vec::new();
    let mut param_idx = 1;

    if let Some(ref domain) = params.domain {
        sql.push_str(&format!(" AND domain = ${}", param_idx));
        binds.push(domain.clone());
        param_idx += 1;
    }

    if let Some(ref keyword) = params.keyword {
        sql.push_str(&format!(
            " AND (code ILIKE ${} OR name ILIKE ${})",
            param_idx,
            param_idx + 1
        ));
        let pattern = format!("%{}%", keyword);
        binds.push(pattern.clone());
        binds.push(pattern);
        param_idx += 2;
    }

    sql.push_str(&format!(
        " ORDER BY archived_at DESC LIMIT ${} OFFSET ${}",
        param_idx,
        param_idx + 1
    ));
    binds.push(page_size.to_string());
    binds.push(offset.to_string());

    let mut query = sqlx::query_as::<_, MasterDataRow>(&sql);
    for bind in &binds {
        query = query.bind(bind);
    }

    let rows = query.fetch_all(&mut **txn).await;

    match rows {
        Ok(data) => {
            let total = data.len() as i64;
            let items: Vec<MasterDataRef> = data.into_iter().map(Into::into).collect();
            Json(ApiResponse::success(
                PaginatedResponse::new(items, total, page, page_size),
                "已归档主数据列表",
            ))
        }
        Err(e) => {
            tracing::warn!("[erp-mdm] 查询已归档主数据失败: {}", e);
            Json(ApiResponse::success(
                PaginatedResponse::new(vec![], 0, page, page_size),
                "已归档主数据列表（空）",
            ))
        }
    }
}

/// V38.0 AC-10: 列出待销毁的主数据引用
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/api/erp/master-data-refs/pending-destruction",
    tag = "Master Data",
    operation_id = "list_pending_destruction",
    params(LifecycleQuery),
    responses((status = 200, description = "OK")),
)]
pub async fn list_pending_destruction(
    State(state): State<ApiState>,
    Query(params): Query<LifecycleQuery>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<PaginatedResponse<MasterDataRef>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let mut sql =
        String::from("SELECT * FROM erp.erp_master_data_refs WHERE status = 'pending_destruction'");
    let mut binds: Vec<String> = Vec::new();
    let mut param_idx = 1;

    if let Some(ref domain) = params.domain {
        sql.push_str(&format!(" AND domain = ${}", param_idx));
        binds.push(domain.clone());
        param_idx += 1;
    }

    if let Some(ref keyword) = params.keyword {
        sql.push_str(&format!(
            " AND (code ILIKE ${} OR name ILIKE ${})",
            param_idx,
            param_idx + 1
        ));
        let pattern = format!("%{}%", keyword);
        binds.push(pattern.clone());
        binds.push(pattern);
        param_idx += 2;
    }

    sql.push_str(&format!(
        " ORDER BY destroy_scheduled_at ASC LIMIT ${} OFFSET ${}",
        param_idx,
        param_idx + 1
    ));
    binds.push(page_size.to_string());
    binds.push(offset.to_string());

    let mut query = sqlx::query_as::<_, MasterDataRow>(&sql);
    for bind in &binds {
        query = query.bind(bind);
    }

    let rows = query.fetch_all(&mut **txn).await;

    match rows {
        Ok(data) => {
            let total = data.len() as i64;
            let items: Vec<MasterDataRef> = data.into_iter().map(Into::into).collect();
            Json(ApiResponse::success(
                PaginatedResponse::new(items, total, page, page_size),
                "待销毁主数据列表",
            ))
        }
        Err(e) => {
            tracing::warn!("[erp-mdm] 查询待销毁主数据失败: {}", e);
            Json(ApiResponse::success(
                PaginatedResponse::new(vec![], 0, page, page_size),
                "待销毁主数据列表（空）",
            ))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_archive_request_deserialize() {
        let json = r#"{"reason": "数据过期", "archived_by": "admin"}"#;
        let request: ArchiveRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.reason, "数据过期");
        assert_eq!(request.archived_by.as_deref(), Some("admin"));
    }

    #[test]
    fn test_restore_request_deserialize() {
        let json = r#"{"restored_by": "admin", "reason": "需要恢复"}"#;
        let request: RestoreRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.restored_by.as_deref(), Some("admin"));
        assert_eq!(request.reason.as_deref(), Some("需要恢复"));
    }

    #[test]
    fn test_schedule_destruction_request_deserialize() {
        let json = r#"{"reason": "合规要求", "scheduled_by": "admin"}"#;
        let request: ScheduleDestructionRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.reason, "合规要求");
        assert_eq!(request.scheduled_by.as_deref(), Some("admin"));
        assert!(request.scheduled_at.is_none());
    }

    #[test]
    fn test_destroy_request_deserialize() {
        let json = r#"{"destroyed_by": "admin", "reason": "数据销毁"}"#;
        let request: DestroyRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.destroyed_by.as_deref(), Some("admin"));
        assert_eq!(request.reason.as_deref(), Some("数据销毁"));
    }

    #[test]
    fn test_lifecycle_query_deserialize() {
        let query = "domain=customer&keyword=test&page=1&page_size=20";
        let params: LifecycleQuery = serde_urlencoded::from_str(query).unwrap();
        assert_eq!(params.domain.as_deref(), Some("customer"));
        assert_eq!(params.keyword.as_deref(), Some("test"));
        assert_eq!(params.page, Some(1));
        assert_eq!(params.page_size, Some(20));
    }

    #[test]
    fn test_lifecycle_query_default() {
        let query = "";
        let params: LifecycleQuery = serde_urlencoded::from_str(query).unwrap();
        assert!(params.domain.is_none());
        assert!(params.keyword.is_none());
        assert!(params.page.is_none());
        assert!(params.page_size.is_none());
    }
}

//! V36.0 AC-8: 主数据版本管理 + 回滚能力
//!
//! 记录主数据版本快照，支持查询版本历史、获取版本详情和回滚到指定版本。
//! 从 master_data_refs.rs 拆分。

use axum::extract::{Extension, Path, Query, State};
use axum::Json;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use topems_shared::ApiResponse;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::PaginatedResponse;
use utoipa::IntoParams;

use super::ApiState;

#[derive(Debug, Serialize)]
pub struct MasterDataVersion {
    pub id: String,
    pub master_data_id: String,
    pub version_number: i32,
    pub domain: String,
    pub code: String,
    pub name: Option<String>,
    pub status: String,
    pub snapshot: serde_json::Value,
    pub changed_by: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct RecordVersionRequest {
    pub domain: String,
    pub code: String,
    pub name: Option<String>,
    pub status: String,
    pub snapshot: serde_json::Value,
    pub changed_by: Option<String>,
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct VersionQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

/// 记录主数据版本快照
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/api/erp/master-data-refs/{master_data_id}/versions",
    tag = "Master Data",
    operation_id = "record_version",
    responses((status = 200, description = "OK")),
)]
pub async fn record_version(
    State(_state): State<ApiState>,
    Path(master_data_id): Path<String>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<RecordVersionRequest>,
) -> Json<ApiResponse<MasterDataVersion>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let id = uuid::Uuid::new_v4();
    let now = chrono::Utc::now();

    // 获取当前最大版本号，新版本 = max + 1
    let max_version: i32 = sqlx::query_scalar(
        only_own_schema_query!("erp", r#"SELECT COALESCE(MAX(version_number), 0) FROM erp_master_data_versions WHERE master_data_id = $1"#),
    )
    .bind(&master_data_id)
    .fetch_one(&mut **txn)
    .await
    .unwrap_or(0);

    let new_version = max_version + 1;

    let result = sqlx::query(
        only_own_schema_query!("erp", r#"INSERT INTO erp_master_data_versions
           (id, master_data_id, version_number, domain, code, name, status, snapshot, changed_by, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)"#),
    )
    .bind(id)
    .bind(&master_data_id)
    .bind(new_version)
    .bind(&req.domain)
    .bind(&req.code)
    .bind(&req.name)
    .bind(&req.status)
    .bind(&req.snapshot)
    .bind(&req.changed_by)
    .bind(now)
    .execute(&mut **txn)
    .await;

    match result {
        Ok(_) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return Json(ApiResponse::error(500, "事务提交失败"));
                }
            }
            Json(ApiResponse::success(
                MasterDataVersion {
                    id: id.to_string(),
                    master_data_id,
                    version_number: new_version,
                    domain: req.domain,
                    code: req.code,
                    name: req.name,
                    status: req.status,
                    snapshot: req.snapshot,
                    changed_by: req.changed_by,
                    created_at: now.to_rfc3339(),
                },
                "版本记录成功",
            ))
        }
        Err(e) => {
            tracing::warn!("[erp-mdm] 记录版本失败: {}", e);
            Json(ApiResponse::error(500, &format!("记录版本失败: {}", e)))
        }
    }
}

/// 查询主数据版本历史
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/api/erp/master-data-refs/{master_data_id}/versions",
    tag = "Master Data",
    operation_id = "get_versions",
    params(VersionQuery),
    responses((status = 200, description = "OK")),
)]
pub async fn get_versions(
    State(_state): State<ApiState>,
    Path(master_data_id): Path<String>,
    Query(params): Query<VersionQuery>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<PaginatedResponse<MasterDataVersion>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let rows = sqlx::query(only_own_schema_query!(
        "erp",
        r#"SELECT id, master_data_id, version_number, domain, code, name, status,
                  snapshot, changed_by, created_at
           FROM erp_master_data_versions
           WHERE master_data_id = $1
           ORDER BY version_number DESC
           LIMIT $2 OFFSET $3"#
    ))
    .bind(&master_data_id)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match rows {
        Ok(rows) => {
            let items: Vec<MasterDataVersion> = rows
                .iter()
                .map(|r| MasterDataVersion {
                    id: r
                        .try_get::<uuid::Uuid, _>("id")
                        .unwrap_or_default()
                        .to_string(),
                    master_data_id: r.try_get::<String, _>("master_data_id").unwrap_or_default(),
                    version_number: r.try_get::<i32, _>("version_number").unwrap_or(0),
                    domain: r.try_get::<String, _>("domain").unwrap_or_default(),
                    code: r.try_get::<String, _>("code").unwrap_or_default(),
                    name: r.try_get::<Option<String>, _>("name").ok().flatten(),
                    status: r.try_get::<String, _>("status").unwrap_or_default(),
                    snapshot: r
                        .try_get::<serde_json::Value, _>("snapshot")
                        .unwrap_or_default(),
                    changed_by: r.try_get::<Option<String>, _>("changed_by").ok().flatten(),
                    created_at: r
                        .try_get::<chrono::DateTime<chrono::Utc>, _>("created_at")
                        .unwrap_or_else(|_| chrono::Utc::now())
                        .to_rfc3339(),
                })
                .collect();
            let total = items.len() as i64;
            Json(ApiResponse::success(
                PaginatedResponse::new(items, total, page, page_size),
                "版本历史列表",
            ))
        }
        Err(e) => {
            tracing::warn!("[erp-mdm] 查询版本历史失败: {}", e);
            Json(ApiResponse::success(
                PaginatedResponse::new(vec![], 0, page, page_size),
                "版本历史列表（空）",
            ))
        }
    }
}

/// 获取特定版本详情
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/api/erp/master-data-refs/{master_data_id}/versions/{version_id}",
    tag = "Master Data",
    operation_id = "get_version",
    responses((status = 200, description = "OK")),
)]
pub async fn get_version(
    State(_state): State<ApiState>,
    Path((master_data_id, version_id)): Path<(String, String)>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<MasterDataVersion>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let rows = sqlx::query(only_own_schema_query!(
        "erp",
        r#"SELECT id, master_data_id, version_number, domain, code, name, status,
                  snapshot, changed_by, created_at
           FROM erp_master_data_versions
           WHERE master_data_id = $1 AND id = $2"#
    ))
    .bind(&master_data_id)
    .bind(&version_id)
    .fetch_optional(&mut **txn)
    .await;

    match rows {
        Ok(Some(row)) => Json(ApiResponse::success(
            MasterDataVersion {
                id: row
                    .try_get::<uuid::Uuid, _>("id")
                    .unwrap_or_default()
                    .to_string(),
                master_data_id: row
                    .try_get::<String, _>("master_data_id")
                    .unwrap_or_default(),
                version_number: row.try_get::<i32, _>("version_number").unwrap_or(0),
                domain: row.try_get::<String, _>("domain").unwrap_or_default(),
                code: row.try_get::<String, _>("code").unwrap_or_default(),
                name: row.try_get::<Option<String>, _>("name").ok().flatten(),
                status: row.try_get::<String, _>("status").unwrap_or_default(),
                snapshot: row
                    .try_get::<serde_json::Value, _>("snapshot")
                    .unwrap_or_default(),
                changed_by: row
                    .try_get::<Option<String>, _>("changed_by")
                    .ok()
                    .flatten(),
                created_at: row
                    .try_get::<chrono::DateTime<chrono::Utc>, _>("created_at")
                    .unwrap_or_else(|_| chrono::Utc::now())
                    .to_rfc3339(),
            },
            "版本详情",
        )),
        Ok(None) => Json(ApiResponse::error(404, "未找到版本")),
        Err(e) => {
            tracing::warn!("[erp-mdm] 查询版本详情失败: {}", e);
            Json(ApiResponse::error(500, &format!("查询版本失败: {}", e)))
        }
    }
}

/// 回滚到指定版本
/// 将版本快照写回到 erp_master_data_refs 表，并记录新的版本快照
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/api/erp/master-data-refs/{master_data_id}/versions/{version_id}/rollback",
    tag = "Master Data",
    operation_id = "rollback_to_version",
    responses((status = 200, description = "OK")),
)]
pub async fn rollback_to_version(
    State(_state): State<ApiState>,
    Path((master_data_id, version_id)): Path<(String, String)>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    // 1. 获取目标版本快照
    let version_row = sqlx::query(only_own_schema_query!(
        "erp",
        r#"SELECT version_number, domain, code, name, status, snapshot
           FROM erp_master_data_versions
           WHERE master_data_id = $1 AND id = $2"#
    ))
    .bind(&master_data_id)
    .bind(&version_id)
    .fetch_optional(&mut **txn)
    .await;

    match version_row {
        Ok(Some(row)) => {
            let target_version: i32 = row.try_get("version_number").unwrap_or(0);
            let domain: String = row.try_get("domain").unwrap_or_default();
            let code: String = row.try_get("code").unwrap_or_default();
            let name: Option<String> = row.try_get("name").ok().flatten();
            let status: String = row.try_get("status").unwrap_or_default();
            let snapshot: serde_json::Value = row.try_get("snapshot").unwrap_or_default();
            let now = chrono::Utc::now();

            // 2. 更新 erp_master_data_refs 表（回滚数据）
            let update_result = sqlx::query(only_own_schema_query!(
                "erp",
                r#"UPDATE erp.erp_master_data_refs
                   SET name = $1, status = $2, updated_at = $3, last_synced_at = $3
                   WHERE master_data_id = $4"#
            ))
            .bind(&name)
            .bind(&status)
            .bind(now)
            .bind(&master_data_id)
            .execute(&mut **txn)
            .await;

            if let Err(e) = update_result {
                tracing::warn!("[erp-mdm] 回滚更新失败: {}", e);
                return Json(ApiResponse::error(500, &format!("回滚更新失败: {}", e)));
            }

            // 3. 记录回滚版本快照（新版本 = max + 1）
            let new_id = uuid::Uuid::new_v4();
            let max_version: i32 = sqlx::query_scalar(
                only_own_schema_query!("erp", r#"SELECT COALESCE(MAX(version_number), 0) FROM erp_master_data_versions WHERE master_data_id = $1"#),
            )
            .bind(&master_data_id)
            .fetch_one(&mut **txn)
            .await
            .unwrap_or(0);
            let new_version = max_version + 1;

            let _ = sqlx::query(
                only_own_schema_query!("erp", r#"INSERT INTO erp_master_data_versions
                   (id, master_data_id, version_number, domain, code, name, status, snapshot, changed_by, created_at)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)"#),
            )
            .bind(new_id)
            .bind(&master_data_id)
            .bind(new_version)
            .bind(&domain)
            .bind(&code)
            .bind(&name)
            .bind(&status)
            .bind(&snapshot)
            .bind(format!("rollback from v{}", target_version))
            .bind(now)
            .execute(&mut **txn)
            .await;

            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return Json(ApiResponse::error(500, "事务提交失败"));
                }
            }
            Json(ApiResponse::success(
                serde_json::json!({
                    "rolled_back_to_version": target_version,
                    "new_version_number": new_version,
                    "master_data_id": master_data_id,
                    "domain": domain,
                    "code": code,
                    "status": status,
                    "rolled_back_at": now.to_rfc3339(),
                }),
                &format!("成功回滚到版本 v{}", target_version),
            ))
        }
        Ok(None) => Json(ApiResponse::error(404, "未找到要回滚的版本")),
        Err(e) => {
            tracing::warn!("[erp-mdm] 回滚查询失败: {}", e);
            Json(ApiResponse::error(500, &format!("回滚查询失败: {}", e)))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_master_data_version_serialization() {
        let version = MasterDataVersion {
            id: "v1".to_string(),
            master_data_id: "md1".to_string(),
            version_number: 1,
            domain: "customer".to_string(),
            code: "CUST001".to_string(),
            name: Some("测试客户".to_string()),
            status: "active".to_string(),
            snapshot: serde_json::json!({"name": "测试客户"}),
            changed_by: Some("admin".to_string()),
            created_at: "2024-01-01T00:00:00Z".to_string(),
        };
        let json = serde_json::to_value(&version).unwrap();
        assert_eq!(json["id"], "v1");
        assert_eq!(json["master_data_id"], "md1");
        assert_eq!(json["version_number"], 1);
        assert_eq!(json["domain"], "customer");
        assert_eq!(json["code"], "CUST001");
        assert_eq!(json["name"], "测试客户");
        assert_eq!(json["status"], "active");
        assert_eq!(json["changed_by"], "admin");
        assert_eq!(json["created_at"], "2024-01-01T00:00:00Z");
    }

    #[test]
    fn test_master_data_version_minimal() {
        let version = MasterDataVersion {
            id: "v2".to_string(),
            master_data_id: "md2".to_string(),
            version_number: 2,
            domain: "product".to_string(),
            code: "PROD001".to_string(),
            name: None,
            status: "inactive".to_string(),
            snapshot: serde_json::json!({}),
            changed_by: None,
            created_at: "2024-01-02T00:00:00Z".to_string(),
        };
        let json = serde_json::to_value(&version).unwrap();
        assert_eq!(json["id"], "v2");
        assert_eq!(json["version_number"], 2);
        assert_eq!(json["domain"], "product");
        assert!(json["name"].is_null());
        assert_eq!(json["status"], "inactive");
        assert!(json["changed_by"].is_null());
    }

    #[test]
    fn test_record_version_request_deserialize() {
        let json = r#"{
            "domain": "customer",
            "code": "CUST001",
            "name": "测试客户",
            "status": "active",
            "snapshot": {"name": "测试客户"},
            "changed_by": "admin"
        }"#;
        let request: RecordVersionRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.domain, "customer");
        assert_eq!(request.code, "CUST001");
        assert_eq!(request.name.as_deref(), Some("测试客户"));
        assert_eq!(request.status, "active");
        assert_eq!(request.snapshot["name"], "测试客户");
        assert_eq!(request.changed_by.as_deref(), Some("admin"));
    }

    #[test]
    fn test_record_version_request_minimal() {
        let json = r#"{
            "domain": "product",
            "code": "PROD001",
            "status": "active",
            "snapshot": {}
        }"#;
        let request: RecordVersionRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.domain, "product");
        assert_eq!(request.code, "PROD001");
        assert!(request.name.is_none());
        assert_eq!(request.status, "active");
        assert!(request.changed_by.is_none());
    }

    #[test]
    fn test_version_query_deserialize() {
        let query = "page=1&page_size=20";
        let params: VersionQuery = serde_urlencoded::from_str(query).unwrap();
        assert_eq!(params.page, Some(1));
        assert_eq!(params.page_size, Some(20));
    }

    #[test]
    fn test_version_query_default() {
        let query = "";
        let params: VersionQuery = serde_urlencoded::from_str(query).unwrap();
        assert!(params.page.is_none());
        assert!(params.page_size.is_none());
    }

    #[test]
    fn test_version_query_only_page() {
        let query = "page=2";
        let params: VersionQuery = serde_urlencoded::from_str(query).unwrap();
        assert_eq!(params.page, Some(2));
        assert!(params.page_size.is_none());
    }
}

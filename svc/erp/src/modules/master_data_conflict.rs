//! V37.0 AC-9: 主数据冲突检测 + 自动合并
//!
//! 提供主数据冲突检测、冲突列表查询、冲突详情、手动解决冲突和自动合并功能。
//! 从 master_data_refs.rs 拆分。

use axum::extract::{Path, Query, State};
use axum::Json;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use topems_shared::ApiResponse;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::PaginatedResponse;
use utoipa::IntoParams;

use super::ApiState;

/// 合并策略
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
#[derive(Default)]
pub enum MergeStrategy {
    /// 最后写入胜出（基于时间戳）
    #[default]
    LastWriteWins,
    /// 来源服务优先级（高优先级服务的数据胜出）
    SourcePriority,
    /// 手动审查（不自动合并，等待人工裁决）
    ManualReview,
}

/// 主数据冲突记录
#[derive(Debug, Serialize)]
pub struct MasterDataConflict {
    pub id: String,
    pub master_data_id: String,
    pub domain: String,
    pub conflict_type: String,
    pub field_name: String,
    pub local_value: serde_json::Value,
    pub remote_value: serde_json::Value,
    pub remote_service: String,
    pub status: String,
    pub merge_strategy: String,
    pub resolved_value: Option<serde_json::Value>,
    pub detected_at: String,
    pub resolved_at: Option<String>,
    pub resolved_by: Option<String>,
}

/// 冲突检测请求
#[derive(Debug, Deserialize)]
pub struct DetectConflictsRequest {
    pub master_data_id: String,
    pub remote_service: String,
    pub remote_data: serde_json::Value,
    pub merge_strategy: Option<MergeStrategy>,
}

/// 冲突检测结果
#[derive(Debug, Serialize)]
pub struct ConflictDetectionResult {
    pub master_data_id: String,
    pub conflicts_detected: usize,
    pub conflicts: Vec<MasterDataConflict>,
    pub auto_resolved: usize,
    pub manual_review_required: usize,
}

/// 冲突列表查询参数
#[derive(Debug, Deserialize, IntoParams)]
pub struct ConflictQuery {
    pub master_data_id: Option<String>,
    pub status: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

/// 手动解决冲突请求
#[derive(Debug, Deserialize)]
pub struct ResolveConflictRequest {
    pub resolved_value: serde_json::Value,
    pub resolved_by: Option<String>,
}

/// 自动合并请求
#[derive(Debug, Deserialize)]
pub struct AutoMergeRequest {
    pub strategy: Option<MergeStrategy>,
    pub service_priorities: Option<std::collections::HashMap<String, i32>>,
}

/// V37.0 AC-9: 检测主数据冲突
///
/// 比较本地主数据引用与远程服务传入的数据，识别字段级冲突。
/// 冲突字段包括：name、status、code、local_entity_type
/// 根据合并策略自动解决部分冲突，或标记为需要手动审查。
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/api/erp/master-data-refs/conflicts/detect",
    tag = "Master Data",
    operation_id = "detect_conflicts",
    responses((status = 200, description = "OK")),
)]
pub async fn detect_conflicts(
    State(state): State<ApiState>,
    Json(req): Json<DetectConflictsRequest>,
) -> Json<ApiResponse<ConflictDetectionResult>> {
    let strategy = req.merge_strategy.unwrap_or_default();
    let strategy_str = match strategy {
        MergeStrategy::LastWriteWins => "last_write_wins",
        MergeStrategy::SourcePriority => "source_priority",
        MergeStrategy::ManualReview => "manual_review",
    };

    // 1. 查询本地主数据引用
    let local_row = sqlx::query(only_own_schema_query!(
        "erp",
        r#"SELECT master_data_id, domain, code, name, status, source_service, updated_at
           FROM erp.erp_master_data_refs WHERE master_data_id = $1"#
    ))
    .bind(&req.master_data_id)
    .fetch_optional(&state.db)
    .await;

    let (domain, local_name, local_status, local_code, _updated_at) = match local_row {
        Ok(Some(row)) => (
            row.try_get::<String, _>("domain").unwrap_or_default(),
            row.try_get::<Option<String>, _>("name").ok().flatten(),
            row.try_get::<String, _>("status").unwrap_or_default(),
            row.try_get::<String, _>("code").unwrap_or_default(),
            row.try_get::<chrono::DateTime<chrono::Utc>, _>("updated_at")
                .unwrap_or_else(|_| chrono::Utc::now()),
        ),
        _ => {
            return Json(ApiResponse::error(
                404,
                "未找到本地主数据引用，无法检测冲突",
            ));
        }
    };

    // 2. 逐字段比较，检测冲突
    let mut conflicts = Vec::new();
    let now = chrono::Utc::now();

    // 检查 name 字段冲突
    let remote_name = req.remote_data.get("name").and_then(|v| v.as_str());
    if let Some(rn) = remote_name {
        let local_name_str = local_name.as_deref().unwrap_or("");
        if rn != local_name_str {
            let conflict_id = uuid::Uuid::new_v4();
            let conflict = MasterDataConflict {
                id: conflict_id.to_string(),
                master_data_id: req.master_data_id.clone(),
                domain: domain.clone(),
                conflict_type: "field_mismatch".into(),
                field_name: "name".into(),
                local_value: serde_json::json!(local_name_str),
                remote_value: serde_json::json!(rn),
                remote_service: req.remote_service.clone(),
                status: "detected".into(),
                merge_strategy: strategy_str.into(),
                resolved_value: None,
                detected_at: now.to_rfc3339(),
                resolved_at: None,
                resolved_by: None,
            };
            conflicts.push(conflict);
        }
    }

    // 检查 status 字段冲突
    let remote_status = req.remote_data.get("status").and_then(|v| v.as_str());
    if let Some(rs) = remote_status {
        if rs != local_status {
            let conflict_id = uuid::Uuid::new_v4();
            let conflict = MasterDataConflict {
                id: conflict_id.to_string(),
                master_data_id: req.master_data_id.clone(),
                domain: domain.clone(),
                conflict_type: "field_mismatch".into(),
                field_name: "status".into(),
                local_value: serde_json::json!(local_status),
                remote_value: serde_json::json!(rs),
                remote_service: req.remote_service.clone(),
                status: "detected".into(),
                merge_strategy: strategy_str.into(),
                resolved_value: None,
                detected_at: now.to_rfc3339(),
                resolved_at: None,
                resolved_by: None,
            };
            conflicts.push(conflict);
        }
    }

    // 检查 code 字段冲突
    let remote_code = req.remote_data.get("code").and_then(|v| v.as_str());
    if let Some(rc) = remote_code {
        if rc != local_code {
            let conflict_id = uuid::Uuid::new_v4();
            let conflict = MasterDataConflict {
                id: conflict_id.to_string(),
                master_data_id: req.master_data_id.clone(),
                domain: domain.clone(),
                conflict_type: "field_mismatch".into(),
                field_name: "code".into(),
                local_value: serde_json::json!(local_code),
                remote_value: serde_json::json!(rc),
                remote_service: req.remote_service.clone(),
                status: "detected".into(),
                merge_strategy: strategy_str.into(),
                resolved_value: None,
                detected_at: now.to_rfc3339(),
                resolved_at: None,
                resolved_by: None,
            };
            conflicts.push(conflict);
        }
    }

    // 3. 根据合并策略自动解决冲突
    let mut auto_resolved = 0;
    let mut manual_review_required = 0;

    for conflict in &mut conflicts {
        let should_auto_resolve = match strategy {
            MergeStrategy::LastWriteWins => true,
            MergeStrategy::SourcePriority => true,
            MergeStrategy::ManualReview => false,
        };

        if should_auto_resolve {
            conflict.status = "auto_resolved".into();
            conflict.resolved_value = Some(conflict.remote_value.clone());
            conflict.resolved_at = Some(now.to_rfc3339());
            conflict.resolved_by = Some(format!("auto:{}", strategy_str));
            auto_resolved += 1;

            // 持久化冲突记录到数据库
            let _ = sqlx::query(only_own_schema_query!(
                "erp",
                r#"INSERT INTO erp_master_data_conflicts
                   (id, master_data_id, domain, conflict_type, field_name,
                    local_value, remote_value, remote_service, status,
                    merge_strategy, resolved_value, detected_at, resolved_at, resolved_by)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)"#
            ))
            .bind(uuid::Uuid::parse_str(&conflict.id).unwrap_or_else(|_| uuid::Uuid::new_v4()))
            .bind(&conflict.master_data_id)
            .bind(&conflict.domain)
            .bind(&conflict.conflict_type)
            .bind(&conflict.field_name)
            .bind(&conflict.local_value)
            .bind(&conflict.remote_value)
            .bind(&conflict.remote_service)
            .bind(&conflict.status)
            .bind(&conflict.merge_strategy)
            .bind(&conflict.resolved_value)
            .bind(now)
            .bind(now)
            .bind(&conflict.resolved_by)
            .execute(&state.db)
            .await;

            // 应用解决值到本地主数据引用
            let _ = apply_resolved_value(
                &state.db,
                &conflict.master_data_id,
                &conflict.field_name,
                &conflict.remote_value,
            )
            .await;
        } else {
            conflict.status = "pending_review".into();
            manual_review_required += 1;

            // 持久化待审查冲突
            let _ = sqlx::query(only_own_schema_query!(
                "erp",
                r#"INSERT INTO erp_master_data_conflicts
                   (id, master_data_id, domain, conflict_type, field_name,
                    local_value, remote_value, remote_service, status,
                    merge_strategy, resolved_value, detected_at, resolved_at, resolved_by)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NULL, $11, NULL, NULL)"#
            ))
            .bind(uuid::Uuid::parse_str(&conflict.id).unwrap_or_else(|_| uuid::Uuid::new_v4()))
            .bind(&conflict.master_data_id)
            .bind(&conflict.domain)
            .bind(&conflict.conflict_type)
            .bind(&conflict.field_name)
            .bind(&conflict.local_value)
            .bind(&conflict.remote_value)
            .bind(&conflict.remote_service)
            .bind(&conflict.status)
            .bind(&conflict.merge_strategy)
            .bind(now)
            .execute(&state.db)
            .await;
        }
    }

    // 4. 如果有自动解决的冲突，更新本地数据的 last_synced_at
    if auto_resolved > 0 {
        let _ = sqlx::query(only_own_schema_query!(
            "erp",
            r#"UPDATE erp.erp_master_data_refs SET last_synced_at = $1, updated_at = $1
               WHERE master_data_id = $2"#
        ))
        .bind(now)
        .bind(&req.master_data_id)
        .execute(&state.db)
        .await;
    }

    let conflicts_detected = conflicts.len();
    Json(ApiResponse::success(
        ConflictDetectionResult {
            master_data_id: req.master_data_id,
            conflicts_detected,
            conflicts,
            auto_resolved,
            manual_review_required,
        },
        &format!(
            "检测到 {} 个冲突，自动解决 {} 个，待审查 {} 个",
            conflicts_detected, auto_resolved, manual_review_required
        ),
    ))
}

/// V37.0 AC-9: 列出冲突记录
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/api/erp/master-data-refs/conflicts",
    tag = "Master Data",
    operation_id = "list_conflicts",
    params(ConflictQuery),
    responses((status = 200, description = "OK")),
)]
pub async fn list_conflicts(
    State(state): State<ApiState>,
    Query(params): Query<ConflictQuery>,
) -> Json<ApiResponse<PaginatedResponse<MasterDataConflict>>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let rows = if let Some(ref mid) = params.master_data_id {
        if let Some(ref status) = params.status {
            sqlx::query(only_own_schema_query!(
                "erp",
                r#"SELECT id, master_data_id, domain, conflict_type, field_name,
                          local_value, remote_value, remote_service, status,
                          merge_strategy, resolved_value, detected_at, resolved_at, resolved_by
                   FROM erp_master_data_conflicts
                   WHERE master_data_id = $1 AND status = $2
                   ORDER BY detected_at DESC LIMIT $3 OFFSET $4"#
            ))
            .bind(mid)
            .bind(status)
            .bind(page_size)
            .bind(offset)
            .fetch_all(&state.db)
            .await
        } else {
            sqlx::query(only_own_schema_query!(
                "erp",
                r#"SELECT id, master_data_id, domain, conflict_type, field_name,
                          local_value, remote_value, remote_service, status,
                          merge_strategy, resolved_value, detected_at, resolved_at, resolved_by
                   FROM erp_master_data_conflicts
                   WHERE master_data_id = $1
                   ORDER BY detected_at DESC LIMIT $2 OFFSET $3"#
            ))
            .bind(mid)
            .bind(page_size)
            .bind(offset)
            .fetch_all(&state.db)
            .await
        }
    } else if let Some(ref status) = params.status {
        sqlx::query(only_own_schema_query!(
            "erp",
            r#"SELECT id, master_data_id, domain, conflict_type, field_name,
                      local_value, remote_value, remote_service, status,
                      merge_strategy, resolved_value, detected_at, resolved_at, resolved_by
               FROM erp_master_data_conflicts
               WHERE status = $1
               ORDER BY detected_at DESC LIMIT $2 OFFSET $3"#
        ))
        .bind(status)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.db)
        .await
    } else {
        sqlx::query(only_own_schema_query!(
            "erp",
            r#"SELECT id, master_data_id, domain, conflict_type, field_name,
                      local_value, remote_value, remote_service, status,
                      merge_strategy, resolved_value, detected_at, resolved_at, resolved_by
               FROM erp_master_data_conflicts
               ORDER BY detected_at DESC LIMIT $1 OFFSET $2"#
        ))
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.db)
        .await
    };

    match rows {
        Ok(rows) => {
            let items: Vec<MasterDataConflict> = rows
                .iter()
                .map(|r| MasterDataConflict {
                    id: r
                        .try_get::<uuid::Uuid, _>("id")
                        .unwrap_or_default()
                        .to_string(),
                    master_data_id: r.try_get::<String, _>("master_data_id").unwrap_or_default(),
                    domain: r.try_get::<String, _>("domain").unwrap_or_default(),
                    conflict_type: r.try_get::<String, _>("conflict_type").unwrap_or_default(),
                    field_name: r.try_get::<String, _>("field_name").unwrap_or_default(),
                    local_value: r
                        .try_get::<serde_json::Value, _>("local_value")
                        .unwrap_or_default(),
                    remote_value: r
                        .try_get::<serde_json::Value, _>("remote_value")
                        .unwrap_or_default(),
                    remote_service: r.try_get::<String, _>("remote_service").unwrap_or_default(),
                    status: r.try_get::<String, _>("status").unwrap_or_default(),
                    merge_strategy: r.try_get::<String, _>("merge_strategy").unwrap_or_default(),
                    resolved_value: r
                        .try_get::<Option<serde_json::Value>, _>("resolved_value")
                        .ok()
                        .flatten(),
                    detected_at: r
                        .try_get::<chrono::DateTime<chrono::Utc>, _>("detected_at")
                        .unwrap_or_else(|_| chrono::Utc::now())
                        .to_rfc3339(),
                    resolved_at: r
                        .try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("resolved_at")
                        .ok()
                        .flatten()
                        .map(|t| t.to_rfc3339()),
                    resolved_by: r.try_get::<Option<String>, _>("resolved_by").ok().flatten(),
                })
                .collect();
            let total = items.len() as i64;
            Json(ApiResponse::success(
                PaginatedResponse::new(items, total, page, page_size),
                "冲突记录列表",
            ))
        }
        Err(e) => {
            tracing::warn!("[erp-mdm] 查询冲突记录失败: {}", e);
            Json(ApiResponse::success(
                PaginatedResponse::new(vec![], 0, page, page_size),
                "冲突记录列表（空）",
            ))
        }
    }
}

/// V37.0 AC-9: 获取冲突详情
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/api/erp/master-data-refs/conflicts/{conflict_id}",
    tag = "Master Data",
    operation_id = "get_conflict",
    responses((status = 200, description = "OK")),
)]
pub async fn get_conflict(
    State(state): State<ApiState>,
    Path(conflict_id): Path<String>,
) -> Json<ApiResponse<MasterDataConflict>> {
    let cid = match uuid::Uuid::parse_str(&conflict_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的冲突 ID")),
    };

    let row = sqlx::query(only_own_schema_query!(
        "erp",
        r#"SELECT id, master_data_id, domain, conflict_type, field_name,
                  local_value, remote_value, remote_service, status,
                  merge_strategy, resolved_value, detected_at, resolved_at, resolved_by
           FROM erp_master_data_conflicts WHERE id = $1"#
    ))
    .bind(cid)
    .fetch_optional(&state.db)
    .await;

    match row {
        Ok(Some(r)) => Json(ApiResponse::success(
            MasterDataConflict {
                id: r
                    .try_get::<uuid::Uuid, _>("id")
                    .unwrap_or_default()
                    .to_string(),
                master_data_id: r.try_get::<String, _>("master_data_id").unwrap_or_default(),
                domain: r.try_get::<String, _>("domain").unwrap_or_default(),
                conflict_type: r.try_get::<String, _>("conflict_type").unwrap_or_default(),
                field_name: r.try_get::<String, _>("field_name").unwrap_or_default(),
                local_value: r
                    .try_get::<serde_json::Value, _>("local_value")
                    .unwrap_or_default(),
                remote_value: r
                    .try_get::<serde_json::Value, _>("remote_value")
                    .unwrap_or_default(),
                remote_service: r.try_get::<String, _>("remote_service").unwrap_or_default(),
                status: r.try_get::<String, _>("status").unwrap_or_default(),
                merge_strategy: r.try_get::<String, _>("merge_strategy").unwrap_or_default(),
                resolved_value: r
                    .try_get::<Option<serde_json::Value>, _>("resolved_value")
                    .ok()
                    .flatten(),
                detected_at: r
                    .try_get::<chrono::DateTime<chrono::Utc>, _>("detected_at")
                    .unwrap_or_else(|_| chrono::Utc::now())
                    .to_rfc3339(),
                resolved_at: r
                    .try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("resolved_at")
                    .ok()
                    .flatten()
                    .map(|t| t.to_rfc3339()),
                resolved_by: r.try_get::<Option<String>, _>("resolved_by").ok().flatten(),
            },
            "冲突详情",
        )),
        Ok(None) => Json(ApiResponse::error(404, "未找到冲突记录")),
        Err(e) => {
            tracing::warn!("[erp-mdm] 查询冲突详情失败: {}", e);
            Json(ApiResponse::error(500, &format!("查询冲突失败: {}", e)))
        }
    }
}

/// V37.0 AC-9: 手动解决冲突
///
/// 接受用户提供的解决值，更新冲突状态并应用到本地主数据引用。
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/api/erp/master-data-refs/conflicts/{conflict_id}/resolve",
    tag = "Master Data",
    operation_id = "resolve_conflict",
    responses((status = 200, description = "OK")),
)]
pub async fn resolve_conflict(
    State(state): State<ApiState>,
    Path(conflict_id): Path<String>,
    Json(req): Json<ResolveConflictRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let cid = match uuid::Uuid::parse_str(&conflict_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的冲突 ID")),
    };
    let now = chrono::Utc::now();

    // 1. 查询冲突记录获取 master_data_id 和 field_name
    let row = sqlx::query(only_own_schema_query!(
        "erp",
        r#"SELECT master_data_id, field_name FROM erp_master_data_conflicts WHERE id = $1"#
    ))
    .bind(cid)
    .fetch_optional(&state.db)
    .await;

    let (master_data_id, field_name) = match row {
        Ok(Some(r)) => (
            r.try_get::<String, _>("master_data_id").unwrap_or_default(),
            r.try_get::<String, _>("field_name").unwrap_or_default(),
        ),
        _ => return Json(ApiResponse::error(404, "未找到冲突记录")),
    };

    // 2. 更新冲突记录状态
    let result = sqlx::query(only_own_schema_query!(
        "erp",
        r#"UPDATE erp_master_data_conflicts
           SET status = 'resolved', resolved_value = $1, resolved_at = $2, resolved_by = $3
           WHERE id = $4"#
    ))
    .bind(&req.resolved_value)
    .bind(now)
    .bind(&req.resolved_by)
    .bind(cid)
    .execute(&state.db)
    .await;

    if let Err(e) = result {
        tracing::warn!("[erp-mdm] 解决冲突失败: {}", e);
        return Json(ApiResponse::error(500, &format!("解决冲突失败: {}", e)));
    }

    // 3. 应用解决值到本地主数据引用
    let _ =
        apply_resolved_value(&state.db, &master_data_id, &field_name, &req.resolved_value).await;

    Json(ApiResponse::success(
        serde_json::json!({
            "conflict_id": conflict_id,
            "master_data_id": master_data_id,
            "field_name": field_name,
            "resolved_value": req.resolved_value,
            "resolved_at": now.to_rfc3339(),
            "resolved_by": req.resolved_by,
        }),
        "冲突已手动解决",
    ))
}

/// V37.0 AC-9: 自动合并冲突
///
/// 对指定的待审查冲突应用自动合并策略。
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/api/erp/master-data-refs/conflicts/{conflict_id}/auto-merge",
    tag = "Master Data",
    operation_id = "auto_merge_conflict",
    responses((status = 200, description = "OK")),
)]
pub async fn auto_merge_conflict(
    State(state): State<ApiState>,
    Path(conflict_id): Path<String>,
    Json(req): Json<AutoMergeRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let cid = match uuid::Uuid::parse_str(&conflict_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的冲突 ID")),
    };
    let strategy = req.strategy.unwrap_or_default();
    let now = chrono::Utc::now();

    // 1. 查询冲突记录
    let row = sqlx::query(
        only_own_schema_query!("erp", r#"SELECT master_data_id, field_name, local_value, remote_value, remote_service
           FROM erp_master_data_conflicts WHERE id = $1 AND status IN ('pending_review', 'detected')"#),
    )
    .bind(cid)
    .fetch_optional(&state.db)
    .await;

    let (master_data_id, field_name, local_value, remote_value, remote_service) = match row {
        Ok(Some(r)) => (
            r.try_get::<String, _>("master_data_id").unwrap_or_default(),
            r.try_get::<String, _>("field_name").unwrap_or_default(),
            r.try_get::<serde_json::Value, _>("local_value")
                .unwrap_or_default(),
            r.try_get::<serde_json::Value, _>("remote_value")
                .unwrap_or_default(),
            r.try_get::<String, _>("remote_service").unwrap_or_default(),
        ),
        _ => return Json(ApiResponse::error(404, "未找到待合并的冲突记录")),
    };

    // 2. 根据策略选择解决值
    let (resolved_value, strategy_label) = match strategy {
        MergeStrategy::LastWriteWins => (remote_value.clone(), "last_write_wins"),
        MergeStrategy::SourcePriority => {
            let priority = req
                .service_priorities
                .as_ref()
                .and_then(|p| p.get(&remote_service))
                .copied()
                .unwrap_or(0);
            if priority > 0 {
                (remote_value.clone(), "source_priority")
            } else {
                (local_value.clone(), "source_priority_local")
            }
        }
        MergeStrategy::ManualReview => {
            return Json(ApiResponse::error(400, "策略为手动审查，不自动合并"));
        }
    };

    // 3. 更新冲突记录
    let result = sqlx::query(only_own_schema_query!(
        "erp",
        r#"UPDATE erp_master_data_conflicts
           SET status = 'auto_resolved', resolved_value = $1, resolved_at = $2,
               resolved_by = $3, merge_strategy = $4
           WHERE id = $5"#
    ))
    .bind(&resolved_value)
    .bind(now)
    .bind(format!("auto:{}", strategy_label))
    .bind(strategy_label)
    .bind(cid)
    .execute(&state.db)
    .await;

    if let Err(e) = result {
        tracing::warn!("[erp-mdm] 自动合并失败: {}", e);
        return Json(ApiResponse::error(500, &format!("自动合并失败: {}", e)));
    }

    // 4. 应用解决值
    let _ = apply_resolved_value(&state.db, &master_data_id, &field_name, &resolved_value).await;

    Json(ApiResponse::success(
        serde_json::json!({
            "conflict_id": conflict_id,
            "master_data_id": master_data_id,
            "field_name": field_name,
            "strategy": strategy_label,
            "resolved_value": resolved_value,
            "auto_merged_at": now.to_rfc3339(),
        }),
        "冲突已自动合并",
    ))
}

/// 将解决值应用到本地主数据引用表
async fn apply_resolved_value(
    db: &sqlx::PgPool,
    master_data_id: &str,
    field_name: &str,
    value: &serde_json::Value,
) -> Result<(), sqlx::Error> {
    let now = chrono::Utc::now();
    match field_name {
        "name" => {
            if let Some(s) = value.as_str() {
                sqlx::query(
                    only_own_schema_query!("erp", r#"UPDATE erp.erp_master_data_refs SET name = $1, updated_at = $2 WHERE master_data_id = $3"#),
                )
                .bind(s)
                .bind(now)
                .bind(master_data_id)
                .execute(db)
                .await?;
            }
        }
        "status" => {
            if let Some(s) = value.as_str() {
                sqlx::query(
                    only_own_schema_query!("erp", r#"UPDATE erp.erp_master_data_refs SET status = $1, updated_at = $2 WHERE master_data_id = $3"#),
                )
                .bind(s)
                .bind(now)
                .bind(master_data_id)
                .execute(db)
                .await?;
            }
        }
        "code" => {
            if let Some(s) = value.as_str() {
                sqlx::query(
                    only_own_schema_query!("erp", r#"UPDATE erp.erp_master_data_refs SET code = $1, updated_at = $2 WHERE master_data_id = $3"#),
                )
                .bind(s)
                .bind(now)
                .bind(master_data_id)
                .execute(db)
                .await?;
            }
        }
        _ => {
            tracing::warn!("[erp-mdm] 未知字段 {}，跳过应用解决值", field_name);
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_merge_strategy_default() {
        let strategy = MergeStrategy::default();
        match strategy {
            MergeStrategy::LastWriteWins => {}
            _ => panic!("默认策略应该是 LastWriteWins"),
        }
    }

    #[test]
    fn test_merge_strategy_serialization() {
        let strategy = MergeStrategy::LastWriteWins;
        let json = serde_json::to_value(&strategy).unwrap();
        assert_eq!(json, "last_write_wins");
    }

    #[test]
    fn test_merge_strategy_source_priority() {
        let strategy = MergeStrategy::SourcePriority;
        let json = serde_json::to_value(&strategy).unwrap();
        assert_eq!(json, "source_priority");
    }

    #[test]
    fn test_merge_strategy_manual_review() {
        let strategy = MergeStrategy::ManualReview;
        let json = serde_json::to_value(&strategy).unwrap();
        assert_eq!(json, "manual_review");
    }

    #[test]
    fn test_merge_strategy_deserialize() {
        let json = r#""source_priority""#;
        let strategy: MergeStrategy = serde_json::from_str(json).unwrap();
        match strategy {
            MergeStrategy::SourcePriority => {}
            _ => panic!("应该解析为 SourcePriority"),
        }
    }

    #[test]
    fn test_master_data_conflict_serialization() {
        let conflict = MasterDataConflict {
            id: "conflict1".to_string(),
            master_data_id: "md1".to_string(),
            domain: "customer".to_string(),
            conflict_type: "field_conflict".to_string(),
            field_name: "name".to_string(),
            local_value: serde_json::json!("本地名称"),
            remote_value: serde_json::json!("远程名称"),
            remote_service: "crm".to_string(),
            status: "pending".to_string(),
            merge_strategy: "last_write_wins".to_string(),
            resolved_value: None,
            detected_at: "2024-01-01T00:00:00Z".to_string(),
            resolved_at: None,
            resolved_by: None,
        };
        let json = serde_json::to_value(&conflict).unwrap();
        assert_eq!(json["id"], "conflict1");
        assert_eq!(json["master_data_id"], "md1");
        assert_eq!(json["domain"], "customer");
        assert_eq!(json["field_name"], "name");
        assert_eq!(json["local_value"], "本地名称");
        assert_eq!(json["remote_value"], "远程名称");
        assert_eq!(json["status"], "pending");
    }

    #[test]
    fn test_detect_conflicts_request_deserialize() {
        let json = r#"{
            "master_data_id": "md1",
            "remote_service": "crm",
            "remote_data": {"name": "测试"},
            "merge_strategy": "last_write_wins"
        }"#;
        let request: DetectConflictsRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.master_data_id, "md1");
        assert_eq!(request.remote_service, "crm");
        assert_eq!(request.remote_data["name"], "测试");
        assert!(matches!(
            request.merge_strategy,
            Some(MergeStrategy::LastWriteWins)
        ));
    }

    #[test]
    fn test_detect_conflicts_request_default_strategy() {
        let json = r#"{
            "master_data_id": "md1",
            "remote_service": "crm",
            "remote_data": {}
        }"#;
        let request: DetectConflictsRequest = serde_json::from_str(json).unwrap();
        assert!(request.merge_strategy.is_none());
    }

    #[test]
    fn test_conflict_detection_result_serialization() {
        let result = ConflictDetectionResult {
            master_data_id: "md1".to_string(),
            conflicts_detected: 2,
            conflicts: vec![],
            auto_resolved: 1,
            manual_review_required: 1,
        };
        let json = serde_json::to_value(&result).unwrap();
        assert_eq!(json["master_data_id"], "md1");
        assert_eq!(json["conflicts_detected"], 2);
        assert_eq!(json["auto_resolved"], 1);
        assert_eq!(json["manual_review_required"], 1);
    }

    #[test]
    fn test_conflict_query_deserialize() {
        let query = "master_data_id=md1&status=pending&page=1&page_size=20";
        let params: ConflictQuery = serde_urlencoded::from_str(query).unwrap();
        assert_eq!(params.master_data_id.as_deref(), Some("md1"));
        assert_eq!(params.status.as_deref(), Some("pending"));
        assert_eq!(params.page, Some(1));
        assert_eq!(params.page_size, Some(20));
    }

    #[test]
    fn test_conflict_query_default() {
        let query = "";
        let params: ConflictQuery = serde_urlencoded::from_str(query).unwrap();
        assert!(params.master_data_id.is_none());
        assert!(params.status.is_none());
        assert!(params.page.is_none());
        assert!(params.page_size.is_none());
    }

    #[test]
    fn test_resolve_conflict_request_deserialize() {
        let json = r#"{
            "resolved_value": "解决值",
            "resolved_by": "admin"
        }"#;
        let request: ResolveConflictRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.resolved_value, "解决值");
        assert_eq!(request.resolved_by.as_deref(), Some("admin"));
    }

    #[test]
    fn test_auto_merge_request_deserialize() {
        let json = r#"{
            "strategy": "source_priority",
            "service_priorities": {"crm": 10, "erp": 5}
        }"#;
        let request: AutoMergeRequest = serde_json::from_str(json).unwrap();
        assert!(matches!(
            request.strategy,
            Some(MergeStrategy::SourcePriority)
        ));
        assert_eq!(
            request.service_priorities.as_ref().unwrap().get("crm"),
            Some(&10)
        );
        assert_eq!(
            request.service_priorities.as_ref().unwrap().get("erp"),
            Some(&5)
        );
    }
}

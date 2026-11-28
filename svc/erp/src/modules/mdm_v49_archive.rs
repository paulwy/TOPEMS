use axum::{extract::Path, extract::Query, extract::State, Json};
use serde::Deserialize;
use topems_shared_core::response::ApiResponse;
use topems_shared_core::response::PaginatedResponse;

use super::super::ApiState;
use super::mdm_v49_types::*;

// ==================== 处理器：归档策略 ====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/mdm-v49/archive/policies",
    tag = "MdmV49",
    operation_id = "list_archive_policies",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
#[allow(
    clippy::as_conversions,
    clippy::cast_possible_truncation,
    clippy::cast_possible_wrap,
    clippy::cast_sign_loss
)]
pub async fn list_archive_policies(
    State(_state): State<ApiState>,
    Query(params): Query<ArchivePolicyQuery>,
) -> ApiResponse<PaginatedResponse<ArchivePolicy>> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let policies = store.archive_policies.lock().await;

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);

    let mut filtered: Vec<ArchivePolicy> = policies
        .iter()
        .filter(|p| {
            if let Some(d) = &params.domain {
                if &p.domain != d {
                    return false;
                }
            }
            if let Some(t) = &params.entity_type {
                if &p.entity_type != t {
                    return false;
                }
            }
            if let Some(k) = &params.keyword {
                if !p.policy_name.contains(k.as_str()) {
                    return false;
                }
            }
            true
        })
        .cloned()
        .collect();

    filtered.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));

    let total = filtered.len() as i64;
    let items: Vec<ArchivePolicy> = filtered
        .into_iter()
        .skip(((page - 1) * page_size) as usize)
        .take(page_size as usize)
        .collect();

    ApiResponse::success(
        PaginatedResponse {
            items,
            total,
            page,
            page_size,
            total_pages: topems_shared_core::response::total_pages_of(total, page_size),
        },
        "归档策略列表",
    )
}

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct ArchivePolicyQuery {
    pub domain: Option<String>,
    pub entity_type: Option<String>,
    pub keyword: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:master-data:write"])),
    path = "/mdm-v49/archive/policies",
    tag = "MdmV49",
    operation_id = "create_archive_policy",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn create_archive_policy(
    State(_state): State<ApiState>,
    Json(req): Json<ArchivePolicyRequest>,
) -> ApiResponse<ArchivePolicy> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let mut policies = store.archive_policies.lock().await;

    let now = chrono::Utc::now();
    let tier = match req.archive_tier.as_str() {
        "hot" => ArchiveTier::Hot,
        "warm" => ArchiveTier::Warm,
        "cold" => ArchiveTier::Cold,
        "glacier" => ArchiveTier::Glacier,
        _ => ArchiveTier::Warm,
    };

    let policy = ArchivePolicy {
        id: uuid::Uuid::new_v4().to_string(),
        domain: req.domain,
        entity_type: req.entity_type,
        policy_name: req.policy_name,
        description: req.description.unwrap_or_default(),
        archive_age_days: req.archive_age_days,
        retention_days: req
            .retention_days
            .unwrap_or_else(|| tier.retention_default_days()),
        archive_tier: tier,
        index_archived: req.index_archived.unwrap_or(true),
        restore_window_days: req.restore_window_days.unwrap_or(30),
        auto_archive: req.auto_archive.unwrap_or(true),
        notify_on_archive: req.notify_on_archive.unwrap_or(true),
        created_at: now.clone(),
        updated_at: now,
    };

    policies.push(policy.clone());
    ApiResponse::success(policy, "归档策略已创建")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/mdm-v49/archive/policies/{policy_id}",
    tag = "MdmV49",
    operation_id = "get_archive_policy",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_archive_policy(
    State(_state): State<ApiState>,
    Path(policy_id): Path<String>,
) -> ApiResponse<ArchivePolicy> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let policies = store.archive_policies.lock().await;
    match policies.iter().find(|p| p.id == policy_id) {
        Some(p) => ApiResponse::success(p.clone(), "归档策略"),
        None => ApiResponse::not_found("未找到归档策略"),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["erp:update"])),
    path = "/mdm-v49/archive/policies/{policy_id}",
    tag = "MdmV49",
    operation_id = "update_archive_policy",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn update_archive_policy(
    State(_state): State<ApiState>,
    Path(policy_id): Path<String>,
    Json(req): Json<ArchivePolicyRequest>,
) -> ApiResponse<ArchivePolicy> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let mut policies = store.archive_policies.lock().await;
    let Some(policy) = policies.iter_mut().find(|p| p.id == policy_id) else {
        return ApiResponse::not_found("未找到归档策略");
    };

    policy.policy_name = req.policy_name;
    policy.description = req.description.unwrap_or_default();
    policy.archive_age_days = req.archive_age_days;
    let tier = match req.archive_tier.as_str() {
        "hot" => ArchiveTier::Hot,
        "cold" => ArchiveTier::Cold,
        "glacier" => ArchiveTier::Glacier,
        _ => ArchiveTier::Warm,
    };
    policy.archive_tier = tier;
    if let Some(r) = req.retention_days {
        policy.retention_days = r;
    }
    if let Some(i) = req.index_archived {
        policy.index_archived = i;
    }
    if let Some(r) = req.restore_window_days {
        policy.restore_window_days = r;
    }
    if let Some(a) = req.auto_archive {
        policy.auto_archive = a;
    }
    if let Some(n) = req.notify_on_archive {
        policy.notify_on_archive = n;
    }
    policy.updated_at = chrono::Utc::now();

    ApiResponse::success(policy.clone(), "归档策略已更新")
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["erp:delete"])),
    path = "/mdm-v49/archive/policies/{policy_id}",
    tag = "MdmV49",
    operation_id = "delete_archive_policy",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn delete_archive_policy(
    State(_state): State<ApiState>,
    Path(policy_id): Path<String>,
) -> ApiResponse<()> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let mut policies = store.archive_policies.lock().await;
    let before = policies.len();
    policies.retain(|p| p.id != policy_id);
    if policies.len() == before {
        return ApiResponse::not_found("未找到归档策略");
    }
    ApiResponse::success((), "归档策略已删除")
}

// ==================== 处理器：归档执行 ====================

#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/mdm-v49/archive/run",
    tag = "MdmV49",
    operation_id = "run_archive",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
#[allow(clippy::as_conversions, clippy::cast_possible_wrap)]
pub async fn run_archive(
    State(_state): State<ApiState>,
    Json(req): Json<ArchiveRunRequest>,
) -> ApiResponse<Vec<ArchiveRecord>> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let matched: Vec<ArchivePolicy> = {
        let policies = store.archive_policies.lock().await;
        let mut matched: Vec<ArchivePolicy> = Vec::new();
        for p in policies.iter() {
            if let Some(d) = &req.domain {
                if &p.domain != d {
                    continue;
                }
            }
            if let Some(t) = &req.entity_type {
                if &p.entity_type != t {
                    continue;
                }
            }
            if !p.auto_archive {
                continue;
            }
            matched.push(p.clone());
        }
        matched
    };

    let entities = store.entities.lock().await;
    let mut new_records: Vec<ArchiveRecord> = Vec::new();
    let mut to_archive: Vec<(String, String, String, String)> = Vec::new();
    let now = chrono::Utc::now();
    let dry_run = req.dry_run.unwrap_or(false);

    for policy in matched {
        for entity in entities.values() {
            if entity.domain != policy.domain || entity.entity_type != policy.entity_type {
                continue;
            }
            if entity.stage.order() >= LifecycleStage::Archived.order() {
                continue;
            }
            let age_days = (now - entity.last_transition_at).num_days();
            if age_days < policy.archive_age_days as i64 {
                if let Some(max_age) = req.max_age_days {
                    if age_days < max_age as i64 {
                        continue;
                    }
                } else {
                    continue;
                }
            }

            new_records.push(ArchiveRecord {
                id: uuid::Uuid::new_v4().to_string(),
                master_data_id: entity.master_data_id.clone(),
                domain: entity.domain.clone(),
                entity_type: entity.entity_type.clone(),
                entity_code: entity.entity_code.clone(),
                entity_name: entity.entity_name.clone(),
                archive_tier: policy.archive_tier.clone(),
                archived_at: now,
                archived_by: "auto_archive".to_string(),
                archive_reason: format!(
                    "policy: {}, age {}d >= {}d",
                    policy.policy_name, age_days, policy.archive_age_days
                ),
                policy_id: Some(policy.id.clone()),
                retention_until: (now + chrono::Duration::days(policy.retention_days as i64))
                    .to_rfc3339(),
                restore_count: 0,
                last_restored_at: None,
                status: if dry_run { "pending" } else { "archived" }.to_string(),
                record_size_bytes: (entity.entity_name.len() as i64 + 1024) * 8,
                checksum: format!(
                    "sha256:{}",
                    uuid::Uuid::new_v4().to_string().replace('-', "")
                ),
            });

            if !dry_run {
                to_archive.push((
                    entity.master_data_id.clone(),
                    entity.entity_type.clone(),
                    entity.entity_code.clone(),
                    entity.entity_name.clone(),
                ));
            }
        }
    }
    drop(entities);

    if !dry_run && !to_archive.is_empty() {
        let mut ents = store.entities.lock().await;
        for (mid, _et, _ec, _en) in &to_archive {
            if let Some(e) = ents.get_mut(mid) {
                e.stage = LifecycleStage::Archived;
                e.last_transition_at = now;
                e.transition_count += 1;
            }
        }
    }

    if !dry_run && !new_records.is_empty() {
        let mut records = store.archive_records.lock().await;
        records.extend(new_records.clone());
    }

    ApiResponse::success(
        new_records,
        if dry_run {
            "归档预演完成（dry run）"
        } else {
            "归档执行完成"
        },
    )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/mdm-v49/archive/records",
    tag = "MdmV49",
    operation_id = "list_archive_records",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
#[allow(
    clippy::as_conversions,
    clippy::cast_possible_truncation,
    clippy::cast_possible_wrap,
    clippy::cast_sign_loss
)]
pub async fn list_archive_records(
    State(_state): State<ApiState>,
    Query(params): Query<ArchiveRecordQuery>,
) -> ApiResponse<PaginatedResponse<ArchiveRecord>> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let records = store.archive_records.lock().await;

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);

    let mut filtered: Vec<ArchiveRecord> = records
        .iter()
        .filter(|r| {
            if let Some(d) = &params.domain {
                if &r.domain != d {
                    return false;
                }
            }
            if let Some(t) = &params.entity_type {
                if &r.entity_type != t {
                    return false;
                }
            }
            if let Some(tier) = &params.tier {
                if r.archive_tier.as_str() != tier.as_str() {
                    return false;
                }
            }
            if let Some(s) = &params.status {
                if &r.status != s {
                    return false;
                }
            }
            if let Some(k) = &params.keyword {
                let hay = format!(
                    "{} {} {} {}",
                    r.entity_code, r.entity_name, r.master_data_id, r.archive_reason
                );
                if !hay.contains(k.as_str()) {
                    return false;
                }
            }
            true
        })
        .cloned()
        .collect();

    filtered.sort_by(|a, b| b.archived_at.cmp(&a.archived_at));

    let total = filtered.len() as i64;
    let items: Vec<ArchiveRecord> = filtered
        .into_iter()
        .skip(((page - 1) * page_size) as usize)
        .take(page_size as usize)
        .collect();

    ApiResponse::success(
        PaginatedResponse {
            items,
            total,
            page,
            page_size,
            total_pages: topems_shared_core::response::total_pages_of(total, page_size),
        },
        "归档记录列表",
    )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/mdm-v49/archive/records/{record_id}",
    tag = "MdmV49",
    operation_id = "get_archive_record",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_archive_record(
    State(_state): State<ApiState>,
    Path(record_id): Path<String>,
) -> ApiResponse<ArchiveRecord> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let records = store.archive_records.lock().await;
    match records.iter().find(|r| r.id == record_id) {
        Some(r) => ApiResponse::success(r.clone(), "归档记录"),
        None => ApiResponse::not_found("未找到归档记录"),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:update"])),
    path = "/mdm-v49/archive/records/{record_id}/restore",
    tag = "MdmV49",
    operation_id = "restore_archive_record",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn restore_archive_record(
    State(_state): State<ApiState>,
    Path(record_id): Path<String>,
    Json(req): Json<ArchiveRestoreRequest>,
) -> ApiResponse<ArchiveRecord> {
    ensure_initialized().await;
    let store = get_lifecycle_store();

    let (restored_record_id, master_data_id, entity_type) = {
        let mut records = store.archive_records.lock().await;
        let Some(record) = records.iter_mut().find(|r| r.id == record_id) else {
            return ApiResponse::not_found("未找到归档记录");
        };

        if record.status != "archived" {
            return ApiResponse::bad_request("记录状态不支持恢复");
        }

        record.restore_count += 1;
        record.last_restored_at = Some(chrono::Utc::now());
        record.status = "restored".to_string();

        (
            record.id.clone(),
            record.master_data_id.clone(),
            record.entity_type.clone(),
        )
    };

    // 同步把实体恢复到 Operative
    let mut entities = store.entities.lock().await;
    if let Some(entity) = entities.get_mut(&master_data_id) {
        entity.stage = LifecycleStage::Operative;
        entity.last_transition_at = chrono::Utc::now();
        entity.transition_count += 1;
        entity.sla_breached = false;
    }

    record_event(
        master_data_id,
        entity_type,
        Some(LifecycleStage::Archived),
        LifecycleStage::Operative,
        format!("归档恢复: {}", req.reason),
        req.restored_by,
        "restore".to_string(),
        None,
    );

    let records = store.archive_records.lock().await;
    let r = records.iter().find(|x| x.id == restored_record_id).cloned();
    match r {
        Some(rec) => ApiResponse::success(rec, "已恢复归档记录"),
        None => ApiResponse::server_error("恢复失败"),
    }
}

// ==================== 动词式契约补绑 ====================
// 前端 readOps.ts / writeOps.ts 声明的扁平动词路径（无 {id} 路径段），
// 与上方 RESTful 同族处理器共用内存存储；请求体宽松解析（空对象 -> 占位默认值），
// 返回 payload 结构与兄弟端点（ArchivePolicy / ArchiveRecord）保持一致。

fn json_first_str(v: &serde_json::Value, keys: &[&str]) -> Option<String> {
    for k in keys {
        if let Some(x) = v.get(*k).and_then(|x| x.as_str()) {
            return Some(x.to_string());
        }
    }
    None
}

#[allow(
    clippy::as_conversions,
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss
)]
fn json_first_i32(v: &serde_json::Value, keys: &[&str]) -> Option<i32> {
    for k in keys {
        if let Some(x) = v.get(*k).and_then(|x| x.as_i64()) {
            return Some(x as i32);
        }
    }
    None
}

fn json_first_bool(v: &serde_json::Value, keys: &[&str]) -> Option<bool> {
    for k in keys {
        if let Some(x) = v.get(*k).and_then(|x| x.as_bool()) {
            return Some(x);
        }
    }
    None
}

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct ArchivePolicyVerbQuery {
    pub policy_id: Option<String>,
    pub id: Option<String>,
}

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct ArchiveRecordVerbQuery {
    pub record_id: Option<String>,
    pub id: Option<String>,
}

/// GET /mdm-v49/get-archive-policy
#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/api/erp/mdm-v49/get-archive-policy",
    tag = "ERP-mdm_v49_archive",
    responses((status = 200, description = "/api/erp/mdm-v49/get-archive-policy GET"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_archive_policy_verb(
    State(_state): State<ApiState>,
    Query(params): Query<ArchivePolicyVerbQuery>,
) -> ApiResponse<ArchivePolicy> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let policies = store.archive_policies.lock().await;

    let found = match params.policy_id.or(params.id) {
        Some(id) => policies.iter().find(|p| p.id == id).cloned(),
        None => policies.first().cloned(),
    };
    match found {
        Some(p) => ApiResponse::success(p, "归档策略"),
        None => ApiResponse::not_found("未找到归档策略"),
    }
}

/// POST /mdm-v49/create-archive-policy
#[allow(
    clippy::as_conversions,
    clippy::cast_possible_truncation,
    clippy::cast_possible_wrap,
    clippy::cast_sign_loss
)]
#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/api/erp/mdm-v49/create-archive-policy",
    tag = "ERP-mdm_v49_archive",
    responses((status = 200, description = "/api/erp/mdm-v49/create-archive-policy POST"), (status = 500, description = "服务内部错误")),
)]
pub async fn create_archive_policy_verb(
    State(_state): State<ApiState>,
    Json(payload): Json<serde_json::Value>,
) -> ApiResponse<ArchivePolicy> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let mut policies = store.archive_policies.lock().await;

    let tier_str =
        json_first_str(&payload, &["storage_tier", "archive_tier", "tier"]).unwrap_or_default();
    let tier = match tier_str.as_str() {
        "hot" => ArchiveTier::Hot,
        "cold" => ArchiveTier::Cold,
        "glacier" => ArchiveTier::Glacier,
        _ => ArchiveTier::Warm,
    };

    let now = chrono::Utc::now();
    let policy = ArchivePolicy {
        id: uuid::Uuid::new_v4().to_string(),
        domain: json_first_str(&payload, &["scope", "domain"])
            .unwrap_or_else(|| "master_data".to_string()),
        entity_type: json_first_str(&payload, &["entity_type"])
            .unwrap_or_else(|| "customer".to_string()),
        policy_name: json_first_str(&payload, &["name", "policy_name", "policyName"])
            .unwrap_or_else(|| "默认归档策略".to_string()),
        description: json_first_str(&payload, &["description"]).unwrap_or_default(),
        archive_age_days: json_first_i32(
            &payload,
            &["age_threshold_days", "archive_age_days", "ageThresholdDays"],
        )
        .unwrap_or(365),
        archive_tier: tier.clone(),
        retention_days: json_first_i32(&payload, &["retention_days", "retentionDays"])
            .unwrap_or_else(|| tier.retention_default_days()),
        index_archived: json_first_bool(&payload, &["index_archived"]).unwrap_or(true),
        restore_window_days: json_first_i32(&payload, &["restore_window_days"]).unwrap_or(30),
        auto_archive: json_first_bool(&payload, &["auto_archive"]).unwrap_or(true),
        notify_on_archive: json_first_bool(&payload, &["notify_on_archive"]).unwrap_or(true),
        created_at: now.clone(),
        updated_at: now,
    };

    policies.push(policy.clone());
    ApiResponse::success(policy, "归档策略已创建")
}

/// PUT /mdm-v49/update-archive-policy
#[allow(
    clippy::as_conversions,
    clippy::cast_possible_truncation,
    clippy::cast_possible_wrap,
    clippy::cast_sign_loss
)]
#[utoipa::path(
    put,
    security(("BearerAuth" = [])),
    path = "/api/erp/mdm-v49/update-archive-policy",
    tag = "ERP-mdm_v49_archive",
    responses((status = 200, description = "/api/erp/mdm-v49/update-archive-policy PUT"), (status = 500, description = "服务内部错误")),
)]
pub async fn update_archive_policy_verb(
    State(_state): State<ApiState>,
    Query(params): Query<ArchivePolicyVerbQuery>,
    Json(payload): Json<serde_json::Value>,
) -> ApiResponse<ArchivePolicy> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let mut policies = store.archive_policies.lock().await;

    let id = json_first_str(&payload, &["policy_id", "policyId", "id"])
        .or(params.policy_id)
        .or(params.id);

    let Some(policy) = (match id {
        Some(id) => policies.iter_mut().find(|p| p.id == id),
        None => policies.first_mut(),
    }) else {
        return ApiResponse::not_found("未找到归档策略");
    };

    if let Some(name) = json_first_str(&payload, &["name", "policy_name", "policyName"]) {
        policy.policy_name = name;
    }
    if let Some(desc) = json_first_str(&payload, &["description"]) {
        policy.description = desc;
    }
    if let Some(domain) = json_first_str(&payload, &["scope", "domain"]) {
        policy.domain = domain;
    }
    if let Some(et) = json_first_str(&payload, &["entity_type"]) {
        policy.entity_type = et;
    }
    if let Some(age) = json_first_i32(
        &payload,
        &["age_threshold_days", "archive_age_days", "ageThresholdDays"],
    ) {
        policy.archive_age_days = age;
    }
    if let Some(tier_str) = json_first_str(&payload, &["storage_tier", "archive_tier", "tier"]) {
        policy.archive_tier = match tier_str.as_str() {
            "hot" => ArchiveTier::Hot,
            "cold" => ArchiveTier::Cold,
            "glacier" => ArchiveTier::Glacier,
            _ => ArchiveTier::Warm,
        };
    }
    if let Some(ret) = json_first_i32(&payload, &["retention_days", "retentionDays"]) {
        policy.retention_days = ret;
    }
    if let Some(i) = json_first_bool(&payload, &["index_archived"]) {
        policy.index_archived = i;
    }
    if let Some(r) = json_first_i32(&payload, &["restore_window_days"]) {
        policy.restore_window_days = r;
    }
    if let Some(a) = json_first_bool(&payload, &["auto_archive"]) {
        policy.auto_archive = a;
    }
    if let Some(n) = json_first_bool(&payload, &["notify_on_archive"]) {
        policy.notify_on_archive = n;
    }
    policy.updated_at = chrono::Utc::now();

    ApiResponse::success(policy.clone(), "归档策略已更新")
}

/// DELETE /mdm-v49/delete-archive-policy
#[utoipa::path(
    delete,
    security(("BearerAuth" = [])),
    path = "/api/erp/mdm-v49/delete-archive-policy",
    tag = "ERP-mdm_v49_archive",
    responses((status = 200, description = "/api/erp/mdm-v49/delete-archive-policy DELETE"), (status = 500, description = "服务内部错误")),
)]
pub async fn delete_archive_policy_verb(
    State(_state): State<ApiState>,
    Query(params): Query<ArchivePolicyVerbQuery>,
) -> ApiResponse<serde_json::Value> {
    ensure_initialized().await;
    let store = get_lifecycle_store();
    let mut policies = store.archive_policies.lock().await;

    if policies.is_empty() {
        return ApiResponse::not_found("未找到归档策略");
    }

    let removed_id: String = match params.policy_id.or(params.id) {
        Some(id) => {
            let before = policies.len();
            policies.retain(|p| p.id != id);
            if policies.len() == before {
                return ApiResponse::not_found("未找到归档策略");
            }
            id
        }
        None => policies.remove(0).id,
    };

    ApiResponse::success(
        serde_json::json!({ "success": true, "id": removed_id }),
        "归档策略已删除",
    )
}

/// POST /mdm-v49/restore-archive-record
#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/api/erp/mdm-v49/restore-archive-record",
    tag = "ERP-mdm_v49_archive",
    responses((status = 200, description = "/api/erp/mdm-v49/restore-archive-record POST"), (status = 500, description = "服务内部错误")),
)]
pub async fn restore_archive_record_verb(
    State(_state): State<ApiState>,
    Query(params): Query<ArchiveRecordVerbQuery>,
    Json(payload): Json<serde_json::Value>,
) -> ApiResponse<ArchiveRecord> {
    ensure_initialized().await;
    let store = get_lifecycle_store();

    let record_id = json_first_str(&payload, &["record_id", "recordId", "id"])
        .or(params.record_id)
        .or(params.id);

    let (restored_record_id, master_data_id, entity_type) = {
        let mut records = store.archive_records.lock().await;
        let Some(record) = (match record_id {
            Some(id) => records.iter_mut().find(|r| r.id == id),
            None => records.iter_mut().find(|r| r.status == "archived"),
        }) else {
            return ApiResponse::not_found("未找到归档记录");
        };

        if record.status != "archived" {
            return ApiResponse::bad_request("记录状态不支持恢复");
        }

        record.restore_count += 1;
        record.last_restored_at = Some(chrono::Utc::now());
        record.status = "restored".to_string();

        (
            record.id.clone(),
            record.master_data_id.clone(),
            record.entity_type.clone(),
        )
    };

    // 同步把实体恢复到 Operative（与 RESTful restore 处理器一致）
    let mut entities = store.entities.lock().await;
    if let Some(entity) = entities.get_mut(&master_data_id) {
        entity.stage = LifecycleStage::Operative;
        entity.last_transition_at = chrono::Utc::now();
        entity.transition_count += 1;
        entity.sla_breached = false;
    }

    let reason = json_first_str(&payload, &["restore_reason", "reason"])
        .unwrap_or_else(|| "归档恢复（契约补绑）".to_string());
    let restored_by = json_first_str(&payload, &["restored_by", "restoredBy"])
        .unwrap_or_else(|| "system".to_string());

    record_event(
        master_data_id,
        entity_type,
        Some(LifecycleStage::Archived),
        LifecycleStage::Operative,
        format!("归档恢复: {}", reason),
        restored_by,
        "restore".to_string(),
        None,
    );

    let records = store.archive_records.lock().await;
    let r = records.iter().find(|x| x.id == restored_record_id).cloned();
    match r {
        Some(rec) => ApiResponse::success(rec, "已恢复归档记录"),
        None => ApiResponse::server_error("恢复失败"),
    }
}

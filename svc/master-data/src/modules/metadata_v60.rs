//! STATUS: WIRED | Routes registered + DB tables initialized + Handlers implemented
//! V60.0 MDM AC-32: 元数据管理 + 数据血缘增强 + 生命周期管理
//!
//! 核心能力：
//! - 元数据管理: 元数据对象CRUD、属性管理、标签管理、统计分析
//! - 数据血缘增强: 多层级血缘追踪、影响分析、血缘图谱、导出
//! - 生命周期管理: 阶段管理、策略配置、自动转换、批量操作

use axum::{extract::Path, extract::Query, extract::State, Json};
use serde::Deserialize;
use sqlx::Row;
use std::collections::HashMap;
use topems_shared_core::response::ApiResponse;

use crate::shared::AppState;

// ==================== K1：真表映射（master_data.mdm_metadata_objects） ====================

/// MetadataObjectType → snake 字符串（写库）。
fn object_type_to_str(t: &MetadataObjectType) -> String {
    serde_json::to_value(t)
        .ok()
        .and_then(|v| v.as_str().map(|s| s.to_string()))
        .unwrap_or_default()
}

/// 行 → MetadataObject。
fn metadata_from_row(row: &sqlx::postgres::PgRow) -> MetadataObject {
    MetadataObject {
        id: row.get::<String, _>("id"),
        name: row.get::<String, _>("name"),
        object_type: parse_metadata_type(&row.get::<String, _>("object_type"))
            .unwrap_or(MetadataObjectType::Table),
        description: row.get::<String, _>("description"),
        owner: row.get::<String, _>("owner"),
        tags: serde_json::from_value(row.get::<serde_json::Value, _>("tags")).unwrap_or_default(),
        attributes: row.get::<serde_json::Value, _>("attributes"),
        created_at: row.get::<String, _>("created_at"),
        updated_at: row.get::<String, _>("updated_at"),
    }
}

const METADATA_COLS: &str =
    "id, name, object_type, description, owner, tags, attributes, created_at, updated_at";

// ==================== 纯函数（无副作用，可单测） ====================

/// 标签规范化：
/// - 去除首尾空白
/// - 转为小写
/// - 将内部连续空白（含空格、制表符、换行）替换为单个连字符 `-`
/// - 空字符串返回空字符串
pub fn normalize_tag(tag: &str) -> String {
    let trimmed = tag.trim();
    if trimmed.is_empty() {
        return String::new();
    }
    let mut result = String::with_capacity(trimmed.len());
    let mut prev_dash = false;
    for ch in trimmed.chars() {
        if ch.is_whitespace() {
            if !prev_dash {
                result.push('-');
                prev_dash = true;
            }
        } else {
            for lower in ch.to_lowercase() {
                result.push(lower);
            }
            prev_dash = false;
        }
    }
    result
}

/// 校验生命周期阶段转换是否合法。
/// 合法阶段：draft → review → approved → published → archived → deprecated
/// 合法转换：
/// - 同阶段（self-transition）始终允许
/// - draft -> review, approved
/// - review -> approved, draft
/// - approved -> published, draft
/// - published -> archived, review
/// - archived -> deprecated, published
/// - deprecated -> archived（仅允许回退）
/// 未知阶段返回 false。
pub fn is_valid_lifecycle_transition(from: &str, to: &str) -> bool {
    let f = from.trim().to_lowercase();
    let t = to.trim().to_lowercase();
    if f == t {
        return true;
    }
    let allowed: &[(&str, &str)] = &[
        ("draft", "review"),
        ("draft", "approved"),
        ("review", "approved"),
        ("review", "draft"),
        ("approved", "published"),
        ("approved", "draft"),
        ("published", "archived"),
        ("published", "review"),
        ("archived", "deprecated"),
        ("archived", "published"),
        ("deprecated", "archived"),
    ];
    allowed.iter().any(|(a, b)| *a == f && *b == t)
}

// ==================== 元数据管理：数据结构 ====================

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MetadataObjectType {
    Table,
    Field,
    Entity,
    Model,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct MetadataObject {
    pub id: String,
    pub name: String,
    pub object_type: MetadataObjectType,
    pub description: String,
    pub owner: String,
    pub tags: Vec<String>,
    pub attributes: serde_json::Value,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct MetadataAttribute {
    pub id: String,
    pub object_id: String,
    pub key: String,
    pub value: String,
    pub data_type: String,
    pub is_required: bool,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct MetadataTag {
    pub id: String,
    pub name: String,
    pub color: String,
    pub description: String,
    pub usage_count: u64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct MetadataStats {
    pub total_objects: usize,
    pub total_attributes: usize,
    pub total_tags: usize,
    pub by_type: HashMap<String, usize>,
    pub recent_created: Vec<MetadataObject>,
}

// ==================== 元数据管理：引擎 ====================

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TransformationType {
    Filter,
    Map,
    Aggregate,
    Join,
    Transform,
    Load,
    Extract,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct LineageNodeV60 {
    pub id: String,
    pub entity_id: String,
    pub entity_type: String,
    pub name: String,
    pub attributes: serde_json::Value,
    pub level: u32,
    pub position: serde_json::Value,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct LineageEdgeV60 {
    pub id: String,
    pub source_id: String,
    pub target_id: String,
    pub transformation_type: TransformationType,
    pub transformation_details: serde_json::Value,
    pub confidence: f64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct LineageGraph {
    pub id: String,
    pub nodes: Vec<LineageNodeV60>,
    pub edges: Vec<LineageEdgeV60>,
    pub root_ids: Vec<String>,
    pub updated_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct LineageImpact {
    pub entity_id: String,
    pub entity_type: String,
    pub affected_nodes: usize,
    pub affected_downstream: usize,
    pub confidence: f64,
    pub impact_score: f64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct LineageDashboard {
    pub total_graphs: usize,
    pub total_nodes: usize,
    pub total_edges: usize,
    pub entity_types: Vec<String>,
    pub avg_confidence: f64,
    pub deepest_level: u32,
}

// ==================== 数据血缘增强：引擎 ====================

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LifecycleStage {
    Created,
    Active,
    Maintenance,
    Deprecated,
    Archived,
    Deleted,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct LifecyclePolicy {
    pub id: String,
    pub entity_type: String,
    pub transitions: serde_json::Value,
    pub duration_days: u32,
    pub actions: Vec<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct LifecycleHistory {
    pub id: String,
    pub entity_id: String,
    pub stage: LifecycleStage,
    pub from_stage: Option<LifecycleStage>,
    pub reason: String,
    pub changed_at: String,
    pub changed_by: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct LifecycleDashboard {
    pub total_entities: usize,
    pub by_stage: HashMap<String, usize>,
    pub policies_count: usize,
    pub recent_transitions: Vec<LifecycleHistory>,
}

// ==================== 生命周期管理：引擎 ====================

fn metadata_type_str(t: &MetadataObjectType) -> &str {
    match t {
        MetadataObjectType::Table => "table",
        MetadataObjectType::Field => "field",
        MetadataObjectType::Entity => "entity",
        MetadataObjectType::Model => "model",
    }
}

fn parse_metadata_type(s: &str) -> Option<MetadataObjectType> {
    match s {
        "table" => Some(MetadataObjectType::Table),
        "field" => Some(MetadataObjectType::Field),
        "entity" => Some(MetadataObjectType::Entity),
        "model" => Some(MetadataObjectType::Model),
        _ => None,
    }
}

fn lifecycle_stage_str(s: &LifecycleStage) -> &str {
    match s {
        LifecycleStage::Created => "created",
        LifecycleStage::Active => "active",
        LifecycleStage::Maintenance => "maintenance",
        LifecycleStage::Deprecated => "deprecated",
        LifecycleStage::Archived => "archived",
        LifecycleStage::Deleted => "deleted",
    }
}

fn parse_lifecycle_stage(s: &str) -> Option<LifecycleStage> {
    match s {
        "created" => Some(LifecycleStage::Created),
        "active" => Some(LifecycleStage::Active),
        "maintenance" => Some(LifecycleStage::Maintenance),
        "deprecated" => Some(LifecycleStage::Deprecated),
        "archived" => Some(LifecycleStage::Archived),
        "deleted" => Some(LifecycleStage::Deleted),
        _ => None,
    }
}

fn transformation_type_str(t: &TransformationType) -> &str {
    match t {
        TransformationType::Filter => "filter",
        TransformationType::Map => "map",
        TransformationType::Aggregate => "aggregate",
        TransformationType::Join => "join",
        TransformationType::Transform => "transform",
        TransformationType::Load => "load",
        TransformationType::Extract => "extract",
    }
}

// ==================== 初始化种子数据 ====================

// ==================== 请求/响应结构 ====================

// --- 元数据管理请求 ---

#[derive(Debug, Deserialize)]
pub struct CreateMetadataRequest {
    pub name: String,
    pub object_type: String,
    pub description: Option<String>,
    pub owner: String,
    pub tags: Option<Vec<String>>,
    pub attributes: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateMetadataRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub owner: Option<String>,
    pub tags: Option<Vec<String>>,
    pub attributes: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct AddAttributeRequest {
    pub object_id: String,
    pub key: String,
    pub value: String,
    pub data_type: Option<String>,
    pub is_required: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct AddTagRequest {
    pub name: String,
    pub color: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ListMetadataQuery {
    pub object_type: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SearchMetadataQuery {
    pub q: String,
}

// --- 数据血缘增强请求 ---

#[derive(Debug, Deserialize)]
pub struct BuildLineageGraphRequest {
    pub root_entity_id: String,
    pub root_entity_type: String,
    pub max_depth: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct GetPathRequest {
    pub source_id: String,
    pub target_id: String,
}

#[derive(Debug, Deserialize)]
pub struct ExportLineageQuery {
    pub format: Option<String>,
}

// --- 生命周期管理请求 ---

#[derive(Debug, Deserialize)]
pub struct TransitionRequest {
    pub new_stage: String,
    pub reason: Option<String>,
    pub changed_by: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreatePolicyRequest {
    pub entity_type: String,
    pub transitions: serde_json::Value,
    pub duration_days: Option<u32>,
    pub actions: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct GetPoliciesQuery {
    pub entity_type: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BulkTransitionRequest {
    pub entity_ids: Vec<String>,
    pub target_stage: String,
    pub reason: Option<String>,
    pub changed_by: Option<String>,
}

// ==================== 处理器：元数据管理 ====================

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:metadata:write"])),
    path = "/mdm-v60/metadata",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "metadata_v60"
)]
pub async fn create_metadata(
    State(state): State<AppState>,
    Json(req): Json<CreateMetadataRequest>,
) -> ApiResponse<MetadataObject> {
    let object_type = match parse_metadata_type(&req.object_type) {
        Some(t) => t,
        None => return ApiResponse::bad_request("无效的元数据对象类型"),
    };

    let now = chrono::Utc::now().to_rfc3339();
    let obj = MetadataObject {
        id: uuid::Uuid::new_v4().to_string(),
        name: req.name,
        object_type,
        description: req.description.unwrap_or_default(),
        owner: req.owner,
        tags: req.tags.unwrap_or_default(),
        attributes: req.attributes.unwrap_or_else(|| serde_json::json!({})),
        created_at: now.clone(),
        updated_at: now,
    };

    // K1：写真表 master_data.mdm_metadata_objects。
    if let Err(e) = sqlx::query(
        r#"INSERT INTO master_data.mdm_metadata_objects
           (id, name, object_type, description, owner, tags, attributes, created_at, updated_at, tenant_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))"#,
    )
    .bind(&obj.id)
    .bind(&obj.name)
    .bind(object_type_to_str(&obj.object_type))
    .bind(&obj.description)
    .bind(&obj.owner)
    .bind(serde_json::to_value(&obj.tags).unwrap_or(serde_json::json!([])))
    .bind(&obj.attributes)
    .bind(&obj.created_at)
    .bind(&obj.updated_at)
    .execute(&state.db)
    .await
    {
        return ApiResponse::server_error(&format!("写入元数据对象失败: {e}"));
    }

    ApiResponse::success(obj, "元数据对象已创建")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:metadata:read"])),
    path = "/mdm-v60/metadata/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "metadata_v60"
)]
pub async fn get_metadata(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> ApiResponse<MetadataObject> {
    // K1：真表读取。
    let row = sqlx::query(&format!(
        "SELECT {METADATA_COLS} FROM master_data.mdm_metadata_objects WHERE id = $1 LIMIT 1"
    ))
    .bind(&id)
    .fetch_optional(&state.db)
    .await
    .unwrap_or(None);

    match row {
        Some(r) => ApiResponse::success(metadata_from_row(&r), "元数据对象"),
        None => ApiResponse::not_found("未找到元数据对象"),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:metadata:read"])),
    path = "/mdm-v60/metadata",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "metadata_v60"
)]
pub async fn list_metadata(
    State(state): State<AppState>,
    Query(params): Query<ListMetadataQuery>,
) -> ApiResponse<Vec<MetadataObject>> {
    // K1：真表读取，可选 object_type 过滤。
    let rows = sqlx::query(&format!(
        "SELECT {METADATA_COLS} FROM master_data.mdm_metadata_objects
             WHERE ($1::text IS NULL OR object_type = $1)
             ORDER BY updated_at DESC"
    ))
    .bind(params.object_type.as_deref())
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();
    let list: Vec<MetadataObject> = rows.iter().map(metadata_from_row).collect();
    ApiResponse::success(list, "元数据对象列表")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:metadata:read"])),
    path = "/mdm-v60/metadata/search",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "metadata_v60"
)]
pub async fn search_metadata(
    State(state): State<AppState>,
    Query(params): Query<SearchMetadataQuery>,
) -> ApiResponse<Vec<MetadataObject>> {
    // K1：真表 LIKE 搜索。
    let pattern = format!("%{}%", params.q);
    let rows = sqlx::query(&format!(
        r#"SELECT {METADATA_COLS} FROM master_data.mdm_metadata_objects
           WHERE name ILIKE $1 OR description ILIKE $1 OR owner ILIKE $1
           ORDER BY created_at DESC"#,
    ))
    .bind(&pattern)
    .fetch_all(&state.db)
    .await;
    let results: Vec<MetadataObject> = match rows {
        Ok(r) => r.iter().map(metadata_from_row).collect(),
        Err(e) => return ApiResponse::server_error(&format!("搜索元数据失败: {e}")),
    };

    ApiResponse::success(results, "元数据搜索结果")
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["master_data:metadata:write"])),
    path = "/mdm-v60/metadata/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "metadata_v60"
)]
pub async fn update_metadata(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<UpdateMetadataRequest>,
) -> ApiResponse<MetadataObject> {
    // K1：真表更新（COALESCE 仅覆盖传入字段），updated_at 刷新。
    let tags_json = req
        .tags
        .as_ref()
        .map(|t| serde_json::to_value(t).unwrap_or(serde_json::json!([])));
    let res = sqlx::query(
        r#"UPDATE master_data.mdm_metadata_objects
           SET name = COALESCE($2, name),
               description = COALESCE($3, description),
               owner = COALESCE($4, owner),
               tags = COALESCE($5, tags),
               attributes = COALESCE($6, attributes),
               updated_at = $7
           WHERE id = $1 AND (NULLIF(NULLIF(current_setting('app.tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::UUID IS NULL OR tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))"#,
    )
    .bind(&id)
    .bind(&req.name)
    .bind(&req.description)
    .bind(&req.owner)
    .bind(&tags_json)
    .bind(&req.attributes)
    .bind(chrono::Utc::now().to_rfc3339())
    .execute(&state.db)
    .await;

    match res {
        Ok(r) if r.rows_affected() > 0 => {}
        Ok(_) => return ApiResponse::not_found("未找到元数据对象"),
        Err(e) => return ApiResponse::server_error(&format!("更新元数据对象失败: {e}")),
    }

    let row = sqlx::query(&format!(
        "SELECT {METADATA_COLS} FROM master_data.mdm_metadata_objects WHERE id = $1 LIMIT 1"
    ))
    .bind(&id)
    .fetch_optional(&state.db)
    .await
    .unwrap_or(None);

    match row {
        Some(r) => ApiResponse::success(metadata_from_row(&r), "元数据对象已更新"),
        None => ApiResponse::not_found("未找到元数据对象"),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["master_data:metadata:write"])),
    path = "/mdm-v60/metadata/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "metadata_v60"
)]
pub async fn delete_metadata(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> ApiResponse<()> {
    // K1：真表删除。
    let res = sqlx::query("DELETE FROM master_data.mdm_metadata_objects WHERE id = $1 AND (NULLIF(NULLIF(current_setting('app.tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::UUID IS NULL OR tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))")
        .bind(&id)
        .execute(&state.db)
        .await;

    match res {
        Ok(r) if r.rows_affected() > 0 => ApiResponse::success((), "元数据对象已删除"),
        Ok(_) => ApiResponse::not_found("未找到元数据对象"),
        Err(e) => ApiResponse::server_error(&format!("删除元数据对象失败: {e}")),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:metadata:write"])),
    path = "/mdm-v60/metadata/{id}/attribute",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "metadata_v60"
)]
pub async fn add_attribute(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<AddAttributeRequest>,
) -> ApiResponse<MetadataAttribute> {
    // K1：写真表 master_data.mdm_metadata_attributes。
    let attr = MetadataAttribute {
        id: uuid::Uuid::new_v4().to_string(),
        object_id: id,
        key: req.key,
        value: req.value,
        data_type: req.data_type.unwrap_or_else(|| "string".to_string()),
        is_required: req.is_required.unwrap_or(false),
    };

    if let Err(e) = sqlx::query(
        r#"INSERT INTO master_data.mdm_metadata_attributes
           (id, object_id, key, value, data_type, is_required)
           VALUES ($1,$2,$3,$4,$5,$6)"#,
    )
    .bind(&attr.id)
    .bind(&attr.object_id)
    .bind(&attr.key)
    .bind(&attr.value)
    .bind(&attr.data_type)
    .bind(attr.is_required)
    .execute(&state.db)
    .await
    {
        return ApiResponse::server_error(&format!("添加属性失败: {e}"));
    }

    ApiResponse::success(attr, "属性已添加")
}
#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:metadata:write"])),
    path = "/mdm-v60/metadata/tag",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "metadata_v60"
)]
#[allow(
    clippy::as_conversions,
    clippy::cast_possible_wrap,
    clippy::cast_precision_loss,
    clippy::cast_sign_loss,
    clippy::cast_possible_truncation
)]
pub async fn add_tag(
    State(state): State<AppState>,
    Json(req): Json<AddTagRequest>,
) -> ApiResponse<MetadataTag> {
    // K1：写真表 master_data.mdm_metadata_tags。
    let tag = MetadataTag {
        id: uuid::Uuid::new_v4().to_string(),
        name: req.name,
        color: req.color.unwrap_or_else(|| "#95a5a6".to_string()),
        description: req.description.unwrap_or_default(),
        usage_count: 0,
    };

    if let Err(e) = sqlx::query(
        r#"INSERT INTO master_data.mdm_metadata_tags
           (id, name, color, description, usage_count)
           VALUES ($1,$2,$3,$4,$5)"#,
    )
    .bind(&tag.id)
    .bind(&tag.name)
    .bind(&tag.color)
    .bind(&tag.description)
    .bind(tag.usage_count as i64)
    .execute(&state.db)
    .await
    {
        return ApiResponse::server_error(&format!("添加标签失败: {e}"));
    }

    ApiResponse::success(tag, "标签已添加")
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:metadata:read"])),
    path = "/mdm-v60/metadata/stats",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "metadata_v60"
)]
#[allow(
    clippy::as_conversions,
    clippy::cast_possible_wrap,
    clippy::cast_precision_loss,
    clippy::cast_sign_loss,
    clippy::cast_possible_truncation
)]
pub async fn get_metadata_stats(State(state): State<AppState>) -> ApiResponse<MetadataStats> {
    // K1：数据源改真表（objects/attributes/tags），聚合逻辑保留。
    let obj_rows = sqlx::query(&format!(
        r#"SELECT {METADATA_COLS} FROM master_data.mdm_metadata_objects ORDER BY created_at DESC"#,
    ))
    .fetch_all(&state.db)
    .await;
    let objects: Vec<MetadataObject> = match obj_rows {
        Ok(r) => r.iter().map(metadata_from_row).collect(),
        Err(e) => return ApiResponse::server_error(&format!("查询元数据失败: {e}")),
    };

    let attr_count =
        sqlx::query("SELECT COUNT(*) AS total FROM master_data.mdm_metadata_attributes")
            .fetch_one(&state.db)
            .await;
    let tag_count = sqlx::query("SELECT COUNT(*) AS total FROM master_data.mdm_metadata_tags")
        .fetch_one(&state.db)
        .await;
    let (total_attributes, total_tags) = match (attr_count, tag_count) {
        (Ok(a), Ok(t)) => (a.get::<i64, _>("total"), t.get::<i64, _>("total")),
        _ => (0, 0),
    };

    let mut by_type = HashMap::new();
    for obj in objects.iter() {
        let key = metadata_type_str(&obj.object_type).to_string();
        *by_type.entry(key).or_insert(0) += 1;
    }

    let mut recent_created = objects.clone();
    recent_created.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    recent_created.truncate(10);

    ApiResponse::success(
        MetadataStats {
            total_objects: objects.len(),
            total_attributes: total_attributes as usize,
            total_tags: total_tags as usize,
            by_type,
            recent_created,
        },
        "元数据统计",
    )
}
#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:metadata:write"])),
    path = "/mdm-v60/lineage/graph",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "metadata_v60"
)]
#[allow(clippy::as_conversions, clippy::cast_possible_wrap)]
pub async fn build_lineage_graph(
    State(state): State<AppState>,
    Json(req): Json<BuildLineageGraphRequest>,
) -> ApiResponse<LineageGraph> {
    // K1：算法照搬，写入真表（nodes/edges/graphs）。
    let now = chrono::Utc::now().to_rfc3339();
    let graph_id = uuid::Uuid::new_v4().to_string();
    let max_depth = req.max_depth.unwrap_or(3);

    let root_node = LineageNodeV60 {
        id: uuid::Uuid::new_v4().to_string(),
        entity_id: req.root_entity_id.clone(),
        entity_type: req.root_entity_type.clone(),
        name: format!("{}:{}", req.root_entity_type, req.root_entity_id),
        attributes: serde_json::json!({"is_root": true}),
        level: 0,
        position: serde_json::json!({"x": 0, "y": 0}),
    };

    let mut nodes = vec![root_node.clone()];
    let mut edges = Vec::new();

    for level in 1..=max_depth {
        let node = LineageNodeV60 {
            id: uuid::Uuid::new_v4().to_string(),
            entity_id: format!("{}_level_{}", req.root_entity_id, level),
            entity_type: req.root_entity_type.clone(),
            name: format!("{} L{}", req.root_entity_type, level),
            attributes: serde_json::json!({"level": level}),
            level,
            position: serde_json::json!({"x": level as i64 * 100, "y": 0}),
        };

        let edge = LineageEdgeV60 {
            id: uuid::Uuid::new_v4().to_string(),
            source_id: nodes.last().unwrap().id.clone(),
            target_id: node.id.clone(),
            transformation_type: TransformationType::Transform,
            transformation_details: serde_json::json!({"step": level}),
            confidence: 0.9,
        };

        nodes.push(node);
        edges.push(edge);
    }

    let graph = LineageGraph {
        id: graph_id,
        nodes: nodes.clone(),
        edges: edges.clone(),
        root_ids: vec![root_node.id.clone()],
        updated_at: now,
    };

    for node in nodes.iter() {
        if let Err(e) = sqlx::query(
            r#"INSERT INTO master_data.mdm_v60_lineage_nodes
               (id, entity_id, entity_type, name, attributes, level, position)
               VALUES ($1,$2,$3,$4,$5,$6,$7)"#,
        )
        .bind(&node.id)
        .bind(&node.entity_id)
        .bind(&node.entity_type)
        .bind(&node.name)
        .bind(node.attributes.clone())
        .bind(node.level as i64)
        .bind(node.position.clone())
        .execute(&state.db)
        .await
        {
            return ApiResponse::server_error(&format!("写入血缘节点失败: {e}"));
        }
    }
    for edge in edges.iter() {
        if let Err(e) = sqlx::query(
            r#"INSERT INTO master_data.mdm_v60_lineage_edges
               (id, source_id, target_id, transformation_type, transformation_details, confidence)
               VALUES ($1,$2,$3,$4,$5,$6)"#,
        )
        .bind(&edge.id)
        .bind(&edge.source_id)
        .bind(&edge.target_id)
        .bind(transformation_type_str(&edge.transformation_type))
        .bind(edge.transformation_details.clone())
        .bind(edge.confidence)
        .execute(&state.db)
        .await
        {
            return ApiResponse::server_error(&format!("写入血缘边失败: {e}"));
        }
    }

    if let Err(e) = sqlx::query(
        r#"INSERT INTO master_data.mdm_v60_lineage_graphs
           (id, nodes, edges, root_ids, updated_at)
           VALUES ($1,$2,$3,$4,$5)"#,
    )
    .bind(&graph.id)
    .bind(serde_json::to_value(&graph.nodes).unwrap_or(serde_json::json!([])))
    .bind(serde_json::to_value(&graph.edges).unwrap_or(serde_json::json!([])))
    .bind(serde_json::to_value(&graph.root_ids).unwrap_or(serde_json::json!([])))
    .bind(&graph.updated_at)
    .execute(&state.db)
    .await
    {
        return ApiResponse::server_error(&format!("写入血缘图谱失败: {e}"));
    }

    ApiResponse::success(graph, "血缘图谱已构建")
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:read"])),
    path = "/mdm-v60/lineage/graph/{id}",
    params(
        ("id" = String, Path, description = "id"),
    ),
    responses((status = 200, description = "get_lineage_graph OK")),
    tag = "metadata_v60"
)]

pub async fn get_lineage_graph(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> ApiResponse<LineageGraph> {
    // K1：读真表。
    let row = sqlx::query(&format!(
        r#"SELECT {GRAPH_COLS} FROM master_data.mdm_v60_lineage_graphs WHERE id = $1 LIMIT 1"#,
    ))
    .bind(&id)
    .fetch_optional(&state.db)
    .await;
    match row {
        Ok(Some(r)) => ApiResponse::success(lineage_graph_from_row(&r), "血缘图谱"),
        Ok(None) => ApiResponse::not_found("未找到血缘图谱"),
        Err(e) => ApiResponse::server_error(&format!("查询血缘图谱失败: {e}")),
    }
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:read"])),
    path = "/mdm-v60/lineage/{id}/upstream",
    params(
        ("id" = String, Path, description = "id"),
    ),
    responses((status = 200, description = "get_upstream OK")),
    tag = "metadata_v60"
)]

pub async fn get_upstream(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> ApiResponse<Vec<LineageNodeV60>> {
    // K1：真表全量加载 + 内存 BFS（逻辑保留）。
    let result = upstream_downstream(&state, &id, true).await;
    match result {
        Ok(nodes) => ApiResponse::success(nodes, "上游血缘节点"),
        Err(e) => ApiResponse::server_error(&format!("查询上游血缘失败: {e}")),
    }
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:read"])),
    path = "/mdm-v60/lineage/{id}/downstream",
    params(
        ("id" = String, Path, description = "id"),
    ),
    responses((status = 200, description = "get_downstream OK")),
    tag = "metadata_v60"
)]

pub async fn get_downstream(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> ApiResponse<Vec<LineageNodeV60>> {
    // K1：真表全量加载 + 内存 BFS（逻辑保留）。
    let result = upstream_downstream(&state, &id, false).await;
    match result {
        Ok(nodes) => ApiResponse::success(nodes, "下游血缘节点"),
        Err(e) => ApiResponse::server_error(&format!("查询下游血缘失败: {e}")),
    }
}
#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:metadata:write"])),
    path = "/mdm-v60/lineage/path",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "metadata_v60"
)]
pub async fn get_path(
    State(state): State<AppState>,
    Json(req): Json<GetPathRequest>,
) -> ApiResponse<Vec<LineageEdgeV60>> {
    // K1：真表全量加载 + 内存 BFS（逻辑保留）。
    let edge_rows = sqlx::query(&format!(
        r#"SELECT {EDGE_COLS} FROM master_data.mdm_v60_lineage_edges ORDER BY id"#,
    ))
    .fetch_all(&state.db)
    .await;
    let edges: Vec<LineageEdgeV60> = match edge_rows {
        Ok(r) => r.iter().map(lineage_edge_from_row).collect(),
        Err(e) => return ApiResponse::server_error(&format!("查询血缘边失败: {e}")),
    };

    let mut adjacency: HashMap<String, Vec<LineageEdgeV60>> = HashMap::new();
    for edge in edges.iter() {
        adjacency
            .entry(edge.source_id.clone())
            .or_default()
            .push(edge.clone());
    }

    let mut queue: Vec<(String, Vec<LineageEdgeV60>)> = vec![(req.source_id, Vec::new())];
    let mut visited = std::collections::HashSet::new();

    while let Some((current, path)) = queue.pop() {
        if current == req.target_id {
            return ApiResponse::success(path, "血缘路径");
        }

        if !visited.insert(current.clone()) {
            continue;
        }

        if let Some(next_edges) = adjacency.get(&current) {
            for edge in next_edges {
                let mut new_path = path.clone();
                new_path.push(edge.clone());
                queue.push((edge.target_id.clone(), new_path));
            }
        }
    }

    ApiResponse::not_found("未找到血缘路径")
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:metadata:read"])),
    path = "/mdm-v60/lineage/{id}/impact",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "metadata_v60"
)]
#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
pub async fn get_lineage_impact(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> ApiResponse<LineageImpact> {
    // K1：真表 + 复用 upstream/downstream 逻辑。
    let downstream = match upstream_downstream(&state, &id, false).await {
        Ok(v) => v,
        Err(e) => return ApiResponse::server_error(&format!("查询下游血缘失败: {e}")),
    };
    let upstream = match upstream_downstream(&state, &id, true).await {
        Ok(v) => v,
        Err(e) => return ApiResponse::server_error(&format!("查询上游血缘失败: {e}")),
    };

    let affected_downstream = downstream.len();
    let affected_nodes = downstream.len() + upstream.len();
    let confidence = if downstream.is_empty() { 0.5 } else { 0.9 };
    let impact_score = (affected_downstream as f64 * 0.3 + affected_nodes as f64 * 0.1).min(1.0);

    ApiResponse::success(
        LineageImpact {
            entity_id: id,
            entity_type: "entity".to_string(),
            affected_nodes,
            affected_downstream,
            confidence,
            impact_score,
        },
        "血缘影响分析",
    )
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:metadata:read"])),
    path = "/mdm-v60/lineage/dashboard",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "metadata_v60"
)]
#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
pub async fn get_lineage_dashboard(State(state): State<AppState>) -> ApiResponse<LineageDashboard> {
    // K1：真表全量加载 + 聚合逻辑保留。
    let graph_rows = sqlx::query(&format!(
        r#"SELECT {GRAPH_COLS} FROM master_data.mdm_v60_lineage_graphs ORDER BY id"#,
    ))
    .fetch_all(&state.db)
    .await;
    let graphs: Vec<LineageGraph> = match graph_rows {
        Ok(r) => r.iter().map(lineage_graph_from_row).collect(),
        Err(e) => return ApiResponse::server_error(&format!("查询血缘图谱失败: {e}")),
    };

    let node_rows = sqlx::query(&format!(
        r#"SELECT {NODE_COLS} FROM master_data.mdm_v60_lineage_nodes ORDER BY id"#,
    ))
    .fetch_all(&state.db)
    .await;
    let nodes: Vec<LineageNodeV60> = match node_rows {
        Ok(r) => r.iter().map(lineage_node_from_row).collect(),
        Err(e) => return ApiResponse::server_error(&format!("查询血缘节点失败: {e}")),
    };

    let edge_rows = sqlx::query(&format!(
        r#"SELECT {EDGE_COLS} FROM master_data.mdm_v60_lineage_edges ORDER BY id"#,
    ))
    .fetch_all(&state.db)
    .await;
    let edges: Vec<LineageEdgeV60> = match edge_rows {
        Ok(r) => r.iter().map(lineage_edge_from_row).collect(),
        Err(e) => return ApiResponse::server_error(&format!("查询血缘边失败: {e}")),
    };

    let entity_types: Vec<String> = nodes
        .iter()
        .map(|n| n.entity_type.clone())
        .collect::<std::collections::HashSet<_>>()
        .into_iter()
        .collect();

    let avg_confidence = if edges.is_empty() {
        0.0
    } else {
        edges.iter().map(|e| e.confidence).sum::<f64>() / edges.len() as f64
    };

    let deepest_level = nodes.iter().map(|n| n.level).max().unwrap_or(0);

    ApiResponse::success(
        LineageDashboard {
            total_graphs: graphs.len(),
            total_nodes: nodes.len(),
            total_edges: edges.len(),
            entity_types,
            avg_confidence,
            deepest_level,
        },
        "血缘看板",
    )
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:read"])),
    path = "/mdm-v60/lineage/export",
    responses((status = 200, description = "export_lineage OK")),
    tag = "metadata_v60"
)]

pub async fn export_lineage(
    State(state): State<AppState>,
    Query(params): Query<ExportLineageQuery>,
) -> ApiResponse<serde_json::Value> {
    // K1：真表全量导出。
    let graph_rows = sqlx::query(&format!(
        r#"SELECT {GRAPH_COLS} FROM master_data.mdm_v60_lineage_graphs ORDER BY id"#,
    ))
    .fetch_all(&state.db)
    .await;
    let graphs: Vec<LineageGraph> = match graph_rows {
        Ok(r) => r.iter().map(lineage_graph_from_row).collect(),
        Err(e) => return ApiResponse::server_error(&format!("查询血缘图谱失败: {e}")),
    };

    let node_rows = sqlx::query(&format!(
        r#"SELECT {NODE_COLS} FROM master_data.mdm_v60_lineage_nodes ORDER BY id"#,
    ))
    .fetch_all(&state.db)
    .await;
    let nodes: Vec<LineageNodeV60> = match node_rows {
        Ok(r) => r.iter().map(lineage_node_from_row).collect(),
        Err(e) => return ApiResponse::server_error(&format!("查询血缘节点失败: {e}")),
    };

    let edge_rows = sqlx::query(&format!(
        r#"SELECT {EDGE_COLS} FROM master_data.mdm_v60_lineage_edges ORDER BY id"#,
    ))
    .fetch_all(&state.db)
    .await;
    let edges: Vec<LineageEdgeV60> = match edge_rows {
        Ok(r) => r.iter().map(lineage_edge_from_row).collect(),
        Err(e) => return ApiResponse::server_error(&format!("查询血缘边失败: {e}")),
    };

    ApiResponse::success(
        serde_json::json!({
            "graphs": graphs,
            "nodes": nodes,
            "edges": edges,
            "exported_at": chrono::Utc::now().to_rfc3339(),
            "format": params.format.unwrap_or_else(|| "json".to_string()),
        }),
        "血缘导出",
    )
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:metadata:read"])),
    path = "/mdm-v60/lifecycle/{id}/stage",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "metadata_v60"
)]
pub async fn get_current_stage(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> ApiResponse<serde_json::Value> {
    // K1：读真表 mdm_lifecycle_stages。
    let row = sqlx::query(
        "SELECT stage FROM master_data.mdm_lifecycle_stages WHERE entity_id = $1 LIMIT 1",
    )
    .bind(&id)
    .fetch_optional(&state.db)
    .await;
    match row {
        Ok(Some(r)) => {
            let stage = r.get::<String, _>("stage");
            ApiResponse::success(serde_json::json!({"stage": stage}), "当前生命周期阶段")
        }
        Ok(None) => ApiResponse::not_found("未找到实体的生命周期信息"),
        Err(e) => ApiResponse::server_error(&format!("查询生命周期阶段失败: {e}")),
    }
}
#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:metadata:write"])),
    path = "/mdm-v60/lifecycle/{id}/transition",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "metadata_v60"
)]
pub async fn transition_stage(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<TransitionRequest>,
) -> ApiResponse<LifecycleHistory> {
    // K1：写真表（UPSERT stages + INSERT history）。
    let new_stage = parse_lifecycle_stage(&req.new_stage).unwrap_or(LifecycleStage::Created);
    let now = chrono::Utc::now().to_rfc3339();

    let from_row = sqlx::query(
        "SELECT stage FROM master_data.mdm_lifecycle_stages WHERE entity_id = $1 LIMIT 1",
    )
    .bind(&id)
    .fetch_optional(&state.db)
    .await;
    let from_stage = match from_row {
        Ok(Some(r)) => parse_lifecycle_stage(&r.get::<String, _>("stage")),
        Ok(None) => None,
        Err(e) => return ApiResponse::server_error(&format!("查询生命周期阶段失败: {e}")),
    };

    let history = LifecycleHistory {
        id: uuid::Uuid::new_v4().to_string(),
        entity_id: id.clone(),
        stage: new_stage.clone(),
        from_stage: from_stage.clone(),
        reason: req.reason.unwrap_or_default(),
        changed_at: now,
        changed_by: req.changed_by.unwrap_or_else(|| "admin".to_string()),
    };

    if let Err(e) = sqlx::query(
        r#"INSERT INTO master_data.mdm_lifecycle_stages (entity_id, stage)
           VALUES ($1,$2)
           ON CONFLICT (entity_id) DO UPDATE SET stage = EXCLUDED.stage"#,
    )
    .bind(&id)
    .bind(lifecycle_stage_str(&new_stage))
    .execute(&state.db)
    .await
    {
        return ApiResponse::server_error(&format!("更新生命周期阶段失败: {e}"));
    }

    if let Err(e) = sqlx::query(
        r#"INSERT INTO master_data.mdm_lifecycle_history
           (id, entity_id, stage, from_stage, reason, changed_at, changed_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7)"#,
    )
    .bind(&history.id)
    .bind(&history.entity_id)
    .bind(lifecycle_stage_str(&history.stage))
    .bind(history.from_stage.as_ref().map(lifecycle_stage_str))
    .bind(&history.reason)
    .bind(&history.changed_at)
    .bind(&history.changed_by)
    .execute(&state.db)
    .await
    {
        return ApiResponse::server_error(&format!("写入生命周期历史失败: {e}"));
    }

    ApiResponse::success(history, "生命周期阶段已变更")
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:metadata:read"])),
    path = "/mdm-v60/lifecycle/{id}/history",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "metadata_v60"
)]
pub async fn get_lifecycle_history(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> ApiResponse<Vec<LifecycleHistory>> {
    // K1：读真表。
    let rows = sqlx::query(&format!(
        r#"SELECT {HISTORY_COLS} FROM master_data.mdm_lifecycle_history
           WHERE entity_id = $1 ORDER BY changed_at DESC"#,
    ))
    .bind(&id)
    .fetch_all(&state.db)
    .await;
    let history: Vec<LifecycleHistory> = match rows {
        Ok(r) => r.iter().map(lifecycle_history_from_row).collect(),
        Err(e) => return ApiResponse::server_error(&format!("查询生命周期历史失败: {e}")),
    };

    ApiResponse::success(history, "生命周期历史")
}
#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:metadata:write"])),
    path = "/mdm-v60/lifecycle/policy",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "metadata_v60"
)]
#[allow(
    clippy::as_conversions,
    clippy::cast_possible_wrap,
    clippy::cast_precision_loss,
    clippy::cast_sign_loss,
    clippy::cast_possible_truncation
)]
pub async fn create_policy(
    State(state): State<AppState>,
    Json(req): Json<CreatePolicyRequest>,
) -> ApiResponse<LifecyclePolicy> {
    // K1：写真表 master_data.mdm_lifecycle_policies。
    let policy = LifecyclePolicy {
        id: uuid::Uuid::new_v4().to_string(),
        entity_type: req.entity_type,
        transitions: req.transitions,
        duration_days: req.duration_days.unwrap_or(0),
        actions: req.actions.unwrap_or_default(),
    };

    if let Err(e) = sqlx::query(
        r#"INSERT INTO master_data.mdm_lifecycle_policies
           (id, entity_type, transitions, duration_days, actions)
           VALUES ($1,$2,$3,$4,$5)"#,
    )
    .bind(&policy.id)
    .bind(&policy.entity_type)
    .bind(policy.transitions.clone())
    .bind(policy.duration_days as i64)
    .bind(serde_json::to_value(&policy.actions).unwrap_or(serde_json::json!([])))
    .execute(&state.db)
    .await
    {
        return ApiResponse::server_error(&format!("创建生命周期策略失败: {e}"));
    }

    ApiResponse::success(policy, "生命周期策略已创建")
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:metadata:read"])),
    path = "/mdm-v60/lifecycle/policies",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "metadata_v60"
)]
pub async fn get_policies(
    State(state): State<AppState>,
    Query(params): Query<GetPoliciesQuery>,
) -> ApiResponse<Vec<LifecyclePolicy>> {
    // K1：真表 COALESCE 过滤。
    let rows = sqlx::query(&format!(
        r#"SELECT {POLICY_COLS} FROM master_data.mdm_lifecycle_policies
           WHERE ($1::text IS NULL OR entity_type = $1) ORDER BY entity_type"#,
    ))
    .bind(params.entity_type.as_deref())
    .fetch_all(&state.db)
    .await;
    let policies: Vec<LifecyclePolicy> = match rows {
        Ok(r) => r.iter().map(lifecycle_policy_from_row).collect(),
        Err(e) => return ApiResponse::server_error(&format!("查询生命周期策略失败: {e}")),
    };

    ApiResponse::success(policies, "生命周期策略列表")
}
#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:metadata:write"])),
    path = "/mdm-v60/lifecycle/auto-transition",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "metadata_v60"
)]
pub async fn auto_transition(State(state): State<AppState>) -> ApiResponse<Vec<LifecycleHistory>> {
    // K1：读真表 policies + stages，逐 transition 执行（逻辑保留）。
    let policy_rows = sqlx::query(&format!(
        r#"SELECT {POLICY_COLS} FROM master_data.mdm_lifecycle_policies ORDER BY entity_type"#,
    ))
    .fetch_all(&state.db)
    .await;
    let policies: Vec<LifecyclePolicy> = match policy_rows {
        Ok(r) => r.iter().map(lifecycle_policy_from_row).collect(),
        Err(e) => return ApiResponse::server_error(&format!("查询生命周期策略失败: {e}")),
    };

    let stage_rows = sqlx::query(
        "SELECT entity_id, stage FROM master_data.mdm_lifecycle_stages ORDER BY entity_id",
    )
    .fetch_all(&state.db)
    .await;
    let mut current: HashMap<String, LifecycleStage> = match stage_rows {
        Ok(r) => r
            .iter()
            .map(|row| {
                (
                    row.get::<String, _>("entity_id"),
                    parse_lifecycle_stage(&row.get::<String, _>("stage"))
                        .unwrap_or(LifecycleStage::Created),
                )
            })
            .collect(),
        Err(e) => return ApiResponse::server_error(&format!("查询生命周期阶段失败: {e}")),
    };

    let mut results = Vec::new();

    for policy in policies.iter() {
        if let Some(transitions) = policy.transitions.as_array() {
            for transition in transitions {
                if let (Some(from), Some(to)) = (
                    transition.get("from").and_then(|v| v.as_str()),
                    transition.get("to").and_then(|v| v.as_str()),
                ) {
                    let matching: Vec<String> = current
                        .iter()
                        .filter(|(_, v)| lifecycle_stage_str(v) == from)
                        .map(|(k, _)| k.clone())
                        .collect();

                    for entity_id in matching {
                        if let Some(to_stage) = parse_lifecycle_stage(to) {
                            let now = chrono::Utc::now().to_rfc3339();
                            let from_stage = current.get(&entity_id).cloned();

                            let history = LifecycleHistory {
                                id: uuid::Uuid::new_v4().to_string(),
                                entity_id: entity_id.clone(),
                                stage: to_stage.clone(),
                                from_stage: from_stage.clone(),
                                reason: format!("auto_transition: {}", policy.entity_type),
                                changed_at: now,
                                changed_by: "system".to_string(),
                            };

                            if let Err(e) = sqlx::query(
                                r#"INSERT INTO master_data.mdm_lifecycle_stages (entity_id, stage)
                                   VALUES ($1,$2)
                                   ON CONFLICT (entity_id) DO UPDATE SET stage = EXCLUDED.stage"#,
                            )
                            .bind(&entity_id)
                            .bind(lifecycle_stage_str(&to_stage))
                            .execute(&state.db)
                            .await
                            {
                                return ApiResponse::server_error(&format!(
                                    "更新生命周期阶段失败: {e}"
                                ));
                            }

                            if let Err(e) = sqlx::query(
                                r#"INSERT INTO master_data.mdm_lifecycle_history
                                   (id, entity_id, stage, from_stage, reason, changed_at, changed_by)
                                   VALUES ($1,$2,$3,$4,$5,$6,$7)"#,
                            )
                            .bind(&history.id)
                            .bind(&history.entity_id)
                            .bind(lifecycle_stage_str(&history.stage))
                            .bind(history.from_stage.as_ref().map(lifecycle_stage_str))
                            .bind(&history.reason)
                            .bind(&history.changed_at)
                            .bind(&history.changed_by)
                            .execute(&state.db)
                            .await
                            {
                                return ApiResponse::server_error(
                                    &format!("写入生命周期历史失败: {e}"),
                                );
                            }

                            current.insert(entity_id.clone(), to_stage);
                            results.push(history);
                        }
                    }
                }
            }
        }
    }

    ApiResponse::success(results, "自动生命周期流转完成")
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:metadata:read"])),
    path = "/mdm-v60/lifecycle/dashboard",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "metadata_v60"
)]
#[allow(
    clippy::as_conversions,
    clippy::cast_possible_wrap,
    clippy::cast_precision_loss,
    clippy::cast_sign_loss,
    clippy::cast_possible_truncation
)]
pub async fn get_lifecycle_dashboard(
    State(state): State<AppState>,
) -> ApiResponse<LifecycleDashboard> {
    // K1：真表全量加载 + 聚合逻辑保留。
    let stage_rows = sqlx::query(
        "SELECT entity_id, stage FROM master_data.mdm_lifecycle_stages ORDER BY entity_id",
    )
    .fetch_all(&state.db)
    .await;
    let stages: Vec<(String, LifecycleStage)> = match stage_rows {
        Ok(r) => r
            .iter()
            .map(|row| {
                (
                    row.get::<String, _>("entity_id"),
                    parse_lifecycle_stage(&row.get::<String, _>("stage"))
                        .unwrap_or(LifecycleStage::Created),
                )
            })
            .collect(),
        Err(e) => return ApiResponse::server_error(&format!("查询生命周期阶段失败: {e}")),
    };

    let policy_count =
        sqlx::query("SELECT COUNT(*) AS total FROM master_data.mdm_lifecycle_policies")
            .fetch_one(&state.db)
            .await;

    let hist_rows = sqlx::query(&format!(
        r#"SELECT {HISTORY_COLS} FROM master_data.mdm_lifecycle_history ORDER BY changed_at DESC"#,
    ))
    .fetch_all(&state.db)
    .await;
    let history: Vec<LifecycleHistory> = match hist_rows {
        Ok(r) => r.iter().map(lifecycle_history_from_row).collect(),
        Err(e) => return ApiResponse::server_error(&format!("查询生命周期历史失败: {e}")),
    };

    let policies_count = match policy_count {
        Ok(r) => r.get::<i64, _>("total") as usize,
        Err(_) => 0,
    };

    let mut by_stage = HashMap::new();
    for (_, stage) in stages.iter() {
        let key = lifecycle_stage_str(stage).to_string();
        *by_stage.entry(key).or_insert(0) += 1;
    }

    let mut recent_transitions = history.clone();
    recent_transitions.sort_by(|a, b| b.changed_at.cmp(&a.changed_at));
    recent_transitions.truncate(10);

    ApiResponse::success(
        LifecycleDashboard {
            total_entities: stages.len(),
            by_stage,
            policies_count,
            recent_transitions,
        },
        "生命周期看板",
    )
}
#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:metadata:write"])),
    path = "/mdm-v60/lifecycle/bulk",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "metadata_v60"
)]
pub async fn bulk_transition(
    State(state): State<AppState>,
    Json(req): Json<BulkTransitionRequest>,
) -> ApiResponse<Vec<LifecycleHistory>> {
    // K1：循环执行生命周期流转（真表 UPSERT + history）。
    let target_stage = parse_lifecycle_stage(&req.target_stage).unwrap_or(LifecycleStage::Created);
    let reason = req.reason.unwrap_or_default();
    let changed_by = req.changed_by.unwrap_or_else(|| "admin".to_string());
    let mut results = Vec::new();

    for entity_id in req.entity_ids {
        let now = chrono::Utc::now().to_rfc3339();

        let from_row = sqlx::query(
            "SELECT stage FROM master_data.mdm_lifecycle_stages WHERE entity_id = $1 LIMIT 1",
        )
        .bind(&entity_id)
        .fetch_optional(&state.db)
        .await;
        let from_stage = match from_row {
            Ok(Some(r)) => parse_lifecycle_stage(&r.get::<String, _>("stage")),
            Ok(None) => None,
            Err(e) => return ApiResponse::server_error(&format!("查询生命周期阶段失败: {e}")),
        };

        let history = LifecycleHistory {
            id: uuid::Uuid::new_v4().to_string(),
            entity_id: entity_id.clone(),
            stage: target_stage.clone(),
            from_stage: from_stage.clone(),
            reason: reason.clone(),
            changed_at: now,
            changed_by: changed_by.clone(),
        };

        if let Err(e) = sqlx::query(
            r#"INSERT INTO master_data.mdm_lifecycle_stages (entity_id, stage)
               VALUES ($1,$2)
               ON CONFLICT (entity_id) DO UPDATE SET stage = EXCLUDED.stage"#,
        )
        .bind(&entity_id)
        .bind(lifecycle_stage_str(&target_stage))
        .execute(&state.db)
        .await
        {
            return ApiResponse::server_error(&format!("更新生命周期阶段失败: {e}"));
        }

        if let Err(e) = sqlx::query(
            r#"INSERT INTO master_data.mdm_lifecycle_history
               (id, entity_id, stage, from_stage, reason, changed_at, changed_by)
               VALUES ($1,$2,$3,$4,$5,$6,$7)"#,
        )
        .bind(&history.id)
        .bind(&history.entity_id)
        .bind(lifecycle_stage_str(&history.stage))
        .bind(history.from_stage.as_ref().map(lifecycle_stage_str))
        .bind(&history.reason)
        .bind(&history.changed_at)
        .bind(&history.changed_by)
        .execute(&state.db)
        .await
        {
            return ApiResponse::server_error(&format!("写入生命周期历史失败: {e}"));
        }

        results.push(history);
    }

    ApiResponse::success(results, "批量生命周期流转完成")
}
async fn upstream_downstream(
    state: &AppState,
    entity_id: &str,
    upstream: bool,
) -> Result<Vec<LineageNodeV60>, sqlx::Error> {
    let edge_rows = sqlx::query(&format!(
        r#"SELECT {EDGE_COLS} FROM master_data.mdm_v60_lineage_edges ORDER BY id"#,
    ))
    .fetch_all(&state.db)
    .await?;
    let edges: Vec<LineageEdgeV60> = edge_rows.iter().map(lineage_edge_from_row).collect();

    let node_rows = sqlx::query(&format!(
        r#"SELECT {NODE_COLS} FROM master_data.mdm_v60_lineage_nodes ORDER BY id"#,
    ))
    .fetch_all(&state.db)
    .await?;
    let nodes: Vec<LineageNodeV60> = node_rows.iter().map(lineage_node_from_row).collect();

    let mut result = Vec::new();
    let mut visited = std::collections::HashSet::new();
    let mut queue = vec![entity_id.to_string()];

    while let Some(current) = queue.pop() {
        if !visited.insert(current.clone()) {
            continue;
        }

        let linked_edges: Vec<LineageEdgeV60> = edges
            .iter()
            .filter(|e| {
                if upstream {
                    e.target_id == current
                } else {
                    e.source_id == current
                }
            })
            .cloned()
            .collect();

        for edge in linked_edges {
            let next_id = if upstream {
                edge.source_id
            } else {
                edge.target_id
            };
            if let Some(node) = nodes.iter().find(|n| n.id == next_id).cloned() {
                queue.push(node.id.clone());
                result.push(node);
            }
        }
    }

    Ok(result)
}
// ==================== K1：真表映射（master_data.mdm_metadata_attributes / tags / v60_lineage / lifecycle） ====================

const ATTR_COLS: &str = "id, object_id, key, value, data_type, is_required";
const TAG_COLS: &str = "id, name, color, description, usage_count";
const NODE_COLS: &str = "id, entity_id, entity_type, name, attributes, level, position";
const EDGE_COLS: &str =
    "id, source_id, target_id, transformation_type, transformation_details, confidence";
const GRAPH_COLS: &str = "id, nodes, edges, root_ids, updated_at";
const POLICY_COLS: &str = "id, entity_type, transitions, duration_days, actions";
const HISTORY_COLS: &str = "id, entity_id, stage, from_stage, reason, changed_at, changed_by";

fn parse_transformation_type(s: &str) -> TransformationType {
    match s {
        "filter" => TransformationType::Filter,
        "map" => TransformationType::Map,
        "aggregate" => TransformationType::Aggregate,
        "join" => TransformationType::Join,
        "load" => TransformationType::Load,
        "extract" => TransformationType::Extract,
        _ => TransformationType::Transform,
    }
}

fn metadata_attribute_from_row(row: &sqlx::postgres::PgRow) -> MetadataAttribute {
    use sqlx::Row;
    MetadataAttribute {
        id: row.get::<String, _>("id"),
        object_id: row.get::<String, _>("object_id"),
        key: row.get::<String, _>("key"),
        value: row.get::<String, _>("value"),
        data_type: row.get::<String, _>("data_type"),
        is_required: row.get::<bool, _>("is_required"),
    }
}

#[allow(
    clippy::as_conversions,
    clippy::cast_possible_wrap,
    clippy::cast_precision_loss,
    clippy::cast_sign_loss,
    clippy::cast_possible_truncation
)]
fn metadata_tag_from_row(row: &sqlx::postgres::PgRow) -> MetadataTag {
    use sqlx::Row;
    MetadataTag {
        id: row.get::<String, _>("id"),
        name: row.get::<String, _>("name"),
        color: row.get::<String, _>("color"),
        description: row.get::<String, _>("description"),
        usage_count: row.get::<i64, _>("usage_count") as u64,
    }
}

#[allow(
    clippy::as_conversions,
    clippy::cast_possible_wrap,
    clippy::cast_precision_loss,
    clippy::cast_sign_loss,
    clippy::cast_possible_truncation
)]
fn lineage_node_from_row(row: &sqlx::postgres::PgRow) -> LineageNodeV60 {
    use sqlx::Row;
    LineageNodeV60 {
        id: row.get::<String, _>("id"),
        entity_id: row.get::<String, _>("entity_id"),
        entity_type: row.get::<String, _>("entity_type"),
        name: row.get::<String, _>("name"),
        attributes: row.get::<serde_json::Value, _>("attributes"),
        level: row.get::<i64, _>("level") as u32,
        position: row.get::<serde_json::Value, _>("position"),
    }
}

fn lineage_edge_from_row(row: &sqlx::postgres::PgRow) -> LineageEdgeV60 {
    use sqlx::Row;
    LineageEdgeV60 {
        id: row.get::<String, _>("id"),
        source_id: row.get::<String, _>("source_id"),
        target_id: row.get::<String, _>("target_id"),
        transformation_type: parse_transformation_type(
            &row.get::<String, _>("transformation_type"),
        ),
        transformation_details: row.get::<serde_json::Value, _>("transformation_details"),
        confidence: row.get::<f64, _>("confidence"),
    }
}

fn lineage_graph_from_row(row: &sqlx::postgres::PgRow) -> LineageGraph {
    use sqlx::Row;
    LineageGraph {
        id: row.get::<String, _>("id"),
        nodes: serde_json::from_value(row.get::<serde_json::Value, _>("nodes")).unwrap_or_default(),
        edges: serde_json::from_value(row.get::<serde_json::Value, _>("edges")).unwrap_or_default(),
        root_ids: serde_json::from_value(row.get::<serde_json::Value, _>("root_ids"))
            .unwrap_or_default(),
        updated_at: row.get::<String, _>("updated_at"),
    }
}

#[allow(
    clippy::as_conversions,
    clippy::cast_possible_wrap,
    clippy::cast_precision_loss,
    clippy::cast_sign_loss,
    clippy::cast_possible_truncation
)]
fn lifecycle_policy_from_row(row: &sqlx::postgres::PgRow) -> LifecyclePolicy {
    use sqlx::Row;
    LifecyclePolicy {
        id: row.get::<String, _>("id"),
        entity_type: row.get::<String, _>("entity_type"),
        transitions: row.get::<serde_json::Value, _>("transitions"),
        duration_days: row.get::<i64, _>("duration_days") as u32,
        actions: serde_json::from_value(row.get::<serde_json::Value, _>("actions"))
            .unwrap_or_default(),
    }
}

fn lifecycle_history_from_row(row: &sqlx::postgres::PgRow) -> LifecycleHistory {
    use sqlx::Row;
    let from_stage: Option<String> = row.get::<Option<String>, _>("from_stage");
    LifecycleHistory {
        id: row.get::<String, _>("id"),
        entity_id: row.get::<String, _>("entity_id"),
        stage: parse_lifecycle_stage(&row.get::<String, _>("stage"))
            .unwrap_or(LifecycleStage::Created),
        from_stage: from_stage.and_then(|s| parse_lifecycle_stage(&s)),
        reason: row.get::<String, _>("reason"),
        changed_at: row.get::<String, _>("changed_at"),
        changed_by: row.get::<String, _>("changed_by"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ---------- normalize_tag ----------

    #[test]
    fn test_normalize_tag_empty() {
        assert_eq!(normalize_tag(""), "");
        assert_eq!(normalize_tag("   "), "");
        assert_eq!(normalize_tag("\t\n"), "");
    }

    #[test]
    fn test_normalize_tag_no_change() {
        assert_eq!(normalize_tag("alpha"), "alpha");
        assert_eq!(normalize_tag("v1"), "v1");
    }

    #[test]
    fn test_normalize_tag_lowercases() {
        assert_eq!(normalize_tag("Hello"), "hello");
        assert_eq!(normalize_tag("MIXEDCase"), "mixedcase");
    }

    #[test]
    fn test_normalize_tag_replaces_internal_whitespace() {
        assert_eq!(normalize_tag("hello world"), "hello-world");
        assert_eq!(normalize_tag("a b c"), "a-b-c");
    }

    #[test]
    fn test_normalize_tag_collapses_multiple_whitespace() {
        assert_eq!(normalize_tag("a  b"), "a-b");
        assert_eq!(normalize_tag("a\t\tb"), "a-b");
        assert_eq!(normalize_tag("a\n\nb"), "a-b");
        assert_eq!(normalize_tag("a \t\n b"), "a-b");
    }

    #[test]
    fn test_normalize_tag_trims_leading_trailing() {
        assert_eq!(normalize_tag("  hello  "), "hello");
        assert_eq!(normalize_tag("\tworld\n"), "world");
        assert_eq!(normalize_tag("  a b  "), "a-b");
    }

    #[test]
    fn test_normalize_tag_with_unicode() {
        // 中文标签保留，但前后空格去除
        assert_eq!(normalize_tag("  数据  "), "数据");
        assert_eq!(normalize_tag("数据 治理"), "数据-治理");
    }

    #[test]
    fn test_normalize_tag_special_chars_preserved() {
        // 特殊字符保留（仅空白被替换）
        assert_eq!(normalize_tag("a_b c"), "a_b-c");
        assert_eq!(normalize_tag("a.b@c"), "a.b@c");
    }

    #[test]
    fn test_normalize_tag_only_whitespace_becomes_empty() {
        assert_eq!(normalize_tag("     "), "");
        assert_eq!(normalize_tag("\t\t\t"), "");
    }

    // ---------- is_valid_lifecycle_transition ----------

    #[test]
    fn test_lifecycle_self_transition_always_valid() {
        assert!(is_valid_lifecycle_transition("draft", "draft"));
        assert!(is_valid_lifecycle_transition("published", "published"));
        assert!(is_valid_lifecycle_transition("archived", "archived"));
        // 未知阶段的同阶段也允许（因为 f == t 触发）
        assert!(is_valid_lifecycle_transition("unknown", "unknown"));
    }

    #[test]
    fn test_lifecycle_forward_transition_valid() {
        assert!(is_valid_lifecycle_transition("draft", "review"));
        assert!(is_valid_lifecycle_transition("review", "approved"));
        assert!(is_valid_lifecycle_transition("approved", "published"));
        assert!(is_valid_lifecycle_transition("published", "archived"));
        assert!(is_valid_lifecycle_transition("archived", "deprecated"));
    }

    #[test]
    fn test_lifecycle_backward_transition_valid() {
        assert!(is_valid_lifecycle_transition("review", "draft"));
        assert!(is_valid_lifecycle_transition("approved", "draft"));
        assert!(is_valid_lifecycle_transition("published", "review"));
        assert!(is_valid_lifecycle_transition("archived", "published"));
        assert!(is_valid_lifecycle_transition("deprecated", "archived"));
    }

    #[test]
    fn test_lifecycle_skip_transition_valid() {
        // draft -> approved（跳过 review）
        assert!(is_valid_lifecycle_transition("draft", "approved"));
    }

    #[test]
    fn test_lifecycle_invalid_forward_skip() {
        // draft -> published（跨多级）不允许
        assert!(!is_valid_lifecycle_transition("draft", "published"));
        // draft -> archived 不允许
        assert!(!is_valid_lifecycle_transition("draft", "archived"));
        // draft -> deprecated 不允许
        assert!(!is_valid_lifecycle_transition("draft", "deprecated"));
    }

    #[test]
    fn test_lifecycle_invalid_backward() {
        // published -> approved 不允许（已发布不能回退到已批准）
        assert!(!is_valid_lifecycle_transition("published", "approved"));
        // deprecated -> draft 不允许
        assert!(!is_valid_lifecycle_transition("deprecated", "draft"));
        // deprecated -> published 不允许（必须先回到 archived）
        assert!(!is_valid_lifecycle_transition("deprecated", "published"));
    }

    #[test]
    fn test_lifecycle_unknown_stage() {
        // 未知阶段之间的非自身转换不允许
        assert!(!is_valid_lifecycle_transition("draft", "unknown"));
        assert!(!is_valid_lifecycle_transition("unknown", "draft"));
        assert!(!is_valid_lifecycle_transition("foo", "bar"));
    }

    #[test]
    fn test_lifecycle_case_insensitive() {
        assert!(is_valid_lifecycle_transition("Draft", "Review"));
        assert!(is_valid_lifecycle_transition("DRAFT", "REVIEW"));
        assert!(is_valid_lifecycle_transition("Published", "Archived"));
    }

    #[test]
    fn test_lifecycle_trims_whitespace() {
        assert!(is_valid_lifecycle_transition("  draft  ", "  review  "));
        assert!(is_valid_lifecycle_transition("\tdraft\n", "\treview\n"));
    }

    #[test]
    fn test_lifecycle_empty_strings() {
        // 空字符串视为相同阶段
        assert!(is_valid_lifecycle_transition("", ""));
        // 空字符串与已知阶段不允许转换
        assert!(!is_valid_lifecycle_transition("", "draft"));
        assert!(!is_valid_lifecycle_transition("draft", ""));
    }
}

//! 元数据管理模块
//!
//! 从 master_data_refs.rs 拆分出来的独立模块（V47.0 AC-19 Part 3）。
//! 提供主数据元数据的 Schema 管理、记录存储、关联关系和统计功能。
//!
//! 功能：
//! - 元数据 Schema CRUD（版本化更新）
//! - 元数据记录 upsert（带 Schema 校验）
//! - 记录验证（独立入口）
//! - 关联关系管理
//! - 元数据统计

use axum::{extract::Path, extract::Query, extract::State, Json};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::LazyLock;

use crate::modules::ApiState;
use topems_shared::ApiResponse;

// ==================== 元数据类型 ====================

/// 元数据字段类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum MetadataFieldType {
    String,
    Integer,
    Decimal,
    Boolean,
    Date,
    DateTime,
    Enum,
    Reference,
    Json,
    Binary,
}

impl MetadataFieldType {
    fn label(&self) -> &'static str {
        match self {
            MetadataFieldType::String => "字符串",
            MetadataFieldType::Integer => "整数",
            MetadataFieldType::Decimal => "小数",
            MetadataFieldType::Boolean => "布尔",
            MetadataFieldType::Date => "日期",
            MetadataFieldType::DateTime => "日期时间",
            MetadataFieldType::Enum => "枚举",
            MetadataFieldType::Reference => "引用",
            MetadataFieldType::Json => "JSON",
            MetadataFieldType::Binary => "二进制",
        }
    }
}

/// 元数据字段定义
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetadataField {
    pub field_name: String,
    pub field_type: MetadataFieldType,
    pub field_type_label: String,
    pub required: bool,
    pub unique: bool,
    pub default_value: Option<String>,
    pub description: String,
    pub validation_rules: Vec<String>,
}

/// 元数据 Schema
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetadataSchema {
    pub schema_id: String,
    pub name: String,
    pub version: i32,
    pub domain: String,
    pub fields: Vec<MetadataField>,
    pub constraints: Vec<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// 元数据记录
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetadataRecord {
    pub record_id: String,
    pub schema_id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub values: serde_json::Value,
    pub created_at: String,
    pub updated_at: String,
    pub version: i32,
}

/// 元数据关联关系
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetadataRelation {
    pub relation_id: String,
    pub source_entity: String,
    pub target_entity: String,
    pub relation_type: String,
    pub cardinality: String,
}

/// 元数据统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetadataStats {
    pub total_schemas: usize,
    pub total_records: usize,
    pub total_relations: usize,
    pub by_domain: HashMap<String, usize>,
    pub by_entity_type: HashMap<String, usize>,
}

/// Schema 创建/更新请求
#[derive(Debug, Deserialize)]
pub struct SchemaRequest {
    pub name: String,
    pub domain: String,
    pub fields: Vec<MetadataFieldRequest>,
    pub constraints: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct MetadataFieldRequest {
    pub field_name: String,
    pub field_type: String,
    pub required: Option<bool>,
    pub unique: Option<bool>,
    pub default_value: Option<String>,
    pub description: Option<String>,
    pub validation_rules: Option<Vec<String>>,
}

/// 记录 upsert 请求
#[derive(Debug, Deserialize)]
pub struct RecordUpsertRequest {
    pub schema_id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub values: serde_json::Value,
}

/// 记录查询参数
#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct RecordQuery {
    pub schema_id: Option<String>,
    pub entity_type: Option<String>,
    pub entity_id: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

/// 关联创建请求
#[derive(Debug, Deserialize)]
pub struct RelationRequest {
    pub source_entity: String,
    pub target_entity: String,
    pub relation_type: String,
    pub cardinality: Option<String>,
}

/// 关联查询参数
#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct RelationQuery {
    pub entity: Option<String>,
    pub relation_type: Option<String>,
}

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct SchemaListQuery {
    pub domain: Option<String>,
}

fn parse_field_type(s: &str) -> Option<MetadataFieldType> {
    match s.to_lowercase().as_str() {
        "string" => Some(MetadataFieldType::String),
        "integer" => Some(MetadataFieldType::Integer),
        "decimal" => Some(MetadataFieldType::Decimal),
        "boolean" => Some(MetadataFieldType::Boolean),
        "date" => Some(MetadataFieldType::Date),
        "datetime" => Some(MetadataFieldType::DateTime),
        "enum" => Some(MetadataFieldType::Enum),
        "reference" => Some(MetadataFieldType::Reference),
        "json" => Some(MetadataFieldType::Json),
        "binary" => Some(MetadataFieldType::Binary),
        _ => None,
    }
}

// ==================== 元数据存储 ====================

struct MetadataStore {
    schemas: tokio::sync::Mutex<Vec<MetadataSchema>>,
    records: tokio::sync::Mutex<Vec<MetadataRecord>>,
    relations: tokio::sync::Mutex<Vec<MetadataRelation>>,
    initialized: tokio::sync::Mutex<bool>,
}

fn get_metadata_store() -> &'static MetadataStore {
    static STORE: LazyLock<MetadataStore> = LazyLock::new(|| MetadataStore {
        schemas: tokio::sync::Mutex::new(Vec::new()),
        records: tokio::sync::Mutex::new(Vec::new()),
        relations: tokio::sync::Mutex::new(Vec::new()),
        initialized: tokio::sync::Mutex::new(false),
    });
    &STORE
}

async fn ensure_metadata_initialized() {
    let store = get_metadata_store();
    let mut initialized = store.initialized.lock().await;
    if *initialized {
        return;
    }
    let now = chrono::Utc::now();
    let rfc = |days_ago: i64| (now - chrono::Duration::days(days_ago)).to_rfc3339();

    // 预置客户域 Schema
    let customer_schema = MetadataSchema {
        schema_id: "schema-customer-v1".to_string(),
        name: "客户元数据".to_string(),
        version: 1,
        domain: "customer".to_string(),
        fields: vec![
            MetadataField {
                field_name: "customer_name".to_string(),
                field_type: MetadataFieldType::String,
                field_type_label: MetadataFieldType::String.label().to_string(),
                required: true,
                unique: false,
                default_value: None,
                description: "客户名称".to_string(),
                validation_rules: vec!["max_length=200".to_string()],
            },
            MetadataField {
                field_name: "credit_level".to_string(),
                field_type: MetadataFieldType::Enum,
                field_type_label: MetadataFieldType::Enum.label().to_string(),
                required: false,
                unique: false,
                default_value: Some("C".to_string()),
                description: "信用等级".to_string(),
                validation_rules: vec!["enum=A,B,C,D".to_string()],
            },
            MetadataField {
                field_name: "registered_capital".to_string(),
                field_type: MetadataFieldType::Decimal,
                field_type_label: MetadataFieldType::Decimal.label().to_string(),
                required: false,
                unique: false,
                default_value: None,
                description: "注册资本（万元）".to_string(),
                validation_rules: vec!["min=0".to_string()],
            },
        ],
        constraints: vec!["customer_name 不可为空".to_string()],
        created_at: rfc(60),
        updated_at: rfc(10),
    };

    let material_schema = MetadataSchema {
        schema_id: "schema-material-v1".to_string(),
        name: "物料元数据".to_string(),
        version: 1,
        domain: "material".to_string(),
        fields: vec![
            MetadataField {
                field_name: "material_code".to_string(),
                field_type: MetadataFieldType::String,
                field_type_label: MetadataFieldType::String.label().to_string(),
                required: true,
                unique: true,
                default_value: None,
                description: "物料编码".to_string(),
                validation_rules: vec!["regex=^M[0-9]{6}$".to_string()],
            },
            MetadataField {
                field_name: "unit".to_string(),
                field_type: MetadataFieldType::String,
                field_type_label: MetadataFieldType::String.label().to_string(),
                required: true,
                unique: false,
                default_value: Some("个".to_string()),
                description: "计量单位".to_string(),
                validation_rules: vec![],
            },
        ],
        constraints: vec!["material_code 全局唯一".to_string()],
        created_at: rfc(50),
        updated_at: rfc(5),
    };

    let mut schemas = store.schemas.lock().await;
    schemas.push(customer_schema.clone());
    schemas.push(material_schema.clone());

    // 预置记录
    let mut records = store.records.lock().await;
    records.push(MetadataRecord {
        record_id: "record-001".to_string(),
        schema_id: customer_schema.schema_id.clone(),
        entity_type: "customer".to_string(),
        entity_id: "md-customer-C001".to_string(),
        values: serde_json::json!({
            "customer_name": "华信科技有限公司",
            "credit_level": "A",
            "registered_capital": 5000.0
        }),
        created_at: rfc(30),
        updated_at: rfc(2),
        version: 1,
    });
    records.push(MetadataRecord {
        record_id: "record-002".to_string(),
        schema_id: customer_schema.schema_id.clone(),
        entity_type: "customer".to_string(),
        entity_id: "md-customer-C002".to_string(),
        values: serde_json::json!({
            "customer_name": "盛达贸易集团",
            "credit_level": "B",
            "registered_capital": 1200.0
        }),
        created_at: rfc(28),
        updated_at: rfc(1),
        version: 2,
    });
    records.push(MetadataRecord {
        record_id: "record-003".to_string(),
        schema_id: material_schema.schema_id.clone(),
        entity_type: "material".to_string(),
        entity_id: "md-material-M001".to_string(),
        values: serde_json::json!({
            "material_code": "M000001",
            "unit": "千克"
        }),
        created_at: rfc(20),
        updated_at: rfc(3),
        version: 1,
    });

    // 预置关联
    let mut relations = store.relations.lock().await;
    relations.push(MetadataRelation {
        relation_id: "rel-001".to_string(),
        source_entity: "md-customer-C001".to_string(),
        target_entity: "md-material-M001".to_string(),
        relation_type: "purchases".to_string(),
        cardinality: "one_to_many".to_string(),
    });
    *initialized = true;
}

/// 创建元数据 Schema
async fn create_schema(req: &SchemaRequest) -> MetadataSchema {
    ensure_metadata_initialized().await;
    let store = get_metadata_store();
    let mut schemas = store.schemas.lock().await;
    let now = chrono::Utc::now().to_rfc3339();
    let id = format!("schema-{}-v1", req.name);
    let fields: Vec<MetadataField> = req
        .fields
        .iter()
        .map(|f| {
            let ft = parse_field_type(&f.field_type).unwrap_or(MetadataFieldType::String);
            MetadataField {
                field_name: f.field_name.clone(),
                field_type: ft.clone(),
                field_type_label: ft.label().to_string(),
                required: f.required.unwrap_or(false),
                unique: f.unique.unwrap_or(false),
                default_value: f.default_value.clone(),
                description: f.description.clone().unwrap_or_default(),
                validation_rules: f.validation_rules.clone().unwrap_or_default(),
            }
        })
        .collect();
    let schema = MetadataSchema {
        schema_id: id,
        name: req.name.clone(),
        version: 1,
        domain: req.domain.clone(),
        fields,
        constraints: req.constraints.clone().unwrap_or_default(),
        created_at: now.clone(),
        updated_at: now,
    };
    schemas.push(schema.clone());
    schema
}

/// 获取 Schema
async fn get_schema(schema_id: &str) -> Option<MetadataSchema> {
    ensure_metadata_initialized().await;
    let store = get_metadata_store();
    let schemas = store.schemas.lock().await;
    schemas.iter().find(|s| s.schema_id == schema_id).cloned()
}

/// 列出 Schema
async fn list_schemas(domain: Option<&str>) -> Vec<MetadataSchema> {
    ensure_metadata_initialized().await;
    let store = get_metadata_store();
    let schemas = store.schemas.lock().await;
    schemas
        .iter()
        .filter(|s| domain.map(|d| s.domain == d).unwrap_or(true))
        .cloned()
        .collect()
}

/// 更新 Schema（版本化）
async fn update_schema(schema_id: &str, req: &SchemaRequest) -> Option<MetadataSchema> {
    ensure_metadata_initialized().await;
    let store = get_metadata_store();
    let mut schemas = store.schemas.lock().await;
    let idx = schemas.iter().position(|s| s.schema_id == schema_id)?;
    let old = &schemas[idx];
    let new_version = old.version + 1;
    let now = chrono::Utc::now().to_rfc3339();
    let fields: Vec<MetadataField> = req
        .fields
        .iter()
        .map(|f| {
            let ft = parse_field_type(&f.field_type).unwrap_or(MetadataFieldType::String);
            MetadataField {
                field_name: f.field_name.clone(),
                field_type: ft.clone(),
                field_type_label: ft.label().to_string(),
                required: f.required.unwrap_or(false),
                unique: f.unique.unwrap_or(false),
                default_value: f.default_value.clone(),
                description: f.description.clone().unwrap_or_default(),
                validation_rules: f.validation_rules.clone().unwrap_or_default(),
            }
        })
        .collect();
    let updated = MetadataSchema {
        schema_id: format!("{}-v{}", old.name, new_version),
        name: req.name.clone(),
        version: new_version,
        domain: req.domain.clone(),
        fields,
        constraints: req.constraints.clone().unwrap_or_default(),
        created_at: old.created_at.clone(),
        updated_at: now,
    };
    schemas.push(updated.clone());
    Some(updated)
}

/// 验证记录是否符合 Schema
fn validate_record_against_schema(
    schema: &MetadataSchema,
    values: &serde_json::Value,
) -> Vec<String> {
    let mut errors: Vec<String> = Vec::new();
    let obj = match values.as_object() {
        Some(o) => o,
        None => {
            errors.push("记录值必须是 JSON 对象".to_string());
            return errors;
        }
    };
    for field in &schema.fields {
        let present = obj.contains_key(&field.field_name);
        if field.required && !present {
            errors.push(format!("必填字段「{}」缺失", field.field_name));
            continue;
        }
        if !present {
            continue;
        }
        // 类型粗校验
        let val = &obj[&field.field_name];
        let type_ok = match field.field_type {
            MetadataFieldType::String | MetadataFieldType::Enum | MetadataFieldType::Reference => {
                val.is_string()
            }
            MetadataFieldType::Integer => val.is_i64(),
            MetadataFieldType::Decimal => val.is_f64() || val.is_i64(),
            MetadataFieldType::Boolean => val.is_boolean(),
            MetadataFieldType::Date | MetadataFieldType::DateTime => val.is_string(),
            MetadataFieldType::Json => val.is_object() || val.is_array(),
            MetadataFieldType::Binary => val.is_string(),
        };
        if !type_ok {
            errors.push(format!(
                "字段「{}」类型不匹配，期望 {}",
                field.field_name, field.field_type_label
            ));
        }
    }
    errors
}

/// 验证记录（独立入口）
async fn validate_record(req: &RecordUpsertRequest) -> Vec<String> {
    ensure_metadata_initialized().await;
    let store = get_metadata_store();
    let schemas = store.schemas.lock().await;
    match schemas.iter().find(|s| s.schema_id == req.schema_id) {
        Some(schema) => validate_record_against_schema(schema, &req.values),
        None => vec![format!("未找到 Schema: {}", req.schema_id)],
    }
}

/// 创建/更新元数据记录
async fn upsert_record(req: &RecordUpsertRequest) -> Result<MetadataRecord, Vec<String>> {
    ensure_metadata_initialized().await;
    let store = get_metadata_store();
    let schemas = store.schemas.lock().await;
    let schema = match schemas.iter().find(|s| s.schema_id == req.schema_id) {
        Some(s) => s.clone(),
        None => return Err(vec![format!("未找到 Schema: {}", req.schema_id)]),
    };
    drop(schemas);

    let errors = validate_record_against_schema(&schema, &req.values);
    if !errors.is_empty() {
        return Err(errors);
    }

    let mut records = store.records.lock().await;
    let now = chrono::Utc::now().to_rfc3339();
    if let Some(existing) = records
        .iter_mut()
        .find(|r| r.schema_id == req.schema_id && r.entity_id == req.entity_id)
    {
        existing.values = req.values.clone();
        existing.updated_at = now;
        existing.version += 1;
        return Ok(existing.clone());
    }
    let record = MetadataRecord {
        record_id: format!("record-{:03}", records.len() + 1),
        schema_id: req.schema_id.clone(),
        entity_type: req.entity_type.clone(),
        entity_id: req.entity_id.clone(),
        values: req.values.clone(),
        created_at: now.clone(),
        updated_at: now,
        version: 1,
    };
    records.push(record.clone());
    Ok(record)
}

/// 获取记录
async fn get_record(record_id: &str) -> Option<MetadataRecord> {
    ensure_metadata_initialized().await;
    let store = get_metadata_store();
    let records = store.records.lock().await;
    records.iter().find(|r| r.record_id == record_id).cloned()
}

/// 查询记录
async fn query_records(query: &RecordQuery) -> Vec<MetadataRecord> {
    ensure_metadata_initialized().await;
    let store = get_metadata_store();
    let records = store.records.lock().await.clone();
    let mut filtered: Vec<MetadataRecord> = records
        .into_iter()
        .filter(|r| {
            if let Some(ref s) = query.schema_id {
                if &r.schema_id != s {
                    return false;
                }
            }
            if let Some(ref t) = query.entity_type {
                if &r.entity_type != t {
                    return false;
                }
            }
            if let Some(ref id) = query.entity_id {
                if &r.entity_id != id {
                    return false;
                }
            }
            true
        })
        .collect();
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).clamp(1, 100);
    let offset = ((page - 1) * page_size) as usize;
    if offset >= filtered.len() {
        filtered.clear();
    } else {
        let end = (offset + page_size as usize).min(filtered.len());
        filtered = filtered[offset..end].to_vec();
    }
    filtered
}

/// 获取关联关系
async fn get_relations(query: &RelationQuery) -> Vec<MetadataRelation> {
    ensure_metadata_initialized().await;
    let store = get_metadata_store();
    let relations = store.relations.lock().await.clone();
    relations
        .into_iter()
        .filter(|r| {
            if let Some(ref e) = query.entity {
                if &r.source_entity != e && &r.target_entity != e {
                    return false;
                }
            }
            if let Some(ref rt) = query.relation_type {
                if &r.relation_type != rt {
                    return false;
                }
            }
            true
        })
        .collect()
}

/// 创建关联关系
async fn create_relation(req: &RelationRequest) -> MetadataRelation {
    ensure_metadata_initialized().await;
    let store = get_metadata_store();
    let mut relations = store.relations.lock().await;
    let id = format!("rel-{:03}", relations.len() + 1);
    let relation = MetadataRelation {
        relation_id: id,
        source_entity: req.source_entity.clone(),
        target_entity: req.target_entity.clone(),
        relation_type: req.relation_type.clone(),
        cardinality: req
            .cardinality
            .clone()
            .unwrap_or_else(|| "one_to_one".to_string()),
    };
    relations.push(relation.clone());
    relation
}

/// 获取元数据统计
async fn get_metadata_stats() -> MetadataStats {
    ensure_metadata_initialized().await;
    let store = get_metadata_store();
    let schemas = store.schemas.lock().await.clone();
    let records = store.records.lock().await.clone();
    let relations = store.relations.lock().await.clone();

    let mut by_domain: HashMap<String, usize> = HashMap::new();
    for s in &schemas {
        *by_domain.entry(s.domain.clone()).or_insert(0) += 1;
    }
    let mut by_entity_type: HashMap<String, usize> = HashMap::new();
    for r in &records {
        *by_entity_type.entry(r.entity_type.clone()).or_insert(0) += 1;
    }

    MetadataStats {
        total_schemas: schemas.len(),
        total_records: records.len(),
        total_relations: relations.len(),
        by_domain,
        by_entity_type,
    }
}

// ==================== 元数据 Handlers ====================

/// POST /metadata/schemas — 创建元数据 Schema
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:master-data:write"])),
    path = "/api/erp/master-data-refs/metadata/schemas",
    tag = "Master Data",
    operation_id = "create_schema_handler",
    responses((status = 200, description = "OK")),
)]
pub async fn create_schema_handler(
    State(state): State<ApiState>,
    Json(req): Json<SchemaRequest>,
) -> Json<ApiResponse<MetadataSchema>> {
    let _ = &state;
    let schema = create_schema(&req).await;
    Json(ApiResponse::success(schema, "Schema 创建成功"))
}

/// GET /metadata/schemas — 列出 Schema
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/master-data-refs/list-schemas-handler",
    tag = "MasterDataRefs",
    operation_id = "list_schemas_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn list_schemas_handler(
    State(state): State<ApiState>,
    Query(params): Query<SchemaListQuery>,
) -> Json<ApiResponse<Vec<MetadataSchema>>> {
    let _ = &state;
    let schemas = list_schemas(params.domain.as_deref()).await;
    Json(ApiResponse::success(schemas, "Schema 列表获取成功"))
}

/// GET /metadata/schemas/{schema_id} — 获取 Schema
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/api/erp/master-data-refs/metadata/schemas/{schema_id}",
    tag = "Master Data",
    operation_id = "get_schema_handler",
    responses((status = 200, description = "OK")),
)]
pub async fn get_schema_handler(
    State(state): State<ApiState>,
    Path(schema_id): Path<String>,
) -> Json<ApiResponse<MetadataSchema>> {
    let _ = &state;
    match get_schema(&schema_id).await {
        Some(schema) => Json(ApiResponse::success(schema, "Schema 获取成功")),
        None => Json(ApiResponse::error(404, "未找到 Schema")),
    }
}

/// PUT /metadata/schemas/{schema_id} — 更新 Schema（版本化）
#[utoipa::path(
    put,
    security(("BearerAuth" = ["erp:update"])),
    path = "/api/erp/master-data-refs/metadata/schemas/{schema_id}",
    tag = "Master Data",
    operation_id = "update_schema_handler",
    responses((status = 200, description = "OK")),
)]
pub async fn update_schema_handler(
    State(state): State<ApiState>,
    Path(schema_id): Path<String>,
    Json(req): Json<SchemaRequest>,
) -> Json<ApiResponse<MetadataSchema>> {
    let _ = &state;
    match update_schema(&schema_id, &req).await {
        Some(schema) => Json(ApiResponse::success(
            schema,
            "Schema 更新成功（已生成新版本）",
        )),
        None => Json(ApiResponse::error(404, "未找到 Schema")),
    }
}

/// POST /metadata/validate — 验证记录是否符合 Schema
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/api/erp/master-data-refs/metadata/validate",
    tag = "Master Data",
    operation_id = "validate_record_handler",
    responses((status = 200, description = "OK")),
)]
pub async fn validate_record_handler(
    State(state): State<ApiState>,
    Json(req): Json<RecordUpsertRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let _ = &state;
    let errors = validate_record(&req).await;
    let valid = errors.is_empty();
    Json(ApiResponse::success(
        serde_json::json!({
            "valid": valid,
            "errors": errors,
            "schema_id": req.schema_id,
        }),
        if valid {
            "记录校验通过"
        } else {
            "记录校验未通过"
        },
    ))
}

/// POST /metadata/records — 创建/更新元数据记录
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/api/erp/master-data-refs/metadata/records",
    tag = "Master Data",
    operation_id = "upsert_record_handler",
    responses((status = 200, description = "OK")),
)]
pub async fn upsert_record_handler(
    State(state): State<ApiState>,
    Json(req): Json<RecordUpsertRequest>,
) -> Json<ApiResponse<MetadataRecord>> {
    let _ = &state;
    match upsert_record(&req).await {
        Ok(record) => Json(ApiResponse::success(record, "元数据记录保存成功")),
        Err(errors) => {
            let resp: ApiResponse<MetadataRecord> = ApiResponse::error(400, &errors.join("; "));
            Json(resp)
        }
    }
}

/// GET /metadata/records — 查询记录
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/master-data-refs/query-records-handler",
    tag = "MasterDataRefs",
    operation_id = "query_records_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn query_records_handler(
    State(state): State<ApiState>,
    Query(params): Query<RecordQuery>,
) -> Json<ApiResponse<Vec<MetadataRecord>>> {
    let _ = &state;
    let records = query_records(&params).await;
    Json(ApiResponse::success(records, "元数据记录查询成功"))
}

/// GET /metadata/records/{record_id} — 获取记录
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/api/erp/master-data-refs/metadata/records/{record_id}",
    tag = "Master Data",
    operation_id = "get_record_handler",
    responses((status = 200, description = "OK")),
)]
pub async fn get_record_handler(
    State(state): State<ApiState>,
    Path(record_id): Path<String>,
) -> Json<ApiResponse<MetadataRecord>> {
    let _ = &state;
    match get_record(&record_id).await {
        Some(record) => Json(ApiResponse::success(record, "元数据记录获取成功")),
        None => Json(ApiResponse::error(404, "未找到元数据记录")),
    }
}

/// POST /metadata/relations — 创建关联关系
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:master-data:write"])),
    path = "/api/erp/master-data-refs/metadata/relations",
    tag = "Master Data",
    operation_id = "create_relation_handler",
    responses((status = 200, description = "OK")),
)]
pub async fn create_relation_handler(
    State(state): State<ApiState>,
    Json(req): Json<RelationRequest>,
) -> Json<ApiResponse<MetadataRelation>> {
    let _ = &state;
    let relation = create_relation(&req).await;
    Json(ApiResponse::success(relation, "关联关系创建成功"))
}

/// GET /metadata/relations — 获取关联关系
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/master-data-refs/get-relations-handler",
    tag = "MasterDataRefs",
    operation_id = "get_relations_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_relations_handler(
    State(state): State<ApiState>,
    Query(params): Query<RelationQuery>,
) -> Json<ApiResponse<Vec<MetadataRelation>>> {
    let _ = &state;
    let relations = get_relations(&params).await;
    Json(ApiResponse::success(relations, "关联关系获取成功"))
}

/// GET /metadata/stats — 获取元数据统计
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/api/erp/master-data-refs/metadata/stats",
    tag = "Master Data",
    operation_id = "get_metadata_stats_handler",
    responses((status = 200, description = "OK")),
)]
pub async fn get_metadata_stats_handler(
    State(state): State<ApiState>,
) -> Json<ApiResponse<MetadataStats>> {
    let _ = &state;
    let stats = get_metadata_stats().await;
    Json(ApiResponse::success(stats, "元数据统计获取成功"))
}

//! GraphQL 联邦网关模块
//!
//! 从 graphql_schema.rs 拆分出来的独立模块。
//! 包含：联邦网关 V2（服务注册 + 实体解析 + 查询计划）、
//! Federation V3（分布式查询计划 + 容错降级 + 缓存 + 监控）。

use async_graphql::SimpleObject;
use chrono::{DateTime, Utc};
use futures_util::future::join_all;
use sha2::{Digest, Sha256};
use std::collections::{HashMap, HashSet, VecDeque};
use std::sync::{Mutex, RwLock};

use crate::modules::graphql_helpers::{service_request, service_url, FEDERATION_READ_PERMS};
use crate::modules::graphql_schema::{cache_entity_result, get_cached_entity};
use topems_shared_observability::telemetry::TracedRequestExt;

// ==================== V42.0 Track B: 联邦网关 V2 ====================

// ==================== V42.0 Track B: 联邦网关 V2 ====================
//
// 实现联邦网关 V2:
// 1. 服务元数据与自动注册（基于服务元数据自动生成 resolver）
// 2. 实体解析器自动生成（批量 + 缓存 + 去重）
// 3. 联邦查询计划器（解析查询 → 生成执行计划 → 并发执行）
// 4. 联邦 Schema 自动组合（基于 SERVICE_REGISTRY）

// --- 查询计划步骤类型 ---

/// V42.0: 查询计划步骤类型
#[derive(Clone, Copy, Debug)]
pub enum PlanStepType {
    FetchEntity,
    FetchList,
    BatchFetch,
    JoinRelation,
    Aggregate,
    Filter,
}

impl PlanStepType {
    fn as_str(&self) -> &'static str {
        match self {
            Self::FetchEntity => "FetchEntity",
            Self::FetchList => "FetchList",
            Self::BatchFetch => "BatchFetch",
            Self::JoinRelation => "JoinRelation",
            Self::Aggregate => "Aggregate",
            Self::Filter => "Filter",
        }
    }
}

/// V42.0: 并行执行模式
#[derive(Clone, Copy, Debug)]
pub enum ExecutionMode {
    Parallel,
    Sequential,
    Pipelined,
}

impl ExecutionMode {
    fn as_str(&self) -> &'static str {
        match self {
            Self::Parallel => "Parallel",
            Self::Sequential => "Sequential",
            Self::Pipelined => "Pipelined",
        }
    }
}

// --- 服务元数据 ---

/// V42.0: 字段元数据
#[derive(Clone, Debug, SimpleObject)]
pub struct FieldMetadata {
    pub name: String,
    pub field_type: String,
    pub nullable: bool,
    pub is_list: bool,
}

/// V42.0: 关系元数据
#[derive(Clone, Debug, SimpleObject)]
pub struct RelationMetadata {
    pub field_name: String,
    pub target_entity: String,
    pub target_service: String,
    pub relation_type: String,
    pub resolver_type: String,
}

/// V42.0: 实体元数据
#[derive(Clone, Debug, SimpleObject)]
pub struct EntityMetadata {
    pub name: String,
    pub service: String,
    pub key_field: String,
    pub fields: Vec<FieldMetadata>,
    pub relations: Vec<RelationMetadata>,
    pub rest_endpoint: String,
    pub list_endpoint: String,
    pub batch_endpoint: Option<String>,
}

/// V42.0: 服务元数据
#[derive(Clone, Debug, SimpleObject)]
pub struct ServiceMetadata {
    pub name: String,
    pub base_url: String,
    pub entities: Vec<EntityMetadata>,
    pub health_check_url: Option<String>,
    pub version: String,
}

// --- 服务注册表 ---

static SERVICE_REGISTRY: std::sync::OnceLock<RwLock<Vec<ServiceMetadata>>> =
    std::sync::OnceLock::new();

fn service_registry() -> &'static RwLock<Vec<ServiceMetadata>> {
    SERVICE_REGISTRY.get_or_init(|| RwLock::new(Vec::new()))
}

/// V42.0: 注册服务元数据
pub fn register_service(metadata: ServiceMetadata) {
    let mut registry = service_registry()
        .write()
        .unwrap_or_else(|e| e.into_inner());
    registry.retain(|s| s.name != metadata.name);
    registry.push(metadata);
}

/// V42.0: 按名称获取服务
pub fn get_service(name: &str) -> Option<ServiceMetadata> {
    let registry = service_registry().read().unwrap_or_else(|e| e.into_inner());
    registry.iter().find(|s| s.name == name).cloned()
}

/// V42.0: 列出所有已注册服务
pub fn list_services() -> Vec<ServiceMetadata> {
    let registry = service_registry().read().unwrap_or_else(|e| e.into_inner());
    registry.clone()
}

/// V42.0: 按实体名获取实体元数据
pub fn get_entity_metadata(entity_name: &str) -> Option<EntityMetadata> {
    let registry = service_registry().read().unwrap_or_else(|e| e.into_inner());
    for service in registry.iter() {
        if let Some(entity) = service.entities.iter().find(|e| e.name == entity_name) {
            return Some(entity.clone());
        }
    }
    None
}

/// V42.0: 预初始化 5 个服务（erp/crm/hrm/finance/mes）的元数据
pub fn init_service_registry() {
    let mut registry = service_registry()
        .write()
        .unwrap_or_else(|e| e.into_inner());
    if !registry.is_empty() {
        return;
    }

    fn f(name: &str, ft: &str, nullable: bool, is_list: bool) -> FieldMetadata {
        FieldMetadata {
            name: name.into(),
            field_type: ft.into(),
            nullable,
            is_list,
        }
    }
    fn rel(
        field_name: &str,
        target_entity: &str,
        target_service: &str,
        relation_type: &str,
        resolver_type: &str,
    ) -> RelationMetadata {
        RelationMetadata {
            field_name: field_name.into(),
            target_entity: target_entity.into(),
            target_service: target_service.into(),
            relation_type: relation_type.into(),
            resolver_type: resolver_type.into(),
        }
    }

    let erp = ServiceMetadata {
        name: "erp".into(),
        base_url: "http://localhost:8010".into(),
        version: "1.0.0".into(),
        health_check_url: Some("http://localhost:8010/health".into()),
        entities: vec![
            EntityMetadata {
                name: "Customer".into(),
                service: "erp".into(),
                key_field: "id".into(),
                fields: vec![
                    f("id", "String", false, false),
                    f("name", "String", false, false),
                    f("code", "String", false, false),
                    f("status", "String", false, false),
                    f("phone", "String", true, false),
                    f("industry", "String", true, false),
                ],
                relations: vec![rel("contacts", "Contact", "crm", "one-to-many", "rest")],
                rest_endpoint: "/api/erp/customers/{id}".into(),
                list_endpoint: "/api/erp/customers".into(),
                batch_endpoint: Some("/api/erp/customers/batch".into()),
            },
            EntityMetadata {
                name: "Supplier".into(),
                service: "erp".into(),
                key_field: "id".into(),
                fields: vec![
                    f("id", "String", false, false),
                    f("name", "String", false, false),
                    f("code", "String", false, false),
                    f("status", "String", false, false),
                    f("contact_person", "String", true, false),
                    f("phone", "String", true, false),
                    f("address", "String", true, false),
                ],
                relations: vec![],
                rest_endpoint: "/api/erp/suppliers/{id}".into(),
                list_endpoint: "/api/erp/suppliers".into(),
                batch_endpoint: Some("/api/erp/suppliers/batch".into()),
            },
            EntityMetadata {
                name: "Material".into(),
                service: "erp".into(),
                key_field: "id".into(),
                fields: vec![
                    f("id", "String", false, false),
                    f("name", "String", false, false),
                    f("code", "String", false, false),
                    f("category", "String", false, false),
                    f("unit", "String", false, false),
                    f("spec", "String", true, false),
                    f("price", "Float", true, false),
                ],
                relations: vec![],
                rest_endpoint: "/api/erp/materials/{id}".into(),
                list_endpoint: "/api/erp/materials".into(),
                batch_endpoint: Some("/api/erp/materials/batch".into()),
            },
        ],
    };

    let crm = ServiceMetadata {
        name: "crm".into(),
        base_url: "http://localhost:8029".into(),
        version: "1.0.0".into(),
        health_check_url: Some("http://localhost:8029/health".into()),
        entities: vec![
            EntityMetadata {
                name: "Contact".into(),
                service: "crm".into(),
                key_field: "id".into(),
                fields: vec![
                    f("id", "String", false, false),
                    f("name", "String", false, false),
                    f("customer_id", "String", true, false),
                    f("email", "String", true, false),
                    f("phone", "String", true, false),
                ],
                relations: vec![rel(
                    "customer",
                    "Customer",
                    "erp",
                    "many-to-one",
                    "foreign_key",
                )],
                rest_endpoint: "/api/crm/contacts/{id}".into(),
                list_endpoint: "/api/crm/contacts".into(),
                batch_endpoint: Some("/api/crm/contacts/batch".into()),
            },
            EntityMetadata {
                name: "Lead".into(),
                service: "crm".into(),
                key_field: "id".into(),
                fields: vec![
                    f("id", "String", false, false),
                    f("name", "String", false, false),
                    f("source", "String", true, false),
                    f("status", "String", false, false),
                    f("contact_id", "String", true, false),
                ],
                relations: vec![rel(
                    "contact",
                    "Contact",
                    "crm",
                    "many-to-one",
                    "foreign_key",
                )],
                rest_endpoint: "/api/crm/leads/{id}".into(),
                list_endpoint: "/api/crm/leads".into(),
                batch_endpoint: Some("/api/crm/leads/batch".into()),
            },
        ],
    };

    let hrm = ServiceMetadata {
        name: "hrm".into(),
        base_url: "http://localhost:8020".into(),
        version: "1.0.0".into(),
        health_check_url: Some("http://localhost:8020/health".into()),
        entities: vec![
            EntityMetadata {
                name: "Employee".into(),
                service: "hrm".into(),
                key_field: "id".into(),
                fields: vec![
                    f("id", "String", false, false),
                    f("name", "String", false, false),
                    f("department", "String", true, false),
                    f("position", "String", false, false),
                    f("email", "String", true, false),
                    f("phone", "String", true, false),
                    f("status", "String", false, false),
                ],
                relations: vec![rel(
                    "department_info",
                    "Department",
                    "hrm",
                    "many-to-one",
                    "foreign_key",
                )],
                rest_endpoint: "/api/hrm/employees/{id}".into(),
                list_endpoint: "/api/hrm/employees".into(),
                batch_endpoint: Some("/api/hrm/employees/batch".into()),
            },
            EntityMetadata {
                name: "Department".into(),
                service: "hrm".into(),
                key_field: "id".into(),
                fields: vec![
                    f("id", "String", false, false),
                    f("name", "String", false, false),
                    f("code", "String", false, false),
                    f("manager_id", "String", true, false),
                    f("parent_id", "String", true, false),
                ],
                relations: vec![],
                rest_endpoint: "/api/hrm/departments/{id}".into(),
                list_endpoint: "/api/hrm/departments".into(),
                batch_endpoint: Some("/api/hrm/departments/batch".into()),
            },
        ],
    };

    let finance = ServiceMetadata {
        name: "finance".into(),
        base_url: "http://localhost:8011".into(),
        version: "1.0.0".into(),
        health_check_url: Some("http://localhost:8011/health".into()),
        entities: vec![
            EntityMetadata {
                name: "Voucher".into(),
                service: "finance".into(),
                key_field: "id".into(),
                fields: vec![
                    f("id", "String", false, false),
                    f("voucher_number", "String", false, false),
                    f("total_debit", "Float", false, false),
                    f("total_credit", "Float", false, false),
                    f("status", "String", false, false),
                    f("voucher_date", "String", true, false),
                    f("created_by", "String", true, false),
                ],
                relations: vec![rel(
                    "account_subject",
                    "AccountSubject",
                    "finance",
                    "many-to-one",
                    "foreign_key",
                )],
                rest_endpoint: "/api/finance/vouchers/{id}".into(),
                list_endpoint: "/api/finance/vouchers".into(),
                batch_endpoint: Some("/api/finance/vouchers/batch".into()),
            },
            EntityMetadata {
                name: "AccountSubject".into(),
                service: "finance".into(),
                key_field: "id".into(),
                fields: vec![
                    f("id", "String", false, false),
                    f("code", "String", false, false),
                    f("name", "String", false, false),
                    f("category", "String", false, false),
                    f("balance", "Float", true, false),
                ],
                relations: vec![],
                rest_endpoint: "/api/finance/accounts/{id}".into(),
                list_endpoint: "/api/finance/accounts".into(),
                batch_endpoint: Some("/api/finance/accounts/batch".into()),
            },
        ],
    };

    let mes = ServiceMetadata {
        name: "mes".into(),
        base_url: "http://localhost:8030".into(),
        version: "1.0.0".into(),
        health_check_url: Some("http://localhost:8030/health".into()),
        entities: vec![
            EntityMetadata {
                name: "WorkOrder".into(),
                service: "mes".into(),
                key_field: "id".into(),
                fields: vec![
                    f("id", "String", false, false),
                    f("order_number", "String", false, false),
                    f("product_code", "String", true, false),
                    f("quantity", "Int", false, false),
                    f("status", "String", false, false),
                    f("due_date", "String", true, false),
                ],
                relations: vec![rel(
                    "product",
                    "Product",
                    "mes",
                    "many-to-one",
                    "foreign_key",
                )],
                rest_endpoint: "/api/mes/work-orders/{id}".into(),
                list_endpoint: "/api/mes/work-orders".into(),
                batch_endpoint: Some("/api/mes/work-orders/batch".into()),
            },
            EntityMetadata {
                name: "Product".into(),
                service: "mes".into(),
                key_field: "id".into(),
                fields: vec![
                    f("id", "String", false, false),
                    f("name", "String", false, false),
                    f("code", "String", false, false),
                    f("category", "String", true, false),
                    f("unit", "String", true, false),
                ],
                relations: vec![],
                rest_endpoint: "/api/mes/products/{id}".into(),
                list_endpoint: "/api/mes/products".into(),
                batch_endpoint: Some("/api/mes/products/batch".into()),
            },
        ],
    };

    registry.extend(vec![erp, crm, hrm, finance, mes]);
    tracing::info!(
        "[graphql] V42.0 服务注册表已初始化，共 {} 个服务",
        registry.len()
    );
}

// --- 实体解析器自动生成 ---

/// V42.0: 基于 EntityMetadata 自动生成的 resolver
#[derive(Clone)]
pub struct AutoGeneratedResolver {
    pub entity_name: String,
    pub service: String,
    pub endpoint: String,
    pub batch_endpoint: Option<String>,
    pub cache_enabled: bool,
}

impl AutoGeneratedResolver {
    /// 自动解析单个实体（缓存 → REST → 缓存 → 返回）
    pub async fn resolve_single(&self, id: &str) -> Result<serde_json::Value, String> {
        // 1. 检查缓存
        if self.cache_enabled {
            if let Some(cached) = get_cached_entity(&self.service, &self.entity_name, id) {
                record_federation_v2_cache_hit();
                return Ok(cached);
            }
            record_federation_v2_cache_miss();
        }

        // 2. 调用 REST API
        let base_url = service_url(&self.service);
        let path = self.endpoint.replace("{id}", id);
        let url = format!("{}{}", base_url, path);
        let client = service_request(reqwest::Method::GET, &url, FEDERATION_READ_PERMS);

        match tokio::time::timeout(std::time::Duration::from_secs(5), client.send()).await {
            Ok(Ok(resp)) if resp.status().is_success() => {
                match resp.json::<serde_json::Value>().await {
                    Ok(val) => {
                        if self.cache_enabled {
                            cache_entity_result(&self.service, &self.entity_name, id, val.clone());
                        }
                        record_federation_v2_batch_resolutions();
                        Ok(val)
                    }
                    Err(e) => Err(format!("parse error: {}", e)),
                }
            }
            Ok(Ok(resp)) => Err(format!("HTTP {}", resp.status())),
            Ok(Err(e)) => Err(format!("request error: {}", e)),
            Err(_) => Err("timeout".to_string()),
        }
    }

    /// 自动批量解析（去重 → 缓存分命中/未命中 → 批量调用 → 缓存 → 合并）
    pub async fn resolve_batch(&self, ids: &[String]) -> Result<Vec<serde_json::Value>, String> {
        // 1. 去重
        let mut seen = HashSet::new();
        let unique_ids: Vec<String> = ids
            .iter()
            .filter(|id| seen.insert((*id).clone()))
            .cloned()
            .collect();

        // 2. 检查缓存
        let mut results: Vec<(usize, serde_json::Value)> = Vec::new();
        let mut uncached_indices: Vec<(usize, String)> = Vec::new();

        for (idx, id) in ids.iter().enumerate() {
            if self.cache_enabled {
                if let Some(cached) = get_cached_entity(&self.service, &self.entity_name, id) {
                    record_federation_v2_cache_hit();
                    results.push((idx, cached));
                    continue;
                }
                record_federation_v2_cache_miss();
            }
            uncached_indices.push((idx, id.clone()));
        }

        // 3. 批量调用 REST API（仅未命中的）
        if !uncached_indices.is_empty() {
            let uncached_ids: Vec<String> =
                uncached_indices.iter().map(|(_, id)| id.clone()).collect();
            if let Some(batch_endpoint) = &self.batch_endpoint {
                let base_url = service_url(&self.service);
                let url = format!("{}{}", base_url, batch_endpoint);
                let client = service_request(reqwest::Method::POST, &url, FEDERATION_READ_PERMS);
                match tokio::time::timeout(
                    std::time::Duration::from_secs(5),
                    client
                        .json(&serde_json::json!({ "ids": uncached_ids }))
                        .with_trace()
                        .send(),
                )
                .await
                {
                    Ok(Ok(resp)) if resp.status().is_success() => {
                        if let Ok(json) = resp.json::<serde_json::Value>().await {
                            let data_list = json
                                .get("data")
                                .and_then(|d| d.as_array())
                                .unwrap_or(&Vec::new())
                                .clone();
                            for (i, (idx, id)) in uncached_indices.iter().enumerate() {
                                let val = data_list.get(i).cloned().unwrap_or_else(
                                    || serde_json::json!({"id": id, "error": "not found"}),
                                );
                                if self.cache_enabled {
                                    cache_entity_result(
                                        &self.service,
                                        &self.entity_name,
                                        id,
                                        val.clone(),
                                    );
                                }
                                results.push((*idx, val));
                            }
                            record_federation_v2_batch_resolutions();
                        }
                    }
                    _ => {
                        // 回退到逐个解析
                        for (idx, id) in uncached_indices {
                            if let Ok(val) = self.resolve_single(&id).await {
                                results.push((idx, val));
                            }
                        }
                    }
                }
            } else {
                // 无批量端点，逐个解析
                for (idx, id) in uncached_indices {
                    if let Ok(val) = self.resolve_single(&id).await {
                        results.push((idx, val));
                    }
                }
            }
        }

        // 4. 合并返回（按原始顺序）
        let _ = &unique_ids; // 去重结果用于统计
        results.sort_by_key(|(idx, _)| *idx);
        Ok(results.into_iter().map(|(_, v)| v).collect())
    }

    /// 自动解析关联（基于关系元数据调用对应服务）
    pub async fn resolve_relation(
        &self,
        source_id: &str,
        relation: &RelationMetadata,
    ) -> Result<serde_json::Value, String> {
        let target_resolver = get_resolver(&relation.target_entity)
            .ok_or_else(|| format!("no resolver for target entity {}", relation.target_entity))?;

        match relation.relation_type.as_str() {
            "many-to-one" => {
                // 先获取源实体，提取外键，再解析目标实体
                let source = self.resolve_single(source_id).await?;
                let fk = source
                    .get(&relation.field_name)
                    .and_then(|v| v.as_str())
                    .or_else(|| {
                        source
                            .get(format!("{}_id", relation.field_name))
                            .and_then(|v| v.as_str())
                    })
                    .unwrap_or(source_id);
                target_resolver.resolve_single(fk).await
            }
            "one-to-many" => {
                // 调用目标服务的列表端点，按源 ID 过滤
                let target_meta = get_entity_metadata(&relation.target_entity)
                    .ok_or_else(|| format!("no metadata for {}", relation.target_entity))?;
                let base_url = service_url(&relation.target_service);
                let url = format!(
                    "{}{}?{}={}",
                    base_url, target_meta.list_endpoint, relation.field_name, source_id
                );
                let client = service_request(reqwest::Method::GET, &url, FEDERATION_READ_PERMS);
                match tokio::time::timeout(std::time::Duration::from_secs(5), client.send()).await {
                    Ok(Ok(resp)) if resp.status().is_success() => resp
                        .json::<serde_json::Value>()
                        .await
                        .map_err(|e| e.to_string()),
                    Ok(Ok(resp)) => Err(format!("HTTP {}", resp.status())),
                    Ok(Err(e)) => Err(format!("request error: {}", e)),
                    Err(_) => Err("timeout".to_string()),
                }
            }
            _ => target_resolver.resolve_single(source_id).await,
        }
    }
}

/// V42.0: 解析器工厂 — 基于实体名获取自动生成的 resolver
pub fn get_resolver(entity_name: &str) -> Option<AutoGeneratedResolver> {
    let metadata = get_entity_metadata(entity_name)?;
    record_federation_v2_auto_resolver();
    Some(AutoGeneratedResolver {
        entity_name: metadata.name.clone(),
        service: metadata.service.clone(),
        endpoint: metadata.rest_endpoint.clone(),
        batch_endpoint: metadata.batch_endpoint.clone(),
        cache_enabled: true,
    })
}

// --- 联邦查询计划器 ---

/// V42.0: 查询计划步骤
#[derive(Clone, Debug)]
pub struct PlanStep {
    pub step_id: String,
    pub step_type: PlanStepType,
    pub entity: Option<String>,
    pub service: Option<String>,
    pub depends_on: Vec<String>,
    pub fields: Vec<String>,
    pub args: serde_json::Value,
}

/// V42.0: 并行执行组
#[derive(Clone, Debug)]
pub struct ParallelGroup {
    pub group_id: String,
    pub steps: Vec<String>,
    pub execution_mode: ExecutionMode,
}

/// V42.0: 联邦查询计划
#[derive(Clone, Debug)]
pub struct FederationQueryPlan {
    pub query_hash: String,
    pub steps: Vec<PlanStep>,
    pub parallel_groups: Vec<ParallelGroup>,
    pub estimated_cost: f64,
    pub estimated_duration_ms: u64,
}

/// V42.0: 查询计划步骤 GraphQL 输出
#[derive(SimpleObject)]
pub struct PlanStepGql {
    pub step_id: String,
    pub step_type: String,
    pub entity: Option<String>,
    pub service: Option<String>,
    pub depends_on: Vec<String>,
    pub fields: Vec<String>,
    pub args: serde_json::Value,
}

/// V42.0: 并行执行组 GraphQL 输出
#[derive(SimpleObject)]
pub struct ParallelGroupGql {
    pub group_id: String,
    pub steps: Vec<String>,
    pub execution_mode: String,
}

/// V42.0: 联邦查询计划 GraphQL 输出
#[derive(SimpleObject)]
pub struct FederationQueryPlanGql {
    pub query_hash: String,
    pub steps: Vec<PlanStepGql>,
    pub parallel_groups: Vec<ParallelGroupGql>,
    pub estimated_cost: f64,
    pub estimated_duration_ms: u64,
}

impl FederationQueryPlan {
    pub fn to_gql(&self) -> FederationQueryPlanGql {
        FederationQueryPlanGql {
            query_hash: self.query_hash.clone(),
            steps: self
                .steps
                .iter()
                .map(|s| PlanStepGql {
                    step_id: s.step_id.clone(),
                    step_type: s.step_type.as_str().to_string(),
                    entity: s.entity.clone(),
                    service: s.service.clone(),
                    depends_on: s.depends_on.clone(),
                    fields: s.fields.clone(),
                    args: s.args.clone(),
                })
                .collect(),
            parallel_groups: self
                .parallel_groups
                .iter()
                .map(|g| ParallelGroupGql {
                    group_id: g.group_id.clone(),
                    steps: g.steps.clone(),
                    execution_mode: g.execution_mode.as_str().to_string(),
                })
                .collect(),
            estimated_cost: self.estimated_cost,
            estimated_duration_ms: self.estimated_duration_ms,
        }
    }
}

/// V42.0: 计算查询的 SHA256 哈希
pub fn federation_v2_query_hash(query: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(query.as_bytes());
    format!("{:x}", hasher.finalize())
}

/// V42.0: 查询计划缓存
static FEDERATION_V2_PLAN_CACHE: std::sync::OnceLock<Mutex<HashMap<String, FederationQueryPlan>>> =
    std::sync::OnceLock::new();

fn federation_v2_plan_cache() -> &'static Mutex<HashMap<String, FederationQueryPlan>> {
    FEDERATION_V2_PLAN_CACHE.get_or_init(|| Mutex::new(HashMap::new()))
}

pub fn get_cached_federation_v2_plan(query_hash: &str) -> Option<FederationQueryPlan> {
    federation_v2_plan_cache()
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .get(query_hash)
        .cloned()
}

pub fn cache_federation_v2_plan(query_hash: &str, plan: &FederationQueryPlan) {
    federation_v2_plan_cache()
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .insert(query_hash.to_string(), plan.clone());
}

/// V42.0: 联邦查询计划器
/// 解析查询 → 识别实体/服务 → 构建依赖图 → 生成执行计划
pub fn plan_federation_query(query: &str, _variables: &serde_json::Value) -> FederationQueryPlan {
    let query_hash = federation_v2_query_hash(query);
    let lower = query.to_lowercase();
    let mut steps: Vec<PlanStep> = Vec::new();
    let mut step_counter = 0usize;

    // 已知实体模式: (关键字, 实体名, 服务名)
    let entity_patterns: &[(&str, &str, &str)] = &[
        ("customer", "Customer", "erp"),
        ("supplier", "Supplier", "erp"),
        ("material", "Material", "erp"),
        ("contact", "Contact", "crm"),
        ("lead", "Lead", "crm"),
        ("employee", "Employee", "hrm"),
        ("department", "Department", "hrm"),
        ("voucher", "Voucher", "finance"),
        ("accountsubject", "AccountSubject", "finance"),
        ("workorder", "WorkOrder", "mes"),
        ("product", "Product", "mes"),
    ];

    // 识别涉及的实体，生成 FetchEntity/FetchList 步骤
    for (keyword, entity, service) in entity_patterns {
        if lower.contains(keyword) {
            let step_id = format!("step_{}", step_counter);
            step_counter += 1;
            let step_type = if lower.contains("list") || lower.contains("s(") {
                PlanStepType::FetchList
            } else {
                PlanStepType::FetchEntity
            };
            steps.push(PlanStep {
                step_id,
                step_type,
                entity: Some((*entity).to_string()),
                service: Some((*service).to_string()),
                depends_on: Vec::new(),
                fields: Vec::new(),
                args: serde_json::json!({ "keyword": keyword }),
            });
        }
    }

    // 关联关键字 → JoinRelation 步骤
    let relation_patterns: &[(&str, &str)] = &[
        ("contacts", "Customer"),
        ("department_info", "Employee"),
        ("account_subject", "Voucher"),
        ("customer", "Contact"),
    ];

    for (keyword, source_entity) in relation_patterns {
        if lower.contains(keyword) {
            let step_id = format!("step_{}", step_counter);
            step_counter += 1;
            let depends_on: Vec<String> = steps
                .iter()
                .filter(|s| s.entity.as_deref() == Some(*source_entity))
                .map(|s| s.step_id.clone())
                .collect();
            steps.push(PlanStep {
                step_id,
                step_type: PlanStepType::JoinRelation,
                entity: Some((*source_entity).to_string()),
                service: None,
                depends_on,
                fields: vec![keyword.to_string()],
                args: serde_json::json!({ "source": source_entity, "relation_field": keyword }),
            });
        }
    }

    // 构建并行组: 无依赖的步骤并行执行，有依赖的顺序执行
    let mut parallel_groups: Vec<ParallelGroup> = Vec::new();
    let independent: Vec<String> = steps
        .iter()
        .filter(|s| s.depends_on.is_empty())
        .map(|s| s.step_id.clone())
        .collect();
    if !independent.is_empty() {
        parallel_groups.push(ParallelGroup {
            group_id: "group_0".to_string(),
            steps: independent,
            execution_mode: ExecutionMode::Parallel,
        });
    }
    let dependent: Vec<String> = steps
        .iter()
        .filter(|s| !s.depends_on.is_empty())
        .map(|s| s.step_id.clone())
        .collect();
    if !dependent.is_empty() {
        parallel_groups.push(ParallelGroup {
            group_id: "group_1".to_string(),
            steps: dependent,
            execution_mode: ExecutionMode::Sequential,
        });
    }

    let estimated_cost = steps.len() as f64 * 10.0 + parallel_groups.len() as f64 * 5.0;
    let estimated_duration_ms = (steps.len() as u64 * 50) + (parallel_groups.len() as u64 * 100);

    FederationQueryPlan {
        query_hash,
        steps,
        parallel_groups,
        estimated_cost,
        estimated_duration_ms,
    }
}

/// V42.0: 执行单个计划步骤
async fn execute_step(
    entity: String,
    step_type: PlanStepType,
    args: serde_json::Value,
) -> serde_json::Value {
    let resolver = match get_resolver(&entity) {
        Some(r) => r,
        None => return serde_json::json!({"error": format!("no resolver for {}", entity)}),
    };
    match step_type {
        PlanStepType::FetchEntity => {
            let id = args.get("id").and_then(|v| v.as_str()).unwrap_or("1");
            resolver
                .resolve_single(id)
                .await
                .unwrap_or_else(|e| serde_json::json!({"error": e}))
        }
        PlanStepType::FetchList | PlanStepType::BatchFetch => {
            let ids: Vec<String> = args
                .get("ids")
                .and_then(|v| v.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|v| v.as_str().map(|s| s.to_string()))
                        .collect()
                })
                .unwrap_or_else(|| vec!["1".into(), "2".into(), "3".into()]);
            resolver
                .resolve_batch(&ids)
                .await
                .map(serde_json::Value::Array)
                .unwrap_or_else(|e| serde_json::json!({"error": e}))
        }
        PlanStepType::JoinRelation => {
            let source_id = args
                .get("source_id")
                .and_then(|v| v.as_str())
                .unwrap_or("1");
            resolver
                .resolve_single(source_id)
                .await
                .unwrap_or_else(|e| serde_json::json!({"error": e}))
        }
        _ => serde_json::json!({"skipped": true}),
    }
}

/// V42.0: 查询执行器 — 按并行组执行，组内并行，组间顺序
pub async fn execute_federation_plan(
    plan: &FederationQueryPlan,
) -> Result<serde_json::Value, String> {
    let mut results: HashMap<String, serde_json::Value> = HashMap::new();

    for group in &plan.parallel_groups {
        let futures: Vec<_> = group
            .steps
            .iter()
            .filter_map(|step_id| {
                let step = plan.steps.iter().find(|s| s.step_id == *step_id)?;
                let entity = step.entity.clone()?;
                let step_type = step.step_type;
                let args = step.args.clone();
                let step_id = step_id.clone();
                Some(async move {
                    let result = execute_step(entity, step_type, args).await;
                    (step_id, result)
                })
            })
            .collect();

        let group_results = join_all(futures).await;
        for (step_id, result) in group_results {
            results.insert(step_id, result);
        }
    }

    // 统计
    record_federation_v2_total_steps(plan.steps.len() as u64);
    let parallel_count: u64 = plan
        .parallel_groups
        .iter()
        .filter(|g| matches!(g.execution_mode, ExecutionMode::Parallel))
        .map(|g| g.steps.len() as u64)
        .sum();
    record_federation_v2_parallel_steps(parallel_count);

    Ok(serde_json::json!(results))
}

// --- Schema 自动组合 ---

/// V42.0: 基于 SERVICE_REGISTRY 自动生成联邦 SDL
pub fn compose_federation_sdl_v2() -> String {
    let services = list_services();
    let mut sdl = String::new();

    sdl.push_str("# Federation V2 Composed Schema (Auto-Generated)\n\n");
    sdl.push_str("schema @link(url: \"https://specs.apollo.dev/federation/v2.0\", import: [\"@key\", \"@external\", \"@extends\"])\n");
    sdl.push_str("{ query: Query }\n\n");

    // 1. 为每个服务生成 entity type
    for service in &services {
        for entity in &service.entities {
            sdl.push_str(&generate_entity_sdl(entity));
        }
    }

    // 2. 生成 query type
    sdl.push_str(&generate_query_type(&services));

    // 3. 生成关系字段注释（关系字段已内联在 entity SDL 中）
    for service in &services {
        for entity in &service.entities {
            for relation in &entity.relations {
                sdl.push_str(&generate_relation_field(relation));
            }
        }
    }

    sdl
}

fn generate_entity_sdl(entity: &EntityMetadata) -> String {
    let mut fields: Vec<String> = vec![format!("{}: String!", entity.key_field)];
    for f in &entity.fields {
        let base = if f.is_list {
            format!("[{}!]!", f.field_type)
        } else if f.nullable {
            f.field_type.clone()
        } else {
            format!("{}!", f.field_type)
        };
        fields.push(format!("{}: {}", f.name, base));
    }
    // 关系字段
    for r in &entity.relations {
        let base = if r.relation_type == "one-to-many" {
            format!("[{}!]!", r.target_entity)
        } else {
            r.target_entity.clone()
        };
        fields.push(format!("{}: {}", r.field_name, base));
    }
    format!(
        "type {} @key(fields: \"{}\") {{ {} }}\n",
        entity.name,
        entity.key_field,
        fields.join(" ")
    )
}

fn generate_query_type(services: &[ServiceMetadata]) -> String {
    let mut lines: Vec<String> = vec!["type Query {".to_string()];
    for service in services {
        for entity in &service.entities {
            let entity_lower = first_char_lower(&entity.name);
            lines.push(format!("  {}(id: String!): {}", entity_lower, entity.name));
            lines.push(format!("  {}s: [{}!]!", entity_lower, entity.name));
        }
    }
    lines.push("}".to_string());
    lines.join("\n") + "\n\n"
}

fn generate_relation_field(relation: &RelationMetadata) -> String {
    format!(
        "# relation: {} -> {} ({}, resolver: {})\n",
        relation.field_name, relation.target_entity, relation.relation_type, relation.resolver_type
    )
}

fn first_char_lower(s: &str) -> String {
    if s.is_empty() {
        return String::new();
    }
    let mut chars = s.chars();
    match chars.next() {
        Some(c) => c.to_lowercase().collect::<String>() + chars.as_str(),
        None => String::new(),
    }
}

// --- 联邦 V2 统计 ---

/// V42.0: 联邦 V2 统计 GraphQL 输出
#[derive(SimpleObject)]
pub struct FederationV2StatsGql {
    pub total_queries: u64,
    pub total_steps: u64,
    pub parallel_steps: u64,
    pub batch_resolutions: u64,
    pub cache_hits: u64,
    pub cache_misses: u64,
    pub avg_plan_time_ms: f64,
    pub avg_execute_time_ms: f64,
    pub avg_total_time_ms: f64,
    pub plan_cache_hits: u64,
    pub auto_resolvers_used: u64,
    pub services_registered: usize,
    pub entities_registered: usize,
}

#[derive(Default)]
struct FederationV2StatsInternal {
    total_queries: u64,
    total_steps: u64,
    parallel_steps: u64,
    batch_resolutions: u64,
    cache_hits: u64,
    cache_misses: u64,
    total_plan_time_ms: u64,
    plan_count: u64,
    total_execute_time_ms: u64,
    execute_count: u64,
    plan_cache_hits: u64,
    auto_resolvers_used: u64,
}

static FEDERATION_V2_STATS: std::sync::OnceLock<Mutex<FederationV2StatsInternal>> =
    std::sync::OnceLock::new();

fn federation_v2_stats_internal() -> &'static Mutex<FederationV2StatsInternal> {
    FEDERATION_V2_STATS.get_or_init(|| Mutex::new(FederationV2StatsInternal::default()))
}

pub fn record_federation_v2_request() {
    let mut s = federation_v2_stats_internal()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    s.total_queries += 1;
}

fn record_federation_v2_total_steps(count: u64) {
    let mut s = federation_v2_stats_internal()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    s.total_steps += count;
}

fn record_federation_v2_parallel_steps(count: u64) {
    let mut s = federation_v2_stats_internal()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    s.parallel_steps += count;
}

fn record_federation_v2_batch_resolutions() {
    let mut s = federation_v2_stats_internal()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    s.batch_resolutions += 1;
}

fn record_federation_v2_cache_hit() {
    let mut s = federation_v2_stats_internal()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    s.cache_hits += 1;
}

fn record_federation_v2_cache_miss() {
    let mut s = federation_v2_stats_internal()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    s.cache_misses += 1;
}

pub fn record_federation_v2_plan_time(ms: u64) {
    let mut s = federation_v2_stats_internal()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    s.total_plan_time_ms += ms;
    s.plan_count += 1;
}

pub fn record_federation_v2_execute_time(ms: u64) {
    let mut s = federation_v2_stats_internal()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    s.total_execute_time_ms += ms;
    s.execute_count += 1;
}

pub fn record_federation_v2_plan_cache_hit() {
    let mut s = federation_v2_stats_internal()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    s.plan_cache_hits += 1;
}

pub fn record_federation_v2_plan_cache_miss() {
    // 计划缓存未命中不计入独立计数器，由 plan_count 反映
}

fn record_federation_v2_auto_resolver() {
    let mut s = federation_v2_stats_internal()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    s.auto_resolvers_used += 1;
}

pub fn get_federation_v2_stats() -> FederationV2StatsGql {
    let s = federation_v2_stats_internal()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    let registry = service_registry().read().unwrap_or_else(|e| e.into_inner());
    let entities_registered: usize = registry.iter().map(|s| s.entities.len()).sum();
    let avg_plan_time_ms = if s.plan_count > 0 {
        s.total_plan_time_ms as f64 / s.plan_count as f64
    } else {
        0.0
    };
    let avg_execute_time_ms = if s.execute_count > 0 {
        s.total_execute_time_ms as f64 / s.execute_count as f64
    } else {
        0.0
    };
    let avg_total_time_ms = avg_plan_time_ms + avg_execute_time_ms;
    FederationV2StatsGql {
        total_queries: s.total_queries,
        total_steps: s.total_steps,
        parallel_steps: s.parallel_steps,
        batch_resolutions: s.batch_resolutions,
        cache_hits: s.cache_hits,
        cache_misses: s.cache_misses,
        avg_plan_time_ms,
        avg_execute_time_ms,
        avg_total_time_ms,
        plan_cache_hits: s.plan_cache_hits,
        auto_resolvers_used: s.auto_resolvers_used,
        services_registered: registry.len(),
        entities_registered,
    }
}

pub fn simple_random_u64() -> u64 {
    use std::sync::atomic::{AtomicU64, Ordering};
    static COUNTER: AtomicU64 = AtomicU64::new(0);
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos() as u64;
    let count = COUNTER.fetch_add(1, Ordering::Relaxed);
    timestamp
        .wrapping_mul(11400714819323198485)
        .wrapping_add(count)
}

pub fn simple_random_u128() -> u128 {
    let high = simple_random_u64() as u128;
    let low = simple_random_u64() as u128;
    (high << 64) | low
}

// ==================== V44.0 Track B: Federation V3 — 分布式查询计划 + 容错降级 + 缓存 + 监控 ====================

// ==================== V44.0 Track B: Federation V3 — 分布式查询计划 + 容错降级 + 缓存 + 监控 ====================

// --- V3: 分布式查询计划增强 ---

/// V44.0: 执行策略
#[derive(Clone, Copy, Debug)]
pub enum ExecutionStrategy {
    Parallel,
    Sequential,
    Hybrid,
    Pipelined,
}

impl ExecutionStrategy {
    fn as_str(&self) -> &'static str {
        match self {
            Self::Parallel => "Parallel",
            Self::Sequential => "Sequential",
            Self::Hybrid => "Hybrid",
            Self::Pipelined => "Pipelined",
        }
    }
}

/// V44.0: 查询计划节点
#[derive(Clone, Debug)]
pub struct PlanNode {
    pub id: String,
    pub step_type: PlanStepType,
    pub service: Option<String>,
    pub entity: Option<String>,
    pub fields: Vec<String>,
    pub depends_on: Vec<String>,
    pub children: Vec<String>,
    pub estimated_latency_ms: u64,
}

/// V44.0: 查询依赖图
#[derive(Clone, Debug)]
pub struct QueryDependencyGraph {
    pub nodes: Vec<String>,
    pub edges: Vec<(String, String)>,
    pub critical_path: Vec<String>,
    pub depth: u32,
}

/// V44.0: V3 联邦查询计划
#[derive(Clone, Debug)]
pub struct FederationV3Plan {
    pub plan_id: String,
    pub query_hash: String,
    pub root_steps: Vec<String>,
    pub execution_order: Vec<String>,
    pub total_services: usize,
    pub estimated_cost: f64,
    pub parallel_groups: Vec<Vec<String>>,
    pub nodes: Vec<PlanNode>,
    pub dependency_graph: QueryDependencyGraph,
    pub execution_strategy: ExecutionStrategy,
}

// --- V3: 容错降级 ---

/// V44.0: 熔断器状态
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum CircuitBreakerState {
    Closed,
    Open,
    HalfOpen,
}

impl CircuitBreakerState {
    fn as_str(&self) -> &'static str {
        match self {
            Self::Closed => "Closed",
            Self::Open => "Open",
            Self::HalfOpen => "HalfOpen",
        }
    }
}

/// V44.0: 熔断器配置
#[derive(Clone, Debug)]
pub struct CircuitBreakerConfig {
    pub failure_threshold: u64,
    pub success_threshold: u64,
    pub timeout_ms: u64,
    pub half_open_max_calls: u64,
}

/// V44.0: 服务熔断器
#[derive(Clone, Debug)]
pub struct ServiceCircuitBreaker {
    pub state: CircuitBreakerState,
    pub failure_count: u64,
    pub success_count: u64,
    pub last_failure_time: DateTime<Utc>,
    pub last_state_change: DateTime<Utc>,
    pub config: CircuitBreakerConfig,
}

impl ServiceCircuitBreaker {
    pub fn new(config: CircuitBreakerConfig) -> Self {
        let now = Utc::now();
        Self {
            state: CircuitBreakerState::Closed,
            failure_count: 0,
            success_count: 0,
            last_failure_time: now,
            last_state_change: now,
            config,
        }
    }
}

/// V44.0: 降级策略
#[derive(Clone, Copy, Debug)]
pub enum FallbackStrategy {
    ReturnNull,
    ReturnPartial,
    ReturnCached,
    ReturnError,
    ReturnFallbackValue,
}

impl FallbackStrategy {
    fn as_str(&self) -> &'static str {
        match self {
            Self::ReturnNull => "ReturnNull",
            Self::ReturnPartial => "ReturnPartial",
            Self::ReturnCached => "ReturnCached",
            Self::ReturnError => "ReturnError",
            Self::ReturnFallbackValue => "ReturnFallbackValue",
        }
    }
}

// --- V3: 联邦查询缓存 ---

/// V44.0: 缓存失效策略
#[derive(Clone, Debug)]
pub struct CacheInvalidationPolicy {
    pub ttl_ms: u64,
    pub max_size: usize,
    pub invalidation_on_mutation: bool,
}

/// V44.0: 查询缓存条目
#[derive(Clone, Debug)]
pub struct FederatedQueryCacheEntry {
    pub query_hash: String,
    pub result: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
    pub hit_count: u64,
    pub source_services: Vec<String>,
}

/// V44.0: 实体缓存条目
#[derive(Clone, Debug)]
pub struct EntityCacheEntry {
    pub service: String,
    pub entity_type: String,
    pub entity_id: String,
    pub data: serde_json::Value,
    pub version: u64,
    pub cached_at: DateTime<Utc>,
}

/// V44.0: 两级 LRU 缓存（L1 内存）
pub struct LruCacheV3<K: std::cmp::Eq + std::hash::Hash + Clone, V> {
    map: HashMap<K, V>,
    order: VecDeque<K>,
    capacity: usize,
}

impl<K: std::cmp::Eq + std::hash::Hash + Clone, V> LruCacheV3<K, V> {
    pub fn new(capacity: usize) -> Self {
        Self {
            map: HashMap::new(),
            order: VecDeque::new(),
            capacity,
        }
    }

    pub fn get(&mut self, key: &K) -> Option<&V> {
        if self.map.contains_key(key) {
            self.order.retain(|k| k != key);
            self.order.push_front(key.clone());
            self.map.get(key)
        } else {
            None
        }
    }

    pub fn put(&mut self, key: K, value: V) {
        if self.map.contains_key(&key) {
            self.order.retain(|k| k != &key);
        } else if self.map.len() >= self.capacity {
            if let Some(oldest) = self.order.pop_back() {
                self.map.remove(&oldest);
            }
        }
        self.order.push_front(key.clone());
        self.map.insert(key, value);
    }

    fn remove(&mut self, key: &K) -> Option<V> {
        self.order.retain(|k| k != key);
        self.map.remove(key)
    }

    fn len(&self) -> usize {
        self.map.len()
    }

    fn clear(&mut self) {
        self.map.clear();
        self.order.clear();
    }

    fn keys(&self) -> Vec<K> {
        self.order.iter().cloned().collect()
    }
}

// --- V3: 联邦网关监控 ---

/// V44.0: 服务级统计
#[derive(Clone, Debug)]
pub struct FederationServiceStats {
    pub service_name: String,
    pub request_count: u64,
    pub success_count: u64,
    pub failure_count: u64,
    pub total_latency_ms: u64,
    pub p95_latency_ms: u64,
    pub latencies: Vec<u64>,
}

impl FederationServiceStats {
    pub fn new(service_name: String) -> Self {
        Self {
            service_name,
            request_count: 0,
            success_count: 0,
            failure_count: 0,
            total_latency_ms: 0,
            p95_latency_ms: 0,
            latencies: Vec::new(),
        }
    }

    fn record_success(&mut self, latency_ms: u64) {
        self.request_count += 1;
        self.success_count += 1;
        self.total_latency_ms += latency_ms;
        self.latencies.push(latency_ms);
        if self.latencies.len() > 1000 {
            self.latencies.remove(0);
        }
        self.update_p95();
    }

    fn record_failure(&mut self, latency_ms: u64) {
        self.request_count += 1;
        self.failure_count += 1;
        self.total_latency_ms += latency_ms;
        self.latencies.push(latency_ms);
        if self.latencies.len() > 1000 {
            self.latencies.remove(0);
        }
        self.update_p95();
    }

    fn update_p95(&mut self) {
        if self.latencies.is_empty() {
            self.p95_latency_ms = 0;
            return;
        }
        let mut sorted = self.latencies.clone();
        sorted.sort();
        let idx = ((sorted.len() as f64) * 0.95) as usize;
        self.p95_latency_ms = sorted.get(idx.min(sorted.len() - 1)).copied().unwrap_or(0);
    }

    fn avg_latency_ms(&self) -> u64 {
        if self.request_count > 0 {
            self.total_latency_ms / self.request_count
        } else {
            0
        }
    }
}

/// V44.0: 计划步骤执行轨迹
#[derive(Clone, Debug)]
pub struct PlanStepTrace {
    pub step_id: String,
    pub step_type: String,
    pub service: Option<String>,
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
    pub duration_ms: u64,
    pub status: String,
    pub error_message: Option<String>,
    pub cached: bool,
}

/// V44.0: 计划执行轨迹
#[derive(Clone, Debug)]
pub struct PlanExecutionTrace {
    pub plan_id: String,
    pub query_hash: String,
    pub total_time_ms: u64,
    pub step_traces: Vec<PlanStepTrace>,
    pub cache_hits: u64,
    pub services_used: Vec<String>,
    pub errors: Vec<String>,
    pub created_at: DateTime<Utc>,
}

/// V44.0: V3 网关统计
#[derive(Clone, Debug)]
pub struct FederationV3StatsInternal {
    pub total_queries: u64,
    pub cache_hits: u64,
    pub cache_misses: u64,
    pub total_latency_ms: u64,
    pub latencies: Vec<u64>,
    pub service_stats: HashMap<String, FederationServiceStats>,
    pub plan_count: u64,
    pub total_plan_time_ms: u64,
    pub total_execute_time_ms: u64,
    pub execute_count: u64,
    pub circuit_breaker_trips: u64,
    pub fallback_uses: u64,
}

impl Default for FederationV3StatsInternal {
    fn default() -> Self {
        let mut service_stats = HashMap::new();
        for svc in ["erp", "crm", "hrm", "finance", "mes"] {
            service_stats.insert(
                svc.to_string(),
                FederationServiceStats::new(svc.to_string()),
            );
        }
        Self {
            total_queries: 0,
            cache_hits: 0,
            cache_misses: 0,
            total_latency_ms: 0,
            latencies: Vec::new(),
            service_stats,
            plan_count: 0,
            total_plan_time_ms: 0,
            total_execute_time_ms: 0,
            execute_count: 0,
            circuit_breaker_trips: 0,
            fallback_uses: 0,
        }
    }
}

// --- V3: 全局状态 ---

static FEDERATION_V3_STATS: std::sync::OnceLock<Mutex<FederationV3StatsInternal>> =
    std::sync::OnceLock::new();

pub fn federation_v3_stats_internal() -> &'static Mutex<FederationV3StatsInternal> {
    FEDERATION_V3_STATS.get_or_init(|| Mutex::new(FederationV3StatsInternal::default()))
}

static FEDERATION_V3_CIRCUIT_BREAKERS: std::sync::OnceLock<
    Mutex<HashMap<String, ServiceCircuitBreaker>>,
> = std::sync::OnceLock::new();

fn federation_v3_circuit_breakers() -> &'static Mutex<HashMap<String, ServiceCircuitBreaker>> {
    FEDERATION_V3_CIRCUIT_BREAKERS.get_or_init(|| {
        let mut map = HashMap::new();
        let default_config = CircuitBreakerConfig {
            failure_threshold: 5,
            success_threshold: 3,
            timeout_ms: 30000,
            half_open_max_calls: 2,
        };
        for svc in ["erp", "crm", "hrm", "finance", "mes"] {
            map.insert(
                svc.to_string(),
                ServiceCircuitBreaker::new(default_config.clone()),
            );
        }
        Mutex::new(map)
    })
}

static FEDERATION_V3_QUERY_CACHE: std::sync::OnceLock<
    Mutex<LruCacheV3<String, FederatedQueryCacheEntry>>,
> = std::sync::OnceLock::new();

fn federation_v3_query_cache() -> &'static Mutex<LruCacheV3<String, FederatedQueryCacheEntry>> {
    FEDERATION_V3_QUERY_CACHE.get_or_init(|| Mutex::new(LruCacheV3::new(200)))
}

static FEDERATION_V3_ENTITY_CACHE: std::sync::OnceLock<
    Mutex<LruCacheV3<String, EntityCacheEntry>>,
> = std::sync::OnceLock::new();

fn federation_v3_entity_cache() -> &'static Mutex<LruCacheV3<String, EntityCacheEntry>> {
    FEDERATION_V3_ENTITY_CACHE.get_or_init(|| Mutex::new(LruCacheV3::new(500)))
}

static FEDERATION_V3_TRACES: std::sync::OnceLock<Mutex<VecDeque<PlanExecutionTrace>>> =
    std::sync::OnceLock::new();

fn federation_v3_traces() -> &'static Mutex<VecDeque<PlanExecutionTrace>> {
    FEDERATION_V3_TRACES.get_or_init(|| Mutex::new(VecDeque::with_capacity(100)))
}

static FEDERATION_V3_PLAN_CACHE: std::sync::OnceLock<Mutex<LruCacheV3<String, FederationV3Plan>>> =
    std::sync::OnceLock::new();

pub fn federation_v3_plan_cache() -> &'static Mutex<LruCacheV3<String, FederationV3Plan>> {
    FEDERATION_V3_PLAN_CACHE.get_or_init(|| Mutex::new(LruCacheV3::new(100)))
}

// --- V3: GraphQL 输出类型 ---

/// V44.0: V3 查询计划 GQL
#[derive(SimpleObject)]
pub struct FederationV3PlanGql {
    pub plan_id: String,
    pub query_hash: String,
    pub root_steps: Vec<String>,
    pub execution_order: Vec<String>,
    pub total_services: i32,
    pub estimated_cost: f64,
    pub parallel_groups: Vec<String>,
    pub nodes: Vec<PlanNodeGql>,
    pub dependency_graph: QueryDependencyGraphGql,
    pub execution_strategy: String,
}

/// V44.0: 计划节点 GQL
#[derive(SimpleObject)]
pub struct PlanNodeGql {
    pub id: String,
    pub step_type: String,
    pub service: Option<String>,
    pub entity: Option<String>,
    pub fields: Vec<String>,
    pub depends_on: Vec<String>,
    pub children: Vec<String>,
    pub estimated_latency_ms: i32,
}

/// V44.0: 查询依赖图 GQL
#[derive(SimpleObject)]
pub struct QueryDependencyGraphGql {
    pub nodes: Vec<String>,
    pub edges: Vec<String>,
    pub critical_path: Vec<String>,
    pub depth: i32,
}

/// V44.0: 熔断器状态 GQL (简化版，避免与 rate_limiting::CircuitBreakerStateGql 冲突)
#[derive(SimpleObject)]
pub struct CircuitBreakerStateGqlSimple {
    pub service: String,
    pub state: String,
    pub failure_count: i32,
    pub success_count: i32,
    pub last_failure_time: String,
    pub last_state_change: String,
    pub failure_threshold: i32,
    pub timeout_ms: i32,
}

/// V44.0: 熔断器配置输入
#[derive(async_graphql::InputObject)]
pub struct CircuitBreakerConfigInputGql {
    pub failure_threshold: i32,
    pub success_threshold: i32,
    pub timeout_ms: i32,
    pub half_open_max_calls: i32,
}

/// V44.0: V3 统计 GQL
#[derive(SimpleObject)]
pub struct FederationV3StatsGql {
    pub total_queries: i32,
    pub cache_hits: i32,
    pub cache_misses: i32,
    pub total_latency_ms: i32,
    pub avg_latency_ms: f64,
    pub p95_latency_ms: i32,
    pub service_stats: Vec<FederationServiceStatsGql>,
    pub plan_count: i32,
    pub avg_plan_time_ms: f64,
    pub avg_execute_time_ms: f64,
    pub circuit_breaker_trips: i32,
    pub fallback_uses: i32,
}

/// V44.0: 服务统计 GQL
#[derive(SimpleObject)]
pub struct FederationServiceStatsGql {
    pub service_name: String,
    pub request_count: i32,
    pub success_count: i32,
    pub failure_count: i32,
    pub avg_latency_ms: f64,
    pub p95_latency_ms: i32,
    pub circuit_breaker_state: String,
}

/// V44.0: 计划执行轨迹 GQL
#[derive(SimpleObject)]
pub struct PlanExecutionTraceGql {
    pub plan_id: String,
    pub query_hash: String,
    pub total_time_ms: i32,
    pub step_traces: Vec<PlanStepTraceGql>,
    pub cache_hits: i32,
    pub services_used: Vec<String>,
    pub errors: Vec<String>,
    pub created_at: String,
}

/// V44.0: 计划步骤轨迹 GQL
#[derive(SimpleObject)]
pub struct PlanStepTraceGql {
    pub step_id: String,
    pub step_type: String,
    pub service: Option<String>,
    pub start_time: String,
    pub end_time: String,
    pub duration_ms: i32,
    pub status: String,
    pub error_message: Option<String>,
    pub cached: bool,
}

/// V44.0: 缓存统计 GQL
#[derive(SimpleObject)]
pub struct FederationCacheStatsGql {
    pub query_cache_size: i32,
    pub query_cache_max_size: i32,
    pub query_cache_hit_rate: f64,
    pub entity_cache_size: i32,
    pub entity_cache_max_size: i32,
    pub total_cache_hits: i32,
    pub total_cache_misses: i32,
}

// --- V3: 分布式查询计划器 ---

/// V44.0: V3 联邦查询计划器
pub struct FederationV3Planner;

impl FederationV3Planner {
    pub fn build_plan_v3(query: &str, _variables: &serde_json::Value) -> FederationV3Plan {
        let query_hash = Self::query_hash(query);
        let lower = query.to_lowercase();
        let mut nodes: Vec<PlanNode> = Vec::new();
        let mut node_counter = 0usize;

        let entity_patterns: &[(&str, &str, &str)] = &[
            ("customer", "Customer", "erp"),
            ("supplier", "Supplier", "erp"),
            ("material", "Material", "erp"),
            ("contact", "Contact", "crm"),
            ("lead", "Lead", "crm"),
            ("employee", "Employee", "hrm"),
            ("department", "Department", "hrm"),
            ("voucher", "Voucher", "finance"),
            ("accountsubject", "AccountSubject", "finance"),
            ("workorder", "WorkOrder", "mes"),
            ("product", "Product", "mes"),
        ];

        for (keyword, entity, service) in entity_patterns {
            if lower.contains(keyword) {
                let node_id = format!("node_{}", node_counter);
                node_counter += 1;
                let step_type = if lower.contains("list") || lower.contains("s(") {
                    PlanStepType::FetchList
                } else {
                    PlanStepType::FetchEntity
                };
                nodes.push(PlanNode {
                    id: node_id,
                    step_type,
                    service: Some((*service).to_string()),
                    entity: Some((*entity).to_string()),
                    fields: Vec::new(),
                    depends_on: Vec::new(),
                    children: Vec::new(),
                    estimated_latency_ms: 50,
                });
            }
        }

        let relation_patterns: &[(&str, &str, &str)] = &[
            ("contacts", "Customer", "Contact"),
            ("department_info", "Employee", "Department"),
            ("account_subject", "Voucher", "AccountSubject"),
        ];

        for (keyword, source_entity, _target_entity) in relation_patterns {
            if lower.contains(keyword) {
                let node_id = format!("node_{}", node_counter);
                node_counter += 1;
                let depends_on: Vec<String> = nodes
                    .iter()
                    .filter(|n| n.entity.as_deref() == Some(*source_entity))
                    .map(|n| n.id.clone())
                    .collect();
                nodes.push(PlanNode {
                    id: node_id.clone(),
                    step_type: PlanStepType::JoinRelation,
                    service: None,
                    entity: Some((*source_entity).to_string()),
                    fields: vec![keyword.to_string()],
                    depends_on: depends_on.clone(),
                    children: Vec::new(),
                    estimated_latency_ms: 30,
                });
                for dep_id in &depends_on {
                    if let Some(node) = nodes.iter_mut().find(|n| n.id == *dep_id) {
                        node.children.push(node_id.clone());
                    }
                }
            }
        }

        let services: HashSet<String> = nodes.iter().filter_map(|n| n.service.clone()).collect();

        let (dependency_graph, execution_order) = Self::build_dependency_graph(&nodes);
        let parallel_groups = Self::detect_parallel_groups(&nodes, &dependency_graph);
        let critical_path = Self::calculate_critical_path(&nodes, &dependency_graph);
        let depth = dependency_graph.depth;
        let estimated_cost = nodes.len() as f64 * 10.0 + depth as f64 * 5.0;

        let execution_strategy = if depth <= 2 {
            ExecutionStrategy::Parallel
        } else if nodes.len() <= 3 {
            ExecutionStrategy::Sequential
        } else {
            ExecutionStrategy::Hybrid
        };

        let root_steps: Vec<String> = nodes
            .iter()
            .filter(|n| n.depends_on.is_empty())
            .map(|n| n.id.clone())
            .collect();

        let plan_id = format!("plan_{}", uuid::Uuid::new_v4());

        FederationV3Plan {
            plan_id,
            query_hash,
            root_steps,
            execution_order,
            total_services: services.len(),
            estimated_cost,
            parallel_groups,
            nodes,
            dependency_graph: QueryDependencyGraph {
                nodes: dependency_graph.nodes,
                edges: dependency_graph.edges,
                critical_path,
                depth,
            },
            execution_strategy,
        }
    }

    fn query_hash(query: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(query.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    fn build_dependency_graph(nodes: &[PlanNode]) -> (QueryDependencyGraph, Vec<String>) {
        let node_ids: Vec<String> = nodes.iter().map(|n| n.id.clone()).collect();
        let mut edges: Vec<(String, String)> = Vec::new();
        for node in nodes {
            for dep in &node.depends_on {
                edges.push((dep.clone(), node.id.clone()));
            }
        }

        let mut in_degree: HashMap<String, usize> = HashMap::new();
        for id in &node_ids {
            in_degree.insert(id.clone(), 0);
        }
        for (_from, to) in &edges {
            *in_degree.get_mut(to).unwrap() += 1;
        }

        let mut queue: VecDeque<String> = VecDeque::new();
        for id in &node_ids {
            if in_degree[id] == 0 {
                queue.push_back(id.clone());
            }
        }

        let mut execution_order: Vec<String> = Vec::new();
        let mut depth_map: HashMap<String, u32> = HashMap::new();
        for id in &node_ids {
            depth_map.insert(id.clone(), 0);
        }

        while let Some(node_id) = queue.pop_front() {
            execution_order.push(node_id.clone());
            for (_from, to) in edges.iter().filter(|(f, _)| *f == node_id) {
                *in_degree.get_mut(to).unwrap() -= 1;
                let new_depth = depth_map[&node_id] + 1;
                if new_depth > depth_map[to] {
                    depth_map.insert(to.clone(), new_depth);
                }
                if in_degree[to] == 0 {
                    queue.push_back(to.clone());
                }
            }
        }

        let max_depth = depth_map.values().copied().max().unwrap_or(0);
        let critical_path = Vec::new();

        (
            QueryDependencyGraph {
                nodes: node_ids,
                edges,
                critical_path,
                depth: max_depth,
            },
            execution_order,
        )
    }

    fn detect_parallel_groups(
        nodes: &[PlanNode],
        _graph: &QueryDependencyGraph,
    ) -> Vec<Vec<String>> {
        let mut groups: Vec<Vec<String>> = Vec::new();
        let mut remaining: HashSet<String> = nodes.iter().map(|n| n.id.clone()).collect();

        while !remaining.is_empty() {
            let mut current_group: Vec<String> = Vec::new();
            for node in nodes {
                if remaining.contains(&node.id) {
                    let deps_met = node.depends_on.iter().all(|dep| !remaining.contains(dep));
                    if deps_met {
                        current_group.push(node.id.clone());
                    }
                }
            }
            if current_group.is_empty() {
                break;
            }
            for id in &current_group {
                remaining.remove(id);
            }
            groups.push(current_group);
        }

        groups
    }

    fn calculate_critical_path(nodes: &[PlanNode], _graph: &QueryDependencyGraph) -> Vec<String> {
        let mut longest: HashMap<String, u64> = HashMap::new();
        let mut prev: HashMap<String, Option<String>> = HashMap::new();

        for node in nodes {
            longest.insert(node.id.clone(), node.estimated_latency_ms);
            prev.insert(node.id.clone(), None);
        }

        let mut sorted_nodes: Vec<&PlanNode> = nodes.iter().collect();
        sorted_nodes.sort_by_key(|a| a.depends_on.len());

        for node in &sorted_nodes {
            for dep in &node.depends_on {
                let new_len = longest[dep] + node.estimated_latency_ms;
                if new_len > longest[&node.id] {
                    longest.insert(node.id.clone(), new_len);
                    prev.insert(node.id.clone(), Some(dep.clone()));
                }
            }
        }

        let mut critical_path: Vec<String> = Vec::new();
        if let Some((end_node, _)) = longest.iter().max_by_key(|(_, v)| **v) {
            let mut current = Some(end_node.clone());
            while let Some(node_id) = current {
                critical_path.push(node_id.clone());
                current = prev[&node_id].clone();
            }
            critical_path.reverse();
        }

        critical_path
    }

    #[allow(dead_code)]
    pub fn optimize_plan(plan: &FederationV3Plan) -> FederationV3Plan {
        plan.clone()
    }
}

// --- V3: 熔断器控制 ---

/// V44.0: 检查熔断器状态
pub fn check_circuit_breaker(service: &str) -> bool {
    let breakers = federation_v3_circuit_breakers()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    if let Some(cb) = breakers.get(service) {
        match cb.state {
            CircuitBreakerState::Closed => true,
            CircuitBreakerState::Open => {
                let elapsed = Utc::now()
                    .signed_duration_since(cb.last_state_change)
                    .num_milliseconds();
                elapsed >= cb.config.timeout_ms as i64
            }
            CircuitBreakerState::HalfOpen => true,
        }
    } else {
        true
    }
}

/// V44.0: 记录成功
pub fn record_circuit_success(service: &str) {
    let mut breakers = federation_v3_circuit_breakers()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    if let Some(cb) = breakers.get_mut(service) {
        let now = Utc::now();
        match cb.state {
            CircuitBreakerState::Closed => {
                cb.failure_count = 0;
            }
            CircuitBreakerState::HalfOpen => {
                cb.success_count += 1;
                if cb.success_count >= cb.config.success_threshold {
                    cb.state = CircuitBreakerState::Closed;
                    cb.failure_count = 0;
                    cb.success_count = 0;
                    cb.last_state_change = now;
                }
            }
            CircuitBreakerState::Open => {}
        }
    }
}

/// V44.0: 记录失败
pub fn record_circuit_failure(service: &str) {
    let mut breakers = federation_v3_circuit_breakers()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    let mut stats = federation_v3_stats_internal()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    if let Some(cb) = breakers.get_mut(service) {
        let now = Utc::now();
        cb.failure_count += 1;
        cb.last_failure_time = now;
        match cb.state {
            CircuitBreakerState::Closed => {
                if cb.failure_count >= cb.config.failure_threshold {
                    cb.state = CircuitBreakerState::Open;
                    cb.last_state_change = now;
                    cb.success_count = 0;
                    stats.circuit_breaker_trips += 1;
                }
            }
            CircuitBreakerState::HalfOpen => {
                cb.state = CircuitBreakerState::Open;
                cb.last_state_change = now;
                cb.success_count = 0;
                stats.circuit_breaker_trips += 1;
            }
            CircuitBreakerState::Open => {}
        }
    }
}

/// V44.0: 重置熔断器
pub fn reset_circuit_breaker(service: &str) -> bool {
    let mut breakers = federation_v3_circuit_breakers()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    if let Some(cb) = breakers.get_mut(service) {
        let now = Utc::now();
        cb.state = CircuitBreakerState::Closed;
        cb.failure_count = 0;
        cb.success_count = 0;
        cb.last_state_change = now;
        true
    } else {
        false
    }
}

/// V44.0: 设置熔断器配置
pub fn set_circuit_breaker_config(service: &str, config: CircuitBreakerConfigInputGql) -> bool {
    let mut breakers = federation_v3_circuit_breakers()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    if let Some(cb) = breakers.get_mut(service) {
        cb.config = CircuitBreakerConfig {
            failure_threshold: config.failure_threshold as u64,
            success_threshold: config.success_threshold as u64,
            timeout_ms: config.timeout_ms as u64,
            half_open_max_calls: config.half_open_max_calls as u64,
        };
        true
    } else {
        false
    }
}

// --- V3: 联邦缓存管理器 ---

/// V44.0: 联邦缓存管理器
pub struct FederatedCacheManager;

impl FederatedCacheManager {
    pub fn get_query_cache(query_hash: &str, variables_hash: &str) -> Option<serde_json::Value> {
        let key = format!("{}:{}", query_hash, variables_hash);
        let mut cache = federation_v3_query_cache()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let now = Utc::now();
        if let Some(entry) = cache.get(&key) {
            if entry.expires_at > now {
                let mut stats = federation_v3_stats_internal()
                    .lock()
                    .unwrap_or_else(|e| e.into_inner());
                stats.cache_hits += 1;
                return Some(entry.result.clone());
            }
        }
        None
    }

    pub fn set_query_cache(
        query_hash: &str,
        variables_hash: &str,
        result: serde_json::Value,
        source_services: Vec<String>,
        ttl_ms: u64,
    ) {
        let key = format!("{}:{}", query_hash, variables_hash);
        let now = Utc::now();
        let expires = now + chrono::Duration::milliseconds(ttl_ms as i64);
        let mut cache = federation_v3_query_cache()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        if let Some(existing) = cache.get(&key) {
            let hit_count = existing.hit_count + 1;
            cache.put(
                key.clone(),
                FederatedQueryCacheEntry {
                    query_hash: query_hash.to_string(),
                    result,
                    created_at: now,
                    expires_at: expires,
                    hit_count,
                    source_services,
                },
            );
        } else {
            cache.put(
                key.clone(),
                FederatedQueryCacheEntry {
                    query_hash: query_hash.to_string(),
                    result,
                    created_at: now,
                    expires_at: expires,
                    hit_count: 0,
                    source_services,
                },
            );
        }
        let mut stats = federation_v3_stats_internal()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        stats.cache_misses += 1;
    }

    pub fn invalidate_query_cache(query_hash: &str) -> bool {
        let mut cache = federation_v3_query_cache()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let keys: Vec<String> = cache
            .keys()
            .into_iter()
            .filter(|k| k.starts_with(&format!("{}:", query_hash)))
            .collect();
        let mut removed = false;
        for key in keys {
            if cache.remove(&key).is_some() {
                removed = true;
            }
        }
        removed
    }

    pub fn get_entity_cache(
        service: &str,
        entity_type: &str,
        entity_id: &str,
    ) -> Option<serde_json::Value> {
        let key = format!("{}:{}:{}", service, entity_type, entity_id);
        let mut cache = federation_v3_entity_cache()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        cache.get(&key).map(|e| e.data.clone())
    }

    pub fn set_entity_cache(
        service: &str,
        entity_type: &str,
        entity_id: &str,
        data: serde_json::Value,
    ) {
        let key = format!("{}:{}:{}", service, entity_type, entity_id);
        let now = Utc::now();
        let mut cache = federation_v3_entity_cache()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let version = cache.get(&key).map(|e| e.version + 1).unwrap_or(1);
        cache.put(
            key,
            EntityCacheEntry {
                service: service.to_string(),
                entity_type: entity_type.to_string(),
                entity_id: entity_id.to_string(),
                data,
                version,
                cached_at: now,
            },
        );
    }

    pub fn invalidate_entity_cache(service: &str, entity_type: &str, entity_id: &str) -> bool {
        let key = format!("{}:{}:{}", service, entity_type, entity_id);
        let mut cache = federation_v3_entity_cache()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        cache.remove(&key).is_some()
    }

    pub fn clear_all_cache() -> bool {
        let mut query_cache = federation_v3_query_cache()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let mut entity_cache = federation_v3_entity_cache()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        query_cache.clear();
        entity_cache.clear();
        true
    }
}

// --- V3: V3 执行器 ---

/// V44.0: V3 联邦查询执行器
pub struct FederationV3Executor;

impl FederationV3Executor {
    pub async fn execute_plan_v3(plan: &FederationV3Plan) -> Result<serde_json::Value, String> {
        let mut results: HashMap<String, serde_json::Value> = HashMap::new();
        let mut step_traces: Vec<PlanStepTrace> = Vec::new();
        let mut services_used: HashSet<String> = HashSet::new();
        let mut errors: Vec<String> = Vec::new();
        let mut cache_hit_count: u64 = 0;
        let exec_start = std::time::Instant::now();

        for group in &plan.parallel_groups {
            let futures: Vec<_> = group
                .iter()
                .filter_map(|node_id| {
                    let node = plan.nodes.iter().find(|n| n.id == *node_id)?;
                    let node_id = node_id.clone();
                    let service = node.service.clone();
                    let entity = node.entity.clone();
                    let step_type = node.step_type;
                    Some(async move {
                        let start = Utc::now();
                        let start_instant = std::time::Instant::now();
                        let (result, cached) = Self::execute_with_fallback(
                            service.as_deref(),
                            entity.as_deref(),
                            step_type,
                        )
                        .await;
                        let end = Utc::now();
                        let duration = start_instant.elapsed().as_millis() as u64;
                        let status = if result.get("error").is_some() {
                            "failed".to_string()
                        } else {
                            "success".to_string()
                        };
                        let error_message = result
                            .get("error")
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string());
                        (
                            node_id,
                            result,
                            PlanStepTrace {
                                step_id: String::new(),
                                step_type: step_type.as_str().to_string(),
                                service: service.clone(),
                                start_time: start,
                                end_time: end,
                                duration_ms: duration,
                                status,
                                error_message,
                                cached,
                            },
                        )
                    })
                })
                .collect();

            let group_results = join_all(futures).await;
            for (node_id, result, mut trace) in group_results {
                trace.step_id = node_id.clone();
                if let Some(svc) = &trace.service {
                    services_used.insert(svc.clone());
                }
                if let Some(err) = &trace.error_message {
                    errors.push(err.clone());
                }
                if trace.cached {
                    cache_hit_count += 1;
                }
                step_traces.push(trace);
                results.insert(node_id, result);
            }
        }

        let total_time = exec_start.elapsed().as_millis() as u64;

        Self::record_trace(PlanExecutionTrace {
            plan_id: plan.plan_id.clone(),
            query_hash: plan.query_hash.clone(),
            total_time_ms: total_time,
            step_traces,
            cache_hits: cache_hit_count,
            services_used: services_used.into_iter().collect(),
            errors,
            created_at: Utc::now(),
        });

        let mut stats = federation_v3_stats_internal()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        stats.total_queries += 1;
        stats.total_latency_ms += total_time;
        stats.latencies.push(total_time);
        if stats.latencies.len() > 1000 {
            stats.latencies.remove(0);
        }
        stats.execute_count += 1;
        stats.total_execute_time_ms += total_time;

        Ok(serde_json::json!(results))
    }

    async fn execute_with_fallback(
        service: Option<&str>,
        entity: Option<&str>,
        step_type: PlanStepType,
    ) -> (serde_json::Value, bool) {
        let svc = match service {
            Some(s) => s,
            None => return (serde_json::json!({"error": "no service"}), false),
        };
        let ent = match entity {
            Some(e) => e,
            None => return (serde_json::json!({"error": "no entity"}), false),
        };

        if !check_circuit_breaker(svc) {
            let mut stats = federation_v3_stats_internal()
                .lock()
                .unwrap_or_else(|e| e.into_inner());
            stats.fallback_uses += 1;
            return (
                serde_json::json!({"error": "circuit breaker open", "service": svc}),
                false,
            );
        }

        if let Some(cached) = FederatedCacheManager::get_entity_cache(svc, ent, "default") {
            return (cached, true);
        }

        let resolver = match get_resolver(ent) {
            Some(r) => r,
            None => {
                record_circuit_failure(svc);
                return (
                    serde_json::json!({"error": format!("no resolver for {}", ent)}),
                    false,
                );
            }
        };

        let start = std::time::Instant::now();
        let result = match step_type {
            PlanStepType::FetchEntity => match resolver.resolve_single("1").await {
                Ok(v) => {
                    FederatedCacheManager::set_entity_cache(svc, ent, "default", v.clone());
                    record_circuit_success(svc);
                    v
                }
                Err(e) => {
                    record_circuit_failure(svc);
                    let mut stats = federation_v3_stats_internal()
                        .lock()
                        .unwrap_or_else(|e| e.into_inner());
                    stats.fallback_uses += 1;
                    serde_json::json!({"error": e})
                }
            },
            _ => match resolver.resolve_batch(&["1".into(), "2".into()]).await {
                Ok(v) => {
                    record_circuit_success(svc);
                    serde_json::Value::Array(v)
                }
                Err(e) => {
                    record_circuit_failure(svc);
                    let mut stats = federation_v3_stats_internal()
                        .lock()
                        .unwrap_or_else(|e| e.into_inner());
                    stats.fallback_uses += 1;
                    serde_json::json!({"error": e})
                }
            },
        };

        let latency = start.elapsed().as_millis() as u64;
        let mut stats = federation_v3_stats_internal()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        if let Some(svc_stats) = stats.service_stats.get_mut(svc) {
            if result.get("error").is_some() {
                svc_stats.record_failure(latency);
            } else {
                svc_stats.record_success(latency);
            }
        }

        (result, false)
    }

    fn record_trace(trace: PlanExecutionTrace) {
        let mut traces = federation_v3_traces()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        traces.push_front(trace);
        if traces.len() > 100 {
            traces.pop_back();
        }
    }
}

// --- V3: 统计与转换函数 ---

pub fn v3_variables_hash(variables: &serde_json::Value) -> String {
    let s = serde_json::to_string(variables).unwrap_or_default();
    let mut hasher = Sha256::new();
    hasher.update(s.as_bytes());
    format!("{:x}", hasher.finalize())
}

pub fn get_federation_v3_stats() -> FederationV3StatsGql {
    let stats = federation_v3_stats_internal()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    let breakers = federation_v3_circuit_breakers()
        .lock()
        .unwrap_or_else(|e| e.into_inner());

    let avg_latency_ms = if stats.total_queries > 0 {
        stats.total_latency_ms as f64 / stats.total_queries as f64
    } else {
        0.0
    };

    let mut sorted_latencies = stats.latencies.clone();
    sorted_latencies.sort();
    let p95_idx = ((sorted_latencies.len() as f64) * 0.95) as usize;
    let p95_latency_ms = sorted_latencies
        .get(p95_idx.min(sorted_latencies.len().saturating_sub(1)))
        .copied()
        .unwrap_or(0) as i32;

    let avg_plan_time_ms = if stats.plan_count > 0 {
        stats.total_plan_time_ms as f64 / stats.plan_count as f64
    } else {
        0.0
    };

    let avg_execute_time_ms = if stats.execute_count > 0 {
        stats.total_execute_time_ms as f64 / stats.execute_count as f64
    } else {
        0.0
    };

    let service_stats: Vec<FederationServiceStatsGql> = stats
        .service_stats
        .iter()
        .map(|(name, s)| FederationServiceStatsGql {
            service_name: name.clone(),
            request_count: s.request_count as i32,
            success_count: s.success_count as i32,
            failure_count: s.failure_count as i32,
            avg_latency_ms: if s.request_count > 0 {
                s.total_latency_ms as f64 / s.request_count as f64
            } else {
                0.0
            },
            p95_latency_ms: s.p95_latency_ms as i32,
            circuit_breaker_state: breakers
                .get(name)
                .map(|cb| cb.state.as_str().to_string())
                .unwrap_or_else(|| "Unknown".to_string()),
        })
        .collect();

    FederationV3StatsGql {
        total_queries: stats.total_queries as i32,
        cache_hits: stats.cache_hits as i32,
        cache_misses: stats.cache_misses as i32,
        total_latency_ms: stats.total_latency_ms as i32,
        avg_latency_ms,
        p95_latency_ms,
        service_stats,
        plan_count: stats.plan_count as i32,
        avg_plan_time_ms,
        avg_execute_time_ms,
        circuit_breaker_trips: stats.circuit_breaker_trips as i32,
        fallback_uses: stats.fallback_uses as i32,
    }
}

pub fn get_all_circuit_breakers() -> Vec<CircuitBreakerStateGqlSimple> {
    let breakers = federation_v3_circuit_breakers()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    breakers
        .iter()
        .map(|(name, cb)| CircuitBreakerStateGqlSimple {
            service: name.clone(),
            state: cb.state.as_str().to_string(),
            failure_count: cb.failure_count as i32,
            success_count: cb.success_count as i32,
            last_failure_time: cb.last_failure_time.to_rfc3339(),
            last_state_change: cb.last_state_change.to_rfc3339(),
            failure_threshold: cb.config.failure_threshold as i32,
            timeout_ms: cb.config.timeout_ms as i32,
        })
        .collect()
}

pub fn get_v3_traces(limit: usize) -> Vec<PlanExecutionTraceGql> {
    let traces = federation_v3_traces()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    traces
        .iter()
        .take(limit)
        .map(|t| PlanExecutionTraceGql {
            plan_id: t.plan_id.clone(),
            query_hash: t.query_hash.clone(),
            total_time_ms: t.total_time_ms as i32,
            step_traces: t
                .step_traces
                .iter()
                .map(|s| PlanStepTraceGql {
                    step_id: s.step_id.clone(),
                    step_type: s.step_type.clone(),
                    service: s.service.clone(),
                    start_time: s.start_time.to_rfc3339(),
                    end_time: s.end_time.to_rfc3339(),
                    duration_ms: s.duration_ms as i32,
                    status: s.status.clone(),
                    error_message: s.error_message.clone(),
                    cached: s.cached,
                })
                .collect(),
            cache_hits: t.cache_hits as i32,
            services_used: t.services_used.clone(),
            errors: t.errors.clone(),
            created_at: t.created_at.to_rfc3339(),
        })
        .collect()
}

pub fn get_v3_cache_stats() -> FederationCacheStatsGql {
    let stats = federation_v3_stats_internal()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    let query_cache = federation_v3_query_cache()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    let entity_cache = federation_v3_entity_cache()
        .lock()
        .unwrap_or_else(|e| e.into_inner());

    let total_cache = stats.cache_hits + stats.cache_misses;
    let hit_rate = if total_cache > 0 {
        stats.cache_hits as f64 / total_cache as f64
    } else {
        0.0
    };

    FederationCacheStatsGql {
        query_cache_size: query_cache.len() as i32,
        query_cache_max_size: 200,
        query_cache_hit_rate: hit_rate,
        entity_cache_size: entity_cache.len() as i32,
        entity_cache_max_size: 500,
        total_cache_hits: stats.cache_hits as i32,
        total_cache_misses: stats.cache_misses as i32,
    }
}

pub fn plan_to_gql(plan: &FederationV3Plan) -> FederationV3PlanGql {
    FederationV3PlanGql {
        plan_id: plan.plan_id.clone(),
        query_hash: plan.query_hash.clone(),
        root_steps: plan.root_steps.clone(),
        execution_order: plan.execution_order.clone(),
        total_services: plan.total_services as i32,
        estimated_cost: plan.estimated_cost,
        parallel_groups: plan.parallel_groups.iter().map(|g| g.join(",")).collect(),
        nodes: plan
            .nodes
            .iter()
            .map(|n| PlanNodeGql {
                id: n.id.clone(),
                step_type: n.step_type.as_str().to_string(),
                service: n.service.clone(),
                entity: n.entity.clone(),
                fields: n.fields.clone(),
                depends_on: n.depends_on.clone(),
                children: n.children.clone(),
                estimated_latency_ms: n.estimated_latency_ms as i32,
            })
            .collect(),
        dependency_graph: QueryDependencyGraphGql {
            nodes: plan.dependency_graph.nodes.clone(),
            edges: plan
                .dependency_graph
                .edges
                .iter()
                .map(|(f, t)| format!("{}->{}", f, t))
                .collect(),
            critical_path: plan.dependency_graph.critical_path.clone(),
            depth: plan.dependency_graph.depth as i32,
        },
        execution_strategy: plan.execution_strategy.as_str().to_string(),
    }
}

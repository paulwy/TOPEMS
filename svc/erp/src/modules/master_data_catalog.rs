//! 数据目录模块
//!
//! 从 master_data_refs.rs 拆分出来的独立模块（V47.0 AC-19 Part 2）。
//! 提供主数据资产的目录化管理、搜索、分面统计和热门排行功能。
//!
//! 功能：
//! - 数据目录条目 CRUD
//! - 多维度搜索（关键词/域/标签/分类/所有者）
//! - 分面统计（按域/分类/所有者/标签）
//! - 目录统计与热门排行

use axum::{extract::Path, extract::Query, extract::State, Json};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::LazyLock;

use crate::modules::ApiState;
use topems_shared::ApiResponse;

// ==================== 数据目录类型 ====================

/// 数据目录分类
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum CatalogClassification {
    Public,
    Internal,
    Confidential,
    Restricted,
}

impl CatalogClassification {
    fn label(&self) -> &'static str {
        match self {
            CatalogClassification::Public => "公开",
            CatalogClassification::Internal => "内部",
            CatalogClassification::Confidential => "机密",
            CatalogClassification::Restricted => "受限",
        }
    }
}

/// 数据目录条目
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CatalogEntry {
    pub entry_id: String,
    pub name: String,
    pub domain: String,
    pub description: String,
    pub owner: String,
    pub steward: String,
    pub tags: Vec<String>,
    pub classification: CatalogClassification,
    pub classification_label: String,
    pub source_system: String,
    pub created_at: String,
    pub updated_at: String,
    pub popularity: i64,
    pub quality_score: f64,
}

/// 目录搜索查询
#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct CatalogSearchQuery {
    pub keyword: Option<String>,
    pub domain: Option<String>,
    pub tags: Option<String>,
    pub classification: Option<String>,
    pub owner: Option<String>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

/// 目录分面统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CatalogFacets {
    pub by_domain: HashMap<String, usize>,
    pub by_classification: HashMap<String, usize>,
    pub by_owner: HashMap<String, usize>,
    pub by_tag: HashMap<String, usize>,
}

/// 目录搜索结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CatalogSearchResult {
    pub entries: Vec<CatalogEntry>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
    pub total_pages: i64,
    pub facets: CatalogFacets,
}

/// 目录创建/更新请求
#[derive(Debug, Deserialize)]
pub struct CatalogEntryRequest {
    pub name: String,
    pub domain: String,
    pub description: Option<String>,
    pub owner: Option<String>,
    pub steward: Option<String>,
    pub tags: Option<Vec<String>>,
    pub classification: Option<String>,
    pub source_system: Option<String>,
    pub quality_score: Option<f64>,
}

/// 目录统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CatalogStats {
    pub total_entries: usize,
    pub by_domain: HashMap<String, usize>,
    pub by_classification: HashMap<String, usize>,
    pub avg_quality_score: f64,
    pub total_views: i64,
    pub top_popular: Vec<CatalogEntry>,
}

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct PopularEntriesQuery {
    pub limit: Option<usize>,
}

// ==================== 数据目录存储 ====================

struct DataCatalogStore {
    entries: tokio::sync::Mutex<Vec<CatalogEntry>>,
    initialized: tokio::sync::Mutex<bool>,
}

fn get_catalog_store() -> &'static DataCatalogStore {
    static STORE: LazyLock<DataCatalogStore> = LazyLock::new(|| DataCatalogStore {
        entries: tokio::sync::Mutex::new(Vec::new()),
        initialized: tokio::sync::Mutex::new(false),
    });
    &STORE
}

async fn ensure_catalog_initialized() {
    let store = get_catalog_store();
    let mut initialized = store.initialized.lock().await;
    if *initialized {
        return;
    }
    let now = chrono::Utc::now();
    let rfc = |days_ago: i64| (now - chrono::Duration::days(days_ago)).to_rfc3339();

    let seeds: Vec<(
        &str,
        &str,
        &str,
        &str,
        &str,
        &str,
        CatalogClassification,
        &str,
        i64,
        f64,
        Vec<&str>,
    )> = vec![
        (
            "catalog-001",
            "客户主数据",
            "customer",
            "包含所有客户的基础信息、联系方式与信用等级",
            "销售部",
            "张三",
            CatalogClassification::Confidential,
            "CRM",
            1280,
            88.5,
            vec!["客户", "核心", "crm"],
        ),
        (
            "catalog-002",
            "供应商主数据",
            "supplier",
            "供应商档案、资质与供货范围",
            "采购部",
            "李四",
            CatalogClassification::Internal,
            "SRM",
            860,
            85.0,
            vec!["供应商", "采购"],
        ),
        (
            "catalog-003",
            "物料主数据",
            "material",
            "原材料、半成品、成品物料档案",
            "仓储部",
            "王五",
            CatalogClassification::Internal,
            "ERP",
            2100,
            90.2,
            vec!["物料", "核心"],
        ),
        (
            "catalog-004",
            "产品主数据",
            "product",
            "产品 SKU、规格与售价信息",
            "产品部",
            "赵六",
            CatalogClassification::Public,
            "PIM",
            1540,
            92.0,
            vec!["产品", "pim"],
        ),
        (
            "catalog-005",
            "员工主数据",
            "employee",
            "员工档案、组织归属与岗位信息",
            "人事部",
            "孙七",
            CatalogClassification::Restricted,
            "HRMS",
            320,
            86.5,
            vec!["员工", "敏感"],
        ),
        (
            "catalog-006",
            "组织主数据",
            "organization",
            "组织架构、部门与层级关系",
            "人事部",
            "孙七",
            CatalogClassification::Internal,
            "HRMS",
            410,
            89.0,
            vec!["组织", "架构"],
        ),
        (
            "catalog-007",
            "会计科目",
            "account_subject",
            "会计科目体系与余额方向",
            "财务部",
            "周八",
            CatalogClassification::Confidential,
            "Finance",
            680,
            94.0,
            vec!["财务", "科目"],
        ),
        (
            "catalog-008",
            "销售订单",
            "order",
            "销售订单头与明细数据集",
            "销售部",
            "张三",
            CatalogClassification::Confidential,
            "ERP",
            1850,
            83.5,
            vec!["订单", "销售"],
        ),
    ];

    let mut entries = Vec::new();
    for (i, (id, name, domain, desc, owner, steward, cls, src, pop, qs, tags)) in
        seeds.iter().enumerate()
    {
        entries.push(CatalogEntry {
            entry_id: id.to_string(),
            name: name.to_string(),
            domain: domain.to_string(),
            description: desc.to_string(),
            owner: owner.to_string(),
            steward: steward.to_string(),
            tags: tags.iter().map(|t| t.to_string()).collect(),
            classification: cls.clone(),
            classification_label: cls.label().to_string(),
            source_system: src.to_string(),
            created_at: rfc(90 - i as i64 * 5),
            updated_at: rfc(i as i64 * 3),
            popularity: *pop,
            quality_score: *qs,
        });
    }
    *store.entries.lock().await = entries;
    *initialized = true;
}

fn parse_classification(s: &str) -> Option<CatalogClassification> {
    match s.to_lowercase().as_str() {
        "public" => Some(CatalogClassification::Public),
        "internal" => Some(CatalogClassification::Internal),
        "confidential" => Some(CatalogClassification::Confidential),
        "restricted" => Some(CatalogClassification::Restricted),
        _ => None,
    }
}

/// 搜索数据目录
async fn search_catalog(query: &CatalogSearchQuery) -> CatalogSearchResult {
    ensure_catalog_initialized().await;
    let store = get_catalog_store();
    let entries = store.entries.lock().await.clone();

    let mut filtered: Vec<CatalogEntry> = entries
        .into_iter()
        .filter(|e| {
            if let Some(ref kw) = query.keyword {
                let kw_lower = kw.to_lowercase();
                if !e.name.to_lowercase().contains(&kw_lower)
                    && !e.description.to_lowercase().contains(&kw_lower)
                    && !e.tags.iter().any(|t| t.to_lowercase().contains(&kw_lower))
                {
                    return false;
                }
            }
            if let Some(ref d) = query.domain {
                if &e.domain != d {
                    return false;
                }
            }
            if let Some(ref o) = query.owner {
                if &e.owner != o {
                    return false;
                }
            }
            if let Some(ref c) = query.classification {
                if e.classification_label != *c
                    && format!("{:?}", e.classification).to_lowercase() != c.to_lowercase()
                {
                    return false;
                }
            }
            if let Some(ref t) = query.tags {
                let tags: Vec<&str> = t.split(',').map(|s| s.trim()).collect();
                if !tags.iter().any(|tag| e.tags.iter().any(|et| et == tag)) {
                    return false;
                }
            }
            true
        })
        .collect();

    // 排序
    let sort_by = query.sort_by.as_deref().unwrap_or("popularity");
    let asc = query.sort_order.as_deref().unwrap_or("desc") == "asc";
    match sort_by {
        "name" => filtered.sort_by(|a, b| a.name.cmp(&b.name)),
        "quality_score" => filtered.sort_by(|a, b| {
            a.quality_score
                .partial_cmp(&b.quality_score)
                .unwrap_or(std::cmp::Ordering::Equal)
        }),
        "updated_at" => filtered.sort_by(|a, b| a.updated_at.cmp(&b.updated_at)),
        _ => filtered.sort_by(|a, b| b.popularity.cmp(&a.popularity)),
    }
    if asc {
        filtered.reverse();
    }

    // 分面统计
    let mut by_domain: HashMap<String, usize> = HashMap::new();
    let mut by_classification: HashMap<String, usize> = HashMap::new();
    let mut by_owner: HashMap<String, usize> = HashMap::new();
    let mut by_tag: HashMap<String, usize> = HashMap::new();
    for e in &filtered {
        *by_domain.entry(e.domain.clone()).or_insert(0) += 1;
        *by_classification
            .entry(e.classification_label.clone())
            .or_insert(0) += 1;
        *by_owner.entry(e.owner.clone()).or_insert(0) += 1;
        for t in &e.tags {
            *by_tag.entry(t.clone()).or_insert(0) += 1;
        }
    }

    let total = filtered.len() as i64;
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).clamp(1, 100);
    let total_pages = topems_shared_core::response::total_pages_of(total, page_size);
    let offset = ((page - 1) * page_size) as usize;
    let entries = if offset >= filtered.len() {
        Vec::new()
    } else {
        let end = (offset + page_size as usize).min(filtered.len());
        filtered[offset..end].to_vec()
    };

    CatalogSearchResult {
        entries,
        total,
        page,
        page_size,
        total_pages,
        facets: CatalogFacets {
            by_domain,
            by_classification,
            by_owner,
            by_tag,
        },
    }
}

/// 获取目录条目详情
async fn get_catalog_entry(entry_id: &str) -> Option<CatalogEntry> {
    ensure_catalog_initialized().await;
    let store = get_catalog_store();
    let entries = store.entries.lock().await;
    entries.iter().find(|e| e.entry_id == entry_id).cloned()
}

/// 创建目录条目
async fn create_catalog_entry(req: &CatalogEntryRequest) -> CatalogEntry {
    ensure_catalog_initialized().await;
    let store = get_catalog_store();
    let mut entries = store.entries.lock().await;
    let now = chrono::Utc::now().to_rfc3339();
    let id = format!("catalog-{:03}", entries.len() + 1);
    let cls = req
        .classification
        .as_deref()
        .and_then(parse_classification)
        .unwrap_or(CatalogClassification::Internal);
    let entry = CatalogEntry {
        entry_id: id,
        name: req.name.clone(),
        domain: req.domain.clone(),
        description: req.description.clone().unwrap_or_default(),
        owner: req.owner.clone().unwrap_or_else(|| "未分配".to_string()),
        steward: req.steward.clone().unwrap_or_else(|| "未分配".to_string()),
        tags: req.tags.clone().unwrap_or_default(),
        classification: cls.clone(),
        classification_label: cls.label().to_string(),
        source_system: req
            .source_system
            .clone()
            .unwrap_or_else(|| "未知".to_string()),
        created_at: now.clone(),
        updated_at: now,
        popularity: 0,
        quality_score: req.quality_score.unwrap_or(0.0),
    };
    entries.push(entry.clone());
    entry
}

/// 更新目录条目
async fn update_catalog_entry(entry_id: &str, req: &CatalogEntryRequest) -> Option<CatalogEntry> {
    ensure_catalog_initialized().await;
    let store = get_catalog_store();
    let mut entries = store.entries.lock().await;
    let entry = entries.iter_mut().find(|e| e.entry_id == entry_id)?;
    entry.name = req.name.clone();
    entry.domain = req.domain.clone();
    if let Some(ref desc) = req.description {
        entry.description = desc.clone();
    }
    if let Some(ref owner) = req.owner {
        entry.owner = owner.clone();
    }
    if let Some(ref steward) = req.steward {
        entry.steward = steward.clone();
    }
    if let Some(ref tags) = req.tags {
        entry.tags = tags.clone();
    }
    if let Some(ref cls_str) = req.classification {
        if let Some(cls) = parse_classification(cls_str) {
            entry.classification = cls.clone();
            entry.classification_label = cls.label().to_string();
        }
    }
    if let Some(ref src) = req.source_system {
        entry.source_system = src.clone();
    }
    if let Some(qs) = req.quality_score {
        entry.quality_score = qs;
    }
    entry.updated_at = chrono::Utc::now().to_rfc3339();
    Some(entry.clone())
}

/// 删除目录条目
async fn delete_catalog_entry(entry_id: &str) -> bool {
    ensure_catalog_initialized().await;
    let store = get_catalog_store();
    let mut entries = store.entries.lock().await;
    let before = entries.len();
    entries.retain(|e| e.entry_id != entry_id);
    entries.len() < before
}

/// 获取目录统计
async fn get_catalog_stats() -> CatalogStats {
    ensure_catalog_initialized().await;
    let store = get_catalog_store();
    let entries = store.entries.lock().await.clone();

    let mut by_domain: HashMap<String, usize> = HashMap::new();
    let mut by_classification: HashMap<String, usize> = HashMap::new();
    let mut total_views = 0i64;
    let mut quality_sum = 0.0;
    for e in &entries {
        *by_domain.entry(e.domain.clone()).or_insert(0) += 1;
        *by_classification
            .entry(e.classification_label.clone())
            .or_insert(0) += 1;
        total_views += e.popularity;
        quality_sum += e.quality_score;
    }
    let avg_quality_score = if entries.is_empty() {
        0.0
    } else {
        (quality_sum / entries.len() as f64 * 10.0).round() / 10.0
    };
    let mut sorted = entries.clone();
    sorted.sort_by(|a, b| b.popularity.cmp(&a.popularity));
    sorted.truncate(5);

    CatalogStats {
        total_entries: entries.len(),
        by_domain,
        by_classification,
        avg_quality_score,
        total_views,
        top_popular: sorted,
    }
}

/// 获取热门条目
async fn get_popular_entries(limit: usize) -> Vec<CatalogEntry> {
    ensure_catalog_initialized().await;
    let store = get_catalog_store();
    let mut entries = store.entries.lock().await.clone();
    entries.sort_by(|a, b| b.popularity.cmp(&a.popularity));
    entries.truncate(limit);
    entries
}

// ==================== 数据目录 Handlers ====================

/// GET /catalog/search — 搜索数据目录
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/master-data-refs/search-catalog-handler",
    tag = "MasterDataRefs",
    operation_id = "search_catalog_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn search_catalog_handler(
    State(state): State<ApiState>,
    Query(params): Query<CatalogSearchQuery>,
) -> Json<ApiResponse<CatalogSearchResult>> {
    let _ = &state;
    let result = search_catalog(&params).await;
    Json(ApiResponse::success(result, "数据目录搜索成功"))
}

/// GET /catalog/{entry_id} — 获取目录条目详情
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/api/erp/master-data-refs/catalog/{entry_id}",
    tag = "Master Data",
    operation_id = "get_catalog_entry_handler",
    responses((status = 200, description = "OK")),
)]
pub async fn get_catalog_entry_handler(
    State(state): State<ApiState>,
    Path(entry_id): Path<String>,
) -> Json<ApiResponse<CatalogEntry>> {
    let _ = &state;
    match get_catalog_entry(&entry_id).await {
        Some(entry) => Json(ApiResponse::success(entry, "目录条目获取成功")),
        None => Json(ApiResponse::error(404, "未找到目录条目")),
    }
}

/// POST /catalog — 创建目录条目
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:master-data:write"])),
    path = "/api/erp/master-data-refs/catalog",
    tag = "Master Data",
    operation_id = "create_catalog_entry_handler",
    responses((status = 200, description = "OK")),
)]
pub async fn create_catalog_entry_handler(
    State(state): State<ApiState>,
    Json(req): Json<CatalogEntryRequest>,
) -> Json<ApiResponse<CatalogEntry>> {
    let _ = &state;
    let entry = create_catalog_entry(&req).await;
    Json(ApiResponse::success(entry, "目录条目创建成功"))
}

/// PUT /catalog/{entry_id} — 更新目录条目
#[utoipa::path(
    put,
    security(("BearerAuth" = ["erp:update"])),
    path = "/api/erp/master-data-refs/catalog/{entry_id}",
    tag = "Master Data",
    operation_id = "update_catalog_entry_handler",
    responses((status = 200, description = "OK")),
)]
pub async fn update_catalog_entry_handler(
    State(state): State<ApiState>,
    Path(entry_id): Path<String>,
    Json(req): Json<CatalogEntryRequest>,
) -> Json<ApiResponse<CatalogEntry>> {
    let _ = &state;
    match update_catalog_entry(&entry_id, &req).await {
        Some(entry) => Json(ApiResponse::success(entry, "目录条目更新成功")),
        None => Json(ApiResponse::error(404, "未找到目录条目")),
    }
}

/// DELETE /catalog/{entry_id} — 删除目录条目
#[utoipa::path(
    delete,
    security(("BearerAuth" = ["erp:delete"])),
    path = "/api/erp/master-data-refs/catalog/{entry_id}",
    tag = "Master Data",
    operation_id = "delete_catalog_entry_handler",
    responses((status = 200, description = "OK")),
)]
pub async fn delete_catalog_entry_handler(
    State(state): State<ApiState>,
    Path(entry_id): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    let _ = &state;
    if delete_catalog_entry(&entry_id).await {
        Json(ApiResponse::success(
            serde_json::json!({ "entry_id": entry_id, "deleted": true }),
            "目录条目删除成功",
        ))
    } else {
        Json(ApiResponse::error(404, "未找到目录条目"))
    }
}

/// GET /catalog/stats — 获取目录统计
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/api/erp/master-data-refs/catalog/stats",
    tag = "Master Data",
    operation_id = "get_catalog_stats_handler",
    responses((status = 200, description = "OK")),
)]
pub async fn get_catalog_stats_handler(
    State(state): State<ApiState>,
) -> Json<ApiResponse<CatalogStats>> {
    let _ = &state;
    let stats = get_catalog_stats().await;
    Json(ApiResponse::success(stats, "目录统计获取成功"))
}

/// GET /catalog/popular — 获取热门条目
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/master-data-refs/get-popular-entries-handler",
    tag = "MasterDataRefs",
    operation_id = "get_popular_entries_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_popular_entries_handler(
    State(state): State<ApiState>,
    Query(params): Query<PopularEntriesQuery>,
) -> Json<ApiResponse<Vec<CatalogEntry>>> {
    let _ = &state;
    let limit = params.limit.unwrap_or(10).min(50);
    let entries = get_popular_entries(limit).await;
    Json(ApiResponse::success(entries, "热门条目获取成功"))
}

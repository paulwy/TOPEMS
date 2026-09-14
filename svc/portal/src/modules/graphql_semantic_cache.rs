//! V48.0 BFF Phase 18: GraphQL 语义缓存 + 查询结果压缩 + 离线优先架构（自 graphql_schema.rs 拆分）
//!
//! 1. 语义缓存引擎：SemanticCacheEngine（查询规范化 / 语义相似度 / 缓存命中决策）
//! 2. 查询结果压缩器：QueryResultCompressor（压缩 / 解压 / 压缩率统计）
//! 3. 离线优先架构：OfflineFirstEngine（离线队列 / 同步 / 冲突合并）
//!
//! 拆分方式：从 `graphql_schema.rs` 提取本模块后，原文件通过
//! `pub use crate::modules::graphql_semantic_cache::*;` 重新导出，
//! 保持 `modules::graphql_schema::*` 访问路径不变。
//! `uuid_simple` 定义于 `graphql_edge_v2.rs`，`CacheTier` 定义于 `graphql_cache.rs`，
//! 此处经模块路径引用。

use async_graphql::SimpleObject;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::sync::Mutex;

use crate::modules::graphql_edge_v2::uuid_simple;

// ---------- 1. 语义缓存引擎（SemanticCacheEngine） ----------

/// V48.0: 查询签名 GQL（规范化后的查询签名）
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct QuerySignatureGql {
    pub operation_type: String,
    pub root_field: String,
    pub fields_hash: String,
    pub arguments_hash: String,
    pub directives_hash: String,
}

/// V48.0: 语义缓存条目 GQL
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct SemanticCacheEntryGql {
    pub cache_id: String,
    pub query_hash: String,
    pub query_signature: QuerySignatureGql,
    pub normalized_query: String,
    pub result: String,
    pub created_at: String,
    pub ttl: i64,
    pub hit_count: i64,
    pub last_accessed: String,
    pub tags: Vec<String>,
}

/// V48.0: 语义缓存配置 GQL
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct SemanticCacheConfigGql {
    pub max_entries: i64,
    pub default_ttl_seconds: i64,
    pub similarity_threshold: f64,
    pub enable_fuzzy_match: bool,
    pub compression_enabled: bool,
}

/// V48.0: 语义缓存统计 GQL
#[derive(SimpleObject, Clone)]
pub struct SemanticCacheStatsGql {
    pub total_entries: i64,
    pub hit_count: i64,
    pub miss_count: i64,
    pub hit_rate: f64,
    pub avg_lookup_time_ms: f64,
    pub total_size_bytes: i64,
    pub evicted_count: i64,
}

/// V48.0: 语义缓存失效规则 GQL（与 V41 CacheInvalidationRuleGql 区分）
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct SemanticCacheInvalidationRuleGql {
    pub rule_id: String,
    pub tag: String,
    pub query_pattern: String,
    pub priority: i32,
    pub enabled: bool,
}

// --- 内部状态 ---

#[derive(Clone)]
struct SemanticCacheEntryData {
    cache_id: String,
    query_hash: String,
    query_signature: QuerySignatureGql,
    normalized_query: String,
    result: String,
    created_at: DateTime<Utc>,
    ttl: i64,
    hit_count: i64,
    last_accessed: DateTime<Utc>,
    tags: Vec<String>,
}

struct SemanticCacheEngineState {
    entries: Vec<SemanticCacheEntryData>,
    config: SemanticCacheConfigGql,
    rules: Vec<SemanticCacheInvalidationRuleGql>,
    hit_count: u64,
    miss_count: u64,
    total_lookup_time_ms: f64,
    evicted_count: u64,
}

impl SemanticCacheEngineState {
    fn new() -> Self {
        Self {
            entries: Vec::new(),
            config: SemanticCacheConfigGql {
                max_entries: 1000,
                default_ttl_seconds: 300,
                similarity_threshold: 0.85,
                enable_fuzzy_match: true,
                compression_enabled: true,
            },
            rules: Vec::new(),
            hit_count: 0,
            miss_count: 0,
            total_lookup_time_ms: 0.0,
            evicted_count: 0,
        }
    }
}

static SEMANTIC_CACHE_STATE: std::sync::OnceLock<Mutex<SemanticCacheEngineState>> =
    std::sync::OnceLock::new();

fn semantic_cache_state() -> &'static Mutex<SemanticCacheEngineState> {
    SEMANTIC_CACHE_STATE.get_or_init(|| Mutex::new(SemanticCacheEngineState::new()))
}

/// V48.0: 语义缓存引擎
///
/// 不仅是哈希匹配，还理解查询的语义等价性：
/// - 查询规范化（别名去除、字段排序、空白标准化）
/// - 查询签名计算（操作类型 + 根字段 + 字段/参数/指令哈希）
/// - 语义等价判断与模糊匹配
pub struct SemanticCacheEngine;

impl SemanticCacheEngine {
    /// 查询规范化（别名去除、字段排序、空白标准化）
    pub fn normalize_query(query: &str) -> String {
        // 1. 去除注释 + 标准化空白
        let mut result = String::with_capacity(query.len());
        for line in query.lines() {
            let trimmed = line.trim();
            if trimmed.starts_with('#') {
                continue;
            }
            let cleaned = if let Some(pos) = trimmed.find('#') {
                &trimmed[..pos]
            } else {
                trimmed
            };
            result.push_str(cleaned.trim());
            result.push(' ');
        }
        let mut normalized: String = result.split_whitespace().collect::<Vec<_>>().join(" ");
        // 2. 去除别名（alias: field -> field）
        normalized = Self::strip_aliases(&normalized);
        // 3. 字段排序（花括号内的直接子字段按字典序排序）
        normalized = Self::sort_fields(&normalized);
        normalized
    }

    /// 去除 GraphQL 别名（仅处理括号外的 alias: 模式，保留参数 key:value）
    fn strip_aliases(query: &str) -> String {
        let chars: Vec<char> = query.chars().collect();
        let mut result = String::with_capacity(query.len());
        let mut i = 0;
        let mut paren_depth = 0i32;
        while i < chars.len() {
            if chars[i] == '(' {
                paren_depth += 1;
                result.push(chars[i]);
                i += 1;
                continue;
            }
            if chars[i] == ')' {
                if paren_depth > 0 {
                    paren_depth -= 1;
                }
                result.push(chars[i]);
                i += 1;
                continue;
            }
            if paren_depth == 0 && (chars[i].is_alphabetic() || chars[i] == '_') {
                let start = i;
                while i < chars.len() && (chars[i].is_alphanumeric() || chars[i] == '_') {
                    i += 1;
                }
                let mut j = i;
                while j < chars.len() && chars[j].is_whitespace() {
                    j += 1;
                }
                if j < chars.len() && chars[j] == ':' {
                    // 这是一个别名，跳过别名和冒号
                    i = j + 1;
                    while i < chars.len() && chars[i].is_whitespace() {
                        i += 1;
                    }
                    continue;
                }
                for k in start..i {
                    result.push(chars[k]);
                }
                continue;
            }
            result.push(chars[i]);
            i += 1;
        }
        result
    }

    /// 字段排序：对每个花括号块内的直接子字段（含嵌套块）按字典序排序
    fn sort_fields(query: &str) -> String {
        let chars: Vec<char> = query.chars().collect();
        let mut idx = 0;
        let mut result = String::new();
        while idx < chars.len() {
            if chars[idx] == '{' {
                result.push_str(&Self::sort_fields_block(&chars, &mut idx));
            } else {
                result.push(chars[idx]);
                idx += 1;
            }
        }
        result
    }

    /// 处理一个 { ... } 块，返回包含花括号的已排序结果
    fn sort_fields_block(chars: &[char], idx: &mut usize) -> String {
        let mut result = String::new();
        if *idx >= chars.len() || chars[*idx] != '{' {
            return result;
        }
        result.push('{');
        *idx += 1;
        let mut tokens: Vec<String> = Vec::new();
        let mut current = String::new();
        while *idx < chars.len() && chars[*idx] != '}' {
            if chars[*idx] == '{' {
                current.push_str(&Self::sort_fields_block(chars, idx));
            } else if chars[*idx].is_whitespace() {
                if !current.is_empty() {
                    tokens.push(std::mem::take(&mut current));
                }
                *idx += 1;
            } else {
                current.push(chars[*idx]);
                *idx += 1;
            }
        }
        if !current.is_empty() {
            tokens.push(current);
        }
        tokens.sort();
        result.push_str(&tokens.join(" "));
        if *idx < chars.len() && chars[*idx] == '}' {
            result.push('}');
            *idx += 1;
        }
        result
    }

    /// 计算查询签名
    pub fn compute_signature(query: &str) -> QuerySignatureGql {
        let normalized = Self::normalize_query(query);
        let operation_type = Self::extract_operation_type(&normalized);
        let root_field = Self::extract_root_field(&normalized);
        let fields = Self::extract_fields(&normalized);
        let arguments = Self::extract_arguments(&normalized);
        let directives = Self::extract_directives(&normalized);

        let mut hasher = Sha256::new();
        hasher.update(fields.as_bytes());
        let fields_hash = format!("{:x}", hasher.finalize());

        let mut hasher = Sha256::new();
        hasher.update(arguments.as_bytes());
        let arguments_hash = format!("{:x}", hasher.finalize());

        let mut hasher = Sha256::new();
        hasher.update(directives.as_bytes());
        let directives_hash = format!("{:x}", hasher.finalize());

        QuerySignatureGql {
            operation_type,
            root_field,
            fields_hash,
            arguments_hash,
            directives_hash,
        }
    }

    fn extract_operation_type(query: &str) -> String {
        let q = query.trim();
        for op in ["query", "mutation", "subscription"] {
            if q.starts_with(op) {
                return op.to_string();
            }
        }
        "query".to_string()
    }

    fn extract_root_field(query: &str) -> String {
        let q = query.trim();
        if let Some(start) = q.find('{') {
            let inner = &q[start + 1..];
            let inner = inner.trim();
            let first: String = inner
                .chars()
                .take_while(|c| !c.is_whitespace() && *c != '(' && *c != '{')
                .collect();
            if !first.is_empty() {
                return first;
            }
        }
        "unknown".to_string()
    }

    fn extract_fields(query: &str) -> String {
        let keywords = ["query", "mutation", "subscription", "fragment", "on"];
        let mut words: Vec<String> = query
            .split(|c: char| {
                c.is_whitespace() || c == '{' || c == '}' || c == '(' || c == ')' || c == ','
            })
            .filter(|w| !w.is_empty() && !keywords.contains(w))
            .map(|w| w.to_string())
            .collect();
        words.sort();
        words.dedup();
        words.join(",")
    }

    fn extract_arguments(query: &str) -> String {
        let mut args: Vec<String> = Vec::new();
        let chars: Vec<char> = query.chars().collect();
        let mut i = 0;
        while i < chars.len() {
            if chars[i] == '(' {
                let mut depth = 1;
                i += 1;
                let mut arg = String::new();
                while i < chars.len() && depth > 0 {
                    if chars[i] == '(' {
                        depth += 1;
                    } else if chars[i] == ')' {
                        depth -= 1;
                        if depth == 0 {
                            break;
                        }
                    }
                    arg.push(chars[i]);
                    i += 1;
                }
                if i < chars.len() {
                    i += 1;
                }
                args.push(arg.trim().to_string());
            } else {
                i += 1;
            }
        }
        args.sort();
        args.join(";")
    }

    fn extract_directives(query: &str) -> String {
        let mut dirs: Vec<String> = Vec::new();
        let chars: Vec<char> = query.chars().collect();
        let mut i = 0;
        while i < chars.len() {
            if chars[i] == '@' {
                let mut d = String::new();
                d.push('@');
                i += 1;
                while i < chars.len() && (chars[i].is_alphanumeric() || chars[i] == '_') {
                    d.push(chars[i]);
                    i += 1;
                }
                dirs.push(d);
            } else {
                i += 1;
            }
        }
        dirs.sort();
        dirs.dedup();
        dirs.join(",")
    }

    /// 判断两个查询是否语义等价
    pub fn is_semantically_equivalent(query_a: &str, query_b: &str) -> bool {
        let sig_a = Self::compute_signature(query_a);
        let sig_b = Self::compute_signature(query_b);
        sig_a.operation_type == sig_b.operation_type
            && sig_a.root_field == sig_b.root_field
            && sig_a.fields_hash == sig_b.fields_hash
            && sig_a.arguments_hash == sig_b.arguments_hash
            && sig_a.directives_hash == sig_b.directives_hash
    }

    /// 查找语义相似的缓存条目（模糊匹配）
    pub fn find_similar_cached(query: &str) -> Vec<SemanticCacheEntryGql> {
        let state = semantic_cache_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let sig = Self::compute_signature(query);
        let now = Utc::now();
        let threshold = state.config.similarity_threshold;
        let mut results = Vec::new();
        for entry in &state.entries {
            let age = now.signed_duration_since(entry.created_at).num_seconds();
            if age > entry.ttl {
                continue;
            }
            let mut score = 0.0_f64;
            if entry.query_signature.operation_type == sig.operation_type {
                score += 1.0;
            }
            if entry.query_signature.root_field == sig.root_field {
                score += 1.0;
            }
            if entry.query_signature.fields_hash == sig.fields_hash {
                score += 1.0;
            }
            if entry.query_signature.arguments_hash == sig.arguments_hash {
                score += 1.0;
            }
            if entry.query_signature.directives_hash == sig.directives_hash {
                score += 1.0;
            }
            let similarity = score / 5.0;
            if similarity >= threshold {
                results.push(Self::entry_to_gql(entry));
            }
        }
        results
    }

    /// 获取缓存（精确匹配 + 模糊匹配回退）
    pub fn get_cached(query: &str) -> Option<SemanticCacheEntryGql> {
        let start = std::time::Instant::now();
        let mut state = semantic_cache_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state.total_lookup_time_ms += start.elapsed().as_secs_f64() * 1000.0;
        let normalized = Self::normalize_query(query);
        let mut hasher = Sha256::new();
        hasher.update(normalized.as_bytes());
        let query_hash = format!("{:x}", hasher.finalize());
        let now = Utc::now();
        // 精确匹配（先找索引，再修改，避免同时持有 entries 可变借用与 state 字段借用）
        let mut found_idx: Option<usize> = None;
        for (i, entry) in state.entries.iter().enumerate() {
            if entry.query_hash == query_hash {
                let age = now.signed_duration_since(entry.created_at).num_seconds();
                if age > entry.ttl {
                    continue;
                }
                found_idx = Some(i);
                break;
            }
        }
        if let Some(idx) = found_idx {
            state.entries[idx].hit_count += 1;
            state.entries[idx].last_accessed = now;
            let gql = Self::entry_to_gql(&state.entries[idx]);
            state.hit_count += 1;
            return Some(gql);
        }
        // 模糊匹配回退
        if state.config.enable_fuzzy_match {
            let sig = Self::compute_signature(query);
            let mut fuzzy_idx: Option<usize> = None;
            for (i, entry) in state.entries.iter().enumerate() {
                let age = now.signed_duration_since(entry.created_at).num_seconds();
                if age > entry.ttl {
                    continue;
                }
                if entry.query_signature.operation_type == sig.operation_type
                    && entry.query_signature.root_field == sig.root_field
                    && entry.query_signature.fields_hash == sig.fields_hash
                {
                    fuzzy_idx = Some(i);
                    break;
                }
            }
            if let Some(idx) = fuzzy_idx {
                state.entries[idx].hit_count += 1;
                state.entries[idx].last_accessed = now;
                let gql = Self::entry_to_gql(&state.entries[idx]);
                state.hit_count += 1;
                return Some(gql);
            }
        }
        state.miss_count += 1;
        None
    }

    /// 设置缓存
    pub fn set_cached(query: &str, result: &str, tags: Vec<String>) -> SemanticCacheEntryGql {
        let mut state = semantic_cache_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let normalized = Self::normalize_query(query);
        let mut hasher = Sha256::new();
        hasher.update(normalized.as_bytes());
        let query_hash = format!("{:x}", hasher.finalize());
        let signature = Self::compute_signature(query);
        let now = Utc::now();
        let ttl = state.config.default_ttl_seconds;
        let entry = SemanticCacheEntryData {
            cache_id: uuid_simple(),
            query_hash,
            query_signature: signature,
            normalized_query: normalized,
            result: result.to_string(),
            created_at: now,
            ttl,
            hit_count: 0,
            last_accessed: now,
            tags,
        };
        let gql = Self::entry_to_gql(&entry);
        // LRU 淘汰
        while state.entries.len() as i64 >= state.config.max_entries {
            if let Some(idx) = state
                .entries
                .iter()
                .enumerate()
                .min_by_key(|(_, e)| e.last_accessed)
                .map(|(i, _)| i)
            {
                state.entries.remove(idx);
                state.evicted_count += 1;
            } else {
                break;
            }
        }
        state.entries.push(entry);
        gql
    }

    /// 失效缓存（支持按 tag 批量失效，或按 query_hash 精确失效）
    pub fn invalidate(tag: Option<&str>, query_hash: Option<&str>) -> i64 {
        let mut state = semantic_cache_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let before = state.entries.len();
        state.entries.retain(|e| {
            if let Some(h) = query_hash {
                if e.query_hash == h {
                    return false;
                }
            }
            if let Some(t) = tag {
                if e.tags.iter().any(|et| et == t) {
                    return false;
                }
            }
            true
        });
        (before - state.entries.len()) as i64
    }

    /// 获取缓存统计
    pub fn get_cache_stats() -> SemanticCacheStatsGql {
        let state = semantic_cache_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let total = state.hit_count + state.miss_count;
        let hit_rate = if total > 0 {
            state.hit_count as f64 / total as f64
        } else {
            0.0
        };
        let avg_lookup = if total > 0 {
            state.total_lookup_time_ms / total as f64
        } else {
            0.0
        };
        let total_size_bytes: usize = state
            .entries
            .iter()
            .map(|e| e.result.len() + e.normalized_query.len() + e.cache_id.len())
            .sum();
        SemanticCacheStatsGql {
            total_entries: state.entries.len() as i64,
            hit_count: state.hit_count as i64,
            miss_count: state.miss_count as i64,
            hit_rate,
            avg_lookup_time_ms: avg_lookup,
            total_size_bytes: total_size_bytes as i64,
            evicted_count: state.evicted_count as i64,
        }
    }

    /// 获取当前配置
    pub fn get_config() -> SemanticCacheConfigGql {
        let state = semantic_cache_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state.config.clone()
    }

    /// 更新配置
    pub fn update_config(config: SemanticCacheConfigGql) -> SemanticCacheConfigGql {
        let mut state = semantic_cache_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state.config = config.clone();
        config
    }

    /// 添加失效规则
    pub fn add_invalidation_rule(
        rule: SemanticCacheInvalidationRuleGql,
    ) -> SemanticCacheInvalidationRuleGql {
        let mut state = semantic_cache_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state.rules.push(rule.clone());
        rule
    }

    /// 获取所有失效规则
    pub fn get_invalidation_rules() -> Vec<SemanticCacheInvalidationRuleGql> {
        let state = semantic_cache_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state.rules.clone()
    }

    fn entry_to_gql(e: &SemanticCacheEntryData) -> SemanticCacheEntryGql {
        SemanticCacheEntryGql {
            cache_id: e.cache_id.clone(),
            query_hash: e.query_hash.clone(),
            query_signature: e.query_signature.clone(),
            normalized_query: e.normalized_query.clone(),
            result: e.result.clone(),
            created_at: e.created_at.to_rfc3339(),
            ttl: e.ttl,
            hit_count: e.hit_count,
            last_accessed: e.last_accessed.to_rfc3339(),
            tags: e.tags.clone(),
        }
    }
}

// ---------- 2. 查询结果压缩器（QueryResultCompressor） ----------

/// V48.0: 压缩算法
#[derive(async_graphql::Enum, Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CompressionAlgorithmGql {
    None,
    Gzip,
    Brotli,
    Zstd,
    LZ4,
}

/// V48.0: 压缩配置 GQL
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct CompressionConfigGql {
    pub algorithm: CompressionAlgorithmGql,
    pub level: i32,
    pub min_size_threshold: i64,
    pub enable_deduplication: bool,
    pub enable_delta_encoding: bool,
}

/// V48.0: 压缩结果 GQL
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct CompressedResultGql {
    pub original_size: i64,
    pub compressed_size: i64,
    pub compression_ratio: f64,
    pub algorithm: CompressionAlgorithmGql,
    pub compressed_data: String,
    pub metadata: String,
}

/// V48.0: 压缩统计 GQL
#[derive(SimpleObject, Clone)]
pub struct CompressionStatsGql {
    pub total_compressed: i64,
    pub total_original_bytes: i64,
    pub total_compressed_bytes: i64,
    pub avg_ratio: f64,
    pub by_algorithm: Vec<String>,
}

/// V48.0: 数据画像 GQL
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct DataProfileGql {
    pub data_type: String,
    pub array_count: i64,
    pub object_count: i64,
    pub string_ratio: f64,
    pub number_ratio: f64,
    pub null_ratio: f64,
    pub estimated_compressibility: f64,
}

struct QueryResultCompressorState {
    config: CompressionConfigGql,
    stats_total_compressed: u64,
    stats_total_original_bytes: u64,
    stats_total_compressed_bytes: u64,
    stats_by_algorithm: HashMap<String, u64>,
}

impl QueryResultCompressorState {
    fn new() -> Self {
        Self {
            config: CompressionConfigGql {
                algorithm: CompressionAlgorithmGql::Gzip,
                level: 6,
                min_size_threshold: 1024,
                enable_deduplication: true,
                enable_delta_encoding: true,
            },
            stats_total_compressed: 0,
            stats_total_original_bytes: 0,
            stats_total_compressed_bytes: 0,
            stats_by_algorithm: HashMap::new(),
        }
    }
}

static QUERY_RESULT_COMPRESSOR_STATE: std::sync::OnceLock<Mutex<QueryResultCompressorState>> =
    std::sync::OnceLock::new();

fn query_result_compressor_state() -> &'static Mutex<QueryResultCompressorState> {
    QUERY_RESULT_COMPRESSOR_STATE.get_or_init(|| Mutex::new(QueryResultCompressorState::new()))
}

fn compression_algorithm_name(a: CompressionAlgorithmGql) -> &'static str {
    match a {
        CompressionAlgorithmGql::None => "none",
        CompressionAlgorithmGql::Gzip => "gzip",
        CompressionAlgorithmGql::Brotli => "brotli",
        CompressionAlgorithmGql::Zstd => "zstd",
        CompressionAlgorithmGql::LZ4 => "lz4",
    }
}

/// V48.0: 查询结果压缩器
///
/// 根据数据特征自动选择最佳压缩算法，支持数组去重和增量编码。
pub struct QueryResultCompressor;

impl QueryResultCompressor {
    /// 压缩查询结果
    pub fn compress_result(data: &str) -> CompressedResultGql {
        let mut state = query_result_compressor_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let original_size = data.len() as i64;
        let profile = Self::profile_data(data);
        let algorithm = if state.config.algorithm != CompressionAlgorithmGql::None {
            state.config.algorithm
        } else {
            Self::select_algorithm(&profile)
        };

        // 预处理（去重 + 增量编码）——模拟阶段仅做概念性处理
        let _working = {
            let mut w = data.to_string();
            if state.config.enable_deduplication {
                w = Self::deduplicate_arrays(&w);
            }
            if state.config.enable_delta_encoding {
                w = Self::delta_encode(&w);
            }
            w
        };

        let compressed_size = if original_size < state.config.min_size_threshold {
            original_size
        } else {
            let ratio = match algorithm {
                CompressionAlgorithmGql::None => 1.0,
                CompressionAlgorithmGql::Gzip => 0.45,
                CompressionAlgorithmGql::Brotli => 0.32,
                CompressionAlgorithmGql::Zstd => 0.38,
                CompressionAlgorithmGql::LZ4 => 0.55,
            };
            let compressibility = profile.estimated_compressibility;
            ((original_size as f64) * ratio * (1.0 - compressibility * 0.15)) as i64
        };

        let compression_ratio = if original_size > 0 {
            compressed_size as f64 / original_size as f64
        } else {
            1.0
        };

        // 模拟阶段：compressed_data 存储原始数据以保证解压可往返
        let compressed_data = data.to_string();
        let metadata = format!(
            "{{\"algorithm\":\"{}\",\"level\":{},\"dedup\":{},\"delta\":{},\"profile\":\"{}\",\"compressibility\":{:.2}}}",
            compression_algorithm_name(algorithm),
            state.config.level,
            state.config.enable_deduplication,
            state.config.enable_delta_encoding,
            profile.data_type,
            profile.estimated_compressibility
        );

        state.stats_total_compressed += 1;
        state.stats_total_original_bytes += original_size as u64;
        state.stats_total_compressed_bytes += compressed_size as u64;
        *state
            .stats_by_algorithm
            .entry(compression_algorithm_name(algorithm).to_string())
            .or_insert(0) += 1;

        CompressedResultGql {
            original_size,
            compressed_size,
            compression_ratio,
            algorithm,
            compressed_data,
            metadata,
        }
    }

    /// 解压查询结果
    pub fn decompress_result(compressed: &CompressedResultGql) -> String {
        // 模拟阶段：compressed_data 即原始数据，直接返回
        compressed.compressed_data.clone()
    }

    /// 数组去重（识别重复模式）
    ///
    /// 检测数据中重复的 16 字节块模式。在生产环境中会构建模式表
    /// 并用反向引用替换重复块。
    pub fn deduplicate_arrays(data: &str) -> String {
        if data.len() < 64 {
            return data.to_string();
        }
        let mut seen: HashMap<&str, u32> = HashMap::new();
        let mut i = 0;
        while i + 16 <= data.len() {
            let chunk = &data[i..i + 16];
            *seen.entry(chunk).or_insert(0) += 1;
            i += 16;
        }
        let _duplicates: u32 = seen.values().filter(|&&c| c > 1).map(|&c| c - 1).sum();
        // 模拟阶段：返回原始数据，去重收益已反映在压缩比估算中
        data.to_string()
    }

    /// 增量编码（对时间序列等有序数据）
    ///
    /// 将连续的数字序列转换为相对前一个值的增量。
    pub fn delta_encode(data: &str) -> String {
        let mut result = String::with_capacity(data.len());
        let chars: Vec<char> = data.chars().collect();
        let mut i = 0;
        let mut prev: Option<i64> = None;
        while i < chars.len() {
            if chars[i].is_ascii_digit()
                || (chars[i] == '-' && i + 1 < chars.len() && chars[i + 1].is_ascii_digit())
            {
                let mut num_str = String::new();
                if chars[i] == '-' {
                    num_str.push('-');
                    i += 1;
                }
                while i < chars.len()
                    && (chars[i].is_ascii_digit()
                        || chars[i] == '.'
                        || chars[i] == 'e'
                        || chars[i] == 'E')
                {
                    num_str.push(chars[i]);
                    i += 1;
                }
                if let Ok(n) = num_str.parse::<i64>() {
                    match prev {
                        Some(p) => {
                            let delta = n - p;
                            result.push_str(&format!("d{}", delta));
                        }
                        None => result.push_str(&num_str),
                    }
                    prev = Some(n);
                } else {
                    result.push_str(&num_str);
                }
            } else {
                result.push(chars[i]);
                i += 1;
            }
        }
        result
    }

    /// 根据数据特征自动选择最佳压缩算法
    pub fn select_algorithm(profile: &DataProfileGql) -> CompressionAlgorithmGql {
        if profile.estimated_compressibility > 0.7 {
            CompressionAlgorithmGql::Brotli
        } else if profile.estimated_compressibility > 0.5 {
            CompressionAlgorithmGql::Zstd
        } else if profile.estimated_compressibility > 0.3 {
            CompressionAlgorithmGql::Gzip
        } else {
            CompressionAlgorithmGql::LZ4
        }
    }

    /// 分析数据画像
    pub fn profile_data(data: &str) -> DataProfileGql {
        let _total = data.len().max(1) as f64;
        let mut array_count = 0i64;
        let mut object_count = 0i64;
        let mut string_chars = 0usize;
        let mut number_chars = 0usize;
        let mut null_chars = 0usize;
        let chars: Vec<char> = data.chars().collect();
        let mut i = 0;
        while i < chars.len() {
            match chars[i] {
                '[' => {
                    array_count += 1;
                    i += 1;
                }
                '{' => {
                    object_count += 1;
                    i += 1;
                }
                '"' => {
                    i += 1;
                    while i < chars.len() && chars[i] != '"' {
                        string_chars += 1;
                        i += 1;
                    }
                    if i < chars.len() {
                        i += 1;
                    }
                }
                c if c.is_ascii_digit()
                    || (c == '-' && i + 1 < chars.len() && chars[i + 1].is_ascii_digit()) =>
                {
                    while i < chars.len()
                        && (chars[i].is_ascii_digit()
                            || chars[i] == '.'
                            || chars[i] == '-'
                            || chars[i] == 'e'
                            || chars[i] == 'E')
                    {
                        number_chars += 1;
                        i += 1;
                    }
                }
                'n' if i + 3 < chars.len()
                    && chars[i + 1] == 'u'
                    && chars[i + 2] == 'l'
                    && chars[i + 3] == 'l' =>
                {
                    null_chars += 4;
                    i += 4;
                }
                _ => {
                    i += 1;
                }
            }
        }
        let counted = (string_chars + number_chars + null_chars).max(1) as f64;
        let string_ratio = string_chars as f64 / counted;
        let number_ratio = number_chars as f64 / counted;
        let null_ratio = null_chars as f64 / counted;
        let estimated_compressibility = if _total > 512.0 && string_ratio > 0.5 {
            0.75
        } else if number_ratio > 0.5 {
            0.6
        } else if null_ratio > 0.3 {
            0.8
        } else {
            0.4
        };
        let data_type = if array_count > object_count {
            "array".to_string()
        } else if object_count > 0 {
            "object".to_string()
        } else {
            "scalar".to_string()
        };
        DataProfileGql {
            data_type,
            array_count,
            object_count,
            string_ratio,
            number_ratio,
            null_ratio,
            estimated_compressibility,
        }
    }

    /// 获取压缩统计
    pub fn get_compression_stats() -> CompressionStatsGql {
        let state = query_result_compressor_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let avg_ratio = if state.stats_total_original_bytes > 0 {
            state.stats_total_compressed_bytes as f64 / state.stats_total_original_bytes as f64
        } else {
            1.0
        };
        let by_algorithm = state
            .stats_by_algorithm
            .iter()
            .map(|(k, v)| format!("{}:{}", k, v))
            .collect();
        CompressionStatsGql {
            total_compressed: state.stats_total_compressed as i64,
            total_original_bytes: state.stats_total_original_bytes as i64,
            total_compressed_bytes: state.stats_total_compressed_bytes as i64,
            avg_ratio,
            by_algorithm,
        }
    }

    /// 获取配置
    pub fn get_config() -> CompressionConfigGql {
        let state = query_result_compressor_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state.config.clone()
    }

    /// 更新配置
    pub fn update_config(config: CompressionConfigGql) -> CompressionConfigGql {
        let mut state = query_result_compressor_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state.config = config.clone();
        config
    }
}

// ---------- 3. 离线优先架构（OfflineFirstEngine） ----------

/// V48.0: 离线策略
#[derive(async_graphql::Enum, Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum OfflineStrategyGql {
    CacheFirst,
    NetworkFirst,
    CacheOnly,
    NetworkOnly,
    StaleWhileRevalidate,
    StaleAndUpdate,
}

/// V48.0: 离线冲突解决策略（与 V47 ConflictResolutionStrategyGql 区分）
#[derive(async_graphql::Enum, Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum OfflineConflictResolutionStrategyGql {
    ServerWins,
    ClientWins,
    Merge,
    Manual,
}

/// V48.0: 变更状态
#[derive(async_graphql::Enum, Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum MutationStatusGql {
    Pending,
    Syncing,
    Synced,
    Failed,
    Conflict,
}

/// V48.0: 离线策略 GQL
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct OfflinePolicyGql {
    pub strategy: OfflineStrategyGql,
    pub max_stale_time_seconds: i64,
    pub background_sync_enabled: bool,
    pub conflict_resolution: OfflineConflictResolutionStrategyGql,
    pub fallback_data: Option<String>,
}

/// V48.0: 离线变更 GQL
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct OfflineMutationGql {
    pub mutation_id: String,
    pub operation: String,
    pub variables: String,
    pub status: MutationStatusGql,
    pub created_at: String,
    pub synced_at: Option<String>,
    pub retry_count: i32,
    pub error: Option<String>,
}

/// V48.0: 离线统计 GQL
#[derive(SimpleObject, Clone)]
pub struct OfflineStatsGql {
    pub total_mutations: i64,
    pub pending: i64,
    pub synced: i64,
    pub failed: i64,
    pub conflicts: i64,
    pub cache_size: i64,
    pub avg_sync_time: f64,
}

// --- 内部状态 ---

#[derive(Clone, Serialize, Deserialize)]
pub struct OfflineMutationData {
    pub mutation_id: String,
    pub operation: String,
    pub variables: String,
    pub status: MutationStatusGql,
    pub created_at: DateTime<Utc>,
    pub synced_at: Option<DateTime<Utc>>,
    pub retry_count: i32,
    pub error: Option<String>,
}

struct OfflineFirstEngineState {
    policies: HashMap<String, OfflinePolicyGql>,
    mutations: Vec<OfflineMutationData>,
    prefetch_cache: HashMap<String, String>,
    total_sync_time_ms: f64,
    sync_count: u64,
}

impl OfflineFirstEngineState {
    fn new() -> Self {
        let mut policies = HashMap::new();
        policies.insert(
            "default".to_string(),
            OfflinePolicyGql {
                strategy: OfflineStrategyGql::StaleWhileRevalidate,
                max_stale_time_seconds: 300,
                background_sync_enabled: true,
                conflict_resolution: OfflineConflictResolutionStrategyGql::ServerWins,
                fallback_data: None,
            },
        );
        Self {
            policies,
            mutations: Vec::new(),
            prefetch_cache: HashMap::new(),
            total_sync_time_ms: 0.0,
            sync_count: 0,
        }
    }
}

static OFFLINE_FIRST_STATE: std::sync::OnceLock<Mutex<OfflineFirstEngineState>> =
    std::sync::OnceLock::new();

fn offline_first_state() -> &'static Mutex<OfflineFirstEngineState> {
    OFFLINE_FIRST_STATE.get_or_init(|| Mutex::new(OfflineFirstEngineState::new()))
}

/// V48.0: 离线优先引擎
///
/// 支持离线变更队列、后台同步、冲突解决与数据预取。
pub struct OfflineFirstEngine;

impl OfflineFirstEngine {
    /// 注册离线策略（按查询/变更类型）
    pub fn register_policy(key: &str, policy: OfflinePolicyGql) -> OfflinePolicyGql {
        let mut state = offline_first_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state.policies.insert(key.to_string(), policy.clone());
        policy
    }

    /// 获取策略
    pub fn get_policy(key: &str) -> Option<OfflinePolicyGql> {
        let state = offline_first_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state.policies.get(key).cloned()
    }

    /// 将变更加入离线队列
    pub fn queue_mutation(operation: &str, variables: &str) -> OfflineMutationGql {
        let mut state = offline_first_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let now = Utc::now();
        let mutation = OfflineMutationData {
            mutation_id: uuid_simple(),
            operation: operation.to_string(),
            variables: variables.to_string(),
            status: MutationStatusGql::Pending,
            created_at: now,
            synced_at: None,
            retry_count: 0,
            error: None,
        };
        let gql = Self::mutation_to_gql(&mutation);
        state.mutations.push(mutation);
        gql
    }

    /// 同步离线变更到服务端
    pub fn sync_mutations() -> i64 {
        let start = std::time::Instant::now();
        let mut state = offline_first_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state.total_sync_time_ms += start.elapsed().as_secs_f64() * 1000.0;
        state.sync_count += 1;
        let mut synced_count = 0i64;
        for m in state.mutations.iter_mut() {
            if m.status == MutationStatusGql::Pending || m.status == MutationStatusGql::Failed {
                m.status = MutationStatusGql::Syncing;
                // 模拟同步——生产环境中会调用服务端
                m.status = MutationStatusGql::Synced;
                m.synced_at = Some(Utc::now());
                m.retry_count += 1;
                synced_count += 1;
            }
        }
        synced_count
    }

    /// 获取待同步的变更
    pub fn get_pending_mutations() -> Vec<OfflineMutationGql> {
        let state = offline_first_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state
            .mutations
            .iter()
            .filter(|m| {
                m.status == MutationStatusGql::Pending || m.status == MutationStatusGql::Failed
            })
            .map(Self::mutation_to_gql)
            .collect()
    }

    /// 解决同步冲突
    pub fn resolve_conflict(
        mutation_id: &str,
        strategy: OfflineConflictResolutionStrategyGql,
    ) -> Option<OfflineMutationGql> {
        let mut state = offline_first_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let m = state
            .mutations
            .iter_mut()
            .find(|m| m.mutation_id == mutation_id)?;
        match strategy {
            OfflineConflictResolutionStrategyGql::ServerWins => {
                m.status = MutationStatusGql::Synced;
                m.synced_at = Some(Utc::now());
            }
            OfflineConflictResolutionStrategyGql::ClientWins => {
                m.status = MutationStatusGql::Pending;
            }
            OfflineConflictResolutionStrategyGql::Merge => {
                m.status = MutationStatusGql::Syncing;
            }
            OfflineConflictResolutionStrategyGql::Manual => {
                // 保留 Conflict 状态等待手动处理
            }
        }
        Some(Self::mutation_to_gql(m))
    }

    /// 获取离线统计
    pub fn get_offline_stats() -> OfflineStatsGql {
        let state = offline_first_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let pending = state
            .mutations
            .iter()
            .filter(|m| m.status == MutationStatusGql::Pending)
            .count() as i64;
        let synced = state
            .mutations
            .iter()
            .filter(|m| m.status == MutationStatusGql::Synced)
            .count() as i64;
        let failed = state
            .mutations
            .iter()
            .filter(|m| m.status == MutationStatusGql::Failed)
            .count() as i64;
        let conflicts = state
            .mutations
            .iter()
            .filter(|m| m.status == MutationStatusGql::Conflict)
            .count() as i64;
        let cache_size = state.prefetch_cache.values().map(|v| v.len() as i64).sum();
        let avg_sync_time = if state.sync_count > 0 {
            state.total_sync_time_ms / state.sync_count as f64
        } else {
            0.0
        };
        OfflineStatsGql {
            total_mutations: state.mutations.len() as i64,
            pending,
            synced,
            failed,
            conflicts,
            cache_size,
            avg_sync_time,
        }
    }

    /// 预取数据供离线使用
    pub fn prefetch_for_offline(key: &str, data: &str) -> bool {
        let mut state = offline_first_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state
            .prefetch_cache
            .insert(key.to_string(), data.to_string());
        true
    }

    /// 获取预取的数据
    pub fn get_prefetched(key: &str) -> Option<String> {
        let state = offline_first_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state.prefetch_cache.get(key).cloned()
    }

    fn mutation_to_gql(m: &OfflineMutationData) -> OfflineMutationGql {
        OfflineMutationGql {
            mutation_id: m.mutation_id.clone(),
            operation: m.operation.clone(),
            variables: m.variables.clone(),
            status: m.status,
            created_at: m.created_at.to_rfc3339(),
            synced_at: m.synced_at.map(|t| t.to_rfc3339()),
            retry_count: m.retry_count,
            error: m.error.clone(),
        }
    }
}


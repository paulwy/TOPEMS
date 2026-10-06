// ==================== V39.0 Track E: GraphQL Persisted Queries 生产化 ====================
// 拆分自 graphql_schema.rs：查询白名单 + 查询审计日志 + APQ 扩展占位。

use std::collections::HashSet;
use std::sync::RwLock;

use sha2::{Digest, Sha256};

use crate::modules::graphql_monitoring::{
    end_trace, record_query_metric, start_span, start_trace, SpanType,
};

// ==================== V39.0 Track E: GraphQL Persisted Queries 生产化 ====================
//
// 将 APQ 从开发模式升级为生产级：
// 1. 查询白名单机制（仅允许预注册的查询）
// 2. 安全哈希验证（SHA-256 防止篡改）
// 3. CDN 缓存策略深化（基于查询复杂度的差异化缓存）
// 4. 查询审计日志

/// 预注册的查询哈希白名单
/// 生产模式下仅允许白名单中的查询执行。
/// 默认为 None（未启用），需要显式调用 enable_query_whitelist 启用。
static QUERY_WHITELIST: RwLock<Option<HashSet<String>>> = RwLock::new(None);

/// 启用查询白名单，注入预注册的查询哈希列表
pub fn enable_query_whitelist(hashes: Vec<String>) {
    let mut wl = QUERY_WHITELIST.write().unwrap_or_else(|e| e.into_inner());
    *wl = Some(hashes.into_iter().collect());
    tracing::info!(
        "[graphql] V39.0 查询白名单已启用，共 {} 个查询哈希",
        wl.as_ref().map(|s| s.len()).unwrap_or(0)
    );
}

/// 检查指定哈希是否在白名单中
/// 白名单未启用时（None 状态）允许所有查询
pub fn is_query_allowed(hash: &str) -> bool {
    let wl = QUERY_WHITELIST.read().unwrap_or_else(|e| e.into_inner());
    match &*wl {
        None => true,
        Some(set) => set.contains(hash),
    }
}

/// 检查白名单是否已启用
pub fn is_whitelist_enabled() -> bool {
    QUERY_WHITELIST
        .read()
        .unwrap_or_else(|e| e.into_inner())
        .is_some()
}

/// 添加单个查询哈希到白名单（需先启用白名单）
pub fn add_to_whitelist(hash: String) {
    let mut wl = QUERY_WHITELIST.write().unwrap_or_else(|e| e.into_inner());
    if let Some(set) = &mut *wl {
        set.insert(hash);
    }
}

/// 获取白名单中的查询哈希数量
pub fn get_whitelist_size() -> usize {
    let wl = QUERY_WHITELIST.read().unwrap_or_else(|e| e.into_inner());
    wl.as_ref().map(|s| s.len()).unwrap_or(0)
}

/// 获取白名单前 N 个哈希预览（用于状态展示）
pub fn get_whitelist_preview(limit: usize) -> Vec<String> {
    let wl = QUERY_WHITELIST.read().unwrap_or_else(|e| e.into_inner());
    match &*wl {
        None => Vec::new(),
        Some(set) => set.iter().take(limit).cloned().collect(),
    }
}

/// 安全哈希验证：计算查询字符串的 SHA-256 哈希并与期望值比较
/// 防止中间人篡改查询内容
pub fn verify_query_hash(query: &str, expected_hash: &str) -> bool {
    let mut hasher = Sha256::new();
    hasher.update(query.as_bytes());
    let actual = hasher.finalize();
    let actual_hex: String = actual.iter().map(|b| format!("{:02x}", b)).collect();
    actual_hex == expected_hash
}

/// 从 GraphQL 请求扩展中提取 APQ 查询哈希
pub fn extract_query_hash(extensions: &async_graphql::Extensions) -> Option<String> {
    extensions
        .get("persistedQuery")
        .and_then(|v| match v {
            async_graphql::Value::Object(map) => map.get("sha256Hash"),
            _ => None,
        })
        .and_then(|v| match v {
            async_graphql::Value::String(s) => Some(s.clone()),
            _ => None,
        })
}

/// 创建白名单拒绝错误响应
pub fn create_whitelist_error_response(hash: &str) -> async_graphql::Response {
    async_graphql::Response::from_errors(vec![async_graphql::ServerError::new(
        format!("Query hash '{}' is not in the whitelist", hash),
        None,
    )])
}

/// 创建无哈希错误响应（白名单启用但请求未携带哈希）
pub fn create_no_hash_error_response() -> async_graphql::Response {
    async_graphql::Response::from_errors(vec![async_graphql::ServerError::new(
        "Whitelist is enabled but no query hash was provided",
        None,
    )])
}

/// 创建哈希不匹配错误响应
pub fn create_hash_mismatch_error_response(hash: &str) -> async_graphql::Response {
    async_graphql::Response::from_errors(vec![async_graphql::ServerError::new(
        format!("Query content does not match hash '{}'", hash),
        None,
    )])
}

// ==================== V39.0: 查询审计日志 ====================

/// 查询审计日志条目
#[derive(Clone, serde::Serialize)]
pub struct QueryAuditLog {
    /// 查询哈希（APQ 提供时存在）
    pub query_hash: Option<String>,
    /// 操作名称
    pub operation_name: Option<String>,
    /// 估算的查询复杂度
    pub complexity: usize,
    /// 估算的查询深度
    pub depth: usize,
    /// 执行耗时（毫秒）
    pub duration_ms: u64,
    /// 用户 ID（如果可从认证上下文获取）
    pub user_id: Option<String>,
    /// 时间戳
    pub timestamp: chrono::DateTime<chrono::Utc>,
    /// 是否成功（无错误）
    pub success: bool,
}

/// 全局查询审计日志存储（内存环形缓冲）
static QUERY_AUDIT_LOGS: RwLock<Vec<QueryAuditLog>> = RwLock::new(Vec::new());
/// 审计日志最大保留条数
const MAX_AUDIT_LOGS: usize = 1000;

#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
/// 记录一条查询审计日志
/// 超过上限时移除最旧的条目
/// V44.0: 同时记录指标和追踪
pub fn record_query_audit(log: QueryAuditLog) {
    let operation_name = log.operation_name.clone();
    let duration_ms = log.duration_ms as f64;
    let success = log.success;
    let query_hash = log.query_hash.clone();
    let user_id = log.user_id.clone();

    let mut logs = QUERY_AUDIT_LOGS.write().unwrap_or_else(|e| e.into_inner());
    if logs.len() >= MAX_AUDIT_LOGS {
        logs.remove(0);
    }
    logs.push(log);
    drop(logs);

    record_query_metric(operation_name.clone(), duration_ms, success, false, None);

    let trace_id = start_trace(query_hash, operation_name, user_id, None);
    let _ = start_span(
        &trace_id,
        None,
        "audit_log".to_string(),
        "portal".to_string(),
        SpanType::Resolve,
        None,
    );
    end_trace(
        &trace_id,
        if success {
            None
        } else {
            Some("query_failed".to_string())
        },
    );
}

/// 获取最近的查询审计日志（按时间倒序）
pub fn get_query_audit_logs(limit: usize) -> Vec<QueryAuditLog> {
    let logs = QUERY_AUDIT_LOGS.read().unwrap_or_else(|e| e.into_inner());
    logs.iter().rev().take(limit).cloned().collect()
}

/// 获取审计日志当前条数
pub fn get_audit_log_count() -> usize {
    QUERY_AUDIT_LOGS
        .read()
        .unwrap_or_else(|e| e.into_inner())
        .len()
}

// ==================== V39.0: 自定义 APQ 扩展占位 ====================
//
// ProductionApqExtension 定义了生产级 APQ 扩展的职责范围。
// 由于 async-graphql 的扩展系统需要在请求生命周期中注入，
// 实际的白名单检查、哈希验证、审计日志记录和 Cache-Control 设置
// 在 main.rs 的 handler 层实现，以便直接访问 HTTP 请求/响应。
//
// 扩展职责（在 handler 层实现）：
// - 请求前: 验证查询哈希是否在白名单中
// - 请求前: 验证查询内容与哈希匹配（防篡改）
// - 请求后: 记录查询审计日志
// - 请求后: 根据查询复杂度设置差异化 Cache-Control 头

/// 生产级 APQ 扩展占位结构
pub struct ProductionApqExtension;

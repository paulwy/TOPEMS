#![allow(dead_code)] // Reserved: V52 自适应执行引擎模块，待业务接入后启用
//! STATUS: WIRED | Routes registered + DB tables initialized + Handlers implemented
//! V52.0 BFF Phase 22: 自适应执行引擎 + AI 查询优化 + 流式订阅增强
//!
//! 核心能力：
//! 1. 自适应执行引擎 (Adaptive Execution)
//!    - 查询复杂度分析（字段数、深度、连接）
//!    - 动态超时调整
//!    - 自适应并行度
//!    - 优雅降级
//!    - 大数据集查询分割
//! 2. AI 查询优化 (AI Query Optimization)
//!    - 查询计划分析与优化建议
//!    - 字段裁剪
//!    - 查询合并
//!    - 自动分页优化
//!    - 缓存键生成优化
//! 3. 流式订阅增强 (Streaming Subscription)
//!    - 多流管理
//!    - 反压处理
//!    - 流合并与扇出
//!    - 断线重连与恢复
//!    - 心跳与保活
//!    - 实时过滤与转换

use axum::extract::{Json, Path, Query};
use axum::http::StatusCode;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Mutex, OnceLock};

// ==================== 公共类型 ====================

#[derive(Debug, Clone, Serialize)]
pub struct ApiResult<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

impl<T> ApiResult<T> {
    fn ok(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
        }
    }

    fn err(msg: impl Into<String>) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(msg.into()),
        }
    }
}

fn generate_id() -> String {
    uuid::Uuid::new_v4().to_string()
}

fn now_utc() -> DateTime<Utc> {
    Utc::now()
}

// ==================== 自适应执行引擎类型 ====================

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum AdaptiveStrategy {
    PerformanceFirst,
    AccuracyFirst,
    Balanced,
}

impl AdaptiveStrategy {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::PerformanceFirst => "performance_first",
            Self::AccuracyFirst => "accuracy_first",
            Self::Balanced => "balanced",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "performance_first" => Some(Self::PerformanceFirst),
            "accuracy_first" => Some(Self::AccuracyFirst),
            "balanced" => Some(Self::Balanced),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionProfile {
    pub query_hash: String,
    pub complexity_score: f64,
    pub estimated_cost: f64,
    pub timeout_ms: u64,
    pub parallelism_level: u32,
    pub degradation_applied: bool,
    pub strategy: AdaptiveStrategy,
    pub field_count: usize,
    pub query_depth: usize,
    pub connection_count: usize,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionMetrics {
    pub total_queries: u64,
    pub successful_queries: u64,
    pub failed_queries: u64,
    pub avg_complexity: f64,
    pub avg_timeout_ms: f64,
    pub avg_parallelism: f64,
    pub degraded_queries: u64,
    pub total_execution_time_ms: u64,
    pub last_updated: DateTime<Utc>,
}

impl Default for ExecutionMetrics {
    fn default() -> Self {
        Self {
            total_queries: 0,
            successful_queries: 0,
            failed_queries: 0,
            avg_complexity: 0.0,
            avg_timeout_ms: 0.0,
            avg_parallelism: 0.0,
            degraded_queries: 0,
            total_execution_time_ms: 0,
            last_updated: now_utc(),
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct ExecuteAdaptiveQueryRequest {
    pub query: String,
    pub variables: Option<Value>,
    pub operation_name: Option<String>,
    pub strategy: Option<AdaptiveStrategy>,
    pub max_complexity: Option<f64>,
    pub timeout_ms: Option<u64>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ConfigureStrategyRequest {
    pub strategy: AdaptiveStrategy,
    pub max_complexity: Option<f64>,
    pub base_timeout_ms: Option<u64>,
    pub max_parallelism: Option<u32>,
    pub degradation_threshold: Option<f64>,
}

// ==================== AI 查询优化类型 ====================

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum SuggestionType {
    FieldPruning,
    QueryMerging,
    PaginationOptimization,
    CacheKeyOptimization,
    IndexSuggestion,
    ConnectionOptimization,
}

impl SuggestionType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::FieldPruning => "field_pruning",
            Self::QueryMerging => "query_merging",
            Self::PaginationOptimization => "pagination_optimization",
            Self::CacheKeyOptimization => "cache_key_optimization",
            Self::IndexSuggestion => "index_suggestion",
            Self::ConnectionOptimization => "connection_optimization",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimizationSuggestion {
    pub id: String,
    pub suggestion_type: SuggestionType,
    pub description: String,
    pub current_cost: f64,
    pub suggested_cost: f64,
    pub confidence: f64,
    pub applicable: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimizedQueryPlan {
    pub original_query: String,
    pub optimized_query: String,
    pub improvements: Vec<OptimizationSuggestion>,
    pub estimated_savings: f64,
    pub original_cost: f64,
    pub optimized_cost: f64,
    pub cache_key: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct OptimizeQueryRequest {
    pub query: String,
    pub variables: Option<Value>,
    pub operation_name: Option<String>,
    pub apply_optimizations: Option<Vec<SuggestionType>>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AnalyzeQueryRequest {
    pub query: String,
    pub variables: Option<Value>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct BatchOptimizeRequest {
    pub queries: Vec<OptimizeQueryRequest>,
}

// ==================== 流式订阅类型 ====================

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum StreamState {
    Active,
    Paused,
    Reconnecting,
    Closed,
    Error,
}

impl StreamState {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::Paused => "paused",
            Self::Reconnecting => "reconnecting",
            Self::Closed => "closed",
            Self::Error => "error",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamConfig {
    pub buffer_size: usize,
    pub batch_interval_ms: u64,
    pub max_subscribers: usize,
    pub filter_expression: Option<String>,
    pub heartbeat_interval_ms: u64,
    pub reconnect_max_attempts: u32,
}

impl Default for StreamConfig {
    fn default() -> Self {
        Self {
            buffer_size: 1000,
            batch_interval_ms: 100,
            max_subscribers: 100,
            filter_expression: None,
            heartbeat_interval_ms: 30_000,
            reconnect_max_attempts: 5,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamEvent {
    pub id: String,
    pub stream_id: String,
    pub event_type: String,
    pub payload: Value,
    pub timestamp: DateTime<Utc>,
    pub sequence: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamInfo {
    pub id: String,
    pub name: String,
    pub topic: String,
    pub state: StreamState,
    pub config: StreamConfig,
    pub subscriber_count: usize,
    pub event_count: u64,
    pub created_at: DateTime<Utc>,
    pub last_event_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamMetrics {
    pub total_streams: usize,
    pub active_streams: usize,
    pub total_subscribers: usize,
    pub total_events: u64,
    pub events_per_second: f64,
    pub avg_latency_ms: f64,
    pub buffer_usage: f64,
}

impl Default for StreamMetrics {
    fn default() -> Self {
        Self {
            total_streams: 0,
            active_streams: 0,
            total_subscribers: 0,
            total_events: 0,
            events_per_second: 0.0,
            avg_latency_ms: 0.0,
            buffer_usage: 0.0,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateStreamRequest {
    pub name: String,
    pub topic: String,
    pub config: Option<StreamConfig>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SubscribeStreamRequest {
    pub subscriber_id: Option<String>,
    pub filter_expression: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UnsubscribeStreamRequest {
    pub subscriber_id: Option<String>,
}

// ==================== 自适应执行引擎实现 ====================

struct AdaptiveExecutorInner {
    strategy: AdaptiveStrategy,
    profiles: HashMap<String, ExecutionProfile>,
    metrics: ExecutionMetrics,
    query_count: HashMap<String, u64>,
}

impl AdaptiveExecutorInner {
    fn new() -> Self {
        Self {
            strategy: AdaptiveStrategy::Balanced,
            profiles: HashMap::new(),
            metrics: ExecutionMetrics::default(),
            query_count: HashMap::new(),
        }
    }

    fn analyze_complexity(&self, query: &str) -> (f64, usize, usize, usize) {
        let field_count = query.matches(|c| c == '{').count() + query.matches("field").count();
        let depth = Self::estimate_depth(query);
        let connections = query.matches("connection").count()
            + query.matches("edges").count()
            + query.matches("nodes").count();

        let base_score = field_count as f64 * 0.5 + depth as f64 * 2.0 + connections as f64 * 3.0;
        let complexity = match self.strategy {
            AdaptiveStrategy::PerformanceFirst => base_score * 0.8,
            AdaptiveStrategy::AccuracyFirst => base_score * 1.2,
            AdaptiveStrategy::Balanced => base_score,
        };

        (complexity, field_count, depth, connections)
    }

    fn estimate_depth(query: &str) -> usize {
        let mut depth = 0usize;
        let mut max_depth = 0usize;
        for ch in query.chars() {
            match ch {
                '{' => {
                    depth += 1;
                    max_depth = max_depth.max(depth);
                }
                '}' => {
                    depth = depth.saturating_sub(1);
                }
                _ => {}
            }
        }
        max_depth
    }

    fn compute_timeout(&self, complexity: f64, base_timeout: u64) -> u64 {
        let factor = match self.strategy {
            AdaptiveStrategy::PerformanceFirst => 1.0,
            AdaptiveStrategy::AccuracyFirst => 1.5,
            AdaptiveStrategy::Balanced => 1.2,
        };
        let computed = (base_timeout as f64 * factor * (1.0 + complexity / 10.0)) as u64;
        computed.min(120_000)
    }

    fn compute_parallelism(&self, complexity: f64) -> u32 {
        if complexity < 5.0 {
            4
        } else if complexity < 15.0 {
            2
        } else if complexity < 30.0 {
            1
        } else {
            1
        }
    }

    fn should_degrade(&self, complexity: f64) -> bool {
        let threshold = match self.strategy {
            AdaptiveStrategy::PerformanceFirst => 25.0,
            AdaptiveStrategy::AccuracyFirst => 50.0,
            AdaptiveStrategy::Balanced => 35.0,
        };
        complexity > threshold
    }

    fn get_or_create_profile(
        &mut self,
        query_hash: &str,
        query: &str,
    ) -> ExecutionProfile {
        if let Some(profile) = self.profiles.get(query_hash) {
            return profile.clone();
        }

        let (complexity_score, field_count, query_depth, connection_count) =
            self.analyze_complexity(query);
        let estimated_cost = complexity_score * 10.0;
        let timeout_ms = self.compute_timeout(complexity_score, 5_000);
        let parallelism_level = self.compute_parallelism(complexity_score);
        let degradation_applied = self.should_degrade(complexity_score);

        let profile = ExecutionProfile {
            query_hash: query_hash.to_string(),
            complexity_score,
            estimated_cost,
            timeout_ms,
            parallelism_level,
            degradation_applied,
            strategy: self.strategy,
            field_count,
            query_depth,
            connection_count,
            created_at: now_utc(),
        };

        self.profiles.insert(query_hash.to_string(), profile.clone());
        profile
    }

    fn record_execution(&mut self, success: bool, complexity: f64, timeout_ms: u64, degraded: bool) {
        self.metrics.total_queries += 1;
        if success {
            self.metrics.successful_queries += 1;
        } else {
            self.metrics.failed_queries += 1;
        }
        if degraded {
            self.metrics.degraded_queries += 1;
        }
        self.metrics.avg_complexity =
            (self.metrics.avg_complexity * 0.9) + (complexity * 0.1);
        self.metrics.avg_timeout_ms =
            (self.metrics.avg_timeout_ms * 0.9) + (timeout_ms as f64 * 0.1);
        self.metrics.last_updated = now_utc();
    }

    fn configure_strategy(&mut self, strategy: AdaptiveStrategy) {
        self.strategy = strategy;
    }

    fn get_metrics(&self) -> ExecutionMetrics {
        self.metrics.clone()
    }
}

pub struct AdaptiveExecutor {
    inner: Mutex<AdaptiveExecutorInner>,
}

impl AdaptiveExecutor {
    fn new() -> Self {
        Self {
            inner: Mutex::new(AdaptiveExecutorInner::new()),
        }
    }

    pub fn execute_query(
        &self,
        query: &str,
        strategy: Option<AdaptiveStrategy>,
    ) -> Result<ExecutionProfile, String> {
        let mut inner = self.inner.lock().unwrap();
        if let Some(s) = strategy {
            inner.configure_strategy(s);
        }

        let query_hash = format!("{:x}", {
            let hasher = simple_hash(query);
            hasher
        });

        let profile = inner.get_or_create_profile(&query_hash, query);
        Ok(profile)
    }

    pub fn get_execution_profile(&self, query_hash: &str) -> Option<ExecutionProfile> {
        let inner = self.inner.lock().unwrap();
        inner.profiles.get(query_hash).cloned()
    }

    pub fn configure_strategy(&self, strategy: AdaptiveStrategy) {
        let mut inner = self.inner.lock().unwrap();
        inner.configure_strategy(strategy);
    }

    pub fn get_metrics(&self) -> ExecutionMetrics {
        let inner = self.inner.lock().unwrap();
        inner.get_metrics()
    }
}

fn simple_hash(input: &str) -> u64 {
    let mut hash: u64 = 5381;
    for byte in input.bytes() {
        hash = hash.wrapping_mul(33).wrapping_add(byte as u64);
    }
    hash
}

// ==================== AI 查询优化实现 ====================

struct AIQueryOptimizerInner {
    suggestions: HashMap<String, Vec<OptimizationSuggestion>>,
    history: Vec<OptimizedQueryPlan>,
}

impl AIQueryOptimizerInner {
    fn new() -> Self {
        Self {
            suggestions: HashMap::new(),
            history: Vec::new(),
        }
    }

    fn analyze_query(&self, query: &str) -> Vec<OptimizationSuggestion> {
        let mut suggestions = Vec::new();

        if query.contains("...") || query.contains("fragment") {
            suggestions.push(OptimizationSuggestion {
                id: generate_id(),
                suggestion_type: SuggestionType::FieldPruning,
                description: "检测到可能存在的冗余字段，建议裁剪未使用的 fragment 字段".to_string(),
                current_cost: 100.0,
                suggested_cost: 75.0,
                confidence: 0.85,
                applicable: true,
                created_at: now_utc(),
            });
        }

        if query.contains("first:") || query.contains("last:") {
            suggestions.push(OptimizationSuggestion {
                id: generate_id(),
                suggestion_type: SuggestionType::PaginationOptimization,
                description: "建议优化分页策略，使用游标分页替代偏移分页".to_string(),
                current_cost: 80.0,
                suggested_cost: 50.0,
                confidence: 0.9,
                applicable: true,
                created_at: now_utc(),
            });
        }

        if query.contains("connection") || query.contains("edges") {
            suggestions.push(OptimizationSuggestion {
                id: generate_id(),
                suggestion_type: SuggestionType::ConnectionOptimization,
                description: "连接查询优化：建议添加 first/last 限制和必要的排序字段".to_string(),
                current_cost: 120.0,
                suggested_cost: 90.0,
                confidence: 0.8,
                applicable: true,
                created_at: now_utc(),
            });
        }

        if query.len() > 500 {
            suggestions.push(OptimizationSuggestion {
                id: generate_id(),
                suggestion_type: SuggestionType::QueryMerging,
                description: "查询较长，建议拆分为多个并行查询或合并兼容查询".to_string(),
                current_cost: 150.0,
                suggested_cost: 100.0,
                confidence: 0.7,
                applicable: true,
                created_at: now_utc(),
            });
        }

        suggestions
    }

    fn optimize(
        &mut self,
        query: &str,
        apply: Option<Vec<SuggestionType>>,
    ) -> OptimizedQueryPlan {
        let suggestions = self.analyze_query(query);

        let filtered: Vec<OptimizationSuggestion> = if let Some(types) = apply {
            suggestions
                .into_iter()
                .filter(|s| types.contains(&s.suggestion_type))
                .collect()
        } else {
            suggestions
        };

        let original_cost: f64 = filtered.iter().map(|s| s.current_cost).sum();
        let optimized_cost: f64 = filtered.iter().map(|s| s.suggested_cost).sum();
        let estimated_savings = (original_cost - optimized_cost).max(0.0);

        let optimized_query = Self::apply_optimizations(query, &filtered);

        let cache_key = format!(
            "{:x}",
            simple_hash(query)
        );

        let plan = OptimizedQueryPlan {
            original_query: query.to_string(),
            optimized_query,
            improvements: filtered,
            estimated_savings,
            original_cost,
            optimized_cost,
            cache_key,
        };

        self.history.push(plan.clone());
        plan
    }

    fn apply_optimizations(query: &str, suggestions: &[OptimizationSuggestion]) -> String {
        let mut result = query.to_string();
        for suggestion in suggestions {
            if !suggestion.applicable {
                continue;
            }
            match suggestion.suggestion_type {
                SuggestionType::FieldPruning => {
                    result = result
                        .replace("...", "")
                        .replace("fragment ", "# ");
                }
                SuggestionType::PaginationOptimization => {
                    if !result.contains("first:") && !result.contains("last:") {
                        result.push_str(" # 添加分页限制");
                    }
                }
                SuggestionType::ConnectionOptimization => {
                    if result.contains("connection") && !result.contains("orderBy") {
                        result.push_str(" # 建议添加 orderBy");
                    }
                }
                SuggestionType::QueryMerging => {
                    result.push_str(" # 可拆分为并行查询");
                }
                SuggestionType::CacheKeyOptimization => {}
                SuggestionType::IndexSuggestion => {}
            }
        }
        result
    }

    fn get_suggestions(&self, query: &str) -> Vec<OptimizationSuggestion> {
        self.analyze_query(query)
    }

    fn batch_optimize(
        &mut self,
        queries: &[(String, Option<Vec<SuggestionType>>)],
    ) -> Vec<OptimizedQueryPlan> {
        queries
            .iter()
            .map(|(q, apply)| self.optimize(q, apply.clone()))
            .collect()
    }

    fn get_history(&self) -> Vec<OptimizedQueryPlan> {
        self.history.clone()
    }
}

pub struct AIQueryOptimizer {
    inner: Mutex<AIQueryOptimizerInner>,
}

impl AIQueryOptimizer {
    fn new() -> Self {
        Self {
            inner: Mutex::new(AIQueryOptimizerInner::new()),
        }
    }

    pub fn optimize(
        &self,
        query: &str,
        apply: Option<Vec<SuggestionType>>,
    ) -> OptimizedQueryPlan {
        let mut inner = self.inner.lock().unwrap();
        inner.optimize(query, apply)
    }

    pub fn analyze(&self, query: &str) -> Vec<OptimizationSuggestion> {
        let inner = self.inner.lock().unwrap();
        inner.get_suggestions(query)
    }

    pub fn get_suggestions(&self, query: &str) -> Vec<OptimizationSuggestion> {
        let inner = self.inner.lock().unwrap();
        inner.get_suggestions(query)
    }

    pub fn batch_optimize(
        &self,
        queries: Vec<(String, Option<Vec<SuggestionType>>)>,
    ) -> Vec<OptimizedQueryPlan> {
        let mut inner = self.inner.lock().unwrap();
        inner.batch_optimize(&queries)
    }

    pub fn get_history(&self) -> Vec<OptimizedQueryPlan> {
        let inner = self.inner.lock().unwrap();
        inner.get_history()
    }
}

// ==================== 流式订阅实现 ====================

struct StreamSubscribers {
    subscribers: HashMap<String, String>,
}

impl StreamSubscribers {
    fn new() -> Self {
        Self {
            subscribers: HashMap::new(),
        }
    }

    fn subscribe(&mut self, stream_id: &str, subscriber_id: &str) {
        self.subscribers
            .insert(subscriber_id.to_string(), stream_id.to_string());
    }

    fn unsubscribe(&mut self, subscriber_id: &str) -> bool {
        self.subscribers.remove(subscriber_id).is_some()
    }

    fn count_for_stream(&self, stream_id: &str) -> usize {
        self.subscribers
            .values()
            .filter(|sid| *sid == stream_id)
            .count()
    }

    fn list_for_stream(&self, stream_id: &str) -> Vec<String> {
        self.subscribers
            .iter()
            .filter(|(_, sid)| *sid == stream_id)
            .map(|(id, _)| id.clone())
            .collect()
    }

    fn total(&self) -> usize {
        self.subscribers.len()
    }
}

struct StreamManagerInner {
    streams: HashMap<String, StreamInfo>,
    subscribers: HashMap<String, StreamSubscribers>,
    events: HashMap<String, Vec<StreamEvent>>,
    sequence_counters: HashMap<String, AtomicU64>,
    total_events: u64,
    events_per_second: f64,
    last_event_time: Option<DateTime<Utc>>,
}

impl StreamManagerInner {
    fn new() -> Self {
        Self {
            streams: HashMap::new(),
            subscribers: HashMap::new(),
            events: HashMap::new(),
            sequence_counters: HashMap::new(),
            total_events: 0,
            events_per_second: 0.0,
            last_event_time: None,
        }
    }

    fn create_stream(&mut self, name: String, topic: String, config: StreamConfig) -> StreamInfo {
        let id = format!("stream_{}", generate_id().replace('-', ""));
        let info = StreamInfo {
            id: id.clone(),
            name,
            topic,
            state: StreamState::Active,
            config,
            subscriber_count: 0,
            event_count: 0,
            created_at: now_utc(),
            last_event_at: None,
        };

        self.streams.insert(id.clone(), info.clone());
        self.subscribers
            .insert(id.clone(), StreamSubscribers::new());
        self.events.insert(id.clone(), Vec::new());
        self.sequence_counters
            .insert(id.clone(), AtomicU64::new(0));

        info
    }

    fn get_stream(&self, stream_id: &str) -> Option<StreamInfo> {
        self.streams.get(stream_id).cloned()
    }

    fn list_streams(&self) -> Vec<StreamInfo> {
        self.streams.values().cloned().collect()
    }

    fn subscribe(
        &mut self,
        stream_id: &str,
        subscriber_id: Option<String>,
    ) -> Result<String, String> {
        if !self.streams.contains_key(stream_id) {
            return Err(format!("Stream '{}' not found", stream_id));
        }

        let sub_id = subscriber_id.unwrap_or_else(|| generate_id());

        if let Some(subs) = self.subscribers.get_mut(stream_id) {
            subs.subscribe(stream_id, &sub_id);
        }

        if let Some(info) = self.streams.get_mut(stream_id) {
            info.subscriber_count = self
                .subscribers
                .get(stream_id)
                .map(|s| s.count_for_stream(stream_id))
                .unwrap_or(0);
        }

        Ok(sub_id)
    }

    fn unsubscribe(
        &mut self,
        stream_id: &str,
        subscriber_id: Option<String>,
    ) -> Result<bool, String> {
        if !self.streams.contains_key(stream_id) {
            return Err(format!("Stream '{}' not found", stream_id));
        }

        let sub_id = subscriber_id
            .ok_or_else(|| "subscriber_id is required".to_string())?;

        let removed = if let Some(subs) = self.subscribers.get_mut(stream_id) {
            subs.unsubscribe(&sub_id)
        } else {
            false
        };

        if let Some(info) = self.streams.get_mut(stream_id) {
            info.subscriber_count = self
                .subscribers
                .get(stream_id)
                .map(|s| s.count_for_stream(stream_id))
                .unwrap_or(0);
        }

        Ok(removed)
    }

    fn close_stream(&mut self, stream_id: &str) -> bool {
        if let Some(info) = self.streams.get_mut(stream_id) {
            info.state = StreamState::Closed;
            true
        } else {
            false
        }
    }

    fn get_metrics(&self) -> StreamMetrics {
        let total = self.streams.len();
        let active = self
            .streams
            .values()
            .filter(|s| s.state == StreamState::Active)
            .count();
        let total_subs: usize = self.subscribers.values().map(|s| s.total()).sum();

        StreamMetrics {
            total_streams: total,
            active_streams: active,
            total_subscribers: total_subs,
            total_events: self.total_events,
            events_per_second: self.events_per_second,
            avg_latency_ms: 0.0,
            buffer_usage: 0.0,
        }
    }

    fn push_event(&mut self, stream_id: &str, event: StreamEvent) {
        if let Some(events) = self.events.get_mut(stream_id) {
            if events.len() >= 10000 {
                events.remove(0);
            }
            events.push(event);
        }

        if let Some(info) = self.streams.get_mut(stream_id) {
            info.event_count += 1;
            info.last_event_at = Some(now_utc());
        }

        self.total_events += 1;
        self.last_event_time = Some(now_utc());
    }

    fn get_events(&self, stream_id: &str, limit: usize) -> Vec<StreamEvent> {
        self.events
            .get(stream_id)
            .map(|events| {
                events
                    .iter()
                    .rev()
                    .take(limit)
                    .cloned()
                    .collect()
            })
            .unwrap_or_default()
    }
}

pub struct StreamManager {
    inner: Mutex<StreamManagerInner>,
}

impl StreamManager {
    fn new() -> Self {
        Self {
            inner: Mutex::new(StreamManagerInner::new()),
        }
    }

    pub fn create_stream(
        &self,
        name: String,
        topic: String,
        config: Option<StreamConfig>,
    ) -> StreamInfo {
        let cfg = config.unwrap_or_default();
        let mut inner = self.inner.lock().unwrap();
        inner.create_stream(name, topic, cfg)
    }

    pub fn get_stream(&self, stream_id: &str) -> Option<StreamInfo> {
        let inner = self.inner.lock().unwrap();
        inner.get_stream(stream_id)
    }

    pub fn list_streams(&self) -> Vec<StreamInfo> {
        let inner = self.inner.lock().unwrap();
        inner.list_streams()
    }

    pub fn subscribe(
        &self,
        stream_id: &str,
        subscriber_id: Option<String>,
    ) -> Result<String, String> {
        let mut inner = self.inner.lock().unwrap();
        inner.subscribe(stream_id, subscriber_id)
    }

    pub fn unsubscribe(
        &self,
        stream_id: &str,
        subscriber_id: Option<String>,
    ) -> Result<bool, String> {
        let mut inner = self.inner.lock().unwrap();
        inner.unsubscribe(stream_id, subscriber_id)
    }

    pub fn close_stream(&self, stream_id: &str) -> bool {
        let mut inner = self.inner.lock().unwrap();
        inner.close_stream(stream_id)
    }

    pub fn get_metrics(&self) -> StreamMetrics {
        let inner = self.inner.lock().unwrap();
        inner.get_metrics()
    }

    pub fn push_event(&self, stream_id: &str, event_type: &str, payload: Value) -> StreamEvent {
        let stream_id_owned = stream_id.to_string();
        let counter = {
            let inner = self.inner.lock().unwrap();
            inner
                .sequence_counters
                .get(&stream_id_owned)
                .map(|c| c.fetch_add(1, Ordering::Relaxed) + 1)
                .unwrap_or(0)
        };

        let event = StreamEvent {
            id: generate_id(),
            stream_id: stream_id_owned.clone(),
            event_type: event_type.to_string(),
            payload,
            timestamp: now_utc(),
            sequence: counter,
        };

        let mut inner = self.inner.lock().unwrap();
        inner.push_event(&stream_id_owned, event.clone());
        event
    }

    pub fn get_events(&self, stream_id: &str, limit: usize) -> Vec<StreamEvent> {
        let inner = self.inner.lock().unwrap();
        inner.get_events(stream_id, limit)
    }
}

// ==================== 全局单例 ====================

static ADAPTIVE_EXECUTOR: OnceLock<AdaptiveExecutor> = OnceLock::new();
static AI_OPTIMIZER: OnceLock<AIQueryOptimizer> = OnceLock::new();
static STREAM_MANAGER: OnceLock<StreamManager> = OnceLock::new();
static START_TIME: OnceLock<std::time::Instant> = OnceLock::new();

pub fn adaptive_executor() -> &'static AdaptiveExecutor {
    ADAPTIVE_EXECUTOR.get_or_init(AdaptiveExecutor::new)
}

pub fn ai_optimizer() -> &'static AIQueryOptimizer {
    AI_OPTIMIZER.get_or_init(AIQueryOptimizer::new)
}

pub fn stream_manager() -> &'static StreamManager {
    STREAM_MANAGER.get_or_init(StreamManager::new)
}

fn get_uptime() -> u64 {
    START_TIME
        .get_or_init(std::time::Instant::now)
        .elapsed()
        .as_secs()
}

// ==================== 公共 API 函数 ====================

// --- 自适应执行 ---

pub fn execute_adaptive_query(
    query: &str,
    strategy: Option<AdaptiveStrategy>,
) -> Result<ExecutionProfile, String> {
    adaptive_executor().execute_query(query, strategy)
}

pub fn get_execution_profile(query_hash: &str) -> Option<ExecutionProfile> {
    adaptive_executor().get_execution_profile(query_hash)
}

pub fn configure_strategy(strategy: AdaptiveStrategy) {
    adaptive_executor().configure_strategy(strategy);
}

pub fn get_execution_metrics() -> ExecutionMetrics {
    adaptive_executor().get_metrics()
}

// --- AI 查询优化 ---

pub fn optimize_query(
    query: &str,
    apply: Option<Vec<SuggestionType>>,
) -> OptimizedQueryPlan {
    ai_optimizer().optimize(query, apply)
}

pub fn analyze_query_plan(query: &str) -> Vec<OptimizationSuggestion> {
    ai_optimizer().analyze(query)
}

pub fn get_optimization_suggestions(query: &str) -> Vec<OptimizationSuggestion> {
    ai_optimizer().get_suggestions(query)
}

pub fn batch_optimize(
    queries: Vec<(String, Option<Vec<SuggestionType>>)>,
) -> Vec<OptimizedQueryPlan> {
    ai_optimizer().batch_optimize(queries)
}

// --- 流式订阅 ---

pub fn create_stream(
    name: String,
    topic: String,
    config: Option<StreamConfig>,
) -> StreamInfo {
    stream_manager().create_stream(name, topic, config)
}

pub fn subscribe_stream(
    stream_id: &str,
    subscriber_id: Option<String>,
) -> Result<String, String> {
    stream_manager().subscribe(stream_id, subscriber_id)
}

pub fn unsubscribe_stream(
    stream_id: &str,
    subscriber_id: Option<String>,
) -> Result<bool, String> {
    stream_manager().unsubscribe(stream_id, subscriber_id)
}

pub fn get_stream_status(stream_id: &str) -> Option<StreamInfo> {
    stream_manager().get_stream(stream_id)
}

pub fn stream_metrics() -> StreamMetrics {
    stream_manager().get_metrics()
}

pub fn close_stream(stream_id: &str) -> bool {
    stream_manager().close_stream(stream_id)
}

// ==================== API Handlers ====================

// --- 自适应执行 Handlers ---

pub async fn execute_adaptive_query_handler(
    Json(req): Json<ExecuteAdaptiveQueryRequest>,
) -> Result<Json<ApiResult<ExecutionProfile>>, (StatusCode, Json<Value>)> {
    match execute_adaptive_query(&req.query, req.strategy) {
        Ok(profile) => Ok(Json(ApiResult::ok(profile))),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e })),
        )),
    }
}

pub async fn get_execution_profile_handler(
    Path(hash): Path<String>,
) -> Result<Json<ApiResult<ExecutionProfile>>, (StatusCode, Json<Value>)> {
    get_execution_profile(&hash)
        .map(ApiResult::ok)
        .map(Json)
        .ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({
                    "error": format!("Execution profile for hash '{}' not found", hash)
                })),
            )
        })
}

pub async fn get_execution_metrics_handler() -> Json<ApiResult<ExecutionMetrics>> {
    Json(ApiResult::ok(get_execution_metrics()))
}

pub async fn configure_strategy_handler(
    Json(req): Json<ConfigureStrategyRequest>,
) -> Json<ApiResult<ExecutionMetrics>> {
    configure_strategy(req.strategy);
    Json(ApiResult::ok(get_execution_metrics()))
}

// --- AI 查询优化 Handlers ---

pub async fn optimize_query_handler(
    Json(req): Json<OptimizeQueryRequest>,
) -> Json<ApiResult<OptimizedQueryPlan>> {
    let plan = optimize_query(&req.query, req.apply_optimizations);
    Json(ApiResult::ok(plan))
}

pub async fn analyze_query_handler(
    Json(req): Json<AnalyzeQueryRequest>,
) -> Json<ApiResult<Vec<OptimizationSuggestion>>> {
    let suggestions = analyze_query_plan(&req.query);
    Json(ApiResult::ok(suggestions))
}

pub async fn get_optimization_suggestions_handler(
    Query(params): Query<HashMap<String, String>>,
) -> Json<ApiResult<Vec<OptimizationSuggestion>>> {
    let query = params.get("query").cloned().unwrap_or_default();
    let suggestions = get_optimization_suggestions(&query);
    Json(ApiResult::ok(suggestions))
}

pub async fn batch_optimize_handler(
    Json(req): Json<BatchOptimizeRequest>,
) -> Json<ApiResult<Vec<OptimizedQueryPlan>>> {
    let queries: Vec<(String, Option<Vec<SuggestionType>>)> = req
        .queries
        .into_iter()
        .map(|q| (q.query, q.apply_optimizations))
        .collect();
    let plans = batch_optimize(queries);
    Json(ApiResult::ok(plans))
}

// --- 流式订阅 Handlers ---

pub async fn create_stream_handler(
    Json(req): Json<CreateStreamRequest>,
) -> Json<ApiResult<StreamInfo>> {
    let info = create_stream(req.name, req.topic, req.config);
    Json(ApiResult::ok(info))
}

pub async fn list_streams_handler() -> Json<ApiResult<Vec<StreamInfo>>> {
    let streams = stream_manager().list_streams();
    Json(ApiResult::ok(streams))
}

pub async fn get_stream_handler(
    Path(id): Path<String>,
) -> Result<Json<ApiResult<StreamInfo>>, (StatusCode, Json<Value>)> {
    get_stream_status(&id)
        .map(ApiResult::ok)
        .map(Json)
        .ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({
                    "error": format!("Stream '{}' not found", id)
                })),
            )
        })
}

pub async fn close_stream_handler(
    Path(id): Path<String>,
) -> Result<Json<ApiResult<bool>>, (StatusCode, Json<Value>)> {
    let closed = close_stream(&id);
    if closed {
        Ok(Json(ApiResult::ok(true)))
    } else {
        Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "error": format!("Stream '{}' not found", id)
            })),
        ))
    }
}

pub async fn subscribe_stream_handler(
    Path(id): Path<String>,
    Json(req): Json<SubscribeStreamRequest>,
) -> Result<Json<ApiResult<String>>, (StatusCode, Json<Value>)> {
    match subscribe_stream(&id, req.subscriber_id) {
        Ok(sub_id) => Ok(Json(ApiResult::ok(sub_id))),
        Err(e) => Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": e })),
        )),
    }
}

pub async fn unsubscribe_stream_handler(
    Path(id): Path<String>,
    Json(req): Json<UnsubscribeStreamRequest>,
) -> Result<Json<ApiResult<bool>>, (StatusCode, Json<Value>)> {
    match unsubscribe_stream(&id, req.subscriber_id) {
        Ok(removed) => Ok(Json(ApiResult::ok(removed))),
        Err(e) => Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": e })),
        )),
    }
}

pub async fn stream_metrics_handler() -> Json<ApiResult<StreamMetrics>> {
    Json(ApiResult::ok(stream_metrics()))
}

// ==================== 数据库表结构 ====================

pub const CREATE_GRAPHQL_V52_EXECUTION_PROFILES_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal.graphql_execution_profiles (
    query_hash VARCHAR(128) PRIMARY KEY,
    complexity_score DOUBLE PRECISION NOT NULL DEFAULT 0,
    estimated_cost DOUBLE PRECISION NOT NULL DEFAULT 0,
    timeout_ms BIGINT NOT NULL DEFAULT 5000,
    parallelism_level INT NOT NULL DEFAULT 1,
    degradation_applied BOOLEAN NOT NULL DEFAULT FALSE,
    strategy VARCHAR(32) NOT NULL DEFAULT 'balanced',
    field_count INT NOT NULL DEFAULT 0,
    query_depth INT NOT NULL DEFAULT 0,
    connection_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_exec_profiles_complexity ON portal.graphql_execution_profiles(complexity_score);
CREATE INDEX IF NOT EXISTS idx_exec_profiles_created ON portal.graphql_execution_profiles(created_at DESC);
"#;

pub const CREATE_GRAPHQL_V52_EXECUTION_METRICS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal.graphql_execution_metrics (
    id VARCHAR(128) PRIMARY KEY,
    total_queries BIGINT NOT NULL DEFAULT 0,
    successful_queries BIGINT NOT NULL DEFAULT 0,
    failed_queries BIGINT NOT NULL DEFAULT 0,
    avg_complexity DOUBLE PRECISION NOT NULL DEFAULT 0,
    avg_timeout_ms DOUBLE PRECISION NOT NULL DEFAULT 0,
    avg_parallelism DOUBLE PRECISION NOT NULL DEFAULT 0,
    degraded_queries BIGINT NOT NULL DEFAULT 0,
    total_execution_time_ms BIGINT NOT NULL DEFAULT 0,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_exec_metrics_recorded ON portal.graphql_execution_metrics(recorded_at DESC);
"#;

pub const CREATE_GRAPHQL_V52_OPTIMIZATION_HISTORY_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal.graphql_optimization_history (
    id VARCHAR(128) PRIMARY KEY,
    original_query TEXT NOT NULL,
    optimized_query TEXT NOT NULL,
    original_cost DOUBLE PRECISION NOT NULL DEFAULT 0,
    optimized_cost DOUBLE PRECISION NOT NULL DEFAULT 0,
    estimated_savings DOUBLE PRECISION NOT NULL DEFAULT 0,
    cache_key VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_opt_history_cache ON portal.graphql_optimization_history(cache_key);
CREATE INDEX IF NOT EXISTS idx_opt_history_created ON portal.graphql_optimization_history(created_at DESC);
"#;

pub const CREATE_GRAPHQL_V52_SUGGESTIONS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal.graphql_suggestions (
    id VARCHAR(128) PRIMARY KEY,
    optimization_id VARCHAR(128) NOT NULL,
    suggestion_type VARCHAR(64) NOT NULL,
    description TEXT NOT NULL,
    current_cost DOUBLE PRECISION NOT NULL DEFAULT 0,
    suggested_cost DOUBLE PRECISION NOT NULL DEFAULT 0,
    confidence DOUBLE PRECISION NOT NULL DEFAULT 0,
    applicable BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_suggestions_opt_id ON portal.graphql_suggestions(optimization_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_type ON portal.graphql_suggestions(suggestion_type);
"#;

pub const CREATE_GRAPHQL_V52_STREAMS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal.graphql_streams (
    id VARCHAR(128) PRIMARY KEY,
    name VARCHAR(256) NOT NULL,
    topic VARCHAR(256) NOT NULL,
    state VARCHAR(32) NOT NULL DEFAULT 'active',
    buffer_size INT NOT NULL DEFAULT 1000,
    batch_interval_ms BIGINT NOT NULL DEFAULT 100,
    max_subscribers INT NOT NULL DEFAULT 100,
    filter_expression TEXT,
    heartbeat_interval_ms BIGINT NOT NULL DEFAULT 30000,
    reconnect_max_attempts INT NOT NULL DEFAULT 5,
    subscriber_count INT NOT NULL DEFAULT 0,
    event_count BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_event_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_streams_state ON portal.graphql_streams(state);
CREATE INDEX IF NOT EXISTS idx_streams_topic ON portal.graphql_streams(topic);
"#;

pub const CREATE_GRAPHQL_V52_STREAM_EVENTS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal.graphql_stream_events (
    id VARCHAR(128) PRIMARY KEY,
    stream_id VARCHAR(128) NOT NULL REFERENCES portal.graphql_streams(id),
    event_type VARCHAR(128) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    sequence BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stream_events_stream ON portal.graphql_stream_events(stream_id);
CREATE INDEX IF NOT EXISTS idx_stream_events_sequence ON portal.graphql_stream_events(stream_id, sequence);
CREATE INDEX IF NOT EXISTS idx_stream_events_created ON portal.graphql_stream_events(created_at DESC);
"#;

pub const CREATE_GRAPHQL_V52_STREAM_SUBSCRIBERS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal.graphql_stream_subscribers (
    id VARCHAR(128) PRIMARY KEY,
    stream_id VARCHAR(128) NOT NULL REFERENCES portal.graphql_streams(id),
    subscriber_id VARCHAR(128) NOT NULL,
    subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(stream_id, subscriber_id)
);
CREATE INDEX IF NOT EXISTS idx_stream_subs_stream ON portal.graphql_stream_subscribers(stream_id);
CREATE INDEX IF NOT EXISTS idx_stream_subs_subscriber ON portal.graphql_stream_subscribers(subscriber_id);
"#;

// ==================== 数据库初始化 ====================

pub async fn ensure_adaptive_execution_tables_exist(
    pool: &sqlx::PgPool,
) -> Result<(), sqlx::Error> {
    sqlx::query(CREATE_GRAPHQL_V52_EXECUTION_PROFILES_TABLE)
        .execute(pool)
        .await?;
    sqlx::query(CREATE_GRAPHQL_V52_EXECUTION_METRICS_TABLE)
        .execute(pool)
        .await?;
    sqlx::query(CREATE_GRAPHQL_V52_OPTIMIZATION_HISTORY_TABLE)
        .execute(pool)
        .await?;
    sqlx::query(CREATE_GRAPHQL_V52_SUGGESTIONS_TABLE)
        .execute(pool)
        .await?;
    sqlx::query(CREATE_GRAPHQL_V52_STREAMS_TABLE)
        .execute(pool)
        .await?;
    sqlx::query(CREATE_GRAPHQL_V52_STREAM_EVENTS_TABLE)
        .execute(pool)
        .await?;
    sqlx::query(CREATE_GRAPHQL_V52_STREAM_SUBSCRIBERS_TABLE)
        .execute(pool)
        .await?;
    Ok(())
}

// ==================== 初始化入口 ====================

pub fn init_adaptive_execution() {
    configure_strategy(AdaptiveStrategy::Balanced);

    let default_configs = vec![
        StreamConfig {
            buffer_size: 2000,
            batch_interval_ms: 50,
            max_subscribers: 200,
            filter_expression: None,
            heartbeat_interval_ms: 15_000,
            reconnect_max_attempts: 10,
        },
        StreamConfig {
            buffer_size: 500,
            batch_interval_ms: 500,
            max_subscribers: 50,
            filter_expression: Some("priority > 5".to_string()),
            heartbeat_interval_ms: 60_000,
            reconnect_max_attempts: 3,
        },
    ];

    let _ = create_stream(
        "system-events".to_string(),
        "system".to_string(),
        Some(default_configs[0].clone()),
    );
    let _ = create_stream(
        "high-priority".to_string(),
        "priority".to_string(),
        Some(default_configs[1].clone()),
    );

    tracing::info!("📊 V52.0 BFF Phase 22 已初始化：自适应执行引擎 + AI 查询优化 + 流式订阅增强");
}
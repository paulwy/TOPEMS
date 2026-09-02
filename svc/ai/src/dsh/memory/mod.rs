//! DSH AI Agent 记忆系统模块
//!
//! 提供短期记忆、长期记忆、记忆检索、记忆更新与遗忘等能力。

use std::collections::HashMap;
use std::sync::Arc;

use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use tracing::{debug, info};

// ============================================================================
// 类型定义
// ============================================================================

/// 记忆类型
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum MemoryType {
    /// 短期记忆（当前会话上下文）
    ShortTerm,
    /// 长期记忆（历史对话、用户偏好、业务知识）
    LongTerm,
    /// 工作记忆（当前任务相关信息）
    Working,
    /// 情景记忆（具体事件和经历）
    Episodic,
    /// 语义记忆（通用知识和事实）
    Semantic,
}

impl MemoryType {
    pub fn as_str(&self) -> &str {
        match self {
            MemoryType::ShortTerm => "short_term",
            MemoryType::LongTerm => "long_term",
            MemoryType::Working => "working",
            MemoryType::Episodic => "episodic",
            MemoryType::Semantic => "semantic",
        }
    }
}

/// 记忆条目
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryItem {
    /// 记忆 ID
    pub id: String,
    /// 记忆类型
    pub memory_type: MemoryType,
    /// 记忆内容
    pub content: String,
    /// 记忆摘要（用于快速检索）
    pub summary: String,
    /// 记忆关键词（用于索引和检索）
    pub keywords: Vec<String>,
    /// 关联实体（知识图谱实体 ID）
    pub related_entities: Vec<String>,
    /// 重要性评分（0-1，越高越重要）
    pub importance: f64,
    /// 访问次数
    pub access_count: u64,
    /// 创建时间
    pub created_at: String,
    /// 最后更新时间
    pub updated_at: String,
    /// 最后访问时间
    pub last_accessed_at: String,
    /// 过期时间（可选，None 表示永不过期）
    pub expires_at: Option<String>,
    /// 会话 ID（短期记忆关联的会话）
    pub session_id: Option<String>,
    /// 用户 ID
    pub user_id: Option<String>,
    /// 元数据
    pub metadata: HashMap<String, String>,
}

impl MemoryItem {
    /// 创建新的记忆条目
    pub fn new(memory_type: MemoryType, content: &str) -> Self {
        let now = chrono::Utc::now().to_rfc3339();
        Self {
            id: format!("memory_{}", uuid::Uuid::new_v4()),
            memory_type,
            content: content.to_string(),
            summary: content.chars().take(100).collect(),
            keywords: Vec::new(),
            related_entities: Vec::new(),
            importance: 0.5,
            access_count: 0,
            created_at: now.clone(),
            updated_at: now.clone(),
            last_accessed_at: now,
            expires_at: None,
            session_id: None,
            user_id: None,
            metadata: HashMap::new(),
        }
    }

    /// 添加关键词
    pub fn add_keyword(&mut self, keyword: &str) {
        if !self.keywords.contains(&keyword.to_string()) {
            self.keywords.push(keyword.to_string());
        }
    }

    /// 添加关联实体
    pub fn add_related_entity(&mut self, entity_id: &str) {
        if !self.related_entities.contains(&entity_id.to_string()) {
            self.related_entities.push(entity_id.to_string());
        }
    }

    /// 设置重要性
    pub fn with_importance(mut self, importance: f64) -> Self {
        self.importance = importance.clamp(0.0, 1.0);
        self
    }

    /// 设置会话 ID
    pub fn with_session_id(mut self, session_id: &str) -> Self {
        self.session_id = Some(session_id.to_string());
        self
    }

    /// 设置过期时间（秒）
    pub fn with_ttl(mut self, ttl_seconds: u64) -> Self {
        let expires = chrono::Utc::now() + chrono::Duration::seconds(ttl_seconds as i64);
        self.expires_at = Some(expires.to_rfc3339());
        self
    }

    /// 检查是否已过期
    pub fn is_expired(&self) -> bool {
        if let Some(expires) = &self.expires_at {
            if let Ok(expires_time) = chrono::DateTime::parse_from_rfc3339(expires) {
                return expires_time < chrono::Utc::now();
            }
        }
        false
    }

    /// 计算相关性分数（简单实现：关键词匹配）
    pub fn relevance_score(&self, query: &str) -> f64 {
        let query_lower = query.to_lowercase();
        let mut score = 0.0;

        // 关键词匹配
        for keyword in &self.keywords {
            if query_lower.contains(&keyword.to_lowercase()) {
                score += 0.3;
            }
        }

        // 内容包含
        if self.content.to_lowercase().contains(&query_lower) {
            score += 0.4;
        }

        // 摘要包含
        if self.summary.to_lowercase().contains(&query_lower) {
            score += 0.2;
        }

        // 重要性加成
        score += self.importance * 0.1;

        score.clamp(0.0, 1.0)
    }
}

/// 记忆检索结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemorySearchResult {
    /// 记忆条目
    pub memory: MemoryItem,
    /// 相关性分数（0-1）
    pub relevance_score: f64,
    /// 排名
    pub rank: usize,
}

/// 记忆检索配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemorySearchConfig {
    /// 最大返回结果数
    pub top_k: usize,
    /// 最小相关性分数
    pub min_relevance: f64,
    /// 记忆类型过滤（None 表示所有类型）
    pub memory_type_filter: Option<MemoryType>,
    /// 会话 ID 过滤
    pub session_id_filter: Option<String>,
    /// 用户 ID 过滤
    pub user_id_filter: Option<String>,
    /// 是否包含过期记忆
    pub include_expired: bool,
}

impl Default for MemorySearchConfig {
    fn default() -> Self {
        Self {
            top_k: 5,
            min_relevance: 0.1,
            memory_type_filter: None,
            session_id_filter: None,
            user_id_filter: None,
            include_expired: false,
        }
    }
}

/// 记忆系统配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryConfig {
    /// 是否启用
    pub enabled: bool,
    /// 短期记忆最大条目数
    pub short_term_max_items: usize,
    /// 长期记忆最大条目数
    pub long_term_max_items: usize,
    /// 工作记忆最大条目数
    pub working_max_items: usize,
    /// 短期记忆默认 TTL（秒）
    pub short_term_default_ttl: u64,
    /// 工作记忆默认 TTL（秒）
    pub working_default_ttl: u64,
    /// 遗忘阈值（重要性低于此值的记忆可能被遗忘）
    pub forgetting_threshold: f64,
    /// 是否启用自动遗忘
    pub enable_auto_forgetting: bool,
}

impl Default for MemoryConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            short_term_max_items: 100,
            long_term_max_items: 10000,
            working_max_items: 50,
            short_term_default_ttl: 3600, // 1 小时
            working_default_ttl: 600,     // 10 分钟
            forgetting_threshold: 0.1,
            enable_auto_forgetting: true,
        }
    }
}

/// 记忆系统统计
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct MemoryStats {
    /// 总记忆数
    pub total_memories: u64,
    /// 短期记忆数
    pub short_term_count: u64,
    /// 长期记忆数
    pub long_term_count: u64,
    /// 工作记忆数
    pub working_count: u64,
    /// 情景记忆数
    pub episodic_count: u64,
    /// 语义记忆数
    pub semantic_count: u64,
    /// 过期记忆数
    pub expired_count: u64,
    /// 总访问次数
    pub total_accesses: u64,
    /// 遗忘次数
    pub forgotten_count: u64,
}

// ============================================================================
// 记忆系统
// ============================================================================

/// Agent 记忆系统
#[derive(Clone)]
pub struct MemorySystem {
    /// 配置
    config: MemoryConfig,
    /// 记忆存储（ID -> 记忆条目）
    memories: Arc<Mutex<HashMap<String, MemoryItem>>>,
    /// 关键词索引（关键词 -> 记忆 ID 列表）
    keyword_index: Arc<Mutex<HashMap<String, Vec<String>>>>,
    /// 会话索引（会话 ID -> 记忆 ID 列表）
    session_index: Arc<Mutex<HashMap<String, Vec<String>>>>,
    /// 统计
    stats: Arc<Mutex<MemoryStats>>,
    /// 遗忘计数
    forgotten_count: Arc<Mutex<u64>>,
}

impl MemorySystem {
    /// 创建新的记忆系统
    pub fn new(config: MemoryConfig) -> Self {
        let stats = MemoryStats {
            total_memories: 0,
            short_term_count: 0,
            long_term_count: 0,
            working_count: 0,
            episodic_count: 0,
            semantic_count: 0,
            expired_count: 0,
            total_accesses: 0,
            forgotten_count: 0,
        };

        Self {
            config,
            memories: Arc::new(Mutex::new(HashMap::new())),
            keyword_index: Arc::new(Mutex::new(HashMap::new())),
            session_index: Arc::new(Mutex::new(HashMap::new())),
            stats: Arc::new(Mutex::new(stats)),
            forgotten_count: Arc::new(Mutex::new(0)),
        }
    }

    /// 使用默认配置创建
    pub fn with_defaults() -> Self {
        Self::new(MemoryConfig::default())
    }

    /// 获取配置
    pub fn config(&self) -> &MemoryConfig {
        &self.config
    }

    /// 存储记忆
    pub fn store(&self, mut memory: MemoryItem) -> String {
        if !self.config.enabled {
            return memory.id.clone();
        }

        // 为短期记忆和工作记忆设置默认 TTL
        if memory.expires_at.is_none() {
            match memory.memory_type {
                MemoryType::ShortTerm => {
                    memory = memory.with_ttl(self.config.short_term_default_ttl);
                }
                MemoryType::Working => {
                    memory = memory.with_ttl(self.config.working_default_ttl);
                }
                _ => {}
            }
        }

        let memory_id = memory.id.clone();
        let memory_type = memory.memory_type;
        let keywords = memory.keywords.clone();
        let session_id = memory.session_id.clone();

        // 更新关键词索引
        let mut keyword_index = self.keyword_index.lock();
        for keyword in &keywords {
            keyword_index
                .entry(keyword.clone())
                .or_insert_with(Vec::new)
                .push(memory_id.clone());
        }
        drop(keyword_index);

        // 更新会话索引
        if let Some(sid) = &session_id {
            let mut session_index = self.session_index.lock();
            session_index
                .entry(sid.clone())
                .or_insert_with(Vec::new)
                .push(memory_id.clone());
            drop(session_index);
        }

        // 存储记忆
        let mut memories = self.memories.lock();
        memories.insert(memory_id.clone(), memory);
        drop(memories);

        // 更新统计
        let mut stats = self.stats.lock();
        stats.total_memories += 1;
        match memory_type {
            MemoryType::ShortTerm => stats.short_term_count += 1,
            MemoryType::LongTerm => stats.long_term_count += 1,
            MemoryType::Working => stats.working_count += 1,
            MemoryType::Episodic => stats.episodic_count += 1,
            MemoryType::Semantic => stats.semantic_count += 1,
        }
        drop(stats);

        // 自动遗忘检查
        if self.config.enable_auto_forgetting {
            self.check_forgetting(memory_type);
        }

        info!(
            memory_id = %memory_id,
            memory_type = %memory_type.as_str(),
            "Memory stored"
        );

        memory_id
    }

    /// 获取记忆
    pub fn get(&self, memory_id: &str) -> Option<MemoryItem> {
        let mut memories = self.memories.lock();
        if let Some(memory) = memories.get_mut(memory_id) {
            // 检查是否过期
            if memory.is_expired() {
                return None;
            }
            // 更新访问计数和时间
            memory.access_count += 1;
            memory.last_accessed_at = chrono::Utc::now().to_rfc3339();
            let result = memory.clone();
            drop(memories);

            // 更新统计
            self.stats.lock().total_accesses += 1;

            Some(result)
        } else {
            None
        }
    }

    /// 检索记忆
    pub fn search(
        &self,
        query: &str,
        config: Option<MemorySearchConfig>,
    ) -> Vec<MemorySearchResult> {
        let search_config = config.unwrap_or_default();

        let memories = self.memories.lock();
        let mut results: Vec<MemorySearchResult> = Vec::new();

        for memory in memories.values() {
            // 过滤过期记忆
            if !search_config.include_expired && memory.is_expired() {
                continue;
            }

            // 过滤记忆类型
            if let Some(filter_type) = search_config.memory_type_filter {
                if memory.memory_type != filter_type {
                    continue;
                }
            }

            // 过滤会话 ID
            if let Some(session_filter) = &search_config.session_id_filter {
                if memory.session_id.as_deref() != Some(session_filter) {
                    continue;
                }
            }

            // 过滤用户 ID
            if let Some(user_filter) = &search_config.user_id_filter {
                if memory.user_id.as_deref() != Some(user_filter) {
                    continue;
                }
            }

            // 计算相关性分数
            let score = memory.relevance_score(query);
            if score >= search_config.min_relevance {
                results.push(MemorySearchResult {
                    memory: memory.clone(),
                    relevance_score: score,
                    rank: 0,
                });
            }
        }
        drop(memories);

        // 按相关性分数排序
        results.sort_by(|a, b| {
            b.relevance_score
                .partial_cmp(&a.relevance_score)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        // 限制返回数量并设置排名
        let top_k = search_config.top_k;
        results.truncate(top_k);
        for (i, result) in results.iter_mut().enumerate() {
            result.rank = i + 1;
        }

        debug!(
            query = %query,
            results_count = results.len(),
            "Memory search completed"
        );

        results
    }

    /// 删除记忆
    pub fn delete(&self, memory_id: &str) -> bool {
        let mut memories = self.memories.lock();
        if let Some(memory) = memories.remove(memory_id) {
            // 从关键词索引中移除
            let mut keyword_index = self.keyword_index.lock();
            for keyword in &memory.keywords {
                if let Some(ids) = keyword_index.get_mut(keyword) {
                    ids.retain(|id| id != memory_id);
                }
            }
            drop(keyword_index);

            // 从会话索引中移除
            if let Some(sid) = &memory.session_id {
                let mut session_index = self.session_index.lock();
                if let Some(ids) = session_index.get_mut(sid) {
                    ids.retain(|id| id != memory_id);
                }
                drop(session_index);
            }

            info!(memory_id = %memory_id, "Memory deleted");
            true
        } else {
            false
        }
    }

    /// 获取会话的所有记忆
    pub fn get_session_memories(&self, session_id: &str) -> Vec<MemoryItem> {
        let session_index = self.session_index.lock();
        let memory_ids = session_index.get(session_id).cloned().unwrap_or_default();
        drop(session_index);

        let memories = self.memories.lock();
        memory_ids
            .iter()
            .filter_map(|id| memories.get(id).cloned())
            .filter(|m| !m.is_expired())
            .collect()
    }

    /// 清除会话记忆
    pub fn clear_session_memories(&self, session_id: &str) -> usize {
        let session_index = self.session_index.lock();
        let memory_ids = session_index.get(session_id).cloned().unwrap_or_default();
        drop(session_index);

        let count = memory_ids.len();
        for memory_id in &memory_ids {
            self.delete(memory_id);
        }

        // 从会话索引中移除
        let mut session_index = self.session_index.lock();
        session_index.remove(session_id);
        drop(session_index);

        info!(session_id = %session_id, cleared = count, "Session memories cleared");
        count
    }

    /// 将短期记忆提升为长期记忆
    pub fn promote_to_long_term(&self, memory_id: &str) -> bool {
        let mut memories = self.memories.lock();
        if let Some(memory) = memories.get_mut(memory_id) {
            if memory.memory_type == MemoryType::ShortTerm {
                memory.memory_type = MemoryType::LongTerm;
                memory.expires_at = None; // 长期记忆不过期
                memory.importance = (memory.importance + 0.3).min(1.0);
                memory.updated_at = chrono::Utc::now().to_rfc3339();

                // 更新统计
                let mut stats = self.stats.lock();
                stats.short_term_count -= 1;
                stats.long_term_count += 1;
                drop(stats);

                info!(memory_id = %memory_id, "Memory promoted to long-term");
                true
            } else {
                false
            }
        } else {
            false
        }
    }

    /// 检查并执行遗忘
    fn check_forgetting(&self, memory_type: MemoryType) {
        let max_items = match memory_type {
            MemoryType::ShortTerm => self.config.short_term_max_items,
            MemoryType::LongTerm => self.config.long_term_max_items,
            MemoryType::Working => self.config.working_max_items,
            _ => return,
        };

        let memories = self.memories.lock();
        let same_type_memories: Vec<&MemoryItem> = memories
            .values()
            .filter(|m| m.memory_type == memory_type)
            .collect();

        if same_type_memories.len() <= max_items {
            return;
        }

        // 找出需要遗忘的记忆（重要性最低、访问最少、最旧的）
        let mut to_forget: Vec<&MemoryItem> = same_type_memories
            .iter()
            .filter(|m| m.importance < self.config.forgetting_threshold)
            .copied()
            .collect();

        to_forget.sort_by(|a, b| {
            a.importance
                .partial_cmp(&b.importance)
                .unwrap_or(std::cmp::Ordering::Equal)
                .then(a.access_count.cmp(&b.access_count))
                .then(a.created_at.cmp(&b.created_at))
        });

        let excess = same_type_memories.len() - max_items;
        let forget_count = excess.min(to_forget.len());
        let ids_to_forget: Vec<String> = to_forget
            .iter()
            .take(forget_count)
            .map(|m| m.id.clone())
            .collect();
        drop(memories);

        for id in &ids_to_forget {
            self.delete(id);
            *self.forgotten_count.lock() += 1;
        }

        if forget_count > 0 {
            debug!(
                memory_type = %memory_type.as_str(),
                forgotten = forget_count,
                "Auto-forgetting executed"
            );
        }
    }

    /// 清理过期记忆
    pub fn cleanup_expired(&self) -> usize {
        let memories = self.memories.lock();
        let expired_ids: Vec<String> = memories
            .values()
            .filter(|m| m.is_expired())
            .map(|m| m.id.clone())
            .collect();
        drop(memories);

        let count = expired_ids.len();
        for id in &expired_ids {
            self.delete(id);
        }

        if count > 0 {
            info!(count = count, "Expired memories cleaned up");
        }

        count
    }

    /// 获取统计
    pub fn get_stats(&self) -> MemoryStats {
        let mut stats = self.stats.lock().clone();
        stats.forgotten_count = *self.forgotten_count.lock();

        // 计算过期记忆数
        let memories = self.memories.lock();
        stats.expired_count = memories.values().filter(|m| m.is_expired()).count() as u64;

        stats
    }

    /// 获取所有记忆（用于调试和导出）
    pub fn list_all(&self) -> Vec<MemoryItem> {
        self.memories.lock().values().cloned().collect()
    }

    /// 清空所有记忆
    pub fn clear_all(&self) {
        self.memories.lock().clear();
        self.keyword_index.lock().clear();
        self.session_index.lock().clear();
        *self.stats.lock() = MemoryStats::default();
        *self.forgotten_count.lock() = 0;
        info!("All memories cleared");
    }
}

// ============================================================================
// 测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_memory_system() -> MemorySystem {
        MemorySystem::with_defaults()
    }

    #[test]
    fn test_memory_type_as_str() {
        assert_eq!(MemoryType::ShortTerm.as_str(), "short_term");
        assert_eq!(MemoryType::LongTerm.as_str(), "long_term");
        assert_eq!(MemoryType::Working.as_str(), "working");
        assert_eq!(MemoryType::Episodic.as_str(), "episodic");
        assert_eq!(MemoryType::Semantic.as_str(), "semantic");
    }

    #[test]
    fn test_memory_item_creation() {
        let memory = MemoryItem::new(MemoryType::ShortTerm, "测试记忆内容");
        assert_eq!(memory.content, "测试记忆内容");
        assert_eq!(memory.memory_type, MemoryType::ShortTerm);
        assert_eq!(memory.importance, 0.5);
        assert_eq!(memory.access_count, 0);
    }

    #[test]
    fn test_memory_item_add_keyword() {
        let mut memory = MemoryItem::new(MemoryType::ShortTerm, "测试");
        memory.add_keyword("关键词1");
        memory.add_keyword("关键词1"); // 重复添加
        assert_eq!(memory.keywords.len(), 1);
    }

    #[test]
    fn test_memory_item_add_related_entity() {
        let mut memory = MemoryItem::new(MemoryType::ShortTerm, "测试");
        memory.add_related_entity("entity1");
        assert_eq!(memory.related_entities.len(), 1);
    }

    #[test]
    fn test_memory_item_with_importance() {
        let memory = MemoryItem::new(MemoryType::ShortTerm, "测试").with_importance(0.8);
        assert_eq!(memory.importance, 0.8);
    }

    #[test]
    fn test_memory_item_with_session_id() {
        let memory = MemoryItem::new(MemoryType::ShortTerm, "测试").with_session_id("session1");
        assert_eq!(memory.session_id, Some("session1".to_string()));
    }

    #[test]
    fn test_memory_item_with_ttl() {
        let memory = MemoryItem::new(MemoryType::ShortTerm, "测试").with_ttl(3600);
        assert!(memory.expires_at.is_some());
        assert!(!memory.is_expired());
    }

    #[test]
    fn test_memory_item_relevance_score() {
        let mut memory = MemoryItem::new(MemoryType::LongTerm, "这是关于人工智能的测试内容");
        memory.add_keyword("人工智能");
        memory.add_keyword("测试");

        let score = memory.relevance_score("人工智能");
        assert!(score > 0.0);
    }

    #[test]
    fn test_memory_config_default() {
        let config = MemoryConfig::default();
        assert!(config.enabled);
        assert_eq!(config.short_term_max_items, 100);
        assert_eq!(config.long_term_max_items, 10000);
    }

    #[test]
    fn test_memory_system_creation() {
        let system = create_test_memory_system();
        assert!(system.config().enabled);
    }

    #[test]
    fn test_store_and_get_memory() {
        let system = create_test_memory_system();
        let memory = MemoryItem::new(MemoryType::ShortTerm, "测试记忆");
        let id = system.store(memory);

        let retrieved = system.get(&id);
        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap().content, "测试记忆");
    }

    #[test]
    fn test_memory_access_count() {
        let system = create_test_memory_system();
        let memory = MemoryItem::new(MemoryType::ShortTerm, "测试记忆");
        let id = system.store(memory);

        system.get(&id);
        system.get(&id);

        let retrieved = system.get(&id).unwrap();
        assert_eq!(retrieved.access_count, 3);
    }

    #[test]
    fn test_search_memory() {
        let system = create_test_memory_system();

        let mut m1 = MemoryItem::new(MemoryType::LongTerm, "人工智能是计算机科学的一个分支");
        m1.add_keyword("人工智能");
        system.store(m1);

        let mut m2 = MemoryItem::new(MemoryType::LongTerm, "机器学习是人工智能的一个子领域");
        m2.add_keyword("机器学习");
        system.store(m2);

        let results = system.search("人工智能", None);
        assert!(!results.is_empty());
        assert!(results[0].relevance_score > 0.0);
    }

    #[test]
    fn test_search_with_config() {
        let system = create_test_memory_system();

        let m1 = MemoryItem::new(MemoryType::ShortTerm, "短期记忆");
        system.store(m1);

        let m2 = MemoryItem::new(MemoryType::LongTerm, "长期记忆");
        system.store(m2);

        let config = MemorySearchConfig {
            memory_type_filter: Some(MemoryType::LongTerm),
            ..Default::default()
        };

        let results = system.search("记忆", Some(config));
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].memory.memory_type, MemoryType::LongTerm);
    }

    #[test]
    fn test_delete_memory() {
        let system = create_test_memory_system();
        let memory = MemoryItem::new(MemoryType::ShortTerm, "测试记忆");
        let id = system.store(memory);

        assert!(system.delete(&id));
        assert!(system.get(&id).is_none());
    }

    #[test]
    fn test_session_memories() {
        let system = create_test_memory_system();

        let m1 = MemoryItem::new(MemoryType::ShortTerm, "会话记忆1").with_session_id("session1");
        system.store(m1);

        let m2 = MemoryItem::new(MemoryType::ShortTerm, "会话记忆2").with_session_id("session1");
        system.store(m2);

        let m3 = MemoryItem::new(MemoryType::ShortTerm, "其他会话记忆").with_session_id("session2");
        system.store(m3);

        let session_memories = system.get_session_memories("session1");
        assert_eq!(session_memories.len(), 2);
    }

    #[test]
    fn test_clear_session_memories() {
        let system = create_test_memory_system();

        let m1 = MemoryItem::new(MemoryType::ShortTerm, "会话记忆1").with_session_id("session1");
        system.store(m1);

        let cleared = system.clear_session_memories("session1");
        assert_eq!(cleared, 1);
        assert!(system.get_session_memories("session1").is_empty());
    }

    #[test]
    fn test_promote_to_long_term() {
        let system = create_test_memory_system();
        let memory = MemoryItem::new(MemoryType::ShortTerm, "重要记忆");
        let id = system.store(memory);

        assert!(system.promote_to_long_term(&id));

        let promoted = system.get(&id).unwrap();
        assert_eq!(promoted.memory_type, MemoryType::LongTerm);
        assert!(promoted.expires_at.is_none());
    }

    #[test]
    fn test_memory_stats() {
        let system = create_test_memory_system();

        system.store(MemoryItem::new(MemoryType::ShortTerm, "短期"));
        system.store(MemoryItem::new(MemoryType::LongTerm, "长期"));
        system.store(MemoryItem::new(MemoryType::Working, "工作"));

        let stats = system.get_stats();
        assert_eq!(stats.total_memories, 3);
        assert_eq!(stats.short_term_count, 1);
        assert_eq!(stats.long_term_count, 1);
        assert_eq!(stats.working_count, 1);
    }

    #[test]
    fn test_clear_all() {
        let system = create_test_memory_system();
        system.store(MemoryItem::new(MemoryType::ShortTerm, "记忆1"));
        system.store(MemoryItem::new(MemoryType::LongTerm, "记忆2"));

        system.clear_all();
        assert_eq!(system.get_stats().total_memories, 0);
    }

    #[test]
    fn test_memory_search_config_default() {
        let config = MemorySearchConfig::default();
        assert_eq!(config.top_k, 5);
        assert_eq!(config.min_relevance, 0.1);
        assert!(config.memory_type_filter.is_none());
        assert!(!config.include_expired);
    }
}

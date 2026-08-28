//! DSH AI RAG（检索增强生成）增强模块
//!
//! 提供 RAG 增强能力，包括：
//! - 查询重写和扩展
//! - 混合检索（向量检索 + 关键词检索）
//! - 重排序（Rerank）
//! - 多轮对话上下文检索
//! - 检索结果聚合和排序
//! - 上下文窗口管理

use std::collections::HashMap;
use std::sync::Arc;

use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use tracing::{debug, info};

// ============================================================================
// 类型定义
// ============================================================================

/// 检索文档
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RetrievedDocument {
    /// 文档 ID
    pub doc_id: String,
    /// 文档标题
    pub title: String,
    /// 文档内容
    pub content: String,
    /// 文档来源
    pub source: String,
    /// 相似度分数（0-1，越高越相关）
    pub score: f64,
    /// 检索方法（vector / keyword / hybrid）
    pub retrieval_method: String,
    /// 排名（重排序前）
    pub original_rank: usize,
    /// 排名（重排序后）
    pub reranked_rank: Option<usize>,
    /// 元数据
    pub metadata: HashMap<String, String>,
}

impl RetrievedDocument {
    /// 创建新的检索文档
    pub fn new(doc_id: &str, title: &str, content: &str, score: f64) -> Self {
        Self {
            doc_id: doc_id.to_string(),
            title: title.to_string(),
            content: content.to_string(),
            source: "unknown".to_string(),
            score,
            retrieval_method: "vector".to_string(),
            original_rank: 0,
            reranked_rank: None,
            metadata: HashMap::new(),
        }
    }
}

/// 查询重写策略
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum QueryRewriteStrategy {
    /// 不重写
    None,
    /// 查询扩展（添加同义词）
    Expansion,
    /// 查询简化（去除停用词）
    Simplification,
    /// 查询分解（分解为子查询）
    Decomposition,
    /// 上下文感知重写（基于对话历史）
    ContextAware,
    /// 混合策略（扩展 + 简化）
    Hybrid,
}

/// 检索策略
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum RetrievalStrategy {
    /// 仅向量检索
    VectorOnly,
    /// 仅关键词检索
    KeywordOnly,
    /// 混合检索（向量 + 关键词）
    Hybrid,
    /// 多轮检索（先粗排后精排）
    MultiStage,
}

/// 重排序策略
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum RerankStrategy {
    /// 不重排序
    None,
    /// 基于相似度分数
    ScoreBased,
    /// 基于交叉编码器（需要外部模型）
    CrossEncoder,
    /// 基于 LLM 重排序
    LlmBased,
    /// 混合重排序（分数 + 多样性）
    Hybrid,
}

/// RAG 配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RagConfig {
    /// 是否启用 RAG
    pub enabled: bool,
    /// 查询重写策略
    pub query_rewrite_strategy: QueryRewriteStrategy,
    /// 检索策略
    pub retrieval_strategy: RetrievalStrategy,
    /// 重排序策略
    pub rerank_strategy: RerankStrategy,
    /// 检索结果数量（Top K）
    pub top_k: usize,
    /// 重排序后的结果数量
    pub rerank_top_k: usize,
    /// 相似度阈值（低于此分数的结果被过滤）
    pub similarity_threshold: f64,
    /// 最大上下文 token 数
    pub max_context_tokens: usize,
    /// 是否启用查询扩展
    pub enable_query_expansion: bool,
    /// 是否启用多样性优化
    pub enable_diversity: bool,
    /// 多样性权重（0-1，越高越注重多样性）
    pub diversity_weight: f64,
}

impl Default for RagConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            query_rewrite_strategy: QueryRewriteStrategy::ContextAware,
            retrieval_strategy: RetrievalStrategy::Hybrid,
            rerank_strategy: RerankStrategy::Hybrid,
            top_k: 10,
            rerank_top_k: 5,
            similarity_threshold: 0.3,
            max_context_tokens: 4000,
            enable_query_expansion: true,
            enable_diversity: true,
            diversity_weight: 0.3,
        }
    }
}

/// 检索请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RetrievalRequest {
    /// 查询文本
    pub query: String,
    /// 对话历史（用于上下文感知检索）
    pub conversation_history: Vec<ConversationMessage>,
    /// 检索数量（覆盖配置）
    pub top_k: Option<usize>,
    /// 相似度阈值（覆盖配置）
    pub similarity_threshold: Option<f64>,
    /// 过滤条件
    pub filters: Option<HashMap<String, String>>,
    /// 元数据过滤
    pub metadata_filters: Option<HashMap<String, Vec<String>>>,
}

/// 对话消息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationMessage {
    /// 角色（user / assistant / system）
    pub role: String,
    /// 内容
    pub content: String,
    /// 时间戳
    pub timestamp: Option<String>,
}

/// 检索响应
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RetrievalResponse {
    /// 原始查询
    pub original_query: String,
    /// 重写后的查询
    pub rewritten_query: String,
    /// 扩展查询列表
    pub expanded_queries: Vec<String>,
    /// 检索到的文档
    pub documents: Vec<RetrievedDocument>,
    /// 检索统计
    pub stats: RetrievalStats,
    /// 构建的上下文
    pub context: String,
}

/// 检索统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RetrievalStats {
    /// 向量检索结果数
    pub vector_results: usize,
    /// 关键词检索结果数
    pub keyword_results: usize,
    /// 合并后结果数
    pub merged_results: usize,
    /// 重排序后结果数
    pub reranked_results: usize,
    /// 过滤后结果数
    pub filtered_results: usize,
    /// 总耗时（毫秒）
    pub total_duration_ms: u64,
    /// 查询重写耗时（毫秒）
    pub query_rewrite_duration_ms: u64,
    /// 检索耗时（毫秒）
    pub retrieval_duration_ms: u64,
    /// 重排序耗时（毫秒）
    pub rerank_duration_ms: u64,
}

impl Default for RetrievalStats {
    fn default() -> Self {
        Self {
            vector_results: 0,
            keyword_results: 0,
            merged_results: 0,
            reranked_results: 0,
            filtered_results: 0,
            total_duration_ms: 0,
            query_rewrite_duration_ms: 0,
            retrieval_duration_ms: 0,
            rerank_duration_ms: 0,
        }
    }
}

// ============================================================================
// 查询重写器
// ============================================================================

/// 查询重写器
pub struct QueryRewriter {
    /// 配置
    config: RagConfig,
    /// 同义词词典
    synonyms: Arc<Mutex<HashMap<String, Vec<String>>>>,
    /// 停用词集合
    stop_words: Arc<Mutex<Vec<String>>>,
}

impl QueryRewriter {
    /// 创建新的查询重写器
    pub fn new(config: RagConfig) -> Self {
        let stop_words_vec: Vec<&str> = vec![
            "的", "了", "是", "在", "我", "有", "和", "就", "不", "人",
            "都", "一", "一个", "上", "也", "很", "到", "说", "要", "去",
            "the", "a", "an", "is", "are", "was", "were", "be", "been",
            "being", "have", "has", "had", "do", "does", "did", "will",
            "would", "could", "should", "may", "might", "must", "can",
        ];
        let mut stop_words: Vec<String> = stop_words_vec.into_iter().map(|s| s.to_string()).collect();
        stop_words.sort();
        stop_words.dedup();

        Self {
            config,
            synonyms: Arc::new(Mutex::new(HashMap::new())),
            stop_words: Arc::new(Mutex::new(stop_words)),
        }
    }

    /// 添加同义词
    pub fn add_synonym(&self, word: &str, synonyms: Vec<String>) {
        let mut syn = self.synonyms.lock();
        syn.insert(word.to_string(), synonyms);
    }

    /// 重写查询
    pub fn rewrite(&self, query: &str, history: &[ConversationMessage]) -> String {
        match self.config.query_rewrite_strategy {
            QueryRewriteStrategy::None => query.to_string(),
            QueryRewriteStrategy::Expansion => self.expand_query(query),
            QueryRewriteStrategy::Simplification => self.simplify_query(query),
            QueryRewriteStrategy::Decomposition => self.decompose_query(query),
            QueryRewriteStrategy::ContextAware => self.context_aware_rewrite(query, history),
            QueryRewriteStrategy::Hybrid => {
                let simplified = self.simplify_query(query);
                self.expand_query(&simplified)
            }
        }
    }

    /// 查询扩展（添加同义词）
    fn expand_query(&self, query: &str) -> String {
        if !self.config.enable_query_expansion {
            return query.to_string();
        }

        let synonyms = self.synonyms.lock();
        let mut expanded = query.to_string();

        for (word, syns) in synonyms.iter() {
            if query.contains(word) {
                for syn in syns {
                    if !expanded.contains(syn) {
                        expanded.push_str(&format!(" {}", syn));
                    }
                }
            }
        }

        debug!(original = %query, expanded = %expanded, "Query expanded");
        expanded
    }

    /// 查询简化（去除停用词）
    fn simplify_query(&self, query: &str) -> String {
        let stop_words = self.stop_words.lock();
        let words: Vec<&str> = query
            .split_whitespace()
            .filter(|word| !stop_words.contains(&word.to_lowercase()))
            .collect();

        let simplified = words.join(" ");
        debug!(original = %query, simplified = %simplified, "Query simplified");
        simplified
    }

    /// 查询分解（分解为子查询）
    fn decompose_query(&self, query: &str) -> String {
        // 简单实现：按标点符号分解
        let parts: Vec<&str> = query
            .split(|c| c == '，' || c == ',' || c == '。' || c == ';' || c == '；')
            .filter(|s| !s.trim().is_empty())
            .collect();

        if parts.len() <= 1 {
            return query.to_string();
        }

        // 取第一个子查询作为主要查询
        let main_query = parts[0].trim().to_string();
        debug!(original = %query, decomposed = %main_query, "Query decomposed");
        main_query
    }

    /// 上下文感知重写（基于对话历史）
    fn context_aware_rewrite(&self, query: &str, history: &[ConversationMessage]) -> String {
        if history.is_empty() {
            return query.to_string();
        }

        // 简单实现：如果查询包含代词，用历史中的实体替换
        let mut rewritten = query.to_string();

        // 获取最近的用户消息
        let recent_user_messages: Vec<&ConversationMessage> = history
            .iter()
            .filter(|m| m.role == "user")
            .rev()
            .take(3)
            .collect();

        // 简单的上下文增强：将最近的关键实体添加到查询中
        for msg in recent_user_messages {
            // 提取可能的实体（简单实现：取较长的词）
            let entities: Vec<&str> = msg
                .content
                .split_whitespace()
                .filter(|w| w.len() > 2)
                .collect();

            for entity in entities.iter().take(2) {
                if !rewritten.contains(entity) {
                    // 不直接添加，而是在查询中引用
                    // 这里简化处理，只在查询太短时添加上下文
                    if rewritten.split_whitespace().count() < 3 {
                        rewritten.push_str(&format!(" {}", entity));
                    }
                }
            }
        }

        debug!(original = %query, rewritten = %rewritten, "Query context-aware rewritten");
        rewritten
    }

    /// 生成扩展查询列表
    pub fn generate_expanded_queries(&self, query: &str) -> Vec<String> {
        let mut queries = vec![query.to_string()];

        // 添加扩展查询
        let expanded = self.expand_query(query);
        if expanded != query {
            queries.push(expanded);
        }

        // 添加简化查询
        let simplified = self.simplify_query(query);
        if simplified != query && !queries.contains(&simplified) {
            queries.push(simplified);
        }

        queries
    }
}

// ============================================================================
// 检索结果重排序器
// ============================================================================

/// 检索结果重排序器
pub struct Reranker {
    /// 配置
    config: RagConfig,
}

impl Reranker {
    /// 创建新的重排序器
    pub fn new(config: RagConfig) -> Self {
        Self { config }
    }

    /// 重排序检索结果
    pub fn rerank(&self, documents: Vec<RetrievedDocument>, query: &str) -> Vec<RetrievedDocument> {
        match self.config.rerank_strategy {
            RerankStrategy::None => documents,
            RerankStrategy::ScoreBased => self.score_based_rerank(documents),
            RerankStrategy::CrossEncoder => self.cross_encoder_rerank(documents, query),
            RerankStrategy::LlmBased => self.llm_based_rerank(documents, query),
            RerankStrategy::Hybrid => self.hybrid_rerank(documents, query),
        }
    }

    /// 基于分数的重排序
    fn score_based_rerank(&self, mut documents: Vec<RetrievedDocument>) -> Vec<RetrievedDocument> {
        documents.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));

        // 更新排名
        for (i, doc) in documents.iter_mut().enumerate() {
            doc.reranked_rank = Some(i + 1);
        }

        debug!(count = documents.len(), "Score-based rerank completed");
        documents
    }

    /// 基于交叉编码器的重排序（简化实现，实际需要外部模型）
    fn cross_encoder_rerank(&self, documents: Vec<RetrievedDocument>, query: &str) -> Vec<RetrievedDocument> {
        // 简化实现：使用查询与文档的词重叠率作为重排序分数
        let query_words: std::collections::HashSet<&str> = query.split_whitespace().collect();

        let mut scored_documents: Vec<(RetrievedDocument, f64)> = documents
            .into_iter()
            .map(|doc| {
                let doc_words: std::collections::HashSet<&str> = doc.content.split_whitespace().collect();
                let overlap = query_words.intersection(&doc_words).count() as f64;
                let total = query_words.len().max(1) as f64;
                let overlap_score = overlap / total;

                // 综合分数：原始分数 * 0.7 + 重叠率 * 0.3
                let combined_score = doc.score * 0.7 + overlap_score * 0.3;
                (doc, combined_score)
            })
            .collect();

        scored_documents.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

        let mut result: Vec<RetrievedDocument> = scored_documents
            .into_iter()
            .map(|(mut doc, score)| {
                doc.score = score;
                doc
            })
            .collect();

        // 更新排名
        for (i, doc) in result.iter_mut().enumerate() {
            doc.reranked_rank = Some(i + 1);
        }

        debug!(count = result.len(), "Cross-encoder rerank completed");
        result
    }

    /// 基于 LLM 的重排序（简化实现）
    fn llm_based_rerank(&self, documents: Vec<RetrievedDocument>, _query: &str) -> Vec<RetrievedDocument> {
        // 简化实现：使用基于分数的重排序
        // 实际实现中应该调用 LLM 对文档进行相关性评分
        self.score_based_rerank(documents)
    }

    /// 混合重排序（分数 + 多样性）
    fn hybrid_rerank(&self, documents: Vec<RetrievedDocument>, _query: &str) -> Vec<RetrievedDocument> {
        if !self.config.enable_diversity || self.config.diversity_weight == 0.0 {
            return self.score_based_rerank(documents);
        }

        // 先按分数排序
        let mut sorted = self.score_based_rerank(documents);

        // 多样性优化：MMR（Maximal Marginal Relevance）简化实现
        let diversity_weight = self.config.diversity_weight;
        let mut selected: Vec<RetrievedDocument> = Vec::new();
        let mut remaining: Vec<RetrievedDocument> = sorted.drain(..).collect();

        while !remaining.is_empty() && selected.len() < self.config.rerank_top_k {
            let mut best_idx = 0;
            let mut best_score = f64::MIN;

            for (i, doc) in remaining.iter().enumerate() {
                // 相关性分数
                let relevance = doc.score;

                // 多样性分数：与已选文档的最小相似度（越低越多样）
                let mut min_similarity: f64 = 1.0;
                for selected_doc in &selected {
                    let sim = self.calculate_similarity(&doc.content, &selected_doc.content);
                    min_similarity = min_similarity.min(sim);
                }

                // MMR 分数：(1 - λ) * 相关性 - λ * 与已选文档的最大相似度
                let mmr_score = (1.0 - diversity_weight) * relevance - diversity_weight * (1.0 - min_similarity);

                if mmr_score > best_score {
                    best_score = mmr_score;
                    best_idx = i;
                }
            }

            let selected_doc = remaining.remove(best_idx);
            selected.push(selected_doc);
        }

        // 更新排名
        for (i, doc) in selected.iter_mut().enumerate() {
            doc.reranked_rank = Some(i + 1);
        }

        debug!(count = selected.len(), "Hybrid rerank (MMR) completed");
        selected
    }

    /// 计算两个文本的相似度（简化实现：词重叠率）
    fn calculate_similarity(&self, text1: &str, text2: &str) -> f64 {
        let words1: std::collections::HashSet<&str> = text1.split_whitespace().collect();
        let words2: std::collections::HashSet<&str> = text2.split_whitespace().collect();

        if words1.is_empty() || words2.is_empty() {
            return 0.0;
        }

        let intersection = words1.intersection(&words2).count() as f64;
        let union = words1.union(&words2).count() as f64;

        intersection / union
    }
}

// ============================================================================
// RAG 引擎
// ============================================================================

/// RAG 引擎
#[derive(Clone)]
pub struct RagEngine {
    /// 配置
    config: RagConfig,
    /// 查询重写器
    query_rewriter: Arc<QueryRewriter>,
    /// 重排序器
    reranker: Arc<Reranker>,
    /// 检索统计
    stats: Arc<Mutex<RagStats>>,
}

/// RAG 统计
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct RagStats {
    /// 总检索次数
    pub total_retrievals: u64,
    /// 总检索文档数
    pub total_documents_retrieved: u64,
    /// 平均检索文档数
    pub avg_documents_per_query: f64,
    /// 查询重写次数
    pub query_rewrites: u64,
    /// 重排序次数
    pub rerank_count: u64,
    /// 缓存命中次数
    pub cache_hits: u64,
}

impl RagEngine {
    /// 创建新的 RAG 引擎
    pub fn new(config: RagConfig) -> Self {
        Self {
            query_rewriter: Arc::new(QueryRewriter::new(config.clone())),
            reranker: Arc::new(Reranker::new(config.clone())),
            config,
            stats: Arc::new(Mutex::new(RagStats::default())),
        }
    }

    /// 使用默认配置创建
    pub fn with_defaults() -> Self {
        Self::new(RagConfig::default())
    }

    /// 获取配置
    pub fn config(&self) -> &RagConfig {
        &self.config
    }

    /// 获取查询重写器
    pub fn query_rewriter(&self) -> &QueryRewriter {
        &self.query_rewriter
    }

    /// 获取重排序器
    pub fn reranker(&self) -> &Reranker {
        &self.reranker
    }

    /// 处理检索请求
    pub async fn retrieve(&self, request: RetrievalRequest) -> RetrievalResponse {
        let start_time = std::time::Instant::now();
        let mut stats = RetrievalStats::default();

        info!(query = %request.query, "RAG retrieval started");

        // 1. 查询重写
        let rewrite_start = std::time::Instant::now();
        let rewritten_query = self.query_rewriter.rewrite(&request.query, &request.conversation_history);
        let expanded_queries = self.query_rewriter.generate_expanded_queries(&rewritten_query);
        stats.query_rewrite_duration_ms = rewrite_start.elapsed().as_millis() as u64;

        if rewritten_query != request.query {
            let mut rag_stats = self.stats.lock();
            rag_stats.query_rewrites += 1;
        }

        // 2. 检索（这里简化实现，实际应该调用向量检索服务）
        let retrieval_start = std::time::Instant::now();
        let documents = self.perform_retrieval(&rewritten_query, &expanded_queries, &request).await;
        stats.retrieval_duration_ms = retrieval_start.elapsed().as_millis() as u64;
        stats.vector_results = documents.len();
        stats.merged_results = documents.len();

        // 3. 过滤低相似度结果
        let threshold = request.similarity_threshold.unwrap_or(self.config.similarity_threshold);
        let filtered: Vec<RetrievedDocument> = documents
            .into_iter()
            .filter(|doc| doc.score >= threshold)
            .collect();
        stats.filtered_results = filtered.len();

        // 4. 重排序
        let rerank_start = std::time::Instant::now();
        let reranked = self.reranker.rerank(filtered, &rewritten_query);
        stats.rerank_duration_ms = rerank_start.elapsed().as_millis() as u64;
        stats.reranked_results = reranked.len();

        if !reranked.is_empty() {
            let mut rag_stats = self.stats.lock();
            rag_stats.rerank_count += 1;
        }

        // 5. 截取 Top K
        let top_k = request.top_k.unwrap_or(self.config.rerank_top_k);
        let final_documents: Vec<RetrievedDocument> = reranked.into_iter().take(top_k).collect();

        // 6. 构建上下文
        let context = self.build_context(&final_documents);

        // 7. 更新统计
        stats.total_duration_ms = start_time.elapsed().as_millis() as u64;

        let mut rag_stats = self.stats.lock();
        rag_stats.total_retrievals += 1;
        rag_stats.total_documents_retrieved += final_documents.len() as u64;
        rag_stats.avg_documents_per_query =
            rag_stats.total_documents_retrieved as f64 / rag_stats.total_retrievals as f64;

        info!(
            query = %request.query,
            documents = final_documents.len(),
            duration_ms = stats.total_duration_ms,
            "RAG retrieval completed"
        );

        RetrievalResponse {
            original_query: request.query,
            rewritten_query,
            expanded_queries,
            documents: final_documents,
            stats,
            context,
        }
    }

    /// 执行检索（简化实现，实际应该调用向量检索服务）
    async fn perform_retrieval(
        &self,
        _query: &str,
        expanded_queries: &[String],
        _request: &RetrievalRequest,
    ) -> Vec<RetrievedDocument> {
        // 简化实现：返回空结果
        // 实际实现中应该：
        // 1. 对每个扩展查询进行向量检索
        // 2. 进行关键词检索
        // 3. 合并结果并去重
        // 4. 计算综合分数

        let mut documents = Vec::new();
        let mut seen_doc_ids = std::collections::HashSet::new();

        for (i, q) in expanded_queries.iter().enumerate() {
            // 模拟检索结果
            // 实际实现中应该调用向量检索服务
            let mock_docs = self.mock_retrieval(q, i);
            for doc in mock_docs {
                if !seen_doc_ids.contains(&doc.doc_id) {
                    seen_doc_ids.insert(doc.doc_id.clone());
                    documents.push(doc);
                }
            }
        }

        // 设置原始排名
        for (i, doc) in documents.iter_mut().enumerate() {
            doc.original_rank = i + 1;
        }

        documents
    }

    /// 模拟检索（实际实现中应该调用向量检索服务）
    fn mock_retrieval(&self, query: &str, query_index: usize) -> Vec<RetrievedDocument> {
        // 简化实现：返回空结果
        // 实际实现中应该调用向量检索服务
        let _ = query;
        let _ = query_index;
        Vec::new()
    }

    /// 构建上下文
    fn build_context(&self, documents: &[RetrievedDocument]) -> String {
        if documents.is_empty() {
            return String::new();
        }

        let mut context = String::new();
        context.push_str("根据以下相关文档回答问题：\n\n");

        for (i, doc) in documents.iter().enumerate() {
            context.push_str(&format!("【文档 {}】{}\n", i + 1, doc.title));
            context.push_str(&format!("来源：{}\n", doc.source));
            context.push_str(&format!("内容：{}\n\n", doc.content));
        }

        // 截断到最大 token 数（简化实现：按字符数截断）
        let max_chars = self.config.max_context_tokens * 4; // 粗略估计：1 token ≈ 4 字符
        if context.chars().count() > max_chars {
            context = context.chars().take(max_chars).collect();
            context.push_str("\n...（内容已截断）");
        }

        context
    }

    /// 获取统计信息
    pub fn get_stats(&self) -> RagStats {
        self.stats.lock().clone()
    }

    /// 重置统计信息
    pub fn reset_stats(&self) {
        let mut stats = self.stats.lock();
        *stats = RagStats::default();
    }
}

// ============================================================================
// 测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_config() -> RagConfig {
        RagConfig {
            enabled: true,
            query_rewrite_strategy: QueryRewriteStrategy::None,
            retrieval_strategy: RetrievalStrategy::VectorOnly,
            rerank_strategy: RerankStrategy::ScoreBased,
            top_k: 10,
            rerank_top_k: 5,
            similarity_threshold: 0.3,
            max_context_tokens: 4000,
            enable_query_expansion: true,
            enable_diversity: true,
            diversity_weight: 0.3,
        }
    }

    #[test]
    fn test_rag_config_default() {
        let config = RagConfig::default();
        assert!(config.enabled);
        assert_eq!(config.top_k, 10);
        assert_eq!(config.rerank_top_k, 5);
        assert_eq!(config.similarity_threshold, 0.3);
        assert_eq!(config.max_context_tokens, 4000);
    }

    #[test]
    fn test_retrieved_document_new() {
        let doc = RetrievedDocument::new("doc1", "Title", "Content", 0.85);
        assert_eq!(doc.doc_id, "doc1");
        assert_eq!(doc.title, "Title");
        assert_eq!(doc.content, "Content");
        assert_eq!(doc.score, 0.85);
        assert_eq!(doc.retrieval_method, "vector");
    }

    #[test]
    fn test_query_rewriter_none() {
        let config = create_test_config();
        let rewriter = QueryRewriter::new(config);
        let result = rewriter.rewrite("test query", &[]);
        assert_eq!(result, "test query");
    }

    #[test]
    fn test_query_rewriter_simplification() {
        let mut config = create_test_config();
        config.query_rewrite_strategy = QueryRewriteStrategy::Simplification;
        let rewriter = QueryRewriter::new(config);

        // 英文停用词测试
        let result = rewriter.rewrite("the quick brown fox", &[]);
        assert_eq!(result, "quick brown fox");
    }

    #[test]
    fn test_query_rewriter_expansion() {
        let mut config = create_test_config();
        config.query_rewrite_strategy = QueryRewriteStrategy::Expansion;
        let rewriter = QueryRewriter::new(config);

        // 添加同义词
        rewriter.add_synonym("AI", vec!["人工智能".to_string(), "机器学习".to_string()]);

        let result = rewriter.rewrite("AI", &[]);
        assert!(result.contains("人工智能"));
        assert!(result.contains("机器学习"));
    }

    #[test]
    fn test_query_rewriter_context_aware() {
        let mut config = create_test_config();
        config.query_rewrite_strategy = QueryRewriteStrategy::ContextAware;
        let rewriter = QueryRewriter::new(config);

        let history = vec![ConversationMessage {
            role: "user".to_string(),
            content: "我想了解北京的天气".to_string(),
            timestamp: None,
        }];

        // 短查询应该被上下文增强
        let result = rewriter.rewrite("怎么样", &history);
        assert!(result.len() > "怎么样".len());
    }

    #[test]
    fn test_query_rewriter_generate_expanded_queries() {
        let config = create_test_config();
        let rewriter = QueryRewriter::new(config);

        let queries = rewriter.generate_expanded_queries("test query");
        assert!(!queries.is_empty());
        assert!(queries.contains(&"test query".to_string()));
    }

    #[test]
    fn test_reranker_score_based() {
        let config = create_test_config();
        let reranker = Reranker::new(config);

        let docs = vec![
            RetrievedDocument::new("doc1", "Doc 1", "Content 1", 0.5),
            RetrievedDocument::new("doc2", "Doc 2", "Content 2", 0.9),
            RetrievedDocument::new("doc3", "Doc 3", "Content 3", 0.7),
        ];

        let reranked = reranker.rerank(docs, "query");
        assert_eq!(reranked.len(), 3);
        assert_eq!(reranked[0].doc_id, "doc2"); // 最高分
        assert_eq!(reranked[1].doc_id, "doc3");
        assert_eq!(reranked[2].doc_id, "doc1");
        assert_eq!(reranked[0].reranked_rank, Some(1));
    }

    #[test]
    fn test_reranker_none() {
        let mut config = create_test_config();
        config.rerank_strategy = RerankStrategy::None;
        let reranker = Reranker::new(config);

        let docs = vec![
            RetrievedDocument::new("doc1", "Doc 1", "Content 1", 0.5),
            RetrievedDocument::new("doc2", "Doc 2", "Content 2", 0.9),
        ];

        let reranked = reranker.rerank(docs, "query");
        assert_eq!(reranked.len(), 2);
        assert_eq!(reranked[0].doc_id, "doc1"); // 保持原顺序
    }

    #[test]
    fn test_reranker_cross_encoder() {
        let mut config = create_test_config();
        config.rerank_strategy = RerankStrategy::CrossEncoder;
        let reranker = Reranker::new(config);

        let docs = vec![
            RetrievedDocument::new("doc1", "Doc 1", "test query content", 0.5),
            RetrievedDocument::new("doc2", "Doc 2", "unrelated content", 0.9),
        ];

        let reranked = reranker.rerank(docs, "test query");
        assert_eq!(reranked.len(), 2);
        // doc1 应该因为词重叠率高而排名上升
        assert_eq!(reranked[0].doc_id, "doc1");
    }

    #[test]
    fn test_rag_engine_creation() {
        let engine = RagEngine::with_defaults();
        assert!(engine.config().enabled);
    }

    #[test]
    fn test_rag_stats_default() {
        let stats = RagStats::default();
        assert_eq!(stats.total_retrievals, 0);
        assert_eq!(stats.total_documents_retrieved, 0);
        assert_eq!(stats.avg_documents_per_query, 0.0);
    }

    #[test]
    fn test_retrieval_stats_default() {
        let stats = RetrievalStats::default();
        assert_eq!(stats.total_duration_ms, 0);
        assert_eq!(stats.vector_results, 0);
    }

    #[test]
    fn test_conversation_message() {
        let msg = ConversationMessage {
            role: "user".to_string(),
            content: "Hello".to_string(),
            timestamp: None,
        };
        assert_eq!(msg.role, "user");
        assert_eq!(msg.content, "Hello");
    }

    #[test]
    fn test_retrieval_request() {
        let request = RetrievalRequest {
            query: "test query".to_string(),
            conversation_history: vec![],
            top_k: Some(5),
            similarity_threshold: Some(0.5),
            filters: None,
            metadata_filters: None,
        };
        assert_eq!(request.query, "test query");
        assert_eq!(request.top_k, Some(5));
    }

    #[test]
    fn test_query_rewrite_strategy_as_enum() {
        assert_eq!(QueryRewriteStrategy::None as u8, 0);
        assert_eq!(QueryRewriteStrategy::Expansion as u8, 1);
        assert_eq!(QueryRewriteStrategy::Simplification as u8, 2);
        assert_eq!(QueryRewriteStrategy::Decomposition as u8, 3);
        assert_eq!(QueryRewriteStrategy::ContextAware as u8, 4);
        assert_eq!(QueryRewriteStrategy::Hybrid as u8, 5);
    }

    #[test]
    fn test_retrieval_strategy_as_enum() {
        assert_eq!(RetrievalStrategy::VectorOnly as u8, 0);
        assert_eq!(RetrievalStrategy::KeywordOnly as u8, 1);
        assert_eq!(RetrievalStrategy::Hybrid as u8, 2);
        assert_eq!(RetrievalStrategy::MultiStage as u8, 3);
    }

    #[test]
    fn test_rerank_strategy_as_enum() {
        assert_eq!(RerankStrategy::None as u8, 0);
        assert_eq!(RerankStrategy::ScoreBased as u8, 1);
        assert_eq!(RerankStrategy::CrossEncoder as u8, 2);
        assert_eq!(RerankStrategy::LlmBased as u8, 3);
        assert_eq!(RerankStrategy::Hybrid as u8, 4);
    }
}

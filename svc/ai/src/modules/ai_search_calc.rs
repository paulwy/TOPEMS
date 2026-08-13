//! AI 向量搜索 & 排名 纯计算函数
//!
//! 从以下文件中提取的内联业务逻辑：
//! - `services/search.rs:8` — `cosine_similarity`
//! - `services/search.rs:57-67` — 搜索结果评分过滤与 Top-K 截断
//! - `services/qa.rs:999` — `calculate_confidence_interval`（置信区间）
//! - RAG 混合检索中常见的加权融合（BM25 + 向量）

use std::collections::HashMap;

// ── 向量相似度 ─────────────────────────────────────

/// 余弦相似度
///
/// 提取自 `services/search.rs:8`
///
/// - 空切片 / 长度不等 → 0.0
/// - 任一零向量 → 0.0
pub fn cosine_similarity(vec1: &[f32], vec2: &[f32]) -> f64 {
    if vec1.is_empty() || vec2.is_empty() || vec1.len() != vec2.len() {
        return 0.0;
    }

    let mut dot_product = 0.0f64;
    let mut norm_a_sq = 0.0f64;
    let mut norm_b_sq = 0.0f64;

    for (a, b) in vec1.iter().zip(vec2.iter()) {
        let a64 = *a as f64;
        let b64 = *b as f64;
        dot_product += a64 * b64;
        norm_a_sq += a64 * a64;
        norm_b_sq += b64 * b64;
    }

    let norm_a = norm_a_sq.sqrt();
    let norm_b = norm_b_sq.sqrt();
    if norm_a == 0.0 || norm_b == 0.0 {
        return 0.0;
    }
    dot_product / (norm_a * norm_b)
}

/// 欧氏距离（平方）
pub fn euclidean_distance_sq(vec1: &[f32], vec2: &[f32]) -> f64 {
    if vec1.is_empty() || vec2.is_empty() || vec1.len() != vec2.len() {
        return f64::MAX;
    }
    let mut sum_sq = 0.0f64;
    for (a, b) in vec1.iter().zip(vec2.iter()) {
        let d = *a as f64 - *b as f64;
        sum_sq += d * d;
    }
    sum_sq
}

/// 点积相似度（归一化向量时等同余弦）
pub fn dot_product_similarity(vec1: &[f32], vec2: &[f32]) -> f64 {
    if vec1.is_empty() || vec2.is_empty() || vec1.len() != vec2.len() {
        return 0.0;
    }
    vec1.iter()
        .zip(vec2.iter())
        .map(|(a, b)| *a as f64 * *b as f64)
        .sum()
}

// ── 搜索结果排序 & 过滤 ─────────────────────────────

/// 带评分的搜索项
#[derive(Debug, Clone)]
pub struct ScoredItem<T> {
    pub item: T,
    pub score: f64,
}

/// 搜索结果：根据阈值过滤 + 按分数降序 + 截断 Top-K
///
/// 提取自 `services/search.rs:57-67`
///
/// - 分数 < min_score 的项会被过滤掉（min_score 默认 0.3）
/// - 若 top_k == 0，不截断
pub fn filter_and_rank<T>(
    items: Vec<ScoredItem<T>>,
    min_score: Option<f64>,
    top_k: usize,
) -> Vec<ScoredItem<T>> {
    let min = min_score.unwrap_or(0.3);
    let mut filtered: Vec<ScoredItem<T>> = items.into_iter().filter(|s| s.score > min).collect();
    filtered.sort_by(|a, b| {
        b.score
            .partial_cmp(&a.score)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    if top_k > 0 {
        filtered.truncate(top_k);
    }
    filtered
}

/// RAG 混合检索融合：向量分数 + BM25 关键字分数加权
///
/// - vector_weight + keyword_weight 建议 ≈ 1.0
/// - 任一输入 NaN → 0.0
pub fn hybrid_rrf_score(vector_rank: usize, keyword_rank: usize, k_const: f64) -> f64 {
    let k = if k_const <= 0.0 { 60.0 } else { k_const };
    let v = 1.0 / (k + vector_rank as f64);
    let w = 1.0 / (k + keyword_rank as f64);
    v + w
}

/// 简单加权融合：`vector_score * vw + keyword_score * kw`
pub fn hybrid_weighted_score(
    vector_score: f64,
    keyword_score: f64,
    vector_weight: f64,
    keyword_weight: f64,
) -> f64 {
    let vs = if vector_score.is_finite() {
        vector_score
    } else {
        0.0
    };
    let ks = if keyword_score.is_finite() {
        keyword_score
    } else {
        0.0
    };
    (vs * vector_weight) + (ks * keyword_weight)
}

// ── 置信区间 ───────────────────────────────────────

/// 根据置信度值计算置信区间（上下界）
///
/// 提取自 `services/qa.rs:999`
///
/// - confidence 钳制到 [0,1]
/// - 返回 (lower, upper)
pub fn calculate_confidence_interval(confidence: f64) -> (f64, f64) {
    let c = confidence.clamp(0.0, 1.0);
    // 经验 margin：置信度越低，区间越宽
    let margin = 0.05 + (1.0 - c) * 0.15;
    ((c - margin).max(0.0), (c + margin).min(1.0))
}

/// 判断一个问题是否需要额外上下文（RAG 检索）
///
/// 提取自 `services/qa.rs:983`
///
/// 基于关键词启发式：是否包含 "如何"、"怎么"、"步骤"、"为什么"、"流程"、"过程"、"步骤" 等
/// 需要背景知识的词；或问题过长（> 100 字符）
pub fn needs_context(question: &str) -> bool {
    let q = question.trim();
    if q.is_empty() {
        return false;
    }
    if q.chars().count() > 100 {
        return true;
    }
    let keywords = [
        "如何",
        "怎么",
        "为什么",
        "步骤",
        "流程",
        "过程",
        "如何做",
        "怎么弄",
        "教程",
        "指南",
        "操作",
        "安装",
        "配置",
        "部署",
        "使用",
        "方法",
        "对比",
        "区别",
        "优劣",
        "分析",
    ];
    keywords.iter().any(|k| q.contains(k))
}

// ── 向量归一化 ─────────────────────────────────────

/// L2 归一化：v / ||v||。零向量返回全零
pub fn normalize_l2(vec: &[f32]) -> Vec<f32> {
    if vec.is_empty() {
        return Vec::new();
    }
    let norm_sq: f64 = vec.iter().map(|v| *v as f64 * *v as f64).sum();
    let norm = norm_sq.sqrt();
    if norm == 0.0 {
        return vec.to_vec();
    }
    vec.iter().map(|v| (*v as f64 / norm) as f32).collect()
}

// ── 关键词 TF 频率（纯计数） ───────────────────────

/// 计算词频表（token → count）
pub fn term_frequency(tokens: &[String]) -> HashMap<String, usize> {
    let mut tf = HashMap::new();
    for t in tokens {
        *tf.entry(t.to_lowercase()).or_insert(0) += 1;
    }
    tf
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── cosine_similarity ──────────────────────

    #[test]
    fn test_cosine_identical_vectors() {
        let v = vec![1.0_f32, 2.0, 3.0];
        assert!((cosine_similarity(&v, &v) - 1.0).abs() < 1e-6);
    }

    #[test]
    fn test_cosine_orthogonal() {
        let a = vec![1.0_f32, 0.0];
        let b = vec![0.0_f32, 1.0];
        assert!((cosine_similarity(&a, &b) - 0.0).abs() < 1e-6);
    }

    #[test]
    fn test_cosine_opposite() {
        let a = vec![1.0_f32, 0.0];
        let b = vec![-1.0_f32, 0.0];
        assert!((cosine_similarity(&a, &b) + 1.0).abs() < 1e-6);
    }

    #[test]
    fn test_cosine_empty_vec_safe() {
        assert_eq!(cosine_similarity(&[], &[1.0]), 0.0);
    }

    #[test]
    fn test_cosine_mismatched_len_safe() {
        assert_eq!(cosine_similarity(&[1.0, 2.0], &[1.0]), 0.0);
    }

    #[test]
    fn test_cosine_zero_vector_safe() {
        assert_eq!(cosine_similarity(&[0.0, 0.0], &[1.0, 2.0]), 0.0);
    }

    // ── euclidean & dot ────────────────────────

    #[test]
    fn test_euclidean_same_zero() {
        let v = vec![1.0_f32, 2.0, 3.0];
        assert_eq!(euclidean_distance_sq(&v, &v), 0.0);
    }

    #[test]
    fn test_euclidean_simple_345() {
        // (0,0) vs (3,4) → 平方距离 25
        let a = vec![0.0_f32, 0.0];
        let b = vec![3.0_f32, 4.0];
        assert!((euclidean_distance_sq(&a, &b) - 25.0).abs() < 1e-6);
    }

    #[test]
    fn test_dot_simple() {
        let a = vec![1.0_f32, 2.0, 3.0];
        let b = vec![4.0_f32, 5.0, 6.0];
        // 1*4 + 2*5 + 3*6 = 4+10+18 = 32
        assert!((dot_product_similarity(&a, &b) - 32.0).abs() < 1e-6);
    }

    // ── filter_and_rank ────────────────────────

    fn si<T: Clone>(item: T, score: f64) -> ScoredItem<T> {
        ScoredItem { item, score }
    }

    #[test]
    fn test_rank_filters_low_score() {
        let items = vec![si("a", 0.1), si("b", 0.5), si("c", 0.9)];
        let r = filter_and_rank(items, None, 10);
        assert_eq!(r.len(), 2); // 0.1 < 0.3 被过滤
        assert_eq!(r[0].item, "c");
    }

    #[test]
    fn test_rank_top_k_truncates() {
        let items = vec![si("a", 0.9), si("b", 0.8), si("c", 0.7), si("d", 0.6)];
        let r = filter_and_rank(items, Some(0.0), 2);
        assert_eq!(r.len(), 2);
        assert_eq!(r[0].item, "a");
        assert_eq!(r[1].item, "b");
    }

    #[test]
    fn test_rank_zero_top_k_no_truncate() {
        let items = vec![si("a", 0.9), si("b", 0.8)];
        let r = filter_and_rank(items, Some(0.0), 0);
        assert_eq!(r.len(), 2);
    }

    // ── hybrid scores ──────────────────────────

    #[test]
    fn test_hybrid_rrf_basic() {
        // rank 1 & 1 → 1/(60+1) + 1/(60+1) ≈ 0.03278
        let s = hybrid_rrf_score(1, 1, 60.0);
        assert!((s - 0.03278).abs() < 0.001);
    }

    #[test]
    fn test_hybrid_rrf_zero_k_defaults() {
        let s = hybrid_rrf_score(1, 1, 0.0);
        // 使用默认 k=60
        assert!(s > 0.0);
    }

    #[test]
    fn test_hybrid_weighted_equal() {
        assert_eq!(hybrid_weighted_score(0.5, 0.5, 0.5, 0.5), 0.5);
    }

    #[test]
    fn test_hybrid_weighted_nan_safe() {
        assert_eq!(hybrid_weighted_score(f64::NAN, 0.8, 0.5, 0.5), 0.4);
    }

    // ── confidence_interval ────────────────────

    #[test]
    fn test_ci_high_confidence_narrow() {
        let (l, u) = calculate_confidence_interval(0.95);
        // 高置信度 → margin ≈ 0.05 + (1-0.95)*0.15 = 0.0575
        assert!(l >= 0.85 && l <= 0.95);
        assert!(u >= 0.95 && u <= 1.0);
    }

    #[test]
    fn test_ci_low_confidence_wide() {
        let (l, u) = calculate_confidence_interval(0.2);
        // 低置信度 → margin ≈ 0.05 + 0.8*0.15 = 0.17
        assert!(l <= 0.2);
        assert!(u >= 0.2);
        assert!(u - l >= 0.2);
    }

    #[test]
    fn test_ci_clamped_out_of_range() {
        let (l, u) = calculate_confidence_interval(-0.5);
        assert_eq!(l, 0.0);
        assert!(u <= 1.0);
        let (l2, u2) = calculate_confidence_interval(2.0);
        assert!(l2 >= 0.0);
        assert_eq!(u2, 1.0);
    }

    // ── needs_context ──────────────────────────

    #[test]
    fn test_needs_context_short_fact_no() {
        assert!(!needs_context("公司地址?"));
    }

    #[test]
    fn test_needs_context_how_to_yes() {
        assert!(needs_context("如何配置打印机?"));
    }

    #[test]
    fn test_needs_context_why_yes() {
        assert!(needs_context("为什么要备份数据库?"));
    }

    #[test]
    fn test_needs_context_long_question_yes() {
        let q = "请问一下关于这个系统在部署的时候，我们应该考虑哪些方面，".repeat(5);
        assert!(needs_context(&q));
    }

    #[test]
    fn test_needs_context_empty_no() {
        assert!(!needs_context(""));
    }

    // ── normalize_l2 ───────────────────────────

    #[test]
    fn test_normalize_unit_vector_unchanged() {
        let v = vec![1.0_f32, 0.0, 0.0];
        let n = normalize_l2(&v);
        assert!((n[0] - 1.0).abs() < 1e-5);
    }

    #[test]
    fn test_normalize_345() {
        let v = vec![3.0_f32, 4.0];
        let n = normalize_l2(&v);
        // L2 = 5 → (0.6, 0.8)
        assert!((n[0] - 0.6).abs() < 1e-5);
        assert!((n[1] - 0.8).abs() < 1e-5);
    }

    #[test]
    fn test_normalize_zero_vector_returns_as_is() {
        let v = vec![0.0_f32, 0.0];
        let n = normalize_l2(&v);
        assert_eq!(n, vec![0.0_f32, 0.0]);
    }

    #[test]
    fn test_normalize_empty() {
        assert_eq!(normalize_l2(&[]), Vec::<f32>::new());
    }

    // ── term_frequency ─────────────────────────

    #[test]
    fn test_tf_basic() {
        let toks = vec!["a".into(), "b".into(), "a".into(), "A".into()];
        let tf = term_frequency(&toks);
        assert_eq!(tf.get("a"), Some(&3));
        assert_eq!(tf.get("b"), Some(&1));
    }
}

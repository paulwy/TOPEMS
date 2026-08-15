//! 搜索领域纯工具函数与错误类型（无 DB / async / 外部依赖）。

use std::fmt;

// ===== Error type =====

/// 搜索相关错误（手动实现 std::error::Error，不引入 thiserror 依赖）。
#[derive(Debug, Clone, PartialEq)]
pub enum SearchError {
    EmptyQuery,
    QueryTooLong(usize),
    InvalidPage(u32),
    InvalidPageSize(u32),
    InvalidFilter(String),
    NoResults,
}

impl fmt::Display for SearchError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            SearchError::EmptyQuery => write!(f, "Empty query"),
            SearchError::QueryTooLong(n) => write!(f, "Query too long: {} chars", n),
            SearchError::InvalidPage(p) => write!(f, "Invalid page: {}", p),
            SearchError::InvalidPageSize(p) => write!(f, "Invalid page size: {}", p),
            SearchError::InvalidFilter(s) => write!(f, "Invalid filter syntax: {}", s),
            SearchError::NoResults => write!(f, "No results found"),
        }
    }
}

impl std::error::Error for SearchError {}

// ===== Pure functions =====

/// 校验搜索查询：非空且长度 ≤ 500 字符（以字节计，trim 后）。
pub fn validate_query(q: &str) -> Result<&str, SearchError> {
    let trimmed = q.trim();
    if trimmed.is_empty() {
        return Err(SearchError::EmptyQuery);
    }
    if trimmed.len() > 500 {
        return Err(SearchError::QueryTooLong(trimmed.len()));
    }
    Ok(trimmed)
}

/// 校验分页参数：page ≥ 1，page_size ∈ [1, 100]。
pub fn validate_page(page: u32, page_size: u32) -> Result<(u32, u32), SearchError> {
    if page < 1 {
        return Err(SearchError::InvalidPage(page));
    }
    if page_size < 1 || page_size > 100 {
        return Err(SearchError::InvalidPageSize(page_size));
    }
    Ok((page, page_size))
}

/// 计算两个字符串之间的 Levenshtein 编辑距离。
pub fn levenshtein_distance(a: &str, b: &str) -> usize {
    let a: Vec<char> = a.chars().collect();
    let b: Vec<char> = b.chars().collect();
    let (m, n) = (a.len(), b.len());
    if m == 0 {
        return n;
    }
    if n == 0 {
        return m;
    }

    let mut prev: Vec<usize> = (0..=n).collect();
    let mut curr: Vec<usize> = vec![0; n + 1];

    for i in 1..=m {
        curr[0] = i;
        for j in 1..=n {
            let cost = if a[i - 1] == b[j - 1] { 0 } else { 1 };
            curr[j] = std::cmp::min(
                std::cmp::min(curr[j - 1] + 1, prev[j] + 1),
                prev[j - 1] + cost,
            );
        }
        std::mem::swap(&mut prev, &mut curr);
    }
    prev[n]
}

/// 判断 `query` 与 `target` 的编辑距离是否 ≤ `max_distance`。
pub fn fuzzy_match(query: &str, target: &str, max_distance: usize) -> bool {
    levenshtein_distance(query, target) <= max_distance
}

/// 简化版拼音首字母提取：对每个空白分隔的 token，取首字符；
/// 若为 ASCII 字母则返回大写形式，否则跳过（中文等非 ASCII 返回空）。
pub fn pinyin_first_letter(s: &str) -> String {
    s.split_whitespace()
        .filter_map(|word| {
            word.chars().next().and_then(|c| {
                if c.is_ascii_alphabetic() {
                    Some(c.to_ascii_uppercase())
                } else {
                    None
                }
            })
        })
        .collect()
}

/// 简化版 BM25 打分。
///
/// `tf` — 词频；`df` — 文档频率；`total_docs` — 总文档数；
/// `doc_len` — 当前文档长度；`avg_doc_len` — 平均文档长度；
/// `k1`、`b` — BM25 调参常量。
pub fn compute_bm25_score(
    tf: f64,
    df: u64,
    total_docs: u64,
    doc_len: f64,
    avg_doc_len: f64,
    k1: f64,
    b: f64,
) -> f64 {
    if total_docs == 0 || avg_doc_len == 0.0 {
        return 0.0;
    }
    let idf = ((total_docs as f64 - df as f64 + 0.5) / (df as f64 + 0.5) + 1.0).ln();
    let denom = tf + k1 * (1.0 - b + b * doc_len / avg_doc_len);
    if denom == 0.0 {
        return 0.0;
    }
    idf * (tf * (k1 + 1.0)) / denom
}

/// 解析 `"field:value"` 格式的过滤器，返回 `(field, value)`。
/// value 中可包含冒号（仅按第一个冒号分割）。
pub fn parse_filter(filter_str: &str) -> Result<(String, String), SearchError> {
    let trimmed = filter_str.trim();
    if trimmed.is_empty() {
        return Err(SearchError::InvalidFilter(filter_str.to_string()));
    }
    let mut parts = trimmed.splitn(2, ':');
    let field = parts.next().unwrap_or("");
    let value = parts.next().unwrap_or("");
    if field.is_empty() || value.is_empty() {
        return Err(SearchError::InvalidFilter(filter_str.to_string()));
    }
    Ok((field.to_string(), value.to_string()))
}

/// 排序 key 归一化：转小写并移除所有空白字符。
pub fn normalize_sort_key(key: &str) -> String {
    key.chars()
        .filter(|c| !c.is_whitespace())
        .map(|c| c.to_ascii_lowercase())
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    // --- validate_query ---

    #[test]
    fn validate_query_valid_returns_ok() {
        assert_eq!(validate_query("hello"), Ok("hello"));
    }

    #[test]
    fn validate_query_empty_returns_err() {
        assert_eq!(validate_query(""), Err(SearchError::EmptyQuery));
    }

    #[test]
    fn validate_query_whitespace_only_returns_err() {
        assert_eq!(validate_query("   \t\n "), Err(SearchError::EmptyQuery));
    }

    #[test]
    fn validate_query_at_max_length_ok() {
        let q = "a".repeat(500);
        assert_eq!(validate_query(&q), Ok(q.as_str()));
    }

    #[test]
    fn validate_query_over_max_length_returns_err() {
        let q = "a".repeat(501);
        assert_eq!(validate_query(&q), Err(SearchError::QueryTooLong(501)));
    }

    #[test]
    fn validate_query_trims_surrounding_whitespace() {
        assert_eq!(validate_query("  hello  "), Ok("hello"));
    }

    // --- validate_page ---

    #[test]
    fn validate_page_valid_returns_ok() {
        assert_eq!(validate_page(1, 20), Ok((1, 20)));
    }

    #[test]
    fn validate_page_zero_returns_err() {
        assert_eq!(validate_page(0, 20), Err(SearchError::InvalidPage(0)));
    }

    #[test]
    fn validate_page_size_zero_returns_err() {
        assert_eq!(validate_page(1, 0), Err(SearchError::InvalidPageSize(0)));
    }

    #[test]
    fn validate_page_size_over_100_returns_err() {
        assert_eq!(
            validate_page(1, 101),
            Err(SearchError::InvalidPageSize(101))
        );
    }

    #[test]
    fn validate_page_size_at_max_ok() {
        assert_eq!(validate_page(1, 100), Ok((1, 100)));
    }

    // --- levenshtein_distance ---

    #[test]
    fn levenshtein_identical_strings() {
        assert_eq!(levenshtein_distance("hello", "hello"), 0);
    }

    #[test]
    fn levenshtein_empty_vs_nonempty() {
        assert_eq!(levenshtein_distance("", "abc"), 3);
        assert_eq!(levenshtein_distance("abc", ""), 3);
    }

    #[test]
    fn levenshtein_one_substitution() {
        assert_eq!(levenshtein_distance("cat", "bat"), 1);
    }

    #[test]
    fn levenshtein_one_insertion() {
        assert_eq!(levenshtein_distance("cat", "cats"), 1);
    }

    #[test]
    fn levenshtein_one_deletion() {
        assert_eq!(levenshtein_distance("cats", "cat"), 1);
    }

    #[test]
    fn levenshtein_completely_different() {
        assert_eq!(levenshtein_distance("abc", "xyz"), 3);
    }

    // --- fuzzy_match ---

    #[test]
    fn fuzzy_match_exact() {
        assert!(fuzzy_match("hello", "hello", 0));
    }

    #[test]
    fn fuzzy_match_within_distance() {
        assert!(fuzzy_match("hello", "hallo", 1));
    }

    #[test]
    fn fuzzy_match_beyond_distance() {
        assert!(!fuzzy_match("hello", "world", 1));
    }

    #[test]
    fn fuzzy_match_zero_distance_only_exact() {
        assert!(!fuzzy_match("hello", "hallo", 0));
        assert!(fuzzy_match("hello", "hello", 0));
    }

    #[test]
    fn fuzzy_match_empty_strings() {
        assert!(fuzzy_match("", "", 0));
    }

    // --- pinyin_first_letter ---

    #[test]
    fn pinyin_english_words() {
        assert_eq!(pinyin_first_letter("hello world"), "HW");
    }

    #[test]
    fn pinyin_chinese_returns_empty() {
        assert_eq!(pinyin_first_letter("你好 世界"), "");
    }

    #[test]
    fn pinyin_mixed() {
        assert_eq!(pinyin_first_letter("hello 世界 test"), "HT");
    }

    #[test]
    fn pinyin_empty_string() {
        assert_eq!(pinyin_first_letter(""), "");
    }

    #[test]
    fn pinyin_single_word() {
        assert_eq!(pinyin_first_letter("apple"), "A");
    }

    // --- compute_bm25_score ---

    #[test]
    fn bm25_zero_tf_returns_zero() {
        let score = compute_bm25_score(0.0, 5, 100, 50.0, 100.0, 1.2, 0.75);
        assert_eq!(score, 0.0);
    }

    #[test]
    fn bm25_typical_values_positive() {
        let score = compute_bm25_score(2.0, 5, 100, 50.0, 100.0, 1.2, 0.75);
        assert!(score > 0.0);
    }

    #[test]
    fn bm25_zero_total_docs_returns_zero() {
        let score = compute_bm25_score(2.0, 5, 0, 50.0, 100.0, 1.2, 0.75);
        assert_eq!(score, 0.0);
    }

    #[test]
    fn bm25_zero_avg_doc_len_returns_zero() {
        let score = compute_bm25_score(2.0, 5, 100, 50.0, 0.0, 1.2, 0.75);
        assert_eq!(score, 0.0);
    }

    #[test]
    fn bm25_higher_tf_higher_score() {
        let s1 = compute_bm25_score(1.0, 5, 100, 50.0, 100.0, 1.2, 0.75);
        let s2 = compute_bm25_score(5.0, 5, 100, 50.0, 100.0, 1.2, 0.75);
        assert!(s2 > s1);
    }

    // --- parse_filter ---

    #[test]
    fn parse_filter_valid() {
        assert_eq!(
            parse_filter("module:user"),
            Ok(("module".to_string(), "user".to_string()))
        );
    }

    #[test]
    fn parse_filter_no_colon() {
        assert_eq!(
            parse_filter("invalid"),
            Err(SearchError::InvalidFilter("invalid".to_string()))
        );
    }

    #[test]
    fn parse_filter_empty_string() {
        assert_eq!(
            parse_filter(""),
            Err(SearchError::InvalidFilter("".to_string()))
        );
    }

    #[test]
    fn parse_filter_empty_field() {
        assert_eq!(
            parse_filter(":value"),
            Err(SearchError::InvalidFilter(":value".to_string()))
        );
    }

    #[test]
    fn parse_filter_empty_value() {
        assert_eq!(
            parse_filter("field:"),
            Err(SearchError::InvalidFilter("field:".to_string()))
        );
    }

    #[test]
    fn parse_filter_value_with_colon() {
        assert_eq!(
            parse_filter("field:val:ue"),
            Ok(("field".to_string(), "val:ue".to_string()))
        );
    }

    // --- normalize_sort_key ---

    #[test]
    fn normalize_sort_key_lowercases() {
        assert_eq!(normalize_sort_key("HelloWorld"), "helloworld");
    }

    #[test]
    fn normalize_sort_key_removes_whitespace() {
        assert_eq!(normalize_sort_key("  hello world  "), "helloworld");
    }

    #[test]
    fn normalize_sort_key_mixed() {
        assert_eq!(normalize_sort_key("  Created At  "), "createdat");
    }

    #[test]
    fn normalize_sort_key_empty() {
        assert_eq!(normalize_sort_key(""), "");
    }

    #[test]
    fn normalize_sort_key_already_normalized() {
        assert_eq!(normalize_sort_key("createdat"), "createdat");
    }
}

// ============================================================================
// Search 扩展纯函数：同义词 / 高亮 / 缓存键 / 停用词 / 排序权重等
// ============================================================================

/// 同义词扩展：给定一个词，返回在同义词表中所有匹配的条目（含词自身）。
///
/// `synonym_map` 条目中的任一词命中即展开整组；去重并保留出现顺序。
pub fn expand_synonyms<'a>(term: &'a str, synonym_map: &[&[&'a str]]) -> Vec<&'a str> {
    let mut out: Vec<&'a str> = Vec::new();
    // 先加入自身
    if !term.is_empty() {
        out.push(term);
    }
    for group in synonym_map {
        if group.iter().any(|s| *s == term) {
            for s in *group {
                if !out.iter().any(|o| o == s) {
                    out.push(s);
                }
            }
        }
    }
    out
}

/// 截取高亮片段：在 `text` 中找到 `query_term` 的首次出现，截取以它为中心
/// 前后各 `radius_chars` 个字符（近似）；未命中时取文本前缀。
///
/// 返回的片段用 UTF-8 字符边界对齐，不会割裂多字节字符。
pub fn highlight_snippet(text: &str, query_term: &str, radius_chars: usize) -> String {
    let chars: Vec<char> = text.chars().collect();
    if query_term.is_empty() || chars.is_empty() {
        // 返回前缀
        let end = radius_chars.min(chars.len());
        return chars[..end].iter().collect();
    }
    // 查找 query_term 首次出现的字符位置（在 text 中查找子串）
    let byte_pos = match text.find(query_term) {
        Some(p) => p,
        None => {
            let end = (2 * radius_chars).min(chars.len());
            return chars[..end].iter().collect();
        }
    };
    // 将 byte_pos 映射到字符索引
    let hit_char_start = text[..byte_pos].chars().count();
    let hit_char_len = query_term.chars().count();
    let start = hit_char_start.saturating_sub(radius_chars);
    let end = (hit_char_start + hit_char_len + radius_chars).min(chars.len());
    let mut s: String = chars[start..end].iter().collect();
    if start > 0 {
        s.insert_str(0, "…");
    }
    if end < chars.len() {
        s.push('…');
    }
    s
}

/// 生成搜索查询的稳定缓存键：规范化查询 + 模块组合 + 分页参数 → SHA2-like
/// 短哈希（此处用简化的 FNV-1a 64-bit，hex 编码，**非加密用途**）。
pub fn build_cache_key(
    normalized_query: &str,
    modules: &[String],
    page: u32,
    page_size: u32,
) -> String {
    const FNV_OFFSET: u64 = 14_695_981_039_346_656_037;
    const FNV_PRIME: u64 = 1_099_511_628_211;
    let mut h: u64 = FNV_OFFSET;
    for b in normalized_query.as_bytes() {
        h ^= *b as u64;
        h = h.wrapping_mul(FNV_PRIME);
    }
    // 将模块列表排序后混入（保证模块顺序不影响 key）
    let mut mods: Vec<&str> = modules.iter().map(String::as_str).collect();
    mods.sort();
    for m in mods {
        h ^= 0xff;
        h = h.wrapping_mul(FNV_PRIME);
        for b in m.as_bytes() {
            h ^= *b as u64;
            h = h.wrapping_mul(FNV_PRIME);
        }
    }
    // page + page_size
    for b in &page.to_le_bytes() {
        h ^= *b as u64;
        h = h.wrapping_mul(FNV_PRIME);
    }
    for b in &page_size.to_le_bytes() {
        h ^= *b as u64;
        h = h.wrapping_mul(FNV_PRIME);
    }
    format!("srch:{h:016x}")
}

/// 移除搜索停用词（英文常见搜索停用词：a/an/the/of/in/and/or/is/are/to/for/with）。
pub fn remove_stopwords(terms: &[String]) -> Vec<String> {
    const STOP: &[&str] = &[
        "a", "an", "the", "of", "in", "and", "or", "is", "are", "to", "for", "with", "on", "at",
        "by", "from", "as", "be", "this", "that", "it", "its",
    ];
    terms
        .iter()
        .filter(|t| !STOP.contains(&t.as_str()))
        .cloned()
        .collect()
}

/// 计算排序字段的综合加权值：给定「字段名 → 权重」映射和「字段名 → 打分」，
/// 返回加权和。任何缺失字段按 0.0 分处理。
pub fn compute_weighted_score(weights: &[(&str, f64)], scores: &[(&str, f64)]) -> f64 {
    let mut total = 0.0;
    for (field, w) in weights {
        let s = scores
            .iter()
            .find(|(f, _)| f == field)
            .map(|(_, v)| *v)
            .unwrap_or(0.0);
        total += w * s;
    }
    total
}

/// 布尔检索查询的「合取范式」片段解析：接受 `"foo +bar -baz"` 风格的简单查询，
/// 返回 `(must_terms, should_terms, must_not_terms)` 三个独立列表。
///
/// 规则：无前缀 = should；`+` 前缀 = must；`-` 前缀 = must_not。
pub fn parse_boolean_query(query: &str) -> (Vec<String>, Vec<String>, Vec<String>) {
    let mut must = Vec::new();
    let mut should = Vec::new();
    let mut must_not = Vec::new();
    for raw in query.split_whitespace() {
        if let Some(rest) = raw.strip_prefix('+') {
            if !rest.is_empty() {
                must.push(rest.to_string());
            }
        } else if let Some(rest) = raw.strip_prefix('-') {
            if !rest.is_empty() {
                must_not.push(rest.to_string());
            }
        } else if !raw.is_empty() {
            should.push(raw.to_string());
        }
    }
    (must, should, must_not)
}

/// 归一化分数到 [0.0, 1.0]：`(s - min) / (max - min)`；若 max==min 则返回 0.5。
pub fn normalize_score(s: f64, min: f64, max: f64) -> f64 {
    if (max - min).abs() < f64::EPSILON {
        return 0.5;
    }
    ((s - min) / (max - min)).clamp(0.0, 1.0)
}

/// 搜索建议（前缀匹配 autocomplete）：从候选列表返回所有以 `prefix` 开头的
/// 条目（大小写不敏感），最多取 `limit` 条。
pub fn prefix_suggestions(prefix: &str, candidates: &[String], limit: usize) -> Vec<String> {
    if limit == 0 {
        return Vec::new();
    }
    let p = prefix.to_lowercase();
    candidates
        .iter()
        .filter(|c| c.to_lowercase().starts_with(&p))
        .take(limit)
        .cloned()
        .collect()
}

/// 近似查询短语匹配：返回 `text` 中是否顺序包含 `terms`（term 之间允许插入
/// 任意其他 token，但相对顺序必须一致）。
pub fn matches_phrase_order(text_terms: &[String], query_terms: &[String]) -> bool {
    if query_terms.is_empty() {
        return true;
    }
    let mut qi = 0usize;
    for t in text_terms {
        if qi < query_terms.len() && *t == query_terms[qi] {
            qi += 1;
            if qi == query_terms.len() {
                return true;
            }
        }
    }
    qi == query_terms.len()
}

/// 将逗号分隔的模块过滤字符串（如 `"user,order,doc"`）解析为有序的模块列表。
/// 空字符串返回空 vec；重复项会自动去重。
pub fn parse_module_filter(raw: &str) -> Vec<String> {
    let mut out = Vec::new();
    for part in raw.split(',') {
        let trimmed = part.trim();
        if trimmed.is_empty() {
            continue;
        }
        if !out.iter().any(|s: &String| s == trimmed) {
            out.push(trimmed.to_string());
        }
    }
    out
}

// ============================================================================
// 扩展测试
// ============================================================================

#[cfg(test)]
mod tests_ext {
    use super::*;

    // ---------- expand_synonyms ----------

    #[test]
    fn test_synonyms_match_expands_group() {
        let map: &[&[&str]] = &[
            &["user", "employee", "staff"],
            &["order", "purchase_order", "po"],
        ];
        let r = expand_synonyms("user", map);
        assert!(r.contains(&"user"));
        assert!(r.contains(&"employee"));
        assert!(r.contains(&"staff"));
    }

    #[test]
    fn test_synonyms_no_match_just_self() {
        let map: &[&[&str]] = &[&["a", "b"]];
        let r = expand_synonyms("xyz", map);
        assert_eq!(r, vec!["xyz"]);
    }

    #[test]
    fn test_synonyms_empty_term_empty_out() {
        let r = expand_synonyms("", &[]);
        assert!(r.is_empty());
    }

    #[test]
    fn test_synonyms_deduplicates() {
        let map: &[&[&str]] = &[&["a", "b", "c"]];
        let r = expand_synonyms("a", map);
        // self + group: a, b, c（a 出现两次只留一次）
        assert_eq!(r.len(), 3);
    }

    // ---------- highlight_snippet ----------

    #[test]
    fn test_snippet_hit_middle_with_ellipsis() {
        let text = "abcdefghij0123456789mnopqrstuvwxyz";
        let s = highlight_snippet(text, "0123", 3);
        assert!(s.contains("0123"));
        assert!(s.starts_with('…'));
        assert!(s.ends_with('…'));
    }

    #[test]
    fn test_snippet_miss_returns_prefix() {
        let s = highlight_snippet("abcdef", "xyz", 3);
        assert_eq!(s, "abcdef"); // 全前缀
    }

    #[test]
    fn test_snippet_empty_query_returns_prefix() {
        let s = highlight_snippet("hello", "", 2);
        assert_eq!(s.len(), 2);
    }

    #[test]
    fn test_snippet_hit_at_start_no_leading_ellipsis() {
        let s = highlight_snippet("hello world this is a long text", "hello", 2);
        assert!(!s.starts_with('…'));
        assert!(s.ends_with('…'));
    }

    // ---------- build_cache_key ----------

    #[test]
    fn test_cache_key_deterministic() {
        let mods = vec!["user".to_string(), "doc".to_string()];
        let a = build_cache_key("hello", &mods, 1, 20);
        let b = build_cache_key("hello", &mods, 1, 20);
        assert_eq!(a, b);
    }

    #[test]
    fn test_cache_key_module_order_independent() {
        let a = build_cache_key("q", &["user".to_string(), "doc".to_string()], 1, 20);
        let b = build_cache_key("q", &["doc".to_string(), "user".to_string()], 1, 20);
        assert_eq!(a, b);
    }

    #[test]
    fn test_cache_key_diff_page_diff_key() {
        let mods: Vec<String> = vec![];
        let a = build_cache_key("q", &mods, 1, 20);
        let b = build_cache_key("q", &mods, 2, 20);
        assert_ne!(a, b);
    }

    #[test]
    fn test_cache_key_prefix() {
        let k = build_cache_key("", &[], 1, 20);
        assert!(k.starts_with("srch:"));
    }

    // ---------- remove_stopwords ----------

    #[test]
    fn test_stopwords_remove() {
        let terms = vec![
            "the".to_string(),
            "user".to_string(),
            "of".to_string(),
            "acme".to_string(),
        ];
        let r = remove_stopwords(&terms);
        assert_eq!(r, vec!["user".to_string(), "acme".to_string()]);
    }

    #[test]
    fn test_stopwords_all_stopwords() {
        let terms: Vec<String> = vec!["a".into(), "an".into(), "the".into()];
        assert!(remove_stopwords(&terms).is_empty());
    }

    // ---------- compute_weighted_score ----------

    #[test]
    fn test_weighted_score_basic() {
        let w = &[("title", 2.0), ("body", 1.0)];
        let s = &[("title", 0.5), ("body", 0.5)];
        // 2*0.5 + 1*0.5 = 1.5
        assert!((compute_weighted_score(w, s) - 1.5).abs() < 1e-9);
    }

    #[test]
    fn test_weighted_score_missing_field_is_zero() {
        let w = &[("title", 1.0), ("missing", 10.0)];
        let s = &[("title", 1.0)];
        assert_eq!(compute_weighted_score(w, s), 1.0);
    }

    // ---------- parse_boolean_query ----------

    #[test]
    fn test_bool_must_should_not() {
        let (m, s, mn) = parse_boolean_query("+required plain -banned");
        assert_eq!(m, vec!["required".to_string()]);
        assert_eq!(s, vec!["plain".to_string()]);
        assert_eq!(mn, vec!["banned".to_string()]);
    }

    #[test]
    fn test_bool_empty_or_no_prefix() {
        let (m, s, mn) = parse_boolean_query("  foo  bar  ");
        assert!(m.is_empty());
        assert_eq!(s.len(), 2);
        assert!(mn.is_empty());
    }

    #[test]
    fn test_bool_plus_without_rest_skipped() {
        let (m, _, _) = parse_boolean_query("+ +foo");
        // solitary "+" has no rest, so skipped
        assert_eq!(m, vec!["foo".to_string()]);
    }

    // ---------- normalize_score ----------

    #[test]
    fn test_normalize_at_min() {
        assert_eq!(normalize_score(5.0, 5.0, 10.0), 0.0);
    }

    #[test]
    fn test_normalize_at_max() {
        assert_eq!(normalize_score(10.0, 5.0, 10.0), 1.0);
    }

    #[test]
    fn test_normalize_equal_minmax_returns_half() {
        assert_eq!(normalize_score(7.0, 7.0, 7.0), 0.5);
    }

    #[test]
    fn test_normalize_clamped_out_of_range() {
        assert_eq!(normalize_score(-100.0, 0.0, 1.0), 0.0);
        assert_eq!(normalize_score(200.0, 0.0, 1.0), 1.0);
    }

    // ---------- prefix_suggestions ----------

    #[test]
    fn test_suggestions_case_insensitive() {
        let cs = vec!["User".into(), "order".into(), "Uptime".into()];
        let r = prefix_suggestions("u", &cs, 10);
        assert_eq!(r.len(), 2);
    }

    #[test]
    fn test_suggestions_limit_respected() {
        let cs: Vec<String> = (0..50).map(|i| format!("x{i}")).collect();
        let r = prefix_suggestions("x", &cs, 5);
        assert_eq!(r.len(), 5);
    }

    #[test]
    fn test_suggestions_zero_limit_empty() {
        let cs = vec!["abc".into()];
        assert!(prefix_suggestions("a", &cs, 0).is_empty());
    }

    // ---------- matches_phrase_order ----------

    #[test]
    fn test_phrase_match_in_order() {
        let text: Vec<String> = vec!["a".into(), "b".into(), "c".into(), "d".into()];
        let q: Vec<String> = vec!["a".into(), "c".into()];
        assert!(matches_phrase_order(&text, &q));
    }

    #[test]
    fn test_phrase_match_wrong_order() {
        let text: Vec<String> = vec!["a".into(), "b".into(), "c".into()];
        let q: Vec<String> = vec!["c".into(), "a".into()];
        assert!(!matches_phrase_order(&text, &q));
    }

    #[test]
    fn test_phrase_match_empty_query_true() {
        assert!(matches_phrase_order(&[], &[]));
    }

    // ---------- parse_module_filter ----------

    #[test]
    fn test_module_filter_split_and_dedup() {
        let r = parse_module_filter("user, doc,user, order,,");
        assert_eq!(r, vec!["user", "doc", "order"]);
    }

    #[test]
    fn test_module_filter_empty_string() {
        assert!(parse_module_filter("   ").is_empty());
    }
}

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

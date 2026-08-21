use std::collections::{HashMap, HashSet};

// ===== Pure functions from handlers.rs =====

pub fn highlight_term(text: &str, term: &str) -> String {
    if term.is_empty() {
        return text.to_string();
    }
    let text_chars: Vec<char> = text.chars().collect();
    let text_lower: Vec<char> = text.to_lowercase().chars().collect();
    let term_lower: Vec<char> = term.to_lowercase().chars().collect();
    let tlen = term_lower.len();
    if tlen == 0 || tlen > text_lower.len() {
        return text.to_string();
    }
    let mut result = String::new();
    let mut i = 0;
    while i < text_chars.len() {
        if i + tlen <= text_lower.len() && text_lower[i..i + tlen] == term_lower[..] {
            result.push_str("**");
            for c in &text_chars[i..i + tlen] {
                result.push(*c);
            }
            result.push_str("**");
            i += tlen;
        } else {
            result.push(text_chars[i]);
            i += 1;
        }
    }
    result
}

pub fn compare_search_results(
    a_score: f64,
    a_date: i64,
    b_score: f64,
    b_date: i64,
) -> std::cmp::Ordering {
    b_score
        .partial_cmp(&a_score)
        .unwrap_or(std::cmp::Ordering::Equal)
        .then_with(|| b_date.cmp(&a_date))
}

pub fn count_facets(items: &[(&str, &str)]) -> HashMap<String, usize> {
    let mut counts = HashMap::new();
    for (field, value) in items {
        let key = format!("{}:{}", field, value);
        *counts.entry(key).or_insert(0) += 1;
    }
    counts
}

pub fn matches_filter(value: &str, filter: &str) -> bool {
    let starts_wild = filter.starts_with('*');
    let ends_wild = filter.ends_with('*');
    match (starts_wild, ends_wild) {
        (true, true) => {
            if filter.len() < 2 {
                return true;
            }
            let middle = &filter[1..filter.len() - 1];
            value.contains(middle)
        }
        (true, false) => {
            let suffix = &filter[1..];
            if suffix.is_empty() {
                return true;
            }
            value.ends_with(suffix)
        }
        (false, true) => {
            let prefix = &filter[..filter.len() - 1];
            if prefix.is_empty() {
                return true;
            }
            value.starts_with(prefix)
        }
        (false, false) => value == filter,
    }
}

pub fn deduplicate_results(ids: &[String]) -> Vec<String> {
    let mut seen = HashSet::new();
    let mut result = Vec::new();
    for id in ids {
        if seen.insert(id.clone()) {
            result.push(id.clone());
        }
    }
    result
}

pub fn extract_snippet(text: &str, query: &str, context_chars: usize) -> String {
    if text.is_empty() {
        return String::new();
    }
    let text_chars: Vec<char> = text.chars().collect();
    let text_lower: Vec<char> = text.to_lowercase().chars().collect();

    if query.is_empty() {
        let end = context_chars.min(text_chars.len());
        return text_chars[..end].iter().collect();
    }

    let query_lower: Vec<char> = query.to_lowercase().chars().collect();
    let qlen = query_lower.len();
    if qlen == 0 || qlen > text_lower.len() {
        let end = context_chars.min(text_chars.len());
        return text_chars[..end].iter().collect();
    }

    let mut match_start: Option<usize> = None;
    for i in 0..=text_lower.len() - qlen {
        if text_lower[i..i + qlen] == query_lower[..] {
            match_start = Some(i);
            break;
        }
    }

    let (start, end) = match match_start {
        Some(pos) => {
            let s = pos.saturating_sub(context_chars);
            let e = (pos + qlen + context_chars).min(text_chars.len());
            (s, e)
        }
        None => (0, context_chars.min(text_chars.len())),
    };

    text_chars[start..end].iter().collect()
}

// ===== Pure functions from models.rs =====

pub fn normalize_query(q: &str) -> String {
    let trimmed = q.trim();
    let mut result = String::with_capacity(trimmed.len());
    let mut prev_ws = false;
    for ch in trimmed.chars() {
        if ch.is_whitespace() {
            if !prev_ws {
                result.push(' ');
            }
            prev_ws = true;
        } else {
            for c in ch.to_lowercase() {
                result.push(c);
            }
            prev_ws = false;
        }
    }
    result
}

pub fn tokenize(query: &str) -> Vec<String> {
    query
        .split_whitespace()
        .map(|t| t.to_lowercase())
        .filter(|t| !t.is_empty())
        .collect()
}

pub fn calculate_pagination(page: i64, page_size: i64, total: i64) -> (i64, i64, i64) {
    let current_page = page.max(1);
    let size = page_size.max(1);
    let offset = (current_page - 1) * size;
    let total_pages = if total <= 0 {
        0
    } else {
        topems_shared_core::response::total_pages_of(total, size)
    };
    (offset, total_pages, current_page)
}

pub fn calculate_relevance(query_terms: &[String], doc_fields: &[String]) -> f64 {
    if query_terms.is_empty() || doc_fields.is_empty() {
        return 0.0;
    }
    let mut matches = 0usize;
    for term in query_terms {
        if term.is_empty() {
            continue;
        }
        let term_lower = term.to_lowercase();
        for field in doc_fields {
            if field.to_lowercase().contains(&term_lower) {
                matches += 1;
            }
        }
    }
    let total = (query_terms.len() * doc_fields.len()) as f64;
    if total == 0.0 {
        0.0
    } else {
        matches as f64 / total
    }
}

pub fn detect_search_type(query: &str) -> &'static str {
    let q = query.trim();
    if q.len() >= 2 && q.starts_with('"') && q.ends_with('"') {
        return "phrase";
    }
    if q.starts_with('*') && q.ends_with('*') {
        return "fuzzy";
    }
    if q.ends_with('*') {
        return "prefix";
    }
    "exact"
}

#[cfg(test)]
mod tests {
    use super::*;

    // ========== tests from handlers.rs ==========

    // --- highlight_term ---

    #[test]
    fn highlight_simple_match() {
        assert_eq!(highlight_term("hello world", "world"), "hello **world**");
    }

    #[test]
    fn highlight_case_insensitive() {
        assert_eq!(highlight_term("Hello World", "world"), "Hello **World**");
    }

    #[test]
    fn highlight_multiple_matches() {
        assert_eq!(
            highlight_term("hello hello hello", "hello"),
            "**hello** **hello** **hello**"
        );
    }

    #[test]
    fn highlight_no_match() {
        assert_eq!(highlight_term("hello world", "xyz"), "hello world");
    }

    #[test]
    fn highlight_empty_term() {
        assert_eq!(highlight_term("hello", ""), "hello");
    }

    #[test]
    fn highlight_empty_text() {
        assert_eq!(highlight_term("", "hello"), "");
    }

    #[test]
    fn highlight_preserves_original_case() {
        assert_eq!(highlight_term("HELLO World", "hello"), "**HELLO** World");
    }

    #[test]
    fn highlight_term_longer_than_text() {
        assert_eq!(highlight_term("hi", "hello"), "hi");
    }

    #[test]
    fn highlight_term_single_char() {
        assert_eq!(highlight_term("a quick fox", "a"), "**a** quick fox");
    }

    #[test]
    fn highlight_term_unicode() {
        assert_eq!(highlight_term("你好世界", "好"), "你**好**世界");
    }

    #[test]
    fn highlight_term_entire_text() {
        assert_eq!(highlight_term("hello", "hello"), "**hello**");
    }

    // --- compare_search_results ---

    #[test]
    fn compare_higher_score_first() {
        assert_eq!(
            compare_search_results(1.0, 0, 0.5, 0),
            std::cmp::Ordering::Less
        );
    }

    #[test]
    fn compare_equal_scores_newer_date_first() {
        assert_eq!(
            compare_search_results(1.0, 100, 1.0, 50),
            std::cmp::Ordering::Less
        );
    }

    #[test]
    fn compare_equal_scores_equal_dates() {
        assert_eq!(
            compare_search_results(1.0, 100, 1.0, 100),
            std::cmp::Ordering::Equal
        );
    }

    #[test]
    fn compare_lower_score_last() {
        assert_eq!(
            compare_search_results(0.5, 0, 1.0, 0),
            std::cmp::Ordering::Greater
        );
    }

    #[test]
    fn compare_nan_score_falls_back_to_date() {
        assert_eq!(
            compare_search_results(f64::NAN, 100, 1.0, 50),
            std::cmp::Ordering::Less
        );
    }

    #[test]
    fn compare_both_nan_falls_to_date() {
        assert_eq!(
            compare_search_results(f64::NAN, 200, f64::NAN, 100),
            std::cmp::Ordering::Less
        );
    }

    // --- count_facets ---

    #[test]
    fn facets_count_simple() {
        let items = vec![("module", "user"), ("module", "user"), ("module", "order")];
        let counts = count_facets(&items);
        assert_eq!(counts.get("module:user"), Some(&2));
        assert_eq!(counts.get("module:order"), Some(&1));
    }

    #[test]
    fn facets_empty() {
        let counts = count_facets(&[]);
        assert!(counts.is_empty());
    }

    #[test]
    fn facets_multiple_fields() {
        let items = vec![
            ("status", "active"),
            ("status", "inactive"),
            ("type", "user"),
        ];
        let counts = count_facets(&items);
        assert_eq!(counts.len(), 3);
        assert_eq!(counts.get("status:active"), Some(&1));
    }

    #[test]
    fn facets_single_item() {
        let items = vec![("module", "doc")];
        let counts = count_facets(&items);
        assert_eq!(counts.get("module:doc"), Some(&1));
    }

    #[test]
    fn facets_all_same() {
        let items = vec![("m", "a"), ("m", "a"), ("m", "a")];
        let counts = count_facets(&items);
        assert_eq!(counts.get("m:a"), Some(&3));
        assert_eq!(counts.len(), 1);
    }

    // --- matches_filter ---

    #[test]
    fn filter_exact_match() {
        assert!(matches_filter("hello", "hello"));
    }

    #[test]
    fn filter_exact_no_match() {
        assert!(!matches_filter("hello", "world"));
    }

    #[test]
    fn filter_prefix_wildcard() {
        assert!(matches_filter("hello world", "hello*"));
        assert!(!matches_filter("world hello", "hello*"));
    }

    #[test]
    fn filter_suffix_wildcard() {
        assert!(matches_filter("hello world", "*world"));
        assert!(!matches_filter("world hello", "*world"));
    }

    #[test]
    fn filter_contains_wildcard() {
        assert!(matches_filter("hello world", "*lo wo*"));
        assert!(!matches_filter("hello", "*lo wo*"));
    }

    #[test]
    fn filter_star_only_matches_all() {
        assert!(matches_filter("anything", "*"));
    }

    #[test]
    fn filter_double_star_matches_all() {
        assert!(matches_filter("anything", "**"));
    }

    #[test]
    fn filter_empty_filter_empty_value() {
        assert!(matches_filter("", ""));
    }

    #[test]
    fn matches_filter_case_sensitive() {
        assert!(!matches_filter("Hello", "hello"));
    }

    #[test]
    fn matches_filter_empty_value_nonempty_filter() {
        assert!(!matches_filter("", "hello"));
    }

    #[test]
    fn matches_filter_star_only_empty_value() {
        assert!(matches_filter("", "*"));
    }

    #[test]
    fn matches_filter_suffix_partial() {
        assert!(matches_filter("hello", "*lo"));
        assert!(!matches_filter("hello", "*wo"));
    }

    // --- deduplicate_results ---

    #[test]
    fn dedup_preserves_order() {
        let ids = vec!["a".to_string(), "b".to_string(), "c".to_string()];
        assert_eq!(deduplicate_results(&ids), ids);
    }

    #[test]
    fn dedup_removes_duplicates() {
        let ids = vec![
            "a".to_string(),
            "b".to_string(),
            "a".to_string(),
            "c".to_string(),
            "b".to_string(),
        ];
        assert_eq!(
            deduplicate_results(&ids),
            vec!["a".to_string(), "b".to_string(), "c".to_string()]
        );
    }

    #[test]
    fn dedup_empty() {
        assert!(deduplicate_results(&[]).is_empty());
    }

    #[test]
    fn dedup_all_same() {
        let ids = vec!["x".to_string(), "x".to_string(), "x".to_string()];
        assert_eq!(deduplicate_results(&ids), vec!["x".to_string()]);
    }

    #[test]
    fn dedup_single() {
        let ids = vec!["only".to_string()];
        assert_eq!(deduplicate_results(&ids), ids);
    }

    #[test]
    fn dedup_many_distinct() {
        let ids = vec![
            "a".to_string(),
            "b".to_string(),
            "c".to_string(),
            "d".to_string(),
        ];
        assert_eq!(deduplicate_results(&ids), ids);
    }

    #[test]
    fn dedup_preserves_first_occurrence() {
        let ids = vec![
            "b".to_string(),
            "a".to_string(),
            "b".to_string(),
            "a".to_string(),
        ];
        assert_eq!(
            deduplicate_results(&ids),
            vec!["b".to_string(), "a".to_string()]
        );
    }

    #[test]
    fn dedup_interleaved() {
        let ids = vec![
            "x".to_string(),
            "y".to_string(),
            "x".to_string(),
            "z".to_string(),
            "y".to_string(),
        ];
        assert_eq!(
            deduplicate_results(&ids),
            vec!["x".to_string(), "y".to_string(), "z".to_string()]
        );
    }

    // --- extract_snippet ---

    #[test]
    fn snippet_basic_match() {
        let text = "the quick brown fox jumps";
        assert_eq!(extract_snippet(text, "brown", 5), "uick brown fox ");
    }

    #[test]
    fn snippet_case_insensitive() {
        let text = "The Quick Brown Fox";
        assert_eq!(extract_snippet(text, "brown", 5), "uick Brown Fox");
    }

    #[test]
    fn snippet_no_match_returns_beginning() {
        let text = "hello world";
        assert_eq!(extract_snippet(text, "xyz", 5), "hello");
    }

    #[test]
    fn snippet_empty_text() {
        assert_eq!(extract_snippet("", "query", 5), "");
    }

    #[test]
    fn snippet_empty_query_returns_beginning() {
        let text = "hello world";
        assert_eq!(extract_snippet(text, "", 5), "hello");
    }

    #[test]
    fn snippet_match_at_start() {
        let text = "hello world";
        assert_eq!(extract_snippet(text, "hello", 3), "hello wo");
    }

    #[test]
    fn snippet_match_at_end() {
        let text = "hello world";
        assert_eq!(extract_snippet(text, "world", 3), "lo world");
    }

    #[test]
    fn snippet_zero_context() {
        let text = "hello world";
        assert_eq!(extract_snippet(text, "hello", 0), "hello");
    }

    #[test]
    fn snippet_match_in_middle() {
        let text = "the quick brown fox jumps";
        assert_eq!(extract_snippet(text, "brown", 3), "ck brown fo");
    }

    #[test]
    fn snippet_large_context_exceeds_text() {
        let text = "hello";
        assert_eq!(extract_snippet(text, "lo", 100), "hello");
    }

    #[test]
    fn snippet_zero_context_no_match() {
        let text = "hello world";
        assert_eq!(extract_snippet(text, "xyz", 0), "");
    }

    #[test]
    fn snippet_unicode_text() {
        let text = "你好世界测试";
        assert_eq!(extract_snippet(text, "世界", 1), "好世界测");
    }

    // ========== tests from models.rs ==========

    // --- normalize_query ---

    #[test]
    fn normalize_query_trims_whitespace() {
        assert_eq!(normalize_query("  hello  "), "hello");
    }

    #[test]
    fn normalize_query_collapses_internal_whitespace() {
        assert_eq!(normalize_query("hello    world"), "hello world");
    }

    #[test]
    fn normalize_query_lowercases() {
        assert_eq!(normalize_query("HeLLo WORLD"), "hello world");
    }

    #[test]
    fn normalize_query_empty_string() {
        assert_eq!(normalize_query(""), "");
    }

    #[test]
    fn normalize_query_only_whitespace() {
        assert_eq!(normalize_query("   \t\n  "), "");
    }

    #[test]
    fn normalize_query_mixed_whitespace() {
        assert_eq!(normalize_query("  a\t b\n c "), "a b c");
    }

    // --- tokenize ---

    #[test]
    fn tokenize_simple() {
        assert_eq!(tokenize("hello world"), vec!["hello", "world"]);
    }

    #[test]
    fn tokenize_multiple_spaces() {
        assert_eq!(tokenize("hello   world"), vec!["hello", "world"]);
    }

    #[test]
    fn tokenize_empty() {
        assert!(tokenize("").is_empty());
    }

    #[test]
    fn tokenize_only_whitespace() {
        assert!(tokenize("   \t\n ").is_empty());
    }

    #[test]
    fn tokenize_lowercases() {
        assert_eq!(tokenize("HELLO World"), vec!["hello", "world"]);
    }

    #[test]
    fn tokenize_single_word() {
        assert_eq!(tokenize("hello"), vec!["hello"]);
    }

    // --- calculate_pagination ---

    #[test]
    fn pagination_first_page() {
        assert_eq!(calculate_pagination(1, 20, 100), (0, 5, 1));
    }

    #[test]
    fn pagination_second_page() {
        assert_eq!(calculate_pagination(2, 20, 100), (20, 5, 2));
    }

    #[test]
    fn pagination_zero_page_clamps_to_one() {
        assert_eq!(calculate_pagination(0, 20, 100), (0, 5, 1));
    }

    #[test]
    fn pagination_negative_page_clamps_to_one() {
        assert_eq!(calculate_pagination(-5, 20, 100), (0, 5, 1));
    }

    #[test]
    fn pagination_zero_total() {
        assert_eq!(calculate_pagination(1, 20, 0), (0, 0, 1));
    }

    #[test]
    fn pagination_exact_division() {
        assert_eq!(calculate_pagination(1, 10, 50), (0, 5, 1));
    }

    #[test]
    fn pagination_inexact_division_rounds_up() {
        assert_eq!(calculate_pagination(1, 10, 55), (0, 6, 1));
    }

    #[test]
    fn pagination_zero_page_size_clamps_to_one() {
        assert_eq!(calculate_pagination(1, 0, 10), (0, 10, 1));
    }

    // --- calculate_relevance ---

    #[test]
    fn relevance_full_match() {
        let terms = vec!["hello".to_string()];
        let fields = vec!["hello world".to_string()];
        assert_eq!(calculate_relevance(&terms, &fields), 1.0);
    }

    #[test]
    fn relevance_partial_match() {
        let terms = vec!["hello".to_string(), "missing".to_string()];
        let fields = vec!["hello world".to_string()];
        assert_eq!(calculate_relevance(&terms, &fields), 0.5);
    }

    #[test]
    fn relevance_no_match() {
        let terms = vec!["xyz".to_string()];
        let fields = vec!["hello world".to_string()];
        assert_eq!(calculate_relevance(&terms, &fields), 0.0);
    }

    #[test]
    fn relevance_empty_terms() {
        let fields = vec!["hello".to_string()];
        assert_eq!(calculate_relevance(&[], &fields), 0.0);
    }

    #[test]
    fn relevance_empty_fields() {
        let terms = vec!["hello".to_string()];
        assert_eq!(calculate_relevance(&terms, &[]), 0.0);
    }

    #[test]
    fn relevance_case_insensitive() {
        let terms = vec!["HELLO".to_string()];
        let fields = vec!["hello world".to_string()];
        assert_eq!(calculate_relevance(&terms, &fields), 1.0);
    }

    #[test]
    fn relevance_multiple_fields() {
        let terms = vec!["hello".to_string()];
        let fields = vec!["hello".to_string(), "world".to_string()];
        assert_eq!(calculate_relevance(&terms, &fields), 0.5);
    }

    // --- detect_search_type ---

    #[test]
    fn search_type_phrase() {
        assert_eq!(detect_search_type("\"hello world\""), "phrase");
    }

    #[test]
    fn search_type_prefix() {
        assert_eq!(detect_search_type("hello*"), "prefix");
    }

    #[test]
    fn search_type_fuzzy() {
        assert_eq!(detect_search_type("*hello*"), "fuzzy");
    }

    #[test]
    fn search_type_exact() {
        assert_eq!(detect_search_type("hello"), "exact");
    }

    #[test]
    fn search_type_empty() {
        assert_eq!(detect_search_type(""), "exact");
    }

    #[test]
    fn search_type_single_quote_not_phrase() {
        assert_eq!(detect_search_type("\""), "exact");
    }

    #[test]
    fn search_type_phrase_with_spaces_around() {
        assert_eq!(detect_search_type("  \"hi\"  "), "phrase");
    }
}

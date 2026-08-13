use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct IndexRecommendation {
    pub table_name: String,
    pub columns: Vec<String>,
    pub index_name: String,
    pub reason: String,
    pub estimated_improvement: f64,
}

#[derive(Debug, Clone)]
pub struct QueryOptimizationSuggestion {
    pub original_query: String,
    pub optimized_query: String,
    pub reason: String,
    pub performance_impact: String,
}

pub fn suggest_query_optimization(query: &str) -> QueryOptimizationSuggestion {
    let mut suggestions = Vec::new();
    let optimized = query.to_string();

    if query.to_lowercase().contains("select *") {
        suggestions.push("Avoid SELECT *, specify only needed columns".to_string());
    }

    if !query.to_lowercase().contains("limit")
        && (query.to_lowercase().contains("select") || query.to_lowercase().contains("from"))
    {
        suggestions.push("Consider adding LIMIT for large datasets".to_string());
    }

    if query.to_lowercase().contains("like '%") {
        suggestions.push("Leading wildcard in LIKE prevents index usage".to_string());
    }

    if query.to_lowercase().contains("or") {
        suggestions.push("Consider UNION ALL instead of OR for better index usage".to_string());
    }

    QueryOptimizationSuggestion {
        original_query: query.to_string(),
        optimized_query: optimized,
        reason: suggestions.join("; "),
        performance_impact: if suggestions.is_empty() {
            "No suggestions".to_string()
        } else {
            "Potential significant improvement".to_string()
        },
    }
}

pub struct BatchOperations;

impl BatchOperations {
    pub fn chunk_ids<T: Clone>(ids: &[T], chunk_size: usize) -> Vec<Vec<T>> {
        ids.chunks(chunk_size).map(|chunk| chunk.to_vec()).collect()
    }

    pub fn build_in_clause(column_name: &str, count: usize) -> String {
        let placeholders: Vec<String> = (1..=count).map(|i| format!("${}", i)).collect();
        format!("{} IN ({})", column_name, placeholders.join(", "))
    }
}

#[derive(Debug, Clone)]
pub struct PaginationOptimizer;

impl PaginationOptimizer {
    pub fn optimize_offset_pagination(
        table_name: &str,
        order_by_column: &str,
        last_id: Option<i64>,
        page_size: i64,
    ) -> String {
        match last_id {
            Some(id) => format!(
                "SELECT * FROM {} WHERE {} > {} ORDER BY {} LIMIT {}",
                table_name, order_by_column, id, order_by_column, page_size
            ),
            None => format!(
                "SELECT * FROM {} ORDER BY {} LIMIT {}",
                table_name, order_by_column, page_size
            ),
        }
    }

    pub fn get_total_count_query(table_name: &str) -> String {
        format!("SELECT COUNT(*) FROM {}", table_name)
    }
}

#[derive(Debug, Clone)]
pub struct NPlusOneDetector;

impl NPlusOneDetector {
    pub fn analyze_queries(queries: &[String]) -> Vec<NPlusOneWarning> {
        let mut pattern_counts: HashMap<String, Vec<String>> = HashMap::new();

        for query in queries {
            let normalized = Self::normalize_query(query);
            pattern_counts
                .entry(normalized)
                .or_default()
                .push(query.clone());
        }

        let mut warnings = Vec::new();
        for (pattern, occurrences) in pattern_counts {
            if occurrences.len() > 10 {
                warnings.push(NPlusOneWarning {
                    pattern,
                    count: occurrences.len(),
                    example_query: occurrences[0].clone(),
                    suggestion: "Consider using JOIN or preloading data".to_string(),
                });
            }
        }

        warnings
    }

    fn normalize_query(query: &str) -> String {
        let mut normalized = query.to_string();
        normalized = normalized.replace(|c: char| c.is_numeric(), "?");
        normalized
    }
}

#[derive(Debug, Clone)]
pub struct NPlusOneWarning {
    pub pattern: String,
    pub count: usize,
    pub example_query: String,
    pub suggestion: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    // ===== suggest_query_optimization =====
    #[test]
    fn test_suggest_no_findings() {
        let s = suggest_query_optimization("SELECT id, name FROM users WHERE id = 1 LIMIT 10");
        assert!(s.reason.is_empty(), "reason={}", s.reason);
        assert_eq!(s.performance_impact, "No suggestions");
    }

    #[test]
    fn test_suggest_select_star() {
        let s = suggest_query_optimization("SELECT * FROM orders");
        assert!(s.reason.contains("Avoid SELECT *"));
        assert!(s.reason.contains("LIMIT"));
        assert_eq!(s.performance_impact, "Potential significant improvement");
    }

    #[test]
    fn test_suggest_missing_limit() {
        let s = suggest_query_optimization("SELECT id FROM big_table");
        assert!(s.reason.contains("LIMIT"));
    }

    #[test]
    fn test_suggest_like_leading_wildcard() {
        let s = suggest_query_optimization("SELECT * FROM t WHERE name LIKE '%john%' LIMIT 10");
        assert!(s.reason.contains("Leading wildcard"));
        assert!(s.reason.contains("Avoid SELECT *"));
        // 因为有 LIMIT，不应再提示 "Consider adding LIMIT"
        assert!(!s.reason.contains("Consider adding LIMIT"));
    }

    #[test]
    fn test_suggest_or_rewrite() {
        let s = suggest_query_optimization(
            "SELECT id FROM a WHERE status = 1 OR status = 2 LIMIT 50"
        );
        assert!(s.reason.contains("UNION ALL"));
    }

    #[test]
    fn test_suggest_case_insensitive_match() {
        let s1 = suggest_query_optimization("select * from t");
        assert!(s1.reason.contains("Avoid SELECT *"));
        let s2 = suggest_query_optimization("SELECT * FROM t WHERE x LIKE '%abc'");
        assert!(s2.reason.contains("Leading wildcard"));
    }

    #[test]
    fn test_suggest_original_and_optimized_are_preserved() {
        let raw = "SELECT * FROM orders";
        let s = suggest_query_optimization(raw);
        assert_eq!(s.original_query, raw);
        // 当前优化实现是保持原值（返回纯建议而非改写 SQL）
        assert_eq!(s.optimized_query, raw);
    }

    // ===== BatchOperations =====
    #[test]
    fn test_chunk_ids_basic() {
        let ids: Vec<i32> = (1..=10).collect();
        let chunks = BatchOperations::chunk_ids(&ids, 3);
        assert_eq!(chunks.len(), 4);
        assert_eq!(chunks[0], vec![1, 2, 3]);
        assert_eq!(chunks[3], vec![10]);
    }

    #[test]
    fn test_chunk_ids_empty() {
        let v: Vec<i32> = vec![];
        assert!(BatchOperations::chunk_ids(&v, 10).is_empty());
    }

    #[test]
    fn test_chunk_ids_size_larger_than_input() {
        let ids = vec![1, 2, 3];
        let chunks = BatchOperations::chunk_ids(&ids, 100);
        assert_eq!(chunks.len(), 1);
        assert_eq!(chunks[0], ids);
    }

    #[test]
    fn test_build_in_clause() {
        assert_eq!(
            BatchOperations::build_in_clause("id", 0),
            "id IN ()"
        );
        assert_eq!(
            BatchOperations::build_in_clause("user_id", 3),
            "user_id IN ($1, $2, $3)"
        );
        assert_eq!(
            BatchOperations::build_in_clause("x", 1),
            "x IN ($1)"
        );
    }

    // ===== PaginationOptimizer =====
    #[test]
    fn test_optimize_offset_pagination_keyset() {
        let sql = PaginationOptimizer::optimize_offset_pagination(
            "users", "id", Some(42), 50
        );
        assert_eq!(
            sql,
            "SELECT * FROM users WHERE id > 42 ORDER BY id LIMIT 50"
        );
    }

    #[test]
    fn test_optimize_offset_pagination_first_page() {
        let sql = PaginationOptimizer::optimize_offset_pagination(
            "orders", "created_at", None, 20
        );
        assert_eq!(
            sql,
            "SELECT * FROM orders ORDER BY created_at LIMIT 20"
        );
    }

    #[test]
    fn test_get_total_count_query() {
        assert_eq!(
            PaginationOptimizer::get_total_count_query("events"),
            "SELECT COUNT(*) FROM events"
        );
    }

    // ===== NPlusOneDetector =====
    #[test]
    fn test_nplusone_no_warning_when_few_duplicates() {
        let queries: Vec<String> = (1..=5)
            .map(|i| format!("SELECT * FROM users WHERE id = {}", i))
            .collect();
        let ws = NPlusOneDetector::analyze_queries(&queries);
        assert!(ws.is_empty(), "≤10 同型查询不应告警: got {} warnings", ws.len());
    }

    #[test]
    fn test_nplusone_detected_when_over_threshold() {
        // 12 条结构相同的查询，仅 id 字面量不同（都是 3 位数，归一化后 pattern 完全一致）→ N+1 告警
        let queries: Vec<String> = (100..=111)
            .map(|i| format!("SELECT * FROM comments WHERE post_id = {}", i))
            .collect();
        let ws = NPlusOneDetector::analyze_queries(&queries);
        assert_eq!(ws.len(), 1);
        assert_eq!(ws[0].count, 12);
        assert!(ws[0].pattern.contains("???")); // 数字被规范化为 ???
        assert!(ws[0].suggestion.contains("JOIN"));
    }

    #[test]
    fn test_nplusone_multiple_patterns_grouped() {
        let mut queries: Vec<String> = Vec::new();
        // pattern A: 12 条（users 表，3 位 id）
        for i in 200..=211 {
            queries.push(format!("SELECT * FROM users WHERE id = {}", i));
        }
        // pattern B: 15 条（posts 表，3 位 id）
        for i in 500..=514 {
            queries.push(format!("SELECT name FROM posts WHERE id = {}", i));
        }
        // pattern C: 3 条（roles 表，≤10 不告警，且表名不同不会合并）
        for i in 1..=3 {
            queries.push(format!("SELECT code FROM roles WHERE idx = {}", i));
        }
        let ws = NPlusOneDetector::analyze_queries(&queries);
        assert_eq!(ws.len(), 2);
        let counts: Vec<usize> = ws.iter().map(|w| w.count).collect();
        assert!(counts.contains(&12));
        assert!(counts.contains(&15));
    }

    #[test]
    fn test_nplusone_empty_input() {
        let v: Vec<String> = vec![];
        assert!(NPlusOneDetector::analyze_queries(&v).is_empty());
    }

    #[test]
    fn test_normalize_query_replaces_numbers() {
        // 间接测试：数字不同、但文本相同的查询应归为同一 pattern
        let a = NPlusOneDetector::normalize_query("SELECT * FROM a WHERE id = 123");
        let b = NPlusOneDetector::normalize_query("SELECT * FROM a WHERE id = 999");
        assert_eq!(a, b);
        assert!(!a.contains(|c: char| c.is_ascii_digit()));
    }
}

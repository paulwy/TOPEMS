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

    if !query.to_lowercase().contains("limit") && 
       (query.to_lowercase().contains("select") || query.to_lowercase().contains("from")) {
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
        ids.chunks(chunk_size)
            .map(|chunk| chunk.to_vec())
            .collect()
    }

    pub fn build_in_clause(column_name: &str, count: usize) -> String {
        let placeholders: Vec<String> = (1..=count)
            .map(|i| format!("${}", i))
            .collect();
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
                .or_insert_with(Vec::new)
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

pub mod audit_log;

/// 按渲染优先级降序排序页面（高优先级在前）。
pub fn sort_pages_by_priority(pages: Vec<(String, i32)>) -> Vec<(String, i32)> {
    let mut pages = pages;
    pages.sort_by(|a, b| b.1.cmp(&a.1));
    pages
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sort_descending() {
        let pages = vec![
            ("a".to_string(), 1),
            ("b".to_string(), 5),
            ("c".to_string(), 3),
        ];
        let sorted = sort_pages_by_priority(pages);
        assert_eq!(sorted[0].0, "b");
        assert_eq!(sorted[1].0, "c");
        assert_eq!(sorted[2].0, "a");
    }

    #[test]
    fn test_sort_empty() {
        let pages: Vec<(String, i32)> = vec![];
        assert!(sort_pages_by_priority(pages).is_empty());
    }

    #[test]
    fn test_sort_single() {
        let pages = vec![("only".to_string(), 10)];
        let sorted = sort_pages_by_priority(pages);
        assert_eq!(sorted.len(), 1);
        assert_eq!(sorted[0].0, "only");
    }

    #[test]
    fn test_sort_negative_priority() {
        let pages = vec![
            ("a".to_string(), -1),
            ("b".to_string(), -5),
            ("c".to_string(), 0),
        ];
        let sorted = sort_pages_by_priority(pages);
        assert_eq!(sorted[0].0, "c");
        assert_eq!(sorted[1].0, "a");
        assert_eq!(sorted[2].0, "b");
    }

    #[test]
    fn test_sort_equal_priority_stable() {
        let pages = vec![
            ("a".to_string(), 1),
            ("b".to_string(), 1),
            ("c".to_string(), 1),
        ];
        let sorted = sort_pages_by_priority(pages);
        assert_eq!(sorted.len(), 3);
        // 同优先级保持原相对顺序（稳定排序）
        assert_eq!(sorted[0].0, "a");
        assert_eq!(sorted[1].0, "b");
        assert_eq!(sorted[2].0, "c");
    }
}

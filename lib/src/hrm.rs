use serde::{Deserialize, Serialize};
use sqlx::postgres::PgPool;
use std::sync::Arc;

#[derive(Debug, Clone)]
pub struct AppState {
    pub db: PgPool,
}

impl AppState {
    pub fn new(db: PgPool) -> Self {
        Self { db }
    }

    pub fn arc(self) -> Arc<Self> {
        Arc::new(self)
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct PaginationQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

impl PaginationQuery {
    pub fn page(&self) -> i64 {
        self.page.unwrap_or(1).max(1)
    }

    pub fn page_size(&self) -> i64 {
        self.page_size.unwrap_or(10).min(100)
    }

    pub fn offset(&self) -> i64 {
        (self.page() - 1) * self.page_size()
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct PaginatedResult<T> {
    pub items: Vec<T>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

impl<T> PaginatedResult<T> {
    pub fn new(items: Vec<T>, total: i64, page: i64, page_size: i64) -> Self {
        Self {
            items,
            total,
            page,
            page_size,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pagination_query_defaults() {
        let query = PaginationQuery {
            page: None,
            page_size: None,
        };

        assert_eq!(query.page(), 1);
        assert_eq!(query.page_size(), 10);
        assert_eq!(query.offset(), 0);
    }

    #[test]
    fn test_pagination_query_with_values() {
        let query = PaginationQuery {
            page: Some(2),
            page_size: Some(20),
        };

        assert_eq!(query.page(), 2);
        assert_eq!(query.page_size(), 20);
        assert_eq!(query.offset(), 20);
    }

    #[test]
    fn test_pagination_query_page_min_page() {
        let query = PaginationQuery {
            page: Some(0),
            page_size: Some(5),
        };

        assert_eq!(query.page(), 1);
    }

    #[test]
    fn test_pagination_query_max_page_size() {
        let query = PaginationQuery {
            page: Some(1),
            page_size: Some(200),
        };

        assert_eq!(query.page_size(), 100);
    }

    #[test]
    fn test_paginated_result_new() {
        let items = vec![1, 2, 3];
        let result = PaginatedResult::new(items.clone(), 100, 2, 10);

        assert_eq!(result.items, items);
        assert_eq!(result.total, 100);
        assert_eq!(result.page, 2);
        assert_eq!(result.page_size, 10);
    }
}

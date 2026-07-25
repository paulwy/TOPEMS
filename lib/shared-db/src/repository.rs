use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

#[async_trait]
pub trait Repository<T> {
    async fn find_by_id(&self, pool: &PgPool, id: Uuid) -> topems_shared_core::error::Result<Option<T>>;
    async fn find_all(&self, pool: &PgPool) -> topems_shared_core::error::Result<Vec<T>>;
    async fn create(&self, pool: &PgPool, entity: &T) -> topems_shared_core::error::Result<T>;
    async fn update(&self, pool: &PgPool, entity: &T) -> topems_shared_core::error::Result<T>;
    async fn delete(&self, pool: &PgPool, id: Uuid) -> topems_shared_core::error::Result<()>;
    async fn count(&self, pool: &PgPool) -> topems_shared_core::error::Result<i64>;
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginatedQuery {
    pub page: i64,
    pub page_size: i64,
    pub sort_by: Option<String>,
    pub sort_dir: Option<String>,
    pub filters: Option<serde_json::Value>,
}

impl Default for PaginatedQuery {
    fn default() -> Self {
        Self {
            page: 1,
            page_size: 20,
            sort_by: None,
            sort_dir: Some("desc".to_string()),
            filters: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginatedResult<T> {
    pub items: Vec<T>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
    pub total_pages: i64,
}

impl<T> PaginatedResult<T> {
    pub fn new(items: Vec<T>, total: i64, page: i64, page_size: i64) -> Self {
        let page = page.max(1);
        let page_size = page_size.clamp(1, 100);
        let total_pages = (total + page_size - 1) / page_size;
        Self {
            items,
            total,
            page,
            page_size,
            total_pages,
        }
    }

    pub fn empty() -> Self {
        Self {
            items: Vec::new(),
            total: 0,
            page: 1,
            page_size: 20,
            total_pages: 0,
        }
    }

    pub fn map<U, F: Fn(T) -> U>(self, f: F) -> PaginatedResult<U> {
        PaginatedResult {
            items: self.items.into_iter().map(f).collect(),
            total: self.total,
            page: self.page,
            page_size: self.page_size,
            total_pages: self.total_pages,
        }
    }
}

pub struct QueryBuilder {
    table: String,
    columns: Vec<String>,
    where_clauses: Vec<String>,
    params: Vec<Box<dyn sqlx::Encode<'static, sqlx::Postgres> + Send>>,
    order_by: Option<String>,
    limit: Option<i64>,
    offset: Option<i64>,
}

impl QueryBuilder {
    pub fn new(table: &str) -> Self {
        Self {
            table: table.to_string(),
            columns: vec!["*".to_string()],
            where_clauses: Vec::new(),
            params: Vec::new(),
            order_by: None,
            limit: None,
            offset: None,
        }
    }

    pub fn columns(mut self, columns: &[&str]) -> Self {
        self.columns = columns.iter().map(|s| s.to_string()).collect();
        self
    }

    pub fn where_clause(mut self, clause: &str) -> Self {
        self.where_clauses.push(clause.to_string());
        self
    }

    pub fn param<T: sqlx::Encode<'static, sqlx::Postgres> + Send + 'static>(
        mut self,
        value: T,
    ) -> Self {
        self.params.push(Box::new(value));
        self
    }

    pub fn order_by(mut self, column: &str, direction: &str) -> Self {
        self.order_by = Some(format!("{} {}", column, direction));
        self
    }

    pub fn limit(mut self, limit: i64) -> Self {
        self.limit = Some(limit);
        self
    }

    pub fn offset(mut self, offset: i64) -> Self {
        self.offset = Some(offset);
        self
    }

    pub fn build(&self) -> String {
        let mut query = format!("SELECT {} FROM {}", self.columns.join(", "), self.table);

        if !self.where_clauses.is_empty() {
            query.push_str(" WHERE ");
            query.push_str(&self.where_clauses.join(" AND "));
        }

        if let Some(order) = &self.order_by {
            query.push_str(" ORDER BY ");
            query.push_str(order);
        }

        if let Some(limit) = self.limit {
            query.push_str(&format!(" LIMIT {}", limit));
        }

        if let Some(offset) = self.offset {
            query.push_str(&format!(" OFFSET {}", offset));
        }

        query
    }

    pub fn get_params(&self) -> &Vec<Box<dyn sqlx::Encode<'static, sqlx::Postgres> + Send>> {
        &self.params
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_paginated_result() {
        let items = vec![1, 2, 3, 4, 5];
        let result = PaginatedResult::new(items, 100, 1, 10);

        assert_eq!(result.total, 100);
        assert_eq!(result.page, 1);
        assert_eq!(result.page_size, 10);
        assert_eq!(result.total_pages, 10);
        assert_eq!(result.items.len(), 5);
    }

    #[test]
    fn test_query_builder() {
        let query = QueryBuilder::new("users")
            .columns(&["id", "name", "email"])
            .where_clause("status = $1")
            .param("active")
            .order_by("created_at", "desc")
            .limit(10)
            .offset(20)
            .build();

        assert!(query.contains("SELECT id, name, email"));
        assert!(query.contains("FROM users"));
        assert!(query.contains("WHERE status = $1"));
        assert!(query.contains("ORDER BY created_at desc"));
        assert!(query.contains("LIMIT 10"));
        assert!(query.contains("OFFSET 20"));
    }

    #[test]
    fn test_paginated_result_map() {
        let items = vec![1, 2, 3];
        let result = PaginatedResult::new(items, 10, 1, 5);
        let mapped = result.map(|x| x.to_string());

        assert_eq!(mapped.items, vec!["1", "2", "3"]);
        assert_eq!(mapped.total, 10);
    }
}

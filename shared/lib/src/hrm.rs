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

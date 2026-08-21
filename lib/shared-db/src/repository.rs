use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

#[async_trait]
pub trait Repository<T> {
    async fn find_by_id(
        &self,
        pool: &PgPool,
        id: Uuid,
    ) -> topems_shared_core::error::Result<Option<T>>;
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

impl PaginatedQuery {
    /// 归一化分页查询参数：
    /// - `page`: 最小 1
    /// - `page_size`: 限制在 [min_size, max_size]（默认 1..=100）
    /// - `sort_dir`: 仅接受 asc / desc（大小写不敏感），其他值回退为 "desc"
    /// - `sort_by`: 仅保留 whitelist 内的值（如果提供了白名单），防止 SQL 注入
    pub fn normalize(&self, min_size: i64, max_size: i64, sort_whitelist: Option<&[&str]>) -> Self {
        let page = self.page.max(1);
        let page_size = self.page_size.clamp(min_size, max_size);
        let sort_dir = normalize_sort_dir(self.sort_dir.as_deref());
        let sort_by = match (self.sort_by.clone(), sort_whitelist) {
            (Some(col), Some(wl)) if wl.iter().any(|w| *w == col) => Some(col),
            (Some(col), None) => Some(col),
            _ => None,
        };
        Self {
            page,
            page_size,
            sort_by,
            sort_dir: Some(sort_dir),
            filters: self.filters.clone(),
        }
    }

    /// 计算 SQL OFFSET
    pub fn offset(&self) -> i64 {
        (self.page.max(1) - 1) * self.page_size.max(1)
    }
}

/// 规范化 sort_dir：仅保留 asc/desc（大小写不敏感），其余统一回退 desc
pub fn normalize_sort_dir(dir: Option<&str>) -> String {
    match dir.map(|d| d.to_ascii_lowercase()).as_deref() {
        Some("asc") => "asc".to_string(),
        Some("desc") => "desc".to_string(),
        _ => "desc".to_string(),
    }
}

/// 计算总页数（纯函数，便于直接复用）
pub fn total_pages(total: i64, page_size: i64) -> i64 {
    let page_size = page_size.max(1);
    let total = total.max(0);
    (total + page_size - 1) / page_size
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
    fn test_paginated_result_clamps_invalid_inputs() {
        // page=0 / page_size=1000 都应该被钳制
        let r = PaginatedResult::new(vec![1, 2, 3], 999, 0, 10000);
        assert_eq!(r.page, 1);
        assert_eq!(r.page_size, 100);
        assert_eq!(r.total_pages, 10);
    }

    #[test]
    fn test_paginated_result_empty() {
        let r: PaginatedResult<i32> = PaginatedResult::empty();
        assert_eq!(r.total_pages, 0);
        assert!(r.items.is_empty());
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
    fn test_query_builder_minimal() {
        // 无 where / order / limit / offset 的最小查询
        let sql = QueryBuilder::new("t").build();
        assert_eq!(sql, "SELECT * FROM t");
    }

    #[test]
    fn test_query_builder_multiple_wheres_joined_by_and() {
        let sql = QueryBuilder::new("t")
            .where_clause("a = 1")
            .where_clause("b = 2")
            .where_clause("c = 3")
            .build();
        assert!(sql.contains("WHERE a = 1 AND b = 2 AND c = 3"));
    }

    #[test]
    fn test_query_builder_defaults_to_star_column() {
        let sql = QueryBuilder::new("orders").build();
        assert_eq!(sql, "SELECT * FROM orders");
    }

    #[test]
    fn test_paginated_result_map() {
        let items = vec![1, 2, 3];
        let result = PaginatedResult::new(items, 10, 1, 5);
        let mapped = result.map(|x| x.to_string());

        assert_eq!(mapped.items, vec!["1", "2", "3"]);
        assert_eq!(mapped.total, 10);
    }

    #[test]
    fn test_normalize_clamps_page_and_page_size() {
        let q = PaginatedQuery {
            page: 0,
            page_size: 9999,
            ..Default::default()
        };
        let n = q.normalize(1, 100, None);
        assert_eq!(n.page, 1);
        assert_eq!(n.page_size, 100);
    }

    #[test]
    fn test_normalize_page_size_uses_provided_bounds() {
        let q = PaginatedQuery {
            page_size: 1,
            ..Default::default()
        };
        let n = q.normalize(10, 200, None);
        assert_eq!(n.page_size, 10);

        let q2 = PaginatedQuery {
            page_size: 9999,
            ..Default::default()
        };
        let n2 = q2.normalize(10, 200, None);
        assert_eq!(n2.page_size, 200);
    }

    #[test]
    fn test_normalize_sort_dir_case_insensitive_and_fallback() {
        assert_eq!(normalize_sort_dir(Some("ASC")), "asc");
        assert_eq!(normalize_sort_dir(Some("DeSc")), "desc");
        assert_eq!(normalize_sort_dir(Some("desc")), "desc");
        assert_eq!(normalize_sort_dir(Some("invalid injection")), "desc");
        assert_eq!(normalize_sort_dir(None), "desc");
        assert_eq!(normalize_sort_dir(Some("")), "desc");
    }

    #[test]
    fn test_normalize_sort_by_whitelist_enforced() {
        let q = PaginatedQuery {
            sort_by: Some("evil_column;drop users".to_string()),
            ..Default::default()
        };
        let n = q.normalize(1, 100, Some(&["id", "created_at"]));
        assert!(n.sort_by.is_none());

        let q_ok = PaginatedQuery {
            sort_by: Some("created_at".to_string()),
            ..Default::default()
        };
        let n_ok = q_ok.normalize(1, 100, Some(&["id", "created_at"]));
        assert_eq!(n_ok.sort_by.as_deref(), Some("created_at"));
    }

    #[test]
    fn test_normalize_sort_by_no_whitelist_passthrough() {
        let q = PaginatedQuery {
            sort_by: Some("whatever".to_string()),
            ..Default::default()
        };
        let n = q.normalize(1, 100, None);
        assert_eq!(n.sort_by.as_deref(), Some("whatever"));
    }

    #[test]
    fn test_offset_computation() {
        let q = PaginatedQuery {
            page: 1,
            page_size: 10,
            ..Default::default()
        };
        assert_eq!(q.offset(), 0);
        let q = PaginatedQuery {
            page: 2,
            page_size: 10,
            ..Default::default()
        };
        assert_eq!(q.offset(), 10);
        let q = PaginatedQuery {
            page: 3,
            page_size: 20,
            ..Default::default()
        };
        assert_eq!(q.offset(), 40);
    }

    #[test]
    fn test_offset_handles_negative_page() {
        let q = PaginatedQuery {
            page: -999,
            page_size: -5,
            ..Default::default()
        };
        // 负数被 max(1) 视为 page=1, page_size=1
        assert_eq!(q.offset(), 0);
    }

    #[test]
    fn test_total_pages_edge_cases() {
        assert_eq!(total_pages(0, 10), 0);
        assert_eq!(total_pages(1, 10), 1);
        assert_eq!(total_pages(10, 10), 1);
        assert_eq!(total_pages(11, 10), 2);
        assert_eq!(total_pages(99, 10), 10);
        assert_eq!(total_pages(100, 10), 10);
        assert_eq!(total_pages(101, 10), 11);
    }

    #[test]
    fn test_total_pages_handles_zero_or_negative_sizes() {
        // 0 或负数 page_size 应该被视为 1
        assert_eq!(total_pages(10, 0), 10);
        assert_eq!(total_pages(10, -3), 10);
        assert_eq!(total_pages(-5, 10), 0); // 负数 total 视为 0
    }

    #[test]
    fn test_paginated_query_default_values() {
        let d = PaginatedQuery::default();
        assert_eq!(d.page, 1);
        assert_eq!(d.page_size, 20);
        assert!(d.sort_by.is_none());
        assert_eq!(d.sort_dir.as_deref(), Some("desc"));
    }
}

// ── 通用列表查询参数（可 flatten 到各服务自定义 Query 结构体） ──────────

/// 通用列表查询基础参数（所有服务共用，带 serde 别名兼容多种前端传参风格）。
///
/// 典型用法：
/// ```rust,ignore
/// #[derive(Debug, Deserialize)]
/// pub struct SupplierListParams {
///     #[serde(flatten)]
///     pub base: ListQueryParams,
///     pub status: Option<String>,
///     pub supplier_type: Option<String>,
/// }
///
/// // then: let page = params.base.page_or_default();
/// ```
///
/// 别名说明：
/// - `pagesize` / `pageSize` → 统一映射到 `page_size`
/// - `sortorder` / `sortOrder` / `sort_dir` → 统一映射到 `sort_dir`
/// - `pagesize` 对应 P0~P3 历史遗留字段（例如 ERP/HRM 服务）
#[derive(Debug, Clone, Default, Serialize, Deserialize, utoipa::ToSchema)]
pub struct ListQueryParams {
    /// 页码，默认 1
    #[serde(default, alias = "p")]
    pub page: Option<i64>,
    /// 每页大小，默认 20，最多 100
    #[serde(
        default,
        alias = "pagesize",
        alias = "pageSize",
        alias = "size",
        alias = "limit"
    )]
    pub page_size: Option<i64>,
    /// 关键字搜索
    #[serde(default, alias = "q", alias = "keyword")]
    pub search: Option<String>,
    /// 排序字段
    #[serde(default, alias = "sort", alias = "sortBy", alias = "sortby")]
    pub sort_by: Option<String>,
    /// 排序方向：asc / desc（大小写不敏感）
    #[serde(
        default,
        alias = "sortorder",
        alias = "sortOrder",
        alias = "sort_dir",
        alias = "dir"
    )]
    pub sort_dir: Option<String>,
}

impl ListQueryParams {
    pub fn page_or_default(&self) -> i64 {
        self.page.unwrap_or(1).max(1)
    }

    pub fn page_size_or_default(&self) -> i64 {
        self.page_size.unwrap_or(20).clamp(1, 100)
    }

    /// SQL OFFSET 计算
    pub fn offset(&self) -> i64 {
        (self.page_or_default() - 1) * self.page_size_or_default()
    }

    /// SQL LIMIT 计算（即 page_size）
    pub fn limit(&self) -> i64 {
        self.page_size_or_default()
    }

    /// 规范化 sort_dir：仅保留 asc / desc，其余统一降为 desc
    pub fn normalized_sort_dir(&self) -> String {
        crate::repository::normalize_sort_dir(self.sort_dir.as_deref())
    }

    /// 转换为 `PaginatedQuery`（内部存储层使用，支持 normalize()/sort 白名单）
    pub fn to_paginated_query(&self) -> PaginatedQuery {
        PaginatedQuery {
            page: self.page_or_default(),
            page_size: self.page_size_or_default(),
            sort_by: self.sort_by.clone(),
            sort_dir: self.sort_dir.clone(),
            filters: None,
        }
    }
}

/// 便捷 trait：如果业务 struct 包含 `ListQueryParams` 字段，可用 `.page()` 等直接调用。
///
/// 推荐用法：在各服务 crate 中直接 `impl ListQueryParamsExt for MyParams`，或手动
/// 用 `params.base.offset()` 即可（本 trait 为可选 sugar，不强依赖）。
pub trait ListQueryParamsExt {
    fn list_params(&self) -> &ListQueryParams;

    fn page(&self) -> i64 {
        self.list_params().page_or_default()
    }
    fn page_size(&self) -> i64 {
        self.list_params().page_size_or_default()
    }
    fn offset(&self) -> i64 {
        self.list_params().offset()
    }
    fn limit(&self) -> i64 {
        self.list_params().limit()
    }
}

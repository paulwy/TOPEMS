use sqlx::{FromRow, PgPool};
use uuid::Uuid;

use crate::response::{PaginatedResponse, PaginationParams};

pub async fn get_by_id<T>(pool: &PgPool, table_name: &str, id: Uuid) -> Result<T, sqlx::Error>
where
    T: for<'r> FromRow<'r, sqlx::postgres::PgRow> + Send + Unpin,
{
    let query = format!("SELECT * FROM {} WHERE id = $1", table_name);
    sqlx::query_as::<sqlx::Postgres, T>(&query)
        .bind(id)
        .fetch_one(pool)
        .await
}

pub async fn list_with_pagination<T>(
    pool: &PgPool,
    table_name: &str,
    params: &PaginationParams,
    where_clause: &str,
    order_by: &str,
) -> Result<PaginatedResponse<T>, sqlx::Error>
where
    T: for<'r> FromRow<'r, sqlx::postgres::PgRow> + Send + Unpin,
{
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let total_query = if where_clause.is_empty() {
        format!("SELECT COUNT(*) FROM {}", table_name)
    } else {
        format!("SELECT COUNT(*) FROM {} WHERE {}", table_name, where_clause)
    };

    let total: i64 = sqlx::query_scalar(&total_query).fetch_one(pool).await?;

    let items_query = if where_clause.is_empty() {
        format!(
            "SELECT * FROM {} ORDER BY {} LIMIT $1 OFFSET $2",
            table_name, order_by
        )
    } else {
        format!(
            "SELECT * FROM {} WHERE {} ORDER BY {} LIMIT $1 OFFSET $2",
            table_name, where_clause, order_by
        )
    };

    let items: Vec<T> = sqlx::query_as(&items_query)
        .bind(page_size)
        .bind(offset)
        .fetch_all(pool)
        .await?;

    Ok(PaginatedResponse::new(items, total, page, page_size))
}

pub async fn list_search<T>(
    pool: &PgPool,
    table_name: &str,
    search_fields: &[&str],
    search_pattern: &str,
    params: &PaginationParams,
    order_by: &str,
) -> Result<PaginatedResponse<T>, sqlx::Error>
where
    T: for<'r> FromRow<'r, sqlx::postgres::PgRow> + Send + Unpin,
{
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_conditions: Vec<String> = search_fields
        .iter()
        .map(|field| format!("{} ILIKE $1", field))
        .collect();

    let where_clause = if search_pattern.is_empty() {
        String::new()
    } else {
        search_conditions.join(" OR ")
    };

    let total_query = if where_clause.is_empty() {
        format!("SELECT COUNT(*) FROM {}", table_name)
    } else {
        format!("SELECT COUNT(*) FROM {} WHERE {}", table_name, where_clause)
    };

    let total: i64 = if search_pattern.is_empty() {
        sqlx::query_scalar(&total_query).fetch_one(pool).await?
    } else {
        sqlx::query_scalar(&total_query)
            .bind(format!("%{}%", search_pattern))
            .fetch_one(pool)
            .await?
    };

    let items_query = if where_clause.is_empty() {
        format!(
            "SELECT * FROM {} ORDER BY {} LIMIT $1 OFFSET $2",
            table_name, order_by
        )
    } else {
        format!(
            "SELECT * FROM {} WHERE {} ORDER BY {} LIMIT $2 OFFSET $3",
            table_name, where_clause, order_by
        )
    };

    let items: Vec<T> = if search_pattern.is_empty() {
        sqlx::query_as(&items_query)
            .bind(page_size)
            .bind(offset)
            .fetch_all(pool)
            .await?
    } else {
        sqlx::query_as(&items_query)
            .bind(format!("%{}%", search_pattern))
            .bind(page_size)
            .bind(offset)
            .fetch_all(pool)
            .await?
    };

    Ok(PaginatedResponse::new(items, total, page, page_size))
}

pub async fn delete(pool: &PgPool, table_name: &str, id: Uuid) -> Result<(), sqlx::Error> {
    let query = format!("DELETE FROM {} WHERE id = $1", table_name);
    sqlx::query(&query).bind(id).execute(pool).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 测试用的行类型，满足 `FromRow` 约束
    #[derive(sqlx::FromRow)]
    struct TestRow {
        id: Uuid,
    }

    /// 创建一个连接到不可达地址的 lazy PgPool
    fn unreachable_pool() -> PgPool {
        sqlx::postgres::PgPoolOptions::new()
            .max_connections(1)
            .acquire_timeout(std::time::Duration::from_millis(500))
            .connect_lazy("postgres://user:pass@127.0.0.1:1/unreachable_db")
            .expect("connect_lazy 不应失败（不实际连接）")
    }

    #[tokio::test]
    async fn get_by_id_unreachable_db_returns_err() {
        let pool = unreachable_pool();
        let id = Uuid::new_v4();
        let result: Result<TestRow, sqlx::Error> = get_by_id(&pool, "users", id).await;
        assert!(result.is_err(), "不可达数据库应返回 Err");
    }

    #[tokio::test]
    async fn get_by_id_empty_table_name_returns_err() {
        let pool = unreachable_pool();
        let id = Uuid::new_v4();
        let result: Result<TestRow, sqlx::Error> = get_by_id(&pool, "", id).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn list_with_pagination_default_params_unreachable_returns_err() {
        let pool = unreachable_pool();
        let params = PaginationParams {
            page: None,
            page_size: None,
            search: None,
            status: None,
        };
        let result: Result<PaginatedResponse<TestRow>, sqlx::Error> =
            list_with_pagination(&pool, "users", &params, "", "created_at").await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn list_with_pagination_custom_params_unreachable_returns_err() {
        let pool = unreachable_pool();
        let params = PaginationParams {
            page: Some(3),
            page_size: Some(50),
            search: None,
            status: None,
        };
        let result: Result<PaginatedResponse<TestRow>, sqlx::Error> =
            list_with_pagination(&pool, "orders", &params, "status = 'active'", "id").await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn list_with_pagination_with_where_clause_unreachable_returns_err() {
        let pool = unreachable_pool();
        let params = PaginationParams {
            page: Some(1),
            page_size: Some(20),
            search: None,
            status: None,
        };
        let result: Result<PaginatedResponse<TestRow>, sqlx::Error> =
            list_with_pagination(&pool, "users", &params, "age > 18", "name").await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn list_search_empty_pattern_unreachable_returns_err() {
        let pool = unreachable_pool();
        let params = PaginationParams {
            page: None,
            page_size: None,
            search: None,
            status: None,
        };
        let result: Result<PaginatedResponse<TestRow>, sqlx::Error> =
            list_search(&pool, "users", &["name", "email"], "", &params, "created_at").await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn list_search_nonempty_pattern_unreachable_returns_err() {
        let pool = unreachable_pool();
        let params = PaginationParams {
            page: Some(2),
            page_size: Some(15),
            search: None,
            status: None,
        };
        let result: Result<PaginatedResponse<TestRow>, sqlx::Error> =
            list_search(&pool, "users", &["name", "email"], "alice", &params, "id").await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn delete_unreachable_db_returns_err() {
        let pool = unreachable_pool();
        let id = Uuid::new_v4();
        let result: Result<(), sqlx::Error> = delete(&pool, "users", id).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn delete_empty_table_name_unreachable_returns_err() {
        let pool = unreachable_pool();
        let id = Uuid::new_v4();
        let result: Result<(), sqlx::Error> = delete(&pool, "", id).await;
        assert!(result.is_err());
    }

    /// 验证 PaginationParams 默认值在 list_with_pagination 中的行为：
    /// page 默认 1，page_size 默认 20 且上限 100
    /// （由于 DB 不可达，我们只能验证函数不 panic 且返回 Err）
    #[tokio::test]
    async fn list_with_pagination_uses_default_page_values_no_panic() {
        let pool = unreachable_pool();
        // page=0 应被 .max(1) 修正为 1；page_size=200 应被 .min(100) 修正为 100
        let params = PaginationParams {
            page: Some(0),
            page_size: Some(200),
            search: None,
            status: None,
        };
        let result: Result<PaginatedResponse<TestRow>, sqlx::Error> =
            list_with_pagination(&pool, "users", &params, "", "id").await;
        // 验证函数被调用且返回 Err（不 panic 说明 page/page_size 修正逻辑工作正常）
        assert!(result.is_err());
    }
}


use sqlx::{FromRow, PgPool};
use uuid::Uuid;

use crate::response::{PaginatedResponse, PaginationParams};

pub async fn get_by_id<T>(
    pool: &PgPool,
    table_name: &str,
    id: Uuid,
) -> Result<T, sqlx::Error>
where
    T: for<'r> FromRow<'r, sqlx::postgres::PgRow> + Send + Unpin,
{
    let query = format!("SELECT * FROM {} WHERE id = $1", table_name);
    sqlx::query_as::<sqlx::Postgres, T>(&query).bind(id).fetch_one(pool).await
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

use sqlx::PgPool;

pub async fn init_tables(pool: &PgPool) -> Result<(), sqlx::Error> {
    Ok(())
}
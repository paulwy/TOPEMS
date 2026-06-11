use sqlx::PgPool;

pub async fn init_tables(_pool: &PgPool) -> Result<(), sqlx::Error> {
    Ok(())
}
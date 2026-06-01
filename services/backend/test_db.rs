
use sqlx::{PgPool, Row};
use uuid::Uuid;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let database_url = "postgres://topems:topems_secret@localhost:5432/topems";
    let pool = PgPool::connect(database_url).await?;
    println!("Connected to database!");

    let rows = sqlx::query("SELECT * FROM production_plans")
        .fetch_all(&pool)
        .await?;

    println!("Got {} rows", rows.len());

    for row in rows.iter() {
        let id: Uuid = row.try_get("id")?;
        println!("Row id: {}", id);
        let product_name: String = row.try_get("product_name")?;
        println!("Product name: {}", product_name);
        let product_code: String = row.try_get("product_code")?;
        println!("Product code: {}", product_code);
        let planned_quantity: i32 = row.try_get("planned_quantity")?;
        println!("Planned quantity: {}", planned_quantity);
        let actual_quantity: i32 = row.try_get("actual_quantity")?;
        println!("Actual quantity: {}", actual_quantity);
        let start_date: chrono::NaiveDate = row.try_get("start_date")?;
        println!("Start date: {}", start_date);
        let end_date: chrono::NaiveDate = row.try_get("end_date")?;
        println!("End date: {}", end_date);
        let status: String = row.try_get("status")?;
        println!("Status: {}", status);
        let created_by: Option<String> = row.try_get("created_by")?;
        println!("Created by: {:?}", created_by);
        let created_at: chrono::NaiveDateTime = row.try_get("created_at")?;
        println!("Created at: {}", created_at);
        let updated_at: chrono::NaiveDateTime = row.try_get("updated_at")?;
        println!("Updated at: {}", updated_at);
    }

    Ok(())
}

use sqlx::{postgres::PgPoolOptions, Row};

#[tokio::main]
async fn main() {
    let database_url = "postgres://topems:topems_secret@localhost:5432/topems";
    
    let pool = PgPoolOptions::new()
        .max_connections(1)
        .connect(&database_url)
        .await
        .unwrap();
    
    println!("✅ 数据库连接成功");
    
    let result = sqlx::query("SELECT current_database()")
        .fetch_one(&pool)
        .await;
    
    match result {
        Ok(row) => {
            let db: String = row.get(0);
            println!("当前数据库: {}", db);
        }
        Err(e) => {
            println!("查询数据库名称失败: {}", e);
        }
    }
    
    let result = sqlx::query("SELECT schema_name FROM information_schema.schemata")
        .fetch_all(&pool)
        .await;
    
    match result {
        Ok(rows) => {
            println!("\n可用 schema:");
            for row in rows {
                let schema: String = row.get(0);
                println!("  - {}", schema);
            }
        }
        Err(e) => {
            println!("查询 schema 失败: {}", e);
        }
    }
    
    let result = sqlx::query("SELECT * FROM information_schema.tables WHERE table_schema = 'iam'")
        .fetch_all(&pool)
        .await;
    
    match result {
        Ok(rows) => {
            println!("\niam schema 中的表:");
            for row in rows {
                let table: String = row.get("table_name");
                println!("  - {}", table);
            }
        }
        Err(e) => {
            println!("查询表失败: {}", e);
        }
    }
    
    let result = sqlx::query("SELECT username FROM iam.users")
        .fetch_all(&pool)
        .await;
    
    match result {
        Ok(rows) => {
            println!("\niam.users 查询结果: {} 行", rows.len());
            for row in rows {
                let username: String = row.get(0);
                println!("  - {}", username);
            }
        }
        Err(e) => {
            println!("查询用户失败: {}", e);
        }
    }
}
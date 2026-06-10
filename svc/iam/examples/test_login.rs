use sqlx::{postgres::PgPoolOptions, Row};
use bcrypt::verify;

#[tokio::main]
async fn main() {
    let database_url = "postgres://topems:topems_secret@localhost:5432/topems";
    
    let pool = PgPoolOptions::new()
        .max_connections(1)
        .connect(&database_url)
        .await
        .unwrap();
    
    println!("✅ 数据库连接成功");
    
    let username = "admin";
    let password = "admin123";
    
    let result = sqlx::query(
        "SELECT id::text, username, email, full_name, password_hash, is_active, is_superuser, created_at, updated_at FROM iam.users WHERE username = $1"
    )
    .bind(username)
    .fetch_optional(&pool)
    .await;
    
    match result {
        Ok(Some(user)) => {
            println!("找到用户: {}", user.get::<String, _>("username"));
            println!("is_active: {}", user.get::<bool, _>("is_active"));
            let password_hash: String = user.get("password_hash");
            println!("密码哈希: {}", password_hash);
            
            let verify_result = verify(password, &password_hash).unwrap_or(false);
            println!("密码验证结果: {}", verify_result);
            
            if verify_result {
                println!("✅ 登录成功！");
            } else {
                println!("❌ 密码错误！");
            }
        }
        Ok(None) => {
            println!("❌ 用户不存在: {}", username);
        }
        Err(e) => {
            println!("查询失败: {}", e);
        }
    }
}

fn main() {
    println!("=== 测试 JWT_SECRET 读取 ===\n");
    
    // 读取系统环境变量
    let system_jwt_secret = std::env::var("JWT_SECRET");
    println!("系统环境变量 JWT_SECRET: {:?}", system_jwt_secret);
    
    // 加载 IAM 的 .env 文件
    let iam_path = "/Users/air/TOPEMS/platform/topems-iam/backend/.env";
    dotenvy::from_path(iam_path).ok();
    let iam_jwt_secret = std::env::var("JWT_SECRET");
    println!("IAM .env JWT_SECRET: {:?}", iam_jwt_secret);
    
    // 加载 HRM 的 .env 文件
    let hrm_path = "/Users/air/TOPEMS/services/topems-hrm/backend/.env";
    dotenvy::from_path(hrm_path).ok();
    let hrm_jwt_secret = std::env::var("JWT_SECRET");
    println!("HRM .env JWT_SECRET: {:?}", hrm_jwt_secret);
    
    println!("\n=== 检查 ===\n");
    if let (Ok(i), Ok(h)) = (&iam_jwt_secret, &hrm_jwt_secret) {
        if i == h {
            println!("✅ IAM 和 HRM 的 JWT_SECRET 一致！");
        } else {
            println!("❌ IAM 和 HRM 的 JWT_SECRET 不一致！");
            println!("   IAM: {}", i);
            println!("   HRM: {}", h);
        }
    }
}

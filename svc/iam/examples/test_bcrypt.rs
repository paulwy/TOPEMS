use bcrypt::{hash, verify, DEFAULT_COST};

fn main() {
    let password = "admin123";
    let hashed = hash(password, DEFAULT_COST).unwrap();
    println!("生成的哈希: {}", hashed);
    
    let result = verify(password, &hashed).unwrap_or(false);
    println!("验证结果: {}", result);
    
    let hash_from_db = "$2b$12$H4IHbFRqjjFSRy6tTWnlZeT3b5iHFrALcfBAUstpE8gOZi3blVINy";
    let result2 = verify(password, hash_from_db).unwrap_or(false);
    println!("数据库哈希验证结果: {}", result2);
    
    println!("两个哈希相同: {}", hashed == hash_from_db);
}
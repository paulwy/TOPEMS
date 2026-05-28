use bcrypt::{hash, DEFAULT_COST};

fn main() {
    let passwords = vec![("admin", "admin123"), ("user", "user123"), ("guest", "guest123")];
    for (username, password) in passwords {
        let hashed = hash(password, DEFAULT_COST).unwrap();
        println!("{}: {}", username, hashed);
    }
}
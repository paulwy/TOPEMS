fn main() { let h = bcrypt::hash("admin123", bcrypt::DEFAULT_COST).unwrap(); println!("{}", h); }

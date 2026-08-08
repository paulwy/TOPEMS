use bcrypt::{hash, DEFAULT_COST};
use std::env;

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() < 2 {
        println!("Usage: {} <password>", args[0]);
        std::process::exit(1);
    }
    let password = &args[1];
    let hashed = hash(password, DEFAULT_COST).unwrap();
    println!("{}", hashed);
}

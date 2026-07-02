use std::env;

fn main() {
    env::set_var("SQLX_OFFLINE", "true");
}

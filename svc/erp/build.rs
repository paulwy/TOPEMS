use std::env;

fn main() {
    env::set_var("SQLX_OFFLINE", "true");
    println!("cargo:rerun-if-changed=src/api/finance_reports.rs");
}

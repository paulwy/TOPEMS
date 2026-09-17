use std::env;

fn main() {
    // SQLx 离线编译：使用 .sqlx/ 缓存而非连接数据库做编译期查询检查。
    // 与 erp/qms/scm 同一意图——本机开发库非 mes 权威 schema（缺 equipment_code
    // /process_routes 等新列与表），连库检查会误报 "column does not exist"；
    // 权威 schema 在 staging/权威开发库，CI 亦以 SQLX_OFFLINE 编译。
    // 必须用 cargo:rustc-env 传递（env::set_var 仅影响 build script 进程，
    // 对 rustc 内运行的 sqlx proc-macro 不生效）。
    // 外部显式 SQLX_OFFLINE=false（如 `cargo sqlx prepare` 更新离线缓存）时尊重之；
    // 否则默认强制离线（保持原行为：本机开发库非 mes 权威 schema，连库检查会误报）。
    let offline = env::var("SQLX_OFFLINE").map(|v| v != "false").unwrap_or(true);
    if offline {
        env::set_var("SQLX_OFFLINE", "true");
        println!("cargo:rustc-env=SQLX_OFFLINE=true");
    }
    println!("cargo:rerun-if-changed=src/modules");
}

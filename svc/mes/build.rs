use std::env;

fn main() {
    // SQLx 编译模式：
    //   1) 外部显式 SQLX_OFFLINE（CI 设 true、`cargo sqlx prepare` 设 false）时尊重之；
    //   2) 未显式指定时：若提供 DATABASE_URL（本机权威库在线解析），则在线；
    //      否则回退离线（需 .sqlx/ 缓存，CI 无数据库场景）。
    // 历史背景：曾因本机开发库非 mes 权威 schema（缺列/表）而强制离线，现已通过
    // 迁移 000106 对齐双库结构，在线解析不再误报。
    // 必须用 cargo:rustc-env 传递（env::set_var 仅影响 build script 进程，
    // 对 rustc 内运行的 sqlx proc-macro 不生效）。
    let offline = match env::var("SQLX_OFFLINE") {
        Ok(v) => v != "false",
        Err(_) => env::var("DATABASE_URL").is_err(),
    };
    if offline {
        env::set_var("SQLX_OFFLINE", "true");
        println!("cargo:rustc-env=SQLX_OFFLINE=true");
    }
    println!("cargo:rerun-if-changed=src/modules");
}

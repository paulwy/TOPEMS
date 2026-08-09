//! V71 A1 · OpenAPI JSON 契约提取（integration test，无启动服务）
//!
//! 用法：
//!   export SQLX_OFFLINE=true
//!   cargo test -p <PKG> --test openapi_extract extract_openapi_spec -- --nocapture
//!
//! 产物：tmp/openapi/<PKG>.json（写入 workspace 根，使 aggregate.py 能 glob 合并）

use std::path::PathBuf;
use topems_mes::ApiDoc;
use utoipa::OpenApi;

#[test]
fn extract_openapi_spec() {
    let doc = ApiDoc::openapi();
    let json = doc
        .to_pretty_json()
        .expect("V71-A1: utoipa -> JSON 序列化失败");

    let head: String = json.chars().take(4096).collect();
    assert!(
        head.contains("\"openapi\"") && (head.contains("\"3.") || head.contains("\"3,")),
        "V71-A1: 提取结果不包含 openapi:3.x，首 4KB = {}",
        head
    );

    let pkg_name = env!("CARGO_PKG_NAME");
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let workspace_root = manifest_dir
        .parent()
        .and_then(|p| p.parent())
        .expect("CARGO_MANIFEST_DIR 应该是 <ws>/svc/<name> 或 <ws>/tools/<name>");
    let out_dir = workspace_root.join("tmp").join("openapi");
    std::fs::create_dir_all(&out_dir).expect("mkdir tmp/openapi 失败");
    let out_path = out_dir.join(format!("{}.json", pkg_name));
    std::fs::write(&out_path, json.as_bytes())
        .unwrap_or_else(|e| panic!("V71-A1: 写 {:?} 失败: {e}", out_path));

    let meta = std::fs::metadata(&out_path).expect("文件不存在");
    assert!(
        meta.len() >= 50,
        "产物太小: {} bytes（{:?}）",
        meta.len(),
        out_path
    );

    eprintln!("[V71-A1] OK: wrote {:?} ({} bytes)", out_path, meta.len());
}

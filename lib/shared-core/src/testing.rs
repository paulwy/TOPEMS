//! V71 A1 · OpenAPI 提取共享测试工具
//!
//! 30+ 个 `svc/*/tests/openapi_extract.rs` 集成测试共享的契约提取逻辑。
//! 调用方传入自己的 `ApiDoc` 类型、`CARGO_PKG_NAME` 与 `CARGO_MANIFEST_DIR`，
//! 本模块负责：序列化 → 校验 `openapi:3.x` 头部 → 写入 `<ws>/tmp/openapi/<pkg>.json`。
//!
//! 该模块不使用 `#[cfg(test)]` 门控，因为下游 svc crate 的集成测试需要
//! 在非 test build 下也能引用此函数；`utoipa` 与 `serde_json` 已是本 crate
//! 的常规依赖，不会引入额外体积。

use std::path::PathBuf;
use utoipa::OpenApi;

/// 提取 `T::openapi()` 生成的 OpenAPI 契约并写入 `tmp/openapi/<pkg_name>.json`。
///
/// 复现 `svc/*/tests/openapi_extract.rs` 历史共享的测试主体：
/// 1. 调用 `<T as utoipa::OpenApi>::openapi()` 生成 `OpenApi` 文档；
/// 2. `to_pretty_json()` 序列化为字符串；
/// 3. 校验首 4KB 含 `openapi:3.x` 标识；
/// 4. 根据 `manifest_dir` 上溯两级得到 workspace 根，写入 `tmp/openapi/<pkg_name>.json`；
/// 5. 校验产物 ≥ 50 bytes，打印 `[V71-A1] OK` 日志。
///
/// # Panics
/// 任何一步失败都会 panic（与原集成测试行为一致）。
pub fn extract_openapi_spec_to_file<T: OpenApi>(pkg_name: &str, manifest_dir: &str) {
    let doc = T::openapi();
    let json = doc
        .to_pretty_json()
        .expect("V71-A1: utoipa -> JSON 序列化失败");

    let head: String = json.chars().take(4096).collect();
    assert!(
        head.contains("\"openapi\"") && (head.contains("\"3.") || head.contains("\"3,")),
        "V71-A1: 提取结果不包含 openapi:3.x，首 4KB = {}",
        head
    );

    let manifest_dir = PathBuf::from(manifest_dir);
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

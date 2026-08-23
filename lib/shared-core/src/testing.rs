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

#[cfg(test)]
mod tests {
    use super::*;
    use utoipa::OpenApi;

    // ====== 用 derive(OpenApi) 定义最小/完整 ApiDoc ======

    /// 最小的 OpenAPI 文档（仅 info，无 paths 无 components）
    /// 用 utoipa v4 原生 derive，不手搓 trait impl（避免 API 漂移）
    #[derive(OpenApi, Debug, Clone)]
    #[openapi(info(
        title = "Minimum Test API",
        version = "1.0.0",
        description = "Smallest possible OpenApi doc for extract_openapi_spec_to_file unit tests."
    ))]
    struct MinApiDoc;

    /// 稍大的 OpenAPI 文档：含完整的 paths（3 个 endpoint mock）+ schemas（User 模型）
    /// 用来断言产物 JSON 结构与字节数。
    /// 注意：paths 属性需要指向真实存在的「handler-like free function」，
    /// 因此用 tests 内定义的 3 个空函数作为 handler paths。
    #[derive(OpenApi, Debug, Clone)]
    #[openapi(
        info(
            title = "Full Test API",
            version = "2.3.0",
            contact(name = "TOPEMS Unit Tests", email = "dev@topems.local"),
            description = "Extract coverage helper: validates openapi:3.x prefix + JSON parse"
        ),
        tags(
            (name = "users", description = "User management endpoints"),
            (name = "health", description = "Health probes")
        ),
        paths(
            tests::handle_list_users,
            tests::handle_get_user,
            tests::handle_health_check,
        ),
        components(schemas(
            tests::User,
            tests::UserStatus,
            tests::HealthResponse,
        ))
    )]
    struct FullApiDoc;

    // 「handler-like」函数：utoipa derive 需要 paths 属性指向真实的 fn item。
    // 这些函数只作为 openapi 文档抽取的「存在性锚点」，不会被执行。
    // 必须 pub，因为 utoipa 生成的代码从外部引用。
    /// 列出用户（仅用于 OpenAPI 路径锚点，不执行）
    #[utoipa::path(
        get,
        path = "/api/v1/users",
        tag = "users",
        responses(
            (status = 200, description = "成功返回用户列表", body = [User]),
            (status = 500, description = "服务器错误"),
        ),
        params(
            ("page" = i32, Query, description = "页码"),
            ("page_size" = i32, Query, description = "每页数量"),
        )
    )]
    pub fn handle_list_users() -> &'static str {
        "unused-anchor"
    }

    /// 获取单个用户（仅用于 OpenAPI 路径锚点，不执行）
    #[utoipa::path(
        get,
        path = "/api/v1/users/{id}",
        tag = "users",
        responses(
            (status = 200, description = "OK", body = User),
            (status = 404, description = "Not Found"),
        ),
        params(
            ("id" = String, Path, description = "用户 UUID"),
        )
    )]
    pub fn handle_get_user() -> &'static str {
        "unused-anchor"
    }

    /// 健康检查（仅用于 OpenAPI 路径锚点，不执行）
    #[utoipa::path(
        get,
        path = "/health",
        tag = "health",
        responses(
            (status = 200, description = "服务健康", body = HealthResponse),
        )
    )]
    pub fn handle_health_check() -> &'static str {
        "unused-anchor"
    }

    // 组件 schemas（与 FullApiDoc 的 components(schemas(...)) 对齐）
    use serde::{Deserialize, Serialize};
    use utoipa::ToSchema;

    #[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
    pub struct User {
        pub id: String,
        pub name: String,
        pub email: String,
        pub status: UserStatus,
    }

    #[derive(Debug, Clone, Copy, Serialize, Deserialize, ToSchema)]
    pub enum UserStatus {
        Active,
        Inactive,
        Suspended,
    }

    #[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
    pub struct HealthResponse {
        pub ok: bool,
        pub version: String,
        pub uptime_secs: i64,
    }

    fn workspace_root() -> PathBuf {
        // CARGO_MANIFEST_DIR for shared-core = <ws>/lib/shared-core
        // Go up 2 levels to get workspace root
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .and_then(|p| p.parent())
            .map(|p| p.to_path_buf())
            .expect("shared-core manifest should be at <ws>/lib/shared-core")
    }

    fn cleanup_test_file(pkg_name: &str) {
        let out_path = workspace_root()
            .join("tmp")
            .join("openapi")
            .join(format!("{}.json", pkg_name));
        // Best-effort cleanup; ignore errors
        std::fs::remove_file(&out_path).ok();
    }

    // ====== 用例组 1：正常路径（FullApiDoc 的完整 spec） ======

    #[test]
    fn extract_full_doc_writes_valid_json() {
        let pkg = "testing_ut_full";
        cleanup_test_file(pkg);

        extract_openapi_spec_to_file::<FullApiDoc>(pkg, env!("CARGO_MANIFEST_DIR"));

        // Ver1: 文件存在
        let out_path = workspace_root()
            .join("tmp")
            .join("openapi")
            .join(format!("{}.json", pkg));
        assert!(out_path.exists(), "产物文件不存在: {:?}", out_path);

        // Ver2: 字节数 >= 50（FullApiDoc 有 3 paths + 3 schemas）
        let sz = std::fs::metadata(&out_path).unwrap().len();
        assert!(sz >= 50, "产物字节数 {} 太小", sz);

        // Ver3: 内容可解析，核心结构存在
        let content = std::fs::read_to_string(&out_path).unwrap();
        assert!(content.contains("\"openapi\""), "产物缺失 openapi key");
        assert!(
            content.contains("\"3.0\"") || content.contains("\"3."),
            "产物未命中 3.x 版本号（utoipa v4 默认 3.0.3）"
        );

        // Ver4: JSON parse + 关键字段非空
        let parsed: serde_json::Value = serde_json::from_str(&content).expect("产物不是合法 JSON");
        assert!(parsed["info"]["title"].is_string());
        assert_eq!(parsed["info"]["version"], "2.3.0"); // FullApiDoc info.version
                                                        // paths: /api/v1/users, /api/v1/users/{id}, /health
        assert!(
            parsed["paths"].as_object().map_or(0, |m| m.len()) >= 3,
            "FullApiDoc 至少应有 3 个 endpoint，got {:?}",
            parsed["paths"]
        );
        // components.schemas: User, UserStatus, HealthResponse
        assert!(
            parsed["components"]["schemas"]
                .as_object()
                .map_or(0, |m| m.len())
                >= 3,
            "FullApiDoc 至少应有 3 个 schema，got {:?}",
            parsed["components"]["schemas"]
        );

        cleanup_test_file(pkg);
    }

    // ====== 用例组 2：manifest_dir 边界校验 ======

    #[test]
    #[should_panic(expected = "CARGO_MANIFEST_DIR 应该是")]
    fn manifest_dir_too_shallow_panics() {
        // 只传单层路径（如 "/tmp"），没有两层 parent → 应 panic
        extract_openapi_spec_to_file::<FullApiDoc>("testing_ut_shallow", "/tmp");
    }

    #[test]
    #[should_panic(expected = "mkdir tmp/openapi 失败")]
    fn manifest_dir_path_with_file_component_panics() {
        // 指向一个不存在目录的深层路径，mkdir 时会失败
        let bad_dir = if cfg!(windows) {
            "Z:\\nonexistent\\level2"
        } else {
            "/proc/nonexistent/level2/level3"
        };
        extract_openapi_spec_to_file::<FullApiDoc>("testing_ut_badpath", bad_dir);
    }

    // ====== 用例组 3：head 4K 断言逻辑覆盖 ======

    #[test]
    fn openapi_header_present_in_head_4k() {
        // 构造 5000+ chars 的 JSON，openapi:"3.0.3" 位于开头（远在 4K 之前）
        let mut big = String::from(
            r#"{"openapi":"3.0.3","info":{"title":"X","version":"1.0"},"paths":{},"x-padding":""#,
        );
        big.push_str(&"A".repeat(5000));
        big.push_str(r#""}"""#);

        let head: String = big.chars().take(4096).collect();
        assert!(
            head.contains("\"openapi\"") && (head.contains("\"3.") || head.contains("\"3,")),
            "head 4K 未捕捉到 openapi:3.x 标识（head.len={}）",
            head.len()
        );
    }

    // ====== 用例组 4：workspace 根定位 ======

    #[test]
    fn workspace_root_resolution_matches_manifest_traverse() {
        let ws = workspace_root();
        assert!(
            ws.join("Cargo.toml").exists(),
            "{:?} 不含顶层 Cargo.toml（workspace 根定位错误）",
            ws
        );
        assert!(ws.join("svc").is_dir(), "{:?} 不含 svc/ 目录", ws);
        assert!(ws.join("lib").is_dir(), "{:?} 不含 lib/ 目录", ws);
    }

    // ====== 用例组 5：最小 spec（MinApiDoc，边界 50 bytes） ======

    #[test]
    fn min_spec_meets_50bytes_threshold() {
        let pkg = "testing_ut_min";
        cleanup_test_file(pkg);
        extract_openapi_spec_to_file::<MinApiDoc>(pkg, env!("CARGO_MANIFEST_DIR"));

        let out_path = workspace_root()
            .join("tmp")
            .join("openapi")
            .join(format!("{}.json", pkg));
        let sz = std::fs::metadata(&out_path).unwrap().len();
        assert!(sz >= 50, "MinApiDoc 也应 ≥ 50 bytes，实际 {} bytes", sz);
        let c = std::fs::read_to_string(&out_path).unwrap();
        assert!(c.contains("openapi") && c.contains("info"));
        // 不能有 endpoints/schemas（MinApiDoc 是最小集合）
        let parsed: serde_json::Value = serde_json::from_str(&c).unwrap();
        assert_eq!(
            parsed["info"]["title"], "Minimum Test API",
            "MinApiDoc title mismatch"
        );

        cleanup_test_file(pkg);
    }

    // ====== 用例组 6：两次调用（覆盖幂等） ======

    #[test]
    fn repeated_extracts_are_idempotent() {
        let pkg = "testing_ut_idem";
        cleanup_test_file(pkg);

        extract_openapi_spec_to_file::<FullApiDoc>(pkg, env!("CARGO_MANIFEST_DIR"));
        let sz1 = std::fs::metadata(
            workspace_root()
                .join("tmp")
                .join("openapi")
                .join(format!("{}.json", pkg)),
        )
        .unwrap()
        .len();

        extract_openapi_spec_to_file::<FullApiDoc>(pkg, env!("CARGO_MANIFEST_DIR"));
        let sz2 = std::fs::metadata(
            workspace_root()
                .join("tmp")
                .join("openapi")
                .join(format!("{}.json", pkg)),
        )
        .unwrap()
        .len();

        assert_eq!(sz1, sz2, "两次提取产物字节数不一致（非幂等）");

        cleanup_test_file(pkg);
    }
}

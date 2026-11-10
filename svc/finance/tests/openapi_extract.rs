//! V71 A1 · OpenAPI JSON 契约提取（integration test，无启动服务）
//! 产物：tmp/openapi/<PKG>.json（写入 workspace 根，使 aggregate.py 能 glob 合并）

use topems_finance::ApiDoc;

#[test]
fn extract_openapi_spec() {
    // utoipa 递归生成 Schema 较深，主线程默认栈会溢出；放到 32MB 栈的独立线程执行。
    std::thread::Builder::new()
        .stack_size(32 * 1024 * 1024)
        .spawn(|| {
            topems_shared_core::testing::extract_openapi_spec_to_file::<ApiDoc>(
                env!("CARGO_PKG_NAME"),
                env!("CARGO_MANIFEST_DIR"),
            );
        })
        .expect("Failed to spawn OpenAPI extraction thread")
        .join()
        .expect("OpenAPI extraction thread panicked");
}

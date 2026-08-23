//! V71 A1 · OpenAPI JSON 契约提取（integration test，无启动服务）
//! 产物：tmp/openapi/<PKG>.json（写入 workspace 根，使 aggregate.py 能 glob 合并）

use topems_erp::openapi::ErpApiDoc;

#[test]
fn extract_openapi_spec() {
    topems_shared_core::testing::extract_openapi_spec_to_file::<ErpApiDoc>(
        env!("CARGO_PKG_NAME"),
        env!("CARGO_MANIFEST_DIR"),
    );
}

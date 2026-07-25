//! common 模块冒烟测试：验证 TestContext 等辅助类型能正常编译和构造

mod common;

use common::TestContext;

#[tokio::test]
async fn test_context_can_construct() {
    let ctx = TestContext::new().await;
    assert!(!ctx.admin_token.is_empty());
}

#[test]
fn test_base_url_is_correct() {
    assert_eq!(TestContext::base_url(), "http://localhost:8090");
}

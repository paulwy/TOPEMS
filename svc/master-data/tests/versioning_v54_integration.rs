//! V54 Versioning 模块 HTTP 集成测试
//!
//! 覆盖版本控制、审计日志、数据权限矩阵主要端点。
//! 所有测试默认 #[ignore]，需要服务启动时手动执行。
//!
//! 运行命令:
//! cargo test -p topems-master-data --test versioning_v54_integration -- --ignored

mod common;

use common::TestContext;
use serde_json::json;

const BASE_PATH: &str = "/api/master-data/api/master/mdm-v54";

/// 1. 创建版本快照
#[tokio::test]
#[ignore]
async fn test_create_snapshot() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "entity_type": "customer",
        "entity_id": "CUST-TEST-001",
        "data": {
            "name": "集成测试客户",
            "code": "CUST-TEST-001",
            "industry": "technology",
            "status": "active"
        },
        "comment": "集成测试创建快照"
    });

    let (status, resp) = ctx
        .request("POST", &format!("{}/version/snapshot", BASE_PATH), Some(body))
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"]["id"].is_string());
    assert_eq!(resp["data"]["entity_type"], "customer");
    assert_eq!(resp["data"]["entity_id"], "CUST-TEST-001");
}

/// 2. 获取版本快照
#[tokio::test]
#[ignore]
async fn test_get_version() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", &format!("{}/version/customer/C0001", BASE_PATH), None)
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"]["id"].is_string());
}

/// 3. 版本差异对比
#[tokio::test]
#[ignore]
async fn test_diff_versions() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let create_body = json!({
        "entity_type": "product",
        "entity_id": "PROD-DIFF-001",
        "data": {
            "name": "产品v1",
            "price": 100
        },
        "comment": "v1版本"
    });

    ctx.request("POST", &format!("{}/version/snapshot", BASE_PATH), Some(create_body))
        .await
        .expect("创建v1失败");

    let create_body2 = json!({
        "entity_type": "product",
        "entity_id": "PROD-DIFF-001",
        "data": {
            "name": "产品v2",
            "price": 200,
            "description": "新增描述"
        },
        "comment": "v2版本"
    });

    ctx.request("POST", &format!("{}/version/snapshot", BASE_PATH), Some(create_body2))
        .await
        .expect("创建v2失败");

    let (status, resp) = ctx
        .request(
            "GET",
            &format!(
                "{}/version/diff?entity_type=product&entity_id=PROD-DIFF-001&from_version=v1.0.0&to_version=v2.0.0",
                BASE_PATH
            ),
            None,
        )
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
}

/// 4. 恢复版本
#[tokio::test]
#[ignore]
async fn test_restore_version() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "entity_type": "customer",
        "entity_id": "C0001",
        "version": "v1.0.0"
    });

    let (status, resp) = ctx
        .request("POST", &format!("{}/version/restore", BASE_PATH), Some(body))
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
}

/// 5. 查询审计日志
#[tokio::test]
#[ignore]
async fn test_query_audit_log() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", &format!("{}/audit/log?page=1&page_size=10", BASE_PATH), None)
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"]["items"].is_array());
    assert!(resp["data"]["total"].is_number());
}

/// 6. 创建分支
#[tokio::test]
#[ignore]
async fn test_create_branch() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "name": "feature/integration-test",
        "branch_type": "feature",
        "parent_branch": "main"
    });

    let (status, resp) = ctx
        .request("POST", &format!("{}/version/branch", BASE_PATH), Some(body))
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert_eq!(resp["data"]["name"], "feature/integration-test");
}

/// 7. 合并分支
#[tokio::test]
#[ignore]
async fn test_merge_branch() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "source_branch": "feature/customer-v2",
        "target_branch": "main"
    });

    let (status, resp) = ctx
        .request("POST", &format!("{}/version/merge", BASE_PATH), Some(body))
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
}

/// 8. 授予权限
#[tokio::test]
#[ignore]
async fn test_grant_permission() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "role_id": "test-role-id",
        "resource_type": "customer",
        "resource_id": "*",
        "action": "read",
        "condition": {
            "region": "cn"
        }
    });

    let (status, resp) = ctx
        .request("POST", &format!("{}/permissions/grant", BASE_PATH), Some(body))
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
}

/// 9. 权限检查
#[tokio::test]
#[ignore]
async fn test_check_permission() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request(
            "GET",
            &format!(
                "{}/permissions/check?user_id=user-001&resource_type=customer&resource_id=*&action=read",
                BASE_PATH
            ),
            None,
        )
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"]["has_permission"].is_boolean());
}

/// 10. 创建角色
#[tokio::test]
#[ignore]
async fn test_create_role() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "name": "integration-test-role",
        "description": "集成测试角色",
        "inherited_from": null
    });

    let (status, resp) = ctx
        .request("POST", &format!("{}/roles", BASE_PATH), Some(body))
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert_eq!(resp["data"]["name"], "integration-test-role");
}

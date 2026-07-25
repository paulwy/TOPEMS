//! V60 Metadata 模块 HTTP 集成测试
//!
//! 覆盖元数据管理主要端点：CRUD、搜索、统计、属性、标签等。
//! 所有测试默认 #[ignore]，需要服务启动时手动执行。

mod common;

use common::TestContext;
use serde_json::json;

/// 1. 创建元数据
#[tokio::test]
#[ignore]
async fn test_create_metadata() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "name": "集成测试-产品主数据表",
        "object_type": "table",
        "description": "用于集成测试的产品主数据表",
        "owner": "test_owner_001",
        "tags": ["product", "test"],
        "attributes": {
            "row_count": 10000,
            "storage": "normal"
        }
    });

    let (status, resp) = ctx
        .v60_request("POST", "/metadata", Some(body))
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false), "响应 success 应为 true");
    assert!(resp["data"]["id"].is_string(), "应返回创建的元数据 ID");
    assert_eq!(resp["data"]["name"], "集成测试-产品主数据表");
    assert_eq!(resp["data"]["object_type"], "table");
}

/// 2. 获取元数据列表
#[tokio::test]
#[ignore]
async fn test_list_metadata() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .v60_request("GET", "/metadata", None)
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"].is_array(), "data 应为数组");
}

/// 3. 获取单个元数据
#[tokio::test]
#[ignore]
async fn test_get_metadata_by_id() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let create_body = json!({
        "name": "集成测试-查询测试表",
        "object_type": "table",
        "description": "用于测试按 ID 查询",
        "owner": "test_owner_002"
    });

    let (_, create_resp) = ctx
        .v60_request("POST", "/metadata", Some(create_body))
        .await
        .expect("创建失败");
    let metadata_id = create_resp["data"]["id"].as_str().unwrap();

    let (status, resp) = ctx
        .v60_request("GET", &format!("/metadata/{}", metadata_id), None)
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert_eq!(resp["data"]["id"], metadata_id);
    assert_eq!(resp["data"]["name"], "集成测试-查询测试表");
}

/// 4. 搜索元数据
#[tokio::test]
#[ignore]
async fn test_search_metadata() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .v60_request("GET", "/metadata/search?q=客户", None)
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"].is_array(), "搜索结果应为数组");
}

/// 5. 更新元数据
#[tokio::test]
#[ignore]
async fn test_update_metadata() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let create_body = json!({
        "name": "集成测试-更新测试表",
        "object_type": "entity",
        "description": "待更新的元数据",
        "owner": "test_owner_003"
    });

    let (_, create_resp) = ctx
        .v60_request("POST", "/metadata", Some(create_body))
        .await
        .expect("创建失败");
    let metadata_id = create_resp["data"]["id"].as_str().unwrap();

    let update_body = json!({
        "name": "集成测试-更新测试表(已更新)",
        "description": "已更新的描述",
        "owner": "test_owner_updated"
    });

    let (status, resp) = ctx
        .v60_request("PUT", &format!("/metadata/{}", metadata_id), Some(update_body))
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert_eq!(resp["data"]["name"], "集成测试-更新测试表(已更新)");
    assert_eq!(resp["data"]["owner"], "test_owner_updated");
}

/// 6. 删除元数据
#[tokio::test]
#[ignore]
async fn test_delete_metadata() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let create_body = json!({
        "name": "集成测试-待删除表",
        "object_type": "model",
        "description": "用于测试删除的元数据",
        "owner": "test_owner_004"
    });

    let (_, create_resp) = ctx
        .v60_request("POST", "/metadata", Some(create_body))
        .await
        .expect("创建失败");
    let metadata_id = create_resp["data"]["id"].as_str().unwrap();

    let (del_status, del_resp) = ctx
        .v60_request("DELETE", &format!("/metadata/{}", metadata_id), None)
        .await
        .expect("删除请求失败");

    assert_eq!(del_status, 200);
    assert!(del_resp["success"].as_bool().unwrap_or(false));

    let (get_status, _) = ctx
        .v60_request("GET", &format!("/metadata/{}", metadata_id), None)
        .await
        .expect("查询请求失败");
    assert_eq!(get_status, 404, "删除后应查询应返回 404");
}

/// 7. 获取元数据统计
#[tokio::test]
#[ignore]
async fn test_get_metadata_stats() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .v60_request("GET", "/metadata/stats", None)
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"]["total_objects"].is_number());
    assert!(resp["data"]["total_attributes"].is_number());
    assert!(resp["data"]["total_tags"].is_number());
    assert!(resp["data"]["by_type"].is_object());
    assert!(resp["data"]["recent_created"].is_array());
}

/// 8. 添加元数据属性（子资源测试）
#[tokio::test]
#[ignore]
async fn test_add_metadata_attribute() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let create_body = json!({
        "name": "集成测试-属性测试表",
        "object_type": "table",
        "description": "用于测试添加属性",
        "owner": "test_owner_005"
    });

    let (_, create_resp) = ctx
        .v60_request("POST", "/metadata", Some(create_body))
        .await
        .expect("创建失败");
    let metadata_id = create_resp["data"]["id"].as_str().unwrap();

    let attr_body = json!({
        "object_id": metadata_id,
        "key": "test_attribute",
        "value": "test_value",
        "data_type": "string",
        "is_required": true
    });

    let (status, resp) = ctx
        .v60_request("POST", &format!("/metadata/{}/attribute", metadata_id), Some(attr_body))
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert_eq!(resp["data"]["key"], "test_attribute");
    assert_eq!(resp["data"]["value"], "test_value");
    assert!(resp["data"]["is_required"].as_bool().unwrap_or(false));
}

/// 9. 添加元数据标签
#[tokio::test]
#[ignore]
async fn test_add_metadata_tag() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let tag_body = json!({
        "name": "integration_test_tag",
        "color": "#ff6b6b",
        "description": "集成测试标签"
    });

    let (status, resp) = ctx
        .v60_request("POST", "/metadata/tag", Some(tag_body))
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert_eq!(resp["data"]["name"], "integration_test_tag");
    assert_eq!(resp["data"]["color"], "#ff6b6b");
}

/// 10. 按类型过滤元数据列表
#[tokio::test]
#[ignore]
async fn test_list_metadata_by_type() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .v60_request("GET", "/metadata?object_type=table", None)
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"].is_array());
}

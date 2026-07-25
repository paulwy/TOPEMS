//! V51 Quality 模块 HTTP 集成测试
//!
//! 覆盖质量规则 CRUD、质量检查、仪表盘、AI 建议等主要端点。
//! 所有测试默认 #[ignore]，需要服务启动时手动执行。
//!
//! 运行命令：
//! ```bash
//! cargo test -p topems-master-data --test quality_v51_integration -- --ignored
//! ```

mod common;

use common::TestContext;
use serde_json::json;

const V51_PREFIX: &str = "/api/master-data/api/master/quality-v51";

/// 1. 创建质量规则
#[tokio::test]
#[ignore]
async fn test_create_quality_rule() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "name": "集成测试-客户邮箱格式校验",
        "entity_type": "customer",
        "rule_type": "format",
        "description": "客户邮箱必须符合标准邮箱格式",
        "severity": "error",
        "parameters": {
            "pattern": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
            "field": "email"
        }
    });

    let (status, resp) = ctx
        .request("POST", &format!("{}/rules", V51_PREFIX), Some(body))
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false), "响应 success 应为 true");
    assert!(resp["data"]["id"].is_string(), "应返回创建的规则 ID");
    assert_eq!(resp["data"]["name"], "集成测试-客户邮箱格式校验");
    assert_eq!(resp["data"]["entity_type"], "customer");
}

/// 2. 获取质量规则列表
#[tokio::test]
#[ignore]
async fn test_list_quality_rules() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", &format!("{}/rules", V51_PREFIX), None)
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"].is_array(), "data 应为数组");
}

/// 3. 获取单个质量规则
#[tokio::test]
#[ignore]
async fn test_get_quality_rule() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let create_body = json!({
        "name": "集成测试-查询测试规则",
        "entity_type": "product",
        "rule_type": "required",
        "description": "产品名称必填",
        "severity": "warning"
    });

    let (_, create_resp) = ctx
        .request("POST", &format!("{}/rules", V51_PREFIX), Some(create_body))
        .await
        .expect("创建失败");
    let rule_id = create_resp["data"]["id"].as_str().unwrap();

    let (status, resp) = ctx
        .request("GET", &format!("{}/rules/{}", V51_PREFIX, rule_id), None)
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert_eq!(resp["data"]["id"], rule_id);
    assert_eq!(resp["data"]["name"], "集成测试-查询测试规则");
}

/// 4. 更新质量规则
#[tokio::test]
#[ignore]
async fn test_update_quality_rule() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let create_body = json!({
        "name": "集成测试-待更新规则",
        "entity_type": "supplier",
        "rule_type": "range",
        "description": "待更新的规则",
        "severity": "warning"
    });

    let (_, create_resp) = ctx
        .request("POST", &format!("{}/rules", V51_PREFIX), Some(create_body))
        .await
        .expect("创建失败");
    let rule_id = create_resp["data"]["id"].as_str().unwrap();

    let update_body = json!({
        "name": "集成测试-已更新规则",
        "description": "已更新的描述",
        "severity": "error",
        "enabled": false
    });

    let (status, resp) = ctx
        .request("PUT", &format!("{}/rules/{}", V51_PREFIX, rule_id), Some(update_body))
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert_eq!(resp["data"]["name"], "集成测试-已更新规则");
    assert_eq!(resp["data"]["severity"], "error");
    assert!(!resp["data"]["enabled"].as_bool().unwrap_or(true));
}

/// 5. 删除质量规则
#[tokio::test]
#[ignore]
async fn test_delete_quality_rule() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let create_body = json!({
        "name": "集成测试-待删除规则",
        "entity_type": "material",
        "rule_type": "format",
        "description": "用于测试删除的规则",
        "severity": "warning"
    });

    let (_, create_resp) = ctx
        .request("POST", &format!("{}/rules", V51_PREFIX), Some(create_body))
        .await
        .expect("创建失败");
    let rule_id = create_resp["data"]["id"].as_str().unwrap();

    let (del_status, del_resp) = ctx
        .request("DELETE", &format!("{}/rules/{}", V51_PREFIX, rule_id), None)
        .await
        .expect("删除请求失败");

    assert_eq!(del_status, 200);
    assert!(del_resp["success"].as_bool().unwrap_or(false));

    let (get_status, _) = ctx
        .request("GET", &format!("{}/rules/{}", V51_PREFIX, rule_id), None)
        .await
        .expect("查询请求失败");
    assert_eq!(get_status, 404, "删除后查询应返回 404");
}

/// 6. 执行质量检查
#[tokio::test]
#[ignore]
async fn test_run_quality_check() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "entity_type": "customer",
        "entity_id": "C-TEST-001"
    });

    let (status, resp) = ctx
        .request("POST", &format!("{}/checks", V51_PREFIX), Some(body))
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"].is_array(), "检查结果应为数组");
}

/// 7. 获取质量检查列表
#[tokio::test]
#[ignore]
async fn test_list_quality_checks() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", &format!("{}/checks", V51_PREFIX), None)
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"]["items"].is_array(), "items 应为数组");
    assert!(resp["data"]["total"].is_number(), "total 应为数字");
}

/// 8. 获取质量仪表盘
#[tokio::test]
#[ignore]
async fn test_get_quality_dashboard() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", &format!("{}/dashboard", V51_PREFIX), None)
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"]["total_entities"].is_number());
    assert!(resp["data"]["quality_score"].is_number());
    assert!(resp["data"]["insights"].is_array());
}

/// 9. 生成 AI 治理建议
#[tokio::test]
#[ignore]
async fn test_generate_ai_suggestions() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "entity_type": "customer",
        "entity_id": "C-TEST-AI-001",
        "suggestion_types": ["standardize", "enrich"]
    });

    let (status, resp) = ctx
        .request("POST", &format!("{}/ai/suggest", V51_PREFIX), Some(body))
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"].is_array(), "建议列表应为数组");
}

/// 10. 获取质量评分
#[tokio::test]
#[ignore]
async fn test_get_quality_score() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", &format!("{}/score", V51_PREFIX), None)
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"]["overall_score"].is_number());
    assert!(resp["data"]["total_checks"].is_number());
}

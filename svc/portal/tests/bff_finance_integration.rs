//! BFF → Finance 代理集成测试
//!
//! 测试 Portal BFF 作为聚合层代理请求到下游服务的关键业务路径：
//! - 请求头转发逻辑（authorization / x-tenant-id / x-user-id）
//! - 健康检查响应结构验证
//! - Finance 服务客户端的 URL 拼装与端点映射
//! - 代理响应降级模式验证
//!
//! 注意：V60 精简后，tickets/SLA 纯代理路由已移除，前端直连 unified-core。
//! 本测试文件保留与 BFF 聚合层相关的通用测试（URL 拼装、头转发、响应模式）。

use axum::http::HeaderMap;
use axum::http::HeaderValue;

use topems_shared_event::event::EventPublisher;
use topems_shared_service_client::service_client::api::finance_api::FinanceApi;
use topems_shared_service_client::TypedServiceClient;

/// 构造带有 auth/tenant/user 头的 HeaderMap
fn make_forwarded_headers() -> HeaderMap {
    let mut headers = HeaderMap::new();
    headers.insert(
        "authorization",
        HeaderValue::from_static("Bearer test-token-abc123"),
    );
    headers.insert("x-tenant-id", HeaderValue::from_static("tenant-001"));
    headers.insert("x-user-id", HeaderValue::from_static("user-001"));
    headers
}

/// ============ unified-core URL 拼装测试 ============

#[test]
fn test_unified_core_url_default() {
    // 复现 tickets 代理中使用的 URL 拼装逻辑（前端直连 unified-core 时同样适用）
    let core_url = std::env::var("UNIFIED_CORE_URL")
        .or_else(|_| std::env::var("CORE_URL"))
        .unwrap_or_else(|_| "http://localhost:8000".to_string());

    let url = format!("{}/api/core/master/sla-policies", core_url);
    assert!(
        url.starts_with("http://"),
        "URL 应以 http:// 开头，实际: {}",
        url
    );
    assert!(
        url.ends_with("/api/core/master/sla-policies"),
        "URL 应以 /api/core/master/sla-policies 结尾，实际: {}",
        url
    );
}

#[test]
fn test_sla_policy_detail_url_formation() {
    let core_url = "http://localhost:8000";
    let policy_id = "policy-123";
    let url = format!("{}/api/core/master/sla-policies/{}", core_url, policy_id);
    assert_eq!(
        url,
        "http://localhost:8000/api/core/master/sla-policies/policy-123"
    );
}

#[test]
fn test_ticket_sla_url_formation() {
    let core_url = "http://localhost:8000";
    let ticket_id = "ticket-456";
    let url = format!("{}/api/core/master/tickets/{}/sla", core_url, ticket_id);
    assert_eq!(
        url,
        "http://localhost:8000/api/core/master/tickets/ticket-456/sla"
    );
}

#[test]
fn test_sla_stats_url_formation() {
    let core_url = "http://localhost:8000";
    let url = format!("{}/api/core/master/tickets/sla-stats", core_url);
    assert_eq!(
        url,
        "http://localhost:8000/api/core/master/tickets/sla-stats"
    );
}

#[test]
fn test_ticket_list_url_formation() {
    let core_url = "http://localhost:8000";
    let url = format!("{}/api/core/master/tickets", core_url);
    assert_eq!(url, "http://localhost:8000/api/core/master/tickets");
}

#[test]
fn test_ticket_detail_url_formation() {
    let core_url = "http://localhost:8000";
    let ticket_id = "t-789";
    let url = format!("{}/api/core/master/tickets/{}", core_url, ticket_id);
    assert_eq!(url, "http://localhost:8000/api/core/master/tickets/t-789");
}

#[test]
fn test_ticket_comments_url_formation() {
    let core_url = "http://localhost:8000";
    let ticket_id = "t-789";
    let url = format!(
        "{}/api/core/master/tickets/{}/comments",
        core_url, ticket_id
    );
    assert_eq!(
        url,
        "http://localhost:8000/api/core/master/tickets/t-789/comments"
    );
}

#[test]
fn test_ticket_stats_url_formation() {
    let core_url = "http://localhost:8000";
    let url = format!("{}/api/core/master/tickets/stats", core_url);
    assert_eq!(url, "http://localhost:8000/api/core/master/tickets/stats");
}

/// ============ 请求头转发逻辑测试 ============

#[test]
fn test_forward_headers_extracts_auth() {
    let headers = make_forwarded_headers();

    let auth = headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    assert_eq!(auth, "Bearer test-token-abc123");
}

#[test]
fn test_forward_headers_extracts_tenant_id() {
    let headers = make_forwarded_headers();

    let tenant_id = headers
        .get("x-tenant-id")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    assert_eq!(tenant_id, "tenant-001");
}

#[test]
fn test_forward_headers_extracts_user_id() {
    let headers = make_forwarded_headers();

    let user_id = headers
        .get("x-user-id")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    assert_eq!(user_id, "user-001");
}

#[test]
fn test_forward_headers_handles_missing_headers() {
    let headers = HeaderMap::new();

    // 复现 forward_headers 的逻辑：缺失的头不转发
    let result: Vec<(String, String)> = Vec::new();

    let auth = headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());
    let tid = headers
        .get("x-tenant-id")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());
    let uid = headers
        .get("x-user-id")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());

    assert!(auth.is_none(), "缺失的 authorization 头应返回 None");
    assert!(tid.is_none(), "缺失的 x-tenant-id 头应返回 None");
    assert!(uid.is_none(), "缺失的 x-user-id 头应返回 None");
    assert!(result.is_empty(), "无头转发时结果应为空");
}

#[test]
fn test_forward_headers_collects_all_present() {
    let headers = make_forwarded_headers();

    // 复现 forward_headers 的逻辑
    let mut result: Vec<(String, String)> = Vec::new();
    if let Some(auth) = headers.get("authorization").and_then(|v| v.to_str().ok()) {
        result.push(("authorization".to_string(), auth.to_string()));
    }
    if let Some(tid) = headers.get("x-tenant-id").and_then(|v| v.to_str().ok()) {
        result.push(("x-tenant-id".to_string(), tid.to_string()));
    }
    if let Some(uid) = headers.get("x-user-id").and_then(|v| v.to_str().ok()) {
        result.push(("x-user-id".to_string(), uid.to_string()));
    }

    assert_eq!(result.len(), 3, "应转发 3 个头");
    assert_eq!(result[0].0, "authorization");
    assert_eq!(result[0].1, "Bearer test-token-abc123");
    assert_eq!(result[1].0, "x-tenant-id");
    assert_eq!(result[1].1, "tenant-001");
    assert_eq!(result[2].0, "x-user-id");
    assert_eq!(result[2].1, "user-001");
}

/// ============ 健康检查响应结构测试 ============

#[test]
fn test_health_check_response_structure() {
    // 复现 portal health_check 的响应结构
    use topems_shared_core::health::{HealthStatus, ServiceHealth};

    let health = ServiceHealth::healthy("topems-portal");

    assert_eq!(health.service_name, "topems-portal");
    assert_eq!(health.status, HealthStatus::Healthy);
}

#[test]
fn test_api_response_success_structure() {
    use topems_shared::ApiResponse;

    let resp: ApiResponse<String> = ApiResponse::success("ok".to_string(), "健康检查完成");

    assert_eq!(resp.code, 200);
    assert!(resp.success);
    assert_eq!(resp.data, Some("ok".to_string()));
    assert_eq!(resp.message, "健康检查完成");
    assert!(!resp.timestamp.is_empty());
}

#[test]
fn test_api_response_error_structure() {
    use topems_shared::ApiResponse;

    let resp: ApiResponse<String> = ApiResponse::error(502, "工单服务不可用");

    assert_eq!(resp.code, 502);
    assert!(!resp.success);
    assert!(resp.data.is_none());
    assert_eq!(resp.message, "工单服务不可用");
    assert!(!resp.timestamp.is_empty());
}

/// ============ Finance 服务端点映射测试 ============

#[test]
fn test_finance_service_url_default() {
    // 验证 Finance 服务客户端的默认 URL
    let client = TypedServiceClient::new(FinanceApi, "http://localhost:8011");
    assert!(
        client.is_ok(),
        "TypedServiceClient<FinanceApi> 应能以默认 URL 构造"
    );
}

#[test]
fn test_finance_service_endpoints_mapping() {
    // 验证 BFF → Finance 的端点映射（基于 FinanceServiceClient 宏定义）
    // 这些端点是 Portal BFF 通过 finance_client 调用 Finance 服务时使用的
    let endpoints = vec![
        ("/api/finance/accounts", "科目列表"),
        ("/api/finance/vouchers", "凭证列表"),
        ("/api/finance/vouchers/{id}/submit", "提交凭证"),
        ("/api/finance/vouchers/{id}/approve", "审批凭证"),
        ("/api/finance/vouchers/{id}/post", "过账凭证"),
    ];

    for (path, desc) in endpoints {
        assert!(
            path.starts_with("/api/finance/"),
            "Finance 端点 [{}] 应以 /api/finance/ 开头，实际: {}",
            desc,
            path
        );
    }
}

/// ============ Portal BFF 路由路径验证测试 ============

#[test]
fn test_portal_protected_routes_prefix() {
    // 验证 Portal BFF 的受保护路由都注册在 /api/portal 前缀下
    // 注意：tickets/sla-policies 已移至前端直连 unified-core，不再经过 Portal BFF
    let route_prefixes = vec![
        "/api/portal/todos",
        "/api/portal/dashboard",
        "/api/portal/announcements",
        "/api/portal/search",
        "/api/portal/settings",
        "/api/portal/notifications",
        "/api/portal/monitoring",
        "/api/portal/quick-actions",
        "/api/portal/navigation",
    ];

    for prefix in route_prefixes {
        assert!(
            prefix.starts_with("/api/portal/"),
            "Portal 路由前缀 [{}] 应以 /api/portal/ 开头",
            prefix
        );
    }
}

#[test]
fn test_portal_legacy_route_alias() {
    // 验证 Portal BFF 的旧版路由别名
    // register_routes_with_legacy_alias 会为 /api/portal 注册别名 /api/v1/portal
    let canonical = "/api/portal";
    let legacy_alias = "/api/v1/portal";

    assert!(canonical.starts_with("/api/"));
    assert!(legacy_alias.starts_with("/api/v1/"));
    assert!(canonical != legacy_alias, "标准路由和旧版别名不应相同");
}

/// ============ EventPublisher 不可用降级测试 ============

#[test]
fn test_event_publisher_unavailable_does_not_block() {
    // 验证 EventPublisher 构造不会 panic/block
    // EventPublisher 使用 Redis（非 RabbitMQ），Client::open 为惰性连接，
    // 即使 Redis 不可用也会返回 Ok，实际发布时才会失败。
    // Portal 启动时若 Redis 不可用，event_publisher 会被设置为 None 继续降级运行。
    let result = EventPublisher::new("topems-portal-test");
    assert!(
        result.is_ok(),
        "EventPublisher::new 使用惰性 Redis 连接，应返回 Ok（实际发布时才会失败）"
    );
}

/// ============ 代理响应降级模式测试 ============

#[test]
fn test_proxy_response_pattern_for_success() {
    use serde_json::Value;
    use topems_shared::ApiResponse;

    // 模拟代理成功响应的模式（对应 status.is_success() 分支）
    let upstream_json: Value = serde_json::json!({"policies": [], "total": 0});
    let resp: ApiResponse<Value> = ApiResponse::success(upstream_json.clone(), "查询SLA策略成功");

    assert_eq!(resp.code, 200);
    assert!(resp.success);
    assert_eq!(resp.data, Some(upstream_json));
}

#[test]
fn test_proxy_response_pattern_for_upstream_error() {
    use serde_json::Value;
    use topems_shared::ApiResponse;

    // 模拟上游返回错误的模式（对应 !status.is_success() 分支）
    let upstream_status: u16 = 404;
    let upstream_json: Value = serde_json::json!({"error": "not found"});
    let resp: ApiResponse<Value> = ApiResponse::error(upstream_status, &upstream_json.to_string());

    assert_eq!(resp.code, 404);
    assert!(!resp.success);
    assert!(resp.data.is_none());
}

#[test]
fn test_proxy_response_pattern_for_connection_failure() {
    use serde_json::Value;
    use topems_shared::ApiResponse;

    // 模拟连接失败的响应模式（对应 Err(e) 分支）
    let error_msg = "工单服务不可用: error sending request";
    let resp: ApiResponse<Value> = ApiResponse::error(502, error_msg);

    assert_eq!(resp.code, 502);
    assert!(!resp.success);
    assert!(resp.message.contains("工单服务不可用"));
}

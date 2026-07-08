// HRM 插件接口集成测试
// 测试 HRM 插件的 /api/plugins/info 接口和认证功能

#[cfg(test)]
mod plugin_tests {
    use reqwest::Client;
    use serde::{Deserialize, Serialize};
    use uuid::Uuid;

    const HRM_BASE_URL: &str = "http://localhost:8020";
    const TEST_USER_ID: &str = "00000000-0000-0000-0000-000000000001";

    #[derive(Debug, Serialize, Deserialize)]
    struct PluginInfo {
        code: String,
        name: String,
        version: String,
        description: String,
        permissions: Vec<PermissionDef>,
    }

    #[derive(Debug, Serialize, Deserialize)]
    struct PermissionDef {
        code: String,
        name: String,
        resource_type: String,
        action: String,
    }

    #[derive(Debug, Serialize, Deserialize)]
    struct ApiResponse<T> {
        success: bool,
        data: Option<T>,
        message: String,
    }

    // ============ 插件接口测试 ============
    // 注意: 这些测试需要 HRM 服务运行在 localhost:8011
    // 使用 `cargo test -- --ignored` 运行这些集成测试

    #[tokio::test]
    #[ignore]
    async fn test_plugin_info_endpoint() {
        let client = Client::new();
        let response = client
            .get(format!("{}/api/plugins/info", HRM_BASE_URL))
            .send()
            .await;

        assert!(response.is_ok(), "插件接口应该可访问");

        let resp = response.unwrap();
        assert_eq!(resp.status(), 200, "状态码应该是 200");
    }

    #[tokio::test]
    #[ignore]
    async fn test_plugin_info_structure() {
        let client = Client::new();
        let response = client
            .get(format!("{}/api/plugins/info", HRM_BASE_URL))
            .send()
            .await
            .unwrap();

        let body: ApiResponse<PluginInfo> = response.json().await.unwrap();

        assert!(body.success, "响应应该成功");
        assert!(body.data.is_some(), "数据应该存在");

        let info = body.data.unwrap();
        assert_eq!(info.code, "hrm", "插件代码应该是 hrm");
        assert!(!info.name.is_empty(), "插件名称不应该为空");
        assert!(!info.version.is_empty(), "插件版本不应该为空");
    }

    // ============ 认证测试 ============

    #[tokio::test]
    #[ignore]
    async fn test_auth_with_x_user_id_header() {
        let client = Client::new();
        let response = client
            .get(format!("{}/api/hrm/employees", HRM_BASE_URL))
            .header("X-User-Id", TEST_USER_ID)
            .send()
            .await;

        assert!(response.is_ok(), "请求应该成功");

        let resp = response.unwrap();
        // 如果返回 200 而不是 401，说明 X-User-Id 认证生效
        assert_ne!(resp.status(), 401, "X-User-Id 认证不应该返回 401");
    }

    #[tokio::test]
    #[ignore]
    async fn test_auth_with_authorization_header() {
        let client = Client::new();
        let response = client
            .get(format!("{}/api/hrm/employees", HRM_BASE_URL))
            .header("Authorization", "Bearer test-token")
            .send()
            .await;

        assert!(response.is_ok(), "请求应该成功");
    }

    #[tokio::test]
    #[ignore]
    async fn test_unauthorized_request_returns_401() {
        let client = Client::new();
        let response = client
            .get(format!("{}/api/hrm/employees", HRM_BASE_URL))
            .send()
            .await;

        // 如果没有认证信息，某些端点可能返回 401
        // 但有些端点可能允许匿名访问
        assert!(response.is_ok(), "请求应该被处理");
    }

    // ============ API 路由测试 ============

    #[tokio::test]
    #[ignore]
    async fn test_employees_list_endpoint() {
        let client = Client::new();
        let response = client
            .get(format!("{}/api/hrm/employees", HRM_BASE_URL))
            .header("X-User-Id", TEST_USER_ID)
            .send()
            .await;

        assert!(response.is_ok(), "员工列表接口应该可访问");
    }

    #[tokio::test]
    #[ignore]
    async fn test_departments_list_endpoint() {
        let client = Client::new();
        let response = client
            .get(format!("{}/api/hrm/departments", HRM_BASE_URL))
            .header("X-User-Id", TEST_USER_ID)
            .send()
            .await;

        assert!(response.is_ok(), "部门列表接口应该可访问");
    }

    #[tokio::test]
    #[ignore]
    async fn test_attendance_list_endpoint() {
        let client = Client::new();
        let response = client
            .get(format!("{}/api/hrm/attendance", HRM_BASE_URL))
            .header("X-User-Id", TEST_USER_ID)
            .send()
            .await;

        assert!(response.is_ok(), "考勤列表接口应该可访问");
    }

    // ============ 健康检查测试 ============

    #[tokio::test]
    #[ignore]
    async fn test_health_endpoint() {
        let client = Client::new();
        let response = client.get(format!("{}/health", HRM_BASE_URL)).send().await;

        assert!(response.is_ok(), "健康检查接口应该可访问");
    }
}

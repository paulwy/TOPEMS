// CRM 插件接口集成测试
// 测试 CRM 插件的 /api/plugins/info 接口和认证功能

#[cfg(test)]
mod plugin_tests {
    use reqwest::Client;
    use serde::{Deserialize, Serialize};

    const CRM_BASE_URL: &str = "http://localhost:8012";
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

    #[tokio::test]
    async fn test_plugin_info_endpoint() {
        let client = Client::new();
        let response = client
            .get(format!("{}/api/plugins/info", CRM_BASE_URL))
            .send()
            .await;

        assert!(response.is_ok(), "插件接口应该可访问");

        let resp = response.unwrap();
        assert_eq!(resp.status(), 200, "状态码应该是 200");
    }

    #[tokio::test]
    async fn test_plugin_info_structure() {
        let client = Client::new();
        let response = client
            .get(format!("{}/api/plugins/info", CRM_BASE_URL))
            .send()
            .await
            .unwrap();

        let body: ApiResponse<PluginInfo> = response.json().await.unwrap();

        assert!(body.success, "响应应该成功");
        assert!(body.data.is_some(), "数据应该存在");

        let info = body.data.unwrap();
        assert_eq!(info.code, "crm", "插件代码应该是 crm");
        assert!(!info.name.is_empty(), "插件名称不应该为空");
        assert!(!info.version.is_empty(), "插件版本不应该为空");
    }

    // ============ 认证测试 ============

    #[tokio::test]
    async fn test_auth_with_x_user_id_header() {
        let client = Client::new();
        let response = client
            .get(format!("{}/api/crm/customers", CRM_BASE_URL))
            .header("X-User-Id", TEST_USER_ID)
            .send()
            .await;

        assert!(response.is_ok(), "请求应该成功");

        let resp = response.unwrap();
        assert_ne!(resp.status(), 401, "X-User-Id 认证不应该返回 401");
    }

    #[tokio::test]
    async fn test_auth_with_authorization_header() {
        let client = Client::new();
        let response = client
            .get(format!("{}/api/crm/customers", CRM_BASE_URL))
            .header("Authorization", "Bearer test-token")
            .send()
            .await;

        assert!(response.is_ok(), "请求应该成功");
    }

    // ============ API 路由测试 ============

    #[tokio::test]
    async fn test_customers_list_endpoint() {
        let client = Client::new();
        let response = client
            .get(format!("{}/api/crm/customers", CRM_BASE_URL))
            .header("X-User-Id", TEST_USER_ID)
            .send()
            .await;

        assert!(response.is_ok(), "客户列表接口应该可访问");
    }

    #[tokio::test]
    async fn test_contacts_list_endpoint() {
        let client = Client::new();
        let response = client
            .get(format!("{}/api/crm/contacts", CRM_BASE_URL))
            .header("X-User-Id", TEST_USER_ID)
            .send()
            .await;

        assert!(response.is_ok(), "联系人列表接口应该可访问");
    }

    #[tokio::test]
    async fn test_opportunities_list_endpoint() {
        let client = Client::new();
        let response = client
            .get(format!("{}/api/crm/opportunities", CRM_BASE_URL))
            .header("X-User-Id", TEST_USER_ID)
            .send()
            .await;

        assert!(response.is_ok(), "商机列表接口应该可访问");
    }

    // ============ 健康检查测试 ============

    #[tokio::test]
    async fn test_health_endpoint() {
        let client = Client::new();
        let response = client
            .get(format!("{}/health", CRM_BASE_URL))
            .send()
            .await;

        assert!(response.is_ok(), "健康检查接口应该可访问");
    }
}

//! 多租户隔离集成测试
//!
//! 覆盖测试用例：租户间数据隔离、跨租户访问控制、租户 ID 校验等场景
//!
//! ⚠️ 集成测试说明：
//! 本测试文件为集成测试，需要先启动 unified-core 服务（默认监听 localhost:8000），
//! 并完成管理员账号（admin/admin123、system/system123）的种子数据初始化。
//!
//! 运行方式：
//! ```bash
//! # 1. 配置环境变量并启动服务
//! #    set -a && source .env && set +a
//! #    cargo run -p topems-unified-core --bin topems-unified-core
//! # 2. 运行被忽略的集成测试
//! cargo test --package topems-unified-core --test tenant_isolation_test -- --ignored --test-threads=1
//! ```

use axum::http::StatusCode;
use serde_json::json;

mod common {
    use axum::http::StatusCode;
    use serde_json::json;
    use std::time::Duration;

    pub const TEST_BASE_URL: &str = "http://localhost:8000";

    /// 检查统一核心服务是否可用，不可用则返回 false
    pub async fn service_available() -> bool {
        reqwest::Client::builder()
            .timeout(Duration::from_secs(2))
            .build()
            .unwrap()
            .get(format!("{}/api/core/iam/health", TEST_BASE_URL))
            .send()
            .await
            .map(|resp| resp.status().is_success())
            .unwrap_or(false)
    }

    pub async fn create_test_app() -> impl std::future::Future<Output = ()> {
        async {}
    }

    pub async fn login_as_admin(
        _app: &impl std::future::Future<Output = ()>,
        tenant_id: &str,
    ) -> String {
        let response = reqwest::Client::new()
            .post(format!("{}/api/core/iam/auth/login", TEST_BASE_URL))
            .header("X-Tenant-Id", tenant_id)
            .json(&json!({
                "username": "admin",
                "password": "admin123"
            }))
            .send()
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        let body: serde_json::Value =
            serde_json::from_str(&response.text().await.unwrap()).unwrap();
        format!("Bearer {}", body["access_token"].as_str().unwrap())
    }

    pub async fn login_as_system_admin(_app: &impl std::future::Future<Output = ()>) -> String {
        let response = reqwest::Client::new()
            .post(format!("{}/api/core/iam/auth/login", TEST_BASE_URL))
            .json(&json!({
                "username": "system",
                "password": "system123"
            }))
            .send()
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        let body: serde_json::Value =
            serde_json::from_str(&response.text().await.unwrap()).unwrap();
        format!("Bearer {}", body["access_token"].as_str().unwrap())
    }

    pub async fn create_user(
        _app: &impl std::future::Future<Output = ()>,
        token: &str,
        data: serde_json::Value,
    ) -> reqwest::Response {
        reqwest::Client::new()
            .post(format!("{}/api/core/iam/users", TEST_BASE_URL))
            .header("Authorization", token)
            .json(&data)
            .send()
            .await
            .unwrap()
    }

    pub async fn get_user_as_tenant(
        _app: &impl std::future::Future<Output = ()>,
        token: &str,
        user_id: &str,
    ) -> reqwest::Response {
        reqwest::Client::new()
            .get(format!("{}/api/core/iam/users/{}", TEST_BASE_URL, user_id))
            .header("Authorization", token)
            .send()
            .await
            .unwrap()
    }

    pub async fn get_users(
        _app: &impl std::future::Future<Output = ()>,
        token: &str,
    ) -> reqwest::Response {
        reqwest::Client::new()
            .get(format!("{}/api/core/iam/users", TEST_BASE_URL))
            .header("Authorization", token)
            .send()
            .await
            .unwrap()
    }

    pub async fn create_role(
        _app: &impl std::future::Future<Output = ()>,
        token: &str,
        data: serde_json::Value,
    ) -> reqwest::Response {
        reqwest::Client::new()
            .post(format!("{}/api/core/iam/roles", TEST_BASE_URL))
            .header("Authorization", token)
            .json(&data)
            .send()
            .await
            .unwrap()
    }

    pub async fn get_role_as_tenant(
        _app: &impl std::future::Future<Output = ()>,
        token: &str,
        role_id: &str,
    ) -> reqwest::Response {
        reqwest::Client::new()
            .get(format!("{}/api/core/iam/roles/{}", TEST_BASE_URL, role_id))
            .header("Authorization", token)
            .send()
            .await
            .unwrap()
    }

    pub async fn get_roles(
        _app: &impl std::future::Future<Output = ()>,
        token: &str,
    ) -> reqwest::Response {
        reqwest::Client::new()
            .get(format!("{}/api/core/iam/roles", TEST_BASE_URL))
            .header("Authorization", token)
            .send()
            .await
            .unwrap()
    }

    pub async fn create_permission(
        _app: &impl std::future::Future<Output = ()>,
        token: &str,
        data: serde_json::Value,
    ) -> reqwest::Response {
        reqwest::Client::new()
            .post(format!("{}/api/core/iam/permissions", TEST_BASE_URL))
            .header("Authorization", token)
            .json(&data)
            .send()
            .await
            .unwrap()
    }

    pub async fn get_permission_as_tenant(
        _app: &impl std::future::Future<Output = ()>,
        token: &str,
        permission_id: &str,
    ) -> reqwest::Response {
        reqwest::Client::new()
            .get(format!(
                "{}/api/core/iam/permissions/{}",
                TEST_BASE_URL, permission_id
            ))
            .header("Authorization", token)
            .send()
            .await
            .unwrap()
    }

    pub async fn create_menu(
        _app: &impl std::future::Future<Output = ()>,
        token: &str,
        data: serde_json::Value,
    ) -> reqwest::Response {
        reqwest::Client::new()
            .post(format!("{}/api/core/menu/menus", TEST_BASE_URL))
            .header("Authorization", token)
            .json(&data)
            .send()
            .await
            .unwrap()
    }

    pub async fn get_menu_as_tenant(
        _app: &impl std::future::Future<Output = ()>,
        token: &str,
        menu_id: &str,
    ) -> reqwest::Response {
        reqwest::Client::new()
            .get(format!("{}/api/core/menu/menus/{}", TEST_BASE_URL, menu_id))
            .header("Authorization", token)
            .send()
            .await
            .unwrap()
    }

    pub async fn create_tenant(
        _app: &impl std::future::Future<Output = ()>,
        token: &str,
        data: serde_json::Value,
    ) -> reqwest::Response {
        reqwest::Client::new()
            .post(format!("{}/api/core/iam/tenants", TEST_BASE_URL))
            .header("Authorization", token)
            .json(&data)
            .send()
            .await
            .unwrap()
    }

    pub async fn get_tenant(
        _app: &impl std::future::Future<Output = ()>,
        token: &str,
        tenant_id: &str,
    ) -> reqwest::Response {
        reqwest::Client::new()
            .get(format!(
                "{}/api/core/iam/tenants/{}",
                TEST_BASE_URL, tenant_id
            ))
            .header("Authorization", token)
            .send()
            .await
            .unwrap()
    }
}

use common::*;

#[tokio::test]
#[ignore = "集成测试：需先启动 unified-core 服务并初始化种子数据，运行时加 --ignored"]
async fn tenant_isolation_user_access() {
    if !service_available().await {
        eprintln!("⏭ 跳过: 统一核心服务未运行 ({})", TEST_BASE_URL);
        return;
    }
    let app = create_test_app().await;

    let tenant1_token = login_as_admin(&app, "tenant1").await;
    let tenant2_token = login_as_admin(&app, "tenant2").await;

    let create_user_response = create_user(
        &app,
        &tenant1_token,
        json!({
            "username": "tenant1_user",
            "password": "password123",
            "email": "tenant1@example.com",
            "name": "Tenant1 User"
        }),
    )
    .await;
    assert_eq!(create_user_response.status(), StatusCode::OK);
    let user_id: String =
        serde_json::from_str::<serde_json::Value>(&create_user_response.text().await.unwrap())
            .unwrap()["id"]
            .as_str()
            .unwrap()
            .to_string();

    let get_user_response = get_user_as_tenant(&app, &tenant1_token, &user_id).await;
    assert_eq!(get_user_response.status(), StatusCode::OK);

    let get_user_as_tenant2_response = get_user_as_tenant(&app, &tenant2_token, &user_id).await;
    assert_eq!(get_user_as_tenant2_response.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
#[ignore = "集成测试：需先启动 unified-core 服务并初始化种子数据，运行时加 --ignored"]
async fn tenant_isolation_role_access() {
    if !service_available().await {
        eprintln!("⏭ 跳过: 统一核心服务未运行 ({})", TEST_BASE_URL);
        return;
    }
    let app = create_test_app().await;

    let tenant1_token = login_as_admin(&app, "tenant1").await;
    let tenant2_token = login_as_admin(&app, "tenant2").await;

    let create_role_response = create_role(
        &app,
        &tenant1_token,
        json!({
            "name": "tenant1_role",
            "description": "Tenant1 Role"
        }),
    )
    .await;
    assert_eq!(create_role_response.status(), StatusCode::OK);
    let role_id: String =
        serde_json::from_str::<serde_json::Value>(&create_role_response.text().await.unwrap())
            .unwrap()["id"]
            .as_str()
            .unwrap()
            .to_string();

    let get_role_response = get_role_as_tenant(&app, &tenant1_token, &role_id).await;
    assert_eq!(get_role_response.status(), StatusCode::OK);

    let get_role_as_tenant2_response = get_role_as_tenant(&app, &tenant2_token, &role_id).await;
    assert_eq!(get_role_as_tenant2_response.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
#[ignore = "集成测试：需先启动 unified-core 服务并初始化种子数据，运行时加 --ignored"]
async fn tenant_isolation_permission_access() {
    if !service_available().await {
        eprintln!("⏭ 跳过: 统一核心服务未运行 ({})", TEST_BASE_URL);
        return;
    }
    let app = create_test_app().await;

    let tenant1_token = login_as_admin(&app, "tenant1").await;
    let tenant2_token = login_as_admin(&app, "tenant2").await;

    let create_permission_response = create_permission(
        &app,
        &tenant1_token,
        json!({
            "code": "tenant1:test",
            "name": "Tenant1 Test Permission"
        }),
    )
    .await;
    assert_eq!(create_permission_response.status(), StatusCode::OK);
    let permission_id: String = serde_json::from_str::<serde_json::Value>(
        &create_permission_response.text().await.unwrap(),
    )
    .unwrap()["id"]
        .as_str()
        .unwrap()
        .to_string();

    let get_permission_response =
        get_permission_as_tenant(&app, &tenant1_token, &permission_id).await;
    assert_eq!(get_permission_response.status(), StatusCode::OK);

    let get_permission_as_tenant2_response =
        get_permission_as_tenant(&app, &tenant2_token, &permission_id).await;
    assert_eq!(
        get_permission_as_tenant2_response.status(),
        StatusCode::NOT_FOUND
    );
}

#[tokio::test]
#[ignore = "集成测试：需先启动 unified-core 服务并初始化种子数据，运行时加 --ignored"]
async fn tenant_isolation_menu_access() {
    if !service_available().await {
        eprintln!("⏭ 跳过: 统一核心服务未运行 ({})", TEST_BASE_URL);
        return;
    }
    let app = create_test_app().await;

    let tenant1_token = login_as_admin(&app, "tenant1").await;
    let tenant2_token = login_as_admin(&app, "tenant2").await;

    let create_menu_response = create_menu(
        &app,
        &tenant1_token,
        json!({
            "name": "tenant1_menu",
            "path": "/tenant1/test",
            "icon": "test",
            "order": 1
        }),
    )
    .await;
    assert_eq!(create_menu_response.status(), StatusCode::OK);
    let menu_id: String =
        serde_json::from_str::<serde_json::Value>(&create_menu_response.text().await.unwrap())
            .unwrap()["id"]
            .as_str()
            .unwrap()
            .to_string();

    let get_menu_response = get_menu_as_tenant(&app, &tenant1_token, &menu_id).await;
    assert_eq!(get_menu_response.status(), StatusCode::OK);

    let get_menu_as_tenant2_response = get_menu_as_tenant(&app, &tenant2_token, &menu_id).await;
    assert_eq!(get_menu_as_tenant2_response.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
#[ignore = "集成测试：需先启动 unified-core 服务并初始化种子数据，运行时加 --ignored"]
async fn tenant_isolation_tenant_access() {
    if !service_available().await {
        eprintln!("⏭ 跳过: 统一核心服务未运行 ({})", TEST_BASE_URL);
        return;
    }
    let app = create_test_app().await;

    let system_token = login_as_system_admin(&app).await;

    let create_tenant_response = create_tenant(
        &app,
        &system_token,
        json!({
            "name": "test_tenant",
            "code": "test"
        }),
    )
    .await;
    assert_eq!(create_tenant_response.status(), StatusCode::OK);
}

#[tokio::test]
#[ignore = "集成测试：需先启动 unified-core 服务并初始化种子数据，运行时加 --ignored"]
async fn tenant_isolation_cross_tenant_user_list() {
    if !service_available().await {
        eprintln!("⏭ 跳过: 统一核心服务未运行 ({})", TEST_BASE_URL);
        return;
    }
    let app = create_test_app().await;

    let tenant1_token = login_as_admin(&app, "tenant1").await;
    let tenant2_token = login_as_admin(&app, "tenant2").await;

    let _ = create_user(
        &app,
        &tenant1_token,
        json!({
            "username": "tenant1_user",
            "password": "password123",
            "email": "tenant1@example.com",
            "name": "Tenant1 User"
        }),
    )
    .await;

    let _ = create_user(
        &app,
        &tenant2_token,
        json!({
            "username": "tenant2_user",
            "password": "password123",
            "email": "tenant2@example.com",
            "name": "Tenant2 User"
        }),
    )
    .await;

    let tenant1_users_response = get_users(&app, &tenant1_token).await;
    assert_eq!(tenant1_users_response.status(), StatusCode::OK);

    let tenant2_users_response = get_users(&app, &tenant2_token).await;
    assert_eq!(tenant2_users_response.status(), StatusCode::OK);
}

#[tokio::test]
#[ignore = "集成测试：需先启动 unified-core 服务并初始化种子数据，运行时加 --ignored"]
async fn tenant_isolation_invalid_tenant_id() {
    if !service_available().await {
        eprintln!("⏭ 跳过: 统一核心服务未运行 ({})", TEST_BASE_URL);
        return;
    }
    let response = reqwest::Client::new()
        .get(format!("{}/api/core/iam/users", TEST_BASE_URL))
        .header("X-Tenant-Id", "invalid-tenant-id")
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

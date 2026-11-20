#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! tenant_admin 本租户用户/角色管理 —— 越权矩阵集成测试。
//!
//! 默认 `#[ignore]`：需要本地服务 + 真实数据库。
//!
//! 运行：
//! ```bash
//! DATABASE_URL=postgres://... cargo test -p topems-unified-core \
//!   --test tenant_admin_scope_test -- --ignored --test-threads=1
//! ```
//!
//! 覆盖：本租户 list/create/update/disable/enable/delete、角色 create/update/delete、
//! 跨租户读写 404、平台角色/平台权限提权 403、动超管 403、平台端点仍 403、admin 不受影响。

use reqwest::Client;
use serde_json::{json, Value};
use sqlx::PgPool;
use uuid::Uuid;

const DEFAULT_TENANT: &str = "00000000-0000-0000-0000-000000000001";
const TENANT_IAM_CODES: [&str; 6] = [
    "tenant:iam:user:read",
    "tenant:iam:user:write",
    "tenant:iam:user:delete",
    "tenant:iam:role:read",
    "tenant:iam:role:write",
    "tenant:iam:role:delete",
];

fn api_base() -> String {
    std::env::var("TOPEMS_API_BASE")
        .unwrap_or_else(|_| "http://127.0.0.1:8000/api/core".to_string())
}

fn inner_code(body: &Value) -> Option<u64> {
    body.get("code").and_then(|v| v.as_u64())
}

fn is_success(body: &Value) -> bool {
    body.get("success")
        .and_then(|v| v.as_bool())
        .unwrap_or(false)
}

async fn login(client: &Client, username: &str, password: &str) -> Result<String, String> {
    let resp = client
        .post(format!("{}/iam/auth/login", api_base()))
        .json(&json!({"username": username, "password": password}))
        .send()
        .await
        .map_err(|e| format!("登录请求失败: {e}"))?;
    let status = resp.status().as_u16();
    let body: Value = resp
        .json()
        .await
        .map_err(|e| format!("登录响应解析失败: {e}"))?;
    if is_success(&body) {
        Ok(body["data"]["access_token"]
            .as_str()
            .unwrap_or_default()
            .to_string())
    } else {
        Err(format!("登录失败({status}): {}", body["message"]))
    }
}

async fn call(
    client: &Client,
    token: &str,
    method: &str,
    path: &str,
    body: Option<Value>,
) -> (u16, Value) {
    let url = format!("{}{}", api_base(), path);
    let req = match method {
        "GET" => client.get(&url),
        "POST" => client.post(&url),
        "PUT" => client.put(&url),
        "DELETE" => client.delete(&url),
        other => panic!("unsupported method {other}"),
    }
    .bearer_auth(token)
    .header("Content-Type", "application/json");
    let resp = match body {
        Some(b) => req.json(&b).send().await,
        None => req.send().await,
    }
    .expect("HTTP 请求失败");
    let status = resp.status().as_u16();
    let body: Value = resp.json().await.unwrap_or(Value::Null);
    (status, body)
}

struct Fixtures {
    tenant_admin_username: String,
    tenant_admin_password: String,
    other_tenant: Uuid,
    other_tenant_user: Uuid,
    superuser_in_tenant: Uuid,
    platform_role: Uuid,
    platform_permission: Uuid,
    tenant_permission: Uuid,
    admin_username: String,
    admin_password: String,
}

async fn ensure_tenant(pool: &PgPool, id: Uuid, code: &str, name: &str) {
    sqlx::query(
        r#"
        INSERT INTO public.core_tenants (id, name, code, status, tenant_type, plan, created_at, updated_at)
        SELECT $1, $2, $3, 'active', 'shared', 'basic', now(), now()
        WHERE NOT EXISTS (SELECT 1 FROM public.core_tenants WHERE id = $1)
        "#,
    )
    .bind(id)
    .bind(name)
    .bind(code)
    .execute(pool)
    .await
    .unwrap();
}

async fn seed(pool: &PgPool, suffix: &str) -> Fixtures {
    ensure_tenant(
        pool,
        Uuid::parse_str(DEFAULT_TENANT).unwrap(),
        &format!("e2e-default-{suffix}"),
        "E2E 默认租户",
    )
    .await;
    let tenant_admin_username = format!("e2e_tadmin_{suffix}");
    let plain_password = std::env::var("E2E_TENANT_ADMIN_PASSWORD")
        .unwrap_or_else(|_| ["Tenant", "Admin123!"].concat());
    let password_hash = bcrypt::hash(&plain_password, bcrypt::DEFAULT_COST).unwrap();

    // 确保 tenant_admin 角色存在并持有 6 个租户域权限码（迁移已做，这里兜底）
    let role_id: Uuid = sqlx::query_scalar(
        "SELECT id FROM public.core_roles WHERE name = 'tenant_admin' AND deleted_at IS NULL LIMIT 1",
    )
    .fetch_optional(pool)
    .await
    .unwrap()
    .unwrap_or_else(|| {
        panic!("tenant_admin 角色不存在，请先应用 20261108110000 迁移")
    });

    sqlx::query(
        r#"
        INSERT INTO public.core_role_permissions (role_id, permission_id, created_at)
        SELECT $1, p.id, now()
        FROM public.core_permissions p
        WHERE p.code = ANY($2)
          AND NOT EXISTS (
              SELECT 1 FROM public.core_role_permissions x
              WHERE x.role_id = $1 AND x.permission_id = p.id
          )
        "#,
    )
    .bind(role_id)
    .bind(TENANT_IAM_CODES)
    .execute(pool)
    .await
    .unwrap();

    let tenant_admin_id: Uuid = sqlx::query_scalar(
        r#"
        INSERT INTO iam.users (username, email, password_hash, full_name, status, is_superuser, created_at)
        VALUES ($1, $2, $3, 'E2E Tenant Admin', 'active', false, now())
        RETURNING id
        "#,
    )
    .bind(&tenant_admin_username)
    .bind(format!("{tenant_admin_username}@example.com"))
    .bind(&password_hash)
    .fetch_one(pool)
    .await
    .unwrap();

    sqlx::query(
        "INSERT INTO public.core_user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
    )
    .bind(tenant_admin_id)
    .bind(role_id)
    .execute(pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        INSERT INTO public.core_tenant_users (tenant_id, user_id, email, role, status)
        VALUES ($1, $2, $3, 'admin', 'active')
        ON CONFLICT (tenant_id, user_id) DO NOTHING
        "#,
    )
    .bind(Uuid::parse_str(DEFAULT_TENANT).unwrap())
    .bind(tenant_admin_id)
    .bind(format!("{tenant_admin_username}@example.com"))
    .execute(pool)
    .await
    .unwrap();

    // 另一个租户：优先复用现有租户，缺失时创建临时租户（本地/新环境可自足运行）
    let other_tenant: Uuid = match sqlx::query_scalar(
        "SELECT id FROM public.core_tenants WHERE id <> $1 AND deleted_at IS NULL ORDER BY created_at LIMIT 1",
    )
    .bind(Uuid::parse_str(DEFAULT_TENANT).unwrap())
    .fetch_optional(pool)
    .await
    .unwrap()
    {
        Some(id) => id,
        None => {
            let id = Uuid::new_v4();
            ensure_tenant(pool, id, &format!("e2e-other-{suffix}"), "E2E 其他租户").await;
            id
        }
    };

    let other_username = format!("e2e_other_{suffix}");
    let other_tenant_user: Uuid = sqlx::query_scalar(
        r#"
        INSERT INTO iam.users (username, email, password_hash, full_name, status, is_superuser, created_at)
        VALUES ($1, $2, $3, 'E2E Other Tenant', 'active', false, now())
        RETURNING id
        "#,
    )
    .bind(&other_username)
    .bind(format!("{other_username}@example.com"))
    .bind(&password_hash)
    .fetch_one(pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        INSERT INTO public.core_tenant_users (tenant_id, user_id, email, role, status)
        VALUES ($1, $2, $3, 'member', 'active')
        ON CONFLICT (tenant_id, user_id) DO NOTHING
        "#,
    )
    .bind(other_tenant)
    .bind(other_tenant_user)
    .bind(format!("{other_username}@example.com"))
    .execute(pool)
    .await
    .unwrap();

    // 本租户内的超级管理员目标（用于“不能动超管”）
    let super_username = format!("e2e_super_{suffix}");
    let superuser_in_tenant: Uuid = sqlx::query_scalar(
        r#"
        INSERT INTO iam.users (username, email, password_hash, full_name, status, is_superuser, created_at)
        VALUES ($1, $2, $3, 'E2E Super In Tenant', 'active', true, now())
        RETURNING id
        "#,
    )
    .bind(&super_username)
    .bind(format!("{super_username}@example.com"))
    .bind(&password_hash)
    .fetch_one(pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        INSERT INTO public.core_tenant_users (tenant_id, user_id, email, role, status)
        VALUES ($1, $2, $3, 'member', 'active')
        ON CONFLICT (tenant_id, user_id) DO NOTHING
        "#,
    )
    .bind(Uuid::parse_str(DEFAULT_TENANT).unwrap())
    .bind(superuser_in_tenant)
    .bind(format!("{super_username}@example.com"))
    .execute(pool)
    .await
    .unwrap();

    let platform_role: Uuid = sqlx::query_scalar(
        "SELECT id FROM public.core_roles WHERE (tenant_id IS NULL OR tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) AND deleted_at IS NULL AND name IN ('admin','superadmin') ORDER BY name LIMIT 1",
    )
    .fetch_one(pool)
    .await
    .unwrap();

    let platform_permission: Uuid = sqlx::query_scalar(
        "SELECT id FROM public.core_permissions WHERE code = 'admin:iam:write' AND deleted_at IS NULL",
    )
    .fetch_one(pool)
    .await
    .unwrap();

    let tenant_permission: Uuid = sqlx::query_scalar(
        "SELECT id FROM public.core_permissions WHERE code = 'tenant:iam:user:read' AND deleted_at IS NULL",
    )
    .fetch_one(pool)
    .await
    .unwrap();

    Fixtures {
        tenant_admin_username,
        tenant_admin_password: plain_password,
        other_tenant,
        other_tenant_user,
        superuser_in_tenant,
        platform_role,
        platform_permission,
        tenant_permission,
        admin_username: std::env::var("E2E_ADMIN_USERNAME").unwrap_or_else(|_| "admin".into()),
        admin_password: std::env::var("E2E_ADMIN_PASSWORD").unwrap_or_else(|_| "admin123".into()),
    }
}

#[tokio::test]
#[ignore = "需要已执行全量迁移的测试库：public.core_tenants 等表由迁移创建，sqlx::test 新建库无此表"]
async fn tenant_admin_scope_matrix() {
    let db_url = std::env::var("TEST_DATABASE_URL").expect(
        "[test-dsn] 未设置 TEST_DATABASE_URL：测试库 DSN 必须显式提供，禁止回退到 DATABASE_URL 或硬编码开发库",
    );
    let pool = PgPool::connect(&db_url).await.expect("连接数据库失败");
    let suffix = Uuid::new_v4().simple().to_string()[..8].to_string();
    let fx = seed(&pool, &suffix).await;

    // 0) 迁移不变量：tenant_admin 不得持有任何平台层权限码（含 iam:*）
    let leftover_platform_codes: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)
        FROM public.core_role_permissions rp
        JOIN public.core_roles r ON r.id = rp.role_id
        JOIN public.core_permissions p ON p.id = rp.permission_id
        WHERE r.name = 'tenant_admin'
          AND (
              p.code LIKE 'iam:%'
              OR p.code LIKE 'admin:%'
              OR p.code LIKE 'system:%'
              OR p.code LIKE 'migration:%'
              OR p.code LIKE 'plugin:%'
              OR p.code LIKE 'subscription:%'
              OR p.code LIKE 'monitor:%'
              OR (p.code LIKE 'tenant:%' AND p.code NOT LIKE 'tenant:iam:%')
          )
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        leftover_platform_codes, 0,
        "tenant_admin 仍持有平台层权限码，迁移 20261108120000 未生效"
    );

    let client = Client::new();

    let tenant_token = login(
        &client,
        &fx.tenant_admin_username,
        &fx.tenant_admin_password,
    )
    .await
    .expect("tenant_admin 登录失败");

    // 1) 本租户用户列表：可见，且不含他租户用户
    let (status, body) = call(&client, &tenant_token, "GET", "/iam/users", None).await;
    assert_eq!(status, 200);
    assert!(is_success(&body), "list users: {body}");
    let users = body["data"]["users"]
        .as_array()
        .cloned()
        .unwrap_or_default();
    assert!(
        !users
            .iter()
            .any(|u| u["id"] == fx.other_tenant_user.to_string()),
        "跨租户用户不应出现在列表"
    );

    // 2) 跨租户读取/写入：按不存在处理，不泄露
    let (_, body) = call(
        &client,
        &tenant_token,
        "GET",
        &format!("/iam/users/{}", fx.other_tenant_user),
        None,
    )
    .await;
    assert_eq!(inner_code(&body), Some(404), "跨租户读取应 404: {body}");
    let (_, body) = call(
        &client,
        &tenant_token,
        "PUT",
        &format!("/iam/users/{}", fx.other_tenant_user),
        Some(json!({"full_name": "hacked"})),
    )
    .await;
    assert_eq!(inner_code(&body), Some(404), "跨租户写入应 404: {body}");

    // 3) 本租户创建/改/停用/启用/删除
    let created_username = format!("e2e_member_{suffix}");
    let (_, body) = call(
        &client,
        &tenant_token,
        "POST",
        "/iam/users",
        Some(json!({
            "username": created_username,
            "email": format!("{created_username}@example.com"),
            "password": "MemberPass123!",
            "full_name": "E2E Member"
        })),
    )
    .await;
    assert!(is_success(&body), "tenant_admin 创建本租户用户失败: {body}");
    let created_id = body["data"]["id"]
        .as_str()
        .expect("创建用户应返回 id")
        .to_string();

    let (_, body) = call(&client, &tenant_token, "GET", "/iam/users", None).await;
    let users = body["data"]["users"]
        .as_array()
        .cloned()
        .unwrap_or_default();
    assert!(
        users.iter().any(|u| u["id"] == created_id),
        "创建的本租户用户应出现在列表"
    );

    let (status, body) = call(
        &client,
        &tenant_token,
        "PUT",
        &format!("/iam/users/{created_id}"),
        Some(json!({"full_name": "E2E Member Updated"})),
    )
    .await;
    assert_eq!(status, 200);
    assert!(is_success(&body), "更新本租户用户失败: {body}");

    let (status, body) = call(
        &client,
        &tenant_token,
        "POST",
        &format!("/iam/users/{created_id}/disable"),
        None,
    )
    .await;
    assert_eq!(status, 200);
    assert!(is_success(&body), "停用本租户用户失败: {body}");

    let (status, body) = call(
        &client,
        &tenant_token,
        "POST",
        &format!("/iam/users/{created_id}/enable"),
        None,
    )
    .await;
    assert_eq!(status, 200);
    assert!(is_success(&body), "启用本租户用户失败: {body}");

    // 4) 不能授予平台角色（平台角色在租户作用域内按不存在处理，不泄露）
    let (_, body) = call(
        &client,
        &tenant_token,
        "POST",
        &format!("/iam/users/{created_id}/roles/{}", fx.platform_role),
        None,
    )
    .await;
    assert_eq!(inner_code(&body), Some(404), "授予平台角色应拒绝: {body}");

    // 5) 角色：创建（本租户权限）、改名、删除；平台权限/平台角色一律拒绝
    let role_name = format!("e2e_role_{suffix}");
    let (_, body) = call(
        &client,
        &tenant_token,
        "POST",
        "/iam/roles",
        Some(json!({
            "name": role_name,
            "description": "e2e",
            "permission_ids": [fx.tenant_permission.to_string()]
        })),
    )
    .await;
    assert!(is_success(&body), "tenant_admin 创建本租户角色失败: {body}");
    let role_id = body["data"]["id"]
        .as_str()
        .expect("创建角色应返回 id")
        .to_string();

    let (_, body) = call(
        &client,
        &tenant_token,
        "PUT",
        &format!("/iam/roles/{role_id}"),
        Some(json!({"description": "e2e updated"})),
    )
    .await;
    assert!(is_success(&body), "更新本租户角色失败: {body}");

    let (_, body) = call(
        &client,
        &tenant_token,
        "POST",
        &format!("/iam/roles/{role_id}/permissions"),
        Some(json!({"permission_ids": [fx.platform_permission.to_string()]})),
    )
    .await;
    assert_eq!(
        inner_code(&body),
        Some(403),
        "角色授权平台权限应 403: {body}"
    );

    let (_, body) = call(
        &client,
        &tenant_token,
        "POST",
        "/iam/roles",
        Some(json!({
            "name": format!("e2e_bad_role_{suffix}"),
            "permission_ids": [fx.platform_permission.to_string()]
        })),
    )
    .await;
    assert_eq!(
        inner_code(&body),
        Some(403),
        "创建角色夹带平台权限应 403: {body}"
    );

    let (_, body) = call(
        &client,
        &tenant_token,
        "PUT",
        &format!("/iam/roles/{}", fx.platform_role),
        Some(json!({"description": "hacked"})),
    )
    .await;
    assert_eq!(inner_code(&body), Some(404), "改平台角色应 404: {body}");

    let (_, body) = call(
        &client,
        &tenant_token,
        "DELETE",
        &format!("/iam/roles/{}", fx.platform_role),
        None,
    )
    .await;
    assert_eq!(inner_code(&body), Some(404), "删平台角色应 404: {body}");

    // 6) 不能动超管
    let (_, body) = call(
        &client,
        &tenant_token,
        "PUT",
        &format!("/iam/users/{}", fx.superuser_in_tenant),
        Some(json!({"full_name": "hacked"})),
    )
    .await;
    assert_eq!(inner_code(&body), Some(403), "修改超管应 403: {body}");

    let (_, body) = call(
        &client,
        &tenant_token,
        "DELETE",
        &format!("/iam/users/{}", fx.superuser_in_tenant),
        None,
    )
    .await;
    assert_eq!(inner_code(&body), Some(403), "删除超管应 403: {body}");

    // 7) 平台端点仍 403
    for path in [
        "/iam/permissions",
        "/iam/positions",
        "/iam/access-logs",
        "/iam/auth/sessions",
    ] {
        let (status, _) = call(&client, &tenant_token, "GET", path, None).await;
        assert_eq!(status, 403, "平台端点 {path} 应 HTTP 403");
    }

    // 8) 可授权限目录只含自身权限集，不含平台码
    let (status, body) = call(
        &client,
        &tenant_token,
        "GET",
        "/iam/permissions/grantable",
        None,
    )
    .await;
    assert_eq!(status, 200);
    assert!(is_success(&body), "grantable: {body}");
    let codes: Vec<String> = body["data"]
        .as_array()
        .cloned()
        .unwrap_or_default()
        .iter()
        .filter_map(|p| p["code"].as_str().map(|s| s.to_string()))
        .collect();
    assert!(
        !codes.iter().any(|c| c == "admin:iam:write"),
        "可授权限目录不应包含平台码"
    );

    // 9) 删除本租户用户与角色
    let (_, body) = call(
        &client,
        &tenant_token,
        "DELETE",
        &format!("/iam/users/{created_id}"),
        None,
    )
    .await;
    assert!(is_success(&body), "删除本租户用户失败: {body}");
    let (_, body) = call(
        &client,
        &tenant_token,
        "DELETE",
        &format!("/iam/roles/{role_id}"),
        None,
    )
    .await;
    assert!(is_success(&body), "删除本租户角色失败: {body}");

    // 10) admin 不受影响
    let admin_token = login(&client, &fx.admin_username, &fx.admin_password)
        .await
        .expect("admin 登录失败（可用 E2E_ADMIN_USERNAME/E2E_ADMIN_PASSWORD 覆盖）");
    let (status, body) = call(&client, &admin_token, "GET", "/iam/users", None).await;
    assert_eq!(status, 200);
    assert!(is_success(&body), "admin list users: {body}");
    let (status, body) = call(&client, &admin_token, "GET", "/iam/permissions", None).await;
    assert_eq!(status, 200);
    assert!(is_success(&body), "admin list permissions: {body}");
    let (status, body) = call(&client, &admin_token, "GET", "/iam/positions", None).await;
    assert_eq!(status, 200, "admin 平台端点不应被收紧: {body}");
}

/// IAM 缺陷回归：
/// 1. 创建角色成功；同租户重名与跨租户重名都返回 4xx，不得 500；
/// 2. 租户域角色授予后，用户权限详情必须同时报出角色和权限码（N=M）。
#[tokio::test]
#[ignore = "需要本地真实库 + 运行中的服务"]
async fn iam_role_create_duplicate_and_user_permission_cases() {
    let db_url = std::env::var("TEST_DATABASE_URL").expect(
        "[test-dsn] 未设置 TEST_DATABASE_URL：测试库 DSN 必须显式提供，禁止回退到 DATABASE_URL 或硬编码开发库",
    );
    let pool = PgPool::connect(&db_url).await.expect("连接数据库失败");
    let suffix = Uuid::new_v4().simple().to_string()[..8].to_string();
    let fx = seed(&pool, &suffix).await;
    let client = Client::new();
    let token = login(
        &client,
        &fx.tenant_admin_username,
        &fx.tenant_admin_password,
    )
    .await
    .expect("tenant_admin 登录失败");

    let role_name = format!("e2e_iam_fix_{suffix}");

    // 1) 创建成功
    let (_, body) = call(
        &client,
        &token,
        "POST",
        "/iam/roles",
        Some(json!({
            "name": role_name,
            "description": "e2e iam fix",
            "permission_ids": [fx.tenant_permission.to_string()]
        })),
    )
    .await;
    assert!(is_success(&body), "创建角色失败: {body}");
    let role_id = body["data"]["id"]
        .as_str()
        .expect("创建角色应返回 id")
        .to_string();

    // 2) 同租户重名：4xx（内层 409），不能 500
    let (status, body) = call(
        &client,
        &token,
        "POST",
        "/iam/roles",
        Some(json!({"name": role_name})),
    )
    .await;
    assert_ne!(status, 500, "同租户重名不应 HTTP 500: {body}");
    assert_eq!(inner_code(&body), Some(409), "同租户重名应 409: {body}");

    // 3) 跨租户重名：core_roles.name 为全局唯一约束，作用域内 EXISTS 看不到
    // 他租户同名角色，INSERT 会报 SQLSTATE 23505，必须映射为 409 而非 500。
    let cross_role_name = format!("e2e_iam_cross_{suffix}");
    {
        let mut tx = pool.begin().await.expect("开始事务失败");
        sqlx::query("SET LOCAL app.rls_system = 'on'")
            .execute(&mut *tx)
            .await
            .unwrap();
        sqlx::query(
            "INSERT INTO public.core_roles (id, name, description, tenant_id, created_at, updated_at) VALUES ($1, $2, 'e2e cross tenant', $3, now(), now())",
        )
        .bind(Uuid::new_v4())
        .bind(&cross_role_name)
        .bind(fx.other_tenant)
        .execute(&mut *tx)
        .await
        .expect("写入他租户同名角色失败");
        tx.commit().await.unwrap();
    }
    let (status, body) = call(
        &client,
        &token,
        "POST",
        "/iam/roles",
        Some(json!({"name": cross_role_name})),
    )
    .await;
    assert_ne!(status, 500, "跨租户重名不应 HTTP 500: {body}");
    assert_eq!(
        inner_code(&body),
        Some(409),
        "跨租户重名应命中唯一约束并返回 409: {body}"
    );

    // 4) 租户域角色授予后，用户权限详情中的角色与权限码必须与用户实际持有集合一致
    let username = format!("e2e_iam_user_{suffix}");
    let (_, body) = call(
        &client,
        &token,
        "POST",
        "/iam/users",
        Some(json!({
            "username": username,
            "email": format!("{username}@example.com"),
            "password": "IamFixPass123!",
            "full_name": "E2E IAM Fix User"
        })),
    )
    .await;
    assert!(is_success(&body), "创建用户失败: {body}");
    let user_id = body["data"]["id"]
        .as_str()
        .expect("创建用户应返回 id")
        .to_string();

    let (_, body) = call(
        &client,
        &token,
        "POST",
        &format!("/iam/users/{user_id}/roles/{role_id}"),
        None,
    )
    .await;
    assert!(is_success(&body), "授予本租户角色失败: {body}");

    let (status, body) = call(
        &client,
        &token,
        "GET",
        &format!("/iam/users/{user_id}/permissions"),
        None,
    )
    .await;
    assert_eq!(status, 200);
    let roles = body["data"]["roles"]
        .as_array()
        .cloned()
        .unwrap_or_default();
    let perms = body["data"]["permissions"]
        .as_array()
        .cloned()
        .unwrap_or_default();
    assert!(
        roles.iter().any(|r| r["name"] == role_name.as_str()),
        "用户权限详情少报租户域角色: {body}"
    );
    assert!(
        perms.iter().any(|p| p["code"] == "tenant:iam:user:read"),
        "用户权限详情少报租户角色权限码: {body}"
    );

    // 5) N=M：接口返回的角色数/权限码数应等于库内实际持有数（fixture 连接绕过 RLS 取真值）
    let uid = Uuid::parse_str(&user_id).expect("user_id 非法");
    let n_roles: i64 = sqlx::query_scalar(
        "SELECT count(*) FROM public.core_roles r JOIN public.core_user_roles ur ON r.id = ur.role_id WHERE r.deleted_at IS NULL AND ur.user_id = $1",
    )
    .bind(uid)
    .fetch_one(&pool)
    .await
    .expect("统计实际角色数失败");
    let n_perms: i64 = sqlx::query_scalar(
        "SELECT count(DISTINCT p.code) FROM public.core_permissions p JOIN public.core_role_permissions rp ON p.id = rp.permission_id JOIN public.core_user_roles ur ON rp.role_id = ur.role_id WHERE p.deleted_at IS NULL AND ur.user_id = $1",
    )
    .bind(uid)
    .fetch_one(&pool)
    .await
    .expect("统计实际权限码数失败");
    assert!(
        n_roles > 0 && n_perms > 0,
        "fixture 应至少持有 1 角色 1 权限码"
    );
    assert_eq!(
        i64::try_from(roles.len()).expect("角色数超出 i64"),
        n_roles,
        "角色数 N={n_roles} M={} 不一致",
        roles.len()
    );
    assert_eq!(
        i64::try_from(perms.len()).expect("权限码数超出 i64"),
        n_perms,
        "权限码数 N={n_perms} M={} 不一致",
        perms.len()
    );
}

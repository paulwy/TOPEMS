use sqlx::{postgres::PgPoolOptions, PgPool};
use topems_shared::auth::Claims;
use topems_shared::permission::{
    check_any_module_permission, check_module_permission, check_resource_permission,
    ModuleCode, ModulePermission, PermissionAction,
};
use uuid::Uuid;

fn create_claims(is_superuser: bool, permissions: Vec<&str>) -> Claims {
    Claims {
        sub: Uuid::new_v4().to_string(),
        exp: 9999999999,
        iat: 0,
        username: "test_user".to_string(),
        role: "test_role".to_string(),
        email: Some("test@example.com".to_string()),
        is_superuser,
        roles: vec![],
        permissions: permissions.into_iter().map(|p| p.to_string()).collect(),
        department: None,
        tenant_id: None,
    }
}

type TestResult<T> = Result<(), axum::Json<topems_shared::response::ApiResponse<T>>>;

async fn create_test_pool() -> PgPool {
    PgPoolOptions::new()
        .max_connections(1)
        .connect_lazy("postgres://test:test@localhost/test")
        .unwrap_or_else(|_| {
            PgPoolOptions::new()
                .max_connections(1)
                .connect_lazy("postgres://postgres:postgres@localhost/postgres")
                .unwrap_or_else(|e| panic!("Failed to create test pool: {}", e))
        })
}

fn create_test_permission(module: ModuleCode, action: PermissionAction) -> ModulePermission {
    ModulePermission::new(module, action)
}

#[tokio::test]
async fn test_check_module_permission_superuser() {
    let claims = create_claims(true, vec![]);
    let pool = create_test_pool().await;
    let permission = create_test_permission(ModuleCode::Hrm, PermissionAction::Read);

    let result: TestResult<()> =
        check_module_permission(&pool, &claims, &permission).await;

    assert!(result.is_ok());
}

#[tokio::test]
async fn test_check_module_permission_has_module_manage() {
    let claims = create_claims(false, vec!["hrm:admin"]);
    let pool = create_test_pool().await;
    let permission = create_test_permission(ModuleCode::Hrm, PermissionAction::Read);

    let result: TestResult<()> =
        check_module_permission(&pool, &claims, &permission).await;

    assert!(result.is_ok());
}

#[tokio::test]
async fn test_check_module_permission_has_specific_permission() {
    let claims = create_claims(false, vec!["hrm:read"]);
    let pool = create_test_pool().await;
    let permission = create_test_permission(ModuleCode::Hrm, PermissionAction::Read);

    let result: TestResult<()> =
        check_module_permission(&pool, &claims, &permission).await;

    assert!(result.is_ok());
}

#[tokio::test]
async fn test_check_module_permission_no_permission() {
    let claims = create_claims(false, vec!["other_permission"]);
    let pool = create_test_pool().await;
    let permission = create_test_permission(ModuleCode::Hrm, PermissionAction::Read);

    let result: TestResult<String> =
        check_module_permission(&pool, &claims, &permission).await;

    assert!(result.is_err());
    let err = result.err().unwrap();
    assert_eq!(err.0.code, 403);
    assert!(err.0.message.contains("权限不足"));
}

#[tokio::test]
async fn test_check_resource_permission_superuser() {
    let claims = create_claims(true, vec![]);
    let resource_id = Uuid::new_v4();
    let pool = create_test_pool().await;

    let result: TestResult<()> =
        check_resource_permission(&pool, &claims, &resource_id, "resource", "resource:admin")
            .await;

    assert!(result.is_ok());
}

#[tokio::test]
async fn test_check_resource_permission_has_manage_permission() {
    let claims = create_claims(false, vec!["resource:admin"]);
    let resource_id = Uuid::new_v4();
    let pool = create_test_pool().await;

    let result: TestResult<()> =
        check_resource_permission(&pool, &claims, &resource_id, "resource", "resource:admin")
            .await;

    assert!(result.is_ok());
}

#[tokio::test]
async fn test_check_resource_permission_own_resource() {
    let user_id = Uuid::new_v4();
    let claims = Claims {
        sub: user_id.to_string(),
        exp: 9999999999,
        iat: 0,
        username: "test_user".to_string(),
        role: "test_role".to_string(),
        email: Some("test@example.com".to_string()),
        is_superuser: false,
        roles: vec![],
        permissions: vec![],
        department: None,
        tenant_id: None,
    };
    let pool = create_test_pool().await;

    let result: TestResult<()> =
        check_resource_permission(&pool, &claims, &user_id, "resource", "resource:admin").await;

    assert!(result.is_ok());
}

#[tokio::test]
async fn test_check_resource_permission_no_access() {
    let claims = create_claims(false, vec!["other_permission"]);
    let resource_id = Uuid::new_v4();
    let pool = create_test_pool().await;

    let result: TestResult<String> =
        check_resource_permission(&pool, &claims, &resource_id, "resource", "resource:admin")
            .await;

    assert!(result.is_err());
    let err = result.err().unwrap();
    assert_eq!(err.0.code, 403);
}

#[test]
fn test_check_any_module_permission_superuser() {
    let claims = create_claims(true, vec![]);
    let permissions = vec![
        create_test_permission(ModuleCode::Hrm, PermissionAction::Read),
        create_test_permission(ModuleCode::Hrm, PermissionAction::Write),
    ];

    let result: TestResult<()> =
        check_any_module_permission(&claims, &permissions);

    assert!(result.is_ok());
}

#[test]
fn test_check_any_module_permission_has_module_manage() {
    let claims = create_claims(false, vec!["hrm:admin"]);
    let permissions = vec![
        create_test_permission(ModuleCode::Hrm, PermissionAction::Read),
        create_test_permission(ModuleCode::Hrm, PermissionAction::Write),
    ];

    let result: TestResult<()> =
        check_any_module_permission(&claims, &permissions);

    assert!(result.is_ok());
}

#[test]
fn test_check_any_module_permission_has_one_permission() {
    let claims = create_claims(false, vec!["hrm:read"]);
    let permissions = vec![
        create_test_permission(ModuleCode::Hrm, PermissionAction::Read),
        create_test_permission(ModuleCode::Hrm, PermissionAction::Write),
    ];

    let result: TestResult<()> =
        check_any_module_permission(&claims, &permissions);

    assert!(result.is_ok());
}

#[test]
fn test_check_any_module_permission_no_permission() {
    let claims = create_claims(false, vec!["other_permission"]);
    let permissions = vec![
        create_test_permission(ModuleCode::Hrm, PermissionAction::Read),
        create_test_permission(ModuleCode::Hrm, PermissionAction::Write),
    ];

    let result: TestResult<String> =
        check_any_module_permission(&claims, &permissions);

    assert!(result.is_err());
    let err = result.err().unwrap();
    assert_eq!(err.0.code, 403);
}

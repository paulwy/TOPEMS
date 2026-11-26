#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
use topems_shared_auth::auth::{
    generate_jwt_token, generate_refresh_token, verify_jwt_token, Claims,
};
use uuid::Uuid;

const TEST_SECRET: &str = "test-jwt-secret-key-for-testing-only-32chars";

#[test]
fn test_generate_jwt_token_and_verify() {
    let user_id = Uuid::new_v4().to_string();
    let token = generate_jwt_token(&user_id, TEST_SECRET, 60);

    assert!(!token.is_empty());

    let claims = verify_jwt_token(&token, TEST_SECRET).unwrap();
    assert_eq!(claims.sub, user_id);
    assert_eq!(claims.username, user_id);
    assert_eq!(claims.role, "user");
    assert!(claims.roles.contains(&"user".to_string()));
    assert!(!claims.is_superuser);
    assert!(claims.permissions.is_empty());
}

#[test]
fn test_verify_jwt_token_invalid_token() {
    let result = verify_jwt_token("invalid.token.here", TEST_SECRET);
    assert!(result.is_err());
}

#[test]
fn test_verify_jwt_token_wrong_secret() {
    let user_id = Uuid::new_v4().to_string();
    let token = generate_jwt_token(&user_id, TEST_SECRET, 60);

    let wrong_secret = "wrong-secret-key-that-is-at-least-32-chars";
    let result = verify_jwt_token(&token, wrong_secret);
    assert!(result.is_err());
}

#[tokio::test]
async fn test_generate_jwt_token_short_expiry() {
    let user_id = Uuid::new_v4().to_string();
    let token = generate_jwt_token(&user_id, TEST_SECRET, 1);

    let result = verify_jwt_token(&token, TEST_SECRET);
    assert!(result.is_ok());
    assert_eq!(result.unwrap().sub, user_id);
}

#[test]
fn test_generate_refresh_token() {
    let token1 = generate_refresh_token();
    let token2 = generate_refresh_token();

    assert_eq!(token1.len(), 64);
    assert_ne!(token1, token2);

    for c in token1.chars() {
        assert!(c.is_ascii_hexdigit());
    }
}

#[test]
fn test_claims_has_permission() {
    let claims = Claims {
        sub: Uuid::new_v4().to_string(),
        username: "testuser".to_string(),
        role: "user".to_string(),
        roles: vec!["user".to_string()],
        permissions: vec!["iam:users_read".to_string(), "iam:users_create".to_string()],
        is_superuser: false,
        exp: 0,
        iat: 0,
        email: None,
        department: None,
        tenant_id: None,
        department_id: None,
        position_id: None,
        position_code: None,
        must_change_password: false,
    };

    assert!(claims.has_permission("iam:users_read"));
    assert!(claims.has_permission("iam:users_create"));
    assert!(!claims.has_permission("iam:users_delete"));
}

#[test]
fn test_claims_has_permission_superuser() {
    let claims = Claims {
        sub: Uuid::new_v4().to_string(),
        username: "admin".to_string(),
        role: "superadmin".to_string(),
        roles: vec!["superadmin".to_string()],
        permissions: vec![],
        is_superuser: true,
        exp: 0,
        iat: 0,
        email: None,
        department: None,
        tenant_id: None,
        department_id: None,
        position_id: None,
        position_code: None,
        must_change_password: false,
    };

    assert!(claims.has_permission("anything:permission"));
    assert!(claims.has_permission("nonexistent:perm"));
}

#[test]
fn test_claims_has_role() {
    let claims = Claims {
        sub: Uuid::new_v4().to_string(),
        username: "testuser".to_string(),
        role: "user".to_string(),
        roles: vec!["user".to_string(), "developer".to_string()],
        permissions: vec![],
        is_superuser: false,
        exp: 0,
        iat: 0,
        email: None,
        department: None,
        tenant_id: None,
        department_id: None,
        position_id: None,
        position_code: None,
        must_change_password: false,
    };

    assert!(claims.has_role("user"));
    assert!(claims.has_role("developer"));
    assert!(!claims.has_role("admin"));
}

#[test]
fn test_claims_has_role_superuser() {
    let claims = Claims {
        sub: Uuid::new_v4().to_string(),
        username: "admin".to_string(),
        role: "superadmin".to_string(),
        roles: vec![],
        permissions: vec![],
        is_superuser: true,
        exp: 0,
        iat: 0,
        email: None,
        department: None,
        tenant_id: None,
        department_id: None,
        position_id: None,
        position_code: None,
        must_change_password: false,
    };

    assert!(claims.has_role("any_role"));
    assert!(claims.has_role("nonexistent"));
}

#[test]
fn test_claims_has_any_permission() {
    let claims = Claims {
        sub: Uuid::new_v4().to_string(),
        username: "testuser".to_string(),
        role: "user".to_string(),
        roles: vec!["user".to_string()],
        permissions: vec!["iam:users_read".to_string()],
        is_superuser: false,
        exp: 0,
        iat: 0,
        email: None,
        department: None,
        tenant_id: None,
        department_id: None,
        position_id: None,
        position_code: None,
        must_change_password: false,
    };

    assert!(claims.has_any_permission(&["iam:users_read", "iam:users_create"]));
    assert!(!claims.has_any_permission(&["iam:users_delete", "iam:users_update"]));
}

#[test]
fn test_claims_has_any_permission_superuser() {
    let claims = Claims {
        sub: Uuid::new_v4().to_string(),
        username: "admin".to_string(),
        role: "superadmin".to_string(),
        roles: vec![],
        permissions: vec![],
        is_superuser: true,
        exp: 0,
        iat: 0,
        email: None,
        department: None,
        tenant_id: None,
        department_id: None,
        position_id: None,
        position_code: None,
        must_change_password: false,
    };

    assert!(claims.has_any_permission(&["perm1", "perm2"]));
}

#[test]
fn test_claims_has_all_permissions() {
    let claims = Claims {
        sub: Uuid::new_v4().to_string(),
        username: "testuser".to_string(),
        role: "user".to_string(),
        roles: vec!["user".to_string()],
        permissions: vec!["iam:users_read".to_string(), "iam:users_create".to_string()],
        is_superuser: false,
        exp: 0,
        iat: 0,
        email: None,
        department: None,
        tenant_id: None,
        department_id: None,
        position_id: None,
        position_code: None,
        must_change_password: false,
    };

    assert!(claims.has_all_permissions(&["iam:users_read", "iam:users_create"]));
    assert!(!claims.has_all_permissions(&["iam:users_read", "iam:users_delete"]));
}

#[test]
fn test_claims_has_all_permissions_superuser() {
    let claims = Claims {
        sub: Uuid::new_v4().to_string(),
        username: "admin".to_string(),
        role: "superadmin".to_string(),
        roles: vec![],
        permissions: vec![],
        is_superuser: true,
        exp: 0,
        iat: 0,
        email: None,
        department: None,
        tenant_id: None,
        department_id: None,
        position_id: None,
        position_code: None,
        must_change_password: false,
    };

    assert!(claims.has_all_permissions(&["perm1", "perm2", "perm3"]));
}

#[test]
fn test_claims_user_id_valid() {
    let user_id = Uuid::new_v4();
    let claims = Claims {
        sub: user_id.to_string(),
        username: "testuser".to_string(),
        role: "user".to_string(),
        roles: vec!["user".to_string()],
        permissions: vec![],
        is_superuser: false,
        exp: 0,
        iat: 0,
        email: None,
        department: None,
        tenant_id: None,
        department_id: None,
        position_id: None,
        position_code: None,
        must_change_password: false,
    };

    assert_eq!(claims.user_id().unwrap(), user_id);
}

#[test]
fn test_claims_user_id_invalid() {
    let claims = Claims {
        sub: "invalid-uuid".to_string(),
        username: "testuser".to_string(),
        role: "user".to_string(),
        roles: vec!["user".to_string()],
        permissions: vec![],
        is_superuser: false,
        exp: 0,
        iat: 0,
        email: None,
        department: None,
        tenant_id: None,
        department_id: None,
        position_id: None,
        position_code: None,
        must_change_password: false,
    };

    assert!(claims.user_id().is_err());
}

#[allow(
    clippy::as_conversions,
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss
)]
#[test]
fn test_claims_encode_and_verify() {
    let user_id = Uuid::new_v4().to_string();
    let claims = Claims {
        sub: user_id.clone(),
        username: "testuser".to_string(),
        role: "admin".to_string(),
        roles: vec!["admin".to_string(), "user".to_string()],
        permissions: vec!["iam:users_read".to_string()],
        is_superuser: false,
        exp: (chrono::Utc::now() + chrono::Duration::hours(1)).timestamp() as usize,
        iat: chrono::Utc::now().timestamp() as usize,
        email: Some("test@example.com".to_string()),
        department: Some("IT".to_string()),
        tenant_id: Some("tenant-1".to_string()),
        department_id: None,
        position_id: None,
        position_code: None,
        must_change_password: false,
    };

    let token = claims.encode(TEST_SECRET).unwrap();
    let verified = verify_jwt_token(&token, TEST_SECRET).unwrap();

    assert_eq!(verified.sub, user_id);
    assert_eq!(verified.username, "testuser");
    assert_eq!(verified.role, "admin");
    assert_eq!(verified.roles.len(), 2);
    assert_eq!(verified.permissions.len(), 1);
    assert_eq!(verified.email, Some("test@example.com".to_string()));
    assert_eq!(verified.department, Some("IT".to_string()));
    assert_eq!(verified.tenant_id, Some("tenant-1".to_string()));
}

#[test]
fn test_claims_serialization() {
    let claims = Claims {
        sub: "user-123".to_string(),
        username: "testuser".to_string(),
        role: "user".to_string(),
        roles: vec!["user".to_string()],
        permissions: vec!["perm1".to_string()],
        is_superuser: false,
        exp: 1000,
        iat: 500,
        email: Some("test@test.com".to_string()),
        department: Some("IT".to_string()),
        tenant_id: Some("t1".to_string()),
        department_id: None,
        position_id: None,
        position_code: None,
        must_change_password: false,
    };

    let json = serde_json::to_string(&claims).unwrap();
    let deserialized: Claims = serde_json::from_str(&json).unwrap();

    assert_eq!(deserialized.sub, claims.sub);
    assert_eq!(deserialized.username, claims.username);
    assert_eq!(deserialized.is_superuser, claims.is_superuser);
}

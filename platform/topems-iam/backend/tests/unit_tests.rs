// IAM 服务单元测试
// 测试用户认证、权限管理、JWT Token验证、用户管理等功能

use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation, Algorithm};
use regex::Regex;
use uuid::Uuid;

// ============ 密码验证测试 ============

#[cfg(test)]
mod password_validation_tests {
    use super::*;

    fn validate_password(password: &str) -> Result<(), String> {
        if password.len() < 8 {
            return Err("密码长度至少为8位".to_string());
        }

        let has_uppercase = password.chars().any(|c| c.is_uppercase());
        let has_lowercase = password.chars().any(|c| c.is_lowercase());
        let has_number = password.chars().any(|c| c.is_numeric());
        let has_special = password.chars().any(|c| !c.is_alphanumeric());

        if !has_uppercase {
            return Err("密码必须包含至少一个大写字母".to_string());
        }
        if !has_lowercase {
            return Err("密码必须包含至少一个小写字母".to_string());
        }
        if !has_number {
            return Err("密码必须包含至少一个数字".to_string());
        }
        if !has_special {
            return Err("密码必须包含至少一个特殊字符".to_string());
        }

        Ok(())
    }

    #[test]
    fn test_valid_password() {
        let password = "Admin123!";
        assert!(validate_password(password).is_ok());
    }

    #[test]
    fn test_password_too_short() {
        let password = "Admin1!";
        assert!(validate_password(password).is_err());
        assert_eq!(
            validate_password(password).unwrap_err(),
            "密码长度至少为8位"
        );
    }

    #[test]
    fn test_password_no_uppercase() {
        let password = "admin123!";
        assert!(validate_password(password).is_err());
        assert_eq!(
            validate_password(password).unwrap_err(),
            "密码必须包含至少一个大写字母"
        );
    }

    #[test]
    fn test_password_no_lowercase() {
        let password = "ADMIN123!";
        assert!(validate_password(password).is_err());
        assert_eq!(
            validate_password(password).unwrap_err(),
            "密码必须包含至少一个小写字母"
        );
    }

    #[test]
    fn test_password_no_number() {
        let password = "AdminPass!";
        assert!(validate_password(password).is_err());
        assert_eq!(
            validate_password(password).unwrap_err(),
            "密码必须包含至少一个数字"
        );
    }

    #[test]
    fn test_password_no_special_char() {
        let password = "Admin1234";
        assert!(validate_password(password).is_err());
        assert_eq!(
            validate_password(password).unwrap_err(),
            "密码必须包含至少一个特殊字符"
        );
    }

    #[test]
    fn test_password_with_various_special_chars() {
        let passwords = vec![
            "Admin123!",
            "Admin123@",
            "Admin123#",
            "Admin123$",
            "Admin123%",
            "Admin123^",
            "Admin123&",
            "Admin123*",
            "Admin123-",
            "Admin123_",
        ];

        for password in passwords {
            assert!(validate_password(password).is_ok());
        }
    }
}

// ============ 邮箱验证测试 ============

#[cfg(test)]
mod email_validation_tests {
    use super::*;

    fn validate_email(email: &str) -> Result<(), String> {
        let email_regex = Regex::new(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$").unwrap();
        if !email_regex.is_match(email) {
            return Err("请输入有效的邮箱地址".to_string());
        }
        Ok(())
    }

    #[test]
    fn test_valid_email() {
        let emails = vec![
            "user@example.com",
            "user.name@example.com",
            "user+tag@example.com",
            "user123@example.org",
            "user@subdomain.example.com",
        ];

        for email in emails {
            assert!(validate_email(email).is_ok());
        }
    }

    #[test]
    fn test_invalid_email_no_at_symbol() {
        let email = "userexample.com";
        assert!(validate_email(email).is_err());
    }

    #[test]
    fn test_invalid_email_no_domain() {
        let email = "user@";
        assert!(validate_email(email).is_err());
    }

    #[test]
    fn test_invalid_email_no_tld() {
        let email = "user@example";
        assert!(validate_email(email).is_err());
    }

    #[test]
    fn test_invalid_email_special_chars() {
        let email = "user!@example.com";
        assert!(validate_email(email).is_err());
    }

    #[test]
    fn test_invalid_email_empty() {
        let email = "";
        assert!(validate_email(email).is_err());
    }
}

// ============ 用户名验证测试 ============

#[cfg(test)]
mod username_validation_tests {
    use super::*;

    fn validate_username(username: &str) -> Result<(), String> {
        if username.len() < 2 {
            return Err("用户名长度至少为2位".to_string());
        }
        if username.len() > 20 {
            return Err("用户名不能超过20个字符".to_string());
        }

        // 只允许字母和数字
        for c in username.chars() {
            if !c.is_ascii_alphanumeric() {
                return Err("用户名只能包含字母和数字".to_string());
            }
        }

        Ok(())
    }

    #[test]
    fn test_valid_username() {
        let usernames = vec![
            "admin",
            "user123",
            "AdminUser",
            "testuser",
            "User2024",
        ];

        for username in usernames {
            assert!(validate_username(username).is_ok());
        }
    }

    #[test]
    fn test_username_too_short() {
        let username = "a";
        assert!(validate_username(username).is_err());
        assert_eq!(
            validate_username(username).unwrap_err(),
            "用户名长度至少为2位"
        );
    }

    #[test]
    fn test_username_too_long() {
        let username = "verylongusernameexceedinglimit";
        assert!(validate_username(username).is_err());
        assert_eq!(
            validate_username(username).unwrap_err(),
            "用户名不能超过20个字符"
        );
    }

    #[test]
    fn test_username_with_special_chars() {
        let usernames = vec![
            "user_name",
            "user-name",
            "user@email",
            "user!",
        ];

        for username in usernames {
            assert!(validate_username(username).is_err());
            assert_eq!(
                validate_username(username).unwrap_err(),
                "用户名只能包含字母和数字"
            );
        }
    }

    #[test]
    fn test_username_with_spaces() {
        let username = "user name";
        assert!(validate_username(username).is_err());
    }

    #[test]
    fn test_username_empty() {
        let username = "";
        assert!(validate_username(username).is_err());
    }
}

// ============ JWT Token 测试 ============

#[cfg(test)]
mod jwt_token_tests {
    use super::*;
    use serde::{Deserialize, Serialize};

    #[derive(Debug, Serialize, Deserialize, Clone)]
    struct Claims {
        sub: String,
        username: String,
        role: String,
        roles: Vec<String>,
        permissions: Vec<String>,
        is_superuser: bool,
        exp: usize,
        iat: usize,
        email: Option<String>,
        department: Option<String>,
        tenant_id: Option<String>,
    }

    fn generate_token(claims: &Claims, secret: &str) -> Result<String, String> {
        encode(
            &Header::new(Algorithm::HS256),
            &claims,
            &EncodingKey::from_secret(secret.as_ref()),
        ).map_err(|e| format!("生成token失败: {}", e))
    }

    fn verify_token(token: &str, secret: &str) -> Result<Claims, String> {
        let mut validation = Validation::new(Algorithm::HS256);
        validation.validate_exp = true;
        decode::<Claims>(
            token,
            &DecodingKey::from_secret(secret.as_ref()),
            &validation,
        )
        .map(|data| data.claims)
        .map_err(|e| format!("Token验证失败: {}", e))
    }

    #[test]
    fn test_generate_token_success() {
        let claims = Claims {
            sub: Uuid::new_v4().to_string(),
            username: "admin".to_string(),
            role: "admin".to_string(),
            roles: vec!["admin".to_string()],
            permissions: vec!["read".to_string(), "write".to_string()],
            is_superuser: true,
            exp: (Utc::now() + Duration::hours(1)).timestamp() as usize,
            iat: Utc::now().timestamp() as usize,
            email: Some("admin@example.com".to_string()),
            department: None,
            tenant_id: None,
        };

        let secret = "test_secret_key";
        let token = generate_token(&claims, secret);
        assert!(token.is_ok());
        assert!(!token.unwrap().is_empty());
    }

    #[test]
    fn test_verify_token_success() {
        let claims = Claims {
            sub: Uuid::new_v4().to_string(),
            username: "user".to_string(),
            role: "user".to_string(),
            roles: vec!["user".to_string()],
            permissions: vec!["read".to_string()],
            is_superuser: false,
            exp: (Utc::now() + Duration::hours(1)).timestamp() as usize,
            iat: Utc::now().timestamp() as usize,
            email: Some("user@example.com".to_string()),
            department: None,
            tenant_id: None,
        };

        let secret = "test_secret_key";
        let token = generate_token(&claims, secret).unwrap();
        let verified_claims = verify_token(&token, secret);
        assert!(verified_claims.is_ok());
        assert_eq!(verified_claims.unwrap().username, "user");
    }

    #[test]
    fn test_verify_token_wrong_secret() {
        let claims = Claims {
            sub: Uuid::new_v4().to_string(),
            username: "user".to_string(),
            role: "user".to_string(),
            roles: vec!["user".to_string()],
            permissions: vec!["read".to_string()],
            is_superuser: false,
            exp: (Utc::now() + Duration::hours(1)).timestamp() as usize,
            iat: Utc::now().timestamp() as usize,
            email: None,
            department: None,
            tenant_id: None,
        };

        let secret = "correct_secret";
        let wrong_secret = "wrong_secret";
        let token = generate_token(&claims, secret).unwrap();
        let verified_claims = verify_token(&token, wrong_secret);
        assert!(verified_claims.is_err());
    }

    #[test]
    fn test_verify_expired_token() {
        let claims = Claims {
            sub: Uuid::new_v4().to_string(),
            username: "user".to_string(),
            role: "user".to_string(),
            roles: vec!["user".to_string()],
            permissions: vec!["read".to_string()],
            is_superuser: false,
            exp: (Utc::now() - Duration::hours(1)).timestamp() as usize, // 已过期
            iat: (Utc::now() - Duration::hours(2)).timestamp() as usize,
            email: None,
            department: None,
            tenant_id: None,
        };

        let secret = "test_secret_key";
        let token = generate_token(&claims, secret).unwrap();
        let verified_claims = verify_token(&token, secret);
        assert!(verified_claims.is_err());
    }

    #[test]
    fn test_token_contains_correct_claims() {
        let user_id = Uuid::new_v4().to_string();
        let claims = Claims {
            sub: user_id.clone(),
            username: "testuser".to_string(),
            role: "manager".to_string(),
            roles: vec!["manager".to_string(), "user".to_string()],
            permissions: vec!["read".to_string(), "write".to_string(), "delete".to_string()],
            is_superuser: false,
            exp: (Utc::now() + Duration::hours(24)).timestamp() as usize,
            iat: Utc::now().timestamp() as usize,
            email: Some("testuser@example.com".to_string()),
            department: Some("研发部".to_string()),
            tenant_id: Some("tenant-001".to_string()),
        };

        let secret = "test_secret_key";
        let token = generate_token(&claims, secret).unwrap();
        let verified_claims = verify_token(&token, secret).unwrap();

        assert_eq!(verified_claims.sub, user_id);
        assert_eq!(verified_claims.username, "testuser");
        assert_eq!(verified_claims.role, "manager");
        assert_eq!(verified_claims.roles.len(), 2);
        assert_eq!(verified_claims.permissions.len(), 3);
        assert_eq!(verified_claims.email, Some("testuser@example.com".to_string()));
        assert_eq!(verified_claims.department, Some("研发部".to_string()));
        assert_eq!(verified_claims.tenant_id, Some("tenant-001".to_string()));
    }
}

// ============ 权限检查测试 ============

#[cfg(test)]
mod permission_tests {
    use super::*;

    #[test]
    fn test_permission_check_admin() {
        let user_role = "admin";
        let required_permission = "read";
        assert!(!user_role.is_empty());
        assert!(!required_permission.is_empty());
        // admin 应该有所有权限
        assert!(has_permission(user_role, required_permission));
    }

    #[test]
    fn test_permission_check_user() {
        let user_role = "user";
        let required_permission = "read";
        assert!(has_permission(user_role, required_permission));
    }

    #[test]
    fn test_permission_check_guest() {
        let user_role = "guest";
        let required_permission = "write";
        // guest 可能没有写权限
        assert!(!has_permission(user_role, required_permission));
    }

    fn has_permission(role: &str, permission: &str) -> bool {
        // 简化的权限检查逻辑
        match role {
            "admin" => true,
            "manager" => permission == "read" || permission == "write",
            "user" => permission == "read" || permission == "write",
            "guest" => permission == "read",
            _ => false,
        }
    }

    #[test]
    fn test_role_hierarchy() {
        let roles = vec!["admin", "manager", "user", "guest"];
        let permissions = vec!["read", "write", "delete", "admin"];

        // admin 应该有所有权限
        for perm in &permissions {
            assert!(has_permission("admin", perm));
        }

        // manager 应该有 read 和 write 权限
        assert!(has_permission("manager", "read"));
        assert!(has_permission("manager", "write"));
        assert!(!has_permission("manager", "delete"));
        assert!(!has_permission("manager", "admin"));

        // user 应该有 read 和 write 权限
        assert!(has_permission("user", "read"));
        assert!(has_permission("user", "write"));
        assert!(!has_permission("user", "delete"));

        // guest 只应该有 read 权限
        assert!(has_permission("guest", "read"));
        assert!(!has_permission("guest", "write"));
        assert!(!has_permission("guest", "delete"));
    }
}

// ============ 用户模型测试 ============

#[cfg(test)]
mod user_model_tests {
    use super::*;
    use serde::{Deserialize, Serialize};
    use chrono::{DateTime, Utc};

    #[derive(Debug, Clone, Serialize, Deserialize)]
    struct User {
        id: String,
        username: String,
        email: String,
        password_hash: String,
        full_name: Option<String>,
        role: String,
        roles: Vec<String>,
        permissions: Vec<String>,
        created_at: String,
        updated_at: String,
        is_active: bool,
        is_superuser: bool,
    }

    #[test]
    fn test_user_creation() {
        let user = User {
            id: Uuid::new_v4().to_string(),
            username: "testuser".to_string(),
            email: "testuser@example.com".to_string(),
            password_hash: "hashed_password".to_string(),
            full_name: Some("Test User".to_string()),
            role: "user".to_string(),
            roles: vec!["user".to_string()],
            permissions: vec!["read".to_string()],
            created_at: Utc::now().to_rfc3339(),
            updated_at: Utc::now().to_rfc3339(),
            is_active: true,
            is_superuser: false,
        };

        assert_eq!(user.username, "testuser");
        assert_eq!(user.email, "testuser@example.com");
        assert_eq!(user.role, "user");
        assert!(user.is_active);
        assert!(!user.is_superuser);
    }

    #[test]
    fn test_user_serialization() {
        let user = User {
            id: Uuid::new_v4().to_string(),
            username: "admin".to_string(),
            email: "admin@example.com".to_string(),
            password_hash: "hashed_password".to_string(),
            full_name: Some("Admin User".to_string()),
            role: "admin".to_string(),
            roles: vec!["admin".to_string()],
            permissions: vec!["read".to_string(), "write".to_string(), "delete".to_string()],
            created_at: Utc::now().to_rfc3339(),
            updated_at: Utc::now().to_rfc3339(),
            is_active: true,
            is_superuser: true,
        };

        let json = serde_json::to_string(&user).unwrap();
        assert!(json.contains("admin"));
        assert!(json.contains("admin@example.com"));

        let deserialized: User = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.username, user.username);
        assert_eq!(deserialized.email, user.email);
    }

    #[test]
    fn test_user_with_multiple_roles() {
        let user = User {
            id: Uuid::new_v4().to_string(),
            username: "manager".to_string(),
            email: "manager@example.com".to_string(),
            password_hash: "hashed_password".to_string(),
            full_name: Some("Manager User".to_string()),
            role: "manager".to_string(),
            roles: vec!["manager".to_string(), "user".to_string()],
            permissions: vec!["read".to_string(), "write".to_string()],
            created_at: Utc::now().to_rfc3339(),
            updated_at: Utc::now().to_rfc3339(),
            is_active: true,
            is_superuser: false,
        };

        assert_eq!(user.roles.len(), 2);
        assert!(user.roles.contains(&"manager".to_string()));
        assert!(user.roles.contains(&"user".to_string()));
    }

    #[test]
    fn test_user_inactive() {
        let user = User {
            id: Uuid::new_v4().to_string(),
            username: "inactiveuser".to_string(),
            email: "inactive@example.com".to_string(),
            password_hash: "hashed_password".to_string(),
            full_name: None,
            role: "user".to_string(),
            roles: vec!["user".to_string()],
            permissions: vec!["read".to_string()],
            created_at: Utc::now().to_rfc3339(),
            updated_at: Utc::now().to_rfc3339(),
            is_active: false,
            is_superuser: false,
        };

        assert!(!user.is_active);
        assert!(user.full_name.is_none());
    }
}

// ============ 角色模型测试 ============

#[cfg(test)]
mod role_model_tests {
    use super::*;
    use serde::{Deserialize, Serialize};

    #[derive(Debug, Serialize, Deserialize)]
    struct Role {
        id: String,
        name: String,
        description: Option<String>,
        created_at: String,
    }

    #[test]
    fn test_role_creation() {
        let role = Role {
            id: Uuid::new_v4().to_string(),
            name: "admin".to_string(),
            description: Some("管理员角色".to_string()),
            created_at: Utc::now().to_rfc3339(),
        };

        assert_eq!(role.name, "admin");
        assert!(role.description.is_some());
    }

    #[test]
    fn test_role_without_description() {
        let role = Role {
            id: Uuid::new_v4().to_string(),
            name: "user".to_string(),
            description: None,
            created_at: Utc::now().to_rfc3339(),
        };

        assert_eq!(role.name, "user");
        assert!(role.description.is_none());
    }

    #[test]
    fn test_role_serialization() {
        let role = Role {
            id: Uuid::new_v4().to_string(),
            name: "manager".to_string(),
            description: Some("部门经理".to_string()),
            created_at: Utc::now().to_rfc3339(),
        };

        let json = serde_json::to_string(&role).unwrap();
        let deserialized: Role = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.name, role.name);
    }
}

// ============ 权限模型测试 ============

#[cfg(test)]
mod permission_model_tests {
    use super::*;
    use serde::{Deserialize, Serialize};

    #[derive(Debug, Serialize, Deserialize)]
    struct Permission {
        id: String,
        name: String,
        resource: String,
        action: String,
        description: Option<String>,
    }

    #[test]
    fn test_permission_creation() {
        let permission = Permission {
            id: Uuid::new_v4().to_string(),
            name: "read_users".to_string(),
            resource: "users".to_string(),
            action: "read".to_string(),
            description: Some("读取用户信息".to_string()),
        };

        assert_eq!(permission.name, "read_users");
        assert_eq!(permission.resource, "users");
        assert_eq!(permission.action, "read");
    }

    #[test]
    fn test_permission_serialization() {
        let permission = Permission {
            id: Uuid::new_v4().to_string(),
            name: "write_documents".to_string(),
            resource: "documents".to_string(),
            action: "write".to_string(),
            description: Some("编辑文档".to_string()),
        };

        let json = serde_json::to_string(&permission).unwrap();
        let deserialized: Permission = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.name, permission.name);
        assert_eq!(deserialized.resource, permission.resource);
        assert_eq!(deserialized.action, permission.action);
    }

    #[test]
    fn test_permission_without_description() {
        let permission = Permission {
            id: Uuid::new_v4().to_string(),
            name: "delete_files".to_string(),
            resource: "files".to_string(),
            action: "delete".to_string(),
            description: None,
        };

        assert!(permission.description.is_none());
    }
}

// ============ 审计日志测试 ============

#[cfg(test)]
mod audit_log_tests {
    use super::*;
    use serde::{Deserialize, Serialize};

    #[derive(Debug, Serialize, Deserialize)]
    struct AuditLog {
        id: String,
        user_id: Option<String>,
        action: String,
        resource: Option<String>,
        resource_id: Option<String>,
        ip_address: Option<String>,
        user_agent: Option<String>,
        details: Option<serde_json::Value>,
        created_at: String,
    }

    #[test]
    fn test_audit_log_creation() {
        let log = AuditLog {
            id: Uuid::new_v4().to_string(),
            user_id: Some(Uuid::new_v4().to_string()),
            action: "login".to_string(),
            resource: Some("user".to_string()),
            resource_id: Some(Uuid::new_v4().to_string()),
            ip_address: Some("192.168.1.1".to_string()),
            user_agent: Some("Mozilla/5.0".to_string()),
            details: Some(serde_json::json!({"success": true})),
            created_at: Utc::now().to_rfc3339(),
        };

        assert_eq!(log.action, "login");
        assert!(log.user_id.is_some());
        assert!(log.ip_address.is_some());
    }

    #[test]
    fn test_audit_log_without_user() {
        let log = AuditLog {
            id: Uuid::new_v4().to_string(),
            user_id: None,
            action: "anonymous_access".to_string(),
            resource: Some("public_page".to_string()),
            resource_id: None,
            ip_address: Some("10.0.0.1".to_string()),
            user_agent: None,
            details: None,
            created_at: Utc::now().to_rfc3339(),
        };

        assert!(log.user_id.is_none());
        assert!(log.resource_id.is_none());
        assert!(log.details.is_none());
    }

    #[test]
    fn test_audit_log_serialization() {
        let log = AuditLog {
            id: Uuid::new_v4().to_string(),
            user_id: Some("user-123".to_string()),
            action: "update_profile".to_string(),
            resource: Some("user".to_string()),
            resource_id: Some("user-123".to_string()),
            ip_address: Some("192.168.1.100".to_string()),
            user_agent: Some("Chrome/120".to_string()),
            details: Some(serde_json::json!({"field": "email"})),
            created_at: Utc::now().to_rfc3339(),
        };

        let json = serde_json::to_string(&log).unwrap();
        let deserialized: AuditLog = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.action, log.action);
        assert_eq!(deserialized.user_id, log.user_id);
    }
}

// ============ 密码哈希测试 ============

#[cfg(test)]
mod password_hash_tests {
    use bcrypt::{hash, verify, DEFAULT_COST};

    #[test]
    fn test_password_hashing() {
        let password = "Admin123!";
        let hashed = hash(password, DEFAULT_COST).unwrap();

        assert_ne!(password, hashed);
        assert!(hashed.starts_with("$2b$"));
    }

    #[test]
    fn test_password_verification_success() {
        let password = "UserPass123@";
        let hashed = hash(password, DEFAULT_COST).unwrap();

        assert!(verify(password, &hashed).unwrap());
    }

    #[test]
    fn test_password_verification_failure() {
        let password = "CorrectPass123!";
        let wrong_password = "WrongPass123!";
        let hashed = hash(password, DEFAULT_COST).unwrap();

        assert!(!verify(wrong_password, &hashed).unwrap());
    }

    #[test]
    fn test_different_passwords_different_hashes() {
        let password1 = "Password1!";
        let password2 = "Password2!";

        let hash1 = hash(password1, DEFAULT_COST).unwrap();
        let hash2 = hash(password2, DEFAULT_COST).unwrap();

        assert_ne!(hash1, hash2);
    }

    #[test]
    fn test_same_password_different_hashes() {
        let password = "SamePassword123!";

        let hash1 = hash(password, DEFAULT_COST).unwrap();
        let hash2 = hash(password, DEFAULT_COST).unwrap();

        // bcrypt 每次生成的哈希值应该不同（因为有随机盐）
        assert_ne!(hash1, hash2);

        // 但两个哈希值都应该能验证同一个密码
        assert!(verify(password, &hash1).unwrap());
        assert!(verify(password, &hash2).unwrap());
    }
}
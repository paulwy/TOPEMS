// IAM 服务测试辅助函数
// 提供测试数据准备、清理和辅助功能

use uuid::Uuid;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use jsonwebtoken::{encode, Header, EncodingKey, Algorithm};
use bcrypt::{hash, DEFAULT_COST};

// ============ 测试数据生成器 ============

pub struct TestDataGenerator;

impl TestDataGenerator {
    /// 生成测试用户ID
    pub fn generate_user_id() -> String {
        Uuid::new_v4().to_string()
    }

    /// 生成测试角色ID
    pub fn generate_role_id() -> String {
        Uuid::new_v4().to_string()
    }

    /// 生成测试权限ID
    pub fn generate_permission_id() -> String {
        Uuid::new_v4().to_string()
    }

    /// 生成测试审计日志ID
    pub fn generate_audit_log_id() -> String {
        Uuid::new_v4().to_string()
    }

    /// 生成测试用户名
    pub fn generate_test_username(prefix: &str) -> String {
        format!("{}_{}", prefix, Uuid::new_v4().to_string().split('-').next().unwrap())
    }

    /// 生成测试邮箱
    pub fn generate_test_email(prefix: &str) -> String {
        format!("{}@test.example.com", prefix)
    }

    /// 生成测试密码哈希
    pub fn generate_password_hash(password: &str) -> String {
        hash(password, DEFAULT_COST).unwrap()
    }

    /// 生成当前时间戳
    pub fn generate_timestamp() -> String {
        Utc::now().to_rfc3339()
    }
}

// ============ 测试用户构建器 ============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestUser {
    pub id: String,
    pub username: String,
    pub email: String,
    pub password_hash: String,
    pub full_name: Option<String>,
    pub role: String,
    pub roles: Vec<String>,
    pub permissions: Vec<String>,
    pub created_at: String,
    pub updated_at: String,
    pub is_active: bool,
    pub is_superuser: bool,
}

pub struct TestUserBuilder {
    user: TestUser,
}

impl TestUserBuilder {
    pub fn new() -> Self {
        let now = Utc::now().to_rfc3339();
        Self {
            user: TestUser {
                id: TestDataGenerator::generate_user_id(),
                username: TestDataGenerator::generate_test_username("user"),
                email: TestDataGenerator::generate_test_email("user"),
                password_hash: TestDataGenerator::generate_password_hash("TestPass123!"),
                full_name: Some("Test User".to_string()),
                role: "user".to_string(),
                roles: vec!["user".to_string()],
                permissions: vec!["read".to_string()],
                created_at: now.clone(),
                updated_at: now,
                is_active: true,
                is_superuser: false,
            },
        }
    }

    pub fn with_username(mut self, username: &str) -> Self {
        self.user.username = username.to_string();
        self.user.email = format!("{}@test.example.com", username);
        self
    }

    pub fn with_role(mut self, role: &str) -> Self {
        self.user.role = role.to_string();
        self.user.roles = vec![role.to_string()];
        self
    }

    pub fn with_roles(mut self, roles: Vec<&str>) -> Self {
        self.user.roles = roles.iter().map(|s| s.to_string()).collect();
        if !roles.is_empty() {
            self.user.role = roles[0].to_string();
        }
        self
    }

    pub fn with_permissions(mut self, permissions: Vec<&str>) -> Self {
        self.user.permissions = permissions.iter().map(|s| s.to_string()).collect();
        self
    }

    pub fn as_superuser(mut self) -> Self {
        self.user.is_superuser = true;
        self.user.role = "admin".to_string();
        self.user.roles = vec!["admin".to_string()];
        self
    }

    pub fn as_inactive(mut self) -> Self {
        self.user.is_active = false;
        self
    }

    pub fn with_full_name(mut self, full_name: &str) -> Self {
        self.user.full_name = Some(full_name.to_string());
        self
    }

    pub fn build(self) -> TestUser {
        self.user
    }
}

impl Default for TestUserBuilder {
    fn default() -> Self {
        Self::new()
    }
}

// ============ 测试角色构建器 ============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestRole {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: String,
}

pub struct TestRoleBuilder {
    role: TestRole,
}

impl TestRoleBuilder {
    pub fn new() -> Self {
        Self {
            role: TestRole {
                id: TestDataGenerator::generate_role_id(),
                name: "test_role".to_string(),
                description: Some("Test role description".to_string()),
                created_at: Utc::now().to_rfc3339(),
            },
        }
    }

    pub fn with_name(mut self, name: &str) -> Self {
        self.role.name = name.to_string();
        self
    }

    pub fn with_description(mut self, description: &str) -> Self {
        self.role.description = Some(description.to_string());
        self
    }

    pub fn without_description(mut self) -> Self {
        self.role.description = None;
        self
    }

    pub fn build(self) -> TestRole {
        self.role
    }
}

impl Default for TestRoleBuilder {
    fn default() -> Self {
        Self::new()
    }
}

// ============ 测试权限构建器 ============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestPermission {
    pub id: String,
    pub name: String,
    pub resource: String,
    pub action: String,
    pub description: Option<String>,
}

pub struct TestPermissionBuilder {
    permission: TestPermission,
}

impl TestPermissionBuilder {
    pub fn new() -> Self {
        Self {
            permission: TestPermission {
                id: TestDataGenerator::generate_permission_id(),
                name: "test_permission".to_string(),
                resource: "test_resource".to_string(),
                action: "read".to_string(),
                description: Some("Test permission description".to_string()),
            },
        }
    }

    pub fn with_name(mut self, name: &str) -> Self {
        self.permission.name = name.to_string();
        self
    }

    pub fn with_resource(mut self, resource: &str) -> Self {
        self.permission.resource = resource.to_string();
        self
    }

    pub fn with_action(mut self, action: &str) -> Self {
        self.permission.action = action.to_string();
        self
    }

    pub fn for_resource_action(mut self, resource: &str, action: &str) -> Self {
        self.permission.resource = resource.to_string();
        self.permission.action = action.to_string();
        self.permission.name = format!("{}_{}", action, resource);
        self
    }

    pub fn with_description(mut self, description: &str) -> Self {
        self.permission.description = Some(description.to_string());
        self
    }

    pub fn build(self) -> TestPermission {
        self.permission
    }
}

impl Default for TestPermissionBuilder {
    fn default() -> Self {
        Self::new()
    }
}

// ============ 测试审计日志构建器 ============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestAuditLog {
    pub id: String,
    pub user_id: Option<String>,
    pub action: String,
    pub resource: Option<String>,
    pub resource_id: Option<String>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub details: Option<serde_json::Value>,
    pub created_at: String,
}

pub struct TestAuditLogBuilder {
    log: TestAuditLog,
}

impl TestAuditLogBuilder {
    pub fn new() -> Self {
        Self {
            log: TestAuditLog {
                id: TestDataGenerator::generate_audit_log_id(),
                user_id: Some(TestDataGenerator::generate_user_id()),
                action: "test_action".to_string(),
                resource: Some("test_resource".to_string()),
                resource_id: Some(TestDataGenerator::generate_user_id()),
                ip_address: Some("192.168.1.1".to_string()),
                user_agent: Some("Test Agent".to_string()),
                details: Some(serde_json::json!({"test": true})),
                created_at: Utc::now().to_rfc3339(),
            },
        }
    }

    pub fn with_action(mut self, action: &str) -> Self {
        self.log.action = action.to_string();
        self
    }

    pub fn with_user(mut self, user_id: &str) -> Self {
        self.log.user_id = Some(user_id.to_string());
        self
    }

    pub fn without_user(mut self) -> Self {
        self.log.user_id = None;
        self
    }

    pub fn with_resource(mut self, resource: &str) -> Self {
        self.log.resource = Some(resource.to_string());
        self
    }

    pub fn with_ip_address(mut self, ip: &str) -> Self {
        self.log.ip_address = Some(ip.to_string());
        self
    }

    pub fn with_details(mut self, details: serde_json::Value) -> Self {
        self.log.details = Some(details);
        self
    }

    pub fn build(self) -> TestAuditLog {
        self.log
    }
}

impl Default for TestAuditLogBuilder {
    fn default() -> Self {
        Self::new()
    }
}

// ============ JWT Token 生成器 ============

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TestClaims {
    pub sub: String,
    pub username: String,
    pub role: String,
    pub roles: Vec<String>,
    pub permissions: Vec<String>,
    pub is_superuser: bool,
    pub exp: usize,
    pub iat: usize,
    pub email: Option<String>,
    pub department: Option<String>,
    pub tenant_id: Option<String>,
}

pub struct TestTokenGenerator {
    secret: String,
}

impl TestTokenGenerator {
    pub fn new(secret: &str) -> Self {
        Self {
            secret: secret.to_string(),
        }
    }

    pub fn generate_access_token(&self, user: &TestUser) -> String {
        let expiration = (Utc::now() + chrono::Duration::hours(1)).timestamp() as usize;
        let claims = TestClaims {
            sub: user.id.clone(),
            username: user.username.clone(),
            role: user.role.clone(),
            roles: user.roles.clone(),
            permissions: user.permissions.clone(),
            is_superuser: user.is_superuser,
            exp: expiration,
            iat: Utc::now().timestamp() as usize,
            email: Some(user.email.clone()),
            department: None,
            tenant_id: None,
        };

        encode(
            &Header::new(Algorithm::HS256),
            &claims,
            &EncodingKey::from_secret(self.secret.as_ref()),
        ).unwrap()
    }

    pub fn generate_refresh_token(&self, user: &TestUser) -> String {
        let expiration = (Utc::now() + chrono::Duration::hours(168)).timestamp() as usize;
        let claims = TestClaims {
            sub: user.id.clone(),
            username: user.username.clone(),
            role: user.role.clone(),
            roles: user.roles.clone(),
            permissions: user.permissions.clone(),
            is_superuser: user.is_superuser,
            exp: expiration,
            iat: Utc::now().timestamp() as usize,
            email: Some(user.email.clone()),
            department: None,
            tenant_id: None,
        };

        encode(
            &Header::new(Algorithm::HS256),
            &claims,
            &EncodingKey::from_secret(self.secret.as_ref()),
        ).unwrap()
    }

    pub fn generate_expired_token(&self, user: &TestUser) -> String {
        let expiration = (Utc::now() - chrono::Duration::hours(1)).timestamp() as usize;
        let claims = TestClaims {
            sub: user.id.clone(),
            username: user.username.clone(),
            role: user.role.clone(),
            roles: user.roles.clone(),
            permissions: user.permissions.clone(),
            is_superuser: user.is_superuser,
            exp: expiration,
            iat: (Utc::now() - chrono::Duration::hours(2)).timestamp() as usize,
            email: Some(user.email.clone()),
            department: None,
            tenant_id: None,
        };

        encode(
            &Header::new(Algorithm::HS256),
            &claims,
            &EncodingKey::from_secret(self.secret.as_ref()),
        ).unwrap()
    }
}

// ============ 预定义测试数据 ============

pub struct PredefinedTestData;

impl PredefinedTestData {
    /// 获取管理员用户
    pub fn admin_user() -> TestUser {
        TestUserBuilder::new()
            .with_username("admin")
            .with_role("admin")
            .with_roles(vec!["admin"])
            .with_permissions(vec!["read", "write", "delete", "admin"])
            .as_superuser()
            .with_full_name("Administrator")
            .build()
    }

    /// 获取普通用户
    pub fn regular_user() -> TestUser {
        TestUserBuilder::new()
            .with_username("user")
            .with_role("user")
            .with_roles(vec!["user"])
            .with_permissions(vec!["read", "write"])
            .with_full_name("Regular User")
            .build()
    }

    /// 获取访客用户
    pub fn guest_user() -> TestUser {
        TestUserBuilder::new()
            .with_username("guest")
            .with_role("guest")
            .with_roles(vec!["guest"])
            .with_permissions(vec!["read"])
            .with_full_name("Guest User")
            .build()
    }

    /// 获取经理用户
    pub fn manager_user() -> TestUser {
        TestUserBuilder::new()
            .with_username("manager")
            .with_role("manager")
            .with_roles(vec!["manager", "user"])
            .with_permissions(vec!["read", "write", "approve"])
            .with_full_name("Manager User")
            .build()
    }

    /// 获取禁用用户
    pub fn inactive_user() -> TestUser {
        TestUserBuilder::new()
            .with_username("inactive")
            .as_inactive()
            .build()
    }

    /// 获取管理员角色
    pub fn admin_role() -> TestRole {
        TestRoleBuilder::new()
            .with_name("admin")
            .with_description("管理员角色，拥有所有权限")
            .build()
    }

    /// 获取普通用户角色
    pub fn user_role() -> TestRole {
        TestRoleBuilder::new()
            .with_name("user")
            .with_description("普通用户角色")
            .build()
    }

    /// 获取访客角色
    pub fn guest_role() -> TestRole {
        TestRoleBuilder::new()
            .with_name("guest")
            .with_description("访客角色，只有读取权限")
            .build()
    }

    /// 获取读取权限
    pub fn read_permission() -> TestPermission {
        TestPermissionBuilder::new()
            .for_resource_action("resource", "read")
            .with_description("读取权限")
            .build()
    }

    /// 获取写入权限
    pub fn write_permission() -> TestPermission {
        TestPermissionBuilder::new()
            .for_resource_action("resource", "write")
            .with_description("写入权限")
            .build()
    }

    /// 获取删除权限
    pub fn delete_permission() -> TestPermission {
        TestPermissionBuilder::new()
            .for_resource_action("resource", "delete")
            .with_description("删除权限")
            .build()
    }

    /// 获取登录审计日志
    pub fn login_audit_log(user_id: &str) -> TestAuditLog {
        TestAuditLogBuilder::new()
            .with_action("login")
            .with_user(user_id)
            .with_resource("user")
            .with_ip_address("192.168.1.1")
            .with_details(serde_json::json!({"success": true}))
            .build()
    }

    /// 获取注销审计日志
    pub fn logout_audit_log(user_id: &str) -> TestAuditLog {
        TestAuditLogBuilder::new()
            .with_action("logout")
            .with_user(user_id)
            .with_resource("user")
            .build()
    }
}

// ============ 测试数据集合 ============

pub struct TestDataSet;

impl TestDataSet {
    /// 获取所有预定义用户
    pub fn all_users() -> Vec<TestUser> {
        vec![
            PredefinedTestData::admin_user(),
            PredefinedTestData::regular_user(),
            PredefinedTestData::guest_user(),
            PredefinedTestData::manager_user(),
            PredefinedTestData::inactive_user(),
        ]
    }

    /// 获取所有预定义角色
    pub fn all_roles() -> Vec<TestRole> {
        vec![
            PredefinedTestData::admin_role(),
            PredefinedTestData::user_role(),
            PredefinedTestData::guest_role(),
        ]
    }

    /// 获取所有预定义权限
    pub fn all_permissions() -> Vec<TestPermission> {
        vec![
            PredefinedTestData::read_permission(),
            PredefinedTestData::write_permission(),
            PredefinedTestData::delete_permission(),
        ]
    }
}

// ============ 测试辅助函数 ============

pub fn assert_valid_uuid(id: &str) {
    assert!(Uuid::parse_str(id).is_ok(), "Invalid UUID: {}", id);
}

pub fn assert_valid_email(email: &str) {
    assert!(email.contains('@'), "Invalid email: {}", email);
}

pub fn assert_valid_timestamp(timestamp: &str) {
    assert!(DateTime::parse_from_rfc3339(timestamp).is_ok(), "Invalid timestamp: {}", timestamp);
}

pub fn assert_valid_password_hash(hash: &str) {
    assert!(hash.starts_with("$2b$"), "Invalid bcrypt hash: {}", hash);
}

// ============ 单元测试 ============

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_data_generator_user_id() {
        let id = TestDataGenerator::generate_user_id();
        assert_valid_uuid(&id);
    }

    #[test]
    fn test_data_generator_username() {
        let username = TestDataGenerator::generate_test_username("test");
        assert!(username.starts_with("test_"));
    }

    #[test]
    fn test_user_builder_default() {
        let user = TestUserBuilder::new().build();
        assert_valid_uuid(&user.id);
        assert_valid_email(&user.email);
        assert!(user.is_active);
        assert!(!user.is_superuser);
    }

    #[test]
    fn test_user_builder_admin() {
        let user = TestUserBuilder::new()
            .with_username("admin")
            .as_superuser()
            .build();

        assert_eq!(user.username, "admin");
        assert!(user.is_superuser);
        assert_eq!(user.role, "admin");
    }

    #[test]
    fn test_user_builder_multiple_roles() {
        let user = TestUserBuilder::new()
            .with_roles(vec!["manager", "user"])
            .build();

        assert_eq!(user.roles.len(), 2);
        assert!(user.roles.contains(&"manager".to_string()));
        assert!(user.roles.contains(&"user".to_string()));
    }

    #[test]
    fn test_role_builder() {
        let role = TestRoleBuilder::new()
            .with_name("test_role")
            .with_description("Test description")
            .build();

        assert_eq!(role.name, "test_role");
        assert!(role.description.is_some());
    }

    #[test]
    fn test_permission_builder() {
        let permission = TestPermissionBuilder::new()
            .for_resource_action("documents", "read")
            .build();

        assert_eq!(permission.resource, "documents");
        assert_eq!(permission.action, "read");
        assert_eq!(permission.name, "read_documents");
    }

    #[test]
    fn test_audit_log_builder() {
        let log = TestAuditLogBuilder::new()
            .with_action("login")
            .with_user("user-001")
            .build();

        assert_eq!(log.action, "login");
        assert!(log.user_id.is_some());
    }

    #[test]
    fn test_token_generator() {
        let user = TestUserBuilder::new().build();
        let generator = TestTokenGenerator::new("test_secret");

        let access_token = generator.generate_access_token(&user);
        let refresh_token = generator.generate_refresh_token(&user);

        assert!(!access_token.is_empty());
        assert!(!refresh_token.is_empty());
        assert_ne!(access_token, refresh_token);
    }

    #[test]
    fn test_predefined_admin_user() {
        let admin = PredefinedTestData::admin_user();
        assert_eq!(admin.username, "admin");
        assert!(admin.is_superuser);
        assert!(admin.permissions.contains(&"admin".to_string()));
    }

    #[test]
    fn test_predefined_regular_user() {
        let user = PredefinedTestData::regular_user();
        assert_eq!(user.username, "user");
        assert!(!user.is_superuser);
        assert!(user.permissions.contains(&"read".to_string()));
        assert!(user.permissions.contains(&"write".to_string()));
    }

    #[test]
    fn test_predefined_guest_user() {
        let guest = PredefinedTestData::guest_user();
        assert_eq!(guest.username, "guest");
        assert_eq!(guest.permissions.len(), 1);
        assert!(guest.permissions.contains(&"read".to_string()));
    }

    #[test]
    fn test_predefined_inactive_user() {
        let inactive = PredefinedTestData::inactive_user();
        assert!(!inactive.is_active);
    }

    #[test]
    fn test_all_users() {
        let users = TestDataSet::all_users();
        assert_eq!(users.len(), 5);
    }

    #[test]
    fn test_all_roles() {
        let roles = TestDataSet::all_roles();
        assert_eq!(roles.len(), 3);
    }

    #[test]
    fn test_all_permissions() {
        let permissions = TestDataSet::all_permissions();
        assert_eq!(permissions.len(), 3);
    }
}
//! IAM（身份认证与权限）服务 API trait 定义

use super::super::error::ServiceClientResult;
use super::super::trait_api::TypedServiceClient;
use crate::define_service_api;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

define_service_api!(
    IamApi,
    "topems-iam",
    8000,
    Some("IAM_SERVICE_URL"),
    "/api/core/iam"
);

// ============ 业务数据类型 ============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IamUser {
    pub id: Uuid,
    pub username: String,
    pub email: String,
    pub is_active: bool,
    pub is_superuser: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IamRole {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
}

// ============ TypedServiceClient<IamApi> 业务方法 ============

impl TypedServiceClient<IamApi> {
    /// 获取用户
    pub async fn get_user(&self, id: Uuid) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/users/{}", id);
        self.get(&self.build_path(&path)).await
    }

    /// 列出用户
    pub async fn list_users(&self) -> ServiceClientResult<Vec<serde_json::Value>> {
        self.get(&self.build_path("/users")).await
    }

    /// 获取角色
    pub async fn get_role(&self, id: Uuid) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/roles/{}", id);
        self.get(&self.build_path(&path)).await
    }

    /// 列出角色
    pub async fn list_roles(&self) -> ServiceClientResult<Vec<serde_json::Value>> {
        self.get(&self.build_path("/roles")).await
    }

    /// 获取当前用户偏好设置
    pub async fn get_user_preferences(&self) -> ServiceClientResult<serde_json::Value> {
        self.get_and_unwrap(&self.build_path("/users/me/preferences"))
            .await
    }

    /// 更新当前用户偏好设置
    pub async fn update_user_preferences(
        &self,
        body: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.put_and_unwrap(&self.build_path("/users/me/preferences"), body)
            .await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rt<T: Serialize + serde::de::DeserializeOwned>(val: &T) -> T {
        let s = serde_json::to_string(val).unwrap();
        serde_json::from_str(&s).unwrap()
    }

    #[test]
    fn iam_user_roundtrip() {
        let u = IamUser {
            id: Uuid::parse_str("550e8400-e29b-41d4-a716-446655440000").unwrap(),
            username: "alice".into(),
            email: "alice@example.com".into(),
            is_active: true,
            is_superuser: false,
        };
        let back = rt(&u);
        assert_eq!(back.id, u.id);
        assert_eq!(back.username, u.username);
        assert_eq!(back.email, u.email);
        assert!(back.is_active);
        assert!(!back.is_superuser);
    }

    #[test]
    fn iam_role_roundtrip() {
        let r = IamRole {
            id: Uuid::parse_str("6ba7b810-9dad-11d1-80b4-00c04fd430c8").unwrap(),
            name: "admin".into(),
            description: Some("full access".into()),
        };
        let back = rt(&r);
        assert_eq!(back.name, "admin");
        assert_eq!(back.description.as_deref(), Some("full access"));
    }

    #[test]
    fn iam_role_no_description() {
        let r = IamRole {
            id: Uuid::new_v4(),
            name: "viewer".into(),
            description: None,
        };
        let back = rt(&r);
        assert!(back.description.is_none());
    }
}

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

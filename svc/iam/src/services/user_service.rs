#![allow(dead_code)]

use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::models::user::{
    ChangePasswordRequest, ListUsersResponse, UpdateAvatarRequest, UpdatePreferencesRequest,
    UpdateUserRequest, User, UserInfo,
};
use topems_shared::ApiResponse;

/// 验证密码强度
/// - 长度至少8位
/// - 至少包含一个大写字母
/// - 至少包含一个小写字母
/// - 至少包含一个数字
/// - 至少包含一个特殊字符
fn validate_password_strength(password: &str) -> Result<(), String> {
    if password.len() < 8 {
        return Err("密码长度至少为8位".to_string());
    }

    let has_uppercase = password.chars().any(|c| c.is_uppercase());
    let has_lowercase = password.chars().any(|c| c.is_lowercase());
    let has_number = password.chars().any(|c| c.is_numeric());
    let has_special = password.chars().any(|c| !c.is_alphanumeric());

    let mut errors = Vec::new();
    if !has_uppercase {
        errors.push("大写字母");
    }
    if !has_lowercase {
        errors.push("小写字母");
    }
    if !has_number {
        errors.push("数字");
    }
    if !has_special {
        errors.push("特殊字符");
    }

    if !errors.is_empty() {
        return Err(format!("密码必须包含至少一个{}", errors.join("、")));
    }

    Ok(())
}

pub struct UserService {
    db: PgPool,
}

impl UserService {
    pub fn new(db: PgPool) -> Self {
        UserService { db }
    }

    pub async fn get_user_by_id(&self, user_id: &Uuid) -> Option<User> {
        let result = sqlx::query_as::<_, (Uuid, String, String, Option<String>, String, Vec<String>, Vec<String>, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>, bool, bool, Option<String>)>(
            "SELECT id, username, email, full_name, role, roles, permissions, created_at, updated_at, is_active, is_superuser, avatar_url FROM iam.users WHERE id = $1"
        )
        .bind(user_id)
        .fetch_optional(&self.db)
        .await;

        match result {
            Ok(Some(user)) => Some(User {
                id: user.0,
                username: user.1,
                email: user.2,
                password_hash: "".to_string(),
                full_name: user.3,
                role: user.4,
                roles: user.5,
                permissions: user.6,
                created_at: user.7,
                updated_at: user.8,
                is_active: user.9,
                is_superuser: user.10,
                avatar_url: user.11,
            }),
            _ => None,
        }
    }

    pub async fn get_user_roles_and_permissions(
        &self,
        user_id: &Uuid,
    ) -> (Vec<String>, Vec<String>) {
        let roles_from_roles: Vec<String> = sqlx::query_scalar(
            "SELECT r.name FROM iam.roles r
             INNER JOIN iam.user_roles ur ON r.id = ur.role_id
             WHERE ur.user_id = $1",
        )
        .bind(user_id)
        .fetch_all(&self.db)
        .await
        .unwrap_or_default();

        let roles_from_users: Vec<String> = sqlx::query_scalar(
            "SELECT COALESCE(array_to_string(roles, ','), '') FROM iam.users WHERE id = $1",
        )
        .bind(user_id)
        .fetch_optional(&self.db)
        .await
        .ok()
        .flatten()
        .map(|s: String| {
            if s.is_empty() {
                vec![]
            } else {
                s.split(',').map(|x| x.to_string()).collect()
            }
        })
        .unwrap_or_default();

        let permissions_from_users: Vec<String> = sqlx::query_scalar(
            "SELECT COALESCE(array_to_string(permissions, ','), '') FROM iam.users WHERE id = $1",
        )
        .bind(user_id)
        .fetch_optional(&self.db)
        .await
        .ok()
        .flatten()
        .map(|s: String| {
            if s.is_empty() {
                vec![]
            } else {
                s.split(',').map(|x| x.to_string()).collect()
            }
        })
        .unwrap_or_default();

        let mut all_roles = roles_from_roles.clone();
        for role in roles_from_users {
            if !all_roles.contains(&role) {
                all_roles.push(role);
            }
        }

        if all_roles.is_empty() {
            all_roles.push("user".to_string());
        }

        let english_roles: Vec<String> = all_roles
            .into_iter()
            .map(|role| match role.as_str() {
                "admin" | "管理员" => "admin".to_string(),
                "manager" | "部门经理" => "manager".to_string(),
                "user" | "普通员工" | "普通用户" => "user".to_string(),
                "guest" | "访客" => "guest".to_string(),
                _ => role,
            })
            .collect();

        let mut all_permissions = permissions_from_users;
        let permissions_from_roles: Vec<String> = sqlx::query_scalar(
            "SELECT DISTINCT p.name FROM iam.permissions p
             INNER JOIN iam.role_permissions rp ON p.id = rp.permission_id
             INNER JOIN iam.user_roles ur ON rp.role_id = ur.role_id
             WHERE ur.user_id = $1",
        )
        .bind(user_id)
        .fetch_all(&self.db)
        .await
        .unwrap_or_default();

        for perm in permissions_from_roles {
            if !all_permissions.contains(&perm) {
                all_permissions.push(perm);
            }
        }

        (english_roles, all_permissions)
    }

    pub async fn update_user(
        &self,
        user_id: &Uuid,
        update_req: UpdateUserRequest,
    ) -> ApiResponse<UserInfo> {
        if let Some(email) = &update_req.email {
            let exists = sqlx::query_scalar::<_, bool>(
                "SELECT EXISTS(SELECT 1 FROM iam.users WHERE email = $1 AND id != $2)",
            )
            .bind(email)
            .bind(user_id)
            .fetch_one(&self.db)
            .await
            .unwrap_or(false);

            if exists {
                return ApiResponse::error(409, "邮箱已被其他用户使用");
            }
        }

        let result = sqlx::query(
            "UPDATE iam.users SET email = COALESCE($1, email), full_name = COALESCE($2, full_name), is_active = COALESCE($3, is_active), updated_at = NOW() WHERE id = $4 RETURNING id, username, email, full_name, is_active, is_superuser, created_at, avatar_url"
        )
        .bind(&update_req.email)
        .bind(&update_req.full_name)
        .bind(update_req.is_active)
        .bind(user_id)
        .fetch_optional(&self.db)
        .await;

        match result {
            Ok(Some(user)) => {
                let (roles, permissions) = self.get_user_roles_and_permissions(user_id).await;
                let role = roles.first().cloned().unwrap_or_default();

                let is_superuser = user.get::<bool, _>("is_superuser") || role == "admin";
                let user_info = UserInfo {
                    id: user.get::<Uuid, _>("id").to_string(),
                    username: user.get::<String, _>("username"),
                    email: user.get::<String, _>("email"),
                    full_name: user.get::<Option<String>, _>("full_name"),
                    role,
                    roles,
                    permissions,
                    avatar_url: user.get::<Option<String>, _>("avatar_url"),
                    created_at: user
                        .get::<chrono::DateTime<chrono::Utc>, _>("created_at")
                        .to_rfc3339(),
                    is_active: user.get::<bool, _>("is_active"),
                    is_superuser,
                };

                tracing::info!("用户信息更新成功: {}", user_info.username);
                ApiResponse::success(user_info, "用户信息更新成功")
            }
            Ok(None) => ApiResponse::error(404, "用户不存在"),
            Err(e) => {
                tracing::error!("数据库更新错误: {}", e);
                ApiResponse::error(500, "服务器内部错误")
            }
        }
    }

    pub async fn change_password(
        &self,
        user_id: &Uuid,
        change_req: ChangePasswordRequest,
    ) -> ApiResponse<()> {
        let result =
            sqlx::query_scalar::<_, String>("SELECT password_hash FROM iam.users WHERE id = $1")
                .bind(user_id)
                .fetch_optional(&self.db)
                .await;

        match result {
            Ok(Some(password_hash)) => {
                if !bcrypt::verify(&change_req.current_password, &password_hash).unwrap_or(false) {
                    return ApiResponse::error(401, "当前密码不正确");
                }

                // 增强密码强度验证
                if let Err(msg) = validate_password_strength(&change_req.new_password) {
                    return ApiResponse::error(400, &msg);
                }

                // 检查新旧密码是否相同
                if change_req.current_password == change_req.new_password {
                    return ApiResponse::error(400, "新密码不能与当前密码相同");
                }

                let new_password_hash =
                    bcrypt::hash(&change_req.new_password, bcrypt::DEFAULT_COST).unwrap();

                let update_result = sqlx::query(
                    "UPDATE iam.users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
                )
                .bind(&new_password_hash)
                .bind(user_id)
                .execute(&self.db)
                .await;

                match update_result {
                    Ok(_) => {
                        tracing::info!("用户密码修改成功: {}", user_id);
                        ApiResponse::success_no_data("密码修改成功")
                    }
                    Err(e) => {
                        tracing::error!("数据库更新错误: {}", e);
                        ApiResponse::error(500, "服务器内部错误")
                    }
                }
            }
            Ok(None) => ApiResponse::error(404, "用户不存在"),
            Err(e) => {
                tracing::error!("数据库查询错误: {}", e);
                ApiResponse::error(500, "服务器内部错误")
            }
        }
    }

    pub async fn update_avatar(
        &self,
        user_id: &Uuid,
        update_req: UpdateAvatarRequest,
    ) -> ApiResponse<UserInfo> {
        let result = sqlx::query(
            "UPDATE iam.users SET avatar_url = $1, updated_at = NOW() WHERE id = $2 RETURNING id, username, email, full_name, avatar_url, is_active, created_at"
        )
        .bind(&update_req.avatar_url)
        .bind(user_id)
        .fetch_optional(&self.db)
        .await;

        match result {
            Ok(Some(user)) => {
                let (roles, permissions) = self.get_user_roles_and_permissions(user_id).await;
                let role = roles.first().cloned().unwrap_or_default();
                let is_superuser = role == "admin";

                let user_info = UserInfo {
                    id: user.get::<Uuid, _>("id").to_string(),
                    username: user.get::<String, _>("username"),
                    email: user.get::<String, _>("email"),
                    full_name: user.get::<Option<String>, _>("full_name"),
                    role,
                    roles,
                    permissions,
                    avatar_url: user.get::<Option<String>, _>("avatar_url"),
                    created_at: user
                        .get::<chrono::DateTime<chrono::Utc>, _>("created_at")
                        .to_rfc3339(),
                    is_active: user.get::<bool, _>("is_active"),
                    is_superuser,
                };

                tracing::info!("用户头像更新成功: {}", user_info.username);
                ApiResponse::success(user_info, "头像更新成功")
            }
            Ok(None) => ApiResponse::error(404, "用户不存在"),
            Err(e) => {
                tracing::error!("数据库更新错误: {}", e);
                ApiResponse::error(500, "服务器内部错误")
            }
        }
    }

    pub async fn get_preferences(&self, user_id: &Uuid) -> ApiResponse<serde_json::Value> {
        let result = sqlx::query_scalar::<_, serde_json::Value>(
            "SELECT COALESCE((SELECT jsonb_build_object(
                'notification_settings', notification_settings,
                'shortcuts', shortcuts,
                'language', language,
                'timezone', timezone
            ) FROM iam.user_preferences WHERE user_id = $1), 
            jsonb_build_object(
                'notification_settings', '{}',
                'shortcuts', '[]',
                'language', 'zh-CN',
                'timezone', 'Asia/Shanghai'
            ))",
        )
        .bind(user_id)
        .fetch_one(&self.db)
        .await;

        match result {
            Ok(preferences) => ApiResponse::success(preferences, "获取偏好设置成功"),
            Err(e) => {
                tracing::error!("数据库查询错误: {}", e);
                ApiResponse::error(500, "服务器内部错误")
            }
        }
    }

    pub async fn update_preferences(
        &self,
        user_id: &Uuid,
        update_req: UpdatePreferencesRequest,
    ) -> ApiResponse<serde_json::Value> {
        let result = sqlx::query_scalar::<_, serde_json::Value>(
            "INSERT INTO iam.user_preferences (user_id, notification_settings, shortcuts, language, timezone, updated_at)
             VALUES ($1, COALESCE($2, '{}'::jsonb), COALESCE($3, '[]'::jsonb), COALESCE($4, 'zh-CN'), COALESCE($5, 'Asia/Shanghai'), NOW())
             ON CONFLICT (user_id) DO UPDATE SET 
                 notification_settings = COALESCE(EXCLUDED.notification_settings, iam.user_preferences.notification_settings),
                 shortcuts = COALESCE(EXCLUDED.shortcuts, iam.user_preferences.shortcuts),
                 language = COALESCE(EXCLUDED.language, iam.user_preferences.language),
                 timezone = COALESCE(EXCLUDED.timezone, iam.user_preferences.timezone),
                 updated_at = NOW()
             RETURNING jsonb_build_object(
                 'notification_settings', notification_settings,
                 'shortcuts', shortcuts,
                 'language', language,
                 'timezone', timezone
             )"
        )
        .bind(user_id)
        .bind(&update_req.notification_settings)
        .bind(&update_req.shortcuts)
        .bind(&update_req.language)
        .bind(&update_req.timezone)
        .fetch_one(&self.db)
        .await;

        match result {
            Ok(preferences) => {
                tracing::info!("用户偏好设置更新成功: {}", user_id);
                ApiResponse::success(preferences, "偏好设置更新成功")
            }
            Err(e) => {
                tracing::error!("数据库更新错误: {}", e);
                ApiResponse::error(500, "服务器内部错误")
            }
        }
    }

    pub async fn list_users(&self) -> ApiResponse<ListUsersResponse> {
        let users = sqlx::query_as::<_, (Uuid, String, String, Option<String>, bool, chrono::DateTime<chrono::Utc>, bool, Option<String>)>(
            "SELECT id, username, email, full_name, is_active, created_at, is_superuser, avatar_url FROM iam.users ORDER BY created_at DESC"
        )
        .fetch_all(&self.db)
        .await;

        match users {
            Ok(users) => {
                let total = users.len();
                let mut user_info_list = Vec::new();
                for user in users {
                    let (roles, permissions) = self.get_user_roles_and_permissions(&user.0).await;

                    let role = roles.first().cloned().unwrap_or_default();
                    let is_superuser = user.6 || role == "admin";

                    let user_info = UserInfo {
                        id: user.0.to_string(),
                        username: user.1,
                        email: user.2,
                        full_name: user.3,
                        role,
                        roles,
                        permissions,
                        avatar_url: user.7,
                        created_at: user.5.to_rfc3339(),
                        is_superuser,
                        is_active: user.4,
                    };
                    user_info_list.push(user_info);
                }
                ApiResponse::success(
                    ListUsersResponse {
                        users: user_info_list,
                        total,
                    },
                    "Success",
                )
            }
            Err(e) => {
                tracing::error!("数据库查询错误: {}", e);
                ApiResponse::error(500, "服务器内部错误")
            }
        }
    }

    pub async fn list_users_with_search(
        &self,
        search: Option<String>,
        page: Option<u32>,
        page_size: Option<u32>,
    ) -> ApiResponse<ListUsersResponse> {
        let page = page.unwrap_or(1).max(1) as i64;
        let page_size = page_size.unwrap_or(20).min(100) as i64;
        let offset = (page - 1) * page_size;

        let search_pattern = search.as_ref().map(|s| format!("%{}%", s));

        let count_result = sqlx::query_scalar::<_, i64>(
            r#"
            SELECT COUNT(*) FROM iam.users
            WHERE ($1::text IS NULL OR username ILIKE $1 OR email ILIKE $1 OR full_name ILIKE $1)
            "#,
        )
        .bind(&search_pattern)
        .fetch_one(&self.db)
        .await;

        let total = match count_result {
            Ok(count) => count as usize,
            Err(e) => {
                tracing::error!("数据库计数错误: {}", e);
                return ApiResponse::error(500, "服务器内部错误");
            }
        };

        let users = sqlx::query_as::<
            _,
            (
                Uuid,
                String,
                String,
                Option<String>,
                bool,
                chrono::DateTime<chrono::Utc>,
                bool,
                Option<String>,
            ),
        >(
            r#"
            SELECT id, username, email, full_name, is_active, created_at, is_superuser, avatar_url
            FROM iam.users
            WHERE ($1::text IS NULL OR username ILIKE $1 OR email ILIKE $1 OR full_name ILIKE $1)
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
            "#,
        )
        .bind(&search_pattern)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&self.db)
        .await;

        match users {
            Ok(users) => {
                let mut user_info_list = Vec::new();
                for user in users {
                    let (roles, permissions) = self.get_user_roles_and_permissions(&user.0).await;

                    let role = roles.first().cloned().unwrap_or_default();
                    let is_superuser = user.6 || role == "admin";

                    let user_info = UserInfo {
                        id: user.0.to_string(),
                        username: user.1,
                        email: user.2,
                        full_name: user.3,
                        role,
                        roles,
                        permissions,
                        avatar_url: user.7,
                        created_at: user.5.to_rfc3339(),
                        is_superuser,
                        is_active: user.4,
                    };
                    user_info_list.push(user_info);
                }
                ApiResponse::success(
                    ListUsersResponse {
                        users: user_info_list,
                        total,
                    },
                    "Success",
                )
            }
            Err(e) => {
                tracing::error!("数据库查询错误: {}", e);
                ApiResponse::error(500, "服务器内部错误")
            }
        }
    }

    pub async fn delete_user(&self, user_id: &Uuid) -> ApiResponse<String> {
        let result = sqlx::query("DELETE FROM iam.users WHERE id = $1")
            .bind(user_id)
            .execute(&self.db)
            .await;

        match result {
            Ok(res) => {
                if res.rows_affected() > 0 {
                    tracing::info!("用户删除成功: {}", user_id);
                    ApiResponse::success(user_id.to_string(), "用户删除成功")
                } else {
                    ApiResponse::error(404, "用户不存在")
                }
            }
            Err(e) => {
                tracing::error!("数据库删除错误: {}", e);
                ApiResponse::error(500, "服务器内部错误")
            }
        }
    }
}

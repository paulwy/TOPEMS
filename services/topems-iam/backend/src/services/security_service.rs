use crate::errors::IamError;
use crate::models::{PasswordPolicy, AccessLog, PasswordHistory};
use chrono::{DateTime, Utc, Duration};
use sqlx::PgPool;
use uuid::Uuid;
use tracing;
use regex::Regex;

lazy_static::lazy_static! {
    static ref SPECIAL_CHAR_REGEX: Regex = Regex::new("[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>/?]").unwrap();
}

#[derive(Debug, sqlx::FromRow)]
struct UserLockStatus {
    account_locked: bool,
    account_locked_until: Option<DateTime<Utc>>,
}

#[derive(Debug, sqlx::FromRow)]
struct FailedLoginCountRow {
    failed_login_count: i32,
}

#[derive(Debug, sqlx::FromRow)]
struct PasswordChangedAtRow {
    password_changed_at: Option<DateTime<Utc>>,
}

pub struct SecurityService {
    pool: PgPool,
    policy: PasswordPolicy,
}

impl SecurityService {
    pub fn new(pool: PgPool) -> Self {
        Self {
            pool,
            policy: PasswordPolicy::default(),
        }
    }

    pub fn with_policy(pool: PgPool, policy: PasswordPolicy) -> Self {
        Self { pool, policy }
    }

    pub fn policy(&self) -> &PasswordPolicy {
        &self.policy
    }

    pub fn validate_password(&self, password: &str) -> Result<(), String> {
        if password.len() < self.policy.min_length {
            let msg = format!("密码长度至少为{} 位", self.policy.min_length);
            return Err(msg);
        }

        if self.policy.require_uppercase && !password.chars().any(|c| c.is_uppercase()) {
            return Err("密码需要包含至少一个大写字母".to_string());
        }

        if self.policy.require_lowercase && !password.chars().any(|c| c.is_lowercase()) {
            return Err("密码需要包含至少一个小写字母".to_string());
        }

        if self.policy.require_number && !password.chars().any(|c| c.is_numeric()) {
            return Err("密码需要包含至少一个数字".to_string());
        }

        if self.policy.require_special && !SPECIAL_CHAR_REGEX.is_match(password) {
            return Err("密码需要包含至少一个特殊字符(!@#$%^&*等)".to_string());
        }

        Ok(())
    }

    pub async fn check_password_history(
        &self,
        user_id: Uuid,
        new_password: &str,
    ) -> Result<bool, IamError> {
        let history: Vec<PasswordHistory> = sqlx::query_as::<_, PasswordHistory>(
            r#"SELECT id, user_id, password_hash, created_at FROM iam.password_history 
               WHERE user_id = $1 
               ORDER BY created_at DESC 
               LIMIT $2"#,
        )
        .bind(user_id)
        .bind(self.policy.max_history_count as i64)
        .fetch_all(&self.pool)
        .await?;

        for record in history {
            if bcrypt::verify(new_password, &record.password_hash).unwrap_or(false) {
                return Ok(true);
            }
        }

        Ok(false)
    }

    pub async fn save_password_history(
        &self,
        user_id: Uuid,
        password_hash: &str,
    ) -> Result<(), IamError> {
        sqlx::query(
            r#"INSERT INTO iam.password_history (id, user_id, password_hash) 
               VALUES ($1, $2, $3)"#,
        )
        .bind(Uuid::new_v4())
        .bind(user_id)
        .bind(password_hash)
        .execute(&self.pool)
        .await?;

        let to_keep = self.policy.max_history_count;
        sqlx::query(
            r#"DELETE FROM iam.password_history 
               WHERE user_id = $1 AND id NOT IN (
                   SELECT id FROM iam.password_history 
                   WHERE user_id = $1 
                   ORDER BY created_at DESC 
                   LIMIT $2
               )"#,
        )
        .bind(user_id)
        .bind(to_keep as i64)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn record_login_attempt(
        &self,
        username: &str,
        ip_address: Option<&str>,
        user_agent: Option<&str>,
        success: bool,
        error_message: Option<&str>,
    ) -> Result<(), IamError> {
        sqlx::query(
            r#"INSERT INTO iam.login_attempts (id, username, ip_address, user_agent, success, error_message)
               VALUES ($1, $2, $3, $4, $5, $6)"#,
        )
        .bind(Uuid::new_v4())
        .bind(username)
        .bind(ip_address)
        .bind(user_agent)
        .bind(success)
        .bind(error_message)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn get_failed_login_count(
        &self,
        username: &str,
        window_minutes: i64,
    ) -> Result<i64, IamError> {
        let since = Utc::now() - Duration::minutes(window_minutes);
        let count = sqlx::query_scalar::<_, i64>(
            r#"SELECT COUNT(*) FROM iam.login_attempts 
               WHERE username = $1 AND success = false AND created_at >= $2"#,
        )
        .bind(username)
        .bind(since)
        .fetch_one(&self.pool)
        .await?;

        Ok(count)
    }

    pub async fn lock_user(
        &self,
        user_id: Uuid,
        reason: Option<&str>,
    ) -> Result<DateTime<Utc>, IamError> {
        let locked_until = Utc::now() + Duration::minutes(self.policy.lockout_minutes as i64);
        
        sqlx::query(
            r#"UPDATE iam.users 
               SET account_locked = true, account_locked_until = $2, failed_login_count = 0
               WHERE id = $1"#,
        )
        .bind(user_id)
        .bind(locked_until)
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"INSERT INTO iam.user_lockouts (id, user_id, locked_until, reason)
               VALUES ($1, $2, $3, $4)"#,
        )
        .bind(Uuid::new_v4())
        .bind(user_id)
        .bind(locked_until)
        .bind(reason)
        .execute(&self.pool)
        .await?;

        Ok(locked_until)
    }

    pub async fn unlock_user(&self, user_id: Uuid) -> Result<(), IamError> {
        sqlx::query(
            r#"UPDATE iam.users 
               SET account_locked = false, account_locked_until = NULL, failed_login_count = 0
               WHERE id = $1"#,
        )
        .bind(user_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn check_user_locked(&self, user_id: Uuid) -> Result<bool, IamError> {
        let result = sqlx::query_as::<_, UserLockStatus>(
            r#"SELECT account_locked, account_locked_until FROM iam.users WHERE id = $1"#,
        )
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await?;

        match result {
            Some(row) => {
                if row.account_locked {
                    if let Some(locked_until) = row.account_locked_until {
                        if locked_until > Utc::now() {
                            return Ok(true);
                        } else {
                            self.unlock_user(user_id).await?;
                            return Ok(false);
                        }
                    }
                    return Ok(true);
                }
                Ok(false)
            }
            None => Ok(false),
        }
    }

    pub async fn increment_failed_login(&self, user_id: Uuid) -> Result<i32, IamError> {
        let result = sqlx::query_as::<_, FailedLoginCountRow>(
            r#"UPDATE iam.users 
               SET failed_login_count = failed_login_count + 1, last_failed_login_at = NOW()
               WHERE id = $1
               RETURNING failed_login_count"#,
        )
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(result.map(|r| r.failed_login_count).unwrap_or(0))
    }

    pub async fn reset_failed_login(&self, user_id: Uuid) -> Result<(), IamError> {
        sqlx::query(
            r#"UPDATE iam.users 
               SET failed_login_count = 0, last_login_at = NOW()
               WHERE id = $1"#,
        )
        .bind(user_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn check_password_expired(&self, user_id: Uuid) -> Result<bool, IamError> {
        let result = sqlx::query_as::<_, PasswordChangedAtRow>(
            r#"SELECT password_changed_at FROM iam.users WHERE id = $1"#,
        )
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await?;

        match result {
            Some(row) => {
                if let Some(changed_at) = row.password_changed_at {
                    let expires_at = changed_at + Duration::days(self.policy.expire_days as i64);
                    Ok(Utc::now() > expires_at)
                } else {
                    Ok(false)
                }
            }
            None => Ok(false),
        }
    }

    pub async fn update_password_changed(&self, user_id: Uuid) -> Result<(), IamError> {
        let expires_at = Utc::now() + Duration::days(self.policy.expire_days as i64);
        sqlx::query(
            r#"UPDATE iam.users 
               SET password_changed_at = NOW(), 
                   password_expires_at = $2,
                   must_change_password = false
               WHERE id = $1"#,
        )
        .bind(user_id)
        .bind(expires_at)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn log_access(
        &self,
        user_id: Option<Uuid>,
        username: &str,
        action: &str,
        resource: &str,
        resource_id: Option<&str>,
        ip_address: Option<&str>,
        user_agent: Option<&str>,
        success: bool,
        error_message: Option<&str>,
    ) -> Result<(), IamError> {
        let result = sqlx::query(
            r#"INSERT INTO iam.access_logs 
               (id, user_id, username, action, resource, resource_id, ip_address, user_agent, success, error_message)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)"#,
        )
        .bind(Uuid::new_v4())
        .bind(user_id)
        .bind(username)
        .bind(action)
        .bind(resource)
        .bind(resource_id)
        .bind(ip_address)
        .bind(user_agent)
        .bind(success)
        .bind(error_message)
        .execute(&self.pool)
        .await;

        if let Err(e) = result {
            tracing::warn!("记录访问日志失败: {}", e);
        }

        Ok(())
    }

    pub async fn list_access_logs(
        &self,
        page: i64,
        page_size: i64,
        user_id: Option<&str>,
        action: Option<&str>,
        resource: Option<&str>,
        success: Option<bool>,
        _start_date: Option<&str>,
        _end_date: Option<&str>,
    ) -> Result<(Vec<AccessLog>, i64), IamError> {
        let offset = (page - 1) * page_size;

        let total: i64 = sqlx::query_scalar(
            r#"SELECT COUNT(*) FROM iam.access_logs 
               WHERE ($1::text IS NULL OR user_id::text = $1)
                 AND ($2::text IS NULL OR action = $2)
                 AND ($3::text IS NULL OR resource = $3)
                 AND ($4::boolean IS NULL OR success = $4)"#,
        )
        .bind(user_id)
        .bind(action)
        .bind(resource)
        .bind(success)
        .fetch_one(&self.pool)
        .await?;

        let logs: Vec<AccessLog> = sqlx::query_as(
            r#"SELECT id, user_id, username, action, resource, resource_id, ip_address, user_agent, success, error_message, created_at
               FROM iam.access_logs 
               WHERE ($1::text IS NULL OR user_id::text = $1)
                 AND ($2::text IS NULL OR action = $2)
                 AND ($3::text IS NULL OR resource = $3)
                 AND ($4::boolean IS NULL OR success = $4)
               ORDER BY created_at DESC 
               LIMIT $5 OFFSET $6"#,
        )
        .bind(user_id)
        .bind(action)
        .bind(resource)
        .bind(success)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&self.pool)
        .await?;

        Ok((logs, total))
    }
}

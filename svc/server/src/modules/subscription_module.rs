//! 订阅管理模块（SubscriptionModule）—— P5 商业化支撑
//!
//! 提供订阅制存储与 API：
//! - `public.subscriptions` 表（tenant 唯一）
//! - GET  /api/subscriptions/current —— 当前订阅 + 生效 tier（订阅过期自动降级 free）
//! - POST /api/subscriptions —— 开通/变更订阅（upsert，tenant 唯一）
//! - POST /api/subscriptions/{id}/cancel —— 取消订阅
//!
//! tier 判定纯逻辑位于 `topems-shared-auth::tier`。
//! 由 feature `module-subscription` 门控（默认不启用，按客户需求启用）。

#![cfg(feature = "module-subscription")]

use crate::module::{Module, ModuleContext, ModuleGroup, ModuleHealth};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::{get, post},
    Extension, Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::require_permission;
use topems_shared_auth::tier::{resolve_effective_tier, SubscriptionStatus, Tier};
use topems_shared_bootstrap::{bootstrap_service, ServiceConfig};
use topems_shared_core::response::ApiResponse;
use uuid::Uuid;

// ==================== 数据模型 ====================

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Subscription {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub tier: String,
    pub status: String,
    pub started_at: Option<DateTime<Utc>>,
    pub expires_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubscriptionRequest {
    pub tier: String,
    pub status: Option<String>,
    pub expires_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EffectiveSubscription {
    pub tenant_id: Uuid,
    pub subscribed_tier: String,
    pub status: String,
    pub effective_tier: String,
    pub expires_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone)]
pub struct SubscriptionState {
    pub pool: sqlx::PgPool,
}

// ==================== Handlers ====================

const SUB_RETURN: &str =
    r#"id, tenant_id, tier, status, started_at, expires_at, created_at, updated_at"#;

/// 查询当前订阅 + 生效 tier（订阅过期/取消 → 降级 free）
pub async fn get_current_subscription(
    State(state): State<SubscriptionState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<EffectiveSubscription>> {
    let tenant_id = claims
        .tenant_id
        .as_deref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .unwrap_or_else(Uuid::nil);

    let sub: Result<Option<Subscription>, sqlx::Error> = sqlx::query_as(&format!(
        "SELECT {SUB_RETURN} FROM public.subscriptions WHERE tenant_id = $1 ORDER BY updated_at DESC LIMIT 1"
    ))
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await;

    match sub {
        Ok(Some(s)) => {
            let subscribed = Tier::from_str(&s.tier).unwrap_or(Tier::Free);
            let status =
                SubscriptionStatus::from_str(&s.status).unwrap_or(SubscriptionStatus::Expired);
            let effective = resolve_effective_tier(subscribed, status);
            Json(ApiResponse::success(
                EffectiveSubscription {
                    tenant_id,
                    subscribed_tier: s.tier.clone(),
                    status: s.status.clone(),
                    effective_tier: effective.to_string(),
                    expires_at: s.expires_at,
                },
                "当前订阅获取成功",
            ))
        }
        Ok(None) => Json(ApiResponse::success(
            EffectiveSubscription {
                tenant_id,
                subscribed_tier: "free".to_string(),
                status: "none".to_string(),
                effective_tier: "free".to_string(),
                expires_at: None,
            },
            "当前订阅获取成功（默认 free）",
        )),
        Err(e) => Json(ApiResponse::error(
            StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
            &format!("获取订阅失败: {}", e),
        )),
    }
}

/// 开通/变更订阅（upsert：同租户仅一条，tier/status 校验）
pub async fn upsert_subscription(
    State(state): State<SubscriptionState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<SubscriptionRequest>,
) -> Json<ApiResponse<Subscription>> {
    if Tier::from_str(&req.tier).is_none() {
        return Json(ApiResponse::error(
            StatusCode::BAD_REQUEST.as_u16(),
            "无效 tier（应为 free/basic/advanced）",
        ));
    }
    let status = req.status.unwrap_or_else(|| "active".to_string());
    if SubscriptionStatus::from_str(&status).is_none() {
        return Json(ApiResponse::error(
            StatusCode::BAD_REQUEST.as_u16(),
            "无效订阅状态（应为 active/trial/expired/canceled）",
        ));
    }
    let tenant_id = claims
        .tenant_id
        .as_deref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .unwrap_or_else(Uuid::nil);
    let now = Utc::now();

    let result: Result<Subscription, sqlx::Error> = sqlx::query_as(&format!(
        r#"INSERT INTO public.subscriptions
        (id, tenant_id, tier, status, started_at, expires_at, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$7)
        ON CONFLICT (tenant_id) DO UPDATE SET
          tier = EXCLUDED.tier,
          status = EXCLUDED.status,
          expires_at = EXCLUDED.expires_at,
          updated_at = EXCLUDED.updated_at
        RETURNING {SUB_RETURN}"#
    ))
    .bind(Uuid::new_v4())
    .bind(tenant_id)
    .bind(&req.tier)
    .bind(&status)
    .bind(Some(now))
    .bind(req.expires_at)
    .bind(now)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(s) => Json(ApiResponse::success(s, "订阅已保存")),
        Err(e) => Json(ApiResponse::error(
            StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
            &format!("保存订阅失败: {}", e),
        )),
    }
}

/// 取消订阅（status → canceled，生效 tier 将降级 free）
pub async fn cancel_subscription(
    State(state): State<SubscriptionState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Subscription>> {
    let tenant_id = claims
        .tenant_id
        .as_deref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .unwrap_or_else(Uuid::nil);
    let now = Utc::now();
    let result: Result<Option<Subscription>, sqlx::Error> = sqlx::query_as(&format!(
        "UPDATE public.subscriptions SET status = 'canceled', updated_at = $3
         WHERE id = $1 AND tenant_id = $2 RETURNING {SUB_RETURN}"
    ))
    .bind(id)
    .bind(tenant_id)
    .bind(now)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(s)) => Json(ApiResponse::success(s, "订阅已取消")),
        Ok(None) => Json(ApiResponse::error(
            StatusCode::NOT_FOUND.as_u16(),
            "订阅不存在",
        )),
        Err(e) => Json(ApiResponse::error(
            StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
            &format!("取消订阅失败: {}", e),
        )),
    }
}

// ==================== Module ====================

pub struct SubscriptionModule {
    routes: Router,
    db: sqlx::PgPool,
}

impl SubscriptionModule {
    pub async fn build() -> anyhow::Result<Self> {
        std::env::set_var("SEARCH_PATH", "public");

        let config = ServiceConfig {
            name: "topems-subscription",
            port: 8090,
            port_env_var: Some("SUBSCRIPTION_PORT"),
            max_db_connections: 5,
            enable_events: false,
            enable_rls: false,
            enable_request_context: false,
            api_prefix: "/api/subscriptions",
            legacy_prefixes: &[],
            init_telemetry: false,
        };
        let ctx = bootstrap_service(&config).await?;
        let _conn = ctx.db.acquire().await?;

        // 建表（tenant 唯一）
        sqlx::query(
            r#"CREATE TABLE IF NOT EXISTS public.subscriptions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id UUID NOT NULL UNIQUE,
                tier TEXT NOT NULL DEFAULT 'free',
                status TEXT NOT NULL DEFAULT 'trial',
                started_at TIMESTAMPTZ,
                expires_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )"#,
        )
        .execute(&ctx.db)
        .await?;

        let state = SubscriptionState {
            pool: ctx.db.clone(),
        };
        // 权限分层：读（current）需 subscription:read（tier_permissions 自动关联），写（upsert/cancel）需 subscription:admin
        let read_routes = Router::new()
            .route("/current", get(get_current_subscription))
            .layer(axum::middleware::from_fn(require_permission(
                "subscription:read",
            )));
        let write_routes = Router::new()
            .route("/", post(upsert_subscription))
            .route("/{id}/cancel", post(cancel_subscription))
            .layer(axum::middleware::from_fn(require_permission(
                "subscription:admin",
            )));
        let protected = read_routes.merge(write_routes).with_state(state);
        let routes = axum::Router::new()
            .nest(config.api_prefix, protected)
            .layer(axum::middleware::from_fn_with_state(
                ctx.auth_state.clone(),
                topems_shared_auth::auth::auth_middleware,
            ));

        tracing::info!("✅ 订阅模块已接入（prefix={}）", config.api_prefix);
        Ok(Self {
            routes,
            db: ctx.db.clone(),
        })
    }
}

#[async_trait::async_trait]
impl Module for SubscriptionModule {
    fn name(&self) -> &'static str {
        "subscription"
    }

    fn group(&self) -> ModuleGroup {
        ModuleGroup::Core
    }

    fn routes(&self, _state: ModuleContext) -> Router {
        self.routes.clone()
    }

    async fn health_check(&self) -> ModuleHealth {
        let mut health = ModuleHealth::healthy("subscription", ModuleGroup::Core);
        let db_ok = self.db.size() > 0;
        health.dependencies.push(crate::module::DependencyHealth {
            name: "PostgreSQL",
            healthy: db_ok,
            detail: format!("连接池大小 {}", self.db.size()),
        });
        health
    }
}

// ==================== Tests ====================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn effective_tier_logic_reused_from_shared_auth() {
        // 订阅 advanced + active → effective advanced
        assert_eq!(
            resolve_effective_tier(Tier::Advanced, SubscriptionStatus::Active),
            Tier::Advanced
        );
        // 订阅 advanced + expired → effective free（降级）
        assert_eq!(
            resolve_effective_tier(Tier::Advanced, SubscriptionStatus::Expired),
            Tier::Free
        );
    }
}

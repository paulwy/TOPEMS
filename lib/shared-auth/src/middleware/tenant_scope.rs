//! 显式租户作用域（W7 阶段三 P0）。
//!
//! 背景：历史实现用 `($n::uuid = '000…'::uuid OR tenant_id = $n)` 做"全量放行"，
//! 参数为空（NULL/nil）即等于跨租户可见。改写成 `$n IS NULL` 只是把哨兵换成另一个
//! 哨兵值，仍然无法区分"忘绑值"和"故意全量"。
//!
//! 本模块只提供两种**显式**通道：
//! - [`TenantScope::Tenant`]：SQL 里出现 `tenant_id = $n`，且绑定的 UUID 不允许为
//!   nil（构造期即报错，不存在"绑空了就放行"的可能）；
//! - [`TenantScope::System`]：SQL 里**根本没有租户谓词**（生成 `TRUE` 且不绑定租户
//!   参数），只能通过 [`TenantScope::system`] 构造，构造时强制落 `tracing::warn!`
//!   与计数器，记录通道来源（超管 / 服务令牌）与目标表。
//!
//! 调用方拿到的枚举字段是私有的，无法直接拼出 `Tenant(nil)`，也没有"传个 NULL"
//! 的入口。

use crate::auth::Claims;
use crate::service::is_service_claims;
use prometheus::{register_int_counter_vec, IntCounterVec};
use sqlx::postgres::PgArguments;
use sqlx::query::{Query, QueryAs, QueryScalar};
use sqlx::Postgres;
use std::sync::OnceLock;
use uuid::Uuid;

/// 系统通道来源。用于日志与计数维度，便于追溯"谁在用系统通道读数据"。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum SystemChannel {
    /// 超管显式跨租户查询（A 类）。
    Superuser,
    /// 服务令牌（service token）服务间调用（B 类）。
    ServiceToken,
}

impl SystemChannel {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Superuser => "superuser",
            Self::ServiceToken => "service_token",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ScopeInner {
    Tenant(Uuid),
    System(SystemChannel),
}

/// 显式租户作用域。字段私有：只能经构造函数获得合法状态。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TenantScope {
    inner: ScopeInner,
}

impl TenantScope {
    /// 租户通道。`nil` 直接报错，避免把"没解析到租户"当作可用租户写进谓词。
    pub fn tenant(id: Uuid) -> Result<Self, (u16, String)> {
        if id.is_nil() {
            return Err((400, "租户上下文为空".to_string()));
        }
        Ok(Self {
            inner: ScopeInner::Tenant(id),
        })
    }

    /// 系统通道的**唯一**构造入口：强制记录来源、目标表，并计数。
    ///
    /// `source` 建议使用 `"<服务>.<模块>.<函数>"`，`table` 使用目标表名
    /// （多表查询用逗号分隔），便于按维度排查。
    pub fn system(channel: SystemChannel, source: &'static str, table: &'static str) -> Self {
        tracing::warn!(
            target: "tenant_scope",
            channel = channel.as_str(),
            source,
            table,
            "使用系统通道访问租户数据（跨租户可见）"
        );
        system_metric()
            .with_label_values(&[channel.as_str(), table])
            .inc();
        Self {
            inner: ScopeInner::System(channel),
        }
    }

    /// 从 Claims 严格解析（A/B 类路径）。
    ///
    /// 优先级：可解析的非 nil 租户（普通用户或超管显式选择的租户）→ 超管系统通道
    /// → 服务令牌系统通道 → 400。缺失租户的普通用户不再降级为全量。
    pub fn from_claims(
        claims: &Claims,
        source: &'static str,
        table: &'static str,
    ) -> Result<Self, (u16, String)> {
        if let Some(tenant) = claims
            .tenant_id
            .as_deref()
            .and_then(|s| Uuid::parse_str(s).ok())
            .filter(|t| !t.is_nil())
        {
            return Ok(Self {
                inner: ScopeInner::Tenant(tenant),
            });
        }
        if claims.is_superuser {
            return Ok(Self::system(SystemChannel::Superuser, source, table));
        }
        if is_service_claims(claims) {
            return Ok(Self::system(SystemChannel::ServiceToken, source, table));
        }
        Err((400, "缺少租户上下文".to_string()))
    }

    /// 只允许租户通道（C/D 类：写路径与租户内读）。缺失/非法/nil 一律 400。
    pub fn require_tenant(claims: &Claims) -> Result<Self, (u16, String)> {
        match claims.tenant_id.as_deref() {
            None => Err((400, "缺少租户上下文".to_string())),
            Some(raw) => Uuid::parse_str(raw)
                .ok()
                .filter(|t| !t.is_nil())
                .ok_or_else(|| (400, "无效的租户ID".to_string())),
        }
        .and_then(Self::tenant)
    }

    pub fn is_system(&self) -> bool {
        matches!(self.inner, ScopeInner::System(_))
    }

    pub fn tenant_id(&self) -> Option<Uuid> {
        match self.inner {
            ScopeInner::Tenant(id) => Some(id),
            ScopeInner::System(_) => None,
        }
    }

    pub fn system_channel(&self) -> Option<SystemChannel> {
        match self.inner {
            ScopeInner::System(c) => Some(c),
            ScopeInner::Tenant(_) => None,
        }
    }

    /// 生成 SQL 谓词片段。
    ///
    /// - 租户通道：`"tenant_id = $4::uuid"`，调用方随后用
    ///   [`BindTenantScope::bind_tenant_scope`] 绑定该 UUID；
    /// - 系统通道：`"TRUE"` —— SQL 中**不存在**租户比较，也没有可被置空的参数。
    ///
    /// 约束：`placeholder` 必须是整条 SQL 中**最后一个**占位符。系统通道会整体去掉
    /// 该参数，若它后面还有 `$n+1` 之类的引用，Postgres 会因参数序号断档报错——这是
    /// 有意的 fail-closed：宁可在拼 SQL 时炸掉，也不要静默放行。
    pub fn sql_predicate(&self, column: &str, placeholder: &str) -> String {
        match self.inner {
            ScopeInner::Tenant(_) => format!("{column} = {placeholder}::uuid"),
            ScopeInner::System(_) => "TRUE".to_string(),
        }
    }

    /// 绑定租户参数（系统通道为空操作）。
    pub fn bind<'q>(
        &self,
        query: Query<'q, Postgres, PgArguments>,
    ) -> Query<'q, Postgres, PgArguments> {
        match self.inner {
            ScopeInner::Tenant(tenant) => {
                debug_assert!(!tenant.is_nil(), "TenantScope::Tenant 不允许 nil 租户");
                query.bind(tenant)
            }
            ScopeInner::System(_) => query,
        }
    }
}

/// 统一绑定入口：`query.bind_tenant_scope(&scope)`。
///
/// 对租户通道追加一个 UUID 参数；系统通道保持语句与参数不变。由于系统通道的 SQL
/// 已不含该占位符，这里不会出现"参数个数不一致"的静默错位。
pub trait BindTenantScope: Sized {
    fn bind_tenant_scope(self, scope: &TenantScope) -> Self;
}

impl<'q> BindTenantScope for Query<'q, Postgres, PgArguments> {
    fn bind_tenant_scope(self, scope: &TenantScope) -> Self {
        scope.bind(self)
    }
}

impl<'q, O> BindTenantScope for QueryAs<'q, Postgres, O, PgArguments> {
    fn bind_tenant_scope(self, scope: &TenantScope) -> Self {
        match scope.tenant_id() {
            Some(tenant) => self.bind(tenant),
            None => self,
        }
    }
}

impl<'q, O> BindTenantScope for QueryScalar<'q, Postgres, O, PgArguments> {
    fn bind_tenant_scope(self, scope: &TenantScope) -> Self {
        match scope.tenant_id() {
            Some(tenant) => self.bind(tenant),
            None => self,
        }
    }
}

static TENANT_SCOPE_SYSTEM: OnceLock<IntCounterVec> = OnceLock::new();

#[allow(clippy::expect_used)]
fn system_metric() -> &'static IntCounterVec {
    TENANT_SCOPE_SYSTEM.get_or_init(|| {
        register_int_counter_vec!(
            "topems_tenant_scope_system_total",
            "系统通道访问租户数据的次数（按通道来源与目标表）",
            &["channel", "table"]
        )
        .expect("failed to register topems_tenant_scope_system_total")
    })
}

/// 系统通道计数快照（供单测与运维观测，不参与业务判定）。
#[doc(hidden)]
pub fn system_channel_count(channel: SystemChannel, table: &str) -> u64 {
    system_metric()
        .with_label_values(&[channel.as_str(), table])
        .get()
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    fn claims(tenant: Option<&str>, superuser: bool, username: &str) -> Claims {
        Claims {
            sub: "123e4567-e89b-12d3-a456-426614174001".to_string(),
            username: username.to_string(),
            role: if username == "svc" { "service" } else { "user" }.to_string(),
            roles: vec![],
            permissions: vec![],
            is_superuser: superuser,
            exp: 9999999999,
            iat: 0,
            email: None,
            department: None,
            tenant_id: tenant.map(str::to_string),
            department_id: None,
            position_id: None,
            position_code: None,
            must_change_password: false,
        }
    }

    const TENANT: &str = "123e4567-e89b-12d3-a456-426614174000";

    #[test]
    fn tenant_rejects_nil() {
        let err = TenantScope::tenant(Uuid::nil()).expect_err("nil 租户必须报错");
        assert_eq!(err.0, 400);
    }

    #[test]
    fn require_tenant_rejects_missing_invalid_and_nil() {
        for (tenant, label) in [
            (None, "缺失"),
            (Some("garbage"), "非法"),
            (Some("00000000-0000-0000-0000-000000000000"), "nil"),
        ] {
            let c = claims(tenant, false, "user");
            let err = TenantScope::require_tenant(&c)
                .err()
                .unwrap_or_else(|| panic!("{label} 必须报错"));
            assert_eq!(err.0, 400, "{label}");
        }
    }

    #[test]
    fn require_tenant_is_tenant_channel() {
        let c = claims(Some(TENANT), false, "user");
        let scope = TenantScope::require_tenant(&c).expect("合法租户");
        assert!(!scope.is_system());
        assert_eq!(
            scope.tenant_id().map(|t| t.to_string()),
            Some(TENANT.to_string())
        );
    }

    #[test]
    fn from_claims_prefers_explicit_tenant_even_for_superuser() {
        let c = claims(Some(TENANT), true, "root");
        let scope = TenantScope::from_claims(&c, "test", "t").expect("合法");
        assert!(!scope.is_system(), "显式选择的租户优先于系统通道");
    }

    #[test]
    fn from_claims_superuser_without_tenant_uses_system() {
        let before = system_channel_count(SystemChannel::Superuser, "test_su_table");
        let c = claims(None, true, "root");
        let scope = TenantScope::from_claims(&c, "test", "test_su_table").expect("超管");
        assert_eq!(scope.system_channel(), Some(SystemChannel::Superuser));
        assert_eq!(
            system_channel_count(SystemChannel::Superuser, "test_su_table"),
            before + 1,
            "系统通道必须计数（可追溯性）"
        );
    }

    #[test]
    fn from_claims_service_uses_service_token_channel() {
        let before = system_channel_count(SystemChannel::ServiceToken, "test_svc_table");
        let c = claims(None, false, "svc");
        let scope = TenantScope::from_claims(&c, "test", "test_svc_table").expect("服务身份");
        assert_eq!(scope.system_channel(), Some(SystemChannel::ServiceToken));
        assert_eq!(
            system_channel_count(SystemChannel::ServiceToken, "test_svc_table"),
            before + 1
        );
    }

    #[test]
    fn from_claims_plain_user_without_tenant_fails_closed() {
        let c = claims(None, false, "user");
        let err = TenantScope::from_claims(&c, "test", "t").expect_err("必须 400");
        assert_eq!(err.0, 400);
    }

    #[test]
    fn sql_predicate_has_no_tenant_comparison_for_system() {
        let system = TenantScope::system(SystemChannel::ServiceToken, "test", "test_table");
        assert_eq!(system.sql_predicate("tenant_id", "$4"), "TRUE");
        assert!(!system
            .sql_predicate("tenant_id", "$4")
            .contains("tenant_id"));
    }

    #[test]
    fn sql_predicate_binds_tenant_column_for_tenant_channel() {
        let scope = TenantScope::tenant(Uuid::parse_str(TENANT).unwrap()).unwrap();
        assert_eq!(
            scope.sql_predicate("tenant_id", "$4"),
            "tenant_id = $4::uuid"
        );
        assert_eq!(
            scope.sql_predicate("i.tenant_id", "$5"),
            "i.tenant_id = $5::uuid"
        );
    }
}

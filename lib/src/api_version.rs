use axum::{
    extract::{Request, State},
    http::{HeaderValue, Uri},
    middleware::{self, Next},
    response::IntoResponse,
    routing::get,
    Router,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiVersionInfo {
    pub version: String,
    pub latest: bool,
    pub deprecated: bool,
    pub sunset_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiInfo {
    pub service_name: String,
    pub versions: Vec<ApiVersionInfo>,
    pub latest_version: String,
}

/// 创建一个版本化路由前缀
pub fn api_prefix(version: &str) -> String {
    format!("/api/{}", version)
}

/// 创建一个版本化的 API 路由
pub fn versioned_router<S: Clone + Send + Sync + 'static>(
    version: &str,
    router: Router<S>,
) -> Router<S> {
    let prefix = api_prefix(version);
    Router::new().nest(&prefix, router)
}

/// 创建一个默认的 API 路由，同时支持 v1 和 /api 前缀（为了向后兼容）
pub fn default_versioned_router<S: Clone + Send + Sync + 'static>(router: Router<S>) -> Router<S> {
    Router::new()
        // 主要的版本化路由
        .nest("/api/v1", router.clone())
        // 为了向后兼容，保留没有版本号的旧路径
        .nest("/api", router)
}

/// 创建 API 信息响应
pub fn create_api_info(service_name: &str) -> ApiInfo {
    ApiInfo {
        service_name: service_name.to_string(),
        versions: vec![ApiVersionInfo {
            version: "v1".to_string(),
            latest: true,
            deprecated: false,
            sunset_date: None,
        }],
        latest_version: "v1".to_string(),
    }
}

/// API 信息路由处理函数（无状态版本）
pub async fn get_api_info_handler(service_name: &'static str) -> impl IntoResponse {
    let api_info = create_api_info(service_name);
    axum::Json(api_info)
}

/// 创建 API 信息路由（无状态版本，适合合并到有状态路由）
pub fn create_api_info_router<S: Clone + Send + Sync + 'static>(
    service_name: &'static str,
) -> Router<S> {
    Router::new()
        .route("/api", get(move || get_api_info_handler(service_name)))
        .route("/api/info", get(move || get_api_info_handler(service_name)))
}

/// 给旧 alias 路由响应打 Deprecation/Warning 头 + WARN 日志
pub async fn deprecation_middleware(req: Request, next: Next) -> impl IntoResponse {
    let uri = req.uri().clone();
    tracing::warn!(target: "route_legacy", "DEPRECATED route called: {}", uri);
    let mut res = next.run(req).await;
    let headers = res.headers_mut();
    headers.insert("Deprecation", HeaderValue::from_static("true"));
    headers.insert(
        "Warning",
        HeaderValue::from_static(
            r#"299 - "Route with /v1 is deprecated, use path without /v1 per K8s ingress spec""#,
        ),
    );
    res
}

/// 为 Router 同时注册"新路径 + 若干旧 /v1 别名"，旧路径自动加 Deprecation 响应头和告警日志
pub fn register_routes_with_legacy_alias<S>(
    router: Router<S>,
    new_prefix: &str,
    legacy_prefixes: &[&str],
    inner: Router<S>,
) -> Router<S>
where
    S: Clone + Send + Sync + 'static,
{
    let mut r = router.nest(new_prefix, inner.clone());
    for legacy in legacy_prefixes {
        let deprecated = inner
            .clone()
            .layer(middleware::from_fn(deprecation_middleware));
        r = r.nest(legacy, deprecated);
    }
    r
}

// ============================
// URI 重写 + 旧路径弃用中间件
// 适用于服务内路由全部硬编码为全路径（如 /api/core/hrm/v1/...）的场景
// ============================

/// 路由兼容配置（供 from_fn_with_state 使用）
#[derive(Clone)]
pub struct RouteCompatConfig {
    /// 服务短名称，例如 "hrm", "erp", "iam"
    pub svc: &'static str,
    /// 内部硬编码的 base 前缀（不含 /v1），例如 "/api/core/hrm"
    pub internal_base: &'static str,
    /// 顶层 /api/v1 的快捷映射：(旧片段, 内部子路径片段)
    /// 例如 HRM: ("employees", "employees"), ("departments", "departments")
    pub shortcuts: &'static [(&'static str, &'static str)],
}

impl RouteCompatConfig {
    /// 显式构造 Group2 兼容配置，全部用 'static 字符串
    pub const fn new(
        svc: &'static str,
        internal_base: &'static str,
        shortcuts: &'static [(&'static str, &'static str)],
    ) -> Self {
        Self {
            svc,
            internal_base,
            shortcuts,
        }
    }
}

/// 分析 Group2 服务的传入路径，返回 (是否旧路径, 需要重写的目标 URI path)
/// - /api/{svc}/** → 新路径 (不是 legacy)，重写 /api/core/{svc}/v1/** 或 {internal_base}/v1/**
/// - /api/{svc}/v1/** → 旧路径 (legacy)，重写 {internal_base}/v1/**
/// - /api/core/{svc}/** → 旧路径 (legacy)，重写 {internal_base}/v1/**
/// - /api/core/{svc}/v1/** → 旧路径 (legacy)，不需重写
/// - /api/v1/{shortcut}/** → 旧路径 (legacy)，重写 {internal_base}/v1/{映射子路径}/**
fn analyze_group2_path<'a>(path: &'a str, cfg: &RouteCompatConfig) -> (bool, Option<String>) {
    let svc = cfg.svc;
    let new_prefix = format!("/api/{}/", svc);
    let new_v1_prefix = format!("/api/{}/v1/", svc);
    let core_prefix = format!("/api/core/{}/", svc);
    let core_v1_prefix = format!("/api/core/{}/v1/", svc);
    let internal_v1_base = format!("{}/v1", cfg.internal_base);

    // 精确 /api/{svc}/v1? query 也考虑
    // 1) 旧 /api/core/{svc}/v1/* → legacy: true, no rewrite needed (prefix equals internal_base)
    if path.starts_with(&core_v1_prefix) || path == format!("/api/core/{}/v1", svc) {
        return (true, None);
    }

    // 2) 新路径 /api/{svc}/v1/* → legacy: true, rewrite to /api/core/{svc}/v1/*
    if let Some(rest) = path.strip_prefix(&new_v1_prefix) {
        return (true, Some(format!("{}/{}", internal_v1_base, rest)));
    }
    if path == format!("/api/{}/v1", svc) {
        return (true, Some(internal_v1_base.clone()));
    }

    // 3) 旧路径 /api/core/{svc}/* (无 v1) → legacy: true, rewrite to {internal_base}/v1/*
    if let Some(rest) = path.strip_prefix(&core_prefix) {
        // 如果 rest 已经以 v1/ 开头理论上被 (1) 捕获了，这里不会到
        return (true, Some(format!("{}/{}", internal_v1_base, rest)));
    }
    if path == format!("/api/core/{}", svc) {
        return (true, Some(format!("{}/", internal_v1_base)));
    }

    // 4) 新路径 /api/{svc}/* (无 v1) → legacy: false, rewrite to {internal_base}/v1/*
    if let Some(rest) = path.strip_prefix(&new_prefix) {
        return (false, Some(format!("{}/{}", internal_v1_base, rest)));
    }
    if path == format!("/api/{}", svc) {
        return (false, Some(format!("{}/", internal_v1_base)));
    }

    // 5) /api/v1/{shortcut}/* → legacy top-level shortcuts
    for (old, new_seg) in cfg.shortcuts {
        let sc_prefix = format!("/api/v1/{}/", old);
        if let Some(rest) = path.strip_prefix(&sc_prefix) {
            return (
                true,
                Some(format!("{}/v1/{}/{}", cfg.internal_base, new_seg, rest)),
            );
        }
        if path == format!("/api/v1/{}", old) {
            return (true, Some(format!("{}/v1/{}/", cfg.internal_base, new_seg)));
        }
    }

    // 不匹配：保持原样，legacy=false (让现有 404 流程处理)
    (false, None)
}

/// Group2 服务的 URI 重写 + 旧路径弃用中间件
pub async fn group2_route_compat_middleware(
    State(cfg): State<Arc<RouteCompatConfig>>,
    mut req: Request,
    next: Next,
) -> impl IntoResponse {
    let original_path = req.uri().path().to_string();
    let (is_legacy, rewrite_target) = analyze_group2_path(&original_path, &cfg);

    if let Some(target_path) = rewrite_target {
        // 保留 query string
        let full_target = match req.uri().query() {
            Some(q) => format!("{}?{}", target_path, q),
            None => target_path,
        };
        if let Ok(new_uri) = Uri::try_from(full_target.as_str()) {
            *req.uri_mut() = new_uri;
        }
    }

    let mut res = next.run(req).await;

    if is_legacy {
        let headers = res.headers_mut();
        headers.insert("Deprecation", HeaderValue::from_static("true"));
        headers.insert(
            "Warning",
            HeaderValue::from_static(
                r#"299 - "Route with /v1 or /api/core/{svc} is deprecated, use /api/{svc}/ per K8s Ingress spec""#,
            ),
        );
        tracing::warn!(
            target: "route_legacy",
            service = cfg.svc,
            "DEPRECATED route used: {} (service={})",
            original_path,
            cfg.svc
        );
    }

    res
}

/// 便捷函数：为 Group2 服务 Router 包装一层兼容中间件
pub fn wrap_group2_router<S>(router: Router<S>, cfg: RouteCompatConfig) -> Router<S>
where
    S: Clone + Send + Sync + 'static,
{
    router.layer(middleware::from_fn_with_state(
        Arc::new(cfg),
        group2_route_compat_middleware,
    ))
}

// ============================
// Group1 (unified-core) 路由兼容：IAM/Flow/File 等模块
// 内 /api/core/{svc}/v1/** 硬编码前缀
// ============================

/// Group1 unified-core 路由兼容配置
#[derive(Clone)]
pub struct Group1CompatConfig {
    /// 模块名，如 "iam", "flow", "file", "mail", "im", "notification", "master", "migration", "comm"
    pub modules: &'static [&'static str],
    /// 顶层 /api/v1/* 下的快捷映射 (旧片段, 所属模块, 子路径片段)
    /// 例如 ("auth", "iam", "auth"), ("users", "iam", "users")
    pub shortcuts: &'static [(&'static str, &'static str, &'static str)],
}

fn analyze_group1_path<'a>(path: &'a str, cfg: &Group1CompatConfig) -> (bool, Option<String>) {
    for &mod_name in cfg.modules {
        let new_mod_prefix = format!("/api/core/{}/", mod_name); // e.g. /api/core/iam/
        let legacy_mod_prefix = format!("/api/core/{}/v1/", mod_name); // e.g. /api/core/iam/v1/
        let exact_new = format!("/api/core/{}", mod_name);
        let exact_legacy = format!("/api/core/{}/v1", mod_name);

        // 已经是 legacy 旧格式 /api/core/{mod}/v1/  →  legacy=true, 无需重写
        if path.starts_with(&legacy_mod_prefix) || path == exact_legacy {
            return (true, None);
        }

        // 新格式 /api/core/{mod}/ (无 v1) → legacy=false → 重写到 legacy v1 前缀
        if let Some(rest) = path.strip_prefix(&new_mod_prefix) {
            // 防止重复: 若 rest 以 "v1/" 开头理论上已捕获 legacy 分支
            return (false, Some(format!("/api/core/{}/v1/{}", mod_name, rest)));
        }
        if path == exact_new {
            return (false, Some(format!("/api/core/{}/v1/", mod_name)));
        }
    }

    // 顶层 /api/v1/{shortcut}/* 快捷映射
    for (old_seg, mod_name, new_seg) in cfg.shortcuts {
        let sc_prefix = format!("/api/v1/{}/", old_seg);
        if let Some(rest) = path.strip_prefix(&sc_prefix) {
            return (
                true,
                Some(format!("/api/core/{}/v1/{}/{}", mod_name, new_seg, rest)),
            );
        }
        let exact_sc = format!("/api/v1/{}", old_seg);
        if path == exact_sc {
            return (
                true,
                Some(format!("/api/core/{}/v1/{}/", mod_name, new_seg)),
            );
        }
    }

    (false, None)
}

pub async fn group1_route_compat_middleware(
    State(cfg): State<Arc<Group1CompatConfig>>,
    mut req: Request,
    next: Next,
) -> impl IntoResponse {
    let original_path = req.uri().path().to_string();
    let (is_legacy, rewrite_target) = analyze_group1_path(&original_path, &cfg);

    if let Some(target_path) = rewrite_target {
        let full_target = match req.uri().query() {
            Some(q) => format!("{}?{}", target_path, q),
            None => target_path,
        };
        if let Ok(new_uri) = Uri::try_from(full_target.as_str()) {
            *req.uri_mut() = new_uri;
        }
    }

    let mut res = next.run(req).await;

    if is_legacy {
        let headers = res.headers_mut();
        headers.insert("Deprecation", HeaderValue::from_static("true"));
        headers.insert(
            "Warning",
            HeaderValue::from_static(
                r#"299 - "Route with /v1 is deprecated, use /api/core/{module}/ path without /v1""#,
            ),
        );
        tracing::warn!(
            target: "route_legacy",
            service = "unified-core",
            "DEPRECATED route used in unified-core: {}",
            original_path
        );
    }

    res
}

pub fn wrap_group1_router<S>(router: Router<S>, cfg: Group1CompatConfig) -> Router<S>
where
    S: Clone + Send + Sync + 'static,
{
    router.layer(middleware::from_fn_with_state(
        Arc::new(cfg),
        group1_route_compat_middleware,
    ))
}

// ============ 默认配置工厂函数（Phase 2 接入 19 个服务时一行调用）============

use crate::service_port::GROUP1_MODULES;

/// 构造 Group 1 (unified-core) 推荐兼容层配置
///
/// 模块权威清单从 [crate::service_port::GROUP1_MODULES] 导入；
/// shortcuts 覆盖最常见的 top-level 短路径（旧系统 `/api/users`、`/api/workflows` 等）。
pub fn default_group1_config() -> Group1CompatConfig {
    Group1CompatConfig {
        modules: GROUP1_MODULES,
        shortcuts: &[
            ("auth", "iam", "auth"),
            ("users", "iam", "users"),
            ("roles", "iam", "roles"),
            ("permissions", "iam", "permissions"),
            ("tenants", "iam", "tenants"),
            ("depts", "iam", "depts"),
            ("workflows", "flow", "workflows"),
            ("tasks", "flow", "tasks"),
            ("approvals", "flow", "approvals"),
            ("approval-tasks", "flow", "approval-tasks"),
            ("instances", "flow", "instances"),
            ("templates", "flow", "templates"),
            ("files", "file", "files"),
            ("folders", "file", "folders"),
            ("upload", "file", "upload"),
            ("download", "file", "download"),
        ],
    }
}

/// 构造 Group 2 独立服务推荐兼容层配置
///
/// - `svc`：服务短名，如 `"hrm"` / `"crm"` / `"analytics"`
/// - `internal_base`：内部 handler 挂载前缀（固定 `/api/core/{svc}`）
/// - `shortcuts`：默认空；若某个服务真有顶层无模块前缀的 alias 需求，再用 [RouteCompatConfig::with_shortcuts] 追加
pub fn default_group2_config(svc: &'static str) -> RouteCompatConfig {
    let internal_base: &'static str = match svc {
        "erp" => "/api/core/erp",
        "finance" => "/api/core/finance",
        "doc" => "/api/core/doc",
        "ai" => "/api/core/ai",
        "hrm" => "/api/core/hrm",
        "pm" => "/api/core/pm",
        "crm" => "/api/core/crm",
        "mes" => "/api/core/mes",
        "pdm" => "/api/core/pdm",
        "scm" => "/api/core/scm",
        "wms" => "/api/core/wms",
        "srm" => "/api/core/srm",
        "qms" => "/api/core/qms",
        "lims" => "/api/core/lims",
        "ehs" => "/api/core/ehs",
        "rd" => "/api/core/rd",
        "bi" => "/api/core/bi",
        "report" => "/api/core/report",
        "monitor" => "/api/core/monitor",
        "portal" => "/api/core/portal",
        "mobile" => "/api/core/mobile",
        "gis" => "/api/core/gis",
        "integration" => "/api/core/integration",
        "analytics" => "/api/core/bi", // 别名：与 bi 共用 internal_base
        other => panic!(
            "default_group2_config: unsupported service '{}'. \
             Add to match arm in lib/src/api_version.rs:default_group2_config.",
            other
        ),
    };
    RouteCompatConfig::new(svc, internal_base, &[])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_api_prefix() {
        assert_eq!(api_prefix("v1"), "/api/v1");
        assert_eq!(api_prefix("v2"), "/api/v2");
    }

    #[test]
    fn test_create_api_info() {
        let info = create_api_info("test-service");
        assert_eq!(info.service_name, "test-service");
        assert_eq!(info.latest_version, "v1");
        assert!(!info.versions.is_empty());
    }

    #[test]
    fn test_deprecation_header_static_presence() {
        // 仅验证字符串构建无误
        let h = HeaderValue::from_static("true");
        assert_eq!(h, "true");
        let w = HeaderValue::from_static(
            r#"299 - "Route with /v1 is deprecated, use path without /v1 per K8s ingress spec""#,
        );
        assert!(w.to_str().unwrap().contains("299"));
    }

    #[test]
    fn test_legacy_prefix_count() {
        // 典型 Group1：/api/core/iam 配一个旧 alias
        let aliases = &["/api/core/iam/v1"];
        assert_eq!(aliases.len(), 1);
        // 典型 Group2 服务配 3 个 alias
        let aliases2 = &["/api/hrm/v1", "/api/core/hrm/v1", "/api/core/hrm"];
        assert_eq!(aliases2.len(), 3);
    }

    // ===== Phase 1 新增：默认配置工厂函数的单测 (A1 ~ A4) =====

    #[test]
    fn a1_default_group1_modules_count_matches_group1() {
        use crate::service_port::GROUP1_MODULES;
        let cfg = default_group1_config();
        assert_eq!(cfg.modules.len(), GROUP1_MODULES.len());
        assert_eq!(cfg.modules.len(), 9, "GROUP1_MODULES 权威清单应为 9 项");
    }

    #[test]
    fn a2_default_group2_hrm() {
        let cfg = default_group2_config("hrm");
        assert_eq!(cfg.svc, "hrm");
        assert_eq!(cfg.internal_base, "/api/core/hrm");
        // 默认不带 shortcuts
        assert_eq!(cfg.shortcuts.len(), 0);
    }

    #[test]
    fn a3_default_group2_analytics_alias_maps_to_bi() {
        let cfg = default_group2_config("analytics");
        assert_eq!(cfg.svc, "analytics");
        // analytics 与 bi 合并：internal_base 指向 /api/core/bi
        assert_eq!(cfg.internal_base, "/api/core/bi");
    }

    #[test]
    #[should_panic(expected = "unsupported service 'nonexist-svc-xyz'")]
    fn a4_default_group2_panic_on_unknown() {
        let _ = default_group2_config("nonexist-svc-xyz");
    }
}

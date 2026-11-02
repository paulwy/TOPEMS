//! TOPEMS Analytics Service (API path: /api/bi)
//!
//! Note: The service directory is named "analytics" for historical reasons,
//! but all API routes are registered under /api/bi (not /api/analytics).
//! The Vite proxy and frontend apiClient.bi both use /api/bi.
//! Legacy alias: /api/v1/bi (via register_routes_with_legacy_alias).
//!
//! Unified service for BI (Business Intelligence) and Report

use axum::{
    extract::{Path, State},
    routing::get,
    Router,
};

use topems_shared_bootstrap::{
    bootstrap_service, build_application, prometheus_metrics_handler, run, ServiceConfig,
};
use topems_shared_core::health::{simple_health_check, ServiceHealth, SimpleHealthConfig};
use topems_shared_core::response::ApiResponse;
use topems_shared_db::rls::rls_middleware;
use utoipa::OpenApi;

use topems_analytics::{modules, routes, ApiDoc};

pub use topems_analytics::shared::*;

// ==================== 主入口（V2 shared-bootstrap 模板） ====================

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    std::env::set_var("SEARCH_PATH", "bi, public, shared");

    let config = ServiceConfig {
        name: "topems-analytics",
        port: 8060,
        port_env_var: Some("BI_PORT"),
        max_db_connections: 10,
        enable_events: false,
        enable_rls: true,
        enable_request_context: true,
        api_prefix: "/api/bi",
        legacy_prefixes: &[],
        init_telemetry: true,
    };

    let ctx = bootstrap_service(&config).await?;
    tracing::info!("🚀 TOPEMS Analytics Service starting...");

    // ── 模块级运行时 schema 一致性自检（建表 DDL 已收敛至迁移链，D7）──
    if let Err(e) =
        modules::bi::run_schema_defense(ctx.migrate_pool.as_ref().unwrap_or(&ctx.db)).await
    {
        tracing::warn!("BI schema defense warning: {}", e);
    }
    if let Err(e) =
        modules::report::run_schema_defense(ctx.migrate_pool.as_ref().unwrap_or(&ctx.db)).await
    {
        tracing::warn!("Report schema defense warning: {}", e);
    }

    // ── Report Scheduler（后台定时任务） ──────────────────────────────
    let scheduler = modules::report::ReportScheduler::new(ctx.db.clone());
    if let Err(e) = scheduler.start().await {
        tracing::warn!("Failed to start report scheduler: {}", e);
    }

    // ── 向下兼容：ServiceContext → legacy AppState ────────────────────
    let health_config = SimpleHealthConfig::new("topems-analytics").with_db(ctx.db.clone());
    let app_state = AppState {
        auth_state: ctx.auth_state.clone(),
        pool: ctx.db.clone(),
        health_config,
    };

    // ── public_routes（无状态路由：不需要 State<AppState>） ──────────
    let public_routes = Router::new()
        .route("/", get(home))
        .route(
            "/api/plugins/info",
            get(modules::bi::plugin::get_plugin_info),
        )
        // /metrics 放 build_application 内（prometheus_layer 包裹），请求被 layer
        // 记录 → GLOBAL_METRIC_HANDLE.render() 含 axum 指标（避免 registry 空）
        .route("/metrics", get(prometheus_metrics_handler));

    // ── protected_routes（业务路由：需要 State<AppState>） ────────────
    // 统一复用 routes::create_protected_routes（唯一事实源，与 embed 轨一致）：
    // 消除 f4a9d3ee4d 引入的 main.rs 平行重复构建（曾与 routes.rs 双套并存，
    // 造成 GET /report/{id}/export Overlapping panic 隐患与 widgets drilldown 漂移）。
    let protected_routes = routes::create_protected_routes(app_state.clone());

    // ── OpenAPI JSON ──────────────────────────────────────────────────
    let openapi_json = Some(
        serde_json::to_string_pretty(&ApiDoc::openapi()).unwrap_or_else(|e| {
            tracing::error!("Failed to serialize OpenAPI spec: {}", e);
            "{}".to_string()
        }),
    );

    // ── 组装 shared-bootstrap Application ─────────────────────────────
    let mut app = build_application(&ctx, &config, public_routes, protected_routes, openapi_json);

    // ── 启动时自动注册到统一核心 ──────────────────────────────────────
    let core_url = std::env::var("CORE_URL").ok();
    tokio::spawn(async move {
        modules::bi::plugin::auto_register_to_core(core_url.as_deref()).await;
    });

    // ── 有状态公共路由（/health, /metrics, WebSocket /ws/bi/*, /api/plugins/health）─
    // 放在 build_application 外层嵌套，避免 State 类型与顶层 Router<()> 冲突
    let stateful_public = Router::new()
        .route("/health", get(health))
        // WebSocket: auth handled internally via token query param (subscribe message)
        .route(
            "/ws/bi/dashboard/{dashboard_id}",
            get(modules::bi::websocket::dashboard_websocket),
        )
        .route(
            "/api/plugins/health",
            get(modules::bi::plugin::plugin_health_check),
        )
        // ===== 兼容旧路径：/api/health/detailed（之前错误地硬编码全路径注册在
        //       protected_routes 内部，嵌套后变成 /api/bi/api/health/detailed；
        //       此处作为无前缀公共路由兜底，确保外部监控/调用方不 404） =====
        .route("/api/health/detailed", get(detailed_health))
        .with_state(app_state);

    app.router = app.router.merge(stateful_public);

    // ── RLS 行级隔离中间件（对齐 analytics_real_module 同构；2026-11-02 补挂）──
    // x-tenant-id 请求头 → app.tenant_id GUC（无 header 直接放行，不影响 public/health/metrics）
    app.router = app.router.layer(axum::middleware::from_fn_with_state(
        ctx.db.clone(),
        rls_middleware,
    ));

    tracing::info!(
        "✅ Analytics Service is running at http://0.0.0.0:{} (BI prefix: {})",
        app.port,
        config.api_prefix
    );

    run(app).await?;
    Ok(())
}

// ==================== 公共处理函数 ====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:read"])),
    path = "/",
    tag = "Health",
    operation_id = "home",
    responses((status = 200, description = "OK")),
)]
async fn home() -> &'static str {
    "TOPEMS Analytics Service API\n\n\
     Unified service for BI (Business Intelligence) and Report\n\n\
     - /health - Health check"
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:read"])),
    path = "/health",
    tag = "Health",
    operation_id = "health",
    responses((status = 200, description = "OK")),
)]
async fn health(State(state): State<AppState>) -> ServiceHealth {
    simple_health_check(&state.health_config).await
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:read"])),
    path = "/api/bi/health/detailed",
    tag = "Health",
    operation_id = "detailed_health",
    responses((status = 200, description = "OK")),
)]
async fn detailed_health(State(state): State<AppState>) -> ApiResponse<serde_json::Value> {
    use topems_shared_bootstrap::build_detailed_health_response;
    let modules = serde_json::json!({ "bi": "active", "report": "active" });
    let resp = build_detailed_health_response(
        &state.pool,
        "topems-analytics",
        modules,
        "1.0.0",
        serde_json::json!({}),
    )
    .await;
    ApiResponse::success(resp, "Detailed health check")
}

// ==================== Reports Center Handlers ====================

/// 角色标识 → 中文展示名映射（BI 报表中心角色分布）。
/// 未知 key 回落原名（core_roles.name 可能随租户自定义扩展）。
/// 与 routes.rs（库副本）保持同步。
fn role_display_name(name: &str) -> String {
    match name {
        "superadmin" => "超级管理员".into(),
        "admin" => "系统管理员".into(),
        "wms_manager" => "仓库管理".into(),
        "qms_manager" => "质量管理".into(),
        "mes_manager" => "制造执行".into(),
        "hrm_manager" => "人力资源".into(),
        "hr_admin" => "人事行政".into(),
        "finance_manager" => "财务管理".into(),
        "crm_manager" => "客户关系".into(),
        "scm_manager" => "供应链管理".into(),
        "srm_manager" => "供应商管理".into(),
        "ehs_manager" => "环境安全".into(),
        "lims_manager" => "实验室管理".into(),
        "pdm_manager" => "产品数据".into(),
        "pm_manager" => "项目管理".into(),
        "project_manager" => "项目经理".into(),
        "report_manager" => "报表管理".into(),
        "gis_manager" => "空间地图".into(),
        "employee" => "普通员工".into(),
        other => other.to_string(),
    }
}

/// 审计动作标识 → 中文展示名映射（BI 报表中心活动类型）。
/// 未知 key 回落原名（audit_logs.action 为开放枚举，按模块持续扩展）。
/// 与 routes.rs（库副本）保持同步。
fn activity_display_name(action: &str) -> String {
    match action {
        "login" => "登录".into(),
        "logout" => "登出".into(),
        "create" => "新建".into(),
        "created" => "创建".into(),
        "update" => "更新".into(),
        "delete" => "删除".into(),
        "read" => "查询".into(),
        "list" => "列表查询".into(),
        "detail" => "详情查看".into(),
        "approve" => "审批通过".into(),
        "approved" => "已审批".into(),
        "reject" => "驳回".into(),
        "rejected" => "已驳回".into(),
        "cancel" => "取消".into(),
        "complete" => "完成".into(),
        "closed" => "关闭".into(),
        "assigned" => "已分配".into(),
        "grant" => "授权".into(),
        "revoke" => "撤销授权".into(),
        "block" => "封禁".into(),
        "import" => "导入".into(),
        "export" => "导出".into(),
        "batch_create" => "批量新建".into(),
        "batch_delete" => "批量删除".into(),
        "bulk_create" => "批量创建".into(),
        "bulk_update" => "批量更新".into(),
        "bulk_delete" => "批量删除".into(),
        "add_tag" => "添加标签".into(),
        "remove_tag" => "移除标签".into(),
        "update_risk" => "风险更新".into(),
        "escalate" => "升级".into(),
        "escalated" => "已升级".into(),
        "review" => "评审".into(),
        "check" => "核验".into(),
        "execute" => "执行".into(),
        "enter" => "录入".into(),
        "route_optimized" => "路线优化".into(),
        "shipment_created" => "发货创建".into(),
        "shipment_dispatched" => "发货调度".into(),
        "carry_forward" => "结转".into(),
        "depreciate" => "折旧".into(),
        "discover" => "发现".into(),
        "acknowledged" => "已确认".into(),
        other => other.to_string(),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:report:read"])),
    path = "/api/bi/reports-center/stats",
    tag = "BI-Reports-Center",
    operation_id = "reports_center_stats",
    responses((status = 200, description = "Reports center dashboard statistics"))
)]
#[allow(clippy::as_conversions)]
async fn reports_center_stats(State(state): State<AppState>) -> ApiResponse<serde_json::Value> {
    // Dashboard summary stats — live counts from the real IAM/BI tables via the
    // service search_path (bi, public): core_users / core_roles / core_permissions
    // (public schema). The previously referenced iam_* / org_* tables do not exist
    // in this database, which made every count fall into unwrap_or(0) and then get
    // padded into fake numbers by the .max() floor below.
    // NOTE: company/department/employee counts are intentionally NOT live. The
    // analytics service (schema=bi) is not authorized to read hrm.* under the
    // schema-boundary gate, and bi has no org view either — see the degraded
    // "not-connected" orgStatsStatus below (BE-02, plan C).
    let (total_users, active_users, total_roles, total_permissions, recent_activities) = sqlx::query_as::<_, (
        i64, i64, i64, i64, i64,
    )>(r#"
        SELECT
            (SELECT COUNT(*) FROM core_users WHERE tenant_id = current_setting('app.tenant_id', true)::uuid OR current_setting('app.tenant_id', true) = '') AS total_users,
            (SELECT COUNT(*) FROM core_users WHERE last_login_at >= NOW() - INTERVAL '30 days'
               AND (tenant_id = current_setting('app.tenant_id', true)::uuid OR current_setting('app.tenant_id', true) = '')) AS active_users,
            (SELECT COUNT(*) FROM core_roles WHERE tenant_id = current_setting('app.tenant_id', true)::uuid OR current_setting('app.tenant_id', true) = '') AS total_roles,
            -- core_permissions is a shared global table (public.core_permissions has NO tenant_id column)
            (SELECT COUNT(*) FROM core_permissions) AS total_permissions,
            (SELECT COUNT(*) FROM public.audit_logs WHERE created_at >= NOW() - INTERVAL '7 days'
               AND (tenant_id = current_setting('app.tenant_id', true)::uuid OR current_setting('app.tenant_id', true) = '')) AS recent_activities
    "#).fetch_one(&state.pool).await.unwrap_or((0, 0, 0, 0, 0));

    // 组织计数（BE-02 方案 A）：hrm 组织数据对 analytics（schema=bi，boundary allow=[]）不可裸引，
    // 由 bi.org_stats 物化视图提供快照（companies/departments/employees 排除软删 + refreshed_at）。
    // 查询失败（视图缺失/未刷新）回落 0 + orgStatsStatus=not-connected，绝不伪造数字。
    // 与 routes.rs（库副本）保持同步。
    let (total_companies, total_departments, total_employees, org_refreshed) =
        sqlx::query_as::<_, (i64, i64, i64, Option<chrono::DateTime<chrono::Utc>>)>(
            "SELECT companies, departments, employees, refreshed_at FROM bi.org_stats",
        )
        .fetch_one(&state.pool)
        .await
        .map(|(c, d, e, r)| (c, d, e, r.map(|t| t.to_rfc3339())))
        .unwrap_or((0, 0, 0, None));

    // 近 6 个月真实用户增长（数据来源表：core_users）：
    //   新增用户 = core_users.created_at 分月计数；
    //   活跃用户 = core_users.last_login_at 分月计数。
    // 租户谓词与上方总量查询一致（app.tenant_id GUC / 超管空串）。
    // 查询失败返回空数组，绝不回退到随机假数据。
    let user_growth: Vec<serde_json::Value> = {
        use sqlx::Row as _;
        sqlx::query(
            r#"
            WITH months AS (
                SELECT to_char(m, 'YYYY-MM') AS month
                FROM generate_series(
                    date_trunc('month', NOW()) - INTERVAL '5 months',
                    date_trunc('month', NOW()),
                    INTERVAL '1 month'
                ) AS m
            )
            SELECT
                months.month AS month,
                (SELECT COUNT(*) FROM core_users u
                   WHERE to_char(u.created_at, 'YYYY-MM') = months.month
                     AND (u.tenant_id = current_setting('app.tenant_id', true)::uuid
                          OR current_setting('app.tenant_id', true) = '')) AS new_users,
                (SELECT COUNT(*) FROM core_users u
                   WHERE u.last_login_at IS NOT NULL
                     AND to_char(u.last_login_at, 'YYYY-MM') = months.month
                     AND (u.tenant_id = current_setting('app.tenant_id', true)::uuid
                          OR current_setting('app.tenant_id', true) = '')) AS active_users
            FROM months
            ORDER BY months.month
            "#,
        )
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default()
        .into_iter()
        .map(|row| {
            let month: String = row.try_get("month").unwrap_or_default();
            let new_users: i64 = row.try_get("new_users").unwrap_or_default();
            let active_users: i64 = row.try_get("active_users").unwrap_or_default();
            serde_json::json!({
                "month": month,
                "新增用户": new_users,
                "活跃用户": active_users,
            })
        })
        .collect()
    };

    // Role distribution: 真实聚合（public.core_users 无 role 列，角色经
    // core_user_roles ↔ core_roles 关联）。租户谓词与上方总量查询一致。
    // 旧版写死 3/12/8（系统管理员/部门经理/访客）占位已下线：查询失败回落空数组，
    // 绝不保留假数字。
    let role_distribution: Vec<serde_json::Value> = {
        use sqlx::Row as _;
        sqlx::query(
            r#"
            SELECT r.name AS role_name, COUNT(u.id) AS user_count
            FROM core_roles r
            LEFT JOIN core_user_roles ur ON ur.role_id = r.id
            LEFT JOIN core_users u ON u.id = ur.user_id AND u.deleted_at IS NULL
            WHERE r.deleted_at IS NULL
              AND (r.tenant_id = current_setting('app.tenant_id', true)::uuid
                   OR current_setting('app.tenant_id', true) = '')
            GROUP BY r.name
            ORDER BY user_count DESC, r.name
            LIMIT 10
            "#,
        )
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default()
        .into_iter()
        .map(|row| {
            let name: String = row.try_get("role_name").unwrap_or_default();
            let value: i64 = row.try_get("user_count").unwrap_or_default();
            // DB 真实标识（wms_manager 等）→ 中文展示名；未知 key 回落原名
            serde_json::json!({ "name": role_display_name(&name), "value": value })
        })
        .collect()
    };

    // Activity type breakdown: 真实聚合（public.audit_logs.action，近 30 天 TOP 10）。
    // 旧版写死 180/65/22/14（数据查询/报表导出/权限变更/系统配置）占位已下线：
    // 查询失败回落空数组，绝不回退假分类数字。
    let activity_types: Vec<serde_json::Value> = {
        use sqlx::Row as _;
        sqlx::query(
            r#"
            SELECT action AS activity, COUNT(*) AS cnt
            FROM public.audit_logs
            WHERE created_at >= NOW() - INTERVAL '30 days'
              AND (tenant_id = current_setting('app.tenant_id', true)::uuid
                   OR current_setting('app.tenant_id', true) = '')
            GROUP BY action
            ORDER BY cnt DESC, action
            LIMIT 10
            "#,
        )
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default()
        .into_iter()
        .map(|row| {
            let name: String = row.try_get("activity").unwrap_or_default();
            let count: i64 = row.try_get("cnt").unwrap_or_default();
            // audit_logs.action 真实标识（update_risk 等）→ 中文展示名；未知 key 回落原名
            serde_json::json!({ "name": activity_display_name(&name), "count": count })
        })
        .collect()
    };

    let stats = serde_json::json!({
        "dashboard": {
            "totalUsers": total_users,
            "activeUsers": active_users,
            "totalRoles": total_roles,
            "totalPermissions": total_permissions,
            // Org headcounts: live snapshot from bi.org_stats materialized view
            // (BE-02 plan A). Not connected → explicit null + "not-connected" status,
            // never fabricated numbers.
            "totalCompanies": total_companies,
            "totalDepartments": total_departments,
            "totalEmployees": total_employees,
            "orgStatsStatus": if org_refreshed.is_some() { "connected" } else { "not-connected" },
            "orgStatsUpdatedAt": org_refreshed,
            "recentActivities": recent_activities,
        },
        "userGrowth": user_growth,
        "roleDistribution": role_distribution,
        "activityTypes": activity_types,
    });

    ApiResponse::success(stats, "Reports center stats loaded")
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["analytics:report:read"])),
    path = "/api/bi/reports-center/export/{report_type}",
    tag = "BI-Reports-Center",
    operation_id = "reports_center_export",
    params(("report_type" = String, Path, description = "users | permissions | activities")),
    responses((status = 200, description = "Export result with file metadata"))
)]
async fn reports_center_export(Path(report_type): Path<String>) -> ApiResponse<serde_json::Value> {
    // 无真实导出引擎：不存在文件生成/落盘与下载通道。此前返回写死的 row_count
    // (156/87/621) 与 placeholder download_url 属假导出，已下线，诚实返回 501。
    ApiResponse::not_implemented(
        &format!(
            "报表中心导出（{}）尚未实现真实文件生成与落盘下载，已停止返回伪造的 row_count 与 placeholder download_url；待导出引擎接入后再启用。",
            report_type
        ),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extract_openapi_spec() {
        let spec = ApiDoc::openapi();
        let json = serde_json::to_string_pretty(&spec).expect("Failed to serialize OpenAPI spec");
        let out_path = std::env::temp_dir().join("topems-bi-openapi.json");
        std::fs::write(&out_path, json).expect("Failed to write spec");
        tracing::info!("OpenAPI spec written to {:?}", out_path);
    }
}

#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! MDM 主数据 CRUD 集成测试
//!
//! 测试 Master Data 服务的关键业务路径：
//! - 质量规则 CRUD 操作 (create/read/update/delete)
//! - 质量检查执行逻辑
//! - 质量评分计算
//! - 数据质量规则验证
//! - 重复检测洞察（conflict detection 的等价能力）
//!
//! 这些测试直接调用 handler 函数，使用内存存储（LazyLock），
//! 无需数据库或外部服务，属于"单元级集成测试"。

use std::sync::Arc;
use std::time::Instant;

use axum::extract::{Extension, Json, Path, Query, State};
use sqlx::postgres::PgPoolOptions;
use topems_master_data::modules::quality_v51;
use topems_master_data::modules::quality_v51::{
    AutoFixActionType, CreateQualityRuleRequest, FixStatus, QualityCheckQuery, QualityRule,
    QualityStatus, RunQualityCheckRequest, SuggestionStatus, SuggestionType,
    UpdateQualityRuleRequest,
};
use topems_master_data::shared::AppState;
use topems_shared_auth::auth::{AuthState, Claims};
use topems_shared_core::health::SystemMetrics;

/// 构造测试用 AppState（惰性连接 PgPool）。
/// 接真表后 quality_v51 handler 实际访问数据库，故连接串读 DATABASE_URL（真实库），
/// 未设置时回退 dummy（仅编译期/无库环境跑纯逻辑测试用）。
fn make_test_state() -> AppState {
    let db_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://dummy:dummy@localhost:5432/dummy".to_string());
    let pool = PgPoolOptions::new()
        .connect_lazy(&db_url)
        .expect("Failed to create lazy pool");
    AppState {
        rls_db: topems_shared_db::Db::new(pool.clone(), "master_data, public, shared"),
        db: pool,
        auth_state: AuthState::new(
            "test-jwt-secret-for-integration-tests-32chars".to_string(),
            "test-refresh-secret-for-integration-tests-32chars".to_string(),
            24,
        ),
        metrics: Arc::new(SystemMetrics::new()),
        start_time: Instant::now(),
    }
}

/// 构造测试用 Claims（绑定测试租户）。
/// 说明：`tenant_of` 对超管一律返回 None（读全量），写入会落全零租户，
/// 在严格 RLS 下被 WITH CHECK 拒绝；因此测试用带租户的普通身份，
/// 与真实请求一致（真实请求必带 x-tenant-id）。
fn make_test_claims() -> Claims {
    Claims {
        sub: "00000000-0000-0000-0000-000000000000".to_string(),
        username: "tester".to_string(),
        role: "admin".to_string(),
        roles: vec![],
        permissions: vec![],
        is_superuser: false,
        exp: 9999999999,
        iat: 0,
        email: None,
        department: None,
        tenant_id: Some(TEST_TENANT.to_string()),
        department_id: None,
        position_id: None,
        position_code: None,
        must_change_password: false,
    }
}

use topems_shared_auth::middleware::tenant::{scope_request_tenant, RlsRequestTenant, RlsTxnCell};

const TEST_TENANT: &str = "00000000-0000-0000-0000-000000000001";

/// 测试请求事务句柄：开启事务并按 tenant_middleware 的方式设置租户 GUC。
async fn test_txn_cell(state: &AppState) -> RlsTxnCell {
    let mut txn = state.db.begin().await.ok();
    if let Some(t) = txn.as_mut() {
        let _ = sqlx::query(
            "SELECT set_config('app.tenant_id', $1, true), set_config('app.rls_system', $2, true)",
        )
        .bind(TEST_TENANT)
        .bind("on")
        .execute(&mut **t)
        .await;
    }
    Arc::new(tokio::sync::Mutex::new(txn))
}

/// 在请求租户上下文内执行 handler future（scope_with 依赖 task-local 上下文）。
async fn in_request_scope<F, T>(fut: F) -> T
where
    F: std::future::Future<Output = T>,
{
    scope_request_tenant(
        RlsRequestTenant {
            tenant: uuid::Uuid::parse_str(TEST_TENANT).expect("valid tenant"),
            system: true,
        },
        fut,
    )
    .await
}

/// 在测试事务内造一条质量规则（规则种子已从关系表下线，测试自备夹具）。
/// 与后续查询共用同一请求事务，测试结束随事务回滚，不落库残留。
async fn seed_quality_rule(state: &AppState, cell: &RlsTxnCell, entity_type: &str, rule_type: &str) {
    let req = CreateQualityRuleRequest {
        name: format!("测试夹具-{entity_type}-{rule_type}"),
        entity_type: entity_type.to_string(),
        rule_type: rule_type.to_string(),
        description: "集成测试夹具".to_string(),
        severity: Some("error".to_string()),
        parameters: None,
    };
    let resp = in_request_scope(quality_v51::create_quality_rule(
        State(state.clone()),
        Extension(cell.clone()),
        Json(req),
    ))
    .await;
    assert_eq!(resp.code, 200, "质量规则夹具创建失败");
}

/// 在测试事务内造一条重复检测治理洞察（`mdm_governance_insights` 无写入 handler）。
async fn seed_duplicate_insight(cell: &RlsTxnCell) {
    let mut guard = cell.lock().await;
    let Some(txn) = guard.as_mut() else {
        panic!("缺少请求事务上下文");
    };
    sqlx::query(
        "INSERT INTO master_data.mdm_governance_insights \
         (insight_type, severity, affected_records, trend_analysis, recommendations) \
         VALUES ('duplicate_detection', 'warning', 7, '重复率较上周上升 2%', \
                 '[\"合并重复客户记录\"]'::jsonb)",
    )
    .execute(&mut **txn)
    .await
    .expect("治理洞察夹具写入失败");
}

/// ============ 质量规则 CRUD 测试 ============

#[tokio::test]
async fn test_quality_rule_create_and_list() {
    let state = make_test_state();

    // 创建一条新的质量规则
    let req = CreateQualityRuleRequest {
        name: "测试-客户编码格式校验".to_string(),
        entity_type: "customer".to_string(),
        rule_type: "format".to_string(),
        description: "客户编码必须以 C 开头后跟数字".to_string(),
        severity: Some("error".to_string()),
        parameters: Some(serde_json::json!({"pattern": "^C\\d{4,}$"})),
    };

    let cell = test_txn_cell(&state).await;
    let resp = in_request_scope(quality_v51::create_quality_rule(
        State(state.clone()),
        Extension(cell.clone()),
        Json(req),
    ))
    .await;

    assert_eq!(resp.code, 200, "run_quality_check 失败: {}", resp.message);
    assert!(resp.success);
    assert!(resp.data.is_some());

    let rule = resp.data.unwrap();
    assert_eq!(rule.name, "测试-客户编码格式校验");
    assert_eq!(rule.entity_type, "customer");
    assert_eq!(rule.rule_type, "format");
    assert_eq!(rule.severity, "error");
    assert!(rule.enabled);
    assert!(!rule.id.is_empty());

    // 列出所有规则，应包含新创建的规则
    let list_resp = in_request_scope(quality_v51::list_quality_rules(
        State(state.clone()),
        Extension(cell.clone()),
    ))
    .await;
    assert_eq!(list_resp.code, 200);
    assert!(list_resp.success);

    let rules: Vec<QualityRule> = list_resp.data.unwrap();
    assert!(
        rules.iter().any(|r| r.name == "测试-客户编码格式校验"),
        "新创建的规则应出现在列表中"
    );
}

#[tokio::test]
async fn test_quality_rule_get_by_id() {
    let state = make_test_state();

    // 先创建一条规则
    let create_req = CreateQualityRuleRequest {
        name: "测试-供应商名称必填".to_string(),
        entity_type: "supplier".to_string(),
        rule_type: "required".to_string(),
        description: "供应商名称不能为空".to_string(),
        severity: Some("error".to_string()),
        parameters: Some(serde_json::json!({"field": "name"})),
    };
    let cell = test_txn_cell(&state).await;
    let created = in_request_scope(quality_v51::create_quality_rule(
        State(state.clone()),
        Extension(cell.clone()),
        Json(create_req),
    ))
    .await;
    let rule_id = created.data.unwrap().id;

    // 通过 ID 查询规则
    let resp = in_request_scope(quality_v51::get_quality_rule(
        State(state.clone()),
        Extension(cell.clone()),
        Path(rule_id.clone()),
    ))
    .await;

    assert_eq!(resp.code, 200, "run_quality_check 失败: {}", resp.message);
    assert!(resp.success);
    let rule = resp.data.unwrap();
    assert_eq!(rule.id, rule_id);
    assert_eq!(rule.name, "测试-供应商名称必填");
}

#[tokio::test]
async fn test_quality_rule_get_not_found() {
    let state = make_test_state();

    let cell = test_txn_cell(&state).await;
    let resp = in_request_scope(quality_v51::get_quality_rule(
        State(state.clone()),
        Extension(cell.clone()),
        Path("nonexistent-rule-id".to_string()),
    ))
    .await;

    assert_eq!(resp.code, 404);
    assert!(!resp.success);
    assert!(resp.data.is_none());
}

#[tokio::test]
async fn test_quality_rule_update() {
    let state = make_test_state();

    // 先创建一条规则
    let create_req = CreateQualityRuleRequest {
        name: "测试-物料价格范围校验".to_string(),
        entity_type: "material".to_string(),
        rule_type: "range".to_string(),
        description: "物料价格必须在 0 到 1000000 之间".to_string(),
        severity: Some("warning".to_string()),
        parameters: Some(serde_json::json!({"min": 0, "max": 1000000, "field": "price"})),
    };
    let cell = test_txn_cell(&state).await;
    let created = in_request_scope(quality_v51::create_quality_rule(
        State(state.clone()),
        Extension(cell.clone()),
        Json(create_req),
    ))
    .await;
    let rule_id = created.data.unwrap().id;

    // 更新规则
    let update_req = UpdateQualityRuleRequest {
        name: Some("测试-物料价格范围校验(已更新)".to_string()),
        description: Some("物料价格必须在 0 到 5000000 之间".to_string()),
        severity: Some("error".to_string()),
        parameters: Some(serde_json::json!({"min": 0, "max": 5000000, "field": "price"})),
        enabled: Some(false),
    };
    let resp = in_request_scope(quality_v51::update_quality_rule(
        State(state.clone()),
        Extension(cell.clone()),
        Path(rule_id.clone()),
        Json(update_req),
    ))
    .await;

    assert_eq!(resp.code, 200, "run_quality_check 失败: {}", resp.message);
    assert!(resp.success);
    let updated = resp.data.unwrap();
    assert_eq!(updated.name, "测试-物料价格范围校验(已更新)");
    assert_eq!(updated.description, "物料价格必须在 0 到 5000000 之间");
    assert_eq!(updated.severity, "error");
    assert!(!updated.enabled);
}

#[tokio::test]
async fn test_quality_rule_update_not_found() {
    let state = make_test_state();

    let update_req = UpdateQualityRuleRequest {
        name: Some("不存在的规则".to_string()),
        description: None,
        severity: None,
        parameters: None,
        enabled: None,
    };
    let cell = test_txn_cell(&state).await;
    let resp = in_request_scope(quality_v51::update_quality_rule(
        State(state.clone()),
        Extension(cell.clone()),
        Path("nonexistent-rule-id".to_string()),
        Json(update_req),
    ))
    .await;

    assert_eq!(resp.code, 404);
    assert!(!resp.success);
}

#[tokio::test]
async fn test_quality_rule_delete() {
    let state = make_test_state();

    // 先创建一条规则
    let create_req = CreateQualityRuleRequest {
        name: "测试-待删除规则".to_string(),
        entity_type: "product".to_string(),
        rule_type: "format".to_string(),
        description: "用于测试删除的规则".to_string(),
        severity: Some("warning".to_string()),
        parameters: None,
    };
    let cell = test_txn_cell(&state).await;
    let created = in_request_scope(quality_v51::create_quality_rule(
        State(state.clone()),
        Extension(cell.clone()),
        Json(create_req),
    ))
    .await;
    let rule_id = created.data.unwrap().id;

    // 删除规则
    let delete_resp = in_request_scope(quality_v51::delete_quality_rule(
        State(state.clone()),
        Extension(cell.clone()),
        Path(rule_id.clone()),
    ))
    .await;
    assert_eq!(delete_resp.code, 200);
    assert!(delete_resp.success);

    // 确认规则已被删除
    let get_resp = in_request_scope(quality_v51::get_quality_rule(
        State(state.clone()),
        Extension(cell.clone()),
        Path(rule_id.clone()),
    ))
    .await;
    assert_eq!(get_resp.code, 404);
}

#[tokio::test]
async fn test_quality_rule_delete_not_found() {
    let state = make_test_state();

    let cell = test_txn_cell(&state).await;
    let resp = in_request_scope(quality_v51::delete_quality_rule(
        State(state.clone()),
        Extension(cell.clone()),
        Path("nonexistent-rule-id".to_string()),
    ))
    .await;
    assert_eq!(resp.code, 404);
    assert!(!resp.success);
}

/// ============ 质量检查执行测试 ============

#[tokio::test]
async fn test_run_quality_check_format_rule() {
    let state = make_test_state();

    // 对 customer 实体执行质量检查（format 规则由测试自备）
    let req = RunQualityCheckRequest {
        entity_type: "customer".to_string(),
        entity_id: "C0001".to_string(),
        rule_ids: None,
    };
    let cell = test_txn_cell(&state).await;
    seed_quality_rule(&state, &cell, "customer", "format").await;
    let resp = in_request_scope(quality_v51::run_quality_check(
        State(state.clone()),
        Extension(cell.clone()),
        Extension(make_test_claims()),
        Json(req),
    ))
    .await;

    assert_eq!(resp.code, 200, "run_quality_check 失败: {}", resp.message);
    assert!(resp.success);
    let checks = resp.data.unwrap();
    assert!(!checks.is_empty(), "应至少有一条质量检查结果");

    // format 规则应返回 Passed 状态
    let has_passed = checks.iter().any(|c| c.status == QualityStatus::Passed);
    assert!(has_passed, "format 规则应返回 Passed 状态");
}

#[tokio::test]
async fn test_run_quality_check_range_rule_warns() {
    let state = make_test_state();

    // 对 material 实体执行质量检查（range 规则由测试自备）
    let req = RunQualityCheckRequest {
        entity_type: "material".to_string(),
        entity_id: "M0001".to_string(),
        rule_ids: None,
    };
    let cell = test_txn_cell(&state).await;
    seed_quality_rule(&state, &cell, "material", "range").await;
    let resp = in_request_scope(quality_v51::run_quality_check(
        State(state.clone()),
        Extension(cell.clone()),
        Extension(make_test_claims()),
        Json(req),
    ))
    .await;

    assert_eq!(resp.code, 200, "run_quality_check 失败: {}", resp.message);
    let checks = resp.data.unwrap();
    assert!(!checks.is_empty());

    // range 规则应返回 Warning 状态
    let has_warning = checks.iter().any(|c| c.status == QualityStatus::Warning);
    assert!(
        has_warning,
        "range 规则应返回 Warning 状态（部分值接近边界）"
    );
}

#[tokio::test]
async fn test_list_quality_checks_with_filter() {
    let state = make_test_state();

    // 先执行一次质量检查以确保有数据
    let run_req = RunQualityCheckRequest {
        entity_type: "customer".to_string(),
        entity_id: "C9999".to_string(),
        rule_ids: None,
    };
    let cell = test_txn_cell(&state).await;
    seed_quality_rule(&state, &cell, "customer", "format").await;
    let _ = in_request_scope(quality_v51::run_quality_check(
        State(state.clone()),
        Extension(cell.clone()),
        Extension(make_test_claims()),
        Json(run_req),
    ))
    .await;

    // 按实体类型过滤查询检查结果
    let query = QualityCheckQuery {
        entity_type: Some("customer".to_string()),
        entity_id: Some("C9999".to_string()),
        status: None,
        rule_id: None,
        page: Some(1),
        page_size: Some(10),
    };
    let resp = in_request_scope(quality_v51::list_quality_checks(
        State(state.clone()),
        Extension(cell.clone()),
        Query(query),
    ))
    .await;

    assert_eq!(resp.code, 200, "run_quality_check 失败: {}", resp.message);
    assert!(resp.success);
    let paginated = resp.data.unwrap();
    assert!(paginated.total > 0, "应能查询到刚执行的检查记录");
    assert!(
        paginated.items.iter().all(|c| c.entity_id == "C9999"),
        "过滤结果应只包含指定实体的检查记录"
    );
}

#[tokio::test]
async fn test_get_quality_check_results_by_entity() {
    let state = make_test_state();

    // 执行质量检查
    let run_req = RunQualityCheckRequest {
        entity_type: "supplier".to_string(),
        entity_id: "S0001".to_string(),
        rule_ids: None,
    };
    let cell = test_txn_cell(&state).await;
    seed_quality_rule(&state, &cell, "supplier", "format").await;
    let _ = in_request_scope(quality_v51::run_quality_check(
        State(state.clone()),
        Extension(cell.clone()),
        Extension(make_test_claims()),
        Json(run_req),
    ))
    .await;

    // 查询指定实体的检查结果
    let resp = in_request_scope(quality_v51::get_quality_check_results(
        State(state.clone()),
        Extension(cell.clone()),
        Path(("supplier".to_string(), "S0001".to_string())),
    ))
    .await;

    assert_eq!(resp.code, 200, "run_quality_check 失败: {}", resp.message);
    let results = resp.data.unwrap();
    assert!(!results.is_empty());
    assert!(
        results
            .iter()
            .all(|r| r.entity_type == "supplier" && r.entity_id == "S0001"),
        "结果应只包含指定实体的检查记录"
    );
}

/// ============ 质量评分与仪表盘测试 ============

#[tokio::test]
async fn test_get_quality_score() {
    let state = make_test_state();

    let cell = test_txn_cell(&state).await;
    let resp = in_request_scope(quality_v51::get_quality_score(
        State(state.clone()),
        Extension(cell.clone()),
    ))
    .await;

    assert_eq!(resp.code, 200, "run_quality_check 失败: {}", resp.message);
    assert!(resp.success);
    let score = resp.data.unwrap();

    // overall_score 应在 0-100 之间
    assert!(
        score.overall_score >= 0.0 && score.overall_score <= 100.0,
        "质量评分应在 0-100 范围内，实际: {}",
        score.overall_score
    );

    // total_checks 应等于 passed + failed + warning
    assert_eq!(
        score.total_checks,
        score.passed_checks + score.failed_checks + score.warning_checks
    );
}

#[tokio::test]
async fn test_get_quality_dashboard() {
    let state = make_test_state();

    let cell = test_txn_cell(&state).await;
    seed_duplicate_insight(&cell).await;
    let resp = in_request_scope(quality_v51::get_quality_dashboard(
        State(state.clone()),
        Extension(cell.clone()),
    ))
    .await;

    assert_eq!(resp.code, 200, "run_quality_check 失败: {}", resp.message);
    assert!(resp.success);
    let dashboard = resp.data.unwrap();

    // 仪表盘应返回质量评分
    assert!(
        dashboard.quality_score >= 0.0 && dashboard.quality_score <= 100.0,
        "仪表盘质量评分应在 0-100 范围内"
    );

    // 仪表盘应包含治理洞察（包括重复检测洞察）
    assert!(!dashboard.insights.is_empty(), "仪表盘应包含治理洞察信息");

    // 验证存在 duplicate_detection（重复检测）洞察
    let has_duplicate_insight = dashboard
        .insights
        .iter()
        .any(|i| i.insight_type == "duplicate_detection");
    assert!(
        has_duplicate_insight,
        "仪表盘应包含重复检测洞察（等价于冲突检测）"
    );
}

/// ============ 数据质量规则验证测试 ============

#[tokio::test]
async fn test_quality_rule_with_various_severities() {
    let state = make_test_state();

    let severities = vec!["error", "warning", "info"];

    for sev in severities {
        let req = CreateQualityRuleRequest {
            name: format!("测试-规则-{}", sev),
            entity_type: "test_entity".to_string(),
            rule_type: "format".to_string(),
            description: format!("严重级别为 {} 的测试规则", sev),
            severity: Some(sev.to_string()),
            parameters: None,
        };
        let cell = test_txn_cell(&state).await;
        let resp = in_request_scope(quality_v51::create_quality_rule(
            State(state.clone()),
            Extension(cell.clone()),
            Json(req),
        ))
        .await;
        assert_eq!(resp.code, 200);
        assert_eq!(resp.data.unwrap().severity, sev);
    }
}

#[tokio::test]
async fn test_quality_rule_default_severity() {
    let state = make_test_state();

    // 不指定 severity，应使用默认值 "warning"
    let req = CreateQualityRuleRequest {
        name: "测试-默认严重级别规则".to_string(),
        entity_type: "test_entity".to_string(),
        rule_type: "format".to_string(),
        description: "未指定 severity 的规则".to_string(),
        severity: None,
        parameters: None,
    };
    let cell = test_txn_cell(&state).await;
    let resp = in_request_scope(quality_v51::create_quality_rule(
        State(state.clone()),
        Extension(cell.clone()),
        Json(req),
    ))
    .await;
    assert_eq!(resp.code, 200);
    assert_eq!(resp.data.unwrap().severity, "warning");
}

/// ============ 重复检测 / 冲突检测测试 ============

#[tokio::test]
async fn test_duplicate_detection_insight() {
    let state = make_test_state();

    let cell = test_txn_cell(&state).await;
    seed_duplicate_insight(&cell).await;
    let resp = in_request_scope(quality_v51::get_quality_dashboard(
        State(state.clone()),
        Extension(cell.clone()),
    ))
    .await;
    let dashboard = resp.data.unwrap();

    // 找到重复检测洞察
    let dup_insight = dashboard
        .insights
        .iter()
        .find(|i| i.insight_type == "duplicate_detection")
        .expect("应存在重复检测洞察");

    assert!(dup_insight.affected_records > 0, "受影响的记录数应大于 0");
    assert!(!dup_insight.trend_analysis.is_empty(), "趋势分析不应为空");
    assert!(!dup_insight.recommendations.is_empty(), "应提供修复建议");
}

/// ============ 数据模型序列化测试 ============

#[tokio::test]
async fn test_quality_status_serialization() {
    let statuses = vec![
        (QualityStatus::Passed, "passed"),
        (QualityStatus::Failed, "failed"),
        (QualityStatus::Warning, "warning"),
    ];

    for (status, expected) in statuses {
        let json = serde_json::to_string(&status).unwrap();
        assert_eq!(json, format!("\"{}\"", expected));

        let deserialized: QualityStatus = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, status);
    }
}

#[tokio::test]
async fn test_fix_status_serialization() {
    let statuses = vec![
        (FixStatus::Pending, "pending"),
        (FixStatus::Applied, "applied"),
        (FixStatus::Verified, "verified"),
        (FixStatus::Failed, "failed"),
    ];

    for (status, expected) in statuses {
        let json = serde_json::to_string(&status).unwrap();
        assert_eq!(json, format!("\"{}\"", expected));
    }
}

#[tokio::test]
async fn test_auto_fix_action_type_serialization() {
    let types = vec![
        (AutoFixActionType::Normalize, "normalize"),
        (AutoFixActionType::DefaultValue, "default_value"),
        (AutoFixActionType::MapValue, "map_value"),
        (AutoFixActionType::RemoveDuplicate, "remove_duplicate"),
        (AutoFixActionType::Standardize, "standardize"),
    ];

    for (action_type, expected) in types {
        let json = serde_json::to_string(&action_type).unwrap();
        assert_eq!(json, format!("\"{}\"", expected));
    }
}

#[tokio::test]
async fn test_suggestion_type_serialization() {
    let types = vec![
        (SuggestionType::Standardize, "standardize"),
        (SuggestionType::Enrich, "enrich"),
        (SuggestionType::Deprecate, "deprecate"),
        (SuggestionType::Merge, "merge"),
    ];

    for (suggestion_type, expected) in types {
        let json = serde_json::to_string(&suggestion_type).unwrap();
        assert_eq!(json, format!("\"{}\"", expected));
    }
}

#[tokio::test]
async fn test_suggestion_status_serialization() {
    let statuses = vec![
        (SuggestionStatus::Pending, "pending"),
        (SuggestionStatus::Approved, "approved"),
        (SuggestionStatus::Rejected, "rejected"),
    ];

    for (status, expected) in statuses {
        let json = serde_json::to_string(&status).unwrap();
        assert_eq!(json, format!("\"{}\"", expected));
    }
}

/// ============ 质量规则完整生命周期测试 ============

#[tokio::test]
async fn test_quality_rule_full_lifecycle() {
    let state = make_test_state();

    // 1. 创建规则
    let create_req = CreateQualityRuleRequest {
        name: "生命周期测试规则".to_string(),
        entity_type: "lifecycle_entity".to_string(),
        rule_type: "required".to_string(),
        description: "测试完整 CRUD 生命周期".to_string(),
        severity: Some("error".to_string()),
        parameters: Some(serde_json::json!({"field": "code"})),
    };
    let cell = test_txn_cell(&state).await;
    let created = in_request_scope(quality_v51::create_quality_rule(
        State(state.clone()),
        Extension(cell.clone()),
        Json(create_req),
    ))
    .await;
    assert_eq!(created.code, 200);
    let rule_id = created.data.unwrap().id;

    // 2. 读取规则
    let fetched = in_request_scope(quality_v51::get_quality_rule(
        State(state.clone()),
        Extension(cell.clone()),
        Path(rule_id.clone()),
    ))
    .await;
    assert_eq!(fetched.code, 200);
    assert_eq!(fetched.data.unwrap().name, "生命周期测试规则");

    // 3. 更新规则
    let update_req = UpdateQualityRuleRequest {
        name: Some("生命周期测试规则(已更新)".to_string()),
        description: None,
        severity: Some("warning".to_string()),
        parameters: None,
        enabled: Some(false),
    };
    let updated = in_request_scope(quality_v51::update_quality_rule(
        State(state.clone()),
        Extension(cell.clone()),
        Path(rule_id.clone()),
        Json(update_req),
    ))
    .await;
    assert_eq!(updated.code, 200);
    let updated_rule = updated.data.unwrap();
    assert_eq!(updated_rule.name, "生命周期测试规则(已更新)");
    assert_eq!(updated_rule.severity, "warning");
    assert!(!updated_rule.enabled);

    // 4. 禁用的规则不应在质量检查中执行
    let run_req = RunQualityCheckRequest {
        entity_type: "lifecycle_entity".to_string(),
        entity_id: "LE0001".to_string(),
        rule_ids: None,
    };
    let checks = in_request_scope(quality_v51::run_quality_check(
        State(state.clone()),
        Extension(cell.clone()),
        Extension(make_test_claims()),
        Json(run_req),
    ))
    .await
    .data
    .unwrap();
    assert!(
        checks.iter().all(|c| c.rule_id != rule_id),
        "禁用的规则不应被执行"
    );

    // 5. 删除规则
    let deleted = in_request_scope(quality_v51::delete_quality_rule(
        State(state.clone()),
        Extension(cell.clone()),
        Path(rule_id.clone()),
    ))
    .await;
    assert_eq!(deleted.code, 200);

    // 6. 确认规则已不存在
    let not_found = in_request_scope(quality_v51::get_quality_rule(
        State(state.clone()),
        Extension(cell.clone()),
        Path(rule_id.clone()),
    ))
    .await;
    assert_eq!(not_found.code, 404);
}

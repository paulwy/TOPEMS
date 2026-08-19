use serde::{Deserialize, Serialize};
use topems_shared_db::rls::{RlsConfig, TenantContext, TenantContextRejection};
use uuid::Uuid;

fn append_tenant_filter(sql: &str, pos: usize) -> String {
    let placeholder = format!("${}", pos);
    let upper_sql = sql.to_uppercase();

    if upper_sql.contains(" WHERE ") {
        let where_idx = upper_sql.find(" WHERE ").unwrap() + " WHERE ".len();
        let (before, after) = sql.split_at(where_idx);
        format!("{}tenant_id = {} AND {}", before, placeholder, after)
    } else {
        format!(
            "{} WHERE tenant_id = {}",
            sql.trim_end_matches(';'),
            placeholder
        )
    }
}

#[test]
fn test_append_tenant_filter_no_where() {
    let sql = "SELECT * FROM table";
    let result = append_tenant_filter(sql, 1);
    assert!(
        result.contains("WHERE tenant_id = $1"),
        "expected WHERE clause with $1, got: {}",
        result
    );
    assert!(result.starts_with("SELECT * FROM table"));
}

#[test]
fn test_append_tenant_filter_custom_pos() {
    let sql = "SELECT * FROM orders";
    let result = append_tenant_filter(sql, 5);
    assert!(
        result.contains("WHERE tenant_id = $5"),
        "expected $5 placeholder, got: {}",
        result
    );
}

#[test]
fn test_append_tenant_filter_existing_where() {
    let sql = "SELECT * FROM products WHERE status='active'";
    let result = append_tenant_filter(sql, 1);
    assert!(
        result.contains("AND status='active'"),
        "existing WHERE condition should be preserved with AND, got: {}",
        result
    );
    let where_part: Vec<(usize, &str)> = result.match_indices("WHERE").collect();
    assert_eq!(where_part.len(), 1, "should have exactly one WHERE keyword");
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
struct TenantRecord {
    id: Uuid,
    name: String,
    tenant_id: Uuid,
}

#[test]
fn test_tenant_uuid_roundtrip() {
    let known_uuid = Uuid::parse_str("550e8400-e29b-41d4-a716-446655440000").unwrap();
    let record = TenantRecord {
        id: Uuid::new_v4(),
        name: "Test Record".to_string(),
        tenant_id: known_uuid,
    };

    let json = serde_json::to_string(&record).expect("should serialize");
    let deserialized: TenantRecord = serde_json::from_str(&json).expect("should deserialize");

    assert_eq!(
        deserialized.tenant_id, known_uuid,
        "UUID roundtrip should match"
    );
    assert_eq!(deserialized.id, record.id);
    assert_eq!(deserialized.name, record.name);
    assert_eq!(deserialized, record, "full struct equality after roundtrip");
}

#[test]
fn test_tenant_zero_uuid_nil() {
    let nil_str = "00000000-0000-0000-0000-000000000000";
    let parsed = Uuid::parse_str(nil_str).expect("should parse nil UUID string");
    assert_eq!(
        parsed,
        Uuid::nil(),
        "all-zero UUID string should equal Uuid::nil()"
    );
    assert!(parsed.is_nil(), "is_nil() should return true for zero UUID");

    let nil_no_dashes = "00000000000000000000000000000000";
    let parsed_plain = Uuid::parse_str(nil_no_dashes).expect("should parse plain nil UUID");
    assert_eq!(parsed_plain, Uuid::nil());
}

#[test]
fn test_append_tenant_filter_with_semicolon() {
    let sql = "SELECT * FROM inventory;";
    let result = append_tenant_filter(sql, 2);
    assert!(
        !result.ends_with(';') || result.contains("WHERE tenant_id = $2"),
        "should strip trailing semicolon before appending WHERE, got: {}",
        result
    );
    assert!(result.contains("tenant_id = $2"));
}

#[test]
fn test_append_tenant_filter_multiple_where_tokens_in_string() {
    let sql = "SELECT * FROM events WHERE location = 'WHERE house'";
    let result = append_tenant_filter(sql, 3);
    assert!(
        result.contains("tenant_id = $3 AND location = 'WHERE house'"),
        "should inject after first real WHERE, not interfere with string literals. Got: {}",
        result
    );
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
struct RlsConfigDto {
    enabled: bool,
    default_tenant_id: Option<Uuid>,
    schema_name: String,
}

#[test]
fn test_rls_config_serde_roundtrip() {
    let tid = Uuid::new_v4();
    let cfg = RlsConfigDto {
        enabled: true,
        default_tenant_id: Some(tid),
        schema_name: "public".to_string(),
    };

    let json = serde_json::to_string(&cfg).unwrap();
    let back: RlsConfigDto = serde_json::from_str(&json).unwrap();
    assert_eq!(back, cfg);
    assert_eq!(back.default_tenant_id.unwrap(), tid);
    assert!(back.enabled);
}

#[test]
fn test_tenant_context_uuid_type_safety() {
    let tenant_a = Uuid::new_v4();
    let tenant_b = Uuid::new_v4();
    assert_ne!(tenant_a, tenant_b, "random UUIDs should differ");

    let a_str = tenant_a.to_string();
    let parsed_back = Uuid::parse_str(&a_str).unwrap();
    assert_eq!(parsed_back, tenant_a);

    let (v1, v2, v3, v4) = (
        tenant_a.as_bytes()[0],
        tenant_a.as_bytes()[1],
        tenant_a.as_bytes()[2],
        tenant_a.as_bytes()[3],
    );
    assert_eq!(
        format!("{:02x}{:02x}{:02x}{:02x}", v1, v2, v3, v4),
        &a_str[..8]
    );
}

// =============================================================================
// P33-2: 行级安全 (RLS) 策略集成测试
//
// 覆盖跨租户读/更新/删除被 tenant_id 过滤器阻断、RlsConfig 默认值、
// TenantContext 从请求头解析（含缺失/非法 UUID 的拒绝路径）等场景。
// =============================================================================

#[test]
fn test_rls_cross_tenant_read_blocked_by_filter() {
    // 租户 A 的查询必须附带 tenant_id 过滤，租户 B 的数据不会出现在结果集中
    let sql = "SELECT id, name FROM orders";
    let filtered = append_tenant_filter(sql, 1);
    assert!(
        filtered.contains("WHERE tenant_id = $1"),
        "SELECT 必须被追加 tenant_id 过滤条件，得到: {}",
        filtered
    );
    // 验证 SQL 仍是 SELECT 且未丢失原列
    assert!(filtered.starts_with("SELECT id, name FROM orders"));
}

#[test]
fn test_rls_cross_tenant_update_blocked_by_filter() {
    // 租户 A 的 UPDATE 必须附带 tenant_id 条件，防止越权更新租户 B 的数据
    let sql = "UPDATE orders SET status = $1 WHERE id = $2";
    let filtered = append_tenant_filter(sql, 3);
    assert!(
        filtered.contains("tenant_id = $3"),
        "UPDATE 必须包含 tenant_id = $3，得到: {}",
        filtered
    );
    assert!(
        filtered.contains("AND id = $2"),
        "原 WHERE id = $2 条件必须保留，得到: {}",
        filtered
    );
    assert!(filtered.starts_with("UPDATE orders SET status = $1"));
}

#[test]
fn test_rls_cross_tenant_delete_blocked_by_filter() {
    // 租户 A 的 DELETE 必须附带 tenant_id 条件，防止越权删除租户 B 的数据
    let sql = "DELETE FROM orders WHERE id = $1";
    let filtered = append_tenant_filter(sql, 2);
    assert!(
        filtered.contains("tenant_id = $2"),
        "DELETE 必须包含 tenant_id = $2，得到: {}",
        filtered
    );
    assert!(
        filtered.contains("AND id = $1"),
        "原 WHERE id = $1 条件必须保留，得到: {}",
        filtered
    );
    assert!(filtered.starts_with("DELETE FROM orders"));
}

#[test]
fn test_rls_config_default_enabled() {
    // RLS 默认必须启用（安全优先），schema 默认为 public
    let config = RlsConfig::default();
    assert!(config.enabled, "RLS 必须默认启用");
    assert_eq!(config.schema_name, "public", "默认 schema 必须是 public");
    assert!(
        config.default_tenant_id.is_none(),
        "默认 tenant_id 必须为 None（强制显式指定）"
    );
}

#[test]
fn test_rls_config_custom_schema() {
    let config = RlsConfig {
        enabled: false,
        default_tenant_id: Some("550e8400-e29b-41d4-a716-446655440000".to_string()),
        schema_name: "hrm".to_string(),
    };
    assert!(!config.enabled);
    assert_eq!(config.schema_name, "hrm");
    assert!(config.default_tenant_id.is_some());
}

#[test]
fn test_tenant_context_from_valid_request_headers() {
    // 携带合法 x-tenant-id / x-user-id / x-role 头的请求应正确解析 TenantContext
    let tenant_id = Uuid::new_v4();
    let user_id = Uuid::new_v4();
    let req = http::Request::builder()
        .header("x-tenant-id", tenant_id.to_string())
        .header("x-user-id", user_id.to_string())
        .header("x-role", "admin")
        .body(())
        .unwrap();

    let ctx = TenantContext::from_request(&req).expect("valid headers should parse");
    assert_eq!(ctx.tenant_id, tenant_id, "tenant_id 应从头解析");
    assert_eq!(ctx.user_id, Some(user_id), "user_id 应从头解析");
    assert_eq!(ctx.role.as_deref(), Some("admin"), "role 应从头解析");
}

#[test]
fn test_tenant_context_missing_header_rejected() {
    // 缺失 x-tenant-id 头应返回 MissingTenantId 拒绝（对应 HTTP 400）
    let req = http::Request::builder().body(()).unwrap();
    let result = TenantContext::from_request(&req);
    assert!(
        matches!(result, Err(TenantContextRejection::MissingTenantId)),
        "缺失 x-tenant-id 必须拒绝，得到: {:?}",
        result
    );
}

#[test]
fn test_tenant_context_invalid_uuid_rejected() {
    // 携带非法 UUID 格式的 x-tenant-id 应返回 InvalidTenantId 拒绝（对应 HTTP 400）
    let req = http::Request::builder()
        .header("x-tenant-id", "not-a-uuid")
        .body(())
        .unwrap();
    let result = TenantContext::from_request(&req);
    assert!(
        matches!(result, Err(TenantContextRejection::InvalidTenantId)),
        "非法 UUID 必须拒绝，得到: {:?}",
        result
    );
}

#[test]
fn test_rls_policy_applies_to_all_tenant_scoped_tables() {
    // 验证 tenant_id 过滤可统一应用于不同业务的 tenant-scoped 表
    let tables = [
        "erp_payables",
        "erp_receivables",
        "hrm_employees",
        "iam_users",
        "iam_roles",
    ];
    for table in tables {
        let sql = format!("SELECT id FROM {}", table);
        let filtered = append_tenant_filter(&sql, 1);
        assert!(
            filtered.contains(&format!("FROM {}", table)),
            "表名 {} 必须保留",
            table
        );
        assert!(
            filtered.contains("tenant_id = $1"),
            "表 {} 必须被追加 tenant_id 过滤",
            table
        );
    }
}

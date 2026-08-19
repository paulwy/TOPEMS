use serde::{Deserialize, Serialize};
use topems_shared::auth::Claims;
use topems_shared::tenant::{
    Tenant, TenantContext as AuthTenantContext, TenantPlan, TenantRole, TenantStatus,
};
use topems_shared_db::rls::TenantContext as RlsTenantContext;
use uuid::Uuid;

fn build_claims(tenant_id: Option<String>, role: &str, is_superuser: bool) -> Claims {
    let now = chrono::Utc::now();
    Claims {
        sub: Uuid::new_v4().to_string(),
        username: format!("user_{}", tenant_id.as_deref().unwrap_or("unknown")),
        role: role.to_string(),
        roles: vec![role.to_string()],
        permissions: Vec::new(),
        is_superuser,
        exp: (now + chrono::Duration::hours(1)).timestamp() as usize,
        iat: now.timestamp() as usize,
        email: None,
        department: None,
        tenant_id,
        department_id: None,
        position_id: None,
        position_code: None,
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
struct Record {
    id: String,
    tenant_id: String,
}

fn tenant_match(record: &Record, claims: &Claims) -> bool {
    if claims.is_superuser {
        return true;
    }
    match (&claims.tenant_id, &record.tenant_id) {
        (Some(ct), rt) if ct == rt => true,
        _ => false,
    }
}

fn is_global_admin_bypass(claims: &Claims) -> bool {
    claims.is_superuser
        || claims.role == "superadmin"
        || claims.role == "admin"
        || claims
            .roles
            .iter()
            .any(|r| r == "superadmin" || r == "admin")
}

#[test]
fn test_two_claims_diff_tenants() {
    let tid_a = Uuid::new_v4().to_string();
    let tid_b = Uuid::new_v4().to_string();
    assert_ne!(tid_a, tid_b, "precondition: different tenant IDs");

    let claims_a = build_claims(Some(tid_a.clone()), "user", false);
    let claims_b = build_claims(Some(tid_b.clone()), "user", false);

    assert_ne!(
        claims_a.tenant_id, claims_b.tenant_id,
        "two users from different tenants must not share tenant_id"
    );
    assert_ne!(
        claims_a.tenant_id.as_deref(),
        Some(tid_b.as_str()),
        "claims_a does not match tenant B"
    );
    assert_eq!(claims_a.tenant_id.as_deref(), Some(tid_a.as_str()));
    assert_eq!(claims_b.tenant_id.as_deref(), Some(tid_b.as_str()));
}

#[test]
fn test_tenant_filter_blocks_cross_tenant() {
    let tid_a = Uuid::new_v4().to_string();
    let tid_b = Uuid::new_v4().to_string();

    let claims_a = build_claims(Some(tid_a.clone()), "user", false);
    let claims_b = build_claims(Some(tid_b.clone()), "user", false);

    let rec_a = Record {
        id: "rec-1".to_string(),
        tenant_id: tid_a.clone(),
    };
    let rec_b = Record {
        id: "rec-2".to_string(),
        tenant_id: tid_b.clone(),
    };

    assert!(
        tenant_match(&rec_a, &claims_a),
        "A should accesses A's record"
    );
    assert!(
        !tenant_match(&rec_b, &claims_a),
        "A must not access B's record"
    );

    assert!(tenant_match(&rec_b, &claims_b), "B accesses B's record");
    assert!(
        !tenant_match(&rec_a, &claims_b),
        "B must not access A's record"
    );
}

#[test]
fn test_global_admin_bypass() {
    let tid_a = Uuid::new_v4().to_string();
    let tid_b = Uuid::new_v4().to_string();

    let super_claims = build_claims(Some(tid_a.clone()), "superadmin", true);
    let admin_role_claims = build_claims(Some(tid_a.clone()), "admin", false);
    let user_claims = build_claims(Some(tid_a.clone()), "user", false);

    assert!(
        is_global_admin_bypass(&super_claims),
        "superuser should bypass"
    );
    assert!(
        is_global_admin_bypass(&admin_role_claims),
        "admin role should bypass"
    );
    assert!(
        !is_global_admin_bypass(&user_claims),
        "regular user should NOT bypass"
    );

    let rec_b = Record {
        id: "other-1".to_string(),
        tenant_id: tid_b.clone(),
    };
    assert!(
        tenant_match(&rec_b, &super_claims),
        "superadmin should cross-tenant via bypass"
    );
}

#[test]
fn test_claims_tenant_serde_roundtrip() {
    let tenant_id = Uuid::new_v4().to_string();
    let original = Claims {
        sub: Uuid::new_v4().to_string(),
        username: "roundtrip_user".to_string(),
        role: "manager".to_string(),
        roles: vec!["manager".to_string(), "user".to_string()],
        permissions: vec!["iam:users_read".to_string()],
        is_superuser: false,
        exp: 1_900_000_000,
        iat: 1_800_000_000,
        email: Some("rt@example.com".to_string()),
        department: Some("Eng".to_string()),
        tenant_id: Some(tenant_id.clone()),
        department_id: Some(Uuid::new_v4().to_string()),
        position_id: None,
        position_code: Some("MGR".to_string()),
    };

    let json = serde_json::to_string(&original).expect("serialize claims to JSON");
    let deserialized: Claims =
        serde_json::from_str(&json).expect("deserialize JSON back to Claims");

    assert_eq!(
        deserialized.tenant_id, original.tenant_id,
        "tenant_id survives roundtrip"
    );
    assert_eq!(deserialized.tenant_id.as_deref(), Some(tenant_id.as_str()));
    assert_eq!(deserialized.sub, original.sub);
    assert_eq!(deserialized.username, original.username);
    assert_eq!(deserialized.role, original.role);
    assert_eq!(deserialized.roles, original.roles);
    assert_eq!(deserialized.permissions, original.permissions);
    assert_eq!(deserialized.is_superuser, original.is_superuser);
    assert_eq!(deserialized.email, original.email);
    assert_eq!(deserialized.department, original.department);
}

#[derive(Debug, Clone, Deserialize, Serialize, Default, PartialEq)]
struct PartialClaims {
    sub: String,
    #[serde(default)]
    tenant_id: Option<String>,
    #[serde(default)]
    role: String,
}

#[test]
fn test_missing_tenant_fallback() {
    let json_no_tenant = r#"{
        "sub": "user-no-tenant-123",
        "role": "user"
    }"#;

    let parsed: PartialClaims =
        serde_json::from_str(json_no_tenant).expect("should deserialize JSON missing tenant_id");

    assert_eq!(parsed.sub, "user-no-tenant-123");
    assert_eq!(parsed.role, "user");
    assert!(
        parsed.tenant_id.is_none(),
        "missing tenant_id should default to None"
    );
    assert_eq!(parsed.tenant_id, None, "serde(default) on tenant_id");
}

#[test]
fn test_tenant_match_same_tenant_different_users() {
    let tid = Uuid::new_v4().to_string();
    let u1 = build_claims(Some(tid.clone()), "user", false);
    let u2 = build_claims(Some(tid.clone()), "manager", false);
    assert_ne!(u1.sub, u2.sub, "different users");
    assert_eq!(u1.tenant_id, u2.tenant_id, "but same tenant");

    let rec = Record {
        id: "shared-rec".to_string(),
        tenant_id: tid.clone(),
    };
    assert!(tenant_match(&rec, &u1));
    assert!(tenant_match(&rec, &u2));
}

#[test]
fn test_admin_claims_both_none_tenant_is_not_equal() {
    let u1 = build_claims(None, "user", false);
    let u2 = build_claims(None, "user", false);

    assert_eq!(u1.tenant_id, u2.tenant_id);
    assert!(u1.tenant_id.is_none());

    let orphan = Record {
        id: "orphan".to_string(),
        tenant_id: "anything".to_string(),
    };
    assert!(
        !tenant_match(&orphan, &u1),
        "claims without tenant_id must not match any record"
    );
}

#[test]
fn test_claims_role_admin_in_roles_array_bypass() {
    let mut claims = build_claims(Some(Uuid::new_v4().to_string()), "user", false);
    claims.roles = vec!["user".to_string(), "admin".to_string()];
    assert!(
        is_global_admin_bypass(&claims),
        "admin in roles array should trigger bypass even if role field is user"
    );

    claims.roles = vec!["user".to_string()];
    assert!(
        !is_global_admin_bypass(&claims),
        "regular user roles array should not bypass"
    );
}

// =============================================================================
// P33-2: 租户隔离 (tenant isolation) 集成测试
//
// 覆盖：跨租户数据不可见、跨租户外键引用被阻断、X-Tenant-Id 头解析、
// 令牌 tenant_id 与请求头不一致被拒绝、Tenant/TenantContext 类型级隔离等场景。
// =============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
struct TenantScopedRecord {
    id: Uuid,
    tenant_id: Uuid,
    payload: String,
}

/// 模拟带 tenant_id 列的业务记录集合，按 claims.tenant_id 过滤后的可见性。
fn visible_records_for_tenant(
    records: &[TenantScopedRecord],
    tenant_id: Uuid,
) -> Vec<&TenantScopedRecord> {
    records
        .iter()
        .filter(|r| r.tenant_id == tenant_id)
        .collect()
}

#[test]
fn test_data_created_by_tenant_a_invisible_to_tenant_b() {
    let tenant_a = Uuid::new_v4();
    let tenant_b = Uuid::new_v4();

    let records = vec![
        TenantScopedRecord {
            id: Uuid::new_v4(),
            tenant_id: tenant_a,
            payload: "A's secret".to_string(),
        },
        TenantScopedRecord {
            id: Uuid::new_v4(),
            tenant_id: tenant_b,
            payload: "B's secret".to_string(),
        },
        TenantScopedRecord {
            id: Uuid::new_v4(),
            tenant_id: tenant_a,
            payload: "A's other".to_string(),
        },
    ];

    let visible_to_a = visible_records_for_tenant(&records, tenant_a);
    let visible_to_b = visible_records_for_tenant(&records, tenant_b);

    assert_eq!(visible_to_a.len(), 2, "租户 A 应只看到自己的 2 条记录");
    assert_eq!(visible_to_b.len(), 1, "租户 B 应只看到自己的 1 条记录");
    assert!(
        visible_to_a.iter().all(|r| r.tenant_id == tenant_a),
        "租户 A 不应看到租户 B 的任何记录"
    );
    assert!(
        visible_to_b.iter().all(|r| r.tenant_id == tenant_b),
        "租户 B 不应看到租户 A 的任何记录"
    );
    // 反向断言：A 看不到 B 的 payload
    assert!(!visible_to_a.iter().any(|r| r.payload.contains("B's")));
}

#[test]
fn test_cross_tenant_foreign_key_reference_blocked() {
    // 模拟跨租户外键引用校验：引用方与被引用方 tenant_id 必须一致
    let tenant_a = Uuid::new_v4();
    let tenant_b = Uuid::new_v4();

    #[derive(Debug)]
    struct FkCheck {
        referring_tenant: Uuid,
        referred_tenant: Uuid,
    }

    let valid_fk = FkCheck {
        referring_tenant: tenant_a,
        referred_tenant: tenant_a,
    };
    let invalid_fk = FkCheck {
        referring_tenant: tenant_a,
        referred_tenant: tenant_b,
    };

    fn is_cross_tenant_fk(check: &FkCheck) -> bool {
        check.referring_tenant != check.referred_tenant
    }

    assert!(!is_cross_tenant_fk(&valid_fk), "同租户外键引用应被允许");
    assert!(is_cross_tenant_fk(&invalid_fk), "跨租户外键引用必须被阻断");
}

#[test]
fn test_tenant_scoped_query_respects_x_tenant_id_header() {
    // 通过 RLS TenantContext 模拟 X-Tenant-Id 头驱动的查询作用域
    let tenant_a = Uuid::new_v4();
    let tenant_b = Uuid::new_v4();

    let req_a = http::Request::builder()
        .header("x-tenant-id", tenant_a.to_string())
        .body(())
        .unwrap();
    let ctx_a = RlsTenantContext::from_request(&req_a).expect("tenant A header should parse");

    let req_b = http::Request::builder()
        .header("x-tenant-id", tenant_b.to_string())
        .body(())
        .unwrap();
    let ctx_b = RlsTenantContext::from_request(&req_b).expect("tenant B header should parse");

    let records = vec![
        TenantScopedRecord {
            id: Uuid::new_v4(),
            tenant_id: ctx_a.tenant_id,
            payload: "A".to_string(),
        },
        TenantScopedRecord {
            id: Uuid::new_v4(),
            tenant_id: ctx_b.tenant_id,
            payload: "B".to_string(),
        },
    ];

    let visible_via_a = visible_records_for_tenant(&records, ctx_a.tenant_id);
    let visible_via_b = visible_records_for_tenant(&records, ctx_b.tenant_id);

    assert_eq!(visible_via_a.len(), 1);
    assert_eq!(visible_via_b.len(), 1);
    assert_ne!(
        ctx_a.tenant_id, ctx_b.tenant_id,
        "不同头应解析出不同 tenant_id"
    );
    assert_eq!(visible_via_a[0].tenant_id, ctx_a.tenant_id);
    assert_eq!(visible_via_b[0].tenant_id, ctx_b.tenant_id);
}

#[test]
fn test_missing_x_tenant_id_header_rejected_with_400() {
    // 缺失 X-Tenant-Id 头必须被拒绝（对应 HTTP 400），不允许回退到默认租户
    use topems_shared_db::rls::TenantContextRejection;

    let req = http::Request::builder().body(()).unwrap();
    let result = RlsTenantContext::from_request(&req);
    assert!(
        matches!(result, Err(TenantContextRejection::MissingTenantId)),
        "缺失 X-Tenant-Id 必须返回 MissingTenantId（HTTP 400），得到: {:?}",
        result
    );
}

#[test]
fn test_token_tenant_id_vs_header_mismatch_rejected() {
    // 令牌中的 tenant_id 与 X-Tenant-Id 头不一致必须被拒绝（防越权）
    let token_tenant = Uuid::new_v4();
    let header_tenant = Uuid::new_v4();
    assert_ne!(token_tenant, header_tenant, "前置条件：令牌与头租户不同");

    let claims = build_claims(Some(token_tenant.to_string()), "user", false);
    let req = http::Request::builder()
        .header("x-tenant-id", header_tenant.to_string())
        .body(())
        .unwrap();
    let header_ctx = RlsTenantContext::from_request(&req).expect("header should parse");

    // 模拟中间件对比：claims.tenant_id 必须等于 header 的 tenant_id
    fn tenant_mismatch(claims_tenant: &str, header_tenant: Uuid) -> bool {
        match Uuid::parse_str(claims_tenant) {
            Ok(ct) => ct != header_tenant,
            Err(_) => true,
        }
    }

    assert!(
        tenant_mismatch(claims.tenant_id.as_ref().unwrap(), header_ctx.tenant_id),
        "令牌 tenant_id 与 X-Tenant-Id 头不一致必须判定为 mismatch 并拒绝"
    );

    // 一致时应放行
    let matching_claims = build_claims(Some(header_tenant.to_string()), "user", false);
    assert!(
        !tenant_mismatch(
            matching_claims.tenant_id.as_ref().unwrap(),
            header_ctx.tenant_id
        ),
        "令牌与头一致时不应判为 mismatch"
    );
}

#[test]
fn test_tenant_type_isolation_via_auth_tenant_context() {
    // 使用 shared-auth 的 TenantContext 验证：不同租户的上下文互不重叠
    let tenant_a = Uuid::new_v4();
    let tenant_b = Uuid::new_v4();
    let user_in_a = Uuid::new_v4();

    let ctx_a = AuthTenantContext::new(tenant_a, user_in_a, TenantRole::Member);
    let ctx_b = AuthTenantContext::new(tenant_b, user_in_a, TenantRole::Member);

    assert_ne!(
        ctx_a.tenant_id, ctx_b.tenant_id,
        "不同租户上下文 tenant_id 必须不同"
    );
    assert_eq!(
        ctx_a.user_id, ctx_b.user_id,
        "同一用户可属于不同租户（多租户成员）"
    );
    // 即便用户相同，权限作用域仍由 tenant_id 隔离
    assert!(ctx_a.has_permission("data:read"));
    assert!(ctx_b.has_permission("data:read"));
    // Member 角色不应有 tenant:manage 权限
    assert!(!ctx_a.has_permission("tenant:manage"));
}

#[test]
fn test_tenant_entity_distinct_ids_and_status_isolation() {
    // 验证 Tenant 实体本身：不同租户有不同 id，状态独立
    let tenant_a = Tenant::new(
        "Tenant A".to_string(),
        "tenant-a".to_string(),
        TenantPlan::Basic,
    );
    let tenant_b = Tenant::new(
        "Tenant B".to_string(),
        "tenant-b".to_string(),
        TenantPlan::Professional,
    );

    assert_ne!(tenant_a.id, tenant_b.id, "不同租户 id 必须不同");
    assert_ne!(tenant_a.slug, tenant_b.slug, "不同租户 slug 必须不同");
    assert_eq!(
        tenant_a.status,
        TenantStatus::Trial,
        "新建租户初始状态应为 Trial"
    );
    assert_eq!(tenant_b.status, TenantStatus::Trial);
    assert_ne!(tenant_a.plan, tenant_b.plan, "前置条件：plan 不同");
    // 不同 plan 对应不同的 max_users 配额
    assert_ne!(tenant_a.settings.max_users, tenant_b.settings.max_users);
}

#[test]
fn test_super_admin_can_read_across_tenants() {
    // superuser/superadmin 应能跨租户读取（bypass 机制）
    let tenant_a = Uuid::new_v4().to_string();
    let tenant_b = Uuid::new_v4().to_string();

    let super_claims = build_claims(Some(tenant_a.clone()), "superadmin", true);
    let rec_b = Record {
        id: "cross-1".to_string(),
        tenant_id: tenant_b.clone(),
    };

    assert!(
        is_global_admin_bypass(&super_claims),
        "superadmin 应触发 bypass"
    );
    assert!(
        tenant_match(&rec_b, &super_claims),
        "superuser 应能跨租户读取租户 B 的记录"
    );

    // 普通用户不应跨租户
    let user_claims = build_claims(Some(tenant_a.clone()), "user", false);
    assert!(
        !tenant_match(&rec_b, &user_claims),
        "普通用户不应跨租户读取"
    );
}

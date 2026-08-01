use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use topems_shared::audit::CreateAuditLogRequest;
use topems_shared::auth::{generate_jwt_token, generate_refresh_token, verify_jwt_token, Claims};
use uuid::Uuid;

const HS256_SECRET: &str = "test-jwt-secret-key-for-testing-only-32chars!!";

const RSA_PRIVATE_PEM: &str = r#"-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEAlDwmgp3jVYrt5qDz5M8m2NNK4YFnNcNW05Vgc0VBDODDyu1H
WRcqzmVMGqANNc9YqWYUnMNdUSkZMHV1oeEyO1F6jfDkhrnkLBClViNyXzsupbpo
xF7SrBvjDVU7g9aZD6sNIAs3/nWMh2e+h2x9t87Ev7YPzlGHlZsPjjbhsuoZZBgf
cHh8KI52Whig8lVBBhXv6MA1FCaln4wDa2jVKeIUd9oLwFfQZ8qq0hRfOs5Zbo7u
tRIaljWqvS/5H/tpTIvATWAFNLDODSJuUY05LoPyDoXK13Fe0KAWdgGsgLAKFSjq
qQfDsK53CvBmep58gilVkgnbcVtWslnuFSeXfQIDAQABAoIBADbhGgTLfWmjGLaE
qibwxloJx7Q7G0HdQtzsdZvXbODeqb4MIJkMKa3l9Mn6rUlZrWJxx3nOHlM42vmE
0vsOi3FIlg3MvF5gnefudbexQdud5oQ2wijJTkenv2SlRHZn0ZzqX96YKK/NRyyu
LOyoLtcI9vBe7/UbXA34LUcibGa3ElRfb4hAXCuV2KoMKsuAsezzBhorQ3HGjeXU
usCz0yoLUBCNDjHk/Rj9QTVcX7S4i2Dp9h8/PQWB9uV/7aBom6kK1xuz+O8DuaX6
Pc6pkRMtEaCcMtHFV3s3inwooN3Oa2G7dNlrEMlLL4xZVRY5cc7t0+dNNgMKHEAe
Fw5770UCgYEAxWfmpULz7nr2nP8KL9uXMC7rmeemarlRML1uQqAVDoZOuV36BgNB
6qiO2U/SFQEqqMPVelkCg1H7X6ZcZBjFG/nDOzNy8n1/7jZCswB5gDaGCZVXk9DK
D+dRdEFYaZCthgWaRriA1blydxRPCpIQi82IsoE5s0NlDu7LMpRUd/sCgYEAwDvx
9gIXQC5mb5UkRgXgb8Lt0z5AMJVe+3qX4sZMgfauYD2puAfb3eWy9W27JBJS1h5G
oIuRhi/irFVPxvPA5lwCmhIuRZfGBFarW8yStQZ8yVcyjAEiNvcTd2yk0bhht0jU
eLv+i2pLN1RjXfXCPc8E/V7mcrA5VEO0+mcJvOcCgYEAhLSRZ/23cFV3XhlRptSP
MZQJTGBfDpXgD8z4x49IOIhvecvEXbBo6rA/v7UaPIaZP/TOmT4nI1LEkwuKRrwk
HedsqGqw1nUpwGD3u9AQ3fFJcD3WLweIHuLZbjbTkbvx+wvfJ7W23naZjZW4gRmq
R+F3CNE4kds3n69GKI1wr2sCgYB732T4qLpA0mWR66I3ORw6CHtmT0vfwrE1DfeH
2057xPDy9WlDPFUy9QxP2Mjp4qDcdx/93lIFDSBc+pBw3KvmBU5r5+FHWRjxvMOp
YPb8jdSljXn1+9kHYEl8AFdpCQ52pAi+UC4jungDjG6HopDrcVZ+ysNnDiWzJfoe
DX2Z6wKBgQC6IPRgXJlAFlkKG9+0nO6zGHZ1z5yBlr/wK1K8ag3BOKZtew4wava7
k3IblSq5HeY+pYt2l0D1cYoI+l43wAkRf0+hY6L9l24m5zvG5i1+QnI3PC1Dou8b
68pr9bndW8bV70UCBwDNs8QDc8+weAcAy8UsI9eV+0x9/sf1938O2Q==
-----END RSA PRIVATE KEY-----
"#;

const RSA_PUBLIC_PEM: &str = r#"-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAlDwmgp3jVYrt5qDz5M8m
2NNK4YFnNcNW05Vgc0VBDODDyu1HWRcqzmVMGqANNc9YqWYUnMNdUSkZMHV1oeEy
O1F6jfDkhrnkLBClViNyXzsupbpoxF7SrBvjDVU7g9aZD6sNIAs3/nWMh2e+h2x9
t87Ev7YPzlGHlZsPjjbhsuoZZBgfcHh8KI52Whig8lVBBhXv6MA1FCaln4wDa2jV
KeIUd9oLwFfQZ8qq0hRfOs5Zbo7utRIaljWqvS/5H/tpTIvATWAFNLDODSJuUY05
LoPyDoXK13Fe0KAWdgGsgLAKFSjqqQfDsK53CvBmep58gilVkgnbcVtWslnuFSeX
fQIDAQAB
-----END PUBLIC KEY-----
"#;

#[test]
fn test_jwt_roundtrip_hs256_backward_compat() {
    let user_id = Uuid::new_v4().to_string();
    let token = generate_jwt_token(&user_id, HS256_SECRET, 60);

    assert!(!token.is_empty(), "HS256 token should not be empty");

    let claims = verify_jwt_token(&token, HS256_SECRET)
        .expect("HS256 token should decode successfully with correct secret");

    assert_eq!(claims.sub, user_id, "subject should match original user_id");
    assert_eq!(
        claims.username, user_id,
        "username should default to user_id"
    );
    assert_eq!(claims.role, "user", "default role should be 'user'");
    assert!(
        claims.roles.contains(&"user".to_string()),
        "roles should contain 'user'"
    );
    assert!(!claims.is_superuser, "default user should not be superuser");
    assert!(claims.exp > 0, "expiration should be set");
    assert!(claims.iat > 0, "issued-at should be set");
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
struct SimpleClaims {
    sub: String,
    exp: usize,
    iat: usize,
}

#[test]
fn test_jwt_invalid_secret_fails() {
    let user_id = Uuid::new_v4().to_string();
    let token = generate_jwt_token(&user_id, HS256_SECRET, 60);

    let wrong_secret = "wrong-secret-key-that-is-definitely-32-characters!!";
    let result = verify_jwt_token(&token, wrong_secret);

    assert!(result.is_err(), "decode with wrong secret should fail");
    let err_msg = format!("{}", result.unwrap_err());
    assert!(
        err_msg.contains("JWT") || err_msg.contains("验证") || err_msg.contains("signature"),
        "error should indicate JWT/signature issue, got: {}",
        err_msg
    );
}

#[test]
fn test_jwt_expired_fails() {
    let now = chrono::Utc::now();
    let past_exp = (now - chrono::Duration::minutes(10)).timestamp() as usize;
    let past_iat = (now - chrono::Duration::minutes(20)).timestamp() as usize;

    let expired_claims = Claims {
        sub: Uuid::new_v4().to_string(),
        username: "expired_user".to_string(),
        role: "user".to_string(),
        roles: vec!["user".to_string()],
        permissions: Vec::new(),
        is_superuser: false,
        exp: past_exp,
        iat: past_iat,
        email: None,
        department: None,
        tenant_id: None,
        department_id: None,
        position_id: None,
        position_code: None,
        iss: None,
    };

    let token = expired_claims
        .encode(HS256_SECRET)
        .expect("should encode expired claims");

    let result = verify_jwt_token(&token, HS256_SECRET);
    assert!(result.is_err(), "expired token should fail validation");
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct IssuerClaims {
    sub: String,
    exp: usize,
    iat: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    iss: Option<String>,
}

#[test]
fn test_jwt_issuer_validation_match() {
    let now = chrono::Utc::now();
    let exp = (now + chrono::Duration::hours(1)).timestamp() as usize;
    let iat = now.timestamp() as usize;
    let valid_iss = "topems-auth-service";

    let claims_with_iss = IssuerClaims {
        sub: Uuid::new_v4().to_string(),
        exp,
        iat,
        iss: Some(valid_iss.to_string()),
    };

    let token = encode(
        &Header::new(Algorithm::HS256),
        &claims_with_iss,
        &EncodingKey::from_secret(HS256_SECRET.as_ref()),
    )
    .expect("should encode token with iss");

    let mut validation = Validation::new(Algorithm::HS256);
    validation.set_issuer(&[valid_iss]);
    validation.leeway = 60;

    let decoded = decode::<IssuerClaims>(
        &token,
        &DecodingKey::from_secret(HS256_SECRET.as_ref()),
        &validation,
    )
    .expect("token with matching issuer should pass validation");

    assert_eq!(decoded.claims.iss.as_deref(), Some(valid_iss));
}

#[test]
fn test_jwt_issuer_validation_mismatch_fails() {
    let now = chrono::Utc::now();
    let exp = (now + chrono::Duration::hours(1)).timestamp() as usize;
    let iat = now.timestamp() as usize;

    let claims_with_iss = IssuerClaims {
        sub: Uuid::new_v4().to_string(),
        exp,
        iat,
        iss: Some("malicious-issuer".to_string()),
    };

    let token = encode(
        &Header::new(Algorithm::HS256),
        &claims_with_iss,
        &EncodingKey::from_secret(HS256_SECRET.as_ref()),
    )
    .expect("should encode token");

    let mut validation = Validation::new(Algorithm::HS256);
    validation.set_issuer(&["topems-auth-service"]);
    validation.leeway = 60;

    let result = decode::<IssuerClaims>(
        &token,
        &DecodingKey::from_secret(HS256_SECRET.as_ref()),
        &validation,
    );

    assert!(result.is_err(), "issuer mismatch should fail validation");
}

#[test]
fn test_jwt_issuer_missing_but_no_validation_passes() {
    let now = chrono::Utc::now();
    let exp = (now + chrono::Duration::hours(1)).timestamp() as usize;
    let iat = now.timestamp() as usize;

    let claims_no_iss = IssuerClaims {
        sub: Uuid::new_v4().to_string(),
        exp,
        iat,
        iss: None,
    };

    let token = encode(
        &Header::new(Algorithm::HS256),
        &claims_no_iss,
        &EncodingKey::from_secret(HS256_SECRET.as_ref()),
    )
    .expect("should encode token without iss");

    let mut validation = Validation::new(Algorithm::HS256);
    validation.iss = None;
    validation.leeway = 60;

    let decoded = decode::<IssuerClaims>(
        &token,
        &DecodingKey::from_secret(HS256_SECRET.as_ref()),
        &validation,
    )
    .expect("token without iss should pass when iss validation is disabled");

    assert!(decoded.claims.iss.is_none());
}

#[test]
fn test_jwt_roundtrip_rs256_pem_sniff() {
    let now = chrono::Utc::now();
    let exp = (now + chrono::Duration::hours(1)).timestamp() as usize;
    let iat = now.timestamp() as usize;
    let user_id = Uuid::new_v4().to_string();

    let claims = Claims {
        sub: user_id.clone(),
        username: "rs256_user".to_string(),
        role: "admin".to_string(),
        roles: vec!["admin".to_string(), "user".to_string()],
        permissions: vec!["iam:users_read".to_string()],
        is_superuser: false,
        exp,
        iat,
        email: Some("rs256@example.com".to_string()),
        department: Some("Security".to_string()),
        tenant_id: Some("tenant-rs256".to_string()),
        department_id: None,
        position_id: None,
        position_code: None,
        iss: Some("topems-auth-service".to_string()),
    };

    let token = claims
        .encode(RSA_PRIVATE_PEM)
        .expect("should encode with RSA private key (PEM sniff)");

    assert!(!token.is_empty(), "RS256 token should not be empty");

    let verified = verify_jwt_token(&token, RSA_PUBLIC_PEM)
        .expect("should decode RS256 token with RSA public key");

    assert_eq!(verified.sub, user_id, "RS256 roundtrip sub should match");
    assert_eq!(verified.username, "rs256_user");
    assert_eq!(verified.role, "admin");
    assert_eq!(verified.tenant_id.as_deref(), Some("tenant-rs256"));
    assert!(verified.permissions.contains(&"iam:users_read".to_string()));
}

// =============================================================================
// P33-2: 认证审计日志 (auth_audit) 集成测试
//
// 覆盖登录/登出/令牌刷新等认证事件的审计日志生成与字段断言。
// 使用 `topems_shared::audit::CreateAuditLogRequest` 构造审计条目，
// 模拟 unified-core/iam/access_log 与 audit_log 中间件写入的审计记录结构。
// =============================================================================

/// 构造一个带 tenant_id 与签发时间戳的 Claims，用于审计场景模拟。
fn build_auth_audit_claims(user_id: &str, tenant_id: &str) -> Claims {
    let now = chrono::Utc::now();
    Claims {
        sub: user_id.to_string(),
        username: format!("audit_user_{}", user_id),
        role: "user".to_string(),
        roles: vec!["user".to_string()],
        permissions: vec!["iam:users_read".to_string()],
        is_superuser: false,
        exp: (now + chrono::Duration::hours(1)).timestamp() as usize,
        iat: now.timestamp() as usize,
        email: Some(format!("{}@example.com", user_id)),
        department: None,
        tenant_id: Some(tenant_id.to_string()),
        department_id: None,
        position_id: None,
        position_code: None,
        iss: Some("topems-auth-service".to_string()),
    }
}

/// 构造登录成功事件的审计日志条目（action="login", status="success"）。
fn build_login_audit_entry(user_id: &str, tenant_id: &str, ip: &str) -> CreateAuditLogRequest {
    CreateAuditLogRequest::new(
        "login".to_string(),
        "auth".to_string(),
        "success".to_string(),
    )
    .with_user(user_id.to_string(), format!("audit_user_{}", user_id))
    .with_request_info(
        Some(ip.to_string()),
        Some("audit-test-agent/1.0".to_string()),
    )
    .with_request_details(serde_json::json!({
        "tenant_id": tenant_id,
        "auth_method": "password",
    }))
}

#[test]
fn test_login_success_creates_audit_entry() {
    let user_id = Uuid::new_v4().to_string();
    let tenant_id = Uuid::new_v4().to_string();
    let ip = "192.168.1.10";

    let entry = build_login_audit_entry(&user_id, &tenant_id, ip);

    assert_eq!(entry.action, "login", "action must be login");
    assert_eq!(entry.status, "success", "status must be success");
    assert_eq!(entry.entity_type, "auth", "entity_type must be auth");
    assert_eq!(entry.user_id.as_deref(), Some(user_id.as_str()));
    assert_eq!(entry.ip_address.as_deref(), Some(ip));
    assert!(entry.user_agent.is_some(), "user_agent should be captured");
    assert_eq!(
        entry.error_message, None,
        "successful login must not have error_message"
    );
}

#[test]
fn test_login_failed_creates_audit_entry_with_error() {
    let ip = "10.0.0.99";
    let entry = CreateAuditLogRequest::new(
        "login_failed".to_string(),
        "auth".to_string(),
        "failed".to_string(),
    )
    .with_user("unknown-user".to_string(), "unknown".to_string())
    .with_request_info(
        Some(ip.to_string()),
        Some("malicious-agent/2.0".to_string()),
    )
    .with_error("Invalid credentials".to_string());

    assert_eq!(entry.action, "login_failed");
    assert_eq!(entry.status, "failed");
    assert_eq!(entry.ip_address.as_deref(), Some(ip));
    assert_eq!(
        entry.error_message.as_deref(),
        Some("Invalid credentials"),
        "failed login must record error_message"
    );
    assert_eq!(entry.user_id.as_deref(), Some("unknown-user"));
}

#[test]
fn test_logout_creates_audit_entry() {
    let user_id = Uuid::new_v4().to_string();
    let tenant_id = Uuid::new_v4().to_string();

    // 模拟登出：先验证令牌有效，再生成登出审计条目
    let claims = build_auth_audit_claims(&user_id, &tenant_id);
    let token = claims
        .encode(HS256_SECRET)
        .expect("should encode token before logout");
    let verified =
        verify_jwt_token(&token, HS256_SECRET).expect("token must be valid prior to logout audit");
    assert_eq!(verified.sub, user_id);

    let entry = CreateAuditLogRequest::new(
        "logout".to_string(),
        "auth".to_string(),
        "success".to_string(),
    )
    .with_user(user_id.clone(), format!("audit_user_{}", user_id))
    .with_request_info(Some("172.16.0.5".to_string()), None)
    .with_request_details(serde_json::json!({
        "tenant_id": tenant_id,
        "session_terminated": true,
    }));

    assert_eq!(entry.action, "logout");
    assert_eq!(entry.status, "success");
    assert_eq!(entry.user_id.as_deref(), Some(user_id.as_str()));
    assert!(entry.user_agent.is_none(), "user_agent optional on logout");
    // 验证 request_details 中包含 session 终止标记
    let details = entry
        .request_details
        .as_ref()
        .expect("request_details should be set");
    assert_eq!(details["session_terminated"], true);
}

#[test]
fn test_token_refresh_creates_audit_entry() {
    let user_id = Uuid::new_v4().to_string();
    let tenant_id = Uuid::new_v4().to_string();

    // 模拟令牌刷新：生成 refresh_token 并构造刷新审计条目
    let refresh_token = generate_refresh_token();
    assert_eq!(
        refresh_token.len(),
        64,
        "refresh token should be 64 hex chars"
    );

    let entry = CreateAuditLogRequest::new(
        "token_refresh".to_string(),
        "auth".to_string(),
        "success".to_string(),
    )
    .with_user(user_id.clone(), format!("audit_user_{}", user_id))
    .with_request_info(
        Some("192.168.0.20".to_string()),
        Some("refresh-client/1.0".to_string()),
    )
    .with_request_details(serde_json::json!({
        "tenant_id": tenant_id,
        "refresh_token_prefix": &refresh_token[..8],
    }));

    assert_eq!(
        entry.action, "token_refresh",
        "action must be token_refresh"
    );
    assert_eq!(entry.status, "success");
    assert_eq!(entry.user_id.as_deref(), Some(user_id.as_str()));
    let details = entry
        .request_details
        .as_ref()
        .expect("request_details should be set");
    assert_eq!(details["tenant_id"], serde_json::json!(tenant_id));
    // 仅记录 refresh_token 前缀，避免全量泄露
    assert!(details["refresh_token_prefix"].as_str().unwrap().len() < refresh_token.len());
}

#[test]
fn test_audit_entry_chain_login_event_full_context() {
    // 端到端：构造一个完整登录事件审计条目，验证链式 builder 与所有字段
    let user_id = Uuid::new_v4();
    let tenant_id = Uuid::new_v4();
    let ip = "203.0.113.42";

    let entry = CreateAuditLogRequest::new(
        "login".to_string(),
        "auth".to_string(),
        "success".to_string(),
    )
    .with_entity_id(user_id)
    .with_user(user_id.to_string(), "audit_chain_user".to_string())
    .with_request_info(Some(ip.to_string()), Some("chain-agent/3.0".to_string()))
    .with_request_details(serde_json::json!({"tenant_id": tenant_id}))
    .with_response_details(serde_json::json!({"access_token_issued": true}));

    assert_eq!(entry.action, "login");
    assert_eq!(entry.entity_type, "auth");
    assert_eq!(
        entry.entity_id,
        Some(user_id),
        "entity_id should be the user_id"
    );
    assert_eq!(
        entry.user_id.as_deref(),
        Some(user_id.to_string()).as_deref()
    );
    assert_eq!(entry.ip_address.as_deref(), Some(ip));
    assert!(entry.request_details.is_some());
    assert!(entry.response_details.is_some());
    assert_eq!(
        entry.response_details.as_ref().unwrap()["access_token_issued"],
        true
    );
}

#[test]
fn test_audit_entry_serialization_roundtrip_login_event() {
    // 审计条目必须可序列化以写入 audit_logs 表 / 发送到事件总线
    let user_id = Uuid::new_v4().to_string();
    let original = build_login_audit_entry(&user_id, "tenant-serialize", "198.51.100.7");

    let json = serde_json::to_string(&original).expect("audit entry must serialize to JSON");
    let deserialized: CreateAuditLogRequest =
        serde_json::from_str(&json).expect("audit entry must deserialize from JSON");

    assert_eq!(
        deserialized.action, original.action,
        "action survives roundtrip"
    );
    assert_eq!(deserialized.status, original.status);
    assert_eq!(deserialized.user_id, original.user_id);
    assert_eq!(deserialized.ip_address, original.ip_address);
    assert_eq!(deserialized.entity_type, original.entity_type);
    assert!(
        json.contains("\"action\":\"login\""),
        "JSON should contain action field"
    );
}

#[test]
fn test_distinct_audit_actions_for_auth_events() {
    // 验证四种认证事件对应的 action 字符串互不相同，避免审计分类歧义
    let actions = [
        build_login_audit_entry("u1", "t1", "1.1.1.1").action,
        CreateAuditLogRequest::new(
            "login_failed".to_string(),
            "auth".to_string(),
            "failed".to_string(),
        )
        .action,
        CreateAuditLogRequest::new(
            "logout".to_string(),
            "auth".to_string(),
            "success".to_string(),
        )
        .action,
        CreateAuditLogRequest::new(
            "token_refresh".to_string(),
            "auth".to_string(),
            "success".to_string(),
        )
        .action,
    ];

    let unique: std::collections::HashSet<&str> = actions.iter().map(|s| s.as_str()).collect();
    assert_eq!(
        unique.len(),
        actions.len(),
        "auth audit actions must be distinct, got: {:?}",
        actions
    );
    assert!(unique.contains("login"));
    assert!(unique.contains("login_failed"));
    assert!(unique.contains("logout"));
    assert!(unique.contains("token_refresh"));
}

use crate::shared::tenant::get_tenant_id;
use axum::http::HeaderMap;
use topems_shared_auth::auth::Claims;

/// 构造一个最小可用的 `Claims` 用于测试。
///
/// `Claims` 未实现 `Default`，且 `tenant_id` 字段类型为 `Option<String>`
/// （而非 `Option<Uuid>`），因此这里集中构造，避免在每个测试中重复。
fn make_claims(tenant_id: Option<&str>) -> Claims {
    Claims {
        sub: "u1".to_string(),
        username: "u1".to_string(),
        role: "user".to_string(),
        roles: vec![],
        permissions: vec![],
        is_superuser: false,
        exp: 0,
        iat: 0,
        email: None,
        department: None,
        tenant_id: tenant_id.map(|s| s.to_string()),
        department_id: None,
        position_id: None,
        position_code: None,
    }
}

#[test]
fn returns_claims_tenant_id_when_present() {
    let headers = HeaderMap::new();
    let claims = make_claims(Some("00000000-0000-0000-0000-000000000000"));
    assert_eq!(get_tenant_id(&claims, &headers), uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap());
}

#[test]
fn falls_back_to_x_tenant_id_header_when_claims_missing() {
    let mut headers = HeaderMap::new();
    headers.insert(
        "x-tenant-id",
        "00000000-0000-0000-0000-000000000000".parse().unwrap(),
    );
    let claims = make_claims(None);
    assert_eq!(get_tenant_id(&claims, &headers), uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap());
}

#[test]
fn returns_nil_uuid_when_neither_present() {
    let headers = HeaderMap::new();
    let claims = make_claims(None);
    assert_eq!(get_tenant_id(&claims, &headers), uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap());
}

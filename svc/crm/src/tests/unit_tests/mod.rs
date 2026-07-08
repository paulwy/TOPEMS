use crate::modules::customer_scoring::BatchCalculateRequest;
use crate::shared::permission::{check_permission, ModulePermission};
use std::str::FromStr;
use topems_shared::auth::Claims;
use uuid::Uuid;

fn calculate_score_level(score: i32) -> String {
    if score >= 80 {
        "A".to_string()
    } else if score >= 60 {
        "B".to_string()
    } else if score >= 40 {
        "C".to_string()
    } else {
        "D".to_string()
    }
}

fn calculate_trend(last_score: Option<i32>, current_score: i32) -> String {
    match last_score {
        Some(last) if current_score > last => "up".to_string(),
        Some(last) if current_score < last => "down".to_string(),
        _ => "stable".to_string(),
    }
}

fn create_test_claims(is_superuser: bool, permissions: Vec<String>) -> Claims {
    Claims {
        sub: "user-1".to_string(),
        username: "testuser".to_string(),
        role: "user".to_string(),
        roles: vec!["user".to_string()],
        permissions,
        is_superuser,
        exp: 0,
        iat: 0,
        email: None,
        department: None,
        tenant_id: Some(Uuid::new_v4().to_string()),
    }
}

#[tokio::test]
async fn test_check_permission_superuser() {
    let claims = create_test_claims(true, vec![]);
    let result = check_permission(&(), &claims, &ModulePermission::CustomerRead).await;
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_check_permission_has_required_permission() {
    let claims = create_test_claims(false, vec!["crm:read".to_string()]);
    let result = check_permission(&(), &claims, &ModulePermission::CustomerRead).await;
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_check_permission_has_admin_permission() {
    let claims = create_test_claims(false, vec!["crm:admin".to_string()]);
    let result = check_permission(&(), &claims, &ModulePermission::CustomerWrite).await;
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_check_permission_has_all_permission() {
    let claims = create_test_claims(false, vec!["all".to_string()]);
    let result = check_permission(&(), &claims, &ModulePermission::OpportunityRead).await;
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_check_permission_lacks_permission() {
    let claims = create_test_claims(false, vec!["hrm:read".to_string()]);
    let result = check_permission(&(), &claims, &ModulePermission::CustomerRead).await;
    assert!(result.is_err());
}

#[test]
fn test_module_permission_display() {
    assert_eq!(ModulePermission::CustomerRead.to_string(), "crm:read");
    assert_eq!(ModulePermission::CustomerWrite.to_string(), "crm:write");
    assert_eq!(ModulePermission::ContactRead.to_string(), "crm:read");
    assert_eq!(ModulePermission::ContactWrite.to_string(), "crm:write");
    assert_eq!(ModulePermission::OpportunityRead.to_string(), "crm:read");
    assert_eq!(ModulePermission::OpportunityWrite.to_string(), "crm:write");
    assert_eq!(ModulePermission::InteractionRead.to_string(), "crm:read");
    assert_eq!(ModulePermission::InteractionWrite.to_string(), "crm:write");
    assert_eq!(ModulePermission::All.to_string(), "crm:admin");
}

#[test]
fn test_calculate_score_level_a() {
    assert_eq!(calculate_score_level(95), "A");
    assert_eq!(calculate_score_level(80), "A");
    assert_eq!(calculate_score_level(85), "A");
}

#[test]
fn test_calculate_score_level_b() {
    assert_eq!(calculate_score_level(79), "B");
    assert_eq!(calculate_score_level(60), "B");
    assert_eq!(calculate_score_level(70), "B");
}

#[test]
fn test_calculate_score_level_c() {
    assert_eq!(calculate_score_level(59), "C");
    assert_eq!(calculate_score_level(40), "C");
    assert_eq!(calculate_score_level(50), "C");
}

#[test]
fn test_calculate_score_level_d() {
    assert_eq!(calculate_score_level(39), "D");
    assert_eq!(calculate_score_level(0), "D");
    assert_eq!(calculate_score_level(25), "D");
}

#[test]
fn test_calculate_trend_up() {
    assert_eq!(calculate_trend(Some(70), 80), "up");
    assert_eq!(calculate_trend(Some(50), 60), "up");
    assert_eq!(calculate_trend(Some(0), 10), "up");
}

#[test]
fn test_calculate_trend_down() {
    assert_eq!(calculate_trend(Some(80), 70), "down");
    assert_eq!(calculate_trend(Some(60), 50), "down");
    assert_eq!(calculate_trend(Some(10), 0), "down");
}

#[test]
fn test_calculate_trend_stable() {
    assert_eq!(calculate_trend(Some(80), 80), "stable");
    assert_eq!(calculate_trend(None, 80), "stable");
    assert_eq!(calculate_trend(Some(50), 50), "stable");
}

#[test]
fn test_batch_calculate_request_deserialization() {
    let json_str = r#"{"customer_ids": ["550e8400-e29b-41d4-a716-446655440000", "550e8400-e29b-41d4-a716-446655440001"]}"#;
    let request: BatchCalculateRequest = serde_json::from_str(json_str).unwrap();

    assert_eq!(request.customer_ids.len(), 2);
    assert_eq!(
        request.customer_ids[0],
        Uuid::from_str("550e8400-e29b-41d4-a716-446655440000").unwrap()
    );
}

#[test]
fn test_claims_permission_check() {
    let claims = create_test_claims(false, vec!["crm:read".to_string(), "crm:write".to_string()]);

    assert!(claims.has_permission("crm:read"));
    assert!(claims.has_permission("crm:write"));
    assert!(!claims.has_permission("hrm:read"));
}

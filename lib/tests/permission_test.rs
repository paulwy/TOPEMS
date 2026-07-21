use topems_shared::auth::Claims;
use topems_shared::permission::{
    check_any_module_permission, get_all_module_permissions, get_module_actions, ModuleCode,
    ModulePermission, PermissionAction,
};
use uuid::Uuid;

#[test]
fn test_module_code_as_str() {
    assert_eq!(ModuleCode::Iam.as_str(), "iam");
    assert_eq!(ModuleCode::Hrm.as_str(), "hrm");
    assert_eq!(ModuleCode::Erp.as_str(), "erp");
    assert_eq!(ModuleCode::Pm.as_str(), "pm");
    assert_eq!(ModuleCode::Rs.as_str(), "rs");
    assert_eq!(ModuleCode::Scm.as_str(), "scm");
    assert_eq!(ModuleCode::Crm.as_str(), "crm");
    assert_eq!(ModuleCode::Ai.as_str(), "ai");
    assert_eq!(ModuleCode::Gis.as_str(), "gis");
    assert_eq!(ModuleCode::Qms.as_str(), "qms");
    assert_eq!(ModuleCode::Ehs.as_str(), "ehs");
    assert_eq!(ModuleCode::Mes.as_str(), "mes");
    assert_eq!(ModuleCode::Wms.as_str(), "wms");
    assert_eq!(ModuleCode::Workflow.as_str(), "workflow");
    assert_eq!(ModuleCode::Doc.as_str(), "doc");
    assert_eq!(ModuleCode::File.as_str(), "file");
    assert_eq!(ModuleCode::Notification.as_str(), "notification");
    assert_eq!(ModuleCode::Im.as_str(), "im");
    assert_eq!(ModuleCode::Integration.as_str(), "integration");
    assert_eq!(ModuleCode::System.as_str(), "system");
}

#[test]
fn test_module_code_from_str_valid() {
    assert_eq!(ModuleCode::from_str("iam"), Some(ModuleCode::Iam));
    assert_eq!(ModuleCode::from_str("hrm"), Some(ModuleCode::Hrm));
    assert_eq!(ModuleCode::from_str("erp"), Some(ModuleCode::Erp));
    assert_eq!(ModuleCode::from_str("pm"), Some(ModuleCode::Pm));
    assert_eq!(ModuleCode::from_str("rs"), Some(ModuleCode::Rs));
    assert_eq!(ModuleCode::from_str("scm"), Some(ModuleCode::Scm));
    assert_eq!(ModuleCode::from_str("crm"), Some(ModuleCode::Crm));
    assert_eq!(ModuleCode::from_str("ai"), Some(ModuleCode::Ai));
    assert_eq!(ModuleCode::from_str("gis"), Some(ModuleCode::Gis));
    assert_eq!(ModuleCode::from_str("qms"), Some(ModuleCode::Qms));
    assert_eq!(ModuleCode::from_str("ehs"), Some(ModuleCode::Ehs));
    assert_eq!(ModuleCode::from_str("mes"), Some(ModuleCode::Mes));
    assert_eq!(ModuleCode::from_str("wms"), Some(ModuleCode::Wms));
    assert_eq!(ModuleCode::from_str("workflow"), Some(ModuleCode::Workflow));
    assert_eq!(ModuleCode::from_str("doc"), Some(ModuleCode::Doc));
    assert_eq!(ModuleCode::from_str("file"), Some(ModuleCode::File));
    assert_eq!(
        ModuleCode::from_str("notification"),
        Some(ModuleCode::Notification)
    );
    assert_eq!(ModuleCode::from_str("im"), Some(ModuleCode::Im));
    assert_eq!(
        ModuleCode::from_str("integration"),
        Some(ModuleCode::Integration)
    );
    assert_eq!(ModuleCode::from_str("system"), Some(ModuleCode::System));
}

#[test]
fn test_module_code_from_str_invalid() {
    assert_eq!(ModuleCode::from_str("invalid"), None);
    assert_eq!(ModuleCode::from_str(""), None);
    assert_eq!(ModuleCode::from_str("unknown_module"), None);
}

#[test]
fn test_permission_action_as_str() {
    assert_eq!(PermissionAction::Read.as_str(), "read");
    assert_eq!(PermissionAction::Write.as_str(), "write");
    assert_eq!(PermissionAction::Delete.as_str(), "delete");
    assert_eq!(PermissionAction::Approve.as_str(), "approve");
    assert_eq!(PermissionAction::Admin.as_str(), "admin");
}

#[test]
fn test_permission_action_from_str_valid() {
    assert_eq!(
        PermissionAction::from_str("read"),
        Some(PermissionAction::Read)
    );
    assert_eq!(
        PermissionAction::from_str("write"),
        Some(PermissionAction::Write)
    );
    assert_eq!(
        PermissionAction::from_str("delete"),
        Some(PermissionAction::Delete)
    );
    assert_eq!(
        PermissionAction::from_str("approve"),
        Some(PermissionAction::Approve)
    );
    assert_eq!(
        PermissionAction::from_str("admin"),
        Some(PermissionAction::Admin)
    );
}

#[test]
fn test_permission_action_from_str_invalid() {
    assert_eq!(PermissionAction::from_str("invalid"), None);
    assert_eq!(PermissionAction::from_str(""), None);
    assert_eq!(PermissionAction::from_str("manage"), None);
}

#[test]
fn test_permission_action_levels() {
    assert_eq!(PermissionAction::Read.level(), 1);
    assert_eq!(PermissionAction::Write.level(), 2);
    assert_eq!(PermissionAction::Delete.level(), 3);
    assert_eq!(PermissionAction::Approve.level(), 3);
    assert_eq!(PermissionAction::Admin.level(), 4);

    assert!(PermissionAction::Write.level() > PermissionAction::Read.level());
    assert!(PermissionAction::Admin.level() > PermissionAction::Delete.level());
}

#[test]
fn test_module_permission_new() {
    let perm = ModulePermission::new(ModuleCode::Hrm, PermissionAction::Read);
    assert_eq!(perm.to_string(), "hrm:read");
}

#[test]
fn test_module_permission_to_string() {
    let perm = ModulePermission::new(ModuleCode::Erp, PermissionAction::Write);
    assert_eq!(perm.to_string(), "erp:write");
}

#[test]
fn test_module_permission_display() {
    let perm = ModulePermission::new(ModuleCode::Pm, PermissionAction::Admin);
    assert_eq!(format!("{}", perm), "pm:admin");
}

#[test]
fn test_module_permission_parse_valid() {
    let perm = ModulePermission::parse("hrm:read").unwrap();
    assert_eq!(perm.to_string(), "hrm:read");

    let perm = ModulePermission::parse("erp:admin").unwrap();
    assert_eq!(perm.to_string(), "erp:admin");
}

#[test]
fn test_module_permission_parse_invalid_format() {
    assert!(ModulePermission::parse("invalid").is_none());
    assert!(ModulePermission::parse("too:many:parts").is_none());
    assert!(ModulePermission::parse("").is_none());
    assert!(ModulePermission::parse(":").is_none());
}

#[test]
fn test_module_permission_parse_invalid_module() {
    assert!(ModulePermission::parse("invalid:read").is_none());
}

#[test]
fn test_module_permission_parse_invalid_action() {
    assert!(ModulePermission::parse("hrm:invalid").is_none());
}

#[test]
fn test_module_permission_implies_same_module_higher_level() {
    let admin = ModulePermission::new(ModuleCode::Hrm, PermissionAction::Admin);
    let write = ModulePermission::new(ModuleCode::Hrm, PermissionAction::Write);
    let read = ModulePermission::new(ModuleCode::Hrm, PermissionAction::Read);

    assert!(admin.implies(&write));
    assert!(admin.implies(&read));
    assert!(write.implies(&read));
}

#[test]
fn test_module_permission_implies_same_module_same_level() {
    let read1 = ModulePermission::new(ModuleCode::Hrm, PermissionAction::Read);
    let read2 = ModulePermission::new(ModuleCode::Hrm, PermissionAction::Read);

    assert!(read1.implies(&read2));
}

#[test]
fn test_module_permission_implies_different_module() {
    let hrm_read = ModulePermission::new(ModuleCode::Hrm, PermissionAction::Admin);
    let erp_read = ModulePermission::new(ModuleCode::Erp, PermissionAction::Read);

    assert!(!hrm_read.implies(&erp_read));
}

#[test]
fn test_module_permission_implies_lower_level() {
    let read = ModulePermission::new(ModuleCode::Hrm, PermissionAction::Read);
    let write = ModulePermission::new(ModuleCode::Hrm, PermissionAction::Write);

    assert!(!read.implies(&write));
}

#[test]
fn test_get_all_module_permissions_not_empty() {
    let perms = get_all_module_permissions();
    assert!(!perms.is_empty());
}

#[test]
fn test_get_all_module_permissions_contains_expected() {
    let perms = get_all_module_permissions();
    let perm_strs: Vec<String> = perms.iter().map(|p| p.to_string()).collect();

    assert!(perm_strs.contains(&"iam:read".to_string()));
    assert!(perm_strs.contains(&"iam:write".to_string()));
    assert!(perm_strs.contains(&"iam:delete".to_string()));
    assert!(perm_strs.contains(&"iam:admin".to_string()));
    assert!(perm_strs.contains(&"hrm:read".to_string()));
    assert!(perm_strs.contains(&"erp:admin".to_string()));
}

#[test]
fn test_get_all_module_permissions_contains_workflow_approve() {
    let perms = get_all_module_permissions();
    let perm_strs: Vec<String> = perms.iter().map(|p| p.to_string()).collect();

    assert!(perm_strs.contains(&"workflow:approve".to_string()));
}

#[test]
fn test_get_module_actions() {
    let actions = get_module_actions();
    assert_eq!(actions.len(), 5);

    let action_ids: Vec<&str> = actions.iter().map(|(id, _)| id.as_str()).collect();
    assert!(action_ids.contains(&"read"));
    assert!(action_ids.contains(&"write"));
    assert!(action_ids.contains(&"delete"));
    assert!(action_ids.contains(&"approve"));
    assert!(action_ids.contains(&"admin"));
}

fn create_test_claims(permissions: Vec<&str>, is_superuser: bool) -> Claims {
    Claims {
        sub: Uuid::new_v4().to_string(),
        username: "testuser".to_string(),
        role: "user".to_string(),
        roles: vec!["user".to_string()],
        permissions: permissions.iter().map(|p| p.to_string()).collect(),
        is_superuser,
        exp: 0,
        iat: 0,
        email: None,
        department: None,
        tenant_id: None,
        department_id: None,
        position_id: None,
        position_code: None,
    }
}

#[test]
fn test_check_any_module_permission_user_has_permission() {
    let claims = create_test_claims(vec!["hrm:read"], false);
    let perms = vec![ModulePermission::new(
        ModuleCode::Hrm,
        PermissionAction::Read,
    )];

    let result = check_any_module_permission::<()>(&claims, &perms);
    assert!(result.is_ok());
}

#[test]
fn test_check_any_module_permission_user_has_admin() {
    let claims = create_test_claims(vec!["hrm:admin"], false);
    let perms = vec![ModulePermission::new(
        ModuleCode::Hrm,
        PermissionAction::Read,
    )];

    let result = check_any_module_permission::<()>(&claims, &perms);
    assert!(result.is_ok());
}

#[test]
fn test_check_any_module_permission_user_lacks_permission() {
    let claims = create_test_claims(vec![], false);
    let perms = vec![ModulePermission::new(
        ModuleCode::Hrm,
        PermissionAction::Read,
    )];

    let result = check_any_module_permission::<()>(&claims, &perms);
    assert!(result.is_err());
}

#[test]
fn test_check_any_module_permission_superuser() {
    let claims = create_test_claims(vec![], true);
    let perms = vec![ModulePermission::new(
        ModuleCode::Hrm,
        PermissionAction::Admin,
    )];

    let result = check_any_module_permission::<()>(&claims, &perms);
    assert!(result.is_ok());
}

#[test]
fn test_check_any_module_permission_multiple_perms() {
    let claims = create_test_claims(vec!["erp:read"], false);
    let perms = vec![
        ModulePermission::new(ModuleCode::Hrm, PermissionAction::Read),
        ModulePermission::new(ModuleCode::Erp, PermissionAction::Read),
    ];

    let result = check_any_module_permission::<()>(&claims, &perms);
    assert!(result.is_ok());
}

#[test]
fn test_module_code_equality() {
    assert_eq!(ModuleCode::Iam, ModuleCode::Iam);
    assert_ne!(ModuleCode::Iam, ModuleCode::Hrm);
}

#[test]
fn test_permission_action_equality() {
    assert_eq!(PermissionAction::Read, PermissionAction::Read);
    assert_ne!(PermissionAction::Read, PermissionAction::Write);
}

#[test]
fn test_module_permission_equality() {
    let p1 = ModulePermission::new(ModuleCode::Hrm, PermissionAction::Read);
    let p2 = ModulePermission::new(ModuleCode::Hrm, PermissionAction::Read);
    let p3 = ModulePermission::new(ModuleCode::Erp, PermissionAction::Read);

    assert_eq!(p1, p2);
    assert_ne!(p1, p3);
}

#[test]
fn test_module_permission_clone() {
    let p1 = ModulePermission::new(ModuleCode::Hrm, PermissionAction::Read);
    let p2 = p1.clone();

    assert_eq!(p1, p2);
}

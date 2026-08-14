use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct MenuGroup {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub code: String,
    pub icon: Option<String>,
    pub sort_order: i32,
    pub status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Menu {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub group_id: Uuid,
    pub parent_id: Option<Uuid>,
    pub name: String,
    pub code: String,
    pub path: Option<String>,
    pub icon: Option<String>,
    pub sort_order: i32,
    pub status: String,
    pub permissions: Option<serde_json::Value>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateMenuGroupRequest {
    pub name: String,
    pub code: String,
    pub icon: Option<String>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateMenuGroupRequest {
    pub name: Option<String>,
    pub code: Option<String>,
    pub icon: Option<String>,
    pub sort_order: Option<i32>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateMenuRequest {
    pub group_id: Uuid,
    pub parent_id: Option<Uuid>,
    pub name: String,
    pub code: String,
    pub path: Option<String>,
    pub icon: Option<String>,
    pub sort_order: Option<i32>,
    pub permissions: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateMenuRequest {
    pub group_id: Option<Uuid>,
    pub parent_id: Option<Uuid>,
    pub name: Option<String>,
    pub code: Option<String>,
    pub path: Option<String>,
    pub icon: Option<String>,
    pub sort_order: Option<i32>,
    pub status: Option<String>,
    pub permissions: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MenuGroupQuery {
    pub search: Option<String>,
    pub status: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MenuQuery {
    pub group_id: Option<Uuid>,
    pub parent_id: Option<Uuid>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MenuGroupListResponse {
    pub items: Vec<MenuGroup>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MenuListResponse {
    pub items: Vec<Menu>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json;

    fn sample_time() -> chrono::DateTime<chrono::Utc> {
        chrono::DateTime::parse_from_rfc3339("2024-01-15T10:30:00Z")
            .unwrap()
            .with_timezone(&chrono::Utc)
    }

    #[test]
    fn test_menu_group_serde() {
        let mg = MenuGroup {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            name: "系统管理".to_string(),
            code: "system".to_string(),
            icon: Some("settings".to_string()),
            sort_order: 1,
            status: "active".to_string(),
            created_at: sample_time(),
            updated_at: sample_time(),
        };
        let cloned = mg.clone();
        assert_eq!(cloned.code, "system");
        let json = serde_json::to_string(&mg).unwrap();
        let de: MenuGroup = serde_json::from_str(&json).unwrap();
        assert_eq!(de.name, "系统管理");
        assert_eq!(de.sort_order, 1);
    }

    #[test]
    fn test_menu_serde() {
        let m = Menu {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            group_id: Uuid::new_v4(),
            parent_id: None,
            name: "用户管理".to_string(),
            code: "iam:users".to_string(),
            path: Some("/iam/users".to_string()),
            icon: Some("users".to_string()),
            sort_order: 1,
            status: "active".to_string(),
            permissions: Some(serde_json::json!(["iam:users:read"])),
            created_at: sample_time(),
            updated_at: sample_time(),
        };
        let json = serde_json::to_string(&m).unwrap();
        let de: Menu = serde_json::from_str(&json).unwrap();
        assert_eq!(de.code, "iam:users");
        assert!(de.permissions.is_some());
    }

    #[test]
    fn test_menu_requests_serde() {
        let cmgr = CreateMenuGroupRequest {
            name: "工作流".to_string(),
            code: "flow".to_string(),
            icon: None,
            sort_order: Some(2),
        };
        let json = serde_json::to_string(&cmgr).unwrap();
        let de: CreateMenuGroupRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(de.code, "flow");

        let umgr = UpdateMenuGroupRequest {
            name: Some("新版工作流".to_string()),
            code: None,
            icon: Some("flow-icon".to_string()),
            sort_order: Some(3),
            status: Some("inactive".to_string()),
        };
        let json2 = serde_json::to_string(&umgr).unwrap();
        let de2: UpdateMenuGroupRequest = serde_json::from_str(&json2).unwrap();
        assert_eq!(de2.status, Some("inactive".to_string()));

        let cmr = CreateMenuRequest {
            group_id: Uuid::new_v4(),
            parent_id: None,
            name: "审批任务".to_string(),
            code: "flow:tasks".to_string(),
            path: Some("/flow/tasks".to_string()),
            icon: None,
            sort_order: Some(5),
            permissions: None,
        };
        let json3 = serde_json::to_string(&cmr).unwrap();
        let de3: CreateMenuRequest = serde_json::from_str(&json3).unwrap();
        assert_eq!(de3.code, "flow:tasks");

        let umr = UpdateMenuRequest {
            group_id: None,
            parent_id: Some(Uuid::new_v4()),
            name: Some("改名后".to_string()),
            code: None,
            path: None,
            icon: None,
            sort_order: None,
            status: Some("active".to_string()),
            permissions: Some(serde_json::json!([])),
        };
        let json4 = serde_json::to_string(&umr).unwrap();
        let de4: UpdateMenuRequest = serde_json::from_str(&json4).unwrap();
        assert_eq!(de4.status, Some("active".to_string()));
    }

    #[test]
    fn test_menu_queries_and_list_responses() {
        let mgq = MenuGroupQuery {
            search: Some("系统".to_string()),
            status: None,
            page: Some(1),
            page_size: Some(10),
        };
        let json = serde_json::to_string(&mgq).unwrap();
        let de: MenuGroupQuery = serde_json::from_str(&json).unwrap();
        assert_eq!(de.search, Some("系统".to_string()));

        let mq = MenuQuery {
            group_id: Some(Uuid::new_v4()),
            parent_id: None,
            search: None,
            status: Some("active".to_string()),
            page: None,
            page_size: None,
        };
        let json2 = serde_json::to_string(&mq).unwrap();
        let de2: MenuQuery = serde_json::from_str(&json2).unwrap();
        assert!(de2.group_id.is_some());

        let mglr = MenuGroupListResponse {
            items: vec![],
            total: 0,
            page: 1,
            page_size: 10,
        };
        let json3 = serde_json::to_string(&mglr).unwrap();
        let de3: MenuGroupListResponse = serde_json::from_str(&json3).unwrap();
        assert_eq!(de3.total, 0);

        let mlr = MenuListResponse {
            items: vec![],
            total: 5,
            page: 1,
            page_size: 20,
        };
        let json4 = serde_json::to_string(&mlr).unwrap();
        let de4: MenuListResponse = serde_json::from_str(&json4).unwrap();
        assert_eq!(de4.total, 5);
    }
}

use crate::models::{NavigationMenu, PinnedApp};

pub struct NavigationService;

impl NavigationService {
    pub fn new() -> Self {
        Self
    }

    pub fn get_navigation_menu(&self) -> Vec<NavigationMenu> {
        vec![
            NavigationMenu {
                id: "1".to_string(),
                name: "工作台".to_string(),
                icon: "LayoutDashboard".to_string(),
                url: "/portal/workbench".to_string(),
                service: "portal".to_string(),
                parent_id: None,
                order: 1,
                is_visible: true,
                badge_count: None,
            },
            NavigationMenu {
                id: "2".to_string(),
                name: "ERP系统".to_string(),
                icon: "Package".to_string(),
                url: "/erp".to_string(),
                service: "erp".to_string(),
                parent_id: None,
                order: 2,
                is_visible: true,
                badge_count: Some(5),
            },
            NavigationMenu {
                id: "3".to_string(),
                name: "MES生产".to_string(),
                icon: "Factory".to_string(),
                url: "/mes".to_string(),
                service: "mes".to_string(),
                parent_id: None,
                order: 3,
                is_visible: true,
                badge_count: None,
            },
            NavigationMenu {
                id: "4".to_string(),
                name: "BI分析".to_string(),
                icon: "BarChart3".to_string(),
                url: "/bi".to_string(),
                service: "bi".to_string(),
                parent_id: None,
                order: 4,
                is_visible: true,
                badge_count: None,
            },
            NavigationMenu {
                id: "5".to_string(),
                name: "质量管理".to_string(),
                icon: "ShieldCheck".to_string(),
                url: "/qms".to_string(),
                service: "qms".to_string(),
                parent_id: None,
                order: 5,
                is_visible: true,
                badge_count: Some(2),
            },
            NavigationMenu {
                id: "6".to_string(),
                name: "仓储管理".to_string(),
                icon: "Warehouse".to_string(),
                url: "/wms".to_string(),
                service: "wms".to_string(),
                parent_id: None,
                order: 6,
                is_visible: true,
                badge_count: None,
            },
            NavigationMenu {
                id: "7".to_string(),
                name: "审批中心".to_string(),
                icon: "CheckSquare".to_string(),
                url: "/workflow".to_string(),
                service: "workflow".to_string(),
                parent_id: None,
                order: 7,
                is_visible: true,
                badge_count: Some(8),
            },
            NavigationMenu {
                id: "8".to_string(),
                name: "系统管理".to_string(),
                icon: "Settings".to_string(),
                url: "/iam".to_string(),
                service: "iam".to_string(),
                parent_id: None,
                order: 8,
                is_visible: true,
                badge_count: None,
            },
        ]
    }

    pub fn get_pinned_apps(&self) -> Vec<PinnedApp> {
        vec![
            PinnedApp {
                id: "1".to_string(),
                app_id: "erp".to_string(),
                app_name: "ERP系统".to_string(),
                icon: "Package".to_string(),
                url: "/erp".to_string(),
                order: 1,
            },
            PinnedApp {
                id: "2".to_string(),
                app_id: "bi".to_string(),
                app_name: "BI分析".to_string(),
                icon: "BarChart3".to_string(),
                url: "/bi".to_string(),
                order: 2,
            },
            PinnedApp {
                id: "3".to_string(),
                app_id: "workflow".to_string(),
                app_name: "审批中心".to_string(),
                icon: "CheckSquare".to_string(),
                url: "/workflow".to_string(),
                order: 3,
            },
        ]
    }

    pub fn add_pinned_app(&self, app: PinnedApp) -> PinnedApp {
        app
    }

    pub fn remove_pinned_app(&self, id: String) -> serde_json::Value {
        serde_json::json!({ "id": id })
    }

    pub fn reorder_pinned_apps(&self, apps: Vec<PinnedApp>) -> Vec<PinnedApp> {
        apps
    }
}

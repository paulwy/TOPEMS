use crate::models::{DashboardStats, QuickAccess};

pub struct DashboardService;

impl DashboardService {
    pub fn new() -> Self {
        Self
    }

    pub fn get_stats(&self) -> DashboardStats {
        DashboardStats {
            total_users: 1256,
            active_users: 892,
            total_services: 18,
            healthy_services: 16,
            pending_tasks: 23,
            pending_approvals: 8,
            new_notifications: 15,
            system_uptime: 86400 * 7,
        }
    }

    pub fn get_quick_access(&self) -> Vec<QuickAccess> {
        vec![
            QuickAccess {
                id: "1".to_string(),
                name: "ERP系统".to_string(),
                icon: "Package".to_string(),
                url: "/erp".to_string(),
                service: "erp".to_string(),
                category: "business".to_string(),
            },
            QuickAccess {
                id: "2".to_string(),
                name: "BI报表".to_string(),
                icon: "BarChart3".to_string(),
                url: "/bi".to_string(),
                service: "bi".to_string(),
                category: "analytics".to_string(),
            },
            QuickAccess {
                id: "3".to_string(),
                name: "MES生产".to_string(),
                icon: "Factory".to_string(),
                url: "/mes".to_string(),
                service: "mes".to_string(),
                category: "business".to_string(),
            },
            QuickAccess {
                id: "4".to_string(),
                name: "审批中心".to_string(),
                icon: "CheckSquare".to_string(),
                url: "/workflow".to_string(),
                service: "workflow".to_string(),
                category: "system".to_string(),
            },
            QuickAccess {
                id: "5".to_string(),
                name: "仓储管理".to_string(),
                icon: "Warehouse".to_string(),
                url: "/wms".to_string(),
                service: "wms".to_string(),
                category: "business".to_string(),
            },
            QuickAccess {
                id: "6".to_string(),
                name: "质量管理".to_string(),
                icon: "ShieldCheck".to_string(),
                url: "/qms".to_string(),
                service: "qms".to_string(),
                category: "business".to_string(),
            },
            QuickAccess {
                id: "7".to_string(),
                name: "人力资源".to_string(),
                icon: "Users".to_string(),
                url: "/hrm".to_string(),
                service: "hrm".to_string(),
                category: "business".to_string(),
            },
            QuickAccess {
                id: "8".to_string(),
                name: "客户管理".to_string(),
                icon: "UserPlus".to_string(),
                url: "/crm".to_string(),
                service: "crm".to_string(),
                category: "business".to_string(),
            },
            QuickAccess {
                id: "9".to_string(),
                name: "供应链".to_string(),
                icon: "Network".to_string(),
                url: "/scm".to_string(),
                service: "scm".to_string(),
                category: "business".to_string(),
            },
            QuickAccess {
                id: "10".to_string(),
                name: "系统管理".to_string(),
                icon: "Settings".to_string(),
                url: "/iam".to_string(),
                service: "iam".to_string(),
                category: "system".to_string(),
            },
        ]
    }

    pub fn add_quick_access(&self, access: QuickAccess) -> QuickAccess {
        access
    }

    pub fn remove_quick_access(&self, id: String) -> serde_json::Value {
        serde_json::json!({ "id": id, "success": true, "message": "快捷访问已移除" })
    }
}

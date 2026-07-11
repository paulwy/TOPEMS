use crate::models::QuickAction;

pub struct QuickActionService;

impl QuickActionService {
    pub fn new() -> Self {
        Self
    }

    pub fn get_quick_actions(&self) -> Vec<QuickAction> {
        vec![
            QuickAction {
                id: "1".to_string(),
                name: "新建采购单".to_string(),
                description: "快速创建采购订单".to_string(),
                icon: "ShoppingCart".to_string(),
                action_type: "create".to_string(),
                target_url: "/scm/purchase-orders/create".to_string(),
                service: "scm".to_string(),
                is_favorite: true,
                usage_count: 45,
            },
            QuickAction {
                id: "2".to_string(),
                name: "快速审批".to_string(),
                description: "审批待处理的流程".to_string(),
                icon: "CheckCircle".to_string(),
                action_type: "navigate".to_string(),
                target_url: "/workflow/pending".to_string(),
                service: "workflow".to_string(),
                is_favorite: true,
                usage_count: 120,
            },
            QuickAction {
                id: "3".to_string(),
                name: "库存盘点".to_string(),
                description: "查看当前库存状态".to_string(),
                icon: "PackageCheck".to_string(),
                action_type: "navigate".to_string(),
                target_url: "/wms/inventory/stocktake".to_string(),
                service: "wms".to_string(),
                is_favorite: false,
                usage_count: 23,
            },
            QuickAction {
                id: "4".to_string(),
                name: "设备报修".to_string(),
                description: "创建设备维修工单".to_string(),
                icon: "Wrench".to_string(),
                action_type: "create".to_string(),
                target_url: "/mes/equipment/report".to_string(),
                service: "mes".to_string(),
                is_favorite: false,
                usage_count: 15,
            },
            QuickAction {
                id: "5".to_string(),
                name: "生成报表".to_string(),
                description: "快速生成经营报表".to_string(),
                icon: "FileBarChart".to_string(),
                action_type: "action".to_string(),
                target_url: "/bi/reports/generate".to_string(),
                service: "bi".to_string(),
                is_favorite: true,
                usage_count: 38,
            },
        ]
    }

    pub fn get_favorite_actions(&self) -> Vec<QuickAction> {
        self.get_quick_actions()
            .into_iter()
            .filter(|a| a.is_favorite)
            .collect()
    }

    pub fn toggle_favorite(&self, id: String) -> QuickAction {
        let mut action = self
            .get_quick_actions()
            .into_iter()
            .find(|a| a.id == id)
            .unwrap_or_default();
        action.is_favorite = !action.is_favorite;
        action
    }

    pub fn execute_action(&self, id: String) -> serde_json::Value {
        serde_json::json!({ "id": id, "executed": true })
    }
}

impl Default for QuickAction {
    fn default() -> Self {
        QuickAction {
            id: "".to_string(),
            name: "".to_string(),
            description: "".to_string(),
            icon: "".to_string(),
            action_type: "".to_string(),
            target_url: "".to_string(),
            service: "".to_string(),
            is_favorite: false,
            usage_count: 0,
        }
    }
}

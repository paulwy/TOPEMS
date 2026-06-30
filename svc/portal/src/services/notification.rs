use crate::models::Notification;

pub struct NotificationService;

impl NotificationService {
    pub fn new() -> Self {
        Self
    }

    pub fn get_notifications(&self) -> Vec<Notification> {
        vec![
            Notification {
                id: "notif-001".to_string(),
                title: "待审批提醒".to_string(),
                content: "有3条审批请求等待处理".to_string(),
                service: "hrm".to_string(),
                service_name: "人力资源".to_string(),
                notification_type: "approval".to_string(),
                read: false,
                created_at: chrono::Utc::now() - chrono::Duration::minutes(10),
                link_url: Some("http://localhost:3005/approval".to_string()),
            },
            Notification {
                id: "notif-002".to_string(),
                title: "系统维护通知".to_string(),
                content: "本周六凌晨2点-4点将进行系统维护，请提前做好数据备份".to_string(),
                service: "system".to_string(),
                service_name: "系统管理".to_string(),
                notification_type: "system".to_string(),
                read: false,
                created_at: chrono::Utc::now() - chrono::Duration::hours(2),
                link_url: None,
            },
            Notification {
                id: "notif-003".to_string(),
                title: "试验完成提醒".to_string(),
                content: "您负责的试验'新型材料性能测试'已完成".to_string(),
                service: "rs".to_string(),
                service_name: "科研研发".to_string(),
                notification_type: "info".to_string(),
                read: true,
                created_at: chrono::Utc::now() - chrono::Duration::hours(4),
                link_url: Some("http://localhost:3007/experiments/123".to_string()),
            },
            Notification {
                id: "notif-004".to_string(),
                title: "库存预警".to_string(),
                content: "试剂'乙醇'库存不足，当前库存: 50ml".to_string(),
                service: "lims".to_string(),
                service_name: "实验室".to_string(),
                notification_type: "warning".to_string(),
                read: false,
                created_at: chrono::Utc::now() - chrono::Duration::hours(6),
                link_url: Some("http://localhost:3002/inventory".to_string()),
            },
            Notification {
                id: "notif-005".to_string(),
                title: "会议邀请".to_string(),
                content: "邀请您参加'Q2项目进度评审会'，时间：本周四下午2点".to_string(),
                service: "system".to_string(),
                service_name: "系统管理".to_string(),
                notification_type: "info".to_string(),
                read: true,
                created_at: chrono::Utc::now() - chrono::Duration::days(1),
                link_url: None,
            },
        ]
    }

    pub fn mark_as_read(&self, id: String) -> serde_json::Value {
        serde_json::json!({ "id": id, "read": true })
    }

    pub fn mark_all_as_read(&self) -> serde_json::Value {
        serde_json::json!({ "count": 5 })
    }
}

use crate::models::{Announcement, NewAnnouncement};

pub struct AnnouncementService;

impl AnnouncementService {
    pub fn new() -> Self {
        Self
    }

    pub fn get_announcements(&self) -> Vec<Announcement> {
        vec![
            Announcement {
                id: "1".to_string(),
                title: "系统维护通知".to_string(),
                content: "计划于本周六凌晨2:00-4:00进行系统维护，届时系统将暂停服务。请提前做好数据保存工作。".to_string(),
                announcement_type: "maintenance".to_string(),
                priority: "high".to_string(),
                is_pinned: true,
                is_active: true,
                created_at: chrono::Utc::now() - chrono::Duration::days(1),
                expires_at: chrono::Utc::now() + chrono::Duration::days(3),
                author: "系统管理员".to_string(),
            },
            Announcement {
                id: "2".to_string(),
                title: "新功能上线公告".to_string(),
                content: "BI数据分析模块已完成升级，新增多维分析和预测分析功能。请各位用户体验并反馈问题。".to_string(),
                announcement_type: "feature".to_string(),
                priority: "medium".to_string(),
                is_pinned: true,
                is_active: true,
                created_at: chrono::Utc::now() - chrono::Duration::hours(12),
                expires_at: chrono::Utc::now() + chrono::Duration::days(7),
                author: "产品经理".to_string(),
            },
            Announcement {
                id: "3".to_string(),
                title: "安全提醒".to_string(),
                content: "近期发现有恶意登录尝试，请各位用户确保密码强度，并开启双因素认证。".to_string(),
                announcement_type: "security".to_string(),
                priority: "high".to_string(),
                is_pinned: false,
                is_active: true,
                created_at: chrono::Utc::now() - chrono::Duration::hours(6),
                expires_at: chrono::Utc::now() + chrono::Duration::days(5),
                author: "安全管理员".to_string(),
            },
        ]
    }

    pub fn get_announcement(&self, id: String) -> Announcement {
        self.get_announcements()
            .into_iter()
            .find(|a| a.id == id)
            .unwrap_or_default()
    }

    pub fn create_announcement(&self, data: NewAnnouncement) -> Announcement {
        Announcement {
            id: uuid::Uuid::new_v4().to_string(),
            title: data.title,
            content: data.content,
            announcement_type: data.announcement_type,
            priority: data.priority,
            is_pinned: false,
            is_active: true,
            created_at: chrono::Utc::now(),
            expires_at: chrono::Utc::now() + chrono::Duration::days(7),
            author: "当前用户".to_string(),
        }
    }

    pub fn update_announcement(&self, id: String, data: NewAnnouncement) -> Announcement {
        let mut announcement = self.get_announcement(id);
        announcement.title = data.title;
        announcement.content = data.content;
        announcement.announcement_type = data.announcement_type;
        announcement.priority = data.priority;
        announcement
    }

    pub fn delete_announcement(&self, id: String) -> serde_json::Value {
        serde_json::json!({ "id": id })
    }

    pub fn toggle_pin(&self, id: String) -> Announcement {
        let mut announcement = self.get_announcement(id);
        announcement.is_pinned = !announcement.is_pinned;
        announcement
    }

    pub fn get_pinned_announcements(&self) -> Vec<Announcement> {
        self.get_announcements()
            .into_iter()
            .filter(|a| a.is_pinned)
            .collect()
    }
}

impl Default for Announcement {
    fn default() -> Self {
        Announcement {
            id: "".to_string(),
            title: "".to_string(),
            content: "".to_string(),
            announcement_type: "".to_string(),
            priority: "".to_string(),
            is_pinned: false,
            is_active: false,
            created_at: chrono::Utc::now(),
            expires_at: chrono::Utc::now(),
            author: "".to_string(),
        }
    }
}

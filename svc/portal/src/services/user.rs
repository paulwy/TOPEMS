use crate::models::UserInfo;

pub struct UserService;

impl UserService {
    pub fn new() -> Self {
        Self
    }

    pub fn get_user_info(&self) -> UserInfo {
        UserInfo {
            id: "user-001".to_string(),
            name: "张三".to_string(),
            email: "zhangsan@topems.com".to_string(),
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=zhangsan".to_string(),
            department: "研发部".to_string(),
            role: "高级研究员".to_string(),
            last_login: "2026-05-25 09:00:00".to_string(),
        }
    }
}

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
struct ServiceDto {
    id: String,
    name: String,
    description: String,
    url: String,
    icon: String,
    status: String,
    category: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
struct Todo {
    id: String,
    title: String,
    service: String,
    service_name: String,
    due_date: String,
    priority: String,
    completed: bool,
    todo_type: String,
    link_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
struct UserInfo {
    id: String,
    name: String,
    email: String,
    avatar: String,
    department: String,
    role: String,
    last_login: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[allow(dead_code)]
struct MonitoringService {
    service_name: String,
    status: String,
    response_time_ms: u64,
    last_check: String,
    message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[allow(dead_code)]
struct MonitoringMetrics {
    requests_total: u64,
    requests_success: u64,
    requests_failed: u64,
    avg_response_time_ms: u64,
    active_connections: u64,
    memory_usage_mb: u64,
    cpu_usage_percent: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[allow(dead_code)]
struct Alert {
    id: String,
    rule_name: String,
    severity: String,
    message: String,
    #[serde(with = "chrono::serde::ts_seconds")]
    triggered_at: DateTime<Utc>,
    acknowledged: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[allow(dead_code)]
struct LogEntry {
    #[serde(with = "chrono::serde::ts_seconds")]
    timestamp: DateTime<Utc>,
    level: String,
    service: String,
    message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[allow(dead_code)]
struct Notification {
    id: String,
    title: String,
    content: String,
    service: String,
    service_name: String,
    notification_type: String,
    read: bool,
    #[serde(with = "chrono::serde::ts_seconds")]
    created_at: DateTime<Utc>,
    link_url: Option<String>,
}

#[cfg(test)]
mod service_dto_tests {
    use super::*;

    #[test]
    fn test_service_dto_creation() {
        let service = ServiceDto {
            id: "rs".to_string(),
            name: "科研研发".to_string(),
            description: "科研项目管理系统".to_string(),
            url: "http://localhost:8020".to_string(),
            icon: "FlaskConical".to_string(),
            status: "running".to_string(),
            category: "研发".to_string(),
        };

        assert_eq!(service.id, "rs");
        assert_eq!(service.name, "科研研发");
        assert_eq!(service.status, "running");
    }

    #[test]
    fn test_service_statuses() {
        let statuses = vec!["running", "stopped", "maintenance"];

        for status in statuses {
            let service = ServiceDto {
                id: "test".to_string(),
                name: "Test Service".to_string(),
                description: "".to_string(),
                url: "".to_string(),
                icon: "".to_string(),
                status: status.to_string(),
                category: "test".to_string(),
            };

            assert_eq!(service.status, status);
        }
    }

    #[test]
    fn test_service_serialization() {
        let service = ServiceDto {
            id: "lims".to_string(),
            name: "实验室".to_string(),
            description: "实验室信息管理系统".to_string(),
            url: "http://localhost:8022".to_string(),
            icon: "Beaker".to_string(),
            status: "running".to_string(),
            category: "实验室".to_string(),
        };

        let json = serde_json::to_string(&service).unwrap();
        let deserialized: ServiceDto = serde_json::from_str(&json).unwrap();

        assert_eq!(deserialized.id, service.id);
        assert_eq!(deserialized.name, service.name);
    }
}

#[cfg(test)]
mod todo_tests {
    use super::*;

    #[test]
    fn test_todo_creation() {
        let todo = Todo {
            id: "1".to_string(),
            title: "完成项目周报".to_string(),
            service: "rs".to_string(),
            service_name: "科研研发".to_string(),
            due_date: "2024-01-15".to_string(),
            priority: "high".to_string(),
            completed: false,
            todo_type: "personal".to_string(),
            link_url: None,
        };

        assert_eq!(todo.title, "完成项目周报");
        assert_eq!(todo.priority, "high");
        assert!(!todo.completed);
    }

    #[test]
    fn test_todo_priorities() {
        let priorities = vec!["high", "medium", "low"];

        for priority in priorities {
            let todo = Todo {
                id: "1".to_string(),
                title: "Test Todo".to_string(),
                service: "test".to_string(),
                service_name: "Test".to_string(),
                due_date: "2024-01-01".to_string(),
                priority: priority.to_string(),
                completed: false,
                todo_type: "personal".to_string(),
                link_url: None,
            };

            assert_eq!(todo.priority, priority);
        }
    }

    #[test]
    fn test_todo_completion() {
        let mut todo = Todo {
            id: "1".to_string(),
            title: "Test Todo".to_string(),
            service: "test".to_string(),
            service_name: "Test".to_string(),
            due_date: "2024-01-01".to_string(),
            priority: "medium".to_string(),
            completed: false,
            todo_type: "personal".to_string(),
            link_url: None,
        };

        assert!(!todo.completed);

        todo.completed = true;
        assert!(todo.completed);
    }

    #[test]
    fn test_todo_with_link() {
        let todo = Todo {
            id: "2".to_string(),
            title: "审核报告".to_string(),
            service: "lims".to_string(),
            service_name: "实验室".to_string(),
            due_date: "2024-01-10".to_string(),
            priority: "high".to_string(),
            completed: false,
            todo_type: "approval".to_string(),
            link_url: Some("http://localhost:3002/reports/123".to_string()),
        };

        assert!(todo.link_url.is_some());
        assert_eq!(todo.link_url.unwrap(), "http://localhost:3002/reports/123");
        assert_eq!(todo.todo_type, "approval");
    }
}

#[cfg(test)]
mod user_info_tests {
    use super::*;

    #[test]
    fn test_user_info_creation() {
        let user = UserInfo {
            id: "user-001".to_string(),
            name: "张三".to_string(),
            email: "zhangsan@topems.com".to_string(),
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=zhangsan".to_string(),
            department: "研发部".to_string(),
            role: "高级研究员".to_string(),
            last_login: "2024-01-10 09:00:00".to_string(),
        };

        assert_eq!(user.name, "张三");
        assert_eq!(user.department, "研发部");
        assert_eq!(user.role, "高级研究员");
    }

    #[test]
    fn test_user_info_email_format() {
        let user = UserInfo {
            id: "user-002".to_string(),
            name: "李四".to_string(),
            email: "lisi@topems.com".to_string(),
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=lisi".to_string(),
            department: "市场部".to_string(),
            role: "经理".to_string(),
            last_login: "2024-01-11 10:00:00".to_string(),
        };

        assert!(user.email.contains("@"));
        assert_eq!(user.department, "市场部");
    }
}

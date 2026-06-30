use crate::models::{NewTodo, Todo};

pub struct TodoService;

impl TodoService {
    pub fn new() -> Self {
        Self
    }

    pub fn get_todos(&self) -> Vec<Todo> {
        vec![
            Todo {
                id: "1".to_string(),
                title: "完成项目周报".to_string(),
                service: "rs".to_string(),
                service_name: "科研研发".to_string(),
                due_date: "2026-05-26".to_string(),
                priority: "high".to_string(),
                completed: false,
                todo_type: "personal".to_string(),
                link_url: None,
            },
            Todo {
                id: "2".to_string(),
                title: "审核检验报告".to_string(),
                service: "lims".to_string(),
                service_name: "实验室".to_string(),
                due_date: "2026-05-26".to_string(),
                priority: "high".to_string(),
                completed: false,
                todo_type: "approval".to_string(),
                link_url: Some("http://localhost:3002/reports/123".to_string()),
            },
            Todo {
                id: "3".to_string(),
                title: "提交专利申请材料".to_string(),
                service: "rs".to_string(),
                service_name: "科研研发".to_string(),
                due_date: "2026-05-28".to_string(),
                priority: "medium".to_string(),
                completed: false,
                todo_type: "personal".to_string(),
                link_url: None,
            },
            Todo {
                id: "4".to_string(),
                title: "更新BI报表数据".to_string(),
                service: "bi".to_string(),
                service_name: "数据大屏".to_string(),
                due_date: "2026-05-27".to_string(),
                priority: "low".to_string(),
                completed: false,
                todo_type: "system".to_string(),
                link_url: None,
            },
            Todo {
                id: "5".to_string(),
                title: "设备维护保养".to_string(),
                service: "lims".to_string(),
                service_name: "实验室".to_string(),
                due_date: "2026-05-29".to_string(),
                priority: "medium".to_string(),
                completed: false,
                todo_type: "notification".to_string(),
                link_url: Some("http://localhost:3002/equipment/maintenance".to_string()),
            },
            Todo {
                id: "6".to_string(),
                title: "审批员工请假申请".to_string(),
                service: "hrm".to_string(),
                service_name: "人力资源".to_string(),
                due_date: "2026-05-25".to_string(),
                priority: "high".to_string(),
                completed: false,
                todo_type: "approval".to_string(),
                link_url: Some("http://localhost:3005/leave/approval".to_string()),
            },
        ]
    }

    pub fn add_todo(&self, todo: NewTodo) -> Todo {
        let id = uuid::Uuid::new_v4().to_string();
        Todo {
            id,
            title: todo.title,
            service: todo.service.clone(),
            service_name: get_service_name(&todo.service),
            due_date: todo.due_date,
            priority: todo.priority,
            completed: false,
            todo_type: "personal".to_string(),
            link_url: None,
        }
    }

    pub fn complete_todo(&self, id: String) -> serde_json::Value {
        serde_json::json!({ "id": id })
    }

    pub fn delete_todo(&self, id: String) -> serde_json::Value {
        serde_json::json!({ "id": id })
    }
}

fn get_service_name(service_id: &str) -> String {
    match service_id {
        "rs" => "科研研发".to_string(),
        "lims" => "实验室".to_string(),
        "bi" => "数据大屏".to_string(),
        "gis" => "厂区GIS".to_string(),
        "hrm" => "人力资源".to_string(),
        "erp" => "企业资源".to_string(),
        "mes" => "生产执行".to_string(),
        "wms" => "仓储管理".to_string(),
        "scm" => "供应链".to_string(),
        "qms" => "质量管理".to_string(),
        "ehs" => "EHS".to_string(),
        "im" => "即时通讯".to_string(),
        _ => "未知服务".to_string(),
    }
}

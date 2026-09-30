//! HRM 人力资源管理模块数据模型

use serde::{Deserialize, Serialize};

/// 员工列表项
#[derive(Debug, Serialize, Deserialize)]
pub struct Employee {
    pub id: String,
    pub employee_number: Option<String>,
    pub name: Option<String>,
    pub gender: Option<String>,
    pub job_title: Option<String>,
    pub department_id: Option<String>,
    pub hire_date: Option<chrono::NaiveDate>,
}

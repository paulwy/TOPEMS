//! Shared module for quality-assurance service
//! Contains unified types and utilities

pub mod permission;

use serde::{Deserialize, Serialize};

/// Shared quality standards
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QualityStandard {
    pub id: String,
    pub code: String,
    pub name: String,
    pub category: String,
    pub level: String,
    pub description: Option<String>,
}

impl Default for QualityStandard {
    fn default() -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            code: String::new(),
            name: String::new(),
            category: "quality".to_string(),
            level: "national".to_string(),
            description: None,
        }
    }
}

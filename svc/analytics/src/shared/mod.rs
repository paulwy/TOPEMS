//! Shared module for analytics service
//! Contains unified types and utilities

use serde::{Deserialize, Serialize};

/// Chart configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChartConfig {
    pub chart_type: String,
    pub title: Option<String>,
    pub x_axis: String,
    pub y_axis: Vec<String>,
    pub color_scheme: Option<String>,
}

impl Default for ChartConfig {
    fn default() -> Self {
        Self {
            chart_type: "line".to_string(),
            title: None,
            x_axis: String::new(),
            y_axis: vec![],
            color_scheme: None,
        }
    }
}

//! Shared module for manufacturing service
//! Contains unified types and utilities for MES and PDM

use serde::{Deserialize, Serialize};

/// Shared production configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductionConfig {
    pub enable_auto_schedule: bool,
    pub default_lead_time: i32,
    pub quality_check_interval: i32,
}

impl Default for ProductionConfig {
    fn default() -> Self {
        Self {
            enable_auto_schedule: true,
            default_lead_time: 7,
            quality_check_interval: 60,
        }
    }
}

/// Shared product configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductConfig {
    pub enable_version_control: bool,
    pub default_status: String,
    pub auto_approve_changes: bool,
}

impl Default for ProductConfig {
    fn default() -> Self {
        Self {
            enable_version_control: true,
            default_status: "draft".to_string(),
            auto_approve_changes: false,
        }
    }
}

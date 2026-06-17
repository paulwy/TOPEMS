//! Plugin data models

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::{DateTime, Utc};

/// Plugin entity
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Plugin {
    pub id: uuid::Uuid,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub version: String,
    
    #[serde(rename = "plugin_type")]
    pub plugin_type: String,
    
    #[serde(rename = "is_installed")]
    pub is_installed: bool,
    
    #[serde(rename = "installed_at")]
    pub installed_at: Option<DateTime<Utc>>,
    
    #[serde(rename = "is_active")]
    pub is_active: bool,
    
    #[serde(rename = "activated_at")]
    pub activated_at: Option<DateTime<Utc>>,
    
    #[serde(rename = "is_free")]
    pub is_free: bool,
    
    #[serde(rename = "price_cents")]
    pub price_cents: Option<i32>,
    
    #[serde(rename = "remote_url")]
    pub remote_url: Option<String>,
    
    pub checksum: Option<String>,
    
    #[serde(rename = "entry_point")]
    pub entry_point: Option<String>,
    
    pub dependencies: Option<serde_json::Value>,
    
    #[serde(rename = "install_count")]
    pub install_count: Option<i32>,
    
    pub rating: Option<rust_decimal::Decimal>,
    
    #[serde(rename = "rating_count")]
    pub rating_count: Option<i32>,
    
    #[serde(rename = "is_published")]
    pub is_published: bool,
    
    #[serde(rename = "is_featured")]
    pub is_featured: Option<bool>,
    
    #[serde(rename = "is_recommended")]
    pub is_recommended: Option<bool>,
    
    #[serde(rename = "author_name")]
    pub author_name: Option<String>,
    
    #[serde(rename = "author_url")]
    pub author_url: Option<String>,
    
    #[serde(rename = "homepage_url")]
    pub homepage_url: Option<String>,
    
    pub screenshots: Option<serde_json::Value>,
    
    pub tags: Option<Vec<String>>,
    
    pub category: Option<String>,
    
    #[serde(rename = "created_at")]
    pub created_at: DateTime<Utc>,
    
    #[serde(rename = "updated_at")]
    pub updated_at: DateTime<Utc>,
    
    #[serde(rename = "published_at")]
    pub published_at: Option<DateTime<Utc>>,
}

/// Plugin version
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct PluginVersion {
    pub id: uuid::Uuid,
    #[serde(rename = "plugin_id")]
    pub plugin_id: uuid::Uuid,
    pub version: String,
    
    #[serde(rename = "release_notes")]
    pub release_notes: Option<String>,
    
    #[serde(rename = "is_stable")]
    pub is_stable: Option<bool>,
    
    #[serde(rename = "is_latest")]
    pub is_latest: Option<bool>,
    
    #[serde(rename = "download_url")]
    pub download_url: Option<String>,
    
    pub checksum: Option<String>,
    
    #[serde(rename = "file_size")]
    pub file_size: Option<i64>,
    
    #[serde(rename = "min_app_version")]
    pub min_app_version: Option<String>,
    
    #[serde(rename = "created_at")]
    pub created_at: DateTime<Utc>,
}

/// Plugin review
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct PluginReview {
    pub id: uuid::Uuid,
    #[serde(rename = "plugin_id")]
    pub plugin_id: uuid::Uuid,
    #[serde(rename = "user_id")]
    pub user_id: uuid::Uuid,
    
    #[serde(rename = "user_name")]
    pub user_name: Option<String>,
    
    pub rating: Option<i16>,
    pub title: Option<String>,
    pub content: Option<String>,
    
    #[serde(rename = "is_verified_purchase")]
    pub is_verified_purchase: Option<bool>,
    
    #[serde(rename = "is_featured")]
    pub is_featured: Option<bool>,
    
    #[serde(rename = "helpful_count")]
    pub helpful_count: Option<i32>,
    
    #[serde(rename = "created_at")]
    pub created_at: DateTime<Utc>,
}

/// Tenant plugin installation
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct TenantPlugin {
    pub id: uuid::Uuid,
    #[serde(rename = "tenant_id")]
    pub tenant_id: uuid::Uuid,
    #[serde(rename = "plugin_id")]
    pub plugin_id: uuid::Uuid,
    
    #[serde(rename = "installed_version")]
    pub installed_version: Option<String>,
    
    #[serde(rename = "is_active")]
    pub is_active: bool,
    
    #[serde(rename = "license_type")]
    pub license_type: Option<String>,
    
    #[serde(rename = "license_expires_at")]
    pub license_expires_at: Option<DateTime<Utc>>,
    
    #[serde(rename = "purchase_order_id")]
    pub purchase_order_id: Option<String>,
    
    #[serde(rename = "activated_at")]
    pub activated_at: Option<DateTime<Utc>>,
    
    #[serde(rename = "last_used_at")]
    pub last_used_at: Option<DateTime<Utc>>,
    
    #[serde(rename = "usage_count")]
    pub usage_count: Option<i32>,
    
    #[serde(rename = "created_at")]
    pub created_at: DateTime<Utc>,
    
    #[serde(rename = "updated_at")]
    pub updated_at: DateTime<Utc>,
}

/// Plugin category
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct PluginCategory {
    pub id: uuid::Uuid,
    pub name: String,
    pub code: String,
    pub description: Option<String>,
    pub icon: Option<String>,
    
    #[serde(rename = "sort_order")]
    pub sort_order: Option<i32>,
    
    #[serde(rename = "plugin_count")]
    pub plugin_count: Option<i32>,
    
    #[serde(rename = "is_active")]
    pub is_active: Option<bool>,
    
    #[serde(rename = "created_at")]
    pub created_at: DateTime<Utc>,
}

// ============================================================================
// Request/Response Types
// ============================================================================

/// Request to install a plugin
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallPluginRequest {
    pub plugin_code: String,
    #[serde(rename = "license_type")]
    #[serde(default = "default_license_type")]
    pub license_type: String,
}

fn default_license_type() -> String {
    "subscription".to_string()
}

/// Request to upload a new plugin
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadPluginRequest {
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub version: String,
    #[serde(rename = "plugin_type")]
    pub plugin_type: Option<String>,
    #[serde(rename = "is_free")]
    pub is_free: Option<bool>,
    #[serde(rename = "price_cents")]
    pub price_cents: Option<i32>,
    #[serde(rename = "remote_url")]
    pub remote_url: Option<String>,
    #[serde(rename = "entry_point")]
    pub entry_point: Option<String>,
    pub dependencies: Option<Vec<String>>,
    #[serde(rename = "author_name")]
    pub author_name: Option<String>,
    #[serde(rename = "author_url")]
    pub author_url: Option<String>,
    #[serde(rename = "homepage_url")]
    pub homepage_url: Option<String>,
    pub screenshots: Option<Vec<String>>,
    pub tags: Option<Vec<String>>,
    pub category: Option<String>,
}

/// Request to upload a new plugin version
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadVersionRequest {
    pub version: String,
    #[serde(rename = "release_notes")]
    pub release_notes: Option<String>,
    #[serde(rename = "is_stable")]
    pub is_stable: Option<bool>,
    #[serde(rename = "is_latest")]
    pub is_latest: Option<bool>,
    #[serde(rename = "download_url")]
    pub download_url: Option<String>,
    pub checksum: Option<String>,
    #[serde(rename = "file_size")]
    pub file_size: Option<i64>,
    #[serde(rename = "min_app_version")]
    pub min_app_version: Option<String>,
}

/// Request to update a plugin
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdatePluginRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    #[serde(rename = "is_free")]
    pub is_free: Option<bool>,
    #[serde(rename = "price_cents")]
    pub price_cents: Option<i32>,
    #[serde(rename = "remote_url")]
    pub remote_url: Option<String>,
    #[serde(rename = "entry_point")]
    pub entry_point: Option<String>,
    pub screenshots: Option<Vec<String>>,
    pub tags: Option<Vec<String>>,
    pub category: Option<String>,
}

/// Request to create a plugin review
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateReviewRequest {
    pub rating: i16,
    pub title: Option<String>,
    pub content: String,
}

/// Plugin list filters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginFilters {
    pub category: Option<String>,
    pub search: Option<String>,
    pub is_free: Option<bool>,
    pub sort_by: Option<String>,  // 'popular' | 'rating' | 'recent' | 'name'
    pub page: Option<u32>,
    #[serde(rename = "page_size")]
    pub page_size: Option<u32>,
}

/// Paginated plugin response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginListResponse {
    pub plugins: Vec<Plugin>,
    pub total: i64,
    pub page: u32,
    #[serde(rename = "page_size")]
    pub page_size: u32,
    #[serde(rename = "total_pages")]
    pub total_pages: u32,
}

/// Plugin with installation status for a tenant
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginWithStatus {
    #[serde(flatten)]
    pub plugin: Plugin,

    pub is_owned: bool,
    pub tenant_plugin: Option<TenantPlugin>,
}

impl Default for PluginWithStatus {
    fn default() -> Self {
        Self {
            plugin: Plugin {
                id: uuid::Uuid::nil(),
                code: String::new(),
                name: String::new(),
                description: None,
                version: String::new(),
                plugin_type: String::new(),
                is_installed: false,
                installed_at: None,
                is_active: false,
                activated_at: None,
                is_free: true,
                price_cents: None,
                remote_url: None,
                checksum: None,
                entry_point: None,
                dependencies: None,
                install_count: None,
                rating: None,
                rating_count: None,
                is_published: false,
                is_featured: None,
                is_recommended: None,
                author_name: None,
                author_url: None,
                homepage_url: None,
                screenshots: None,
                tags: None,
                category: None,
                created_at: chrono::Utc::now(),
                updated_at: chrono::Utc::now(),
                published_at: None,
            },
            is_owned: false,
            tenant_plugin: None,
        }
    }
}

/// Tenant plugin with plugin details (for list_tenant_plugins)
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct TenantPluginWithDetails {
    // TenantPlugin fields
    pub id: uuid::Uuid,
    pub tenant_id: uuid::Uuid,
    pub plugin_id: uuid::Uuid,
    pub installed_version: Option<String>,
    pub is_active: bool,
    pub license_type: Option<String>,
    pub license_expires_at: Option<DateTime<Utc>>,
    pub purchase_order_id: Option<String>,
    pub activated_at: Option<DateTime<Utc>>,
    pub last_used_at: Option<DateTime<Utc>>,
    pub usage_count: Option<i32>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    // Plugin fields (prefixed to avoid conflicts)
    pub plugin_code: String,
    pub plugin_name: String,
    pub plugin_description: Option<String>,
    pub plugin_version: String,
    pub plugin_category: Option<String>,
    pub is_free: bool,
    pub price_cents: Option<i32>,
    pub install_count: Option<i32>,
    pub rating: Option<rust_decimal::Decimal>,
    pub rating_count: Option<i32>,
}

/// Marketplace summary
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketplaceSummary {
    pub total_plugins: i64,
    pub categories: Vec<PluginCategory>,
    pub featured_plugins: Vec<Plugin>,
    pub new_plugins: Vec<Plugin>,
    pub top_rated: Vec<Plugin>,
}

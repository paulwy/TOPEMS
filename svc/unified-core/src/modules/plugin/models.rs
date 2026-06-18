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

// ============================================================================
// Review & Statistics Types
// ============================================================================

/// Plugin review
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginReview {
    pub id: uuid::Uuid,
    #[serde(rename = "plugin_id")]
    pub plugin_id: uuid::Uuid,
    #[serde(rename = "user_id")]
    pub user_id: uuid::Uuid,
    #[serde(rename = "user_name")]
    pub user_name: Option<String>,
    #[serde(rename = "user_avatar")]
    pub user_avatar: Option<String>,
    pub rating: i32,
    pub title: Option<String>,
    pub content: Option<String>,
    #[serde(rename = "is_verified_purchase")]
    pub is_verified_purchase: Option<bool>,
    #[serde(rename = "is_featured")]
    pub is_featured: Option<bool>,
    #[serde(rename = "helpful_count")]
    pub helpful_count: Option<i32>,
    pub replies: Option<Vec<ReviewReply>>,
    #[serde(rename = "created_at")]
    pub created_at: DateTime<Utc>,
    #[serde(rename = "updated_at")]
    pub updated_at: DateTime<Utc>,
}

/// Review reply
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReviewReply {
    pub id: uuid::Uuid,
    #[serde(rename = "review_id")]
    pub review_id: uuid::Uuid,
    #[serde(rename = "user_id")]
    pub user_id: uuid::Uuid,
    #[serde(rename = "user_name")]
    pub user_name: Option<String>,
    pub content: String,
    #[serde(rename = "created_at")]
    pub created_at: DateTime<Utc>,
}

/// Review request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReviewRequest {
    pub rating: i32,
    pub title: Option<String>,
    pub content: Option<String>,
}

/// Review filter parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReviewFilterParams {
    /// Sort by field: rating, created_at, helpful_count, is_featured
    pub sort_by: Option<String>,
    /// Sort order: asc, desc
    pub sort_order: Option<String>,
    /// Filter by minimum rating (1-5)
    pub min_rating: Option<i32>,
    /// Filter by maximum rating (1-5)
    pub max_rating: Option<i32>,
    /// Filter verified purchase only
    pub verified_only: Option<bool>,
    /// Filter featured only
    pub featured_only: Option<bool>,
    /// Filter by date range start
    pub from_date: Option<String>,
    /// Filter by date range end
    pub to_date: Option<String>,
    /// Search in title and content
    pub search: Option<String>,
}

/// Review sorting options
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ReviewSortField {
    #[serde(rename = "rating")]
    Rating,
    #[serde(rename = "created_at")]
    CreatedAt,
    #[serde(rename = "helpful_count")]
    HelpfulCount,
    #[serde(rename = "is_featured")]
    IsFeatured,
}

/// Review sorting configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReviewSortConfig {
    pub field: ReviewSortField,
    pub descending: bool,
}

/// Plugin statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginStatistics {
    #[serde(rename = "plugin_id")]
    pub plugin_id: uuid::Uuid,
    #[serde(rename = "plugin_code")]
    pub plugin_code: String,
    #[serde(rename = "total_downloads")]
    pub total_downloads: i64,
    #[serde(rename = "monthly_downloads")]
    pub monthly_downloads: i64,
    #[serde(rename = "weekly_downloads")]
    pub weekly_downloads: i64,
    #[serde(rename = "daily_downloads")]
    pub daily_downloads: i64,
    #[serde(rename = "total_reviews")]
    pub total_reviews: i64,
    #[serde(rename = "average_rating")]
    pub average_rating: f64,
    #[serde(rename = "rating_distribution")]
    pub rating_distribution: Option<serde_json::Value>,
    #[serde(rename = "active_installs")]
    pub active_installs: Option<i64>,
    #[serde(rename = "trending_score")]
    pub trending_score: Option<f64>,
}

/// Download record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadRecord {
    pub id: uuid::Uuid,
    #[serde(rename = "plugin_id")]
    pub plugin_id: uuid::Uuid,
    #[serde(rename = "user_id")]
    pub user_id: Option<uuid::Uuid>,
    #[serde(rename = "version")]
    pub version: String,
    #[serde(rename = "download_date")]
    pub download_date: DateTime<Utc>,
    #[serde(rename = "ip_address")]
    pub ip_address: Option<String>,
    #[serde(rename = "user_agent")]
    pub user_agent: Option<String>,
}

/// Review statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReviewStatistics {
    #[serde(rename = "plugin_id")]
    pub plugin_id: uuid::Uuid,
    #[serde(rename = "total_reviews")]
    pub total_reviews: i64,
    #[serde(rename = "average_rating")]
    pub average_rating: f64,
    #[serde(rename = "rating_5_count")]
    pub rating_5_count: i64,
    #[serde(rename = "rating_4_count")]
    pub rating_4_count: i64,
    #[serde(rename = "rating_3_count")]
    pub rating_3_count: i64,
    #[serde(rename = "rating_2_count")]
    pub rating_2_count: i64,
    #[serde(rename = "rating_1_count")]
    pub rating_1_count: i64,
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

// ============================================================================
// Plugin Runtime & Registration Types
// ============================================================================

/// 插件运行时状态
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct PluginInstance {
    pub id: uuid::Uuid,
    pub plugin_id: uuid::Uuid,
    pub runtime_url: Option<String>,
    pub runtime_status: String,
    pub base_path: Option<String>,
    pub last_heartbeat: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

/// 插件权限定义
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct PluginPermission {
    pub id: uuid::Uuid,
    pub plugin_code: String,
    pub permission_code: String,
    pub permission_name: Option<String>,
    pub resource_type: Option<String>,
    pub action: Option<String>,
    pub created_at: DateTime<Utc>,
}

/// 请求注册插件
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegisterPluginRequest {
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub version: String,
    pub runtime_url: String,
    pub base_path: Option<String>,
    pub permissions: Vec<PermissionDef>,
}

/// 权限定义
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionDef {
    pub code: String,
    pub name: String,
    pub resource_type: String,
    pub action: String,
}

/// 心跳请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginHeartbeatRequest {
    pub status: String,
    pub version: Option<String>,
}

/// 插件运行时状态（带插件信息）
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct PluginWithRuntimeStatus {
    pub id: uuid::Uuid,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub version: String,
    pub plugin_type: String,
    pub is_published: bool,
    pub category: Option<String>,
    pub runtime_status: Option<String>,
    pub runtime_url: Option<String>,
    pub base_path: Option<String>,
    pub last_heartbeat: Option<DateTime<Utc>>,
}

// ============================================================================
// Version Management Types
// ============================================================================

/// 版本对比请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VersionCompareRequest {
    #[serde(rename = "from_version")]
    pub from_version: String,
    #[serde(rename = "to_version")]
    pub to_version: String,
}

/// 版本对比结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VersionCompareResult {
    #[serde(rename = "from_version")]
    pub from_version: String,
    #[serde(rename = "to_version")]
    pub to_version: String,
    pub changes: Vec<VersionChange>,
}

/// 版本变更项
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VersionChange {
    pub change_type: String,  // 'feature' | 'bugfix' | 'improvement' | 'breaking'
    pub description: String,
    pub affected_components: Option<Vec<String>>,
}

/// 升级检测结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpgradeCheckResult {
    #[serde(rename = "current_version")]
    pub current_version: String,
    #[serde(rename = "latest_version")]
    pub latest_version: String,
    #[serde(rename = "has_update")]
    pub has_update: bool,
    #[serde(rename = "is_minor")]
    pub is_minor: bool,
    #[serde(rename = "is_major")]
    pub is_major: bool,
    #[serde(rename = "release_notes")]
    pub release_notes: Option<String>,
    #[serde(rename = "update_available_at")]
    pub update_available_at: Option<DateTime<Utc>>,
}

/// 版本回滚请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RollbackRequest {
    #[serde(rename = "target_version")]
    pub target_version: String,
    pub backup: Option<bool>,
}

/// 版本回滚结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RollbackResult {
    #[serde(rename = "previous_version")]
    pub previous_version: String,
    #[serde(rename = "target_version")]
    pub target_version: String,
    pub success: bool,
    #[serde(rename = "backup_created")]
    pub backup_created: Option<bool>,
    pub message: String,
}

// ============================================================================
// Upgrade Task Types
// ============================================================================

/// 升级任务状态
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum UpgradeStatus {
    Pending,
    Downloading,
    Downloaded,
    Installing,
    Installed,
    Verifying,
    Completed,
    Failed,
    Rollback,
    RolledBack,
}

/// 升级任务
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpgradeTask {
    pub id: uuid::Uuid,
    pub plugin_id: uuid::Uuid,
    pub plugin_code: String,
    #[serde(rename = "from_version")]
    pub from_version: String,
    #[serde(rename = "to_version")]
    pub to_version: String,
    pub status: UpgradeStatus,
    pub progress: i32,
    pub message: Option<String>,
    #[serde(rename = "error_message")]
    pub error_message: Option<String>,
    #[serde(rename = "download_url")]
    pub download_url: Option<String>,
    #[serde(rename = "file_path")]
    pub file_path: Option<String>,
    #[serde(rename = "backup_path")]
    pub backup_path: Option<String>,
    #[serde(rename = "started_at")]
    pub started_at: DateTime<Utc>,
    #[serde(rename = "completed_at")]
    pub completed_at: Option<DateTime<Utc>>,
}

/// 升级请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpgradeRequest {
    #[serde(rename = "target_version")]
    pub target_version: String,
    pub backup: Option<bool>,
    #[serde(rename = "force_install")]
    pub force_install: Option<bool>,
}

/// 升级结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpgradeResult {
    #[serde(rename = "task_id")]
    pub task_id: uuid::Uuid,
    #[serde(rename = "from_version")]
    pub from_version: String,
    #[serde(rename = "to_version")]
    pub to_version: String,
    pub success: bool,
    pub message: String,
    #[serde(rename = "backup_created")]
    pub backup_created: Option<bool>,
    #[serde(rename = "rollback_available")]
    pub rollback_available: bool,
}

/// 验证结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerificationResult {
    pub success: bool,
    pub checks: Vec<VerificationCheck>,
    pub message: String,
}

/// 验证检查项
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerificationCheck {
    pub name: String,
    pub passed: bool,
    pub message: String,
}

// ============================================================================
// Automated Upgrade Types
// ============================================================================

/// 升级策略类型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum UpgradeStrategy {
    /// 立即升级
    Immediate,
    /// 定时升级
    Scheduled,
    /// 维护窗口期升级
    MaintenanceWindow,
    /// 手动升级
    Manual,
}

/// 升级调度配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpgradeSchedule {
    pub id: uuid::Uuid,
    pub plugin_code: String,
    pub strategy: UpgradeStrategy,
    pub enabled: bool,
    /// 定时升级的时间点（cron表达式）
    pub cron_expression: Option<String>,
    /// 维护窗口开始时间
    pub window_start: Option<String>,
    /// 维护窗口结束时间
    pub window_end: Option<String>,
    /// 允许自动升级的版本类型
    pub allowed_upgrade_types: Vec<String>,
    /// 是否自动回滚
    pub auto_rollback: bool,
    /// 回滚条件（失败后多少分钟内）
    pub rollback_window_minutes: Option<i32>,
    /// 创建时间
    pub created_at: DateTime<Utc>,
    /// 更新时间
    pub updated_at: DateTime<Utc>,
}

/// 升级队列项
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpgradeQueueItem {
    pub id: uuid::Uuid,
    pub plugin_code: String,
    pub target_version: String,
    pub priority: i32,
    pub status: UpgradeQueueStatus,
    pub scheduled_at: Option<DateTime<Utc>>,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub error_message: Option<String>,
    pub created_at: DateTime<Utc>,
}

/// 升级队列状态
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum UpgradeQueueStatus {
    Pending,
    Scheduled,
    Running,
    Completed,
    Failed,
    Cancelled,
}

/// 批量升级请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchUpgradeRequest {
    pub plugins: Vec<PluginUpgradeItem>,
    pub strategy: UpgradeStrategy,
    pub backup: Option<bool>,
    pub force_install: Option<bool>,
}

/// 单个插件升级项
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginUpgradeItem {
    pub plugin_code: String,
    pub target_version: Option<String>,
}

/// 批量升级结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchUpgradeResult {
    pub total: i32,
    pub successful: i32,
    pub failed: i32,
    pub skipped: i32,
    pub results: Vec<PluginUpgradeResult>,
}

/// 单个插件升级结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginUpgradeResult {
    pub plugin_code: String,
    pub success: bool,
    pub task_id: Option<uuid::Uuid>,
    pub message: String,
}

/// 升级策略配置请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpgradeScheduleRequest {
    pub strategy: UpgradeStrategy,
    pub enabled: Option<bool>,
    pub cron_expression: Option<String>,
    pub window_start: Option<String>,
    pub window_end: Option<String>,
    pub allowed_upgrade_types: Option<Vec<String>>,
    pub auto_rollback: Option<bool>,
    pub rollback_window_minutes: Option<i32>,
}

/// 升级历史记录
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpgradeHistory {
    pub id: uuid::Uuid,
    pub plugin_code: String,
    pub from_version: String,
    pub to_version: String,
    pub strategy: UpgradeStrategy,
    pub status: String,
    pub started_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
    pub duration_seconds: Option<i64>,
    pub error_message: Option<String>,
    pub rollback_from: Option<String>,
}

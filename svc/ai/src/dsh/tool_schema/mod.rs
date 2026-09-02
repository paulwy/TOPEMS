//! DSH AI Tool Schema 适配器增强模块
//!
//! 提供工具 Schema 自动生成、工具分组与标签管理、工具版本化、Schema 兼容性校验等能力。

use std::collections::HashMap;
use std::sync::Arc;

use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use tracing::info;

// ============================================================================
// 类型定义
// ============================================================================

/// 工具定义
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolDefinition {
    /// 工具名称
    pub name: String,
    /// 工具描述
    pub description: String,
    /// 工具版本
    pub version: String,
    /// 工具分组
    pub category: String,
    /// 工具标签
    pub tags: Vec<String>,
    /// 输入参数 Schema
    pub input_schema: ToolSchema,
    /// 输出参数 Schema
    pub output_schema: Option<ToolSchema>,
    /// 工具状态
    pub status: ToolStatus,
    /// 是否启用
    pub enabled: bool,
    /// 工具作者
    pub author: String,
    /// 创建时间
    pub created_at: String,
    /// 更新时间
    pub updated_at: String,
    /// 弃用时间（如果已弃用）
    pub deprecated_at: Option<String>,
    /// 替代工具（如果已弃用）
    pub replaced_by: Option<String>,
    /// 工具元数据
    pub metadata: HashMap<String, String>,
}

/// 工具状态
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ToolStatus {
    /// 活跃
    Active,
    /// 测试中
    Beta,
    /// 已弃用
    Deprecated,
    /// 已停用
    Retired,
}

impl ToolStatus {
    pub fn as_str(&self) -> &str {
        match self {
            ToolStatus::Active => "active",
            ToolStatus::Beta => "beta",
            ToolStatus::Deprecated => "deprecated",
            ToolStatus::Retired => "retired",
        }
    }
}

/// 工具 Schema
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolSchema {
    /// Schema 类型（object/string/number/integer/boolean/array/null）
    pub schema_type: SchemaType,
    /// 字段描述
    pub description: Option<String>,
    /// 是否必填（仅对 object 的属性有效）
    pub required: Option<Vec<String>>,
    /// 属性定义（仅对 object 有效）
    pub properties: Option<HashMap<String, ToolSchema>>,
    /// 枚举值
    pub enum_values: Option<Vec<serde_json::Value>>,
    /// 默认值
    pub default_value: Option<serde_json::Value>,
    /// 最小值（number/integer）
    pub minimum: Option<f64>,
    /// 最大值（number/integer）
    pub maximum: Option<f64>,
    /// 最小长度（string）
    pub min_length: Option<u32>,
    /// 最大长度（string）
    pub max_length: Option<u32>,
    /// 正则模式（string）
    pub pattern: Option<String>,
    /// 数组项定义（仅对 array 有效）
    pub items: Option<Box<ToolSchema>>,
    /// 最小数组长度
    pub min_items: Option<u32>,
    /// 最大数组长度
    pub max_items: Option<u32>,
    /// 附加属性是否允许
    pub additional_properties: Option<bool>,
}

/// Schema 类型
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SchemaType {
    /// 对象
    Object,
    /// 字符串
    String,
    /// 数字
    Number,
    /// 整数
    Integer,
    /// 布尔值
    Boolean,
    /// 数组
    Array,
    /// 空值
    Null,
}

impl SchemaType {
    pub fn as_str(&self) -> &str {
        match self {
            SchemaType::Object => "object",
            SchemaType::String => "string",
            SchemaType::Number => "number",
            SchemaType::Integer => "integer",
            SchemaType::Boolean => "boolean",
            SchemaType::Array => "array",
            SchemaType::Null => "null",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "object" => SchemaType::Object,
            "string" => SchemaType::String,
            "number" => SchemaType::Number,
            "integer" => SchemaType::Integer,
            "boolean" => SchemaType::Boolean,
            "array" => SchemaType::Array,
            _ => SchemaType::String,
        }
    }
}

/// 工具分组
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCategory {
    /// 分组名称
    pub name: String,
    /// 分组描述
    pub description: String,
    /// 分组图标
    pub icon: Option<String>,
    /// 分组颜色
    pub color: Option<String>,
    /// 分组排序
    pub order: u32,
    /// 工具数量
    pub tool_count: u32,
}

/// 工具版本历史
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolVersionHistory {
    /// 工具名称
    pub tool_name: String,
    /// 版本列表
    pub versions: Vec<ToolVersionEntry>,
}

/// 工具版本条目
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolVersionEntry {
    /// 版本号
    pub version: String,
    /// 工具定义
    pub definition: ToolDefinition,
    /// 发布说明
    pub release_notes: String,
    /// 发布时间
    pub released_at: String,
    /// 是否为当前版本
    pub is_current: bool,
}

/// Schema 兼容性检查结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SchemaCompatibilityResult {
    /// 是否兼容
    pub compatible: bool,
    /// 兼容性级别
    pub level: CompatibilityLevel,
    /// 变更列表
    pub changes: Vec<SchemaChange>,
    /// 破坏性变更
    pub breaking_changes: Vec<SchemaChange>,
}

/// 兼容性级别
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CompatibilityLevel {
    /// 完全兼容（无变更）
    None,
    /// 向后兼容（新增可选字段）
    BackwardCompatible,
    /// 部分兼容（类型变更但可转换）
    PartiallyCompatible,
    /// 不兼容（破坏性变更）
    Incompatible,
}

impl CompatibilityLevel {
    pub fn as_str(&self) -> &str {
        match self {
            CompatibilityLevel::None => "none",
            CompatibilityLevel::BackwardCompatible => "backward_compatible",
            CompatibilityLevel::PartiallyCompatible => "partially_compatible",
            CompatibilityLevel::Incompatible => "incompatible",
        }
    }
}

/// Schema 变更
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SchemaChange {
    /// 变更类型
    pub change_type: ChangeType,
    /// 字段路径
    pub field_path: String,
    /// 变更描述
    pub description: String,
    /// 是否为破坏性变更
    pub is_breaking: bool,
}

/// 变更类型
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ChangeType {
    /// 新增字段
    Added,
    /// 删除字段
    Removed,
    /// 类型变更
    TypeChanged,
    /// 必填状态变更
    RequiredChanged,
    /// 默认值变更
    DefaultChanged,
    /// 约束变更（范围、长度等）
    ConstraintChanged,
    /// 枚举值变更
    EnumChanged,
    /// 描述变更
    DescriptionChanged,
}

impl ChangeType {
    pub fn as_str(&self) -> &str {
        match self {
            ChangeType::Added => "added",
            ChangeType::Removed => "removed",
            ChangeType::TypeChanged => "type_changed",
            ChangeType::RequiredChanged => "required_changed",
            ChangeType::DefaultChanged => "default_changed",
            ChangeType::ConstraintChanged => "constraint_changed",
            ChangeType::EnumChanged => "enum_changed",
            ChangeType::DescriptionChanged => "description_changed",
        }
    }
}

/// Schema 适配器配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolSchemaConfig {
    /// 是否启用
    pub enabled: bool,
    /// 是否启用自动版本化
    pub enable_auto_versioning: bool,
    /// 是否启用 Schema 兼容性检查
    pub enable_compatibility_check: bool,
    /// 默认兼容性策略
    pub default_compatibility_strategy: CompatibilityLevel,
    /// 是否允许破坏性变更
    pub allow_breaking_changes: bool,
    /// 版本历史最大保留数
    pub max_version_history: usize,
    /// 是否启用工具分组
    pub enable_categories: bool,
}

impl Default for ToolSchemaConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            enable_auto_versioning: true,
            enable_compatibility_check: true,
            default_compatibility_strategy: CompatibilityLevel::BackwardCompatible,
            allow_breaking_changes: false,
            max_version_history: 50,
            enable_categories: true,
        }
    }
}

/// Schema 适配器统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolSchemaStats {
    /// 工具总数
    pub total_tools: u64,
    /// 活跃工具数
    pub active_tools: u64,
    /// 已弃用工具数
    pub deprecated_tools: u64,
    /// 工具分组数
    pub total_categories: u64,
    /// 版本历史总数
    pub total_versions: u64,
    /// Schema 检查次数
    pub total_schema_checks: u64,
    /// 兼容性检查通过次数
    pub compatibility_passed: u64,
    /// 兼容性检查失败次数
    pub compatibility_failed: u64,
}

// ============================================================================
// Tool Schema 适配器
// ============================================================================

/// Tool Schema 适配器
#[derive(Clone)]
pub struct ToolSchemaAdapter {
    /// 配置
    config: ToolSchemaConfig,
    /// 工具存储（工具名称 -> 工具定义）
    tools: Arc<Mutex<HashMap<String, ToolDefinition>>>,
    /// 工具版本历史（工具名称 -> 版本历史）
    version_history: Arc<Mutex<HashMap<String, ToolVersionHistory>>>,
    /// 工具分组（分组名称 -> 分组定义）
    categories: Arc<Mutex<HashMap<String, ToolCategory>>>,
}

impl ToolSchemaAdapter {
    /// 创建新的适配器
    pub fn new(config: ToolSchemaConfig) -> Self {
        let adapter = Self {
            config,
            tools: Arc::new(Mutex::new(HashMap::new())),
            version_history: Arc::new(Mutex::new(HashMap::new())),
            categories: Arc::new(Mutex::new(HashMap::new())),
        };

        // 初始化默认分组
        adapter.init_default_categories();

        adapter
    }

    /// 使用默认配置创建
    pub fn with_defaults() -> Self {
        Self::new(ToolSchemaConfig::default())
    }

    /// 获取配置
    pub fn config(&self) -> &ToolSchemaConfig {
        &self.config
    }

    /// 初始化默认分组
    fn init_default_categories(&self) {
        let default_categories = vec![
            ToolCategory {
                name: "data".to_string(),
                description: "数据处理工具".to_string(),
                icon: Some("database".to_string()),
                color: Some("#3b82f6".to_string()),
                order: 1,
                tool_count: 0,
            },
            ToolCategory {
                name: "ai".to_string(),
                description: "AI 相关工具".to_string(),
                icon: Some("brain".to_string()),
                color: Some("#8b5cf6".to_string()),
                order: 2,
                tool_count: 0,
            },
            ToolCategory {
                name: "file".to_string(),
                description: "文件操作工具".to_string(),
                icon: Some("file".to_string()),
                color: Some("#10b981".to_string()),
                order: 3,
                tool_count: 0,
            },
            ToolCategory {
                name: "network".to_string(),
                description: "网络请求工具".to_string(),
                icon: Some("globe".to_string()),
                color: Some("#f59e0b".to_string()),
                order: 4,
                tool_count: 0,
            },
            ToolCategory {
                name: "system".to_string(),
                description: "系统管理工具".to_string(),
                icon: Some("settings".to_string()),
                color: Some("#ef4444".to_string()),
                order: 5,
                tool_count: 0,
            },
            ToolCategory {
                name: "custom".to_string(),
                description: "自定义工具".to_string(),
                icon: Some("puzzle".to_string()),
                color: Some("#6b7280".to_string()),
                order: 100,
                tool_count: 0,
            },
        ];

        for category in default_categories {
            self.categories
                .lock()
                .insert(category.name.clone(), category);
        }

        info!("Default tool categories initialized");
    }

    /// 注册工具
    pub fn register_tool(&self, tool: ToolDefinition) -> Result<String, String> {
        if !self.config.enabled {
            return Err("Tool Schema 适配器未启用".to_string());
        }

        let tool_name = tool.name.clone();
        let tool_version = tool.version.clone();

        // 检查是否已存在
        let existing = self.tools.lock().get(&tool_name).cloned();

        if let Some(existing_tool) = &existing {
            // 兼容性检查
            if self.config.enable_compatibility_check {
                let compatibility = self
                    .check_schema_compatibility(&existing_tool.input_schema, &tool.input_schema);

                if !compatibility.compatible && !self.config.allow_breaking_changes {
                    return Err(format!(
                        "工具 {} 的 Schema 存在破坏性变更，不允许注册",
                        tool_name
                    ));
                }
            }

            // 保存旧版本到历史
            self.save_version_history(existing_tool, false);
        }

        // 保存当前版本
        self.save_version_history(&tool, true);

        // 更新分组计数
        self.update_category_count(&tool.category, 1);

        // 保存工具
        self.tools.lock().insert(tool_name.clone(), tool);

        info!(tool_name = %tool_name, version = %tool_version, "Tool registered");
        Ok(tool_name)
    }

    /// 保存版本历史
    fn save_version_history(&self, tool: &ToolDefinition, is_current: bool) {
        let mut history = self.version_history.lock();
        let tool_history = history
            .entry(tool.name.clone())
            .or_insert_with(|| ToolVersionHistory {
                tool_name: tool.name.clone(),
                versions: Vec::new(),
            });

        // 更新其他版本的 is_current 状态
        if is_current {
            for entry in &mut tool_history.versions {
                entry.is_current = false;
            }
        }

        tool_history.versions.push(ToolVersionEntry {
            version: tool.version.clone(),
            definition: tool.clone(),
            release_notes: format!("版本 {} 发布", tool.version),
            released_at: chrono::Utc::now().to_rfc3339(),
            is_current,
        });

        // 限制版本历史数量
        if tool_history.versions.len() > self.config.max_version_history {
            tool_history.versions.remove(0);
        }
    }

    /// 获取工具
    pub fn get_tool(&self, tool_name: &str) -> Option<ToolDefinition> {
        self.tools.lock().get(tool_name).cloned()
    }

    /// 获取工具版本历史
    pub fn get_version_history(&self, tool_name: &str) -> Option<ToolVersionHistory> {
        self.version_history.lock().get(tool_name).cloned()
    }

    /// 获取特定版本的工具
    pub fn get_tool_version(&self, tool_name: &str, version: &str) -> Option<ToolDefinition> {
        let history = self.version_history.lock();
        history
            .get(tool_name)
            .and_then(|h| h.versions.iter().find(|v| v.version == version))
            .map(|v| v.definition.clone())
    }

    /// 列出工具
    pub fn list_tools(
        &self,
        category_filter: Option<&str>,
        status_filter: Option<ToolStatus>,
        include_deprecated: bool,
    ) -> Vec<ToolDefinition> {
        let tools = self.tools.lock();
        let mut result: Vec<ToolDefinition> = tools
            .values()
            .filter(|t| {
                if !include_deprecated && t.status == ToolStatus::Deprecated {
                    return false;
                }
                if let Some(category) = category_filter {
                    if t.category != category {
                        return false;
                    }
                }
                if let Some(status) = status_filter {
                    if t.status != status {
                        return false;
                    }
                }
                true
            })
            .cloned()
            .collect();

        result.sort_by(|a, b| a.name.cmp(&b.name));
        result
    }

    /// 删除工具
    pub fn delete_tool(&self, tool_name: &str) -> Result<(), String> {
        let tool = {
            let mut tools = self.tools.lock();
            tools.remove(tool_name)
        };

        if let Some(tool) = tool {
            // 更新分组计数
            self.update_category_count(&tool.category, -1);

            // 标记版本历史中的当前版本为非当前
            if let Some(history) = self.version_history.lock().get_mut(tool_name) {
                for entry in &mut history.versions {
                    entry.is_current = false;
                }
            }

            info!(tool_name = %tool_name, "Tool deleted");
            Ok(())
        } else {
            Err(format!("工具 {} 不存在", tool_name))
        }
    }

    /// 弃用工具
    pub fn deprecate_tool(&self, tool_name: &str, replaced_by: Option<&str>) -> Result<(), String> {
        let mut tools = self.tools.lock();
        let tool = tools
            .get_mut(tool_name)
            .ok_or_else(|| format!("工具 {} 不存在", tool_name))?;

        tool.status = ToolStatus::Deprecated;
        tool.deprecated_at = Some(chrono::Utc::now().to_rfc3339());
        tool.replaced_by = replaced_by.map(|s| s.to_string());
        tool.updated_at = chrono::Utc::now().to_rfc3339();

        info!(tool_name = %tool_name, replaced_by = ?replaced_by, "Tool deprecated");
        Ok(())
    }

    /// 添加工具分组
    pub fn add_category(&self, category: ToolCategory) {
        self.categories
            .lock()
            .insert(category.name.clone(), category);
    }

    /// 获取工具分组
    pub fn get_category(&self, category_name: &str) -> Option<ToolCategory> {
        self.categories.lock().get(category_name).cloned()
    }

    /// 列出所有分组
    pub fn list_categories(&self) -> Vec<ToolCategory> {
        let categories = self.categories.lock();
        let mut result: Vec<ToolCategory> = categories.values().cloned().collect();
        result.sort_by(|a, b| a.order.cmp(&b.order));
        result
    }

    /// 更新分组计数
    fn update_category_count(&self, category_name: &str, delta: i32) {
        if let Some(category) = self.categories.lock().get_mut(category_name) {
            category.tool_count = (category.tool_count as i32 + delta).max(0) as u32;
        }
    }

    /// 检查 Schema 兼容性
    pub fn check_schema_compatibility(
        &self,
        old_schema: &ToolSchema,
        new_schema: &ToolSchema,
    ) -> SchemaCompatibilityResult {
        let mut changes = Vec::new();
        let mut breaking_changes = Vec::new();

        // 检查类型变更
        if old_schema.schema_type != new_schema.schema_type {
            let change = SchemaChange {
                change_type: ChangeType::TypeChanged,
                field_path: "$".to_string(),
                description: format!(
                    "类型从 {} 变更为 {}",
                    old_schema.schema_type.as_str(),
                    new_schema.schema_type.as_str()
                ),
                is_breaking: true,
            };
            changes.push(change.clone());
            breaking_changes.push(change);
        }

        // 检查对象属性
        if old_schema.schema_type == SchemaType::Object
            && new_schema.schema_type == SchemaType::Object
        {
            let empty_map = HashMap::new();
            let empty_vec = Vec::new();
            let old_props = old_schema.properties.as_ref().unwrap_or(&empty_map);
            let new_props = new_schema.properties.as_ref().unwrap_or(&empty_map);
            let old_required = old_schema.required.as_ref().unwrap_or(&empty_vec);
            let new_required = new_schema.required.as_ref().unwrap_or(&empty_vec);

            // 检查新增属性
            for (key, new_prop) in new_props {
                if !old_props.contains_key(key) {
                    let is_required = new_required.contains(key);
                    let change = SchemaChange {
                        change_type: ChangeType::Added,
                        field_path: format!("$.{}", key),
                        description: format!("新增属性 {}（必填: {}）", key, is_required),
                        is_breaking: is_required,
                    };
                    changes.push(change.clone());
                    if is_required {
                        breaking_changes.push(change);
                    }
                } else {
                    // 检查属性变更
                    let old_prop = &old_props[key];
                    if old_prop.schema_type != new_prop.schema_type {
                        let change = SchemaChange {
                            change_type: ChangeType::TypeChanged,
                            field_path: format!("$.{}", key),
                            description: format!(
                                "属性 {} 类型从 {} 变更为 {}",
                                key,
                                old_prop.schema_type.as_str(),
                                new_prop.schema_type.as_str()
                            ),
                            is_breaking: true,
                        };
                        changes.push(change.clone());
                        breaking_changes.push(change);
                    }

                    // 检查必填状态变更
                    let was_required = old_required.contains(key);
                    let is_required = new_required.contains(key);
                    if was_required != is_required {
                        let change = SchemaChange {
                            change_type: ChangeType::RequiredChanged,
                            field_path: format!("$.{}", key),
                            description: format!(
                                "属性 {} 必填状态从 {} 变更为 {}",
                                key, was_required, is_required
                            ),
                            is_breaking: is_required && !was_required,
                        };
                        changes.push(change.clone());
                        if is_required && !was_required {
                            breaking_changes.push(change);
                        }
                    }
                }
            }

            // 检查删除属性
            for key in old_props.keys() {
                if !new_props.contains_key(key) {
                    let was_required = old_required.contains(key);
                    let change = SchemaChange {
                        change_type: ChangeType::Removed,
                        field_path: format!("$.{}", key),
                        description: format!("删除属性 {}（原必填: {}）", key, was_required),
                        is_breaking: true,
                    };
                    changes.push(change.clone());
                    breaking_changes.push(change);
                }
            }
        }

        // 确定兼容性级别
        let level = if breaking_changes.is_empty() {
            if changes.is_empty() {
                CompatibilityLevel::None
            } else {
                CompatibilityLevel::BackwardCompatible
            }
        } else {
            CompatibilityLevel::Incompatible
        };

        SchemaCompatibilityResult {
            compatible: level != CompatibilityLevel::Incompatible,
            level,
            changes,
            breaking_changes,
        }
    }

    /// 生成 MCP 兼容的工具列表
    pub fn generate_mcp_tools_list(&self, include_deprecated: bool) -> Vec<serde_json::Value> {
        let tools = self.list_tools(None, None, include_deprecated);
        tools
            .iter()
            .map(|t| {
                serde_json::json!({
                    "name": t.name,
                    "description": t.description,
                    "inputSchema": self.schema_to_json(&t.input_schema),
                    "version": t.version,
                    "category": t.category,
                    "tags": t.tags,
                    "status": t.status.as_str()
                })
            })
            .collect()
    }

    /// 将 ToolSchema 转换为 JSON Schema
    fn schema_to_json(&self, schema: &ToolSchema) -> serde_json::Value {
        let mut json = serde_json::json!({
            "type": schema.schema_type.as_str()
        });

        if let Some(desc) = &schema.description {
            json["description"] = serde_json::Value::String(desc.clone());
        }

        if let Some(props) = &schema.properties {
            let mut props_json = serde_json::Map::new();
            for (key, value) in props {
                props_json.insert(key.clone(), self.schema_to_json(value));
            }
            json["properties"] = serde_json::Value::Object(props_json);
        }

        if let Some(required) = &schema.required {
            json["required"] = serde_json::Value::Array(
                required
                    .iter()
                    .map(|s| serde_json::Value::String(s.clone()))
                    .collect(),
            );
        }

        if let Some(enum_values) = &schema.enum_values {
            json["enum"] = serde_json::Value::Array(enum_values.clone());
        }

        if let Some(default) = &schema.default_value {
            json["default"] = default.clone();
        }

        json
    }

    /// 获取统计信息
    pub fn get_stats(&self) -> ToolSchemaStats {
        let tools = self.tools.lock();
        let categories = self.categories.lock();
        let history = self.version_history.lock();

        let active_tools = tools
            .values()
            .filter(|t| t.status == ToolStatus::Active)
            .count() as u64;
        let deprecated_tools = tools
            .values()
            .filter(|t| t.status == ToolStatus::Deprecated)
            .count() as u64;
        let total_versions: u64 = history.values().map(|h| h.versions.len() as u64).sum();

        ToolSchemaStats {
            total_tools: tools.len() as u64,
            active_tools,
            deprecated_tools,
            total_categories: categories.len() as u64,
            total_versions,
            total_schema_checks: 0,
            compatibility_passed: 0,
            compatibility_failed: 0,
        }
    }
}

// ============================================================================
// 测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_adapter() -> ToolSchemaAdapter {
        ToolSchemaAdapter::with_defaults()
    }

    fn create_test_tool(name: &str, category: &str) -> ToolDefinition {
        ToolDefinition {
            name: name.to_string(),
            description: format!("测试工具 {}", name),
            version: "1.0".to_string(),
            category: category.to_string(),
            tags: vec!["test".to_string()],
            input_schema: ToolSchema {
                schema_type: SchemaType::Object,
                description: Some("输入参数".to_string()),
                required: Some(vec!["param1".to_string()]),
                properties: Some({
                    let mut props = HashMap::new();
                    props.insert(
                        "param1".to_string(),
                        ToolSchema {
                            schema_type: SchemaType::String,
                            description: Some("参数1".to_string()),
                            ..Default::default()
                        },
                    );
                    props
                }),
                ..Default::default()
            },
            output_schema: None,
            status: ToolStatus::Active,
            enabled: true,
            author: "test".to_string(),
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
            deprecated_at: None,
            replaced_by: None,
            metadata: HashMap::new(),
        }
    }

    impl Default for ToolSchema {
        fn default() -> Self {
            Self {
                schema_type: SchemaType::String,
                description: None,
                required: None,
                properties: None,
                enum_values: None,
                default_value: None,
                minimum: None,
                maximum: None,
                min_length: None,
                max_length: None,
                pattern: None,
                items: None,
                min_items: None,
                max_items: None,
                additional_properties: None,
            }
        }
    }

    #[test]
    fn test_tool_status_as_str() {
        assert_eq!(ToolStatus::Active.as_str(), "active");
        assert_eq!(ToolStatus::Beta.as_str(), "beta");
        assert_eq!(ToolStatus::Deprecated.as_str(), "deprecated");
    }

    #[test]
    fn test_schema_type_as_str() {
        assert_eq!(SchemaType::Object.as_str(), "object");
        assert_eq!(SchemaType::String.as_str(), "string");
        assert_eq!(SchemaType::Number.as_str(), "number");
    }

    #[test]
    fn test_schema_type_from_str() {
        assert_eq!(SchemaType::from_str("object"), SchemaType::Object);
        assert_eq!(SchemaType::from_str("string"), SchemaType::String);
        assert_eq!(SchemaType::from_str("unknown"), SchemaType::String);
    }

    #[test]
    fn test_compatibility_level_as_str() {
        assert_eq!(CompatibilityLevel::None.as_str(), "none");
        assert_eq!(
            CompatibilityLevel::BackwardCompatible.as_str(),
            "backward_compatible"
        );
        assert_eq!(CompatibilityLevel::Incompatible.as_str(), "incompatible");
    }

    #[test]
    fn test_change_type_as_str() {
        assert_eq!(ChangeType::Added.as_str(), "added");
        assert_eq!(ChangeType::Removed.as_str(), "removed");
        assert_eq!(ChangeType::TypeChanged.as_str(), "type_changed");
    }

    #[test]
    fn test_tool_schema_config_default() {
        let config = ToolSchemaConfig::default();
        assert!(config.enabled);
        assert!(config.enable_auto_versioning);
        assert!(config.enable_compatibility_check);
        assert!(!config.allow_breaking_changes);
    }

    #[test]
    fn test_adapter_creation() {
        let adapter = create_test_adapter();
        assert!(adapter.config().enabled);
    }

    #[test]
    fn test_default_categories() {
        let adapter = create_test_adapter();
        let categories = adapter.list_categories();
        assert!(!categories.is_empty());
        assert!(categories.iter().any(|c| c.name == "data"));
        assert!(categories.iter().any(|c| c.name == "ai"));
    }

    #[test]
    fn test_register_tool() {
        let adapter = create_test_adapter();
        let tool = create_test_tool("test_tool", "data");
        let result = adapter.register_tool(tool);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "test_tool");
    }

    #[test]
    fn test_get_tool() {
        let adapter = create_test_adapter();
        adapter
            .register_tool(create_test_tool("test_tool", "data"))
            .unwrap();

        let tool = adapter.get_tool("test_tool");
        assert!(tool.is_some());
        assert_eq!(tool.unwrap().name, "test_tool");
    }

    #[test]
    fn test_list_tools() {
        let adapter = create_test_adapter();
        adapter
            .register_tool(create_test_tool("tool1", "data"))
            .unwrap();
        adapter
            .register_tool(create_test_tool("tool2", "ai"))
            .unwrap();

        let tools = adapter.list_tools(None, None, false);
        assert_eq!(tools.len(), 2);
    }

    #[test]
    fn test_list_tools_by_category() {
        let adapter = create_test_adapter();
        adapter
            .register_tool(create_test_tool("tool1", "data"))
            .unwrap();
        adapter
            .register_tool(create_test_tool("tool2", "ai"))
            .unwrap();

        let data_tools = adapter.list_tools(Some("data"), None, false);
        assert_eq!(data_tools.len(), 1);
        assert_eq!(data_tools[0].name, "tool1");
    }

    #[test]
    fn test_delete_tool() {
        let adapter = create_test_adapter();
        adapter
            .register_tool(create_test_tool("test_tool", "data"))
            .unwrap();

        let result = adapter.delete_tool("test_tool");
        assert!(result.is_ok());
        assert!(adapter.get_tool("test_tool").is_none());
    }

    #[test]
    fn test_deprecate_tool() {
        let adapter = create_test_adapter();
        adapter
            .register_tool(create_test_tool("test_tool", "data"))
            .unwrap();

        let result = adapter.deprecate_tool("test_tool", Some("new_tool"));
        assert!(result.is_ok());

        let tool = adapter.get_tool("test_tool").unwrap();
        assert_eq!(tool.status, ToolStatus::Deprecated);
        assert!(tool.deprecated_at.is_some());
        assert_eq!(tool.replaced_by, Some("new_tool".to_string()));
    }

    #[test]
    fn test_version_history() {
        let adapter = create_test_adapter();
        adapter
            .register_tool(create_test_tool("test_tool", "data"))
            .unwrap();

        let history = adapter.get_version_history("test_tool");
        assert!(history.is_some());
        assert!(!history.unwrap().versions.is_empty());
    }

    #[test]
    fn test_get_tool_version() {
        let adapter = create_test_adapter();
        adapter
            .register_tool(create_test_tool("test_tool", "data"))
            .unwrap();

        let tool = adapter.get_tool_version("test_tool", "1.0");
        assert!(tool.is_some());
        assert_eq!(tool.unwrap().version, "1.0");
    }

    #[test]
    fn test_schema_compatibility_no_change() {
        let adapter = create_test_adapter();
        let schema = ToolSchema {
            schema_type: SchemaType::Object,
            ..Default::default()
        };

        let result = adapter.check_schema_compatibility(&schema, &schema);
        assert!(result.compatible);
        assert_eq!(result.level, CompatibilityLevel::None);
    }

    #[test]
    fn test_schema_compatibility_add_optional_field() {
        let adapter = create_test_adapter();
        let old_schema = ToolSchema {
            schema_type: SchemaType::Object,
            properties: Some(HashMap::new()),
            required: Some(Vec::new()),
            ..Default::default()
        };

        let mut new_props = HashMap::new();
        new_props.insert(
            "new_field".to_string(),
            ToolSchema {
                schema_type: SchemaType::String,
                ..Default::default()
            },
        );

        let new_schema = ToolSchema {
            schema_type: SchemaType::Object,
            properties: Some(new_props),
            required: Some(Vec::new()),
            ..Default::default()
        };

        let result = adapter.check_schema_compatibility(&old_schema, &new_schema);
        assert!(result.compatible);
        assert_eq!(result.level, CompatibilityLevel::BackwardCompatible);
        assert!(result.breaking_changes.is_empty());
    }

    #[test]
    fn test_schema_compatibility_add_required_field() {
        let adapter = create_test_adapter();
        let old_schema = ToolSchema {
            schema_type: SchemaType::Object,
            properties: Some(HashMap::new()),
            required: Some(Vec::new()),
            ..Default::default()
        };

        let mut new_props = HashMap::new();
        new_props.insert(
            "new_required_field".to_string(),
            ToolSchema {
                schema_type: SchemaType::String,
                ..Default::default()
            },
        );

        let new_schema = ToolSchema {
            schema_type: SchemaType::Object,
            properties: Some(new_props),
            required: Some(vec!["new_required_field".to_string()]),
            ..Default::default()
        };

        let result = adapter.check_schema_compatibility(&old_schema, &new_schema);
        assert!(!result.compatible);
        assert_eq!(result.level, CompatibilityLevel::Incompatible);
        assert!(!result.breaking_changes.is_empty());
    }

    #[test]
    fn test_schema_compatibility_remove_field() {
        let adapter = create_test_adapter();
        let mut old_props = HashMap::new();
        old_props.insert(
            "old_field".to_string(),
            ToolSchema {
                schema_type: SchemaType::String,
                ..Default::default()
            },
        );

        let old_schema = ToolSchema {
            schema_type: SchemaType::Object,
            properties: Some(old_props),
            required: Some(Vec::new()),
            ..Default::default()
        };

        let new_schema = ToolSchema {
            schema_type: SchemaType::Object,
            properties: Some(HashMap::new()),
            required: Some(Vec::new()),
            ..Default::default()
        };

        let result = adapter.check_schema_compatibility(&old_schema, &new_schema);
        assert!(!result.compatible);
        assert!(!result.breaking_changes.is_empty());
    }

    #[test]
    fn test_generate_mcp_tools_list() {
        let adapter = create_test_adapter();
        adapter
            .register_tool(create_test_tool("test_tool", "data"))
            .unwrap();

        let mcp_tools = adapter.generate_mcp_tools_list(false);
        assert_eq!(mcp_tools.len(), 1);
        assert_eq!(mcp_tools[0]["name"], "test_tool");
        assert!(mcp_tools[0]["inputSchema"].is_object());
    }

    #[test]
    fn test_add_category() {
        let adapter = create_test_adapter();
        let category = ToolCategory {
            name: "custom_cat".to_string(),
            description: "自定义分组".to_string(),
            icon: None,
            color: None,
            order: 10,
            tool_count: 0,
        };

        adapter.add_category(category);
        assert!(adapter.get_category("custom_cat").is_some());
    }

    #[test]
    fn test_get_stats() {
        let adapter = create_test_adapter();
        adapter
            .register_tool(create_test_tool("tool1", "data"))
            .unwrap();
        adapter
            .register_tool(create_test_tool("tool2", "ai"))
            .unwrap();

        let stats = adapter.get_stats();
        assert!(stats.total_tools >= 2);
        assert!(stats.active_tools >= 2);
        assert!(stats.total_categories > 0);
        assert!(stats.total_versions >= 2);
    }
}

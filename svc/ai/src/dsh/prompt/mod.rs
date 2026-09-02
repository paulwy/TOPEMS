//! DSH AI Prompt 模板引擎模块
//!
//! 提供 Prompt 模板管理、版本控制、变量注入和 A/B 测试能力。

use std::collections::HashMap;
use std::sync::Arc;

use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use tracing::{debug, info, warn};

// ============================================================================
// 类型定义
// ============================================================================

/// Prompt 模板
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromptTemplate {
    /// 模板 ID
    pub id: String,
    /// 模板名称
    pub name: String,
    /// 模板描述
    pub description: String,
    /// 模板内容（支持 {{variable}} 变量占位符）
    pub content: String,
    /// 模板版本号
    pub version: String,
    /// 模板变量定义（变量名 -> 描述）
    pub variables: HashMap<String, String>,
    /// 模板标签（用于分类和搜索）
    pub tags: Vec<String>,
    /// 模板状态（draft/active/deprecated）
    pub status: TemplateStatus,
    /// 创建时间
    pub created_at: String,
    /// 更新时间
    pub updated_at: String,
    /// 创建者
    pub created_by: String,
}

/// 模板状态
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TemplateStatus {
    /// 草稿
    Draft,
    /// 活跃（正在使用）
    Active,
    /// 已弃用
    Deprecated,
}

impl TemplateStatus {
    pub fn as_str(&self) -> &str {
        match self {
            TemplateStatus::Draft => "draft",
            TemplateStatus::Active => "active",
            TemplateStatus::Deprecated => "deprecated",
        }
    }
}

/// 模板版本历史记录
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateVersion {
    /// 版本号
    pub version: String,
    /// 模板内容
    pub content: String,
    /// 变量定义
    pub variables: HashMap<String, String>,
    /// 版本说明
    pub changelog: String,
    /// 创建时间
    pub created_at: String,
    /// 创建者
    pub created_by: String,
}

/// 渲染结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RenderResult {
    /// 渲染后的内容
    pub content: String,
    /// 使用的模板 ID
    pub template_id: String,
    /// 使用的模板版本
    pub template_version: String,
    /// 实际使用的变量值
    pub used_variables: HashMap<String, String>,
    /// 未提供的变量（使用默认空值）
    pub missing_variables: Vec<String>,
    /// 渲染耗时（毫秒）
    pub render_duration_ms: u64,
}

/// A/B 测试配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AbTestConfig {
    /// 测试 ID
    pub test_id: String,
    /// 测试名称
    pub name: String,
    /// 模板 A ID
    pub template_a_id: String,
    /// 模板 A 版本
    pub template_a_version: String,
    /// 模板 B ID
    pub template_b_id: String,
    /// 模板 B 版本
    pub template_b_version: String,
    /// A 组流量比例（0-1）
    pub traffic_ratio_a: f64,
    /// 是否启用
    pub enabled: bool,
    /// 创建时间
    pub created_at: String,
}

/// A/B 测试结果统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AbTestStats {
    /// 测试 ID
    pub test_id: String,
    /// A 组调用次数
    pub group_a_calls: u64,
    /// B 组调用次数
    pub group_b_calls: u64,
    /// A 组平均评分（0-5）
    pub group_a_avg_score: f64,
    /// B 组平均评分（0-5）
    pub group_b_avg_score: f64,
    /// A 组成功次数
    pub group_a_success: u64,
    /// B 组成功次数
    pub group_b_success: u64,
}

/// Prompt 引擎配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromptEngineConfig {
    /// 是否启用
    pub enabled: bool,
    /// 默认变量值
    pub default_variables: HashMap<String, String>,
    /// 是否启用 A/B 测试
    pub enable_ab_testing: bool,
    /// 最大模板版本历史数
    pub max_version_history: usize,
}

impl Default for PromptEngineConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            default_variables: HashMap::new(),
            enable_ab_testing: true,
            max_version_history: 50,
        }
    }
}

// ============================================================================
// Prompt 模板引擎
// ============================================================================

/// Prompt 模板引擎
#[derive(Clone)]
pub struct PromptEngine {
    /// 配置
    config: PromptEngineConfig,
    /// 模板存储（ID -> 模板）
    templates: Arc<Mutex<HashMap<String, PromptTemplate>>>,
    /// 模板版本历史（模板 ID -> 版本列表）
    version_history: Arc<Mutex<HashMap<String, Vec<TemplateVersion>>>>,
    /// A/B 测试配置
    ab_tests: Arc<Mutex<HashMap<String, AbTestConfig>>>,
    /// A/B 测试统计
    ab_stats: Arc<Mutex<HashMap<String, AbTestStats>>>,
}

impl PromptEngine {
    /// 创建新的 Prompt 引擎
    pub fn new(config: PromptEngineConfig) -> Self {
        Self {
            config,
            templates: Arc::new(Mutex::new(HashMap::new())),
            version_history: Arc::new(Mutex::new(HashMap::new())),
            ab_tests: Arc::new(Mutex::new(HashMap::new())),
            ab_stats: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// 使用默认配置创建
    pub fn with_defaults() -> Self {
        Self::new(PromptEngineConfig::default())
    }

    /// 获取配置
    pub fn config(&self) -> &PromptEngineConfig {
        &self.config
    }

    /// 注册模板
    pub fn register_template(&self, template: PromptTemplate) -> Result<String, String> {
        if !self.config.enabled {
            return Err("Prompt 引擎未启用".to_string());
        }

        let template_id = template.id.clone();
        let version = template.version.clone();

        // 保存版本历史
        let mut history = self.version_history.lock();
        let versions = history.entry(template_id.clone()).or_insert_with(Vec::new);
        let template_version = TemplateVersion {
            version: version.clone(),
            content: template.content.clone(),
            variables: template.variables.clone(),
            changelog: format!("注册模板 v{}", version),
            created_at: chrono::Utc::now().to_rfc3339(),
            created_by: template.created_by.clone(),
        };
        versions.push(template_version);

        // 限制版本历史数量
        if versions.len() > self.config.max_version_history {
            let excess = versions.len() - self.config.max_version_history;
            versions.drain(0..excess);
        }
        drop(history);

        // 保存模板
        let mut templates = self.templates.lock();
        templates.insert(template_id.clone(), template);
        drop(templates);

        info!(
            template_id = %template_id,
            version = %version,
            "Prompt template registered"
        );

        Ok(template_id)
    }

    /// 获取模板
    pub fn get_template(&self, template_id: &str) -> Option<PromptTemplate> {
        self.templates.lock().get(template_id).cloned()
    }

    /// 获取所有模板
    pub fn list_templates(&self, tag_filter: Option<&str>) -> Vec<PromptTemplate> {
        let templates = self.templates.lock();
        let mut result: Vec<PromptTemplate> = if let Some(tag) = tag_filter {
            templates
                .values()
                .filter(|t| t.tags.iter().any(|t| t == tag))
                .cloned()
                .collect()
        } else {
            templates.values().cloned().collect()
        };
        result.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
        result
    }

    /// 更新模板
    pub fn update_template(
        &self,
        template_id: &str,
        content: Option<&str>,
        variables: Option<HashMap<String, String>>,
        changelog: &str,
        updated_by: &str,
    ) -> Result<(), String> {
        let mut templates = self.templates.lock();
        let template = templates
            .get_mut(template_id)
            .ok_or_else(|| format!("模板 {} 不存在", template_id))?;

        // 生成新版本号（简单的自增）
        let old_version = template.version.parse::<u32>().unwrap_or(1);
        let new_version = (old_version + 1).to_string();

        // 保存版本历史
        let mut history = self.version_history.lock();
        if let Some(versions) = history.get_mut(template_id) {
            versions.push(TemplateVersion {
                version: new_version.clone(),
                content: content.unwrap_or(&template.content).to_string(),
                variables: variables
                    .clone()
                    .unwrap_or_else(|| template.variables.clone()),
                changelog: changelog.to_string(),
                created_at: chrono::Utc::now().to_rfc3339(),
                created_by: updated_by.to_string(),
            });

            // 限制版本历史数量
            if versions.len() > self.config.max_version_history {
                let excess = versions.len() - self.config.max_version_history;
                versions.drain(0..excess);
            }
        }
        drop(history);

        // 更新模板
        if let Some(c) = content {
            template.content = c.to_string();
        }
        if let Some(v) = variables {
            template.variables = v;
        }
        template.version = new_version;
        template.updated_at = chrono::Utc::now().to_rfc3339();
        drop(templates);

        info!(
            template_id = %template_id,
            changelog = %changelog,
            "Prompt template updated"
        );

        Ok(())
    }

    /// 删除模板
    pub fn delete_template(&self, template_id: &str) -> Result<(), String> {
        let mut templates = self.templates.lock();
        if templates.remove(template_id).is_none() {
            return Err(format!("模板 {} 不存在", template_id));
        }
        drop(templates);

        let mut history = self.version_history.lock();
        history.remove(template_id);
        drop(history);

        info!(template_id = %template_id, "Prompt template deleted");
        Ok(())
    }

    /// 获取模板版本历史
    pub fn get_version_history(&self, template_id: &str) -> Vec<TemplateVersion> {
        self.version_history
            .lock()
            .get(template_id)
            .cloned()
            .unwrap_or_default()
    }

    /// 回滚到指定版本
    pub fn rollback_to_version(
        &self,
        template_id: &str,
        version: &str,
        rolled_back_by: &str,
    ) -> Result<(), String> {
        let history = self.version_history.lock();
        let versions = history
            .get(template_id)
            .ok_or_else(|| format!("模板 {} 没有版本历史", template_id))?;

        let target_version = versions
            .iter()
            .find(|v| v.version == version)
            .ok_or_else(|| format!("版本 {} 不存在", version))?
            .clone();
        drop(history);

        self.update_template(
            template_id,
            Some(&target_version.content),
            Some(target_version.variables),
            &format!("回滚到版本 v{}", version),
            rolled_back_by,
        )
    }

    /// 渲染模板
    pub fn render(
        &self,
        template_id: &str,
        variables: &HashMap<String, String>,
    ) -> Result<RenderResult, String> {
        let start = std::time::Instant::now();

        let template = self
            .get_template(template_id)
            .ok_or_else(|| format!("模板 {} 不存在", template_id))?;

        if template.status != TemplateStatus::Active && template.status != TemplateStatus::Draft {
            warn!(
                template_id = %template_id,
                status = %template.status.as_str(),
                "Rendering non-active template"
            );
        }

        let mut content = template.content.clone();
        let mut used_variables = HashMap::new();
        let mut missing_variables = Vec::new();

        // 替换所有 {{variable}} 占位符
        for (var_name, var_desc) in &template.variables {
            let placeholder = format!("{{{{{}}}}}", var_name);
            if let Some(value) = variables.get(var_name) {
                content = content.replace(&placeholder, value);
                used_variables.insert(var_name.clone(), value.clone());
            } else if let Some(default_value) = self.config.default_variables.get(var_name) {
                content = content.replace(&placeholder, default_value);
                used_variables.insert(var_name.clone(), default_value.clone());
            } else {
                content = content.replace(&placeholder, "");
                missing_variables.push(var_name.clone());
                debug!(
                    variable = %var_name,
                    description = %var_desc,
                    "Missing variable, using empty string"
                );
            }
        }

        let duration = start.elapsed().as_micros() as u64 / 1000;

        Ok(RenderResult {
            content,
            template_id: template_id.to_string(),
            template_version: template.version,
            used_variables,
            missing_variables,
            render_duration_ms: duration,
        })
    }

    /// 创建 A/B 测试
    pub fn create_ab_test(&self, config: AbTestConfig) -> Result<String, String> {
        if !self.config.enable_ab_testing {
            return Err("A/B 测试未启用".to_string());
        }

        let test_id = config.test_id.clone();
        let mut ab_tests = self.ab_tests.lock();
        ab_tests.insert(test_id.clone(), config);
        drop(ab_tests);

        // 初始化统计
        let mut ab_stats = self.ab_stats.lock();
        ab_stats.insert(
            test_id.clone(),
            AbTestStats {
                test_id: test_id.clone(),
                group_a_calls: 0,
                group_b_calls: 0,
                group_a_avg_score: 0.0,
                group_b_avg_score: 0.0,
                group_a_success: 0,
                group_b_success: 0,
            },
        );
        drop(ab_stats);

        info!(test_id = %test_id, "A/B test created");
        Ok(test_id)
    }

    /// A/B 测试渲染（根据流量比例选择模板）
    pub fn render_ab_test(
        &self,
        test_id: &str,
        variables: &HashMap<String, String>,
    ) -> Result<(RenderResult, String), String> {
        let ab_tests = self.ab_tests.lock();
        let config = ab_tests
            .get(test_id)
            .ok_or_else(|| format!("A/B 测试 {} 不存在", test_id))?
            .clone();
        drop(ab_tests);

        if !config.enabled {
            return Err("A/B 测试未启用".to_string());
        }

        // 随机选择分组
        let random: f64 = rand::random();
        let group = if random < config.traffic_ratio_a {
            "A"
        } else {
            "B"
        };

        let (template_id, _version) = if group == "A" {
            (
                config.template_a_id.clone(),
                config.template_a_version.clone(),
            )
        } else {
            (
                config.template_b_id.clone(),
                config.template_b_version.clone(),
            )
        };

        let result = self.render(&template_id, variables)?;

        // 更新统计
        let mut ab_stats = self.ab_stats.lock();
        if let Some(stats) = ab_stats.get_mut(test_id) {
            if group == "A" {
                stats.group_a_calls += 1;
            } else {
                stats.group_b_calls += 1;
            }
        }
        drop(ab_stats);

        Ok((result, group.to_string()))
    }

    /// 记录 A/B 测试评分
    pub fn record_ab_score(&self, test_id: &str, group: &str, score: f64, success: bool) {
        let mut ab_stats = self.ab_stats.lock();
        if let Some(stats) = ab_stats.get_mut(test_id) {
            if group == "A" {
                let total = stats.group_a_avg_score * (stats.group_a_calls as f64 - 1.0);
                stats.group_a_avg_score = (total + score) / stats.group_a_calls as f64;
                if success {
                    stats.group_a_success += 1;
                }
            } else {
                let total = stats.group_b_avg_score * (stats.group_b_calls as f64 - 1.0);
                stats.group_b_avg_score = (total + score) / stats.group_b_calls as f64;
                if success {
                    stats.group_b_success += 1;
                }
            }
        }
    }

    /// 获取 A/B 测试统计
    pub fn get_ab_stats(&self, test_id: &str) -> Option<AbTestStats> {
        self.ab_stats.lock().get(test_id).cloned()
    }

    /// 获取引擎统计
    pub fn get_stats(&self) -> PromptEngineStats {
        let templates = self.templates.lock();
        let history = self.version_history.lock();
        let ab_tests = self.ab_tests.lock();

        let total_versions: usize = history.values().map(|v| v.len()).sum();
        let active_templates = templates
            .values()
            .filter(|t| t.status == TemplateStatus::Active)
            .count();

        PromptEngineStats {
            total_templates: templates.len(),
            active_templates,
            total_versions,
            total_ab_tests: ab_tests.len(),
        }
    }
}

/// Prompt 引擎统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromptEngineStats {
    /// 模板总数
    pub total_templates: usize,
    /// 活跃模板数
    pub active_templates: usize,
    /// 版本总数
    pub total_versions: usize,
    /// A/B 测试总数
    pub total_ab_tests: usize,
}

// ============================================================================
// 测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_engine() -> PromptEngine {
        PromptEngine::with_defaults()
    }

    fn create_test_template(id: &str, name: &str) -> PromptTemplate {
        let mut variables = HashMap::new();
        variables.insert("user_name".to_string(), "用户名".to_string());
        variables.insert("query".to_string(), "用户查询".to_string());

        PromptTemplate {
            id: id.to_string(),
            name: name.to_string(),
            description: "测试模板".to_string(),
            content: "你好 {{user_name}}，你的问题是：{{query}}".to_string(),
            version: "1".to_string(),
            variables,
            tags: vec!["test".to_string()],
            status: TemplateStatus::Active,
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
            created_by: "test_user".to_string(),
        }
    }

    #[test]
    fn test_template_status_as_str() {
        assert_eq!(TemplateStatus::Draft.as_str(), "draft");
        assert_eq!(TemplateStatus::Active.as_str(), "active");
        assert_eq!(TemplateStatus::Deprecated.as_str(), "deprecated");
    }

    #[test]
    fn test_prompt_engine_creation() {
        let engine = create_test_engine();
        assert!(engine.config().enabled);
    }

    #[test]
    fn test_register_template() {
        let engine = create_test_engine();
        let template = create_test_template("t1", "测试模板");

        let result = engine.register_template(template);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "t1");
    }

    #[test]
    fn test_get_template() {
        let engine = create_test_engine();
        let template = create_test_template("t1", "测试模板");
        engine.register_template(template).unwrap();

        let retrieved = engine.get_template("t1");
        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap().name, "测试模板");
    }

    #[test]
    fn test_list_templates() {
        let engine = create_test_engine();
        engine
            .register_template(create_test_template("t1", "模板1"))
            .unwrap();
        engine
            .register_template(create_test_template("t2", "模板2"))
            .unwrap();

        let templates = engine.list_templates(None);
        assert_eq!(templates.len(), 2);
    }

    #[test]
    fn test_list_templates_by_tag() {
        let engine = create_test_engine();
        let mut t1 = create_test_template("t1", "模板1");
        t1.tags = vec!["test".to_string()];
        let mut t2 = create_test_template("t2", "模板2");
        t2.tags = vec!["production".to_string()];

        engine.register_template(t1).unwrap();
        engine.register_template(t2).unwrap();

        let test_templates = engine.list_templates(Some("test"));
        assert_eq!(test_templates.len(), 1);
        assert_eq!(test_templates[0].id, "t1");
    }

    #[test]
    fn test_update_template() {
        let engine = create_test_engine();
        engine
            .register_template(create_test_template("t1", "测试模板"))
            .unwrap();

        let result = engine.update_template(
            "t1",
            Some("更新后的内容 {{user_name}}"),
            None,
            "更新内容",
            "admin",
        );
        assert!(result.is_ok());

        let template = engine.get_template("t1").unwrap();
        assert_eq!(template.version, "2");
        assert!(template.content.contains("更新后的内容"));
    }

    #[test]
    fn test_delete_template() {
        let engine = create_test_engine();
        engine
            .register_template(create_test_template("t1", "测试模板"))
            .unwrap();

        let result = engine.delete_template("t1");
        assert!(result.is_ok());
        assert!(engine.get_template("t1").is_none());
    }

    #[test]
    fn test_render_template() {
        let engine = create_test_engine();
        engine
            .register_template(create_test_template("t1", "测试模板"))
            .unwrap();

        let mut variables = HashMap::new();
        variables.insert("user_name".to_string(), "张三".to_string());
        variables.insert("query".to_string(), "如何使用系统".to_string());

        let result = engine.render("t1", &variables).unwrap();
        assert!(result.content.contains("张三"));
        assert!(result.content.contains("如何使用系统"));
        assert_eq!(result.used_variables.len(), 2);
        assert!(result.missing_variables.is_empty());
    }

    #[test]
    fn test_render_template_missing_variables() {
        let engine = create_test_engine();
        engine
            .register_template(create_test_template("t1", "测试模板"))
            .unwrap();

        let mut variables = HashMap::new();
        variables.insert("user_name".to_string(), "张三".to_string());
        // 缺少 query 变量

        let result = engine.render("t1", &variables).unwrap();
        assert!(result.content.contains("张三"));
        assert_eq!(result.missing_variables.len(), 1);
        assert!(result.missing_variables.contains(&"query".to_string()));
    }

    #[test]
    fn test_version_history() {
        let engine = create_test_engine();
        engine
            .register_template(create_test_template("t1", "测试模板"))
            .unwrap();

        engine
            .update_template("t1", Some("版本2"), None, "更新", "admin")
            .unwrap();

        let history = engine.get_version_history("t1");
        assert_eq!(history.len(), 2);
    }

    #[test]
    fn test_rollback_to_version() {
        let engine = create_test_engine();
        engine
            .register_template(create_test_template("t1", "测试模板"))
            .unwrap();

        engine
            .update_template("t1", Some("版本2内容"), None, "更新", "admin")
            .unwrap();

        let result = engine.rollback_to_version("t1", "1", "admin");
        assert!(result.is_ok());

        let template = engine.get_template("t1").unwrap();
        assert_eq!(template.version, "3"); // 回滚会创建新版本
    }

    #[test]
    fn test_create_ab_test() {
        let engine = create_test_engine();
        engine
            .register_template(create_test_template("t1", "模板A"))
            .unwrap();
        engine
            .register_template(create_test_template("t2", "模板B"))
            .unwrap();

        let config = AbTestConfig {
            test_id: "ab1".to_string(),
            name: "测试A/B".to_string(),
            template_a_id: "t1".to_string(),
            template_a_version: "1".to_string(),
            template_b_id: "t2".to_string(),
            template_b_version: "1".to_string(),
            traffic_ratio_a: 0.5,
            enabled: true,
            created_at: chrono::Utc::now().to_rfc3339(),
        };

        let result = engine.create_ab_test(config);
        assert!(result.is_ok());
    }

    #[test]
    fn test_render_ab_test() {
        let engine = create_test_engine();
        engine
            .register_template(create_test_template("t1", "模板A"))
            .unwrap();
        engine
            .register_template(create_test_template("t2", "模板B"))
            .unwrap();

        let config = AbTestConfig {
            test_id: "ab1".to_string(),
            name: "测试A/B".to_string(),
            template_a_id: "t1".to_string(),
            template_a_version: "1".to_string(),
            template_b_id: "t2".to_string(),
            template_b_version: "1".to_string(),
            traffic_ratio_a: 0.5,
            enabled: true,
            created_at: chrono::Utc::now().to_rfc3339(),
        };
        engine.create_ab_test(config).unwrap();

        let mut variables = HashMap::new();
        variables.insert("user_name".to_string(), "张三".to_string());
        variables.insert("query".to_string(), "测试".to_string());

        let (result, group) = engine.render_ab_test("ab1", &variables).unwrap();
        assert!(!result.content.is_empty());
        assert!(group == "A" || group == "B");
    }

    #[test]
    fn test_get_stats() {
        let engine = create_test_engine();
        engine
            .register_template(create_test_template("t1", "模板1"))
            .unwrap();
        engine
            .register_template(create_test_template("t2", "模板2"))
            .unwrap();

        let stats = engine.get_stats();
        assert_eq!(stats.total_templates, 2);
        assert_eq!(stats.active_templates, 2);
        assert_eq!(stats.total_versions, 2);
    }

    #[test]
    fn test_prompt_engine_config_default() {
        let config = PromptEngineConfig::default();
        assert!(config.enabled);
        assert!(config.enable_ab_testing);
        assert_eq!(config.max_version_history, 50);
    }
}

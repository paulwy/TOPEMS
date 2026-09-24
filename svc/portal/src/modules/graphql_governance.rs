//! V45.0 Track E: GraphQL 企业级治理（自 graphql_schema.rs 拆分）
//!
//! Schema 注册表 + 契约测试 + 版本管理：
//! 1. Gql 输出类型（SchemaChangeGql / SchemaRegistryEntryGql / ContractViolationGql / ContractTestGql / SchemaVersionGql / SchemaGovernanceStatsGql 等）
//! 2. SDL 文本解析（Breaking Change 检测基础）
//! 3. Schema 注册表（注册 / 发布 / 查询）
//! 4. Breaking Change 检测器（ViolationTypeGql）
//! 5. 契约测试运行器（ContractTestInput / ContractTestResultGql）
//! 6. Schema 版本管理器（VersionChangelogGql / VersionDiffGql）
//! 7. 治理统计查询函数与初始化预置数据
//!
//! 拆分方式：从 `graphql_schema.rs` 提取本模块后，原文件通过
//! `pub use crate::modules::graphql_governance::*;` 重新导出，
//! 保持 `modules::graphql_schema::*` 访问路径不变。

use async_graphql::SimpleObject;
use chrono::Utc;
use sha2::{Digest, Sha256};
use std::collections::{HashMap, HashSet};
use std::sync::Mutex;

// 实现 GraphQL 企业级治理体系：
// 1. Schema 注册表：服务 Schema 注册 + 版本追踪 + 变更检测
// 2. 契约测试：查询契约 + 响应验证 + Breaking Change 检测
// 3. 版本管理：Schema 版本化 + 变更日志 + 回滚
//
// 全局状态使用 OnceLock<Mutex> 存储；契约测试用模拟执行；Breaking Change 检测基于 SDL 文本比较。

// --- V45.0: 枚举类型 ---

/// V45.0: Schema 版本状态
#[derive(async_graphql::Enum, Debug, Clone, Copy, PartialEq, Eq)]
pub enum SchemaVersionStatusGql {
    Draft,
    Staging,
    Active,
    Deprecated,
    Retired,
}

/// V45.0: Schema 变更类型
#[derive(async_graphql::Enum, Debug, Clone, Copy, PartialEq, Eq)]
pub enum SchemaChangeTypeGql {
    TypeAdded,
    TypeRemoved,
    FieldAdded,
    FieldRemoved,
    FieldChanged,
    EnumValueAdded,
    EnumValueRemoved,
    ArgumentAdded,
    ArgumentRemoved,
    InterfaceAdded,
    InterfaceRemoved,
}

/// V45.0: 契约违规类型
#[derive(async_graphql::Enum, Debug, Clone, Copy, PartialEq, Eq)]
pub enum ViolationTypeGql {
    MissingField,
    ExtraField,
    TypeMismatch,
    NullabilityChanged,
    DeprecationViolation,
}

// --- V45.0: Gql 类型定义 ---

/// V45.0: Schema 变更记录
#[derive(SimpleObject, Clone)]
pub struct SchemaChangeGql {
    pub version: String,
    pub change_type: SchemaChangeTypeGql,
    pub description: String,
    pub breaking: bool,
    pub affected_types: Vec<String>,
    pub timestamp: String,
}

/// V45.0: Schema 注册表条目
#[derive(SimpleObject, Clone)]
pub struct SchemaRegistryEntryGql {
    pub service_name: String,
    pub version: String,
    pub sdl: String,
    pub schema_hash: String,
    pub registered_at: String,
    pub registered_by: String,
    pub status: SchemaVersionStatusGql,
    pub changes: Vec<SchemaChangeGql>,
    pub dependencies: Vec<String>,
}

/// V45.0: 契约违规
#[derive(SimpleObject, Clone)]
pub struct ContractViolationGql {
    pub field_path: String,
    pub expected: String,
    pub actual: String,
    pub violation_type: ViolationTypeGql,
    pub severity: String,
}

/// V45.0: 契约测试结果
#[derive(SimpleObject, Clone)]
pub struct ContractTestResultGql {
    pub test_id: String,
    pub passed: bool,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
    pub response_time_ms: u64,
    pub ran_at: String,
    pub diff: Vec<ContractViolationGql>,
}

/// V45.0: 契约测试定义
#[derive(SimpleObject, Clone)]
pub struct ContractTestGql {
    pub id: String,
    pub name: String,
    pub service: String,
    pub operation_type: String,
    pub query: String,
    pub expected_fields: Vec<String>,
    pub expected_types: Vec<String>,
    pub tolerance: f64,
    pub enabled: bool,
    pub last_run: Option<String>,
    pub last_result: Option<ContractTestResultGql>,
}

/// V45.0: 契约测试输入
#[derive(async_graphql::InputObject, Clone)]
pub struct ContractTestInput {
    pub name: String,
    pub service: String,
    pub operation_type: String,
    pub query: String,
    pub expected_fields: Vec<String>,
    pub expected_types: Vec<String>,
    pub tolerance: Option<f64>,
    pub enabled: Option<bool>,
}

/// V45.0: 版本变更日志
#[derive(SimpleObject, Clone)]
pub struct VersionChangelogGql {
    pub version: String,
    pub changes: Vec<SchemaChangeGql>,
    pub breaking_changes_count: u32,
    pub additions_count: u32,
    pub deprecations_count: u32,
    pub improvements_count: u32,
}

/// V45.0: Schema 版本
#[derive(SimpleObject, Clone)]
pub struct SchemaVersionGql {
    pub service: String,
    pub version: String,
    pub semver: String,
    pub sdl: String,
    pub hash: String,
    pub changelog: VersionChangelogGql,
    pub published_at: String,
    pub author: String,
    pub status: SchemaVersionStatusGql,
    pub download_count: u64,
    pub tags: Vec<String>,
}

/// V45.0: 版本差异
#[derive(SimpleObject, Clone)]
pub struct VersionDiffGql {
    pub from_version: String,
    pub to_version: String,
    pub added_types: Vec<String>,
    pub removed_types: Vec<String>,
    pub modified_types: Vec<String>,
    pub added_fields: Vec<String>,
    pub removed_fields: Vec<String>,
    pub breaking_changes: Vec<SchemaChangeGql>,
    pub compatible: bool,
}

/// V45.0: 治理统计
#[derive(SimpleObject, Clone)]
pub struct SchemaGovernanceStatsGql {
    pub total_services: u32,
    pub total_versions: u32,
    pub active_schemas: u32,
    pub total_tests: u32,
    pub passing_tests: u32,
    pub failing_tests: u32,
    pub breaking_changes_detected: u32,
    pub last_scan: String,
}

/// V45.0: 服务治理信息
#[derive(SimpleObject, Clone)]
pub struct ServiceGovernanceInfoGql {
    pub service: String,
    pub current_version: String,
    pub versions_count: u32,
    pub tests_count: u32,
    pub passing_rate: f64,
    pub last_change: String,
    pub breaking_changes_count: u32,
}

// --- V45.0: SDL 文本解析（用于 Breaking Change 检测） ---

/// V45.0: 从 SDL 文本中提取类型定义
/// 返回 (type_name -> Vec<field_name>) 的映射
/// 支持 type / enum / interface / input 定义，自动跳过 "extend " 前缀
fn parse_sdl_types(sdl: &str) -> HashMap<String, Vec<String>> {
    let mut types = HashMap::new();
    let mut current_type: Option<String> = None;
    let mut current_fields: Vec<String> = Vec::new();
    let mut brace_depth: i32 = 0;
    let mut brace_opened: bool = false;

    for raw_line in sdl.lines() {
        let line = raw_line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }

        // 如果不在类型定义内部，查找类型定义
        if current_type.is_none() {
            let check = line.strip_prefix("extend ").unwrap_or(line);
            for kw in &["type ", "enum ", "interface ", "input "] {
                if let Some(rest) = check.strip_prefix(kw) {
                    let name: String = rest
                        .split(|c: char| c.is_whitespace() || c == '{' || c == '@' || c == '=')
                        .next()
                        .unwrap_or("")
                        .to_string();
                    if !name.is_empty() {
                        current_type = Some(name);
                        brace_depth =
                            (line.matches('{').count() as i32) - (line.matches('}').count() as i32);
                        brace_opened = brace_depth > 0;
                        // 单行定义：type X {}
                        if brace_opened && brace_depth <= 0 {
                            if let Some(n) = current_type.take() {
                                types.insert(n, std::mem::take(&mut current_fields));
                            }
                            brace_depth = 0;
                            brace_opened = false;
                        }
                    }
                    break;
                }
            }
            continue;
        }

        // 类型定义内部（或等待开始大括号）
        let opens = line.matches('{').count() as i32;
        let closes = line.matches('}').count() as i32;
        brace_depth += opens - closes;
        if opens > 0 {
            brace_opened = true;
        }

        if brace_opened && brace_depth <= 0 {
            if let Some(n) = current_type.take() {
                types.insert(n, std::mem::take(&mut current_fields));
            }
            brace_depth = 0;
            brace_opened = false;
            continue;
        }

        // 仅在 depth==1 时提取字段名
        if brace_opened && brace_depth == 1 {
            let field_name = line
                .split(|c: char| c == ':' || c == '(' || c.is_whitespace())
                .next()
                .unwrap_or("")
                .trim()
                .to_string();
            if !field_name.is_empty()
                && !field_name.starts_with('#')
                && field_name != "}"
                && !field_name.starts_with('"')
                && field_name != "{"
            {
                current_fields.push(field_name);
            }
        }
    }

    if let Some(n) = current_type.take() {
        types.insert(n, std::mem::take(&mut current_fields));
    }

    types
}

// --- V45.0: Schema 注册表 ---

/// V45.0: Schema 注册表（内存存储）
pub struct SchemaRegistry {
    /// service_name -> 已注册版本列表（按注册顺序）
    entries: HashMap<String, Vec<SchemaRegistryEntryGql>>,
}

impl SchemaRegistry {
    fn new() -> Self {
        Self {
            entries: HashMap::new(),
        }
    }

    fn compute_hash(sdl: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(sdl.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    /// 注册新 Schema 版本
    pub fn register(
        &mut self,
        service: &str,
        version: &str,
        sdl: &str,
        registered_by: &str,
    ) -> SchemaRegistryEntryGql {
        let schema_hash = Self::compute_hash(sdl);
        let now = Utc::now().to_rfc3339();

        // 与前一版本对比检测变更
        let changes = if let Some(versions) = self.entries.get(service) {
            if let Some(prev) = versions.last() {
                BreakingChangeDetector::detect_changes(&prev.sdl, sdl, version)
            } else {
                vec![SchemaChangeGql {
                    version: version.to_string(),
                    change_type: SchemaChangeTypeGql::TypeAdded,
                    description: format!("Initial schema for {}", service),
                    breaking: false,
                    affected_types: vec![],
                    timestamp: now.clone(),
                }]
            }
        } else {
            vec![SchemaChangeGql {
                version: version.to_string(),
                change_type: SchemaChangeTypeGql::TypeAdded,
                description: format!("Initial schema for {}", service),
                breaking: false,
                affected_types: vec![],
                timestamp: now.clone(),
            }]
        };

        // 废弃前一 Active 版本
        if let Some(versions) = self.entries.get_mut(service) {
            for v in versions.iter_mut() {
                if v.status == SchemaVersionStatusGql::Active {
                    v.status = SchemaVersionStatusGql::Deprecated;
                }
            }
        }

        let entry = SchemaRegistryEntryGql {
            service_name: service.to_string(),
            version: version.to_string(),
            sdl: sdl.to_string(),
            schema_hash,
            registered_at: now,
            registered_by: registered_by.to_string(),
            status: SchemaVersionStatusGql::Active,
            changes,
            dependencies: vec![],
        };

        self.entries
            .entry(service.to_string())
            .or_default()
            .push(entry.clone());

        entry
    }

    fn get_active(&self, service: &str) -> Option<SchemaRegistryEntryGql> {
        self.entries.get(service).and_then(|versions| {
            versions
                .iter()
                .find(|v| v.status == SchemaVersionStatusGql::Active)
                .cloned()
        })
    }

    pub fn get_version(&self, service: &str, version: &str) -> Option<SchemaRegistryEntryGql> {
        self.entries
            .get(service)
            .and_then(|versions| versions.iter().find(|v| v.version == version).cloned())
    }

    pub fn list_versions(&self, service: &str) -> Vec<SchemaRegistryEntryGql> {
        self.entries.get(service).cloned().unwrap_or_default()
    }

    pub fn deprecate(&mut self, service: &str, version: &str) -> bool {
        if let Some(versions) = self.entries.get_mut(service) {
            for v in versions.iter_mut() {
                if v.version == version && v.status == SchemaVersionStatusGql::Active {
                    v.status = SchemaVersionStatusGql::Deprecated;
                    return true;
                }
            }
        }
        false
    }

    pub fn retire(&mut self, service: &str, version: &str) -> bool {
        if let Some(versions) = self.entries.get_mut(service) {
            for v in versions.iter_mut() {
                if v.version == version {
                    v.status = SchemaVersionStatusGql::Retired;
                    return true;
                }
            }
        }
        false
    }

    pub fn diff_versions(
        &self,
        service: &str,
        from_version: &str,
        to_version: &str,
    ) -> Option<VersionDiffGql> {
        let from = self.get_version(service, from_version)?;
        let to = self.get_version(service, to_version)?;
        Some(BreakingChangeDetector::diff_versions(&from, &to))
    }
}

// --- V45.0: Breaking Change 检测器 ---

/// V45.0: Breaking Change 检测器（基于 SDL 文本比较）
struct BreakingChangeDetector;

impl BreakingChangeDetector {
    /// 检测两个 SDL 之间的变更
    fn detect_changes(from_sdl: &str, to_sdl: &str, new_version: &str) -> Vec<SchemaChangeGql> {
        let from_types = parse_sdl_types(from_sdl);
        let to_types = parse_sdl_types(to_sdl);
        let now = Utc::now().to_rfc3339();
        let mut changes = Vec::new();

        // 检测移除的类型（Breaking）
        for type_name in from_types.keys() {
            if !to_types.contains_key(type_name) {
                changes.push(SchemaChangeGql {
                    version: new_version.to_string(),
                    change_type: SchemaChangeTypeGql::TypeRemoved,
                    description: format!("Type '{}' removed", type_name),
                    breaking: true,
                    affected_types: vec![type_name.clone()],
                    timestamp: now.clone(),
                });
            }
        }

        // 检测新增的类型（非 Breaking）
        for type_name in to_types.keys() {
            if !from_types.contains_key(type_name) {
                changes.push(SchemaChangeGql {
                    version: new_version.to_string(),
                    change_type: SchemaChangeTypeGql::TypeAdded,
                    description: format!("Type '{}' added", type_name),
                    breaking: false,
                    affected_types: vec![type_name.clone()],
                    timestamp: now.clone(),
                });
            }
        }

        // 检测共有类型的字段变更
        for (type_name, to_fields) in &to_types {
            if let Some(from_fields) = from_types.get(type_name) {
                let from_set: HashSet<&String> = from_fields.iter().collect();
                let to_set: HashSet<&String> = to_fields.iter().collect();

                // 移除的字段（Breaking）
                for field in &from_set {
                    if !to_set.contains(field) {
                        changes.push(SchemaChangeGql {
                            version: new_version.to_string(),
                            change_type: SchemaChangeTypeGql::FieldRemoved,
                            description: format!(
                                "Field '{}' removed from type '{}'",
                                field, type_name
                            ),
                            breaking: true,
                            affected_types: vec![type_name.clone()],
                            timestamp: now.clone(),
                        });
                    }
                }

                // 新增的字段（非 Breaking）
                for field in &to_set {
                    if !from_set.contains(field) {
                        changes.push(SchemaChangeGql {
                            version: new_version.to_string(),
                            change_type: SchemaChangeTypeGql::FieldAdded,
                            description: format!("Field '{}' added to type '{}'", field, type_name),
                            breaking: false,
                            affected_types: vec![type_name.clone()],
                            timestamp: now.clone(),
                        });
                    }
                }
            }
        }

        changes
    }

    /// 检查兼容性（无 Breaking Change 则兼容）
    fn check_compatibility(from_sdl: &str, to_sdl: &str) -> bool {
        let changes = Self::detect_changes(from_sdl, to_sdl, "0.0.0");
        !changes.iter().any(|c| c.breaking)
    }

    /// 生成兼容性报告
    pub fn diff_versions(
        from: &SchemaRegistryEntryGql,
        to: &SchemaRegistryEntryGql,
    ) -> VersionDiffGql {
        let from_types = parse_sdl_types(&from.sdl);
        let to_types = parse_sdl_types(&to.sdl);

        let mut added_types = Vec::new();
        let mut removed_types = Vec::new();
        let mut modified_types = Vec::new();
        let mut added_fields = Vec::new();
        let mut removed_fields = Vec::new();

        for type_name in to_types.keys() {
            if !from_types.contains_key(type_name) {
                added_types.push(type_name.clone());
            }
        }

        for type_name in from_types.keys() {
            if !to_types.contains_key(type_name) {
                removed_types.push(type_name.clone());
            }
        }

        for (type_name, to_fields) in &to_types {
            if let Some(from_fields) = from_types.get(type_name) {
                let from_set: HashSet<&String> = from_fields.iter().collect();
                let to_set: HashSet<&String> = to_fields.iter().collect();

                if from_set != to_set {
                    modified_types.push(type_name.clone());
                }

                for field in &to_set {
                    if !from_set.contains(field) {
                        added_fields.push(format!("{}.{}", type_name, field));
                    }
                }
                for field in &from_set {
                    if !to_set.contains(field) {
                        removed_fields.push(format!("{}.{}", type_name, field));
                    }
                }
            }
        }

        let breaking_changes: Vec<SchemaChangeGql> =
            Self::detect_changes(&from.sdl, &to.sdl, &to.version)
                .into_iter()
                .filter(|c| c.breaking)
                .collect();

        let compatible = breaking_changes.is_empty();

        VersionDiffGql {
            from_version: from.version.clone(),
            to_version: to.version.clone(),
            added_types,
            removed_types,
            modified_types,
            added_fields,
            removed_fields,
            breaking_changes,
            compatible,
        }
    }
}

// --- V45.0: 契约测试运行器 ---

/// V45.0: 契约测试运行器（模拟执行，不实际调用服务）
pub struct ContractTestRunner {
    pub tests: HashMap<String, ContractTestGql>,
    results: Vec<ContractTestResultGql>,
}

impl ContractTestRunner {
    fn new() -> Self {
        Self {
            tests: HashMap::new(),
            results: Vec::new(),
        }
    }

    pub fn run_test(&mut self, test_id: &str) -> Option<ContractTestResultGql> {
        let test = self.tests.get(test_id)?.clone();
        Some(self.execute_test(&test))
    }

    /// 模拟执行契约测试
    fn execute_test(&mut self, test: &ContractTestGql) -> ContractTestResultGql {
        let start = std::time::Instant::now();
        let now = Utc::now().to_rfc3339();
        let mut errors = Vec::new();
        let mut warnings = Vec::new();
        let mut violations = Vec::new();

        // 模拟执行：检查 expected_fields 是否出现在 query 文本中
        let query_lower = test.query.to_lowercase();
        for field in &test.expected_fields {
            if !query_lower.contains(&field.to_lowercase()) {
                violations.push(ContractViolationGql {
                    field_path: field.clone(),
                    expected: "field present in query".to_string(),
                    actual: "field not found in query".to_string(),
                    violation_type: ViolationTypeGql::MissingField,
                    severity: "error".to_string(),
                });
                errors.push(format!("Expected field '{}' not found in query", field));
            }
        }

        // 检查 expected_types（格式 "fieldName:typeName"）
        for type_spec in &test.expected_types {
            let parts: Vec<&str> = type_spec.splitn(2, ':').collect();
            if parts.len() == 2 {
                let field_name = parts[0].trim();
                let type_name = parts[1].trim();
                if !query_lower.contains(&field_name.to_lowercase()) {
                    violations.push(ContractViolationGql {
                        field_path: field_name.to_string(),
                        expected: type_name.to_string(),
                        actual: "field not found".to_string(),
                        violation_type: ViolationTypeGql::TypeMismatch,
                        severity: "warning".to_string(),
                    });
                    warnings.push(format!(
                        "Expected type '{}' for field '{}' not verified",
                        type_name, field_name
                    ));
                }
            }
        }

        let elapsed = start.elapsed().as_millis() as u64;
        let passed = errors.is_empty();

        let result = ContractTestResultGql {
            test_id: test.id.clone(),
            passed,
            errors,
            warnings,
            response_time_ms: elapsed,
            ran_at: now,
            diff: violations,
        };

        // 更新测试的 last_run 和 last_result
        if let Some(t) = self.tests.get_mut(&test.id) {
            t.last_run = Some(result.ran_at.clone());
            t.last_result = Some(result.clone());
        }

        // 存储结果（上限 1000 条）
        self.results.push(result.clone());
        if self.results.len() > 1000 {
            self.results.remove(0);
        }

        result
    }

    pub fn run_all(&mut self, service: Option<&str>) -> u32 {
        let tests: Vec<ContractTestGql> = self
            .tests
            .values()
            .filter(|t| service.is_none_or(|s| t.service == s))
            .filter(|t| t.enabled)
            .cloned()
            .collect();
        let mut count = 0u32;
        for test in tests {
            self.execute_test(&test);
            count += 1;
        }
        count
    }

    pub fn add_test(&mut self, input: ContractTestInput) -> String {
        let id = format!("ct-{}", uuid::Uuid::new_v4());
        let test = ContractTestGql {
            id: id.clone(),
            name: input.name,
            service: input.service,
            operation_type: input.operation_type,
            query: input.query,
            expected_fields: input.expected_fields,
            expected_types: input.expected_types,
            tolerance: input.tolerance.unwrap_or(0.0),
            enabled: input.enabled.unwrap_or(true),
            last_run: None,
            last_result: None,
        };
        self.tests.insert(id.clone(), test);
        id
    }

    pub fn update_test(&mut self, id: &str, input: ContractTestInput) -> bool {
        if let Some(test) = self.tests.get_mut(id) {
            test.name = input.name;
            test.service = input.service;
            test.operation_type = input.operation_type;
            test.query = input.query;
            test.expected_fields = input.expected_fields;
            test.expected_types = input.expected_types;
            if let Some(t) = input.tolerance {
                test.tolerance = t;
            }
            if let Some(e) = input.enabled {
                test.enabled = e;
            }
            true
        } else {
            false
        }
    }

    pub fn remove_test(&mut self, id: &str) -> bool {
        self.tests.remove(id).is_some()
    }

    pub fn get_results(&self, test_id: &str, limit: usize) -> Vec<ContractTestResultGql> {
        self.results
            .iter()
            .filter(|r| r.test_id == test_id)
            .rev()
            .take(limit)
            .cloned()
            .collect()
    }

    fn get_stats(&self) -> (u32, u32, u32) {
        let total = self.tests.len() as u32;
        let mut passing = 0u32;
        let mut failing = 0u32;
        for test in self.tests.values() {
            if let Some(result) = &test.last_result {
                if result.passed {
                    passing += 1;
                } else {
                    failing += 1;
                }
            }
        }
        (total, passing, failing)
    }
}

// --- V45.0: Schema 版本管理器 ---

/// V45.0: Schema 版本管理器（SemVer 版本化 + 变更日志 + 回滚）
pub struct SchemaVersionManager {
    /// service -> 版本列表（按发布顺序）
    versions: HashMap<String, Vec<SchemaVersionGql>>,
}

impl SchemaVersionManager {
    fn new() -> Self {
        Self {
            versions: HashMap::new(),
        }
    }

    fn compute_hash(sdl: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(sdl.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    /// 发布新版本
    pub fn publish(
        &mut self,
        service: &str,
        version: &str,
        _changelog_text: &str,
        sdl: &str,
    ) -> String {
        let hash = Self::compute_hash(sdl);
        let now = Utc::now().to_rfc3339();

        // 与前一版本对比检测变更
        let (changes, breaking_count, additions_count) =
            if let Some(versions) = self.versions.get(service) {
                if let Some(prev) = versions.last() {
                    let detected = BreakingChangeDetector::detect_changes(&prev.sdl, sdl, version);
                    let breaking = detected.iter().filter(|c| c.breaking).count() as u32;
                    let additions = detected
                        .iter()
                        .filter(|c| {
                            matches!(
                                c.change_type,
                                SchemaChangeTypeGql::TypeAdded
                                    | SchemaChangeTypeGql::FieldAdded
                                    | SchemaChangeTypeGql::EnumValueAdded
                                    | SchemaChangeTypeGql::ArgumentAdded
                                    | SchemaChangeTypeGql::InterfaceAdded
                            )
                        })
                        .count() as u32;
                    (detected, breaking, additions)
                } else {
                    (vec![], 0, 0)
                }
            } else {
                (vec![], 0, 0)
            };

        // 降级前一 Active 版本为 Staging
        if let Some(versions) = self.versions.get_mut(service) {
            for v in versions.iter_mut() {
                if v.status == SchemaVersionStatusGql::Active {
                    v.status = SchemaVersionStatusGql::Staging;
                }
            }
        }

        let changelog = VersionChangelogGql {
            version: version.to_string(),
            changes: changes.clone(),
            breaking_changes_count: breaking_count,
            additions_count,
            deprecations_count: 0,
            improvements_count: 0,
        };

        let version_entry = SchemaVersionGql {
            service: service.to_string(),
            version: version.to_string(),
            semver: version.to_string(),
            sdl: sdl.to_string(),
            hash,
            changelog,
            published_at: now,
            author: "system".to_string(),
            status: SchemaVersionStatusGql::Active,
            download_count: 0,
            tags: vec![],
        };

        self.versions
            .entry(service.to_string())
            .or_default()
            .push(version_entry.clone());

        version_entry.version
    }

    pub fn get_version(&self, service: &str, version: &str) -> Option<SchemaVersionGql> {
        self.versions
            .get(service)
            .and_then(|vs| vs.iter().find(|v| v.version == version).cloned())
    }

    pub fn list_versions(&self, service: &str) -> Vec<SchemaVersionGql> {
        self.versions.get(service).cloned().unwrap_or_default()
    }

    fn get_changelog(&self, service: &str, version: &str) -> Option<VersionChangelogGql> {
        self.get_version(service, version).map(|v| v.changelog)
    }

    pub fn diff(&self, service: &str, from: &str, to: &str) -> Option<VersionDiffGql> {
        let from_version = self.get_version(service, from)?;
        let to_version = self.get_version(service, to)?;

        let from_types = parse_sdl_types(&from_version.sdl);
        let to_types = parse_sdl_types(&to_version.sdl);

        let mut added_types = Vec::new();
        let mut removed_types = Vec::new();
        let mut modified_types = Vec::new();
        let mut added_fields = Vec::new();
        let mut removed_fields = Vec::new();

        for type_name in to_types.keys() {
            if !from_types.contains_key(type_name) {
                added_types.push(type_name.clone());
            }
        }
        for type_name in from_types.keys() {
            if !to_types.contains_key(type_name) {
                removed_types.push(type_name.clone());
            }
        }
        for (type_name, to_fields) in &to_types {
            if let Some(from_fields) = from_types.get(type_name) {
                let from_set: HashSet<&String> = from_fields.iter().collect();
                let to_set: HashSet<&String> = to_fields.iter().collect();
                if from_set != to_set {
                    modified_types.push(type_name.clone());
                }
                for field in &to_set {
                    if !from_set.contains(field) {
                        added_fields.push(format!("{}.{}", type_name, field));
                    }
                }
                for field in &from_set {
                    if !to_set.contains(field) {
                        removed_fields.push(format!("{}.{}", type_name, field));
                    }
                }
            }
        }

        let breaking_changes: Vec<SchemaChangeGql> = BreakingChangeDetector::detect_changes(
            &from_version.sdl,
            &to_version.sdl,
            &to_version.version,
        )
        .into_iter()
        .filter(|c| c.breaking)
        .collect();

        let compatible = breaking_changes.is_empty();

        Some(VersionDiffGql {
            from_version: from.to_string(),
            to_version: to.to_string(),
            added_types,
            removed_types,
            modified_types,
            added_fields,
            removed_fields,
            breaking_changes,
            compatible,
        })
    }

    /// 回滚到指定版本（降级当前 Active，提升目标版本为 Active）
    pub fn rollback(&mut self, service: &str, to_version: &str) -> bool {
        if let Some(versions) = self.versions.get_mut(service) {
            // 降级所有 Active 版本
            for v in versions.iter_mut() {
                if v.status == SchemaVersionStatusGql::Active {
                    v.status = SchemaVersionStatusGql::Staging;
                }
            }
            // 提升目标版本为 Active
            for v in versions.iter_mut() {
                if v.version == to_version {
                    v.status = SchemaVersionStatusGql::Active;
                    return true;
                }
            }
        }
        false
    }

    /// 提升版本为 Active
    pub fn promote(&mut self, service: &str, version: &str) -> bool {
        if let Some(versions) = self.versions.get_mut(service) {
            // 降级当前 Active
            for v in versions.iter_mut() {
                if v.status == SchemaVersionStatusGql::Active {
                    v.status = SchemaVersionStatusGql::Staging;
                }
            }
            // 提升目标版本
            for v in versions.iter_mut() {
                if v.version == version {
                    v.status = SchemaVersionStatusGql::Active;
                    return true;
                }
            }
        }
        false
    }

    fn get_stats(&self) -> (u32, u32, u32) {
        let total_services = self.versions.len() as u32;
        let total_versions: u32 = self.versions.values().map(|v| v.len() as u32).sum();
        let active_schemas: u32 = self
            .versions
            .values()
            .filter(|versions| {
                versions
                    .iter()
                    .any(|v| v.status == SchemaVersionStatusGql::Active)
            })
            .count() as u32;
        (total_services, total_versions, active_schemas)
    }
}

// --- V45.0: 全局状态 ---

/// V45.0: 全局 Schema 注册表
static SCHEMA_REGISTRY: std::sync::OnceLock<Mutex<SchemaRegistry>> = std::sync::OnceLock::new();

pub fn schema_registry() -> &'static Mutex<SchemaRegistry> {
    SCHEMA_REGISTRY.get_or_init(|| Mutex::new(SchemaRegistry::new()))
}

/// V45.0: 全局契约测试运行器
static CONTRACT_TEST_RUNNER: std::sync::OnceLock<Mutex<ContractTestRunner>> =
    std::sync::OnceLock::new();

pub fn contract_test_runner() -> &'static Mutex<ContractTestRunner> {
    CONTRACT_TEST_RUNNER.get_or_init(|| Mutex::new(ContractTestRunner::new()))
}

/// V45.0: 全局 Schema 版本管理器
static SCHEMA_VERSION_MANAGER: std::sync::OnceLock<Mutex<SchemaVersionManager>> =
    std::sync::OnceLock::new();

pub fn schema_version_manager() -> &'static Mutex<SchemaVersionManager> {
    SCHEMA_VERSION_MANAGER.get_or_init(|| Mutex::new(SchemaVersionManager::new()))
}

/// V45.0: 治理统计计数器
static GOVERNANCE_STATS: std::sync::OnceLock<Mutex<GovernanceStatsInternal>> =
    std::sync::OnceLock::new();

struct GovernanceStatsInternal {
    breaking_changes_detected: u32,
    last_scan: String,
}

impl GovernanceStatsInternal {
    fn new() -> Self {
        Self {
            breaking_changes_detected: 0,
            last_scan: Utc::now().to_rfc3339(),
        }
    }
}

fn governance_stats() -> &'static Mutex<GovernanceStatsInternal> {
    GOVERNANCE_STATS.get_or_init(|| Mutex::new(GovernanceStatsInternal::new()))
}

// --- V45.0: 治理统计查询函数 ---

/// V45.0: 获取治理统计
pub fn get_schema_governance_stats() -> SchemaGovernanceStatsGql {
    let registry = schema_registry().lock().unwrap_or_else(|e| e.into_inner());
    let runner = contract_test_runner()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    let manager = schema_version_manager()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    let gov_stats = governance_stats().lock().unwrap_or_else(|e| e.into_inner());

    let (_total_services_vm, total_versions, active_schemas) = manager.get_stats();
    let (total_tests, passing_tests, failing_tests) = runner.get_stats();

    SchemaGovernanceStatsGql {
        total_services: registry.entries.len() as u32,
        total_versions,
        active_schemas,
        total_tests,
        passing_tests,
        failing_tests,
        breaking_changes_detected: gov_stats.breaking_changes_detected,
        last_scan: gov_stats.last_scan.clone(),
    }
}

/// V45.0: 获取各服务治理信息
pub fn get_service_governance_info() -> Vec<ServiceGovernanceInfoGql> {
    let registry = schema_registry().lock().unwrap_or_else(|e| e.into_inner());
    let runner = contract_test_runner()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    let _manager = schema_version_manager()
        .lock()
        .unwrap_or_else(|e| e.into_inner());

    let services: HashSet<String> = registry.entries.keys().cloned().collect();

    let mut result = Vec::new();
    for service in services {
        let versions = registry.list_versions(&service);
        let current_version = versions
            .iter()
            .find(|v| v.status == SchemaVersionStatusGql::Active)
            .map(|v| v.version.clone())
            .unwrap_or_else(|| "unknown".to_string());

        let versions_count = versions.len() as u32;
        let last_change = versions
            .last()
            .map(|v| v.registered_at.clone())
            .unwrap_or_default();

        let breaking_changes_count = versions
            .iter()
            .flat_map(|v| v.changes.iter())
            .filter(|c| c.breaking)
            .count() as u32;

        let service_tests: Vec<&ContractTestGql> = runner
            .tests
            .values()
            .filter(|t| t.service == service)
            .collect();
        let tests_count = service_tests.len() as u32;
        let passing = service_tests
            .iter()
            .filter(|t| t.last_result.as_ref().is_some_and(|r| r.passed))
            .count();
        let passing_rate = if tests_count > 0 {
            passing as f64 / tests_count as f64
        } else {
            0.0
        };

        result.push(ServiceGovernanceInfoGql {
            service,
            current_version,
            versions_count,
            tests_count,
            passing_rate,
            last_change,
            breaking_changes_count,
        });
    }

    result
}

// --- V45.0: 初始化预置数据 ---

/// V45.0: 初始化预置 5 个服务的 Schema 版本 + 默认契约测试
pub fn init_schema_governance() {
    // 预置 5 个服务的初始 Schema
    let initial_schemas: Vec<(&str, &str)> = vec![
        (
            "erp",
            r#"type Customer @key(fields: "id") {
  id: ID!
  name: String!
  code: String!
  status: String
  email: String
  phone: String
  address: String
  credit_limit: Float
  created_at: String
}

type Query {
  customer(id: ID!): Customer
  customers: [Customer!]!
}
"#,
        ),
        (
            "crm",
            r#"type Contact @key(fields: "id") {
  id: ID!
  name: String!
  email: String
  phone: String
  customer_id: ID
  position: String
  created_at: String
}

type Lead @key(fields: "id") {
  id: ID!
  title: String!
  status: String
  value: Float
  contact_id: ID
  created_at: String
}

type Query {
  contact(id: ID!): Contact
  contacts: [Contact!]!
  lead(id: ID!): Lead
}
"#,
        ),
        (
            "hrm",
            r#"type Employee @key(fields: "id") {
  id: ID!
  name: String!
  department: String
  position: String
  email: String
  phone: String
  hire_date: String
  salary: Float
  status: String
}

type Department @key(fields: "id") {
  id: ID!
  name: String!
  manager_id: ID
  parent_id: ID
}

type Query {
  employee(id: ID!): Employee
  employees: [Employee!]!
  department(id: ID!): Department
}
"#,
        ),
        (
            "finance",
            r#"type Voucher @key(fields: "id") {
  id: ID!
  voucher_number: String!
  voucher_date: String
  total_debit: Float!
  total_credit: Float!
  status: String
  entries: [VoucherEntry!]!
}

type VoucherEntry {
  id: ID!
  account_code: String!
  debit: Float
  credit: Float
  description: String
}

type AccountSubject @key(fields: "id") {
  id: ID!
  code: String!
  name: String!
  type: String
  parent_id: ID
  balance_direction: String
}

type Query {
  voucher(id: ID!): Voucher
  vouchers: [Voucher!]!
  accountSubject(id: ID!): AccountSubject
}
"#,
        ),
        (
            "mes",
            r#"type WorkOrder @key(fields: "id") {
  id: ID!
  order_number: String!
  product_code: String!
  quantity: Float!
  status: String
  priority: String
  start_date: String
  end_date: String
  created_at: String
}

type Material @key(fields: "id") {
  id: ID!
  code: String!
  name: String!
  specification: String
  unit: String
  category: String
}

type BOM @key(fields: "id") {
  id: ID!
  product_code: String!
  material_code: String!
  quantity: Float!
}

type Query {
  workOrder(id: ID!): WorkOrder
  workOrders: [WorkOrder!]!
  material(id: ID!): Material
}
"#,
        ),
    ];

    // 注册到 Schema 注册表 + 版本管理器
    {
        let mut registry = schema_registry().lock().unwrap_or_else(|e| e.into_inner());
        let mut manager = schema_version_manager()
            .lock()
            .unwrap_or_else(|e| e.into_inner());

        // 如果已初始化则跳过
        if registry.entries.len() >= 5 {
            return;
        }

        for (service, sdl) in &initial_schemas {
            let entry = registry.register(service, "1.0.0", sdl, "system");
            let changelog_text = entry
                .changes
                .iter()
                .map(|c| c.description.clone())
                .collect::<Vec<_>>()
                .join("; ");
            manager.publish(service, "1.0.0", &changelog_text, sdl);
        }
    }

    // 预置默认契约测试
    {
        let mut runner = contract_test_runner()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        if !runner.tests.is_empty() {
            return;
        }

        let default_tests = vec![
            ContractTestInput {
                name: "ERP Customer Query Contract".to_string(),
                service: "erp".to_string(),
                operation_type: "query".to_string(),
                query: "{ customer(id: \"1\") { id name code status } }".to_string(),
                expected_fields: vec!["id".into(), "name".into(), "code".into(), "status".into()],
                expected_types: vec!["id:ID".into(), "name:String".into()],
                tolerance: Some(0.1),
                enabled: Some(true),
            },
            ContractTestInput {
                name: "CRM Contact Query Contract".to_string(),
                service: "crm".to_string(),
                operation_type: "query".to_string(),
                query: "{ contact(id: \"1\") { id name email phone } }".to_string(),
                expected_fields: vec!["id".into(), "name".into(), "email".into(), "phone".into()],
                expected_types: vec!["id:ID".into(), "name:String".into()],
                tolerance: Some(0.1),
                enabled: Some(true),
            },
            ContractTestInput {
                name: "HRM Employee Query Contract".to_string(),
                service: "hrm".to_string(),
                operation_type: "query".to_string(),
                query: "{ employee(id: \"1\") { id name department position } }".to_string(),
                expected_fields: vec![
                    "id".into(),
                    "name".into(),
                    "department".into(),
                    "position".into(),
                ],
                expected_types: vec!["id:ID".into(), "name:String".into()],
                tolerance: Some(0.1),
                enabled: Some(true),
            },
            ContractTestInput {
                name: "Finance Voucher Query Contract".to_string(),
                service: "finance".to_string(),
                operation_type: "query".to_string(),
                query: "{ voucher(id: \"1\") { id voucher_number total_debit total_credit } }"
                    .to_string(),
                expected_fields: vec![
                    "id".into(),
                    "voucher_number".into(),
                    "total_debit".into(),
                    "total_credit".into(),
                ],
                expected_types: vec!["id:ID".into(), "voucher_number:String".into()],
                tolerance: Some(0.1),
                enabled: Some(true),
            },
            ContractTestInput {
                name: "MES WorkOrder Query Contract".to_string(),
                service: "mes".to_string(),
                operation_type: "query".to_string(),
                query: "{ workOrder(id: \"1\") { id order_number product_code quantity } }"
                    .to_string(),
                expected_fields: vec![
                    "id".into(),
                    "order_number".into(),
                    "product_code".into(),
                    "quantity".into(),
                ],
                expected_types: vec!["id:ID".into(), "order_number:String".into()],
                tolerance: Some(0.1),
                enabled: Some(true),
            },
        ];

        for input in default_tests {
            runner.add_test(input);
        }
    }

    // 更新治理统计扫描时间
    {
        let mut gov = governance_stats().lock().unwrap_or_else(|e| e.into_inner());
        gov.last_scan = Utc::now().to_rfc3339();
    }
}

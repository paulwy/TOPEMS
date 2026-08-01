#![allow(dead_code)]
use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};

use super::types::*;

// ==================== SchemaEvolutionManager ====================

struct SchemaEvolutionManager {
    versions: HashMap<String, SchemaVersion>,
    versions_by_number: HashMap<String, String>,
    current_version_id: Option<String>,
    migration_history: Vec<MigrationRecord>,
}

impl SchemaEvolutionManager {
    fn new() -> Self {
        Self {
            versions: HashMap::new(),
            versions_by_number: HashMap::new(),
            current_version_id: None,
            migration_history: Vec::new(),
        }
    }

    fn publish(
        &mut self,
        version: String,
        schema_definition: String,
        change_type: String,
        change_description: String,
        approved_by: Option<String>,
    ) -> SchemaVersion {
        let id = generate_id();
        let now = now_utc();
        let previous_current = self.current_version_id.clone();

        let schema_version = SchemaVersion {
            id: id.clone(),
            version: version.clone(),
            schema_definition,
            change_type: change_type.clone(),
            created_at: now,
            change_description,
            approved_by,
        };

        self.versions.insert(id.clone(), schema_version.clone());
        self.versions_by_number.insert(version.clone(), id.clone());
        self.current_version_id = Some(id);

        if let Some(prev_id) = previous_current {
            if let Some(prev) = self.versions.get(&prev_id) {
                let record = MigrationRecord {
                    id: generate_id(),
                    from_version: prev.version.clone(),
                    to_version: version,
                    operation: "publish".to_string(),
                    performed_at: now,
                    performed_by: None,
                    notes: None,
                };
                self.migration_history.push(record);
            }
        }

        schema_version
    }

    fn get(&self, version: &str) -> Option<SchemaVersion> {
        self.versions_by_number
            .get(version)
            .and_then(|id| self.versions.get(id).cloned())
    }

    fn get_by_id(&self, id: &str) -> Option<SchemaVersion> {
        self.versions.get(id).cloned()
    }

    fn list(&self) -> Vec<SchemaVersion> {
        let mut list: Vec<SchemaVersion> = self.versions.values().cloned().collect();
        list.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        list
    }

    fn get_current(&self) -> Option<SchemaVersion> {
        self.current_version_id
            .as_ref()
            .and_then(|id| self.versions.get(id).cloned())
    }

    fn get_current_version_string(&self) -> Option<String> {
        self.get_current().map(|v| v.version)
    }

    fn rollback(
        &mut self,
        target_version: &str,
        rolled_back_by: Option<String>,
        notes: Option<String>,
    ) -> Option<SchemaVersion> {
        let target_id = self.versions_by_number.get(target_version).cloned()?;
        let target = self.versions.get(&target_id).cloned()?;

        let now = now_utc();
        if let Some(current_id) = &self.current_version_id {
            if let Some(current) = self.versions.get(current_id) {
                let record = MigrationRecord {
                    id: generate_id(),
                    from_version: current.version.clone(),
                    to_version: target.version.clone(),
                    operation: "rollback".to_string(),
                    performed_at: now,
                    performed_by: rolled_back_by,
                    notes,
                };
                self.migration_history.push(record);
            }
        }

        self.current_version_id = Some(target_id);
        Some(target)
    }

    fn compare(&self, old_schema: &str, new_schema: &str) -> SchemaCompareResult {
        let old_types = Self::extract_type_names(old_schema);
        let new_types = Self::extract_type_names(new_schema);

        let mut changes: Vec<String> = Vec::new();
        let mut breaking_count = 0usize;
        let mut safe_count = 0usize;

        let removed: Vec<_> = old_types
            .iter()
            .filter(|t| !new_types.contains(t))
            .collect();
        for t in &removed {
            changes.push(format!("Type removed: {}", t));
            breaking_count += 1;
        }

        let added: Vec<_> = new_types
            .iter()
            .filter(|t| !old_types.contains(t))
            .collect();
        for t in &added {
            changes.push(format!("Type added: {}", t));
            safe_count += 1;
        }

        let common: Vec<_> = old_types.iter().filter(|t| new_types.contains(t)).collect();
        for t in &common {
            changes.push(format!("Type unchanged: {}", t));
            safe_count += 1;
        }

        let is_compatible = breaking_count == 0;

        SchemaCompareResult {
            is_compatible,
            breaking_changes_count: breaking_count,
            safe_changes_count: safe_count,
            changes,
        }
    }

    fn extract_type_names(schema: &str) -> Vec<String> {
        let mut types = Vec::new();
        for line in schema.lines() {
            let trimmed = line.trim();
            if trimmed.starts_with("type ") {
                let name = trimmed
                    .trim_start_matches("type ")
                    .split_whitespace()
                    .next()
                    .unwrap_or("")
                    .to_string();
                if !name.is_empty() {
                    types.push(name);
                }
            }
        }
        types
    }

    fn get_evolution(&self) -> SchemaEvolution {
        SchemaEvolution {
            current_version: self.get_current_version_string(),
            versions: self.list(),
            migration_history: self.migration_history.clone(),
        }
    }
}

// ==================== 全局单例 ====================

static SCHEMA_EVOLUTION_MANAGER: OnceLock<Mutex<SchemaEvolutionManager>> = OnceLock::new();

fn schema_evolution_manager() -> &'static Mutex<SchemaEvolutionManager> {
    SCHEMA_EVOLUTION_MANAGER.get_or_init(|| Mutex::new(SchemaEvolutionManager::new()))
}

// ==================== 公共 API 函数 ====================

pub fn publish_schema_version(
    version: String,
    schema_definition: String,
    change_type: Option<String>,
    change_description: Option<String>,
    approved_by: Option<String>,
) -> SchemaVersion {
    schema_evolution_manager().lock().unwrap().publish(
        version,
        schema_definition,
        change_type.unwrap_or_else(|| "minor".to_string()),
        change_description.unwrap_or_default(),
        approved_by,
    )
}

pub fn get_schema_version(version: &str) -> Option<SchemaVersion> {
    schema_evolution_manager().lock().unwrap().get(version)
}

pub fn list_schema_versions() -> Vec<SchemaVersion> {
    schema_evolution_manager().lock().unwrap().list()
}

pub fn rollback_schema(
    target_version: &str,
    rolled_back_by: Option<String>,
    notes: Option<String>,
) -> Option<SchemaVersion> {
    schema_evolution_manager()
        .lock()
        .unwrap()
        .rollback(target_version, rolled_back_by, notes)
}

pub fn get_current_schema() -> Option<SchemaVersion> {
    schema_evolution_manager().lock().unwrap().get_current()
}

pub fn compare_schemas(old_schema: &str, new_schema: &str) -> SchemaCompareResult {
    schema_evolution_manager()
        .lock()
        .unwrap()
        .compare(old_schema, new_schema)
}

pub fn get_schema_evolution() -> SchemaEvolution {
    schema_evolution_manager().lock().unwrap().get_evolution()
}

// ==================== 初始化函数 ====================

pub fn init_schema_evolution() {
    let default_schema = r#"
type Query {
  health: String!
  version: String!
  users: [User!]!
  user(id: ID!): User
}

type Mutation {
  createUser(input: CreateUserInput!): User!
  deleteUser(id: ID!): Boolean!
}

type User {
  id: ID!
  name: String!
  email: String
  createdAt: String!
}

input CreateUserInput {
  name: String!
  email: String
}
"#;

    publish_schema_version(
        "v1.0.0".to_string(),
        default_schema.to_string(),
        Some("initial".to_string()),
        Some("Initial schema version".to_string()),
        Some("system".to_string()),
    );
}

#![allow(dead_code)]

use std::collections::HashSet;

use super::types::*;

// ==================== BreakingChangeDetector ====================

pub struct BreakingChangeDetector;

impl BreakingChangeDetector {
    pub fn detect(old_schema: &str, new_schema: &str) -> Vec<BreakingChange> {
        let mut changes = Vec::new();

        let old_types = Self::parse_types(old_schema);
        let new_types = Self::parse_types(new_schema);

        let old_type_names: HashSet<_> = old_types.keys().cloned().collect();
        let new_type_names: HashSet<_> = new_types.keys().cloned().collect();

        for type_name in &old_type_names {
            if !new_type_names.contains(type_name) {
                changes.push(BreakingChange {
                    change_type: BreakingChangeType::TypeRemoved,
                    path: type_name.clone(),
                    description: format!("Type '{}' has been removed", type_name),
                    affected_queries: Vec::new(),
                    severity: Severity::Critical,
                });
            }
        }

        for (type_name, old_fields) in &old_types {
            if let Some(new_fields) = new_types.get(type_name) {
                for (field_name, old_field_type) in old_fields {
                    if let Some(new_field_type) = new_fields.get(field_name) {
                        if old_field_type != new_field_type {
                            if Self::is_nullability_only_change(old_field_type, new_field_type) {
                                changes.push(BreakingChange {
                                    change_type: BreakingChangeType::NullabilityChanged,
                                    path: format!("{}.{}", type_name, field_name),
                                    description: format!(
                                        "Field '{}.{}' nullability changed from '{}' to '{}'",
                                        type_name, field_name, old_field_type, new_field_type
                                    ),
                                    affected_queries: Vec::new(),
                                    severity: Severity::Medium,
                                });
                            } else {
                                changes.push(BreakingChange {
                                    change_type: BreakingChangeType::FieldTypeChanged,
                                    path: format!("{}.{}", type_name, field_name),
                                    description: format!(
                                        "Field '{}.{}' type changed from '{}' to '{}'",
                                        type_name, field_name, old_field_type, new_field_type
                                    ),
                                    affected_queries: Vec::new(),
                                    severity: Severity::High,
                                });
                            }
                        }
                    } else {
                        changes.push(BreakingChange {
                            change_type: BreakingChangeType::FieldRemoved,
                            path: format!("{}.{}", type_name, field_name),
                            description: format!(
                                "Field '{}.{}' has been removed",
                                type_name, field_name
                            ),
                            affected_queries: Vec::new(),
                            severity: Severity::High,
                        });
                    }
                }
            }
        }

        let old_args = Self::parse_arguments(old_schema);
        let new_args = Self::parse_arguments(new_schema);

        for (op_name, old_args_map) in &old_args {
            if let Some(new_args_map) = new_args.get(op_name) {
                for (arg_name, old_arg_type) in old_args_map {
                    if let Some(new_arg_type) = new_args_map.get(arg_name) {
                        if old_arg_type != new_arg_type {
                            changes.push(BreakingChange {
                                change_type: BreakingChangeType::ArgumentTypeChanged,
                                path: format!("{}.{}", op_name, arg_name),
                                description: format!(
                                    "Argument '{}.{}' type changed from '{}' to '{}'",
                                    op_name, arg_name, old_arg_type, new_arg_type
                                ),
                                affected_queries: Vec::new(),
                                severity: Severity::High,
                            });
                        }
                    } else {
                        changes.push(BreakingChange {
                            change_type: BreakingChangeType::ArgumentRemoved,
                            path: format!("{}.{}", op_name, arg_name),
                            description: format!(
                                "Argument '{}.{}' has been removed",
                                op_name, arg_name
                            ),
                            affected_queries: Vec::new(),
                            severity: Severity::High,
                        });
                    }
                }
            }
        }

        let old_enums = Self::parse_enums(old_schema);
        let new_enums = Self::parse_enums(new_schema);

        for (enum_name, old_values) in &old_enums {
            if let Some(new_values) = new_enums.get(enum_name) {
                for val in old_values {
                    if !new_values.contains(val) {
                        changes.push(BreakingChange {
                            change_type: BreakingChangeType::EnumValueRemoved,
                            path: format!("{}.{}", enum_name, val),
                            description: format!(
                                "Enum value '{}' removed from '{}'",
                                val, enum_name
                            ),
                            affected_queries: Vec::new(),
                            severity: Severity::Medium,
                        });
                    }
                }
            }
        }

        changes
    }

    pub fn generate_report(changes: Vec<BreakingChange>) -> BreakingChangeReport {
        let total_count = changes.len();
        let breaking_count = changes
            .iter()
            .filter(|c| {
                matches!(
                    c.change_type,
                    BreakingChangeType::TypeRemoved
                        | BreakingChangeType::FieldRemoved
                        | BreakingChangeType::ArgumentRemoved
                        | BreakingChangeType::FieldTypeChanged
                        | BreakingChangeType::ArgumentTypeChanged
                )
            })
            .count();
        let safe_count = total_count - breaking_count;

        let summary = if breaking_count == 0 {
            format!(
                "No breaking changes detected. {} safe changes found.",
                safe_count
            )
        } else {
            format!(
                "{} breaking changes and {} safe changes detected.",
                breaking_count, safe_count
            )
        };

        BreakingChangeReport {
            changes,
            total_count,
            breaking_count,
            safe_count,
            summary,
        }
    }

    pub fn validate_compatibility(
        old_schema: &str,
        new_schema: &str,
    ) -> Result<bool, BreakingChangeReport> {
        let changes = Self::detect(old_schema, new_schema);
        let report = Self::generate_report(changes);
        if report.breaking_count > 0 {
            Err(report)
        } else {
            Ok(true)
        }
    }

    fn parse_types(
        schema: &str,
    ) -> std::collections::HashMap<String, std::collections::HashMap<String, String>> {
        let mut types: std::collections::HashMap<
            String,
            std::collections::HashMap<String, String>,
        > = std::collections::HashMap::new();

        for block in Self::extract_blocks(schema, "type") {
            let lines: Vec<&str> = block.lines().collect();
            if let Some(first_line) = lines.first() {
                let type_name = first_line
                    .trim()
                    .trim_start_matches("type ")
                    .split_whitespace()
                    .next()
                    .unwrap_or("")
                    .to_string();

                if type_name.is_empty() || type_name == "Query" || type_name == "Mutation" {
                    continue;
                }

                let mut fields = std::collections::HashMap::new();
                for line in lines.iter().skip(1) {
                    let trimmed = line.trim();
                    if trimmed.is_empty() || trimmed.starts_with('}') {
                        break;
                    }
                    if let Some((field_name, field_type)) = Self::parse_field_line(trimmed) {
                        fields.insert(field_name, field_type);
                    }
                }
                types.insert(type_name, fields);
            }
        }

        types
    }

    fn parse_field_line(line: &str) -> Option<(String, String)> {
        let colon_pos = line.find(':')?;
        let field_part = line[..colon_pos].trim();
        let type_part = line[colon_pos + 1..].trim().to_string();

        let field_name = field_part
            .split('(')
            .next()
            .unwrap_or(field_part)
            .trim()
            .to_string();

        if field_name.is_empty() || field_name.starts_with('#') {
            return None;
        }

        Some((field_name, type_part))
    }

    fn parse_arguments(
        schema: &str,
    ) -> std::collections::HashMap<String, std::collections::HashMap<String, String>> {
        let mut args: std::collections::HashMap<String, std::collections::HashMap<String, String>> =
            std::collections::HashMap::new();

        for block in Self::extract_blocks(schema, "type") {
            let lines: Vec<&str> = block.lines().collect();
            if let Some(first_line) = lines.first() {
                let type_name = first_line
                    .trim()
                    .trim_start_matches("type ")
                    .split_whitespace()
                    .next()
                    .unwrap_or("")
                    .to_string();

                for line in lines.iter().skip(1) {
                    let trimmed = line.trim();
                    if trimmed.is_empty() || trimmed.starts_with('}') {
                        break;
                    }
                    if let Some(paren_start) = trimmed.find('(') {
                        if let Some(paren_end) = trimmed.find(')') {
                            let op_name = trimmed[..paren_start].trim().to_string();
                            let args_str = &trimmed[paren_start + 1..paren_end];
                            let mut arg_map = std::collections::HashMap::new();

                            for arg_def in args_str.split(',') {
                                let arg_def = arg_def.trim();
                                if let Some(colon_pos) = arg_def.find(':') {
                                    let arg_name = arg_def[..colon_pos].trim().to_string();
                                    let arg_type = arg_def[colon_pos + 1..].trim().to_string();
                                    if !arg_name.is_empty() {
                                        arg_map.insert(arg_name, arg_type);
                                    }
                                }
                            }
                            if !op_name.is_empty() {
                                args.insert(format!("{}.{}", type_name, op_name), arg_map);
                            }
                        }
                    }
                }
            }
        }

        args
    }

    fn parse_enums(schema: &str) -> std::collections::HashMap<String, Vec<String>> {
        let mut enums: std::collections::HashMap<String, Vec<String>> =
            std::collections::HashMap::new();

        for block in Self::extract_blocks(schema, "enum") {
            let lines: Vec<&str> = block.lines().collect();
            if let Some(first_line) = lines.first() {
                let enum_name = first_line
                    .trim()
                    .trim_start_matches("enum ")
                    .split_whitespace()
                    .next()
                    .unwrap_or("")
                    .to_string();

                if !enum_name.is_empty() {
                    let mut values = Vec::new();
                    for line in lines.iter().skip(1) {
                        let trimmed = line.trim();
                        if trimmed.is_empty()
                            || trimmed.starts_with('}')
                            || trimmed.starts_with('#')
                        {
                            continue;
                        }
                        let value = trimmed.split_whitespace().next().unwrap_or("").to_string();
                        if !value.is_empty() {
                            values.push(value);
                        }
                    }
                    enums.insert(enum_name, values);
                }
            }
        }

        enums
    }

    fn extract_blocks(schema: &str, kind: &str) -> Vec<String> {
        let mut blocks = Vec::new();
        let lines: Vec<&str> = schema.lines().collect();
        let mut current_block = String::new();
        let mut in_block = false;

        for line in &lines {
            let trimmed = line.trim();
            if trimmed.starts_with(&format!("{} ", kind)) || trimmed.starts_with(kind) {
                if !current_block.is_empty() {
                    blocks.push(current_block.clone());
                }
                current_block = line.to_string();
                in_block = true;
            } else if in_block {
                current_block.push('\n');
                current_block.push_str(line);
                if trimmed.starts_with('}') {
                    in_block = false;
                    blocks.push(current_block.clone());
                    current_block = String::new();
                }
            }
        }

        if !current_block.is_empty() {
            blocks.push(current_block);
        }

        blocks
    }

    fn is_nullability_only_change(old_type: &str, new_type: &str) -> bool {
        let old_base = old_type.trim_end_matches('!');
        let new_base = new_type.trim_end_matches('!');
        old_base == new_base && old_type != new_type
    }
}

// ==================== 公共 API 函数 ====================

pub fn detect_breaking_changes(old_schema: &str, new_schema: &str) -> Vec<BreakingChange> {
    BreakingChangeDetector::detect(old_schema, new_schema)
}

pub fn get_breaking_change_report(old_schema: &str, new_schema: &str) -> BreakingChangeReport {
    let changes = BreakingChangeDetector::detect(old_schema, new_schema);
    BreakingChangeDetector::generate_report(changes)
}

pub fn validate_schema_compatibility(
    old_schema: &str,
    new_schema: &str,
) -> Result<bool, BreakingChangeReport> {
    BreakingChangeDetector::validate_compatibility(old_schema, new_schema)
}

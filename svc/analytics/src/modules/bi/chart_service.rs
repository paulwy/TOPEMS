use chrono::{DateTime, Utc};
use rand::Rng;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub enum ChartType {
    #[default]
    Line,
    Bar,
    Pie,
    Scatter,
    Area,
    Histogram,
    Gauge,
    Table,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChartDataPoint {
    pub x: String,
    pub y: Vec<f64>,
    pub label: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChartDataset {
    pub name: String,
    pub data: Vec<ChartDataPoint>,
    pub color: Option<String>,
    pub type_: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChartResult {
    pub chart_type: ChartType,
    pub title: Option<String>,
    pub datasets: Vec<ChartDataset>,
    pub x_axis_label: Option<String>,
    pub y_axis_label: Option<String>,
    pub legend: Vec<String>,
    pub summary: ChartSummary,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChartSummary {
    pub total_count: usize,
    pub min_value: f64,
    pub max_value: f64,
    pub avg_value: f64,
    pub sum_value: f64,
    pub generated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChartQuery {
    pub chart_type: ChartType,
    pub data_source: String,
    /// S1.2: 原始用户 SQL 字符串已废弃，未来接入真实数据库查询时严禁直接执行此字符串。
    /// 请使用结构化字段 `columns` + `execute_query` 内部的 validate_dataset + 参数化查询路径。
    #[deprecated(
        note = "Raw SQL string is deprecated; use the `columns` structured field instead. \
                The raw `query` string will be ignored and never executed directly."
    )]
    pub query: String,
    pub params: HashMap<String, String>,
    pub title: Option<String>,
    pub x_axis_label: Option<String>,
    pub y_axis_label: Option<String>,
    /// S1.2: 结构化列信息（[x_column, y_column_1, y_column_2, ...]），
    /// 配合 validate_dataset 做白名单校验后走参数化查询路径。
    #[serde(default)]
    pub columns: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeRange {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[allow(dead_code)]
pub struct ChartService {
    pool: PgPool,
}

/// Validates a SQL identifier (table or column name) to prevent SQL injection.
///
/// 严格白名单策略：仅允许 ASCII 字母 / 数字 / 下划线；首字符必须为字母或下划线。
/// 额外阻止若干危险子串（即使字符集通过，也做二次拦截）。
pub fn validate_identifier(name: &str) -> Result<String, String> {
    if name.is_empty() {
        return Err("Identifier cannot be empty".to_string());
    }

    // 长度上限：PostgreSQL 标识符不超过 63 字节（NAMEDATALEN-1）。
    // 超过时一律拒绝，防止异常膨胀或基于长度的边界攻击。
    if name.len() > 63 {
        return Err(format!(
            "Invalid identifier '{}': exceeds max length of 63 bytes",
            name
        ));
    }

    // 字节层面禁止空字节与控制字符（ASCII 0-31、127 DEL）。
    // 这些字符在 SQL 中语义模糊，且常见于注入 / 截断型 payload。
    for (i, b) in name.bytes().enumerate() {
        if b == 0 {
            return Err(format!(
                "Invalid identifier '{}': contains NUL byte at position {}",
                name, i
            ));
        }
        if b < 32 || b == 127 {
            return Err(format!(
                "Invalid identifier '{}': contains control char 0x{:02x} at position {}",
                name, b, i
            ));
        }
        // 只允许 ASCII 字母 / 数字 / 下划线，拒绝所有多字节与高位字符。
        if !(b.is_ascii_alphanumeric() || b == b'_') {
            return Err(format!(
                "Invalid identifier '{}': only ASCII letters, digits, and '_' are allowed; \
                 got byte 0x{:02x} at position {}",
                name, b, i
            ));
        }
    }

    let lower = name.to_lowercase();
    // 注：字节级白名单已拒绝空格 / 引号 / 注释符等注入载体，
    // 因此此处 FORBIDDEN 仅做二次兜底，针对：
    // - 多语句 / 注释 片段（`;`, `--`, `/*`, `*/`）
    // - 危险前缀 / 函数（`xp_`, `sp_`, `pg_`, `information_schema`, `pg_read_file` …）
    // - DDL / DCL / 备份类命令（`create/alter/drop/grant/revoke/vacuum/...`）
    //   —— 这里用「带空格」子串匹配，避免误伤合法列名（如 `select_flag`）
    const FORBIDDEN: &[&str] = &[
        ";",
        "--",
        "/*",
        "*/",
        "\x00", // NUL — 兜底，字节层面已先拦截
        "xp_",
        "sp_",
        "pg_",
        "pg_catalog",
        "information_schema",
        "pg_read_file",
        "pg_write_file",
        "truncate ",
        "grant ",
        "revoke ",
        "vacuum ",
        "reindex ",
        "lock ",
        "shutdown ",
        "attach ",
        "detach ",
        "explain ",
        "analyze ",
        "create ",
        "alter ",
        "drop ",
        "rename ",
        "comment ",
        "copy ",
        "select ",
        "update ",
        "insert ",
        "delete ",
        "merge ",
        "union ",
        "intersect ",
        "except ",
    ];
    for fragment in FORBIDDEN {
        if lower.contains(fragment) {
            return Err(format!(
                "Invalid identifier '{}': contains forbidden substring '{}'",
                name, fragment
            ));
        }
    }

    let mut chars = name.chars();
    let first = match chars.next() {
        Some(c) => c,
        None => {
            return Err(format!(
                "Invalid identifier '{}': identifier cannot be empty",
                name
            ))
        }
    };
    if !(first.is_ascii_alphabetic() || first == '_') {
        return Err(format!(
            "Invalid identifier '{}': must start with a letter or underscore",
            name
        ));
    }
    if !chars.all(|c| c.is_ascii_alphanumeric() || c == '_') {
        return Err(format!(
            "Invalid identifier '{}': may only contain letters, digits, and underscores",
            name
        ));
    }
    Ok(name.to_string())
}

/// Wraps a validated SQL identifier in double quotes for PostgreSQL.
pub fn quote_identifier(name: &str) -> Result<String, String> {
    let validated = validate_identifier(name)?;
    let escaped = validated.replace('"', "\"\"");
    Ok(format!("\"{}\"", escaped))
}

/// Validates a dataset (table name + columns) and returns quoted versions safe for SQL.
pub fn validate_dataset(
    data_source: &str,
    columns: &[String],
) -> Result<(String, Vec<String>), String> {
    let table = quote_identifier(data_source)?;
    let mut quoted_cols = Vec::with_capacity(columns.len());
    for col in columns {
        quoted_cols.push(quote_identifier(col)?);
    }
    Ok((table, quoted_cols))
}

impl ChartService {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn generate_chart(&self, query: ChartQuery) -> Result<ChartResult, String> {
        let data = self.execute_query(&query).await?;
        self.build_chart(query, data).await
    }

    pub async fn generate_line_chart(
        &self,
        data_source: &str,
        x_column: &str,
        y_columns: &[String],
        title: Option<String>,
    ) -> Result<ChartResult, String> {
        let mut all_columns = vec![x_column.to_string()];
        all_columns.extend(y_columns.iter().cloned());
        let (table, cols) = validate_dataset(data_source, &all_columns)?;
        // S1.2: 不再拼接 SQL 字符串到 ChartQuery.query；改用结构化 columns 传递列信息。
        // table/cols 已由 validate_dataset 做过白名单校验，可安全用于后续参数化路径。
        #[allow(deprecated)]
        let query = ChartQuery {
            chart_type: ChartType::Line,
            data_source: data_source.to_string(),
            query: String::new(),
            params: HashMap::new(),
            title,
            x_axis_label: Some(x_column.to_string()),
            y_axis_label: Some(y_columns.join(", ")),
            columns: all_columns,
        };
        let _ = (table, cols); // 已验证通过，供未来真实查询参数化使用
        self.generate_chart(query).await
    }

    pub async fn generate_bar_chart(
        &self,
        data_source: &str,
        x_column: &str,
        y_columns: &[String],
        title: Option<String>,
    ) -> Result<ChartResult, String> {
        let mut all_columns = vec![x_column.to_string()];
        all_columns.extend(y_columns.iter().cloned());
        let (table, cols) = validate_dataset(data_source, &all_columns)?;
        // S1.2: 不再拼接 SQL 字符串到 ChartQuery.query；改用结构化 columns 传递列信息。
        #[allow(deprecated)]
        let query = ChartQuery {
            chart_type: ChartType::Bar,
            data_source: data_source.to_string(),
            query: String::new(),
            params: HashMap::new(),
            title,
            x_axis_label: Some(x_column.to_string()),
            y_axis_label: Some(y_columns.join(", ")),
            columns: all_columns,
        };
        let _ = (table, cols);
        self.generate_chart(query).await
    }

    pub async fn generate_pie_chart(
        &self,
        data_source: &str,
        label_column: &str,
        _value_column: &str,
        title: Option<String>,
    ) -> Result<ChartResult, String> {
        let columns = vec![label_column.to_string()];
        let (table, cols) = validate_dataset(data_source, &columns)?;
        // S1.2: 不再拼接 SQL 字符串到 ChartQuery.query；改用结构化 columns 传递列信息。
        #[allow(deprecated)]
        let query = ChartQuery {
            chart_type: ChartType::Pie,
            data_source: data_source.to_string(),
            query: String::new(),
            params: HashMap::new(),
            title,
            x_axis_label: None,
            y_axis_label: None,
            columns,
        };
        let _ = (table, cols);
        self.generate_chart(query).await
    }

    pub async fn generate_gauge_chart(
        &self,
        value: f64,
        min: f64,
        max: f64,
        title: Option<String>,
    ) -> Result<ChartResult, String> {
        let data_points = vec![ChartDataPoint {
            x: "value".to_string(),
            y: vec![value],
            label: None,
        }];

        let dataset = ChartDataset {
            name: "Value".to_string(),
            data: data_points,
            color: None,
            type_: None,
        };

        let summary = ChartSummary {
            total_count: 1,
            min_value: min,
            max_value: max,
            avg_value: value,
            sum_value: value,
            generated_at: Utc::now(),
        };

        Ok(ChartResult {
            chart_type: ChartType::Gauge,
            title,
            datasets: vec![dataset],
            x_axis_label: None,
            y_axis_label: None,
            legend: vec![],
            summary,
        })
    }

    async fn execute_query(
        &self,
        query: &ChartQuery,
    ) -> Result<Vec<HashMap<String, serde_json::Value>>, String> {
        let mut results: Vec<HashMap<String, serde_json::Value>> = Vec::new();

        let sample_data = self.generate_sample_data(query).await;

        for row in sample_data {
            results.push(row);
        }

        Ok(results)
    }

    async fn generate_sample_data(
        &self,
        query: &ChartQuery,
    ) -> Vec<HashMap<String, serde_json::Value>> {
        let mut data = Vec::new();

        match query.chart_type {
            ChartType::Line | ChartType::Bar | ChartType::Area => {
                let months = vec!["1月", "2月", "3月", "4月", "5月", "6月"];
                let mut rng = rand::thread_rng();
                for month in months {
                    let mut row = HashMap::new();
                    row.insert(
                        "month".to_string(),
                        serde_json::Value::String(month.to_string()),
                    );
                    row.insert(
                        "value1".to_string(),
                        serde_json::Value::Number(
                            serde_json::Number::from_f64((rng.gen::<f64>() * 100.0) + 50.0)
                                .unwrap_or_else(|| serde_json::Number::from(50)),
                        ),
                    );
                    row.insert(
                        "value2".to_string(),
                        serde_json::Value::Number(
                            serde_json::Number::from_f64((rng.gen::<f64>() * 80.0) + 30.0)
                                .unwrap_or_else(|| serde_json::Number::from(30)),
                        ),
                    );
                    data.push(row);
                }
            }
            ChartType::Pie => {
                let categories = vec!["A类", "B类", "C类", "D类"];
                let mut rng = rand::thread_rng();
                for category in categories {
                    let mut row = HashMap::new();
                    row.insert(
                        "category".to_string(),
                        serde_json::Value::String(category.to_string()),
                    );
                    row.insert(
                        "value".to_string(),
                        serde_json::Value::Number(
                            serde_json::Number::from_f64(rng.gen::<f64>() * 100.0)
                                .unwrap_or_else(|| serde_json::Number::from(0)),
                        ),
                    );
                    data.push(row);
                }
            }
            ChartType::Scatter => {
                let mut rng = rand::thread_rng();
                for _ in 0..20 {
                    let mut row = HashMap::new();
                    row.insert(
                        "x".to_string(),
                        serde_json::Value::Number(
                            serde_json::Number::from_f64(rng.gen::<f64>() * 100.0)
                                .unwrap_or_else(|| serde_json::Number::from(0)),
                        ),
                    );
                    row.insert(
                        "y".to_string(),
                        serde_json::Value::Number(
                            serde_json::Number::from_f64(rng.gen::<f64>() * 100.0)
                                .unwrap_or_else(|| serde_json::Number::from(0)),
                        ),
                    );
                    data.push(row);
                }
            }
            ChartType::Histogram => {
                let mut rng = rand::thread_rng();
                for i in 0..10 {
                    let mut row = HashMap::new();
                    row.insert(
                        "bin".to_string(),
                        serde_json::Value::String(format!("{}-{}", i * 10, (i + 1) * 10)),
                    );
                    row.insert(
                        "count".to_string(),
                        serde_json::Value::Number(
                            serde_json::Number::from_f64((rng.gen::<f64>() * 50.0) + 10.0)
                                .unwrap_or_else(|| serde_json::Number::from(10)),
                        ),
                    );
                    data.push(row);
                }
            }
            ChartType::Table => {
                let mut rng = rand::thread_rng();
                for i in 0..5 {
                    let mut row = HashMap::new();
                    row.insert(
                        "id".to_string(),
                        serde_json::Value::Number(serde_json::Number::from(i + 1)),
                    );
                    row.insert(
                        "name".to_string(),
                        serde_json::Value::String(format!("项目 {}", i + 1)),
                    );
                    row.insert(
                        "value".to_string(),
                        serde_json::Value::Number(
                            serde_json::Number::from_f64((rng.gen::<f64>() * 1000.0) + 100.0)
                                .unwrap_or_else(|| serde_json::Number::from(100)),
                        ),
                    );
                    data.push(row);
                }
            }
            ChartType::Gauge => {}
        }

        data
    }

    async fn build_chart(
        &self,
        query: ChartQuery,
        data: Vec<HashMap<String, serde_json::Value>>,
    ) -> Result<ChartResult, String> {
        let mut datasets = Vec::new();
        let mut legend = Vec::new();

        if data.is_empty() {
            return Ok(ChartResult {
                chart_type: query.chart_type,
                title: query.title,
                datasets: vec![],
                x_axis_label: query.x_axis_label,
                y_axis_label: query.y_axis_label,
                legend: vec![],
                summary: ChartSummary {
                    total_count: 0,
                    min_value: 0.0,
                    max_value: 0.0,
                    avg_value: 0.0,
                    sum_value: 0.0,
                    generated_at: Utc::now(),
                },
            });
        }

        let first_row = &data[0];
        let numeric_keys: Vec<String> = first_row
            .iter()
            .filter(|(_, v)| v.is_number())
            .map(|(k, _)| k.clone())
            .collect();

        let category_keys: Vec<String> = first_row
            .iter()
            .filter(|(_, v)| v.is_string())
            .map(|(k, _)| k.clone())
            .collect();

        let x_key = category_keys
            .first()
            .cloned()
            .unwrap_or_else(|| "x".to_string());
        let mut all_values: Vec<f64> = Vec::new();

        for numeric_key in &numeric_keys {
            let mut data_points = Vec::new();

            for row in &data {
                let x_value = row
                    .get(&x_key)
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();

                let y_value = row.get(numeric_key).and_then(|v| v.as_f64()).unwrap_or(0.0);

                all_values.push(y_value);

                data_points.push(ChartDataPoint {
                    x: x_value,
                    y: vec![y_value],
                    label: None,
                });
            }

            legend.push(numeric_key.clone());

            datasets.push(ChartDataset {
                name: numeric_key.clone(),
                data: data_points,
                color: None,
                type_: None,
            });
        }

        let total_count = all_values.len();
        let min_value = all_values.iter().cloned().fold(f64::INFINITY, f64::min);
        let max_value = all_values.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
        let sum_value = all_values.iter().sum::<f64>();
        let avg_value = if total_count > 0 {
            sum_value / total_count as f64
        } else {
            0.0
        };

        Ok(ChartResult {
            chart_type: query.chart_type,
            title: query.title,
            datasets,
            x_axis_label: query.x_axis_label,
            y_axis_label: query.y_axis_label,
            legend,
            summary: ChartSummary {
                total_count,
                min_value,
                max_value,
                avg_value,
                sum_value,
                generated_at: Utc::now(),
            },
        })
    }

    pub async fn get_available_chart_types(&self) -> Vec<String> {
        vec![
            "line".to_string(),
            "bar".to_string(),
            "pie".to_string(),
            "scatter".to_string(),
            "area".to_string(),
            "histogram".to_string(),
            "gauge".to_string(),
            "table".to_string(),
        ]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_identifier_accepts_valid() {
        assert!(validate_identifier("my_table").is_ok());
        assert!(validate_identifier("_col_1").is_ok());
        assert!(validate_identifier("ColumnA").is_ok());
        assert!(validate_identifier("data_source").is_ok());
    }

    #[test]
    fn test_validate_identifier_rejects_empty() {
        assert!(validate_identifier("").is_err());
    }

    #[test]
    fn test_validate_identifier_rejects_drop_table_injection() {
        // Payload: '; DROP TABLE users; --
        assert!(validate_identifier("users'; DROP TABLE users; --").is_err());
    }

    #[test]
    fn test_validate_identifier_rejects_union_select() {
        // Payload: col UNION SELECT password FROM users
        assert!(validate_identifier("col UNION SELECT password").is_err());
    }

    #[test]
    fn test_validate_identifier_rejects_pg_read_file() {
        assert!(validate_identifier("pg_read_file").is_err());
    }

    #[test]
    fn test_validate_identifier_rejects_information_schema() {
        assert!(validate_identifier("information_schema.tables").is_err());
        assert!(validate_identifier("information_schema").is_err());
    }

    #[test]
    fn test_quote_identifier_wraps_in_double_quotes() {
        assert_eq!(quote_identifier("my_col").unwrap(), "\"my_col\"");
        assert_eq!(quote_identifier("orders").unwrap(), "\"orders\"");
    }

    #[test]
    fn test_validate_identifier_rejects_control_chars_and_nul() {
        // NUL 字节 — 严重注入向量
        assert!(validate_identifier("col\u{0}name").is_err());
        // 控制字符 / DEL
        assert!(validate_identifier("col\x01name").is_err());
        assert!(validate_identifier("col\x7fname").is_err());
        // 空格（非字母数字）
        assert!(validate_identifier("col name").is_err());
        // 高位多字节字符（非 ASCII）
        assert!(validate_identifier("cöl").is_err());
    }

    #[test]
    fn test_validate_identifier_forbids_injection_fragments() {
        // 带空格的关键字子串 — 模拟常见 SQL 注入 payload 在字符白名单被放行后的二次拦截
        assert!(validate_identifier("users; DROP TABLE users; --").is_err());
        assert!(validate_identifier("col UNION SELECT password").is_err());
        assert!(validate_identifier("data select 1 from x").is_err());

        // 危险前缀 / 系统 schema
        assert!(validate_identifier("pg_read_file").is_err());
        assert!(validate_identifier("information_schema.tables").is_err());
        assert!(validate_identifier("xp_cmdshell").is_err());

        // 合法列名依然通过
        assert!(validate_identifier("user_select_flag").is_ok());
        assert!(validate_identifier("update_status").is_ok());
        assert!(validate_identifier("user_union_query").is_ok());
        assert!(validate_identifier("drop_table_col").is_ok());
    }

    #[test]
    fn test_validate_identifier_enforces_length_limit() {
        let long = "a".repeat(64);
        assert!(validate_identifier(&long).is_err());
        let exactly_ok = "a".repeat(63);
        assert!(validate_identifier(&exactly_ok).is_ok());
    }

    #[test]
    fn test_validate_dataset_returns_quoted_identifiers() {
        let (table, cols) =
            validate_dataset("orders", &["amount".to_string(), "quantity".to_string()]).unwrap();
        assert_eq!(table, "\"orders\"");
        assert_eq!(
            cols,
            vec!["\"amount\"".to_string(), "\"quantity\"".to_string()]
        );
    }

    #[test]
    fn test_validate_dataset_rejects_malicious_table() {
        assert!(validate_dataset("users; DROP TABLE users; --", &[]).is_err());
    }
}

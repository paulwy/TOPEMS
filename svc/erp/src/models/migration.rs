use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct DbChange {
    pub id: Uuid,
    pub change_type: String,
    pub table_name: String,
    pub column_name: Option<String>,
    pub old_definition: Option<serde_json::Value>,
    pub new_definition: Option<serde_json::Value>,
    pub sql_statement: String,
    pub executed_by: Option<String>,
    pub executed_at: DateTime<Utc>,
    pub backup_data: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct DbColumnDefinition {
    pub column_name: String,
    pub data_type: String,
    pub is_nullable: bool,
    pub default_value: Option<String>,
    pub max_length: Option<i32>,
    pub numeric_precision: Option<i32>,
    pub numeric_scale: Option<i32>,
    pub comment: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct AddColumnRequest {
    pub table_name: String,
    pub column: DbColumnDefinition,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ModifyColumnRequest {
    pub table_name: String,
    pub column_name: String,
    pub column: DbColumnDefinition,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct DropColumnRequest {
    pub table_name: String,
    pub column_name: String,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct TableInfo {
    pub table_name: String,
    pub table_type: String,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct ColumnInfo {
    pub column_name: String,
    pub data_type: String,
    pub is_nullable: String,
    pub column_default: Option<String>,
    pub character_maximum_length: Option<i32>,
    pub numeric_precision: Option<i32>,
    pub numeric_scale: Option<i32>,
    pub ordinal_position: i32,
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;
    use serde::Serialize;
    use serde_json::Value;
    use uuid::Uuid;

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test]
    fn struct_db_change() {
        roundtrip(&DbChange {
            id: Uuid::new_v4(),
            change_type: "ADD_COLUMN".into(),
            table_name: "orders".into(),
            column_name: Some("remark".into()),
            old_definition: None,
            new_definition: Some(serde_json::json!({"type":"text","nullable":true})),
            sql_statement: "ALTER TABLE orders ADD COLUMN remark TEXT".into(),
            executed_by: Some("dba".into()),
            executed_at: Utc::now(),
            backup_data: Some(serde_json::json!({"backup":true})),
        });
    }

    #[test]
    fn struct_db_column_definition() {
        roundtrip(&DbColumnDefinition {
            column_name: "amount".into(),
            data_type: "NUMERIC".into(),
            is_nullable: false,
            default_value: Some("0".into()),
            max_length: None,
            numeric_precision: Some(18),
            numeric_scale: Some(2),
            comment: Some("订单金额".into()),
        });
    }

    #[test]
    fn struct_add_column_request() {
        roundtrip(&AddColumnRequest {
            table_name: "products".into(),
            column: DbColumnDefinition {
                column_name: "weight".into(),
                data_type: "FLOAT".into(),
                is_nullable: true,
                default_value: None,
                max_length: None,
                numeric_precision: None,
                numeric_scale: None,
                comment: None,
            },
        });
    }

    #[test]
    fn struct_modify_column_request() {
        roundtrip(&ModifyColumnRequest {
            table_name: "products".into(),
            column_name: "name".into(),
            column: DbColumnDefinition {
                column_name: "name".into(),
                data_type: "VARCHAR".into(),
                is_nullable: false,
                default_value: None,
                max_length: Some(512),
                numeric_precision: None,
                numeric_scale: None,
                comment: Some("产品名称扩展".into()),
            },
        });
    }

    #[test]
    fn struct_drop_column_request() {
        roundtrip(&DropColumnRequest {
            table_name: "temp_data".into(),
            column_name: "legacy_field".into(),
        });
    }

    #[test]
    fn struct_table_info() {
        roundtrip(&TableInfo {
            table_name: "customers".into(),
            table_type: "BASE TABLE".into(),
        });
    }

    #[test]
    fn struct_column_info() {
        roundtrip(&ColumnInfo {
            column_name: "email".into(),
            data_type: "character varying".into(),
            is_nullable: "YES".into(),
            column_default: None,
            character_maximum_length: Some(255),
            numeric_precision: None,
            numeric_scale: None,
            ordinal_position: 5,
        });
    }
}

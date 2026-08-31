//! TOPEMS 编译时 Schema 边界检查宏 —— `only_own_schema_query!`
//!
//! # 背景
//! 模块化单体架构要求每个服务只能查询自己的 schema（+ 显式声明的共享只读 schema），
//! 防止跨 schema 裸引用破坏服务边界（如 crm 服务直查 plugin_erp 的表）。
//! 本宏在**编译期**解析 SQL 字符串中的 `schema.table` 引用，校验其都属于当前服务
//! 的白名单；一旦引用未授权 schema，直接 `compile_error!` 使构建失败。
//!
//! # 用法
//! ```ignore
//! use topems_shared_boundary::only_own_schema_query;
//!
//! // 基础：SQL 只引用本服务 schema + 公共 schema（public/unified_core 默认允许）
//! let sql = only_own_schema_query!("crm", "SELECT * FROM crm.customers WHERE id = $1");
//!
//! // 带额外白名单：显式声明允许引用的共享只读 schema
//! let sql = only_own_schema_query!(
//!     "erp",
//!     "SELECT * FROM plugin_finance.accounting_subjects WHERE id = $1",
//!     "plugin_finance"
//! );
//! ```
//!
//! # 参数
//! - 参数 1（必填）：本服务 schema 名（字符串字面量）
//! - 参数 2（必填）：SQL（字符串字面量）
//! - 参数 3+（可选）：额外允许引用的共享 schema（字符串字面量，逗号分隔）
//!
//! # 宏展开
//! 校验通过后，宏展开为原始 SQL 字符串字面量，可直接传给 `sqlx::query` 等。

use proc_macro::TokenStream;
use quote::quote;
use syn::{
    parse::{Parse, ParseStream},
    parse_macro_input, LitStr, Token,
};

/// SQL 关键字白名单（出现在 `ident.ident` 位置时不视为 schema 引用）
const SQL_KEYWORDS: &[&str] = &[
    "select",
    "from",
    "where",
    "and",
    "or",
    "not",
    "insert",
    "into",
    "values",
    "update",
    "set",
    "delete",
    "join",
    "left",
    "right",
    "inner",
    "outer",
    "full",
    "cross",
    "on",
    "using",
    "group",
    "by",
    "order",
    "limit",
    "offset",
    "having",
    "case",
    "when",
    "then",
    "else",
    "end",
    "as",
    "distinct",
    "returning",
    "with",
    "exists",
    "between",
    "like",
    "ilike",
    "in",
    "is",
    "null",
    "true",
    "false",
    "current",
    "epoch",
    "date",
    "time",
    "timestamp",
    "interval",
    "cast",
    "coalesce",
    "nullif",
    "now",
    "count",
    "sum",
    "avg",
    "min",
    "max",
    "extract",
    "to_char",
    "to_date",
    "to_timestamp",
    "array",
    "jsonb",
    "json",
    "text",
    "uuid",
    "varchar",
    "integer",
    "bigint",
    "numeric",
    "boolean",
    "serial",
    "desc",
    "asc",
    "union",
    "all",
    "any",
    "some",
    "unique",
    "primary",
    "key",
    "references",
    "check",
    "default",
    "generated",
    "always",
    "identity",
    "conflict",
    "do",
    "nothing",
    "fetch",
    "first",
    "rows",
    "window",
    "partition",
    "over",
    "rank",
    "dense_rank",
    "row_number",
    "lag",
    "lead",
    "percentile",
    "filter",
    "within",
    "cube",
    "rollup",
    "materialized",
    "view",
    "temp",
    "temporary",
    "if",
    "exists",
    "cascade",
    "restrict",
    "add",
    "column",
    "alter",
    "table",
    "drop",
    "truncate",
    "grant",
    "revoke",
    "begin",
    "commit",
    "rollback",
    "transaction",
    "only",
    "plus",
    "minus",
    "except",
    "intersect",
    "nulls",
    "last",
    "collate",
    "returning",
    "at",
    "local",
    "zone",
    "systimestamp",
    "current_date",
    "current_timestamp",
    "localtimestamp",
    "current_time",
    "user",
    "role",
];

/// 默认允许的公共共享 schema（无需显式声明）
const DEFAULT_SHARED_SCHEMAS: &[&str] = &["public", "unified_core", "information_schema"];

/// 宏输入：`("own_schema", "sql", ["extra_schema", ...])`
struct MacroInput {
    own_schema: LitStr,
    sql: LitStr,
    extra_schemas: Vec<LitStr>,
}

impl Parse for MacroInput {
    fn parse(input: ParseStream) -> syn::Result<Self> {
        let own_schema: LitStr = input.parse()?;
        input.parse::<Token![,]>()?;
        let sql: LitStr = input.parse()?;
        let mut extra_schemas = Vec::new();
        while input.peek(Token![,]) {
            input.parse::<Token![,]>()?;
            extra_schemas.push(input.parse()?);
        }
        Ok(MacroInput {
            own_schema,
            sql,
            extra_schemas,
        })
    }
}

/// 表引用关键字：其后紧跟的 `schema.table` 才是需要校验的 schema 引用
const TABLE_KEYWORDS: &[&str] = &["from", "join", "update", "into", "table"];

/// 将 SQL 切分为 token（标识符 / 点 / 其他符号），空白忽略。
fn tokenize(sql: &str) -> Vec<String> {
    let mut tokens = Vec::new();
    let mut cur = String::new();
    for ch in sql.chars() {
        if ch.is_ascii_alphanumeric() || ch == '_' {
            cur.push(ch);
        } else {
            if !cur.is_empty() {
                tokens.push(std::mem::take(&mut cur));
            }
            if !matches!(ch, ' ' | '\t' | '\n' | '\r') {
                tokens.push(ch.to_string());
            }
        }
    }
    if !cur.is_empty() {
        tokens.push(cur);
    }
    tokens
}

/// 提取 SQL 中**表引用位置**（FROM/JOIN/UPDATE/INTO/TABLE 后）的 `schema.table` 引用。
///
/// 只校验边界真正关心的：读/写哪些表。WHERE / JOIN ON 中的 `alias.column`、
/// 函数调用、参数占位符均不在表引用位置，不会被误判为 schema。
fn extract_schema_refs(sql: &str) -> Vec<(String, String)> {
    let tokens = tokenize(sql);
    let mut refs = Vec::new();
    let n = tokens.len();
    let mut i = 0;
    while i < n {
        // 命中表引用关键字
        if TABLE_KEYWORDS.contains(&tokens[i].to_lowercase().as_str()) {
            let mut j = i + 1;
            // 跳过可选的 `only` / `table`
            while j < n && matches!(tokens[j].to_lowercase().as_str(), "only" | "table") {
                j += 1;
            }
            // 子查询/括号列表：跳过复杂形态（FROM (SELECT ...) / INSERT INTO t (cols)）
            if j < n && tokens[j] == "(" {
                i = j + 1;
                continue;
            }
            // 期望 `ident.ident`（schema.table）
            if j + 2 < n && is_ident(&tokens[j]) && tokens[j + 1] == "." && is_ident(&tokens[j + 2])
            {
                refs.push((tokens[j].to_lowercase(), tokens[j + 2].clone()));
                i = j + 3;
                continue;
            }
        }
        i += 1;
    }
    refs
}

fn is_ident(s: &str) -> bool {
    let b = s.as_bytes();
    !b.is_empty() && (b[0].is_ascii_alphabetic() || b[0] == b'_')
}

/// 编译时 Schema 边界检查宏（见 crate 文档）。
#[proc_macro]
pub fn only_own_schema_query(input: TokenStream) -> TokenStream {
    let parsed = parse_macro_input!(input as MacroInput);
    let own_schema = parsed.own_schema.value().to_lowercase();
    let sql = parsed.sql.value();
    let extra: Vec<String> = parsed
        .extra_schemas
        .iter()
        .map(|l| l.value().to_lowercase())
        .collect();

    // 白名单 = 本服务 schema + 默认公共 schema + 显式额外 schema
    let mut allowed: Vec<String> = vec![own_schema.clone()];
    allowed.extend(DEFAULT_SHARED_SCHEMAS.iter().map(|s| s.to_string()));
    allowed.extend(extra);

    // 提取并校验
    let refs = extract_schema_refs(&sql);
    let mut violations: Vec<&str> = Vec::new();
    for (schema, _table) in &refs {
        if SQL_KEYWORDS.contains(&schema.as_str()) {
            continue;
        }
        if !allowed.iter().any(|a| a == schema) && !violations.contains(&schema.as_str()) {
            violations.push(schema.as_str());
        }
    }

    if !violations.is_empty() {
        let msg = format!(
            "only_own_schema_query! 编译时边界检查失败：SQL 引用了未授权 schema {:?}\n\
             本服务 schema: '{}'，允许: {:?}\n\
             SQL: {}",
            violations, own_schema, allowed, sql
        );
        return syn::Error::new_spanned(&parsed.sql, msg)
            .to_compile_error()
            .into();
    }

    // 校验通过：展开为原始 SQL 字符串字面量
    let sql_lit = parsed.sql;
    quote! { #sql_lit }.into()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extract_simple_schema_table() {
        let refs = extract_schema_refs("SELECT * FROM crm.customers WHERE id = $1");
        assert_eq!(refs, vec![("crm".to_string(), "customers".to_string())]);
    }

    #[test]
    fn extract_multiple_refs_and_joins() {
        let refs = extract_schema_refs(
            "SELECT a.id FROM crm.customers a JOIN crm.contacts c ON c.customer_id = a.id",
        );
        assert!(refs.contains(&("crm".to_string(), "customers".to_string())));
        assert!(refs.contains(&("crm".to_string(), "contacts".to_string())));
        // ON 后的 a.id / c.customer_id 是别名.列，不是 schema.table
        assert_eq!(refs.len(), 2);
    }

    #[test]
    fn ignore_sql_keywords_in_dotted_position() {
        // `extract(epoch from x)` 中 epoch 是关键字，不应视为 schema
        let refs = extract_schema_refs(
            "SELECT extract(epoch from crm.customers.created_at) FROM crm.customers",
        );
        // 只有 crm.customers 两次（FROM 和函数内）
        assert_eq!(refs.len(), 2);
        for (s, _t) in &refs {
            assert_eq!(s, "crm");
        }
    }

    #[test]
    fn ignore_function_calls_and_literals() {
        // now() / count(*) 等无 dotted schema；参数 $1 忽略
        let refs = extract_schema_refs(
            "SELECT count(*) FROM crm.customers WHERE created_at > now() - interval '1 day' AND id = $1",
        );
        assert_eq!(refs, vec![("crm".to_string(), "customers".to_string())]);
    }

    #[test]
    fn detect_cross_schema_ref() {
        // 跨 schema 引用应被识别出来（供校验阶段报错）
        let refs = extract_schema_refs("SELECT * FROM plugin_erp.customers");
        assert!(refs.contains(&("plugin_erp".to_string(), "customers".to_string())));
    }

    #[test]
    fn whitelist_allows_own_and_shared() {
        // 白名单 = crm + public/unified_core
        let allowed: Vec<String> = vec![
            "crm".into(),
            "public".into(),
            "unified_core".into(),
            "plugin_finance".into(),
        ];
        let sql = "SELECT * FROM crm.customers c JOIN public.users u ON u.id = c.owner_id \
                   JOIN unified_core.dict d ON d.id = u.tenant_id \
                   JOIN plugin_finance.vouchers v ON v.customer_id = c.id";
        let refs = extract_schema_refs(sql);
        let mut violations = Vec::new();
        for (s, _t) in &refs {
            if SQL_KEYWORDS.contains(&s.as_str()) {
                continue;
            }
            if !allowed.iter().any(|a| a == s) {
                violations.push(s.clone());
            }
        }
        assert!(violations.is_empty(), "不应有违规: {:?}", violations);
    }

    #[test]
    fn whitelist_rejects_foreign_schema() {
        let allowed: Vec<String> = vec!["crm".into(), "public".into(), "unified_core".into()];
        let refs = extract_schema_refs("SELECT * FROM wms.warehouses");
        let mut violations = Vec::new();
        for (s, _t) in &refs {
            if SQL_KEYWORDS.contains(&s.as_str()) {
                continue;
            }
            if !allowed.iter().any(|a| a == s) {
                violations.push(s.clone());
            }
        }
        assert_eq!(violations, vec!["wms".to_string()]);
    }
}

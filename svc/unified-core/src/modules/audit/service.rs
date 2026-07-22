use sqlx::PgPool;
use uuid::Uuid;

use super::models::{OperationLog, OperationLogRecord};

/// 写入一条操作审计日志。供 middleware 与业务代码调用。
pub async fn record_operation_log(
    pool: &PgPool,
    record: OperationLogRecord,
) -> Result<Uuid, sqlx::Error> {
    let id = Uuid::new_v4();

    sqlx::query(
        r#"
        INSERT INTO core_operation_logs (
            id, tenant_id, user_id, user_name, module, operation,
            resource_type, resource_id, description, request_data,
            response_status, ip_address, user_agent, trace_id, created_at
        ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10,
            $11, $12, $13, $14, NOW()
        )
        "#,
    )
    .bind(id)
    .bind(record.tenant_id)
    .bind(record.user_id)
    .bind(record.user_name)
    .bind(record.module)
    .bind(record.operation)
    .bind(record.resource_type)
    .bind(record.resource_id)
    .bind(record.description)
    .bind(record.request_data)
    .bind(record.response_status)
    .bind(record.ip_address)
    .bind(record.user_agent)
    .bind(record.trace_id)
    .execute(pool)
    .await?;

    Ok(id)
}

pub async fn get_operation_log(
    pool: &PgPool,
    tenant_id: Uuid,
    id: Uuid,
) -> Result<Option<OperationLog>, sqlx::Error> {
    sqlx::query_as::<_, OperationLog>(
        r#"SELECT id, tenant_id, user_id, user_name, module, operation,
                  resource_type, resource_id, description, request_data,
                  response_status, ip_address, user_agent, trace_id, created_at
           FROM core_operation_logs
           WHERE id = $1 AND tenant_id = $2"#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(pool)
    .await
}

/// 根据 HTTP 方法和路径推断 module / operation / resource_type
///
/// 规则：
/// - POST   -> operation = "create"
/// - PUT    -> operation = "update"
/// - DELETE -> operation = "delete"
/// - 路径形如 /api/{service}/{resource}/{id} 时：module = service, resource_type = resource
pub fn infer_module_and_operation(method: &str, path: &str) -> (String, String, String) {
    let operation = match method {
        "POST" => "create",
        "PUT" | "PATCH" => "update",
        "DELETE" => "delete",
        _ => "write",
    }
    .to_string();

    // 解析路径分段，跳过空段
    let segments: Vec<&str> = path.split('/').filter(|s| !s.is_empty()).collect();
    // 期望格式: api / <service> / ... / <resource>
    let module = segments
        .get(1)
        .map(|s| s.to_string())
        .unwrap_or_else(|| "unknown".to_string());
    let resource_type = segments
        .iter()
        .rev()
        // 跳过末尾的 UUID 或数字 ID
        .find(|seg| !seg.is_empty() && Uuid::parse_str(seg).is_err() && seg.parse::<i64>().is_err())
        .map(|s| s.to_string())
        .unwrap_or_else(|| module.clone());

    (module, operation, resource_type)
}

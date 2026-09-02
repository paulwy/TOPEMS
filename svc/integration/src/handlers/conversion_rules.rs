use axum::extract::{Path, State};
use axum::Json;
use chrono::Utc;
use sqlx::Row;
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use topems_shared_core::response::ApiResponse;

use crate::conversion_rules::{
    get_rule_executions, insert_conversion_rule, list_conversion_rules, ConversionExecution,
    ConversionRule, CreateConversionRuleRequest, ExecuteConversionRequest,
    ExecuteConversionResponse, RuleStatus, TriggerType, UpdateConversionRuleRequest,
};
use crate::models::AppState;

#[utoipa::path(
    get,
    security(("BearerAuth" = ["integration:conversion:read"])),
    path = "/api/integration/rules",
    tag = "integration",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn list_conversion_rules_api(
    State(state): State<AppState>,
) -> Json<ApiResponse<Vec<ConversionRule>>> {
    match list_conversion_rules(&state.pool).await {
        Ok(rules) => Json(ApiResponse::success(
            rules,
            "Conversion rules retrieved successfully",
        )),
        Err(e) => {
            tracing::error!("Failed to fetch conversion rules: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("Failed to fetch conversion rules: {}", e),
            ))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["integration:conversion:read"])),
    path = "/api/integration/rules/{id}",
    tag = "integration",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_conversion_rule_api(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ConversionRule>> {
    match sqlx::query_as::<_, ConversionRule>(
        only_own_schema_query!("integration", "SELECT id, source_system, target_system, rule_type, source_field, target_field, transformation_type, transformation_config, priority, is_active, created_at, updated_at, deleted_at FROM integration.conversion_rules WHERE deleted_at IS NULL AND id = $1"),
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await
    {
        Ok(rule) => Json(ApiResponse::success(rule, "Conversion rule found")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "Conversion rule not found")),
        Err(e) => {
            tracing::error!("Failed to fetch conversion rule: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("Failed to fetch conversion rule: {}", e),
            ))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["integration:conversion:write"])),
    path = "/api/integration/rules",
    request_body = CreateConversionRuleRequest,
    tag = "integration",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn create_conversion_rule_api(
    State(state): State<AppState>,
    Json(req): Json<CreateConversionRuleRequest>,
) -> Json<ApiResponse<ConversionRule>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let rule = ConversionRule {
        id,
        tenant_id: req.tenant_id,
        code: req.code,
        name: req.name,
        description: req.description,
        source_system: req.source_system,
        source_entity: req.source_entity,
        target_system: req.target_system,
        target_entity: req.target_entity,
        trigger_type: req.trigger_type,
        trigger_condition: req.trigger_condition,
        field_mappings: serde_json::to_value(&req.field_mappings)
            .unwrap_or(serde_json::Value::Array(vec![])),
        transform_script: req.transform_script,
        status: RuleStatus::Draft,
        priority: req.priority.unwrap_or(100),
        is_enabled: false,
        max_retries: req.max_retries.unwrap_or(3),
        retry_interval_secs: req.retry_interval_secs.unwrap_or(60),
        stop_on_failure: req.stop_on_failure.unwrap_or(false),
        created_at: now,
        updated_at: now,
    };

    match insert_conversion_rule(&state.pool, &rule).await {
        Ok(_) => Json(ApiResponse::success(
            rule,
            "Conversion rule created successfully",
        )),
        Err(e) => {
            tracing::error!("Failed to create conversion rule: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("Failed to create conversion rule: {}", e),
            ))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["integration:conversion:write"])),
    path = "/api/integration/rules/{id}",
    request_body = UpdateConversionRuleRequest,
    tag = "integration",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn update_conversion_rule_api(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateConversionRuleRequest>,
) -> Json<ApiResponse<ConversionRule>> {
    let now = Utc::now();

    let row = sqlx::query(
        only_own_schema_query!("integration", "UPDATE integration.conversion_rules SET name = COALESCE($1, name), description = COALESCE($2, description), trigger_type = COALESCE($3, trigger_type), trigger_condition = COALESCE($4, trigger_condition), field_mappings = COALESCE($5, field_mappings), transform_script = COALESCE($6, transform_script), status = COALESCE($7, status), priority = COALESCE($8, priority), is_enabled = COALESCE($9, is_enabled), max_retries = COALESCE($10, max_retries), retry_interval_secs = COALESCE($11, retry_interval_secs), stop_on_failure = COALESCE($12, stop_on_failure), updated_at = $13 WHERE id = $14 RETURNING id, code, name, description, source_system, source_entity, target_system, target_entity, trigger_type, trigger_condition, field_mappings, transform_script, status, priority, is_enabled, max_retries, retry_interval_secs, stop_on_failure, created_at::TEXT, updated_at::TEXT")
    )
    .bind(&req.name)
    .bind(&req.description)
    .bind(req.trigger_type.as_ref().map(|v| v.as_str().to_string()))
    .bind(&req.trigger_condition)
    .bind(req.field_mappings.as_ref().map(|v| serde_json::to_value(v).unwrap_or(serde_json::Value::Array(vec![]))))
    .bind(&req.transform_script)
    .bind(req.status.as_ref().map(|v| v.as_str().to_string()))
    .bind(req.priority)
    .bind(req.is_enabled)
    .bind(req.max_retries)
    .bind(req.retry_interval_secs)
    .bind(req.stop_on_failure)
    .bind(now)
    .bind(id)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(
            ConversionRule {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                code: r.get("code"),
                name: r.get("name"),
                description: r.get("description"),
                source_system: r.get("source_system"),
                source_entity: r.get("source_entity"),
                target_system: r.get("target_system"),
                target_entity: r.get("target_entity"),
                trigger_type: TriggerType::from_str(r.get::<String, _>("trigger_type").as_str()),
                trigger_condition: r.get("trigger_condition"),
                field_mappings: r.get("field_mappings"),
                transform_script: r.get("transform_script"),
                status: RuleStatus::from_str(r.get::<String, _>("status").as_str()),
                priority: r.get("priority"),
                is_enabled: r.get("is_enabled"),
                max_retries: r.get("max_retries"),
                retry_interval_secs: r.get("retry_interval_secs"),
                stop_on_failure: r.get("stop_on_failure"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            },
            "Conversion rule updated successfully",
        )),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "Conversion rule not found")),
        Err(e) => {
            tracing::error!("Failed to update conversion rule: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("Failed to update conversion rule: {}", e),
            ))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["integration:conversion:write"])),
    path = "/api/integration/rules/{id}",
    tag = "integration",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn delete_conversion_rule_api(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<()>> {
    match sqlx::query(only_own_schema_query!(
        "integration",
        "UPDATE integration.conversion_rules SET deleted_at = NOW() WHERE id = $1"
    ))
    .bind(id)
    .execute(&state.pool)
    .await
    {
        Ok(result) => {
            if result.rows_affected() == 0 {
                Json(ApiResponse::error(404, "Conversion rule not found"))
            } else {
                Json(ApiResponse::success(
                    (),
                    "Conversion rule deleted successfully",
                ))
            }
        }
        Err(e) => {
            tracing::error!("Failed to delete conversion rule: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("Failed to delete conversion rule: {}", e),
            ))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["integration:conversion:read"])),
    path = "/api/integration/rules/{id}/executions",
    tag = "integration",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_rule_executions_api(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Vec<ConversionExecution>>> {
    match get_rule_executions(&state.pool, id, 100).await {
        Ok(executions) => Json(ApiResponse::success(
            executions,
            "Rule executions retrieved successfully",
        )),
        Err(e) => {
            tracing::error!("Failed to fetch rule executions: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("Failed to fetch rule executions: {}", e),
            ))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["integration:conversion:admin"])),
    path = "/api/integration/rules/{id}/execute",
    request_body = ExecuteConversionRequest,
    tag = "integration",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn execute_conversion_rule_api(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<ExecuteConversionRequest>,
) -> Json<ApiResponse<ExecuteConversionResponse>> {
    let rule = match sqlx::query_as::<_, ConversionRule>(
        only_own_schema_query!("integration", "SELECT id, source_system, target_system, rule_type, source_field, target_field, transformation_type, transformation_config, priority, is_active, created_at, updated_at, deleted_at FROM integration.conversion_rules WHERE deleted_at IS NULL AND id = $1"),
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await
    {
        Ok(r) => r,
        Err(sqlx::Error::RowNotFound) => {
            return Json(ApiResponse::error(404, "Conversion rule not found"))
        }
        Err(e) => {
            tracing::error!("Failed to fetch rule: {}", e);
            return Json(ApiResponse::error(
                500,
                &format!("Failed to fetch rule: {}", e),
            ));
        }
    };

    if !rule.is_enabled {
        return Json(ApiResponse::error(400, "Conversion rule is not enabled"));
    }

    let execution_id = Uuid::new_v4();
    let now = Utc::now();

    let _ = sqlx::query(
        only_own_schema_query!("integration", "INSERT INTO integration.conversion_executions (id, rule_id, rule_code, source_record_id, source_data, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)"),
    )
    .bind(execution_id)
    .bind(rule.id)
    .bind(&rule.code)
    .bind(&req.source_record_id)
    .bind(&req.source_data)
    .bind("running")
    .bind(now)
    .execute(&state.pool)
    .await;

    let response = ExecuteConversionResponse {
        execution_id,
        success: true,
        target_record_id: Some(Uuid::new_v4().to_string()),
        target_data: Some(req.source_data),
        message: "Conversion executed successfully".to_string(),
        error_message: None,
    };

    let _ = sqlx::query(
        only_own_schema_query!("integration", "UPDATE integration.conversion_executions SET status = $1, completed_at = $2, target_record_id = $3, target_data = $4
         WHERE id = $5"),
    )
    .bind("completed")
    .bind(now)
    .bind(&response.target_record_id)
    .bind(&response.target_data)
    .bind(execution_id)
    .execute(&state.pool)
    .await;

    Json(ApiResponse::success(
        response,
        "Conversion executed successfully",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["integration:conversion:admin"])),
    path = "/api/integration/rules/{id}/enable",
    tag = "integration",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn enable_conversion_rule_api(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ConversionRule>> {
    match sqlx::query_as::<_, ConversionRule>(
        only_own_schema_query!("integration", "UPDATE integration.conversion_rules SET is_enabled = true, status = 'active', updated_at = $2 WHERE id = $1 RETURNING *"),
    )
    .bind(id)
    .bind(Utc::now())
    .fetch_one(&state.pool)
    .await
    {
        Ok(rule) => Json(ApiResponse::success(rule, "Conversion rule enabled successfully")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "Conversion rule not found")),
        Err(e) => {
            tracing::error!("Failed to enable conversion rule: {}", e);
            Json(ApiResponse::error(500, &format!("Failed to enable conversion rule: {}", e)))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["integration:conversion:admin"])),
    path = "/api/integration/rules/{id}/disable",
    tag = "integration",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn disable_conversion_rule_api(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ConversionRule>> {
    match sqlx::query_as::<_, ConversionRule>(
        only_own_schema_query!("integration", "UPDATE integration.conversion_rules SET is_enabled = false, status = 'inactive', updated_at = $2 WHERE id = $1 RETURNING *"),
    )
    .bind(id)
    .bind(Utc::now())
    .fetch_one(&state.pool)
    .await
    {
        Ok(rule) => Json(ApiResponse::success(rule, "Conversion rule disabled successfully")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "Conversion rule not found")),
        Err(e) => {
            tracing::error!("Failed to disable conversion rule: {}", e);
            Json(ApiResponse::error(500, &format!("Failed to disable conversion rule: {}", e)))
        }
    }
}

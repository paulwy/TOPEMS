use axum::{extract::State, Json};
use sqlx::types::Uuid;
use sqlx::Row;
use topems_shared_core::response::ApiResponse;

use super::models::{CreateParseRuleRequest, ParseRule, ParseRuleQuery, UpdateParseRuleRequest};

pub async fn list_parse_rules(
    State(state): State<crate::shared::AppState>,
    axum::extract::Query(query): axum::extract::Query<ParseRuleQuery>,
) -> Json<ApiResponse<Vec<ParseRule>>> {
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let sql = match (query.status.as_ref(), query.protocol.as_ref()) {
        (Some(_), Some(_)) => {
            "SELECT id, rule_no, rule_name, protocol, instrument_type, \
             parse_config, quality_rules, status, version, description, \
             created_by, created_at::TEXT, updated_at::TEXT \
             FROM qa_lims_parse_rules \
             WHERE status = $1 AND protocol = $2 \
             ORDER BY created_at DESC LIMIT $3 OFFSET $4"
        }
        (Some(_), None) => {
            "SELECT id, rule_no, rule_name, protocol, instrument_type, \
             parse_config, quality_rules, status, version, description, \
             created_by, created_at::TEXT, updated_at::TEXT \
             FROM qa_lims_parse_rules \
             WHERE status = $1 \
             ORDER BY created_at DESC LIMIT $2 OFFSET $3"
        }
        (None, Some(_)) => {
            "SELECT id, rule_no, rule_name, protocol, instrument_type, \
             parse_config, quality_rules, status, version, description, \
             created_by, created_at::TEXT, updated_at::TEXT \
             FROM qa_lims_parse_rules \
             WHERE protocol = $1 \
             ORDER BY created_at DESC LIMIT $2 OFFSET $3"
        }
        (None, None) => {
            "SELECT id, rule_no, rule_name, protocol, instrument_type, \
             parse_config, quality_rules, status, version, description, \
             created_by, created_at::TEXT, updated_at::TEXT \
             FROM qa_lims_parse_rules \
             ORDER BY created_at DESC LIMIT $1 OFFSET $2"
        }
    };

    let mut query_builder = sqlx::query(sql);
    match (query.status.as_ref(), query.protocol.as_ref()) {
        (Some(st), Some(pr)) => {
            query_builder = query_builder.bind(st).bind(pr).bind(page_size).bind(offset);
        }
        (Some(st), None) => {
            query_builder = query_builder.bind(st).bind(page_size).bind(offset);
        }
        (None, Some(pr)) => {
            query_builder = query_builder.bind(pr).bind(page_size).bind(offset);
        }
        (None, None) => {
            query_builder = query_builder.bind(page_size).bind(offset);
        }
    }

    let rules = query_builder.fetch_all(&state.pool).await.map(|rows| {
        rows.into_iter()
            .map(|row| ParseRule {
                id: row.get("id"),
                tenant_id: row.get("tenant_id"),
                rule_no: row.get("rule_no"),
                rule_name: row.get("rule_name"),
                protocol: row.get("protocol"),
                instrument_type: row.get("instrument_type"),
                parse_config: row.get("parse_config"),
                quality_rules: row.get("quality_rules"),
                status: row.get("status"),
                version: row.get("version"),
                description: row.get("description"),
                created_by: row.get("created_by"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            })
            .collect()
    });

    match rules {
        Ok(data) => Json(ApiResponse::success(data, "获取解析规则列表成功")),
        Err(e) => {
            tracing::error!("Failed to fetch parse rules: {}", e);
            Json(ApiResponse::error(500, "获取解析规则列表失败"))
        }
    }
}

pub async fn get_parse_rule(
    State(state): State<crate::shared::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<ParseRule>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的规则ID")),
    };

    let row = sqlx::query(
        r#"
        SELECT id, rule_no, rule_name, protocol, instrument_type,
               parse_config, quality_rules, status, version, description,
               created_by, created_at::TEXT, updated_at::TEXT
        FROM qa_lims_parse_rules
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await;

    match row {
        Ok(Some(r)) => Json(ApiResponse::success(
            ParseRule {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                rule_no: r.get("rule_no"),
                rule_name: r.get("rule_name"),
                protocol: r.get("protocol"),
                instrument_type: r.get("instrument_type"),
                parse_config: r.get("parse_config"),
                quality_rules: r.get("quality_rules"),
                status: r.get("status"),
                version: r.get("version"),
                description: r.get("description"),
                created_by: r.get("created_by"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            },
            "获取解析规则成功",
        )),
        Ok(None) => Json(ApiResponse::error(404, "解析规则不存在")),
        Err(e) => {
            tracing::error!("Failed to fetch parse rule: {}", e);
            Json(ApiResponse::error(500, "获取解析规则失败"))
        }
    }
}

pub async fn create_parse_rule(
    State(state): State<crate::shared::AppState>,
    Json(req): Json<CreateParseRuleRequest>,
) -> Json<ApiResponse<ParseRule>> {
    let rule_id = Uuid::new_v4();
    let rule_no = format!("PR-{}", chrono::Utc::now().format("%Y%m%d%H%M%S"));

    let row = sqlx::query(
        r#"
        INSERT INTO qa_lims_parse_rules 
            (id, rule_no, rule_name, protocol, instrument_type, 
             parse_config, quality_rules, status, version, description, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', '1.0', $8, 'system')
        RETURNING id, rule_no, rule_name, protocol, instrument_type,
                  parse_config, quality_rules, status, version, description,
                  created_by, created_at::TEXT, updated_at::TEXT
        "#,
    )
    .bind(rule_id)
    .bind(&rule_no)
    .bind(&req.rule_name)
    .bind(&req.protocol)
    .bind(&req.instrument_type)
    .bind(&req.parse_config)
    .bind(&req.quality_rules)
    .bind(&req.description)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(
            ParseRule {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                rule_no: r.get("rule_no"),
                rule_name: r.get("rule_name"),
                protocol: r.get("protocol"),
                instrument_type: r.get("instrument_type"),
                parse_config: r.get("parse_config"),
                quality_rules: r.get("quality_rules"),
                status: r.get("status"),
                version: r.get("version"),
                description: r.get("description"),
                created_by: r.get("created_by"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            },
            "解析规则创建成功",
        )),
        Err(e) => {
            tracing::error!("Failed to create parse rule: {}", e);
            Json(ApiResponse::error(500, "创建解析规则失败"))
        }
    }
}

pub async fn update_parse_rule(
    State(state): State<crate::shared::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateParseRuleRequest>,
) -> Json<ApiResponse<ParseRule>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的规则ID")),
    };

    let row = sqlx::query(
        r#"
        UPDATE qa_lims_parse_rules 
        SET rule_name = COALESCE($2, rule_name),
            status = COALESCE($3, status),
            parse_config = COALESCE($4, parse_config),
            quality_rules = COALESCE($5, quality_rules),
            description = COALESCE($6, description),
            version = (version::numeric + 0.1)::varchar,
            updated_at = NOW()
        WHERE id = $1
        RETURNING id, rule_no, rule_name, protocol, instrument_type,
                  parse_config, quality_rules, status, version, description,
                  created_by, created_at::TEXT, updated_at::TEXT
        "#,
    )
    .bind(id)
    .bind(&req.rule_name)
    .bind(&req.status)
    .bind(&req.parse_config)
    .bind(&req.quality_rules)
    .bind(&req.description)
    .fetch_optional(&state.pool)
    .await;

    match row {
        Ok(Some(r)) => Json(ApiResponse::success(
            ParseRule {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                rule_no: r.get("rule_no"),
                rule_name: r.get("rule_name"),
                protocol: r.get("protocol"),
                instrument_type: r.get("instrument_type"),
                parse_config: r.get("parse_config"),
                quality_rules: r.get("quality_rules"),
                status: r.get("status"),
                version: r.get("version"),
                description: r.get("description"),
                created_by: r.get("created_by"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            },
            "解析规则更新成功",
        )),
        Ok(None) => Json(ApiResponse::error(404, "解析规则不存在")),
        Err(e) => {
            tracing::error!("Failed to update parse rule: {}", e);
            Json(ApiResponse::error(500, "更新解析规则失败"))
        }
    }
}

pub async fn delete_parse_rule(
    State(state): State<crate::shared::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<bool>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的规则ID")),
    };

    let result = sqlx::query("UPDATE qa_lims_parse_rules SET deleted_at = NOW() WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(_) => Json(ApiResponse::success(true, "解析规则删除成功")),
        Err(e) => {
            tracing::error!("Failed to delete parse rule: {}", e);
            Json(ApiResponse::error(500, "删除解析规则失败"))
        }
    }
}

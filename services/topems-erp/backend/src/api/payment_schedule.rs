use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    routing::*,
    Json,
    Router,
};
use serde_json::json;
use uuid::Uuid;

use crate::models::{
    payment_schedule::{
        CreatePaymentScheduleRequest, PaymentSchedule,
        UpdatePaymentScheduleRequest, PaymentScheduleQuery,
    },
};

use super::ApiState;

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/api/v1/payment-schedules", get(list_payment_schedules).post(create_payment_schedule))
        .route("/api/v1/payment-schedules/project/:project_id", get(get_project_schedules))
        .route("/api/v1/payment-schedules/:id", put(update_payment_schedule).delete(delete_payment_schedule))
}

pub async fn create_payment_schedule(
    State(state): State<ApiState>,
    Json(payload): Json<CreatePaymentScheduleRequest>,
) -> Result<Json<PaymentSchedule>, (StatusCode, String)> {
    let schedule_type = payload.schedule_type.to_string();
    let status = "PENDING".to_string();

    let schedule = sqlx::query_as::<_, PaymentSchedule>(
        r#"
        INSERT INTO payment_schedules (
            receivable_id, payable_id, project_id, contract_id, 
            schedule_type, due_date, amount, status, remarks
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
        "#,
    )
    .bind(&payload.receivable_id)
    .bind(&payload.payable_id)
    .bind(&payload.project_id)
    .bind(&payload.contract_id)
    .bind(&schedule_type)
    .bind(&payload.due_date)
    .bind(&payload.amount)
    .bind(&status)
    .bind(&payload.remarks)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(schedule))
}

pub async fn get_project_schedules(
    State(state): State<ApiState>,
    Path(project_id): Path<Uuid>,
) -> Result<Json<Vec<PaymentSchedule>>, (StatusCode, String)> {
    let schedules = sqlx::query_as::<_, PaymentSchedule>(
        r#"SELECT * FROM payment_schedules WHERE project_id = $1 ORDER BY due_date"#,
    )
    .bind(project_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(schedules))
}

pub async fn update_payment_schedule(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdatePaymentScheduleRequest>,
) -> Result<Json<PaymentSchedule>, (StatusCode, String)> {
    let schedule = sqlx::query_as::<_, PaymentSchedule>(
        r#"
        UPDATE payment_schedules SET
            due_date = COALESCE($1, due_date),
            amount = COALESCE($2, amount),
            status = COALESCE($3::text, status),
            actual_payment_date = COALESCE($4, actual_payment_date),
            actual_amount = COALESCE($5, actual_amount),
            remarks = COALESCE($6, remarks),
            updated_at = NOW()
        WHERE id = $7
        RETURNING *
        "#
    )
    .bind(&payload.due_date)
    .bind(&payload.amount)
    .bind(&payload.status)
    .bind(&payload.actual_payment_date)
    .bind(&payload.actual_amount)
    .bind(&payload.remarks)
    .bind(id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| match e {
        sqlx::Error::RowNotFound => (StatusCode::NOT_FOUND, "Payment schedule not found".to_string()),
        _ => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
    })?;

    Ok(Json(schedule))
}

pub async fn delete_payment_schedule(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, (StatusCode, String)> {
    let result = sqlx::query(
        r#"DELETE FROM payment_schedules WHERE id = $1"#,
    )
    .bind(id)
    .execute(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "Payment schedule not found".to_string()));
    }

    Ok(StatusCode::NO_CONTENT)
}

pub async fn list_payment_schedules(
    State(state): State<ApiState>,
    Query(params): Query<PaymentScheduleQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let (schedules, total) = if params.project_id.is_some() {
        let schedules: Vec<PaymentSchedule> = sqlx::query_as(
            r#"
            SELECT * FROM payment_schedules 
            WHERE project_id = $1 
            ORDER BY due_date DESC 
            LIMIT $2 OFFSET $3
            "#
        )
        .bind(&params.project_id)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let total: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM payment_schedules WHERE project_id = $1"
        )
        .bind(&params.project_id)
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);

        (schedules, total)
    } else if params.schedule_type.is_some() {
        let schedules: Vec<PaymentSchedule> = sqlx::query_as(
            r#"
            SELECT * FROM payment_schedules 
            WHERE schedule_type = $1 
            ORDER BY due_date DESC 
            LIMIT $2 OFFSET $3
            "#
        )
        .bind(&params.schedule_type)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let total: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM payment_schedules WHERE schedule_type = $1"
        )
        .bind(&params.schedule_type)
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);

        (schedules, total)
    } else if params.status.is_some() {
        let schedules: Vec<PaymentSchedule> = sqlx::query_as(
            r#"
            SELECT * FROM payment_schedules 
            WHERE status = $1::text
            ORDER BY due_date DESC 
            LIMIT $2 OFFSET $3
            "#
        )
        .bind(&params.status)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let total: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM payment_schedules WHERE status = $1::text"
        )
        .bind(&params.status)
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);

        (schedules, total)
    } else {
        let schedules: Vec<PaymentSchedule> = sqlx::query_as(
            r#"
            SELECT * FROM payment_schedules 
            ORDER BY due_date DESC 
            LIMIT $1 OFFSET $2
            "#
        )
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM payment_schedules")
            .fetch_one(&state.db)
            .await
            .unwrap_or(0);

        (schedules, total)
    };

    let result = json!({
        "data": schedules,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) / page_size
    });

    Ok(Json(result))
}

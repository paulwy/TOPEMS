use axum::{
    extract::{State, Path},
    routing::{get, post, put, delete},
    Json, Router,
};
use std::sync::Arc;
use sqlx::postgres::PgPool;
use crate::models::{
    Sample, TestRecord, Equipment,
    CreateSampleRequest, CreateTestRecordRequest, CreateEquipmentRequest,
    UpdateSampleRequest, UpdateTestRecordRequest, UpdateEquipmentRequest,
};
use crate::db::{SampleRepository, TestRecordRepository, EquipmentRepository};
use crate::api::ApiResponse;

pub fn create_routes(pool: PgPool) -> Router {
    let sample_repo = Arc::new(SampleRepository::new(pool.clone()));
    let test_repo = Arc::new(TestRecordRepository::new(pool.clone()));
    let equip_repo = Arc::new(EquipmentRepository::new(pool));

    Router::new()
        // Samples
        .route("/api/v1/samples", get(list_samples).post(create_sample))
        .route("/api/v1/samples/:id", get(get_sample).put(update_sample).delete(delete_sample))
        // Test Records
        .route("/api/v1/test-records", get(list_test_records).post(create_test_record))
        .route("/api/v1/test-records/:id", get(get_test_record).put(update_test_record).delete(delete_test_record))
        // Equipments
        .route("/api/v1/equipments", get(list_equipments).post(create_equipment))
        .route("/api/v1/equipments/:id", get(get_equipment).put(update_equipment).delete(delete_equipment))
        .with_state((sample_repo, test_repo, equip_repo))
}

// Samples handlers
async fn list_samples(
    State((repo, _, _)): State<(Arc<SampleRepository>, Arc<TestRecordRepository>, Arc<EquipmentRepository>)>,
) -> Json<ApiResponse<Vec<Sample>>> {
    match repo.list(100, 0).await {
        Ok(samples) => Json(ApiResponse::success(samples)),
        Err(e) => Json(ApiResponse::error(&format!("Failed to list samples: {}", e))),
    }
}

async fn get_sample(
    Path(id): Path<uuid::Uuid>,
    State((repo, _, _)): State<(Arc<SampleRepository>, Arc<TestRecordRepository>, Arc<EquipmentRepository>)>,
) -> Json<ApiResponse<Sample>> {
    match repo.get(id).await {
        Ok(Some(sample)) => Json(ApiResponse::success(sample)),
        Ok(None) => Json(ApiResponse::error("Sample not found")),
        Err(e) => Json(ApiResponse::error(&format!("Failed to get sample: {}", e))),
    }
}

async fn create_sample(
    State((repo, _, _)): State<(Arc<SampleRepository>, Arc<TestRecordRepository>, Arc<EquipmentRepository>)>,
    Json(req): Json<CreateSampleRequest>,
) -> Json<ApiResponse<Sample>> {
    match repo.create(req).await {
        Ok(sample) => Json(ApiResponse::success_with_message(sample, "Sample created successfully")),
        Err(e) => Json(ApiResponse::error(&format!("Failed to create sample: {}", e))),
    }
}

async fn update_sample(
    Path(id): Path<uuid::Uuid>,
    State((repo, _, _)): State<(Arc<SampleRepository>, Arc<TestRecordRepository>, Arc<EquipmentRepository>)>,
    Json(req): Json<UpdateSampleRequest>,
) -> Json<ApiResponse<Sample>> {
    match repo.update(id, req).await {
        Ok(Some(sample)) => Json(ApiResponse::success_with_message(sample, "Sample updated successfully")),
        Ok(None) => Json(ApiResponse::error("Sample not found")),
        Err(e) => Json(ApiResponse::error(&format!("Failed to update sample: {}", e))),
    }
}

async fn delete_sample(
    Path(id): Path<uuid::Uuid>,
    State((repo, _, _)): State<(Arc<SampleRepository>, Arc<TestRecordRepository>, Arc<EquipmentRepository>)>,
) -> Json<ApiResponse<String>> {
    match repo.delete(id).await {
        Ok(true) => Json(ApiResponse::success_with_message("Sample deleted successfully".to_string(), "Sample deleted")),
        Ok(false) => Json(ApiResponse::error("Sample not found")),
        Err(e) => Json(ApiResponse::error(&format!("Failed to delete sample: {}", e))),
    }
}

// Test Records handlers
async fn list_test_records(
    State((_, repo, _)): State<(Arc<SampleRepository>, Arc<TestRecordRepository>, Arc<EquipmentRepository>)>,
) -> Json<ApiResponse<Vec<TestRecord>>> {
    match repo.list(None, 100, 0).await {
        Ok(records) => Json(ApiResponse::success(records)),
        Err(e) => Json(ApiResponse::error(&format!("Failed to list test records: {}", e))),
    }
}

async fn get_test_record(
    Path(id): Path<uuid::Uuid>,
    State((_, repo, _)): State<(Arc<SampleRepository>, Arc<TestRecordRepository>, Arc<EquipmentRepository>)>,
) -> Json<ApiResponse<TestRecord>> {
    match repo.get(id).await {
        Ok(Some(record)) => Json(ApiResponse::success(record)),
        Ok(None) => Json(ApiResponse::error("Test record not found")),
        Err(e) => Json(ApiResponse::error(&format!("Failed to get test record: {}", e))),
    }
}

async fn create_test_record(
    State((_, repo, _)): State<(Arc<SampleRepository>, Arc<TestRecordRepository>, Arc<EquipmentRepository>)>,
    Json(req): Json<CreateTestRecordRequest>,
) -> Json<ApiResponse<TestRecord>> {
    match repo.create(req).await {
        Ok(record) => Json(ApiResponse::success_with_message(record, "Test record created successfully")),
        Err(e) => Json(ApiResponse::error(&format!("Failed to create test record: {}", e))),
    }
}

async fn update_test_record(
    Path(id): Path<uuid::Uuid>,
    State((_, repo, _)): State<(Arc<SampleRepository>, Arc<TestRecordRepository>, Arc<EquipmentRepository>)>,
    Json(req): Json<UpdateTestRecordRequest>,
) -> Json<ApiResponse<TestRecord>> {
    match repo.update(id, req).await {
        Ok(Some(record)) => Json(ApiResponse::success_with_message(record, "Test record updated successfully")),
        Ok(None) => Json(ApiResponse::error("Test record not found")),
        Err(e) => Json(ApiResponse::error(&format!("Failed to update test record: {}", e))),
    }
}

async fn delete_test_record(
    Path(id): Path<uuid::Uuid>,
    State((_, repo, _)): State<(Arc<SampleRepository>, Arc<TestRecordRepository>, Arc<EquipmentRepository>)>,
) -> Json<ApiResponse<String>> {
    match repo.delete(id).await {
        Ok(true) => Json(ApiResponse::success_with_message("Test record deleted successfully".to_string(), "Test record deleted")),
        Ok(false) => Json(ApiResponse::error("Test record not found")),
        Err(e) => Json(ApiResponse::error(&format!("Failed to delete test record: {}", e))),
    }
}

// Equipments handlers
async fn list_equipments(
    State((_, _, repo)): State<(Arc<SampleRepository>, Arc<TestRecordRepository>, Arc<EquipmentRepository>)>,
) -> Json<ApiResponse<Vec<Equipment>>> {
    match repo.list(100, 0).await {
        Ok(equipments) => Json(ApiResponse::success(equipments)),
        Err(e) => Json(ApiResponse::error(&format!("Failed to list equipments: {}", e))),
    }
}

async fn get_equipment(
    Path(id): Path<uuid::Uuid>,
    State((_, _, repo)): State<(Arc<SampleRepository>, Arc<TestRecordRepository>, Arc<EquipmentRepository>)>,
) -> Json<ApiResponse<Equipment>> {
    match repo.get(id).await {
        Ok(Some(equipment)) => Json(ApiResponse::success(equipment)),
        Ok(None) => Json(ApiResponse::error("Equipment not found")),
        Err(e) => Json(ApiResponse::error(&format!("Failed to get equipment: {}", e))),
    }
}

async fn create_equipment(
    State((_, _, repo)): State<(Arc<SampleRepository>, Arc<TestRecordRepository>, Arc<EquipmentRepository>)>,
    Json(req): Json<CreateEquipmentRequest>,
) -> Json<ApiResponse<Equipment>> {
    match repo.create(req).await {
        Ok(equipment) => Json(ApiResponse::success_with_message(equipment, "Equipment created successfully")),
        Err(e) => Json(ApiResponse::error(&format!("Failed to create equipment: {}", e))),
    }
}

async fn update_equipment(
    Path(id): Path<uuid::Uuid>,
    State((_, _, repo)): State<(Arc<SampleRepository>, Arc<TestRecordRepository>, Arc<EquipmentRepository>)>,
    Json(req): Json<UpdateEquipmentRequest>,
) -> Json<ApiResponse<Equipment>> {
    match repo.update(id, req).await {
        Ok(Some(equipment)) => Json(ApiResponse::success_with_message(equipment, "Equipment updated successfully")),
        Ok(None) => Json(ApiResponse::error("Equipment not found")),
        Err(e) => Json(ApiResponse::error(&format!("Failed to update equipment: {}", e))),
    }
}

async fn delete_equipment(
    Path(id): Path<uuid::Uuid>,
    State((_, _, repo)): State<(Arc<SampleRepository>, Arc<TestRecordRepository>, Arc<EquipmentRepository>)>,
) -> Json<ApiResponse<String>> {
    match repo.delete(id).await {
        Ok(true) => Json(ApiResponse::success_with_message("Equipment deleted successfully".to_string(), "Equipment deleted")),
        Ok(false) => Json(ApiResponse::error("Equipment not found")),
        Err(e) => Json(ApiResponse::error(&format!("Failed to delete equipment: {}", e))),
    }
}

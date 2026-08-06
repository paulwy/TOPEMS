use super::generic::ApiResponse;

crate::define_service_client!(
    MasterDataServiceClient,
    "MASTER_DATA_SERVICE_URL",
    "http://localhost:8090",
    {
        list_entities(entity_type: &str, page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/master-data/entities/{}?page={}&pagesize={}"
        }
        get_entity(entity_type: &str, id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/master-data/entities/{}/{}"
        }
        create_entity(entity_type: &str) -> ApiResponse<serde_json::Value> {
            post => "/api/master-data/entities/{}"; body: data: &serde_json::Value
        }
        update_entity(entity_type: &str, id: &str) -> ApiResponse<serde_json::Value> {
            put => "/api/master-data/entities/{}/{}"; body: data: &serde_json::Value
        }
        delete_entity(entity_type: &str, id: &str) -> ApiResponse<bool> {
            delete => "/api/master-data/entities/{}/{}"
        }
        list_entity_types(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/master-data/entity-types?page={}&pagesize={}"
        }
        bulk_import(entity_type: &str) -> ApiResponse<serde_json::Value> {
            post => "/api/master-data/entities/{}/import"; body: rows: &Vec<serde_json::Value>
        }
    }
);

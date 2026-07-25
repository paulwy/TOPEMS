use super::generic::ApiResponse;

crate::define_service_client!(
    GisServiceClient,
    "GIS_SERVICE_URL",
    "http://localhost:8071",
    {
        list_layers(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/gis/layers?page={}&pagesize={}"
        }
        get_layer(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/gis/layers/{}"
        }
        create_layer() -> ApiResponse<serde_json::Value> {
            post => "/api/gis/layers"; body: data: &serde_json::Value
        }
        update_layer(id: &str) -> ApiResponse<serde_json::Value> {
            put => "/api/gis/layers/{}"; body: data: &serde_json::Value
        }
        delete_layer(id: &str) -> ApiResponse<serde_json::Value> {
            delete => "/api/gis/layers/{}"
        }
        geocode(address: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/gis/geocode?address={}"
        }
        reverse_geocode(lat: f64, lng: f64) -> ApiResponse<serde_json::Value> {
            get => "/api/gis/reverse-geocode?lat={}&lng={}"
        }
        get_map_tile(z: i32, x: i32, y: i32) -> ApiResponse<serde_json::Value> {
            get => "/api/gis/tiles/{}/{}/{}"
        }
        list_locations(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/gis/locations?page={}&pagesize={}"
        }
        get_location(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/gis/locations/{}"
        }
    }
);

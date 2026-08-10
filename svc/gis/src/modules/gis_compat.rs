#![allow(dead_code, clippy::empty_loop)]

// GIS 前端兼容 OpenAPI 注解模块
// 为前端 API 调用中存在但 OpenAPI 规格中缺失的路径补充 utoipa 注解。

#[utoipa::path(
    get,
    path = "/api/gis/business-locations",
    tag = "GIS-Compat",
    responses((status = 200, description = "GIS compatibility endpoint"))
)]
pub async fn compat_get_api_gis_business_locations() {}

#[utoipa::path(
    get,
    path = "/api/gis/business-locations/{id}",
    tag = "GIS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "GIS compatibility endpoint"))
)]
pub async fn compat_get_api_gis_business_locations_id() {}

#[utoipa::path(
    get,
    path = "/api/gis/business-locations/type/{type}",
    tag = "GIS-Compat",
    params(("type" = String, Path, description = "type")),
    responses((status = 200, description = "GIS compatibility endpoint"))
)]
pub async fn compat_get_api_gis_business_locations_type_type() {}

#[utoipa::path(
    post,
    path = "/api/gis/business-locations",
    tag = "GIS-Compat",
    responses((status = 200, description = "GIS compatibility endpoint"))
)]
pub async fn compat_post_api_gis_business_locations() {}

#[utoipa::path(
    put,
    path = "/api/gis/business-locations/{id}",
    tag = "GIS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "GIS compatibility endpoint"))
)]
pub async fn compat_put_api_gis_business_locations_id() {}

#[utoipa::path(
    delete,
    path = "/api/gis/business-locations/{id}",
    tag = "GIS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "GIS compatibility endpoint"))
)]
pub async fn compat_delete_api_gis_business_locations_id() {}

#[utoipa::path(
    get,
    path = "/api/gis/fences",
    tag = "GIS-Compat",
    responses((status = 200, description = "GIS compatibility endpoint"))
)]
pub async fn compat_get_api_gis_fences() {}

#[utoipa::path(
    get,
    path = "/api/gis/fences/{id}",
    tag = "GIS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "GIS compatibility endpoint"))
)]
pub async fn compat_get_api_gis_fences_id() {}

#[utoipa::path(
    post,
    path = "/api/gis/fences",
    tag = "GIS-Compat",
    responses((status = 200, description = "GIS compatibility endpoint"))
)]
pub async fn compat_post_api_gis_fences() {}

#[utoipa::path(
    put,
    path = "/api/gis/fences/{id}",
    tag = "GIS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "GIS compatibility endpoint"))
)]
pub async fn compat_put_api_gis_fences_id() {}

#[utoipa::path(
    delete,
    path = "/api/gis/fences/{id}",
    tag = "GIS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "GIS compatibility endpoint"))
)]
pub async fn compat_delete_api_gis_fences_id() {}

#[utoipa::path(
    get,
    path = "/api/gis/statistics",
    tag = "GIS-Compat",
    responses((status = 200, description = "GIS compatibility endpoint"))
)]
pub async fn compat_get_api_gis_statistics() {}

#[utoipa::path(
    get,
    path = "/api/gis/factory-maps",
    tag = "GIS-Compat",
    responses((status = 200, description = "GIS compatibility endpoint"))
)]
pub async fn compat_get_api_gis_factory_maps() {}

#[utoipa::path(
    get,
    path = "/api/gis/factory-maps/{id}",
    tag = "GIS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "GIS compatibility endpoint"))
)]
pub async fn compat_get_api_gis_factory_maps_id() {}

#[utoipa::path(
    post,
    path = "/api/gis/factory-maps",
    tag = "GIS-Compat",
    responses((status = 200, description = "GIS compatibility endpoint"))
)]
pub async fn compat_post_api_gis_factory_maps() {}

#[utoipa::path(
    put,
    path = "/api/gis/factory-maps/{id}",
    tag = "GIS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "GIS compatibility endpoint"))
)]
pub async fn compat_put_api_gis_factory_maps_id() {}

#[utoipa::path(
    delete,
    path = "/api/gis/factory-maps/{id}",
    tag = "GIS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "GIS compatibility endpoint"))
)]
pub async fn compat_delete_api_gis_factory_maps_id() {}

#[utoipa::path(
    get,
    path = "/api/gis/map-markers",
    tag = "GIS-Compat",
    responses((status = 200, description = "GIS compatibility endpoint"))
)]
pub async fn compat_get_api_gis_map_markers() {}

#[utoipa::path(
    post,
    path = "/api/gis/map-markers",
    tag = "GIS-Compat",
    responses((status = 200, description = "GIS compatibility endpoint"))
)]
pub async fn compat_post_api_gis_map_markers() {}

#[utoipa::path(
    put,
    path = "/api/gis/map-markers/{id}",
    tag = "GIS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "GIS compatibility endpoint"))
)]
pub async fn compat_put_api_gis_map_markers_id() {}

#[utoipa::path(
    delete,
    path = "/api/gis/map-markers/{id}",
    tag = "GIS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "GIS compatibility endpoint"))
)]
pub async fn compat_delete_api_gis_map_markers_id() {}

#[utoipa::path(
    get,
    path = "/api/gis/search",
    tag = "GIS-Compat",
    responses((status = 200, description = "GIS compatibility endpoint"))
)]
pub async fn compat_get_api_gis_search() {}

#[utoipa::path(
    get,
    path = "/api/gis/geojson/export",
    tag = "GIS-Compat",
    responses((status = 200, description = "GIS compatibility endpoint"))
)]
pub async fn compat_get_api_gis_geojson_export() {}

#[utoipa::path(
    get,
    path = "/api/gis/health",
    tag = "GIS-Compat",
    responses((status = 200, description = "GIS compatibility endpoint"))
)]
pub async fn compat_get_api_gis_health() {}

#[utoipa::path(
    post,
    path = "/api/gis/import",
    tag = "GIS-Compat",
    responses((status = 200, description = "GIS compatibility endpoint"))
)]
pub async fn compat_post_api_gis_import() {}

#[utoipa::path(
    get,
    path = "/api/gis/pipelines",
    tag = "GIS-Compat",
    responses((status = 200, description = "GIS compatibility endpoint"))
)]
pub async fn compat_get_api_gis_pipelines() {}

#[utoipa::path(
    get,
    path = "/api/gis/pipelines/{id}",
    tag = "GIS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "GIS compatibility endpoint"))
)]
pub async fn compat_get_api_gis_pipelines_id() {}

#[utoipa::path(
    post,
    path = "/api/gis/pipelines",
    tag = "GIS-Compat",
    responses((status = 200, description = "GIS compatibility endpoint"))
)]
pub async fn compat_post_api_gis_pipelines() {}

#[utoipa::path(
    put,
    path = "/api/gis/pipelines/{id}",
    tag = "GIS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "GIS compatibility endpoint"))
)]
pub async fn compat_put_api_gis_pipelines_id() {}

#[utoipa::path(
    delete,
    path = "/api/gis/pipelines/{id}",
    tag = "GIS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "GIS compatibility endpoint"))
)]
pub async fn compat_delete_api_gis_pipelines_id() {}

#[utoipa::path(
    get,
    path = "/api/gis/warehouse-locations",
    tag = "GIS-Compat",
    responses((status = 200, description = "GIS compatibility endpoint"))
)]
pub async fn compat_get_api_gis_warehouse_locations() {}

#[utoipa::path(
    get,
    path = "/api/gis/warehouse-locations/{id}",
    tag = "GIS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "GIS compatibility endpoint"))
)]
pub async fn compat_get_api_gis_warehouse_locations_id() {}

#[utoipa::path(
    post,
    path = "/api/gis/warehouse-locations",
    tag = "GIS-Compat",
    responses((status = 200, description = "GIS compatibility endpoint"))
)]
pub async fn compat_post_api_gis_warehouse_locations() {}

#[utoipa::path(
    put,
    path = "/api/gis/warehouse-locations/{id}",
    tag = "GIS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "GIS compatibility endpoint"))
)]
pub async fn compat_put_api_gis_warehouse_locations_id() {}

#[utoipa::path(
    delete,
    path = "/api/gis/warehouse-locations/{id}",
    tag = "GIS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "GIS compatibility endpoint"))
)]
pub async fn compat_delete_api_gis_warehouse_locations_id() {}

#[utoipa::path(
    get,
    path = "/api/gis/location-photos",
    tag = "GIS-Compat",
    responses((status = 200, description = "GIS compatibility endpoint"))
)]
pub async fn compat_get_api_gis_location_photos() {}

#[utoipa::path(
    get,
    path = "/api/gis/location-photos/{id}",
    tag = "GIS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "GIS compatibility endpoint"))
)]
pub async fn compat_get_api_gis_location_photos_id() {}

#[utoipa::path(
    post,
    path = "/api/gis/location-photos",
    tag = "GIS-Compat",
    responses((status = 200, description = "GIS compatibility endpoint"))
)]
pub async fn compat_post_api_gis_location_photos() {}

#[utoipa::path(
    delete,
    path = "/api/gis/location-photos/{id}",
    tag = "GIS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "GIS compatibility endpoint"))
)]
pub async fn compat_delete_api_gis_location_photos_id() {}

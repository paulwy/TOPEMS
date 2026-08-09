// V72.5: re-export the complete ErpApiDoc (with 40 paths + 30 schemas)
// from modules::openapi, so that tests/openapi_extract.rs and any
// `use topems_erp::openapi::ErpApiDoc` resolve to the full spec.
// P-04: 补全 update/delete handler 的 #[utoipa::path] 注解，修复 OpenAPI 方法不匹配。
pub use crate::modules::openapi::ErpApiDoc;

// V72.5: re-export the complete ErpApiDoc (with 23 paths + 25 schemas)
// from modules::openapi, so that tests/openapi_extract.rs and any
// `use topems_erp::openapi::ErpApiDoc` resolve to the full spec.
pub use crate::modules::openapi::ErpApiDoc;

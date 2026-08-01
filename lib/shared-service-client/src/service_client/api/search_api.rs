use super::super::error::ServiceClientResult;
use super::super::trait_api::TypedServiceClient;
use crate::define_service_api;

define_service_api!(
    SearchApi,
    "topems-search",
    8083,
    Some("SEARCH_SERVICE_URL"),
    "/api/search"
);

impl TypedServiceClient<SearchApi> {
    pub async fn search(
        &self,
        keyword: &str,
        modules: Option<Vec<String>>,
    ) -> ServiceClientResult<serde_json::Value> {
        let mut params = vec![("keyword".to_string(), keyword.to_string())];
        if let Some(modules) = modules {
            for m in modules {
                params.push(("modules".to_string(), m));
            }
        }
        let query_string = serde_urlencoded::to_string(params).unwrap_or_default();
        let path = format!("/?{}", query_string);
        self.get(&self.build_path(&path)).await
    }
}

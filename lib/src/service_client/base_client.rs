use super::error::{ServiceClientError, ServiceClientResult};
use reqwest::{Client, RequestBuilder};
use serde::{de::DeserializeOwned, Serialize};
use std::time::Duration;

#[derive(Clone)]
pub struct BaseServiceClient {
    client: Client,
    base_url: String,
}

impl BaseServiceClient {
    pub fn new(base_url: impl Into<String>) -> ServiceClientResult<Self> {
        let base_url = base_url.into();

        // 验证 URL 有效性
        if base_url.is_empty() {
            return Err(ServiceClientError::InvalidUrl(
                "Base URL cannot be empty".into(),
            ));
        }

        let client = Client::builder()
            .timeout(Duration::from_secs(30))
            .connect_timeout(Duration::from_secs(5))
            .build()
            .map_err(ServiceClientError::HttpRequestError)?;

        Ok(Self { client, base_url })
    }

    fn build_url(&self, path: &str) -> String {
        format!("{}{}", self.base_url, path)
    }

    pub async fn get<T: DeserializeOwned>(&self, path: &str) -> ServiceClientResult<T> {
        let url = self.build_url(path);
        let request = self.client.get(&url);
        self.execute_request(request).await
    }

    pub async fn post<T: DeserializeOwned, B: Serialize>(
        &self,
        path: &str,
        body: &B,
    ) -> ServiceClientResult<T> {
        let url = self.build_url(path);
        let request = self.client.post(&url).json(body);
        self.execute_request(request).await
    }

    pub async fn put<T: DeserializeOwned, B: Serialize>(
        &self,
        path: &str,
        body: &B,
    ) -> ServiceClientResult<T> {
        let url = self.build_url(path);
        let request = self.client.put(&url).json(body);
        self.execute_request(request).await
    }

    pub async fn delete<T: DeserializeOwned>(&self, path: &str) -> ServiceClientResult<T> {
        let url = self.build_url(path);
        let request = self.client.delete(&url);
        self.execute_request(request).await
    }

    async fn execute_request<T: DeserializeOwned>(
        &self,
        request: RequestBuilder,
    ) -> ServiceClientResult<T> {
        let response = request
            .send()
            .await
            .map_err(ServiceClientError::HttpRequestError)?;

        let status_code = response.status().as_u16();

        if !response.status().is_success() {
            let error_message = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".into());

            return Err(ServiceClientError::ServiceError {
                status_code,
                message: error_message,
            });
        }

        let result = response
            .json::<T>()
            .await
            .map_err(ServiceClientError::HttpRequestError)?;

        Ok(result)
    }

    pub async fn get_without_response(&self, path: &str) -> ServiceClientResult<()> {
        let url = self.build_url(path);
        let response = self
            .client
            .get(&url)
            .send()
            .await
            .map_err(ServiceClientError::HttpRequestError)?;

        if !response.status().is_success() {
            let status_code = response.status().as_u16();
            let error_message = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".into());

            return Err(ServiceClientError::ServiceError {
                status_code,
                message: error_message,
            });
        }

        Ok(())
    }
}

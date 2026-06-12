pub mod base_client;
pub mod error;
pub mod hrm_client;
pub mod iam_client;

pub use base_client::BaseServiceClient;
pub use error::{ServiceClientError, ServiceClientResult};
pub use hrm_client::{Company, Department, Employee, HrmServiceClient};
pub use iam_client::{IamServiceClient, Role, User};

pub fn create_hrm_client() -> ServiceClientResult<HrmServiceClient> {
    HrmServiceClient::from_env()
}

pub fn create_iam_client() -> ServiceClientResult<IamServiceClient> {
    IamServiceClient::from_env()
}

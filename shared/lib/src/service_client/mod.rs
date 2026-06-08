pub mod error;
pub mod base_client;
pub mod hrm_client;
pub mod iam_client;

pub use error::{ServiceClientError, ServiceClientResult};
pub use base_client::BaseServiceClient;
pub use hrm_client::{HrmServiceClient, Employee, Department, Company};
pub use iam_client::{IamServiceClient, User, Role};

pub fn create_hrm_client() -> ServiceClientResult<HrmServiceClient> {
    HrmServiceClient::from_env()
}

pub fn create_iam_client() -> ServiceClientResult<IamServiceClient> {
    IamServiceClient::from_env()
}


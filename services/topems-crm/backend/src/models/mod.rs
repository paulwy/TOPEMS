pub mod customer;
pub mod contact;
pub mod opportunity;
pub mod interaction;

pub use customer::{Customer, CreateCustomerRequest, UpdateCustomerRequest};
pub use contact::{Contact, CreateContactRequest, UpdateContactRequest};
pub use opportunity::{Opportunity, CreateOpportunityRequest, UpdateOpportunityRequest};
pub use interaction::{Interaction, CreateInteractionRequest, UpdateInteractionRequest};

use topems_shared::auth::Claims;

pub enum PmPermission {
    ProjectView,
    ProjectCreate,
    ProjectEdit,
    ProjectDelete,
    BudgetView,
    BudgetEdit,
    ContractView,
    ContractEdit,
}

pub fn check_permission(_claims: &Claims, _permission: PmPermission) -> bool {
    true
}

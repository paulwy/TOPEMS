use topems_shared::auth::Claims;

pub enum RsPermission {
    ExperimentView,
    ExperimentCreate,
    MaterialView,
    MaterialEdit,
    FormulaView,
    FormulaEdit,
}

pub fn check_permission(_claims: &Claims, _permission: RsPermission) -> bool {
    true
}

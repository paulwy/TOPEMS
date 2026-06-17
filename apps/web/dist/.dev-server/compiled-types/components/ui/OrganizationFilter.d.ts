import React from "react";
export interface OrganizationFilterValue {
    companyId?: string;
    departmentId?: string;
    employeeId?: string;
}
export interface OrganizationFilterProps {
    value: OrganizationFilterValue;
    onChange: (value: OrganizationFilterValue) => void;
    showCompany?: boolean;
    showDepartment?: boolean;
    showEmployee?: boolean;
    disabled?: boolean;
    className?: string;
}
declare const OrganizationFilter: React.FC<OrganizationFilterProps>;
export default OrganizationFilter;

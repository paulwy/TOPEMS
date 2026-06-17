import { type Company, type Department, type Employee } from "@/api/hrm";
export interface OrganizationData {
    companies: Company[];
    departments: Department[];
    employees: Employee[];
}
export interface UseOrganizationReturn {
    companies: Company[];
    departments: Department[];
    employees: Employee[];
    loading: boolean;
    loadCompanies: () => Promise<void>;
    loadDepartments: (companyId?: string) => Promise<void>;
    loadEmployees: (departmentId?: string) => Promise<void>;
    clearData: () => void;
}
export declare const useOrganization: () => UseOrganizationReturn;
export default useOrganization;

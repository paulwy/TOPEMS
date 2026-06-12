import React, { useEffect, useMemo, useRef } from "react";
import { Building2, Users, User } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { useOrganization } from "../../hooks/useOrganization";

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

const OrganizationFilter: React.FC<OrganizationFilterProps> = ({
  value,
  onChange,
  showCompany = true,
  showDepartment = true,
  showEmployee = true,
  disabled = false,
  className = "",
}) => {
  const {
    companies,
    departments,
    employees,
    loadCompanies,
    loadDepartments,
    loadEmployees,
  } = useOrganization();

  // 使用 ref 存储 onChange 回调，避免 useEffect 依赖项问题
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  useEffect(() => {
    if (value.companyId) {
      loadDepartments(value.companyId);
      onChangeRef.current({
        ...value,
        departmentId: undefined,
        employeeId: undefined,
      });
    } else {
      loadDepartments();
    }
  }, [value.companyId, loadDepartments]);

  useEffect(() => {
    if (value.departmentId) {
      loadEmployees(value.departmentId);
      onChangeRef.current({ ...value, employeeId: undefined });
    } else {
      loadEmployees();
    }
  }, [value.departmentId, loadEmployees]);

  const filteredDepartments = useMemo(() => {
    if (!value.companyId) return departments;
    return departments.filter(
      (dept) => dept.parent_id === null || dept.parent_id === value.companyId,
    );
  }, [departments, value.companyId]);

  const filteredEmployees = useMemo(() => {
    if (!value.departmentId) return employees;
    return employees.filter((emp) => emp.department_id === value.departmentId);
  }, [employees, value.departmentId]);

  const selectedCompany = companies.find((c) => c.id === value.companyId);
  const selectedDepartment = departments.find(
    (d) => d.id === value.departmentId,
  );
  const selectedEmployee = employees.find((e) => e.id === value.employeeId);

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {showCompany && (
        <div className="flex items-center space-x-2">
          <Building2 className="w-4 h-4 text-slate-400" />
          <Select
            value={value.companyId || "all"}
            onValueChange={(companyId) =>
              onChange({
                companyId: companyId === "all" ? undefined : companyId,
                departmentId: undefined,
                employeeId: undefined,
              })
            }
            disabled={disabled}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="选择公司" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部公司</SelectItem>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {showDepartment && (
        <div className="flex items-center space-x-2">
          <Users className="w-4 h-4 text-slate-400" />
          <Select
            value={value.departmentId || "all"}
            onValueChange={(departmentId) =>
              onChange({
                ...value,
                departmentId: departmentId === "all" ? undefined : departmentId,
                employeeId: undefined,
              })
            }
            disabled={disabled || (!value.companyId && companies.length > 0)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="选择部门" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部部门</SelectItem>
              {filteredDepartments.map((department) => (
                <SelectItem key={department.id} value={department.id}>
                  {department.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {showEmployee && (
        <div className="flex items-center space-x-2">
          <User className="w-4 h-4 text-slate-400" />
          <Select
            value={value.employeeId || "all"}
            onValueChange={(employeeId) =>
              onChange({
                ...value,
                employeeId: employeeId === "all" ? undefined : employeeId,
              })
            }
            disabled={
              disabled || (!value.departmentId && departments.length > 0)
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="选择员工" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部员工</SelectItem>
              {filteredEmployees.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {(selectedCompany || selectedDepartment || selectedEmployee) && (
        <div className="flex items-center space-x-2 text-sm text-slate-500 ml-4">
          <span>已选:</span>
          {selectedCompany && (
            <span className="text-slate-700">{selectedCompany.name}</span>
          )}
          {selectedDepartment && (
            <span className="text-slate-700">
              {selectedCompany ? " / " : ""}
              {selectedDepartment.name}
            </span>
          )}
          {selectedEmployee && (
            <span className="text-slate-700">
              {selectedCompany || selectedDepartment ? " / " : ""}
              {selectedEmployee.name}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default OrganizationFilter;

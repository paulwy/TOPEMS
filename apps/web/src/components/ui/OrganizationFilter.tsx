import React, { useEffect, useMemo, useRef } from 'react';
import { Building2, Users, User } from 'lucide-react';
import { FormControl, InputLabel, Select, MenuItem, Box, Typography } from '@mui/material';
import { useOrganization } from '../../hooks/useOrganization';
import i18n from '@/i18n';

export interface OrganizationFilterValue {
  orgId?: string;
  departmentId?: string;
  employeeId?: string;
}

interface OrganizationFilterProps {
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
  className = '',
}) => {
  const { companies, departments, employees, loadCompanies, loadDepartments, loadEmployees } =
    useOrganization();

  // 使用 ref 存储 onChange 回调，避免 useEffect 依赖项问题
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  useEffect(() => {
    if (value.orgId) {
      loadDepartments(value.orgId);
      onChangeRef.current({
        ...value,
        departmentId: undefined,
        employeeId: undefined,
      });
    } else {
      loadDepartments();
    }
  }, [value.orgId, loadDepartments, value]);

  useEffect(() => {
    if (value.departmentId) {
      loadEmployees(value.departmentId);
      onChangeRef.current({ ...value, employeeId: undefined });
    } else {
      loadEmployees();
    }
  }, [value.departmentId, loadEmployees, value]);

  const filteredDepartments = useMemo(() => {
    if (!value.orgId) return departments;
    return departments.filter((dept) => dept.parentId === null || dept.parentId === value.orgId);
  }, [departments, value.orgId]);

  const filteredEmployees = useMemo(() => {
    if (!value.departmentId) return employees;
    return employees.filter((emp) => emp.department_id === value.departmentId);
  }, [employees, value.departmentId]);

  const selectedCompany = companies.find((c) => c.id === value.orgId);
  const selectedDepartment = departments.find((d) => d.id === value.departmentId);
  const selectedEmployee = employees.find((e) => e.id === value.employeeId);

  return (
    <Box
      sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}
      className={className}
    >
      {showCompany && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Building2 style={{ width: 16, height: 16 }} />
          <FormControl
            size='small'
            sx={{ minWidth: 160 }}
            disabled={disabled}
          >
            <InputLabel>{i18n.t('components.organization_filter.k0')}</InputLabel>
            <Select
              value={value.orgId || 'all'}
              label={i18n.t('components.organization_filter.k1')}
              onChange={(e) =>
                onChange({
                  orgId: e.target.value === 'all' ? undefined : e.target.value,
                  departmentId: undefined,
                  employeeId: undefined,
                })
              }
            >
              <MenuItem value='all'>{i18n.t('components.organization_filter.k2')}</MenuItem>
              {companies.map((company) => (
                <MenuItem
                  key={company.id}
                  value={company.id}
                >
                  {company.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      {showDepartment && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Users style={{ width: 16, height: 16 }} />
          <FormControl
            size='small'
            sx={{ minWidth: 160 }}
            disabled={disabled || (!value.orgId && companies.length > 0)}
          >
            <InputLabel>{i18n.t('components.organization_filter.k3')}</InputLabel>
            <Select
              value={value.departmentId || 'all'}
              label={i18n.t('components.organization_filter.k4')}
              onChange={(e) =>
                onChange({
                  ...value,
                  departmentId: e.target.value === 'all' ? undefined : e.target.value,
                  employeeId: undefined,
                })
              }
            >
              <MenuItem value='all'>{i18n.t('components.organization_filter.k5')}</MenuItem>
              {filteredDepartments.map((department) => (
                <MenuItem
                  key={department.id}
                  value={department.id}
                >
                  {department.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      {showEmployee && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <User style={{ width: 16, height: 16 }} />
          <FormControl
            size='small'
            sx={{ minWidth: 160 }}
            disabled={disabled || (!value.departmentId && departments.length > 0)}
          >
            <InputLabel>{i18n.t('components.organization_filter.k6')}</InputLabel>
            <Select
              value={value.employeeId || 'all'}
              label={i18n.t('components.organization_filter.k7')}
              onChange={(e) =>
                onChange({
                  ...value,
                  employeeId: e.target.value === 'all' ? undefined : e.target.value,
                })
              }
            >
              <MenuItem value='all'>{i18n.t('components.organization_filter.k8')}</MenuItem>
              {filteredEmployees.map((employee) => (
                <MenuItem
                  key={employee.id}
                  value={employee.id}
                >
                  {employee.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      {(selectedCompany || selectedDepartment || selectedEmployee) && (
        <Typography
          variant='body2'
          color='text.secondary'
          sx={{ ml: 2 }}
        >
          <Typography
            component='span'
            variant='body2'
            sx={{ fontWeight: 500 }}
          >
            {i18n.t('components.organization_filter.k0')}:
          </Typography>
          {selectedCompany && (
            <Typography
              component='span'
              variant='body2'
              sx={{ ml: 0.5 }}
            >
              {selectedCompany.name}
            </Typography>
          )}
          {selectedDepartment && (
            <Typography
              component='span'
              variant='body2'
              sx={{ ml: 0.5 }}
            >
              {selectedCompany ? ' / ' : ''}
              {selectedDepartment.name}
            </Typography>
          )}
          {selectedEmployee && (
            <Typography
              component='span'
              variant='body2'
              sx={{ ml: 0.5 }}
            >
              {selectedCompany || selectedDepartment ? ' / ' : ''}
              {selectedEmployee.name}
            </Typography>
          )}
        </Typography>
      )}
    </Box>
  );
};

export { OrganizationFilter };
export default OrganizationFilter;

import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { z } from 'zod';
import { User, Mail, MapPin, Briefcase } from 'lucide-react';
import FormPageTemplate from '@/components/templates/FormPageTemplate';
import type { FormSection, FormField } from '@/components/templates/FormPageTemplate';
import { PageContainer } from '@/components/common';
import {
  employeeApi,
  departmentApi,
  positionApi,
  type Employee,
  type Department,
  type Position,
} from '@/api/hrm';
import { useNotification } from '@/hooks/useNotification';
import { HRM_PATHS } from '@/modules/hrm/config';
import { logger } from '@/utils/logger';

import { useTranslation } from 'react-i18next';

const employeeSchema = z.object({
  name: z.string().min(1, '姓名不能为空'),
  employee_no: z.string().min(1, '工号不能为空'),
  email: z.string().email('请输入有效的邮箱地址').optional(),
  phone: z.string().optional(),
  gender: z.enum(['male', 'female']).default('male'),
  birth_date: z.string().optional(),
  department_id: z.string().optional(),
  position_id: z.string().optional(),
  hire_date: z.string().optional(),
  status: z.enum(['active', 'probation', 'resigned']).default('active'),
  address: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

const HrmEmployeeEditPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error } = useNotification();
  const queryClient = useQueryClient();

  const employeeQuery = useQuery<Employee | null>({
    queryKey: QUERY_KEYS.HRM.EMPLOYEE(id || ''),
    enabled: !!id,
    queryFn: async () => {
      if (!id) {
        throw new Error(t('hrm.hrm_employee_edit_page.text_15c288'));
      }
      const res = await employeeApi.get(id);
      if (res.code !== 200 || !res.data) {
        throw new Error(t('hrm.hrm_employee_edit_page.fail'));
      }
      return res.data;
    },
  });

  const departmentsQuery = useQuery<Department[]>({
    queryKey: QUERY_KEYS.HRM.DEPARTMENTS,
    queryFn: async () => {
      const res = await departmentApi.list({ pagesize: 100 });
      if (res.code === 200 && res.data) {
        return res.data.items || [];
      }
      return [];
    },
  });

  const positionsQuery = useQuery<Position[]>({
    queryKey: QUERY_KEYS.HRM.POSITION,
    queryFn: async () => {
      const res = await positionApi.list({ pagesize: 100 });
      if (res.code === 200 && res.data) {
        return res.data.items || [];
      }
      return [];
    },
  });

  const employee = employeeQuery.data ?? null;
  const departments = departmentsQuery.data || [];
  const positions = positionsQuery.data || [];
  const loading = employeeQuery.isLoading || departmentsQuery.isLoading || positionsQuery.isLoading;

  const updateMutation = useMutation({
    mutationFn: async (args: { id: string; data: EmployeeFormData }) => {
      if (!args.data.name || !args.data.employee_no) {
        throw new Error(t('hrm.hrm_employee_edit_page.please_fill'));
      }
      const res = await employeeApi.update(args.id, args.data);
      if (res.code !== 200) {
        throw new Error(res.message || t('hrm.hrm_employee_edit_page.update'));
      }
      return res;
    },
    onSuccess: () => {
      success(t('hrm.hrm_employee_edit_page.update_1'));
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.HRM.EMPLOYEES });
      if (id) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.HRM.EMPLOYEE(id) });
        navigate(HRM_PATHS.employeeDetail.replace(':id', id));
      }
    },
    onError: (err: Error) => {
      logger.error('Failed to update employee:', err);
      error(err.message || t('hrm.hrm_employee_edit_page.update_2'));
    },
  });

  const handleSubmit = (data: unknown) => {
    if (!id) {
      error(t('hrm.hrm_employee_edit_page.text_15c288'));
      return;
    }
    const formData = data as EmployeeFormData;
    if (!formData.name || !formData.employee_no) {
      error(t('hrm.hrm_employee_edit_page.please_fill'));
      return;
    }
    updateMutation.mutate({ id, data: formData });
  };

  const submitting = updateMutation.isPending;

  const defaultValues = useMemo(() => {
    if (!employee) return {};
    return {
      name: employee.name || '',
      employee_no: employee.employee_no || '',
      email: employee.email || '',
      phone: employee.phone || '',
      gender: employee.gender || 'male',
      birth_date: employee.birth_date || '',
      department_id: employee.department_id || '',
      position_id: employee.position_id || '',
      hire_date: employee.hire_date || '',
      status: employee.status || 'active',
      address: employee.address || '',
      emergency_contact_name: employee.emergency_contact || '',
      emergency_contact_phone: employee.emergency_phone || '',
    };
  }, [employee]);

  const handleCancel = () => {
    if (id) {
      navigate(HRM_PATHS.employeeDetail.replace(':id', id));
    } else {
      navigate(HRM_PATHS.employees);
    }
  };

  const sections: FormSection[] = [
    {
      id: 'basic',
      title: t('hrm.hrm_employee_edit_page.info'),
      description: t('hrm.hrm_employee_edit_page.info_1'),
      icon: <User style={{ width: 18, height: 18 }} />,
      collapsible: false,
      fields: [
        {
          name: 'name',
          label: t('hrm.hrm_employee_edit_page.text_60d045'),
          type: 'text',
          required: true,
          placeholder: t('hrm.hrm_employee_edit_page.please_input_1'),
        },
        {
          name: 'employee_no',
          label: t('hrm.hrm_employee_edit_page.text_752d38'),
          type: 'text',
          required: true,
          placeholder: t('hrm.hrm_employee_edit_page.please_input_2'),
        },
        {
          name: 'gender',
          label: t('hrm.hrm_employee_edit_page.text_787b56'),
          type: 'select',
          options: [
            { label: t('hrm.hrm_employee_edit_page.text_36a490'), value: 'male' },
            { label: t('hrm.hrm_employee_edit_page.text_87c835'), value: 'female' },
          ],
        },
        {
          name: 'birth_date',
          label: t('hrm.hrm_employee_edit_page.date'),
          type: 'date',
          placeholder: t('hrm.hrm_employee_edit_page.please_select'),
        },
      ],
    },
    {
      id: 'contact',
      title: t('hrm.hrm_employee_edit_page.text_b58943'),
      description: t('hrm.hrm_employee_edit_page.info_2'),
      icon: <Mail style={{ width: 18, height: 18 }} />,
      collapsible: false,
      fields: [
        {
          name: 'email',
          label: t('hrm.hrm_employee_edit_page.email'),
          type: 'email',
          placeholder: t('hrm.hrm_employee_edit_page.please_input_3'),
        },
        {
          name: 'phone',
          label: t('hrm.hrm_employee_edit_page.text_8098e2'),
          type: 'text',
          placeholder: t('hrm.hrm_employee_edit_page.please_input_4'),
        },
        {
          name: 'address',
          label: t('hrm.hrm_employee_edit_page.address'),
          type: 'text',
          placeholder: t('hrm.hrm_employee_edit_page.please_input_5'),
          span: 2,
        },
      ],
    },
    {
      id: 'work',
      title: t('hrm.hrm_employee_edit_page.info_3'),
      description: t('hrm.hrm_employee_edit_page.info_4'),
      icon: <Briefcase style={{ width: 18, height: 18 }} />,
      collapsible: false,
      fields: [
        {
          name: 'department_id',
          label: t('hrm.hrm_employee_edit_page.text_1e1459'),
          type: 'select',
          options: departments.map((dept) => ({
            label: dept.name,
            value: dept.id,
          })),
          placeholder: t('hrm.hrm_employee_edit_page.please_select_1'),
        },
        {
          name: 'position_id',
          label: t('hrm.hrm_employee_edit_page.text_8402fc'),
          type: 'select',
          options: positions.map((pos) => ({
            label: pos.name,
            value: pos.id,
          })),
          placeholder: t('hrm.hrm_employee_edit_page.please_select_2'),
        },
        {
          name: 'hire_date',
          label: t('hrm.hrm_employee_edit_page.date_1'),
          type: 'date',
          placeholder: t('hrm.hrm_employee_edit_page.please_select_3'),
        },
        {
          name: 'status',
          label: t('hrm.hrm_employee_edit_page.status'),
          type: 'select',
          options: [
            { label: t('hrm.hrm_employee_edit_page.text_b5509b'), value: 'active' },
            { label: t('hrm.hrm_employee_edit_page.text_9a3256'), value: 'probation' },
            { label: t('hrm.hrm_employee_edit_page.text_583e79'), value: 'resigned' },
          ],
        },
      ],
    },
    {
      id: 'emergency',
      title: t('hrm.hrm_employee_edit_page.contact'),
      description: t('hrm.hrm_employee_edit_page.contact_1'),
      icon: <MapPin style={{ width: 18, height: 18 }} />,
      collapsible: false,
      fields: [
        {
          name: 'emergency_contact_name',
          label: t('hrm.hrm_employee_edit_page.contact'),
          type: 'text',
          placeholder: t('hrm.hrm_employee_edit_page.contact_2'),
        },
        {
          name: 'emergency_contact_phone',
          label: t('hrm.hrm_employee_edit_page.phone'),
          type: 'text',
          placeholder: t('hrm.hrm_employee_edit_page.please_input_6'),
        },
      ],
    },
  ];

  return (
    <PageContainer
      title={t('hrm.hrm_employee_edit_page.edit')}
      subtitle={t('hrm.hrm_employee_edit_page.info_5')}
    >
      <FormPageTemplate
        title=''
        subtitle=''
        backHref={HRM_PATHS.employees}
        breadcrumbs={[
          { label: t('hrm.hrm_employee_edit_page.home'), href: '/dashboard' },
          { label: t('hrm.hrm_employee_edit_page.text_40fb54'), href: '/hrm' },
          { label: t('hrm.hrm_employee_edit_page.text_b33603'), href: '/hrm/employees' },
          { label: t('hrm.hrm_employee_edit_page.edit') },
        ]}
        sections={sections}
        schema={employeeSchema}
        defaultValues={defaultValues}
        loading={loading}
        submitting={submitting}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        submitText={t('hrm.hrm_employee_edit_page.save')}
        cancelText={t('hrm.hrm_employee_edit_page.cancel')}
        columns={3}
        stickyFooter={true}
      />
    </PageContainer>
  );
};

export default HrmEmployeeEditPage;

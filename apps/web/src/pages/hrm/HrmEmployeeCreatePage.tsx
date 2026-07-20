import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { z } from 'zod';
import { User, Mail, Phone, Calendar, MapPin, Briefcase, Building2 } from 'lucide-react';
import FormPageTemplate from '@/components/templates/FormPageTemplate';
import type { FormSection, FormField } from '@/components/templates/FormPageTemplate';
import { PageContainer } from '@/components/common';
import { employeeApi, departmentApi, positionApi, type Department, type Position } from '@/api/hrm';
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

const HrmEmployeeCreatePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { success, error } = useNotification();
  const queryClient = useQueryClient();

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

  const departments = departmentsQuery.data || [];
  const positions = positionsQuery.data || [];
  const loading = departmentsQuery.isLoading || positionsQuery.isLoading;

  const createMutation = useMutation({
    mutationFn: async (data: EmployeeFormData) => {
      if (!data.name || !data.employee_no) {
        throw new Error(t('hrm.hrm_employee_create_page.please_fill'));
      }
      const res = await employeeApi.create(data);
      if (res.code !== 200 && res.code !== 201) {
        throw new Error(res.message || t('hrm.hrm_employee_create_page.create'));
      }
      return res;
    },
    onSuccess: () => {
      success(t('hrm.hrm_employee_create_page.create_1'));
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.HRM.EMPLOYEES });
      navigate(HRM_PATHS.employees);
    },
    onError: (err: Error) => {
      logger.error('Failed to create employee:', err);
      error(err.message || t('hrm.hrm_employee_create_page.create_2'));
    },
  });

  const handleSubmit = (data: unknown) => {
    const formData = data as EmployeeFormData;
    if (!formData.name || !formData.employee_no) {
      error(t('hrm.hrm_employee_create_page.please_fill'));
      return;
    }
    createMutation.mutate(formData);
  };

  const submitting = createMutation.isPending;

  const handleCancel = () => {
    navigate(HRM_PATHS.employees);
  };

  const sections: FormSection[] = [
    {
      id: 'basic',
      title: t('hrm.hrm_employee_create_page.info'),
      description: t('hrm.hrm_employee_create_page.info_1'),
      icon: <User style={{ width: 18, height: 18 }} />,
      collapsible: false,
      fields: [
        {
          name: 'name',
          label: t('hrm.hrm_employee_create_page.text_60d045'),
          type: 'text',
          required: true,
          placeholder: t('hrm.hrm_employee_create_page.please_input_1'),
        },
        {
          name: 'employee_no',
          label: t('hrm.hrm_employee_create_page.text_752d38'),
          type: 'text',
          required: true,
          placeholder: t('hrm.hrm_employee_create_page.please_input_2'),
        },
        {
          name: 'gender',
          label: t('hrm.hrm_employee_create_page.text_787b56'),
          type: 'select',
          options: [
            { label: t('hrm.hrm_employee_create_page.text_36a490'), value: 'male' },
            { label: t('hrm.hrm_employee_create_page.text_87c835'), value: 'female' },
          ],
          defaultValue: 'male',
        },
        {
          name: 'birth_date',
          label: t('hrm.hrm_employee_create_page.date'),
          type: 'date',
          placeholder: t('hrm.hrm_employee_create_page.please_select'),
        },
      ],
    },
    {
      id: 'contact',
      title: t('hrm.hrm_employee_create_page.text_b58943'),
      description: t('hrm.hrm_employee_create_page.info_2'),
      icon: <Mail style={{ width: 18, height: 18 }} />,
      collapsible: false,
      fields: [
        {
          name: 'email',
          label: t('hrm.hrm_employee_create_page.email'),
          type: 'email',
          placeholder: t('hrm.hrm_employee_create_page.please_input_3'),
        },
        {
          name: 'phone',
          label: t('hrm.hrm_employee_create_page.text_8098e2'),
          type: 'text',
          placeholder: t('hrm.hrm_employee_create_page.please_input_4'),
        },
        {
          name: 'address',
          label: t('hrm.hrm_employee_create_page.address'),
          type: 'text',
          placeholder: t('hrm.hrm_employee_create_page.please_input_5'),
          span: 2,
        },
      ],
    },
    {
      id: 'work',
      title: t('hrm.hrm_employee_create_page.info_3'),
      description: t('hrm.hrm_employee_create_page.info_4'),
      icon: <Briefcase style={{ width: 18, height: 18 }} />,
      collapsible: false,
      fields: [
        {
          name: 'department_id',
          label: t('hrm.hrm_employee_create_page.text_1e1459'),
          type: 'select',
          options: departments.map((dept) => ({
            label: dept.name,
            value: dept.id,
          })),
          placeholder: t('hrm.hrm_employee_create_page.please_select_1'),
        },
        {
          name: 'position_id',
          label: t('hrm.hrm_employee_create_page.text_8402fc'),
          type: 'select',
          options: positions.map((pos) => ({
            label: pos.name,
            value: pos.id,
          })),
          placeholder: t('hrm.hrm_employee_create_page.please_select_2'),
        },
        {
          name: 'hire_date',
          label: t('hrm.hrm_employee_create_page.date_1'),
          type: 'date',
          placeholder: t('hrm.hrm_employee_create_page.please_select_3'),
        },
        {
          name: 'status',
          label: t('hrm.hrm_employee_create_page.status'),
          type: 'select',
          options: [
            { label: t('hrm.hrm_employee_create_page.text_b5509b'), value: 'active' },
            { label: t('hrm.hrm_employee_create_page.text_9a3256'), value: 'probation' },
            { label: t('hrm.hrm_employee_create_page.text_583e79'), value: 'resigned' },
          ],
          defaultValue: 'active',
        },
      ],
    },
    {
      id: 'emergency',
      title: t('hrm.hrm_employee_create_page.contact'),
      description: t('hrm.hrm_employee_create_page.contact_1'),
      icon: <MapPin style={{ width: 18, height: 18 }} />,
      collapsible: false,
      fields: [
        {
          name: 'emergency_contact_name',
          label: t('hrm.hrm_employee_create_page.contact'),
          type: 'text',
          placeholder: t('hrm.hrm_employee_create_page.contact_2'),
        },
        {
          name: 'emergency_contact_phone',
          label: t('hrm.hrm_employee_create_page.phone'),
          type: 'text',
          placeholder: t('hrm.hrm_employee_create_page.please_input_6'),
        },
      ],
    },
  ];

  return (
    <PageContainer
      title={t('hrm.hrm_employee_create_page.text_f6e64d')}
      subtitle={t('hrm.hrm_employee_create_page.create_3')}
    >
      <FormPageTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: t('hrm.hrm_employee_create_page.home'), href: '/dashboard' },
          { label: t('hrm.hrm_employee_create_page.text_40fb54'), href: '/hrm' },
          { label: t('hrm.hrm_employee_create_page.text_b33603'), href: '/hrm/employees' },
          { label: t('hrm.hrm_employee_create_page.text_f6e64d') },
        ]}
        sections={sections}
        schema={employeeSchema}
        loading={loading}
        submitting={submitting}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        submitText={t('hrm.hrm_employee_create_page.create_4')}
        cancelText={t('hrm.hrm_employee_create_page.cancel')}
        columns={3}
        stickyFooter={true}
      />
    </PageContainer>
  );
};

export default HrmEmployeeCreatePage;

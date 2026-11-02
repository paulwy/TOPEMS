import React from 'react';
import styles from './HrmEmployeeCreatePage.module.css';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS, CACHE_DURATIONS } from '@/lib/reactQuery';
import { z } from 'zod';
import { User, Mail, MapPin, Briefcase } from 'lucide-react';
import FormPageTemplate from '@/components/templates/FormPageTemplate';
import type { FormSection } from '@/components/templates/FormPageTemplate';
import { PageContainer } from '@/components/common';
import { employeeApi, departmentApi, positionApi, type Department, type Position } from '@/api/hrm';
import { useNotification } from '@/hooks/useNotification';
import { HRM_PATHS } from '@/modules/hrm/config';
import { logger } from '@/utils/logger';

import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

const employeeSchema = z.object({
  name: z.string().min(1, i18n.t('hrm.hrm_employee_create_page.k0')),
  employee_no: z.string().min(1, i18n.t('hrm.hrm_employee_create_page.k1')),
  email: z.string().email(i18n.t('hrm.hrm_employee_create_page.k2')).or(z.literal('')).optional(),
  phone: z.string().optional(),
  gender: z.enum(['male', 'female']).or(z.literal('')).default('male'),
  birth_date: z.string().optional(),
  department_id: z.string().optional(),
  position_id: z.string().optional(),
  hire_date: z.string().optional(),
  status: z.enum(['active', 'probation', 'resigned']).or(z.literal('')).default('active'),
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
      const res = await departmentApi.list({ page_size: 100 });
      if (res.code === 200 && res.data) {
        return res.data.items || [];
      }
      return [];
    },

    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const positionsQuery = useQuery<Position[]>({
    queryKey: QUERY_KEYS.HRM.POSITION,
    queryFn: async () => {
      const res = await positionApi.list({ page_size: 100 });
      if (res.code === 200 && res.data) {
        return res.data.items || [];
      }
      return [];
    },

    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const departments = departmentsQuery.data || [];
  const positions = positionsQuery.data || [];
  const loading = departmentsQuery.isLoading || positionsQuery.isLoading;

  const createMutation = useMutation({
    mutationFn: async (data: EmployeeFormData) => {
      if (!data.name || !data.employee_no) {
        throw new Error(t('hrm.hrm_employee_create_page.please_fill'));
      }
      // 后端 birth_date/hire_date 为 Option<NaiveDate>、department_id/position_id 为 Option<Uuid>，
      // 空串 '' 会反序列化失败（422）；未填时转 undefined 让 JSON 序列化跳过该字段（C2 实测契约对齐）
      const res = await employeeApi.create({
        ...data,
        birth_date: data.birth_date || undefined,
        hire_date: data.hire_date || undefined,
        department_id: data.department_id || undefined,
        position_id: data.position_id || undefined,
      });
      if (res.code !== 200 && res.code !== 201) {
        throw new Error(res.message || t('hrm.hrm_employee_create_page.create'));
      }
      return res;
    },
    onSuccess: () => {
      success(t('hrm.hrm_employee_create_page.create_1'));
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.HRM.EMPLOYEES,
        exact: false,
        refetchType: 'active',
      });
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
      icon: <User className={styles.il1} />,
      collapsible: false,
      fields: [
        {
          name: 'name',
          label: t('hrm.hrm_employee_create_page.name_label'),
          type: 'text',
          required: true,
          placeholder: t('hrm.hrm_employee_create_page.please_input_1'),
        },
        {
          name: 'employee_no',
          label: t('hrm.hrm_employee_create_page.employee_no_short'),
          type: 'text',
          required: true,
          placeholder: t('hrm.hrm_employee_create_page.please_input_2'),
        },
        {
          name: 'gender',
          label: t('hrm.hrm_employee_create_page.gender'),
          type: 'select',
          options: [
            { label: t('hrm.hrm_employee_create_page.male'), value: 'male' },
            { label: t('hrm.hrm_employee_create_page.female'), value: 'female' },
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
      title: t('hrm.hrm_employee_create_page.contact_info'),
      description: t('hrm.hrm_employee_create_page.info_2'),
      icon: <Mail className={styles.il2} />,
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
          label: t('hrm.hrm_employee_create_page.mobile_no'),
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
      icon: <Briefcase className={styles.il3} />,
      collapsible: false,
      fields: [
        {
          name: 'department_id',
          label: t('hrm.hrm_employee_create_page.department'),
          type: 'select',
          options: departments.map((dept) => ({
            label: dept.name,
            value: dept.id,
          })),
          placeholder: t('hrm.hrm_employee_create_page.please_select_1'),
        },
        {
          name: 'position_id',
          label: t('hrm.hrm_employee_create_page.position'),
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
            { label: t('hrm.hrm_employee_create_page.employed'), value: 'active' },
            { label: t('hrm.hrm_employee_create_page.probation_period'), value: 'probation' },
            { label: t('hrm.hrm_employee_create_page.resigned'), value: 'resigned' },
          ],
          defaultValue: 'active',
        },
      ],
    },
    {
      id: 'emergency',
      title: t('hrm.hrm_employee_create_page.contact'),
      description: t('hrm.hrm_employee_create_page.contact_1'),
      icon: <MapPin className={styles.il4} />,
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
      title={t('hrm.hrm_employee_create_page.create_employee')}
      subtitle={t('hrm.hrm_employee_create_page.create_3')}
    >
      <FormPageTemplate
        title=''
        subtitle=''
        backHref={HRM_PATHS.employees}
        breadcrumbs={[
          { label: t('hrm.hrm_employee_create_page.home'), href: '/dashboard' },
          { label: t('hrm.hrm_employee_create_page.human_resources'), href: '/hrm' },
          { label: t('hrm.hrm_employee_create_page.employee_management'), href: '/hrm/employees' },
          { label: t('hrm.hrm_employee_create_page.create_employee') },
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

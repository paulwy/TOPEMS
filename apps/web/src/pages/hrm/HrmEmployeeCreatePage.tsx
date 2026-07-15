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
        throw new Error('请填写必填字段');
      }
      const res = await employeeApi.create(data);
      if (res.code !== 200 && res.code !== 201) {
        throw new Error(res.message || '创建失败');
      }
      return res;
    },
    onSuccess: () => {
      success('员工创建成功');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.HRM.EMPLOYEES });
      navigate(HRM_PATHS.employees);
    },
    onError: (err: Error) => {
      logger.error('Failed to create employee:', err);
      error(err.message || '创建员工失败');
    },
  });

  const handleSubmit = (data: unknown) => {
    const formData = data as EmployeeFormData;
    if (!formData.name || !formData.employee_no) {
      error('请填写必填字段');
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
      title: '基本信息',
      description: '员工基本个人信息',
      icon: <User style={{ width: 18, height: 18 }} />,
      collapsible: false,
      fields: [
        {
          name: 'name',
          label: '姓名',
          type: 'text',
          required: true,
          placeholder: '请输入姓名',
        },
        {
          name: 'employee_no',
          label: '工号',
          type: 'text',
          required: true,
          placeholder: '请输入工号',
        },
        {
          name: 'gender',
          label: '性别',
          type: 'select',
          options: [
            { label: '男', value: 'male' },
            { label: '女', value: 'female' },
          ],
          defaultValue: 'male',
        },
        {
          name: 'birth_date',
          label: '出生日期',
          type: 'date',
          placeholder: '请选择出生日期',
        },
      ],
    },
    {
      id: 'contact',
      title: '联系方式',
      description: '员工联系信息',
      icon: <Mail style={{ width: 18, height: 18 }} />,
      collapsible: false,
      fields: [
        {
          name: 'email',
          label: '邮箱',
          type: 'email',
          placeholder: '请输入邮箱地址',
        },
        {
          name: 'phone',
          label: '手机号',
          type: 'text',
          placeholder: '请输入手机号',
        },
        {
          name: 'address',
          label: '地址',
          type: 'text',
          placeholder: '请输入地址',
          span: 2,
        },
      ],
    },
    {
      id: 'work',
      title: '工作信息',
      description: '员工工作相关信息',
      icon: <Briefcase style={{ width: 18, height: 18 }} />,
      collapsible: false,
      fields: [
        {
          name: 'department_id',
          label: '部门',
          type: 'select',
          options: departments.map((dept) => ({
            label: dept.name,
            value: dept.id,
          })),
          placeholder: '请选择部门',
        },
        {
          name: 'position_id',
          label: '岗位',
          type: 'select',
          options: positions.map((pos) => ({
            label: pos.name,
            value: pos.id,
          })),
          placeholder: '请选择岗位',
        },
        {
          name: 'hire_date',
          label: '入职日期',
          type: 'date',
          placeholder: '请选择入职日期',
        },
        {
          name: 'status',
          label: '状态',
          type: 'select',
          options: [
            { label: '在职', value: 'active' },
            { label: '试用期', value: 'probation' },
            { label: '离职', value: 'resigned' },
          ],
          defaultValue: 'active',
        },
      ],
    },
    {
      id: 'emergency',
      title: '紧急联系人',
      description: '紧急情况下的联系人信息',
      icon: <MapPin style={{ width: 18, height: 18 }} />,
      collapsible: false,
      fields: [
        {
          name: 'emergency_contact_name',
          label: '紧急联系人',
          type: 'text',
          placeholder: '请输入紧急联系人姓名',
        },
        {
          name: 'emergency_contact_phone',
          label: '紧急联系电话',
          type: 'text',
          placeholder: '请输入紧急联系电话',
        },
      ],
    },
  ];

  return (
    <PageContainer
      title='新建员工'
      subtitle='创建新的员工档案'
    >
      <FormPageTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: '首页', href: '/dashboard' },
          { label: '人力资源', href: '/hrm' },
          { label: '员工管理', href: '/hrm/employees' },
          { label: '新建员工' },
        ]}
        sections={sections}
        schema={employeeSchema}
        loading={loading}
        submitting={submitting}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        submitText='创建员工'
        cancelText='取消'
        columns={3}
        stickyFooter={true}
      />
    </PageContainer>
  );
};

export default HrmEmployeeCreatePage;

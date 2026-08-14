import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS, CACHE_DURATIONS } from '@/lib/reactQuery';
import { Box, Typography, InputLabel, Avatar } from '@mui/material';
import { User, Briefcase } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { hrmApi, type Employee } from '@/api/hrm';
import { HRM_PATHS } from '@/modules/hrm/config';
import { DetailPageTemplate, type TabConfig, type SectionConfig } from '@/components/templates';
import { StatusBadge } from '@topems/shared-components';
import { Dialog } from '@/components/common/Dialog';
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';

import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

const ct = designTokens.colors;

const HrmEmployeeDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [showTransferDialog, setShowTransferDialog] = useState(false);

  const employeeQuery = useQuery<Employee | null>({
    queryKey: QUERY_KEYS.HRM.EMPLOYEE(id || ''),
    enabled: !!id,
    queryFn: async () => {
      if (!id) {
        throw new Error(t('hrm.hrm_employee_detail_page.text_8ce1a3'));
      }
      const res = await hrmApi.employees.get(id);
      if (!res.success || !res.data) {
        throw new Error(t('hrm.hrm_employee_detail_page.detail'));
      }
      return res.data;
    },

    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const employee = employeeQuery.data ?? null;
  const loading = employeeQuery.isLoading;
  const errorMessage = employeeQuery.error ? t('hrm.hrm_employee_detail_page.detail_1') : undefined;

  const handleTransfer = () => {
    navigate(HRM_PATHS.employeeDetail.replace(':id', id!));
  };

  const getStatusConfig = (status: string) => {
    const config: Record<
      string,
      { color: 'success' | 'error' | 'default' | 'warning'; label: string }
    > = {
      active: { color: 'success', label: t('hrm.hrm_employee_detail_page.text_b5509b') },
      probation: { color: 'warning', label: t('hrm.hrm_employee_detail_page.text_9a3256') },
      leave: { color: 'default', label: t('hrm.hrm_employee_detail_page.text_62a8cf') },
      resigned: { color: 'error', label: t('hrm.hrm_employee_detail_page.text_370e61') },
      terminated: { color: 'error', label: t('hrm.hrm_employee_detail_page.text_43e92e') },
      retired: { color: 'default', label: t('hrm.hrm_employee_detail_page.text_399695') },
    };
    return config[status] || config.active;
  };

  const getGenderLabel = (gender: string) => {
    return gender === 'male'
      ? t('hrm.hrm_employee_detail_page.text_36a490')
      : gender === 'female'
        ? t('hrm.hrm_employee_detail_page.text_87c835')
        : '-';
  };

  const getEducationLabel = (education: string) => {
    const labels: Record<string, string> = {
      primary: t('hrm.hrm_employee_detail_page.text_79898d'),
      junior: t('hrm.hrm_employee_detail_page.text_b21914'),
      senior: t('hrm.hrm_employee_detail_page.text_8d9a85'),
      college: t('hrm.hrm_employee_detail_page.text_2aa9f5'),
      bachelor: t('hrm.hrm_employee_detail_page.text_40b14f'),
      master: t('hrm.hrm_employee_detail_page.text_e6de69'),
      doctor: t('hrm.hrm_employee_detail_page.text_7d27be'),
    };
    return labels[education] || education;
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('zh-CN');
  };

  const calculateWorkYears = () => {
    if (!employee?.hire_date) return 0;
    const hireDate = new Date(employee.hire_date);
    const today = new Date();
    const years = today.getFullYear() - hireDate.getFullYear();
    const months = today.getMonth() - hireDate.getMonth();
    return months < 0 ? years - 1 : years;
  };

  const basicInfoContent = useMemo(() => {
    if (!employee) return null;

    return (
      <Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            mb: 4,
          }}
        >
          <Avatar sx={{ width: 80, height: 80, fontSize: 32 }}>{employee.name?.charAt(0)}</Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography
              variant='h4'
              sx={{ fontWeight: 'bold' }}
            >
              {employee.name}
            </Typography>
            <Typography
              variant='body1'
              color='text.secondary'
            >
              {employee.position} | {employee.department_name}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <StatusBadge status={employee.status} />
              <StatusBadge
                status={getGenderLabel(employee.gender || '')}
                label={getGenderLabel(employee.gender || '')}
                color='default'
                variant='outlined'
              />
              <StatusBadge
                status={t('hrm.hrm_employee_detail_page.e1')}
                label={t('hrm.hrm_employee_detail_page.e1')}
                color='default'
                variant='outlined'
              />
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: 2,
          }}
        >
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
              {t('hrm.hrm_employee_detail_page.k0')}
            </InputLabel>
            <Typography sx={{ mt: 0.5, fontFamily: 'monospace' }}>
              {employee.employee_no}
            </Typography>
          </Box>
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
              {t('hrm.hrm_employee_detail_page.k1')}
            </InputLabel>
            <Typography sx={{ mt: 0.5, fontFamily: 'monospace' }}>
              {employee.id_number
                ? `${employee.id_number.slice(0, 4)}****${employee.id_number.slice(-4)}`
                : '-'}
            </Typography>
          </Box>
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
              {t('hrm.hrm_employee_detail_page.k2')}
            </InputLabel>
            <Typography sx={{ mt: 0.5 }}>{formatDate(employee.birth_date)}</Typography>
          </Box>
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
              {t('hrm.hrm_employee_detail_page.k3')}
            </InputLabel>
            <Typography sx={{ mt: 0.5 }}>{employee.phone || '-'}</Typography>
          </Box>
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
              {t('hrm.hrm_employee_detail_page.k4')}
            </InputLabel>
            <Typography sx={{ mt: 0.5 }}>{employee.email || '-'}</Typography>
          </Box>
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
              {t('hrm.hrm_employee_detail_page.k5')}
            </InputLabel>
            <Typography sx={{ mt: 0.5 }}>{getEducationLabel(employee.education || '')}</Typography>
          </Box>
        </Box>
      </Box>
    );
  }, [employee]);

  const workInfoContent = useMemo(() => {
    if (!employee) return null;
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 2,
        }}
      >
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('hrm.hrm_employee_detail_page.k6')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{formatDate(employee.hire_date)}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('hrm.hrm_employee_detail_page.k7')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{formatDate(employee.regular_date)}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('hrm.hrm_employee_detail_page.k8')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{employee.probation_period || 3} 个月</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('hrm.hrm_employee_detail_page.k9')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{employee.department_name || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('hrm.hrm_employee_detail_page.k10')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{employee.position || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('hrm.hrm_employee_detail_page.k11')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{employee.joblevel || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('hrm.hrm_employee_detail_page.k12')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{employee.work_location || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('hrm.hrm_employee_detail_page.k13')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{employee.report_to_name || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('hrm.hrm_employee_detail_page.k14')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>
            {employee.employee_type === 'full_time'
              ? i18n.t('hrm.hrm_employee_detail_page.text_63f85b')
              : i18n.t('hrm.hrm_employee_detail_page.text_7c4f46')}
          </Typography>
        </Box>
      </Box>
    );
  }, [employee]);

  const emergencyInfoContent = useMemo(() => {
    if (!employee) return null;
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 2,
        }}
      >
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('hrm.hrm_employee_detail_page.k15')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{employee.emergency_contact || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('hrm.hrm_employee_detail_page.k16')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{employee.emergency_phone || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('hrm.hrm_employee_detail_page.k17')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{employee.emergency_relation || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('hrm.hrm_employee_detail_page.k18')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{employee.address || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('hrm.hrm_employee_detail_page.k19')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{employee.hukou_location || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('hrm.hrm_employee_detail_page.k20')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{employee.remark || '-'}</Typography>
        </Box>
      </Box>
    );
  }, [employee]);

  const tabs = useMemo<TabConfig[]>(
    () => [
      {
        id: 'basic',
        label: t('hrm.hrm_employee_detail_page.info'),
        content: basicInfoContent || <></>,
      },
      {
        id: 'work',
        label: t('hrm.hrm_employee_detail_page.info_1'),
        content: workInfoContent || <></>,
      },
      {
        id: 'emergency',
        label: t('hrm.hrm_employee_detail_page.contact'),
        content: emergencyInfoContent || <></>,
      },
    ],
    [basicInfoContent, workInfoContent, emergencyInfoContent]
  );

  const infoCard = useMemo(
    () => ({
      avatar: (
        <User
          size={32}
          color={ct.primary.dark}
        />
      ),
      title: employee?.name,
      subtitle: employee?.employee_no || undefined,
      tags: [employee?.department_name || ''],
      stats: [
        {
          label: i18n.t('hrm.hrm_employee_detail_page.text_b652de'),
          value: employee?.position || '-',
        },
        {
          label: i18n.t('hrm.hrm_employee_detail_page.status'),
          value: getStatusConfig(employee?.status || '').label,
        },
      ],
    }),
    [employee]
  );

  return (
    <PageContainer
      title={t('hrm.hrm_employee_detail_page.detail_2')}
      subtitle={t('hrm.hrm_employee_detail_page.view')}
    >
      <DetailPageTemplate
        title=''
        subtitle=''
        detailItemName={
          employee?.name ||
          employee?.employee_no ||
          employee?.id ||
          t('hrm.hrm_employee_detail_page.k21')
        }
        backHref={HRM_PATHS.employees}
        loading={loading}
        error={errorMessage}
        onEdit={() => navigate(HRM_PATHS.employeeDetail.replace(':id', id!))}
        infoCard={infoCard}
        tabs={tabs}
        actions={[
          {
            label: t('hrm.hrm_employee_detail_page.text_94ddaa'),
            icon: <Briefcase style={{ width: 18, height: 18 }} />,
            onClick: () => setShowTransferDialog(true),
          },
        ]}
      />

      <Dialog
        open={showTransferDialog}
        onClose={() => setShowTransferDialog(false)}
        title={t('hrm.hrm_employee_detail_page.confirm')}
        maxWidth='sm'
        fullWidth
        cancelButton={{ label: t('hrm.hrm_employee_detail_page.cancel') }}
        confirmButton={{
          label: t('hrm.hrm_employee_detail_page.confirm'),
          onClick: handleTransfer,
        }}
      >
        <Typography variant='body1'>
          确定要为 <strong>{employee?.name}</strong> 办理调岗手续吗？
        </Typography>
        <Box sx={{ mt: 2 }}>
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {t('hrm.hrm_employee_detail_page.r1', { v1: employee?.position })}
          </Typography>
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {t('hrm.hrm_employee_detail_page.r2', { v1: employee?.department_name })}
          </Typography>
        </Box>
      </Dialog>
    </PageContainer>
  );
};

export default HrmEmployeeDetailPage;

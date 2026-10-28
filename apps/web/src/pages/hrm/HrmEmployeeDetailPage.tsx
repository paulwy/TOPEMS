import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS, CACHE_DURATIONS } from '@/lib/reactQuery';
import { Box, Typography, InputLabel, Avatar, useTheme } from '@mui/material';
import { User, Briefcase } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { hrmApi, type Employee } from '@/api/hrm';
import { HRM_PATHS } from '@/modules/hrm/config';
import { DetailPageTemplate, type TabConfig } from '@/components/templates';
import { StatusBadge } from '@topems/shared-components';
import { Dialog } from '@/components/common/Dialog';
import { PageContainer } from '@/components/common';

import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

const HrmEmployeeDetailPage: React.FC = () => {
  const theme = useTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [showTransferDialog, setShowTransferDialog] = useState(false);

  const employeeQuery = useQuery<Employee | null>({
    queryKey: QUERY_KEYS.HRM.EMPLOYEE(id || ''),
    enabled: !!id,
    queryFn: async () => {
      if (!id) {
        throw new Error(t('hrm.hrm_employee_detail_page.employee_id_empty'));
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

  const getStatusConfig = useCallback(
    (status: string) => {
      const config: Record<
        string,
        { color: 'success' | 'error' | 'default' | 'warning'; label: string }
      > = {
        active: { color: 'success', label: t('hrm.hrm_employee_detail_page.employed') },
        probation: { color: 'warning', label: t('hrm.hrm_employee_detail_page.probation_period') },
        leave: { color: 'default', label: t('hrm.hrm_employee_detail_page.leave') },
        resigned: { color: 'error', label: t('hrm.hrm_employee_detail_page.resigned_status') },
        terminated: { color: 'error', label: t('hrm.hrm_employee_detail_page.terminated') },
        retired: { color: 'default', label: t('hrm.hrm_employee_detail_page.retired') },
      };
      return config[status] || config.active;
    },
    [t]
  );

  const getGenderLabel = useCallback(
    (gender: string) => {
      return gender === 'male'
        ? t('hrm.hrm_employee_detail_page.male')
        : gender === 'female'
          ? t('hrm.hrm_employee_detail_page.female')
          : '-';
    },
    [t]
  );

  const getEducationLabel = useCallback(
    (education: string) => {
      const labels: Record<string, string> = {
        primary: t('hrm.hrm_employee_detail_page.primary_school'),
        junior: t('hrm.hrm_employee_detail_page.middle_school'),
        senior: t('hrm.hrm_employee_detail_page.high_school_technical'),
        college: t('hrm.hrm_employee_detail_page.associate_degree'),
        bachelor: t('hrm.hrm_employee_detail_page.bachelor_degree'),
        master: t('hrm.hrm_employee_detail_page.masters_degree'),
        doctor: t('hrm.hrm_employee_detail_page.doctorate'),
      };
      return labels[education] || education;
    },
    [t]
  );

  const formatDate = (date: string | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('zh-CN');
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
  }, [employee, t, getEducationLabel, getGenderLabel]);

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
          <Typography sx={{ mt: 0.5 }}>
            {t('hrm.hrm_contract_detail_page.m1', { v1: employee.probation_period || 3 })}
          </Typography>
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
              ? i18n.t('hrm.hrm_employee_detail_page.fulltime')
              : i18n.t('hrm.hrm_employee_detail_page.parttime')}
          </Typography>
        </Box>
      </Box>
    );
  }, [employee, t]);

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
    [basicInfoContent, workInfoContent, emergencyInfoContent, t]
  );

  const infoCard = useMemo(
    () => ({
      avatar: (
        <User
          size={32}
          color={theme.palette.primary.dark}
        />
      ),
      title: employee?.name,
      subtitle: employee?.employee_no || undefined,
      tags: [employee?.department_name || ''],
      stats: [
        {
          label: i18n.t('hrm.hrm_employee_detail_page.position_title'),
          value: employee?.position || '-',
        },
        {
          label: i18n.t('hrm.hrm_employee_detail_page.status'),
          value: getStatusConfig(employee?.status || '').label,
        },
      ],
    }),
    [employee, getStatusConfig]
  );

  return (
    <PageContainer
      title={t('hrm.hrm_employee_detail_page.detail_2')}
      subtitle={t('hrm.hrm_employee_detail_page.view')}
    >
      <DetailPageTemplate
        title=''
        emptyState={{ show: !loading && !employee }}
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
            label: t('hrm.hrm_employee_detail_page.transfer'),
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
          {t('hrm.hrm_employee_detail_page.e1', { v1: employee?.name })}
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

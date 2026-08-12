import React, { useMemo } from 'react';
import { Box, Card, CardContent, Typography, Chip } from '@mui/material';
import { HeartPulse, CalendarCheck, AlertCircle, ClipboardList } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { occupationalDiseaseSchema } from '@/schemas/ehs';
import { ehsApi } from '@/api/ehs';
import type {
  OccupationalDiseaseCase,
  CreateOccupationalDiseaseCaseRequest,
  UpdateOccupationalDiseaseCaseRequest,
} from '@/api/ehs';
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';

import { CACHE_DURATIONS, QUERY_KEYS } from '@/lib/reactQuery';

const ct = designTokens.colors;

const occupationalDiseaseCaseApi = {
  list: ehsApi.occupationalDiseases.listOccupationalDiseaseCases,
  create: ehsApi.occupationalDiseases.createOccupationalDiseaseCase,
  update: ehsApi.occupationalDiseases.updateOccupationalDiseaseCase,
  delete: ehsApi.occupationalDiseases.deleteOccupationalDiseaseCase,
};

const baseAdapter = createCrudPageAdapter<
  OccupationalDiseaseCase,
  CreateOccupationalDiseaseCaseRequest,
  UpdateOccupationalDiseaseCaseRequest
>(occupationalDiseaseCaseApi);

const occupationalDiseaseAdapter: CrudApiAdapter<OccupationalDiseaseCase> = {
  list: baseAdapter.list as unknown as CrudApiAdapter<OccupationalDiseaseCase>['list'],
  create: baseAdapter.create as unknown as CrudApiAdapter<OccupationalDiseaseCase>['create'],
  update: baseAdapter.update as unknown as CrudApiAdapter<OccupationalDiseaseCase>['update'],
  delete: baseAdapter.delete,
};

const statusColorMap: Record<string, { bg: string; color: string }> = {
  suspected: { bg: 'warning.lighter', color: 'warning.dark' },
  confirmed: { bg: 'error.lighter', color: 'error.dark' },
  recovered: { bg: 'success.lighter', color: 'success.dark' },
  chronic: { bg: 'info.lighter', color: 'info.dark' },
  deceased: { bg: 'grey.100', color: 'text.secondary' },
};

const statusLabelMap: Record<string, string> = {
  suspected: '疑似',
  confirmed: '确诊',
  recovered: '康复',
  chronic: '慢性',
  deceased: '死亡',
};

const severityColorMap: Record<string, { bg: string; color: string }> = {
  mild: { bg: 'success.lighter', color: 'success.dark' },
  moderate: { bg: 'warning.lighter', color: 'warning.dark' },
  severe: { bg: 'error.lighter', color: 'error.dark' },
  fatal: { bg: 'error.light', color: 'error.darker' },
};

const severityLabelMap: Record<string, string> = {
  mild: '轻度',
  moderate: '中度',
  severe: '重度',
  fatal: '极重度',
};

function extractListData(response: unknown): OccupationalDiseaseCase[] {
  if (!response || typeof response !== 'object') return [];
  const obj = response as Record<string, unknown>;
  const data = obj.data;
  if (!data) return [];
  if (Array.isArray(data)) return data as OccupationalDiseaseCase[];
  if (typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.items)) return d.items as OccupationalDiseaseCase[];
    if (Array.isArray(d.data)) return d.data as OccupationalDiseaseCase[];
  }
  return [];
}

const EhsOccupationalDiseasePage: React.FC = () => {
  const { data: casesResp } = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.EHS_OCCUPATIONALDISEASES_STATS_BASE,
    queryFn: async () =>
      ehsApi.occupationalDiseases.listOccupationalDiseaseCases({ pagesize: 500 }),
  
      staleTime: CACHE_DURATIONS.MEDIUM,});

  const stats = useMemo(() => {
    const cases = extractListData(casesResp);
    return {
      total: cases.length,
      thisMonth: cases.filter((c) => {
        if (!c.created_at) return false;
        const d = new Date(c.created_at);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length,
      suspected: cases.filter((c) => c.status === 'suspected').length,
      confirmed: cases.filter((c) => c.status === 'confirmed').length,
    };
  }, [casesResp]);

  const headerContent = () => (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      <Card sx={{ bgcolor: 'error.light' }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'error.lighter',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <HeartPulse sx={{ width: 20, height: 20, color: 'error.main' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                案例总数
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.total}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'primary.100',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CalendarCheck sx={{ width: 20, height: 20, color: 'primary.dark' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                本月新增
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.thisMonth}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'warning.100',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertCircle sx={{ width: 20, height: 20, color: ct.yellow[600] }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                疑似
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.suspected}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'error.lighter',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ClipboardList sx={{ width: 20, height: 20, color: 'error.dark' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                确诊
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.confirmed}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );

  const detailContent = (row: Record<string, unknown>) => {
    const caseRow = row as unknown as OccupationalDiseaseCase;
    const statusColors = statusColorMap[caseRow.status] || {
      bg: 'grey.100',
      color: 'text.secondary',
    };
    const statusLabel = statusLabelMap[caseRow.status] || caseRow.status;
    const severityColors = severityColorMap[caseRow.severity] || {
      bg: 'grey.100',
      color: 'text.secondary',
    };
    const severityLabel = severityLabelMap[caseRow.severity] || caseRow.severity;

    return (
      <Box
        sx={{
          pt: 2,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 2,
        }}
      >
        <Box>
          <Box
            component='span'
            sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
          >
            案例编号
          </Box>
          <Box sx={{ fontWeight: 500, fontFamily: 'monospace' }}>{caseRow.case_no || '-'}</Box>
        </Box>
        <Box>
          <Box
            component='span'
            sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
          >
            员工姓名
          </Box>
          <Box sx={{ fontWeight: 500 }}>{caseRow.employee_name}</Box>
        </Box>
        <Box>
          <Box
            component='span'
            sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
          >
            员工编号
          </Box>
          <Box>{caseRow.employee_id || '-'}</Box>
        </Box>
        <Box>
          <Box
            component='span'
            sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
          >
            部门
          </Box>
          <Box>{caseRow.department || '-'}</Box>
        </Box>
        <Box>
          <Box
            component='span'
            sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
          >
            危害因素
          </Box>
          <Box>{caseRow.hazard_factor || '-'}</Box>
        </Box>
        <Box>
          <Box
            component='span'
            sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
          >
            诊断日期
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CalendarCheck style={{ width: 16, height: 16 }} />
            {caseRow.diagnosis_date
              ? new Date(caseRow.diagnosis_date).toLocaleDateString('zh-CN')
              : '-'}
          </Box>
        </Box>
        <Box>
          <Box
            component='span'
            sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
          >
            职业病名称
          </Box>
          <Box>{caseRow.disease_name || '-'}</Box>
        </Box>
        <Box>
          <Box
            component='span'
            sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
          >
            疾病类型
          </Box>
          <Box>{caseRow.disease_type || '-'}</Box>
        </Box>
        <Box>
          <Box
            component='span'
            sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
          >
            诊断医院
          </Box>
          <Box>{caseRow.diagnosis_hospital || '-'}</Box>
        </Box>
        <Box>
          <Box
            component='span'
            sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
          >
            严重程度
          </Box>
          <Box sx={{ mt: 0.5 }}>
            <Chip
              label={severityLabel}
              size='small'
              sx={{
                backgroundColor: severityColors.bg,
                color: severityColors.color,
                fontWeight: 500,
              }}
            />
          </Box>
        </Box>
        <Box>
          <Box
            component='span'
            sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
          >
            状态
          </Box>
          <Box sx={{ mt: 0.5 }}>
            <Chip
              label={statusLabel}
              size='small'
              sx={{
                backgroundColor: statusColors.bg,
                color: statusColors.color,
                fontWeight: 500,
              }}
            />
          </Box>
        </Box>
        <Box sx={{ gridColumn: '1 / -1' }}>
          <Box
            component='span'
            sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
          >
            治疗方案
          </Box>
          <Box>{caseRow.treatment || '-'}</Box>
        </Box>
      </Box>
    );
  };

  return (
    <PageContainer
      headerProps={{
        pageIcon: <HeartPulse sx={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.error.main} 0%, ${ct.error[600]} 100%)`,
      }}
      maxWidth='xl'
    >
      <CrudPage
        schema={occupationalDiseaseSchema}
        apiAdapter={occupationalDiseaseAdapter}
        breadcrumbs={[{ label: 'EHS' }, { label: '职业病管理' }]}
        headerContent={headerContent}
        detailContent={detailContent}
        detailMaxWidth='md'
      />
    </PageContainer>
  );
};

export default EhsOccupationalDiseasePage;

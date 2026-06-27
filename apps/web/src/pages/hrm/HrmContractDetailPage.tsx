import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  InputLabel,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  FileText,
  Calendar,
  User,
  Building2,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { hrmApi, type Contract } from '@/api/hrm';
import { useNotification } from '@/hooks/useNotification';
import { apiLogger } from '@/utils/logger';
import { DetailPageTemplate, type TabConfig, type SectionConfig } from '@/components/templates';
import { PageContainer } from '@/components/common';

const HrmContractDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { success, error } = useNotification();

  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [showRenewDialog, setShowRenewDialog] = useState(false);

  useEffect(() => {
    loadContractDetail();
  }, [id]);

  const loadContractDetail = async () => {
    setLoading(true);
    setErrorMessage(undefined);
    try {
      if (!id) {
        throw new Error('合同ID为空');
      }

      const res = await hrmApi.contracts.get(id);

      if (!res.success || !res.data) {
        throw new Error('获取合同详情失败');
      }

      const contractData = res.data;
      const employeeRes = await hrmApi.employees.get(contractData.contract.employee_id);

      setContract({
        ...contractData.contract,
        employee_name: employeeRes.data?.name || contractData.contract.employee_name || '',
        employee_no: employeeRes.data?.employee_no || contractData.contract.employee_no || '',
        contract_name:
          contractData.contract.contract_name ||
          `${employeeRes.data?.name || contractData.contract.employee_name || ''}劳动合同`,
        department: employeeRes.data?.department_name || contractData.contract.department || '',
        position: employeeRes.data?.position || contractData.contract.position || '',
        probation_period: contractData.contract.probation_period || 0,
        probation_end_date: contractData.contract.probation_end_date || '',
        salary_type: contractData.contract.salary_type || '',
        base_salary: contractData.contract.base_salary || 0,
        currency: contractData.contract.currency || 'CNY',
        work_location: contractData.contract.work_location || '',
        contract_file: contractData.contract.contract_file || '',
        remark: contractData.contract.remark || '',
      });
    } catch (err: unknown) {
      apiLogger.error('加载合同详情失败:', err);
      setErrorMessage('加载合同详情失败');
      error('加载合同详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRenew = () => {
    navigate(`/hrm/contract/${id}`);
  };

  const getStatusConfig = (status: string) => {
    const config: Record<
      string,
      {
        color: 'success' | 'error' | 'default' | 'warning';
        label: string;
        icon: React.ReactElement;
      }
    > = {
      draft: { color: 'default', label: '草稿', icon: <FileText size={14} /> },
      pending: { color: 'warning', label: '待审批', icon: <Clock size={14} /> },
      approved: { color: 'success', label: '已审批', icon: <CheckCircle2 size={14} /> },
      active: { color: 'success', label: '生效中', icon: <CheckCircle2 size={14} /> },
      expired: { color: 'error', label: '已到期', icon: <AlertCircle size={14} /> },
      terminated: { color: 'error', label: '已终止', icon: <AlertCircle size={14} /> },
    };
    return config[status] || config.draft;
  };

  const getContractTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      labor: '劳动合同',
      probation: '试用期合同',
      project: '项目合同',
      outsourcing: '外包合同',
      internship: '实习协议',
      part_time: '兼职协议',
      other: '其他',
    };
    return labels[type] || type;
  };

  const getSalaryTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      monthly: '月薪',
      daily: '日薪',
      hourly: '时薪',
      project: '项目制',
      commission: '提成制',
      other: '其他',
    };
    return labels[type] || type;
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('zh-CN');
  };

  const formatCurrency = (amount: number | undefined) => {
    const value = amount || 0;
    return `${value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })} ${contract?.currency || 'CNY'}`;
  };

  const calculateDaysRemaining = () => {
    if (!contract?.end_date) return null;
    const endDate = new Date(contract.end_date);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const basicInfoContent = useMemo(() => {
    if (!contract) return null;
    const statusConfig = getStatusConfig(contract.status);
    const daysRemaining = calculateDaysRemaining();

    return (
      <Box>
        {daysRemaining !== null && (
          <Box
            sx={{
              mb: 3,
              p: 2,
              borderRadius: 1,
              bgcolor:
                daysRemaining < 30
                  ? 'error.light'
                  : daysRemaining < 90
                    ? 'warning.light'
                    : 'success.light',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            {daysRemaining < 30 ? (
              <AlertCircle sx={{ width: 20, height: 20, color: 'error.main' }} />
            ) : daysRemaining < 90 ? (
              <Clock sx={{ width: 20, height: 20, color: 'warning.main' }} />
            ) : (
              <CheckCircle2 sx={{ width: 20, height: 20, color: 'success.main' }} />
            )}
            <Typography
              variant='body1'
              sx={{ fontWeight: 'medium' }}
            >
              {daysRemaining < 0
                ? `合同已过期 ${Math.abs(daysRemaining)} 天`
                : daysRemaining === 0
                  ? '合同今日到期'
                  : daysRemaining < 30
                    ? `合同将在 ${daysRemaining} 天后到期，请及时处理续签`
                    : daysRemaining < 90
                      ? `合同将在 ${daysRemaining} 天后到期`
                      : `合同有效期剩余 ${daysRemaining} 天`}
            </Typography>
          </Box>
        )}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
            gap: 2,
            mb: 3,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <User sx={{ width: 48, height: 48, color: 'primary.main' }} />
            <Box>
              <Typography variant='h6'>{contract.employee_name || '-'}</Typography>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {contract.employee_no || ''} | {contract.department || ''} |{' '}
                {contract.position || ''}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end' }}>
            <Chip
              label={statusConfig.label}
              color={statusConfig.color}
              icon={statusConfig.icon}
              sx={{ fontSize: 14, padding: '4px 16px' }}
            />
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
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>合同编号</InputLabel>
            <Typography sx={{ mt: 0.5, fontFamily: 'monospace' }}>
              {contract.contract_no || '-'}
            </Typography>
          </Box>
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>合同类型</InputLabel>
            <Typography sx={{ mt: 0.5 }}>
              {getContractTypeLabel(contract.contract_type || '')}
            </Typography>
          </Box>
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>合同名称</InputLabel>
            <Typography sx={{ mt: 0.5 }}>{contract.contract_name || '-'}</Typography>
          </Box>
        </Box>
      </Box>
    );
  }, [contract]);

  const durationContent = useMemo(() => {
    if (!contract) return null;
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 2,
        }}
      >
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>合同开始日期</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{formatDate(contract.start_date)}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>合同结束日期</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{formatDate(contract.end_date)}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>试用期</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{contract.probation_period || 0} 个月</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>试用期结束日期</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{formatDate(contract.probation_end_date)}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>工作地点</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{contract.work_location || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>薪资类型</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{getSalaryTypeLabel(contract.salary_type || '')}</Typography>
        </Box>
      </Box>
    );
  }, [contract]);

  const salaryContent = useMemo(() => {
    if (!contract) return null;
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 2,
        }}
      >
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>基本工资</InputLabel>
          <Typography
            variant='h6'
            sx={{ mt: 0.5, color: 'primary.main' }}
          >
            {formatCurrency(contract.base_salary)}
          </Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>货币类型</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{contract.currency || 'CNY'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>备注</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{contract.remark || '-'}</Typography>
        </Box>
      </Box>
    );
  }, [contract]);

  const tabs = useMemo<TabConfig[]>(
    () => [
      { id: 'basic', label: '基本信息', content: basicInfoContent || <></> },
      { id: 'duration', label: '期限信息', content: durationContent || <></> },
      { id: 'salary', label: '薪资信息', content: salaryContent || <></> },
    ],
    [basicInfoContent, durationContent, salaryContent]
  );

  const infoCard = useMemo(
    () => ({
      avatar: (
        <FileText
          size={32}
          color='#1976d2'
        />
      ),
      title: contract?.contract_name,
      subtitle: contract?.contract_no || undefined,
      tags: [getContractTypeLabel(contract?.contract_type || '')],
      stats: [
        { label: '员工', value: contract?.employee_name || '-' },
        { label: '状态', value: getStatusConfig(contract?.status || '').label },
      ],
    }),
    [contract]
  );

  return (
    <PageContainer
      title='合同详情'
      subtitle='查看和管理员工合同信息'
    >
      <DetailPageTemplate
        title=''
        subtitle=''
        backHref='/hrm/contracts'
        loading={loading}
        error={errorMessage}
        onEdit={() => navigate(`/hrm/contract/${id}`)}
        infoCard={infoCard}
        tabs={tabs}
        actions={[
          {
            label: '续签',
            icon: <Calendar style={{ width: 18, height: 18 }} />,
            onClick: () => setShowRenewDialog(true),
          },
        ]}
      />

      <Dialog
        open={showRenewDialog}
        onClose={() => setShowRenewDialog(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>确认续签</DialogTitle>
        <DialogContent>
          <Typography variant='body1'>
            确定要为 <strong>{contract?.employee_name}</strong> 的合同进行续签吗？
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              当前合同：{contract?.contract_no}
            </Typography>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              到期日期：{formatDate(contract?.end_date)}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRenewDialog(false)}>取消</Button>
          <Button
            onClick={handleRenew}
            color='primary'
          >
            确认续签
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default HrmContractDetailPage;

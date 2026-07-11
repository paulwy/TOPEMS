import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  InputLabel,
  Avatar,
  Chip,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import {
  User,
  Building2,
  Calendar,
  Phone,
  Mail,
  MapPin,
  GraduationCap,
  Briefcase,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { hrmApi, type Employee } from '@/api/hrm';
import { useNotification } from '@/hooks/useNotification';
import { HRM_PATHS } from '@/modules/hrm/config';
import { apiLogger } from '@/utils/logger';
import { DetailPageTemplate, type TabConfig, type SectionConfig } from '@/components/templates';
import { StatusBadge } from '@topems/shared-components';
import { Dialog } from '@/components/common/Dialog';
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

const HrmEmployeeDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { success, error } = useNotification();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [showTransferDialog, setShowTransferDialog] = useState(false);

  useEffect(() => {
    loadEmployeeDetail();
  }, [id]);

  const loadEmployeeDetail = async () => {
    setLoading(true);
    setErrorMessage(undefined);
    try {
      if (!id) {
        throw new Error('员工ID为空');
      }

      const res = await hrmApi.employees.get(id);

      if (!res.success || !res.data) {
        throw new Error('获取员工详情失败');
      }

      setEmployee(res.data);
    } catch (err: unknown) {
      apiLogger.error('加载员工详情失败:', err);
      setErrorMessage('加载员工详情失败');
      error('加载员工详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = () => {
    navigate(HRM_PATHS.employeeDetail.replace(':id', id!));
  };

  const getStatusConfig = (status: string) => {
    const config: Record<
      string,
      { color: 'success' | 'error' | 'default' | 'warning'; label: string }
    > = {
      active: { color: 'success', label: '在职' },
      probation: { color: 'warning', label: '试用期' },
      leave: { color: 'default', label: '休假' },
      resigned: { color: 'error', label: '已离职' },
      terminated: { color: 'error', label: '已解雇' },
      retired: { color: 'default', label: '已退休' },
    };
    return config[status] || config.active;
  };

  const getGenderLabel = (gender: string) => {
    return gender === 'male' ? '男' : gender === 'female' ? '女' : '-';
  };

  const getEducationLabel = (education: string) => {
    const labels: Record<string, string> = {
      primary: '小学',
      junior: '初中',
      senior: '高中/中专',
      college: '大专',
      bachelor: '本科',
      master: '硕士',
      doctor: '博士',
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
    const statusConfig = getStatusConfig(employee.status);

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
                status={`${calculateWorkYears()}年工龄`}
                label={`${calculateWorkYears()}年工龄`}
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
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>员工编号</InputLabel>
            <Typography sx={{ mt: 0.5, fontFamily: 'monospace' }}>
              {employee.employee_no}
            </Typography>
          </Box>
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>身份证号</InputLabel>
            <Typography sx={{ mt: 0.5, fontFamily: 'monospace' }}>
              {employee.id_number
                ? `${employee.id_number.slice(0, 4)}****${employee.id_number.slice(-4)}`
                : '-'}
            </Typography>
          </Box>
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>出生日期</InputLabel>
            <Typography sx={{ mt: 0.5 }}>{formatDate(employee.birth_date)}</Typography>
          </Box>
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>联系电话</InputLabel>
            <Typography sx={{ mt: 0.5 }}>{employee.phone || '-'}</Typography>
          </Box>
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>邮箱</InputLabel>
            <Typography sx={{ mt: 0.5 }}>{employee.email || '-'}</Typography>
          </Box>
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>学历</InputLabel>
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
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>入职日期</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{formatDate(employee.hire_date)}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>转正日期</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{formatDate(employee.regular_date)}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>试用期</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{employee.probation_period || 3} 个月</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>所属部门</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{employee.department_name || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>职位</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{employee.position || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>岗位等级</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{employee.joblevel || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>工作地点</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{employee.work_location || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>汇报对象</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{employee.report_to_name || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>员工类型</InputLabel>
          <Typography sx={{ mt: 0.5 }}>
            {employee.employee_type === 'full_time' ? '全职' : '兼职'}
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
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>紧急联系人</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{employee.emergency_contact || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>紧急联系人电话</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{employee.emergency_phone || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>与员工关系</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{employee.emergency_relation || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>家庭地址</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{employee.address || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>户口所在地</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{employee.hukou_location || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>备注</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{employee.remark || '-'}</Typography>
        </Box>
      </Box>
    );
  }, [employee]);

  const tabs = useMemo<TabConfig[]>(
    () => [
      { id: 'basic', label: '基本信息', content: basicInfoContent || <></> },
      { id: 'work', label: '工作信息', content: workInfoContent || <></> },
      { id: 'emergency', label: '紧急联系人', content: emergencyInfoContent || <></> },
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
        { label: '职位', value: employee?.position || '-' },
        { label: '状态', value: getStatusConfig(employee?.status || '').label },
      ],
    }),
    [employee]
  );

  return (
    <PageContainer
      title='员工详情'
      subtitle='查看和管理员工信息'
    >
      <DetailPageTemplate
        title=''
        subtitle=''
        backHref={HRM_PATHS.employees}
        loading={loading}
        error={errorMessage}
        onEdit={() => navigate(HRM_PATHS.employeeDetail.replace(':id', id!))}
        infoCard={infoCard}
        tabs={tabs}
        actions={[
          {
            label: '调岗',
            icon: <Briefcase style={{ width: 18, height: 18 }} />,
            onClick: () => setShowTransferDialog(true),
          },
        ]}
      />

      <Dialog
        open={showTransferDialog}
        onClose={() => setShowTransferDialog(false)}
        title='确认调岗'
        maxWidth='sm'
        fullWidth
        cancelButton={{ label: '取消' }}
        confirmButton={{ label: '确认调岗', onClick: handleTransfer }}
      >
        <Typography variant='body1'>
          确定要为 <strong>{employee?.name}</strong> 办理调岗手续吗？
        </Typography>
        <Box sx={{ mt: 2 }}>
          <Typography
            variant='body2'
            color='text.secondary'
          >
            当前职位：{employee?.position}
          </Typography>
          <Typography
            variant='body2'
            color='text.secondary'
          >
            当前部门：{employee?.department_name}
          </Typography>
        </Box>
      </Dialog>
    </PageContainer>
  );
};

export default HrmEmployeeDetailPage;

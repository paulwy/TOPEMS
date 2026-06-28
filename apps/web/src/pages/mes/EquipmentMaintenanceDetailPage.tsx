import {
  Typography,
  Box,
  InputLabel,
  Chip,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Wrench, Clock, CheckCircle, DollarSign, Settings } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { DetailPageTemplate, type TabConfig } from '@/components/templates';
import { equipmentApi, mesEquipmentApi } from '@/api/mes';
import type { Equipment, MaintenanceRecord, InspectionRecord } from '@/api/mes';
import { apiLogger } from '@/utils/logger';
import { useAppStore } from '@/store';

const EquipmentMaintenanceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { addNotification } = useAppStore();

  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [inspectionRecords, setInspectionRecords] = useState<InspectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (id) {
      loadEquipmentMaintenance(id);
    }
  }, [id]);

  const loadEquipmentMaintenance = async (equipmentId: string) => {
    setLoading(true);
    setErrorMessage(undefined);
    try {
      const [equipmentRes, maintenanceRes, inspectionRes] = await Promise.all([
        equipmentApi.get(equipmentId),
        mesEquipmentApi.listMaintenances({ equipment_id: equipmentId }),
        mesEquipmentApi.listInspections({ equipment_id: equipmentId }),
      ]);

      if (equipmentRes.success && equipmentRes.data) {
        setEquipment(equipmentRes.data);
      } else {
        throw new Error(equipmentRes.message || '加载设备信息失败');
      }

      if (maintenanceRes.success && maintenanceRes.data) {
        setMaintenanceRecords(maintenanceRes.data.items || []);
      }

      if (inspectionRes.success && inspectionRes.data) {
        setInspectionRecords(inspectionRes.data.items || []);
      }
    } catch (err: unknown) {
      apiLogger.error('Failed to load equipment maintenance:', err);
      setErrorMessage('加载设备维护详情失败');
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载设备维护详情',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in_progress':
        return 'primary';
      case 'pending':
        return 'warning';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      completed: '已完成',
      in_progress: '进行中',
      pending: '待处理',
      cancelled: '已取消',
      scheduled: '已计划',
    };
    return statusMap[status] || status;
  };

  const getMaintenanceTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      repair: '维修',
      preventive: '预防性维护',
      corrective: '纠正性维护',
      inspection: '巡检',
      emergency: '紧急维修',
      overhaul: '大修',
    };
    return typeMap[type] || type;
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('zh-CN');
  };

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return '-';
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
    }).format(amount);
  };

  // 设备基本信息
  const basicInfoContent = useMemo(() => {
    if (!equipment) return null;
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 3,
        }}
      >
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>设备编号</InputLabel>
          <Typography sx={{ fontWeight: 'medium', mt: 0.5 }}>{equipment.code || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>设备名称</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{equipment.name || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>设备类型</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{equipment.type || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>型号</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{equipment.model || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>制造商</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{equipment.manufacturer || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>状态</InputLabel>
          <Box sx={{ mt: 0.5 }}>
            <Chip
              label={getStatusLabel(equipment.status)}
              color={getStatusColor(equipment.status) as any}
              size='small'
            />
          </Box>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>采购日期</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{formatDate(equipment.purchase_date)}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>存放位置</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{equipment.location || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>设备价值</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{formatCurrency(equipment.value)}</Typography>
        </Box>
      </Box>
    );
  }, [equipment]);

  // 维护记录内容
  const maintenanceContent = useMemo(() => {
    if (maintenanceRecords.length === 0) {
      return <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>暂无维护记录</Box>;
    }

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {maintenanceRecords.map((record) => (
          <Card
            key={record.id}
            variant='outlined'
          >
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  mb: 2,
                }}
              >
                <Box>
                  <Typography
                    variant='subtitle2'
                    sx={{ fontWeight: 600 }}
                  >
                    {getMaintenanceTypeLabel(record.maintenance_type)}
                  </Typography>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {formatDate(record.start_time)}
                    {record.end_time && ` ~ ${formatDate(record.end_time)}`}
                  </Typography>
                </Box>
                <Chip
                  label={getStatusLabel(record.status)}
                  color={getStatusColor(record.status) as any}
                  size='small'
                />
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
                  gap: 2,
                }}
              >
                <Box>
                  <InputLabel sx={{ fontSize: 11, color: 'text.secondary' }}>维护人员</InputLabel>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500 }}
                  >
                    {record.maintainer}
                  </Typography>
                </Box>
                <Box>
                  <InputLabel sx={{ fontSize: 11, color: 'text.secondary' }}>维护费用</InputLabel>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500, color: 'error.main' }}
                  >
                    {formatCurrency(record.cost)}
                  </Typography>
                </Box>
                <Box>
                  <InputLabel sx={{ fontSize: 11, color: 'text.secondary' }}>维修类型</InputLabel>
                  <Typography variant='body2'>{record.maintenance_type}</Typography>
                </Box>
                <Box>
                  <InputLabel sx={{ fontSize: 11, color: 'text.secondary' }}>结果</InputLabel>
                  <Typography variant='body2'>{record.result || '-'}</Typography>
                </Box>
              </Box>

              {record.description && (
                <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                  <InputLabel sx={{ fontSize: 11, color: 'text.secondary' }}>描述</InputLabel>
                  <Typography variant='body2'>{record.description}</Typography>
                </Box>
              )}

              {record.parts_replaced && record.parts_replaced.length > 0 && (
                <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                  <InputLabel sx={{ fontSize: 11, color: 'text.secondary', mb: 1 }}>
                    更换备件
                  </InputLabel>
                  <TableContainer>
                    <Table size='small'>
                      <TableHead>
                        <TableRow>
                          <TableCell>备件名称</TableCell>
                          <TableCell align='center'>数量</TableCell>
                          <TableCell align='right'>单价</TableCell>
                          <TableCell align='right'>小计</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {record.parts_replaced.map((part, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{part.part_name}</TableCell>
                            <TableCell align='center'>{part.quantity}</TableCell>
                            <TableCell align='right'>{formatCurrency(part.unit_price)}</TableCell>
                            <TableCell align='right'>
                              {formatCurrency(
                                part.unit_price ? part.unit_price * part.quantity : undefined
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {record.remarks && (
                <Box sx={{ mt: 2 }}>
                  <InputLabel sx={{ fontSize: 11, color: 'text.secondary' }}>备注</InputLabel>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {record.remarks}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  }, [maintenanceRecords]);

  // 巡检记录内容
  const inspectionContent = useMemo(() => {
    if (inspectionRecords.length === 0) {
      return <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>暂无巡检记录</Box>;
    }

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {inspectionRecords.map((record) => (
          <Card
            key={record.id}
            variant='outlined'
          >
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  mb: 2,
                }}
              >
                <Box>
                  <Typography
                    variant='subtitle2'
                    sx={{ fontWeight: 600 }}
                  >
                    巡检员: {record.inspector}
                  </Typography>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {formatDate(record.inspection_date)}
                    {record.location && ` - ${record.location}`}
                  </Typography>
                </Box>
                <Chip
                  label={record.status === 'normal' ? '正常' : '异常'}
                  color={record.status === 'normal' ? 'success' : 'error'}
                  size='small'
                />
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
                  gap: 2,
                }}
              >
                {record.temperature !== undefined && (
                  <Box>
                    <InputLabel sx={{ fontSize: 11, color: 'text.secondary' }}>
                      温度 (°C)
                    </InputLabel>
                    <Typography
                      variant='body2'
                      sx={{ fontWeight: 500 }}
                    >
                      {record.temperature}
                    </Typography>
                  </Box>
                )}
                {record.vibration !== undefined && (
                  <Box>
                    <InputLabel sx={{ fontSize: 11, color: 'text.secondary' }}>
                      振动 (mm/s)
                    </InputLabel>
                    <Typography
                      variant='body2'
                      sx={{ fontWeight: 500 }}
                    >
                      {record.vibration}
                    </Typography>
                  </Box>
                )}
                {record.noiselevel !== undefined && (
                  <Box>
                    <InputLabel sx={{ fontSize: 11, color: 'text.secondary' }}>
                      噪音 (dB)
                    </InputLabel>
                    <Typography
                      variant='body2'
                      sx={{ fontWeight: 500 }}
                    >
                      {record.noiselevel}
                    </Typography>
                  </Box>
                )}
              </Box>

              {record.items && record.items.length > 0 && (
                <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                  <InputLabel sx={{ fontSize: 11, color: 'text.secondary', mb: 1 }}>
                    巡检项
                  </InputLabel>
                  <TableContainer>
                    <Table size='small'>
                      <TableHead>
                        <TableRow>
                          <TableCell>项目</TableCell>
                          <TableCell align='center'>值</TableCell>
                          <TableCell align='center'>状态</TableCell>
                          <TableCell>备注</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {record.items.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{item.name}</TableCell>
                            <TableCell align='center'>{item.value}</TableCell>
                            <TableCell align='center'>
                              <Chip
                                label={item.status === 'normal' ? '正常' : '异常'}
                                color={item.status === 'normal' ? 'success' : 'error'}
                                size='small'
                              />
                            </TableCell>
                            <TableCell>{item.remark || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {record.abnormalities && (
                <Box sx={{ mt: 2 }}>
                  <InputLabel sx={{ fontSize: 11, color: 'text.secondary' }}>异常情况</InputLabel>
                  <Typography
                    variant='body2'
                    color='error.main'
                  >
                    {record.abnormalities}
                  </Typography>
                </Box>
              )}

              {record.remarks && (
                <Box sx={{ mt: 2 }}>
                  <InputLabel sx={{ fontSize: 11, color: 'text.secondary' }}>备注</InputLabel>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {record.remarks}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  }, [inspectionRecords]);

  // 费用统计
  const costStatisticsContent = useMemo(() => {
    const totalCost = maintenanceRecords.reduce((sum, r) => sum + (r.cost || 0), 0);
    const completedCount = maintenanceRecords.filter((r) => r.status === 'completed').length;
    const pendingCount = maintenanceRecords.filter((r) => r.status === 'pending').length;

    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 3,
        }}
      >
        <Card
          variant='outlined'
          sx={{ bgcolor: 'error.lighter' }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <DollarSign
                size={18}
                color='#b91c1c'
              />
              <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>总维护费用</InputLabel>
            </Box>
            <Typography
              variant='h5'
              sx={{ fontWeight: 700, color: 'error.dark' }}
            >
              {formatCurrency(totalCost)}
            </Typography>
          </CardContent>
        </Card>
        <Card
          variant='outlined'
          sx={{ bgcolor: 'primary.lighter' }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Settings
                size={18}
                color='#1976d2'
              />
              <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>维护次数</InputLabel>
            </Box>
            <Typography
              variant='h5'
              sx={{ fontWeight: 700 }}
            >
              {maintenanceRecords.length}
            </Typography>
          </CardContent>
        </Card>
        <Card
          variant='outlined'
          sx={{ bgcolor: 'success.lighter' }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <CheckCircle
                size={18}
                color='#15803d'
              />
              <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>已完成</InputLabel>
            </Box>
            <Typography
              variant='h5'
              sx={{ fontWeight: 700, color: 'success.dark' }}
            >
              {completedCount}
            </Typography>
          </CardContent>
        </Card>
        <Card
          variant='outlined'
          sx={{ bgcolor: 'warning.lighter' }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Clock
                size={18}
                color='#b45309'
              />
              <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>待处理</InputLabel>
            </Box>
            <Typography
              variant='h5'
              sx={{ fontWeight: 700, color: 'warning.dark' }}
            >
              {pendingCount}
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }, [maintenanceRecords]);

  const tabs = useMemo<TabConfig[]>(
    () => [
      { id: 'basic', label: '设备信息', content: basicInfoContent || <></> },
      { id: 'maintenance', label: '维护记录', content: maintenanceContent || <></> },
      { id: 'inspection', label: '巡检记录', content: inspectionContent || <></> },
      { id: 'cost', label: '费用统计', content: costStatisticsContent || <></> },
    ],
    [basicInfoContent, maintenanceContent, inspectionContent, costStatisticsContent]
  );

  const infoCard = useMemo(
    () => ({
      avatar: (
        <Wrench
          size={32}
          color='#1976d2'
        />
      ),
      title: equipment?.name,
      subtitle: equipment?.code || undefined,
      tags: [getStatusLabel(equipment?.status || '')],
      stats: [
        { label: '设备类型', value: equipment?.type || '-' },
        { label: '位置', value: equipment?.location || '-' },
      ],
    }),
    [equipment]
  );

  return (
    <PageContainer
      title='设备维护详情'
      subtitle='查看和管理设备维护信息'
    >
      <DetailPageTemplate
        title=''
        subtitle=''
        backHref='/mes/equipment'
        loading={loading}
        error={errorMessage}
        infoCard={infoCard}
        tabs={tabs}
      />
    </PageContainer>
  );
};

export default EquipmentMaintenanceDetailPage;

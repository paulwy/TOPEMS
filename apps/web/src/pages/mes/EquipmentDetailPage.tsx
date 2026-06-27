import { Typography, Box, InputLabel, Chip } from '@mui/material';
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Wrench, MapPin, Calendar, User, FileText } from 'lucide-react';
import { assetApi, type Asset } from '@/api/erp';
import { useNotification } from '@/hooks/useNotification';
import { apiLogger } from '@/utils/logger';
import { DetailPageTemplate, type TabConfig, type SectionConfig } from '@/components/templates';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { PageContainer } from '@/components/common';

const EquipmentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error } = useNotification();

  const [equipment, setEquipment] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (id) {
      loadEquipment(id);
    }
  }, [id]);

  const loadEquipment = async (equipmentId: string) => {
    setLoading(true);
    setErrorMessage(undefined);
    try {
      const res = await assetApi.get(equipmentId);
      if (res.code === 200 && res.data) {
        setEquipment(res.data);
      } else {
        throw new Error(res.message || '加载设备信息失败');
      }
    } catch (err: unknown) {
      apiLogger.error('Failed to load equipment:', err);
      setErrorMessage('加载设备信息失败');
      error('加载设备信息失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      const res = await assetApi.delete(id);
      if (res.code === 200) {
        success('设备删除成功');
        navigate('/equipment');
      } else {
        error(res.message || '删除失败');
      }
    } catch (err: unknown) {
      apiLogger.error('Failed to delete equipment:', err);
      error('删除设备失败');
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'idle':
        return 'default';
      case 'in_use':
        return 'info';
      case 'maintenance':
        return 'warning';
      case 'scrapped':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'idle':
        return '闲置';
      case 'in_use':
        return '使用中';
      case 'maintenance':
        return '维护中';
      case 'scrapped':
        return '已报废';
      default:
        return status;
    }
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('zh-CN');
  };

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
    }).format(amount);
  };

  const basicInfoContent = useMemo(() => {
    if (!equipment) return null;
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 2,
        }}
      >
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>设备编号</InputLabel>
          <Typography sx={{ fontWeight: 'medium', mt: 0.5 }}>{equipment.asset_number || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>设备名称</InputLabel>
          <Typography sx={{ fontWeight: 'medium', mt: 0.5 }}>{equipment.name || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>设备类别</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{equipment.category || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>品牌</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{equipment.brand || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>型号</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{equipment.model || '-'}</Typography>
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
      </Box>
    );
  }, [equipment]);

  const specsContent = useMemo(() => {
    if (!equipment) return null;
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 2,
        }}
      >
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>序列号</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{equipment.serial_number || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>制造商</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{equipment.manufacturer || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>额定功率</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{equipment.rated_power ? `${equipment.rated_power} kW` : '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>额定电压</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{equipment.rated_voltage ? `${equipment.rated_voltage} V` : '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>采购金额</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{formatCurrency(equipment.purchase_amount)}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>存放位置</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{equipment.location || '-'}</Typography>
        </Box>
      </Box>
    );
  }, [equipment]);

  const purchaseInfoContent = useMemo(() => {
    if (!equipment) return null;
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 2,
        }}
      >
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>采购日期</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{formatDate(equipment.purchase_date)}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>采购金额</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{formatCurrency(equipment.purchase_amount)}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>负责人</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{equipment.responsible_id || '-'}</Typography>
        </Box>
      </Box>
    );
  }, [equipment]);

  const footerSection = useMemo<SectionConfig>(() => {
    if (!equipment) return { id: 'footer', content: null };
    return {
      id: 'footer',
      title: '其他信息',
      content: (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: 2,
          }}
        >
          <Box sx={{ bgcolor: 'grey.100', borderRadius: 2, p: 2 }}>
            <Typography variant='body2' color='text.secondary'>创建时间</Typography>
            <Typography sx={{ fontWeight: 'medium', mt: 0.5 }}>{formatDate(equipment.created_at)}</Typography>
          </Box>
          <Box sx={{ bgcolor: 'grey.100', borderRadius: 2, p: 2 }}>
            <Typography variant='body2' color='text.secondary'>更新时间</Typography>
            <Typography sx={{ fontWeight: 'medium', mt: 0.5 }}>{formatDate(equipment.updated_at)}</Typography>
          </Box>
          <Box sx={{ bgcolor: 'grey.100', borderRadius: 2, p: 2 }}>
            <Typography variant='body2' color='text.secondary'>设备ID</Typography>
            <Typography sx={{ fontWeight: 'medium', mt: 0.5, fontFamily: 'monospace', fontSize: '0.875rem' }}>
              {equipment.id.substring(0, 8)}...
            </Typography>
          </Box>
        </Box>
      ),
    };
  }, [equipment]);

  const tabs = useMemo<TabConfig[]>(
    () => [
      { id: 'basic', label: '基本信息', content: basicInfoContent || <></> },
      { id: 'specs', label: '规格信息', content: specsContent || <></> },
      { id: 'purchase', label: '采购信息', content: purchaseInfoContent || <></> },
    ],
    [basicInfoContent, specsContent, purchaseInfoContent]
  );

  const infoCard = useMemo(
    () => ({
      avatar: <Wrench size={32} color='#1976d2' />,
      title: equipment?.name,
      subtitle: equipment?.asset_number || undefined,
      tags: [equipment?.category || ''],
      stats: [
        { label: '设备类别', value: equipment?.category || '-' },
        { label: '状态', value: getStatusLabel(equipment?.status || '') },
      ],
    }),
    [equipment]
  );

  return (
    <PageContainer title='设备详情' subtitle='查看和管理设备信息'>
      <DetailPageTemplate
        title=''
        subtitle=''
        backHref='/equipment'
        loading={loading}
        error={errorMessage}
        onEdit={() => navigate(`/equipment/${id}`)}
        onDelete={() => setDeleteDialogOpen(true)}
        infoCard={infoCard}
        tabs={tabs}
        sections={[footerSection]}
      />
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title='确认删除'
        message='确定要删除此设备吗？'
        danger
      />
    </PageContainer>
  );
};

export default EquipmentDetailPage;
import { useState, useMemo } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  InputLabel,
  TextField,
  FormControl,
  Select,
  MenuItem,
  Typography,
} from '@mui/material';
import { PageContainer } from '@/components/common';
import CrudPage from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { equipmentSchema } from '@/schemas/mes';
import { mesApi } from '@/api/mes';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Wrench, Power, Monitor, AlertTriangle } from 'lucide-react';
import { designTokens } from '@/theme/tokens';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import type { Equipment, MaintenanceEquipmentRequest } from '@/api/mes';


import { QUERY_KEYS } from '@/lib/reactQuery';

const ct= designTokens.colors;
const apiAdapter = createCrudPageAdapter(mesApi.equipment);

export default function EquipmentManagementPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();

  const [showMaintenanceDialog, setShowMaintenanceDialog] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [maintenanceData, setMaintenanceData] = useState<MaintenanceEquipmentRequest>({
    maintenance_type: 'routine',
    description: '',
    maintainer: '',
    start_time: '',
  });

  const statisticsQuery = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.MES_EQUIPMENT_STATISTICS_BASE,
    queryFn: async () => {
      const response = await mesApi.equipment.getStatistics();
      if (!response.success || !response.data) {
        throw new Error(response.message || t('mes.equipment_management_page.fail'));
      }
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const statistics = statisticsQuery.data ?? null;

  const maintenanceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: MaintenanceEquipmentRequest }) => {
      const response = await mesApi.equipment.maintenance(id, data);
      if (!response.success) {
        throw new Error(response.message || t('mes.equipment_management_page.create_4'));
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.MES_EQUIPMENT_BASE ,
  exact: false,
  refetchType: 'active',
});
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.MES_EQUIPMENT_STATISTICS_BASE ,
  exact: false,
  refetchType: 'active',
});
      addNotification({
        type: 'success',
        title: t('mes.equipment_management_page.success'),
        message: t('mes.equipment_management_page.create_5'),
      });
    },
    onError: (error: unknown) => {
      apiLogger.error(t('mes.equipment_management_page.create_6'), error);
      addNotification({
        type: 'error',
        title: t('mes.equipment_management_page.operation_failed'),
        message: t('mes.equipment_management_page.create_4'),
      });
    },
  });

  const handleMaintenanceSubmit = async () => {
    if (!selectedEquipment) return;
    try {
      await maintenanceMutation.mutateAsync({
        id: selectedEquipment.id,
        data: maintenanceData,
      });
      setShowMaintenanceDialog(false);
      resetMaintenanceForm();
    } catch (e) { console.error("[MES] Failed to submit equipment maintenance update", e); }
  };

  const resetMaintenanceForm = () => {
    setMaintenanceData({
      maintenance_type: 'routine',
      description: '',
      maintainer: '',
      start_time: '',
    });
  };

  const handleOpenMaintenance = (row: Equipment) => {
    setSelectedEquipment(row);
    setMaintenanceData({
      maintenance_type: 'routine',
      description: '',
      maintainer: '',
      start_time: new Date().toISOString().slice(0, 16),
    });
    setShowMaintenanceDialog(true);
  };

  const statsContent = useMemo(() => {
    return (rows: Equipment[]) => (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Power
              size={18}
              sx={{ color: 'success.700' }}
            />
            <Typography
              variant='body2'
              sx={{ color: 'text.secondary' }}
            >
              运行中
            </Typography>
          </Box>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700, color: 'success.700' }}
          >
            {statistics?.in_use || rows.filter((e) => e.status === 'running').length}
          </Typography>
        </Box>
        <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Monitor
              size={18}
              sx={{ color: 'text.secondary' }}
            />
            <Typography
              variant='body2'
              sx={{ color: 'text.secondary' }}
            >
              空闲
            </Typography>
          </Box>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700 }}
          >
            {statistics?.idle || rows.filter((e) => e.status === 'idle').length}
          </Typography>
        </Box>
        <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Wrench
              size={18}
              sx={{ color: 'warning.700' }}
            />
            <Typography
              variant='body2'
              sx={{ color: 'text.secondary' }}
            >
              维护中
            </Typography>
          </Box>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700, color: 'warning.700' }}
          >
            {statistics?.maintenance || rows.filter((e) => e.status === 'maintenance').length}
          </Typography>
        </Box>
        <Box sx={{ p: 2, bgcolor: 'error.lighter', borderRadius: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <AlertTriangle
              size={18}
              sx={{ color: 'error.dark' }}
            />
            <Typography
              variant='body2'
              sx={{ color: 'text.secondary' }}
            >
              故障
            </Typography>
          </Box>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700, color: 'error.dark' }}
          >
            {rows.filter((e) => e.status === 'fault').length}
          </Typography>
        </Box>
      </Box>
    );
  }, [statistics]);

  const customRowActions = useMemo(
    () => [
      {
        label: t('mes.equipment_management_page.equipment_1'),
        icon: <Wrench size={16} />,
        onClick: (row: Equipment) => handleOpenMaintenance(row),
      },
    ],
    [t]
  );

  return (
    <PageContainer
      title={t('mes.equipment_management_page.breadcrumb_current')}
      subtitle={t('mes.equipment_management_page.name')}
      headerProps={{
        pageIcon: <Wrench style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.warning.main} 0%, ${ct.warning.dark} 100%)`,
      }}
    >
      <CrudPage
        schema={equipmentSchema}
        apiAdapter={apiAdapter}
        breadcrumbs={[{ label: 'MES' }, { label: '设备管理' }]}
        headerContent={statsContent}
        customRowActions={customRowActions as unknown as RowAction<Record<string, unknown>>[]}
      />

      <Dialog
        open={showMaintenanceDialog}
        onClose={() => setShowMaintenanceDialog(false)}
        maxWidth='sm'
      >
        <DialogTitle>设备维护</DialogTitle>
        <DialogContent>
          <Box
            component='span'
            sx={{
              display: 'block',
              color: 'text.secondary',
              mb: 2,
              fontSize: 14,
            }}
          >
            {selectedEquipment?.name} - 创建设备维护记录
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <InputLabel htmlFor='maintenance_type'>维护类型 *</InputLabel>
              <FormControl
                fullWidth
                size='small'
              >
                <Select
                  id='maintenance_type'
                  value={maintenanceData.maintenance_type}
                  onChange={(e) =>
                    setMaintenanceData({
                      ...maintenanceData,
                      maintenance_type: e.target.value,
                    })
                  }
                >
                  <MenuItem value='routine'>例行维护</MenuItem>
                  <MenuItem value='repair'>故障维修</MenuItem>
                  <MenuItem value='preventive'>预防性维护</MenuItem>
                  <MenuItem value='inspection'>检查保养</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <InputLabel htmlFor='maintainer'>维护人员 *</InputLabel>
              <TextField
                id='maintainer'
                required
                size='small'
                value={maintenanceData.maintainer}
                onChange={(e) =>
                  setMaintenanceData({ ...maintenanceData, maintainer: e.target.value })
                }
              />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <InputLabel htmlFor='start_time'>开始时间 *</InputLabel>
              <TextField
                id='start_time'
                type='datetime-local'
                required
                size='small'
                value={maintenanceData.start_time}
                onChange={(e) =>
                  setMaintenanceData({ ...maintenanceData, start_time: e.target.value })
                }
              />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <InputLabel htmlFor='end_time'>结束时间</InputLabel>
              <TextField
                id='end_time'
                type='datetime-local'
                size='small'
                value={maintenanceData.end_time || ''}
                onChange={(e) =>
                  setMaintenanceData({ ...maintenanceData, end_time: e.target.value })
                }
              />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <InputLabel htmlFor='cost'>费用</InputLabel>
              <TextField
                id='cost'
                type='number'
                size='small'
                value={maintenanceData.cost || ''}
                onChange={(e) =>
                  setMaintenanceData({
                    ...maintenanceData,
                    cost: parseFloat(e.target.value),
                  })
                }
              />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <InputLabel htmlFor='description'>维护描述 *</InputLabel>
              <TextField
                id='description'
                required
                size='small'
                multiline
                rows={3}
                value={maintenanceData.description}
                onChange={(e) =>
                  setMaintenanceData({ ...maintenanceData, description: e.target.value })
                }
              />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <InputLabel htmlFor='result'>维护结果</InputLabel>
              <TextField
                id='result'
                size='small'
                value={maintenanceData.result || ''}
                onChange={(e) => setMaintenanceData({ ...maintenanceData, result: e.target.value })}
              />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <InputLabel htmlFor='remarks'>备注</InputLabel>
              <TextField
                id='remarks'
                size='small'
                multiline
                rows={2}
                value={maintenanceData.remarks || ''}
                onChange={(e) =>
                  setMaintenanceData({ ...maintenanceData, remarks: e.target.value })
                }
              />
            </Box>
          </Box>
          <DialogActions>
            <Button
              type='button'
              variant='outlined'
              onClick={() => setShowMaintenanceDialog(false)}
            >
              取消
            </Button>
            <Button
              type='submit'
              variant='contained'
              disabled={maintenanceMutation.isPending}
              onClick={handleMaintenanceSubmit}
            >
              创建维护
            </Button>
          </DialogActions>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  FormControlLabel,
  Switch,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
} from '@mui/material';
import { QrCode, Barcode, Package, Search, Settings, CheckCircle, Smartphone } from 'lucide-react';

interface ScanType {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  icon: React.ReactNode;
}

interface ScanHistory {
  id: string;
  barcode: string;
  itemType: string;
  itemName: string;
  scannedAt: string;
  operator: string;
  status: 'success' | 'warning' | 'error';
}

export const ScanSettingsPage: React.FC = () => {
  const [scanTypes, setScanTypes] = useState<ScanType[]>([
    {
      id: 'qr',
      name: '二维码',
      description: '支持 QR Code 格式',
      enabled: true,
      icon: <QrCode size={24} />,
    },
    {
      id: 'barcode',
      name: '条形码',
      description: '支持 Code128、EAN、UPC 等格式',
      enabled: true,
      icon: <Barcode size={24} />,
    },
    {
      id: 'data-matrix',
      name: 'Data Matrix',
      description: '支持 Data Matrix 二维条码',
      enabled: false,
      icon: <Package size={24} />,
    },
  ]);

  const [scanMode, setScanMode] = useState('single');
  const [autoFocus, setAutoFocus] = useState(true);
  const [vibration, setVibration] = useState(true);
  const [sound, setSound] = useState(true);

  const scanHistory: ScanHistory[] = [
    {
      id: '1',
      barcode: 'QR-2024-001234',
      itemType: '原材料',
      itemName: '聚乙烯颗粒 A级',
      scannedAt: '2024-01-15 10:30:00',
      operator: '张三',
      status: 'success',
    },
    {
      id: '2',
      barcode: 'BC-2024-005678',
      itemType: '半成品',
      itemName: '塑料板材 1mm',
      scannedAt: '2024-01-15 10:28:00',
      operator: '李四',
      status: 'success',
    },
    {
      id: '3',
      barcode: 'QR-2024-009999',
      itemType: '设备',
      itemName: '注塑机 #003',
      scannedAt: '2024-01-15 10:25:00',
      operator: '王五',
      status: 'warning',
    },
  ];

  const toggleScanType = (id: string) => {
    setScanTypes((prev) =>
      prev.map((type) => (type.id === id ? { ...type, enabled: !type.enabled } : type))
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ flex: 1 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 4,
        }}
      >
        <div>
          <Typography
            variant='h4'
            sx={{ fontWeight: 'bold', mb: 1 }}
          >
            扫码功能配置
          </Typography>
          <Typography
            variant='body2'
            color='text.secondary'
          >
            配置扫码识别格式、扫描模式和反馈设置
          </Typography>
        </div>
        <Button
          variant='contained'
          startIcon={<QrCode />}
        >
          测试扫描
        </Button>
      </Box>

      <Grid
        container
        spacing={3}
      >
        <Grid
          item
          xs={12}
          lg={4}
        >
          <Card>
            <CardHeader title='支持的码制' />
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {scanTypes.map((type) => (
                  <Box
                    key={type.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 2,
                      borderRadius: 1,
                      backgroundColor: type.enabled ? 'primary.50' : 'grey.50',
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                      }}
                    >
                      {type.icon}
                      <div>
                        <Typography
                          variant='body1'
                          sx={{ fontWeight: 500 }}
                        >
                          {type.name}
                        </Typography>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          {type.description}
                        </Typography>
                      </div>
                    </Box>
                    <Switch
                      checked={type.enabled}
                      onChange={() => toggleScanType(type.id)}
                    />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ mt: 3 }}>
            <CardHeader title='扫描设置' />
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <FormControl fullWidth>
                  <InputLabel>扫描模式</InputLabel>
                  <Select
                    value={scanMode}
                    label='扫描模式'
                    onChange={(e) => setScanMode(e.target.value)}
                  >
                    <MenuItem value='single'>单次扫描</MenuItem>
                    <MenuItem value='continuous'>连续扫描</MenuItem>
                    <MenuItem value='batch'>批量扫描</MenuItem>
                  </Select>
                </FormControl>
                <FormControlLabel
                  control={
                    <Switch
                      checked={autoFocus}
                      onChange={(e) => setAutoFocus(e.target.checked)}
                    />
                  }
                  label='自动对焦'
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={vibration}
                      onChange={(e) => setVibration(e.target.checked)}
                    />
                  }
                  label='扫描震动反馈'
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={sound}
                      onChange={(e) => setSound(e.target.checked)}
                    />
                  }
                  label='扫描提示音'
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid
          item
          xs={12}
          lg={8}
        >
          <Card>
            <CardHeader
              title='扫描历史'
              subheader='最近的扫码记录'
            />
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {scanHistory.map((record) => (
                  <Box
                    key={record.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 3,
                      borderRadius: 1,
                      backgroundColor: 'grey.50',
                      borderLeft: `3px solid ${getStatusColor(record.status)}`,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                      }}
                    >
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 1,
                          backgroundColor: 'primary.light',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <QrCode size={24} />
                      </Box>
                      <div>
                        <Typography
                          variant='body1'
                          sx={{ fontWeight: 600 }}
                        >
                          {record.barcode}
                        </Typography>
                        <Typography
                          variant='body2'
                          color='text.secondary'
                        >
                          {record.itemType} - {record.itemName}
                        </Typography>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          {record.scannedAt} | {record.operator}
                        </Typography>
                      </div>
                    </Box>
                    <Chip
                      size='small'
                      label={
                        record.status === 'success'
                          ? '识别成功'
                          : record.status === 'warning'
                            ? '需确认'
                            : '识别失败'
                      }
                      color={getStatusColor(record.status)}
                      icon={record.status === 'success' ? <CheckCircle size={14} /> : null}
                    />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ mt: 3 }}>
            <CardHeader title='扫码关联配置' />
            <CardContent>
              <Typography
                variant='body2'
                color='text.secondary'
                mb={2}
              >
                扫码后自动关联的业务模块
              </Typography>
              <Grid
                container
                spacing={2}
              >
                {[
                  { name: '仓储管理', code: 'wms', enabled: true },
                  { name: '生产管理', code: 'mes', enabled: true },
                  { name: '质量管理', code: 'qms', enabled: false },
                  { name: '设备管理', code: 'equipment', enabled: true },
                ].map((item) => (
                  <Grid
                    item
                    xs={6}
                    key={item.code}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 2,
                        borderRadius: 1,
                        backgroundColor: item.enabled ? 'success.50' : 'grey.50',
                      }}
                    >
                      <Typography variant='body1'>{item.name}</Typography>
                      <Chip
                        size='small'
                        label={item.enabled ? '已关联' : '未关联'}
                        color={item.enabled ? 'success' : 'default'}
                      />
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ScanSettingsPage;

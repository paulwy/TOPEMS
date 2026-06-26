import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton,
  useTheme,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  Paper,
} from '@mui/material';
import {
  Home,
  ListTodo,
  ScanLine,
  CheckSquare,
  User,
  Flashlight,
  Image,
  History,
  X,
  Search,
  Barcode,
  QrCode,
  Package,
  ArrowRight,
  Clock,
  Trash2,
  Copy,
  Settings,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MobileLayout } from '@/components/mobile';
import { MobileCard } from '@/components/mobile';
import { MobileButton } from '@/components/mobile';
import { useAppStore } from '@/store';

interface ScanHistoryItem {
  id: string;
  content: string;
  type: 'barcode' | 'qrcode';
  format: string;
  time: string;
  relatedData?: {
    type: string;
    name: string;
    code: string;
  };
}

const MobileScanPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { addNotification } = useAppStore();
  const [activeTab, setActiveTab] = useState(0);
  const [flashOn, setFlashOn] = useState(false);
  const [scanning, setScanning] = useState(true);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [manualInput, setManualInput] = useState('');

  const tabs = ['扫码', '历史记录', '手动输入'];

  useEffect(() => {
    const history: ScanHistoryItem[] = [
      {
        id: '1',
        content: 'PROD-2024-001234',
        type: 'barcode',
        format: 'Code 128',
        time: '10:30',
        relatedData: {
          type: '产品',
          name: '智能传感器模块',
          code: 'PROD-2024-001234',
        },
      },
      {
        id: '2',
        content: 'INV-A3-005678',
        type: 'qrcode',
        format: 'QR Code',
        time: '09:45',
        relatedData: {
          type: '库位',
          name: 'A3-05-02',
          code: 'INV-A3-005678',
        },
      },
      {
        id: '3',
        content: 'PO-2024-06-0891',
        type: 'barcode',
        format: 'EAN-13',
        time: '昨天 16:20',
        relatedData: {
          type: '采购单',
          name: '电子元件采购',
          code: 'PO-2024-06-0891',
        },
      },
      {
        id: '4',
        content: 'EMP-10086',
        type: 'qrcode',
        format: 'QR Code',
        time: '昨天 14:15',
        relatedData: {
          type: '员工工牌',
          name: '张明',
          code: 'EMP-10086',
        },
      },
      {
        id: '5',
        content: 'EQ-2024-0042',
        type: 'barcode',
        format: 'Code 39',
        time: '前天 10:00',
        relatedData: {
          type: '设备',
          name: 'CNC加工中心 #3',
          code: 'EQ-2024-0042',
        },
      },
    ];
    setScanHistory(history);
  }, []);

  const simulateScan = useCallback(() => {
    if (!scanning) return;

    const mockResults = [
      { content: 'PROD-2024-009999', format: 'Code 128', type: 'barcode' as const },
      { content: 'https://topems.com/item/12345', format: 'QR Code', type: 'qrcode' as const },
      { content: 'INV-B2-001234', format: 'QR Code', type: 'qrcode' as const },
    ];

    const randomResult = mockResults[Math.floor(Math.random() * mockResults.length)];

    setTimeout(() => {
      if (scanning) {
        setScanResult(randomResult.content);
        setScanning(false);

        const newHistoryItem: ScanHistoryItem = {
          id: Date.now().toString(),
          content: randomResult.content,
          type: randomResult.type,
          format: randomResult.format,
          time: '刚刚',
          relatedData: {
            type: '物料',
            name: '电阻 10kΩ',
            code: randomResult.content,
          },
        };

        setScanHistory((prev) => [newHistoryItem, ...prev]);
        addNotification({
          title: '扫描成功',
          message: randomResult.content,
          type: 'success',
        });
      }
    }, 2000);
  }, [scanning, addNotification]);

  useEffect(() => {
    if (activeTab === 0 && scanning && !scanResult) {
      const timer = setTimeout(() => {
        simulateScan();
      }, 2000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [activeTab, scanning, scanResult, simulateScan]);

  const handleRescan = () => {
    setScanResult(null);
    setScanning(true);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    if (newValue === 0) {
      setScanResult(null);
      setScanning(true);
    }
  };

  const handleBottomTabChange = (tabId: string) => {
    switch (tabId) {
      case 'home':
        navigate('/mobile/home');
        break;
      case 'tasks':
        navigate('/mobile/tasks');
        break;
      case 'scan':
        break;
      case 'approval':
        navigate('/mobile/approvals');
        break;
      case 'profile':
        navigate('/mobile/settings');
        break;
    }
  };

  const handleManualSubmit = () => {
    if (!manualInput.trim()) return;

    setScanResult(manualInput);
    const newHistoryItem: ScanHistoryItem = {
      id: Date.now().toString(),
      content: manualInput,
      type: 'barcode',
      format: '手动输入',
      time: '刚刚',
    };
    setScanHistory((prev) => [newHistoryItem, ...prev]);
    setActiveTab(0);
    addNotification({
      title: '输入成功',
      message: manualInput,
      type: 'success',
    });
  };

  const handleCopyResult = () => {
    if (scanResult) {
      navigator.clipboard.writeText(scanResult);
      addNotification({
        title: '已复制',
        message: '内容已复制到剪贴板',
        type: 'info',
      });
    }
  };

  const handleClearHistory = () => {
    setScanHistory([]);
    addNotification({
      title: '已清除',
      message: '扫描历史已清空',
      type: 'info',
    });
  };

  const filteredHistory = scanHistory.filter((item) =>
    item.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const bottomTabs = [
    { id: 'home', label: '首页', icon: <Home style={{ width: 22, height: 22 }} /> },
    { id: 'tasks', label: '任务', icon: <ListTodo style={{ width: 22, height: 22 }} /> },
    { id: 'scan', label: '扫码', icon: <ScanLine style={{ width: 22, height: 22 }} /> },
    { id: 'approval', label: '审批', icon: <CheckSquare style={{ width: 22, height: 22 }} />, badge: 3 },
    { id: 'profile', label: '我的', icon: <User style={{ width: 22, height: 22 }} /> },
  ];

  return (
    <MobileLayout
      title='扫码'
      showBack={false}
      showMenu={false}
      showTabBar
      tabs={bottomTabs}
      activeTab='scan'
      onTabChange={handleBottomTabChange}
      rightActions={
        <IconButton
          size='large'
          onClick={() => navigate('/mobile/scan')}
          sx={{ minWidth: 44, minHeight: 44 }}
        >
          <Settings size={20} />
        </IconButton>
      }
    >
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        variant='fullWidth'
        sx={{
          '& .MuiTab-root': {
            minHeight: 44,
            fontSize: '0.875rem',
          },
        }}
      >
        {tabs.map((tab, index) => (
          <Tab key={index} label={tab} />
        ))}
      </Tabs>

      {activeTab === 0 && (
        <Box sx={{ p: 2 }}>
          <Paper
            elevation={0}
            sx={{
              position: 'relative',
              width: '100%',
              aspectRatio: '4/3',
              borderRadius: 2,
              overflow: 'hidden',
              mb: 3,
              backgroundColor: '#000',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Box
                sx={{
                  position: 'relative',
                  width: '70%',
                  aspectRatio: 1,
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: 30,
                    height: 30,
                    borderTop: '3px solid',
                    borderLeft: '3px solid',
                    borderColor: 'primary.main',
                    borderRadius: '4px 0 0 0',
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: 30,
                    height: 30,
                    borderTop: '3px solid',
                    borderRight: '3px solid',
                    borderColor: 'primary.main',
                    borderRadius: '0 4px 0 0',
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: 30,
                    height: 30,
                    borderBottom: '3px solid',
                    borderLeft: '3px solid',
                    borderColor: 'primary.main',
                    borderRadius: '0 0 0 4px',
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 30,
                    height: 30,
                    borderBottom: '3px solid',
                    borderRight: '3px solid',
                    borderColor: 'primary.main',
                    borderRadius: '0 0 4px 0',
                  }}
                />

                {scanning && (
                  <Box
                    sx={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      height: 2,
                      bgcolor: 'primary.main',
                      boxShadow: '0 0 10px rgba(0, 229, 255, 0.8)',
                      animation: 'scanLine 2s ease-in-out infinite',
                    }}
                    style={{
                      animation: 'scanLine 2s ease-in-out infinite',
                    }}
                  />
                )}
              </Box>

              <style>{`
                @keyframes scanLine {
                  0%, 100% { top: 15%; }
                  50% { top: 85%; }
                }
              `}</style>
            </Box>

            {scanResult && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  bgcolor: 'rgba(0, 0, 0, 0.85)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 3,
                }}
              >
                <Box
                  sx={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    bgcolor: 'success.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 2,
                  }}
                >
                  <CheckSquare style={{ width: 32, height: 32, color: 'white' }} />
                </Box>
                <Typography variant='h6' sx={{ color: 'white', mb: 1, fontWeight: 600 }}>
                  扫描成功
                </Typography>
                <Typography
                  variant='body2'
                  sx={{
                    color: 'rgba(255,255,255,0.9)',
                    mb: 2,
                    textAlign: 'center',
                    wordBreak: 'break-all',
                    px: 2,
                  }}
                >
                  {scanResult}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <MobileButton
                    variant='outlined'
                    size='small'
                    onClick={handleRescan}
                    sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
                  >
                    重新扫描
                  </MobileButton>
                  <MobileButton variant='contained' size='small' onClick={handleCopyResult}>
                    复制结果
                  </MobileButton>
                </Box>
              </Box>
            )}
          </Paper>

          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, mb: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <IconButton
                sx={{
                  width: 52,
                  height: 52,
                  bgcolor: flashOn ? 'warning.main' : 'grey.100',
                  color: flashOn ? 'white' : 'text.primary',
                  '&:hover': {
                    bgcolor: flashOn ? 'warning.dark' : 'grey.200',
                  },
                }}
                onClick={() => setFlashOn(!flashOn)}
              >
                <Flashlight style={{ width: 24, height: 24 }} />
              </IconButton>
              <Typography variant='caption' color='text.secondary'>
                闪光灯
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <IconButton
                sx={{
                  width: 52,
                  height: 52,
                  bgcolor: 'grey.100',
                  color: 'text.primary',
                  '&:hover': {
                    bgcolor: 'grey.200',
                  },
                }}
              >
                <Image style={{ width: 24, height: 24 }} />
              </IconButton>
              <Typography variant='caption' color='text.secondary'>
                相册
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <IconButton
                sx={{
                  width: 52,
                  height: 52,
                  bgcolor: 'grey.100',
                  color: 'text.primary',
                  '&:hover': {
                    bgcolor: 'grey.200',
                  },
                }}
                onClick={() => setActiveTab(2)}
              >
                <Barcode style={{ width: 24, height: 24 }} />
              </IconButton>
              <Typography variant='caption' color='text.secondary'>
                手动输入
              </Typography>
            </Box>
          </Box>

          {scanResult && (
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2,
                border: 1,
                borderColor: 'divider',
              }}
            >
              <Typography variant='subtitle2' sx={{ fontWeight: 600, mb: 2 }}>
                关联信息
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'primary.lighter',
                    color: 'primary.main',
                  }}
                >
                  <Package style={{ width: 24, height: 24 }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant='body2' sx={{ fontWeight: 500 }}>
                    电阻 10kΩ
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    物料编码: {scanResult}
                  </Typography>
                </Box>
                <Button endIcon={<ArrowRight style={{ width: 16, height: 16 }} />}>
                  查看
                </Button>
              </Box>
            </Paper>
          )}
        </Box>
      )}

      {activeTab === 1 && (
        <Box>
          <Box sx={{ p: 2 }}>
            <TextField
              fullWidth
              size='small'
              placeholder='搜索历史记录'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  minHeight: 44,
                },
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position='start'>
                      <Search style={{ width: 20, height: 20 }} />
                    </InputAdornment>
                  ),
                  endAdornment: scanHistory.length > 0 ? (
                    <InputAdornment position='end'>
                      <IconButton size='small' onClick={handleClearHistory}>
                        <Trash2 style={{ width: 18, height: 18 }} />
                      </IconButton>
                    </InputAdornment>
                  ) : undefined,
                },
              }}
            />
          </Box>

          {filteredHistory.length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 10,
              }}
            >
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  bgcolor: 'grey.100',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 2,
                }}
              >
                <History style={{ width: 32, height: 32, color: 'text.secondary' }} />
              </Box>
              <Typography variant='subtitle1' sx={{ mb: 1, fontWeight: 500 }}>
                暂无历史记录
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                扫描的条码将自动保存在这里
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {filteredHistory.map((item, index) => (
                <React.Fragment key={item.id}>
                  <MobileCard
                    leftIcon={
                      item.type === 'qrcode' ? (
                        <QrCode style={{ width: 20, height: 20 }} />
                      ) : (
                        <Barcode style={{ width: 20, height: 20 }} />
                      )
                    }
                    title={item.content}
                    subtitle={
                      item.relatedData
                        ? `${item.relatedData.type}: ${item.relatedData.name}`
                        : item.format
                    }
                    showArrow
                    divider
                    rightContent={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={item.format}
                          size='small'
                          variant='outlined'
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      </Box>
                    }
                    badge={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Clock style={{ width: 12, height: 12, color: 'text.secondary' }} />
                        <Typography variant='caption' color='text.secondary'>
                          {item.time}
                        </Typography>
                      </Box>
                    }
                    onClick={() => {
                      setScanResult(item.content);
                      setActiveTab(0);
                    }}
                  />
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>
      )}

      {activeTab === 2 && (
        <Box sx={{ p: 2 }}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 2,
              border: 1,
              borderColor: 'divider',
            }}
          >
            <Typography variant='subtitle1' sx={{ fontWeight: 600, mb: 2 }}>
              手动输入条码
            </Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
              如果无法扫描，可以手动输入条码或二维码内容
            </Typography>

            <TextField
              fullWidth
              placeholder='请输入条码内容'
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              sx={{
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  minHeight: 48,
                },
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleManualSubmit();
                }
              }}
            />

            <MobileButton
              fullWidth
              variant='contained'
              onClick={handleManualSubmit}
              disabled={!manualInput.trim()}
              startIcon={<Barcode style={{ width: 20, height: 20 }} />}
            >
              确认
            </MobileButton>
          </Paper>

          <Box sx={{ mt: 3 }}>
            <Typography variant='subtitle2' sx={{ fontWeight: 600, mb: 2 }}>
              支持的格式
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {['Code 128', 'EAN-13', 'UPC-A', 'QR Code', 'Code 39', 'ITF'].map((format) => (
                <Chip
                  key={format}
                  label={format}
                  variant='outlined'
                  size='small'
                  sx={{ height: 28 }}
                />
              ))}
            </Box>
          </Box>
        </Box>
      )}
    </MobileLayout>
  );
};

export default MobileScanPage;

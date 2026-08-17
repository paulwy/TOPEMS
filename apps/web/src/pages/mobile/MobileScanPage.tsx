import React, { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { mobileApi } from '@/api/mobile';
import {
  Box,
  Typography,
  Button,
  Chip,
  List,
  IconButton,
  useTheme,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  Paper,
} from '@mui/material';
import i18n from '@/i18n';
import {
  Home,
  ListTodo,
  ScanLine,
  CheckSquare,
  User,
  Flashlight,
  Image,
  History,
  Search,
  Barcode,
  QrCode,
  Package,
  ArrowRight,
  Clock,
  Trash2,
  Settings,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MobileLayout, MobileCard, MobileButton } from '@/components/mobile';
import { useNotificationStore } from '@/store';
import { designTokens } from '@/theme/tokens';
import { MOBILE_PATHS } from '@/modules/mobile/config';
import { PageContainer } from '@/components/common';

const ct = designTokens.colors;
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
  const { data: backendData } = useQuery({
    queryKey: ['mobile-scan-page'],
    queryFn: async () => {
      try {
        return (await mobileApi.inspection.listTasks()) ?? {};
      } catch (e) {
        return {};
      }
    },
  });
  const theme = useTheme();
  const navigate = useNavigate();
  const { addNotification } = useNotificationStore();
  const [activeTab, setActiveTab] = useState(0);
  const [flashOn, setFlashOn] = useState(false);
  const [scanning, setScanning] = useState(true);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [manualInput, setManualInput] = useState('');
  const tabs = [
    i18n.t('mobile.mobile_scan_page.k2'),
    i18n.t('mobile.mobile_scan_page.k1'),
    i18n.t('mobile.mobile_scan_page.k0'),
  ];
  useEffect(() => {
    const history: ScanHistoryItem[] = [
      {
        id: '1',
        content: 'PROD-2024-001234',
        type: 'barcode',
        format: 'Code 128',
        time: '10:30',
        relatedData: {
          type: i18n.t('mobile.mobile_scan_page.k3'),
          name: i18n.t('mobile.mobile_scan_page.k4'),
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
          type: i18n.t('mobile.mobile_scan_page.k5'),
          name: 'A3-05-02',
          code: 'INV-A3-005678',
        },
      },
      {
        id: '3',
        content: 'PO-2024-06-0891',
        type: 'barcode',
        format: 'EAN-13',
        time: i18n.t('pages.mobile_scan_page.1620_0'),
        relatedData: {
          type: i18n.t('mobile.mobile_scan_page.k6'),
          name: i18n.t('mobile.mobile_scan_page.k7'),
          code: 'PO-2024-06-0891',
        },
      },
      {
        id: '4',
        content: 'EMP-10086',
        type: 'qrcode',
        format: 'QR Code',
        time: i18n.t('pages.mobile_scan_page.1415_1'),
        relatedData: {
          type: i18n.t('mobile.mobile_scan_page.k8'),
          name: i18n.t('mobile.mobile_scan_page.k9'),
          code: 'EMP-10086',
        },
      },
      {
        id: '5',
        content: 'EQ-2024-0042',
        type: 'barcode',
        format: 'Code 39',
        time: i18n.t('pages.mobile_scan_page.1000_2'),
        relatedData: {
          type: i18n.t('mobile.mobile_scan_page.k10'),
          name: i18n.t('pages.mobile_scan_page.cnc3_3'),
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
          time: i18n.t('mobile.mobile_scan_page.k11'),
          relatedData: {
            type: i18n.t('mobile.mobile_scan_page.k12'),
            name: i18n.t('pages.mobile_scan_page.10k_4'),
            code: randomResult.content,
          },
        };
        setScanHistory((prev) => [newHistoryItem, ...prev]);
        addNotification({
          title: i18n.t('mobile.mobile_scan_page.k13'),
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
    return;
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
        navigate(MOBILE_PATHS.home);
        break;
      case 'tasks':
        navigate(MOBILE_PATHS.tasks);
        break;
      case 'scan':
        break;
      case 'approval':
        navigate(MOBILE_PATHS.approvals);
        break;
      case 'profile':
        navigate(MOBILE_PATHS.settings);
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
      format: i18n.t('mobile.mobile_scan_page.k14'),
      time: i18n.t('mobile.mobile_scan_page.k15'),
    };
    setScanHistory((prev) => [newHistoryItem, ...prev]);
    setActiveTab(0);
    addNotification({
      title: i18n.t('mobile.mobile_scan_page.k16'),
      message: manualInput,
      type: 'success',
    });
  };
  const handleCopyResult = () => {
    if (scanResult) {
      navigator.clipboard.writeText(scanResult);
      addNotification({
        title: i18n.t('mobile.mobile_scan_page.k17'),
        message: i18n.t('mobile.mobile_scan_page.k18'),
        type: 'info',
      });
    }
  };
  const handleClearHistory = () => {
    setScanHistory([]);
    addNotification({
      title: i18n.t('mobile.mobile_scan_page.k19'),
      message: i18n.t('mobile.mobile_scan_page.k20'),
      type: 'info',
    });
  };
  const filteredHistory = scanHistory.filter((item) =>
    item.content.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const bottomTabs = [
    {
      id: 'home',
      label: i18n.t('mobile.mobile_scan_page.k21'),
      icon: <Home style={{ width: 22, height: 22 }} />,
    },
    {
      id: 'tasks',
      label: i18n.t('mobile.mobile_scan_page.k22'),
      icon: <ListTodo style={{ width: 22, height: 22 }} />,
    },
    {
      id: 'scan',
      label: i18n.t('mobile.mobile_scan_page.k23'),
      icon: <ScanLine style={{ width: 22, height: 22 }} />,
    },
    {
      id: 'approval',
      label: i18n.t('mobile.mobile_scan_page.k24'),
      icon: <CheckSquare style={{ width: 22, height: 22 }} />,
      badge: 3,
    },
    {
      id: 'profile',
      label: i18n.t('mobile.mobile_scan_page.k25'),
      icon: <User style={{ width: 22, height: 22 }} />,
    },
  ];
  return (
    <MobileLayout
      title={i18n.t('mobile.mobile_scan_page.k26')}
      showBack={false}
      showMenu={false}
      showTabBar
      tabs={bottomTabs}
      activeTab='scan'
      onTabChange={handleBottomTabChange}
      rightActions={
        <IconButton
          size='large'
          onClick={() => navigate(MOBILE_PATHS.scan)}
          sx={{ minWidth: 44, minHeight: 44 }}
          aria-label={i18n.t('mobile.mobile_scan_page.k27')}
        >
          <Settings size={20} />
        </IconButton>
      }
    >
      <PageContainer
        autoTitle={false}
        autoBreadcrumbs={false}
        padding={false}
        maxWidth={false}
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
            <Tab
              key={index}
              label={tab}
            />
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
                backgroundColor: ct.grey[900],
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  background: `linear-gradient(135deg, ${ct.grey[900]} 0%, ${ct.blue[900]} 100%)`,
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
                    bgcolor: 'action.active',
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
                    <CheckSquare style={{ width: 32, height: 32, color: 'common.white' }} />
                  </Box>
                  <Typography
                    variant='h6'
                    sx={{ color: 'common.white', mb: 1, fontWeight: 600 }}
                  >
                    {i18n.t('pages.mobile_scan_page.k0')}
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{
                      color: 'common.white',
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
                      sx={{ color: 'common.white', borderColor: 'common.white' }}
                    >
                      {i18n.t('pages.mobile_scan_page.k1')}
                    </MobileButton>
                    <MobileButton
                      variant='contained'
                      size='small'
                      onClick={handleCopyResult}
                    >
                      {i18n.t('pages.mobile_scan_page.k2')}
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
                  aria-label={i18n.t('mobile.mobile_scan_page.k28')}
                >
                  <Flashlight style={{ width: 24, height: 24 }} />
                </IconButton>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {i18n.t('pages.mobile_scan_page.k3')}
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
                  aria-label={i18n.t('mobile.mobile_scan_page.k29')}
                >
                  <Image style={{ width: 24, height: 24 }} />
                </IconButton>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {i18n.t('pages.mobile_scan_page.k4')}
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
                  aria-label={i18n.t('mobile.mobile_scan_page.k30')}
                >
                  <Barcode style={{ width: 24, height: 24 }} />
                </IconButton>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {i18n.t('pages.mobile_scan_page.k5')}
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
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600, mb: 2 }}
                >
                  {i18n.t('pages.mobile_scan_page.k6')}
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
                    <Typography
                      variant='body2'
                      sx={{ fontWeight: 500 }}
                    >
                      {i18n.t('pages.mobile_scan_page.10k_7')}
                    </Typography>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      [i18n.t('pages.mobile_scan_page.k8')]: {scanResult}
                    </Typography>
                  </Box>
                  <Button endIcon={<ArrowRight style={{ width: 16, height: 16 }} />}>
                    {i18n.t('mobile.mobile_scan_page.k31')}
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
                placeholder={i18n.t('mobile.mobile_scan_page.k32')}
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
                    endAdornment:
                      scanHistory.length > 0 ? (
                        <InputAdornment position='end'>
                          <IconButton
                            size='small'
                            onClick={handleClearHistory}
                            aria-label={i18n.t('mobile.mobile_scan_page.k33')}
                          >
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
                  <History style={{ width: 32, height: 32, color: theme.palette.text.secondary }} />
                </Box>
                <Typography
                  variant='subtitle1'
                  sx={{ mb: 1, fontWeight: 500 }}
                >
                  {i18n.t('pages.mobile_scan_page.k9')}
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {i18n.t('pages.mobile_scan_page.k10')}
                </Typography>
              </Box>
            ) : (
              <List disablePadding>
                {filteredHistory.map((item, _index) => (
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
                          <Clock
                            style={{ width: 12, height: 12, color: theme.palette.text.secondary }}
                          />
                          <Typography
                            variant='caption'
                            color='text.secondary'
                          >
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
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600, mb: 2 }}
              >
                {i18n.t('pages.mobile_scan_page.k11')}
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{ mb: 3 }}
              >
                {i18n.t('pages.mobile_scan_page.k12')}
              </Typography>
              <TextField
                fullWidth
                placeholder={i18n.t('mobile.mobile_scan_page.k34')}
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
                {i18n.t('pages.mobile_scan_page.k13')}
              </MobileButton>
            </Paper>
            <Box sx={{ mt: 3 }}>
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600, mb: 2 }}
              >
                {i18n.t('pages.mobile_scan_page.k14')}
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
      </PageContainer>
    </MobileLayout>
  );
};
export default MobileScanPage;

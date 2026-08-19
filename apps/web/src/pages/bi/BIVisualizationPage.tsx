import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  TrendingDown,
  Trash2,
  Grid3X3,
  List,
  Settings,
  MousePointer,
  Type,
  Image,
  Table,
  Box as BoxIcon,
  Save,
  Play,
  RefreshCw,
} from 'lucide-react';
import i18n from '@/i18n';
import {
  Card,
  CardContent,
  CardHeader,
  TextField,
  Box,
  Skeleton,
  Typography,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Divider,
  Button,
} from '@mui/material';
import { EmptyState, Grid } from '@/components';
import { DashboardTemplate, type StatCard } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { fetchWidgets, createWidget, updateWidget, deleteWidget, type Widget } from '@/api/bi';
import { logger } from '@/utils/logger';
import { QUERY_KEYS } from '@/lib/reactQuery';

interface VisualizationComponent {
  id: string;
  type: 'bar' | 'line' | 'pie' | 'gauge' | 'table' | 'text' | 'image' | 'metric';
  name: string;
  icon: React.ReactNode;
  description: string;
}
interface CanvasComponent {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  config: Record<string, unknown>;
}
const componentList: VisualizationComponent[] = [
  {
    id: 'bar',
    type: 'bar',
    name: i18n.t('bi.bi_visualization_page.k0'),
    icon: <BarChart3 size={20} />,
    description: i18n.t('bi.bi_visualization_page.k1'),
  },
  {
    id: 'line',
    type: 'line',
    name: i18n.t('bi.bi_visualization_page.k2'),
    icon: <LineChart size={20} />,
    description: i18n.t('bi.bi_visualization_page.k3'),
  },
  {
    id: 'pie',
    type: 'pie',
    name: i18n.t('bi.bi_visualization_page.k4'),
    icon: <PieChart size={20} />,
    description: i18n.t('bi.bi_visualization_page.k5'),
  },
  {
    id: 'gauge',
    type: 'gauge',
    name: i18n.t('bi.bi_visualization_page.k6'),
    icon: <TrendingUp size={20} />,
    description: i18n.t('bi.bi_visualization_page.k7'),
  },
  {
    id: 'table',
    type: 'table',
    name: i18n.t('bi.bi_visualization_page.k8'),
    icon: <Table size={20} />,
    description: i18n.t('bi.bi_visualization_page.k9'),
  },
  {
    id: 'text',
    type: 'text',
    name: i18n.t('bi.bi_visualization_page.k10'),
    icon: <Type size={20} />,
    description: i18n.t('bi.bi_visualization_page.k11'),
  },
  {
    id: 'image',
    type: 'image',
    name: i18n.t('bi.bi_visualization_page.k12'),
    icon: <Image size={20} />,
    description: i18n.t('bi.bi_visualization_page.k13'),
  },
  {
    id: 'metric',
    type: 'metric',
    name: i18n.t('bi.bi_visualization_page.k14'),
    icon: <TrendingDown size={20} />,
    description: i18n.t('bi.bi_visualization_page.k15'),
  },
];
const widgetToCanvasComponent = (widget: Widget): CanvasComponent => ({
  id: widget.id,
  type: widget.widget_type,
  x: widget.position?.x || 50,
  y: widget.position?.y || 50,
  width: widget.position?.w || 200,
  height: widget.position?.h || 150,
  config: widget.config || {},
});
const canvasComponentToWidgetData = (comp: CanvasComponent): Partial<Widget> => ({
  name: (comp.config.title as string) || comp.type,
  widget_type: comp.type,
  config: comp.config,
  position: {
    x: comp.x,
    y: comp.y,
    w: comp.width,
    h: comp.height,
  },
});
const BIVisualizationPage = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [canvasComponents, setCanvasComponents] = useState<CanvasComponent[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [, setError] = useState<string | null>(null);
  const [, setIsDragging] = useState(false);
  const widgetsQuery = useQuery<CanvasComponent[]>({
    queryKey: QUERY_KEYS.AD_HOC.BI_WIDGETS_BASE,
    queryFn: async () => {
      const res = await fetchWidgets();
      if (res.success && res.data) {
        const widgets: Widget[] = res.data.items || res.data || [];
        return widgets.map(widgetToCanvasComponent);
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });
  useEffect(() => {
    if (widgetsQuery.data) {
      setCanvasComponents(widgetsQuery.data);
    }
  }, [widgetsQuery.data]);
  const loading = widgetsQuery.isLoading;
  useEffect(() => {
    if (widgetsQuery.isError) {
      logger.error('Failed to load widgets:', widgetsQuery.error);
      setError(i18n.t('bi.bi_visualization_page.fail'));
    } else {
      setError(null);
    }
  }, [widgetsQuery.isError, widgetsQuery.error]);
  const handleRefresh = () => {
    widgetsQuery.refetch();
  };
  const createMutation = useMutation({
    mutationFn: (data: Partial<Widget>) => createWidget(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.BI_WIDGETS_BASE,
        exact: false,
        refetchType: 'active',
      });
    },
    onError: (e: unknown) => {
      logger.error('Failed to create widget:', e);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteWidget(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.BI_WIDGETS_BASE,
        exact: false,
        refetchType: 'active',
      });
    },
    onError: (e: unknown) => {
      logger.error('Failed to delete widget:', e);
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, widgetData }: { id: string; widgetData: Partial<Widget> }) =>
      updateWidget(id, widgetData),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.BI_WIDGETS_BASE,
        exact: false,
        refetchType: 'active',
      });
    },
    onError: (e: unknown) => {
      logger.error('Failed to update widget:', e);
    },
  });
  const actionLoading =
    createMutation.isPending || deleteMutation.isPending || updateMutation.isPending;
  const filteredComponents = componentList.filter((comp) => {
    const matchesSearch = comp.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || comp.type === filterType;
    return matchesSearch && matchesType;
  });
  const handleDragStart = (e: React.DragEvent, component: VisualizationComponent) => {
    e.dataTransfer.setData('componentType', component.type);
    setIsDragging(true);
  };
  const handleDragEnd = () => {
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const componentType = e.dataTransfer.getData('componentType');
    if (componentType) {
      const newComponentData: Partial<Widget> = {
        name: i18n.t('bi.bi_visualization_page.text_e798a0'),
        widget_type: componentType,
        config: { title: i18n.t('bi.bi_visualization_page.text_e798a0') },
        position: {
          x: 50,
          y: 50,
          w: 200,
          h: 150,
        },
      };
      createMutation.mutate(newComponentData);
    }
    setIsDragging(false);
  };
  const handleDeleteComponent = (id: string) => {
    deleteMutation.mutate(id);
    if (selectedComponent === id) {
      setSelectedComponent(null);
    }
  };
  const handleUpdateComponent = (id: string, updates: Partial<CanvasComponent>) => {
    const comp = canvasComponents.find((c) => c.id === id);
    if (!comp) return;
    const updatedComp = { ...comp, ...updates };
    const widgetData = canvasComponentToWidgetData(updatedComp);
    updateMutation.mutate({ id, widgetData });
  };
  const getComponentIcon = (type: string) => {
    const comp = componentList.find((c) => c.type === type);
    return comp?.icon || <BoxIcon size={20} />;
  };
  // 构建统计数据卡片
  const statsCards: StatCard[] = [
    {
      id: 'total-components',
      title: i18n.t('bi.bi_visualization_page.text_c95a1a'),
      value: canvasComponents.length,
      icon: <BoxIcon size={24} />,
      color: 'primary',
    },
    {
      id: 'component-types',
      title: i18n.t('bi.bi_visualization_page.type'),
      value: new Set(canvasComponents.map((c) => c.type)).size,
      icon: <Settings size={24} />,
      color: 'info',
    },
  ];
  if (loading) {
    return (
      <PageContainer
        title={i18n.t('bi.bi_visualization_page.edit')}
        subtitle={i18n.t('bi.bi_visualization_page.create')}
        padding={false}
        maxWidth={false}
      >
        <DashboardTemplate
          title=''
          subtitle=''
          breadcrumbs={[
            { label: i18n.t('bi.bi_visualization_page.home'), href: '/dashboard' },
            { label: 'BI' },
            { label: i18n.t('bi.bi_visualization_page.edit_1') },
          ]}
          loading={true}
        >
          <Box
            sx={{
              minHeight: '100vh',
              bgcolor: 'grey.50',
              p: 3,
              display: 'flex',
              gap: 3,
            }}
          >
            <Box sx={{ width: 280 }}>
              <Skeleton
                variant='rounded'
                width='100%'
                height={400}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Skeleton
                variant='rounded'
                width='100%'
                height={600}
              />
            </Box>
            <Box sx={{ width: 300 }}>
              <Skeleton
                variant='rounded'
                width='100%'
                height={400}
              />
            </Box>
          </Box>
        </DashboardTemplate>
      </PageContainer>
    );
  }
  return (
    <PageContainer
      title={i18n.t('bi.bi_visualization_page.edit')}
      subtitle={i18n.t('bi.bi_visualization_page.create')}
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: i18n.t('bi.bi_visualization_page.home'), href: '/dashboard' },
          { label: 'BI' },
          { label: i18n.t('bi.bi_visualization_page.edit_1') },
        ]}
        stats={statsCards}
        loading={loading}
        onRefresh={handleRefresh}
      >
        <Box sx={{ display: 'flex', gap: 3, height: 'calc(100vh - 280px)' }}>
          <Card sx={{ width: 280, display: 'flex', flexDirection: 'column' }}>
            <CardHeader
              title={i18n.t('bi.bi_visualization_page.list')}
              avatar={<Settings size={20} />}
              action={
                <Box sx={{ display: 'flex', gap: 0.5, pr: 1 }}>
                  <Tooltip title={i18n.t('bi.bi_visualization_page.text_90581a')}>
                    <IconButton
                      size='small'
                      onClick={() => setViewMode('grid')}
                      color={viewMode === 'grid' ? 'primary' : 'default'}
                      aria-label={i18n.t('bi.bi_visualization_page.k16')}
                    >
                      <Grid3X3 size={16} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={i18n.t('bi.bi_visualization_page.list_1')}>
                    <IconButton
                      size='small'
                      onClick={() => setViewMode('list')}
                      color={viewMode === 'list' ? 'primary' : 'default'}
                      aria-label={i18n.t('bi.bi_visualization_page.k17')}
                    >
                      <List size={16} />
                    </IconButton>
                  </Tooltip>
                </Box>
              }
            />
            <CardContent sx={{ flex: 1, overflow: 'auto' }}>
              <TextField
                placeholder={i18n.t('bi.bi_visualization_page.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size='small'
                fullWidth
                sx={{ mb: 2 }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <Search
                        size={16}
                        color='grey.400'
                        sx={{ mr: 1 }}
                      />
                    ),
                  },
                }}
              />
              <FormControl
                size='small'
                fullWidth
                sx={{ mb: 2 }}
              >
                <InputLabel>{i18n.t('bi.bi_visualization_page.k18')}</InputLabel>
                <Select
                  value={filterType}
                  label={i18n.t('bi.bi_visualization_page.type')}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <MenuItem value='all'>{i18n.t('bi.bi_visualization_page.k19')}</MenuItem>
                  <MenuItem value='bar'>{i18n.t('bi.bi_visualization_page.k20')}</MenuItem>
                  <MenuItem value='line'>{i18n.t('bi.bi_visualization_page.k21')}</MenuItem>
                  <MenuItem value='pie'>{i18n.t('bi.bi_visualization_page.k22')}</MenuItem>
                  <MenuItem value='gauge'>{i18n.t('bi.bi_visualization_page.k23')}</MenuItem>
                  <MenuItem value='table'>{i18n.t('bi.bi_visualization_page.k24')}</MenuItem>
                  <MenuItem value='text'>{i18n.t('bi.bi_visualization_page.k25')}</MenuItem>
                  <MenuItem value='metric'>{i18n.t('bi.bi_visualization_page.k26')}</MenuItem>
                </Select>
              </FormControl>
              <Divider sx={{ my: 2 }} />
              <Typography
                variant='caption'
                color='text.secondary'
                sx={{ mb: 1, display: 'block' }}
              >
                {i18n.t('pages.bi_visualization_page.k0')}
              </Typography>
              <Box
                sx={{
                  display: viewMode === 'grid' ? 'grid' : 'flex',
                  flexDirection: 'column',
                  gap: 1,
                  gridTemplateColumns: viewMode === 'grid' ? 'repeat(2, 1fr)' : undefined,
                }}
              >
                {filteredComponents.map((comp) => (
                  <Box
                    key={comp.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, comp)}
                    onDragEnd={handleDragEnd}
                    sx={{
                      p: 1.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      cursor: 'grab',
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: 'primary.50',
                      },
                      '&:active': {
                        cursor: 'grabbing',
                      },
                    }}
                  >
                    {viewMode === 'list' ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ color: 'primary.main' }}>{comp.icon as any}</Box>
                        <Box>
                          <Typography
                            variant='body2'
                            sx={{ fontWeight: 500 }}
                          >
                            {comp.name}
                          </Typography>
                          <Typography
                            variant='caption'
                            color='text.secondary'
                          >
                            {comp.description}
                          </Typography>
                        </Box>
                      </Box>
                    ) : (
                      <Box sx={{ textAlign: 'center' }}>
                        <Box sx={{ color: 'primary.main', mb: 0.5 }}>{comp.icon as any}</Box>
                        <Typography variant='caption'>{comp.name}</Typography>
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <CardHeader
              title={i18n.t('bi.bi_visualization_page.text_6cfd0e')}
              subheader={i18n.t('bi.bi_visualization_page.edit_2')}
              action={
                <Box sx={{ display: 'flex', gap: 1, pr: 2 }}>
                  <Button
                    variant='outlined'
                    size='small'
                    startIcon={<Play size={16} />}
                  >
                    {i18n.t('pages.bi_visualization_page.k1')}
                  </Button>
                  <Button
                    variant='contained'
                    size='small'
                    startIcon={<Save size={16} />}
                  >
                    {i18n.t('pages.bi_visualization_page.k2')}
                  </Button>
                </Box>
              }
            />
            <CardContent
              sx={{
                flex: 1,
                bgcolor: 'common.white',
                borderRadius: 1,
                m: 1,
                overflow: 'auto',
                position: 'relative',
                minHeight: 400,
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              {canvasComponents.length === 0 ? (
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'text.secondary',
                  }}
                >
                  <MousePointer
                    size={48}
                    sx={{ mb: 2, opacity: 0.5 }}
                  />
                  <Typography variant='body1'>{i18n.t('bi.bi_visualization_page.k27')}</Typography>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {i18n.t('pages.bi_visualization_page.k3')}
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ position: 'relative', minHeight: '100%' }}>
                  {canvasComponents.map((comp) => (
                    <Box
                      key={comp.id}
                      onClick={() => setSelectedComponent(comp.id)}
                      sx={{
                        position: 'absolute',
                        left: comp.x,
                        top: comp.y,
                        width: comp.width,
                        height: comp.height,
                        border: '2px solid',
                        borderColor: selectedComponent === comp.id ? 'primary.main' : 'transparent',
                        borderRadius: 1,
                        bgcolor: 'grey.50',
                        cursor: 'move',
                        transition: 'border-color 0.2s',
                        '&:hover': {
                          borderColor: selectedComponent === comp.id ? 'primary.main' : 'grey.300',
                        },
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          p: 1,
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          bgcolor: 'background.paper',
                          borderRadius: '2px 2px 0 0',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {getComponentIcon(comp.type) as any}
                          <Typography variant='caption'>
                            {(comp.config.title as string) || comp.type}
                          </Typography>
                        </Box>
                        <IconButton
                          size='small'
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteComponent(comp.id);
                          }}
                          aria-label={i18n.t('bi.bi_visualization_page.k28')}
                        >
                          <Trash2 size={14} />
                        </IconButton>
                      </Box>
                      <Box
                        sx={{
                          p: 2,
                          height: 'calc(100% - 40px)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          {comp.type === 'bar' && i18n.t('bi.bi_visualization_page.text_7c8ee6')}
                          {comp.type === 'line' && i18n.t('bi.bi_visualization_page.text_c9c9bd')}
                          {comp.type === 'pie' && i18n.t('bi.bi_visualization_page.text_d5e33d')}
                          {comp.type === 'gauge' && i18n.t('bi.bi_visualization_page.text_3fa8b3')}
                          {comp.type === 'table' && i18n.t('bi.bi_visualization_page.text_01c85e')}
                          {comp.type === 'text' && i18n.t('bi.bi_visualization_page.content')}
                          {comp.type === 'image' && i18n.t('bi.bi_visualization_page.text_20def7')}
                          {comp.type === 'metric' &&
                            `${i18n.t('pages.bi_visualization_page.k0')}${comp.config.value || 0}`}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
          <Card sx={{ width: 300, display: 'flex', flexDirection: 'column' }}>
            <CardHeader title={i18n.t('bi.bi_visualization_page.text_6aab38')} />
            <CardContent sx={{ flex: 1, overflow: 'auto' }}>
              {selectedComponent ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {(() => {
                    const comp = canvasComponents.find((c) => c.id === selectedComponent);
                    if (!comp) return null;
                    return (
                      <>
                        <Box>
                          <Typography
                            variant='caption'
                            color='text.secondary'
                          >
                            {i18n.t('pages.bi_visualization_page.k4')}
                          </Typography>
                          <Typography
                            variant='body2'
                            sx={{ fontWeight: 500 }}
                          >
                            {componentList.find((c) => c.type === comp.type)?.name || comp.type}
                          </Typography>
                        </Box>
                        <TextField
                          label={i18n.t('bi.bi_visualization_page.title')}
                          size='small'
                          fullWidth
                          value={comp.config.title || ''}
                          onChange={(e) => {
                            setCanvasComponents(
                              canvasComponents.map((c) =>
                                c.id === selectedComponent
                                  ? {
                                      ...c,
                                      config: {
                                        ...c.config,
                                        title: e.target.value,
                                      },
                                    }
                                  : c
                              )
                            );
                          }}
                        />
                        <Divider />
                        <Box>
                          <Typography
                            variant='caption'
                            color='text.secondary'
                            sx={{ mb: 1, display: 'block' }}
                          >
                            {i18n.t('pages.bi_visualization_page.k5')}
                          </Typography>
                          <Box
                            sx={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: 1,
                            }}
                          >
                            <TextField
                              label='X'
                              size='small'
                              type='number'
                              value={comp.x}
                              onChange={(e) => {
                                setCanvasComponents(
                                  canvasComponents.map((c) =>
                                    c.id === selectedComponent
                                      ? { ...c, x: Number(e.target.value) }
                                      : c
                                  )
                                );
                              }}
                            />
                            <TextField
                              label='Y'
                              size='small'
                              type='number'
                              value={comp.y}
                              onChange={(e) => {
                                setCanvasComponents(
                                  canvasComponents.map((c) =>
                                    c.id === selectedComponent
                                      ? { ...c, y: Number(e.target.value) }
                                      : c
                                  )
                                );
                              }}
                            />
                            <TextField
                              label={i18n.t('bi.bi_visualization_page.text_c28479')}
                              size='small'
                              type='number'
                              value={comp.width}
                              onChange={(e) => {
                                setCanvasComponents(
                                  canvasComponents.map((c) =>
                                    c.id === selectedComponent
                                      ? { ...c, width: Number(e.target.value) }
                                      : c
                                  )
                                );
                              }}
                            />
                            <TextField
                              label={i18n.t('bi.bi_visualization_page.text_c1df04')}
                              size='small'
                              type='number'
                              value={comp.height}
                              onChange={(e) => {
                                setCanvasComponents(
                                  canvasComponents.map((c) =>
                                    c.id === selectedComponent
                                      ? { ...c, height: Number(e.target.value) }
                                      : c
                                  )
                                );
                              }}
                            />
                          </Box>
                        </Box>
                      </>
                    );
                  })()}
                </Box>
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: 'text.secondary',
                  }}
                >
                  <Settings
                    size={32}
                    sx={{ mb: 1, opacity: 0.5 }}
                  />
                  <Typography variant='body2'>{i18n.t('bi.bi_visualization_page.k29')}</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      </DashboardTemplate>
    </PageContainer>
  );
};
export default BIVisualizationPage;

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

import { useTranslation } from 'react-i18next';

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
  config: Record<string, any>;
}

const componentList: VisualizationComponent[] = [
  {
    id: 'bar',
    type: 'bar',
    name: '柱状图',
    icon: <BarChart3 size={20} />,
    description: '展示分类数据的对比',
  },
  {
    id: 'line',
    type: 'line',
    name: '折线图',
    icon: <LineChart size={20} />,
    description: '展示数据趋势变化',
  },
  {
    id: 'pie',
    type: 'pie',
    name: '饼图',
    icon: <PieChart size={20} />,
    description: '展示数据占比分布',
  },
  {
    id: 'gauge',
    type: 'gauge',
    name: '仪表盘',
    icon: <TrendingUp size={20} />,
    description: '展示指标完成进度',
  },
  {
    id: 'table',
    type: 'table',
    name: '数据表格',
    icon: <Table size={20} />,
    description: '展示结构化数据',
  },
  {
    id: 'text',
    type: 'text',
    name: '文本框',
    icon: <Type size={20} />,
    description: '添加标题或说明文字',
  },
  {
    id: 'image',
    type: 'image',
    name: '图片',
    icon: <Image size={20} />,
    description: '添加图片元素',
  },
  {
    id: 'metric',
    type: 'metric',
    name: '指标卡',
    icon: <TrendingDown size={20} />,
    description: '展示单个关键指标',
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
  name: comp.config.title || comp.type,
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
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [canvasComponents, setCanvasComponents] = useState<CanvasComponent[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [, setError] = useState<string | null>(null);
  const [, setIsDragging] = useState(false);

  const widgetsQuery = useQuery<CanvasComponent[]>({
    queryKey: ['bi-widgets'],
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
      setError(t('bi.bi_visualization_page.fail'));
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
      queryClient.invalidateQueries({ queryKey: ['bi-widgets'] });
    },
    onError: (e: unknown) => {
      logger.error('Failed to create widget:', e);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteWidget(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bi-widgets'] });
    },
    onError: (e: unknown) => {
      logger.error('Failed to delete widget:', e);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, widgetData }: { id: string; widgetData: Partial<Widget> }) =>
      updateWidget(id, widgetData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bi-widgets'] });
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
        name: t('bi.bi_visualization_page.text_e798a0'),
        widget_type: componentType,
        config: { title: t('bi.bi_visualization_page.text_e798a0') },
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
      title: t('bi.bi_visualization_page.text_c95a1a'),
      value: canvasComponents.length,
      icon: <BoxIcon size={24} />,
      color: 'primary',
    },
    {
      id: 'component-types',
      title: t('bi.bi_visualization_page.type'),
      value: new Set(canvasComponents.map((c) => c.type)).size,
      icon: <Settings size={24} />,
      color: 'info',
    },
  ];

  if (loading) {
    return (
      <PageContainer
        title={t('bi.bi_visualization_page.edit')}
        subtitle={t('bi.bi_visualization_page.create')}
        padding={false}
        maxWidth={false}
      >
        <DashboardTemplate
          title=''
          subtitle=''
          breadcrumbs={[
            { label: t('bi.bi_visualization_page.home'), href: '/dashboard' },
            { label: 'BI' },
            { label: t('bi.bi_visualization_page.edit_1') },
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
      title={t('bi.bi_visualization_page.edit')}
      subtitle={t('bi.bi_visualization_page.create')}
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: t('bi.bi_visualization_page.home'), href: '/dashboard' },
          { label: 'BI' },
          { label: t('bi.bi_visualization_page.edit_1') },
        ]}
        stats={statsCards}
        loading={loading}
        onRefresh={handleRefresh}
      >
        <Box sx={{ display: 'flex', gap: 3, height: 'calc(100vh - 280px)' }}>
          <Card sx={{ width: 280, display: 'flex', flexDirection: 'column' }}>
            <CardHeader
              title={t('bi.bi_visualization_page.list')}
              avatar={<Settings size={20} />}
              action={
                <Box sx={{ display: 'flex', gap: 0.5, pr: 1 }}>
                  <Tooltip title={t('bi.bi_visualization_page.text_90581a')}>
                    <IconButton
                      size='small'
                      onClick={() => setViewMode('grid')}
                      color={viewMode === 'grid' ? 'primary' : 'default'}
                      aria-label='网格'
                    >
                      <Grid3X3 size={16} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('bi.bi_visualization_page.list_1')}>
                    <IconButton
                      size='small'
                      onClick={() => setViewMode('list')}
                      color={viewMode === 'list' ? 'primary' : 'default'}
                      aria-label='列表'
                    >
                      <List size={16} />
                    </IconButton>
                  </Tooltip>
                </Box>
              }
            />
            <CardContent sx={{ flex: 1, overflow: 'auto' }}>
              <TextField
                placeholder={t('bi.bi_visualization_page.search')}
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
                <InputLabel>组件类型</InputLabel>
                <Select
                  value={filterType}
                  label={t('bi.bi_visualization_page.type')}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <MenuItem value='all'>全部类型</MenuItem>
                  <MenuItem value='bar'>柱状图</MenuItem>
                  <MenuItem value='line'>折线图</MenuItem>
                  <MenuItem value='pie'>饼图</MenuItem>
                  <MenuItem value='gauge'>仪表盘</MenuItem>
                  <MenuItem value='table'>表格</MenuItem>
                  <MenuItem value='text'>文本</MenuItem>
                  <MenuItem value='metric'>指标卡</MenuItem>
                </Select>
              </FormControl>

              <Divider sx={{ my: 2 }} />

              <Typography
                variant='caption'
                color='text.secondary'
                sx={{ mb: 1, display: 'block' }}
              >
                拖拽组件到画布
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
                        <Box sx={{ color: 'primary.main' }}>{comp.icon}</Box>
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
                        <Box sx={{ color: 'primary.main', mb: 0.5 }}>{comp.icon}</Box>
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
              title={t('bi.bi_visualization_page.text_6cfd0e')}
              subheader={t('bi.bi_visualization_page.edit_2')}
              action={
                <Box sx={{ display: 'flex', gap: 1, pr: 2 }}>
                  <Button
                    variant='outlined'
                    size='small'
                    startIcon={<Play size={16} />}
                  >
                    预览
                  </Button>
                  <Button
                    variant='contained'
                    size='small'
                    startIcon={<Save size={16} />}
                  >
                    保存
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
                  <Typography variant='body1'>将组件拖拽到此处</Typography>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    从左侧组件列表拖拽组件到画布上进行编辑
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
                          {getComponentIcon(comp.type)}
                          <Typography variant='caption'>
                            {comp.config.title || comp.type}
                          </Typography>
                        </Box>
                        <IconButton
                          size='small'
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteComponent(comp.id);
                          }}
                          aria-label='删除'
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
                          {comp.type === 'bar' && t('bi.bi_visualization_page.text_7c8ee6')}
                          {comp.type === 'line' && t('bi.bi_visualization_page.text_c9c9bd')}
                          {comp.type === 'pie' && t('bi.bi_visualization_page.text_d5e33d')}
                          {comp.type === 'gauge' && t('bi.bi_visualization_page.text_3fa8b3')}
                          {comp.type === 'table' && t('bi.bi_visualization_page.text_01c85e')}
                          {comp.type === 'text' && t('bi.bi_visualization_page.content')}
                          {comp.type === 'image' && t('bi.bi_visualization_page.text_20def7')}
                          {comp.type === 'metric' && `数值: ${comp.config.value || 0}`}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>

          <Card sx={{ width: 300, display: 'flex', flexDirection: 'column' }}>
            <CardHeader title={t('bi.bi_visualization_page.text_6aab38')} />
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
                            组件类型
                          </Typography>
                          <Typography
                            variant='body2'
                            sx={{ fontWeight: 500 }}
                          >
                            {componentList.find((c) => c.type === comp.type)?.name || comp.type}
                          </Typography>
                        </Box>
                        <TextField
                          label={t('bi.bi_visualization_page.title')}
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
                            位置与尺寸
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
                              label={t('bi.bi_visualization_page.text_c28479')}
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
                              label={t('bi.bi_visualization_page.text_c1df04')}
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
                  <Typography variant='body2'>选择组件以编辑属性</Typography>
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

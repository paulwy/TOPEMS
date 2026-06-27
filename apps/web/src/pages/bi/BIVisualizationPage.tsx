import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  TrendingDown,
  Eye,
  Edit,
  Trash2,
  Copy,
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
  Alert,
  Button,
} from '@mui/material';
import { EmptyState, Grid } from '@/components';
import { useAppStore } from '@/store';
import { DashboardTemplate, type StatCard } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { fetchWidgets, createWidget, updateWidget, deleteWidget, type Widget } from '@/api/bi';
import { logger } from '@/utils/logger';

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
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [canvasComponents, setCanvasComponents] = useState<CanvasComponent[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const loadData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await fetchWidgets();
      if (res.success && res.data) {
        const widgets: Widget[] = res.data.items || res.data || [];
        const components = widgets.map(widgetToCanvasComponent);
        setCanvasComponents(components);
      }
    } catch (e: unknown) {
      logger.error('Failed to load widgets:', e);
      setError('加载组件数据失败，请稍后重试');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    loadData(true);
  };

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

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const componentType = e.dataTransfer.getData('componentType');
    if (componentType) {
      try {
        const newComponentData: Partial<Widget> = {
          name: '新组件',
          widget_type: componentType,
          config: { title: '新组件' },
          position: {
            x: 50,
            y: 50,
            w: 200,
            h: 150,
          },
        };
        const res = await createWidget(newComponentData);
        if (res.success && res.data) {
          const newWidget = res.data as Widget;
          const newComponent = widgetToCanvasComponent(newWidget);
          setCanvasComponents([...canvasComponents, newComponent]);
        }
      } catch (e: unknown) {
        logger.error('Failed to create widget:', e);
      }
    }
    setIsDragging(false);
  };

  const handleDeleteComponent = async (id: string) => {
    try {
      const res = await deleteWidget(id);
      if (res.success) {
        setCanvasComponents(canvasComponents.filter((c) => c.id !== id));
        if (selectedComponent === id) {
          setSelectedComponent(null);
        }
      }
    } catch (e: unknown) {
      logger.error('Failed to delete widget:', e);
    }
  };

  const handleUpdateComponent = async (id: string, updates: Partial<CanvasComponent>) => {
    const comp = canvasComponents.find((c) => c.id === id);
    if (!comp) return;
    try {
      const updatedComp = { ...comp, ...updates };
      const widgetData = canvasComponentToWidgetData(updatedComp);
      const res = await updateWidget(id, widgetData);
      if (res.success) {
        setCanvasComponents(canvasComponents.map((c) => (c.id === id ? updatedComp : c)));
      }
    } catch (e: unknown) {
      logger.error('Failed to update widget:', e);
    }
  };

  const getComponentIcon = (type: string) => {
    const comp = componentList.find((c) => c.type === type);
    return comp?.icon || <BoxIcon size={20} />;
  };

  // 构建统计数据卡片
  const statsCards: StatCard[] = [
    {
      id: 'total-components',
      title: '组件总数',
      value: canvasComponents.length,
      icon: <BoxIcon size={24} />,
      color: 'primary',
    },
    {
      id: 'component-types',
      title: '组件类型',
      value: new Set(canvasComponents.map((c) => c.type)).size,
      icon: <Settings size={24} />,
      color: 'info',
    },
  ];

  if (loading) {
    return (
      <PageContainer
        title='可视化编辑器'
        subtitle='拖拽组件创建可视化报表'
        padding={false}
        maxWidth={false}
      >
        <DashboardTemplate
          title=''
          subtitle=''
          breadcrumbs={[
            { label: '首页', href: '/dashboard' },
            { label: 'BI' },
            { label: '可视化编辑' },
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
      title='可视化编辑器'
      subtitle='拖拽组件创建可视化报表'
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: '首页', href: '/dashboard' },
          { label: 'BI' },
          { label: '可视化编辑' },
        ]}
        stats={statsCards}
        loading={loading}
        onRefresh={handleRefresh}
      >
        <Box sx={{ display: 'flex', gap: 3, height: 'calc(100vh - 280px)' }}>
          <Card sx={{ width: 280, display: 'flex', flexDirection: 'column' }}>
            <CardHeader
              title='组件列表'
              avatar={<Settings size={20} />}
              action={
                <Box sx={{ display: 'flex', gap: 0.5, pr: 1 }}>
                  <Tooltip title='网格视图'>
                    <IconButton
                      size='small'
                      onClick={() => setViewMode('grid')}
                      color={viewMode === 'grid' ? 'primary' : 'default'}
                    >
                      <Grid3X3 size={16} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title='列表视图'>
                    <IconButton
                      size='small'
                      onClick={() => setViewMode('list')}
                      color={viewMode === 'list' ? 'primary' : 'default'}
                    >
                      <List size={16} />
                    </IconButton>
                  </Tooltip>
                </Box>
              }
            />
            <CardContent sx={{ flex: 1, overflow: 'auto' }}>
              <TextField
                placeholder='搜索组件...'
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
                        color='#94a3b8'
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
                  label='组件类型'
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
              title='画布区域'
              subheader='拖拽组件到此处进行可视化编辑'
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
                bgcolor: 'white',
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
                          {comp.type === 'bar' && '柱状图'}
                          {comp.type === 'line' && '折线图'}
                          {comp.type === 'pie' && '饼图'}
                          {comp.type === 'gauge' && '仪表盘'}
                          {comp.type === 'table' && '数据表格'}
                          {comp.type === 'text' && '文本内容'}
                          {comp.type === 'image' && '图片'}
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
            <CardHeader title='属性配置' />
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
                          label='标题'
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
                              label='宽度'
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
                              label='高度'
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

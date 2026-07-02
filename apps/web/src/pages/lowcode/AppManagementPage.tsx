import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  TextField,
  InputAdornment,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { Search, Plus, LayoutGrid, List, Filter } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { listApps, createApp, deleteApp } from '../../api/lowcode';
import type { LowCodeApp } from '../../api/lowcode/types';
import AppCard from '../../components/lowcode/AppCard';
import AppPublishDialog from '../../components/lowcode/AppPublishDialog';
import { useNavigate } from 'react-router-dom';

const AppManagementPage = () => {
  const navigate = useNavigate();
  const [apps, setApps] = useState<LowCodeApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newApp, setNewApp] = useState({ name: '', label: '', description: '', category: '' });

  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [publishingApp, setPublishingApp] = useState<LowCodeApp | null>(null);

  useEffect(() => {
    loadApps();
  }, [page, pageSize, statusFilter]);

  const loadApps = async () => {
    setLoading(true);
    try {
      const res = await listApps({
        page,
        pageSize,
        status: statusFilter || undefined,
        search: searchTerm || undefined,
      });
      if (res.success) {
        setApps(res.data.items || []);
        setTotal(res.data.total || 0);
      }
    } catch (error) {
      console.error('Failed to load apps:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPage(1);
  };

  const handleCreateApp = async () => {
    try {
      const res = await createApp(newApp);
      if (res.success) {
        setCreateDialogOpen(false);
        loadApps();
      }
    } catch (error) {
      console.error('Failed to create app:', error);
    }
  };

  const handleDeleteApp = async (appId: string) => {
    if (window.confirm('确定要删除这个应用吗？')) {
      try {
        await deleteApp(appId);
        loadApps();
      } catch (error) {
        console.error('Failed to delete app:', error);
      }
    }
  };

  const handlePublishApp = async (app: LowCodeApp) => {
    setPublishingApp(app);
    setPublishDialogOpen(true);
  };

  const handlePublish = async (_params: { version: string; description: string }) => {
    if (publishingApp) {
      // publishing handled by parent dialog
    }
  };

  return (
    <PageContainer
      title='应用管理'
      subtitle='管理所有低代码应用'
      loading={loading}
      headerActions={
        <Button
          variant='contained'
          startIcon={<Plus style={{ width: 18, height: 18 }} />}
          onClick={() => setCreateDialogOpen(true)}
        >
          新建应用
        </Button>
      }
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            placeholder='搜索应用...'
            size='small'
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            sx={{ width: 300 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position='start'>
                    <Search style={{ width: 18, height: 18 }} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <FormControl
            size='small'
            sx={{ width: 150 }}
          >
            <InputLabel>状态</InputLabel>
            <Select
              value={statusFilter}
              label='状态'
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <MenuItem value=''>全部</MenuItem>
              <MenuItem value='draft'>草稿</MenuItem>
              <MenuItem value='published'>已发布</MenuItem>
              <MenuItem value='archived'>已归档</MenuItem>
            </Select>
          </FormControl>
          <Box sx={{ flex: 1 }} />
          <ToggleButtonGroup
            size='small'
            value={viewMode}
            exclusive
            onChange={(_, v) => v && setViewMode(v)}
          >
            <ToggleButton value='grid'>
              <LayoutGrid style={{ width: 18, height: 18 }} />
            </ToggleButton>
            <ToggleButton value='list'>
              <List style={{ width: 18, height: 18 }} />
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Grid
          container
          spacing={2}
        >
          {apps.map((app) => (
            <Grid
              size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
              key={app.id}
            >
              <AppCard
                app={app}
                onClick={() => navigate(`/lowcode/apps/${app.id}`)}
                onEdit={() => navigate(`/lowcode/apps/${app.id}`)}
                onPublish={() => handlePublishApp(app)}
                onDelete={() => handleDeleteApp(app.id)}
              />
            </Grid>
          ))}
        </Grid>

        {apps.length === 0 && !loading && (
          <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
            <Box
              component='div'
              sx={{ fontSize: 64, mb: 2, opacity: 0.3 }}
            >
              📱
            </Box>
            <p>暂无应用</p>
            <Button
              variant='contained'
              startIcon={<Plus style={{ width: 16, height: 16 }} />}
              onClick={() => setCreateDialogOpen(true)}
              sx={{ mt: 2 }}
            >
              创建第一个应用
            </Button>
          </Box>
        )}
      </Box>

      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>新建应用</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label='应用名称'
              value={newApp.name}
              onChange={(e) => setNewApp({ ...newApp, name: e.target.value })}
              size='small'
              helperText='英文标识，用于URL和代码引用'
            />
            <TextField
              label='应用显示名'
              value={newApp.label}
              onChange={(e) => setNewApp({ ...newApp, label: e.target.value })}
              size='small'
            />
            <TextField
              label='描述'
              value={newApp.description}
              onChange={(e) => setNewApp({ ...newApp, description: e.target.value })}
              size='small'
              multiline
              rows={3}
            />
            <FormControl size='small'>
              <InputLabel>分类</InputLabel>
              <Select
                value={newApp.category}
                label='分类'
                onChange={(e) => setNewApp({ ...newApp, category: e.target.value })}
              >
                <MenuItem value='业务管理'>业务管理</MenuItem>
                <MenuItem value='数据分析'>数据分析</MenuItem>
                <MenuItem value='办公协同'>办公协同</MenuItem>
                <MenuItem value='客户关系'>客户关系</MenuItem>
                <MenuItem value='人力资源'>人力资源</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
          <Button
            variant='contained'
            onClick={handleCreateApp}
          >
            创建
          </Button>
        </DialogActions>
      </Dialog>

      <AppPublishDialog
        open={publishDialogOpen}
        app={publishingApp}
        onClose={() => setPublishDialogOpen(false)}
        onPublish={handlePublish}
      />
    </PageContainer>
  );
};

export default AppManagementPage;

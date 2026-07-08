import { useState, useEffect } from 'react';
import {
  Box,
  IconButton,
  Typography,
  Breadcrumbs,
  Link,
  Chip,
  Button,
  Skeleton,
} from '@mui/material';
import { ArrowLeft, Database, Save, Upload } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageContainer } from '@/components/common';
import { getDataModel, updateDataModel, listDataModels, publishModel } from '../../api/lowcode';
import type { DataModel } from '../../api/lowcode/types';
import DataModelDesigner from '../../components/lowcode/DataModelDesigner';
import { logger } from '@/utils/logger';

const DataModelDesignerPage = () => {
  const { modelId } = useParams<{ modelId: string }>();
  const navigate = useNavigate();
  const [model, setModel] = useState<DataModel | null>(null);
  const [allModels, setAllModels] = useState<DataModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (modelId) {
      loadData();
    }
  }, [modelId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [modelRes, allRes] = await Promise.all([
        getDataModel(modelId!),
        listDataModels({ pageSize: 100 }),
      ]);
      if (modelRes.success) setModel(modelRes.data || null);
      if (allRes.success) setAllModels(allRes.data.items || []);
    } catch (error) {
      logger.error('Failed to load model:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (updatedModel: DataModel) => {
    setSaving(true);
    try {
      const res = await updateDataModel(updatedModel.id, updatedModel);
      if (res.success) {
        setModel(updatedModel);
      }
    } catch (error) {
      logger.error('Failed to save model:', error);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (id: string) => {
    try {
      const res = await publishModel(id);
      if (res.success) {
        loadData();
      }
    } catch (error) {
      logger.error('Failed to publish model:', error);
    }
  };

  const statusLabels: Record<string, string> = {
    draft: '草稿',
    published: '已发布',
    archived: '已归档',
  };

  const statusColors: Record<string, 'default' | 'success' | 'warning'> = {
    draft: 'default',
    published: 'success',
    archived: 'warning',
  };

  return (
    <PageContainer
      loading={loading}
      headerContent={
        <Box>
          <Breadcrumbs sx={{ mb: 1, fontSize: '0.875rem' }}>
            <Link
              underline='hover'
              color='inherit'
              onClick={() => navigate('/lowcode/models')}
              sx={{ cursor: 'pointer' }}
            >
              数据模型
            </Link>
            <Typography color='text.primary'>
              {loading ? <Skeleton width={100} /> : model?.label}
            </Typography>
          </Breadcrumbs>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton
              onClick={() => navigate('/lowcode/models')}
              size='small'
            >
              <ArrowLeft style={{ width: 20, height: 20 }} />
            </IconButton>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1,
                bgcolor: 'secondary.light',
                color: 'secondary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Database style={{ width: 20, height: 20 }} />
            </Box>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 600 }}
                >
                  {loading ? <Skeleton width={150} /> : model?.label}
                </Typography>
                {model && (
                  <Chip
                    label={statusLabels[model.status]}
                    size='small'
                    color={statusColors[model.status]}
                    variant='outlined'
                  />
                )}
              </Box>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {loading ? <Skeleton width={200} /> : model?.name}
              </Typography>
            </Box>
          </Box>
        </Box>
      }
      headerActions={
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant='outlined'
            startIcon={<Upload style={{ width: 16, height: 16 }} />}
            size='small'
            onClick={() => model && handlePublish(model.id)}
            disabled={model?.status === 'published'}
          >
            发布
          </Button>
          <Button
            variant='contained'
            startIcon={<Save style={{ width: 16, height: 16 }} />}
            size='small'
            onClick={() => model && handleSave(model)}
            disabled={saving}
          >
            {saving ? '保存中...' : '保存'}
          </Button>
        </Box>
      }
    >
      <Box sx={{ height: 'calc(100vh - 200px)', minHeight: 500 }}>
        {!loading && model ? (
          <DataModelDesigner
            model={model}
            models={allModels}
            onSave={handleSave}
            onPublish={handlePublish}
          />
        ) : (
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}
          >
            <Typography color='text.secondary'>加载中...</Typography>
          </Box>
        )}
      </Box>
    </PageContainer>
  );
};

export default DataModelDesignerPage;

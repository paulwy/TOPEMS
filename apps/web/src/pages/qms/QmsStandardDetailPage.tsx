import React, { useState, useEffect } from 'react';
import { apiLogger } from '@/utils/logger';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, Calendar, User, FileCheck, Edit3, Plus, Download, Upload } from 'lucide-react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Box,
  Typography,
  Button,
} from '@mui/material';

import { DetailPageTemplate, ListPageTemplate, type ColumnDef } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { qmsApi } from '@/api/qms';
import type { QualityStandard, StandardRevision } from '@/api/qms';
import { useNotificationStore } from '@/store';
import { designTokens } from '@/theme/tokens';
import { QMS_PATHS } from '@/modules/qms/config';

const ct = designTokens.colors;

const QmsStandardDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [standard, setStandard] = useState<QualityStandard | null>(null);
  const [revisions, setRevisions] = useState<StandardRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    code: '',
    description: '',
    version: '',
    status: 'active',
    category: '',
    effective_date: '',
  });
  const addNotification = useNotificationStore((state) => state.addNotification);

  useEffect(() => {
    if (id) {
      loadStandardDetail(id);
    }
  }, [id]);

  const loadStandardDetail = async (standardId: string) => {
    try {
      setLoading(true);
      const [standardRes, revisionsRes] = await Promise.all([
        qmsApi.getStandard(standardId),
        qmsApi.listRevisions(standardId),
      ]);

      if (standardRes.success && standardRes.data) {
        setStandard(standardRes.data as QualityStandard);
        const data = standardRes.data as QualityStandard;
        setFormData({
          title: data.title || '',
          code: data.code || '',
          description: data.description || '',
          version: data.version || '',
          status: data.status || 'active',
          category: data.category || '',
          effective_date: data.effective_date
            ? new Date(data.effective_date).toISOString().split('T')[0]
            : '',
        });
      } else if (!standardRes.success) {
        addNotification({
          title: '加载失败',
          message: standardRes.message || '加载质量标准详情失败',
          type: 'error',
        });
      }

      if (revisionsRes.success && revisionsRes.data) {
        const revisionsData = revisionsRes.data as any;
        const revisionsArray = Array.isArray(revisionsData)
          ? revisionsData
          : revisionsData.revisions || [];
        setRevisions(revisionsArray);
      }
    } catch (error: unknown) {
      apiLogger.error('加载质量标准详情失败:', error);
      addNotification({
        title: '加载失败',
        message: '加载质量标准详情失败',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; label: string }> = {
      active: { color: 'bg-green-100 text-green-700', label: '有效' },
      有效: { color: 'bg-green-100 text-green-700', label: '有效' },
      draft: { color: 'bg-yellow-100 text-yellow-700', label: '草稿' },
      草稿: { color: 'bg-yellow-100 text-yellow-700', label: '草稿' },
      expired: { color: 'bg-red-100 text-red-700', label: '已过期' },
      已过期: { color: 'bg-red-100 text-red-700', label: '已过期' },
      archived: { color: 'bg-gray-100 text-gray-700', label: '已归档' },
      已归档: { color: 'bg-gray-100 text-gray-700', label: '已归档' },
    };
    const item = statusMap[status] || {
      color: 'bg-gray-100 text-gray-700',
      label: status,
    };
    return (
      <Chip
        label={item.label}
        size='small'
        sx={{
          backgroundColor: item.color.includes('green')
            ? 'success.lighter'
            : item.color.includes('yellow')
              ? 'warning.100'
              : item.color.includes('red')
                ? 'error.lighter'
                : 'grey.100',
          color: item.color.includes('green')
            ? 'success.700'
            : item.color.includes('yellow')
              ? ct.yellow[700]
              : item.color.includes('red')
                ? 'error.darker'
                : 'text.secondary',
        }}
      />
    );
  };

  const handleUpdateStandard = async () => {
    if (!standard) return;
    try {
      setSubmitting(true);
      const response = await qmsApi.updateStandard(standard.id, {
        name: formData.title,
        code: formData.code,
        description: formData.description,
        version: formData.version,
        status: formData.status,
        category: formData.category,
        content: standard.content || '',
        effective_date: formData.effective_date,
      });
      if (response.success) {
        addNotification({
          title: '成功',
          message: '质量标准更新成功',
          type: 'success',
        });
        setShowEditModal(false);
        loadStandardDetail(standard.id);
      } else {
        addNotification({
          title: '失败',
          message: response.message || '更新质量标准失败',
          type: 'error',
        });
      }
    } catch (error: unknown) {
      apiLogger.error('更新质量标准失败:', error);
      addNotification({
        title: '错误',
        message: '更新质量标准时发生错误',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateRevision = async () => {
    if (!standard) return;
    try {
      setSubmitting(true);
      const newVersion = formData.version || standard.version || '1.0';
      const [major, minor] = newVersion.split('.').map(Number);
      const nextVersion = `${major}.${minor + 1}`;

      const response = await qmsApi.createStandard({
        name: standard.name,
        code: `${standard.code}-v${nextVersion}`,
        version: nextVersion,
        description: `升级至版本 ${nextVersion}`,
        category: standard.category,
        content: standard.content,
        status: 'draft',
        effective_date: new Date().toISOString().split('T')[0],
      });
      if (response.success) {
        addNotification({
          title: '成功',
          message: '新版本创建成功',
          type: 'success',
        });
        setShowRevisionModal(false);
        navigate(QMS_PATHS.standards);
      } else {
        addNotification({
          title: '失败',
          message: response.message || '创建版本失败',
          type: 'error',
        });
      }
    } catch (error: unknown) {
      apiLogger.error('创建版本失败:', error);
      addNotification({
        title: '错误',
        message: '创建版本时发生错误',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const revisionColumns: ColumnDef<StandardRevision>[] = [
    {
      id: 'version',
      label: '版本号',
      render: (row) => (
        <Chip
          label={`v${row.version}`}
          size='small'
          sx={{ backgroundColor: 'secondary.100', color: 'secondary.dark' }}
        />
      ),
    },
    {
      id: 'description',
      label: '变更说明',
      render: (row) => row.description,
    },
    {
      id: 'created_at',
      label: '创建时间',
      render: (row) => (
        <span>{row.created_at ? new Date(row.created_at).toLocaleString('zh-CN') : '-'}</span>
      ),
    },
    {
      id: 'created_by',
      label: '创建人',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <User sx={{ width: 16, height: 16 }} />
          <span>{row.created_by || '-'}</span>
        </Box>
      ),
    },
  ];

  if (!loading && !standard) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(135deg, ${ct.background.default} 0%, grey.100 100%)`,
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              color: 'error.main',
              mx: 'auto',
              mb: 2,
            }}
            component='svg'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth={2}
          >
            <circle
              cx={12}
              cy={12}
              r={10}
            />
            <line
              x1={12}
              y1={8}
              x2={12}
              y2={12}
            />
            <line
              x1={12}
              y1={16}
              x2={12.01}
              y2={16}
            />
          </Box>
          <Typography sx={{ color: 'grey.600', mb: 2 }}>质量标准不存在或已被删除</Typography>
          <Button onClick={() => navigate(QMS_PATHS.root)}>返回列表</Button>
        </Box>
      </Box>
    );
  }

  return (
    <PageContainer
      title='质量标准详情'
      subtitle='Quality Standard Detail'
    >
      <DetailPageTemplate
        title=''
        subtitle=''
        backHref={QMS_PATHS.root}
        onBack={() => navigate(QMS_PATHS.root)}
        onEdit={() => setShowEditModal(true)}
        loading={loading}
        infoCard={{
          title: standard?.name,
          subtitle: standard?.code || standard?.id,
          tags: [
            standard?.status === 'active' ? '有效' : standard?.status || '',
            `v${standard?.version || '1.0'}`,
          ].filter(Boolean),
          stats: [
            { label: '版本', value: `v${standard?.version || '1.0'}` },
            { label: '分类', value: standard?.category || '-' },
          ],
        }}
        sidebar={
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography
              variant='subtitle1'
              sx={{ fontWeight: 600 }}
            >
              操作
            </Typography>
            <Button
              fullWidth
              sx={{ justifyContent: 'flex-start' }}
              variant='outlined'
              startIcon={<Download sx={{ width: 16, height: 16 }} />}
            >
              下载标准文档
            </Button>
            <Button
              fullWidth
              sx={{ justifyContent: 'flex-start' }}
              variant='outlined'
              startIcon={<Upload sx={{ width: 16, height: 16 }} />}
            >
              上传新版本文件
            </Button>
          </Box>
        }
        tabs={[
          {
            id: 'info',
            label: '标准信息',
            icon: <FileText style={{ width: 16, height: 16 }} />,
            content: (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography
                      variant='body2'
                      sx={{ color: 'text.secondary' }}
                    >
                      标准编号
                    </Typography>
                    <Typography sx={{ fontWeight: 500, mt: 0.5 }}>
                      {standard?.code || standard?.id}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      variant='body2'
                      sx={{ color: 'text.secondary' }}
                    >
                      状态
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>{getStatusBadge(standard?.status || '')}</Box>
                  </Box>
                </Box>
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    标准名称
                  </Typography>
                  <Typography sx={{ fontWeight: 500, mt: 0.5 }}>{standard?.name}</Typography>
                </Box>
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    分类
                  </Typography>
                  <Typography sx={{ mt: 0.5 }}>{standard?.category || '-'}</Typography>
                </Box>
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    生效日期
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      mt: 0.5,
                    }}
                  >
                    <Calendar sx={{ width: 16, height: 16 }} />
                    {standard?.effective_date
                      ? new Date(standard.effective_date).toLocaleDateString('zh-CN')
                      : '-'}
                  </Box>
                </Box>
                <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 3 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    标准描述
                  </Typography>
                  <Typography
                    sx={{
                      mt: 1,
                      fontSize: '0.875rem',
                      lineHeight: 1.6,
                    }}
                  >
                    {standard?.description || '暂无描述'}
                  </Typography>
                </Box>
              </Box>
            ),
          },
          {
            id: 'history',
            label: '版本历史',
            icon: <FileCheck style={{ width: 16, height: 16 }} />,
            badge: revisions.length,
            content:
              revisions.length > 0 ? (
                <ListPageTemplate
                  columns={revisionColumns}
                  data={revisions}
                  loading={loading}
                  pagination={{
                    page: 0,
                    pageSize: 10,
                    total: revisions.length,
                    onPageChange: () => {},
                  }}
                />
              ) : (
                <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                  <FileText
                    style={{
                      width: 64,
                      height: 64,
                      margin: '0 auto 16px auto',
                      opacity: 0.5,
                    }}
                  />
                  <Typography>暂无版本记录</Typography>
                  <Button
                    variant='outlined'
                    size='small'
                    sx={{ mt: 2 }}
                    onClick={() => setShowRevisionModal(true)}
                    startIcon={<Plus style={{ width: 12, height: 12 }} />}
                  >
                    创建第一个版本
                  </Button>
                </Box>
              ),
          },
        ]}
        actions={[
          {
            label: '新建版本',
            icon: <Plus style={{ width: 16, height: 16 }} />,
            onClick: () => setShowRevisionModal(true),
            variant: 'outlined',
          },
        ]}
      />

      <Dialog
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle>编辑质量标准</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box>
                <Box
                  component='label'
                  sx={{
                    display: 'block',
                    mb: 0.5,
                    fontSize: '0.875rem',
                    color: 'text.secondary',
                  }}
                >
                  标准编号 *
                </Box>
                <TextField
                  size='small'
                  fullWidth
                  value={formData.code}
                  onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value }))}
                  placeholder='请输入标准编号'
                />
              </Box>
              <Box>
                <Box
                  component='label'
                  sx={{
                    display: 'block',
                    mb: 0.5,
                    fontSize: '0.875rem',
                    color: 'text.secondary',
                  }}
                >
                  版本号
                </Box>
                <TextField
                  size='small'
                  fullWidth
                  value={formData.version}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      version: e.target.value,
                    }))
                  }
                  placeholder='如 1.0'
                />
              </Box>
            </Box>
            <Box>
              <Box
                component='label'
                sx={{
                  display: 'block',
                  mb: 0.5,
                  fontSize: '0.875rem',
                  color: 'text.secondary',
                }}
              >
                标准名称 *
              </Box>
              <TextField
                size='small'
                fullWidth
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder='请输入标准名称'
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box>
                <Box
                  component='label'
                  sx={{
                    display: 'block',
                    mb: 0.5,
                    fontSize: '0.875rem',
                    color: 'text.secondary',
                  }}
                >
                  分类
                </Box>
                <TextField
                  size='small'
                  fullWidth
                  value={formData.category}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  placeholder='请输入分类'
                />
              </Box>
              <Box>
                <Box
                  component='label'
                  sx={{
                    display: 'block',
                    mb: 0.5,
                    fontSize: '0.875rem',
                    color: 'text.secondary',
                  }}
                >
                  状态
                </Box>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '8px',
                    border: '1px solid border.default',
                  }}
                >
                  <option value='active'>有效</option>
                  <option value='draft'>草稿</option>
                  <option value='expired'>已过期</option>
                  <option value='archived'>已归档</option>
                </select>
              </Box>
            </Box>
            <Box>
              <Box
                component='label'
                sx={{
                  display: 'block',
                  mb: 0.5,
                  fontSize: '0.875rem',
                  color: 'text.secondary',
                }}
              >
                生效日期
              </Box>
              <TextField
                type='date'
                size='small'
                fullWidth
                value={formData.effective_date}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    effective_date: e.target.value,
                  }))
                }
              />
            </Box>
            <Box>
              <Box
                component='label'
                sx={{
                  display: 'block',
                  mb: 0.5,
                  fontSize: '0.875rem',
                  color: 'text.secondary',
                }}
              >
                描述
              </Box>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder='请输入标准描述...'
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '6px',
                  border: '1px solid border.default',
                  resize: 'none',
                  height: '96px',
                }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowEditModal(false)}
            disabled={submitting}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleUpdateStandard}
            disabled={submitting}
          >
            {submitting ? '保存中...' : '保存更改'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showRevisionModal}
        onClose={() => setShowRevisionModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>新建版本</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Box
                component='span'
                sx={{ color: 'text.secondary' }}
              >
                当前版本:
              </Box>
              <Box
                component='span'
                sx={{ fontWeight: 500 }}
              >
                {standard?.version}
              </Box>
            </Box>
            <Box sx={{ color: 'text.secondary', mt: 2 }}>
              创建新版本后，版本号将自动递增（如 1.0 → 1.1）
            </Box>
            <Box sx={{ mt: 2 }}>
              <Box
                component='label'
                sx={{
                  display: 'block',
                  mb: 0.5,
                  fontSize: '0.875rem',
                  color: 'text.secondary',
                }}
              >
                变更说明
              </Box>
              <textarea
                placeholder='请描述本次版本变更的内容...'
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '6px',
                  border: '1px solid border.default',
                  resize: 'none',
                  height: '96px',
                }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowRevisionModal(false)}
            disabled={submitting}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleCreateRevision}
            disabled={submitting}
            sx={{
              backgroundColor: 'secondary.dark',
              '&:hover': { backgroundColor: ct.purple[700] },
            }}
          >
            {submitting ? '创建中...' : '创建版本'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default QmsStandardDetailPage;

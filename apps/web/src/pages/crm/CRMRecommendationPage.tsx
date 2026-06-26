import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Paper,
  LinearProgress,
} from '@mui/material';
import {
  Lightbulb,
  TrendingUp,
  Package,
  ShoppingCart,
  FileText,
  Users,
  Target,
  Star,
  Eye,
  Sparkles,
} from 'lucide-react';
import { useAppStore } from '../../store';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
} from '@/components/templates';
import { crmApi } from '@/api/crm';
import type {
  RecommendationResult,
  RecommendationItem,
  RecommendationRequest,
} from '@/api/crm';

const CRMRecommendationPage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);
  const [recommendations, setRecommendations] = useState<RecommendationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecommendation, setSelectedRecommendation] = useState<RecommendationResult | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [formData, setFormData] = useState<RecommendationRequest>({
    customer_id: '',
    recommendation_type: 'product',
    top_k: 10,
  });

  const loadRecommendations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await crmApi.customerRecommendation.list({
        page: 1,
        pageSize: 50,
      });
      if (res.success && res.data) {
        setRecommendations(res.data.items || []);
      }
    } catch (err) {
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载客户推荐数据',
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  const loadCustomers = useCallback(async () => {
    try {
      const res = await crmApi.customers.list({ page: 1, pageSize: 100 });
      if (res.success && res.data) {
        setCustomers(res.data.items || []);
      }
    } catch (err) {
      // 静默失败
    }
  }, []);

  useEffect(() => {
    loadRecommendations();
    loadCustomers();
  }, [loadRecommendations, loadCustomers]);

  const handleCreateRecommendation = async () => {
    if (!formData.customer_id) {
      addNotification({
        type: 'warning',
        title: '提示',
        message: '请选择客户',
      });
      return;
    }

    try {
      setLoading(true);
      const res = await crmApi.customerRecommendation.create(formData);
      if (res.success) {
        addNotification({
          type: 'success',
          title: '成功',
          message: '推荐生成成功',
        });
        setShowCreateDialog(false);
        setFormData({
          customer_id: '',
          recommendation_type: 'product',
          top_k: 10,
        });
        loadRecommendations();
      }
    } catch (err) {
      addNotification({
        type: 'error',
        title: '失败',
        message: '推荐生成失败',
      });
    } finally {
      setLoading(false);
    }
  };

  const getRecommendationTypeIcon = (type: string): React.ReactElement => {
    const icons: Record<string, React.ReactElement> = {
      product: <Package size={16} />,
      opportunity: <Target size={16} />,
      service: <Users size={16} />,
      'cross-sell': <ShoppingCart size={16} />,
      upsell: <TrendingUp size={16} />,
      content: <FileText size={16} />,
      general: <Lightbulb size={16} />,
    };
    return icons[type] || <Lightbulb size={16} />;
  };

  const getRecommendationTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      product: '产品推荐',
      opportunity: '商机推荐',
      service: '服务推荐',
      'cross-sell': '交叉销售',
      upsell: '增值销售',
      content: '内容推荐',
      general: '综合推荐',
    };
    return labels[type] || type;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'success';
    if (confidence >= 0.7) return 'primary';
    if (confidence >= 0.5) return 'warning';
    return 'error';
  };

  const columns: ColumnDef<RecommendationResult>[] = [
    {
      id: 'customer_name',
      label: '客户名称',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {row.customer_name}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'recommendation_type',
      label: '推荐类型',
      render: (row) => (
        <Chip
          icon={getRecommendationTypeIcon(row.recommendation_type)}
          label={getRecommendationTypeLabel(row.recommendation_type)}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      id: 'recommendations_count',
      label: '推荐数量',
      render: (row) => (
        <Typography variant="body2" color="text.secondary">
          {row.recommendations.length} 项
        </Typography>
      ),
    },
    {
      id: 'confidence',
      label: '置信度',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LinearProgress
            variant="determinate"
            value={row.confidence * 100}
            sx={{ width: 100, height: 6, borderRadius: 3 }}
            color={getConfidenceColor(row.confidence)}
          />
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {(row.confidence * 100).toFixed(0)}%
          </Typography>
        </Box>
      ),
    },
    {
      id: 'model',
      label: '模型',
      render: (row) => (
        <Chip
          icon={<Sparkles size={14} />}
          label={row.model}
          size="small"
          color="primary"
          variant="outlined"
        />
      ),
    },
    {
      id: 'created_at',
      label: '生成时间',
      render: (row) => (
        <Typography variant="body2" color="text.secondary">
          {new Date(row.created_at).toLocaleString('zh-CN')}
        </Typography>
      ),
    },
  ];

  const rowActions: RowAction<RecommendationResult>[] = [
    {
      label: '查看详情',
      icon: <Eye size={16} />,
      onClick: (row) => {
        setSelectedRecommendation(row);
        setShowDetailDialog(true);
      },
    },
  ];

  const RecommendationDetailDialog = () => (
    <Dialog
      open={showDetailDialog}
      onClose={() => setShowDetailDialog(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Lightbulb size={20} />
          <Typography variant="h6">推荐详情</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        {selectedRecommendation && (
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid size={12}>
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    基本信息
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                    <Typography variant="body2">
                      客户: {selectedRecommendation.customer_name}
                    </Typography>
                    <Typography variant="body2">
                      类型: {getRecommendationTypeLabel(selectedRecommendation.recommendation_type)}
                    </Typography>
                    <Typography variant="body2">
                      置信度: {(selectedRecommendation.confidence * 100).toFixed(0)}%
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
              <Grid size={12}>
                <Typography variant="subtitle2" gutterBottom>
                  推荐项目 ({selectedRecommendation.recommendations.length})
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {selectedRecommendation.recommendations.map((item, index) => (
                    <Card key={item.id || index} variant="outlined">
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                              {item.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                              {item.reason}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                              <Chip
                                label={`类型: ${item.item_type}`}
                                size="small"
                                variant="outlined"
                              />
                              <Chip
                                label={`评分: ${item.score}`}
                                size="small"
                                color="primary"
                                icon={<Star size={14} />}
                              />
                            </Box>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="h6" color={getConfidenceColor(item.confidence)}>
                              {(item.confidence * 100).toFixed(0)}%
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              置信度
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setShowDetailDialog(false)}>关闭</Button>
      </DialogActions>
    </Dialog>
  );

  const CreateRecommendationDialog = () => (
    <Dialog
      open={showCreateDialog}
      onClose={() => setShowCreateDialog(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Sparkles size={20} />
          <Typography variant="h6">生成客户推荐</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <FormControl fullWidth>
            <InputLabel>选择客户</InputLabel>
            <Select
              value={formData.customer_id}
              onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
              label="选择客户"
            >
              {customers.map((customer) => (
                <MenuItem key={customer.id} value={customer.id}>
                  {customer.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>推荐类型</InputLabel>
            <Select
              value={formData.recommendation_type}
              onChange={(e) => setFormData({ ...formData, recommendation_type: e.target.value })}
              label="推荐类型"
            >
              <MenuItem value="product">产品推荐</MenuItem>
              <MenuItem value="opportunity">商机推荐</MenuItem>
              <MenuItem value="service">服务推荐</MenuItem>
              <MenuItem value="cross-sell">交叉销售</MenuItem>
              <MenuItem value="upsell">增值销售</MenuItem>
              <MenuItem value="content">内容推荐</MenuItem>
              <MenuItem value="general">综合推荐</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="推荐数量"
            type="number"
            value={formData.top_k}
            onChange={(e) => setFormData({ ...formData, top_k: parseInt(e.target.value) || 10 })}
            slotProps={{ input: { min: 1, max: 20 } }}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setShowCreateDialog(false)}>取消</Button>
        <Button
          variant="contained"
          onClick={handleCreateRecommendation}
          disabled={!formData.customer_id || loading}
          startIcon={<Sparkles size={16} />}
        >
          生成推荐
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box>
      <ListPageTemplate
        title="客户推荐"
        subtitle="基于 AI 的智能客户推荐系统"
        columns={columns}
        data={recommendations}
        loading={loading}
        rowActions={rowActions}
        actions={[
          {
            label: '生成推荐',
            icon: <Sparkles size={16} />,
            onClick: () => setShowCreateDialog(true),
            variant: 'contained',
          },
        ]}
      />
      <RecommendationDetailDialog />
      <CreateRecommendationDialog />
    </Box>
  );
};

export default CRMRecommendationPage;
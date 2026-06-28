import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Divider,
  Card,
  CardContent,
} from '@mui/material';

import { useCrmStore } from '../store/crmStore';
import type { Customer, Opportunity, Interaction, Contact, BillingRecord } from '../api/crm';
import { ArrowLeft } from 'lucide-react';
const ArrowBackIcon = ArrowLeft;

interface CustomerDetailPageProps {
  customerId?: string;
  onBack?: () => void;
}

export const CustomerDetailPage: React.FC<CustomerDetailPageProps> = ({ customerId, onBack }) => {
  const { loadCustomer, customers, loadOpportunities, opportunities, loadInteractions, interactions, loadContacts, contacts, loadBillings, billings } = useCrmStore();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      if (!customerId) {
        setError('缺少客户 ID');
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await loadCustomer(customerId);
        if (data) {
          setCustomer(data);
          await Promise.all([
            loadOpportunities({ customer_id: customerId, page: 1, pageSize: 5 }),
            loadInteractions({ customer_id: customerId, page: 1, pageSize: 5 }),
            loadContacts({ customer_id: customerId, page: 1, pageSize: 5 }),
            loadBillings({ customer_id: customerId, page: 1, pageSize: 5 }),
          ]);
        } else {
          setError('未找到客户');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载客户详情失败');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [customerId, loadCustomer, loadOpportunities, loadInteractions, loadContacts, loadBillings]);

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !customer) {
    return (
      <Box sx={{ p: 3 }}>
        {onBack && (
          <Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ mb: 2 }}>
            返回
          </Button>
        )}
        <Alert severity="error">{error || '客户不存在'}</Alert>
      </Box>
    );
  }

  const customerOpportunities: Opportunity[] = opportunities.filter((o) => o.customer_id === customer.id);
  const customerInteractions: Interaction[] = interactions.filter((i) => i.customer_id === customer.id);
  const customerContacts: Contact[] = contacts.filter((c) => c.customer_id === customer.id);
  const customerBillings: BillingRecord[] = billings.filter((b) => b.customer_id === customer.id);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        {onBack && (
          <Button startIcon={<ArrowBackIcon />} onClick={onBack}>
            返回
          </Button>
        )}
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            {customer.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            客户编码：{customer.code || '-'} · 行业：{customer.industry || '-'}
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                基本信息
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">客户类型</Typography>
                  <Typography variant="body2">{customer.customer_type || '-'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">评级</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      label={customer.rating || '未评级'}
                      size="small"
                      color={customer.rating === 'A' ? 'success' : 'default'}
                    />
                  </Box>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">状态</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      label={customer.status}
                      size="small"
                      color={customer.status === 'active' ? 'success' : 'default'}
                    />
                  </Box>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">来源</Typography>
                  <Typography variant="body2">{customer.source || '-'}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                联系信息
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">电话</Typography>
                  <Typography variant="body2">{customer.phone || '-'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">邮箱</Typography>
                  <Typography variant="body2">{customer.email || '-'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">网站</Typography>
                  <Typography variant="body2">{customer.website || '-'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">地址</Typography>
                  <Typography variant="body2">
                    {[customer.country, customer.province, customer.city, customer.address]
                      .filter(Boolean)
                      .join(' ') || '-'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                业务指标
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">年收入</Typography>
                  <Typography variant="body2">
                    {customer.revenue ? `¥${customer.revenue.toLocaleString()}` : '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">员工数</Typography>
                  <Typography variant="body2">
                    {customer.employee_count ? `${customer.employee_count} 人` : '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">创建时间</Typography>
                  <Typography variant="body2">
                    {new Date(customer.created_at).toLocaleDateString('zh-CN')}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              联系人 ({customerContacts.length})
            </Typography>
            {customerContacts.length === 0 ? (
              <Typography variant="body2" color="text.secondary">暂无联系人</Typography>
            ) : (
              customerContacts.map((contact) => (
                <Box
                  key={contact.id}
                  sx={{
                    py: 1.5,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {contact.first_name} {contact.last_name || ''}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {contact.position || '-'} · {contact.phone || contact.email || '-'}
                  </Typography>
                </Box>
              ))
            )}
          </Paper>
        </Grid>

        <Grid>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              销售机会 ({customerOpportunities.length})
            </Typography>
            {customerOpportunities.length === 0 ? (
              <Typography variant="body2" color="text.secondary">暂无销售机会</Typography>
            ) : (
              customerOpportunities.map((opportunity) => (
                <Box
                  key={opportunity.id}
                  sx={{
                    py: 1.5,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {opportunity.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ¥{(opportunity.value || 0).toLocaleString()} · 概率 {opportunity.probability || 0}%
                    </Typography>
                  </Box>
                  <Chip label={opportunity.stage} size="small" />
                </Box>
              ))
            )}
          </Paper>
        </Grid>

        <Grid>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              互动记录 ({customerInteractions.length})
            </Typography>
            {customerInteractions.length === 0 ? (
              <Typography variant="body2" color="text.secondary">暂无互动记录</Typography>
            ) : (
              customerInteractions.map((interaction) => (
                <Box
                  key={interaction.id}
                  sx={{
                    py: 1.5,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {interaction.subject || interaction.type}
                    </Typography>
                    <Chip label={interaction.status} size="small" />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {interaction.scheduled_at
                      ? new Date(interaction.scheduled_at).toLocaleString('zh-CN')
                      : '未排期'}
                  </Typography>
                </Box>
              ))
            )}
          </Paper>
        </Grid>

        <Grid>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              账单 ({customerBillings.length})
            </Typography>
            {customerBillings.length === 0 ? (
              <Typography variant="body2" color="text.secondary">暂无账单</Typography>
            ) : (
              customerBillings.map((billing) => (
                <Box
                  key={billing.id}
                  sx={{
                    py: 1.5,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {billing.invoice_no}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ¥{billing.amount.toLocaleString()} · 到期{' '}
                      {new Date(billing.due_date).toLocaleDateString('zh-CN')}
                    </Typography>
                  </Box>
                  <Chip
                    label={billing.status}
                    size="small"
                    color={
                      billing.status === 'paid'
                        ? 'success'
                        : billing.status === 'overdue'
                        ? 'error'
                        : 'default'
                    }
                  />
                </Box>
              ))
            )}
          </Paper>
        </Grid>
      </Grid>

      {customer.notes && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            备注
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {customer.notes}
          </Typography>
        </Paper>
      )}

      {customers.length === 0 && null}
    </Box>
  );
};

export default CustomerDetailPage;

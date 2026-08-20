/**
 * 员工财务信息Tab组件
 * 显示员工的银行账户、薪资、社保公积金等财务信息
 */

import React, { useState } from 'react';
import { logger } from '@/utils/logger';
import { useEmployeeFinanceInfo, useUpdateEmployeeFinanceInfo } from '@/hooks/useHrmFinance';
import {
  TextField,
  FormLabel,
  Chip,
  Card,
  CardContent,
  CardHeader,
  FormControl,
  Select,
  MenuItem,
  Box,
  Typography,
  Button,
  useTheme,
} from '@mui/material';
import { Banknote, DollarSign, Shield, Save, Edit2, X } from 'lucide-react';
import { designTokens } from '@/theme/tokens';

import { useTranslation } from 'react-i18next';

interface EmployeeFinanceTabProps {
  employeeId: string;
  employeeName: string;
}

const EmployeeFinanceTab: React.FC<EmployeeFinanceTabProps> = ({
  employeeId,
  employeeName,
}) => {
  const { t } = useTranslation();
  const { data, isLoading, error } = useEmployeeFinanceInfo(employeeId);
  const theme = useTheme();
  const ct = designTokens.colors;
  const updateFinanceInfo = useUpdateEmployeeFinanceInfo();

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});

  const financeInfo = data;

  const handleEdit = () => {
    if (financeInfo) {
      setEditData({ ...financeInfo });
    } else {
      setEditData({
        employee_id: employeeId,
        bank_card_number: '',
        bank_name: '',
        bank_branch: '',
        base_salary: 0,
        position_salary: 0,
        skill_salary: 0,
        social_security_base: 0,
        social_security_ratio: 0,
        housing_fund_base: 0,
        housing_fund_ratio: 0,
        cost_center_id: '',
        expense_account_id: '',
        status: 'active',
      });
    }
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({});
  };

  const handleSave = async () => {
    try {
      await updateFinanceInfo.mutateAsync({
        employeeId,
        data: editData,
      });
      setIsEditing(false);
    } catch (err: unknown) {
      logger.error('Failed to save:', err);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: '3px solid grey.200',
            borderTopColor: 'primary.dark',
            animation: 'spin 1s linear infinite',
            '@keyframes spin': {
              '0%': { transform: 'rotate(0deg)' },
              '100%': { transform: 'rotate(360deg)' },
            },
          }}
        />
      </Box>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent sx={{ py: 4 }}>
          <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
            <Typography>{t('hrm.employee_finance_tab.m1', { v1: error.message })}</Typography>
            <Button
              variant='outlined'
              onClick={handleEdit}
              sx={{ mt: 2 }}
            >
              {t('hrm.employee_finance_tab.e1')}
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const hasFinanceInfo = !!financeInfo;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* 操作栏 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant='h6'>{t('hrm.employee_finance_tab.k0')}</Typography>
          {hasFinanceInfo && (
            <Chip
              label={
                financeInfo.status === 'active'
                  ? t('hrm.employee_finance_tab.normal')
                  : t('hrm.employee_finance_tab.text_d70e9b')
              }
              color={financeInfo.status === 'active' ? 'primary' : 'default'}
              size='small'
            />
          )}
        </Box>
        {isEditing ? (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant='outlined'
              size='small'
              onClick={handleCancel}
            >
              <X style={{ width: 16, height: 16, marginRight: 4 }} />
              {t('hrm.employee_finance_tab.e2')}
            </Button>
            <Button
              size='small'
              variant='contained'
              onClick={handleSave}
              disabled={updateFinanceInfo.isPending}
              startIcon={<Save style={{ width: 16, height: 16, marginRight: 4 }} />}
            >
              {t('hrm.employee_finance_tab.e3')}
            </Button>
          </Box>
        ) : (
          <Button
            variant='outlined'
            size='small'
            onClick={handleEdit}
          >
            <Edit2 style={{ width: 16, height: 16, marginRight: 4 }} />
            {hasFinanceInfo
              ? t('hrm.employee_finance_tab.edit')
              : t('hrm.employee_finance_tab.text_2cb472')}
          </Button>
        )}
      </Box>

      {/* 银行账户信息 */}
      <Card>
        <CardHeader
          sx={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 1,
          }}
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Banknote style={{ width: 20, height: 20, color: theme.palette.primary.dark }} />
              <Typography variant='subtitle1'>{t('hrm.employee_finance_tab.k1')}</Typography>
            </Box>
          }
        />
        <CardContent>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 2,
            }}
          >
            <Box>
              <FormLabel sx={{ fontSize: 14, color: 'text.secondary' }}>
                {t('hrm.employee_finance_tab.k2')}
              </FormLabel>
              {isEditing ? (
                <TextField
                  value={editData.bank_name || ''}
                  onChange={(e) => setEditData({ ...editData, bank_name: e.target.value })}
                  size='small'
                  fullWidth
                  placeholder={t('hrm.employee_finance_tab.text_f2afc7')}
                  sx={{ mt: 0.5 }}
                />
              ) : (
                <Typography sx={{ mt: 0.5, fontWeight: 500 }}>
                  {financeInfo?.bank_name || '-'}
                </Typography>
              )}
            </Box>
            <Box>
              <FormLabel sx={{ fontSize: 14, color: 'text.secondary' }}>
                {t('hrm.employee_finance_tab.k3')}
              </FormLabel>
              {isEditing ? (
                <TextField
                  value={editData.bank_card_number || ''}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      bank_card_number: e.target.value,
                    })
                  }
                  size='small'
                  fullWidth
                  placeholder={t('hrm.employee_finance_tab.please_input')}
                  sx={{ mt: 0.5 }}
                />
              ) : (
                <Typography sx={{ mt: 0.5, fontFamily: 'monospace' }}>
                  {financeInfo?.bank_card_number || '-'}
                </Typography>
              )}
            </Box>
            <Box>
              <FormLabel sx={{ fontSize: 14, color: 'text.secondary' }}>
                {t('hrm.employee_finance_tab.k4')}
              </FormLabel>
              {isEditing ? (
                <TextField
                  value={editData.bank_branch || ''}
                  onChange={(e) => setEditData({ ...editData, bank_branch: e.target.value })}
                  size='small'
                  fullWidth
                  placeholder={t('hrm.employee_finance_tab.text_de2d47')}
                  sx={{ mt: 0.5 }}
                />
              ) : (
                <Typography sx={{ mt: 0.5, fontWeight: 500 }}>
                  {financeInfo?.bank_branch || '-'}
                </Typography>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* 薪资信息 */}
      <Card>
        <CardHeader
          sx={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 1,
          }}
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DollarSign style={{ width: 20, height: 20, color: theme.palette.success.dark }} />
              <Typography variant='subtitle1'>{t('hrm.employee_finance_tab.k5')}</Typography>
            </Box>
          }
        />
        <CardContent>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 2,
            }}
          >
            <Box>
              <FormLabel sx={{ fontSize: 14, color: 'text.secondary' }}>
                {t('hrm.employee_finance_tab.k6')}
              </FormLabel>
              {isEditing ? (
                <TextField
                  type='number'
                  value={editData.base_salary || 0}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      base_salary: parseFloat(e.target.value) || 0,
                    })
                  }
                  size='small'
                  fullWidth
                  sx={{ mt: 0.5 }}
                />
              ) : (
                <Typography sx={{ mt: 0.5, fontFamily: 'monospace', fontWeight: 500 }}>
                  ¥{(financeInfo?.base_salary || 0).toLocaleString('zh-CN')}
                </Typography>
              )}
            </Box>
            <Box>
              <FormLabel sx={{ fontSize: 14, color: 'text.secondary' }}>
                {t('hrm.employee_finance_tab.k7')}
              </FormLabel>
              {isEditing ? (
                <TextField
                  type='number'
                  value={editData.position_salary || 0}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      position_salary: parseFloat(e.target.value) || 0,
                    })
                  }
                  size='small'
                  fullWidth
                  sx={{ mt: 0.5 }}
                />
              ) : (
                <Typography sx={{ mt: 0.5, fontFamily: 'monospace', fontWeight: 500 }}>
                  ¥{(financeInfo?.position_salary || 0).toLocaleString('zh-CN')}
                </Typography>
              )}
            </Box>
            <Box>
              <FormLabel sx={{ fontSize: 14, color: 'text.secondary' }}>
                {t('hrm.employee_finance_tab.k8')}
              </FormLabel>
              {isEditing ? (
                <TextField
                  type='number'
                  value={editData.skill_salary || 0}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      skill_salary: parseFloat(e.target.value) || 0,
                    })
                  }
                  size='small'
                  fullWidth
                  sx={{ mt: 0.5 }}
                />
              ) : (
                <Typography sx={{ mt: 0.5, fontFamily: 'monospace', fontWeight: 500 }}>
                  ¥{(financeInfo?.skill_salary || 0).toLocaleString('zh-CN')}
                </Typography>
              )}
            </Box>
          </Box>

          {hasFinanceInfo && (
            <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {t('hrm.employee_finance_tab.e4')}
                </Typography>
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 'bold', color: 'success.main' }}
                >
                  ¥
                  {(
                    (financeInfo?.base_salary || 0) +
                    (financeInfo?.position_salary || 0) +
                    (financeInfo?.skill_salary || 0)
                  ).toLocaleString('zh-CN')}
                </Typography>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* 社保公积金 */}
      <Card>
        <CardHeader
          sx={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 1,
          }}
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Shield style={{ width: 20, height: 20, color: ct.warning[600] }} />
              <Typography variant='subtitle1'>{t('hrm.employee_finance_tab.k9')}</Typography>
            </Box>
          }
        />
        <CardContent>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 2,
            }}
          >
            <Box>
              <FormLabel sx={{ fontSize: 14, color: 'text.secondary' }}>
                {t('hrm.employee_finance_tab.k10')}
              </FormLabel>
              {isEditing ? (
                <TextField
                  type='number'
                  value={editData.social_security_base || 0}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      social_security_base: parseFloat(e.target.value) || 0,
                    })
                  }
                  size='small'
                  fullWidth
                  sx={{ mt: 0.5 }}
                />
              ) : (
                <Typography sx={{ mt: 0.5, fontFamily: 'monospace' }}>
                  ¥{(financeInfo?.social_security_base || 0).toLocaleString('zh-CN')}
                </Typography>
              )}
            </Box>
            <Box>
              <FormLabel sx={{ fontSize: 14, color: 'text.secondary' }}>
                {t('hrm.employee_finance_tab.k11')}
              </FormLabel>
              {isEditing ? (
                <TextField
                  type='number'
                  value={editData.social_security_ratio || 0}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      social_security_ratio: parseFloat((e.target as HTMLInputElement).value) || 0,
                    })
                  }
                  size='small'
                  fullWidth
                  placeholder={t('hrm.employee_finance_tab.text_5b6af8')}
                  sx={{ mt: 0.5 }}
                />
              ) : (
                <Typography sx={{ mt: 0.5, fontFamily: 'monospace' }}>
                  {((financeInfo?.social_security_ratio || 0) * 100).toFixed(1)}%
                </Typography>
              )}
            </Box>
            <Box>
              <FormLabel sx={{ fontSize: 14, color: 'text.secondary' }}>
                {t('hrm.employee_finance_tab.k12')}
              </FormLabel>
              {isEditing ? (
                <TextField
                  type='number'
                  value={editData.housing_fund_base || 0}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      housing_fund_base: parseFloat(e.target.value) || 0,
                    })
                  }
                  size='small'
                  fullWidth
                  sx={{ mt: 0.5 }}
                />
              ) : (
                <Typography sx={{ mt: 0.5, fontFamily: 'monospace' }}>
                  ¥{(financeInfo?.housing_fund_base || 0).toLocaleString('zh-CN')}
                </Typography>
              )}
            </Box>
            <Box>
              <FormLabel sx={{ fontSize: 14, color: 'text.secondary' }}>
                {t('hrm.employee_finance_tab.k13')}
              </FormLabel>
              {isEditing ? (
                <TextField
                  type='number'
                  value={editData.housing_fund_ratio || 0}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      housing_fund_ratio: parseFloat((e.target as HTMLInputElement).value) || 0,
                    })
                  }
                  size='small'
                  fullWidth
                  placeholder={t('hrm.employee_finance_tab.text_a89663')}
                  sx={{ mt: 0.5 }}
                />
              ) : (
                <Typography sx={{ mt: 0.5, fontFamily: 'monospace' }}>
                  {((financeInfo?.housing_fund_ratio || 0) * 100).toFixed(1)}%
                </Typography>
              )}
            </Box>
          </Box>

          {hasFinanceInfo && (
            <Box
              sx={{
                mt: 2,
                pt: 2,
                borderTop: 1,
                borderColor: 'divider',
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {t('hrm.employee_finance_tab.l1')}
                </Typography>
                <Typography sx={{ fontFamily: 'monospace' }}>
                  ¥
                  {(
                    (financeInfo?.social_security_base || 0) *
                    (financeInfo?.social_security_ratio || 0)
                  ).toLocaleString('zh-CN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {t('hrm.employee_finance_tab.l2')}
                </Typography>
                <Typography sx={{ fontFamily: 'monospace' }}>
                  ¥
                  {(
                    (financeInfo?.housing_fund_base || 0) * (financeInfo?.housing_fund_ratio || 0)
                  ).toLocaleString('zh-CN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Typography>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* 费用归属 */}
      <Card>
        <CardHeader
          sx={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 1,
          }}
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DollarSign style={{ width: 20, height: 20, color: theme.palette.secondary.dark }} />
              <Typography variant='subtitle1'>{t('hrm.employee_finance_tab.k14')}</Typography>
            </Box>
          }
        />
        <CardContent>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 2,
            }}
          >
            <Box>
              <FormLabel sx={{ fontSize: 14, color: 'text.secondary' }}>
                {t('hrm.employee_finance_tab.k15')}
              </FormLabel>
              {isEditing ? (
                <TextField
                  value={editData.cost_center_id || ''}
                  onChange={(e) => setEditData({ ...editData, cost_center_id: e.target.value })}
                  size='small'
                  fullWidth
                  placeholder={t('hrm.employee_finance_tab.please_input_1')}
                  sx={{ mt: 0.5 }}
                />
              ) : (
                <Typography sx={{ mt: 0.5, fontFamily: 'monospace' }}>
                  {financeInfo?.cost_center_id || '-'}
                </Typography>
              )}
            </Box>
            <Box>
              <FormLabel sx={{ fontSize: 14, color: 'text.secondary' }}>
                {t('hrm.employee_finance_tab.k16')}
              </FormLabel>
              {isEditing ? (
                <TextField
                  value={editData.expense_account_id || ''}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      expense_account_id: e.target.value,
                    })
                  }
                  size='small'
                  fullWidth
                  placeholder={t('hrm.employee_finance_tab.please_input_2')}
                  sx={{ mt: 0.5 }}
                />
              ) : (
                <Typography sx={{ mt: 0.5, fontFamily: 'monospace' }}>
                  {financeInfo?.expense_account_id || '-'}
                </Typography>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* 税务信息 */}
      <Card>
        <CardHeader
          sx={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 1,
          }}
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Shield style={{ width: 20, height: 20, color: theme.palette.error.dark }} />
              <Typography variant='subtitle1'>{t('hrm.employee_finance_tab.k17')}</Typography>
            </Box>
          }
        />
        <CardContent>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 2,
            }}
          >
            <Box>
              <FormLabel sx={{ fontSize: 14, color: 'text.secondary' }}>
                {t('hrm.employee_finance_tab.k18')}
              </FormLabel>
              {isEditing ? (
                <TextField
                  value={editData.tax_id || ''}
                  onChange={(e) => setEditData({ ...editData, tax_id: e.target.value })}
                  size='small'
                  fullWidth
                  placeholder={t('hrm.employee_finance_tab.please_input_3')}
                  sx={{ mt: 0.5 }}
                />
              ) : (
                <Typography sx={{ mt: 0.5, fontFamily: 'monospace' }}>
                  {financeInfo?.tax_id || '-'}
                </Typography>
              )}
            </Box>
            <Box>
              <FormLabel sx={{ fontSize: 14, color: 'text.secondary' }}>
                {t('hrm.employee_finance_tab.k19')}
              </FormLabel>
              {isEditing ? (
                <FormControl
                  fullWidth
                  size='small'
                  sx={{ mt: 0.5 }}
                >
                  <Select
                    value={editData.taxlevel?.toString() || '0'}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        taxlevel: parseInt(e.target.value),
                      })
                    }
                  >
                    <MenuItem value='0'>{t('hrm.employee_finance_tab.k20')}</MenuItem>
                    <MenuItem value='1'>{t('hrm.employee_finance_tab.k21')}</MenuItem>
                    <MenuItem value='2'>{t('hrm.employee_finance_tab.k22')}</MenuItem>
                    <MenuItem value='3'>{t('hrm.employee_finance_tab.k23')}</MenuItem>
                  </Select>
                </FormControl>
              ) : (
                <Typography sx={{ mt: 0.5, fontWeight: 500 }}>
                  {financeInfo?.taxlevel
                    ? t('hrm.employee_finance_tab.e5')
                    : t('hrm.employee_finance_tab.text_cd9b27')}
                </Typography>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default EmployeeFinanceTab;

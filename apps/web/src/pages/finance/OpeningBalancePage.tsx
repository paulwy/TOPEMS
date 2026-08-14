import {
  Card,
  CardContent,
  CardHeader,
  Chip,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  useTheme,
} from '@mui/material';
import { StatCardGroup } from '@/components';

import { useState, useMemo, useEffect } from 'react';
import {
  Download,
  Upload,
  RefreshCw,
  Calculator,
  FileText,
  AlertCircle,
  CheckCircle,
  DollarSign,
  BookOpen,
  Calendar,
  Search,
} from 'lucide-react';
import {
  useOpeningBalances,
  useSetOpeningBalance,
  useCarryForwardOpeningBalance,
  useAccountTree,
} from '@/hooks/useFinance';
import { useNotification } from '@/hooks/useNotification';
import type { Account, AccountOpeningBalance, AccountCategory } from '@/types/finance';
import { PageContainer } from '@/components/common';

import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
// 科目类别配置
const CATEGORY_CONFIG: Record<
  AccountCategory,
  {
    label: string;
    color: 'default' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
  }
> = {
  asset: { label: i18n.t('finance.opening_balance_page.k0'), color: 'primary' },
  liability: { label: i18n.t('finance.opening_balance_page.k1'), color: 'error' },
  equity: { label: i18n.t('finance.opening_balance_page.k2'), color: 'success' },
  cost: { label: i18n.t('finance.opening_balance_page.k3'), color: 'warning' },
  expense: { label: i18n.t('finance.opening_balance_page.k4'), color: 'info' },
  income: { label: i18n.t('finance.opening_balance_page.k5'), color: 'default' },
};

// 余额方向配置
const BALANCE_DIRECTION_CONFIG = {
  debit: { label: i18n.t('finance.opening_balance_page.k6'), color: 'primary' },
  credit: { label: i18n.t('finance.opening_balance_page.k7'), color: 'error' },
};

export default function OpeningBalancePage() {
  const { t } = useTranslation();
  const { error: notifyError } = useNotification();

  // 状态
  const theme = useTheme();
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [selectedCategory, setSelectedCategory] = useState<AccountCategory | ''>('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editDebitBalance, setEditDebitBalance] = useState(0);
  const [editCreditBalance, setEditCreditBalance] = useState(0);
  const [showCarryForwardModal, setShowCarryForwardModal] = useState(false);
  const [carryForwardFrom, setCarryForwardFrom] = useState('');
  const [carryForwardTo, setCarryForwardTo] = useState('');
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);

  // 查询科目树
  const {
    data: accountTreeData,
    isLoading: accountLoading,
    error: accountError,
  } = useAccountTree({});

  // 查询期初余额
  const {
    data: openingBalancesData,
    isLoading: openingLoading,
    refetch,
    error: openingError,
  } = useOpeningBalances({ period });

  // 设置期初余额
  const setOpeningBalance = useSetOpeningBalance();

  // 结转期初余额
  const carryForward = useCarryForwardOpeningBalance();

  useEffect(() => {
    if (accountError) {
      notifyError(t('finance.opening_balance_page.list'));
    }
  }, [accountError, notifyError]);

  useEffect(() => {
    if (openingError) {
      notifyError(t('finance.opening_balance_page.fail'));
    }
  }, [openingError, notifyError]);

  useEffect(() => {
    const flattenTree = (accounts: Account[]): Account[] => {
      let result: Account[] = [];
      accounts.forEach((account) => {
        result.push(account);
        if (account.children && account.children.length > 0) {
          result = result.concat(flattenTree(account.children));
        }
      });
      return result;
    };
    if (accountTreeData?.data && Array.isArray(accountTreeData.data)) {
      setAllAccounts(flattenTree(accountTreeData.data));
    }
  }, [accountTreeData]);

  // 将期初余额数据转换为map便于查找
  const openingBalanceMap = useMemo(() => {
    const map = new Map<string, AccountOpeningBalance>();
    openingBalancesData?.data?.items?.forEach((ob) => {
      map.set(ob.account_id, ob);
    });
    return map;
  }, [openingBalancesData, t]);

  // 按类别筛选科目
  const filteredAccounts = useMemo(() => {
    if (!allAccounts) return [];
    return allAccounts.filter((account) => {
      if (selectedCategory && account.category !== selectedCategory) return false;
      if (
        searchKeyword &&
        !account.name.includes(searchKeyword) &&
        !account.code.includes(searchKeyword)
      )
        return false;
      return true;
    });
  }, [allAccounts, selectedCategory, searchKeyword]);

  const isLoading = accountLoading || openingLoading;

  // 计算合计
  const totals = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;
    openingBalancesData?.data?.items?.forEach((ob) => {
      totalDebit += ob.debit_balance || 0;
      totalCredit += ob.credit_balance || 0;
    });
    return { totalDebit, totalCredit };
  }, [openingBalancesData]);

  // 处理编辑余额
  const handleEditBalance = (account: Account) => {
    const ob = openingBalanceMap.get(account.id);
    setEditingAccountId(account.id);
    setEditDebitBalance(ob?.debit_balance || 0);
    setEditCreditBalance(ob?.credit_balance || 0);
  };

  // 处理保存余额
  const handleSaveBalance = async () => {
    if (!editingAccountId) return;
    await setOpeningBalance.mutateAsync({
      accountId: editingAccountId,
      data: {
        debit_balance: editDebitBalance,
        credit_balance: editCreditBalance,
        period,
      },
    });
    setEditingAccountId(null);
    refetch();
  };

  // 处理取消编辑
  const handleCancelEdit = () => {
    setEditingAccountId(null);
    setEditDebitBalance(0);
    setEditCreditBalance(0);
  };

  // 处理结转
  const handleCarryForward = async () => {
    if (!carryForwardFrom || !carryForwardTo) return;
    await carryForward.mutateAsync({
      from_period: carryForwardFrom,
      to_period: carryForwardTo,
    });
    setShowCarryForwardModal(false);
    setPeriod(carryForwardTo);
  };

  return (
    <PageContainer
      title={t('finance.opening_balance_page.text_a9c974')}
      subtitle={t('finance.opening_balance_page.text_8987a5')}
      maxWidth='xl'
      headerProps={{
        actions: [
          {
            label: t('finance.opening_balance_page.text_571e80'),
            icon: <Calendar sx={{ width: 16, height: 16 }} />,
            onClick: () => setShowCarryForwardModal(true),
            variant: 'outlined',
          },
          {
            label: t('finance.opening_balance_page.import'),
            icon: <Upload sx={{ width: 16, height: 16 }} />,
            onClick: () => {},
            variant: 'outlined',
          },
          {
            label: t('finance.opening_balance_page.export'),
            icon: <Download sx={{ width: 16, height: 16 }} />,
            onClick: () => {},
            variant: 'outlined',
          },
        ],
      }}
    >
      {/* 筛选条件 */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ pt: 3 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' },
              gap: 2,
            }}
          >
            <TextField
              label={t('finance.opening_balance_page.text_6cde16')}
              type='month'
              size='small'
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } } as const}
            />
            <FormControl
              size='small'
              fullWidth
            >
              <InputLabel>{t('finance.opening_balance_page.k8')}</InputLabel>
              <Select
                value={selectedCategory}
                label={t('finance.opening_balance_page.text_f31b4e')}
                onChange={(e) => setSelectedCategory(e.target.value as AccountCategory)}
              >
                <MenuItem value=''>{t('finance.opening_balance_page.k9')}</MenuItem>
                {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                  <MenuItem
                    key={key}
                    value={key}
                  >
                    {config.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label={t('finance.opening_balance_page.search')}
              size='small'
              placeholder={t('finance.opening_balance_page.name')}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <Box sx={{ mr: 1, display: 'flex' }}>
                      <Search sx={{ width: 16, height: 16, color: 'text.disabled' }} />
                    </Box>
                  ),
                },
              }}
            />
            <Button
              variant='outlined'
              onClick={() => refetch()}
            >
              <RefreshCw sx={{ width: 16, height: 16, marginRight: 8 }} />
              {t('finance.opening_balance_page.e1')}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 期初余额汇总 */}
      <StatCardGroup
        columns={3}
        loading={isLoading}
        stats={[
          {
            title: t('finance.opening_balance_page.text_10afa4'),
            value: totals.totalDebit.toLocaleString('zh-CN', {
              minimumFractionDigits: 2,
            }),
            unit: '¥',
            color: 'primary',
            icon: <DollarSign sx={{ width: 24, height: 24 }} />,
            gradient: true,
          },
          {
            title: t('finance.opening_balance_page.text_17daaa'),
            value: totals.totalCredit.toLocaleString('zh-CN', {
              minimumFractionDigits: 2,
            }),
            unit: '¥',
            color: 'error',
            icon: <DollarSign sx={{ width: 24, height: 24 }} />,
            gradient: true,
          },
          {
            title: t('finance.opening_balance_page.text_7daffe'),
            value: Math.abs(totals.totalDebit - totals.totalCredit).toLocaleString('zh-CN', {
              minimumFractionDigits: 2,
            }),
            unit: '¥',
            color: totals.totalDebit - totals.totalCredit === 0 ? 'success' : 'warning',
            icon:
              totals.totalDebit - totals.totalCredit === 0 ? (
                <CheckCircle sx={{ width: 24, height: 24 }} />
              ) : (
                <AlertCircle sx={{ width: 24, height: 24 }} />
              ),
            gradient: true,
          },
        ]}
      />

      {/* 余额表格 */}
      <Card>
        <CardHeader>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FileText sx={{ width: 20, height: 20, color: 'primary.dark' }} />
            <Typography
              variant='h6'
              sx={{ fontWeight: 600 }}
            >
              {t('finance.opening_balance_page.e2')}
            </Typography>
          </Box>
        </CardHeader>
        <CardContent sx={{ p: 0 }}>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 120 }}>{t('finance.opening_balance_page.k10')}</TableCell>
                <TableCell>{t('finance.opening_balance_page.k11')}</TableCell>
                <TableCell sx={{ width: 100 }}>{t('finance.opening_balance_page.k12')}</TableCell>
                <TableCell align='right'>期初余额（借/贷）</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    sx={{ textAlign: 'center', py: 4 }}
                  >
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      加载中...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : filteredAccounts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    sx={{ textAlign: 'center', py: 4 }}
                  >
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      {t('finance.opening_balance_page.e3')}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAccounts.map((account) => {
                  const ob = openingBalanceMap.get(account.id);
                  return (
                    <TableRow key={account.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <BookOpen sx={{ width: 16, height: 16, color: 'text.disabled' }} />
                          <Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                            {account.code}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ fontWeight: 'medium' }}>{account.name}</Box>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            mt: 0.5,
                          }}
                        >
                          <Chip
                            size='small'
                            label={CATEGORY_CONFIG[account.category]?.label || account.category}
                            color={CATEGORY_CONFIG[account.category]?.color || 'default'}
                          />
                          <Typography
                            variant='body2'
                            sx={{
                              color:
                                account.balance_direction === 'debit'
                                  ? 'primary.main'
                                  : 'error.main',
                            }}
                          >
                            {BALANCE_DIRECTION_CONFIG[account.balance_direction]?.label}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant='body2'
                          color='text.secondary'
                        >
                          {account.haschildren
                            ? t('finance.opening_balance_page.text_7586c1')
                            : t('finance.opening_balance_page.text_f82e51')}
                        </Typography>
                      </TableCell>
                      <TableCell align='right'>
                        {account.haschildren ? (
                          <Typography
                            variant='body2'
                            color='text.secondary'
                          >
                            -
                          </Typography>
                        ) : editingAccountId === account.id ? (
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              gap: 1,
                            }}
                          >
                            <TextField
                              type='number'
                              size='small'
                              sx={{ width: 100 }}
                              value={editDebitBalance}
                              onChange={(e) => setEditDebitBalance(parseFloat(e.target.value) || 0)}
                              placeholder={t('finance.opening_balance_page.text_63e2bc')}
                            />
                            <Typography
                              variant='body2'
                              color='text.secondary'
                            >
                              /
                            </Typography>
                            <TextField
                              type='number'
                              size='small'
                              sx={{ width: 100 }}
                              value={editCreditBalance}
                              onChange={(e) =>
                                setEditCreditBalance(parseFloat(e.target.value) || 0)
                              }
                              placeholder={t('finance.opening_balance_page.text_9ff9a6')}
                            />
                            <Button
                              size='small'
                              onClick={handleSaveBalance}
                            >
                              <CheckCircle sx={{ width: 16, height: 16 }} />
                            </Button>
                            <Button
                              size='small'
                              variant='text'
                              onClick={handleCancelEdit}
                            >
                              {t('finance.budget_management_page.e7')}
                            </Button>
                          </Box>
                        ) : (
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              gap: 2,
                              fontFamily: 'monospace',
                            }}
                          >
                            <Typography sx={{ color: 'primary.main' }}>
                              {ob?.debit_balance?.toLocaleString('zh-CN', {
                                minimumFractionDigits: 2,
                              }) || '0.00'}
                            </Typography>
                            <Typography
                              variant='body2'
                              color='text.secondary'
                            >
                              /
                            </Typography>
                            <Typography sx={{ color: 'error.main' }}>
                              {ob?.credit_balance?.toLocaleString('zh-CN', {
                                minimumFractionDigits: 2,
                              }) || '0.00'}
                            </Typography>
                            <Button
                              size='small'
                              variant='text'
                              onClick={() => handleEditBalance(account)}
                            >
                              <Calculator sx={{ width: 16, height: 16 }} />
                            </Button>
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 结转余额Modal */}
      <Dialog
        open={showCarryForwardModal}
        onClose={() => setShowCarryForwardModal(false)}
        maxWidth='xs'
        fullWidth
      >
        <DialogTitle>{t('finance.opening_balance_page.k13')}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label={t('finance.opening_balance_page.text_0f84c0')}
              type='month'
              size='small'
              value={carryForwardFrom}
              onChange={(e) => setCarryForwardFrom(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } } as const}
            />
            <TextField
              label={t('finance.opening_balance_page.text_1d4106')}
              type='month'
              size='small'
              value={carryForwardTo}
              onChange={(e) => setCarryForwardTo(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } } as const}
            />
            <Box
              sx={{
                bgcolor: 'warning.50',
                border: 1,
                borderColor: 'warning.main',
                borderRadius: 1,
                p: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <AlertCircle
                  sx={{
                    width: 20,
                    height: 20,
                    color: 'warning.main',
                    marginTop: 2,
                  }}
                />
                <Box>
                  <Typography
                    variant='body2'
                    color='warning.main'
                    sx={{ fontWeight: 500 }}
                  >
                    {t('finance.opening_balance_page.e5')}
                  </Typography>
                  <ul
                    style={{
                      margin: '8px 0 0 0',
                      paddingLeft: 16,
                      fontSize: '0.875rem',
                      color: theme.palette.warning.dark,
                    }}
                  >
                    <li>{t('finance.opening_balance_page.k14')}</li>
                    <li>{t('finance.opening_balance_page.k15')}</li>
                    <li>{t('finance.opening_balance_page.k16')}</li>
                  </ul>
                </Box>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowCarryForwardModal(false)}
          >
            {t('finance.budget_management_page.e7')}
          </Button>
          <Button
            variant='contained'
            onClick={handleCarryForward}
          >
            {t('finance.opening_balance_page.e7')}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}

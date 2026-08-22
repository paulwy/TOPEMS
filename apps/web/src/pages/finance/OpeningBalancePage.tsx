import { useCallback, useMemo, useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import {
  AlertCircle,
  BookOpen,
  Calendar,
  CheckCircle,
  DollarSign,
  Download,
  RefreshCw,
  Upload,
  Calculator,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { designTokens } from '@topems/tokens';
import { StatCardGroup } from '@/components';
import { ListPageTemplate } from '@/components/templates';
import type { ColumnDef } from '@/components/templates/list/types';
import {
  useAccountTree,
  useCarryForwardOpeningBalance,
  useOpeningBalances,
  useSetOpeningBalance,
} from '@/hooks/useFinance';
import { useNotification } from '@/hooks/useNotification';
import type { Account, AccountCategory, AccountOpeningBalance } from '@/types/finance';

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

const BALANCE_DIRECTION_CONFIG = {
  debit: { label: i18n.t('finance.opening_balance_page.k6'), color: 'primary' },
  credit: { label: i18n.t('finance.opening_balance_page.k7'), color: 'error' },
};

export default function OpeningBalancePage() {
  const { t } = useTranslation();
  const { error: notifyError } = useNotification();
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

  const {
    data: accountTreeData,
    isLoading: accountLoading,
    error: accountError,
  } = useAccountTree({});

  const {
    data: openingBalancesData,
    isLoading: openingLoading,
    refetch,
    error: openingError,
  } = useOpeningBalances({ period });

  const setOpeningBalance = useSetOpeningBalance();
  const carryForward = useCarryForwardOpeningBalance();

  useEffect(() => {
    if (accountError) {
      notifyError(t('finance.opening_balance_page.list'));
    }
  }, [accountError, notifyError, t]);

  useEffect(() => {
    if (openingError) {
      notifyError(t('finance.opening_balance_page.fail'));
    }
  }, [openingError, notifyError, t]);

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

  const openingBalanceMap = useMemo(() => {
    const map = new Map<string, AccountOpeningBalance>();
    openingBalancesData?.data?.items?.forEach((ob) => {
      map.set(ob.account_id, ob);
    });
    return map;
  }, [openingBalancesData]);

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

  const totals = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;
    openingBalancesData?.data?.items?.forEach((ob) => {
      totalDebit += ob.debit_balance || 0;
      totalCredit += ob.credit_balance || 0;
    });
    return { totalDebit, totalCredit };
  }, [openingBalancesData]);

  const handleEditBalance = useCallback(
    (account: Account) => {
      const ob = openingBalanceMap.get(account.id);
      setEditingAccountId(account.id);
      setEditDebitBalance(ob?.debit_balance || 0);
      setEditCreditBalance(ob?.credit_balance || 0);
    },
    [openingBalanceMap]
  );

  const handleSaveBalance = useCallback(async () => {
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
  }, [editingAccountId, editDebitBalance, editCreditBalance, period, refetch, setOpeningBalance]);

  const handleCancelEdit = useCallback(() => {
    setEditingAccountId(null);
    setEditDebitBalance(0);
    setEditCreditBalance(0);
  }, []);

  const handleCarryForward = async () => {
    if (!carryForwardFrom || !carryForwardTo) return;
    await carryForward.mutateAsync({
      from_period: carryForwardFrom,
      to_period: carryForwardTo,
    });
    setShowCarryForwardModal(false);
    setPeriod(carryForwardTo);
  };

  const columns: ColumnDef<Account>[] = useMemo(
    () => [
      {
        id: 'code',
        label: t('finance.opening_balance_page.k10'),
        width: 140,
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BookOpen
              size={16}
              color='text.disabled'
            />
            <Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
              {row.code}
            </Typography>
          </Box>
        ),
      },
      {
        id: 'name',
        label: t('finance.opening_balance_page.k11'),
        render: (row) => (
          <Box>
            <Box sx={{ fontWeight: 'medium' }}>{row.name}</Box>
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
                label={CATEGORY_CONFIG[row.category]?.label || row.category}
                color={CATEGORY_CONFIG[row.category]?.color || 'default'}
              />
              <Typography
                variant='body2'
                sx={{
                  color: row.balance_direction === 'debit' ? 'primary.main' : 'error.main',
                }}
              >
                {BALANCE_DIRECTION_CONFIG[row.balance_direction]?.label}
              </Typography>
            </Box>
          </Box>
        ),
      },
      {
        id: 'haschildren',
        label: t('finance.opening_balance_page.k12'),
        width: 100,
        render: (row) => (
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {row.haschildren
              ? t('finance.opening_balance_page.text_7586c1')
              : t('finance.opening_balance_page.text_f82e51')}
          </Typography>
        ),
      },
      {
        id: 'balance',
        label: t('finance.opening_balance_page.r1'),
        align: 'right',
        render: (row) => {
          const ob = openingBalanceMap.get(row.id);
          if (row.haschildren) {
            return (
              <Typography
                variant='body2'
                color='text.secondary'
              >
                -
              </Typography>
            );
          }
          if (editingAccountId === row.id) {
            return (
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
                  onChange={(e) => setEditCreditBalance(parseFloat(e.target.value) || 0)}
                  placeholder={t('finance.opening_balance_page.text_9ff9a6')}
                />
                <Button
                  size='small'
                  onClick={handleSaveBalance}
                >
                  <CheckCircle size={16} />
                </Button>
                <Button
                  size='small'
                  variant='text'
                  onClick={handleCancelEdit}
                >
                  {t('finance.budget_management_page.e7')}
                </Button>
              </Box>
            );
          }
          return (
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
                onClick={() => handleEditBalance(row)}
              >
                <Calculator size={16} />
              </Button>
            </Box>
          );
        },
      },
    ],
    [
      t,
      openingBalanceMap,
      editingAccountId,
      editDebitBalance,
      editCreditBalance,
      handleEditBalance,
      handleSaveBalance,
      handleCancelEdit,
    ]
  );

  const actions = useMemo(
    () => [
      {
        label: t('finance.opening_balance_page.text_571e80'),
        icon: <Calendar size={16} />,
        onClick: () => setShowCarryForwardModal(true),
        variant: 'outlined' as const,
      },
      {
        label: t('finance.opening_balance_page.import'),
        icon: <Upload size={16} />,
        onClick: () => {},
        variant: 'outlined' as const,
      },
      {
        label: t('finance.opening_balance_page.export'),
        icon: <Download size={16} />,
        onClick: () => {},
        variant: 'outlined' as const,
      },
    ],
    [t]
  );

  return (
    <>
      <ListPageTemplate<Account>
        title={t('finance.opening_balance_page.text_a9c974')}
        subtitle={t('finance.opening_balance_page.text_8987a5')}
        columns={columns}
        data={filteredAccounts}
        loading={isLoading}
        searchable
        searchPlaceholder={t('finance.opening_balance_page.name')}
        onSearch={setSearchKeyword}
        actions={actions}
        emptyMessage={t('finance.opening_balance_page.e3')}
        headerContent={
          <>
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
                  <Box />
                  <Button
                    variant='outlined'
                    onClick={() => refetch()}
                  >
                    <RefreshCw
                      size={16}
                      style={{ marginRight: 8 }}
                    />
                    {t('finance.opening_balance_page.e1')}
                  </Button>
                </Box>
              </CardContent>
            </Card>

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
                  icon: <DollarSign size={24} />,
                  gradient: true,
                },
                {
                  title: t('finance.opening_balance_page.text_17daaa'),
                  value: totals.totalCredit.toLocaleString('zh-CN', {
                    minimumFractionDigits: 2,
                  }),
                  unit: '¥',
                  color: 'error',
                  icon: <DollarSign size={24} />,
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
                      <CheckCircle size={24} />
                    ) : (
                      <AlertCircle size={24} />
                    ),
                  gradient: true,
                },
              ]}
            />
          </>
        }
      />

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
                  size={20}
                  style={{
                    color: theme.palette.warning.main,
                    marginTop: theme.spacing(2),
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
                      margin: `${designTokens.spacing.sm} 0 0 0`,
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
    </>
  );
}

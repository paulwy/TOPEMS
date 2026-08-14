import { useMemo, useState } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
} from '@mui/material';
import i18n from '@/i18n';
import { useQuery } from '@tanstack/react-query';
import { ArrowRightLeft, Package, Scale } from 'lucide-react';
import { PageContainer } from '@/components/common';
import CrudPage from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { wipSchema } from '@/schemas/mes';
import { wipApi } from '@/api/mes';
import type { Wip, WipStatistics } from '@/api/mes';
import {QUERY_KEYS, CACHE_DURATIONS} from '@/lib/reactQuery';
import { designTokens } from '@/theme/tokens';
const ct= designTokens.colors;
const apiAdapter = createCrudPageAdapter(wipApi, { itemsField: 'wips' });
const WIPPage: React.FC = () => {
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [selectedWip, setSelectedWip] = useState<Wip | null>(null);
  const { data: stats } = useQuery<WipStatistics>({
    queryKey: [QUERY_KEYS.MES.WIP, 'statistics'],
    queryFn: async () => {
      const result = await wipApi.getStatistics();
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
  
      staleTime: CACHE_DURATIONS.MEDIUM,});
  const headerContent = useMemo(() => {
    return (
      <Stack
        direction='row'
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box
          sx={{
            flex: 1,
            p: 2,
            borderRadius: 2,
            bgcolor: 'background.paper',
            border: `1px solid ${ct.border.light}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Package size={18} />
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {i18n.t('pages.wip_page.k0')}
            </Typography>
          </Box>
          <Typography
            variant='h4'
            sx={{ fontWeight: 700 }}
          >
            {stats?.total_wip || 0}
          </Typography>
        </Box>
        <Box
          sx={{
            flex: 1,
            p: 2,
            borderRadius: 2,
            bgcolor: 'background.paper',
            border: `1px solid ${ct.border.light}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Scale size={18} />
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {i18n.t('pages.wip_page.k1')}
            </Typography>
          </Box>
          <Typography
            variant='h4'
            sx={{ fontWeight: 700 }}
          >
            {stats?.total_quantity || 0}
          </Typography>
        </Box>
      </Stack>
    );
  }, [stats]);
  const customRowActions = useMemo(
    () => [
      {
        label: i18n.t('mes.wip_page.k0'),
        icon: <ArrowRightLeft size={16} />,
        onClick: (row: Wip) => {
          setSelectedWip(row);
          setShowTransferDialog(true);
        },
      },
    ],
    []
  );
  return (
    <PageContainer>
      <CrudPage
        schema={wipSchema}
        apiAdapter={apiAdapter}
        breadcrumbs={[{ label: 'MES' }, { label: i18n.t('mes.wip_page.k1') }]}
        headerContent={headerContent}
        customRowActions={customRowActions as unknown as RowAction<Record<string, unknown>>[]}
      />
      <Dialog
        open={showTransferDialog}
        onClose={() => setShowTransferDialog(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{i18n.t('mes.wip_page.k2')}</DialogTitle>
        <DialogContent>
          <Typography>
            {selectedWip
              ? `${i18n.t('pages.wip_page.k0')}${selectedWip.order_number || selectedWip.order_id}...`
              : i18n.t('pages.wip_page.k1')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTransferDialog(false)}>{i18n.t('mes.wip_page.k3')}</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};
export default WIPPage;
import React, { useState, useCallback } from 'react';
import CrudPage from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { contractSchema } from '@/schemas/hrm';
import { contractApi } from '@/api/hrm';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@/components/common/Dialog';
import { FormSelect, FormField } from '@topems/shared-components';
import { Stack, Box, Snackbar, Alert } from '@mui/material';
import { RefreshCw } from 'lucide-react';

const apiAdapter = createCrudPageAdapter(contractApi);

export default function HrmContractPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [renewModalVisible, setRenewModalVisible] = useState(false);
  const [renewContractId, setRenewContractId] = useState('');
  const [renewFormState, setRenewFormState] = useState({
    renewal_type: 'regular',
    new_start_date: '',
    new_end_date: '',
    new_salary: '',
    renewal_reason: '',
  });
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const showNotification = useCallback((type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
  }, []);

  const handleRenew = useCallback((row: Record<string, unknown>) => {
    setRenewContractId(row.id as string);
    setRenewFormState({
      renewal_type: 'regular',
      new_start_date: (row.end_date as string) || new Date().toISOString().split('T')[0],
      new_end_date: '',
      new_salary: '',
      renewal_reason: '',
    });
    setRenewModalVisible(true);
  }, []);

  const renewMutation = useMutation({
    mutationFn: async (args: { contractId: string; values: any }) =>
      contractApi.renew(args.contractId, args.values),
    onSuccess: (result) => {
      if (result.code === 0) {
        showNotification('success', t('hrm.hrm_contract_page.submit'));
        setRenewModalVisible(false);
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.HRM.CONTRACT });
      } else {
        showNotification('error', result.message || t('hrm.hrm_contract_page.submit_1'));
      }
    },
    onError: () => {
      showNotification('error', t('hrm.hrm_contract_page.submit_1'));
    },
  });

  const handleSubmitRenew = () => {
    if (!renewFormState.new_start_date) {
      showNotification('error', t('hrm.hrm_contract_page.start_date_1'));
      return;
    }
    const values = {
      ...renewFormState,
      new_salary: renewFormState.new_salary ? parseInt(renewFormState.new_salary) : undefined,
    };
    renewMutation.mutate({ contractId: renewContractId, values });
  };

  const customRowActions: RowAction[] = [
    {
      label: t('hrm.hrm_contract_page.text_b53270'),
      icon: <RefreshCw size={16} />,
      color: 'success',
      show: (row) => row.status === 'active',
      onClick: handleRenew,
    },
  ];

  return (
    <>
      <Snackbar
        open={!!notification}
        autoHideDuration={3000}
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          severity={notification?.type}
          sx={{ width: '100%' }}
        >
          {notification?.message}
        </Alert>
      </Snackbar>

      <CrudPage
        schema={contractSchema}
        apiAdapter={apiAdapter}
        customRowActions={customRowActions}
        breadcrumbs={[
          { label: t('hrm.hrm_contract_page.root') },
          { label: t('hrm.hrm_contract_page.title') },
        ]}
      />

      <Dialog
        open={renewModalVisible}
        onClose={() => setRenewModalVisible(false)}
        title={t('hrm.hrm_contract_page.text_58f371')}
        maxWidth='sm'
        fullWidth
        cancelButton={{ label: t('hrm.hrm_contract_page.cancel') }}
        confirmButton={{
          label: t('hrm.hrm_contract_page.submit_2'),
          onClick: handleSubmitRenew,
        }}
      >
        <Stack
          spacing={2}
          sx={{ pt: 1 }}
        >
          <FormSelect
            name='renewal_type'
            label={t('hrm.hrm_contract_page.type_2')}
            value={renewFormState.renewal_type}
            options={[
              { value: 'regular', label: '常规续签' },
              { value: 'promotion', label: '升职续签' },
              { value: 'demotion', label: '降职续签' },
              { value: 'transfer', label: '调岗续签' },
            ]}
            onChange={(value) =>
              setRenewFormState((s) => ({ ...s, renewal_type: value as string }))
            }
          />

          <Stack
            direction='row'
            spacing={2}
          >
            <FormField
              name='new_start_date'
              label={t('hrm.hrm_contract_page.start_date_3')}
              type='date'
              value={renewFormState.new_start_date}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setRenewFormState((s) => ({ ...s, new_start_date: e.target.value }))
              }
              fullWidth
              slotProps={{ inputLabel: { shrink: true } } as const}
            />
            <FormField
              name='new_end_date'
              label={t('hrm.hrm_contract_page.end_date_1')}
              type='date'
              value={renewFormState.new_end_date}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setRenewFormState((s) => ({ ...s, new_end_date: e.target.value }))
              }
              placeholder={t('hrm.hrm_contract_page.text_974da9')}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } } as const}
            />
          </Stack>

          <FormField
            name='new_salary'
            label={t('hrm.hrm_contract_page.text_d0eef5')}
            type='number'
            value={renewFormState.new_salary}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setRenewFormState((s) => ({ ...s, new_salary: e.target.value }))
            }
            placeholder={t('hrm.hrm_contract_page.text_67e9f7')}
            fullWidth
          />

          <FormField
            name='renewal_reason'
            label={t('hrm.hrm_contract_page.text_0e623f')}
            value={renewFormState.renewal_reason}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setRenewFormState((s) => ({ ...s, renewal_reason: e.target.value }))
            }
            multiline
            rows={3}
            placeholder={t('hrm.hrm_contract_page.description')}
            fullWidth
          />
        </Stack>
      </Dialog>
    </>
  );
}

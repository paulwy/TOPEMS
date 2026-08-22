import { designTokens } from '@topems/tokens';
/**
 * V34.0 MDM AC-6: 主数据选择器组件
 *
 * 通过 master_data_id 选择主数据引用，支持按域（material/customer/supplier/account_subject）筛选。
 * 底层调用 ERP 的 /api/erp/master-data-refs API。
 *
 * @example
 * <MasterDataSelector
 *   domain="material"
 *   value={materialId}
 *   onChange={(ref) => setMaterialId(ref?.master_data_id ?? '')}
 *   label="选择物料"
 * />
 */

import React from 'react';
import { Autocomplete, TextField, Box, Typography, Chip, CircularProgress } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { masterDataApi, type MasterDataRef } from '@/api/bff';

import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

interface MasterDataSelectorProps {
  /** 主数据域：material / customer / supplier / account_subject 等 */
  domain: string;
  /** 当前选中的 master_data_id */
  value?: string | null;
  /** 选中变化回调 */
  onChange: (ref: MasterDataRef | null) => void;
  /** 标签文本 */
  label?: string;
  /** 占位符 */
  placeholder?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否必填 */
  required?: boolean;
  /** 错误信息 */
  error?: boolean;
  helperText?: string;
  /** 尺寸 */
  size?: 'small' | 'medium';
  /** 是否显示状态标签 */
  showStatus?: boolean;
}

const MasterDataSelector: React.FC<MasterDataSelectorProps> = ({
  domain,
  value,
  onChange,
  label = i18n.t('shared.master_data_selector.k0'),
  placeholder = i18n.t('components.master_data_selector.k0'),
  disabled = false,
  required = false,
  error = false,
  helperText,
  size = 'small',
  showStatus = true,
}) => {
  const { data, isPending } = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.MASTER_DATA_REFS_BASE, domain],
    queryFn: async () => {
      const resp = await masterDataApi.list(domain, 1, 100);
      return resp.data?.data?.items ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const options: MasterDataRef[] = data ?? [];
  const selected = options.find((o) => o.master_data_id === value) ?? null;

  const domainLabel: Record<string, string> = {
    material: i18n.t('shared.master_data_selector.k1'),
    customer: i18n.t('shared.master_data_selector.k2'),
    supplier: i18n.t('shared.master_data_selector.k3'),
    account_subject: i18n.t('shared.master_data_selector.k4'),
    product: i18n.t('shared.master_data_selector.k5'),
    employee: i18n.t('shared.master_data_selector.k6'),
  };

  return (
    <Autocomplete
      size={size}
      disabled={disabled}
      options={options}
      loading={isPending}
      value={selected}
      getOptionLabel={(option) => {
        const name = option.name ? ` - ${option.name}` : '';
        return `${option.code}${name}`;
      }}
      isOptionEqualToValue={(option, val) => option.master_data_id === val.master_data_id}
      onChange={(_, newValue) => onChange(newValue)}
      renderOption={(props, option) => (
        <Box
          component='li'
          {...props}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                variant='body2'
                sx={{ fontWeight: 600 }}
              >
                {option.code}
              </Typography>
              {option.name && (
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {option.name}
                </Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
              <Chip
                label={domainLabel[option.domain] ?? option.domain}
                size='small'
                sx={{ height: 18, fontSize: designTokens.typography.fontSize.scale['0.65rem'] }}
              />
              {showStatus && (
                <Chip
                  label={option.status}
                  size='small'
                  color={option.status === 'active' ? 'success' : 'default'}
                  sx={{ height: 18, fontSize: designTokens.typography.fontSize.scale['0.65rem'] }}
                />
              )}
              <Typography
                variant='caption'
                color='text.disabled'
              >
                {option.source_service}
              </Typography>
            </Box>
          </Box>
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          required={required}
          error={error}
          helperText={helperText}
          slotProps={{
            input: {
              ...params.slotProps.input,
              endAdornment: (
                <>
                  {isPending && (
                    <CircularProgress
                      color='inherit'
                      size={16}
                    />
                  )}
                  {params.slotProps.input.endAdornment}
                </>
              ),
            },
          }}
        />
      )}
      noOptionsText={
        isPending
          ? i18n.t('components.master_data_selector.k1')
          : i18n.t('shared.master_data_selector.k7')
      }
    />
  );
};

export default MasterDataSelector;

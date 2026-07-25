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

export interface MasterDataSelectorProps {
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

export const MasterDataSelector: React.FC<MasterDataSelectorProps> = ({
  domain,
  value,
  onChange,
  label = '选择主数据',
  placeholder = '搜索编码或名称...',
  disabled = false,
  required = false,
  error = false,
  helperText,
  size = 'small',
  showStatus = true,
}) => {
  const { data, isLoading } = useQuery({
    queryKey: ['master-data-refs', domain],
    queryFn: async () => {
      const resp = await masterDataApi.list(domain, 1, 100);
      return resp.data?.data?.items ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const options: MasterDataRef[] = data ?? [];
  const selected = options.find((o) => o.master_data_id === value) ?? null;

  const domainLabel: Record<string, string> = {
    material: '物料',
    customer: '客户',
    supplier: '供应商',
    account_subject: '会计科目',
    product: '产品',
    employee: '员工',
  };

  return (
    <Autocomplete
      size={size}
      disabled={disabled}
      options={options}
      loading={isLoading}
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
                sx={{ height: 18, fontSize: '0.65rem' }}
              />
              {showStatus && (
                <Chip
                  label={option.status}
                  size='small'
                  color={option.status === 'active' ? 'success' : 'default'}
                  sx={{ height: 18, fontSize: '0.65rem' }}
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
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {isLoading && (
                  <CircularProgress
                    color='inherit'
                    size={16}
                  />
                )}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      noOptionsText={isLoading ? '加载中...' : '无匹配主数据'}
    />
  );
};

export default MasterDataSelector;

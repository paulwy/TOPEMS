import React, { useState, useEffect } from 'react';
import { Select, MenuItem, FormControl, InputLabel, Box, Typography } from '@mui/material';
import { useAuthStore } from '@/store/authStore';
import { tenantApi } from '@/api/unified-core/tenant';
import type { Tenant } from '@/api/unified-core/tenant';

/**
 * 超管租户切换器
 * 仅 is_superuser=true 时显示，用于跨租户视图切换
 */
export const TenantSwitcher: React.FC = () => {
  const isSuperuser = useAuthStore((s) => s.isSuperuser());
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [currentTenantId, setCurrentTenantId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isSuperuser) return;
    // 加载租户列表
    tenantApi
      .list()
      .then((res) => {
        if (res.success && res.data) {
          setTenants(res.data);
        }
      })
      .catch(console.error);
    // 获取当前租户上下文
    tenantApi
      .getContext()
      .then((res) => {
        if (res.success && res.data) {
          setCurrentTenantId(res.data.id);
        }
      })
      .catch(console.error);
  }, [isSuperuser]);

  if (!isSuperuser) return null;

  const handleSwitch = async (tenantId: string) => {
    setLoading(true);
    try {
      await tenantApi.switch(tenantId);
      setCurrentTenantId(tenantId);
      // 切换后刷新页面数据
      window.location.reload();
    } catch (e) {
      console.error('切换租户失败', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>
      <Typography
        variant='body2'
        color='text.secondary'
      >
        租户:
      </Typography>
      <FormControl
        size='small'
        sx={{ minWidth: 180 }}
      >
        <InputLabel>租户</InputLabel>
        <Select
          value={currentTenantId}
          label='租户'
          disabled={loading || tenants.length === 0}
          onChange={(e) => handleSwitch(e.target.value)}
        >
          {tenants.map((t) => (
            <MenuItem
              key={t.id}
              value={t.id}
            >
              {t.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default TenantSwitcher;

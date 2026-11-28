import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Settings } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { SettingsPageTemplate, type SettingSection } from '@/components/templates';
import i18n from '@/i18n';
import { logger } from '@/utils/logger';
import { wmsPolicyApi, type WmsPolicyKey } from '@/api/wms/policySettings';
import { useNotificationStore } from '@/store';

type PolicyData = Record<string, unknown> & { configured?: boolean };

const QUERY_KEYS: Record<WmsPolicyKey, string> = {
  'inventory-threshold': 'wms-policy-inventory-threshold',
  'cycle-count': 'wms-policy-cycle-count',
  slotting: 'wms-policy-slotting',
  'picking-sequence': 'wms-policy-picking-sequence',
};

const loaders: Record<WmsPolicyKey, () => Promise<unknown>> = {
  'inventory-threshold': () => wmsPolicyApi.getInventoryThreshold(),
  'cycle-count': () => wmsPolicyApi.getCycleCount(),
  slotting: () => wmsPolicyApi.getSlotting(),
  'picking-sequence': () => wmsPolicyApi.getPickingSequence(),
};

const savers: Record<WmsPolicyKey, (data: Record<string, unknown>) => Promise<unknown>> = {
  'inventory-threshold': (data) => wmsPolicyApi.updateInventoryThreshold(data),
  'cycle-count': (data) => wmsPolicyApi.updateCycleCount(data),
  slotting: (data) => wmsPolicyApi.updateSlotting(data),
  'picking-sequence': (data) => wmsPolicyApi.updatePickingSequence(data),
};

const t = (key: string) => i18n.t(`wms.policy.${key}`);

/** 每个策略页的真实字段（全部对应后端表列，无一装饰性控件）。 */
function buildSections(policyKey: WmsPolicyKey, data: PolicyData): SettingSection[] {
  const num = (v: unknown, fallback = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback);

  switch (policyKey) {
    case 'inventory-threshold':
      return [
        {
          id: 'threshold',
          title: t('threshold.section'),
          icon: <Settings size={20} />,
          color: 'warning',
          fields: [
            {
              id: 'rule_name',
              label: t('threshold.rule_name'),
              type: 'text',
              value: str(data.rule_name),
              required: true,
              description: t('threshold.rule_name_desc'),
            },
            {
              id: 'alert_type',
              label: t('threshold.alert_type'),
              type: 'select',
              value: str(data.alert_type, 'low_stock'),
              options: [
                { label: t('threshold.alert_type_low'), value: 'low_stock' },
                { label: t('threshold.alert_type_out'), value: 'out_of_stock' },
                { label: t('threshold.alert_type_reorder'), value: 'reorder' },
              ],
              description: t('threshold.alert_type_desc'),
            },
            {
              id: 'threshold_value',
              label: t('threshold.value'),
              type: 'number',
              value: num(data.threshold_value),
              required: true,
              description: t('threshold.value_desc'),
              validation: (value) => {
                const n = Number(value);
                if (!Number.isFinite(n)) return t('validation.number');
                if (n < 0) return t('validation.non_negative');
                return true;
              },
            },
            {
              id: 'severity',
              label: t('threshold.severity'),
              type: 'select',
              value: str(data.severity, 'warning'),
              options: [
                { label: t('threshold.severity_info'), value: 'info' },
                { label: t('threshold.severity_warning'), value: 'warning' },
                { label: t('threshold.severity_critical'), value: 'critical' },
              ],
              description: t('threshold.severity_desc'),
            },
            {
              id: 'enabled',
              label: t('threshold.enabled'),
              type: 'switch',
              value: Boolean(data.enabled),
              description: t('threshold.enabled_desc'),
            },
          ],
        },
      ];
    case 'cycle-count':
      return [
        {
          id: 'cycle',
          title: t('cycle.section'),
          icon: <Settings size={20} />,
          color: 'primary',
          fields: [
            {
              id: 'count_frequency',
              label: t('cycle.frequency'),
              type: 'select',
              value: str(data.count_frequency, 'monthly'),
              options: [
                { label: t('cycle.freq_daily'), value: 'daily' },
                { label: t('cycle.freq_weekly'), value: 'weekly' },
                { label: t('cycle.freq_monthly'), value: 'monthly' },
                { label: t('cycle.freq_quarterly'), value: 'quarterly' },
              ],
              description: t('cycle.frequency_desc'),
            },
            {
              id: 'priority_level',
              label: t('cycle.priority'),
              type: 'select',
              value: str(data.priority_level, 'normal'),
              options: [
                { label: t('cycle.priority_high'), value: 'high' },
                { label: t('cycle.priority_normal'), value: 'normal' },
                { label: t('cycle.priority_low'), value: 'low' },
              ],
              description: t('cycle.priority_desc'),
            },
            {
              id: 'material_category',
              label: t('cycle.category'),
              type: 'text',
              value: str(data.material_category),
              description: t('cycle.category_desc'),
            },
            {
              id: 'is_active',
              label: t('cycle.active'),
              type: 'switch',
              value: data.is_active === undefined ? true : Boolean(data.is_active),
              description: t('cycle.active_desc'),
            },
          ],
        },
      ];
    case 'slotting': {
      const noWarehouse = data.warehouse_available === false;
      return [
        {
          id: 'slotting',
          title: t('slotting.section'),
          icon: <Settings size={20} />,
          color: 'success',
          fields: [
            {
              id: 'rule_type',
              label: t('slotting.rule_type'),
              type: 'select',
              value: str(data.rule_type, 'velocity_class'),
              disabled: noWarehouse,
              description: t('slotting.rule_type_desc'),
              helperText: noWarehouse ? t('slotting.need_warehouse') : undefined,
              options: [
                { label: t('slotting.rule_velocity'), value: 'velocity_class' },
                { label: t('slotting.rule_family'), value: 'family_group' },
                { label: t('slotting.rule_abc'), value: 'abc_class' },
              ],
            },
            {
              id: 'priority',
              label: t('slotting.priority'),
              type: 'number',
              value: num(data.priority, 10),
              disabled: noWarehouse,
              description: t('slotting.priority_desc'),
              validation: (value) => {
                const n = Number(value);
                if (!Number.isFinite(n)) return t('validation.number');
                if (n < 0) return t('validation.non_negative');
                return true;
              },
            },
            {
              id: 'is_active',
              label: t('slotting.active'),
              type: 'switch',
              value: data.is_active === undefined ? true : Boolean(data.is_active),
              disabled: noWarehouse,
              description: t('slotting.active_desc'),
            },
          ],
        },
      ];
    }
    case 'picking-sequence':
    default:
      return [
        {
          id: 'picking',
          title: t('picking.section'),
          icon: <Settings size={20} />,
          color: 'info',
          fields: [
            {
              id: 'pick_strategy',
              label: t('picking.strategy'),
              type: 'select',
              value: str(data.pick_strategy, 'expiry_first'),
              options: [
                { label: t('picking.expiry_first'), value: 'expiry_first' },
                { label: t('picking.fifo'), value: 'fifo' },
                { label: t('picking.lifo'), value: 'lifo' },
              ],
              description: t('picking.strategy_desc'),
            },
          ],
        },
      ];
  }
}

interface WmsPolicySettingsProps {
  policyKey: WmsPolicyKey;
  title: string;
  subtitle?: string;
  description?: string;
}

/**
 * WMS 四个设置页共用的真实设置表单：一个策略页 = 一条持久化配置 + 一个 GET/PUT 端点。
 * 后端无记录时返回默认值并带 `configured=false`，页面标注“尚未配置”，不做假展示。
 */
export const WmsPolicySettings: React.FC<WmsPolicySettingsProps> = ({
  policyKey,
  title,
  subtitle,
  description,
}) => {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const query = useQuery<PolicyData>({
    queryKey: [QUERY_KEYS[policyKey]],
    queryFn: async () => {
      const res = (await loaders[policyKey]()) as { success?: boolean; data?: PolicyData } | undefined;
      return res?.data ?? {};
    },
    staleTime: 60 * 1000,
    retry: false,
  });

  const data: PolicyData = query.data ?? {};
  const sections = React.useMemo(() => buildSections(policyKey, data), [policyKey, data]);
  const configured = data.configured === true;

  const mutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => savers[policyKey](values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS[policyKey]] });
      addNotification({ type: 'success', title: t('save_success'), message: t('save_success_desc') });
    },
    onError: (err: unknown) => {
      logger.error('保存 WMS 策略设置失败', err);
      addNotification({ type: 'error', title: t('save_failed'), message: t('save_failed_desc') });
    },
  });

  const handleSave = (values: Record<string, unknown>) => {
    const payload: Record<string, unknown> = {};
    for (const [key, raw] of Object.entries(values)) {
      if (key === 'threshold_value' || key === 'priority') {
        payload[key] = Number(raw);
      } else if (raw === '' || raw === null || raw === undefined) {
        continue;
      } else {
        payload[key] = raw;
      }
    }
    return mutation.mutateAsync(payload).then(() => undefined);
  };

  return (
    <PageContainer
      title={title}
      subtitle={subtitle}
      padding={false}
      maxWidth={false}
    >
      <SettingsPageTemplate
        title={title}
        description={
          configured
            ? description ?? title
            : `${description ?? title}（${t('not_configured')}）`
        }
        icon={<Settings size={24} />}
        sections={sections}
        loading={query.isLoading}
        saving={mutation.isPending}
        onSave={handleSave}
      />
    </PageContainer>
  );
};

export default WmsPolicySettings;

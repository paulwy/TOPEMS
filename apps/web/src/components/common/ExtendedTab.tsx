/**
 * Phase 5.2 — 模块关联 Tab 扩展
 *
 * 在现有 Tab 列表末尾追加一个"关联数据" Tab，
 * 仅在关联模块已安装时显示。
 */
import React from 'react';
import { Tab } from '@mui/material';
import { usePlugins } from '@/context/PluginContext';

interface ExtendedTabConfig {
  /** 关联模块 code */
  moduleCode: string;
  /** Tab label */
  label: string;
  /** Tab 图标 */
  icon?: React.ReactNode;
  /** Tab 值 */
  value: string;
}

interface ExtendedTabProps {
  /** 扩展 Tab 配置 */
  configs: ExtendedTabConfig[];
  /** 当前激活的 Tab 值 */
  value: string;
  /** Tab 变更回调 */
  onChange: (event: React.SyntheticEvent, newValue: string) => void;
}

/**
 * 渲染关联模块扩展 Tab 列表
 * 过滤掉未安装模块的 Tab，返回可渲染的 Tab 元素数组
 */
const ExtendedTab: React.FC<ExtendedTabProps> = React.memo(({ configs, onChange: _onChange }) => {
  const { isPluginInstalled } = usePlugins();

  const visibleConfigs = configs.filter((config) => isPluginInstalled(config.moduleCode));

  if (visibleConfigs.length === 0) return null;

  return (
    <>
      {visibleConfigs.map((config) => (
        <Tab
          key={config.value}
          label={config.label}
          value={config.value}
          icon={config.icon ? <span style={{ marginRight: 4 }}>{config.icon}</span> : undefined}
          iconPosition='start'
        />
      ))}
    </>
  );
});

export default ExtendedTab;

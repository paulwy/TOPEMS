import React from 'react';
import {
  SettingsPageTemplate,
  type SettingTab,
  type SettingValueType,
} from '@/components/templates';

interface SettingsTabRendererProps {
  tabs: SettingTab[];
  handleSave: (data: Record<string, SettingValueType>) => Promise<void> | void;
  title: string;
  subtitle?: string;
}

export const SettingsTabRenderer: React.FC<SettingsTabRendererProps> = ({
  tabs,
  handleSave,
  title,
  subtitle,
}) => {
  return (
    <SettingsPageTemplate
      title={title}
      subtitle={subtitle}
      tabs={tabs}
      onSave={handleSave}
    />
  );
};

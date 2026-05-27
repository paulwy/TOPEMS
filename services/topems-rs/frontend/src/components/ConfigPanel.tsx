import React, { useState, useCallback } from 'react';

export interface ConfigItem {
  id: string;
  key: string;
  value: string | number | boolean;
  type: 'string' | 'number' | 'boolean' | 'select';
  label: string;
  description?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
}

export interface ConfigPanelProps {
  configs: ConfigItem[];
  onSave: (configs: Record<string, unknown>) => void;
  loading?: boolean;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  configs,
  onSave,
  loading,
}) => {
  const [values, setValues] = useState<Record<string, unknown>>(
    configs.reduce((acc, config) => {
      acc[config.key] = config.value;
      return acc;
    }, {})
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = useCallback((key: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: '' }));
    }
  }, [errors]);

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};
    
    configs.forEach((config) => {
      if (config.required && !values[config.key]) {
        newErrors[config.key] = `${config.label} 必填`;
      }
      if (config.type === 'number' && typeof values[config.key] === 'string') {
        const numValue = parseFloat(values[config.key] as string);
        if (isNaN(numValue)) {
          newErrors[config.key] = `${config.label} 必须是数字`;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [configs, values]);

  const handleSubmit = useCallback(() => {
    if (!validate()) return;
    onSave(values);
  }, [validate, onSave, values]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b">
        <h3 className="text-lg font-semibold text-gray-900">系统配置</h3>
      </div>
      <div className="p-6 space-y-6">
        {configs.map((config) => (
          <div key={config.id} className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                {config.label}
                {config.required && <span className="text-red-500 ml-1">*</span>}
              </label>
            </div>
            {config.description && (
              <p className="text-xs text-gray-500">{config.description}</p>
            )}
            {config.type === 'boolean' ? (
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={values[config.key] as boolean || false}
                  onChange={(e) => handleChange(config.key, e.target.checked)}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-600">启用</span>
              </label>
            ) : config.type === 'select' ? (
              <select
                value={String(values[config.key] ?? '')}
                onChange={(e) => handleChange(config.key, e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors[config.key]
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-primary-500'
                }`}
              >
                {config.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={config.type === 'number' ? 'number' : 'text'}
                value={String(values[config.key] ?? '')}
                onChange={(e) =>
                  handleChange(config.key, config.type === 'number' ? parseFloat(e.target.value) || '' : e.target.value)
                }
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors[config.key]
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-primary-500'
                }`}
              />
            )}
            {errors[config.key] && (
              <p className="text-sm text-red-600">{errors[config.key]}</p>
            )}
          </div>
        ))}
      </div>
      <div className="px-4 py-3 bg-gray-50 border-t flex justify-end space-x-3">
        <button
          onClick={() => setValues(configs.reduce((acc, config) => ({ ...acc, [config.key]: config.value }), {}))}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          重置
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '保存中...' : '保存配置'}
        </button>
      </div>
    </div>
  );
};

export interface ConfigSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export const ConfigSection: React.FC<ConfigSectionProps> = ({
  title,
  description,
  children,
}) => (
  <div className="mb-6">
    <h4 className="text-sm font-semibold text-gray-900 mb-1">{title}</h4>
    {description && (
      <p className="text-xs text-gray-500 mb-3">{description}</p>
    )}
    {children}
  </div>
);

export interface ConfigGroupProps {
  name: string;
  configs: ConfigItem[];
  onSave: (configs: Record<string, unknown>) => void;
}

export const ConfigGroup: React.FC<ConfigGroupProps> = ({
  name,
  configs,
  onSave,
}) => {
  const [active, setActive] = useState(true);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setActive(!active)}
        className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-left"
      >
        <span className="font-medium text-gray-900">{name}</span>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${active ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>
      {active && (
        <div className="p-4">
          <ConfigPanel configs={configs} onSave={onSave} />
        </div>
      )}
    </div>
  );
};

export const useConfig = <T extends Record<string, unknown>>(initialConfig: T) => {
  const [config, setConfig] = useState<T>(initialConfig);
  const [loading, setLoading] = useState(false);

  const updateConfig = useCallback(async (updates: Partial<T>) => {
    setLoading(true);
    try {
      const newConfig = { ...config, ...updates };
      localStorage.setItem('config', JSON.stringify(newConfig));
      setConfig(newConfig);
      return newConfig;
    } finally {
      setLoading(false);
    }
  }, [config]);

  const resetConfig = useCallback(() => {
    setConfig(initialConfig);
    localStorage.removeItem('config');
  }, [initialConfig]);

  return {
    config,
    loading,
    updateConfig,
    resetConfig,
  };
};

export default ConfigPanel;

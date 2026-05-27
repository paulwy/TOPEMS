import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Locale = 'zh-CN' | 'en-US';

interface Translation {
  [key: string]: string | Translation;
}

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string>) => string;
}

const translations: Record<Locale, Translation> = {
  'zh-CN': {
    common: {
      save: '保存',
      cancel: '取消',
      delete: '删除',
      edit: '编辑',
      create: '创建',
      search: '搜索',
      refresh: '刷新',
      export: '导出',
      import: '导入',
      submit: '提交',
      reset: '重置',
      confirm: '确认',
      close: '关闭',
      yes: '是',
      no: '否',
      ok: '确定',
    },
    auth: {
      login: '登录',
      logout: '退出登录',
      username: '用户名',
      password: '密码',
      email: '邮箱',
      forgotPassword: '忘记密码',
      rememberMe: '记住我',
    },
    dashboard: {
      title: '数据仪表盘',
      projects: '项目',
      experiments: '试验',
      tasks: '任务',
      reports: '报表',
    },
    project: {
      list: '项目列表',
      name: '项目名称',
      code: '项目编号',
      status: '状态',
      progress: '进度',
      startDate: '开始日期',
      endDate: '结束日期',
      description: '描述',
      manager: '负责人',
    },
    form: {
      required: '此字段为必填项',
      email: '请输入有效的邮箱地址',
      minLength: '最少需要 {{min}} 个字符',
      maxLength: '最多允许 {{max}} 个字符',
    },
    toast: {
      success: '操作成功',
      error: '操作失败',
      warning: '警告',
      info: '提示',
    },
  },
  'en-US': {
    common: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      create: 'Create',
      search: 'Search',
      refresh: 'Refresh',
      export: 'Export',
      import: 'Import',
      submit: 'Submit',
      reset: 'Reset',
      confirm: 'Confirm',
      close: 'Close',
      yes: 'Yes',
      no: 'No',
      ok: 'OK',
    },
    auth: {
      login: 'Login',
      logout: 'Logout',
      username: 'Username',
      password: 'Password',
      email: 'Email',
      forgotPassword: 'Forgot Password',
      rememberMe: 'Remember Me',
    },
    dashboard: {
      title: 'Dashboard',
      projects: 'Projects',
      experiments: 'Experiments',
      tasks: 'Tasks',
      reports: 'Reports',
    },
    project: {
      list: 'Project List',
      name: 'Project Name',
      code: 'Project Code',
      status: 'Status',
      progress: 'Progress',
      startDate: 'Start Date',
      endDate: 'End Date',
      description: 'Description',
      manager: 'Manager',
    },
    form: {
      required: 'This field is required',
      email: 'Please enter a valid email',
      minLength: 'Minimum {{min}} characters',
      maxLength: 'Maximum {{max}} characters',
    },
    toast: {
      success: 'Success',
      error: 'Error',
      warning: 'Warning',
      info: 'Info',
    },
  },
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: ReactNode; defaultLocale?: Locale }> = ({
  children,
  defaultLocale = 'zh-CN',
}) => {
  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('locale');
      if (stored === 'zh-CN' || stored === 'en-US') {
        return stored;
      }
    }
    return defaultLocale;
  });

  useEffect(() => {
    localStorage.setItem('locale', locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const t = (key: string, params: Record<string, string> = {}) => {
    const keys = key.split('.');
    let result: string | Translation | undefined = translations[locale];

    for (const k of keys) {
      if (typeof result === 'object' && result !== undefined) {
        result = result[k];
      } else {
        result = undefined;
        break;
      }
    }

    if (typeof result !== 'string') {
      console.warn(`Translation not found for key: ${key}`);
      return key;
    }

    let translated = result;
    for (const [paramKey, paramValue] of Object.entries(params)) {
      translated = translated.replace(new RegExp(`{{${paramKey}}}`, 'g'), paramValue);
    }

    return translated;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
};

export const LocaleSelector: React.FC = () => {
  const { locale, setLocale } = useTranslation();

  const locales: { value: Locale; label: string; flag: string }[] = [
    { value: 'zh-CN', label: '中文', flag: '🇨🇳' },
    { value: 'en-US', label: 'English', flag: '🇺🇸' },
  ];

  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value as Locale)}
      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
    >
      {locales.map((loc) => (
        <option key={loc.value} value={loc.value}>
          {loc.flag} {loc.label}
        </option>
      ))}
    </select>
  );
};

export const Trans: React.FC<{
  i18nKey: string;
  params?: Record<string, string>;
  children?: ReactNode;
}> = ({ i18nKey, params, children }) => {
  const { t } = useTranslation();
  const translation = t(i18nKey, params);
  
  if (children && translation === i18nKey) {
    return <>{children}</>;
  }
  
  return <>{translation}</>;
};

export default I18nProvider;

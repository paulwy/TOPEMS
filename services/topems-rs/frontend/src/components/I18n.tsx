import React, { createContext, useContext, useState, useCallback } from 'react';

type Language = 'zh' | 'en';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  zh: {
    // 通用
    'common.search': '搜索',
    'common.reset': '重置',
    'common.save': '保存',
    'common.cancel': '取消',
    'common.delete': '删除',
    'common.edit': '编辑',
    'common.create': '创建',
    'common.export': '导出',
    'common.import': '导入',
    'common.loading': '加载中...',
    'common.success': '操作成功',
    'common.error': '操作失败',
    'common.confirm': '确认',
    'common.back': '返回',
    
    // 项目
    'project.title': '项目管理',
    'project.subtitle': '管理科研项目、跟踪进度和团队协作',
    'project.name': '项目名称',
    'project.code': '项目编号',
    'project.type': '项目类型',
    'project.status': '项目状态',
    'project.leader': '负责人',
    'project.progress': '进度',
    'project.start_date': '开始日期',
    'project.end_date': '结束日期',
    'project.create': '新建项目',
    'project.list': '项目列表',
    'project.detail': '项目详情',
    
    // 状态
    'status.draft': '草稿',
    'status.active': '进行中',
    'status.paused': '已暂停',
    'status.completed': '已完成',
    'status.archived': '已归档',
    
    // 搜索
    'search.placeholder': '搜索项目名称或编号...',
    'search.advanced': '高级搜索',
    'search.quick': '快速搜索',
    
    // 批量操作
    'batch.selected': '已选择',
    'batch.items': '个项目',
    'batch.delete': '批量删除',
    'batch.export': '导出选中',
    'batch.cancel': '取消选择',
    
    // 空状态
    'empty.no_data': '暂无数据',
    'empty.no_projects': '暂无项目数据',
    'empty.create_first': '创建第一个项目',
    
    // 错误
    'error.fetch_failed': '获取数据失败',
    'error.create_failed': '创建失败',
    'error.update_failed': '更新失败',
    'error.delete_failed': '删除失败',
  },
  en: {
    // Common
    'common.search': 'Search',
    'common.reset': 'Reset',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.create': 'Create',
    'common.export': 'Export',
    'common.import': 'Import',
    'common.loading': 'Loading...',
    'common.success': 'Success',
    'common.error': 'Error',
    'common.confirm': 'Confirm',
    'common.back': 'Back',
    
    // Project
    'project.title': 'Project Management',
    'project.subtitle': 'Manage research projects, track progress and team collaboration',
    'project.name': 'Project Name',
    'project.code': 'Project Code',
    'project.type': 'Project Type',
    'project.status': 'Status',
    'project.leader': 'Leader',
    'project.progress': 'Progress',
    'project.start_date': 'Start Date',
    'project.end_date': 'End Date',
    'project.create': 'New Project',
    'project.list': 'Project List',
    'project.detail': 'Project Details',
    
    // Status
    'status.draft': 'Draft',
    'status.active': 'Active',
    'status.paused': 'Paused',
    'status.completed': 'Completed',
    'status.archived': 'Archived',
    
    // Search
    'search.placeholder': 'Search project name or code...',
    'search.advanced': 'Advanced Search',
    'search.quick': 'Quick Search',
    
    // Batch
    'batch.selected': 'Selected',
    'batch.items': 'items',
    'batch.delete': 'Batch Delete',
    'batch.export': 'Export Selected',
    'batch.cancel': 'Cancel Selection',
    
    // Empty
    'empty.no_data': 'No Data',
    'empty.no_projects': 'No projects found',
    'empty.create_first': 'Create your first project',
    
    // Error
    'error.fetch_failed': 'Failed to fetch data',
    'error.create_failed': 'Failed to create',
    'error.update_failed': 'Failed to update',
    'error.delete_failed': 'Failed to delete',
  },
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};

interface I18nProviderProps {
  children: React.ReactNode;
  defaultLanguage?: Language;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ 
  children, 
  defaultLanguage = 'zh' 
}) => {
  const [language, setLanguage] = useState<Language>(defaultLanguage);

  const t = useCallback((key: string): string => {
    return translations[language][key] || key;
  }, [language]);

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

// 语言切换组件
export const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useI18n();

  return (
    <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => setLanguage('zh')}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          language === 'zh'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        中文
      </button>
      <button
        onClick={() => setLanguage('en')}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          language === 'en'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        EN
      </button>
    </div>
  );
};

export default I18nProvider;

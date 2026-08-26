import {
  Card,
  CardContent,
  CardHeader,
  Tabs,
  Tab,
  Box,
  TextField,
  FormControl,
  FormLabel,
  Typography,
  Chip,
  Button,
} from '@mui/material';
import i18n from '@/i18n';
import React, { useState, useEffect } from 'react';

import { Download, Play, RefreshCw, FileText, Settings, Sparkles, Search } from 'lucide-react';
import type { Template, TemplateCategory, TemplateVariable } from '../../api/template';
import { logger } from '@/utils/logger';

// Mock数据 - 模拟从API获取的模板列表
const mockTemplates: Template[] = [
  {
    id: '1',
    name: i18n.t('components.template_demo_page.k0'),
    code: 'purchase-approval',
    template_type: 'workflow',
    category_id: 'cat1',
    module: 'procurement',
    description: i18n.t('components.template_demo_page.k1'),
    content: `【{{workflow_name}}】

{i18n.t('components.template_demo_page.k0')}
{{description}}

{i18n.t('components.template_demo_page.k1')}

{i18n.t('components.template_demo_page.1_2')}
{i18n.t('components.template_demo_page.k3')}{{step1_assignee}}
{i18n.t('components.template_demo_page.k4')}{{step1_task}}
{i18n.t('components.template_demo_page.k5')}{{step1_deadline}}{i18n.t('components.template_demo_page.k6')}

{i18n.t('components.template_demo_page.2_7')}
{i18n.t('components.template_demo_page.k8')}{{step2_assignee}}
{i18n.t('components.template_demo_page.k9')}{{step2_task}}
{i18n.t('components.template_demo_page.k10')}{{step2_deadline}}{i18n.t('components.template_demo_page.k11')}

{i18n.t('components.template_demo_page.3_12')}
{i18n.t('components.template_demo_page.k13')}{{step3_assignee}}
{i18n.t('components.template_demo_page.k14')}{{step3_task}}
{i18n.t('components.template_demo_page.k15')}{{step3_deadline}}{i18n.t('components.template_demo_page.k16')}

---
{i18n.t('components.template_demo_page.k17')}{{creator}}
{i18n.t('components.template_demo_page.k18')}{{today}}`,
    variables: [
      {
        key: 'workflow_name',
        label: i18n.t('components.template_demo_page.k2'),
        type: 'string',
        required: true,
      },
      {
        key: 'description',
        label: i18n.t('components.template_demo_page.k3'),
        type: 'string',
        required: false,
      },
      {
        key: 'step1_assignee',
        label: i18n.t('components.template_demo_page.1_4'),
        type: 'user',
        required: true,
      },
      {
        key: 'step1_task',
        label: i18n.t('components.template_demo_page.1_5'),
        type: 'string',
        required: true,
      },
      {
        key: 'step1_deadline',
        label: i18n.t('components.template_demo_page.1_6'),
        type: 'number',
        required: true,
      },
      {
        key: 'step2_assignee',
        label: i18n.t('components.template_demo_page.2_7'),
        type: 'user',
        required: true,
      },
      {
        key: 'step2_task',
        label: i18n.t('components.template_demo_page.2_8'),
        type: 'string',
        required: true,
      },
      {
        key: 'step2_deadline',
        label: i18n.t('components.template_demo_page.2_9'),
        type: 'number',
        required: true,
      },
      {
        key: 'step3_assignee',
        label: i18n.t('components.template_demo_page.3_10'),
        type: 'user',
        required: true,
      },
      {
        key: 'step3_task',
        label: i18n.t('components.template_demo_page.3_11'),
        type: 'string',
        required: true,
      },
      {
        key: 'step3_deadline',
        label: i18n.t('components.template_demo_page.3_12'),
        type: 'number',
        required: true,
      },
      {
        key: 'creator',
        label: i18n.t('components.template_demo_page.k13'),
        type: 'user',
        required: true,
      },
    ],
    isactive: true,
    is_system: false,
    is_public: true,
    ai_enabled: true,
    version: 1,
    view_count: 120,
    use_count: 45,
    created_at: '2026-06-01T10:00:00Z',
    updated_at: '2026-06-10T15:30:00Z',
    created_by: 'admin',
  },
  {
    id: '2',
    name: i18n.t('components.template_demo_page.k14'),
    code: 'leave-application',
    template_type: 'workflow',
    category_id: 'cat2',
    module: 'hr',
    description: i18n.t('components.template_demo_page.k15'),
    content: `{i18n.t('components.template_demo_page.k19')}

{i18n.t('components.template_demo_page.k20')}{{applicant_name}}
{i18n.t('components.template_demo_page.k21')}{{department}}
{i18n.t('components.template_demo_page.k22')}{{position}}

{i18n.t('components.template_demo_page.k23')}{{leave_type}}
{i18n.t('components.template_demo_page.k24')}{{start_date}}
{i18n.t('components.template_demo_page.k25')}{{end_date}}
{i18n.t('components.template_demo_page.k26')}{{days}}{i18n.t('components.template_demo_page.k27')}

{{#if is_urgent}}⚠️ {i18n.t('components.template_demo_page.k28')}{{/if}}

{i18n.t('components.template_demo_page.k29')}
{{reason}}

{{#if has_attachment}}📎 {i18n.t('components.template_demo_page.k30')}{{/if}}

{i18n.t('components.template_demo_page.k31')}
{i18n.t('components.template_demo_page.1_32')}{{manager_name}}
{i18n.t('components.template_demo_page.2hr_33')}{{hr_assignee}}

{i18n.t('components.template_demo_page.k34')}{{apply_time}}`,
    variables: [
      {
        key: 'applicant_name',
        label: i18n.t('components.template_demo_page.k16'),
        type: 'user',
        required: true,
      },
      {
        key: 'department',
        label: i18n.t('components.template_demo_page.k17'),
        type: 'string',
        required: true,
      },
      {
        key: 'position',
        label: i18n.t('components.template_demo_page.k18'),
        type: 'string',
        required: true,
      },
      {
        key: 'leave_type',
        label: i18n.t('components.template_demo_page.k19'),
        type: 'select',
        required: true,
        options: [
          {
            value: i18n.t('components.template_demo_page.k20'),
            label: i18n.t('components.template_demo_page.k21'),
          },
          {
            value: i18n.t('components.template_demo_page.k22'),
            label: i18n.t('components.template_demo_page.k23'),
          },
          {
            value: i18n.t('components.template_demo_page.k24'),
            label: i18n.t('components.template_demo_page.k25'),
          },
          {
            value: i18n.t('components.template_demo_page.k26'),
            label: i18n.t('components.template_demo_page.k27'),
          },
          {
            value: i18n.t('components.template_demo_page.k28'),
            label: i18n.t('components.template_demo_page.k29'),
          },
        ],
      },
      {
        key: 'start_date',
        label: i18n.t('components.template_demo_page.k30'),
        type: 'date',
        required: true,
      },
      {
        key: 'end_date',
        label: i18n.t('components.template_demo_page.k31'),
        type: 'date',
        required: true,
      },
      {
        key: 'days',
        label: i18n.t('components.template_demo_page.k32'),
        type: 'number',
        required: true,
      },
      {
        key: 'is_urgent',
        label: i18n.t('components.template_demo_page.k33'),
        type: 'string',
        required: false,
        options: [
          { value: 'true', label: i18n.t('components.template_demo_page.k34') },
          { value: 'false', label: i18n.t('components.template_demo_page.k35') },
        ],
      },
      {
        key: 'reason',
        label: i18n.t('components.template_demo_page.k36'),
        type: 'string',
        required: false,
      },
      {
        key: 'has_attachment',
        label: i18n.t('components.template_demo_page.k37'),
        type: 'string',
        required: false,
        options: [
          { value: 'true', label: i18n.t('components.template_demo_page.k38') },
          { value: 'false', label: i18n.t('components.template_demo_page.k39') },
        ],
      },
      {
        key: 'manager_name',
        label: i18n.t('components.template_demo_page.k40'),
        type: 'user',
        required: true,
      },
      {
        key: 'hr_assignee',
        label: i18n.t('components.template_demo_page.hr_0'),
        type: 'user',
        required: true,
      },
      {
        key: 'apply_time',
        label: i18n.t('components.template_demo_page.k41'),
        type: 'date',
        required: true,
      },
    ],
    isactive: true,
    is_system: false,
    is_public: true,
    ai_enabled: true,
    version: 2,
    view_count: 200,
    use_count: 89,
    created_at: '2026-05-15T09:00:00Z',
    updated_at: '2026-06-12T11:00:00Z',
    created_by: 'hr-admin',
  },
  {
    id: '3',
    name: i18n.t('components.template_demo_page.k42'),
    code: 'expense-reimbursement',
    template_type: 'workflow',
    category_id: 'cat3',
    module: 'finance',
    description: i18n.t('components.template_demo_page.k43'),
    content: `{i18n.t('components.template_demo_page.k35')}

{i18n.t('components.template_demo_page.k36')}{{applicant_name}}
{i18n.t('components.template_demo_page.k37')}{{department}}

{i18n.t('components.template_demo_page.k38')}{{expense_type}}
{i18n.t('components.template_demo_page.k39')}¥{{amount}}

{i18n.t('components.template_demo_page.k40')}
{{details}}

{{#if is_over_budget}}⚠️ {i18n.t('components.template_demo_page.k41')}{{/if}}

{{#if is_over_budget}}{i18n.t('components.template_demo_page.k42')}{{over_budget_reason}}{{/if}}

{i18n.t('components.template_demo_page.k43')}{{approver_name}}
{i18n.t('components.template_demo_page.k44')}{{submit_time}}`,
    variables: [
      {
        key: 'applicant_name',
        label: i18n.t('components.template_demo_page.k44'),
        type: 'user',
        required: true,
      },
      {
        key: 'department',
        label: i18n.t('components.template_demo_page.k45'),
        type: 'string',
        required: true,
      },
      {
        key: 'expense_type',
        label: i18n.t('components.template_demo_page.k46'),
        type: 'select',
        required: true,
        options: [
          {
            value: i18n.t('components.template_demo_page.k47'),
            label: i18n.t('components.template_demo_page.k48'),
          },
          {
            value: i18n.t('components.template_demo_page.k49'),
            label: i18n.t('components.template_demo_page.k50'),
          },
          {
            value: i18n.t('components.template_demo_page.k51'),
            label: i18n.t('components.template_demo_page.k52'),
          },
          {
            value: i18n.t('components.template_demo_page.k53'),
            label: i18n.t('components.template_demo_page.k54'),
          },
          {
            value: i18n.t('components.template_demo_page.k55'),
            label: i18n.t('components.template_demo_page.k56'),
          },
        ],
      },
      {
        key: 'amount',
        label: i18n.t('components.template_demo_page.k57'),
        type: 'number',
        required: true,
      },
      {
        key: 'details',
        label: i18n.t('components.template_demo_page.k58'),
        type: 'string',
        required: true,
      },
      {
        key: 'is_over_budget',
        label: i18n.t('components.template_demo_page.k59'),
        type: 'string',
        required: false,
        options: [
          { value: 'true', label: i18n.t('components.template_demo_page.k60') },
          { value: 'false', label: i18n.t('components.template_demo_page.k61') },
        ],
      },
      {
        key: 'over_budget_reason',
        label: i18n.t('components.template_demo_page.k62'),
        type: 'string',
        required: false,
      },
      {
        key: 'approver_name',
        label: i18n.t('components.template_demo_page.k63'),
        type: 'user',
        required: true,
      },
      {
        key: 'submit_time',
        label: i18n.t('components.template_demo_page.k64'),
        type: 'date',
        required: true,
      },
    ],
    isactive: true,
    is_system: false,
    is_public: true,
    ai_enabled: false,
    version: 1,
    view_count: 156,
    use_count: 67,
    created_at: '2026-05-20T14:00:00Z',
    updated_at: '2026-06-05T16:00:00Z',
    created_by: 'finance-admin',
  },
];

const mockCategories: TemplateCategory[] = [
  {
    id: 'cat1',
    name: i18n.t('components.template_demo_page.k65'),
    code: 'procurement',
    category_type: 'workflow',
    template_count: 1,
    isactive: true,
  },
  {
    id: 'cat2',
    name: i18n.t('components.template_demo_page.k66'),
    code: 'hr',
    category_type: 'workflow',
    template_count: 1,
    isactive: true,
  },
  {
    id: 'cat3',
    name: i18n.t('components.template_demo_page.k67'),
    code: 'finance',
    category_type: 'workflow',
    template_count: 1,
    isactive: true,
  },
];

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role='tabpanel'
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

interface TemplateDemoPageProps {
  onClose?: () => void;
}

const TemplateDemoPage: React.FC<TemplateDemoPageProps> = ({ onClose: _onClose }) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [templateVariables, setTemplateVariables] = useState<Record<string, unknown>>({});
  const [renderedContent, setRenderedContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // 模拟加载模板列表
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setTemplates(mockTemplates);
    setIsLoading(false);
  };

  // 过滤模板
  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      searchTerm === '' ||
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (template.description &&
        template.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === '' || template.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // 处理模板选择
  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    setActiveTab(1);
    const initialVariables: Record<string, unknown> = {};
    template.variables?.forEach((varDef: TemplateVariable) => {
      if (varDef.default_value) {
        initialVariables[varDef.key] = varDef.default_value;
      } else if (varDef.type === 'number') {
        initialVariables[varDef.key] = 0;
      } else {
        initialVariables[varDef.key] = '';
      }
    });
    setTemplateVariables(initialVariables);
  };

  // 处理变量值变化
  const handleVariableChange = (key: string, value: unknown) => {
    setTemplateVariables((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // 渲染模板
  const handleRender = async () => {
    if (!selectedTemplate) return;

    setIsLoading(true);
    logger.info(i18n.t('components.template_demo_page.k1'));
    logger.info(i18n.t('components.template_demo_page.k2'), selectedTemplate.name);
    logger.info(i18n.t('components.template_demo_page.id_3'), selectedTemplate.id);
    logger.info(i18n.t('components.template_demo_page.k4'), selectedTemplate.content.length);
    logger.debug(i18n.t('components.template_demo_page.n_5'), selectedTemplate.content);
    logger.debug(
      i18n.t('components.template_demo_page.k6'),
      JSON.stringify(templateVariables, null, 2)
    );
    logger.debug(
      i18n.t('components.template_demo_page.k7'),
      JSON.stringify(selectedTemplate.variables, null, 2)
    );

    await new Promise((resolve) => setTimeout(resolve, 300));

    let result = selectedTemplate.content;
    let stepNumber = 1;

    // 步骤1: 替换变量
    logger.info(
      `${i18n.t('components.template_demo_page.n_8')}${stepNumber}${i18n.t('components.template_demo_page.k9')}`
    );
    Object.entries(templateVariables).forEach(([key, value]) => {
      const pattern = new RegExp(`{{${key}}}`, 'g');
      const matches = result.match(pattern);
      const matchCount = matches ? matches.length : 0;
      const beforeReplace = result;
      result = result.replace(pattern, String(value));
      const replacedCount = beforeReplace.split(pattern).length - 1;

      logger.info(`${i18n.t('components.template_demo_page.k10')}${key}]:`);
      logger.info(
        `  ${i18n.t('components.template_demo_page.k11')}${value}${i18n.t('components.template_demo_page.k12')} ${typeof value})`
      );
      logger.info(`  ${i18n.t('components.template_demo_page.k13')} ${matchCount}`);
      logger.info(`  ${i18n.t('components.template_demo_page.k14')} ${replacedCount}`);
      logger.debug(`  ${i18n.t('components.template_demo_page.k15')} ${pattern}`);

      if (matchCount === 0) {
        logger.warn(`  ${i18n.t('components.template_demo_page.k16')}${key}}}`);
      }

      // 检查是否还有未替换的变量
      const remainingPattern = new RegExp(`{{${key}}}`, 'g');
      if (remainingPattern.test(result)) {
        logger.error(
          `  ${i18n.t('components.template_demo_page.k17')}${key}${i18n.t('components.template_demo_page.k18')}`
        );
      }
    });
    stepNumber++;

    // 步骤2: 处理条件判断
    logger.info(
      `${i18n.t('components.template_demo_page.n_19')}${stepNumber}${i18n.t('components.template_demo_page.k20')}`
    );
    const conditionPattern = /\{\{#if (\w+)\}\}(.*?)\{\{\/if\}\}/gs;
    const conditionMatches = result.match(conditionPattern);
    logger.info(
      i18n.t('components.template_demo_page.k21'),
      conditionMatches ? conditionMatches.length : 0
    );

    result = result.replace(conditionPattern, (_: string, condition: string, content: string) => {
      const value = templateVariables[condition];
      const conditionResult = value ? content.trim() : '';
      logger.info(`${i18n.t('components.template_demo_page.if_22')} ${condition}}}:`);
      logger.info(`  ${i18n.t('components.template_demo_page.k23')} ${condition}`);
      logger.info(
        `  ${i18n.t('components.template_demo_page.k24')}${value}${i18n.t('components.template_demo_page.k25')} ${typeof value})`
      );
      logger.debug(`  ${i18n.t('components.template_demo_page.k26')} ${Boolean(value)}`);
      logger.debug(`  ${i18n.t('components.template_demo_page.k27')} ${content.length}`);
      logger.debug(
        `  ${i18n.t('components.template_demo_page.k28')}${conditionResult}${i18n.t('components.template_demo_page.k29')} ${Boolean(value)})`
      );
      return conditionResult;
    });
    stepNumber++;

    // 步骤3: 处理默认值
    logger.info(
      `${i18n.t('components.template_demo_page.n_30')}${stepNumber}${i18n.t('components.template_demo_page.k31')}`
    );
    const defaultPattern = /\{\{(\w+)\s*\|\|\s*["']([^"']+)["']\}\}/g;
    const defaultMatches = result.match(defaultPattern);
    logger.info(
      i18n.t('components.template_demo_page.k32'),
      defaultMatches ? defaultMatches.length : 0
    );

    result = result.replace(defaultPattern, (_: string, key: string, defaultValue: string) => {
      const value = templateVariables[key];
      const finalValue = value && value !== '' ? String(value) : defaultValue;
      logger.info(
        `${i18n.t('components.template_demo_page.k33')}${'${' + '{'}${key} || "${defaultValue}"${'}' + '}'}:`
      );
      logger.info(`  ${i18n.t('components.template_demo_page.k34')} ${key}`);
      logger.info(`  ${i18n.t('components.template_demo_page.k35')}${value}"`);
      logger.info(`  ${i18n.t('components.template_demo_page.k36')}${defaultValue}"`);
      logger.info(`  ${i18n.t('components.template_demo_page.k37')}${finalValue}"`);
      logger.debug(`  ${i18n.t('components.template_demo_page.k38')} ${!value || value === ''}`);
      return finalValue;
    });
    stepNumber++;

    // 步骤4: 替换动态变量
    logger.info(
      `${i18n.t('components.template_demo_page.n_39')}${stepNumber}${i18n.t('components.template_demo_page.k40')}`
    );
    const now = new Date();
    const todayValue = now.toISOString().split('T')[0];
    const nowValue = now.toISOString();

    logger.info(i18n.t('components.template_demo_page.k41'));
    logger.info(`  - {{today}}: "${todayValue}"`);
    logger.info(`  - {{now}}: "${nowValue}"`);

    const todayPattern = /\{\{today\}\}/g;
    const todayMatches = result.match(todayPattern);
    logger.info(
      `  ${i18n.t('components.template_demo_page.k42')} ${todayMatches ? todayMatches.length : 0}`
    );
    result = result.replace(todayPattern, todayValue);

    const nowPattern = /\{\{now\}\}/g;
    const nowMatches = result.match(nowPattern);
    logger.info(
      `  ${i18n.t('components.template_demo_page.now_43')} ${nowMatches ? nowMatches.length : 0}`
    );
    result = result.replace(nowPattern, nowValue);
    stepNumber++;

    // 步骤5: 检查未处理的变量
    logger.info(
      `${i18n.t('components.template_demo_page.n_44')}${stepNumber}${i18n.t('components.template_demo_page.k45')}`
    );
    const remainingVarsPattern = /\{\{([^#/][^}]+)\}\}/g;
    const remainingVars = result.match(remainingVarsPattern);
    if (remainingVars && remainingVars.length > 0) {
      logger.warn(i18n.t('components.template_demo_page.k46'));
      remainingVars.forEach((varMatch) => {
        logger.warn(`  - ${varMatch}`);
      });
      logger.warn(i18n.t('components.template_demo_page.k47'));
      logger.warn(i18n.t('components.template_demo_page.1_48'));
      logger.warn(i18n.t('components.template_demo_page.2_49'));
      logger.warn(i18n.t('components.template_demo_page.3_50'));
    } else {
      logger.info(i18n.t('components.template_demo_page.k51'));
    }
    stepNumber++;

    // 最终结果
    logger.info(i18n.t('components.template_demo_page.n_52'));
    logger.info(i18n.t('components.template_demo_page.k53'), result.length);
    logger.debug(i18n.t('components.template_demo_page.n_54'), result);
    logger.info(
      i18n.t('components.template_demo_page.k55'),
      i18n.t('components.template_demo_page.300ms_56')
    );

    setRenderedContent(result);
    setIsLoading(false);
    setActiveTab(2);
  };

  // 应用模板
  const handleApplyTemplate = () => {
    if (!selectedTemplate) return;
    alert(
      `${i18n.t('components.template_demo_page.k57')}${selectedTemplate.name}${i18n.t('components.template_demo_page.k58')}${JSON.stringify(templateVariables, null, 2)}`
    );
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* 顶部导航 */}
      <Box
        component='header'
        sx={{
          bgcolor: 'background.paper',
          boxShadow: 1,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            maxWidth: 1400,
            mx: 'auto',
            px: 2,
            py: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1,
                bgcolor: 'secondary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText
                sx={{
                  width: 20,
                  height: 20,
                  color: 'common.white',
                }}
              />
            </Box>
            <Box>
              <Typography
                variant='h6'
                sx={{ fontWeight: 700, color: 'grey.800' }}
              >
                {i18n.t('components.template_demo_page.k59')}
              </Typography>
              <Typography
                variant='caption'
                sx={{ color: 'grey.500' }}
              >
                {i18n.t('components.template_demo_page.k60')}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box
        component='main'
        sx={{ maxWidth: 1400, mx: 'auto', px: 2, py: 3 }}
      >
        {/* 功能介绍卡片 */}
        <Card sx={{ mb: 3 }}>
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Sparkles sx={{ color: 'warning.main', fontSize: 20 }} />
                <Typography variant='h6'>{i18n.t('components.template_demo_page.k68')}</Typography>
              </Box>
            }
            subheader={i18n.t('components.template_demo_page.k69')}
          />
          <CardContent
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
              gap: 2,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1.5,
                p: 2,
                bgcolor: 'info.light',
                borderRadius: 1,
              }}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  bgcolor: 'info.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Typography
                  sx={{
                    color: 'common.white',
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  1
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 500, color: 'grey.800' }}
                >
                  {i18n.t('components.template_demo_page.k61')}
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500' }}
                >
                  {i18n.t('components.template_demo_page.k62')}
                </Typography>
              </Box>
            </Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1.5,
                p: 2,
                bgcolor: 'secondary.light',
                borderRadius: 1,
              }}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  bgcolor: 'secondary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Typography
                  sx={{
                    color: 'common.white',
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  2
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 500, color: 'grey.800' }}
                >
                  {i18n.t('components.template_demo_page.k63')}
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500' }}
                >
                  {i18n.t('components.template_demo_page.k64')}
                </Typography>
              </Box>
            </Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1.5,
                p: 2,
                bgcolor: 'success.light',
                borderRadius: 1,
              }}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  bgcolor: 'success.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Typography
                  sx={{
                    color: 'common.white',
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  3
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 500, color: 'grey.800' }}
                >
                  {i18n.t('components.template_demo_page.k65')}
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500' }}
                >
                  {i18n.t('components.template_demo_page.k66')}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* 主内容区域 */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant='fullWidth'
          >
            <Tab
              icon={<FileText sx={{ fontSize: 18 }} />}
              iconPosition='start'
              label={i18n.t('components.template_demo_page.k70')}
            />
            <Tab
              icon={<Settings sx={{ fontSize: 18 }} />}
              iconPosition='start'
              label={i18n.t('components.template_demo_page.k71')}
              disabled={!selectedTemplate}
            />
            <Tab
              icon={<Play sx={{ fontSize: 18 }} />}
              iconPosition='start'
              label={i18n.t('components.template_demo_page.k72')}
              disabled={!selectedTemplate}
            />
          </Tabs>
        </Box>

        {/* 选择模板 */}
        <TabPanel
          value={activeTab}
          index={0}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'flex-start', sm: 'center' },
              justifyContent: 'space-between',
              gap: 2,
              mb: 3,
            }}
          >
            <Box>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600, color: 'grey.800' }}
              >
                {i18n.t('components.template_demo_page.k67')}
              </Typography>
              <Typography
                variant='body2'
                sx={{ color: 'grey.500' }}
              >
                {i18n.t('components.template_demo_page.k45')} {templates.length}{' '}
                {i18n.t('components.template_demo_page.k46')}
              </Typography>
            </Box>
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                width: { xs: '100%', sm: 'auto' },
              }}
            >
              <Box sx={{ position: 'relative', flex: { xs: 1, sm: 'none' } }}>
                <Search
                  sx={{
                    position: 'absolute',
                    left: 2,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: 18,
                    color: 'grey.400',
                  }}
                />
                <TextField
                  size='small'
                  placeholder={i18n.t('components.template_demo_page.k68')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  sx={{ pl: 5, width: { xs: '100%', sm: 200 } }}
                />
              </Box>
              <TextField
                select
                size='small'
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                sx={{ minWidth: 120 }}
                slotProps={{ select: { native: true } }}
              >
                <option value=''>{i18n.t('components.template_demo_page.k73')}</option>
                {mockCategories.map((cat) => (
                  <option
                    key={cat.id}
                    value={cat.id}
                  >
                    {cat.name}
                  </option>
                ))}
              </TextField>
            </Box>
          </Box>

          {isLoading ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                py: 6,
              }}
            >
              <RefreshCw
                sx={{
                  fontSize: 24,
                  color: 'primary.main',
                  animation: 'spin 1s linear infinite',
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' },
                  },
                }}
              />
              <Typography sx={{ ml: 1, color: 'grey.500' }}>
                {i18n.t('components.template_demo_page.k69')}
              </Typography>
            </Box>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'repeat(2, 1fr)',
                  lg: 'repeat(3, 1fr)',
                },
                gap: 2,
              }}
            >
              {filteredTemplates.map((template) => (
                <Card
                  key={template.id}
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      boxShadow: 4,
                    },
                    ...(selectedTemplate?.id === template.id && {
                      outline: 2,
                      outlineColor: 'primary.main',
                      boxShadow: 3,
                    }),
                  }}
                  onClick={() => handleTemplateSelect(template)}
                >
                  <CardHeader
                    subheader={
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Box>
                          <Typography
                            variant='subtitle1'
                            sx={{ fontWeight: 600 }}
                          >
                            {template.name}
                          </Typography>
                          <Typography
                            variant='caption'
                            sx={{ color: 'grey.500' }}
                          >
                            {template.description}
                          </Typography>
                        </Box>
                        {template.ai_enabled && (
                          <Sparkles sx={{ fontSize: 16, color: 'warning.main' }} />
                        )}
                      </Box>
                    }
                  />
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mb: 1,
                      }}
                    >
                      <Chip
                        label={template.template_type}
                        size='small'
                        sx={{
                          bgcolor: 'info.light',
                          color: 'info.main',
                          fontSize: 12,
                        }}
                      />
                      <Chip
                        label={`${template.use_count} ${i18n.t('components.template_demo_page.k70')}`}
                        size='small'
                        sx={{
                          bgcolor: 'success.light',
                          color: 'success.main',
                          fontSize: 12,
                        }}
                      />
                    </Box>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: 12,
                        color: 'grey.400',
                      }}
                    >
                      <Typography
                        variant='caption'
                        sx={{ color: 'grey.400' }}
                      >
                        {i18n.t('components.template_demo_page.k47')} {template.version}
                      </Typography>
                      <Typography
                        variant='caption'
                        sx={{ color: 'grey.400' }}
                      >
                        {i18n.t('components.template_demo_page.k48')} {template.view_count}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </TabPanel>

        {/* 配置变量 */}
        <TabPanel
          value={activeTab}
          index={1}
        >
          {selectedTemplate && (
            <>
              <Card sx={{ mb: 2 }}>
                <CardHeader
                  title={selectedTemplate.name}
                  subheader={selectedTemplate.description}
                />
              </Card>

              <Card sx={{ mb: 2 }}>
                <CardHeader
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Settings sx={{ fontSize: 18 }} />
                      <Typography variant='h6'>
                        {i18n.t('components.template_demo_page.k74')}
                      </Typography>
                    </Box>
                  }
                  subheader={i18n.t('components.template_demo_page.k75')}
                />
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {selectedTemplate.variables?.map((varDef: TemplateVariable) => (
                    <FormControl
                      key={varDef.key}
                      fullWidth
                    >
                      <FormLabel
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          mb: 1,
                        }}
                      >
                        {varDef.label}
                        {varDef.required && <Typography sx={{ color: 'error.main' }}>*</Typography>}
                      </FormLabel>
                      {varDef.type === 'select' ? (
                        <TextField
                          select
                          size='small'
                          value={templateVariables[varDef.key] || ''}
                          onChange={(e) => handleVariableChange(varDef.key, e.target.value)}
                          slotProps={{ select: { native: true } }}
                        >
                          <option value=''>{i18n.t('components.template_demo_page.k76')}</option>
                          {varDef.options?.map((opt) => (
                            <option
                              key={opt.value}
                              value={opt.value}
                            >
                              {opt.label}
                            </option>
                          ))}
                        </TextField>
                      ) : varDef.type === 'number' ? (
                        <TextField
                          type='number'
                          size='small'
                          value={templateVariables[varDef.key] || ''}
                          onChange={(e) =>
                            handleVariableChange(varDef.key, parseInt(e.target.value) || 0)
                          }
                          placeholder={`${i18n.t('components.template_demo_page.k71')}${varDef.label}`}
                        />
                      ) : varDef.type === 'date' ? (
                        <TextField
                          type='date'
                          size='small'
                          value={templateVariables[varDef.key] || ''}
                          onChange={(e) => handleVariableChange(varDef.key, e.target.value)}
                          slotProps={{ inputLabel: { shrink: true } } as const}
                        />
                      ) : (
                        <TextField
                          size='small'
                          value={templateVariables[varDef.key] || ''}
                          onChange={(e) => handleVariableChange(varDef.key, e.target.value)}
                          placeholder={`${i18n.t('components.template_demo_page.k72')}${varDef.label}`}
                        />
                      )}
                    </FormControl>
                  ))}
                </CardContent>
              </Card>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  onClick={() => setActiveTab(0)}
                  variant='outlined'
                >
                  {i18n.t('components.template_demo_page.k73')}
                </Button>
                <Button
                  onClick={handleRender}
                  variant='contained'
                  color='primary'
                  sx={{ flex: 1 }}
                  disabled={isLoading}
                  startIcon={
                    isLoading ? (
                      <RefreshCw
                        sx={{
                          fontSize: 18,
                          animation: 'spin 1s linear infinite',
                          '@keyframes spin': {
                            '0%': { transform: 'rotate(0deg)' },
                            '100%': { transform: 'rotate(360deg)' },
                          },
                        }}
                      />
                    ) : (
                      <Play sx={{ fontSize: 18 }} />
                    )
                  }
                >
                  {isLoading
                    ? i18n.t('components.template_demo_page.k74')
                    : i18n.t('components.template_demo_page.k77')}
                </Button>
              </Box>
            </>
          )}
        </TabPanel>

        {/* 预览渲染 */}
        <TabPanel
          value={activeTab}
          index={2}
        >
          {selectedTemplate && (
            <>
              <Card sx={{ mb: 2 }}>
                <CardHeader
                  title={
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Play sx={{ fontSize: 18 }} />
                        <Typography variant='h6'>
                          {i18n.t('components.template_demo_page.k78')}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          variant='outlined'
                          size='small'
                          startIcon={<Download sx={{ fontSize: 16 }} />}
                        >
                          {i18n.t('components.template_demo_page.k75')}
                        </Button>
                      </Box>
                    </Box>
                  }
                />
                <CardContent>
                  <Box
                    component='pre'
                    sx={{
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'inherit',
                      color: 'grey.700',
                      bgcolor: 'grey.50',
                      p: 2,
                      borderRadius: 1,
                      minHeight: 300,
                    }}
                  >
                    {renderedContent || i18n.t('components.template_demo_page.k76')}
                  </Box>
                </CardContent>
              </Card>

              <Card sx={{ mb: 2 }}>
                <CardHeader title={i18n.t('components.template_demo_page.k79')} />
                <CardContent>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: {
                        xs: '1fr',
                        md: 'repeat(2, 1fr)',
                        lg: 'repeat(3, 1fr)',
                      },
                      gap: 1,
                    }}
                  >
                    {Object.entries(templateVariables).map(([key, value]) => (
                      <Box
                        key={key}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          p: 1,
                          bgcolor: 'grey.50',
                          borderRadius: 1,
                        }}
                      >
                        <Typography
                          variant='body2'
                          sx={{ color: 'grey.500' }}
                        >
                          {key}
                        </Typography>
                        <Typography
                          variant='body2'
                          sx={{ fontWeight: 500, color: 'grey.800' }}
                        >
                          {typeof value === 'boolean'
                            ? value
                              ? i18n.t('components.template_demo_page.k81')
                              : i18n.t('components.template_demo_page.k80')
                            : String(value)}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  onClick={() => setActiveTab(1)}
                  variant='outlined'
                >
                  {i18n.t('components.template_demo_page.k77')}
                </Button>
                <Button
                  onClick={handleApplyTemplate}
                  variant='contained'
                  color='success'
                  sx={{ flex: 1 }}
                  startIcon={<Play sx={{ fontSize: 18 }} />}
                >
                  {i18n.t('components.template_demo_page.k78')}
                </Button>
              </Box>
            </>
          )}
        </TabPanel>
      </Box>
    </Box>
  );
};

export default TemplateDemoPage;

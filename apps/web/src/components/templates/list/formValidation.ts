import i18n from '@/i18n';
import type { CrudFormFieldConfig } from './types';

export type FormMode = 'create' | 'edit' | 'view';

/**
 * 校验 CRUD 自动表单（formFields 模式）。
 * 返回字段错误映射；空对象表示校验通过。
 * 从 ListPageTemplate 内联实现原样抽出，保证消息与分支顺序一致。
 */
export function validateCrudForm(
  formFields: CrudFormFieldConfig[] | undefined,
  formData: Record<string, unknown>,
  formMode: FormMode
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!formFields) return errors;
  const visibleFields = formFields.filter((field) => {
    if (formMode === 'create' && field.hideInCreate) return false;
    if (formMode === 'edit' && field.hideInEdit) return false;
    return true;
  });
  visibleFields.forEach((field) => {
    const value = formData[field.key];
    // 必填验证（从 required 字段或 rules 中的 required 类型）
    const isRequired = field.required || field.rules?.some((r) => r.type === 'required');
    if (
      isRequired &&
      (value === undefined ||
        value === null ||
        value === '' ||
        (Array.isArray(value) && value.length === 0))
    ) {
      const rule = field.rules?.find((r) => r.type === 'required');
      errors[field.key] =
        rule?.message || `${field.label}${i18n.t('components.list_page_template.k3')}`;
      return;
    }
    // 跳过空值的其他验证
    if (value === undefined || value === null || value === '') return;
    // 其他规则验证
    if (field.rules) {
      for (const rule of field.rules) {
        if (rule.type === 'required') continue; // 已处理
        if (rule.type === 'email') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(String(value))) {
            errors[field.key] = rule.message || i18n.t('templates.list_page_template.k5');
            break;
          }
        }
        if (rule.type === 'number' && isNaN(Number(value))) {
          errors[field.key] = rule.message || i18n.t('templates.list_page_template.k6');
          break;
        }
        if (rule.type === 'min' && Number(value) < (rule.min ?? 0)) {
          errors[field.key] =
            rule.message || `${i18n.t('components.list_page_template.k4')}${rule.min}`;
          break;
        }
        if (rule.type === 'max' && Number(value) > (rule.max ?? Infinity)) {
          errors[field.key] =
            rule.message || `${i18n.t('components.list_page_template.k5')}${rule.max}`;
          break;
        }
        if (rule.type === 'minLength' && String(value).length < (rule.minLength ?? 0)) {
          errors[field.key] =
            rule.message ||
            `${i18n.t('components.list_page_template.k6')}${rule.minLength}${i18n.t('components.list_page_template.k7')}`;
          break;
        }
        if (rule.type === 'maxLength' && String(value).length > (rule.maxLength ?? Infinity)) {
          errors[field.key] =
            rule.message ||
            `${i18n.t('components.list_page_template.k8')}${rule.maxLength}${i18n.t('components.list_page_template.k9')}`;
          break;
        }
        if (rule.type === 'pattern' && rule.pattern && !rule.pattern.test(String(value))) {
          errors[field.key] = rule.message || i18n.t('templates.list_page_template.k7');
          break;
        }
        if (rule.validator) {
          const result = rule.validator(value);
          if (result !== true) {
            errors[field.key] =
              typeof result === 'string'
                ? result
                : rule.message || i18n.t('templates.list_page_template.k8');
            break;
          }
        }
      }
    }
  });
  return errors;
}

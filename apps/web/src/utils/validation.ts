export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  min?: number;
  max?: number;
  custom?: (value: any) => boolean | string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface Validator {
  validate: (value: any, rule: ValidationRule, fieldName: string) => string | null;
}

export const validators: Validator = {
  validate: (value: any, rule: ValidationRule, fieldName: string): string | null => {
    if (rule.required && (!value || (typeof value === 'string' && !value.trim()))) {
      return `${fieldName}不能为空`;
    }

    if (value && typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        return `${fieldName}至少需要${rule.minLength}个字符`;
      }

      if (rule.maxLength && value.length > rule.maxLength) {
        return `${fieldName}不能超过${rule.maxLength}个字符`;
      }

      if (rule.pattern && !rule.pattern.test(value)) {
        return `${fieldName}格式不正确`;
      }
    }

    if (value && typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        return `${fieldName}不能小于${rule.min}`;
      }

      if (rule.max !== undefined && value > rule.max) {
        return `${fieldName}不能大于${rule.max}`;
      }
    }

    if (rule.custom) {
      const result = rule.custom(value);
      if (result !== true) {
        return typeof result === 'string' ? result : `${fieldName}验证失败`;
      }
    }

    return null;
  },
};

export const patterns = {
  username: /^[a-zA-Z0-9]+$/,
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone: /^1[3-9]\d{9}$/,
  code: /^[a-zA-Z0-9]{3,20}$/,
  amount: /^\d+(\.\d{1,2})?$/,
  date: /^\d{4}-\d{2}-\d{2}$/,
};

export const validationRules = {
  username: {
    required: true,
    maxLength: 20,
    pattern: patterns.username,
  },
  email: {
    required: true,
    pattern: patterns.email,
  },
  password: {
    required: true,
    minLength: 8,
    custom: (value: string) => {
      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
        return '密码必须包含大小写字母和数字';
      }
      return true;
    },
  },
  code: {
    required: true,
    minLength: 3,
    maxLength: 20,
    pattern: patterns.code,
  },
  name: {
    required: true,
    minLength: 2,
    maxLength: 100,
  },
  description: {
    maxLength: 1000,
  },
  amount: {
    custom: (value: any) => {
      if (!value) return true;
      const num = parseFloat(value);
      if (isNaN(num) || num < 0) {
        return '金额必须是正数';
      }
      if (!patterns.amount.test(value.toString())) {
        return '金额最多保留2位小数';
      }
      return true;
    },
  },
  date: {
    pattern: patterns.date,
  },
  phone: {
    pattern: patterns.phone,
  },
};

export class FormValidator {
  private rules: Record<string, ValidationRule>;
  private errors: Map<string, string>;

  constructor(rules: Record<string, ValidationRule>) {
    this.rules = rules;
    this.errors = new Map();
  }

  validate(data: Record<string, any>): boolean {
    this.errors.clear();

    for (const [field, rule] of Object.entries(this.rules)) {
      const value = data[field];
      const fieldName = this.getFieldName(field);
      const error = validators.validate(value, rule, fieldName);

      if (error) {
        this.errors.set(field, error);
      }
    }

    return this.errors.size === 0;
  }

  getErrors(): Record<string, string> {
    return Object.fromEntries(this.errors);
  }

  getError(field: string): string | undefined {
    return this.errors.get(field);
  }

  hasError(field: string): boolean {
    return this.errors.has(field);
  }

  private getFieldName(field: string): string {
    const fieldNames: Record<string, string> = {
      username: '用户名',
      email: '邮箱',
      password: '密码',
      name: '名称',
      code: '编号',
      description: '描述',
      amount: '金额',
      date: '日期',
      phone: '电话',
      contact_person: '联系人',
      contact_phone: '联系电话',
      title: '标题',
      status: '状态',
      inspector: '检验员',
      experimenter: '试验员',
      assignee: '负责人',
      proposer: '提议人',
    };
    return fieldNames[field] || field;
  }
}

export function validateForm(
  data: Record<string, any>,
  rules: Record<string, ValidationRule>
): Record<string, string> {
  const validator = new FormValidator(rules);
  validator.validate(data);
  return validator.getErrors();
}

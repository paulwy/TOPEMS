/**
 * 表单验证工具函数
 * 提供常用的表单验证规则
 */

/**
 * 验证规则类型
 */
export interface ValidationRule {
  validate: (value: any) => boolean;
  message: string;
}

/**
 * 必填验证
 */
export const required = (message: string = '此字段为必填项'): ValidationRule => ({
  validate: (value: any) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  },
  message,
});

/**
 * 最小长度验证
 */
export const minLength = (min: number, message?: string): ValidationRule => ({
  validate: (value: any) => {
    if (!value) return true;
    return String(value).length >= min;
  },
  message: message || `长度不能少于${min}个字符`,
});

/**
 * 最大长度验证
 */
export const maxLength = (max: number, message?: string): ValidationRule => ({
  validate: (value: any) => {
    if (!value) return true;
    return String(value).length <= max;
  },
  message: message || `长度不能超过${max}个字符`,
});

/**
 * 邮箱验证
 */
export const email = (message: string = '请输入有效的邮箱地址'): ValidationRule => ({
  validate: (value: any) => {
    if (!value) return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(String(value));
  },
  message,
});

/**
 * 手机号验证
 */
export const phone = (message: string = '请输入有效的手机号'): ValidationRule => ({
  validate: (value: any) => {
    if (!value) return true;
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(String(value));
  },
  message,
});

/**
 * 固定电话验证
 */
export const telephone = (message: string = '请输入有效的电话号码'): ValidationRule => ({
  validate: (value: any) => {
    if (!value) return true;
    const telephoneRegex = /^(\d{3,4}-)?\d{7,8}$/;
    return telephoneRegex.test(String(value));
  },
  message,
});

/**
 * URL验证
 */
export const url = (message: string = '请输入有效的URL地址'): ValidationRule => ({
  validate: (value: any) => {
    if (!value) return true;
    try {
      new URL(String(value));
      return true;
    } catch {
      return false;
    }
  },
  message,
});

/**
 * 数字范围验证
 */
export const range = (min: number, max: number, message?: string): ValidationRule => ({
  validate: (value: any) => {
    if (!value && value !== 0) return true;
    const num = Number(value);
    return !isNaN(num) && num >= min && num <= max;
  },
  message: message || `数值必须在${min}和${max}之间`,
});

/**
 * 最小值验证
 */
export const min = (minValue: number, message?: string): ValidationRule => ({
  validate: (value: any) => {
    if (!value && value !== 0) return true;
    const num = Number(value);
    return !isNaN(num) && num >= minValue;
  },
  message: message || `值不能小于${minValue}`,
});

/**
 * 最大值验证
 */
export const max = (maxValue: number, message?: string): ValidationRule => ({
  validate: (value: any) => {
    if (!value && value !== 0) return true;
    const num = Number(value);
    return !isNaN(num) && num <= maxValue;
  },
  message: message || `值不能大于${maxValue}`,
});

/**
 * 整数验证
 */
export const integer = (message: string = '请输入整数'): ValidationRule => ({
  validate: (value: any) => {
    if (!value && value !== 0) return true;
    return /^-?\d+$/.test(String(value));
  },
  message,
});

/**
 * 正整数验证
 */
export const positiveInteger = (message: string = '请输入正整数'): ValidationRule => ({
  validate: (value: any) => {
    if (!value) return true;
    return /^[1-9]\d*$/.test(String(value));
  },
  message,
});

/**
 * 身份证验证
 */
export const idCard = (message: string = '请输入有效的身份证号'): ValidationRule => ({
  validate: (value: any) => {
    if (!value) return true;
    const idCardRegex = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/;
    return idCardRegex.test(String(value));
  },
  message,
});

/**
 * 银行卡验证
 */
export const bankCard = (message: string = '请输入有效的银行卡号'): ValidationRule => ({
  validate: (value: any) => {
    if (!value) return true;
    const bankCardRegex = /^[1-9]\d{9,29}$/;
    return bankCardRegex.test(String(value).replace(/\s/g, ''));
  },
  message,
});

/**
 * 密码强度验证
 */
export const passwordStrength = (
  options: {
    minLength?: number;
    requireUppercase?: boolean;
    requireLowercase?: boolean;
    requireNumber?: boolean;
    requireSpecial?: boolean;
  } = {},
  message: string = '密码强度不足'
): ValidationRule => {
  const {
    minLength = 8,
    requireUppercase = true,
    requireLowercase = true,
    requireNumber = true,
    requireSpecial = false,
  } = options;

  return {
    validate: (value: any) => {
      if (!value) return true;
      const str = String(value);

      if (str.length < minLength) return false;
      if (requireUppercase && !/[A-Z]/.test(str)) return false;
      if (requireLowercase && !/[a-z]/.test(str)) return false;
      if (requireNumber && !/\d/.test(str)) return false;
      if (requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(str)) return false;

      return true;
    },
    message,
  };
};

/**
 * 两次输入是否一致验证
 */
export const match = (
  matchValue: () => any,
  message: string = '两次输入不一致'
): ValidationRule => ({
  validate: (value: any) => {
    return value === matchValue();
  },
  message,
});

/**
 * 自定义正则验证
 */
export const pattern = (regex: RegExp, message: string = '格式不正确'): ValidationRule => ({
  validate: (value: any) => {
    if (!value) return true;
    return regex.test(String(value));
  },
  message,
});

/**
 * 验证器类
 */
export class Validator {
  private rules: Map<string, ValidationRule[]>;
  private errors: Map<string, string>;

  constructor() {
    this.rules = new Map();
    this.errors = new Map();
  }

  /**
   * 添加验证规则
   */
  addRule(field: string, rule: ValidationRule): this {
    const rules = this.rules.get(field) || [];
    rules.push(rule);
    this.rules.set(field, rules);
    return this;
  }

  /**
   * 批量添加规则
   */
  addRules(rules: Record<string, ValidationRule[]>): this {
    Object.entries(rules).forEach(([field, fieldRules]) => {
      const existingRules = this.rules.get(field) || [];
      this.rules.set(field, [...existingRules, ...fieldRules]);
    });
    return this;
  }

  /**
   * 验证所有字段
   */
  validate(values: Record<string, any>): boolean {
    this.errors.clear();
    let isValid = true;

    this.rules.forEach((rules, field) => {
      const value = values[field];
      for (const rule of rules) {
        if (!rule.validate(value)) {
          this.errors.set(field, rule.message);
          isValid = false;
          break;
        }
      }
    });

    return isValid;
  }

  /**
   * 验证单个字段
   */
  validateField(field: string, value: any): string | null {
    const rules = this.rules.get(field);
    if (!rules) return null;

    for (const rule of rules) {
      if (!rule.validate(value)) {
        this.errors.set(field, rule.message);
        return rule.message;
      }
    }

    this.errors.delete(field);
    return null;
  }

  /**
   * 获取错误信息
   */
  getError(field: string): string | undefined {
    return this.errors.get(field);
  }

  /**
   * 获取所有错误
   */
  getErrors(): Record<string, string> {
    return Object.fromEntries(this.errors);
  }

  /**
   * 是否有错误
   */
  hasErrors(): boolean {
    return this.errors.size > 0;
  }

  /**
   * 清除错误
   */
  clear(): void {
    this.errors.clear();
  }
}

/**
 * 创建验证器工厂函数
 */
export const createValidator = () => new Validator();

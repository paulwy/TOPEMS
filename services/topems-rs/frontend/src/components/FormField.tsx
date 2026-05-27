import React, { useState, useEffect, ChangeEvent, FocusEvent } from 'react';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  min?: number;
  max?: number;
  email?: boolean;
  custom?: (value: string) => string | null;
}

export interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select';
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  validation?: ValidationRule;
  options?: { value: string; label: string }[];
  error?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = 'text',
  placeholder,
  value,
  onChange,
  validation,
  options,
  error: externalError,
}) => {
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (touched && validation) {
      validate(value, validation);
    }
  }, [value, touched, validation]);

  const validate = (val: string, rules: ValidationRule) => {
    if (rules.required && !val.trim()) {
      setError('此字段为必填项');
      return;
    }
    if (rules.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(val)) {
        setError('请输入有效的邮箱地址');
        return;
      }
    }
    if (rules.minLength && val.length < rules.minLength) {
      setError(`最少需要 ${rules.minLength} 个字符`);
      return;
    }
    if (rules.maxLength && val.length > rules.maxLength) {
      setError(`最多允许 ${rules.maxLength} 个字符`);
      return;
    }
    if (rules.pattern && !rules.pattern.test(val)) {
      setError('格式不正确');
      return;
    }
    if (rules.min !== undefined && parseFloat(val) < rules.min) {
      setError(`最小值为 ${rules.min}`);
      return;
    }
    if (rules.max !== undefined && parseFloat(val) > rules.max) {
      setError(`最大值为 ${rules.max}`);
      return;
    }
    if (rules.custom) {
      const customError = rules.custom(val);
      if (customError) {
        setError(customError);
        return;
      }
    }
    setError('');
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    onChange(e.target.value);
  };

  const handleBlur = () => {
    setTouched(true);
    if (validation) {
      validate(value, validation);
    }
  };

  const hasError = error || externalError;

  return (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}
        {validation?.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {type === 'textarea' ? (
        <textarea
          id={name}
          name={name}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors resize-none ${
            hasError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-primary-500'
          }`}
          rows={4}
        />
      ) : type === 'select' ? (
        <select
          id={name}
          name={name}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
            hasError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-primary-500'
          }`}
        >
          <option value="">请选择</option>
          {options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
            hasError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-primary-500'
          }`}
        />
      )}
      {hasError && (
        <p className="text-sm text-red-600 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {externalError || error}
        </p>
      )}
    </div>
  );
};

export interface FormState {
  values: Record<string, string>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
}

export const useForm = (initialValues: Record<string, string>) => {
  const [formState, setFormState] = useState<FormState>({
    values: initialValues,
    errors: {},
    touched: {},
  });

  const handleChange = (name: string, value: string) => {
    setFormState((prev) => ({
      ...prev,
      values: { ...prev.values, [name]: value },
    }));
  };

  const handleBlur = (name: string) => {
    setFormState((prev) => ({
      ...prev,
      touched: { ...prev.touched, [name]: true },
    }));
  };

  const validateField = (name: string, value: string, rules: ValidationRule) => {
    let error = '';
    
    if (rules.required && !value.trim()) {
      error = '此字段为必填项';
    } else if (rules.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        error = '请输入有效的邮箱地址';
      }
    } else if (rules.minLength && value.length < rules.minLength) {
      error = `最少需要 ${rules.minLength} 个字符`;
    } else if (rules.maxLength && value.length > rules.maxLength) {
      error = `最多允许 ${rules.maxLength} 个字符`;
    } else if (rules.pattern && !rules.pattern.test(value)) {
      error = '格式不正确';
    } else if (rules.min !== undefined && parseFloat(value) < rules.min) {
      error = `最小值为 ${rules.min}`;
    } else if (rules.max !== undefined && parseFloat(value) > rules.max) {
      error = `最大值为 ${rules.max}`;
    } else if (rules.custom) {
      const customError = rules.custom(value);
      if (customError) {
        error = customError;
      }
    }

    setFormState((prev) => ({
      ...prev,
      errors: { ...prev.errors, [name]: error },
    }));

    return error;
  };

  const validateForm = (validations: Record<string, ValidationRule>) => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    Object.entries(validations).forEach(([name, rules]) => {
      const value = formState.values[name] || '';
      const error = validateField(name, value, rules);
      if (error) {
        newErrors[name] = error;
        isValid = false;
      }
    });

    setFormState((prev) => ({
      ...prev,
      errors: newErrors,
      touched: { ...prev.touched, ...Object.keys(validations).reduce((acc, key) => ({ ...acc, [key]: true }), {}) },
    }));

    return isValid;
  };

  const resetForm = () => {
    setFormState({
      values: initialValues,
      errors: {},
      touched: {},
    });
  };

  return {
    values: formState.values,
    errors: formState.errors,
    touched: formState.touched,
    handleChange,
    handleBlur,
    validateField,
    validateForm,
    resetForm,
  };
};

export default FormField;

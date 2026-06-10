import { renderHook, act } from '@testing-library/react';
import { useFormValidation, getInputClassName } from '../../hooks/useFormValidation';

describe('useFormValidation Hook', () => {
  test('initializes with empty errors and touched', () => {
    const { result } = renderHook(() => useFormValidation({ name: '', email: '' }));
    expect(result.current.errors).toEqual({});
    expect(result.current.touched).toEqual({});
  });

  test('validates required field', () => {
    const { result } = renderHook(() => useFormValidation({ name: '', email: '' }));

    act(() => {
      const error = result.current.validateField('name', '', { required: true });
      expect(error).toBe('name不能为空');
    });

    act(() => {
      const error = result.current.validateField('name', 'John', { required: true });
      expect(error).toBe(null);
    });
  });

  test('validates minLength', () => {
    const { result } = renderHook(() => useFormValidation({ name: '' }));

    act(() => {
      const error = result.current.validateField('name', 'Jo', { minLength: 3 });
      expect(error).toBe('name至少需要3个字符');
    });

    act(() => {
      const error = result.current.validateField('name', 'John', { minLength: 3 });
      expect(error).toBe(null);
    });
  });

  test('validates maxLength', () => {
    const { result } = renderHook(() => useFormValidation({ name: '' }));

    act(() => {
      const error = result.current.validateField('name', 'This is a very long name', { maxLength: 10 });
      expect(error).toBe('name不能超过10个字符');
    });

    act(() => {
      const error = result.current.validateField('name', 'Short', { maxLength: 10 });
      expect(error).toBe(null);
    });
  });

  test('validates pattern', () => {
    const { result } = renderHook(() => useFormValidation({ email: '' }));
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    act(() => {
      const error = result.current.validateField('email', 'invalid', { pattern: emailPattern });
      expect(error).toBe('email格式不正确');
    });

    act(() => {
      const error = result.current.validateField('email', 'test@example.com', { pattern: emailPattern });
      expect(error).toBe(null);
    });
  });

  test('validates with custom function', () => {
    const { result } = renderHook(() => useFormValidation({ age: '' }));
    const customValidator = (value: number) => value >= 18 || '年龄必须大于等于18';

    act(() => {
      const error = result.current.validateField('age', 17, { custom: customValidator });
      expect(error).toBe('年龄必须大于等于18');
    });

    act(() => {
      const error = result.current.validateField('age', 20, { custom: customValidator });
      expect(error).toBe(null);
    });
  });

  test('handles field blur and sets touched state', () => {
    const { result } = renderHook(() => useFormValidation({ name: '' }));

    act(() => {
      result.current.handleFieldBlur('name', '', { required: true });
    });

    expect(result.current.touched).toEqual({ name: true });
    expect(result.current.errors).toEqual({ name: 'name不能为空' });
  });

  test('handles field change only validates if touched', () => {
    const { result } = renderHook(() => useFormValidation({ name: '' }));

    act(() => {
      result.current.handleFieldChange('name', '', { required: true });
    });

    expect(result.current.errors).toEqual({});

    act(() => {
      result.current.handleFieldBlur('name', '', { required: true });
    });

    expect(result.current.errors).toEqual({ name: 'name不能为空' });

    act(() => {
      result.current.handleFieldChange('name', 'John', { required: true });
    });

    expect(result.current.errors).toEqual({});
  });

  test('validates entire form with errors', () => {
    const { result } = renderHook(() => useFormValidation({ name: '', email: '' }));
    const rules = {
      name: { required: true },
      email: { required: true },
    };

    let isValid;
    act(() => {
      isValid = result.current.validateForm({ name: '', email: '' }, rules);
    });

    expect(isValid).toBe(false);
    expect(result.current.touched).toEqual({ name: true, email: true });
    expect(result.current.errors).toEqual({
      name: 'name不能为空',
      email: 'email不能为空',
    });
  });

  test('clears errors', () => {
    const { result } = renderHook(() => useFormValidation({ name: '' }));

    act(() => {
      result.current.handleFieldBlur('name', '', { required: true });
    });

    expect(result.current.errors).toEqual({ name: 'name不能为空' });

    act(() => {
      result.current.clearErrors();
    });

    expect(result.current.errors).toEqual({});
    expect(result.current.touched).toEqual({});
  });

  test('gets field error only when touched', () => {
    const { result } = renderHook(() => useFormValidation({ name: '' }));

    expect(result.current.getFieldError('name')).toBeUndefined();

    act(() => {
      result.current.handleFieldBlur('name', '', { required: true });
    });

    expect(result.current.getFieldError('name')).toBe('name不能为空');
  });

  test('checks if field has error', () => {
    const { result } = renderHook(() => useFormValidation({ name: '' }));

    act(() => {
      result.current.handleFieldBlur('name', '', { required: true });
    });

    expect(result.current.hasFieldError('name')).toBe(true);

    act(() => {
      result.current.handleFieldBlur('name', 'John', { required: true });
    });

    expect(result.current.hasFieldError('name')).toBe(false);
  });
});

describe('getInputClassName', () => {
  test('returns base class when no error', () => {
    const className = getInputClassName(false);
    expect(className).toContain('border-slate-200');
    expect(className).not.toContain('border-red-500');
  });

  test('returns error class when has error', () => {
    const className = getInputClassName(true);
    expect(className).toContain('border-red-500');
    expect(className).not.toContain('border-slate-200');
  });

  test('accepts custom base class', () => {
    const className = getInputClassName(false, 'custom-base');
    expect(className).toBe('custom-base border-slate-200');
  });

  test('applies error class with custom base class', () => {
    const className = getInputClassName(true, 'custom-base');
    expect(className).toBe('custom-base border-red-500');
  });
});

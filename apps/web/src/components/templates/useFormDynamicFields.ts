import { useState, useCallback } from 'react';

export interface FormFieldLike {
  name: string;
  options?: Array<{ label: string; value: unknown }>;
  required?: boolean;
  disabled?: boolean;
  editable?: boolean;
}

export interface FormSectionLike {
  id: string;
  fields: FormFieldLike[];
}

export interface UseFormDynamicFieldsOptions {
  sections: FormSectionLike[];
}

/**
 * FormPageTemplate 动态字段状态管理 hook
 * 管理字段的选项、必填、禁用、可编辑状态
 */
export function useFormDynamicFields(options: UseFormDynamicFieldsOptions) {
  const { sections } = options;

  // 字段可见性
  const [fieldVisibility, setFieldVisibility] = useState<Record<string, boolean>>(() => {
    const visibility: Record<string, boolean> = {};
    sections.forEach((section) => {
      section.fields.forEach((field) => {
        visibility[field.name] = true;
      });
    });
    return visibility;
  });

  // 动态选项
  const [dynamicOptions, setDynamicOptions] = useState<
    Record<string, Array<{ label: string; value: unknown }>>
  >(() => {
    const opts: Record<string, Array<{ label: string; value: unknown }>> = {};
    sections.forEach((section) => {
      section.fields.forEach((field) => {
        if (field.options) {
          opts[field.name] = field.options;
        }
      });
    });
    return opts;
  });

  // 动态必填
  const [dynamicRequired, setDynamicRequired] = useState<Record<string, boolean>>(() => {
    const required: Record<string, boolean> = {};
    sections.forEach((section) => {
      section.fields.forEach((field) => {
        if (field.required) {
          required[field.name] = field.required;
        }
      });
    });
    return required;
  });

  // 动态禁用
  const [dynamicDisabled, setDynamicDisabled] = useState<Record<string, boolean>>(() => {
    const disabled: Record<string, boolean> = {};
    sections.forEach((section) => {
      section.fields.forEach((field) => {
        if (field.disabled) {
          disabled[field.name] = field.disabled;
        }
      });
    });
    return disabled;
  });

  // 动态可编辑
  const [dynamicEditable, setDynamicEditable] = useState<Record<string, boolean>>(() => {
    const editable: Record<string, boolean> = {};
    sections.forEach((section) => {
      section.fields.forEach((field) => {
        editable[field.name] = field.editable !== false;
      });
    });
    return editable;
  });

  // 动作
  const setFieldOption = useCallback(
    (fieldName: string, options: Array<{ label: string; value: unknown }>) => {
      setDynamicOptions((prev) => ({ ...prev, [fieldName]: options }));
    },
    []
  );

  const setFieldRequired = useCallback((fieldName: string, required: boolean) => {
    setDynamicRequired((prev) => ({ ...prev, [fieldName]: required }));
  }, []);

  const setFieldDisabled = useCallback((fieldName: string, disabled: boolean) => {
    setDynamicDisabled((prev) => ({ ...prev, [fieldName]: disabled }));
  }, []);

  const setFieldEditable = useCallback((fieldName: string, editable: boolean) => {
    setDynamicEditable((prev) => ({ ...prev, [fieldName]: editable }));
  }, []);

  const toggleFieldVisibility = useCallback((fieldName: string) => {
    setFieldVisibility((prev) => ({
      ...prev,
      [fieldName]: !prev[fieldName],
    }));
  }, []);

  return {
    // 字段可见性
    fieldVisibility,
    setFieldVisibility,
    toggleFieldVisibility,
    // 动态选项
    dynamicOptions,
    setDynamicOptions,
    setFieldOption,
    // 动态必填
    dynamicRequired,
    setDynamicRequired,
    setFieldRequired,
    // 动态禁用
    dynamicDisabled,
    setDynamicDisabled,
    setFieldDisabled,
    // 动态可编辑
    dynamicEditable,
    setDynamicEditable,
    setFieldEditable,
  };
}

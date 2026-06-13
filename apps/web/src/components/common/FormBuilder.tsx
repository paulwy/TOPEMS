import React, { useCallback } from "react";
import {
  Input,
  Textarea,
  Select,
  SelectItem,
  Checkbox,
  DatePicker,
  Button,
  Form,
  Card,
} from "@nextui-org/react";

export interface FormFieldConfig {
  name: string;
  label: string;
  type:
    | "text"
    | "email"
    | "password"
    | "number"
    | "textarea"
    | "select"
    | "checkbox"
    | "date"
    | "file";
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  defaultValue?: any;
  options?: { value: string; label: string }[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: RegExp;
    custom?: (value: any) => string | null;
  };
  colSpan?: number;
  render?: (props: any) => React.ReactNode;
}

export interface FormBuilderConfig {
  fields: FormFieldConfig[];
  onSubmit: (values: Record<string, any>) => Promise<void> | void;
  submitLabel?: string;
  resetLabel?: string;
  showReset?: boolean;
  title?: string;
  initialValues?: Record<string, any>;
  colCount?: number;
}

export default function FormBuilder({
  fields,
  onSubmit,
  submitLabel = "提交",
  resetLabel = "重置",
  showReset = true,
  title,
  initialValues = {},
  colCount = 2,
}: FormBuilderConfig) {
  const handleSubmit = useCallback(
    async (values: Record<string, any>) => {
      await onSubmit(values);
    },
    [onSubmit],
  );

  const renderField = useCallback(
    (field: FormFieldConfig) => {
      const isRequired = field.required ?? false;
      const isDisabled = field.disabled ?? false;
      const defaultValue = initialValues[field.name] ?? field.defaultValue;

      switch (field.type) {
        case "text":
        case "email":
        case "password":
          return (
            <Input
              key={field.name}
              name={field.name}
              label={field.label}
              type={field.type}
              placeholder={field.placeholder}
              isRequired={isRequired}
              isDisabled={isDisabled}
              defaultValue={defaultValue}
            />
          );
        case "number":
          return (
            <Input
              key={field.name}
              name={field.name}
              label={field.label}
              type="number"
              placeholder={field.placeholder}
              isRequired={isRequired}
              isDisabled={isDisabled}
              defaultValue={defaultValue?.toString()}
            />
          );
        case "textarea":
          return (
            <Textarea
              key={field.name}
              name={field.name}
              label={field.label}
              placeholder={field.placeholder}
              isRequired={isRequired}
              isDisabled={isDisabled}
              defaultValue={defaultValue}
            />
          );
        case "select":
          return (
            <Select
              key={field.name}
              name={field.name}
              label={field.label}
              isRequired={isRequired}
              isDisabled={isDisabled}
              defaultSelectedKeys={
                defaultValue ? [String(defaultValue)] : undefined
              }
            >
              {(field.options || []).map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </Select>
          );
        case "checkbox":
          return (
            <Checkbox
              key={field.name}
              name={field.name}
              isSelected={defaultValue || false}
              isDisabled={isDisabled}
            >
              {field.label}
            </Checkbox>
          );
        case "date":
          return (
            <DatePicker
              key={field.name}
              name={field.name}
              label={field.label}
              isRequired={isRequired}
              isDisabled={isDisabled}
              defaultValue={defaultValue}
            />
          );
        case "file":
          return (
            <Input
              key={field.name}
              name={field.name}
              label={field.label}
              type="file"
              isRequired={isRequired}
              isDisabled={isDisabled}
            />
          );
        default:
          if (field.render) {
            return field.render({
              name: field.name,
              defaultValue,
              isRequired,
              isDisabled,
            });
          }
          return null;
      }
    },
    [initialValues],
  );

  const renderForm = () => {
    if (fields.length === 1 || colCount === 1) {
      return (
        <div className="flex flex-col gap-4">
          {fields.map((field) => (
            <div key={field.name}>{renderField(field)}</div>
          ))}
        </div>
      );
    }

    return (
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
      >
        {fields.map((field) => (
          <div
            key={field.name}
            style={{ gridColumn: `span ${field.colSpan || 1}` }}
          >
            {renderField(field)}
          </div>
        ))}
      </div>
    );
  };

  const handleReset = useCallback((e: React.FormEvent) => {
    e.preventDefault();
  }, []);

  return (
    <Card>
      {title && (
        <div className="px-6 pt-4">
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
      )}
      <div className="p-6">
        <Form
          onSubmit={handleSubmit}
          onReset={handleReset}
          className="flex flex-col gap-6"
        >
          {renderForm()}
          <div className="flex gap-3 justify-end">
            {showReset && (
              <Button type="reset" variant="light">
                {resetLabel}
              </Button>
            )}
            <Button type="submit" color="primary">
              {submitLabel}
            </Button>
          </div>
        </Form>
      </div>
    </Card>
  );
}

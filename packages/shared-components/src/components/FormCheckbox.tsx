import React from 'react';
import { Checkbox, FormControlLabel, FormGroup, type CheckboxProps, type FormControlLabelProps } from '@mui/material';

export interface FormCheckboxProps extends CheckboxProps {
  label: string;
  name: string;
  controlLabelProps?: FormControlLabelProps;
}

export const FormCheckbox: React.FC<FormCheckboxProps> = ({
  label,
  name,
  controlLabelProps,
  ...props
}) => {
  return (
    <FormControlLabel
      control={<Checkbox name={name} {...props} />}
      label={label}
      {...controlLabelProps}
    />
  );
};

export interface FormCheckboxGroupProps {
  name: string;
  options: { value: string; label: string; disabled?: boolean }[];
  value?: string[];
  onChange?: (value: string[]) => void;
  row?: boolean;
}

export const FormCheckboxGroup: React.FC<FormCheckboxGroupProps> = ({
  name,
  options,
  value = [],
  onChange,
  row = false,
}) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { checked, value: optionValue } = event.target;
    const newValue = checked
      ? [...value, optionValue]
      : value.filter((v) => v !== optionValue);
    onChange?.(newValue);
  };

  return (
    <FormGroup row={row}>
      {options.map((option) => (
        <FormControlLabel
          key={option.value}
          control={
            <Checkbox
              name={`${name}-${option.value}`}
              checked={value.includes(option.value)}
              onChange={handleChange}
              value={option.value}
              disabled={option.disabled}
            />
          }
          label={option.label}
        />
      ))}
    </FormGroup>
  );
};

export default FormCheckbox;
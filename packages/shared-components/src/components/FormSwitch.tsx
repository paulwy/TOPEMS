import React from 'react';
import { Switch, FormControlLabel, type SwitchProps, type FormControlLabelProps } from '@mui/material';

export interface FormSwitchProps extends SwitchProps {
  label: string;
  name: string;
  controlLabelProps?: FormControlLabelProps;
}

export const FormSwitch: React.FC<FormSwitchProps> = ({
  label,
  name,
  controlLabelProps,
  ...props
}) => {
  return (
    <FormControlLabel
      control={<Switch name={name} {...props} />}
      label={label}
      {...controlLabelProps}
    />
  );
};

export default FormSwitch;
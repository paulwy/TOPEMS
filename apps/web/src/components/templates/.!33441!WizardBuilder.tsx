import { useState, useCallback, useMemo } from 'react';
import {
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Box,
  Typography,
  LinearProgress,
  Alert,
  Paper,
} from '@mui/material';
import i18n from '@/i18n';
import { FormBuilder } from '@/components/common';
import { SubTableBuilder } from './SubTableBuilder';
import type {
  WizardConfig,
  WizardStepConfig,
  WizardStepRenderProps,
  NestedTableConfig,
} from '@/schema/schemaExtensions';
import type { SchemaField } from '@/schema/types';
import { toFormField } from '@/schema/types';

// ============ Props ============

interface WizardBuilderProps {
  config: WizardConfig;
  fields: SchemaField[];
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
  onComplete: () => void;
  onCancel: () => void;
  mode: 'create' | 'edit';
  disabled?: boolean;
  nestedTables?: NestedTableConfig[];
}

// ============ 组件 ============

export function WizardBuilder({
  config,
  fields,
  values,
  onChange,
  onComplete,
  onCancel,
  mode,
  disabled = false,
  nestedTables = [],
}: WizardBuilderProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const steps = config.steps;


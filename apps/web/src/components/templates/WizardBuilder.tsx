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

export interface WizardBuilderProps {
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

  // ── 根据 visibleWhen 过滤可见步骤 ──
  const visibleSteps = useMemo(() => {
    return steps.filter((step) => {
      if (!step.visibleWhen) return true;
      return step.visibleWhen(values);
    });
  }, [steps, values]);

  const totalSteps = visibleSteps.length;

  // ── 确保 activeStep 在可见范围内 ──
  const safeActiveStep = Math.min(activeStep, totalSteps - 1);
  const currentStep = visibleSteps[safeActiveStep];
  const isFirstStep = safeActiveStep === 0;
  const isLastStep = safeActiveStep === totalSteps - 1;

  // ── 当前步骤的字段（SchemaField[]） ──
  const currentStepSchemaFields = useMemo(() => {
    if (!currentStep) return [];
    const fieldNames = new Set(currentStep.fields);
    return fields.filter((f) => fieldNames.has(f.name));
  }, [currentStep, fields]);

  // ── 转换为 FormBuilder 所需的 FormFieldConfig[] ──
  const currentStepFormFields = useMemo(() => {
    return currentStepSchemaFields.map((f) => toFormField(f, mode === 'edit' ? 'edit' : 'create'));
  }, [currentStepSchemaFields, mode]);

  // ── 进度百分比 ──
  const progress = useMemo(() => {
    if (totalSteps === 0) return 0;
    return Math.round(((safeActiveStep + 1) / totalSteps) * 100);
  }, [safeActiveStep, totalSteps]);

  // ── 步骤校验 ──
  const validateStep = useCallback((): string | null => {
    for (const field of currentStepSchemaFields) {
      if (field.required) {
        const value = values[field.name];
        if (value === undefined || value === null || value === '') {
          return `${field.label}${i18n.t('components.wizard_builder.k0')}`;
        }
      }
    }

    const stepNestedTables = nestedTables.filter((nt) => currentStep.fields.includes(nt.field));
    for (const nt of stepNestedTables) {
      const rows = (values[nt.field] as Record<string, unknown>[]) || [];
      if (nt.validate) {
        const error = nt.validate(rows);
        if (error) return `${nt.title}: ${error}`;
      }
    }

    if (currentStep.validate) {
      const customError = currentStep.validate(values);
      if (customError) return customError;
    }

    return null;
  }, [currentStepSchemaFields, values, currentStep, nestedTables]);

  // ── 下一步 ──
  const handleNext = useCallback(() => {
    const error = validateStep();
    if (error) {
      setValidationError(error);
      return;
    }
    setValidationError(null);

    if (isLastStep) {
      setCompleted(true);
      onComplete();
    } else {
      setActiveStep((prev) => prev + 1);
    }
  }, [validateStep, isLastStep, onComplete]);

  // ── 上一步 ──
  const handlePrev = useCallback(() => {
    if (safeActiveStep > 0) {
      setValidationError(null);
      setActiveStep((prev) => Math.max(0, prev - 1));
    }
  }, [safeActiveStep]);

  // ── 字段变更处理 ──
  const handleFieldChange = useCallback(
    (name: string, value: unknown) => {
      onChange({ ...values, [name]: value });
    },
    [values, onChange]
  );

  // ── 步骤点击（仅允许点击已完成的步骤） ──
  const handleStepClick = useCallback(
    (stepIndex: number) => {
      if (stepIndex < safeActiveStep) {
        setValidationError(null);
        setActiveStep(stepIndex);
      }
    },
    [safeActiveStep]
  );

  // ── 渲染步骤图标 ──
  const renderStepIcon = useCallback((step: WizardStepConfig, index: number) => {
    if (step.icon) return step.icon;
    return index + 1;
  }, []);

  // ── 渲染进度条 ──
  const renderProgress = () => {
    if (!config.showProgress) return null;

    return (
      <Box sx={{ mb: 3 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 1,
          }}
        >
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {i18n.t('components.wizard_builder.k0')}
          </Typography>
          <Typography
            variant='body2'
            sx={{
              fontWeight: 'bold',
              color: progress === 100 ? 'success.main' : 'primary.main',
            }}
          >
            {progress}%
          </Typography>
        </Box>
        <LinearProgress
          variant='determinate'
          value={progress}
          color={progress === 100 ? 'success' : 'primary'}
          sx={{ borderRadius: 1, height: 8 }}
        />
      </Box>
    );
  };

  // ── 渲染 Stepper ──
  const renderStepper = () => (
    <Stepper
      activeStep={safeActiveStep}
      sx={{ mb: 3 }}
    >
      {visibleSteps.map((step, index) => (
        <Step
          key={step.key}
          completed={index < safeActiveStep}
          disabled={index > safeActiveStep}
          onClick={() => handleStepClick(index)}
        >
          <StepLabel icon={renderStepIcon(step, index) as any}>
            {step.title}
            {step.description && (
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {step.description}
              </Typography>
            )}
          </StepLabel>
          <StepContent>
            <Box sx={{ mt: 2 }}>{index === safeActiveStep && renderStepContent(step)}</Box>
          </StepContent>
        </Step>
      ))}
    </Stepper>
  );

  // ── 渲染步骤内容 ──
  const renderStepContent = (step: WizardStepConfig) => {
    if (completed) {
      return renderCompletion();
    }

    // ── 自定义渲染优先 ──
    if (step.renderContent) {
      const renderProps: WizardStepRenderProps = {
        values,
        onChange: handleFieldChange,
        mode,
        disabled,
        fieldSchema: fields,
        nestedTables,
      };
      return (
        <Paper sx={{ borderRadius: 2, p: 4 }}>
          <Box sx={{ mb: 3 }}>
            <Typography
              variant='h6'
              sx={{ fontWeight: 600 }}
            >
              {step.title}
            </Typography>
            {step.description && (
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{ mt: 0.5 }}
              >
                {step.description}
              </Typography>
            )}
          </Box>
          {step.renderContent(renderProps) as any}
        </Paper>
      );
    }

    const nestedTableFields = new Set(nestedTables.map((nt) => nt.field));
    const regularStepFields = currentStepFormFields.filter((f) => !nestedTableFields.has(f.name));
    const stepNestedTables = nestedTables.filter((nt) => step.fields.includes(nt.field));

    return (
      <Paper sx={{ borderRadius: 2, p: 4 }}>
        <Box sx={{ mb: 3 }}>
          <Typography
            variant='h6'
            sx={{ fontWeight: 600 }}
          >
            {step.title}
          </Typography>
          {step.description && (
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ mt: 0.5 }}
            >
              {step.description}
            </Typography>
          )}
        </Box>

        {config.showSummaryOnComplete && isLastStep ? (
          renderSummary()
        ) : (
          <>
            {regularStepFields.length > 0 && (
              <FormBuilder
                key={step.key}
                fields={regularStepFields}
                mode={mode}
                colCount={2}
                initialValues={values}
                showReset={false}
                submitLabel={
                  isLastStep
                    ? config.finishButtonText || i18n.t('templates.wizard_builder.k1')
                    : config.nextButtonText || i18n.t('templates.wizard_builder.k0')
                }
                onSubmit={async () => {
                  handleNext();
                }}
                onFieldChange={handleFieldChange}
              />
            )}
            {stepNestedTables.map((nt) => (
              <SubTableBuilder
                key={nt.field}
                config={nt}
                value={(values[nt.field] as Record<string, unknown>[]) || []}
                onChange={(rows) => {
                  onChange({ ...values, [nt.field]: rows });
                }}
                mode={mode}
              />
            ))}
          </>
        )}
      </Paper>
    );
  };

  // ── 渲染摘要/回顾 ──
  const renderSummary = () => {
    const nestedTableFieldSet = new Set(nestedTables.map((nt) => nt.field));

    return (
      <Box>
        <Typography
          variant='subtitle1'
          sx={{ mb: 2, fontWeight: 600 }}
        >
          {i18n.t('components.wizard_builder.k1')}
        </Typography>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(2, 1fr)' }}>
          {fields.map((field) => {
            const value = values[field.name];
            if (value === undefined || value === null || value === '') return null;

            const isNestedTable = nestedTableFieldSet.has(field.name);
            const displayValue = isNestedTable
              ? `${field.label}：${Array.isArray(value) ? value.length : 0}${i18n.t('components.wizard_builder.k1')}`
              : String(value);

            return (
              <Box
                key={field.name}
                sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
              >
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {field.label}
                </Typography>
                <Typography variant='body2'>{displayValue}</Typography>
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  };

  // ── 渲染完成状态 ──
  const renderCompletion = () => (
    <Box sx={{ textAlign: 'center', py: 4 }}>
      <Typography
        variant='h5'
        sx={{ mb: 2, color: 'success.main' }}
      >
        {i18n.t('components.wizard_builder.k2')}
      </Typography>
      <Typography
        variant='body1'
        color='text.secondary'
        sx={{ mb: 3 }}
      >
        {i18n.t('components.wizard_builder.k3')}
      </Typography>
    </Box>
  );

  // ── 渲染导航按钮 ──
  const renderNavigation = () => (
    <Paper
      sx={{
        p: 2,
        borderRadius: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        mt: 3,
      }}
    >
      <Box sx={{ display: 'flex', gap: 2 }}>
        {onCancel && (
          <Button
            variant='outlined'
            onClick={onCancel}
            disabled={disabled}
          >
            {i18n.t('components.wizard_builder.k4')}
          </Button>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 1 }}>
        {!isFirstStep && config.allowBack !== false && (
          <Button
            variant='outlined'
            onClick={handlePrev}
            disabled={disabled}
          >
            {config.prevButtonText || i18n.t('templates.wizard_builder.k2')}
          </Button>
        )}

        <Button
          variant='contained'
          onClick={handleNext}
          disabled={disabled}
        >
          {isLastStep
            ? config.finishButtonText || i18n.t('templates.wizard_builder.k4')
            : config.nextButtonText || i18n.t('templates.wizard_builder.k3')}
        </Button>
      </Box>
    </Paper>
  );

  return (
    <Box>
      {config.title && (
        <Typography
          variant='h5'
          sx={{ mb: 3, fontWeight: 600 }}
        >
          {config.title}
        </Typography>
      )}

      {config.showProgress !== false && renderProgress()}

      {validationError && (
        <Alert
          severity='error'
          sx={{ mb: 3 }}
          onClose={() => setValidationError(null)}
        >
          {validationError}
        </Alert>
      )}

      {renderStepper()}

      {!completed && renderNavigation()}
    </Box>
  );
}

export default WizardBuilder;

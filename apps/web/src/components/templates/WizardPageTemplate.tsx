import React, { useState, useCallback, useMemo } from 'react';
import type { BoxProps } from '@mui/material';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  LinearProgress,
  useTheme,
  useMediaQuery,
  Alert,
  IconButton,
} from '@mui/material';
import i18n from '@/i18n';
import {
  ChevronLeft,
  ChevronRight,
  SkipForward,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import type { BreadcrumbItem } from './PageHeader';
import { PageHeader } from './PageHeader';

// ============ 类型定义 ============

export interface WizardStep {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  optional?: boolean;
  skipable?: boolean;
  component: React.ReactNode;
  validation?: () => boolean | Promise<boolean>;
  onEnter?: () => void;
  onLeave?: () => void;
}

export interface WizardAction {
  label: string;
  onClick?: () => void;
  variant?: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'success';
  disabled?: boolean;
  icon?: React.ReactNode;
  position?: 'left' | 'right';
}

export interface WizardPageTemplateProps extends BoxProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];

  steps: WizardStep[];

  initialStep?: number;
  currentStep?: number;
  onStepChange?: (stepIndex: number, stepId: string) => void;

  onComplete?: (data: Record<string, unknown>) => void;
  onCancel?: () => void;
  onSkip?: (stepIndex: number) => void;

  loading?: boolean;
  submitting?: boolean;
  error?: string;
  success?: string;

  showStepNumbers?: boolean;
  showProgress?: boolean;
  showNavigation?: boolean;

  backButtonText?: string;
  nextButtonText?: string;
  skipButtonText?: string;
  finishButtonText?: string;
  cancelButtonText?: string;

  customActions?: WizardAction[];

  headerContent?: React.ReactNode;
  footerContent?: React.ReactNode;
}

// ============ 向导页模板组件 ============

export const WizardPageTemplate: React.FC<WizardPageTemplateProps> = ({
  title,
  subtitle,
  breadcrumbs,
  steps,
  initialStep = 0,
  currentStep: externalCurrentStep,
  onStepChange,
  onComplete,
  onCancel,
  onSkip,
  loading,
  submitting,
  error,
  success,
  showStepNumbers = true,
  showProgress = true,
  showNavigation = true,
  backButtonText = i18n.t('templates.wizard_page_template.k0'),
  nextButtonText = i18n.t('templates.wizard_page_template.k1'),
  skipButtonText = i18n.t('templates.wizard_page_template.k2'),
  finishButtonText = i18n.t('templates.wizard_page_template.k3'),
  cancelButtonText = i18n.t('templates.wizard_page_template.k4'),
  customActions = [],
  headerContent,
  footerContent,
  ...props
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [internalCurrentStep, setInternalCurrentStep] = useState(initialStep);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [skippedSteps, setSkippedSteps] = useState<Set<string>>(new Set());
  const [validationError, setValidationError] = useState<string | null>(null);

  const currentStep = externalCurrentStep ?? internalCurrentStep;

  const progress = useMemo(() => {
    if (!showProgress) return 0;
    return Math.round(((currentStep + 1) / steps.length) * 100);
  }, [currentStep, steps.length, showProgress]);

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const currentStepData = steps[currentStep];

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      const newStep = currentStep - 1;
      setInternalCurrentStep(newStep);
      onStepChange?.(newStep, steps[newStep].id);
      setValidationError(null);
    }
  }, [currentStep, steps, onStepChange]);

  const handleNext = useCallback(async () => {
    setValidationError(null);

    if (currentStepData.validation) {
      try {
        const isValid = await currentStepData.validation();
        if (!isValid) {
          setValidationError(i18n.t('templates.wizard_page_template.k5'));
          return;
        }
      } catch (err) {
        setValidationError(err instanceof Error ? err.message : i18n.t('templates.wizard_page_template.k6'));
        return;
      }
    }

    setCompletedSteps((prev) => new Set([...prev, currentStepData.id]));

    if (isLastStep) {
      onComplete?.({});
    } else {
      const newStep = currentStep + 1;
      setInternalCurrentStep(newStep);
      onStepChange?.(newStep, steps[newStep].id);
    }
  }, [currentStepData, isLastStep, currentStep, steps, onStepChange, onComplete]);

  const handleSkip = useCallback(() => {
    setSkippedSteps((prev) => new Set([...prev, currentStepData.id]));
    setCompletedSteps((prev) => new Set([...prev, currentStepData.id]));

    if (isLastStep) {
      onComplete?.({});
    } else {
      const newStep = currentStep + 1;
      setInternalCurrentStep(newStep);
      onStepChange?.(newStep, steps[newStep].id);
    }

    onSkip?.(currentStep);
  }, [currentStepData, isLastStep, currentStep, steps, onStepChange, onComplete, onSkip]);

  const handleStepClick = useCallback(
    (stepIndex: number) => {
      if (stepIndex <= currentStep) {
        setInternalCurrentStep(stepIndex);
        onStepChange?.(stepIndex, steps[stepIndex].id);
        setValidationError(null);
      }
    },
    [currentStep, steps, onStepChange]
  );

  const renderStepIcon = (step: WizardStep, index: number) => {
    if (completedSteps.has(step.id)) {
      return <CheckCircle style={{ width: 20, height: 20, color: theme.palette.success.main }} />;
    }
    if (skippedSteps.has(step.id)) {
      return <XCircle style={{ width: 20, height: 20, color: theme.palette.warning.main }} />;
    }
    if (index === currentStep) {
      return index + 1;
    }
    return index + 1;
  };

  const _getStepStatus = (step: WizardStep, index: number) => {
    if (completedSteps.has(step.id)) return 'completed';
    if (skippedSteps.has(step.id)) return 'completed';
    if (index === currentStep) return 'active';
    return 'pending';
  };

  const renderProgress = () => {
    if (!showProgress) return null;

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
            {i18n.t('components.wizard_page_template.k0')}
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

  const renderStepper = () => {
    if (!showNavigation) return null;

    return (
      <Stepper
        activeStep={currentStep}
        orientation={isMobile ? 'vertical' : 'horizontal'}
        sx={{ mb: 3 }}
      >
        {steps.map((step, index) => (
          <Step
            key={step.id}
            completed={completedSteps.has(step.id) || skippedSteps.has(step.id)}
            disabled={index > currentStep}
            onClick={() => handleStepClick(index)}
          >
            <StepLabel
              icon={renderStepIcon(step, index)}
              optional={step.optional ? <Typography variant='caption'>{i18n.t('templates.wizard_page_template.k7')}</Typography> : undefined}
            >
              {step.label}
              {step.description && (
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {step.description}
                </Typography>
              )}
            </StepLabel>
            {isMobile && (
              <StepContent>
                {index === currentStep && <Box sx={{ mt: 2 }}>{step.component}</Box>}
              </StepContent>
            )}
          </Step>
        ))}
      </Stepper>
    );
  };

  const renderContent = () => {
    if (isMobile) return null;

    return (
      <Paper sx={{ borderRadius: 2, p: 4 }}>
        <Box sx={{ mb: 3 }}>
          <Typography
            variant='h6'
            sx={{ fontWeight: 600 }}
          >
            {currentStepData?.label}
          </Typography>
          {currentStepData?.description && (
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ mt: 0.5 }}
            >
              {currentStepData.description}
            </Typography>
          )}
        </Box>
        {currentStepData?.component}
      </Paper>
    );
  };

  const renderFooter = () => {
    if (!showNavigation) return null;

    const leftActions = customActions.filter((a) => a.position === 'left');
    const rightActions = customActions.filter((a) => a.position !== 'left');

    return (
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {onCancel && (
            <Button
              variant='outlined'
              onClick={onCancel}
              disabled={submitting || loading}
              startIcon={<XCircle style={{ width: 16, height: 16 }} />}
            >
              {cancelButtonText}
            </Button>
          )}
          {leftActions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || 'text'}
              color={action.color || 'primary'}
              onClick={action.onClick}
              disabled={action.disabled || submitting || loading}
              startIcon={action.icon}
            >
              {action.label}
            </Button>
          ))}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {!isFirstStep && (
            <Button
              variant='outlined'
              onClick={handleBack}
              disabled={submitting || loading}
              startIcon={<ChevronLeft style={{ width: 16, height: 16 }} />}
            >
              {backButtonText}
            </Button>
          )}

          {currentStepData?.skipable && !isLastStep && (
            <Button
              variant='text'
              onClick={handleSkip}
              disabled={submitting || loading}
              startIcon={<SkipForward style={{ width: 16, height: 16 }} />}
            >
              {skipButtonText}
            </Button>
          )}

          {isLastStep ? (
            <Button
              variant='contained'
              onClick={handleNext}
              disabled={submitting || loading}
            >
              {submitting ? i18n.t('components.wizard_page_template.k0') : finishButtonText}
            </Button>
          ) : (
            <Button
              variant='contained'
              onClick={handleNext}
              disabled={submitting || loading}
              endIcon={<ChevronRight style={{ width: 16, height: 16 }} />}
            >
              {nextButtonText}
            </Button>
          )}

          {rightActions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || 'text'}
              color={action.color || 'primary'}
              onClick={action.onClick}
              disabled={action.disabled || submitting || loading}
              startIcon={action.icon}
            >
              {action.label}
            </Button>
          ))}
        </Box>
      </Paper>
    );
  };

  return (
    <Box {...props}>
      <PageHeader
        title={title}
        subtitle={subtitle}
        breadcrumbs={breadcrumbs}
        loading={loading}
      >
        {headerContent}
      </PageHeader>

      {renderProgress()}

      {error && (
        <Alert
          severity='error'
          sx={{ mb: 3 }}
          icon={<AlertCircle style={{ width: 20, height: 20 }} />}
        >
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          severity='success'
          sx={{ mb: 3 }}
          icon={<CheckCircle style={{ width: 20, height: 20 }} />}
        >
          {success}
        </Alert>
      )}

      {validationError && (
        <Alert
          severity='error'
          sx={{ mb: 3 }}
          icon={<AlertCircle style={{ width: 20, height: 20 }} />}
          action={
            <IconButton
              size='small'
              onClick={() => setValidationError(null)}
              aria-label={i18n.t('templates.wizard_page_template.k8')}
            >
              <XCircle style={{ width: 16, height: 16 }} />
            </IconButton>
          }
        >
          {validationError}
        </Alert>
      )}

      {renderStepper()}

      {renderContent()}

      {renderFooter()}

      {footerContent}
    </Box>
  );
};

export default WizardPageTemplate;

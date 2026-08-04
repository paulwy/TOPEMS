import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Upload,
  Package,
  FileText,
  Tag,
  DollarSign,
  Image,
  Send,
  AlertCircle,
  CheckCircle,
  Loader2,
  Info,
} from 'lucide-react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Card,
  CardContent,
  Chip,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Divider,
  Switch,
  FormControlLabel,
  Grid,
  InputAdornment,
} from '@mui/material';
import { PageContainer } from '@/components/common';
import { useNotificationStore } from '@/store';

const PluginUploadPage: React.FC = () => {
  const { t } = useTranslation();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    version: '1.0.0',
    description: '',
    category: 'finance',
    pluginType: 'business',
    price: '0',
    isFree: true,
    tags: '',
    author: '',
    website: '',
    license: 'MIT',
    minAppVersion: '2.0.0',
    releaseNotes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 0) {
      if (!formData.name.trim()) newErrors.name = t('plugin.upload_page.validation.name_required');
      if (!formData.code.trim()) newErrors.code = t('plugin.upload_page.validation.code_required');
      else if (!/^[a-z][a-z0-9-]*$/.test(formData.code))
        newErrors.code = t('plugin.upload_page.validation.code_format');
      if (!formData.version.trim())
        newErrors.version = t('plugin.upload_page.validation.version_required');
      if (!formData.description.trim())
        newErrors.description = t('plugin.upload_page.validation.description_required');
      if (!formData.category)
        newErrors.category = t('plugin.upload_page.validation.category_required');
    }

    if (step === 1 && !formData.author.trim()) {
      newErrors.author = t('plugin.upload_page.validation.author_required');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(activeStep)) return;

    setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      addNotification({
        title: t('plugin.upload_page.notification.submit_success_title'),
        message: t('plugin.upload_page.notification.submit_success_message', {
          name: formData.name,
        }),
        type: 'success',
      });
      setActiveStep(3);
    } catch (error: unknown) {
      addNotification({
        title: t('plugin.upload_page.notification.submit_failed_title'),
        message: t('plugin.upload_page.notification.submit_failed_message'),
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    t('plugin.upload_page.step.basic'),
    t('plugin.upload_page.step.config'),
    t('plugin.upload_page.step.upload'),
    t('plugin.upload_page.step.submit'),
  ];

  const categories = [
    { value: 'finance', label: t('plugin.category.finance') },
    { value: 'hr', label: t('plugin.category.hr') },
    { value: 'manufacturing', label: t('plugin.category.manufacturing') },
    { value: 'quality', label: t('plugin.category.quality') },
    { value: 'supply', label: t('plugin.category.supply') },
    { value: 'crm', label: t('plugin.category.crm') },
    { value: 'project', label: t('plugin.category.project') },
  ];

  return (
    <PageContainer maxWidth='lg'>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant='h4'
          sx={{ fontWeight: 'bold', mb: 1 }}
        >
          {t('plugin.upload_page.title')}
        </Typography>
        <Typography
          variant='body1'
          color='textSecondary'
        >
          {t('plugin.upload_page.subtitle')}
        </Typography>
      </Box>

      <Card>
        <CardContent sx={{ p: 4 }}>
          <Stepper
            activeStep={activeStep}
            sx={{ mb: 6 }}
          >
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {activeStep === 0 && (
            <Box>
              <Typography
                variant='h6'
                sx={{ fontWeight: 'bold', mb: 3 }}
              >
                {t('plugin.upload_page.section.basic_info')}
              </Typography>

              <Grid
                container
                spacing={3}
              >
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label={t('plugin.upload_page.form.name')}
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    error={!!errors.name}
                    helperText={errors.name || t('plugin.upload_page.helper.name')}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label={t('plugin.upload_page.form.code')}
                    value={formData.code}
                    onChange={(e) => handleChange('code', e.target.value.toLowerCase())}
                    error={!!errors.code}
                    helperText={errors.code || t('plugin.upload_page.helper.code')}
                    required
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position='start'>
                            <Package sx={{ width: 18, height: 18, color: 'grey.500' }} />
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label={t('plugin.upload_page.form.version')}
                    value={formData.version}
                    onChange={(e) => handleChange('version', e.target.value)}
                    error={!!errors.version}
                    helperText={errors.version || t('plugin.upload_page.helper.version')}
                    required
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position='start'>
                            <Tag sx={{ width: 18, height: 18, color: 'grey.500' }} />
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    select
                    label={t('plugin.upload_page.form.category')}
                    value={formData.category}
                    onChange={(e) => handleChange('category', e.target.value)}
                    error={!!errors.category}
                    helperText={errors.category}
                    required
                  >
                    {categories.map((cat) => (
                      <option
                        key={cat.value}
                        value={cat.value}
                      >
                        {cat.label}
                      </option>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label={t('plugin.upload_page.form.description')}
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    error={!!errors.description}
                    helperText={errors.description || t('plugin.upload_page.helper.description')}
                    required
                    multiline
                    rows={4}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment
                            position='start'
                            sx={{ alignSelf: 'flex-start', mt: 1 }}
                          >
                            <FileText sx={{ width: 18, height: 18, color: 'grey.500' }} />
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label={t('plugin.upload_page.form.tags')}
                    value={formData.tags}
                    onChange={(e) => handleChange('tags', e.target.value)}
                    helperText={t('plugin.upload_page.helper.tags')}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position='start'>
                            <Tag sx={{ width: 18, height: 18, color: 'grey.500' }} />
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    select
                    label={t('plugin.upload_page.form.plugin_type')}
                    value={formData.pluginType}
                    onChange={(e) => handleChange('pluginType', e.target.value)}
                  >
                    <option value='core'>{t('plugin.plugin_type.core')}</option>
                    <option value='business'>{t('plugin.plugin_type.business')}</option>
                  </TextField>
                </Grid>
              </Grid>
            </Box>
          )}

          {activeStep === 1 && (
            <Box>
              <Typography
                variant='h6'
                sx={{ fontWeight: 'bold', mb: 3 }}
              >
                {t('plugin.upload_page.section.plugin_config')}
              </Typography>

              <Grid
                container
                spacing={3}
              >
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label={t('plugin.upload_page.form.author')}
                    value={formData.author}
                    onChange={(e) => handleChange('author', e.target.value)}
                    error={!!errors.author}
                    helperText={errors.author}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label={t('plugin.upload_page.form.website')}
                    value={formData.website}
                    onChange={(e) => handleChange('website', e.target.value)}
                    helperText={t('plugin.upload_page.helper.website')}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label={t('plugin.upload_page.form.license')}
                    value={formData.license}
                    onChange={(e) => handleChange('license', e.target.value)}
                    helperText={t('plugin.upload_page.helper.license')}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label={t('plugin.upload_page.form.min_app_version')}
                    value={formData.minAppVersion}
                    onChange={(e) => handleChange('minAppVersion', e.target.value)}
                    helperText={t('plugin.upload_page.helper.min_app_version')}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.isFree}
                          onChange={(e) => handleChange('isFree', e.target.checked)}
                        />
                      }
                      label={t('plugin.upload_page.form.is_free')}
                    />
                  </Box>
                  {!formData.isFree && (
                    <TextField
                      fullWidth
                      label={t('plugin.upload_page.form.price')}
                      type='number'
                      value={formData.price}
                      onChange={(e) => handleChange('price', e.target.value)}
                      sx={{ mt: 2 }}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position='start'>
                              <DollarSign sx={{ width: 18, height: 18, color: 'grey.500' }} />
                            </InputAdornment>
                          ),
                        },
                      }}
                    />
                  )}
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label={t('plugin.upload_page.form.release_notes')}
                    value={formData.releaseNotes}
                    onChange={(e) => handleChange('releaseNotes', e.target.value)}
                    helperText={t('plugin.upload_page.helper.release_notes')}
                    multiline
                    rows={4}
                  />
                </Grid>
              </Grid>
            </Box>
          )}

          {activeStep === 2 && (
            <Box>
              <Typography
                variant='h6'
                sx={{ fontWeight: 'bold', mb: 3 }}
              >
                {t('plugin.upload_page.section.upload_files')}
              </Typography>

              <Grid
                container
                spacing={3}
              >
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card
                    variant='outlined'
                    sx={{
                      borderStyle: 'dashed',
                      borderWidth: 2,
                      cursor: 'pointer',
                      '&:hover': { borderColor: 'primary.main', bgcolor: 'primary.50' },
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <CardContent sx={{ textAlign: 'center', py: 6 }}>
                      <Upload
                        sx={{ width: 48, height: 48, color: 'grey.400', mx: 'auto', mb: 2 }}
                      />
                      <Typography sx={{ fontWeight: 'medium', mb: 1 }}>
                        {t('plugin.upload_page.upload.package_title')}
                      </Typography>
                      <Typography
                        variant='body2'
                        color='textSecondary'
                      >
                        {t('plugin.upload_page.upload.package_hint')}
                      </Typography>
                      <Typography
                        variant='caption'
                        color='textSecondary'
                        sx={{ mt: 1, display: 'block' }}
                      >
                        {t('plugin.upload_page.upload.package_max_size')}
                      </Typography>
                    </CardContent>
                  </Card>
                  <Alert
                    severity='info'
                    sx={{ mt: 2 }}
                    icon={<Info sx={{ width: 18, height: 18 }} />}
                  >
                    {t('plugin.upload_page.upload.package_alert')}
                  </Alert>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card
                    variant='outlined'
                    sx={{
                      borderStyle: 'dashed',
                      borderWidth: 2,
                      cursor: 'pointer',
                      '&:hover': { borderColor: 'primary.main', bgcolor: 'primary.50' },
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <CardContent sx={{ textAlign: 'center', py: 6 }}>
                      <Image sx={{ width: 48, height: 48, color: 'grey.400', mx: 'auto', mb: 2 }} />
                      <Typography sx={{ fontWeight: 'medium', mb: 1 }}>
                        {t('plugin.upload_page.upload.screenshot_title')}
                      </Typography>
                      <Typography
                        variant='body2'
                        color='textSecondary'
                      >
                        {t('plugin.upload_page.upload.screenshot_hint')}
                      </Typography>
                      <Typography
                        variant='caption'
                        color='textSecondary'
                        sx={{ mt: 1, display: 'block' }}
                      >
                        {t('plugin.upload_page.upload.screenshot_format')}
                      </Typography>
                    </CardContent>
                  </Card>
                  <Alert
                    severity='info'
                    sx={{ mt: 2 }}
                    icon={<Info sx={{ width: 18, height: 18 }} />}
                  >
                    {t('plugin.upload_page.upload.screenshot_alert')}
                  </Alert>
                </Grid>
              </Grid>

              <Box sx={{ mt: 4 }}>
                <Typography
                  variant='subtitle2'
                  sx={{ mb: 2, fontWeight: 'medium' }}
                >
                  {t('plugin.upload_page.section.preview')}
                </Typography>
                <Card variant='outlined'>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Box
                        sx={{
                          width: 56,
                          height: 56,
                          borderRadius: 3,
                          background:
                            'linear-gradient(135deg, primary.light 0%, primary.main 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Package sx={{ width: 28, height: 28, color: 'common.white' }} />
                      </Box>
                      <Box>
                        <Typography
                          variant='h6'
                          sx={{ fontWeight: 'bold' }}
                        >
                          {formData.name || t('plugin.upload_page.preview.name_placeholder')}
                        </Typography>
                        <Typography
                          variant='body2'
                          color='textSecondary'
                        >
                          v{formData.version} ·{' '}
                          {formData.author || t('plugin.upload_page.preview.author_placeholder')}
                        </Typography>
                      </Box>
                      <Box sx={{ flexGrow: 1 }} />
                      <Chip
                        label={
                          categories.find((c) => c.value === formData.category)?.label ||
                          t('plugin.upload_page.preview.category_placeholder')
                        }
                        size='small'
                      />
                      {formData.isFree ? (
                        <Chip
                          label={t('plugin.common.free')}
                          color='success'
                          size='small'
                        />
                      ) : (
                        <Chip
                          label={`¥${formData.price}`}
                          color='primary'
                          size='small'
                        />
                      )}
                    </Box>
                    <Typography
                      variant='body2'
                      color='textSecondary'
                    >
                      {formData.description ||
                        t('plugin.upload_page.preview.description_placeholder')}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            </Box>
          )}

          {activeStep === 3 && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <CheckCircle
                sx={{ width: 64, height: 64, color: 'success.main', mx: 'auto', mb: 3 }}
              />
              <Typography
                variant='h5'
                sx={{ fontWeight: 'bold', mb: 2 }}
              >
                {t('plugin.upload_page.success.title')}
              </Typography>
              <Typography
                variant='body1'
                color='textSecondary'
                sx={{ mb: 4 }}
              >
                {t('plugin.upload_page.success.message', { name: formData.name })}
              </Typography>
              <Button
                variant='contained'
                onClick={() => {
                  setActiveStep(0);
                  setFormData({
                    name: '',
                    code: '',
                    version: '1.0.0',
                    description: '',
                    category: 'finance',
                    pluginType: 'business',
                    price: '0',
                    isFree: true,
                    tags: '',
                    author: '',
                    website: '',
                    license: 'MIT',
                    minAppVersion: '2.0.0',
                    releaseNotes: '',
                  });
                }}
              >
                {t('plugin.action.continue_publish')}
              </Button>
            </Box>
          )}

          {activeStep < 3 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 6 }}>
              <Button
                disabled={activeStep === 0}
                onClick={handleBack}
              >
                {t('plugin.action.back')}
              </Button>
              <Box>
                {activeStep < 2 && (
                  <Button
                    variant='contained'
                    onClick={handleNext}
                  >
                    {t('plugin.action.next')}
                  </Button>
                )}
                {activeStep === 2 && (
                  <Button
                    variant='contained'
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    startIcon={
                      isSubmitting ? (
                        <Loader2
                          sx={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }}
                        />
                      ) : (
                        <Send sx={{ width: 18, height: 18 }} />
                      )
                    }
                  >
                    {isSubmitting ? t('plugin.common.submitting') : t('plugin.action.submit')}
                  </Button>
                )}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
};

export default PluginUploadPage;

import React, { useState } from 'react';
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
import { useAppStore } from '@/store';

const PluginUploadPage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);
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
      if (!formData.name.trim()) newErrors.name = '请输入插件名称';
      if (!formData.code.trim()) newErrors.code = '请输入插件代码';
      else if (!/^[a-z][a-z0-9-]*$/.test(formData.code))
        newErrors.code = '插件代码只能包含小写字母、数字和连字符，且以字母开头';
      if (!formData.version.trim()) newErrors.version = '请输入版本号';
      if (!formData.description.trim()) newErrors.description = '请输入插件描述';
      if (!formData.category) newErrors.category = '请选择分类';
    }

    if (step === 1 && !formData.author.trim()) {
      newErrors.author = '请输入作者名称';
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
        title: '提交成功',
        message: `${formData.name} 插件已提交审核，我们会尽快处理`,
        type: 'success',
      });
      setActiveStep(3);
    } catch (error: unknown) {
      addNotification({
        title: '提交失败',
        message: '提交失败，请稍后重试',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = ['基本信息', '插件配置', '上传文件', '提交审核'];

  const categories = [
    { value: 'finance', label: '财务管理' },
    { value: 'hr', label: '人力资源' },
    { value: 'manufacturing', label: '生产制造' },
    { value: 'quality', label: '质量管理' },
    { value: 'supply', label: '供应链' },
    { value: 'crm', label: '客户关系' },
    { value: 'project', label: '项目管理' },
  ];

  return (
    <PageContainer maxWidth='lg'>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant='h4'
          sx={{ fontWeight: 'bold', mb: 1 }}
        >
          发布插件
        </Typography>
        <Typography
          variant='body1'
          color='textSecondary'
        >
          将您的插件发布到 TOPEMS 插件市场，让更多用户使用
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
                基本信息
              </Typography>

              <Grid
                container
                spacing={3}
              >
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label='插件名称'
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    error={!!errors.name}
                    helperText={errors.name || '显示在插件市场的名称'}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label='插件代码'
                    value={formData.code}
                    onChange={(e) => handleChange('code', e.target.value.toLowerCase())}
                    error={!!errors.code}
                    helperText={errors.code || '唯一标识符，只能包含小写字母、数字和连字符'}
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
                    label='版本号'
                    value={formData.version}
                    onChange={(e) => handleChange('version', e.target.value)}
                    error={!!errors.version}
                    helperText={errors.version || '遵循语义化版本规范，如 1.0.0'}
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
                    label='插件分类'
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
                    label='插件描述'
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    error={!!errors.description}
                    helperText={errors.description || '简要描述插件的功能和用途'}
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
                    label='标签'
                    value={formData.tags}
                    onChange={(e) => handleChange('tags', e.target.value)}
                    helperText='多个标签用逗号分隔'
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
                    label='插件类型'
                    value={formData.pluginType}
                    onChange={(e) => handleChange('pluginType', e.target.value)}
                  >
                    <option value='core'>核心插件</option>
                    <option value='business'>业务插件</option>
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
                插件配置
              </Typography>

              <Grid
                container
                spacing={3}
              >
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label='作者名称'
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
                    label='官方网站'
                    value={formData.website}
                    onChange={(e) => handleChange('website', e.target.value)}
                    helperText='可选，插件的官方网站地址'
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label='许可证'
                    value={formData.license}
                    onChange={(e) => handleChange('license', e.target.value)}
                    helperText='如 MIT, Apache-2.0, GPL 等'
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label='最低应用版本'
                    value={formData.minAppVersion}
                    onChange={(e) => handleChange('minAppVersion', e.target.value)}
                    helperText='插件需要的最低 TOPEMS 版本'
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
                      label='免费插件'
                    />
                  </Box>
                  {!formData.isFree && (
                    <TextField
                      fullWidth
                      label='价格（元）'
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
                    label='版本更新说明'
                    value={formData.releaseNotes}
                    onChange={(e) => handleChange('releaseNotes', e.target.value)}
                    helperText='描述此版本的更新内容'
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
                上传文件
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
                      <Typography sx={{ fontWeight: 'medium', mb: 1 }}>上传插件包</Typography>
                      <Typography
                        variant='body2'
                        color='textSecondary'
                      >
                        点击或拖拽 .zip 或 .tar.gz 文件到此处
                      </Typography>
                      <Typography
                        variant='caption'
                        color='textSecondary'
                        sx={{ mt: 1, display: 'block' }}
                      >
                        最大 100MB
                      </Typography>
                    </CardContent>
                  </Card>
                  <Alert
                    severity='info'
                    sx={{ mt: 2 }}
                    icon={<Info sx={{ width: 18, height: 18 }} />}
                  >
                    插件包需要包含 plugin.json 配置文件
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
                      <Typography sx={{ fontWeight: 'medium', mb: 1 }}>上传截图</Typography>
                      <Typography
                        variant='body2'
                        color='textSecondary'
                      >
                        点击或拖拽图片文件到此处
                      </Typography>
                      <Typography
                        variant='caption'
                        color='textSecondary'
                        sx={{ mt: 1, display: 'block' }}
                      >
                        支持 JPG、PNG，最多 6 张
                      </Typography>
                    </CardContent>
                  </Card>
                  <Alert
                    severity='info'
                    sx={{ mt: 2 }}
                    icon={<Info sx={{ width: 18, height: 18 }} />}
                  >
                    建议上传 1280x800 分辨率的截图
                  </Alert>
                </Grid>
              </Grid>

              <Box sx={{ mt: 4 }}>
                <Typography
                  variant='subtitle2'
                  sx={{ mb: 2, fontWeight: 'medium' }}
                >
                  插件信息预览
                </Typography>
                <Card variant='outlined'>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Box
                        sx={{
                          width: 56,
                          height: 56,
                          borderRadius: 2,
                          background:
                            'linear-gradient(135deg, primary.light 0%, primary.main 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Package sx={{ width: 28, height: 28, color: 'white' }} />
                      </Box>
                      <Box>
                        <Typography
                          variant='h6'
                          sx={{ fontWeight: 'bold' }}
                        >
                          {formData.name || '插件名称'}
                        </Typography>
                        <Typography
                          variant='body2'
                          color='textSecondary'
                        >
                          v{formData.version} · {formData.author || '作者'}
                        </Typography>
                      </Box>
                      <Box sx={{ flexGrow: 1 }} />
                      <Chip
                        label={
                          categories.find((c) => c.value === formData.category)?.label || '分类'
                        }
                        size='small'
                      />
                      {formData.isFree ? (
                        <Chip
                          label='免费'
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
                      {formData.description || '插件描述将显示在这里...'}
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
                提交成功！
              </Typography>
              <Typography
                variant='body1'
                color='textSecondary'
                sx={{ mb: 4 }}
              >
                您的插件 {formData.name} 已成功提交审核，我们会在 1-3 个工作日内完成审核并通知您。
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
                继续发布新插件
              </Button>
            </Box>
          )}

          {activeStep < 3 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 6 }}>
              <Button
                disabled={activeStep === 0}
                onClick={handleBack}
              >
                上一步
              </Button>
              <Box>
                {activeStep < 2 && (
                  <Button
                    variant='contained'
                    onClick={handleNext}
                  >
                    下一步
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
                    {isSubmitting ? '提交中...' : '提交审核'}
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

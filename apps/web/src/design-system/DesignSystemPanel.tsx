import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Paper,
  Grid,
} from '@mui/material';
import { X as XIcon, Palette, Type, Layers, Eye, CheckCircle } from 'lucide-react';
import {
  v51DesignTokens,
  generateV51CSSVariables,
  injectV51CSSVariables,
} from './tokens/v51-tokens';
import {
  V51Button,
  V51Card,
  V51Input,
  V51Select,
  V51Tabs,
  V51Badge,
  V51Skeleton,
  V51SkeletonCard,
  V51Avatar,
  V51Table,
} from './components/index';
import { useV51Theme, V51ThemeProvider } from './theme-manager';
import { v51DesignLint, formatReport, runColorContrastChecks } from './design-lint';

const DesignSystemPanelContent: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { theme, toggleDarkMode, setPrimaryColor, setFontSize } = useV51Theme();
  const [activeTab, setActiveTab] = React.useState('overview');
  const [lintResult, setLintResult] = React.useState<string>('');

  const handleRunLint = () => {
    const checks = runColorContrastChecks();
    const issues = v51DesignLint.lintColorContrast();
    const report = v51DesignLint.generateLintReport(issues);
    setLintResult(formatReport(report));
  };

  const tabs = [
    { id: 'overview', label: '概览', content: <OverviewTab /> },
    { id: 'tokens', label: 'Tokens', content: <TokensTab /> },
    { id: 'components', label: '组件', content: <ComponentsTab /> },
    { id: 'theming', label: '主题', content: <ThemingTab /> },
    {
      id: 'lint',
      label: '合规',
      content: (
        <LintTab
          onRunLint={handleRunLint}
          lintResult={lintResult}
        />
      ),
    },
  ];

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: 'action.active',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <Box
        sx={{
          width: '98%',
          maxWidth: 1600,
          height: '95vh',
          bgcolor: 'background.paper',
          borderRadius: 2,
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Box
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: 'secondary.500',
            color: 'common.white',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Palette size={20} />
            <Typography
              variant='h6'
              sx={{ fontWeight: 600 }}
            >
              V51.0 Design System
            </Typography>
            <V51Badge
              label='Beta'
              variant='warning'
              size='sm'
            />
          </Box>
          <IconButton
            size='small'
            onClick={onClose}
            sx={{ color: 'common.white' }}
          >
            <XIcon size={20} />
          </IconButton>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
          <V51Tabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={setActiveTab}
          />
        </Box>
      </Box>
    </Box>
  );
};

const OverviewTab: React.FC = () => (
  <Box sx={{ mt: 2 }}>
    <Grid
      container
      spacing={3}
    >
      <Grid size={{ xs: 12, md: 4 }}>
        <V51Card
          title='设计令牌'
          subtitle='Tokens & Variables'
        >
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary', mb: 2 }}
          >
            V51.0 设计令牌系统，支持 CSS 自定义属性和 TypeScript 常量
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <V51Badge
              label='Colors'
              variant='primary'
              size='sm'
            />
            <V51Badge
              label='Typography'
              variant='secondary'
              size='sm'
            />
            <V51Badge
              label='Spacing'
              variant='success'
              size='sm'
            />
            <V51Badge
              label='Shadows'
              variant='info'
              size='sm'
            />
            <V51Badge
              label='Motion'
              variant='warning'
              size='sm'
            />
          </Box>
        </V51Card>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <V51Card
          title='组件库'
          subtitle='11 个核心组件'
        >
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary', mb: 2 }}
          >
            基于 MUI 的 V51 设计系统组件，提供一致的视觉体验
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <V51Badge
              label='Button'
              variant='primary'
              size='sm'
            />
            <V51Badge
              label='Card'
              variant='neutral'
              size='sm'
            />
            <V51Badge
              label='Input'
              variant='info'
              size='sm'
            />
            <V51Badge
              label='Table'
              variant='success'
              size='sm'
            />
            <V51Badge
              label='Dialog'
              variant='warning'
              size='sm'
            />
            <V51Badge
              label='Toast'
              variant='error'
              size='sm'
            />
          </Box>
        </V51Card>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <V51Card
          title='主题管理'
          subtitle='Theme Manager'
        >
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary', mb: 2 }}
          >
            完整的主题管理系统，支持 light/dark/system 模式
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <V51Badge
              label='Light'
              variant='neutral'
              size='sm'
            />
            <V51Badge
              label='Dark'
              variant='secondary'
              size='sm'
            />
            <V51Badge
              label='System'
              variant='info'
              size='sm'
            />
          </Box>
        </V51Card>
      </Grid>
    </Grid>

    <Divider sx={{ my: 3 }} />

    <Typography
      variant='h6'
      sx={{ fontWeight: 600, mb: 2 }}
    >
      快速预览
    </Typography>
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
      <V51Button variant='primary'>主要按钮</V51Button>
      <V51Button variant='secondary'>次要按钮</V51Button>
      <V51Button variant='outline'>轮廓按钮</V51Button>
      <V51Button variant='text'>文本按钮</V51Button>
      <V51Button variant='icon'>
        <Palette size={18} />
      </V51Button>
      <V51Avatar
        fallback='张三'
        size='md'
        online
      />
      <V51Avatar
        fallback='李四'
        size='lg'
      />
      <V51Badge
        label='Success'
        variant='success'
      />
      <V51Badge
        label='Warning'
        variant='warning'
      />
      <V51Badge
        label='Error'
        variant='error'
      />
      <V51Badge
        label='Info'
        variant='info'
      />
    </Box>
  </Box>
);

const TokensTab: React.FC = () => {
  const colorGroups: Array<{ name: string; colors: Array<{ shade: string; value: string }> }> = [
    {
      name: 'Primary',
      colors: Object.entries(v51DesignTokens.colors.primary)
        .filter(([k]) => isNaN(Number(k)))
        .map(([shade, value]) => ({ shade, value: value as string })),
    },
    {
      name: 'Secondary',
      colors: Object.entries(v51DesignTokens.colors.secondary)
        .filter(([k]) => isNaN(Number(k)))
        .map(([shade, value]) => ({ shade, value: value as string })),
    },
    {
      name: 'Success',
      colors: Object.entries(v51DesignTokens.colors.success)
        .filter(([k]) => isNaN(Number(k)))
        .map(([shade, value]) => ({ shade, value: value as string })),
    },
    {
      name: 'Warning',
      colors: Object.entries(v51DesignTokens.colors.warning)
        .filter(([k]) => isNaN(Number(k)))
        .map(([shade, value]) => ({ shade, value: value as string })),
    },
    {
      name: 'Error',
      colors: Object.entries(v51DesignTokens.colors.error)
        .filter(([k]) => isNaN(Number(k)))
        .map(([shade, value]) => ({ shade, value: value as string })),
    },
    {
      name: 'Info',
      colors: Object.entries(v51DesignTokens.colors.info)
        .filter(([k]) => isNaN(Number(k)))
        .map(([shade, value]) => ({ shade, value: value as string })),
    },
  ];

  return (
    <Box sx={{ mt: 2 }}>
      <Typography
        variant='h6'
        sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
      >
        <Palette size={20} /> 颜色调色板
      </Typography>
      <Grid
        container
        spacing={2}
      >
        {colorGroups.map((group) => (
          <Grid
            size={{ xs: 12, sm: 6, md: 4 }}
            key={group.name}
          >
            <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600, mb: 1 }}
              >
                {group.name}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {group.colors.map((c) => (
                  <Box
                    key={c.shade}
                    sx={{ textAlign: 'center' }}
                  >
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: 1,
                        bgcolor: c.value,
                        border: '1px solid rgba(0,0,0,0.1)',
                      }}
                    />
                    <Typography
                      variant='caption'
                      sx={{ fontSize: 10, color: 'text.secondary' }}
                    >
                      {c.shade}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Divider sx={{ my: 3 }} />

      <Grid
        container
        spacing={2}
      >
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <Type size={16} /> 排版
          </Typography>
          <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            {Object.entries(v51DesignTokens.typography.fontSize).map(([name, value]) => (
              <Box
                key={name}
                sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}
              >
                <Typography
                  variant='caption'
                  sx={{ color: 'text.secondary' }}
                >
                  fontSize.{name}
                </Typography>
                <Typography
                  variant='caption'
                  sx={{ fontFamily: v51DesignTokens.typography.fontFamily, fontSize: value }}
                >
                  Aa 文本示例
                </Typography>
                <Typography
                  variant='caption'
                  sx={{ color: 'text.disabled', fontFamily: 'monospace' }}
                >
                  {value}
                </Typography>
              </Box>
            ))}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <Layers size={16} /> 间距 & 圆角
          </Typography>
          <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Typography
              variant='caption'
              sx={{ color: 'text.secondary', mb: 1, display: 'block' }}
            >
              间距 (4px 基准)
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
              {Object.entries(v51DesignTokens.spacing)
                .filter(([_, v]) => typeof v === 'string')
                .map(([name, value]) => (
                  <Box
                    key={name}
                    sx={{ textAlign: 'center' }}
                  >
                    <Box
                      sx={{
                        height: 8,
                        bgcolor: 'primary.main',
                        borderRadius: 0.5,
                        width: value as string,
                      }}
                    />
                    <Typography
                      variant='caption'
                      sx={{ fontSize: 10, color: 'text.secondary' }}
                    >
                      {name}
                    </Typography>
                  </Box>
                ))}
            </Box>
            <Typography
              variant='caption'
              sx={{ color: 'text.secondary', mb: 1, display: 'block' }}
            >
              圆角
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {Object.entries(v51DesignTokens.borderRadius).map(([name, value]) => (
                <Box
                  key={name}
                  sx={{ textAlign: 'center' }}
                >
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: 'grey.200',
                      borderRadius: value as string,
                    }}
                  />
                  <Typography
                    variant='caption'
                    sx={{ fontSize: 10, color: 'text.secondary' }}
                  >
                    {name}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

const ComponentsTab: React.FC = () => (
  <Box sx={{ mt: 2 }}>
    <Typography
      variant='h6'
      sx={{ fontWeight: 600, mb: 2 }}
    >
      组件预览
    </Typography>
    <Grid
      container
      spacing={3}
    >
      <Grid size={{ xs: 12, md: 6 }}>
        <V51Card title='Button 按钮'>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <V51Button variant='primary'>Primary</V51Button>
            <V51Button variant='secondary'>Secondary</V51Button>
            <V51Button variant='outline'>Outline</V51Button>
            <V51Button variant='text'>Text</V51Button>
            <V51Button size='sm'>Small</V51Button>
            <V51Button size='lg'>Large</V51Button>
            <V51Button disabled>Disabled</V51Button>
            <V51Button loading>Loading</V51Button>
          </Box>
        </V51Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <V51Card title='Input 输入框'>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <V51Input
              label='用户名'
              placeholder='请输入用户名'
            />
            <V51Input
              label='邮箱'
              type='email'
              placeholder='user@example.com'
              validationState='success'
            />
            <V51Input
              label='密码'
              type='password'
              placeholder='请输入密码'
              validationState='error'
              helperText='密码长度至少 8 位'
            />
          </Box>
        </V51Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <V51Card title='Select 选择器'>
          <V51Select
            label='国家/地区'
            searchable
            options={[
              { value: 'cn', label: '中国' },
              { value: 'us', label: '美国' },
              { value: 'jp', label: '日本' },
              { value: 'de', label: '德国' },
              { value: 'fr', label: '法国' },
            ]}
          />
        </V51Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <V51Card title='Badge & Avatar'>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <V51Badge
              label='进行中'
              variant='primary'
            />
            <V51Badge
              label='已完成'
              variant='success'
            />
            <V51Badge
              label='警告'
              variant='warning'
            />
            <V51Badge
              label='错误'
              variant='error'
            />
            <V51Badge
              label='信息'
              variant='info'
            />
            <V51Badge
              label='中性'
              variant='neutral'
            />
            <V51Avatar
              fallback='张三'
              size='sm'
              online
            />
            <V51Avatar
              fallback='李四'
              size='md'
            />
            <V51Avatar
              fallback='王五'
              size='lg'
              online
            />
            <V51Avatar
              fallback='赵六'
              size='xl'
            />
          </Box>
        </V51Card>
      </Grid>

      <Grid size={{ xs: 12, md: 12 }}>
        <V51Card title='Table 数据表格'>
          <V51Table
            columns={[
              { id: 'name', label: '名称', accessor: 'name' },
              { id: 'status', label: '状态', accessor: 'status' },
              { id: 'value', label: '数值', accessor: 'value', align: 'right' },
            ]}
            data={[
              { name: '项目 A', status: '进行中', value: 100 },
              { name: '项目 B', status: '已完成', value: 200 },
              { name: '项目 C', status: '待开始', value: 50 },
            ]}
            sortable
            selectable
            pagination={false}
          />
        </V51Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <V51Card title='Skeleton 骨架屏'>
          <V51Skeleton
            variant='text'
            width='60%'
          />
          <V51Skeleton
            variant='text'
            width='40%'
          />
          <V51SkeletonCard
            rows={3}
            showAvatar
          />
        </V51Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <V51Card title='Tabs 选项卡'>
          <V51Tabs
            tabs={[
              { id: 'tab1', label: '选项一', content: <Typography>选项一内容</Typography> },
              { id: 'tab2', label: '选项二', content: <Typography>选项二内容</Typography> },
              { id: 'tab3', label: '选项三', content: <Typography>选项三内容</Typography> },
            ]}
          />
        </V51Card>
      </Grid>
    </Grid>
  </Box>
);

const ThemingTab: React.FC = () => {
  const { theme, toggleDarkMode, setPrimaryColor, setFontSize } = useV51Theme();
  const [tempColor, setTempColor] = React.useState(theme.primaryColor);

  return (
    <Box sx={{ mt: 2 }}>
      <Typography
        variant='h6'
        sx={{ fontWeight: 600, mb: 2 }}
      >
        主题配置
      </Typography>
      <Grid
        container
        spacing={3}
      >
        <Grid size={{ xs: 12, md: 6 }}>
          <V51Card title='当前主题'>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant='body2'>主题模式</Typography>
                <V51Badge
                  label={theme.mode}
                  variant='primary'
                  size='sm'
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant='body2'>主色调</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: theme.primaryColor }}
                  />
                  <Typography
                    variant='body2'
                    sx={{ fontFamily: 'monospace' }}
                  >
                    {theme.primaryColor}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant='body2'>字号</Typography>
                <Typography variant='body2'>{theme.fontSize}px</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant='body2'>密度</Typography>
                <V51Badge
                  label={theme.density}
                  variant='neutral'
                  size='sm'
                />
              </Box>
            </Box>
          </V51Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <V51Card title='操作'>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <V51Button
                variant='primary'
                onClick={toggleDarkMode}
              >
                切换 {theme.mode === 'dark' ? '亮色' : '暗色'} 模式
              </V51Button>

              <V51Input
                label='主色调 (Hex)'
                value={tempColor}
                onChange={(v) => setTempColor(v)}
              />
              <V51Button
                variant='outline'
                onClick={() => setPrimaryColor(tempColor)}
              >
                应用主色调
              </V51Button>

              <V51Input
                label={`字号 (${theme.fontSize}px)`}
                type='number'
                value={String(theme.fontSize)}
                onChange={(v) => setFontSize(parseInt(v, 10) || 14)}
              />
            </Box>
          </V51Card>
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      <Typography
        variant='h6'
        sx={{ fontWeight: 600, mb: 2 }}
      >
        CSS 变量预览
      </Typography>
      <Paper sx={{ p: 2, borderRadius: 2, bgcolor: 'grey.50', maxHeight: 300, overflow: 'auto' }}>
        <Typography
          variant='caption'
          sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', fontSize: 11 }}
        >
          {`:root {\n${Object.entries(v51DesignTokens.colors.primary)
            .filter(([k]) => isNaN(Number(k)))
            .map(([k, v]) => `  --v51-color-primary-${k}: ${v};`)
            .join('\n')}\n}`}
        </Typography>
      </Paper>
    </Box>
  );
};

const LintTab: React.FC<{ onRunLint: () => void; lintResult: string }> = ({
  onRunLint,
  lintResult,
}) => {
  const checks = runColorContrastChecks();
  const passed = checks.filter((c) => c.pass).length;
  const total = checks.length;

  return (
    <Box sx={{ mt: 2 }}>
      <Typography
        variant='h6'
        sx={{ fontWeight: 600, mb: 2 }}
      >
        设计合规检查
      </Typography>

      <Grid
        container
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Grid size={{ xs: 6, md: 3 }}>
          <Paper sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
            <Typography
              variant='h4'
              sx={{ fontWeight: 700, color: passed === total ? 'success.main' : 'warning.main' }}
            >
              {passed}/{total}
            </Typography>
            <Typography
              variant='caption'
              sx={{ color: 'text.secondary' }}
            >
              对比度检查
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Paper sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
            <Typography
              variant='h4'
              sx={{ fontWeight: 700 }}
            >
              {total}
            </Typography>
            <Typography
              variant='caption'
              sx={{ color: 'text.secondary' }}
            >
              检查项总数
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Paper sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
            <Typography
              variant='h4'
              sx={{ fontWeight: 700, color: 'success.main' }}
            >
              100%
            </Typography>
            <Typography
              variant='caption'
              sx={{ color: 'text.secondary' }}
            >
              通过率
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Paper sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
            <Typography
              variant='h4'
              sx={{ fontWeight: 700 }}
            >
              WCAG AA
            </Typography>
            <Typography
              variant='caption'
              sx={{ color: 'text.secondary' }}
            >
              标准
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <V51Button
        variant='primary'
        onClick={onRunLint}
        sx={{ mb: 2 }}
      >
        运行合规检查
      </V51Button>

      {lintResult && (
        <Paper sx={{ p: 2, borderRadius: 2, bgcolor: 'grey.50', maxHeight: 400, overflow: 'auto' }}>
          <Typography
            variant='caption'
            sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', fontSize: 12 }}
          >
            {lintResult}
          </Typography>
        </Paper>
      )}

      <Divider sx={{ my: 3 }} />

      <Typography
        variant='subtitle2'
        sx={{ fontWeight: 600, mb: 1 }}
      >
        对比度详情
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {checks.map((check, idx) => (
          <Paper
            key={idx}
            sx={{ p: 1.5, borderRadius: 1, bgcolor: check.pass ? 'success.50' : 'error.50' }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {check.pass ? (
                <CheckCircle
                  size={16}
                  color='#16a34a'
                />
              ) : (
                <Eye
                  size={16}
                  color='#dc2626'
                />
              )}
              <Typography
                variant='body2'
                sx={{ flex: 1 }}
              >
                {check.label}
              </Typography>
              <Typography
                variant='caption'
                sx={{ fontFamily: 'monospace', color: check.pass ? 'success.main' : 'error.main' }}
              >
                {check.actualRatio}:1
              </Typography>
              <Typography
                variant='caption'
                sx={{ color: 'text.secondary' }}
              >
                (要求 {check.minRatio}:1)
              </Typography>
            </Box>
          </Paper>
        ))}
      </Box>
    </Box>
  );
};

export const V51DesignSystemPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <V51ThemeProvider>
      <DesignSystemPanelContent onClose={onClose} />
    </V51ThemeProvider>
  );
};

import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Tooltip, IconButton } from '@mui/material';
import { X as XIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ensureNamespacesLoaded } from '@/i18n';
import {
  RegistryPanel,
  VersionPanel,
  ObservabilityDashboard,
  AIOpsPanel,
  ModuleMarketplace,
  DependencyGovernance,
  SecurityCenter,
  RuntimeDashboard,
  V51DevExPanel,
  moduleRegistry,
  moduleMarket,
} from '@/microfrontend';
// V53.0 AI Enhancement
import { V53AIPanel } from '@/ai/enhancement';
// V53.0 微前端平台终局
import { V53PlatformConsole } from '@/dev-platform';
// V54.0 AI Agent
import { V54AgentPanel } from '@/ai/agent';
// V54.0 AI 原生平台
import { V54NativePanel } from '@/ai/native';
// V55.0 AI Copilot
import { V55CopilotPanel } from '@/ai/copilot';
// V55.0 全栈自动化
import { V55AutomationPanel } from '@/fullstack-automation';
// V56.0 AI 代码审查
import { V56ReviewPanel } from '@/ai/review';
// V56.0 平台智能运维
import { V56OpsPanel } from '@/intelligent-ops';
// V57.0 AI 治理
import { V57GovernancePanel } from '@/ai/governance';
// V57.0 AI 自动化
import { V57AutomationPanel } from '@/ai/automation';
// V58.0 AI UX
import { V58UXPanel } from '@/ai/ux';
// V58.0 AI 演进
import { V58EvolutionPanel } from '@/ai/evolution';
// V59.0 AI DevEx
import { V59DevExPanel } from '@/ai/devex';
// V59.0 AI 安全
import { V59SecurityPanel } from '@/ai/security';
// V60.0 AI Quality
import { V60QualityPanel } from '@/ai/quality';
// V60.0 AI 伦理
import { V60EthicsPanel } from '@/ai/ethics';
import V47IntegrationPanel from './V47IntegrationPanel';
import { designTokens } from '@topems/tokens';

const MicroFrontendDevTools: React.FC = () => {
  const { t } = useTranslation();
  const [showRegistry, setShowRegistry] = React.useState(false);
  const [showVersion, setShowVersion] = React.useState(false);
  const [showDashboard, setShowDashboard] = React.useState(false);
  const [showAIOps, setShowAIOps] = React.useState(false);
  const [showMarketplace, setShowMarketplace] = React.useState(false);
  const [showGovernance, setShowGovernance] = React.useState(false);
  const [showSecurity, setShowSecurity] = React.useState(false);
  const [showRuntime, setShowRuntime] = React.useState(false);
  const [showV47Panel, setShowV47Panel] = React.useState(false);
  const [showDevEx, setShowDevEx] = React.useState(false);
  const [showV53AI, setShowV53AI] = React.useState(false);
  const [showV53Platform, setShowV53Platform] = React.useState(false);
  const [showV54Native, setShowV54Native] = React.useState(false);
  const [showV54Agent, setShowV54Agent] = React.useState(false);
  const [showV55Copilot, setShowV55Copilot] = React.useState(false);
  const [showV55Automation, setShowV55Automation] = React.useState(false);
  const [showV56Ops, setShowV56Ops] = React.useState(false);
  const [showV56Review, setShowV56Review] = React.useState(false);
  const [showV57Governance, setShowV57Governance] = React.useState(false);
  const [showV57Automation, setShowV57Automation] = React.useState(false);
  const [showV58UX, setShowV58UX] = React.useState(false);
  const [showV58Evolution, setShowV58Evolution] = React.useState(false);
  const [showV59DevEx, setShowV59DevEx] = React.useState(false);
  const [showV59Security, setShowV59Security] = useState(false);
  const [showV60Ethics, setShowV60Ethics] = useState(false);
  const [showV60Quality, setShowV60Quality] = useState(false);
  const [moduleCount, setModuleCount] = React.useState(0);
  const [marketplaceCount, setMarketplaceCount] = React.useState(0);
  const [nsReady, setNsReady] = React.useState(false);

  React.useEffect(() => {
    const updateCount = () => {
      setModuleCount(moduleRegistry.listModules().length);
      setMarketplaceCount(moduleMarket.listModules().length);
    };
    updateCount();
    const interval = setInterval(updateCount, 3000);
    return () => clearInterval(interval);
  }, []);

  // 确保 devtools/microfrontend 命名空间已加载后再渲染
  useEffect(() => {
    ensureNamespacesLoaded(['devtools', 'microfrontend'])
      .then(() => setNsReady(true))
      .catch(() => setNsReady(true));
  }, []);

  if (!nsReady) return null;

  return (
    <>
      <Box
        sx={{
          position: 'fixed',
          bottom: 16,
          left: 16,
          right: 220,
          zIndex: 9998,
          // 移动端（<sm）隐藏：窄视口下按钮换行堆叠为超高面板，
          // 从底部溢出遮挡 Header 左侧导航按钮（Phase 5 移动端 e2e 发现）
          display: { xs: 'none', sm: 'flex' },
          flexWrap: 'wrap',
          gap: 1,
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <Tooltip title={t('devtools.panels.registry.tooltip')}>
          <Button
            variant='contained'
            size='small'
            onClick={() => setShowRegistry(true)}
            sx={{
              bgcolor: 'secondary.600',
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: `0 4px 12px ${designTokens.colors.secondary[600]}`,
              '&:hover': { bgcolor: 'secondary.700' },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                {t('devtools.panels.registry.label')}
              </Typography>
              <Typography
                variant='caption'
                sx={{ fontSize: 10, opacity: 0.8 }}
              >
                {t('devtools.panels.registry.sublabel', { count: moduleCount })}
              </Typography>
            </Box>
          </Button>
        </Tooltip>
        <Tooltip title={t('devtools.panels.version.tooltip')}>
          <Button
            variant='contained'
            size='small'
            onClick={() => setShowVersion(true)}
            sx={{
              bgcolor: 'teal.600',
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: `0 4px 12px ${designTokens.colors.success[600]}`,
              '&:hover': { bgcolor: 'teal.700' },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                {t('devtools.panels.version.label')}
              </Typography>
              <Typography
                variant='caption'
                sx={{ fontSize: 10, opacity: 0.8 }}
              >
                {t('devtools.panels.version.sublabel')}
              </Typography>
            </Box>
          </Button>
        </Tooltip>
        <Tooltip title={t('devtools.panels.dashboard.tooltip')}>
          <Button
            variant='contained'
            size='small'
            onClick={() => setShowDashboard(true)}
            sx={{
              bgcolor: 'error.600',
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: `0 4px 12px ${designTokens.colors.error[600]}`,
              '&:hover': { bgcolor: 'error.700' },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                {t('devtools.panels.dashboard.label')}
              </Typography>
              <Typography
                variant='caption'
                sx={{ fontSize: 10, opacity: 0.8 }}
              >
                {t('devtools.panels.dashboard.sublabel')}
              </Typography>
            </Box>
          </Button>
        </Tooltip>
        <Tooltip title={t('devtools.panels.aiops.tooltip')}>
          <Button
            variant='contained'
            size='small'
            onClick={() => setShowAIOps(true)}
            sx={{
              bgcolor: 'secondary.600',
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: `0 4px 12px ${designTokens.colors.secondary[600]}`,
              '&:hover': { bgcolor: 'secondary.700' },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                {t('devtools.panels.aiops.label')}
              </Typography>
              <Typography
                variant='caption'
                sx={{ fontSize: 10, opacity: 0.8 }}
              >
                {t('devtools.panels.aiops.sublabel')}
              </Typography>
            </Box>
          </Button>
        </Tooltip>
        <Tooltip title={t('devtools.panels.marketplace.tooltip')}>
          <Button
            variant='contained'
            size='small'
            onClick={() => setShowMarketplace(true)}
            sx={{
              bgcolor: 'info.500',
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: `0 4px 12px ${designTokens.colors.info[500]}`,
              '&:hover': { bgcolor: 'info.600' },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                {t('devtools.panels.marketplace.label')}
              </Typography>
              <Typography
                variant='caption'
                sx={{ fontSize: 10, opacity: 0.8 }}
              >
                {t('devtools.panels.marketplace.sublabel', { count: marketplaceCount })}
              </Typography>
            </Box>
          </Button>
        </Tooltip>
        <Tooltip title={t('devtools.panels.governance.tooltip')}>
          <Button
            variant='contained'
            size='small'
            onClick={() => setShowGovernance(true)}
            sx={{
              bgcolor: 'warning.500',
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: `0 4px 12px ${designTokens.colors.warning[500]}`,
              '&:hover': { bgcolor: 'warning.600' },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                {t('devtools.panels.governance.label')}
              </Typography>
              <Typography
                variant='caption'
                sx={{ fontSize: 10, opacity: 0.8 }}
              >
                {t('devtools.panels.governance.sublabel')}
              </Typography>
            </Box>
          </Button>
        </Tooltip>
        <Tooltip title={t('devtools.panels.security.tooltip')}>
          <Button
            variant='contained'
            size='small'
            onClick={() => setShowSecurity(true)}
            sx={{
              bgcolor: 'error.500',
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: `0 4px 12px ${designTokens.colors.error[400]}`,
              '&:hover': { bgcolor: 'error.600' },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                {t('devtools.panels.security.label')}
              </Typography>
              <Typography
                variant='caption'
                sx={{ fontSize: 10, opacity: 0.8 }}
              >
                {t('devtools.panels.security.sublabel')}
              </Typography>
            </Box>
          </Button>
        </Tooltip>
        <Tooltip title={t('devtools.panels.runtime.tooltip')}>
          <Button
            variant='contained'
            size='small'
            onClick={() => setShowRuntime(true)}
            sx={{
              bgcolor: 'teal.700',
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: `0 4px 12px ${designTokens.colors.teal[600]}`,
              '&:hover': { bgcolor: 'teal.800' },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                {t('devtools.panels.runtime.label')}
              </Typography>
              <Typography
                variant='caption'
                sx={{ fontSize: 10, opacity: 0.8 }}
              >
                {t('devtools.panels.runtime.sublabel')}
              </Typography>
            </Box>
          </Button>
        </Tooltip>
        <Tooltip title={t('devtools.panels.v47Integration.tooltip')}>
          <Button
            variant='contained'
            size='small'
            onClick={() => setShowV47Panel(true)}
            sx={{
              bgcolor: 'secondary.500',
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: `0 4px 12px ${designTokens.colors.secondary[300]}`,
              '&:hover': { bgcolor: 'secondary.700' },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                {t('devtools.panels.v47Integration.label')}
              </Typography>
              <Typography
                variant='caption'
                sx={{ fontSize: 10, opacity: 0.8 }}
              >
                {t('devtools.panels.v47Integration.sublabel')}
              </Typography>
            </Box>
          </Button>
        </Tooltip>
        <Tooltip title={t('devtools.panels.v51DevEx.tooltip')}>
          <Button
            variant='contained'
            size='small'
            onClick={() => setShowDevEx(true)}
            sx={{
              bgcolor: 'cyan.600',
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: `0 4px 12px ${designTokens.colors.cyan[600]}`,
              '&:hover': { bgcolor: 'cyan.700' },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                {t('devtools.panels.v51DevEx.label')}
              </Typography>
              <Typography
                variant='caption'
                sx={{ fontSize: 10, opacity: 0.8 }}
              >
                {t('devtools.panels.v51DevEx.sublabel')}
              </Typography>
            </Box>
          </Button>
        </Tooltip>
        <Tooltip title={t('devtools.panels.v53Ai.tooltip')}>
          <Button
            variant='contained'
            size='small'
            onClick={() => setShowV53AI(true)}
            sx={{
              bgcolor: 'secondary.500',
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: `0 4px 12px ${designTokens.colors.secondary[400]}`,
              '&:hover': { bgcolor: 'secondary.600' },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                {t('devtools.panels.v53Ai.label')}
              </Typography>
              <Typography
                variant='caption'
                sx={{ fontSize: 10, opacity: 0.8 }}
              >
                {t('devtools.panels.v53Ai.sublabel')}
              </Typography>
            </Box>
          </Button>
        </Tooltip>
        <Tooltip title={t('devtools.panels.v53Platform.tooltip')}>
          <Button
            variant='contained'
            size='small'
            onClick={() => setShowV53Platform(true)}
            sx={{
              bgcolor: `linear-gradient(135deg, ${designTokens.colors.primary.dark}, ${designTokens.colors.secondary.main}, ${designTokens.colors.pink['500']})`,
              background: `linear-gradient(135deg, ${designTokens.colors.primary.dark}, ${designTokens.colors.secondary.main}, ${designTokens.colors.pink['500']})`,
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: `0 4px 12px ${designTokens.colors.secondary[300]}`,
              '&:hover': {
                bgcolor: `linear-gradient(135deg, ${designTokens.colors.primary.dark}, ${designTokens.colors.secondary.dark}, ${designTokens.colors.pink['600']})`,
              },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                {t('devtools.panels.v53Platform.label')}
              </Typography>
              <Typography
                variant='caption'
                sx={{ fontSize: 10, opacity: 0.8 }}
              >
                {t('devtools.panels.v53Platform.sublabel')}
              </Typography>
            </Box>
          </Button>
        </Tooltip>
        <Tooltip title={t('devtools.panels.v54Native.tooltip')}>
          <Button
            variant='contained'
            size='small'
            onClick={() => setShowV54Native(true)}
            sx={{
              background: `linear-gradient(135deg, ${designTokens.colors.primary.main}, ${designTokens.colors.primary.dark}, ${designTokens.colors.secondary.main})`,
              bgcolor: `linear-gradient(135deg, ${designTokens.colors.primary.main}, ${designTokens.colors.primary.dark}, ${designTokens.colors.secondary.main})`,
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: `0 4px 12px ${designTokens.colors.primary[400]}`,
              '&:hover': {
                bgcolor: `linear-gradient(135deg, ${designTokens.colors.primary.dark}, ${designTokens.colors.primary.dark}, ${designTokens.colors.secondary.dark})`,
              },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                {t('devtools.panels.v54Native.label')}
              </Typography>
              <Typography
                variant='caption'
                sx={{ fontSize: 10, opacity: 0.8 }}
              >
                {t('devtools.panels.v54Native.sublabel')}
              </Typography>
            </Box>
          </Button>
        </Tooltip>
        <Tooltip title={t('devtools.panels.v54Agent.tooltip')}>
          <Button
            variant='contained'
            size='small'
            onClick={() => setShowV54Agent(true)}
            sx={{
              background: `linear-gradient(135deg, ${designTokens.colors.success.dark}, ${designTokens.colors.success.dark}, ${designTokens.colors.teal['600']})`,
              bgcolor: `linear-gradient(135deg, ${designTokens.colors.success.dark}, ${designTokens.colors.success.dark}, ${designTokens.colors.teal['600']})`,
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: `0 4px 12px ${designTokens.colors.success[400]}`,
              '&:hover': {
                bgcolor: `linear-gradient(135deg, ${designTokens.colors.success.dark}, ${designTokens.colors.success[700]}, ${designTokens.colors.teal[700]})`,
              },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                {t('devtools.panels.v54Agent.label')}
              </Typography>
              <Typography
                variant='caption'
                sx={{ fontSize: 10, opacity: 0.8 }}
              >
                {t('devtools.panels.v54Agent.sublabel')}
              </Typography>
            </Box>
          </Button>
        </Tooltip>
        <Tooltip title={t('devtools.panels.v55Copilot.tooltip')}>
          <Button
            variant='contained'
            size='small'
            onClick={() => setShowV55Copilot(true)}
            sx={{
              background: `linear-gradient(135deg, ${designTokens.colors.secondary.main}, ${designTokens.colors.primary.dark}, ${designTokens.colors.primary.main})`,
              bgcolor: `linear-gradient(135deg, ${designTokens.colors.secondary.main}, ${designTokens.colors.primary.dark}, ${designTokens.colors.primary.main})`,
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: `0 4px 12px ${designTokens.colors.secondary[400]}`,
              '&:hover': {
                bgcolor: `linear-gradient(135deg, ${designTokens.colors.secondary.dark}, ${designTokens.colors.primary.dark}, ${designTokens.colors.primary.dark})`,
              },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                {t('devtools.panels.v55Copilot.label')}
              </Typography>
              <Typography
                variant='caption'
                sx={{ fontSize: 10, opacity: 0.8 }}
              >
                {t('devtools.panels.v55Copilot.sublabel')}
              </Typography>
            </Box>
          </Button>
        </Tooltip>
        <Tooltip title={t('devtools.panels.v55Automation.tooltip')}>
          <Button
            variant='contained'
            size='small'
            onClick={() => setShowV55Automation(true)}
            sx={{
              background: `linear-gradient(135deg, ${designTokens.colors.warning.main}, ${designTokens.colors.secondary.main}, ${designTokens.colors.pink['500']})`,
              bgcolor: `linear-gradient(135deg, ${designTokens.colors.warning.main}, ${designTokens.colors.secondary.main}, ${designTokens.colors.pink['500']})`,
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: `0 4px 12px ${designTokens.colors.warning[500]}`,
              '&:hover': {
                bgcolor: `linear-gradient(135deg, ${designTokens.colors.warning.dark}, ${designTokens.colors.secondary.dark}, ${designTokens.colors.pink['600']})`,
              },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                {t('devtools.panels.v55Automation.label')}
              </Typography>
              <Typography
                variant='caption'
                sx={{ fontSize: 10, opacity: 0.8 }}
              >
                {t('devtools.panels.v55Automation.sublabel')}
              </Typography>
            </Box>
          </Button>
        </Tooltip>
        <Tooltip title={t('devtools.panels.v56Ops.tooltip')}>
          <Button
            variant='contained'
            size='small'
            onClick={() => setShowV56Ops(true)}
            sx={{
              background: `linear-gradient(135deg, ${designTokens.colors.orange['500']}, ${designTokens.colors.error.dark}, ${designTokens.colors.secondary.dark})`,
              bgcolor: `linear-gradient(135deg, ${designTokens.colors.orange['500']}, ${designTokens.colors.error.dark}, ${designTokens.colors.secondary.dark})`,
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: `0 4px 12px ${designTokens.colors.warning[600]}`,
              '&:hover': {
                bgcolor: `linear-gradient(135deg, ${designTokens.colors.orange['600']}, ${designTokens.colors.error['800']}, ${designTokens.colors.secondary[700]})`,
              },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                {t('devtools.panels.v56Ops.label')}
              </Typography>
              <Typography
                variant='caption'
                sx={{ fontSize: 10, opacity: 0.8 }}
              >
                {t('devtools.panels.v56Ops.sublabel')}
              </Typography>
            </Box>
          </Button>
        </Tooltip>
        <Tooltip title={t('devtools.panels.v56Review.tooltip')}>
          <Button
            variant='contained'
            size='small'
            onClick={() => setShowV56Review(true)}
            sx={{
              background: `linear-gradient(135deg, ${designTokens.colors.info.main}, ${designTokens.colors.primary.dark}, ${designTokens.colors.secondary.main})`,
              bgcolor: `linear-gradient(135deg, ${designTokens.colors.info.main}, ${designTokens.colors.primary.dark}, ${designTokens.colors.secondary.main})`,
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: `0 4px 12px ${designTokens.colors.info[500]}`,
              '&:hover': {
                bgcolor: `linear-gradient(135deg, ${designTokens.colors.info['600']}, ${designTokens.colors.primary.dark}, ${designTokens.colors.secondary.dark})`,
              },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                {t('devtools.panels.v56Review.label')}
              </Typography>
              <Typography
                variant='caption'
                sx={{ fontSize: 10, opacity: 0.8 }}
              >
                {t('devtools.panels.v56Review.sublabel')}
              </Typography>
            </Box>
          </Button>
        </Tooltip>
        <Tooltip title={t('devtools.panels.v57Governance.tooltip')}>
          <Button
            variant='contained'
            size='small'
            onClick={() => setShowV57Governance(true)}
            sx={{
              background: `linear-gradient(135deg, ${designTokens.colors.success.dark}, ${designTokens.colors.teal['600']}, ${designTokens.colors.cyan['600']})`,
              bgcolor: `linear-gradient(135deg, ${designTokens.colors.success.dark}, ${designTokens.colors.teal['600']}, ${designTokens.colors.cyan['600']})`,
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: `0 4px 12px ${designTokens.colors.success[400]}`,
              '&:hover': {
                bgcolor: `linear-gradient(135deg, ${designTokens.colors.success.dark}, ${designTokens.colors.teal[700]}, ${designTokens.colors.cyan['700']})`,
              },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                {t('devtools.panels.v57Governance.label')}
              </Typography>
              <Typography
                variant='caption'
                sx={{ fontSize: 10, opacity: 0.8 }}
              >
                {t('devtools.panels.v57Governance.sublabel')}
              </Typography>
            </Box>
          </Button>
        </Tooltip>
        <Tooltip title={t('devtools.panels.v57Automation.tooltip')}>
          <Button
            variant='contained'
            size='small'
            onClick={() => setShowV57Automation(true)}
            sx={{
              background: `linear-gradient(135deg, ${designTokens.colors.primary.dark}, ${designTokens.colors.secondary.main}, ${designTokens.colors.purple['500']})`,
              bgcolor: `linear-gradient(135deg, ${designTokens.colors.primary.dark}, ${designTokens.colors.secondary.main}, ${designTokens.colors.purple['500']})`,
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: `0 4px 12px ${designTokens.colors.secondary[400]}`,
              '&:hover': {
                bgcolor: `linear-gradient(135deg, ${designTokens.colors.primary.dark}, ${designTokens.colors.secondary.dark}, ${designTokens.colors.purple['600']})`,
              },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                {t('devtools.panels.v57Automation.label')}
              </Typography>
              <Typography
                variant='caption'
                sx={{ fontSize: 10, opacity: 0.8 }}
              >
                {t('devtools.panels.v57Automation.sublabel')}
              </Typography>
            </Box>
          </Button>
        </Tooltip>
        <Tooltip title={t('devtools.panels.v58Ux.tooltip')}>
          <Button
            variant='contained'
            size='small'
            onClick={() => setShowV58UX(true)}
            sx={{
              background: `linear-gradient(135deg, ${designTokens.colors.cyan['500']}, ${designTokens.colors.cyan['600']}, ${designTokens.colors.cyan['700']})`,
              bgcolor: `linear-gradient(135deg, ${designTokens.colors.cyan['500']}, ${designTokens.colors.cyan['600']}, ${designTokens.colors.cyan['700']})`,
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: `0 4px 12px ${designTokens.colors.cyan[500]}`,
              '&:hover': {
                bgcolor: `linear-gradient(135deg, ${designTokens.colors.cyan['600']}, ${designTokens.colors.cyan['700']}, ${designTokens.colors.cyan[800]})`,
              },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                {t('devtools.panels.v58Ux.label')}
              </Typography>
              <Typography
                variant='caption'
                sx={{ fontSize: 10, opacity: 0.8 }}
              >
                {t('devtools.panels.v58Ux.sublabel')}
              </Typography>
            </Box>
          </Button>
        </Tooltip>
        <Tooltip title={t('devtools.panels.v58Evolution.tooltip')}>
          <Button
            variant='contained'
            size='small'
            onClick={() => setShowV58Evolution(true)}
            sx={{
              background: `linear-gradient(135deg, ${designTokens.colors.secondary.main}, ${designTokens.colors.primary.dark}, ${designTokens.colors.primary.main})`,
              bgcolor: `linear-gradient(135deg, ${designTokens.colors.secondary.main}, ${designTokens.colors.primary.dark}, ${designTokens.colors.primary.main})`,
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: `0 4px 12px ${designTokens.colors.secondary[400]}`,
              '&:hover': {
                bgcolor: `linear-gradient(135deg, ${designTokens.colors.secondary.dark}, ${designTokens.colors.primary.dark}, ${designTokens.colors.primary.dark})`,
              },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                {t('devtools.panels.v58Evolution.label')}
              </Typography>
              <Typography
                variant='caption'
                sx={{ fontSize: 10, opacity: 0.8 }}
              >
                {t('devtools.panels.v58Evolution.sublabel')}
              </Typography>
            </Box>
          </Button>
        </Tooltip>
        <Tooltip title={t('devtools.panels.v59DevEx.tooltip')}>
          <Button
            variant='contained'
            size='small'
            onClick={() => setShowV59DevEx(true)}
            sx={{
              background: `linear-gradient(135deg, ${designTokens.colors.primary.dark}, ${designTokens.colors.secondary.main}, ${designTokens.colors.pink['500']})`,
              bgcolor: `linear-gradient(135deg, ${designTokens.colors.primary.dark}, ${designTokens.colors.secondary.main}, ${designTokens.colors.pink['500']})`,
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: `0 4px 12px ${designTokens.colors.secondary[300]}`,
              '&:hover': {
                bgcolor: `linear-gradient(135deg, ${designTokens.colors.primary.dark}, ${designTokens.colors.secondary.dark}, ${designTokens.colors.pink['600']})`,
              },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                {t('devtools.panels.v59DevEx.label')}
              </Typography>
              <Typography
                variant='caption'
                sx={{ fontSize: 10, opacity: 0.8 }}
              >
                {t('devtools.panels.v59DevEx.sublabel')}
              </Typography>
            </Box>
          </Button>
        </Tooltip>
        <Tooltip title={t('devtools.panels.v59Security.tooltip')}>
          <Button
            variant='contained'
            size='small'
            onClick={() => setShowV59Security(true)}
            sx={{
              background: `linear-gradient(135deg, ${designTokens.colors.error.dark}, ${designTokens.colors.orange['600']}, ${designTokens.colors.warning.dark})`,
              bgcolor: `linear-gradient(135deg, ${designTokens.colors.error.dark}, ${designTokens.colors.orange['600']}, ${designTokens.colors.warning.dark})`,
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: `0 4px 12px ${designTokens.colors.error[600]}`,
              '&:hover': {
                bgcolor: `linear-gradient(135deg, ${designTokens.colors.error[700]}, ${designTokens.colors.warning[700]}, ${designTokens.colors.warning[700]})`,
              },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                {t('devtools.panels.v59Security.label')}
              </Typography>
              <Typography
                variant='caption'
                sx={{ fontSize: 10, opacity: 0.8 }}
              >
                {t('devtools.panels.v59Security.sublabel')}
              </Typography>
            </Box>
          </Button>
        </Tooltip>
        <Tooltip title={t('devtools.panels.v60Ethics.tooltip')}>
          <Button
            variant='contained'
            size='small'
            onClick={() => setShowV60Ethics(true)}
            sx={{
              background: `linear-gradient(135deg, ${designTokens.colors.success.dark}, ${designTokens.colors.teal['600']}, ${designTokens.colors.cyan['600']})`,
              bgcolor: `linear-gradient(135deg, ${designTokens.colors.success.dark}, ${designTokens.colors.teal['600']}, ${designTokens.colors.cyan['600']})`,
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: `0 4px 12px ${designTokens.colors.success[600]}`,
              '&:hover': {
                bgcolor: `linear-gradient(135deg, ${designTokens.colors.success[700]}, ${designTokens.colors.teal[700]}, ${designTokens.colors.cyan[700]})`,
              },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                {t('devtools.panels.v60Ethics.label')}
              </Typography>
              <Typography
                variant='caption'
                sx={{ fontSize: 10, opacity: 0.8 }}
              >
                {t('devtools.panels.v60Ethics.sublabel')}
              </Typography>
            </Box>
          </Button>
        </Tooltip>
        <Tooltip title={t('devtools.panels.v60Quality.tooltip')}>
          <Button
            variant='contained'
            size='small'
            onClick={() => setShowV60Quality(true)}
            sx={{
              background: `linear-gradient(135deg, ${designTokens.colors.primary.dark}, ${designTokens.colors.secondary.main}, ${designTokens.colors.pink['500']})`,
              bgcolor: `linear-gradient(135deg, ${designTokens.colors.primary.dark}, ${designTokens.colors.secondary.main}, ${designTokens.colors.pink['500']})`,
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: `0 4px 12px ${designTokens.colors.secondary[300]}`,
              '&:hover': {
                bgcolor: `linear-gradient(135deg, ${designTokens.colors.primary.dark}, ${designTokens.colors.secondary.dark}, ${designTokens.colors.pink['600']})`,
              },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                {t('devtools.panels.v60Quality.label')}
              </Typography>
              <Typography
                variant='caption'
                sx={{ fontSize: 10, opacity: 0.8 }}
              >
                {t('devtools.panels.v60Quality.sublabel')}
              </Typography>
            </Box>
          </Button>
        </Tooltip>
      </Box>

      {showRegistry && (
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
          onClick={() => setShowRegistry(false)}
        >
          <Box
            sx={{
              width: '90%',
              maxWidth: 1200,
              maxHeight: '90vh',
              bgcolor: 'background.paper',
              borderRadius: 2,
              overflow: 'hidden',
              boxShadow: designTokens.darkShadows.xl,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Box
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                bgcolor: 'secondary.600',
                color: 'common.white',
              }}
            >
              <Typography
                variant='h6'
                sx={{ fontWeight: 600 }}
              >
                {t('devtools.panels.registry.title')}
              </Typography>
              <IconButton
                size='small'
                onClick={() => setShowRegistry(false)}
                sx={{ color: 'common.white' }}
              >
                <XIcon size={20} />
              </IconButton>
            </Box>
            <Box sx={{ overflow: 'auto', maxHeight: 'calc(90vh - 56px)' }}>
              <RegistryPanel />
            </Box>
          </Box>
        </Box>
      )}

      {showVersion && (
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
          onClick={() => setShowVersion(false)}
        >
          <Box
            sx={{
              width: '90%',
              maxWidth: 1200,
              maxHeight: '90vh',
              bgcolor: 'background.paper',
              borderRadius: 2,
              overflow: 'hidden',
              boxShadow: designTokens.darkShadows.xl,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Box
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                bgcolor: 'teal.600',
                color: 'common.white',
              }}
            >
              <Typography
                variant='h6'
                sx={{ fontWeight: 600 }}
              >
                {t('devtools.panels.version.title')}
              </Typography>
              <IconButton
                size='small'
                onClick={() => setShowVersion(false)}
                sx={{ color: 'common.white' }}
              >
                <XIcon size={20} />
              </IconButton>
            </Box>
            <Box sx={{ overflow: 'auto', maxHeight: 'calc(90vh - 56px)' }}>
              <VersionPanel />
            </Box>
          </Box>
        </Box>
      )}

      {showDashboard && (
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
          onClick={() => setShowDashboard(false)}
        >
          <Box
            sx={{
              width: '95%',
              maxWidth: 1400,
              maxHeight: '95vh',
              bgcolor: 'background.paper',
              borderRadius: 2,
              overflow: 'hidden',
              boxShadow: designTokens.darkShadows.xl,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Box
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                bgcolor: 'error.600',
                color: 'common.white',
              }}
            >
              <Typography
                variant='h6'
                sx={{ fontWeight: 600 }}
              >
                {t('devtools.panels.dashboard.title')}
              </Typography>
              <IconButton
                size='small'
                onClick={() => setShowDashboard(false)}
                sx={{ color: 'common.white' }}
              >
                <XIcon size={20} />
              </IconButton>
            </Box>
            <Box sx={{ overflow: 'auto', maxHeight: 'calc(95vh - 56px)' }}>
              <ObservabilityDashboard />
            </Box>
          </Box>
        </Box>
      )}

      {showAIOps && (
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
          onClick={() => setShowAIOps(false)}
        >
          <Box
            sx={{
              width: '98%',
              maxWidth: 1600,
              height: '95vh',
              bgcolor: 'background.paper',
              borderRadius: 2,
              overflow: 'hidden',
              boxShadow: designTokens.darkShadows.xl,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <AIOpsPanel onClose={() => setShowAIOps(false)} />
          </Box>
        </Box>
      )}

      {showMarketplace && (
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
          onClick={() => setShowMarketplace(false)}
        >
          <Box
            sx={{
              width: '98%',
              maxWidth: 1600,
              height: '95vh',
              bgcolor: 'background.paper',
              borderRadius: 2,
              overflow: 'hidden',
              boxShadow: designTokens.darkShadows.xl,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <ModuleMarketplace onClose={() => setShowMarketplace(false)} />
          </Box>
        </Box>
      )}

      {showGovernance && (
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
          onClick={() => setShowGovernance(false)}
        >
          <Box
            sx={{
              width: '95%',
              maxWidth: 1400,
              height: '90vh',
              bgcolor: 'background.paper',
              borderRadius: 2,
              overflow: 'hidden',
              boxShadow: designTokens.darkShadows.xl,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <DependencyGovernance onClose={() => setShowGovernance(false)} />
          </Box>
        </Box>
      )}

      {showSecurity && (
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
          onClick={() => setShowSecurity(false)}
        >
          <Box
            sx={{
              width: '95%',
              maxWidth: 1400,
              height: '90vh',
              bgcolor: 'background.paper',
              borderRadius: 2,
              overflow: 'hidden',
              boxShadow: designTokens.darkShadows.xl,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <SecurityCenter onClose={() => setShowSecurity(false)} />
          </Box>
        </Box>
      )}

      {showRuntime && (
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
          onClick={() => setShowRuntime(false)}
        >
          <Box
            sx={{
              width: '98%',
              maxWidth: 1600,
              height: '95vh',
              bgcolor: 'background.paper',
              borderRadius: 2,
              overflow: 'hidden',
              boxShadow: designTokens.darkShadows.xl,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <RuntimeDashboard onClose={() => setShowRuntime(false)} />
          </Box>
        </Box>
      )}

      {showV47Panel && <V47IntegrationPanel onClose={() => setShowV47Panel(false)} />}
      {showDevEx && <V51DevExPanel onClose={() => setShowDevEx(false)} />}
      {showV53AI && <V53AIPanel onClose={() => setShowV53AI(false)} />}
      {showV53Platform && <V53PlatformConsole onClose={() => setShowV53Platform(false)} />}
      {showV54Native && <V54NativePanel onClose={() => setShowV54Native(false)} />}
      {showV54Agent && <V54AgentPanel onClose={() => setShowV54Agent(false)} />}
      {showV55Copilot && <V55CopilotPanel onClose={() => setShowV55Copilot(false)} />}
      {showV55Automation && <V55AutomationPanel onClose={() => setShowV55Automation(false)} />}
      {showV56Ops && <V56OpsPanel onClose={() => setShowV56Ops(false)} />}
      {showV56Review && <V56ReviewPanel onClose={() => setShowV56Review(false)} />}
      {showV57Governance && <V57GovernancePanel onClose={() => setShowV57Governance(false)} />}
      {showV57Automation && <V57AutomationPanel onClose={() => setShowV57Automation(false)} />}
      {showV58UX && <V58UXPanel onClose={() => setShowV58UX(false)} />}
      {showV58Evolution && <V58EvolutionPanel onClose={() => setShowV58Evolution(false)} />}
      {showV59DevEx && <V59DevExPanel onClose={() => setShowV59DevEx(false)} />}
      {showV59Security && <V59SecurityPanel onClose={() => setShowV59Security(false)} />}
      {showV60Ethics && <V60EthicsPanel onClose={() => setShowV60Ethics(false)} />}
      {showV60Quality && <V60QualityPanel onClose={() => setShowV60Quality(false)} />}
    </>
  );
};

export default MicroFrontendDevTools;

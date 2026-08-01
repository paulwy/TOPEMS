import React, { useState } from 'react';
import { Box, Typography, Button, Tooltip, IconButton } from '@mui/material';
import { X as XIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
// V51.0 Design System
import { V51DesignSystemPanel } from '@/design-system';
// V53.0 AI Enhancement
import { V53AIPanel } from '@/ai-enhancement';
// V53.0 微前端平台终局
import { V53PlatformConsole } from '@/dev-platform';
// V54.0 AI Agent
import { V54AgentPanel } from '@/ai-agent';
// V54.0 AI 原生平台
import { V54NativePanel } from '@/ai-native';
// V55.0 AI Copilot
import { V55CopilotPanel } from '@/ai-copilot';
// V55.0 全栈自动化
import { V55AutomationPanel } from '@/fullstack-automation';
// V56.0 AI 代码审查
import { V56ReviewPanel } from '@/ai-review';
// V56.0 平台智能运维
import { V56OpsPanel } from '@/intelligent-ops';
// V57.0 AI 治理
import { V57GovernancePanel } from '@/ai-governance';
// V57.0 AI 自动化
import { V57AutomationPanel } from '@/ai-automation';
// V58.0 AI UX
import { V58UXPanel } from '@/ai-ux';
// V58.0 AI 演进
import { V58EvolutionPanel } from '@/ai-evolution';
// V59.0 AI DevEx
import { V59DevExPanel } from '@/ai-devex';
// V59.0 AI 安全
import { V59SecurityPanel } from '@/ai-security';
// V60.0 AI Quality
import { V60QualityPanel } from '@/ai-quality';
// V60.0 AI 伦理
import { V60EthicsPanel } from '@/ai-ethics';
import V47IntegrationPanel from './V47IntegrationPanel';

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
  const [showDesignSystem, setShowDesignSystem] = React.useState(false);
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

  React.useEffect(() => {
    const updateCount = () => {
      setModuleCount(moduleRegistry.listModules().length);
      setMarketplaceCount(moduleMarket.listModules().length);
    };
    updateCount();
    const interval = setInterval(updateCount, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <Box
        sx={{
          position: 'fixed',
          bottom: 16,
          left: 16,
          zIndex: 9998,
          display: 'flex',
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
              bgcolor: '#7c3aed',
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: '0 4px 12px rgba(124, 58, 237, 0.4)',
              '&:hover': { bgcolor: '#6d28d9' },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                注册中心
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
              bgcolor: '#059669',
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.4)',
              '&:hover': { bgcolor: '#047857' },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                版本平台
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
              bgcolor: '#dc2626',
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.4)',
              '&:hover': { bgcolor: '#b91c1c' },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                仪表盘
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
              bgcolor: '#7c3aed',
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: '0 4px 12px rgba(124, 58, 237, 0.4)',
              '&:hover': { bgcolor: '#6d28d9' },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                AI 运维
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
              bgcolor: '#0ea5e9',
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: '0 4px 12px rgba(14, 165, 233, 0.4)',
              '&:hover': { bgcolor: '#0284c7' },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                模块市场
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
              bgcolor: '#f59e0b',
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)',
              '&:hover': { bgcolor: '#d97706' },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                依赖治理
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
              bgcolor: '#ef4444',
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
              '&:hover': { bgcolor: '#dc2626' },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                安全中心
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
              bgcolor: '#0f766e',
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: '0 4px 12px rgba(15, 118, 110, 0.4)',
              '&:hover': { bgcolor: '#115e59' },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                运行时
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
              bgcolor: '#6366f1',
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
              '&:hover': { bgcolor: '#4f46e5' },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                V47-V50
              </Typography>
              <Typography
                variant='caption'
                sx={{ fontSize: 10, opacity: 0.8 }}
              >
                平台+Serverless
              </Typography>
            </Box>
          </Button>
        </Tooltip>
        <Tooltip title={t('devtools.panels.v51Design.tooltip')}>
          <Button
            variant='contained'
            size='small'
            onClick={() => setShowDesignSystem(true)}
            sx={{
              bgcolor: '#0d9488',
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: '0 4px 12px rgba(13, 148, 136, 0.4)',
              '&:hover': { bgcolor: '#0f766e' },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                V51
              </Typography>
              <Typography
                variant='caption'
                sx={{ fontSize: 10, opacity: 0.8 }}
              >
                {t('devtools.panels.v51Design.sublabel')}
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
              bgcolor: '#0891b2',
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: '0 4px 12px rgba(8, 145, 178, 0.4)',
              '&:hover': { bgcolor: '#0e7490' },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                DevEx
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
              bgcolor: '#8b5cf6',
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)',
              '&:hover': { bgcolor: '#7c3aed' },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                V53 AI
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
              bgcolor: 'linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899)',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899)',
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
              '&:hover': { bgcolor: 'linear-gradient(135deg, #4f46e5, #7c3aed, #db2777)' },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                V53 平台
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
              background: 'linear-gradient(135deg, #3b82f6, #6366f1, #8b5cf6)',
              bgcolor: 'linear-gradient(135deg, #3b82f6, #6366f1, #8b5cf6)',
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
              '&:hover': { bgcolor: 'linear-gradient(135deg, #2563eb, #4f46e5, #7c3aed)' },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                V54 AI
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
              background: 'linear-gradient(135deg, #10b981, #059669, #0d9488)',
              bgcolor: 'linear-gradient(135deg, #10b981, #059669, #0d9488)',
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
              '&:hover': { bgcolor: 'linear-gradient(135deg, #059669, #047857, #0f766e)' },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                V54 Agent
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
              background: 'linear-gradient(135deg, #8b5cf6, #6366f1, #3b82f6)',
              bgcolor: 'linear-gradient(135deg, #8b5cf6, #6366f1, #3b82f6)',
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)',
              '&:hover': { bgcolor: 'linear-gradient(135deg, #7c3aed, #4f46e5, #2563eb)' },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                V55 Copilot
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
              background: 'linear-gradient(135deg, #f59e0b, #8b5cf6, #ec4899)',
              bgcolor: 'linear-gradient(135deg, #f59e0b, #8b5cf6, #ec4899)',
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)',
              '&:hover': { bgcolor: 'linear-gradient(135deg, #d97706, #7c3aed, #db2777)' },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                V55 Auto
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
              background: 'linear-gradient(135deg, #f97316, #dc2626, #7c3aed)',
              bgcolor: 'linear-gradient(135deg, #f97316, #dc2626, #7c3aed)',
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: '0 4px 12px rgba(249, 115, 22, 0.4)',
              '&:hover': { bgcolor: 'linear-gradient(135deg, #ea580c, #b91c1c, #6d28d9)' },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                V56 Ops
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
              background: 'linear-gradient(135deg, #0ea5e9, #6366f1, #8b5cf6)',
              bgcolor: 'linear-gradient(135deg, #0ea5e9, #6366f1, #8b5cf6)',
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: '0 4px 12px rgba(14, 165, 233, 0.4)',
              '&:hover': { bgcolor: 'linear-gradient(135deg, #0284c7, #4f46e5, #7c3aed)' },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                V56 Review
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
              background: 'linear-gradient(135deg, #10b981, #0d9488, #0891b2)',
              bgcolor: 'linear-gradient(135deg, #10b981, #0d9488, #0891b2)',
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
              '&:hover': { bgcolor: 'linear-gradient(135deg, #059669, #0f766e, #0e7490)' },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                V57 AI
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
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7)',
              bgcolor: 'linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7)',
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)',
              '&:hover': { bgcolor: 'linear-gradient(135deg, #4f46e5, #7c3aed, #9333ea)' },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                V57 Auto
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
              background: 'linear-gradient(135deg, #06b6d4, #0891b2, #0e7490)',
              bgcolor: 'linear-gradient(135deg, #06b6d4, #0891b2, #0e7490)',
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: '0 4px 12px rgba(6, 182, 212, 0.4)',
              '&:hover': { bgcolor: 'linear-gradient(135deg, #0891b2, #0e7490, #155e75)' },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                V58 UX
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
              background: 'linear-gradient(135deg, #8b5cf6, #6366f1, #3b82f6)',
              bgcolor: 'linear-gradient(135deg, #8b5cf6, #6366f1, #3b82f6)',
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)',
              '&:hover': { bgcolor: 'linear-gradient(135deg, #7c3aed, #4f46e5, #2563eb)' },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                V58 AI
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
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899)',
              bgcolor: 'linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899)',
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
              '&:hover': { bgcolor: 'linear-gradient(135deg, #4f46e5, #7c3aed, #db2777)' },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                V59 DevEx
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
              background: 'linear-gradient(135deg, #dc2626, #ea580c, #d97706)',
              bgcolor: 'linear-gradient(135deg, #dc2626, #ea580c, #d97706)',
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.4)',
              '&:hover': { bgcolor: 'linear-gradient(135deg, #b91c1c, #c2410c, #b45309)' },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                V59 安全
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
              background: 'linear-gradient(135deg, #059669, #0d9488, #0891b2)',
              bgcolor: 'linear-gradient(135deg, #059669, #0d9488, #0891b2)',
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.4)',
              '&:hover': { bgcolor: 'linear-gradient(135deg, #047857, #0f766e, #0e7490)' },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                V60 伦理
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
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899)',
              bgcolor: 'linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899)',
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
              '&:hover': { bgcolor: 'linear-gradient(135deg, #4f46e5, #7c3aed, #db2777)' },
              minWidth: 'auto',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                V60 质量
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
            bgcolor: 'rgba(0,0,0,0.5)',
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
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Box
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                bgcolor: '#7c3aed',
                color: 'white',
              }}
            >
              <Typography
                variant='h6'
                sx={{ fontWeight: 600 }}
              >
                模块注册中心
              </Typography>
              <IconButton
                size='small'
                onClick={() => setShowRegistry(false)}
                sx={{ color: 'white' }}
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
            bgcolor: 'rgba(0,0,0,0.5)',
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
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Box
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                bgcolor: '#059669',
                color: 'white',
              }}
            >
              <Typography
                variant='h6'
                sx={{ fontWeight: 600 }}
              >
                版本管理平台
              </Typography>
              <IconButton
                size='small'
                onClick={() => setShowVersion(false)}
                sx={{ color: 'white' }}
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
            bgcolor: 'rgba(0,0,0,0.5)',
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
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Box
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                bgcolor: '#dc2626',
                color: 'white',
              }}
            >
              <Typography
                variant='h6'
                sx={{ fontWeight: 600 }}
              >
                可观测性仪表盘
              </Typography>
              <IconButton
                size='small'
                onClick={() => setShowDashboard(false)}
                sx={{ color: 'white' }}
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
            bgcolor: 'rgba(0,0,0,0.5)',
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
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
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
            bgcolor: 'rgba(0,0,0,0.5)',
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
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
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
            bgcolor: 'rgba(0,0,0,0.5)',
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
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
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
            bgcolor: 'rgba(0,0,0,0.5)',
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
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
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
            bgcolor: 'rgba(0,0,0,0.5)',
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
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <RuntimeDashboard onClose={() => setShowRuntime(false)} />
          </Box>
        </Box>
      )}

      {showV47Panel && <V47IntegrationPanel onClose={() => setShowV47Panel(false)} />}
      {showDesignSystem && <V51DesignSystemPanel onClose={() => setShowDesignSystem(false)} />}
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

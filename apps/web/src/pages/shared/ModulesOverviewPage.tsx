import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Typography, Paper, TextField, Grid, Chip, InputAdornment } from '@mui/material';
import {
  Search,
  Home,
  Users,
  Building2,
  Briefcase,
  BarChart3,
  DollarSign,
  Factory,
  Truck,
  Warehouse,
  LineChart,
  Map,
  MessageSquare,
  Layers,
  GanttChart,
  ShieldAlert,
  Settings,
  Package,
  ClipboardCheck,
  Workflow,
  Brain,
  Target,
  type LucideProps,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { navigationRegistry, type ModuleCardConfig } from '@/lib/navigationRegistry';
import { gradients } from '@/theme';
import { PageContainer } from '@/components/common/PageContainer';

/* ------------------------------------------------------------------ */
/*  Icon name -> component mapping                                     */
/* ------------------------------------------------------------------ */

const iconMap: Record<string, React.FC<LucideProps>> = {
  Home,
  Users,
  Building2,
  Briefcase,
  BarChart3,
  DollarSign,
  Factory,
  Truck,
  Warehouse,
  LineChart,
  Map,
  MessageSquare,
  Layers,
  GanttChart,
  ShieldAlert,
  Settings,
  Package,
  ClipboardCheck,
  Workflow,
  Brain,
  Target,
};

const renderIcon = (iconName?: string, size = 26): React.ReactNode => {
  if (!iconName) return null;
  const Icon = iconMap[iconName];
  if (!Icon) return null;
  return (
    <Icon
      size={size}
      color='#fff'
    />
  );
};

/* ------------------------------------------------------------------ */
/*  Fallback letter helper                                             */
/* ------------------------------------------------------------------ */

const fallbackLetter = (code: string): string => code.charAt(0).toUpperCase();

/* ------------------------------------------------------------------ */
/*  ModuleCard                                                         */
/* ------------------------------------------------------------------ */

interface ModuleCardProps {
  card: ModuleCardConfig;
  onClick: () => void;
}

const ModuleCard: React.FC<ModuleCardProps> = ({ card, onClick }) => {
  const gradientBg = (gradients.modules as Record<string, string>)[card.code] || gradients.primary;

  return (
    <Paper
      onClick={onClick}
      sx={{
        p: 2,
        borderRadius: 2,
        cursor: 'pointer',
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 3,
        },
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
      }}
    >
      {/* Icon circle */}
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: gradientBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 1,
        }}
      >
        {renderIcon(card.icon) || (
          <Typography
            sx={{
              color: '#fff',
              fontWeight: 700,
              fontSize: 22,
              lineHeight: 1,
            }}
          >
            {fallbackLetter(card.code)}
          </Typography>
        )}
      </Box>

      {/* English code */}
      <Typography
        sx={{
          fontSize: 11,
          color: 'text.disabled',
          textTransform: 'uppercase' as const,
          letterSpacing: 0.5,
          mb: 0.25,
        }}
      >
        {card.code}
      </Typography>

      {/* Chinese name */}
      <Typography
        variant='subtitle1'
        sx={{ fontWeight: 600 }}
      >
        {card.name}
      </Typography>

      {/* Status badge */}
      {(card.status === 'beta' || card.status === 'new') && (
        <Chip
          label={card.status === 'beta' ? 'Beta' : 'New'}
          size='small'
          color={card.status === 'beta' ? 'warning' : 'primary'}
          sx={{ mt: 0.5, height: 20, fontSize: 11 }}
        />
      )}

      {/* Description - uses name as description since ModuleCardConfig has no dedicated description field */}
      <Typography
        variant='body2'
        color='text.secondary'
        sx={{ mt: 0.5 }}
      >
        {card.name}
      </Typography>
    </Paper>
  );
};

/* ------------------------------------------------------------------ */
/*  ModuleSection                                                      */
/* ------------------------------------------------------------------ */

interface SectionProps {
  title: string;
  subtitle: string;
  cards: ModuleCardConfig[];
  onCardClick: (card: ModuleCardConfig) => void;
}

const ModuleSection: React.FC<SectionProps> = ({ title, subtitle, cards, onCardClick }) => {
  if (cards.length === 0) return null;

  return (
    <Box sx={{ mb: 4 }}>
      <Typography
        variant='h6'
        sx={{ fontWeight: 600 }}
      >
        {title}
      </Typography>
      <Typography
        variant='body2'
        color='text.secondary'
        sx={{ mb: 0.5 }}
      >
        {subtitle}
      </Typography>

      <Grid
        container
        spacing={2}
        sx={{ mt: 1 }}
      >
        {cards.map((card) => (
          <Grid
            size={{ xs: 6, sm: 4, md: 3, lg: 2 }}
            key={card.code}
          >
            <ModuleCard
              card={card}
              onClick={() => onCardClick(card)}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

/* ------------------------------------------------------------------ */
/*  Suite info config                                                   */
/* ------------------------------------------------------------------ */

interface SuiteInfo {
  key: string;
  title: string;
  subtitle: string;
  icon: string;
}

const suiteInfo: Record<string, SuiteInfo> = {
  finance: {
    key: 'finance',
    title: '财务套件',
    subtitle: '完整的财务管理解决方案',
    icon: 'DollarSign',
  },
  hr: {
    key: 'hr',
    title: '人力套件',
    subtitle: '人力资源全生命周期管理',
    icon: 'Users',
  },
  manufacturing: {
    key: 'manufacturing',
    title: '制造套件',
    subtitle: '智能制造执行系统',
    icon: 'Factory',
  },
  supply: {
    key: 'supply',
    title: '供应链套件',
    subtitle: '采购与供应商管理',
    icon: 'Truck',
  },
  crm: {
    key: 'crm',
    title: '客户套件',
    subtitle: '客户关系与销售管理',
    icon: 'Target',
  },
  quality: {
    key: 'quality',
    title: '质量套件',
    subtitle: '质量管控与实验室管理',
    icon: 'ClipboardCheck',
  },
  project: {
    key: 'project',
    title: '项目套件',
    subtitle: '项目与研发过程管理',
    icon: 'FolderKanban',
  },
  gis: {
    key: 'gis',
    title: '地理套件',
    subtitle: '地理信息与空间分析',
    icon: 'Map',
  },
};

/* ------------------------------------------------------------------ */
/*  ModulesOverviewPage                                                */
/* ------------------------------------------------------------------ */

const ModulesOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [allCards, setAllCards] = useState<ModuleCardConfig[]>([]);

  /* Fetch module cards and listen for registry updates */
  useEffect(() => {
    const loadCards = () => {
      setAllCards(navigationRegistry.getModuleCards());
    };

    loadCards();

    navigationRegistry.emitter.on('navigationUpdated', loadCards);
    return () => {
      navigationRegistry.emitter.off('navigationUpdated', loadCards);
    };
  }, []);

  /* Filter cards by search query */
  const filteredCards = useMemo(() => {
    if (!searchQuery.trim()) return allCards;
    const q = searchQuery.toLowerCase();
    return allCards.filter(
      (card) => card.code.toLowerCase().includes(q) || card.name.toLowerCase().includes(q)
    );
  }, [allCards, searchQuery]);

  /* Separate core vs plugin */
  const coreCards = useMemo(
    () => filteredCards.filter((c) => c.source === 'core'),
    [filteredCards]
  );
  const pluginCards = useMemo(
    () => filteredCards.filter((c) => c.source === 'plugin'),
    [filteredCards]
  );

  /* Group plugin cards by suite */
  const suiteCards = useMemo(() => {
    const grouped: Record<string, ModuleCardConfig[]> = {};
    pluginCards.forEach((card) => {
      const suite = card.suite || 'other';
      if (!grouped[suite]) grouped[suite] = [];
      grouped[suite].push(card);
    });
    return grouped;
  }, [pluginCards]);

  const handleCardClick = useCallback(
    (card: ModuleCardConfig) => {
      navigate(card.path);
    },
    [navigate]
  );

  const sortedSuiteKeys = useMemo(() => {
    return Object.keys(suiteInfo).filter((k) => suiteCards[k]?.length > 0);
  }, [suiteCards]);

  return (
    <PageContainer
      title='模块总览'
      subtitle='浏览所有可用的功能模块，快速进入目标系统'
      headerProps={{
        pageIcon: <Layers sx={{ width: 24, height: 24 }} />,
        pageColor: 'primary.main',
      }}
      padding={true}
      maxWidth='xl'
    >
      {/* Search bar */}
      <TextField
        fullWidth
        size='small'
        placeholder='搜索模块...'
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position='start'>
                <Search size={18} />
              </InputAdornment>
            ),
          },
        }}
        sx={{ mb: 4 }}
      />

      {/* Core modules */}
      <ModuleSection
        title='核心平台'
        subtitle='企业管理基础能力，开箱即用'
        cards={coreCards}
        onCardClick={handleCardClick}
      />

      {/* Professional suites */}
      {sortedSuiteKeys.map((suiteKey) => {
        const info = suiteInfo[suiteKey];
        return (
          <ModuleSection
            key={suiteKey}
            title={info.title}
            subtitle={info.subtitle}
            cards={suiteCards[suiteKey] || []}
            onCardClick={handleCardClick}
          />
        );
      })}

      {/* Other / ungrouped plugin modules */}
      {suiteCards['other'] && suiteCards['other'].length > 0 && (
        <ModuleSection
          title='更多应用'
          subtitle='其他业务模块'
          cards={suiteCards['other']}
          onCardClick={handleCardClick}
        />
      )}
    </PageContainer>
  );
};

export default ModulesOverviewPage;

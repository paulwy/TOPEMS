import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Typography, Paper, TextField, Grid, Chip, InputAdornment } from '@mui/material';
import { Search, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { navigationRegistryV2, type ModuleCardConfig } from '@/lib/navigation';
import { gradients } from '@/theme';
import { PageContainer } from '@/components';
import { lucideIcons } from '@/lib/iconMapping';
import { designTokens } from '@/theme/tokens';
import i18n from '@/i18n';

const ct = designTokens.colors;

/* ------------------------------------------------------------------ */
/*  Icon name -> component mapping                                     */
/* ------------------------------------------------------------------ */

const iconMap = lucideIcons;

const renderIcon = (iconName?: string, size = 26): React.ReactNode => {
  if (!iconName) return null;
  const Icon = iconMap[iconName];
  if (!Icon) return null;
  return (
    <Icon
      size={size}
      style={{ color: ct.background.paper }}
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
        borderRadius: 3,
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
              color: ct.background.paper,
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
    title: i18n.t('pages.modules_overview_page.k0'),
    subtitle: i18n.t('pages.modules_overview_page.k1'),
    icon: 'DollarSign',
  },
  hr: {
    key: 'hr',
    title: i18n.t('pages.modules_overview_page.k2'),
    subtitle: i18n.t('pages.modules_overview_page.k3'),
    icon: 'Users',
  },
  manufacturing: {
    key: 'manufacturing',
    title: i18n.t('pages.modules_overview_page.k4'),
    subtitle: i18n.t('pages.modules_overview_page.k5'),
    icon: 'Factory',
  },
  supply: {
    key: 'supply',
    title: i18n.t('pages.modules_overview_page.k6'),
    subtitle: i18n.t('pages.modules_overview_page.k7'),
    icon: 'Truck',
  },
  crm: {
    key: 'crm',
    title: i18n.t('pages.modules_overview_page.k8'),
    subtitle: i18n.t('pages.modules_overview_page.k9'),
    icon: 'Target',
  },
  quality: {
    key: 'quality',
    title: i18n.t('pages.modules_overview_page.k10'),
    subtitle: i18n.t('pages.modules_overview_page.k11'),
    icon: 'ClipboardCheck',
  },
  project: {
    key: 'project',
    title: i18n.t('pages.modules_overview_page.k12'),
    subtitle: i18n.t('pages.modules_overview_page.k13'),
    icon: 'FolderKanban',
  },
  gis: {
    key: 'gis',
    title: i18n.t('pages.modules_overview_page.k14'),
    subtitle: i18n.t('pages.modules_overview_page.k15'),
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
      setAllCards(navigationRegistryV2.getModuleCards());
    };

    loadCards();

    navigationRegistryV2.emitter.on('navigationUpdated', loadCards);
    return () => {
      navigationRegistryV2.emitter.off('navigationUpdated', loadCards);
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
      title={i18n.t('pages.modules_overview_page.k16')}
      subtitle={i18n.t('pages.modules_overview_page.k17')}
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
        placeholder={i18n.t('pages.modules_overview_page.k0')}
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
        title={i18n.t('pages.modules_overview_page.k18')}
        subtitle={i18n.t('pages.modules_overview_page.k19')}
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
          title={i18n.t('pages.modules_overview_page.k20')}
          subtitle={i18n.t('pages.modules_overview_page.k21')}
          cards={suiteCards['other']}
          onCardClick={handleCardClick}
        />
      )}
    </PageContainer>
  );
};

export default ModulesOverviewPage;

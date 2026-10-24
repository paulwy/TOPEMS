import React, { useState } from 'react';
import { Box, Typography, Collapse, IconButton, Tooltip } from '@mui/material';
import i18n from '@/i18n';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ModuleCard, type ModuleItem } from './ModuleCard';

export type ModuleSectionKey = 'core' | 'operation' | 'production' | 'intelligent';

interface ModuleSectionProps {
  title: string;
  cards: ModuleItem[];
  collapsedLimit: number;
  onCardClick?: (card: ModuleItem) => void;
  size?: 'large' | 'medium' | 'small';
}

export const ModuleSection: React.FC<ModuleSectionProps> = ({
  title,
  cards,
  collapsedLimit,
  onCardClick,
  size = 'medium',
}) => {
  const [collapsed, setCollapsed] = useState(cards.length > collapsedLimit);
  const shouldCollapse = cards.length > collapsedLimit;
  const visibleCards = collapsed && shouldCollapse ? cards.slice(0, collapsedLimit) : cards;

  if (cards.length === 0) return null;

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography
          variant='subtitle1'
          sx={{ fontWeight: 600, color: 'text.primary' }}
        >
          {title}
          <Typography
            component='span'
            variant='caption'
            color='text.secondary'
            sx={{ ml: 1 }}
          >
            {cards.length} {i18n.t('components.dashboard_sections.k0')}
          </Typography>
        </Typography>
        {shouldCollapse ? (
          <Tooltip
            title={
              collapsed
                ? i18n.t('shared.dashboard_sections.k5')
                : i18n.t('shared.dashboard_sections.k4')
            }
          >
            <IconButton
              size='small'
              onClick={() => setCollapsed((v) => !v)}
              aria-label='toggle section'
            >
              {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </IconButton>
          </Tooltip>
        ) : null}
      </Box>

      <Collapse
        in={!collapsed || !shouldCollapse}
        timeout={220}
        unmountOnExit={false}
      >
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: {
              xs: 'repeat(2, minmax(0, 1fr))',
              sm: 'repeat(3, minmax(0, 1fr))',
              md: 'repeat(4, minmax(0, 1fr))',
              xl: 'repeat(5, minmax(0, 1fr))',
            },
          }}
        >
          {visibleCards.map((c) => (
            <ModuleCard
              key={c.title}
              item={c}
              onClick={() => onCardClick?.(c)}
              size={size}
            />
          ))}
        </Box>
      </Collapse>

      {shouldCollapse && collapsed ? (
        <Typography
          variant='caption'
          color='text.secondary'
          sx={{ mt: 0.75, display: 'block', textAlign: 'right' }}
        >
          {i18n.t('components.dashboard_sections.k1')} {cards.length - collapsedLimit}{' '}
          {i18n.t('components.dashboard_sections.k2')} ↑{' '}
          {i18n.t('components.dashboard_sections.k3')}
        </Typography>
      ) : null}
    </Box>
  );
};

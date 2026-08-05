import React, { useState } from 'react';
import { Box, Paper, Typography, IconButton, Tabs, Tab, Grid } from '@mui/material';
import { ChevronDown } from 'lucide-react';
import type { CardGroup } from './types';
import { StatCardComponent } from './StatCardComponent';

export const CardGroupComponent: React.FC<CardGroup & { loading?: boolean }> = ({
  title,
  cards,
  layout = 'grid',
  collapsible,
  defaultExpanded = true,
  icon,
  actions,
  loading,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Paper sx={{ borderRadius: 3, mb: 2 }}>
      <Box
        sx={{
          p: 2,
          borderBottom: expanded ? 1 : 0,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {icon}
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600 }}
          >
            {title}
          </Typography>
          {collapsible && (
            <IconButton
              size='small'
              onClick={() => setExpanded(!expanded)}
            aria-label="展开"
            >
              <ChevronDown
                style={{
                  width: 18,
                  height: 18,
                  transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s',
                }}
              />
            </IconButton>
          )}
        </Box>
        {actions}
      </Box>
      {expanded && (
        <Box sx={{ p: 2 }}>
          {layout === 'tabs' && (
            <Tabs
              value={activeTab}
              onChange={(_, newValue) => setActiveTab(newValue)}
              sx={{ mb: 2 }}
            >
              {cards.map((card) => (
                <Tab
                  key={card.id}
                  label={card.title}
                />
              ))}
            </Tabs>
          )}
          {layout === 'tabs' ? (
            <Box>
              {cards[activeTab] && (
                <StatCardComponent
                  {...cards[activeTab]}
                  loading={loading}
                />
              )}
            </Box>
          ) : (
            <Grid
              container
              spacing={2}
            >
              {cards.map((card) => (
                <Grid
                  key={card.id}
                  size={{ xs: 12, sm: 6, md: 3 }}
                >
                  <StatCardComponent
                    {...card}
                    loading={loading}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}
    </Paper>
  );
};

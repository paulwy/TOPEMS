import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import * as LucideIcons from 'lucide-react';
import type { PluginCategory } from '@/api/plugin';

interface PluginCategoryNavProps {
  categories: PluginCategory[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

const iconComponents: Record<
  string,
  React.ComponentType<{ size?: number; className?: string }>
> = LucideIcons as unknown as Record<string, React.ComponentType<any>>;

export const PluginCategoryNav: React.FC<PluginCategoryNavProps> = ({
  categories,
  activeCategory,
  onCategoryChange,
}) => {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
      {categories.map((category) => {
        const Icon = iconComponents[category.icon || 'Package'] || LucideIcons.Package;
        const isActive = activeCategory === category.code;

        return (
          <Chip
            key={category.id}
            icon={<Icon size={16} />}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant='body2'>{category.name}</Typography>
                {category.plugin_count !== undefined && (
                  <Typography
                    variant='caption'
                    sx={{ opacity: 0.7 }}
                  >
                    ({category.plugin_count})
                  </Typography>
                )}
              </Box>
            }
            onClick={() => onCategoryChange(category.code)}
            color={isActive ? 'primary' : 'default'}
            variant={isActive ? 'filled' : 'outlined'}
            sx={{
              px: 2,
              py: 1,
              borderRadius: 3,
              fontSize: 14,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': {
                transform: 'translateY(-1px)',
              },
            }}
          />
        );
      })}
    </Box>
  );
};

export default PluginCategoryNav;

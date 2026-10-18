import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { iconSm } from '../../sharedStyles';
import {
  AlertTriangle,
  BarChart3,
  Briefcase,
  Calendar,
  Code,
  FileCheck,
  FileEdit,
  FileText,
  Lightbulb,
  MessageSquare,
  Search,
  Star,
  TrendingUp,
  UserPlus,
  Wallet,
} from 'lucide-react';
import type { AIRecommendation } from '@/lib/ai/recommendations';

interface AICopilotRecommendationsProps {
  recommendations: AIRecommendation[];
  onSelect: (recommendation: AIRecommendation) => void;
  compact?: boolean;
}

const iconMap: Record<string, React.ReactNode> = {
  'user-plus': <UserPlus style={iconSm} />,
  'file-text': <FileText style={iconSm} />,
  'calendar-check': <Calendar style={iconSm} />,
  'trending-up': <TrendingUp style={iconSm} />,
  star: <Star style={iconSm} />,
  'message-square': <MessageSquare style={iconSm} />,
  'bar-chart': <BarChart3 style={iconSm} />,
  'bar-chart-2': <BarChart3 style={iconSm} />,
  briefcase: <Briefcase style={iconSm} />,
  'alert-triangle': <AlertTriangle style={iconSm} />,
  'alert-circle': <AlertTriangle style={iconSm} />,
  'file-check': <FileCheck style={iconSm} />,
  wallet: <Wallet style={iconSm} />,
  'pie-chart': <BarChart3 style={iconSm} />,
  'file-edit': <FileEdit style={iconSm} />,
  search: <Search style={iconSm} />,
  code: <Code style={iconSm} />,
  'message-circle': <MessageSquare style={iconSm} />,
};

export const AICopilotRecommendations: React.FC<AICopilotRecommendationsProps> = ({
  recommendations,
  onSelect,
  compact = false,
}) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
    {recommendations.map((item) => (
      <Box
        key={item.id}
        onClick={() => onSelect(item)}
        sx={{
          p: compact ? 1.25 : 1.5,
          borderRadius: 1.5,
          border: 1,
          borderColor: 'divider',
          cursor: 'pointer',
          bgcolor: 'background.paper',
          '&:hover': {
            bgcolor: 'action.hover',
            borderColor: 'primary.main',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
          <Box
            sx={{
              width: 30,
              height: 30,
              borderRadius: 1,
              bgcolor: 'primary.50',
              color: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {iconMap[item.icon || 'star'] || <Lightbulb style={iconSm} />}
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
              <Typography
                variant='body2'
                sx={{ fontWeight: 600 }}
              >
                {item.label}
              </Typography>
              {item.moduleCode && (
                <Chip
                  label={item.moduleCode.toUpperCase()}
                  size='small'
                  variant='outlined'
                  sx={{ height: 18, fontSize: 10 }}
                />
              )}
            </Box>
            <Typography
              variant='caption'
              color='text.secondary'
              sx={{ display: 'block', lineHeight: 1.45 }}
            >
              {item.description}
            </Typography>
          </Box>
        </Box>
      </Box>
    ))}
  </Box>
);

export default AICopilotRecommendations;

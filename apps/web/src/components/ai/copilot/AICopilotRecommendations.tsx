import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
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
  'user-plus': <UserPlus style={{ width: 16, height: 16 }} />,
  'file-text': <FileText style={{ width: 16, height: 16 }} />,
  'calendar-check': <Calendar style={{ width: 16, height: 16 }} />,
  'trending-up': <TrendingUp style={{ width: 16, height: 16 }} />,
  star: <Star style={{ width: 16, height: 16 }} />,
  'message-square': <MessageSquare style={{ width: 16, height: 16 }} />,
  'bar-chart': <BarChart3 style={{ width: 16, height: 16 }} />,
  'bar-chart-2': <BarChart3 style={{ width: 16, height: 16 }} />,
  briefcase: <Briefcase style={{ width: 16, height: 16 }} />,
  'alert-triangle': <AlertTriangle style={{ width: 16, height: 16 }} />,
  'alert-circle': <AlertTriangle style={{ width: 16, height: 16 }} />,
  'file-check': <FileCheck style={{ width: 16, height: 16 }} />,
  wallet: <Wallet style={{ width: 16, height: 16 }} />,
  'pie-chart': <BarChart3 style={{ width: 16, height: 16 }} />,
  'file-edit': <FileEdit style={{ width: 16, height: 16 }} />,
  search: <Search style={{ width: 16, height: 16 }} />,
  code: <Code style={{ width: 16, height: 16 }} />,
  'message-circle': <MessageSquare style={{ width: 16, height: 16 }} />,
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
            {iconMap[item.icon || 'star'] || <Lightbulb style={{ width: 16, height: 16 }} />}
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

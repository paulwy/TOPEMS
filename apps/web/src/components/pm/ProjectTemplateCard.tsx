import { Card, CardContent, CardHeader, Typography, Chip } from '@mui/material';
import { Button } from '@mui/material';
import React from 'react';

import { Clock, Tag, ArrowRight } from 'lucide-react';

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  project_type: string;
  icon: string;
  phases_count: number;
  estimated_days: number;
  default_budget: number;
  tags: string[];
}

interface ProjectTemplateCardProps {
  template: ProjectTemplate;
  onSelect: (template: ProjectTemplate) => void;
}

const ProjectTemplateCard: React.FC<ProjectTemplateCardProps> = ({ template, onSelect }) => {
  return (
    <Card
      sx={{
        '&:hover': { boxShadow: 6 },
        transition: 'box-shadow 0.2s',
        cursor: 'pointer',
      }}
    >
      <CardHeader sx={{ pb: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'linear-gradient(135deg, primary.main 0%, primary.dark 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Tag
              size={24}
              color='white'
            />
          </div>
          <div>
            <Typography
              variant='h6'
              sx={{ fontSize: '1.125rem' }}
            >
              {template.name}
            </Typography>
            <p style={{ fontSize: '0.875rem', color: 'text.secondary' }}>{template.project_type}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent sx={{ pt: 1 }}>
        <p
          style={{
            fontSize: '0.875rem',
            color: 'grey.700',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {template.description}
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            fontSize: '0.875rem',
            color: 'text.secondary',
            marginTop: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={16} />
            <span>{template.estimated_days}天</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Tag size={16} />
            <span>{template.phases_count}个阶段</span>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            marginTop: 8,
          }}
        >
          {template.tags.map((tag) => (
            <Chip
              key={tag}
              size='small'
              label={
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Tag size={12} />
                  {tag}
                </span>
              }
              sx={{
                backgroundColor: 'primary.light',
                color: 'primary.dark',
                fontSize: '0.75rem',
                height: 24,
              }}
            />
          ))}
        </div>

        <Button
          variant='text'
          sx={{
            width: '100%',
            marginTop: 8,
            color: 'grey.700',
            '&:hover': {
              backgroundColor: 'primary.light',
              color: 'primary.dark',
            },
            transition: 'background-color 0.2s, color 0.2s',
            gap: 1,
          }}
          onClick={() => onSelect(template)}
        >
          使用模板
          <ArrowRight size={16} />
        </Button>
      </CardContent>
    </Card>
  );
};

export default ProjectTemplateCard;

import { designTokens } from '@topems/tokens';
import styles from './ProjectTemplateCard.module.css';
import { Card, CardContent, CardHeader, Typography, Chip, Button } from '@mui/material';
import React from 'react';

import { Clock, Tag, ArrowRight } from 'lucide-react';
import i18n from '@/i18n';

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
        <div className={styles.il1}>
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
              color='var(--color-primary-foreground)'
            />
          </div>
          <div>
            <Typography
              variant='h6'
              sx={{ fontSize: designTokens.typography.fontSize.scale['1.125rem'] }}
            >
              {template.name}
            </Typography>
            <p
              style={{
                fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                color: 'text.secondary',
              }}
            >
              {template.project_type}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent sx={{ pt: 1 }}>
        <p
          style={{
            fontSize: designTokens.typography.fontSize.scale['0.875rem'],
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
            fontSize: designTokens.typography.fontSize.scale['0.875rem'],
            color: 'text.secondary',
            marginTop: 8,
          }}
        >
          <div className={styles.il2}>
            <Clock size={16} />
            <span>{i18n.t('components.project_template_card.k0')}</span>
          </div>
          <div className={styles.il3}>
            <Tag size={16} />
            <span>
              {i18n.t('components.project_template_card.k1', {
                template: { phases_count: template.phases_count ?? 0 },
              })}
            </span>
          </div>
        </div>

        <div
          className={styles.il4}
        >
          {template.tags.map((tag) => (
            <Chip
              key={tag}
              size='small'
              label={
                <span className={styles.il5}>
                  <Tag size={12} />
                  {tag}
                </span>
              }
              sx={{
                backgroundColor: 'primary.light',
                color: 'primary.dark',
                fontSize: designTokens.typography.fontSize.scale['0.75rem'],
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
          {i18n.t('components.project_template_card.k0')}
          <ArrowRight size={16} />
        </Button>
      </CardContent>
    </Card>
  );
};

export default ProjectTemplateCard;

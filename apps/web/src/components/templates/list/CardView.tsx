import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Button,
  Typography,
  Box,
  Chip,
  Divider,
  Skeleton,
} from '@mui/material';
import type { CardViewConfig, CardViewAction } from './types';

interface CardViewProps<T = Record<string, unknown>> {
  data: T[];
  config: CardViewConfig<T>;
  columns?: { xs?: number; sm?: number; md?: number; lg?: number; xl?: number };
  gap?: number;
  loading?: boolean;
  skeletonCount?: number;
  getRowId?: (row: T) => string | number;
}

export const CardView = React.memo(function CardView<T = any>({
  data,
  config,
  columns = { xs: 1, sm: 1, md: 2, lg: 3, xl: 3 },
  gap = 2,
  loading = false,
  skeletonCount = 6,
  getRowId = (row: T) => (row as unknown as Record<string, unknown>).id as string | number,
}: CardViewProps<T>) {
  const {
    title,
    subtitle,
    statusField,
    statusColorMap = {},
    statusLabelMap = {},
    fields = [],
    fieldsPerRow = 2,
    onClick,
    actions,
    renderActions,
    showActionsDivider = true,
  } = config;

  const renderTitle = (row: T): React.ReactNode => {
    if (typeof title === 'function') return title(row);
    if (typeof title === 'string')
      return (row as unknown as Record<string, unknown>)[title] as React.ReactNode;
    return null;
  };

  const renderSubtitle = (row: T): React.ReactNode => {
    if (typeof subtitle === 'function') return subtitle(row);
    if (typeof subtitle === 'string')
      return (row as unknown as Record<string, unknown>)[subtitle] as React.ReactNode;
    return null;
  };

  const renderStatus = (row: T): React.ReactNode => {
    if (!statusField) return null;
    const value = (row as unknown as Record<string, unknown>)[statusField] as string;
    if (!value) return null;
    const color = (statusColorMap[value] ?? 'default') as
      'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
    const label = statusLabelMap[value] ?? value;
    return (
      <Chip
        label={label}
        size='small'
        color={color}
        variant='outlined'
        sx={{ height: 24, fontSize: 12 }}
      />
    );
  };

  const renderField = (row: T, field: (typeof fields)[0], idx: number): React.ReactNode => {
    const value = (row as unknown as Record<string, unknown>)[field.key];
    const content = field.render
      ? field.render(value, row as unknown as Record<string, unknown>)
      : String(value ?? '-');
    return (
      <Box
        key={field.key ?? idx}
        sx={{ flex: field.flex ?? 1, minWidth: 0 }}
      >
        {field.showLabel !== false && field.label && (
          <Typography
            variant='caption'
            color='text.secondary'
            sx={{ display: 'block', mb: 0.5 }}
          >
            {field.label}
          </Typography>
        )}
        <Typography
          variant='body2'
          noWrap
          title={String(value ?? '')}
        >
          {content}
        </Typography>
      </Box>
    );
  };

  const renderCardActions = (row: T): React.ReactNode => {
    if (renderActions) return renderActions(row);
    if (!actions || actions.length === 0) return null;

    const visibleActions = actions.filter((action: CardViewAction<T>) => {
      if (action.show === false) return false;
      if (typeof action.show === 'function' && !action.show(row)) return false;
      return true;
    });

    if (visibleActions.length === 0) return null;

    return (
      <>
        {showActionsDivider && <Divider />}
        <CardActions sx={{ px: 2, py: 1, justifyContent: 'flex-end', gap: 1 }}>
          {visibleActions.map((action: CardViewAction<T>) => {
            const isDisabled =
              typeof action.disabled === 'function' ? action.disabled(row) : action.disabled;
            return (
              <Button
                key={action.key}
                size={action.size || 'small'}
                variant={action.variant || 'text'}
                color={action.color || 'primary'}
                startIcon={action.icon}
                disabled={isDisabled}
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick(row);
                }}
              >
                {action.label}
              </Button>
            );
          })}
        </CardActions>
      </>
    );
  };

  const hasActions = !!(renderActions || (actions && actions.length > 0));

  const gridTemplateColumns = {
    xs: `repeat(${columns.xs ?? 1}, 1fr)`,
    sm: `repeat(${columns.sm ?? 1}, 1fr)`,
    md: `repeat(${columns.md ?? 2}, 1fr)`,
    lg: `repeat(${columns.lg ?? 3}, 1fr)`,
    xl: `repeat(${columns.xl ?? 3}, 1fr)`,
  };

  const renderSkeleton = (idx: number) => (
    <Card
      key={`skeleton-${idx}`}
      sx={{ borderRadius: 3 }}
    >
      <CardContent sx={{ p: 2 }}>
        <Box
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}
        >
          <Box sx={{ flex: 1 }}>
            <Skeleton
              variant='text'
              width='60%'
              height={24}
            />
            <Skeleton
              variant='text'
              width='40%'
              height={18}
            />
          </Box>
          <Skeleton
            variant='rounded'
            width={48}
            height={24}
          />
        </Box>
        <Box
          sx={{ display: 'grid', gridTemplateColumns: `repeat(${fieldsPerRow}, 1fr)`, gap: 1.5 }}
        >
          {Array.from({ length: fieldsPerRow * 2 }).map((_, i) => (
            <Box key={i}>
              <Skeleton
                variant='text'
                width='50%'
                height={14}
              />
              <Skeleton
                variant='text'
                width='80%'
                height={18}
              />
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ display: 'grid', gap, gridTemplateColumns }}>
      {loading
        ? Array.from({ length: skeletonCount }).map((_, idx) => renderSkeleton(idx))
        : data.map((row, idx) => (
            <Card
              key={getRowId(row) ?? idx}
              sx={{
                borderRadius: 3,
                cursor: onClick ? 'pointer' : 'default',
                transition: 'box-shadow 0.2s',
                '&:hover': { boxShadow: onClick ? 4 : 1 },
              }}
              onClick={onClick ? () => onClick(row) : undefined}
            >
              <CardContent sx={{ p: 2 }}>
                {(title || statusField) && (
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      mb: subtitle ? 0.5 : 2,
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0, mr: 2 }}>
                      {title && (
                        <Typography
                          variant='subtitle1'
                          noWrap
                          title={String(renderTitle(row) ?? '')}
                          sx={{ fontWeight: 600 }}
                        >
                          {renderTitle(row)}
                        </Typography>
                      )}
                    </Box>
                    {statusField && renderStatus(row)}
                  </Box>
                )}

                {subtitle && (
                  <Typography
                    variant='body2'
                    color='text.secondary'
                    noWrap
                    sx={{ mb: 2 }}
                  >
                    {renderSubtitle(row)}
                  </Typography>
                )}

                {fields.length > 0 && (
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${fieldsPerRow}, 1fr)`,
                      gap: 1.5,
                    }}
                  >
                    {fields.map((field, i) => renderField(row, field, i))}
                  </Box>
                )}
              </CardContent>
              {hasActions && renderCardActions(row)}
            </Card>
          ))}
    </Box>
  );
});

export default CardView;
